import { describe, it, expect } from "vitest";
import {
  dynamicStrainAgingEngine,
  isoGroupToDSAClass,
} from "../engines/DynamicStrainAgingEngine.js";

/**
 * UNIT-0007 DynamicStrainAgingEngine -- DSA-window advisory (ADVISORY only; no force change).
 * Windows: carbon/low-alloy steel [200-400 C, peak 300]; austenitic stainless [250-600, peak 450].
 * Severity is triangular: 1 at peak, linear to 0 at the edges, 0 outside.
 */
describe("isoGroupToDSAClass", () => {
  it("maps P->carbon_steel, M->austenitic_stainless, others->other", () => {
    expect(isoGroupToDSAClass("P")).toBe("carbon_steel");
    expect(isoGroupToDSAClass("M")).toBe("austenitic_stainless");
    expect(isoGroupToDSAClass("K")).toBe("other");
    expect(isoGroupToDSAClass("N")).toBe("other");
    expect(isoGroupToDSAClass("S")).toBe("other");
    expect(isoGroupToDSAClass("H")).toBe("other");
    expect(isoGroupToDSAClass(undefined)).toBe("other");
  });
});

describe("DynamicStrainAgingEngine.assess -- carbon steel window [200-400 C]", () => {
  it("300 C (peak) -> in window, severity 1, effects listed", () => {
    const r = dynamicStrainAgingEngine.assess({ iso_group: "P", cutting_zone_temp_C: 300 });
    expect(r.supported).toBe(true);
    expect(r.material_class).toBe("carbon_steel");
    expect(r.in_dsa_window).toBe(true);
    expect(r.severity).toBeCloseTo(1, 4);
    expect(r.expected_effects.length).toBeGreaterThan(0);
    expect(r.window_uncertainty_C).toBe(40);
  });

  it("250 C -> in window, severity 0.5 (linear up-ramp)", () => {
    const r = dynamicStrainAgingEngine.assess({ iso_group: "P", cutting_zone_temp_C: 250 });
    expect(r.in_dsa_window).toBe(true);
    expect(r.severity).toBeCloseTo(0.5, 4); // (250-200)/(300-200)
  });

  it("350 C -> in window, severity 0.5 (linear down-ramp)", () => {
    const r = dynamicStrainAgingEngine.assess({ iso_group: "P", cutting_zone_temp_C: 350 });
    expect(r.severity).toBeCloseTo(0.5, 4); // (400-350)/(400-300)
  });

  it("100 C (below band) -> out of window, severity 0", () => {
    const r = dynamicStrainAgingEngine.assess({ iso_group: "P", cutting_zone_temp_C: 100 });
    expect(r.in_dsa_window).toBe(false);
    expect(r.severity).toBe(0);
    expect(r.expected_effects).toHaveLength(0);
  });

  it("500 C (above band) -> out of window, severity 0", () => {
    const r = dynamicStrainAgingEngine.assess({ iso_group: "P", cutting_zone_temp_C: 500 });
    expect(r.in_dsa_window).toBe(false);
    expect(r.severity).toBe(0);
  });

  it("exactly at the lower edge (200 C) is NOT in-window (strict interior)", () => {
    const r = dynamicStrainAgingEngine.assess({ iso_group: "P", cutting_zone_temp_C: 200 });
    expect(r.in_dsa_window).toBe(false);
    expect(r.severity).toBe(0);
  });
});

describe("DynamicStrainAgingEngine.assess -- austenitic stainless window [250-600 C]", () => {
  it("450 C (peak) -> in window, severity 1", () => {
    const r = dynamicStrainAgingEngine.assess({ iso_group: "M", cutting_zone_temp_C: 450 });
    expect(r.material_class).toBe("austenitic_stainless");
    expect(r.in_dsa_window).toBe(true);
    expect(r.severity).toBeCloseTo(1, 4);
  });

  it("350 C -> in window, severity 0.5 ((350-250)/(450-250))", () => {
    const r = dynamicStrainAgingEngine.assess({ iso_group: "M", cutting_zone_temp_C: 350 });
    expect(r.severity).toBeCloseTo(0.5, 4);
  });

  it("300 C -> in the stainless window but NOT the (narrower-low) carbon window", () => {
    const ss = dynamicStrainAgingEngine.assess({ iso_group: "M", cutting_zone_temp_C: 620 });
    expect(ss.in_dsa_window).toBe(false); // above 600
    const inBand = dynamicStrainAgingEngine.assess({ iso_group: "M", cutting_zone_temp_C: 300 });
    expect(inBand.in_dsa_window).toBe(true);
  });
});

describe("DynamicStrainAgingEngine.assess -- unsupported classes + edge cases (never throws)", () => {
  it("aluminum (ISO N) -> supported:false, not fabricated", () => {
    const r = dynamicStrainAgingEngine.assess({ iso_group: "N", cutting_zone_temp_C: 300 });
    expect(r.supported).toBe(false);
    expect(r.in_dsa_window).toBe(false);
    expect(r.window_C).toBeNull();
    expect(r.recommendation).toMatch(/not fabricated|not applicable/i);
  });

  it("cast iron (ISO K) -> supported:false", () => {
    const r = dynamicStrainAgingEngine.assess({ iso_group: "K", cutting_zone_temp_C: 300 });
    expect(r.supported).toBe(false);
  });

  it("non-finite temperature -> warning, no crash", () => {
    const r = dynamicStrainAgingEngine.assess({ iso_group: "P", cutting_zone_temp_C: NaN });
    expect(r.in_dsa_window).toBe(false);
    expect(r.warnings.some((w) => /finite/i.test(w))).toBe(true);
  });

  it("explicit material_class overrides iso_group", () => {
    const r = dynamicStrainAgingEngine.assess({ material_class: "austenitic_stainless", iso_group: "P", cutting_zone_temp_C: 450 });
    expect(r.material_class).toBe("austenitic_stainless");
    expect(r.in_dsa_window).toBe(true);
  });

  it("ADVISORY only: result carries no force/flow-stress field (no force change)", () => {
    const r = dynamicStrainAgingEngine.assess({ iso_group: "P", cutting_zone_temp_C: 300 });
    expect(r).not.toHaveProperty("flow_stress");
    expect(r).not.toHaveProperty("cutting_force_N");
    expect(r).not.toHaveProperty("delta_sigma");   // exposes a FACTOR, never an applied force field
    expect(typeof r.force_correction_factor).toBe("number");
    expect(r.source).toMatch(/does NOT itself apply it|physics-reviewer-gated/i);
  });
});

describe("DynamicStrainAgingEngine.assess -- force_correction_factor (SAFE direction, EXPOSED not applied)", () => {
  it("outside the window -> factor exactly 1.0 (no correction), uncertainty 0", () => {
    const r = dynamicStrainAgingEngine.assess({ iso_group: "P", cutting_zone_temp_C: 100 });
    expect(r.force_correction_factor).toBe(1.0);
    expect(r.force_correction_uncertainty).toBe(0);
  });

  it("at the window peak (300 C carbon steel, severity 1) -> factor 1.15 (+15%), uncertainty 0.08", () => {
    const r = dynamicStrainAgingEngine.assess({ iso_group: "P", cutting_zone_temp_C: 300 });
    expect(r.severity).toBeCloseTo(1, 4);
    expect(r.force_correction_factor).toBeCloseTo(1.15, 4); // 1 + 1*0.15
    expect(r.force_correction_uncertainty).toBeCloseTo(0.08, 4);
  });

  it("mid-window (250 C, severity 0.5) -> factor 1.075 (severity-scaled)", () => {
    const r = dynamicStrainAgingEngine.assess({ iso_group: "P", cutting_zone_temp_C: 250 });
    expect(r.force_correction_factor).toBeCloseTo(1.075, 4); // 1 + 0.5*0.15
  });

  it("SAFE direction: the factor is always in [1.0, 1.15] (force only rises, bounded by peak)", () => {
    for (const t of [100, 200, 250, 300, 350, 400, 500]) {
      const r = dynamicStrainAgingEngine.assess({ iso_group: "P", cutting_zone_temp_C: t });
      expect(r.force_correction_factor).toBeGreaterThanOrEqual(1.0);
      expect(r.force_correction_factor).toBeLessThanOrEqual(1.15);
    }
  });

  it("unsupported material (aluminum) -> factor 1.0 (no fabricated correction)", () => {
    const r = dynamicStrainAgingEngine.assess({ iso_group: "N", cutting_zone_temp_C: 300 });
    expect(r.force_correction_factor).toBe(1.0);
  });
});
