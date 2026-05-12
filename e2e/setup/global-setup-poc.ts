/**
 * Global setup for the POC config: logs in fresh at the start of each test
 * run and writes the resulting auth state to storageState.poc.json.
 *
 * Why this exists: LibreChat appears to rotate refresh tokens (or otherwise
 * invalidate them after a short window), so a cached storageState file goes
 * stale quickly. Logging in once per test run is the simplest reliable
 * approach for the POC.
 */
import { chromium, FullConfig } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const BASE_URL = process.env.POC_BASE_URL ?? 'http://localhost:3090';
const EMAIL = process.env.POC_EMAIL ?? 'tmarkovic@email.com';
const PASSWORD = process.env.POC_PASSWORD ?? 'test1234';
const STATE_PATH = path.resolve(__dirname, '..', 'storageState.poc.json');

export default async function globalSetup(_config: FullConfig): Promise<void> {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(BASE_URL);
  await page.getByRole('textbox', { name: 'Email' }).fill(EMAIL);
  await page.getByRole('textbox', { name: 'Password' }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 15000 });

  await context.storageState({ path: STATE_PATH });
  await browser.close();
}
