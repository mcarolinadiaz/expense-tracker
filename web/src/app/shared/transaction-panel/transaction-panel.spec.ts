import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { CURRENCY } from '../../core/api/money';
import { TRANSACTION_TYPE } from '../../core/api/transaction';
import { APP_TEXT } from '../../core/constants/app-text';
import { AppDb } from '../../core/db/app-db';
import { CategoryService } from '../services/category.service';
import { provideFixedClock } from '../services/clock.testing';
import { TransactionService } from '../services/transaction.service';
import { TRANSACTION_PANEL_IDS } from './transaction-panel';
import { TransactionPanelService } from './transaction-panel.service';

describe('TransactionPanel', () => {
  beforeEach(() => {
    // New transactions start on today's date.
    TestBed.configureTestingModule({ providers: [provideFixedClock('2026-11-06')] });
  });

  afterEach(async () => {
    await TestBed.inject(AppDb).delete();
  });

  async function settle(): Promise<void> {
    // The panel and IndexedDB answer asynchronously.
    for (let i = 0; i < 3; i++) {
      await new Promise((resolve) => setTimeout(resolve));
    }
  }

  function panel(): HTMLElement {
    return document.querySelector('app-transaction-panel')!;
  }

  function type(selector: string, value: string): void {
    const input = panel().querySelector<HTMLInputElement>(selector)!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
  }

  function button(label: string): HTMLButtonElement {
    return Array.from(panel().querySelectorAll<HTMLButtonElement>('button')).find(
      (candidate) => candidate.textContent?.trim() === label,
    )!;
  }

  async function savedTransactions() {
    return firstValueFrom(TestBed.inject(TransactionService).listMonth('2026-11'));
  }

  it('should save an expense in cents for today with an existing category, then close', async () => {
    const food = await firstValueFrom(TestBed.inject(CategoryService).add('Comida'));
    await TestBed.inject(TransactionPanelService).open();
    await settle();

    expect(panel().querySelector<HTMLInputElement>('#transaction-date')!.value).toBe('2026-11-06');
    type(`#${TRANSACTION_PANEL_IDS.amount}`, '1,250.50');
    type('#transaction-description', '  Taxi  ');
    button(APP_TEXT.actions.save).click();
    await settle();

    expect(await savedTransactions()).toEqual([
      {
        id: expect.any(Number),
        date: '2026-11-06',
        type: TRANSACTION_TYPE.expense,
        currency: CURRENCY.ARS,
        amount: 125050,
        categoryId: food,
        description: 'Taxi',
      },
    ]);
    expect(panel()).toBeNull();
  });

  it('should create the new category the user types', async () => {
    await TestBed.inject(TransactionPanelService).open();
    await settle();

    // With no categories yet, the panel starts on "+ New category".
    type('#transaction-new-category', 'Viajes');
    type(`#${TRANSACTION_PANEL_IDS.amount}`, '310.50');
    button(CURRENCY.USD).click();
    button(APP_TEXT.actions.save).click();
    await settle();

    const [category] = await firstValueFrom(TestBed.inject(CategoryService).list());
    const [transaction] = await savedTransactions();
    expect(category.name).toBe('Viajes');
    expect(transaction).toMatchObject({
      categoryId: category.id,
      currency: CURRENCY.USD,
      amount: 31050,
    });
  });

  it('should show an error and keep the panel open for an invalid amount', async () => {
    await firstValueFrom(TestBed.inject(CategoryService).add('Comida'));
    await TestBed.inject(TransactionPanelService).open();
    await settle();

    type(`#${TRANSACTION_PANEL_IDS.amount}`, '12.345');
    button(APP_TEXT.actions.save).click();
    await settle();

    expect(panel().textContent).toContain(APP_TEXT.transaction.amountError);
    expect(await savedTransactions()).toEqual([]);
  });

  it('should keep the panel open and clear the amount to add another', async () => {
    await firstValueFrom(TestBed.inject(CategoryService).add('Comida'));
    await TestBed.inject(TransactionPanelService).open();
    await settle();

    type(`#${TRANSACTION_PANEL_IDS.amount}`, '100');
    button(APP_TEXT.actions.saveAndAddAnother).click();
    await settle();

    expect(panel()).not.toBeNull();
    expect(panel().querySelector<HTMLInputElement>(`#${TRANSACTION_PANEL_IDS.amount}`)!.value).toBe(
      '',
    );
    expect(await savedTransactions()).toHaveLength(1);
  });

  it('should edit an existing transaction', async () => {
    const food = await firstValueFrom(TestBed.inject(CategoryService).add('Comida'));
    const id = await firstValueFrom(
      TestBed.inject(TransactionService).add({
        date: '2026-11-06',
        type: TRANSACTION_TYPE.expense,
        currency: CURRENCY.ARS,
        amount: 5000000,
        categoryId: food,
        description: 'Taxi',
      }),
    );
    const [saved] = await savedTransactions();
    await TestBed.inject(TransactionPanelService).open(saved);
    await settle();

    expect(panel().textContent).toContain(APP_TEXT.transaction.editTitle);
    expect(panel().querySelector<HTMLInputElement>(`#${TRANSACTION_PANEL_IDS.amount}`)!.value).toBe(
      '50,000.00',
    );

    type(`#${TRANSACTION_PANEL_IDS.amount}`, '55,000');
    button(APP_TEXT.actions.save).click();
    await settle();

    expect(await savedTransactions()).toEqual([{ ...saved, id, amount: 5500000 }]);
  });
});
