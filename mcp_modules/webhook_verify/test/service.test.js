import { expect } from 'chai';
import { createHmac } from 'node:crypto';
import {
  verify, verifyStripe, verifyGithub, verifySlack, verifyShopify, verifyTwilio, verifyHmac, REASONS,
} from '../src/service.js';

const SECRET = 'whsec_test_secret';
const BODY = '{"id":"evt_1","type":"payment_intent.succeeded"}';
const NOW = 1700000000;

const stripeHeader = (ts = NOW, secret = SECRET, body = BODY) =>
  `t=${ts},v1=${createHmac('sha256', secret).update(`${ts}.${body}`).digest('hex')}`;

describe('stripe', () => {
  it('accepts a valid signature', () => {
    expect(verifyStripe(SECRET, BODY, stripeHeader(), { nowSeconds: NOW }).valid).to.be.true;
  });
  it('rejects a tampered body', () => {
    const r = verifyStripe(SECRET, `${BODY} `, stripeHeader(), { nowSeconds: NOW });
    expect(r.valid).to.be.false;
    expect(r.reason).to.equal(REASONS.MISMATCH);
  });
  it('rejects a replayed signature', () => {
    const r = verifyStripe(SECRET, BODY, stripeHeader(NOW - 86400), { nowSeconds: NOW });
    expect(r.reason).to.equal(REASONS.STALE);
  });
  it('rejects a future-dated timestamp', () => {
    const r = verifyStripe(SECRET, BODY, stripeHeader(NOW + 86400), { nowSeconds: NOW });
    expect(r.reason).to.equal(REASONS.STALE);
  });
  it('accepts any matching v1 during secret rotation', () => {
    const older = createHmac('sha256', 'old').update(`${NOW}.${BODY}`).digest('hex');
    const current = createHmac('sha256', SECRET).update(`${NOW}.${BODY}`).digest('hex');
    const r = verifyStripe(SECRET, BODY, `t=${NOW},v1=${older},v1=${current}`, { nowSeconds: NOW });
    expect(r.valid).to.be.true;
  });
  it('rejects a header without a timestamp', () => {
    expect(verifyStripe(SECRET, BODY, 'v1=deadbeef', { nowSeconds: NOW }).reason)
      .to.equal(REASONS.MALFORMED);
  });
  it('rejects a non-numeric timestamp', () => {
    expect(verifyStripe(SECRET, BODY, 't=abc,v1=deadbeef', { nowSeconds: NOW }).reason)
      .to.equal(REASONS.MALFORMED);
  });
});

describe('github', () => {
  const header = (secret = SECRET, body = BODY) =>
    `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`;

  it('accepts a valid signature', () => {
    expect(verifyGithub(SECRET, BODY, header()).valid).to.be.true;
  });
  it('rejects a wrong secret', () => {
    expect(verifyGithub('other', BODY, header()).reason).to.equal(REASONS.MISMATCH);
  });
  it('rejects a missing sha256= prefix', () => {
    const bare = createHmac('sha256', SECRET).update(BODY).digest('hex');
    expect(verifyGithub(SECRET, BODY, bare).reason).to.equal(REASONS.MALFORMED);
  });
  it('rejects a truncated signature without throwing', () => {
    expect(verifyGithub(SECRET, BODY, header().slice(0, 20)).reason).to.equal(REASONS.MISMATCH);
  });
});

describe('slack', () => {
  it('accepts a valid signature', () => {
    const sig = `v0=${createHmac('sha256', SECRET).update(`v0:${NOW}:${BODY}`).digest('hex')}`;
    expect(verifySlack(SECRET, BODY, String(NOW), sig, { nowSeconds: NOW }).valid).to.be.true;
  });
  it('rejects an old request', () => {
    const ts = NOW - 9999;
    const sig = `v0=${createHmac('sha256', SECRET).update(`v0:${ts}:${BODY}`).digest('hex')}`;
    expect(verifySlack(SECRET, BODY, String(ts), sig, { nowSeconds: NOW }).reason)
      .to.equal(REASONS.STALE);
  });
});

describe('shopify', () => {
  it('accepts a valid signature', () => {
    const digest = createHmac('sha256', SECRET).update(BODY).digest('base64');
    expect(verifyShopify(SECRET, BODY, digest).valid).to.be.true;
  });
  it('rejects non-base64 input', () => {
    expect(verifyShopify(SECRET, BODY, '!!!not base64!!!').reason).to.equal(REASONS.MALFORMED);
  });
});

describe('twilio', () => {
  const url = 'https://example.com/hook';
  const params = { To: '+15550000', From: '+15551111', Body: 'hi' };

  it('accepts a valid signature', () => {
    const payload = url + Object.keys(params).sort().map((k) => `${k}${params[k]}`).join('');
    const sig = createHmac('sha1', 'token').update(payload).digest('base64');
    expect(verifyTwilio('token', url, params, sig).valid).to.be.true;
  });
  it('rejects a stale signature after params change', () => {
    const sig = createHmac('sha1', 'token').update(`${url}ToX`).digest('base64');
    expect(verifyTwilio('token', url, { To: 'Y' }, sig).reason).to.equal(REASONS.MISMATCH);
  });
});

describe('generic hmac', () => {
  it('accepts a matching hex digest', () => {
    const sig = createHmac('sha256', SECRET).update(BODY).digest('hex');
    expect(verifyHmac(SECRET, BODY, sig).valid).to.be.true;
  });
  it('rejects a non-hex signature', () => {
    expect(verifyHmac(SECRET, BODY, 'zzzz').reason).to.equal(REASONS.MALFORMED);
  });
});

describe('verify() dispatcher', () => {
  it('rejects an unsupported provider', () => {
    expect(verify({ provider: 'nope', secret: 's', signature: 'x' }).reason)
      .to.equal(REASONS.UNSUPPORTED);
  });
  it('rejects a missing secret', () => {
    expect(verify({ provider: 'github', signature: 'sha256=aa' }).reason)
      .to.equal(REASONS.MALFORMED);
  });
  it('always carries advice when it fails', () => {
    const r = verify({ provider: 'github', secret: 's', body: 'x', signature: `sha256=${'0'.repeat(64)}` });
    expect(r.valid).to.be.false;
    expect(r.advice).to.contain('Do not parse');
  });
  it('never returns a bare boolean', () => {
    const r = verify({ provider: 'hmac', secret: 's', body: 'x', signature: 'aa' });
    expect(r).to.be.an('object');
    expect(r).to.have.property('reason');
  });
});
