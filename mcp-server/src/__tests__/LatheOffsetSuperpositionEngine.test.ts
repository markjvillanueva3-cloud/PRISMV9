/**
 * LatheOffsetSuperpositionEngine tests — U-LPT01.
 *
 * Coverage:
 *  - identity (zero/disabled inputs → zero output)
 *  - per-component isolation via disable_components
 *  - VB resolution: measured > linearised Taylor > no_data
 *  - sign convention (additive components)
 *  - safety cap (50μm) trips warning + flag
 *  - warmup recommendation threshold (25μm)
 *  - lead-angle projection edge cases (0°, 90°, 95°, 180°)
 *  - structured input validation (negative VB, infinite geometric, zero VB_max)
 *  - end-of-life wear ratio (>=95%) warning
 *  - delta_total_mm convenience matches delta_total_um / 1000
 *  - uncertainty propagation (RSS of independent components)
 */

import { describe, it, expect } from "vitest";
import {
  latheOffsetSuperpositionEngine,
  type OffsetSuperpositionInput,
} from "../engines/LatheOffsetSuperpositionEngine.js";

const baseInput: OffsetSuperpositionInput = {
  tool_wear: {},
  operation: { spindle_speed_rpm: 2000, cutting_time_min: 30 },
  tool_geometry: { overhang_mm: 25, tool_material: "carbide" },
  workpiece: { material: "steel", length_mm: 100 },
  machine: { bearing_type: "angular_contact", coolant_active: true },
};

describe("LatheOffsetSuperpositionEngine — U-LPT01", () => {
  describe("identity", () => {
    it("returns zero δ_total when every component is disabled", () => {
      const r = latheOffsetSuperpositionEngine.calculate({
        ...baseInput,
        disable_components: [
          "wear",
          "spindle_thermal",
          "part_thermal",
          "geometric",
        ],
      });
      expect(r.delta_total_um.value).toBe(0);
      expect(r.delta_total_mm.value).toBe(0);
      expect(r.is_within_safety_cap).toBe(true);
      expect(r.breakdown.delta_wear_um.source).toBe("disabled");
      expect(r.breakdown.delta_thermal_spindle_um.source).toBe("disabled");
      expect(r.breakdown.delta_thermal_part_um.source).toBe("disabled");
      expect(r.breakdown.delta_geometric_um.source).toBe("disabled");
    });

    it("returns no_wear_data when wear inputs are absent and not disabled", () => {
      const r = latheOffsetSuperpositionEngine.calculate({
        ...baseInput,
        disable_components: ["spindle_thermal", "part_thermal", "geometric"],
      });
      expect(r.breakdown.delta_wear_um.value).toBe(0);
      expect(r.breakdown.delta_wear_um.source).toBe("no_wear_data");
      expect(r.breakdown.delta_wear_um.warning).toMatch(/missing/);
      expect(r.warnings.some((w) => /missing/.test(w))).toBe(true);
    });
  });

  describe("wear component", () => {
    it("uses measured vb_current_mm when supplied", () => {
      const r = latheOffsetSuperpositionEngine.calculate({
        ...baseInput,
        tool_wear: {
          vb_current_mm: 0.2,
          side_cutting_edge_angle_deg: 90,
        },
        disable_components: ["spindle_thermal", "part_thermal", "geometric"],
      });
      // 0.2 mm × sin(90°) = 0.2 mm = 200 μm
      expect(r.breakdown.delta_wear_um.value).toBeCloseTo(200, 0);
      expect(r.breakdown.delta_wear_um.source).toMatch(/measured_vb/);
    });

    it("linearises Taylor when only cumulative_time and expected_life given", () => {
      const r = latheOffsetSuperpositionEngine.calculate({
        ...baseInput,
        tool_wear: {
          cumulative_cutting_time_min: 30,
          expected_tool_life_min: 60,
          vb_max_mm: 0.3,
          side_cutting_edge_angle_deg: 90,
        },
        disable_components: ["spindle_thermal", "part_thermal", "geometric"],
      });
      // ratio = 0.5, VB = 0.15 mm, sin(90°)=1 → 150 μm
      expect(r.breakdown.delta_wear_um.value).toBeCloseTo(150, 0);
      expect(r.breakdown.delta_wear_um.source).toMatch(/linearised_taylor/);
      expect(r.breakdown.delta_wear_um.source).toMatch(/0\.500/);
    });

    it("clamps wear ratio to [0, 1] when cumulative > expected_life", () => {
      const r = latheOffsetSuperpositionEngine.calculate({
        ...baseInput,
        tool_wear: {
          cumulative_cutting_time_min: 200,
          expected_tool_life_min: 60,
          vb_max_mm: 0.3,
          side_cutting_edge_angle_deg: 90,
        },
        disable_components: ["spindle_thermal", "part_thermal", "geometric"],
      });
      expect(r.breakdown.delta_wear_um.value).toBeCloseTo(300, 0); // VB_max × sin(90)
    });

    it("emits end-of-life warning when wear ratio ≥ 95%", () => {
      const r = latheOffsetSuperpositionEngine.calculate({
        ...baseInput,
        tool_wear: {
          cumulative_cutting_time_min: 58,
          expected_tool_life_min: 60,
        },
        disable_components: ["spindle_thermal", "part_thermal", "geometric"],
      });
      expect(r.warnings.some((w) => /replace insert/i.test(w))).toBe(true);
    });

    it("applies sin(κr) projection — 95° lead", () => {
      const r = latheOffsetSuperpositionEngine.calculate({
        ...baseInput,
        tool_wear: { vb_current_mm: 0.1, side_cutting_edge_angle_deg: 95 },
        disable_components: ["spindle_thermal", "part_thermal", "geometric"],
      });
      // 0.1 mm × |sin(95°)| ≈ 0.1 × 0.9962 ≈ 99.62 μm
      expect(r.breakdown.delta_wear_um.value).toBeCloseTo(99.62, 1);
    });

    it("zero radial projection at κr = 0° (axial-only cut, edge case)", () => {
      const r = latheOffsetSuperpositionEngine.calculate({
        ...baseInput,
        tool_wear: { vb_current_mm: 0.1, side_cutting_edge_angle_deg: 0 },
        disable_components: ["spindle_thermal", "part_thermal", "geometric"],
      });
      expect(r.breakdown.delta_wear_um.value).toBeCloseTo(0, 1);
    });

    it("throws on negative VB", () => {
      expect(() =>
        latheOffsetSuperpositionEngine.calculate({
          ...baseInput,
          tool_wear: { vb_current_mm: -0.05 },
          disable_components: ["spindle_thermal", "part_thermal", "geometric"],
        }),
      ).toThrow(/negative VB/);
    });

    it("throws on zero or non-finite vb_max_mm", () => {
      expect(() =>
        latheOffsetSuperpositionEngine.calculate({
          ...baseInput,
          tool_wear: {
            cumulative_cutting_time_min: 10,
            expected_tool_life_min: 60,
            vb_max_mm: 0,
          },
          disable_components: ["spindle_thermal", "part_thermal", "geometric"],
        }),
      ).toThrow(/vb_max_mm must be positive/);
    });
  });

  describe("thermal components (delegated)", () => {
    it("populates spindle_chain and workpiece breakdown via ThermalGrowthCompensationEngine", () => {
      const r = latheOffsetSuperpositionEngine.calculate({
        ...baseInput,
        operation: { spindle_speed_rpm: 5000, cutting_time_min: 60 },
        tool_geometry: {
          overhang_mm: 50,
          holder_length_mm: 100,
          tool_material: "carbide",
        },
        workpiece: { material: "aluminum", length_mm: 200 },
        machine: { coolant_active: false, ambient_temp_C: 22 },
        disable_components: ["wear", "geometric"],
      });
      expect(r.breakdown.delta_thermal_spindle_um.source).toMatch(
        /spindle_chain/,
      );
      expect(r.breakdown.delta_thermal_part_um.source).toMatch(/workpiece/);
      // Aluminum + no coolant + long workpiece + 60min runtime → non-trivial expansion
      expect(r.breakdown.delta_thermal_part_um.value).toBeGreaterThan(0);
    });

    it("disables spindle thermal independently of part thermal", () => {
      const r = latheOffsetSuperpositionEngine.calculate({
        ...baseInput,
        operation: { spindle_speed_rpm: 5000, cutting_time_min: 60 },
        workpiece: { material: "aluminum", length_mm: 200 },
        disable_components: ["spindle_thermal", "wear", "geometric"],
      });
      expect(r.breakdown.delta_thermal_spindle_um.source).toBe("disabled");
      expect(r.breakdown.delta_thermal_part_um.source).not.toBe("disabled");
    });

    it("disables part thermal independently of spindle thermal", () => {
      const r = latheOffsetSuperpositionEngine.calculate({
        ...baseInput,
        disable_components: ["part_thermal", "wear", "geometric"],
      });
      expect(r.breakdown.delta_thermal_part_um.source).toBe("disabled");
      expect(r.breakdown.delta_thermal_spindle_um.source).not.toBe("disabled");
    });
  });

  describe("geometric component", () => {
    it("passes through user-supplied geometric_error_um", () => {
      const r = latheOffsetSuperpositionEngine.calculate({
        ...baseInput,
        geometric_error_um: 15,
        disable_components: ["wear", "spindle_thermal", "part_thermal"],
      });
      expect(r.breakdown.delta_geometric_um.value).toBe(15);
      expect(r.breakdown.delta_geometric_um.source).toMatch(
        /MachineGeometricAccuracyEngine/,
      );
      // 20% uncertainty
      expect(r.breakdown.delta_geometric_um.uncertainty).toBeCloseTo(3, 1);
    });

    it("defaults to 0 with default_zero source when omitted", () => {
      const r = latheOffsetSuperpositionEngine.calculate({
        ...baseInput,
        disable_components: ["wear", "spindle_thermal", "part_thermal"],
      });
      expect(r.breakdown.delta_geometric_um.value).toBe(0);
      expect(r.breakdown.delta_geometric_um.source).toBe("default_zero");
    });

    it("throws on non-finite geometric_error_um", () => {
      expect(() =>
        latheOffsetSuperpositionEngine.calculate({
          ...baseInput,
          geometric_error_um: Number.POSITIVE_INFINITY,
        }),
      ).toThrow(/finite/);
    });

    it("handles negative geometric error (signed) with absolute uncertainty", () => {
      const r = latheOffsetSuperpositionEngine.calculate({
        ...baseInput,
        geometric_error_um: -10,
        disable_components: ["wear", "spindle_thermal", "part_thermal"],
      });
      expect(r.breakdown.delta_geometric_um.value).toBe(-10);
      expect(r.breakdown.delta_geometric_um.uncertainty).toBeCloseTo(2, 1);
    });
  });

  describe("superposition + safety cap", () => {
    it("sums all four components into delta_total_um", () => {
      const r = latheOffsetSuperpositionEngine.calculate({
        ...baseInput,
        tool_wear: {
          vb_current_mm: 0.01, // 10 μm
          side_cutting_edge_angle_deg: 90,
        },
        geometric_error_um: 5,
      });
      const sum =
        r.breakdown.delta_wear_um.value +
        r.breakdown.delta_thermal_spindle_um.value +
        r.breakdown.delta_thermal_part_um.value +
        r.breakdown.delta_geometric_um.value;
      expect(r.delta_total_um.value).toBeCloseTo(sum, 1);
    });

    it("delta_total_mm is delta_total_um / 1000", () => {
      const r = latheOffsetSuperpositionEngine.calculate({
        ...baseInput,
        tool_wear: { vb_current_mm: 0.02, side_cutting_edge_angle_deg: 90 },
      });
      expect(r.delta_total_mm.value).toBeCloseTo(
        r.delta_total_um.value / 1000,
        4,
      );
    });

    it("flags is_within_safety_cap=false when |δ_total| > 50μm", () => {
      const r = latheOffsetSuperpositionEngine.calculate({
        ...baseInput,
        tool_wear: { vb_current_mm: 0.1, side_cutting_edge_angle_deg: 90 }, // 100 μm
        disable_components: ["spindle_thermal", "part_thermal", "geometric"],
      });
      expect(r.delta_total_um.value).toBeGreaterThan(50);
      expect(r.is_within_safety_cap).toBe(false);
      expect(r.safety_cap_um).toBe(50);
      expect(r.warnings.some((w) => /safety cap/.test(w))).toBe(true);
    });

    it("flags is_within_safety_cap=true when |δ_total| ≤ 50μm", () => {
      const r = latheOffsetSuperpositionEngine.calculate({
        ...baseInput,
        tool_wear: { vb_current_mm: 0.02, side_cutting_edge_angle_deg: 90 }, // 20 μm
        disable_components: ["spindle_thermal", "part_thermal", "geometric"],
      });
      expect(r.delta_total_um.value).toBeLessThanOrEqual(50);
      expect(r.is_within_safety_cap).toBe(true);
    });

    it("emits warmup recommendation when |δ_total| > 25μm with thermal active", () => {
      const r = latheOffsetSuperpositionEngine.calculate({
        ...baseInput,
        tool_wear: { vb_current_mm: 0.04, side_cutting_edge_angle_deg: 90 }, // 40 μm
        disable_components: ["part_thermal", "geometric"],
      });
      expect(
        r.recommendations.some((rec) => /warmup|tool change/i.test(rec)),
      ).toBe(true);
    });

    it("does not emit warmup recommendation when spindle_thermal is disabled", () => {
      const r = latheOffsetSuperpositionEngine.calculate({
        ...baseInput,
        tool_wear: { vb_current_mm: 0.04, side_cutting_edge_angle_deg: 90 },
        disable_components: ["spindle_thermal", "part_thermal", "geometric"],
      });
      expect(
        r.recommendations.some((rec) => /warmup|tool change/i.test(rec)),
      ).toBe(false);
    });

    it("propagates uncertainty as RSS of independent components", () => {
      const r = latheOffsetSuperpositionEngine.calculate({
        ...baseInput,
        tool_wear: { vb_current_mm: 0.02, side_cutting_edge_angle_deg: 90 },
        geometric_error_um: 10,
      });
      const expected = Math.sqrt(
        r.breakdown.delta_wear_um.uncertainty ** 2 +
          r.breakdown.delta_thermal_spindle_um.uncertainty ** 2 +
          r.breakdown.delta_thermal_part_um.uncertainty ** 2 +
          r.breakdown.delta_geometric_um.uncertainty ** 2,
      );
      expect(r.delta_total_um.uncertainty).toBeCloseTo(expected, 1);
    });
  });

  describe("provenance", () => {
    it("delta_total source is 'superposition'", () => {
      const r = latheOffsetSuperpositionEngine.calculate({
        ...baseInput,
        tool_wear: { vb_current_mm: 0.01 },
      });
      expect(r.delta_total_um.source).toBe("superposition");
      expect(r.delta_total_mm.source).toBe("superposition");
    });

    it("breakdown sources name their producing engines", () => {
      const r = latheOffsetSuperpositionEngine.calculate({
        ...baseInput,
        tool_wear: { vb_current_mm: 0.01, side_cutting_edge_angle_deg: 90 },
        geometric_error_um: 5,
      });
      expect(r.breakdown.delta_wear_um.source).toMatch(/flank_wear_radial/);
      expect(r.breakdown.delta_thermal_spindle_um.source).toMatch(
        /ThermalGrowthCompensationEngine/,
      );
      expect(r.breakdown.delta_thermal_part_um.source).toMatch(
        /ThermalGrowthCompensationEngine/,
      );
      expect(r.breakdown.delta_geometric_um.source).toMatch(
        /MachineGeometricAccuracyEngine/,
      );
    });
  });
});
