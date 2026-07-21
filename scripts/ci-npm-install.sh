#!/usr/bin/env bash
# Resilient `npm ci` wrapper for CI workflows.
#
# Wraps `npm ci` with retry logic in case of transient failures (network
# flakiness, registry timeouts) that occasionally occur on GitHub Actions
# runners when installing this monorepo's large dependency tree.
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
