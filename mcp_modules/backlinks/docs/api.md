# Backlinks Module API Documentation

## Overview

The Backlinks module provides a comprehensive API for automated backlink discovery and submission. This document covers all available endpoints, request/response formats, and usage examples.

## Base URL

All API endpoints are relative to your MCP server base URL:

```
http://localhost:3000/backlinks
```

## Authentication

The module uses the same authentication as the parent MCP server. Ensure you have proper access credentials configured.

## Endpoints

### Module Information

#### GET /backlinks

Get basic module information and status.

**Response:**

```json
{
  "module": "backlinks",
  "status": "active",
  "message": "Automated backlink discovery and submission tool",
  "version": "1.0.0",
  "features": [
    "Site discovery and validation",
    "AI-powered content generation",
    "Automated form submission",
    "Follow-up email automation",
    "Campaign analytics and reporting"
  ]
}
```

#### GET /backlinks/health

Get module health status and statistics.

**Response:**

```json
{
  "module": "backlinks",
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "stats": {
    "totalCampaigns": 5,
    "totalSubmissions": 23,
    "activeCampaigns": 2
  },
  "browserStatus": "inactive"
}
```

### Campaign Management

#### GET /backlinks/campaigns

Get all campaigns.

**Response:**

```json
{
  "success": true,
  "count": 2,
  "campaigns": [
    {
      "id": "campaign_123",
      "productUrl": "https://example.com",
      "description": "AI-powered productivity tool",
      "keywords": ["productivity", "AI"],
      "status": "active",
      "createdAt": "2024-01-15T10:00:00.000Z",
      "submissions": ["sub_1", "sub_2"],
      "discoveredSites": [],
      "settings": {
        "maxSites": 50,
        "minDomainAuthority": 20,
        "autoSubmit": false
      }
    }
  ]
}
```

#### GET /backlinks/campaigns/:id

Get a specific campaign by ID.

**Parameters:**

- `id` (string): Campaign ID

**Response:**

```json
{
  "success": true,
  "campaign": {
    "id": "campaign_123",
    "productUrl": "https://example.com",
    "description": "AI-powered productivity tool",
    "keywords": ["productivity", "AI"],
    "status": "sites_discovered",
    "createdAt": "2024-01-15T10:00:00.000Z",
    "discoveredSites": [
      {
        "url": "https://startup-directory.com",
        "title": "Startup Directory",
        "score": 85,
        "eligible": true,
        "siteType": "directory"
      }
    ]
  }
}
```

#### POST /backlinks/campaigns

Create a new campaign.

**Request Body:**

```json
{
  "product_url": "https://myproduct.com",
  "description": "Revolutionary AI tool for productivity",
  "keywords": ["AI", "productivity", "automation"],
  "settings": {
    "max_sites": 30,
    "min_domain_authority": 25,
    "auto_submit": false,
    "follow_up": true
  }
}
```

**Response:**

```json
{
  "success": true,
  "message": "Campaign created successfully",
  "campaign": {
    "id": "campaign_456",
    "productUrl": "https://myproduct.com",
    "description": "Revolutionary AI tool for productivity",
    "keywords": ["AI", "productivity", "automation"],
    "status": "created",
    "createdAt": "2024-01-15T11:00:00.000Z",
    "settings": {
      "maxSites": 30,
      "minDomainAuthority": 25,
      "autoSubmit": false,
      "followUp": true
    }
  }
}
```

#### PUT /backlinks/campaigns/:id

Update an existing campaign.

**Parameters:**

- `id` (string): Campaign ID

**Request Body:**

```json
{
  "description": "Updated description",
  "keywords": ["new", "keywords"],
  "settings": {
    "max_sites": 40
  }
}
```

**Response:**

```json
{
  "success": true,
  "message": "Campaign updated successfully",
  "campaign": {
    "id": "campaign_456",
    "description": "Updated description",
    "updatedAt": "2024-01-15T12:00:00.000Z"
  }
}
```

#### DELETE /backlinks/campaigns/:id

Delete a campaign.

**Parameters:**

- `id` (string): Campaign ID

**Response:**

```json
{
  "success": true,
  "message": "Campaign deleted successfully"
}
```

### Site Discovery

#### POST /backlinks/campaigns/:id/discover

Discover potential backlink sites for a campaign.

**Parameters:**

- `id` (string): Campaign ID

**Request Body:**

```json
{
  "maxQueries": 5,
  "maxResults": 10
}
```

**Response:**

```json
{
  "success": true,
  "message": "Sites discovered successfully",
  "count": 8,
  "sites": [
    {
      "url": "https://startup-showcase.com",
      "title": "Startup Showcase",
      "description": "Submit your startup for exposure",
      "score": 85,
      "eligible": true,
      "siteType": "startup_showcase",
      "domainAuthority": 45,
      "monthlyTraffic": 25000,
      "discoveredAt": "2024-01-15T11:30:00.000Z"
    }
  ]
}
```

### Content Generation

#### POST /backlinks/campaigns/:id/generate-content

Generate tailored content for a specific site.

**Parameters:**

- `id` (string): Campaign ID

**Request Body:**

```json
{
  "site_url": "https://startup-showcase.com"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Content generated successfully",
  "content": {
    "title": "Revolutionary AI Productivity Tool",
    "description": "Discover the future of productivity with our AI-powered tool that helps teams collaborate more effectively...",
    "url": "https://myproduct.com",
    "keywords": "AI, productivity, automation",
    "category": "Productivity Tools",
    "tags": ["ai", "productivity", "tool", "automation"],
    "generatedAt": "2024-01-15T11:45:00.000Z"
  }
}
```

### Submissions

#### POST /backlinks/campaigns/:id/submit

Submit to a specific site.

**Parameters:**

- `id` (string): Campaign ID

**Request Body:**

```json
{
  "site_url": "https://startup-showcase.com",
  "auto_submit": true,
  "dry_run": false,
  "max_attempts": 3
}
```

**Response:**

```json
{
  "success": true,
  "message": "Submission completed",
  "submission": {
    "id": "sub_789",
    "campaignId": "campaign_456",
    "siteUrl": "https://startup-showcase.com",
    "status": "submitted",
    "createdAt": "2024-01-15T12:00:00.000Z",
    "submittedAt": "2024-01-15T12:01:00.000Z",
    "content": {
      "title": "Revolutionary AI Productivity Tool",
      "description": "..."
    },
    "result": {
      "success": true,
      "message": "Form submitted successfully"
    }
  }
}
```

#### POST /backlinks/campaigns/:id/batch-submit

Submit to multiple sites in batch.

**Parameters:**

- `id` (string): Campaign ID

**Request Body:**

```json
{
  "site_urls": ["https://site1.com", "https://site2.com", "https://site3.com"],
  "auto_submit": true,
  "dry_run": false
}
```

**Response:**

```json
{
  "success": true,
  "message": "Batch submission completed",
  "results": [
    {
      "site_url": "https://site1.com",
      "success": true,
      "submission": {
        "id": "sub_790",
        "status": "submitted"
      }
    },
    {
      "site_url": "https://site2.com",
      "success": false,
      "error": "Form not found"
    }
  ]
}
```

#### GET /backlinks/campaigns/:id/submissions

Get all submissions for a campaign.

**Parameters:**

- `id` (string): Campaign ID

**Response:**

```json
{
  "success": true,
  "count": 3,
  "submissions": [
    {
      "id": "sub_789",
      "campaignId": "campaign_456",
      "siteUrl": "https://startup-showcase.com",
      "status": "submitted",
      "createdAt": "2024-01-15T12:00:00.000Z"
    }
  ]
}
```

#### GET /backlinks/submissions/:submissionId

Get a specific submission by ID.

**Parameters:**

- `submissionId` (string): Submission ID

**Response:**

```json
{
  "success": true,
  "submission": {
    "id": "sub_789",
    "campaignId": "campaign_456",
    "siteUrl": "https://startup-showcase.com",
    "status": "submitted",
    "createdAt": "2024-01-15T12:00:00.000Z",
    "content": {
      "title": "Revolutionary AI Productivity Tool",
      "description": "..."
    },
    "result": {
      "success": true,
      "details": {
        "title": "filled",
        "description": "filled",
        "url": "filled",
        "submitted": true
      }
    }
  }
}
```

### Follow-up Automation

#### POST /backlinks/campaigns/:id/follow-ups

Send follow-up emails for pending submissions.

**Parameters:**

- `id` (string): Campaign ID

**Request Body:**

```json
{
  "smtp_host": "smtp.gmail.com",
  "smtp_port": 587,
  "smtp_user": "your-email@gmail.com",
  "smtp_pass": "your-app-password",
  "from_email": "your-email@gmail.com",
  "to_email": "admin@targetsite.com"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Follow-up emails processed",
  "results": [
    {
      "submissionId": "sub_789",
      "success": true,
      "result": {
        "messageId": "email_123"
      }
    }
  ]
}
```

### Analytics

#### GET /backlinks/campaigns/:id/analytics

Get comprehensive analytics for a campaign.

**Parameters:**

- `id` (string): Campaign ID

**Response:**

```json
{
  "success": true,
  "analytics": {
    "campaignId": "campaign_456",
    "totalSitesDiscovered": 15,
    "eligibleSites": 12,
    "totalSubmissions": 8,
    "successfulSubmissions": 6,
    "failedSubmissions": 1,
    "pendingSubmissions": 1,
    "averageSiteScore": 67.5,
    "topSites": [
      {
        "url": "https://best-site.com",
        "score": 95,
        "eligible": true
      }
    ],
    "recentSubmissions": [
      {
        "id": "sub_789",
        "status": "submitted",
        "createdAt": "2024-01-15T12:00:00.000Z"
      }
    ],
    "createdAt": "2024-01-15T10:00:00.000Z",
    "lastUpdated": "2024-01-15T13:00:00.000Z"
  }
}
```

## MCP Tool Interface

The module also provides a unified MCP tool interface accessible via:

### POST /tools/backlinks

**Request Body:**

```json
{
  "action": "create_campaign",
  "product_url": "https://myproduct.com",
  "description": "Product description",
  "keywords": ["keyword1", "keyword2"],
  "options": {
    "max_sites": 50
  }
}
```

### Available Actions

| Action             | Description                 | Required Parameters           |
| ------------------ | --------------------------- | ----------------------------- |
| `create_campaign`  | Create a new campaign       | `product_url`, `description`  |
| `discover_sites`   | Discover sites for campaign | `campaign_id`                 |
| `submit_to_site`   | Submit to specific site     | `campaign_id`, `site_url`     |
| `batch_submit`     | Submit to multiple sites    | `campaign_id`, `site_urls`    |
| `generate_content` | Generate content for site   | `campaign_id`, `site_url`     |
| `send_follow_ups`  | Send follow-up emails       | `campaign_id`, `email_config` |
| `get_analytics`    | Get campaign analytics      | `campaign_id`                 |
| `get_campaign`     | Get campaign details        | `campaign_id`                 |
| `list_campaigns`   | List all campaigns          | None                          |

## Error Responses

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Error message describing what went wrong"
}
```

### Common HTTP Status Codes

- `200` - Success
- `201` - Created (for POST requests)
- `400` - Bad Request (validation errors)
- `404` - Not Found (campaign/submission not found)
- `500` - Internal Server Error

## Rate Limiting

The module implements built-in rate limiting to respect target sites:

- 2-second delay between site discoveries
- 1-second delay between site scoring requests
- 2-second delay between batch submissions
- Configurable delays for custom workflows

## Best Practices

### 1. Campaign Setup

- Use specific, relevant keywords
- Set appropriate domain authority thresholds
- Start with smaller site limits for testing

### 2. Content Generation

- Review generated content before submission
- Customize descriptions for better relevance
- Use site-specific keywords when possible

### 3. Submission Strategy

- Always test with `dry_run: true` first
- Monitor submission success rates
- Focus on high-scoring sites for better results

### 4. Follow-up Management

- Wait 1-2 weeks before sending follow-ups
- Keep follow-up emails professional and brief
- Track response rates and adjust strategy

### 5. Analytics Monitoring

- Regularly check campaign performance
- Adjust keyword strategy based on results
- Focus resources on highest-performing sites

## Examples

See the [basic-usage.js](../examples/basic-usage.js) file for comprehensive examples of using the API.

## Support

For additional help:

- Check the main [README.md](../README.md) for setup instructions
- Review the troubleshooting section for common issues
- Submit issues through the project repository
