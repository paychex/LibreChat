#!/usr/bin/env bash
#
# Interactive Ubuntu Testing Environment
#
# Launches a fresh Ubuntu 24.04 container with your local LibreChat
# code mounted. This allows you to manually run and test setup-dev-env.sh
# in a clean Ubuntu environment.
#
# Usage:
#   ./interactive-test-ubuntu.sh                    # Mount current repo (read-only)
#   ./interactive-test-ubuntu.sh --fresh            # Clone fresh from origin/main
#   ./interactive-test-ubuntu.sh --fresh --branch <name>  # Clone specific branch
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
echo "║   Interactive Ubuntu 24.04 Testing Environment        ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""
echo "This will:"
echo "  • Launch Ubuntu 24.04 container"
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
echo "Starting Ubuntu 24.04 container..."
echo ""

# Generate unique hostname to prevent Docker layer caching
CONTAINER_NAME="ubuntu-test-$(date +%s)"

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
  ubuntu:24.04 \
  bash -c "
    echo 'Setting up minimal environment...'
    apt-get update -qq
    apt-get install -y -qq git curl sudo ca-certificates > /dev/null 2>&1
    
    # Update CA certificates to include mounted corporate certs
    if [ -d /usr/local/share/ca-certificates ]; then
        update-ca-certificates 2>/dev/null
    fi
    
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
    usermod -aG sudo testuser
    echo 'testuser ALL=(ALL) NOPASSWD:ALL' >> /etc/sudoers
    
    # Give testuser ownership of workspace
    chown -R testuser:testuser /workspace
    
    echo ''
    echo '═══════════════════════════════════════════════════════'
    echo '  Ubuntu 24.04 Test Environment Ready!'
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
    echo '  Type '\'exit\'' when done to destroy this container'
    echo '═══════════════════════════════════════════════════════'
    echo ''
    
    # Start interactive bash as root (user can su to testuser if needed)
    exec bash
  "

echo ""
echo "Container exited. Environment destroyed."
