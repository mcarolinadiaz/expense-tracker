import { TestBed } from '@angular/core/testing';
import { filter, firstValueFrom } from 'rxjs';
import { CATEGORY_ERROR, CATEGORY_NAME_MAX_LENGTH, CategoryError } from './category';
import { CURRENCY } from '../core/money';
import { TRANSACTION_TYPE } from '../transactions/transaction';
import { AppDb } from '../core/db/app-db';
import { CategoryService } from './category.service';
import { TransactionService } from '../transactions/transaction.service';

describe('CategoryService', () => {
  let service: CategoryService;

  beforeEach(() => {
    service = TestBed.inject(CategoryService);
  });

  afterEach(async () => {
    await TestBed.inject(AppDb).delete();
  });

  async function addExpense(categoryId: number): Promise<void> {
    await firstValueFrom(
      TestBed.inject(TransactionService).add({
        date: '2026-11-06',
        type: TRANSACTION_TYPE.expense,
        currency: CURRENCY.ARS,
        amount: 5000000,
        categoryId,
        description: '',
      }),
    );
  }

  async function errorCode(action: Promise<unknown>): Promise<string> {
    const error = await action.then(
      () => null,
      (e: unknown) => e,
    );
    expect(error).toBeInstanceOf(CategoryError);
    return (error as CategoryError).code;
  }

  it('should list categories sorted by name, without extra spaces', async () => {
    await firstValueFrom(service.add('Transporte'));
    await firstValueFrom(service.add('  Comida  '));

    const names = (await firstValueFrom(service.list())).map((category) => category.name);

    expect(names).toEqual(['Comida', 'Transporte']);
  });

  it('should emit again when the categories change', async () => {
    const updated = firstValueFrom(
      service.list().pipe(filter((categories) => categories.length === 1)),
    );

    await firstValueFrom(service.add('Comida'));

    expect((await updated)[0].name).toBe('Comida');
  });

  it('should reject a name that another category already uses, ignoring case', async () => {
    await firstValueFrom(service.add('Comida'));

    expect(await errorCode(firstValueFrom(service.add('comida')))).toBe(CATEGORY_ERROR.taken);
  });

  it.each([
    ['empty', '   ', CATEGORY_ERROR.required],
    ['too long', 'a'.repeat(CATEGORY_NAME_MAX_LENGTH + 1), CATEGORY_ERROR.tooLong],
  ])('should reject an %s name', async (_, name, code) => {
    expect(await errorCode(firstValueFrom(service.add(name)))).toBe(code);
  });

  it('should rename a category, even when only the case changes', async () => {
    const id = await firstValueFrom(service.add('comida'));

    await firstValueFrom(service.rename(id, 'Comida'));

    expect((await firstValueFrom(service.list()))[0].name).toBe('Comida');
  });

  it('should count the transactions of each category', async () => {
    const food = await firstValueFrom(service.add('Comida'));
    await addExpense(food);
    await addExpense(food);

    const usage = await firstValueFrom(service.usage());

    expect(usage.get(food)).toBe(2);
  });

  it('should not delete a category that transactions still use', async () => {
    const food = await firstValueFrom(service.add('Comida'));
    await addExpense(food);

    expect(await errorCode(firstValueFrom(service.remove(food)))).toBe(CATEGORY_ERROR.inUse);
    expect(await firstValueFrom(service.list())).toHaveLength(1);
  });

  it('should delete an unused category', async () => {
    const food = await firstValueFrom(service.add('Comida'));

    await firstValueFrom(service.remove(food));

    expect(await firstValueFrom(service.list())).toEqual([]);
  });
});
