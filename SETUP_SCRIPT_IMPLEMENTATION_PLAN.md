# LibreChat Linux VDI Setup Script - Implementation Plan

## Overview

Create an automated setup script (`setup-dev-env.sh`) that configures a complete LibreChat development environment on Ubuntu or Rocky Linux VDIs. The script will be idempotent, interactive, and support both native and Docker Compose deployment modes.

## Requirements

### Functional Requirements

1. **Single Unified Script**
   - Auto-detect OS (Ubuntu vs Rocky Linux)
   - Adapt commands based on detected distribution
   - Handle distribution-specific package managers (apt vs dnf)

2. **Component Installation**
   - Node.js 20+ LTS (via nvm)
   - Docker 24+ with docker-compose plugin
   - GitHub CLI (gh)
   - MongoDB 4.4 container
   - Project dependencies (npm packages)

3. **Idempotency & Safety**
   - Re-runnable without breaking existing setup
   - Check for existing installations before proceeding
   - Preserve existing configurations and data
   - Prompt before any destructive operations

4. **Interactive Prompts**
   - Warn if installed versions are outdated
   - Ask user if they want to upgrade
   - Allow skipping components that are already configured
   - Prompt before overwriting .env files or MongoDB data

5. **Deployment Mode Support**
   - Native mode: MongoDB in Docker, app runs via npm
   - Docker Compose mode: Everything containerized
   - Allow user to choose one or both modes

6. **Verification**
   - Verify each installation step succeeded
   - Check that build commands complete successfully
   - Test that LibreChat starts and responds
   - Validate frontend (port 3090) and backend (port 3080)

### Non-Functional Requirements

1. **User Experience**
   - Clear, informative output messages
   - Progress indicators for long-running operations
   - Error messages with troubleshooting hints
   - Summary report at the end

2. **Testing**
   - Docker-based test harness
   - Test on Ubuntu container
   - Test on Rocky Linux container
   - Automated verification of successful setup

## Implementation Plan

### Phase 1: Core Script Structure

**File:** `setup-dev-env.sh` (in repo root)

#### 1.1 Script Header & Utilities

```bash
#!/usr/bin/env bash
set -euo pipefail  # Exit on error, undefined vars, pipe failures

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Utility functions
log_info() { echo -e "${BLUE}[INFO]${NC} $*"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $*"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
log_error() { echo -e "${RED}[ERROR]${NC} $*"; }

prompt_yes_no() {
    local prompt="$1"
    local default="${2:-n}"
    # Implementation
}

check_command() {
    command -v "$1" >/dev/null 2>&1
}

compare_versions() {
    # Compare semantic versions
    # Returns 0 if $1 >= $2, 1 otherwise
}
```

#### 1.2 OS Detection

```bash
detect_os() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS=$ID
        VERSION=$VERSION_ID
    else
        log_error "Cannot detect OS"
        exit 1
    fi

    case "$OS" in
        ubuntu|debian)
            PKG_MANAGER="apt"
            ;;
        rocky|rhel|centos)
            PKG_MANAGER="dnf"
            ;;
        *)
            log_error "Unsupported OS: $OS"
            exit 1
            ;;
    esac

    log_info "Detected OS: $OS $VERSION"
}
```

### Phase 2: Component Installation Functions

#### 2.1 Node.js via nvm

```bash
install_nvm() {
    local REQUIRED_NODE_VERSION="20"

    # Check if nvm exists
    if [ -d "$HOME/.nvm" ]; then
        log_info "nvm already installed"
        # Source nvm
        export NVM_DIR="$HOME/.nvm"
        [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

        # Check Node version
        if check_command node; then
            current_version=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
            if [ "$current_version" -lt "$REQUIRED_NODE_VERSION" ]; then
                log_warn "Node.js version $current_version is below required version $REQUIRED_NODE_VERSION"
                if prompt_yes_no "Install Node.js $REQUIRED_NODE_VERSION LTS?" "y"; then
                    nvm install --lts
                    nvm use --lts
                fi
            else
                log_success "Node.js version $current_version meets requirements"
            fi
        else
            # nvm exists but no node installed
            nvm install --lts
            nvm use --lts
        fi
    else
        log_info "Installing nvm..."
        curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
        export NVM_DIR="$HOME/.nvm"
        [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
        nvm install --lts
        nvm use --lts
    fi

    # Verify installation
    node -v && npm -v || { log_error "Node.js installation failed"; exit 1; }
    log_success "Node.js $(node -v) and npm $(npm -v) are ready"
}
```

#### 2.2 Docker Installation

```bash
install_docker() {
    local REQUIRED_DOCKER_VERSION="24"

    # Check if Docker is already installed
    if check_command docker; then
        current_version=$(docker --version | grep -oP '\d+\.\d+\.\d+' | head -1 | cut -d'.' -f1)
        if [ "$current_version" -ge "$REQUIRED_DOCKER_VERSION" ]; then
            log_success "Docker $current_version is already installed"
            return 0
        else
            log_warn "Docker version $current_version is below required version $REQUIRED_DOCKER_VERSION"
            if ! prompt_yes_no "Upgrade Docker?" "y"; then
                log_warn "Skipping Docker upgrade"
                return 0
            fi
        fi
    fi

    log_info "Installing Docker..."

    case "$PKG_MANAGER" in
        apt)
            install_docker_ubuntu
            ;;
        dnf)
            install_docker_rocky
            ;;
    esac

    # Enable and start Docker
    sudo systemctl enable --now docker

    # Add user to docker group
    if ! groups "$USER" | grep -q docker; then
        log_info "Adding $USER to docker group..."
        sudo usermod -aG docker "$USER"
        log_warn "You may need to log out and back in for docker group changes to take effect"
        log_info "Attempting to apply group changes to current session..."
        newgrp docker <<EOF
        docker run --rm hello-world
EOF
    fi

    # Verify installation
    docker --version || { log_error "Docker installation failed"; exit 1; }
    log_success "Docker $(docker --version) is ready"
}

install_docker_ubuntu() {
    sudo apt-get update
    sudo apt-get install -y ca-certificates curl
    sudo install -m 0755 -d /etc/apt/keyrings
    sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
    sudo chmod a+r /etc/apt/keyrings/docker.asc

    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] \
      https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
      sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

    sudo apt-get update
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
}

install_docker_rocky() {
    sudo dnf -y install dnf-plugins-core
    sudo dnf config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
    sudo dnf install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
}
```

#### 2.3 GitHub CLI Installation

```bash
install_github_cli() {
    if check_command gh; then
        log_success "GitHub CLI is already installed ($(gh --version | head -1))"
        return 0
    fi

    log_info "Installing GitHub CLI..."

    case "$PKG_MANAGER" in
        apt)
            # Try snap first (most reliable)
            if check_command snap; then
                sudo snap install gh
            else
                log_warn "snap not available, using apt"
                # Add GitHub CLI apt repository
                curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | \
                    sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
                sudo chmod go+r /usr/share/keyrings/githubcli-archive-keyring.gpg
                echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | \
                    sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
                sudo apt update
                sudo apt install -y gh
            fi
            ;;
        dnf)
            sudo dnf install -y 'dnf-command(config-manager)'
            sudo dnf config-manager --add-repo https://cli.github.com/packages/rpm/gh-cli.repo
            sudo dnf install -y gh
            ;;
    esac

    # Verify installation
    gh --version || { log_error "GitHub CLI installation failed"; exit 1; }
    log_success "GitHub CLI installed successfully"
}
```

#### 2.4 MongoDB Container Setup

```bash
setup_mongodb() {
    local MONGO_CONTAINER="librechat-mongo"
    local MONGO_VOLUME="librechat-mongo"
    local MONGO_USER="librechat"
    local MONGO_PASS="devpassword"

    # Check if container already exists
    if docker ps -a --format '{{.Names}}' | grep -q "^${MONGO_CONTAINER}$"; then
        log_info "MongoDB container already exists"

        # Check if it's running
        if docker ps --format '{{.Names}}' | grep -q "^${MONGO_CONTAINER}$"; then
            log_success "MongoDB is already running"
        else
            log_warn "MongoDB container exists but is not running"
            if prompt_yes_no "Start MongoDB container?" "y"; then
                docker start "$MONGO_CONTAINER"
                log_success "MongoDB started"
            fi
        fi
        return 0
    fi

    # Check if volume exists
    if docker volume ls --format '{{.Name}}' | grep -q "^${MONGO_VOLUME}$"; then
        log_info "MongoDB volume already exists (data will be preserved)"
    else
        log_info "Creating MongoDB volume..."
        docker volume create "$MONGO_VOLUME"
    fi

    log_info "Starting MongoDB container..."
    docker run -d \
      --name "$MONGO_CONTAINER" \
      -p 27017:27017 \
      -v "${MONGO_VOLUME}:/data/db" \
      -e MONGO_INITDB_ROOT_USERNAME="$MONGO_USER" \
      -e MONGO_INITDB_ROOT_PASSWORD="$MONGO_PASS" \
      --restart unless-stopped \
      mongo:4.4

    # Wait for MongoDB to be ready
    log_info "Waiting for MongoDB to be ready..."
    for i in {1..30}; do
        if docker exec "$MONGO_CONTAINER" mongosh --eval "db.runCommand({ping:1})" --quiet >/dev/null 2>&1; then
            log_success "MongoDB is ready"
            return 0
        fi
        sleep 1
    done

    log_error "MongoDB failed to start properly"
    docker logs "$MONGO_CONTAINER"
    exit 1
}
```

### Phase 3: Project Setup

#### 3.1 Environment Configuration

```bash
setup_environment() {
    local ENV_FILE=".env"
    local ENV_EXAMPLE=".env.example"

    if [ ! -f "$ENV_EXAMPLE" ]; then
        log_error "$ENV_EXAMPLE not found. Are you in the LibreChat directory?"
        exit 1
    fi

    if [ -f "$ENV_FILE" ]; then
        log_warn ".env file already exists"
        if prompt_yes_no "Overwrite existing .env file? (backup will be created)" "n"; then
            cp "$ENV_FILE" "${ENV_FILE}.backup.$(date +%Y%m%d_%H%M%S)"
            log_info "Backup created: ${ENV_FILE}.backup.*"
        else
            log_info "Keeping existing .env file"
            return 0
        fi
    fi

    log_info "Creating .env file from template..."
    cp "$ENV_EXAMPLE" "$ENV_FILE"

    # Generate JWT secrets
    local JWT_SECRET=$(openssl rand -hex 32)
    local JWT_REFRESH_SECRET=$(openssl rand -hex 32)

    # Update MongoDB URI
    local MONGO_URI="mongodb://librechat:devpassword@localhost:27017/LibreChat?authSource=admin"

    # Update .env file
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s|^MONGO_URI=.*|MONGO_URI=${MONGO_URI}|" "$ENV_FILE"
        sed -i '' "s|^JWT_SECRET=.*|JWT_SECRET=${JWT_SECRET}|" "$ENV_FILE"
        sed -i '' "s|^JWT_REFRESH_SECRET=.*|JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}|" "$ENV_FILE"
    else
        sed -i "s|^MONGO_URI=.*|MONGO_URI=${MONGO_URI}|" "$ENV_FILE"
        sed -i "s|^JWT_SECRET=.*|JWT_SECRET=${JWT_SECRET}|" "$ENV_FILE"
        sed -i "s|^JWT_REFRESH_SECRET=.*|JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}|" "$ENV_FILE"
    fi

    log_success ".env file configured"
    log_info "JWT_SECRET and JWT_REFRESH_SECRET generated automatically"
}
```

#### 3.2 Install Dependencies & Build

```bash
install_dependencies() {
    log_info "Installing npm dependencies (this may take several minutes)..."

    if ! npm ci; then
        log_error "npm ci failed"
        exit 1
    fi

    log_success "Dependencies installed"
}

build_packages() {
    log_info "Building LibreChat packages..."

    local BUILD_COMMANDS=(
        "npm run build:data-provider"
        "npm run build:api"
        "npm run build:client-package"
    )

    for cmd in "${BUILD_COMMANDS[@]}"; do
        log_info "Running: $cmd"
        if ! $cmd; then
            log_error "Build command failed: $cmd"
            exit 1
        fi
    done

    log_success "All packages built successfully"
}
```

### Phase 4: Deployment Mode Selection
**Status**: ✅ Complete

#### 4.1 Mode Selection

```bash
select_deployment_mode() {
    echo ""
    log_info "Select deployment mode(s):"
    echo "  1) Native mode (MongoDB in Docker, app runs via npm)"
    echo "  2) Docker Compose mode (everything containerized)"
    echo "  3) Both modes"
    echo ""

    read -p "Enter choice [1-3]: " choice

    case $choice in
        1)
            SETUP_NATIVE=true
            SETUP_COMPOSE=false
            ;;
        2)
            SETUP_NATIVE=false
            SETUP_COMPOSE=true
            ;;
        3)
            SETUP_NATIVE=true
            SETUP_COMPOSE=true
            ;;
        *)
            log_error "Invalid choice"
            exit 1
            ;;
    esac
}
```

#### 4.2 Native Mode Setup

```bash
setup_native_mode() {
    log_info "=== Native Mode Setup ==="

    # Dependencies and build already done
    log_success "Native mode is ready"
    log_info "To start the application:"
    log_info "  Backend:  npm run backend:dev"
    log_info "  Frontend: npm run frontend:dev"
    log_info "  Or both:  npm run dev"
}
```

#### 4.3 Docker Compose Mode Setup

```bash
setup_docker_compose_mode() {
    log_info "=== Docker Compose Mode Setup ==="

    if [ ! -f "docker-compose.dev.yml" ]; then
        log_error "docker-compose.dev.yml not found"
        exit 1
    fi

    log_info "To start with Docker Compose:"
    log_info "  docker compose -f docker-compose.dev.yml up -d"
    log_success "Docker Compose mode is ready"
}
```

### Phase 5: Verification

#### 5.1 Verification Functions

```bash
verify_setup() {
    log_info "=== Verifying Installation ==="

    local failed=0

    # Check Node.js
    if check_command node && [ "$(node -v | cut -d'v' -f2 | cut -d'.' -f1)" -ge 20 ]; then
        log_success "✓ Node.js $(node -v)"
    else
        log_error "✗ Node.js 20+ required"
        ((failed++))
    fi

    # Check npm
    if check_command npm; then
        log_success "✓ npm $(npm -v)"
    else
        log_error "✗ npm not found"
        ((failed++))
    fi

    # Check Docker
    if check_command docker; then
        log_success "✓ Docker $(docker --version | grep -oP '\d+\.\d+\.\d+' | head -1)"
    else
        log_error "✗ Docker not found"
        ((failed++))
    fi

    # Check GitHub CLI
    if check_command gh; then
        log_success "✓ GitHub CLI $(gh --version | head -1 | awk '{print $3}')"
    else
        log_warn "✗ GitHub CLI not found (optional)"
    fi

    # Check MongoDB container
    if docker ps --format '{{.Names}}' | grep -q "librechat-mongo"; then
        log_success "✓ MongoDB container running"
    else
        log_error "✗ MongoDB container not running"
        ((failed++))
    fi

    # Check .env file
    if [ -f ".env" ]; then
        log_success "✓ .env file exists"
    else
        log_error "✗ .env file not found"
        ((failed++))
    fi

    # Check node_modules
    if [ -d "node_modules" ]; then
        log_success "✓ Dependencies installed"
    else
        log_error "✗ Dependencies not installed"
        ((failed++))
    fi

    if [ $failed -eq 0 ]; then
        log_success "All checks passed!"
        return 0
    else
        log_error "$failed check(s) failed"
        return 1
    fi
}

test_application() {
    if ! prompt_yes_no "Test that LibreChat starts correctly?" "y"; then
        log_info "Skipping application test"
        return 0
    fi

    log_info "=== Testing LibreChat Startup ==="

    log_info "Starting backend in background..."
    npm run backend:dev > /tmp/librechat-backend.log 2>&1 &
    local backend_pid=$!

    log_info "Starting frontend in background..."
    npm run frontend:dev > /tmp/librechat-frontend.log 2>&1 &
    local frontend_pid=$!

    # Wait for services to start
    log_info "Waiting for services to start (up to 60 seconds)..."
    local backend_ready=false
    local frontend_ready=false

    for i in {1..60}; do
        if ! $backend_ready && curl -s http://localhost:3080/api/health >/dev/null 2>&1; then
            backend_ready=true
            log_success "✓ Backend responding on port 3080"
        fi

        if ! $frontend_ready && curl -s http://localhost:3090 >/dev/null 2>&1; then
            frontend_ready=true
            log_success "✓ Frontend responding on port 3090"
        fi

        if $backend_ready && $frontend_ready; then
            break
        fi

        sleep 1
    done

    # Cleanup
    log_info "Stopping test processes..."
    kill $backend_pid $frontend_pid 2>/dev/null || true
    wait $backend_pid $frontend_pid 2>/dev/null || true

    if $backend_ready && $frontend_ready; then
        log_success "LibreChat started successfully!"
        return 0
    else
        log_error "LibreChat failed to start properly"
        log_info "Backend log: /tmp/librechat-backend.log"
        log_info "Frontend log: /tmp/librechat-frontend.log"
        return 1
    fi
}
```

### Phase 6: Main Script Flow

#### 6.1 Main Function

```bash
main() {
    echo "╔════════════════════════════════════════════════════╗"
    echo "║   LibreChat Development Environment Setup          ║"
    echo "║   For Ubuntu and Rocky Linux VDIs                  ║"
    echo "╚════════════════════════════════════════════════════╝"
    echo ""

    # Pre-checks
    if [ "$EUID" -eq 0 ]; then
        log_error "Please do not run this script as root"
        exit 1
    fi

    if [ ! -f "package.json" ]; then
        log_error "package.json not found. Please run from LibreChat root directory"
        exit 1
    fi

    # Detect OS
    detect_os

    # Install components
    log_info "=== Phase 1: Installing Prerequisites ==="
    install_nvm
    install_docker
    install_github_cli

    log_info "=== Phase 2: Setting Up MongoDB ==="
    setup_mongodb

    log_info "=== Phase 3: Configuring Project ==="
    setup_environment
    install_dependencies
    build_packages

    log_info "=== Phase 4: Deployment Configuration ==="
    select_deployment_mode

    if [ "$SETUP_NATIVE" = true ]; then
        setup_native_mode
    fi

    if [ "$SETUP_COMPOSE" = true ]; then
        setup_docker_compose_mode
    fi

    # Verification
    verify_setup
    test_application

    # Final summary
    echo ""
    echo "╔════════════════════════════════════════════════════╗"
    echo "║            Setup Complete!                         ║"
    echo "╚════════════════════════════════════════════════════╝"
    echo ""
    log_success "LibreChat development environment is ready!"
    echo ""
    log_info "Next steps:"
    if [ "$SETUP_NATIVE" = true ]; then
        echo "  Native mode:"
        echo "    npm run dev                  # Start both frontend and backend"
        echo "    npm run backend:dev          # Start backend only"
        echo "    npm run frontend:dev         # Start frontend only"
        echo ""
    fi
    if [ "$SETUP_COMPOSE" = true ]; then
        echo "  Docker Compose mode:"
        echo "    docker compose -f docker-compose.dev.yml up -d"
        echo "    docker compose -f docker-compose.dev.yml logs -f"
        echo ""
    fi
    echo "  Access LibreChat at: http://localhost:3090"
    echo ""
}

# Run main function
main "$@"
```

## Testing Framework

### Phase 7: Docker-Based Testing

**File:** `test-setup-script.sh`

```bash
#!/usr/bin/env bash
set -euo pipefail

# Test the setup script in clean Docker containers

test_ubuntu() {
    echo "=== Testing on Ubuntu ==="

    docker run --rm -it \
        -v "$(pwd):/workspace" \
        -w /workspace \
        --privileged \
        ubuntu:22.04 \
        bash -c "
            apt-get update && \
            apt-get install -y sudo curl git && \
            useradd -m -s /bin/bash testuser && \
            usermod -aG sudo testuser && \
            echo 'testuser ALL=(ALL) NOPASSWD:ALL' >> /etc/sudoers && \
            su - testuser -c 'cd /workspace && bash setup-dev-env.sh'
        "
}

test_rocky() {
    echo "=== Testing on Rocky Linux ==="

    docker run --rm -it \
        -v "$(pwd):/workspace" \
        -w /workspace \
        --privileged \
        rockylinux:9 \
        bash -c "
            dnf install -y sudo curl git && \
            useradd -m -s /bin/bash testuser && \
            usermod -aG wheel testuser && \
            echo 'testuser ALL=(ALL) NOPASSWD:ALL' >> /etc/sudoers && \
            su - testuser -c 'cd /workspace && bash setup-dev-env.sh'
        "
}

case "${1:-both}" in
    ubuntu)
        test_ubuntu
        ;;
    rocky)
        test_rocky
        ;;
    both)
        test_ubuntu
        test_rocky
        ;;
    *)
        echo "Usage: $0 [ubuntu|rocky|both]"
        exit 1
        ;;
esac
```

## File Structure

```
LibreChat/
├── setup-dev-env.sh              # Main setup script
├── test-setup-script.sh          # Testing harness
├── SETUP_SCRIPT_IMPLEMENTATION_PLAN.md  # This document
└── ... (existing files)
```

## Implementation Phases

### Phase 1: Core Framework (Days 1-2) ✅ COMPLETE

- [x] Script structure and utilities
- [x] OS detection
- [x] Component detection functions

### Phase 2: Installation Functions (Days 3-4) ✅ COMPLETE

- [x] Node.js/nvm installation
- [x] Docker installation (Ubuntu & Rocky)
- [x] GitHub CLI installation
- [x] MongoDB container setup

### Phase 3: Project Setup (Day 5) ✅ COMPLETE

- [x] Environment configuration
- [x] Dependency installation
- [x] Build process
- [x] Idempotency checks

### Phase 4: Deployment Modes (Day 6)

- [x] Mode selection interface
- [x] Native mode setup
- [x] Docker Compose mode setup

### Phase 5: Verification (Day 7)
**Status**: ✅ Complete

**Functions**:
- [x] `verify_setup()` - Comprehensive system verification
- [x] `test_application()` - Optional startup test

**Features**:
- Node.js version verification (v20+ requirement)
- npm, Docker, Docker Compose checks
- MongoDB container status and connectivity test
- .env file validation (critical variables)
- Dependencies and package builds verification
- Optional interactive application startup test
- Clear pass/fail reporting with actionable messages
- Graceful handling of optional components

### Phase 6: Testing Framework (Day 8)

- [ ] Docker test harness
- [ ] Ubuntu test
- [ ] Rocky Linux test
- [ ] Automated validation

### Phase 7: Documentation & Polish (Day 9-10)

- [ ] Usage documentation
- [ ] Error handling improvements
- [ ] User experience refinements
- [ ] Final testing and validation

## Success Criteria

1. ✅ Script runs successfully on fresh Ubuntu 20.04+ and Rocky Linux 8+
2. ✅ Script is idempotent and can be re-run safely
3. ✅ All components install and configure correctly
4. ✅ MongoDB container starts with authentication
5. ✅ .env file is created with proper configuration
6. ✅ JWT secrets are generated automatically
7. ✅ Dependencies install without errors
8. ✅ Build commands complete successfully
9. ✅ LibreChat starts and responds on ports 3080 and 3090
10. ✅ Both native and Docker Compose modes work
11. ✅ Test harness validates setup on both distributions
12. ✅ User prompts allow skipping or upgrading components

## Edge Cases & Considerations

1. **Network Issues**: Add retry logic for downloads
2. **Sudo Password**: May prompt for sudo password multiple times
3. **Docker Group**: Might require logout/login for group changes
4. **Port Conflicts**: Check if ports 3080, 3090, 27017 are available
5. **Disk Space**: Warn if insufficient disk space
6. **SELinux**: Handle SELinux on Rocky Linux for Docker data directory
7. **Existing Installations**: Detect and handle existing conflicting setups
8. **Environment Variables**: Ensure shell profile is updated for nvm
9. **Podman Conflicts**: Warn if Podman is detected

## Next Steps

Once approved, begin implementation starting with Phase 1. Each phase will be implemented, tested, and reviewed before proceeding to the next.
