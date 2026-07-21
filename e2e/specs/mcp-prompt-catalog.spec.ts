import type { Page, Route } from '@playwright/test';
import { test, expect } from '@playwright/test';
import { loginAndGoToChat } from './mcp-helpers';

/**
 * Tests for the Paychex Prompt Catalog section that lives at the bottom of the
 * Prompts control-panel sidebar (CatalogList.tsx).
 *
 * The Prompt Catalog calls GET /api/prompthub/catalog which proxies to the
 * external Prompt Catalog API. We intercept that route so the specs do not
 * depend on the live catalog or its content and so we can drive pagination
 * and search assertions deterministically.
 */

type CatalogPrompt = {
  id: number;
  title: string;
  content: string;
  category: string;
  ai_tool: string;
  tags: string[];
  creator_name: string;
  thumbs_up_count: number;
};

const API_PAGE_SIZE = 50;
const LOCAL_PAGE_SIZE = 5;

function makePrompt(i: number): CatalogPrompt {
  return {
    id: i,
    title: `Mock Prompt ${i}`,
    content: `Content for prompt ${i}`,
    category: 'general',
    ai_tool: 'chatgpt',
    tags: [],
    creator_name: 'Tester',
    thumbs_up_count: 0,
  };
}

async function mockCatalog(
  page: Page,
  options: { totalCount: number; titleForSearch?: string } = { totalCount: 12 },
): Promise<void> {
  // The Prompt Catalog `useGetPromptCatalog` hook calls the same-origin,
  // JWT-authenticated proxy at /api/prompthub/catalog, which forwards to the
  // external Prompt Catalog API server-side (see
  // packages/api/src/promptCatalog/handlers.ts). We intercept the proxy route
  // so the specs do not depend on the live catalog or its content and so we
  // can drive pagination and search assertions deterministically.
  await page.route('**/api/prompthub/catalog**', async (route: Route) => {
    const url = new URL(route.request().url());
    const search = url.searchParams.get('search') ?? '';
    const apiPage = Number(url.searchParams.get('page') ?? '1');

    const total = search ? 1 : options.totalCount;
    const all: CatalogPrompt[] = Array.from({ length: total }, (_, i) => {
      const p = makePrompt(i + 1);
      if (search) {
        p.title = options.titleForSearch ?? `${search} match`;
      }
      return p;
    });
    const start = (apiPage - 1) * API_PAGE_SIZE;
    const slice = all.slice(start, start + API_PAGE_SIZE);

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        prompts: slice,
        pagination: {
          page: apiPage,
          page_size: API_PAGE_SIZE,
          total_count: total,
          total_pages: Math.max(1, Math.ceil(total / API_PAGE_SIZE)),
          has_next: start + API_PAGE_SIZE < total,
          has_prev: apiPage > 1,
        },
      }),
    });
  });
}

async function openPromptsPanel(page: Page): Promise<void> {
  // Upstream v0.8.6 changed the right-hand controls from `<nav aria-label="Controls">`
  // to `<aside aria-label="Control Panel">` (Redesign Sidebar with Unified Icon Strip
  // Layout). Click the Prompts toggle by its aria-label inside that aside.
  await page
    .getByRole('complementary', { name: 'Control Panel' })
    .getByRole('button', { name: 'Prompts', exact: true })
    .click();
  await expect(page.getByRole('button', { name: 'Prompt Catalog', exact: true })).toBeVisible({
    timeout: 10000,
  });
}

test.describe('Control Panel: Prompt Catalog', () => {
  test.beforeEach(async ({ page }) => {
    await mockCatalog(page);
    await loginAndGoToChat(page);
    await openPromptsPanel(page);
  });

  test('renders the Prompt Catalog header, search box, and items', async ({ page }) => {
    const header = page.getByRole('button', { name: 'Prompt Catalog', exact: true });
    await expect(header).toBeVisible();
    await expect(header).toHaveAttribute('aria-expanded', 'true');

    const searchBox = page.getByRole('searchbox', { name: 'Search catalog prompts...' });
    await expect(searchBox).toBeVisible();

    // First local page = 5 items.
    for (let i = 1; i <= LOCAL_PAGE_SIZE; i++) {
      await expect(page.getByText(`Mock Prompt ${i}`, { exact: true })).toBeVisible();
    }
  });

  test('collapses and expands the Prompt Catalog section', async ({ page }) => {
    const header = page.getByRole('button', { name: 'Prompt Catalog', exact: true });
    const searchBox = page.getByRole('searchbox', { name: 'Search catalog prompts...' });

    await header.click();
    await expect(header).toHaveAttribute('aria-expanded', 'false');
    await expect(searchBox).toBeHidden();

    await header.click();
    await expect(header).toHaveAttribute('aria-expanded', 'true');
    await expect(searchBox).toBeVisible();
  });

  test('pagination shows page indicator and navigates Prev/Next', async ({ page }) => {
    // 12 items / 5 per local page => 3 local pages.
    const catalogNav = page.getByRole('navigation', { name: 'Prompt Catalog' });
    await expect(catalogNav).toBeVisible();

    const prev = catalogNav.getByRole('button', { name: 'Prev' });
    const next = catalogNav.getByRole('button', { name: 'Next' });

    await expect(catalogNav.getByText('1 / 3', { exact: true })).toBeVisible();
    await expect(prev).toBeDisabled();
    await expect(next).toBeEnabled();

    await next.click();
    await expect(catalogNav.getByText('2 / 3', { exact: true })).toBeVisible();
    await expect(prev).toBeEnabled();
    await expect(next).toBeEnabled();
    await expect(page.getByText('Mock Prompt 6', { exact: true })).toBeVisible();

    await next.click();
    await expect(catalogNav.getByText('3 / 3', { exact: true })).toBeVisible();
    await expect(next).toBeDisabled();
    await expect(page.getByText('Mock Prompt 11', { exact: true })).toBeVisible();

    await prev.click();
    await expect(catalogNav.getByText('2 / 3', { exact: true })).toBeVisible();
  });

  test('typing in the search box filters the catalog list', async ({ page }) => {
    const searchBox = page.getByRole('searchbox', { name: 'Search catalog prompts...' });
    await searchBox.fill('alpha');

    await expect(page.getByText('alpha match', { exact: true })).toBeVisible();
    await expect(page.getByText('Mock Prompt 1', { exact: true })).toBeHidden();
    // With 1 result, the local pagination control should not render.
    await expect(page.getByRole('navigation', { name: 'Prompt Catalog' })).toBeHidden();
  });

  test('shows empty state when the catalog returns no prompts', async ({ page }) => {
    // Override route with an empty payload before triggering a re-fetch.
    await page.unroute('**/api/prompthub/catalog**');
    await page.route('**/api/prompthub/catalog**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          prompts: [],
          pagination: {
            page: 1,
            page_size: API_PAGE_SIZE,
            total_count: 0,
            total_pages: 0,
            has_next: false,
            has_prev: false,
          },
        }),
      });
    });

    // Trigger a re-fetch via search input.
    await page.getByRole('searchbox', { name: 'Search catalog prompts...' }).fill('zzz-no-match');
    await expect(page.getByText('No catalog prompts available', { exact: true })).toBeVisible();
  });

  test('clicking a catalog item populates the chat input with the prompt content', async ({
    page,
  }) => {
    // Auto-send is on by default in the upstream v0.8.6 sidebar (the
    // \"Send prompts on select\" toggle). Turn it off so the catalog item
    // populates the chat input instead of submitting immediately.
    const sendPromptsOnSelect = page.getByRole('button', {
      name: 'Send prompts on select',
      exact: true,
    });
    if ((await sendPromptsOnSelect.getAttribute('aria-pressed')) === 'true') {
      await sendPromptsOnSelect.click();
      await expect(sendPromptsOnSelect).toHaveAttribute('aria-pressed', 'false');
    }

    await page
      .getByRole('button', { name: 'Mock Prompt 1 prompt, general category', exact: true })
      .click();
    const input = page.getByRole('textbox', { name: 'Message input' });
    await expect(input).toHaveValue('Content for prompt 1');
  });
});
