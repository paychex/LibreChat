/**
 * Global Setup — Smart authentication based on target environment.
 *
 * Detects the login method from E2E_BASE_URL:
 *   - localhost → LibreChat local email/password login
 *   - play.ain2a.paychex.com / play.ain1.paychex.com → Azure AD (libre_playwright_np)
 *   - play.ai.paychex.com → Azure AD (libre_playwright_pr)
 *
 * Environment variables:
 *   E2E_BASE_URL  — Target LibreChat URL
 *   E2E_USERNAME  — Test account email (e.g. libre_playwright_np@paychex.com)
 *   E2E_PASSWORD  — Test account password
 */
import { chromium, FullConfig, Page } from '@playwright/test';
import path from 'path';

const BASE_URL = process.env.E2E_BASE_URL;
const USERNAME = process.env.E2E_USERNAME;
const PASSWORD = process.env.E2E_PASSWORD;
const STATE_PATH = path.resolve(__dirname, '..', 'storageState.ci.json');

function isLocalhost(url: string): boolean {
  const parsed = new URL(url);
  return parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
}

async function loginLocal(
  page: Page,
  baseUrl: string,
  email: string,
  password: string,
): Promise<void> {
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

  // Wait for the login form to render
  const emailInput = page.locator('input[name="email"]');
  await emailInput.waitFor({ state: 'visible', timeout: 15000 });
  console.log('  ✓ Loaded LibreChat local login page');

  // Fill credentials and submit
  await emailInput.fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.getByRole('button', { name: /continue|log in|sign in/i }).click();
  console.log('  ✓ Submitted local credentials');

  // Wait for redirect away from login
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 15000 });
  await page.waitForSelector('[data-testid="nav-user"], nav', { timeout: 20000 });
  console.log('  ✓ Successfully authenticated locally — LibreChat loaded');
}

function isAdfsWiaPage(url: string): boolean {
  return url.includes('/adfs/ls/wia') || url.includes('deviceAuthenticationMethod');
}

function adfsFormsUrlFromWia(wiaUrl: string): string {
  const url = new URL(wiaUrl);
  // Switch to the forms-based endpoint
  url.pathname = url.pathname.replace(/\/wia$/, '/');
  // Remove the TLS/WIA device-auth hint so ADFS doesn't carry it forward
  url.searchParams.delete('deviceAuthenticationMethod');
  // Remove the authmethod override that ADFS was ignoring and bouncing back to WIA
  url.searchParams.delete('authmethod');
  // wauth tells the WS-Federation relying party (Azure AD / Microsoft Online)
  // which auth method it prefers. Setting it to the SAML password auth URN
  // signals that interactive password entry is expected, which prompts ADFS to
  // serve the forms login page instead of routing to Windows Integrated Auth.
  url.searchParams.set('wauth', 'urn:oasis:names:tc:SAML:1.0:am:password');
  return url.toString();
}

async function fillAdfsCredentials(
  page: Page,
  email: string,
  password: string,
  baseOrigin: string,
): Promise<void> {
  if (new URL(page.url()).origin === baseOrigin) {
    return;
  }

  const adfsUsername = email.split('@')[0];
  const usernameInput = page
    .locator('#userNameInput, input[name="UserName"], input[name="username"]')
    .first();
  const passwordInput = page
    .locator(
      '#passwordInput, input[name="Password"], input[name="password"], input[type="password"]',
    )
    .first();
  const submitButton = page
    .locator('#submitButton, input[type="submit"], button[type="submit"]')
    .first();

  if (isAdfsWiaPage(page.url())) {
    console.log('  ↪ ADFS attempted WIA — forcing forms-based login');
    await page.goto(adfsFormsUrlFromWia(page.url()), {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });

    // ADFS may still redirect back to WIA even after the wauth override
    // (e.g. strict WIA policy on the CI runner network). Detect and fail fast.
    if (isAdfsWiaPage(page.url())) {
      throw new Error(
        `ADFS redirected back to WIA after wauth=password override. ` +
          `Current URL: ${page.url()}. ` +
          `ADFS WIA policy may be enforced at the network/realm level — ` +
          `check that the CI runner's IP is not classified as intranet by ADFS.`,
      );
    }
  }

  // ADFS may pre-fill the username from the URL query param (username=...) and
  // hide the username field, advancing straight to the password step.
  // Only fill the username if the field is actually visible.
  const usernameVisible = await usernameInput.isVisible().catch(() => false);
  if (usernameVisible) {
    await usernameInput.fill(adfsUsername);
    console.log('  ✓ Filled username on ADFS');
  } else {
    console.log('  ↪ ADFS pre-filled username from URL — skipping to password step');
  }

  await passwordInput.waitFor({ state: 'visible', timeout: 30000 });
  await passwordInput.fill(password);
  await submitButton.click();
  console.log('  ✓ Submitted credentials on ADFS');

  await page.waitForURL((url) => url.origin === baseOrigin, { timeout: 30000 });
}

async function loginAzureAD(
  page: Page,
  baseUrl: string,
  email: string,
  password: string,
): Promise<void> {
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

  // Wait for the OpenID button to appear
  const openIdButton = page.getByText('Continue with OpenID');
  await openIdButton.waitFor({ state: 'visible', timeout: 15000 });
  console.log('  ✓ Loaded LibreChat login page');

  // Click "Continue with OpenID"
  await openIdButton.click();
  console.log('  ✓ Clicked Continue with OpenID');

  // Microsoft login page — enter email
  await page.waitForURL(/login\.microsoftonline\.com|login\.microsoft\.com/, { timeout: 15000 });
  await page.locator('input[name="loginfmt"]').fill(email);
  await page.getByRole('button', { name: /next/i }).click();
  console.log('  ✓ Submitted email on Microsoft login');

  // After Microsoft redirects, we may land on:
  //   a) ADFS form (CI runners / non-domain-joined machines / incognito)
  //   b) ADFS WIA endpoint (domain-joined runners — must fall back to forms)
  //   c) Directly back to LibreChat (domain-joined machines via Kerberos/NTLM)
  const baseOrigin = new URL(baseUrl).origin;
  await page.waitForURL(
    (url) => {
      const href = url.href.toLowerCase();
      return href.includes('adfs') || href.includes('sts') || url.origin === baseOrigin;
    },
    { timeout: 30000, waitUntil: 'domcontentloaded' },
  );

  const currentUrl = page.url();
  if (currentUrl.includes('adfs') || currentUrl.includes('sts')) {
    console.log('  ✓ Redirected to ADFS — filling credentials');
    await fillAdfsCredentials(page, email, password, baseOrigin);
  } else {
    console.log('  ✓ Auto-authenticated (Windows Integrated Auth) — skipped ADFS form');
  }

  // Wait for the app to fully load
  await page.waitForSelector('[data-testid="nav-user"], nav', { timeout: 20000 });
  console.log('  ✓ Successfully authenticated via Azure AD — LibreChat loaded');
}

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

  const useLocal = isLocalhost(BASE_URL);
  const method = useLocal ? 'local email/password' : 'Azure AD';
  console.log(`🧪 Global Setup: authenticating ${USERNAME} against ${BASE_URL} (${method})`);

  // Prevent Chromium from auto-negotiating Kerberos/NTLM with ADFS. Without this,
  // domain-joined CI runners land on /adfs/ls/wia (integrated auth) instead of
  // the username/password form that headless automation requires.
  const browser = await chromium.launch({
    headless: true,
    // Must match the project channel; CI has no bundled Chromium to fall back on.
    ...(process.env.E2E_CHROMIUM_CHANNEL ? { channel: process.env.E2E_CHROMIUM_CHANNEL } : {}),
    args: ['--auth-server-allowlist="_"'],
  });
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await context.newPage();

  try {
    if (useLocal) {
      await loginLocal(page, BASE_URL, USERNAME, PASSWORD);
    } else {
      await loginAzureAD(page, BASE_URL, USERNAME, PASSWORD);
    }

    await context.storageState({ path: STATE_PATH });
    console.log(`  ✓ Storage state saved to ${STATE_PATH}`);
  } catch (error) {
    const screenshotPath = path.resolve(__dirname, '..', 'auth-failure.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.error(`  ✗ Authentication failed. Screenshot saved to ${screenshotPath}`);
    console.error(`  ✗ Current URL: ${page.url()}`);
    throw error;
  } finally {
    await browser.close();
  }
}
