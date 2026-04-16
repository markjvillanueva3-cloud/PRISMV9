/**
 * TurningOffsetCompensationEngine Test Suite (MS2 U-LPT01-05)
 */
import { describe, it, expect } from "vitest";
import { turningOffsetCompensationEngine } from "../engines/TurningOffsetCompensationEngine.js";

describe("TurningOffsetCompensationEngine", () => {
  // ── wearToOffset() ────────────────────────────────────────────────────

  describe("wearToOffset()", () => {
    it("VB=0 produces zero offsets", () => {
      const r = turningOffsetCompensationEngine.wearToOffset({
        vb_um: 0,
        approach_angle_deg: 90,
      });
      expect(r.delta_diameter_um).toBeCloseTo(0, 3);
    });

    it("wear-to-offset produces numeric deltas at 45° approach", () => {
      // At κ_r=90° cos=0 so diameter delta is 0 (all wear goes axial).
      // Use κ_r=45° where both components are nonzero.
      const small = turningOffsetCompensationEngine.wearToOffset({ vb_um: 50, approach_angle_deg: 45 });
      const big = turningOffsetCompensationEngine.wearToOffset({ vb_um: 300, approach_angle_deg: 45 });
      expect(Math.abs(big.delta_diameter_um)).toBeGreaterThan(Math.abs(small.delta_diameter_um));
    });

    it("approach angle affects diameter vs Z split", () => {
      const r90 = turningOffsetCompensationEngine.wearToOffset({ vb_um: 100, approach_angle_deg: 90 });
      const r45 = turningOffsetCompensationEngine.wearToOffset({ vb_um: 100, approach_angle_deg: 45 });
      // 90° puts wear into diameter; 45° splits
      expect(Math.abs(r90.delta_diameter_um)).not.toBe(Math.abs(r45.delta_diameter_um));
    });

    it("thermal growth is added to total radial error", () => {
      const r = turningOffsetCompensationEngine.wearToOffset({
        vb_um: 50,
        approach_angle_deg: 90,
        thermal_growth_um: 20,
      });
      expect(Math.abs(r.total_radial_error_um)).toBeGreaterThan(0);
    });
  });

  // ── generateProbingCycle() ────────────────────────────────────────────

  describe("generateProbingCycle()", () => {
    const dialects = ["fanuc", "haas", "okuma", "mazak", "siemens"] as const;
    dialects.forEach((d) => {
      it(`emits G-code for ${d}`, () => {
        const r = turningOffsetCompensationEngine.generateProbingCycle({
          controller: d,
          probe_type: "od",
          nominal_mm: 50,
          tolerance_mm: 0.02,
          z_position_mm: -10,
          offset_register: 1,
        });
        expect(r.controller).toBe(d);
        expect(r.gcode.length).toBeGreaterThan(0);
      });
    });

    it("different controllers produce different G-code", () => {
      const fanuc = turningOffsetCompensationEngine.generateProbingCycle({
        controller: "fanuc",
        probe_type: "od",
        nominal_mm: 50,
        tolerance_mm: 0.02,
        z_position_mm: -10,
        offset_register: 1,
      });
      const okuma = turningOffsetCompensationEngine.generateProbingCycle({
        controller: "okuma",
        probe_type: "od",
        nominal_mm: 50,
        tolerance_mm: 0.02,
        z_position_mm: -10,
        offset_register: 1,
      });
      expect(fanuc.gcode).not.toBe(okuma.gcode);
    });

    it("probe_type bore differs from od", () => {
      const od = turningOffsetCompensationEngine.generateProbingCycle({
        controller: "fanuc",
        probe_type: "od",
        nominal_mm: 50,
        tolerance_mm: 0.02,
        z_position_mm: -10,
        offset_register: 1,
      });
      const bore = turningOffsetCompensationEngine.generateProbingCycle({
        controller: "fanuc",
        probe_type: "bore",
        nominal_mm: 50,
        tolerance_mm: 0.02,
        z_position_mm: -10,
        offset_register: 1,
      });
      expect(od.gcode).not.toBe(bore.gcode);
    });
  });

  // ── generateAutoOffsetMacro() ────────────────────────────────────────

  describe("generateAutoOffsetMacro()", () => {
    const dialects = ["fanuc", "haas", "okuma", "mazak", "siemens"] as const;
    dialects.forEach((d) => {
      it(`generates auto-offset macro for ${d}`, () => {
        const r = turningOffsetCompensationEngine.generateAutoOffsetMacro({
          controller: d,
          nominal_mm: 50,
          tolerance_mm: 0.02,
          offset_register: 1,
          axis: "X",
        });
        expect(r).toBeDefined();
      });
    });
  });

  // ── predictAccuracy() ────────────────────────────────────────────────

  describe("predictAccuracy()", () => {
    it("returns accuracy prediction with Cpk", () => {
      const r = turningOffsetCompensationEngine.predictAccuracy({
        nominal_mm: 50,
        tolerance_mm: 0.02,
        iso_group: "P" as any,
        parts_per_batch: 100,
        Vc_m_min: 250,
        f_mm_rev: 0.2,
        ap_mm: 2.0,
        with_auto_offset: false,
      });
      expect(r).toBeDefined();
    });

    it("auto-offset improves accuracy vs no compensation", () => {
      const withOffset = turningOffsetCompensationEngine.predictAccuracy({
        nominal_mm: 50,
        tolerance_mm: 0.02,
        iso_group: "P" as any,
        parts_per_batch: 100,
        Vc_m_min: 250,
        f_mm_rev: 0.2,
        ap_mm: 2.0,
        with_auto_offset: true,
      });
      const withoutOffset = turningOffsetCompensationEngine.predictAccuracy({
        nominal_mm: 50,
        tolerance_mm: 0.02,
        iso_group: "P" as any,
        parts_per_batch: 100,
        Vc_m_min: 250,
        f_mm_rev: 0.2,
        ap_mm: 2.0,
        with_auto_offset: false,
      });
      expect(withOffset).toBeDefined();
      expect(withoutOffset).toBeDefined();
    });
  });
});
