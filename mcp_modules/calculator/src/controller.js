/**
 * HTTP handlers for the calculator module.
 */

import { calculate, listCapabilities } from "./service.js";

/**
 * POST /calculator/evaluate
 * Body: { expression: "1 + 2 * 3" }
 */
export async function evaluateExpression(c) {
  try {
    const params = await c.req.json();
    if (typeof params.expression !== "string" || params.expression.trim() === "") {
      return c.json({ error: "Missing required parameter: expression (string)" }, 400);
    }
    const result = calculate(params.expression);
    return c.json({ expression: params.expression, result });
  } catch (err) {
    return c.json({ error: err.message }, 400);
  }
}

/**
 * GET /calculator/capabilities
 */
export async function capabilities(c) {
  return c.json(listCapabilities());
}
