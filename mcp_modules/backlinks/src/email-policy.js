/** A mailbox-specific emergency stop shared with other Profullstack senders. */
export function assertEmailSenderAllowed(...addresses) {
  const blocked = new Set(
    (process.env.EMAIL_QUEUE_BLOCKED_SENDERS || '')
      .split(',')
      .map(address => address.trim().toLowerCase())
      .filter(Boolean)
  );
  if (addresses.some(address => typeof address === 'string' && blocked.has(address.trim().toLowerCase()))) {
    throw new Error('Outbound sending from this mailbox is paused for administrator review.');
  }
}
