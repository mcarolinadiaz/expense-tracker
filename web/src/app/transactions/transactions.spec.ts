import { ComponentFixture, TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { CURRENCY } from '../core/money';
import { NewTransaction, TRANSACTION_TYPE } from './transaction';
import { APP_TEXT } from '../core/constants/app-text';
import { AppDb } from '../core/db/app-db';
import { CategoryService } from '../categories/category.service';
import { provideFixedClock } from '../core/clock.testing';
import { TransactionService } from './transaction.service';
import { Transactions } from './transactions';

describe('Transactions', () => {
  let fixture: ComponentFixture<Transactions>;
  let element: HTMLElement;

  async function seed(): Promise<void> {
    const food = await firstValueFrom(TestBed.inject(CategoryService).add('Comida'));
    const salary = await firstValueFrom(TestBed.inject(CategoryService).add('Sueldo'));
    const transactions: NewTransaction[] = [
      {
        date: '2026-11-01',
        type: TRANSACTION_TYPE.income,
        currency: CURRENCY.ARS,
        amount: 185000000,
        categoryId: salary,
        description: 'Sueldo de noviembre',
      },
      {
        date: '2026-11-06',
        type: TRANSACTION_TYPE.expense,
        currency: CURRENCY.ARS,
        amount: 18435050,
        categoryId: food,
        description: 'Supermercado',
      },
      {
        date: '2026-11-05',
        type: TRANSACTION_TYPE.expense,
        currency: CURRENCY.USD,
        amount: 2400,
        categoryId: food,
        description: '',
      },
      {
        date: '2026-10-30',
        type: TRANSACTION_TYPE.expense,
        currency: CURRENCY.ARS,
        amount: 5000000,
        categoryId: food,
        description: 'October',
      },
    ];
    for (const transaction of transactions) {
      await firstValueFrom(TestBed.inject(TransactionService).add(transaction));
    }
  }

  function rowTexts(): string[] {
    return Array.from(element.querySelectorAll('tbody tr')).map((row) =>
      Array.from(row.querySelectorAll('td'))
        // Intl joins "ARS" and the number with a non-breaking space, which \s also matches.
        .map((cell) => cell.textContent?.replace(/\s+/g, ' ').trim())
        .filter(Boolean)
        .join(' '),
    );
  }

  async function render(): Promise<void> {
    fixture = TestBed.createComponent(Transactions);
    element = fixture.nativeElement;
    await fixture.whenStable();
  }

  async function settle(): Promise<void> {
    // IndexedDB answers outside Angular, so wait for it before checking the view again.
    await new Promise((resolve) => setTimeout(resolve));
    await fixture.whenStable();
  }

  beforeEach(() => {
    // The page opens on the current month.
    TestBed.configureTestingModule({ providers: [provideFixedClock('2026-11-15')] });
  });

  afterEach(async () => {
    await TestBed.inject(AppDb).delete();
  });

  it('should list the transactions of the selected month, newest first, with signed amounts', async () => {
    await seed();
    await render();
    await settle();

    expect(rowTexts()).toEqual([
      'Nov 6 Supermercado Comida − ARS 184,350.50',
      'Nov 5 — Comida − $24.00',
      'Nov 1 Sueldo de noviembre Sueldo + ARS 1,850,000.00',
    ]);
    expect(element.textContent).toContain(APP_TEXT.activity.count(3));
  });

  it('should filter by currency and by text', async () => {
    await seed();
    await render();
    await settle();
    const currencyButton = (label: string) =>
      Array.from(element.querySelectorAll<HTMLButtonElement>('.segmented-item')).find(
        (button) => button.textContent?.trim() === label,
      )!;

    currencyButton(CURRENCY.USD).click();
    await settle();
    expect(rowTexts()).toHaveLength(1);

    currencyButton(APP_TEXT.activity.allCurrencies).click();
    const search = element.querySelector<HTMLInputElement>('#activity-search')!;
    search.value = 'super';
    search.dispatchEvent(new Event('input'));
    await settle();
    expect(rowTexts()).toEqual(['Nov 6 Supermercado Comida − ARS 184,350.50']);
  });

  it('should offer to clear the filters when nothing matches', async () => {
    await seed();
    await render();
    await settle();
    const search = element.querySelector<HTMLInputElement>('#activity-search')!;

    search.value = 'nothing like this';
    search.dispatchEvent(new Event('input'));
    await settle();
    expect(element.textContent).toContain(APP_TEXT.activity.noResultsTitle);

    Array.from(element.querySelectorAll<HTMLButtonElement>('button'))
      .find((button) => button.textContent?.trim() === APP_TEXT.actions.clearFilters)!
      .click();
    await settle();
    expect(rowTexts()).toHaveLength(3);
  });

  it('should delete a transaction only after confirming', async () => {
    await seed();
    await render();
    await settle();

    element
      .querySelector<HTMLButtonElement>(`[aria-label="${APP_TEXT.actions.delete}: Supermercado"]`)!
      .click();
    await settle();
    expect(rowTexts()).toHaveLength(3);
    expect(element.textContent).toContain(APP_TEXT.activity.confirmDelete);

    element.querySelector<HTMLButtonElement>('.btn-danger')!.click();
    await settle();
    await settle();
    expect(rowTexts()).toHaveLength(2);
  });

  it('should invite to add the first transaction of an empty month', async () => {
    await render();
    await settle();

    expect(element.textContent).toContain(APP_TEXT.activity.emptyTitle);
  });
});
