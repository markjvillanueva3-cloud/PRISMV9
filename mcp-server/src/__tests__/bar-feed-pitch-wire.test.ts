/**
 * FEATURE-GAP-AUDIT-MS0/U-WIRE-BACKLOG-SF-BARPITCH
 *
 * Engine-surface contract test for the BarFeedPitchOptimizerEngine wire into
 * prism_calc:bar_feed_pitch_optimize / _stats.
 *
 * Verifies 1-D bar-feed bin-packing invariants:
 *   - pitch_mm = part_length_mm + cutoff_kerf_mm
 *   - usable_length_mm = bar_length_mm - bar_end_loss_mm - bar_head_face_mm
 *   - parts_per_bar = floor(usable / pitch)
 *   - bars_required = ceil(quantity_needed / parts_per_bar)
 *   - utilization_pct = (parts_per_bar * part_length_mm) / bar_length_mm * 100
 *   - too-small bar diameters (< part_max_diameter_mm) skipped
 *   - input validation throws on non-positive part/bar length
 *   - missing-bar-spec error when neither bar_diameter_mm nor candidates supplied
 *   - multi-candidate sort by score (best first)
 *
 * Sister to [[reference_iter4_gilbert_clean_attribution_2026_05_20]] — also a
 * pure-math SF wire with full inference safe to expose (no NN, no random-init).
 */
import { describe, it, expect } from "vitest";
import { barFeedPitchOptimizerEngine } from "../engines/BarFeedPitchOptimizerEngine.js";

// Canonical Swiss-lathe scenario (100mm parts from 3m bar of 12mm steel)
const SWISS_INPUT = {
  part_length_mm: 100,
  quantity_needed: 500,
  bar_length_mm: 3000,
  cutoff_kerf_mm: 2,
  bar_end_loss_mm: 50,    // typical Swiss feed-back grip
  bar_head_face_mm: 3,
  bar_diameter_mm: 12,
  material_density_kgm3: 7850,
  material_price_per_kg: 1.5,
};

describe("U-WIRE-BACKLOG-SF-BARPITCH — bar_feed_pitch engine surface", () => {
  it("optimize: pitch_mm = part_length_mm + cutoff_kerf_mm", () => {
    const r = barFeedPitchOptimizerEngine.optimize(SWISS_INPUT);
    expect(r.pitch_mm).toBe(SWISS_INPUT.part_length_mm + SWISS_INPUT.cutoff_kerf_mm);
  });

  it("optimize: usable_length_mm = bar_length - end_loss - head_face", () => {
    const r = barFeedPitchOptimizerEngine.optimize(SWISS_INPUT);
    expect(r.usable_length_mm).toBe(
      SWISS_INPUT.bar_length_mm - SWISS_INPUT.bar_end_loss_mm - SWISS_INPUT.bar_head_face_mm,
    );
  });

  it("optimize: parts_per_bar = floor(usable / pitch)", () => {
    const r = barFeedPitchOptimizerEngine.optimize(SWISS_INPUT);
    const expectedParts = Math.floor(r.usable_length_mm / r.pitch_mm);
    expect(r.best?.parts_per_bar).toBe(expectedParts);
  });

  it("optimize: bars_required = ceil(quantity_needed / parts_per_bar)", () => {
    const r = barFeedPitchOptimizerEngine.optimize(SWISS_INPUT);
    const parts = r.best?.parts_per_bar ?? 0;
    const expectedBars = parts > 0 ? Math.ceil(SWISS_INPUT.quantity_needed / parts) : Number.POSITIVE_INFINITY;
    expect(r.best?.bars_required).toBe(expectedBars);
  });

  it("optimize: utilization_pct = (parts * part_length) / bar_length * 100", () => {
    const r = barFeedPitchOptimizerEngine.optimize(SWISS_INPUT);
    const parts = r.best?.parts_per_bar ?? 0;
    const expectedUtil = (parts * SWISS_INPUT.part_length_mm) / SWISS_INPUT.bar_length_mm * 100;
    expect(r.best?.utilization_pct).toBeCloseTo(expectedUtil, 6);
  });

  it("optimize: remnant_mm = usable - parts * pitch (when parts > 0)", () => {
    const r = barFeedPitchOptimizerEngine.optimize(SWISS_INPUT);
    const parts = r.best?.parts_per_bar ?? 0;
    if (parts > 0) {
      const expectedRemnant = r.usable_length_mm - parts * r.pitch_mm;
      expect(r.best?.remnant_mm).toBeCloseTo(expectedRemnant, 6);
      expect(r.best!.remnant_mm).toBeLessThan(r.pitch_mm); // less than one pitch left
      expect(r.best!.remnant_mm).toBeGreaterThanOrEqual(0);
    }
  });

  it("optimize: candidate diameters smaller than part_max_diameter are skipped", () => {
    const r = barFeedPitchOptimizerEngine.optimize({
      ...SWISS_INPUT,
      bar_diameter_mm: undefined,
      candidate_bar_diameters_mm: [8, 10, 12, 16, 20],
      part_max_diameter_mm: 11,
    });
    // 8 and 10 must be skipped (< 11), 12/16/20 remain
    const diameters = r.candidates.map((c) => c.bar_diameter_mm).sort((a, b) => a - b);
    expect(diameters).toEqual([12, 16, 20]);
  });

  it("optimize: multi-candidate result is sorted by score (best first)", () => {
    const r = barFeedPitchOptimizerEngine.optimize({
      ...SWISS_INPUT,
      bar_diameter_mm: undefined,
      candidate_bar_diameters_mm: [12, 16, 20, 25],
    });
    expect(r.candidates.length).toBeGreaterThan(1);
    for (let k = 0; k < r.candidates.length - 1; k++) {
      expect(r.candidates[k]!.score).toBeGreaterThanOrEqual(r.candidates[k + 1]!.score);
    }
    expect(r.best).not.toBeNull();
    expect(r.best!.bar_diameter_mm).toBe(r.candidates[0]!.bar_diameter_mm);
  });

  it("optimize: throws on part_length_mm <= 0", () => {
    expect(() => barFeedPitchOptimizerEngine.optimize({ ...SWISS_INPUT, part_length_mm: 0 }))
      .toThrow(/part_length_mm must be > 0/);
  });

  it("optimize: throws on bar_length_mm <= 0", () => {
    expect(() => barFeedPitchOptimizerEngine.optimize({ ...SWISS_INPUT, bar_length_mm: 0 }))
      .toThrow(/bar_length_mm must be > 0/);
  });

  it("optimize: throws when neither bar_diameter_mm nor candidates supplied", () => {
    expect(() => barFeedPitchOptimizerEngine.optimize({
      part_length_mm: 100,
      quantity_needed: 50,
      bar_length_mm: 3000,
    }))
      .toThrow(/Must provide bar_diameter_mm or candidate_bar_diameters_mm/);
  });

  it("optimize: waste_cost = waste_mass_kg * material_price_per_kg (within rounding)", () => {
    const r = barFeedPitchOptimizerEngine.optimize(SWISS_INPUT);
    const best = r.best!;
    const expectedWasteCost = best.waste_mass_kg * SWISS_INPUT.material_price_per_kg;
    expect(best.waste_cost).toBeCloseTo(expectedWasteCost, 6);
  });

  it("optimize: utilization_pct <= 100 (cannot exceed theoretical max)", () => {
    const r = barFeedPitchOptimizerEngine.optimize(SWISS_INPUT);
    expect(r.best?.utilization_pct ?? 0).toBeLessThanOrEqual(100);
  });

  it("optimize: defaults applied — kerf=2, end_loss=50, head_face=3 when omitted", () => {
    const r = barFeedPitchOptimizerEngine.optimize({
      part_length_mm: 100,
      quantity_needed: 10,
      bar_length_mm: 3000,
      bar_diameter_mm: 12,
    });
    expect(r.pitch_mm).toBe(102);              // 100 + 2 kerf default
    expect(r.usable_length_mm).toBe(2947);     // 3000 - 50 end - 3 head
  });

  it("getStats: returns the ISO 6983 + Sandvik reference string", () => {
    const s = barFeedPitchOptimizerEngine.getStats();
    expect(typeof s.reference).toBe("string");
    expect(s.reference).toMatch(/ISO 6983/);
    expect(s.reference).toMatch(/Sandvik/i);
  });
});
