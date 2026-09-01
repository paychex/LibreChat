import type { Page } from '@playwright/test';

/**
 * A first-login tour ("Meet the Prompt Catalog") can overlay the UI and
 * suppresses accessible names until dismissed.
 */
async function dismissOnboarding(page: Page): Promise<void> {
  const close = page.getByRole('button', { name: /^close$/i }).first();
  if (await close.isVisible().catch(() => false)) {
    await close.click().catch(() => undefined);
    await page.waitForTimeout(300);
  }
}

/** Loads a fresh chat and waits until the authenticated shell is interactive. */
export async function gotoChat(page: Page): Promise<void> {
  await page.goto('/c/new', { waitUntil: 'domcontentloaded' });
  await page.getByTestId('nav-user').waitFor({ state: 'visible', timeout: 30000 });
  await dismissOnboarding(page);
}

/** Closes any open menu/dialog so the next interaction starts from a clean surface. */
export async function closeOverlay(page: Page): Promise<void> {
  await page.keyboard.press('Escape').catch(() => undefined);
  await page.waitForTimeout(250);
}
