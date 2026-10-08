# Datamart security notes (Phase A)

Phase A is public, read-only discovery. It holds no user accounts, credentials,
drafts or private data, so the controls below are about not leaking what users
type and not being turned against upstream sources.

- **No private tools exist.** Every tool is a public read and is safe to expose
  on the unauthenticated root `/mcp`. There is no finance, profile, application
  or approval tool on any endpoint; `/finance/mcp` answers 501. Private tools
  must not be added to `TOOLS` in `src/datamart/tools.js` until authenticated
  request context reaches the dispatcher (PRD §4.3).
- **Addresses.** Street addresses go only to the U.S. Census Geocoder, which
  responses disclose. They are never stored, are redacted as `[redacted]` in
  echoed `effective_filters`, and never appear in `meta.origin` (labelled
  "street address (redacted)"). The request logger records the path without
  the query string. ZIP and city search avoid sending an address anywhere.
- **Outbound requests.** Adapters can only reach `api.gsa.gov`, `www.loc.gov`
  and `geocoding.geo.census.gov` over HTTPS. Redirects are not followed. Links
  returned to users (handoffs, LoC files) are never fetched server-side.
- **Upstream protection.** Per-minute budgets under published limits; an hour's
  pause after 429 (and after 503 for loc.gov). CAPTCHA and challenge pages become
  `source_unavailable`; Datamart does not solve, bypass or rotate identities
  around them. The CDE school directory and several city library sites that
  challenge or refuse automated clients are not used.
- **Secrets.** `DATAGOV_API_KEY` is sent only in the `X-Api-Key` header, never in
  a URL, and is never echoed. Data.gov cache keys are URLs without the key.
- **Validation.** Every surface validates arguments with the same strict schema;
  unknown parameters are rejected with `invalid_filters`. Cursors are bound to a
  snapshot version and rejected when the snapshot changes; they are not signed,
  so a hand-made cursor can only move the offset within public results. Item and record ids
  are pattern-checked before they reach a URL path.
- **Honest output.** Missing configuration is a 503 `configuration_required`,
  never an empty 200. Coverage gaps (outside the launch area, private schools,
  preschools) are errors or explicit warnings, never empty lists that imply
  "nothing here".
