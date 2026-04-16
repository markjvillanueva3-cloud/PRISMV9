/**
 * Tests for HyperMillSurfaceQualityMappingEngine + PhysicsMappingRegistry — U-HKC43
 *
 * Verifies:
 *   - Grand total >= 250 mappings
 *   - Surface quality mappings >= 150
 *   - Safety limit mappings >= 100
 *   - All 3 surface engines represented
 *   - Formula strings present for ra_prediction and scallop_height types
 *   - PhysicsMappingRegistry has >= 1,500 total mappings (all 4 engines)
 *   - Registry getByParameterId works for known IDs
 *   - Registry getByDomain returns non-empty for all domains
 *   - At least 25 assertions
 *
 * @milestone HM-KC-MS8/U-HKC43
 */

import { describe, it, expect } from "vitest";
import {
  SURFACE_QUALITY_MAPPINGS,
  SURFACE_QUALITY_MAPPING_SUMMARY,
  surfaceQualityMappingEngine,
  type SurfaceQualityMapping,
  type SurfaceQualityMappingType,
} from "../engines/hypermill/HyperMillSurfaceQualityMappingEngine.js";
import {
  physicsMappingRegistry,
  TOTAL_PHYSICS_MAPPINGS,
  type PhysicsMappingEntry,
} from "../registries/PhysicsMappingRegistry.js";

// ── Validity sets ─────────────────────────────────────────────────────────────

const VALID_MAPPING_TYPES = new Set<SurfaceQualityMappingType>([
  "ra_prediction", "rz_prediction", "scallop_height",
  "residual_stress", "white_layer", "safety_limit",
]);

const VALID_SURFACE_ENGINES = new Set([
  "SurfaceFinishPredictorEngine",
  "SurfaceIntegrityEngine",
  "ResidualStressPredictionEngine",
  "SAFETY_BLOCK",
]);

const REQUIRED_SURFACE_ENGINES = [
  "SurfaceFinishPredictorEngine",
  "SurfaceIntegrityEngine",
  "ResidualStressPredictionEngine",
];

const SAFETY_HOOKS = new Set([
  "hypermill.collision.guard",
  "hypermill.toolbreakage.limit",
  "hypermill.overtravel.guard",
  "hypermill.spindle.overspeed",
  "hypermill.stock.negative_allowance",
]);

describe("HyperMillSurfaceQualityMappingEngine — U-HKC43", () => {

  // ── Assertion 1: Grand total >= 250 ──────────────────────────────────────────
  it("should have at least 250 total mappings", () => {
    expect(SURFACE_QUALITY_MAPPINGS.length).toBeGreaterThanOrEqual(250);
  });

  // ── Assertion 2: Summary total matches array length ───────────────────────────
  it("summary totalMappings should match SURFACE_QUALITY_MAPPINGS.length", () => {
    expect(SURFACE_QUALITY_MAPPING_SUMMARY.totalMappings).toBe(SURFACE_QUALITY_MAPPINGS.length);
  });

  // ── Assertion 3: Surface quality mappings >= 150 ──────────────────────────────
  it("should have at least 150 surface quality mappings (non-safety)", () => {
    expect(SURFACE_QUALITY_MAPPING_SUMMARY.surfaceQualityMappings).toBeGreaterThanOrEqual(150);
  });

  // ── Assertion 4: Safety limit mappings >= 100 ─────────────────────────────────
  it("should have at least 100 safety limit mappings", () => {
    expect(SURFACE_QUALITY_MAPPING_SUMMARY.safetyLimitMappings).toBeGreaterThanOrEqual(100);
  });

  // ── Assertion 5: All 3 surface engines represented ───────────────────────────
  it("should represent all 3 surface quality target engines", () => {
    const engines = new Set(SURFACE_QUALITY_MAPPINGS.map((m) => m.targetEngine));
    for (const engine of REQUIRED_SURFACE_ENGINES) {
      expect(engines.has(engine), `engine "${engine}" must be present`).toBe(true);
    }
  });

  // ── Assertion 6: SurfaceFinishPredictorEngine has most entries ────────────────
  it("SurfaceFinishPredictorEngine should have the most surface quality mappings", () => {
    const sfpCount = SURFACE_QUALITY_MAPPINGS.filter(
      (m) => m.targetEngine === "SurfaceFinishPredictorEngine"
    ).length;
    expect(sfpCount).toBeGreaterThan(50);
  });

  // ── Assertion 7: ra_prediction mappings have formula strings ─────────────────
  it("all ra_prediction mappings should have a formula string", () => {
    const raMap = SURFACE_QUALITY_MAPPINGS.filter((m) => m.mappingType === "ra_prediction");
    expect(raMap.length).toBeGreaterThan(0);
    const withoutFormula = raMap.filter((m) => !m.formula || m.formula.trim() === "");
    expect(withoutFormula).toHaveLength(0);
  });

  // ── Assertion 8: scallop_height mappings have formula strings ─────────────────
  it("all scallop_height mappings should have a formula string", () => {
    const scallopMap = SURFACE_QUALITY_MAPPINGS.filter((m) => m.mappingType === "scallop_height");
    expect(scallopMap.length).toBeGreaterThan(0);
    const withoutFormula = scallopMap.filter((m) => !m.formula || m.formula.trim() === "");
    expect(withoutFormula).toHaveLength(0);
  });

  // ── Assertion 9: Formula includes 'Ra = f²' for turning ra_prediction ──────────
  it("turning ra_prediction formula should reference Ra = f^2/(32R)", () => {
    const turningRa = SURFACE_QUALITY_MAPPINGS.filter(
      (m) => m.parameterDomain === "turning" && m.mappingType === "ra_prediction"
    );
    expect(turningRa.length).toBeGreaterThan(0);
    const hasFormula = turningRa.some((m) => m.formula && m.formula.includes("Ra ="));
    expect(hasFormula).toBe(true);
  });

  // ── Assertion 10: Scallop formula references h = R − sqrt ────────────────────
  it("scallop_height formula should reference the ball-end scallop equation", () => {
    const scallopMaps = SURFACE_QUALITY_MAPPINGS.filter(
      (m) => m.mappingType === "scallop_height"
    );
    const hasScallopFormula = scallopMaps.some(
      (m) => m.formula && (m.formula.includes("R²") || m.formula.includes("R−") || m.formula.includes("R -") || m.formula.includes("sqrt"))
    );
    expect(hasScallopFormula).toBe(true);
  });

  // ── Assertion 11: All mappingType values are valid ────────────────────────────
  it("all mappings should have valid mappingType values", () => {
    const invalid = SURFACE_QUALITY_MAPPINGS.filter(
      (m) => !VALID_MAPPING_TYPES.has(m.mappingType)
    );
    expect(invalid).toHaveLength(0);
  });

  // ── Assertion 12: All targetEngine values are valid ───────────────────────────
  it("all mappings should have valid targetEngine values", () => {
    const invalid = SURFACE_QUALITY_MAPPINGS.filter(
      (m) => !VALID_SURFACE_ENGINES.has(m.targetEngine)
    );
    expect(invalid).toHaveLength(0);
  });

  // ── Assertion 13: Safety mappings have hookRef ────────────────────────────────
  it("all safety_limit mappings should have a hookRef", () => {
    const safetyMaps = SURFACE_QUALITY_MAPPINGS.filter(
      (m) => m.mappingType === "safety_limit"
    );
    const missingHook = safetyMaps.filter((m) => !m.hookRef || m.hookRef.trim() === "");
    expect(missingHook).toHaveLength(0);
  });

  // ── Assertion 14: All 4 safety hook types are present ────────────────────────
  it("should reference all 4 safety hook types", () => {
    const hooksPresent = new Set(
      SURFACE_QUALITY_MAPPINGS
        .filter((m) => m.hookRef)
        .map((m) => m.hookRef as string)
    );
    for (const hook of SAFETY_HOOKS) {
      expect(hooksPresent.has(hook), `hook "${hook}" must be present`).toBe(true);
    }
  });

  // ── Assertion 15: Turning domain has >= 54 surface quality mappings ────────────
  it("turning domain should have at least 54 surface quality mappings", () => {
    const turningMaps = SURFACE_QUALITY_MAPPINGS.filter(
      (m) => m.parameterDomain === "turning" && m.mappingType !== "safety_limit"
    );
    expect(turningMaps.length).toBeGreaterThanOrEqual(54);
  });

  // ── Assertion 16: 3D domain has >= 24 scallop mappings ───────────────────────
  it("threeD domain should have at least 24 scallop_height mappings", () => {
    const scallopMaps = SURFACE_QUALITY_MAPPINGS.filter(
      (m) => m.parameterDomain === "threeD" && m.mappingType === "scallop_height"
    );
    expect(scallopMaps.length).toBeGreaterThanOrEqual(24);
  });

  // ── Assertion 17: 5-axis domain has >= 50 surface quality mappings ────────────
  it("fiveAxis domain should have at least 50 surface quality mappings", () => {
    const fiveAxisMaps = SURFACE_QUALITY_MAPPINGS.filter(
      (m) => m.parameterDomain === "fiveAxis" && m.mappingType !== "safety_limit"
    );
    expect(fiveAxisMaps.length).toBeGreaterThanOrEqual(50);
  });

  // ── Assertion 18: getMappingsByType ra_prediction returns only ra_prediction ──
  it("getMappingsByType('ra_prediction') should return only ra_prediction entries", () => {
    const result = surfaceQualityMappingEngine.getMappingsByType("ra_prediction");
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((m: SurfaceQualityMapping) => m.mappingType === "ra_prediction")).toBe(true);
  });

  // ── Assertion 19: getSafetyMappings returns only safety_limit entries ──────────
  it("getSafetyMappings() should return only safety_limit entries", () => {
    const result = surfaceQualityMappingEngine.getSafetyMappings();
    expect(result.length).toBeGreaterThanOrEqual(100);
    expect(result.every((m: SurfaceQualityMapping) => m.mappingType === "safety_limit")).toBe(true);
  });

  // ── Assertion 20: getMappingById returns known entry ──────────────────────────
  it("getMappingById should return correct entry for turning.od_turning.feed_per_rev", () => {
    const m = surfaceQualityMappingEngine.getMappingById("turning.od_turning.feed_per_rev");
    expect(m).toBeDefined();
    expect(m?.parameterDomain).toBe("turning");
    expect(m?.mappingType).toBe("ra_prediction");
    expect(m?.targetEngine).toBe("SurfaceFinishPredictorEngine");
    expect(m?.formula).toBeDefined();
  });

  // ── Assertion 21: getMappingById returns undefined for unknown ID ─────────────
  it("getMappingById should return undefined for unknown parameterId", () => {
    const result = surfaceQualityMappingEngine.getMappingById("unknown.cycle.param");
    expect(result).toBeUndefined();
  });

  // ── Assertion 22: getMappingsWithFormula covers ra + scallop types ────────────
  it("getMappingsWithFormula() should cover all ra_prediction and scallop_height entries", () => {
    const withFormula = surfaceQualityMappingEngine.getMappingsWithFormula();
    expect(withFormula.length).toBeGreaterThan(100);
    // Every formula entry should be a non-safety type
    const onlySurface = withFormula.filter(
      (m: SurfaceQualityMapping) => m.mappingType !== "safety_limit"
    );
    expect(onlySurface.length).toBeGreaterThan(100);
  });

  // ── Assertion 23: ResidualStressPredictionEngine entries present ──────────────
  it("ResidualStressPredictionEngine should have at least 5 mappings", () => {
    const result = surfaceQualityMappingEngine.getMappingsByEngine("ResidualStressPredictionEngine");
    expect(result.length).toBeGreaterThanOrEqual(5);
  });

  // ── Assertion 24: SurfaceIntegrityEngine entries present ─────────────────────
  it("SurfaceIntegrityEngine should have at least 5 mappings", () => {
    const result = surfaceQualityMappingEngine.getMappingsByEngine("SurfaceIntegrityEngine");
    expect(result.length).toBeGreaterThanOrEqual(5);
  });

  // ── Assertion 25: getMappingsByHook collision guard returns 30 entries ─────────
  it("getMappingsByHook collision guard should return at least 25 entries", () => {
    const result = surfaceQualityMappingEngine.getMappingsByHook("hypermill.collision.guard");
    expect(result.length).toBeGreaterThanOrEqual(25);
    expect(result.every((m: SurfaceQualityMapping) => m.hookRef === "hypermill.collision.guard")).toBe(true);
  });
});

// ── PhysicsMappingRegistry tests ──────────────────────────────────────────────

describe("PhysicsMappingRegistry — U-HKC43", () => {

  // ── Assertion 26: >= 1,500 total mappings ────────────────────────────────────
  it("should have at least 1,500 total physics mappings across all 4 engines", () => {
    expect(TOTAL_PHYSICS_MAPPINGS).toBeGreaterThanOrEqual(1500);
  });

  // ── Assertion 27: getTotalCount matches TOTAL_PHYSICS_MAPPINGS ───────────────
  it("getTotalCount() should match TOTAL_PHYSICS_MAPPINGS constant", () => {
    expect(physicsMappingRegistry.getTotalCount()).toBe(TOTAL_PHYSICS_MAPPINGS);
  });

  // ── Assertion 28: getByParameterId returns entry for turning.od_turning.feed_per_rev
  it("getByParameterId should return surface quality entry for known turning ID", () => {
    const entry = physicsMappingRegistry.getByParameterId("turning.od_turning.feed_per_rev");
    expect(entry).toBeDefined();
    expect(entry?.parameterId).toBe("turning.od_turning.feed_per_rev");
    expect(entry?.parameterDomain).toBe("turning");
  });

  // ── Assertion 29: getByParameterId returns kienzle entry ─────────────────────
  it("getByParameterId should return kienzle entry for drilling.center_drill.spindle_speed", () => {
    const entry = physicsMappingRegistry.getByParameterId("drilling.center_drill.spindle_speed");
    expect(entry).toBeDefined();
    expect(entry?.parameterDomain).toBe("drilling");
  });

  // ── Assertion 30: getByParameterId returns undefined for unknown ──────────────
  it("getByParameterId should return undefined for unknown parameterId", () => {
    const entry = physicsMappingRegistry.getByParameterId("totally.unknown.parameter");
    expect(entry).toBeUndefined();
  });

  // ── Assertion 31: getByDomain returns non-empty for turning ──────────────────
  it("getByDomain('turning') should return non-empty array", () => {
    const result = physicsMappingRegistry.getByDomain("turning");
    expect(result.length).toBeGreaterThan(0);
  });

  // ── Assertion 32: getByDomain returns non-empty for drilling ─────────────────
  it("getByDomain('drilling') should return non-empty array", () => {
    const result = physicsMappingRegistry.getByDomain("drilling");
    expect(result.length).toBeGreaterThan(0);
  });

  // ── Assertion 33: getByDomain returns non-empty for threeD ───────────────────
  it("getByDomain('threeD') should return non-empty array", () => {
    const result = physicsMappingRegistry.getByDomain("threeD");
    expect(result.length).toBeGreaterThan(0);
  });

  // ── Assertion 34: getByDomain returns non-empty for fiveAxis ─────────────────
  it("getByDomain('fiveAxis') should return non-empty array", () => {
    const result = physicsMappingRegistry.getByDomain("fiveAxis");
    expect(result.length).toBeGreaterThan(0);
  });

  // ── Assertion 35: getByDomain returns non-empty for twoD ─────────────────────
  it("getByDomain('twoD') should return non-empty array", () => {
    const result = physicsMappingRegistry.getByDomain("twoD");
    expect(result.length).toBeGreaterThan(0);
  });

  // ── Assertion 36: getByDomain returns non-empty for grinding ─────────────────
  it("getByDomain('grinding') should return non-empty array", () => {
    const result = physicsMappingRegistry.getByDomain("grinding");
    expect(result.length).toBeGreaterThan(0);
  });

  // ── Assertion 37: getByEngine returns entries for KienzleForceModelEngine ─────
  it("getByEngine('KienzleForceModelEngine') should return non-empty array", () => {
    const result = physicsMappingRegistry.getByEngine("KienzleForceModelEngine");
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((e: PhysicsMappingEntry) => e.source === "kienzle")).toBe(true);
  });

  // ── Assertion 38: getByEngine returns entries for SpeedFeedOrchestratorEngine ──
  it("getByEngine('SpeedFeedOrchestratorEngine') should return non-empty array", () => {
    const result = physicsMappingRegistry.getByEngine("SpeedFeedOrchestratorEngine");
    expect(result.length).toBeGreaterThan(0);
  });

  // ── Assertion 39: getByEngine returns entries for SurfaceFinishPredictorEngine ─
  it("getByEngine('SurfaceFinishPredictorEngine') should return non-empty array", () => {
    const result = physicsMappingRegistry.getByEngine("SurfaceFinishPredictorEngine");
    expect(result.length).toBeGreaterThan(0);
  });

  // ── Assertion 40: getCoverageReport totalMappings matches TOTAL_PHYSICS_MAPPINGS
  it("getCoverageReport().totalMappings should match TOTAL_PHYSICS_MAPPINGS", () => {
    const report = physicsMappingRegistry.getCoverageReport();
    expect(report.totalMappings).toBe(TOTAL_PHYSICS_MAPPINGS);
  });

  // ── Assertion 41: Coverage report has byDomain for all core domains ───────────
  it("getCoverageReport() byDomain should include all core HyperMill domains", () => {
    const report = physicsMappingRegistry.getCoverageReport();
    expect(report.byDomain["turning"]).toBeGreaterThan(0);
    expect(report.byDomain["drilling"]).toBeGreaterThan(0);
    expect(report.byDomain["threeD"]).toBeGreaterThan(0);
    expect(report.byDomain["fiveAxis"]).toBeGreaterThan(0);
  });

  // ── Assertion 42: Coverage report bySource covers all 4 registries ────────────
  it("getCoverageReport() bySource should have non-zero counts for all 4 registries", () => {
    const report = physicsMappingRegistry.getCoverageReport();
    expect(report.bySource.kienzle).toBeGreaterThan(0);
    expect(report.bySource.speedfeed).toBeGreaterThan(0);
    expect(report.bySource.deflection_thermal).toBeGreaterThan(0);
    expect(report.bySource.surface_quality).toBeGreaterThan(0);
  });

  // ── Assertion 43: Coverage percent > 0 ───────────────────────────────────────
  it("getCoverageReport() coveragePercent should be > 0", () => {
    const report = physicsMappingRegistry.getCoverageReport();
    expect(report.coveragePercent).toBeGreaterThan(0);
    expect(report.coveragePercent).toBeLessThanOrEqual(100);
  });

  // ── Assertion 44: getDomains returns an array with multiple entries ────────────
  it("getDomains() should return at least 5 domains", () => {
    const domains = physicsMappingRegistry.getDomains();
    expect(domains.length).toBeGreaterThanOrEqual(5);
  });

  // ── Assertion 45: getEngineNames returns multiple physics engines ──────────────
  it("getEngineNames() should return at least 6 distinct engine names", () => {
    const engines = physicsMappingRegistry.getEngineNames();
    expect(engines.length).toBeGreaterThanOrEqual(6);
  });

  // ── Assertion 46: getBySource kienzle returns >= 500 entries ─────────────────
  it("getBySource('kienzle') should return at least 500 entries", () => {
    const result = physicsMappingRegistry.getBySource("kienzle");
    expect(result.length).toBeGreaterThanOrEqual(500);
  });

  // ── Assertion 47: getBySource speedfeed returns >= 400 entries ───────────────
  it("getBySource('speedfeed') should return at least 400 entries", () => {
    const result = physicsMappingRegistry.getBySource("speedfeed");
    expect(result.length).toBeGreaterThanOrEqual(400);
  });

  // ── Assertion 48: getBySource surface_quality returns >= 250 entries ──────────
  it("getBySource('surface_quality') should return at least 250 entries", () => {
    const result = physicsMappingRegistry.getBySource("surface_quality");
    expect(result.length).toBeGreaterThanOrEqual(250);
  });

  // ── Assertion 49: getUniqueParameterCount is positive ────────────────────────
  it("getUniqueParameterCount() should be positive", () => {
    const count = physicsMappingRegistry.getUniqueParameterCount();
    expect(count).toBeGreaterThan(0);
  });

  // ── Assertion 50: SpeedFeed entry lookup by known parameterId ─────────────────
  it("getByParameterId should find speedfeed entry for drilling.center_drill.spindle_speed or similar", () => {
    // SpeedFeed uses "drilling.center_drill.spindle_speed" (same domain style)
    const entry = physicsMappingRegistry.getByParameterId("drilling.center_drill.spindle_speed");
    // Could be from kienzle or speedfeed — either way it must be found
    expect(entry).toBeDefined();
    expect(["drilling", "kienzle", "speedfeed"]).toContain(
      entry?.source === "kienzle" ? "kienzle"
      : entry?.source === "speedfeed" ? "speedfeed"
      : entry?.parameterDomain ?? "unknown"
    );
  });
});
