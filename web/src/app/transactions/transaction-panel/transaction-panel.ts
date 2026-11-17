import { LiveAnnouncer } from '@angular/cdk/a11y';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  form,
  FormField,
  maxLength,
  required,
  submit,
  TreeValidationResult,
  validate,
} from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';
import { Category, CategoryError, CategoryErrorCode } from '../../categories/category';
import { CategoryService } from '../../categories/category.service';
import { APP_TEXT } from '../../core/constants/app-text';
import { IsoDate } from '../../core/dates';
import { LocaleFormat } from '../../core/locale-format.service';
import { CURRENCIES, Currency } from '../../core/money';
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

const AMOUNT_HINT_CENTS = 125050;
const INVALID_AMOUNT = 'invalidAmount';

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

/** What the user types, before it becomes a transaction: the amount is still text. */
interface TransactionFormModel {
  amount: string;
  type: TransactionType;
  currency: Currency;
  categoryId: CategoryChoice;
  newCategory: string;
  date: IsoDate;
  description: string;
}

/** The side panel to add or edit a transaction. Open it with `TransactionPanelService`. */
@Component({
  imports: [FormField, Select],
  selector: 'app-transaction-panel',
  styleUrl: './transaction-panel.css',
  templateUrl: './transaction-panel.html',
})
export class TransactionPanel {
  private readonly dialogRef = inject(DialogRef);
  private readonly data = inject<TransactionPanelData>(DIALOG_DATA);
  private readonly format = inject(LocaleFormat);
  private readonly transactionService = inject(TransactionService);
  private readonly categoryService = inject(CategoryService);
  private readonly announcer = inject(LiveAnnouncer);

  protected readonly text = APP_TEXT;
  protected readonly ids = TRANSACTION_PANEL_IDS;
  protected readonly types = [TRANSACTION_TYPE.expense, TRANSACTION_TYPE.income];
  protected readonly currencies = CURRENCIES;
  protected readonly editing = this.data.transaction !== undefined;
  protected readonly amountHint = computed(() => this.format.formatAmount(AMOUNT_HINT_CENTS));

  protected readonly model = signal<TransactionFormModel>({
    amount: this.data.transaction ? this.format.formatAmount(this.data.transaction.amount) : '',
    type: this.data.transaction?.type ?? this.data.defaults.type,
    currency: this.data.transaction?.currency ?? this.data.defaults.currency,
    categoryId: this.data.transaction?.categoryId ?? this.data.defaults.categoryId ?? NEW_CATEGORY,
    newCategory: '',
    date: this.data.transaction?.date ?? this.data.defaults.date,
    description: this.data.transaction?.description ?? '',
  });

  protected readonly form = form(this.model, (path) => {
    validate(path.amount, ({ value }) =>
      this.format.parseAmount(value()) === null ? { kind: INVALID_AMOUNT } : undefined,
    );
    required(path.date);
    maxLength(path.description, TRANSACTION_DESCRIPTION_MAX_LENGTH);
  });

  private readonly categories = toSignal(this.categoryService.list(), {
    initialValue: this.data.categories,
  });
  protected readonly categoryOptions = computed((): SelectOption<CategoryChoice>[] => [
    ...this.categories().map((category) => ({ value: category.id, label: category.name })),
    { value: NEW_CATEGORY, label: APP_TEXT.transaction.newCategoryOption },
  ]);
  protected readonly isNewCategory = computed(() => this.model().categoryId === NEW_CATEGORY);

  protected readonly amountError = computed(
    () => this.form.amount().invalid() && this.form.amount().touched(),
  );
  protected readonly categoryError = computed(
    () => this.form.newCategory().errors()[0]?.kind as CategoryErrorCode | undefined,
  );

  protected close(): void {
    this.dialogRef.close();
  }

  protected async save(addAnother = false, event?: Event): Promise<void> {
    event?.preventDefault();
    await submit(this.form, () => this.persist(addAnother));
  }

  /** Saves the valid form. A broken category rule comes back as an error on the new category field. */
  private async persist(addAnother: boolean): Promise<TreeValidationResult> {
    const value = this.model();
    const amount = this.format.parseAmount(value.amount)!;

    let categoryId: number;
    try {
      categoryId =
        value.categoryId === NEW_CATEGORY
          ? await firstValueFrom(this.categoryService.add(value.newCategory))
          : value.categoryId;
    } catch (error) {
      if (error instanceof CategoryError) {
        return { kind: error.code, fieldTree: this.form.newCategory };
      }
      throw error;
    }

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
    void this.announcer.announce(APP_TEXT.transaction.saved);

    if (addAnother) {
      this.form().reset({ ...value, amount: '', description: '', categoryId, newCategory: '' });
      this.form.amount().focusBoundControl();
    } else {
      this.close();
    }
    return undefined;
  }
}
