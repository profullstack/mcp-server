/**
 * Typed Datamart errors (PRD §16.3).
 *
 * Every failure a person or agent can act on carries a stable code. HTTP routes
 * map the code to a status; MCP tools return it as an isError result. A missing
 * credential or a challenge page is never turned into an empty success.
 */

/** @type {Record<string, number>} code -> HTTP status */
export const ERROR_STATUS = {
  invalid_filters: 400,
  ambiguous_location: 400,
  location_unresolved: 422,
  insufficient_geospatial_coverage: 422,
  country_not_supported: 422,
  not_found: 404,
  authentication_required: 401,
  insufficient_scope: 403,
  approval_required: 403,
  configuration_required: 503,
  human_required: 409,
  unsupported_operation: 501,
  source_rate_limited: 429,
  source_unavailable: 502,
  stale_notice: 409,
  submission_unknown: 409,
};

export class DatamartError extends Error {
  /**
   * @param {keyof typeof ERROR_STATUS} code
   * @param {string} message
   * @param {Record<string, unknown>} [details]
   */
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'DatamartError';
    this.code = code;
    this.details = details;
  }

  get status() {
    return ERROR_STATUS[this.code] || 500;
  }

  toJSON() {
    return { error: { code: this.code, message: this.message, ...this.details } };
  }
}

/**
 * Normalize any thrown value to a DatamartError-shaped JSON body and status.
 * Unknown errors become a generic 500 without leaking internals.
 * @param {unknown} err
 * @returns {{ status: number, body: { error: { code: string, message: string } } }}
 */
export function toErrorResponse(err) {
  if (err instanceof DatamartError) {
    return { status: err.status, body: err.toJSON() };
  }
  return {
    status: 500,
    body: { error: { code: 'internal_error', message: 'Internal error' } },
  };
}
