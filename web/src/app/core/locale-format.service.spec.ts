import { computed } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { APP_LOCALE, LocaleFormat } from './locale-format.service';
import { AMOUNT_SIGN, CURRENCY } from './money';

// Intl separates the symbol and the number with a non-breaking space, which \s also matches.
const plain = (text: string) => text.replace(/\s/g, ' ');

describe('LocaleFormat', () => {
  let format: LocaleFormat;

  beforeEach(() => {
    format = TestBed.inject(LocaleFormat);
  });

  it('should start in the language of LOCALE_ID', () => {
    expect(format.locale()).toBe(APP_LOCALE.enUS);
    expect(format.money(125050, CURRENCY.USD, AMOUNT_SIGN.minus)).toBe('− $1,250.50');
    expect(format.shortDate('2026-11-06')).toBe('Nov 6');
    expect(format.monthName('2026-11')).toBe('November 2026');
    expect(format.parseAmount('1,250.50')).toBe(125050);
  });

  it('should format and read in Argentine Spanish', () => {
    format.use(APP_LOCALE.esAR);

    expect(plain(format.money(125050, CURRENCY.ARS, AMOUNT_SIGN.plus))).toBe('+ $ 1.250,50');
    expect(plain(format.money(125050, CURRENCY.USD))).toBe('US$ 1.250,50');
    expect(format.shortDate('2026-11-06')).toBe('6 nov');
    expect(format.monthName('2026-11')).toBe('Noviembre de 2026');
    expect(format.formatAmount(125050)).toBe('1.250,50');
    expect(format.parseAmount('1.250,50')).toBe(125050);
  });

  it('should update derived values when the language changes', () => {
    const label = computed(() => format.monthName('2026-11'));
    expect(label()).toBe('November 2026');

    format.use(APP_LOCALE.esAR);

    expect(label()).toBe('Noviembre de 2026');
  });
});
