import { inject, Service, signal } from '@angular/core';
import { YearMonth } from '../../core/api/transaction';
import { shiftMonth } from '../../core/dates';
import { Clock } from './clock.service';

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
