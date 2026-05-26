import { defineConfig, devices } from '@playwright/test';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();

/**
 * Playwright config for E2E tests against local or deployed environments.
 *
 * Required environment variables (set in .env or export directly):
 *   E2E_BASE_URL  — Target LibreChat URL (localhost or deployed)
 *   E2E_USERNAME  — Test account email (e.g. libre_playwright_np@paychex.com)
 *   E2E_PASSWORD  — Test account password
 *
 * Run with:
 *   npx playwright test --config=e2e/playwright.config.ci.ts
 *   npm run e2e:ci:deployed
 */
export default defineConfig({
  globalSetup: path.resolve(__dirname, 'setup', 'global-setup-ci.ts'),
  testDir: path.resolve(__dirname, 'specs'),
  outputDir: path.resolve(__dirname, 'specs', '.test-results-ci'),
  testMatch: /(?:mcp-.*\.spec|ci\/.*\.spec)\.ts/,
  fullyParallel: false,
  forbidOnly: true,
  retries: 2,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { outputFolder: path.resolve(__dirname, 'playwright-report-ci'), open: 'never' }],
  ],
  use: {
    baseURL: process.env.E2E_BASE_URL,
    headless: true,
    ignoreHTTPSErrors: true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'on-first-retry',
    storageState: path.resolve(__dirname, 'storageState.ci.json'),
  },
  expect: {
    timeout: 15000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
