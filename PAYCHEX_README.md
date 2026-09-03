## Branching Strategy

This repository uses a `develop`-based branching model:

- **`develop`**: The default branch for active development and feature integration
- **`feature/*`**: Feature branches created from `develop`
- **`release/*`**: Release branches created from `develop` for deployment
- **`upstream/*`**: Branches for integrating upstream LibreChat changes
- **`bugfix/*`**: Bug fix branches created from `release/*` branches
- **`hotfix/*`**: Emergency fix branches created from release tags

## Making Workflow Changes

Workflow changes should be made on the `develop` branch through pull requests. GitHub Actions workflows execute from the branch they're defined on, so workflows on `develop` will trigger for `develop` branch events.

## Syncing Tags from the Upstream LibreChat Repository

From a local terminal, while having the `develop` branch checked out, run:

```bash
git remote add upstream https://github.com/danny-avila/LibreChat.git  # Only needed once
git fetch upstream --tags
```

Then push tags to your fork:

```bash
git push origin --tags
```



## Paychex-Specific Files

The following files are specific to the Paychex deployment of LibreChat and exist on the `develop` branch:

- **`mongodb_atlas_setup/`** - One-time JavaScript commands to create vector-related objects in MongoDB Atlas
- **`.paychex.dockerignore`** - Files to ignore when building the Paychex Docker image
- **`librechat.n1.yml`** - N1 environment configuration
- **`librechat.n2a.yml`** - N2a environment configuration
- **`librechat.prod.yml`** - Production environment configuration
- **`paychex-root.pem`** - Paychex SSL certificate
- **`payx-docker-compose.override.yml`** - Paychex-specific Docker Compose override
- **`client/src/hooks/Pendo/`** - Pendo analytics integration
- **`.github/workflows/`** - Custom CI/CD workflows for Paychex environments

All Paychex customizations are maintained on the `develop` branch and follow the standard feature branch workflow.


## Running LibreChat Locally

1. **Checkout the develop branch:**
   ```bash
   git checkout develop
   git pull origin develop
   ```

2. **Setup environment configuration:**
   - Copy `.env.paychex` to `.env` (contact your team for sensitive values)
   - Copy your target environment config to `librechat.yaml`:
     ```bash
     cp librechat.n2a.yml librechat.yaml  # For N2a environment
     # OR
     cp librechat.n1.yml librechat.yaml   # For N1 environment
     ```
   Note: The file extension must be `.yaml` (not `.yml`)

3. **Update Docker image tag (optional for testing specific versions):**
   Edit `payx-docker-compose.override.yml` if you need a specific LibreChat version:
   ```yaml
   api:
       container_name: LibreChat
       ports:
         - "${PORT}:${PORT}"
       image: ghcr.io/danny-avila/librechat:v0.8.4  # Update version as needed
   ```

4. **Start the application:**
   ```bash
   docker compose -f docker-compose.yml -f payx-docker-compose.override.yml up
   ```

5. **Access the application:**
   - Navigate to `localhost:3080` in your browser
   - If using VSCode remote SSH, ensure port 3080 is forwarded
   - Register a test user and log in

## Running LibreChat Locally on Windows (Podman + WSL2)

Developers running Windows natively (not Linux/remote-SSH) use **Podman via WSL2** instead of
Docker Desktop, per Confluence: `wiki.paychex.com/display/DEVSVCS/Linux+Containers+on+Windows`
(short link `wiki.paychex.com/x/_lrOPw`). This setup has several non-obvious gotchas (DOCKER_HOST
not forwarding into WSL, MongoDB data corruption on NTFS bind mounts, Node TLS cert errors), so
the full known-working process has been scripted and documented rather than left to tribal
knowledge:

- **[.github/prompts/windows-podman-setup.prompt.md](.github/prompts/windows-podman-setup.prompt.md)**
  — run `/windows-podman-setup` in Copilot Chat (or paste into any AI agent) to have it walk
  through the whole setup step by step, including the gotchas and their fixes.
- **[scripts/install-podman-windows.ps1](scripts/install-podman-windows.ps1)** — one-time
  install/configuration of Podman + WSL2 (downloads the latest Paychex podman distro and wrapper
  scripts from Artifactory, sets up `DOCKER_HOST`/`ADDITIONAL_WSLENV`). Idempotent; supports
  `-DryRun` and `-Upgrade`.
- **[scripts/start-podman-infra.ps1](scripts/start-podman-infra.ps1)** — brings up the infra
  containers (MongoDB, Meilisearch, etc.) through Podman-in-WSL with `DOCKER_HOST` forwarded
  correctly. Run this after every reboot or `wsl --shutdown` before `npm run backend:dev`.

New Windows developers should run the prompt (or the two scripts directly) instead of following
the Linux steps above. Keep these files up to date as the Windows setup evolves so the next
developer doesn't have to rediscover the same gotchas.

## Development Workflow

### Creating a New Feature

1. **Create a feature branch from develop:**
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/AIA-XXXX-description
   ```

2. **Make your changes and commit:**
   ```bash
   git add .
   git commit -m "feat: description of changes"
   ```

3. **Push and create a pull request:**
   ```bash
   git push origin feature/AIA-XXXX-description
   ```
   Create a PR targeting the `develop` branch

4. **After approval, the feature will be merged into develop**

### Creating a Release

1. **Create a release branch from develop:**
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b release/payx-X.X.X-sXX
   ```

2. **Push the release branch:**
   ```bash
   git push origin release/payx-X.X.X-sXX
   ```

3. **Deploy to non-production environment:**
   - Run the appropriate GitHub Actions workflow (N1 or N2a)
   - Provide the release branch name as input
   - Optionally build the RAG API image (typically only needed for new releases)

4. **Test and fix issues:**
   - If bugs are found, create `bugfix/` branches from the release branch
   - Merge bugfixes back into the release branch
   - Re-deploy and verify

5. **Merge back to develop:**
   ```bash
   git checkout develop
   git merge release/payx-X.X.X-sXX
   git push origin develop
   ```

6. **Tag the release:**
   ```bash
   git tag -a payx-X.X.X-sXX -m "Release X.X.X Sprint XX"
   git push origin payx-X.X.X-sXX
   ```

7. **Delete the release branch:**
   ```bash
   git branch -d release/payx-X.X.X-sXX
   git push origin --delete release/payx-X.X.X-sXX
   ```

### Integrating Upstream LibreChat Changes

1. **Create an upstream integration branch:**
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b upstream/vX.X.X-integration
   ```

2. **Fetch and merge upstream changes:**
   ```bash
   git fetch upstream
   git merge upstream/main  # Or specific upstream tag
   ```

3. **Resolve conflicts and test thoroughly**

   > See `docs/merge-process/UPSTREAM_MERGE_GUIDE.md` for the full conflict resolution SOP and `docs/merge-process/MERGE_CHECKLIST.md` for a printable checklist. Run `./scripts/verify-paychex-customizations.sh` after resolving conflicts to confirm all Paychex customizations are intact.

4. **Tag the upstream integration:**
   ```bash
   git tag -a upstream-vX.X.X -m "Integrated upstream LibreChat vX.X.X"
   ```

5. **Create PR to merge into develop:**
   - Create pull request from `upstream/vX.X.X-integration` to `develop`
   - Review and test
   - Merge after approval

6. **Push tag and clean up:**
   ```bash
   git push origin upstream-vX.X.X
   git branch -d upstream/vX.X.X-integration
   git push origin --delete upstream/vX.X.X-integration
   ```

## Generating E2E Specs with Playwright MCP

The repo includes a Playwright MCP setup that lets an LLM agent (via VS Code Copilot Chat in Agent mode) drive a real browser and generate Playwright spec files for us. See [docs/playwright-mcp-poc.md](docs/playwright-mcp-poc.md) for the full POC findings, and [docs/playwright-mcp-setup-guide.md](docs/playwright-mcp-setup-guide.md) for an app-agnostic setup walkthrough.

### Enable in VS Code

The MCP server is pre-configured in [.vscode/mcp.json](.vscode/mcp.json). To activate it:

1. Open [.vscode/mcp.json](.vscode/mcp.json), click the `▷ Start` codelens above the `"playwright"` entry (or run **MCP: List Servers** from the command palette and start it from there).
2. Open Copilot Chat in **Agent** mode (dropdown at the bottom of the chat input).
3. Open the tool picker (Command Palette → **Chat: Configure Tools…**) and confirm the `playwright` tools are enabled.

### Run generated specs

Generated specs live in the suite directory that owns them under [e2e/specs/](e2e/specs/) — see the table in *Generating new specs* below. Run them with:

```bash
npm run e2e:seed             # create test account in local MongoDB (first time only)
npm run e2e:ci:deployed      # runs all MCP + smoke specs (auto-starts server if localhost)
```

Set these in `.env`:

| Variable | Purpose | Example |
|----------|---------|---------|
| `E2E_BASE_URL` | Target environment | `http://localhost:3080` or `https://play.ain2a.paychex.com` |
| `E2E_USERNAME` | Test account email | `libre_playwright_np@paychex.com` |
| `E2E_PASSWORD` | Test account password | *(see team vault)* |

### Authentication behavior

The CI config (`e2e/playwright.config.ci.ts`) uses a global-setup that authenticates once and saves session state.

- **Local (`localhost`):** Uses the email/password login form. Run `npm run e2e:seed` first to create the test account with ADMIN permissions in MongoDB.
- **Deployed (non-localhost):** Uses Azure AD → Microsoft login → ADFS. On CI runners (not domain-joined), the ADFS form appears and the service account credentials are submitted. On domain-joined dev machines, Kerberos auto-authenticates as **your Windows identity** (not the service account) — this is expected and acceptable for local development.

#### Service account requirements

| Account | Environments | AD Group Required |
|---------|-------------|-------------------|
| `libre_playwright_np@paychex.com` | N2A, N1 | Yes — must be in the app's access group |
| `libre_playwright_pr@paychex.com` | Prod | Yes — must be in the app's access group |

### Generating new specs

In Copilot Chat (Agent mode) with the playwright tools enabled, prompt the agent to:

1. Log in to http://localhost:3090
2. Explore the feature you want covered
3. Save the new spec into the directory matching the suite that should own it:

| Directory | Suite / config | Runs against |
|-----------|----------------|--------------|
| `e2e/specs/mock/` | `playwright.config.mock.ts` | Mocked backend, every PR |
| `e2e/specs/ci/` | `playwright.config.ci.ts` | Deployed env, post-deploy smoke |
| `e2e/specs/journeys/` | `playwright.config.journeys.ts` | Deployed env, merge-triage journeys (tag `@paychex` / `@upstream` / `@platform`) |
| `e2e/specs/probe/` | `playwright.config.probe.ts` | Deployed env, non-failing selector probe |
| `e2e/specs/real/` | `playwright.config.real.ts` | Deployed env, credentialed manual runs |

Specs left directly in `e2e/specs/` fall into the legacy local suite (`npm run e2e`,
`playwright.config.local.ts`) and the a11y suite. Prefer one of the directories above
so the spec has an owning suite that actually runs in CI.

Then review the generated spec like any other PR — the agent can over-assert from a single observation, so a human pass is required before committing.
