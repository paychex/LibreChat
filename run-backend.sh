#!/usr/bin/env bash
#
# LibreChat Backend Runner
# Starts the LibreChat backend in development mode
#

set -euo pipefail

# Get script directory and change to LibreChat root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}[LibreChat]${NC} Starting backend in development mode..."
echo ""

# Source nvm if it exists
if [ -s "$HOME/.nvm/nvm.sh" ]; then
    export NVM_DIR="$HOME/.nvm"
    \. "$NVM_DIR/nvm.sh"
fi

# Check if .env exists
if [ ! -f ".env" ]; then
    echo -e "${RED}[ERROR]${NC} .env file not found"
    echo "Run setup: bash dev-setup/setup-dev-env.sh"
    exit 1
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo -e "${RED}[ERROR]${NC} node_modules not found"
    echo "Run: npm ci"
    exit 1
fi

# Check if MongoDB is running
if command -v docker >/dev/null 2>&1; then
    if ! docker ps --format '{{.Names}}' 2>/dev/null | grep -q "^librechat-mongo$"; then
        echo -e "${YELLOW}[WARN]${NC} MongoDB container not running"
        echo "Start MongoDB: docker start librechat-mongo"
        echo ""
    fi
fi

echo -e "${GREEN}[INFO]${NC} Backend will be available at: http://localhost:3080"
echo -e "${GREEN}[INFO]${NC} Press Ctrl+C to stop"
echo ""

# Start backend
npm run backend:dev
