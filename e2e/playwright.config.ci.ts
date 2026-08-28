import { defineConfig, devices } from '@playwright/test';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3080';
// Set to 'chrome' in CI to use the runner's system Chrome instead of downloading
// Playwright's bundled Chromium; see playwright.config.mock.ts for the same pattern.
const chromiumChannel = process.env.E2E_CHROMIUM_CHANNEL || undefined;
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
  // Not a hidden directory: actions/upload-artifact skips dot-prefixed paths by default.
  outputDir: path.resolve(__dirname, 'test-results-ci'),
  testMatch: /ci[\\/].*\.spec\.ts$/,
  fullyParallel: false,
  forbidOnly: true,
  retries: 2,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { outputFolder: path.resolve(__dirname, 'playwright-report-ci'), open: 'never' }],
    // Consumed by scripts/e2e-triage.mjs to attribute failures across upstream upgrades.
    ['json', { outputFile: path.resolve(__dirname, 'results-ci', 'results.json') }],
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
    // Without this a removed element burns the full 30s test timeout instead of failing fast.
    actionTimeout: 10000,
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
      name: chromiumChannel ?? 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        ...(chromiumChannel ? { channel: chromiumChannel } : {}),
      },
    },
  ],
});
