/**
 * Calculator Module
 *
 * Safe mathematical expression evaluation for the Profullstack MCP server.
 * No eval() — tokenized recursive-descent parser over a whitelisted operator
 * and function set.
 */

import { logger } from "../../src/utils/logger.js";
import { evaluateExpression, capabilities } from "./src/controller.js";
import { listCapabilities } from "./src/service.js";

/**
 * Register this module with the Hono app
 * @param {import("hono").Hono} app - The Hono app instance
 */
export async function register(app) {
  logger.info("Registering calculator module");

  app.get("/calculator", (c) => {
    return c.json({
      module: "calculator",
      status: "active",
      message: "Safe mathematical expression evaluation",
      version: listCapabilities().version,
    });
  });

  app.get("/calculator/capabilities", capabilities);
  app.post("/calculator/evaluate", evaluateExpression);

  app.get("/tools/calculator/info", (c) => {
    return c.json({
      name: "calculator",
      description:
        "Evaluate a mathematical expression safely (no eval). Supports +, -, *, /, %, ^, " +
        "parentheses, unary minus, constants (pi, e, tau, phi) and functions " +
        "(sin, cos, tan, sqrt, log, abs, floor, ceil, round, min, max, pow, hypot, clamp, ...).",
      examples: ["1 + 2 * 3", "sqrt(16) + pow(2, 8)", "clamp(15, 0, 10)"],
    });
  });
}

export { calculate, listCapabilities } from "./src/service.js";
export const metadata = { version: "1.0.0" };
