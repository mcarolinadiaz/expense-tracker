import { Provider } from '@angular/core';
import { Clock } from './clock.service';
import { fromIsoDate, IsoDate } from './dates';

/** A clock that is always at the start of one day. */
class FixedClock extends Clock {
  constructor(private readonly day: IsoDate) {
    super();
  }

  override now(): Date {
    return fromIsoDate(this.day);
  }
}

/** For tests: makes `Clock` return this day, as in `providers: [provideFixedClock('2026-11-06')]`. */
export function provideFixedClock(day: IsoDate): Provider {
  return { provide: Clock, useValue: new FixedClock(day) };
}
