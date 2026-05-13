import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { loginAndGoToChat } from './mcp-helpers';

const TOOLS = ['File Search', 'Web Search', 'Artifacts'] as const;
type ToolName = (typeof TOOLS)[number];

/** Badge checkbox labels differ from dropdown menu item names */
const BADGE_NAMES: Record<ToolName, string> = {
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
  const badgeName = BADGE_NAMES[name];
  const badge = page.getByRole('checkbox', { name: badgeName, exact: true });
  if (await badge.isVisible().catch(() => false)) {
    // Only click the badge if checked; clicking an unchecked badge toggles it ON
    const isChecked = (await badge.getAttribute('aria-checked')) === 'true';
    if (isChecked) {
      await badge.click();
    }
    // If badge is still visible after toggling off (pinned tools stay visible),
    // unpin it via the dropdown menu
    if (await badge.isVisible().catch(() => false)) {
      await openToolsDropdown(page);
      const item = page.getByRole('menuitem', { name: new RegExp(name) });
      const unpinBtn = item.getByRole('button', { name: 'Unpin' });
      if (await unpinBtn.isVisible().catch(() => false)) {
        await unpinBtn.click();
      }
      await closeToolsDropdownIfOpen(page);
    }
    await expect(badge).toBeHidden();
  }
};

test.describe('Tools dropdown', () => {
  test.beforeEach(async ({ page }) => {
    await loginAndGoToChat(page);
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

    const items = page.getByRole('menuitem').filter({ has: page.locator('[aria-hidden="true"]') });
    await expect(items).toHaveCount(TOOLS.length);

    const names = await items.evaluateAll((nodes) =>
      nodes.map((n) => {
        const labelSpan = n.querySelector('.text-sm.font-medium');
        return labelSpan?.textContent?.trim() ?? (n.textContent ?? '').trim();
      }),
    );
    expect(names).toEqual([...TOOLS]);
  });

  test('each item has a label and a description (Paychex enhancement)', async ({ page }) => {
    await openToolsDropdown(page);

    const expectations: Record<string, RegExp> = {
      'File Search': /Analyze, compare, and contrast large documents/i,
      'Web Search': /search the web for up-to-date information/i,
    };

    for (const name of ['File Search', 'Web Search'] as const) {
      const item = page.getByRole('menuitem', { name: new RegExp(name) });
      await expect(item).toBeVisible();

      const descSpan = item.locator('.text-xs');
      await expect(descSpan).toBeVisible();
      await expect(descSpan).toHaveText(expectations[name]);
    }

    // Artifacts has no description (only a label)
    const artifacts = page.getByRole('menuitem', { name: /Artifacts/ });
    await expect(artifacts).toBeVisible();
    await expect(artifacts.locator('.text-xs')).toBeHidden();
  });

  test('clicking outside the dropdown closes it', async ({ page }) => {
    await openToolsDropdown(page);
    const item = page.getByRole('menuitem', { name: /File Search/ });
    await expect(item).toBeVisible();

    await page.mouse.click(5, 5);

    await expect(item).toBeHidden();
  });

  test.describe('toggling a tool on shows a selected state', () => {
    for (const name of ['File Search', 'Artifacts'] as const) {
      test(`toggles ${name} on`, async ({ page }) => {
        await openToolsDropdown(page);
        const item = page.getByRole('menuitem', { name: new RegExp(name) });
        await item.click();

        const badge = page.getByRole('checkbox', { name, exact: true });
        await expect(badge).toBeVisible();
        await expect(badge).toHaveAttribute('aria-checked', 'true');
      });
    }

    test('pinning Web Search shows its badge (enabling requires API key)', async ({ page }) => {
      await openToolsDropdown(page);
      const item = page.getByRole('menuitem', { name: /Web Search/ });
      await item.getByRole('button', { name: 'Pin' }).click();
      await page.keyboard.press('Escape');
      // Web Search badge renders with the label "Search"
      const badge = page.getByRole('checkbox', { name: 'Search', exact: true });
      await expect(badge).toBeVisible();
    });
  });
});
