#!/usr/bin/env node
/**
 * Records the current journey-suite results as the "known good" baseline that
 * e2e-triage.mjs compares against after an upstream merge.
 *
 * Capture this from a run against a healthy environment BEFORE starting a merge.
 *
 * Usage:
 *   node scripts/e2e-baseline.mjs [--report <results.json>] [--out <baseline.json>] [--env n2a]
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

const failing = [...tests.values()].filter((t) => t.status === 'failed');
if (failing.length > 0) {
  console.warn(
    `WARNING: baselining ${failing.length} FAILING test(s). ` +
      'A baseline should normally be captured from a healthy run.',
  );
  for (const t of failing) console.warn(`  failing: ${t.key}`);
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
