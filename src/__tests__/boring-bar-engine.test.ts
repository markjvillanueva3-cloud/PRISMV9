/**
 * Tests for BoringBarEngine
 */
import { describe, it, expect } from "vitest";
import { BoringBarEngine } from "../engines/BoringBarEngine.js";

describe("BoringBarEngine", () => {
  const engine = new BoringBarEngine();

  it("calculates finish boring for 50mm bore", () => {
    const r = engine.calculate({
      bore_diameter_mm: 50,
      bore_depth_mm: 80,
      material_iso_group: "P",
      is_finish: true,
    });
    expect(r.bar_diameter.value).toBeGreaterThan(20);
    expect(r.bar_diameter.value).toBeLessThan(50);
    expect(r.deflection.value).toBeGreaterThanOrEqual(0);
    expect(r.cutting_speed.value).toBeGreaterThan(0);
    expect(r.feed_rate.value).toBeGreaterThan(0);
    expect(r.spindle_rpm.value).toBeGreaterThan(0);
    expect(r.predicted_ra.value).toBeGreaterThan(0);
    expect(r.depth_of_cut.value).toBe(0.2);
  });

  it("selects steel bar for low L/D", () => {
    const r = engine.calculate({
      bore_diameter_mm: 50,
      bore_depth_mm: 80,
    });
    // L/D ≈ 80/32.5 ≈ 2.5 → steel
    expect(r.bar_material).toBe("steel");
  });

  it("selects carbide bar for medium L/D", () => {
    const r = engine.calculate({
      bore_diameter_mm: 30,
      bore_depth_mm: 120,
    });
    // bar ≈ 19.5, L/D ≈ 6.2 → carbide or heavy_metal
    expect(
      ["carbide", "heavy_metal"].includes(r.bar_material)
    ).toBe(true);
  });

  it("selects damped bar for high L/D", () => {
    const r = engine.calculate({
      bore_diameter_mm: 20,
      bore_depth_mm: 180,
    });
    // bar ≈ 13, L/D ≈ 13.8 → damped
    expect(r.bar_material).toBe("damped");
  });

  it("allows explicit bar material", () => {
    const r = engine.calculate({
      bore_diameter_mm: 50,
      bore_depth_mm: 80,
      bar_material: "carbide",
    });
    expect(r.bar_material).toBe("carbide");
  });

  it("warns on excessive L/D ratio", () => {
    const r = engine.calculate({
      bore_diameter_mm: 20,
      bore_depth_mm: 200,
      bar_material: "steel",
    });
    expect(
      r.warnings.some(w => w.includes("L/D"))
    ).toBe(true);
  });

  it("warns when deflection exceeds limit", () => {
    const r = engine.calculate({
      bore_diameter_mm: 15,
      bore_depth_mm: 150,
      bar_material: "steel",
      is_finish: true,
      target_ra_um: 0.4,
    });
    expect(
      r.warnings.some(w => w.includes("deflection"))
    ).toBe(true);
  });

  it("warns on small bar ratio", () => {
    const r = engine.calculate({
      bore_diameter_mm: 50,
      bore_depth_mm: 30,
      bar_diameter_mm: 20,
    });
    expect(
      r.warnings.some(w => w.includes("50%"))
    ).toBe(true);
  });

  it("uses roughing parameters when specified", () => {
    const finish = engine.calculate({
      bore_diameter_mm: 50,
      bore_depth_mm: 80,
      is_finish: true,
    });
    const rough = engine.calculate({
      bore_diameter_mm: 50,
      bore_depth_mm: 80,
      is_finish: false,
    });
    expect(rough.depth_of_cut.value).toBeGreaterThan(
      finish.depth_of_cut.value
    );
  });

  it("returns AtomicValue format", () => {
    const r = engine.calculate({
      bore_diameter_mm: 50,
      bore_depth_mm: 80,
    });
    for (const key of [
      "bar_diameter", "overhang_ratio", "deflection",
      "cutting_speed", "feed_rate", "spindle_rpm",
      "predicted_ra",
    ] as const) {
      expect(r[key]).toHaveProperty("value");
      expect(r[key]).toHaveProperty("unit");
      expect(r[key]).toHaveProperty("uncertainty");
      expect(r[key]).toHaveProperty("source");
    }
  });

  it("exports singleton", async () => {
    const { boringBarEngine } = await import(
      "../engines/BoringBarEngine.js"
    );
    expect(boringBarEngine).toBeInstanceOf(BoringBarEngine);
  });
});
