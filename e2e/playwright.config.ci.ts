import { defineConfig, devices } from '@playwright/test';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3080';
const isLocal = (() => {
  try {
    const { hostname } = new URL(BASE_URL);
    return hostname === 'localhost' || hostname === '127.0.0.1';
  } catch {
    return false;
  }
})();
const absolutePath = path.resolve(process.cwd(), 'api/server/index.js');

/**
 * Playwright config for E2E tests against local or deployed environments.
 *
 * Required environment variables (set in .env or export directly):
 *   E2E_BASE_URL  — Target LibreChat URL (default: http://localhost:3080)
 *   E2E_USERNAME  — Test account email (e.g. libre_playwright_np@paychex.com)
 *   E2E_PASSWORD  — Test account password
 *
 * For local testing, the backend serves both API + built frontend on port 3080.
 * Run `npm run build` first if the frontend hasn't been built.
 *
 * Run with:
 *   npm run e2e:seed          # create test account in local MongoDB (first time only)
 *   npm run e2e:ci:deployed   # run tests (auto-starts server if localhost)
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
    baseURL: BASE_URL,
    headless: true,
    ignoreHTTPSErrors: true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    /** See e2e/playwright.config.mock.ts — CI has no ffmpeg, so video recording
     * crashes the first retry instead of recording it. Traces cover debugging. */
    video: 'off',
    storageState: path.resolve(__dirname, 'storageState.ci.json'),
  },
  expect: {
    timeout: 15000,
  },
  /* Auto-start backend server when testing locally (serves API + built frontend on 3080) */
  ...(isLocal
    ? {
        webServer: {
          command: `node ${absolutePath}`,
          port: 3080,
          timeout: 30_000,
          reuseExistingServer: true,
          env: {
            ...process.env,
            NODE_ENV: 'CI',
            SEARCH: 'false',
            ALLOW_REGISTRATION: 'true',
          },
        },
      }
    : {}),
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
