# Taskmarket Module — API Reference

All routes are mounted by `register(app)` in `index.js`. JSON bodies use
`content-type: application/json`.

## GET /taskmarket
Module status and version.

```json
{ "module": "taskmarket", "status": "active", "network": "base",
  "message": "Delegate work to Taskmarket — browse, create (authorized), and review submissions on Base." }
```

## GET /taskmarket/capabilities
Returns supported version, network, and the list of available tools.

## GET /taskmarket/tasks
Browse open tasks.
- Query: `limit` (default 20), `mode` (optional: bounty|claim|pitch|benchmark|auction)
- Response: `{ "tasks": <cli json> }`

## GET /taskmarket/tasks/:id
Get a single task's details / live status. `:id` must be a `0x`-prefixed hex string.

## POST /taskmarket/tasks
Create a funded task. **Requires `confirm: true`.**

Body:
```json
{
  "confirm": true,
  "description": "string (required)",
  "reward": 5,
  "durationHours": 48,
  "mode": "bounty",
  "visibility": "public",
  "network": "base",
  "maxSpend": 5
}
```
Validation (all enforced before any spend):
- `confirm === true` else `400 requireConfirmation`
- `network === "base"` else `400 Unsupported network`
- `reward > 0` and `reward <= maxSpend` else `400`
- `durationHours > 0` else `400`
Response: `{ "created": <cli json with taskId/link> }`

## GET /taskmarket/tasks/:id/submissions
List submissions for a task, returned verbatim for **human review**. Never auto-accepted.

## POST /taskmarket/tasks/:id/submissions/:subId/accept
Accept a submission. **Requires `confirm: true`.** Costs 0.001 USDC.
- Body: `{ "confirm": true }`
- Response: `{ "accepted": <cli json> }`
