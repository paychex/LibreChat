# Upstream Merge Process Documentation

This directory contains all documentation and workflows for merging upstream LibreChat releases into the Paychex fork while preserving Paychex customizations.

---

## 📚 Documentation Index

### Quick Start
- **[QUICK_UPDATE_PROMPT.md](QUICK_UPDATE_PROMPT.md)** - Copy-paste ready prompts for common tasks (⭐ start here)
- **[MERGE_CHECKLIST.md](MERGE_CHECKLIST.md)** - Printable checklist for tracking merge progress

### Comprehensive Guides
- **[UPSTREAM_MERGE_GUIDE.md](UPSTREAM_MERGE_GUIDE.md)** - Complete merge process documentation (8-phase workflow)
- **[UPDATE_VERIFICATION_PROMPT.md](UPDATE_VERIFICATION_PROMPT.md)** - How to keep verification script up-to-date

### AI Assistant Prompts
- **[AI_MERGE_PROMPT.md](AI_MERGE_PROMPT.md)** - Full prompt template for AI-assisted merges

---

## 🚀 Quick Links

### For Merging Upstream Changes

**3-Step Process:**
1. Read [UPSTREAM_MERGE_GUIDE.md](UPSTREAM_MERGE_GUIDE.md) for complete workflow
2. Use [MERGE_CHECKLIST.md](MERGE_CHECKLIST.md) to track progress
3. Run verification: `../../scripts/verify-paychex-customizations.sh`

**AI-Assisted Merge:**
1. Copy prompt from [AI_MERGE_PROMPT.md](AI_MERGE_PROMPT.md)
2. Fill in version numbers
3. Give to GitHub Copilot or other AI assistant

### For Updating Verification Script

**When you add new Paychex customizations:**
1. Scan for changes: `../../scripts/scan-paychex-customizations.sh 30`
2. Use prompt template in [QUICK_UPDATE_PROMPT.md](QUICK_UPDATE_PROMPT.md)
3. Test updated script: `../../scripts/verify-paychex-customizations.sh`

---

## 🔧 Available Tools

All automation scripts are located in `../../scripts/`:

| Script | Purpose | Usage |
|--------|---------|-------|
| `verify-paychex-customizations.sh` | Verify all critical Paychex customizations are present | `../../scripts/verify-paychex-customizations.sh` |
| `scan-paychex-customizations.sh` | Scan for new customizations to add to verification | `../../scripts/scan-paychex-customizations.sh [days]` |

---

## 🎯 GitHub Copilot Integration

This documentation is integrated with GitHub Copilot Workspace:

- **Workspace Instructions:** `../../.github/copilot-instructions.md` - Copilot automatically knows about Paychex customizations
- **Merge Agent:** `../../.github/agents/upstream-merge.agent.md` - Dedicated agent for merge workflows
- **Context Files:** `../../.github/instructions/` - Reference data Copilot uses during merges
- **Prompt Templates:** `../../.github/prompts/` - Ready-to-use prompts for Copilot

---

## 📋 VS Code Integration

If using VS Code, additional shortcuts are available:

### Tasks (Run from UI)
Press `Ctrl+Shift+P` → "Tasks: Run Task" → Select:
- "Verify Paychex Customizations"
- "Scan for New Customizations (14 days)"
- "Scan for New Customizations (30 days)"

Or press `Ctrl+Shift+B` to run verification immediately.

### Code Snippets
Type these shortcuts in any file:
- `merge-prompt` → Full merge prompt template
- `update-verify` → Verification update prompt
- `scan-custom` → Scanner command

See `../../.vscode/` for configuration details.

---

## 🗺️ Merge Process Overview

```
┌─────────────────────────────────────────────────────────────────┐
│ Phase 1: Analysis & Planning                                    │
│ • Identify target upstream version                              │
│ • Analyze scope of changes                                      │
│ • Review upstream changelog                                     │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Phase 2: Branch Creation                                        │
│ • Create merge branch from develop                              │
│ • Fetch upstream tags                                           │
│ • Initiate merge                                                │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Phase 3: Conflict Resolution                                    │
│ • Categorize conflicts (low/medium/high risk)                   │
│ • Use decision matrix for each file                             │
│ • Preserve Paychex customizations                               │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Phase 4: Verification                                           │
│ • Run: ../../scripts/verify-paychex-customizations.sh          │
│ • All critical customizations must pass                         │
│ • Fix any failures before proceeding                            │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Phase 5: Build & Test                                           │
│ • npm run build (must succeed)                                  │
│ • npm test (acceptable: 93%+ pass rate)                         │
│ • Manual smoke testing                                          │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Phase 6: Documentation                                          │
│ • Update verification script if needed                          │
│ • Document any new customizations                               │
│ • Create comprehensive commit message                           │
└─────────────────────────────────────────────────────────────────┘
```

For detailed steps, see [UPSTREAM_MERGE_GUIDE.md](UPSTREAM_MERGE_GUIDE.md).

---

## 🆘 Troubleshooting

### Verification Script Fails

1. Check which customization failed
2. Review [UPSTREAM_MERGE_GUIDE.md](UPSTREAM_MERGE_GUIDE.md#-troubleshooting) Troubleshooting section
3. Use git archaeology: `git log develop -- <file>`
4. Compare with upstream: `git diff upstream/main..develop -- <file>`

### Need to Update Verification Script

See [UPDATE_VERIFICATION_PROMPT.md](UPDATE_VERIFICATION_PROMPT.md) for complete process.

### Merge Conflicts Are Complex

1. Use AI assistance: Copy prompt from [AI_MERGE_PROMPT.md](AI_MERGE_PROMPT.md)
2. Reference decision matrix in [UPSTREAM_MERGE_GUIDE.md](UPSTREAM_MERGE_GUIDE.md#-decision-matrix)
3. When in doubt, preserve Paychex customizations

---

## 📈 Success Metrics

A successful merge should have:
- ✅ All verification checks passing (100% critical, 90%+ overall)
- ✅ Build completing without errors
- ✅ Tests passing at 93%+ rate
- ✅ No TypeScript/ESLint errors
- ✅ All Paychex customizations documented and preserved

---

## 🔄 Maintenance Schedule

| Frequency | Task | Reference |
|-----------|------|-----------|
| **Bi-weekly** | Update verification script with new customizations | [UPDATE_VERIFICATION_PROMPT.md](UPDATE_VERIFICATION_PROMPT.md) |
| **Quarterly** | Merge new upstream release | [UPSTREAM_MERGE_GUIDE.md](UPSTREAM_MERGE_GUIDE.md) |
| **Monthly** | Review and audit customizations | [QUICK_UPDATE_PROMPT.md](QUICK_UPDATE_PROMPT.md) |

---

## 📞 Questions or Issues?

1. Review this documentation thoroughly
2. Check recent merge commits: `git log --grep="Merge upstream"`
3. Consult with team members who've done previous merges
4. Document new patterns to improve this guide

---

**Last Updated:** April 10, 2026  
**Documentation Version:** 2.0  
**Last Successful Merge:** v0.8.1 → v0.8.4 (April 2026)
