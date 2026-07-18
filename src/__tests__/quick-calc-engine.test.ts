import { describe, it, expect } from "vitest";
import { QuickCalcEngine } from "../engines/QuickCalcEngine.js";

describe("QuickCalcEngine", () => {
  const calc = new QuickCalcEngine();

  describe("rpm", () => {
    it("calculates RPM from SFM (imperial)", () => {
      // 300 SFM, 0.5" diameter → ~2292 RPM
      const r = calc.rpm(300, 0.5);
      expect(r.rpm).toBeGreaterThan(2200);
      expect(r.rpm).toBeLessThan(2400);
    });

    it("calculates RPM from Vc (metric)", () => {
      // 100 m/min, 12mm → ~2653 RPM
      const r = calc.rpm(100, 12, true);
      expect(r.rpm).toBeGreaterThan(2600);
      expect(r.rpm).toBeLessThan(2700);
    });
  });

  describe("feedRate", () => {
    it("calculates feed rate", () => {
      // 5000 RPM, 0.003" chip load, 4 flutes → 60 IPM
      const f = calc.feedRate(5000, 0.003, 4);
      expect(f.feed_ipm).toBe(60);
    });

    it("converts between metric and imperial", () => {
      const f = calc.feedRate(5000, 0.003, 4);
      expect(f.feed_mmmin).toBeCloseTo(60 * 25.4, 1);
    });
  });

  describe("mrr", () => {
    it("calculates material removal rate", () => {
      // 0.5" WOC, 0.25" DOC, 60 IPM → 7.5 in³/min
      const m = calc.mrr(0.5, 0.25, 60);
      expect(m.mrr_in3min).toBe(7.5);
    });
  });

  describe("surfaceSpeed", () => {
    it("calculates SFM from RPM", () => {
      // 5000 RPM, 0.5" diameter → ~654 SFM
      const s = calc.surfaceSpeed(5000, 0.5);
      expect(s.sfm).toBeGreaterThan(640);
      expect(s.sfm).toBeLessThan(660);
    });
  });

  describe("chipLoad", () => {
    it("back-calculates chip load", () => {
      // 60 IPM, 5000 RPM, 4 flutes → 0.003"
      const c = calc.chipLoad(60, 5000, 4);
      expect(c.chipload_in).toBe(0.003);
    });
  });

  describe("tapDrill", () => {
    it("M10x1.5 → 8.5mm drill", () => {
      const t = calc.tapDrill(10, 1.5);
      expect(t.drill_mm).toBe(8.5);
    });

    it("M6x1.0 → 5.0mm drill", () => {
      const t = calc.tapDrill(6, 1.0);
      expect(t.drill_mm).toBe(5.0);
    });
  });

  describe("cuttingTime", () => {
    it("calculates time correctly", () => {
      // 12" distance at 60 IPM → 0.2 min = 12 sec
      const t = calc.cuttingTime(12, 60);
      expect(t.time_min).toBe(0.2);
      expect(t.time_sec).toBe(12);
    });
  });

  describe("scallopHeight", () => {
    it("calculates scallop for ball nose", () => {
      // R=3mm, stepover=1mm → small scallop
      const s = calc.scallopHeight(3, 1);
      expect(s.height).toBeGreaterThan(0);
      expect(s.height).toBeLessThan(0.1);
    });

    it("handles stepover > diameter", () => {
      const s = calc.scallopHeight(3, 10);
      expect(s.height).toBe(3);
    });
  });

  describe("threadPitch", () => {
    it("converts TPI to pitch", () => {
      // 20 TPI → 1.27mm pitch
      const p = calc.threadPitch(20);
      expect(p.pitch_mm).toBeCloseTo(1.27, 2);
      expect(p.pitch_in).toBe(0.05);
    });
  });

  describe("cuttingPower", () => {
    it("calculates HP for steel", () => {
      // 5 in³/min in steel (factor 1.0) → 5 HP
      const p = calc.cuttingPower(5, "steel");
      expect(p.hp).toBe(5);
      expect(p.kw).toBeCloseTo(3.73, 1);
    });

    it("calculates HP for aluminum", () => {
      // 20 in³/min in aluminum (factor 0.25) → 5 HP
      const p = calc.cuttingPower(20, "aluminum");
      expect(p.hp).toBe(5);
    });

    it("supports custom factor", () => {
      const p = calc.cuttingPower(10, "custom", 2.0);
      expect(p.hp).toBe(20);
    });
  });
});
