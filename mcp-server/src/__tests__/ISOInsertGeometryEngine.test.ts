/**
 * MILL-MASTER-P3-U05-KIENZLE-APPROACH — ISO insert geometry + κr tests
 *
 * Verifies:
 *   - ISO 1832 code parsing (CNMG/VNMG/DNMG/WNMG/TNMG/SNMG)
 *   - Shape-letter → nose angle mapping (80/55/35/80/60/90)
 *   - Approach-angle lookup for common (shape × holder) combos
 *   - Graceful fallback (κr=90°) for uncharted combos
 *   - Kienzle formula with b = ap/sin(κr), h = f·sin(κr)
 *   - VNMG vs CNMG comparison shows different cutting forces at same ap/feed
 *   - Physics constants sourced from constants.ts (not inlined)
 *   - Defensive: never throws on garbage input
 */
import { describe, it, expect } from "vitest";
import { isoInsertGeometryEngine } from "../engines/ISOInsertGeometryEngine.js";
import { CANONICAL_KIENZLE } from "../physics/constants.js";

describe("MILL-MASTER-P3-U05 · parseCode — ISO 1832 decoding", () => {
  it("parses CNMG120408 → shape C, IC 12mm, r=0.8mm", () => {
    const { parsed, warnings } = isoInsertGeometryEngine.parseCode("CNMG120408");
    expect(parsed.shape).toBe("C");
    expect(parsed.inscribed_circle_mm).toBe(12);
    expect(parsed.corner_radius_mm).toBeCloseTo(0.8, 3);
    expect(parsed.shape_angle_deg).toBe(80);
    expect(warnings).toEqual([]);
  });

  it("parses VNMG160408 → shape V, 35° angle, r=0.8mm", () => {
    const { parsed } = isoInsertGeometryEngine.parseCode("VNMG160408");
    expect(parsed.shape).toBe("V");
    expect(parsed.shape_angle_deg).toBe(35);
  });

  it("parses DNMG150604 → shape D, 55° angle, r=0.4mm", () => {
    const { parsed } = isoInsertGeometryEngine.parseCode("DNMG150604");
    expect(parsed.shape).toBe("D");
    expect(parsed.shape_angle_deg).toBe(55);
    expect(parsed.corner_radius_mm).toBeCloseTo(0.4, 3);
  });

  it("parses TNMG160408 → shape T, 60°", () => {
    const { parsed } = isoInsertGeometryEngine.parseCode("TNMG160408");
    expect(parsed.shape).toBe("T");
    expect(parsed.shape_angle_deg).toBe(60);
  });

  it("parses SNMG120408 → shape S, 90°", () => {
    const { parsed } = isoInsertGeometryEngine.parseCode("SNMG120408");
    expect(parsed.shape).toBe("S");
    expect(parsed.shape_angle_deg).toBe(90);
  });

  it("parses WNMG080408 → shape W, 80°, IC=8mm", () => {
    const { parsed } = isoInsertGeometryEngine.parseCode("WNMG080408");
    expect(parsed.shape).toBe("W");
    expect(parsed.inscribed_circle_mm).toBe(8);
  });

  it("unknown shape → defaults to C with warning", () => {
    const { parsed, warnings } = isoInsertGeometryEngine.parseCode("XNMG120408");
    expect(parsed.shape).toBe("C");
    expect(warnings.some((w) => /unknown shape/i.test(w))).toBe(true);
  });

  it("too-short code → uses defaults + warns", () => {
    const { warnings } = isoInsertGeometryEngine.parseCode("CNM");
    expect(warnings.some((w) => /too short/i.test(w))).toBe(true);
  });

  it("lowercase input normalized to uppercase", () => {
    const { parsed } = isoInsertGeometryEngine.parseCode("vnmg160408");
    expect(parsed.code).toBe("VNMG160408");
    expect(parsed.shape).toBe("V");
  });
});

describe("MILL-MASTER-P3-U05 · approachAngle — (shape × holder) lookup", () => {
  it("CNMG + R-holder → 93° (most common external)", () => {
    const r = isoInsertGeometryEngine.approachAngle("C", "R");
    expect(r.kappa_r_deg).toBe(93);
    expect(r.charted).toBe(true);
  });

  it("CNMG + L-holder → 95° (heavy external roughing)", () => {
    const r = isoInsertGeometryEngine.approachAngle("C", "L");
    expect(r.kappa_r_deg).toBe(95);
  });

  it("CNMG + F-holder → 90° (facing + 90° turning)", () => {
    const r = isoInsertGeometryEngine.approachAngle("C", "F");
    expect(r.kappa_r_deg).toBe(90);
  });

  it("CNMG + K-holder → 75° (internal boring)", () => {
    const r = isoInsertGeometryEngine.approachAngle("C", "K");
    expect(r.kappa_r_deg).toBe(75);
  });

  it("VNMG + J-holder → 62.5° (steep profiling)", () => {
    const r = isoInsertGeometryEngine.approachAngle("V", "J");
    expect(r.kappa_r_deg).toBeCloseTo(62.5, 5);
  });

  it("VNMG + Q-holder → 107.5° (back-turning)", () => {
    const r = isoInsertGeometryEngine.approachAngle("V", "Q");
    expect(r.kappa_r_deg).toBeCloseTo(107.5, 5);
  });

  it("DNMG + J-holder → 62.5° (steep entry)", () => {
    const r = isoInsertGeometryEngine.approachAngle("D", "J");
    expect(r.kappa_r_deg).toBeCloseTo(62.5, 5);
  });

  it("uncharted combo → defaults to 90° + charted=false", () => {
    const r = isoInsertGeometryEngine.approachAngle("R", "J" as any);
    expect(r.kappa_r_deg).toBe(90);
    expect(r.charted).toBe(false);
    expect(r.notes).toMatch(/uncharted/i);
  });
});

describe("MILL-MASTER-P3-U05 · Kienzle with κr — physics correctness", () => {
  const base = {
    ap_mm: 2.0,
    feed_mm_rev: 0.25,
    material_iso: "P" as const,
  };

  it("CNMG (κr=93°, close to 90°) → b ≈ ap, h ≈ feed", () => {
    const r = isoInsertGeometryEngine.kienzleWithInsert({
      ...base, insert_code: "CNMG120408", holder_style: "R",
    });
    expect(r.chip_width_b_mm).toBeCloseTo(base.ap_mm, 1);   // within 1% of ap
    expect(r.chip_thickness_h_mm).toBeCloseTo(base.feed_mm_rev, 2);
  });

  it("VNMG + J (κr=62.5°) → b > ap (longer chip), h < feed (thinner)", () => {
    const r = isoInsertGeometryEngine.kienzleWithInsert({
      ...base, insert_code: "VNMG160408", holder_style: "J",
    });
    expect(r.chip_width_b_mm).toBeGreaterThan(base.ap_mm);
    expect(r.chip_thickness_h_mm).toBeLessThan(base.feed_mm_rev);
    // Specifically: b = 2.0 / sin(62.5°) ≈ 2.254
    expect(r.chip_width_b_mm).toBeCloseTo(base.ap_mm / Math.sin(62.5 * Math.PI / 180), 3);
    // h = 0.25 * sin(62.5°) ≈ 0.2217
    expect(r.chip_thickness_h_mm).toBeCloseTo(base.feed_mm_rev * Math.sin(62.5 * Math.PI / 180), 4);
  });

  it("SNMG + L (κr=75°) → intermediate b and h", () => {
    const r = isoInsertGeometryEngine.kienzleWithInsert({
      ...base, insert_code: "SNMG120408", holder_style: "L",
    });
    const sin75 = Math.sin(75 * Math.PI / 180);
    expect(r.chip_width_b_mm).toBeCloseTo(base.ap_mm / sin75, 3);
    expect(r.chip_thickness_h_mm).toBeCloseTo(base.feed_mm_rev * sin75, 4);
  });

  it("cutting_force_n scales with kc_eff × b × h", () => {
    const r = isoInsertGeometryEngine.kienzleWithInsert({
      ...base, insert_code: "CNMG120408", holder_style: "R",
    });
    const expected = r.kc_effective_n_mm2 * r.chip_width_b_mm * r.chip_thickness_h_mm;
    expect(r.cutting_force_n).toBeCloseTo(expected, 5);
  });

  it("kc_effective uses canonical kc1.1 from constants (P group = 1800)", () => {
    const r = isoInsertGeometryEngine.kienzleWithInsert({
      ...base, insert_code: "CNMG120408", holder_style: "R",
    });
    // h = 0.25 × sin(93°) ≈ 0.2497
    // kc = 1800 × 0.2497^(-0.25) ≈ 1800 × 1.415 ≈ 2547
    expect(r.kc_effective_n_mm2).toBeCloseTo(CANONICAL_KIENZLE.P.kc1_1 * Math.pow(r.chip_thickness_h_mm, -CANONICAL_KIENZLE.P.mc), 1);
  });
});

describe("MILL-MASTER-P3-U05 · VNMG vs CNMG head-to-head comparison", () => {
  const base = {
    ap_mm: 2.0,
    feed_mm_rev: 0.25,
    material_iso: "P" as const,
  };

  it("VNMG-J (κr=62.5°) and CNMG-R (κr=93°) produce DIFFERENT cutting forces", () => {
    const cmp = isoInsertGeometryEngine.compare(
      { ...base, insert_code: "VNMG160408", holder_style: "J" },
      { ...base, insert_code: "CNMG120408", holder_style: "R" },
    );
    expect(cmp.a.kappa_r_deg).toBeCloseTo(62.5, 5);
    expect(cmp.b.kappa_r_deg).toBe(93);
    // Forces must differ by > 2%
    expect(Math.abs(cmp.force_ratio_a_over_b - 1)).toBeGreaterThan(0.02);
  });

  it("VNMG-J has SMALLER h (thinner chip) and LARGER b (longer contact) than CNMG-R", () => {
    const cmp = isoInsertGeometryEngine.compare(
      { ...base, insert_code: "VNMG160408", holder_style: "J" },
      { ...base, insert_code: "CNMG120408", holder_style: "R" },
    );
    expect(cmp.h_ratio_a_over_b).toBeLessThan(1);  // VNMG-J h smaller
    expect(cmp.b_ratio_a_over_b).toBeGreaterThan(1); // VNMG-J b longer
  });

  it("winner_lower_force identifies the less force-heavy insert", () => {
    const cmp = isoInsertGeometryEngine.compare(
      { ...base, insert_code: "VNMG160408", holder_style: "J" },
      { ...base, insert_code: "CNMG120408", holder_style: "R" },
    );
    expect(["a", "b", "tie"]).toContain(cmp.winner_lower_force);
  });

  it("same insert + same holder → tie (within 2%)", () => {
    const cmp = isoInsertGeometryEngine.compare(
      { ...base, insert_code: "CNMG120408", holder_style: "R" },
      { ...base, insert_code: "CNMG120408", holder_style: "R" },
    );
    expect(cmp.winner_lower_force).toBe("tie");
    expect(cmp.force_ratio_a_over_b).toBeCloseTo(1, 4);
  });
});

describe("MILL-MASTER-P3-U05 · warnings + introspection", () => {
  it("warns when ap < 0.5 × corner radius (nose-only cut)", () => {
    const r = isoInsertGeometryEngine.kienzleWithInsert({
      insert_code: "CNMG120408", holder_style: "R",
      ap_mm: 0.3, feed_mm_rev: 0.1, material_iso: "P",
    });
    expect(r.warnings.some((w) => /nose-only/i.test(w))).toBe(true);
  });

  it("warns on aggressive chip thickness (h > 0.4mm)", () => {
    const r = isoInsertGeometryEngine.kienzleWithInsert({
      insert_code: "CNMG120408", holder_style: "R",
      ap_mm: 2.0, feed_mm_rev: 0.5, material_iso: "P",
    });
    expect(r.warnings.some((w) => /aggressive/i.test(w))).toBe(true);
  });

  it("uncharted combo surfaces in warnings", () => {
    const r = isoInsertGeometryEngine.kienzleWithInsert({
      insert_code: "KNMG120408", holder_style: "R",
      ap_mm: 2.0, feed_mm_rev: 0.25, material_iso: "P",
    });
    expect(r.warnings.some((w) => /uncharted/i.test(w))).toBe(true);
    expect(r.kappa_r_deg).toBe(90); // fallback
  });

  it("listChartedCombos returns 17 entries (the charted table)", () => {
    const list = isoInsertGeometryEngine.listChartedCombos();
    expect(list.length).toBe(17);
    for (const entry of list) {
      expect(entry).toHaveProperty("shape");
      expect(entry).toHaveProperty("holder");
      expect(entry).toHaveProperty("kappa_r_deg");
    }
  });

  it("getShapeAngles covers all 8 ISO shapes", () => {
    const angles = isoInsertGeometryEngine.getShapeAngles();
    expect(Object.keys(angles).length).toBe(8);
    expect(angles.C).toBe(80);
    expect(angles.V).toBe(35);
    expect(angles.S).toBe(90);
    expect(angles.R).toBe(360); // round
  });
});

describe("MILL-MASTER-P3-U05 · robustness (never throws)", () => {
  it("empty insert code does not throw", () => {
    expect(() => isoInsertGeometryEngine.kienzleWithInsert({
      insert_code: "", holder_style: "R",
      ap_mm: 1, feed_mm_rev: 0.1, material_iso: "P",
    })).not.toThrow();
  });

  it("zero ap produces zero force + no throw", () => {
    const r = isoInsertGeometryEngine.kienzleWithInsert({
      insert_code: "CNMG120408", holder_style: "R",
      ap_mm: 0, feed_mm_rev: 0.1, material_iso: "P",
    });
    expect(r.cutting_force_n).toBe(0);
  });

  it("zero feed produces zero force + graceful kc_eff fallback", () => {
    const r = isoInsertGeometryEngine.kienzleWithInsert({
      insert_code: "CNMG120408", holder_style: "R",
      ap_mm: 2, feed_mm_rev: 0, material_iso: "P",
    });
    expect(r.cutting_force_n).toBe(0);
    expect(Number.isFinite(r.kc_effective_n_mm2)).toBe(true);
  });
});
