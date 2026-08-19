/**
 * HTTP handlers for the webhook_verify module.
 */

import { webhookVerifyService, SUPPORTED_PROVIDERS } from './service.js';

/**
 * POST /webhook-verify/verify
 */
export async function verifyWebhook(c) {
  try {
    const params = await c.req.json();
    if (!params.provider) {
      return c.json({ error: 'Missing required parameter: provider' }, 400);
    }
    if (!SUPPORTED_PROVIDERS.includes(params.provider)) {
      return c.json(
        { error: `Unsupported provider: ${params.provider}`, supported: SUPPORTED_PROVIDERS },
        400
      );
    }
    if (!params.secret) {
      return c.json({ error: 'Missing required parameter: secret' }, 400);
    }
    if (!params.signature) {
      return c.json({ error: 'Missing required parameter: signature' }, 400);
    }
    const result = webhookVerifyService.verify(params);
    // A failed verification is a valid answer, not a server error.
    return c.json({ ...result, provider: params.provider, timestamp: new Date().toISOString() });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
}

/**
 * GET /webhook-verify/providers
 */
export function listProviders(c) {
  return c.json({
    providers: SUPPORTED_PROVIDERS,
    notes: {
      stripe: 'Stripe-Signature header (t=..,v1=..). Replay-protected. Multiple v1 values supported during rotation.',
      github: 'X-Hub-Signature-256 header (sha256=..).',
      slack: 'X-Slack-Signature (v0=..) plus X-Slack-Request-Timestamp. Replay-protected.',
      shopify: 'X-Shopify-Hmac-Sha256 header (base64).',
      twilio: 'X-Twilio-Signature over the full URL plus sorted POST params (HMAC-SHA1).',
      hmac: 'Generic hex HMAC over the raw body.',
    },
  });
}
