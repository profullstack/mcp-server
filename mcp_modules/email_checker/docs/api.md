# Email Checker Module API Documentation

## Overview

The Email Checker Module provides comprehensive email validation services using the un.limited.mx API. It offers both REST endpoints and MCP tool integration for checking email validity, managing check history, and providing analytics.

## Base URL

All endpoints are prefixed with `/email_checker` when the module is registered with the MCP server.

## Authentication

The module requires an API key for the un.limited.mx service. Configure it via:

- Environment variable: `EMAIL_CHECKER_API_KEY`
- Configuration endpoint: `POST /email_checker/config/api-key`

## Endpoints

### Module Information

#### GET /email_checker

Get module information and status.

**Response:**

```json
{
  "module": "email_checker",
  "status": "active",
  "message": "Email validation service using un.limited.mx API",
  "version": "1.0.0",
  "configured": true
}
```

### Email Validation

#### POST /email_checker/check

Check a single email address.

**Request Body:**

```json
{
  "email": "test@example.com"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Email checked successfully",
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

**Error Response:**

```json
{
  "error": "Invalid email format"
}
```

#### POST /email_checker/check/batch

Check multiple email addresses.

**Request Body:**

```json
{
  "emails": ["test1@example.com", "test2@example.com", "invalid-email"]
}
```

**Response:**

```json
{
  "success": true,
  "message": "Emails checked successfully",
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

### History Management

#### GET /email_checker/history

Get all check history, sorted by most recent first.

**Response:**

```json
{
  "success": true,
  "count": 150,
  "history": [
    {
      "id": "check_1234567890_abc123",
      "email": "test@example.com",
      "isValid": true,
      "checkedAt": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

#### GET /email_checker/history/:id

Get specific check by ID.

**Parameters:**

- `id` (string): Check ID

**Response:**

```json
{
  "success": true,
  "check": {
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

**Error Response (404):**

```json
{
  "error": "Check with ID check_nonexistent not found"
}
```

#### DELETE /email_checker/history/:id

Delete specific check by ID.

**Parameters:**

- `id` (string): Check ID

**Response:**

```json
{
  "success": true,
  "message": "Check deleted successfully"
}
```

#### DELETE /email_checker/history

Clear all check history.

**Response:**

```json
{
  "success": true,
  "message": "Check history cleared successfully"
}
```

### Query Endpoints

#### GET /email_checker/email/:email

Get all checks for a specific email address.

**Parameters:**

- `email` (string): Email address to search for

**Response:**

```json
{
  "success": true,
  "email": "test@example.com",
  "count": 3,
  "checks": [
    {
      "id": "check_1234567890_abc123",
      "email": "test@example.com",
      "isValid": true,
      "checkedAt": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

#### GET /email_checker/recent

Get recent checks within specified time period.

**Query Parameters:**

- `hours` (number, optional): Number of hours to look back (default: 24)

**Example:** `GET /email_checker/recent?hours=48`

**Response:**

```json
{
  "success": true,
  "hours": 48,
  "count": 25,
  "checks": [
    {
      "id": "check_1234567890_abc123",
      "email": "test@example.com",
      "isValid": true,
      "checkedAt": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

#### GET /email_checker/stats

Get validation statistics.

**Response:**

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

### Configuration

#### POST /email_checker/config/api-key

Update the API key for the un.limited.mx service.

**Request Body:**

```json
{
  "apiKey": "your-new-api-key"
}
```

**Response:**

```json
{
  "success": true,
  "message": "API key updated successfully"
}
```

#### GET /email_checker/status

Get service configuration status.

**Response:**

```json
{
  "success": true,
  "status": {
    "configured": true,
    "hasApiKey": true,
    "totalChecks": 150,
    "lastCheck": "2024-01-15T10:30:00.000Z"
  }
}
```

## MCP Tool Integration

### GET /tools/email_checker/info

Get MCP tool information.

**Response:**

```json
{
  "name": "email_checker",
  "description": "Check email validity using external API service",
  "parameters": {
    "action": {
      "type": "string",
      "description": "The action to perform",
      "required": true,
      "enum": ["check", "batch_check", "history", "stats", "clear", "get_by_id"]
    },
    "email": {
      "type": "string",
      "description": "Email address to check (required for check action)",
      "required": false
    },
    "emails": {
      "type": "array",
      "description": "Array of email addresses to check (required for batch_check action)",
      "required": false,
      "items": {
        "type": "string"
      }
    },
    "id": {
      "type": "string",
      "description": "Check ID for get_by_id action",
      "required": false
    }
  }
}
```

### POST /tools/email_checker

Execute MCP tool actions.

**Request Body Examples:**

Check single email:

```json
{
  "action": "check",
  "email": "test@example.com"
}
```

Check multiple emails:

```json
{
  "action": "batch_check",
  "emails": ["test1@example.com", "test2@example.com"]
}
```

Get history:

```json
{
  "action": "history"
}
```

Get statistics:

```json
{
  "action": "stats"
}
```

Clear history:

```json
{
  "action": "clear"
}
```

Get check by ID:

```json
{
  "action": "get_by_id",
  "id": "check_1234567890_abc123"
}
```

**Response:**

```json
{
  "tool": "email_checker",
  "action": "check",
  "result": {
    "id": "check_1234567890_abc123",
    "email": "test@example.com",
    "isValid": true,
    "checkedAt": "2024-01-15T10:30:00.000Z"
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## Error Handling

### Common Error Responses

**400 Bad Request:**

```json
{
  "error": "Email is required"
}
```

**404 Not Found:**

```json
{
  "error": "Check with ID check_nonexistent not found"
}
```

**500 Internal Server Error:**

```json
{
  "error": "API request failed: 401 Unauthorized"
}
```

### Error Types

1. **Validation Errors**: Invalid email format, missing required fields
2. **Configuration Errors**: Missing or invalid API key
3. **API Errors**: External API failures, network issues
4. **Not Found Errors**: Requested resource doesn't exist
5. **Server Errors**: Internal processing errors

## Rate Limiting

The module implements intelligent rate limiting for batch operations:

- Maximum 3 concurrent API requests
- 200ms delay between batches
- Automatic retry logic for transient failures

## Data Models

### Check Result Object

```typescript
{
  id: string,              // Unique check identifier
  email: string,           // Email address that was checked
  isValid: boolean,        // Whether the email is valid
  apiResponse?: object,    // Raw API response (if successful)
  error?: string,          // Error message (if failed)
  checkedAt: string        // ISO timestamp of when check was performed
}
```

### Statistics Object

```typescript
{
  totalChecks: number,     // Total number of checks performed
  validEmails: number,     // Number of valid emails
  invalidEmails: number,   // Number of invalid emails
  successRate: number      // Percentage of valid emails (0-100)
}
```

### Service Status Object

```typescript
{
  configured: boolean,     // Whether service is properly configured
  hasApiKey: boolean,      // Whether API key is set
  totalChecks: number,     // Total number of checks in history
  lastCheck: string|null   // Timestamp of last check (if any)
}
```

## Integration Examples

### cURL Examples

Check single email:

```bash
curl -X POST http://localhost:3000/email_checker/check \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
```

Get statistics:

```bash
curl http://localhost:3000/email_checker/stats
```

Update API key:

```bash
curl -X POST http://localhost:3000/email_checker/config/api-key \
  -H "Content-Type: application/json" \
  -d '{"apiKey": "your-api-key"}'
```

### JavaScript Examples

```javascript
// Check single email
const response = await fetch('/email_checker/check', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'test@example.com' }),
});
const result = await response.json();

// Get recent checks
const recentResponse = await fetch('/email_checker/recent?hours=48');
const recentChecks = await recentResponse.json();
```

## Best Practices

1. **Batch Processing**: Use batch endpoint for multiple emails to respect rate limits
2. **Error Handling**: Always implement proper error handling for API failures
3. **Caching**: Consider caching results to avoid redundant API calls
4. **Monitoring**: Use statistics endpoint to monitor usage patterns
5. **Cleanup**: Periodically clear old history to manage memory usage
6. **Security**: Keep API keys secure and rotate them regularly

## Troubleshooting

### Common Issues

1. **"API key is required"**: Set the `EMAIL_CHECKER_API_KEY` environment variable
2. **"Invalid email format"**: Ensure email follows standard format (user@domain.tld)
3. **"API request failed"**: Check API key validity and network connectivity
4. **Rate limiting**: Use batch endpoint and implement delays between requests

### Debug Information

Enable debug logging by setting the log level to debug in your application configuration.
