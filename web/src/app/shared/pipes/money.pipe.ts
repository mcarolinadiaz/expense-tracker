import { inject, LOCALE_ID, Pipe, PipeTransform } from '@angular/core';
import { Cents, Currency } from '../../core/api/money';
import { TRANSACTION_TYPE, TransactionType } from '../../core/api/transaction';
import { CENTS_PER_UNIT } from '../../core/money';

// A real minus sign, not a hyphen, so it lines up with the plus sign.
const SIGN: Record<TransactionType, string> = {
  [TRANSACTION_TYPE.income]: '+',
  [TRANSACTION_TYPE.expense]: '−',
};

/**
 * Formats cents in the active language with the currency's symbol, as in
 * `{{ amount | money: currency }}`. Pass the transaction type to add its `+` or `−` sign, so
 * the amount doesn't rely on color alone: `{{ amount | money: currency : type }}`.
 */
@Pipe({ name: 'money' })
export class MoneyPipe implements PipeTransform {
  private readonly locale = inject(LOCALE_ID);

  transform(cents: Cents, currency: Currency, type?: TransactionType): string {
    const text = new Intl.NumberFormat(this.locale, { style: 'currency', currency }).format(
      cents / CENTS_PER_UNIT,
    );
    return type ? `${SIGN[type]} ${text}` : text;
  }
}
