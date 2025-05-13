# Health Check Module

This module provides detailed health check endpoints for the MCP server. It monitors system resources, server status, and module health.

## Features

- Detailed health check endpoint with comprehensive server status
- System information endpoint with hardware and OS details
- Automatic integration with the core MCP server health system

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health/detailed` | GET | Get detailed health information about the server, including system resources, models, and modules |
| `/system/info` | GET | Get system information including CPU, memory, and OS details |

## Usage Examples

### Get Detailed Health Information

```javascript
fetch('http://localhost:3000/health/detailed')
  .then(response => response.json())
  .then(data => console.log(data));
```

Example response:
```json
{
  "health": {
    "status": "healthy",
    "timestamp": "2025-05-12T14:30:00Z",
    "uptime": 3600,
    "models": {
      "active": "gpt-4",
      "available": 3,
      "status": "active"
    },
    "modules": {
      "count": 2,
      "names": ["example", "health-check"]
    }
  },
  "system": {
    "platform": "linux",
    "arch": "x64",
    "nodeVersion": "v20.0.0",
    "uptime": 3600,
    "processMemory": {
      "rss": 50000000,
      "heapTotal": 30000000,
      "heapUsed": 20000000,
      "external": 1000000
    },
    "systemMemory": {
      "total": 8000000000,
      "free": 4000000000,
      "usage": 50
    },
    "cpus": 4,
    "loadAverage": [0.5, 0.7, 0.8]
  }
}
```

### Get System Information

```javascript
fetch('http://localhost:3000/system/info')
  .then(response => response.json())
  .then(data => console.log(data));
```

Example response:
```json
{
  "platform": "linux",
  "arch": "x64",
  "nodeVersion": "v20.0.0",
  "uptime": 3600,
  "processMemory": {
    "rss": 50000000,
    "heapTotal": 30000000,
    "heapUsed": 20000000,
    "external": 1000000
  },
  "systemMemory": {
    "total": 8000000000,
    "free": 4000000000,
    "usage": 50
  },
  "cpus": 4,
  "loadAverage": [0.5, 0.7, 0.8]
}
```

## Integration with Monitoring Systems

The health check endpoints are designed to be easily integrated with monitoring systems like Prometheus, Grafana, or simple uptime monitors. The `/health/detailed` endpoint provides comprehensive information for detailed monitoring, while the core `/health` endpoint provides a simple status check suitable for basic uptime monitoring.