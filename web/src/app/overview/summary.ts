import { Currency, Money } from '../core/money';

export interface CategoryTotal {
  name: string;
  total: Money;
}

export interface MonthlySummary {
  month: string;
  currency: Currency;
  income: Money;
  expense: Money;
  balance: Money;
  by_category: CategoryTotal[];
}
