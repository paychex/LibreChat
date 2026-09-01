import { defineConfig } from '@playwright/test';
import path from 'path';
import ciConfig from './playwright.config.ci';

/**
 * Journey suite: verifies Paychex customizations and key platform surfaces
 * against a deployed environment.
 *
 * Filter by audience with --grep, e.g. `--grep @paychex` for the customizations
 * that a bad upstream merge would silently remove.
 */
export default defineConfig({
  ...ciConfig,
  testMatch: /journeys[\\/].*\.spec\.ts$/,
  outputDir: path.resolve(__dirname, 'test-results-journeys'),
  reporter: [
    ['list'],
    [
      'html',
      { outputFolder: path.resolve(__dirname, 'playwright-report-journeys'), open: 'never' },
    ],
    ['json', { outputFile: path.resolve(__dirname, 'results-journeys', 'results.json') }],
  ],
});
