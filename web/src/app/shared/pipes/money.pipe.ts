import { inject, Pipe, PipeTransform } from '@angular/core';
import { LocaleFormat } from '../../core/locale-format.service';
import { AmountSign, Cents, Currency } from '../../core/money';

/**
 * Formats cents in the active language with the currency's symbol, as in
 * `{{ amount | money: currency }}`, or with a sign, as in `{{ amount | money: currency : sign }}`.
 *
 * It's impure so it runs again when the language changes. It only formats, so that is cheap.
 */
@Pipe({ name: 'money', pure: false })
export class MoneyPipe implements PipeTransform {
  private readonly format = inject(LocaleFormat);

  transform(cents: Cents, currency: Currency, sign?: AmountSign): string {
    return this.format.money(cents, currency, sign);
  }
}
