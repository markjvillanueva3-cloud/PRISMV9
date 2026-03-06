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

// ============================================================================
// HyperMillMultiAxisEngine
// ============================================================================
import { hyperMillMultiAxisEngine } from "../engines/HyperMillMultiAxisEngine.js";

describe("HyperMillMultiAxisEngine", () => {
  const engine = hyperMillMultiAxisEngine;

  it("recommends Impeller Roughing for impeller roughing", () => {
    const r = engine.calculate({ geometry: "impeller", goal: "roughing" });
    expect(r.strategyName).toBe("5X Impeller Roughing");
    expect(r.cycleCode).toBe("IrX5");
    expect(r.confidence).toBeGreaterThan(0);
  });

  it("recommends Blade Swarf Cutting for blade finishing at 30-80°", () => {
    const r = engine.calculate({
      geometry: "blade",
      goal: "finishing",
      wallAngleDeg: 50,
    });
    expect(r.strategyName).toBe("5X Blade Swarf Cutting");
    expect(r.warnings).toEqual(
      expect.arrayContaining([expect.stringContaining("swarf")]),
    );
  });

  it("recommends Blade Tangent Cutting for blade finishing", () => {
    const r = engine.calculate({ geometry: "blade", goal: "finishing" });
    expect(r.strategyName).toBe("5X Blade Tangent Cutting");
    expect(r.cycleCode).toBe("FBGX5");
  });

  it("prefers tangent roughing for impeller with large tool", () => {
    const r = engine.calculate({
      geometry: "impeller",
      goal: "roughing",
      toolDiameterMm: 12,
    });
    expect(r.strategyName).toBe("5X Impeller Tangent Roughing");
    expect(r.warnings).toEqual(
      expect.arrayContaining([expect.stringContaining("barrel")]),
    );
  });

  it("warns for deep impeller channels", () => {
    const r = engine.calculate({
      geometry: "impeller",
      goal: "roughing",
      hubShroudRatio: 0.2,
    });
    expect(r.warnings).toEqual(
      expect.arrayContaining([expect.stringContaining("Deep impeller")]),
    );
  });

  it("warns for superalloy material", () => {
    const r = engine.calculate({
      geometry: "impeller",
      goal: "finishing",
      materialGroup: "S",
    });
    expect(r.warnings).toEqual(
      expect.arrayContaining([expect.stringContaining("Superalloy")]),
    );
  });

  it("warns for splitter blades", () => {
    const r = engine.calculate({
      geometry: "impeller",
      goal: "roughing",
      hasSplitterBlades: true,
    });
    expect(r.warnings).toEqual(
      expect.arrayContaining([expect.stringContaining("Splitter")]),
    );
  });

  it("recommends tube roughing for tube geometry", () => {
    const r = engine.calculate({ geometry: "tube", goal: "roughing" });
    expect(r.strategyName).toBe("5X Tube Roughing");
    expect(r.group).toBe("5Axis-Tube-Cycles");
  });

  it("recommends dental crown for dental_crown", () => {
    const r = engine.calculate({
      geometry: "dental_crown",
      goal: "finishing",
    });
    expect(r.strategyName).toBe("5X Dental Crown");
  });

  it("recommends dental abutment finishing", () => {
    const r = engine.calculate({
      geometry: "dental_abutment",
      goal: "finishing",
    });
    expect(r.strategyName).toBe("5X Dental Abutment");
    expect(r.suggestedStepover).toBe(0.05);
  });

  it("recommends impeller probing for probing goal", () => {
    const r = engine.calculate({ geometry: "impeller", goal: "probing" });
    expect(r.strategyName).toBe("5X Impeller Probing");
    expect(r.cycleCode).toBe("IcX5");
  });

  it("recommends impeller edge machining", () => {
    const r = engine.calculate({
      geometry: "impeller",
      goal: "edge_machining",
    });
    expect(r.strategyName).toBe("5X Impeller Edge Machining");
  });

  it("recommends blade fillet machining", () => {
    const r = engine.calculate({
      geometry: "blade",
      goal: "fillet_machining",
    });
    expect(r.strategyName).toBe("5X Blade Fillet Machining");
    expect(r.cycleCode).toBe("FBFX5");
  });

  it("recommends 5X cavity roughing", () => {
    const r = engine.calculate({ geometry: "cavity_5x", goal: "roughing" });
    expect(r.strategyName).toBe("5X Cavity Roughing");
  });

  it("returns fallback for unknown geometry+goal", () => {
    const r = engine.calculate({
      geometry: "dental_bridge",
      goal: "probing",
    });
    expect(r.warnings.length).toBeGreaterThan(0);
  });

  it("listStrategies returns all strategies", () => {
    const list = engine.listStrategies();
    expect(list.length).toBeGreaterThanOrEqual(20);
    expect(list.find((s) => s.code === "IrX5")).toBeDefined();
    expect(list.find((s) => s.code === "FBWX5")).toBeDefined();
  });

  it("getDefaults returns milling defaults", () => {
    const d = engine.getDefaults("milling");
    expect(d).toHaveProperty("approachLength");
    expect(d).toHaveProperty("holderClearance");
  });

  it("getDefaults returns turning defaults", () => {
    const d = engine.getDefaults("turning");
    expect(d).toHaveProperty("cuttingSpeed", 200);
    expect(d).toHaveProperty("feedRate", 0.1);
  });

  it("stats tracks calculations", () => {
    const before = engine.stats().calculations;
    engine.calculate({ geometry: "impeller", goal: "roughing" });
    expect(engine.stats().calculations).toBe(before + 1);
    expect(engine.stats().totalStrategies).toBeGreaterThanOrEqual(20);
  });
});

// ============================================================================
// HyperMillMaterialMapEngine
// ============================================================================
import {
  hyperMillMaterialMapEngine,
} from "../engines/HyperMillMaterialMapEngine.js";

describe("HyperMillMaterialMapEngine", () => {
  const engine = hyperMillMaterialMapEngine;

  it("looks up steel quality by ID", () => {
    const r = engine.lookupByQualityId("1_6_4");
    expect(r).not.toBeNull();
    expect(r!.hyperMillGroup).toBe("Steel");
    expect(r!.hyperMillSubgroup).toBe("Heat-treatable steel");
    expect(r!.isoGroup).toBe("P");
    expect(r!.suggestedCutterMaterials).toContain("SolidCarbide");
  });

  it("looks up titanium quality by ID", () => {
    const r = engine.lookupByQualityId("7_1_4");
    expect(r).not.toBeNull();
    expect(r!.hyperMillGroup).toBe("Titanium");
    expect(r!.hyperMillQuality).toBe("Alpha-Beta alloy");
    expect(r!.isoGroup).toBe("S");
    expect(r!.warnings).toEqual(
      expect.arrayContaining([expect.stringContaining("flood coolant")]),
    );
  });

  it("looks up hardened steel > 60 HRC", () => {
    const r = engine.lookupByQualityId("1_10_4");
    expect(r).not.toBeNull();
    expect(r!.warnings).toEqual(
      expect.arrayContaining([expect.stringContaining("PCBN")]),
    );
  });

  it("looks up nickel alloy with work hardening warning", () => {
    const r = engine.lookupByQualityId("3_2_1");
    expect(r).not.toBeNull();
    expect(r!.isoGroup).toBe("S");
    expect(r!.warnings).toEqual(
      expect.arrayContaining([expect.stringContaining("work hardening")]),
    );
  });

  it("looks up cast iron in ISO K", () => {
    const r = engine.lookupByQualityId("4_4_1");
    expect(r).not.toBeNull();
    expect(r!.isoGroup).toBe("K");
    expect(r!.isoGroupName).toBe("Cast Iron");
  });

  it("looks up aluminium in ISO N with PCD recommendation", () => {
    const r = engine.lookupByQualityId("5_1_3");
    expect(r).not.toBeNull();
    expect(r!.isoGroup).toBe("N");
    expect(r!.suggestedCutterMaterials).toContain("PCD");
  });

  it("looks up CFRP with delamination warning", () => {
    const r = engine.lookupByQualityId("9_3_4");
    expect(r).not.toBeNull();
    expect(r!.warnings).toEqual(
      expect.arrayContaining([expect.stringContaining("delamination")]),
    );
  });

  it("returns null for unknown quality ID", () => {
    expect(engine.lookupByQualityId("99_99_99")).toBeNull();
  });

  it("searches by name - titanium", () => {
    const results = engine.searchByName("titanium");
    expect(results.length).toBeGreaterThanOrEqual(5);
  });

  it("searches by name - brass", () => {
    const results = engine.searchByName("brass");
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].hyperMillSubgroup).toContain("CuZn");
  });

  it("gets all materials by ISO group K", () => {
    const results = engine.getByIsoGroup("K");
    expect(results.length).toBeGreaterThanOrEqual(10);
    expect(results.every((r) => r.isoGroup === "K")).toBe(true);
  });

  it("listGroups returns 10 groups", () => {
    const groups = engine.listGroups();
    expect(groups.length).toBe(10);
    expect(groups[0].name).toBe("Steel");
    expect(groups[0].isoGroup).toBe("P");
  });

  it("listCutterMaterials returns 9 materials", () => {
    const mats = engine.listCutterMaterials();
    expect(mats.length).toBe(9);
    expect(mats.find((m) => m.code === "PCD")).toBeDefined();
  });

  it("totalQualities returns 130+", () => {
    const total = engine.totalQualities();
    expect(total).toBeGreaterThanOrEqual(130);
    expect(total).toBeLessThanOrEqual(200);
  });
});
