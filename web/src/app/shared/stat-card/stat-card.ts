import { Component, input } from '@angular/core';
import { Cents, Currency } from '../../core/money';
import { MoneyPipe } from '../pipes/money.pipe';

export const STAT_CARD_TONE = {
  income: 'income',
  expense: 'expense',
  highlight: 'highlight',
} as const;

export type StatCardTone = (typeof STAT_CARD_TONE)[keyof typeof STAT_CARD_TONE];

/** A card with one total, such as the month's income. `highlight` shows it on a dark card. */
@Component({
  imports: [MoneyPipe],
  selector: 'app-stat-card',
  templateUrl: './stat-card.html',
})
export class StatCard {
  protected readonly tones = STAT_CARD_TONE;

  readonly label = input.required<string>();
  readonly amount = input.required<Cents>();
  readonly currency = input.required<Currency>();
  readonly tone = input.required<StatCardTone>();
}
