```instructions
# Paychex LibreChat — Copilot Workspace Instructions

This is a Paychex fork of the open-source LibreChat project.

**Upstream repository:** https://github.com/danny-avila/LibreChat

## Environments

| Short Name | Domain | Config File | Infra Definition |
|------------|--------|-------------|--------------------------|
| n1 | play.ain1.paychex.com | `librechat.n1.yml` | `LibreChatInfra/terraform/environments/n1.tfvars` |
| n2a | play.ain2a.paychex.com | `librechat.n2a.yml` | `LibreChatInfra/terraform/environments/n2a.tfvars` |
| prod | play.ai.paychex.com | `librechat.prod.yml` | `LibreChatInfra/terraform/environments/prod.tfvars` |

## Repository Layout

- `librechat.{env}.yml` — Per-environment LibreChat configuration (models, MCP servers, interface toggles, endpoints)
- Container app infrastructure (domain, auth, secrets, scaling) is defined in the `LibreChatInfra` Terraform repo — see `terraform/environments/{env}.tfvars` and `terraform/main.tf`. This LibreChat repo no longer contains Azure Container App definitions.
- `.github/workflows/` — GitHub Actions CI/CD pipelines per environment
- `api/server/middleware/` — Paychex-specific server middleware
- `client/src/hooks/` — Paychex-specific React hooks (Pendo analytics, RBAC)
- `docs/merge-process/` — Upstream merge process documentation and workflows
- `scripts/` — Automation scripts for verification and scanning
- `PAYCHEX_README.md` — Paychex-specific documentation and workflow guide

## Branching

- `develop` — Default development branch; auto-deploys to N2A on push
- `release/*` — Release branches; deploys to N1 on push
- `feature/*`, `bugfix/*`, `hotfix/*`, `upstream/*` — Short-lived branches

## Critical Paychex Customizations

When working with code, always preserve these critical Paychex customizations:

### 1. Tool Call Filtering (api/app/clients/BaseClient.js)
- **Method:** `filterCrossProviderToolCalls`
- **Purpose:** Prevents "Proto field is not repeating" errors when using tools with Gemini custom endpoints
- **Critical:** YES - Application crashes without this

### 2. Schema Sanitization (api/server/services/start/tools.js)
- **Method:** `sanitizeSchemaMetadata`
- **Purpose:** Removes incompatible OpenAPI schema fields before sending to Gemini
- **Critical:** YES - Tool calls fail with Gemini without this

### 3. Gemini Custom Endpoint Detection (api/server/services/MCP.js)
- **Pattern:** `providerLower.includes('gemini') || providerLower.includes('google')`
- **Purpose:** Detects custom Gemini endpoints and formats tool responses correctly
- **Critical:** YES - Custom Gemini endpoints don't work without this (2 locations)

### 4. Pendo Analytics (client/src/routes/index.tsx)
- **Component:** `<PendoInitializer>` wrapping content in `AuthLayout`
- **Import:** `import { PendoInitializer } from '~/hooks/Pendo';`
- **Purpose:** Initializes Pendo SDK for the authenticated session — required for "See newest features" button and all analytics
- **Critical:** YES - Pendo Resource Center and all tracking disappear without this
- **Context:** Upstream v0.8.7 replaced this with `<WithRum>`. Both must coexist: `PendoInitializer` wraps `WithRum`.

### 4b. Pendo Tracking Element (client/src/components/Chat/Menus/Endpoints/ModelSelector.tsx)
- **Element:** `<span id="agentUsers" />`
- **Purpose:** Business metrics tracking for AI agent usage
- **Critical:** NO - Analytics only, app functions without it

### 5. Menu Descriptions (packages/client/src/components/DropdownPopup.tsx)
- **Features:** `item.description` rendering, `items-start` alignment, CSS transitions
- **Purpose:** Enhanced UX for dropdown menus with descriptions
- **Critical:** NO - UX enhancement, app functions without it

### 5b. File Attach Menu Descriptions (client/src/components/Chat/Input/Files/AttachFileMenu.tsx)
- **Pattern:** `description: localize('com_ui_upload_*_description')` on each `items.push({...})` call
- **Purpose:** Each upload option shows a brief helper description (e.g. "Add an image for analysis.")
- **Critical:** NO - UX enhancement, but frequently lost during upstream merges because this component is heavily refactored
- **Context:** Relies on locale keys in `translation.json` (`com_ui_upload_image_input_description`, `com_ui_upload_ocr_text_description`, `com_ui_upload_provider_description`, `com_ui_upload_file_search_description`, `com_ui_upload_code_environment_description`)

### 6. ToolsDropdown Declarative Structure (client/src/components/Chat/Input/ToolsDropdown.tsx)
- **Pattern:** Declarative `label`, `description`, `icon` properties
- **Purpose:** Cleaner separation of data and presentation
- **Critical:** NO - Code organization, app functions without it

### 7. Dockerfile Error Handling (Dockerfile)
- **Pattern:** `&&` operators instead of `;` for chained commands
- **Purpose:** Build stops on first error instead of masking failures
- **Critical:** YES - Prevents broken builds from being deployed

### 8. Anthropic Image Encoding for Custom Endpoints (api/server/services/Files/images/encode.js)
- **Pattern:** `effectiveEndpoint.toLowerCase().includes('claude') || effectiveEndpoint.toLowerCase().includes('anthropic')`
- **Purpose:** Converts image parts to Anthropic-native format (`type: 'image'`, `source: { base64 }`) for both the native `anthropic` endpoint and custom endpoints whose name contains "claude" or "anthropic". The conversion block is placed **before** the `VisionModes.agents` early-return so agent-path uploads are also converted correctly.
- **Critical:** YES - Image uploads to any Claude/Anthropic endpoint throw a 400 error without this

### 9. Prompt Catalog Insert Deep Link Integration
- **Files:** `api/server/routes/prompthub.js`, `packages/api/src/promptCatalog/handlers.ts`, `packages/api/src/index.ts`, `client/src/hooks/Input/useQueryParams.ts`, `client/src/routes/ChatRoute.tsx`
- **Patterns:** `POST /api/prompthub/resolve-insert`, `promptCatalogId`, `PROMPT_CATALOG_API_URL`, `com_ui_prompt_catalog_insert_error`
- **Purpose:** Lets AI Hub open LibreChat with only a Prompt Catalog ID. LibreChat must resolve the stored prompt server-side, forward authenticated user identity headers to Prompt Catalog, exclude insert params from preset merging, and show a user-visible toast if resolution fails or times out.
- **Critical:** NO - App functions without it, but AI Hub Prompt Catalog deep links silently break or hang without it

## Upstream Merge Process

When merging upstream LibreChat releases:

1. **Follow the documented process:** See `docs/merge-process/UPSTREAM_MERGE_GUIDE.md` or use `@upstream-merge` agent
2. **Quick reference prompts:** See `.github/prompts/merge-upstream.md` for copy-paste templates
3. **Verify customizations:** Run `scripts/verify-paychex-customizations.sh` before and after merge
4. **Preserve Paychex logic:** Never accept upstream changes that would remove critical customizations
5. **Use the decision matrix:** See `docs/merge-process/UPSTREAM_MERGE_GUIDE.md` for conflict resolution rules
6. **Context files:** Reference `.github/instructions/merge-process.instructions.md` for detailed patterns

### Critical Files That Often Have Conflicts

- `api/app/clients/BaseClient.js` — Contains `filterCrossProviderToolCalls`
- `api/server/services/start/tools.js` — Contains `sanitizeSchemaMetadata`
- `api/server/services/MCP.js` — Custom Gemini endpoint detection
- `api/server/services/Files/images/encode.js` — Anthropic image encoding; block order relative to `VisionModes.agents` is critical
- `api/server/routes/prompthub.js` — Prompt Catalog resolve-insert route wiring
- `packages/api/src/promptCatalog/handlers.ts` and `packages/api/src/index.ts` — Prompt Catalog resolver export loaded by `@librechat/api`
- `client/src/hooks/Input/useQueryParams.ts` — `promptCatalogId` resolution, timeout, and toast behavior
- `client/src/routes/ChatRoute.tsx` — Excludes Prompt Catalog query params from preset merging
- `client/src/routes/index.tsx` — `PendoInitializer` wrapping `AuthLayout` content (upstream replaced with `WithRum`; both must coexist)
- `Dockerfile` — Build error handling
- `package.json` files — Dependency versions (use npm registry for xlsx, not CDN)

## Authentication

- **Method:** Azure Entra ID OpenID Connect
- **User-facing:** Single Sign-On via Paychex corporate account
- **Environment-specific:** Each environment has its own client ID and configuration

## Development Commands

| Command | Purpose |
|---------|---------|
| `npm run smart-reinstall` | Install deps (if lockfile changed) + build via Turborepo |
| `npm run backend` | Start the backend server |
| `npm run backend:dev` | Start backend with file watching (development) |
| `npm run build:api` | Rebuild compiled `@librechat/api` after changes in `packages/api/src` |
| `npm run frontend:dev` | Start frontend dev server with HMR (port 3090) |
| `npm run build` | Build all compiled code via Turborepo |
| `scripts/verify-paychex-customizations.sh` | Verify all Paychex customizations are present |
| `scripts/scan-paychex-customizations.sh [days]` | Scan for new customizations |

## Code Style Guidelines

- **All new backend code must be TypeScript** in `/packages/api`
- **Never use `any`** - Explicit types for all parameters, return values, variables
- **Limit `unknown`** - Avoid `Record<string, unknown>` assertions
- **Don't duplicate types** - Reuse existing types from `packages/data-provider`
- **Early returns** - Flat code, minimal nesting
- **Functional first** - Pure functions, immutable data
- **Minimize looping** - Consolidate operations into single passes

## Testing

- **Framework:** Jest
- **Run from workspace:** `cd api && npx jest <pattern>` or `cd packages/api && npx jest <pattern>`
- **Philosophy:** Real logic over mocks, use spies, real MongoDB via `mongodb-memory-server`
- **Expected pass rate:** 93%+ (some MongoDB memory server download issues on RHEL 9.0 are acceptable)

```
