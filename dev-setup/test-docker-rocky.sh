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

# Copy corporate certificates to build context if they exist
# Otherwise create a dummy certificate so COPY doesn't fail
if [ -d "/usr/local/share/ca-certificates" ] && [ -n "$(ls -A /usr/local/share/ca-certificates/*.crt 2>/dev/null)" ]; then
    echo "Copying corporate CA certificates to build context..."
    cp /usr/local/share/ca-certificates/*.crt .
else
    echo "No corporate certificates found, creating dummy certificate..."
    touch dummy.crt
fi

# Build the test image
echo "Building Rocky Linux test image..."
docker build -f Dockerfile.test-rocky -t librechat-setup-test-rocky:latest .

# Clean up copied/dummy certificates
rm -f ./*.crt 2>/dev/null || true

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
