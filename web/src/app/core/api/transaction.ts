import { Cents, Currency } from './money';

export const TRANSACTION_TYPE = {
  income: 'income',
  expense: 'expense',
} as const;

export type TransactionType = (typeof TRANSACTION_TYPE)[keyof typeof TRANSACTION_TYPE];

export const TRANSACTION_DESCRIPTION_MAX_LENGTH = 255;

/** A month as `YYYY-MM`. */
export type YearMonth = string;

/** A day as `YYYY-MM-DD`. Never parse it with `new Date(value)`, which reads it as UTC. */
export type IsoDate = string;

export interface Transaction {
  id: number;
  date: IsoDate;
  type: TransactionType;
  currency: Currency;
  amount: Cents;
  categoryId: number;
  description: string;
}

export type NewTransaction = Omit<Transaction, 'id'>;
