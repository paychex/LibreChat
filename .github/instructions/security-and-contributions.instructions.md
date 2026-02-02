---
description: 'Security guidelines and contribution standards for LibreChat - PUBLIC OPEN SOURCE PROJECT'
applyTo: '**/*'
---

# Security and Contribution Guidelines

## ⚠️ CRITICAL: This is a PUBLIC Open Source Repository

LibreChat is an **open-source project** hosted on **public GitHub**. All commits, pull requests, and issues are visible to the entire world. This means:

- **DO NOT** commit internal company information
- **DO NOT** commit credentials, API keys, or passwords
- **DO NOT** commit internal URLs, endpoints, or infrastructure details
- **DO NOT** commit company-specific configuration files
- **DO NOT** expose internal network topology or service names

## Paychex-Specific Security Requirements

### What NOT to Commit

**Internal URLs and Endpoints:**

```bash
# ❌ NEVER commit these
- *.paychex.com
- Internal Azure endpoint URLs
- Internal API gateway URLs
- Intranet URLs or internal wiki links
- Environment-specific hostnames (n1, n2a, prod, etc.)
```

**Credentials and Secrets:**

```bash
# ❌ NEVER commit these
- API keys (Azure OpenAI, embeddings, etc.)
- OAuth client IDs and secrets
- Database passwords (even for development)
- JWT secrets or signing keys
- Azure tenant IDs
- Service principal credentials
```

**Configuration Files:**

```bash
# ❌ NEVER commit these with real values
- .env files with production/staging values
- docker-compose.override.yml with Paychex-specific mounts
- librechat.yaml with internal endpoints
- SSL certificates (paychex-root.pem)
- Azure container app definitions with real configs
```

### What TO Commit

**Examples and Templates:**

```bash
# ✅ Safe to commit
- .env.example with placeholder values
- README with generic setup instructions
- Docker compose overrides with <placeholder> values
- Setup scripts that GENERATE random passwords
- Configuration guides that reference internal docs
```

**Placeholder Pattern:**

```bash
# Use these patterns for examples:
AZURE_OPENAI_ENDPOINT=<consult-internal-documentation>
INTERNAL_SERVICE_URL=<see-paychex-wiki>
API_KEY=<your-api-key-here>
MONGO_PASSWORD=<randomly-generated-on-setup>
```

## Git Hygiene

### Before Committing

1. **Review your changes carefully:**

   ```bash
   git diff --staged
   ```

2. **Check for sensitive patterns:**

   ```bash
   git diff --staged | grep -E "paychex\.com|password|api[_-]?key|secret|token"
   ```

3. **Verify .gitignore is working:**

   ```bash
   git status --ignored
   ```

4. **Use meaningful commit messages:**

   ```bash
   # Good
   git commit -m "feat: Add VDI setup script with randomized credentials"

   # Bad (exposes internal details)
   git commit -m "fix: Updated n2a endpoint for production deploy"
   ```

### If You Accidentally Commit Sensitive Data

1. **DO NOT** just delete it in a new commit (it stays in git history)
2. **STOP** and notify your team lead immediately
3. **Document** what was exposed and when
4. **Rewrite history** if the commit hasn't been pushed:

   ```bash
   git reset --soft HEAD~1  # Undo last commit, keep changes
   # Fix the files
   git add .
   git commit -m "Your fixed commit message"
   ```

5. **If already pushed** to a public branch:
   - Coordinate with team to rewrite history
   - Force push the cleaned history
   - Rotate any exposed credentials immediately

## Configuration Management

### For Developers

**Setting up Paychex-specific configuration:**

1. Copy example files:

   ```bash
   cp .env.example .env
   cp docker-compose.override.yml.example docker-compose.override.yml
   ```

2. Consult internal documentation:
   - Paychex LibreChat Wiki for endpoint URLs
   - Azure portal for API keys
   - IT documentation for SSL certificates

3. Never commit your configured files:
   ```bash
   # These should already be in .gitignore
   .env
   docker-compose.override.yml
   paychex-root.pem
   *.backup
   *.local
   ```

### For Setup Scripts

**Generate secrets, don't hardcode them:**

```javascript
// ✅ Good - Generate random passwords
const mongoPass = crypto.randomBytes(16).toString('base64');

// ❌ Bad - Hardcoded credentials
const mongoPass = 'devpassword123';
```

**Reference internal docs, don't embed URLs:**

```javascript
// ✅ Good
echo "AZURE_ENDPOINT=<see-internal-wiki>"

// ❌ Bad
echo "AZURE_ENDPOINT=https://internal.test.paychex.com/..."
```

## Code Review Checklist

Before approving any PR, verify:

- [ ] No internal Paychex URLs in code or comments
- [ ] No hardcoded credentials or API keys
- [ ] No company-specific configuration committed
- [ ] .env.example uses placeholder values only
- [ ] Setup scripts generate random passwords
- [ ] Documentation references internal docs without URLs
- [ ] No backup files or temporary configs included
- [ ] Changes work in both open-source and Paychex environments

## Pre-commit Hook (Recommended)

Install this pre-commit hook to catch issues early:

```bash
cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash

# Check for Paychex internal URLs
if git diff --cached | grep -qE ".*paychex\.com"; then
    echo "❌ ERROR: Internal Paychex URL detected!"
    echo "Remove internal URLs before committing to public repo."
    exit 1
fi

# Check for common secret patterns
if git diff --cached | grep -qiE "(password|api_key|secret).*=.*['\"][^<]"; then
    echo "⚠️  WARNING: Potential secret detected!"
    echo "Ensure you're not committing real credentials."
    read -p "Continue anyway? (y/N) " -n 1 -r < /dev/tty
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

exit 0
EOF

chmod +x .git/hooks/pre-commit
```

## Contributing to Open Source

When contributing upstream to the original LibreChat project:

1. **Fork the repository** to your personal GitHub account
2. **Create feature branches** from the upstream main branch
3. **Remove all Paychex-specific code** from your contributions
4. **Test your changes** without Paychex dependencies

## Questions?

- For configuration help: Consult internal Paychex LibreChat wiki
- For open-source contributions: Follow LibreChat's contributing guidelines
- For general development: Ask your team lead

---

**Remember: When in doubt, don't commit it. Ask your team first.**
