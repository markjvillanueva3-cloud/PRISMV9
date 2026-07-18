import { describe, it, expect } from "vitest";
import {
  grindingTribalCorpusEngine as eng,
  GrindingTribalCorpusEngine,
  type GrindCorpusInput,
} from "../engines/GrindingTribalCorpusEngine.js";

function nominal(o: Partial<GrindCorpusInput> = {}): GrindCorpusInput {
  return {
    operation: "surface_grind",
    wheel: "aluminum_oxide_tough",
    workpiece: "soft_steel",
    coolant: "flood_water_soluble",
    operator_skill_level: "intermediate",
    recent_symptom: null,
    ...o,
  };
}

describe("GrindingTribalCorpusEngine", () => {
  it("exports singleton with surface()", () => {
    expect(eng).toBeInstanceOf(GrindingTribalCorpusEngine);
    expect(typeof eng.surface).toBe("function");
  });

  it("throws on missing required fields", () => {
    expect(() => eng.surface({} as GrindCorpusInput))
      .toThrow(/operation \+ wheel \+ workpiece \+ coolant \+ operator_skill_level required/);
  });

  it("every surfaced tip carries handbook-grade source attribution", () => {
    const r = eng.surface(nominal({ workpiece: "tool_steel_hardened", wheel: "cbn" }));
    expect(r.top_tips.length).toBeGreaterThan(0);
    r.top_tips.forEach(t => {
      expect(t.source).toMatch(/Norton|3M Cubitron|Saint-Gobain|Studer|United Grinding|Machinery's Handbook|Malkin|ANSI|ISO|JM Die/);
      expect(t.confidence).toBeGreaterThanOrEqual(0.60);
      expect(t.confidence).toBeLessThanOrEqual(1.0);
    });
  });

  it("hardened tool steel + CBN → CBN-life tip surfaces", () => {
    const r = eng.surface(nominal({ workpiece: "tool_steel_hardened", wheel: "cbn" }));
    expect(r.top_tips.some(t => /CBN.*10×|CBN wheel.*hardened/i.test(t.tip))).toBe(true);
  });

  it("tungsten carbide + Al₂O₃ → mismatch warning", () => {
    const r = eng.surface(nominal({ workpiece: "tungsten_carbide", wheel: "aluminum_oxide_tough" }));
    expect(r.warnings.some(w => /MISMATCH.*tungsten_carbide|switch to diamond/i.test(w))).toBe(true);
  });

  it("ceramic + non-diamond → mismatch warning", () => {
    const r = eng.surface(nominal({ workpiece: "ceramic_part", wheel: "cbn" }));
    expect(r.warnings.some(w => /MISMATCH.*ceramic|diamond wheel required/i.test(w))).toBe(true);
  });

  it("hardened tool steel + Al₂O₃ → suboptimal warning", () => {
    const r = eng.surface(nominal({ workpiece: "tool_steel_hardened", wheel: "aluminum_oxide_friable" }));
    expect(r.warnings.some(w => /SUBOPTIMAL.*hardened tool steel.*Al₂O₃|10× shorter/i.test(w))).toBe(true);
  });

  it("creep-feed + dry → coolant hazard warning", () => {
    const r = eng.surface(nominal({ operation: "creep_feed", coolant: "dry" }));
    expect(r.warnings.some(w => /HAZARD.*creep-feed.*dry|burn within seconds|full-pour coolant MANDATORY/i.test(w))).toBe(true);
  });

  it("workpiece_burn symptom → DOC/coolant tip surfaces", () => {
    const r = eng.surface(nominal({ recent_symptom: "workpiece_burn" }));
    expect(r.top_tips.some(t => /Workpiece burn|REDUCE depth|increase coolant/i.test(t.tip))).toBe(true);
  });

  it("wheel_glazing symptom → dressing tip surfaces", () => {
    const r = eng.surface(nominal({ recent_symptom: "wheel_glazing" }));
    expect(r.top_tips.some(t => /Diamond.*dress|dressing strategy|aggressive dress/i.test(t.tip))).toBe(true);
  });

  it("entry-level + symptom → escalation with $ scrap-risk", () => {
    const r = eng.surface(nominal({ operator_skill_level: "entry", recent_symptom: "workpiece_burn" }));
    expect(r.escalation_needed).toBe(true);
    expect(r.escalation_reason).toMatch(/Entry-level.*workpiece_burn.*escalate|tool-steel block scrap/i);
  });

  it("entry-level + carbide → escalation (brittle material)", () => {
    const r = eng.surface(nominal({ operator_skill_level: "entry", workpiece: "tungsten_carbide", wheel: "diamond" }));
    expect(r.escalation_needed).toBe(true);
    expect(r.escalation_reason).toMatch(/tungsten_carbide|brittle material|diamond wheel selection/);
  });

  it("entry-level + ceramic → escalation", () => {
    const r = eng.surface(nominal({ operator_skill_level: "entry", workpiece: "ceramic_part", wheel: "diamond" }));
    expect(r.escalation_needed).toBe(true);
    expect(r.escalation_reason).toMatch(/ceramic_part|brittle material/);
  });

  it("master + symptom → no escalation", () => {
    const r = eng.surface(nominal({ operator_skill_level: "master", recent_symptom: "workpiece_burn" }));
    expect(r.escalation_needed).toBe(false);
    expect(r.escalation_reason).toBeNull();
  });

  it("recent_symptom → URGENT priority", () => {
    const r = eng.surface(nominal({ recent_symptom: "chatter_marks" }));
    expect(r.recommended_action_priority.value).toMatch(/URGENT.*chatter_marks/);
  });

  it("entry-level + no symptom → GUIDED priority", () => {
    const r = eng.surface(nominal({ operator_skill_level: "entry", recent_symptom: null }));
    expect(r.recommended_action_priority.value).toMatch(/GUIDED.*entry-level/);
  });

  it("tungsten carbide → ELEVATED priority", () => {
    const r = eng.surface(nominal({ workpiece: "tungsten_carbide", wheel: "diamond" }));
    expect(r.recommended_action_priority.value).toMatch(/ELEVATED.*tungsten_carbide/);
  });

  it("creep-feed → ELEVATED priority", () => {
    const r = eng.surface(nominal({ operation: "creep_feed", coolant: "flood_water_soluble" }));
    expect(r.recommended_action_priority.value).toMatch(/ELEVATED.*creep-feed/);
  });

  it("tips sorted by match_score descending", () => {
    const r = eng.surface(nominal({ workpiece: "tool_steel_hardened", wheel: "cbn", recent_symptom: "workpiece_burn" }));
    expect(r.top_tips.length).toBeGreaterThan(1);
    for (let i = 1; i < r.top_tips.length; i++) {
      expect(r.top_tips[i].match_score).toBeLessThanOrEqual(r.top_tips[i - 1].match_score);
    }
  });

  it("symptom match boosts score over generic", () => {
    const noSym = eng.surface(nominal({ recent_symptom: null }));
    const withSym = eng.surface(nominal({ recent_symptom: "workpiece_burn" }));
    expect(withSym.top_tips[0].match_score).toBeGreaterThan(noSym.top_tips[0].match_score);
  });

  it("draft flag matches confidence threshold (<0.75)", () => {
    const r = eng.surface(nominal({ operation: "centerless_grind" }));
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

  it("Inconel + ceramic Cubitron II → ceramic-grain tip surfaces", () => {
    const r = eng.surface(nominal({ workpiece: "inconel_titanium", wheel: "ceramic_cubitron2" }));
    expect(r.top_tips.some(t => /Cubitron II|ceramic.*Cubitron|stainless.*Inconel/i.test(t.tip))).toBe(true);
  });

  it("source cites Norton + 3M + Saint-Gobain + Studer + United + MH + Malkin + ANSI + JM Die", () => {
    const r = eng.surface(nominal());
    expect(r.source).toMatch(/Norton.*3M.*Saint-Gobain.*Studer.*United Grinding.*Machinery's Handbook.*Malkin.*ANSI.*JM Die/s);
  });

  it("safe combo (soft steel + Al₂O₃ + water-soluble) → no mismatch/hazard warning", () => {
    const r = eng.surface(nominal());
    expect(r.warnings.some(w => /MISMATCH|HAZARD/.test(w))).toBe(false);
  });
});
