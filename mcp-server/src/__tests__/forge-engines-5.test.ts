/**
 * Tests for forge-engines round 5:
 *   ToolGeometrySelectionEngine, InsertGradeSelectionEngine, CoolantStrategyEngine
 */
import { describe, it, expect } from "vitest";
import { toolGeometrySelectionEngine } from "../engines/ToolGeometrySelectionEngine.js";
import { insertGradeSelectionEngine } from "../engines/InsertGradeSelectionEngine.js";
import { coolantStrategyEngine } from "../engines/CoolantStrategyEngine.js";

// Helper
function expectAtomicValue(v: unknown) {
  expect(v).toHaveProperty("value");
  expect(v).toHaveProperty("unit");
  expect(v).toHaveProperty("uncertainty");
  expect(v).toHaveProperty("source");
  expect(typeof (v as Record<string, unknown>).value).toBe("number");
  expect(typeof (v as Record<string, unknown>).unit).toBe("string");
  expect(typeof (v as Record<string, unknown>).uncertainty).toBe("number");
}

describe("ToolGeometrySelectionEngine", () => {
  it("returns AtomicValue format for all numeric fields", () => {
    const r = toolGeometrySelectionEngine.calculate({
      workpiece_material: "carbon_steel",
      operation: "side_milling",
      tool_diameter_mm: 12,
    });
    expectAtomicValue(r.recommended_flutes);
    expectAtomicValue(r.helix_angle_deg);
    expectAtomicValue(r.corner_radius_mm);
    expectAtomicValue(r.rake_angle_deg);
    expectAtomicValue(r.core_diameter_pct);
  });

  it("recommends fewer flutes for aluminum", () => {
    const r = toolGeometrySelectionEngine.calculate({
      workpiece_material: "aluminum",
      operation: "roughing",
      tool_diameter_mm: 16,
    });
    expect(r.recommended_flutes.value).toBeLessThanOrEqual(3);
  });

  it("recommends higher helix for stainless steel", () => {
    const steel = toolGeometrySelectionEngine.calculate({
      workpiece_material: "carbon_steel",
      operation: "side_milling",
      tool_diameter_mm: 12,
    });
    const ss = toolGeometrySelectionEngine.calculate({
      workpiece_material: "stainless_steel",
      operation: "side_milling",
      tool_diameter_mm: 12,
    });
    expect(ss.helix_angle_deg.value).toBeGreaterThan(steel.helix_angle_deg.value);
  });

  it("enables variable helix for titanium", () => {
    const r = toolGeometrySelectionEngine.calculate({
      workpiece_material: "titanium",
      operation: "adaptive",
      tool_diameter_mm: 10,
    });
    expect(r.variable_helix).toBe(true);
    expect(r.variable_pitch).toBe(true);
  });

  it("adds flutes for finishing", () => {
    const rough = toolGeometrySelectionEngine.calculate({
      workpiece_material: "alloy_steel",
      operation: "roughing",
      tool_diameter_mm: 16,
    });
    const finish = toolGeometrySelectionEngine.calculate({
      workpiece_material: "alloy_steel",
      operation: "finishing",
      tool_diameter_mm: 16,
    });
    expect(finish.recommended_flutes.value).toBeGreaterThanOrEqual(rough.recommended_flutes.value);
  });

  it("uses large corner radius for high-feed", () => {
    const r = toolGeometrySelectionEngine.calculate({
      workpiece_material: "carbon_steel",
      operation: "high_feed",
      tool_diameter_mm: 20,
    });
    expect(r.corner_treatment).toBe("corner_radius");
    expect(r.corner_radius_mm.value).toBeGreaterThanOrEqual(20 * 0.25);
  });

  it("reduces flutes for long-reach tools", () => {
    const normal = toolGeometrySelectionEngine.calculate({
      workpiece_material: "alloy_steel",
      operation: "side_milling",
      tool_diameter_mm: 10,
    });
    const longR = toolGeometrySelectionEngine.calculate({
      workpiece_material: "alloy_steel",
      operation: "side_milling",
      tool_diameter_mm: 10,
      is_long_reach: true,
    });
    expect(longR.recommended_flutes.value).toBeLessThanOrEqual(normal.recommended_flutes.value);
  });

  it("recommends chip breaker for gummy materials", () => {
    const r = toolGeometrySelectionEngine.calculate({
      workpiece_material: "stainless_steel",
      operation: "roughing",
      tool_diameter_mm: 12,
    });
    expect(r.chip_breaker).toBe(true);
  });

  it("uses negative rake for hardened steel roughing", () => {
    const r = toolGeometrySelectionEngine.calculate({
      workpiece_material: "hardened_steel",
      operation: "roughing",
      tool_diameter_mm: 10,
    });
    expect(r.rake_angle_deg.value).toBeLessThan(0);
  });
});

describe("InsertGradeSelectionEngine", () => {
  it("returns AtomicValue format for all numeric fields", () => {
    const r = insertGradeSelectionEngine.calculate({
      workpiece_material: "medium_carbon_steel",
      operation: "medium",
    });
    expectAtomicValue(r.iso_range);
    expectAtomicValue(r.edge_count);
    expectAtomicValue(r.nose_radius_mm);
    expectAtomicValue(r.toughness_vs_wear);
  });

  it("assigns ISO P group for steels", () => {
    const r = insertGradeSelectionEngine.calculate({
      workpiece_material: "alloy_steel",
      operation: "roughing",
    });
    expect(r.iso_application_group).toBe("P");
  });

  it("assigns ISO M group for stainless", () => {
    const r = insertGradeSelectionEngine.calculate({
      workpiece_material: "stainless_austenitic",
      operation: "medium",
    });
    expect(r.iso_application_group).toBe("M");
  });

  it("assigns ISO K group for cast iron", () => {
    const r = insertGradeSelectionEngine.calculate({
      workpiece_material: "cast_iron_grey",
      operation: "finishing",
    });
    expect(r.iso_application_group).toBe("K");
  });

  it("assigns ISO N group for aluminum", () => {
    const r = insertGradeSelectionEngine.calculate({
      workpiece_material: "aluminum_wrought",
      operation: "finishing",
    });
    expect(r.iso_application_group).toBe("N");
  });

  it("assigns ISO S group for superalloys", () => {
    const r = insertGradeSelectionEngine.calculate({
      workpiece_material: "titanium",
      operation: "roughing",
    });
    expect(r.iso_application_group).toBe("S");
  });

  it("assigns ISO H group for hardened steel", () => {
    const r = insertGradeSelectionEngine.calculate({
      workpiece_material: "hardened_steel",
      operation: "finishing",
    });
    expect(r.iso_application_group).toBe("H");
  });

  it("selects PCD substrate for aluminum", () => {
    const r = insertGradeSelectionEngine.calculate({
      workpiece_material: "aluminum_wrought",
      operation: "finishing",
    });
    expect(r.substrate_class).toBe("pcd");
  });

  it("selects CBN for hardened steel finishing", () => {
    const r = insertGradeSelectionEngine.calculate({
      workpiece_material: "hardened_steel",
      operation: "finishing",
      workpiece_hardness_hrc: 60,
    });
    expect(r.substrate_class).toBe("cbn");
  });

  it("selects tougher grade for interrupted cuts", () => {
    const cont = insertGradeSelectionEngine.calculate({
      workpiece_material: "alloy_steel",
      operation: "medium",
      interrupted_cut: false,
    });
    const intr = insertGradeSelectionEngine.calculate({
      workpiece_material: "alloy_steel",
      operation: "medium",
      interrupted_cut: true,
    });
    expect(intr.iso_range.value).toBeGreaterThan(cont.iso_range.value);
  });
});

describe("CoolantStrategyEngine", () => {
  it("returns AtomicValue format for all numeric fields", () => {
    const r = coolantStrategyEngine.calculate({
      workpiece_material: "carbon_steel",
      operation: "turning_rough",
    });
    expectAtomicValue(r.concentration_pct);
    expectAtomicValue(r.pressure_bar);
    expectAtomicValue(r.flow_rate_l_min);
    expectAtomicValue(r.temperature_target_c);
  });

  it("defaults to flood for plain steel turning", () => {
    const r = coolantStrategyEngine.calculate({
      workpiece_material: "carbon_steel",
      operation: "turning_rough",
    });
    expect(r.primary_method).toBe("flood");
    expect(r.fluid_type).toBe("water_soluble_emulsion");
  });

  it("selects dry for cast iron milling", () => {
    const r = coolantStrategyEngine.calculate({
      workpiece_material: "cast_iron",
      operation: "milling_rough",
    });
    expect(r.primary_method).toBe("dry");
    expect(r.fluid_type).toBe("none");
  });

  it("requires through-tool for deep hole drilling", () => {
    const r = coolantStrategyEngine.calculate({
      workpiece_material: "alloy_steel",
      operation: "deep_hole_drilling",
      tool_has_through_coolant: true,
    });
    expect(r.primary_method).toBe("through_tool");
    expect(r.pressure_bar.value).toBeGreaterThanOrEqual(70);
  });

  it("raises CRITICAL safety for magnesium", () => {
    const r = coolantStrategyEngine.calculate({
      workpiece_material: "magnesium",
      operation: "milling_rough",
    });
    expect(r.safety_notes.length).toBeGreaterThan(0);
    expect(r.safety_notes[0]).toContain("CRITICAL");
  });

  it("selects through-spindle for titanium with TSC", () => {
    const r = coolantStrategyEngine.calculate({
      workpiece_material: "titanium",
      operation: "turning_rough",
      tool_has_through_coolant: true,
    });
    expect(r.primary_method).toBe("through_spindle");
  });

  it("selects air blast for hardened steel finishing", () => {
    const r = coolantStrategyEngine.calculate({
      workpiece_material: "hardened_steel",
      operation: "turning_finish",
    });
    expect(r.primary_method).toBe("air_blast");
  });

  it("selects MQL with environmental priority", () => {
    const r = coolantStrategyEngine.calculate({
      workpiece_material: "aluminum",
      operation: "milling_finish",
      environmental_priority: true,
    });
    expect(r.primary_method).toBe("mql");
    expect(r.fluid_type).toBe("mql_ester");
  });

  it("scales flow rate with cutting speed", () => {
    const slow = coolantStrategyEngine.calculate({
      workpiece_material: "alloy_steel",
      operation: "turning_rough",
      cutting_speed_m_min: 50,
    });
    const fast = coolantStrategyEngine.calculate({
      workpiece_material: "alloy_steel",
      operation: "turning_rough",
      cutting_speed_m_min: 200,
    });
    expect(fast.flow_rate_l_min.value).toBeGreaterThan(slow.flow_rate_l_min.value);
  });

  it("requires high pressure for deep hole drilling", () => {
    const shallow = coolantStrategyEngine.calculate({
      workpiece_material: "alloy_steel",
      operation: "drilling",
    });
    const deep = coolantStrategyEngine.calculate({
      workpiece_material: "alloy_steel",
      operation: "deep_hole_drilling",
      tool_has_through_coolant: true,
    });
    expect(deep.pressure_bar.value).toBeGreaterThan(shallow.pressure_bar.value);
  });

  it("always provides an alternative method", () => {
    const r = coolantStrategyEngine.calculate({
      workpiece_material: "nickel_alloy",
      operation: "turning_rough",
    });
    expect(r.alternative_method).toBeDefined();
    expect(r.alternative_method).not.toBe(r.primary_method);
  });
});
