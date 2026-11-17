export const CURRENCY = {
  ARS: 'ARS',
  USD: 'USD',
} as const;

export const CURRENCIES = Object.values(CURRENCY);

export type Currency = (typeof CURRENCY)[keyof typeof CURRENCY];

/** An amount as a decimal string, such as `'1250.50'`. Only the sample summary still uses it. */
export type Money = string;

/** An amount in integer cents, such as `125050` for 1,250.50. Stored amounts are always cents. */
export type Cents = number;

/** The sign shown before an amount, so income and expense don't rely on color alone. */
export const AMOUNT_SIGN = {
  plus: '+',
  minus: '−',
} as const;

export type AmountSign = (typeof AMOUNT_SIGN)[keyof typeof AMOUNT_SIGN];

export const CENTS_PER_UNIT = 100;
const DECIMALS = 2;
const MAX_AMOUNT_CENTS: Cents = 999_999_999_999;

const PLAIN_AMOUNT = /^\d+(\.\d{1,2})?$/;
const SEPARATOR_SAMPLE = 12345.6;

function separators(locale: string): { group: string; decimal: string } {
  const parts = new Intl.NumberFormat(locale).formatToParts(SEPARATOR_SAMPLE);
  return {
    group: parts.find((part) => part.type === 'group')?.value ?? '',
    decimal: parts.find((part) => part.type === 'decimal')?.value ?? '.',
  };
}

/**
 * Reads an amount typed in the format of the language, such as `1.250,50` in es-AR or
 * `1,250.50` in en-US, as integer cents. It returns `null` if it isn't a positive amount with
 * up to 2 decimals. It never goes through decimal `number` math.
 */
export function parseAmount(text: string, locale: string): Cents | null {
  const { group, decimal } = separators(locale);
  const parts = text.replace(/\s/g, '').split(decimal);

  if (parts.length > 2) {
    return null;
  }

  const [wholeText, fractionText] = parts;
  const plain =
    wholeText.split(group).join('') + (fractionText === undefined ? '' : `.${fractionText}`);

  if (!PLAIN_AMOUNT.test(plain)) {
    return null;
  }

  const [whole, fraction = ''] = plain.split('.');
  const cents = Number(whole) * CENTS_PER_UNIT + Number(fraction.padEnd(DECIMALS, '0'));

  return cents > 0 && cents <= MAX_AMOUNT_CENTS ? cents : null;
}

/** Writes cents in the format of the language, to fill an amount field, such as `1.250,50`. */
export function formatAmount(cents: Cents, locale: string): string {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: DECIMALS,
    maximumFractionDigits: DECIMALS,
  }).format(cents / CENTS_PER_UNIT);
}
