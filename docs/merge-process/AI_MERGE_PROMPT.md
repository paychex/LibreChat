# AI-Assisted Upstream Merge Prompt

**Purpose:** Copy-paste this prompt when using AI assistance (GitHub Copilot, Claude, ChatGPT, etc.) for LibreChat upstream merges.

**Instructions:** Fill in the variables marked with `${...}` then paste the entire prompt to your AI assistant.

---

## 🤖 Standard Merge Prompt

```
I need to merge LibreChat upstream version ${TARGET_VERSION} into our Paychex develop branch.

CONTEXT:
- Current Paychex version: ${CURRENT_VERSION}
- Target upstream version: ${TARGET_VERSION}
- Merge branch: merge-upstream-${TARGET_VERSION}
- Conflicts detected: ${CONFLICT_COUNT} files
- Complete process documented in: UPSTREAM_MERGE_GUIDE.md

CRITICAL PAYCHEX CUSTOMIZATIONS (MUST PRESERVE):

1. Tool Call Filtering (BaseClient.js)
   - Method: filterCrossProviderToolCalls
   - Purpose: Prevents Gemini "Proto field is not repeating" errors

2. Schema Sanitization (tools.js)
   - Method: sanitizeSchemaMetadata import and usage
   - Purpose: Required for Gemini tool compatibility

3. Gemini Custom Endpoint Support (MCP.js)
   - Logic: providerLower.includes('gemini') || providerLower.includes('google')
   - Purpose: Enables custom Gemini endpoint detection (2 locations)

4. Anthropic Image Encoding (encode.js)
   - Pattern: includes('claude') || includes('anthropic'), block BEFORE VisionModes.agents early-return
   - Purpose: Converts image parts to Anthropic-native format for custom Claude/Anthropic endpoints

5. Prompt Catalog Deep-Link Integration (prompthub.js, useQueryParams.ts, ChatRoute.tsx)
   - Patterns: /api/prompthub/resolve-insert, promptCatalogId, PROMPT_CATALOG_API_URL, com_ui_prompt_catalog_insert_error
   - Purpose: AI Hub Prompt Catalog → LibreChat deep links with server-side prompt resolution

6. SSO Rate Limit Fix (loginLimiter.js)
   - Pattern: skipSuccessfulRequests: true
   - Purpose: Prevents multi-tab SSO users from being rate-limited on simultaneous re-auth

7. OpenID Token Refresh Middleware (refreshOpenIDToken.js, agents/index.js)
   - Patterns: isAccessTokenExpiredOrExpiringSoon, _inflight Map, refreshOpenIDToken in agents router
   - Purpose: Proactively refreshes Azure AD access_token before Paxton agent calls; deduplicates concurrent refresh

8. RAG Context 404 Graceful Handling (createContextHandlers.js)
   - Pattern: Promise.allSettled (not Promise.all)
   - Purpose: Isolates per-file 404 failures so unindexed files don't crash the entire generation

9. MCP SSE Noise + stopReconnecting (connection.ts, MCPServerInspector.ts)
   - Patterns: shouldStopReconnecting, stopReconnecting() called before disconnect for temp connections
   - Purpose: Prevents reconnection storm after server inspection; reduces Splunk noise

10. Claude SSE Choices Normalization for Kong (generators.ts)
    - Pattern: data.choices = []
    - Purpose: Normalizes missing choices array in Claude SSE chunks omitted by Kong gateway
    - Build note: Requires npm run build -w packages/api after changes

11. Pendo Analytics (ModelSelector.tsx)
    - Element: <span id="agentUsers">
    - Purpose: User behavior tracking for business metrics

12. Menu Descriptions (DropdownPopup.tsx)
    - Property: item.description rendering, items-start alignment
    - Purpose: Enhanced UX for dropdown menus

13. Azure OpenAI Custom Icon (Icons.tsx)
    - Pattern: GPTIconDark component (not AzureMinimalIcon)
    - Purpose: Visual consistency for Azure OpenAI endpoint icon

14. Paychex Changelog Link (Footer.tsx, AccountSettings.tsx)
    - Patterns: changelogURL in Footer, startupConfig?.changelogURL in AccountSettings
    - Purpose: Exposes changelog URL configured in librechat.*.yml

15. Native DEFAULT Badge (ModelSpecItem.tsx)
    - Pattern: spec.default === true
    - Purpose: React DEFAULT badge replacing Pendo-injected version

16. Dockerfile Build Error Handling (Dockerfile)
    - Logic: Use && operators instead of ;
    - Purpose: Stop build on first error

MERGE REQUIREMENTS:

✅ MUST DO:
- Follow UPSTREAM_MERGE_GUIDE.md Phase 3-8 systematically
- Use Decision Matrix (Phase 5) for EVERY conflict
- Check git history before resolving ANY conflict:
  * git log upstream/v${TARGET_VERSION}-integration -- <file>
  * git diff ${CURRENT_VERSION} upstream/v${TARGET_VERSION}-integration -- <file>
- NEVER blindly accept upstream changes
- Preserve ALL Paychex customizations listed above
- Manually merge when both sides have valuable changes
- Verify all critical customizations after resolution
- Run full test suite before committing
- Create comprehensive commit message

❌ MUST NOT DO:
- Accept upstream without checking for Paychex logic
- Skip git history analysis
- Remove Paychex customizations without explicit approval
- Commit without verification
- Leave conflict markers in code

WORKFLOW:

Phase 1: Conflict Categorization
- List all conflicts by type (UU, UD, DU, AA, DD)
- Categorize by risk level (low/medium/high)
- ASK: Should I proceed with this categorization?

Phase 2: For Each Conflict (Starting with Low-Risk)
- Analyze git history to identify Paychex customizations
- Determine resolution strategy using Decision Matrix
- EXPLAIN: What I found and what I plan to do
- ASK: Confirm before executing resolution
- Execute resolution
- Move to next conflict

Phase 3: Deleted Files (UD conflicts)
- Identify where upstream moved the functionality
- Check if Paychex customizations need migration
- EXPLAIN: Migration plan
- ASK: Confirm migration approach
- Execute migration

Phase 4: Verification
- Check all critical customizations are preserved
- Verify no conflict markers remain
- Run build and tests
- REPORT: Results and any issues found

Phase 5: Documentation
- Create comprehensive commit message
- Document lessons learned
- ASK: Ready to commit?

CLARIFYING QUESTIONS YOU SHOULD ASK:

Before Starting:
1. "What was the previous upstream version (current base)?"
2. "Are there any new Paychex features since last merge I should know about?"
3. "Are there known breaking changes in ${TARGET_VERSION} I should prioritize?"

During Resolution:
4. "File ${FILE} has both Paychex and upstream changes. Should I manually merge?"
5. "I found Paychex logic ${FEATURE} - shall I preserve it?"
6. "File ${FILE} deleted upstream but has Paychex code - should I find where it moved?"
7. "Build/test warnings found - are these acceptable or should I investigate?"

Before Committing:
8. "All conflicts resolved. Should I verify critical customizations checklist?"
9. "Test pass rate is ${PASS_RATE}%. Is this acceptable?"
10. "Ready to commit? Any final checks needed?"

QUALITY ASSURANCE:

You should demonstrate:
✅ Checked git history for EACH conflicting file
✅ Explicitly identified Paychex customizations
✅ Explained WHY keeping/merging specific code
✅ Asked clarifying questions when uncertain
✅ Verified critical customizations after resolution
✅ Ran build and tests successfully
✅ Created detailed documentation

START:
Please begin by analyzing the ${CONFLICT_COUNT} conflicts and categorizing them by risk level. Ask me any questions you need before we start resolving conflicts.
```

---

## 📝 Variables to Fill In

Before using the prompt, replace these placeholders:

- `${TARGET_VERSION}` - Version you're merging TO (e.g., `v0.8.5`)
- `${CURRENT_VERSION}` - Version you're merging FROM (e.g., `v0.8.4`)
- `${CONFLICT_COUNT}` - Number of conflicts detected
- `${PASS_RATE}` - Test pass rate percentage (use during verification)
- `${FILE}` - Specific file being discussed (used in questions)
- `${FEATURE}` - Specific feature/logic being discussed (used in questions)

---

## 🎯 Example Usage

```
I need to merge LibreChat upstream version v0.8.5 into the upstream/v0.8.5-integration branch.

CONTEXT:
- Current Paychex version: v0.8.4
- Target upstream version: v0.8.5
- Integration branch: upstream/v0.8.5-integration
- Conflicts detected: 18 files
- Complete process documented in: UPSTREAM_MERGE_GUIDE.md

[... rest of prompt ...]

START:
Please begin by analyzing the 18 conflicts and categorizing them by risk level. Ask me any questions you need before we start resolving conflicts.
```

---

## 💡 Tips for Effective AI Collaboration

1. **Be Explicit:** Provide all context in the initial prompt
2. **Encourage Questions:** AI should ask clarifying questions frequently
3. **Verify Decisions:** Review AI's reasoning before accepting resolutions
4. **Iterative Approach:** Resolve conflicts in batches, verify as you go
5. **Document Everything:** Have AI explain every decision made
6. **Trust but Verify:** AI should provide git evidence for all claims

---

## 🔄 Iterative Prompting

If the AI makes a mistake or you need to course-correct:

```
CORRECTION:

I noticed you ${ISSUE_DESCRIPTION}.

The correct approach should be:
${CORRECT_APPROACH}

Please review ${FILES} and update them to preserve ${PAYCHEX_FEATURE}.

Before making changes, explain:
1. What you found in git history
2. What needs to be preserved
3. How you'll merge both versions

Proceed only after I confirm your plan.
```

---

**Last Updated:** April 2026 (v0.8.1 → v0.8.4 merge)  
**See Also:** UPSTREAM_MERGE_GUIDE.md for complete process documentation
