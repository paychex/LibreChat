/**
 * One-off login helper for the Playwright MCP POC.
 *
 * Logs into the local LibreChat dev instance with the test user and writes
 * the resulting auth state (cookies + localStorage) to storageState.poc.json,
 * which the POC config (playwright.config.poc.ts) will reuse.
 *
 * Prerequisites:
 *   npm run backend:dev
 *   npm run frontend:dev
 *
 * Usage:
 *   cd e2e && npx ts-node setup/login-poc.ts
 * or, if ts-node isn't handy:
 *   cd e2e && npx playwright test setup/login-poc.ts --config=playwright.config.poc.ts
 *
 * The user can be overridden with POC_EMAIL / POC_PASSWORD env vars.
 */
import { chromium } from '@playwright/test';
import path from 'path';

const BASE_URL = process.env.POC_BASE_URL ?? 'http://localhost:3090';
const EMAIL = process.env.POC_EMAIL ?? 'tmarkovic@email.com';
const PASSWORD = process.env.POC_PASSWORD ?? 'test1234';
const STATE_PATH = path.resolve(__dirname, '..', 'storageState.poc.json');

async function main(): Promise<void> {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(BASE_URL);
  await page.getByRole('textbox', { name: 'Email' }).fill(EMAIL);
  await page.getByRole('textbox', { name: 'Password' }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Continue' }).click();

  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 15000 });

  await context.storageState({ path: STATE_PATH });
  console.log(`Saved auth state to ${STATE_PATH}`);

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
