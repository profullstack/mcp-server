/**
 * Provider registry (PRD §7, §8, §9, §10, §11, §13).
 *
 * One manifest per logical connector. Every capability states what works now;
 * planned work is `unsupported` with a reason, so no listing over-claims.
 * Datamart is operated by Profullstack, Inc. and is not affiliated with any of
 * these institutions.
 */
import { validateManifest, headlineState } from './capabilities.js';
import { DatamartError } from './errors.js';

const OPERATOR = 'Profullstack, Inc.';

const planned = (operation, reason, extra = {}) => ({
  operation,
  state: 'unsupported',
  implementationState: 'planned',
  reason,
  ...extra,
});
const notPlanned = (operation, reason, extra = {}) => ({
  operation,
  state: 'unsupported',
  implementationState: 'not_planned',
  reason,
  ...extra,
});
const directory = (operation, note) => ({ operation, state: 'directory_only', note });
const publicRead = (operation, tool, note) => ({
  operation,
  state: 'public_read',
  tool,
  authenticationRequired: false,
  externalMutation: false,
  ...(note ? { note } : {}),
});

const base = m => ({ operator: OPERATOR, officialAffiliation: false, country: 'US', ...m });

export const MANIFESTS = [
  base({
    id: 'us.ca.sos.bizfile',
    namespace: 'gov',
    path: '/gov/us/ca/bizfile',
    name: 'California Secretary of State — BizFile',
    organization: 'California Secretary of State',
    jurisdiction: { level: 'state', region: 'CA' },
    officialUrl: 'https://bizfileonline.sos.ca.gov/',
    infoUrl: 'https://www.sos.ca.gov/business-programs/bizfile/',
    sources: ['https://www.sos.ca.gov/business-programs/bizfile/'],
    facts: [
      'Since August 1, 2026, Statement of Information filings require BizFile web User Access.',
      'New entity numbers can be 12 characters beginning with "B"; older numbers remain valid. Treat them as strings.',
    ],
    capabilities: [
      directory('services.discover', 'Official BizFile links and access requirements.'),
      planned('entity.search', 'No documented public API; a verified read source has not been integrated yet.'),
      planned('filing.prepare', 'Statement of Information drafts are planned (Phase D).', { target: 'datamart_draft' }),
      planned('filing.submit', 'Submission channel not implemented or validated; requires entity access and an authorized signer.', {
        target: 'agency_record',
        requires: ['entity_access', 'authorized_signer', 'final_approval'],
      }),
    ],
  }),
  base({
    id: 'us.gsa.datagov',
    namespace: 'gov',
    path: '/gov/us/data',
    name: 'Data.gov catalog',
    organization: 'U.S. General Services Administration',
    jurisdiction: { level: 'federal' },
    officialUrl: 'https://catalog.data.gov/',
    infoUrl: 'https://resources.data.gov/catalog-api/',
    sources: ['https://resources.data.gov/catalog-api/'],
    configuration: { env: 'DATAGOV_API_KEY' },
    capabilities: [
      publicRead('datasets.search', 'datagov_search', 'Catalog API v4 metadata; cursor pagination.'),
      publicRead('record.get', 'datagov_get_record', 'Per-dataset harvest record.'),
      publicRead('organizations.list', 'datagov_list_organizations'),
      notPlanned('dataset.write', 'Datasets are changed only by their publishing agency.'),
    ],
  }),
  base({
    id: 'us.irs',
    namespace: 'gov',
    path: '/gov/us/irs',
    name: 'Internal Revenue Service',
    organization: 'U.S. Department of the Treasury, Internal Revenue Service',
    jurisdiction: { level: 'federal' },
    officialUrl: 'https://www.irs.gov/',
    infoUrl: 'https://www.irs.gov/forms-instructions',
    sources: ['https://www.irs.gov/e-file-providers/transmitter-technical-fact-sheet'],
    facts: ['IRS e-file runs through authorized providers/transmitters with acknowledgements; it is not a website write API.'],
    capabilities: [
      directory('services.discover', 'Official IRS service, forms and account links.'),
      planned('forms.search', 'Structured forms/instructions search is planned.'),
      planned('workflow.prepare', 'Preparation and tax-software handoffs are planned (Phase D).', { target: 'datamart_draft' }),
      notPlanned('return.efile', 'Direct e-file requires an approved transmitter program; Datamart is not one.'),
    ],
  }),
  base({
    id: 'us.ca.ftb',
    namespace: 'gov',
    path: '/gov/us/ca/ftb',
    name: 'California Franchise Tax Board',
    organization: 'California Franchise Tax Board',
    jurisdiction: { level: 'state', region: 'CA' },
    officialUrl: 'https://www.ftb.ca.gov/',
    infoUrl: 'https://www.ftb.ca.gov/myftb/',
    sources: ['https://www.ftb.ca.gov/tax-pros/efile/efile-for-developers.html'],
    facts: ['FTB accepts e-file submissions only through approved software providers.'],
    capabilities: [
      directory('services.discover', 'Official FTB forms, MyFTB and service links.'),
      planned('workflow.prepare', 'Request and return preparation is planned (Phase D).', { target: 'datamart_draft' }),
      notPlanned('return.efile', 'Requires approved-software-provider status, which Datamart does not have.'),
    ],
  }),
  base({
    id: 'us.ca.dmv',
    namespace: 'gov',
    path: '/gov/us/ca/dmv',
    name: 'California Department of Motor Vehicles',
    organization: 'California Department of Motor Vehicles',
    jurisdiction: { level: 'state', region: 'CA' },
    officialUrl: 'https://www.dmv.ca.gov/portal/dmv-online/',
    sources: ['https://www.dmv.ca.gov/portal/dmv-online/'],
    capabilities: [
      directory('services.discover', 'Official DMV online services directory.'),
      planned('workflow.prepare', 'Appointment, renewal and address-change preparation is planned; each action is verified separately.', {
        target: 'datamart_draft',
      }),
      planned('appointment.book', 'No approved automation channel verified.'),
    ],
  }),
  base({
    id: 'us.ca.edd',
    namespace: 'gov',
    path: '/gov/us/ca/edd',
    name: 'California Employment Development Department',
    organization: 'California Employment Development Department',
    jurisdiction: { level: 'state', region: 'CA' },
    officialUrl: 'https://edd.ca.gov/en/about_edd/online_services/',
    sources: [
      'https://edd.ca.gov/en/about_edd/online_services/',
      'https://edd.ca.gov/Payroll_Taxes/approved_fset_providers.htm',
    ],
    facts: ['Employer filings can use the FSET application-to-application program for approved providers; claimant benefits are a separate, personal process.'],
    capabilities: [
      directory('services.discover', 'Official EDD employer and claimant service links, kept separate.'),
      planned('employer.prepare', 'Employer task preparation is planned; FSET transmission is a separate approval.', { target: 'datamart_draft' }),
      notPlanned('claim.certify', 'Benefit certifications are personal sworn declarations and are never automated.'),
    ],
  }),
  base({
    id: 'us.loc',
    namespace: 'lib',
    path: '/lib/us/loc',
    name: 'Library of Congress — loc.gov digital collections',
    organization: 'Library of Congress',
    jurisdiction: { level: 'federal' },
    officialUrl: 'https://www.loc.gov/',
    infoUrl: 'https://www.loc.gov/apis/json-and-yaml/',
    sources: [
      'https://www.loc.gov/apis/json-and-yaml/',
      'https://www.loc.gov/apis/json-and-yaml/working-within-limits/',
    ],
    facts: ['The JSON API covers loc.gov digital collections, not the full catalog or reader services. Limit: 20 requests/minute.'],
    capabilities: [
      publicRead('collections.search', 'loc_search'),
      publicRead('collections.list', 'loc_list_collections'),
      publicRead('item.get', 'loc_get_item'),
      publicRead('item.resources', 'loc_get_resource_links'),
      notPlanned('record.write', 'Library of Congress records are read-only to Datamart.'),
    ],
  }),
  base({
    id: 'us.ca.libraries',
    namespace: 'lib',
    path: '/lib',
    name: 'Public library outlets near you',
    organization: 'Public library systems (IMLS Public Libraries Survey)',
    jurisdiction: { level: 'local', region: 'CA' },
    officialUrl: 'https://www.imls.gov/research-evaluation/data-collection/public-libraries-survey',
    sources: ['IMLS Public Libraries Survey FY2024'],
    capabilities: [
      publicRead('directory.search', 'libraries_search', 'Versioned snapshot of IMLS FY2024 outlets with survey geocodes.'),
      publicRead('directory.get', 'library_get'),
      planned('catalog.search', 'Per-system catalog reads are added only when a public interface is verified.'),
      planned('account.holds', 'Holds and renewals need authenticated library-system interfaces; none integrated.'),
    ],
  }),
  base({
    id: 'us.ca.education',
    namespace: 'edu',
    path: '/edu',
    name: 'Public schools and colleges near you',
    organization: 'NCES (Common Core of Data, EDGE, IPEDS)',
    jurisdiction: { level: 'local', region: 'CA' },
    officialUrl: 'https://nces.ed.gov/',
    sources: ['NCES CCD 2023-24', 'NCES EDGE 2023-24 geocodes', 'NCES IPEDS HD2023'],
    capabilities: [
      publicRead('directory.search', 'education_search', 'Public K-12 sites and public colleges; versioned NCES snapshot.'),
      publicRead('directory.get', 'education_get'),
      planned('enrollment.prepare', 'Private enrollment checklists are planned.', { target: 'datamart_draft' }),
      notPlanned('student_records.read', 'Student records are excluded from launch and need a separate reviewed integration.'),
    ],
  }),
  base({
    id: 'us.sam.opportunities',
    namespace: 'contracts',
    path: '/contracts',
    name: 'SAM.gov contract opportunities',
    organization: 'U.S. General Services Administration',
    jurisdiction: { level: 'federal' },
    officialUrl: 'https://sam.gov/search/?index=opp',
    infoUrl: 'https://open.gsa.gov/api/get-opportunities-public-api/',
    sources: ['https://open.gsa.gov/api/get-opportunities-public-api/'],
    configuration: { env: 'SAM_API_KEY' },
    capabilities: [
      directory('opportunities.discover', 'Official SAM.gov opportunity search.'),
      planned('opportunities.search', 'SAM Opportunities API ingestion is Phase B.'),
      planned('application.prepare', 'Applicant profiles and application drafts are Phase B.', { target: 'datamart_draft' }),
      notPlanned('proposal.submit', 'The SAM opportunities API is read-only; submissions follow each notice’s instructions.'),
    ],
  }),
  base({
    id: 'us.ca.caleprocure',
    namespace: 'contracts',
    path: '/contracts',
    name: 'Cal eProcure (California State Contracts Register)',
    organization: 'State of California',
    jurisdiction: { level: 'state', region: 'CA' },
    officialUrl: 'https://caleprocure.ca.gov/',
    sources: ['https://fiscal.ca.gov/user-support/cal-eprocure-resources/'],
    capabilities: [
      directory('opportunities.discover', 'Official California bid search.'),
      planned('opportunities.search', 'Ingestion planned for Phase B after source terms are reviewed.'),
    ],
  }),
  base({
    id: 'us.ca.santaclaracounty.procurement',
    namespace: 'contracts',
    path: '/contracts',
    name: 'County of Santa Clara Procurement',
    organization: 'County of Santa Clara',
    jurisdiction: { level: 'county', region: 'CA', locality: 'Santa Clara County' },
    officialUrl: 'https://prc.santaclaracounty.gov/opportunities-and-active-contracts1',
    sources: ['https://prc.santaclaracounty.gov/opportunities-and-active-contracts1'],
    capabilities: [
      directory('opportunities.discover', 'Official county opportunity listings.'),
      planned('opportunities.search', 'Ingestion planned for Phase B.'),
    ],
  }),
  base({
    id: 'us.ca.cityofsantaclara.purchasing',
    namespace: 'contracts',
    path: '/contracts',
    name: 'City of Santa Clara Purchasing',
    organization: 'City of Santa Clara',
    jurisdiction: { level: 'city', region: 'CA', locality: 'Santa Clara' },
    officialUrl: 'https://www.santaclaraca.gov/our-city/departments-a-f/finance/purchasing/bid-opportunities',
    sources: ['https://www.santaclaraca.gov/our-city/departments-a-f/finance/purchasing/bid-opportunities'],
    facts: ['The City (not the County) of Santa Clara directs bidders to its own procurement portal; follow the official page.'],
    capabilities: [
      directory('opportunities.discover', 'Official city bid page.'),
      planned('opportunities.search', 'Ingestion planned for Phase B.'),
    ],
  }),
  base({
    id: 'us.coinpay.finance',
    namespace: 'finance',
    path: '/finance',
    name: 'Your finances via CoinPay',
    organization: 'CoinPay (Profullstack, Inc.)',
    jurisdiction: { level: 'private' },
    officialUrl: 'https://coinpayportal.com/',
    sources: [],
    capabilities: [
      planned('accounts.read', 'Requires reviewed per-user CoinPay delegation (Phase C). Never available on a public endpoint.', {
        authenticationRequired: true,
      }),
      planned('transactions.read', 'Phase C, authenticated only.', { authenticationRequired: true }),
      planned('reports.read', 'Phase C, authenticated only.', { authenticationRequired: true }),
      notPlanned('payments.send', 'Datamart does not move money.'),
    ],
  }),
].map(validateManifest);

export const NAMESPACES = {
  gov: { title: 'Government services', description: 'U.S. federal and California services, with official links and what Datamart can do for each.' },
  lib: { title: 'Libraries', description: 'Library of Congress collections and public library branches near you.' },
  edu: { title: 'Education', description: 'Public schools (pre-K through 12) and public colleges near you.' },
  contracts: { title: 'Contracts', description: 'Government contract opportunities. Search and applications arrive in Phase B; official sources are linked now.' },
  finance: { title: 'Finance', description: 'Your own accounts through CoinPay. Private, authenticated, not yet available.' },
  search: { title: 'Search', description: 'Search across namespaces near a ZIP, city, address or coordinates.' },
};

export function summarize(m) {
  return {
    id: m.id,
    namespace: m.namespace,
    name: m.name,
    organization: m.organization,
    jurisdiction: m.jurisdiction,
    path: m.path,
    official_url: m.officialUrl,
    headline_state: headlineState(m),
    official_affiliation: false,
    operator: m.operator,
  };
}

export function listProviders({ namespace } = {}) {
  return MANIFESTS.filter(m => !namespace || m.namespace === namespace).map(summarize);
}

export function getManifest(id) {
  const m = MANIFESTS.find(x => x.id === id);
  if (!m) throw new DatamartError('not_found', `No provider with id ${id}`);
  return m;
}

/** Runtime status: capability is separate from configuration and health (PRD §7.2). */
export function providerStatus(id, health = {}) {
  const m = getManifest(id);
  const env = m.configuration?.env;
  return {
    id: m.id,
    configuration: env ? (process.env[env] ? 'configured' : 'configuration_required') : 'not_required',
    ...(env ? { configuration_env: env } : {}),
    health: health[m.id] || { status: 'unknown' },
    capabilities: m.capabilities.map(c => ({ operation: c.operation, state: c.state })),
  };
}
