import { readFile } from 'node:fs/promises';
import en from '../src/app/core/i18n/en.json';
import es from '../src/app/core/i18n/es.json';
import { expect, importBackup, openPage, SAMPLE_BACKUP, test } from './fixtures';

test('an expense added in Activity shows up in the Overview totals', async ({ page }) => {
  await openPage(page, '/transactions', en.pages.activity);
  await page.getByRole('button', { name: en.actions.addTransaction }).first().click();
  const panel = page.getByRole('dialog', { name: en.transaction.addTitle });

  await panel.getByLabel(en.transaction.amount).fill('1,500');
  await panel.getByLabel(en.transaction.newCategoryName).fill('Food');
  await panel.getByLabel(en.transaction.descriptionOptional).fill('Groceries');
  await panel.getByRole('button', { name: en.actions.save, exact: true }).click();
  await expect(panel).toBeHidden();
  await expect(page.getByText('Groceries')).toBeVisible();

  await openPage(page, '/', en.pages.overview);
  await expect(page.getByText(/1,500\.00/).first()).toBeVisible();
  await expect(page.getByText('Food').first()).toBeVisible();
});

test('fixed costs are projected, and editing one updates the projection', async ({ page }) => {
  await importBackup(page);
  await openPage(page, '/projections', en.pages.projections);
  await expect(page.getByText(/1,025,000\.00/).first()).toBeVisible();

  await page.getByRole('button', { name: 'Edit Internet' }).first().click();
  const panel = page.getByRole('dialog', { name: en.fixedCost.editTitle });
  await expect(panel.getByLabel(en.fixedCost.name)).toHaveValue('Internet');

  await panel.getByLabel(en.fixedCost.currentAmount).fill('30,000');
  await panel.getByRole('button', { name: en.actions.save }).click();
  await expect(panel).toBeHidden();

  await expect(page.getByText(/1,030,000\.00/).first()).toBeVisible();
});

test('an exported backup brings everything back after deleting all data', async ({ page }) => {
  await importBackup(page);

  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: en.data.exportBackup }).click();
  const file = await (await download).path();
  const exported = JSON.parse(await readFile(file, 'utf8'));
  expect(exported.transactions).toHaveLength(SAMPLE_BACKUP.transactions.length);
  expect(exported.fixedCosts).toHaveLength(SAMPLE_BACKUP.fixedCosts.length);

  await page.getByRole('button', { name: en.data.deleteAll }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: en.data.deleteAll }).click();
  const transactionCount = page
    .locator('.data-count')
    .filter({ hasText: en.data.transactions })
    .locator('dd');
  await expect(transactionCount).toHaveText('0');

  await page.getByRole('button', { name: en.data.importBackup }).click();
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: en.data.chooseFile }).click();
  await (await chooser).setFiles(file);

  await expect(transactionCount).toHaveText(String(SAMPLE_BACKUP.transactions.length));
});

test('the chosen language changes the whole app and is kept after reloading', async ({
  page,
  isMobile,
}) => {
  await openPage(page, '/', en.pages.overview);
  if (isMobile) {
    await page.getByRole('button', { name: en.openMenu }).click();
  }
  await page.getByRole('button', { name: 'Español' }).click();
  if (isMobile) {
    await page.keyboard.press('Escape');
  }

  await expect(page.getByRole('heading', { level: 1, name: es.pages.overview })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'es-AR');

  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: es.pages.overview })).toBeVisible();
});
