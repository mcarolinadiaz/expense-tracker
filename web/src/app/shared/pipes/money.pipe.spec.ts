import { TestBed } from '@angular/core/testing';
import { APP_LOCALE, LocaleFormat } from '../../core/locale-format.service';
import { AMOUNT_SIGN, CURRENCY } from '../../core/money';
import { MoneyPipe } from './money.pipe';

describe('MoneyPipe', () => {
  function pipe(): MoneyPipe {
    TestBed.configureTestingModule({ providers: [MoneyPipe] });
    return TestBed.inject(MoneyPipe);
  }

  it('should format cents with the currency symbol of the language', () => {
    expect(pipe().transform(125050, CURRENCY.USD)).toBe('$1,250.50');
  });

  it('should add the sign', () => {
    const money = pipe();

    expect(money.transform(125050, CURRENCY.USD, AMOUNT_SIGN.plus)).toBe('+ $1,250.50');
    expect(money.transform(125050, CURRENCY.USD, AMOUNT_SIGN.minus)).toBe('− $1,250.50');
  });

  it('should follow the active language', () => {
    const money = pipe();

    TestBed.inject(LocaleFormat).use(APP_LOCALE.esAR);

    expect(money.transform(125050, CURRENCY.USD).replace(/\s/g, ' ')).toBe('US$ 1.250,50');
  });
});
