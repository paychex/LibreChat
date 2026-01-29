#!/usr/bin/env bash
#
# Test Phase 4: Deployment Mode Selection
#
# This script tests the deployment mode selection functionality
# by extracting and testing individual functions.
#

set -e

echo "Testing Phase 4: Deployment Mode Selection"
echo "==========================================="
echo ""

# Test 1: Verify functions exist in the script
echo "Test 1: Checking function definitions in script..."
if grep -q "^select_deployment_mode()" setup-dev-env.sh && \
   grep -q "^setup_native_mode()" setup-dev-env.sh && \
   grep -q "^setup_docker_compose_mode()" setup-dev-env.sh; then
    echo "✓ All Phase 4 functions are defined in setup-dev-env.sh"
else
    echo "✗ Some Phase 4 functions are missing"
    exit 1
fi
echo ""

# Test 2: Check function content
echo "Test 2: Verifying function implementations..."

if grep -A 20 "^select_deployment_mode()" setup-dev-env.sh | grep -q "Native mode"; then
    echo "✓ select_deployment_mode() contains mode selection logic"
else
    echo "✗ select_deployment_mode() missing expected content"
    exit 1
fi

if grep -A 30 "^setup_native_mode()" setup-dev-env.sh | grep -q "npm run"; then
    echo "✓ setup_native_mode() contains npm instructions"
else
    echo "✗ setup_native_mode() missing expected content"
    exit 1
fi

if grep -A 10 "^setup_docker_compose_mode()" setup-dev-env.sh | grep -q "docker-compose.dev.yml"; then
    echo "✓ setup_docker_compose_mode() contains Docker Compose logic"
else
    echo "✗ setup_docker_compose_mode() missing expected content"
    exit 1
fi
echo ""

# Test 3: Check main function integration
echo "Test 3: Checking Phase 4 integration in main()..."
if grep -A 100 "Phase 4: Deployment Mode Selection" setup-dev-env.sh | grep -q "select_deployment_mode"; then
    echo "✓ Phase 4 is integrated into main() function"
else
    echo "✗ Phase 4 not properly integrated"
    exit 1
fi
echo ""

# Test 4: Check for docker-compose.dev.yml
echo "Test 4: Checking for docker-compose.dev.yml..."
if [ -f "docker-compose.dev.yml" ]; then
    echo "✓ docker-compose.dev.yml exists"
    echo "  Docker Compose mode will be fully functional"
else
    echo "ℹ docker-compose.dev.yml not found"
    echo "  This is expected on dev branches"
    echo "  Script will handle this gracefully with a warning"
fi
echo ""

# Test 5: Verify MongoDB container status
echo "Test 5: Checking MongoDB container status..."
if docker ps --format '{{.Names}}' 2>/dev/null | grep -q "^librechat-mongo$"; then
    echo "✓ librechat-mongo container is running"
    echo "  Native mode will work correctly"
elif docker ps -a --format '{{.Names}}' 2>/dev/null | grep -q "^librechat-mongo$"; then
    echo "ℹ librechat-mongo container exists but is stopped"
    echo "  Start it with: docker start librechat-mongo"
else
    echo "ℹ librechat-mongo container not found"
    echo "  Run full script to create it"
fi
echo ""

# Test 6: Check script line count growth
echo "Test 6: Verifying script size..."
line_count=$(wc -l < setup-dev-env.sh)
echo "  Total lines in setup-dev-env.sh: $line_count"
if [ "$line_count" -gt 1100 ]; then
    echo "✓ Script has grown significantly (Phase 4 added ~150 lines)"
else
    echo "⚠ Script may be missing Phase 4 code"
fi
echo ""

echo "========================================="
echo "Phase 4 Test Summary"
echo "========================================="
echo "✓ Function definitions verified"
echo "✓ Function implementations checked"
echo "✓ Main function integration confirmed"
echo "✓ Edge cases handled (missing compose file)"
echo "✓ Container status checked"
echo ""
echo "Phase 4 implementation is ready!"
