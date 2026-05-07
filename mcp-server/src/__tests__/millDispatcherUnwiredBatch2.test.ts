/**
 * E2E test for ENGINE-WIRE-MILL-MS0/U-WIRE-MILL-BATCH2 — 6 neural/AI mill
 * engines wired into millDispatcher (prism_mill).
 */
import { describe, it, expect } from "vitest";
import { millingNeuralCognitiveEngine } from "../engines/MillingNeuralCognitiveEngine.js";
import { millingCriticalThinkingEngine } from "../engines/MillingCriticalThinkingEngine.js";
import { millingMetaLearningEngine } from "../engines/MillingMetaLearningEngine.js";
import { millingAIIntegrationEngine } from "../engines/MillingAIIntegrationEngine.js";

const NEW_MILL_ACTION_COUNT = 6;

describe("U-WIRE-MILL-BATCH2 — engines verified directly", () => {
  describe("MillingNeuralCognitiveEngine.quickProcess", () => {
    it("recommends rpm/feed/doc with confidence ∈ [0,1] for steel optimize intent", () => {
      const r = millingNeuralCognitiveEngine.quickProcess({
        query: "Optimize roughing for 4140 prehardened steel",
        intent: "optimize",
        material_iso: "P",
        operation: "roughing",
      });
      expect(r.recommendation.rpm).toBeGreaterThan(0);
      expect(r.recommendation.feed).toBeGreaterThan(0);
      expect(r.recommendation.doc).toBeGreaterThan(0);
      expect(r.confidence).toBeGreaterThanOrEqual(0);
      expect(r.confidence).toBeLessThanOrEqual(1);
      expect(r.recommendation.strategy.length).toBeGreaterThan(0);
    });

    it("scales rpm differently for ISO-N (aluminum) vs ISO-S (superalloy)", () => {
      const al = millingNeuralCognitiveEngine.quickProcess({
        query: "finish 6061",
        intent: "recommend",
        material_iso: "N",
        operation: "finishing",
      });
      const ti = millingNeuralCognitiveEngine.quickProcess({
        query: "finish Ti-6Al-4V",
        intent: "recommend",
        material_iso: "S",
        operation: "finishing",
      });
      // Aluminum (N) speed factor must exceed superalloy (S) — physics invariant
      expect(al.recommendation.rpm).toBeGreaterThan(ti.recommendation.rpm);
    });
  });

  describe("MillingCriticalThinkingEngine.quickAnalyze", () => {
    it("flags hardness >45 HRC with CBN/ceramic recommendation", () => {
      const r = millingCriticalThinkingEngine.quickAnalyze({
        problem: "Tool wearing fast on hardened die",
        domain: "tool_selection",
        material_iso: "H",
        hardness_hrc: 58,
      });
      const recLower = r.recommendation.toLowerCase();
      const mentionsHardTooling = recLower.includes("cbn") || recLower.includes("ceramic");
      expect(mentionsHardTooling).toBe(true);
      expect(r.confidence).toBeGreaterThan(0);
      expect(r.confidence).toBeLessThanOrEqual(1);
    });

    it("recommends polished 2-flute path for ISO-N aluminum", () => {
      const r = millingCriticalThinkingEngine.quickAnalyze({
        problem: "Maximize MRR on 6061",
        domain: "strategy",
        material_iso: "N",
      });
      const recLower = r.recommendation.toLowerCase();
      const mentions2flute = recLower.includes("2-flute") || recLower.includes("polished");
      expect(mentions2flute).toBe(true);
    });

    it("flags ISO-S superalloy with reduced-speeds + HPC coolant guidance", () => {
      const r = millingCriticalThinkingEngine.quickAnalyze({
        problem: "Plan finishing pass on Inconel 718",
        domain: "strategy",
        material_iso: "S",
      });
      const recLower = r.recommendation.toLowerCase();
      const mentionsHpc = recLower.includes("coolant") || recLower.includes("pressure");
      expect(mentionsHpc).toBe(true);
    });
  });

  describe("MillingMetaLearningEngine.learnFromExperience + selfAssess", () => {
    it("records experience and increments total_experiences counter", () => {
      const baseline = millingMetaLearningEngine.getState().total_experiences;
      const id = `exp-batch2-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const r = millingMetaLearningEngine.learnFromExperience({
        id,
        timestamp: new Date().toISOString(),
        operation: "roughing",
        material: "AISI 4140",
        material_iso: "P",
        feature_type: "pocket",
        tool_type: "endmill",
        tool_diameter_mm: 12,
        rpm: 4500,
        feed_mm_min: 1200,
        doc_mm: 6,
        woc_mm: 4,
        success: true,
        cycle_time_min: 18,
        tool_life_achieved_min: 75,
      });
      expect(r.learned).toBe(true);
      const after = millingMetaLearningEngine.getState().total_experiences;
      expect(after).toBe(baseline + 1);
      expect(r.state_update.total_experiences).toBe(after);
    });

    it("self-assess returns calibration with success rate ∈ [0,1] and arrays", () => {
      const r = millingMetaLearningEngine.selfAssess();
      expect(r.prediction_accuracy).toBeGreaterThanOrEqual(0);
      expect(r.prediction_accuracy).toBeLessThanOrEqual(1);
      expect(r.confidence_calibration).toBeGreaterThanOrEqual(0);
      expect(r.confidence_calibration).toBeLessThanOrEqual(1);
      expect(Array.isArray(r.improvement_areas)).toBe(true);
      expect(Array.isArray(r.strengths)).toBe(true);
    });
  });

  describe("MillingAIIntegrationEngine.parseNaturalLanguageQuery", () => {
    it("classifies 'recommend' phrasing as intent=recommend", () => {
      const r = millingAIIntegrationEngine.parseNaturalLanguageQuery(
        "Recommend speeds and feeds for D2 tool steel",
      );
      expect(r.intent).toBe("recommend");
      expect(r.original_query.length).toBeGreaterThan(0);
      // MillingNeuralCognitiveEngine returns 0-1; MillingAIIntegrationEngine returns 0-100% (per JSDoc).
      expect(r.confidence).toBeGreaterThanOrEqual(0);
      expect(r.confidence).toBeLessThanOrEqual(100);
    });

    it("classifies 'why is X failing' as intent=analyze", () => {
      const r = millingAIIntegrationEngine.parseNaturalLanguageQuery(
        "Why is my surface finish poor on graphite electrodes?",
      );
      expect(r.intent).toBe("analyze");
    });

    it("classifies 'troubleshoot/problem' phrasing correctly", () => {
      const r = millingAIIntegrationEngine.parseNaturalLanguageQuery(
        "Having a problem with chatter on thin walls",
      );
      expect(r.intent).toBe("troubleshoot");
    });
  });

  describe("MillingAIIntegrationEngine.getArchiveStats", () => {
    it("returns archive totals where mastercam + nc files sum to total_programs", () => {
      const s = millingAIIntegrationEngine.getArchiveStats();
      expect(s.total_programs).toBe(s.mastercam_files + s.nc_files);
      expect(s.customer_count).toBe(s.customers.length);
      expect(s.machines.length).toBeGreaterThan(0);
    });

    it("date_range earliest precedes latest lexicographically (ISO ordering)", () => {
      const s = millingAIIntegrationEngine.getArchiveStats();
      const earlierThanLatest = s.date_range.earliest < s.date_range.latest;
      expect(earlierThanLatest).toBe(true);
    });
  });
});

describe("U-WIRE-MILL-BATCH2 — dispatcher wiring verified", () => {
  const NEW_ACTIONS = [
    "mill_neural_cognitive_process",
    "mill_critical_analyze",
    "mill_meta_learn_record",
    "mill_meta_learn_self_assess",
    "mill_ai_parse_nl_query",
    "mill_ai_archive_stats",
  ] as const;

  it("registers all 6 new actions in MILL_ACTIONS enum", async () => {
    const mod = await import("../tools/dispatchers/millDispatcher.js");
    const present = NEW_ACTIONS.filter((a) =>
      (mod.MILL_ACTIONS as readonly string[]).includes(a),
    );
    expect(present.length).toBe(NEW_MILL_ACTION_COUNT);
  });

  it("registers all 6 schemas in MILL_ACTION_SCHEMAS", async () => {
    const { MILL_ACTION_SCHEMAS } = await import("../schemas/millActionSchemas.js");
    const present = NEW_ACTIONS.filter(
      (a) => typeof MILL_ACTION_SCHEMAS[a]?.safeParse === "function",
    );
    expect(present.length).toBe(NEW_MILL_ACTION_COUNT);
  });

  it("schema rejects mill_neural_cognitive_process with empty query", async () => {
    const { MILL_ACTION_SCHEMAS } = await import("../schemas/millActionSchemas.js");
    const r = MILL_ACTION_SCHEMAS["mill_neural_cognitive_process"]!.safeParse({
      query: "",
      intent: "optimize",
    });
    expect(r.success).toBe(false);
  });

  it("schema rejects mill_critical_analyze with invalid domain enum", async () => {
    const { MILL_ACTION_SCHEMAS } = await import("../schemas/millActionSchemas.js");
    const r = MILL_ACTION_SCHEMAS["mill_critical_analyze"]!.safeParse({
      problem: "test",
      domain: "not-a-real-domain",
    });
    expect(r.success).toBe(false);
  });

  it("schema rejects mill_meta_learn_record with negative tool_diameter_mm", async () => {
    const { MILL_ACTION_SCHEMAS } = await import("../schemas/millActionSchemas.js");
    const r = MILL_ACTION_SCHEMAS["mill_meta_learn_record"]!.safeParse({
      id: "x",
      timestamp: new Date().toISOString(),
      operation: "roughing",
      material: "4140",
      material_iso: "P",
      feature_type: "pocket",
      tool_type: "endmill",
      tool_diameter_mm: -1,
      rpm: 4500,
      feed_mm_min: 1200,
      doc_mm: 6,
      woc_mm: 4,
      success: true,
    });
    expect(r.success).toBe(false);
  });

  it("schema rejects mill_ai_parse_nl_query with missing query", async () => {
    const { MILL_ACTION_SCHEMAS } = await import("../schemas/millActionSchemas.js");
    const r = MILL_ACTION_SCHEMAS["mill_ai_parse_nl_query"]!.safeParse({});
    expect(r.success).toBe(false);
  });
});
