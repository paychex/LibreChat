import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

/**
 * Navigate to a fresh chat. Relies on the storageState created by
 * global-setup-ci.ts so every test run gets a single login,
 * avoiding rate-limit / token-rotation issues that plagued inline logins.
 *
 * If the storage state is missing or stale, the page will redirect to
 * /login and the `waitForSelector` below will fail fast with a clear message.
 */
export const loginAndGoToChat = async (page: Page): Promise<void> => {
  await page.goto('/c/new', { waitUntil: 'domcontentloaded' });
  // The SPA may client-side redirect to /login if unauthenticated.
  // Wait for either the chat model selector OR the login form to appear.
  const modelBtn = page.getByRole('button', { name: 'Select a model' });
  const loginForm = page.getByRole('form', { name: 'Login form' });
  await expect(modelBtn.or(loginForm)).toBeVisible({ timeout: 15000 });

  if (await loginForm.isVisible().catch(() => false)) {
    const POC_EMAIL = process.env.POC_EMAIL ?? process.env.E2E_USERNAME ?? 'tmarkovic@email.com';
    const POC_PASSWORD = process.env.POC_PASSWORD ?? process.env.E2E_PASSWORD ?? 'test1234';
    await page.getByRole('textbox', { name: 'Email' }).fill(POC_EMAIL);
    await page.getByRole('textbox', { name: 'Password' }).fill(POC_PASSWORD);
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 15000 });
    await page.goto('/c/new', { waitUntil: 'domcontentloaded' });
    await expect(modelBtn).toBeVisible({ timeout: 15000 });
  }

  // Dismiss onboarding modal if present (appears for fresh accounts)
  await dismissOnboardingModal(page);
};

/**
 * Dismiss the onboarding/tutorial modal that appears for new users.
 * Clicks through all "Next" steps and then the final dismiss button.
 * No-ops silently if the modal is not present.
 */
export const dismissOnboardingModal = async (page: Page): Promise<void> => {
  const closeBtn = page.getByRole('button', { name: 'Close' });
  const nextBtn = page.getByRole('button', { name: 'Next' });

  // Give the modal a moment to appear (it may animate in)
  const modalVisible = await nextBtn.isVisible({ timeout: 2000 }).catch(() => false)
    || await closeBtn.isVisible({ timeout: 500 }).catch(() => false);
  if (!modalVisible) return;

  // Click through all "Next" steps until only "Close" remains
  for (let i = 0; i < 10; i++) {
    if (await nextBtn.isVisible().catch(() => false)) {
      await nextBtn.click();
      await page.waitForTimeout(300);
    } else {
      break;
    }
  }

  // Dismiss the final step
  if (await closeBtn.isVisible().catch(() => false)) {
    await closeBtn.click();
  }
};

export const openAccountMenu = async (page: Page): Promise<void> => {
  await page.getByTestId('nav-user').click();
  await expect(page.getByRole('menuitem', { name: 'Settings' })).toBeVisible();
};

export const openSettingsDialog = async (page: Page): Promise<void> => {
  await openAccountMenu(page);
  await page.getByRole('menuitem', { name: 'Settings' }).click();
  await expect(page.getByRole('heading', { name: 'Settings', level: 2 })).toBeVisible();
};

export const closeSettingsDialog = async (page: Page): Promise<void> => {
  const close = page.getByRole('button', { name: 'Close Settings' });
  if (await close.isVisible().catch(() => false)) {
    await close.click();
    await expect(page.getByRole('heading', { name: 'Settings', level: 2 })).toBeHidden();
  }
};

/**
 * Dismiss the React Query Devtools panel if visible.
 * In development mode, the devtools overlay can intercept pointer events
 * on the right-side control panel buttons. Inject a persistent CSS rule
 * so the devtools stay hidden even if they re-render.
 */
export const dismissReactQueryDevtools = async (page: Page): Promise<void> => {
  await page.addStyleTag({
    content:
      '[aria-label="React Query Devtools"], .ReactQueryDevtools { display: none !important; pointer-events: none !important; }',
  });
};

/**
 * Click a button inside the right-hand "Controls" navigation by accessible name.
 * The buttons there can collide with other buttons on the page (e.g. Bookmarks
 * also exists in the sidebar), so we scope by the surrounding nav.
 */
export const clickControlPanelButton = async (page: Page, name: string): Promise<void> => {
  const nav = page.getByRole('navigation', { name: 'Controls' });
  await nav.getByRole('button', { name, exact: true }).click();
};
