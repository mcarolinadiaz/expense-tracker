import {
  increaseByPercent,
  multiplyCents,
  numberSeparators,
  parsePercent,
  percentChange,
} from './decimal';

describe('decimal', () => {
  it('should know the separators of each language', () => {
    expect(numberSeparators('es-AR')).toEqual({ group: '.', decimal: ',' });
    expect(numberSeparators('en-US')).toEqual({ group: ',', decimal: '.' });
  });

  it.each([
    [62000000, '1.0952', 67902400],
    [100, '1.0055', 101],
    [100, '1.0045', 100],
    [1199, '1', 1199],
    [3200000, '1.08', 3456000],
  ])('should multiply %i cents by %s exactly, rounding to the cent', (cents, factor, expected) => {
    expect(multiplyCents(cents, factor)).toBe(expected);
  });

  it.each([
    [3200000, '8', 3456000],
    [1199, '10', 1319],
    [699, '2.5', 716],
    [100000, '0.01', 100010],
  ])('should increase %i cents by %s%%', (cents, percent, expected) => {
    expect(increaseByPercent(cents, percent)).toBe(expected);
  });

  it('should reject text that is not a plain decimal', () => {
    expect(() => multiplyCents(100, '1,05')).toThrow(RangeError);
  });

  it.each([
    [100000, 118400, 1, '18.4'],
    [100000, 100000, 1, '0.0'],
    [100000, 97000, 1, '-3.0'],
    [300, 301, 2, '0.33'],
    [100, 300, 0, '200'],
  ])('should give the change from %i to %i with %i decimals', (from, to, decimals, expected) => {
    expect(percentChange(from, to, decimals)).toBe(expected);
  });

  it('should give no change from zero', () => {
    expect(percentChange(0, 100, 1)).toBeNull();
  });

  it.each([
    ['2,5', 'es-AR', '2.5'],
    ['2.5', 'en-US', '2.5'],
    [' 08 ', 'en-US', '8'],
    ['50', 'en-US', '50'],
    ['0,01', 'es-AR', '0.01'],
  ])('should read the percentage %s in %s', (text, locale, expected) => {
    expect(parsePercent(text, locale, 50)).toBe(expected);
  });

  it.each(['', '0', '0,00', '50,01', '2,555', '2.5', '-1', 'abc', '1.000'])(
    'should reject the percentage %s in es-AR',
    (text) => {
      expect(parsePercent(text, 'es-AR', 50)).toBeNull();
    },
  );
});
