import { Component, computed, inject, input } from '@angular/core';
import { Cents, Currency } from '../../core/money';
import { ScreenSize } from '../../core/screen-size.service';
import { MoneyPipe } from '../pipes/money.pipe';
import { StatCard, StatCardTone } from '../stat-card/stat-card';

/** One total of a page summary, such as the month's income. */
export interface SummaryFigure {
  label: string;
  amount: Cents;
  tone: StatCardTone;
}

/** A short value shown beside the totals, such as the increase over 12 months. */
export interface SummaryBadge {
  label: string;
  value: string;
}

/**
 * A page's totals. From `sm` up, one card per figure, plus a dark card for the badge. On phones,
 * one dark card with the main figure, by default the last, the badge beside it, and the other
 * figures below as details.
 */
@Component({
  imports: [MoneyPipe, StatCard],
  selector: 'app-summary-cards',
  styleUrl: './summary-cards.css',
  host: { '[class.stat-cards]': '!isPhone()' },
  templateUrl: './summary-cards.html',
})
export class SummaryCards {
  protected readonly isPhone = inject(ScreenSize).isPhone;

  readonly figures = input.required<SummaryFigure[]>();
  readonly currency = input.required<Currency>();
  readonly badge = input<SummaryBadge | null>(null);
  readonly mainIndex = input<number | null>(null);

  private readonly main = computed(() => this.mainIndex() ?? this.figures().length - 1);
  protected readonly mainFigure = computed(() => this.figures()[this.main()]);
  protected readonly details = computed(() =>
    this.figures().filter((_, index) => index !== this.main()),
  );
}
