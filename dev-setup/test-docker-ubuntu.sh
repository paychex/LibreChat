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

echo "╔═══════════════════════════════════════════════════════╗"
echo "║   Automated Ubuntu 24.04 Test                         ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""

cd "$SCRIPT_DIR"

# Build the test image
echo "Building Ubuntu test image..."
docker build -f Dockerfile.test-ubuntu -t librechat-setup-test-ubuntu:latest .

echo ""
echo "Running setup script in Ubuntu container..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Run the container with Docker socket mounted for Docker-in-Docker
# Use --privileged for full Docker functionality
docker run --rm \
  --privileged \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -e CI=true \
  -e AUTOMATED_TEST=true \
  librechat-setup-test-ubuntu:latest

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✓ Ubuntu test completed successfully!"
echo ""
