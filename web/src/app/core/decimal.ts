import type { Cents } from './money';

const DECIMAL_BASE = 10n;
const PERCENT = 100n;
const PERCENT_DECIMALS = 2;
const PLAIN_DECIMAL = /^(\d+)(?:\.(\d+))?$/;
const SEPARATOR_SAMPLE = 12345.6;

interface Ratio {
  numerator: bigint;
  denominator: bigint;
}

/** The thousands and decimal separators of a language, such as `.` and `,` in es-AR. */
export function numberSeparators(locale: string): { group: string; decimal: string } {
  const parts = new Intl.NumberFormat(locale).formatToParts(SEPARATOR_SAMPLE);
  return {
    group: parts.find((part) => part.type === 'group')?.value ?? '',
    decimal: parts.find((part) => part.type === 'decimal')?.value ?? '.',
  };
}

function toRatio(decimal: string): Ratio {
  const match = PLAIN_DECIMAL.exec(decimal);
  if (!match) {
    throw new RangeError(`Not a plain decimal: ${decimal}`);
  }
  const [, whole, fraction = ''] = match;
  return {
    numerator: BigInt(whole + fraction),
    denominator: DECIMAL_BASE ** BigInt(fraction.length),
  };
}

function divideRounded(numerator: bigint, denominator: bigint): bigint {
  const half = denominator / 2n;
  return numerator >= 0n ? (numerator + half) / denominator : (numerator - half) / denominator;
}

/**
 * Multiplies cents by a plain decimal text, such as an IPC factor `"1.0952"`, and rounds to the
 * nearest cent. It uses `BigInt`, never decimal `number` math.
 */
export function multiplyCents(cents: Cents, factor: string): Cents {
  const { numerator, denominator } = toRatio(factor);
  return Number(divideRounded(BigInt(cents) * numerator, denominator));
}

/** Increases cents by a percentage given as plain decimal text, such as `"8.5"`, rounded to the cent. */
export function increaseByPercent(cents: Cents, percent: string): Cents {
  const { numerator, denominator } = toRatio(percent);
  const whole = PERCENT * denominator;
  return Number(divideRounded(BigInt(cents) * (whole + numerator), whole));
}

/**
 * How much `to` changed from `from`, as a percentage in plain decimal text with the given
 * decimals, such as `"18.4"` or `"-3.0"`. It returns `null` when `from` is not positive.
 */
export function percentChange(from: Cents, to: Cents, decimals: number): string | null {
  if (from <= 0) {
    return null;
  }
  const scale = DECIMAL_BASE ** BigInt(decimals);
  const scaled = divideRounded(BigInt(to - from) * PERCENT * scale, BigInt(from));
  const sign = scaled < 0n ? '-' : '';
  const digits = (scaled < 0n ? -scaled : scaled).toString().padStart(decimals + 1, '0');
  const whole = digits.slice(0, digits.length - decimals);
  return decimals > 0 ? `${sign}${whole}.${digits.slice(-decimals)}` : `${sign}${whole}`;
}

/**
 * Reads a percentage typed in the format of the language, such as `2,5` in es-AR, as plain
 * decimal text, such as `"2.5"`. It returns `null` unless it is above 0, at most `max`, and has
 * up to 2 decimals. A thousands separator is rejected, so `2.5` in es-AR isn't read as 25.
 */
export function parsePercent(text: string, locale: string, max: number): string | null {
  const { group, decimal } = numberSeparators(locale);
  if (group && text.includes(group)) {
    return null;
  }
  const plain = text.trim().split(decimal).join('.');
  const match = PLAIN_DECIMAL.exec(plain);
  if (!match || (match[2] ?? '').length > PERCENT_DECIMALS) {
    return null;
  }

  const { numerator, denominator } = toRatio(plain);
  if (numerator === 0n || numerator > BigInt(max) * denominator) {
    return null;
  }

  const whole = BigInt(match[1]).toString();
  return match[2] === undefined ? whole : `${whole}.${match[2]}`;
}
