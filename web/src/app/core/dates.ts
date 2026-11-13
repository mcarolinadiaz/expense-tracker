import { IsoDate, YearMonth } from './api/transaction';

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

export function shiftMonth(month: YearMonth, delta: number): YearMonth {
  const [year, monthNumber] = month.split('-').map(Number);
  const index = year * MONTHS_PER_YEAR + monthNumber - 1 + delta;
  return `${Math.floor(index / MONTHS_PER_YEAR)}-${pad((index % MONTHS_PER_YEAR) + 1)}`;
}
