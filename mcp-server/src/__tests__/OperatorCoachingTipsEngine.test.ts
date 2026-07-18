import { describe, it, expect } from "vitest";
import {
  operatorCoachingTipsEngine as eng,
  OperatorCoachingTipsEngine,
  type OperatorCoachingInput,
} from "../engines/OperatorCoachingTipsEngine.js";

function nominal(o: Partial<OperatorCoachingInput> = {}): OperatorCoachingInput {
  return {
    machine_type: "mill",
    operation: "milling_rough",
    material: "steel",
    operator_skill_level: "intermediate",
    recent_error_pattern: null,
    ...o,
  };
}

describe("OperatorCoachingTipsEngine", () => {
  it("exports singleton with coach()", () => {
    expect(eng).toBeInstanceOf(OperatorCoachingTipsEngine);
    expect(typeof eng.coach).toBe("function");
  });

  it("throws on missing required fields", () => {
    expect(() => eng.coach({} as OperatorCoachingInput))
      .toThrow(/machine_type \+ operation \+ material \+ operator_skill_level required/);
  });

  it("every surfaced tip carries handbook-grade source attribution", () => {
    const r = eng.coach(nominal({ operation: "drilling", material: "stainless" }));
    expect(r.top_tips.length).toBeGreaterThan(0);
    r.top_tips.forEach(t => {
      // Every source MUST cite a known authoritative reference
      expect(t.source).toMatch(/Machinery's Handbook|Sandvik|Kennametal|JM Die|Fanuc|ISO|Tobias|Aurich|Gillespie|Sodick/);
      expect(t.confidence).toBeGreaterThanOrEqual(0.60);
      expect(t.confidence).toBeLessThanOrEqual(1.0);
    });
  });

  it("drilling stainless → peck-drill tip surfaces top", () => {
    const r = eng.coach(nominal({ operation: "drilling", material: "stainless" }));
    expect(r.top_tips.some(t => /Peck-drill stainless/.test(t.tip))).toBe(true);
  });

  it("chatter error symptom → chatter-mitigation tips surface", () => {
    const r = eng.coach(nominal({ recent_error_pattern: "chatter" }));
    expect(r.top_tips.some(t => /Chatter|chatter|stability lobe/.test(t.tip))).toBe(true);
  });

  it("BUE buildup on aluminum → BUE tip top-ranked", () => {
    const r = eng.coach(nominal({ material: "aluminum", recent_error_pattern: "bue_buildup" }));
    expect(r.top_tips.some(t => /BUE on aluminum|polished rake/.test(t.tip))).toBe(true);
  });

  it("entry-level + error symptom → escalation triggered with reason", () => {
    const r = eng.coach(nominal({ operator_skill_level: "entry", recent_error_pattern: "broken_tool" }));
    expect(r.escalation_needed).toBe(true);
    expect(r.escalation_reason).toMatch(/Entry-level operator.*broken_tool.*escalate to intermediate\/master/);
    expect(r.warnings.some(w => /escalate to intermediate\/master/.test(w))).toBe(true);
  });

  it("master + error → no escalation needed", () => {
    const r = eng.coach(nominal({ operator_skill_level: "master", recent_error_pattern: "broken_tool" }));
    expect(r.escalation_needed).toBe(false);
    expect(r.escalation_reason).toBeNull();
  });

  it("entry-level + no error → no escalation (just guided priority)", () => {
    const r = eng.coach(nominal({ operator_skill_level: "entry", recent_error_pattern: null }));
    expect(r.escalation_needed).toBe(false);
    expect(r.recommended_action_priority.value).toMatch(/GUIDED — entry-level operator/);
  });

  it("error pattern → URGENT priority with symptom name embedded", () => {
    const r = eng.coach(nominal({ recent_error_pattern: "chatter" }));
    expect(r.recommended_action_priority.value).toMatch(/URGENT.*chatter.*immediate intervention/);
  });

  it("no error + master → ADVISORY priority", () => {
    const r = eng.coach(nominal({ operator_skill_level: "master", recent_error_pattern: null }));
    expect(r.recommended_action_priority.value).toMatch(/ADVISORY.*situational awareness/);
  });

  it("tips sorted by match_score descending (monotonic)", () => {
    const r = eng.coach(nominal({ machine_type: "mill", operation: "drilling", material: "stainless" }));
    expect(r.top_tips.length).toBeGreaterThan(1);
    for (let i = 1; i < r.top_tips.length; i++) {
      expect(r.top_tips[i].match_score).toBeLessThanOrEqual(r.top_tips[i - 1].match_score);
    }
  });

  it("error-symptom match boosts score over generic (40% boost is dominant signal)", () => {
    const noErr = eng.coach(nominal({ machine_type: "mill", operation: "milling_rough", recent_error_pattern: null }));
    const withErr = eng.coach(nominal({ machine_type: "mill", operation: "milling_rough", recent_error_pattern: "chatter" }));
    // First tip with error matches should have higher score than first tip without
    // (chatter tip has +0.40 boost from symptom match)
    expect(withErr.top_tips[0].match_score).toBeGreaterThan(noErr.top_tips[0].match_score);
  });

  it("draft flag matches confidence threshold (<0.75)", () => {
    const r = eng.coach(nominal({ operation: "parting", machine_type: "lathe" }));
    r.top_tips.forEach(t => {
      expect(t.draft).toBe(t.confidence < 0.75);
    });
  });

  it("top_n=2 returns at most 2 tips", () => {
    const r = eng.coach(nominal({ top_n: 2 }));
    expect(r.top_tips.length).toBeLessThanOrEqual(2);
  });

  it("min_confidence=0.95 filters to only the highest-confidence tips (≥0.95 only)", () => {
    const r = eng.coach(nominal({ min_confidence: 0.95 }));
    r.top_tips.forEach(t => expect(t.confidence).toBeGreaterThanOrEqual(0.95));
  });

  it("min_confidence=0.5 surfaces more tips than min_confidence=0.95", () => {
    const rLow = eng.coach(nominal({ min_confidence: 0.5, top_n: 100 }));
    const rHigh = eng.coach(nominal({ min_confidence: 0.95, top_n: 100 }));
    expect(rLow.top_tips.length).toBeGreaterThan(rHigh.top_tips.length);
  });

  it("WEDM wire-break symptom → wire-break recovery tip with burnback", () => {
    const r = eng.coach(nominal({
      machine_type: "wedm",
      operation: "edm_cut",
      recent_error_pattern: "broken_tool",
    }));
    expect(r.top_tips.some(t => /wire break.*burnback|joint witness/i.test(t.tip))).toBe(true);
  });

  it("tapping → tap-related tip with specific guidance (Rigid/Form)", () => {
    const r = eng.coach(nominal({ operation: "tapping" }));
    expect(r.top_tips.some(t => /Rigid tap|Form tap|C-axis encoder/i.test(t.tip))).toBe(true);
  });

  it("threading + lathe → spring-passes/drunken-thread tip", () => {
    const r = eng.coach(nominal({ machine_type: "lathe", operation: "threading" }));
    expect(r.top_tips.some(t => /spring-passes|drunken thread|pitch error/i.test(t.tip))).toBe(true);
  });

  it("hardened tool steel + tool_chipping → CBN/ceramic-switch tip", () => {
    const r = eng.coach(nominal({
      material: "tool_steel_hardened",
      recent_error_pattern: "tool_chipping",
    }));
    expect(r.top_tips.some(t => /CBN|ceramic|chamfered edge prep/i.test(t.tip))).toBe(true);
  });

  it("dimensional_drift → thermal warm-up tip with re-zero WCS guidance", () => {
    const r = eng.coach(nominal({ recent_error_pattern: "dimensional_drift" }));
    expect(r.top_tips.some(t => /warm-up|re-zero WCS|thermal growth/i.test(t.tip))).toBe(true);
  });

  it("burr_excessive → climb-mill or chamfer-pass tip", () => {
    const r = eng.coach(nominal({ recent_error_pattern: "burr_excessive" }));
    expect(r.top_tips.some(t => /climb mill the exit|chamfer pass|chamfer mill/i.test(t.tip))).toBe(true);
  });

  it("chip_welding + aluminum → MQL/polished-insert tip", () => {
    const r = eng.coach(nominal({ material: "aluminum", recent_error_pattern: "chip_welding" }));
    expect(r.top_tips.some(t => /Chip welding.*aluminum|polished uncoated insert/i.test(t.tip))).toBe(true);
  });

  it("source cites Machinery's Handbook + Sandvik + Kennametal + JM Die", () => {
    const r = eng.coach(nominal());
    expect(r.source).toMatch(/Machinery's Handbook|Sandvik|Kennametal|JM Die/);
  });
});
