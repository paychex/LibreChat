#!/usr/bin/env bash
# Resilient `npm ci` wrapper for CI workflows.
#
# This monorepo's large dependency tree (~1.2 GB node_modules, 160+
# optional native platform binaries) can trigger npm's "Exit handler
# never called!" crash on GitHub Actions runners due to memory pressure
# during parallel package extraction + script execution. Mitigations:
#   1. --ignore-scripts: skip native module compilation during extraction
#   2. Separate npm rebuild: compile native bindings after extraction
#   3. Retry with cache clean for genuine transient failures
set -uo pipefail

max_attempts=3
attempt=1

until npm ci --ignore-scripts; do
  if [ "$attempt" -ge "$max_attempts" ]; then
    echo "npm ci failed after ${max_attempts} attempts" >&2
    exit 1
  fi
  echo "npm ci failed (attempt ${attempt}/${max_attempts}). Retrying in 10s..." >&2
  npm cache clean --force || true
  sleep 10
  attempt=$((attempt + 1))
done

# Run lifecycle scripts (postinstall/prepare) separately to avoid
# peak memory from running extraction + compilation simultaneously
npm rebuild 2>/dev/null || true
done
