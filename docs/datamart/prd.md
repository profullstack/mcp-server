# Datamart.help: Agentic Services Platform
## Product Requirements Document

| Document field | Value |
| --- | --- |
| Product | Datamart.help |
| Owner | Profullstack, Inc. |
| Document version | 1.0 |
| Date | October 7, 2026 |
| Primary implementation repository | `profullstack/mcp-server` |
| Human interface domain | `https://datamart.help` |
| MCP and resource directory | `https://mcp.profullstack.com` |
| Initial geography | United States; California; Santa Clara County; a 20-mile search radius around ZIP code 95032 |
| Delivery surfaces | Web, mobile-first PWA, API, SDK, CLI, TUI, and MCP; desktop and native mobile follow the shared implementation |
| Document status | Implementation specification, not a deployment report |

> **Delivery truth:** This document does not establish that Datamart is deployed, that a pull request was opened, or that any new connector is working. The preceding GitHub tree-write attempt was blocked by the tool because it could not determine the request's safety status. No more specific cause was provided. Treat earlier draft code as uncommitted and unverified. Inspect the repository before implementation and preserve unrelated work.

> **Implementation status:** see [capabilities.md](capabilities.md) for what Phase A implements and how each acceptance test is covered, and [operations.md](operations.md) for what is not done.

## 1. Product definition

Datamart is a unified interface through which people and their agents discover resources, retrieve information, prepare work, and complete authorized actions across government, libraries, education, procurement, and personal or business finance.

The initial product lives at **datamart.help**. Its resource adapters and MCP integrations belong in **profullstack/mcp-server** and are discoverable under **mcp.profullstack.com**. Each provider must have an identifiable connector, capability manifest, official-source attribution, and a working human fallback. Multiple providers may share an implementation without pretending to be the same institution.

The ambition is to become infrastructure that government organizations eventually adopt, sponsor, procure, or operate themselves, potentially supporting an official service such as `mcp.gov`. That is a long-term partnership goal, not current domain ownership or government authorization. Only eligible, verified U.S. government organizations may register and operate a `.gov` domain; an official deployment would require the appropriate governmental ownership and approvals. [S02]

**Working positioning:** One interface for services, opportunities, knowledge, and your finances. Built for people and agents.

Datamart must be useful before government agencies offer convenient APIs. The product therefore supports a progression from public data and official deep links to document preparation, user-assisted portal workflows, approved APIs, and verified submission. The progression must be visible. A link to a website is not an automated integration.

## 2. Decisions already made

These are requirements from the product owner, not questions to reopen during implementation.

| ID | Decision |
| --- | --- |
| D01 | Use `datamart.help`, not `sysops.ceo` or the unavailable `dotresource.com`. |
| D02 | Add the work to the Profullstack GitHub organization, primarily `profullstack/mcp-server`. |
| D03 | Follow the Profullstack stack and reuse its published packages. |
| D04 | Expose `/gov`, `/lib`, `/edu`, `/contracts`, `/finance`, and `/search`. |
| D05 | Begin with U.S. government resources; keep country-aware identifiers for later expansion. |
| D06 | Initial government resources: California BizFile, Data.gov, IRS, California FTB, DMV, and EDD. |
| D07 | Include Library of Congress independently under `/lib`. |
| D08 | Include libraries and public education around 95032, with a default 20-mile radius. Education includes nursery/preschool through college and university; private institutions follow. |
| D09 | Search accepts ZIP/postal code, coordinates, address, city, state, and country. Use `/search`, not a location-only `/loc` architecture. |
| D10 | Contracts include federal, state, local, and subcontractor opportunities, covering trades and knowledge work. |
| D11 | Contract search supports reusable deep-linked filters, open opportunities, and a recently closed view. |
| D12 | CLI/agents create a reusable applicant profile, prepare applications, and complete permitted steps with human fallback. |
| D13 | Bank access belongs under `/finance` and uses **CoinPay integrations**. Library of Congress is not connected through CoinPay. |
| D14 | Aim for the fullest authorized capability set, including CRUD where the underlying provider supports it. Never equate that goal with bypassing permissions. |
| D15 | Do not declare a launch successful until the actual custom-domain interfaces and advertised tools have passed production checks. |

## 3. Outcomes and scope

### 3.1 Primary user outcomes

A resident can find a nearby library or school, understand its service and eligibility information, and continue an application or reservation through the right institution. A business owner can find official government services, retrieve supported records, and prepare a filing without navigating several unrelated portals. A contractor or programmer can discover suitable government or subcontract work and prepare a traceable application from a reusable profile. An authorized CoinPay user can inspect their connected institutions, transactions, and reports without exposing them publicly.

An agent must be able to perform the same supported operation as the web or CLI, receive structured results, see what authorization is missing, and resume after a human completes a required step.

### 3.2 Launch scope versus completion scope

Launch in capability-labeled increments. A provider can be listed before all of its actions exist, but its listing must distinguish `directory_only`, `public_read`, `authenticated_read`, `prepare`, `assisted_action`, and `verified_action`.

A first public release requires real Data.gov and Library of Congress reads, a populated and geospatially correct local directory, and an honest government-service catalog. Procurement discovery, applicant workspaces, and private CoinPay access follow explicit release gates. The full requested product is not complete until those workstreams also pass their gates.

No release may substitute invented opportunities, static example bank balances, an ignored location filter, or an HTTP endpoint hint for a working advertised tool.

### 3.3 Explicit exclusions

The product does not claim government affiliation, unrestricted administrative access to government systems, guaranteed contract awards, universal tax-filing permission, or universal access to every library catalog. It does not submit sworn statements, move money, sign certifications, or file benefits claims without the required authority and approval. It does not make children's records public. It does not collect a user's bank password or ask an agent to copy MFA secrets into chat.

Government adoption, new country coverage, native mobile distribution, and provider-specific high-risk submissions are later milestones, not prerequisites for useful public discovery.

## 4. Stack and implementation placement

### 4.1 Verified stack baseline

The published Profullstack blueprint supports TypeScript/ESM, pnpm, Next/React with Hono, Turso or justified Postgres, CoinPay, MCP, and shared CLI/TUI surfaces. It identifies reusable packages including `@profullstack/stack`, `@profullstack/bridges`, `@profullstack/openprofile`, `@profullstack/hqtui`, `@profullstack/coinpay`, `@profullstack/throttle`, and `@profullstack/submit-feed`. Its deployment defaults include Railway and Porkbun, while existing applications should preserve appropriate infrastructure. [S01]

The inspected MCP repository package is version `1.6.0`, uses ESM and Hono, references `@profullstack/stack`, and has an established module architecture. Its existing tests and deployment machinery must be preserved rather than replaced as a side effect of this feature. [R01][R02][R03]

### 4.2 Proposed implementation decisions

These choices are implementation requirements for Datamart, not claims that the components are already installed.

| Layer | Decision |
| --- | --- |
| Existing MCP server | Extend its Hono module interface. Keep current routes, loaders, deployment target, and compatible JavaScript/JSDoc conventions. |
| Datamart web | Next/React app with a Hono-backed versioned API; use the versions verified against the current Profullstack blueprint and lock them. |
| Shared domain code | Runtime-independent packages for resource schemas, search, profiles, workflows, and provider adapters. No business rule belongs only in the renderer. |
| Initial Datamart database | Turso/libSQL for resource indexing and workspaces, with tenant ownership checks on every private access. Use bounded geographic candidate queries plus precise distance filtering. |
| Database escalation | Choose the stack's Postgres variant if measured concurrency, relational security, or spatial workload requires it. Document the decision before changing storage; do not migrate CoinPay's database. |
| Identity | Reuse the existing Profullstack/CoinPay identity integration through reviewed OAuth/PKCE flows. Keep app identity separate from consent to access bank or agency data. |
| Profiles | OpenProfile-compatible import/export for permitted fields, with a versioned Datamart extension for contractor requirements and evidence. |
| CLI/TUI | Shared SDK, commander-style CLI, and `@profullstack/hqtui`. |
| MCP | Official MCP SDK and tested protocol negotiation; no hand-written subset presented as full compatibility. |
| Files | Private object storage or a controlled volume; expiring, authorized downloads and tenant-aware metadata. |
| Jobs | Durable database-backed jobs with leases, retries, idempotency, and cancellation. Add a separate queue only when justified. |
| Testing | Retain the MCP repository's existing runner; test new packages with the stack-supported runner. Browser flows use Playwright. |
| Operations | Existing MCP deployment stays intact. New Datamart web hosting follows the stack default unless a repository audit establishes an existing target. |

Do not install every Profullstack package merely because it exists. Use shared packages where they remove duplicated functionality, verify their actual exports, and pin versions. No invented imports or configuration options.

### 4.3 Repository layout

Adapt the following proposed layout to the actual repository without moving existing files unnecessarily:

```text
profullstack/mcp-server/
  mcp_modules/
    datamart-registry/
    gov-bizfile/
    gov-data/
    gov-irs/
    gov-ftb/
    gov-dmv/
    gov-edd/
    lib-loc/
    lib-local/
    edu-directory/
    contracts/
    finance-coinpay/
  packages/
    datamart-core/
    datamart-schemas/
    datamart-db/
    datamart-client/
    datamart-cli/
  apps/
    datamart-web/
  services/
    datamart-worker/
  docs/datamart/
    prd.md
    capabilities.md
    sources.md
    operations.md
    security.md
  test/datamart/
```

One resource means one logical connector and manifest, not necessarily a separate operating-system process or repository. A library-system adapter can serve several branches. A district adapter can serve several schools. Each institution still gets its own resource page, identity, source attribution, and capability report.

Private finance execution must not accidentally become callable through the legacy unauthenticated global MCP dispatcher. Either enforce authenticated request context all the way into the dispatcher or isolate private MCP routes and servers until that is implemented and tested.

## 5. URL and namespace contract

### 5.1 Public interfaces

| Interface | Purpose |
| --- | --- |
| `/` | Datamart home and search entry. |
| `/gov` | U.S.-first government service directory. |
| `/gov/us/irs` | IRS resource interface. |
| `/gov/us/data` | Data.gov dataset discovery. |
| `/gov/us/ca/bizfile` | California business records and filing workflows. |
| `/gov/us/ca/ftb` | California tax resource interface. |
| `/gov/us/ca/dmv` | California DMV resource interface. |
| `/gov/us/ca/edd` | California EDD resource interface. |
| `/lib` | Local library and national collection discovery. |
| `/lib/us/loc` | Library of Congress interface. |
| `/lib/us/ca/:resourceId` | A local library system or branch. |
| `/edu` | Education directory, initially active public institutions. |
| `/edu/us/ca/:resourceId` | School, campus, or program detail. |
| `/contracts` | Open opportunities with filters and separate closed-history views. |
| `/contracts/category/:category` | Canonical category deep link. |
| `/contracts/opportunities/:opportunityId` | Notice detail and application entry. |
| `/contracts/applications/:applicationId` | Private application workspace. |
| `/contracts/profiles/:profileId` | Private applicant profile. |
| `/finance` | Private finance entry and CoinPay connection status. |
| `/finance/connections`, `/finance/accounts`, `/finance/transactions`, `/finance/reports` | Authorized finance views. |
| `/search` | Cross-namespace, location-aware discovery. |
| `/connections`, `/approvals`, `/activity` | Private connection, approval, and audit interfaces. |

Short aliases such as `/gov/irs` may redirect to country-qualified canonical URLs. Country is explicit in stored IDs even while the UI defaults to the United States. Do not use `/loc` for location search: `/lib/us/loc` refers to the Library of Congress.

### 5.2 MCP and API routing

On `mcp.profullstack.com`, namespace roots provide a catalog or interface metadata. Protocol endpoints end in `/mcp`:

```text
/gov/mcp
/gov/us/data/mcp
/gov/us/ca/bizfile/mcp
/lib/mcp
/lib/us/loc/mcp
/edu/mcp
/contracts/mcp
/finance/mcp              # authenticated only
```

Every implemented provider is available individually, and namespace aggregation exposes the same definitions. Preserve the existing root `/mcp` behavior; integrate only tools that can be executed correctly in that context. Private tools must never inherit anonymous availability from the root endpoint.

Datamart's web API uses `/api/v1/...`. Root MCP server catalogs and the Datamart home page remain separate; do not replace the server's existing JSON root with a frontend unexpectedly.

### 5.3 Search and deep-link syntax

```text
/search?zip=95032&country=US&radius_miles=20
/search?lat=37.24&lng=-121.96&radius_miles=20&namespace=lib
/search?address=100%20Villa%20Avenue&city=Los%20Gatos&state=CA&country=US
/search?city=Los%20Gatos&state=CA&country=US&namespace=edu&sector=public
/edu?zip=95032&radius_miles=20&type=preschool,elementary,middle,high,college
/contracts?level=federal,state,local&category=programming&status=open
/contracts/category/agentic-engineering?state=CA&remote=true
/contracts?status=closed&sort=recently_closed
```

Coordinates above are syntax examples, not a verified ZIP centroid.

Support the requested `/contracts/:filters` form as a saved-filter slug, for example `/contracts/programming-california`, resolving to an explicit saved filter definition. Reserve names such as `category`, `applications`, and `opportunities` to prevent routing collisions. Support `?filters=` as percent-encoded, validated JSON for advanced clients. Ordinary scalar query parameters override the equivalent JSON properties; the response returns the normalized effective filters. Unknown filters produce validation errors rather than being silently ignored.

Interpret the owner's term **InfoArc deep linking** as a stable, shareable information architecture unless an existing InfoArc format is found in the codebase. Do not invent an external InfoArc service or protocol. Keep any future adapter isolated from the canonical HTTP URLs.

Private profiles, tokens, account numbers, and application contents must never be encoded into shareable filter URLs. Saved private searches use opaque, authorized IDs; public filter links contain only non-sensitive criteria.

## 6. Location search requirements

### GEO-01: Resolve an actual search origin

Accept one origin form: paired latitude/longitude; a street address with locality; ZIP/postal code plus country; or city/state/country. If conflicting forms are provided, return `ambiguous_location` with candidate choices. Never silently discard the address in favor of a ZIP.

Use 95032 and 20 miles as the onboarding defaults for this launch, visibly shown to the user. Explicit inputs always replace those defaults. A ZIP-derived point must identify its source, precision, and dataset version. A city or postal centroid is not an exact street address.

### GEO-02: Apply the requested radius

Calculate distance from the resolved origin to validated branch/campus coordinates. The MVP distance is straight-line geographic distance, clearly labeled; it is not drive time. Use a bounding-box prefilter followed by the precise selected distance function. Store the distance-method version so results are reproducible.

A result with no trustworthy coordinates is not a confirmed radius match. Return unresolved records in a separate group only when requested. In a strict radius query, return `location_unresolved` or `insufficient_geospatial_coverage` instead of substituting the entire directory.

### GEO-03: Separate proximity from eligibility

Schools within 20 miles are not necessarily the user's assigned schools. Nearby libraries may have different card eligibility or reciprocal access rules. A state service's headquarters need not be nearby for the service to apply. Model `physical_distance`, `service_area`, and `eligibility` independently.

For contracts, distance refers to place of performance unless the user explicitly selects the buyer's office. Remote opportunities form an explicit filter; missing location is not equivalent to remote work.

### GEO-04: Return interpretable location metadata

Each response includes the resolved origin, normalized inputs, accuracy, radius and unit, whether distance filtering was applied, coverage warnings, and an opaque pagination cursor. Return `country_not_supported` for unimplemented countries rather than defaulting their addresses to California.

Exact addresses are private by default. Redact them from analytics, access logs, canonical public URLs, and error telemetry. User-requested searches may reach a configured geocoder; disclose that provider and data use. Provide a postal-code-only alternative.

## 7. Resource registry and capability model

### 7.1 Resource identity

Store an internal immutable resource ID separately from its friendly slug and provider ID. A record contains namespace, country, jurisdiction level, organization, resource type, official URLs, locations or service areas, contacts, source identifiers, retrieval timestamps, licensing/usage notes, and verification evidence.

Do not assume every official service uses a `.gov` hostname. An institution's authorized vendor portal can be valid, but its relationship must be established from the institution's official source.

### 7.2 Capability states

| State | Meaning shown to people and agents |
| --- | --- |
| `directory_only` | Official source and navigation available; no live structured provider read. |
| `public_read` | Structured public information can be retrieved and tested. |
| `authenticated_read` | Authorized account data can be read using a real connection. |
| `prepare` | Datamart can create a local draft or submission package. Nothing has been filed. |
| `assisted_action` | An authorized workflow can advance but contains a human step. |
| `verified_action` | A particular action has been executed and verified through an approved integration. |
| `unavailable` | Capability exists but is temporarily failing; retain the last verification evidence. |
| `unsupported` | Operation is not implemented or not permitted through the available channel. |

Separate capability from connection status and operational health. An API key being absent is a configuration state, not an empty dataset. A provider may have working search and unsupported submission at the same time.

### 7.3 Manifest example

The following is a proposed schema example, not evidence of an existing connection:

```json
{
  "id": "us.ca.sos.bizfile",
  "namespace": "gov",
  "country": "US",
  "jurisdiction": { "level": "state", "region": "CA" },
  "officialUrl": "https://bizfileonline.sos.ca.gov/",
  "operator": "Profullstack, Inc.",
  "officialAffiliation": false,
  "capabilities": [
    {
      "operation": "filing.prepare",
      "target": "datamart_draft",
      "state": "unsupported",
      "implementationState": "planned",
      "authenticationRequired": true,
      "externalMutation": false,
      "verification": null
    },
    {
      "operation": "filing.submit",
      "target": "agency_record",
      "state": "unsupported",
      "requires": ["entity_access", "authorized_signer", "final_approval"],
      "reason": "Submission channel not yet implemented and validated"
    }
  ]
}
```

Schema validation must reject unknown capability states. `implementationState=planned` describes development progress separately from runtime support. Published catalogs must show this example as planned/not yet available, never as a working preparation tool.

## 8. Government integrations

### 8.1 Initial provider workstreams

| Provider | Required discovery/read target | Preparation and authorized action target | Initial gate |
| --- | --- | --- | --- |
| California BizFile | Entity search, entity details, available filings, official instructions and access requirements. | Draft filing data, validate entity access, prepare Statements of Information and other selected filings; submit only through validated permitted channels. | Public reads must use a verified source; authenticated filing requires entity-level authorization. |
| Data.gov | Search dataset metadata, organizations, record details, and dataset distribution links. | Save searches and collections locally; hand off to the publishing agency for actual dataset access or publisher-only changes. | Production API key and current API contract. |
| IRS | Official service discovery, forms/instructions, and supported taxpayer information through authorized channels. | Prepare selected workflows and tax-software handoffs; approved e-file integration is a separate workstream. | No generic taxpayer-account CRUD assumption. |
| California FTB | Official forms, service discovery, and permitted account information. | Prepare requests and returns; use approved filing channels and human review where required. | Provider acceptance and authorized access. |
| California DMV | Service and appointment discovery, prerequisites, official document lists. | Prepare appointment, renewal, address-change, or other selected workflows; verify each supported action independently. | Account/identity requirements and provider-supported workflow. |
| California EDD | Public program/service discovery, employer and claimant routes kept distinct. | Prepare employer or claimant tasks; integrate approved employer transmission separately from personal benefits declarations. | Correct account role, required declarations, and approved channel. |

Each provider must implement a reliable human handoff from its first listing. This does not satisfy the eventual requirement for automated reads and actions, but it prevents a dead end while integration work proceeds.

### 8.2 Verified implementation constraints

**BizFile:** The Secretary of State states that, effective August 1, 2026, web User Access is required for Statement of Information filings. Newly registered corporations, LLCs, and limited partnerships may have 12-character identifiers beginning with `B`; existing identifiers remain in use. Preserve identifiers as strings and test both formats. Do not infer filing authority from public entity visibility. [S03]

**Data.gov:** New work should use the documented v4 Catalog API at `https://api.gsa.gov/technology/datagov/v4/`, rather than assume the older CKAN API is the current integration. It requires an API key and returns dataset metadata. Search pagination uses an `after` cursor. A dataset's download or query service belongs to its publisher and must be evaluated separately. [S04]

**IRS:** IRS e-file is a provider/transmitter workflow with acknowledgements, not an unrestricted website write API. Acceptance and rejection must remain distinct in Datamart's state model. Scope any direct transmission against the relevant program requirements. [S05]

**FTB:** FTB's developer guidance describes participation, testing, and approved-software requirements; it states that submissions are accepted through approved software providers. A Datamart portal adapter is not automatically an approved provider. [S06]

**DMV and EDD:** Use their official online-service directories as service-discovery sources, not evidence that every visible action has an automation API. EDD also documents an application-to-application FSET program for participating software/payroll providers; assess that as a separate employer integration. [S07][S08][S09]

### 8.3 Maximum authorized access

The owner's phrase **GOD mode** means an advanced operator view of every capability the current identity may legitimately use. It is not an endpoint that ignores authentication, ownership, role, purpose, or provider policy.

Translate CRUD into each provider's real semantics. Creating a Datamart filing draft is different from creating an agency record. Amending a submitted filing is different from editing an arbitrary database row. Canceling an appointment is different from deleting a historical government record. Return `unsupported_operation` when the provider has no corresponding operation.

Maintain a per-provider roadmap from public read to preparation to verified action. Do not expose fictional `delete_tax_return`, `update_bank_balance`, or generic agency-admin functions.

## 9. Libraries and Library of Congress

### 9.1 Library of Congress MCP

Use the official loc.gov JSON/YAML interface for supported digital-collection search, collection browsing, item metadata, and resource links. Preserve source identifiers, pagination, rights/restrictions, and links to the original record. The public API is not equivalent to the entire Library of Congress catalog or all library account services. [S10][S11]

Required initial tools are `loc_search`, `loc_list_collections`, `loc_get_item`, and `loc_get_resource_links`. Names are proposed and must be finalized consistently across CLI/API/MCP.

Use bounded pages, caching, a configurable per-provider request budget, and backoff. Treat rate limits and browser/challenge responses as operational errors, not empty search results; do not evade them with rotating identities. Consult the Library's published usage guidance when setting the production budget. [S12]

Reading publicly accessible metadata requires no CoinPay bank connection. Datamart bookmarks and reading lists are user-owned local resources with CRUD, while source collection records remain read-only unless an explicitly authorized provider integration permits more.

### 9.2 Local libraries around 95032

Build a source-backed branch directory, not a three-entry hard-coded list. Initial coverage audits must include Los Gatos, Santa Clara County Library District branches, San Jose Public Library branches, and Santa Clara City Library locations. Include only branches actually within the resolved radius in a radius result. The County Library District publishes its own location directory; Los Gatos publishes its library information separately. [S13][S14]

Target fields include address, validated coordinates, public contact information, official/catalog URLs, accessibility information, hours, closure notices, card eligibility, reservation links, and available service types. Record sources and freshness independently for hours and permanent location data.

Initially support directory search, catalog handoff, and any verified public catalog read. Add holds, renewals, bookings, and card applications per library system only when authenticated interfaces are available and tested. Do not represent creating a local reminder as renewing a book.

## 10. Education namespace

### EDU-01: Institution and program coverage

Launch with active public institutions and programs, including preschool/nursery, transitional kindergarten, elementary, middle/junior high, high school, adult/vocational education, community college, and public university. Design the schema for private institutions now and enable them as source coverage is verified.

The California School Directory includes public/private schools and district information, and CDE publishes downloadable public-school and district files. Use these as a primary K-12 baseline, supplemented with institutional sources rather than treating search-engine snippets as a maintained database. [S15][S16]

Community-college coverage should use the Chancellor's Office directory and official campus information. Preschool coverage needs additional sources: district/program directories and, where applicable, CDSS facility information. Do not label every nursery or childcare listing as public, licensed, or currently accepting enrollment. [S17][S18]

### EDU-02: Search and detail

Support sector, grade range, institution/program type, active status, district, charter indicator where sourced, radius, accessibility/service tags, and named campus. Search should distinguish a district headquarters, a school site, and a program offered at that site.

Return official enrollment/application links and explain whether attendance boundaries or other eligibility criteria require further verification. Never imply enrollment entitlement solely from a 20-mile match. An address lookup for school assignment is a separate, boundary-aware workflow.

### EDU-03: Privacy and actions

The public directory contains institutional information, not student data. A parent or authorized adult can prepare a private enrollment checklist and continue through the official school process. Gradebooks, attendance, health records, disability information, student IDs, and parent portals require a separately reviewed private integration and are excluded from initial launch.

No public indexing of children's profiles. No use of student or applicant records to enrich a public school listing. Track private-school accreditation, licensing, or public funding only when the relevant authoritative evidence is present.

## 11. Contracts: discovery, sources, and matching

### 11.1 Opportunity coverage

| Source class | Initial source plan | Required distinction |
| --- | --- | --- |
| Federal | SAM.gov Opportunities API and official notice attachments. | Solicitation, sources sought, presolicitation, special notice, award, and other notice types are not interchangeable. |
| California state | Cal eProcure / California State Contracts Register; agency-specific sources when needed. | Statewide opportunity coverage is not implied by indexing one department. |
| Santa Clara County | County Procurement Department opportunity pages and their verified vendor portals. | County and City of Santa Clara are different buyers. |
| Municipal/local | Los Gatos and nearby jurisdictions, beginning with verified official buyer pages; include relevant special districts and public institutions. | Document each source's ingestion, terms, and submission channel. |
| Subcontractors | Public/authorized prime-contractor solicitations, approved feeds, and owner-submitted opportunities. | A subcontract is not automatically a direct government contract; preserve the relationship and provenance. |

SAM's documented opportunity API is a retrieval interface with an API key, filters, and pagination. Do not treat it as a universal proposal-submission API. Cal eProcure provides California bid-discovery resources. County and City of Santa Clara publish separate procurement information; the City's official page identifies BidNet Direct for its current process. Follow official referrals rather than hard-coding a vendor assumption across buyers. [S19][S20][S21][S22]

If a source cannot be ingested reliably, display a labeled official-source handoff and a coverage gap. Do not fabricate an empty market or copy public browsing access into an unsupported assertion of API access.

### 11.2 Categories and stable deep links

Retain the owner's original opportunity labels while using simple category IDs:

| Category ID | Display label / focus |
| --- | --- |
| `multi-trade` | Self-Employed Multi-Discipline Construction Professional |
| `general-construction` | Full Service General Construction |
| `plumbing` | Licensed Master Plumber |
| `electrical` | Licensed Master Electrician |
| `flooring` | Flooring Technician |
| `painting` | Painters |
| `programming` | Programmer / Software Developer |
| `agentic-engineering` | Agentic Engineer / AI Agent Development |
| `web-development` | Web, API, PWA, and application development |
| `data-engineering` | Data pipelines, integration, and analytics engineering |
| `cybersecurity` | Security engineering and assessment |
| `devops` | Infrastructure, platform engineering, and operations |
| `technical-consulting` | Architecture, technical writing, research, and related knowledge work |

Category titles are discovery labels, not validated professional credentials. In particular, do not assert that a user holds a jurisdiction-specific "master" license. Evaluate the actual license class and evidence required by the solicitation.

Use versioned keyword/synonym sets and applicable classification mappings. AI/agentic work may be described using automation, software integration, workflow tooling, or related terms. Do not search only for the exact category title. NAICS/PSC mappings must be verified and must not replace reading mandatory requirements.

### 11.3 Filter contract

Required filters: keyword; category; government level; buyer/agency; country/state/county/city; place-of-performance radius; remote status; prime/subcontract role; notice type; open/closed/awarded/canceled status; posted date; deadline range; classification codes; set-aside requirements; supported submission channel; and relevant budget information when actually published.

Default to actionable **open solicitations**, not award notices or every record with an upstream `active` flag. Offer separate views for upcoming/market-research notices and recently closed history. Missing budget remains null; never use an award value as an unqualified solicitation budget.

### 11.4 Status, freshness, and sorting

Store raw source status, normalized notice type, due date/time and timezone, closure evidence, cancellation/award information, and the time each field was verified. Unknown or timezone-ambiguous deadlines must be visible and must not silently become the server's timezone.

`sort=recently_closed` selects closed history unless the user explicitly chooses another compatible status. Sort by the best supported closure timestamp, with its basis displayed. Do not use a future deadline as the closure time for an already canceled notice. Awarded notices can be a separate history filter.

Rank and sort across the locally indexed result set for a known coverage snapshot, then paginate. If an on-demand fallback searches only one upstream page, label `sort_scope=source_page`, report the limited coverage, and do not claim global ranking. A empty filtered page does not prove that subsequent source pages contain no matches.

Before starting or submitting an application, refresh the original notice, amendments, deadline, and submission instructions. If verification fails, stop the submission and keep the draft.

### 11.5 Matching explanation

Every recommendation explains its matching categories, service area, evidence-backed profile fit, and unresolved or disqualifying requirements. Separate a text-relevance score from eligibility. A profile with no verified certification must not be ranked as certified because its text resembles a set-aside label.

## 12. Contractor profiles and application workflow

### 12.1 Reusable applicant profile

CLI, web, and agents create the same versioned profile. Users can represent an individual, sole proprietor, or organization. Keep legal entity, business contact, capabilities, service area, past performance, references, certifications, licenses, insurance, bonding, relevant registration IDs, and signer authority as separately sourced fields.

Import only user-approved information. Fields have `user_supplied`, `source_verified`, `expired`, or `unknown` evidence state, plus document references and verification dates. Do not infer citizenship, ownership classifications, disability/veteran status, license status, or eligibility from a name, address, or company website.

Support OpenProfile-compatible export of a safe subset. Sensitive supporting documents and financial information remain private and are excluded by default. No real company or bank data in repository fixtures.

### 12.2 Application lifecycle

```text
matched -> shortlisted -> requirements_review -> drafting -> ready_for_review
        -> approved -> submitting -> submitted -> receipt_verified

Branches:
needs_information | human_required | stale_notice | rejected | withdrawn
submission_unknown | failed | canceled
```

`approved` is not `submitted`. A local file export is not `submitted`. A successful HTTP request is not automatically acceptance by the buyer. Track transport receipt, buyer receipt, and eventual acceptance or award as distinct facts.

### 12.3 Required workflow

1. Resolve the original opportunity and its current revision; distinguish proposal, quote, RFI, sources-sought response, or subcontract expression of interest.
2. Extract mandatory documents, page limits, formats, eligibility, submission channel, deadline/timezone, addendum acknowledgements, and named recipient. Cite the source section for each requirement.
3. Select an authorized profile and generate a compliance matrix: satisfied, missing, expired, inapplicable, or requires human determination.
4. Draft the response and attachments using only supported profile evidence. Flag generated claims for review. Never invent past projects, qualifications, signatures, prices, or certifications.
5. Show the exact target, documents, price/amount where applicable, representations, and final submission contents to the authorized reviewer.
6. Obtain action-specific approval. Execute supported provider steps, or open a resumable human handoff with the prepared package.
7. Capture official confirmation and provenance; reconcile uncertain outcomes before any retry. Track amendments and next steps without changing the submitted package silently.

Where accounts must be created on a procurement portal, agents may prepare the profile and form fields. The user or authorized representative completes identity checks, terms requiring personal acceptance, and other non-delegable steps. Datamart must not create accounts using invented details.

### 12.4 Human fallback

The handoff includes an official URL, current step, approved data package, missing information, deadline/timezone, and a resume mechanism. It must not place credentials or sensitive documents into query strings. Email and file delivery are external actions requiring explicit approval of destination and contents.

If the buyer requires a non-automatable portal, signed document, notarization, in-person act, or other human process, the application remains `human_required`. The agent can finish the preparation without falsely claiming completion.

### 12.5 Workspace CRUD

Users can create/update/delete their own drafts, profile versions, notes, and saved searches according to retention policy. External bid withdrawal or amendment is a separate capability with separate approval and receipt. Deleting a Datamart application does not remove a submitted government record.

## 13. Finance through CoinPay

### 13.1 Integration boundary

Bank linking, institution credentials, and underlying bank-aggregation integrations stay in CoinPay. Datamart consumes the authorized CoinPay finance API/SDK rather than building a second credential store or bank connector.

CoinPay's inspected finance code covers connections, accounts, transactions, summary/report workflows, and selected account metadata corrections. Its merchant guard rejects ordinary business payment API keys for bank access and supports appropriate merchant authentication. The finance-access guard applies owner/organization-role checks. These are existing integration constraints, not permission to expose the owner's data through a public server. [R04][R05][R06]

Do not prepopulate Mercury, moomoo, or any other institution as a connected user account. The actual institutions are discovered only after the user authorizes access and CoinPay returns them.

### 13.2 Required functionality

| Capability | Requirement |
| --- | --- |
| Connections | List authorized connections, provider state, last successful sync, warnings, and reconnect/disconnect options. |
| Accounts | Read balances with currency, balance timestamp, institution name, account type, and masked identifiers. |
| Transactions | Filter and paginate without silently dropping rows; distinguish pending from posted. |
| Summary | Preserve currencies and upstream coverage; do not combine unlike currency amounts without an explicit conversion basis. |
| Reports | List and retrieve CoinPay-generated activity reports with coverage and reconciliation indicators. |
| Sync/backfill | Explicit operations with budget and consent controls; reading a dashboard must not silently trigger costly repeated refreshes. |
| Metadata edits | Only the classification, scope, visibility, or other fields actually supported by CoinPay. Never rewrite imported bank balances. |
| Disconnect/delete | Explain whether an operation removes a credential, stops syncing, deletes local retained data, or leaves history. Confirm each destructive operation. |

CoinPay-generated activity reports must remain labeled as such, not represented as institution-issued bank statements. An uploaded bank statement is a different artifact. Preserve CoinPay's coverage and reconciliation distinctions rather than presenting incomplete imported history as a reconciled statement. [R07]

### 13.3 Authentication and consent

A Datamart login does not itself grant bank access. The user explicitly connects CoinPay and selects a permitted owner/workspace. Datamart receives only the granted capabilities. Upstream owner access is rechecked, and revoked organization membership must stop access promptly.

For hosted MCP, issue/validate tokens intended for the Datamart resource and resolve the user's approved CoinPay connection server-side. Do not accept arbitrary upstream bearer tokens as if they were Datamart authorization. Do not forward a token to a different audience without the intended authorization flow. A local-only MCP can use the user's own CoinPay login through a reviewed local credential mechanism.

Existing CoinPay scopes may be broader than the desired Datamart scopes. Verify them. If finer delegation is unavailable, document that limitation and keep the remote feature disabled or require an explicitly reviewed grant design; do not invent a `finance.read` upstream scope that does not exist.

Credentials are never tool arguments, URL parameters, public environment variables, logs, or shared server-owner tokens. Bank linking and MFA occur in CoinPay/provider-controlled UI. Finance responses and files are private, non-cacheable, and tenant-scoped.

### 13.4 Payment boundary

Initial bank integration is data access and supported connection/metadata operations. It does not move bank funds. Future money movement requires an actual supported payment channel, scoped authority, transaction-specific approval, limits, reconciliation, and appropriate review.

CoinPay's role in Datamart platform billing is separate from its bank-data role. Paying for Datamart is not consent to access a customer's finances. Government fees and contractor payments are separate from Datamart's service charge.

## 14. Shared action and approval engine

### ACT-01: Resource-scoped authority

Evaluate actor identity, tenant, target resource ownership, provider connection, role, allowed operation, purpose, and expiry at execution time. Public source content can never grant permissions or change this evaluation.

### ACT-02: Plans before consequential writes

A write plan identifies provider, operation, target record, before/after values where relevant, document hashes, recipients, monetary amounts, known fees, deadline, and reversibility. Human review uses the same immutable payload that execution will use.

Approvals are server-issued, short-lived, single-use authorizations bound to that payload, actor, tenant, target, and operation. Editing the payload invalidates approval. An agent-supplied string such as `CONFIRM` is not proof that a human approved a bank or government action.

Low-risk local metadata changes may use user-granted bounded permissions. Filing, signing, bid submission, money movement, and destructive external actions require the policy appropriate to the operation, including explicit final approval where specified.

### ACT-03: Idempotency and uncertain outcomes

Use idempotency keys for supported mutations and durable job records. If the source times out after possibly receiving a submission, set `submission_unknown`, query status or request human reconciliation, and do not blindly retry. Exactly-once external execution must not be promised where the upstream system cannot provide it.

### ACT-04: Resumability and evidence

Store step state, adapter version, source revision, approvals, and receipts. Human fallback must resume without replaying completed side effects. Keep an audit record of who approved what and what the provider actually returned, with sensitive fields redacted appropriately.

## 15. MCP, API, CLI, and TUI parity

### 15.1 Protocol requirements

Use the official MCP SDK, publish schemas, and test initialization, tools discovery, calls, error handling, and authorization with supported clients. At research time the official latest specification resolved to the `2026-07-28` revision; select and pin a supported implementation rather than hard-coding an older protocol response for every client. Follow the specification's resource-server authorization model. [S23][S24]

Tool annotations describe behavior but do not enforce permissions. Namespace aggregation must preserve input schemas and action semantics. `tools/call` must execute the advertised operation, not merely return instructions to call another HTTP endpoint.

### 15.2 Proposed tool families

| Namespace | Proposed tools |
| --- | --- |
| Registry/search | `datamart_search`, `resource_get`, `resource_capabilities`, `provider_status` |
| Government | `gov_services_search`, provider-specific reads, `gov_workflow_prepare`, `gov_workflow_status`, approved provider-specific actions |
| Data.gov | `datagov_search`, `datagov_get_record`, `datagov_list_organizations` |
| Libraries | `libraries_search`, `library_get`, `loc_search`, `loc_get_item`, `loc_list_collections` |
| Education | `education_search`, `education_get`, `education_enrollment_prepare` |
| Contracts | `contracts_search`, `contracts_get`, `contracts_match_profile`, `application_prepare`, `application_validate`, `application_status`, permitted submission tools |
| Finance | `finance_connections`, `finance_accounts`, `finance_transactions`, `finance_summary`, `finance_reports`, supported consent/sync/metadata tools |

Do not expose a named submit tool until its provider implementation and approval enforcement are complete. Preparation tools must identify their target as a local draft.

### 15.3 Proposed CLI contract

These commands specify the desired interface; they are not represented as already published:

```bash
datamart search --zip 95032 --radius-miles 20 --namespace lib --json
datamart edu search --zip 95032 --radius-miles 20 --sector public --json
datamart gov providers --json
datamart lib loc search "California history" --json

datamart contracts search --level federal,state,local --category programming --status open --json
datamart contracts search --status closed --sort recently-closed --json
datamart profiles create --from ./OpenProfile.md --review
datamart contracts prepare OPPORTUNITY_ID --profile PROFILE_ID
datamart applications review APPLICATION_ID
datamart applications submit APPLICATION_ID --approval APPROVAL_ID

datamart finance connect --provider coinpay
datamart finance accounts --json
datamart finance transactions --all-pages --from 2026-01-01 --to 2026-10-01 --json

datamart tui
datamart mcp serve --namespace gov
datamart mcp serve --namespace finance --local
```

`--json` writes only machine output to stdout; progress and diagnostics go to stderr. Interactive review must have a headless equivalent that returns a resumable approval URL or `human_required`, not a hung terminal. Never echo secrets into shell history.

The TUI supports resource browsing, filter editing, job progress, capability badges, and handoffs. Desktop and later native-mobile clients reuse the same service layer and authentication boundaries, not separate business logic.

## 16. Data contracts and storage

### 16.1 Core entities

| Entity | Essential fields and invariants |
| --- | --- |
| Resource | Immutable ID, namespace, organization, source ID, country/jurisdiction, URLs, status, provenance. |
| Location | Resource/branch/campus ID, address, coordinates, precision, geocoder/source, validation timestamp. |
| Provider capability | Provider version, operation, target type, auth requirements, current support, tested evidence. |
| Opportunity | Source and notice IDs, revisions, buyer, type, scope, classification, place of performance, deadlines, status evidence, attachments. |
| Applicant profile | Tenant/owner, version, fields, verification states, document references, signer authorities. |
| Application | Opportunity revision, profile revision, drafts, requirements matrix, current state, receipts. |
| Connection | Actor/tenant, provider, encrypted credential reference, scopes, owner selection, expiry, revocation. |
| Approval | Actor, target, operation, payload hash, expiry, consumption state. |
| Workflow job | Idempotency key, state, step, lease version, retries, next attempt, terminal evidence. |
| Audit event | Actor, tenant, action, resource, timestamp, outcome, redacted evidence references. |
| Saved search | Normalized filters, privacy, owner, notification preferences, last evaluated snapshot. |

Source records and user annotations are separate. A user correction never overwrites an authoritative source assertion without retaining provenance. Changes in upstream records create revisions where history matters.

### 16.2 Common response envelope

Schema example; values are illustrative and do not claim populated coverage:

```json
{
  "data": [],
  "meta": {
    "request_id": "opaque-request-id",
    "retrieved_at": "2026-10-07T00:00:00Z",
    "source_snapshot_id": "snapshot-id",
    "coverage": "partial",
    "freshness": "verified_for_snapshot",
    "location_applied": true,
    "radius_miles": 20,
    "sort_scope": "indexed_snapshot",
    "next_cursor": null
  },
  "sources": [],
  "warnings": []
}
```

Return `next_cursor` only when continuation is supported. Counts refer to a defined snapshot and coverage area, not all opportunities worldwide. Preserve upstream provenance and distinguish retrieval time from a source's actual update time.

### 16.3 Errors

Use typed codes including `invalid_filters`, `ambiguous_location`, `location_unresolved`, `country_not_supported`, `authentication_required`, `insufficient_scope`, `approval_required`, `configuration_required`, `human_required`, `unsupported_operation`, `source_rate_limited`, `source_unavailable`, `stale_notice`, and `submission_unknown`.

Map them appropriately to HTTP responses and MCP tool errors. Missing API credentials must not return HTTP 200 with an empty successful result. A provider challenge page is not JSON success. A handoff is a distinct workflow state, not an exception concealed as task completion.

## 17. Ingestion and search operations

Provider adapters implement source discovery, fetch, normalization, validation, deduplication, and change detection. Keep stable source IDs and original URLs. Store enough source evidence to debug a changed field without retaining unnecessary private data.

Use incremental retrieval where supported. Keep provider cursors bound to the query that produced them. Apply bounded retries with jitter only to safe operations. Respect explicit rate limits, retry guidance, and source terms; request higher quotas or partnerships rather than evading controls.

Maintain a source-health dashboard with last successful read, last attempted read, schema version, data age, lag, error rate, and coverage. For contracts, distinguish historical backfill from current-open coverage. For schools/libraries, publish counts with unresolved coordinates and outdated records rather than hiding those gaps.

Search combines normalized structured filters and lexical relevance. Optional semantic ranking is a second-stage enhancement, not a replacement for exact constraints. Restrict private index access by tenant before matching, not after retrieval. Public NicheDB/feed exports may include only appropriately licensed public records, never finance, student, or application data.

## 18. Web experience

The first screen contains a search box, visible location/radius controls, and the six requested namespaces. Results must show source, distance or service area, freshness, and capability level. Display compact cards on mobile with an accessible list/table option; a map is supplementary, not required to find results.

Resource pages show what can be read or done now, what requires connecting an account, and what is official-site-only. Use action labels such as **Prepare application**, **Review submission**, and **Continue on official site** instead of labeling every button **Apply**.

Contracts have open, upcoming/research, and recently closed tabs, persistent filters, a saved-search control, and an application workspace. Finance has a visibly private context, masked identifiers, and a clear owner/workspace switcher. Approvals show exact actions and document changes before confirmation.

Target accessible keyboard navigation, visible focus, labeled forms, screen-reader-readable progress, and useful mobile layouts. Public discovery should work without an account. Offline PWA behavior may retain the application shell and explicitly dated public results, but not authenticated responses, approvals, credentials, or sensitive documents.

## 19. Security, privacy, and responsible automation

The following are release requirements, not optional future hardening:

- Enforce tenant/resource ownership and role checks on every private read/write and file download. Test guessed IDs, revoked access, and cross-tenant references.
- Keep secrets server-side or in the user's reviewed local credential store. Never use one operator's CoinPay token for public requests.
- Validate token issuer, audience, expiry, and granted scopes. Keep OAuth state/PKCE and redirect allowlists correct. Do not turn private bank access into raw token passthrough through public MCP.
- Bind approvals to exact actions and use durable execution evidence. Treat external pages, attachments, and tool results as untrusted data, including embedded instructions asking the agent to disclose secrets or submit elsewhere.
- Restrict outbound hosts and validate resolved public addresses and every redirect hop. Separate safe user-facing links from permission to fetch a URL server-side.
- Sanitize rendered content, scan uploads, limit decompression and document size, and isolate document parsers. Never execute commands embedded in a solicitation or downloaded document.
- Apply CSRF protection, secure cookies, narrow CORS, rate limits, and audit logging. Avoid sensitive analytics and session replay on finance, applications, enrollment, and approval screens.
- Require legitimate user/provider authentication. Stop at CAPTCHA, MFA, identity verification, and other required human boundaries; do not bypass them.
- Separate lawful public aggregation from permission to automate private services. Record provider policy review and contractual requirements before enabling authenticated browser automation.
- Define retention and deletion for drafts, credentials, files, receipts, and logs. Explain backup retention and the difference between local deletion and withdrawal from an external system.

Use platform access pricing only for Datamart-controlled capacity. A provider rate limit or payment requirement must not automatically trigger paid retries, use a different credential to evade a quota, or authorize spending from a connected wallet.

Before private tax, benefits, student-record, or financial transaction features launch, obtain the security, privacy, contractual, and legal review applicable to that particular integration. This PRD does not assert that one blanket certification covers all providers.

## 20. Reliability, performance, and cost targets

These are proposed engineering targets, not measured results or service guarantees.

| Metric | Initial target |
| --- | --- |
| Indexed/cached search | p95 server response under 1 second at the agreed test load. |
| Public source fetch | Bounded timeout; expose slow-source progress or a durable job rather than hanging indefinitely. |
| Core public service availability | 99.5% monthly launch target, with external-provider outages reported separately. |
| Current opportunity refresh | Provider-specific cadence; aim for updates within 60 minutes where permitted and affordable. Always recheck before submission. |
| Directory refresh | Regular source-specific refresh and immediate administrator correction path; hours/closures treated separately. |
| Private data leakage | Zero tolerated cross-tenant exposures or secrets in public responses/logs. |
| Mutation recovery | Every consequential write ends in evidence-backed success, known failure, human handoff, or explicit unknown state. |
| Spending | Per-provider, per-tenant, and global ceilings; pause safely when limits are reached. |

Maintain separate budgets for upstream calls, browser sessions, model usage, storage, and outbound notifications. Use deterministic parsing where possible and inexpensive models for high-volume categorization only after quality tests. No hidden infinite agent loops. Costly tasks disclose the estimate or configured maximum before authorization.

## 21. Test and acceptance plan

| ID | Acceptance test |
| --- | --- |
| AT01 | Namespace pages and resource details load on the deployed custom domain without breaking existing MCP routes. |
| AT02 | MCP initialization, tools/list, and tools/call work with the chosen official SDK and supported clients; calls return actual results. |
| AT03 | Data.gov returns real source records using the documented current API; cursor continuation neither repeats nor drops records in the tested snapshot. |
| AT04 | Missing Data.gov or SAM keys produce a visible configuration state, not fabricated or empty success. |
| AT05 | Library of Congress search/item reads preserve identifiers, source links, rights notes, and upstream errors. |
| AT06 | A 95032/20-mile search uses a documented origin and returns only validated in-radius entries as matches. |
| AT07 | Boundary tests at just inside, exactly on, and just outside the radius are deterministic; missing coordinates are not admitted as matches. |
| AT08 | ZIP, coordinates, street address, and city inputs resolve consistently; conflicts and unsupported countries are explicit. |
| AT09 | Public school filters exclude private institutions at launch and separate school sites from district offices; nursery/public status is evidence-based. |
| AT10 | Library branches remain distinct from systems; proximity never silently grants borrowing/enrollment eligibility. |
| AT11 | Open-contract results exclude award-only, canceled, expired, and unverified-deadline records as appropriate. |
| AT12 | Recently closed ordering is global for the declared indexed snapshot, or is explicitly labeled page-limited in fallback mode. |
| AT13 | Trade and knowledge-work deep links round-trip to identical normalized filters across web, API, CLI, and MCP. |
| AT14 | Imported profiles never gain invented certifications, licenses, past performance, or signer authority. |
| AT15 | Application preparation produces the required compliance matrix and a local draft; no external submission occurs. |
| AT16 | A changed payload, expired approval, different target, or reused approval cannot execute a protected action. |
| AT17 | A post-submit timeout results in reconciliation/unknown state, not a blind duplicate submission. |
| AT18 | Human fallback preserves progress and cannot replay completed side effects. |
| AT19 | Finance reads require the user's authorized CoinPay connection; anonymous/root MCP paths cannot access them. |
| AT20 | Revoked organization membership and wrong-owner IDs cannot read or modify CoinPay-backed data. |
| AT21 | Full ledger export handles all pages, date bounds, currencies, pending rows, coverage, and exact-decimal totals correctly. |
| AT22 | Finance report labels never misrepresent a generated activity report as an institution statement. |
| AT23 | A private URL, metadata endpoint, malicious redirect, or injected attachment instruction cannot exfiltrate credentials. |
| AT24 | Service-worker caches, logs, telemetry, error messages, and test fixtures contain no live bank or applicant secrets. |
| AT25 | Provider quotas, retries, and cost limits fail safely without automatic paid bypasses. |
| AT26 | Deploy evidence includes commit/build ID, migration status, actual worker activity, connector smoke checks, and a tested rollback. |

Use synthetic fixtures for deterministic tests and separate opt-in live smoke tests. Do not submit real bids, tax returns, payments, or benefits claims as an automated test. Where an official sandbox is unavailable, validate preparation and handoff, and use a separately authorized controlled production check before claiming submission support.

## 22. Delivery phases and exit gates

### Phase A: Foundation and working public access

Build the registry, schemas, UI shell, namespace routes, shared search, current MCP implementation, and source-health reporting. Implement real Data.gov and Library of Congress adapters. Register all six government resources with honest per-operation capability states. Ingest official local school/library records and validate location coverage around 95032.

**Exit:** Public reads work; distance filters genuinely apply; missing setup is visible; source citations and independent-operator disclosure are present; no private data routes are open. A directory-only shell does not satisfy this phase.

### Phase B: Contracts and applicant workspace

Implement federal ingestion and the state/local adapters permitted by verified sources. Establish coverage reports for each jurisdiction. Add categories, deep links, open/closed sorting, profile creation, evidence fields, matching explanations, compliance matrices, draft packages, and resumable handoff.

**Exit:** Real matching opportunities are shown with provenance and defined freshness. At least one source in each claimed government level is ingested and validated; otherwise that level is labeled handoff-only, not complete. Application preparation works end to end without unapproved submission.

### Phase C: Private CoinPay integration

Implement reviewed user-level CoinPay delegation, owner selection, accounts, transactions, reports, explicit sync, supported metadata edits, and connection management. Validate remote finance isolation; local-only access may ship first if hosted delegation is not yet ready.

**Exit:** The owner's explicitly authorized test connection works without exposing data to another user or public MCP. Coverage/report semantics survive the integration. No bank-money movement is implied.

### Phase D: Agency and buyer actions

Add provider-specific authenticated reads and approved actions, starting with workflows that have the clearest permitted interfaces and strongest user value. Validate BizFile access, IRS/FTB provider requirements, EDD employer versus claimant boundaries, and each DMV/buyer workflow separately.

**Exit per action:** Real authorization, review, idempotency/reconciliation, human fallback, official confirmation, and operation-specific tests. Support is announced per action, not by labeling an entire agency fully automated.

### Phase E: Wider distribution and official partnerships

Expand geographic coverage, private education, other countries, desktop/mobile packaging, and agency-operated deployments. Publish a self-hosting guide and portable adapter specifications. Seek partnerships and procurement opportunities using demonstrated performance rather than promises of guaranteed government funding.

## 23. Deployment and release runbook

### 23.1 Audit before modifying production

Inspect the current default branch, pending changes, tests, module registration, auth propagation, and deployment files. The repository currently describes a push-to-master deployment path for the existing MCP service; preserve that target unless the owner explicitly authorizes a migration. A new frontend deployment and the existing MCP service may have different hosts. [R03]

Check DNS ownership/records and hosting access for `datamart.help` and `mcp.profullstack.com`. Owning or naming a domain does not prove DNS is configured, TLS is issued, or the application is running.

### 23.2 Configuration groups

Keep a validated environment schema for public base URLs, database, private storage, identity/OAuth settings, encryption/key references, provider API keys, worker controls, allowed origins, observability, and budgets. Names such as `DATAGOV_API_KEY` and `SAM_API_KEY` are proposed configuration contracts, not claims that secrets already exist.

Do not configure a shared `COINPAY_SESSION_TOKEN` on a publicly reachable service. Local-only finance credentials must be clearly separated from hosted credentials. Production secrets belong in the team's approved vault and service configuration, never committed `.env` files or test fixtures.

### 23.3 Safe release sequence

Create a feature branch and reviewable changes; run existing regression tests plus new unit, contract, security, and browser tests. Run migrations safely and test rollback compatibility. Deploy a preview with synthetic private data, then execute read-only live provider checks using authorized keys.

After review, release and deploy through the established pipeline. Verify the actual custom-domain routes, selected provider operations, authenticated isolation, and worker progress. A homepage HTTP 200 and a root health endpoint are insufficient evidence of a working product.

Publish release evidence containing commit/build identifiers, tested URLs, provider capabilities, known limitations, source coverage, test results, and a rollback procedure. Keep each unavailable integration disabled rather than breaking the whole service.

### 23.4 Conditions for saying "live and working"

The DNS/TLS endpoint must resolve correctly; frontend assets and API requests must work; advertised MCP calls must execute; current source reads must succeed; private data isolation must pass; and any announced submission capability must have the appropriate verified evidence. Give the user the exact working URL and state any remaining handoff-only features.

Do not claim a blocked write, created Git tree, committed branch, merged pull request, or successful deployment unless that specific step actually succeeded. A code merge and a production release are separate events.

## 24. Product metrics and sustainability

Track useful outcomes rather than raw connector count: source-verified results, successful task preparation, completed authorized workflows, human handoff completion, time saved, matching quality, application completeness, source freshness, and cost per successful task.

For contracts, distinguish viewed, shortlisted, prepared, submitted, receipt-confirmed, and awarded. Do not attribute an award to Datamart without evidence. For finance, track technical reliability and coverage without putting balances or payee details into public analytics.

Potential revenue includes hosted professional workspaces, higher Datamart-owned capacity, team workflows, integration support, and agency deployment/support contracts. Public source information must retain its attribution, and Datamart must not imply that users must pay it to access a free official service. Government fees, provider fees, and Datamart fees are separate line items.

Provide export and self-hosting options for public adapter infrastructure. Institutional sponsorship and a future official-government role are possibilities to pursue, not assured milestones.

## 25. Implementation dependencies and unresolved facts

| Dependency or unknown | Required resolution | Safe behavior until resolved |
| --- | --- | --- |
| Datamart DNS and deployment access | Inspect actual DNS and target hosting configuration. | No live URL claim. |
| Current repository changes | Inspect branch state and preserve other contributors' work. | Do not overwrite or assume earlier draft exists. |
| Production Data.gov/SAM credentials | Obtain owner-approved keys and confirm quotas. | Visible setup state; official-site handoff. |
| Agency write channels | Verify each provider's actual interface, policy, role, and program requirements. | Preparation and labeled human handoff. |
| CoinPay hosted delegation | Verify registration, scopes, audience, refresh, revocation, and owner access. | Local-only or disabled private remote features. |
| Local directory completeness | Compare official source sets, geocode, and publish gap counts. | Partial coverage label; no exhaustive-radius claim. |
| Procurement vendor portals | Follow each buyer's official link and verify supported ingestion/submission. | Source-specific handoff. |
| Existing InfoArc format | Inspect an actual schema/repository if one exists. | Standard canonical HTTP deep links. |
| High-risk private workflows | Complete integration-specific legal/privacy/security review. | Do not enable external execution. |

These are build dependencies, not reasons to stop delivering verified public functionality. Do not replace unresolved capabilities with fabricated implementations.

## 26. Handoff instructions for the implementing engineer or agent

Start from this PRD and the current repository, not uncommitted code in an earlier chat. Read the Profullstack stack, audit current versions, and preserve the existing hosting and module conventions. Implement Phase A as a tested vertical slice with real sources and a working custom-domain interface. Then progress through contracts, private CoinPay access, and individual agency actions using the exit gates above.

Keep a requirement-to-test matrix. For every provider, publish what works, what requires authorization, what is handoff-only, and what is not yet implemented. Do not call tools "CRUD" unless the target and allowed operations are explicit. Do not present a public directory as authenticated government access.

Deliver source changes, tests, documented configuration, deployment instructions, known limitations, and verified release evidence. If a write or deployment tool is blocked, report the exact returned failure and provide a local patch or source artifact; do not imply the change reached GitHub or production.

## 27. Reference sources

Sources below were reviewed in this conversation on October 7, 2026. They support specific baseline facts; they do not establish that Datamart has implemented or been approved for any provider. Recheck current documentation before shipping. Most detailed behavior in this document is a proposed product requirement, not a quotation from these sources.

### Public technical and institutional sources

- **[S01] Profullstack stack:** https://profullstack.com/stack
- **[S02] CISA .gov eligibility:** https://get.gov/domains/eligibility/
- **[S03] California Secretary of State BizFile information and access update:** https://www.sos.ca.gov/business-programs/bizfile/
- **[S04] Data.gov current Catalog API:** https://resources.data.gov/catalog-api/
- **[S05] IRS transmitter technical information:** https://www.irs.gov/e-file-providers/transmitter-technical-fact-sheet
- **[S06] California FTB e-file developer participation:** https://www.ftb.ca.gov/tax-pros/efile/efile-for-developers.html
- **[S07] California DMV online services:** https://www.dmv.ca.gov/portal/dmv-online/
- **[S08] California EDD online services:** https://edd.ca.gov/en/about_edd/online_services/
- **[S09] EDD FSET provider information:** https://edd.ca.gov/Payroll_Taxes/approved_fset_providers.htm
- **[S10] Library of Congress JSON/YAML API:** https://www.loc.gov/apis/json-and-yaml/
- **[S11] Library of Congress API request documentation:** https://www.loc.gov/apis/json-and-yaml/requests/
- **[S12] Library of Congress API usage limits:** https://www.loc.gov/apis/json-and-yaml/working-within-limits/
- **[S13] Santa Clara County Library District locations:** https://sccld.org/locations/
- **[S14] Town of Los Gatos library FAQ information:** https://www.losgatosca.gov/m/FAQ
- **[S15] California School Directory:** https://www.cde.ca.gov/SchoolDirectory/
- **[S16] CDE public-school and district data files:** https://www.cde.ca.gov/ds/si/ds/pubschls.asp
- **[S17] California Community Colleges official college directory:** https://www.cccco.edu/students/find-a-college/college-alphabetical-listing/
- **[S18] CDSS facility search information:** https://www.cdss.ca.gov/inforesources/community-care-licensing/facility-search-welcome
- **[S19] SAM.gov Opportunities API:** https://open.gsa.gov/api/get-opportunities-public-api/
- **[S20] California FI$Cal / Cal eProcure resources:** https://fiscal.ca.gov/user-support/cal-eprocure-resources/
- **[S21] Santa Clara County procurement opportunities:** https://prc.santaclaracounty.gov/opportunities-and-active-contracts1
- **[S22] City of Santa Clara bid opportunities:** https://www.santaclaraca.gov/our-city/departments-a-f/finance/purchasing/bid-opportunities
- **[S23] MCP specification:** https://modelcontextprotocol.io/specification/latest
- **[S24] MCP authorization specification reviewed:** https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization

### Repository sources inspected in this conversation

Repository links refer to the default-branch paths inspected here. They are not new Datamart commits; implementations must resolve and record their own exact commit SHAs.

- **[R01] MCP server package:** https://github.com/profullstack/mcp-server/blob/master/package.json
- **[R02] MCP module loader and dispatcher:** https://github.com/profullstack/mcp-server/blob/master/src/core/moduleLoader.js and https://github.com/profullstack/mcp-server/blob/master/src/core/routes.js
- **[R03] Existing MCP deployment workflow:** https://github.com/profullstack/mcp-server/blob/master/.github/workflows/deploy.yml
- **[R04] CoinPay finance SDK:** https://github.com/profullstack/coinpayportal/blob/master/packages/sdk/src/finances.js
- **[R05] CoinPay merchant authentication guard:** https://github.com/profullstack/coinpayportal/blob/master/src/lib/auth/merchant-guard.ts
- **[R06] CoinPay finance owner/role guard:** https://github.com/profullstack/coinpayportal/blob/master/src/lib/finances/access.ts
- **[R07] CoinPay report semantics:** https://github.com/profullstack/coinpayportal/blob/master/docs/FINANCES-REPORTS.md

---

**Definition of done:** Datamart provides real, source-backed discovery and the explicitly advertised authorized actions, on the intended domains, across shared human and agent interfaces, with honest coverage, working human fallback, tested privacy, and verifiable execution evidence.
