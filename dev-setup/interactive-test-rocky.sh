#!/usr/bin/env bash
#
# Interactive Rocky Linux Testing Environment
#
# Launches a fresh Rocky Linux 9 container with your local LibreChat
# code mounted. This allows you to manually run and test setup-dev-env.sh
# in a clean Rocky Linux environment.
#
# Usage:
#   ./interactive-test-rocky.sh                    # Mount current repo (read-only)
#   ./interactive-test-rocky.sh --fresh            # Clone fresh from origin/main
#   ./interactive-test-rocky.sh --fresh --branch <name>  # Clone specific branch
#
# Inside the container:
#   cd /workspace/dev-setup
#   ./setup-dev-env.sh
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Parse arguments
FRESH_CLONE=false
BRANCH_NAME=""
while [[ $# -gt 0 ]]; do
    case $1 in
        --fresh)
            FRESH_CLONE=true
            shift
            ;;
        --branch)
            BRANCH_NAME="$2"
            shift 2
            ;;
        *)
            echo "Unknown option: $1"
            echo "Usage: $0 [--fresh] [--branch <name>]"
            exit 1
            ;;
    esac
done

echo "╔═══════════════════════════════════════════════════════╗"
echo "║   Interactive Rocky Linux 9 Testing Environment       ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""
echo "This will:"
echo "  • Launch Rocky Linux 9 container"
if [ "$FRESH_CLONE" = true ]; then
    if [ -n "$BRANCH_NAME" ]; then
        echo "  • Clone FRESH LibreChat from GitHub (branch: $BRANCH_NAME) at /workspace"
    else
        echo "  • Clone FRESH LibreChat from GitHub (default branch) at /workspace"
    fi
else
    echo "  • Mount your LibreChat code at /workspace (read-only)"
fi
echo "  • Install minimal bootstrap tools (git, curl, sudo)"
echo "  • Drop you into an interactive shell"
echo ""
echo "Inside the container, run:"
echo "  cd /workspace/dev-setup"
echo "  ./setup-dev-env.sh"
echo ""
if [ "$FRESH_CLONE" = false ]; then
    echo "TIP: Use --fresh flag to test with a clean GitHub clone"
    echo ""
fi
read -p "Press Enter to continue or Ctrl+C to cancel..."

echo ""
echo "Starting Rocky Linux 9 container..."
echo ""

# Generate unique hostname to prevent Docker layer caching
CONTAINER_NAME="rocky-test-$(date +%s)"

# Build volume mount arguments
# NOTE: NOT mounting docker.sock - we want the script to install Docker from scratch
if [ "$FRESH_CLONE" = true ]; then
    VOLUME_MOUNTS=""
else
    VOLUME_MOUNTS="-v $REPO_ROOT:/workspace:ro"
fi

# Add VDI CA certificates if they exist
if [ -d /usr/local/share/ca-certificates ]; then
    if [ -z "$VOLUME_MOUNTS" ]; then
        VOLUME_MOUNTS="-v /usr/local/share/ca-certificates:/usr/local/share/ca-certificates:ro"
    else
        VOLUME_MOUNTS="$VOLUME_MOUNTS -v /usr/local/share/ca-certificates:/usr/local/share/ca-certificates:ro"
    fi
fi

# Use --privileged to allow Docker-in-Docker
# --rm ensures container is deleted on exit
docker run -it --rm \
  --privileged \
  $VOLUME_MOUNTS \
  -w /workspace \
  --hostname "$CONTAINER_NAME" \
  rockylinux:9 \
  bash -c "
    echo 'Setting up minimal environment...'
    echo 'Installing git, curl, sudo, ca-certificates...'
    # Temporarily disable SSL verification for initial package install
    echo 'sslverify=false' >> /etc/dnf/dnf.conf
    # Use --allowerasing to handle curl-minimal conflict
    dnf install -y --allowerasing git curl sudo ca-certificates
    # Re-enable SSL verification
    sed -i '/sslverify=false/d' /etc/dnf/dnf.conf
    
    # Update CA trust for both root and future users
    update-ca-trust
    echo 'CA trust updated'
    
    # Copy mounted certs to Rocky location and update trust
    if [ -d /usr/local/share/ca-certificates ]; then
      cp /usr/local/share/ca-certificates/*.crt /etc/pki/ca-trust/source/anchors/ 2>/dev/null || true
    fi
    update-ca-trust 2>/dev/null
    
    # Clone fresh repo if requested
    if [ '$FRESH_CLONE' = true ]; then
        cd /
        if [ -n '$BRANCH_NAME' ]; then
            echo 'Cloning fresh LibreChat from GitHub (branch: $BRANCH_NAME)...'
            git clone -b $BRANCH_NAME https://github.com/paychex/LibreChat.git workspace 2>&1 | grep -v 'Cloning into' || true
        else
            echo 'Cloning fresh LibreChat from GitHub (default branch)...'
            git clone https://github.com/paychex/LibreChat.git workspace 2>&1 | grep -v 'Cloning into' || true
        fi
        cd /workspace
        echo 'Fresh clone complete!'
    fi
    
    # Create a non-root user similar to VDI environment
    useradd -m -s /bin/bash testuser
    usermod -aG wheel testuser
    echo 'testuser ALL=(ALL) NOPASSWD:ALL' >> /etc/sudoers
    
    # Give testuser ownership of workspace
    chown -R testuser:testuser /workspace
    
    echo ''
    echo '═══════════════════════════════════════════════════════'
    echo '  Rocky Linux 9 Test Environment Ready!'
    echo '═══════════════════════════════════════════════════════'
    echo ''
    if [ '$FRESH_CLONE' = true ]; then
        echo '  Fresh LibreChat clone at: /workspace'
    else
        echo '  Your LibreChat code is mounted at: /workspace (read-only)'
    fi
    echo '  Setup script location: /workspace/dev-setup/setup-dev-env.sh'
    echo ''
    echo '  Quick start as testuser:'
    echo '    su - testuser'
    echo '    cd /workspace/dev-setup'
    echo '    ./setup-dev-env.sh'
    echo ''
    echo '  Or run as root (will skip some tests):'
    echo '    cd /workspace/dev-setup'
    echo '    ./setup-dev-env.sh'
    echo ''
    echo '  Type '\''exit'\'' when done to destroy this container'
    echo '═══════════════════════════════════════════════════════'
    echo ''
    
    # Start interactive bash as root (user can su to testuser if needed)
    exec bash
  "

echo ""
echo "Container exited. Environment destroyed."
