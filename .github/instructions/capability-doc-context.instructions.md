---
description: "Context for Paychex LibreChat capability documentation generation and review. Use when writing or reviewing docs/capabilities-*.md files."
applyTo: "docs/capabilities-*.md"
---

# Paychex LibreChat Capability Doc Context

This file provides canonical reference data for generating and reviewing Paychex LibreChat capability documents.

## Labeling Guidance for Discovered Changes

After running `git diff --name-status upstream/main..HEAD`, read each changed file to determine its user-facing impact. Only list a feature as Paychex-specific if its file is `A` or `M` in the diff.

Use the following rules when labeling specific patterns found during discovery:

- **People Picker middleware** (any modified file matching `checkPeoplePickerAccess` or similar): This is an **admin-only** feature — list it in the **Known Limitations** section as inaccessible to general users. Do not include it in Paychex-Specific Additions.
- **Analytics hooks** (net-new files under `client/src/hooks/` tracking user interactions): **Omit entirely** from the generated doc. Do not mention analytics providers such as Pendo or Segment.
- **Role/permission migration scripts** (`config/migrate-*-permissions.js`): Do not mention specific role names or permission details. Only describe the general user impact if any (e.g., "role-based access control determines which features a user can access"). Omit internal role names.
- **Auth**: Azure Entra ID OpenID Connect is always present — describe only the **login method visible to users** (e.g., "Single Sign-On via your Paychex corporate account"). Do not include client IDs, tenant IDs, issuer URLs, scopes, or any other internal configuration.
- **Public resource sharing** (deleted files `useCanSharePublic.ts` and `checkSharePublicAccess.js`): These guard the `SHARE_PUBLIC` permission on **resources** (agents, prompts, MCP servers) — not on conversations. Their deletion means users can no longer mark agents or prompts as publicly visible to everyone. Do **not** conflate this with conversation link sharing, which is governed by the `ALLOW_SHARED_LINKS` / `ALLOW_SHARED_LINKS_PUBLIC` env vars in the container definition. List the resource-sharing removal in **Known Limitations** as "Agent/Prompt public sharing removed".

## Config Key → User-Facing Feature Mapping

Use this table to translate YAML config keys into end-user capability descriptions:

| Config Key | User-Facing Feature |
|------------|---------------------|
| `interface.agents: true` | AI Agents config enabled — but the **Agent Builder is an admin-only feature**; list it in **Known Limitations** as not accessible to general users |
| `modelSpecs.addedEndpoints` includes `agents` (without admin restriction) | LangGraph Agents available for general users via the model selector |
| `interface.modelSelect: true` | Users can switch between available AI models |
| `interface.parameters: true` | Users can adjust model parameters (temperature, max tokens, etc.) |
| `interface.presets: true` | Conversation presets available — save and reuse prompt configurations |
| `interface.runCode: false` | Code execution (sandboxed runtime) is **disabled** |
| `mcpServers` with Tavily | Internet/web search capability via Tavily MCP |
| `modelSpecs.addedEndpoints` includes `agents` | Agent builder is accessible from the model selector |
| `addParams.disableStreaming: true` | Model does **not** support streaming responses — full response delivered at once |
| `dropParams: [stream, streaming]` | Streaming disabled for this model endpoint |
| `streamRate: 25` | Streaming enabled — responses appear word-by-word |
| `directEndpoint: true` | Model connects directly to provider, not through Azure OpenAI |

## Default-Enabled Upstream LibreChat Features

The following features are enabled by default in upstream LibreChat. Assume they are **enabled** in this fork unless explicitly disabled in the environment config or interface toggles:

- **Conversation search** — Full-text search powered by Meilisearch
- **File attachments/uploads** — Attach files to conversations for context
- **RAG (Retrieval-Augmented Generation)** — Upload documents to query against (requires RAG API container)
- **Conversation sharing** — Generate a shareable link to a conversation; anyone with the link can view it (controlled by `ALLOW_SHARED_LINKS` and `ALLOW_SHARED_LINKS_PUBLIC` env vars, both of which default to `true` when unset)
- **Conversation export** — Export conversations as JSON or markdown
- **Bookmarks** — Bookmark important messages
- **Multi-language support (i18n)** — Interface available in multiple languages
- **Code artifacts** — Render and display code blocks with syntax highlighting
- **LaTeX rendering** — Mathematical equations rendered with KaTeX
- **Markdown rendering** — Full markdown support in messages
- **Conversation branching** — Fork conversations from any message
- **Message editing** — Edit previously sent messages and regenerate responses

## Environment URLs

| Environment | URL |
|-------------|-----|
| N1 | https://play.ain1.paychex.com |
| N2A | https://play.ain2a.paychex.com |
| Prod | https://play.ai.paychex.com |

## Streaming Behavior by Provider

| Provider | Streaming Default | Notes |
|----------|------------------|-------|
| Azure OpenAI (gpt-4o, gpt-41, etc.) | Yes | Standard SSE streaming |
| Gemini 2.5 Pro / Flash | No | `disableStreaming: true` + `dropParams: [stream, streaming]` |
| Claude Sonnet 4.5 | Yes | `streamRate: 25` — Kong translates to OpenAI SSE format |
| LangGraph Agents | Yes | `streamRate: 25` |
