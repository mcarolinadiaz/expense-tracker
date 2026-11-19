import { Service } from '@angular/core';
import { Dexie, EntityTable } from 'dexie';
import { Category } from '../../categories/category';
import { FixedCost } from '../../projections/fixed-cost';
import { Transaction } from '../../transactions/transaction';

const DB_NAME = 'expense-tracker';

/** The keys of the device settings stored in `settings`. */
export const SETTING_KEY = {
  lastBackup: 'lastBackup',
  language: 'language',
} as const;

export type SettingKey = (typeof SETTING_KEY)[keyof typeof SETTING_KEY];

/** A setting of this device, such as the day of the last backup. It's never part of a backup. */
export interface Setting {
  key: SettingKey;
  value: string;
}

/**
 * The IndexedDB database that holds all user data on this device.
 *
 * To change the schema, add a new `this.version(n + 1)` with the new stores, never edit an existing
 * version, because devices that already have data upgrade from it.
 */
@Service()
export class AppDb extends Dexie {
  readonly transactions!: EntityTable<Transaction, 'id'>;
  readonly categories!: EntityTable<Category, 'id'>;
  readonly fixedCosts!: EntityTable<FixedCost, 'id'>;
  readonly settings!: EntityTable<Setting, 'key'>;

  constructor() {
    super(DB_NAME);

    this.version(1).stores({
      transactions: '++id, date, categoryId',
      categories: '++id, name',
    });

    this.version(2).stores({
      fixedCosts: '++id, currency',
    });

    this.version(3).stores({
      settings: '&key',
    });
  }
}
