import AxeBuilder from '@axe-core/playwright';
import { expect, Page, test as base } from '@playwright/test';
import { monthsBetween, shiftMonth, YearMonth } from '../src/app/core/dates';
import en from '../src/app/core/i18n/en.json';

/** The moment every test runs at, so months, projections and totals never change. */
export const NOW = new Date('2026-11-18T12:00:00-03:00');

/** The WCAG levels every page must meet. */
const WCAG_AA_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

/** The fake IPC API: 2% a month, with official data up to September 2026. */
const FAKE_IPC = {
  lastOfficialMonth: '2026-09',
  monthlyEstimate: '2.00',
  source: 'INDEC',
  factorScale: 10_000,
  monthlyRateInScale: 200,
  factorDecimals: 4,
} as const;

const CORS_HEADERS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': '*',
};

const HTTP_NO_CONTENT = 204;

/** The ids of the sample backup, so tests can point at its records. */
export const SAMPLE_CATEGORY = { home: 1, food: 2, salary: 3 } as const;

/** A valid backup with one month of transactions and two fixed costs, imported to start with data. */
export const SAMPLE_BACKUP = {
  format: 'expense-tracker-backup',
  version: 1,
  exportedOn: '2026-11-18',
  categories: [
    { id: SAMPLE_CATEGORY.home, name: 'Home' },
    { id: SAMPLE_CATEGORY.food, name: 'Food' },
    { id: SAMPLE_CATEGORY.salary, name: 'Salary' },
  ],
  transactions: [
    {
      id: 1,
      date: '2026-11-05',
      type: 'income',
      currency: 'ARS',
      amount: 225000000,
      categoryId: SAMPLE_CATEGORY.salary,
      description: 'November salary',
    },
    {
      id: 2,
      date: '2026-11-07',
      type: 'expense',
      currency: 'ARS',
      amount: 9630000,
      categoryId: SAMPLE_CATEGORY.food,
      description: 'Groceries',
    },
    {
      id: 3,
      date: '2026-11-10',
      type: 'expense',
      currency: 'ARS',
      amount: 100000000,
      categoryId: SAMPLE_CATEGORY.home,
      description: 'Rent',
    },
    {
      id: 4,
      date: '2026-11-12',
      type: 'expense',
      currency: 'USD',
      amount: 1199,
      categoryId: SAMPLE_CATEGORY.home,
      description: 'Streaming',
    },
  ],
  fixedCosts: [
    {
      id: 1,
      name: 'Rent',
      currency: 'ARS',
      amount: 100000000,
      every: 4,
      lastIncrease: '2026-08',
      increase: { rule: 'ipc' },
    },
    {
      id: 2,
      name: 'Internet',
      currency: 'ARS',
      amount: 2500000,
      every: 1,
      lastIncrease: '2026-11',
      increase: { rule: 'percent', percent: '5' },
    },
  ],
};

function factorText(scaled: number): string {
  const whole = Math.trunc(scaled / FAKE_IPC.factorScale);
  const fraction = String(scaled % FAKE_IPC.factorScale).padStart(FAKE_IPC.factorDecimals, '0');
  return `${whole}.${fraction}`;
}

/** Answers `GET /api/ipc/factors` like the real API, from the months and settings in the query. */
async function fakeIpcApi(page: Page): Promise<void> {
  await page.route('**/api/ipc/factors?**', async (route) => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({ status: HTTP_NO_CONTENT, headers: CORS_HEADERS });
      return;
    }
    const query = new URL(route.request().url()).searchParams;
    const from = query.get('from') as YearMonth;
    const months = Number(query.get('months'));
    const every = Number(query.get('every'));
    const lastIncrease = (query.get('last_increase') ?? from) as YearMonth;

    let factor: number = FAKE_IPC.factorScale;
    const data = Array.from({ length: months }, (_, index) => {
      const month = shiftMonth(from, index);
      const increases = index > 0 && monthsBetween(lastIncrease, month) % every === 0;
      if (increases) {
        factor = Math.round(
          (factor * (FAKE_IPC.factorScale + FAKE_IPC.monthlyRateInScale * every)) /
            FAKE_IPC.factorScale,
        );
      }
      return {
        month,
        factor: factorText(factor),
        increases,
        estimated: monthsBetween(FAKE_IPC.lastOfficialMonth, month) > 0,
      };
    });

    await route.fulfill({
      headers: CORS_HEADERS,
      json: {
        data,
        meta: {
          last_month: FAKE_IPC.lastOfficialMonth,
          estimate: query.get('estimate'),
          monthly_estimate: FAKE_IPC.monthlyEstimate,
          source: FAKE_IPC.source,
        },
      },
    });
  });
}

/** Every test starts at `NOW`, with an empty device and the fake IPC API. */
export const test = base.extend({
  page: async ({ page }, use) => {
    await page.clock.setFixedTime(NOW);
    await fakeIpcApi(page);
    await use(page);
  },
});

export { expect };

/** Checks the whole page with axe in a real browser, color contrast included. */
export async function expectAccessible(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page }).withTags(WCAG_AA_TAGS).analyze();
  expect(
    results.violations.map(({ id, nodes }) => ({ id, targets: nodes.map((n) => n.target) })),
  ).toEqual([]);
}

/** Checks that the page never scrolls sideways, as on a phone with a long amount. */
export async function expectNoSidewaysScroll(page: Page): Promise<void> {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

/** Opens a page and waits for its title, which the navbar shows once the page has loaded. */
export async function openPage(page: Page, path: string, title: string): Promise<void> {
  await page.goto(path);
  await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
}

/** Imports a backup through the Data page, as a person would, and waits until it's stored. */
export async function importBackup(page: Page): Promise<void> {
  await openPage(page, '/data', en.pages.data);
  await page.getByRole('button', { name: en.data.importBackup }).click();
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: en.data.chooseFile }).click();
  await (
    await chooser
  ).setFiles({
    name: 'backup.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(SAMPLE_BACKUP)),
  });
  await expect(
    page.locator('.data-count').filter({ hasText: en.data.transactions }).locator('dd'),
  ).toHaveText(String(SAMPLE_BACKUP.transactions.length));
}
