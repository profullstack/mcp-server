/**
 * Fake JSON Module Controller
 *
 * This file contains the route handlers for the fake_json module.
 */

import { fakeJsonService } from './service.js';

/**
 * Generate a JSON response for any endpoint
 * @param {import('hono').Context} c - Hono context
 * @returns {Response} JSON response
 */
export async function generateJsonResponse(c) {
  try {
    // Get the path from the request
    const path = c.req.path;

    // Extract fields from query parameters if provided
    const fields = c.req.query('fields');

    // Extract API key from query parameters or headers
    const apiKey = c.req.query('apiKey') || c.req.header('x-api-key');

    // Generate the JSON response
    const jsonResponse = await fakeJsonService.generateJson(path, fields, apiKey);

    // Set CORS headers
    c.header('Access-Control-Allow-Origin', '*');
    c.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
    c.header('Access-Control-Allow-Headers', 'Content-Type, x-api-key');

    // Return the JSON response
    return c.json(jsonResponse);
  } catch (error) {
    return c.json(
      {
        error: error.message,
        path: c.req.path,
        timestamp: new Date().toISOString(),
      },
      500
    );
  }
}
