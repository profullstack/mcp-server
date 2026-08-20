/**
 * Calculator service.
 *
 * Thin wrapper around the safe evaluator so the HTTP layer and tool surface
 * share one implementation. Every call returns a plain result or throws a
 * specific error — never a bare undefined.
 */

import { evaluate, supportedFunctions, supportedConstants } from "./calculator.js";

export const CALC_VERSION = "1.0.0";

export function calculate(expression) {
  if (typeof expression !== "string") {
    throw new Error("Expression must be a string");
  }
  return evaluate(expression);
}

export function listCapabilities() {
  return {
    version: CALC_VERSION,
    functions: supportedFunctions,
    constants: supportedConstants,
    operators: ["+", "-", "*", "/", "%", "^", "unary -"],
  };
}
