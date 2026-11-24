import { Component, computed, input, output, signal } from '@angular/core';
import { YearMonth } from '../../core/dates';
import { TextPipe } from '../../shared/pipes/text.pipe';

/** One month's bar of the projection chart. */
export interface ChartBar {
  month: YearMonth;
  label: string;
  description: string;
  height: number;
}

/** A fixed cost in one projected month, ready to show. */
export interface MonthCost {
  id: number;
  name: string;
  rule: string;
  editLabel: string;
  deleteLabel: string;
  amount: string;
  increase: string | null;
}

/** One projected month, ready to show. */
export interface MonthView {
  name: string;
  total: string;
  costs: MonthCost[];
}

/** The month axis labels every this many months, so they never overlap. */
const AXIS_LABEL_EVERY = 4;

/**
 * The month-by-month projection below desktop: one month at a time, chosen from the chart or with
 * the arrows, with every cost and its actions always in view.
 */
@Component({
  imports: [TextPipe],
  selector: 'app-projection-months',
  styleUrl: './projection-months.css',
  templateUrl: './projection-months.html',
})
export class ProjectionMonths {
  readonly bars = input.required<ChartBar[]>();
  readonly months = input.required<MonthView[]>();
  readonly edit = output<number>();
  readonly remove = output<number>();

  protected readonly index = signal(0);
  protected readonly lastIndex = computed(() => Math.max(this.months().length - 1, 0));
  protected readonly selected = computed(
    () => this.months()[Math.min(this.index(), this.lastIndex())],
  );
  protected readonly axisLabels = computed(() =>
    this.bars().filter((_, index) => index % AXIS_LABEL_EVERY === 0),
  );

  protected pick(index: number): void {
    this.index.set(Math.min(Math.max(index, 0), this.lastIndex()));
  }
}
