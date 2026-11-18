/** A month as `YYYY-MM`. */
export type YearMonth = string;

/** A day as `YYYY-MM-DD`. Never parse it with `new Date(value)`, which reads it as UTC. */
export type IsoDate = string;

const MONTHS_PER_YEAR = 12;
const DATE_PART_LENGTH = 2;

function pad(value: number): string {
  return String(value).padStart(DATE_PART_LENGTH, '0');
}

/** The month of a local date, as `YYYY-MM`. */
export function toYearMonth(date: Date): YearMonth {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

/** The day of a local date, as `YYYY-MM-DD`. Unlike `toISOString()`, it doesn't switch to UTC. */
export function toIsoDate(date: Date): IsoDate {
  return `${toYearMonth(date)}-${pad(date.getDate())}`;
}

/** The local date of a `YYYY-MM-DD` day, or of the first day of a `YYYY-MM` month. Never use `new Date(value)`, which reads it as UTC. */
export function fromIsoDate(value: IsoDate | YearMonth): Date {
  const [year, month, day = 1] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function monthIndex(month: YearMonth): number {
  const [year, monthNumber] = month.split('-').map(Number);
  return year * MONTHS_PER_YEAR + monthNumber - 1;
}

export function shiftMonth(month: YearMonth, delta: number): YearMonth {
  const index = monthIndex(month) + delta;
  return `${Math.floor(index / MONTHS_PER_YEAR)}-${pad((index % MONTHS_PER_YEAR) + 1)}`;
}

/** How many months go from one month to another, such as 3 from `2026-08` to `2026-11`. */
export function monthsBetween(from: YearMonth, to: YearMonth): number {
  return monthIndex(to) - monthIndex(from);
}
