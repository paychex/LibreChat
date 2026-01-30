#!/usr/bin/env bash
#
# Interactive Rocky Linux Testing Environment
#
# Launches a fresh Rocky Linux 9 container with your local LibreChat
# code mounted. This allows you to manually run and test setup-dev-env.sh
# in a clean Rocky Linux environment.
#
# Usage:
#   ./interactive-test-rocky.sh
#
# Inside the container:
#   cd /workspace/dev-setup
#   ./setup-dev-env.sh
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "╔═══════════════════════════════════════════════════════╗"
echo "║   Interactive Rocky Linux 9 Testing Environment       ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""
echo "This will:"
echo "  • Launch Rocky Linux 9 container"
echo "  • Mount your LibreChat code at /workspace"
echo "  • Install minimal bootstrap tools (git, curl, sudo)"
echo "  • Drop you into an interactive shell"
echo ""
echo "Inside the container, run:"
echo "  cd /workspace/dev-setup"
echo "  ./setup-dev-env.sh"
echo ""
read -p "Press Enter to continue or Ctrl+C to cancel..."

echo ""
echo "Starting Rocky Linux 9 container..."
echo ""

# Use --privileged to allow Docker-in-Docker
# Mount the repo at /workspace
# Mount VDI CA certificates for corporate SSL (Rocky uses different path)
docker run -it --rm \
  --privileged \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v "$REPO_ROOT:/workspace" \
  -v /usr/local/share/ca-certificates:/usr/local/share/ca-certificates:ro \
  -w /workspace \
  --hostname rocky-test \
  rockylinux:9 \
  bash -c '
    echo "Setting up minimal environment..."
    echo "Installing git, curl, sudo, ca-certificates..."
    # Temporarily disable SSL verification for initial package install
    echo "sslverify=false" >> /etc/dnf/dnf.conf
    # Use --allowerasing to handle curl-minimal conflict
    dnf install -y --allowerasing git curl sudo ca-certificates
    # Re-enable SSL verification
    sed -i "/sslverify=false/d" /etc/dnf/dnf.conf
    
    # Update CA trust for both root and future users
    update-ca-trust
    echo "CA trust updated"
    
    # Copy mounted certs to Rocky location and update trust
    if [ -d /usr/local/share/ca-certificates ]; then
      cp /usr/local/share/ca-certificates/*.crt /etc/pki/ca-trust/source/anchors/ 2>/dev/null || true
    fi
    update-ca-trust 2>/dev/null
    
    # Create a non-root user similar to VDI environment
    useradd -m -s /bin/bash testuser
    usermod -aG wheel testuser
    echo "testuser ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers
    
    echo ""
    echo "═══════════════════════════════════════════════════════"
    echo "  Rocky Linux 9 Test Environment Ready!"
    echo "═══════════════════════════════════════════════════════"
    echo ""
    echo "  Your LibreChat code is mounted at: /workspace"
    echo "  Setup script location: /workspace/dev-setup/setup-dev-env.sh"
    echo ""
    echo "  Quick start:"
    echo "    cd /workspace/dev-setup"
    echo "    ./setup-dev-env.sh"
    echo ""
    echo "  You are currently root. Switch to testuser with:"
    echo "    su - testuser"
    echo "    cd /workspace/dev-setup"
    echo ""
    echo "  Type '\''exit'\'' when done to destroy this container"
    echo "═══════════════════════════════════════════════════════"
    echo ""
    
    # Start interactive bash as root (user can su to testuser if needed)
    exec bash
  '

echo ""
echo "Container exited. Environment destroyed."
