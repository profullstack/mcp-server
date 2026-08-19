import { expect } from 'chai';
import {
  parseCsv,
  csvToJson,
  jsonToCsv,
  validate,
  flatten,
  expand,
  inferSchema,
  coerceRow,
  SchemaError,
} from '../src/service.js';

describe('csvjson service', () => {
  describe('parseCsv', () => {
    it('parses simple rows', () => {
      expect(parseCsv('a,b\n1,2\n')).to.deep.equal([['a', 'b'], ['1', '2']]);
    });

    it('handles quoted fields with commas and newlines', () => {
      const rows = parseCsv('a,b\n"x,y","line1\nline2"\n');
      expect(rows).to.deep.equal([['a', 'b'], ['x,y', 'line1\nline2']]);
    });

    it('handles escaped quotes', () => {
      expect(parseCsv('a\n"say ""hi"""\n')).to.deep.equal([['a'], ['say "hi"']]);
    });

    it('handles CRLF line endings', () => {
      expect(parseCsv('a,b\r\n1,2\r\n')).to.deep.equal([['a', 'b'], ['1', '2']]);
    });

    it('ignores a single trailing empty line', () => {
      expect(parseCsv('a\n1\n\n')).to.deep.equal([['a'], ['1']]);
    });
  });

  describe('inferSchema + coerceRow', () => {
    it('widens null < bool < int < float < str', () => {
      const rows = [
        { x: '', y: 'true', z: '1', w: 'a' },
        { x: '5', y: 'no', z: '2.5', w: 'b' },
      ];
      const schema = inferSchema(rows);
      expect(schema).to.deep.equal({ x: 'int', y: 'bool', z: 'float', w: 'str' });
    });

    it('coerces values to the inferred schema', () => {
      const row = coerceRow({ x: '5', y: 'yes', z: '2.5', w: 'hello' }, { x: 'int', y: 'bool', z: 'float', w: 'str' });
      expect(row).to.deep.equal({ x: 5, y: true, z: 2.5, w: 'hello' });
    });

    it('maps null-like strings to null', () => {
      const row = coerceRow({ x: '', y: 'n/a' }, { x: 'int', y: 'str' });
      expect(row).to.deep.equal({ x: null, y: null });
    });

    it('raises SchemaError on a value that cannot coerce (strict)', () => {
      expect(() => coerceRow({ x: 'abc' }, { x: 'int' }, { strict: true })).to.throw(SchemaError);
    });

    it('raises SchemaError on unknown boolean text', () => {
      expect(() => coerceRow({ x: 'definitely' }, { x: 'bool' }, { strict: true })).to.throw(SchemaError);
    });

    it('falls back to string when strict is false', () => {
      expect(coerceRow({ x: 'abc' }, { x: 'int' }, { strict: false })).to.deep.equal({ x: 'abc' });
    });
  });

  describe('flatten / expand round-trip', () => {
    it('flattens nested objects and arrays to dotted keys', () => {
      expect(flatten({ id: 1, tags: ['a', 'b'] })).to.deep.equal({ id: 1, 'tags.0': 'a', 'tags.1': 'b' });
    });

    it('expands dotted keys back to nested structure', () => {
      expect(expand({ id: 1, 'tags.0': 'a', 'tags.1': 'b' })).to.deep.equal({ id: 1, tags: ['a', 'b'] });
    });

    it('marks empty arrays as "[]" scalar and expands back', () => {
      const flat = flatten({ tags: [] });
      expect(flat).to.deep.equal({ tags: '[]' });
      expect(expand({ tags: '[]' })).to.deep.equal({ tags: '[]' });
    });

    it('round-trips empty arrays inside heterogeneous records', () => {
      const rows = [
        { id: 1, meta: { tags: ['a', 'b'] } },
        { id: 2, meta: { tags: [] } },
      ];
      const { csv } = jsonToCsv(rows);
      const back = csvToJson(csv);
      expect(back.receipt.ok).to.equal(true);
      expect(back.data).to.deep.equal(rows);
    });

    it('round-trips a heterogeneous record set without corruption', () => {
      const rows = [
        { id: 1, name: 'a', meta: { role: 'admin', tags: ['alpha', 'beta'] } },
        { id: 2, name: 'b', meta: { role: 'user', tags: ['gamma'] } },
      ];
      const { csv } = jsonToCsv(rows);
      const { data, receipt } = csvToJson(csv);
      expect(receipt.ok).to.equal(true);
      expect(data).to.deep.equal(rows);
    });

    it('blank cells in nested groups are ignored (union of columns)', () => {
      const csv = 'id,meta.role,meta.tags.0,extra\n1,admin,x,\n2,user,z,\n';
      const { data } = csvToJson(csv);
      expect(data).to.deep.equal([
        { id: 1, meta: { role: 'admin', tags: ['x'] }, extra: null },
        { id: 2, meta: { role: 'user', tags: ['z'] }, extra: null },
      ]);
    });

    it('container keys never receive scalars (tags cannot overwrite tags.0)', () => {
      const csv = 'id,tags,tags.0\n7,,a\n';
      const { data } = csvToJson(csv);
      expect(data[0].tags).to.deep.equal(['a']);
      expect(data[0].id).to.equal(7);
    });

    it('scalar column blanks stay real nulls', () => {
      const { data } = csvToJson('a,b\n5,\n');
      expect(data).to.deep.equal([{ a: 5, b: null }]);
    });
  });

  describe('csvToJson end-to-end', () => {
    it('infers schema and coercions from a realistic table', () => {
      const csv = 'name,age,active,score\nalice,30,true,9.5\nbob,42,false,8.25\n';
      const { data, schema, receipt } = csvToJson(csv);
      expect(schema).to.deep.equal({ name: 'str', age: 'int', active: 'bool', score: 'float' });
      expect(data).to.deep.equal([
        { name: 'alice', age: 30, active: true, score: 9.5 },
        { name: 'bob', age: 42, active: false, score: 8.25 },
      ]);
      expect(receipt.ok).to.equal(true);
      expect(receipt.rowsIn).to.equal(2);
      expect(receipt.rowsOut).to.equal(2);
    });

    it('returns an empty result for empty input', () => {
      expect(csvToJson('')).to.deep.equal({ data: [], schema: {}, receipt: { rowsIn: 0, rowsOut: 0, fieldsIn: 0, fieldsOut: 0, missingFields: [], addedFields: [], changedCells: 0, nullCounts: {}, ok: true } });
    });

    it('counts changed cells when representations change', () => {
      const { receipt } = csvToJson('x\n"1"\n');
      expect(receipt.changedCells).to.equal(1); // "1" -> 1
    });

    it('uses colN headers when header: false', () => {
      const { data } = csvToJson('1,2\n3,4\n', { header: false });
      expect(data).to.deep.equal([{ col1: 1, col2: 2 }, { col1: 3, col2: 4 }]);
    });
  });

  describe('jsonToCsv', () => {
    it('produces a lossless, quoted CSV', () => {
      const { csv, columns } = jsonToCsv([{ a: 'x,y', b: 'line\nbreak', c: '"quoted"' }]);
      expect(columns).to.deep.equal(['a', 'b', 'c']);
      expect(csv).to.equal('a,b,c\n"x,y","line\nbreak","""quoted"""');
    });

    it('unions columns across heterogeneous records', () => {
      const { columns } = jsonToCsv([{ a: 1 }, { b: 2 }]);
      expect(columns).to.deep.equal(['a', 'b']);
    });
  });

  describe('validate', () => {
    it('reports valid for well-formed CSV', () => {
      const r = validate('a,b\n1,2\n');
      expect(r.valid).to.equal(true);
      expect(r.rows).to.equal(1);
      expect(r.receipt.ok).to.equal(true);
    });

    it('mixed text widens to str and validates cleanly', () => {
      const r = validate('a\n1\nabc\n');
      expect(r.valid).to.equal(true);
      expect(r.schema).to.deep.equal({ a: 'str' });
    });
    it('bool-like 1/0 infer as bool', () => {
      const { data, schema } = csvToJson('a\n1\n0\n');
      expect(schema).to.deep.equal({ a: 'bool' });
      expect(data).to.deep.equal([{ a: true }, { a: false }]);
    });
  });
});
