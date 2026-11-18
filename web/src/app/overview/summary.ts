import { YearMonth } from '../core/dates';
import { Cents, Currency } from '../core/money';
import { Transaction } from '../transactions/transaction';

/** How much one category spent in the month, and its share of the largest category, from 0 to 100. */
export interface CategoryTotal {
  categoryId: number;
  name: string;
  total: Cents;
  share: number;
}

export interface RecentTransaction {
  transaction: Transaction;
  category: string;
}

/** The totals of one month in one currency. Currencies are never added together. */
export interface MonthlySummary {
  month: YearMonth;
  currency: Currency;
  income: Cents;
  expense: Cents;
  balance: Cents;
  /** Expenses by category, largest first. */
  byCategory: CategoryTotal[];
  /** The latest transactions, newest first. */
  recent: RecentTransaction[];
  isEmpty: boolean;
}
