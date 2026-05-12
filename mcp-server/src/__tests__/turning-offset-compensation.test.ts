/**
 * LATHE-PRO-MS2, U-LPT01..U-LPT05
 * TurningOffsetCompensationEngine Tests
 *
 * Validates:
 * - Wear-to-offset geometry (VB → ΔD, ΔZ)
 * - Probing cycle generation for 5 controllers
 * - Auto-offset macro with safety limits
 * - Accuracy prediction with/without compensation
 * - Cpk prediction improvement from auto-offset
 */

import { describe, it, expect } from "vitest";
import { turningOffsetCompensationEngine } from "../engines/TurningOffsetCompensationEngine.js";

// ── U-LPT01: Wear-to-Offset ───────────────────────────────────────────────

describe("Offset Compensation — Wear-to-Offset (U-LPT01)", () => {
  it("computes diameter growth from flank wear at 90° approach", () => {
    const result = turningOffsetCompensationEngine.wearToOffset({
      vb_um: 300, approach_angle_deg: 90,
    });
    // ΔD = 2 × 0.3 × cos(90°) = 0 (perpendicular approach — Z only)
    expect(result.delta_diameter_um).toBeCloseTo(0, 0);
    expect(result.delta_z_um).toBeGreaterThan(0);
  });

  it("computes diameter growth at 45° approach angle", () => {
    const result = turningOffsetCompensationEngine.wearToOffset({
      vb_um: 200, approach_angle_deg: 45,
    });
    // ΔD = 2 × 0.2 × cos(45°) = 2 × 0.2 × 0.707 ≈ 0.283 mm = 283 µm
    expect(result.delta_diameter_um).toBeCloseTo(283, 0);
  });

  it("computes diameter growth at 95° approach (typical OD turning)", () => {
    const result = turningOffsetCompensationEngine.wearToOffset({
      vb_um: 200, approach_angle_deg: 95,
    });
    // cos(95°) is slightly negative — small negative ΔD (realistic for 95°)
    expect(Math.abs(result.delta_diameter_um)).toBeLessThan(50);
  });

  it("offset adjustments are negative (compensating oversize)", () => {
    const result = turningOffsetCompensationEngine.wearToOffset({
      vb_um: 150, approach_angle_deg: 75,
    });
    // X offset should be negative to tighten
    if (result.delta_diameter_um > 0) {
      expect(result.x_offset_adj_um).toBeLessThan(0);
    }
  });

  it("includes thermal growth in total error", () => {
    const withThermal = turningOffsetCompensationEngine.wearToOffset({
      vb_um: 100, approach_angle_deg: 75, thermal_growth_um: 20,
    });
    const withoutThermal = turningOffsetCompensationEngine.wearToOffset({
      vb_um: 100, approach_angle_deg: 75,
    });
    expect(withThermal.total_radial_error_um).toBeGreaterThan(withoutThermal.total_radial_error_um);
  });

  it("zero wear produces zero offset", () => {
    const result = turningOffsetCompensationEngine.wearToOffset({
      vb_um: 0, approach_angle_deg: 90,
    });
    expect(result.delta_diameter_um).toBe(0);
    expect(result.delta_z_um).toBe(0);
  });
});

// ── U-LPT02: Probing Cycles ───────────────────────────────────────────────

describe("Offset Compensation — Probing Cycles (U-LPT02)", () => {
  const controllers: Array<"fanuc" | "okuma" | "haas" | "mazak" | "siemens"> = [
    "fanuc", "okuma", "haas", "mazak", "siemens",
  ];

  for (const ctrl of controllers) {
    it(`${ctrl}: generates OD probing cycle`, () => {
      const result = turningOffsetCompensationEngine.generateProbingCycle({
        controller: ctrl, probe_type: "od",
        nominal_mm: 45.0, tolerance_mm: 0.025,
        z_position_mm: -30.0, offset_register: 1,
      });
      expect(result.gcode.length).toBeGreaterThan(20);
      expect(result.controller).toBe(ctrl);
      expect(result.gcode).toContain("45.000");
    });
  }

  it("bore probing generates different G-code than OD", () => {
    const od = turningOffsetCompensationEngine.generateProbingCycle({
      controller: "fanuc", probe_type: "od",
      nominal_mm: 50.0, tolerance_mm: 0.02, z_position_mm: -20.0, offset_register: 1,
    });
    const bore = turningOffsetCompensationEngine.generateProbingCycle({
      controller: "fanuc", probe_type: "bore",
      nominal_mm: 30.0, tolerance_mm: 0.02, z_position_mm: -20.0, offset_register: 2,
    });
    expect(od.gcode).not.toBe(bore.gcode);
  });
});

// ── U-LPT03: Auto-Offset Macro ────────────────────────────────────────────

describe("Offset Compensation — Auto-Offset Macro (U-LPT03)", () => {
  it("fanuc macro includes safety limit check", () => {
    const result = turningOffsetCompensationEngine.generateAutoOffsetMacro({
      controller: "fanuc", nominal_mm: 45.0, tolerance_mm: 0.025,
      offset_register: 1, axis: "X",
    });
    expect(result.macro_code).toContain("0.050"); // default safety limit
    expect(result.macro_code).toContain("ALARM");
    expect(result.safety_limit_mm).toBe(0.05);
  });

  it("okuma macro uses NVAR system", () => {
    const result = turningOffsetCompensationEngine.generateAutoOffsetMacro({
      controller: "okuma", nominal_mm: 45.0, tolerance_mm: 0.025,
      offset_register: 1, axis: "X",
    });
    expect(result.macro_code).toContain("VTOFX");
    expect(result.controller).toBe("okuma");
  });

  it("siemens macro uses DEF REAL syntax", () => {
    const result = turningOffsetCompensationEngine.generateAutoOffsetMacro({
      controller: "siemens", nominal_mm: 45.0, tolerance_mm: 0.025,
      offset_register: 1, axis: "Z",
    });
    expect(result.macro_code).toContain("DEF REAL");
    expect(result.macro_code).toContain("SETAL");
  });

  it("all 5 controllers generate valid macro code", () => {
    const controllers: Array<"fanuc" | "okuma" | "haas" | "mazak" | "siemens"> = [
      "fanuc", "okuma", "haas", "mazak", "siemens",
    ];
    for (const ctrl of controllers) {
      const result = turningOffsetCompensationEngine.generateAutoOffsetMacro({
        controller: ctrl, nominal_mm: 30.0, tolerance_mm: 0.01,
        offset_register: 3, axis: "X",
      });
      expect(result.macro_code.length).toBeGreaterThan(30);
      expect(result.safety_limit_mm).toBe(0.05);
    }
  });

  it("custom safety limit is applied", () => {
    const result = turningOffsetCompensationEngine.generateAutoOffsetMacro({
      controller: "fanuc", nominal_mm: 45.0, tolerance_mm: 0.025,
      offset_register: 1, axis: "X", max_adjustment_mm: 0.020,
    });
    expect(result.safety_limit_mm).toBe(0.02);
    expect(result.macro_code).toContain("0.020");
  });

  it("Z axis macro adjusts Z offset register", () => {
    const result = turningOffsetCompensationEngine.generateAutoOffsetMacro({
      controller: "fanuc", nominal_mm: 80.0, tolerance_mm: 0.05,
      offset_register: 2, axis: "Z",
    });
    expect(result.macro_code).toContain("11000"); // Z offset register block
  });
});

// ── U-LPT04: Accuracy Prediction ──────────────────────────────────────────

describe("Offset Compensation — Accuracy Prediction (U-LPT04)", () => {
  it("uncompensated parts go out of tolerance", () => {
    const result = turningOffsetCompensationEngine.predictAccuracy({
      iso_group: "P", nominal_mm: 45.0, tolerance_mm: 0.025,
      batch_size: 100, wear_per_part_um: 5, approach_angle_deg: 75,
    });
    expect(result.first_oot_part_uncompensated).toBeLessThan(100);
    expect(result.first_oot_part_uncompensated).toBeGreaterThan(0);
  });

  it("compensated batch lasts longer or doesn't go OOT", () => {
    const result = turningOffsetCompensationEngine.predictAccuracy({
      iso_group: "P", nominal_mm: 45.0, tolerance_mm: 0.025,
      batch_size: 100, wear_per_part_um: 5, approach_angle_deg: 75,
      auto_offset_enabled: true, probe_interval: 10,
    });
    // Compensated should save parts
    expect(result.parts_saved).toBeGreaterThan(0);
  });

  it("dimension curve has entries", () => {
    const result = turningOffsetCompensationEngine.predictAccuracy({
      iso_group: "P", nominal_mm: 45.0, tolerance_mm: 0.025,
      batch_size: 50, wear_per_part_um: 3,
    });
    expect(result.dimension_curve.length).toBeGreaterThan(5);
    // Deviations should increase monotonically without compensation
    for (let i = 1; i < result.dimension_curve.length; i++) {
      expect(result.dimension_curve[i].deviation_um).toBeGreaterThanOrEqual(
        result.dimension_curve[i - 1].deviation_um - 0.01 // tiny floating point tolerance
      );
    }
  });

  it("no wear produces no OOT parts", () => {
    const result = turningOffsetCompensationEngine.predictAccuracy({
      iso_group: "P", nominal_mm: 45.0, tolerance_mm: 0.025,
      batch_size: 100, wear_per_part_um: 0,
    });
    expect(result.first_oot_part_uncompensated).toBe(100); // never exceeds
  });
});

// ── U-LPT05: Cpk Prediction ───────────────────────────────────────────────

describe("Offset Compensation — Cpk Prediction (U-LPT05)", () => {
  it("compensated Cpk is higher than uncompensated", () => {
    const result = turningOffsetCompensationEngine.predictAccuracy({
      iso_group: "P", nominal_mm: 45.0, tolerance_mm: 0.025,
      batch_size: 200, wear_per_part_um: 3, approach_angle_deg: 75,
      auto_offset_enabled: true, probe_interval: 10,
    });
    expect(result.cpk_compensated).not.toBeNull();
    expect(result.cpk_compensated!).toBeGreaterThan(result.cpk_uncompensated);
  });

  it("Cpk is positive for reasonable parameters", () => {
    const result = turningOffsetCompensationEngine.predictAccuracy({
      iso_group: "P", nominal_mm: 45.0, tolerance_mm: 0.050,
      batch_size: 50, wear_per_part_um: 2,
    });
    expect(result.cpk_uncompensated).toBeGreaterThan(0);
  });

  it("tight tolerance with high wear gives low Cpk", () => {
    const result = turningOffsetCompensationEngine.predictAccuracy({
      iso_group: "P", nominal_mm: 45.0, tolerance_mm: 0.010,
      batch_size: 100, wear_per_part_um: 8, approach_angle_deg: 75,
    });
    // Tight tolerance + high wear = low capability
    expect(result.cpk_uncompensated).toBeLessThan(2);
  });

  it("no cpk_compensated when auto_offset disabled", () => {
    const result = turningOffsetCompensationEngine.predictAccuracy({
      iso_group: "P", nominal_mm: 45.0, tolerance_mm: 0.025,
      batch_size: 50, wear_per_part_um: 3,
    });
    expect(result.cpk_compensated).toBeNull();
  });
});
