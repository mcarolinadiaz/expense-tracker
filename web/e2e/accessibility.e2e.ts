import en from '../src/app/core/i18n/en.json';
import {
  expect,
  expectAccessible,
  expectNoSidewaysScroll,
  importBackup,
  openPage,
  test,
} from './fixtures';

const PAGES = [
  { path: '/', title: en.pages.overview },
  { path: '/transactions', title: en.pages.activity },
  { path: '/categories', title: en.pages.categories },
  { path: '/projections', title: en.pages.projections },
  { path: '/data', title: en.pages.data },
] as const;

for (const { path, title } of PAGES) {
  test.describe(title, () => {
    test('meets WCAG AA and fits the screen when empty', async ({ page }) => {
      await openPage(page, path, title);
      await expect(page.locator('app-spinner')).toHaveCount(0);

      await expectAccessible(page);
      await expectNoSidewaysScroll(page);
    });

    test('meets WCAG AA and fits the screen with data', async ({ page }) => {
      await importBackup(page);
      await openPage(page, path, title);
      await expect(page.locator('app-spinner')).toHaveCount(0);

      await expectAccessible(page);
      await expectNoSidewaysScroll(page);
    });
  });
}

test('the transaction panel meets WCAG AA, also showing errors', async ({ page }) => {
  await openPage(page, '/transactions', en.pages.activity);
  await page.getByRole('button', { name: en.actions.addTransaction }).first().click();
  const panel = page.getByRole('dialog', { name: en.transaction.addTitle });
  await expect(panel).toBeVisible();
  await expectAccessible(page);

  await panel.getByRole('button', { name: en.actions.save, exact: true }).click();
  await expect(panel.getByText(en.transaction.amountError)).toBeVisible();
  await expectAccessible(page);
});

test('the fixed cost panel meets WCAG AA', async ({ page }) => {
  await openPage(page, '/projections', en.pages.projections);
  await page.getByRole('button', { name: en.actions.addFixedCost }).first().click();
  await expect(page.getByRole('dialog', { name: en.actions.addFixedCost })).toBeVisible();

  await expectAccessible(page);
});

test('the menu on narrow screens meets WCAG AA', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'The side bar is always visible on desktop.');
  await openPage(page, '/', en.pages.overview);
  await page.getByRole('button', { name: en.openMenu }).click();
  await expect(page.getByRole('dialog')).toBeVisible();

  await expectAccessible(page);
});
