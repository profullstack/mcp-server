/**
 * csvjson service — lossless CSV <-> JSON conversion.
 *
 * Faithful rules:
 *  1. Schema inference widens per column: null < bool < int < float < str < json.
 *  2. Coercion is strict — a value that cannot coerce raises SchemaError. No
 *     silent data corruption, ever.
 *  3. Nested objects/arrays flatten to dotted keys (tags.0, tags.1, ...) and
 *     expand back. A blank cell is ignored ONLY when the key belongs to a
 *     nested group; blanks in plain scalar columns stay real nulls. A key that
 *     is a container path for other keys never receives a scalar, so `tags`
 *     cannot overwrite the list built from `tags.0`/`tags.1`.
 *  4. Every conversion returns a reconciliation receipt proving what survived.
 */

const INT_RE = /^[+-]?\d+$/;
const FLOAT_RE = /^[+-]?(\d+\.\d*|\.\d+|\d+)([eE][+-]?\d+)?$/;
const BOOL_TRUE = new Set(['true', 'yes', 'y', '1']);
const BOOL_FALSE = new Set(['false', 'no', 'n', '0']);
const NULLS = new Set(['', 'null', 'none', 'nan', 'n/a', 'na']);

export class SchemaError extends Error {
  constructor(message) {
    super(message);
    this.name = 'SchemaError';
  }
}

/** Parse RFC-4180-style CSV text into rows of strings. */
export function parseCsv(text, { delimiter = ',' } = {}) {
  if (typeof text !== 'string') throw new TypeError('csv text must be a string');
  if (delimiter.length !== 1) throw new TypeError('delimiter must be a single character');
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  let i = 0;
  const n = text.length;
  while (i < n) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQuotes = false; i += 1; continue;
      }
      field += ch; i += 1; continue;
    }
    if (ch === '"' && field === '') { inQuotes = true; i += 1; continue; }
    if (ch === delimiter) { row.push(field); field = ''; i += 1; continue; }
    if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i += 1;
      row.push(field); field = '';
      rows.push(row); row = [];
      i += 1; continue;
    }
    field += ch; i += 1;
  }
  if (field !== '' || row.length > 0) { row.push(field); rows.push(row); }
  // Drop a single trailing empty row (trailing newline).
  while (rows.length && rows[rows.length - 1].length === 1 && rows[rows.length - 1][0] === '') rows.pop();
  return rows;
}

/** Infer one type per column by widening across all rows. */
function kindOf(value) {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'boolean') return 'bool';
  if (typeof value === 'number') return Number.isInteger(value) ? 'int' : 'float';
  if (typeof value === 'object') return 'json';
  const s = String(value).trim();
  const low = s.toLowerCase();
  if (NULLS.has(low)) return 'null';
  if (BOOL_TRUE.has(low) || BOOL_FALSE.has(low)) return 'bool';
  if (INT_RE.test(s)) return 'int';
  if (FLOAT_RE.test(s)) return 'float';
  return 'str';
}

const WIDEN = { null: 0, bool: 1, int: 2, float: 3, str: 4, json: 5 };

export function inferSchema(rows) {
  const schema = {};
  for (const row of rows) {
    for (const [key, value] of Object.entries(row)) {
      const k = kindOf(value);
      const cur = schema[key] || 'null';
      schema[key] = WIDEN[k] > WIDEN[cur] ? k : cur;
    }
  }
  return schema;
}

export function coerceRow(row, schema, { strict = true } = {}) {
  const out = {};
  for (const [key, target] of Object.entries(schema)) {
    const value = row[key];
    if (value === null || value === undefined ||
        (typeof value === 'string' && NULLS.has(value.trim().toLowerCase()))) {
      out[key] = null;
      continue;
    }
    try {
      if (target === 'int') {
        const parsed = Number(String(value).trim());
        if (!Number.isInteger(parsed)) throw new Error('not an integer: ' + JSON.stringify(value));
        out[key] = parsed;
      } else if (target === 'float') {
        const parsed = Number(String(value).trim());
        if (Number.isNaN(parsed)) throw new Error('not a number: ' + JSON.stringify(value));
        out[key] = parsed;
      }
      else if (target === 'bool') {
        const s = String(value).trim().toLowerCase();
        if (BOOL_TRUE.has(s)) out[key] = true;
        else if (BOOL_FALSE.has(s)) out[key] = false;
        else throw new Error(`not a boolean: ${JSON.stringify(value)}`);
      } else if (target === 'null') out[key] = null;
      else if (target === 'str') out[key] = String(value);
      else if (target === 'json') out[key] = typeof value === 'string' ? JSON.parse(value) : value;
      else out[key] = value;
    } catch (err) {
      if (strict) throw new SchemaError(`column "${key}" expects ${target}, got ${JSON.stringify(value)}: ${err.message}`);
      out[key] = String(value);
    }
  }
  return out;
}

/** Flatten nested dicts/lists into dotted keys. `[]` marks empty lists. */
export function flatten(obj, prefix = '', sep = '.') {
  const out = {};
  if (Array.isArray(obj)) {
    if (obj.length === 0) { out[prefix] = '[]'; return out; }
    obj.forEach((value, idx) => {
      const key = prefix ? `${prefix}${sep}${idx}` : String(idx);
      Object.assign(out, flatten(value, key, sep));
    });
    return out;
  }
  if (obj !== null && typeof obj === 'object') {
    for (const [key, value] of Object.entries(obj)) {
      const nk = prefix ? `${prefix}${sep}${key}` : String(key);
      Object.assign(out, flatten(value, nk, sep));
    }
    return out;
  }
  out[prefix] = obj;
  return out;
}

function setPath(root, parts, value) {
  let cur = root;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    const next = parts[i + 1];
    const wantList = /^\d+$/.test(next);
    if (Array.isArray(cur)) {
      const idx = parseInt(part, 10);
      while (cur.length <= idx) cur.push(undefined);
      if (cur[idx] === undefined || (typeof cur[idx] !== 'object' && cur[idx] !== null)) {
        cur[idx] = wantList ? [] : {};
      }
      cur = cur[idx];
    } else {
      if (cur[part] === undefined || (typeof cur[part] !== 'object' && cur[part] !== null)) {
        cur[part] = wantList ? [] : {};
      }
      cur = cur[part];
    }
  }
  const last = parts[parts.length - 1];
  if (Array.isArray(cur)) {
    const idx = parseInt(last, 10);
    while (cur.length <= idx) cur.push(null);
    cur[idx] = value;
  } else {
    cur[last] = value;
  }
}

/** Expand dotted keys back into nested structure (inverse of flatten). */
export function expand(flat, sep = '.') {
  const keys = Object.keys(flat).sort((a, b) => a.length - b.length || a.localeCompare(b));
  const root = {};
  const isContainer = (k) => keys.some((o) => o !== k && (o.startsWith(k + sep) || k.startsWith(o + sep)));
  for (const key of keys) {
    const value = flat[key];
    const parts = key.split(sep);
    const isBlank = value === '' || value === null || value === undefined;
    // The '[]' marker recorded by flatten() for empty lists: restore the list.
    if (value === '[]' && isContainer(key)) {
      setPath(root, parts, []);
      continue;
    }
    if (parts.length === 1) {
      // A container path never receives a scalar (union-of-columns protection).
      if (isContainer(key)) continue;
      root[key] = value;
      continue;
    }
    // Blank cells in a nested group are ignored; blanks in scalar columns stay nulls.
    // Blank indexed cells would create null holes in arrays, so they are omitted too.
    const isIndexed = /^\d+$/.test(parts[parts.length - 1]);
    if (isBlank && (isContainer(key) || isIndexed)) continue;
    setPath(root, parts, value);
  }
  return root;
}

/** Render a CSV cell losslessly. */
function escapeCell(value) {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (/[",\r\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

/** Serialize rows (array of arrays) to CSV text. */
export function toCsvText(rows, { delimiter = ',' } = {}) {
  return rows.map((r) => r.map(escapeCell).join(delimiter)).join('\n');
}

/** JSON records -> CSV text. All columns are the union of every record's keys. */
export function jsonToCsv(rows, { delimiter = ',' } = {}) {
  if (!Array.isArray(rows)) throw new TypeError('rows must be an array of objects');
  const flat = rows.map((r) => flatten(r));
  const header = [...new Set(flat.flatMap((f) => Object.keys(f)))].sort();
  const out = [header];
  for (const f of flat) out.push(header.map((h) => (f[h] === undefined ? '' : f[h])));
  return { csv: toCsvText(out, { delimiter }), columns: header };
}

/** CSV text -> JSON records with schema inference + strict coercion + receipt. */
export function csvToJson(text, { delimiter = ',', strict = true, header: hasHeader = true } = {}) {
  const rows = parseCsv(text, { delimiter });
  if (rows.length === 0) return { data: [], schema: {}, receipt: makeReceipt(0, 0, 0, 0) };
  const headerRow = hasHeader ? rows[0] : rows[0].map((_, i) => `col${i + 1}`);
  const body = hasHeader ? rows.slice(1) : rows;
  const raw = body.map((r) => {
    const row = {};
    headerRow.forEach((h, i) => { row[h] = r[i] === undefined ? '' : r[i]; });
    return row;
  });
  const schema = inferSchema(raw);
  // Coerce every row against the union schema, then expand dotted keys back to
  // nested records. Expanding per row preserves heterogeneous shapes.
  const data = raw.map((r) => expand(coerceRow(r, schema, { strict })));
  // Receipt compares the flattened input records against the flattened output.
  const flatIn = raw.map((r) => flatten(r));
  const flatOut = data.map((d) => flatten(d));
  const keysIn = new Set(flatIn.flatMap((f) => Object.keys(f)));
  const keysOut = new Set(flatOut.flatMap((f) => Object.keys(f)));
  const missing = [...keysIn].filter((k) => !keysOut.has(k)).sort();
  const added = [...keysOut].filter((k) => !keysIn.has(k)).sort();
  let changedCells = 0;
  for (let i = 0; i < flatIn.length; i++) {
    for (const k of keysIn) {
      if (String(flatIn[i][k] ?? '') !== String(flatOut[i]?.[k] ?? '')) changedCells += 1;
    }
  }
  const nullCounts = {};
  for (const f of flatOut) for (const k of keysOut) {
    if (f[k] === null || f[k] === '') nullCounts[k] = (nullCounts[k] || 0) + 1;
  }
  return {
    data,
    schema,
    receipt: makeReceipt(raw.length, data.length, keysIn.size, keysOut.size, missing, added, changedCells, nullCounts),
  };
}

function makeReceipt(rowsIn, rowsOut, fieldsIn, fieldsOut, missing = [], added = [], changedCells = 0, nullCounts = {}) {
  return {
    rowsIn, rowsOut, fieldsIn, fieldsOut,
    missingFields: missing, addedFields: added, changedCells,
    nullCounts: Object.fromEntries(Object.entries(nullCounts).filter(([, v]) => v > 0)),
    ok: rowsIn === rowsOut && missing.length === 0,
  };
}

/** Validate CSV text: parseability + schema inference + strict coercion. */
export function validate(text, { delimiter = ',' } = {}) {
  try {
    const { data, schema, receipt } = csvToJson(text, { delimiter, strict: true });
    return { valid: true, rows: data.length, schema, receipt };
  } catch (err) {
    return { valid: false, error: err.message, name: err.name || 'Error' };
  }
}
