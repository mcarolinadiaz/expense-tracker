export const CURRENCY = {
  ARS: 'ARS',
  USD: 'USD',
} as const;

export const CURRENCIES = Object.values(CURRENCY);

export type Money = string;
export type Currency = (typeof CURRENCY)[keyof typeof CURRENCY];
