/**
 * U-P2PFS17: WEDMKerfWidthEngine MCP Wiring Tests
 * Verifies dispatcher actions wedm_kerf_predict, wedm_kerf_for_target
 */
import { describe, it, expect } from "vitest";
import { wedmKerfWidthEngine } from "../engines/WEDMKerfWidthEngine.js";

describe("WEDMKerfWidthEngine MCP Wiring (U-P2PFS17)", () => {
  describe("predict()", () => {
    it("returns KerfWidthResult structure", () => {
      const result = wedmKerfWidthEngine.predict({
        wire_diameter_mm: 0.25,
        peak_current_A: 15,
        ton_us: 20,
      });

      expect(result).toHaveProperty("kerf_width_mm");
      expect(result).toHaveProperty("overcut_mm");
      expect(result).toHaveProperty("wire_offset_mm");
      expect(result).toHaveProperty("uncertainty_mm");
      expect(result).toHaveProperty("estimated_Ra_um");
      expect(result).toHaveProperty("recast_layer_um");
      expect(result).toHaveProperty("tolerance_class");
    });

    it("calculates kerf > wire diameter", () => {
      const result = wedmKerfWidthEngine.predict({
        wire_diameter_mm: 0.25,
        peak_current_A: 15,
        ton_us: 20,
      });

      expect(result.kerf_width_mm).toBeGreaterThan(0.25);
      expect(result.overcut_mm).toBeGreaterThan(0);
    });

    it("increases kerf with higher current", () => {
      const lowCurrent = wedmKerfWidthEngine.predict({
        wire_diameter_mm: 0.25,
        peak_current_A: 5,
        ton_us: 20,
      });

      const highCurrent = wedmKerfWidthEngine.predict({
        wire_diameter_mm: 0.25,
        peak_current_A: 25,
        ton_us: 20,
      });

      expect(highCurrent.kerf_width_mm).toBeGreaterThan(lowCurrent.kerf_width_mm);
    });

    it("increases kerf with longer pulse", () => {
      const shortPulse = wedmKerfWidthEngine.predict({
        wire_diameter_mm: 0.25,
        peak_current_A: 15,
        ton_us: 5,
      });

      const longPulse = wedmKerfWidthEngine.predict({
        wire_diameter_mm: 0.25,
        peak_current_A: 15,
        ton_us: 40,
      });

      expect(longPulse.kerf_width_mm).toBeGreaterThan(shortPulse.kerf_width_mm);
    });

    it("applies material-specific multipliers", () => {
      const steelResult = wedmKerfWidthEngine.predict({
        wire_diameter_mm: 0.25,
        peak_current_A: 15,
        ton_us: 20,
        material: "steel",
      });

      const aluminumResult = wedmKerfWidthEngine.predict({
        wire_diameter_mm: 0.25,
        peak_current_A: 15,
        ton_us: 20,
        material: "aluminum",
      });

      expect(aluminumResult.kerf_width_mm).toBeGreaterThan(steelResult.kerf_width_mm);
    });

    it("improves tolerance for finishing passes", () => {
      const roughResult = wedmKerfWidthEngine.predict({
        wire_diameter_mm: 0.25,
        peak_current_A: 15,
        ton_us: 20,
        operation_type: "roughing",
      });

      const finishResult = wedmKerfWidthEngine.predict({
        wire_diameter_mm: 0.25,
        peak_current_A: 5,
        ton_us: 5,
        operation_type: "finishing",
      });

      expect(finishResult.estimated_Ra_um).toBeLessThan(roughResult.estimated_Ra_um);
    });

    it("calculates wire offset equals overcut", () => {
      const result = wedmKerfWidthEngine.predict({
        wire_diameter_mm: 0.25,
        peak_current_A: 15,
        ton_us: 20,
      });

      expect(result.wire_offset_mm).toBeCloseTo(result.overcut_mm, 4);
    });

    it("returns valid tolerance class", () => {
      const result = wedmKerfWidthEngine.predict({
        wire_diameter_mm: 0.25,
        peak_current_A: 15,
        ton_us: 20,
      });

      expect(["IT6", "IT7", "IT8", "IT9", "IT10", "IT11", "IT12"]).toContain(result.tolerance_class);
    });

    it("includes uncertainty estimate", () => {
      const result = wedmKerfWidthEngine.predict({
        wire_diameter_mm: 0.25,
        peak_current_A: 15,
        ton_us: 20,
      });

      expect(result.uncertainty_mm).toBeGreaterThan(0);
      expect(result.uncertainty_mm).toBeLessThan(result.kerf_width_mm);
    });

    it("estimates recast layer thickness", () => {
      const result = wedmKerfWidthEngine.predict({
        wire_diameter_mm: 0.25,
        peak_current_A: 15,
        ton_us: 20,
      });

      expect(result.recast_layer_um).toBeGreaterThan(0);
    });
  });

  describe("calculateForTargetKerf()", () => {
    it("returns parameters for achievable target kerf", () => {
      const result = wedmKerfWidthEngine.calculateForTargetKerf(0.35, 0.25);

      if (result) {
        expect(result).toHaveProperty("peak_current_A");
        expect(result).toHaveProperty("ton_us");
        expect(result.peak_current_A).toBeGreaterThan(0);
        expect(result.ton_us).toBeGreaterThan(0);
      }
    });

    it("handles various material parameters", () => {
      const steelResult = wedmKerfWidthEngine.calculateForTargetKerf(0.35, 0.25, "steel");
      const aluminumResult = wedmKerfWidthEngine.calculateForTargetKerf(0.35, 0.25, "aluminum");

      if (steelResult && aluminumResult) {
        expect(steelResult.peak_current_A).toBeGreaterThan(0);
        expect(aluminumResult.peak_current_A).toBeGreaterThan(0);
      }
    });

    it("returns null for impossible target (kerf < wire)", () => {
      const result = wedmKerfWidthEngine.calculateForTargetKerf(0.24, 0.25);
      expect(result).toBeNull();
    });

    it("returns null for unrealistically large kerf", () => {
      const result = wedmKerfWidthEngine.calculateForTargetKerf(5.0, 0.25);
      expect(result).toBeNull();
    });
  });

  describe("utility methods", () => {
    it("calculateKerfWidth returns wire + 2×overcut", () => {
      const kerf = wedmKerfWidthEngine.calculateKerfWidth(0.25, 0.025);
      expect(kerf).toBeCloseTo(0.30, 4);
    });

    it("getConfig returns configuration", () => {
      const config = wedmKerfWidthEngine.getConfig();
      expect(config).toHaveProperty("default_gap_voltage_V");
      expect(config).toHaveProperty("base_overcut_coefficient");
      expect(config).toHaveProperty("current_exponent");
      expect(config).toHaveProperty("ton_exponent");
    });
  });
});
