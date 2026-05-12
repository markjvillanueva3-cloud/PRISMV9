/**
 * Tests for BallEndMillEngine
 */
import { describe, it, expect } from "vitest";
import {
  BallEndMillEngine,
} from "../engines/BallEndMillEngine.js";

describe("BallEndMillEngine", () => {
  const engine = new BallEndMillEngine();

  // ── Calculate ─────────────────────────────────────────────────

  it("calculates ball end mill for steel finishing", () => {
    const r = engine.calculate({
      tool_diameter_mm: 10,
      axial_depth_mm: 1,
      material_iso_group: "P",
    });
    expect(r.effective_diameter.value).toBeGreaterThan(0);
    expect(r.effective_diameter.value).toBeLessThan(10);
    expect(r.effective_speed.value).toBe(180);
    expect(r.spindle_rpm.value).toBeGreaterThan(0);
    expect(r.feed_per_tooth.value).toBeGreaterThan(0);
    expect(r.table_feed.value).toBeGreaterThan(0);
    expect(r.scallop_height.value).toBeGreaterThan(0);
    expect(r.mrr.value).toBeGreaterThan(0);
  });

  it("effective diameter increases with depth", () => {
    const shallow = engine.calculate({
      tool_diameter_mm: 10,
      axial_depth_mm: 0.5,
    });
    const deep = engine.calculate({
      tool_diameter_mm: 10,
      axial_depth_mm: 3,
    });
    expect(deep.effective_diameter.value).toBeGreaterThan(
      shallow.effective_diameter.value
    );
  });

  it("smaller scallop with smaller step-over", () => {
    const wide = engine.calculate({
      tool_diameter_mm: 10,
      axial_depth_mm: 1,
      step_over_mm: 1.0,
    });
    const narrow = engine.calculate({
      tool_diameter_mm: 10,
      axial_depth_mm: 1,
      step_over_mm: 0.3,
    });
    expect(narrow.scallop_height.value).toBeLessThan(
      wide.scallop_height.value
    );
  });

  it("calculates step-over from target scallop", () => {
    const r = engine.calculate({
      tool_diameter_mm: 10,
      axial_depth_mm: 1,
      target_scallop_um: 5,
    });
    expect(r.step_over.value).toBeGreaterThan(0);
    // Scallop should be near target
    expect(r.scallop_height.value).toBeLessThan(10);
  });

  it("higher speed for aluminum", () => {
    const steel = engine.calculate({
      tool_diameter_mm: 10,
      axial_depth_mm: 1,
      material_iso_group: "P",
    });
    const alu = engine.calculate({
      tool_diameter_mm: 10,
      axial_depth_mm: 1,
      material_iso_group: "N",
    });
    expect(alu.effective_speed.value).toBeGreaterThan(
      steel.effective_speed.value
    );
  });

  it("chip thinning factor < 1", () => {
    const r = engine.calculate({
      tool_diameter_mm: 10,
      axial_depth_mm: 1,
      step_over_mm: 0.5,
    });
    expect(r.chip_thinning_factor.value).toBeGreaterThan(0);
    expect(r.chip_thinning_factor.value).toBeLessThanOrEqual(1);
  });

  it("warns when depth exceeds radius", () => {
    const r = engine.calculate({
      tool_diameter_mm: 10,
      axial_depth_mm: 6,
    });
    expect(
      r.warnings.some(w => w.includes("radius"))
    ).toBe(true);
  });

  it("predicts surface finish", () => {
    const r = engine.calculate({
      tool_diameter_mm: 10,
      axial_depth_mm: 1,
      step_over_mm: 0.5,
    });
    expect(r.predicted_ra.value).toBeGreaterThan(0);
    expect(r.predicted_ra.unit).toBe("µm");
  });

  // ── Scallop ───────────────────────────────────────────────────

  it("calculates scallop geometry", () => {
    const r = engine.scallop({
      tool_diameter_mm: 10,
      step_over_mm: 0.5,
    });
    expect(r.scallop_height.value).toBeGreaterThan(0);
    expect(r.cusp_width.value).toBe(0.5);
    expect(r.predicted_ra.value).toBeGreaterThan(0);
    expect(r.step_over_for_target.value).toBeGreaterThan(0);
  });

  it("larger scallop with wider step-over", () => {
    const narrow = engine.scallop({
      tool_diameter_mm: 10,
      step_over_mm: 0.3,
    });
    const wide = engine.scallop({
      tool_diameter_mm: 10,
      step_over_mm: 1.5,
    });
    expect(wide.scallop_height.value).toBeGreaterThan(
      narrow.scallop_height.value
    );
  });

  it("warns on excessive step-over", () => {
    const r = engine.scallop({
      tool_diameter_mm: 10,
      step_over_mm: 6,
    });
    expect(
      r.warnings.some(w => w.includes("reduce"))
    ).toBe(true);
  });

  // ── AtomicValue Format ────────────────────────────────────────

  it("returns AtomicValue format", () => {
    const r = engine.calculate({
      tool_diameter_mm: 10,
      axial_depth_mm: 1,
    });
    for (const key of [
      "effective_diameter", "effective_speed",
      "spindle_rpm", "scallop_height", "mrr",
    ] as const) {
      expect(r[key]).toHaveProperty("value");
      expect(r[key]).toHaveProperty("unit");
      expect(r[key]).toHaveProperty("uncertainty");
      expect(r[key]).toHaveProperty("source");
    }
  });

  it("exports singleton", async () => {
    const { ballEndMillEngine } = await import(
      "../engines/BallEndMillEngine.js"
    );
    expect(ballEndMillEngine).toBeInstanceOf(BallEndMillEngine);
  });
});
