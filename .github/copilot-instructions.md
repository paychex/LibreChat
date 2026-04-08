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
- `PAYCHEX_README.md` — Paychex-specific documentation and workflow guide

## Branching

- `develop` — Default development branch; auto-deploys to N2A on push
- `release/*` — Release branches; deploys to N1 on push
- `feature/*`, `bugfix/*`, `hotfix/*`, `upstream/*` — Short-lived branches

## Capability Documentation Tasks

When generating or updating capability documentation (`docs/capabilities-*.md`):

1. Follow the instructions in `.github/agents/capability-doc.agent.md`
2. Use `docs/capabilities-template.md` as the output schema
3. Reference `.github/instructions/capability-doc-context.instructions.md` for Paychex customization mappings
4. Document end-user capabilities only — omit container specs, env vars, and pipeline details

## Paychex-Specific Customizations

- **People Picker (Entra ID)**: `api/server/middleware/checkPeoplePickerAccess.js` — upstream middleware modified to support Entra ID Graph API
- **Pendo Analytics**: `client/src/hooks/Pendo/` — net-new addition; not in upstream
- **Agent & Prompt Role Migrations**: `config/migrate-agent-permissions.js`, `config/migrate-prompt-permissions.js` — Paychex-customized role definitions
- **Auth**: Azure Entra ID OpenID Connect (environment-specific client IDs)
- **CI/CD**: Azure Container Apps via GitHub Actions
