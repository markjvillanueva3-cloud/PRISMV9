/**
 * Tests for CircularInterpolationEngine
 */
import { describe, it, expect } from "vitest";
import {
  CircularInterpolationEngine,
} from "../engines/CircularInterpolationEngine.js";

describe("CircularInterpolationEngine", () => {
  const engine = new CircularInterpolationEngine();

  // ── Bore Milling ──────────────────────────────────────────

  it("calculates circular bore milling", () => {
    const r = engine.bore({
      target_diameter_mm: 50,
      tool_diameter_mm: 20,
      depth_mm: 30,
      num_flutes: 4,
      material_iso_group: "P",
    });
    // Tool path dia = 50 - 20 = 30
    expect(r.tool_path_diameter.value).toBe(30);
    expect(r.radial_engagement.value).toBe(15);
    expect(r.programmed_feed.value).toBeGreaterThan(0);
    expect(r.actual_chip_load.value).toBe(0.06);
    // Compensation factor = 30/50 = 0.6
    expect(r.feed_compensation_factor.value).toBeCloseTo(
      0.6, 2
    );
    expect(r.spindle_rpm.value).toBeGreaterThan(0);
    expect(r.number_of_passes.value).toBe(3); // 30/10
    expect(r.cycle_time.value).toBeGreaterThan(0);
    expect(r.min_bore_diameter.value).toBe(21);
    expect(r.g_code_direction).toContain("G3");
  });

  it("warns when tool too large for bore", () => {
    const r = engine.bore({
      target_diameter_mm: 20,
      tool_diameter_mm: 20,
      depth_mm: 10,
      num_flutes: 3,
    });
    expect(
      r.warnings.some(w => w.includes("cannot circular"))
    ).toBe(true);
  });

  it("warns on tight tool/bore ratio", () => {
    const r = engine.bore({
      target_diameter_mm: 22,
      tool_diameter_mm: 20,
      depth_mm: 10,
      num_flutes: 3,
    });
    expect(
      r.warnings.some(w => w.includes("90%"))
    ).toBe(true);
  });

  it("warns on small tool/bore ratio", () => {
    const r = engine.bore({
      target_diameter_mm: 60,
      tool_diameter_mm: 20,
      depth_mm: 10,
      num_flutes: 3,
    });
    expect(
      r.warnings.some(w => w.includes("40%"))
    ).toBe(true);
  });

  it("uses custom step down", () => {
    const r = engine.bore({
      target_diameter_mm: 50,
      tool_diameter_mm: 20,
      depth_mm: 30,
      num_flutes: 4,
      step_down_mm: 5,
    });
    expect(r.step_down.value).toBe(5);
    expect(r.number_of_passes.value).toBe(6);
  });

  it("accounts for roughing allowance", () => {
    const noAllow = engine.bore({
      target_diameter_mm: 50,
      tool_diameter_mm: 20,
      depth_mm: 20,
      num_flutes: 4,
    });
    const withAllow = engine.bore({
      target_diameter_mm: 50,
      tool_diameter_mm: 20,
      depth_mm: 20,
      num_flutes: 4,
      roughing_allowance_mm: 0.5,
    });
    // With allowance, effective bore is smaller → smaller path
    expect(withAllow.tool_path_diameter.value).toBeLessThan(
      noAllow.tool_path_diameter.value
    );
  });

  // ── Boss Milling ──────────────────────────────────────────

  it("calculates circular boss milling", () => {
    const r = engine.boss({
      target_diameter_mm: 30,
      tool_diameter_mm: 10,
      depth_mm: 15,
      num_flutes: 3,
      material_iso_group: "P",
    });
    // Tool path dia = 30 + 10 = 40
    expect(r.tool_path_diameter.value).toBe(40);
    expect(r.programmed_feed.value).toBeGreaterThan(0);
    // Comp factor = 40/30 ≈ 1.333
    expect(r.feed_compensation_factor.value).toBeCloseTo(
      1.333, 2
    );
    expect(r.g_code_direction).toContain("G2");
    expect(r.cycle_time.value).toBeGreaterThan(0);
  });

  it("warns on small boss vs tool", () => {
    const r = engine.boss({
      target_diameter_mm: 15,
      tool_diameter_mm: 10,
      depth_mm: 10,
      num_flutes: 3,
    });
    expect(
      r.warnings.some(w => w.includes("clearance"))
    ).toBe(true);
  });

  // ── Arc Feed Compensation ─────────────────────────────────

  it("compensates feed for internal arc", () => {
    const r = engine.arcFeedComp({
      tool_diameter_mm: 10,
      arc_diameter_mm: 40,
      is_internal: true,
      desired_chip_load_mm: 0.05,
      num_flutes: 3,
      rpm: 5000,
    });
    // Path dia = 40-10 = 30, comp = 30/40 = 0.75
    expect(r.compensation_factor.value).toBeCloseTo(0.75, 2);
    // Programmed feed < feed for straight line
    const straightFeed = 0.05 * 3 * 5000;
    expect(r.programmed_feed.value).toBeLessThan(straightFeed);
  });

  it("compensates feed for external arc", () => {
    const r = engine.arcFeedComp({
      tool_diameter_mm: 10,
      arc_diameter_mm: 40,
      is_internal: false,
      desired_chip_load_mm: 0.05,
      num_flutes: 3,
      rpm: 5000,
    });
    // Path dia = 40+10 = 50, comp = 50/40 = 1.25
    expect(r.compensation_factor.value).toBeCloseTo(1.25, 2);
    // Programmed feed > feed for straight line
    const straightFeed = 0.05 * 3 * 5000;
    expect(r.programmed_feed.value).toBeGreaterThan(
      straightFeed
    );
  });

  it("warns when tool cannot fit in arc", () => {
    const r = engine.arcFeedComp({
      tool_diameter_mm: 20,
      arc_diameter_mm: 15,
      is_internal: true,
      desired_chip_load_mm: 0.05,
      num_flutes: 3,
      rpm: 5000,
    });
    expect(
      r.warnings.some(w => w.includes("cannot fit"))
    ).toBe(true);
  });

  // ── AtomicValue Format ──────────────────────────────────────

  it("returns AtomicValue format for bore", () => {
    const r = engine.bore({
      target_diameter_mm: 50,
      tool_diameter_mm: 20,
      depth_mm: 20,
      num_flutes: 4,
    });
    for (const key of [
      "tool_path_diameter", "radial_engagement",
      "programmed_feed", "actual_chip_load",
      "feed_compensation_factor", "spindle_rpm",
      "number_of_passes", "step_down", "cycle_time",
      "min_bore_diameter",
    ] as const) {
      expect(r[key]).toHaveProperty("value");
      expect(r[key]).toHaveProperty("unit");
      expect(r[key]).toHaveProperty("uncertainty");
      expect(r[key]).toHaveProperty("source");
    }
  });

  it("exports singleton", async () => {
    const { circularInterpolationEngine } = await import(
      "../engines/CircularInterpolationEngine.js"
    );
    expect(circularInterpolationEngine).toBeInstanceOf(
      CircularInterpolationEngine
    );
  });
});
