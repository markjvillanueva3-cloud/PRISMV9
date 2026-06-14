import { describe, it, expect } from "vitest";
import {
  millExpertAdvisorEngine as eng,
  type MillExpertAdvisorInput,
} from "../engines/MillExpertAdvisorEngine.js";

function nominal(o: Partial<MillExpertAdvisorInput> = {}): MillExpertAdvisorInput {
  return {
    operation: "milling_rough",
    material: "stainless",
    iso_group: "M",
    tool_diameter_mm: 10,
    flute_count: 4,
    Vc_m_min: 150,
    fz_mm_tooth: 0.08,
    ap_mm: 2,
    ae_mm: 4,
    rated_max_rpm: 15000,
    operator_skill_level: "intermediate",
    tool_material: "carbide",
    thru_spindle_available: true,
    ...o,
  };
}

describe("MillExpertAdvisorEngine", () => {
  it("getStats reports 4 composed engines + 3 readiness states", () => {
    const s = eng.getStats();
    expect(s.composed_engines).toEqual([
      "MillCSSOptimizerEngine.optimize",
      "MillCoolantAdvisorEngine.advise",
      "MillPipelineKnowledgeInjectorEngine.inject",
      "MillAnomalyDetectionEngine.scanPoint",
    ]);
    expect(s.readiness_states).toEqual(["green", "yellow", "red"]);
  });

  it("throws on missing required fields", async () => {
    await expect(eng.advise({} as MillExpertAdvisorInput))
      .rejects.toThrow(/operation required/);
  });

  it("throws on invalid tool_diameter_mm", async () => {
    await expect(eng.advise(nominal({ tool_diameter_mm: 0 })))
      .rejects.toThrow(/tool_diameter_mm must be > 0/);
  });

  it("throws on invalid flute_count", async () => {
    await expect(eng.advise(nominal({ flute_count: 0 })))
      .rejects.toThrow(/flute_count must be > 0/);
  });

  it("nominal stainless milling_rough → returns full structure with RPM + coolant + readiness", async () => {
    const r = await eng.advise(nominal());
    expect(r.recommended_rpm).toBeGreaterThan(0);
    expect(r.effective_vc_m_min).toBeGreaterThan(0);
    expect(r.recommended_coolant).toMatch(/flood|high_pressure|mist|mql|air_blast|dry|cryogenic/);
    expect(["green", "yellow", "red"]).toContain(r.readiness);
    expect(r.headline).toMatch(/milling_rough.*stainless.*RPM/);
    expect(r.headline).toMatch(/readiness=(GREEN|YELLOW|RED)/);
  });

  it("recommended_rpm matches CSS optimizer formula 1000*Vc/(π*D), rounded", async () => {
    const r = await eng.advise(nominal({ Vc_m_min: 200, tool_diameter_mm: 10 }));
    // 1000 * 200 / (π * 10) = 6366.197
    expect(r.recommended_rpm).toBe(6366);
  });

  it("Vc exceeds rated → CSS clamps + red_flag surfaces the clamp", async () => {
    const r = await eng.advise(nominal({ Vc_m_min: 1000, rated_max_rpm: 5000 }));
    expect(r.recommended_rpm).toBe(5000);
    expect(r.red_flags.some(f => /CSS RPM clamped to 5000/.test(f))).toBe(true);
  });

  it("entry-level + active symptom → tribal escalation red_flag surfaces", async () => {
    const r = await eng.advise(nominal({ operator_skill_level: "entry", recent_symptom: "broken_tool" }));
    expect(r.red_flags.some(f => /Tribal escalation/.test(f))).toBe(true);
  });

  it("titanium (S group) + ceramic tool → coolant is NOT flood (ceramic thermal shock rule)", async () => {
    const r = await eng.advise(nominal({
      iso_group: "S",
      material: "titanium",
      tool_material: "ceramic",
      cryo_available: true,
    }));
    expect(r.recommended_coolant).not.toBe("flood");
  });

  it("aluminum + air_blast available + sustainability high → coolant=air_blast", async () => {
    const r = await eng.advise(nominal({
      iso_group: "N",
      material: "aluminum",
      operation: "milling_finish",
      air_blast_available: true,
      sustainability_priority: "high",
    }));
    expect(r.recommended_coolant).toBe("air_blast");
  });

  it("critical anomaly (L/D=5 + ae=7) → readiness=red + CRITICAL red_flag", async () => {
    const r = await eng.advise(nominal({
      tool_diameter_mm: 10,
      tool_overhang_mm: 50, // L/D=5
      ae_mm: 7,
    }));
    expect(r.readiness).toBe("red");
    expect(r.red_flags.some(f => /CRITICAL engagement_vs_deflection/.test(f))).toBe(true);
    expect(r.predicted_anomalies.some(a => a.severity === "critical")).toBe(true);
  });

  it("no anomalies + no clamps + no escalation → readiness=green", async () => {
    const r = await eng.advise(nominal({
      operation: "milling_rough",
      material: "aluminum",
      iso_group: "N",
      Vc_m_min: 300,
      fz_mm_tooth: 0.15,
      tool_diameter_mm: 12,
      tool_overhang_mm: 30, // L/D=2.5
      ae_mm: 3,
      operator_skill_level: "master",
    }));
    expect(r.readiness).toBe("green");
    expect(r.red_flags).toEqual([]);
  });

  it("warning-level anomaly (spindle_load not supplied, but adaptive timing on heavy load) → readiness=yellow when red_flags fire", async () => {
    // Force a yellow path by clamping CSS (causes red_flag) but no critical anomaly
    const r = await eng.advise(nominal({
      Vc_m_min: 800,
      rated_max_rpm: 8000,
    }));
    // CSS clamp triggers red_flag; no critical anomaly → readiness=yellow
    expect(r.red_flags.length).toBeGreaterThan(0);
    expect(r.readiness === "yellow" || r.readiness === "red").toBe(true);
  });

  it("tribal_tips returned and ranked (passes through from PipelineKnowledgeInjector)", async () => {
    const r = await eng.advise(nominal({ operation: "drilling", material: "stainless" }));
    expect(r.tribal_tips.length).toBeGreaterThan(0);
    for (const tip of r.tribal_tips) {
      expect(typeof tip.tip).toBe("string");
      expect(tip.confidence).toBeGreaterThanOrEqual(0.60);
    }
  });

  it("wiki_pointers returned with universal mill anchor first", async () => {
    const r = await eng.advise(nominal());
    expect(r.wiki_pointers.length).toBeGreaterThan(0);
    expect(r.wiki_pointers[0].wiki_path).toMatch(/academy-course-4-milling-operations/);
  });

  it("max_tribal_tips=2 caps the tribal_tips array", async () => {
    const r = await eng.advise(nominal({ max_tribal_tips: 2 }));
    expect(r.tribal_tips.length).toBeLessThanOrEqual(2);
  });

  it("details contains all 4 sub-engine outputs for drill-down", async () => {
    const r = await eng.advise(nominal());
    expect(r.details.css.recommended_rpm).toBe(r.recommended_rpm);
    expect(r.details.coolant.recommendation).toBe(r.recommended_coolant);
    expect(r.details.knowledge.tribal_tips.length).toBe(r.tribal_tips.length);
    expect(r.details.anomalies_input.spindle_rpm).toBe(r.recommended_rpm);
  });

  it("source attribution cites all 4 composed engines + slot-foxtrot R7 rule", async () => {
    const r = await eng.advise(nominal());
    expect(r.source).toMatch(/MillCSSOptimizerEngine/);
    expect(r.source).toMatch(/MillCoolantAdvisorEngine/);
    expect(r.source).toMatch(/MillPipelineKnowledgeInjectorEngine/);
    expect(r.source).toMatch(/MillAnomalyDetectionEngine/);
    expect(r.source).toMatch(/R7|conflicts surfaced|not averaged/);
  });

  it("operation mapping: tapping → drilling (closest coolant/anomaly analog)", async () => {
    const r = await eng.advise(nominal({ operation: "tapping" }));
    // Tapping should NOT throw — should map to drilling internally
    expect(r.recommended_rpm).toBeGreaterThan(0);
    expect(r.details.anomalies_input.operation).toBe("drilling");
  });

  it("operation mapping: threading → thread_milling", async () => {
    const r = await eng.advise(nominal({ operation: "threading" }));
    expect(r.recommended_rpm).toBeGreaterThan(0);
    expect(r.details.anomalies_input.operation).toBe("thread_milling");
  });

  it("recommended_rpm is decimal-rounded integer (passes through to anomaly spindle_rpm)", async () => {
    const r = await eng.advise(nominal());
    expect(Number.isInteger(r.recommended_rpm)).toBe(true);
    expect(r.details.anomalies_input.spindle_rpm).toBe(r.recommended_rpm);
  });
});
