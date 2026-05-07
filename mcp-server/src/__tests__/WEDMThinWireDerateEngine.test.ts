/**
 * WEDMThinWireDerateEngine Tests
 * Parameter derating for thin wires
 */

import { describe, it, expect } from "vitest";
import {
  wedmThinWireDerateEngine,
  WEDMThinWireDerateEngine,
} from "../engines/WEDMThinWireDerateEngine.js";

describe("WEDMThinWireDerateEngine", () => {
  describe("categorizeWire", () => {
    it("categorizes standard wire (≥0.20mm)", () => {
      expect(wedmThinWireDerateEngine.categorizeWire(0.25)).toBe("standard");
      expect(wedmThinWireDerateEngine.categorizeWire(0.30)).toBe("standard");
    });

    it("categorizes thin wire (0.10-0.20mm)", () => {
      expect(wedmThinWireDerateEngine.categorizeWire(0.15)).toBe("thin");
      // 0.10 is at threshold, categorizes as thin (not < 0.10)
      expect(wedmThinWireDerateEngine.categorizeWire(0.10)).toBe("thin");
    });

    it("categorizes ultra-thin wire (0.05-0.10mm)", () => {
      expect(wedmThinWireDerateEngine.categorizeWire(0.08)).toBe("ultra_thin");
      // 0.05 is at threshold, categorizes as ultra_thin (not < 0.05)
      expect(wedmThinWireDerateEngine.categorizeWire(0.05)).toBe("ultra_thin");
    });

    it("categorizes micro wire (<0.05mm)", () => {
      expect(wedmThinWireDerateEngine.categorizeWire(0.03)).toBe("micro");
    });
  });

  describe("calculateCurrentDerateFactor", () => {
    it("returns 1.0 for standard wire", () => {
      const factor = wedmThinWireDerateEngine.calculateCurrentDerateFactor(0.25);
      expect(factor).toBe(1.0);
    });

    it("returns < 1.0 for thin wire", () => {
      const factor = wedmThinWireDerateEngine.calculateCurrentDerateFactor(0.15);
      expect(factor).toBeLessThan(1.0);
      expect(factor).toBeGreaterThan(0.1);
    });

    it("decreases with diameter", () => {
      const f1 = wedmThinWireDerateEngine.calculateCurrentDerateFactor(0.20);
      const f2 = wedmThinWireDerateEngine.calculateCurrentDerateFactor(0.10);
      expect(f2).toBeLessThan(f1);
    });

    it("adjusts for wire material thermal capacity", () => {
      const brass = wedmThinWireDerateEngine.calculateCurrentDerateFactor(0.15, "brass");
      const moly = wedmThinWireDerateEngine.calculateCurrentDerateFactor(0.15, "molybdenum");
      // Moly has higher thermal capacity → less derating
      expect(moly).toBeGreaterThan(brass);
    });
  });

  describe("calculateTonDerateFactor", () => {
    it("returns 1.0 for standard wire", () => {
      const factor = wedmThinWireDerateEngine.calculateTonDerateFactor(0.25);
      expect(factor).toBe(1.0);
    });

    it("is less aggressive than current derating", () => {
      const currentFactor = wedmThinWireDerateEngine.calculateCurrentDerateFactor(0.10);
      const tonFactor = wedmThinWireDerateEngine.calculateTonDerateFactor(0.10);
      expect(tonFactor).toBeGreaterThan(currentFactor);
    });
  });

  describe("calculateProductivityImpact", () => {
    it("returns 0 for no derating", () => {
      const impact = wedmThinWireDerateEngine.calculateProductivityImpact(1.0, 1.0);
      expect(impact).toBe(0);
    });

    it("calculates combined impact", () => {
      // 50% current × 70% ton = 35% MRR → 65% reduction
      const impact = wedmThinWireDerateEngine.calculateProductivityImpact(0.5, 0.7);
      expect(impact).toBeCloseTo(65, 0);
    });
  });

  describe("derate", () => {
    it("does not derate standard wire", () => {
      const result = wedmThinWireDerateEngine.derate({
        wire_diameter_mm: 0.25,
        proposed_current_A: 15,
        proposed_ton_us: 20,
      });

      expect(result.derated).toBe(false);
      expect(result.derated_current_A).toBe(15);
      expect(result.derated_ton_us).toBe(20);
      expect(result.wire_category).toBe("standard");
    });

    it("derates thin wire parameters", () => {
      const result = wedmThinWireDerateEngine.derate({
        wire_diameter_mm: 0.15,
        proposed_current_A: 15,
        proposed_ton_us: 20,
      });

      expect(result.derated).toBe(true);
      expect(result.derated_current_A).toBeLessThan(15);
      expect(result.wire_category).toBe("thin");
      expect(result.productivity_impact_pct).toBeGreaterThan(0);
    });

    it("severely derates micro wire", () => {
      const result = wedmThinWireDerateEngine.derate({
        wire_diameter_mm: 0.03,
        proposed_current_A: 10,
        proposed_ton_us: 15,
      });

      expect(result.derated).toBe(true);
      expect(result.wire_category).toBe("micro");
      expect(result.current_derate_factor).toBeLessThan(0.3);
      expect(result.warning).toContain("Micro wire");
    });

    it("includes tension recommendation", () => {
      const result = wedmThinWireDerateEngine.derate({
        wire_diameter_mm: 0.10,
        proposed_current_A: 10,
        proposed_ton_us: 15,
      });

      expect(result.tension_recommendation).toBeDefined();
      expect(result.tension_recommendation!.min_N).toBeGreaterThan(0);
    });

    it("warns on out-of-range tension", () => {
      const result = wedmThinWireDerateEngine.derate({
        wire_diameter_mm: 0.10,
        proposed_current_A: 10,
        proposed_ton_us: 15,
        proposed_tension_N: 15, // Too high for ultra_thin
      });

      expect(result.warning).toContain("tension");
    });

    it("enforces minimum current", () => {
      const result = wedmThinWireDerateEngine.derate({
        wire_diameter_mm: 0.02, // Very thin
        proposed_current_A: 0.3, // Very low
        proposed_ton_us: 10,
      });

      expect(result.derated_current_A).toBeGreaterThanOrEqual(0.5); // Min
    });

    it("throws on invalid input", () => {
      expect(() =>
        wedmThinWireDerateEngine.derate({
          wire_diameter_mm: 0,
          proposed_current_A: 10,
          proposed_ton_us: 15,
        })
      ).toThrow();
    });

    it("includes detailed rationale", () => {
      const result = wedmThinWireDerateEngine.derate({
        wire_diameter_mm: 0.15,
        proposed_current_A: 15,
        proposed_ton_us: 20,
      });

      expect(result.rationale).toBeDefined();
      expect(result.rationale.length).toBeGreaterThan(20);
    });
  });

  describe("calculateMaxSafeCurrent", () => {
    it("calculates max current for wire diameter", () => {
      const max = wedmThinWireDerateEngine.calculateMaxSafeCurrent(0.15);
      expect(max).toBeLessThan(20); // Reference max
      expect(max).toBeGreaterThan(0.5); // Minimum
    });

    it("returns higher current for thicker wire", () => {
      const thin = wedmThinWireDerateEngine.calculateMaxSafeCurrent(0.10);
      const thick = wedmThinWireDerateEngine.calculateMaxSafeCurrent(0.20);
      expect(thick).toBeGreaterThan(thin);
    });
  });

  describe("getDeratingSummary", () => {
    it("returns complete derating summary", () => {
      const summary = wedmThinWireDerateEngine.getDeratingSummary(0.12);

      expect(summary.category).toBe("thin");
      expect(summary.current_factor).toBeLessThan(1);
      expect(summary.ton_factor).toBeLessThan(1);
      expect(summary.combined_mrr_factor).toBe(
        Math.round(summary.current_factor * summary.ton_factor * 1000) / 1000
      );
      expect(summary.tension_range).toBeDefined();
    });
  });

  describe("configuration", () => {
    it("can update configuration", () => {
      const engine = new WEDMThinWireDerateEngine();
      engine.configure({ thin_threshold_mm: 0.18 });
      expect(engine.getConfig().thin_threshold_mm).toBe(0.18);
    });
  });
});
