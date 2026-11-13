import { inject, LOCALE_ID, Service, signal } from '@angular/core';
import { fromIsoDate, IsoDate, YearMonth } from './dates';
import { AmountSign, Cents, CENTS_PER_UNIT, Currency, formatAmount, parseAmount } from './money';

/** The languages the app supports, for its text and for number, date and currency formats. */
export const APP_LOCALE = {
  esAR: 'es-AR',
  enUS: 'en-US',
} as const;

export type AppLocale = (typeof APP_LOCALE)[keyof typeof APP_LOCALE];

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

  /** Formats cents with the currency's symbol, and the sign if given, such as `− $1,250.50`. */
  money(cents: Cents, currency: Currency, sign?: AmountSign): string {
    const text = new Intl.NumberFormat(this.active(), { style: 'currency', currency }).format(
      cents / CENTS_PER_UNIT,
    );
    return sign ? `${sign} ${text}` : text;
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
    // Spanish writes month names in lower case, but the name may start a line.
    return name.charAt(0).toLocaleUpperCase(locale) + name.slice(1);
  }

  /** Lower case in the active language, to compare text such as a search. */
  lowerCase(text: string): string {
    return text.toLocaleLowerCase(this.active());
  }
}
