import { Injectable } from '@angular/core';
import { Dexie, EntityTable } from 'dexie';
import { Category } from '../api/category';
import { Transaction } from '../api/transaction';

const DB_NAME = 'expense-tracker';

/**
 * The IndexedDB database that holds all user data on this device.
 *
 * To change the schema, add a new `this.version(n + 1)` with the new stores, never edit an existing
 * version, because devices that already have data upgrade from it.
 */
@Injectable({ providedIn: 'root' })
export class AppDb extends Dexie {
  readonly transactions!: EntityTable<Transaction, 'id'>;
  readonly categories!: EntityTable<Category, 'id'>;

  constructor() {
    super(DB_NAME);

    // Only the first key and the listed indexes are declared. Other fields are stored but not indexed.
    this.version(1).stores({
      transactions: '++id, date, categoryId',
      categories: '++id, name',
    });
  }
}
