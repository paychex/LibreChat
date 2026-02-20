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
