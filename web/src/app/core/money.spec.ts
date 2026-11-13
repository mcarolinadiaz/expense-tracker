import { formatAmount, parseAmount } from './money';

describe('money', () => {
  it.each([
    ['es-AR', '1.250,50', 125050],
    ['es-AR', '1250,5', 125050],
    ['es-AR', ' 72.500 ', 7250000],
    ['en-US', '1,250.50', 125050],
    ['en-US', '0.01', 1],
    ['en-US', '184350.50', 18435050],
  ])('should read %s amount "%s" as %i cents', (locale, text, cents) => {
    expect(parseAmount(text, locale)).toBe(cents);
  });

  it.each(['', '0', '0,00', '-5', '1,234', 'abc', '1.250,5.0', '9999999999999'])(
    'should reject "%s" in es-AR',
    (text) => {
      expect(parseAmount(text, 'es-AR')).toBeNull();
    },
  );

  it.each([
    ['es-AR', '1.250,50'],
    ['en-US', '1,250.50'],
  ])('should write cents in the %s format', (locale, text) => {
    expect(formatAmount(125050, locale)).toBe(text);
  });
});
