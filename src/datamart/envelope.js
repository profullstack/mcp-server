/**
 * Common response envelope (PRD §16.2).
 *
 * `next_cursor` is present only when the source supports continuation. Counts
 * describe the stated snapshot and coverage, never "everything that exists".
 */
import { randomUUID } from 'node:crypto';

/**
 * @param {Object} p
 * @param {unknown[]} p.data
 * @param {Record<string, unknown>} [p.meta]
 * @param {Array<Record<string, unknown>>} [p.sources]
 * @param {string[]} [p.warnings]
 */
export function envelope({ data, meta = {}, sources = [], warnings = [] }) {
  return {
    data,
    meta: {
      request_id: randomUUID(),
      retrieved_at: new Date().toISOString(),
      next_cursor: null,
      ...meta,
    },
    sources,
    warnings,
  };
}
