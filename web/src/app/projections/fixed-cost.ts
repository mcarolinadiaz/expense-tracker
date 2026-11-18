import { YearMonth } from '../core/dates';
import { Cents, Currency } from '../core/money';

export const INCREASE_RULE = {
  ipc: 'ipc',
  percent: 'percent',
  amount: 'amount',
} as const;

export type IncreaseRule = (typeof INCREASE_RULE)[keyof typeof INCREASE_RULE];

/** How often a fixed cost may increase, in months. */
export const INCREASE_EVERY_OPTIONS = [1, 2, 3, 4, 6, 12] as const;

export const FIXED_COST_NAME_MAX_LENGTH = 60;

/** The largest percentage a fixed cost may increase by each time. */
export const FIXED_COST_MAX_PERCENT = 100;

/**
 * How a fixed cost increases: by the IPC accumulated since its last increase, by a percentage
 * as plain decimal text, such as `"8.5"`, or by a fixed amount in cents.
 */
export type FixedCostIncrease =
  | { rule: typeof INCREASE_RULE.ipc }
  | { rule: typeof INCREASE_RULE.percent; percent: string }
  | { rule: typeof INCREASE_RULE.amount; amount: Cents };

/** A cost that repeats every month and increases every `every` months, counted from `lastIncrease`. */
export interface FixedCost {
  id: number;
  name: string;
  currency: Currency;
  amount: Cents;
  every: number;
  lastIncrease: YearMonth;
  increase: FixedCostIncrease;
}

export type NewFixedCost = Omit<FixedCost, 'id'>;
