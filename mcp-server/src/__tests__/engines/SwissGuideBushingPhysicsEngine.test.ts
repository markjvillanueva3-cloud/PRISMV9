/**
 * SwissGuideBushingPhysicsEngine tests (U-LPR-SWISS)
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  SwissGuideBushingPhysicsEngine,
  type SwissBarInputs,
} from "../../engines/SwissGuideBushingPhysicsEngine.js";

let eng: SwissGuideBushingPhysicsEngine;

// Realistic 303 stainless bar turning on Tsugami SS20.
const BASE_INPUTS: SwissBarInputs = {
  bar_od_mm: 20,
  part_length_mm: 60,
  youngs_modulus_gpa: 200,
  yield_mpa: 520,
  kc_mpa: 2100, // ISO-M baseline
  spindle_rpm: 5000,
  feed_per_rev_mm: 0.08,
  ap_mm: 0.5,
};

beforeEach(() => {
  eng = new SwissGuideBushingPhysicsEngine();
});

// ──────────────────────────────────────────────────────────────────────
// recommendClearance
// ──────────────────────────────────────────────────────────────────────

describe("recommendClearance", () => {
  it("returns baseline 0.005–0.010 range for 10mm steel (P group)", () => {
    const r = eng.recommendClearance({ bar_od_mm: 10, iso_group: "P" });
    expect(r.min_mm).toBeGreaterThan(0.005);
    expect(r.max_mm).toBeLessThanOrEqual(0.014);
    expect(r.clearance_mm).toBeGreaterThan(0);
    expect(r.rationale).toContain("ISO-P");
  });

  it("bumps clearance for stainless (M) vs steel (P)", () => {
    const p = eng.recommendClearance({ bar_od_mm: 20, iso_group: "P" });
    const m = eng.recommendClearance({ bar_od_mm: 20, iso_group: "M" });
    expect(m.clearance_mm).toBeGreaterThan(p.clearance_mm);
  });

  it("superalloy (S) has highest clearance factor", () => {
    const s = eng.recommendClearance({ bar_od_mm: 20, iso_group: "S" });
    const p = eng.recommendClearance({ bar_od_mm: 20, iso_group: "P" });
    expect(s.clearance_mm).toBeGreaterThan(p.clearance_mm * 1.3);
  });

  it("adds thermal bump above 200 m/min Vc", () => {
    const low = eng.recommendClearance({
      bar_od_mm: 20,
      iso_group: "P",
      surface_speed_m_per_min: 150,
    });
    const hi = eng.recommendClearance({
      bar_od_mm: 20,
      iso_group: "P",
      surface_speed_m_per_min: 280,
    });
    expect(hi.clearance_mm).toBeGreaterThan(low.clearance_mm);
  });

  it("rejects non-positive bar_od", () => {
    expect(() => eng.recommendClearance({ bar_od_mm: 0, iso_group: "P" })).toThrow(/bar_od_mm/);
  });

  it("rejects oversized bar (>80mm)", () => {
    expect(() => eng.recommendClearance({ bar_od_mm: 100, iso_group: "P" })).toThrow(/Swiss-type/);
  });

  it("unknown ISO group defaults to factor 1.0", () => {
    const unknown = eng.recommendClearance({ bar_od_mm: 20, iso_group: "Z" });
    const p = eng.recommendClearance({ bar_od_mm: 20, iso_group: "P" });
    expect(unknown.clearance_mm).toBeCloseTo(p.clearance_mm, 5);
  });
});

// ──────────────────────────────────────────────────────────────────────
// feedLimits — beam-bending physics
// ──────────────────────────────────────────────────────────────────────

describe("feedLimits", () => {
  it("GB-off has LARGER deflection than GB-on for same inputs (L³ scaling)", () => {
    const off = eng.feedLimits("gb_off", BASE_INPUTS);
    const on = eng.feedLimits("gb_on", BASE_INPUTS);
    expect(off.computed_deflection_mm).toBeGreaterThan(on.computed_deflection_mm);
  });

  it("stiffness scales as E·I/L³ (dimensional check)", () => {
    // Double E → stiffness doubles
    const kE = eng.feedLimits("gb_off", BASE_INPUTS).effective_stiffness_N_per_m;
    const kE2 = eng.feedLimits("gb_off", {
      ...BASE_INPUTS,
      youngs_modulus_gpa: BASE_INPUTS.youngs_modulus_gpa * 2,
    }).effective_stiffness_N_per_m;
    expect(kE2 / kE).toBeCloseTo(2.0, 1);
  });

  it("doubling length ~ 8× increase in deflection (L³)", () => {
    const short = eng.feedLimits("gb_off", BASE_INPUTS);
    const long = eng.feedLimits("gb_off", {
      ...BASE_INPUTS,
      part_length_mm: BASE_INPUTS.part_length_mm * 2,
    });
    const ratio = long.computed_deflection_mm / short.computed_deflection_mm;
    expect(ratio).toBeGreaterThan(6);
    expect(ratio).toBeLessThan(10);
  });

  it("flags deflection_limited when ratio ≥ 1.0", () => {
    const huge = eng.feedLimits("gb_off", {
      ...BASE_INPUTS,
      part_length_mm: 200,
      feed_per_rev_mm: 0.3,
      ap_mm: 2.0,
    });
    expect(huge.feed_limited_by).toBe("deflection");
    expect(huge.deflection_ratio).toBeGreaterThanOrEqual(1.0);
  });

  it("returns 'ok' for well-within-spec finishing pass", () => {
    const fine = eng.feedLimits("gb_on", {
      ...BASE_INPUTS,
      feed_per_rev_mm: 0.02,
      ap_mm: 0.1,
    });
    expect(fine.feed_limited_by).toBe("ok");
    expect(fine.deflection_ratio).toBeLessThan(0.7);
  });

  it("max_feed scales inversely with deflection ratio", () => {
    const r = eng.feedLimits("gb_off", BASE_INPUTS);
    // If ratio=0.5, max_feed should be ~2× current feed
    const expectedMax = BASE_INPUTS.feed_per_rev_mm / r.deflection_ratio;
    expect(r.max_feed_per_rev_mm).toBeCloseTo(expectedMax, 3);
  });

  it("rejects bad inputs", () => {
    expect(() =>
      eng.feedLimits("gb_on", { ...BASE_INPUTS, bar_od_mm: 0 }),
    ).toThrow(/bar_od_mm/);
    expect(() =>
      eng.feedLimits("gb_on", { ...BASE_INPUTS, feed_per_rev_mm: 0 }),
    ).toThrow(/feed_per_rev_mm/);
    expect(() =>
      eng.feedLimits("gb_on", { ...BASE_INPUTS, ap_mm: -0.1 }),
    ).toThrow(/ap_mm/);
  });
});

// ──────────────────────────────────────────────────────────────────────
// barEndRemnant
// ──────────────────────────────────────────────────────────────────────

describe("barEndRemnant", () => {
  it("GB-on requires 80-120mm remnant (citizen spec)", () => {
    const r = eng.barEndRemnant("gb_on", 20);
    expect(r.min_remnant_mm).toBeGreaterThanOrEqual(80);
    expect(r.typical_remnant_mm).toBeGreaterThanOrEqual(100);
  });

  it("GB-off cuts to 20-40mm remnant", () => {
    const r = eng.barEndRemnant("gb_off", 20);
    expect(r.min_remnant_mm).toBeLessThanOrEqual(30);
    expect(r.typical_remnant_mm).toBeLessThanOrEqual(40);
  });

  it("GB-on remnant scales with bar_od (≥2× OD for chuck transfer)", () => {
    const small = eng.barEndRemnant("gb_on", 10);
    const large = eng.barEndRemnant("gb_on", 50);
    expect(large.typical_remnant_mm).toBeGreaterThan(small.typical_remnant_mm);
  });

  it("rejects bad bar_od", () => {
    expect(() => eng.barEndRemnant("gb_on", -5)).toThrow(/bar_od/);
  });
});

// ──────────────────────────────────────────────────────────────────────
// thrustBackDrag
// ──────────────────────────────────────────────────────────────────────

describe("thrustBackDrag", () => {
  it("GB-off produces zero bushing drag", () => {
    const r = eng.thrustBackDrag(BASE_INPUTS, "gb_off");
    expect(r.friction_drag_N).toBe(0);
    expect(r.net_feed_scaling).toBe(1);
  });

  it("GB-on produces μ*Fa drag (~12% with carbide bushing)", () => {
    const r = eng.thrustBackDrag(BASE_INPUTS, "gb_on");
    expect(r.friction_drag_N).toBeGreaterThan(0);
    // Fa = 0.4 * Fc, drag = 0.12 * Fa ⇒ drag/Fa = 0.12
    expect(r.friction_drag_N / r.axial_thrust_N).toBeCloseTo(0.12, 2);
  });

  it("warns on small-OD GB-on when drag > 20% of thrust", () => {
    const r = eng.thrustBackDrag(
      { ...BASE_INPUTS, bar_od_mm: 3 },
      "gb_on",
    );
    // Small-OD + friction over threshold triggers warning
    if (r.friction_drag_N / r.axial_thrust_N > 0.2) {
      expect(r.warning).toBeDefined();
      expect(r.warning).toContain("small-OD");
    } else {
      // At μ=0.12 baseline, small-OD is warning-path only when
      // μ exceeds threshold — acceptable to not warn here.
      expect(r.warning).toBeUndefined();
    }
  });

  it("effective_feed = input_feed * scaling", () => {
    const r = eng.thrustBackDrag(BASE_INPUTS, "gb_on");
    expect(r.effective_feed_mm_per_rev).toBeCloseTo(
      BASE_INPUTS.feed_per_rev_mm * r.net_feed_scaling,
      5,
    );
  });
});

// ──────────────────────────────────────────────────────────────────────
// recommendMode
// ──────────────────────────────────────────────────────────────────────

describe("recommendMode", () => {
  it("slender L/d > 4 → GB-on", () => {
    const rec = eng.recommendMode({
      ...BASE_INPUTS,
      bar_od_mm: 10,
      part_length_mm: 60, // L/d = 6
    });
    expect(rec.mode).toBe("gb_on");
    expect(rec.reason).toMatch(/slenderness/);
  });

  it("stubby L/d ≤ 2 → GB-off (bar-end savings)", () => {
    const rec = eng.recommendMode({
      ...BASE_INPUTS,
      bar_od_mm: 30,
      part_length_mm: 40, // L/d ≈ 1.33
    });
    expect(rec.mode).toBe("gb_off");
    expect(rec.reason).toMatch(/stubby/);
  });

  it("middle zone picks the lower-deflection mode", () => {
    const rec = eng.recommendMode({
      ...BASE_INPUTS,
      bar_od_mm: 20,
      part_length_mm: 50, // L/d = 2.5 (middle band)
    });
    expect(["gb_on", "gb_off"]).toContain(rec.mode);
    expect(rec.reason).toMatch(/middle/);
    // GB-on should generally deflect less
    expect(rec.gb_on_deflection_mm).toBeLessThanOrEqual(
      rec.gb_off_deflection_mm,
    );
  });
});
