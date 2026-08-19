// basic-usage.js — csvjson module examples
import { csvToJson, jsonToCsv, validate } from '../src/service.js';

const csv = `product,qty,price,active
widget,3,9.99,true
gadget,1,49.5,false`;

const { data, schema, receipt } = csvToJson(csv);
console.log('schema:', schema);
console.log('data:', JSON.stringify(data));
console.log('receipt ok:', receipt.ok);

const nested = [{ id: 1, meta: { tags: ['a', 'b'] } }, { id: 2, meta: { tags: [] } }];
const { csv: out } = jsonToCsv(nested);
console.log('csv:', '\n' + out);

console.log('validate bad:', validate('x\nabc\n'));
