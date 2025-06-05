#!/bin/bash

# Lighthouse Module Installation Script
# Installs Chrome/Chromium and system dependencies for macOS, Linux, and Windows (via WSL)

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
        log_info "2. Or install Homebrew first: /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
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
        # Install additional dependencies
        sudo dnf install -y \
            nss \
            atk \
            at-spi2-atk \
            libdrm \
            libXcomposite \
            libXdamage \
            libXrandr \
            mesa-libgbm \
            libXScrnSaver \
            alsa-lib
    elif command_exists yum; then
        sudo yum install -y google-chrome-stable
        # Install additional dependencies
        sudo yum install -y \
            nss \
            atk \
            at-spi2-atk \
            libdrm \
            libXcomposite \
            libXdamage \
            libXrandr \
            mesa-libgbm \
            libXScrnSaver \
            alsa-lib
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

# Install Node.js dependencies
install_node_dependencies() {
    log_info "Installing Node.js dependencies..."
    
    if [ ! -f "package.json" ]; then
        log_error "package.json not found. Please run this script from the lighthouse module directory."
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

# Test Chrome installation
test_chrome() {
    log_info "Testing Chrome installation..."
    
    if command_exists google-chrome; then
        CHROME_CMD="google-chrome"
    elif command_exists google-chrome-stable; then
        CHROME_CMD="google-chrome-stable"
    elif command_exists chromium; then
        CHROME_CMD="chromium"
    elif command_exists chromium-browser; then
        CHROME_CMD="chromium-browser"
    else
        log_error "No Chrome or Chromium installation found"
        return 1
    fi
    
    # Test headless mode
    log_info "Testing headless mode..."
    if $CHROME_CMD --headless --disable-gpu --dump-dom https://example.com > /dev/null 2>&1; then
        log_success "Chrome headless mode test passed"
    else
        log_warning "Chrome headless mode test failed, but Chrome is installed"
    fi
}

# Main installation function
main() {
    echo "=============================================="
    echo "  Lighthouse Module Installation Script"
    echo "=============================================="
    echo
    
    # Detect operating system
    detect_os
    log_info "Detected OS: $OS"
    if [ "$OS" = "linux" ]; then
        log_info "Detected Linux distribution: $DISTRO"
    fi
    echo
    
    # Check if Chrome is already installed
    if check_chrome_installed; then
        log_info "Chrome/Chromium is already available, skipping browser installation"
    else
        log_info "Chrome/Chromium not found, installing..."
        
        case $OS in
            macos)
                if ! install_chrome_macos; then
                    log_error "Failed to install Chrome on macOS"
                    exit 1
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
            *)
                log_error "Unsupported operating system: $OSTYPE"
                exit 1
                ;;
        esac
    fi
    
    echo
    
    # Install Node.js dependencies
    install_node_dependencies
    
    echo
    
    # Test installation
    test_chrome
    
    echo
    log_success "Installation completed successfully!"
    echo
    echo "Next steps:"
    echo "1. Run tests: npm test"
    echo "2. Start the MCP server to use the Lighthouse module"
    echo "3. Check the README.md for usage examples"
}

# Run main function
main "$@"