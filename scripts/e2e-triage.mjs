#!/usr/bin/env node
/**
 * Compares a journey-suite run against the recorded baseline and attributes any
 * regression to an audience, so an upstream merge can be judged quickly:
 *
 *   @paychex  pass -> fail  the merge clobbered a Paychex customization (hard stop)
 *   @upstream pass -> fail  the upgrade changed or removed upstream behaviour
 *   @platform pass -> fail  the environment itself is unhealthy
 *
 * Usage:
 *   node scripts/e2e-triage.mjs [--report <results.json>] [--baseline <baseline.json>]
 *
 * Exit codes: 0 = no regressions, 1 = regressions found, 2 = inputs unusable.
 */
import fs from 'fs';
import path from 'path';
import { readReport, tagOf } from './e2e-report.mjs';

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const reportPath = path.resolve(arg('report', 'e2e/results-journeys/results.json'));
const baselinePath = path.resolve(arg('baseline', 'e2e/baseline.json'));

if (!fs.existsSync(baselinePath)) {
  console.error(`No baseline at ${baselinePath}. Capture one first:`);
  console.error('  node scripts/e2e-baseline.mjs --env n2a');
  process.exit(2);
}

let current;
let baseline;
try {
  current = readReport(reportPath);
  baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
} catch (err) {
  console.error(String(err.message ?? err));
  process.exit(2);
}

// An empty or malformed test map would make every current test read as "new", so a run
// full of failures would report a clean bill of health.
if (
  baseline === null ||
  typeof baseline !== 'object' ||
  baseline.tests === null ||
  typeof baseline.tests !== 'object' ||
  Array.isArray(baseline.tests) ||
  Object.keys(baseline.tests).length === 0
) {
  console.error(`Baseline at ${baselinePath} has no usable "tests" map. Recapture it:`);
  console.error('  node scripts/e2e-baseline.mjs --env n2a');
  process.exit(2);
}

const baseTests = baseline.tests;

const isPass = (status) => status === 'passed' || status === 'flaky';

const regressions = [];
const fixed = [];
const added = [];
const removed = [];
const stillFailing = [];
const nowFlaky = [];
const retagged = [];

const baselineTagOf = (before) => before.tag ?? tagOf({ tags: before.tags ?? [] });

for (const [key, entry] of current.tests) {
  const before = baseTests[key];

  if (!before) {
    added.push({ key, tag: tagOf(entry), status: entry.status });
    continue;
  }

  // Ownership comes from the baseline: a merge that strips '@paychex' off an existing
  // spec must not be able to downgrade its own hard stop.
  const tag = baselineTagOf(before);
  const currentTag = tagOf(entry);
  if (currentTag !== tag) retagged.push({ key, from: tag, to: currentTag });

  if (entry.status === 'flaky') nowFlaky.push({ key, tag });

  if (isPass(before.status) && !isPass(entry.status)) {
    regressions.push({ key, tag, from: before.status, to: entry.status });
  } else if (!isPass(before.status) && isPass(entry.status)) {
    fixed.push({ key, tag });
  } else if (!isPass(before.status) && !isPass(entry.status)) {
    stillFailing.push({ key, tag });
  }
}

for (const [key, before] of Object.entries(baseTests)) {
  if (!current.tests.has(key)) {
    removed.push({ key, tag: baselineTagOf(before) });
  }
}

const section = (title, rows, render) => {
  if (rows.length === 0) return;
  console.log(`\n${title} (${rows.length})`);
  for (const row of rows) console.log(`  ${render(row)}`);
};

console.log('='.repeat(72));
console.log('E2E TRIAGE');
console.log('='.repeat(72));
console.log(`baseline : ${path.relative(process.cwd(), baselinePath)}`);
console.log(
  `           ${baseline.environment ?? 'unknown env'} @ ${baseline.commit ?? 'unknown'}`,
);
console.log(`captured : ${baseline.capturedAt ?? 'unknown'}`);
console.log(`current  : ${path.relative(process.cwd(), reportPath)} (${current.tests.size} tests)`);

const byTag = (tag) => regressions.filter((r) => r.tag === tag);
const paychexRegressions = byTag('@paychex');
const upstreamRegressions = byTag('@upstream');
const platformRegressions = byTag('@platform');
const otherRegressions = regressions.filter(
  (r) => !['@paychex', '@upstream', '@platform'].includes(r.tag),
);

section('HARD STOP - Paychex customization regressed', paychexRegressions, (r) => `${r.key}`);
section('Upstream behaviour regressed', upstreamRegressions, (r) => `${r.key}`);
section('Platform / environment regressed', platformRegressions, (r) => `${r.key}`);
section('Untagged regressions', otherRegressions, (r) => `${r.tag} ${r.key}`);
section('Still failing (also failing in baseline)', stillFailing, (r) => `${r.tag} ${r.key}`);
section('Fixed since baseline', fixed, (r) => `${r.tag} ${r.key}`);
section('Flaky in this run', nowFlaky, (r) => `${r.tag} ${r.key}`);
section('New tests (not in baseline)', added, (r) => `${r.tag} ${r.key}`);
// Classification still uses the baseline tag, so drift is informational — but losing
// '@paychex' off a spec is itself a sign the merge touched a Paychex-owned test.
section(
  'Audience tag changed since baseline (classified using the baseline tag)',
  retagged,
  (r) => `${r.from} -> ${r.to}  ${r.key}`,
);

// Coverage deleted during a merge is as dangerous as coverage failing.
const removedPaychex = removed.filter((r) => r.tag === '@paychex');
section('REMOVED tests - coverage disappeared', removed, (r) => `${r.tag} ${r.key}`);

console.log(`\n${'='.repeat(72)}`);
if (paychexRegressions.length > 0) {
  console.log('VERDICT: HARD STOP.');
  console.log(
    `A merge or deploy broke ${paychexRegressions.length} Paychex customization(s). ` +
      'Do not ship until these are restored.',
  );
} else if (removedPaychex.length > 0) {
  console.log('VERDICT: HARD STOP.');
  console.log(
    `${removedPaychex.length} Paychex test(s) vanished from the suite. ` +
      'Coverage was deleted rather than fixed.',
  );
} else if (regressions.length > 0) {
  console.log('VERDICT: REGRESSIONS FOUND (no Paychex customization affected).');
  console.log('Attribute to the upgrade or the environment using the sections above.');
} else {
  console.log('VERDICT: No regressions against baseline.');
}
console.log('='.repeat(72));

const failed = regressions.length > 0 || removedPaychex.length > 0;
process.exit(failed ? 1 : 0);
