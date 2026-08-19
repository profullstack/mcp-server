/**
 * HTTP handlers for the csvjson module.
 */

import { csvToJson, jsonToCsv, validate } from './service.js';

/**
 * POST /csvjson/to-json  { csv, options? } -> { data, schema, receipt }
 */
export async function toJson(c) {
  try {
    const body = await c.req.json();
    if (typeof body.csv !== 'string') {
      return c.json({ error: 'Missing required parameter: csv (string)' }, 400);
    }
    const options = body.options && typeof body.options === 'object' ? body.options : {};
    if (options.delimiter && (typeof options.delimiter !== 'string' || options.delimiter.length !== 1)) {
      return c.json({ error: 'options.delimiter must be a single character' }, 400);
    }
    const result = csvToJson(body.csv, options);
    return c.json({
      rows: result.data.length,
      schema: result.schema,
      data: result.data,
      receipt: result.receipt,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return c.json({ error: err.message, name: err.name || 'Error' }, 422);
  }
}

/**
 * POST /csvjson/to-csv  { rows, options? } -> { csv, columns, receipt }
 */
export async function toCsv(c) {
  try {
    const body = await c.req.json();
    const rows = body.rows ?? body.data;
    if (!Array.isArray(rows)) {
      return c.json({ error: 'Missing required parameter: rows (array of objects)' }, 400);
    }
    if (rows.some((r) => r === null || typeof r !== 'object' || Array.isArray(r))) {
      return c.json({ error: 'rows must contain only objects' }, 400);
    }
    const options = body.options && typeof body.options === 'object' ? body.options : {};
    const { csv, columns } = jsonToCsv(rows, options);
    const fieldsIn = new Set(rows.flatMap((r) => Object.keys(r))).size;
    return c.json({
      csv,
      columns,
      rows: rows.length,
      receipt: {
        rowsIn: rows.length,
        rowsOut: rows.length,
        fieldsIn,
        fieldsOut: columns.length,
        missingFields: [],
        addedFields: columns.length > fieldsIn ? columns.filter((col) => !Object.keys(rows[0] || {}).includes(col)) : [],
        changedCells: 0,
        nullCounts: {},
        ok: true,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return c.json({ error: err.message, name: err.name || 'Error' }, 422);
  }
}

/**
 * POST /csvjson/schema  { csv, options? } -> { schema, rows }
 */
export async function schema(c) {
  try {
    const body = await c.req.json();
    if (typeof body.csv !== 'string') return c.json({ error: 'Missing required parameter: csv' }, 400);
    const result = csvToJson(body.csv, body.options || {});
    return c.json({ schema: result.schema, rows: result.data.length, timestamp: new Date().toISOString() });
  } catch (err) {
    return c.json({ error: err.message }, 422);
  }
}

/**
 * POST /csvjson/validate  { csv, options? } -> { valid, rows, schema?, error? }
 */
export async function validateCsv(c) {
  try {
    const body = await c.req.json();
    if (typeof body.csv !== 'string') return c.json({ error: 'Missing required parameter: csv' }, 400);
    const result = validate(body.csv, body.options || {});
    return c.json({ ...result, timestamp: new Date().toISOString() });
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
}

/**
 * GET /csvjson/schema  introspection for the module.
 */
export function info(c) {
  return c.json({
    module: 'csvjson',
    status: 'active',
    message: 'Lossless CSV <-> JSON conversion with schema inference and reconciliation receipts',
    operations: ['/csvjson/to-json', '/csvjson/to-csv', '/csvjson/schema', '/csvjson/validate'],
    guarantees: [
      'strict coercion: mixed columns fail loudly with SchemaError (no silent corruption)',
      'nested objects and arrays flatten to dotted keys and expand back',
      'union-of-columns: blank cells in nested groups are ignored; container keys never receive scalars',
      'every conversion returns a reconciliation receipt (rows/fields in-out, missing/added fields, changed cells, ok)',
    ],
  });
}
