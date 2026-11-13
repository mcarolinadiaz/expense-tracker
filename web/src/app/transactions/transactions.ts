import { LiveAnnouncer } from '@angular/cdk/a11y';
import { Component, computed, inject, LOCALE_ID, signal } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { firstValueFrom, map } from 'rxjs';
import { CURRENCIES, Currency } from '../core/money';
import { Transaction, TRANSACTION_TYPE, TransactionType } from './transaction';
import { APP_TEXT } from '../core/constants/app-text';
import { fromIsoDate } from '../core/dates';
import { NavbarActions } from '../layout/navbar/navbar-actions';
import { MonthPicker } from '../shared/month-picker/month-picker';
import { MoneyPipe } from '../shared/pipes/money.pipe';
import { Select, SelectOption } from '../shared/select/select';
import { CategoryService } from '../categories/category.service';
import { SelectedMonthService } from '../shared/month-picker/selected-month.service';
import { TransactionService } from './transaction.service';
import { TransactionPanelService } from './transaction-panel/transaction-panel.service';

export const FILTER_ALL = 'all';
type Filter<T> = T | typeof FILTER_ALL;

const EMPTY_DESCRIPTION = '—';

interface TransactionRow {
  transaction: Transaction;
  date: string;
  description: string;
  category: string;
}

@Component({
  imports: [MoneyPipe, MonthPicker, NavbarActions, ReactiveFormsModule, Select],
  selector: 'app-transactions',
  styleUrl: './transactions.css',
  templateUrl: './transactions.html',
})
export class Transactions {
  private readonly locale = inject(LOCALE_ID);
  private readonly transactionService = inject(TransactionService);
  private readonly categoryService = inject(CategoryService);
  private readonly panel = inject(TransactionPanelService);
  private readonly announcer = inject(LiveAnnouncer);
  private readonly month = inject(SelectedMonthService).month;

  protected readonly text = APP_TEXT;
  protected readonly types = TRANSACTION_TYPE;
  protected readonly all = FILTER_ALL;
  protected readonly currencyFilters: Filter<Currency>[] = [FILTER_ALL, ...CURRENCIES];
  protected readonly confirmingId = signal<number | null>(null);

  protected readonly filters = inject(NonNullableFormBuilder).group({
    search: [''],
    type: [FILTER_ALL as Filter<TransactionType>],
    categoryId: [FILTER_ALL as Filter<number>],
    currency: [FILTER_ALL as Filter<Currency>],
  });
  private readonly filterValues = toSignal(
    this.filters.valueChanges.pipe(map(() => this.filters.getRawValue())),
    { initialValue: this.filters.getRawValue() },
  );

  protected readonly typeOptions: SelectOption<Filter<TransactionType>>[] = [
    { value: FILTER_ALL, label: APP_TEXT.activity.allTypes },
    ...[TRANSACTION_TYPE.expense, TRANSACTION_TYPE.income].map((type) => ({
      value: type,
      label: APP_TEXT.transactionTypes[type],
    })),
  ];

  private readonly categories = toSignal(this.categoryService.list(), { initialValue: [] });
  protected readonly categoryOptions = computed((): SelectOption<Filter<number>>[] => [
    { value: FILTER_ALL, label: APP_TEXT.activity.allCategories },
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
    const query = search.trim().toLocaleLowerCase(this.locale);
    const names = new Map(this.categories().map((category) => [category.id, category.name]));
    const dateFormat = new Intl.DateTimeFormat(this.locale, { day: 'numeric', month: 'short' });

    return this.transactions
      .value()
      .filter(
        (transaction) =>
          (type === FILTER_ALL || transaction.type === type) &&
          (categoryId === FILTER_ALL || transaction.categoryId === categoryId) &&
          (currency === FILTER_ALL || transaction.currency === currency) &&
          (!query || transaction.description.toLocaleLowerCase(this.locale).includes(query)),
      )
      .map((transaction) => ({
        transaction,
        date: dateFormat.format(fromIsoDate(transaction.date)),
        description: transaction.description || EMPTY_DESCRIPTION,
        category: names.get(transaction.categoryId) ?? EMPTY_DESCRIPTION,
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
    void this.announcer.announce(APP_TEXT.transaction.deleted);
  }

  protected clearFilters(): void {
    this.filters.reset();
  }

  /** The accessible name of a row's buttons, such as "Edit: Taxi". */
  protected rowLabel(action: string, row: TransactionRow): string {
    return `${action}: ${row.transaction.description || row.category}`;
  }
}
