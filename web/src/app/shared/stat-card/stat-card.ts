import { CurrencyPipe } from '@angular/common';
import { Component, input } from '@angular/core';
import { Currency, Money } from '../../core/money';

export const STAT_CARD_TONE = {
  neutral: 'neutral',
  income: 'income',
  expense: 'expense',
} as const;

export type StatCardTone = (typeof STAT_CARD_TONE)[keyof typeof STAT_CARD_TONE];

@Component({
  imports: [CurrencyPipe],
  selector: 'app-stat-card',
  templateUrl: './stat-card.html',
})
export class StatCard {
  protected readonly tones = STAT_CARD_TONE;

  readonly label = input.required<string>();
  readonly amount = input.required<Money>();
  readonly currency = input.required<Currency>();
  readonly tone = input<StatCardTone>(STAT_CARD_TONE.neutral);
}
