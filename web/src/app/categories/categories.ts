import { LiveAnnouncer } from '@angular/cdk/a11y';
import {
  afterNextRender,
  Component,
  computed,
  ElementRef,
  inject,
  Injector,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  FieldTree,
  form,
  FormField,
  maxLength,
  SchemaPathTree,
  submit,
  TreeValidationResult,
} from '@angular/forms/signals';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { APP_PAGE_PATH } from '../core/constants/app-page-routes';
import { TextKey } from '../core/i18n/translations';
import { Translator } from '../core/i18n/translator.service';
import { NavbarActions } from '../layout/navbar/navbar-actions';
import { AddButton } from '../shared/add-button/add-button';
import { TextPipe } from '../shared/pipes/text.pipe';
import { ACTIVITY_QUERY_PARAM } from '../transactions/transactions';
import {
  Category,
  CATEGORY_ERROR,
  CATEGORY_NAME_MAX_LENGTH,
  CategoryError,
  CategoryErrorCode,
} from './category';
import { categoryErrorText } from './category-error-text';
import { CategoryService } from './category.service';

export const CATEGORIES_IDS = {
  newName: 'category-new-name',
  newNameError: 'category-new-name-error',
  rename: 'category-rename',
  renameError: 'category-rename-error',
  renameButton: (id: number) => `category-rename-button-${id}`,
} as const;

interface CategoryNameModel {
  name: string;
}

interface CategoryRow {
  category: Category;
  uses: string;
}

function categoryNameSchema(path: SchemaPathTree<CategoryNameModel>): void {
  maxLength(path.name, CATEGORY_NAME_MAX_LENGTH, { error: { kind: CATEGORY_ERROR.tooLong } });
}

@Component({
  imports: [AddButton, FormField, NavbarActions, TextPipe],
  selector: 'app-categories',
  styleUrl: './categories.css',
  templateUrl: './categories.html',
})
export class Categories {
  private readonly categoryService = inject(CategoryService);
  private readonly announcer = inject(LiveAnnouncer);
  private readonly translator = inject(Translator);
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly ids = CATEGORIES_IDS;

  private readonly categories = toSignal(this.categoryService.list());
  private readonly usage = toSignal(this.categoryService.usage(), {
    initialValue: new Map<number, number>(),
  });
  protected readonly rows = computed((): CategoryRow[] =>
    (this.categories() ?? []).map((category) => ({
      category,
      uses: this.usesText(this.usage().get(category.id) ?? 0),
    })),
  );
  protected readonly isEmpty = computed(() => this.categories()?.length === 0);

  protected readonly newModel = signal<CategoryNameModel>({ name: '' });
  protected readonly newForm = form(this.newModel, categoryNameSchema);
  protected readonly newError = computed(() => this.errorCode(this.newForm.name));

  protected readonly editingId = signal<number | null>(null);
  protected readonly renameModel = signal<CategoryNameModel>({ name: '' });
  protected readonly renameForm = form(this.renameModel, categoryNameSchema);
  protected readonly renameError = computed(() => this.errorCode(this.renameForm.name));

  protected readonly conflictId = signal<number | null>(null);

  protected focusNewCategory(): void {
    this.newForm.name().focusBoundControl();
  }

  protected async create(event: Event): Promise<void> {
    event.preventDefault();
    await submit(this.newForm, async () => {
      try {
        await firstValueFrom(this.categoryService.add(this.newModel().name));
      } catch (error) {
        return this.asFieldError(error, this.newForm.name);
      }
      this.newForm().reset({ name: '' });
      void this.announcer.announce(this.translator.translate('categories.created'));
      return undefined;
    });
  }

  protected startRename(category: Category): void {
    this.conflictId.set(null);
    this.renameForm().reset({ name: category.name });
    this.editingId.set(category.id);
    afterNextRender(() => this.renameForm.name().focusBoundControl(), {
      injector: this.injector,
    });
  }

  protected async saveRename(event: Event, id: number): Promise<void> {
    event.preventDefault();
    await submit(this.renameForm, async () => {
      try {
        await firstValueFrom(this.categoryService.rename(id, this.renameModel().name));
      } catch (error) {
        return this.asFieldError(error, this.renameForm.name);
      }
      this.stopRename(id);
      void this.announcer.announce(this.translator.translate('categories.renamed'));
      return undefined;
    });
  }

  /** Closes the rename field and gives the focus back to the row's Rename button. */
  protected stopRename(id: number): void {
    this.editingId.set(null);
    afterNextRender(
      () =>
        this.host.nativeElement
          .querySelector<HTMLButtonElement>(`#${CATEGORIES_IDS.renameButton(id)}`)
          ?.focus(),
      { injector: this.injector },
    );
  }

  /** Deletes an unused category, or explains that it still has transactions. */
  protected async remove(id: number): Promise<void> {
    try {
      await firstValueFrom(this.categoryService.remove(id));
    } catch (error) {
      if (error instanceof CategoryError && error.code === CATEGORY_ERROR.inUse) {
        this.conflictId.set(id);
        return;
      }
      throw error;
    }
    this.conflictId.set(null);
    void this.announcer.announce(this.translator.translate('categories.deleted'));
  }

  protected viewTransactions(id: number): void {
    void this.router.navigate([`/${APP_PAGE_PATH.transactions}`], {
      queryParams: { [ACTIVITY_QUERY_PARAM.category]: id },
    });
  }

  /** The accessible name of a row's buttons, such as "Rename: Comida". */
  protected rowLabel(action: TextKey, category: Category): string {
    return `${this.translator.translate(action)}: ${category.name}`;
  }

  protected categoryErrorText(code: CategoryErrorCode): string {
    return categoryErrorText(this.translator, code);
  }

  private usesText(count: number): string {
    return count === 0
      ? this.translator.translate('categories.noUses')
      : this.translator.plural('categories.uses', count);
  }

  private errorCode(field: FieldTree<string>): CategoryErrorCode | undefined {
    return field().touched()
      ? (field().errors()[0]?.kind as CategoryErrorCode | undefined)
      : undefined;
  }

  private asFieldError(error: unknown, field: FieldTree<string>): TreeValidationResult {
    if (error instanceof CategoryError) {
      return { kind: error.code, fieldTree: field };
    }
    throw error;
  }
}
