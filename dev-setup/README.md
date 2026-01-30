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

## File Structure

```
dev-setup/
├── setup-dev-env.sh                    # Main setup script
├── README.md                           # This file
│
├── interactive-test-ubuntu.sh          # Interactive Ubuntu testing
├── interactive-test-rocky.sh           # Interactive Rocky Linux testing
│
├── test-docker-ubuntu.sh               # Automated Ubuntu testing
├── test-docker-rocky.sh                # Automated Rocky Linux testing
│
├── Dockerfile.test-ubuntu              # Ubuntu test image
└── Dockerfile.test-rocky               # Rocky test image
```

## Environment Variables

### For Development/Testing

The following environment variables control script behavior for testing and CI/CD environments:

#### `CI` (default: not set)
- **Purpose**: Enables non-interactive CI/CD mode
- **Effect**: Skips all interactive prompts, uses default choices
- **Usage**: `CI=true ./setup-dev-env.sh`
- **When to use**: In continuous integration pipelines, automated testing

#### `AUTOMATED_TEST` (default: not set)
- **Purpose**: Indicates script is running in automated test environment
- **Effect**: 
  - Skips MongoDB and application startup tests (Docker daemon may not be available)
  - Uses sensible defaults for all choices
  - Provides warnings instead of errors for container-specific limitations
- **Usage**: `AUTOMATED_TEST=true ./setup-dev-env.sh`
- **When to use**: Automated test environments where Docker-in-Docker is not available

#### `TEST_MODE` (default: not set)
- **Purpose**: Bypasses LibreChat repository detection
- **Effect**: Skips the `package.json` presence check
- **Usage**: `TEST_MODE=1 ./setup-dev-env.sh`
- **When to use**: 
  - Testing script in minimal Docker images without full repository
  - Unit testing individual functions
  - Automated CI builds where only the script is copied

### Combined Usage

For fully automated testing (recommended for CI/CD):
```bash
CI=true AUTOMATED_TEST=true TEST_MODE=1 ./setup-dev-env.sh
```

### Corporate Network Configuration

#### SSL Certificate Handling

For corporate environments with custom SSL certificates:

**Rocky Linux:**
1. Copy certificates to `/usr/local/share/ca-certificates/` on the host
2. The automated test scripts will automatically copy them to the build context
3. Certificates are installed before any network operations

**Ubuntu:**
1. Place `.crt` files in `/usr/local/share/ca-certificates/`
2. Run `sudo update-ca-certificates`
3. The setup script will configure npm to use system certificates

**Note**: The test Dockerfiles (`Dockerfile.test-rocky` and `Dockerfile.test-ubuntu`) automatically handle certificate mounting when available. If no certificates are found, a dummy certificate is created to prevent build failures.
├── Dockerfile.test-rocky               # Rocky test image
│
└── README.md                           # This file
```

## Environment Variables

## Requirements

### Host System
- Docker installed and running
- Bash shell
- Git

### Supported Target Systems
- Ubuntu 24.04+
- Rocky Linux 9+

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

1. Test interactively in a fresh environment:
   ```bash
   ./interactive-test-ubuntu.sh
   # or
   ./interactive-test-rocky.sh
   ```

2. Run automated tests:
   ```bash
   ./test-docker-ubuntu.sh
   ./test-docker-rocky.sh
   ```

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Check [LibreChat documentation](https://wiki.paychex.com/spaces/AIML/pages/2327061128/LibreChat+Local+Development+Setup+with+Docker+and+MongoDB+in+Linux+VDI)
3. Contact the development team
