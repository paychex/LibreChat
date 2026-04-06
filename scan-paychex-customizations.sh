#!/bin/bash
# Generate Paychex Customizations Report
# Purpose: Identify potential new customizations for verification script update
# Usage: ./scan-paychex-customizations.sh [days]
# Example: ./scan-paychex-customizations.sh 30  (scan last 30 days)

DAYS=${1:-14}  # Default to 14 days if not specified
REPORT_FILE="/tmp/paychex_customizations_$(date +%Y%m%d_%H%M%S).md"

echo "======================================"
echo "Paychex Customizations Scanner"
echo "======================================"
echo ""
echo "Scanning for customizations from last $DAYS days..."
echo "Report will be saved to: $REPORT_FILE"
echo ""

# Check if upstream remote exists
if ! git remote | grep -q "^upstream$"; then
    echo "⚠️  WARNING: 'upstream' remote not configured"
    echo "    Run: git remote add upstream https://github.com/danny-avila/LibreChat.git"
    echo ""
fi

# Initialize report
cat > "$REPORT_FILE" << 'EOF'
# Paychex Customizations Report

**Generated:** $(date +"%Y-%m-%d %H:%M:%S")  
**Scan Period:** Last ${DAYS} days  
**Purpose:** Identify new customizations for verification script update

---

## 📊 Summary Statistics

EOF

# Count commits
COMMIT_COUNT=$(git log --oneline develop --not upstream/main --since="$DAYS days ago" 2>/dev/null | wc -l)
echo "- **New Paychex commits:** $COMMIT_COUNT" >> "$REPORT_FILE"

# Count modified files
FILE_COUNT=$(git diff --name-only upstream/main...develop 2>/dev/null | wc -l)
echo "- **Files modified vs upstream:** $FILE_COUNT" >> "$REPORT_FILE"

# Count code markers
MARKER_COUNT=$(grep -r "PAYCHEX\|@paychex\|Paychex-specific" --include="*.js" --include="*.ts" --include="*.tsx" api/ client/ packages/ 2>/dev/null | wc -l)
echo "- **Code markers found:** $MARKER_COUNT" >> "$REPORT_FILE"

echo "" >> "$REPORT_FILE"
echo "---" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# Recent commits
echo "## 📝 Recent Paychex Commits (Last $DAYS Days)" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo '```' >> "$REPORT_FILE"
if git log --oneline develop --not upstream/main --since="$DAYS days ago" 2>/dev/null | head -50 > /tmp/commits.txt; then
    if [ -s /tmp/commits.txt ]; then
        cat /tmp/commits.txt >> "$REPORT_FILE"
    else
        echo "No commits found in the last $DAYS days" >> "$REPORT_FILE"
    fi
else
    echo "⚠️  Unable to compare with upstream (is upstream remote configured?)" >> "$REPORT_FILE"
fi
echo '```' >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# Modified files breakdown
echo "## 📁 Modified Files by Category" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

echo "### Backend (API)" >> "$REPORT_FILE"
echo '```' >> "$REPORT_FILE"
git diff --name-only upstream/main...develop 2>/dev/null | grep "^api/" | head -30 >> "$REPORT_FILE"
echo '```' >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

echo "### Frontend (Client)" >> "$REPORT_FILE"
echo '```' >> "$REPORT_FILE"
git diff --name-only upstream/main...develop 2>/dev/null | grep "^client/" | head -30 >> "$REPORT_FILE"
echo '```' >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

echo "### Packages" >> "$REPORT_FILE"
echo '```' >> "$REPORT_FILE"
git diff --name-only upstream/main...develop 2>/dev/null | grep "^packages/" | head -30 >> "$REPORT_FILE"
echo '```' >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# Code markers
echo "## 🏷️  Code Markers Found" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo "Files with PAYCHEX/Paychex markers:" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo '```' >> "$REPORT_FILE"
grep -rn "PAYCHEX\|@paychex\|Paychex-specific" --include="*.js" --include="*.ts" --include="*.tsx" api/ client/ packages/ 2>/dev/null | head -30 >> "$REPORT_FILE"
echo '```' >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# Critical files analysis
echo "## 🔍 Critical Files Recently Modified" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo "Files commonly containing customizations:" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# Backend services
echo "### Backend Services" >> "$REPORT_FILE"
echo '```' >> "$REPORT_FILE"
find api/server/services -type f -name "*.js" -exec sh -c 'git log -1 --format="%ai %h %s" -- "$1" 2>/dev/null' _ {} \; 2>/dev/null | sort -r | head -15 >> "$REPORT_FILE"
echo '```' >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# Frontend components
echo "### Frontend Components" >> "$REPORT_FILE"
echo '```' >> "$REPORT_FILE"
find client/src/components -type f -name "*.tsx" -exec sh -c 'git log -1 --format="%ai %h %s" -- "$1" 2>/dev/null' _ {} \; 2>/dev/null | sort -r | head -15 >> "$REPORT_FILE"
echo '```' >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# Dependencies
echo "## 📦 Package Modifications" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo "package.json files with uncommitted or recent changes:" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo '```' >> "$REPORT_FILE"
find . -name "package.json" -not -path "*/node_modules/*" -exec sh -c 'git log -1 --format="%ai %h" -- "$1" 2>/dev/null | head -1 && echo "  $1"' _ {} \; 2>/dev/null | head -20 >> "$REPORT_FILE"
echo '```' >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# Configuration files
echo "## ⚙️  Configuration Files" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo "librechat.yaml and other config files:" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo '```' >> "$REPORT_FILE"
git diff --name-only upstream/main...develop 2>/dev/null | grep -E "(\.yml$|\.yaml$|\.config\.|Dockerfile)" >> "$REPORT_FILE"
echo '```' >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# Suggestions
echo "---" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo "## 💡 Next Steps" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo "1. **Review** the files and commits listed above" >> "$REPORT_FILE"
echo "2. **Identify** which changes are Paychex-specific customizations" >> "$REPORT_FILE"
echo "3. **Categorize** each customization (critical vs warning)" >> "$REPORT_FILE"
echo "4. **Document** each customization with:" >> "$REPORT_FILE"
echo "   - File path" >> "$REPORT_FILE"
echo "   - Unique search pattern" >> "$REPORT_FILE"
echo "   - Description and impact" >> "$REPORT_FILE"
echo "5. **Update** verification script using UPDATE_VERIFICATION_PROMPT.md" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo "### Update Prompt Template" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo "See \`UPDATE_VERIFICATION_PROMPT.md\` for the full AI prompt template." >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo "Quick template:" >> "$REPORT_FILE"
echo '```' >> "$REPORT_FILE"
echo "1. **Customization Name:** [Brief name]" >> "$REPORT_FILE"
echo "   - **File:** [path]" >> "$REPORT_FILE"
echo "   - **Pattern:** [unique string]" >> "$REPORT_FILE"
echo "   - **Description:** [what it does]" >> "$REPORT_FILE"
echo "   - **Criticality:** [critical | warning]" >> "$REPORT_FILE"
echo "   - **Context:** [why it matters]" >> "$REPORT_FILE"
echo '```' >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# Compare with current verification script
echo "## ✅ Current Verification Coverage" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo "Customizations currently verified by verify-paychex-customizations.sh:" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo '```' >> "$REPORT_FILE"
grep -E "^echo \"[0-9]+\." verify-paychex-customizations.sh 2>/dev/null | sed 's/echo "/- /' | sed 's/"$//' >> "$REPORT_FILE"
echo '```' >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo "**Action:** Compare this list with customizations found above to identify gaps." >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# Footer
echo "---" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo "**Report Generated By:** scan-paychex-customizations.sh" >> "$REPORT_FILE"
echo "**Next Steps:** Review findings and update verification script if needed" >> "$REPORT_FILE"
echo "**Documentation:** See UPDATE_VERIFICATION_PROMPT.md for update process" >> "$REPORT_FILE"

# Display summary
echo "✓ Report generated successfully!"
echo ""
echo "📊 Summary:"
echo "  - Commits analyzed: $COMMIT_COUNT"
echo "  - Files modified: $FILE_COUNT"
echo "  - Code markers: $MARKER_COUNT"
echo ""
echo "📄 Full report saved to:"
echo "  $REPORT_FILE"
echo ""
echo "👉 Next steps:"
echo "  1. Review the report: cat $REPORT_FILE"
echo "  2. Identify new customizations needing verification"
echo "  3. Use UPDATE_VERIFICATION_PROMPT.md to update script"
echo ""

# Offer to open the report
if command -v less &> /dev/null; then
    echo "Press Enter to view report, or Ctrl+C to exit..."
    read -r
    less "$REPORT_FILE"
else
    echo "View report with: cat $REPORT_FILE"
fi
