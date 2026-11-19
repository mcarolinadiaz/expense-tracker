import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { CategoryService } from '../categories/category.service';
import { AXE_TEST_TIMEOUT_MS, expectNoAxeViolations } from '../core/axe.testing';
import { provideFixedClock } from '../core/clock.testing';
import en from '../core/i18n/en.json';
import { provideTestTranslations } from '../core/i18n/translations.testing';
import { AppDb } from '../core/db/app-db';
import { CURRENCY, Currency } from '../core/money';
import { TRANSACTION_TYPE } from '../transactions/transaction';
import { TransactionService } from '../transactions/transaction.service';
import { Overview } from './overview';

describe('Overview', () => {
  let fixture: ComponentFixture<Overview>;
  let element: HTMLElement;
  let food: number;

  const texts = (selector: string) =>
    Array.from(element.querySelectorAll(selector)).map((item) =>
      item.textContent?.replace(/\s+/g, ' ').trim(),
    );

  async function seed(): Promise<void> {
    const categories = TestBed.inject(CategoryService);
    const transactions = TestBed.inject(TransactionService);
    const salary = await firstValueFrom(categories.add('Sueldo'));
    food = await firstValueFrom(categories.add('Comida'));
    await firstValueFrom(
      transactions.add({
        date: '2026-11-01',
        type: TRANSACTION_TYPE.income,
        currency: CURRENCY.USD,
        amount: 100000,
        categoryId: salary,
        description: 'Freelance',
      }),
    );
    await firstValueFrom(
      transactions.add({
        date: '2026-11-05',
        type: TRANSACTION_TYPE.expense,
        currency: CURRENCY.USD,
        amount: 2400,
        categoryId: food,
        description: '',
      }),
    );
  }

  async function render(): Promise<void> {
    fixture = TestBed.createComponent(Overview);
    element = fixture.nativeElement;
    await settleUntil(() => expect(element.querySelector('app-stat-card')).toBeTruthy());
  }

  async function settleUntil(assertion: () => void): Promise<void> {
    await vi.waitFor(async () => {
      await fixture.whenStable();
      assertion();
    });
  }

  function showCurrency(currency: Currency): void {
    fixture.componentInstance['currency'].set(currency);
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideTestTranslations(), provideRouter([]), provideFixedClock('2026-11-15')],
    });
  });

  afterEach(async () => {
    await TestBed.inject(AppDb).delete();
  });

  it('should show the totals of the selected month and currency', async () => {
    await seed();
    await render();
    showCurrency(CURRENCY.USD);

    await settleUntil(() =>
      expect(texts('app-stat-card .stat-value')).toEqual(['$1,000.00', '$24.00', '$976.00']),
    );
    expect(texts('app-stat-card .stat-label')).toEqual([
      en.summary.income,
      en.summary.expenses,
      en.summary.balance,
    ]);
  });

  it('should link each category to its transactions in Activity', async () => {
    await seed();
    await render();
    showCurrency(CURRENCY.USD);

    await settleUntil(() => expect(element.querySelector('.category-bar')).toBeTruthy());
    const bar = element.querySelector<HTMLAnchorElement>('.category-bar')!;
    expect(bar.getAttribute('aria-label')).toBe('View transactions in Comida: $24.00');
    expect(bar.getAttribute('href')).toBe(`/transactions?currency=USD&category=${food}`);
    expect(element.querySelector('.view-all')!.getAttribute('href')).toBe(
      '/transactions?currency=USD',
    );
  });

  it('should list the recent transactions with their sign', async () => {
    await seed();
    await render();
    showCurrency(CURRENCY.USD);

    await settleUntil(() =>
      expect(
        Array.from(element.querySelectorAll('.recent-row')).map((row) =>
          Array.from(row.querySelectorAll('p, .amount'))
            .map((part) => part.textContent?.trim())
            .join(' '),
        ),
      ).toEqual(['Comida Nov 5 · Comida − $24.00', 'Freelance Nov 1 · Sueldo + $1,000.00']),
    );
  });

  it('should invite to add the first transaction when the currency has none this month', async () => {
    await seed();
    await render();

    await settleUntil(() => expect(element.textContent).toContain(en.summary.emptyTitle));
    expect(texts('app-stat-card .stat-value')).toEqual(['ARS 0.00', 'ARS 0.00', 'ARS 0.00']);
  });

  it(
    'should have no accessibility problems with data and when empty',
    async () => {
      await seed();
      await render();
      await settleUntil(() => expect(element.querySelector('.empty-state')).toBeTruthy());
      await expectNoAxeViolations(element);

      showCurrency(CURRENCY.USD);
      await settleUntil(() => expect(element.querySelector('.recent-row')).toBeTruthy());
      await expectNoAxeViolations(element);
    },
    AXE_TEST_TIMEOUT_MS,
  );
});
