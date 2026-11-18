import { inject, LOCALE_ID, Service, signal } from '@angular/core';
import { fromIsoDate, IsoDate, YearMonth } from './dates';
import { parsePercent } from './decimal';
import {
  AMOUNT_SIGN,
  AmountSign,
  Cents,
  CENTS_PER_UNIT,
  Currency,
  formatAmount,
  parseAmount,
} from './money';

/** The languages the app supports, for its text and for number, date and currency formats. */
export const APP_LOCALE = {
  esAR: 'es-AR',
  enUS: 'en-US',
} as const;

export type AppLocale = (typeof APP_LOCALE)[keyof typeof APP_LOCALE];

const PERCENT = 100;
const PERCENT_DECIMALS = 2;

/**
 * Formats money and dates in the active language. The language is a signal, so anything that
 * calls these methods from a template, `computed()` or an impure pipe updates when it changes,
 * without reloading. `LOCALE_ID` only gives the starting language.
 */
@Service()
export class LocaleFormat {
  private readonly active = signal<string>(inject(LOCALE_ID));

  readonly locale = this.active.asReadonly();

  use(locale: AppLocale): void {
    this.active.set(locale);
  }

  /** Reads an amount typed in the active language, such as `1.250,50` in es-AR, as cents. */
  parseAmount(text: string): Cents | null {
    return parseAmount(text, this.active());
  }

  /** Writes cents in the active language, to fill an amount field. */
  formatAmount(cents: Cents): string {
    return formatAmount(cents, this.active());
  }

  /**
   * Formats cents with the currency's symbol, and the sign if given, such as `− $1,250.50`.
   * A negative amount without a sign gets `−` rather than the hyphen `Intl` writes.
   */
  money(cents: Cents, currency: Currency, sign?: AmountSign): string {
    const text = new Intl.NumberFormat(this.active(), { style: 'currency', currency }).format(
      Math.abs(cents) / CENTS_PER_UNIT,
    );
    const shownSign = sign ?? (cents < 0 ? AMOUNT_SIGN.minus : undefined);
    return shownSign ? `${shownSign} ${text}` : text;
  }

  /** A short day, such as "Nov 6" or "6 nov". */
  shortDate(day: IsoDate): string {
    return new Intl.DateTimeFormat(this.active(), { day: 'numeric', month: 'short' }).format(
      fromIsoDate(day),
    );
  }

  /** A month and its year, such as "November 2026" or "Noviembre de 2026", starting with a capital. */
  monthName(month: YearMonth): string {
    const locale = this.active();
    const name = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(
      fromIsoDate(month),
    );
    return name.charAt(0).toLocaleUpperCase(locale) + name.slice(1);
  }

  /** A short month for table columns, such as "Nov 26" or "nov 26". */
  shortMonth(month: YearMonth): string {
    return new Intl.DateTimeFormat(this.active(), { month: 'short', year: '2-digit' }).format(
      fromIsoDate(month),
    );
  }

  /** A percentage given as plain decimal text, such as `"2.11"`, as "2.11%" or "2,11%". */
  percent(decimal: string): string {
    return new Intl.NumberFormat(this.active(), {
      style: 'percent',
      maximumFractionDigits: PERCENT_DECIMALS,
    }).format(Number(decimal) / PERCENT);
  }

  /** Plain decimal text written in the active language, to fill a field, such as `2,5` for `"2.5"`. */
  decimal(decimal: string): string {
    return new Intl.NumberFormat(this.active(), {
      maximumFractionDigits: PERCENT_DECIMALS,
      useGrouping: false,
    }).format(Number(decimal));
  }

  /** Reads a percentage typed in the active language as plain decimal text, such as `"2.5"`. */
  parsePercent(text: string, max: number): string | null {
    return parsePercent(text, this.active(), max);
  }

  /** Lower case in the active language, to compare text such as a search. */
  lowerCase(text: string): string {
    return text.toLocaleLowerCase(this.active());
  }
}
