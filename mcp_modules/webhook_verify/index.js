/**
 * Webhook Verify Module
 *
 * Timing-safe, replay-resistant webhook signature verification for Stripe, GitHub,
 * Slack, Shopify, Twilio and generic HMAC.
 */

import { logger } from '../../src/utils/logger.js';
import { verifyWebhook, listProviders } from './src/controller.js';
import { webhookVerifyService, SUPPORTED_PROVIDERS } from './src/service.js';

/**
 * Register this module with the Hono app
 * @param {import('hono').Hono} app - The Hono app instance
 */
export async function register(app) {
  logger.info('Registering webhook_verify module');

  app.get('/webhook-verify', (c) => {
    return c.json({
      module: 'webhook_verify',
      status: 'active',
      message: 'Timing-safe webhook signature verification',
      providers: SUPPORTED_PROVIDERS,
      version: metadata.version,
    });
  });

  app.get('/webhook-verify/providers', listProviders);
  app.post('/webhook-verify/verify', verifyWebhook);

  app.get('/tools/webhook_verify/info', (c) => {
    return c.json({
      name: 'webhook_verify',
      description:
        'Verify a webhook signature with a timing-safe comparison and replay protection. ' +
        'Call this before parsing or acting on any webhook payload.',
      parameters: {
        provider: {
          type: 'string',
          description: `Signature scheme. One of: ${SUPPORTED_PROVIDERS.join(', ')}`,
          required: true,
        },
        secret: {
          type: 'string',
          description: 'Signing secret or auth token for the provider',
          required: true,
        },
        signature: {
          type: 'string',
          description: 'The provider signature header value',
          required: true,
        },
        body: {
          type: 'string',
          description: 'The RAW request body, byte-identical to what was received',
          required: false,
        },
        timestamp: {
          type: 'string',
          description: 'Required for slack (X-Slack-Request-Timestamp)',
          required: false,
        },
        url: { type: 'string', description: 'Required for twilio: the full request URL', required: false },
        params: { type: 'object', description: 'Required for twilio: the POST form parameters', required: false },
        toleranceSeconds: {
          type: 'number',
          description: 'Replay window in seconds for providers that sign a timestamp (default 300)',
          required: false,
        },
      },
    });
  });

  app.post('/tools/webhook_verify', async (c) => {
    try {
      const params = await c.req.json();

      if (!params.provider) {
        return c.json({ error: 'Missing required parameter: provider' }, 400);
      }
      if (!params.secret) {
        return c.json({ error: 'Missing required parameter: secret' }, 400);
      }
      if (!params.signature) {
        return c.json({ error: 'Missing required parameter: signature' }, 400);
      }

      const result = webhookVerifyService.verify(params);

      return c.json({
        tool: 'webhook_verify',
        provider: params.provider,
        result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      return c.json({ error: error.message }, 500);
    }
  });

  app.get('/modules/webhook_verify', (c) => {
    return c.json(metadata);
  });

  logger.info('Webhook verify module registered successfully');
}

/**
 * Unregister this module (cleanup)
 */
export async function unregister() {
  logger.info('Unregistering webhook_verify module');
}

/**
 * Module metadata
 */
export const metadata = {
  name: 'Webhook Verify Module',
  version: '1.0.0',
  description:
    'Timing-safe, replay-resistant webhook signature verification for Stripe, GitHub, Slack, Shopify, Twilio and generic HMAC',
  author: 'profullstack community',
  tools: ['webhook_verify'],
  endpoints: [
    { path: '/webhook-verify', method: 'GET', description: 'Get module information' },
    { path: '/webhook-verify/providers', method: 'GET', description: 'List supported providers' },
    { path: '/webhook-verify/verify', method: 'POST', description: 'Verify a webhook signature' },
    { path: '/tools/webhook_verify', method: 'POST', description: 'Webhook verify tool endpoint' },
  ],
};
