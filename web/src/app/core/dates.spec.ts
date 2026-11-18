import { fromIsoDate, monthsBetween, shiftMonth, toIsoDate, toYearMonth } from './dates';

describe('dates', () => {
  it('should read a day as a local date, not as UTC', () => {
    const date = fromIsoDate('2026-11-01');

    expect([date.getFullYear(), date.getMonth(), date.getDate()]).toEqual([2026, 10, 1]);
  });

  it('should write a local date without switching to UTC', () => {
    const lateAtNight = new Date(2026, 10, 30, 23, 30);

    expect(toIsoDate(lateAtNight)).toBe('2026-11-30');
    expect(toYearMonth(lateAtNight)).toBe('2026-11');
  });

  it.each([
    ['2026-11', 1, '2026-12'],
    ['2026-12', 1, '2027-01'],
    ['2026-01', -1, '2025-12'],
    ['2026-11', -13, '2025-10'],
  ])('should move %s by %i months to %s', (month, delta, expected) => {
    expect(shiftMonth(month, delta)).toBe(expected);
  });

  it.each([
    ['2026-08', '2026-11', 3],
    ['2026-11', '2027-02', 3],
    ['2026-11', '2026-11', 0],
    ['2026-11', '2026-10', -1],
  ])('should count the months from %s to %s', (from, to, expected) => {
    expect(monthsBetween(from, to)).toBe(expected);
  });
});
