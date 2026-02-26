/**
 * S1-MS1 Registry Enrichment Test Suite
 * Tests CoolantRegistry, CoatingRegistry, ToolGeometryDefaults, MachineSpindleDefaults
 */

import { describe, it, expect } from "vitest";
import { coolantRegistry } from "../registries/CoolantRegistry.js";
import { coatingRegistry } from "../registries/CoatingRegistry.js";
import {
  getToolGeometryDefault,
  TOOL_GEOMETRY_DEFAULTS,
} from "../registries/ToolGeometryDefaults.js";
import {
  getMachineSpindleDefault,
  MACHINE_SPINDLE_DEFAULTS,
  estimateTorqueFromPower,
  estimatePowerFromTorque,
} from "../registries/MachineSpindleDefaults.js";

// ============================================================================
// COOLANT REGISTRY
// ============================================================================

describe("CoolantRegistry", () => {
  it("loads 22 built-in coolants", async () => {
    await coolantRegistry.load();
    expect(coolantRegistry.size).toBe(22);
  });

  it("get() returns coolant by id", async () => {
    await coolantRegistry.load();
    const emulsion = coolantRegistry.get("flood-emulsion-general");
    expect(emulsion).toBeDefined();
    expect(emulsion!.name).toContain("Emulsion");
    expect(emulsion!.category).toBe("emulsion");
  });

  it("all coolants have SFC correction factors", async () => {
    await coolantRegistry.load();
    for (const c of coolantRegistry.all()) {
      expect(c.sfc_factors).toBeDefined();
      expect(c.sfc_factors.force_reduction).toBeGreaterThan(0);
      expect(c.sfc_factors.force_reduction).toBeLessThanOrEqual(1.0);
      expect(c.sfc_factors.tool_life_factor).toBeGreaterThan(0);
    }
  });

  it("force_reduction is in safe range [0.70, 1.0]", async () => {
    await coolantRegistry.load();
    for (const c of coolantRegistry.all()) {
      expect(c.sfc_factors.force_reduction).toBeGreaterThanOrEqual(0.70);
      expect(c.sfc_factors.force_reduction).toBeLessThanOrEqual(1.0);
    }
  });

  it("searchCoolants by category returns correct subset", async () => {
    await coolantRegistry.load();
    const cryo = coolantRegistry.searchCoolants({ category: "cryogenic" });
    expect(cryo.total).toBeGreaterThanOrEqual(2);
    for (const c of cryo.coolants) {
      expect(c.category).toBe("cryogenic");
    }
  });

  it("recommend returns valid coolants for steel milling", async () => {
    await coolantRegistry.load();
    const recs = coolantRegistry.recommend({
      material_group: "P_STEELS",
      operation: "milling",
    });
    expect(recs.length).toBeGreaterThan(0);
    for (const c of recs) {
      expect(c.compatible_materials).toContain("P_STEELS");
    }
  });

  it("getSfcFactor returns number for valid id", async () => {
    await coolantRegistry.load();
    const factor = coolantRegistry.getSfcFactor("flood-emulsion-general");
    expect(typeof factor).toBe("number");
    expect(factor).toBeGreaterThan(0);
    expect(factor).toBeLessThanOrEqual(1.0);
  });

  it("getSfcFactor returns 1.0 for unknown id", async () => {
    await coolantRegistry.load();
    const factor = coolantRegistry.getSfcFactor("nonexistent");
    expect(factor).toBe(1.0);
  });

  it("getStats returns correct structure", async () => {
    await coolantRegistry.load();
    const stats = coolantRegistry.getStats();
    expect(stats.total).toBe(22);
    expect(stats.by_category).toBeDefined();
    expect(stats.by_base).toBeDefined();
    expect(stats.by_delivery).toBeDefined();
  });
});

// ============================================================================
// COATING REGISTRY
// ============================================================================

describe("CoatingRegistry", () => {
  it("loads 19 built-in coatings", async () => {
    await coatingRegistry.load();
    expect(coatingRegistry.size).toBe(19);
  });

  it("get() returns coating by id", async () => {
    await coatingRegistry.load();
    const tialn = coatingRegistry.get("tialn");
    expect(tialn).toBeDefined();
    expect(tialn!.formula).toBe("TiAlN");
    expect(tialn!.process).toBe("PVD");
  });

  it("all coatings have SFC correction factors", async () => {
    await coatingRegistry.load();
    for (const c of coatingRegistry.all()) {
      expect(c.sfc_factors).toBeDefined();
      expect(c.sfc_factors.friction_factor).toBeGreaterThan(0);
      expect(c.sfc_factors.friction_factor).toBeLessThanOrEqual(1.0);
      expect(c.sfc_factors.tool_life_multiplier).toBeGreaterThan(0);
    }
  });

  it("friction_factor is in safe range [0.50, 1.0]", async () => {
    await coatingRegistry.load();
    for (const c of coatingRegistry.all()) {
      expect(c.sfc_factors.friction_factor).toBeGreaterThanOrEqual(0.50);
      expect(c.sfc_factors.friction_factor).toBeLessThanOrEqual(1.0);
    }
  });

  it("searchCoatings by process returns correct subset", async () => {
    await coatingRegistry.load();
    const pvd = coatingRegistry.searchCoatings({ process: "PVD" });
    expect(pvd.total).toBeGreaterThanOrEqual(5);
    for (const c of pvd.coatings) {
      expect(c.process).toBe("PVD");
    }
  });

  it("recommend returns coatings for steel general machining", async () => {
    await coatingRegistry.load();
    const recs = coatingRegistry.recommend({
      material_group: "P_STEELS",
      application: "general",
    });
    expect(recs.length).toBeGreaterThan(0);
    for (const c of recs) {
      expect(c.compatibility["P_STEELS"]).toBeGreaterThanOrEqual(3);
    }
  });

  it("getSfcFactors returns factors for valid id", async () => {
    await coatingRegistry.load();
    const factors = coatingRegistry.getSfcFactors("tialn");
    expect(factors).toBeDefined();
    expect(factors!.friction_factor).toBeLessThan(1.0);
    expect(factors!.tool_life_multiplier).toBeGreaterThan(1.0);
  });

  it("getSfcFactors returns undefined for unknown id", async () => {
    await coatingRegistry.load();
    const factors = coatingRegistry.getSfcFactors("nonexistent");
    expect(factors).toBeUndefined();
  });

  it("getStats returns correct structure", async () => {
    await coatingRegistry.load();
    const stats = coatingRegistry.getStats();
    expect(stats.total).toBe(19);
    expect(stats.by_category).toBeDefined();
    expect(stats.by_process).toBeDefined();
  });
});

// ============================================================================
// TOOL GEOMETRY DEFAULTS
// ============================================================================

describe("ToolGeometryDefaults", () => {
  it("has at least 20 entries", () => {
    expect(Object.keys(TOOL_GEOMETRY_DEFAULTS).length).toBeGreaterThanOrEqual(20);
  });

  it("all entries have valid rake_angle range [-15, 30]", () => {
    for (const [key, d] of Object.entries(TOOL_GEOMETRY_DEFAULTS)) {
      expect(d.rake_angle_deg).toBeGreaterThanOrEqual(-15);
      expect(d.rake_angle_deg).toBeLessThanOrEqual(30);
    }
  });

  it("all entries have valid relief_angle range [0, 30]", () => {
    for (const [key, d] of Object.entries(TOOL_GEOMETRY_DEFAULTS)) {
      // Holders and some specialty items may have 0 relief angle
      expect(d.relief_angle_deg).toBeGreaterThanOrEqual(0);
      expect(d.relief_angle_deg).toBeLessThanOrEqual(30);
    }
  });

  it("getToolGeometryDefault matches endmill", () => {
    const geo = getToolGeometryDefault("endmill");
    expect(geo).toBeDefined();
    expect(geo!.rake_angle_deg).toBeGreaterThan(0);
    expect(geo!.flute_count).toBeGreaterThanOrEqual(2);
  });

  it("getToolGeometryDefault fuzzy matches ball_nose_endmill", () => {
    const geo = getToolGeometryDefault("ball_nose_endmill");
    expect(geo).toBeDefined();
    expect(geo!.rake_angle_deg).toBeGreaterThan(0);
  });

  it("getToolGeometryDefault matches CNMG insert", () => {
    const geo = getToolGeometryDefault("CNMG");
    expect(geo).toBeDefined();
    expect(geo!.rake_angle_deg).toBeLessThanOrEqual(10);
  });

  it("getToolGeometryDefault matches drill", () => {
    const geo = getToolGeometryDefault("drill");
    expect(geo).toBeDefined();
    expect(geo!.helix_angle_deg).toBeGreaterThan(0);
  });

  it("getToolGeometryDefault returns undefined for gibberish", () => {
    const geo = getToolGeometryDefault("zzz_nonexistent_xyz");
    expect(geo).toBeUndefined();
  });
});

// ============================================================================
// MACHINE SPINDLE DEFAULTS
// ============================================================================

describe("MachineSpindleDefaults", () => {
  it("has at least 15 entries", () => {
    expect(Object.keys(MACHINE_SPINDLE_DEFAULTS).length).toBeGreaterThanOrEqual(15);
  });

  it("all entries have positive RPM", () => {
    for (const [key, d] of Object.entries(MACHINE_SPINDLE_DEFAULTS)) {
      // EDM types have 0 RPM — skip those
      if (key.includes("edm")) continue;
      expect(d.max_rpm).toBeGreaterThan(0);
      expect(d.min_rpm).toBeGreaterThanOrEqual(0);
      expect(d.max_rpm).toBeGreaterThan(d.min_rpm);
    }
  });

  it("all milling entries have power > 5kW", () => {
    const millingTypes = ["vertical_machining_center", "hmc", "5axis_machining_center"];
    for (const t of millingTypes) {
      const d = MACHINE_SPINDLE_DEFAULTS[t];
      expect(d).toBeDefined();
      expect(d.power_continuous).toBeGreaterThan(5);
    }
  });

  it("getMachineSpindleDefault matches VMC", () => {
    const d = getMachineSpindleDefault("vertical_machining_center");
    expect(d).toBeDefined();
    expect(d!.max_rpm).toBe(10000);
    expect(d!.spindle_nose).toBe("BT40");
  });

  it("getMachineSpindleDefault fuzzy matches 5-axis", () => {
    const d = getMachineSpindleDefault("5-axis machining center");
    expect(d).toBeDefined();
    expect(d!.spindle_nose).toBe("HSK-A63");
  });

  it("getMachineSpindleDefault matches lathe variants", () => {
    for (const name of ["lathe", "turning center", "CNC Lathe", "2-axis slant bed"]) {
      const d = getMachineSpindleDefault(name);
      expect(d).toBeDefined();
      expect(d!.spindle_nose).toContain("A2");
    }
  });

  it("getMachineSpindleDefault returns undefined for gibberish", () => {
    const d = getMachineSpindleDefault("zzz_nonexistent_xyz");
    expect(d).toBeUndefined();
  });

  it("estimateTorqueFromPower calculates correctly", () => {
    // T = (P * 9549) / n
    // 11 kW at 10000 RPM → ~10.5 Nm
    const torque = estimateTorqueFromPower(11, 10000);
    expect(torque).toBeCloseTo(10.5, 0);
  });

  it("estimatePowerFromTorque calculates correctly", () => {
    // P = (T * n) / 9549
    // 120 Nm at 10000 RPM → ~125.6 kW
    const power = estimatePowerFromTorque(120, 10000);
    expect(power).toBeCloseTo(125.6, 0);
  });

  it("estimateTorqueFromPower returns 0 for 0 RPM", () => {
    expect(estimateTorqueFromPower(11, 0)).toBe(0);
  });
});
