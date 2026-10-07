# Datamart operations

## Where it runs

Phase A ships inside the existing MCP server as `mcp_modules/datamart`, so it
deploys with the existing push-to-master workflow (`.github/workflows/deploy.yml`
→ `bin/deploy.sh` → `bin/provision.sh`, Bun runtime, `mcp.profullstack.com`).
No new host, database or worker. The new runtime dependencies
(`@modelcontextprotocol/sdk` 1.32.1, `zod` 4.6.5) are root dependencies, which
the provisioner installs with `pnpm install --prod`.

`datamart.help` is not wired up by this change. Pointing it at the same service,
or building the separate Next.js web app the PRD describes, is a later step; see
"Not done" below.

## Configuration

| Variable | Needed for | If unset |
| --- | --- | --- |
| `DATAGOV_API_KEY` | Data.gov tools | They return `configuration_required` (HTTP 503) with a catalog.data.gov handoff. DEMO_KEY is never used as a fallback. |
| `DATAMART_RPM_LOC`, `DATAMART_RPM_DATAGOV` | Optional per-minute request budgets | Defaults of 15/minute each |

Put production values in the team vault and the service environment, not a
committed `.env`.

## Provider limits

- **loc.gov**: 20 requests/minute published. Datamart sends at most 15/minute and
  stops calling loc.gov for an hour after any 429 or 503, because loc.gov restarts
  its one-hour block on every request made during it. Responses are cached
  (searches 30 min, items 6 h).
- **Data.gov**: a personal key allows 1,000 requests/hour. Datamart sends at most
  15/minute and pauses for an hour after a 429. Searches are cached 10 minutes.

Budgets and pauses are per process, which matches the single-instance deploy.
A `Retry-After` can lengthen a pause but never shorten it below the hour. The
CLI also saves pauses to `~/.cache/datamart/cooldowns.json` so separate runs
do not call a provider that is still blocking.
Run more instances and the published limits are shared, so lower the budgets.

## Checks after deploy

A homepage 200 is not evidence. Run these against the deployed host and keep
the output as release evidence:

```bash
H=https://mcp.profullstack.com
curl -s "$H/lib?zip=95030&radius_miles=3" | jq '.data[0].name, .meta.origin.label'   # "Los Gatos Public Library"
curl -s "$H/edu?zip=95032&type=university&radius_miles=15" | jq '[.data[].name]'     # ["San Jose State University"]
curl -s "$H/gov/us/irs" | jq .headline_state                                          # "directory_only"
curl -s "$H/lib/us/loc?q=los%20gatos&format=maps&per_page=3" | jq '.data[0].url'      # a loc.gov item URL
curl -s "$H/gov/us/data?q=public%20libraries&per_page=3" | jq '.data[0].title, .meta.next_cursor'
curl -s "$H/api/v1/health" | jq '.data[] | {id, configuration, health}'
curl -s -X POST "$H/lib/mcp" -H 'content-type: application/json' \
  -H 'accept: application/json, text/event-stream' -H 'mcp-protocol-version: 2025-11-25' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"libraries_search","arguments":{"zip":"95030","radius_miles":3}}}' \
  | jq '.result.structuredContent.data[0].name'
curl -s "$H/" | jq '.modules | length'                                                # existing catalog still answers
```

Rollback: revert the merge commit on master; the deploy workflow redeploys the
previous tree. The module adds no state, so there is nothing to migrate back.

## MCP protocol version

The official SDK 1.32.1 negotiates up to `2025-11-25`. The newer `2026-07-28`
specification revision is not yet supported by the SDK; Datamart follows the SDK
rather than claiming a version it does not implement. The pre-existing root
`/mcp` still answers with its own hand-written `2024-11-05` handshake.

## Not done in Phase A

- `datamart.help` DNS/hosting and the Next.js web app (`apps/datamart-web`).
- Turso/libSQL: Phase A needs no database (versioned snapshot files are the
  index). It arrives with private workspaces in Phase B.
- Contracts ingestion (SAM.gov, Cal eProcure, county and city), applicant
  profiles, applications, approvals (Phase B).
- CoinPay finance (Phase C). No finance tool or data path exists.
- Agency actions for BizFile, IRS, FTB, DMV, EDD (Phase D).
- Private schools, preschools, per-library catalog reads, hours and closures.
