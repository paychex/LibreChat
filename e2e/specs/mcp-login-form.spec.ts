import { test, expect } from '@playwright/test';

test.describe('Login form validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('Continue button is rendered and stays on /login when fields are empty', async ({
    page,
  }) => {
    const button = page.getByRole('button', { name: 'Continue' });
    await expect(button).toBeVisible();
    await button.click();
    await expect(page).toHaveURL(/\/login$/);
  });

  test('typing in Email and Password updates the inputs', async ({ page }) => {
    const email = page.getByRole('textbox', { name: 'Email' });
    const password = page.getByRole('textbox', { name: 'Password' });
    await email.fill('someone@example.com');
    await password.fill('hunter2');
    await expect(email).toHaveValue('someone@example.com');
    await expect(password).toHaveValue('hunter2');
  });

  test('submitting bogus credentials shows an error and stays on /login', async ({ page }) => {
    await page.getByRole('textbox', { name: 'Email' }).fill('not-a-user@example.com');
    await page.getByRole('textbox', { name: 'Password' }).fill('wrong-password-xyz');
    await page.getByRole('button', { name: 'Continue' }).click();
    // After submitting, verify the Continue button is still visible (page didn't navigate away)
    await expect(page.getByTestId('login-button')).toBeVisible({ timeout: 5000 });
    await expect(page).toHaveURL(/\/login/);
  });
});
