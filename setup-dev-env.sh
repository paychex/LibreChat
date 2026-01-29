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

set -euo pipefail  # Exit on error, undefined vars, pipe failures

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
prompt_yes_no() {
    local prompt="$1"
    local default="${2:-n}"
    local response
    
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
    
    case "$OS" in
        ubuntu|debian)
            PKG_MANAGER="apt"
            PKG_UPDATE="sudo apt-get update"
            PKG_INSTALL="sudo apt-get install -y"
            ;;
        rocky|rhel|centos|fedora)
            PKG_MANAGER="dnf"
            PKG_UPDATE="sudo dnf check-update || true"
            PKG_INSTALL="sudo dnf install -y"
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
            $PKG_UPDATE
            $PKG_INSTALL "${missing_tools[@]}"
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
    if docker ps -a --format '{{.Names}}' | grep -q "^librechat-mongo$"; then
        if docker ps --format '{{.Names}}' | grep -q "^librechat-mongo$"; then
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
# Main Script Entry Point (Phase 1 - Framework Only)
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
    
    log_success "Phase 1: Core framework initialized successfully"
    log_info "Additional installation phases will be added in subsequent updates"
    
    echo ""
}

# Run main function
main "$@"
