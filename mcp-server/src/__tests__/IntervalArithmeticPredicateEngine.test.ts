/**
 * Tests for IntervalArithmeticPredicateEngine — PROGRAM-PROOF-MS0 / U-PP02.
 * Real algebraic invariants, no toBeDefined stubs.
 */
import { describe, it, expect } from "vitest";
import { IntervalArithmeticPredicateEngine, type Interval } from "../engines/IntervalArithmeticPredicateEngine.js";

const eng = new IntervalArithmeticPredicateEngine();

describe("IntervalArithmeticPredicateEngine — arithmetic ops", () => {
  it("add: [1,2] + [3,4] = [4,6] (within ULP widening)", () => {
    const r = eng.add({ lo: 1, hi: 2 }, { lo: 3, hi: 4 });
    expect(r.lo).toBeLessThanOrEqual(4);
    expect(r.hi).toBeGreaterThanOrEqual(6);
  });
  it("sub: [5,7] - [1,2] = [3,6]", () => {
    const r = eng.sub({ lo: 5, hi: 7 }, { lo: 1, hi: 2 });
    expect(r.lo).toBeLessThanOrEqual(3);
    expect(r.hi).toBeGreaterThanOrEqual(6);
  });
  it("mul: [-2,3] * [-4,5] correctly handles sign-straddling", () => {
    const r = eng.mul({ lo: -2, hi: 3 }, { lo: -4, hi: 5 });
    // products: -2*-4=8, -2*5=-10, 3*-4=-12, 3*5=15 → [-12, 15]
    expect(r.lo).toBeLessThanOrEqual(-12);
    expect(r.hi).toBeGreaterThanOrEqual(15);
  });
  it("sq: [-3, 4]^2 straddling zero = [0, 16] (lo ≤ 0 after outward widening)", () => {
    const r = eng.sq({ lo: -3, hi: 4 });
    expect(r.lo).toBeLessThanOrEqual(0);
    expect(r.lo).toBeGreaterThan(-1e-200); // bounded by ULP widen, not absurdly negative
    expect(r.hi).toBeGreaterThanOrEqual(16);
  });
  it("sq: [2, 5]^2 positive = [4, 25]", () => {
    const r = eng.sq({ lo: 2, hi: 5 });
    expect(r.lo).toBeLessThanOrEqual(4);
    expect(r.hi).toBeGreaterThanOrEqual(25);
  });
  it("sqrt: clamps slightly-negative lo to ~0 (defense vs ULP, outward widening)", () => {
    const r = eng.sqrt({ lo: -1e-20, hi: 4 });
    expect(r.lo).toBeLessThanOrEqual(0);
    expect(r.lo).toBeGreaterThan(-1e-200);
    expect(r.hi).toBeGreaterThanOrEqual(2);
  });
});

describe("IntervalArithmeticPredicateEngine.fromPoint", () => {
  it("zero uncertainty → degenerate interval [x,x]", () => {
    const r = eng.fromPoint(5, 0);
    expect(r.lo).toBe(5);
    expect(r.hi).toBe(5);
  });
  it("uncertainty 0.025mm (25µm machine accuracy) widens correctly", () => {
    const r = eng.fromPoint(100, 0.025);
    expect(r.lo).toBeCloseTo(99.975, 6);
    expect(r.hi).toBeCloseTo(100.025, 6);
  });
});

describe("IntervalArithmeticPredicateEngine.pointInBox — safe predicates", () => {
  const box = { x: { lo: 0, hi: 100 }, y: { lo: 0, hi: 100 }, z: { lo: 0, hi: 100 } };
  it("point strictly inside → definitely-safe", () => {
    const pt = { x: eng.fromPoint(50, 0), y: eng.fromPoint(50, 0), z: eng.fromPoint(50, 0) };
    expect(eng.pointInBox(pt, box)).toBe("definitely-safe");
  });
  it("point strictly outside (single axis) → definitely-collision", () => {
    const pt = { x: eng.fromPoint(200, 0), y: eng.fromPoint(50, 0), z: eng.fromPoint(50, 0) };
    expect(eng.pointInBox(pt, box)).toBe("definitely-collision");
  });
  it("point on boundary with uncertainty → inconclusive (interval straddles)", () => {
    const pt = { x: eng.fromPoint(100, 0.025), y: eng.fromPoint(50, 0), z: eng.fromPoint(50, 0) };
    expect(eng.pointInBox(pt, box)).toBe("inconclusive");
  });
});

describe("IntervalArithmeticPredicateEngine.segmentDistancePredicate", () => {
  it("distance lower bound > margin → definitely-safe", () => {
    const r = eng.segmentDistancePredicate({ lo: 5, hi: 7 }, 2);
    expect(r).toBe("definitely-safe");
  });
  it("distance upper bound < 0 → definitely-collision", () => {
    const r = eng.segmentDistancePredicate({ lo: -3, hi: -1 }, 0);
    expect(r).toBe("definitely-collision");
  });
  it("distance straddles 0 → inconclusive", () => {
    const r = eng.segmentDistancePredicate({ lo: -0.5, hi: 0.5 }, 0);
    expect(r).toBe("inconclusive");
  });
});

describe("IntervalArithmeticPredicateEngine.combine — conservative merge", () => {
  it("any collision wins (worst-case rule)", () => {
    expect(eng.combine(["definitely-safe", "definitely-collision", "definitely-safe"])).toBe("definitely-collision");
  });
  it("all safe → safe", () => {
    expect(eng.combine(["definitely-safe", "definitely-safe", "definitely-safe"])).toBe("definitely-safe");
  });
  it("any inconclusive without collision → inconclusive", () => {
    expect(eng.combine(["definitely-safe", "inconclusive"])).toBe("inconclusive");
  });
  it("empty predicate list → safe (vacuous true)", () => {
    expect(eng.combine([])).toBe("definitely-safe");
  });
});
