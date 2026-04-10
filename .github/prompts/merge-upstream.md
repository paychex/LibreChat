# Upstream Merge Prompt Template

**Usage:** Fill in the variables, then paste to GitHub Copilot or your AI assistant.

---

## Copy-Paste Ready Prompt

```
I need to merge LibreChat upstream version [TARGET_VERSION] into Paychex develop branch.

**Context:**
- Current version: [CURRENT_VERSION] 
- Target version: [TARGET_VERSION]
- Merge branch: feature/merge-upstream-[TARGET_VERSION]
- Repository: Paychex LibreChat fork
- Documentation: docs/merge-process/UPSTREAM_MERGE_GUIDE.md

**Critical Paychex Customizations to Preserve:**

1. **Tool Call Filtering** (api/app/clients/BaseClient.js)
   - Method: `filterCrossProviderToolCalls`
   - Prevents Gemini "Proto field is not repeating" errors

2. **Schema Sanitization** (api/server/services/start/tools.js)
   - Import and usage of `sanitizeSchemaMetadata`
   - Required for Gemini tool compatibility

3. **Gemini Endpoint Detection** (api/server/services/MCP.js)
   - Pattern: `providerLower.includes('gemini') || providerLower.includes('google')`
   - Appears in 2 locations

4. **Pendo Analytics** (client/src/components/Chat/Menus/Endpoints/ModelSelector.tsx)
   - Element: `<span id="agentUsers" />`

5. **Menu Descriptions** (packages/client/src/components/DropdownPopup.tsx)
   - `item.description` rendering
   - `items-start` alignment
   - CSS transitions

6. **Dockerfile Error Handling** (Dockerfile)
   - `&&` operators (not `;`)

7. **xlsx Package** (api/package.json, packages/api/package.json)
   - Must use: `"xlsx": "^0.18.5"` (npm registry, not CDN)

**Requirements:**

✅ **Must Do:**
- Check git history before resolving conflicts: `git log develop -- <file>`
- Use Decision Matrix from docs/merge-process/UPSTREAM_MERGE_GUIDE.md
- Preserve ALL customizations listed above
- Verify after resolution: `./scripts/verify-paychex-customizations.sh`
- Build and test before committing
- Ask clarifying questions when uncertain

❌ **Must Not:**
- Blindly accept upstream changes
- Remove Paychex customizations
- Skip verification steps
- Commit without building and testing

**Please:**
1. Analyze the merge conflicts
2. Categorize by risk level (critical/medium/low)
3. Guide me through resolving each conflict systematically
4. Ask for confirmation before major decisions
5. Verify all customizations are preserved
6. Help create comprehensive commit message

Ready to start?
```

---

## Variables to Fill In

Before pasting, replace these placeholders:

- `[TARGET_VERSION]` - Upstream version to merge (e.g., v0.8.5)
- `[CURRENT_VERSION]` - Current Paychex version base (e.g., v0.8.4)

---

## Alternative: Invoke Merge Agent

If using GitHub Copilot Workspace with the merge agent:

```
@upstream-merge v0.8.5
```

The agent will automatically guide you through the entire process.

---

## After Merge Completes

Run these verification steps:

```bash
# Verify customizations
./scripts/verify-paychex-customizations.sh

# Build
npm run build

# Test
npm test

# Check for issues
git status
```

All checks must pass before pushing to origin.
