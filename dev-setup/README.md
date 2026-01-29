# LibreChat Development Environment Setup

This directory contains scripts and tools for setting up and testing the LibreChat development environment on Ubuntu and Rocky Linux VDIs.

## Quick Start

### Running the Setup Script

From your LibreChat root directory:

```bash
cd dev-setup
./setup-dev-env.sh
```

The script will:
1. Detect your OS (Ubuntu or Rocky Linux)
2. Install Node.js 20+ via nvm
3. Install Docker and Docker Compose
4. Install GitHub CLI (optional)
5. Set up MongoDB in a Docker container
6. Configure your `.env` file
7. Install npm dependencies
8. Build packages
9. Configure deployment mode (Native or Docker Compose)
10. Verify the installation

## Testing the Setup Script

### Interactive Testing (Manual Verification)

Test the script in a fresh Ubuntu or Rocky Linux environment:

```bash
# Ubuntu 24.04
./interactive-test-ubuntu.sh

# Rocky Linux 9
./interactive-test-rocky.sh
```

This will:
- Launch a Docker container with a fresh OS
- Mount your LibreChat code at `/workspace`
- Drop you into an interactive shell
- Allow you to manually run and observe `./setup-dev-env.sh`

Inside the container:
```bash
cd /workspace/dev-setup
./setup-dev-env.sh
```

### Automated Testing (CI/Validation)

Run automated end-to-end tests:

```bash
# Test on Ubuntu 24.04
./test-docker-ubuntu.sh

# Test on Rocky Linux 9
./test-docker-rocky.sh
```

These scripts:
- Build a Docker image from scratch
- Run the setup script non-interactively
- Verify all components install correctly
- Exit with success/failure code

### Unit Testing Individual Phases

Test specific phases without running the full script:

```bash
# Phase 2: Installation functions
./test-phase2.sh

# Phase 4: Deployment mode selection
./test-phase4.sh

# Phase 5: Verification and testing
./test-phase5.sh
```

## File Structure

```
dev-setup/
├── setup-dev-env.sh                    # Main setup script
├── SETUP_SCRIPT_IMPLEMENTATION_PLAN.md # Implementation documentation
│
├── interactive-test-ubuntu.sh          # Interactive Ubuntu testing
├── interactive-test-rocky.sh           # Interactive Rocky Linux testing
│
├── test-docker-ubuntu.sh               # Automated Ubuntu testing
├── test-docker-rocky.sh                # Automated Rocky Linux testing
│
├── Dockerfile.test-ubuntu              # Ubuntu test image
├── Dockerfile.test-rocky               # Rocky test image
│
├── test-phase2.sh                      # Phase 2 unit tests
├── test-phase4.sh                      # Phase 4 unit tests
├── test-phase5.sh                      # Phase 5 unit tests
│
└── README.md                           # This file
```

## Environment Variables

### For Automated Testing

- `CI=true` - Runs in non-interactive CI mode
- `AUTOMATED_TEST=true` - Skips interactive prompts, uses defaults
- `TEST_MODE=1` - For phase testing without package.json requirement

### Example

```bash
CI=true AUTOMATED_TEST=true ./setup-dev-env.sh
```

## Requirements

### Host System
- Docker installed and running
- Bash shell
- Git

### Supported Target Systems
- Ubuntu 20.04+ (tested on 24.04 LTS)
- Rocky Linux 8+ (tested on 9)

## Deployment Modes

The setup script supports two deployment modes:

### Native Mode (Recommended for Development)
- MongoDB runs in Docker container
- Application runs directly via npm
- Hot Module Replacement (HMR) enabled
- Best for active development and debugging

**Start the application:**
```bash
npm run dev
# Or separately:
npm run backend:dev   # Terminal 1
npm run frontend:dev  # Terminal 2
```

### Docker Compose Mode
- All services run in containers
- Production-like environment
- Requires `docker-compose.dev.yml`

**Start the application:**
```bash
docker compose -f docker-compose.dev.yml up -d
docker compose -f docker-compose.dev.yml logs -f
```

## Troubleshooting

### MongoDB Container Issues
```bash
# Check status
docker ps | grep librechat-mongo

# View logs
docker logs librechat-mongo

# Restart
docker restart librechat-mongo
```

### Node.js Not Found After Installation
```bash
# Source nvm manually
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
```

### Docker Permission Denied
```bash
# Add user to docker group
sudo usermod -aG docker $USER

# Log out and back in, or run:
newgrp docker
```

### Re-run Setup
The script is idempotent - you can safely re-run it if anything fails. It will detect existing installations and skip or update as needed.

## CI/CD Integration

To integrate automated testing into your CI pipeline:

```yaml
# Example GitHub Actions workflow
steps:
  - uses: actions/checkout@v3
  
  - name: Test Ubuntu Setup
    run: |
      cd dev-setup
      ./test-docker-ubuntu.sh
  
  - name: Test Rocky Setup
    run: |
      cd dev-setup
      ./test-docker-rocky.sh
```

## Development

When making changes to `setup-dev-env.sh`:

1. Test individual phases with unit tests:
   ```bash
   ./test-phase2.sh
   ./test-phase4.sh
   ./test-phase5.sh
   ```

2. Test interactively in a fresh environment:
   ```bash
   ./interactive-test-ubuntu.sh
   # or
   ./interactive-test-rocky.sh
   ```

3. Run automated tests:
   ```bash
   ./test-docker-ubuntu.sh
   ./test-docker-rocky.sh
   ```

4. Review the implementation plan:
   ```bash
   cat SETUP_SCRIPT_IMPLEMENTATION_PLAN.md
   ```

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review [SETUP_SCRIPT_IMPLEMENTATION_PLAN.md](SETUP_SCRIPT_IMPLEMENTATION_PLAN.md)
3. Check LibreChat documentation
4. Contact the development team
