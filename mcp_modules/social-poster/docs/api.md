# Social Poster MCP Module - API Documentation

## Overview

The Social Poster MCP Module provides a comprehensive API for posting content to multiple social media platforms through the Model Context Protocol (MCP). This document details all available endpoints, tools, and their usage.

## Base Endpoints

### Module Information

- **GET** `/social-poster` - Get basic module information
- **GET** `/modules/social-poster` - Get detailed module metadata

## MCP Tools

### 1. social-post

Post content to social media platforms.

**Endpoint:** `POST /tools/social-post`

**Parameters:**

```json
{
  "content": {
    "text": "string (optional)",
    "link": "string (optional, must be valid URL)",
    "type": "string (optional, 'text' or 'link')"
  },
  "platforms": ["string"] // optional, array of platform IDs
}
```

**Response:**

```json
{
  "tool": "social-post",
  "success": true,
  "result": {
    "success": true,
    "results": {
      "x": {
        "success": true,
        "postId": "123456789",
        "url": "https://x.com/user/status/123456789"
      },
      "linkedin": {
        "success": true,
        "postId": "activity:123456789",
        "url": "https://linkedin.com/feed/update/activity:123456789"
      }
    },
    "successCount": 2,
    "failureCount": 0,
    "totalPlatforms": 2,
    "timestamp": "2024-01-01T00:00:00.000Z"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**Error Response:**

```json
{
  "error": "Invalid content: Content must have either text or link",
  "statusCode": 400
}
```

### 2. social-login

Authenticate with a social media platform.

**Endpoint:** `POST /tools/social-login`

**Parameters:**

```json
{
  "platform": "string", // required: x, linkedin, reddit, etc.
  "options": {
    "headless": "boolean", // optional, default: true
    "timeout": "number" // optional, default: 30000
  }
}
```

**Response:**

```json
{
  "tool": "social-login",
  "success": true,
  "result": {
    "success": true,
    "platform": "x",
    "error": null,
    "timestamp": "2024-01-01T00:00:00.000Z"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 3. social-status

Get authentication status for all platforms.

**Endpoint:** `POST /tools/social-status`

**Parameters:** None

**Response:**

```json
{
  "tool": "social-status",
  "success": true,
  "result": {
    "x": {
      "enabled": true,
      "loggedIn": true,
      "displayName": "X (Twitter)",
      "available": true
    },
    "linkedin": {
      "enabled": true,
      "loggedIn": false,
      "displayName": "LinkedIn",
      "available": true
    },
    "reddit": {
      "enabled": true,
      "loggedIn": false,
      "displayName": "Reddit",
      "available": true
    }
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 4. social-platforms

Get available platforms for posting (platforms with valid authentication).

**Endpoint:** `POST /tools/social-platforms`

**Parameters:** None

**Response:**

```json
{
  "tool": "social-platforms",
  "success": true,
  "result": {
    "platforms": ["x", "linkedin"],
    "count": 2
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 5. social-supported-platforms

Get detailed information about all supported platforms.

**Endpoint:** `POST /tools/social-supported-platforms`

**Parameters:** None

**Response:**

```json
{
  "tool": "social-supported-platforms",
  "success": true,
  "result": {
    "platforms": [
      {
        "id": "x",
        "name": "X (Twitter)",
        "description": "Post to X (formerly Twitter)",
        "maxTextLength": 280,
        "supportsImages": true,
        "supportsLinks": true
      },
      {
        "id": "linkedin",
        "name": "LinkedIn",
        "description": "Post to LinkedIn professional network",
        "maxTextLength": 3000,
        "supportsImages": true,
        "supportsLinks": true
      }
    ],
    "count": 7
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 6. social-validate-content

Validate content before posting.

**Endpoint:** `POST /tools/social-validate-content`

**Parameters:**

```json
{
  "content": {
    "text": "string",
    "link": "string",
    "type": "string"
  }
}
```

**Response:**

```json
{
  "tool": "social-validate-content",
  "success": true,
  "result": {
    "valid": true,
    "errors": []
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**Invalid Content Response:**

```json
{
  "tool": "social-validate-content",
  "success": true,
  "result": {
    "valid": false,
    "errors": ["Content must have either text or link", "Link must be a valid URL"]
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 7. social-sample-content

Generate sample content for testing.

**Endpoint:** `POST /tools/social-sample-content`

**Parameters:**

```json
{
  "type": "string" // optional: "text" or "link", default: "text"
}
```

**Response:**

```json
{
  "tool": "social-sample-content",
  "success": true,
  "result": {
    "text": "Hello from Social Poster MCP! 🚀 This is a test post to demonstrate multi-platform posting capabilities.",
    "type": "text"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 8. social-posting-stats

Get statistics from a posting result.

**Endpoint:** `POST /tools/social-posting-stats`

**Parameters:**

```json
{
  "result": {
    // Result object from a previous social-post operation
    "results": {
      "x": { "success": true },
      "linkedin": { "success": false }
    }
  }
}
```

**Response:**

```json
{
  "tool": "social-posting-stats",
  "success": true,
  "result": {
    "totalPlatforms": 2,
    "successfulPosts": 1,
    "failedPosts": 1,
    "successRate": 50
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 9. social-module-info

Get detailed module information.

**Endpoint:** `POST /tools/social-module-info`

**Parameters:** None

**Response:**

```json
{
  "tool": "social-module-info",
  "success": true,
  "result": {
    "name": "Social Poster MCP Module",
    "version": "1.0.0",
    "description": "MCP module for social media posting using @profullstack/social-poster",
    "author": "Profullstack, Inc.",
    "supportedPlatforms": [
      "x",
      "linkedin",
      "reddit",
      "facebook",
      "hacker-news",
      "stacker-news",
      "primal"
    ],
    "tools": [
      "social-post",
      "social-login",
      "social-status",
      "social-platforms",
      "social-supported-platforms",
      "social-sample-content",
      "social-posting-stats",
      "social-validate-content"
    ]
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Tool Info Endpoints

Each tool provides a `/info` endpoint that returns the tool's schema:

- `GET /tools/social-post/info`
- `GET /tools/social-login/info`
- `GET /tools/social-status/info`
- `GET /tools/social-platforms/info`
- `GET /tools/social-supported-platforms/info`
- `GET /tools/social-sample-content/info`
- `GET /tools/social-validate-content/info`
- `GET /tools/social-posting-stats/info`

## Platform IDs

| Platform     | ID             | Description                           |
| ------------ | -------------- | ------------------------------------- |
| X (Twitter)  | `x`            | Post to X (formerly Twitter)          |
| LinkedIn     | `linkedin`     | Post to LinkedIn professional network |
| Reddit       | `reddit`       | Post to Reddit communities            |
| Facebook     | `facebook`     | Post to Facebook                      |
| Hacker News  | `hacker-news`  | Submit to Hacker News                 |
| Stacker News | `stacker-news` | Post to Stacker News                  |
| Primal       | `primal`       | Post to Primal (Nostr)                |

## Content Structure

### Text Content

```json
{
  "text": "Your message here",
  "type": "text"
}
```

### Link Content

```json
{
  "text": "Check this out!",
  "link": "https://example.com",
  "type": "link"
}
```

### Link Only

```json
{
  "link": "https://example.com",
  "type": "link"
}
```

## Error Handling

All endpoints return errors in a consistent format:

```json
{
  "error": "Error message describing what went wrong",
  "statusCode": 400
}
```

### Common Error Codes

- **400 Bad Request**: Invalid parameters or content
- **500 Internal Server Error**: Service or platform errors

### Common Error Messages

- `"Missing required parameter: content"`
- `"Content must be an object"`
- `"Content must have either text or link"`
- `"Link must be a valid URL"`
- `"Platform must be a string"`
- `"Text is too long for some platforms (maximum 280 characters recommended)"`

## Authentication Flow

1. **Check Status**: Use `social-status` to see which platforms are authenticated
2. **Login**: Use `social-login` to authenticate with platforms
3. **Verify**: Use `social-platforms` to confirm available platforms
4. **Post**: Use `social-post` to publish content

## Rate Limiting

The module respects platform rate limits:

- X (Twitter): 300 posts per 15-minute window
- LinkedIn: 100 posts per day
- Reddit: Varies by subreddit
- Other platforms: Varies

## Security Considerations

- All authentication happens through browser automation
- Session data is stored securely
- No credentials are logged or exposed
- Browser sessions can be configured to run headless
- Environment variables should be used for sensitive configuration

## Examples

### Complete Posting Workflow

```javascript
// 1. Check current status
const statusResponse = await fetch('/tools/social-status', { method: 'POST' });
const status = await statusResponse.json();

// 2. Login if needed
if (!status.result.x.loggedIn) {
  await fetch('/tools/social-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      platform: 'x',
      options: { headless: false },
    }),
  });
}

// 3. Validate content
const content = {
  text: 'Hello from MCP! 🚀',
  type: 'text',
};

const validationResponse = await fetch('/tools/social-validate-content', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ content }),
});

// 4. Post content
const postResponse = await fetch('/tools/social-post', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    content,
    platforms: ['x', 'linkedin'],
  }),
});

const result = await postResponse.json();
console.log('Post result:', result);
```

## Troubleshooting

### Common Issues

1. **Login Failures**

   - Ensure browser can access the platform
   - Check for 2FA requirements
   - Verify platform credentials

2. **Post Failures**

   - Validate content before posting
   - Check platform-specific limits
   - Ensure proper authentication

3. **Platform Unavailable**
   - Check authentication status
   - Re-authenticate if needed
   - Verify platform is supported

### Debug Mode

Set environment variables for debugging:

```bash
SOCIAL_POSTER_HEADLESS=false  # Show browser
DEBUG=social-poster:*         # Enable debug logs
```
