/**
 * HM-REV-MS12 Skills Phase 2+3 + Scripts + Hooks Test Suite
 * ===========================================================
 * Tests for:
 *   - HyperMillSkillRegistryMap: 15 entries, engine dep mapping, category/effort queries
 *   - All 6 HyperMillSafetyHooks validators with extended edge-case coverage
 *   - cam:hypermill_batch_script action existence in camDispatcher ACTIONS
 *
 * ALL assertions use specific expected values — NO toBeTruthy() / toBeDefined() only.
 *
 * HM-REV-MS12 / U-HMR64
 */

import { describe, it, expect } from "vitest";

// ── Registry imports ─────────────────────────────────────────────────────────
import {
  HyperMillSkillRegistryMap,
  hyperMillSkillRegistryMap,
  type HyperMillSkillEntry,
  type SkillEffort,
} from "../engines/HyperMillSkillRegistryMap.js";

// ── Safety hooks imports ──────────────────────────────────────────────────────
import {
  validateClearancePlane,
  validateNegativeAllowance,
  validateGeometryCheckEnabled,
  validateMeasurementSystem,
  validateTurningHPM,
  validateRestMaterialToolChange,
} from "../engines/HyperMillSafetyHooks.js";

// ── Dispatcher ACTIONS import (anti-regression check) ────────────────────────
import { ACTIONS } from "../tools/dispatchers/camDispatcher.js";

// ============================================================================
// Part 1: HyperMillSkillRegistryMap
// ============================================================================

describe("HyperMillSkillRegistryMap — singleton export", () => {
  it("exports a singleton instance of HyperMillSkillRegistryMap", () => {
    expect(hyperMillSkillRegistryMap).toBeInstanceOf(HyperMillSkillRegistryMap);
  });

  it("can also instantiate a fresh instance independently", () => {
    const fresh = new HyperMillSkillRegistryMap();
    expect(fresh.listSkills()).toHaveLength(15);
  });
});

describe("HyperMillSkillRegistryMap.listSkills()", () => {
  it("returns exactly 15 skills", () => {
    const skills = hyperMillSkillRegistryMap.listSkills();
    expect(skills).toHaveLength(15);
  });

  it("every skill has required fields: name, description, primaryAction, actions, engineDependencies, effort, category", () => {
    const skills = hyperMillSkillRegistryMap.listSkills();
    for (const s of skills) {
      expect(s.name).toBeTruthy();
      expect(s.description.length).toBeGreaterThan(10);
      expect(s.primaryAction).toBeTruthy();
      expect(Array.isArray(s.actions)).toBe(true);
      expect(s.actions.length).toBeGreaterThanOrEqual(1);
      expect(Array.isArray(s.engineDependencies)).toBe(true);
      expect(s.engineDependencies.length).toBeGreaterThanOrEqual(1);
      expect(["LOW", "MEDIUM", "HIGH"]).toContain(s.effort);
      expect(["core", "operational"]).toContain(s.category);
    }
  });

  it("all skill names start with 'hypermill-'", () => {
    const skills = hyperMillSkillRegistryMap.listSkills();
    for (const s of skills) {
      expect(s.name.startsWith("hypermill-")).toBe(true);
    }
  });
});

describe("HyperMillSkillRegistryMap.getSkill()", () => {
  it("returns hypermill-material-lookup with correct primary action", () => {
    const s = hyperMillSkillRegistryMap.getSkill("hypermill-material-lookup");
    expect(s).not.toBeNull();
    expect(s!.primaryAction).toBe("cam_hypermill_material_to_physics");
  });

  it("hypermill-material-lookup has 2 engine dependencies", () => {
    const s = hyperMillSkillRegistryMap.getSkill("hypermill-material-lookup");
    expect(s!.engineDependencies).toHaveLength(2);
    expect(s!.engineDependencies).toContain("HyperMillMaterialPhysicsBridge");
    expect(s!.engineDependencies).toContain("HyperMillMaterialMapEngine");
  });

  it("returns hypermill-speeds-feeds with effort MEDIUM", () => {
    const s = hyperMillSkillRegistryMap.getSkill("hypermill-speeds-feeds");
    expect(s).not.toBeNull();
    expect(s!.effort).toBe("MEDIUM");
    expect(s!.category).toBe("core");
  });

  it("hypermill-speeds-feeds has SpeedFeedOrchestratorEngine dependency", () => {
    const s = hyperMillSkillRegistryMap.getSkill("hypermill-speeds-feeds");
    expect(s!.engineDependencies).toContain("SpeedFeedOrchestratorEngine");
  });

  it("returns hypermill-full-job with effort HIGH and category operational", () => {
    const s = hyperMillSkillRegistryMap.getSkill("hypermill-full-job");
    expect(s!.effort).toBe("HIGH");
    expect(s!.category).toBe("operational");
  });

  it("hypermill-full-job has 7 engine dependencies (most comprehensive skill)", () => {
    const s = hyperMillSkillRegistryMap.getSkill("hypermill-full-job");
    expect(s!.engineDependencies).toHaveLength(7);
  });

  it("returns null for an unknown skill name", () => {
    const s = hyperMillSkillRegistryMap.getSkill("nonexistent-skill");
    expect(s).toBeNull();
  });

  it("returns null for empty string", () => {
    const s = hyperMillSkillRegistryMap.getSkill("");
    expect(s).toBeNull();
  });
});

describe("HyperMillSkillRegistryMap.getEngineMap()", () => {
  it("returns a map with exactly 15 keys", () => {
    const map = hyperMillSkillRegistryMap.getEngineMap();
    expect(Object.keys(map)).toHaveLength(15);
  });

  it("maps hypermill-safety-audit to HyperMillSafetyHooks", () => {
    const map = hyperMillSkillRegistryMap.getEngineMap();
    expect(map["hypermill-safety-audit"]).toContain("HyperMillSafetyHooks");
  });

  it("maps hypermill-nc-generate to HyperMillCodeGeneratorEngine", () => {
    const map = hyperMillSkillRegistryMap.getEngineMap();
    expect(map["hypermill-nc-generate"]).toContain("HyperMillCodeGeneratorEngine");
  });

  it("maps hypermill-drill to HyperMillThreadStandardEngine (drill uses thread engine for tap sizes)", () => {
    const map = hyperMillSkillRegistryMap.getEngineMap();
    expect(map["hypermill-drill"]).toContain("HyperMillThreadStandardEngine");
  });

  it("maps hypermill-controller-select to HyperMillControllerCatalogEngine", () => {
    const map = hyperMillSkillRegistryMap.getEngineMap();
    expect(map["hypermill-controller-select"]).toContain("HyperMillControllerCatalogEngine");
  });
});

describe("HyperMillSkillRegistryMap.byCategory()", () => {
  it("returns exactly 8 core skills", () => {
    const core = hyperMillSkillRegistryMap.byCategory("core");
    expect(core).toHaveLength(8);
  });

  it("returns exactly 7 operational skills", () => {
    const ops = hyperMillSkillRegistryMap.byCategory("operational");
    expect(ops).toHaveLength(7);
  });

  it("core skills include hypermill-drill", () => {
    const core = hyperMillSkillRegistryMap.byCategory("core");
    const names = core.map(s => s.name);
    expect(names).toContain("hypermill-drill");
  });

  it("operational skills include hypermill-nc-generate", () => {
    const ops = hyperMillSkillRegistryMap.byCategory("operational");
    const names = ops.map(s => s.name);
    expect(names).toContain("hypermill-nc-generate");
  });

  it("core + operational counts sum to 15", () => {
    const core = hyperMillSkillRegistryMap.byCategory("core");
    const ops = hyperMillSkillRegistryMap.byCategory("operational");
    expect(core.length + ops.length).toBe(15);
  });
});

describe("HyperMillSkillRegistryMap.byEngine()", () => {
  it("finds skills depending on HyperMillSafetyHooks (collision-check + safety-audit + full-job)", () => {
    const results = hyperMillSkillRegistryMap.byEngine("HyperMillSafetyHooks");
    const names = results.map(s => s.name);
    expect(names).toContain("hypermill-safety-audit");
    expect(names).toContain("hypermill-collision-check");
    expect(names).toContain("hypermill-full-job");
    expect(results.length).toBeGreaterThanOrEqual(3);
  });

  it("finds skills depending on SpeedFeedOrchestratorEngine (speeds-feeds + full-job)", () => {
    const results = hyperMillSkillRegistryMap.byEngine("SpeedFeedOrchestratorEngine");
    const names = results.map(s => s.name);
    expect(names).toContain("hypermill-speeds-feeds");
    expect(names).toContain("hypermill-full-job");
    expect(results.length).toBeGreaterThanOrEqual(2);
  });

  it("byEngine is case-insensitive: 'safety' matches HyperMillSafetyHooks", () => {
    const byLower = hyperMillSkillRegistryMap.byEngine("safety");
    expect(byLower.length).toBeGreaterThanOrEqual(1);
  });

  it("returns empty array for unknown engine name", () => {
    const results = hyperMillSkillRegistryMap.byEngine("NonExistentEngine999");
    expect(results).toHaveLength(0);
  });
});

describe("HyperMillSkillRegistryMap.byEffort()", () => {
  it("returns skills with effort LOW — hypermill-material-lookup is LOW", () => {
    const low = hyperMillSkillRegistryMap.byEffort("LOW");
    const names = low.map(s => s.name);
    expect(names).toContain("hypermill-material-lookup");
    expect(names).toContain("hypermill-drill");
    expect(names).toContain("hypermill-thread");
  });

  it("returns skills with effort HIGH — hypermill-3d-strategy is HIGH", () => {
    const high = hyperMillSkillRegistryMap.byEffort("HIGH");
    const names = high.map(s => s.name);
    expect(names).toContain("hypermill-3d-strategy");
    expect(names).toContain("hypermill-full-job");
    expect(names).toContain("hypermill-nc-generate");
  });

  it("LOW + MEDIUM + HIGH effort counts sum to 15", () => {
    const low = hyperMillSkillRegistryMap.byEffort("LOW");
    const med = hyperMillSkillRegistryMap.byEffort("MEDIUM");
    const high = hyperMillSkillRegistryMap.byEffort("HIGH");
    expect(low.length + med.length + high.length).toBe(15);
  });
});

describe("HyperMillSkillRegistryMap.stats()", () => {
  it("returns total=15, core=8, operational=7", () => {
    const s = hyperMillSkillRegistryMap.stats();
    expect(s.total).toBe(15);
    expect(s.core).toBe(8);
    expect(s.operational).toBe(7);
  });

  it("byEffort values sum to 15", () => {
    const s = hyperMillSkillRegistryMap.stats();
    const sum = s.byEffort.LOW + s.byEffort.MEDIUM + s.byEffort.HIGH;
    expect(sum).toBe(15);
  });

  it("byEffort.LOW, MEDIUM, HIGH are all non-negative integers", () => {
    const s = hyperMillSkillRegistryMap.stats();
    expect(s.byEffort.LOW).toBeGreaterThanOrEqual(0);
    expect(s.byEffort.MEDIUM).toBeGreaterThanOrEqual(0);
    expect(s.byEffort.HIGH).toBeGreaterThanOrEqual(0);
    expect(Number.isInteger(s.byEffort.LOW)).toBe(true);
    expect(Number.isInteger(s.byEffort.MEDIUM)).toBe(true);
    expect(Number.isInteger(s.byEffort.HIGH)).toBe(true);
  });
});

// ============================================================================
// Part 2: HyperMillSafetyHooks — extended coverage for all 6 validators
// ============================================================================

describe("validateClearancePlane — extended edge cases", () => {
  it("valid: clearance 50mm above highest obstruction", () => {
    const r = validateClearancePlane({
      clearancePlaneZ: 100,
      workpieceTopZ: 50,
      stockTopZ: 40,
    });
    expect(r.valid).toBe(true);
    expect(r.warnings).toHaveLength(0);
  });

  it("CRITICAL: clearance plane exactly at workpiece top (no headroom)", () => {
    const r = validateClearancePlane({
      clearancePlaneZ: 50,
      workpieceTopZ: 50,
      stockTopZ: 30,
    });
    expect(r.valid).toBe(false);
    expect(r.warnings).toHaveLength(1);
    expect(r.warnings[0]).toContain("CRITICAL");
    expect(r.warnings[0]).toContain("Z=50");
  });

  it("CRITICAL: clearance plane BELOW fixture top when fixture is tallest", () => {
    const r = validateClearancePlane({
      clearancePlaneZ: 80,
      workpieceTopZ: 50,
      stockTopZ: 40,
      fixtureTopZ: 90,
    });
    expect(r.valid).toBe(false);
    expect(r.warnings[0]).toContain("CRITICAL");
    expect(r.warnings[0]).toContain("Z=90");
  });

  it("WARNING: clearance plane only 1mm above highest point (< 2mm threshold)", () => {
    const r = validateClearancePlane({
      clearancePlaneZ: 51,
      workpieceTopZ: 50,
      stockTopZ: 40,
    });
    expect(r.valid).toBe(false);
    expect(r.warnings[0]).toContain("WARNING");
    expect(r.warnings[0]).toContain("1.0mm");
  });

  it("valid: no fixture — clearance plane 10mm above stock (sufficient margin)", () => {
    const r = validateClearancePlane({
      clearancePlaneZ: 60,
      workpieceTopZ: 50,
      stockTopZ: 50,
    });
    expect(r.valid).toBe(true);
    expect(r.warnings).toHaveLength(0);
  });

  it("CRITICAL: clearance plane negative — below zero workpiece", () => {
    const r = validateClearancePlane({
      clearancePlaneZ: -5,
      workpieceTopZ: 0,
      stockTopZ: 0,
    });
    expect(r.valid).toBe(false);
    expect(r.warnings[0]).toContain("CRITICAL");
  });
});

describe("validateNegativeAllowance — extended edge cases", () => {
  it("valid: positive allowance returns early with no warnings", () => {
    const r = validateNegativeAllowance({
      allowanceMm: 0.5,
      toolRadiusMm: 5,
      toolCornerRadiusMm: 0.5,
    });
    expect(r.valid).toBe(true);
    expect(r.warnings).toHaveLength(0);
  });

  it("valid: zero allowance returns early", () => {
    const r = validateNegativeAllowance({
      allowanceMm: 0,
      toolRadiusMm: 5,
      toolCornerRadiusMm: 0.5,
    });
    expect(r.valid).toBe(true);
    expect(r.warnings).toHaveLength(0);
  });

  it("CRITICAL: allowance -0.6mm, corner radius 0.4mm → sum negative (-0.2)", () => {
    const r = validateNegativeAllowance({
      allowanceMm: -0.6,
      toolRadiusMm: 5,
      toolCornerRadiusMm: 0.4,
    });
    expect(r.valid).toBe(false);
    const criticals = r.warnings.filter(w => w.startsWith("CRITICAL"));
    expect(criticals.length).toBeGreaterThanOrEqual(1);
    expect(criticals[0]).toContain("-0.2");
  });

  it("WARNING: flat end mill (corner radius=0) with negative allowance", () => {
    const r = validateNegativeAllowance({
      allowanceMm: -0.1,
      toolRadiusMm: 5,
      toolCornerRadiusMm: 0,
    });
    const flatMillWarn = r.warnings.find(w => w.includes("Flat end mills"));
    expect(flatMillWarn).toBeTruthy();
    expect(flatMillWarn).toContain("corner radius=0");
  });

  it("CRITICAL: XY allowance sum exceeds tool radius limit", () => {
    const r = validateNegativeAllowance({
      allowanceMm: -1.0,
      additionalAllowanceXY: -4.5,
      toolRadiusMm: 5,
      toolCornerRadiusMm: 0.5,
      machiningToleranceMm: 0.01,
    });
    // |(-1.0) + (-4.5)| = 5.5 >= 5 - 0.01 = 4.99 → CRITICAL
    const criticals = r.warnings.filter(w => w.startsWith("CRITICAL"));
    expect(criticals.length).toBeGreaterThanOrEqual(1);
  });

  it("INFO: negative allowance within safe range generates max-gap info message", () => {
    const r = validateNegativeAllowance({
      allowanceMm: -0.2,
      toolRadiusMm: 5,
      toolCornerRadiusMm: 0.5,
    });
    // allowance + corner radius = 0.3 > 0 → valid; but INFO about max gap
    const infoMsg = r.warnings.find(w => w.startsWith("INFO"));
    expect(infoMsg).toBeTruthy();
    // maxGap = 2 * (5 + (-0.2)) = 9.6
    expect(infoMsg).toContain("9.60");
  });
});

describe("validateGeometryCheckEnabled — full coverage", () => {
  it("valid: geometry check enabled returns valid with no warnings", () => {
    const r = validateGeometryCheckEnabled({ automaticGeometryCheck: true });
    expect(r.valid).toBe(true);
    expect(r.warnings).toHaveLength(0);
  });

  it("invalid: geometry check disabled returns valid=false with exactly 1 warning", () => {
    const r = validateGeometryCheckEnabled({ automaticGeometryCheck: false });
    expect(r.valid).toBe(false);
    expect(r.warnings).toHaveLength(1);
  });

  it("warning message references hyperMILL Manual 1, p.36", () => {
    const r = validateGeometryCheckEnabled({ automaticGeometryCheck: false });
    expect(r.warnings[0]).toContain("hyperMILL Manual 1, p.36");
  });

  it("warning message mentions 'DISABLED' and 'Automatic geometry check'", () => {
    const r = validateGeometryCheckEnabled({ automaticGeometryCheck: false });
    expect(r.warnings[0]).toContain("DISABLED");
    expect(r.warnings[0]).toContain("Automatic geometry check");
  });

  it("warning message mentions the re-enable path in Setup > Settings", () => {
    const r = validateGeometryCheckEnabled({ automaticGeometryCheck: false });
    expect(r.warnings[0]).toContain("Setup");
  });
});

describe("validateMeasurementSystem — extended edge cases", () => {
  it("valid: both metric with existing jobs", () => {
    const r = validateMeasurementSystem({
      currentSystem: "metric",
      projectSystem: "metric",
      hasExistingJobs: true,
    });
    expect(r.valid).toBe(true);
    expect(r.warnings).toHaveLength(0);
  });

  it("valid: both inch with existing jobs", () => {
    const r = validateMeasurementSystem({
      currentSystem: "inch",
      projectSystem: "inch",
      hasExistingJobs: true,
    });
    expect(r.valid).toBe(true);
    expect(r.warnings).toHaveLength(0);
  });

  it("CRITICAL: metric → inch mismatch with existing jobs", () => {
    const r = validateMeasurementSystem({
      currentSystem: "inch",
      projectSystem: "metric",
      hasExistingJobs: true,
    });
    expect(r.valid).toBe(false);
    expect(r.warnings).toHaveLength(1);
    expect(r.warnings[0]).toContain("CRITICAL");
    expect(r.warnings[0]).toContain("metric");
    expect(r.warnings[0]).toContain("inch");
  });

  it("valid: mismatch BUT no existing jobs (safe to switch)", () => {
    const r = validateMeasurementSystem({
      currentSystem: "inch",
      projectSystem: "metric",
      hasExistingJobs: false,
    });
    expect(r.valid).toBe(true);
    expect(r.warnings).toHaveLength(0);
  });

  it("warning cites hyperMILL Manual 1, p.35", () => {
    const r = validateMeasurementSystem({
      currentSystem: "metric",
      projectSystem: "inch",
      hasExistingJobs: true,
    });
    expect(r.warnings[0]).toContain("p.35");
  });

  it("warning mentions 'NOT be converted'", () => {
    const r = validateMeasurementSystem({
      currentSystem: "metric",
      projectSystem: "inch",
      hasExistingJobs: true,
    });
    expect(r.warnings[0]).toContain("NOT be converted");
  });
});

describe("validateTurningHPM — full coverage", () => {
  it("valid: HPM enabled with round insert", () => {
    const r = validateTurningHPM({
      highPerformanceMode: true,
      insertType: "round",
    });
    expect(r.valid).toBe(true);
    expect(r.warnings).toHaveLength(0);
  });

  it("valid: HPM disabled with any insert type (no restriction)", () => {
    const insertTypes: Array<"round" | "diamond" | "square" | "trigon" | "other"> = [
      "diamond", "square", "trigon", "other"
    ];
    for (const insertType of insertTypes) {
      const r = validateTurningHPM({ highPerformanceMode: false, insertType });
      expect(r.valid).toBe(true);
      expect(r.warnings).toHaveLength(0);
    }
  });

  it("WARNING: HPM enabled with diamond insert", () => {
    const r = validateTurningHPM({
      highPerformanceMode: true,
      insertType: "diamond",
    });
    expect(r.valid).toBe(false);
    expect(r.warnings).toHaveLength(1);
    expect(r.warnings[0]).toContain("diamond");
    expect(r.warnings[0]).toContain("round");
  });

  it("WARNING: HPM enabled with square insert — message references Manual 2 p.303", () => {
    const r = validateTurningHPM({
      highPerformanceMode: true,
      insertType: "square",
    });
    expect(r.valid).toBe(false);
    expect(r.warnings[0]).toContain("hyperMILL Manual 2, p.303");
  });

  it("WARNING: HPM enabled with trigon insert", () => {
    const r = validateTurningHPM({
      highPerformanceMode: true,
      insertType: "trigon",
    });
    expect(r.valid).toBe(false);
    expect(r.warnings[0]).toContain("trigon");
  });

  it("WARNING: HPM enabled with 'other' insert type", () => {
    const r = validateTurningHPM({
      highPerformanceMode: true,
      insertType: "other",
    });
    expect(r.valid).toBe(false);
    expect(r.warnings).toHaveLength(1);
    expect(r.warnings[0]).toContain("High Performance Mode");
  });
});

describe("validateRestMaterialToolChange — extended edge cases", () => {
  it("valid: not a rest material cycle — no warning regardless of diameter change", () => {
    const r = validateRestMaterialToolChange({
      previousToolDiameterMm: 10,
      currentToolDiameterMm: 8,
      isRestMaterialCycle: false,
      restMaterialToolDiameterMm: 10,
    });
    expect(r.valid).toBe(true);
    expect(r.warnings).toHaveLength(0);
  });

  it("valid: rest material cycle and diameters match exactly", () => {
    const r = validateRestMaterialToolChange({
      previousToolDiameterMm: 10,
      currentToolDiameterMm: 10,
      isRestMaterialCycle: true,
      restMaterialToolDiameterMm: 10,
    });
    expect(r.valid).toBe(true);
    expect(r.warnings).toHaveLength(0);
  });

  it("valid: rest material cycle but restMaterialToolDiameterMm is undefined", () => {
    const r = validateRestMaterialToolChange({
      previousToolDiameterMm: 10,
      currentToolDiameterMm: 8,
      isRestMaterialCycle: true,
      restMaterialToolDiameterMm: undefined,
    });
    expect(r.valid).toBe(true);
    expect(r.warnings).toHaveLength(0);
  });

  it("WARNING: rest material cycle with mismatched reference diameter (10 vs 8)", () => {
    const r = validateRestMaterialToolChange({
      previousToolDiameterMm: 10,
      currentToolDiameterMm: 8,
      isRestMaterialCycle: true,
      restMaterialToolDiameterMm: 8,
    });
    expect(r.valid).toBe(false);
    expect(r.warnings).toHaveLength(1);
    expect(r.warnings[0]).toContain("10mm");
    expect(r.warnings[0]).toContain("8mm");
  });

  it("WARNING cites hyperMILL Manual 3, p.638", () => {
    const r = validateRestMaterialToolChange({
      previousToolDiameterMm: 12,
      currentToolDiameterMm: 10,
      isRestMaterialCycle: true,
      restMaterialToolDiameterMm: 10,
    });
    expect(r.warnings[0]).toContain("Manual 3, p.638");
  });

  it("WARNING mentions risk of tool plunging into material", () => {
    const r = validateRestMaterialToolChange({
      previousToolDiameterMm: 20,
      currentToolDiameterMm: 16,
      isRestMaterialCycle: true,
      restMaterialToolDiameterMm: 16,
    });
    expect(r.warnings[0]).toContain("plunging");
  });
});

// ============================================================================
// Part 3: cam:hypermill_batch_script wiring in camDispatcher
// ============================================================================

describe("camDispatcher ACTIONS — hypermill_batch_script wiring (MS12 anti-regression)", () => {
  it("ACTIONS array contains 'hypermill_batch_script'", () => {
    const actionsArray = ACTIONS as unknown as readonly string[];
    expect(actionsArray).toContain("hypermill_batch_script");
  });

  it("ACTIONS array is readonly (does not become undefined)", () => {
    expect(ACTIONS).toBeDefined();
    expect(Array.isArray(ACTIONS)).toBe(true);
  });

  it("ACTIONS total count is above 540 (anti-regression: never decrease)", () => {
    expect(ACTIONS.length).toBeGreaterThan(540);
  });

  it("ACTIONS still contains pre-existing hypermill_ppp_process (MS11 anti-regression)", () => {
    const actionsArray = ACTIONS as unknown as readonly string[];
    expect(actionsArray).toContain("hypermill_ppp_process");
  });

  it("ACTIONS still contains cam_safety_validate (cross-check safety routing)", () => {
    const actionsArray = ACTIONS as unknown as readonly string[];
    expect(actionsArray).toContain("cam_safety_validate");
  });

  it("ACTIONS still contains hypermill_tool_export (MS9 anti-regression)", () => {
    const actionsArray = ACTIONS as unknown as readonly string[];
    expect(actionsArray).toContain("hypermill_tool_export");
  });

  it("ACTIONS still contains hypermill_code_generate (older wiring anti-regression)", () => {
    const actionsArray = ACTIONS as unknown as readonly string[];
    expect(actionsArray).toContain("hypermill_code_generate");
  });
});
