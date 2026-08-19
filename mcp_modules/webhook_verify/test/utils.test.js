import { expect } from 'chai';
import { extractFromHeaders, redact } from '../src/utils.js';

describe('extractFromHeaders', () => {
  it('is case-insensitive', () => {
    expect(extractFromHeaders('github', { 'X-Hub-Signature-256': 'sha256=aa' }).signature)
      .to.equal('sha256=aa');
    expect(extractFromHeaders('github', { 'x-hub-signature-256': 'sha256=aa' }).signature)
      .to.equal('sha256=aa');
  });
  it('returns both signature and timestamp for slack', () => {
    const out = extractFromHeaders('slack', {
      'X-Slack-Signature': 'v0=aa',
      'X-Slack-Request-Timestamp': '1700000000',
    });
    expect(out.signature).to.equal('v0=aa');
    expect(out.timestamp).to.equal('1700000000');
  });
  it('returns an empty object for an unknown provider', () => {
    expect(extractFromHeaders('nope', { a: 'b' })).to.deep.equal({});
  });
});

describe('redact', () => {
  it('never reveals the middle of a secret', () => {
    const out = redact('whsec_supersecretvalue');
    expect(out).to.not.contain('supersecret');
    expect(out).to.contain('***');
  });
  it('fully masks short secrets', () => {
    expect(redact('short')).to.equal('***');
  });
  it('handles empty input', () => {
    expect(redact('')).to.equal('(empty)');
  });
});
