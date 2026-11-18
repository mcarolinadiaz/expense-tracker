import { inject, Service } from '@angular/core';
import { combineLatest, map, Observable } from 'rxjs';
import { CategoryService } from '../categories/category.service';
import { YearMonth } from '../core/dates';
import { Cents, Currency } from '../core/money';
import { Transaction, TRANSACTION_TYPE, TransactionType } from '../transactions/transaction';
import { TransactionService } from '../transactions/transaction.service';
import { CategoryTotal, MonthlySummary } from './summary';

/** How many of the latest transactions the summary lists. */
export const RECENT_TRANSACTIONS = 5;

const FULL_SHARE = 100;

/** Builds the monthly summary from the transactions on this device. */
@Service()
export class SummaryService {
  private readonly transactionService = inject(TransactionService);
  private readonly categoryService = inject(CategoryService);

  /** The summary of one month in one currency. It emits again whenever the data changes. */
  getSummary(month: YearMonth, currency: Currency): Observable<MonthlySummary> {
    return combineLatest([
      this.transactionService.listMonth(month),
      this.categoryService.list(),
    ]).pipe(
      map(([transactions, categories]) => {
        const names = new Map(categories.map((category) => [category.id, category.name]));
        const inCurrency = transactions.filter((transaction) => transaction.currency === currency);
        const income = total(inCurrency, TRANSACTION_TYPE.income);
        const expense = total(inCurrency, TRANSACTION_TYPE.expense);

        return {
          month,
          currency,
          income,
          expense,
          balance: income - expense,
          byCategory: byCategory(inCurrency, names),
          recent: inCurrency.slice(0, RECENT_TRANSACTIONS).map((transaction) => ({
            transaction,
            category: names.get(transaction.categoryId) ?? '',
          })),
          isEmpty: inCurrency.length === 0,
        };
      }),
    );
  }
}

function total(transactions: Transaction[], type: TransactionType): Cents {
  return transactions
    .filter((transaction) => transaction.type === type)
    .reduce((sum, transaction) => sum + transaction.amount, 0);
}

function byCategory(transactions: Transaction[], names: Map<number, string>): CategoryTotal[] {
  const totals = new Map<number, Cents>();
  for (const transaction of transactions) {
    if (transaction.type === TRANSACTION_TYPE.expense) {
      totals.set(
        transaction.categoryId,
        (totals.get(transaction.categoryId) ?? 0) + transaction.amount,
      );
    }
  }

  const largest = Math.max(0, ...totals.values());
  return Array.from(totals, ([categoryId, amount]) => ({
    categoryId,
    name: names.get(categoryId) ?? '',
    total: amount,
    share: largest > 0 ? Math.round((amount * FULL_SHARE) / largest) : 0,
  })).sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
}
