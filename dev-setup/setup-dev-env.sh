#!/usr/bin/env bash
#
# LibreChat Development Environment Setup Script
# For Ubuntu and Rocky Linux VDIs
#
# This script automates the setup of a complete LibreChat development environment.
# It installs Node.js, Docker, MongoDB, and all required dependencies.
#
# Usage: bash setup-dev-env.sh
#
# Environment Variables:
#   CI=true              - Run in non-interactive CI mode
#   AUTOMATED_TEST=true  - Run in automated test mode (skip app testing)
#

set -euo pipefail  # Exit on error, undefined vars, pipe failures

#=============================================================#
# Script Directory Detection
#=============================================================#

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# If running from dev-setup directory, change to parent (LibreChat root)
if [[ "$SCRIPT_DIR" == */dev-setup ]]; then
    LIBRECHAT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
    cd "$LIBRECHAT_ROOT"
    echo "Detected script in dev-setup/, changing to LibreChat root: $LIBRECHAT_ROOT"
    echo ""
else
    # Script is in LibreChat root or somewhere else
    LIBRECHAT_ROOT="$SCRIPT_DIR"
fi

#=============================================================#
# Configuration
#=============================================================#

# Detect if running in CI/automated environment
if [ "${CI:-false}" = "true" ] || [ "${AUTOMATED_TEST:-false}" = "true" ]; then
    IS_AUTOMATED=true
else
    IS_AUTOMATED=false
fi

#=============================================================#
# Color Codes for Output
#=============================================================#

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

#=============================================================#
# Logging Functions
#=============================================================#

log_info() {
    echo -e "${BLUE}[INFO]${NC} $*"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $*"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $*"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $*"
}

log_step() {
    echo -e "${CYAN}[STEP]${NC} $*"
}

#=============================================================#
# Utility Functions
#=============================================================#

# Prompt user for yes/no confirmation
# Usage: prompt_yes_no "Question?" "y|n"
# Returns: 0 for yes, 1 for no
# In automated mode, returns the default
prompt_yes_no() {
    local prompt="$1"
    local default="${2:-n}"
    local response
    
    # In automated mode, use default without prompting
    if [ "$IS_AUTOMATED" = true ]; then
        case "${default,,}" in
            y|yes)
                return 0
                ;;
            *)
                return 1
                ;;
        esac
    fi
    
    if [[ "$default" == "y" ]]; then
        prompt="${prompt} [Y/n]: "
    else
        prompt="${prompt} [y/N]: "
    fi
    
    while true; do
        read -r -p "$prompt" response
        response="${response:-$default}"
        
        case "${response,,}" in
            y|yes)
                return 0
                ;;
            n|no)
                return 1
                ;;
            *)
                echo "Please answer yes or no."
                ;;
        esac
    done
}

# Check if a command exists
# Usage: check_command "docker"
# Returns: 0 if exists, 1 if not
check_command() {
    command -v "$1" >/dev/null 2>&1
}

# Compare semantic versions
# Usage: compare_versions "1.2.3" "1.2.0"
# Returns: 0 if $1 >= $2, 1 otherwise
compare_versions() {
    local version1="$1"
    local version2="$2"
    
    # Split versions into arrays
    IFS='.' read -ra ver1 <<< "$version1"
    IFS='.' read -ra ver2 <<< "$version2"
    
    # Compare each part
    for i in {0..2}; do
        local v1="${ver1[$i]:-0}"
        local v2="${ver2[$i]:-0}"
        
        if ((v1 > v2)); then
            return 0
        elif ((v1 < v2)); then
            return 1
        fi
    done
    
    # Versions are equal
    return 0
}

# Extract major version from version string
# Usage: get_major_version "20.11.0"
# Output: 20
get_major_version() {
    echo "$1" | cut -d'.' -f1 | sed 's/[^0-9]*//g'
}

# Check if running as root
is_root() {
    [ "$EUID" -eq 0 ]
}

# Check if a port is available
# Usage: check_port_available 3080
# Returns: 0 if available, 1 if in use
check_port_available() {
    local port="$1"
    if lsof -Pi ":$port" -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 1
    else
        return 0
    fi
}

#=============================================================#
# OS Detection
#=============================================================#

detect_os() {
    log_step "Detecting operating system..."
    
    if [ ! -f /etc/os-release ]; then
        log_error "Cannot detect OS: /etc/os-release not found"
        exit 1
    fi
    
    # Source the os-release file
    . /etc/os-release
    
    OS="${ID}"
    OS_VERSION="${VERSION_ID}"
    OS_NAME="${NAME}"
    
    # Determine sudo usage: use if available and not root
    local USE_SUDO=""
    if ! is_root && check_command sudo; then
        USE_SUDO="sudo"
    fi
    
    case "$OS" in
        ubuntu|debian)
            PKG_MANAGER="apt"
            PKG_UPDATE="$USE_SUDO apt-get update"
            PKG_INSTALL="$USE_SUDO apt-get install -y"
            ;;
        rocky|rhel|centos|fedora)
            PKG_MANAGER="dnf"
            PKG_UPDATE="$USE_SUDO dnf check-update || true"
            PKG_INSTALL="$USE_SUDO dnf install -y --allowerasing"
            ;;
        *)
            log_error "Unsupported operating system: $OS"
            log_error "This script supports Ubuntu and Rocky Linux only"
            exit 1
            ;;
    esac
    
    log_success "Detected: $OS_NAME $OS_VERSION"
    log_info "Package manager: $PKG_MANAGER"
}

#=============================================================#
# Dependency Checks
#=============================================================#

check_prerequisites() {
    log_step "Checking prerequisites..."
    
    # Check if running as root
    if is_root; then
        log_error "Please do not run this script as root"
        log_error "Run as a normal user with sudo privileges"
        exit 1
    fi
    
    # Check if in LibreChat directory (skip in test mode)
    if [ "${TEST_MODE:-0}" != "1" ] && [ ! -f "package.json" ]; then
        log_error "package.json not found"
        log_error "Please run this script from the LibreChat root directory"
        log_error "Tip: Run with TEST_MODE=1 to skip this check for testing"
        exit 1
    fi
    
    # Check for required system tools
    local required_tools=("curl" "git")
    local missing_tools=()
    
    for tool in "${required_tools[@]}"; do
        if ! check_command "$tool"; then
            missing_tools+=("$tool")
        fi
    done
    
    if [ ${#missing_tools[@]} -gt 0 ]; then
        log_warn "Missing required tools: ${missing_tools[*]}"
        if prompt_yes_no "Install missing tools?" "y"; then
            log_info "Installing: ${missing_tools[*]}"
            eval "$PKG_UPDATE"
            eval "$PKG_INSTALL ${missing_tools[*]}"
        else
            log_error "Required tools not installed. Exiting."
            exit 1
        fi
    fi
    
    log_success "Prerequisites check passed"
}

#=============================================================#
# Component Detection
#=============================================================#

detect_node() {
    if check_command node; then
        NODE_VERSION=$(node -v | sed 's/v//')
        NODE_MAJOR=$(get_major_version "$NODE_VERSION")
        log_info "Node.js $NODE_VERSION detected (major: $NODE_MAJOR)"
        return 0
    else
        log_info "Node.js not found"
        return 1
    fi
}

detect_npm() {
    if check_command npm; then
        NPM_VERSION=$(npm -v)
        log_info "npm $NPM_VERSION detected"
        return 0
    else
        log_info "npm not found"
        return 1
    fi
}

detect_nvm() {
    if [ -d "$HOME/.nvm" ] && [ -s "$HOME/.nvm/nvm.sh" ]; then
        log_info "nvm detected at $HOME/.nvm"
        return 0
    else
        log_info "nvm not found"
        return 1
    fi
}

detect_docker() {
    if check_command docker; then
        DOCKER_VERSION=$(docker --version | grep -oP '\d+\.\d+\.\d+' | head -1)
        DOCKER_MAJOR=$(get_major_version "$DOCKER_VERSION")
        log_info "Docker $DOCKER_VERSION detected (major: $DOCKER_MAJOR)"
        return 0
    else
        log_info "Docker not found"
        return 1
    fi
}

detect_docker_compose() {
    if docker compose version >/dev/null 2>&1; then
        DOCKER_COMPOSE_VERSION=$(docker compose version --short)
        log_info "Docker Compose $DOCKER_COMPOSE_VERSION detected"
        return 0
    else
        log_info "Docker Compose plugin not found"
        return 1
    fi
}

detect_github_cli() {
    if check_command gh; then
        GH_VERSION=$(gh --version | head -1 | awk '{print $3}')
        log_info "GitHub CLI $GH_VERSION detected"
        return 0
    else
        log_info "GitHub CLI not found"
        return 1
    fi
}

detect_mongodb_container() {
    # Check if docker command exists first
    if ! check_command docker; then
        log_info "MongoDB container not found"
        return 1
    fi
    
    if docker ps -a --format '{{.Names}}' 2>/dev/null | grep -q "^librechat-mongo$"; then
        if docker ps --format '{{.Names}}' 2>/dev/null | grep -q "^librechat-mongo$"; then
            log_info "MongoDB container detected (running)"
            return 0
        else
            log_info "MongoDB container detected (stopped)"
            return 0
        fi
    else
        log_info "MongoDB container not found"
        return 1
    fi
}

detect_podman() {
    if check_command podman; then
        log_warn "Podman detected on system"
        log_warn "This may cause conflicts with Docker"
        return 0
    else
        return 1
    fi
}

#=============================================================#
# System Information Display
#=============================================================#

display_system_info() {
    log_step "System Information"
    echo ""
    echo "  OS:              $OS_NAME $OS_VERSION"
    echo "  Package Manager: $PKG_MANAGER"
    echo "  User:            $USER"
    echo "  Home:            $HOME"
    echo "  Working Dir:     $(pwd)"
    echo ""
}

#=============================================================#
# Environment Detection Summary
#=============================================================#

detect_environment() {
    log_step "Detecting current environment..."
    echo ""
    
    # Node.js
    if detect_node; then
        echo "  ✓ Node.js $NODE_VERSION"
    else
        echo "  ✗ Node.js (not installed)"
    fi
    
    # npm
    if detect_npm; then
        echo "  ✓ npm $NPM_VERSION"
    else
        echo "  ✗ npm (not installed)"
    fi
    
    # nvm
    if detect_nvm; then
        echo "  ✓ nvm"
    else
        echo "  ✗ nvm (not installed)"
    fi
    
    # Docker
    if detect_docker; then
        echo "  ✓ Docker $DOCKER_VERSION"
    else
        echo "  ✗ Docker (not installed)"
    fi
    
    # Docker Compose
    if detect_docker_compose; then
        echo "  ✓ Docker Compose $DOCKER_COMPOSE_VERSION"
    else
        echo "  ✗ Docker Compose (not installed)"
    fi
    
    # GitHub CLI
    if detect_github_cli; then
        echo "  ✓ GitHub CLI $GH_VERSION"
    else
        echo "  ✗ GitHub CLI (not installed)"
    fi
    
    # MongoDB
    if detect_mongodb_container; then
        echo "  ✓ MongoDB container"
    else
        echo "  ✗ MongoDB container (not created)"
    fi
    
    # Check for Podman
    if detect_podman; then
        echo "  ⚠ Podman detected (may conflict with Docker)"
    fi
    
    echo ""
}

#=============================================================#
# Component Installation Functions
#=============================================================#

#-------------------------------------------------------------#
# Node.js via nvm
#-------------------------------------------------------------#

install_nvm() {
    local REQUIRED_NODE_VERSION="20"
    
    log_step "Installing/Configuring Node.js..."
    
    # Check if nvm exists
    if detect_nvm; then
        log_info "nvm already installed at $HOME/.nvm"
        
        # Source nvm
        export NVM_DIR="$HOME/.nvm"
        # Temporarily disable unbound variable check for nvm
        set +u
        [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
        
        # Add to current shell
        [ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"
        set -u
        
        # Check Node version
        if check_command node; then
            NODE_VERSION=$(node -v | sed 's/v//')
            local current_major=$(get_major_version "$NODE_VERSION")
            if [ "$current_major" -lt "$REQUIRED_NODE_VERSION" ]; then
                log_warn "Node.js version $NODE_VERSION is below required version $REQUIRED_NODE_VERSION.x"
                if prompt_yes_no "Install Node.js $REQUIRED_NODE_VERSION LTS?" "y"; then
                    log_info "Installing Node.js LTS..."
                    set +u
                    nvm install --lts
                    nvm use --lts
                    nvm alias default 'lts/*'
                    set -u
                else
                    log_warn "Skipping Node.js upgrade - this may cause issues"
                fi
            else
                log_success "Node.js $NODE_VERSION meets requirements (>= ${REQUIRED_NODE_VERSION}.0)"
                return 0
            fi
        else
            # nvm exists but no node installed
            log_info "Node.js not found - installing Node.js LTS..."
            set +u
            nvm install --lts
            nvm use --lts
            nvm alias default 'lts/*'
            set -u
        fi
    else
        log_info "nvm not found, installing..."
        
        # Download and install nvm
        log_info "Downloading nvm installer..."
        # Temporarily disable unbound variable check - nvm installer sources nvm.sh which has unset vars
        set +u
        curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
        
        # Source nvm for current session
        export NVM_DIR="$HOME/.nvm"
        [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
        [ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"
        # Re-enable strict mode
        set -u
        
        log_info "Installing Node.js LTS..."
        set +u
        nvm install --lts
        nvm use --lts
        nvm alias default 'lts/*'
        set -u
    fi
    
    # Verify installation
    if node -v && npm -v; then
        log_success "Node.js $(node -v) and npm $(npm -v) are ready"
    else
        log_error "Node.js installation failed"
        log_error "Try sourcing your shell profile: source ~/.bashrc (or ~/.zshrc)"
        exit 1
    fi
}

#-------------------------------------------------------------#
# Docker Installation
#-------------------------------------------------------------#

# Check if running inside a container
is_in_container() {
    # Check for /.dockerenv file (Docker)
    [ -f /.dockerenv ] && return 0
    
    # Check cgroup for docker/lxc
    [ -f /proc/1/cgroup ] && grep -qE 'docker|lxc|containerd' /proc/1/cgroup && return 0
    
    # Check if PID 1 is not systemd/init
    [ -f /proc/1/comm ] && ! grep -qE '^(systemd|init)$' /proc/1/comm && return 0
    
    return 1
}

# Check if Docker daemon is running and accessible
is_docker_running() {
    if ! check_command docker; then
        return 1
    fi
    
    # Try to connect to Docker daemon
    if docker info >/dev/null 2>&1; then
        return 0
    fi
    
    return 1
}

install_docker_ubuntu() {
    log_info "Installing Docker for Ubuntu..."
    
    # Install prerequisites
    sudo apt-get update
    sudo apt-get install -y ca-certificates curl
    sudo install -m 0755 -d /etc/apt/keyrings
    
    # Add Docker's official GPG key
    sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
    sudo chmod a+r /etc/apt/keyrings/docker.asc
    
    # Add Docker repository
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] \
      https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
      sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    # Install Docker
    sudo apt-get update
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
}

install_docker_rocky() {
    log_info "Installing Docker for Rocky Linux..."
    
    # Install dnf-plugins-core
    sudo dnf -y install dnf-plugins-core
    
    # Add Docker repository
    sudo dnf config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
    
    # Install Docker
    sudo dnf install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
}

configure_docker_service() {
    log_info "Configuring Docker service..."
    
    # Check if we're in a container environment
    if is_in_container; then
        log_warn "Running inside a container - skipping systemd service configuration"
        log_info "Docker is installed but not running (container limitation)"
        log_info "On a real VDI, Docker will start automatically"
        return 0
    fi
    
    # Enable and start Docker
    if ! sudo systemctl is-enabled docker >/dev/null 2>&1; then
        sudo systemctl enable docker
    fi
    
    if ! sudo systemctl is-active docker >/dev/null 2>&1; then
        sudo systemctl start docker
    fi
    
    log_success "Docker service is running"
}

configure_docker_user() {
    # Add user to docker group
    if ! groups "$USER" | grep -q '\bdocker\b'; then
        log_info "Adding $USER to docker group..."
        sudo usermod -aG docker "$USER"
        
        # In container or automated environments, skip the interactive group switch
        if is_in_container || [ "$IS_AUTOMATED" = true ]; then
            log_info "Docker group updated - changes will take effect on next login"
            return 0
        fi
        
        log_warn "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        log_warn "Docker group membership updated!"
        log_warn "You may need to log out and back in, or run:"
        log_warn "  newgrp docker"
        log_warn "for the changes to take effect in this session."
        log_warn "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        
        if prompt_yes_no "Apply group changes to current session with 'newgrp docker'?" "n"; then
            log_info "Applying group changes..."
            log_warn "Note: Script will restart with new group permissions"
            sleep 2
            # Use absolute path to avoid 'not found' errors with sg/newgrp
            exec sg docker "$(readlink -f "$0")" "$@"
        else
            log_info "Continuing without group change - Docker may require sudo"
        fi
    else
        log_success "User $USER is already in docker group"
    fi
}

install_docker() {
    local REQUIRED_DOCKER_VERSION="24"
    
    log_step "Installing/Configuring Docker..."
    
    # Check if Docker is already installed
    if detect_docker; then
        local docker_major=$(get_major_version "$DOCKER_VERSION")
        
        if [ "$docker_major" -ge "$REQUIRED_DOCKER_VERSION" ]; then
            log_success "Docker $DOCKER_VERSION is already installed (>= ${REQUIRED_DOCKER_VERSION}.0)"
            configure_docker_service
            configure_docker_user
            return 0
        else
            log_warn "Docker version $DOCKER_VERSION is below required version $REQUIRED_DOCKER_VERSION.0"
            if ! prompt_yes_no "Upgrade Docker?" "y"; then
                log_warn "Skipping Docker upgrade - this may cause issues"
                configure_docker_service
                configure_docker_user
                return 0
            fi
            # Continue with installation to upgrade
        fi
    fi
    
    # Check for Podman conflicts
    if detect_podman; then
        log_error "Podman is installed and may conflict with Docker"
        log_error "Please consult your team before proceeding"
        if ! prompt_yes_no "Continue anyway?" "n"; then
            exit 1
        fi
    fi
    
    # Install based on OS
    case "$PKG_MANAGER" in
        apt)
            install_docker_ubuntu
            ;;
        dnf)
            install_docker_rocky
            ;;
        *)
            log_error "Unsupported package manager: $PKG_MANAGER"
            exit 1
            ;;
    esac
    
    # Configure service and user
    configure_docker_service
    configure_docker_user
    
    # Verify installation
    if docker --version >/dev/null 2>&1; then
        DOCKER_VERSION=$(docker --version | grep -oP '\d+\.\d+\.\d+' | head -1)
        log_success "Docker $DOCKER_VERSION installed successfully"
        
        # Test Docker
        if docker run --rm hello-world >/dev/null 2>&1; then
            log_success "Docker is working correctly"
        else
            log_warn "Docker installed but may need additional configuration"
        fi
    else
        log_error "Docker installation failed"
        exit 1
    fi
}

#-------------------------------------------------------------#
# GitHub CLI Installation
#-------------------------------------------------------------#

install_github_cli_ubuntu() {
    log_info "Installing GitHub CLI for Ubuntu..."
    
    # Try snap first (most reliable)
    if check_command snap; then
        log_info "Using snap to install GitHub CLI..."
        sudo snap install gh
    else
        log_info "snap not available, using apt..."
        
        # Add GitHub CLI apt repository
        curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | \
            sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg 2>/dev/null
        sudo chmod go+r /usr/share/keyrings/githubcli-archive-keyring.gpg
        
        echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | \
            sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
        
        sudo apt-get update
        sudo apt-get install -y gh
    fi
}

install_github_cli_rocky() {
    log_info "Installing GitHub CLI for Rocky Linux..."
    
    sudo dnf install -y 'dnf-command(config-manager)'
    sudo dnf config-manager --add-repo https://cli.github.com/packages/rpm/gh-cli.repo
    sudo dnf install -y gh
}

install_github_cli() {
    log_step "Installing/Configuring GitHub CLI..."
    
    # Check if already installed
    if detect_github_cli; then
        log_success "GitHub CLI $GH_VERSION is already installed"
        return 0
    fi
    
    # Install based on OS
    case "$PKG_MANAGER" in
        apt)
            install_github_cli_ubuntu
            ;;
        dnf)
            install_github_cli_rocky
            ;;
        *)
            log_error "Unsupported package manager: $PKG_MANAGER"
            exit 1
            ;;
    esac
    
    # Verify installation
    if gh --version >/dev/null 2>&1; then
        GH_VERSION=$(gh --version | head -1 | awk '{print $3}')
        log_success "GitHub CLI $GH_VERSION installed successfully"
    else
        log_error "GitHub CLI installation failed"
        exit 1
    fi
}

#-------------------------------------------------------------#
# MongoDB Container Setup
#-------------------------------------------------------------#

setup_mongodb() {
    local MONGO_CONTAINER="librechat-mongo"
    local MONGO_VOLUME="librechat-mongo"
    local MONGO_USER="librechat"
    local MONGO_PASS="devpassword"
    local MONGO_VERSION="4.4"
    
    log_step "Setting up MongoDB container..."
    
    # Check if Docker daemon is accessible
    if ! is_docker_running; then
        log_error "Docker daemon is not running or not accessible"
        if is_in_container; then
            log_warn "This is expected in a basic container testing environment"
            log_info "On a real VDI, Docker will be running and MongoDB can be set up"
            log_info "Skipping MongoDB setup for now"
        else
            log_error "Please ensure Docker service is started:"
            log_error "  sudo systemctl start docker"
            log_error "Or check Docker installation"
        fi
        return 1
    fi
    
    # Check if container already exists
    if docker ps -a --format '{{.Names}}' 2>/dev/null | grep -q "^${MONGO_CONTAINER}$"; then
        log_info "MongoDB container already exists"
        
        # Check if it's running
        if docker ps --format '{{.Names}}' 2>/dev/null | grep -q "^${MONGO_CONTAINER}$"; then
            log_success "MongoDB is already running"
            return 0
        else
            log_warn "MongoDB container exists but is not running"
            if prompt_yes_no "Start MongoDB container?" "y"; then
                docker start "$MONGO_CONTAINER"
                sleep 2
                if docker ps --format '{{.Names}}' | grep -q "^${MONGO_CONTAINER}$"; then
                    log_success "MongoDB started successfully"
                    return 0
                else
                    log_error "Failed to start MongoDB container"
                    exit 1
                fi
            else
                log_warn "MongoDB container not started - application may not work"
                return 0
            fi
        fi
    fi
    
    # Check if volume exists
    if docker volume ls --format '{{.Name}}' 2>/dev/null | grep -q "^${MONGO_VOLUME}$"; then
        log_info "MongoDB volume '$MONGO_VOLUME' already exists"
        log_info "Existing data will be preserved"
    else
        log_info "Creating MongoDB volume '$MONGO_VOLUME'..."
        docker volume create "$MONGO_VOLUME"
    fi
    
    log_info "Starting MongoDB $MONGO_VERSION container..."
    log_info "Container name: $MONGO_CONTAINER"
    log_info "Credentials: ${MONGO_USER}/${MONGO_PASS} (for local development only)"
    
    docker run -d \
      --name "$MONGO_CONTAINER" \
      -p 27017:27017 \
      -v "${MONGO_VOLUME}:/data/db" \
      -e MONGO_INITDB_ROOT_USERNAME="$MONGO_USER" \
      -e MONGO_INITDB_ROOT_PASSWORD="$MONGO_PASS" \
      --restart unless-stopped \
      mongo:${MONGO_VERSION}
    
    # Wait for MongoDB to be ready
    log_info "Waiting for MongoDB to be ready (up to 30 seconds)..."
    local ready=false
    for i in {1..30}; do
        if docker exec "$MONGO_CONTAINER" mongosh \
            -u "$MONGO_USER" \
            -p "$MONGO_PASS" \
            --authenticationDatabase admin \
            --eval "db.runCommand({ping:1})" \
            --quiet >/dev/null 2>&1; then
            ready=true
            break
        fi
        sleep 1
        echo -n "."
    done
    echo ""
    
    if $ready; then
        log_success "MongoDB is ready and accepting connections"
        log_info "Connection string: mongodb://${MONGO_USER}:${MONGO_PASS}@localhost:27017/LibreChat?authSource=admin"
    else
        log_error "MongoDB failed to start properly"
        log_error "Container logs:"
        docker logs "$MONGO_CONTAINER"
        exit 1
    fi
}

#=============================================================#
# Project Setup Functions
#=============================================================#

#-------------------------------------------------------------#
# Docker Compose Override for VDI
#-------------------------------------------------------------#

setup_docker_compose_override() {
    local OVERRIDE_FILE="docker-compose.override.yml"
    
    log_step "Setting up Docker Compose override for VDI..."
    
    # Check if override file already exists
    if [ -f "$OVERRIDE_FILE" ]; then
        log_info "docker-compose.override.yml already exists"
        if ! prompt_yes_no "Recreate docker-compose.override.yml for VDI?" "n"; then
            log_info "Keeping existing docker-compose.override.yml"
            return 0
        fi
        local backup_file="${OVERRIDE_FILE}.backup.$(date +%Y%m%d_%H%M%S)"
        cp "$OVERRIDE_FILE" "$backup_file"
        log_success "Backup created: $backup_file"
    fi
    
    log_info "Creating docker-compose.override.yml for VDI environments..."
    
    cat > "$OVERRIDE_FILE" << 'EOF'
services:
  # Use MongoDB 4.4 for CPUs without AVX support (common in VDI environments)
  mongodb:
    image: mongo:4.4.18
    user: "0:0"  # Run as root to avoid permission issues
  
  # Fix Meilisearch permissions
  meilisearch:
    user: "0:0"  # Run as root to avoid permission issues
  
  # Mount the Paychex root certificate for RAG API (if exists)
  rag_api:
    volumes:
      - ./paychex-root.pem:/app/paychex-root.pem:ro
  
  # Mount the Paychex root certificate and config for LibreChat API
  api:
    volumes:
      - type: bind
        source: ./.env
        target: /app/.env
      - ./images:/app/client/public/images
      - ./uploads:/app/uploads
      - ./logs:/app/api/logs
      - ./paychex-root.pem:/app/paychex-root.pem:ro
      - ./librechat.yaml:/app/librechat.yaml:ro
EOF
    
    log_success "docker-compose.override.yml created"
    log_warn "Note: This configuration uses MongoDB 4.4.18 for VDIs without AVX support"
    log_info "If you have paychex-root.pem, place it in the LibreChat root directory"
}

#-------------------------------------------------------------#
# Environment Configuration
#-------------------------------------------------------------#

setup_environment() {
    local ENV_FILE=".env"
    local ENV_EXAMPLE=".env.example"
    
    log_step "Setting up environment configuration..."
    
    # Check if .env.example exists
    if [ ! -f "$ENV_EXAMPLE" ]; then
        log_error "$ENV_EXAMPLE not found"
        log_error "Are you in the LibreChat root directory?"
        exit 1
    fi
    
    # Check if .env already exists
    if [ -f "$ENV_FILE" ]; then
        log_warn ".env file already exists"
        echo ""
        log_info "Options:"
        echo "  1) Keep existing .env (recommended if you have custom settings)"
        echo "  2) Create backup and generate new .env"
        echo "  3) View differences between current and example"
        echo ""
        read -p "Enter choice [1-3] (default: 1): " env_choice
        env_choice="${env_choice:-1}"
        
        case "$env_choice" in
            1)
                log_info "Keeping existing .env file"
                return 0
                ;;
            2)
                local backup_file="${ENV_FILE}.backup.$(date +%Y%m%d_%H%M%S)"
                cp "$ENV_FILE" "$backup_file"
                log_success "Backup created: $backup_file"
                ;;
            3)
                log_info "Showing differences..."
                diff "$ENV_FILE" "$ENV_EXAMPLE" || true
                echo ""
                if ! prompt_yes_no "Create new .env file?" "n"; then
                    log_info "Keeping existing .env file"
                    return 0
                fi
                local backup_file="${ENV_FILE}.backup.$(date +%Y%m%d_%H%M%S)"
                cp "$ENV_FILE" "$backup_file"
                log_success "Backup created: $backup_file"
                ;;
            *)
                log_info "Keeping existing .env file"
                return 0
                ;;
        esac
    fi
    
    log_info "Creating .env file from template..."
    cp "$ENV_EXAMPLE" "$ENV_FILE"
    
    # Generate JWT secrets
    log_info "Generating JWT secrets..."
    if check_command openssl; then
        local JWT_SECRET=$(openssl rand -hex 32)
        local JWT_REFRESH_SECRET=$(openssl rand -hex 32)
        
        log_success "JWT secrets generated"
    else
        log_warn "openssl not found, using fallback method"
        local JWT_SECRET=$(cat /dev/urandom | tr -dc 'a-f0-9' | fold -w 64 | head -n 1)
        local JWT_REFRESH_SECRET=$(cat /dev/urandom | tr -dc 'a-f0-9' | fold -w 64 | head -n 1)
    fi
    
    # Update MongoDB URI
    local MONGO_URI="mongodb://librechat:devpassword@localhost:27017/LibreChat?authSource=admin"
    
    log_info "Configuring .env file..."
    
    # Update .env file with sed (Linux-compatible)
    sed -i.bak "s|^#\?MONGO_URI=.*|MONGO_URI=${MONGO_URI}|" "$ENV_FILE" 2>/dev/null || \
        sed -i '' "s|^#\?MONGO_URI=.*|MONGO_URI=${MONGO_URI}|" "$ENV_FILE"
    
    sed -i.bak "s|^#\?JWT_SECRET=.*|JWT_SECRET=${JWT_SECRET}|" "$ENV_FILE" 2>/dev/null || \
        sed -i '' "s|^#\?JWT_SECRET=.*|JWT_SECRET=${JWT_SECRET}|" "$ENV_FILE"
    
    sed -i.bak "s|^#\?JWT_REFRESH_SECRET=.*|JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}|" "$ENV_FILE" 2>/dev/null || \
        sed -i '' "s|^#\?JWT_REFRESH_SECRET=.*|JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}|" "$ENV_FILE"
    
    # Clean up backup files created by sed
    rm -f "${ENV_FILE}.bak"
    
    log_success ".env file configured successfully"
    log_info "MongoDB URI: mongodb://librechat:***@localhost:27017/LibreChat"
    log_info "JWT secrets: Generated automatically"
    
    # VDI-specific warnings
    echo ""
    log_warn "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    log_warn "For Paychex VDI environments, additional configuration required:"
    log_warn "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "  1. Azure OpenAI Configuration:"
    echo "     AZURE_OPENAI_API_KEY=<your-key>"
    echo "     AZURE_OPENAI_BASEURL=https://consult-internal-documentationopenai/deployments/\${DEPLOYMENT_NAME}"
    echo "     OPENAI_API_VERSION=2024-02-01"
    echo ""
    echo "  2. SSL Certificate Configuration (for corporate proxy):"
    echo "     NODE_EXTRA_CA_CERTS=//app/paychex-root.pem"
    echo "     SSL_CERT_FILE=/app/paychex-root.pem"
    echo "     REQUESTS_CA_BUNDLE=/app/paychex-root.pem"
    echo "     CURL_CA_BUNDLE=/app/paychex-root.pem"
    echo ""
    echo "  3. RAG Configuration (if using Azure embeddings):"
    echo "     RAG_AZURE_OPENAI_API_KEY=<your-key>"
    echo "     RAG_AZURE_OPENAI_ENDPOINT=https://consult-internal-documentation"
    echo "     EMBEDDINGS_PROVIDER=azure"
    echo "     EMBEDDINGS_MODEL=text-embedding-ada-002"
    echo ""
    echo "  4. OpenID/SSO Configuration (if using Paychex SSO):"
    echo "     OPENID_CLIENT_ID=<your-client-id>"
    echo "     OPENID_CLIENT_SECRET=<your-secret>"
    echo "     OPENID_ISSUER=https://consult-internal-documentation"
    echo ""
    log_info "Consult with your team for the specific values above"
    log_info "You can manually edit .env file to add these configurations"
    echo ""
}

#-------------------------------------------------------------#
# Dependency Installation
#-------------------------------------------------------------#

install_dependencies() {
    log_step "Installing npm dependencies..."
    
    # Configure npm to use system CA certificates (for corporate SSL inspection)
    local system_ca_bundle="/etc/ssl/certs/ca-certificates.crt"
    if [ -f "$system_ca_bundle" ]; then
        log_info "Configuring npm to use system CA certificates..."
        npm config set cafile "$system_ca_bundle"
        
        # Also set NODE_EXTRA_CA_CERTS for Node.js itself
        export NODE_EXTRA_CA_CERTS="$system_ca_bundle"
        log_info "SSL certificates configured for corporate network"
    fi
    
    # Check if node_modules exists and has content
    if [ -d "node_modules" ] && [ "$(ls -A node_modules 2>/dev/null)" ]; then
        log_info "node_modules directory exists"
        
        # Check if package-lock.json is in sync
        if [ -f "package-lock.json" ]; then
            log_info "Checking if dependencies are up to date..."
            # For simplicity, we'll offer to reinstall
            if prompt_yes_no "Reinstall dependencies to ensure they're up to date?" "n"; then
                log_info "Removing existing node_modules..."
                rm -rf node_modules
            else
                log_info "Skipping dependency installation"
                return 0
            fi
        fi
    fi
    
    log_info "Installing dependencies (this may take 5-10 minutes)..."
    log_info "Using 'npm ci' for reproducible builds..."
    
    # Run npm ci with progress indication
    if npm ci; then
        log_success "Dependencies installed successfully"
    else
        log_error "npm ci failed"
        log_error "Try running manually: npm ci"
        exit 1
    fi
}

#-------------------------------------------------------------#
# Build Packages
#-------------------------------------------------------------#

build_packages() {
    log_step "Building LibreChat packages..."
    
    # Clean up any existing build artifacts that may have permission issues
    # (can happen if previously built in a container as root)
    log_info "Cleaning previous build artifacts..."
    rm -rf packages/data-provider/dist packages/api/dist packages/client/dist 2>/dev/null || {
        log_warn "Some build artifacts couldn't be deleted (permission denied)"
        log_warn "This can happen if files were created by a container run as root"
        if is_root; then
            log_info "Running as root, forcing cleanup..."
            rm -rf packages/data-provider/dist packages/api/dist packages/client/dist
        else
            log_warn "Try running: sudo rm -rf packages/data-provider/dist packages/api/dist packages/client/dist"
            if prompt_yes_no "Attempt to clean with sudo?" "y"; then
                sudo rm -rf packages/data-provider/dist packages/api/dist packages/client/dist
            else
                log_error "Cannot proceed with build - existing artifacts are in the way"
                return 1
            fi
        fi
    }
    
    # Build commands based on package.json
    local BUILD_COMMANDS=(
        "build:data-provider"
        "build:api"
        "build:client-package"
    )
    
    log_info "Building packages (this may take a few minutes)..."
    
    for cmd in "${BUILD_COMMANDS[@]}"; do
        log_info "Running: npm run $cmd"
        
        if npm run "$cmd"; then
            log_success "✓ $cmd completed"
        else
            log_error "✗ $cmd failed"
            log_error "Try running manually: npm run $cmd"
            exit 1
        fi
        echo ""
    done
    
    log_success "All packages built successfully"
}

#=============================================================#
# Deployment Mode Selection & Setup
#=============================================================#

#-------------------------------------------------------------#
# Mode Selection Interface
#-------------------------------------------------------------#

select_deployment_mode() {
    log_step "Selecting deployment mode..."
    
    # In automated mode, default to native mode
    if [ "$IS_AUTOMATED" = true ]; then
        SETUP_NATIVE=true
        SETUP_COMPOSE=false
        log_info "Automated mode: Selected Native mode (default)"
        return 0
    fi
    
    echo ""
    log_info "LibreChat can be run in different modes:"
    echo ""
    echo "  1) Native mode (Recommended for development)"
    echo "     - MongoDB runs in Docker"
    echo "     - Application runs via npm (hot reload enabled)"
    echo "     - Best for active development and debugging"
    echo ""
    echo "  2) Docker Compose mode"
    echo "     - Everything runs in containers"
    echo "     - Good for testing production-like environment"
    echo "     - Requires docker-compose.dev.yml"
    echo ""
    echo "  3) Both modes"
    echo "     - Sets up both options"
    echo "     - You can choose which to use later"
    echo ""
    
    read -p "Enter choice [1-3] (default: 1): " mode_choice
    mode_choice="${mode_choice:-1}"
    
    case "$mode_choice" in
        1)
            SETUP_NATIVE=true
            SETUP_COMPOSE=false
            log_info "Selected: Native mode"
            ;;
        2)
            SETUP_NATIVE=false
            SETUP_COMPOSE=true
            log_info "Selected: Docker Compose mode"
            ;;
        3)
            SETUP_NATIVE=true
            SETUP_COMPOSE=true
            log_info "Selected: Both modes"
            ;;
        *)
            log_warn "Invalid choice, defaulting to Native mode"
            SETUP_NATIVE=true
            SETUP_COMPOSE=false
            ;;
    esac
    
    echo ""
}

#-------------------------------------------------------------#
# Native Mode Setup
#-------------------------------------------------------------#

setup_native_mode() {
    log_step "Configuring Native Mode..."
    
    log_info "Native mode uses:"
    echo "  • MongoDB in Docker (already set up)"
    echo "  • Node.js application running directly via npm"
    echo "  • Hot Module Replacement (HMR) for rapid development"
    echo ""
    
    # Check if MongoDB is running
    if ! docker ps --format '{{.Names}}' | grep -q "^librechat-mongo$"; then
        log_warn "MongoDB container is not running"
        log_info "Start it with: docker start librechat-mongo"
    fi
    
    log_success "Native mode is ready!"
    echo ""
    log_info "To start LibreChat in native mode:"
    echo ""
    echo "  Option 1: Start both frontend and backend together"
    echo "    $ npm run dev"
    echo ""
    echo "  Option 2: Start them separately (recommended for debugging)"
    echo "    Terminal 1: $ npm run backend:dev"
    echo "    Terminal 2: $ npm run frontend:dev"
    echo ""
    echo "  Access the application:"
    echo "    Frontend: http://localhost:3090"
    echo "    Backend:  http://localhost:3080"
    echo ""
}

#-------------------------------------------------------------#
# Docker Compose Mode Setup
#-------------------------------------------------------------#

setup_docker_compose_mode() {
    log_step "Configuring Docker Compose Mode..."
    
    # Check if docker-compose.yml exists
    if [ ! -f "docker-compose.yml" ]; then
        log_error "docker-compose.yml not found in repository"
        log_error "Docker Compose mode requires this file"
        log_warn "Skipping Docker Compose setup"
        return 1
    fi
    
    log_info "Docker Compose mode uses:"
    echo "  • All services containerized"
    echo "  • Production-like environment"
    echo "  • Defined in docker-compose.yml"
    echo ""
    
    # Check if there's a conflict with existing MongoDB
    if docker ps --format '{{.Names}}' 2>/dev/null | grep -q "^librechat-mongo$"; then
        log_warn "Standalone MongoDB container is running"
        log_info "Docker Compose will manage its own MongoDB instance"
        log_info "You may want to stop the standalone container:"
        echo "    $ docker stop librechat-mongo"
        echo ""
    fi
    
    log_success "Docker Compose mode is ready!"
    echo ""
    log_info "To start LibreChat with Docker Compose:"
    echo ""
    echo "  Start services:"
    echo "    $ docker compose up -d"
    echo ""
    echo "  View logs:"
    echo "    $ docker compose logs -f"
    echo ""
    echo "  Stop services:"
    echo "    $ docker compose down"
    echo ""
    echo "  Access the application:"
    echo "    http://localhost:3090"
    echo ""
}

#=============================================================#
# Verification and Testing
#=============================================================#

#-------------------------------------------------------------#
# System Verification
#-------------------------------------------------------------#

verify_setup() {
    log_step "Verifying installation..."
    
    local failed=0
    echo ""
    log_info "Checking installed components:"
    echo ""
    
    # Check Node.js version
    if check_command node; then
        local node_version=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
        if [ "$node_version" -ge 20 ]; then
            log_success "✓ Node.js $(node -v) (meets v20+ requirement)"
        else
            log_error "✗ Node.js version $node_version is below required v20+"
            ((failed++))
        fi
    else
        log_error "✗ Node.js not found"
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
        local docker_version=$(docker --version 2>/dev/null | grep -oP '\d+\.\d+\.\d+' | head -1)
        log_success "✓ Docker $docker_version"
    else
        log_error "✗ Docker not found"
        ((failed++))
    fi
    
    # Check Docker Compose
    if docker compose version >/dev/null 2>&1; then
        local compose_version=$(docker compose version 2>/dev/null | grep -oP '\d+\.\d+\.\d+' | head -1)
        log_success "✓ Docker Compose $compose_version"
    else
        log_warn "⚠ Docker Compose not available (optional)"
    fi
    
    # Check GitHub CLI
    if check_command gh; then
        local gh_version=$(gh --version 2>/dev/null | head -1 | awk '{print $3}')
        log_success "✓ GitHub CLI $gh_version"
    else
        log_warn "⚠ GitHub CLI not found (optional for development)"
    fi
    
    # Check MongoDB container
    if ! is_docker_running; then
        log_warn "⚠ Docker daemon not running - cannot check MongoDB"
        if is_in_container; then
            log_info "  This is expected in container testing environments"
        fi
    elif docker ps --format '{{.Names}}' 2>/dev/null | grep -q "^librechat-mongo$"; then
        log_success "✓ MongoDB container running"
        
        # Test MongoDB connectivity
        if docker exec librechat-mongo mongosh \
            -u librechat \
            -p devpassword \
            --authenticationDatabase admin \
            --eval "db.runCommand({ping:1})" \
            --quiet >/dev/null 2>&1; then
            log_success "✓ MongoDB connection verified"
        else
            log_warn "⚠ MongoDB container running but connection test failed"
        fi
    elif docker ps -a --format '{{.Names}}' 2>/dev/null | grep -q "^librechat-mongo$"; then
        log_warn "⚠ MongoDB container exists but is not running"
        log_info "  Start it with: docker start librechat-mongo"
    else
        if is_in_container && ! is_docker_running; then
            log_warn "⚠ MongoDB not set up (Docker daemon unavailable)"
        else
            log_warn "⚠ MongoDB container not found"
            log_info "  On a VDI, run: docker start librechat-mongo"
        fi
    fi
    
    # Check .env file
    if [ -f ".env" ]; then
        log_success "✓ .env file exists"
        
        # Check for critical env vars
        if grep -q "^MONGO_URI=" ".env" && \
           grep -q "^JWT_SECRET=" ".env" && \
           grep -q "^JWT_REFRESH_SECRET=" ".env"; then
            log_success "✓ Critical environment variables configured"
        else
            log_warn "⚠ Some required environment variables may be missing"
        fi
    else
        log_error "✗ .env file not found"
        ((failed++))
    fi
    
    # Check node_modules
    if [ -d "node_modules" ]; then
        log_success "✓ Root dependencies installed"
    else
        log_error "✗ Root dependencies not installed"
        ((failed++))
    fi
    
    # Check package builds
    local packages_ok=true
    for pkg in "packages/data-provider" "api" "client"; do
        if [ ! -d "$pkg/node_modules" ]; then
            log_warn "⚠ $pkg dependencies may be missing"
            packages_ok=false
        fi
    done
    
    if [ "$packages_ok" = true ]; then
        log_success "✓ Package dependencies installed"
    fi
    
    echo ""
    if [ $failed -eq 0 ]; then
        log_success "All critical checks passed! ✓"
        return 0
    else
        log_error "$failed critical check(s) failed"
        log_warn "Please review the errors above and re-run the script if needed"
        return 1
    fi
}

#-------------------------------------------------------------#
# Application Startup Test
#-------------------------------------------------------------#

test_application() {
    log_step "Testing application startup (optional)..."
    
    # Check if MongoDB is available
    if ! is_docker_running || ! docker ps --format '{{.Names}}' 2>/dev/null | grep -q "^librechat-mongo$"; then
        log_warn "MongoDB container is not running"
        log_info "Skipping application test (requires MongoDB)"
        log_info "On a real VDI, you can test with: npm run dev"
        return 0
    fi
    
    if ! prompt_yes_no "Start LibreChat to verify it works?" "n"; then
        log_info "Skipping application test"
        log_info "You can manually test later with: npm run dev"
        return 0
    fi
    
    echo ""
    log_info "This will start both frontend and backend servers"
    log_info "Press Ctrl+C to stop the test"
    echo ""
    
    if ! prompt_yes_no "Continue with startup test?" "y"; then
        return 0
    fi
    
    echo ""
    log_info "Starting LibreChat in development mode..."
    log_info "This may take 30-60 seconds for initial compilation..."
    echo ""
    log_warn "Watch for the following messages:"
    echo "  - Backend:  'Server listening at http://localhost:3080'"
    echo "  - Frontend: 'Local: http://localhost:3090/'"
    echo ""
    log_info "Press Ctrl+C when you see both services running"
    echo ""
    
    sleep 3
    
    # Start in foreground so user can see output and Ctrl+C
    npm run dev || {
        log_error "Failed to start LibreChat"
        log_info "Common issues:"
        echo "  - MongoDB not running: docker start librechat-mongo"
        echo "  - Port conflicts: Check if 3080 or 3090 are in use"
        echo "  - Missing dependencies: npm ci"
        return 1
    }
    
    echo ""
    log_success "Application test completed"
    return 0
}

#=============================================================#
# Main Script Entry Point
#=============================================================#

main() {
    echo "╔═══════════════════════════════════════════════════════╗"
    echo "║   LibreChat Development Environment Setup             ║"
    echo "║   For Ubuntu and Rocky Linux VDIs                     ║"
    echo "╚═══════════════════════════════════════════════════════╝"
    echo ""
    
    # Run detection and checks
    detect_os
    check_prerequisites
    display_system_info
    detect_environment
    
    # Phase 2: Install components
    echo ""
    log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    log_info "Phase 2: Installing Prerequisites"
    log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    
    install_nvm
    echo ""
    
    install_docker
    echo ""
    
    install_github_cli
    echo ""
    
    # Setup MongoDB - may skip if Docker daemon not available
    if ! setup_mongodb; then
        log_warn "MongoDB setup skipped - application testing will be limited"
        MONGODB_AVAILABLE=false
    else
        MONGODB_AVAILABLE=true
    fi
    echo ""
    
    log_success "Phase 2: Prerequisites installation complete!"
    echo ""
    
    # Phase 3: Project Setup
    log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    log_info "Phase 3: Project Configuration"
    log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    
    setup_environment
    echo ""
    
    setup_docker_compose_override
    echo ""
    
    install_dependencies
    echo ""
    
    build_packages
    echo ""
    
    log_success "Phase 3: Project configuration complete!"
    echo ""
    
    # Phase 4: Deployment Mode Selection
    log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    log_info "Phase 4: Deployment Mode Selection"
    log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    
    select_deployment_mode
    
    if [ "$SETUP_NATIVE" = true ]; then
        setup_native_mode
    fi
    
    if [ "$SETUP_COMPOSE" = true ]; then
        setup_docker_compose_mode
    fi
    
    log_success "Phase 4: Deployment mode configuration complete!"
    echo ""
    
    # Phase 5: Verification and Testing
    log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    log_info "Phase 5: Verification and Testing"
    log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    
    verify_setup
    echo ""
    
    test_application
    echo ""
    
    #---------------------------------------------------------#
    # Setup Complete
    #---------------------------------------------------------#
    
    echo ""
    log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    log_success "🎉 Setup Complete! 🎉"
    log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    log_success "LibreChat development environment is ready!"
    echo ""
    log_info "Next steps:"
    echo ""
    
    if [ "$SETUP_NATIVE" = true ]; then
        echo "  Native Mode:"
        echo "    1. Start MongoDB: docker start librechat-mongo"
        echo "    2. Start LibreChat: npm run dev"
        echo "    3. Open: http://localhost:3090"
        echo ""
    fi
    
    if [ "$SETUP_COMPOSE" = true ] && [ -f "docker-compose.dev.yml" ]; then
        echo "  Docker Compose Mode:"
        echo "    1. Start services: docker compose -f docker-compose.dev.yml up -d"
        echo "    2. View logs: docker compose -f docker-compose.dev.yml logs -f"
        echo "    3. Open: http://localhost:3090"
        echo ""
    fi
    
    log_info "Documentation:"
    echo "  - Project README: cat README.md"
    echo "  - Environment variables: cat .env"
    echo "  - MongoDB logs: docker logs librechat-mongo"
    echo ""
    log_info "Troubleshooting:"
    echo "  - Re-run this script if anything fails"
    echo "  - Check MongoDB: docker ps | grep librechat-mongo"
    echo "  - Rebuild packages: npm run build:all"
    
    echo ""
}

# Run main function
main "$@"
