# Playwright MCP — Setup Guide

A step-by-step guide for adding Playwright MCP to any repository so engineers can use an LLM agent (via VS Code Copilot Chat) to generate Playwright E2E test specs.

This guide is **app-agnostic** — it works for any web application, not just LibreChat. For LibreChat-specific notes, see [PAYCHEX_README.md](../PAYCHEX_README.md#generating-e2e-specs-with-playwright-mcp). For the POC findings that motivated this setup, see [playwright-mcp-poc.md](playwright-mcp-poc.md).

---

## Prerequisites

- VS Code with GitHub Copilot Chat extension (Agent mode required — available in recent versions)
- Node.js 20+ and npx
- An app you can run locally (frontend reachable at some URL)
- ~30 minutes for first-time setup

## Step 1 — Configure the MCP server

Create `.vscode/mcp.json` in the root of your repository:

```json
{
  "servers": {
    "playwright": {
      "command": "npx",
      "args": [
        "-y",
        "@playwright/mcp@latest",
        "--user-data-dir",
        "${workspaceFolder}/.playwright-mcp-profile",
        "--headless"
      ]
    }
  }
}
```

What each flag does:
- `--user-data-dir` — persistent browser profile so login state survives between chat invocations
- `--headless` — runs without opening a visible browser window (drop this flag if you want to see what the agent is doing)

## Step 2 — Update `.gitignore`

The MCP creates several local artifacts that should not be committed:

- **`.playwright-mcp/`** — local screenshots and snapshots from chat sessions (debug noise)
- **`.playwright-mcp-profile/`** — persistent browser profile, **contains auth tokens**
- **`**/storageState.*.json`** — saved Playwright session files, **contain auth tokens**

Add these to your `.gitignore`:

```
.playwright-mcp/
.playwright-mcp-profile/
**/storageState.*.json
```

## Step 3 — Pre-install Chromium

The first time the MCP starts a browser, it downloads Chromium. Doing this ahead of time prevents long pauses during the first chat invocation:

```bash
npx playwright install chromium
```

Behind a corporate proxy (e.g., Zscaler), the download for the headless-shell variant may 404 — the full Chromium download usually still works.

## Step 4 — Activate the MCP server in VS Code

1. Open `.vscode/mcp.json` in VS Code. You'll see a `▷ Start` codelens above the `"playwright"` entry — click it.
2. Or use the Command Palette → **MCP: List Servers** → select `playwright` → Start.
3. Reload VS Code if the tools don't appear (Command Palette → **Developer: Reload Window**).

## Step 5 — Enable the playwright tools in chat

1. Open Copilot Chat.
2. Switch to **Agent** mode (dropdown at the bottom of the chat input).
3. Open Command Palette → **Chat: Configure Tools…**
4. Find the `playwright` group and enable the tools you want (typically all of them).

## Step 6 — Smoke test

In the chat, paste this prompt to confirm everything works:

> Use the playwright tools to navigate to https://example.com, take a snapshot, and tell me the page title and the text of the H1.

Expected response: title `Example Domain`, H1 `Example Domain`. If you see this, you're ready to generate tests against your own app.

## Step 7 — Generate your first spec

With your local dev server running, prompt the agent something like:

> Use the playwright tools to navigate to http://localhost:3000, snapshot the page, and generate a Playwright spec saved to `e2e/specs/mcp-landing.spec.ts` that asserts the main visible elements are present. Use `getByRole` locators throughout.

The agent will explore the page, then write the spec file.

## Step 8 — Run the generated spec

If your repo doesn't already have Playwright installed:

```bash
npm install -D @playwright/test
npx playwright install chromium
```

Run the spec:

```bash
npx playwright test e2e/specs/mcp-landing.spec.ts
```

---

## Authentication

If your app requires login, the agent's browser session won't be authenticated by default. Two patterns work:

**Option A (recommended for most apps):** Inline login in `beforeEach`. Tell the agent to include the login steps at the top of each test, or use a Playwright [setup project](https://playwright.dev/docs/auth) to log in once and save `storageState.json`.

**Option B (for apps with stable refresh tokens):** Save `storageState.json` once via a one-off script, configure your `playwright.config.ts` to load it. Note: some apps rotate refresh tokens, which makes saved sessions go stale quickly — if you see auth failures after a while, switch to Option A.

For SSO-protected apps (Azure Entra, Okta, etc. with MFA): the agent can't autonomously get past corp MFA. You'll need a stored session file or a service account.

---

## Tips for getting good output

- **Use Agent mode, not Ask mode** — only Agent mode can call tools.
- **Be specific about file paths** — *"save the spec to `e2e/specs/mcp-foo.spec.ts`"* works better than *"create a test file."*
- **Tell it which locators to prefer** — *"use `getByRole` throughout, no CSS selectors"* prevents brittle output.
- **Have the agent explore first, then generate** — *"navigate to X, snapshot the page, then generate a spec asserting…"* yields better-grounded tests than *"generate a spec for X."*
- **Always review the generated spec** — the agent can over-assert from a single observation. Treat its output like a Copilot suggestion, not a finished PR.

---

## Troubleshooting

| Problem | Likely cause | Fix |
|---|---|---|
| No `playwright` tools in VS Code | MCP server not started | Click `▷ Start` in `.vscode/mcp.json` |
| Tools listed but agent doesn't call them | Wrong chat mode | Switch to Agent mode |
| Chromium download 404s | Corp proxy / Zscaler | Try again, or download manually from playwright.dev |
| Agent reports "URL doesn't load" | App not running locally | Start your dev servers first |
| Generated tests fail with "element not found" | Auth / login issue | See Authentication section above |

---

## Further reading

- Microsoft Playwright MCP repo: https://github.com/microsoft/playwright-mcp
- Playwright docs: https://playwright.dev
- Playwright best practices for locators: https://playwright.dev/docs/best-practices
