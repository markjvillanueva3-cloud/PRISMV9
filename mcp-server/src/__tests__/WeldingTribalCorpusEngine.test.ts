import { describe, it, expect } from "vitest";
import {
  weldingTribalCorpusEngine as eng,
  WeldingTribalCorpusEngine,
  type WeldCorpusInput,
} from "../engines/WeldingTribalCorpusEngine.js";

function nominal(o: Partial<WeldCorpusInput> = {}): WeldCorpusInput {
  return {
    process: "gtaw_tig",
    base_metal: "mild_steel",
    shield_gas: "argon_100",
    base_thickness_mm: 3,
    operator_skill_level: "intermediate",
    recent_symptom: null,
    ...o,
  };
}

describe("WeldingTribalCorpusEngine", () => {
  it("exports singleton with surface()", () => {
    expect(eng).toBeInstanceOf(WeldingTribalCorpusEngine);
    expect(typeof eng.surface).toBe("function");
  });

  it("throws on missing required fields", () => {
    expect(() => eng.surface({} as WeldCorpusInput))
      .toThrow(/process \+ base_metal \+ shield_gas \+ base_thickness_mm \+ operator_skill_level required/);
  });

  it("throws on non-positive thickness", () => {
    expect(() => eng.surface(nominal({ base_thickness_mm: 0 }))).toThrow(/base_thickness_mm must be positive/);
  });

  it("every surfaced tip carries handbook-grade source attribution", () => {
    const r = eng.surface(nominal({ process: "gmaw_mig", base_metal: "mild_steel", shield_gas: "argon_co2_75_25" }));
    expect(r.top_tips.length).toBeGreaterThan(0);
    r.top_tips.forEach(t => {
      expect(t.source).toMatch(/Lincoln|Miller|ESAB|Fronius|AWS|Machinery's Handbook|IPG|OSHA|ANSI|JM Die/);
      expect(t.confidence).toBeGreaterThanOrEqual(0.60);
      expect(t.confidence).toBeLessThanOrEqual(1.0);
    });
  });

  it("TIG aluminum → AC + high-freq + pure argon tip surfaces", () => {
    const r = eng.surface(nominal({ process: "gtaw_tig", base_metal: "aluminum", shield_gas: "argon_100" }));
    expect(r.top_tips.some(t => /TIG aluminum.*AC|high-frequency|pure argon/i.test(t.tip))).toBe(true);
  });

  it("MIG aluminum + wrong gas → warning", () => {
    const r = eng.surface(nominal({ process: "gmaw_mig", base_metal: "aluminum", shield_gas: "argon_co2_75_25" }));
    expect(r.warnings.some(w => /WRONG GAS.*MIG aluminum|severe spatter/i.test(w))).toBe(true);
  });

  it("titanium + non-argon → wrong-gas warning", () => {
    const r = eng.surface(nominal({ process: "gtaw_tig", base_metal: "titanium", shield_gas: "argon_co2_75_25" }));
    expect(r.warnings.some(w => /WRONG GAS.*titanium|pure argon.*back-purge|AWS D17.1/i.test(w))).toBe(true);
  });

  it("stainless → Cr⁶⁺ carcinogen warning + ELEVATED priority", () => {
    const r = eng.surface(nominal({ base_metal: "stainless_steel" }));
    expect(r.warnings.some(w => /CARCINOGEN|hexavalent chromium|Cr⁶⁺|OSHA 29 CFR 1910.1026/.test(w))).toBe(true);
    expect(r.recommended_action_priority.value).toMatch(/ELEVATED.*stainless_steel/);
  });

  it("galvanized → zinc-fume warning + ELEVATED priority", () => {
    const r = eng.surface(nominal({ base_metal: "galvanized_steel" }));
    expect(r.warnings.some(w => /FUME HAZARD|zinc-oxide fever|29 CFR 1910.1000/.test(w))).toBe(true);
    expect(r.recommended_action_priority.value).toMatch(/ELEVATED.*galvanized_steel/);
  });

  it("titanium TIG → AWS D17.1 color-check tip surfaces", () => {
    const r = eng.surface(nominal({ process: "gtaw_tig", base_metal: "titanium", shield_gas: "argon_100" }));
    expect(r.top_tips.some(t => /Titanium TIG.*back-purge|color check|silver|straw|blue/i.test(t.tip))).toBe(true);
  });

  it("porosity symptom → gas-flow/cleanliness tip surfaces", () => {
    const r = eng.surface(nominal({ recent_symptom: "porosity" }));
    expect(r.top_tips.some(t => /Porosity|gas flow|clean base metal/i.test(t.tip))).toBe(true);
  });

  it("cold cracking → CE/preheat tip surfaces", () => {
    const r = eng.surface(nominal({ recent_symptom: "cracking_cold" }));
    expect(r.top_tips.some(t => /Cold cracking|delayed hydrogen|preheat per CE|low-hydrogen/i.test(t.tip))).toBe(true);
  });

  it("hot cracking → preheat/restraint tip surfaces", () => {
    const r = eng.surface(nominal({ recent_symptom: "cracking_hot" }));
    expect(r.top_tips.some(t => /Hot cracking|preheat 100|liquation/i.test(t.tip))).toBe(true);
  });

  it("burn-through symptom → pulse/copper-backing tip surfaces", () => {
    const r = eng.surface(nominal({ recent_symptom: "burn_through_thin" }));
    expect(r.top_tips.some(t => /Burn-through|pulse mode|copper backing/i.test(t.tip))).toBe(true);
  });

  it("entry-level + symptom → escalation with cold-cracking-load language", () => {
    const r = eng.surface(nominal({ operator_skill_level: "entry", recent_symptom: "cracking_cold" }));
    expect(r.escalation_needed).toBe(true);
    expect(r.escalation_reason).toMatch(/Entry-level.*cracking_cold.*escalate|cold-cracking.*under load|structural rejection/i);
  });

  it("entry-level + titanium → escalation (specialty procedure)", () => {
    const r = eng.surface(nominal({ operator_skill_level: "entry", base_metal: "titanium", shield_gas: "argon_100" }));
    expect(r.escalation_needed).toBe(true);
    expect(r.escalation_reason).toMatch(/titanium|specialty procedure|Ti color-check|AWS D17.1/);
  });

  it("entry-level + dissimilar → escalation (filler selection)", () => {
    const r = eng.surface(nominal({ operator_skill_level: "entry", base_metal: "dissimilar_metal" }));
    expect(r.escalation_needed).toBe(true);
    expect(r.escalation_reason).toMatch(/dissimilar_metal|brittle intermetallics|wrong filler/);
  });

  it("master + symptom → no escalation", () => {
    const r = eng.surface(nominal({ operator_skill_level: "master", recent_symptom: "cracking_cold" }));
    expect(r.escalation_needed).toBe(false);
    expect(r.escalation_reason).toBeNull();
  });

  it("recent_symptom set → URGENT priority", () => {
    const r = eng.surface(nominal({ recent_symptom: "porosity" }));
    expect(r.recommended_action_priority.value).toMatch(/URGENT.*porosity/);
  });

  it("entry-level + no symptom → GUIDED priority", () => {
    const r = eng.surface(nominal({ operator_skill_level: "entry", recent_symptom: null }));
    expect(r.recommended_action_priority.value).toMatch(/GUIDED.*entry-level/);
  });

  it("titanium → ELEVATED priority", () => {
    const r = eng.surface(nominal({ base_metal: "titanium", shield_gas: "argon_100" }));
    expect(r.recommended_action_priority.value).toMatch(/ELEVATED.*titanium/);
  });

  it("thin material <1mm → burn-through warning", () => {
    const r = eng.surface(nominal({ base_thickness_mm: 0.5 }));
    expect(r.warnings.some(w => /THIN MATERIAL.*0.5mm|burn-through risk extreme/.test(w))).toBe(true);
  });

  it("tips sorted by match_score descending", () => {
    const r = eng.surface(nominal({ recent_symptom: "porosity" }));
    expect(r.top_tips.length).toBeGreaterThan(1);
    for (let i = 1; i < r.top_tips.length; i++) {
      expect(r.top_tips[i].match_score).toBeLessThanOrEqual(r.top_tips[i - 1].match_score);
    }
  });

  it("symptom match boosts score over generic", () => {
    const noSym = eng.surface(nominal({ recent_symptom: null }));
    const withSym = eng.surface(nominal({ recent_symptom: "porosity" }));
    expect(withSym.top_tips[0].match_score).toBeGreaterThan(noSym.top_tips[0].match_score);
  });

  it("draft flag matches confidence threshold (<0.75)", () => {
    const r = eng.surface(nominal({ process: "resistance_spot" }));
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

  it("source cites Lincoln + Miller + ESAB + Fronius + AWS + MH + ANSI + OSHA + JM Die", () => {
    const r = eng.surface(nominal());
    expect(r.source).toMatch(/Lincoln Electric.*Miller Electric.*ESAB.*Fronius.*AWS.*Machinery's Handbook.*ANSI Z49.1.*OSHA.*JM Die/s);
  });

  it("safe combo (TIG mild steel + argon) → no critical-hazard warning", () => {
    const r = eng.surface(nominal({ process: "gtaw_tig", base_metal: "mild_steel", shield_gas: "argon_100", base_thickness_mm: 3 }));
    expect(r.warnings.some(w => /CARCINOGEN|FUME HAZARD|WRONG GAS|THIN MATERIAL/.test(w))).toBe(false);
  });
});
