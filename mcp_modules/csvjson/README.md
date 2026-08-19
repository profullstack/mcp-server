# mcp-module-csvjson

Lossless **CSV ↔ JSON** conversion for agents: schema inference, strict coercion,
nested-object flattening, union-of-columns protection and a **reconciliation
receipt** with every conversion.

Zero runtime dependencies. Node >= 20.

## Why

Naive CSV→JSON converters silently corrupt data: `"00123"` becomes `123`,
`"true"` becomes a string in one table and a boolean in another, mixed columns
half-parse, and nested records (arrays, objects) collapse into ambiguous
strings. This module makes every conversion **explicit**:

- columns get an inferred type (`null < bool < int < float < str < json`),
- a value that cannot coerce raises `SchemaError` instead of being mangled,
- dotted keys (`tags.0`, `meta.role`) flatten and expand losslessly,
- heterogeneous records survive via union-of-columns rules: blank cells in
  nested groups are ignored, container keys never receive scalars,
- every conversion returns a receipt: rows/fields in→out, missing/added
  fields, changed cells, null counts, and an `ok` flag.

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET  | `/csvjson` | module info + guarantees |
| POST | `/csvjson/to-json` | `{ csv, options? }` → `{ data, schema, receipt }` |
| POST | `/csvjson/to-csv` | `{ rows, options? }` → `{ csv, columns, receipt }` |
| POST | `/csvjson/schema` | `{ csv }` → inferred schema |
| POST | `/csvjson/validate` | `{ csv }` → `{ valid, rows, schema? , error? }` |

Options: `{ delimiter?: string (default ","), strict?: boolean (default true), header?: boolean (default true) }`.

## Example

```js
const { csvToJson } = await import('./src/service.js');

const csv = `name,age,active,score\nalice,30,true,9.5\nbob,42,false,8.25`;
const { data, schema, receipt } = csvToJson(csv);
// schema: { name: 'str', age: 'int', active: 'bool', score: 'float' }
// data:   [{ name: 'alice', age: 30, active: true, score: 9.5 }, ...]
// receipt.ok: true
```

Nested round-trip:

```js
const rows = [
  { id: 1, meta: { role: 'admin', tags: ['x', 'y'] } },
  { id: 2, meta: { role: 'user', tags: ['z'] } },
];
const { csv } = jsonToCsv(rows);
const back = csvToJson(csv);
// back.data deep-equals rows; back.receipt.ok === true
```

## Test

```bash
npm test      # mocha test/**/*.test.js
```
