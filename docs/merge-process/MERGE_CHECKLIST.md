# Upstream Merge Checklist

**Quick reference checklist for LibreChat upstream merges**  
**Print this and check off items as you complete them**

---

## Pre-Merge Preparation

- [ ] All local changes committed to `develop`
- [ ] Local `develop` branch synced with `origin/develop`
- [ ] Upstream remote configured and fetched
- [ ] Clean working directory (no uncommitted changes)
- [ ] Latest upstream tags fetched
- [ ] Target version identified: `v___________`
- [ ] Current version documented: `v___________`
- [ ] **E2E baseline captured from the CURRENT (pre-merge) build** — this is what
      tells you afterwards whether a failure is the upgrade's fault or ours:
  1. Run the journey suite against a healthy env (Actions → E2E Tests → `suite: journeys`)
  2. Download the run artifact, then:
     `npm run e2e:baseline -- --report <artifact>/results-journeys/results.json --env n2a`
     Capture refuses to run if any test failed or was skipped — fix the environment and
     re-run rather than reaching for `--allow-dirty`, because a test baselined as
     non-passing can never report a regression again.
  3. Commit the refreshed `e2e/baseline.json` on the integration branch

---

## Switch to Integration Branch

- [ ] Checked for existing branch: `git branch -a | grep "upstream/v${TARGET}-integration"`
- [ ] On integration branch: `upstream/v${TARGET}-integration` (created from develop if it didn't exist)

---

## Analysis Phase

- [ ] Merge base identified: `git merge-base upstream/v${TARGET}-integration v${TARGET}`
- [ ] Commit divergence counted: `git rev-list --left-right --count upstream/v${TARGET}-integration...v${TARGET}`
- [ ] Changed files previewed: `git diff --stat upstream/v${TARGET}-integration v${TARGET}`
- [ ] Upstream changelog reviewed
- [ ] Breaking changes identified and documented
- [ ] Merge complexity estimated: □ Low □ Medium □ High

---

## Merge Initiation

- [ ] Attempted merge: `git merge --no-commit --no-ff v${TARGET}`
- [ ] Conflict count recorded: _____ conflicts
- [ ] Conflicts categorized by type:
  - UU (modified both): _____
  - UD (deleted upstream, modified local): _____
  - DU (modified upstream, deleted local): _____
  - AA (added both): _____
  - DD (deleted both): _____

---

## Critical Paychex Customizations to Preserve

### Must Verify After Merge:

- [ ] **filterCrossProviderToolCalls** in `BaseClient.js`
  ```bash
  grep -n "filterCrossProviderToolCalls" api/app/clients/BaseClient.js
  ```

- [ ] **sanitizeSchemaMetadata** in `tools.js`
  ```bash
  grep -n "sanitizeSchemaMetadata" api/server/services/start/tools.js
  ```

- [ ] **Gemini custom endpoint detection** in `MCP.js`
  ```bash
  grep -n "providerLower.includes('gemini')" api/server/services/MCP.js
  ```

- [ ] **Pendo analytics element** in `ModelSelector.tsx`
  ```bash
  grep -n 'id="agentUsers"' client/src/components/Chat/Menus/Endpoints/ModelSelector.tsx
  ```

- [ ] **Menu descriptions** in `DropdownPopup.tsx`
  ```bash
  grep -n "item.description" packages/client/src/components/DropdownPopup.tsx
  ```

- [ ] **Dockerfile error handling** (uses `&&`)
  ```bash
  grep -n "npm run frontend &&" Dockerfile
  ```

- [ ] **xlsx package** uses npm registry (not CDN)
  ```bash
  grep -n '"xlsx":' api/package.json packages/api/package.json
  ```

- [ ] **MCP startup field allowlisted** in `packages/api/src/mcp/utils.ts`
  ```bash
  grep -n "startup: config.startup" packages/api/src/mcp/utils.ts
  ```
  > **Critical build note:** Any change to `packages/api/src/**` requires a rebuild or the backend
  > runs stale compiled code. Always verify and rebuild: `npm run build -w packages/api`

- [ ] **MCP startup auto-select** in `useMCPServerManager.ts`
  ```bash
  grep -n "s.config.startup === true" client/src/hooks/MCP/useMCPServerManager.ts
  ```

- [ ] **Model preference guard** in `ChatRoute.tsx`
  ```bash
  grep -n "hasStoredModelSelection" client/src/routes/ChatRoute.tsx
  ```

- [ ] **Anthropic image encoding block order** in `encode.js` (block must appear before `VisionModes.agents` early-return)
  ```bash
  grep -n "includes('claude')\|includes('anthropic')\|VisionModes.agents" api/server/services/Files/images/encode.js
  ```

- [ ] **Prompt Catalog deep-link integration** (route mount, resolver, query-param exclusion, toast)
  ```bash
  grep -n "/api/prompthub" api/server/index.js api/server/experimental.js
  grep -n "promptCatalogId" client/src/hooks/Input/useQueryParams.ts client/src/routes/ChatRoute.tsx
  ```

- [ ] **SSO rate limit fix** — `skipSuccessfulRequests: true` in `loginLimiter.js`
  ```bash
  grep -n "skipSuccessfulRequests" api/server/middleware/limiters/loginLimiter.js
  ```

- [ ] **OpenID token refresh middleware** wired in agents router
  ```bash
  grep -n "isAccessTokenExpiredOrExpiringSoon\|_inflight" api/server/middleware/refreshOpenIDToken.js
  grep -n "refreshOpenIDToken" api/server/routes/agents/index.js
  ```

- [ ] **RAG context 404 graceful handling** uses `Promise.allSettled`
  ```bash
  grep -n "Promise.allSettled" api/app/clients/prompts/createContextHandlers.js
  ```

- [ ] **MCP stopReconnecting** in `MCPServerInspector.ts`
  ```bash
  grep -n "stopReconnecting" packages/api/src/mcp/registry/MCPServerInspector.ts
  ```

- [ ] **Claude SSE choices normalization for Kong** in `generators.ts`
  ```bash
  grep -n "data.choices = \[\]" packages/api/src/utils/generators.ts
  ```

- [ ] **Azure OpenAI custom icon** — `GPTIconDark` (not `AzureMinimalIcon`) in `Icons.tsx`
  ```bash
  grep -n "GPTIconDark" client/src/hooks/Endpoint/Icons.tsx
  ```

- [ ] **Paychex Changelog link** in Footer and AccountSettings
  ```bash
  grep -n "changelogURL" client/src/components/Chat/Footer.tsx
  grep -n "startupConfig?.changelogURL" client/src/components/Nav/AccountSettings.tsx
  ```

- [ ] **Native DEFAULT badge** in `ModelSpecItem.tsx`
  ```bash
  grep -n "spec.default === true" client/src/components/Chat/Menus/Endpoints/components/ModelSpecItem.tsx
  ```

---

## Conflict Resolution Tracking

### Low-Risk Conflicts (Accept Upstream)
- [ ] Documentation files (CONTRIBUTING.md, README, etc.)
- [ ] Deleted workflow files
- [ ] Test files (unless Paychex customizations found)
- [ ] _____________________________________________
- [ ] _____________________________________________

### Intentionally Removed Workflows — Do NOT Re-Accept
If upstream reintroduces any of these files, delete them again instead of accepting: `build.yml`, `client.yml`, `data-provider.yml`, `data-schemas.yml`, `deploy.yml`, `deploy-dev.yml`, `dev-images.yml`, `dev-branch-images.yml`, `dev-staging-images.yml`, `main-image-workflow.yml`, `tag-images.yml`, `retry-docker-builds.yml`, `helmcharts.yml`, `sync-helm-chart-tags.yml`, `generate_embeddings.yml`, `locize-i18n-sync.yml`, `gitnexus-index.yml`, `gitnexus-deploy.yml`, `gitnexus-pr-command.yml`, `gitnexus-cleanup-pr.yml`, `a11y.yml`. Also delete the `.do/` directory if it reappears. See `.github/instructions/merge-process.instructions.md` for rationale.

Run `scripts/check-forbidden-upstream-workflows.sh` after resolving conflicts — it fails if any of the above reappear.

**Why the GitNexus set and `a11y.yml` were removed:** GitNexus (upstream `01a1bc168`, "experimental", 2026-04-08) deploys a code-search index to a DigitalOcean droplet that Paychex does not own; all four workflows plus `.do/gitnexus/` are upstream-only infrastructure. `a11y.yml` gates on `github.event.pull_request.head.repo.full_name == 'danny-avila/LibreChat'`, so it can never execute in a fork — it was skipped 87 consecutive times. The Playwright a11y suite (`npm run e2e:a11y`) is unaffected and still available locally.

**Retired Paychex workflow (not upstream):** `migrate-prompts-to-catalog.yml` was removed on 2026-09-01 — the migration is complete (a prod dry run reported `alreadyMigrated: 6718`, `eligible: 0`). The migration logic itself is retained at `config/migrate-prompts-to-catalog.js` with npm scripts `migrate:prompts-to-catalog{,:dry-run,:batch}`, so it can still be run manually or rewrapped in a workflow if ever needed.

**Retired Paychex workflow (not upstream):** `sync_tags.yml` was removed on 2026-09-01. It was a `workflow_dispatch`-only job that fetched upstream tags and pushed them to `paychex/LibreChat` using a `SYNC_TAGS_PAT_TOKEN` PAT with push access. Upstream tags are already fetched by hand during every merge (see the pre-merge checklist above), so the workflow added nothing but a standing push-capable credential. **Revoke `SYNC_TAGS_PAT_TOKEN` in repo secrets** — nothing consumes it any more. To sync tags manually:

```bash
git fetch upstream --tags
git push origin --tags
```

### Upstream Branch Filters — Rewrite to Paychex Branches
Upstream workflows gate on `main`, `dev`, `dev-staging`. Paychex uses `develop` and `release/*`. A workflow that keeps the upstream branch list will register, report green, and silently never run. After a merge, check every `pull_request.branches:` list and rewrite it. `scripts/check-forbidden-upstream-workflows.sh` scans every `branches:` filter for these names and also runs as the `Forbidden Upstream Workflows` job on every PR to `develop` / `release/*`.

### Medium-Risk Conflicts (Check History)
- [ ] File: _________________ → Decision: □ Ours □ Theirs □ Manual
- [ ] File: _________________ → Decision: □ Ours □ Theirs □ Manual
- [ ] File: _________________ → Decision: □ Ours □ Theirs □ Manual
- [ ] File: _________________ → Decision: □ Ours □ Theirs □ Manual
- [ ] File: _________________ → Decision: □ Ours □ Theirs □ Manual

### High-Risk Conflicts (Manual Merge Required)
- [ ] File: _________________ → Paychex logic preserved: _______________
- [ ] File: _________________ → Paychex logic preserved: _______________
- [ ] File: _________________ → Paychex logic preserved: _______________

### Deleted Files (Find Migration Path)
- [ ] File: _________________ → New location: _______________
- [ ] File: _________________ → New location: _______________
- [ ] File: _________________ → Paychex logic migrated: □ Yes □ Not Needed

---

## Git History Analysis Performed

For each non-trivial conflict, verify:
- [ ] Ran `git log develop -- <file>` to see Paychex changes
- [ ] Ran `git diff v${CURRENT} develop -- <file>` to see what Paychex added
- [ ] Searched for Paychex indicators (custom, langraph, pendo, gemini, etc.)
- [ ] Checked upstream's version: `git show v${TARGET}:<file>`
- [ ] Decision documented with rationale

---

## Pre-Commit Verification

### Syntax & Build
- [ ] No conflict markers remain: `git diff --check`
- [ ] No unresolved conflicts: `git status` clean
- [ ] Dependencies install cleanly: `npm install`
- [ ] **`packages/api` rebuilt** if any `packages/api/src/**` files changed: `npm run build -w packages/api`
  - Verify the dist reflects changes: `grep -c "startup" packages/api/dist/index.js`
  - The Express server (`/api`) runs the compiled `dist/index.js`, NOT the TypeScript sources
- [ ] Full build succeeds: `npm run build`
- [ ] Build output reviewed for errors/warnings

### Tests
- [ ] Test suite runs: `npm test`
- [ ] Pass rate recorded: _____% (_____ of _____ tests)
- [ ] Pass rate ≥ 90% or failures explained: _____________________
- [ ] New failures investigated and documented

### Manual Testing

> Items marked (auto) are covered by the journey suite — see Automated E2E
> Verification below. Re-check them by hand only if triage flags them.

- [ ] Application starts without errors
- [ ] Login/authentication works (OpenID, Azure, etc.)
- [ ] SSO multi-tab re-auth does not trigger rate limit
- [ ] Custom endpoints connect (LangGraph, custom Gemini, etc.)
- [ ] Claude custom endpoint streaming works without errors
- [ ] MCP tools load and execute
- [ ] Gemini with tools works (no "Proto field" errors)
- [ ] Model selector shows correct models (auto)
- [ ] Native DEFAULT badge displays for the default model spec (auto)
- [ ] Pendo tracking fires (check browser console/network) (auto)
- [ ] File uploads work (including to Claude/Anthropic custom endpoints)
- [ ] RAG context retrieval handles unindexed files gracefully (no page freeze)
- [ ] Changelog link appears in chat footer and account settings (auto)
- [ ] Prompt Catalog panel and deep-link error handling work (auto)
- [ ] UI components render correctly
- [ ] Agent requests succeed after 15+ minutes (Paxton token refresh working)

---

## Automated E2E Verification

Run the journey suite against the deployed integration build, then triage it
against the pre-merge baseline:

```bash
# Actions -> E2E Tests -> Run workflow: environment=n2a, suite=journeys
# Download the artifact, then:
npm run e2e:triage -- --report <artifact>/results-journeys/results.json
```

Read the verdict rather than the raw pass count:

| Triage output | Meaning | Action |
|---|---|---|
| `HARD STOP` (`@paychex` regressed) | The merge removed a Paychex customization | Restore it before shipping |
| `HARD STOP` (`@paychex` vanished) | A Paychex test was deleted, not fixed | Restore the coverage |
| `@upstream` regressed | The upgrade changed upstream behaviour | Decide: accept the change or patch |
| `@platform` regressed | The environment is unhealthy | Investigate the deploy, not the merge |
| No regressions | Nothing known-good broke | Continue |

Exit codes: `0` clean, `1` regressions, `2` missing/unreadable inputs.

- [ ] Journey suite run against the integration build
- [ ] `npm run e2e:triage` reports no `@paychex` regressions
- [ ] Any `@upstream` regressions consciously accepted and noted below

> If a journey test fails, confirm the selector is still valid before declaring a
> regression — run `suite: probe` to see what actually resolves in the DOM.
> Several plausible-looking selectors are known NOT to work; see
> `e2e/coverage-map.json`.

---

## Critical Customizations Final Verification

Run verification script:
```bash
../../scripts/verify-paychex-customizations.sh
```

Or manually verify each:
- [ ] **Tool filtering**: Cross-provider tool calls handled correctly
- [ ] **Schema sanitization**: Gemini tools work without schema errors
- [ ] **Custom endpoints**: Custom Gemini endpoints recognized
- [ ] **Anthropic image encoding**: Block appears before VisionModes.agents in encode.js
- [ ] **Prompt Catalog deep-links**: `/api/prompthub` mounted, `promptCatalogId` excluded from model parsing
- [ ] **SSO rate limit**: `skipSuccessfulRequests: true` present in loginLimiter
- [ ] **OpenID refresh**: `refreshOpenIDToken` wired in agents router, `_inflight` dedup present
- [ ] **RAG 404 handling**: `Promise.allSettled` used (not `Promise.all`) in createContextHandlers
- [ ] **MCP stopReconnecting**: Called in MCPServerInspector before temp connection disconnect
- [ ] **Claude SSE**: `data.choices = []` normalization in generators.ts
- [ ] **Azure icon**: `GPTIconDark` used for Azure OpenAI endpoint (not `AzureMinimalIcon`)
- [ ] **Changelog link**: Rendered in Footer and AccountSettings from `changelogURL`
- [ ] **DEFAULT badge**: `spec.default === true` renders native badge in ModelSpecItem
- [ ] **Analytics**: Pendo tracking elements present
- [ ] **UI polish**: Menu descriptions display, transitions smooth
- [ ] **Build**: Error handling works (build stops on failure)
- [ ] **Dependencies**: All packages use correct sources

---

## Documentation

- [ ] Commit message drafted (see template in UPSTREAM_MERGE_GUIDE.md)
- [ ] Includes:
  - [ ] Upstream version range
  - [ ] Key features/fixes integrated
  - [ ] Paychex customizations preserved
  - [ ] Migration actions taken
  - [ ] Conflict count and resolution summary
  - [ ] Test results
  - [ ] Breaking changes impact (if any)

- [ ] Merge report created (optional): `MERGE_v${TARGET}_REPORT.md`
- [ ] UPSTREAM_MERGE_GUIDE.md reviewed for lessons learned
- [ ] Team informed of merge completion

---

## Commit & Push

- [ ] All changes staged: `git add -A`
- [ ] Commit created with comprehensive message
- [ ] Commit verified: `git log -1 --stat`
- [ ] Pushed to remote: `git push origin upstream/v${TARGET}-integration`
- [ ] Pull request created targeting `develop`
- [ ] Code review requested

---

## Post-Merge

- [ ] Merge branch tested in development environment
- [ ] Integration tests pass in dev environment
- [ ] QA signoff obtained (if required)
- [ ] PR merged to develop via GitHub
- [ ] Tags updated (if applicable)
- [ ] Deployment pipeline triggered
- [ ] Production deployment successful
- [ ] Post-deployment smoke tests pass

---

## Cleanup

- [ ] Integration branch deleted locally after PR merge: `git branch -d upstream/v${TARGET}-integration`
- [ ] Integration branch deleted remotely after PR merge: `git push origin -d upstream/v${TARGET}-integration`
- [ ] Working directory clean
- [ ] Documentation updated with lessons learned

---

## Issue Tracker

**Problems Encountered:**
1. _______________________________________________________________
   - Resolution: _____________________________________________________
   
2. _______________________________________________________________
   - Resolution: _____________________________________________________
   
3. _______________________________________________________________
   - Resolution: _____________________________________________________

**Lessons Learned:**
1. _______________________________________________________________
2. _______________________________________________________________
3. _______________________________________________________________

---

## Sign-Off

- **Merge Performed By:** _____________________ Date: ____________
- **Code Reviewed By:** _____________________ Date: ____________
- **QA Approved By:** _____________________ Date: ____________
- **Deployed By:** _____________________ Date: ____________

---

**Merge Statistics:**

- Source Version: v_____________
- Target Version: v_____________
- Conflicts Resolved: _____________
- Files Changed: _____________
- Lines Added: _____________
- Lines Removed: _____________
- Test Pass Rate: _____________%
- Build Time: _____________
- Duration: _____________ (analysis to commit)

**Next Merge:** Scheduled for _____________

