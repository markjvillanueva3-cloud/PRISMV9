/**
 * Tests for HyperMillKienzleMappingEngine — U-HKC40
 *
 * Verifies:
 *   - Mapping count >= 500 across all 8 domains
 *   - All 8 domains represented
 *   - All 6 ISO groups covered
 *   - Canonical kc1_1 values match constants.ts (P=1800, M=2100, K=1100)
 *   - All constraintTypes are valid enumeration values
 *   - All kienzleInputs are valid enumeration values
 *   - engineRef is always "KienzleForceModelEngine"
 *   - Domain-specific count thresholds
 *   - Query methods return correct subsets
 *
 * @milestone HM-KC-MS8/U-HKC40
 */

import { describe, it, expect } from "vitest";
import {
  KIENZLE_MAPPINGS,
  KIENZLE_MAPPING_SUMMARY,
  KC1_1_SNAPSHOT,
  kienzleMappingEngine,
  type PhysicsMapping,
  type KienzleInput,
  type ConstraintType,
} from "../engines/hypermill/HyperMillKienzleMappingEngine.js";
import { CANONICAL_KIENZLE } from "../physics/constants.js";

// ── Validity sets ──────────────────────────────────────────────────────────────

const VALID_KIENZLE_INPUTS = new Set<KienzleInput>(["ap", "ae", "fz", "vc"]);
const VALID_CONSTRAINT_TYPES = new Set<ConstraintType>([
  "force_limit", "power_limit", "torque_limit",
]);
const VALID_ISO_GROUPS = new Set(["P", "M", "K", "N", "S", "H"]);
const VALID_CONFIDENCE = new Set(["high", "medium", "low"]);
const REQUIRED_DOMAINS = new Set([
  "drilling", "twoD", "threeD", "fiveAxis",
  "turning", "probing", "grinding", "cuttingData",
]);

describe("HyperMillKienzleMappingEngine — U-HKC40", () => {
  // ── Assertion 1: Total mapping count >= 500 ──────────────────────────────────
  it("should have at least 500 total mappings", () => {
    expect(KIENZLE_MAPPINGS.length).toBeGreaterThanOrEqual(500);
  });

  // ── Assertion 2: Summary total matches array length ──────────────────────────
  it("summary totalMappings should match KIENZLE_MAPPINGS.length", () => {
    expect(KIENZLE_MAPPING_SUMMARY.totalMappings).toBe(KIENZLE_MAPPINGS.length);
  });

  // ── Assertion 3: All 8 required domains represented ──────────────────────────
  it("should cover all 8 required domains", () => {
    const domainsPresent = new Set(Object.keys(KIENZLE_MAPPING_SUMMARY.byDomain));
    for (const domain of REQUIRED_DOMAINS) {
      expect(domainsPresent.has(domain), `domain "${domain}" must be present`).toBe(true);
    }
  });

  // ── Assertion 4: Exactly 8 domains (no extra orphan domains) ─────────────────
  it("should have exactly 8 domains in byDomain summary", () => {
    expect(Object.keys(KIENZLE_MAPPING_SUMMARY.byDomain).length).toBe(8);
  });

  // ── Assertion 5: All 6 ISO groups referenced ─────────────────────────────────
  it("should reference all 6 ISO groups in byIsoGroup summary", () => {
    for (const g of VALID_ISO_GROUPS) {
      expect(
        KIENZLE_MAPPING_SUMMARY.byIsoGroup[g as keyof typeof KIENZLE_MAPPING_SUMMARY.byIsoGroup],
        `ISO group "${g}" count must be > 0`
      ).toBeGreaterThan(0);
    }
  });

  // ── Assertion 6: Drilling domain >= 60 mappings ───────────────────────────────
  it("drilling domain should have at least 60 mappings", () => {
    expect(KIENZLE_MAPPING_SUMMARY.byDomain["drilling"]).toBeGreaterThanOrEqual(60);
  });

  // ── Assertion 7: twoD domain >= 60 mappings ───────────────────────────────────
  it("twoD domain should have at least 60 mappings", () => {
    expect(KIENZLE_MAPPING_SUMMARY.byDomain["twoD"]).toBeGreaterThanOrEqual(60);
  });

  // ── Assertion 8: threeD domain >= 80 mappings ─────────────────────────────────
  it("threeD domain should have at least 80 mappings", () => {
    expect(KIENZLE_MAPPING_SUMMARY.byDomain["threeD"]).toBeGreaterThanOrEqual(80);
  });

  // ── Assertion 9: fiveAxis domain >= 100 mappings ──────────────────────────────
  it("fiveAxis domain should have at least 100 mappings", () => {
    expect(KIENZLE_MAPPING_SUMMARY.byDomain["fiveAxis"]).toBeGreaterThanOrEqual(100);
  });

  // ── Assertion 10: turning domain >= 90 mappings ───────────────────────────────
  it("turning domain should have at least 90 mappings", () => {
    expect(KIENZLE_MAPPING_SUMMARY.byDomain["turning"]).toBeGreaterThanOrEqual(90);
  });

  // ── Assertion 11: All constraintTypes are valid ───────────────────────────────
  it("all mappings should have valid constraintType values", () => {
    const invalid = KIENZLE_MAPPINGS.filter(
      (m) => !VALID_CONSTRAINT_TYPES.has(m.constraintType)
    );
    expect(invalid).toHaveLength(0);
  });

  // ── Assertion 12: All constraintType values appear in summary ────────────────
  it("byConstraintType summary should cover all 3 constraint types", () => {
    expect(KIENZLE_MAPPING_SUMMARY.byConstraintType.force_limit).toBeGreaterThan(0);
    expect(KIENZLE_MAPPING_SUMMARY.byConstraintType.power_limit).toBeGreaterThan(0);
    expect(KIENZLE_MAPPING_SUMMARY.byConstraintType.torque_limit).toBeGreaterThan(0);
  });

  // ── Assertion 13: All kienzleInputs are valid ────────────────────────────────
  it("all mappings should have valid kienzleInput values", () => {
    const invalid = KIENZLE_MAPPINGS.filter(
      (m) => !VALID_KIENZLE_INPUTS.has(m.kienzleInput)
    );
    expect(invalid).toHaveLength(0);
  });

  // ── Assertion 14: All 4 kienzleInput types appear ────────────────────────────
  it("byKienzleInput should cover all 4 Kienzle variables", () => {
    expect(KIENZLE_MAPPING_SUMMARY.byKienzleInput.ap).toBeGreaterThan(0);
    expect(KIENZLE_MAPPING_SUMMARY.byKienzleInput.ae).toBeGreaterThan(0);
    expect(KIENZLE_MAPPING_SUMMARY.byKienzleInput.fz).toBeGreaterThan(0);
    expect(KIENZLE_MAPPING_SUMMARY.byKienzleInput.vc).toBeGreaterThan(0);
  });

  // ── Assertion 15: engineRef is always "KienzleForceModelEngine" ───────────────
  it("all mappings should reference KienzleForceModelEngine", () => {
    const wrong = KIENZLE_MAPPINGS.filter((m) => m.engineRef !== "KienzleForceModelEngine");
    expect(wrong).toHaveLength(0);
  });

  // ── Assertion 16: Canonical kc1_1 P=1800 ────────────────────────────────────
  it("KC1_1_SNAPSHOT should match CANONICAL_KIENZLE P=1800", () => {
    expect(KC1_1_SNAPSHOT.P).toBe(1800);
    expect(KC1_1_SNAPSHOT.P).toBe(CANONICAL_KIENZLE.P.kc1_1);
  });

  // ── Assertion 17: Canonical kc1_1 M=2100 ────────────────────────────────────
  it("KC1_1_SNAPSHOT should match CANONICAL_KIENZLE M=2100", () => {
    expect(KC1_1_SNAPSHOT.M).toBe(2100);
    expect(KC1_1_SNAPSHOT.M).toBe(CANONICAL_KIENZLE.M.kc1_1);
  });

  // ── Assertion 18: Canonical kc1_1 K=1100 ────────────────────────────────────
  it("KC1_1_SNAPSHOT should match CANONICAL_KIENZLE K=1100", () => {
    expect(KC1_1_SNAPSHOT.K).toBe(1100);
    expect(KC1_1_SNAPSHOT.K).toBe(CANONICAL_KIENZLE.K.kc1_1);
  });

  // ── Assertion 19: Canonical kc1_1 N=700, S=2800, H=3200 ─────────────────────
  it("KC1_1_SNAPSHOT should match remaining canonical values N=700, S=2800, H=3200", () => {
    expect(KC1_1_SNAPSHOT.N).toBe(700);
    expect(KC1_1_SNAPSHOT.S).toBe(2800);
    expect(KC1_1_SNAPSHOT.H).toBe(3200);
  });

  // ── Assertion 20: Mapping kc1_1ByGroup values are correct ────────────────────
  it("all P-group kc1_1ByGroup values should equal 1800", () => {
    const mappingsWithP = KIENZLE_MAPPINGS.filter((m) => m.isoGroups.includes("P"));
    for (const m of mappingsWithP) {
      expect(m.kc1_1ByGroup.P).toBe(1800);
    }
  });

  // ── Assertion 21: parameterId format correct ──────────────────────────────────
  it("all parameterId values should follow domain.cycleType.paramName format", () => {
    const badIds = KIENZLE_MAPPINGS.filter((m) => {
      const parts = m.parameterId.split(".");
      return parts.length !== 3 ||
        parts[0] !== m.parameterDomain ||
        parts[1] !== m.cycleType ||
        parts[2] !== m.parameterName;
    });
    expect(badIds).toHaveLength(0);
  });

  // ── Assertion 22: All isoGroups arrays are non-empty ─────────────────────────
  it("all mappings should have at least one ISO group", () => {
    const empty = KIENZLE_MAPPINGS.filter((m) => m.isoGroups.length === 0);
    expect(empty).toHaveLength(0);
  });

  // ── Assertion 23: All isoGroups contain valid values ─────────────────────────
  it("all isoGroups entries should be valid ISO group codes", () => {
    const invalid = KIENZLE_MAPPINGS.filter((m) =>
      m.isoGroups.some((g) => !VALID_ISO_GROUPS.has(g))
    );
    expect(invalid).toHaveLength(0);
  });

  // ── Assertion 24: All confidenceLevel values are valid ────────────────────────
  it("all mappings should have valid confidenceLevel values", () => {
    const invalid = KIENZLE_MAPPINGS.filter(
      (m) => !VALID_CONFIDENCE.has(m.confidenceLevel)
    );
    expect(invalid).toHaveLength(0);
  });

  // ── Engine method tests ────────────────────────────────────────────────────────

  // ── Assertion 25: getMappingsForDomain drilling ───────────────────────────────
  it("getMappingsForDomain('drilling') should return >= 60 mappings", () => {
    const result = kienzleMappingEngine.getMappingsForDomain("drilling");
    expect(result.length).toBeGreaterThanOrEqual(60);
    expect(result.every((m: PhysicsMapping) => m.parameterDomain === "drilling")).toBe(true);
  });

  // ── Assertion 26: getMappingById returns correct entry ────────────────────────
  it("getMappingById should return correct PhysicsMapping for known ID", () => {
    const m = kienzleMappingEngine.getMappingById("drilling.center_drill.spindle_speed");
    expect(m).toBeDefined();
    expect(m?.parameterDomain).toBe("drilling");
    expect(m?.cycleType).toBe("center_drill");
    expect(m?.parameterName).toBe("spindle_speed");
    expect(m?.kienzleInput).toBe("vc");
    expect(m?.engineRef).toBe("KienzleForceModelEngine");
  });

  // ── Assertion 27: getMappingById returns undefined for unknown ID ─────────────
  it("getMappingById should return undefined for unknown parameterId", () => {
    const result = kienzleMappingEngine.getMappingById("unknown.cycle.param");
    expect(result).toBeUndefined();
  });

  // ── Assertion 28: getMappingsForIsoGroup('S') returns superalloy mappings ─────
  it("getMappingsForIsoGroup('S') should return at least 100 mappings", () => {
    const result = kienzleMappingEngine.getMappingsForIsoGroup("S");
    expect(result.length).toBeGreaterThanOrEqual(100);
    expect(result.every((m: PhysicsMapping) => m.isoGroups.includes("S"))).toBe(true);
  });

  // ── Assertion 29: getMappingsForKienzleInput('ap') depth-of-cut mappings ──────
  it("getMappingsForKienzleInput('ap') should return at least 100 mappings", () => {
    const result = kienzleMappingEngine.getMappingsForKienzleInput("ap");
    expect(result.length).toBeGreaterThanOrEqual(100);
    expect(result.every((m: PhysicsMapping) => m.kienzleInput === "ap")).toBe(true);
  });

  // ── Assertion 30: getSummary returns same object as KIENZLE_MAPPING_SUMMARY ───
  it("getSummary() should return KIENZLE_MAPPING_SUMMARY", () => {
    const summary = kienzleMappingEngine.getSummary();
    expect(summary.totalMappings).toBe(KIENZLE_MAPPING_SUMMARY.totalMappings);
    expect(summary.byDomain).toEqual(KIENZLE_MAPPING_SUMMARY.byDomain);
  });

  // ── Assertion 31: getKc1_1Values returns canonical constants ─────────────────
  it("getKc1_1Values should return all 6 canonical kc1_1 values", () => {
    const vals = kienzleMappingEngine.getKc1_1Values();
    expect(vals.P).toBe(1800);
    expect(vals.M).toBe(2100);
    expect(vals.K).toBe(1100);
    expect(vals.N).toBe(700);
    expect(vals.S).toBe(2800);
    expect(vals.H).toBe(3200);
  });

  // ── Assertion 32: getMappingsForConstraintType power_limit ────────────────────
  it("getMappingsForConstraintType('power_limit') returns only power_limit entries", () => {
    const result = kienzleMappingEngine.getMappingsForConstraintType("power_limit");
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((m: PhysicsMapping) => m.constraintType === "power_limit")).toBe(true);
  });

  // ── Assertion 33: Five-axis turning cycle is mapped ───────────────────────────
  it("five_axis_turning cycle should be in fiveAxis domain with all 5 params", () => {
    const result = kienzleMappingEngine.getMappingsForCycleType("fiveAxis", "five_axis_turning");
    expect(result.length).toBe(5);
    const paramNames = result.map((m: PhysicsMapping) => m.parameterName);
    expect(paramNames).toContain("spindle_speed");
    expect(paramNames).toContain("feed_rate");
    expect(paramNames).toContain("depth_of_cut");
  });

  // ── Assertion 34: Hard turning uses H group constants ────────────────────────
  it("hard_turning cycle should include ISO H group constants", () => {
    const m = kienzleMappingEngine.getMappingById("turning.hard_turning.spindle_speed");
    expect(m).toBeDefined();
    expect(m?.isoGroups).toContain("H");
    expect(m?.kc1_1ByGroup.H).toBe(3200);
  });

  // ── Assertion 35: cuttingData profiles all have 8 params ─────────────────────
  it("each cuttingData profile should map exactly 8 parameters", () => {
    const profiles = [
      "roughing_profile", "semi_finish_profile", "finishing_profile",
      "high_speed_profile", "hard_material_profile", "soft_material_profile",
    ];
    for (const profile of profiles) {
      const result = kienzleMappingEngine.getMappingsForCycleType("cuttingData", profile);
      expect(result.length, `profile "${profile}" should have 8 mappings`).toBe(8);
    }
  });
});
