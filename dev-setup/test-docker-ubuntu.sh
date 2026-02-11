#!/usr/bin/env bash
#
# Automated Ubuntu Testing
#
# Builds a Docker image from scratch and runs the setup script
# to verify it works in a clean Ubuntu 24.04 environment.
#
# This is designed for CI/CD and automated validation.
#
# Usage:
#   ./test-docker-ubuntu.sh
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "╔═══════════════════════════════════════════════════════╗"
echo "║   Automated Ubuntu 24.04 Test                         ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""

# Build from repo root so we can copy .env.example and package.json
cd "$REPO_ROOT"

# Build the test image
echo "Building Ubuntu test image..."
docker build -f dev-setup/Dockerfile.test-ubuntu -t librechat-setup-test-ubuntu:latest .

echo ""
echo "Running setup script in Ubuntu container..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Run the container with Docker socket mounted for Docker-in-Docker
# Use --privileged for full Docker functionality
# Mount host CA certificates for SSL verification
# After setup, validate critical success criteria
docker run --rm \
  --privileged \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /usr/local/share/ca-certificates:/usr/local/share/ca-certificates:ro \
  -e CI=true \
  -e AUTOMATED_TEST=true \
  librechat-setup-test-ubuntu:latest \
  bash -c '
    # Update CA certificates to include mounted corporate certs
    sudo update-ca-certificates 2>/dev/null || true
    
    /workspace/dev-setup/setup-dev-env.sh
    
    echo ""
    echo "Validating setup success criteria..."
    echo ""
    
    # Source nvm so node is available in this subprocess
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    
    VALIDATION_FAILED=0
    
    # Check .env file was created
    if [ -f /workspace/.env ]; then
        echo "✓ .env file created"
    else
        echo "✗ .env file missing"
        VALIDATION_FAILED=1
    fi
    
    # Check node is installed
    if command -v node >/dev/null 2>&1; then
        echo "✓ Node.js installed: $(node -v)"
    else
        echo "✗ Node.js not found"
        VALIDATION_FAILED=1
    fi
    
    # Check docker is installed
    if command -v docker >/dev/null 2>&1; then
        echo "✓ Docker installed: $(docker --version | grep -oP "\d+\.\d+\.\d+" | head -1)"
    else
        echo "✗ Docker not found"
        VALIDATION_FAILED=1
    fi
    
    # Check node_modules exists
    if [ -d /workspace/node_modules ]; then
        echo "✓ Dependencies installed (node_modules exists)"
    else
        echo "✗ node_modules directory missing"
        VALIDATION_FAILED=1
    fi
    
    echo ""
    
    if [ $VALIDATION_FAILED -eq 0 ]; then
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "✓ All validation checks passed!"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        exit 0
    else
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "✗ Validation failed - setup incomplete"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        exit 1
    fi
  '

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✓ Ubuntu test completed successfully!"
echo ""
