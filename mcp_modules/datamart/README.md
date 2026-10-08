# datamart

Phase A of [Datamart](../../docs/datamart/prd.md) (datamart.help): public
discovery of government services, Data.gov, the Library of Congress, and public
libraries and schools near a place. Every tool is a read-only public lookup.
Datamart is operated by Profullstack, Inc. and is not affiliated with any
agency or library it lists.

| Tool | Does |
| --- | --- |
| `datamart_search` | Libraries, schools and colleges within a radius, plus government services |
| `libraries_search`, `library_get` | Public library outlets (IMLS FY2024) by distance |
| `education_search`, `education_get` | Public K-12 sites (NCES CCD/EDGE) and public colleges (IPEDS) |
| `loc_search`, `loc_list_collections`, `loc_get_item`, `loc_get_resource_links` | loc.gov digital collections |
| `datagov_search`, `datagov_get_record`, `datagov_list_organizations` | Data.gov Catalog API v4 (needs `DATAGOV_API_KEY`) |
| `gov_services_search` | IRS, FTB, DMV, EDD, BizFile, Data.gov: official links and capability per operation |
| `contracts_sources` | Official procurement sources (opportunity search is Phase B) |
| `resource_get`, `resource_capabilities`, `provider_status` | Registry, capabilities, configuration and health |

Location: give one of `zip`, `lat`+`lng`, `address` (+`zip` or `city`+`state`),
or `city`+`state`. Default is ZIP 95032 within 20 miles, flagged as a default.

HTTP: `/search`, `/gov`, `/lib`, `/edu`, `/contracts`, `/finance`, provider pages
such as `/gov/us/irs`, and `/api/v1/tools/:name` (GET with query or POST JSON).
MCP: `/search/mcp`, `/gov/mcp`, `/lib/mcp`, `/edu/mcp`, `/contracts/mcp`,
`/gov/us/data/mcp`, `/lib/us/loc/mcp` (official SDK, Streamable HTTP), and the
root `/mcp`. CLI: `bin/datamart.js` (`datamart --help`).

See `docs/datamart/` for capabilities, sources, operations and security.
