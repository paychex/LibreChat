# Paychex LibreChat — {Environment Name} Capabilities

> **Last updated:** {YYYY-MM-DD}
> **Environment URL:** https://{domain}

---

## Available Models

Populate from `modelSpecs.list[]` in `librechat.{env}.yml`. One row per model.
Streaming: derive from endpoint config — `disableStreaming: true` or `dropParams: [stream]` → No; `streamRate` present → Yes; Azure OpenAI default → Yes.

| Model | Provider | Description | Streaming | Notes |
|-------|----------|-------------|-----------|-------|
| {label} | {provider} | {description} | Yes / No | {any notes} |

---

## Feature Configuration

### Core Features

Populate from upstream defaults and environment config. See `capability-doc-context.instructions.md` for the full list of default-enabled upstream features and the config key → status mapping.

| Feature | Status | Notes |
|---------|--------|-------|
| {feature name} | Enabled / Disabled | {notes} |

### AI Agents

Populate based on `interface.agents` toggle and `modelSpecs.addedEndpoints`.

| Feature | Status | Notes |
|---------|--------|-------|
| {feature name} | Enabled / Disabled | {notes} |

### Tools & Integrations

Populate from `mcpServers` in `librechat.{env}.yml` and RAG API container presence in the container app definition.

| Tool | Status | Notes |
|------|--------|-------|
| {tool name} | Enabled / Disabled | {notes} |

---

## Authentication

Populate from `az_container_app_definitions/{env}_container_app_definition.yml`. Describe only the login experience visible to end users — do **not** include client IDs, tenant IDs, issuer URLs, scopes, or any internal configuration.

- **Login method:** {e.g., Single Sign-On via your Paychex corporate account}
- **Email/password login:** {Enabled / Disabled}
- **Self-registration:** {Enabled / Disabled}

---

## Paychex-Specific Additions

Populate from the `A` (net-new) and `M` (meaningfully modified) entries in `git diff --name-status upstream/main..HEAD`.
See `capability-doc-context.instructions.md` for the canonical classification of each file.

| Feature | Description |
|---------|-------------|
| {feature name} | {description} |

---

## Known Limitations

Include one row for each: streaming-disabled model, disabled interface toggle, deleted upstream feature (`D` in diff), and admin-only feature (People Picker, Agent Builder).

| Limitation | Detail |
|------------|--------|
| {limitation} | {detail} |
