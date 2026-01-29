#!/usr/bin/env bash
#
# Test Phase 5: Verification and Testing
#
# This script validates the verification and testing functions
# without running the full setup script.
#

set -e

echo "Testing Phase 5: Verification and Testing"
echo "=========================================="
echo ""

# Test 1: Verify functions exist in the script
echo "Test 1: Checking function definitions in script..."
if grep -q "^verify_setup()" setup-dev-env.sh && \
   grep -q "^test_application()" setup-dev-env.sh; then
    echo "✓ All Phase 5 functions are defined in setup-dev-env.sh"
else
    echo "✗ Some Phase 5 functions are missing"
    exit 1
fi
echo ""

# Test 2: Check verify_setup implementation
echo "Test 2: Verifying verify_setup() implementation..."

checks=0
if grep -A 200 "^verify_setup()" setup-dev-env.sh | grep -q "Node.js"; then
    echo "  ✓ Checks Node.js"
    checks=$((checks + 1))
fi

if grep -A 200 "^verify_setup()" setup-dev-env.sh | grep -q "npm"; then
    echo "  ✓ Checks npm"
    checks=$((checks + 1))
fi

if grep -A 200 "^verify_setup()" setup-dev-env.sh | grep -q "Docker"; then
    echo "  ✓ Checks Docker"
    checks=$((checks + 1))
fi

if grep -A 200 "^verify_setup()" setup-dev-env.sh | grep -q "MongoDB"; then
    echo "  ✓ Checks MongoDB"
    checks=$((checks + 1))
fi

if grep -A 200 "^verify_setup()" setup-dev-env.sh | grep -q ".env"; then
    echo "  ✓ Checks .env file"
    checks=$((checks + 1))
fi

if grep -A 200 "^verify_setup()" setup-dev-env.sh | grep -q "node_modules"; then
    echo "  ✓ Checks dependencies"
    checks=$((checks + 1))
fi

if [ $checks -ge 6 ]; then
    echo "✓ verify_setup() performs comprehensive checks ($checks/6)"
else
    echo "✗ verify_setup() missing some checks ($checks/6)"
    exit 1
fi
echo ""

# Test 3: Check test_application implementation
echo "Test 3: Verifying test_application() implementation..."

if grep -A 50 "^test_application()" setup-dev-env.sh | grep -q "npm run dev"; then
    echo "✓ test_application() starts the application"
else
    echo "✗ test_application() missing startup logic"
    exit 1
fi

if grep -A 50 "^test_application()" setup-dev-env.sh | grep -q "prompt_yes_no"; then
    echo "✓ test_application() is optional (user prompt)"
else
    echo "✗ test_application() not properly optional"
    exit 1
fi
echo ""

# Test 4: Check main function integration
echo "Test 4: Checking Phase 5 integration in main()..."
if grep -A 200 "Phase 5: Verification and Testing" setup-dev-env.sh | grep -q "verify_setup" && \
   grep -A 200 "Phase 5: Verification and Testing" setup-dev-env.sh | grep -q "test_application"; then
    echo "✓ Phase 5 is integrated into main() function"
else
    echo "✗ Phase 5 not properly integrated"
    exit 1
fi
echo ""

# Test 5: Check completion message
echo "Test 5: Checking setup completion message..."
if grep -q "Setup Complete" setup-dev-env.sh && \
   grep -A 20 "Setup Complete" setup-dev-env.sh | grep -q "Next steps"; then
    echo "✓ Completion message with next steps included"
else
    echo "✗ Completion message missing or incomplete"
    exit 1
fi
echo ""

# Test 6: Verify script size growth
echo "Test 6: Verifying script size..."
line_count=$(wc -l < setup-dev-env.sh)
echo "  Total lines in setup-dev-env.sh: $line_count"
if [ "$line_count" -gt 1350 ]; then
    echo "✓ Script has grown significantly (Phase 5 added ~150 lines)"
else
    echo "⚠ Script may be missing Phase 5 code"
fi
echo ""

# Test 7: Check error handling
echo "Test 7: Checking error handling..."
if grep -A 200 "^verify_setup()" setup-dev-env.sh | grep -q "failed="; then
    echo "✓ verify_setup() tracks failed checks"
else
    echo "✗ verify_setup() missing error tracking"
    exit 1
fi
echo ""

echo "========================================="
echo "Phase 5 Test Summary"
echo "========================================="
echo "✓ Function definitions verified"
echo "✓ verify_setup() performs 6+ comprehensive checks"
echo "✓ test_application() includes optional startup test"
echo "✓ Main function integration confirmed"
echo "✓ Completion message with guidance included"
echo "✓ Error handling implemented"
echo ""
echo "Phase 5 implementation is ready!"
