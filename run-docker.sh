#!/usr/bin/env bash
#
# LibreChat Docker Compose Runner
# Starts LibreChat using Docker Compose
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

echo -e "${BLUE}[LibreChat]${NC} Starting with Docker Compose..."
echo ""

# Check if docker command exists
if ! command -v docker >/dev/null 2>&1; then
    echo -e "${RED}[ERROR]${NC} Docker not found"
    echo "Install Docker first: bash dev-setup/setup-dev-env.sh"
    exit 1
fi

# Check if docker-compose.yml exists
if [ ! -f "docker-compose.yml" ]; then
    echo -e "${RED}[ERROR]${NC} docker-compose.yml not found"
    echo "Are you in the LibreChat root directory?"
    exit 1
fi

# Check if .env exists
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}[WARN]${NC} .env file not found"
    echo "Docker Compose will use defaults from docker-compose.yml"
    echo ""
fi

# Check if standalone MongoDB is running (potential conflict)
if docker ps --format '{{.Names}}' 2>/dev/null | grep -q "^librechat-mongo$"; then
    echo -e "${YELLOW}[WARN]${NC} Standalone librechat-mongo container is running"
    echo "This may conflict with Docker Compose's MongoDB service"
    echo "Consider stopping it: docker stop librechat-mongo"
    echo ""
    read -p "Continue anyway? [y/N]: " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo -e "${GREEN}[INFO]${NC} Starting services..."
docker compose up -d

echo ""
echo -e "${GREEN}[SUCCESS]${NC} Services started!"
echo ""
echo "View logs:       docker compose logs -f"
echo "Stop services:   docker compose down"
echo "Restart:         docker compose restart"
echo ""
echo -e "${GREEN}[INFO]${NC} Application will be available at: http://localhost:3090"
echo "Give it 30-60 seconds to fully start up..."
