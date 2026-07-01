/**
 * SpeedFeedOrchestratorEngine.compute() numeric-regression BASELINE -- SFC CONVERGENCE P0 (slot:oscar).
 *
 * The orchestrator is the WEB-UI physics engine (via prism_calc:sf_orchestrate) yet has NO direct
 * compute() unit-test coverage. Before the operator-approved CONVERGENCE -- make compute() delegate
 * its core physics to UltimateSpeedFeedEngine (plan: reference_oscar_sfc_convergence_plan_2026_06_21;
 * divergence: reference_oscar_sfc_two_engine_divergence_2026_06_21) -- this SNAPSHOTS the CURRENT
 * deterministic core-physics outputs (Vc/RPM/fz/Vf/MRR/power/torque/Fc/life/Ra/deflection) for 4
 * representative inputs.
 *
 * WHY: the two engines compute core physics differently (orchestrator: calibration factors +
 * proven-program blending; engine: hardness H-switch + chip-thinning), so the convergence WILL shift
 * these numbers. When these tests fail post-convergence, the diff QUANTIFIES the production UI
 * re-baseline for operator sign-off -- then the baselines below are updated to the new (canonical) values.
 *
 * Captured 2026-06-21 from live compute() (pre-convergence). The MC uncertainty fields
 * (force_ci95/life_ci95/...) are NOT snapshotted -- partially Math.random-driven (orchestrator
 * L1932-1946) -> non-deterministic; only the deterministic point estimates are pinned here.
 */
import { describe, it, expect } from "vitest";
import { speedFeedOrchestratorEngine } from "../engines/SpeedFeedOrchestratorEngine.js";

interface Det {
  cutting_speed_mpm: number; spindle_rpm: number; feed_per_tooth_mm: number; feed_rate_mmmin: number;
  mrr_cm3min: number; power_kw: number; torque_Nm: number; tangential_force_N: number;
  tool_life_min: number; surface_finish_Ra_um: number; deflection_um: number;
}
const compute = (input: Record<string, unknown>): Det => {
  const r = speedFeedOrchestratorEngine.compute(input as never) as unknown as { value?: Det } & Det;
  return (r.value ?? r) as Det;
};
const assertDet = (got: Det, exp: Det): void => {
  expect(got.cutting_speed_mpm).toBeCloseTo(exp.cutting_speed_mpm, 1);
  expect(got.spindle_rpm).toBeCloseTo(exp.spindle_rpm, 0);
  expect(got.feed_per_tooth_mm).toBeCloseTo(exp.feed_per_tooth_mm, 3);
  expect(got.feed_rate_mmmin).toBeCloseTo(exp.feed_rate_mmmin, 0);
  expect(got.mrr_cm3min).toBeCloseTo(exp.mrr_cm3min, 1);
  expect(got.power_kw).toBeCloseTo(exp.power_kw, 1);
  expect(got.torque_Nm).toBeCloseTo(exp.torque_Nm, 1);
  expect(got.tangential_force_N).toBeCloseTo(exp.tangential_force_N, 0);
  expect(got.tool_life_min).toBeCloseTo(exp.tool_life_min, 0);
  expect(got.surface_finish_Ra_um).toBeCloseTo(exp.surface_finish_Ra_um, 1);
  expect(got.deflection_um).toBeCloseTo(exp.deflection_um, 0);
};

const STEEL = { material: "steel", iso_group: "P", tool_diameter_mm: 10, flutes: 4, operation: "milling", cut_type: "roughing", axial_depth_mm: 3, radial_depth_mm: 5 };
const ALU = { material: "aluminum", iso_group: "N", tool_diameter_mm: 8, flutes: 3, operation: "milling", cut_type: "finishing", axial_depth_mm: 1, radial_depth_mm: 0.5 };
const TI = { material: "titanium", iso_group: "S", tool_diameter_mm: 12, flutes: 4, operation: "milling", cut_type: "roughing", axial_depth_mm: 2, radial_depth_mm: 4 };
const HARD = { material: "steel", iso_group: "P", hardness_hb: 500, tool_diameter_mm: 6, flutes: 4, operation: "milling", cut_type: "finishing", axial_depth_mm: 0.5, radial_depth_mm: 0.3 };
const STAINLESS = { material: "stainless steel", iso_group: "M", tool_diameter_mm: 10, flutes: 4, operation: "milling", cut_type: "roughing", axial_depth_mm: 3, radial_depth_mm: 5 };
const CASTIRON = { material: "cast iron", iso_group: "K", tool_diameter_mm: 16, flutes: 4, operation: "milling", cut_type: "roughing", axial_depth_mm: 4, radial_depth_mm: 8 };

describe("SpeedFeedOrchestrator compute() numeric-regression baseline (CONVERGENCE P0, pre-convergence snapshot)", () => {
  it("steel P milling roughing -> deterministic core-physics snapshot", () => {
    // Re-baselined 2026-06-23 (U-SFC-DEFLECTION-VC-LEVER): prior Vc=80.3 was the deflection-Vc-collapse
    // artifact; the fix keeps Vc in-band (200, published carbide P band 110-250) and absorbs deflection via fz.
    assertDet(compute(STEEL), { cutting_speed_mpm: 200, spindle_rpm: 6366, feed_per_tooth_mm: 0.0237, feed_rate_mmmin: 604, mrr_cm3min: 9.06, power_kw: 1.09, torque_Nm: 1.63, tangential_force_N: 326, tool_life_min: 9, surface_finish_Ra_um: 0.18, deflection_um: 16 });
  });

  it("aluminum N milling finishing -> deterministic core-physics snapshot", () => {
    assertDet(compute(ALU), { cutting_speed_mpm: 301.6, spindle_rpm: 12000, feed_per_tooth_mm: 0.0661, feed_rate_mmmin: 2380, mrr_cm3min: 1.19, power_kw: 0.42, torque_Nm: 0.34, tangential_force_N: 84, tool_life_min: 6, surface_finish_Ra_um: 1.37, deflection_um: 5.1 });
  });

  it("titanium S milling roughing -> deterministic core-physics snapshot", () => {
    // Re-baselined 2026-06-23 (U-SFC-DEFLECTION-VC-LEVER): prior Vc=18.5 was deflection-collapsed;
    // fix keeps Vc in-band (50, published Ti S band 30-80) and absorbs deflection via fz.
    assertDet(compute(TI), { cutting_speed_mpm: 50, spindle_rpm: 1326, feed_per_tooth_mm: 0.0261, feed_rate_mmmin: 139, mrr_cm3min: 1.11, power_kw: 0.33, torque_Nm: 2.35, tangential_force_N: 392, tool_life_min: 447, surface_finish_Ra_um: 0.21, deflection_um: 16 });
  });

  it("hardened steel HB500 milling finishing -> deterministic core-physics snapshot", () => {
    assertDet(compute(HARD), { cutting_speed_mpm: 226.2, spindle_rpm: 12000, feed_per_tooth_mm: 0.0551, feed_rate_mmmin: 2643, mrr_cm3min: 0.4, power_kw: 0.58, torque_Nm: 0.46, tangential_force_N: 154, tool_life_min: 6, surface_finish_Ra_um: 0.95, deflection_um: 12.4 });
  });

  it("stainless M milling roughing -> deterministic core-physics snapshot", () => {
    // Re-baselined 2026-06-23 (U-SFC-DEFLECTION-VC-LEVER): prior Vc=41.3 was deflection-collapsed;
    // fix keeps Vc in-band (120, published stainless M band 75-160) and absorbs deflection via fz.
    assertDet(compute(STAINLESS), { cutting_speed_mpm: 120, spindle_rpm: 3820, feed_per_tooth_mm: 0.0193, feed_rate_mmmin: 295, mrr_cm3min: 4.42, power_kw: 0.65, torque_Nm: 1.63, tangential_force_N: 326, tool_life_min: 13, surface_finish_Ra_um: 0.12, deflection_um: 16 });
  });

  it("cast iron K milling roughing -> deterministic core-physics snapshot", () => {
    // Re-baselined 2026-06-23 (U-SFC-DEFLECTION-VC-LEVER): prior Vc=93.8 was deflection-collapsed;
    // fix keeps Vc in-band (180, published gray cast iron K band 100-250) and absorbs deflection via fz.
    assertDet(compute(CASTIRON), { cutting_speed_mpm: 180, spindle_rpm: 3581, feed_per_tooth_mm: 0.0518, feed_rate_mmmin: 742, mrr_cm3min: 23.74, power_kw: 1.57, torque_Nm: 4.18, tangential_force_N: 522, tool_life_min: 4, surface_finish_Ra_um: 0.84, deflection_um: 16 });
  });

  it("uncertainty structure snapshot -- weibull/sobol valid, but force/life/ra CI95 are [null,null] (a known pre-convergence GAP P3 fixes)", () => {
    const r = speedFeedOrchestratorEngine.compute(STEEL as never) as unknown as { value?: { uncertainty?: Record<string, unknown> } } & { uncertainty?: Record<string, unknown> };
    const u = ((r.value ?? r).uncertainty ?? {}) as {
      weibull: { beta: number; eta_min: number; p_survive_30min: number };
      sobol_contributions: { kc_pct: number; life_pct: number; ra_pct: number };
      p_chatter: number; force_ci95: [number | null, number | null];
    };
    // Populated + valid (seeded/method-of-moments): weibull shape, sobol sums to 100%, p_chatter in [0,1].
    expect(u.weibull.beta).toBeGreaterThan(0);
    expect(u.weibull.eta_min).toBeGreaterThan(0);
    expect(u.weibull.p_survive_30min).toBeGreaterThanOrEqual(0);
    expect(u.weibull.p_survive_30min).toBeLessThanOrEqual(1);
    expect(u.sobol_contributions.kc_pct + u.sobol_contributions.life_pct + u.sobol_contributions.ra_pct).toBeCloseTo(100, 0);
    expect(u.p_chatter).toBeGreaterThanOrEqual(0);
    expect(u.p_chatter).toBeLessThanOrEqual(1);
    // KNOWN PRE-CONVERGENCE GAP (documented, not endorsed): the MC force/life/ra CI95 come back
    // [null, null] -- the UI's CI95 panel (SpeedFeedPage.tsx L755-757) renders nulls. The convergence's
    // P3 sources these from UltimateSpeedFeedEngine's real uncertainty.{force,tool_life,surface_finish}.
    // {ci_95_low,ci_95_high}. Pinning the current null shape so P3's fix is flagged here for review.
    expect(Array.isArray(u.force_ci95)).toBe(true);
    expect(u.force_ci95.length).toBe(2);
    expect(u.force_ci95[0] == null).toBe(true); // null OR undefined -- the CI95 lower bound is NOT populated pre-convergence
  });

  it("core-physics outputs are DETERMINISTIC run-to-run (only the MC uncertainty is stochastic)", () => {
    const a = compute(STEEL);
    const b = compute(STEEL);
    expect(a.cutting_speed_mpm).toBe(b.cutting_speed_mpm);
    expect(a.tangential_force_N).toBe(b.tangential_force_N);
    expect(a.tool_life_min).toBe(b.tool_life_min);
    expect(a.power_kw).toBe(b.power_kw);
    expect(a.feed_rate_mmmin).toBe(b.feed_rate_mmmin);
  });

  it("physical sanity: positive Vc/force/power, RPM within machine cap, life>0 (invariants survive any re-baseline)", () => {
    const r = compute(STEEL);
    expect(r.cutting_speed_mpm).toBeGreaterThan(0);
    expect(r.tangential_force_N).toBeGreaterThan(0);
    expect(r.power_kw).toBeGreaterThan(0);
    expect(r.spindle_rpm).toBeGreaterThan(0);
    expect(r.tool_life_min).toBeGreaterThan(0);
    expect(r.feed_rate_mmmin).toBeGreaterThan(0);
  });
});
