/**
 * EDMSurfaceIntegrityEngine.isolated.test.ts — ISOLATED UNIT (WEDM-DEPTH)
 *
 * WHY THIS FILE EXISTS (india audit gap):
 *   EDMSurfaceIntegrityEngine is exercised only through pipeline/E2E paths
 *   (`src/__tests__/l2-pass2-specialty-engines.test.ts:505` — a single
 *   `toBeGreaterThan(0)` / `typeof boolean` smoke case). There is NO isolated
 *   unit that pins the discharge-physics reference values (recast depth, HAZ,
 *   residual stress, fatigue reduction) nor a round-trip through edmDispatcher.
 *   This file adds one: happy + failure + adversarial, with reference values
 *   HAND-DERIVED from the engine's own documented formulas (below), plus a
 *   dispatcher round-trip via the `surface_integrity` action.
 *
 * REFERENCE-VALUE DERIVATION (from EDMSurfaceIntegrityEngine.assess, verified
 * against EDMSurfaceIntegrityEngine.ts:72-191):
 *   energyFactor  = sqrt(discharge_energy_mJ)
 *   baseRecast    = energyFactor * 3 * typeFactor        // typeFactor: sinker 1.0, wire 0.6, hole_drill 1.2, micro 0.2
 *   skimReduction = 0.6 ^ num_skim_passes
 *   finalRecast   = baseRecast * skimReduction            // rounded to 0.1 µm
 *   haz           = finalRecast * 4                        // rounded to 0.1 µm
 *   residual_MPa  = min(800, 200 + energy_mJ*10)          // TENSILE, rounded to int, saturates 800
 *   Ra_um         = 0.5 + energyFactor*0.8*skimReduction  // rounded to 0.1
 *   fatigue_pct   = min(70, finalRecast*1.2 + residual*0.02)  // rounded to 0.1, saturates 70
 *   microcrack    = >20 extensive | >10 moderate | >3 isolated | else none
 *   meets_spec    = finalRecast <= spec.max_recast_um && haz <= spec.max_haz_um
 *     SPEC_LIMITS: aerospace{recast 0,haz 25,removal} medical{5,50} automotive{15,100} tooling{25,200} general{50,500}
 *
 * NOTE ON CONSTANTS: this engine is a self-contained discharge-heuristic model —
 * it does NOT consume CANONICAL_KIENZLE (a metal-cutting force constant, irrelevant
 * to spark erosion) nor the EDM_PHYSICS block; its coefficients are inline in the
 * engine. So no physics constant is inlined in THIS test — reference values are
 * derived from the engine formulas above. EDM_PHYSICS is imported for an
 * independent canonical-source cross-check (discharge voltage) only.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { edmSurfaceIntegrityEngine, type EDMSurfaceInput } from "../engines/EDMSurfaceIntegrityEngine.js";
import { EDM_PHYSICS } from "../physics/constants.js";

// ---------------------------------------------------------------------------
// Dispatcher round-trip harness (FakeServer captures the registered handler)
// ---------------------------------------------------------------------------
let invoke: (action: string, params?: any) => Promise<any>;

class FakeServer {
  private handler: ((args: { action: string; params: any }) => Promise<any>) | null = null;
  tool(_name: string, _desc: string, _schema: any, handler: any) { this.handler = handler; }
  async call(action: string, params: any = {}) {
    if (!this.handler) throw new Error("dispatcher not registered");
    return this.handler({ action, params });
  }
}

beforeAll(async () => {
  const { registerEdmDispatcher } = await import("../tools/dispatchers/edmDispatcher.js");
  const srv = new FakeServer();
  registerEdmDispatcher(srv as any);
  invoke = async (action, params) => {
    const resp = await srv.call(action, params ?? {});
    if (resp?.content?.[0]?.text) {
      try { return JSON.parse(resp.content[0].text); } catch { return resp.content[0].text; }
    }
    return resp;
  };
});

// A base input for the tooling reference case (Case A).
function caseA(): EDMSurfaceInput {
  return {
    edm_type: "wire",
    discharge_energy_mJ: 16,       // sqrt = 4 (clean)
    num_skim_passes: 1,
    workpiece_material: "D2_tool",
    workpiece_hardness_HRC: 58,
    is_fatigue_critical: false,
    application: "tooling",
  };
}

describe("EDMSurfaceIntegrityEngine — isolated reference-value units", () => {
  // =========================================================================
  // HAPPY / REFERENCE-VALUE CASES
  // =========================================================================

  it("Case A (wire, 16 mJ, 1 skim, tooling): recast 4.3µm / HAZ 17.3µm / residual 360 MPa tensile", () => {
    // energyFactor=4; base=4*3*0.6=7.2; skim=0.6^1=0.6; final=4.32→4.3; haz=17.28→17.3
    // residual=min(800,200+160)=360; Ra=0.5+4*0.8*0.6=2.42→2.4; fatigue=min(70,4.32*1.2+360*0.02)=12.384→12.4
    const r = edmSurfaceIntegrityEngine.assess(caseA());
    expect(r.recast_layer_depth_um).toBeCloseTo(4.3, 5);
    expect(r.heat_affected_zone_depth_um).toBeCloseTo(17.3, 5);
    expect(r.residual_stress_type).toBe("tensile");
    expect(r.residual_stress_MPa).toBe(360);
    expect(r.surface_roughness_Ra_um).toBeCloseTo(2.4, 5);
    expect(r.fatigue_life_reduction_pct).toBeCloseTo(12.4, 5);
    expect(r.microcrack_density).toBe("isolated"); // 4.32 > 3
    expect(r.meets_specification).toBe(true);       // 4.32<=25 && 17.28<=200
    expect(r.spec_max_recast_um).toBe(25);          // tooling limit
    // fatigue not critical + tooling doesn't require removal → no mandatory post-process
    expect(r.post_process_required.some(p => p.includes("No mandatory post-processing"))).toBe(true);
  });

  it("Case B (sinker, 25 mJ, 0 skim, general): recast 15.0µm / HAZ 60.0µm / moderate cracks", () => {
    // energyFactor=5; base=5*3*1.0=15; skim=0.6^0=1; final=15; haz=60
    // residual=min(800,200+250)=450; Ra=0.5+5*0.8=4.5; fatigue=min(70,15*1.2+450*0.02)=27
    const r = edmSurfaceIntegrityEngine.assess({
      edm_type: "sinker",
      discharge_energy_mJ: 25,
      num_skim_passes: 0,
      workpiece_material: "steel_1045",
      workpiece_hardness_HRC: 30,
      is_fatigue_critical: false,
      application: "general",
    });
    expect(r.recast_layer_depth_um).toBeCloseTo(15.0, 5);
    expect(r.heat_affected_zone_depth_um).toBeCloseTo(60.0, 5);
    expect(r.residual_stress_MPa).toBe(450);
    expect(r.surface_roughness_Ra_um).toBeCloseTo(4.5, 5);
    expect(r.fatigue_life_reduction_pct).toBeCloseTo(27.0, 5);
    expect(r.microcrack_density).toBe("moderate");  // 15 > 10
    expect(r.meets_specification).toBe(true);        // 15<=50 && 60<=500
    expect(r.spec_max_recast_um).toBe(50);           // general limit
  });

  it("Case C (aerospace, 9 mJ, 2 skim): FAILS spec (max_recast 0µm) with mandatory recast removal + AMS 2628", () => {
    // energyFactor=3; base=3*3*0.6=5.4; skim=0.6^2=0.36; final=1.944→1.9; haz=7.776→7.8
    // residual=min(800,200+90)=290; Ra=0.5+3*0.8*0.36=1.364→1.4; fatigue=min(70,1.944*1.2+290*0.02)=8.1328→8.1
    const r = edmSurfaceIntegrityEngine.assess({
      edm_type: "wire",
      discharge_energy_mJ: 9,
      num_skim_passes: 2,
      workpiece_material: "inconel_718",
      workpiece_hardness_HRC: 42,
      is_fatigue_critical: true,
      application: "aerospace",
    });
    expect(r.recast_layer_depth_um).toBeCloseTo(1.9, 5);
    expect(r.heat_affected_zone_depth_um).toBeCloseTo(7.8, 5);
    expect(r.residual_stress_MPa).toBe(290);
    expect(r.surface_roughness_Ra_um).toBeCloseTo(1.4, 5);
    expect(r.fatigue_life_reduction_pct).toBeCloseTo(8.1, 5);
    expect(r.microcrack_density).toBe("none");       // 1.944 < 3
    expect(r.meets_specification).toBe(false);       // aerospace max_recast=0, any recast fails
    expect(r.spec_max_recast_um).toBe(0);
    expect(r.post_process_required.some(p => p.includes("Remove recast layer"))).toBe(true);
    expect(r.post_process_required.some(p => p.includes("AMS 2628"))).toBe(true);
  });

  it("validate(): aerospace Case C is UNSAFE and the message is fail-loud", () => {
    const v = edmSurfaceIntegrityEngine.validate({
      edm_type: "wire", discharge_energy_mJ: 9, num_skim_passes: 2,
      workpiece_material: "inconel_718", workpiece_hardness_HRC: 42,
      is_fatigue_critical: true, application: "aerospace",
    });
    expect(v.safe).toBe(false);
    expect(v.message).toContain("FAIL");
  });

  // =========================================================================
  // ALGEBRAIC INVARIANT
  // =========================================================================

  it("invariant: each additional skim pass strictly reduces recast (0.6^n monotone decreasing)", () => {
    const base: EDMSurfaceInput = { ...caseA(), num_skim_passes: 0 };
    const s0 = edmSurfaceIntegrityEngine.assess({ ...base, num_skim_passes: 0 }).recast_layer_depth_um;
    const s1 = edmSurfaceIntegrityEngine.assess({ ...base, num_skim_passes: 1 }).recast_layer_depth_um;
    const s3 = edmSurfaceIntegrityEngine.assess({ ...base, num_skim_passes: 3 }).recast_layer_depth_um;
    expect(s1).toBeLessThan(s0);
    expect(s3).toBeLessThan(s1);
    // 0 skim: base=12*0.6=7.2 (wire) → 7.2µm exactly; 1 skim = 7.2*0.6=4.32→4.3
    expect(s0).toBeCloseTo(7.2, 5);
  });

  // =========================================================================
  // CANONICAL-SOURCE CROSS-CHECK (uses ../physics/constants.js EDM_PHYSICS)
  // =========================================================================

  it("canonical cross-check: EDM_PHYSICS discharge voltages are internally consistent; residual stress is tensile & bounded by discharge energy", () => {
    // Canonical-source integrity: both EDM discharge-voltage anchors agree (25 V).
    expect(EDM_PHYSICS.spark_erosion.typical_arc_voltage_V)
      .toBe(EDM_PHYSICS.gap_voltage.arc_voltage_V);
    expect(EDM_PHYSICS.gap_voltage.arc_voltage_V).toBeGreaterThan(0);
    // Discharge-physics consistency: higher discharge energy → higher tensile residual
    // stress until the 800 MPa recast-solidification ceiling (monotone non-decreasing).
    const lo = edmSurfaceIntegrityEngine.assess({ ...caseA(), discharge_energy_mJ: 4 });
    const hi = edmSurfaceIntegrityEngine.assess({ ...caseA(), discharge_energy_mJ: 36 });
    expect(hi.residual_stress_MPa).toBeGreaterThan(lo.residual_stress_MPa);
    expect(lo.residual_stress_type).toBe("tensile");
    expect(hi.residual_stress_MPa).toBeLessThanOrEqual(800);
  });

  // =========================================================================
  // FAILURE MODES (zero / NaN / negative / unknown-enum)
  // =========================================================================

  it("failure: zero discharge energy → all-zero recast/HAZ, residual floor 200 MPa, no NaN", () => {
    // energyFactor=0 → recast 0, haz 0, Ra=0.5, residual=min(800,200)=200, fatigue=min(70,4)=4
    const r = edmSurfaceIntegrityEngine.assess({ ...caseA(), discharge_energy_mJ: 0 });
    expect(r.recast_layer_depth_um).toBe(0);
    expect(r.heat_affected_zone_depth_um).toBe(0);
    expect(r.microcrack_density).toBe("none");
    expect(r.residual_stress_MPa).toBe(200);
    expect(r.surface_roughness_Ra_um).toBeCloseTo(0.5, 5);
    expect(r.fatigue_life_reduction_pct).toBeCloseTo(4.0, 5);
    expect(r.meets_specification).toBe(true);
    expect(Number.isNaN(r.recast_layer_depth_um)).toBe(false);
  });

  it("failure: NaN discharge energy propagates to NaN (no input guard) but meets_specification stays false", () => {
    const r = edmSurfaceIntegrityEngine.assess({ ...caseA(), discharge_energy_mJ: NaN });
    // BUG: EDMSurfaceIntegrityEngine.assess has NO input validation — sqrt(NaN)=NaN
    // silently propagates to NaN recast/HAZ/Ra/residual. A fail-loud guard (throw or
    // structured error on non-finite discharge energy) is MISSING. Reported to slot:mike;
    // engine source NOT modified (safety-gated). meets_specification correctly stays false
    // (NaN<=limit === false) so a garbage input cannot pass a spec gate — pinned below.
    expect(Number.isNaN(r.recast_layer_depth_um)).toBe(true);
    expect(Number.isNaN(r.residual_stress_MPa)).toBe(true);
    expect(r.meets_specification).toBe(false);
  });

  it("failure: negative discharge energy → sqrt(neg)=NaN (no guard), meets_specification false", () => {
    const r = edmSurfaceIntegrityEngine.assess({ ...caseA(), discharge_energy_mJ: -4 });
    // BUG: negative discharge energy is physically impossible yet accepted; sqrt(-4)=NaN
    // with no rejection. Same missing-guard class as the NaN case above.
    expect(Number.isNaN(r.recast_layer_depth_um)).toBe(true);
    expect(r.meets_specification).toBe(false);
  });

  it("failure: unknown application enum falls back gracefully to the 'general' spec (50µm)", () => {
    const r = edmSurfaceIntegrityEngine.assess({ ...caseA(), application: "unobtanium" as any });
    // SPEC_LIMITS["unobtanium"] is undefined → falls back to SPEC_LIMITS.general.
    expect(r.spec_max_recast_um).toBe(50);
    expect(r.recast_layer_depth_um).toBeCloseTo(4.3, 5); // physics unchanged from Case A
    expect(r.meets_specification).toBe(true);            // 4.32<=50 && 17.28<=500
  });

  // =========================================================================
  // ADVERSARIAL (extreme values / saturation / unknown edm_type)
  // =========================================================================

  it("adversarial: 100 mJ saturates residual stress at the 800 MPa ceiling; fatigue-critical triggers shot-peen post-process", () => {
    // energyFactor=10; base=10*3*0.6=18; skim=1; final=18; residual=min(800,1200)=800
    const r = edmSurfaceIntegrityEngine.assess({
      edm_type: "wire", discharge_energy_mJ: 100, num_skim_passes: 0,
      workpiece_material: "D2_tool", workpiece_hardness_HRC: 60,
      is_fatigue_critical: true, application: "general",
    });
    expect(r.residual_stress_MPa).toBe(800);            // SATURATED
    expect(r.recast_layer_depth_um).toBeCloseTo(18.0, 5);
    expect(r.microcrack_density).toBe("moderate");      // 18 > 10, not > 20
    expect(r.surface_roughness_Ra_um).toBeCloseTo(8.5, 5);
    expect(r.fatigue_life_reduction_pct).toBeCloseTo(37.6, 5); // 18*1.2 + 800*0.02
    expect(r.post_process_required.some(p => p.includes("shot peening"))).toBe(true);
  });

  it("adversarial: 400 mJ saturates fatigue reduction at the 70% ceiling; extensive cracks; fails general spec", () => {
    // energyFactor=20; base=20*3*1.0=60; skim=1; final=60; haz=240
    // residual=800; fatigue=min(70,60*1.2+800*0.02=88)=70 (SATURATED)
    const r = edmSurfaceIntegrityEngine.assess({
      edm_type: "sinker", discharge_energy_mJ: 400, num_skim_passes: 0,
      workpiece_material: "carbide_WC", workpiece_hardness_HRC: 70,
      is_fatigue_critical: true, application: "general",
    });
    expect(r.fatigue_life_reduction_pct).toBe(70);       // SATURATED at 70
    expect(r.recast_layer_depth_um).toBeCloseTo(60.0, 5);
    expect(r.heat_affected_zone_depth_um).toBeCloseTo(240.0, 5);
    expect(r.microcrack_density).toBe("extensive");      // 60 > 20
    expect(r.residual_stress_MPa).toBe(800);
    expect(r.meets_specification).toBe(false);           // 60 > 50 (general)
  });

  it("adversarial: unknown edm_type → typeFactor lookup undefined → NaN recast (no guard)", () => {
    const r = edmSurfaceIntegrityEngine.assess({ ...caseA(), edm_type: "plasma" as any });
    // BUG: typeFactor["plasma"] is undefined → baseRecast *= undefined = NaN. No guard
    // rejects an unknown EDM process type. Pinned; engine source NOT modified.
    expect(Number.isNaN(r.recast_layer_depth_um)).toBe(true);
  });

  // =========================================================================
  // DISPATCHER ROUND-TRIP (edmDispatcher → surface_integrity → engine.assess)
  // =========================================================================

  it("round-trip: prism_edm surface_integrity reproduces Case A reference values", async () => {
    const r = await invoke("surface_integrity", caseA());
    const payload = r?.result ?? r;
    expect(payload.recast_layer_depth_um).toBeCloseTo(4.3, 5);
    expect(payload.heat_affected_zone_depth_um).toBeCloseTo(17.3, 5);
    expect(payload.residual_stress_MPa).toBe(360);
    expect(payload.residual_stress_type).toBe("tensile");
    expect(payload.meets_specification).toBe(true);
    expect(payload.spec_max_recast_um).toBe(25);
  });

  it("round-trip: prism_edm surface_integrity flags an aerospace spec failure (meets=false, limit 0µm)", async () => {
    const r = await invoke("surface_integrity", {
      edm_type: "wire", discharge_energy_mJ: 9, num_skim_passes: 2,
      workpiece_material: "inconel_718", workpiece_hardness_HRC: 42,
      is_fatigue_critical: true, application: "aerospace",
    });
    const payload = r?.result ?? r;
    expect(payload.meets_specification).toBe(false);
    expect(payload.spec_max_recast_um).toBe(0);
    expect(payload.recast_layer_depth_um).toBeCloseTo(1.9, 5);
  });
});
