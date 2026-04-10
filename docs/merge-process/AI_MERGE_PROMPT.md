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
   - Commit: Multiple
   
2. Schema Sanitization (tools.js)
   - Method: sanitizeSchemaMetadata import and usage
   - Purpose: Required for Gemini tool compatibility
   - Commit: c92c359
   
3. Gemini Custom Endpoint Support (MCP.js)
   - Logic: providerLower.includes('gemini') || providerLower.includes('google')
   - Purpose: Enables custom Gemini endpoint detection
   - Commit: c9ae3725
   
4. Pendo Analytics (ModelSelector.tsx)
   - Element: <span id="agentUsers">
   - Purpose: User behavior tracking for business metrics
   
5. Menu Descriptions (DropdownPopup.tsx)
   - Property: item.description rendering
   - Alignment: items-start for multi-line content
   - Purpose: Enhanced developer UX
   
6. OpenID Passthrough
   - Location: Header resolution (env.ts, resolveHeaders function)
   - Purpose: LangGraph custom endpoint authentication
   - Commit: 6d0e02ac
   
7. Dockerfile Build Error Handling
   - Logic: Use && operators instead of ;
   - Purpose: Stop build on first error
   - Commit: d902674

MERGE REQUIREMENTS:

✅ MUST DO:
- Follow UPSTREAM_MERGE_GUIDE.md Phase 3-8 systematically
- Use Decision Matrix (Phase 5) for EVERY conflict
- Check git history before resolving ANY conflict:
  * git log develop -- <file>
  * git diff ${CURRENT_VERSION} develop -- <file>
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
I need to merge LibreChat upstream version v0.8.5 into our Paychex develop branch.

CONTEXT:
- Current Paychex version: v0.8.4
- Target upstream version: v0.8.5
- Merge branch: merge-upstream-v0.8.5
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
