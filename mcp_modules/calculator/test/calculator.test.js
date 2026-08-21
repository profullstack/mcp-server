/**
 * Calculator tests.
 */

import { expect } from "chai";
import { evaluate } from "../src/calculator.js";
import { calculate, listCapabilities } from "../src/service.js";

describe("calculator/evaluate", () => {
  it("respects operator precedence", () => {
    expect(evaluate("1 + 2 * 3")).to.equal(7);
  });

  it("handles parentheses", () => {
    expect(evaluate("(1 + 2) * 3")).to.equal(9);
  });

  it("handles right-associative exponentiation", () => {
    expect(evaluate("2 ^ 3 ^ 2")).to.equal(512);
  });

  it("handles unary minus", () => {
    expect(evaluate("-5 + 3")).to.equal(-2);
  });

  it("handles scientific notation", () => {
    expect(evaluate("1.5e3")).to.equal(1500);
  });

  it("supports constants", () => {
    expect(evaluate("pi")).to.be.closeTo(Math.PI, 1e-9);
    expect(evaluate("2 * pi")).to.be.closeTo(2 * Math.PI, 1e-9);
  });

  it("supports functions", () => {
    expect(evaluate("sqrt(16)")).to.equal(4);
    expect(evaluate("abs(-7)")).to.equal(7);
    expect(evaluate("max(3, 9, 2)")).to.equal(9);
    expect(evaluate("clamp(15, 0, 10)")).to.equal(10);
    expect(evaluate("pow(2, 10)")).to.equal(1024);
  });

  it("rejects division by zero", () => {
    expect(() => evaluate("1 / 0")).to.throw(/zero/);
  });

  it("rejects unknown identifiers", () => {
    expect(() => evaluate("foo(1)")).to.throw(/Unknown identifier/);
  });

  it("rejects unbalanced parentheses", () => {
    expect(() => evaluate("(1 + 2")).to.throw(/parenthesis/);
  });

  it("service.calculate delegates to evaluator", () => {
    expect(calculate("2 + 2")).to.equal(4);
  });

  it("exposes capabilities", () => {
    const caps = listCapabilities();
    expect(caps.functions).to.include("sqrt");
    expect(caps.constants).to.include("pi");
  });
});
