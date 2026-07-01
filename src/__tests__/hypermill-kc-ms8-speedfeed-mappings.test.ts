/**
 * Tests for HyperMillSpeedFeedMappingEngine
 *
 * U-HKC41: Verifies the Speed/Feed + SLD Mapping Registry covers:
 *  - >= 470 total mappings
 *  - >= 350 S/F mappings (SpeedFeedOrchestratorEngine)
 *  - >= 120 SLD mappings (ChatterStabilityLobeEngine)
 *  - All 8 resolver types represented
 *  - All 3 stability zones represented (stable / marginal / unstable)
 *  - All 6 domains represented (drilling, twoD, threeD, fiveAxis, turning, cuttingData)
 *  - monteCarloUQ is true for all S/F engine mappings
 *  - targetEngine is always one of the two valid engines
 *  - At least 20 assertions total
 *
 * @milestone HM-KC-MS8/U-HKC41
 */

import { describe, it, expect } from "vitest";
import {
  HyperMillSpeedFeedMappingEngine,
  speedFeedMappingEngine,
  SPEEDFEED_MAPPINGS,
  SPEEDFEED_MAPPING_SUMMARY,
} from "../engines/hypermill/HyperMillSpeedFeedMappingEngine.js";

const VALID_ENGINES = new Set([
  "SpeedFeedOrchestratorEngine",
  "ChatterStabilityLobeEngine",
]);

const ALL_RESOLVERS = [
  "kienzle", "empirical", "catalog", "hybrid",
  "monteCarlo", "adaptive", "taylorsLife", "thermal",
] as const;

const ALL_STABILITY_ZONES = ["stable", "marginal", "unstable"] as const;

const ALL_DOMAINS = [
  "drilling", "twoD", "threeD", "fiveAxis", "turning", "cuttingData",
] as const;

describe("HyperMillSpeedFeedMappingEngine", () => {

  // ── Instantiation ───────────────────────────────────────────────────────────

  it("singleton export is an instance of HyperMillSpeedFeedMappingEngine", () => {
    expect(speedFeedMappingEngine).toBeInstanceOf(HyperMillSpeedFeedMappingEngine);
  });

  // ── Total mapping counts ────────────────────────────────────────────────────

  it("SPEEDFEED_MAPPINGS total count is >= 470", () => {
    expect(SPEEDFEED_MAPPINGS.length).toBeGreaterThanOrEqual(470);
  });

  it("summary.totalMappings matches SPEEDFEED_MAPPINGS.length", () => {
    expect(SPEEDFEED_MAPPING_SUMMARY.totalMappings).toBe(SPEEDFEED_MAPPINGS.length);
  });

  it("S/F mappings count is >= 350", () => {
    const sfCount = SPEEDFEED_MAPPINGS.filter(
      (m) => m.targetEngine === "SpeedFeedOrchestratorEngine"
    ).length;
    expect(sfCount).toBeGreaterThanOrEqual(350);
  });

  it("summary.sfMappings is >= 350", () => {
    expect(SPEEDFEED_MAPPING_SUMMARY.sfMappings).toBeGreaterThanOrEqual(350);
  });

  it("SLD mappings count is >= 120", () => {
    const sldCount = SPEEDFEED_MAPPINGS.filter(
      (m) => m.targetEngine === "ChatterStabilityLobeEngine"
    ).length;
    expect(sldCount).toBeGreaterThanOrEqual(120);
  });

  it("summary.sldMappings is >= 120", () => {
    expect(SPEEDFEED_MAPPING_SUMMARY.sldMappings).toBeGreaterThanOrEqual(120);
  });

  it("sfMappings + sldMappings equals totalMappings", () => {
    expect(
      SPEEDFEED_MAPPING_SUMMARY.sfMappings + SPEEDFEED_MAPPING_SUMMARY.sldMappings
    ).toBe(SPEEDFEED_MAPPING_SUMMARY.totalMappings);
  });

  // ── All 8 resolver types represented ───────────────────────────────────────

  it("all 8 resolver types are represented in S/F mappings", () => {
    const presentResolvers = new Set(
      SPEEDFEED_MAPPINGS
        .filter((m) => m.resolverType !== undefined)
        .map((m) => m.resolverType!)
    );
    for (const resolver of ALL_RESOLVERS) {
      expect(presentResolvers.has(resolver)).toBe(true);
    }
  });

  it("summary.byResolver contains all 8 resolver keys", () => {
    for (const resolver of ALL_RESOLVERS) {
      expect(SPEEDFEED_MAPPING_SUMMARY.byResolver[resolver]).toBeGreaterThan(0);
    }
  });

  // ── All stability zones represented ────────────────────────────────────────

  it("all 3 stability zones are represented in SLD mappings", () => {
    const presentZones = new Set(
      SPEEDFEED_MAPPINGS
        .filter((m) => m.stabilityZone !== undefined)
        .map((m) => m.stabilityZone!)
    );
    for (const zone of ALL_STABILITY_ZONES) {
      expect(presentZones.has(zone)).toBe(true);
    }
  });

  it("summary.byStabilityZone contains all 3 zone keys", () => {
    for (const zone of ALL_STABILITY_ZONES) {
      expect(SPEEDFEED_MAPPING_SUMMARY.byStabilityZone[zone]).toBeGreaterThan(0);
    }
  });

  // ── All 6 domains represented ──────────────────────────────────────────────

  it("all 6 domains are represented in mappings", () => {
    const presentDomains = new Set(SPEEDFEED_MAPPINGS.map((m) => m.parameterDomain));
    for (const domain of ALL_DOMAINS) {
      expect(presentDomains.has(domain)).toBe(true);
    }
  });

  it("summary.byDomain contains all 6 domain keys", () => {
    for (const domain of ALL_DOMAINS) {
      expect(SPEEDFEED_MAPPING_SUMMARY.byDomain[domain]).toBeGreaterThan(0);
    }
  });

  // ── monteCarloUQ is true for all S/F mappings ──────────────────────────────

  it("monteCarloUQ is true for every SpeedFeedOrchestratorEngine mapping", () => {
    const sfMappings = SPEEDFEED_MAPPINGS.filter(
      (m) => m.targetEngine === "SpeedFeedOrchestratorEngine"
    );
    expect(sfMappings.length).toBeGreaterThan(0);
    for (const m of sfMappings) {
      expect(m.monteCarloUQ).toBe(true);
    }
  });

  // ── engineRef is always one of the two valid engines ──────────────────────

  it("every mapping's targetEngine is one of the two valid engines", () => {
    for (const m of SPEEDFEED_MAPPINGS) {
      expect(VALID_ENGINES.has(m.targetEngine)).toBe(true);
    }
  });

  // ── Parameter ID uniqueness ────────────────────────────────────────────────

  it("all parameterId values are unique", () => {
    const ids = SPEEDFEED_MAPPINGS.map((m) => m.parameterId);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  // ── Engine query methods ───────────────────────────────────────────────────

  it("getMappingsByDomain('drilling') returns >= 60 entries", () => {
    const result = speedFeedMappingEngine.getMappingsByDomain("drilling");
    expect(result.length).toBeGreaterThanOrEqual(60);
  });

  it("getMappingsByDomain('fiveAxis') returns >= 100 S/F + 50 SLD entries", () => {
    const result = speedFeedMappingEngine.getMappingsByDomain("fiveAxis");
    expect(result.length).toBeGreaterThanOrEqual(150);
  });

  it("getMappingsByResolver('kienzle') returns entries", () => {
    const result = speedFeedMappingEngine.getMappingsByResolver("kienzle");
    expect(result.length).toBeGreaterThan(0);
    for (const m of result) {
      expect(m.resolverType).toBe("kienzle");
    }
  });

  it("getMappingsByStabilityZone('stable') returns entries", () => {
    const result = speedFeedMappingEngine.getMappingsByStabilityZone("stable");
    expect(result.length).toBeGreaterThan(0);
    for (const m of result) {
      expect(m.stabilityZone).toBe("stable");
    }
  });

  it("getMapping() returns correct entry for a known parameterId", () => {
    const m = speedFeedMappingEngine.getMapping("drilling.center_drill.spindle_speed");
    expect(m).toBeDefined();
    expect(m!.targetEngine).toBe("SpeedFeedOrchestratorEngine");
    expect(m!.monteCarloUQ).toBe(true);
    expect(m!.parameterDomain).toBe("drilling");
  });

  it("getMapping() returns undefined for unknown parameterId", () => {
    expect(speedFeedMappingEngine.getMapping("nonexistent.op.param")).toBeUndefined();
  });

  it("getMappingsByEngine('ChatterStabilityLobeEngine') returns >= 120 entries", () => {
    const result = speedFeedMappingEngine.getMappingsByEngine("ChatterStabilityLobeEngine");
    expect(result.length).toBeGreaterThanOrEqual(120);
  });

  it("getSummary() matches the exported SPEEDFEED_MAPPING_SUMMARY", () => {
    const summary = speedFeedMappingEngine.getSummary();
    expect(summary.totalMappings).toBe(SPEEDFEED_MAPPING_SUMMARY.totalMappings);
    expect(summary.sfMappings).toBe(SPEEDFEED_MAPPING_SUMMARY.sfMappings);
    expect(summary.sldMappings).toBe(SPEEDFEED_MAPPING_SUMMARY.sldMappings);
  });

  // ── Structural integrity of each mapping ──────────────────────────────────

  it("every mapping has a non-empty parameterId, parameterDomain, inputParams, and outputMapping", () => {
    for (const m of SPEEDFEED_MAPPINGS) {
      expect(m.parameterId.length).toBeGreaterThan(0);
      expect(m.parameterDomain.length).toBeGreaterThan(0);
      expect(m.inputParams.length).toBeGreaterThan(0);
      expect(m.outputMapping.length).toBeGreaterThan(0);
    }
  });

  it("every SLD mapping has a stabilityZone set", () => {
    const sldMappings = SPEEDFEED_MAPPINGS.filter(
      (m) => m.targetEngine === "ChatterStabilityLobeEngine"
    );
    for (const m of sldMappings) {
      expect(m.stabilityZone).toBeDefined();
      expect(["stable", "marginal", "unstable"]).toContain(m.stabilityZone);
    }
  });

  it("every S/F mapping has a resolverType set", () => {
    const sfMappings = SPEEDFEED_MAPPINGS.filter(
      (m) => m.targetEngine === "SpeedFeedOrchestratorEngine"
    );
    for (const m of sfMappings) {
      expect(m.resolverType).toBeDefined();
      expect(ALL_RESOLVERS as readonly string[]).toContain(m.resolverType);
    }
  });

  it("confidenceLevel is always 'high', 'medium', or 'low'", () => {
    const validLevels = new Set(["high", "medium", "low"]);
    for (const m of SPEEDFEED_MAPPINGS) {
      expect(validLevels.has(m.confidenceLevel)).toBe(true);
    }
  });

  // ── Domain-level count checks ──────────────────────────────────────────────

  it("drilling domain has exactly 60 mappings (15 ops × 4 params)", () => {
    const count = speedFeedMappingEngine.getMappingsByDomain("drilling").length;
    expect(count).toBe(60);
  });

  it("twoD domain has exactly 63 mappings (9 × 5 S/F + 9 × 2 SLD)", () => {
    const count = speedFeedMappingEngine.getMappingsByDomain("twoD").length;
    expect(count).toBe(63);
  });

  it("threeD domain has exactly 84 mappings (12 × 5 S/F + 12 × 2 SLD)", () => {
    const count = speedFeedMappingEngine.getMappingsByDomain("threeD").length;
    expect(count).toBe(84);
  });

  it("fiveAxis domain has exactly 150 mappings (25 × 4 S/F + 25 × 2 SLD)", () => {
    const count = speedFeedMappingEngine.getMappingsByDomain("fiveAxis").length;
    expect(count).toBe(150);
  });

  it("turning domain has exactly 108 mappings (18 × 4 S/F + 18 × 2 SLD)", () => {
    const count = speedFeedMappingEngine.getMappingsByDomain("turning").length;
    expect(count).toBe(108);
  });

  it("cuttingData domain has exactly 36 mappings (6 profiles × 6 params)", () => {
    const count = speedFeedMappingEngine.getMappingsByDomain("cuttingData").length;
    expect(count).toBe(36);
  });
});
