import { monthsBetween, YearMonth } from '../core/dates';
import { increaseByPercent, multiplyCents } from '../core/decimal';
import { FixedCost, INCREASE_RULE } from './fixed-cost';
import { IpcFactorMonth } from './ipc-factors';
import { ProjectionCell } from './projection';

/** Whether a cost increases in a month: every `every` months after its last increase. */
export function increasesIn(cost: FixedCost, month: YearMonth): boolean {
  const elapsed = monthsBetween(cost.lastIncrease, month);
  return elapsed > 0 && elapsed % cost.every === 0;
}

/**
 * The amount of one cost in each month, starting with today's amount in the first month, which
 * never increases, as in the API. A cost that increases by IPC multiplies today's amount by the
 * cumulative factor of each month, from `ipcFactors`. Without factors, it stays the same.
 */
export function projectCost(
  cost: FixedCost,
  months: YearMonth[],
  ipcFactors?: IpcFactorMonth[],
): ProjectionCell[] {
  const { increase } = cost;

  if (increase.rule === INCREASE_RULE.ipc) {
    return months.map((month, index) => {
      const factor = ipcFactors?.[index];
      return factor
        ? {
            month,
            amount: multiplyCents(cost.amount, factor.factor),
            increases: factor.increases,
            estimated: factor.estimated,
          }
        : { month, amount: cost.amount, increases: false, estimated: false };
    });
  }

  let amount = cost.amount;
  return months.map((month, index) => {
    const increases = index > 0 && increasesIn(cost, month);
    if (increases) {
      amount =
        increase.rule === INCREASE_RULE.percent
          ? increaseByPercent(amount, increase.percent)
          : amount + increase.amount;
    }
    return { month, amount, increases, estimated: false };
  });
}
