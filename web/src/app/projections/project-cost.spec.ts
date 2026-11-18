import { CURRENCY } from '../core/money';
import { FixedCost, INCREASE_RULE } from './fixed-cost';
import { IpcFactorMonth } from './ipc-factors';
import { projectCost } from './project-cost';

const MONTHS = ['2026-11', '2026-12', '2027-01', '2027-02', '2027-03'];

function cost(overrides: Partial<FixedCost>): FixedCost {
  return {
    id: 1,
    name: 'Internet',
    currency: CURRENCY.ARS,
    amount: 3200000,
    every: 2,
    lastIncrease: '2026-11',
    increase: { rule: INCREASE_RULE.percent, percent: '8' },
    ...overrides,
  };
}

const amounts = (cells: { amount: number }[]) => cells.map((cell) => cell.amount);
const increases = (cells: { increases: boolean }[]) => cells.map((cell) => cell.increases);

describe('projectCost', () => {
  it('should compound a percentage every few months after the last increase', () => {
    const cells = projectCost(cost({}), MONTHS);

    expect(amounts(cells)).toEqual([3200000, 3200000, 3456000, 3456000, 3732480]);
    expect(increases(cells)).toEqual([false, false, true, false, true]);
  });

  it('should count the months from a last increase in the past', () => {
    const cells = projectCost(cost({ every: 4, lastIncrease: '2026-08' }), MONTHS);

    expect(increases(cells)).toEqual([false, true, false, false, false]);
  });

  it('should never increase in the first month, which has today’s amount', () => {
    const cells = projectCost(cost({ every: 3, lastIncrease: '2026-08' }), MONTHS);

    expect(amounts(cells)[0]).toBe(3200000);
    expect(increases(cells)[0]).toBe(false);
  });

  it('should add a fixed amount at each increase', () => {
    const cells = projectCost(
      cost({ amount: 4500000, every: 1, increase: { rule: INCREASE_RULE.amount, amount: 500000 } }),
      MONTHS,
    );

    expect(amounts(cells)).toEqual([4500000, 5000000, 5500000, 6000000, 6500000]);
  });

  it('should multiply today’s amount by the IPC factor of each month', () => {
    const factors: IpcFactorMonth[] = [
      { month: '2026-11', factor: '1.0000', increases: false, estimated: false },
      { month: '2026-12', factor: '1.0952', increases: true, estimated: false },
      { month: '2027-01', factor: '1.0952', increases: false, estimated: true },
    ];

    const cells = projectCost(
      cost({ amount: 62000000, increase: { rule: INCREASE_RULE.ipc } }),
      MONTHS.slice(0, 3),
      factors,
    );

    expect(cells).toEqual([
      { month: '2026-11', amount: 62000000, increases: false, estimated: false },
      { month: '2026-12', amount: 67902400, increases: true, estimated: false },
      { month: '2027-01', amount: 67902400, increases: false, estimated: true },
    ]);
  });

  it('should keep an IPC cost the same without factors', () => {
    const cells = projectCost(cost({ increase: { rule: INCREASE_RULE.ipc } }), MONTHS);

    expect(new Set(amounts(cells))).toEqual(new Set([3200000]));
    expect(increases(cells)).not.toContain(true);
  });
});
