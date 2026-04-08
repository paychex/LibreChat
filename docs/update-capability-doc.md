---
name: "Update Capability Documentation"
about: "Trigger Copilot to generate or update a capability doc for a specific environment."
labels: ["documentation", "copilot"]
---

## Task

Generate or update the capability documentation for the **{ENV}** environment.

## Instructions for Copilot

Follow these steps exactly:

1. **Read** `.github/agents/capability-doc.agent.md` for the full generation instructions and step-by-step workflow.

2. **Read** `.github/instructions/capability-doc-context.instructions.md` for the canonical list of Paychex-specific customizations and the config key → user-facing feature mapping table.

3. **Read** `docs/capabilities-template.md` for the required output document structure.

4. **Run** the upstream diff to identify Paychex-changed files:
   ```bash
   git remote add upstream https://github.com/danny-avila/LibreChat.git 2>/dev/null || true
   git rev-parse --verify upstream/main 2>/dev/null || git fetch upstream main --depth=1
   git diff --name-status upstream/main..HEAD
   ```
   Classify by prefix: `A` = net-new Paychex addition, `M` = modified upstream file, `D` = deleted upstream feature (add to Known Limitations).

5. **Read** `librechat.{ENV}.yml` — extract all models, MCP servers, interface toggles, and endpoint streaming configuration.

6. **Read** `az_container_app_definitions/{ENV}_container_app_definition.yml` — extract domain URL, auth config, and RAG API container presence.

7. **Check** for Paychex-specific code changes using the `--name-status` diff output. Only treat a file as a Paychex addition if it has prefix `A` (net-new) or `M` (meaningfully modified):
   - `client/src/hooks/Pendo/` — confirmed net-new (`A`); **omit from the doc** — do not mention analytics additions
   - `api/server/middleware/checkPeoplePickerAccess.js` — modified (`M`); **admin-only feature** — list in Known Limitations as not accessible to general users; do not include in Paychex-Specific Additions
   - `config/migrate-agent-permissions.js` — modified (`M`); do **not** mention specific role names or permission details; only note the general user impact if any
   - Do **not** list `requireLdapAuth.js` or `client/src/hooks/Roles/` — both are unmodified upstream files
   - Check for **deleted** (`D`) upstream feature directories (e.g., `SidePanel/MCPBuilder/`) and add each to Known Limitations
   - **Agent Builder** (`interface.agents: true`) is an **admin-only feature** — list in Known Limitations; do not list as a general user capability

8. **Generate** `docs/capabilities-{ENV}.md` following the template exactly. Set `Last updated:` to today's date.

## Environment

**Target environment:** `{ENV}`

Valid values: `n1`, `n2a`, `prod`

## Output

Create or update: `docs/capabilities-{ENV}.md`
