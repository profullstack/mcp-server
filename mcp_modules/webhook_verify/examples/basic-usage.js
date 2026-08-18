/**
 * webhook_verify — basic usage
 *
 * Run: node examples/basic-usage.js
 */

import { createHmac } from 'node:crypto';
import { verify } from '../src/service.js';

const SECRET = 'whsec_example';
const BODY = JSON.stringify({ action: 'opened', number: 42 });

// --- GitHub: a signature we generate ourselves, so it must verify ---
const githubSig = `sha256=${createHmac('sha256', SECRET).update(BODY).digest('hex')}`;
console.log('github, valid    :', verify({ provider: 'github', secret: SECRET, body: BODY, signature: githubSig }));

// --- GitHub: the same signature against a body that changed by one byte ---
console.log('github, tampered :', verify({ provider: 'github', secret: SECRET, body: `${BODY} `, signature: githubSig }));

// --- Stripe: correctly signed but a day old, so replay protection rejects it ---
const stale = Math.floor(Date.now() / 1000) - 86400;
const staleSig = createHmac('sha256', SECRET).update(`${stale}.${BODY}`).digest('hex');
console.log('stripe, replayed :', verify({
  provider: 'stripe', secret: SECRET, body: BODY, signature: `t=${stale},v1=${staleSig}`,
}));

// --- Stripe: freshly signed, so it passes ---
const now = Math.floor(Date.now() / 1000);
const freshSig = createHmac('sha256', SECRET).update(`${now}.${BODY}`).digest('hex');
console.log('stripe, fresh    :', verify({
  provider: 'stripe', secret: SECRET, body: BODY, signature: `t=${now},v1=${freshSig}`,
}));

// Never parse the payload before `valid` is true.
