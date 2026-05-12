/**
 * ChipBreakingEngine — Unit Tests
 * @milestone FORGE-ENGINES-B21
 */
import { describe, it, expect } from "vitest";
import { chipBreakingEngine } from "../engines/ChipBreakingEngine.js";

describe("ChipBreakingEngine", () => {
  it("calculates shear angle from Merchant theory", () => {
    const r = chipBreakingEngine.calculate({
      feed_mm_rev: 0.2,
      depth_of_cut_mm: 2,
      rake_angle_deg: 6,
      work_material: "steel",
    });
    // φ = 45 + 6/2 - 25/2 = 45 + 3 - 12.5 = 35.5
    expect(r.shear_angle.value).toBeCloseTo(35.5, 0);
  });

  it("higher feed improves chip breaking score", () => {
    const low = chipBreakingEngine.calculate({
      feed_mm_rev: 0.05,
      depth_of_cut_mm: 2,
    });
    const high = chipBreakingEngine.calculate({
      feed_mm_rev: 0.35,
      depth_of_cut_mm: 2,
    });
    expect(high.chip_score.value).toBeGreaterThan(
      low.chip_score.value
    );
  });

  it("cast iron produces discontinuous chips", () => {
    const r = chipBreakingEngine.calculate({
      feed_mm_rev: 0.2,
      depth_of_cut_mm: 2,
      work_material: "cast_iron",
    });
    expect(r.chip_type.unit).toContain("discontinuous");
  });

  it("low feed in stainless warns", () => {
    const r = chipBreakingEngine.calculate({
      feed_mm_rev: 0.05,
      depth_of_cut_mm: 1,
      work_material: "stainless",
    });
    expect(
      r.warnings.some(w => w.includes("stainless") ||
        w.includes("stringy"))
    ).toBe(true);
  });

  it("no chipbreaker lowers score", () => {
    const with_ = chipBreakingEngine.calculate({
      feed_mm_rev: 0.2,
      depth_of_cut_mm: 2,
      chipbreaker_type: "medium",
    });
    const without = chipBreakingEngine.calculate({
      feed_mm_rev: 0.2,
      depth_of_cut_mm: 2,
      chipbreaker_type: "none",
    });
    expect(without.chip_score.value).toBeLessThan(
      with_.chip_score.value
    );
  });

  it("aluminum without chipbreaker warns", () => {
    const r = chipBreakingEngine.calculate({
      feed_mm_rev: 0.15,
      depth_of_cut_mm: 2,
      work_material: "aluminum",
      chipbreaker_type: "none",
    });
    expect(
      r.warnings.some(w => w.includes("Aluminum"))
    ).toBe(true);
  });

  it("chip thickness ratio > 0", () => {
    const r = chipBreakingEngine.calculate({
      feed_mm_rev: 0.2,
      depth_of_cut_mm: 2,
    });
    expect(r.chip_thickness_ratio.value).toBeGreaterThan(0);
    expect(r.chip_thickness_ratio.value).toBeLessThan(2);
  });

  it("birds nest risk high for continuous chips", () => {
    const r = chipBreakingEngine.calculate({
      feed_mm_rev: 0.03,
      depth_of_cut_mm: 0.5,
      work_material: "aluminum",
      chipbreaker_type: "none",
    });
    expect(r.birds_nest_risk.value).toBeGreaterThan(40);
  });

  it("recommends heavy breaker for high feed", () => {
    const r = chipBreakingEngine.calculate({
      feed_mm_rev: 0.5,
      depth_of_cut_mm: 4,
    });
    expect(r.recommended_chipbreaker.unit).toContain("heavy");
  });

  it("DOC < nose radius warns", () => {
    const r = chipBreakingEngine.calculate({
      feed_mm_rev: 0.2,
      depth_of_cut_mm: 0.3,
      insert_nose_radius_mm: 0.8,
      chipbreaker_type: "medium",
    });
    expect(
      r.warnings.some(w => w.includes("nose radius"))
    ).toBe(true);
  });
});
