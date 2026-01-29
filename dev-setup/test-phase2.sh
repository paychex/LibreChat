#!/usr/bin/env bash
#
# Quick test of Phase 2 installation functions
#

set -euo pipefail

cd "$(dirname "$0")"

echo "======================================"
echo "Testing Phase 2 Functions"
echo "======================================"
echo ""

# Source the main script to get functions
source ./setup-dev-env.sh

echo "Testing Node.js detection..."
if detect_node; then
    echo "✓ Node.js $NODE_VERSION detected"
else
    echo "✗ Node.js not found"
fi

echo ""
echo "Testing Docker detection..."
if detect_docker; then
    echo "✓ Docker $DOCKER_VERSION detected"
else
    echo "✗ Docker not found"
fi

echo ""
echo "Testing GitHub CLI detection..."
if detect_github_cli; then
    echo "✓ GitHub CLI $GH_VERSION detected"
else
    echo "✗ GitHub CLI not found"
fi

echo ""
echo "Testing MongoDB detection..."
if detect_mongodb_container; then
    echo "✓ MongoDB container found"
else
    echo "✗ MongoDB container not found"
fi

echo ""
echo "======================================"
echo "Phase 2 Detection Tests Complete"
echo "======================================"
