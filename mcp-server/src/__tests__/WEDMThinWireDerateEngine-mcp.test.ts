/**
 * U-P2PFS19: WEDMThinWireDerateEngine MCP Wiring Tests
 * Verifies dispatcher actions wedm_thin_wire_derate, wedm_thin_wire_safe_current, wedm_thin_wire_summary
 */
import { describe, it, expect } from "vitest";
import { wedmThinWireDerateEngine } from "../engines/WEDMThinWireDerateEngine.js";

describe("WEDMThinWireDerateEngine MCP Wiring (U-P2PFS19)", () => {
  describe("derate()", () => {
    it("returns ThinWireDerateResult structure", () => {
      const result = wedmThinWireDerateEngine.derate({
        wire_diameter_mm: 0.15,
        proposed_current_A: 15,
        proposed_ton_us: 20,
      });

      expect(result).toHaveProperty("derated");
      expect(result).toHaveProperty("original_current_A");
      expect(result).toHaveProperty("derated_current_A");
      expect(result).toHaveProperty("original_ton_us");
      expect(result).toHaveProperty("derated_ton_us");
      expect(result).toHaveProperty("current_derate_factor");
      expect(result).toHaveProperty("ton_derate_factor");
      expect(result).toHaveProperty("wire_category");
      expect(result).toHaveProperty("productivity_impact_pct");
      expect(result).toHaveProperty("rationale");
    });

    it("does not derate standard wire (>=0.25mm)", () => {
      const result = wedmThinWireDerateEngine.derate({
        wire_diameter_mm: 0.25,
        proposed_current_A: 15,
        proposed_ton_us: 20,
      });

      expect(result.derated).toBe(false);
      expect(result.derated_current_A).toBe(result.original_current_A);
      expect(result.derated_ton_us).toBe(result.original_ton_us);
      expect(result.wire_category).toBe("standard");
    });

    it("derates thin wire (0.10-0.20mm)", () => {
      const result = wedmThinWireDerateEngine.derate({
        wire_diameter_mm: 0.15,
        proposed_current_A: 15,
        proposed_ton_us: 20,
      });

      expect(result.derated).toBe(true);
      expect(result.derated_current_A).toBeLessThan(result.original_current_A);
      expect(result.wire_category).toBe("thin");
    });

    it("derates ultra-thin wire more aggressively (0.05-0.10mm)", () => {
      const thinResult = wedmThinWireDerateEngine.derate({
        wire_diameter_mm: 0.15,
        proposed_current_A: 15,
        proposed_ton_us: 20,
      });

      const ultraThinResult = wedmThinWireDerateEngine.derate({
        wire_diameter_mm: 0.08,
        proposed_current_A: 15,
        proposed_ton_us: 20,
      });

      expect(ultraThinResult.wire_category).toBe("ultra_thin");
      expect(ultraThinResult.current_derate_factor).toBeLessThan(thinResult.current_derate_factor);
    });

    it("categorizes micro wire (<0.05mm)", () => {
      const result = wedmThinWireDerateEngine.derate({
        wire_diameter_mm: 0.03,
        proposed_current_A: 15,
        proposed_ton_us: 20,
      });

      expect(result.wire_category).toBe("micro");
      expect(result.warning).toContain("Micro wire");
    });

    it("considers wire material thermal factor", () => {
      const brassResult = wedmThinWireDerateEngine.derate({
        wire_diameter_mm: 0.15,
        proposed_current_A: 15,
        proposed_ton_us: 20,
        wire_material: "brass",
      });

      const molyResult = wedmThinWireDerateEngine.derate({
        wire_diameter_mm: 0.15,
        proposed_current_A: 15,
        proposed_ton_us: 20,
        wire_material: "molybdenum",
      });

      // Molybdenum has higher thermal capacity, so less derating
      expect(molyResult.derated_current_A).toBeGreaterThan(brassResult.derated_current_A);
    });

    it("provides tension recommendation for wire category", () => {
      const result = wedmThinWireDerateEngine.derate({
        wire_diameter_mm: 0.15,
        proposed_current_A: 15,
        proposed_ton_us: 20,
      });

      expect(result.tension_recommendation).toBeDefined();
      expect(result.tension_recommendation!.min_N).toBeGreaterThan(0);
      expect(result.tension_recommendation!.max_N).toBeGreaterThan(result.tension_recommendation!.min_N);
    });

    it("warns if proposed tension is outside recommended range", () => {
      const result = wedmThinWireDerateEngine.derate({
        wire_diameter_mm: 0.15,
        proposed_current_A: 15,
        proposed_ton_us: 20,
        proposed_tension_N: 20, // Too high for thin wire
      });

      expect(result.warning).toContain("outside recommended range");
    });

    it("calculates productivity impact", () => {
      const result = wedmThinWireDerateEngine.derate({
        wire_diameter_mm: 0.10,
        proposed_current_A: 15,
        proposed_ton_us: 20,
      });

      expect(result.productivity_impact_pct).toBeGreaterThan(0);
      expect(result.productivity_impact_pct).toBeLessThan(100);
    });

    it("enforces minimum current", () => {
      const result = wedmThinWireDerateEngine.derate({
        wire_diameter_mm: 0.03,
        proposed_current_A: 0.3, // Very low
        proposed_ton_us: 20,
      });

      expect(result.derated_current_A).toBeGreaterThanOrEqual(0.5); // min_current_A
    });

    it("throws on invalid wire diameter", () => {
      expect(() => {
        wedmThinWireDerateEngine.derate({
          wire_diameter_mm: 0,
          proposed_current_A: 15,
          proposed_ton_us: 20,
        });
      }).toThrow("Wire diameter must be positive");
    });
  });

  describe("calculateMaxSafeCurrent()", () => {
    it("returns safe current limit", () => {
      const result = wedmThinWireDerateEngine.calculateMaxSafeCurrent(0.15, 20);

      expect(typeof result).toBe("number");
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThan(20);
    });

    it("returns full current for standard wire", () => {
      const result = wedmThinWireDerateEngine.calculateMaxSafeCurrent(0.25, 20);

      expect(result).toBe(20);
    });

    it("returns lower current for thinner wire", () => {
      const thin = wedmThinWireDerateEngine.calculateMaxSafeCurrent(0.15, 20);
      const ultraThin = wedmThinWireDerateEngine.calculateMaxSafeCurrent(0.08, 20);

      expect(ultraThin).toBeLessThan(thin);
    });

    it("considers wire material", () => {
      const brass = wedmThinWireDerateEngine.calculateMaxSafeCurrent(0.15, 20, "brass");
      const moly = wedmThinWireDerateEngine.calculateMaxSafeCurrent(0.15, 20, "molybdenum");

      expect(moly).toBeGreaterThan(brass);
    });
  });

  describe("getDeratingSummary()", () => {
    it("returns summary structure", () => {
      const result = wedmThinWireDerateEngine.getDeratingSummary(0.15);

      expect(result).toHaveProperty("category");
      expect(result).toHaveProperty("current_factor");
      expect(result).toHaveProperty("ton_factor");
      expect(result).toHaveProperty("combined_mrr_factor");
      expect(result).toHaveProperty("tension_range");
    });

    it("returns correct category", () => {
      const standard = wedmThinWireDerateEngine.getDeratingSummary(0.25);
      const thin = wedmThinWireDerateEngine.getDeratingSummary(0.15);
      const ultraThin = wedmThinWireDerateEngine.getDeratingSummary(0.08);
      const micro = wedmThinWireDerateEngine.getDeratingSummary(0.03);

      expect(standard.category).toBe("standard");
      expect(thin.category).toBe("thin");
      expect(ultraThin.category).toBe("ultra_thin");
      expect(micro.category).toBe("micro");
    });

    it("returns combined MRR factor", () => {
      const result = wedmThinWireDerateEngine.getDeratingSummary(0.15);

      expect(result.combined_mrr_factor).toBeCloseTo(
        result.current_factor * result.ton_factor,
        3
      );
    });

    it("returns appropriate tension range for category", () => {
      const thin = wedmThinWireDerateEngine.getDeratingSummary(0.15);
      const standard = wedmThinWireDerateEngine.getDeratingSummary(0.25);

      expect(thin.tension_range.max).toBeLessThan(standard.tension_range.max);
    });
  });

  describe("utility methods", () => {
    it("getConfig returns configuration", () => {
      const config = wedmThinWireDerateEngine.getConfig();

      expect(config).toHaveProperty("reference_diameter_mm");
      expect(config).toHaveProperty("thin_threshold_mm");
      expect(config).toHaveProperty("ultra_thin_threshold_mm");
      expect(config).toHaveProperty("micro_threshold_mm");
      expect(config).toHaveProperty("current_derate_exponent");
      expect(config).toHaveProperty("ton_derate_exponent");
    });

    it("categorizeWire returns correct category", () => {
      expect(wedmThinWireDerateEngine.categorizeWire(0.25)).toBe("standard");
      expect(wedmThinWireDerateEngine.categorizeWire(0.15)).toBe("thin");
      expect(wedmThinWireDerateEngine.categorizeWire(0.08)).toBe("ultra_thin");
      expect(wedmThinWireDerateEngine.categorizeWire(0.03)).toBe("micro");
    });
  });
});
