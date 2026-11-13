import { inject, Service, signal } from '@angular/core';
import { Clock } from '../../core/clock.service';
import { shiftMonth, YearMonth } from '../../core/dates';

/** The month the user is looking at. It starts at the current month, and Overview and Activity share it. */
@Service()
export class SelectedMonthService {
  private readonly selected = signal<YearMonth>(inject(Clock).currentMonth());

  readonly month = this.selected.asReadonly();

  set(month: YearMonth): void {
    this.selected.set(month);
  }

  previous(): void {
    this.selected.update((month) => shiftMonth(month, -1));
  }

  next(): void {
    this.selected.update((month) => shiftMonth(month, 1));
  }
}
