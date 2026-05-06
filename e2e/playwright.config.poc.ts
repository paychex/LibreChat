import { defineConfig, devices } from '@playwright/test';
import fs from 'fs';
import path from 'path';

/**
 * Lightweight Playwright config for the Playwright MCP POC.
 *
 * Skips global setup/teardown and webServer. Assumes you already ran:
 *   npm run backend:dev
 *   npm run frontend:dev
 *
 * If storageState.poc.json exists (created by setup/login-poc.ts), it will be
 * loaded so tests start authenticated. Otherwise tests start unauthenticated.
 *
 * Run with:
 *   cd e2e && npx playwright test --config=playwright.config.poc.ts
 */
const storageStatePath = path.resolve(__dirname, 'storageState.poc.json');
const storageState = fs.existsSync(storageStatePath) ? storageStatePath : undefined;

export default defineConfig({
  testDir: 'specs/',
  outputDir: 'specs/.test-results-poc',
  testMatch: /mcp-.*\.spec\.ts/,
  globalSetup: require.resolve('./setup/global-setup-poc'),
  fullyParallel: false,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:3090',
    headless: true,
    ignoreHTTPSErrors: true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    storageState,
  },
  expect: { timeout: 10000 },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
