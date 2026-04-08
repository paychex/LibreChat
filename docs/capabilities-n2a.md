# Paychex LibreChat — N2A Capabilities

> **Last updated:** 2026-04-08
> **Environment URL:** https://play.ain2a.paychex.com

---

## Available Models

| Model | Provider | Description | Streaming | Notes |
|-------|----------|-------------|-----------|-------|
| GPT-4o | Azure OpenAI | For daily tasks with a quick response time. | Yes | Default model |
| GPT-4o Mini | Azure OpenAI | Offers simpler, more instant responses. | Yes | |
| GPT-4.1 | Azure OpenAI | For complex reasoning and coding. | Yes | |
| GPT-4.1 Mini | Azure OpenAI | A faster, more lightweight version of GPT-4.1. | Yes | |
| GPT-5 | Azure OpenAI | For advanced tasks with the highest accuracy and reasoning depth. | Yes | |
| Gemini 2.5 Pro | Google (GCP Vertex AI) | Quickly analyze complex, mixed media content. | No | Full response delivered at once; `disableStreaming: true` |
| Gemini 2.5 Flash | Google (GCP Vertex AI) | A faster, more lightweight version of Gemini 2.5 Pro. | No | Full response delivered at once; `disableStreaming: true` |
| Claude Sonnet 4.5 (Limited) | Anthropic (GCP Vertex AI) | For extended reasoning, coding, and automation. This model is being evaluated and can be used a limited number of times. | Yes | Rate-limited; streaming via Kong SSE translation |

---

## Feature Configuration

### Core Features

| Feature | Status | Notes |
|---------|--------|-------|
| Conversation search | Enabled | Full-text search powered by Meilisearch |
| File attachments / uploads | Enabled | Attach files to conversations for context |
| RAG (Retrieval-Augmented Generation) | Enabled | Upload documents to query against; powered by the co-located RAG API container |
| Conversation sharing | Enabled | Generate a shareable link to a conversation; anyone with the link can view it |
| Conversation export | Enabled | Export conversations as JSON or Markdown |
| Bookmarks | Enabled | Bookmark important messages |
| Multi-language support (i18n) | Enabled | Interface available in multiple languages |
| Code artifacts | Enabled | Render and display code blocks with syntax highlighting |
| LaTeX rendering | Enabled | Mathematical equations rendered with KaTeX |
| Markdown rendering | Enabled | Full Markdown support in messages |
| Conversation branching | Enabled | Fork conversations from any message |
| Message editing | Enabled | Edit previously sent messages and regenerate responses |
| Model selection | Enabled | Users can switch between available AI models |
| Model parameters | Enabled | Users can adjust temperature, max tokens, and other parameters |
| Presets | Enabled | Save and reuse prompt/model configurations |
| Prompts library | Enabled | Create and share reusable prompts |
| Code execution (sandboxed runtime) | Disabled | `interface.runCode: false` |

### AI Agents

| Feature | Status | Notes |
|---------|--------|-------|
| AI Agents | Enabled | Pre-built agents are available for use; powered by a Paychex-hosted LangGraph proxy with streaming responses |

### Tools & Integrations

| Tool | Status | Notes |
|------|--------|-------|
| Internet Search (Tavily) | Enabled | Web search via Tavily MCP server; supports standard search and `/deep-research` mode |
| Document RAG | Enabled | Upload and query PDF, text, and other documents using Azure OpenAI embeddings (`text-embedding-ada-002`) |

---

## Authentication

- **Login method:** Single Sign-On via your Paychex corporate account
- **Email/password login:** Enabled (for pre-provisioned accounts; self-registration is disabled)
- **Self-registration:** Disabled

---

## Paychex-Specific Additions

| Feature | Description |
|---------|-------------|
| UI Label Overrides | Net-new English translation override file that customizes several UI labels — including code interpreter, file search, SharePoint upload, and code artifact descriptions — to match Paychex terminology. |
| Role-Based Access Control | Modified permission migration scripts apply Paychex-specific access tiers to agents and prompt groups. Access to certain features is determined by your assigned role. |

---

## Known Limitations

| Limitation | Detail |
|------------|--------|
| Code execution disabled | The sandboxed code interpreter is turned off. Users cannot execute code directly from the chat interface. |
| Gemini 2.5 Pro — no streaming | Responses are delivered in full once generation completes; no word-by-word streaming. |
| Gemini 2.5 Flash — no streaming | Responses are delivered in full once generation completes; no word-by-word streaming. |
| Claude Sonnet 4.5 — rate-limited | Actively being evaluated; users are limited to a small number of requests. Exceeding the limit returns an error. |
| Agent Builder — admin only | The Agent Builder (custom agent creation) is accessible to administrators only. General users cannot create or configure agents. |
| People Picker — admin only | The People Picker (directory search for conversation sharing) is accessible to administrators only and is not available to general users. |
| Agent/Prompt public sharing removed | The ability for users to mark agents or prompts as publicly shared with everyone has been removed. Resource sharing is limited to explicitly granted individuals or groups. |
| Mermaid diagram rendering removed | Mermaid diagram code blocks will not render as visual diagrams. |
| Plugin / tool marketplace removed | Users cannot browse or install third-party tools from within the app. |
| User API key management removed | Users cannot generate personal API keys. |
| Resumable streaming removed | If a network connection drops mid-response, the response does not automatically resume. |
