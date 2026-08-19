/**
 * csvjson Module
 *
 * Lossless CSV <-> JSON conversion: schema inference, strict coercion,
 * nested-object flattening, union-of-columns protection and reconciliation
 * receipts. Zero runtime dependencies.
 */

import { logger } from '../../src/utils/logger.js';
import { toJson, toCsv, schema, validateCsv, info } from './src/controller.js';
import { version } from './package.json' with { type: 'json' };

/**
 * Register this module with the Hono app
 * @param {import('hono').Hono} app - The Hono app instance
 */
export async function register(app) {
  logger.info('Registering csvjson module');

  app.get('/csvjson', info);

  app.post('/csvjson/to-json', toJson);
  app.post('/csvjson/to-csv', toCsv);
  app.post('/csvjson/schema', schema);
  app.post('/csvjson/validate', validateCsv);

  app.get('/tools/csvjson/info', (c) => {
    return c.json({
      name: 'csvjson',
      description:
        'Lossless CSV <-> JSON conversion with schema inference, strict coercion and ' +
        'reconciliation receipts. Use to convert tabular data without silent corruption.',
      version,
    });
  });

  app.post('/tools/csvjson/to_json', (c) => toJson(c));
  app.post('/tools/csvjson/to_csv', (c) => toCsv(c));
  app.post('/tools/csvjson/validate', (c) => validateCsv(c));

  app.get('/tools/csvjson/to_json/info', (c) => {
    return c.json({
      name: 'csvjson_to_json',
      description: 'Convert CSV text to JSON records. Returns inferred schema and a reconciliation receipt.',
      parameters: {
        csv: { type: 'string', description: 'The CSV text to convert', required: true },
        options: {
          type: 'object',
          description: '{ delimiter?: string, strict?: boolean, header?: boolean }',
          required: false,
        },
      },
    });
  });

  app.get('/tools/csvjson/to_csv/info', (c) => {
    return c.json({
      name: 'csvjson_to_csv',
      description: 'Convert an array of JSON records to lossless CSV text (union of all columns).',
      parameters: {
        rows: { type: 'array', description: 'Array of JSON objects', required: true },
        options: { type: 'object', description: '{ delimiter?: string }', required: false },
      },
    });
  });
}
