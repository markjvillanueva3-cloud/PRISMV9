/**
 * SafeExpressionEvaluator.test.ts — vitest
 *
 * P0 SECURITY surface — adversarial coverage is load-bearing here, not
 * optional. Plus arithmetic-correctness references (CLAUDE.md R9).
 *
 *  - arithmetic: precedence, associativity, unary, parens, scientific notation
 *  - functions: unary + binary math whitelist, constants
 *  - variables: scalar + vector indexing
 *  - SECURITY: reject eval/Function/constructor/__proto__/process/require,
 *    bare member access, unknown identifiers, oversized input, deep nesting
 *  - errors: malformed syntax, arity mismatch, out-of-range index, missing var
 *  - compileObjective: the GradientDescent-shaped adapter
 *
 * @module algorithms/SafeExpressionEvaluator.test
 */

import { describe, it, expect } from "vitest";
import { compileExpression, compileObjective } from "./SafeExpressionEvaluator.js";

// ─── arithmetic correctness ────────────────────────────────────────

describe("SafeExpressionEvaluator — arithmetic", () => {
  it("evaluates basic operators", () => {
    expect(compileExpression("2 + 3", []).evaluate({})).toBe(5);
    expect(compileExpression("10 - 4", []).evaluate({})).toBe(6);
    expect(compileExpression("6 * 7", []).evaluate({})).toBe(42);
    expect(compileExpression("20 / 4", []).evaluate({})).toBe(5);
    expect(compileExpression("17 % 5", []).evaluate({})).toBe(2);
  });

  it("respects operator precedence (× before +)", () => {
    expect(compileExpression("2 + 3 * 4", []).evaluate({})).toBe(14);
    expect(compileExpression("2 * 3 + 4", []).evaluate({})).toBe(10);
  });

  it("parentheses override precedence", () => {
    expect(compileExpression("(2 + 3) * 4", []).evaluate({})).toBe(20);
  });

  it("^ is right-associative (2^3^2 = 2^9 = 512)", () => {
    expect(compileExpression("2 ^ 3 ^ 2", []).evaluate({})).toBe(512);
  });

  it("unary minus and double negation", () => {
    expect(compileExpression("-5", []).evaluate({})).toBe(-5);
    expect(compileExpression("--5", []).evaluate({})).toBe(5);
    expect(compileExpression("3 - -2", []).evaluate({})).toBe(5);
  });

  it("scientific notation", () => {
    expect(compileExpression("1.5e3", []).evaluate({})).toBe(1500);
    expect(compileExpression("2e-2", []).evaluate({})).toBeCloseTo(0.02, 12);
    expect(compileExpression(".5", []).evaluate({})).toBe(0.5);
  });

  it("left-associative subtraction (10-3-2 = 5)", () => {
    expect(compileExpression("10 - 3 - 2", []).evaluate({})).toBe(5);
  });
});

// ─── functions + constants ─────────────────────────────────────────

describe("SafeExpressionEvaluator — functions and constants", () => {
  it("unary math functions", () => {
    expect(compileExpression("sin(0)", []).evaluate({})).toBeCloseTo(0, 12);
    expect(compileExpression("cos(0)", []).evaluate({})).toBeCloseTo(1, 12);
    expect(compileExpression("sqrt(16)", []).evaluate({})).toBe(4);
    expect(compileExpression("abs(-7)", []).evaluate({})).toBe(7);
    expect(compileExpression("exp(0)", []).evaluate({})).toBe(1);
    expect(compileExpression("floor(3.9)", []).evaluate({})).toBe(3);
  });

  it("binary math functions", () => {
    expect(compileExpression("pow(2, 10)", []).evaluate({})).toBe(1024);
    expect(compileExpression("max(3, 9)", []).evaluate({})).toBe(9);
    expect(compileExpression("min(3, 9)", []).evaluate({})).toBe(3);
    expect(compileExpression("hypot(3, 4)", []).evaluate({})).toBe(5);
    expect(compileExpression("atan2(1, 1)", []).evaluate({})).toBeCloseTo(Math.PI / 4, 12);
  });

  it("constants pi, e, tau", () => {
    expect(compileExpression("pi", []).evaluate({})).toBeCloseTo(Math.PI, 12);
    expect(compileExpression("e", []).evaluate({})).toBeCloseTo(Math.E, 12);
    expect(compileExpression("tau", []).evaluate({})).toBeCloseTo(2 * Math.PI, 12);
  });

  it("nested function composition", () => {
    expect(compileExpression("sqrt(pow(3,2) + pow(4,2))", []).evaluate({})).toBe(5);
    expect(compileExpression("sin(pi/2)", []).evaluate({})).toBeCloseTo(1, 12);
  });
});

// ─── variables ─────────────────────────────────────────────────────

describe("SafeExpressionEvaluator — variables", () => {
  it("scalar variable references", () => {
    const ex = compileExpression("k * x + b", ["k", "x", "b"]);
    expect(ex.evaluate({ k: 2, x: 5, b: 1 })).toBe(11);
    expect(ex.referencedVars.sort()).toEqual(["b", "k", "x"]);
  });

  it("vector variable indexing", () => {
    const ex = compileExpression("y[0]^2 + y[1]^2", ["y"]);
    expect(ex.evaluate({ y: [3, 4] })).toBe(25);
  });

  it("computed index expression y[i]", () => {
    const ex = compileExpression("y[i + 1]", ["y", "i"]);
    expect(ex.evaluate({ y: [10, 20, 30], i: 1 })).toBe(30);
  });

  it("a compiled expression is reusable across scopes", () => {
    const ex = compileExpression("-a * x", ["a", "x"]);
    expect(ex.evaluate({ a: 1, x: 5 })).toBe(-5);
    expect(ex.evaluate({ a: 3, x: 2 })).toBe(-6);
  });

  it("referencedVars is the actual subset used, not all allowed", () => {
    const ex = compileExpression("x + 1", ["x", "y", "z"]);
    expect(ex.referencedVars).toEqual(["x"]);
  });
});

// ─── SECURITY (P0 — adversarial) ───────────────────────────────────

describe("SafeExpressionEvaluator — SECURITY: dangerous identifiers rejected at compile", () => {
  for (const evil of [
    "constructor", "__proto__", "prototype", "process", "require",
    "eval", "Function", "global", "globalThis", "import", "window",
  ]) {
    it(`rejects bare "${evil}"`, () => {
      expect(() => compileExpression(evil, [])).toThrow();
    });
    it(`rejects "${evil}" even if foolishly listed as an allowed var`, () => {
      expect(() => compileExpression(evil, [evil])).toThrow(/forbidden/i);
    });
  }

  it("rejects a constructor() call attempt", () => {
    expect(() => compileExpression("constructor(1)", [])).toThrow();
  });

  it("rejects member/property access — there is no '.' in the grammar", () => {
    expect(() => compileExpression("x.constructor", ["x"])).toThrow();
    expect(() => compileExpression("x.__proto__", ["x"])).toThrow();
  });

  it("rejects an unknown function call (not in the math whitelist)", () => {
    expect(() => compileExpression("system(1)", [])).toThrow(/Unknown.*function|Unknown identifier/);
    expect(() => compileExpression("alert(1)", [])).toThrow();
  });

  it("rejects an unknown bare identifier", () => {
    expect(() => compileExpression("foobar", [])).toThrow(/Unknown identifier/);
  });

  it("rejects an unknown variable used with indexing", () => {
    expect(() => compileExpression("z[0]", ["y"])).toThrow(/Unknown variable/);
  });

  it("rejects oversized source (DoS guard)", () => {
    const huge = "1+".repeat(3000) + "1"; // > 4096 chars
    expect(() => compileExpression(huge, [])).toThrow(/max length/);
  });

  it("rejects pathologically deep nesting (recursion-depth DoS guard)", () => {
    const deep = "(".repeat(200) + "1" + ")".repeat(200);
    expect(() => compileExpression(deep, [])).toThrow(/max depth/);
  });

  it("never invokes eval/Function — a string that is valid JS but bad math throws cleanly", () => {
    // `[].map` is valid JS member access but not valid in our grammar
    expect(() => compileExpression("[].map", [])).toThrow();
    // an attempt at a template-literal / backtick
    expect(() => compileExpression("`x`", ["x"])).toThrow(/Unexpected character/);
  });

  it("rejects a variable name that collides with a reserved fn/const", () => {
    expect(() => compileExpression("sin", ["sin"])).toThrow(/collides/);
    expect(() => compileExpression("pi", ["pi"])).toThrow(/collides/);
  });
});

// ─── syntax / runtime errors ───────────────────────────────────────

describe("SafeExpressionEvaluator — error handling (fail-loud)", () => {
  it("throws on empty / whitespace-only source", () => {
    expect(() => compileExpression("", [])).toThrow(/empty/);
    expect(() => compileExpression("   ", [])).toThrow(/empty/);
  });

  it("throws on unbalanced parentheses", () => {
    expect(() => compileExpression("(2 + 3", [])).toThrow();
    expect(() => compileExpression("2 + 3)", [])).toThrow();
  });

  it("throws on trailing operator / malformed syntax", () => {
    expect(() => compileExpression("2 +", [])).toThrow();
    expect(() => compileExpression("* 3", [])).toThrow();
    expect(() => compileExpression("2 3", [])).toThrow(/trailing/);
  });

  it("throws on wrong function arity", () => {
    expect(() => compileExpression("sin(1, 2)", [])).toThrow(/arity/);
    expect(() => compileExpression("pow(2)", [])).toThrow(/arity/);
  });

  it("throws at evaluate-time on out-of-range vector index", () => {
    const ex = compileExpression("y[5]", ["y"]);
    expect(() => ex.evaluate({ y: [1, 2, 3] })).toThrow(/out of range/);
  });

  it("throws at evaluate-time on a missing variable", () => {
    const ex = compileExpression("x + 1", ["x"]);
    expect(() => ex.evaluate({})).toThrow(/not in scope/);
  });

  it("throws when a scalar is indexed or a vector is used as scalar", () => {
    const exIdx = compileExpression("s[0]", ["s"]);
    expect(() => exIdx.evaluate({ s: 5 })).toThrow(/scalar/);
    const exScalar = compileExpression("v + 1", ["v"]);
    expect(() => exScalar.evaluate({ v: [1, 2] })).toThrow(/vector/);
  });

  it("throws on malformed number", () => {
    expect(() => compileExpression("1.2.3", [])).toThrow();
  });

  it("throws on non-string source", () => {
    expect(() => compileExpression(42 as unknown as string, [])).toThrow();
  });
});

// ─── compileObjective adapter ──────────────────────────────────────

describe("SafeExpressionEvaluator — compileObjective (GradientDescent-shaped)", () => {
  it("compiles a paraboloid objective callable as f(x: number[])", () => {
    const f = compileObjective("x[0]^2 + x[1]^2", "x");
    expect(f([3, 4])).toBe(25);
    expect(f([0, 0])).toBe(0);
  });

  it("default vector var name is 'x'", () => {
    const f = compileObjective("x[0] + x[1] + x[2]");
    expect(f([1, 2, 3])).toBe(6);
  });

  it("Rosenbrock objective evaluates correctly at the minimum (1,1)→0", () => {
    const f = compileObjective("(1 - x[0])^2 + 100*(x[1] - x[0]^2)^2", "x");
    expect(f([1, 1])).toBeCloseTo(0, 12);
    expect(f([0, 0])).toBe(1); // (1-0)² + 100(0-0)² = 1
  });

  it("supports math functions in objectives", () => {
    const f = compileObjective("sin(x[0]) + cos(x[1])", "x");
    expect(f([0, 0])).toBeCloseTo(1, 12); // sin0 + cos0 = 0 + 1
  });
});
