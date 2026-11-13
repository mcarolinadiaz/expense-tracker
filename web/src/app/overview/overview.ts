import { Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Clock } from '../core/clock.service';
import { APP_TEXT } from '../core/constants/app-text';
import { CURRENCIES, CURRENCY, Currency, Money } from '../core/money';
import { NavbarActions } from '../layout/navbar/navbar-actions';
import { STAT_CARD_TONE, StatCard, StatCardTone } from '../shared/stat-card/stat-card';
import { TransactionPanelService } from '../transactions/transaction-panel/transaction-panel.service';
import { SummaryService } from './summary.service';

@Component({
  imports: [NavbarActions, StatCard],
  selector: 'app-overview',
  styleUrl: './overview.css',
  templateUrl: './overview.html',
})
export class Overview {
  private readonly summaryService = inject(SummaryService);
  private readonly panel = inject(TransactionPanelService);

  protected readonly actionText = APP_TEXT.actions;
  protected readonly text = APP_TEXT.summary;
  protected readonly currencies = CURRENCIES;
  protected readonly currency = signal<Currency>(CURRENCY.ARS);

  protected addTransaction(): void {
    void this.panel.open();
  }

  private readonly month = inject(Clock).currentMonth();
  private readonly summary = rxResource({
    params: () => ({ month: this.month, currency: this.currency() }),
    stream: ({ params }) => this.summaryService.getSummary(params.month, params.currency),
  });

  protected readonly cards = computed(
    (): { label: string; amount: Money; tone: StatCardTone }[] => {
      if (!this.summary.hasValue()) {
        return [];
      }

      const summary = this.summary.value();

      return [
        { label: this.text.income, amount: summary.income, tone: STAT_CARD_TONE.income },
        { label: this.text.expenses, amount: summary.expense, tone: STAT_CARD_TONE.expense },
        { label: this.text.balance, amount: summary.balance, tone: STAT_CARD_TONE.neutral },
      ];
    },
  );
}
