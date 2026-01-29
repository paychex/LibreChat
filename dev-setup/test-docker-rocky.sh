#!/usr/bin/env bash
#
# Automated Rocky Linux Testing
#
# Builds a Docker image from scratch and runs the setup script
# to verify it works in a clean Rocky Linux 9 environment.
#
# This is designed for CI/CD and automated validation.
#
# Usage:
#   ./test-docker-rocky.sh
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "╔═══════════════════════════════════════════════════════╗"
echo "║   Automated Rocky Linux 9 Test                        ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""

cd "$SCRIPT_DIR"

# Build the test image
echo "Building Rocky Linux test image..."
docker build -f Dockerfile.test-rocky -t librechat-setup-test-rocky:latest .

echo ""
echo "Running setup script in Rocky Linux container..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Run the container with Docker socket mounted for Docker-in-Docker
# Use --privileged for full Docker functionality
docker run --rm \
  --privileged \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -e CI=true \
  -e AUTOMATED_TEST=true \
  librechat-setup-test-rocky:latest

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✓ Rocky Linux test completed successfully!"
echo ""
