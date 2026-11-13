import { LOCALE_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { CURRENCY } from '../../core/money';
import { TRANSACTION_TYPE } from '../../transactions/transaction';
import { MoneyPipe } from './money.pipe';

describe('MoneyPipe', () => {
  function pipe(locale: string): MoneyPipe {
    TestBed.configureTestingModule({
      providers: [MoneyPipe, { provide: LOCALE_ID, useValue: locale }],
    });
    return TestBed.inject(MoneyPipe);
  }

  it('should format cents with the currency symbol of the language', () => {
    expect(pipe('en-US').transform(125050, CURRENCY.USD)).toBe('$1,250.50');
  });

  it('should add the sign of the transaction type', () => {
    const money = pipe('en-US');

    expect(money.transform(125050, CURRENCY.USD, TRANSACTION_TYPE.income)).toBe('+ $1,250.50');
    expect(money.transform(125050, CURRENCY.USD, TRANSACTION_TYPE.expense)).toBe('− $1,250.50');
  });
});
