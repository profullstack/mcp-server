import assert from 'node:assert/strict';
import test from 'node:test';
import { assertEmailSenderAllowed } from '../src/email-policy.js';

test('blocks a configured mailbox before SMTP or Mailgun is called', () => {
  const previous = process.env.EMAIL_QUEUE_BLOCKED_SENDERS;
  process.env.EMAIL_QUEUE_BLOCKED_SENDERS = 'other@gmail.com, ettinger@gmail.com';
  try {
    assert.throws(() => assertEmailSenderAllowed('ettinger@gmail.com'), /paused for administrator review/);
    assert.throws(() => assertEmailSenderAllowed('ETTINGER@gmail.com'));
    assert.doesNotThrow(() => assertEmailSenderAllowed('business@example.com'));
  } finally {
    if (previous === undefined) delete process.env.EMAIL_QUEUE_BLOCKED_SENDERS;
    else process.env.EMAIL_QUEUE_BLOCKED_SENDERS = previous;
  }
});
