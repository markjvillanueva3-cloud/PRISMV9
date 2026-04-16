/**
 * Tests for HoningEngine
 */
import { describe, it, expect } from "vitest";
import { HoningEngine } from "../engines/HoningEngine.js";

describe("HoningEngine", () => {
  const engine = new HoningEngine();

  // ── Single Stage ──────────────────────────────────────────────

  it("calculates finish honing for steel bore", () => {
    const r = engine.calculate({
      bore_diameter_mm: 80,
      bore_length_mm: 150,
      material_iso_group: "P",
      stage: "finish",
    });
    expect(r.rotation_speed.value).toBeGreaterThan(50);
    expect(r.stroke_rate.value).toBeGreaterThan(0);
    expect(r.stone_pressure.value).toBeGreaterThan(0);
    expect(r.crosshatch_angle.value).toBe(30);
    expect(r.predicted_ra.value).toBeLessThan(0.5);
    expect(r.cycle_time.value).toBeGreaterThan(0);
    expect(r.stone_grit).toBe(500);
    expect(r.stage).toBe("finish");
  });

  it("calculates rough honing for cast iron", () => {
    const r = engine.calculate({
      bore_diameter_mm: 100,
      bore_length_mm: 200,
      material_iso_group: "K",
      stage: "rough",
    });
    expect(r.stone_type).toBe("silicon_carbide");
    expect(r.stone_grit).toBe(150);
    expect(r.crosshatch_angle.value).toBe(60);
    expect(r.stone_pressure.value).toBeGreaterThan(5);
  });

  it("uses higher speed for aluminum", () => {
    const steel = engine.calculate({
      bore_diameter_mm: 50,
      bore_length_mm: 80,
      material_iso_group: "P",
      stage: "finish",
    });
    const alu = engine.calculate({
      bore_diameter_mm: 50,
      bore_length_mm: 80,
      material_iso_group: "N",
      stage: "finish",
    });
    expect(alu.rotation_speed.value).toBeGreaterThan(
      steel.rotation_speed.value
    );
  });

  it("reduces pressure for hard material", () => {
    const r = engine.calculate({
      bore_diameter_mm: 60,
      bore_length_mm: 100,
      material_iso_group: "H",
      material_hardness_hrc: 55,
      stage: "finish",
    });
    expect(r.stone_pressure.value).toBeLessThan(3);
    expect(
      r.warnings.some(w => w.includes("pressure"))
    ).toBe(true);
  });

  it("warns on high L/D ratio", () => {
    const r = engine.calculate({
      bore_diameter_mm: 20,
      bore_length_mm: 200, // L/D = 10
      material_iso_group: "P",
      stage: "rough",
    });
    expect(r.warnings.some(w => w.includes("L/D"))).toBe(true);
  });

  it("warns on small bore", () => {
    const r = engine.calculate({
      bore_diameter_mm: 3,
      bore_length_mm: 10,
      material_iso_group: "P",
      stage: "finish",
    });
    expect(
      r.warnings.some(w => w.includes("Small bore"))
    ).toBe(true);
  });

  // ── Crosshatch Angle ──────────────────────────────────────────

  it("uses custom crosshatch angle", () => {
    const r = engine.calculate({
      bore_diameter_mm: 80,
      bore_length_mm: 120,
      crosshatch_angle_deg: 22,
      stage: "finish",
    });
    expect(r.crosshatch_angle.value).toBe(22);
  });

  it("uses reverse crosshatch for plateau", () => {
    const r = engine.calculate({
      bore_diameter_mm: 80,
      bore_length_mm: 120,
      stage: "plateau",
    });
    expect(r.crosshatch_angle.value).toBe(135);
    expect(r.stone_type).toBe("resin_diamond");
  });

  // ── Plateau Honing ────────────────────────────────────────────

  it("calculates 3-stage plateau honing", () => {
    const r = engine.plateauHoning({
      bore_diameter_mm: 85,
      bore_length_mm: 150,
      material_iso_group: "K",
      target_rk: 0.8,
      target_rpk: 0.3,
      target_rvk: 2.0,
    });
    expect(r.stages.length).toBe(3);
    expect(r.stages[0].stage).toBe("rough");
    expect(r.stages[1].stage).toBe("semi_finish");
    expect(r.stages[2].stage).toBe("plateau");
    expect(r.total_cycle_time.value).toBeGreaterThan(0);
    expect(r.final_rk.value).toBe(0.8);
    expect(r.final_rpk.value).toBe(0.3);
    expect(r.final_rvk.value).toBe(2.0);
  });

  it("plateau stages have increasing grit", () => {
    const r = engine.plateauHoning({
      bore_diameter_mm: 100,
      bore_length_mm: 200,
    });
    for (let i = 1; i < r.stages.length; i++) {
      expect(r.stages[i].stone_grit).toBeGreaterThan(
        r.stages[i - 1].stone_grit
      );
    }
  });

  // ── AtomicValue Format ────────────────────────────────────────

  it("returns AtomicValue format", () => {
    const r = engine.calculate({
      bore_diameter_mm: 50,
      bore_length_mm: 80,
      stage: "finish",
    });
    for (const key of [
      "rotation_speed", "stroke_rate", "stone_pressure",
      "crosshatch_angle", "stock_removal_rate",
      "cycle_time", "predicted_ra",
    ] as const) {
      expect(r[key]).toHaveProperty("value");
      expect(r[key]).toHaveProperty("unit");
      expect(r[key]).toHaveProperty("uncertainty");
      expect(r[key]).toHaveProperty("source");
    }
  });

  it("exports singleton", async () => {
    const { honingEngine } = await import(
      "../engines/HoningEngine.js"
    );
    expect(honingEngine).toBeInstanceOf(HoningEngine);
  });
});
