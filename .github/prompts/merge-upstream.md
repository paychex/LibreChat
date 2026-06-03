# Upstream Merge Prompt Template

**Usage:** Fill in the variables, then paste to GitHub Copilot or your AI assistant.

---

## Copy-Paste Ready Prompt

```
I need to merge LibreChat upstream version [TARGET_VERSION] into Paychex develop branch.

**Context:**
- Current version: [CURRENT_VERSION] 
- Target version: [TARGET_VERSION]
- Merge branch: feature/merge-upstream-[TARGET_VERSION]
- Repository: Paychex LibreChat fork
- Documentation: docs/merge-process/UPSTREAM_MERGE_GUIDE.md

**Critical Paychex Customizations to Preserve:**

1. **Tool Call Filtering** (api/app/clients/BaseClient.js)
   - Method: `filterCrossProviderToolCalls`
   - Prevents Gemini "Proto field is not repeating" errors

2. **Schema Sanitization** (api/server/services/start/tools.js)
   - Import and usage of `sanitizeSchemaMetadata`
   - Required for Gemini tool compatibility

3. **Gemini Endpoint Detection** (api/server/services/MCP.js)
   - Pattern: `providerLower.includes('gemini') || providerLower.includes('google')`
   - Appears in 2 locations

4. **Pendo Analytics** (client/src/components/Chat/Menus/Endpoints/ModelSelector.tsx)
   - Element: `<span id="agentUsers" />`

5. **Menu Descriptions** (packages/client/src/components/DropdownPopup.tsx)
   - `item.description` rendering
   - `items-start` alignment
   - CSS transitions

6. **Dockerfile Error Handling** (Dockerfile)
   - `&&` operators (not `;`)

7. **xlsx Package** (api/package.json, packages/api/package.json)
   - Must use: `"xlsx": "^0.18.5"` (npm registry, not CDN)

8. **Anthropic Image Encoding** (api/server/services/Files/images/encode.js)
   - Pattern: `effectiveEndpoint.toLowerCase().includes('claude') || effectiveEndpoint.toLowerCase().includes('anthropic')`
   - This block must appear **before** the `if (mode === VisionModes.agents)` early-return
   - Converts image parts to Anthropic-native format for custom Claude/Anthropic endpoints
   - Without this (or if block order is wrong), image uploads to Claude endpoints throw 400 errors

9. **Prompt Catalog Insert Deep-Link Integration** (`api/server/routes/prompthub.js`, `packages/api/src/promptCatalog/handlers.ts`, `client/src/hooks/Input/useQueryParams.ts`, `client/src/routes/ChatRoute.tsx`)
   - Patterns: `/api/prompthub/resolve-insert`, `promptCatalogId`, `PROMPT_CATALOG_API_URL`, `com_ui_prompt_catalog_insert_error`
   - Required for AI Hub Prompt Catalog deep links to open LibreChat with server-side resolved prompt text
   - Preserve the route mount, `@librechat/api` export, query-param exclusion in `ChatRoute`, and failure timeout/toast behavior

10. **SSO Rate Limit Fix** (`api/server/middleware/limiters/loginLimiter.js`)
    - Pattern: `skipSuccessfulRequests: true`
    - Prevents multi-tab SSO users from being rate-limited when all tabs simultaneously re-authenticate after JWT expiry

11. **OpenID Token Refresh Middleware** (`api/server/middleware/refreshOpenIDToken.js`, `api/server/routes/agents/index.js`)
    - Patterns: `isAccessTokenExpiredOrExpiringSoon`, `_inflight` Map, `refreshOpenIDToken` in agents router
    - Prevents Paxton 401s after ~15 minutes by proactively refreshing expired Azure AD access_tokens before agent requests
    - `_inflight` deduplicates concurrent refresh grants to prevent Azure AD `invalid_grant` rotation race

12. **RAG Context 404 Graceful Handling** (`api/app/clients/prompts/createContextHandlers.js`)
    - Pattern: `Promise.allSettled` (not `Promise.all`)
    - Isolates per-file 404 failures so unindexed files don't crash the entire generation

13. **MCP SSE Noise Reduction + stopReconnecting** (`packages/api/src/mcp/connection.ts`, `packages/api/src/mcp/registry/MCPServerInspector.ts`)
    - Patterns: `shouldStopReconnecting` in connection.ts, `stopReconnecting()` called in MCPServerInspector before disconnect for temp connections
    - Prevents reconnection storm after server inspection; reduces Splunk noise from transient SSE errors

14. **Claude SSE Parsing Fix for Kong** (`packages/api/src/utils/generators.ts`)
    - Pattern: `data.choices = []`
    - Kong omits the `choices` array from some Claude SSE chunks; normalize to prevent LangChain parser crash
    - Requires `npm run build -w packages/api` after any change

15. **Azure OpenAI Custom Icon** (`client/src/hooks/Endpoint/Icons.tsx`)
    - Pattern: `GPTIconDark` component replaces `AzureMinimalIcon`
    - Visual consistency for Azure OpenAI endpoint

16. **Paychex Changelog Link** (`client/src/components/Chat/Footer.tsx`, `client/src/components/Nav/AccountSettings.tsx`)
    - Patterns: `changelogURL` in Footer, `startupConfig?.changelogURL` in AccountSettings
    - Exposes the Paychex changelog URL configured in `librechat.*.yml`

17. **Native DEFAULT Badge** (`client/src/components/Chat/Menus/Endpoints/components/ModelSpecItem.tsx`)
    - Pattern: `spec.default === true`
    - Renders DEFAULT badge when spec.default is true; replaces the old Pendo-injected badge

**Requirements:**

✅ **Must Do:**
- Check git history before resolving conflicts: `git log develop -- <file>`
- Use Decision Matrix from docs/merge-process/UPSTREAM_MERGE_GUIDE.md
- Preserve ALL customizations listed above
- Verify after resolution: `./scripts/verify-paychex-customizations.sh`
- Build and test before committing
- Rebuild `@librechat/api` (`npm run build:api`) if merged files under `packages/api/src` changed
- Ask clarifying questions when uncertain

❌ **Must Not:**
- Blindly accept upstream changes
- Remove Paychex customizations
- Skip verification steps
- Commit without building and testing

**Please:**
1. Analyze the merge conflicts
2. Categorize by risk level (critical/medium/low)
3. Guide me through resolving each conflict systematically
4. Ask for confirmation before major decisions
5. Verify all customizations are preserved
6. Help create comprehensive commit message

Ready to start?
```

---

## Variables to Fill In

Before pasting, replace these placeholders:

- `[TARGET_VERSION]` - Upstream version to merge (e.g., v0.8.5)
- `[CURRENT_VERSION]` - Current Paychex version base (e.g., v0.8.4)

---

## Alternative: Invoke Merge Agent

If using GitHub Copilot Workspace with the merge agent:

```
@upstream-merge v0.8.6
```

The agent will automatically guide you through the entire process.

---

## After Merge Completes

Run these verification steps:

```bash
# Verify customizations
./scripts/verify-paychex-customizations.sh

# Build
npm run build

# Test
npm test

# Check for issues
git status
```

All checks must pass before pushing to origin.
