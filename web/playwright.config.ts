import { defineConfig, devices } from '@playwright/test';

const PORT = 4200;
const BASE_URL = `http://localhost:${PORT}`;
const SERVER_START_TIMEOUT_MS = 180_000;
const CI_RETRIES = 2;
const isCi = Boolean(process.env['CI']);

/** End-to-end tests in a real browser, against `ng serve`, with the IPC API faked in each test. */
export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.e2e.ts',
  fullyParallel: true,
  forbidOnly: isCi,
  retries: isCi ? CI_RETRIES : 0,
  reporter: 'list',
  use: {
    baseURL: BASE_URL,
    locale: 'en-US',
    timezoneId: 'America/Argentina/Buenos_Aires',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'phone', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: `npx ng serve --port ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !isCi,
    timeout: SERVER_START_TIMEOUT_MS,
  },
});
