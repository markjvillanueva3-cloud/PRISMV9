/**
 * Tests for ToolPathStepoverEngine
 */
import { describe, it, expect } from "vitest";
import {
  ToolPathStepoverEngine,
} from "../engines/ToolPathStepoverEngine.js";

describe("ToolPathStepoverEngine", () => {
  const engine = new ToolPathStepoverEngine();

  // ── Finishing ─────────────────────────────────────────────────

  it("calculates ball end mill finishing step-over", () => {
    const r = engine.calculate({
      tool_diameter_mm: 10,
      tool_type: "ball",
    });
    expect(r.step_over.value).toBeGreaterThan(0);
    expect(r.step_over.value).toBeLessThan(5);
    expect(r.predicted_scallop.value).toBeGreaterThan(0);
    expect(r.predicted_ra.value).toBeGreaterThan(0);
    expect(r.engagement_angle.value).toBeGreaterThan(0);
  });

  it("flat end mill uses wider step-over", () => {
    const ball = engine.calculate({
      tool_diameter_mm: 10,
      tool_type: "ball",
    });
    const flat = engine.calculate({
      tool_diameter_mm: 10,
      tool_type: "flat",
    });
    expect(flat.step_over.value).toBeGreaterThan(
      ball.step_over.value
    );
  });

  it("step-over from target scallop", () => {
    const r = engine.calculate({
      tool_diameter_mm: 10,
      tool_type: "ball",
      target_scallop_um: 5,
    });
    expect(r.step_over.value).toBeGreaterThan(0);
    expect(r.predicted_scallop.value).toBeLessThan(10);
  });

  it("step-over from target Ra", () => {
    const r = engine.calculate({
      tool_diameter_mm: 10,
      tool_type: "ball",
      target_ra_um: 1.6,
    });
    expect(r.step_over.value).toBeGreaterThan(0);
    expect(r.predicted_ra.value).toBeLessThan(5);
  });

  it("finer step-over = smaller scallop", () => {
    const coarse = engine.calculate({
      tool_diameter_mm: 10,
      tool_type: "ball",
      target_scallop_um: 20,
    });
    const fine = engine.calculate({
      tool_diameter_mm: 10,
      tool_type: "ball",
      target_scallop_um: 2,
    });
    expect(fine.step_over.value).toBeLessThan(
      coarse.step_over.value
    );
  });

  it("bull nose uses corner radius for scallop", () => {
    const r = engine.calculate({
      tool_diameter_mm: 10,
      tool_type: "bull_nose",
      corner_radius_mm: 2,
    });
    expect(r.step_over.value).toBeGreaterThan(0);
    expect(r.predicted_scallop.value).toBeGreaterThan(0);
  });

  // ── Roughing ──────────────────────────────────────────────────

  it("roughing uses wider step-over than ball finishing", () => {
    const finish = engine.calculate({
      tool_diameter_mm: 10,
      tool_type: "ball",
    });
    const rough = engine.calculate({
      tool_diameter_mm: 10,
      tool_type: "ball",
      is_roughing: true,
    });
    expect(rough.step_over.value).toBeGreaterThan(
      finish.step_over.value
    );
  });

  it("adaptive uses low radial, high axial", () => {
    const r = engine.calculate({
      tool_diameter_mm: 10,
      is_roughing: true,
      strategy: "adaptive",
    });
    expect(r.step_over_pct.value).toBeLessThan(15);
    expect(r.step_down.value).toBeGreaterThan(5);
  });

  it("conventional roughing uses ~60% step-over", () => {
    const r = engine.calculate({
      tool_diameter_mm: 10,
      is_roughing: true,
      strategy: "parallel",
    });
    expect(r.step_over_pct.value).toBeCloseTo(60, -1);
  });

  // ── Geometry ──────────────────────────────────────────────────

  it("engagement angle increases with step-over", () => {
    const narrow = engine.calculate({
      tool_diameter_mm: 10,
      tool_type: "ball",
      target_scallop_um: 2,
    });
    const wide = engine.calculate({
      tool_diameter_mm: 10,
      is_roughing: true,
    });
    expect(wide.engagement_angle.value).toBeGreaterThan(
      narrow.engagement_angle.value
    );
  });

  it("time factor > 1 for fine step-over", () => {
    const r = engine.calculate({
      tool_diameter_mm: 10,
      tool_type: "ball",
      target_scallop_um: 1,
    });
    expect(r.time_factor.value).toBeGreaterThan(1);
  });

  it("warns on excessive ball end mill step-over", () => {
    const r = engine.calculate({
      tool_diameter_mm: 10,
      tool_type: "ball",
      target_scallop_um: 500,
    });
    if (r.step_over_pct.value > 50) {
      expect(
        r.warnings.some(w => w.includes("scallop"))
      ).toBe(true);
    }
  });

  // ── AtomicValue Format ────────────────────────────────────────

  it("returns AtomicValue format", () => {
    const r = engine.calculate({
      tool_diameter_mm: 10,
      tool_type: "ball",
    });
    for (const key of [
      "step_over", "step_over_pct",
      "predicted_scallop", "predicted_ra",
      "engagement_angle", "time_factor",
    ] as const) {
      expect(r[key]).toHaveProperty("value");
      expect(r[key]).toHaveProperty("unit");
      expect(r[key]).toHaveProperty("uncertainty");
      expect(r[key]).toHaveProperty("source");
    }
  });

  it("exports singleton", async () => {
    const { toolPathStepoverEngine } = await import(
      "../engines/ToolPathStepoverEngine.js"
    );
    expect(toolPathStepoverEngine).toBeInstanceOf(
      ToolPathStepoverEngine
    );
  });
});
