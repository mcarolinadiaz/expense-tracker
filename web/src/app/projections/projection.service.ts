import { inject, Service } from '@angular/core';
import { catchError, forkJoin, map, Observable, of, shareReplay, switchMap, tap } from 'rxjs';
import { Clock } from '../core/clock.service';
import { monthsBetween, shiftMonth, YearMonth } from '../core/dates';
import { Currency } from '../core/money';
import { FixedCost, INCREASE_RULE } from './fixed-cost';
import { FixedCostService } from './fixed-cost.service';
import { IpcEstimateSettings, IpcFactors } from './ipc-factors';
import { IpcFactorsService } from './ipc-factors.service';
import { projectCost } from './project-cost';
import { IPC_STATUS, Projection, PROJECTION_MONTHS } from './projection';

const MONTHLY_INCREASES = 1;

interface IncreaseSchedule {
  every: number;
  lastIncrease: YearMonth;
}

function scheduleKey({ every, lastIncrease }: IncreaseSchedule): string {
  return `${every}|${lastIncrease}`;
}

/**
 * Projects the fixed costs of one currency over the next months. Costs that increase by IPC use
 * factors from the API, which only receives months and estimate settings, never amounts or names.
 */
@Service()
export class ProjectionService {
  private readonly fixedCosts = inject(FixedCostService);
  private readonly ipcFactors = inject(IpcFactorsService);
  private readonly clock = inject(Clock);
  private readonly cache = new Map<string, Observable<IpcFactors>>();

  /** The projection from the current month. It emits again whenever the fixed costs change. */
  project(currency: Currency, settings: IpcEstimateSettings): Observable<Projection> {
    const from = this.clock.currentMonth();
    const months = Array.from({ length: PROJECTION_MONTHS }, (_, index) => shiftMonth(from, index));

    return this.fixedCosts.list(currency).pipe(
      switchMap((costs) => {
        const schedules = this.schedules(from, costs);
        return forkJoin(schedules.map((schedule) => this.factors(from, schedule, settings))).pipe(
          map(
            (results) =>
              new Map(schedules.map((schedule, i) => [scheduleKey(schedule), results[i]])),
          ),
          catchError(() => of(null)),
          map((factors) => this.build(from, months, costs, factors)),
        );
      }),
    );
  }

  /**
   * The distinct increase schedules of the IPC costs. The first one, monthly from today, is
   * always requested, so the page can show the IPC estimate even without IPC costs.
   */
  private schedules(from: YearMonth, costs: FixedCost[]): IncreaseSchedule[] {
    const schedules = new Map<string, IncreaseSchedule>();
    const add = (schedule: IncreaseSchedule) => schedules.set(scheduleKey(schedule), schedule);

    add({ every: MONTHLY_INCREASES, lastIncrease: from });
    for (const cost of costs) {
      if (cost.increase.rule === INCREASE_RULE.ipc) {
        add({ every: cost.every, lastIncrease: this.lastIncrease(from, cost) });
      }
    }
    return Array.from(schedules.values());
  }

  /** The last increase, but never after the first projected month, which the API rejects. */
  private lastIncrease(from: YearMonth, cost: FixedCost): YearMonth {
    return monthsBetween(cost.lastIncrease, from) < 0 ? from : cost.lastIncrease;
  }

  /** The factors of one schedule, reused while the page asks again with the same settings. A failed request is forgotten, so the next one tries again. */
  private factors(
    from: YearMonth,
    schedule: IncreaseSchedule,
    settings: IpcEstimateSettings,
  ): Observable<IpcFactors> {
    const key = JSON.stringify({ from, schedule, settings });
    let factors = this.cache.get(key);
    if (!factors) {
      factors = this.ipcFactors
        .factors({ from, months: PROJECTION_MONTHS, ...schedule, settings })
        .pipe(tap({ error: () => this.cache.delete(key) }), shareReplay(1));
      this.cache.set(key, factors);
    }
    return factors;
  }

  private build(
    from: YearMonth,
    months: YearMonth[],
    costs: FixedCost[],
    factors: Map<string, IpcFactors> | null,
  ): Projection {
    const rows = costs.map((cost) => ({
      cost,
      cells: projectCost(
        cost,
        months,
        cost.increase.rule === INCREASE_RULE.ipc
          ? factors?.get(
              scheduleKey({ every: cost.every, lastIncrease: this.lastIncrease(from, cost) }),
            )?.months
          : undefined,
      ),
    }));

    const totals = months.map((_, index) =>
      rows.reduce((sum, row) => sum + row.cells[index].amount, 0),
    );

    const base = factors?.get(scheduleKey({ every: MONTHLY_INCREASES, lastIncrease: from }));
    return {
      months,
      rows,
      totals,
      ipc: base
        ? {
            status: IPC_STATUS.available,
            lastMonth: base.lastMonth,
            monthlyEstimate: base.monthlyEstimate,
            source: base.source,
          }
        : { status: IPC_STATUS.unavailable },
    };
  }
}
