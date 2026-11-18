import { TestBed } from '@angular/core/testing';
import { filter, firstValueFrom } from 'rxjs';
import { CategoryService } from '../categories/category.service';
import { AppDb } from '../core/db/app-db';
import { CURRENCY, Currency } from '../core/money';
import { NewTransaction, TRANSACTION_TYPE } from '../transactions/transaction';
import { TransactionService } from '../transactions/transaction.service';
import { MonthlySummary } from './summary';
import { RECENT_TRANSACTIONS, SummaryService } from './summary.service';

describe('SummaryService', () => {
  let service: SummaryService;

  async function addCategory(name: string): Promise<number> {
    return firstValueFrom(TestBed.inject(CategoryService).add(name));
  }

  async function add(
    transaction: Partial<NewTransaction> & Pick<NewTransaction, 'amount' | 'categoryId'>,
  ) {
    await firstValueFrom(
      TestBed.inject(TransactionService).add({
        date: '2026-11-06',
        type: TRANSACTION_TYPE.expense,
        currency: CURRENCY.ARS,
        description: '',
        ...transaction,
      }),
    );
  }

  function summary(currency: Currency): Promise<MonthlySummary> {
    return firstValueFrom(service.getSummary('2026-11', currency));
  }

  beforeEach(() => {
    service = TestBed.inject(SummaryService);
  });

  afterEach(async () => {
    await TestBed.inject(AppDb).delete();
  });

  it('should add up income, expenses and balance in cents for one currency only', async () => {
    const salary = await addCategory('Sueldo');
    const food = await addCategory('Comida');
    await add({ type: TRANSACTION_TYPE.income, amount: 100010, categoryId: salary });
    await add({ amount: 20005, categoryId: food });
    await add({ amount: 10, categoryId: food });
    await add({ currency: CURRENCY.USD, amount: 999900, categoryId: food });
    await add({ date: '2026-10-31', amount: 50000, categoryId: food });

    const ars = await summary(CURRENCY.ARS);

    expect([ars.income, ars.expense, ars.balance]).toEqual([100010, 20015, 79995]);
    expect(ars.isEmpty).toBe(false);
  });

  it('should give a negative balance when expenses are larger', async () => {
    const food = await addCategory('Comida');
    await add({ amount: 5000, categoryId: food });

    expect((await summary(CURRENCY.ARS)).balance).toBe(-5000);
  });

  it('should list expenses by category, largest first, with their share of the largest', async () => {
    const rent = await addCategory('Alquiler');
    const food = await addCategory('Comida');
    const salary = await addCategory('Sueldo');
    await add({ amount: 25000, categoryId: food });
    await add({ amount: 100000, categoryId: rent });
    await add({ amount: 25000, categoryId: food });
    await add({ type: TRANSACTION_TYPE.income, amount: 900000, categoryId: salary });

    expect((await summary(CURRENCY.ARS)).byCategory).toEqual([
      { categoryId: rent, name: 'Alquiler', total: 100000, share: 100 },
      { categoryId: food, name: 'Comida', total: 50000, share: 50 },
    ]);
  });

  it(`should list the ${RECENT_TRANSACTIONS} latest transactions with their category`, async () => {
    const food = await addCategory('Comida');
    for (let day = 1; day <= RECENT_TRANSACTIONS + 2; day++) {
      await add({ date: `2026-11-0${day}`, amount: day, categoryId: food });
    }

    const recent = (await summary(CURRENCY.ARS)).recent;

    expect(recent.map(({ transaction }) => transaction.date)).toEqual([
      '2026-11-07',
      '2026-11-06',
      '2026-11-05',
      '2026-11-04',
      '2026-11-03',
    ]);
    expect(recent[0].category).toBe('Comida');
  });

  it('should be empty when the month has no transactions in that currency', async () => {
    const food = await addCategory('Comida');
    await add({ amount: 5000, categoryId: food });

    const usd = await summary(CURRENCY.USD);

    expect(usd).toMatchObject({ income: 0, expense: 0, balance: 0, byCategory: [], recent: [] });
    expect(usd.isEmpty).toBe(true);
  });

  it('should emit again when a transaction is added', async () => {
    const food = await addCategory('Comida');
    const updated = firstValueFrom(
      service.getSummary('2026-11', CURRENCY.ARS).pipe(filter(({ expense }) => expense > 0)),
    );

    await add({ amount: 5000, categoryId: food });

    expect((await updated).expense).toBe(5000);
  });
});
