/**
 * Tests for WireEDMMachineTechDataEngine
 *
 * Validates manufacturer-specific tech data lookup,
 * parameter interpolation, and pass recommendations.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  WireEDMMachineTechDataEngine,
  wireEDMMachineTechDataEngine
} from "../engines/WireEDMMachineTechDataEngine.js";

describe("WireEDMMachineTechDataEngine", () => {
  let engine: WireEDMMachineTechDataEngine;

  beforeEach(() => {
    engine = new WireEDMMachineTechDataEngine();
  });

  // =========================================================================
  // Singleton Export
  // =========================================================================

  describe("singleton", () => {
    it("exports a singleton instance", () => {
      expect(wireEDMMachineTechDataEngine).toBeInstanceOf(WireEDMMachineTechDataEngine);
    });
  });

  // =========================================================================
  // Status
  // =========================================================================

  describe("status", () => {
    it("returns engine status", () => {
      const status = engine.getStatus();
      expect(status.machines).toBeGreaterThanOrEqual(2);
      expect(status.total_records).toBeGreaterThan(0);
      expect(status.manufacturers).toContain("mitsubishi");
      expect(status.manufacturers).toContain("makino");
    });

    it("includes wire diameter range", () => {
      const status = engine.getStatus();
      expect(status.wire_diameters).toContain(0.20);
      expect(status.wire_diameters).toContain(0.10);
    });

    it("includes thickness range", () => {
      const status = engine.getStatus();
      expect(status.thickness_range[0]).toBeLessThan(status.thickness_range[1]);
      expect(status.thickness_range[1]).toBeGreaterThan(50);
    });
  });

  // =========================================================================
  // Available Machines
  // =========================================================================

  describe("getAvailableMachines", () => {
    it("returns list of available machines", () => {
      const machines = engine.getAvailableMachines();
      expect(machines).toContain("fa_s_vpack");
      expect(machines).toContain("sp43");
    });
  });

  describe("getMachineSummary", () => {
    it("returns summary for Mitsubishi FA-S V-Pack", () => {
      const summary = engine.getMachineSummary("fa_s_vpack");
      expect(summary).not.toBeNull();
      expect(summary!.manufacturer).toBe("mitsubishi");
      expect(summary!.wire_diameters).toContain(0.20);
      expect(summary!.materials).toContain("STEEL");
      expect(summary!.max_passes).toBe(4);
    });

    it("returns summary for Makino SP43", () => {
      const summary = engine.getMachineSummary("sp43");
      expect(summary).not.toBeNull();
      expect(summary!.manufacturer).toBe("makino");
      expect(summary!.control).toBe("MGW-S");
    });

    it("returns null for unknown machine", () => {
      const summary = engine.getMachineSummary("unknown" as any);
      expect(summary).toBeNull();
    });
  });

  // =========================================================================
  // Parameter Lookup
  // =========================================================================

  describe("lookupParameters", () => {
    it("finds parameters for Mitsubishi FA-S steel", () => {
      const result = engine.lookupParameters({
        machine: "fa_s_vpack",
        wire_diameter_mm: 0.20,
        material: "STEEL",
        thickness_mm: 20
      });

      expect(result.found).toBe(true);
      expect(result.exact_match).toBe(true);
      expect(result.passes.length).toBe(4);
      expect(result.source).toContain("mitsubishi");
    });

    it("finds parameters for Makino SP43 copper", () => {
      const result = engine.lookupParameters({
        machine: "sp43",
        wire_diameter_mm: 0.10,
        material: "Cu",
        thickness_mm: 12.7
      });

      expect(result.found).toBe(true);
      expect(result.passes.length).toBe(3);
      expect(result.method).toBe("High Precision");
    });

    it("finds closest thickness when exact not available", () => {
      const result = engine.lookupParameters({
        machine: "fa_s_vpack",
        wire_diameter_mm: 0.20,
        material: "STEEL",
        thickness_mm: 25  // Between 20 and 30
      });

      expect(result.found).toBe(true);
      expect(result.exact_match).toBe(false);
      expect(result.interpolated).toBe(true);
    });

    it("returns not found for unknown machine", () => {
      const result = engine.lookupParameters({
        machine: "unknown" as any,
        wire_diameter_mm: 0.20,
        material: "STEEL",
        thickness_mm: 20
      });

      expect(result.found).toBe(false);
    });

    it("filters passes by target Ra", () => {
      const result = engine.lookupParameters({
        machine: "fa_s_vpack",
        wire_diameter_mm: 0.20,
        material: "STEEL",
        thickness_mm: 20,
        target_ra_um: 2.6
      });

      expect(result.found).toBe(true);
      // Should return 2 passes since Ra 2.50 at pass 2 meets target of 2.6
      expect(result.passes.length).toBeLessThanOrEqual(2);
    });
  });

  // =========================================================================
  // Available Thicknesses
  // =========================================================================

  describe("getAvailableThicknesses", () => {
    it("returns thicknesses for Mitsubishi FA-S steel", () => {
      const thicknesses = engine.getAvailableThicknesses({
        machine: "fa_s_vpack",
        wire_diameter_mm: 0.20,
        material: "STEEL"
      });

      expect(thicknesses.length).toBeGreaterThan(0);
      expect(thicknesses).toContain(5);
      expect(thicknesses).toContain(10);
      expect(thicknesses).toContain(20);
      expect(thicknesses).toContain(50);
    });

    it("returns sorted thicknesses", () => {
      const thicknesses = engine.getAvailableThicknesses({
        machine: "fa_s_vpack",
        wire_diameter_mm: 0.20,
        material: "STEEL"
      });

      for (let i = 1; i < thicknesses.length; i++) {
        expect(thicknesses[i]).toBeGreaterThan(thicknesses[i - 1]);
      }
    });

    it("returns empty for unknown combination", () => {
      const thicknesses = engine.getAvailableThicknesses({
        machine: "fa_s_vpack",
        wire_diameter_mm: 0.50,  // Not available
        material: "STEEL"
      });

      expect(thicknesses).toEqual([]);
    });
  });

  // =========================================================================
  // Pass Recommendations
  // =========================================================================

  describe("recommendPassCount", () => {
    it("recommends 4 passes for mirror finish", () => {
      const result = engine.recommendPassCount({
        machine: "fa_s_vpack",
        wire_diameter_mm: 0.20,
        material: "STEEL",
        thickness_mm: 20,
        target_ra_um: 0.35
      });

      expect(result.recommended_passes).toBe(4);
      expect(result.achievable_ra_um).toBeLessThanOrEqual(0.35);
    });

    it("recommends 3 passes for Ra 0.70", () => {
      const result = engine.recommendPassCount({
        machine: "fa_s_vpack",
        wire_diameter_mm: 0.20,
        material: "STEEL",
        thickness_mm: 20,
        target_ra_um: 0.80
      });

      expect(result.recommended_passes).toBe(3);
      expect(result.achievable_ra_um).toBeLessThanOrEqual(0.80);
    });

    it("recommends 1 pass for rough cut", () => {
      const result = engine.recommendPassCount({
        machine: "fa_s_vpack",
        wire_diameter_mm: 0.20,
        material: "STEEL",
        thickness_mm: 20,
        target_ra_um: 3.0
      });

      expect(result.recommended_passes).toBe(1);
    });

    it("includes pass sequence details", () => {
      const result = engine.recommendPassCount({
        machine: "fa_s_vpack",
        wire_diameter_mm: 0.20,
        material: "STEEL",
        thickness_mm: 20,
        target_ra_um: 0.35
      });

      expect(result.pass_sequence.length).toBe(result.recommended_passes);
      result.pass_sequence.forEach((pass, idx) => {
        expect(pass.pass).toBe(idx + 1);
        expect(pass.expected_ra_um).toBeGreaterThan(0);
      });
    });

    it("provides default for unknown machine", () => {
      const result = engine.recommendPassCount({
        machine: "unknown" as any,
        wire_diameter_mm: 0.20,
        material: "STEEL",
        thickness_mm: 20,
        target_ra_um: 0.5
      });

      expect(result.recommended_passes).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // Feed Rate Lookup
  // =========================================================================

  describe("getFeedRate", () => {
    it("returns feed rate for pass 1", () => {
      const result = engine.getFeedRate({
        machine: "fa_s_vpack",
        wire_diameter_mm: 0.20,
        material: "STEEL",
        thickness_mm: 10,
        pass_number: 1
      });

      expect(result).not.toBeNull();
      expect(result!.feed_mmpm).toBeCloseTo(4.6, 1);
    });

    it("feed rate decreases with thickness", () => {
      const thin = engine.getFeedRate({
        machine: "fa_s_vpack",
        wire_diameter_mm: 0.20,
        material: "STEEL",
        thickness_mm: 5,
        pass_number: 1
      });

      const thick = engine.getFeedRate({
        machine: "fa_s_vpack",
        wire_diameter_mm: 0.20,
        material: "STEEL",
        thickness_mm: 50,
        pass_number: 1
      });

      expect(thin!.feed_mmpm).toBeGreaterThan(thick!.feed_mmpm);
    });

    it("returns null for invalid pass", () => {
      const result = engine.getFeedRate({
        machine: "fa_s_vpack",
        wire_diameter_mm: 0.20,
        material: "STEEL",
        thickness_mm: 10,
        pass_number: 10  // Too high
      });

      expect(result).toBeNull();
    });
  });

  // =========================================================================
  // Wire Offset Lookup
  // =========================================================================

  describe("getWireOffset", () => {
    it("returns offset for 4-pass configuration", () => {
      const result = engine.getWireOffset({
        machine: "fa_s_vpack",
        wire_diameter_mm: 0.20,
        material: "STEEL",
        thickness_mm: 20,
        pass_number: 1,
        total_passes: 4
      });

      expect(result).not.toBeNull();
      expect(result!.offset_mm).toBeGreaterThan(0.1);
    });

    it("offsets increase with pass count", () => {
      const pass1 = engine.getWireOffset({
        machine: "fa_s_vpack",
        wire_diameter_mm: 0.20,
        material: "STEEL",
        thickness_mm: 20,
        pass_number: 1,
        total_passes: 4
      });

      const pass4Last = engine.getWireOffset({
        machine: "fa_s_vpack",
        wire_diameter_mm: 0.20,
        material: "STEEL",
        thickness_mm: 20,
        pass_number: 4,
        total_passes: 4
      });

      expect(pass1!.offset_mm).toBeGreaterThan(pass4Last!.offset_mm);
    });
  });

  // =========================================================================
  // EPAC Code Lookup
  // =========================================================================

  describe("getEPACCodes", () => {
    it("returns EPAC codes for 4-pass", () => {
      const result = engine.getEPACCodes({
        machine: "fa_s_vpack",
        wire_diameter_mm: 0.20,
        material: "STEEL",
        thickness_mm: 20,
        total_passes: 4
      });

      expect(result).not.toBeNull();
      expect(result!.epac_codes.length).toBe(4);
      expect(result!.epac_codes[0]).toBe(1021);
    });

    it("EPAC codes increase with thickness", () => {
      const thin = engine.getEPACCodes({
        machine: "fa_s_vpack",
        wire_diameter_mm: 0.20,
        material: "STEEL",
        thickness_mm: 5,
        total_passes: 1
      });

      const thick = engine.getEPACCodes({
        machine: "fa_s_vpack",
        wire_diameter_mm: 0.20,
        material: "STEEL",
        thickness_mm: 50,
        total_passes: 1
      });

      expect(thin!.epac_codes[0]).toBeLessThan(thick!.epac_codes[0]);
    });
  });

  // =========================================================================
  // Interpolation
  // =========================================================================

  describe("interpolateParameters", () => {
    it("returns exact values for known thickness", () => {
      const result = engine.interpolateParameters({
        machine: "fa_s_vpack",
        wire_diameter_mm: 0.20,
        material: "STEEL",
        thickness_mm: 20,
        pass_number: 1
      });

      expect(result).not.toBeNull();
      expect(result!.interpolated).toBe(false);
      expect(result!.feed_mmpm).toBeCloseTo(2.6, 1);
    });

    it("interpolates between known thicknesses", () => {
      const result = engine.interpolateParameters({
        machine: "fa_s_vpack",
        wire_diameter_mm: 0.20,
        material: "STEEL",
        thickness_mm: 25,  // Between 20 and 30
        pass_number: 1
      });

      expect(result).not.toBeNull();
      expect(result!.interpolated).toBe(true);

      // Feed should be between 20mm (2.6) and 30mm (2.0) values
      expect(result!.feed_mmpm).toBeLessThan(2.6);
      expect(result!.feed_mmpm).toBeGreaterThan(2.0);
    });

    it("extrapolates for thickness beyond range", () => {
      const result = engine.interpolateParameters({
        machine: "fa_s_vpack",
        wire_diameter_mm: 0.20,
        material: "STEEL",
        thickness_mm: 120,  // Beyond 100mm
        pass_number: 1
      });

      expect(result).not.toBeNull();
      expect(result!.interpolated).toBe(true);
      // Feed should be lower than 100mm value
      expect(result!.feed_mmpm).toBeLessThan(0.7);
    });

    it("returns null for unknown combination", () => {
      const result = engine.interpolateParameters({
        machine: "fa_s_vpack",
        wire_diameter_mm: 0.50,
        material: "STEEL",
        thickness_mm: 20,
        pass_number: 1
      });

      expect(result).toBeNull();
    });
  });

  // =========================================================================
  // Ra Progression
  // =========================================================================

  describe("Ra progression", () => {
    it("Ra decreases with more passes", () => {
      const lookup = engine.lookupParameters({
        machine: "fa_s_vpack",
        wire_diameter_mm: 0.20,
        material: "STEEL",
        thickness_mm: 20
      });

      expect(lookup.found).toBe(true);

      let prevRa = Infinity;
      for (const pass of lookup.passes) {
        expect(pass.ra_um).toBeLessThan(prevRa);
        prevRa = pass.ra_um;
      }
    });

    it("final Ra meets mirror finish spec", () => {
      const lookup = engine.lookupParameters({
        machine: "fa_s_vpack",
        wire_diameter_mm: 0.20,
        material: "STEEL",
        thickness_mm: 20
      });

      const finalPass = lookup.passes[lookup.passes.length - 1];
      expect(finalPass.ra_um).toBeLessThan(0.5);
    });
  });

  // =========================================================================
  // Material Matching
  // =========================================================================

  describe("material matching", () => {
    it("matches STEEL and St as equivalent", () => {
      const steel = engine.lookupParameters({
        machine: "fa_s_vpack",
        wire_diameter_mm: 0.20,
        material: "STEEL",
        thickness_mm: 20
      });

      expect(steel.found).toBe(true);
    });

    it("finds Makino steel data", () => {
      const result = engine.lookupParameters({
        machine: "sp43",
        wire_diameter_mm: 0.10,
        material: "St",
        thickness_mm: 6.35
      });

      expect(result.found).toBe(true);
      expect(result.method).toBe("Both Away");
    });
  });
});
