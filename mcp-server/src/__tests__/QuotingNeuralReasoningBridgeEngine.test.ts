/**
 * Tests for QuotingNeuralReasoningBridgeEngine — QUOTING-PIPELINE-MS0 / U-QP14.
 * Concrete routing-matrix invariants — no toBeDefined / toBeTruthy stubs.
 */
import { describe, it, expect } from "vitest";
import { QuotingNeuralReasoningBridgeEngine } from "../engines/QuotingNeuralReasoningBridgeEngine.js";

const eng = new QuotingNeuralReasoningBridgeEngine();

describe("QuotingNeuralReasoningBridgeEngine.route — happy path per task class", () => {
  it("blueprint_to_quote → prism_calc conventional low (deterministic physics)", () => {
    const r = eng.route({ task_class: "blueprint_to_quote", prompt: "Quote part-12345" });
    expect(r.ai_substrate).toBe("prism_calc");
    expect(r.reasoning_mode).toBe("conventional");
    expect(r.cost_class).toBe("low");
  });

  it("live_troubleshoot → claude exploratory medium (LLM reasoning + citations)", () => {
    const r = eng.route({ task_class: "live_troubleshoot", prompt: "Tool is breaking" });
    expect(r.ai_substrate).toBe("claude");
    expect(r.reasoning_mode).toBe("exploratory");
    expect(r.cost_class).toBe("medium");
  });

  it("quote_anomaly_detect → prism_creative_reasoning hybrid medium", () => {
    const r = eng.route({ task_class: "quote_anomaly_detect", prompt: "This quote 3x normal" });
    expect(r.ai_substrate).toBe("prism_creative_reasoning");
    expect(r.reasoning_mode).toBe("hybrid");
  });

  it("competitive_bid → prism_creative_reasoning optimal high (deepest reasoning)", () => {
    const r = eng.route({ task_class: "competitive_bid", prompt: "Maximize win rate at margin ≥0.18" });
    expect(r.ai_substrate).toBe("prism_creative_reasoning");
    expect(r.reasoning_mode).toBe("optimal");
    expect(r.cost_class).toBe("high");
  });

  it("insert_replacement → tribal_rag conventional low (vendor catalog query)", () => {
    const r = eng.route({ task_class: "insert_replacement", prompt: "Sandvik CNMG120408 alt" });
    expect(r.ai_substrate).toBe("tribal_rag");
  });

  it("machine_parts_sourcing → prism_calc conventional low (deterministic catalog cross-ref)", () => {
    const r = eng.route({ task_class: "machine_parts_sourcing", prompt: "Haas VF-2 BOM" });
    expect(r.ai_substrate).toBe("prism_calc");
  });
});

describe("QuotingNeuralReasoningBridgeEngine.route — R12 fail-loud", () => {
  it("unknown task class → safe Claude fallback with explicit reason (not silent default)", () => {
    // @ts-expect-error testing runtime guard
    const r = eng.route({ task_class: "bogus_class", prompt: "X" });
    expect(r.ai_substrate).toBe("claude");
    expect(r.reason).toMatch(/unknown-task-class:bogus_class/);
  });

  it("null request → Claude fallback with reason", () => {
    // @ts-expect-error testing runtime guard
    const r = eng.route(null);
    expect(r.ai_substrate).toBe("claude");
    expect(r.reason).toMatch(/unknown-task-class:null/);
  });

  it("decision always carries reason + task_class + original_prompt", () => {
    const r = eng.route({ task_class: "blueprint_to_quote", prompt: "Quote it" });
    expect(typeof r.reason).toBe("string");
    expect(r.reason.length).toBeGreaterThan(0);
    expect(r.task_class).toBe("blueprint_to_quote");
    expect(r.original_prompt).toBe("Quote it");
  });
});

describe("QuotingNeuralReasoningBridgeEngine.inspectPsnSynergy — runtime probe", () => {
  it("all probes positive → all 4 legs flagged wired", () => {
    const s = eng.inspectPsnSynergy({
      aiRouterFn: () => null,
      reasoningFn: () => null,
      psiDeltaFedRecently: true,
      systemVizHasNode: true,
    });
    expect(s.ai_routing).toBe(true);
    expect(s.deep_reasoning).toBe(true);
    expect(s.nn_gnn_feed).toBe(true);
    expect(s.system_viz_node).toBe(true);
  });

  it("no probes → all 4 legs flagged not-wired (R12 fail-loud)", () => {
    const s = eng.inspectPsnSynergy({});
    expect(s.ai_routing).toBe(false);
    expect(s.deep_reasoning).toBe(false);
    expect(s.nn_gnn_feed).toBe(false);
    expect(s.system_viz_node).toBe(false);
  });

  it("non-function aiRouterFn (string) → ai_routing false (type-check honest)", () => {
    const s = eng.inspectPsnSynergy({ aiRouterFn: "not-a-function" });
    expect(s.ai_routing).toBe(false);
  });
});

describe("QuotingNeuralReasoningBridgeEngine.supportedTaskClasses", () => {
  it("returns exactly the 6 declared task classes in stable order", () => {
    const c = eng.supportedTaskClasses();
    expect(c).toEqual([
      "blueprint_to_quote",
      "insert_replacement",
      "machine_parts_sourcing",
      "live_troubleshoot",
      "quote_anomaly_detect",
      "competitive_bid",
    ]);
  });
});

describe("QuotingNeuralReasoningBridgeEngine — cost-class invariant (R5 model-for-judgment)", () => {
  it("'high' cost class reserved for genuinely deep reasoning (≥1 task uses it, but most are low/medium)", () => {
    const counts = { low: 0, medium: 0, high: 0 };
    for (const tc of eng.supportedTaskClasses()) {
      const r = eng.route({ task_class: tc, prompt: "" });
      counts[r.cost_class]++;
    }
    expect(counts.low).toBeGreaterThanOrEqual(3);   // majority cheap
    expect(counts.high).toBeLessThanOrEqual(1);     // expensive is rare
  });
});
