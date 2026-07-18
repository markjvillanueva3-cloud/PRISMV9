/**
 * Tests for MicroMachiningEngine
 */
import { describe, it, expect } from "vitest";
import {
  MicroMachiningEngine,
} from "../engines/MicroMachiningEngine.js";

describe("MicroMachiningEngine", () => {
  const engine = new MicroMachiningEngine();

  // ── Micro Milling ─────────────────────────────────────────────

  it("calculates micro-milling for 0.5mm tool", () => {
    const r = engine.microMill({
      tool_diameter_mm: 0.5,
      material_iso_group: "P",
    });
    expect(r.cutting_speed.value).toBe(40);
    expect(r.spindle_rpm.value).toBeGreaterThan(20000);
    expect(r.feed_per_tooth.value).toBeGreaterThan(0);
    expect(r.min_chip_thickness.value).toBeGreaterThan(0);
    expect(r.size_effect_factor.value).toBeGreaterThan(1);
    expect(r.mrr.value).toBeGreaterThan(0);
  });

  it("size effect increases kc for small chips", () => {
    const r = engine.microMill({
      tool_diameter_mm: 0.5,
    });
    // Effective kc should be higher than base kc1 (2200)
    expect(r.effective_kc.value).toBeGreaterThan(2200);
  });

  it("feed exceeds minimum chip thickness", () => {
    const r = engine.microMill({
      tool_diameter_mm: 0.3,
      edge_radius_um: 3,
    });
    // min chip = 3 × 0.3 = 0.9µm = 0.0009mm
    // fz should be > 0.0009
    expect(r.feed_per_tooth.value).toBeGreaterThan(0.0009);
  });

  it("reports runout impact as % of fz", () => {
    const r = engine.microMill({
      tool_diameter_mm: 0.2,
      spindle_runout_um: 3,
    });
    expect(r.runout_impact.value).toBeGreaterThan(0);
    expect(r.runout_impact.unit).toBe("%");
  });

  it("warns on high runout relative to fz", () => {
    const r = engine.microMill({
      tool_diameter_mm: 0.2,
      spindle_runout_um: 5,
    });
    expect(
      r.warnings.some(w => w.includes("runout") ||
        w.includes("Runout"))
    ).toBe(true);
  });

  it("warns on sub-0.1mm tool", () => {
    const r = engine.microMill({
      tool_diameter_mm: 0.08,
    });
    expect(
      r.warnings.some(w => w.includes("0.1mm"))
    ).toBe(true);
  });

  it("burr risk high for ductile materials", () => {
    const r = engine.microMill({
      tool_diameter_mm: 0.5,
      material_iso_group: "N",
    });
    expect(["medium", "high"]).toContain(r.burr_risk);
  });

  it("burr risk low for brittle materials", () => {
    const r = engine.microMill({
      tool_diameter_mm: 0.5,
      material_iso_group: "K",
    });
    expect(r.burr_risk).toBe("low");
  });

  // ── Micro Drilling ────────────────────────────────────────────

  it("calculates micro-drilling for 1mm drill", () => {
    const r = engine.microDrill({
      drill_diameter_mm: 1.0,
      hole_depth_mm: 5,
    });
    expect(r.cutting_speed.value).toBe(30);
    expect(r.spindle_rpm.value).toBeGreaterThan(9000);
    expect(r.feed_per_rev.value).toBeCloseTo(0.01, 3);
    expect(r.depth_to_dia_ratio.value).toBe(5);
    expect(r.cycle_time.value).toBeGreaterThan(0);
  });

  it("auto-enables peck for deep holes", () => {
    const r = engine.microDrill({
      drill_diameter_mm: 0.5,
      hole_depth_mm: 3,
    });
    // depth/dia = 6 > 3, should peck
    expect(r.num_pecks.value).toBeGreaterThan(1);
  });

  it("single plunge for shallow holes", () => {
    const r = engine.microDrill({
      drill_diameter_mm: 2,
      hole_depth_mm: 3,
      peck_cycle: false,
    });
    expect(r.num_pecks.value).toBe(1);
  });

  it("warns on extreme depth ratio", () => {
    const r = engine.microDrill({
      drill_diameter_mm: 0.5,
      hole_depth_mm: 8,
    });
    expect(
      r.warnings.some(w => w.includes("breakage"))
    ).toBe(true);
  });

  it("warns on sub-0.3mm drill", () => {
    const r = engine.microDrill({
      drill_diameter_mm: 0.2,
      hole_depth_mm: 1,
    });
    expect(
      r.warnings.some(w => w.includes("pilot"))
    ).toBe(true);
  });

  it("warns on through-hole breakthrough", () => {
    const r = engine.microDrill({
      drill_diameter_mm: 1,
      hole_depth_mm: 3,
      is_through_hole: true,
    });
    expect(
      r.warnings.some(w => w.includes("breakthrough"))
    ).toBe(true);
  });

  // ── AtomicValue Format ────────────────────────────────────────

  it("returns AtomicValue format for micro-mill", () => {
    const r = engine.microMill({
      tool_diameter_mm: 0.5,
    });
    for (const key of [
      "cutting_speed", "spindle_rpm", "feed_per_tooth",
      "min_chip_thickness", "size_effect_factor",
    ] as const) {
      expect(r[key]).toHaveProperty("value");
      expect(r[key]).toHaveProperty("unit");
      expect(r[key]).toHaveProperty("uncertainty");
      expect(r[key]).toHaveProperty("source");
    }
  });

  it("exports singleton", async () => {
    const { microMachiningEngine } = await import(
      "../engines/MicroMachiningEngine.js"
    );
    expect(microMachiningEngine).toBeInstanceOf(
      MicroMachiningEngine
    );
  });
});
