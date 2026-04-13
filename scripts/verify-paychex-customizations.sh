#!/bin/bash
# Paychex Customization Verification Script
# Purpose: Verify all critical Paychex customizations are present after upstream merge
# Usage: ./verify-paychex-customizations.sh

echo "======================================"
echo "Paychex Customization Verification"
echo "======================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASS_COUNT=0
FAIL_COUNT=0
WARN_COUNT=0

# Function to check if pattern exists in file
check_pattern() {
    local file=$1
    local pattern=$2
    local description=$3
    local critical=$4  # "critical" or "warning"
    
    if [ ! -f "$file" ]; then
        if [ "$critical" = "critical" ]; then
            echo -e "${RED}✗ FAIL${NC}: File not found: $file"
            FAIL_COUNT=$((FAIL_COUNT + 1))
        else
            echo -e "${YELLOW}⚠ WARN${NC}: File not found: $file"
            WARN_COUNT=$((WARN_COUNT + 1))
        fi
        return 1
    fi
    
    if grep -q "$pattern" "$file"; then
        echo -e "${GREEN}✓ PASS${NC}: $description"
        PASS_COUNT=$((PASS_COUNT + 1))
        return 0
    else
        if [ "$critical" = "critical" ]; then
            echo -e "${RED}✗ FAIL${NC}: $description"
            echo "         Pattern not found: $pattern"
            echo "         File: $file"
            FAIL_COUNT=$((FAIL_COUNT + 1))
        else
            echo -e "${YELLOW}⚠ WARN${NC}: $description"
            echo "         Pattern not found: $pattern"
            echo "         File: $file"
            WARN_COUNT=$((WARN_COUNT + 1))
        fi
        return 1
    fi
}

echo "Checking Critical Paychex Customizations..."
echo ""

# 1. Tool Call Filtering
echo "1. Tool Call Filtering (BaseClient.js)"
check_pattern \
    "api/app/clients/BaseClient.js" \
    "filterCrossProviderToolCalls" \
    "filterCrossProviderToolCalls method exists" \
    "critical"

check_pattern \
    "api/app/clients/BaseClient.js" \
    "Proto field is not repeating" \
    "Gemini error prevention comment present" \
    "warning"

echo ""

# 2. Schema Sanitization
echo "2. Schema Sanitization (tools.js)"
check_pattern \
    "api/server/services/start/tools.js" \
    "sanitizeSchemaMetadata" \
    "sanitizeSchemaMetadata imported from @librechat/api" \
    "critical"

check_pattern \
    "api/server/services/start/tools.js" \
    "parameters: sanitizeSchemaMetadata" \
    "sanitizeSchemaMetadata applied to parameters" \
    "critical"

echo ""

# 3. Gemini Custom Endpoint Support
echo "3. Gemini Custom Endpoint Support (MCP.js)"
check_pattern \
    "api/server/services/MCP.js" \
    "providerLower.includes('gemini')" \
    "Custom Gemini endpoint detection (includes 'gemini')" \
    "critical"

check_pattern \
    "api/server/services/MCP.js" \
    "providerLower.includes('google')" \
    "Custom Gemini endpoint detection (includes 'google')" \
    "critical"

check_pattern \
    "api/server/services/MCP.js" \
    "isGoogleLike" \
    "isGoogleLike variable for result formatting" \
    "warning"

echo ""

# 4. Pendo Analytics
echo "4. Pendo Analytics (ModelSelector.tsx)"
check_pattern \
    "client/src/components/Chat/Menus/Endpoints/ModelSelector.tsx" \
    'id="agentUsers"' \
    "Pendo tracking element exists" \
    "warning"

echo ""

# 5. Menu Descriptions
echo "5. Menu Descriptions (DropdownPopup.tsx)"
check_pattern \
    "packages/client/src/components/DropdownPopup.tsx" \
    "item.description" \
    "Menu item description rendering" \
    "warning"

check_pattern \
    "packages/client/src/components/DropdownPopup.tsx" \
    "items-start" \
    "Top alignment for multi-line content" \
    "warning"

check_pattern \
    "packages/client/src/components/DropdownPopup.tsx" \
    "transition-colors duration-200" \
    "CSS transitions for smooth hover effects" \
    "warning"

echo ""

# 6. ToolsDropdown Declarative Structure
echo "6. ToolsDropdown Declarative Structure"
check_pattern \
    "client/src/components/Chat/Input/ToolsDropdown.tsx" \
    "label: localize" \
    "Declarative label properties" \
    "warning"

check_pattern \
    "client/src/components/Chat/Input/ToolsDropdown.tsx" \
    "description: localize" \
    "Declarative description properties" \
    "warning"

check_pattern \
    "client/src/components/Chat/Input/ToolsDropdown.tsx" \
    "icon:" \
    "Declarative icon properties" \
    "warning"

echo ""

# 7. Dockerfile Build Error Handling
echo "7. Dockerfile Build Error Handling"
check_pattern \
    "Dockerfile" \
    "npm run frontend &&" \
    "Build uses && for error handling" \
    "critical"

check_pattern \
    "Dockerfile" \
    "npm prune --production &&" \
    "Prune uses && for error handling" \
    "critical"

echo ""

# 8. Package Dependencies
echo "8. Package Dependencies (xlsx, etc.)"
if grep -q '"xlsx": "https://cdn.sheetjs.com' api/package.json 2>/dev/null || \
   grep -q '"xlsx": "https://cdn.sheetjs.com' packages/api/package.json 2>/dev/null; then
    echo -e "${RED}✗ FAIL${NC}: xlsx still using CDN (should use npm registry)"
    echo "         CDN causes 403 errors, should be: \"xlsx\": \"^0.18.5\""
    FAIL_COUNT=$((FAIL_COUNT + 1))
else
    if grep -q '"xlsx":' api/package.json 2>/dev/null || \
       grep -q '"xlsx":' packages/api/package.json 2>/dev/null; then
        echo -e "${GREEN}✓ PASS${NC}: xlsx using npm registry (not problematic CDN)"
        PASS_COUNT=$((PASS_COUNT + 1))
    else
        echo -e "${YELLOW}⚠ WARN${NC}: xlsx package not found in package.json files"
        WARN_COUNT=$((WARN_COUNT + 1))
    fi
fi

echo ""

# 9. Axios Security Update (>= 1.15.0)
echo "9. Axios Security Update (>= 1.15.0)"
AXIOS_FILES=(
    "api/package.json"
    "packages/api/package.json"
    "packages/data-provider/package.json"
    "packages/data-provider/react-query/package.json"
    "packages/data-provider/react-query/package-lock.json"
)

AXIOS_PASS=0
AXIOS_FAIL=0

for file in "${AXIOS_FILES[@]}"; do
    if [ ! -f "$file" ]; then
        echo -e "${YELLOW}⚠ WARN${NC}: File not found: $file"
        WARN_COUNT=$((WARN_COUNT + 1))
        continue
    fi
    
    # Extract axios version from file (handles ^1.15.0 or "1.15.0")
    AXIOS_VERSION=$(grep '"axios"' "$file" 2>/dev/null | grep -o '[0-9]\+\.[0-9]\+\.[0-9]\+' | head -1)
    
    if [ -z "$AXIOS_VERSION" ]; then
        echo -e "${YELLOW}⚠ WARN${NC}: axios version not found in $file"
        WARN_COUNT=$((WARN_COUNT + 1))
        continue
    fi
    
    # Extract major and minor version numbers
    MAJOR=$(echo "$AXIOS_VERSION" | cut -d. -f1)
    MINOR=$(echo "$AXIOS_VERSION" | cut -d. -f2)
    
    # Check if version is >= 1.15
    if [ "$MAJOR" -gt 1 ] || ([ "$MAJOR" -eq 1 ] && [ "$MINOR" -ge 15 ]); then
        echo -e "${GREEN}✓ PASS${NC}: $file has axios $AXIOS_VERSION (>= 1.15.0)"
        AXIOS_PASS=$((AXIOS_PASS + 1))
    else
        echo -e "${RED}✗ FAIL${NC}: $file has axios $AXIOS_VERSION (requires >= 1.15.0 for security fix)"
        AXIOS_FAIL=$((AXIOS_FAIL + 1))
    fi
done

# Update counters
PASS_COUNT=$((PASS_COUNT + AXIOS_PASS))
FAIL_COUNT=$((FAIL_COUNT + AXIOS_FAIL))

echo ""

# 10. Endpoints Index (proper imports)
echo "10. Endpoints Index (imports from @librechat/api)"
check_pattern \
    "api/server/services/Endpoints/index.js" \
    "= require('@librechat/api')" \
    "Endpoints uses @librechat/api imports" \
    "critical"

check_pattern \
    "api/server/services/Endpoints/index.js" \
    "initializeCustom" \
    "initializeCustom imported" \
    "critical"

check_pattern \
    "api/server/services/Endpoints/index.js" \
    "initializeOpenAI" \
    "initializeOpenAI imported" \
    "critical"

echo ""

# 11. Check for lingering broken references
echo "11. Checking for Broken References"
BROKEN_REFS=0

if grep -r "require('.*custom/initialize')" api/server/services/Endpoints/index.js 2>/dev/null | grep -v "@librechat/api"; then
    echo -e "${RED}✗ FAIL${NC}: Found old-style require() for custom/initialize"
    FAIL_COUNT=$((FAIL_COUNT + 1))
    BROKEN_REFS=$((BROKEN_REFS + 1))
fi

if grep -r "require('.*OpenAIClient')" api/ 2>/dev/null | grep -v node_modules; then
    echo -e "${RED}✗ FAIL${NC}: Found references to deleted OpenAIClient.js"
    FAIL_COUNT=$((FAIL_COUNT + 1))
    BROKEN_REFS=$((BROKEN_REFS + 1))
fi

if [ $BROKEN_REFS -eq 0 ]; then
    echo -e "${GREEN}✓ PASS${NC}: No broken references to deleted files"
    PASS_COUNT=$((PASS_COUNT + 1))
fi

echo ""
echo "======================================"
echo "Verification Summary"
echo "======================================"
echo ""
echo -e "${GREEN}Passed:${NC}  $PASS_COUNT"
echo -e "${YELLOW}Warnings:${NC} $WARN_COUNT"
echo -e "${RED}Failed:${NC}  $FAIL_COUNT"
echo ""

# Calculate total
TOTAL=$((PASS_COUNT + WARN_COUNT + FAIL_COUNT))
PASS_RATE=0
if [ $TOTAL -gt 0 ]; then
    PASS_RATE=$((PASS_COUNT * 100 / TOTAL))
fi

echo "Pass Rate: $PASS_RATE% ($PASS_COUNT/$TOTAL)"
echo ""

# Overall assessment
if [ $FAIL_COUNT -eq 0 ]; then
    if [ $WARN_COUNT -eq 0 ]; then
        echo -e "${GREEN}✓ EXCELLENT${NC}: All critical Paychex customizations verified!"
        exit 0
    else
        echo -e "${YELLOW}⚠ GOOD${NC}: All critical customizations present. Review warnings."
        exit 0
    fi
else
    echo -e "${RED}✗ ISSUES FOUND${NC}: $FAIL_COUNT critical customizations missing!"
    echo ""
    echo "Action Required:"
    echo "1. Review failed checks above"
    echo "2. Check git history to understand what was lost"
    echo "3. Restore missing Paychex customizations"
    echo "4. Re-run this verification script"
    echo ""
    echo "See UPSTREAM_MERGE_GUIDE.md for resolution guidance."
    exit 1
fi
