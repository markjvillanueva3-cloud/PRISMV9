/**
 * Tests for RampingEngine
 */
import { describe, it, expect } from "vitest";
import { RampingEngine } from "../engines/RampingEngine.js";

describe("RampingEngine", () => {
  const engine = new RampingEngine();

  // ── Linear Ramp ───────────────────────────────────────────────

  it("calculates linear ramp for 10mm end mill", () => {
    const r = engine.linearRamp({
      tool_diameter_mm: 10,
      target_depth_mm: 5,
      material_iso_group: "P",
    });
    expect(r.ramp_angle.value).toBeGreaterThan(0);
    expect(r.ramp_angle.value).toBeLessThanOrEqual(10);
    expect(r.ramp_length.value).toBeGreaterThan(0);
    expect(r.ramp_feed.value).toBeGreaterThan(0);
    expect(r.ramp_feed.value).toBeLessThan(r.normal_feed.value);
    expect(r.cutting_speed.value).toBe(150);
    expect(r.cycle_time.value).toBeGreaterThan(0);
  });

  it("ramp length increases with depth", () => {
    const shallow = engine.linearRamp({
      tool_diameter_mm: 10,
      target_depth_mm: 2,
    });
    const deep = engine.linearRamp({
      tool_diameter_mm: 10,
      target_depth_mm: 10,
    });
    expect(deep.ramp_length.value).toBeGreaterThan(
      shallow.ramp_length.value
    );
  });

  it("feed reduction is between 50-70%", () => {
    const r = engine.linearRamp({
      tool_diameter_mm: 10,
      target_depth_mm: 5,
    });
    expect(r.feed_reduction.value).toBeGreaterThanOrEqual(50);
    expect(r.feed_reduction.value).toBeLessThanOrEqual(70);
  });

  it("multiple passes for deep ramp", () => {
    const r = engine.linearRamp({
      tool_diameter_mm: 10,
      target_depth_mm: 20,
    });
    expect(r.num_ramp_passes.value).toBeGreaterThan(1);
  });

  it("respects custom max angle", () => {
    const r = engine.linearRamp({
      tool_diameter_mm: 10,
      target_depth_mm: 5,
      max_ramp_angle_deg: 3,
    });
    expect(r.ramp_angle.value).toBeLessThanOrEqual(3);
  });

  it("warns on steep angle with 2-flute", () => {
    const r = engine.linearRamp({
      tool_diameter_mm: 10,
      num_flutes: 2,
      target_depth_mm: 5,
      max_ramp_angle_deg: 8,
    });
    expect(
      r.warnings.some(w => w.includes("2-flute"))
    ).toBe(true);
  });

  it("warns on full-width slot ramp", () => {
    const r = engine.linearRamp({
      tool_diameter_mm: 10,
      target_depth_mm: 5,
      slot_width_mm: 10,
    });
    expect(
      r.warnings.some(w => w.includes("full-width"))
    ).toBe(true);
  });

  it("warns on deep ramp suggesting helical", () => {
    const r = engine.linearRamp({
      tool_diameter_mm: 10,
      target_depth_mm: 40,
    });
    expect(
      r.warnings.some(w => w.includes("helical"))
    ).toBe(true);
  });

  // ── Helical Ramp ──────────────────────────────────────────────

  it("calculates helical ramp entry", () => {
    const r = engine.helicalRamp({
      tool_diameter_mm: 10,
      pocket_diameter_mm: 30,
      target_depth_mm: 10,
      material_iso_group: "P",
    });
    expect(r.helix_diameter.value).toBeCloseTo(20, 0);
    expect(r.ramp_angle.value).toBeGreaterThan(0);
    expect(r.pitch_per_revolution.value).toBeGreaterThan(0);
    expect(r.num_revolutions.value).toBeGreaterThan(0);
    expect(r.ramp_feed.value).toBeGreaterThan(0);
    expect(r.cycle_time.value).toBeGreaterThan(0);
  });

  it("helix diameter = pocket - tool", () => {
    const r = engine.helicalRamp({
      tool_diameter_mm: 12,
      pocket_diameter_mm: 40,
      target_depth_mm: 5,
    });
    expect(r.helix_diameter.value).toBeCloseTo(28, 0);
  });

  it("more revolutions for deeper pocket", () => {
    const shallow = engine.helicalRamp({
      tool_diameter_mm: 10,
      pocket_diameter_mm: 30,
      target_depth_mm: 3,
    });
    const deep = engine.helicalRamp({
      tool_diameter_mm: 10,
      pocket_diameter_mm: 30,
      target_depth_mm: 20,
    });
    expect(deep.num_revolutions.value).toBeGreaterThan(
      shallow.num_revolutions.value
    );
  });

  it("warns on tight pocket", () => {
    const r = engine.helicalRamp({
      tool_diameter_mm: 10,
      pocket_diameter_mm: 13,
      target_depth_mm: 5,
    });
    expect(
      r.warnings.some(w => w.includes("Tight"))
    ).toBe(true);
  });

  it("warns when pocket smaller than tool", () => {
    const r = engine.helicalRamp({
      tool_diameter_mm: 10,
      pocket_diameter_mm: 8,
      target_depth_mm: 5,
    });
    expect(
      r.warnings.some(w => w.includes("too small"))
    ).toBe(true);
  });

  it("radial engagement reported as percentage", () => {
    const r = engine.helicalRamp({
      tool_diameter_mm: 10,
      pocket_diameter_mm: 30,
      target_depth_mm: 5,
    });
    expect(r.radial_engagement.value).toBeGreaterThan(0);
    expect(r.radial_engagement.unit).toBe("%");
  });

  // ── AtomicValue Format ────────────────────────────────────────

  it("returns AtomicValue format for linear", () => {
    const r = engine.linearRamp({
      tool_diameter_mm: 10,
      target_depth_mm: 5,
    });
    for (const key of [
      "ramp_angle", "ramp_length", "ramp_feed",
      "cutting_speed", "spindle_rpm", "cycle_time",
    ] as const) {
      expect(r[key]).toHaveProperty("value");
      expect(r[key]).toHaveProperty("unit");
      expect(r[key]).toHaveProperty("uncertainty");
      expect(r[key]).toHaveProperty("source");
    }
  });

  it("exports singleton", async () => {
    const { rampingEngine } = await import(
      "../engines/RampingEngine.js"
    );
    expect(rampingEngine).toBeInstanceOf(RampingEngine);
  });
});
