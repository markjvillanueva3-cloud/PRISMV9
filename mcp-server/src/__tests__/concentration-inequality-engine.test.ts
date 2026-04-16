/**
 * Tests for ConcentrationInequalityEngine (Phase 0.20 U-MATH17)
 */

import { describe, it, expect } from "vitest";
import {
  ConcentrationInequalityEngine,
  concentrationInequalityEngine,
} from "../engines/ConcentrationInequalityEngine.js";

describe("ConcentrationInequalityEngine", () => {
  const engine = new ConcentrationInequalityEngine();

  describe("hoeffding()", () => {
    it("rejects invalid inputs", () => {
      expect(() => engine.hoeffding({ n: 0, epsilon: 0.1, a: 0, b: 1 })).toThrow(/n/);
      expect(() => engine.hoeffding({ n: 10, epsilon: 0, a: 0, b: 1 })).toThrow(/epsilon/);
      expect(() => engine.hoeffding({ n: 10, epsilon: 0.1, a: 1, b: 0 })).toThrow(/a/);
    });

    it("returns a value in [0,1]", () => {
      const r = engine.hoeffding({ n: 100, epsilon: 0.1, a: 0, b: 1 });
      expect(r.probability).toBeGreaterThanOrEqual(0);
      expect(r.probability).toBeLessThanOrEqual(1);
    });

    it("decreases as n grows", () => {
      const small = engine.hoeffding({ n: 10, epsilon: 0.1, a: 0, b: 1 });
      const big = engine.hoeffding({ n: 1000, epsilon: 0.1, a: 0, b: 1 });
      expect(big.probability).toBeLessThan(small.probability);
    });

    it("two-sided is 2× one-sided (unless clamped)", () => {
      const one = engine.hoeffding({ n: 1000, epsilon: 0.1, a: 0, b: 1, twoSided: false });
      const two = engine.hoeffding({ n: 1000, epsilon: 0.1, a: 0, b: 1 });
      expect(two.probability).toBeCloseTo(Math.min(1, 2 * one.probability), 6);
    });
  });

  describe("bernstein()", () => {
    it("rejects negative variance or non-positive bound", () => {
      expect(() => engine.bernstein({ n: 10, epsilon: 0.1, variance: -1, bound: 1 })).toThrow(/variance/);
      expect(() => engine.bernstein({ n: 10, epsilon: 0.1, variance: 0.1, bound: 0 })).toThrow(/bound/);
    });

    it("produces a probability in [0,1]", () => {
      const r = engine.bernstein({ n: 100, epsilon: 0.1, variance: 0.25, bound: 1 });
      expect(r.probability).toBeGreaterThanOrEqual(0);
      expect(r.probability).toBeLessThanOrEqual(1);
    });

    it("is tighter than Hoeffding when variance is much smaller than range²", () => {
      const h = engine.hoeffding({ n: 200, epsilon: 0.05, a: 0, b: 1 });
      const b = engine.bernstein({ n: 200, epsilon: 0.05, variance: 0.01, bound: 1 });
      expect(b.probability).toBeLessThanOrEqual(h.probability);
    });
  });

  describe("mcdiarmid()", () => {
    it("rejects c length mismatch", () => {
      expect(() => engine.mcdiarmid({ n: 3, epsilon: 0.1, c: [1, 1] })).toThrow(/length/);
    });

    it("rejects negative c_i", () => {
      expect(() => engine.mcdiarmid({ n: 2, epsilon: 0.1, c: [1, -1] })).toThrow(/c_i/);
    });

    it("rejects all-zero c_i", () => {
      expect(() => engine.mcdiarmid({ n: 2, epsilon: 0.1, c: [0, 0] })).toThrow(/Σ/);
    });

    it("equals a Hoeffding-style bound for uniform c_i on [0,1]", () => {
      // With all c_i = 1/n the bound becomes exp(-2ε²n).
      const n = 100;
      const c = Array.from({ length: n }, () => 1 / n);
      const r = engine.mcdiarmid({ n, epsilon: 0.1, c, twoSided: false });
      const expected = Math.exp(-2 * 0.01 * n);
      expect(r.probability).toBeCloseTo(expected, 4);
    });
  });

  describe("chernoff()", () => {
    it("rejects pHat out of [0,1]", () => {
      expect(() => engine.chernoff({ n: 10, epsilon: 0.1, pHat: -0.1, upperTail: true })).toThrow();
      expect(() => engine.chernoff({ n: 10, epsilon: 0.1, pHat: 1.5, upperTail: true })).toThrow();
    });

    it("returns a probability in [0,1]", () => {
      const r = engine.chernoff({ n: 100, epsilon: 0.05, pHat: 0.5, upperTail: true });
      expect(r.probability).toBeGreaterThanOrEqual(0);
      expect(r.probability).toBeLessThanOrEqual(1);
    });

    it("lower-tail uses denominator 2, upper uses 3", () => {
      const u = engine.chernoff({ n: 100, epsilon: 0.1, pHat: 0.5, upperTail: true });
      const l = engine.chernoff({ n: 100, epsilon: 0.1, pHat: 0.5, upperTail: false });
      expect(l.probability).toBeLessThan(u.probability);
    });
  });

  describe("hoeffdingSampleSize()", () => {
    it("returns integer ≥ 1", () => {
      const n = engine.hoeffdingSampleSize(0.05, 0.05, 1);
      expect(Number.isInteger(n)).toBe(true);
      expect(n).toBeGreaterThan(0);
    });

    it("grows when ε shrinks", () => {
      const a = engine.hoeffdingSampleSize(0.1, 0.05, 1);
      const b = engine.hoeffdingSampleSize(0.01, 0.05, 1);
      expect(b).toBeGreaterThan(a);
    });

    it("rejects bad delta or range", () => {
      expect(() => engine.hoeffdingSampleSize(0.1, 0, 1)).toThrow(/delta/);
      expect(() => engine.hoeffdingSampleSize(0.1, 1, 1)).toThrow(/delta/);
      expect(() => engine.hoeffdingSampleSize(0.1, 0.05, 0)).toThrow(/range/);
    });
  });

  describe("module singleton", () => {
    it("exports a ready-to-use instance", () => {
      const r = concentrationInequalityEngine.hoeffding({ n: 100, epsilon: 0.1, a: 0, b: 1 });
      expect(r.name).toBe("hoeffding");
    });
  });
});
