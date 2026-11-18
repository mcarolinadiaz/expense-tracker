import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { CategoryService } from '../categories/category.service';
import { provideFixedClock } from '../core/clock.testing';
import { AppDb } from '../core/db/app-db';
import { CURRENCY } from '../core/money';
import { INCREASE_RULE } from '../projections/fixed-cost';
import { FixedCostService } from '../projections/fixed-cost.service';
import { TRANSACTION_TYPE } from '../transactions/transaction';
import { TransactionService } from '../transactions/transaction.service';
import {
  BACKUP_ERROR,
  BACKUP_FILE_TYPE,
  BACKUP_MAX_BYTES,
  BackupError,
  writeBackup,
} from './backup';
import { BackupService } from './backup.service';

describe('BackupService', () => {
  let service: BackupService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideFixedClock('2026-11-18')] });
    service = TestBed.inject(BackupService);
  });

  afterEach(async () => {
    await TestBed.inject(AppDb).delete();
  });

  async function seed(): Promise<void> {
    const food = await firstValueFrom(TestBed.inject(CategoryService).add('Comida'));
    await firstValueFrom(
      TestBed.inject(TransactionService).add({
        date: '2026-11-06',
        type: TRANSACTION_TYPE.expense,
        currency: CURRENCY.ARS,
        amount: 125050,
        categoryId: food,
        description: 'Taxi',
      }),
    );
    await firstValueFrom(
      TestBed.inject(FixedCostService).add({
        name: 'Alquiler',
        currency: CURRENCY.ARS,
        amount: 62000000,
        every: 4,
        lastIncrease: '2026-08',
        increase: { rule: INCREASE_RULE.ipc },
      }),
    );
  }

  function file(text: string): File {
    return new File([text], 'backup.json', { type: BACKUP_FILE_TYPE });
  }

  it('should export everything and remember the day', async () => {
    await seed();
    expect(await firstValueFrom(service.lastBackup())).toBeNull();

    const backup = await firstValueFrom(service.export());

    expect(backup.exportedOn).toBe('2026-11-18');
    expect(backup.categories).toHaveLength(1);
    expect(backup.transactions).toHaveLength(1);
    expect(backup.fixedCosts).toHaveLength(1);
    expect(await firstValueFrom(service.lastBackup())).toBe('2026-11-18');
  });

  it('should replace the data with an exported backup, keeping the links between records', async () => {
    await seed();
    const backup = await firstValueFrom(service.export());
    await firstValueFrom(TestBed.inject(CategoryService).add('Viajes'));

    await firstValueFrom(service.import(file(writeBackup(backup))));

    const db = TestBed.inject(AppDb);
    expect(await db.categories.toArray()).toEqual(backup.categories);
    expect(await db.transactions.toArray()).toEqual(backup.transactions);
    expect(await db.fixedCosts.toArray()).toEqual(backup.fixedCosts);
  });

  it('should change nothing when the file is not a valid backup', async () => {
    await seed();

    await expect(firstValueFrom(service.import(file('{"format":"other"}')))).rejects.toEqual(
      new BackupError(BACKUP_ERROR.invalid),
    );

    expect(await firstValueFrom(service.counts())).toEqual({
      transactions: 1,
      categories: 1,
      fixedCosts: 1,
    });
  });

  it('should not read a file that is too large', async () => {
    const large = file('');
    Object.defineProperty(large, 'size', { value: BACKUP_MAX_BYTES + 1 });

    await expect(firstValueFrom(service.import(large))).rejects.toEqual(
      new BackupError(BACKUP_ERROR.tooLarge),
    );
  });

  it('should delete all data and the last backup day', async () => {
    await seed();
    await firstValueFrom(service.export());

    await firstValueFrom(service.wipe());

    expect(await firstValueFrom(service.counts())).toEqual({
      transactions: 0,
      categories: 0,
      fixedCosts: 0,
    });
    expect(await firstValueFrom(service.lastBackup())).toBeNull();
  });
});
