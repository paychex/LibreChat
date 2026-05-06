import { test, expect } from '@playwright/test';

test.describe('Landing page (login)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3090');
  });

  test('redirects to /login and renders the login UI', async ({ page }) => {
    await expect(page).toHaveURL(/\/login$/);
    await expect(page).toHaveTitle(/Paychex Play AI/);
  });

  test('shows logo, theme toggle, heading, login form, and sign-up link', async ({ page }) => {
    await expect(page.getByRole('img', { name: 'Paychex Play AI Logo' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Toggle theme' })).toBeVisible();

    await expect(page.getByRole('heading', { level: 1, name: 'Welcome back' })).toBeVisible();

    const form = page.getByRole('form', { name: 'Login form' });
    await expect(form).toBeVisible();
    await expect(form.getByRole('textbox', { name: 'Email' })).toBeVisible();
    await expect(form.getByRole('textbox', { name: 'Password' })).toBeVisible();
    await expect(form.getByRole('button', { name: 'Continue' })).toBeVisible();

    await expect(page.getByText("Don't have an account?")).toBeVisible();
    const signUp = page.getByRole('link', { name: 'Sign up' });
    await expect(signUp).toBeVisible();
    await expect(signUp).toHaveAttribute('href', '/register');
  });
});
