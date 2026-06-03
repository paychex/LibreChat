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

---

## Analysis Phase

- [ ] Merge base identified: `git merge-base develop v${TARGET}`
- [ ] Commit divergence counted: _____ develop commits, _____ upstream commits
- [ ] Changed files previewed: `git diff --stat develop v${TARGET}`
- [ ] Upstream changelog reviewed
- [ ] Breaking changes identified and documented
- [ ] Merge complexity estimated: □ Low □ Medium □ High

---

## Merge Initiation

- [ ] Created merge branch: `merge-upstream-v${TARGET}`
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
- [ ] Application starts without errors
- [ ] Login/authentication works (OpenID, Azure, etc.)
- [ ] SSO multi-tab re-auth does not trigger rate limit
- [ ] Custom endpoints connect (LangGraph, custom Gemini, etc.)
- [ ] Claude custom endpoint streaming works without errors
- [ ] MCP tools load and execute
- [ ] Gemini with tools works (no "Proto field" errors)
- [ ] Model selector shows correct models
- [ ] Native DEFAULT badge displays for the default model spec
- [ ] Pendo tracking fires (check browser console/network)
- [ ] File uploads work (including to Claude/Anthropic custom endpoints)
- [ ] RAG context retrieval handles unindexed files gracefully (no page freeze)
- [ ] Changelog link appears in chat footer and account settings
- [ ] UI components render correctly
- [ ] Agent requests succeed after 15+ minutes (Paxton token refresh working)

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
- [ ] Pushed to remote: `git push origin merge-upstream-v${TARGET}`
- [ ] Pull request created (if required)
- [ ] Code review requested (if required)

---

## Post-Merge

- [ ] Merge branch tested in development environment
- [ ] Integration tests pass in dev environment
- [ ] QA signoff obtained (if required)
- [ ] Merged to develop: `git checkout develop && git merge merge-upstream-v${TARGET}`
- [ ] Tags updated (if applicable)
- [ ] Deployment pipeline triggered
- [ ] Production deployment successful
- [ ] Post-deployment smoke tests pass

---

## Cleanup

- [ ] Merge branch deleted locally: `git branch -d merge-upstream-v${TARGET}`
- [ ] Merge branch deleted remotely: `git push origin -d merge-upstream-v${TARGET}`
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

