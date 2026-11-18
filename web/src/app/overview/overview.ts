import { Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { APP_PAGE_PATH } from '../core/constants/app-page-routes';
import { APP_TEXT } from '../core/constants/app-text';
import { LocaleFormat } from '../core/locale-format.service';
import { Cents, CURRENCIES, CURRENCY, Currency } from '../core/money';
import { NavbarActions } from '../layout/navbar/navbar-actions';
import { MonthPicker } from '../shared/month-picker/month-picker';
import { SelectedMonthService } from '../shared/month-picker/selected-month.service';
import { STAT_CARD_TONE, StatCard, StatCardTone } from '../shared/stat-card/stat-card';
import { TRANSACTION_SIGN, TRANSACTION_TYPE } from '../transactions/transaction';
import { TransactionPanelService } from '../transactions/transaction-panel/transaction-panel.service';
import { ACTIVITY_QUERY_PARAM } from '../transactions/transactions';
import { SummaryService } from './summary.service';

interface SummaryCard {
  label: string;
  amount: Cents;
  tone: StatCardTone;
}

interface CategoryBar {
  categoryId: number;
  name: string;
  total: string;
  share: number;
  label: string;
}

interface RecentRow {
  id: number;
  title: string;
  details: string;
  amount: string;
  isIncome: boolean;
}

const DETAILS_SEPARATOR = ' · ';

@Component({
  imports: [MonthPicker, NavbarActions, RouterLink, StatCard],
  selector: 'app-overview',
  styleUrl: './overview.css',
  templateUrl: './overview.html',
})
export class Overview {
  private readonly summaryService = inject(SummaryService);
  private readonly panel = inject(TransactionPanelService);
  private readonly format = inject(LocaleFormat);
  private readonly month = inject(SelectedMonthService).month;

  protected readonly text = APP_TEXT;
  protected readonly currencies = CURRENCIES;
  protected readonly currency = signal<Currency>(CURRENCY.ARS);
  protected readonly activityPath = `/${APP_PAGE_PATH.transactions}`;

  private readonly summary = rxResource({
    params: () => ({ month: this.month(), currency: this.currency() }),
    stream: ({ params }) => this.summaryService.getSummary(params.month, params.currency),
  });

  protected readonly cards = computed((): SummaryCard[] => {
    if (!this.summary.hasValue()) {
      return [];
    }
    const { income, expense, balance } = this.summary.value();
    return [
      { label: APP_TEXT.summary.income, amount: income, tone: STAT_CARD_TONE.income },
      { label: APP_TEXT.summary.expenses, amount: expense, tone: STAT_CARD_TONE.expense },
      { label: APP_TEXT.summary.balance, amount: balance, tone: STAT_CARD_TONE.highlight },
    ];
  });

  protected readonly isEmpty = computed(
    () => this.summary.hasValue() && this.summary.value().isEmpty,
  );
  protected readonly hasData = computed(
    () => this.summary.hasValue() && !this.summary.value().isEmpty,
  );

  protected readonly categoryBars = computed((): CategoryBar[] => {
    if (!this.summary.hasValue()) {
      return [];
    }
    const currency = this.currency();
    return this.summary.value().byCategory.map((item) => {
      const total = this.format.money(item.total, currency);
      return {
        categoryId: item.categoryId,
        name: item.name,
        total,
        share: item.share,
        label: APP_TEXT.summary.viewCategory(item.name, total),
      };
    });
  });

  protected readonly recentRows = computed((): RecentRow[] => {
    if (!this.summary.hasValue()) {
      return [];
    }
    return this.summary.value().recent.map(({ transaction, category }) => ({
      id: transaction.id,
      title: transaction.description || category,
      details: [this.format.shortDate(transaction.date), category].join(DETAILS_SEPARATOR),
      amount: this.format.money(
        transaction.amount,
        transaction.currency,
        TRANSACTION_SIGN[transaction.type],
      ),
      isIncome: transaction.type === TRANSACTION_TYPE.income,
    }));
  });

  /** The Activity query parameters for this currency, and a category if given. */
  protected activityParams(categoryId?: number): Record<string, string | number> {
    return {
      [ACTIVITY_QUERY_PARAM.currency]: this.currency(),
      ...(categoryId === undefined ? {} : { [ACTIVITY_QUERY_PARAM.category]: categoryId }),
    };
  }

  protected addTransaction(): void {
    void this.panel.open();
  }
}
