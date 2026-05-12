/**
 * Tests for PlungeMillingEngine
 */
import { describe, it, expect } from "vitest";
import { PlungeMillingEngine } from "../engines/PlungeMillingEngine.js";

describe("PlungeMillingEngine", () => {
  const engine = new PlungeMillingEngine();

  // ── Basic Calculation ───────────────────────────────────────

  it("calculates single plunge for steel", () => {
    const r = engine.calculate({
      tool_diameter_mm: 20,
      num_flutes: 4,
      depth_mm: 30,
      material_iso_group: "P",
    });
    expect(r.plunge_feed.value).toBeGreaterThan(0);
    expect(r.chip_load_axial.value).toBe(0.1);
    expect(r.step_over.value).toBe(12); // 20 × 0.6
    expect(r.spindle_rpm.value).toBeGreaterThan(0);
    expect(r.axial_force.value).toBeGreaterThan(0);
    expect(r.radial_force.value).toBeGreaterThan(0);
    expect(r.number_of_plunges.value).toBe(1);
    expect(r.cycle_time.value).toBeGreaterThan(0);
  });

  it("axial force >> radial force", () => {
    const r = engine.calculate({
      tool_diameter_mm: 20,
      num_flutes: 4,
      depth_mm: 30,
    });
    expect(r.axial_force.value).toBeGreaterThan(
      r.radial_force.value * 5
    );
    expect(r.force_ratio.value).toBeGreaterThan(5);
  });

  it("calculates pocket plunge pattern", () => {
    const r = engine.calculate({
      tool_diameter_mm: 20,
      num_flutes: 4,
      depth_mm: 30,
      pocket_length_mm: 60,
      pocket_width_mm: 40,
    });
    // Step over = 12mm
    // nx = ceil(60/12) = 5, ny = ceil(40/12) = 4
    expect(r.number_of_plunges.value).toBe(20);
    expect(r.cycle_time.value).toBeGreaterThan(0);
  });

  it("adjusts speed for material", () => {
    const steel = engine.calculate({
      tool_diameter_mm: 20,
      num_flutes: 4,
      depth_mm: 30,
      material_iso_group: "P",
    });
    const alu = engine.calculate({
      tool_diameter_mm: 20,
      num_flutes: 4,
      depth_mm: 30,
      material_iso_group: "N",
    });
    expect(alu.spindle_rpm.value).toBeGreaterThan(
      steel.spindle_rpm.value
    );
  });

  it("higher force for harder material", () => {
    const steel = engine.calculate({
      tool_diameter_mm: 20,
      num_flutes: 4,
      depth_mm: 30,
      material_iso_group: "P",
    });
    const hard = engine.calculate({
      tool_diameter_mm: 20,
      num_flutes: 4,
      depth_mm: 30,
      material_iso_group: "H",
    });
    expect(hard.axial_force.value).toBeGreaterThan(
      steel.axial_force.value
    );
  });

  it("warns on high overhang", () => {
    const r = engine.calculate({
      tool_diameter_mm: 20,
      num_flutes: 4,
      depth_mm: 30,
      overhang_ratio: 7,
    });
    expect(
      r.warnings.some(w => w.includes("L/D"))
    ).toBe(true);
  });

  it("warns on large tool diameter", () => {
    const r = engine.calculate({
      tool_diameter_mm: 63,
      num_flutes: 6,
      depth_mm: 40,
    });
    expect(
      r.warnings.some(w => w.includes("thrust"))
    ).toBe(true);
  });

  // ── AtomicValue Format ──────────────────────────────────────

  it("returns AtomicValue format", () => {
    const r = engine.calculate({
      tool_diameter_mm: 20,
      num_flutes: 4,
      depth_mm: 30,
    });
    for (const key of [
      "plunge_feed", "chip_load_axial", "step_over",
      "spindle_rpm", "axial_force", "radial_force",
      "mrr", "cycle_time", "force_ratio",
    ] as const) {
      expect(r[key]).toHaveProperty("value");
      expect(r[key]).toHaveProperty("unit");
      expect(r[key]).toHaveProperty("uncertainty");
      expect(r[key]).toHaveProperty("source");
    }
  });

  it("exports singleton", async () => {
    const { plungeMillingEngine } = await import(
      "../engines/PlungeMillingEngine.js"
    );
    expect(plungeMillingEngine).toBeInstanceOf(
      PlungeMillingEngine
    );
  });
});
