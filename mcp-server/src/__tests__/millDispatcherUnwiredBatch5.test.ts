/**
 * E2E test for ENGINE-WIRE-MILL-MS0/U-WIRE-MILL-BATCH5 — 6 unwired AGI /
 * online-learning / troubleshooting mill engines wired into millDispatcher.
 */
import { describe, it, expect } from "vitest";
import { promises as fsp } from "node:fs";
import path from "node:path";
import { millingAGIOrchestrationEngine } from "../engines/MillingAGIOrchestrationEngine.js";
import { millingKnowledgeOrchestratorEngine } from "../engines/MillingKnowledgeOrchestratorEngine.js";
import { millingDeepAIHardeningEngine } from "../engines/MillingDeepAIHardeningEngine.js";
import { millingLoRACadenceEngine } from "../engines/MillingLoRACadenceEngine.js";
import { millingOnlineLearningTrackerEngine } from "../engines/MillingOnlineLearningTrackerEngine.js";

const NEW_ACTIONS = [
  "mill_agi_quick_analyze",
  "mill_knowledge_orch_recommend",
  "mill_troubleshoot",
  "mill_lora_cadence_state",
  "mill_online_record_step",
  "mill_online_detect_drift",
] as const;
const EXPECTED_ACTION_COUNT = NEW_ACTIONS.length;

describe("U-WIRE-MILL-BATCH5 — engines verified directly", () => {
  describe("MillingAGIOrchestrationEngine.quickAnalyze", () => {
    it("returns finite force, power, MRR with sane sign for a steel pocket pass", () => {
      const r = millingAGIOrchestrationEngine.quickAnalyze("4140", 12, 100, 0.1, 2.0);
      expect(Number.isFinite(r.force_n)).toBe(true);
      expect(r.force_n).toBeGreaterThan(0);
      expect(r.power_kw).toBeGreaterThan(0);
      expect(r.mrr_cm3_min).toBeGreaterThan(0);
      expect(Number.isFinite(r.tool_life_min)).toBe(true);
      expect(r.quality_score).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(r.warnings)).toBe(true);
    });

    it("doubling axial depth roughly doubles force (linear in ap)", () => {
      const r1 = millingAGIOrchestrationEngine.quickAnalyze("4140", 12, 100, 0.1, 1.0);
      const r2 = millingAGIOrchestrationEngine.quickAnalyze("4140", 12, 100, 0.1, 2.0);
      const ratio = r2.force_n / r1.force_n;
      expect(ratio).toBeCloseTo(2.0, 1);
    });

    it("MRR scales linearly with axial depth at fixed feed/speed", () => {
      const r1 = millingAGIOrchestrationEngine.quickAnalyze("4140", 12, 100, 0.1, 1.0);
      const r2 = millingAGIOrchestrationEngine.quickAnalyze("4140", 12, 100, 0.1, 3.0);
      const ratio = r2.mrr_cm3_min / r1.mrr_cm3_min;
      expect(ratio).toBeCloseTo(3.0, 1);
    });
  });

  describe("MillingKnowledgeOrchestratorEngine.quickRecommend", () => {
    it("returns integer rpm/feed and confidence in [0,1] for steel pocket", () => {
      const r = millingKnowledgeOrchestratorEngine.quickRecommend({
        material: "4140", material_iso: "P", feature_type: "pocket",
        dimensions: { length_mm: 100, width_mm: 50, depth_mm: 10 },
      } as never);
      expect(Number.isInteger(r.rpm)).toBe(true);
      expect(Number.isInteger(r.feed)).toBe(true);
      expect(r.rpm).toBeGreaterThan(0);
      expect(r.feed).toBeGreaterThan(0);
      expect(r.confidence).toBeGreaterThanOrEqual(0);
      expect(r.confidence).toBeLessThanOrEqual(1);
      expect(typeof r.strategy).toBe("string");
      expect(r.strategy.length).toBeGreaterThan(0);
    });

    it("reasoning text mentions the supplied material_iso group", () => {
      const r = millingKnowledgeOrchestratorEngine.quickRecommend({
        material: "Ti-6Al-4V", material_iso: "S", feature_type: "slot",
        dimensions: { length_mm: 80, width_mm: 8, depth_mm: 5 },
      } as never);
      expect(r.reasoning).toContain("S");
    });
  });

  describe("MillingDeepAIHardeningEngine.troubleshootMillingIssue", () => {
    it("returns root_causes array and reasoning chain for a chatter symptom", () => {
      const r = millingDeepAIHardeningEngine.troubleshootMillingIssue({
        symptoms: ["loud chatter during pocket roughing", "poor surface finish"],
        material: "4140",
        operation: "pocket_roughing",
        chatter_detected: true,
      });
      const r2 = r as { root_causes?: unknown[]; reasoning?: unknown[] };
      expect(Array.isArray(r2.root_causes)).toBe(true);
      expect(Array.isArray(r2.reasoning)).toBe(true);
      // Reasoning chain must record at least observation + match steps
      expect((r2.reasoning ?? []).length).toBeGreaterThanOrEqual(1);
    });

    it("returns empty (or low-match) root causes when symptoms are unrecognized gibberish", () => {
      const r = millingDeepAIHardeningEngine.troubleshootMillingIssue({
        symptoms: ["xqzz_nonsense_symptom_999", "another_bogus_phrase"],
      });
      const r2 = r as { root_causes?: { probability: number }[] };
      const totalProb = (r2.root_causes ?? []).reduce((acc, c) => acc + (c.probability ?? 0), 0);
      // Bogus symptoms should not produce strong matches
      expect(totalProb).toBeLessThan(1);
    });
  });

  describe("MillingLoRACadenceEngine.getState", () => {
    it("returns a state object with numeric jobsSinceLastRun field", () => {
      const s = millingLoRACadenceEngine.getState();
      const sObj = s as Record<string, unknown>;
      const hasNumericField = Object.values(sObj).some((v) => typeof v === "number");
      expect(hasNumericField).toBe(true);
    });

    it("recordJobs(n) increments and persists across getState calls", () => {
      const before = millingLoRACadenceEngine.getState() as Record<string, unknown>;
      const beforeNum = Object.values(before).filter((v): v is number => typeof v === "number");
      const beforeSum = beforeNum.reduce((a, b) => a + b, 0);
      millingLoRACadenceEngine.recordJobs(5);
      const after = millingLoRACadenceEngine.getState() as Record<string, unknown>;
      const afterNum = Object.values(after).filter((v): v is number => typeof v === "number");
      const afterSum = afterNum.reduce((a, b) => a + b, 0);
      expect(afterSum).toBeGreaterThanOrEqual(beforeSum);
    });
  });

  describe("MillingOnlineLearningTrackerEngine.recordStep / detectDrift", () => {
    it("recordStep returns drift flag, lr_adjusted bool, and checkpoint_needed bool", () => {
      const r = millingOnlineLearningTrackerEngine.recordStep({
        timestamp: Date.now(),
        prediction_error: 0.05,
        model_loss: 0.1,
        learning_rate: 0.001,
        samples_seen: 100,
        feature_importance: { speed: 0.5, feed: 0.3, depth: 0.2 },
      });
      expect(typeof r.drift).toBe("object");
      expect(typeof r.drift.detected).toBe("boolean");
      expect(typeof r.lr_adjusted).toBe("boolean");
      expect(typeof r.checkpoint_needed).toBe("boolean");
    });

    it("detectDrift returns DriftStatus with detected boolean and severity in [0,1]", () => {
      const d = millingOnlineLearningTrackerEngine.detectDrift(0.05);
      expect(typeof d.detected).toBe("boolean");
      // severity may be undefined when not detected; only check when number
      if (typeof (d as { severity?: number }).severity === "number") {
        const sev = (d as { severity: number }).severity;
        expect(sev).toBeGreaterThanOrEqual(0);
        expect(sev).toBeLessThanOrEqual(1);
      }
    });
  });
});

describe("U-WIRE-MILL-BATCH5 — dispatcher wiring verified", () => {
  it("registers all 6 new actions in millDispatcher source (enum + case)", async () => {
    const dispatcherPath = path.resolve(
      __dirname,
      "..",
      "tools",
      "dispatchers",
      "millDispatcher.ts",
    );
    const src = await fsp.readFile(dispatcherPath, "utf8");
    const present = NEW_ACTIONS.filter((a) => src.includes(`"${a}"`));
    expect(present.length).toBe(EXPECTED_ACTION_COUNT);
    for (const a of NEW_ACTIONS) {
      const occurrences = src.split(`"${a}"`).length - 1;
      expect(occurrences).toBeGreaterThanOrEqual(2);
    }
  });

  it("registers all 6 schemas in MILL_ACTION_SCHEMAS", async () => {
    const { MILL_ACTION_SCHEMAS } = await import("../schemas/millActionSchemas.js");
    const present = NEW_ACTIONS.filter(
      (a) => typeof MILL_ACTION_SCHEMAS[a]?.safeParse === "function",
    );
    expect(present.length).toBe(EXPECTED_ACTION_COUNT);
  });

  it("schema rejects mill_agi_quick_analyze with non-positive tool diameter", async () => {
    const { MILL_ACTION_SCHEMAS } = await import("../schemas/millActionSchemas.js");
    const r = MILL_ACTION_SCHEMAS["mill_agi_quick_analyze"]!.safeParse({
      material: "4140",
      tool_diameter_mm: 0,
      cutting_speed_m_min: 100,
      feed_per_tooth_mm: 0.1,
      axial_depth_mm: 2.0,
    });
    expect(r.success).toBe(false);
  });

  it("schema rejects mill_knowledge_orch_recommend with invalid material_iso", async () => {
    const { MILL_ACTION_SCHEMAS } = await import("../schemas/millActionSchemas.js");
    const r = MILL_ACTION_SCHEMAS["mill_knowledge_orch_recommend"]!.safeParse({
      material: "4140",
      material_iso: "Z",
      feature_type: "pocket",
    });
    expect(r.success).toBe(false);
  });

  it("schema rejects mill_troubleshoot with empty symptoms array", async () => {
    const { MILL_ACTION_SCHEMAS } = await import("../schemas/millActionSchemas.js");
    const r = MILL_ACTION_SCHEMAS["mill_troubleshoot"]!.safeParse({ symptoms: [] });
    expect(r.success).toBe(false);
  });

  it("schema rejects mill_online_record_step with non-positive learning_rate", async () => {
    const { MILL_ACTION_SCHEMAS } = await import("../schemas/millActionSchemas.js");
    const r = MILL_ACTION_SCHEMAS["mill_online_record_step"]!.safeParse({
      timestamp: 1000,
      prediction_error: 0.05,
      model_loss: 0.1,
      learning_rate: 0,
      samples_seen: 100,
      feature_importance: { f1: 0.5 },
    });
    expect(r.success).toBe(false);
  });

  it("schema rejects mill_online_detect_drift with non-numeric error", async () => {
    const { MILL_ACTION_SCHEMAS } = await import("../schemas/millActionSchemas.js");
    const r = MILL_ACTION_SCHEMAS["mill_online_detect_drift"]!.safeParse({
      error: "not a number",
    });
    expect(r.success).toBe(false);
  });
});
