import { describe, it, expect } from "vitest";
import {
  sinkerEDMTribalCorpusEngine as eng,
  SinkerEDMTribalCorpusEngine,
  type SinkerCorpusInput,
} from "../engines/SinkerEDMTribalCorpusEngine.js";

function nominal(o: Partial<SinkerCorpusInput> = {}): SinkerCorpusInput {
  return {
    operation: "roughing",
    electrode_material: "graphite",
    workpiece_material: "tool_steel_hardened",
    dielectric: "kerosene",
    operator_skill_level: "intermediate",
    recent_symptom: null,
    ...o,
  };
}

describe("SinkerEDMTribalCorpusEngine", () => {
  it("exports singleton with surface()", () => {
    expect(eng).toBeInstanceOf(SinkerEDMTribalCorpusEngine);
    expect(typeof eng.surface).toBe("function");
  });

  it("throws on missing required fields", () => {
    expect(() => eng.surface({} as SinkerCorpusInput))
      .toThrow(/operation \+ electrode_material \+ workpiece_material \+ dielectric \+ operator_skill_level required/);
  });

  it("every surfaced tip carries handbook-grade source attribution", () => {
    const r = eng.surface(nominal({ operation: "roughing", electrode_material: "graphite" }));
    expect(r.top_tips.length).toBeGreaterThan(0);
    r.top_tips.forEach(t => {
      expect(t.source).toMatch(/Mitsubishi|Charmilles|AGIE|Sodick|Fanuc|Machinery's Handbook|JM Die|Sandvik|NFPA/);
      expect(t.confidence).toBeGreaterThanOrEqual(0.60);
      expect(t.confidence).toBeLessThanOrEqual(1.0);
    });
  });

  it("graphite + tool steel + roughing → graphite-polarity tip surfaces top", () => {
    const r = eng.surface(nominal({ operation: "roughing", electrode_material: "graphite", workpiece_material: "tool_steel_hardened" }));
    expect(r.top_tips.some(t => /Graphite electrode roughing.*positive polarity/.test(t.tip))).toBe(true);
  });

  it("deep_pocket_choking symptom → pulse flushing tip surfaces", () => {
    const r = eng.surface(nominal({ operation: "deep_pocket", recent_symptom: "deep_pocket_choking" }));
    expect(r.top_tips.some(t => /pulse flushing|STEP-burn/i.test(t.tip))).toBe(true);
  });

  it("arc_carbon_track symptom → carbon-recovery tip surfaces", () => {
    const r = eng.surface(nominal({ recent_symptom: "arc_carbon_track" }));
    expect(r.top_tips.some(t => /carbon-track|Carbon-track|carbon brush|flush retraction/i.test(t.tip))).toBe(true);
  });

  it("tungsten carbide workpiece → Cu-W electrode tip top-ranked", () => {
    const r = eng.surface(nominal({ workpiece_material: "tungsten_carbide", electrode_material: "copper_tungsten" }));
    expect(r.top_tips.some(t => /Cu-W|copper-tungsten/i.test(t.tip))).toBe(true);
  });

  it("titanium + kerosene → NFPA 484 fire-risk warning + escalated priority", () => {
    const r = eng.surface(nominal({ workpiece_material: "titanium", dielectric: "kerosene" }));
    expect(r.warnings.some(w => /NFPA 484|fire.*flash risk/i.test(w))).toBe(true);
    expect(r.recommended_action_priority.value).toMatch(/ELEVATED.*titanium/);
  });

  it("entry-level + titanium → escalation (NFPA 484 fire risk)", () => {
    const r = eng.surface(nominal({ operator_skill_level: "entry", workpiece_material: "titanium", dielectric: "deionized_water" }));
    expect(r.escalation_needed).toBe(true);
    expect(r.escalation_reason).toMatch(/NFPA 484|reactive metal/);
  });

  it("entry-level + symptom → escalation triggered with scrap risk in reason", () => {
    const r = eng.surface(nominal({ operator_skill_level: "entry", recent_symptom: "burn_through_short" }));
    expect(r.escalation_needed).toBe(true);
    expect(r.escalation_reason).toMatch(/Entry-level.*burn_through_short.*escalate/);
    expect(r.warnings.some(w => /scrap/i.test(w))).toBe(true);
  });

  it("master + symptom → no escalation needed", () => {
    const r = eng.surface(nominal({ operator_skill_level: "master", recent_symptom: "burn_through_short" }));
    expect(r.escalation_needed).toBe(false);
    expect(r.escalation_reason).toBeNull();
  });

  it("entry-level + no symptom + tool steel → GUIDED priority", () => {
    const r = eng.surface(nominal({ operator_skill_level: "entry", recent_symptom: null }));
    expect(r.recommended_action_priority.value).toMatch(/GUIDED.*entry-level/);
  });

  it("recent_symptom set → URGENT priority", () => {
    const r = eng.surface(nominal({ recent_symptom: "side_wall_taper" }));
    expect(r.recommended_action_priority.value).toMatch(/URGENT.*side_wall_taper/);
  });

  it("reactive workpiece + no operator-risk → ELEVATED priority", () => {
    const r = eng.surface(nominal({ workpiece_material: "inconel", dielectric: "deionized_water", recent_symptom: null }));
    expect(r.recommended_action_priority.value).toMatch(/ELEVATED.*inconel/);
  });

  it("tips sorted by match_score descending", () => {
    const r = eng.surface(nominal({ workpiece_material: "tungsten_carbide", electrode_material: "copper_tungsten", recent_symptom: "corner_sharpening_lost" }));
    expect(r.top_tips.length).toBeGreaterThan(1);
    for (let i = 1; i < r.top_tips.length; i++) {
      expect(r.top_tips[i].match_score).toBeLessThanOrEqual(r.top_tips[i - 1].match_score);
    }
  });

  it("symptom match boosts score over generic", () => {
    const noSym = eng.surface(nominal({ recent_symptom: null }));
    const withSym = eng.surface(nominal({ recent_symptom: "arc_carbon_track" }));
    expect(withSym.top_tips[0].match_score).toBeGreaterThan(noSym.top_tips[0].match_score);
  });

  it("draft flag matches confidence threshold (<0.75)", () => {
    const r = eng.surface(nominal({ operation: "polishing" }));
    r.top_tips.forEach(t => {
      expect(t.draft).toBe(t.confidence < 0.75);
    });
  });

  it("top_n=3 returns at most 3 tips", () => {
    const r = eng.surface(nominal({ top_n: 3 }));
    expect(r.top_tips.length).toBeLessThanOrEqual(3);
  });

  it("min_confidence=0.95 filters to only highest-confidence tips", () => {
    const r = eng.surface(nominal({ min_confidence: 0.95, top_n: 100 }));
    r.top_tips.forEach(t => expect(t.confidence).toBeGreaterThanOrEqual(0.95));
  });

  it("min_confidence=0.6 surfaces more tips than min_confidence=0.95", () => {
    const rLow = eng.surface(nominal({ min_confidence: 0.6, top_n: 100 }));
    const rHigh = eng.surface(nominal({ min_confidence: 0.95, top_n: 100 }));
    expect(rLow.top_tips.length).toBeGreaterThan(rHigh.top_tips.length);
  });

  it("deionized water + inconel/titanium → no kerosene fire warning", () => {
    const r = eng.surface(nominal({ workpiece_material: "inconel", dielectric: "deionized_water" }));
    expect(r.warnings.some(w => /NFPA 484/.test(w))).toBe(false);
  });

  it("source cites Mitsubishi + Charmilles + AGIE + Sodick + Fanuc + Machinery's Handbook + JM Die", () => {
    const r = eng.surface(nominal());
    expect(r.source).toMatch(/Mitsubishi.*Charmilles.*AGIE.*Sodick.*Fanuc.*Machinery's Handbook.*JM Die/s);
  });

  it("polishing + copper → no-wear + planetary tip surfaces", () => {
    const r = eng.surface(nominal({ operation: "polishing", electrode_material: "copper", recent_symptom: "finish_ra_high" }));
    expect(r.top_tips.some(t => /no-wear|planetary|polishing/i.test(t.tip))).toBe(true);
  });
});
