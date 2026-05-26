/**
 * CI Global Setup — Authenticates via Azure AD + ADFS federation.
 *
 * Flow:
 *   1. Navigate to the deployed LibreChat instance
 *   2. Click "Continue with OpenID"
 *   3. Enter email on the Microsoft login page
 *   4. Get redirected to Paychex ADFS
 *   5. Fill username + password on the ADFS form
 *   6. Wait for redirect back to LibreChat
 *   7. Save storage state for test reuse
 *
 * Environment variables:
 *   E2E_BASE_URL  — Deployed LibreChat URL
 *   E2E_USERNAME  — Test account email (e.g. libre_playwright_np@paychex.com)
 *   E2E_PASSWORD  — Test account password
 */
import { chromium, FullConfig } from '@playwright/test';
import path from 'path';

const BASE_URL = process.env.E2E_BASE_URL;
const USERNAME = process.env.E2E_USERNAME;
const PASSWORD = process.env.E2E_PASSWORD;
const STATE_PATH = path.resolve(__dirname, '..', 'storageState.ci.json');

export default async function globalSetup(_config: FullConfig): Promise<void> {
  if (!BASE_URL) {
    throw new Error('E2E_BASE_URL environment variable is required');
  }
  if (!USERNAME) {
    throw new Error('E2E_USERNAME environment variable is required');
  }
  if (!PASSWORD) {
    throw new Error('E2E_PASSWORD environment variable is required');
  }

  console.log(`🧪 CI Global Setup: authenticating ${USERNAME} against ${BASE_URL}`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await context.newPage();

  try {
    // Step 1: Navigate to LibreChat
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
    console.log('  ✓ Loaded LibreChat login page');

    // Step 2: Click "Continue with OpenID"
    await page.getByRole('button', { name: /openid/i }).click();
    console.log('  ✓ Clicked Continue with OpenID');

    // Step 3: Microsoft login page — enter email
    await page.waitForURL(/login\.microsoftonline\.com|login\.microsoft\.com/, { timeout: 15000 });
    await page.getByPlaceholder(/email/i).fill(USERNAME);
    await page.getByRole('button', { name: /next/i }).click();
    console.log('  ✓ Submitted email on Microsoft login');

    // Step 4: ADFS page — fill username and password
    // Wait for redirect to ADFS (URL typically contains /adfs/ or the org's federation endpoint)
    await page.waitForURL(/adfs|sts/, { timeout: 15000 });
    console.log('  ✓ Redirected to ADFS');

    // ADFS expects just the username (without @domain), not the full email
    const adfsUsername = USERNAME.split('@')[0];

    // Fill the ADFS sign-in form
    // ADFS typically has a usernamemixed form with #userNameInput and #passwordInput
    const usernameInput = page.locator('#userNameInput, input[name="UserName"], input[name="username"]').first();
    const passwordInput = page.locator('#passwordInput, input[name="Password"], input[name="password"], input[type="password"]').first();
    const submitButton = page.locator('#submitButton, input[type="submit"], button[type="submit"]').first();

    await usernameInput.waitFor({ state: 'visible', timeout: 10000 });
    await usernameInput.fill(adfsUsername);
    await passwordInput.fill(PASSWORD);
    await submitButton.click();
    console.log('  ✓ Submitted credentials on ADFS');

    // Step 5: Wait for redirect back to LibreChat
    await page.waitForURL((url) => url.origin === new URL(BASE_URL).origin, { timeout: 30000 });

    // Wait for the app to fully load (nav element or main chat area)
    await page.waitForSelector('[data-testid="nav-user"], nav', { timeout: 20000 });
    console.log('  ✓ Successfully authenticated — LibreChat loaded');

    // Step 6: Save storage state
    await context.storageState({ path: STATE_PATH });
    console.log(`  ✓ Storage state saved to ${STATE_PATH}`);
  } catch (error) {
    // Capture a screenshot for debugging auth failures
    const screenshotPath = path.resolve(__dirname, '..', 'auth-failure.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.error(`  ✗ Authentication failed. Screenshot saved to ${screenshotPath}`);
    console.error(`  ✗ Current URL: ${page.url()}`);
    throw error;
  } finally {
    await browser.close();
  }
}
