import { IsoDate } from '../core/dates';
import { AMOUNT_SIGN, AmountSign, Cents, Currency } from '../core/money';

export const TRANSACTION_TYPE = {
  income: 'income',
  expense: 'expense',
} as const;

export type TransactionType = (typeof TRANSACTION_TYPE)[keyof typeof TRANSACTION_TYPE];

/** The sign shown before the amount of each type of transaction. */
export const TRANSACTION_SIGN: Record<TransactionType, AmountSign> = {
  [TRANSACTION_TYPE.income]: AMOUNT_SIGN.plus,
  [TRANSACTION_TYPE.expense]: AMOUNT_SIGN.minus,
};

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
