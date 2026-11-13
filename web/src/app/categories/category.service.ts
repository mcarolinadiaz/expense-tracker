import { inject, Service } from '@angular/core';
import { liveQuery } from 'dexie';
import { from, Observable } from 'rxjs';
import { Category, CATEGORY_ERROR, CATEGORY_NAME_MAX_LENGTH, CategoryError } from './category';
import { AppDb } from '../core/db/app-db';

@Service()
export class CategoryService {
  private readonly db = inject(AppDb);

  /** All categories sorted by name. It emits again whenever they change. */
  list(): Observable<Category[]> {
    return from(
      liveQuery(async () => {
        const categories = await this.db.categories.toArray();
        return categories.sort((a, b) => a.name.localeCompare(b.name));
      }),
    );
  }

  /** How many transactions use each category, by category id. It emits again whenever they change. */
  usage(): Observable<Map<number, number>> {
    return from(
      liveQuery(async () => {
        const ids = await this.db.transactions.orderBy('categoryId').keys();
        const usage = new Map<number, number>();
        for (const id of ids as number[]) {
          usage.set(id, (usage.get(id) ?? 0) + 1);
        }
        return usage;
      }),
    );
  }

  add(name: string): Observable<number> {
    return from(
      this.db.transaction('rw', this.db.categories, async () => {
        const valid = await this.validName(name);
        return this.db.categories.add({ name: valid });
      }),
    );
  }

  rename(id: number, name: string): Observable<void> {
    return from(
      this.db.transaction('rw', this.db.categories, async () => {
        const valid = await this.validName(name, id);
        await this.db.categories.update(id, { name: valid });
      }),
    );
  }

  /** Deletes a category. It fails with `inUse` while transactions still use it. */
  remove(id: number): Observable<void> {
    return from(
      this.db.transaction('rw', this.db.categories, this.db.transactions, async () => {
        if ((await this.db.transactions.where('categoryId').equals(id).count()) > 0) {
          throw new CategoryError(CATEGORY_ERROR.inUse);
        }
        await this.db.categories.delete(id);
      }),
    );
  }

  /** The trimmed name, if it isn't empty, too long or already used by another category, ignoring case. */
  private async validName(name: string, exceptId?: number): Promise<string> {
    const trimmed = name.trim();

    if (!trimmed) {
      throw new CategoryError(CATEGORY_ERROR.required);
    }
    if (trimmed.length > CATEGORY_NAME_MAX_LENGTH) {
      throw new CategoryError(CATEGORY_ERROR.tooLong);
    }

    const taken = await this.db.categories
      .filter(
        (category) =>
          category.id !== exceptId &&
          category.name.toLocaleLowerCase() === trimmed.toLocaleLowerCase(),
      )
      .count();
    if (taken > 0) {
      throw new CategoryError(CATEGORY_ERROR.taken);
    }

    return trimmed;
  }
}
