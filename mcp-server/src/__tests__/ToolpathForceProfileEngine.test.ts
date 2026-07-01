/**
 * ToolpathForceProfileEngine guard (slot:bravo 2026-06-19, ENGINE-AUDIT/U-FIX-FEEDRATE-PLACEHOLDER).
 *
 * The engine/algo/formula audit found `generateModulations` hardcoded
 * `const originalFeedrate = 1000; // placeholder`, so EVERY feedrate-modulation recommendation was
 * computed off a fabricated 1000 mm/min baseline instead of the segment's real programmed feedrate
 * (R12/R9 fabricated-output bug). The fix threads `input.segments` in and looks up the real
 * `feedrate_mm_min` per segment. These tests pin that behavior (and core analyze invariants).
 */
import { describe, expect, it } from "vitest";

import { toolpathForceProfileEngine } from "../engines/ToolpathForceProfileEngine.js";
import type { ForceProfileInput, ToolpathSegment } from "../engines/ToolpathForceProfileEngine.js";

const PROGRAMMED_FEED = 2500; // distinctive, NOT the old hardcoded 1000

function seg(id: string, radial_mm: number, feed = PROGRAMMED_FEED): ToolpathSegment {
  return {
    id,
    type: "linear",
    start: { x: 0, y: 0, z: 0 },
    end: { x: 10, y: 0, z: 0 },
    length_mm: 10,
    feedrate_mm_min: feed,
    radial_engagement_mm: radial_mm,
    axial_engagement_mm: 5,
  };
}

// A strong engagement gradient: 5 light segments + 1 heavy -> the heavy one is a force peak that
// triggers a feedrate-reduction modulation (clampedFactor < 0.95).
const gradientInput: ForceProfileInput = {
  segments: [seg("s1", 1), seg("s2", 1), seg("s3", 1), seg("s4", 1), seg("s5", 1), seg("peak", 9)],
  parameters: { tool_diameter_mm: 10, flutes: 4, spindle_rpm: 3000, material_iso_group: "P" },
  chip_thinning_compensation: false,
};

describe("ToolpathForceProfileEngine.analyze", () => {
  it("computes a force for every input segment", () => {
    const r = toolpathForceProfileEngine.analyze(gradientInput);
    expect(r.segment_forces).toHaveLength(6);
    expect(r.segment_forces.every((f) => Number.isFinite(f.force_resultant_n) && f.force_resultant_n > 0)).toBe(true);
  });

  it("a high-engagement segment produces a higher resultant force than a light one (monotonic sanity)", () => {
    const r = toolpathForceProfileEngine.analyze(gradientInput);
    const light = r.segment_forces.find((f) => f.segment_id === "s1")!;
    const heavy = r.segment_forces.find((f) => f.segment_id === "peak")!;
    expect(heavy.force_resultant_n).toBeGreaterThan(light.force_resultant_n);
  });

  it("uses canonical Kienzle coefficients for the ISO group (P), not inlined values", () => {
    const r = toolpathForceProfileEngine.analyze(gradientInput);
    expect(r.kienzle_coefficients.kc1_1).toBe(1800); // canonical P kc1.1 from src/physics/constants.ts
  });

  // ---- THE FIX: real per-segment feedrate, never the old hardcoded 1000 ----
  it("produces at least one feedrate modulation for a strong force gradient", () => {
    const r = toolpathForceProfileEngine.analyze(gradientInput);
    expect(r.feedrate_modulations.length).toBeGreaterThan(0);
  });

  it("every modulation's original_feedrate equals the REAL segment feedrate (not the old 1000 placeholder)", () => {
    const r = toolpathForceProfileEngine.analyze(gradientInput);
    for (const m of r.feedrate_modulations) {
      expect(m.original_feedrate).toBe(PROGRAMMED_FEED); // all segments set to 2500
      expect(m.original_feedrate).not.toBe(1000); // the fabricated placeholder is gone
    }
  });

  it("recommended_feedrate = original_feedrate * modulation_factor (consistent with the real baseline)", () => {
    const r = toolpathForceProfileEngine.analyze(gradientInput);
    expect(r.feedrate_modulations.length).toBeGreaterThan(0);
    for (const m of r.feedrate_modulations) {
      expect(m.recommended_feedrate).toBeCloseTo(m.original_feedrate * m.modulation_factor, 6);
      expect(m.recommended_feedrate).toBeLessThan(m.original_feedrate); // a reduction (factor < 0.95)
    }
  });

  it("honors DISTINCT per-segment feedrates (the lookup is per-segment, not a single constant)", () => {
    const mixed: ForceProfileInput = {
      segments: [seg("s1", 1, 1800), seg("s2", 1, 1800), seg("s3", 1, 1800), seg("peak", 9, 4200)],
      parameters: { tool_diameter_mm: 10, flutes: 4, spindle_rpm: 3000, material_iso_group: "P" },
    };
    const r = toolpathForceProfileEngine.analyze(mixed);
    const peakMod = r.feedrate_modulations.find((m) => m.segment_id === "peak");
    expect(peakMod).toBeDefined(); // the strong 9mm-vs-1mm gradient must yield a peak modulation
    expect(peakMod!.original_feedrate).toBe(4200); // the peak segment's OWN feedrate, not 1800 or 1000
    expect(peakMod!.original_feedrate).not.toBe(1000);
    // every modulation must echo its own segment's programmed feed
    const feedById = new Map(mixed.segments.map((s) => [s.id, s.feedrate_mm_min]));
    for (const m of r.feedrate_modulations) {
      expect(m.original_feedrate).toBe(feedById.get(m.segment_id));
    }
  });

  it("modulation_factor is clamped to [0.5, 1.0)", () => {
    const r = toolpathForceProfileEngine.analyze(gradientInput);
    for (const m of r.feedrate_modulations) {
      expect(m.modulation_factor).toBeGreaterThanOrEqual(0.5);
      expect(m.modulation_factor).toBeLessThan(1.0);
    }
  });

  it("a uniform low-engagement path yields no feedrate reductions (no spurious modulations)", () => {
    const uniform: ForceProfileInput = {
      segments: [seg("u1", 1), seg("u2", 1), seg("u3", 1)],
      parameters: { tool_diameter_mm: 10, flutes: 4, spindle_rpm: 3000, material_iso_group: "P" },
    };
    const r = toolpathForceProfileEngine.analyze(uniform);
    // all forces near-equal -> ratios ~1 -> clampedFactor ~1.0 (>=0.95) -> no modulation emitted
    expect(r.feedrate_modulations.length).toBe(0);
  });

  it("reports statistics consistent with the per-segment forces", () => {
    const r = toolpathForceProfileEngine.analyze(gradientInput);
    const maxForce = Math.max(...r.segment_forces.map((f) => f.force_resultant_n));
    expect(r.statistics.max_force_n).toBeCloseTo(maxForce, 3);
  });
});
