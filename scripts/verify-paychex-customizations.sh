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

echo "======================================"
echo "POST-MERGE STRUCTURAL CHECKS"
echo "======================================"
echo ""

# ─── 0a. Conflict Marker Scan ────────────────────────────────────────────────
echo "0a. Conflict Marker Scan"
# Searches all tracked source files for unresolved git conflict markers.
# git grep respects .gitignore so node_modules are automatically excluded.
CONFLICT_FILES=$(git grep -rl "^<<<<<<< " -- "*.js" "*.ts" "*.tsx" "*.json" "*.yaml" "*.yml" "*.md" 2>/dev/null)
if [ -n "$CONFLICT_FILES" ]; then
    echo -e "${RED}✗ FAIL${NC}: Unresolved git conflict markers found in the following files:"
    echo "$CONFLICT_FILES" | while IFS= read -r f; do
        echo "         $f"
        git grep -n "^<<<<<<< " -- "$f" | head -3 | while IFS= read -r line; do echo "           $line"; done
    done
    FAIL_COUNT=$((FAIL_COUNT + 1))
else
    echo -e "${GREEN}✓ PASS${NC}: No unresolved conflict markers found in tracked source files"
    PASS_COUNT=$((PASS_COUNT + 1))
fi

echo ""

# ─── 0b. JavaScript Syntax Validation ───────────────────────────────────────
echo "0b. JavaScript Syntax Validation (node --check on api/**/*.js)"
# Runs Node.js parser-only check on every JS file under api/.
# A duplicate const, stray token, or merge artifact in one file will crash
# every test suite that transitively imports it — catching this early prevents
# 20+ test suites from failing simultaneously in CI.
JS_ERROR_COUNT=0
while IFS= read -r -d '' jsfile; do
    ERROR_OUTPUT=$(node --check "$jsfile" 2>&1)
    if [ $? -ne 0 ]; then
        echo -e "${RED}✗ FAIL${NC}: Syntax error in $jsfile"
        echo "$ERROR_OUTPUT" | head -5 | while IFS= read -r line; do echo "         $line"; done
        JS_ERROR_COUNT=$((JS_ERROR_COUNT + 1))
        FAIL_COUNT=$((FAIL_COUNT + 1))
    fi
done < <(find api/ -name "*.js" -not -path "*/node_modules/*" -print0 2>/dev/null)

if [ $JS_ERROR_COUNT -eq 0 ]; then
    echo -e "${GREEN}✓ PASS${NC}: All api/**/*.js files pass Node.js syntax check"
    PASS_COUNT=$((PASS_COUNT + 1))
fi

echo ""

# ─── 0c. TypeScript Type Check ──────────────────────────────────────────────
echo "0c. TypeScript Type Check (packages/api tsc --noEmit)"
# Catches broken imports, missing exports, and wrong type paths that surface
# as CI failures but are invisible without running the compiler.
# Requires: npm install already run and sibling packages built.
if [ -f "packages/api/tsconfig.json" ]; then
    TS_OUTPUT=$(cd packages/api && npx tsc --noEmit 2>&1)
    TS_EXIT=$?
    TS_ERROR_COUNT=$(echo "$TS_OUTPUT" | grep -c "error TS" || true)
    if [ $TS_EXIT -eq 0 ]; then
        echo -e "${GREEN}✓ PASS${NC}: packages/api TypeScript type check passed (0 errors)"
        PASS_COUNT=$((PASS_COUNT + 1))
    else
        echo -e "${RED}✗ FAIL${NC}: packages/api TypeScript type check found $TS_ERROR_COUNT error(s)"
        echo "$TS_OUTPUT" | grep "error TS" | head -10 | while IFS= read -r line; do echo "         $line"; done
        if [ "$TS_ERROR_COUNT" -gt 10 ]; then
            echo "         ... ($(( TS_ERROR_COUNT - 10 )) more errors — run: cd packages/api && npx tsc --noEmit)"
        fi
        FAIL_COUNT=$((FAIL_COUNT + 1))
    fi
else
    echo -e "${YELLOW}⚠ WARN${NC}: packages/api/tsconfig.json not found — skipping TS check"
    WARN_COUNT=$((WARN_COUNT + 1))
fi

echo ""

# ─── 0d. Package API Export Validation ──────────────────────────────────────
echo "0d. Package API Export Validation (@librechat/api and @librechat/data-schemas)"
# When upstream moves a function from one package to another (e.g., createTempChatExpirationDate
# moved from @librechat/api to @librechat/data-schemas in v0.8.6), JS files that destructure
# from the old package silently receive `undefined` at runtime — invisible to node --check and tsc.
# This check scans api/**/*.js for all destructured require() imports from these packages and
# verifies each named export still exists in the installed package version.
PKG_EXPORT_ERRORS=$(node --no-warnings - << 'NODEJS_EOF'
const fs = require('fs');
const { execSync } = require('child_process');
const PKGS = ['@librechat/api', '@librechat/data-schemas'];
const pattern = /const\s*\{([^}]+)\}\s*=\s*require\(['"](@librechat\/(?:api|data-schemas))['"]\)/g;
const used = {};

let files;
try {
  files = execSync('find api/ -name "*.js" -not -path "*/node_modules/*" 2>/dev/null')
    .toString().trim().split('\n').filter(Boolean);
} catch (e) {
  process.exit(0); // find not available; skip check
}

for (const file of files) {
  let src;
  try { src = fs.readFileSync(file, 'utf8'); } catch (e) { continue; }
  let m;
  while ((m = pattern.exec(src)) !== null) {
    const pkg = m[2];
    if (!used[pkg]) used[pkg] = {};
    m[1].split(',')
      .map(s => s.trim().replace(/\/\/.*$/, '').split(/\s+as\s+/)[0].trim())
      .filter(Boolean)
      .forEach(name => { if (!used[pkg][name]) used[pkg][name] = []; used[pkg][name].push(file); });
  }
}

const missing = [];
for (const pkg of PKGS) {
  if (!used[pkg]) continue;
  let pkgExp;
  try { pkgExp = require(pkg); } catch (e) {
    process.stderr.write('WARN: could not require ' + pkg + ' — skipping export check\n');
    continue;
  }
  for (const [name, files] of Object.entries(used[pkg])) {
    if (!(name in pkgExp)) {
      missing.push('MISSING ' + name + ' from ' + pkg + ' (used in ' + files[0] + ')');
    }
  }
}

if (missing.length > 0) { missing.forEach(l => process.stderr.write(l + '\n')); process.exit(1); }
NODEJS_EOF
2>&1)
PKG_EXIT=$?
if [ $PKG_EXIT -ne 0 ]; then
  echo -e "${RED}✗ FAIL${NC}: Package exports missing — a function likely moved between @librechat packages:"
  echo "$PKG_EXPORT_ERRORS" | while IFS= read -r line; do echo "         $line"; done
  echo "         Fix: update the require() source to match where the function now lives."
  FAIL_COUNT=$((FAIL_COUNT + 1))
else
  if echo "$PKG_EXPORT_ERRORS" | grep -q "WARN:"; then
    echo -e "${YELLOW}⚠ WARN${NC}: Some packages could not be required — run 'npm install' first"
    WARN_COUNT=$((WARN_COUNT + 1))
  else
    echo -e "${GREEN}✓ PASS${NC}: All @librechat package imports are valid exports"
    PASS_COUNT=$((PASS_COUNT + 1))
  fi
fi

echo ""

# ─── 0e. Intra-repo Require Export Validation ───────────────────────────────
echo "0e. Intra-repo Require Export Validation (key internal modules)"
# When upstream moves a function between internal api/ files (e.g., getSoleOwnedResourceIds
# moved from PermissionService.js to api/models/index.js in v0.8.6 commit 87a3b82),
# the importing file silently gets `undefined`. Unlike 0d (which covers @librechat/ packages),
# this check uses a static grep to confirm that names destructured from key internal modules
# are still present in those modules' module.exports blocks.
INTERNAL_FAIL=0

# Usage: check_internal_require FILE_IMPORTING ALIAS_USED MODULE_FILE
# Greps FILE_IMPORTING for destructured require(ALIAS_USED) imports, then checks each
# name exists in MODULE_FILE (either in module.exports block or as a named export pattern).
check_internal_require() {
  local importer_glob="$1"   # glob of files that import from the module, e.g. "api/models/*.js"
  local require_alias="$2"   # alias used in require(), e.g. "~/server/services/PermissionService"
  local module_file="$3"     # path to the module being imported

  if [ ! -f "$module_file" ]; then
    echo -e "${YELLOW}⚠ WARN${NC}: Module file not found: $module_file"
    WARN_COUNT=$((WARN_COUNT + 1))
    return
  fi

  # Extract what module_file exports (names that appear in or near module.exports)
  local exports_block
  exports_block=$(awk '/module\.exports\s*=\s*\{/,/^\}/' "$module_file" 2>/dev/null)

  for importer in $importer_glob; do
    [ -f "$importer" ] || continue
    # Get all destructured names from require(alias) in this file
    local names
    names=$(grep "require('$require_alias')\|require(\"$require_alias\")" "$importer" 2>/dev/null \
      | grep -oP "(?<=\{)[^}]+" \
      | tr ',' '\n' \
      | sed 's/[[:space:]]//g; s|//.*||' \
      | grep -v '^$')
    while IFS= read -r name; do
      [ -z "$name" ] && continue
      # Check if name appears in the exports block OR is spread-exported (module exports ...methods)
      if ! echo "$exports_block" | grep -qw "$name" && \
         ! grep -qP "^\s+$name[,\s]" "$module_file"; then
        echo -e "${RED}✗ FAIL${NC}: '$name' imported from '$require_alias' in $importer — not found in $module_file exports"
        INTERNAL_FAIL=$((INTERNAL_FAIL + 1))
        FAIL_COUNT=$((FAIL_COUNT + 1))
      fi
    done <<< "$names"
  done
}

# PermissionService.js: Paychex model files import from here; functions move upstream frequently
check_internal_require "api/models/*.js" "~/server/services/PermissionService" \
  "api/server/services/PermissionService.js"

if [ $INTERNAL_FAIL -eq 0 ]; then
  echo -e "${GREEN}✓ PASS${NC}: All destructured imports from key internal modules are present in their exports"
  PASS_COUNT=$((PASS_COUNT + 1))
fi

echo ""

# ─── 0f. Paychex-added @librechat/api source exports ────────────────────────
echo "0f. Paychex-added @librechat/api source exports (packages/api/src/utils/index.ts)"
# packages/api/src/utils/index.ts is overwritten by upstream merges (both upstream and
# Paychex modify it). Paychex-added re-exports (e.g. schema.ts for sanitizeSchemaMetadata)
# are silently dropped when upstream's version wins the merge. Check 0d only validates the
# compiled dist, which is stale until npm run build:api is run — so this check validates
# the SOURCE directly and catches the drop before a rebuild exposes it at runtime.
check_pattern \
    "packages/api/src/utils/index.ts" \
    "export \* from './schema'" \
    "sanitizeSchemaMetadata source export present (packages/api/src/utils/index.ts re-exports schema.ts)" \
    "critical"

echo ""

echo "======================================"
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

# 12. MCP Server Name Normalization (Bug Fix - Upstream Defect)
echo "12. MCP Server Name Normalization (prevents 400 errors)"
check_pattern \
    "packages/api/src/mcp/registry/MCPServerInspector.ts" \
    "normalizeServerName" \
    "MCPServerInspector imports normalizeServerName" \
    "critical"

check_pattern \
    "packages/api/src/mcp/registry/MCPServerInspector.ts" \
    'mcp_delimiter}${normalizeServerName(serverName)}' \
    "MCPServerInspector uses normalizeServerName in getToolFunctions" \
    "critical"

check_pattern \
    "api/server/services/MCP.js" \
    'mcp_delimiter}${normalizeServerName(serverName)}' \
    "MCP.js uses normalizeServerName in initializeServerTools toolKey" \
    "critical"

# Verify the pattern is NOT using raw serverName (anti-pattern check)
if grep -n 'mcp_delimiter}${serverName}' packages/api/src/mcp/registry/MCPServerInspector.ts 2>/dev/null | grep -v normalizeServerName; then
    echo -e "${RED}✗ FAIL${NC}: MCPServerInspector.ts still has raw serverName (should use normalizeServerName)"
    echo "         This causes 400 errors with pattern validation for server names with spaces/special chars"
    FAIL_COUNT=$((FAIL_COUNT + 1))
else
    echo -e "${GREEN}✓ PASS${NC}: No raw serverName usage in MCPServerInspector"
    PASS_COUNT=$((PASS_COUNT + 1))
fi

if grep -n "toolKey.*mcp_delimiter.*serverName" api/server/services/MCP.js 2>/dev/null | grep -v normalizeServerName; then
    echo -e "${RED}✗ FAIL${NC}: MCP.js still has raw serverName in toolKey (should use normalizeServerName)"
    echo "         This causes 400 errors with pattern validation for server names with spaces/special chars"
    FAIL_COUNT=$((FAIL_COUNT + 1))
else
    echo -e "${GREEN}✓ PASS${NC}: No raw serverName usage in MCP.js toolKey construction"
    PASS_COUNT=$((PASS_COUNT + 1))
fi

echo ""

# 13. MCP startup field in API allowlist
echo "13. MCP startup Field in API Response Allowlist (packages/api)"
check_pattern \
    "packages/api/src/mcp/utils.ts" \
    "startup: config.startup" \
    "redactServerSecrets allowlists startup field for frontend" \
    "critical"

echo "    Note: After any change to packages/api/src/, run: npm run build -w packages/api"
echo "    Verify dist is current: grep 'startup' packages/api/dist/index.js | grep 'config.startup'"
echo ""

# 14. MCP startup auto-select (frontend)
echo "14. MCP Startup Auto-Select (useMCPServerManager.ts)"
check_pattern \
    "client/src/hooks/MCP/useMCPServerManager.ts" \
    "s.config.startup === true" \
    "Auto-select filter for startup:true MCP servers" \
    "critical"

check_pattern \
    "client/src/hooks/MCP/useMCPServerManager.ts" \
    "availableMCPServers" \
    "Uses unfiltered availableMCPServers (not selectableServers) for auto-select" \
    "critical"

echo ""

# 15. Model preference guard in ChatRoute
echo "15. Model Preference Guard (ChatRoute.tsx)"
check_pattern \
    "client/src/routes/ChatRoute.tsx" \
    "hasStoredModelSelection" \
    "Guard prevents default spec preset from overwriting stored model choice" \
    "warning"

check_pattern \
    "client/src/routes/ChatRoute.tsx" \
    "activePreset" \
    "activePreset variable respects stored model selection" \
    "warning"

echo ""

# 16. Anthropic Image Encoding for Custom Endpoints
echo "16. Anthropic Image Encoding for Custom Endpoints (encode.js)"
check_pattern \
    "api/server/services/Files/images/encode.js" \
    "includes('claude')" \
    "Custom Claude endpoint detected by name for Anthropic image encoding" \
    "critical"

check_pattern \
    "api/server/services/Files/images/encode.js" \
    "includes('anthropic')" \
    "Custom Anthropic endpoint detected by name for Anthropic image encoding" \
    "critical"

# Verify ordering: the Anthropic conversion block must appear BEFORE the VisionModes.agents check.
# If VisionModes.agents appears before includes('claude'), the Anthropic conversion is dead code for agents.
ANTHROPIC_LINE=$(grep -n "includes('claude')" api/server/services/Files/images/encode.js 2>/dev/null | head -1 | cut -d: -f1)
AGENTS_LINE=$(grep -n "mode === VisionModes.agents" api/server/services/Files/images/encode.js 2>/dev/null | head -1 | cut -d: -f1)

if [ -n "$ANTHROPIC_LINE" ] && [ -n "$AGENTS_LINE" ]; then
    if [ "$ANTHROPIC_LINE" -lt "$AGENTS_LINE" ]; then
        echo -e "${GREEN}✓ PASS${NC}: Anthropic conversion block appears before VisionModes.agents early-return (line $ANTHROPIC_LINE < $AGENTS_LINE)"
        PASS_COUNT=$((PASS_COUNT + 1))
    else
        echo -e "${RED}✗ FAIL${NC}: Anthropic conversion block is AFTER VisionModes.agents early-return (line $ANTHROPIC_LINE >= $AGENTS_LINE)"
        echo "         This makes the Anthropic branch dead code for agent-path uploads — images will 400 on Claude endpoints"
        FAIL_COUNT=$((FAIL_COUNT + 1))
    fi
else
    echo -e "${YELLOW}⚠ WARN${NC}: Could not determine line ordering for Anthropic block vs VisionModes.agents"
    WARN_COUNT=$((WARN_COUNT + 1))
fi

echo ""

# 17. SSO Rate Limit Fix
echo "17. SSO Rate Limit Fix (loginLimiter.js)"
check_pattern \
    "api/server/middleware/limiters/loginLimiter.js" \
    "skipSuccessfulRequests: true" \
    "skipSuccessfulRequests prevents SSO redirect 302s from counting against login rate limit" \
    "critical"

echo ""

# 18. OpenID Token Refresh Middleware
echo "18. OpenID Token Refresh Middleware (refreshOpenIDToken.js)"
check_pattern \
    "api/server/middleware/refreshOpenIDToken.js" \
    "isAccessTokenExpiredOrExpiringSoon" \
    "Proactive access_token expiry detection before agent requests" \
    "critical"

check_pattern \
    "api/server/middleware/refreshOpenIDToken.js" \
    "_inflight" \
    "Concurrent refresh deduplication map prevents invalid_grant race on Azure AD" \
    "critical"

check_pattern \
    "api/server/routes/agents/index.js" \
    "refreshOpenIDToken" \
    "refreshOpenIDToken middleware wired into agents router" \
    "critical"

echo ""

# 19. RAG Context 404 Graceful Handling
echo "19. RAG Context 404 Graceful Handling (createContextHandlers.js)"
check_pattern \
    "api/app/clients/prompts/createContextHandlers.js" \
    "Promise.allSettled" \
    "Promise.allSettled isolates per-file 404 failures instead of crashing entire generation" \
    "warning"

echo ""

# 20. MCP SSE Noise Reduction + stopReconnecting
echo "20. MCP SSE Noise Reduction + stopReconnecting (connection.ts, MCPServerInspector.ts)"
check_pattern \
    "packages/api/src/mcp/connection.ts" \
    "shouldStopReconnecting" \
    "shouldStopReconnecting flag prevents reconnection storm after inspection disconnect" \
    "warning"

check_pattern \
    "packages/api/src/mcp/registry/MCPServerInspector.ts" \
    "stopReconnecting" \
    "MCPServerInspector calls stopReconnecting() before disconnect for temp connections" \
    "warning"

echo ""

# 21. Azure OpenAI Custom Icon (GPTIconDark)
echo "21. Azure OpenAI Custom Icon (Icons.tsx)"
check_pattern \
    "client/src/hooks/Endpoint/Icons.tsx" \
    "GPTIconDark" \
    "Azure OpenAI uses GPTIconDark instead of AzureMinimalIcon for visual consistency" \
    "warning"

echo ""

# 22. Paychex Changelog Link
echo "22. Paychex Changelog Link (Footer.tsx, AccountSettings.tsx)"
check_pattern \
    "client/src/components/Chat/Footer.tsx" \
    "changelogURL" \
    "Changelog link rendered in chat footer from config.changelogURL" \
    "warning"

check_pattern \
    "client/src/components/Nav/AccountSettings.tsx" \
    "startupConfig?.changelogURL" \
    "Changelog link rendered in account settings menu" \
    "warning"

echo ""

# 23. Native DEFAULT Badge on ModelSpecItem
echo "23. Native DEFAULT Badge (ModelSpecItem.tsx)"
check_pattern \
    "client/src/components/Chat/Menus/Endpoints/components/ModelSpecItem.tsx" \
    "spec.default === true" \
    "Native DEFAULT badge renders when spec.default is true (replaces Pendo-injected badge)" \
    "warning"

echo ""

# 24. Claude SSE Parsing Fix for Kong
echo "24. Claude SSE Parsing Fix for Kong (generators.ts)"
check_pattern \
    "packages/api/src/utils/generators.ts" \
    "data.choices = \[\]" \
    "Normalize missing choices array in Claude SSE chunks when Kong omits it" \
    "critical"

check_pattern \
    "packages/api/src/utils/generators.ts" \
    "Kong SSE" \
    "Comment documenting Kong SSE workaround for parallel tool call and missing choices bugs" \
    "warning"

# 25. Prompt Catalog Route Wiring (file exists but must be mounted)
echo "25. Prompt Catalog Route Wiring (prompthub.js → server mount)"
check_pattern \
    "api/server/routes/prompthub.js" \
    "resolve-insert" \
    "prompthub.js route file exists with POST /resolve-insert" \
    "critical"

check_pattern \
    "api/server/routes/index.js" \
    "require('./prompthub')" \
    "prompthub imported in routes/index.js" \
    "critical"

check_pattern \
    "api/server/routes/index.js" \
    "prompthub," \
    "prompthub exported from routes/index.js" \
    "critical"

check_pattern \
    "api/server/index.js" \
    "/api/prompthub" \
    "prompthub route mounted in api/server/index.js" \
    "critical"

check_pattern \
    "api/server/experimental.js" \
    "/api/prompthub" \
    "prompthub route mounted in api/server/experimental.js" \
    "critical"

echo ""

# 26. MCP.js Import Dependencies (imports required by Gemini code paths)
echo "26. MCP.js Import Dependencies"
check_pattern \
    "api/server/services/MCP.js" \
    "ContentTypes" \
    "ContentTypes imported (required by Gemini MCP result formatting at line ~752)" \
    "critical"

echo ""

# 27. MCPConnection public stopReconnecting() method
echo "27. MCPConnection stopReconnecting() Method (connection.ts)"
check_pattern \
    "packages/api/src/mcp/connection.ts" \
    "public stopReconnecting" \
    "Public stopReconnecting() method exists (called by MCPServerInspector for temp connections)" \
    "critical"

echo ""

# 28. Paychex i18n Keys in translation.json
# translation.json is the most dangerous merge file — Paychex keys are interleaved
# alphabetically and get silently dropped when upstream regions are accepted wholesale.
echo "28. Paychex i18n Keys (client/src/locales/en/translation.json)"
TRANSLATION_FILE="client/src/locales/en/translation.json"

check_pattern \
    "$TRANSLATION_FILE" \
    "com_ui_prompt_catalog_insert_error" \
    "Prompt Catalog error toast key exists" \
    "critical"

check_pattern \
    "$TRANSLATION_FILE" \
    "com_nav_changelog" \
    "Paychex Changelog nav link label exists" \
    "warning"

check_pattern \
    "$TRANSLATION_FILE" \
    "com_ui_default_model" \
    "DEFAULT model badge label exists" \
    "warning"

check_pattern \
    "$TRANSLATION_FILE" \
    "com_ui_default_model_aria" \
    "DEFAULT model badge aria label exists" \
    "warning"

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
