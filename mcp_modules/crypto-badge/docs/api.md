# Crypto Badge API Documentation

## Overview

The Crypto Badge module provides tools for generating cryptocurrency payment badges using the PayBadge API. It supports Bitcoin, Ethereum, Solana, USDC, and custom configurations with multiple output formats.

## Service API

### `generateBadge(params)`

Generate a badge URL with custom parameters.

**Parameters:**

- `baseUrl` (string, required): PayBadge service URL
- `leftText` (string, optional): Text for left side of badge
- `rightText` (string, optional): Text for right side of badge
- `leftColor` (string, optional): Hex color for left side
- `rightColor` (string, optional): Hex color for right side
- `style` (string, optional): Badge style ('standard' or 'enhanced')
- `ticker` (string, optional): Cryptocurrency ticker symbol

**Returns:** `Object` with properties:

- `url` (string): Generated badge URL
- `params` (object): Processed parameters

**Example:**

```javascript
import { cryptoBadgeService } from './src/service.js';

const result = cryptoBadgeService.generateBadge({
  baseUrl: 'https://paybadge.profullstack.com',
  leftText: 'support',
  rightText: 'project',
  rightColor: '#28a745',
});
```

### `generateMarkdown(params)`

Generate Markdown badge code.

**Parameters:**

- `baseUrl` (string, required): PayBadge service URL
- `linkUrl` (string, optional): URL to link when badge is clicked
- `altText` (string, optional): Alt text for the image
- All badge customization parameters from `generateBadge`

**Returns:** `Object` with properties:

- `markdown` (string): Generated Markdown code
- `url` (string): Badge image URL
- `linkUrl` (string): Link URL

**Example:**

```javascript
const result = cryptoBadgeService.generateMarkdown({
  baseUrl: 'https://paybadge.profullstack.com',
  leftText: 'donate',
  rightText: 'bitcoin',
  rightColor: '#f7931a',
  linkUrl: 'https://github.com/user/repo',
  altText: 'Donate Bitcoin',
});
```

### `generateHtml(params)`

Generate HTML badge code.

**Parameters:**
Same as `generateMarkdown`.

**Returns:** `Object` with properties:

- `html` (string): Generated HTML code
- `url` (string): Badge image URL
- `linkUrl` (string): Link URL

**Example:**

```javascript
const result = cryptoBadgeService.generateHtml({
  baseUrl: 'https://paybadge.profullstack.com',
  preset: 'ethereum',
  linkUrl: 'https://github.com/user/repo',
});
```

### `generatePresetBadge(params)`

Generate badge using preset configuration.

**Parameters:**

- `baseUrl` (string, required): PayBadge service URL
- `preset` (string, required): Preset name
- `linkUrl` (string, optional): URL to link when badge is clicked
- `format` (string, optional): Output format ('markdown' or 'html')
- `overrides` (object, optional): Parameter overrides

**Returns:** `Object` with properties:

- `url` (string): Badge image URL
- `markdown` (string): Markdown code (if format is 'markdown')
- `html` (string): HTML code (if format is 'html')
- `preset` (string): Used preset name
- `config` (object): Final configuration

**Available Presets:**

- `bitcoin`: Bitcoin payment badge with orange branding
- `ethereum`: Ethereum payment badge with blue branding
- `solana`: Solana payment badge with green branding
- `usdc`: USDC payment badge with blue branding
- `donation`: Generic donation badge
- `support`: Project support badge
- `multiCrypto`: Multi-cryptocurrency payment badge

**Example:**

```javascript
const result = cryptoBadgeService.generatePresetBadge({
  baseUrl: 'https://paybadge.profullstack.com',
  preset: 'bitcoin',
  linkUrl: 'https://github.com/user/repo',
  overrides: {
    leftText: 'tip',
  },
});
```

### `generateMultiCryptoBadge(params)`

Generate badge for multiple cryptocurrencies.

**Parameters:**

- `baseUrl` (string, required): PayBadge service URL
- `cryptos` (array, required): Array of cryptocurrency tickers
- `addresses` (object, optional): Object mapping crypto tickers to wallet addresses
- `linkUrl` (string, optional): URL to link when badge is clicked
- `format` (string, optional): Output format ('markdown' or 'html')

**Returns:** `Object` with properties:

- `url` (string): Badge image URL
- `markdown` (string): Markdown code (if format is 'markdown')
- `html` (string): HTML code (if format is 'html')
- `cryptos` (array): Supported cryptocurrencies
- `addresses` (object): Wallet addresses

**Example:**

```javascript
const result = cryptoBadgeService.generateMultiCryptoBadge({
  baseUrl: 'https://paybadge.profullstack.com',
  cryptos: ['btc', 'eth', 'sol'],
  addresses: {
    btc: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
    eth: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
  },
  linkUrl: 'https://github.com/user/repo',
});
```

### `listPresets()`

List all available preset configurations.

**Parameters:** None

**Returns:** `Object` with properties:

- `presets` (array): Array of preset names
- `count` (number): Number of available presets
- `descriptions` (object): Preset descriptions

**Example:**

```javascript
const result = cryptoBadgeService.listPresets();
```

### `getConfig()`

Get service configuration and defaults.

**Parameters:** None

**Returns:** `Object` with properties:

- `defaultBaseUrl` (string): Default PayBadge service URL
- `supportedCryptos` (array): Supported cryptocurrency tickers
- `defaultColors` (object): Default color schemes
- `limits` (object): Text length and parameter limits

**Example:**

```javascript
const config = cryptoBadgeService.getConfig();
```

## HTTP Endpoints

### GET `/crypto-badge`

Returns module information and status.

### POST `/crypto-badge/generate`

Generate badge URL.

**Request Body:**

```json
{
  "baseUrl": "https://paybadge.profullstack.com",
  "leftText": "support",
  "rightText": "project",
  "rightColor": "#28a745"
}
```

### POST `/crypto-badge/generate-markdown`

Generate Markdown badge code.

**Request Body:**

```json
{
  "baseUrl": "https://paybadge.profullstack.com",
  "leftText": "donate",
  "rightText": "bitcoin",
  "rightColor": "#f7931a",
  "linkUrl": "https://github.com/user/repo",
  "altText": "Donate Bitcoin"
}
```

### POST `/crypto-badge/generate-html`

Generate HTML badge code.

**Request Body:**

```json
{
  "baseUrl": "https://paybadge.profullstack.com",
  "preset": "ethereum",
  "linkUrl": "https://github.com/user/repo"
}
```

### POST `/crypto-badge/generate-preset`

Generate preset badge.

**Request Body:**

```json
{
  "baseUrl": "https://paybadge.profullstack.com",
  "preset": "bitcoin",
  "linkUrl": "https://github.com/user/repo",
  "overrides": {
    "leftText": "tip"
  }
}
```

### POST `/crypto-badge/generate-multi-crypto`

Generate multi-cryptocurrency badge.

**Request Body:**

```json
{
  "baseUrl": "https://paybadge.profullstack.com",
  "cryptos": ["btc", "eth", "sol"],
  "addresses": {
    "btc": "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
    "eth": "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6"
  },
  "linkUrl": "https://github.com/user/repo"
}
```

### GET `/crypto-badge/presets`

List available presets.

### GET `/crypto-badge/config`

Get configuration.

## MCP Tool Integration

### GET `/tools/crypto-badge/info`

Returns MCP tool schema information.

### POST `/tools/crypto-badge`

Execute MCP tool actions.

**Request Body:**

```json
{
  "action": "generate-preset",
  "baseUrl": "https://paybadge.profullstack.com",
  "preset": "bitcoin",
  "linkUrl": "https://github.com/user/repo"
}
```

**Available Actions:**

- `generate`: Generate custom badge URL
- `generate-markdown`: Generate Markdown code
- `generate-html`: Generate HTML code
- `generate-preset`: Generate preset badge
- `generate-multi-crypto`: Generate multi-crypto badge
- `list-presets`: List available presets
- `get-config`: Get service configuration

## Security Features

- **Input Sanitization**: All text inputs are sanitized to prevent XSS
- **Parameter Validation**: Colors, URLs, and other parameters are validated
- **Length Limits**: Text inputs are limited to prevent abuse
- **HTML Escaping**: HTML output properly escapes user content

## Error Handling

Common error responses:

```json
{
  "error": "Missing required parameter: baseUrl"
}
```

**Error Scenarios:**

- Missing required parameters
- Invalid URL formats
- Invalid color formats (must be hex colors)
- Unknown preset names
- Network connectivity issues
- Invalid cryptocurrency tickers

## Preset Configurations

### Bitcoin

- **Ticker**: btc
- **Colors**: Orange (#f7931a)
- **Default Text**: "bitcoin"

### Ethereum

- **Ticker**: eth
- **Colors**: Blue (#627eea)
- **Default Text**: "ethereum"

### Solana

- **Ticker**: sol
- **Colors**: Green (#00d4aa)
- **Default Text**: "solana"

### USDC

- **Ticker**: usdc
- **Colors**: Blue (#2775ca)
- **Default Text**: "usdc"

### Generic Presets

- **donation**: Generic donation badge
- **support**: Project support badge
- **multiCrypto**: Multi-cryptocurrency support

## Integration Examples

### GitHub README

```markdown
[![Bitcoin Payment](https://paybadge.profullstack.com/badge.svg?ticker=btc&rightText=bitcoin&rightColor=%23f7931a)](https://github.com/user/repo)
```

### HTML Website

```html
<a href="https://github.com/user/repo" target="_blank" rel="noopener noreferrer">
  <img
    src="https://paybadge.profullstack.com/badge.svg?ticker=eth&rightText=ethereum&rightColor=%23627eea"
    alt="Ethereum Payment"
  />
</a>
```

### Node.js Application

```javascript
import { cryptoBadgeService } from './src/service.js';

const badge = cryptoBadgeService.generatePresetBadge({
  baseUrl: 'https://paybadge.profullstack.com',
  preset: 'bitcoin',
  linkUrl: 'https://github.com/user/repo',
});

console.log(badge.markdown);
```

## Dependencies

The module has zero external dependencies and uses only Node.js built-in modules:

- `node:url` - URL parsing and validation
- `node:querystring` - Query string encoding
