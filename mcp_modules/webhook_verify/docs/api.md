# webhook_verify API

## POST /tools/webhook_verify

Verify a webhook signature.

### Request

| field | type | required | description |
|---|---|---|---|
| `provider` | string | yes | `stripe` \| `github` \| `slack` \| `shopify` \| `twilio` \| `hmac` |
| `secret` | string | yes | Signing secret or auth token |
| `signature` | string | yes | Provider signature header value |
| `body` | string | for all but twilio | Raw request body, byte-identical |
| `timestamp` | string | slack only | `X-Slack-Request-Timestamp` |
| `url` | string | twilio only | Full request URL |
| `params` | object | twilio only | POST form parameters |
| `toleranceSeconds` | number | no | Replay window, default `300` |

### Response

```json
{
  "tool": "webhook_verify",
  "provider": "stripe",
  "result": { "valid": true, "reason": "ok" },
  "timestamp": "2026-01-01T00:00:00.000Z"
}
```

A failed verification returns HTTP 200 with `valid: false` — it is a valid answer, not a server error.
Missing or unsupported parameters return HTTP 400.

### Reasons

| reason | meaning |
|---|---|
| `ok` | Signature valid and within the replay window |
| `signature_mismatch` | Computed digest does not match |
| `timestamp_out_of_range` | Outside the replay window, in either direction |
| `malformed_signature` | Header absent or not in the documented shape |
| `unsupported_provider` | Unknown provider |

## GET /webhook-verify/providers

Returns the supported providers and the header each one uses.
