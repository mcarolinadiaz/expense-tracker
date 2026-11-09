export const CURRENCY = {
  ARS: 'ARS',
  USD: 'USD',
} as const;

export const CURRENCIES = Object.values(CURRENCY);

export type Money = string;
export type Currency = (typeof CURRENCY)[keyof typeof CURRENCY];

/** An amount in integer cents, such as `125050` for 1,250.50. Stored amounts are always cents. */
export type Cents = number;
