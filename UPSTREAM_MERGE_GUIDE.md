# LibreChat Upstream Merge Guide

**Purpose:** Standard operating procedure for merging upstream LibreChat releases into the Paychex develop branch while preserving all custom functionality.

**Last Updated:** April 2026 (v0.8.1 → v0.8.4 merge)

---

## 📋 Prerequisites

### Required Knowledge
- Git merge conflict resolution experience
- Understanding of Paychex customizations (see [PAYCHEX_README.md](PAYCHEX_README.md))
- Familiarity with LibreChat architecture
- Node.js, TypeScript, React basics

### Required Tools
- Git 2.30+
- Node.js v20.19.0+ or ^22.12.0 or >= 23.0.0
- npm
- Access to upstream LibreChat repository

### Pre-Merge Checklist
- [ ] All local changes committed to `develop`
- [ ] Local `develop` branch up to date with `origin/develop`
- [ ] Upstream remote configured: `git remote -v` shows `upstream`
- [ ] Clean working directory: `git status` shows no uncommitted changes
- [ ] Latest tags fetched: `git fetch upstream --tags`
- [ ] Document current version: Note the version you're merging FROM

---

## 🎯 Merge Workflow

### Phase 1: Analysis & Planning

#### 1.1 Fetch and Identify Target Version
```bash
# Fetch latest upstream data
git fetch upstream --tags

# List available versions
git tag -l "v0.*" | tail -20

# Identify target version (e.g., v0.8.5)
TARGET_VERSION="v0.8.5"
```

#### 1.2 Analyze Scope of Changes
```bash
# Check merge base (common ancestor)
git merge-base develop v${TARGET_VERSION}

# Count commits to merge
git rev-list --left-right --count develop...v${TARGET_VERSION}

# Preview changed files
git diff --stat develop v${TARGET_VERSION} | tail -30

# Check for deletion conflicts
git diff --name-status develop v${TARGET_VERSION} | grep "^D"
```

#### 1.3 Review Upstream Changelog
```bash
# Read what changed
git show v${TARGET_VERSION}:CHANGELOG.md | head -200

# Find breaking changes
git log v${CURRENT_VERSION}..v${TARGET_VERSION} --oneline --grep="BREAKING\|feat" | head -40
```

**📝 Documentation Step:**
Create a merge planning document with:
- Target version
- Number of commits to merge
- High-level feature additions
- Known breaking changes
- Estimated complexity

---

### Phase 2: Create Merge Branch

```bash
# Create new branch from develop
git checkout develop
git checkout -b merge-upstream-v${TARGET_VERSION}

# Attempt merge (don't commit yet)
git merge --no-commit --no-ff v${TARGET_VERSION}

# Check conflict count
git status --short | grep "^UU\|^AA\|^DD\|^DU\|^UD" | wc -l
```

**🚨 CRITICAL:** If you see more than 30 conflicts, consider pausing and documenting complexity before proceeding.

---

### Phase 3: Systematic Conflict Resolution

#### 3.1 Categorize Conflicts

Create a conflict inventory:
```bash
# List all conflicts
git status --short | grep "^UU\|^DU\|^UD\|^AA\|^DD" > conflicts.txt

# Categorize by type
echo "=== Modified by Both Sides (UU) ===" > conflict_analysis.txt
git status --short | grep "^UU" >> conflict_analysis.txt
echo -e "\n=== Deleted in Upstream, Modified in Develop (UD) ===" >> conflict_analysis.txt
git status --short | grep "^UD" >> conflict_analysis.txt
echo -e "\n=== Added by Both (AA) ===" >> conflict_analysis.txt
git status --short | grep "^AA" >> conflict_analysis.txt
```

#### 3.2 Prioritize Resolution Order

Resolve in this order:
1. ✅ **Low-Risk**: Documentation, workflow files, test files
2. ✅ **Dependency Updates**: package.json, Dockerfile, docker configs
3. ⚠️ **Deleted Files**: Files removed in upstream but modified in develop
4. ⚠️ **Configuration**: YAML configs, environment examples
5. 🔴 **Core Services**: MCP, endpoints, clients
6. 🔴 **UI Components**: React components with potential custom UI
7. 🔴 **Critical Business Logic**: Authentication, tool handling, custom endpoints

---

### Phase 4: Paychex Customization Preservation Rules

#### 🔒 **CRITICAL PAYCHEX CUSTOMIZATIONS** (Must Always Preserve)

| Customization | Location | Commit Reference | Why Critical |
|---------------|----------|------------------|--------------|
| **Tool Call Filtering** | `api/app/clients/BaseClient.js` | Multiple commits | Prevents Gemini "Proto field is not repeating" errors |
| **Schema Sanitization** | `api/server/services/start/tools.js` | c92c359 | Required for Gemini tool compatibility |
| **Gemini Custom Endpoint Support** | `api/server/services/MCP.js` | c9ae3725 | Enables custom Gemini endpoint detection |
| **Pendo Analytics** | `client/src/components/Chat/Menus/Endpoints/ModelSelector.tsx` | Various | Business metrics tracking |
| **Menu Descriptions** | `packages/client/src/components/DropdownPopup.tsx` | c9ae3725 | Enhanced UX for developers |
| **OpenID Passthrough** | Header resolution logic | 6d0e02ac | LangGraph authentication |
| **Dockerfile Build Fixes** | `Dockerfile` | d902674 | Proper error handling in CI/CD |

#### 🔍 **How to Identify Paychex Customizations**

For each conflicting file:
```bash
# Check what Paychex added since last merge
git log develop --oneline -- <file_path> | grep -v "Merge"

# See detailed changes
git diff <LAST_UPSTREAM_VERSION> develop -- <file_path>

# Find commit that introduced key logic
git log -p develop -- <file_path> | grep -B5 -A5 "<search_term>"
```

**Red Flags Indicating Paychex Logic:**
- Comments mentioning "Paychex", "custom endpoint", "LangGraph", "Pendo"
- Functions like `filterCrossProviderToolCalls`, `sanitizeSchemaMetadata`
- Custom provider detection (e.g., `providerLower.includes('gemini')`)
- References to `PAYCHEX_README.md` or paychex configuration files
- OpenID/Azure/Entra authentication logic
- Tavily rate limiting or auto-select logic

---

### Phase 5: Conflict Resolution Decision Matrix

Use this matrix for every conflicting file:

```
┌─────────────────────────────────────────────────────────────────┐
│ DECISION TREE FOR CONFLICT RESOLUTION                          │
└─────────────────────────────────────────────────────────────────┘

1. Is this a Paychex-specific file?
   (PAYCHEX_README.md, payx-*, .paychex.*, etc.)
   ├─ YES → Keep develop version (ours)
   └─ NO → Continue to #2

2. Does develop have Paychex customizations?
   (Check git log, search for custom logic)
   ├─ YES → Continue to #3
   └─ NO → Continue to #4

3. Does upstream have improvements to accept?
   (Security fixes, new features, bug fixes)
   ├─ YES → MANUAL MERGE (preserve Paychex + add upstream)
   └─ NO → Keep develop version (ours)

4. Is this a pure upstream feature/fix?
   (No Paychex modifications in develop)
   ├─ YES → Accept upstream (theirs)
   └─ NO → MANUAL MERGE

5. Was the file deleted in upstream?
   ├─ Logic moved to new location → Update references, delete file
   └─ File deprecated → Check if Paychex customizations need migration
```

---

### Phase 6: File-Specific Handling

#### 6.1 Deleted Files (UD conflicts)

**Process:**
1. Check if file contains Paychex customizations:
   ```bash
   git show develop:<file_path> | grep -i "paychex\|custom\|langraph\|pendo"
   ```

2. If YES - Find where functionality moved:
   ```bash
   # Search for similar function names in new files
   git grep -n "<function_name>" v${TARGET_VERSION}
   
   # Check if moved to packages/api
   find packages/api/src -name "*.ts" | xargs grep -l "<key_term>"
   ```

3. Migration strategies:
   - **Logic moved to TypeScript packages:** Update imports to use `@librechat/api`
   - **Functionality deprecated:** Check if still needed, document removal
   - **Renamed/refactored:** Update all references, preserve custom logic

**Example (from v0.8.4 merge):**
```javascript
// OLD (deleted): api/app/clients/OpenAIClient.js
// NEW: Functionality moved to @librechat/agents package

// OLD (deleted): api/server/services/Endpoints/custom/initialize.js  
// NEW: packages/api/src/endpoints/custom/initialize.ts

// ACTION: Update api/server/services/Endpoints/index.js
const {
  initializeCustom,    // Import from @librechat/api
  initializeOpenAI,
  // ...
} = require('@librechat/api');
```

#### 6.2 Modified Files (UU conflicts)

**Critical Files Requiring Manual Review:**

**Backend Services:**
- `api/server/services/MCP.js` - MCP tool handling, Gemini support
- `api/server/services/start/tools.js` - Tool schema processing
- `api/app/clients/BaseClient.js` - Client base class, tool filtering
- `api/server/services/Endpoints/index.js` - Endpoint initialization

**Frontend Components:**
- `client/src/components/Chat/ChatView.tsx` - Main chat component
- `client/src/components/Chat/Menus/Endpoints/ModelSelector.tsx` - Model selection, Pendo tracking
- `client/src/components/Chat/Input/ToolsDropdown.tsx` - Tools UI
- `packages/client/src/components/DropdownPopup.tsx` - Menu system

**Configuration:**
- `Dockerfile` - Build process
- `package.json` (all workspaces) - Dependencies
- `librechat.yaml` - LibreChat configuration

**Resolution Template:**
```bash
# 1. Understand both sides
git show develop:<file> > /tmp/develop_version.txt
git show v${TARGET_VERSION}:<file> > /tmp/upstream_version.txt
diff -u /tmp/develop_version.txt /tmp/upstream_version.txt

# 2. Check for Paychex customizations
git log develop --oneline -- <file> | head -10
git diff <LAST_UPSTREAM_VERSION> develop -- <file>

# 3a. If NO Paychex customizations:
git checkout --theirs <file>
git add <file>

# 3b. If HAS Paychex customizations:
# - Manually edit file to preserve custom logic
# - Add upstream improvements
# - Test thoroughly
# - Document decision in commit message
```

#### 6.3 Configuration Files

**package.json conflicts:**
- ✅ Accept upstream dependency versions unless Paychex pinned for stability
- ✅ Keep Paychex custom scripts
- ✅ Preserve any Paychex-specific dependencies

**Dockerfile conflicts:**
- ✅ Accept upstream security updates and build improvements
- ✅ Preserve Paychex build optimizations (e.g., `&&` instead of `;`)
- ✅ Keep custom certificate handling (`NODE_EXTRA_CA_CERTS`)

**librechat.yaml conflicts:**
- ✅ Accept upstream structural changes
- ✅ Preserve Paychex endpoint configurations
- ✅ Keep custom model mappings and permissions

---

### Phase 7: Verification & Testing

#### 7.1 Pre-Commit Verification

```bash
# Check for lingering conflict markers
git diff --check

# Verify no unresolved conflicts
git status --short | grep "^UU\|^AA\|^DD\|^DU\|^UD" | wc -l
# Should output: 0

# Check for syntax errors
npm run build 2>&1 | grep -i "error"

# Verify critical Paychex customizations
echo "Checking critical customizations..."

# 1. Tool filtering in BaseClient
grep -n "filterCrossProviderToolCalls" api/app/clients/BaseClient.js || echo "❌ MISSING: filterCrossProviderToolCalls"

# 2. Schema sanitization in tools.js
grep -n "sanitizeSchemaMetadata" api/server/services/start/tools.js || echo "❌ MISSING: sanitizeSchemaMetadata"

# 3. Gemini support in MCP.js
grep -n "providerLower.includes('gemini')" api/server/services/MCP.js || echo "❌ MISSING: Gemini custom endpoint support"

# 4. Pendo tracking
grep -n 'id="agentUsers"' client/src/components/Chat/Menus/Endpoints/ModelSelector.tsx || echo "⚠️ WARNING: Pendo tracking may be missing"

# 5. Menu descriptions
grep -n "item.description" packages/client/src/components/DropdownPopup.tsx || echo "⚠️ WARNING: Menu descriptions may be missing"

# 6. Dockerfile error handling
grep -n "npm run frontend &&" Dockerfile || echo "⚠️ WARNING: Dockerfile may not use && for error handling"
```

#### 7.2 Build & Test

```bash
# Clean build
npm run smart-reinstall

# Run test suite
npm test 2>&1 | tee test-results.txt

# Analyze test results
grep -E "(Test Suites:|Tests:)" test-results.txt

# Acceptable: 90%+ pass rate
# Investigate: Any new failures compared to pre-merge develop
```

#### 7.3 Manual Testing Checklist

Test these critical paths:

**Authentication & Authorization:**
- [ ] OpenID login flow works
- [ ] Azure/Entra group permissions apply correctly
- [ ] Custom endpoint authentication functions

**Custom Endpoints:**
- [ ] LangGraph agents endpoint connects
- [ ] Custom Gemini endpoints work
- [ ] Header resolution with conversationId works
- [ ] Tool calls function properly

**MCP & Tools:**
- [ ] MCP tools load and execute
- [ ] Gemini with MCP tools works (no "Proto field" errors)
- [ ] Tool call filtering prevents cross-provider issues
- [ ] OAuth flows work for MCP servers

**UI & Analytics:**
- [ ] Model selector shows correct models
- [ ] Pendo analytics tracking fires
- [ ] Menu descriptions display correctly
- [ ] File upload UI works
- [ ] Dropdown menus render properly

**Build & Deployment:**
- [ ] Docker build completes successfully
- [ ] Frontend build generates all assets
- [ ] No console errors in browser
- [ ] Application starts without errors

---

### Phase 8: Documentation & Commit

#### 8.1 Create Comprehensive Commit Message

Template:
```
Merge upstream v${TARGET_VERSION} into develop

Merged LibreChat v${CURRENT_VERSION} → v${TARGET_VERSION}

## Upstream Changes Integrated:
- [Feature 1]: Brief description
- [Feature 2]: Brief description
- [Fix 1]: Brief description
- [Breaking Change]: Description and impact

## Paychex Customizations Preserved:
- ✅ Tool call filtering (BaseClient.filterCrossProviderToolCalls)
- ✅ Schema sanitization for Gemini (tools.js)
- ✅ Custom Gemini endpoint support (MCP.js)
- ✅ Pendo analytics tracking (ModelSelector.tsx)
- ✅ Menu descriptions (DropdownPopup.tsx)
- ✅ OpenID passthrough for LangGraph
- ✅ Dockerfile build error handling

## Migration Actions Taken:
- Updated Endpoints/index.js to use @librechat/api imports
- Deleted obsolete files: [list files]
- Fixed xlsx CDN issue (switched to npm registry)

## Conflicts Resolved: ${CONFLICT_COUNT}
- Low-risk (auto-resolved): ${AUTO_COUNT}
- Manual merge: ${MANUAL_COUNT}
- Deletions handled: ${DELETE_COUNT}

## Testing:
- Build: ✅ Success
- Tests: ${PASS_COUNT}/${TOTAL_COUNT} passing (${PASS_RATE}%)
- Manual QA: ✅ Completed

## Breaking Changes Impact:
[If applicable, document any breaking changes and mitigation]

Co-authored-by: [Your Name] <your.email@paychex.com>
```

#### 8.2 Commit Strategy

```bash
# Stage all changes
git add -A

# Commit with detailed message
git commit -F commit-message.txt

# Verify commit
git log -1 --stat

# Push to remote
git push origin merge-upstream-v${TARGET_VERSION}
```

#### 8.3 Post-Merge Documentation

Update these files:
1. **CHANGELOG.md** - Document the merge
2. **PAYCHEX_README.md** - Update if new customizations added
3. **UPSTREAM_MERGE_GUIDE.md** - Document lessons learned
4. Create merge report: `MERGE_v${TARGET_VERSION}_REPORT.md`

---

## 🤖 AI Assistant Prompting Guide

When using AI (GitHub Copilot, Claude, ChatGPT, etc.) to assist with merges, use this prompt template:

### Initial Prompt

```
I need to merge LibreChat upstream version ${TARGET_VERSION} into our Paychex develop branch. 

Our Context:
- Current version: v${CURRENT_VERSION}
- Paychex has critical customizations that MUST be preserved (see PAYCHEX_README.md)
- We follow the process documented in UPSTREAM_MERGE_GUIDE.md

Critical Paychex Customizations to Preserve:
1. filterCrossProviderToolCalls in BaseClient.js (prevents Gemini errors)
2. sanitizeSchemaMetadata in tools.js (Gemini tool compatibility)
3. Custom Gemini endpoint detection in MCP.js
4. Pendo analytics tracking elements
5. OpenID passthrough for LangGraph agents
6. Menu description support in UI components
7. Dockerfile build error handling (using && not ;)

Merge Conflicts: ${CONFLICT_COUNT} files

Your Task:
- Follow UPSTREAM_MERGE_GUIDE.md Phase 3-8
- For each conflict, use the Decision Matrix in Phase 5
- NEVER blindly accept upstream changes
- ALWAYS check git history to identify Paychex customizations
- PRESERVE all Paychex logic while integrating upstream improvements
- ASK CLARIFYING QUESTIONS when uncertain

Before resolving ANY conflict:
1. Check: `git log develop -- <file>` for Paychex changes
2. Check: `git diff v${CURRENT_VERSION} develop -- <file>` for what Paychex added
3. Verify: Is this Paychex logic or pure upstream code?
4. If Paychex logic found: Explain what will be preserved and why
5. If uncertain: ASK before proceeding

Start by analyzing the conflict files and asking me any questions you need to ensure accurate resolution.
```

### Clarifying Questions AI Should Ask

The AI should ask these questions systematically:

**Phase 1: Understanding**
- "What version are we merging from? (e.g., v0.8.1)"
- "What version are we merging to? (e.g., v0.8.4)"
- "Are there any known breaking changes in the changelog we should prioritize?"
- "Are there any specific Paychex features added since the last merge I should know about?"

**Phase 2: Conflict Analysis**
- "I see ${COUNT} conflicts. Should I categorize them by risk level first?"
- "There are ${DELETE_COUNT} files deleted in upstream. Should I investigate where their functionality moved?"

**Phase 3: For Each Complex Conflict**
- "File ${FILE} was modified by both sides. Let me check what Paychex added. Should I proceed with analysis?"
- "I found Paychex customization ${FEATURE} in ${FILE}. Upstream also modified this area. Should I manually merge to preserve both?"
- "File ${FILE} was deleted upstream but has Paychex changes. Should I find where this functionality moved in upstream?"

**Phase 4: Verification**
- "Before committing, should I verify all critical Paychex customizations are present?"
- "Should I run the test suite to verify the merge?"
- "Do you want me to create a detailed merge report?"

### AI Response Quality Checks

The AI should demonstrate:
- ✅ Checked git history before resolving conflicts
- ✅ Identified Paychex customizations explicitly
- ✅ Explained WHY keeping/merging specific code
- ✅ Verified critical customizations after resolution
- ✅ Asked clarifying questions when uncertain
- ✅ Documented decisions and reasoning

---

## 📚 Reference Material

### Key Paychex Customizations History

| Feature | Commit Hash | Date | Files Affected | Purpose |
|---------|-------------|------|----------------|---------|
| Gemini Schema Validation | c92c359 | Feb 2026 | tools.js, ToolsDropdown.tsx, MCP.js | Fix Gemini tool schema errors |
| Dockerfile Error Handling | d902674 | Feb 2026 | Dockerfile | Stop build on first error |
| Pendo Analytics | Various | Ongoing | Multiple UI components | User behavior tracking |
| LangGraph OpenID | 6d0e02ac | - | Header resolution | Custom endpoint authentication |
| Tool Filtering | Multiple | - | BaseClient.js | Prevent cross-provider errors |
| Menu Descriptions | c9ae3725 | - | DropdownPopup.tsx | Enhanced developer UX |

### Common Pitfalls to Avoid

1. ❌ **Blindly accepting upstream** - Always check for Paychex customizations first
2. ❌ **Forgetting to check git history** - Use `git log develop -- <file>` religiously
3. ❌ **Not verifying deleted file migrations** - Find where functionality moved
4. ❌ **Skipping tests** - Always run the test suite before committing
5. ❌ **Poor commit messages** - Document what was preserved and why
6. ❌ **Not checking for lingering references** - Verify deleted files aren't referenced
7. ❌ **Assuming upstream knows best** - Sometimes Paychex fixes upstream regressions

### Success Metrics

A successful merge should have:
- ✅ 100% of conflicts resolved correctly
- ✅ All critical Paychex customizations preserved
- ✅ 90%+ test pass rate (excluding known infrastructure issues)
- ✅ Clean build with no errors
- ✅ All upstream features integrated
- ✅ Comprehensive documentation
- ✅ Passing manual QA tests

---

## 🔧 Troubleshooting

### Issue: Too Many Conflicts (>40)
**Solution:** 
- Merge in smaller increments (e.g., v0.8.1 → v0.8.2 → v0.8.3 instead of v0.8.1 → v0.8.3)
- Consider cherry-picking critical security fixes instead of full merge

### Issue: Deleted File Contains Critical Paychex Logic
**Solution:**
1. Find where upstream moved the functionality
2. Extract Paychex logic from old file
3. Integrate into new location
4. Update all references
5. Document migration in commit message

### Issue: Test Pass Rate Drops Below 90%
**Solution:**
1. Identify which tests started failing
2. Check if they're related to:
   - Infrastructure (MongoDB memory server, etc.) - Can ignore
   - New test requirements from upstream - Update tests
   - Broken Paychex customizations - Fix immediately
3. Document any accepted failures with justification

### Issue: Build Fails After Merge
**Solution:**
1. Check for TypeScript errors: `npm run build 2>&1 | grep -i "error"`
2. Verify imports are correct (especially @librechat/api)
3. Check for missing dependencies: `npm install`
4. Clear caches: `npm run reinstall`

### Issue: Uncertain if Code is Paychex Custom or Upstream
**Solution:**
```bash
# Check when code was added
git log --all --oneline --grep="<search_term>"

# Compare with upstream's version history
git log v${CURRENT_VERSION}..v${TARGET_VERSION} --oneline -- <file>

# If the code doesn't appear in upstream history → Likely Paychex custom
```

---

## 📋 Quick Reference Cheatsheet

```bash
# Conflict Analysis
git status --short | grep "^UU"                    # Modified by both
git status --short | grep "^UD"                    # Deleted upstream, modified local
git status --short | grep "^DU"                    # Modified upstream, deleted local

# Identify Paychex Changes
git log develop --oneline -- <file>                # See commit history
git diff v${CURRENT_VERSION} develop -- <file>     # See what Paychex added
git log -p develop -- <file> | grep -A5 <term>     # Find specific logic

# Resolve Conflicts
git checkout --ours <file>                         # Keep develop version
git checkout --theirs <file>                       # Keep upstream version
git checkout --ours <file> && git checkout --theirs <file> # Manual merge needed

# Verification
grep -n "filterCrossProviderToolCalls" api/app/clients/BaseClient.js
grep -n "sanitizeSchemaMetadata" api/server/services/start/tools.js
grep -n "providerLower.includes('gemini')" api/server/services/MCP.js
npm run build && npm test

# Commit
git add -A && git commit -m "Merge upstream v${TARGET_VERSION}"
```

---

## 📞 Getting Help

If you encounter issues:
1. Review this guide thoroughly
2. Check recent merge commits for similar issues: `git log --grep="Merge upstream"`
3. Consult with team members who've done previous merges
4. Document the issue for future reference

---

**Document Version:** 1.0  
**Last Successful Merge:** v0.8.1 → v0.8.4 (April 2026)  
**Next Review:** After next upstream merge

