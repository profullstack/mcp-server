# Webhook Verify Module

Timing-safe, replay-resistant webhook signature verification for **Stripe, GitHub, Slack, Shopify, Twilio** and generic HMAC.

Zero dependencies — `node:crypto` only.

## Why

Webhook verification is the piece of security code almost every backend rewrites, and it fails in four predictable ways:

| Mistake | Consequence |
|---|---|
| `signature === expected` | Byte-by-byte comparison leaks the position of the first wrong byte through timing |
| No timestamp check | A captured valid request stays valid forever; replay it tomorrow and it passes |
| Verifying the parsed body | Re-serialising shifts key order or whitespace, the HMAC stops matching, and people "fix" it by disabling verification |
| Returning bare `false` | A caller writes `if (verify(...))` and a truthy value slips through |

This module does the opposite of each: `timingSafeEqual` with an explicit length check first, replay windows on every provider that signs a timestamp (symmetric, so future-dated timestamps are rejected too), verification against the **raw** body, and a structured result carrying a specific `reason`.

## Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/webhook-verify` | Module information |
| GET | `/webhook-verify/providers` | Supported providers and header notes |
| POST | `/webhook-verify/verify` | Verify a signature |
| GET | `/tools/webhook_verify/info` | MCP tool schema |
| POST | `/tools/webhook_verify` | MCP tool endpoint |

## Usage

```bash
curl -X POST http://localhost:3000/tools/webhook_verify \
  -H 'Content-Type: application/json' \
  -d '{
    "provider": "github",
    "secret": "your-webhook-secret",
    "body": "{\"action\":\"opened\"}",
    "signature": "sha256=..."
  }'
```

Success:

```json
{ "tool": "webhook_verify", "provider": "github", "result": { "valid": true, "reason": "ok" } }
```

Failure — always with a specific reason, never a bare `false`:

```json
{
  "result": {
    "valid": false,
    "reason": "timestamp_out_of_range",
    "detail": "timestamp 1699913600 is outside the +/-300s window",
    "advice": "Do not parse or act on this payload."
  }
}
```

Reasons: `ok`, `signature_mismatch`, `timestamp_out_of_range`, `malformed_signature`, `unsupported_provider`.

## Per-provider input

| provider | required | notes |
|---|---|---|
| `stripe` | `secret`, `body`, `signature` | `Stripe-Signature` (`t=..,v1=..`). Replay-protected. Multiple `v1` values accepted during secret rotation. |
| `github` | `secret`, `body`, `signature` | `X-Hub-Signature-256` (`sha256=..`) |
| `slack` | `secret`, `body`, `timestamp`, `signature` | `X-Slack-Signature` (`v0=..`) + `X-Slack-Request-Timestamp`. Replay-protected. |
| `shopify` | `secret`, `body`, `signature` | `X-Shopify-Hmac-Sha256` (base64) |
| `twilio` | `secret`, `url`, `params`, `signature` | HMAC-SHA1 over URL + sorted params |
| `hmac` | `secret`, `body`, `signature` | Generic hex HMAC (default sha256) |

`toleranceSeconds` (default `300`) sets the replay window where applicable.

**Pass the raw body.** Verifying a re-serialised object will fail for reasons that have nothing to do with the signature.

## Tests

```bash
pnpm test
```

29 tests: valid signatures for all providers, tampered bodies, wrong secrets, truncated signatures, replayed and future-dated timestamps, malformed headers (missing prefix, bad base64, non-hex, non-numeric timestamp), Stripe rotation, and secret redaction.
