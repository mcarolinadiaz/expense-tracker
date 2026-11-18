import { inject, Service } from '@angular/core';
import { liveQuery } from 'dexie';
import { from, Observable } from 'rxjs';
import { Clock } from '../core/clock.service';
import { IsoDate } from '../core/dates';
import { AppDb, SETTING_KEY } from '../core/db/app-db';
import {
  Backup,
  BACKUP_ERROR,
  BACKUP_FORMAT,
  BACKUP_MAX_BYTES,
  BACKUP_VERSION,
  BackupError,
  parseBackup,
} from './backup';

/** How many records of each kind the device holds. */
export interface DataCounts {
  transactions: number;
  categories: number;
  fixedCosts: number;
}

/** Exports, imports and deletes all the user data of this device. */
@Service()
export class BackupService {
  private readonly db = inject(AppDb);
  private readonly clock = inject(Clock);

  /** It emits again whenever the data changes. */
  counts(): Observable<DataCounts> {
    return from(
      liveQuery(async () => ({
        transactions: await this.db.transactions.count(),
        categories: await this.db.categories.count(),
        fixedCosts: await this.db.fixedCosts.count(),
      })),
    );
  }

  /** The day of the last export from this device, or `null` if there was none. */
  lastBackup(): Observable<IsoDate | null> {
    return from(
      liveQuery(async () => (await this.db.settings.get(SETTING_KEY.lastBackup))?.value ?? null),
    );
  }

  /** All the data, read at once, and remembers today as the day of the last backup. */
  export(): Observable<Backup> {
    const { categories, transactions, fixedCosts, settings } = this.db;
    return from(
      this.db.transaction('rw', categories, transactions, fixedCosts, settings, async () => {
        const today = this.clock.today();
        const backup: Backup = {
          format: BACKUP_FORMAT,
          version: BACKUP_VERSION,
          exportedOn: today,
          categories: await categories.toArray(),
          transactions: await transactions.toArray(),
          fixedCosts: await fixedCosts.toArray(),
        };
        await settings.put({ key: SETTING_KEY.lastBackup, value: today });
        return backup;
      }),
    );
  }

  /**
   * Replaces all the data with a backup file. It checks the whole file first and fails with a
   * `BackupError` if anything is wrong, so a bad file never leaves the data half replaced.
   */
  import(file: File): Observable<void> {
    return from(this.replaceWith(file));
  }

  /** Deletes all the data and settings of this device. */
  wipe(): Observable<void> {
    const { categories, transactions, fixedCosts, settings } = this.db;
    return from(
      this.db.transaction('rw', categories, transactions, fixedCosts, settings, async () => {
        await Promise.all([
          categories.clear(),
          transactions.clear(),
          fixedCosts.clear(),
          settings.clear(),
        ]);
      }),
    );
  }

  private async replaceWith(file: File): Promise<void> {
    if (file.size > BACKUP_MAX_BYTES) {
      throw new BackupError(BACKUP_ERROR.tooLarge);
    }
    const backup = parseBackup(await file.text());

    const { categories, transactions, fixedCosts } = this.db;
    await this.db.transaction('rw', categories, transactions, fixedCosts, async () => {
      await Promise.all([categories.clear(), transactions.clear(), fixedCosts.clear()]);
      await categories.bulkAdd(backup.categories);
      await transactions.bulkAdd(backup.transactions);
      await fixedCosts.bulkAdd(backup.fixedCosts);
    });
  }
}
