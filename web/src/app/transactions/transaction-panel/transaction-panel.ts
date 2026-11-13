import { LiveAnnouncer } from '@angular/cdk/a11y';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import {
  Component,
  computed,
  ElementRef,
  inject,
  LOCALE_ID,
  signal,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom, map } from 'rxjs';
import { Category, CategoryError, CategoryErrorCode } from '../../categories/category';
import { CategoryService } from '../../categories/category.service';
import { APP_TEXT } from '../../core/constants/app-text';
import { IsoDate } from '../../core/dates';
import { CURRENCIES, Currency, formatAmount, parseAmount } from '../../core/money';
import { Select, SelectOption } from '../../shared/select/select';
import {
  NewTransaction,
  Transaction,
  TRANSACTION_DESCRIPTION_MAX_LENGTH,
  TRANSACTION_TYPE,
  TransactionType,
} from '../transaction';
import { TransactionService } from '../transaction.service';

export const NEW_CATEGORY = 'new';
type CategoryChoice = number | typeof NEW_CATEGORY;

export const TRANSACTION_PANEL_IDS = {
  title: 'transaction-panel-title',
  amount: 'transaction-amount',
  amountError: 'transaction-amount-error',
} as const;

// The amount shown as a format example in the empty field: 1,250.50 or 1.250,50.
const AMOUNT_HINT_CENTS = 125050;

/** The choices the panel starts with when adding, taken from the last saved transaction. */
export interface TransactionDefaults {
  type: TransactionType;
  currency: Currency;
  categoryId: number | null;
  date: IsoDate;
}

export interface TransactionPanelData {
  /** The transaction to edit. Without it, the panel adds a new one. */
  transaction?: Transaction;
  defaults: TransactionDefaults;
  categories: Category[];
  onSaved: (saved: Pick<NewTransaction, 'type' | 'currency' | 'categoryId'>) => void;
}

/** The side panel to add or edit a transaction. Open it with `TransactionPanelService`. */
@Component({
  imports: [ReactiveFormsModule, Select],
  selector: 'app-transaction-panel',
  styleUrl: './transaction-panel.css',
  templateUrl: './transaction-panel.html',
})
export class TransactionPanel {
  private readonly dialogRef = inject(DialogRef);
  private readonly data = inject<TransactionPanelData>(DIALOG_DATA);
  private readonly locale = inject(LOCALE_ID);
  private readonly transactionService = inject(TransactionService);
  private readonly categoryService = inject(CategoryService);
  private readonly announcer = inject(LiveAnnouncer);

  protected readonly text = APP_TEXT;
  protected readonly ids = TRANSACTION_PANEL_IDS;
  protected readonly types = [TRANSACTION_TYPE.expense, TRANSACTION_TYPE.income];
  protected readonly currencies = CURRENCIES;
  protected readonly descriptionMaxLength = TRANSACTION_DESCRIPTION_MAX_LENGTH;
  protected readonly editing = this.data.transaction !== undefined;
  protected readonly amountHint = formatAmount(AMOUNT_HINT_CENTS, this.locale);

  protected readonly form = inject(NonNullableFormBuilder).group({
    amount: [this.data.transaction ? formatAmount(this.data.transaction.amount, this.locale) : ''],
    type: [this.data.transaction?.type ?? this.data.defaults.type],
    currency: [this.data.transaction?.currency ?? this.data.defaults.currency],
    categoryId: [
      (this.data.transaction?.categoryId ??
        this.data.defaults.categoryId ??
        NEW_CATEGORY) as CategoryChoice,
    ],
    newCategory: [''],
    date: [this.data.transaction?.date ?? this.data.defaults.date, Validators.required],
    description: [
      this.data.transaction?.description ?? '',
      Validators.maxLength(TRANSACTION_DESCRIPTION_MAX_LENGTH),
    ],
  });

  private readonly categories = toSignal(this.categoryService.list(), {
    initialValue: this.data.categories,
  });
  protected readonly categoryOptions = computed((): SelectOption<CategoryChoice>[] => [
    ...this.categories().map((category) => ({ value: category.id, label: category.name })),
    { value: NEW_CATEGORY, label: APP_TEXT.transaction.newCategoryOption },
  ]);
  protected readonly isNewCategory = toSignal(
    this.form.controls.categoryId.valueChanges.pipe(map((id) => id === NEW_CATEGORY)),
    { initialValue: this.form.controls.categoryId.value === NEW_CATEGORY },
  );

  protected readonly amountError = signal(false);
  protected readonly categoryError = signal<CategoryErrorCode | null>(null);
  protected readonly saving = signal(false);

  private readonly amountInput = viewChild.required<ElementRef<HTMLInputElement>>('amount');

  protected close(): void {
    this.dialogRef.close();
  }

  protected async save(addAnother = false): Promise<void> {
    const value = this.form.getRawValue();
    const amount = parseAmount(value.amount, this.locale);
    this.amountError.set(amount === null);
    this.categoryError.set(null);

    if (amount === null || this.form.invalid || this.saving()) {
      return;
    }

    this.saving.set(true);
    try {
      const categoryId =
        value.categoryId === NEW_CATEGORY
          ? await firstValueFrom(this.categoryService.add(value.newCategory))
          : value.categoryId;
      const record: NewTransaction = {
        date: value.date,
        type: value.type,
        currency: value.currency,
        amount,
        categoryId,
        description: value.description.trim(),
      };

      if (this.data.transaction) {
        await firstValueFrom(
          this.transactionService.update({ ...record, id: this.data.transaction.id }),
        );
      } else {
        await firstValueFrom(this.transactionService.add(record));
      }

      this.data.onSaved({ type: record.type, currency: record.currency, categoryId });
      this.announcer.announce(APP_TEXT.transaction.saved);

      if (addAnother) {
        // Keep the type, currency, category and date, which usually repeat.
        this.form.patchValue({ amount: '', description: '', categoryId, newCategory: '' });
        this.amountInput().nativeElement.focus();
      } else {
        this.close();
      }
    } catch (error) {
      if (!(error instanceof CategoryError)) {
        throw error;
      }
      this.categoryError.set(error.code);
    } finally {
      this.saving.set(false);
    }
  }
}
