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

**9. Pendo Analytics Integration (PendoInitializer Wrapper)**
- **File:** `client/src/routes/index.tsx`
- **Import:** `import { PendoInitializer } from '~/hooks/Pendo';`
- **Pattern:** `<PendoInitializer>` wrapping content inside `AuthLayout`
- **Purpose:** Initializes Pendo analytics SDK for the authenticated user session. Required for the "See newest features" Resource Center button, in-app guides, and all Pendo tracking.
- **Criticality:** CRITICAL - Pendo "See newest features" button and all analytics disappear without this
- **Added:** v0.8.1 Paychex fork (hook migration in Dec 2025)
- **Context:** Upstream v0.8.7 replaced this with `<WithRum>` (HyperDX). Both must coexist: `PendoInitializer` wraps `WithRum` inside `AuthLayout`.
- **Anti-pattern (must be absent):** `AuthLayout` without `PendoInitializer` wrapping the content

**9b. Pendo Tracking Element (ModelSelector)**
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

**10b. File Attach Menu Descriptions**
- **File:** `client/src/components/Chat/Input/Files/AttachFileMenu.tsx`
- **Pattern:** `description: localize('com_ui_upload_image_input_description')` (and similar for each menu item)
- **Locale keys (must be present in `client/src/locales/en/translation.json`):**
  - `com_ui_upload_image_input_description`
  - `com_ui_upload_ocr_text_description`
  - `com_ui_upload_provider_description`
  - `com_ui_upload_file_search_description`
  - `com_ui_upload_code_environment_description`
- **Purpose:** Each upload menu item shows a brief description explaining what it does. Relies on DropdownPopup (#10) to render descriptions.
- **Criticality:** WARNING - UX enhancement, users lose context about upload options without it
- **Added:** v0.8.2 Paychex UX (lost in v0.8.7 merge due to AttachFileMenu refactor, restored June 2026)
- **Context:** Upstream frequently refactors this component. After each merge, verify that every `items.push({...})` call includes a `description:` property, and that the corresponding locale keys exist in translation.json.

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

**25. Anthropic Image Encoding for Custom Endpoints**
- **File:** `api/server/services/Files/images/encode.js`
- **Function:** `encodeAndFormat()`
- **Pattern:** `effectiveEndpoint.toLowerCase().includes('claude') || effectiveEndpoint.toLowerCase().includes('anthropic')`
- **Purpose:** Converts uploaded image parts to Anthropic-native format (`type: 'image'`, `source: { type: 'base64', ... }`) for both the native `anthropic` endpoint **and** custom endpoints whose name contains "claude" or "anthropic" (e.g. `"Claude Sonnet 4.5"`). Without this, the `image_url` OpenAI-style part is sent to the Anthropic API, which rejects it with a 400 error.
- **Also fixes:** The Anthropic conversion block is now placed **before** the `VisionModes.agents` early-return so it is reachable for agent-path uploads (previously dead code for agents). Google formatting remains after the agents check, unaffected.
- **Criticality:** CRITICAL — Image uploads to any Claude/Anthropic endpoint throw a 400 error without this
- **Added:** April 2026 bugfix
- **Context:** For ephemeral agents (non-agent-endpoint model chats), `agent.provider` is set to the endpoint name string, not `EModelEndpoint.anthropic`, so a strict equality check is insufficient.

**26. Prompt Catalog Insert Deep-Link Integration**
- **Files:** `api/server/index.js`, `api/server/experimental.js`, `api/server/routes/index.js`, `api/server/routes/prompthub.js`, `packages/api/src/promptCatalog/handlers.ts`, `packages/api/src/promptCatalog/index.ts`, `packages/api/src/index.ts`, `client/src/hooks/Input/useQueryParams.ts`, `client/src/routes/ChatRoute.tsx`, `.env.example`
- **Patterns (must be present):**
  - `/api/prompthub` mounted in both `api/server/index.js` and `api/server/experimental.js`
  - `POST /api/prompthub/resolve-insert`
  - `createPromptHubResolveInsertHandler`
  - `PROMPT_CATALOG_API_URL`
  - `promptCatalogId` and `prompt_catalog_id`
  - `x-forwarded-user-email`, `x-forwarded-user-name`
  - `com_ui_prompt_catalog_insert_error`
- **Purpose:** Supports AI Hub Prompt Catalog deep links that open LibreChat with only a Prompt Catalog ID. LibreChat resolves the stored prompt server-side through its own backend, forwards authenticated user identity headers to Prompt Catalog, injects the resolved text into the composer, excludes insert params from model/preset query parsing, and shows a toast if resolution fails or times out.
- **Anti-patterns (must be absent):**
  - direct browser fetch from LibreChat client to Prompt Catalog
  - full prompt text handoff in the LibreChat URL for this feature
- **Criticality:** WARNING — App functions without it, but AI Hub → LibreChat Prompt Catalog deep links silently break or hang without these pieces
- **Added:** April 2026
- **Context:** This is intentionally simpler than `feature/prompthub-integration`; preserve the ID-based same-origin flow and do not replace it with ticket/callback/export behavior unless scope changes.
- **Build note:** `packages/api/src/promptCatalog/*.ts` compiles into `@librechat/api`, which the JS route layer loads from `packages/api/dist`. Any change here requires `npm run build:api` before restarting the backend, or use the updated `npm run backend:dev` script which rebuilds the compiled packages first.

**35. MCP Select Infinite Loop Fix (chatMenu:false + startup:true)**
- **Files:** `client/src/hooks/MCP/useMCPServerManager.ts`, `client/src/components/Chat/Input/MCPSelect.tsx`
- **Patterns:**
  - `servers: availableMCPServers` in the `useMCPSelect()` call (was `selectableServers`)
  - `visibleSelected` / `visibleCount` in `MCPSelect.tsx` `displayText` computation
- **Purpose:** Fixes an infinite render loop when a server has both `chatMenu: false` and `startup: true` (e.g. Tavily). The auto-select effect in `useMCPServerManager` uses `availableMCPServers` (unfiltered) to select startup servers, but `useMCPSelect` previously received only `selectableServers` (filtered, excludes `chatMenu: false`). The sync effect inside `useMCPSelect` would strip the hidden server from `mcpValues`, triggering the auto-select again, creating an infinite loop that caused the MCP button text to flicker between the placeholder and the hidden server name. Fix (1): pass `availableMCPServers` to `useMCPSelect` so the sync effect recognizes hidden servers as valid. Fix (2): compute `displayText` using only visible servers so hidden server names don't leak into the button label.
- **Anti-pattern (must be absent):** `servers: selectableServers` in the `useMCPSelect()` call inside `useMCPServerManager`
- **Criticality:** CRITICAL — Causes infinite render loop and visible UI flickering without this
- **Added:** June 2026 (v0.8.6 merge fix)

## Authentication Fixes (post-v0.8.4)

**27. SSO Rate Limit Fix**
- **File:** `api/server/middleware/limiters/loginLimiter.js`
- **Pattern:** `skipSuccessfulRequests: true`
- **Purpose:** OAuth SSO flows (`/oauth/openid` and `/oauth/openid/callback`) return 302 redirects. Without `skipSuccessfulRequests: true`, responses with status < 400 are counted against the rate limit window. When a JWT expires and all open tabs simultaneously re-authenticate through Azure Entra ID, this previously caused rate-limit false positives that locked users out.
- **Criticality:** CRITICAL — Multi-tab SSO users get rate-limited without this
- **Added:** May 2026 (PR #153)

**28. OpenID Access Token Refresh Middleware**
- **Files:** `api/server/middleware/refreshOpenIDToken.js`, `api/server/routes/agents/index.js`
- **Patterns:**
  - `isAccessTokenExpiredOrExpiringSoon` — proactive 30-second buffer check against session access_token
  - `_inflight` — module-level Map deduplicating concurrent refresh grants for the same user
  - `refreshOpenIDToken` imported and used in `api/server/routes/agents/index.js`
- **Purpose:** Azure AD issues access_tokens with a ~15-min lifetime, shorter than the id_token (~60-90 min) used for LibreChat session auth. After the access_token expires, requireJwtAuth still passes (id_token valid) but the expired access_token forwarded to Paxton via `{{LIBRECHAT_OPENID_ACCESS_TOKEN}}` causes a 401. The middleware proactively refreshes before agent requests and deduplicates concurrent refresh attempts to prevent Azure AD `invalid_grant` rotation race conditions.
- **Criticality:** CRITICAL — Paxton agent calls fail with 401 after ~15 min without this
- **Added:** May 2026 (PRs #148, #150)

## Backend Fixes (post-v0.8.4)

**29. RAG Context 404 Graceful Handling**
- **File:** `api/app/clients/prompts/createContextHandlers.js`
- **Pattern:** `Promise.allSettled`
- **Purpose:** When `RAG_USE_FULL_CONTEXT` is true and a file has not been indexed (e.g. image-only PDF with empty embeddings), the RAG API returns 404. The previous `Promise.all` caused the first 404 to reject and crash the entire generation, leaving the input field disabled. `Promise.allSettled` isolates per-file failures — 404s are logged and skipped, other files still provide context.
- **Criticality:** WARNING — App appears broken for users with unindexed files without this
- **Added:** April 2026 (PR #143)

**30. MCP SSE Noise Reduction + stopReconnecting**
- **Files:** `packages/api/src/mcp/connection.ts`, `packages/api/src/mcp/registry/MCPServerInspector.ts`
- **Patterns:**
  - `shouldStopReconnecting` in `connection.ts` — flag that halts the background reconnection loop before disconnect
  - `stopReconnecting` in `MCPServerInspector.ts` — called before `disconnect()` for temporary inspection connections
- **Purpose:** Transient SSE transport errors previously logged at error level, flooding Splunk. Non-transient errors (DNS failure, ECONNREFUSED) remain at error level. `stopReconnecting()` closes the race condition where a dropped SSE during server inspection triggered a reconnection storm under the placeholder `temp_server_name` identity.
- **Criticality:** WARNING — Splunk noise and phantom reconnections without this
- **Added:** April 2026 (PR #141)

**31. Claude Custom-Endpoint SSE Parsing Fix for Kong**
- **File:** `packages/api/src/utils/generators.ts`
- **Patterns:**
  - `data.choices = []` — normalizes missing `choices` array in Claude SSE chunks
  - `Kong SSE` comment — documents the workaround
- **Purpose:** Kong (Paychex's API gateway) omits the `choices` array from some Claude SSE chunks. LangChain's OpenAI-compatible SSE parser assumes `choices[0]` always exists and throws without it. The fix normalizes chunks without a `choices` array before they reach the parser.
- **Criticality:** CRITICAL — Claude custom-endpoint streaming breaks silently without this
- **Added:** June 2026 (PR #156)
- **Build note:** TypeScript in `packages/api/src/`; requires `npm run build -w packages/api` after changes

## Frontend Enhancements (post-v0.8.4)

**32. Azure OpenAI Custom Icon (GPTIconDark)**
- **File:** `client/src/hooks/Endpoint/Icons.tsx`
- **Pattern:** `GPTIconDark`
- **Purpose:** Replaces `AzureMinimalIcon` with a Paychex-styled `GPTIconDark` component for the Azure OpenAI endpoint icon — a dark circular badge containing the GPT icon. Provides visual consistency with the OpenAI endpoint icon while distinguishing Azure deployments.
- **Anti-pattern (must be absent):** `AzureMinimalIcon` imported or used in `Icons.tsx`
- **Criticality:** WARNING — Visual regression only
- **Added:** April 2026 (PR #140)

**33. Paychex Changelog Link**
- **Files:** `client/src/components/Chat/Footer.tsx`, `client/src/components/Nav/AccountSettings.tsx`
- **Patterns:**
  - `changelogURL` in `Footer.tsx` — renders changelog link in chat footer from `config.changelogURL`
  - `startupConfig?.changelogURL` in `AccountSettings.tsx` — renders changelog link in account settings menu
- **Purpose:** Exposes the Paychex changelog URL (configured via `librechat.*.yml`) in both the chat footer and account settings for user-facing release notes.
- **Criticality:** WARNING — User-facing feature, app functions without it
- **Added:** April 2026 (PR #146)

**34. Native DEFAULT Badge on ModelSpecItem**
- **File:** `client/src/components/Chat/Menus/Endpoints/components/ModelSpecItem.tsx`
- **Pattern:** `spec.default === true`
- **Purpose:** Renders a native React DEFAULT badge when `spec.default === true`, replacing the previous Pendo-injected badge. Always tracks whichever model spec is marked as default in config, regardless of model name. Adds `com_ui_default_model` and `com_ui_default_model_aria` localization keys.
- **Criticality:** WARNING — Visual regression only, Pendo badge no longer works for this
- **Added:** May 2026 (PR #152)

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
grep -r "PendoInitializer" client/src/routes/index.tsx
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

# 25. Anthropic image encoding for custom endpoints
grep -n "includes('claude')\|includes('anthropic')" api/server/services/Files/images/encode.js
# Anti-pattern — Anthropic branch must NOT be below the VisionModes.agents early-return:
# Verify the 'if (mode === VisionModes.agents)' block appears AFTER the Anthropic else-if block
grep -n "VisionModes.agents\|includes('claude')" api/server/services/Files/images/encode.js

# 26. Prompt Catalog insert deep-link integration
grep -n "/api/prompthub" api/server/index.js api/server/experimental.js api/server/routes/index.js
grep -n "createPromptHubResolveInsertHandler" api/server/routes/prompthub.js packages/api/src/index.ts packages/api/src/promptCatalog/handlers.ts
grep -n "PROMPT_CATALOG_API_URL" .env.example api/server/routes/prompthub.js packages/api/src/promptCatalog/handlers.ts
grep -n "x-forwarded-user-email\|x-forwarded-user-name" packages/api/src/promptCatalog/handlers.ts
grep -n "promptCatalogId\|prompt_catalog_id" client/src/hooks/Input/useQueryParams.ts client/src/routes/ChatRoute.tsx
grep -n "com_ui_prompt_catalog_insert_error" client/src/hooks/Input/useQueryParams.ts client/src/locales/en/translation.json

# 22-24. MCP customizations
grep -n "startup: config.startup" packages/api/src/mcp/utils.ts
grep -n "s.config.startup === true" client/src/hooks/MCP/useMCPServerManager.ts
grep -n "hasStoredModelSelection" client/src/routes/ChatRoute.tsx
```

```bash
# 35. MCP Select infinite loop fix
grep -n "servers: availableMCPServers" client/src/hooks/MCP/useMCPServerManager.ts
grep -n "visibleSelected\|visibleCount" client/src/components/Chat/Input/MCPSelect.tsx
# Anti-pattern — must NOT pass selectableServers to useMCPSelect:
grep -n "servers: selectableServers" client/src/hooks/MCP/useMCPServerManager.ts | grep -i "useMCPSelect"

# 27. SSO rate limit fix
grep -n "skipSuccessfulRequests" api/server/middleware/limiters/loginLimiter.js

# 28. OpenID token refresh middleware
grep -n "isAccessTokenExpiredOrExpiringSoon\|_inflight" api/server/middleware/refreshOpenIDToken.js
grep -n "refreshOpenIDToken" api/server/routes/agents/index.js

# 29. RAG context 404 graceful handling
grep -n "Promise.allSettled" api/app/clients/prompts/createContextHandlers.js

# 30. MCP SSE noise + stopReconnecting
grep -n "shouldStopReconnecting" packages/api/src/mcp/connection.ts
grep -n "stopReconnecting" packages/api/src/mcp/registry/MCPServerInspector.ts

# 31. Claude SSE parsing fix (Kong)
grep -n "data.choices = \[\]\|Kong SSE" packages/api/src/utils/generators.ts

# 32. Azure OpenAI custom icon
grep -n "GPTIconDark" client/src/hooks/Endpoint/Icons.tsx
# Anti-pattern — AzureMinimalIcon must NOT be imported:
grep -n "AzureMinimalIcon" client/src/hooks/Endpoint/Icons.tsx

# 33. Paychex changelog link
grep -n "changelogURL" client/src/components/Chat/Footer.tsx
grep -n "startupConfig?.changelogURL" client/src/components/Nav/AccountSettings.tsx

# 34. Native DEFAULT badge
grep -n "spec.default === true" client/src/components/Chat/Menus/Endpoints/components/ModelSpecItem.tsx
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
- MCP Select infinite loop fix (chatMenu:false + startup:true)

**WARNING** - Feature degraded but application functions:
- Analytics tracking
- UI/UX enhancements
- Code organization improvements
- Documentation
- Model preference guard
- Prompt Catalog insert integration

Use this as reference when deciding whether to preserve customization during upstream merges.

```
