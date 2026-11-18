import { TestBed } from '@angular/core/testing';
import { firstValueFrom, Observable, of, throwError } from 'rxjs';
import { provideFixedClock } from '../core/clock.testing';
import { AppDb } from '../core/db/app-db';
import { CURRENCY } from '../core/money';
import { INCREASE_RULE, NewFixedCost } from './fixed-cost';
import { FixedCostService } from './fixed-cost.service';
import { IPC_ESTIMATE, IpcEstimateSettings, IpcFactors, IpcFactorsQuery } from './ipc-factors';
import { IpcFactorsService } from './ipc-factors.service';
import { IPC_STATUS, PROJECTION_MONTHS } from './projection';
import { ProjectionService } from './projection.service';

const AVERAGE: IpcEstimateSettings = { estimate: IPC_ESTIMATE.average, averageMonths: 6 };

function factorsFor(query: IpcFactorsQuery): IpcFactors {
  return {
    months: Array.from({ length: query.months }, (_, index) => ({
      month: `month-${index}`,
      factor: index === 0 ? '1.0000' : '1.1000',
      increases: index === 1,
      estimated: index > 1,
    })),
    lastMonth: '2026-09',
    monthlyEstimate: '2.11',
    source: 'INDEC',
  };
}

describe('ProjectionService', () => {
  let factors: ReturnType<typeof vi.fn<(query: IpcFactorsQuery) => Observable<IpcFactors>>>;

  const base: NewFixedCost = {
    name: 'Alquiler',
    currency: CURRENCY.ARS,
    amount: 100000,
    every: 4,
    lastIncrease: '2026-08',
    increase: { rule: INCREASE_RULE.ipc },
  };

  async function addCost(cost: Partial<NewFixedCost>): Promise<void> {
    await firstValueFrom(TestBed.inject(FixedCostService).add({ ...base, ...cost }));
  }

  function project() {
    return firstValueFrom(TestBed.inject(ProjectionService).project(CURRENCY.ARS, AVERAGE));
  }

  beforeEach(() => {
    factors = vi.fn((query: IpcFactorsQuery) => of(factorsFor(query)));
    TestBed.configureTestingModule({
      providers: [
        provideFixedClock('2026-11-18'),
        { provide: IpcFactorsService, useValue: { factors } },
      ],
    });
  });

  afterEach(async () => {
    await TestBed.inject(AppDb).delete();
  });

  it('should project the next months from the current one, with totals', async () => {
    await addCost({});
    await addCost({
      name: 'Internet',
      amount: 50000,
      every: 1,
      lastIncrease: '2026-11',
      increase: { rule: INCREASE_RULE.amount, amount: 1000 },
    });

    const projection = await project();

    expect(projection.months).toHaveLength(PROJECTION_MONTHS);
    expect(projection.months[0]).toBe('2026-11');
    expect(projection.months[12]).toBe('2027-11');
    expect(projection.rows.map((row) => row.cost.name)).toEqual(['Alquiler', 'Internet']);
    expect(projection.totals.slice(0, 3)).toEqual([150000, 161000, 162000]);
    expect(projection.ipc).toEqual({
      status: IPC_STATUS.available,
      lastMonth: '2026-09',
      monthlyEstimate: '2.11',
      source: 'INDEC',
    });
  });

  it('should send only months and estimate settings to the API, once per schedule', async () => {
    await addCost({});
    await addCost({ name: 'Expensas' });

    await project();

    expect(factors.mock.calls.map(([query]) => query)).toEqual([
      {
        from: '2026-11',
        months: PROJECTION_MONTHS,
        every: 1,
        lastIncrease: '2026-11',
        settings: AVERAGE,
      },
      {
        from: '2026-11',
        months: PROJECTION_MONTHS,
        every: 4,
        lastIncrease: '2026-08',
        settings: AVERAGE,
      },
    ]);
  });

  it('should reuse the factors it already read', async () => {
    await addCost({});

    await project();
    await project();

    expect(factors).toHaveBeenCalledTimes(2);
  });

  it('should keep IPC costs the same and report it when the API fails', async () => {
    factors.mockReturnValue(throwError(() => new Error('offline')));
    await addCost({});
    await addCost({
      name: 'Internet',
      every: 1,
      lastIncrease: '2026-11',
      increase: { rule: INCREASE_RULE.percent, percent: '10' },
    });

    const projection = await project();

    expect(projection.ipc).toEqual({ status: IPC_STATUS.unavailable });
    expect(new Set(projection.rows[0].cells.map((cell) => cell.amount))).toEqual(new Set([100000]));
    expect(projection.rows[1].cells[1].amount).toBe(110000);
  });

  it('should ask for the factors again after a failure', async () => {
    factors.mockReturnValueOnce(throwError(() => new Error('offline')));

    expect((await project()).ipc.status).toBe(IPC_STATUS.unavailable);
    expect((await project()).ipc.status).toBe(IPC_STATUS.available);
  });
});
