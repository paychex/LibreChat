#!/usr/bin/env node
/**
 * Records the current journey-suite results as the "known good" baseline that
 * e2e-triage.mjs compares against after an upstream merge.
 *
 * Capture this from a run against a healthy environment BEFORE starting a merge.
 *
 * Usage:
 *   node scripts/e2e-baseline.mjs [--report <results.json>] [--out <baseline.json>] [--env n2a]
 *                                 [--allow-dirty]
 *
 * Exit codes: 0 = baseline written, 1 = report unusable or not known-good.
 */
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { readReport, tagOf } from './e2e-report.mjs';

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const reportPath = path.resolve(arg('report', 'e2e/results-journeys/results.json'));
const outPath = path.resolve(arg('out', 'e2e/baseline.json'));
const environment = arg('env', process.env.E2E_ENVIRONMENT ?? 'unknown');
const allowDirty = process.argv.includes('--allow-dirty');

function gitRev() {
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}

const { tests, stats } = readReport(reportPath);

if (tests.size === 0) {
  console.error('Refusing to write an empty baseline — the report contained no tests.');
  process.exit(1);
}

// A failed or skipped entry is recorded as "not passing", and triage only reports a
// regression on pass -> fail. Baselining either state therefore permanently disables
// the HARD STOP for that test, which is the one guarantee this tooling exists to give.
const notKnownGood = [...tests.values()].filter(
  (t) => t.status === 'failed' || t.status === 'skipped',
);
if (notKnownGood.length > 0) {
  const log = allowDirty ? console.warn : console.error;
  log(
    `${allowDirty ? 'WARNING' : 'Refusing to write baseline'}: ${notKnownGood.length} test(s) ` +
      'did not pass. A baseline must be captured from a healthy run, or these tests can ' +
      'never report a regression again.',
  );
  for (const t of notKnownGood) log(`  ${t.status.padEnd(7)} ${tagOf(t)} ${t.key}`);
  if (!allowDirty) {
    console.error('\nFix the environment and re-run, or pass --allow-dirty to accept this state.');
    process.exit(1);
  }
}

// Flaky is deliberately accepted: triage counts it as a pass, so a flaky baseline entry
// still hard-stops if it turns into a hard failure after a merge.
const flaky = [...tests.values()].filter((t) => t.status === 'flaky');
if (flaky.length > 0) {
  console.warn(`WARNING: baselining ${flaky.length} FLAKY test(s) as passing.`);
  for (const t of flaky) console.warn(`  flaky: ${t.key}`);
}

const baseline = {
  capturedAt: new Date().toISOString(),
  environment,
  commit: gitRev(),
  stats,
  tests: Object.fromEntries(
    [...tests.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, t]) => [key, { status: t.status, tag: tagOf(t), tags: t.tags, file: t.file }]),
  ),
};

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify(baseline, null, 2)}\n`);

const byTag = {};
for (const t of tests.values()) byTag[tagOf(t)] = (byTag[tagOf(t)] ?? 0) + 1;

console.log(`Baseline written: ${path.relative(process.cwd(), outPath)}`);
console.log(`  environment: ${environment}`);
console.log(`  commit:      ${baseline.commit}`);
console.log(`  tests:       ${tests.size}`);
for (const [tag, count] of Object.entries(byTag).sort()) {
  console.log(`    ${tag.padEnd(12)} ${count}`);
}
