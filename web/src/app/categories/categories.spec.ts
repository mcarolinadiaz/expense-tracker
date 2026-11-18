import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AXE_TEST_TIMEOUT_MS, expectNoAxeViolations } from '../core/axe.testing';
import { APP_TEXT } from '../core/constants/app-text';
import { AppDb } from '../core/db/app-db';
import { CURRENCY } from '../core/money';
import { TRANSACTION_TYPE } from '../transactions/transaction';
import { TransactionService } from '../transactions/transaction.service';
import { Categories, CATEGORIES_IDS } from './categories';
import { CATEGORY_ERROR, CATEGORY_NAME_MAX_LENGTH } from './category';
import { CategoryService } from './category.service';

const SETTLE_ROUNDS = 4;

describe('Categories', () => {
  let fixture: ComponentFixture<Categories>;
  let element: HTMLElement;

  async function seed(): Promise<{ food: number; salary: number }> {
    const categories = TestBed.inject(CategoryService);
    const food = await firstValueFrom(categories.add('Comida'));
    const salary = await firstValueFrom(categories.add('Sueldo'));
    for (const date of ['2026-11-01', '2026-11-06']) {
      await firstValueFrom(
        TestBed.inject(TransactionService).add({
          date,
          type: TRANSACTION_TYPE.expense,
          currency: CURRENCY.ARS,
          amount: 5000000,
          categoryId: food,
          description: '',
        }),
      );
    }
    return { food, salary };
  }

  async function render(): Promise<void> {
    fixture = TestBed.createComponent(Categories);
    element = fixture.nativeElement;
    await settle();
  }

  async function settleUntil(assertion: () => void): Promise<void> {
    await vi.waitFor(async () => {
      await fixture.whenStable();
      assertion();
    });
  }

  async function settle(): Promise<void> {
    for (let round = 0; round < SETTLE_ROUNDS; round++) {
      await new Promise((resolve) => setTimeout(resolve));
      await fixture.whenStable();
    }
  }

  function rowTexts(): string[] {
    return Array.from(element.querySelectorAll('.category-item')).map((row) =>
      Array.from(row.querySelectorAll('p'))
        .map((paragraph) => paragraph.textContent?.trim())
        .join(' '),
    );
  }

  function button(label: string): HTMLButtonElement {
    return element.querySelector<HTMLButtonElement>(`[aria-label="${label}"]`)!;
  }

  function type(id: string, value: string): void {
    const input = element.querySelector<HTMLInputElement>(`#${id}`)!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
  }

  function submitForm(id: string): void {
    element
      .querySelector<HTMLInputElement>(`#${id}`)!
      .closest('form')!
      .dispatchEvent(new Event('submit', { cancelable: true }));
  }

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
  });

  afterEach(async () => {
    await TestBed.inject(AppDb).delete();
  });

  it('should list the categories by name with how many transactions use each', async () => {
    await seed();
    await render();

    expect(rowTexts()).toEqual(['Comida 2 transactions', 'Sueldo No transactions']);
  });

  it('should create a category and clear the field', async () => {
    await render();

    type(CATEGORIES_IDS.newName, '  Viajes ');
    submitForm(CATEGORIES_IDS.newName);

    await settleUntil(() => expect(rowTexts()).toEqual(['Viajes No transactions']));
    expect(element.querySelector<HTMLInputElement>(`#${CATEGORIES_IDS.newName}`)!.value).toBe('');
  });

  it('should show the error of a name already in use', async () => {
    await seed();
    await render();

    type(CATEGORIES_IDS.newName, 'comida');
    submitForm(CATEGORIES_IDS.newName);

    await settleUntil(() =>
      expect(element.querySelector(`#${CATEGORIES_IDS.newNameError}`)?.textContent?.trim()).toBe(
        APP_TEXT.categoryErrors[CATEGORY_ERROR.taken],
      ),
    );
    expect(rowTexts()).toHaveLength(2);
  });

  it('should limit the name to the maximum length', async () => {
    await render();

    expect(element.querySelector<HTMLInputElement>(`#${CATEGORIES_IDS.newName}`)!.maxLength).toBe(
      CATEGORY_NAME_MAX_LENGTH,
    );
  });

  it('should rename a category in its row', async () => {
    await seed();
    await render();

    button(`${APP_TEXT.categories.rename}: Sueldo`).click();
    await settle();
    expect(document.activeElement?.id).toBe(CATEGORIES_IDS.rename);

    type(CATEGORIES_IDS.rename, 'Salario');
    submitForm(CATEGORIES_IDS.rename);

    await settleUntil(() => {
      expect(rowTexts()).toEqual(['Comida 2 transactions', 'Salario No transactions']);
      expect(document.activeElement?.getAttribute('aria-label')).toBe(
        `${APP_TEXT.categories.rename}: Salario`,
      );
    });
  });

  it('should keep the name when renaming is cancelled', async () => {
    await seed();
    await render();

    button(`${APP_TEXT.categories.rename}: Sueldo`).click();
    await settle();
    type(CATEGORIES_IDS.rename, 'Salario');
    element
      .querySelector(`#${CATEGORIES_IDS.rename}`)!
      .dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await settle();

    expect(rowTexts()).toEqual(['Comida 2 transactions', 'Sueldo No transactions']);
  });

  it('should delete a category without transactions', async () => {
    await seed();
    await render();

    button(`${APP_TEXT.actions.delete}: Sueldo`).click();

    await settleUntil(() => expect(rowTexts()).toEqual(['Comida 2 transactions']));
  });

  it('should keep a category in use and offer to see its transactions', async () => {
    const { food } = await seed();
    await render();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    button(`${APP_TEXT.actions.delete}: Comida`).click();

    await settleUntil(() => expect(element.querySelector('[role="alert"]')).toBeTruthy());
    expect(rowTexts()).toHaveLength(2);
    const conflict = element.querySelector('[role="alert"]')!;
    expect(conflict.textContent).toContain(APP_TEXT.categoryErrors[CATEGORY_ERROR.inUse]);

    conflict.querySelector('button')!.click();
    expect(navigate).toHaveBeenCalledWith(['/transactions'], {
      queryParams: { category: food },
    });
  });

  it('should explain that there are no categories yet', async () => {
    await render();

    expect(element.textContent).toContain(APP_TEXT.categories.emptyTitle);
  });

  it(
    'should have no accessibility problems in the list, while renaming, and with errors',
    async () => {
      await seed();
      await render();
      await expectNoAxeViolations(element);

      button(`${APP_TEXT.actions.delete}: Comida`).click();
      await settleUntil(() => expect(element.querySelector('.category-conflict')).toBeTruthy());
      await expectNoAxeViolations(element);

      button(`${APP_TEXT.categories.rename}: Sueldo`).click();
      await settle();
      type(CATEGORIES_IDS.rename, 'Comida');
      submitForm(CATEGORIES_IDS.rename);
      await settleUntil(() =>
        expect(element.querySelector(`#${CATEGORIES_IDS.renameError}`)).toBeTruthy(),
      );
      await expectNoAxeViolations(element);
    },
    AXE_TEST_TIMEOUT_MS,
  );

  it(
    'should have no accessibility problems when empty',
    async () => {
      await render();
      await expectNoAxeViolations(element);
    },
    AXE_TEST_TIMEOUT_MS,
  );
});
