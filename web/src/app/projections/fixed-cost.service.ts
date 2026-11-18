import { inject, Service } from '@angular/core';
import { liveQuery } from 'dexie';
import { from, Observable } from 'rxjs';
import { AppDb } from '../core/db/app-db';
import { Currency } from '../core/money';
import { FixedCost, NewFixedCost } from './fixed-cost';

@Service()
export class FixedCostService {
  private readonly db = inject(AppDb);

  /** The fixed costs in one currency, sorted by name. It emits again whenever they change. */
  list(currency: Currency): Observable<FixedCost[]> {
    return from(
      liveQuery(async () => {
        const costs = await this.db.fixedCosts.where('currency').equals(currency).toArray();
        return costs.sort((a, b) => a.name.localeCompare(b.name));
      }),
    );
  }

  /** Saves a fixed cost with its name trimmed. */
  add(cost: NewFixedCost): Observable<number> {
    return from(this.db.fixedCosts.add({ ...cost, name: cost.name.trim() }));
  }

  remove(id: number): Observable<void> {
    return from(this.db.fixedCosts.delete(id));
  }
}
