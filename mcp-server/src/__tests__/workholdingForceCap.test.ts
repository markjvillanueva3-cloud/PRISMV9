/**
 * OSCAR-SFC-9AXIS-MS0/U-OSC-WORKHOLDING-FORCE-CAP -- workholding-adequacy derate.
 *
 * Makes the previously-INERT `workholding` axis move the recommendation: an inadequate
 * hold (vacuum/magnetic/light) derates feed/fz/MRR for part-retention safety, while a
 * form-closure-capable hold (vise/chuck/tombstone) is NOT regressed on routine cuts.
 *
 * Physics (physics-reviewed 2026-06-09): the in-plane drive force F_drive =
 * hypot(tangential, radial) must be resisted by C_eff = clamp x mu x form-closure-credit,
 * derated by ASME B11.8 SF. axial (vertical) is reacted by part seating -> excluded.
 * If retention ratio R = F_drive*SF / C_eff > 1, reduce fz by R^(-1/(1-mc)).
 *
 * R15: round-trips THROUGH speedFeedNineAxisOrchestratorEngine.run(), not the singleton.
 */
import { describe, it, expect } from "vitest";
import { speedFeedNineAxisOrchestratorEngine } from "../engines/SpeedFeedNineAxisOrchestratorEngine.js";

// Heavy steel roughing cut -- high in-plane force so weak holds are exercised.
function heavyCut(overrides: { workholding?: Record<string, unknown> }): {
  vc: number; rpm: number; feed: number; fz: number; mrr: number; warnings: string[];
} {
  const input: any = {
    material: { name: "AISI 4140 Alloy Steel", iso_group: "P" },
    tooling: { tool_diameter_mm: 20, flutes: 4, tool_material: "carbide", tool_cost_usd: 60 },
    toolpath: { operation: "milling", cut_type: "roughing", strategy: "conventional", axial_depth_mm: 12, radial_depth_mm: 16 },
    coolant: { type: "flood" },
    machine: { rigidity: "medium", max_rpm: 10000 },
    optimize_for: "balanced",
    ...(overrides.workholding ? { workholding: overrides.workholding } : {}),
  };
  const out = speedFeedNineAxisOrchestratorEngine.run(input);
  const r = out.recommendation;
  return {
    vc: r.cutting_speed_mpm, rpm: r.spindle_rpm, feed: r.feed_rate_mmmin,
    fz: r.feed_per_tooth_mm, mrr: r.mrr_cm3min, warnings: out.warnings ?? [],
  };
}

describe("workholding-adequacy derate (U-OSC-WORKHOLDING-FORCE-CAP)", () => {
  // ---- REGRESSION GUARD: form-closure holds must NOT derate routine cuts ----
  it("REGRESSION GUARD: default kurt_vise on a normal steel roughing cut does NOT derate", () => {
    // C_eff(kurt) = 35000 x 0.25 x 3.0 = 26250N ; required ~ F_drive x 3.0 << C_eff -> R<1.
    const kurt = heavyCut({ workholding: { type: "kurt_vise" } });
    // A clearly-over-spec hold (huge custom fixture) is the un-derated reference.
    const ref = heavyCut({ workholding: { type: "custom_fixture", clamp_force_available_kn: 500 } });
    expect(kurt.feed).toBeCloseTo(ref.feed, 0);   // kurt not derated -> matches over-spec ref
    expect(kurt.mrr).toBeCloseTo(ref.mrr, 1);
    expect(kurt.warnings.some(w => /retention|workholding-adequacy/i.test(w))).toBe(false);
  });

  it("chuck_4jaw and tombstone (high clamp + form closure) also do NOT derate the cut", () => {
    const ref = heavyCut({ workholding: { type: "custom_fixture", clamp_force_available_kn: 500 } });
    expect(heavyCut({ workholding: { type: "chuck_4jaw" } }).feed).toBeCloseTo(ref.feed, 0);
    expect(heavyCut({ workholding: { type: "tombstone" } }).feed).toBeCloseTo(ref.feed, 0);
  });

  // ---- POSITIVE DERATE: surface-preload holds (no form closure) are flagged ----
  it("vacuum (8kN, no form closure) HARD-derates feed/MRR on a heavy steel cut", () => {
    const ref = heavyCut({ workholding: { type: "custom_fixture", clamp_force_available_kn: 500 } });
    const vac = heavyCut({ workholding: { type: "vacuum" } });
    expect(vac.feed).toBeLessThan(ref.feed * 0.5);   // C_eff=1200N vs ~10kN required -> big derate
    expect(vac.mrr).toBeLessThan(ref.mrr);
    expect(vac.warnings.some(w => /retention|infeasible|workholding/i.test(w))).toBe(true);
  });

  it("magnetic derates LESS than vacuum (higher mu*clamp), more than vise", () => {
    const vac = heavyCut({ workholding: { type: "vacuum" } }).feed;     // C_eff=8000*0.15*1=1200
    const mag = heavyCut({ workholding: { type: "magnetic" } }).feed;   // C_eff=15000*0.40*1=6000
    const vise = heavyCut({ workholding: { type: "kurt_vise" } }).feed; // C_eff=26250 (no derate)
    expect(vac).toBeLessThan(mag);
    expect(mag).toBeLessThan(vise);
  });

  // ---- the derate touches chip-load ONLY, never speed ----
  it("derate reduces feed/fz/MRR but leaves cutting speed + RPM unchanged", () => {
    const vise = heavyCut({ workholding: { type: "kurt_vise" } });
    const vac = heavyCut({ workholding: { type: "vacuum" } });
    expect(vac.vc).toBeCloseTo(vise.vc, 1);    // speed untouched by workholding
    expect(vac.rpm).toBeCloseTo(vise.rpm, 0);  // rpm untouched
    expect(vac.fz).toBeLessThan(vise.fz);      // chip load reduced
  });

  // ---- SAFETY-FACTOR wiring: roughing (SF 3.0) derates more than finishing (SF 2.0) ----
  it("roughing cut-type derates a marginal hold more than finishing (ASME B11.8 SF)", () => {
    const mk = (cut: string) => {
      const input: any = {
        material: { name: "AISI 4140 Alloy Steel", iso_group: "P" },
        tooling: { tool_diameter_mm: 20, flutes: 4, tool_material: "carbide" },
        toolpath: { operation: "milling", cut_type: cut, strategy: "conventional", axial_depth_mm: 12, radial_depth_mm: 16 },
        machine: { rigidity: "medium", max_rpm: 10000 },
        workholding: { type: "magnetic" },  // marginal hold so SF moves the boundary
        optimize_for: "balanced",
      };
      return speedFeedNineAxisOrchestratorEngine.run(input).recommendation.feed_per_tooth_mm;
    };
    // Higher SF (roughing 3.0) => larger required => more derate => smaller fz than finishing (2.0).
    expect(mk("roughing")).toBeLessThanOrEqual(mk("finishing"));
  });

  // ---- FAIL LOUD: a hold too weak for any sane chip load ----
  it("FAIL LOUD: a near-zero clamp force flags the cut part-retention-infeasible", () => {
    const r = heavyCut({ workholding: { type: "vacuum", clamp_force_available_kn: 0.3 } });
    expect(r.warnings.some(w => /infeasible/i.test(w))).toBe(true);
  });

  // ---- ADVERSARIAL: malformed inputs must not crash or spuriously derate ----
  it("ADVERSARIAL: NaN clamp force -> guard skips the derate, no crash, no spurious change", () => {
    const ref = heavyCut({ workholding: { type: "kurt_vise" } });
    const nan = heavyCut({ workholding: { type: "kurt_vise", clamp_force_available_kn: NaN } });
    // NaN clamp -> Number.isFinite(whClampN) false -> falls back to default-type clamp path is
    // bypassed (explicit NaN passed), guard skips -> recommendation unchanged vs the same vise.
    expect(Number.isFinite(nan.feed)).toBe(true);
    expect(nan.feed).toBeCloseTo(ref.feed, 0);
  });

  it("ADVERSARIAL: zero clamp force -> guard (whClampN>0) skips, no divide-by-zero", () => {
    const r = heavyCut({ workholding: { type: "vacuum", clamp_force_available_kn: 0 } });
    expect(Number.isFinite(r.feed)).toBe(true);
    expect(r.feed).toBeGreaterThan(0);
  });

  // ---- FORM CLOSURE is the differentiator (same clamp, different credit) ----
  it("form-closure credit: same clamp force, vise (3.0) holds where vacuum (1.0) does not", () => {
    // Force both to the SAME 10kN clamp; only the form-closure factor differs.
    const vise = heavyCut({ workholding: { type: "kurt_vise", clamp_force_available_kn: 10 } }).feed;
    const vac = heavyCut({ workholding: { type: "vacuum", clamp_force_available_kn: 10 } }).feed;
    expect(vac).toBeLessThan(vise);  // identical clamp; 1.0 vs 3.0 closure -> vacuum derates more
  });
});
