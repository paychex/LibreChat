import { defineConfig } from '@playwright/test';
import path from 'path';
import ciConfig from './playwright.config.ci';

/**
 * Selector probe against a deployed environment.
 *
 * Reports which candidate selectors actually resolve at runtime instead of
 * asserting them. Source analysis can only prove an element exists somewhere in
 * the codebase; this proves it resolves in the rendered DOM of a real
 * environment. Used to seed and re-validate e2e/coverage-map.json.
 *
 * Run: npx playwright test --config=e2e/playwright.config.probe.ts
 * (or dispatch the E2E Tests workflow with suite=probe)
 */
export default defineConfig({
  ...ciConfig,
  testMatch: /probe[\\/].*\.spec\.ts$/,
  outputDir: path.resolve(__dirname, 'test-results-probe'),
  retries: 0,
  reporter: [
    ['list'],
    ['json', { outputFile: path.resolve(__dirname, 'results-probe', 'results.json') }],
  ],
});
