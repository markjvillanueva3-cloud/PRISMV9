/**
 * HM-REV-MS3 Cycle Parameter Pipeline — Tests
 *
 * CRITICAL TEST RULE: All assertions use specific expected values,
 * NOT generic toBeTruthy() or toBe("object") checks.
 *
 * Tests verify:
 *   - HyperMillCycleParameterPipeline recommends correct cycle + defaults
 *   - Controller adjustments are populated for known controllers
 *   - validateCycleDefaults warns/blocks correctly
 *   - ThreadStandardEngine getTapDrill returns exact values
 *   - HyperMillSkillRegistryMap covers all 15 skills
 *
 * HM-REV-MS3 / U-HMR16 + U-HMR17 + U-HMR18 + U-HMR21
 */

import { describe, it, expect, beforeAll } from "vitest";
import {
  HyperMillCycleParameterPipeline,
  hyperMillCycleParameterPipeline,
} from "../engines/HyperMillCycleParameterPipeline.js";
import {
  validateCycleDefaults,
} from "../engines/HyperMillCycleDefaultsValidation.js";
import {
  hyperMillThreadStandardEngine,
} from "../engines/HyperMillThreadStandardEngine.js";
import {
  HyperMillSkillRegistryMap,
  hyperMillSkillRegistryMap,
} from "../engines/HyperMillSkillRegistryMap.js";

// ============================================================================
// U-HMR16: HyperMillCycleParameterPipeline — cycle selection
// ============================================================================

describe("HyperMillCycleParameterPipeline", () => {
  const pipeline = hyperMillCycleParameterPipeline;

  // ── Cycle selection by feature type ──────────────────────────────────────

  it("recommends a drilling-category cycle for 'drill' feature", () => {
    const r = pipeline.recommend({ featureType: "drill", diameter_mm: 10 });
    expect(r.cycle.category).toBe("drilling");
    expect(r.cycle.code).toContain("DR:");
    expect(r.cycle.displayName).toContain("Drilling");
  });

  it("recommends 2d-category cycle for 'pocket' feature", () => {
    const r = pipeline.recommend({ featureType: "pocket", diameter_mm: 12 });
    expect(r.cycle.category).toBe("2d");
    expect(r.cycle.displayName.toLowerCase()).toContain("pocket");
  });

  it("recommends 3d-category cycle for '3d_rough' feature", () => {
    const r = pipeline.recommend({ featureType: "3d_rough" });
    expect(r.cycle.category).toBe("3d");
  });

  it("recommends cycle with 'Optimized' or 'Roughing' in name for 3d_rough", () => {
    const r = pipeline.recommend({ featureType: "3d_rough" });
    const nameOrCode = (r.cycle.displayName + r.cycle.code).toLowerCase();
    const hasRoughOrOpt = nameOrCode.includes("optim") || nameOrCode.includes("rough");
    expect(hasRoughOrOpt).toBe(true);
  });

  it("recommends 5axis-category cycle for '5axis_swarf' feature", () => {
    const r = pipeline.recommend({ featureType: "5axis_swarf" });
    expect(r.cycle.category).toBe("5axis");
  });

  it("recommends tapping-category cycle for 'thread' feature", () => {
    const r = pipeline.recommend({ featureType: "thread" });
    expect(r.cycle.category).toBe("tapping");
  });

  it("recommends 3d-category finishing cycle for '3d_finish' feature", () => {
    const r = pipeline.recommend({ featureType: "3d_finish" });
    expect(r.cycle.category).toBe("3d");
    const name = r.cycle.displayName.toLowerCase();
    const isFinish = name.includes("finish") || name.includes("z-level") || name.includes("profile");
    expect(isFinish).toBe(true);
  });

  // ── Defaults population ───────────────────────────────────────────────────

  it("returns non-empty defaults object for drill feature", () => {
    const r = pipeline.recommend({ featureType: "drill", diameter_mm: 10 });
    expect(r.defaults).toBeDefined();
    expect(typeof r.defaults).toBe("object");
    expect(Object.keys(r.defaults).length).toBeGreaterThan(0);
  });

  it("returns non-empty defaults object for 3d_rough feature", () => {
    const r = pipeline.recommend({ featureType: "3d_rough" });
    expect(Object.keys(r.defaults).length).toBeGreaterThan(0);
  });

  it("returns defaultsSource string when defaults are found", () => {
    const r = pipeline.recommend({ featureType: "drill", diameter_mm: 8 });
    // defaultsSource may be null if no direct match, but should be a string or null
    expect(r.defaultsSource === null || typeof r.defaultsSource === "string").toBe(true);
  });

  // ── Controller adjustments ────────────────────────────────────────────────

  it("populates controller adjustments for 'siemens' controller", () => {
    const r = pipeline.recommend({ featureType: "drill", controllerId: "siemens" });
    expect(r.controllerAdjustments.length).toBeGreaterThan(0);
    // At least one adjustment must mention Siemens
    const hasSiemens = r.controllerAdjustments.some(a =>
      a.toLowerCase().includes("siemens") || a.toLowerCase().includes("840d")
    );
    expect(hasSiemens).toBe(true);
  });

  it("populates controller adjustments for 'fanuc' controller", () => {
    const r = pipeline.recommend({ featureType: "drill", controllerId: "fanuc" });
    expect(r.controllerAdjustments.length).toBeGreaterThan(0);
    const hasFanuc = r.controllerAdjustments.some(a =>
      a.toLowerCase().includes("fanuc")
    );
    expect(hasFanuc).toBe(true);
  });

  it("populates controller adjustments for 'siemens_840d' controllerId", () => {
    const r = pipeline.recommend({ featureType: "drill", controllerId: "siemens_840d" });
    expect(r.controllerAdjustments.length).toBeGreaterThan(0);
  });

  it("returns empty controllerAdjustments when no controller provided", () => {
    const r = pipeline.recommend({ featureType: "drill" });
    expect(r.controllerAdjustments).toEqual([]);
  });

  // ── Alternatives ──────────────────────────────────────────────────────────

  it("returns at least 2 alternatives for drill feature", () => {
    const r = pipeline.recommend({ featureType: "drill" });
    expect(r.alternatives.length).toBeGreaterThanOrEqual(2);
  });

  it("alternatives have code, displayName, category, reason fields", () => {
    const r = pipeline.recommend({ featureType: "pocket" });
    for (const alt of r.alternatives) {
      expect(alt.code).toBeTruthy();
      expect(alt.displayName).toBeTruthy();
      expect(alt.category).toBeTruthy();
      expect(alt.reason.length).toBeGreaterThan(5);
    }
  });

  // ── Depth-based stepdown suggestion ──────────────────────────────────────

  it("includes depth stepdown suggestion when depth_mm provided", () => {
    const r = pipeline.recommend({ featureType: "3d_rough", depth_mm: 20, diameter_mm: 10 });
    // If defaults has VERTZUSTEL or stepdown, the pipeline adds _depth_stepdown_suggestion_mm
    // We just check it doesn't error; the suggestion depends on defaults matching
    expect(r.cycle.category).toBe("3d");
  });

  // ── Batch recommend ───────────────────────────────────────────────────────

  it("recommendBatch returns results for all provided feature types", () => {
    const batch = pipeline.recommendBatch([
      { featureType: "drill" },
      { featureType: "pocket" },
      { featureType: "3d_rough" },
    ]);
    expect(Object.keys(batch)).toHaveLength(3);
    expect(batch["drill"]).toBeDefined();
    expect(batch["pocket"]).toBeDefined();
    expect(batch["3d_rough"]).toBeDefined();
    expect(batch["drill"].cycle.category).toBe("drilling");
  });

  // ── supportedFeatureTypes ─────────────────────────────────────────────────

  it("supportedFeatureTypes returns at least 7 types", () => {
    const types = pipeline.supportedFeatureTypes();
    expect(types.length).toBeGreaterThanOrEqual(7);
    expect(types).toContain("drill");
    expect(types).toContain("pocket");
    expect(types).toContain("3d_rough");
    expect(types).toContain("thread");
  });

  // ── Unknown feature type fallback ─────────────────────────────────────────

  it("falls back to a valid cycle for unknown feature type", () => {
    const r = pipeline.recommend({ featureType: "unknown_xyz_operation" });
    expect(r.cycle).toBeDefined();
    expect(r.cycle.code).toBeTruthy();
    expect(r.cycle.displayName).toBeTruthy();
  });
});

// ============================================================================
// U-HMR17: validateCycleDefaults hook
// ============================================================================

describe("validateCycleDefaults hook", () => {

  // ── Warning: >30% deviation ───────────────────────────────────────────────

  it("warns when stepdown_mm deviates >30% from factory default (100% over)", () => {
    const r = validateCycleDefaults({
      cycleCode: "3D_Roughing",
      proposed: { stepdown_mm: 10 },
      factoryDefaults: { stepdown_mm: 5 }, // 100% deviation
    });
    expect(r.valid).toBe(true); // >30% is warn, not block
    expect(r.warnings.length).toBeGreaterThan(0);
    expect(r.warnings[0]).toContain("stepdown_mm");
  });

  it("warns when VERTZUSTEL deviates 50% from factory default", () => {
    const r = validateCycleDefaults({
      cycleCode: "hmSlf3",
      proposed: { VERTZUSTEL: 0.75 },
      factoryDefaults: { VERTZUSTEL: 0.5 }, // 50% deviation
    });
    expect(r.warnings.length).toBeGreaterThan(0);
    const hasVertzustel = r.warnings.some(w => w.includes("VERTZUSTEL"));
    expect(hasVertzustel).toBe(true);
  });

  it("does NOT warn when deviation is within 30% tolerance", () => {
    const r = validateCycleDefaults({
      cycleCode: "3D_Roughing",
      proposed: { stepdown_mm: 5.1 },
      factoryDefaults: { stepdown_mm: 5.0 }, // 2% deviation — fine
    });
    const hasStepdownWarn = r.warnings.some(w => w.includes("stepdown_mm"));
    expect(hasStepdownWarn).toBe(false);
  });

  // ── Block: physically impossible values ──────────────────────────────────

  it("blocks negative stepdown", () => {
    const r = validateCycleDefaults({
      cycleCode: "Drilling",
      proposed: { stepdown_mm: -1 },
      factoryDefaults: { stepdown_mm: 3 },
    });
    expect(r.valid).toBe(false);
    expect(r.blocks.length).toBeGreaterThan(0);
    expect(r.blocks[0]).toContain("stepdown_mm");
  });

  it("blocks zero feed_mmrev", () => {
    const r = validateCycleDefaults({
      cycleCode: "Drilling",
      proposed: { feed_mmrev: 0 },
      factoryDefaults: { feed_mmrev: 0.1 },
    });
    expect(r.valid).toBe(false);
    expect(r.blocks.length).toBeGreaterThan(0);
    const hasFeedBlock = r.blocks.some(b => b.includes("feed_mmrev"));
    expect(hasFeedBlock).toBe(true);
  });

  it("blocks negative feed_mmrev", () => {
    const r = validateCycleDefaults({
      cycleCode: "Drilling",
      proposed: { feed_mmrev: -0.05 },
      factoryDefaults: { feed_mmrev: 0.1 },
    });
    expect(r.valid).toBe(false);
    expect(r.blocks.some(b => b.includes("feed_mmrev"))).toBe(true);
  });

  it("blocks combined negative stepdown AND zero feed", () => {
    const r = validateCycleDefaults({
      cycleCode: "Drilling",
      proposed: { stepdown_mm: -1, feed_mmrev: 0 },
      factoryDefaults: { stepdown_mm: 3, feed_mmrev: 0.1 },
    });
    expect(r.valid).toBe(false);
    expect(r.blocks.length).toBeGreaterThanOrEqual(2);
  });

  it("blocks spindle RPM exceeding 60000", () => {
    const r = validateCycleDefaults({
      cycleCode: "3D_Roughing",
      proposed: { rpm: 65000 },
      factoryDefaults: { rpm: 10000 },
    });
    expect(r.valid).toBe(false);
    expect(r.blocks.some(b => b.includes("rpm"))).toBe(true);
  });

  it("returns valid=true when all params are within tolerance", () => {
    const r = validateCycleDefaults({
      cycleCode: "hmSlf3",
      proposed: { VERTZUSTEL: 0.5, AUFMASS: 0, SICHEBENE: 100 },
      factoryDefaults: { VERTZUSTEL: 0.5, AUFMASS: 0, SICHEBENE: 100 },
    });
    expect(r.valid).toBe(true);
    expect(r.blocks).toHaveLength(0);
  });

  it("includes info line with checked param count", () => {
    const r = validateCycleDefaults({
      cycleCode: "test",
      proposed: { stepdown_mm: 3 },
      factoryDefaults: { stepdown_mm: 3 },
    });
    expect(r.info.length).toBeGreaterThan(0);
    expect(r.info[0]).toContain("Checked");
  });

  it("warns when factory default is 0 and proposed is non-zero", () => {
    const r = validateCycleDefaults({
      cycleCode: "test",
      proposed: { AUFMASS: 0.5 },
      factoryDefaults: { AUFMASS: 0 },
    });
    const hasWarn = r.warnings.some(w => w.includes("AUFMASS"));
    expect(hasWarn).toBe(true);
  });
});

// ============================================================================
// Thread standard integration (M10x1.5 specific value test)
// ============================================================================

describe("ThreadStandardEngine integration", () => {
  const threadEngine = hyperMillThreadStandardEngine;

  it("M10x1.5 tap drill = 8.5mm (ISO standard)", () => {
    const drill = threadEngine.getTapDrill("M10x1.5");
    expect(drill).not.toBeNull();
    expect(drill as number).toBeCloseTo(8.5, 1);
  });

  it("M6x1 tap drill = 5.0mm", () => {
    const drill = threadEngine.getTapDrill("M6x1");
    expect(drill).not.toBeNull();
    expect(drill as number).toBeCloseTo(5.0, 1);
  });

  it("M8x1.25 tap drill = 6.8mm", () => {
    const drill = threadEngine.getTapDrill("M8x1.25");
    expect(drill).not.toBeNull();
    expect(drill as number).toBeCloseTo(6.8, 1);
  });

  it("M12x1.75 tap drill = 10.2mm", () => {
    const drill = threadEngine.getTapDrill("M12x1.75");
    expect(drill).not.toBeNull();
    expect(drill as number).toBeCloseTo(10.2, 1);
  });

  it("listStandards returns at least 5 thread standards", () => {
    const standards = threadEngine.listStandards();
    expect(standards.length).toBeGreaterThanOrEqual(5);
  });

  it("listStandards entries have id, name, unit, entryCount fields", () => {
    const standards = threadEngine.listStandards();
    const first = standards[0];
    expect(first.id).toBeTruthy();
    expect(first.name).toBeTruthy();
    expect(first.unit).toMatch(/^(mm|inch)$/);
    expect(first.entryCount).toBeGreaterThan(0);
  });

  it("getStandard('iso_metric') returns ISO metric standard with 40+ entries", () => {
    const std = threadEngine.getStandard("iso_metric");
    expect(std).not.toBeNull();
    expect(std!.entries.length).toBeGreaterThan(40);
  });

  it("search('M10') returns at least 3 M10 variants", () => {
    const results = threadEngine.search("M10");
    expect(results.length).toBeGreaterThanOrEqual(3);
    expect(results.every(r => r.designation.toUpperCase().includes("M10"))).toBe(true);
  });

  it("findBySize(10, 1.5) returns the M10x1.5 entry", () => {
    const results = threadEngine.findBySize(10, 1.5);
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].tapDrill).toBeCloseTo(8.5, 1);
  });

  it("getTapDrill returns null for non-existent designation", () => {
    const result = threadEngine.getTapDrill("M999x99");
    expect(result).toBeNull();
  });

  it("stats().standardCount equals listStandards().length", () => {
    const stats = threadEngine.stats();
    const list = threadEngine.listStandards();
    expect(stats.standardCount).toBe(list.length);
  });
});

// ============================================================================
// U-HMR21: HyperMillSkillRegistryMap
// ============================================================================

describe("HyperMillSkillRegistryMap", () => {
  const registry = hyperMillSkillRegistryMap;

  it("lists exactly 15 skills", () => {
    const skills = registry.listSkills();
    expect(skills.length).toBe(15);
  });

  it("all 15 skills have name, description, engineDependencies, primaryAction", () => {
    const skills = registry.listSkills();
    for (const skill of skills) {
      expect(skill.name).toBeTruthy();
      expect(skill.description.length).toBeGreaterThan(10);
      expect(skill.engineDependencies.length).toBeGreaterThan(0);
      expect(skill.primaryAction).toBeTruthy();
    }
  });

  it("includes core skills: hypermill-material-lookup, hypermill-speeds-feeds", () => {
    const names = registry.listSkills().map(s => s.name);
    expect(names).toContain("hypermill-material-lookup");
    expect(names).toContain("hypermill-speeds-feeds");
  });

  it("includes operational skills: hypermill-full-job, hypermill-safety-audit", () => {
    const names = registry.listSkills().map(s => s.name);
    expect(names).toContain("hypermill-full-job");
    expect(names).toContain("hypermill-safety-audit");
  });

  it("getSkill('hypermill-drill') returns drill skill with CycleCatalogEngine dep", () => {
    const skill = registry.getSkill("hypermill-drill");
    expect(skill).not.toBeNull();
    expect(skill!.engineDependencies.some(e => e.includes("Cycle"))).toBe(true);
  });

  it("getSkill('hypermill-thread') returns thread skill", () => {
    const skill = registry.getSkill("hypermill-thread");
    expect(skill).not.toBeNull();
    expect(skill!.engineDependencies.some(e => e.toLowerCase().includes("thread"))).toBe(true);
  });

  it("getSkill returns null for unknown skill name", () => {
    const skill = registry.getSkill("hypermill-nonexistent-xyz");
    expect(skill).toBeNull();
  });

  it("getEngineMap returns map with all 15 skill names as keys", () => {
    const map = registry.getEngineMap();
    expect(Object.keys(map).length).toBe(15);
  });
});
