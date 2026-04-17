```instructions
---
description: "Comprehensive list of Paychex-specific customizations in LibreChat. Reference when verifying merges or identifying custom code."
---

# Paychex LibreChat Customizations Reference

Complete catalog of Paychex-specific modifications to LibreChat.

## Backend Customizations

### Tool Call & Schema Management

**1. Cross-Provider Tool Call Filtering**
- **File:** `api/app/clients/BaseClient.js`
- **Method:** `filterCrossProviderToolCalls()`
- **Purpose:** Filters tool calls before sending to Gemini to prevent "Proto field is not repeating" errors
- **Pattern:** `filterCrossProviderToolCalls`
- **Secondary pattern (warning):** `Proto field is not repeating` (explanatory comment)
- **Criticality:** CRITICAL - Application crashes on tool use with Gemini without this
- **Added:** v0.8.1 Paychex fork
- **Context:** Gemini custom endpoints require different tool call format than standard OpenAI format

**2. Schema Metadata Sanitization**
- **File:** `api/server/services/start/tools.js`
- **Import:** `const { sanitizeSchemaMetadata } = require('@librechat/api');`
- **Usage:** `parameters: sanitizeSchemaMetadata(parameters)` in `formatToOpenAIAssistantTool`
- **Purpose:** Removes OpenAPI schema fields incompatible with Gemini (e.g., `$schema`, `definitions`)
- **Pattern:** `sanitizeSchemaMetadata` (both import and call-site must be present)
- **Criticality:** CRITICAL - Tool calls fail validation with Gemini without this
- **Added:** v0.8.1 Paychex fork

**3. Gemini Custom Endpoint Detection**
- **File:** `api/server/services/MCP.js`
- **Locations:** 2 places in file
- **Pattern:** `providerLower.includes('gemini') || providerLower.includes('google')`
- **Variable:** `isGoogleLike` used for conditional formatting
- **Purpose:** Detect Gemini custom endpoints and format tool responses appropriately
- **Criticality:** CRITICAL - Custom Gemini endpoints don't work without this
- **Added:** v0.8.1 Paychex fork
- **Context:** Paychex uses custom Gemini endpoints that need special handling

**4. Endpoints Index — @librechat/api Imports**
- **File:** `api/server/services/Endpoints/index.js`
- **Patterns:** `= require('@librechat/api')`, `initializeCustom`, `initializeOpenAI`
- **Purpose:** Ensures endpoint initialization functions are imported from the correct compiled package. Upstream refactors have moved these from old relative paths (e.g., `./custom/initialize`) into `@librechat/api`; stale require() paths cause silent runtime failures
- **Anti-patterns:** `require('.*custom/initialize')` (old relative path), `require('.*OpenAIClient')` (deleted file)
- **Criticality:** CRITICAL - Wrong imports cause endpoint initialization to fail at startup
- **Added:** v0.8.4 merge fix
- **Context:** The script checks for both the correct patterns AND the absence of old broken patterns

**5. Broken File Reference Guard**
- **Files:** `api/server/services/Endpoints/index.js`, `api/` (recursive)
- **Purpose:** Ensures no code still references deleted upstream files (`OpenAIClient.js`, old-style `custom/initialize` paths). Upstream refactors delete and rename files; a merge that auto-resolves conflicts may silently preserve stale `require()` calls that crash at runtime
- **Anti-patterns (must be absent):**
  - `require('.*custom/initialize')` in Endpoints/index.js not via `@librechat/api`
  - `require('.*OpenAIClient')` anywhere in `api/` (file was deleted upstream)
- **Criticality:** CRITICAL - App crashes on startup if stale references remain
- **Added:** v0.8.4 merge retrospective

### Build & Deployment

**6. Dockerfile Error Handling**
- **File:** `Dockerfile`
- **Pattern:** `npm run frontend && \` (not `npm run frontend; \`)
- **Also:** `npm prune --production && \`
- **Purpose:** Build fails fast on first error instead of masking failures
- **Criticality:** CRITICAL - Prevents broken builds from being deployed
- **Added:** Paychex DevOps best practice
- **Context:** `;` continues on error, `&&` stops immediately

**7. xlsx Package Source**
- **Files:** `api/package.json`, `packages/api/package.json`
- **Pattern:** `"xlsx": "^0.18.5"` (npm registry)
- **Anti-pattern:** `"xlsx": "https://cdn.sheetjs.com/..."` (CDN)
- **Purpose:** Avoid CDN 403 errors
- **Criticality:** CRITICAL - Builds fail if using CDN
- **Added:** v0.8.4 merge fix
- **Context:** SheetJS CDN is unreliable, returns 403 intermittently

**8. Axios Security Version Floor**
- **Files:** `api/package.json`, `packages/api/package.json`, `packages/data-provider/package.json`, `packages/data-provider/react-query/package.json`, `packages/data-provider/react-query/package-lock.json`
- **Requirement:** axios `>= 1.15.0` in all of the above
- **Anti-pattern:** any version `< 1.15.0`
- **Purpose:** Pins axios above the security vulnerability patched in 1.15.0; upstream may revert or introduce an older transitive version during a merge
- **Criticality:** CRITICAL - Security vulnerability if version falls below floor
- **Added:** v0.8.4 security update
- **Context:** Check each package file individually — transitive locks can quietly downgrade the resolved version

## Frontend Customizations

### Analytics & Tracking

**9. Pendo Analytics Integration**
- **File:** `client/src/components/Chat/Menus/Endpoints/ModelSelector.tsx`
- **Element:** `<span id="agentUsers" className="sr-only" aria-hidden="true" />`
- **Purpose:** Tracking element for Pendo to monitor AI agent usage metrics
- **Pattern:** `id="agentUsers"`
- **Criticality:** WARNING - Business metrics only, app functions without it
- **Added:** Paychex business intelligence initiative
- **Context:** Pendo script in production reads this element to track feature usage

### UI/UX Enhancements

**10. Dropdown Menu Descriptions**
- **File:** `packages/client/src/components/DropdownPopup.tsx`
- **Features:**
  - `item.description` rendering with smaller gray text
  - `items-start` flex alignment for multi-line content
  - `transition-colors duration-200` for smooth hover effects
- **Pattern:** `item.description`
- **Criticality:** WARNING - UX enhancement, app functions without it
- **Added:** v0.8.2 Paychex UX improvements
- **Context:** Improves usability by showing detailed descriptions in dropdowns

**11. Declarative ToolsDropdown Structure**
- **File:** `client/src/components/Chat/Input/ToolsDropdown.tsx`
- **Pattern:** Items with `label:`, `description:`, `icon:` properties
- **Purpose:** Cleaner separation of data and presentation logic
- **Criticality:** WARNING - Code organization, app functions without it
- **Added:** v0.8.2 Paychex refactor
- **Context:** Makes tools menu more maintainable and consistent

## Authentication & Authorization

**12. Azure Entra ID OpenID Connect**
- **Files:** `az_container_app_definitions/*.yml`
- **Configuration:** Environment-specific OpenID settings
- **Purpose:** Single Sign-On using Paychex corporate accounts
- **Pattern:** `openIdIssuerUrl`, `clientId` in container definitions
- **Criticality:** CRITICAL - Only auth method for Paychex users
- **Added:** Initial Paychex fork setup
- **Context:** Each environment (n1, n2a, prod) has own client ID

**13. OpenID Header Passthrough**
- **Files:** `api/server/middleware/*.js` (various auth middlewares)
- **Purpose:** Pass OpenID headers through intermediate services
- **Pattern:** Header forwarding and validation
- **Criticality:** CRITICAL - Auth fails without proper header handling
- **Added:** Paychex auth integration
- **Context:** Azure Front Door to container requires header preservation

## Configuration & Environment

**14. Environment-Specific librechat.yml**
- **Files:** `librechat.n1.yml`, `librechat.n2a.yml`, `librechat.prod.yml`
- **Purpose:** Per-environment model and feature configurations
- **Differences:** Model availability, streaming settings, MCP servers
- **Criticality:** CRITICAL - Wrong config breaks environment
- **Added:** Paychex multi-environment strategy
- **Context:** N1 is staging, N2A is preview, Prod is production

**15. Azure Container App Definitions**
- **Files:** `az_container_app_definitions/*.yml`
- **Purpose:** Infrastructure-as-code for Azure deployments
- **Contains:** Domain names, auth, secrets, scaling rules
- **Criticality:** CRITICAL - Defines production infrastructure
- **Added:** Paychex infrastructure setup
- **Context:** Used by GitHub Actions for deployments

## CI/CD Pipeline

**16. GitHub Actions Workflows**
- **Files:** `.github/workflows/*.yml`
- **Purpose:** Automated deployment to Azure Container Apps
- **Triggers:** Push to develop (→ n2a), release/* (→ n1), manual (→ prod)
- **Criticality:** CRITICAL - Only deployment mechanism
- **Added:** Paychex DevOps setup
- **Context:** Builds Docker image, pushes to ACR, updates container app

## Migrations & Data

**17. Role/Permission Migration Scripts**
- **Files:** `config/migrate-agent-permissions.js`, `config/migrate-prompt-permissions.js`
- **Purpose:** Update database schemas for Paychex role structure
- **Pattern:** Paychex-specific role definitions
- **Criticality:** MEDIUM - Affects feature access control
- **Added:** Paychex RBAC implementation
- **Context:** Don't expose role names in user-facing docs

## Testing & Development

**18. MongoDB Memory Server Configuration**
- **Files:** Jest configurations, test setups
- **Purpose:** In-memory MongoDB for testing
- **Known Issue:** Download failures on RHEL 9.0 (acceptable, not merge-related)
- **Pattern:** `mongodb-memory-server`
- **Criticality:** LOW - Test infrastructure only
- **Added:** Inherited from upstream, Paychex accepts RHEL issues
- **Context:** 93%+ pass rate is acceptable

## Documentation

**19. Paychex-Specific README**
- **File:** `PAYCHEX_README.md`
- **Purpose:** Paychex workflows, environments, deployment process
- **Criticality:** LOW - Documentation only
- **Added:** Initial Paychex fork
- **Context:** Team reference, not code

**20. Merge Process Documentation**
- **Files:** `docs/merge-process/*.md`
- **Purpose:** Standardize upstream merge workflows
- **Criticality:** LOW - Process documentation
- **Added:** v0.8.4 merge retrospective
- **Context:** You're reading these docs now!

## MCP Customizations

**21. MCP Server Name Normalization**
- **Files:** `packages/api/src/mcp/registry/MCPServerInspector.ts`, `api/server/services/MCP.js`
- **Function:** `normalizeServerName(serverName)` (imported from `packages/api/src/mcp/utils.ts`)
- **Pattern (must be present):** `normalizeServerName(serverName)` in both files when constructing tool keys with `mcp_delimiter`
- **Anti-pattern (must be absent):** raw `${serverName}` after `mcp_delimiter` without normalization
- **Purpose:** Upstream defect — MCP server names with spaces or special characters (e.g., `"Internet Search (Tavily)"`) produce tool key strings that fail the `^[a-zA-Z0-9_.-]+$` pattern validation, causing 400 errors on every tool call. `normalizeServerName` replaces non-matching characters with underscores
- **Criticality:** CRITICAL — Any MCP server with spaces/special chars in its name returns 400 errors on tool calls without this
- **Added:** v0.8.4 post-merge bug fix (upstream defect)
- **Build note:** `MCPServerInspector.ts` is TypeScript; requires `npm run build -w packages/api` after changes for the fix to take effect in the running backend

**22. MCP startup Field in API Response Allowlist**
- **File:** `packages/api/src/mcp/utils.ts`
- **Function:** `redactServerSecrets()`
- **Pattern:** `startup: config.startup`
- **Purpose:** Allowlists the `startup` field so it is included in `GET /api/mcp/servers` responses; without it the frontend never sees `startup: true` and cannot auto-select servers
- **Criticality:** CRITICAL — Tavily (and any future `startup: true` server) will silently fail to auto-select without this
- **Added:** v0.8.4 post-merge restoration
- **Build note:** `packages/api/src/mcp/utils.ts` is TypeScript that compiles to `packages/api/dist/index.js`. The backend Express server imports the **compiled dist**, not the TypeScript sources. Any change here requires `npm run build -w packages/api` before restarting the backend, or the fix will not take effect.

**23. MCP Startup Auto-Select**
- **File:** `client/src/hooks/MCP/useMCPServerManager.ts`
- **Pattern:** `s.config.startup === true`
- **Purpose:** `useEffect` that auto-selects MCP servers configured with `startup: true` for every new conversation when `mcpValues` is empty; runs against `availableMCPServers` (unfiltered) so servers with `chatMenu: false` are still included
- **Why here (not `useMCPSelect`):** `useMCPSelect` only receives `selectableServers` (filtered to `chatMenu !== false`). Placing the logic in `useMCPServerManager` gives it access to all servers regardless of menu visibility.
- **Criticality:** CRITICAL — Without this, Tavily is never activated for new conversations
- **Added:** v0.8.4 post-merge restoration (upstream removed the hook where this previously lived)

**24. Model Preference Guard in New Conversation Preset**
- **File:** `client/src/routes/ChatRoute.tsx`
- **Function:** `getNewConvoPreset()`
- **Pattern:** `hasStoredModelSelection`
- **Purpose:** Prevents the default model spec preset from overwriting the user's previously stored model selection (`lastConversationSetup` in localStorage); if a stored model or agentOptions.model exists, `activePreset` is set to `undefined` so the user's choice is respected
- **Criticality:** WARNING — App functions without it, but users' model selection is silently reset on every new conversation
- **Added:** v0.8.4 post-merge restoration

## Verification Patterns

Use these patterns when verifying customizations are present:

```bash
# 1. Backend — Tool call & schema
grep -r "filterCrossProviderToolCalls" api/app/clients/
grep -r "sanitizeSchemaMetadata" api/server/services/start/
grep -r "providerLower.includes('gemini')" api/server/services/MCP.js

# 4-5. Backend — Endpoints index (correct imports, no broken references)
grep -n "= require('@librechat/api')" api/server/services/Endpoints/index.js
grep -n "initializeCustom\|initializeOpenAI" api/server/services/Endpoints/index.js
# Anti-patterns — these must NOT appear:
grep -r "require('.*OpenAIClient')" api/ | grep -v node_modules

# 6-8. Build & security
grep "npm run frontend &&" Dockerfile
grep '"xlsx":' api/package.json packages/api/package.json   # must NOT be cdn.sheetjs.com
grep '"axios"' api/package.json packages/api/package.json packages/data-provider/package.json

# 9-11. Frontend
grep -r 'id="agentUsers"' client/src/components/
grep -r "item.description" packages/client/src/components/DropdownPopup.tsx
grep -r "transition-colors duration-200" packages/client/src/components/
grep -r 'label:.*localize' client/src/components/Chat/Input/ToolsDropdown.tsx

# 14-15. Configuration
ls -la librechat.*.yml
ls -la az_container_app_definitions/*.yml

# 21. MCP server name normalization
grep -n "normalizeServerName" packages/api/src/mcp/registry/MCPServerInspector.ts
grep -n "normalizeServerName" api/server/services/MCP.js
# Anti-patterns — raw serverName after mcp_delimiter must NOT appear without normalizeServerName:
grep -n 'mcp_delimiter}${serverName}' packages/api/src/mcp/registry/MCPServerInspector.ts | grep -v normalizeServerName

# 22-24. MCP customizations
grep -n "startup: config.startup" packages/api/src/mcp/utils.ts
grep -n "s.config.startup === true" client/src/hooks/MCP/useMCPServerManager.ts
grep -n "hasStoredModelSelection" client/src/routes/ChatRoute.tsx
```

## Future Maintenance

When adding new Paychex customizations:

1. **Document here** - Add to this file with full details and the next sequential item number
2. **Update verification script** - Add pattern check to `scripts/verify-paychex-customizations.sh`
3. **Add to workspace instructions** - Update `.github/copilot-instructions.md`
4. **Tag in code** - Add comment: `// PAYCHEX: [description]`
5. **Categorize** - Assign criticality level (CRITICAL/WARNING)

## Customization Categorization Guide

**CRITICAL** - Application breaks, security fails, or builds fail without this:
- Tool call filtering
- Schema sanitization
- Auth configurations
- Dockerfile error handling
- Critical dependency fixes
- MCP server name normalization
- MCP startup field and auto-select

**WARNING** - Feature degraded but application functions:
- Analytics tracking
- UI/UX enhancements
- Code organization improvements
- Documentation
- Model preference guard

Use this as reference when deciding whether to preserve customization during upstream merges.

```
