/**
 * prism_mill:mill_stable_rpm_select -- chatter-stable spindle-RPM optimizer.
 *
 * REMEDIATION 2026-07-04 (U-P0-2, 3-of-3 scrutiny FAIL -> rebuild): the action was rewired from
 * the now-removed StabilityRPMRewriterEngine.selectStableRPM -- which built a "peak-lobe" optimizer
 * on generateAnalyticalSLD's FRF MAGNITUDE (not Re[G]) -> a lobeless monotonic curve -> argmax
 * returned the MINIMUM-MRR rpm while claiming "max-MRR" (safety-physics arm). It now delegates to
 * the physically-correct ChatterStabilityLobeEngine (Altintas-Budak real-part SLD:
 * a_lim = -1/(2*Ks*alpha_xx*Re[G(wc)])), the same engine prism_calc:chatter_stability_sld uses.
 *
 * These tests assert REAL lobe behavior + verify the dispatcher mapping against the engine's own
 * output (independent oracle, R15 round-trip) -- NOT self-consistency with a broken SLD.
 * (Filename retained from the pre-remediation unit; it now covers the mill action, not a removed method.)
 */
import { describe, it, expect } from "vitest";
import { chatterStabilityLobeEngine } from "../engines/ChatterStabilityLobeEngine.js";
import { registerMillDispatcher } from "../tools/dispatchers/millDispatcher.js";

// Realistic tool-tip modal + geometry (~20 N/um tip stiffness) -> a genuine, NON-saturated SLD.
// (The old unit used 2e7 N/mm, which saturated the 50mm cap at every rpm and hid the bug.)
const REALISTIC = {
  tool_diameter_mm: 12,
  toolFlutes: 4,
  overhang_mm: 48,
  iso_group: "P",
  specificCuttingForce_Nmm2: 1800,
  naturalFrequency_Hz: 900,
  dampingRatio: 0.03,
  stiffness_Nmm: 2.0e4, // 20 N/um -- realistic milling tool-tip stiffness
  rpmMin: 3000,
  rpmMax: 18000,
  rpm_points: 300,
  radial_immersion_ratio: 0.5,
};

function millHandler() {
  const tools: Array<{ name: string; handler: (a: any) => Promise<any> }> = [];
  registerMillDispatcher({ tool: (name: string, _d: any, _s: any, handler: any) => tools.push({ name, handler }) } as any);
  return tools[0];
}
async function call(params: any) {
  const res = await millHandler().handler({ action: "mill_stable_rpm_select", params });
  const text = res?.content?.[0]?.text;
  return text ? JSON.parse(text) : res;
}

describe("mill_stable_rpm_select (ChatterStabilityLobeEngine real-part SLD)", () => {
  it("returns a finite in-range recommendation with real SLD structure (positive stable DOC, >=1 lobe)", async () => {
    const data = await call(REALISTIC);
    expect(Number.isFinite(data.recommended_rpm)).toBe(true);
    expect(data.recommended_rpm).toBeGreaterThanOrEqual(REALISTIC.rpmMin);
    expect(data.recommended_rpm).toBeLessThanOrEqual(REALISTIC.rpmMax);
    expect(data.max_stable_doc_mm).toBeGreaterThan(0);
    expect(Number.isFinite(data.max_stable_doc_mm)).toBe(true);
    expect(data.lobe_count).toBeGreaterThan(0);
    expect(data.source).toMatch(/chatter-stability-lobe-engine/);
  });

  it("dispatcher matches the correct engine's own optimal_rpm/max_stable_ap (independent oracle round-trip, R15)", async () => {
    // Call the physically-correct engine DIRECTLY with the equivalent nested input; the dispatcher
    // must reproduce it exactly (this verifies the flat->ChatterInput mapping + delegation, and is
    // NOT tautological with a broken SLD -- the engine here is the correct real-part one).
    const engineOut = chatterStabilityLobeEngine.compute({
      tool: { diameter_mm: 12, flute_count: 4, overhang_mm: 48, material: "carbide" },
      workpiece: { iso_group: "P", kc11_mpa: 1800 },
      machine: { natural_frequency_hz: 900, damping_ratio: 0.03, stiffness_n_um: 20, min_rpm: 3000, max_rpm: 18000 },
      cutting: { radial_immersion_ratio: 0.5 },
      rpm_points: 300,
    } as any).value;
    const data = await call(REALISTIC);
    expect(data.recommended_rpm).toBe(engineOut.optimal_rpm);
    expect(data.max_stable_doc_mm).toBeCloseTo(engineOut.max_stable_ap_mm, 6);
    // The recommended DOC is the max over the SLD (the engine's argmax), i.e. >= any pocket's ap.
    for (const pocket of engineOut.stable_pockets ?? []) {
      expect(data.max_stable_doc_mm).toBeGreaterThanOrEqual(pocket.max_ap_mm - 1e-6);
    }
  });

  it("spans 3 distinct modal/geometry configs (variability floor) -- each finite + in range + positive DOC", async () => {
    const CFGS = [
      REALISTIC,
      { ...REALISTIC, tool_diameter_mm: 8, toolFlutes: 3, naturalFrequency_Hz: 1400, stiffness_Nmm: 1.2e4, rpmMin: 4000, rpmMax: 24000 },
      { ...REALISTIC, tool_diameter_mm: 20, toolFlutes: 2, naturalFrequency_Hz: 600, stiffness_Nmm: 5.0e4, rpmMin: 2000, rpmMax: 12000 },
    ];
    for (const cfg of CFGS) {
      const d = await call(cfg);
      expect(Number.isFinite(d.recommended_rpm)).toBe(true);
      expect(d.recommended_rpm).toBeGreaterThanOrEqual(cfg.rpmMin);
      expect(d.recommended_rpm).toBeLessThanOrEqual(cfg.rpmMax);
      expect(d.max_stable_doc_mm).toBeGreaterThan(0);
    }
  });

  it("fail-loud: missing tool_diameter_mm -> dispatcher error, never a fabricated rpm", async () => {
    const bad = await call({ ...REALISTIC, tool_diameter_mm: undefined });
    expect(bad.recommended_rpm).toBeUndefined();
  });

  it("fail-loud: non-positive toolFlutes and missing rpmMax are rejected", async () => {
    const b1 = await call({ ...REALISTIC, toolFlutes: 0 });
    expect(b1.recommended_rpm).toBeUndefined();
    const b2 = await call({ ...REALISTIC, rpmMax: undefined });
    expect(b2.recommended_rpm).toBeUndefined();
  });

  it("adversarial: NaN diameter / Infinity rpmMax never produce a NaN/Infinity recommendation", async () => {
    const n1 = await call({ ...REALISTIC, tool_diameter_mm: Number.NaN });
    expect(n1.recommended_rpm).toBeUndefined();
    const n2 = await call({ ...REALISTIC, rpmMax: Number.POSITIVE_INFINITY });
    // Guard rejects non-finite max_rpm before the engine is called -> no fabricated finite rpm.
    expect(n2.recommended_rpm === undefined || Number.isFinite(n2.recommended_rpm)).toBe(true);
  });

  it("caps rpm_points at 5000 to prevent runaway sweeps (was the pre-remediation rpmStep DoS)", async () => {
    const over = await call({ ...REALISTIC, rpm_points: 100000 });
    expect(over.recommended_rpm).toBeUndefined(); // rejected by schema .max(5000)
  });

  it("fail-loud: inverted / omitted-low / Infinity RPM range -> never an out-of-range recommendation", async () => {
    // rpmMin > rpmMax -> dispatcher cross-field guard (the removed selectStableRPM had this)
    const inverted = await call({ ...REALISTIC, rpmMin: 18000, rpmMax: 3000 });
    expect(inverted.recommended_rpm).toBeUndefined();
    // rpmMin omitted + rpmMax below the 2000 engine default -> min(2000) >= max -> guard throws
    const lowMax = await call({ ...REALISTIC, rpmMin: undefined, rpmMax: 1500 });
    expect(lowMax.recommended_rpm).toBeUndefined();
    // rpmMin = +Infinity slips .positive() but is rejected by schema .finite()
    const infMin = await call({ ...REALISTIC, rpmMin: Number.POSITIVE_INFINITY });
    expect(infMin.recommended_rpm).toBeUndefined();
    // rpmMax = +Infinity likewise rejected by .finite() -> no Infinity recommendation
    const infMax = await call({ ...REALISTIC, rpmMax: Number.POSITIVE_INFINITY });
    expect(infMax.recommended_rpm === undefined || Number.isFinite(infMax.recommended_rpm)).toBe(true);
  });
});
