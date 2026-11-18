import { Service } from '@angular/core';
import { Dexie, EntityTable } from 'dexie';
import { Category } from '../../categories/category';
import { FixedCost } from '../../projections/fixed-cost';
import { Transaction } from '../../transactions/transaction';

const DB_NAME = 'expense-tracker';

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

  constructor() {
    super(DB_NAME);

    this.version(1).stores({
      transactions: '++id, date, categoryId',
      categories: '++id, name',
    });

    this.version(2).stores({
      fixedCosts: '++id, currency',
    });
  }
}
