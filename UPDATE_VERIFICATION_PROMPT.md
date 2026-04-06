# Updating Paychex Verification Script

## Overview

As Paychex customizations evolve, the `verify-paychex-customizations.sh` script must be updated to check for new customizations. This document provides a reusable process and AI prompt template for keeping the verification script current.

---

## When to Update the Verification Script

Update the verification script when:

1. **Adding new Paychex customizations** that differ from upstream LibreChat
2. **Modifying existing customizations** in a way that changes the verification pattern
3. **After each sprint/release** to capture new business logic
4. **Before major upstream merges** to ensure the baseline is accurate
5. **When onboarding new critical features** (analytics, endpoints, authentication, UI components)

---

## Identifying New Customizations

### Method 1: Git Diff Against Upstream

```bash
# Compare develop branch with upstream main
git fetch upstream
git diff upstream/main...develop

# Look for files with substantial Paychex-specific logic
git diff --name-only upstream/main...develop | grep -E '\.(js|ts|tsx)$'
```

### Method 2: Git Log Review

```bash
# Review recent Paychex commits
git log --oneline --since="1 month ago" develop --not upstream/main

# Review commits by category
git log --grep="feat:" --grep="fix:" --grep="custom:" --oneline develop
```

### Method 3: Code Comment Tags

Search for Paychex-specific comment tags:

```bash
# Find Paychex customization markers
grep -r "PAYCHEX:" --include="*.js" --include="*.ts" --include="*.tsx" .
grep -r "@paychex" --include="*.js" --include="*.ts" --include="*.tsx" .
grep -r "Paychex-specific" --include="*.js" --include="*.ts" --include="*.tsx" .
```

### Method 4: Critical File Analysis

Focus on files that commonly contain business logic customizations:

```bash
# Backend customizations
find api/server/services -type f -name "*.js" -exec git log -1 --format="%h %ai %s" -- {} \;
find packages/api/src -type f -name "*.ts" -exec git log -1 --format="%h %ai %s" -- {} \;

# Frontend customizations
find client/src/components -type f -name "*.tsx" -exec git log -1 --format="%h %ai %s" -- {} \;
find packages/client/src -type f -name "*.tsx" -exec git log -1 --format="%h %ai %s" -- {} \;
```

---

## Categorizing Customizations

When you identify a customization, categorize it by **criticality**:

### Critical (Must Verify)

Business-critical customizations that if lost would cause:
- Application crashes or errors
- Security/compliance violations
- Loss of essential Paychex functionality
- Data corruption or loss
- Critical third-party integrations breaking (Pendo, auth providers)

**Examples:**
- Authentication/authorization logic
- Data sanitization/validation
- Error handling that prevents crashes
- Service integrations (Pendo, OpenID)
- Custom endpoint configurations

### Warning (Should Verify)

Important but non-breaking customizations:
- UI/UX enhancements
- Analytics tracking
- Performance optimizations
- User preference features
- Non-critical styling

**Examples:**
- Pendo analytics elements
- Menu descriptions
- CSS transitions
- Tooltip enhancements

---

## AI Update Prompt Template

Use this prompt when you need to update the verification script:

```
I need to update the Paychex customization verification script to include new customizations added since the last update.

**Context:**
- Repository: LibreChat (Paychex fork)
- Script: verify-paychex-customizations.sh
- Purpose: Verify critical Paychex customizations are present in the codebase

**New Customizations to Add:**

[List each customization with the following details:]

1. **Customization Name:** [Brief name]
   - **File:** [Absolute path from repo root]
   - **Pattern:** [Unique string/regex that proves the customization exists]
   - **Description:** [What this customization does]
   - **Criticality:** [critical | warning]
   - **Context:** [Why this matters / what breaks if missing]

2. **Customization Name:** [...]
   - **File:** [...]
   - **Pattern:** [...]
   - **Description:** [...]
   - **Criticality:** [...]
   - **Context:** [...]

[Add more as needed]

**Current Verification Script Structure:**

The script uses a `check_pattern()` function that:
- Takes: file path, pattern, description, criticality
- Returns: 0 (pass) or 1 (fail/warn)
- Increments: PASS_COUNT, WARN_COUNT, or FAIL_COUNT

**Requirements:**

1. Add new verification checks maintaining the existing script structure
2. Use clear section numbers (e.g., "11. New Feature Name")
3. Include descriptive echo statements for each verification group
4. For multi-check features, verify multiple related patterns
5. Maintain consistent formatting and indentation
6. Add inline comments explaining complex patterns
7. Update the summary section if needed

**Deliverables:**

1. Updated verify-paychex-customizations.sh with new checks
2. Brief explanation of what was added
3. Verification that new checks follow existing patterns

Please update the script accordingly.
```

---

## Detailed Update Process

### Step 1: Identify New Customizations (15 minutes)

Run these commands to generate a report:

```bash
# Create a temporary report file
REPORT_FILE="/tmp/paychex_customizations_$(date +%Y%m%d).md"

echo "# Paychex Customizations Report - $(date +%Y-%m-%d)" > "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# Recent commits on develop not in upstream
echo "## Recent Paychex Commits" >> "$REPORT_FILE"
git log --oneline --since="1 month ago" develop --not upstream/main >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# Files changed
echo "## Files Modified (vs upstream/main)" >> "$REPORT_FILE"
git diff --name-only upstream/main...develop | head -50 >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# Paychex markers
echo "## Code Markers" >> "$REPORT_FILE"
grep -rn "PAYCHEX:" --include="*.js" --include="*.ts" --include="*.tsx" api/ client/ packages/ 2>/dev/null >> "$REPORT_FILE"

cat "$REPORT_FILE"
```

### Step 2: Review and Categorize (10 minutes)

For each customization found:

1. **Read the code** - Understand what it does
2. **Check git blame** - See when and why it was added
3. **Assess impact** - What breaks if this is lost?
4. **Categorize** - Critical or Warning?

```bash
# Example: Check when filterCrossProviderToolCalls was added
git log -p --all -S 'filterCrossProviderToolCalls' -- api/app/clients/BaseClient.js
```

### Step 3: Create Update Request (5 minutes)

Fill out the AI prompt template with:
- File paths (absolute from repo root)
- Unique search patterns (strings that won't match elsewhere)
- Criticality levels
- Context about what breaks

### Step 4: Update Script (AI-assisted, 10 minutes)

Provide the completed prompt to an AI assistant, which will:
1. Add new `check_pattern()` calls
2. Group related checks by feature
3. Maintain numbering sequence
4. Update summary logic if needed

### Step 5: Test the Updated Script (5 minutes)

```bash
# Make executable if needed
chmod +x verify-paychex-customizations.sh

# Run verification
./verify-paychex-customizations.sh

# Expected output: All new checks should PASS
# If any FAIL, the pattern needs refinement
```

### Step 6: Commit the Update (5 minutes)

```bash
git add verify-paychex-customizations.sh
git commit -m "test: Update verification script with [feature] checks

Add verification for:
- [Customization 1]: [file] - [what it checks]
- [Customization 2]: [file] - [what it checks]

Ensures [feature] customizations preserved in future merges."
```

---

## Example: Adding a New Customization

Let's say you added custom rate limiting logic. Here's how to update the verification:

### Identify the Customization

```bash
# Found in: api/server/middleware/rateLimit.js
# Pattern: 'paychexRateLimitConfig'
# Purpose: Custom rate limits for Paychex API endpoints
# Criticality: Critical (prevents abuse, required for production)
```

### Update Prompt (Filled)

```
I need to update verify-paychex-customizations.sh to verify new rate limiting customization.

**New Customization:**

1. **Customization Name:** Paychex Rate Limiting
   - **File:** api/server/middleware/rateLimit.js
   - **Pattern:** paychexRateLimitConfig
   - **Description:** Custom rate limit configuration for Paychex API endpoints
   - **Criticality:** critical
   - **Context:** Without this, API endpoints use default upstream limits which are too permissive for Paychex security requirements. Could lead to abuse/DOS.

Please add this check as section 11 in the verification script.
```

### Expected Script Addition

```bash
# 11. Rate Limiting Configuration
echo "11. Rate Limiting Configuration"
check_pattern \
    "api/server/middleware/rateLimit.js" \
    "paychexRateLimitConfig" \
    "Paychex-specific rate limit configuration" \
    "critical"

echo ""
```

---

## Patterns for Common Customization Types

### Backend Service Customization

```bash
check_pattern \
    "api/server/services/[ServiceName].js" \
    "uniqueMethodOrVariable" \
    "Description of what this does" \
    "critical"
```

### Frontend Component Customization

```bash
check_pattern \
    "client/src/components/[Feature]/[Component].tsx" \
    "id=\"paychex-element\"" \
    "Description" \
    "warning"
```

### Configuration Customization

```bash
check_pattern \
    "api/config/[feature].js" \
    "PAYCHEX_CONFIG" \
    "Description" \
    "critical"
```

### Authentication/Security Customization

```bash
check_pattern \
    "api/strategies/[authStrategy].js" \
    "paychexAuthLogic" \
    "Description" \
    "critical"
```

### Middleware Customization

```bash
check_pattern \
    "api/server/middleware/[middleware].js" \
    "paychexMiddlewareLogic" \
    "Description" \
    "critical"
```

---

## Maintenance Schedule

Establish a regular update cadence:

| Frequency | Trigger | Action |
|-----------|---------|--------|
| **Weekly** | During sprint planning | Quick review: Any new customizations this sprint? |
| **Bi-weekly** | Sprint close | Run identification commands, update if needed |
| **Monthly** | Release preparation | Full audit of customizations vs verification script |
| **Pre-merge** | Before upstream merge | Complete verification script audit and update |
| **Post-merge** | After upstream merge | Verify script still catches all customizations |

---

## Verification Script Maintenance Checklist

Use this checklist during each update:

```
□ Run git diff/log commands to identify new customizations
□ Review each customization for criticality
□ Document new customizations with:
  □ File path
  □ Unique pattern
  □ Description
  □ Criticality level
  □ Context/impact
□ Fill out AI update prompt template
□ Review AI-generated script updates
□ Test updated script (should pass 100% critical checks)
□ Commit with descriptive message
□ Update UPSTREAM_MERGE_GUIDE.md if new critical customizations added
□ Notify team of new verification requirements
```

---

## Quick Reference Commands

### Scan for New Customizations
```bash
# Find commits not in upstream
git log --oneline develop --not upstream/main --since="2 weeks ago"

# Find modified core files
git diff --name-only upstream/main...develop | grep -E '(api/server|client/src)'

# Search for Paychex markers
grep -r "PAYCHEX\|@paychex\|Paychex-specific" --include="*.{js,ts,tsx}" api/ client/ packages/
```

### Test Verification Script
```bash
# Run and check exit code
./verify-paychex-customizations.sh
echo "Exit code: $?"

# Run with verbose output
bash -x ./verify-paychex-customizations.sh 2>&1 | less

# Check specific section
./verify-paychex-customizations.sh | grep -A5 "Section Name"
```

### Update and Commit
```bash
# Stage and commit
git add verify-paychex-customizations.sh
git commit -m "test: Add verification for [feature]"

# Verify commit
git show HEAD --stat
```

---

## Troubleshooting

### Pattern Not Matching

**Problem:** `check_pattern()` returns FAIL even though code exists

**Solutions:**
1. Check for typos in the pattern string
2. Verify file path is absolute from repo root
3. Check for special regex characters that need escaping
4. Use simpler, more unique pattern
5. Test pattern manually:
   ```bash
   grep -q "your_pattern" path/to/file && echo "FOUND" || echo "NOT FOUND"
   ```

### Too Many False Positives

**Problem:** Pattern matches unrelated code

**Solutions:**
1. Make pattern more specific
2. Add surrounding context to pattern
3. Use multiple checks for the same feature
4. Add file path specificity

### Script Exit Code Issues

**Problem:** Script exits early with code 1

**Solutions:**
1. Check for `set -e` in script - may need to remove for non-critical checks
2. Ensure all arithmetic uses `((expression))` or `expr` correctly
3. Verify all `grep` commands have proper null checks
4. Test individual functions in isolation

---

## Best Practices

1. **Keep patterns simple** - Use unique strings that won't change
2. **Co-locate checks** - Group related customizations in same section
3. **Document context** - Add comments explaining why verification matters
4. **Test immediately** - Run script after every update
5. **Version control** - Commit verification updates with feature commits
6. **Code markers** - Add `// PAYCHEX:` comments to help future identification
7. **Regular audits** - Monthly review of script vs actual customizations
8. **Team communication** - Share verification updates in standup/slack

---

## Integration with Development Workflow

### For Developers Adding Customizations

When adding new Paychex-specific code:

1. **Tag your code** with comments:
   ```javascript
   // PAYCHEX: Custom rate limiting for enterprise endpoints
   const paychexRateLimitConfig = { ... };
   ```

2. **Document in PR description**:
   ```markdown
   ## Paychex Customization
   - Added: Custom rate limiting
   - File: api/server/middleware/rateLimit.js
   - Needs verification: Yes
   ```

3. **Update verification script** or create ticket

### For Code Reviewers

During PR review, ask:
- Is this Paychex-specific logic?
- Should it be verified in merge safety script?
- Is it tagged with comments for future identification?

### For Release Managers

Before each release:
1. Run full verification script
2. Review any new customizations since last release
3. Update script if needed
4. Document customizations in release notes

---

## Contact & Questions

If you have questions about:
- **What to verify:** Review the "Critical vs Warning" section
- **How to write patterns:** See "Patterns for Common Customization Types"
- **Script not working:** Check "Troubleshooting" section
- **Process unclear:** Review "Detailed Update Process"

For script improvements or suggestions, update this document and submit a PR.

---

**Last Updated:** April 6, 2026  
**Script Version:** 1.0  
**Maintainer:** DevOps Team
