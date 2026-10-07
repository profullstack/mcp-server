# Datamart sources

Every directory record comes from an official public-domain U.S. government
file. Snapshots in `src/datamart/datasets/` are rebuilt by
`scripts/datamart/build-snapshots.js`; the same inputs produce byte-identical
output.

| Snapshot | Source | Version | Records |
| --- | --- | --- | --- |
| `zcta-us.json` | [Census 2024 Gazetteer, ZCTAs](https://www2.census.gov/geo/docs/maps-data/data/gazetteer/2024_Gazetteer/2024_Gaz_zcta_national.zip) | `census-gazetteer-2024-zcta` | 33,791 ZIP areas (internal points) |
| `places-us.json` | [Census 2024 Gazetteer, Places](https://www2.census.gov/geo/docs/maps-data/data/gazetteer/2024_Gazetteer/2024_Gaz_place_national.zip) | `census-gazetteer-2024-place` | 32,114 places |
| `libraries-launch.json` | IMLS Public Libraries Survey FY2024, outlet + AE files (`pls_fy2024_csv.zip`) | `imls-pls-fy2024` | 307 outlets in the launch area |
| `schools-launch.json` | [NCES CCD 2023-24 directory](https://nces.ed.gov/ccd/Data/zip/ccd_sch_029_2324_w_1a_073124.zip) + [EDGE 2023-24 geocodes](https://nces.ed.gov/programs/edge/data/EDGE_GEOCODE_PUBLICSCH_2324.zip) | `nces-ccd-2023-24+edge-2023-24` | 2,242 open public school sites |
| `colleges-launch.json` | [NCES IPEDS HD2023](https://nces.ed.gov/ipeds/datacenter/data/HD2023.zip) | `ipeds-hd2023` | 41 public campuses (offices excluded) |

Launch area: 75 miles around the Census internal point of ZCTA 95032
(37.18014, -121.901553). Searches whose circle leaves it are labelled
`partial`; outside it they fail with `insufficient_geospatial_coverage`.

## Notes and gaps found while building

- **IMLS.** `imls.gov` answers 403 to automated clients. The FY2024 file was
  taken from the Internet Archive capture
  `web.archive.org/web/20260708045500id_/https://www.imls.gov/sites/default/files/2026-06/pls_fy2024_csv.zip`,
  whose SHA-1 matches the digest the archive recorded from imls.gov. 80 outlets
  lie within 25 miles of Los Gatos; the nearest to ZCTA 95032 is Almaden Branch
  (3.4 mi), and Los Gatos Public Library is 0.3 mi from ZIP 95030.
- **California School Directory (CDE).** The download sits behind a Radware
  CAPTCHA, so it is not used. NCES federal files cover the same public schools
  with coordinates.
- **Preschools.** California reports no pre-K grades to CCD (all 10,164 CA rows),
  so preschools and nurseries are not covered. Searches with `type=preschool`
  return a coverage-gap warning. CDSS licensed-facility data is the next source.
- **Colleges.** IPEDS files associate's-dominant colleges with a few bachelor's
  programs (Foothill College) as 4-year; Carnegie 2021 classes 1-14 are used to
  label them community colleges. IPEDS sector 0 (district/system offices) is
  excluded.
- **Library websites.** Only URLs that answered 200 on 2026-10-07 are attached
  (`LIBRARY_SYSTEM_URLS` in `src/datamart/directory.js`). Los Gatos, Santa
  Clara City, Sunnyvale, Mountain View, Watsonville and Menlo Park sites timed
  out or returned 403 to automated checks; those records show phone contact
  instead of a guessed link.

## Rebuilding

Download the five files above (plus the IMLS zip) into a scratch directory
outside the repo, unzip, then:

```bash
node scripts/datamart/build-snapshots.js \
  --zcta 2024_Gaz_zcta_national.txt --places 2024_Gaz_place_national.txt \
  --imls-outlets CSV/pls_fy24_outlet_pud24i.csv --imls-ae CSV/PLS_FY24_AE_pud24i.csv \
  --ccd ccd_sch_029_2324_w_1a_073124.csv \
  --edge EDGE_GEOCODE_PUBLICSCH_2324/EDGE_GEOCODE_PUBLICSCH_2324.TXT \
  --ipeds HD2023.csv --retrieved YYYY-MM-DD
```

Bump the version strings in the script when a source year changes; cursors are
bound to snapshot versions, so old cursors are rejected rather than misread.

## Live providers

- Data.gov Catalog API v4 — <https://resources.data.gov/catalog-api/>. Key in
  `X-Api-Key`; personal keys allow 1,000 requests/hour, DEMO_KEY 30/hour and
  50/day per IP.
- Library of Congress JSON API — <https://www.loc.gov/apis/json-and-yaml/>.
  20 requests/minute; exceeding it blocks the IP for an hour, and the hour
  restarts on any request made while blocked.
- U.S. Census Geocoder — <https://geocoding.geo.census.gov/geocoder/>, only for
  street-address searches, disclosed in responses.
