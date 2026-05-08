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

- **`az_container_app_definitions/`** - Azure Container App definitions (YAML) for N1, N2a, and Prod environments
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
       image: ghcr.io/danny-avila/librechat:v0.8.1  # Update version as needed
   ```

4. **Start the application:**
   ```bash
   docker compose -f docker-compose.yml -f payx-docker-compose.override.yml up
   ```

5. **Access the application:**
   - Navigate to `localhost:3080` in your browser
   - If using VSCode remote SSH, ensure port 3080 is forwarded
   - Register a test user and log in

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

Generated specs live alongside the existing suite at [e2e/specs/](e2e/specs/) with an `mcp-` prefix. They use a lightweight POC config that does not spin up its own backend — start the dev servers first, then run:

```bash
npm run backend:dev          # in one terminal
npm run frontend:dev         # in another terminal
cd e2e
npx playwright test --config=playwright.config.poc.ts
```

### Authentication note

Saved `storageState` files go stale quickly because of how the app rotates refresh tokens. The simpler pattern (used by the POC specs) is to log in inline in `beforeEach` — see [e2e/specs/mcp-tools-dropdown.spec.ts](e2e/specs/mcp-tools-dropdown.spec.ts) for an example. A test user with email `tmarkovic@email.com` / password `test1234` exists in local dev.

### Generating new specs

In Copilot Chat (Agent mode) with the playwright tools enabled, prompt the agent to:

1. Log in to http://localhost:3090
2. Explore the feature you want covered
3. Save a new spec to `e2e/specs/mcp-<feature-name>.spec.ts`

Then review the generated spec like any other PR — the agent can over-assert from a single observation, so a human pass is required before committing.
