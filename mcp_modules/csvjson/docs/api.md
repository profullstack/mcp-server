# csvjson API

## POST /csvjson/to-json

Body:
```json
{
  "csv": "name,age\nalice,30\nbob,42",
  "options": { "delimiter": ",", "strict": true, "header": true }
}
```

Response `200`:
```json
{
  "rows": 2,
  "schema": { "name": "str", "age": "int" },
  "data": [ { "name": "alice", "age": 30 }, { "name": "bob", "age": 42 } ],
  "receipt": {
    "rowsIn": 2, "rowsOut": 2, "fieldsIn": 2, "fieldsOut": 2,
    "missingFields": [], "addedFields": [], "changedCells": 0,
    "nullCounts": {}, "ok": true
  }
}
```

Response `422` (strict coercion failure):
```json
{ "error": "column \"age\" expects int, got \"abc\": not an integer", "name": "SchemaError" }
```

## POST /csvjson/to-csv

Body:
```json
{
  "rows": [ { "id": 1, "tags": ["a", "b"] } ],
  "options": { "delimiter": "," }
}
```

Response:
```json
{
  "csv": "id,tags.0,tags.1\n1,a,b",
  "columns": ["id", "tags.0", "tags.1"],
  "rows": 1,
  "receipt": { "rowsIn": 1, "rowsOut": 1, "fieldsIn": 2, "fieldsOut": 3, "missingFields": [], "addedFields": [], "changedCells": 0, "nullCounts": {}, "ok": true }
}
```

## POST /csvjson/schema

Body `{ "csv": "a\n1\n2" }` → `{ "schema": { "a": "int" }, "rows": 2 }`.

## POST /csvjson/validate

Body `{ "csv": "a\nabc" }` → `{ "valid": false, "error": "column \"a\" expects int, got \"abc\"...", "name": "SchemaError" }`.

## Guarantees

1. **Strict coercion** — mixed or unparsable columns fail loudly (`SchemaError`), never silently coerce.
2. **Lossless nested round-trip** — `jsonToCsv` then `csvToJson` returns deep-equal records for well-formed data.
3. **Union of columns** — blanks in nested groups are ignored; container keys (`tags`) never receive scalars; scalar blanks stay real nulls.
4. **Receipts** — rows/fields in→out, missing/added fields, changed cells, null counts, `ok`.
