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
4. Configure Docker daemon for Paychex VDI (registry access, disk management)
5. Install GitHub CLI (optional)
6. Install Visual Studio Code (optional)
7. Set up MongoDB 4.4 in a Docker container
8. Configure your `.env` file with generated secrets
9. Install npm dependencies
10. Build packages
11. Configure deployment mode (Native or Docker Compose)
12. Verify the installation

### Prerequisites

Before running the setup script, you'll need:

**For Paychex Developers:**
1. **Docker Registry Configuration** (if you need access to internal registries):
   ```bash
   # Copy the template
   cp docker-daemon.json.example docker-daemon.json.local
   
   # Edit with your registry URLs (consult Paychex LibreChat wiki)
   code docker-daemon.json.local
   ```
   
   The script will use this file to configure `/etc/docker/daemon.json` with your private registries.
   
   **Security Note:** The `docker-daemon.json.local` file is git-ignored to prevent committing internal URLs to the public repository.

2. **SSL Certificate** (if required for your network):
   - Place `paychex-root.pem` in the LibreChat root directory
   - The script will configure npm and Node.js to trust this certificate

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

# Test with specific branch
./test-docker-ubuntu.sh --branch feature/my-branch

# Test with fresh Docker environment
./test-docker-ubuntu.sh --fresh
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
├── docker-daemon.json.example          # Template for Docker registry config
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

## Key Features

### Security & Compliance

**No Internal URLs Committed:** The script uses a template pattern for Docker daemon configuration:
- `docker-daemon.json.example` - Committed to repo with placeholder URLs
- `docker-daemon.json.local` - Git-ignored, user-created with actual registry URLs

This prevents Paychex internal infrastructure from being exposed in the public repository.

### Paychex VDI Optimizations

**Docker Home Relocation:**
- Automatically moves Docker data from `/var/lib/docker` to `/home/docker`
- Prevents filling up the smaller `/var` partition on VDI systems
- Creates symlink for transparent operation

**MongoDB 4.4 Compatibility:**
- Uses MongoDB 4.4 for CPUs without AVX support (common in VDI environments)
- Generates random credentials for local development

**Interactive User Guidance:**
- Prompts for registry configuration if template doesn't exist
- Provides clear instructions for VDI-specific setup
- Offers to apply docker group permissions in current session

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

# Recreate if needed
docker stop librechat-mongo
docker rm librechat-mongo
docker volume rm librechat-mongo
# Then re-run setup script
```

### Docker Daemon Issues

**Docker fails to start after configuration:**
```bash
# Check systemd status
sudo systemctl status docker

# View recent logs
sudo journalctl -u docker.service -n 50

# Verify daemon.json is valid JSON
sudo python3 -m json.tool /etc/docker/daemon.json

# Check symlink
ls -la /var/lib/docker /home/docker
```

**Permission denied when running docker commands:**
```bash
# Verify docker group membership
groups | grep docker

# If not in docker group, add yourself
sudo usermod -aG docker $USER

# Apply group changes (choose one):
# Option 1: Log out and back in
# Option 2: Start new shell with docker group
newgrp docker
```

### Node.js Not Found After Installation
```bash
# Source nvm manually
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Or add to your shell profile (~/.bashrc or ~/.zshrc):
echo 'export NVM_DIR="$HOME/.nvm"' >> ~/.bashrc
echo '[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"' >> ~/.bashrc
source ~/.bashrc
```

### VS Code Installation

VS Code is installed optionally. If you need it:
```bash
# Re-run the setup script - it will detect missing VS Code and offer to install
./dev-setup/setup-dev-env.sh

# Or install manually:
# Ubuntu: https://code.visualstudio.com/docs/setup/linux
# Rocky: https://code.visualstudio.com/docs/setup/linux
```

**Extensions:** The script does not install extensions automatically. Configure GitHub Copilot and other extensions manually based on your needs and corporate license availability.

### Re-run Setup
The script is idempotent and designed to repair broken environments:
- Detects existing installations and skips or updates as needed
- Can be safely re-run after failures
- Repairs common configuration issues (broken symlinks, missing permissions, etc.)

```bash
# Safe to run multiple times
./dev-setup/setup-dev-env.sh
```

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
2. Contact the development team
