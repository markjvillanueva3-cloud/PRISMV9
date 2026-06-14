import { describe, it, expect } from "vitest";
import {
  additiveManufacturingTribalCorpusEngine as eng,
  AdditiveManufacturingTribalCorpusEngine,
  type AMCorpusInput,
} from "../engines/AdditiveManufacturingTribalCorpusEngine.js";

function nominal(o: Partial<AMCorpusInput> = {}): AMCorpusInput {
  return {
    process: "fdm_fff",
    material: "pla",
    layer_height: "standard_100um",
    build_height_mm: 50,
    operator_skill_level: "intermediate",
    recent_symptom: null,
    ...o,
  };
}

describe("AdditiveManufacturingTribalCorpusEngine", () => {
  it("exports singleton with surface()", () => {
    expect(eng).toBeInstanceOf(AdditiveManufacturingTribalCorpusEngine);
    expect(typeof eng.surface).toBe("function");
  });

  it("throws on missing required fields", () => {
    expect(() => eng.surface({} as AMCorpusInput))
      .toThrow(/process \+ material \+ layer_height \+ build_height_mm \+ operator_skill_level required/);
  });

  it("throws on non-positive build_height", () => {
    expect(() => eng.surface(nominal({ build_height_mm: 0 }))).toThrow(/build_height_mm must be positive/);
  });

  it("every surfaced tip carries handbook-grade source attribution", () => {
    const r = eng.surface(nominal({ process: "dmls_slm", material: "stainless_316L" }));
    expect(r.top_tips.length).toBeGreaterThan(0);
    r.top_tips.forEach(t => {
      expect(t.source).toMatch(/EOS|3D Systems|Stratasys|Markforged|Formlabs|GE Additive|ASTM|ISO\/ASTM|Machinery's Handbook|NFPA|OSHA|JM Die/);
      expect(t.confidence).toBeGreaterThanOrEqual(0.60);
      expect(t.confidence).toBeLessThanOrEqual(1.0);
    });
  });

  it("FDM + first-layer adhesion → bed-level/Z-offset tip surfaces", () => {
    const r = eng.surface(nominal({ process: "fdm_fff", recent_symptom: "first_layer_adhesion_failure" }));
    expect(r.top_tips.some(t => /first layer|Z-offset|squish/i.test(t.tip))).toBe(true);
  });

  it("ABS warping → heated-chamber tip surfaces", () => {
    const r = eng.surface(nominal({ process: "fdm_fff", material: "abs", recent_symptom: "warping_delamination" }));
    expect(r.top_tips.some(t => /ABS warping|heated chamber|brim or raft/i.test(t.tip))).toBe(true);
  });

  it("SLA resin → uncured-resin allergen warning", () => {
    const r = eng.surface(nominal({ process: "sla_dlp", material: "photopolymer_resin" }));
    expect(r.warnings.some(w => /ALLERGEN.*uncured photopolymer|nitrile gloves|OSHA 29 CFR 1910.1200/.test(w))).toBe(true);
  });

  it("metal AM (DMLS 316L) → NFPA 484 combustible warning + ELEVATED priority", () => {
    const r = eng.surface(nominal({ process: "dmls_slm", material: "stainless_316L" }));
    expect(r.warnings.some(w => /COMBUSTIBLE.*metal AM|NFPA 484|argon-purged/.test(w))).toBe(true);
    expect(r.recommended_action_priority.value).toMatch(/ELEVATED.*metal AM|stainless_316L/);
  });

  it("Ti-6Al-4V DMLS → reactive-metal aerospace ELEVATED priority", () => {
    const r = eng.surface(nominal({ process: "dmls_slm", material: "ti6al4v" }));
    expect(r.recommended_action_priority.value).toMatch(/ELEVATED.*ti6al4v|reactive metal|O₂ <100 ppm/);
  });

  it("Ti-6Al-4V DMLS → argon-purity tip surfaces", () => {
    const r = eng.surface(nominal({ process: "dmls_slm", material: "ti6al4v" }));
    expect(r.top_tips.some(t => /Ti-6Al-4V|argon purity 99.99%|HIP post-process/i.test(t.tip))).toBe(true);
  });

  it("porosity DMLS → laser-power window tip surfaces", () => {
    const r = eng.surface(nominal({ process: "dmls_slm", material: "stainless_316L", recent_symptom: "porosity_pores" }));
    expect(r.top_tips.some(t => /Porosity DMLS|lack-of-fusion|keyhole porosity/i.test(t.tip))).toBe(true);
  });

  it("recoater streaks → blade replacement tip surfaces", () => {
    const r = eng.surface(nominal({ process: "dmls_slm", material: "stainless_316L", recent_symptom: "recoater_streaks" }));
    expect(r.top_tips.some(t => /Recoater streaks|blade damage|spatter ejecta/i.test(t.tip))).toBe(true);
  });

  it("cracking_residual_stress → scan-pattern tip surfaces", () => {
    const r = eng.surface(nominal({ process: "dmls_slm", material: "stainless_316L", recent_symptom: "cracking_residual_stress" }));
    expect(r.top_tips.some(t => /Residual-stress cracking|alternate scan pattern|rotate 67°|stress-relief/i.test(t.tip))).toBe(true);
  });

  it("carbon-fiber FDM → hardened-nozzle tip surfaces", () => {
    const r = eng.surface(nominal({ process: "fdm_fff", material: "carbon_fiber_reinforced" }));
    expect(r.top_tips.some(t => /Carbon-fiber FDM|hardened-steel|ruby nozzle/i.test(t.tip))).toBe(true);
  });

  it("PLA stringing → drying tip surfaces", () => {
    const r = eng.surface(nominal({ process: "fdm_fff", material: "pla", recent_symptom: "stringing_oozing" }));
    expect(r.top_tips.some(t => /PLA-PETG drying|hygroscopic|food dehydrator/i.test(t.tip))).toBe(true);
  });

  it("entry-level + symptom → escalation with $500-10k scrap language", () => {
    const r = eng.surface(nominal({ operator_skill_level: "entry", process: "dmls_slm", material: "stainless_316L", recent_symptom: "porosity_pores" }));
    expect(r.escalation_needed).toBe(true);
    expect(r.escalation_reason).toMatch(/Entry-level.*porosity_pores.*escalate|metal-AM scrap|cracking-residual/i);
  });

  it("entry-level + Ti6Al4V → escalation (reactive metal)", () => {
    const r = eng.surface(nominal({ operator_skill_level: "entry", process: "dmls_slm", material: "ti6al4v" }));
    expect(r.escalation_needed).toBe(true);
    expect(r.escalation_reason).toMatch(/ti6al4v|reactive metal|NFPA 484|HIP/);
  });

  it("entry-level + Inconel-718 → escalation", () => {
    const r = eng.surface(nominal({ operator_skill_level: "entry", process: "dmls_slm", material: "inconel_718" }));
    expect(r.escalation_needed).toBe(true);
    expect(r.escalation_reason).toMatch(/inconel_718|reactive metal|NFPA 484/);
  });

  it("master + symptom → no escalation", () => {
    const r = eng.surface(nominal({ operator_skill_level: "master", recent_symptom: "porosity_pores" }));
    expect(r.escalation_needed).toBe(false);
    expect(r.escalation_reason).toBeNull();
  });

  it("entry-level + non-metal + no symptom → GUIDED priority", () => {
    const r = eng.surface(nominal({ operator_skill_level: "entry", process: "fdm_fff", material: "pla", recent_symptom: null }));
    expect(r.recommended_action_priority.value).toMatch(/GUIDED.*entry-level/);
  });

  it("recent_symptom set → URGENT priority", () => {
    const r = eng.surface(nominal({ recent_symptom: "warping_delamination" }));
    expect(r.recommended_action_priority.value).toMatch(/URGENT.*warping_delamination/);
  });

  it("oversized build_height (>300mm) → warning", () => {
    const r = eng.surface(nominal({ build_height_mm: 400 }));
    expect(r.warnings.some(w => /BUILD HEIGHT.*400mm|exceeds typical desktop AM/.test(w))).toBe(true);
  });

  it("DMLS at 25µm → productivity warning", () => {
    const r = eng.surface(nominal({ process: "dmls_slm", material: "stainless_316L", layer_height: "ultra_fine_25um" }));
    expect(r.warnings.some(w => /PRODUCTIVITY.*DMLS.*25µm|4× build time/.test(w))).toBe(true);
  });

  it("tips sorted by match_score descending", () => {
    const r = eng.surface(nominal({ process: "dmls_slm", material: "ti6al4v", recent_symptom: "cracking_residual_stress" }));
    expect(r.top_tips.length).toBeGreaterThan(1);
    for (let i = 1; i < r.top_tips.length; i++) {
      expect(r.top_tips[i].match_score).toBeLessThanOrEqual(r.top_tips[i - 1].match_score);
    }
  });

  it("symptom match boosts score over generic", () => {
    const noSym = eng.surface(nominal({ recent_symptom: null }));
    const withSym = eng.surface(nominal({ recent_symptom: "warping_delamination" }));
    expect(withSym.top_tips[0].match_score).toBeGreaterThan(noSym.top_tips[0].match_score);
  });

  it("draft flag matches confidence threshold (<0.75)", () => {
    const r = eng.surface(nominal({ process: "binder_jet", material: "stainless_316L" }));
    r.top_tips.forEach(t => {
      expect(t.draft).toBe(t.confidence < 0.75);
    });
  });

  it("top_n=3 returns at most 3 tips", () => {
    const r = eng.surface(nominal({ top_n: 3 }));
    expect(r.top_tips.length).toBeLessThanOrEqual(3);
  });

  it("min_confidence=0.95 → only highest-confidence tips", () => {
    const r = eng.surface(nominal({ min_confidence: 0.95, top_n: 100 }));
    r.top_tips.forEach(t => expect(t.confidence).toBeGreaterThanOrEqual(0.95));
  });

  it("min_confidence=0.6 surfaces more tips than min_confidence=0.95", () => {
    const rLow = eng.surface(nominal({ min_confidence: 0.6, top_n: 100 }));
    const rHigh = eng.surface(nominal({ min_confidence: 0.95, top_n: 100 }));
    expect(rLow.top_tips.length).toBeGreaterThan(rHigh.top_tips.length);
  });

  it("source cites EOS + 3D Systems + Stratasys + Markforged + Formlabs + GE Additive + ASTM + NFPA + OSHA + JM Die", () => {
    const r = eng.surface(nominal());
    expect(r.source).toMatch(/EOS.*3D Systems.*Stratasys.*Markforged.*Formlabs.*GE Additive.*ASTM.*ISO\/ASTM.*Machinery's Handbook.*NFPA 484.*OSHA.*JM Die/s);
  });

  it("safe combo (FDM PLA 100µm 50mm) → no critical-hazard warning", () => {
    const r = eng.surface(nominal({ process: "fdm_fff", material: "pla", layer_height: "standard_100um", build_height_mm: 50 }));
    expect(r.warnings.some(w => /COMBUSTIBLE|ALLERGEN|BUILD HEIGHT|PRODUCTIVITY/.test(w))).toBe(false);
  });
});
