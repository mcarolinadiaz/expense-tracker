import { IsoDate } from '../core/dates';
import { Cents, Currency } from '../core/money';

export const TRANSACTION_TYPE = {
  income: 'income',
  expense: 'expense',
} as const;

export type TransactionType = (typeof TRANSACTION_TYPE)[keyof typeof TRANSACTION_TYPE];

export const TRANSACTION_DESCRIPTION_MAX_LENGTH = 255;

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
