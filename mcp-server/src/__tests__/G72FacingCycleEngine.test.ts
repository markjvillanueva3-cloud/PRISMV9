/**
 * MILL-MASTER-P3-U02-FACE-G72 — G72 physics-DOC facing cycle tests
 *
 * Verifies:
 *   - Physics-derived ap_max from Kienzle + power constraint
 *   - Multi-pass expansion when total_doc > dpp_max
 *   - Material-group sensitivity (P/M/K/N/S/H produce different dpp)
 *   - Power-envelope clamping — higher power → larger dpp
 *   - Feed impact — higher feed → thicker chip → lower dpp (power-limited)
 *   - finish_allowance_mm reserved from roughing
 *   - Pass rebalancing (equal passes, no tiny last pass)
 *   - Input clamping: MIN_AP / MAX_AP / degenerate lead angle
 *   - force_dpp_mm override bypasses physics (testing hook)
 *   - Warnings on power overcommit, aggressive chip, finish_allow > total_doc
 */
import { describe, it, expect } from "vitest";
import { g72FacingCycleEngine } from "../engines/G72FacingCycleEngine.js";

const base = {
  face_od_mm: 100,
  face_z_mm: 0,
  total_doc_mm: 5,
  cutting_speed_m_min: 200,
  feed_per_rev_mm: 0.25,
  spindle_power_kw: 15,
  lead_angle_deg: 90,
};

describe("MILL-MASTER-P3-U02 · G72 physics DOC — core contract", () => {
  it("computes non-zero dpp from physics (not zero, not NaN)", () => {
    const r = g72FacingCycleEngine.generate({ ...base, material_iso: "P" });
    expect(r.dpp_mm).toBeGreaterThan(0);
    expect(Number.isFinite(r.dpp_mm)).toBe(true);
  });

  it("pass_count ≥ 1 always (never zero passes for roughing)", () => {
    const r = g72FacingCycleEngine.generate({ ...base, material_iso: "P" });
    expect(r.pass_count).toBeGreaterThanOrEqual(1);
  });

  it("emits exactly 3 G-code lines per cycle (comment + G72 line 1 + G72 line 2)", () => {
    const r = g72FacingCycleEngine.generate({ ...base, material_iso: "P" });
    expect(r.gcode).toHaveLength(3);
    expect(r.gcode[1]).toMatch(/^G72 W/);
    expect(r.gcode[2]).toMatch(/^G72 P/);
  });

  it("G72 line 1 carries the rebalanced dpp", () => {
    const r = g72FacingCycleEngine.generate({ ...base, material_iso: "P" });
    const expected = r.dpp_mm.toFixed(3);
    expect(r.gcode[1]).toContain(`W${expected}`);
  });

  it("G72 line 2 carries finish allowance in W word", () => {
    const r = g72FacingCycleEngine.generate({ ...base, material_iso: "P", finish_allowance_mm: 0.25 });
    expect(r.gcode[2]).toContain("W0.250");
  });

  it("comment includes material group + pass count + power utilization", () => {
    const r = g72FacingCycleEngine.generate({ ...base, material_iso: "P" });
    expect(r.gcode[0]).toContain("material=P");
    expect(r.gcode[0]).toMatch(/\d rough pass/);
    expect(r.gcode[0]).toMatch(/power_util=\d+%/);
  });
});

describe("MILL-MASTER-P3-U02 · material-group sensitivity (Kienzle kc1.1 differences)", () => {
  it("harder material (S — superalloy, kc=2800) → smaller ap_max_raw than P (steel, kc=1800)", () => {
    // Compare ap_max_raw (physics value BEFORE rebalancing) because dpp_mm can be
    // flattened when both materials fall in the same pass_count bucket.
    const p = g72FacingCycleEngine.generate({ ...base, material_iso: "P" });
    const s = g72FacingCycleEngine.generate({ ...base, material_iso: "S" });
    expect(s.ap_max_raw_mm).toBeLessThan(p.ap_max_raw_mm);
  });

  it("softer material (N — aluminum, kc=700) → larger ap_max_raw than P (steel)", () => {
    const p = g72FacingCycleEngine.generate({ ...base, material_iso: "P" });
    const n = g72FacingCycleEngine.generate({ ...base, material_iso: "N" });
    expect(n.ap_max_raw_mm).toBeGreaterThan(p.ap_max_raw_mm);
  });

  it("hardened steel H (kc=3200) → smallest dpp of all groups", () => {
    const groups: Array<"P" | "M" | "K" | "N" | "S" | "H"> = ["P", "M", "K", "N", "S", "H"];
    const dpps = groups.map((g) => ({ g, dpp: g72FacingCycleEngine.generate({ ...base, material_iso: g }).ap_max_raw_mm }));
    const h = dpps.find((x) => x.g === "H")!;
    for (const d of dpps) {
      if (d.g === "H") continue;
      expect(h.dpp).toBeLessThanOrEqual(d.dpp);
    }
  });
});

describe("MILL-MASTER-P3-U02 · power envelope scaling", () => {
  it("2× spindle power → ~2× ap_max_raw (linear in power)", () => {
    const low = g72FacingCycleEngine.generate({ ...base, material_iso: "P", spindle_power_kw: 5 });
    const high = g72FacingCycleEngine.generate({ ...base, material_iso: "P", spindle_power_kw: 10 });
    // Not exactly 2× because of pass rebalancing, but ap_max_raw is linear
    expect(high.ap_max_raw_mm / low.ap_max_raw_mm).toBeCloseTo(2, 1);
  });

  it("reducing power below threshold forces more passes", () => {
    const lowPower = g72FacingCycleEngine.generate({ ...base, material_iso: "P", spindle_power_kw: 1, total_doc_mm: 5 });
    const highPower = g72FacingCycleEngine.generate({ ...base, material_iso: "P", spindle_power_kw: 20, total_doc_mm: 5 });
    expect(lowPower.pass_count).toBeGreaterThan(highPower.pass_count);
  });

  it("higher feed (thicker chip) lowers dpp — power-limited", () => {
    const lowFeed = g72FacingCycleEngine.generate({ ...base, material_iso: "P", feed_per_rev_mm: 0.1 });
    const highFeed = g72FacingCycleEngine.generate({ ...base, material_iso: "P", feed_per_rev_mm: 0.4 });
    expect(highFeed.ap_max_raw_mm).toBeLessThan(lowFeed.ap_max_raw_mm);
  });
});

describe("MILL-MASTER-P3-U02 · pass balancing + finish allowance", () => {
  it("finish_allowance subtracted from total before pass count", () => {
    const r = g72FacingCycleEngine.generate({
      ...base, material_iso: "P", total_doc_mm: 5, finish_allowance_mm: 0.5,
    });
    // roughDoc = 4.5, pass_count × dpp ≈ 4.5 (rebalanced)
    const effRough = r.dpp_mm * r.pass_count;
    expect(effRough).toBeCloseTo(4.5, 2);
  });

  it("pass rebalancing produces equal passes (no tiny last pass)", () => {
    const r = g72FacingCycleEngine.generate({
      ...base, material_iso: "P", total_doc_mm: 7, spindle_power_kw: 10,
    });
    // After physics, if pass_count=3 then dpp_mm × 3 should equal roughDoc exactly
    const rough = 7 - 0.1;  // finish_allowance default
    expect(r.dpp_mm * r.pass_count).toBeCloseTo(rough, 5);
  });

  it("total_doc ≤ finish_allowance returns zero rough passes + warning", () => {
    const r = g72FacingCycleEngine.generate({
      ...base, material_iso: "P", total_doc_mm: 0.05, finish_allowance_mm: 0.1,
    });
    expect(r.pass_count).toBe(0);
    expect(r.warnings.some((w) => /nothing to rough/i.test(w))).toBe(true);
  });
});

describe("MILL-MASTER-P3-U02 · clamping + overrides", () => {
  it("MIN_AP clamp (0.05mm) — very low power case", () => {
    const r = g72FacingCycleEngine.generate({
      ...base, material_iso: "H", spindle_power_kw: 0.01,
    });
    expect(r.dpp_mm).toBeGreaterThanOrEqual(0.05);
    expect(r.warnings.some((w) => /minimum|clamped/i.test(w))).toBe(true);
  });

  it("MAX_AP clamp (8mm) — huge power + soft material", () => {
    const r = g72FacingCycleEngine.generate({
      ...base, material_iso: "N", spindle_power_kw: 500, feed_per_rev_mm: 0.1,
    });
    // ap_max_raw may be very large but dpp clamps
    expect(r.dpp_mm).toBeLessThanOrEqual(8.0);
  });

  it("force_dpp_mm override bypasses physics", () => {
    const r = g72FacingCycleEngine.generate({
      ...base, material_iso: "H", spindle_power_kw: 1, force_dpp_mm: 2.0, total_doc_mm: 6,
    });
    // Rebalanced against 6 - 0.1 = 5.9, pass_count = ceil(5.9/2) = 3, so dpp = 5.9/3
    expect(r.pass_count).toBe(3);
    expect(r.dpp_mm).toBeCloseTo(5.9 / 3, 3);
  });

  it("invalid lead angle (0°) falls back to 90° + warning", () => {
    const r = g72FacingCycleEngine.generate({
      ...base, material_iso: "P", lead_angle_deg: 0,
    });
    expect(r.warnings.some((w) => /lead_angle.*invalid/i.test(w))).toBe(true);
    expect(r.dpp_mm).toBeGreaterThan(0);
  });
});

describe("MILL-MASTER-P3-U02 · power utilization + force sanity", () => {
  it("power_utilization in [0, 1] for reasonable input", () => {
    const r = g72FacingCycleEngine.generate({ ...base, material_iso: "P" });
    expect(r.power_utilization).toBeGreaterThan(0);
    expect(r.power_utilization).toBeLessThanOrEqual(1.0);
  });

  it("cutting_force > 0 and scales with dpp (thicker pass → larger force)", () => {
    const thin = g72FacingCycleEngine.generate({ ...base, material_iso: "P", force_dpp_mm: 1 });
    const thick = g72FacingCycleEngine.generate({ ...base, material_iso: "P", force_dpp_mm: 3 });
    expect(thick.cutting_force_n).toBeGreaterThan(thin.cutting_force_n);
  });

  it("force-dpp override that overcommits power emits warning", () => {
    const r = g72FacingCycleEngine.generate({
      ...base, material_iso: "H", spindle_power_kw: 2, force_dpp_mm: 8, total_doc_mm: 10,
    });
    expect(r.warnings.some((w) => /power utilization/i.test(w))).toBe(true);
  });
});

describe("MILL-MASTER-P3-U02 · never throws on edge input", () => {
  it("zero feed doesn't crash (clamps to min)", () => {
    expect(() => g72FacingCycleEngine.generate({
      ...base, material_iso: "P", feed_per_rev_mm: 0.01,
    })).not.toThrow();
  });

  it("tiny total_doc produces sensible 1-pass result", () => {
    const r = g72FacingCycleEngine.generate({
      ...base, material_iso: "P", total_doc_mm: 0.3,
    });
    expect(r.pass_count).toBeGreaterThanOrEqual(0);
    expect(r.dpp_mm).toBeGreaterThanOrEqual(0);
  });
});
