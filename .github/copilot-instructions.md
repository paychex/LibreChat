```instructions
# Paychex LibreChat — Copilot Workspace Instructions

This is a Paychex fork of the open-source LibreChat project.

**Upstream repository:** https://github.com/danny-avila/LibreChat

## Environments

| Short Name | Domain | Config File | Container App Definition |
|------------|--------|-------------|--------------------------|
| n1 | play.ain1.paychex.com | `librechat.n1.yml` | `az_container_app_definitions/n1_container_app_definition.yml` |
| n2a | play.ain2a.paychex.com | `librechat.n2a.yml` | `az_container_app_definitions/n2a_container_app_definition.yml` |
| prod | play.ai.paychex.com | `librechat.prod.yml` | `az_container_app_definitions/prod_container_app_definition.yml` |

## Repository Layout

- `librechat.{env}.yml` — Per-environment LibreChat configuration (models, MCP servers, interface toggles, endpoints)
- `az_container_app_definitions/{env}_container_app_definition.yml` — Azure Container App definitions (domain, auth, secrets)
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

### 4. Pendo Analytics (client/src/components/Chat/Menus/Endpoints/ModelSelector.tsx)
- **Element:** `<span id="agentUsers" />`
- **Purpose:** Business metrics tracking for AI agent usage
- **Critical:** NO - Analytics only, app functions without it

### 5. Menu Descriptions (packages/client/src/components/DropdownPopup.tsx)
- **Features:** `item.description` rendering, `items-start` alignment, CSS transitions
- **Purpose:** Enhanced UX for dropdown menus with descriptions
- **Critical:** NO - UX enhancement, app functions without it

### 6. ToolsDropdown Declarative Structure (client/src/components/Chat/Input/ToolsDropdown.tsx)
- **Pattern:** Declarative `label`, `description`, `icon` properties
- **Purpose:** Cleaner separation of data and presentation
- **Critical:** NO - Code organization, app functions without it

### 7. Dockerfile Error Handling (Dockerfile)
- **Pattern:** `&&` operators instead of `;` for chained commands
- **Purpose:** Build stops on first error instead of masking failures
- **Critical:** YES - Prevents broken builds from being deployed

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
