#!/usr/bin/env bash
# Resilient `npm ci` wrapper for CI workflows.
#
# npm bundled with Node 24 (npm 11.x) has a deterministic "Exit handler
# never called!" crash when installing large monorepos with many optional
# native platform binaries (rollup/rolldown/sharp/canvas). This is a
# known npm CLI bug (https://github.com/npm/cli/issues). The fix is to
# downgrade to npm 10.x (the Node 22 LTS-era npm) which does not have
# this issue, then run npm ci with reduced concurrency as a safety net.
set -uo pipefail

# Downgrade npm to 10.x to avoid the "Exit handler never called!" bug in npm 11
echo "Installing npm@10 to work around Node 24 npm bug..."
npm install -g npm@10 2>/dev/null || true

max_attempts=3
attempt=1

until npm ci --maxsockets=10; do
  if [ "$attempt" -ge "$max_attempts" ]; then
    echo "npm ci failed after ${max_attempts} attempts" >&2
    exit 1
  fi
  echo "npm ci failed (attempt ${attempt}/${max_attempts}). Retrying in 10s..." >&2
  npm cache clean --force || true
  sleep 10
  attempt=$((attempt + 1))
done
