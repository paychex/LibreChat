# Playwright MCP — Proof of Concept Findings

**Ticket goal:** Investigate Playwright MCP for full dynamic test automation of LibreChat (Paychex Play AI). Determine whether it should be adopted, and if so, define follow-up work.

**Status:** POC complete. Recommendation: **Adopt with caveats — use as an authoring/exploration tool, not as a runtime test executor.**

---

## TL;DR

Playwright MCP is a **viable test-authoring accelerator** for LibreChat. In the POC, an LLM agent autonomously:

- Discovered ~40 distinct user-facing features in one prompt without hand-curated guidance
- Generated a 2-test landing-page spec that **passed first run with no edits** (uses `getByRole` locators throughout)
- Generated an 8-test dropdown spec covering positive, negative, and state-transition cases — of which 2 passed first run, 6 failed for a mix of reasons including **one real product issue** the agent surfaced (Artifacts menu item missing description)

It is **not** a runtime test executor — it's an authoring tool that produces standard Playwright spec files. Generated specs are run with the standard Playwright runner.

---

## Setup

| Component | File / Detail |
|---|---|
| MCP server config | [.vscode/mcp.json](../.vscode/mcp.json) — `@playwright/mcp@latest` via npx, persistent profile, headless |
| Lightweight test runner | [e2e/playwright.config.poc.ts](../e2e/playwright.config.poc.ts) — skips Mongo seeding, no webServer, matches `mcp-*.spec.ts` |
| Login helper | [e2e/setup/login-poc.ts](../e2e/setup/login-poc.ts) and [e2e/setup/global-setup-poc.ts](../e2e/setup/global-setup-poc.ts) |
| Generated specs | [e2e/specs/mcp-landing.spec.ts](../e2e/specs/mcp-landing.spec.ts), [e2e/specs/mcp-tools-dropdown.spec.ts](../e2e/specs/mcp-tools-dropdown.spec.ts) |

Total setup time: under one hour from zero.

---

## Scenarios run

### Scenario 1 — Public landing page (unauthenticated)
- **Prompt:** "Navigate to http://localhost:3090, snapshot the page, generate a spec asserting main visible elements."
- **Result:** [mcp-landing.spec.ts](../e2e/specs/mcp-landing.spec.ts) — 2 tests, **2/2 passed first run** (~11s).
- **Locator quality:** All `getByRole` / `getByText`. Zero brittle CSS selectors.

### Scenario 2 — Feature inventory (no test generation)
- **Prompt:** "Log in. Explore the app and produce a feature inventory — list every distinct user-facing feature visible from the main screen, going at most 1 click deep."
- **Result:** Agent autonomously identified ~40 distinct features across 7 areas (sidebar, header, chat area, right side panel, etc.), including:
  - All 4 model endpoints (Azure OpenAI, Gemini 2.5 Pro/Flash, Claude Sonnet 4.5)
  - The Paychex-specific dev-only React Query Devtools toggle
  - The right-side Control Panel which is collapsed by default
  - All 3 toolbar submenus and their items
- **Implication:** The agent can *discover* the test surface — we don't have to hand-curate the list of "things to test."

### Scenario 3 — Tools dropdown deep-dive (Paychex customization)
- **Prompt:** Generate a suite covering: button visible, click opens dropdown, exact item set, label + description (Paychex enhancement), outside click closes, toggle on shows selected state.
- **Result:** [mcp-tools-dropdown.spec.ts](../e2e/specs/mcp-tools-dropdown.spec.ts) — 8 tests, **2/8 passed first run.**
- **Failure breakdown:**
  | Bucket | Count | Why |
  |---|---|---|
  | Real product issue surfaced | 1 | Artifacts menu item lacks `description` (asymmetry vs. File Search / Web Search — confirmed against [ArtifactsSubMenu.tsx](../client/src/components/Chat/Input/Tools/ArtifactsSubMenu.tsx)) |
  | Over-assertion / brittle expectation | 3 | Toggle state assertions encoded `aria-checked` semantics from a single observation |
  | Setup / state hygiene | 2 | `beforeEach` reset logic relied on toggle badges that didn't appear pre-toggle |

---

## What worked

- **Setup is trivial** — 7-line config, one command, works against both Copilot Chat and Claude Desktop.
- **Locator quality is excellent** — agent defaults to accessibility-first locators (`getByRole`, `getByText`), not brittle CSS selectors. This matches Playwright best practice.
- **Autonomous feature discovery is real** — the agent can explore an unfamiliar app and produce a coverage matrix. This is the highest-leverage capability.
- **Generated specs are idiomatic Playwright** — readable `test.describe` grouping, sensible `beforeEach`, exact-count assertions correctly scoped to the dropdown portal to avoid bleed from the user menu.
- **Surfaces real bugs** — the Artifacts description gap was a genuine inconsistency that hand-written tests likely wouldn't have caught (because the test author would have known to skip it).
- **Honest failures are useful** — when the agent encoded the user-stated invariant ("each item has label AND description") and it failed, that's the system telling us something true.

## What didn't work / caveats

- **Auth handoff is fragile.** LibreChat's refresh-token rotation means a saved `storageState.json` goes stale between runs. Inline login in `beforeEach` works but adds time. Not a blocker, but a real maintenance concern.
- **Over-assertion on first observation.** The agent sees a single happy-path interaction and assumes invariants that hold only in that case (e.g., `aria-checked='false'` always present pre-toggle). Tests need a code review pass before being committed.
- **Pass rate degrades with scenario complexity.** Simple specs (landing page) passed 100%. Multi-step interactive specs (dropdown with state) passed 25%. Agents are better at *generating* tests than at *getting them right* on the first try.
- **No test execution at runtime.** The MCP doesn't run the test suite — it generates spec files. CI still uses the standard Playwright runner. This is correct architecturally but worth being explicit about.
- **Cost.** Each broad-coverage prompt consumes meaningful tokens (we did not measure precisely, but a single Tools-dropdown generation took noticeably longer than hand-writing the same spec). Likely scales to a real budget line at fleet scale.

---

## Adoption recommendation

**Adopt as an authoring tool with a human-in-the-loop review step.** Specifically:

1. **Use Playwright MCP to generate first drafts** of new spec files when expanding coverage. Do not auto-merge — treat generated specs like any other PR.
2. **Use it for feature inventory** when planning test coverage of a new release. The discovery output is high-quality and saves planning time.
3. **Do not use it to maintain specs without supervision.** The over-assertion behavior means it can introduce false positives that pass locally and fail in CI.
4. **Generated specs should be reviewed before being committed.** The POC config ([e2e/playwright.config.poc.ts](../e2e/playwright.config.poc.ts)) is intended for local generation and validation; specs that prove their worth get committed alongside any other test code.

### When NOT to use it

- For specs covering authentication flows or auth-state-dependent setup (refresh-token issues make local iteration painful).
- For specs that need to assert on streaming AI responses (the agent has no way to mock or stub these — runs become non-deterministic).
- For Paychex-specific customizations the agent has no prior knowledge of (e.g., `filterCrossProviderToolCalls`) — those need human-authored tests informed by [.github/copilot-instructions.md](../.github/copilot-instructions.md).

---

## Cost-benefit estimate

Rough numbers for a hypothetical "author 50 E2E specs from scratch" effort:

| Approach | Estimated time |
|---|---|
| Hand-write all 50 specs | High — multiple days of focused work, plus per-spec maintenance overhead |
| Generate 50 specs via MCP, review each | Lower for authoring (a few hours of prompting), comparable review time, pass rate likely ~30–50% first-try based on POC data |
| **Hybrid: MCP-generate + human review + hand-fix failures** | **Lowest total time, highest coverage** |

The hybrid is the recommended adoption shape.

---

## Cross-team applicability

Playwright MCP is **not LibreChat-specific.** It is a generic browser-automation MCP server. Anything we learned in this POC applies to any web app any team at Paychex builds.

### Reusable as-is across teams
- The 7-line [.vscode/mcp.json](../.vscode/mcp.json) config works against any web app, no changes needed.
- The lightweight POC config pattern ([e2e/playwright.config.poc.ts](../e2e/playwright.config.poc.ts) — skip global setup, no webServer, match `mcp-*.spec.ts`) is portable.
- The "inline login in `beforeEach`" workaround for refresh-token rotation is a general pattern other teams will likely need.

### Per-team variation to expect
- **Apps behind Azure Entra SSO with MFA** — MCP cannot autonomously get past corp MFA. Teams will need a stored `storageState` workflow or a service-account login.
- **Apps with mature `data-testid` cultures** — agent prefers ARIA roles; output quality drops if the app's accessibility tree is weak.
- **Apps tested on mobile viewports** — needs `--viewport-size` flag on the MCP server.
- **Initial Chromium download behind Zscaler / corp proxy** — we hit a 404 on the headless-shell variant from a Microsoft CDN during install; full Chromium downloaded fine. Other teams may hit similar transient issues.

### Open question for platform / DevEx
Should Paychex offer a **shared internal Playwright MCP server** (centrally configured, centrally observed) instead of every team running their own via `npx`? This is outside the scope of this ticket but worth raising — pros: central auth handling, central upgrade cadence, usage telemetry; cons: a service to operate. Recommendation: bring this up with whoever owns developer-platform tooling.

### Suggested next step (out of scope for this ticket)
Write a short cross-team "How to use Playwright MCP at Paychex" doc covering the config snippet, the `.gitignore` entries, the auth caveat, and the proxy gotcha. Could live in Confluence with a copyable config block. Estimated effort: 30 minutes.

---

## Follow-up stories

Drafted separately as ticket-ready items. Three stories are proposed (any subset can be picked up):

1. **MCP1** — Productionize the POC infrastructure (commit configs, document workflow)
2. **MCP2** — Use Playwright MCP to expand E2E coverage to all major features (the actual coverage push)
3. **MCP3** — Define a CI-gated review workflow for MCP-generated specs

See [playwright-mcp-followup-stories.md](playwright-mcp-followup-stories.md).
