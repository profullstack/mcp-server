/**
 * Title and MCP hint annotations for every tool in tools/list.
 *
 * The Claude Connectors Directory and the ChatGPT app directory want a human
 * `title` and explicit readOnlyHint / destructiveHint / openWorldHint booleans
 * on each tool. Most modules declare their tools as bare names, so the hints
 * live here, keyed by tool name. A module may still declare `title` or
 * `annotations` on a tool object; those win over this table.
 *
 * readOnly: looks something up, changes nothing.
 * destructive: deletes, overwrites, or irreversibly sends (posts, email).
 * openWorld: reaches third-party sites or APIs.
 */

const RO = (openWorldHint) => ({ readOnlyHint: true, destructiveHint: false, openWorldHint, idempotentHint: true });
const WRITE = (destructiveHint, openWorldHint, idempotentHint) => ({
  readOnlyHint: false,
  destructiveHint,
  openWorldHint,
  ...(idempotentHint === undefined ? {} : { idempotentHint }),
});

export const TOOL_META = {
  template: { title: 'Template Example', annotations: RO(false) },
  'readme-badges': { title: 'Generate README Badges', annotations: WRITE(true, false, true) },
  craigslist: { title: 'Search Craigslist', annotations: RO(true) },
  'seo-ranking': { title: 'Check SEO Ranking', annotations: RO(true) },
  wcag: { title: 'Test WCAG Compliance', annotations: RO(true) },

  fleet_list_services: { title: 'List Fleet Services', annotations: RO(false) },
  fleet_get_service: { title: 'Get Fleet Service', annotations: RO(false) },
  fleet_search_services: { title: 'Search Fleet Services', annotations: RO(false) },
  fleet_get_auth: { title: 'Get Fleet Sign-In Details', annotations: RO(false) },

  scanner: { title: 'Scan Web App Security', annotations: WRITE(false, true) },

  'social-post': { title: 'Post to Social Media', annotations: WRITE(true, true) },
  'social-login': { title: 'Log In to Social Platform', annotations: WRITE(false, true) },
  'social-status': { title: 'Social Login Status', annotations: RO(false) },
  'social-platforms': { title: 'List Social Platforms', annotations: RO(false) },
  'social-supported-platforms': { title: 'List Supported Social Platforms', annotations: RO(false) },
  'social-sample-content': { title: 'Sample Social Content', annotations: RO(false) },
  'social-validate-content': { title: 'Validate Social Content', annotations: RO(false) },
  'social-posting-stats': { title: 'Social Posting Stats', annotations: RO(false) },
  'social-module-info': { title: 'Social Module Info', annotations: RO(false) },

  webhook_verify: { title: 'Verify Webhook Signature', annotations: RO(false) },
  fake_json: { title: 'Generate Fake JSON', annotations: RO(true) },
  'tides-currents': { title: 'Get Tides and Currents', annotations: RO(true) },
  'crypto-badge': { title: 'Generate Crypto Payment Badge', annotations: RO(false) },
  'link-shortener': { title: 'Shorten Link', annotations: WRITE(false, true) },

  datamart_search: { title: 'Search Datamart Near a Place', annotations: RO(false) },
  resource_get: { title: 'Get Datamart Resource', annotations: RO(false) },
  resource_capabilities: { title: 'Datamart Provider Capabilities', annotations: RO(false) },
  provider_status: { title: 'Datamart Provider Status', annotations: RO(false) },
  gov_services_search: { title: 'Search Government Services', annotations: RO(false) },
  datagov_search: { title: 'Search Data.gov', annotations: RO(true) },
  datagov_get_record: { title: 'Get Data.gov Record', annotations: RO(true) },
  datagov_list_organizations: { title: 'List Data.gov Organizations', annotations: RO(true) },
  libraries_search: { title: 'Search Public Libraries', annotations: RO(false) },
  library_get: { title: 'Get Public Library', annotations: RO(false) },
  loc_search: { title: 'Search Library of Congress', annotations: RO(true) },
  loc_list_collections: { title: 'List Library of Congress Collections', annotations: RO(true) },
  loc_get_item: { title: 'Get Library of Congress Item', annotations: RO(true) },
  loc_get_resource_links: { title: 'Get Library of Congress Files', annotations: RO(true) },
  education_search: { title: 'Search Schools and Colleges', annotations: RO(false) },
  education_get: { title: 'Get School or College', annotations: RO(false) },
  contracts_sources: { title: 'List Contract Opportunity Sources', annotations: RO(false) },

  'qr-generator': { title: 'Generate QR Code', annotations: RO(false) },
  lighthouse: { title: 'Run Lighthouse Audit', annotations: RO(true) },
  weather: { title: 'Get Weather', annotations: RO(true) },
  backlinks: { title: 'Discover and Submit Backlinks', annotations: WRITE(true, true) },
  email_checker: { title: 'Check Email Address', annotations: RO(true) },
  'news-aggregator': { title: 'Aggregate News', annotations: RO(true) },
  check_domain_availability: { title: 'Check Domain Availability', annotations: RO(true) },
  generate_domain_suggestions: { title: 'Suggest Domain Names', annotations: RO(true) },
  get_tld_presets: { title: 'List TLD Presets', annotations: RO(false) },
  bulk_domain_check: { title: 'Bulk Check Domains', annotations: RO(true) },
  linkchecker: { title: 'Check Links', annotations: RO(true) },
  convert2doc: { title: 'Convert Document', annotations: RO(true) },
};

/** "fleet_get_service" -> "Fleet Get Service", for a tool missing from the table. */
export const humanTitle = (name) =>
  String(name)
    .split(/[-_.\s]+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(' ');

// A tool nobody has classified gets the MCP spec's own conservative defaults.
const UNKNOWN = { readOnlyHint: false, destructiveHint: true, openWorldHint: true };

/** The title and annotations tools/list reports for a tool, declared values first. */
export function describeTool(name, declared = {}) {
  const meta = TOOL_META[name] || {};
  return {
    title: declared.title || meta.title || humanTitle(name),
    annotations: { ...UNKNOWN, ...(meta.annotations || {}), ...(declared.annotations || {}) },
  };
}
