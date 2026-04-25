import { describe, it, expect } from "vitest";
import { barFeedPitchOptimizerEngine } from "../engines/BarFeedPitchOptimizerEngine.js";

describe("BarFeedPitchOptimizerEngine", () => {
  it("computes pitch = part_length + kerf", () => {
    const r = barFeedPitchOptimizerEngine.optimize({
      part_length_mm: 50,
      quantity_needed: 100,
      bar_length_mm: 3000,
      cutoff_kerf_mm: 2,
      bar_diameter_mm: 25.4,
    });
    expect(r.pitch_mm).toBe(52);
  });

  it("accounts for bar end loss and head face", () => {
    const r = barFeedPitchOptimizerEngine.optimize({
      part_length_mm: 50,
      quantity_needed: 100,
      bar_length_mm: 3000,
      bar_end_loss_mm: 50,
      bar_head_face_mm: 3,
      bar_diameter_mm: 25.4,
    });
    expect(r.usable_length_mm).toBe(3000 - 50 - 3);
  });

  it("produces integer parts-per-bar (floor)", () => {
    const r = barFeedPitchOptimizerEngine.optimize({
      part_length_mm: 100,
      quantity_needed: 30,
      bar_length_mm: 3000,
      cutoff_kerf_mm: 2,
      bar_end_loss_mm: 50,
      bar_head_face_mm: 3,
      bar_diameter_mm: 25.4,
    });
    // usable = 2947, pitch = 102 → 28 parts
    expect(r.best?.parts_per_bar).toBe(28);
  });

  it("remnant is what's left after whole parts", () => {
    const r = barFeedPitchOptimizerEngine.optimize({
      part_length_mm: 100,
      quantity_needed: 30,
      bar_length_mm: 3000,
      cutoff_kerf_mm: 2,
      bar_end_loss_mm: 50,
      bar_head_face_mm: 3,
      bar_diameter_mm: 25.4,
    });
    expect(r.best?.remnant_mm).toBeCloseTo(2947 - 28 * 102, 1);
  });

  it("computes bars required for batch", () => {
    const r = barFeedPitchOptimizerEngine.optimize({
      part_length_mm: 100,
      quantity_needed: 100,
      bar_length_mm: 3000,
      cutoff_kerf_mm: 2,
      bar_end_loss_mm: 50,
      bar_head_face_mm: 3,
      bar_diameter_mm: 25.4,
    });
    // 28 parts/bar, 100 needed → 4 bars
    expect(r.best?.bars_required).toBe(4);
  });

  it("compares candidate bar diameters and picks best", () => {
    const r = barFeedPitchOptimizerEngine.optimize({
      part_length_mm: 50,
      quantity_needed: 200,
      bar_length_mm: 3000,
      candidate_bar_diameters_mm: [25.4, 31.75, 38.1],
      part_max_diameter_mm: 25,
    });
    expect(r.candidates.length).toBe(3);
    expect(r.best).not.toBeNull();
    // Smallest usable Ø wins for identical nesting + least material waste
    expect(r.best!.bar_diameter_mm).toBe(25.4);
  });

  it("rejects candidates smaller than part max diameter", () => {
    const r = barFeedPitchOptimizerEngine.optimize({
      part_length_mm: 50,
      quantity_needed: 100,
      bar_length_mm: 3000,
      candidate_bar_diameters_mm: [20, 25.4, 31.75],
      part_max_diameter_mm: 25,
    });
    // 20mm rejected (smaller than 25mm part max)
    expect(r.candidates.length).toBe(2);
  });

  it("computes utilization % correctly", () => {
    const r = barFeedPitchOptimizerEngine.optimize({
      part_length_mm: 100,
      quantity_needed: 10,
      bar_length_mm: 3000,
      cutoff_kerf_mm: 2,
      bar_end_loss_mm: 50,
      bar_head_face_mm: 3,
      bar_diameter_mm: 25.4,
    });
    // 28 parts × 100mm = 2800mm used out of 3000mm = 93.3%
    expect(r.best?.utilization_pct).toBeCloseTo(93.3, 1);
  });

  it("computes waste mass and cost from density + price", () => {
    const r = barFeedPitchOptimizerEngine.optimize({
      part_length_mm: 50,
      quantity_needed: 100,
      bar_length_mm: 3000,
      bar_diameter_mm: 25.4,
      material_density_kgm3: 7850,
      material_price_per_kg: 5.0,
    });
    expect(r.best!.total_bar_mass_kg).toBeGreaterThan(0);
    expect(r.best!.waste_cost).toBeGreaterThan(0);
  });

  it("throws if no bar diameter provided", () => {
    expect(() =>
      barFeedPitchOptimizerEngine.optimize({
        part_length_mm: 50,
        quantity_needed: 100,
        bar_length_mm: 3000,
      } as any),
    ).toThrow(/bar_diameter/);
  });

  it("throws on invalid part length", () => {
    expect(() =>
      barFeedPitchOptimizerEngine.optimize({
        part_length_mm: 0,
        quantity_needed: 100,
        bar_length_mm: 3000,
        bar_diameter_mm: 25.4,
      }),
    ).toThrow();
  });

  it("getStats returns reference", () => {
    expect(barFeedPitchOptimizerEngine.getStats().reference).toMatch(/ISO 6983|Sandvik/);
  });
});
