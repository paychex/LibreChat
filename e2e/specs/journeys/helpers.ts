import type { Locator, Page } from '@playwright/test';

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

export type ModelSpecSummary = {
  name: string;
  label: string;
  /** Custom group submenu the spec renders under, when configured. */
  group?: string;
  /** Endpoint submenu the spec renders under, when it maps to a rendered endpoint. */
  endpoint?: string;
};

/**
 * Resolves the spec flagged `default: true` from the deployed config, so tests follow
 * whatever is actually configured instead of a hardcoded endpoint and model name.
 * Returns null when no spec is flagged, which is a config problem rather than a
 * missing customization — callers should report the two differently.
 *
 * `GET /api/config` runs under `optionalJwtAuth` and answers anonymous callers with a
 * 200 that omits `modelSpecs` entirely. The bearer token lives only in the app's axios
 * defaults, so `page.request` — which replays cookies but no Authorization header —
 * always gets the anonymous payload. We therefore navigate and read the authenticated
 * response the app itself receives; callers do not need to call `gotoChat` first.
 */
export async function getDefaultModelSpec(page: Page): Promise<ModelSpecSummary | null> {
  // Each load fires /api/config twice (once before the session is restored, once after),
  // and only the second carries the token — hence the header predicate.
  const authenticated = page.waitForResponse(
    async (response) =>
      new URL(response.url()).pathname === '/api/config' &&
      response.request().method() === 'GET' &&
      (await response.request().headerValue('authorization')) != null,
    { timeout: 30000 },
  );

  const [response] = await Promise.all([authenticated, gotoChat(page)]);

  if (!response.ok()) {
    throw new Error(`GET /api/config failed: ${response.status()} ${response.statusText()}`);
  }

  const body = (await response.json()) as {
    modelSpecs?: {
      list?: Array<{
        name: string;
        label?: string;
        default?: boolean;
        group?: string;
        preset?: { endpoint?: string };
      }>;
    };
  };

  const spec = (body.modelSpecs?.list ?? []).find((entry) => entry.default === true);
  if (!spec) {
    return null;
  }

  return {
    name: spec.name,
    label: spec.label ?? spec.name,
    group: spec.group,
    endpoint: spec.preset?.endpoint,
  };
}

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Builds an accessible-name matcher from a raw config value: `azureOpenAI` has to match
 * the rendered "Azure OpenAI", so camelCase boundaries become optional whitespace.
 */
function namePattern(value: string): RegExp {
  const spaced = value.replace(/([a-z0-9])([A-Z])/g, '$1 $2');
  return new RegExp(escapeRegex(spaced).replace(/\s+/g, '\\s*'), 'i');
}

/**
 * Opens the model selector and returns the option for `spec`.
 *
 * A spec renders at the top level only when it has no group and its endpoint is not
 * rendered as its own submenu; otherwise it lives in a lazily-mounted submenu that has
 * to be opened before the option exists in the DOM. Both submenu candidates come from
 * config, so a model or endpoint rename cannot silently break this.
 */
export async function openModelSpecOption(page: Page, spec: ModelSpecSummary): Promise<Locator> {
  await page.getByTestId('model-selector-button').click();
  await page.getByRole('option').first().waitFor({ state: 'visible', timeout: 15000 });

  // Bounded rather than isVisible(): the menu renders asynchronously, but a miss here is
  // expected (the spec is usually one submenu down) and must not burn the test timeout.
  const resolves = (locator: Locator) =>
    locator
      .waitFor({ state: 'visible', timeout: 3000 })
      .then(() => true)
      .catch(() => false);

  const specOption = () => page.getByRole('option', { name: namePattern(spec.label) }).first();

  const topLevel = specOption();
  if (await resolves(topLevel)) {
    return topLevel;
  }

  const candidates = [spec.group, spec.endpoint].filter((value): value is string => !!value);
  for (const candidate of candidates) {
    const submenu = page.getByRole('option', { name: namePattern(candidate) }).first();
    if (!(await resolves(submenu))) {
      continue;
    }
    await submenu.click();

    const option = specOption();
    if (await resolves(option)) {
      return option;
    }
  }

  const visible = await page
    .getByRole('option')
    .allInnerTexts()
    .catch(() => [] as string[]);
  throw new Error(
    `Could not reach model spec "${spec.label}" (${spec.name}) in the model selector.\n` +
      `  submenus tried: ${candidates.length > 0 ? candidates.join(', ') : '<none configured>'}\n` +
      `  options visible: ${JSON.stringify(visible)}`,
  );
}
