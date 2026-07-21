#!/usr/bin/env bash
# Resilient `npm ci` wrapper for CI workflows.
#
# `npm ci` occasionally fails in CI with a transient npm CLI bug
# ("npm error Exit handler never called!") that is unrelated to the
# repository's dependency tree — it stems from npm's own fetch/extract
# handling under network flakiness or high install concurrency (common
# with this monorepo's large set of optional platform-specific native
# binaries, e.g. rollup/rolldown/sharp/canvas). Retrying the install is
# the standard workaround (see npm/cli issues tracking this bug).
set -uo pipefail

max_attempts=3
attempt=1

until npm ci; do
  if [ "$attempt" -ge "$max_attempts" ]; then
    echo "npm ci failed after ${max_attempts} attempts" >&2
    exit 1
  fi
  echo "npm ci failed (attempt ${attempt}/${max_attempts}). Retrying in 10s..." >&2
  npm cache clean --force || true
  sleep 10
  attempt=$((attempt + 1))
done
