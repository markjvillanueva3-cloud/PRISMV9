/**
 * Tests for HelicalInterpolationEngine
 */
import { describe, it, expect } from "vitest";
import { HelicalInterpolationEngine } from "../engines/HelicalInterpolationEngine.js";

describe("HelicalInterpolationEngine", () => {
  const engine = new HelicalInterpolationEngine();

  // ── Thread Milling ────────────────────────────────────────────

  it("calculates internal thread milling parameters", () => {
    const r = engine.threadMill({
      thread_diameter_mm: 20,
      pitch_mm: 2.5,
      tool_diameter_mm: 12,
      num_flutes: 3,
      material_iso_group: "P",
    });
    // Helix dia = 20 - 12 = 8
    expect(r.helix_diameter.value).toBe(8);
    expect(r.spindle_rpm.value).toBeGreaterThan(0);
    expect(r.programmed_feed.value).toBeGreaterThan(0);
    expect(r.effective_chip_load.value).toBe(0.05);
    expect(r.cutting_speed.value).toBe(100);
    expect(r.number_of_passes.value).toBeGreaterThan(0);
    expect(r.cycle_time.value).toBeGreaterThan(0);
    expect(r.climb_or_conventional).toContain("G3");
    expect(r.g_code_hint).toContain("G3");
  });

  it("calculates external thread milling", () => {
    const r = engine.threadMill({
      thread_diameter_mm: 20,
      pitch_mm: 2.5,
      thread_type: "external",
      tool_diameter_mm: 12,
      num_flutes: 3,
    });
    // Helix dia = 20 + 12 = 32
    expect(r.helix_diameter.value).toBe(32);
    expect(r.climb_or_conventional).toContain("G2");
    expect(r.g_code_hint).toContain("G2");
  });

  it("warns when tool too large for internal thread", () => {
    const r = engine.threadMill({
      thread_diameter_mm: 10,
      pitch_mm: 1.5,
      tool_diameter_mm: 12,
      num_flutes: 3,
    });
    expect(
      r.warnings.some(w => w.includes("exceeds"))
    ).toBe(true);
  });

  it("warns on high tool/thread ratio", () => {
    const r = engine.threadMill({
      thread_diameter_mm: 14,
      pitch_mm: 2,
      tool_diameter_mm: 12,
      num_flutes: 3,
    });
    expect(
      r.warnings.some(w => w.includes("75%"))
    ).toBe(true);
  });

  it("uses single pass when specified", () => {
    const r = engine.threadMill({
      thread_diameter_mm: 20,
      pitch_mm: 2.5,
      tool_diameter_mm: 12,
      num_flutes: 3,
      single_pass: true,
    });
    expect(r.number_of_passes.value).toBe(1);
  });

  it("adjusts chip load for material group", () => {
    const steel = engine.threadMill({
      thread_diameter_mm: 20,
      pitch_mm: 2,
      tool_diameter_mm: 10,
      num_flutes: 3,
      material_iso_group: "P",
    });
    const alu = engine.threadMill({
      thread_diameter_mm: 20,
      pitch_mm: 2,
      tool_diameter_mm: 10,
      num_flutes: 3,
      material_iso_group: "N",
    });
    // N has higher chip load (0.08) vs P (0.05)
    expect(alu.effective_chip_load.value).toBeGreaterThan(
      steel.effective_chip_load.value
    );
  });

  // ── Bore Milling ──────────────────────────────────────────────

  it("calculates helical bore milling", () => {
    const r = engine.boreMill({
      target_diameter_mm: 50,
      tool_diameter_mm: 20,
      num_flutes: 4,
      depth_mm: 30,
      material_iso_group: "P",
    });
    // Helix dia = 50 - 20 = 30
    expect(r.helix_diameter.value).toBe(30);
    expect(r.radial_depth.value).toBe(15);
    expect(r.axial_step.value).toBe(10); // 20 * 0.5
    expect(r.spindle_rpm.value).toBeGreaterThan(0);
    expect(r.programmed_feed.value).toBeGreaterThan(0);
    expect(r.number_of_helixes.value).toBe(3); // 30 / 10
    expect(r.cycle_time.value).toBeGreaterThan(0);
  });

  it("warns when tool too large for bore", () => {
    const r = engine.boreMill({
      target_diameter_mm: 15,
      tool_diameter_mm: 20,
      num_flutes: 4,
      depth_mm: 20,
    });
    expect(
      r.warnings.some(w => w.includes("too large"))
    ).toBe(true);
  });

  it("warns on excessive radial depth", () => {
    const r = engine.boreMill({
      target_diameter_mm: 35,
      tool_diameter_mm: 20,
      num_flutes: 4,
      depth_mm: 30,
    });
    // radialDepth = 7.5, 50% of tool = 10, so 7.5 < 10 → no warning
    // Use tighter ratio: target 25 → helix 5, radial 2.5 vs tool*0.5=10 → no
    // Actually radialDepth > d*0.5 means > 10. target=42 → helix=22, radial=11 > 10
    const r2 = engine.boreMill({
      target_diameter_mm: 42,
      tool_diameter_mm: 20,
      num_flutes: 4,
      depth_mm: 30,
    });
    expect(
      r2.warnings.some(w => w.includes("Radial depth"))
    ).toBe(true);
  });

  it("uses custom step down", () => {
    const r = engine.boreMill({
      target_diameter_mm: 50,
      tool_diameter_mm: 20,
      num_flutes: 4,
      depth_mm: 30,
      step_down_mm: 5,
    });
    expect(r.axial_step.value).toBe(5);
    expect(r.number_of_helixes.value).toBe(6); // 30 / 5
  });

  // ── Helical Ramp ──────────────────────────────────────────────

  it("calculates helical ramp entry", () => {
    const r = engine.ramp({
      pocket_diameter_mm: 40,
      tool_diameter_mm: 16,
      depth_mm: 20,
      num_flutes: 3,
      material_iso_group: "P",
    });
    // Default ramp angle = 3.0 * 0.8 = 2.4
    expect(r.ramp_angle.value).toBe(2.4);
    // Helix dia = 40 - 16 = 24
    expect(r.helix_diameter.value).toBe(24);
    expect(r.axial_feed_per_rev.value).toBeGreaterThan(0);
    expect(r.programmed_feed.value).toBeGreaterThan(0);
    expect(r.number_of_ramp_revs.value).toBeGreaterThan(0);
    expect(r.ramp_distance.value).toBeGreaterThan(0);
  });

  it("warns when ramp angle exceeds max", () => {
    const r = engine.ramp({
      pocket_diameter_mm: 40,
      tool_diameter_mm: 16,
      ramp_angle_deg: 5,
      depth_mm: 20,
      num_flutes: 3,
      material_iso_group: "P", // max 3.0
    });
    expect(
      r.warnings.some(w => w.includes("exceeds max"))
    ).toBe(true);
  });

  it("warns when tool too large for pocket", () => {
    const r = engine.ramp({
      pocket_diameter_mm: 14,
      tool_diameter_mm: 16,
      depth_mm: 10,
      num_flutes: 3,
    });
    expect(
      r.warnings.some(w => w.includes("too large"))
    ).toBe(true);
  });

  it("uses custom ramp angle", () => {
    const r = engine.ramp({
      pocket_diameter_mm: 40,
      tool_diameter_mm: 16,
      ramp_angle_deg: 1.5,
      depth_mm: 20,
      num_flutes: 3,
    });
    expect(r.ramp_angle.value).toBe(1.5);
  });

  // ── AtomicValue Format ──────────────────────────────────────

  it("returns AtomicValue format for thread mill", () => {
    const r = engine.threadMill({
      thread_diameter_mm: 20,
      pitch_mm: 2.5,
      tool_diameter_mm: 12,
      num_flutes: 3,
    });
    for (const key of [
      "helix_diameter", "programmed_feed", "effective_chip_load",
      "spindle_rpm", "cutting_speed", "number_of_passes", "cycle_time",
    ] as const) {
      expect(r[key]).toHaveProperty("value");
      expect(r[key]).toHaveProperty("unit");
      expect(r[key]).toHaveProperty("uncertainty");
      expect(r[key]).toHaveProperty("source");
    }
  });

  it("exports singleton", async () => {
    const { helicalInterpolationEngine } = await import(
      "../engines/HelicalInterpolationEngine.js"
    );
    expect(helicalInterpolationEngine).toBeInstanceOf(
      HelicalInterpolationEngine
    );
  });
});
