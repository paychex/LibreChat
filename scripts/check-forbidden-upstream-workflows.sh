#!/bin/bash
# Fails if an upstream merge reintroduced a workflow the Paychex fork deliberately removed.
# Usage: ./scripts/check-forbidden-upstream-workflows.sh
# See .github/instructions/merge-process.instructions.md for the rationale behind each entry.

set -uo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

WORKFLOW_DIR=".github/workflows"

FORBIDDEN_WORKFLOWS=(
    # NPM publishing to the upstream LibreChat org
    "build.yml"
    "client.yml"
    "data-provider.yml"
    "data-schemas.yml"
    # Upstream deployment
    "deploy.yml"
    "deploy-dev.yml"
    # Upstream GHCR image builds
    "dev-images.yml"
    "dev-branch-images.yml"
    "dev-staging-images.yml"
    "main-image-workflow.yml"
    "tag-images.yml"
    "retry-docker-builds.yml"
    # Helm chart publishing - Paychex deploys to Azure Container Apps
    "helmcharts.yml"
    "sync-helm-chart-tags.yml"
    # Upstream-only services
    "generate_embeddings.yml"
    "locize-i18n-sync.yml"
    # GitNexus - deploys a code-search index to a DigitalOcean droplet Paychex does not own
    "gitnexus-index.yml"
    "gitnexus-deploy.yml"
    "gitnexus-pr-command.yml"
    "gitnexus-cleanup-pr.yml"
    # Gated on danny-avila/LibreChat, so it can never execute in a fork
    "a11y.yml"
)

# Supporting directories that only exist to serve a forbidden workflow.
FORBIDDEN_PATHS=(
    ".do"
    ".github/scripts/sync-helm-chart-tags.sh"
)

# Upstream branch names. A workflow keeping these registers but never runs on a Paychex PR.
STALE_BRANCHES=("dev-staging" "danny-avila/LibreChat")

FAIL_COUNT=0

echo "======================================"
echo "Forbidden Upstream Workflow Check"
echo "======================================"
echo ""

for wf in "${FORBIDDEN_WORKFLOWS[@]}"; do
    if [ -f "$WORKFLOW_DIR/$wf" ]; then
        echo -e "${RED}FAIL${NC}: $WORKFLOW_DIR/$wf was reintroduced - delete it again"
        FAIL_COUNT=$((FAIL_COUNT + 1))
    fi
done

for path in "${FORBIDDEN_PATHS[@]}"; do
    if [ -e "$path" ]; then
        echo -e "${RED}FAIL${NC}: $path was reintroduced - delete it again"
        FAIL_COUNT=$((FAIL_COUNT + 1))
    fi
done

if [ -d "$WORKFLOW_DIR" ]; then
    for marker in "${STALE_BRANCHES[@]}"; do
        while IFS= read -r match; do
            [ -z "$match" ] && continue
            echo -e "${RED}FAIL${NC}: upstream branch/repo reference '$marker' in $match"
            echo "        Rewrite to 'develop' / 'release/*' or the workflow will silently never run."
            FAIL_COUNT=$((FAIL_COUNT + 1))
        done < <(grep -rl "$marker" "$WORKFLOW_DIR" 2>/dev/null)
    done
fi

echo ""
if [ "$FAIL_COUNT" -eq 0 ]; then
    echo -e "${GREEN}PASS${NC}: no forbidden upstream workflows or stale branch filters found"
    exit 0
fi

echo -e "${RED}$FAIL_COUNT problem(s) found.${NC}"
echo "See .github/instructions/merge-process.instructions.md for rationale."
exit 1
