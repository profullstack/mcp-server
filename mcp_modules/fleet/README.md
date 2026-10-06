# fleet

The Profullstack fleet catalog over MCP: 62 services, their APIs, MCP servers,
installers and pwamart listings, from `@profullstack/stack/fleet`. Every service
signs in with CoinPay OAuth.

| Tool | Does |
| --- | --- |
| `fleet_list_services` | All services, filtered by `category` or a surface (`has: "mcp"`) |
| `fleet_get_service` | One service by domain, URL or name |
| `fleet_search_services` | Search by what you need |
| `fleet_get_auth` | CoinPay OAuth issuer, discovery, scopes, PKCE, callback path |

HTTP: `GET /fleet`, `GET /fleet/services?category=&has=`, `GET /fleet/services/:domain`,
`POST /tools/fleet/<tool>`.

This module exports `callTool(name, args)`, so MCP `tools/call` runs it in-process
and returns the result (the core falls back to the HTTP-endpoint note for modules
without it).
