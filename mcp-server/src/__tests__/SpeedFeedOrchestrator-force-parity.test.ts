/**
 * Force/power parity tests for SpeedFeedOrchestratorEngine.compute()
 * (U-OSC-ORCH-FORCE-PARITY).
 *
 * The orchestrator's inline Kienzle (`kc1_1*ap*fz^(1-mc)`) over-stated cutting force/power ~3x for
 * low-radial-engagement milling: it used the chip-thinning-INFLATED fz directly as the chip
 * thickness and omitted BOTH the Martellotti mean-chip-thickness reduction AND the engaged-teeth
 * (z_e) duty factor. Live on :3100 a 4140 cut at ae/D=15% reported 2724N / 6.81kW -> specific
 * cutting energy 17.7 J/mm3, ~4-5x the physical ~4 J/mm3 for P-steel (safety-physics root-cause
 * 2026-06-25). The fix routes force/power through the shared `calculateKienzleCuttingForce` core
 * (Martellotti + z_e), the same core that backs ProductEngine.sfcCalculate / the /speed-feed-calc page.
 *
 * The load-bearing invariant is SPECIFIC CUTTING ENERGY u = Power[W] / MRR[mm3/s] = power_kw*60/mrr
 * [J/mm3], a material property (~3-4 J/mm3 for steel, ~0.7-1.5 for aluminum). It is the cleanest
 * physical check because it is nearly independent of the operating point -- a force model that is
 * ~3x too high yields ~3x too-high u. These tests FAIL on the pre-fix inline formula (u ~ 17.7).
 */
import { describe, it, expect } from "vitest";
import { speedFeedOrchestratorEngine } from "../engines/SpeedFeedOrchestratorEngine.js";

// Conservative geometry so deflection is not the binding constraint (which would force-reduce fz and
// muddy the specific-energy read). Strategy "conventional" avoids adaptive Vc boosting.
const baseCut = {
  material: "4140 prehard",
  iso_group: "P",
  hardness_hb: 300,
  machine_name: "Haas VF-2",
  machine_power_kw: 22.4,
  machine_max_rpm: 8100,
  machine_max_torque_nm: 122,
  tool_diameter_mm: 12,
  flutes: 4,
  tool_material: "carbide",
  tool_coating: "none",
  corner_radius_mm: 0.5,
  tool_stickout_mm: 20,
  operation: "milling",
  cut_type: "roughing",
  strategy: "conventional",
  axial_depth_mm: 6,
  coolant_type: "flood",
  optimize_for: "balanced",
  feature_tolerance_mm: 0.05,
} as const;

const run = (over: Record<string, unknown>) =>
  speedFeedOrchestratorEngine.compute({ ...baseCut, ...over } as never).value;

/** Specific cutting energy u [J/mm3] = power_kw * 60 / MRR_cm3min. */
const specificEnergy = (v: { power_kw: number; mrr_cm3min: number }) =>
  (v.power_kw * 60) / Math.max(v.mrr_cm3min, 1e-9);

describe("SpeedFeedOrchestratorEngine force/power -- physical specific cutting energy", () => {
  it("LOW-radial (ae/D=15%) 4140: specific energy is physical ~3-5 J/mm3, NOT the ~17.7 of the bug", () => {
    const v = run({ radial_depth_mm: 1.8, radial_depth_pct: 15 });
    const u = specificEnergy(v);
    // P-steel physical specific cutting energy is ~3-4 J/mm3; allow [2.0, 7.0] for model/coating
    // spread. The pre-fix inline formula yielded ~17.7 -> this assertion fails on a revert.
    expect(u).toBeGreaterThan(2.0);
    expect(u).toBeLessThan(7.0);
  });

  it("FULL-slot (ae/D=100%) 4140: specific energy stays physical (Martellotti+z_e at full engagement)", () => {
    const v = run({ radial_depth_mm: 12, radial_depth_pct: 100 });
    const u = specificEnergy(v);
    expect(u).toBeGreaterThan(2.0);
    expect(u).toBeLessThan(7.0);
  });

  it("REGRESSION magnitude: 15%-radial 4140 tangential force is far below the ~2724N of the bug", () => {
    const v = run({ radial_depth_mm: 1.8, radial_depth_pct: 15 });
    // Corrected force is ~600N (safety-physics reconstruction); the bug published ~2724N. Anything
    // under 1300N proves the ~3x over-statement is gone (and >100N proves it is not zeroed out).
    expect(v.tangential_force_N).toBeLessThan(1300);
    expect(v.tangential_force_N).toBeGreaterThan(100);
  });

  it("aluminum (N) specific energy is BELOW steel (P) -- lower kc, ordering preserved", () => {
    const al = run({ material: "6061-T6 aluminum", iso_group: "N", hardness_hb: 95, radial_depth_mm: 1.8, radial_depth_pct: 15 });
    const st = run({ radial_depth_mm: 1.8, radial_depth_pct: 15 });
    expect(specificEnergy(al)).toBeLessThan(specificEnergy(st));
    // Aluminum is also physical (~0.5-1.8 J/mm3).
    expect(specificEnergy(al)).toBeGreaterThan(0.2);
    expect(specificEnergy(al)).toBeLessThan(3.0);
  });

  it("force scales monotonically with axial depth (deeper cut -> proportionally more force)", () => {
    const shallow = run({ radial_depth_mm: 1.8, radial_depth_pct: 15, axial_depth_mm: 3 });
    const deep = run({ radial_depth_mm: 1.8, radial_depth_pct: 15, axial_depth_mm: 9 });
    expect(deep.tangential_force_N).toBeGreaterThan(shallow.tangential_force_N);
    // ap trebles 3->9; force is ~linear in ap (Fc = kc*ap*h_mean*z_e), so ~2-4x.
    const ratio = deep.tangential_force_N / shallow.tangential_force_N;
    expect(ratio).toBeGreaterThan(2.0);
    expect(ratio).toBeLessThan(4.0);
  });

  it("higher radial engagement raises force AND specific energy stays physical (no 3x blow-up)", () => {
    const lo = run({ radial_depth_mm: 1.8, radial_depth_pct: 15 });
    const hi = run({ radial_depth_mm: 6, radial_depth_pct: 50 });
    // More radial engagement -> larger mean chip + more engaged teeth -> more force.
    expect(hi.tangential_force_N).toBeGreaterThan(lo.tangential_force_N);
    // But specific energy must remain physical at BOTH engagements (the bug blew up at low ae).
    expect(specificEnergy(lo)).toBeLessThan(7.0);
    expect(specificEnergy(hi)).toBeLessThan(7.0);
  });
});
