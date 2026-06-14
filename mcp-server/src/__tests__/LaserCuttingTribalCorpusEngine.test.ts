import { describe, it, expect } from "vitest";
import {
  laserCuttingTribalCorpusEngine as eng,
  LaserCuttingTribalCorpusEngine,
  type LaserCorpusInput,
} from "../engines/LaserCuttingTribalCorpusEngine.js";

function nominal(o: Partial<LaserCorpusInput> = {}): LaserCorpusInput {
  return {
    operation: "thin_sheet_cut",
    laser_source: "fiber_1um",
    material: "mild_steel",
    assist_gas: "oxygen",
    material_thickness_mm: 3,
    operator_skill_level: "intermediate",
    recent_symptom: null,
    ...o,
  };
}

describe("LaserCuttingTribalCorpusEngine", () => {
  it("exports singleton with surface()", () => {
    expect(eng).toBeInstanceOf(LaserCuttingTribalCorpusEngine);
    expect(typeof eng.surface).toBe("function");
  });

  it("throws on missing required fields", () => {
    expect(() => eng.surface({} as LaserCorpusInput))
      .toThrow(/operation \+ laser_source \+ material \+ assist_gas \+ material_thickness_mm \+ operator_skill_level required/);
  });

  it("throws on non-positive thickness", () => {
    expect(() => eng.surface(nominal({ material_thickness_mm: 0 })))
      .toThrow(/material_thickness_mm must be positive/);
    expect(() => eng.surface(nominal({ material_thickness_mm: -1 })))
      .toThrow(/material_thickness_mm must be positive/);
  });

  it("every surfaced tip carries handbook-grade source attribution", () => {
    const r = eng.surface(nominal({ operation: "thick_plate_cut", material_thickness_mm: 10 }));
    expect(r.top_tips.length).toBeGreaterThan(0);
    r.top_tips.forEach(t => {
      expect(t.source).toMatch(/Trumpf|Bystronic|Mazak Optonics|Amada|IPG Photonics|Machinery's Handbook|JM Die|ANSI|IEC|OSHA/);
      expect(t.confidence).toBeGreaterThanOrEqual(0.60);
      expect(t.confidence).toBeLessThanOrEqual(1.0);
    });
  });

  it("thick mild steel + O₂ → exothermic-boost tip surfaces", () => {
    const r = eng.surface(nominal({ operation: "thick_plate_cut", material: "mild_steel", assist_gas: "oxygen", material_thickness_mm: 10 }));
    expect(r.top_tips.some(t => /O₂ assist|exothermic/.test(t.tip))).toBe(true);
  });

  it("stainless steel + N₂ → oxide-free edge tip surfaces", () => {
    const r = eng.surface(nominal({ material: "stainless_steel", assist_gas: "nitrogen" }));
    expect(r.top_tips.some(t => /Stainless steel.*N₂|oxide-free/i.test(t.tip))).toBe(true);
  });

  it("aluminum + O₂ → Class D fire-risk warning", () => {
    const r = eng.surface(nominal({ material: "aluminum", assist_gas: "oxygen" }));
    expect(r.warnings.some(w => /Class D fire|aluminum.*O₂/.test(w))).toBe(true);
  });

  it("titanium + N₂ → titanium-nitride embrittlement warning", () => {
    const r = eng.surface(nominal({ material: "titanium", assist_gas: "nitrogen" }));
    expect(r.warnings.some(w => /titanium nitride|embrittlement/.test(w))).toBe(true);
  });

  it("galvanized + thick → zinc-oxide fume hazard warning", () => {
    const r = eng.surface(nominal({ material: "galvanized_steel", material_thickness_mm: 3, assist_gas: "oxygen" }));
    expect(r.warnings.some(w => /zinc-oxide|OSHA PEL|downdraft/i.test(w))).toBe(true);
  });

  it("fiber 1µm + copper/brass → back-reflection warning + tip surfaces", () => {
    const r = eng.surface(nominal({ laser_source: "fiber_1um", material: "brass_copper", assist_gas: "nitrogen" }));
    expect(r.warnings.some(w => /BACK-REFLECTION|shutter sensor|isolator/.test(w))).toBe(true);
    expect(r.top_tips.some(t => /back-reflection|isolator/i.test(t.tip))).toBe(true);
  });

  it("entry-level + fiber 1µm + copper → escalation (back-reflection class-4)", () => {
    const r = eng.surface(nominal({ operator_skill_level: "entry", laser_source: "fiber_1um", material: "brass_copper" }));
    expect(r.escalation_needed).toBe(true);
    expect(r.escalation_reason).toMatch(/back-reflection|class-4|ANSI Z136/);
  });

  it("entry-level + active symptom → escalation with $ scrap-risk language", () => {
    const r = eng.surface(nominal({ operator_skill_level: "entry", recent_symptom: "pierce_blow_back" }));
    expect(r.escalation_needed).toBe(true);
    expect(r.escalation_reason).toMatch(/Entry-level.*pierce_blow_back.*escalate.*lens damage/i);
  });

  it("master + symptom → no escalation", () => {
    const r = eng.surface(nominal({ operator_skill_level: "master", recent_symptom: "pierce_blow_back" }));
    expect(r.escalation_needed).toBe(false);
    expect(r.escalation_reason).toBeNull();
  });

  it("recent_symptom set → URGENT priority", () => {
    const r = eng.surface(nominal({ recent_symptom: "dross_bottom_edge" }));
    expect(r.recommended_action_priority.value).toMatch(/URGENT.*dross_bottom_edge/);
  });

  it("entry-level + no symptom → GUIDED priority", () => {
    const r = eng.surface(nominal({ operator_skill_level: "entry", recent_symptom: null }));
    expect(r.recommended_action_priority.value).toMatch(/GUIDED.*entry-level/);
  });

  it("titanium → ELEVATED priority", () => {
    const r = eng.surface(nominal({ material: "titanium", assist_gas: "argon" }));
    expect(r.recommended_action_priority.value).toMatch(/ELEVATED.*titanium/);
  });

  it("galvanized → ELEVATED priority for zinc fume", () => {
    const r = eng.surface(nominal({ material: "galvanized_steel", material_thickness_mm: 2 }));
    expect(r.recommended_action_priority.value).toMatch(/ELEVATED.*galvanized|zinc-oxide/i);
  });

  it("dross_bottom_edge symptom → focal/gas tip surfaces", () => {
    const r = eng.surface(nominal({ recent_symptom: "dross_bottom_edge" }));
    expect(r.top_tips.some(t => /focal|gas pressure|drop focal/i.test(t.tip))).toBe(true);
  });

  it("pierce_blow_back symptom + thick → pulse-pierce tip surfaces", () => {
    const r = eng.surface(nominal({ operation: "piercing", material_thickness_mm: 15, recent_symptom: "pierce_blow_back" }));
    expect(r.top_tips.some(t => /PULSE pierce|pulse pierce/i.test(t.tip))).toBe(true);
  });

  it("CO₂ + acrylic → flame-polish tip surfaces", () => {
    const r = eng.surface(nominal({ laser_source: "co2_10um", material: "acrylic_polymer", assist_gas: "air" }));
    expect(r.top_tips.some(t => /flame-polish|Acrylic.*CO₂/.test(t.tip))).toBe(true);
  });

  it("tips sorted by match_score descending (monotonic)", () => {
    const r = eng.surface(nominal({ material: "stainless_steel", assist_gas: "nitrogen", recent_symptom: "edge_burn_HAZ" }));
    expect(r.top_tips.length).toBeGreaterThan(1);
    for (let i = 1; i < r.top_tips.length; i++) {
      expect(r.top_tips[i].match_score).toBeLessThanOrEqual(r.top_tips[i - 1].match_score);
    }
  });

  it("symptom match boosts score over generic", () => {
    const noSym = eng.surface(nominal({ recent_symptom: null }));
    const withSym = eng.surface(nominal({ recent_symptom: "dross_bottom_edge" }));
    expect(withSym.top_tips[0].match_score).toBeGreaterThan(noSym.top_tips[0].match_score);
  });

  it("draft flag matches confidence threshold (<0.75)", () => {
    const r = eng.surface(nominal({ operation: "etching_marking" }));
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

  it("oversized thickness (>25 mm) → thickness warning", () => {
    const r = eng.surface(nominal({ material_thickness_mm: 30, operation: "thick_plate_cut" }));
    expect(r.warnings.some(w => /THICKNESS.*30 mm|exceeds.*fiber-laser practical limit/.test(w))).toBe(true);
  });

  it("safe combos → no critical hazard warnings", () => {
    const r = eng.surface(nominal({ material: "mild_steel", assist_gas: "oxygen", laser_source: "co2_10um", material_thickness_mm: 6 }));
    // Should NOT trigger Class-D / titanium-nitride / back-reflection / galvanized warnings
    expect(r.warnings.some(w => /Class D fire|titanium nitride|BACK-REFLECTION|zinc-oxide/.test(w))).toBe(false);
  });

  it("source cites Trumpf + Bystronic + Mazak Optonics + Amada + IPG + Machinery's Handbook + ANSI + IEC + OSHA + JM Die", () => {
    const r = eng.surface(nominal());
    expect(r.source).toMatch(/Trumpf.*Bystronic.*Mazak Optonics.*Amada.*IPG.*Machinery's Handbook.*ANSI.*IEC.*OSHA.*JM Die/s);
  });
});
