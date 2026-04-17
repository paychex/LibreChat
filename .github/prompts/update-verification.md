# Update Verification Script Prompt

**Usage:** Fill in customization details, then paste to your AI assistant to update `scripts/verify-paychex-customizations.sh`.

---

## Copy-Paste Ready Prompt

```
I need to update scripts/verify-paychex-customizations.sh to verify new Paychex customizations.

**Repository:** LibreChat (Paychex fork)
**Script:** scripts/verify-paychex-customizations.sh
**Documentation:** docs/merge-process/UPDATE_VERIFICATION_PROMPT.md

**New Customizations to Add:**

[For each customization, fill in these details:]

1. **Customization Name:** [Brief descriptive name]
   - **File:** [Full path from repo root, e.g., api/server/services/Feature.js]
   - **Pattern:** [Unique string to search for, e.g., "paychexFeatureConfig"]
   - **Description:** [What this customization does in one sentence]
   - **Criticality:** [critical OR warning]
   - **Context:** [What breaks if this customization is lost]

2. **Customization Name:** [...]
   - **File:** [...]
   - **Pattern:** [...]
   - **Description:** [...]
   - **Criticality:** [...]
   - **Context:** [...]

[Add more as needed...]

**Requirements:**
- Add new checks maintaining existing script structure
- Use clear section numbering (continue from existing sections)
- Include descriptive echo statements for readability
- Patterns must be unique and not match unrelated code
- Follow same format as existing check_pattern() calls

**Deliverable:**
Update scripts/verify-paychex-customizations.sh with new check_pattern() calls for the customizations above.
```

---

## Before Updating

### Step 1: Scan for New Customizations

```bash
./scripts/scan-paychex-customizations.sh 30
```

This generates a report showing new Paychex code from the last 30 days.

### Step 2: Review and Categorize

For each customization found:
1. Read the code to understand what it does
2. Check git history: `git log -p -- <file>`
3. Assess impact: What breaks if lost?
4. Categorize: **critical** (breaking) or **warning** (non-breaking)

### Step 3: Find Good Patterns

**Good patterns** (unique, stable):
- Function names: `filterCrossProviderToolCalls`
- Variable names: `paychexRateLimitConfig`
- HTML IDs: `id="agentUsers"`
- Config keys: `PAYCHEX_ENDPOINT`

**Bad patterns** (too generic):
- Common words: `config`, `user`, `data`
- Framework syntax: `useState`, `require`
- Generic CSS: `flex`, `grid`

---

## After AI Updates Script

### Test the Updated Script

```bash
# Run verification
./scripts/verify-paychex-customizations.sh

# All new checks should PASS
# If any FAIL, the pattern needs refinement
```

### Commit the Update

```bash
git add scripts/verify-paychex-customizations.sh
git commit -m "test: Add verification for [feature name]

Verify [customization] in [file]:
- Pattern: [search pattern]
- Criticality: [critical/warning]
- Ensures [what this prevents losing]"
```

---

## Example (Filled)

Here's a complete example with actual data:

```
I need to update scripts/verify-paychex-customizations.sh to verify new Paychex customizations.

**Repository:** LibreChat (Paychex fork)
**Script:** scripts/verify-paychex-customizations.sh

**New Customizations to Add:**

1. **Customization Name:** Paychex Rate Limiting
   - **File:** api/server/middleware/rateLimit.js
   - **Pattern:** paychexRateLimitConfig
   - **Description:** Custom rate limit configuration for Paychex API endpoints
   - **Criticality:** critical
   - **Context:** Without this, API uses default upstream limits which are too permissive for Paychex security requirements, could lead to DOS

2. **Customization Name:** Custom Model Badge
   - **File:** client/src/components/ModelBadge.tsx
   - **Pattern:** paychexModelBadge
   - **Description:** Custom styling for model badges in UI
   - **Criticality:** warning
   - **Context:** Visual branding only, app functions without it

**Requirements:**
- Add new checks maintaining existing script structure
- Use clear section numbering (continue from existing sections)
- Include descriptive echo statements for readability
- Patterns must be unique and not match unrelated code
- Follow same format as existing check_pattern() calls

**Deliverable:**
Update scripts/verify-paychex-customizations.sh with new check_pattern() calls for the customizations above.
```

---

## Quick Commands

```bash
# Find a specific customization
grep -rn "functionName" api/ client/ packages/

# Check when something was added
git log -p --all -S 'searchTerm' -- path/to/file

# Test pattern manually
grep -q "pattern" "file" && echo "✓ FOUND" || echo "✗ NOT FOUND"
```

---

## More Help

For detailed maintenance process, see:
- Full guide: `docs/merge-process/UPDATE_VERIFICATION_PROMPT.md`
- Quick reference: `docs/merge-process/QUICK_UPDATE_PROMPT.md`
