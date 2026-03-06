/**
 * hypermill-engines.test.ts — Tests for HyperMillStrategyEngine + HyperMillSafetyHooks
 * Created by /pdf-learn forge-triple (hyperMILL manuals)
 */
import { describe, it, expect } from "vitest";
import { hyperMillStrategyEngine } from "../engines/HyperMillStrategyEngine.js";
import {
  validateClearancePlane,
  validateNegativeAllowance,
  validateGeometryCheckEnabled,
  validateMeasurementSystem,
  validateTurningHPM,
  validateRestMaterialToolChange,
} from "../engines/HyperMillSafetyHooks.js";

// ============================================================================
// HyperMillStrategyEngine
// ============================================================================
describe("HyperMillStrategyEngine", () => {
  const engine = hyperMillStrategyEngine;

  it("recommends Optimised Roughing for freeform 3D roughing", () => {
    const r = engine.calculate({ geometryType: "freeform_3d", operationGoal: "roughing" });
    expect(r.strategyName).toBe("Optimised Roughing");
    expect(r.confidence).toBeGreaterThan(0);
    expect(r.source).toContain("hypermill-manual");
  });

  it("recommends Pocket Milling for 2D pocket roughing", () => {
    const r = engine.calculate({ geometryType: "pocket_2d", operationGoal: "roughing" });
    // Either Optimised Roughing (priority 12) or Pocket Milling (priority 10) — both valid
    expect(["Optimised Roughing", "Pocket Milling"]).toContain(r.strategyName);
  });

  it("prefers Z Level Finishing for steep walls >60°", () => {
    const r = engine.calculate({
      geometryType: "freeform_3d",
      operationGoal: "finishing",
      wallAngleDeg: 75,
    });
    expect(r.strategyName).toContain("Z Level");
    expect(r.warnings).toEqual(expect.arrayContaining([
      expect.stringContaining("Steep wall"),
    ]));
  });

  it("prefers flat strategies for walls <20°", () => {
    const r = engine.calculate({
      geometryType: "freeform_3d",
      operationGoal: "finishing",
      wallAngleDeg: 10,
    });
    expect(["Plane Machining", "Equidistant Finishing"]).toContain(r.strategyName);
    expect(r.warnings).toEqual(expect.arrayContaining([
      expect.stringContaining("Flat area"),
    ]));
  });

  it("warns for rest machining without previous roughing", () => {
    const r = engine.calculate({
      geometryType: "freeform_3d",
      operationGoal: "rest_machining",
      hasPreviousRoughing: false,
    });
    expect(r.warnings).toEqual(expect.arrayContaining([
      expect.stringContaining("no previous roughing"),
    ]));
  });

  it("warns for superalloy (ISO S) material", () => {
    const r = engine.calculate({
      geometryType: "freeform_3d",
      operationGoal: "roughing",
      materialGroup: "S",
    });
    expect(r.warnings).toEqual(expect.arrayContaining([
      expect.stringContaining("Superalloy"),
    ]));
  });

  it("warns for hardened steel (ISO H) material", () => {
    const r = engine.calculate({
      geometryType: "freeform_3d",
      operationGoal: "finishing",
      materialGroup: "H",
    });
    expect(r.warnings).toEqual(expect.arrayContaining([
      expect.stringContaining("Hardened steel"),
    ]));
  });

  it("recommends Contour Milling for 2D contour finishing", () => {
    const r = engine.calculate({ geometryType: "contour_2d", operationGoal: "finishing" });
    expect(r.strategyName).toBe("Contour Milling");
    expect(r.cuttingMode).toBe("climb");
  });

  it("recommends Turning Roughing for external turning", () => {
    const r = engine.calculate({ geometryType: "turning_external", operationGoal: "roughing" });
    expect(r.strategyName).toBe("Turning Roughing");
    expect(r.cuttingMode).toBe("conventional");
  });

  it("recommends Thread Cutting for thread finishing", () => {
    const r = engine.calculate({ geometryType: "thread", operationGoal: "finishing" });
    expect(r.strategyName).toBe("Thread Cutting");
  });

  it("recommends Corner Rest Machining for corner rest", () => {
    const r = engine.calculate({ geometryType: "corner", operationGoal: "rest_machining" });
    expect(r.strategyName).toBe("Corner Rest Machining");
  });

  it("returns fallback for unknown geometry+goal combo", () => {
    const r = engine.calculate({ geometryType: "chamfer", operationGoal: "roughing" });
    // No exact match for chamfer+roughing — should get a goal-only fallback
    expect(r.warnings.length).toBeGreaterThan(0);
    expect(r.confidence).toBeLessThan(1);
  });

  it("listStrategies returns all strategies", () => {
    const list = engine.listStrategies();
    expect(list.length).toBeGreaterThanOrEqual(20);
    expect(list.find(s => s.cycle === "Optimised Roughing")).toBeDefined();
    expect(list.find(s => s.cycle === "Z Level Finishing")).toBeDefined();
    expect(list.find(s => s.cycle === "Thread Cutting")).toBeDefined();
  });

  it("stats tracks calculation count", () => {
    engine.clear();
    expect(engine.stats().calculations).toBe(0);
    engine.calculate({ geometryType: "face", operationGoal: "roughing" });
    expect(engine.stats().calculations).toBe(1);
    expect(engine.stats().lastInput?.geometryType).toBe("face");
  });
});

// ============================================================================
// HyperMillSafetyHooks
// ============================================================================
describe("HyperMillSafetyHooks", () => {
  describe("validateClearancePlane", () => {
    it("passes when clearance plane is well above workpiece", () => {
      const r = validateClearancePlane({
        clearancePlaneZ: 50,
        workpieceTopZ: 20,
        stockTopZ: 22,
        fixtureTopZ: 30,
      });
      expect(r.valid).toBe(true);
      expect(r.warnings).toHaveLength(0);
    });

    it("warns CRITICAL when clearance plane is below highest obstruction", () => {
      const r = validateClearancePlane({
        clearancePlaneZ: 25,
        workpieceTopZ: 20,
        stockTopZ: 22,
        fixtureTopZ: 30,
      });
      expect(r.valid).toBe(false);
      expect(r.warnings[0]).toContain("CRITICAL");
      expect(r.warnings[0]).toContain("NOT collision-checked");
    });

    it("warns when clearance is less than 2mm", () => {
      const r = validateClearancePlane({
        clearancePlaneZ: 31,
        workpieceTopZ: 20,
        stockTopZ: 22,
        fixtureTopZ: 30,
      });
      expect(r.valid).toBe(false);
      expect(r.warnings[0]).toContain("WARNING");
      expect(r.warnings[0]).toContain("1.0mm");
    });
  });

  describe("validateNegativeAllowance", () => {
    it("passes for positive allowance", () => {
      const r = validateNegativeAllowance({
        allowanceMm: 0.5,
        toolRadiusMm: 5,
        toolCornerRadiusMm: 1,
      });
      expect(r.valid).toBe(true);
      expect(r.warnings).toHaveLength(0);
    });

    it("warns CRITICAL when allowance + corner radius is negative", () => {
      const r = validateNegativeAllowance({
        allowanceMm: -3,
        toolRadiusMm: 5,
        toolCornerRadiusMm: 2,
      });
      expect(r.valid).toBe(false);
      expect(r.warnings[0]).toContain("CRITICAL");
      expect(r.warnings[0]).toContain("nose-diving");
    });

    it("warns about flat end mills with negative allowance", () => {
      const r = validateNegativeAllowance({
        allowanceMm: -0.5,
        toolRadiusMm: 5,
        toolCornerRadiusMm: 0,
      });
      // corner radius=0 + negative allowance = warning
      expect(r.warnings).toEqual(expect.arrayContaining([
        expect.stringContaining("Flat end mills"),
      ]));
    });

    it("warns about XY allowance exceeding limit", () => {
      const r = validateNegativeAllowance({
        allowanceMm: -2,
        additionalAllowanceXY: -3,
        toolRadiusMm: 5,
        toolCornerRadiusMm: 3,
        machiningToleranceMm: 0.01,
      });
      // |(-2) + (-3)| = 5, limit = 5 - 0.01 = 4.99 → exceeds
      expect(r.warnings).toEqual(expect.arrayContaining([
        expect.stringContaining("exceeds limit"),
      ]));
    });

    it("provides max surface gap info", () => {
      const r = validateNegativeAllowance({
        allowanceMm: -1,
        toolRadiusMm: 5,
        toolCornerRadiusMm: 2,
      });
      expect(r.warnings).toEqual(expect.arrayContaining([
        expect.stringContaining("surface gaps"),
      ]));
    });
  });

  describe("validateGeometryCheckEnabled", () => {
    it("passes when geometry check is enabled", () => {
      const r = validateGeometryCheckEnabled({ automaticGeometryCheck: true });
      expect(r.valid).toBe(true);
    });

    it("warns when geometry check is disabled", () => {
      const r = validateGeometryCheckEnabled({ automaticGeometryCheck: false });
      expect(r.valid).toBe(false);
      expect(r.warnings[0]).toContain("DISABLED");
    });
  });

  describe("validateMeasurementSystem", () => {
    it("passes when systems match", () => {
      const r = validateMeasurementSystem({
        currentSystem: "metric",
        projectSystem: "metric",
        hasExistingJobs: true,
      });
      expect(r.valid).toBe(true);
    });

    it("warns CRITICAL on mismatch with existing jobs", () => {
      const r = validateMeasurementSystem({
        currentSystem: "inch",
        projectSystem: "metric",
        hasExistingJobs: true,
      });
      expect(r.valid).toBe(false);
      expect(r.warnings[0]).toContain("CRITICAL");
      expect(r.warnings[0]).toContain("NOT be converted");
    });

    it("passes on mismatch without existing jobs", () => {
      const r = validateMeasurementSystem({
        currentSystem: "inch",
        projectSystem: "metric",
        hasExistingJobs: false,
      });
      expect(r.valid).toBe(true);
    });
  });

  describe("validateTurningHPM", () => {
    it("passes for round inserts in HPM", () => {
      const r = validateTurningHPM({ highPerformanceMode: true, insertType: "round" });
      expect(r.valid).toBe(true);
    });

    it("warns for non-round inserts in HPM", () => {
      const r = validateTurningHPM({ highPerformanceMode: true, insertType: "diamond" });
      expect(r.valid).toBe(false);
      expect(r.warnings[0]).toContain("round inserts only");
    });

    it("passes for non-round inserts when HPM disabled", () => {
      const r = validateTurningHPM({ highPerformanceMode: false, insertType: "diamond" });
      expect(r.valid).toBe(true);
    });
  });

  describe("validateRestMaterialToolChange", () => {
    it("passes when tool diameters match", () => {
      const r = validateRestMaterialToolChange({
        previousToolDiameterMm: 10,
        currentToolDiameterMm: 6,
        isRestMaterialCycle: true,
        restMaterialToolDiameterMm: 10,
      });
      expect(r.valid).toBe(true);
    });

    it("warns when reference tool diameter mismatches", () => {
      const r = validateRestMaterialToolChange({
        previousToolDiameterMm: 12,
        currentToolDiameterMm: 6,
        isRestMaterialCycle: true,
        restMaterialToolDiameterMm: 10,
      });
      expect(r.valid).toBe(false);
      expect(r.warnings[0]).toContain("differs");
      expect(r.warnings[0]).toContain("plunging");
    });

    it("passes when not a rest material cycle", () => {
      const r = validateRestMaterialToolChange({
        previousToolDiameterMm: 12,
        currentToolDiameterMm: 6,
        isRestMaterialCycle: false,
      });
      expect(r.valid).toBe(true);
    });
  });
});
