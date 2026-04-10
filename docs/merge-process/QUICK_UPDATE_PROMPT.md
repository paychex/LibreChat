# 🚀 Quick Update Prompt (Copy-Paste Ready)

When you need to update `verify-paychex-customizations.sh` with new customizations, follow these 3 steps:

---

## Step 1: Scan for New Customizations (30 seconds)

```bash
../../scripts/scan-paychex-customizations.sh 30
```

This generates a report identifying new Paychex customizations from the last 30 days.

---

## Step 2: Copy This Prompt Template

Send this to your AI assistant (GitHub Copilot, ChatGPT, Claude, etc.):

```
I need to update verify-paychex-customizations.sh to include new Paychex customizations.

**Repository:** LibreChat (Paychex fork)
**Current Script:** verify-paychex-customizations.sh
**Documentation:** See UPDATE_VERIFICATION_PROMPT.md for full context

**New Customizations to Add:**

[For each new customization, fill in:]

1. **Customization Name:** [Brief descriptive name]
   - **File:** [Full path from repo root, e.g., api/server/services/Auth.js]
   - **Pattern:** [Unique string to search for, e.g., "paychexAuthConfig"]
   - **Description:** [What this customization does in 1 sentence]
   - **Criticality:** [critical OR warning]
   - **Context:** [What breaks if this is lost]

[Repeat for each customization...]

**Requirements:**
- Add new checks maintaining existing script structure
- Use clear section numbering (continue from existing sections)
- Test patterns are unique and won't match unrelated code
- Include descriptive echo statements for readability
- Follow same format as existing checks

**Deliverable:**
Update verify-paychex-customizations.sh with new check_pattern() calls for the above customizations.
```

---

## Step 3: Test & Commit (2 minutes)

After AI updates the script:

```bash
# Test the updated script
../../scripts/verify-paychex-customizations.sh

# If all checks pass, commit
git add verify-paychex-customizations.sh
git commit -m "test: Add verification for [feature name]

Verify [customization] in [file]:
- Pattern: [search pattern]
- Criticality: [critical/warning]
- Ensures [what this prevents losing]"
```

---

## 📋 Example (Filled)

Here's a complete example of the prompt with actual data:

```
I need to update verify-paychex-customizations.sh to include new Paychex customizations.

**Repository:** LibreChat (Paychex fork)
**Current Script:** verify-paychex-customizations.sh
**Documentation:** See UPDATE_VERIFICATION_PROMPT.md for full context

**New Customizations to Add:**

1. **Customization Name:** Paychex SSO Configuration
   - **File:** api/server/middleware/sso.js
   - **Pattern:** paychexSSOConfig
   - **Description:** Custom SSO integration for Paychex employee authentication
   - **Criticality:** critical
   - **Context:** Without this, Paychex employees cannot log in via SSO, blocking all access

2. **Customization Name:** Custom Analytics Tracking
   - **File:** client/src/utils/analytics.js
   - **Pattern:** trackPaychexEvent
   - **Description:** Custom analytics event tracking for business metrics
   - **Criticality:** warning
   - **Context:** Loss of business intelligence data, but app still functions

**Requirements:**
- Add new checks maintaining existing script structure
- Use clear section numbering (continue from existing sections)
- Test patterns are unique and won't match unrelated code
- Include descriptive echo statements for readability
- Follow same format as existing checks

**Deliverable:**
Update verify-paychex-customizations.sh with new check_pattern() calls for the above customizations.
```

---

## 💡 Tips for Finding Patterns

**Good Patterns** (unique, stable):
- Function names: `filterCrossProviderToolCalls`
- Variable names: `paychexRateLimitConfig`
- HTML IDs: `id="agentUsers"`
- Config keys: `PAYCHEX_ENDPOINT`
- Comments: `// PAYCHEX: custom logic`

**Bad Patterns** (too generic, unstable):
- Common words: `config`, `user`, `data`
- Generic values: `true`, `false`, `null`
- Common CSS: `flex`, `grid`, `container`
- Framework syntax: `useState`, `useEffect`, `require`

---

## 🔍 Quick Commands Reference

```bash
# Find a specific customization
grep -rn "functionName" api/ client/ packages/

# Check when something was added
git log -p --all -S 'searchTerm' -- path/to/file

# See if pattern exists in file
grep "pattern" path/to/file && echo "FOUND" || echo "NOT FOUND"

# Test single check manually
if grep -q "pattern" "file"; then echo "✓ PASS"; else echo "✗ FAIL"; fi
```

---

## 📅 Recommended Update Schedule

| Frequency | When | Command |
|-----------|------|---------|
| **Bi-weekly** | Sprint close | `../../scripts/scan-paychex-customizations.sh 14` |
| **Monthly** | Before release | `../../scripts/scan-paychex-customizations.sh 30` |
| **Pre-merge** | Before upstream merge | `../../scripts/scan-paychex-customizations.sh 90` |
| **Ad-hoc** | After major feature | `../../scripts/scan-paychex-customizations.sh 7` |

---

## 🆘 Troubleshooting

**Problem:** Pattern not found even though code exists

```bash
# Verify file path is correct (absolute from repo root)
ls -la path/to/file

# Test pattern manually
grep "your_pattern" path/to/file

# Check for special characters needing escaping
grep -F "exact_string" path/to/file  # -F = treat as literal string
```

**Problem:** Too many matches (false positives)

Make pattern more specific:
- Add surrounding context
- Use more unique strings
- Check for file-specific patterns

**Problem:** Script exits with code 1 unexpectedly

Check arithmetic operations use proper syntax:
```bash
# Wrong: ((FAIL_COUNT++))
# Right: FAIL_COUNT=$((FAIL_COUNT + 1))
```

---

## 📚 Full Documentation

For complete details, see:
- **[UPDATE_VERIFICATION_PROMPT.md](UPDATE_VERIFICATION_PROMPT.md)** - Full maintenance guide
- **[UPSTREAM_MERGE_GUIDE.md](UPSTREAM_MERGE_GUIDE.md)** - Merge process documentation
- **[MERGE_CHECKLIST.md](MERGE_CHECKLIST.md)** - Printable checklist

---

**Last Updated:** April 6, 2026  
**Quick Start Time:** ~3 minutes total  
**Maintenance Window:** Bi-weekly recommended
