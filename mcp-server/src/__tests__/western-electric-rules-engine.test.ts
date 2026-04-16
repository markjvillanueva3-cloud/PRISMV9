/**
 * Tests for WesternElectricRulesEngine (Phase 0.22 U-SPC1)
 */

import { describe, it, expect } from "vitest";
import {
  WesternElectricRulesEngine,
  westernElectricRulesEngine,
} from "../engines/WesternElectricRulesEngine.js";

describe("WesternElectricRulesEngine", () => {
  const engine = new WesternElectricRulesEngine();
  const mean = 100;
  const sd = 1;

  describe("validation", () => {
    it("rejects non-array values", () => {
      expect(() =>
        engine.analyze({ values: undefined as unknown as number[], mean, stddev: sd })
      ).toThrow(/array/);
    });

    it("rejects non-finite values, mean, or stddev", () => {
      expect(() => engine.analyze({ values: [NaN], mean, stddev: sd })).toThrow(/finite/);
      expect(() => engine.analyze({ values: [1], mean: Infinity, stddev: sd })).toThrow(/mean/);
      expect(() => engine.analyze({ values: [1], mean, stddev: 0 })).toThrow(/stddev/);
    });
  });

  describe("rule 1: 1 point beyond 3σ", () => {
    it("flags a point beyond 3σ", () => {
      const r = engine.analyze({ values: [100, 100, 104.5], mean, stddev: sd });
      expect(r.violations.some((v) => v.rule === 1)).toBe(true);
    });

    it("does not flag a point exactly at 3σ", () => {
      const r = engine.analyze({ values: [103], mean, stddev: sd });
      expect(r.violations.some((v) => v.rule === 1)).toBe(false);
    });
  });

  describe("rule 2: 2 of 3 beyond 2σ same side", () => {
    it("flags when 2 of 3 exceed +2σ", () => {
      const r = engine.analyze({ values: [103, 100, 103], mean, stddev: sd });
      expect(r.violations.some((v) => v.rule === 2)).toBe(true);
    });

    it("does not flag when points are on different sides", () => {
      const r = engine.analyze({ values: [103, 100, 97], mean, stddev: sd });
      expect(r.violations.some((v) => v.rule === 2)).toBe(false);
    });
  });

  describe("rule 3: 4 of 5 beyond 1σ same side", () => {
    it("flags when 4 of 5 exceed +1σ", () => {
      const r = engine.analyze({ values: [102, 100, 102, 103, 102], mean, stddev: sd });
      expect(r.violations.some((v) => v.rule === 3)).toBe(true);
    });
  });

  describe("rule 4: 8 consecutive on one side", () => {
    it("flags when 8 points sit above the mean", () => {
      const r = engine.analyze({
        values: [100.5, 100.5, 100.5, 100.5, 100.5, 100.5, 100.5, 100.5],
        mean,
        stddev: sd,
      });
      expect(r.violations.some((v) => v.rule === 4)).toBe(true);
    });

    it("does not flag when fewer than 8 on one side", () => {
      const r = engine.analyze({
        values: [100.5, 100.5, 100.5, 99.5, 100.5, 100.5, 100.5],
        mean,
        stddev: sd,
      });
      expect(r.violations.some((v) => v.rule === 4)).toBe(false);
    });
  });

  describe("rule 5: 6-point trend", () => {
    it("flags strictly increasing run of 6", () => {
      const r = engine.analyze({ values: [100, 100.1, 100.2, 100.3, 100.4, 100.5], mean, stddev: sd });
      expect(r.violations.some((v) => v.rule === 5)).toBe(true);
    });

    it("flags strictly decreasing run of 6", () => {
      const r = engine.analyze({ values: [100.5, 100.4, 100.3, 100.2, 100.1, 100], mean, stddev: sd });
      expect(r.violations.some((v) => v.rule === 5)).toBe(true);
    });

    it("does not flag when the trend breaks", () => {
      const r = engine.analyze({ values: [100, 100.1, 100.2, 100.1, 100.2, 100.3], mean, stddev: sd });
      expect(r.violations.some((v) => v.rule === 5)).toBe(false);
    });
  });

  describe("rule 6: 14-point alternation", () => {
    it("flags a 14-point zig-zag", () => {
      const zig = Array.from({ length: 14 }, (_, i) => (i % 2 === 0 ? 100.1 : 99.9));
      const r = engine.analyze({ values: zig, mean, stddev: sd });
      expect(r.violations.some((v) => v.rule === 6)).toBe(true);
    });
  });

  describe("rule 7: 15 consecutive within 1σ", () => {
    it("flags when 15 consecutive points sit inside ±1σ", () => {
      const stable = Array.from({ length: 15 }, () => 100 + (Math.random() - 0.5) * 0.4);
      const r = engine.analyze({ values: stable, mean, stddev: sd });
      expect(r.violations.some((v) => v.rule === 7)).toBe(true);
    });
  });

  describe("rule 8: 8 consecutive outside 1σ", () => {
    it("flags when 8 consecutive sit outside ±1σ", () => {
      const mixture = [102, 98, 102, 98, 102, 98, 102, 98];
      const r = engine.analyze({ values: mixture, mean, stddev: sd });
      expect(r.violations.some((v) => v.rule === 8)).toBe(true);
    });
  });

  describe("aggregate behaviour", () => {
    it("reports passed=true with no violations on noise well within control", () => {
      const r = engine.analyze({ values: [100, 100.1, 99.9, 100], mean, stddev: sd });
      expect(r.passed).toBe(true);
    });

    it("checkRule() runs individual rules", () => {
      const r = engine.checkRule(1, [104], mean, sd);
      expect(r).toHaveLength(1);
      expect(r[0].rule).toBe(1);
    });
  });

  describe("module singleton", () => {
    it("exports a ready-to-use instance", () => {
      const r = westernElectricRulesEngine.analyze({ values: [100], mean, stddev: sd });
      expect(r.passed).toBe(true);
    });
  });
});
