import { describe, it, expect } from "vitest";
import {
  millChipEvacuationPredictorEngine as eng,
  POCKET_DEPTH_TO_DIA_CRITICAL,
  WEIGHTS,
  type MillChipEvacInput,
} from "../engines/MillChipEvacuationPredictorEngine.js";

function nominal(o: Partial<MillChipEvacInput> = {}): MillChipEvacInput {
  return {
    material_iso_group: "P",
    cutter_diameter_mm: 10,
    pocket_depth_mm: 15,
    strategy: "adaptive_clearing",
    flute_count: 3,
    vc_m_min: 150,
    fz_mm_tooth: 0.05,
    coolant: "flood",
    is_closed_pocket: false,
    ...o,
  };
}

describe("MillChipEvacuationPredictorEngine", () => {
  it("getStats lists model + 6 factors + 4 risk levels + weights", () => {
    const s = eng.getStats();
    expect(s.model).toMatch(/pocket-evac.*ductility.*flute-gullet/);
    expect(s.factors.length).toBe(6);
    expect(s.risk_levels).toEqual(["low", "moderate", "high", "severe"]);
    expect(s.weights).toEqual(WEIGHTS);
  });

  it("throws on invalid inputs (missing + non-positive + zero-flute)", () => {
    expect(() => eng.predict(null as never)).toThrow(/input required/);
    expect(() => eng.predict(nominal({ cutter_diameter_mm: 0 }))).toThrow(/cutter_diameter_mm/);
    expect(() => eng.predict(nominal({ flute_count: 0 }))).toThrow(/flute_count/);
    expect(() => eng.predict(nominal({ pocket_depth_mm: -1 }))).toThrow(/pocket_depth_mm/);
  });

  it("nominal steel + flood + adaptive → LOW or MODERATE risk", () => {
    const r = eng.predict(nominal());
    expect(["low", "moderate"]).toContain(r.risk_level);
    expect(r.risk_score).toBeGreaterThanOrEqual(0);
    expect(r.risk_score).toBeLessThanOrEqual(1);
  });

  it("worst case: stainless full-slot 8-flute deep closed pocket dry → severe risk", () => {
    const r = eng.predict({
      material_iso_group: "M", // stainless
      cutter_diameter_mm: 6,
      pocket_depth_mm: 25, // d/D = 4.17 > critical 3.0
      strategy: "full_slot",
      flute_count: 8,
      vc_m_min: 120,
      fz_mm_tooth: 0.03,
      coolant: "dry",
      is_closed_pocket: true,
    });
    expect(r.risk_level).toBe("severe");
    expect(r.risk_score).toBeGreaterThanOrEqual(0.75);
  });

  it("best case: cast iron 2-flute open shallow trochoidal dry → low risk", () => {
    const r = eng.predict({
      material_iso_group: "K", // cast iron — discontinuous chips
      cutter_diameter_mm: 12,
      pocket_depth_mm: 3,
      strategy: "trochoidal",
      flute_count: 2,
      vc_m_min: 200,
      fz_mm_tooth: 0.10,
      coolant: "dry",
      is_closed_pocket: false,
    });
    expect(r.risk_level).toBe("low");
    expect(r.risk_score).toBeLessThan(0.25);
  });

  it("aluminum + FLOOD coolant emits high mismatch + 'switch coolant' mitigation", () => {
    const r = eng.predict(nominal({ material_iso_group: "N", coolant: "flood" }));
    expect(r.factors.coolant_mismatch_factor).toBe(1.0);
    expect(r.mitigations.some(m => /dry or air-blast/.test(m.action))).toBe(true);
    expect(r.reasoning.some(s => /Aluminum/.test(s))).toBe(true);
  });

  it("aluminum + AIR_BLAST coolant has minimal mismatch (canonical pair)", () => {
    const r = eng.predict(nominal({ material_iso_group: "N", coolant: "air_blast" }));
    expect(r.factors.coolant_mismatch_factor).toBeLessThanOrEqual(0.1);
  });

  it("stainless DRY coolant: max mismatch + canonical recommendation HPC/TSC", () => {
    const r = eng.predict(nominal({ material_iso_group: "M", coolant: "dry" }));
    expect(r.factors.coolant_mismatch_factor).toBe(1.0);
    expect(r.mitigations.some(m => /HPC or TSC/.test(m.action))).toBe(true);
  });

  it("superalloy without HPC/TSC: max mismatch (heat removal required)", () => {
    const r = eng.predict(nominal({ material_iso_group: "S", coolant: "dry" }));
    expect(r.factors.coolant_mismatch_factor).toBe(1.0);
  });

  it("superalloy with HPC: low mismatch (canonical pair)", () => {
    const r = eng.predict(nominal({ material_iso_group: "S", coolant: "hpc" }));
    expect(r.factors.coolant_mismatch_factor).toBeLessThanOrEqual(0.1);
  });

  it("flute count ordering: 8-flute > 4-flute > 2-flute in gullet factor (worse evac)", () => {
    const r2 = eng.predict(nominal({ flute_count: 2 }));
    const r4 = eng.predict(nominal({ flute_count: 4 }));
    const r8 = eng.predict(nominal({ flute_count: 8 }));
    expect(r2.factors.flute_gullet_factor).toBeLessThan(r4.factors.flute_gullet_factor);
    expect(r4.factors.flute_gullet_factor).toBeLessThan(r8.factors.flute_gullet_factor);
  });

  it("strategy ordering: full_slot > climb_pocket_rough > adaptive > trochoidal in factor", () => {
    const fs = eng.predict(nominal({ strategy: "full_slot" }));
    const pr = eng.predict(nominal({ strategy: "climb_pocket_rough" }));
    const ad = eng.predict(nominal({ strategy: "adaptive_clearing" }));
    const tr = eng.predict(nominal({ strategy: "trochoidal" }));
    expect(fs.factors.strategy_factor).toBeGreaterThan(pr.factors.strategy_factor);
    expect(pr.factors.strategy_factor).toBeGreaterThan(ad.factors.strategy_factor);
    expect(ad.factors.strategy_factor).toBeGreaterThanOrEqual(tr.factors.strategy_factor);
  });

  it("closed pocket > open contour in pocket_evac_factor (same depth/dia)", () => {
    const open = eng.predict(nominal({ pocket_depth_mm: 30, is_closed_pocket: false }));
    const closed = eng.predict(nominal({ pocket_depth_mm: 30, is_closed_pocket: true }));
    expect(closed.factors.pocket_evac_factor).toBeGreaterThan(open.factors.pocket_evac_factor);
  });

  it("deep pocket d/D >= critical emits reasoning + trochoidal mitigation", () => {
    const r = eng.predict(nominal({
      pocket_depth_mm: 35,
      cutter_diameter_mm: 10, // ratio 3.5 > critical 3.0
      strategy: "climb_pocket_rough",
    }));
    expect(r.reasoning.some(s => new RegExp(`Pocket depth/dia.*${POCKET_DEPTH_TO_DIA_CRITICAL}`).test(s))).toBe(true);
    expect(r.mitigations.some(m => /trochoidal toolpath/.test(m.action))).toBe(true);
  });

  it("severe risk emits programmed peck mitigation + 2 safety notes", () => {
    const r = eng.predict({
      material_iso_group: "M",
      cutter_diameter_mm: 6,
      pocket_depth_mm: 25,
      strategy: "full_slot",
      flute_count: 8,
      vc_m_min: 120,
      fz_mm_tooth: 0.03,
      coolant: "dry",
      is_closed_pocket: true,
    });
    expect(r.mitigations.some(m => /peck.*lift.*retract/.test(m.action))).toBe(true);
    expect(r.safety_notes.some(s => /SEVERE/.test(s))).toBe(true);
    expect(r.safety_notes.length).toBeGreaterThanOrEqual(2);
  });

  it("low risk emits no safety notes", () => {
    const r = eng.predict({
      material_iso_group: "K",
      cutter_diameter_mm: 12,
      pocket_depth_mm: 3,
      strategy: "trochoidal",
      flute_count: 2,
      vc_m_min: 200,
      fz_mm_tooth: 0.10,
      coolant: "dry",
      is_closed_pocket: false,
    });
    expect(r.risk_level).toBe("low");
    expect(r.safety_notes).toEqual([]);
  });

  it("4-flute non-cast-iron emits 'reduce to 2-3 flute' mitigation", () => {
    const r = eng.predict(nominal({ flute_count: 4, material_iso_group: "P" }));
    expect(r.mitigations.some(m => /Reduce flute count to 2-3/.test(m.action))).toBe(true);
  });

  it("explicit ductility override beats ISO group default", () => {
    const r_default = eng.predict(nominal({ material_iso_group: "K" })); // low ductility
    const r_override = eng.predict(nominal({ material_iso_group: "K", ductility: "very_high" }));
    expect(r_override.factors.ductility_factor).toBeGreaterThan(r_default.factors.ductility_factor);
  });

  it("variability ≥3: aluminum-air, steel-flood, stainless-hpc all distinct factor patterns", () => {
    const al = eng.predict(nominal({ material_iso_group: "N", coolant: "air_blast" }));
    const st = eng.predict(nominal({ material_iso_group: "P", coolant: "flood" }));
    const ss = eng.predict(nominal({ material_iso_group: "M", coolant: "hpc" }));
    // Each has low mismatch (canonical pair)
    expect(al.factors.coolant_mismatch_factor).toBeLessThanOrEqual(0.1);
    expect(st.factors.coolant_mismatch_factor).toBeLessThanOrEqual(0.1);
    expect(ss.factors.coolant_mismatch_factor).toBeLessThanOrEqual(0.1);
    // But ductility distinguishes them: M(very_high) > N(high) > P(medium)
    expect(ss.factors.ductility_factor).toBeGreaterThan(al.factors.ductility_factor);
    expect(al.factors.ductility_factor).toBeGreaterThan(st.factors.ductility_factor);
  });

  it("determinism: same input twice → identical results", () => {
    const i = nominal();
    expect(eng.predict(i)).toEqual(eng.predict(i));
  });

  it("clamps risk to [0, 1]", () => {
    const lo = eng.predict({
      material_iso_group: "K",
      cutter_diameter_mm: 50,
      pocket_depth_mm: 0,
      strategy: "trochoidal",
      flute_count: 2,
      vc_m_min: 1,
      fz_mm_tooth: 0.001,
      coolant: "tsc",
      is_closed_pocket: false,
    });
    const hi = eng.predict({
      material_iso_group: "S",
      cutter_diameter_mm: 3,
      pocket_depth_mm: 100,
      strategy: "full_slot",
      flute_count: 8,
      vc_m_min: 500,
      fz_mm_tooth: 0.001,
      coolant: "dry",
      is_closed_pocket: true,
    });
    expect(lo.risk_score).toBeGreaterThanOrEqual(0);
    expect(lo.risk_score).toBeLessThanOrEqual(1);
    expect(hi.risk_score).toBeGreaterThanOrEqual(0);
    expect(hi.risk_score).toBeLessThanOrEqual(1);
  });

  it("adversarial: tiny cutter (0.1mm), gigantic pocket (1000mm) computes finite factors", () => {
    const r = eng.predict(nominal({ cutter_diameter_mm: 0.1, pocket_depth_mm: 1000 }));
    // depth/dia ratio = 10000 → clamps to 1
    expect(Number.isFinite(r.risk_score)).toBe(true);
    expect(r.factors.pocket_evac_factor).toBeLessThanOrEqual(1);
    expect(r.factors.pocket_evac_factor).toBeGreaterThanOrEqual(0);
  });

  it("mitigations carry priority + risk_reduction; severe risk yields ≥2 high-priority", () => {
    const r = eng.predict({
      material_iso_group: "M",
      cutter_diameter_mm: 6,
      pocket_depth_mm: 25,
      strategy: "full_slot",
      flute_count: 8,
      vc_m_min: 120,
      fz_mm_tooth: 0.03,
      coolant: "dry",
      is_closed_pocket: true,
    });
    const highPriority = r.mitigations.filter(m => m.priority === "high");
    expect(highPriority.length).toBeGreaterThanOrEqual(2);
    expect(r.mitigations.every(m => m.expected_risk_reduction > 0 && m.expected_risk_reduction < 1)).toBe(true);
  });

  it("risk threshold ordering invariant: LOW < MODERATE < HIGH (severity progression)", () => {
    // Two configurations spanning the thresholds
    const r_low = eng.predict({
      material_iso_group: "K", cutter_diameter_mm: 12, pocket_depth_mm: 3,
      strategy: "trochoidal", flute_count: 2, vc_m_min: 200, fz_mm_tooth: 0.10, coolant: "dry",
    });
    const r_high = eng.predict({
      material_iso_group: "M", cutter_diameter_mm: 6, pocket_depth_mm: 20,
      strategy: "full_slot", flute_count: 5, vc_m_min: 120, fz_mm_tooth: 0.03, coolant: "mist",
    });
    expect(r_low.risk_score).toBeLessThan(r_high.risk_score);
  });
});
