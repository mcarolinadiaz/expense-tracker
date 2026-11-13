import { Service } from '@angular/core';
import { IsoDate, toIsoDate, toYearMonth, YearMonth } from './dates';

/**
 * The current date. It's the only place in the app that reads the system clock, so tests can
 * replace it with `provideFixedClock()` and always get the same day.
 */
@Service()
export class Clock {
  /** The current local date and time. */
  now(): Date {
    return new Date();
  }

  today(): IsoDate {
    return toIsoDate(this.now());
  }

  currentMonth(): YearMonth {
    return toYearMonth(this.now());
  }
}
