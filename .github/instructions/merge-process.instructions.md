```instructions
---
description: "Reference context for Paychex LibreChat upstream merge process. Use when resolving merge conflicts or verifying customizations."
applyTo: "docs/merge-process/*.md"
---

# Paychex LibreChat Merge Process Context

This file provides canonical reference data for merging upstream LibreChat releases while preserving Paychex customizations.

## Critical Paychex Customizations

These customizations MUST be preserved during upstream merges. Verify after every merge using `scripts/verify-paychex-customizations.sh`.

| Customization | File | Pattern/Method | Why Critical |
|---------------|------|----------------|--------------|
| Tool Call Filtering | `api/app/clients/BaseClient.js` | `filterCrossProviderToolCalls` | Prevents Gemini "Proto field is not repeating" errors - app crashes without this |
| Schema Sanitization | `api/server/services/start/tools.js` | `sanitizeSchemaMetadata` | Removes incompatible OpenAPI schema fields for Gemini - tool calls fail without this |
| Gemini Endpoint Detection | `api/server/services/MCP.js` | `providerLower.includes('gemini') \|\| providerLower.includes('google')` | Enables custom Gemini endpoint support - appears in 2 locations |
| MCP Server Name Normalization | `api/server/services/MCP.js`, `packages/api/src/mcp/registry/MCPServerInspector.ts` | `normalizeServerName(serverName)` in all toolKey construction | Prevents 400 validation errors for MCP server names containing spaces or special characters |
| Pendo Analytics | `client/src/routes/index.tsx` | `<PendoInitializer>` wrapping content in `AuthLayout` | Pendo "See newest features" button and all analytics disappear without this; upstream replaced with `<WithRum>` — both must coexist |
| Pendo Tracking Element | `client/src/components/Chat/Menus/Endpoints/ModelSelector.tsx` | `<span id="agentUsers" />` | Business metrics tracking (non-breaking) |
| Menu Descriptions | `packages/client/src/components/DropdownPopup.tsx` | `item.description`, `items-start`, CSS transitions | UX enhancement (non-breaking) |
| Declarative Tools UI | `client/src/components/Chat/Input/ToolsDropdown.tsx` | `label:`, `description:`, `icon:` properties | Code organization (non-breaking) |
| Dockerfile Error Handling | `Dockerfile` | `&&` operators (not `;`) | Prevents masked build failures - critical for CI/CD |
| xlsx Package | `api/package.json`, `packages/api/package.json` | `"xlsx": "^0.18.5"` (npm registry, not CDN) | CDN returns 403 errors - builds fail without this |
| Anthropic Image Encoding | `api/server/services/Files/images/encode.js` | `includes('claude') \|\| includes('anthropic')` (before `VisionModes.agents` block) | Custom Claude/Anthropic endpoints get 400 errors on image uploads without this; block order matters |
| Prompt Catalog Insert Integration | `api/server/routes/prompthub.js`, `packages/api/src/promptCatalog/handlers.ts`, `client/src/hooks/Input/useQueryParams.ts`, `client/src/routes/ChatRoute.tsx` | `/api/prompthub/resolve-insert`, `promptCatalogId`, `PROMPT_CATALOG_API_URL`, `com_ui_prompt_catalog_insert_error` | Preserves AI Hub Prompt Catalog → LibreChat deep links with server-side resolution, query-param exclusion, visible failures, and no infinite polling |
| SSO Rate Limit Fix | `api/server/middleware/limiters/loginLimiter.js` | `skipSuccessfulRequests: true` | Multi-tab SSO users get rate-limited when all tabs simultaneously re-authenticate after JWT expiry |
| OpenID Token Refresh Middleware | `api/server/middleware/refreshOpenIDToken.js`, `api/server/routes/agents/index.js` | `isAccessTokenExpiredOrExpiringSoon`, `_inflight`, `refreshOpenIDToken` in agents router | Paxton agent calls fail with 401 after ~15 min without proactive refresh; `_inflight` prevents Azure AD `invalid_grant` race |
| Claude SSE Parsing Fix (Kong) | `packages/api/src/utils/generators.ts` | `data.choices = []` | Kong omits `choices` array from some Claude SSE chunks; LangChain parser throws without normalization |

## Merge Conflict Decision Matrix

Apply this matrix when resolving each conflict:

```
┌─────────────────────────────────────────────────────────────────┐
        │ Is this file in the Critical Customizations table above?        │
└─────────────────────────────────────────────────────────────────┘
                     ↓ YES                    ↓ NO
        ┌────────────────────────┐    ┌──────────────────┐
        │ Run: git log           │    │ Check git history│
        │  upstream/v<VER>-      │    │ for Paychex mods │
        │  integration -- <file> │    └──────────────────┘
        └────────────────────────┘
                     ↓                          ↓
        ┌────────────────────────┐    ┌──────────────────┐
        │ Merge MANUALLY         │    │ Paychex changes? │
        │ Preserve Paychex logic │    └──────────────────┘
        │ with upstream updates  │         ↓ YES    ↓ NO
        └────────────────────────┘         │        │
                     ↓                     │        │
        ┌────────────────────────┐    ┌───▼────┐ ┌─▼────────┐
        │ VERIFY after resolution│    │Manual  │ │Accept    │
        │ Pattern still present  │    │merge   │ │upstream  │
        └────────────────────────┘    └────────┘ └──────────┘
```

## File Risk Categories

### 🔴 Critical Priority (Never auto-accept upstream)
- `api/app/clients/BaseClient.js`
- `api/server/services/start/tools.js`
- `api/server/services/MCP.js`
- `packages/api/src/mcp/registry/MCPServerInspector.ts`
- `api/server/services/Files/images/encode.js`
- `api/server/routes/prompthub.js`
- `api/server/middleware/limiters/loginLimiter.js`
- `api/server/middleware/refreshOpenIDToken.js`
- `api/server/routes/agents/index.js`
- `packages/api/src/promptCatalog/**/*.ts`
- `packages/api/src/utils/generators.ts`
- `client/src/hooks/Input/useQueryParams.ts`
- `client/src/routes/ChatRoute.tsx`
- `client/src/routes/index.tsx`
- `Dockerfile`
- `api/package.json`
- `packages/api/package.json`

**Action:** Always check git history, manually merge, verify pattern preserved

### 🟡 Medium Priority (Review before accepting)
- `client/src/components/**/*.tsx` — check for Changelog link, DEFAULT badge, Pendo element
- `client/src/components/Chat/Input/Files/AttachFileMenu.tsx` — verify `description:` properties on all menu items (frequently refactored upstream)
- `packages/client/src/components/*.tsx`
- `api/server/middleware/*.js` — check for refreshOpenIDToken, loginLimiter skipSuccessfulRequests
- `client/src/hooks/**/*.ts` — check for GPTIconDark, MCP startup auto-select
- `client/src/hooks/Pendo/**` — PendoInitializer and usePendo hook (must not be deleted)
- `client/src/locales/en/translation.json` — Paychex-specific keys interleaved alphabetically; accepting large upstream hunks can drop them
- `packages/api/src/mcp/connection.ts` — check for shouldStopReconnecting flag and transient error log levels
- `librechat.*.yml`
- `LibreChatInfra/terraform/environments/*.tfvars` (separate repo; not part of this merge)

**Action:** Check for Paychex customizations, manual merge if found

### 🟢 Low Priority (Usually safe to accept upstream)
- `*.md` (documentation)
- `**/*.test.js`, `**/*.test.ts`
- `.github/workflows/*.yml` (unless Paychex-specific)
- `package-lock.json`, `npm-shrinkwrap.json`
- Build configs (except Dockerfile)

**Action:** Accept upstream unless user has specific reason

### ⚫ Intentionally Removed Upstream Workflows (never resurrect)

The following upstream-only workflow files were deliberately deleted (`chore(ci): remove unused upstream-only workflows`) because they serve no purpose in the Paychex fork — NPM publishing to the LibreChat org, upstream GHCR image builds, Locize translation sync, Supabase docs embeddings, upstream-only infra/demo, and Helm chart publishing (Paychex deploys to Azure Container Apps instead):

- `build.yml`, `client.yml`, `data-provider.yml`, `data-schemas.yml`
- `deploy.yml`, `deploy-dev.yml`
- `dev-images.yml`, `dev-branch-images.yml`, `dev-staging-images.yml`, `main-image-workflow.yml`, `tag-images.yml`, `retry-docker-builds.yml`
- `helmcharts.yml`, `sync-helm-chart-tags.yml` (also removed the now-orphaned `.github/scripts/sync-helm-chart-tags.sh`)
- `generate_embeddings.yml`, `locize-i18n-sync.yml`
- `gitnexus-index.yml`, `gitnexus-deploy.yml`, `gitnexus-pr-command.yml`, `gitnexus-cleanup-pr.yml` (also removed the supporting `.do/gitnexus/` directory)
- `a11y.yml`

**Action:** If a future upstream merge reintroduces any of these files (as an add or a modify), do **not** accept them — delete them again. Do not run or wire up their supporting scripts either. Run `scripts/check-forbidden-upstream-workflows.sh` to catch them automatically.

**GitNexus rationale:** Introduced upstream in `01a1bc168` (2026-04-08) as an experiment. It builds a code-search index and deploys it to a DigitalOcean droplet via SSH + rsync, using `GITNEXUS_DO_HOST` / `GITNEXUS_DO_SSH_KEY` secrets that point at infrastructure Paychex does not own. Never ran a single time in this fork.

**`a11y.yml` rationale:** Its job gates on `github.event.pull_request.head.repo.full_name == 'danny-avila/LibreChat'`, so it is structurally incapable of running in a fork — it was skipped on 87 consecutive PRs while appearing to be an active check. It also depends on `AXE_LINTER_API_KEY`, a Deque licence held by upstream. The Playwright accessibility suite (`npm run e2e:a11y`, `e2e/playwright.config.a11y.ts`) is unrelated and was kept.

### ⚫ Upstream Branch Filters Must Be Rewritten

Upstream workflows trigger on `main`, `dev`, and `dev-staging`. Paychex uses `develop` and `release/*`. A workflow that keeps the upstream branch list still registers in the Actions tab and never reports a failure — it simply never runs. `eslint-ci.yml` and `cache-integration-tests.yml` were both silently inert for months this way.

**Action:** After every merge, review each `pull_request:` → `branches:` list and rewrite upstream branch names to `develop` / `release/*`. Then confirm the workflow actually fires on the next PR rather than trusting a green checkmark.

## Common Merge Scenarios

### Scenario 1: File Deleted by Upstream, Modified by Paychex

**Symptoms:**
```bash
git status shows: DU <file>  # Deleted by upstream, modified by us
```

**Resolution:**
1. Check if file was moved/refactored: `git log upstream/main -- <file>`
2. If moved: Find new location, preserve Paychex customizations there
3. If deleted: Verify functionality exists elsewhere or restore if critical
4. Update all import statements

**Common example (v0.8.4 merge):**
- `api/app/clients/OpenAIClient.js` → moved to `@librechat/agents` package
- `api/server/services/Endpoints/custom/initialize.js` → moved to `packages/api/src/endpoints/custom/initialize.ts`
- **Action:** Update `api/server/services/Endpoints/index.js` to import from `@librechat/api`

### Scenario 2: Paychex Modified, Upstream Refactored

**Symptoms:**
```bash
git status shows: UU <file>  # Modified by both
Large structural changes in upstream version
```

**Resolution:**
1. Identify Paychex customization purpose: `git log -p upstream/v<TARGET>-integration -- <file>`
2. Read upstream changes: `git show upstream/main:<file>`
3. Apply Paychex logic to upstream's new structure
4. Test thoroughly - refactors often break assumptions

### Scenario 3: Broken Import Paths

**Symptoms:**
```
Build fails with: Cannot find module '../custom/initialize'
```

**Resolution:**
1. Find new location: `git log --all --oneline -- '**/initialize.*'`
2. Update imports to use package exports: `require('@librechat/api')`
3. Check `packages/api/src/index.ts` for available exports
4. Rebuild and verify

### Scenario 4: Duplicate Definitions

**Symptoms:**
```
TypeScript error: Duplicate identifier 'FunctionName'
Merge conflict in type definitions
```

**Resolution:**
1. Check `packages/data-provider/src/types/` for existing types
2. Use existing type, extend if needed
3. Remove duplicate definition
4. Import from canonical location

## Git Archaeology Commands

Use these to understand conflict origins. Replace `upstream/v<TARGET>-integration` with the current integration branch name (e.g. `upstream/v0.8.6-integration`):

```bash
# See all Paychex changes to a file
git log upstream/v<TARGET>-integration --oneline -- <file>

# See detailed Paychex changes (excluding what upstream already has)
git log -p upstream/v<TARGET>-integration --not upstream/main -- <file>

# Compare three-way
git diff $(git merge-base upstream/v<TARGET>-integration upstream/main)..upstream/v<TARGET>-integration -- <file>    # What Paychex added
git diff $(git merge-base upstream/v<TARGET>-integration upstream/main)..upstream/main -- <file>                    # What upstream added

# Find when something was added
git log -S 'searchTerm' --all -- <file>

# See if code exists in upstream
git log upstream/main -- <file>   # If empty, it's Paychex-only

# Compare with last merge base
MERGE_BASE=$(git merge-base upstream/v<TARGET>-integration upstream/main)
git diff $MERGE_BASE..upstream/v<TARGET>-integration -- <file>
```

## Verification Commands

Run after each major resolution step:

```bash
# Verify all critical customizations
./scripts/verify-paychex-customizations.sh

# Check specific pattern
grep -n "filterCrossProviderToolCalls" api/app/clients/BaseClient.js
grep -n "sanitizeSchemaMetadata" api/server/services/start/tools.js
grep -n "providerLower.includes('gemini')" api/server/services/MCP.js

# Check for broken imports
grep -r "require('.*OpenAIClient')" api/ | grep -v node_modules
grep -r "require('.*custom/initialize')" api/server/services/Endpoints/

# Verify xlsx package
grep '"xlsx"' api/package.json packages/api/package.json
# Should NOT contain: cdn.sheetjs.com
# Should contain: "^0.18.5"

# Check Dockerfile error handling
grep -A1 "npm run frontend" Dockerfile | grep "&&"
# Should use && (not ;)

# Check Prompt Catalog deep-link integration
grep -n "/api/prompthub" api/server/index.js api/server/experimental.js api/server/routes/index.js
grep -n "createPromptHubResolveInsertHandler" api/server/routes/prompthub.js packages/api/src/index.ts packages/api/src/promptCatalog/handlers.ts
grep -n "PROMPT_CATALOG_API_URL" .env.example api/server/routes/prompthub.js packages/api/src/promptCatalog/handlers.ts
grep -n "promptCatalogId\|prompt_catalog_id" client/src/hooks/Input/useQueryParams.ts client/src/routes/ChatRoute.tsx
grep -n "com_ui_prompt_catalog_insert_error" client/src/hooks/Input/useQueryParams.ts client/src/locales/en/translation.json

# Post-v0.8.4 customizations (SSO, OpenID refresh, RAG, MCP, SSE, icons, changelog, badge)
grep -n "skipSuccessfulRequests" api/server/middleware/limiters/loginLimiter.js
grep -n "isAccessTokenExpiredOrExpiringSoon\|_inflight" api/server/middleware/refreshOpenIDToken.js
grep -n "refreshOpenIDToken" api/server/routes/agents/index.js
grep -n "Promise.allSettled" api/app/clients/prompts/createContextHandlers.js
grep -n "shouldStopReconnecting" packages/api/src/mcp/connection.ts
grep -n "stopReconnecting" packages/api/src/mcp/registry/MCPServerInspector.ts
grep -n "data.choices = \[\]" packages/api/src/utils/generators.ts
grep -n "GPTIconDark" client/src/hooks/Endpoint/Icons.tsx
grep -n "changelogURL" client/src/components/Chat/Footer.tsx
grep -n "spec.default === true" client/src/components/Chat/Menus/Endpoints/components/ModelSpecItem.tsx
```

## Post-Merge Validation

Before considering merge complete:

1. ✅ **Verification script:** `./scripts/verify-paychex-customizations.sh` → 100% critical passing
2. ✅ **Build:** `npm run build` → No errors
3. ✅ **Tests:** `npm test` → 93%+ passing
4. ✅ **No TypeScript errors:** `cd packages/api && npx tsc --noEmit` AND `cd client && npx tsc --noEmit`
5. ✅ **No ESLint errors:** `npm run lint`
6. ✅ **Git status clean:** All conflicts resolved, no untracked critical files

## Known Upstream Refactoring Patterns (v0.8.1 → v0.8.4)

| Upstream Pattern | Impact | Resolution |
|------------------|--------|------------|
| Moving endpoint initializers to `packages/api/` | Import paths break | Update to `require('@librechat/api')` |
| Refactoring OpenAIClient to `@librechat/agents` | References break | Use new package exports |
| Consolidating tool definitions | Paychex sanitization may be lost | Manually re-apply in new location |
| TypeScript migration | Type conflicts | Use types from `packages/data-provider` |
| Component prop changes | Paychex custom props may break | Adapt to new prop structure |
| Query-param handling refactors in `ChatRoute` / `useQueryParams` | Prompt Catalog deep links regress | Preserve `promptCatalogId` exclusion, same-origin `/api/prompthub/resolve-insert` flow, and timeout/toast failure handling |

## Known Upstream Refactoring Patterns (v0.8.7)

| Upstream Pattern | Impact | Resolution |
|------------------|--------|------------|
| Prompts component restructure into subdirectories (`dialogs/`, `display/`, `editor/`, `fields/`, `lists/`, `sidebar/`, `utils/`, `buttons/`) | Paychex-only files in `Groups/` and root `Prompts/` have stale relative imports — **no merge conflicts produced** | Update all import paths; run `cd client && npx tsc --noEmit` to find them |
| New i18n keys added by upstream | Missing localization keys cause runtime errors in Paychex files that import upstream components | Compare key counts: `grep -c '"com_' translation.json` should be ≥ upstream’s count |
| `TStartupConfig` / `TPromptGroup` type additions | Type access fails in Paychex code | Add new fields to `packages/data-provider/src/config.ts` and `types.ts` |
| Component API changes (MemoNewChat props removed, FooterStartupConfig extended) | Paychex call sites pass old props | Update to new component signatures |
| New React context providers (e.g., `useDashboardContext`) | Paychex-modified components fail with missing context | Create provider file and wire in barrel export |
| Function signature changes (new params, removed fields, different return types) | Paychex hooks/routes reference old APIs | Update type access and add assertions where needed |

## Known Paychex Customization Patterns to Preserve (v0.8.4 → v0.8.6)

| Paychex Pattern | Risk if Upstream Refactors Area | Files at Risk |
|-----------------|--------------------------------|---------------|
| `skipSuccessfulRequests: true` in loginLimiter | Rate limiter refactor could remove this option | `api/server/middleware/limiters/loginLimiter.js` |
| `refreshOpenIDToken` middleware wired after `requireJwtAuth` in agents router | Auth middleware refactor could reorder or drop it | `api/server/routes/agents/index.js` |
| `isAccessTokenExpiredOrExpiringSoon` + `_inflight` logic | Any OpenID middleware rewrite | `api/server/middleware/refreshOpenIDToken.js` |
| `Promise.allSettled` for RAG context queries | Upstream simplification of context handler | `api/app/clients/prompts/createContextHandlers.js` |
| `shouldStopReconnecting` + transient error log levels | MCP connection management rewrite | `packages/api/src/mcp/connection.ts` |
| `stopReconnecting()` before `disconnect()` in inspector | MCPServerInspector refactor | `packages/api/src/mcp/registry/MCPServerInspector.ts` |
| `normalizeServerName(serverName)` in ALL toolKey construction | MCP server or tool registration changes | `api/server/services/MCP.js`, `packages/api/src/mcp/registry/MCPServerInspector.ts` |
| `data.choices = []` normalization in SSE generator | LangChain SSE parser updates | `packages/api/src/utils/generators.ts` |
| `GPTIconDark` component for Azure OpenAI endpoint | Icon system refactor | `client/src/hooks/Endpoint/Icons.tsx` |
| `changelogURL` rendering in Footer and AccountSettings | UI component refactors | `client/src/components/Chat/Footer.tsx`, `client/src/components/Nav/AccountSettings.tsx` |
| `spec.default === true` DEFAULT badge | ModelSpecItem upstream changes | `client/src/components/Chat/Menus/Endpoints/components/ModelSpecItem.tsx` |

## Troubleshooting Quick Reference

| Problem | Quick Fix |
|---------|-----------|
| Verification fails on critical check | `git log upstream/v<TARGET>-integration -- <file>` → identify what was lost → restore |
| Build fails on import | Search for new location: `find . -name "*ModuleName*" -not -path "*/node_modules/*"` |
| Test failure (MongoDB) | Acceptable if RHEL 9.0 memory server download issue (not merge-related) |
| xlsx 403 error | Change to `"xlsx": "^0.18.5"` in package.json files |
| Dockerfile build masks errors | Change `;` to `&&` in command chains |
| TypeScript duplicate identifier | Check `packages/data-provider/src/types/` for existing definition |
| `createPromptHubResolveInsertHandler is not a function` at startup | Rebuild `@librechat/api` with `npm run build:api`; JS routes load the compiled package from `packages/api/dist` |
| AI Hub deep link opens blank LibreChat chat | Verify `/api/prompthub` mounts, `PROMPT_CATALOG_API_URL`, `promptCatalogId` handling, and the Prompt Catalog error toast key |
| Users rate-limited during SSO re-auth | Verify `skipSuccessfulRequests: true` in `loginLimiter.js` |
| Paxton 401 after ~15 minutes | Verify `refreshOpenIDToken` middleware is wired in `agents/index.js` and `isAccessTokenExpiredOrExpiringSoon` logic is intact |
| Conversation fails when a file has empty embeddings | Verify `Promise.allSettled` in `createContextHandlers.js` (not `Promise.all`) |
| Claude streaming broken on custom endpoint | Verify `data.choices = []` normalization in `packages/api/src/utils/generators.ts` and rebuild `packages/api` |
| MCP reconnection storm after server inspection | Verify `stopReconnecting()` called in `MCPServerInspector.ts` before `disconnect()` |
| MCP tool calls return 400 validation errors | Verify `normalizeServerName(serverName)` used (not raw `serverName`) in all toolKey construction in `MCP.js` and `MCPServerInspector.ts` |

## Reference Documentation Paths

- Complete guide: `docs/merge-process/UPSTREAM_MERGE_GUIDE.md`
- Checklist: `docs/merge-process/MERGE_CHECKLIST.md`
- AI prompts: `docs/merge-process/AI_MERGE_PROMPT.md`
- Quick reference: `docs/merge-process/QUICK_UPDATE_PROMPT.md`
- Verification update: `docs/merge-process/UPDATE_VERIFICATION_PROMPT.md`

```
