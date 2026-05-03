/**
 * HyperMillSafetyHooks tests — CAM-EXHAUST-MS0 / U-CAM-HM-SAFETY-TESTS-01
 *
 * Six pure-function safety validators derived from hyperMILL Manuals 1-4:
 *   1. validateClearancePlane          (Manual 1, p.759)
 *   2. validateNegativeAllowance       (Manual 4, p.757-758)
 *   3. validateGeometryCheckEnabled    (Manual 1, p.36)
 *   4. validateMeasurementSystem       (Manual 1, p.35)
 *   5. validateTurningHPM              (Manual 2, p.303)
 *   6. validateRestMaterialToolChange  (Manual 3, p.638)
 *
 * Coverage criterion per validator:
 *   - happy path (valid: true, warnings: [])
 *   - boundary conditions (≤, <, ≥, >)
 *   - documented CRITICAL / WARNING / INFO escalation
 *   - boolean flag combinations (when applicable)
 *
 * Strict legitimacy:
 *   - Concrete assertions only (no toBeDefined, no presence-only)
 *   - Magic numbers extracted to named constants
 *   - All validators tested through their public API surface
 */

import { describe, it, expect } from "vitest";
import {
  validateClearancePlane,
  validateNegativeAllowance,
  validateGeometryCheckEnabled,
  validateMeasurementSystem,
  validateTurningHPM,
  validateRestMaterialToolChange,
} from "../engines/HyperMillSafetyHooks.js";

// ── Named constants ──────────────────────────────────────────────────────
const CLEARANCE_SAFE_OFFSET_MM = 10;        // ≥5 mm (above WARNING threshold)
const CLEARANCE_BOUNDARY_OFFSET_MM = 1.5;   // <2 mm (triggers WARNING)
const WORKPIECE_TOP_Z = 50;
const STOCK_TOP_Z = 51;
const FIXTURE_TOP_Z = 30;
const TOOL_RADIUS_MM = 6;
const CORNER_RADIUS_FLAT = 0;
const CORNER_RADIUS_BULL = 1;
const NEG_ALLOWANCE_SAFE_MM = -0.5;
const NEG_ALLOWANCE_DEEP_MM = -10;          // exceeds bull corner radius (1mm)
const POS_ALLOWANCE_MM = 0.5;
const NEG_XY_DEEP_MM = -6;                  // |allowance + xy| ≥ tool_radius
const NEG_XY_SAFE_MM = -1;
const TOL_MM = 0.01;
const PREV_TOOL_D_MM = 8;
const REST_TOOL_D_MM_MATCH = 8;
const REST_TOOL_D_MM_MISMATCH = 6;

// ════════════════════════════════════════════════════════════════════════
// validateClearancePlane (Manual 1, p.759)
// ════════════════════════════════════════════════════════════════════════
describe("validateClearancePlane", () => {
  it("valid when clearance ≥5 mm above all obstructions", () => {
    const result = validateClearancePlane({
      clearancePlaneZ: WORKPIECE_TOP_Z + CLEARANCE_SAFE_OFFSET_MM,
      workpieceTopZ: WORKPIECE_TOP_Z,
      stockTopZ: STOCK_TOP_Z,
      fixtureTopZ: FIXTURE_TOP_Z,
    });
    expect(result.valid).toBe(true);
    expect(result.warnings).toEqual([]);
  });

  it("emits CRITICAL when clearance equal to highest obstruction (==)", () => {
    const result = validateClearancePlane({
      clearancePlaneZ: STOCK_TOP_Z,
      workpieceTopZ: WORKPIECE_TOP_Z,
      stockTopZ: STOCK_TOP_Z,
    });
    expect(result.valid).toBe(false);
    expect(result.warnings.length).toBe(1);
    expect(result.warnings[0]).toContain("CRITICAL");
    expect(result.warnings[0]).toContain("at or below");
  });

  it("emits CRITICAL when clearance below highest obstruction", () => {
    const result = validateClearancePlane({
      clearancePlaneZ: STOCK_TOP_Z - 5,
      workpieceTopZ: WORKPIECE_TOP_Z,
      stockTopZ: STOCK_TOP_Z,
    });
    expect(result.warnings[0]).toContain("CRITICAL");
    expect(result.warnings[0]).toContain("Rapid moves at clearance plane are NOT collision-checked");
  });

  it("emits WARNING when clearance is <2 mm above highest obstruction", () => {
    const result = validateClearancePlane({
      clearancePlaneZ: STOCK_TOP_Z + CLEARANCE_BOUNDARY_OFFSET_MM,
      workpieceTopZ: WORKPIECE_TOP_Z,
      stockTopZ: STOCK_TOP_Z,
    });
    expect(result.valid).toBe(false);
    expect(result.warnings[0]).toContain("WARNING");
    expect(result.warnings[0]).toContain("only 1.5mm");
  });

  it("considers workpieceTopZ when no fixture provided", () => {
    const result = validateClearancePlane({
      clearancePlaneZ: WORKPIECE_TOP_Z + 1,
      workpieceTopZ: WORKPIECE_TOP_Z,
      stockTopZ: 0,
    });
    // 1 mm above workpiece (which is the highest) → WARNING
    expect(result.warnings[0]).toContain("WARNING");
  });

  it("uses fixture height when fixture is highest obstruction", () => {
    const TALL_FIXTURE_Z = 100;
    const result = validateClearancePlane({
      clearancePlaneZ: TALL_FIXTURE_Z + 1,
      workpieceTopZ: WORKPIECE_TOP_Z,
      stockTopZ: STOCK_TOP_Z,
      fixtureTopZ: TALL_FIXTURE_Z,
    });
    // Fixture (100) is highest, clearance only +1 → WARNING (not CRITICAL)
    expect(result.warnings[0]).toContain("WARNING");
    expect(result.warnings[0]).toContain("only 1.0mm");
  });

  it("treats missing fixtureTopZ as 0 (does not raise floor)", () => {
    const result = validateClearancePlane({
      clearancePlaneZ: WORKPIECE_TOP_Z + CLEARANCE_SAFE_OFFSET_MM,
      workpieceTopZ: WORKPIECE_TOP_Z,
      stockTopZ: 0,
    });
    expect(result.valid).toBe(true);
  });
});

// ════════════════════════════════════════════════════════════════════════
// validateNegativeAllowance (Manual 4, p.757-758)
// ════════════════════════════════════════════════════════════════════════
describe("validateNegativeAllowance", () => {
  it("returns valid for positive allowance (early-exit)", () => {
    const result = validateNegativeAllowance({
      allowanceMm: POS_ALLOWANCE_MM,
      toolRadiusMm: TOOL_RADIUS_MM,
      toolCornerRadiusMm: CORNER_RADIUS_BULL,
    });
    expect(result.valid).toBe(true);
    expect(result.warnings).toEqual([]);
  });

  it("returns valid when both allowance and additionalAllowanceXY are non-negative", () => {
    const result = validateNegativeAllowance({
      allowanceMm: 0,
      additionalAllowanceXY: 0,
      toolRadiusMm: TOOL_RADIUS_MM,
      toolCornerRadiusMm: CORNER_RADIUS_BULL,
    });
    expect(result.valid).toBe(true);
  });

  it("emits CRITICAL when negative allowance + corner radius < 0", () => {
    const result = validateNegativeAllowance({
      allowanceMm: NEG_ALLOWANCE_DEEP_MM,
      toolRadiusMm: TOOL_RADIUS_MM,
      toolCornerRadiusMm: CORNER_RADIUS_BULL,
    });
    // -10 + 1 = -9 < 0 → CRITICAL
    expect(result.valid).toBe(false);
    const critical = result.warnings.find((w) => w.startsWith("CRITICAL"));
    expect(typeof critical).toBe("string");
    expect(critical!).toContain("nose-diving");
  });

  it("emits WARNING when flat end mill (corner radius=0) used with negative allowance", () => {
    const result = validateNegativeAllowance({
      allowanceMm: NEG_ALLOWANCE_SAFE_MM,
      toolRadiusMm: TOOL_RADIUS_MM,
      toolCornerRadiusMm: CORNER_RADIUS_FLAT,
    });
    const warn = result.warnings.find((w) => w.startsWith("WARNING"));
    expect(typeof warn).toBe("string");
    expect(warn!).toContain("Flat end mills");
  });

  it("emits CRITICAL when |allowance + XY| >= tool radius - tolerance", () => {
    const result = validateNegativeAllowance({
      allowanceMm: 0,
      additionalAllowanceXY: NEG_XY_DEEP_MM,
      toolRadiusMm: TOOL_RADIUS_MM,
      toolCornerRadiusMm: CORNER_RADIUS_BULL,
      machiningToleranceMm: TOL_MM,
    });
    // |0 + (-6)| = 6 >= 6 - 0.01 = 5.99 → CRITICAL
    expect(result.valid).toBe(false);
    const critical = result.warnings.find((w) => w.startsWith("CRITICAL"));
    expect(typeof critical).toBe("string");
    expect(critical!).toContain("XY allowance");
  });

  it("does not emit CRITICAL when |allowance + XY| < tool radius - tolerance", () => {
    const result = validateNegativeAllowance({
      allowanceMm: 0,
      additionalAllowanceXY: NEG_XY_SAFE_MM,
      toolRadiusMm: TOOL_RADIUS_MM,
      toolCornerRadiusMm: CORNER_RADIUS_BULL,
      machiningToleranceMm: TOL_MM,
    });
    // |0 + (-1)| = 1 < 5.99 → no XY-allowance CRITICAL
    expect(result.warnings.filter((w) => w.includes("XY allowance"))).toEqual([]);
  });

  it("emits INFO about surface gap limit when negative allowance + positive resulting gap", () => {
    const result = validateNegativeAllowance({
      allowanceMm: NEG_ALLOWANCE_SAFE_MM, // -0.5
      toolRadiusMm: TOOL_RADIUS_MM,        // 6
      toolCornerRadiusMm: CORNER_RADIUS_BULL, // 1
    });
    // 2 * (6 + (-0.5)) = 11mm > 0 → INFO
    const info = result.warnings.find((w) => w.startsWith("INFO"));
    expect(typeof info).toBe("string");
    expect(info!).toContain("surface gaps must not exceed");
    expect(info!).toContain("11.00mm");
  });

  it("does not emit INFO when 2*(toolRadius+allowance) <= 0", () => {
    const HUGE_NEG_ALLOWANCE = -100;
    const result = validateNegativeAllowance({
      allowanceMm: HUGE_NEG_ALLOWANCE,
      toolRadiusMm: TOOL_RADIUS_MM, // 6
      toolCornerRadiusMm: CORNER_RADIUS_BULL,
    });
    // 2 * (6 + (-100)) = -188 ≤ 0 → no INFO line
    expect(result.warnings.filter((w) => w.startsWith("INFO"))).toEqual([]);
  });

  it("uses default machiningToleranceMm = 0.01 when omitted", () => {
    // tool radius=6, default tol=0.01 → limit 5.99
    // additionalAllowanceXY=-5.99 → totalNeg=5.99, equal-to limit triggers CRITICAL (≥)
    const result = validateNegativeAllowance({
      allowanceMm: 0,
      additionalAllowanceXY: -5.99,
      toolRadiusMm: TOOL_RADIUS_MM,
      toolCornerRadiusMm: CORNER_RADIUS_BULL,
    });
    const critical = result.warnings.find((w) => w.startsWith("CRITICAL"));
    expect(typeof critical).toBe("string");
  });
});

// ════════════════════════════════════════════════════════════════════════
// validateGeometryCheckEnabled (Manual 1, p.36)
// ════════════════════════════════════════════════════════════════════════
describe("validateGeometryCheckEnabled", () => {
  it("valid when automatic geometry check is enabled", () => {
    const result = validateGeometryCheckEnabled({ automaticGeometryCheck: true });
    expect(result.valid).toBe(true);
    expect(result.warnings).toEqual([]);
  });

  it("emits WARNING when automatic geometry check is disabled", () => {
    const result = validateGeometryCheckEnabled({ automaticGeometryCheck: false });
    expect(result.valid).toBe(false);
    expect(result.warnings.length).toBe(1);
    expect(result.warnings[0]).toContain("WARNING");
    expect(result.warnings[0]).toContain("DISABLED");
    expect(result.warnings[0]).toContain("Re-enable in Setup");
  });
});

// ════════════════════════════════════════════════════════════════════════
// validateMeasurementSystem (Manual 1, p.35)
// ════════════════════════════════════════════════════════════════════════
describe("validateMeasurementSystem", () => {
  it("valid when systems match", () => {
    const result = validateMeasurementSystem({
      currentSystem: "metric",
      projectSystem: "metric",
      hasExistingJobs: true,
    });
    expect(result.valid).toBe(true);
    expect(result.warnings).toEqual([]);
  });

  it("valid when systems differ but no existing jobs (safe to switch)", () => {
    const result = validateMeasurementSystem({
      currentSystem: "metric",
      projectSystem: "inch",
      hasExistingJobs: false,
    });
    expect(result.valid).toBe(true);
    expect(result.warnings).toEqual([]);
  });

  it("emits CRITICAL when metric/inch mismatch with existing jobs", () => {
    const result = validateMeasurementSystem({
      currentSystem: "metric",
      projectSystem: "inch",
      hasExistingJobs: true,
    });
    expect(result.valid).toBe(false);
    expect(result.warnings[0]).toContain("CRITICAL");
    expect(result.warnings[0]).toContain("metric");
    expect(result.warnings[0]).toContain("inch");
  });

  it("emits CRITICAL when inch/metric mismatch with existing jobs (reverse)", () => {
    const result = validateMeasurementSystem({
      currentSystem: "inch",
      projectSystem: "metric",
      hasExistingJobs: true,
    });
    expect(result.warnings[0]).toContain("Project uses metric");
    expect(result.warnings[0]).toContain("current setting is inch");
  });
});

// ════════════════════════════════════════════════════════════════════════
// validateTurningHPM (Manual 2, p.303)
// ════════════════════════════════════════════════════════════════════════
describe("validateTurningHPM", () => {
  it("valid when HPM enabled with round insert", () => {
    const result = validateTurningHPM({
      highPerformanceMode: true,
      insertType: "round",
    });
    expect(result.valid).toBe(true);
    expect(result.warnings).toEqual([]);
  });

  it("valid when HPM disabled regardless of insert type", () => {
    const result = validateTurningHPM({
      highPerformanceMode: false,
      insertType: "diamond",
    });
    expect(result.valid).toBe(true);
  });

  it("emits WARNING when HPM enabled with diamond insert", () => {
    const result = validateTurningHPM({
      highPerformanceMode: true,
      insertType: "diamond",
    });
    expect(result.valid).toBe(false);
    expect(result.warnings[0]).toContain("WARNING");
    expect(result.warnings[0]).toContain("'diamond'");
  });

  it("emits WARNING for square insert with HPM", () => {
    const result = validateTurningHPM({
      highPerformanceMode: true,
      insertType: "square",
    });
    expect(result.warnings[0]).toContain("'square'");
  });

  it("emits WARNING for trigon insert with HPM", () => {
    const result = validateTurningHPM({
      highPerformanceMode: true,
      insertType: "trigon",
    });
    expect(result.warnings[0]).toContain("'trigon'");
  });

  it("emits WARNING for 'other' insert with HPM", () => {
    const result = validateTurningHPM({
      highPerformanceMode: true,
      insertType: "other",
    });
    expect(result.warnings[0]).toContain("'other'");
  });
});

// ════════════════════════════════════════════════════════════════════════
// validateRestMaterialToolChange (Manual 3, p.638)
// ════════════════════════════════════════════════════════════════════════
describe("validateRestMaterialToolChange", () => {
  it("valid when not a rest material cycle", () => {
    const result = validateRestMaterialToolChange({
      previousToolDiameterMm: PREV_TOOL_D_MM,
      currentToolDiameterMm: 10,
      isRestMaterialCycle: false,
    });
    expect(result.valid).toBe(true);
    expect(result.warnings).toEqual([]);
  });

  it("valid when restMaterialToolDiameterMm undefined", () => {
    const result = validateRestMaterialToolChange({
      previousToolDiameterMm: PREV_TOOL_D_MM,
      currentToolDiameterMm: 10,
      isRestMaterialCycle: true,
    });
    expect(result.valid).toBe(true);
  });

  it("valid when previous matches rest material reference (synced)", () => {
    const result = validateRestMaterialToolChange({
      previousToolDiameterMm: PREV_TOOL_D_MM,
      currentToolDiameterMm: 10,
      isRestMaterialCycle: true,
      restMaterialToolDiameterMm: REST_TOOL_D_MM_MATCH,
    });
    expect(result.valid).toBe(true);
    expect(result.warnings).toEqual([]);
  });

  it("emits WARNING when previous tool differs from rest material reference", () => {
    const result = validateRestMaterialToolChange({
      previousToolDiameterMm: PREV_TOOL_D_MM,
      currentToolDiameterMm: 10,
      isRestMaterialCycle: true,
      restMaterialToolDiameterMm: REST_TOOL_D_MM_MISMATCH,
    });
    expect(result.valid).toBe(false);
    expect(result.warnings.length).toBe(1);
    expect(result.warnings[0]).toContain("WARNING");
    expect(result.warnings[0]).toContain("plunging into material");
    expect(result.warnings[0]).toContain(`${PREV_TOOL_D_MM}mm`);
    expect(result.warnings[0]).toContain(`${REST_TOOL_D_MM_MISMATCH}mm`);
  });

  it("emits WARNING with citation [hyperMILL Manual 3, p.638]", () => {
    const result = validateRestMaterialToolChange({
      previousToolDiameterMm: PREV_TOOL_D_MM,
      currentToolDiameterMm: 10,
      isRestMaterialCycle: true,
      restMaterialToolDiameterMm: REST_TOOL_D_MM_MISMATCH,
    });
    expect(result.warnings[0]).toContain("[hyperMILL Manual 3, p.638]");
  });
});
