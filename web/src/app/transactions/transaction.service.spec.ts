import { TestBed } from '@angular/core/testing';
import { filter, firstValueFrom } from 'rxjs';
import { CURRENCY } from '../core/money';
import { NewTransaction, TRANSACTION_TYPE } from './transaction';
import { AppDb } from '../core/db/app-db';
import { TransactionService } from './transaction.service';

function expense(date: string, description: string): NewTransaction {
  return {
    date,
    type: TRANSACTION_TYPE.expense,
    currency: CURRENCY.ARS,
    amount: 125050,
    categoryId: 1,
    description,
  };
}

describe('TransactionService', () => {
  let service: TransactionService;

  beforeEach(() => {
    service = TestBed.inject(TransactionService);
  });

  afterEach(async () => {
    await TestBed.inject(AppDb).delete();
  });

  it('should list only the transactions of the month, newest first', async () => {
    for (const transaction of [
      expense('2026-10-31', 'October'),
      expense('2026-11-01', 'First'),
      expense('2026-11-30', 'Last'),
      expense('2026-12-01', 'December'),
    ]) {
      await firstValueFrom(service.add(transaction));
    }

    const descriptions = (await firstValueFrom(service.listMonth('2026-11'))).map(
      (t) => t.description,
    );

    expect(descriptions).toEqual(['Last', 'First']);
  });

  it('should keep the amount in cents', async () => {
    await firstValueFrom(service.add(expense('2026-11-06', 'Taxi')));

    expect((await firstValueFrom(service.listMonth('2026-11')))[0].amount).toBe(125050);
  });

  it('should emit again when a transaction is added', async () => {
    const updated = firstValueFrom(
      service.listMonth('2026-11').pipe(filter((list) => list.length === 1)),
    );

    await firstValueFrom(service.add(expense('2026-11-06', 'Taxi')));

    expect((await updated)[0].description).toBe('Taxi');
  });

  it('should update and delete a transaction', async () => {
    const id = await firstValueFrom(service.add(expense('2026-11-06', 'Taxi')));
    const [saved] = await firstValueFrom(service.listMonth('2026-11'));

    await firstValueFrom(service.update({ ...saved, description: 'Remis' }));
    expect((await firstValueFrom(service.listMonth('2026-11')))[0].description).toBe('Remis');

    await firstValueFrom(service.remove(id));
    expect(await firstValueFrom(service.listMonth('2026-11'))).toEqual([]);
  });
});
