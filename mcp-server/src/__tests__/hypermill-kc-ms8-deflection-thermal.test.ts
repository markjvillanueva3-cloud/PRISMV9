/**
 * Tests for HyperMillDeflectionThermalMappingEngine
 *
 * U-HKC42: Verifies the deflection + thermal parameter mapping catalog:
 *   - Total mappings >= 380
 *   - Deflection mappings >= 180
 *   - Thermal mappings >= 200
 *   - All 4 target engines represented
 *   - All material sensitivity levels present
 *   - All mapping types represented
 *   - Physics chain strings are non-empty
 *
 * Critical test rule: ALL tests assert SPECIFIC expected values — NOT toBeTruthy().
 *
 * @milestone HM-KC-MS8/U-HKC42
 */

import { describe, it, expect } from "vitest";
import {
  HyperMillDeflectionThermalMappingEngine,
  deflectionThermalMappingEngine,
  DEFLECTION_THERMAL_MAPPINGS,
  DEFLECTION_THERMAL_MAPPING_SUMMARY,
  type DeflectionThermalMapping,
} from "../engines/hypermill/HyperMillDeflectionThermalMappingEngine.js";

describe("HyperMillDeflectionThermalMappingEngine (U-HKC42)", () => {
  const engine = new HyperMillDeflectionThermalMappingEngine();
  const summary = engine.getSummary();

  // ── 1. Grand total count ───────────────────────────────────────────────────

  it("total mappings is >= 380", () => {
    expect(DEFLECTION_THERMAL_MAPPINGS.length).toBeGreaterThanOrEqual(380);
  });

  it("summary.totalMappings matches DEFLECTION_THERMAL_MAPPINGS.length", () => {
    expect(summary.totalMappings).toBe(DEFLECTION_THERMAL_MAPPINGS.length);
  });

  // ── 2. Deflection mapping count ───────────────────────────────────────────

  it("deflection mappings (mappingType=deflection_limit) is >= 180", () => {
    expect(summary.deflectionMappings).toBeGreaterThanOrEqual(180);
  });

  it("getDeflectionMappings() returns >= 180 entries", () => {
    const deflections = engine.getDeflectionMappings();
    expect(deflections.length).toBeGreaterThanOrEqual(180);
  });

  it("deflection mappings only contain deflection_limit type", () => {
    const deflections = engine.getDeflectionMappings();
    const nonDeflection = deflections.filter((m) => m.mappingType !== "deflection_limit");
    expect(nonDeflection).toHaveLength(0);
  });

  // ── 3. Thermal mapping count ──────────────────────────────────────────────

  it("thermal mappings (thermal_limit + wear_rate + temperature_check) is >= 200", () => {
    expect(summary.thermalMappings).toBeGreaterThanOrEqual(200);
  });

  it("getThermalMappings() returns >= 200 entries", () => {
    const thermals = engine.getThermalMappings();
    expect(thermals.length).toBeGreaterThanOrEqual(200);
  });

  it("deflection + thermal counts sum to totalMappings", () => {
    expect(summary.deflectionMappings + summary.thermalMappings).toBe(summary.totalMappings);
  });

  // ── 4. All 4 target engines represented ───────────────────────────────────

  it("ToolDeflectionEngine is represented", () => {
    const count = engine.getMappingsByEngine("ToolDeflectionEngine").length;
    expect(count).toBeGreaterThanOrEqual(1);
  });

  it("PartDeflectionEngine is represented", () => {
    const count = engine.getMappingsByEngine("PartDeflectionEngine").length;
    expect(count).toBeGreaterThanOrEqual(1);
  });

  it("ThermalWearCouplingEngine is represented", () => {
    const count = engine.getMappingsByEngine("ThermalWearCouplingEngine").length;
    expect(count).toBeGreaterThanOrEqual(1);
  });

  it("CuttingTemperatureEngine is represented", () => {
    const count = engine.getMappingsByEngine("CuttingTemperatureEngine").length;
    expect(count).toBeGreaterThanOrEqual(1);
  });

  it("summary.byEngine has exactly 4 engine keys", () => {
    expect(Object.keys(summary.byEngine)).toHaveLength(4);
  });

  // ── 5. All material sensitivity levels present ────────────────────────────

  it("material sensitivity 'high' is present", () => {
    const count = summary.byMaterialSensitivity["high"] ?? 0;
    expect(count).toBeGreaterThanOrEqual(1);
  });

  it("material sensitivity 'medium' is present", () => {
    const count = summary.byMaterialSensitivity["medium"] ?? 0;
    expect(count).toBeGreaterThanOrEqual(1);
  });

  it("material sensitivity 'low' is present", () => {
    const count = summary.byMaterialSensitivity["low"] ?? 0;
    expect(count).toBeGreaterThanOrEqual(1);
  });

  it("getMappingsByMaterialSensitivity('high') returns >= 50 entries", () => {
    const highSensitivity = engine.getMappingsByMaterialSensitivity("high");
    expect(highSensitivity.length).toBeGreaterThanOrEqual(50);
  });

  // ── 6. All mapping types represented ─────────────────────────────────────

  it("mappingType 'deflection_limit' is present", () => {
    const count = engine.getMappingsByType("deflection_limit").length;
    expect(count).toBeGreaterThanOrEqual(1);
  });

  it("mappingType 'thermal_limit' is present", () => {
    const count = engine.getMappingsByType("thermal_limit").length;
    expect(count).toBeGreaterThanOrEqual(1);
  });

  it("mappingType 'wear_rate' is present", () => {
    const count = engine.getMappingsByType("wear_rate").length;
    expect(count).toBeGreaterThanOrEqual(1);
  });

  it("mappingType 'temperature_check' is present", () => {
    const count = engine.getMappingsByType("temperature_check").length;
    expect(count).toBeGreaterThanOrEqual(1);
  });

  // ── 7. Physics chain strings are non-empty ────────────────────────────────

  it("all mappings have non-empty physicsChain strings", () => {
    const emptyChains = DEFLECTION_THERMAL_MAPPINGS.filter(
      (m) => !m.physicsChain || m.physicsChain.trim().length === 0
    );
    expect(emptyChains).toHaveLength(0);
  });

  it("all mappings have non-empty parameterId strings", () => {
    const emptyIds = DEFLECTION_THERMAL_MAPPINGS.filter(
      (m) => !m.parameterId || m.parameterId.trim().length === 0
    );
    expect(emptyIds).toHaveLength(0);
  });

  it("all mappings have non-empty parameterDomain strings", () => {
    const emptyDomains = DEFLECTION_THERMAL_MAPPINGS.filter(
      (m) => !m.parameterDomain || m.parameterDomain.trim().length === 0
    );
    expect(emptyDomains).toHaveLength(0);
  });

  it("all mappings have non-empty confidenceLevel strings", () => {
    const empty = DEFLECTION_THERMAL_MAPPINGS.filter(
      (m) => !m.confidenceLevel || m.confidenceLevel.trim().length === 0
    );
    expect(empty).toHaveLength(0);
  });

  // ── 8. Domain coverage ────────────────────────────────────────────────────

  it("3d_milling domain has >= 20 mappings", () => {
    const count = engine.getMappingsByDomain("3d_milling").length;
    expect(count).toBeGreaterThanOrEqual(20);
  });

  it("5axis_milling domain has >= 20 mappings", () => {
    const count = engine.getMappingsByDomain("5axis_milling").length;
    expect(count).toBeGreaterThanOrEqual(20);
  });

  it("2d_milling domain has >= 10 mappings", () => {
    const count = engine.getMappingsByDomain("2d_milling").length;
    expect(count).toBeGreaterThanOrEqual(10);
  });

  it("drilling domain has >= 10 mappings", () => {
    const count = engine.getMappingsByDomain("drilling").length;
    expect(count).toBeGreaterThanOrEqual(10);
  });

  it("turning domain has >= 10 mappings", () => {
    const count = engine.getMappingsByDomain("turning").length;
    expect(count).toBeGreaterThanOrEqual(10);
  });

  it("linking domain has >= 20 mappings", () => {
    const count = engine.getMappingsByDomain("linking").length;
    expect(count).toBeGreaterThanOrEqual(20);
  });

  it("coolant domain has >= 10 mappings", () => {
    const count = engine.getMappingsByDomain("coolant").length;
    expect(count).toBeGreaterThanOrEqual(10);
  });

  // ── 9. All parameterId values are unique ──────────────────────────────────

  it("all parameterId values are unique", () => {
    const ids = DEFLECTION_THERMAL_MAPPINGS.map((m) => m.parameterId);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  // ── 10. Singleton export is functional ────────────────────────────────────

  it("deflectionThermalMappingEngine singleton has same summary as class instance", () => {
    const singletonSummary = deflectionThermalMappingEngine.getSummary();
    expect(singletonSummary.totalMappings).toBe(summary.totalMappings);
  });

  it("DEFLECTION_THERMAL_MAPPING_SUMMARY export matches getSummary()", () => {
    expect(DEFLECTION_THERMAL_MAPPING_SUMMARY.totalMappings).toBe(summary.totalMappings);
    expect(DEFLECTION_THERMAL_MAPPING_SUMMARY.deflectionMappings).toBe(
      summary.deflectionMappings
    );
    expect(DEFLECTION_THERMAL_MAPPING_SUMMARY.thermalMappings).toBe(summary.thermalMappings);
  });

  // ── 11. Specific physics chain content checks ─────────────────────────────

  it("titanium mappings reference S-group kienzle constant", () => {
    const tiMappings = DEFLECTION_THERMAL_MAPPINGS.filter(
      (m) => m.parameterId.includes("_ti") || m.parameterId.includes("_inconel")
    );
    const withSGroup = tiMappings.filter(
      (m) => m.physicsChain.includes("S-group") || m.physicsChain.includes("S-group")
    );
    expect(withSGroup.length).toBeGreaterThanOrEqual(10);
  });

  it("deflection mappings reference the cantilever formula pattern", () => {
    const deflections = engine.getDeflectionMappings();
    const withFormula = deflections.filter(
      (m) => m.physicsChain.includes("FL³/3EI") || m.physicsChain.includes("delta")
    );
    expect(withFormula.length).toBeGreaterThanOrEqual(20);
  });

  it("thermal mappings reference temperature thresholds or Usui wear", () => {
    const thermals = engine.getThermalMappings();
    const withPhysics = thermals.filter(
      (m) =>
        m.physicsChain.includes("Usui") ||
        m.physicsChain.includes("θ") ||
        m.physicsChain.includes("Taylor") ||
        m.physicsChain.includes("VB")
    );
    expect(withPhysics.length).toBeGreaterThanOrEqual(30);
  });

  // ── 12. Hardened steel (H-group) mappings ─────────────────────────────────

  it("at least 5 hardened-steel mappings exist (H-group, >45HRC)", () => {
    const hardened = DEFLECTION_THERMAL_MAPPINGS.filter((m) =>
      m.parameterId.includes("hardened")
    );
    expect(hardened.length).toBeGreaterThanOrEqual(5);
  });

  // ── 13. byDomain summary coverage ─────────────────────────────────────────

  it("summary.byDomain contains at least 7 distinct domains", () => {
    expect(Object.keys(summary.byDomain).length).toBeGreaterThanOrEqual(7);
  });
});
