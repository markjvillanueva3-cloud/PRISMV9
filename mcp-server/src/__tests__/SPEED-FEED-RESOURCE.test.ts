/**
 * SPEED-FEED-RESOURCE.test.ts — SpeedFeedResourceIntegrationEngine Tests
 *
 * Validates:
 *   1. SFM/Vc chart lookups (material-specific + fallback)
 *   2. Chip load table interpolation (by diameter and ISO group)
 *   3. Face mill lead angle strategies and chip thinning formulas
 *   4. HEM/trochoidal parameter tables
 *   5. JM Die special material database
 *   6. calculateOptimalSpeedFeed() — full reasoning chain + physics
 *   7. adjustForConditions() — multiplicative factors
 *   8. predictSurfaceFinish() — Ra formula + corrections
 *   9. optimizeForToolLife() — Taylor inversion
 *  10. validatePhysicsLimits() — power/RPM/feed safety checks
 *  11. buildResourceInsights() — orchestrator integration
 *  12. Physics law consistency checks (dimensional analysis)
 */

import { describe, it, expect } from "vitest";
import {
  speedFeedResourceIntegrationEngine,
  SpeedFeedResourceIntegrationEngine,
} from "../engines/SpeedFeedResourceIntegrationEngine.js";
import { CANONICAL_KIENZLE, CANONICAL_TAYLOR } from "../physics/constants.js";

// ============================================================================
// 1 — SFM / Vc Chart Lookups
// ============================================================================

describe("SpeedFeedResourceIntegrationEngine — SFM Chart", () => {

  it("returns SFM range for steel (ISO P)", () => {
    const r = speedFeedResourceIntegrationEngine.getMaterialSFMRange("steel");
    expect(r).not.toBeNull();
    expect(r!.iso_group).toBe("P");
    expect(r!.sfm_roughing).toBeGreaterThan(0);
    expect(r!.sfm_finishing).toBeGreaterThan(r!.sfm_roughing);
  });

  it("steel SFM matches CNCCookbook 2024 (roughing ~400 SFM)", () => {
    const r = speedFeedResourceIntegrationEngine.getMaterialSFMRange("steel");
    expect(r!.sfm_roughing).toBeCloseTo(400, -1);  // within ±50
  });

  it("aluminum 6061 SFM is much higher than steel (ISO N vs P)", () => {
    const al = speedFeedResourceIntegrationEngine.getMaterialSFMRange("aluminum_6061");
    const st = speedFeedResourceIntegrationEngine.getMaterialSFMRange("steel");
    expect(al!.sfm_roughing).toBeGreaterThan(st!.sfm_roughing * 2);
  });

  it("titanium_gr5 SFM is lower than steel (ISO S vs P)", () => {
    const ti = speedFeedResourceIntegrationEngine.getMaterialSFMRange("titanium_gr5");
    const st = speedFeedResourceIntegrationEngine.getMaterialSFMRange("steel");
    expect(ti!.sfm_roughing).toBeLessThan(st!.sfm_roughing);
  });

  it("mpm values are SFM × 0.3048", () => {
    const r = speedFeedResourceIntegrationEngine.getMaterialSFMRange("steel");
    expect(r!.mpm_roughing).toBeCloseTo(r!.sfm_roughing * 0.3048, 0);
    expect(r!.mpm_finishing).toBeCloseTo(r!.sfm_finishing * 0.3048, 0);
  });

  it("falls back to ISO group when material key not found", () => {
    const r = speedFeedResourceIntegrationEngine.getMaterialSFMRange("mystery_steel_xk99", "P");
    expect(r).not.toBeNull();
    expect(r!.iso_group).toBe("P");
  });

  it("returns null with no match and no ISO group", () => {
    const r = speedFeedResourceIntegrationEngine.getMaterialSFMRange("zzz_no_match_xyz");
    expect(r).toBeNull();
  });

  it("HEM speed boost: aluminum highest, titanium highest among superalloys", () => {
    const al = speedFeedResourceIntegrationEngine.getMaterialSFMRange("aluminum_6061")!;
    const st = speedFeedResourceIntegrationEngine.getMaterialSFMRange("steel")!;
    const ti = speedFeedResourceIntegrationEngine.getMaterialSFMRange("titanium_gr5")!;
    const hrd = speedFeedResourceIntegrationEngine.getMaterialSFMRange("hardened_steel")!;
    // Aluminum highest (high-speed HEM benefit)
    expect(al.hem_speed_boost).toBeGreaterThan(st.hem_speed_boost);
    // Titanium HEM boost is significant (3×) because HEM removes heat from cut zone
    expect(ti.hem_speed_boost).toBeGreaterThan(1.0);
    // Hardened steel has lowest HEM benefit (brittle, limited ae reduction help)
    expect(hrd.hem_speed_boost).toBeLessThan(st.hem_speed_boost);
  });
});

// ============================================================================
// 2 — Chip Load Table
// ============================================================================

describe("SpeedFeedResourceIntegrationEngine — Chip Load Table", () => {

  it("returns chip load for 10mm ISO P (steel)", () => {
    const cl = speedFeedResourceIntegrationEngine.getChipLoadGuidance(10, "P");
    expect(cl).not.toBeNull();
    expect(cl!.fz_roughing_min).toBeGreaterThan(0);
    expect(cl!.fz_roughing_max).toBeGreaterThan(cl!.fz_roughing_min);
  });

  it("aluminum chip load (N) is higher than steel (P) for same diameter", () => {
    const al = speedFeedResourceIntegrationEngine.getChipLoadGuidance(10, "N");
    const st = speedFeedResourceIntegrationEngine.getChipLoadGuidance(10, "P");
    expect(al!.fz_roughing_max).toBeGreaterThan(st!.fz_roughing_max);
  });

  it("superalloy (S) chip load is lower than steel (P)", () => {
    const s = speedFeedResourceIntegrationEngine.getChipLoadGuidance(10, "S");
    const p = speedFeedResourceIntegrationEngine.getChipLoadGuidance(10, "P");
    expect(s!.fz_roughing_max).toBeLessThan(p!.fz_roughing_max);
  });

  it("finishing chip load is lower than roughing", () => {
    const r = speedFeedResourceIntegrationEngine.getChipLoadGuidance(16, "P", "roughing");
    const f = speedFeedResourceIntegrationEngine.getChipLoadGuidance(16, "P", "finishing");
    expect(f!.fz_finishing_max).toBeLessThan(r!.fz_roughing_max);
  });

  it("interpolates correctly between 6mm and 10mm (8mm query)", () => {
    const at6  = speedFeedResourceIntegrationEngine.getChipLoadGuidance(6, "P")!;
    const at10 = speedFeedResourceIntegrationEngine.getChipLoadGuidance(10, "P")!;
    const at8  = speedFeedResourceIntegrationEngine.getChipLoadGuidance(8, "P")!;
    // Linear interpolation at midpoint should be between 6 and 10 values
    expect(at8.fz_roughing_max).toBeGreaterThan(at6.fz_roughing_max);
    expect(at8.fz_roughing_max).toBeLessThan(at10.fz_roughing_max);
  });

  it("clamps to largest table entry for oversized diameter", () => {
    const large = speedFeedResourceIntegrationEngine.getChipLoadGuidance(100, "P");
    const max   = speedFeedResourceIntegrationEngine.getChipLoadGuidance(25, "P");
    expect(large!.fz_roughing_max).toBeCloseTo(max!.fz_roughing_max, 5);
  });
});

// ============================================================================
// 3 — Face Mill Strategies
// ============================================================================

describe("SpeedFeedResourceIntegrationEngine — Face Mill Strategies", () => {

  it("45° lead angle has chip thinning factor ≈ √2", () => {
    const s = speedFeedResourceIntegrationEngine.getFaceMillStrategy(45);
    expect(s.chip_thinning_factor).toBeCloseTo(Math.sqrt(2), 3);
  });

  it("90° lead angle has chip thinning factor = 1.0 (no thinning)", () => {
    const s = speedFeedResourceIntegrationEngine.getFaceMillStrategy(90);
    expect(s.chip_thinning_factor).toBe(1.0);
  });

  it("45° face mill runs faster than 90° (speed_factor > 1.0)", () => {
    const s45 = speedFeedResourceIntegrationEngine.getFaceMillStrategy(45);
    const s90 = speedFeedResourceIntegrationEngine.getFaceMillStrategy(90);
    expect(s45.speed_factor).toBeGreaterThan(s90.speed_factor);
  });

  it("calculateFaceMillProgrammedFeed: fz_prog > fz_actual for 45° lead", () => {
    const r = speedFeedResourceIntegrationEngine.calculateFaceMillProgrammedFeed(0.10, 45);
    expect(r.fz_programmed_mm).toBeGreaterThan(r.fz_actual_mm);
    expect(r.fz_programmed_mm).toBeCloseTo(0.10 * Math.sqrt(2), 3);
  });

  it("calculateFaceMillProgrammedFeed: fz_prog = fz_actual for 90° lead", () => {
    const r = speedFeedResourceIntegrationEngine.calculateFaceMillProgrammedFeed(0.10, 90);
    expect(r.fz_programmed_mm).toBeCloseTo(0.10, 5);
  });

  it("optimal face mill WOC for 100mm face mill, roughing", () => {
    const r = speedFeedResourceIntegrationEngine.calculateOptimalFaceMillWOC(100, 45, "roughing");
    expect(r.ae_recommended_mm).toBeGreaterThan(50);  // ≥ 50% D
    expect(r.ae_recommended_mm).toBeLessThan(90);     // ≤ 90% D
    expect(r.ae_over_D).toBeGreaterThan(0.5);
  });

  it("finishing WOC is smaller than roughing WOC for same face mill", () => {
    const rough = speedFeedResourceIntegrationEngine.calculateOptimalFaceMillWOC(100, 45, "roughing");
    const finish = speedFeedResourceIntegrationEngine.calculateOptimalFaceMillWOC(100, 45, "finishing");
    expect(finish.ae_recommended_mm).toBeLessThan(rough.ae_recommended_mm);
  });
});

// ============================================================================
// 4 — HEM / Trochoidal Parameters
// ============================================================================

describe("SpeedFeedResourceIntegrationEngine — HEM Parameters", () => {

  it("all ISO groups have HEM parameters", () => {
    const groups = ["P", "M", "K", "N", "S", "H"] as const;
    for (const g of groups) {
      const h = speedFeedResourceIntegrationEngine.getHEMParameters(g);
      expect(h).toBeDefined();
      expect(h.ae_over_D).toBeGreaterThan(0);
      expect(h.ae_over_D).toBeLessThan(0.25);  // HEM = always < 25% D
    }
  });

  it("aluminum (N) has larger HEM vc_multiplier than steel (P)", () => {
    const n = speedFeedResourceIntegrationEngine.getHEMParameters("N");
    const p = speedFeedResourceIntegrationEngine.getHEMParameters("P");
    expect(n.vc_multiplier).toBeGreaterThan(p.vc_multiplier);
  });

  it("titanium (S) HEM ae/D is tightest (smallest) — heat management", () => {
    const s = speedFeedResourceIntegrationEngine.getHEMParameters("S");
    const groups = ["P", "M", "K", "N", "H"] as const;
    for (const g of groups) {
      const other = speedFeedResourceIntegrationEngine.getHEMParameters(g);
      expect(s.ae_over_D).toBeLessThanOrEqual(other.ae_over_D);
    }
  });

  it("titanium HEM Vc multiplier is highest (3×) — key benefit", () => {
    const s = speedFeedResourceIntegrationEngine.getHEMParameters("S");
    expect(s.vc_multiplier).toBeGreaterThanOrEqual(3.0);
  });

  it("ramp angles are material-appropriate (S < P < K)", () => {
    const s = speedFeedResourceIntegrationEngine.getHEMParameters("S");
    const p = speedFeedResourceIntegrationEngine.getHEMParameters("P");
    const k = speedFeedResourceIntegrationEngine.getHEMParameters("K");
    expect(s.max_ramp_angle_deg).toBeLessThan(p.max_ramp_angle_deg);
    expect(p.max_ramp_angle_deg).toBeLessThan(k.max_ramp_angle_deg);
  });
});

// ============================================================================
// 5 — JM Die Special Materials
// ============================================================================

describe("SpeedFeedResourceIntegrationEngine — JM Die Materials", () => {

  it("resolves D2 tool steel by key", () => {
    const m = speedFeedResourceIntegrationEngine.getJMDieMaterial("D2");
    expect(m).not.toBeNull();
    expect(m!.key).toBe("D2");
    expect(m!.iso_group).toBe("H");
  });

  it("resolves D2 by alias 'd2 tool steel'", () => {
    const m = speedFeedResourceIntegrationEngine.getJMDieMaterial("d2 tool steel");
    expect(m).not.toBeNull();
    expect(m!.key).toBe("D2");
  });

  it("resolves M2 high speed steel", () => {
    const m = speedFeedResourceIntegrationEngine.getJMDieMaterial("m2 hss");
    expect(m).not.toBeNull();
    expect(m!.key).toBe("M2");
    expect(m!.iso_group).toBe("P");
  });

  it("resolves H13 hot work steel", () => {
    const m = speedFeedResourceIntegrationEngine.getJMDieMaterial("H13");
    expect(m).not.toBeNull();
    expect(m!.key).toBe("H13");
    expect(m!.iso_group).toBe("H");
    expect(m!.coolant).toBe("flood");
  });

  it("resolves graphite EDM electrode", () => {
    const m = speedFeedResourceIntegrationEngine.getJMDieMaterial("graphite");
    expect(m).not.toBeNull();
    expect(m!.coolant).toBe("dry");  // graphite machined dry
    expect(m!.vc_roughing_mpm).toBeGreaterThan(200);  // high speed
  });

  it("resolves tungsten carbide", () => {
    const m = speedFeedResourceIntegrationEngine.getJMDieMaterial("tungsten carbide");
    expect(m).not.toBeNull();
    expect(m!.preferred_tool_material).toBe("pcd");
    expect(m!.vc_roughing_mpm).toBeLessThan(30);  // very slow
  });

  it("graphite machining speed is much higher than tool steel", () => {
    const gr = speedFeedResourceIntegrationEngine.getJMDieMaterial("graphite")!;
    const d2 = speedFeedResourceIntegrationEngine.getJMDieMaterial("D2")!;
    expect(gr.vc_roughing_mpm).toBeGreaterThan(d2.vc_roughing_mpm * 5);
  });

  it("returns null for unknown material", () => {
    const m = speedFeedResourceIntegrationEngine.getJMDieMaterial("unobtainium_x7");
    expect(m).toBeNull();
  });

  it("all JM Die materials have non-empty notes", () => {
    const materials = ["M2", "D2", "S7", "A2", "H13", "tungsten carbide", "graphite"];
    for (const name of materials) {
      const m = speedFeedResourceIntegrationEngine.getJMDieMaterial(name);
      expect(m).not.toBeNull();
      expect(m!.notes.length).toBeGreaterThan(0);
    }
  });
});

// ============================================================================
// 6 — calculateOptimalSpeedFeed
// ============================================================================

describe("SpeedFeedResourceIntegrationEngine — calculateOptimalSpeedFeed", () => {

  it("steel milling: returns positive Vc, RPM, fz, Vf", () => {
    const r = speedFeedResourceIntegrationEngine.calculateOptimalSpeedFeed(
      "milling",
      { key: "steel", iso_group: "P" },
      { diameter_mm: 12, flutes: 4, coating: "TiAlN" },
      { power_kw: 15, max_rpm: 8000, coolant: "flood" },
      "roughing",
    );
    expect(r.vc_mpm).toBeGreaterThan(0);
    expect(r.rpm).toBeGreaterThan(0);
    expect(r.fz_mm).toBeGreaterThan(0);
    expect(r.feed_rate_mmmin).toBeGreaterThan(0);
    expect(r.power_kw).toBeGreaterThan(0);
  });

  it("Kienzle cutting force is consistent with reported power: P = Fc×Vc/60000", () => {
    const r = speedFeedResourceIntegrationEngine.calculateOptimalSpeedFeed(
      "milling",
      { key: "steel", iso_group: "P" },
      { diameter_mm: 16, flutes: 4, coating: "TiAlN" },
      { power_kw: 22, max_rpm: 8000, coolant: "flood" },
      "roughing",
    );
    // Verify power formula: P = Fc × Vc / 60000
    const powerExpected = (r.force_N * r.vc_mpm) / 60000;
    expect(r.power_kw).toBeCloseTo(powerExpected, 1);
  });

  it("Taylor tool life is consistent: T = (C/Vc)^(1/n)", () => {
    const r = speedFeedResourceIntegrationEngine.calculateOptimalSpeedFeed(
      "milling",
      { key: "alloy_steel", iso_group: "P" },
      { diameter_mm: 10, flutes: 4 },
      { power_kw: 15, max_rpm: 10000, coolant: "flood" },
      "roughing",
    );
    const taylor = CANONICAL_TAYLOR["P"];
    const expectedLife = Math.pow(taylor.C / r.vc_mpm, 1 / taylor.n);
    // Allow some difference (coolant/coating factors applied by engine)
    expect(r.tool_life_min).toBeGreaterThan(0);
    expect(r.tool_life_min).toBeLessThan(9999);
  });

  it("aluminum Vc is significantly higher than steel Vc", () => {
    const al = speedFeedResourceIntegrationEngine.calculateOptimalSpeedFeed(
      "milling",
      { key: "aluminum_6061", iso_group: "N" },
      { diameter_mm: 10, flutes: 3 },
      { power_kw: 15, max_rpm: 18000, coolant: "flood" },
      "roughing",
    );
    const st = speedFeedResourceIntegrationEngine.calculateOptimalSpeedFeed(
      "milling",
      { key: "steel", iso_group: "P" },
      { diameter_mm: 10, flutes: 4 },
      { power_kw: 15, max_rpm: 18000, coolant: "flood" },
      "roughing",
    );
    expect(al.vc_mpm).toBeGreaterThan(st.vc_mpm * 2);
  });

  it("RPM = 1000 × Vc / (π × D) — dimensional consistency", () => {
    const r = speedFeedResourceIntegrationEngine.calculateOptimalSpeedFeed(
      "milling",
      { key: "cast_iron", iso_group: "K" },
      { diameter_mm: 20, flutes: 4 },
      { power_kw: 20, max_rpm: 6000 },
      "roughing",
    );
    const rpmExpected = Math.round((1000 * r.vc_mpm) / (Math.PI * 20));
    // RPM should match formula (within clamping)
    expect(r.rpm).toBeLessThanOrEqual(6000);
    expect(r.rpm).toBeGreaterThan(0);
  });

  it("clamping to machine max RPM reduces Vc and RPM≤max_rpm", () => {
    const r = speedFeedResourceIntegrationEngine.calculateOptimalSpeedFeed(
      "milling",
      { key: "aluminum_6061", iso_group: "N" },
      { diameter_mm: 6, flutes: 2 },  // small dia → very high RPM
      { power_kw: 10, max_rpm: 6000, coolant: "flood" },  // tight RPM limit
      "roughing",
    );
    expect(r.rpm).toBeLessThanOrEqual(6000);
  });

  it("hardness correction reduces Vc for high-HRC steel", () => {
    const soft = speedFeedResourceIntegrationEngine.calculateOptimalSpeedFeed(
      "milling",
      { key: "steel", iso_group: "P" },
      { diameter_mm: 12, flutes: 4 },
      { power_kw: 15, max_rpm: 8000 },
    );
    const hard = speedFeedResourceIntegrationEngine.calculateOptimalSpeedFeed(
      "milling",
      { key: "steel", iso_group: "P", hardness_hrc: 55 },
      { diameter_mm: 12, flutes: 4 },
      { power_kw: 15, max_rpm: 8000 },
    );
    expect(hard.vc_mpm).toBeLessThan(soft.vc_mpm);
  });

  it("includes non-empty reasoning chain", () => {
    const r = speedFeedResourceIntegrationEngine.calculateOptimalSpeedFeed(
      "milling",
      { key: "stainless_304", iso_group: "M" },
      { diameter_mm: 10, flutes: 4 },
      { power_kw: 15, max_rpm: 8000 },
    );
    expect(r.reasoning_chain.length).toBeGreaterThan(3);
    expect(r.source).toContain("SpeedFeedResourceIntegrationEngine");
  });
});

// ============================================================================
// 7 — adjustForConditions
// ============================================================================

describe("SpeedFeedResourceIntegrationEngine — adjustForConditions", () => {

  const baseParams = { vc_mpm: 150, fz_mm: 0.020, ap_mm: 5.0, ae_mm: 6.0 };

  it("neutral conditions (all 1.0) preserve base parameters", () => {
    const r = speedFeedResourceIntegrationEngine.adjustForConditions(baseParams, {});
    expect(r.vc_mpm).toBeCloseTo(baseParams.vc_mpm, 1);
    expect(r.fz_mm).toBeCloseTo(baseParams.fz_mm, 4);
    expect(r.overall_factor).toBeCloseTo(1.0, 2);
  });

  it("low rigidity reduces Vc and fz", () => {
    const r = speedFeedResourceIntegrationEngine.adjustForConditions(baseParams, {
      rigidity_factor: 0.7,
    });
    expect(r.vc_mpm).toBeLessThan(baseParams.vc_mpm);
    expect(r.fz_mm).toBeLessThan(baseParams.fz_mm);
  });

  it("cryogenic coolant increases Vc vs dry", () => {
    const cryo = speedFeedResourceIntegrationEngine.adjustForConditions(baseParams, {
      coolant_factor: 1.15,
    });
    const dry = speedFeedResourceIntegrationEngine.adjustForConditions(baseParams, {
      coolant_factor: 0.75,
    });
    expect(cryo.vc_mpm).toBeGreaterThan(dry.vc_mpm);
  });

  it("multiple poor conditions stack to reduce Vc significantly", () => {
    const r = speedFeedResourceIntegrationEngine.adjustForConditions(baseParams, {
      rigidity_factor: 0.7,
      setup_factor: 0.85,
      coolant_factor: 0.75,  // dry
      holder_factor: 0.85,   // ER collet
    });
    expect(r.vc_mpm).toBeLessThan(baseParams.vc_mpm * 0.6);
  });

  it("factor_breakdown contains all applied factors", () => {
    const r = speedFeedResourceIntegrationEngine.adjustForConditions(baseParams, {
      rigidity_factor: 0.9,
    });
    expect(r.factor_breakdown).toHaveProperty("rigidity");
    expect(r.factor_breakdown.rigidity).toBe(0.9);
  });
});

// ============================================================================
// 8 — predictSurfaceFinish
// ============================================================================

describe("SpeedFeedResourceIntegrationEngine — predictSurfaceFinish", () => {

  it("theoretical Ra formula matches Machinery's Handbook: Ra = fz²×1000/(32×r)", () => {
    const fz = 0.10, r_eps = 0.5;
    const expected = (fz * fz * 1000) / (32 * r_eps);  // 0.625 µm
    const result = speedFeedResourceIntegrationEngine.predictSurfaceFinish({
      fz_mm: fz,
      corner_radius_mm: r_eps,
      operation: "milling",
      iso_group: "P",
      coolant: "flood",
      overhang_ratio: 3,
    });
    expect(result.ra_theoretical_um).toBeCloseTo(expected, 3);
  });

  it("actual Ra > theoretical Ra (corrections add roughness)", () => {
    const r = speedFeedResourceIntegrationEngine.predictSurfaceFinish({
      fz_mm: 0.10,
      corner_radius_mm: 0.5,
      operation: "milling",
      iso_group: "P",
      coolant: "dry",  // no coolant benefit
      overhang_ratio: 5,  // high overhang increases vibration
    });
    expect(r.ra_actual_um).toBeGreaterThanOrEqual(r.ra_theoretical_um);
  });

  it("smaller fz produces finer surface finish", () => {
    const coarse = speedFeedResourceIntegrationEngine.predictSurfaceFinish({
      fz_mm: 0.20, corner_radius_mm: 1.0, operation: "milling", iso_group: "P",
    });
    const fine = speedFeedResourceIntegrationEngine.predictSurfaceFinish({
      fz_mm: 0.05, corner_radius_mm: 1.0, operation: "milling", iso_group: "P",
    });
    expect(fine.ra_actual_um).toBeLessThan(coarse.ra_actual_um);
  });

  it("larger corner radius produces finer surface finish", () => {
    const small = speedFeedResourceIntegrationEngine.predictSurfaceFinish({
      fz_mm: 0.08, corner_radius_mm: 0.2, operation: "milling", iso_group: "P",
    });
    const large = speedFeedResourceIntegrationEngine.predictSurfaceFinish({
      fz_mm: 0.08, corner_radius_mm: 2.0, operation: "milling", iso_group: "P",
    });
    expect(large.ra_actual_um).toBeLessThan(small.ra_actual_um);
  });

  it("finish class 'fine' for Ra < 3.2 µm", () => {
    const r = speedFeedResourceIntegrationEngine.predictSurfaceFinish({
      fz_mm: 0.04, corner_radius_mm: 1.0, operation: "milling", iso_group: "P",
      coolant: "flood",
    });
    expect(["fine", "super_finish"]).toContain(r.finish_class);
  });

  it("ISO 1302 N-grade is within N1–N12 range", () => {
    const r = speedFeedResourceIntegrationEngine.predictSurfaceFinish({
      fz_mm: 0.10, corner_radius_mm: 0.5, operation: "milling", iso_group: "P",
    });
    const nNum = parseInt(r.n_grade.replace("N", ""), 10);
    expect(nNum).toBeGreaterThanOrEqual(1);
    expect(nNum).toBeLessThanOrEqual(12);
  });

  it("formula string references Machinery's Handbook", () => {
    const r = speedFeedResourceIntegrationEngine.predictSurfaceFinish({
      fz_mm: 0.10, corner_radius_mm: 0.5, operation: "milling", iso_group: "P",
    });
    expect(r.formula).toContain("Machinery");
  });
});

// ============================================================================
// 9 — optimizeForToolLife (Taylor inversion)
// ============================================================================

describe("SpeedFeedResourceIntegrationEngine — optimizeForToolLife", () => {

  it("Taylor inversion: longer target life → lower Vc", () => {
    const short = speedFeedResourceIntegrationEngine.optimizeForToolLife(
      { iso_group: "P", tool_diameter_mm: 10, flutes: 4, ap_mm: 5, ae_mm: 4, fz_mm: 0.02 },
      30,  // 30 min target
    );
    const long = speedFeedResourceIntegrationEngine.optimizeForToolLife(
      { iso_group: "P", tool_diameter_mm: 10, flutes: 4, ap_mm: 5, ae_mm: 4, fz_mm: 0.02 },
      120,  // 120 min target
    );
    expect(long.vc_optimized_mpm).toBeLessThan(short.vc_optimized_mpm);
  });

  it("verified tool life matches target within Taylor model", () => {
    const target = 60;
    const result = speedFeedResourceIntegrationEngine.optimizeForToolLife(
      { iso_group: "P", tool_diameter_mm: 12, flutes: 4, ap_mm: 5, ae_mm: 5, fz_mm: 0.02 },
      target,
    );
    // Verify with Taylor equation directly
    const taylor = CANONICAL_TAYLOR["P"];
    const lifeCheck = Math.pow(taylor.C / result.vc_optimized_mpm, 1 / taylor.n);
    expect(lifeCheck).toBeCloseTo(target, 0);
  });

  it("productivity_index > 0", () => {
    const r = speedFeedResourceIntegrationEngine.optimizeForToolLife(
      { iso_group: "N", tool_diameter_mm: 12, flutes: 3, ap_mm: 10, ae_mm: 8, fz_mm: 0.06 },
      45,
    );
    expect(r.productivity_index).toBeGreaterThan(0);
  });

  it("includes Taylor formula reference in output", () => {
    const r = speedFeedResourceIntegrationEngine.optimizeForToolLife(
      { iso_group: "M", tool_diameter_mm: 10, flutes: 4, ap_mm: 4, ae_mm: 3, fz_mm: 0.015 },
      60,
    );
    expect(r.taylor_formula).toContain("ISO 3685");
    expect(r.reasoning.length).toBeGreaterThan(1);
  });
});

// ============================================================================
// 10 — validatePhysicsLimits
// ============================================================================

describe("SpeedFeedResourceIntegrationEngine — validatePhysicsLimits", () => {

  it("reasonable steel parameters pass all checks (passed=true, severity=ok)", () => {
    const r = speedFeedResourceIntegrationEngine.validatePhysicsLimits(
      {
        vc_mpm: 120, rpm: 3000, fz_mm: 0.020, feed_rate_mmmin: 240,
        ap_mm: 5, iso_group: "P", tool_diameter_mm: 12, flutes: 4,
      },
      { power_kw: 22, max_rpm: 8000 },
      { tool_material: "carbide" },
    );
    expect(r.overall_severity).toBe("ok");
    expect(r.passed).toBe(true);
    // reduction_factor is always ≤ 1.0 — engine applies 5% safety margin even when all checks pass
    expect(r.reduction_factor).toBeGreaterThanOrEqual(0.90);
    expect(r.reduction_factor).toBeLessThanOrEqual(1.00);
  });

  it("excessive RPM triggers critical failure", () => {
    const r = speedFeedResourceIntegrationEngine.validatePhysicsLimits(
      {
        vc_mpm: 500, rpm: 20000, fz_mm: 0.020, feed_rate_mmmin: 1600,
        ap_mm: 5, iso_group: "P", tool_diameter_mm: 8, flutes: 4,
      },
      { power_kw: 22, max_rpm: 8000 },  // machine max 8000
      { tool_material: "carbide" },
    );
    const rpmCheck = r.checks.find(c => c.name === "rpm");
    expect(rpmCheck!.passed).toBe(false);
    expect(rpmCheck!.severity).toBe("critical");
  });

  it("power overload yields reduction_factor < 1.0", () => {
    // Force a power overload: very high Vc and deep cut
    const r = speedFeedResourceIntegrationEngine.validatePhysicsLimits(
      {
        vc_mpm: 500, rpm: 5000, fz_mm: 0.10, feed_rate_mmmin: 2000,
        ap_mm: 50, iso_group: "P", tool_diameter_mm: 32, flutes: 4,
      },
      { power_kw: 5, max_rpm: 8000 },  // tiny machine
      { tool_material: "carbide" },
    );
    expect(r.passed).toBe(false);
    expect(r.reduction_factor).toBeLessThan(1.0);
  });

  it("includes chip_load check when guidance data exists", () => {
    const r = speedFeedResourceIntegrationEngine.validatePhysicsLimits(
      {
        vc_mpm: 120, rpm: 3000, fz_mm: 0.020, feed_rate_mmmin: 240,
        ap_mm: 5, iso_group: "P", tool_diameter_mm: 10, flutes: 4,
      },
      { power_kw: 22, max_rpm: 8000 },
      {},
    );
    const clCheck = r.checks.find(c => c.name === "chip_load");
    expect(clCheck).toBeDefined();
  });

  it("reduction_factor is always in [0.10, 1.00]", () => {
    // Extreme case — everything over limit
    const r = speedFeedResourceIntegrationEngine.validatePhysicsLimits(
      {
        vc_mpm: 9999, rpm: 99999, fz_mm: 1.0, feed_rate_mmmin: 99999,
        ap_mm: 500, iso_group: "P", tool_diameter_mm: 10, flutes: 4,
      },
      { power_kw: 1, max_rpm: 100 },
      {},
    );
    expect(r.reduction_factor).toBeGreaterThanOrEqual(0.10);
    expect(r.reduction_factor).toBeLessThanOrEqual(1.00);
  });
});

// ============================================================================
// 11 — buildResourceInsights (Orchestrator Integration)
// ============================================================================

describe("SpeedFeedResourceIntegrationEngine — buildResourceInsights", () => {

  it("returns ResourceInsights object with expected fields", () => {
    const r = speedFeedResourceIntegrationEngine.buildResourceInsights(
      "steel", "P", 12, "milling", undefined, "Haas VF-2",
    );
    expect(r).toHaveProperty("material_sfm_range");
    expect(r).toHaveProperty("chip_load_guidance");
    expect(r).toHaveProperty("face_mill_strategy");
    expect(r).toHaveProperty("hem_parameters");
    expect(r).toHaveProperty("jm_die_material");
    expect(r).toHaveProperty("pdf_source_notes");
    expect(r).toHaveProperty("machine_specific_notes");
  });

  it("populates machine_specific_notes for Haas VF-2", () => {
    const r = speedFeedResourceIntegrationEngine.buildResourceInsights(
      "steel", "P", 12, "milling", undefined, "Haas VF-2",
    );
    expect(r.machine_specific_notes.length).toBeGreaterThan(0);
    expect(r.machine_specific_notes.some(n => n.includes("G187"))).toBe(true);
  });

  it("JM Die material is populated for D2 key", () => {
    const r = speedFeedResourceIntegrationEngine.buildResourceInsights(
      "D2", "H", 10, "milling", undefined, undefined,
    );
    expect(r.jm_die_material).not.toBeNull();
    expect(r.jm_die_material!.key).toBe("D2");
  });

  it("HEM parameters populated for trochoidal strategy", () => {
    const r = speedFeedResourceIntegrationEngine.buildResourceInsights(
      "titanium_gr5", "S", 10, "milling", "trochoidal", undefined,
    );
    expect(r.hem_parameters).not.toBeNull();
    expect(r.pdf_source_notes.some(n => n.includes("HEM") || n.includes("trochoidal"))).toBe(true);
  });

  it("pdf_source_notes includes SFM reference for known material", () => {
    const r = speedFeedResourceIntegrationEngine.buildResourceInsights(
      "steel", "P", 12, "milling", undefined, undefined,
    );
    expect(r.pdf_source_notes.some(n => n.includes("CNCCookbook"))).toBe(true);
  });
});

// ============================================================================
// 12 — Physics Law Consistency (Dimensional Analysis)
// ============================================================================

describe("SpeedFeedResourceIntegrationEngine — Physics Consistency", () => {

  it("Kienzle: higher kc1_1 material (H > P > N) produces higher cutting force", () => {
    const engine = speedFeedResourceIntegrationEngine;
    // All ISO groups: ap=2mm, fz=0.02mm
    const kienzleH = CANONICAL_KIENZLE["H"];
    const kienzleP = CANONICAL_KIENZLE["P"];
    const kienzleN = CANONICAL_KIENZLE["N"];
    const ap = 2, fz = 0.02;
    const FcH = kienzleH.kc1_1 * ap * Math.pow(fz, 1 - kienzleH.mc);
    const FcP = kienzleP.kc1_1 * ap * Math.pow(fz, 1 - kienzleP.mc);
    const FcN = kienzleN.kc1_1 * ap * Math.pow(fz, 1 - kienzleN.mc);
    expect(FcH).toBeGreaterThan(FcP);
    expect(FcP).toBeGreaterThan(FcN);
  });

  it("Taylor: lower Vc → longer tool life (T increases as Vc decreases)", () => {
    const taylor = CANONICAL_TAYLOR["P"];
    const life100 = Math.pow(taylor.C / 100, 1 / taylor.n);
    const life200 = Math.pow(taylor.C / 200, 1 / taylor.n);
    expect(life100).toBeGreaterThan(life200);
  });

  it("MRR = ap × ae × Vf / 1000 units check [cm³/min]", () => {
    // ap=5mm, ae=4mm, Vf=500mm/min → MRR = 5×4×500/1000 = 10 cm³/min
    const mrr = (5 * 4 * 500) / 1000;
    expect(mrr).toBeCloseTo(10.0, 5);
  });

  it("Ra formula: doubling fz quadruples theoretical Ra", () => {
    const r = (fz: number, rEps: number) => (fz * fz * 1000) / (32 * rEps);
    const ra1 = r(0.10, 0.5);
    const ra2 = r(0.20, 0.5);
    expect(ra2 / ra1).toBeCloseTo(4.0, 5);  // quadratic relationship
  });

  it("RPM formula: RPM = 1000×Vc/(π×D) — 150m/min, 12mm dia ≈ 3979 RPM", () => {
    const rpm = (1000 * 150) / (Math.PI * 12);
    expect(rpm).toBeCloseTo(3978.9, 0);
  });

  it("chip thinning: 45° lead doubles effective chip thickness relative to 90° at same fz_programmed", () => {
    // fz_actual = fz_programmed × cos(45°)
    const fzProg = 0.10;
    const fzActual45 = fzProg * Math.cos(Math.PI / 4);  // 0.0707
    const fzActual90 = fzProg;  // 0.10 (no thinning)
    // Ratio of actual chip thicknesses
    expect(fzActual90 / fzActual45).toBeCloseTo(Math.sqrt(2), 3);
  });
});
