# Email Checker Module

An MCP server module for checking email validity with support for multiple providers. Currently supports un.limited.mx API with plans for additional providers. This module provides comprehensive email validation services with history tracking and batch processing capabilities.

## Features

- ✅ Single email validation
- ✅ Batch email validation with rate limiting
- ✅ Check history tracking and management
- ✅ Statistics and analytics
- ✅ Recent checks filtering
- ✅ Email-specific check history
- ✅ Configurable API key management
- ✅ Comprehensive error handling
- ✅ RESTful API endpoints
- ✅ MCP tool integration

## Installation

```bash
# Install dependencies
pnpm install

# Run tests
pnpm test

# Run tests in watch mode
pnpm run test:watch

# Lint code
pnpm run lint

# Format code
pnpm run format
```

## Configuration

### Provider Support

This module supports multiple email validation providers:

- **unlimited** (default): [un.limited.mx](https://www.un.limited.mx) - High-quality email validation service
- **Future providers**: ZeroBounce, Hunter.io, EmailListVerify (planned)

### API Key Setup

1. Sign up for an account at [un.limited.mx](https://www.un.limited.mx)
2. Obtain your API key from the dashboard
3. Include the API key in the `X-API-Key` header with each request
4. Optionally specify the provider in your request (defaults to "unlimited")

**Important**: All API endpoints now require the `X-API-Key` header to be sent with each request. The API key is no longer configured server-side for security reasons.

## API Endpoints

### Module Information

- `GET /email_checker` - Get module information and status

### Email Checking

- `POST /email_checker/check` - Check a single email
- `POST /email_checker/check/batch` - Check multiple emails

### History Management

- `GET /email_checker/history` - Get all check history
- `GET /email_checker/history/:id` - Get specific check by ID
- `DELETE /email_checker/history/:id` - Delete specific check
- `DELETE /email_checker/history` - Clear all history

### Query Endpoints

- `GET /email_checker/email/:email` - Get checks for specific email
- `GET /email_checker/recent?hours=24` - Get recent checks
- `GET /email_checker/stats` - Get validation statistics

### Configuration

- `POST /email_checker/config/api-key` - Update API key
- `GET /email_checker/status` - Get service status

### MCP Tool

- `POST /tools/email_checker` - MCP tool endpoint
- `GET /tools/email_checker/info` - Tool information

## Usage Examples

### Check Single Email

**Using cURL with mcp.profullstack.com (default provider):**

```bash
curl -X POST https://mcp.profullstack.com/email_checker/check \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key-here" \
  -d '{"email": "test@example.com"}'
```

**Using cURL with explicit provider:**

```bash
curl -X POST https://mcp.profullstack.com/email_checker/check \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key-here" \
  -d '{"email": "test@example.com", "provider": "unlimited"}'
```

**Using cURL locally:**

```bash
curl -X POST http://localhost:3000/email_checker/check \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key-here" \
  -d '{"email": "test@example.com", "provider": "unlimited"}'
```

**Using JavaScript fetch with mcp.profullstack.com:**

```javascript
const response = await fetch('https://mcp.profullstack.com/email_checker/check', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'your-api-key-here',
  },
  body: JSON.stringify({
    email: 'test@example.com',
    provider: 'unlimited', // Optional, defaults to 'unlimited'
  }),
});
const result = await response.json();
console.log(result);
```

Response:

```json
{
  "success": true,
  "message": "Email checked successfully",
  "provider": "unlimited",
  "result": {
    "id": "check_1234567890_abc123",
    "email": "test@example.com",
    "isValid": true,
    "apiResponse": {
      "valid": true,
      "email": "test@example.com"
    },
    "checkedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### Check Multiple Emails

**Using cURL with mcp.profullstack.com:**

```bash
curl -X POST https://mcp.profullstack.com/email_checker/check/batch \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key-here" \
  -d '{"emails": ["test1@example.com", "test2@example.com", "invalid-email"], "provider": "unlimited"}'
```

**Using JavaScript fetch with mcp.profullstack.com:**

```javascript
const response = await fetch('https://mcp.profullstack.com/email_checker/check/batch', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'your-api-key-here',
  },
  body: JSON.stringify({
    emails: ['test1@example.com', 'test2@example.com', 'invalid-email'],
    provider: 'unlimited', // Optional, defaults to 'unlimited'
  }),
});
const result = await response.json();
console.log(result);
```

**Using cURL locally:**

```bash
curl -X POST http://localhost:3000/email_checker/check/batch \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key-here" \
  -d '{"emails": ["test1@example.com", "test2@example.com", "invalid-email"], "provider": "unlimited"}'
```

Response:

```json
{
  "success": true,
  "message": "Emails checked successfully",
  "provider": "unlimited",
  "results": [
    {
      "id": "check_1234567890_def456",
      "email": "test1@example.com",
      "isValid": true,
      "checkedAt": "2024-01-15T10:30:00.000Z"
    },
    {
      "id": "check_1234567891_ghi789",
      "email": "test2@example.com",
      "isValid": true,
      "checkedAt": "2024-01-15T10:30:01.000Z"
    },
    {
      "id": "check_1234567892_jkl012",
      "email": "invalid-email",
      "isValid": false,
      "error": "Invalid email format",
      "checkedAt": "2024-01-15T10:30:02.000Z"
    }
  ],
  "summary": {
    "total": 3,
    "valid": 2,
    "invalid": 1
  }
}
```

### Get Statistics

**Using cURL with mcp.profullstack.com:**

```bash
curl https://mcp.profullstack.com/email_checker/stats \
  -H "X-API-Key: your-api-key-here"
```

**Using JavaScript fetch with mcp.profullstack.com:**

```javascript
const response = await fetch('https://mcp.profullstack.com/email_checker/stats', {
  headers: { 'X-API-Key': 'your-api-key-here' },
});
const stats = await response.json();
console.log('Email validation statistics:', stats);
```

**Using cURL locally:**

```bash
curl http://localhost:3000/email_checker/stats \
  -H "X-API-Key: your-api-key-here"
```

Response:

```json
{
  "success": true,
  "stats": {
    "totalChecks": 150,
    "validEmails": 120,
    "invalidEmails": 30,
    "successRate": 80
  }
}
```

## MCP Tool Usage

The module provides an MCP tool that can be used with compatible clients:

```json
{
  "action": "check",
  "email": "test@example.com"
}
```

Available actions:

- `check` - Check single email
- `batch_check` - Check multiple emails
- `history` - Get check history
- `stats` - Get statistics
- `clear` - Clear history
- `get_by_id` - Get check by ID

## Live API Examples (mcp.profullstack.com)

**Get Module Information:**

```bash
curl https://mcp.profullstack.com/email_checker
```

**Get Check History:**

```bash
curl https://mcp.profullstack.com/email_checker/history?provider=unlimited \
  -H "X-API-Key: your-api-key-here"
```

**Get Recent Checks (last 48 hours):**

```bash
curl https://mcp.profullstack.com/email_checker/recent?hours=48&provider=unlimited \
  -H "X-API-Key: your-api-key-here"
```

**Get Service Status:**

```bash
curl https://mcp.profullstack.com/email_checker/status
```

**MCP Tool Usage:**

```bash
curl -X POST https://mcp.profullstack.com/tools/email_checker \
  -H "Content-Type: application/json" \
  -d '{"action": "check", "email": "test@example.com"}'
```

**MCP Tool - Batch Check:**

```bash
curl -X POST https://mcp.profullstack.com/tools/email_checker \
  -H "Content-Type: application/json" \
  -d '{"action": "batch_check", "emails": ["test1@example.com", "test2@example.com"]}'
```

**MCP Tool - Get Statistics:**

```bash
curl -X POST https://mcp.profullstack.com/tools/email_checker \
  -H "Content-Type: application/json" \
  -d '{"action": "stats"}'
```

**JavaScript Fetch Examples:**

```javascript
// Check single email with production API
const response = await fetch('https://mcp.profullstack.com/email_checker/check', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'your-api-key-here',
  },
  body: JSON.stringify({ email: 'test@example.com' }),
});
const result = await response.json();

// Get statistics
const statsResponse = await fetch('https://mcp.profullstack.com/email_checker/stats', {
  headers: { 'X-API-Key': 'your-api-key-here' },
});
const stats = await statsResponse.json();

// Use MCP Tool interface
const mcpResponse = await fetch('https://mcp.profullstack.com/tools/email_checker', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'your-api-key-here',
  },
  body: JSON.stringify({
    action: 'batch_check',
    emails: ['user1@example.com', 'user2@example.com'],
  }),
});
const mcpResult = await mcpResponse.json();
```

## JavaScript Usage

```javascript
import { EmailCheckerService } from './src/service.js';

// Initialize service with API key
const emailChecker = new EmailCheckerService('your-api-key');

// Check single email
try {
  const result = await emailChecker.checkEmail('test@example.com');
  console.log('Email check result:', result);
} catch (error) {
  console.error('Email check failed:', error.message);
}

// Check multiple emails
const emails = ['test1@example.com', 'test2@example.com'];
const results = await emailChecker.checkMultipleEmails(emails);
console.log('Batch results:', results);

// Get statistics
const stats = emailChecker.getStats();
console.log('Statistics:', stats);
```

## Error Handling

The module provides comprehensive error handling:

- **Invalid email format**: Returns validation error before API call
- **Missing API key**: Returns configuration error
- **API failures**: Returns detailed API error information
- **Network issues**: Returns network error with retry suggestions
- **Rate limiting**: Implements batch processing with delays

## Rate Limiting

The module implements intelligent rate limiting for batch operations:

- Default batch size: 3 concurrent requests
- Default delay between batches: 200ms
- Configurable via service parameters

## Testing

Run the comprehensive test suite:

```bash
# Run all tests
pnpm test

# Run specific test file
pnpm test test/utils.test.js

# Run tests with coverage
pnpm test -- --reporter spec

# Watch mode for development
pnpm run test:watch
```

## Development

### Project Structure

```
mcp_modules/email_checker/
├── src/
│   ├── controller.js    # Route handlers
│   ├── service.js       # Business logic
│   └── utils.js         # Utility functions
├── test/
│   ├── controller.test.js
│   ├── service.test.js
│   └── utils.test.js
├── examples/
│   └── basic-usage.js
├── docs/
│   └── api.md
├── index.js             # Module entry point
├── package.json
├── README.md
└── TODO.md
```

### Adding New Features

1. Write tests first in the appropriate test file
2. Implement the feature in the corresponding source file
3. Update the controller if new endpoints are needed
4. Update the main index.js for new MCP tool actions
5. Update documentation

## API Integration

This module integrates with the un.limited.mx email validation API:

- **Endpoint**: `https://www.un.limited.mx/api/emails/urls`
- **Method**: POST
- **Authentication**: X-API-Key header
- **Request Format**: `{"email": "test@example.com"}`

## License

ISC License - see LICENSE file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Write tests for your changes
4. Implement your changes
5. Ensure all tests pass
6. Submit a pull request

## Support

For issues and questions:

1. Check the test files for usage examples
2. Review the API documentation
3. Check the TODO.md for known limitations
4. Create an issue with detailed information
