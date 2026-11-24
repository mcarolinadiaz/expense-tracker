import { LiveAnnouncer } from '@angular/cdk/a11y';
import { NgOptimizedImage } from '@angular/common';
import { Component, computed, inject, input, linkedSignal, signal } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { form, FormField } from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';
import { CategoryService } from '../categories/category.service';
import { TextKey } from '../core/i18n/translations';
import { Translator } from '../core/i18n/translator.service';
import { LocaleFormat } from '../core/locale-format.service';
import { CURRENCIES, Currency } from '../core/money';
import { NavbarActions } from '../layout/navbar/navbar-actions';
import { AddButton } from '../shared/add-button/add-button';
import { MonthPicker } from '../shared/month-picker/month-picker';
import { SelectedMonthService } from '../shared/month-picker/selected-month.service';
import { PluralPipe } from '../shared/pipes/plural.pipe';
import { TextPipe } from '../shared/pipes/text.pipe';
import { Select, SelectOption } from '../shared/select/select';
import { Transaction, TRANSACTION_SIGN, TRANSACTION_TYPE, TransactionType } from './transaction';
import { TransactionPanelService } from './transaction-panel/transaction-panel.service';
import { TransactionService } from './transaction.service';

export const FILTER_ALL = 'all';
type Filter<T> = T | typeof FILTER_ALL;

/** The query parameters Activity reads, such as `/transactions?category=3`. */
export const ACTIVITY_QUERY_PARAM = {
  category: 'category',
  currency: 'currency',
} as const;

function categoryFilter(param: string | undefined): Filter<number> {
  const id = Number(param);
  return Number.isInteger(id) && id > 0 ? id : FILTER_ALL;
}

function currencyFilter(param: string | undefined): Filter<Currency> {
  return CURRENCIES.find((currency) => currency === param) ?? FILTER_ALL;
}

interface ActivityFilters {
  search: string;
  type: Filter<TransactionType>;
  categoryId: Filter<number>;
  currency: Filter<Currency>;
}

const NO_FILTERS: ActivityFilters = {
  search: '',
  type: FILTER_ALL,
  categoryId: FILTER_ALL,
  currency: FILTER_ALL,
};

const EMPTY_DESCRIPTION = '—';

interface TransactionRow {
  transaction: Transaction;
  date: string;
  description: string;
  category: string;
  amount: string;
}

@Component({
  imports: [
    AddButton,
    FormField,
    MonthPicker,
    NavbarActions,
    NgOptimizedImage,
    PluralPipe,
    Select,
    TextPipe,
  ],
  selector: 'app-transactions',
  styleUrl: './transactions.css',
  templateUrl: './transactions.html',
})
export class Transactions {
  private readonly format = inject(LocaleFormat);
  private readonly transactionService = inject(TransactionService);
  private readonly categoryService = inject(CategoryService);
  private readonly panel = inject(TransactionPanelService);
  private readonly announcer = inject(LiveAnnouncer);
  private readonly translator = inject(Translator);
  private readonly month = inject(SelectedMonthService).month;

  protected readonly types = TRANSACTION_TYPE;
  protected readonly all = FILTER_ALL;
  protected readonly currencyFilters: Filter<Currency>[] = [FILTER_ALL, ...CURRENCIES];
  protected readonly confirmingId = signal<number | null>(null);

  /** The category id from `ACTIVITY_QUERY_PARAM.category`, bound by the router. */
  readonly category = input<string>();
  /** The currency from `ACTIVITY_QUERY_PARAM.currency`, bound by the router. */
  readonly currency = input<string>();

  protected readonly filterValues = linkedSignal<ActivityFilters>(() => ({
    ...NO_FILTERS,
    categoryId: categoryFilter(this.category()),
    currency: currencyFilter(this.currency()),
  }));
  protected readonly filters = form(this.filterValues);

  protected readonly typeOptions = computed((): SelectOption<Filter<TransactionType>>[] => [
    { value: FILTER_ALL, label: this.translator.translate('activity.allTypes') },
    ...[TRANSACTION_TYPE.expense, TRANSACTION_TYPE.income].map((type) => ({
      value: type,
      label: this.translator.translate(`transactionTypes.${type}`),
    })),
  ]);

  private readonly categories = toSignal(this.categoryService.list(), { initialValue: [] });
  protected readonly categoryOptions = computed((): SelectOption<Filter<number>>[] => [
    { value: FILTER_ALL, label: this.translator.translate('activity.allCategories') },
    ...this.categories().map((category) => ({ value: category.id, label: category.name })),
  ]);

  private readonly transactions = rxResource({
    params: () => this.month(),
    stream: ({ params }) => this.transactionService.listMonth(params),
  });
  protected readonly monthIsEmpty = computed(
    () => this.transactions.hasValue() && this.transactions.value().length === 0,
  );

  protected readonly rows = computed((): TransactionRow[] => {
    if (!this.transactions.hasValue()) {
      return [];
    }

    const { search, type, categoryId, currency } = this.filterValues();
    const query = this.format.lowerCase(search.trim());
    const names = new Map(this.categories().map((category) => [category.id, category.name]));

    return this.transactions
      .value()
      .filter(
        (transaction) =>
          (type === FILTER_ALL || transaction.type === type) &&
          (categoryId === FILTER_ALL || transaction.categoryId === categoryId) &&
          (currency === FILTER_ALL || transaction.currency === currency) &&
          (!query || this.format.lowerCase(transaction.description).includes(query)),
      )
      .map((transaction) => ({
        transaction,
        date: this.format.shortDate(transaction.date),
        description: transaction.description || EMPTY_DESCRIPTION,
        category: names.get(transaction.categoryId) ?? EMPTY_DESCRIPTION,
        amount: this.format.money(
          transaction.amount,
          transaction.currency,
          TRANSACTION_SIGN[transaction.type],
        ),
      }));
  });

  protected readonly showsAllCurrencies = computed(
    () => this.filterValues().currency === FILTER_ALL,
  );

  protected add(): void {
    void this.panel.open();
  }

  protected edit(transaction: Transaction): void {
    void this.panel.open(transaction);
  }

  protected async remove(id: number): Promise<void> {
    await firstValueFrom(this.transactionService.remove(id));
    this.confirmingId.set(null);
    void this.announcer.announce(this.translator.translate('transaction.deleted'));
  }

  protected clearFilters(): void {
    this.filters().reset(NO_FILTERS);
  }

  /** The accessible name of a row's buttons, such as "Edit: Taxi". */
  protected rowLabel(action: TextKey, row: TransactionRow): string {
    return `${this.translator.translate(action)}: ${row.transaction.description || row.category}`;
  }
}
