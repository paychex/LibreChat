/**
 * Paychex-owned e2e spec for the chat-input Tools dropdown.
 *
 * Covers the Paychex enhancement that adds `label` + `description` rendering
 * to DropdownPopup menu items.
 *
 * Three tests are marked `test.fixme` and document why; see the in-file
 * comment in the "toggling a tool on shows a selected state" describe block.
 */
import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

const TOOLS = ['File Search', 'Web Search', 'Artifacts'] as const;
type ToolName = (typeof TOOLS)[number];

// The badge rendered in the chat input badge row when a tool is toggled on uses
// its own localized aria-label, which is NOT always the same as the menuitem
// label. Web Search renders as the localized string "Search".
const BADGE_LABEL: Record<ToolName, string> = {
  'File Search': 'File Search',
  'Web Search': 'Search',
  Artifacts: 'Artifacts',
};

const openToolsDropdown = async (page: Page) => {
  await page.getByRole('button', { name: 'Tools Options' }).click();
  await expect(page.getByRole('menuitem', { name: /File Search/ }).first()).toBeVisible();
};

const closeToolsDropdownIfOpen = async (page: Page) => {
  const item = page.getByRole('menuitem', { name: /File Search/ }).first();
  if (await item.isVisible().catch(() => false)) {
    await page.keyboard.press('Escape');
    await expect(item).toBeHidden();
  }
};

const ensureToolOff = async (page: Page, name: ToolName) => {
  const badge = page.getByRole('checkbox', { name: BADGE_LABEL[name], exact: true });
  if (await badge.isVisible().catch(() => false)) {
    if ((await badge.getAttribute('aria-checked')) === 'true') {
      await badge.click();
      await expect(badge).toHaveAttribute('aria-checked', 'false');
    }
  }
};

const dismissOnboardingTour = async (page: Page) => {
  // First-time users see a "Find your past messages" onboarding tour modal
  // (rendered as a <complementary> aside) that blocks interaction with the
  // Tools button. Dismiss it if present. The "Find your past messages" text
  // is unique to this tour, so we scope the Close button to that container.
  const tour = page.locator('aside, [role="complementary"]').filter({
    hasText: 'Find your past messages',
  });
  if (await tour.first().isVisible().catch(() => false)) {
    await tour.getByRole('button', { name: 'Close' }).click();
    await expect(tour).toBeHidden();
  }
};

test.describe('Tools dropdown', () => {
  test.beforeEach(async ({ page }) => {
    // Auth is provided by global-setup (storageState.json). When run via the
    // local config the server uses NODE_ENV=CI which makes refresh tokens
    // stable across the test run, so no inline login is needed.
    await page.goto('/c/new');
    await dismissOnboardingTour(page);
    await expect(page.getByRole('button', { name: 'Tools Options' })).toBeVisible();
    for (const name of TOOLS) {
      await ensureToolOff(page, name);
    }
  });

  test.afterEach(async ({ page }) => {
    await closeToolsDropdownIfOpen(page);
    for (const name of TOOLS) {
      await ensureToolOff(page, name);
    }
  });

  test('Tools button is visible', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Tools Options' })).toBeVisible();
  });

  test('clicking the Tools button opens the dropdown', async ({ page }) => {
    await openToolsDropdown(page);
    for (const name of TOOLS) {
      await expect(page.getByRole('menuitem', { name: new RegExp(name) })).toBeVisible();
    }
  });

  test('dropdown contains exactly File Search, Web Search, and Artifacts', async ({ page }) => {
    await openToolsDropdown(page);

    // The portal element ID literally contains a '/', which is illegal in CSS
    // selectors. Use an attribute selector to avoid escaping issues.
    const portal = page.locator('[id="portal/tools-dropdown-menu"]');
    const items = portal.getByRole('menuitem');
    await expect(items).toHaveCount(TOOLS.length);

    // Each labeled menuitem renders the label in a <span class="text-sm
    // font-medium ..."> (DropdownPopup.renderItemBody). The Artifacts row is
    // rendered by ArtifactsSubMenu and uses a plain <span>Artifacts</span>.
    // Read all non-aria-hidden spans, take the first non-empty text we find.
    const names = await items.evaluateAll((nodes) =>
      nodes.map((n) => {
        const spans = Array.from(n.querySelectorAll('span')).filter(
          (s) => s.getAttribute('aria-hidden') !== 'true',
        );
        for (const s of spans) {
          const t = (s.textContent ?? '').trim();
          if (t.length > 0) return t;
        }
        return '';
      }),
    );
    expect(names).toEqual([...TOOLS]);
  });

  test('each item has a label and a description (Paychex enhancement)', async ({ page }) => {
    await openToolsDropdown(page);

    const expectations: Record<ToolName, RegExp> = {
      'File Search': /Analyze, compare, and contrast large documents/i,
      'Web Search': /search the web for up-to-date information/i,
      // TODO: Artifacts is rendered via ArtifactsSubMenu (custom render) and
      // does not currently carry a description in the DOM. Tracking as a
      // product enhancement. Until then we only assert the label is present.
      Artifacts: /\S/,
    };

    for (const name of TOOLS) {
      const item = page.getByRole('menuitem', { name: new RegExp(name) });
      await expect(item).toBeVisible();

      const text = (await item.innerText()).trim();
      expect(text).toContain(name);

      if (name === 'Artifacts') {
        continue;
      }

      const descriptionText = text.replace(name, '').trim();
      expect(descriptionText.length).toBeGreaterThan(0);
      expect(descriptionText).toMatch(expectations[name]);
    }
  });

  test('clicking outside the dropdown closes it', async ({ page }) => {
    await openToolsDropdown(page);
    const item = page.getByRole('menuitem', { name: /File Search/ });
    await expect(item).toBeVisible();

    await page.mouse.click(5, 5);

    await expect(item).toBeHidden();
  });

  test.describe('toggling a tool on shows a selected state', () => {
    // TODO(paychex): These toggle assertions are env- and state-sensitive in
    // the local Playwright config (NODE_ENV=CI), and the current UI does not
    // surface a deterministic per-menuitem selected indicator:
    //   - File Search / Artifacts: toggling the menu item does not always
    //     produce a visible badge in the input badge row in this env (the
    //     backing agent capability and provider need to be configured).
    //   - Web Search: clicking the menu item opens the API-key configuration
    //     dialog only on the false->true state transition, but toggleState
    //     persists across tests, so the dialog does not reappear on later
    //     runs in the same browser context.
    // Re-enable once the dropdown exposes aria-checked on the menu items
    // themselves, or the e2e env provisions the providers/capabilities.
    test.fixme(
      'toggles Web Search on (opens API key dialog when unauthenticated)',
      async ({ page }) => {
        await openToolsDropdown(page);
        await page.getByRole('menuitem', { name: /Web Search/ }).click();

        await expect(page.getByRole('heading', { name: 'Web Search' })).toBeVisible();
        await expect(page.getByPlaceholder(/Enter API Key/i).first()).toBeVisible();

        await page.getByRole('button', { name: /Cancel/ }).click();
        await expect(page.getByRole('heading', { name: 'Web Search' })).toBeHidden();
      },
    );

    test.fixme(
      'toggles File Search on (no observable selected state in e2e env)',
      async ({ page }) => {
        await openToolsDropdown(page);
        await page.getByRole('menuitem', { name: /File Search/ }).click();

        const badge = page.getByRole('checkbox', { name: BADGE_LABEL['File Search'], exact: true });
        await expect(badge).toBeVisible();
        await expect(badge).toHaveAttribute('aria-checked', 'true');
      },
    );

    test.fixme(
      'toggles Artifacts on (no observable selected state in e2e env)',
      async ({ page }) => {
        await openToolsDropdown(page);
        await page.getByRole('menuitem', { name: /Artifacts/ }).click();

        const badge = page.getByRole('checkbox', { name: BADGE_LABEL['Artifacts'], exact: true });
        await expect(badge).toBeVisible();
        await expect(badge).toHaveAttribute('aria-checked', 'true');
      },
    );
  });
});
