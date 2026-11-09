import { inject, Injectable } from '@angular/core';
import { liveQuery } from 'dexie';
import { from, Observable } from 'rxjs';
import { NewTransaction, Transaction, YearMonth } from '../../core/api/transaction';
import { AppDb } from '../../core/db/app-db';

// Dates are `YYYY-MM-DD` strings, so a month is the text range from its day 01 to day 31, even in shorter months.
const MONTH_FIRST_DAY = '01';
const MONTH_LAST_DAY = '31';

@Injectable({ providedIn: 'root' })
export class TransactionService {
  private readonly db = inject(AppDb);

  /** The transactions of one month, newest first. It emits again whenever they change. */
  listMonth(month: YearMonth): Observable<Transaction[]> {
    return from(
      liveQuery(async () => {
        const transactions = await this.db.transactions
          .where('date')
          .between(`${month}-${MONTH_FIRST_DAY}`, `${month}-${MONTH_LAST_DAY}`, true, true)
          .toArray();
        return transactions.sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
      }),
    );
  }

  add(transaction: NewTransaction): Observable<number> {
    return from(this.db.transactions.add(transaction));
  }

  update(transaction: Transaction): Observable<void> {
    return from(this.db.transactions.put(transaction).then(() => undefined));
  }

  remove(id: number): Observable<void> {
    return from(this.db.transactions.delete(id));
  }
}
