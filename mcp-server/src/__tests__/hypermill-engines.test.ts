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

  it("getDefaults returns turning defaults from hmTrnr.cfg", () => {
    const d = engine.getDefaults("turning") as Record<string, unknown>;
    expect(d).toHaveProperty("cuttingSpeed", 200);
    expect(d).toHaveProperty("feedRate", 0.3);
    expect(d).toHaveProperty("finishFeedRate", 0.1);
    expect(d).toHaveProperty("clearanceDistance", 5);
    expect(d).toHaveProperty("chamferLength", 0.5);
    expect(d).toHaveProperty("filletRadiusFormula", "T:CornerRad * 0.1");
  });

  it("getDefaults returns impeller defaults from hmIrX5.cfg", () => {
    const d = engine.getDefaults("impeller") as Record<string, unknown>;
    expect(d.bladeCount).toBe(6);
    expect(d.hubAllowance).toBe(0.5);
    expect(d.horizontalInfeed).toBe(1.5);
    expect(d.openSpindle).toBe(2000);
    expect(d.leadAngle).toBe(5);
    expect(d.precision).toBe(0.05);
  });

  it("getDefaults returns blade defaults from hmBrX5.cfg", () => {
    const d = engine.getDefaults("blade") as Record<string, unknown>;
    expect(d.allowance).toBe(0.5);
    expect(d.horizontalInfeed).toBe(5);
    expect(d.tiltAngle).toBe(10);
    expect(d.tiltMinAngle).toBe(2);
    expect(d.fanDistance).toBe(20);
    expect(d.approachMacro).toBe("circular");
  });

  it("getDefaults returns 5X drilling defaults from hmDdaX5.cfg", () => {
    const d = engine.getDefaults("drilling_5x") as Record<string, unknown>;
    expect(d.guideSleeveLength).toBe(5.2);
    expect(d.infeedSpindleSpeed).toBe(600);
    expect(d.clearanceSideFormula).toBe("10 * T:Dia");
    expect(d.fchFeedFactor).toBe(500);
    expect(d.retractFeedFactor).toBe(500);
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

  // --- Audit regression tests ---

  it("graphite is mapped to ISO N (not H)", () => {
    const r = engine.lookupByQualityId("8_1_1");
    expect(r).not.toBeNull();
    expect(r!.isoGroup).toBe("N");
    expect(r!.warnings).toContainEqual(expect.stringContaining("Graphite"));
    expect(r!.suggestedCutterMaterials).toContain("PCD");
  });

  it("nickel-chromium quality name is correct (not cobalt-chromium)", () => {
    const r = engine.lookupByQualityId("3_6_1");
    expect(r).not.toBeNull();
    expect(r!.hyperMillQuality).toBe("Nickel-chromium alloys");
    expect(r!.hyperMillQuality).not.toContain("Cobalt");
  });

  it("getByIsoGroup includes warnings", () => {
    const titanium = engine.getByIsoGroup("S");
    const ti = titanium.find((m) => m.hyperMillGroup === "Titanium");
    expect(ti).toBeDefined();
    expect(ti!.warnings.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// HyperMillCycleCatalogEngine
// ============================================================================

import { hyperMillCycleCatalogEngine as cycleCatalog } from "../engines/HyperMillCycleCatalogEngine.js";

describe("HyperMillCycleCatalogEngine", () => {
  const engine = cycleCatalog;

  it("lists all cycles (120+)", () => {
    const all = engine.listAll();
    expect(all.length).toBeGreaterThanOrEqual(120);
  });

  it("stats returns correct category breakdown", () => {
    const s = engine.stats();
    expect(s.total).toBeGreaterThanOrEqual(120);
    expect(s.drilling).toBe(3);
    expect(s.millturn).toBeGreaterThanOrEqual(15);
    expect(s["5axis"]).toBeGreaterThanOrEqual(40);
    expect(s["3d"]).toBeGreaterThanOrEqual(20);
  });

  it("byCategory filters correctly", () => {
    const drilling = engine.byCategory("drilling");
    expect(drilling.length).toBe(3);
    expect(drilling.every((c: any) => c.category === "drilling")).toBe(true);
  });

  it("search finds by display name", () => {
    const r = engine.search("impeller");
    expect(r.length).toBeGreaterThanOrEqual(8);
    expect(r.some((c: any) => c.code.includes("Impeller"))).toBe(true);
  });

  it("search finds by alias", () => {
    const r = engine.search("Pecking");
    expect(r.length).toBeGreaterThanOrEqual(2);
  });

  it("lookupByCode finds exact match", () => {
    const c = engine.lookupByCode("3D:Z-Level Roughing");
    expect(c).not.toBeNull();
    expect(c.displayName).toBe("Z-Level Roughing");
  });

  it("lookupByCode returns null for unknown", () => {
    expect(engine.lookupByCode("FAKE:Nothing")).toBeNull();
  });

  it("probing category exists", () => {
    const probing = engine.byCategory("probing");
    expect(probing.length).toBeGreaterThanOrEqual(6);
  });

  it("millturn includes groove and thread operations", () => {
    const mt = engine.byCategory("millturn");
    expect(mt.some((c: any) => c.code.includes("Groove"))).toBe(true);
    expect(mt.some((c: any) => c.code.includes("Thread"))).toBe(true);
  });

  it("grinding category exists", () => {
    const g = engine.byCategory("grinding");
    expect(g.length).toBeGreaterThanOrEqual(1);
  });
});

// ============================================================================
// HyperMillControllerCatalogEngine
// ============================================================================
import { hyperMillControllerCatalogEngine as ctrlCatalog } from "../engines/HyperMillControllerCatalogEngine.js";

describe("HyperMillControllerCatalogEngine", () => {
  it("lists 16 controller families", () => {
    const families = ctrlCatalog.listFamilies();
    expect(families.length).toBe(16);
    expect(families.map((f: any) => f.id)).toContain("fanuc");
    expect(families.map((f: any) => f.id)).toContain("siemens");
  });

  it("stats returns valid counts", () => {
    const s = ctrlCatalog.stats();
    expect(s.families).toBe(16);
    expect(s.totalVariants).toBeGreaterThanOrEqual(55);
    expect(s.dialects).toBeGreaterThanOrEqual(5);
  });

  it("getFamily returns Fanuc details", () => {
    const f = ctrlCatalog.getFamily("fanuc");
    expect(f).toBeDefined();
    expect(f!.name).toContain("Fanuc");
    expect(f!.variants.length).toBeGreaterThanOrEqual(3);
  });

  it("getFamily returns null for unknown", () => {
    expect(ctrlCatalog.getFamily("nonexistent")).toBeNull();
  });

  it("search finds Heidenhain variants", () => {
    const results = ctrlCatalog.search("heidenhain");
    expect(results.length).toBeGreaterThanOrEqual(1);
  });

  it("search is case-insensitive", () => {
    const a = ctrlCatalog.search("FANUC");
    const b = ctrlCatalog.search("fanuc");
    expect(a.length).toBe(b.length);
  });

  it("byAxisCount filters 5-axis controllers", () => {
    const five = ctrlCatalog.byAxisCount(5);
    expect(five.length).toBeGreaterThanOrEqual(1);
  });

  it("byCapability finds turning capable", () => {
    const mt = ctrlCatalog.byCapability("turning");
    expect(mt.length).toBeGreaterThanOrEqual(1);
  });

  it("getDialect returns fanuc dialect features", () => {
    const d = ctrlCatalog.getDialect("fanuc");
    expect(d).toBeDefined();
    expect(d!.programStart).toBeDefined();
    expect(d!.programEnd).toBeDefined();
  });

  it("getDialect returns null for unknown dialect", () => {
    expect(ctrlCatalog.getDialect("nonexistent")).toBeNull();
  });
});

// ============================================================================
// HyperMillCycleDefaultsEngine
// ============================================================================
import { hyperMillCycleDefaultsEngine as cycleDefaults } from "../engines/HyperMillCycleDefaultsEngine.js";

describe("HyperMillCycleDefaultsEngine", () => {
  it("lists all cycle defaults", () => {
    const all = cycleDefaults.listAll();
    expect(all.length).toBeGreaterThanOrEqual(20);
  });

  it("stats returns valid counts", () => {
    const s = cycleDefaults.stats();
    expect(s.totalCycles).toBeGreaterThanOrEqual(20);
    expect(s.paramCount).toBeGreaterThan(100);
    expect(s.formulaCount).toBeGreaterThan(10);
    expect(s.formulaVars).toContain("T:Dia");
    expect(s.formulaVars).toContain("mtol");
  });

  it("getByCode returns 3D Z-Level Finishing", () => {
    const c = cycleDefaults.getByCode("hmSlf3");
    expect(c).toBeDefined();
    expect(c!.displayName).toBe("3D Z-Level Finishing");
    expect(c!.category).toBe("3d_milling");
    expect(c!.collision.holderClearance).toBe(0.25);
    expect(c!.collision.headClearance).toBe(1.5);
  });

  it("getByCode returns null for unknown", () => {
    expect(cycleDefaults.getByCode("nonexistent")).toBeNull();
  });

  it("search finds turning cycles", () => {
    const results = cycleDefaults.search("turning");
    expect(results.length).toBeGreaterThanOrEqual(3);
  });

  it("byCategory returns 3d_milling cycles", () => {
    const results = cycleDefaults.byCategory("3d_milling");
    expect(results.length).toBeGreaterThanOrEqual(3);
  });

  it("withFormulas returns cycles with formula params", () => {
    const results = cycleDefaults.withFormulas();
    expect(results.length).toBeGreaterThanOrEqual(5);
  });

  it("resolveFormula computes T:Dia*0.35 correctly", () => {
    const val = cycleDefaults.resolveFormula("T:Dia*0.35", { toolDiameter: 10 });
    expect(val).toBeCloseTo(3.5);
  });

  it("resolveFormula computes mtol*0.9 correctly", () => {
    const val = cycleDefaults.resolveFormula("mtol*0.9", { machineTolerance: 0.01 });
    expect(val).toBeCloseTo(0.009);
  });

  it("resolveFormula handles pipe-separated APPROXRES", () => {
    const val = cycleDefaults.resolveFormula(
      "mtol*0.9|mtol*0.1|mtol*0.1",
      { machineTolerance: 0.01 }
    );
    expect(val).toBeCloseTo(0.009);
  });

  it("resolveDefaults returns resolved values for hmSlf3", () => {
    const r = cycleDefaults.resolveDefaults("hmSlf3", {
      toolDiameter: 10, machineTolerance: 0.01,
    });
    expect(r).toBeDefined();
    expect(r!.PRECISION).toBe(0.005);
    expect(r!.SICHEBENE).toBe(100);
  });

  it("collisionDefaults returns standard clearances", () => {
    const d = cycleDefaults.collisionDefaults();
    expect(d.holderClearance).toBe(0.25);
    expect(d.shankClearance).toBe(0.05);
    expect(d.headClearance).toBe(1.5);
  });

  it("macroFormulas returns standard approach/retract formulas", () => {
    const f = cycleDefaults.macroFormulas();
    expect(f.approachLength).toBe("T:Dia*0.35");
    expect(f.retractClearSide).toBe("T:Rad*0.25");
  });

  it("byCategory millturn_grooving has groove cycles", () => {
    const results = cycleDefaults.byCategory("millturn_grooving");
    expect(results.length).toBeGreaterThanOrEqual(5);
    expect(results.some(c => c.displayName.includes("Face Groove"))).toBe(true);
  });

  it("groove cycles have correct FRTYP codes", () => {
    const grvf = cycleDefaults.getByCode("hmGrvf");
    expect(grvf!.toolType).toBe(103); // grooving_tool
    const fgvf = cycleDefaults.getByCode("hmFgvf");
    expect(fgvf!.toolType).toBe(104); // grooving_insert (face groove)
  });

  it("getByCode returns 3D Form Pocket Milling", () => {
    const c = cycleDefaults.getByCode("hmForm");
    expect(c).toBeDefined();
    expect(c!.category).toBe("3d_milling");
    expect(c!.collision.holderClearance).toBe(0.25);
    expect(c!.params.SKIP_SMALL_POCKETS.value).toBe(1);
  });

  it("getByCode returns Turning Parting/Cutoff", () => {
    const c = cycleDefaults.getByCode("hmCpt");
    expect(c).toBeDefined();
    expect(c!.category).toBe("turning");
    expect(c!.toolType).toBe(105); // parting_tool
    expect(c!.params.RETRACT_ANGLE.value).toBe(90);
  });

  it("byCategory setup returns alignment and converter cycles", () => {
    const results = cycleDefaults.byCategory("setup");
    expect(results.length).toBeGreaterThanOrEqual(2);
    expect(results.some(c => c.code === "hmHcmp")).toBe(true);
    expect(results.some(c => c.code === "hmConv")).toBe(true);
  });

  it("EDM cycle has enriched parameters", () => {
    const edm = cycleDefaults.getByCode("hmEdm2");
    expect(edm).toBeDefined();
    expect(edm!.params.PRFRES.isFormula).toBe(true);
    expect(edm!.params.PRECISION.value).toBe(0.01);
    expect(edm!.machining.stepdown).toBe(10);
  });
});

// ============================================================================
// HyperMillThreadStandardEngine
// ============================================================================
import { hyperMillThreadStandardEngine as threadEngine } from "../engines/HyperMillThreadStandardEngine.js";

describe("HyperMillThreadStandardEngine", () => {
  it("lists 11 thread standards", () => {
    const stds = threadEngine.listStandards();
    expect(stds.length).toBe(11);
    expect(stds.map(s => s.id)).toContain("iso_metric");
    expect(stds.map(s => s.id)).toContain("ansi_unified");
  });

  it("stats returns valid counts", () => {
    const s = threadEngine.stats();
    expect(s.standardCount).toBe(11);
    expect(s.totalEntries).toBeGreaterThanOrEqual(70);
    expect(s.populatedStandards).toBeGreaterThanOrEqual(2);
  });

  it("getStandard returns ISO Metric with entries", () => {
    const std = threadEngine.getStandard("iso_metric");
    expect(std).toBeDefined();
    expect(std!.entries.length).toBeGreaterThanOrEqual(40);
    expect(std!.unit).toBe("mm");
  });

  it("getStandard returns null for unknown", () => {
    expect(threadEngine.getStandard("nonexistent")).toBeNull();
  });

  it("search finds M10 threads", () => {
    const results = threadEngine.search("M10");
    expect(results.length).toBeGreaterThanOrEqual(2);
    expect(results.every(r => r.designation.includes("M10"))).toBe(true);
  });

  it("search finds 1/4-20 UNC", () => {
    const results = threadEngine.search("1/4-20");
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].pitchUnit).toBe("tpi");
  });

  it("findBySize finds M8 threads", () => {
    const results = threadEngine.findBySize(8);
    expect(results.length).toBeGreaterThanOrEqual(2);
  });

  it("findBySize with pitch finds specific thread", () => {
    const results = threadEngine.findBySize(10, 1.5);
    expect(results.length).toBe(1);
    expect(results[0].designation).toBe("M10x1.5");
  });

  it("getTapDrill returns correct drill for M8x1.25", () => {
    const drill = threadEngine.getTapDrill("M8x1.25");
    expect(drill).toBe(6.8);
  });

  it("getTapDrill returns null for unknown", () => {
    expect(threadEngine.getTapDrill("M999x99")).toBeNull();
  });

  it("getMinorDia returns correct value for M10x1.5", () => {
    const dia = threadEngine.getMinorDia("M10x1.5");
    expect(dia).toBeCloseTo(8.376, 2);
  });
});
