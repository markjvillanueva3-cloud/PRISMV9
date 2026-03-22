import { describe, it, expect } from "vitest";
import { BarStockVibrationEngine } from "../engines/BarStockVibrationEngine.js";
import type { BarStockProps } from "../engines/BarStockVibrationEngine.js";

const engine = new BarStockVibrationEngine();

const STEEL_BAR: BarStockProps = {
  diameter_mm: 25, length_mm: 200, material: "steel_1045", support: "cantilever",
};

describe("BarStockVibrationEngine", () => {
  describe("Natural Frequencies", () => {
    it("computes 3 modes for cantilever bar", () => {
      const freqs = engine.computeNaturalFrequencies(STEEL_BAR);
      expect(freqs.length).toBe(3);
      expect(freqs[0]).toBeGreaterThan(0);
      expect(freqs[1]).toBeGreaterThan(freqs[0]); // modes increase
      expect(freqs[2]).toBeGreaterThan(freqs[1]);
    });

    it("shorter bar has higher natural frequency", () => {
      const short = engine.computeNaturalFrequencies({ ...STEEL_BAR, length_mm: 100 });
      const long = engine.computeNaturalFrequencies({ ...STEEL_BAR, length_mm: 300 });
      expect(short[0]).toBeGreaterThan(long[0]);
    });

    it("larger diameter has higher natural frequency", () => {
      const thin = engine.computeNaturalFrequencies({ ...STEEL_BAR, diameter_mm: 10 });
      const thick = engine.computeNaturalFrequencies({ ...STEEL_BAR, diameter_mm: 30 });
      expect(thick[0]).toBeGreaterThan(thin[0]);
    });

    it("simply supported has higher fn than cantilever", () => {
      const cant = engine.computeNaturalFrequencies({ ...STEEL_BAR, support: "cantilever" });
      const ss = engine.computeNaturalFrequencies({ ...STEEL_BAR, support: "simply_supported" });
      expect(ss[0]).toBeGreaterThan(cant[0]);
    });

    it("guide bushing reduces effective length", () => {
      const noBushing = engine.computeNaturalFrequencies({ ...STEEL_BAR, support: "cantilever" });
      const withBushing = engine.computeNaturalFrequencies({
        ...STEEL_BAR, support: "guide_bushing", guide_bushing_position_mm: 150,
      });
      // Overhang is only 50mm vs 200mm full length
      expect(withBushing[0]).toBeGreaterThan(noBushing[0]);
    });
  });

  describe("Vibration Analysis", () => {
    it("low risk for short sturdy bar (L/D < 4)", () => {
      const result = engine.analyze({ ...STEEL_BAR, diameter_mm: 25, length_mm: 80 });
      expect(result.risk).toBe("low");
      expect(result.l_d_ratio).toBeLessThanOrEqual(4);
    });

    it("high risk for long slender bar (L/D > 6)", () => {
      const result = engine.analyze({ ...STEEL_BAR, diameter_mm: 10, length_mm: 100 });
      expect(["high", "critical"]).toContain(result.risk);
      expect(result.support_suggestions.length).toBeGreaterThan(0);
    });

    it("critical risk for very long bar (L/D > 10)", () => {
      const result = engine.analyze({ ...STEEL_BAR, diameter_mm: 10, length_mm: 150 });
      expect(result.risk).toBe("critical");
      expect(result.recommendations.some(r => r.includes("whipping"))).toBe(true);
    });

    it("provides max safe RPM and feed", () => {
      const result = engine.analyze(STEEL_BAR);
      expect(result.max_safe_rpm).toBeGreaterThan(0);
      expect(result.max_safe_feed_mm_rev).toBeGreaterThan(0);
      expect(result.static_deflection_um).toBeGreaterThan(0);
    });
  });

  describe("Chatter Check", () => {
    it("detects chatter risk near natural frequency", () => {
      const freqs = engine.computeNaturalFrequencies(STEEL_BAR);
      const chatterRPM = Math.round(freqs[0] * 60); // tooth freq = fn
      const result = engine.chatterCheck(STEEL_BAR, chatterRPM);
      expect(result.chatter_risk).toBe(true);
      expect(result.recommended_rpm).toBeDefined();
    });

    it("no chatter risk far from natural frequency", () => {
      const freqs = engine.computeNaturalFrequencies(STEEL_BAR);
      const safeRPM = Math.round(freqs[0] * 60 * 0.5); // well below fn
      const result = engine.chatterCheck(STEEL_BAR, safeRPM);
      expect(result.chatter_risk).toBe(false);
    });

    it("provides safe RPM ranges", () => {
      const result = engine.chatterCheck(STEEL_BAR, 5000);
      expect(result.safe_rpm_ranges.length).toBeGreaterThan(0);
      for (const [low, high] of result.safe_rpm_ranges) {
        expect(high).toBeGreaterThanOrEqual(low);
      }
    });
  });

  describe("Support Comparison", () => {
    it("tailstock improves frequency and deflection", () => {
      const result = engine.compareSupport(STEEL_BAR);
      expect(result.frequency_improvement_factor).toBeGreaterThan(1);
      expect(result.deflection_improvement_factor).toBeGreaterThan(1);
    });
  });

  describe("Dispatcher", () => {
    it("analyze action works", () => {
      const result = engine.calculate({ action: "analyze", bar: STEEL_BAR }) as any;
      expect(result.risk).toBeDefined();
      expect(result.natural_frequencies_Hz.length).toBe(3);
    });

    it("unknown action returns error", () => {
      const result = engine.calculate({ action: "unknown" as any }) as any;
      expect(result.error).toBeDefined();
    });
  });
});
