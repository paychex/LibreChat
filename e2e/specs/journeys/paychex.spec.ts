import { expect, test } from '@playwright/test';
import { closeOverlay, getDefaultModelSpec, gotoChat, openModelSpecOption } from './helpers';

/**
 * Paychex-owned customizations. A failure here means a merge or deploy removed
 * something we added on top of upstream — treat as a hard stop, not a flake.
 *
 * Every selector below was verified against a deployed environment; see
 * e2e/coverage-map.json for the evidence and for locators that look plausible
 * but do NOT work.
 */
test.describe('Paychex customizations', () => {
  test(
    'Pendo analytics initializes for the authenticated session',
    {
      tag: ['@paychex', '@critical'],
    },
    async ({ page }) => {
      await gotoChat(page);

      // PendoInitializer must wrap the authenticated layout; without it the
      // Resource Center ("See newest features") and all tracking disappear.
      await expect
        .poll(
          () =>
            page.evaluate(() => {
              const pendo = (window as unknown as { pendo?: Record<string, unknown> }).pendo;
              return typeof pendo === 'object' && pendo !== null;
            }),
          { timeout: 20000, message: 'window.pendo was never initialized' },
        )
        .toBe(true);

      // injectPendoScript() installs the window.pendo queue stub synchronously, so the
      // check above alone would also pass if the script tag were never appended.
      // Asserting the tag proves the initializer ran end to end without making this
      // @paychex hard stop depend on cdn.pendo.io being reachable from the runner.
      await expect(page.locator('script#pendo-script')).toHaveAttribute(
        'src',
        /^https:\/\/cdn\.pendo\.io\/agent\/static\/.+\/pendo\.js$/,
      );
    },
  );

  test('Agent usage tracking element is rendered', { tag: ['@paychex'] }, async ({ page }) => {
    await gotoChat(page);
    await expect(page.locator('#agentUsers')).toBeAttached();
  });

  test(
    'Paychex Changelog is reachable from the account menu',
    {
      tag: ['@paychex'],
    },
    async ({ page }) => {
      await gotoChat(page);

      await page.getByTestId('nav-user').click();
      await expect(page.getByRole('menuitem', { name: 'Paychex Changelog' })).toBeVisible();

      await closeOverlay(page);
    },
  );

  test('Paychex Changelog is linked from the footer', { tag: ['@paychex'] }, async ({ page }) => {
    await gotoChat(page);

    const link = page.getByRole('contentinfo').getByRole('link', { name: 'Paychex Changelog' });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', /changelog/i);
  });

  test('Default model is badged in the model selector', { tag: ['@paychex'] }, async ({ page }) => {
    await gotoChat(page);

    const spec = await getDefaultModelSpec(page);
    if (!spec) {
      throw new Error(
        'No model spec is flagged `default: true` in the deployed config. This is an ' +
          'environment/config problem, not a missing Paychex customization.',
      );
    }

    const option = await openModelSpecOption(page, spec);

    // Scoped to the resolved spec: an unscoped badge lookup would pass even if the
    // star landed on the wrong model.
    await expect(
      option.getByLabel('Default model'),
      `"${spec.label}" is flagged default but renders no DEFAULT badge`,
    ).toBeVisible();

    await closeOverlay(page);
  });

  test('Tools menu items show descriptions', { tag: ['@paychex'] }, async ({ page }) => {
    await gotoChat(page);

    await page.locator('#tools-dropdown-button').click();

    const fileSearch = page.getByRole('menuitem', { name: /File Search/i });
    await expect(fileSearch).toBeVisible();
    // Skills and Artifacts render custom submenus and have no description by design.
    await expect(fileSearch).toContainText(/analyze, compare, and contrast large documents/i);

    await closeOverlay(page);
  });

  test('Attach file menu items show descriptions', { tag: ['@paychex'] }, async ({ page }) => {
    await gotoChat(page);

    await page.locator('#attach-file-menu-button').click();

    const uploadImage = page.getByRole('menuitem', { name: /Upload Image/i });
    await expect(uploadImage).toBeVisible();
    await expect(uploadImage).toContainText(/add an image for analysis/i);

    await closeOverlay(page);
  });

  test('Prompt Catalog panel opens with its controls', { tag: ['@paychex'] }, async ({ page }) => {
    await gotoChat(page);

    await page.getByTestId('nav-panel-prompt-catalog').click();

    await expect(page.getByRole('searchbox', { name: /search catalog prompts/i })).toBeVisible();
    await expect(page.getByRole('group', { name: 'Filter by category' })).toBeVisible();
    await expect(page.getByRole('radiogroup', { name: 'Visibility' })).toBeVisible();
  });

  test(
    'Prompt Catalog deep link reports an unresolvable prompt',
    {
      tag: ['@paychex'],
    },
    async ({ page }) => {
      // A bogus id deterministically exercises the failure path, so this needs no
      // seeded catalog entry. Silence here means the resolver hangs instead of
      // surfacing the error to the user.
      await page.goto('/c/new?promptCatalogId=e2e-journey-nonexistent-id', {
        waitUntil: 'domcontentloaded',
      });

      await expect(
        page.getByText(/unable to load this prompt catalog prompt/i).first(),
      ).toBeVisible({
        timeout: 30000,
      });
    },
  );
});
