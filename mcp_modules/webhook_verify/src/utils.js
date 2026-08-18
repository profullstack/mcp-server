/**
 * Helpers for the webhook_verify module.
 */

/**
 * Pull the signature material out of a raw header bag for a given provider.
 * Header names are matched case-insensitively, since Node lowercases incoming headers
 * but callers often paste them as documented by the provider.
 *
 * @param {string} provider
 * @param {Record<string,string>} headers
 * @returns {{signature?: string, timestamp?: string}}
 */
export function extractFromHeaders(provider, headers = {}) {
  const lower = {};
  for (const [k, v] of Object.entries(headers)) lower[k.toLowerCase()] = v;

  switch (provider) {
    case 'stripe':
      return { signature: lower['stripe-signature'] };
    case 'github':
      return { signature: lower['x-hub-signature-256'] };
    case 'slack':
      return {
        signature: lower['x-slack-signature'],
        timestamp: lower['x-slack-request-timestamp'],
      };
    case 'shopify':
      return { signature: lower['x-shopify-hmac-sha256'] };
    case 'twilio':
      return { signature: lower['x-twilio-signature'] };
    default:
      return {};
  }
}

/**
 * Redact a secret for logging. Never log the secret itself.
 * @param {string} secret
 * @returns {string}
 */
export function redact(secret) {
  if (typeof secret !== 'string' || secret.length === 0) return '(empty)';
  if (secret.length <= 8) return '***';
  return `${secret.slice(0, 3)}***${secret.slice(-2)}`;
}
