import { defineConfig, devices } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Lightweight Playwright config for the Playwright MCP POC.
 *
 * Skips global setup/teardown and webServer. Assumes you already ran:
 *   npm run backend:dev
 *   npm run frontend:dev
 *
 * globalSetup creates storageState.poc.json before tests run, so all tests
 * start authenticated.
 *
 * Run with:
 *   cd e2e && npx playwright test --config=playwright.config.poc.ts
 */
const storageStatePath = path.resolve(__dirname, 'storageState.poc.json');

export default defineConfig({
  testDir: 'specs/',
  outputDir: 'specs/.test-results-poc',
  testMatch: /mcp-.*\.spec\.ts/,
  globalSetup: path.resolve(__dirname, 'setup', 'global-setup-poc.ts'),
  fullyParallel: false,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:3090',
    headless: true,
    ignoreHTTPSErrors: true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    storageState: storageStatePath,
  },
  expect: { timeout: 10000 },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
