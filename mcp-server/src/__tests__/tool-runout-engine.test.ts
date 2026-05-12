/**
 * Tests for ToolRunoutEngine
 */
import { describe, it, expect } from "vitest";
import {
  ToolRunoutEngine,
} from "../engines/ToolRunoutEngine.js";

describe("ToolRunoutEngine", () => {
  const engine = new ToolRunoutEngine();

  it("calculates runout impact for 10µm TIR", () => {
    const r = engine.calculate({
      total_tir_um: 10,
      tool_diameter_mm: 10,
      num_flutes: 4,
      feed_per_tooth_mm: 0.05,
    });
    expect(r.max_chip_load.value).toBeCloseTo(0.06, 2);
    expect(r.min_chip_load.value).toBeCloseTo(0.04, 2);
    expect(r.chip_load_variation.value).toBeGreaterThan(0);
    expect(r.tool_life_factor.value).toBeLessThan(1);
    expect(r.dimensional_error.value).toBe(0.01);
  });

  it("higher TIR = more chip load variation", () => {
    const low = engine.calculate({
      total_tir_um: 3,
      tool_diameter_mm: 10,
      num_flutes: 4,
      feed_per_tooth_mm: 0.05,
    });
    const high = engine.calculate({
      total_tir_um: 20,
      tool_diameter_mm: 10,
      num_flutes: 4,
      feed_per_tooth_mm: 0.05,
    });
    expect(high.chip_load_variation.value).toBeGreaterThan(
      low.chip_load_variation.value
    );
  });

  it("tool life factor decreases with TIR", () => {
    const low = engine.calculate({
      total_tir_um: 2,
      tool_diameter_mm: 10,
      num_flutes: 4,
      feed_per_tooth_mm: 0.05,
    });
    const high = engine.calculate({
      total_tir_um: 20,
      tool_diameter_mm: 10,
      num_flutes: 4,
      feed_per_tooth_mm: 0.05,
    });
    expect(high.tool_life_factor.value).toBeLessThan(
      low.tool_life_factor.value
    );
  });

  it("Ra degrades with runout", () => {
    const r = engine.calculate({
      total_tir_um: 10,
      tool_diameter_mm: 10,
      num_flutes: 4,
      feed_per_tooth_mm: 0.05,
    });
    expect(r.ra_degradation_factor.value).toBeGreaterThan(1);
  });

  it("runout budget uses RSS", () => {
    const r = engine.calculate({
      total_tir_um: 10,
      tool_diameter_mm: 10,
      num_flutes: 4,
      feed_per_tooth_mm: 0.05,
      holder_type: "shrink_fit",
      spindle_runout_um: 2,
    });
    // RSS of 2, 2, 3 = √(4+4+9) = √17 ≈ 4.1
    expect(r.runout_budget.total.value).toBeCloseTo(4.1, 0);
    expect(r.runout_budget.holder.value).toBe(2);
  });

  it("recommends shrink-fit for small tools", () => {
    const r = engine.calculate({
      total_tir_um: 8,
      tool_diameter_mm: 2,
      num_flutes: 2,
      feed_per_tooth_mm: 0.01,
    });
    expect(r.holder_recommendation).toContain("Shrink");
  });

  it("warns when TIR exceeds fz", () => {
    const r = engine.calculate({
      total_tir_um: 60,
      tool_diameter_mm: 10,
      num_flutes: 4,
      feed_per_tooth_mm: 0.05,
    });
    expect(
      r.warnings.some(w => w.includes("rubbing"))
    ).toBe(true);
  });

  it("warns on high variation", () => {
    const r = engine.calculate({
      total_tir_um: 30,
      tool_diameter_mm: 10,
      num_flutes: 4,
      feed_per_tooth_mm: 0.05,
    });
    expect(
      r.warnings.some(w => w.includes("variation"))
    ).toBe(true);
  });

  it("warns on Weldon holder for small tools", () => {
    const r = engine.calculate({
      total_tir_um: 15,
      tool_diameter_mm: 8,
      num_flutes: 4,
      feed_per_tooth_mm: 0.05,
      holder_type: "weldon",
    });
    expect(
      r.warnings.some(w => w.includes("Weldon"))
    ).toBe(true);
  });

  it("min chip load cannot be negative", () => {
    const r = engine.calculate({
      total_tir_um: 100,
      tool_diameter_mm: 10,
      num_flutes: 4,
      feed_per_tooth_mm: 0.05,
    });
    expect(r.min_chip_load.value).toBeGreaterThanOrEqual(0);
  });

  // ── AtomicValue Format ────────────────────────────────────────

  it("returns AtomicValue format", () => {
    const r = engine.calculate({
      total_tir_um: 10,
      tool_diameter_mm: 10,
      num_flutes: 4,
      feed_per_tooth_mm: 0.05,
    });
    for (const key of [
      "max_chip_load", "min_chip_load",
      "tool_life_factor", "ra_degradation_factor",
    ] as const) {
      expect(r[key]).toHaveProperty("value");
      expect(r[key]).toHaveProperty("unit");
      expect(r[key]).toHaveProperty("uncertainty");
      expect(r[key]).toHaveProperty("source");
    }
  });

  it("exports singleton", async () => {
    const { toolRunoutEngine } = await import(
      "../engines/ToolRunoutEngine.js"
    );
    expect(toolRunoutEngine).toBeInstanceOf(ToolRunoutEngine);
  });
});
