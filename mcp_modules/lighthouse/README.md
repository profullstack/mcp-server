# Lighthouse Module

A comprehensive MCP module that provides Lighthouse performance audit capabilities for websites. This module can generate detailed JSON reports for website speed assessments, performance analysis, and optimization recommendations.

## Features

- **Single URL Audits**: Run Lighthouse performance audits on individual websites
- **Batch Audits**: Audit multiple URLs in a single operation
- **Core Web Vitals**: Measure essential performance metrics like LCP, FID, and CLS
- **Performance Opportunities**: Identify specific optimization opportunities
- **Diagnostic Information**: Get detailed diagnostic data about performance issues
- **Multiple Report Formats**: Generate JSON reports and human-readable text summaries
- **Report Management**: Store, retrieve, and manage audit reports
- **Headless Chrome Support**: Run audits in headless mode for CI/CD integration
- **Configurable Categories**: Choose which Lighthouse categories to audit

## Installation

### Automated Installation (Recommended)

The module includes an automated installation script that handles all dependencies:

```bash
cd mcp_modules/lighthouse
./bin/install.sh
```

This script will:

- Detect your operating system (macOS, Linux, Windows/WSL)
- Install Chrome or Chromium browser
- Install required system libraries (Linux)
- Install Node.js dependencies
- Test the installation

### Manual Installation

If you prefer to install dependencies manually:

```bash
cd mcp_modules/lighthouse
npm install
```

Then follow the [System Requirements](#system-requirements--dependencies) section below to install Chrome/Chromium and system dependencies.

## Usage

### MCP Tool Interface

The module provides a single `lighthouse` tool that can perform various actions:

#### Run a Single Audit

```javascript
{
  "action": "audit",
  "url": "https://example.com",
  "options": {
    "categories": ["performance"],
    "headless": true
  }
}
```

#### Run Batch Audits

```javascript
{
  "action": "batch-audit",
  "urls": [
    "https://example.com",
    "https://google.com",
    "https://github.com"
  ],
  "options": {
    "categories": ["performance", "accessibility"],
    "headless": true
  }
}
```

#### Get Report by ID

```javascript
{
  "action": "get-report",
  "id": "audit_1234567890_abc123"
}
```

#### Get Report Summary

```javascript
{
  "action": "get-summary",
  "id": "audit_1234567890_abc123"
}
```

#### List All Reports

```javascript
{
  "action": "list-reports"
}
```

#### Delete Report

```javascript
{
  "action": "delete-report",
  "id": "audit_1234567890_abc123"
}
```

#### Clear All Reports

```javascript
{
  "action": "clear-reports"
}
```

### HTTP API Endpoints

#### Module Information

- `GET /lighthouse` - Get module information and status

```bash
curl -X GET http://localhost:3000/lighthouse
```

#### Health Check

- `GET /lighthouse/health` - Get module health status

```bash
curl -X GET http://localhost:3000/lighthouse/health
```

#### Report Management

**Get all stored reports:**

```bash
curl -X GET http://localhost:3000/lighthouse/reports
```

**Get specific report by ID:**

```bash
curl -X GET http://localhost:3000/lighthouse/reports/audit_1234567890_abc123
```

**Get report summary:**

```bash
curl -X GET http://localhost:3000/lighthouse/reports/audit_1234567890_abc123/summary
```

**Get report as text summary:**

```bash
curl -X GET http://localhost:3000/lighthouse/reports/audit_1234567890_abc123/text
```

**Delete specific report:**

```bash
curl -X DELETE http://localhost:3000/lighthouse/reports/audit_1234567890_abc123
```

**Clear all reports:**

```bash
curl -X DELETE http://localhost:3000/lighthouse/reports
```

#### Audit Operations

**Run single URL audit:**

```bash
curl -X POST http://localhost:3000/lighthouse/audit \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "options": {
      "categories": ["performance"],
      "headless": true
    }
  }'
```

**Run single URL audit with multiple categories:**

```bash
curl -X POST http://localhost:3000/lighthouse/audit \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "options": {
      "categories": ["performance", "accessibility", "best-practices", "seo"],
      "headless": true
    }
  }'
```

**Run batch audit on multiple URLs:**

```bash
curl -X POST http://localhost:3000/lighthouse/batch-audit \
  -H "Content-Type: application/json" \
  -d '{
    "urls": [
      "https://example.com",
      "https://google.com",
      "https://github.com"
    ],
    "options": {
      "categories": ["performance"],
      "headless": true
    }
  }'
```

**Run batch audit with accessibility and SEO checks:**

```bash
curl -X POST http://localhost:3000/lighthouse/batch-audit \
  -H "Content-Type: application/json" \
  -d '{
    "urls": [
      "https://example.com",
      "https://mywebsite.com"
    ],
    "options": {
      "categories": ["performance", "accessibility", "seo"],
      "headless": true
    }
  }'
```

### Audit Options

The following options can be configured for audits:

- **categories**: Array of categories to audit

  - `performance` (default)
  - `accessibility`
  - `best-practices`
  - `seo`
  - `pwa`

- **headless**: Boolean to run Chrome in headless mode (default: true)

- **lighthouseOptions**: Additional Lighthouse-specific options

## Response Format

### Single Audit Response

```javascript
{
  "id": "audit_1234567890_abc123",
  "url": "https://example.com",
  "timestamp": "2023-12-07T10:30:00.000Z",
  "lhr": { /* Full Lighthouse Report */ },
  "metrics": {
    "firstContentfulPaint": {
      "value": 1200,
      "displayValue": "1.2 s",
      "score": 0.85,
      "unit": "ms"
    },
    "largestContentfulPaint": {
      "value": 2400,
      "displayValue": "2.4 s",
      "score": 0.75,
      "unit": "ms"
    }
    // ... other metrics
  },
  "scores": {
    "performance": {
      "score": 0.85,
      "displayValue": 85
    }
  },
  "opportunities": [
    {
      "id": "unused-css-rules",
      "title": "Remove unused CSS",
      "description": "Remove dead rules from stylesheets...",
      "displayValue": "Potential savings of 45 KiB",
      "numericValue": 450,
      "score": 0.5
    }
  ],
  "diagnostics": [
    {
      "id": "uses-http2",
      "title": "Use HTTP/2",
      "description": "HTTP/2 offers many benefits...",
      "score": 0
    }
  ]
}
```

### Batch Audit Response

```javascript
{
  "results": [
    { /* Individual audit results */ }
  ],
  "errors": [
    {
      "url": "https://invalid-url.com",
      "error": "Failed to load page"
    }
  ],
  "summary": {
    "total": 3,
    "successful": 2,
    "failed": 1
  }
}
```

## Core Web Vitals

The module automatically extracts and reports on Core Web Vitals:

- **First Contentful Paint (FCP)**: Time until first content appears
- **Largest Contentful Paint (LCP)**: Time until largest content element appears
- **First Input Delay (FID)**: Time from first user interaction to browser response
- **Cumulative Layout Shift (CLS)**: Visual stability metric
- **Total Blocking Time (TBT)**: Time when main thread was blocked

## Performance Opportunities

The module identifies specific optimization opportunities such as:

- Unused CSS rules
- Unoptimized images
- Render-blocking resources
- Inefficient cache policies
- JavaScript execution time
- And many more...

## Error Handling

The module provides comprehensive error handling:

- Invalid URLs are rejected with appropriate error messages
- Network failures are caught and reported
- Chrome launch failures are handled gracefully
- Invalid audit options are validated

## CLI Integration

The module is designed to work seamlessly with Lighthouse CLI commands. You can use it to:

1. Run automated audits in CI/CD pipelines
2. Generate reports for performance monitoring
3. Track performance metrics over time
4. Identify performance regressions

## Example Usage Scenarios

### Performance Monitoring

```javascript
// Monitor your website's performance daily
{
  "action": "audit",
  "url": "https://mywebsite.com",
  "options": {
    "categories": ["performance"],
    "headless": true
  }
}
```

### Accessibility Audit

```javascript
// Check accessibility compliance
{
  "action": "audit",
  "url": "https://mywebsite.com",
  "options": {
    "categories": ["accessibility", "best-practices"]
  }
}
```

### Competitive Analysis

```javascript
// Compare multiple websites
{
  "action": "batch-audit",
  "urls": [
    "https://mywebsite.com",
    "https://competitor1.com",
    "https://competitor2.com"
  ],
  "options": {
    "categories": ["performance", "seo"]
  }
}
```

## Dependencies

- **lighthouse**: ^11.4.0 - The core Lighthouse library
- **chrome-launcher**: Included with Lighthouse for Chrome automation

## System Requirements & Dependencies

### Node.js Requirements

- **Node.js >= 18.0.0** (Required for ES modules and modern JavaScript features)

### Browser Dependencies

The Lighthouse module requires a Chromium-based browser to be installed on the system:

#### Linux (Ubuntu/Debian)

```bash
# Install Google Chrome
wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | sudo apt-key add -
echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" | sudo tee /etc/apt/sources.list.d/google-chrome.list
sudo apt update
sudo apt install google-chrome-stable

# Alternative: Install Chromium
sudo apt install chromium-browser
```

#### Linux (CentOS/RHEL/Fedora)

```bash
# Install Google Chrome
sudo dnf install -y google-chrome-stable

# Alternative: Install Chromium
sudo dnf install -y chromium
```

#### macOS

```bash
# Install via Homebrew
brew install --cask google-chrome

# Alternative: Install Chromium
brew install --cask chromium
```

#### Windows

- Download and install [Google Chrome](https://www.google.com/chrome/) or [Chromium](https://www.chromium.org/getting-involved/download-chromium/)

### System Libraries (Linux)

On Linux systems, you may need additional libraries for Chrome to run properly:

#### Ubuntu/Debian

```bash
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
```

#### CentOS/RHEL/Fedora

```bash
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
```

### Memory Requirements

- **Minimum**: 2GB RAM
- **Recommended**: 4GB+ RAM for batch audits
- Each Chrome instance can use 200-500MB of memory

### CPU Requirements

- **Minimum**: 2 CPU cores
- **Recommended**: 4+ CPU cores for optimal performance
- Lighthouse audits are CPU-intensive operations

### Network Requirements

- Stable internet connection for auditing external websites
- Sufficient bandwidth for loading target websites
- Consider firewall rules if auditing internal websites

### Headless Mode Considerations

For CI/CD and server environments, ensure:

- X11 forwarding is disabled (headless mode handles this)
- No display server required when using `headless: true`
- Sufficient `/tmp` space for Chrome temporary files

### Troubleshooting Common Issues

#### Chrome Launch Failures

```bash
# Check if Chrome is installed and accessible
google-chrome --version
# or
chromium --version

# Test Chrome in headless mode
google-chrome --headless --disable-gpu --dump-dom https://example.com
```

#### Permission Issues (Linux)

```bash
# Ensure proper permissions for Chrome
sudo chmod +x /usr/bin/google-chrome
# or
sudo chmod +x /usr/bin/chromium
```

#### Missing Libraries (Linux)

```bash
# Check for missing dependencies
ldd /usr/bin/google-chrome | grep "not found"
```

## Notes

- Audits can take 30-60 seconds per URL depending on website complexity
- Running multiple audits simultaneously may impact system performance
- Headless mode is recommended for automated/CI environments
- Reports are stored in memory and will be lost when the module is restarted
