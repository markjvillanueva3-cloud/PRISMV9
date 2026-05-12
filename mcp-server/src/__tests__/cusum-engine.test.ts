/**
 * Tests for CUSUMEngine (Phase 0.22 U-SPC2)
 */

import { describe, it, expect } from "vitest";
import { CUSUMEngine } from "../engines/CUSUMEngine.js";

describe("CUSUMEngine", () => {
  const baseConfig = { mean: 100, stddev: 1, k: 0.5, h: 4 };

  describe("construction + validation", () => {
    it("rejects invalid configs", () => {
      expect(() => new CUSUMEngine({ ...baseConfig, stddev: 0 })).toThrow(/stddev/);
      expect(() => new CUSUMEngine({ ...baseConfig, k: -1 })).toThrow(/k/);
      expect(() => new CUSUMEngine({ ...baseConfig, h: 0 })).toThrow(/h/);
      expect(() => new CUSUMEngine({ ...baseConfig, mean: NaN })).toThrow(/mean/);
    });

    it("setConfig replaces and resets state", () => {
      const e = new CUSUMEngine(baseConfig);
      e.step(105);
      e.setConfig({ ...baseConfig, mean: 200 });
      const p = e.step(200);
      expect(p.sPlus).toBe(0);
      expect(p.sMinus).toBe(0);
    });
  });

  describe("step()", () => {
    it("rejects non-finite values", () => {
      const e = new CUSUMEngine(baseConfig);
      expect(() => e.step(NaN)).toThrow(/finite/);
    });

    it("returns zero sums on an in-control observation", () => {
      const e = new CUSUMEngine(baseConfig);
      const p = e.step(100);
      expect(p.sPlus).toBe(0);
      expect(p.sMinus).toBe(0);
      expect(p.alarm).toBe("none");
    });

    it("accumulates S+ on sustained upward drift", () => {
      const e = new CUSUMEngine(baseConfig);
      let last = { sPlus: 0 } as { sPlus: number };
      for (let i = 0; i < 10; i += 1) last = e.step(102);
      expect(last.sPlus).toBeGreaterThan(0);
    });
  });

  describe("analyze()", () => {
    it("returns all points and no alarms for in-control data", () => {
      const e = new CUSUMEngine(baseConfig);
      const values = Array.from({ length: 20 }, () => 100 + (Math.random() - 0.5) * 0.5);
      const r = e.analyze(values);
      expect(r.points).toHaveLength(20);
      expect(r.firstAlarm).toBeNull();
    });

    it("fires an upper alarm on sustained upward shift", () => {
      const e = new CUSUMEngine(baseConfig);
      const shifted = Array.from({ length: 30 }, () => 102);
      const r = e.analyze(shifted);
      expect(r.firstAlarm).not.toBeNull();
      expect(r.firstAlarm!.alarm).toBe("upper");
    });

    it("fires a lower alarm on sustained downward shift", () => {
      const e = new CUSUMEngine(baseConfig);
      const shifted = Array.from({ length: 30 }, () => 98);
      const r = e.analyze(shifted);
      expect(r.firstAlarm).not.toBeNull();
      expect(r.firstAlarm!.alarm).toBe("lower");
    });

    it("tighter h (smaller) raises fewer alarm-free runs", () => {
      const strict = new CUSUMEngine({ ...baseConfig, h: 2 });
      const loose = new CUSUMEngine({ ...baseConfig, h: 8 });
      const shifted = Array.from({ length: 20 }, () => 101);
      const strictIdx = strict.analyze(shifted).firstAlarm?.index ?? Infinity;
      const looseIdx = loose.analyze(shifted).firstAlarm?.index ?? Infinity;
      expect(strictIdx).toBeLessThan(looseIdx);
    });
  });

  describe("runLengthUntilAlarm()", () => {
    it("returns the 1-based index of the first alarm", () => {
      const e = new CUSUMEngine(baseConfig);
      const shifted = Array.from({ length: 30 }, () => 102);
      const rl = e.runLengthUntilAlarm(shifted)!;
      expect(rl).toBeGreaterThan(0);
      expect(rl).toBeLessThanOrEqual(30);
    });

    it("returns null when no alarm fires", () => {
      const e = new CUSUMEngine(baseConfig);
      expect(e.runLengthUntilAlarm([100, 100, 100])).toBeNull();
    });
  });

  describe("reset()", () => {
    it("clears accumulated state and index", () => {
      const e = new CUSUMEngine(baseConfig);
      for (let i = 0; i < 10; i += 1) e.step(102);
      e.reset();
      const p = e.step(100);
      expect(p.index).toBe(0);
      expect(p.sPlus).toBe(0);
      expect(p.sMinus).toBe(0);
    });
  });
});
