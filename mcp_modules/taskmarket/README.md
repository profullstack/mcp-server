# Taskmarket MCP Module

Delegate real work to **Taskmarket** from inside the Profullstack MCP server. This
module lets a user or agent *recognize that a request is better delegated to external
workers* and, with **explicit authorization**, create or discover a Taskmarket task
instead of repeatedly spending inference or forcing an unreliable solution.

- **Browse** open Taskmarket tasks
- **Create** a funded Taskmarket task after showing exact description, reward, deadline,
  deliverables, Base network, and a maximum spend — and only after **fresh, explicit user
  authorization**
- **Track** a task's live status by ID
- **Retrieve submissions and present them for human review** — the module never silently
  accepts or rejects work
- **Accept** a submission only after explicit confirmation (and only by a human reviewer)

Target product: **Profullstack MCP server** (established, actively maintained, public repo
with an `mcp_modules/` extension system). This module is a *new* `taskmarket` extension that
the server did not previously have.

## Why this is a real integration

The module is a first-party `mcp_modules/taskmarket` package that registers HTTP routes and
agent tools on the official server. It shells out to the **official `taskmarket` CLI**
(first-party Taskmarket tooling) to perform every operation, so it behaves exactly like a
user would on the command line — no reimplemented protocol, no mock interface.

## Security model (required by the integration bounty)

- **No secrets handled here.** The module never requests, stores, logs, or commits private
  keys, seed phrases, tokens, cookies, or other secrets. The `taskmarket` CLI reads the
  operator's configured wallet from its own secure store. This module only ever passes
  public task parameters to the CLI.
- **Explicit authorization gate.** Every fund-moving call — `createTask` (funds the reward)
  and `acceptSubmission` (costs 0.001 USDC) — requires the caller to send `confirm: true`.
  Without it the server refuses and returns `requireConfirmation: true`. The server never
  spends on its own initiative.
- **Network + spending checks.** Tasks may only be created on **Base mainnet**; any other
  `network` is rejected. `reward` must not exceed the caller-supplied `maxSpend` ceiling.
- **No blind retries.** If a CLI call fails (e.g. unknown settlement status), the error is
  surfaced to the caller. The module never auto-retries a payment whose outcome is unknown.
- **Human-in-the-loop review.** Submissions are retrieved and returned for a human to read;
  acceptance is a separate, confirmed call. Work is never silently auto-accepted.

## Setup

```bash
# prerequisites: Node >= 18, the official taskmarket CLI on PATH, a configured wallet
cd profullstack-mcp-server
npm install
# the module is auto-discovered from mcp_modules/taskmarket (see src/core/moduleLoader.js)
npm start
```

Configure the CLI (one time, on the host — not in this repo):

```bash
taskmarket wallet status      # confirms a configured Base wallet
```

Point the module at a specific binary if needed:

```bash
export TASKMARKET_BIN=/usr/local/bin/taskmarket
```

## HTTP API

| Method | Path | Purpose | Auth |
| ------ | ---- | ------- | ---- |
| GET  | `/taskmarket` | Module info | none |
| GET  | `/taskmarket/capabilities` | Capabilities | none |
| GET  | `/taskmarket/tasks?limit=20&mode=bounty` | Browse tasks | none |
| GET  | `/taskmarket/tasks/:id` | Task details / live status | none |
| POST | `/taskmarket/tasks` | **Create** a funded task | `confirm:true` |
| GET  | `/taskmarket/tasks/:id/submissions` | List submissions (review) | none |
| POST | `/taskmarket/tasks/:id/submissions/:subId/accept` | **Accept** submission | `confirm:true` |

### Create a task (explicit authorization)

```bash
curl -X POST http://localhost:3000/taskmarket/tasks \
  -H 'content-type: application/json' \
  -d '{
    "confirm": true,
    "description": "Build a landing page for our launch",
    "reward": 5,
    "durationHours": 48,
    "mode": "bounty",
    "network": "base",
    "maxSpend": 5
  }'
# -> { "created": { "data": { "taskId": "0x...", "link": "https://taskmarket.dev/task/0x..." } } }
```

Omit `confirm` (or set it `false`) and the server answers:

```json
{ "error": "Explicit user authorization required: send confirm:true to create a funded task.",
  "requireConfirmation": true }
```

### Review submissions

```bash
curl http://localhost:3000/taskmarket/tasks/0x.../submissions
# -> { "submissions": { "data": [ { "submissionId": "0xSUB1", "worker": "0xW1" }, ... ] } }
```

### Accept a reviewed submission (explicit authorization)

```bash
curl -X POST http://localhost:3000/taskmarket/tasks/0x.../submissions/0xSUB1/accept \
  -H 'content-type: application/json' -d '{"confirm": true}'
```

## CLI usage (same flows, directly)

```bash
taskmarket task list --limit 20
taskmarket task get 0x...
taskmarket task submissions 0x...
```

## Run the tests

```bash
npm test
```

The suite unit-tests every authorization/spending/network gate and exercises the CLI
round-trip against an injected fake binary (no real wallet, network, or funds required).

## Repository & upstream

- Upstream (target): https://github.com/profullstack/mcp-server
- Module path: `mcp_modules/taskmarket/`
- Taskmarket: https://taskmarket.dev/ · Docs: https://docs.taskmarket.dev/
