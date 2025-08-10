# Crypto Badge Module

Generate crypto payment badges using PayBadge API with support for Bitcoin, Ethereum, Solana, USDC and custom configurations.

## Overview

The Crypto Badge Module is an MCP (Model Context Protocol) module that provides tools for generating cryptocurrency payment badges. It integrates with the PayBadge API to create customizable badges that can be embedded in GitHub README files, websites, and other documentation.

## Features

- **Multiple Cryptocurrencies**: Support for Bitcoin, Ethereum, Solana, USDC
- **Preset Configurations**: Pre-built badge styles for common use cases
- **Custom Styling**: Full control over colors, text, and appearance
- **Multiple Output Formats**: Generate Markdown and HTML badge code
- **Multi-Crypto Support**: Create badges supporting multiple cryptocurrencies
- **Security**: Built-in input sanitization and validation
- **Flexible API**: Both HTTP endpoints and MCP tool integration

## Installation

This module is part of the MCP Server project. To use it:

```bash
# Install dependencies
pnpm install

# Run tests
pnpm test

# Run tests with coverage
pnpm run test:coverage
```

## Quick Start

### Using MCP Tool

```javascript
// Generate a Bitcoin badge
{
  "action": "generate-preset",
  "baseUrl": "https://paybadge.profullstack.com",
  "preset": "bitcoin",
  "linkUrl": "https://github.com/user/repo"
}
```

### Using HTTP API

```bash
curl -X POST http://localhost:3000/crypto-badge/generate-preset \
  -H "Content-Type: application/json" \
  -d '{
    "baseUrl": "https://paybadge.profullstack.com",
    "preset": "bitcoin",
    "linkUrl": "https://github.com/user/repo"
  }'
```

## Available Actions

### `generate`

Generate a badge URL with custom parameters.

**Parameters:**

- `baseUrl` (required): PayBadge service URL
- `leftText`: Text for left side of badge
- `rightText`: Text for right side of badge
- `leftColor`: Hex color for left side
- `rightColor`: Hex color for right side
- `style`: Badge style (`standard` or `enhanced`)

**Example:**

```json
{
  "action": "generate",
  "baseUrl": "https://paybadge.profullstack.com",
  "leftText": "support",
  "rightText": "project",
  "rightColor": "#28a745"
}
```

### `generate-markdown`

Generate Markdown badge code.

**Parameters:**

- `baseUrl` (required): PayBadge service URL
- `linkUrl`: URL to link when badge is clicked
- `altText`: Alt text for the image
- All badge customization parameters from `generate`

**Example:**

```json
{
  "action": "generate-markdown",
  "baseUrl": "https://paybadge.profullstack.com",
  "leftText": "donate",
  "rightText": "bitcoin",
  "rightColor": "#f7931a",
  "linkUrl": "https://github.com/user/repo",
  "altText": "Donate Bitcoin"
}
```

**Output:**

```markdown
[![Donate Bitcoin](https://paybadge.profullstack.com/badge.svg?leftText=donate&rightText=bitcoin&rightColor=%23f7931a)](https://github.com/user/repo)
```

### `generate-html`

Generate HTML badge code.

**Parameters:**
Same as `generate-markdown`.

**Example:**

```json
{
  "action": "generate-html",
  "baseUrl": "https://paybadge.profullstack.com",
  "preset": "ethereum",
  "linkUrl": "https://github.com/user/repo"
}
```

**Output:**

```html
<a href="https://github.com/user/repo" target="_blank" rel="noopener noreferrer">
  <img
    src="https://paybadge.profullstack.com/badge.svg?ticker=eth&rightText=ethereum&rightColor=%23627eea"
    alt="Ethereum Payment"
  />
</a>
```

### `generate-preset`

Generate badge using preset configuration.

**Available Presets:**

- `bitcoin`: Bitcoin payment badge with orange branding
- `ethereum`: Ethereum payment badge with blue branding
- `solana`: Solana payment badge with green branding
- `usdc`: USDC payment badge with blue branding
- `donation`: Generic donation badge
- `support`: Project support badge
- `multiCrypto`: Multi-cryptocurrency payment badge

**Parameters:**

- `baseUrl` (required): PayBadge service URL
- `preset` (required): Preset name
- `linkUrl`: URL to link when badge is clicked
- `format`: Output format (`markdown` or `html`)
- `overrides`: Object with parameter overrides

**Example:**

```json
{
  "action": "generate-preset",
  "baseUrl": "https://paybadge.profullstack.com",
  "preset": "bitcoin",
  "linkUrl": "https://github.com/user/repo",
  "overrides": {
    "leftText": "tip"
  }
}
```

### `generate-multi-crypto`

Generate badge for multiple cryptocurrencies.

**Parameters:**

- `baseUrl` (required): PayBadge service URL
- `cryptos` (required): Array of cryptocurrency tickers
- `addresses`: Object mapping crypto tickers to wallet addresses
- `linkUrl`: URL to link when badge is clicked
- `format`: Output format (`markdown` or `html`)

**Example:**

```json
{
  "action": "generate-multi-crypto",
  "baseUrl": "https://paybadge.profullstack.com",
  "cryptos": ["btc", "eth", "sol"],
  "addresses": {
    "btc": "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
    "eth": "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6"
  },
  "linkUrl": "https://github.com/user/repo"
}
```

### `list-presets`

List all available preset configurations.

**Parameters:** None

**Example:**

```json
{
  "action": "list-presets"
}
```

### `get-config`

Get service configuration and defaults.

**Parameters:** None

**Example:**

```json
{
  "action": "get-config"
}
```

## HTTP Endpoints

The module provides the following HTTP endpoints:

- `GET /crypto-badge` - Module information
- `POST /crypto-badge/generate` - Generate badge URL
- `POST /crypto-badge/generate-markdown` - Generate Markdown code
- `POST /crypto-badge/generate-html` - Generate HTML code
- `POST /crypto-badge/generate-preset` - Generate preset badge
- `POST /crypto-badge/generate-multi-crypto` - Generate multi-crypto badge
- `GET /crypto-badge/presets` - List available presets
- `GET /crypto-badge/config` - Get configuration
- `GET /tools/crypto-badge/info` - MCP tool information
- `POST /tools/crypto-badge` - Main MCP tool endpoint

## Security Features

- **Input Sanitization**: All text inputs are sanitized to prevent XSS
- **Parameter Validation**: Colors, URLs, and other parameters are validated
- **Length Limits**: Text inputs are limited to prevent abuse
- **HTML Escaping**: HTML output properly escapes user content

## Error Handling

The module provides comprehensive error handling:

```json
{
  "error": "Missing required parameter: baseUrl"
}
```

Common error scenarios:

- Missing required parameters
- Invalid URL formats
- Invalid color formats
- Unknown preset names
- Network connectivity issues

## Testing

Run the test suite:

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm run test:watch

# Run tests with coverage
pnpm run test:coverage
```

The module includes comprehensive tests for:

- Service layer functionality
- Controller request handling
- Parameter validation
- Error scenarios
- Security features

## Examples

### Basic Bitcoin Badge

```json
{
  "action": "generate-preset",
  "baseUrl": "https://paybadge.profullstack.com",
  "preset": "bitcoin",
  "linkUrl": "https://github.com/user/repo"
}
```

Result:
[![Bitcoin Payment](https://paybadge.profullstack.com/badge.svg?ticker=btc&rightText=bitcoin&rightColor=%23f7931a)](https://github.com/user/repo)

### Custom Donation Badge

```json
{
  "action": "generate-markdown",
  "baseUrl": "https://paybadge.profullstack.com",
  "leftText": "support",
  "rightText": "project",
  "leftColor": "#555",
  "rightColor": "#28a745",
  "linkUrl": "https://github.com/user/repo",
  "altText": "Support this project"
}
```

### Multi-Cryptocurrency Badge

```json
{
  "action": "generate-multi-crypto",
  "baseUrl": "https://paybadge.profullstack.com",
  "cryptos": ["btc", "eth", "sol", "usdc"],
  "linkUrl": "https://github.com/user/repo"
}
```

## Integration

### With GitHub Actions

```yaml
- name: Generate Crypto Badge
  run: |
    curl -X POST http://localhost:3000/tools/crypto-badge \
      -H "Content-Type: application/json" \
      -d '{
        "action": "generate-preset",
        "baseUrl": "https://paybadge.profullstack.com",
        "preset": "bitcoin",
        "linkUrl": "${{ github.repository_url }}"
      }'
```

### With Node.js

```javascript
import { cryptoBadgeService } from './src/service.js';

const badge = cryptoBadgeService.generatePresetBadge({
  baseUrl: 'https://paybadge.profullstack.com',
  preset: 'bitcoin',
  linkUrl: 'https://github.com/user/repo',
});

console.log(badge.markdown);
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Write tests for new functionality
4. Implement the feature
5. Ensure all tests pass
6. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

For issues and questions:

- GitHub Issues: [Create an issue](https://github.com/profullstack/mcp-server/issues)
- Documentation: [MCP Server Docs](https://github.com/profullstack/mcp-server)
- PayBadge API: [PayBadge Documentation](https://paybadge.profullstack.com)
