# Social Poster MCP Module

A Model Context Protocol (MCP) module that provides social media posting capabilities using the [@profullstack/social-poster](https://github.com/profullstack/social-poster) library.

## Features

- **Multi-platform posting**: Post to X (Twitter), LinkedIn, Reddit, Facebook, Hacker News, Stacker News, and Primal
- **Browser-based authentication**: Secure login using Puppeteer automation
- **Content validation**: Validate content before posting
- **Platform management**: Check authentication status and available platforms
- **MCP integration**: Full MCP tool support with standardized interfaces

## Installation

```bash
# Install dependencies
pnpm install

# Install the social-poster dependency
pnpm add @profullstack/social-poster
```

## Supported Platforms

| Platform     | ID             | Max Text Length | Images | Links |
| ------------ | -------------- | --------------- | ------ | ----- |
| X (Twitter)  | `x`            | 280             | ✅     | ✅    |
| LinkedIn     | `linkedin`     | 3,000           | ✅     | ✅    |
| Reddit       | `reddit`       | 40,000          | ✅     | ✅    |
| Facebook     | `facebook`     | 63,206          | ✅     | ✅    |
| Hacker News  | `hacker-news`  | No limit        | ❌     | ✅    |
| Stacker News | `stacker-news` | No limit        | ❌     | ✅    |
| Primal       | `primal`       | No limit        | ✅     | ✅    |

## MCP Tools

### `social-post`

Post content to social media platforms.

**Parameters:**

- `content` (object, required): Content to post
  - `text` (string): Text content
  - `link` (string): URL to share
  - `type` (string): Content type ('text' or 'link')
- `platforms` (array, optional): Target platforms (defaults to all available)

**Example:**

```json
{
  "content": {
    "text": "Hello from MCP! 🚀",
    "type": "text"
  },
  "platforms": ["x", "linkedin"]
}
```

### `social-login`

Authenticate with a social media platform.

**Parameters:**

- `platform` (string, required): Platform to login to
- `options` (object, optional): Login options
  - `headless` (boolean): Run browser in headless mode
  - `timeout` (number): Login timeout in milliseconds

**Example:**

```json
{
  "platform": "x",
  "options": {
    "headless": false,
    "timeout": 60000
  }
}
```

### `social-status`

Get authentication status for all platforms.

**Parameters:** None

**Response:**

```json
{
  "x": {
    "enabled": true,
    "loggedIn": true,
    "displayName": "X (Twitter)"
  },
  "linkedin": {
    "enabled": true,
    "loggedIn": false,
    "displayName": "LinkedIn"
  }
}
```

### `social-platforms`

Get available platforms for posting.

**Parameters:** None

**Response:**

```json
{
  "platforms": ["x", "linkedin"],
  "count": 2
}
```

### `social-supported-platforms`

Get detailed information about supported platforms.

**Parameters:** None

### `social-validate-content`

Validate content before posting.

**Parameters:**

- `content` (object, required): Content to validate

### `social-sample-content`

Generate sample content for testing.

**Parameters:**

- `type` (string, optional): Content type ('text' or 'link')

### `social-posting-stats`

Get statistics from a posting result.

**Parameters:**

- `result` (object, required): Result from a previous post operation

## Environment Variables

| Variable                      | Description                   | Default |
| ----------------------------- | ----------------------------- | ------- |
| `SOCIAL_POSTER_HEADLESS`      | Run browser in headless mode  | `true`  |
| `SOCIAL_POSTER_TIMEOUT`       | Login timeout in milliseconds | `30000` |
| `SOCIAL_POSTER_CONFIG_PATH`   | Path to config file           | -       |
| `SOCIAL_POSTER_SESSIONS_PATH` | Path to sessions directory    | -       |

## Usage Examples

### Basic Usage

```javascript
import { SocialPostingService } from './src/service.js';

const service = new SocialPostingService({
  headless: false,
  timeout: 60000,
});

// Create and validate content
const content = {
  text: 'Hello from Social Poster MCP! 🚀',
  type: 'text',
};

const validation = service.validateContent(content);
if (!validation.valid) {
  console.error('Invalid content:', validation.errors);
  return;
}

// Login to platform
const loginResult = await service.loginToPlatform('x');
if (!loginResult.success) {
  console.error('Login failed:', loginResult.error);
  return;
}

// Post content
const postResult = await service.postContent(content, ['x']);
console.log('Post result:', postResult);

// Get statistics
const stats = service.getPostingStats(postResult);
console.log('Statistics:', stats);

// Clean up
await service.close();
```

### MCP Integration

The module automatically registers with the MCP server when loaded:

```javascript
// The module exports register/unregister functions
import { register, unregister, metadata } from './index.js';

// Register with Hono app
await register(app);

// Module provides these endpoints:
// POST /tools/social-post
// POST /tools/social-login
// POST /tools/social-status
// POST /tools/social-platforms
// ... and more
```

## Development

### Running Tests

```bash
# Run all tests
pnpm test

# Run specific test file
pnpm test test/service.test.js

# Run tests in watch mode
pnpm run test:watch
```

### Running Examples

```bash
# Basic usage example
node examples/basic-usage.js basic

# Content validation example
node examples/basic-usage.js validation

# Platform information example
node examples/basic-usage.js platforms

# Error handling example
node examples/basic-usage.js errors

# Run all examples
node examples/basic-usage.js all
```

### Code Quality

```bash
# Lint code
pnpm run lint

# Format code
pnpm run format
```

## Architecture

```
mcp_modules/social-poster/
├── src/
│   ├── service.js      # Service layer - wraps @profullstack/social-poster
│   ├── controller.js   # Controller layer - handles MCP requests
│   └── utils.js        # Utility functions
├── test/               # Test files (Mocha + Chai)
├── examples/           # Usage examples
└── index.js           # MCP module registration
```

### Service Layer

- Wraps the `@profullstack/social-poster` library
- Provides content validation and sanitization
- Handles authentication and platform management
- Implements error handling and logging

### Controller Layer

- Handles HTTP requests from MCP clients
- Validates request parameters
- Formats responses according to MCP standards
- Provides error handling middleware

### Utility Functions

- Parameter validation helpers
- Response formatting utilities
- Content sanitization functions
- Platform display name mapping

## Error Handling

The module provides comprehensive error handling:

- **Parameter validation**: Validates all input parameters
- **Content validation**: Checks content structure and constraints
- **Authentication errors**: Handles login failures gracefully
- **Platform errors**: Manages platform-specific issues
- **Network errors**: Handles connection and timeout issues

All errors are returned in a standardized format:

```json
{
  "success": false,
  "error": "Error message",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Security Considerations

- Browser sessions are managed securely
- Credentials are never stored in plain text
- All authentication happens through browser automation
- Session data is encrypted when stored
- Environment variables should be used for sensitive configuration

## Contributing

1. Follow the existing code style and patterns
2. Write tests for new functionality
3. Update documentation for API changes
4. Use conventional commit messages
5. Ensure all tests pass before submitting

## License

MIT License - see LICENSE file for details.

## Support

For issues and questions:

- Check the [social-poster documentation](https://github.com/profullstack/social-poster)
- Review the examples in the `examples/` directory
- Check the test files for usage patterns
- Open an issue for bugs or feature requests
