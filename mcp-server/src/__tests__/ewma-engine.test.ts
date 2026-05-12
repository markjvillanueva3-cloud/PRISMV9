/**
 * Tests for EWMAEngine (Phase 0.22 U-SPC3)
 */

import { describe, it, expect } from "vitest";
import { EWMAEngine } from "../engines/EWMAEngine.js";

describe("EWMAEngine", () => {
  const baseConfig = { mean: 100, stddev: 1, lambda: 0.2, L: 3 };

  describe("construction + validation", () => {
    it("rejects invalid configs", () => {
      expect(() => new EWMAEngine({ ...baseConfig, stddev: 0 })).toThrow(/stddev/);
      expect(() => new EWMAEngine({ ...baseConfig, lambda: 0 })).toThrow(/lambda/);
      expect(() => new EWMAEngine({ ...baseConfig, lambda: 1.1 })).toThrow(/lambda/);
      expect(() => new EWMAEngine({ ...baseConfig, L: 0 })).toThrow(/L/);
    });

    it("setConfig() resets internal z and index", () => {
      const e = new EWMAEngine(baseConfig);
      e.step(110);
      e.setConfig({ ...baseConfig, mean: 200 });
      const p = e.step(200);
      expect(p.z).toBeCloseTo(200, 4);
      expect(p.index).toBe(0);
    });
  });

  describe("step() + analyze()", () => {
    it("returns z approaching the mean when values equal μ", () => {
      const e = new EWMAEngine(baseConfig);
      const p = e.step(100);
      expect(p.z).toBeCloseTo(100, 4);
      expect(p.alarm).toBe("none");
    });

    it("widens UCL/LCL in early samples (variance ramp-up)", () => {
      const e = new EWMAEngine(baseConfig);
      const first = e.step(100);
      const later = e.step(100);
      const firstWidth = first.ucl - first.lcl;
      const laterWidth = later.ucl - later.lcl;
      expect(laterWidth).toBeGreaterThanOrEqual(firstWidth);
    });

    it("fires an upper alarm on a sustained upward shift", () => {
      const e = new EWMAEngine(baseConfig);
      const shifted = Array.from({ length: 50 }, () => 103);
      const r = e.analyze(shifted);
      expect(r.firstAlarm).not.toBeNull();
      expect(r.firstAlarm!.alarm).toBe("upper");
    });

    it("fires a lower alarm on a sustained downward shift", () => {
      const e = new EWMAEngine(baseConfig);
      const shifted = Array.from({ length: 50 }, () => 97);
      const r = e.analyze(shifted);
      expect(r.firstAlarm).not.toBeNull();
      expect(r.firstAlarm!.alarm).toBe("lower");
    });

    it("keeps noise around the mean alarm-free", () => {
      const e = new EWMAEngine(baseConfig);
      const values = Array.from({ length: 30 }, () => 100 + (Math.random() - 0.5) * 0.5);
      expect(e.analyze(values).firstAlarm).toBeNull();
    });

    it("rejects non-finite values", () => {
      const e = new EWMAEngine(baseConfig);
      expect(() => e.step(Infinity)).toThrow(/finite/);
    });
  });

  describe("steadyStateHalfWidth()", () => {
    it("matches L·σ·√(λ/(2−λ))", () => {
      const e = new EWMAEngine(baseConfig);
      const expected = 3 * 1 * Math.sqrt(0.2 / (2 - 0.2));
      expect(e.steadyStateHalfWidth()).toBeCloseTo(Math.round(expected * 10000) / 10000, 4);
    });

    it("decreases as λ decreases (smoother → tighter steady limits)", () => {
      const tight = new EWMAEngine({ ...baseConfig, lambda: 0.05 });
      const wide = new EWMAEngine({ ...baseConfig, lambda: 0.8 });
      expect(tight.steadyStateHalfWidth()).toBeLessThan(wide.steadyStateHalfWidth());
    });
  });

  describe("reset()", () => {
    it("restores z to μ and index to 0", () => {
      const e = new EWMAEngine(baseConfig);
      e.step(110);
      e.reset();
      const p = e.step(100);
      expect(p.index).toBe(0);
      expect(p.z).toBeCloseTo(100, 4);
    });
  });
});
