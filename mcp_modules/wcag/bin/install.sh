#!/bin/bash

# WCAG Module Installation Script
# Installs Pa11y CLI and system dependencies for macOS, Linux, and Windows (via WSL)

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Detect operating system
detect_os() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        OS="macos"
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        OS="linux"
        # Detect Linux distribution
        if [ -f /etc/os-release ]; then
            . /etc/os-release
            DISTRO=$ID
        elif [ -f /etc/redhat-release ]; then
            DISTRO="rhel"
        elif [ -f /etc/debian_version ]; then
            DISTRO="debian"
        else
            DISTRO="unknown"
        fi
    elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]] || [[ -n "$WSL_DISTRO_NAME" ]]; then
        OS="windows"
        if [[ -n "$WSL_DISTRO_NAME" ]]; then
            log_info "Detected WSL environment: $WSL_DISTRO_NAME"
            # Treat WSL as Linux for package installation
            OS="linux"
            . /etc/os-release
            DISTRO=$ID
        fi
    else
        OS="unknown"
    fi
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check if Node.js is installed
check_node_installed() {
    if command_exists node; then
        NODE_VERSION=$(node --version)
        log_success "Node.js is installed: $NODE_VERSION"
        
        # Check if version is >= 18
        NODE_MAJOR_VERSION=$(echo $NODE_VERSION | cut -d'.' -f1 | sed 's/v//')
        if [ "$NODE_MAJOR_VERSION" -ge 18 ]; then
            return 0
        else
            log_warning "Node.js version $NODE_VERSION is too old. Pa11y requires Node.js >= 18"
            return 1
        fi
    else
        log_warning "Node.js is not installed"
        return 1
    fi
}

# Install Node.js on macOS
install_node_macos() {
    log_info "Installing Node.js on macOS..."
    
    if command_exists brew; then
        log_info "Using Homebrew to install Node.js..."
        brew install node
    else
        log_warning "Homebrew not found. Please install Node.js manually:"
        log_info "1. Download Node.js from: https://nodejs.org/"
        log_info "2. Or install Homebrew first: /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
        return 1
    fi
}

# Install Node.js on Ubuntu/Debian
install_node_debian() {
    log_info "Installing Node.js on Ubuntu/Debian..."
    
    # Update package list
    sudo apt update
    
    # Install Node.js 18.x
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
}

# Install Node.js on CentOS/RHEL/Fedora
install_node_rhel() {
    log_info "Installing Node.js on CentOS/RHEL/Fedora..."
    
    # Install Node.js 18.x
    curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
    
    if command_exists dnf; then
        sudo dnf install -y nodejs npm
    elif command_exists yum; then
        sudo yum install -y nodejs npm
    else
        log_error "Neither dnf nor yum package manager found"
        return 1
    fi
}

# Check if Chrome/Chromium is already installed
check_chrome_installed() {
    if command_exists google-chrome || command_exists google-chrome-stable; then
        log_success "Google Chrome is already installed"
        google-chrome --version 2>/dev/null || google-chrome-stable --version 2>/dev/null
        return 0
    elif command_exists chromium || command_exists chromium-browser; then
        log_success "Chromium is already installed"
        chromium --version 2>/dev/null || chromium-browser --version 2>/dev/null
        return 0
    else
        return 1
    fi
}

# Install Chrome on macOS
install_chrome_macos() {
    log_info "Installing Chrome on macOS..."
    
    if command_exists brew; then
        log_info "Using Homebrew to install Chrome..."
        brew install --cask google-chrome
    else
        log_warning "Homebrew not found. Please install Chrome manually:"
        log_info "1. Download Chrome from: https://www.google.com/chrome/"
        return 1
    fi
}

# Install Chrome on Ubuntu/Debian
install_chrome_debian() {
    log_info "Installing Chrome on Ubuntu/Debian..."
    
    # Update package list
    sudo apt update
    
    # Install dependencies
    sudo apt install -y wget gnupg ca-certificates
    
    # Add Google Chrome repository
    wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | sudo apt-key add -
    echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" | sudo tee /etc/apt/sources.list.d/google-chrome.list
    
    # Update package list and install Chrome
    sudo apt update
    sudo apt install -y google-chrome-stable
    
    # Install additional dependencies for headless Chrome
    sudo apt install -y \
        libnss3 \
        libatk-bridge2.0-0 \
        libdrm2 \
        libxcomposite1 \
        libxdamage1 \
        libxrandr2 \
        libgbm1 \
        libxss1 \
        libasound2
}

# Install Chrome on CentOS/RHEL/Fedora
install_chrome_rhel() {
    log_info "Installing Chrome on CentOS/RHEL/Fedora..."
    
    # Create Chrome repository file
    sudo tee /etc/yum.repos.d/google-chrome.repo > /dev/null <<EOF
[google-chrome]
name=google-chrome
baseurl=http://dl.google.com/linux/chrome/rpm/stable/x86_64
enabled=1
gpgcheck=1
gpgkey=https://dl.google.com/linux/linux_signing_key.pub
EOF
    
    # Install Chrome
    if command_exists dnf; then
        sudo dnf install -y google-chrome-stable
    elif command_exists yum; then
        sudo yum install -y google-chrome-stable
    else
        log_error "Neither dnf nor yum package manager found"
        return 1
    fi
}

# Install Chromium as fallback
install_chromium_fallback() {
    log_info "Installing Chromium as fallback..."
    
    case $DISTRO in
        ubuntu|debian)
            sudo apt update
            sudo apt install -y chromium-browser
            ;;
        fedora)
            sudo dnf install -y chromium
            ;;
        centos|rhel)
            # Enable EPEL repository first
            sudo yum install -y epel-release
            sudo yum install -y chromium
            ;;
        arch)
            sudo pacman -S --noconfirm chromium
            ;;
        *)
            log_error "Unsupported Linux distribution for automatic Chromium installation"
            return 1
            ;;
    esac
}

# Check if Pa11y is installed
check_pa11y_installed() {
    if command_exists pa11y; then
        PA11Y_VERSION=$(pa11y --version)
        log_success "Pa11y is already installed: v$PA11Y_VERSION"
        return 0
    else
        return 1
    fi
}

# Install Pa11y globally
install_pa11y() {
    log_info "Installing Pa11y CLI globally..."
    
    if command_exists npm; then
        npm install -g pa11y
    elif command_exists yarn; then
        yarn global add pa11y
    elif command_exists pnpm; then
        pnpm add -g pa11y
    else
        log_error "No Node.js package manager found (npm, yarn, or pnpm)"
        return 1
    fi
}

# Install Node.js dependencies for the module
install_node_dependencies() {
    log_info "Installing Node.js dependencies for WCAG module..."
    
    if [ ! -f "package.json" ]; then
        log_error "package.json not found. Please run this script from the wcag module directory."
        return 1
    fi
    
    if command_exists npm; then
        npm install
    elif command_exists yarn; then
        yarn install
    elif command_exists pnpm; then
        pnpm install
    else
        log_error "No Node.js package manager found (npm, yarn, or pnpm)"
        return 1
    fi
}

# Test Pa11y installation
test_pa11y() {
    log_info "Testing Pa11y installation..."
    
    if ! command_exists pa11y; then
        log_error "Pa11y command not found"
        return 1
    fi
    
    # Test Pa11y with a simple URL
    log_info "Running Pa11y test on example.com..."
    if pa11y --standard WCAG2AA --reporter json https://example.com > /dev/null 2>&1; then
        log_success "Pa11y test passed successfully"
    else
        log_warning "Pa11y test failed, but Pa11y is installed. This might be due to network issues."
    fi
}

# Main installation function
main() {
    echo "=============================================="
    echo "    WCAG Module Installation Script"
    echo "=============================================="
    echo
    
    # Detect operating system
    detect_os
    log_info "Detected OS: $OS"
    if [ "$OS" = "linux" ]; then
        log_info "Detected Linux distribution: $DISTRO"
    fi
    echo
    
    # Check and install Node.js if needed
    if ! check_node_installed; then
        log_info "Installing Node.js..."
        
        case $OS in
            macos)
                if ! install_node_macos; then
                    log_error "Failed to install Node.js on macOS"
                    exit 1
                fi
                ;;
            linux)
                case $DISTRO in
                    ubuntu|debian)
                        install_node_debian
                        ;;
                    fedora|centos|rhel)
                        install_node_rhel
                        ;;
                    *)
                        log_error "Unsupported Linux distribution for automatic Node.js installation"
                        log_info "Please install Node.js manually from: https://nodejs.org/"
                        exit 1
                        ;;
                esac
                ;;
            windows)
                log_warning "Windows detected. Please install Node.js manually:"
                log_info "Download from: https://nodejs.org/"
                exit 1
                ;;
            *)
                log_error "Unsupported operating system: $OSTYPE"
                exit 1
                ;;
        esac
    fi
    
    echo
    
    # Check if Chrome is already installed
    if check_chrome_installed; then
        log_info "Chrome/Chromium is already available"
    else
        log_info "Chrome/Chromium not found, installing..."
        
        case $OS in
            macos)
                if ! install_chrome_macos; then
                    log_warning "Chrome installation failed, Pa11y will use system browser"
                fi
                ;;
            linux)
                case $DISTRO in
                    ubuntu|debian)
                        if ! install_chrome_debian; then
                            log_warning "Chrome installation failed, trying Chromium..."
                            install_chromium_fallback
                        fi
                        ;;
                    fedora|centos|rhel)
                        if ! install_chrome_rhel; then
                            log_warning "Chrome installation failed, trying Chromium..."
                            install_chromium_fallback
                        fi
                        ;;
                    *)
                        log_warning "Unsupported Linux distribution for Chrome, installing Chromium..."
                        install_chromium_fallback
                        ;;
                esac
                ;;
            windows)
                log_warning "Windows detected. Please install Chrome manually:"
                log_info "Download from: https://www.google.com/chrome/"
                ;;
        esac
    fi
    
    echo
    
    # Check and install Pa11y if needed
    if check_pa11y_installed; then
        log_info "Pa11y is already available"
    else
        log_info "Installing Pa11y..."
        if ! install_pa11y; then
            log_error "Failed to install Pa11y"
            exit 1
        fi
    fi
    
    echo
    
    # Install Node.js dependencies for the module
    install_node_dependencies
    
    echo
    
    # Test installation
    test_pa11y
    
    echo
    log_success "Installation completed successfully!"
    echo
    echo "Next steps:"
    echo "1. Run tests: npm test"
    echo "2. Start the MCP server to use the WCAG module"
    echo "3. Check the README.md for usage examples"
    echo
    echo "Pa11y CLI is now available globally. You can test it with:"
    echo "  pa11y --standard WCAG2AA https://example.com"
}

# Run main function
main "$@"