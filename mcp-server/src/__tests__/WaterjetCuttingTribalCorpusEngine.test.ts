import { describe, it, expect } from "vitest";
import {
  waterjetCuttingTribalCorpusEngine as eng,
  WaterjetCuttingTribalCorpusEngine,
  type WaterjetCorpusInput,
} from "../engines/WaterjetCuttingTribalCorpusEngine.js";

function nominal(o: Partial<WaterjetCorpusInput> = {}): WaterjetCorpusInput {
  return {
    operation: "thin_sheet_cut",
    material: "mild_steel",
    abrasive: "garnet_80_mesh",
    pressure_class: "standard_60ksi",
    material_thickness_mm: 6,
    operator_skill_level: "intermediate",
    recent_symptom: null,
    ...o,
  };
}

describe("WaterjetCuttingTribalCorpusEngine", () => {
  it("exports singleton with surface()", () => {
    expect(eng).toBeInstanceOf(WaterjetCuttingTribalCorpusEngine);
    expect(typeof eng.surface).toBe("function");
  });

  it("throws on missing required fields", () => {
    expect(() => eng.surface({} as WaterjetCorpusInput))
      .toThrow(/operation \+ material \+ abrasive \+ pressure_class \+ material_thickness_mm \+ operator_skill_level required/);
  });

  it("throws on non-positive thickness", () => {
    expect(() => eng.surface(nominal({ material_thickness_mm: 0 }))).toThrow(/material_thickness_mm must be positive/);
    expect(() => eng.surface(nominal({ material_thickness_mm: -1 }))).toThrow(/material_thickness_mm must be positive/);
  });

  it("every surfaced tip carries handbook-grade source attribution", () => {
    const r = eng.surface(nominal());
    expect(r.top_tips.length).toBeGreaterThan(0);
    r.top_tips.forEach(t => {
      expect(t.source).toMatch(/Flow|OMAX|KMT|WARDJet|Bystronic|Machinery's Handbook|Zeng|ANSI|Boride|JM Die/);
      expect(t.confidence).toBeGreaterThanOrEqual(0.60);
      expect(t.confidence).toBeLessThanOrEqual(1.0);
    });
  });

  it("garnet abrasive matrix tip surfaces", () => {
    const r = eng.surface(nominal({ abrasive: "garnet_120_mesh" }));
    expect(r.top_tips.some(t => /Garnet.*mesh|abrasive matrix/i.test(t.tip))).toBe(true);
  });

  it("pure waterjet on metal → hazard warning", () => {
    const r = eng.surface(nominal({ material: "mild_steel", abrasive: "no_abrasive_pure" }));
    expect(r.warnings.some(w => /pure waterjet without abrasive|won't cut hard materials/i.test(w))).toBe(true);
  });

  it("stone/glass + ultra-high pressure → fracture warning", () => {
    const r = eng.surface(nominal({ material: "stone_glass", pressure_class: "ultra_high_94ksi" }));
    expect(r.warnings.some(w => /FRACTURE|stone.*glass|shock fracture/i.test(w))).toBe(true);
  });

  it("composite + 94ksi → delamination warning", () => {
    const r = eng.surface(nominal({ material: "composite_carbon", pressure_class: "ultra_high_94ksi" }));
    expect(r.warnings.some(w => /DELAMINATION|over-pressure delaminates/i.test(w))).toBe(true);
  });

  it("kerf_taper_excessive symptom → Tilt-A-Jet tip surfaces", () => {
    const r = eng.surface(nominal({ recent_symptom: "kerf_taper_excessive" }));
    expect(r.top_tips.some(t => /Tilt-A-Jet|Dynamic Waterjet|taper compensation/i.test(t.tip))).toBe(true);
  });

  it("edge_striation symptom → Zeng feed-rate tip surfaces", () => {
    const r = eng.surface(nominal({ recent_symptom: "edge_striation" }));
    expect(r.top_tips.some(t => /striation|feed rate|Zeng/i.test(t.tip))).toBe(true);
  });

  it("composite + pierce + delamination → low-pressure pierce tip", () => {
    const r = eng.surface(nominal({ operation: "piercing", material: "composite_carbon", recent_symptom: "pierce_delamination" }));
    expect(r.top_tips.some(t => /LOW pressure dynamic pierce|delaminate/i.test(t.tip))).toBe(true);
  });

  it("orifice_wear symptom → orifice-life tip surfaces", () => {
    const r = eng.surface(nominal({ recent_symptom: "orifice_wear" }));
    expect(r.top_tips.some(t => /Orifice life|orifice wear/i.test(t.tip))).toBe(true);
  });

  it("entry-level + composite → escalation (delamination risk)", () => {
    const r = eng.surface(nominal({ operator_skill_level: "entry", material: "composite_carbon" }));
    expect(r.escalation_needed).toBe(true);
    expect(r.escalation_reason).toMatch(/composite_carbon|delaminates|over-pressure/);
  });

  it("entry-level + stone → escalation (fracture risk)", () => {
    const r = eng.surface(nominal({ operator_skill_level: "entry", material: "stone_glass", pressure_class: "low_40ksi" }));
    expect(r.escalation_needed).toBe(true);
    expect(r.escalation_reason).toMatch(/stone_glass|fractures/);
  });

  it("entry-level + symptom → escalation with $ orifice scrap-risk", () => {
    const r = eng.surface(nominal({ operator_skill_level: "entry", recent_symptom: "stream_deflection" }));
    expect(r.escalation_needed).toBe(true);
    expect(r.escalation_reason).toMatch(/Entry-level.*stream_deflection.*orifice/i);
  });

  it("master + symptom → no escalation", () => {
    const r = eng.surface(nominal({ operator_skill_level: "master", recent_symptom: "stream_deflection" }));
    expect(r.escalation_needed).toBe(false);
    expect(r.escalation_reason).toBeNull();
  });

  it("recent_symptom set → URGENT priority", () => {
    const r = eng.surface(nominal({ recent_symptom: "orifice_wear" }));
    expect(r.recommended_action_priority.value).toMatch(/URGENT.*orifice_wear/);
  });

  it("entry-level + no symptom → GUIDED priority", () => {
    const r = eng.surface(nominal({ operator_skill_level: "entry", recent_symptom: null }));
    expect(r.recommended_action_priority.value).toMatch(/GUIDED.*entry-level/);
  });

  it("titanium → ELEVATED priority", () => {
    const r = eng.surface(nominal({ material: "titanium" }));
    expect(r.recommended_action_priority.value).toMatch(/ELEVATED.*titanium/);
  });

  it("thick plate >100mm → ELEVATED priority", () => {
    const r = eng.surface(nominal({ operation: "thick_plate_cut", material_thickness_mm: 120 }));
    expect(r.recommended_action_priority.value).toMatch(/ELEVATED.*thick plate/);
  });

  it("oversized thickness (>150mm) → thickness warning", () => {
    const r = eng.surface(nominal({ material_thickness_mm: 200, operation: "thick_plate_cut" }));
    expect(r.warnings.some(w => /THICKNESS.*exceeds.*AWJ practical limit/.test(w))).toBe(true);
  });

  it("tips sorted by match_score descending", () => {
    const r = eng.surface(nominal({ recent_symptom: "edge_striation" }));
    expect(r.top_tips.length).toBeGreaterThan(1);
    for (let i = 1; i < r.top_tips.length; i++) {
      expect(r.top_tips[i].match_score).toBeLessThanOrEqual(r.top_tips[i - 1].match_score);
    }
  });

  it("symptom match boosts score over generic", () => {
    const noSym = eng.surface(nominal({ recent_symptom: null }));
    const withSym = eng.surface(nominal({ recent_symptom: "kerf_taper_excessive" }));
    expect(withSym.top_tips[0].match_score).toBeGreaterThan(noSym.top_tips[0].match_score);
  });

  it("draft flag matches confidence threshold (<0.75)", () => {
    const r = eng.surface(nominal({ operation: "drilling" }));
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

  it("rubber/foam + pure waterjet → no metal-hazard warning", () => {
    const r = eng.surface(nominal({ material: "rubber_foam", abrasive: "no_abrasive_pure" }));
    expect(r.warnings.some(w => /pure waterjet without abrasive/.test(w))).toBe(false);
  });

  it("source cites Flow + OMAX + KMT + WARDJet + Bystronic + Machinery's Handbook + Zeng + ANSI + JM Die", () => {
    const r = eng.surface(nominal());
    expect(r.source).toMatch(/Flow.*OMAX.*KMT.*WARDJet.*Bystronic.*Machinery's Handbook.*Zeng.*ANSI.*JM Die/s);
  });
});
