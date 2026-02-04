#!/usr/bin/env bash
#
# LibreChat Frontend Runner
# Starts the LibreChat frontend in development mode
#

set -euo pipefail

# Get script directory and change to LibreChat root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}[LibreChat]${NC} Starting frontend in development mode..."
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo -e "${RED}[ERROR]${NC} node_modules not found"
    echo "Run: npm ci"
    exit 1
fi

echo -e "${GREEN}[INFO]${NC} Frontend will be available at: http://localhost:3090"
echo -e "${GREEN}[INFO]${NC} Make sure backend is running in another terminal"
echo -e "${GREEN}[INFO]${NC} Press Ctrl+C to stop"
echo ""

# Start frontend
npm run frontend:dev
