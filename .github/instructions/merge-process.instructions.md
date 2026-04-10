```instructions
---
description: "Reference context for Paychex LibreChat upstream merge process. Use when resolving merge conflicts or verifying customizations."
applyTo: "docs/merge-process/*.md"
---

# Paychex LibreChat Merge Process Context

This file provides canonical reference data for merging upstream LibreChat releases while preserving Paychex customizations.

## Critical Paychex Customizations

These customizations MUST be preserved during upstream merges. Verify after every merge using `scripts/verify-paychex-customizations.sh`.

| Customization | File | Pattern/Method | Why Critical |
|---------------|------|----------------|--------------|
| Tool Call Filtering | `api/app/clients/BaseClient.js` | `filterCrossProviderToolCalls` | Prevents Gemini "Proto field is not repeating" errors - app crashes without this |
| Schema Sanitization | `api/server/services/start/tools.js` | `sanitizeSchemaMetadata` | Removes incompatible OpenAPI schema fields for Gemini - tool calls fail without this |
| Gemini Endpoint Detection | `api/server/services/MCP.js` | `providerLower.includes('gemini') \|\| providerLower.includes('google')` | Enables custom Gemini endpoint support - appears in 2 locations |
| Pendo Analytics | `client/src/components/Chat/Menus/Endpoints/ModelSelector.tsx` | `<span id="agentUsers" />` | Business metrics tracking (non-breaking) |
| Menu Descriptions | `packages/client/src/components/DropdownPopup.tsx` | `item.description`, `items-start`, CSS transitions | UX enhancement (non-breaking) |
| Declarative Tools UI | `client/src/components/Chat/Input/ToolsDropdown.tsx` | `label:`, `description:`, `icon:` properties | Code organization (non-breaking) |
| Dockerfile Error Handling | `Dockerfile` | `&&` operators (not `;`) | Prevents masked build failures - critical for CI/CD |
| xlsx Package | `api/package.json`, `packages/api/package.json` | `"xlsx": "^0.18.5"` (npm registry, not CDN) | CDN returns 403 errors - builds fail without this |

## Merge Conflict Decision Matrix

Apply this matrix when resolving each conflict:

```
┌─────────────────────────────────────────────────────────────────┐
│ Is this file in the Critical Customizations table above?        │
└─────────────────────────────────────────────────────────────────┘
                     ↓ YES                    ↓ NO
        ┌────────────────────────┐    ┌──────────────────┐
        │ Run: git log develop   │    │ Check git history│
        │      -- <file>         │    │ for Paychex mods │
        └────────────────────────┘    └──────────────────┘
                     ↓                          ↓
        ┌────────────────────────┐    ┌──────────────────┐
        │ Merge MANUALLY         │    │ Paychex changes? │
        │ Preserve Paychex logic │    └──────────────────┘
        │ with upstream updates  │         ↓ YES    ↓ NO
        └────────────────────────┘         │        │
                     ↓                     │        │
        ┌────────────────────────┐    ┌───▼────┐ ┌─▼────────┐
        │ VERIFY after resolution│    │Manual  │ │Accept    │
        │ Pattern still present  │    │merge   │ │upstream  │
        └────────────────────────┘    └────────┘ └──────────┘
```

## File Risk Categories

### 🔴 Critical Priority (Never auto-accept upstream)
- `api/app/clients/BaseClient.js`
- `api/server/services/start/tools.js`
- `api/server/services/MCP.js`
- `Dockerfile`
- `api/package.json`
- `packages/api/package.json`

**Action:** Always check git history, manually merge, verify pattern preserved

### 🟡 Medium Priority (Review before accepting)
- `client/src/components/**/*.tsx`
- `packages/client/src/components/*.tsx`
- `api/server/middleware/*.js`
- `client/src/hooks/**/*.ts`
- `librechat.*.yml`
- `az_container_app_definitions/*.yml`

**Action:** Check for Paychex customizations, manual merge if found

### 🟢 Low Priority (Usually safe to accept upstream)
- `*.md` (documentation)
- `**/*.test.js`, `**/*.test.ts`
- `.github/workflows/*.yml` (unless Paychex-specific)
- `package-lock.json`, `npm-shrinkwrap.json`
- Build configs (except Dockerfile)

**Action:** Accept upstream unless user has specific reason

## Common Merge Scenarios

### Scenario 1: File Deleted by Upstream, Modified by Paychex

**Symptoms:**
```bash
git status shows: DU <file>  # Deleted by upstream, modified by us
```

**Resolution:**
1. Check if file was moved/refactored: `git log upstream/main -- <file>`
2. If moved: Find new location, preserve Paychex customizations there
3. If deleted: Verify functionality exists elsewhere or restore if critical
4. Update all import statements

**Common example (v0.8.4 merge):**
- `api/app/clients/OpenAIClient.js` → moved to `@librechat/agents` package
- `api/server/services/Endpoints/custom/initialize.js` → moved to `packages/api/src/endpoints/custom/initialize.ts`
- **Action:** Update `api/server/services/Endpoints/index.js` to import from `@librechat/api`

### Scenario 2: Paychex Modified, Upstream Refactored

**Symptoms:**
```bash
git status shows: UU <file>  # Modified by both
Large structural changes in upstream version
```

**Resolution:**
1. Identify Paychex customization purpose: `git log -p develop -- <file>`
2. Read upstream changes: `git show upstream/main:<file>`
3. Apply Paychex logic to upstream's new structure
4. Test thoroughly - refactors often break assumptions

### Scenario 3: Broken Import Paths

**Symptoms:**
```
Build fails with: Cannot find module '../custom/initialize'
```

**Resolution:**
1. Find new location: `git log --all --oneline -- '**/initialize.*'`
2. Update imports to use package exports: `require('@librechat/api')`
3. Check `packages/api/src/index.ts` for available exports
4. Rebuild and verify

### Scenario 4: Duplicate Definitions

**Symptoms:**
```
TypeScript error: Duplicate identifier 'FunctionName'
Merge conflict in type definitions
```

**Resolution:**
1. Check `packages/data-provider/src/types/` for existing types
2. Use existing type, extend if needed
3. Remove duplicate definition
4. Import from canonical location

## Git Archaeology Commands

Use these to understand conflict origins:

```bash
# See all Paychex changes to a file
git log develop --oneline -- <file>

# See detailed Paychex changes
git log -p develop --not upstream/main -- <file>

# Compare three-way
git diff $(git merge-base develop upstream/main)..develop -- <file>    # What Paychex added
git diff $(git merge-base develop upstream/main)..upstream/main -- <file>  # What upstream added

# Find when something was added
git log -S 'searchTerm' --all -- <file>

# See if code exists in upstream v0.8.4
git log upstream/main -- <file>   # If empty, it's Paychex-only

# Compare with last merge base
MERGE_BASE=$(git merge-base develop upstream/main)
git diff $MERGE_BASE..develop -- <file>
```

## Verification Commands

Run after each major resolution step:

```bash
# Verify all critical customizations
./scripts/verify-paychex-customizations.sh

# Check specific pattern
grep -n "filterCrossProviderToolCalls" api/app/clients/BaseClient.js
grep -n "sanitizeSchemaMetadata" api/server/services/start/tools.js
grep -n "providerLower.includes('gemini')" api/server/services/MCP.js

# Check for broken imports
grep -r "require('.*OpenAIClient')" api/ | grep -v node_modules
grep -r "require('.*custom/initialize')" api/server/services/Endpoints/

# Verify xlsx package
grep '"xlsx"' api/package.json packages/api/package.json
# Should NOT contain: cdn.sheetjs.com
# Should contain: "^0.18.5"

# Check Dockerfile error handling
grep -A1 "npm run frontend" Dockerfile | grep "&&"
# Should use && (not ;)
```

## Post-Merge Validation

Before considering merge complete:

1. ✅ **Verification script:** `./scripts/verify-paychex-customizations.sh` → 100% critical passing
2. ✅ **Build:** `npm run build` → No errors
3. ✅ **Tests:** `npm test` → 93%+ passing
4. ✅ **No TypeScript errors:** `npx tsc --noEmit`
5. ✅ **No ESLint errors:** `npm run lint`
6. ✅ **Git status clean:** All conflicts resolved, no untracked critical files

## Known Upstream Refactoring Patterns (v0.8.1 → v0.8.4)

| Upstream Pattern | Impact | Resolution |
|------------------|--------|------------|
| Moving endpoint initializers to `packages/api/` | Import paths break | Update to `require('@librechat/api')` |
| Refactoring OpenAIClient to `@librechat/agents` | References break | Use new package exports |
| Consolidating tool definitions | Paychex sanitization may be lost | Manually re-apply in new location |
| TypeScript migration | Type conflicts | Use types from `packages/data-provider` |
| Component prop changes | Paychex custom props may break | Adapt to new prop structure |

## Troubleshooting Quick Reference

| Problem | Quick Fix |
|---------|-----------|
| Verification fails on critical check | `git log develop -- <file>` → identify what was lost → restore from develop |
| Build fails on import | Search for new location: `find . -name "*ModuleName*" -not -path "*/node_modules/*"` |
| Test failure (MongoDB) | Acceptable if RHEL 9.0 memory server download issue (not merge-related) |
| xlsx 403 error | Change to `"xlsx": "^0.18.5"` in package.json files |
| Dockerfile build masks errors | Change `;` to `&&` in command chains |
| TypeScript duplicate identifier | Check `packages/data-provider/src/types/` for existing definition |

## Reference Documentation Paths

- Complete guide: `docs/merge-process/UPSTREAM_MERGE_GUIDE.md`
- Checklist: `docs/merge-process/MERGE_CHECKLIST.md`
- AI prompts: `docs/merge-process/AI_MERGE_PROMPT.md`
- Quick reference: `docs/merge-process/QUICK_UPDATE_PROMPT.md`
- Verification update: `docs/merge-process/UPDATE_VERIFICATION_PROMPT.md`

```
