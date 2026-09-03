#!/usr/bin/env node
/**
 * Shared parsing for Playwright JSON reports.
 *
 * Tags arrive WITHOUT the leading '@' in the JSON reporter, even though specs
 * declare them as '@paychex'. Normalised here so callers can compare either form.
 */
import fs from 'fs';

/** Collapses per-project results into the worst outcome for the spec. */
function statusOf(spec) {
  const statuses = (spec.tests ?? []).map((t) => t.status);
  if (statuses.includes('unexpected')) return 'failed';
  if (statuses.includes('flaky')) return 'flaky';
  if (statuses.length > 0 && statuses.every((s) => s === 'skipped')) return 'skipped';
  return 'passed';
}

function walk(suites, ancestry, out) {
  for (const suite of suites ?? []) {
    // Playwright names the outermost suite after the file, which is already in the key.
    // `title` uses OS-native separators while `file` is always POSIX, so a report
    // generated on Windows only matches a Linux-captured baseline after normalising.
    const isFileSuite = (suite.title ?? '').replace(/\\/g, '/') === suite.file;
    const path = suite.title && !isFileSuite ? [...ancestry, suite.title] : ancestry;

    for (const spec of suite.specs ?? []) {
      const file = spec.file ?? suite.file ?? '';
      // Keyed on location + title rather than Playwright's hash id, so a moved
      // or renamed test reads as removed+added instead of silently mismatching.
      const key = `${file} :: ${[...path, spec.title].join(' > ')}`;
      out.set(key, {
        key,
        file,
        title: spec.title,
        tags: (spec.tags ?? []).map((t) => (t.startsWith('@') ? t : `@${t}`)),
        status: statusOf(spec),
      });
    }

    walk(suite.suites, path, out);
  }
}

export function readReport(reportPath) {
  if (!fs.existsSync(reportPath)) {
    throw new Error(`Playwright report not found: ${reportPath}`);
  }
  const raw = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  const tests = new Map();
  walk(raw.suites, [], tests);
  return { tests, stats: raw.stats ?? {} };
}

export function tagOf(entry) {
  for (const audience of ['@paychex', '@upstream', '@platform']) {
    if (entry.tags.includes(audience)) return audience;
  }
  return '@untagged';
}
