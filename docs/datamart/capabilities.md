# Datamart capabilities (Phase A)

What works, what needs configuration, what is handoff-only, and what is not
built. Generated from `src/datamart/registry.js`; that file is the source of
truth and is validated at load time (a planned capability cannot claim a working
state).

## Providers

| Provider | Path | Works now | Not yet / never |
| --- | --- | --- | --- |
| Data.gov catalog (`us.gsa.datagov`) | `/gov/us/data` | `public_read`: search, harvest record, organizations — **needs `DATAGOV_API_KEY`** | dataset writes (publisher-only) |
| Library of Congress (`us.loc`) | `/lib/us/loc` | `public_read`: search, collections, item, resource links | record writes |
| Library outlets (`us.ca.libraries`) | `/lib` | `public_read` directory search over the IMLS FY2024 snapshot; records are `directory_only` | catalog reads, holds, renewals, card applications |
| Public schools & colleges (`us.ca.education`) | `/edu` | `public_read` directory search over NCES snapshots | private schools, preschools (coverage gap), enrollment prep, student records (excluded) |
| California BizFile (`us.ca.sos.bizfile`) | `/gov/us/ca/bizfile` | `directory_only`: official links, access facts | entity search, filing prep, submission |
| IRS (`us.irs`) | `/gov/us/irs` | `directory_only` | forms search, workflow prep; direct e-file not planned |
| California FTB (`us.ca.ftb`) | `/gov/us/ca/ftb` | `directory_only` | workflow prep; e-file not planned |
| California DMV (`us.ca.dmv`) | `/gov/us/ca/dmv` | `directory_only` | workflow prep, appointment booking |
| California EDD (`us.ca.edd`) | `/gov/us/ca/edd` | `directory_only` (employer and claimant kept apart) | employer prep; claimant certification never automated |
| SAM.gov, Cal eProcure, County of Santa Clara, City of Santa Clara | `/contracts` | `directory_only` official sources | opportunity ingestion, profiles, applications (Phase B) |
| CoinPay finance (`us.coinpay.finance`) | `/finance` | nothing | everything (Phase C); no finance tool exists on any endpoint |

## Requirement → test matrix

| PRD acceptance test | Covered by | Status |
| --- | --- | --- |
| AT01 routes load without breaking existing MCP routes | `test/datamart/module.test.js` "existing root routes"; full suite 145 passing | local ✅, production ❌ not deployed |
| AT02 MCP initialize, tools/list, tools/call return real results | `module.test.js` SDK + root `/mcp`; `cli.test.js` stdio | local ✅ (Node and Bun) |
| AT03 Data.gov real records, cursor continuity | `providers.test.js` (mocked); live page 1 verified 2026-10-07 with DEMO_KEY | ⚠️ live page 2 not verified — DEMO_KEY quota exhausted; needs a real key |
| AT04 missing key → visible configuration state | `providers.test.js`, `registry.test.js` | ✅ |
| AT05 LoC ids, links, rights, upstream errors | `providers.test.js` (mocked) | see `operations.md` for the live check |
| AT06 95032/20 mi returns only validated in-radius entries | `directory.test.js` | ✅ |
| AT07 inside / on / outside radius; no-coordinate records excluded | `geo.test.js` | ✅ |
| AT08 ZIP, coordinates, address, city consistent; conflicts explicit | `geo.test.js` | ✅ (address via mocked Census Geocoder) |
| AT09 public filter excludes private; sites vs offices; preschool evidence | `directory.test.js` | ✅ (preschool reported as a coverage gap) |
| AT10 branches distinct from systems; no implied eligibility | `directory.test.js` | ✅ |
| AT13 deep links normalize identically across surfaces | `module.test.js` (filters JSON + overrides, strict unknown keys on HTTP, root MCP, SDK) | ✅ for Phase A tools |
| AT19 finance unreachable anonymously | `registry.test.js`, `module.test.js` | ✅ (no finance tool exists) |
| AT23 no fetches to private/unknown hosts, no redirects | `providers.test.js` (allowlist, redirect refusal) | ✅ |
| AT25 quotas fail safely, no paid bypass | `providers.test.js` (cooldown, per-minute budget) | ✅ |
| AT11–AT12, AT14–AT18, AT20–AT22 | contracts, profiles, approvals, finance | Phase B/C, not started |
| AT24, AT26 | caches/logs audit, deploy evidence | at release |
