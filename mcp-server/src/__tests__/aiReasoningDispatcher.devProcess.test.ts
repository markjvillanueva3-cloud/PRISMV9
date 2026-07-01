/**
 * aiReasoningDispatcher.devProcess.test.ts — dev-process reasoning + learning
 * orphans, wired through prism_ai (U-WIRE07).
 *
 * Covers 8 actions across 3 engines:
 *   - CausalReasoningEngine        → ai_causal_add_edge / trace_impact / root_causes
 *   - ExceptionLearningEngine      → ai_exception_handle / record_outcome / stats
 *   - MetaLearningOptimizerEngine  → ai_metalearn_record / recommend
 *
 * Each group: happy path + failure modes (bad input, boundary, missing/wrong
 * type) + adversarial (NaN, Infinity, empty string, oversize). Variability:
 * three spanning configurations are exercised per group (different polarities
 * for causal, all four exception types, multiple scenario × strategy combos
 * for meta-learning).
 *
 * Engines are singletons with shared in-memory state; tests use unique
 * U07_-prefixed identifiers and clear() the causal + meta-learning singletons
 * before suites that need fresh state.
 *
 * @milestone WIRE-MS0/U-WIRE07
 */

import { describe, it, expect, beforeAll, beforeEach } from "vitest";

import {
  executeAIReasoningAction,
  type AIReasoningAction,
} from "../tools/dispatchers/aiReasoningDispatcher.js";
import { causalReasoningEngine } from "../engines/CausalReasoningEngine.js";
import { metaLearningOptimizerEngine } from "../engines/MetaLearningOptimizerEngine.js";

async function invoke(
  action: AIReasoningAction,
  params: Record<string, unknown> = {},
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  return executeAIReasoningAction(action, params);
}

beforeAll(() => {
  causalReasoningEngine.clear();
  metaLearningOptimizerEngine.clear();
});

// ── CausalReasoningEngine — 3 actions ───────────────────────────────────────

describe("aiReasoningDispatcher — ai_causal_* (CausalReasoningEngine)", () => { // actions: causal_add_edge / causal_trace_impact / causal_root_causes
  beforeEach(() => {
    causalReasoningEngine.clear();
  });

  it("adds an edge and reports it from traceImpact (positive polarity)", async () => {
    const add = await invoke("causal_add_edge", {
      from: "U07_chip_load_high",
      to: "U07_tool_wear_high",
      confidence: 0.9,
      polarity: "positive",
      reason: "Higher chip load -> more abrasion",
    });
    expect(add.success).toBe(true);
    const edge = add.data as Record<string, unknown>;
    expect(edge.from).toBe("U07_chip_load_high");
    expect(edge.to).toBe("U07_tool_wear_high");
    expect(edge.confidence).toBe(0.9);

    const trace = await invoke("causal_trace_impact", {
      source: "U07_chip_load_high",
      maxHops: 2,
    });
    expect(trace.success).toBe(true);
    const report = trace.data as { paths: Array<{ target: string; confidence: number; polarity: string }> };
    expect(report.paths.length).toBe(1);
    expect(report.paths[0].target).toBe("U07_tool_wear_high");
    expect(report.paths[0].confidence).toBeCloseTo(0.9, 4);
    expect(report.paths[0].polarity).toBe("positive");
  });

  it("flips polarity through a chain of mixed-sign edges (positive x negative = negative)", async () => {
    await invoke("causal_add_edge", {
      from: "U07_speed_high", to: "U07_temp_high",
      confidence: 0.8, polarity: "positive",
    });
    await invoke("causal_add_edge", {
      from: "U07_temp_high", to: "U07_finish_quality",
      confidence: 0.6, polarity: "negative",
    });
    const trace = await invoke("causal_trace_impact", {
      source: "U07_speed_high",
      maxHops: 3,
    });
    const report = trace.data as { paths: Array<{ target: string; polarity: string; confidence: number }> };
    const finishPaths = report.paths.filter((p) => p.target === "U07_finish_quality");
    expect(finishPaths.length).toBe(1);
    expect(finishPaths[0].polarity).toBe("negative");
    expect(finishPaths[0].confidence).toBeCloseTo(0.8 * 0.6, 4);
  });

  it("rootCauses walks edges backward to nodes with no parents", async () => {
    await invoke("causal_add_edge", {
      from: "U07_root_a", to: "U07_mid_a",
      confidence: 0.95, polarity: "positive",
    });
    await invoke("causal_add_edge", {
      from: "U07_mid_a", to: "U07_leaf_a",
      confidence: 0.9, polarity: "positive",
    });
    const out = await invoke("causal_root_causes", {
      target: "U07_leaf_a",
      maxHops: 5,
    });
    expect(out.success).toBe(true);
    const result = out.data as { rootCauses: string[] };
    expect(result.rootCauses).toEqual(["U07_root_a"]);
  });

  it("Zod rejects empty `from` (boundary)", async () => {
    const out = await invoke("causal_add_edge", {
      from: "",
      to: "U07_x",
      confidence: 0.5,
      polarity: "positive",
    });
    expect(out.success).toBe(false);
    expect(String(out.error)).toMatch(/from/i);
  });

  it("Zod rejects confidence > 1 (out-of-range)", async () => {
    const out = await invoke("causal_add_edge", {
      from: "U07_a",
      to: "U07_b",
      confidence: 1.5,
      polarity: "positive",
    });
    expect(out.success).toBe(false);
    expect(String(out.error)).toMatch(/confidence/i);
  });

  it("Zod rejects unknown polarity enum (adversarial)", async () => {
    const out = await invoke("causal_add_edge", {
      from: "U07_a",
      to: "U07_b",
      confidence: 0.5,
      polarity: "diagonal",
    });
    expect(out.success).toBe(false);
    expect(String(out.error)).toMatch(/polarity/i);
  });

  it("Zod rejects negative maxHops on traceImpact (boundary)", async () => {
    const out = await invoke("causal_trace_impact", {
      source: "U07_a",
      maxHops: -1,
    });
    expect(out.success).toBe(false);
    expect(String(out.error)).toMatch(/maxHops/i);
  });

  it("engine error surfaces on self-loop (`from` == `to`, adversarial)", async () => {
    const out = await invoke("causal_add_edge", {
      from: "U07_self",
      to: "U07_self",
      confidence: 0.5,
      polarity: "positive",
    });
    expect(out.success).toBe(false);
    expect(String(out.error)).toMatch(/self-loop/i);
  });
});

// ── ExceptionLearningEngine — 3 actions ─────────────────────────────────────

describe("aiReasoningDispatcher — ai_exception_* (ExceptionLearningEngine)", () => {
  it("captures a parameter_outlier as info — does not request fail", async () => {
    const out = await invoke("exception_handle", {
      type: "parameter_outlier",
      description: "U07-test: feed 0.45 mm/tooth on 6mm endmill in 4140",
      context: { material: "4140", tool: "endmill_6mm" },
      data: { parameter: "feed_per_tooth", value: 0.45 },
      severity: "info",
    });
    expect(out.success).toBe(true);
    const resp = out.data as { shouldFail: boolean; analysis: { possibleCauses: string[] } };
    expect(resp.shouldFail).toBe(false);
    expect(resp.analysis.possibleCauses.length).toBeGreaterThan(0);
  });

  it("flags critical without prior similar success (variability: outcome_anomaly)", async () => {
    const out = await invoke("exception_handle", {
      type: "outcome_anomaly",
      description: "U07-test: surface finish 6.3 vs predicted 1.6",
      context: { operation: "finish_pass" },
      data: { predicted_ra: 1.6, actual_ra: 6.3 },
      severity: "critical",
    });
    expect(out.success).toBe(true);
    const resp = out.data as { shouldFail: boolean };
    expect(resp.shouldFail).toBe(true);
  });

  it("variability: handles measurement_spike + process_deviation types", async () => {
    const spike = await invoke("exception_handle", {
      type: "measurement_spike",
      description: "U07-test: spindle vibration spike to 8g for 200ms",
      context: {},
      data: { peak_g: 8 },
      severity: "warning",
    });
    expect(spike.success).toBe(true);
    expect((spike.data as { shouldFail: boolean }).shouldFail).toBe(false);

    const dev = await invoke("exception_handle", {
      type: "process_deviation",
      description: "U07-test: operator dropped feed override to 60%",
      context: { override_pct: 60 },
      data: { override_pct: 60 },
      severity: "warning",
    });
    expect(dev.success).toBe(true);
    expect((dev.data as { shouldFail: boolean }).shouldFail).toBe(false);
  });

  it("recordOutcome on a real eventId returns a learned exception with tribal tip on success", async () => {
    const handle = await invoke("exception_handle", {
      type: "parameter_outlier",
      description: "U07-test: Vc 250 m/min in P-group steel",
      context: { material: "P", op: "rough" },
      data: { parameter: "vc", value: 250 },
      severity: "info",
    });
    const eventId = (handle.data as { analysis: { event: { id: string } } }).analysis.event.id;
    expect(eventId).toMatch(/^EX-\d+$/);

    const learn = await invoke("exception_record_outcome", {
      eventId,
      outcome: "success",
    });
    expect(learn.success).toBe(true);
    // Dispatcher spreads LearnedException fields to top level: outcome/tribalTip/envelopeProposal
    // are directly on data (via { learned, recorded, ...learned }).
    const learned = learn.data as {
      outcome: string;
      tribalTip: { title: string; category: string; confidence: number } | undefined;
      envelopeProposal: { parameter: string; newBound: number } | undefined;
    };
    expect(learned.outcome).toBe("success");
    // Concrete shape assertions on the generated tribal tip
    expect(learned.tribalTip?.category).toBe("parameters");
    expect(learned.tribalTip?.confidence).toBe(0.7);
    // Envelope proposal: newBound = value * 1.1 -> 250 * 1.1 = 275
    expect(learned.envelopeProposal?.parameter).toBe("vc");
    expect(learned.envelopeProposal?.newBound).toBeCloseTo(275, 5);
  });

  it("recordOutcome on unknown eventId reports error in body (no throw)", async () => {
    const out = await invoke("exception_record_outcome", {
      eventId: "EX-doesnotexist-99999",
      outcome: "success",
    });
    expect(out.success).toBe(true);
    const body = out.data as { error?: string };
    expect(body.error).toMatch(/eventId not found/);
  });

  it("Zod rejects unknown type (adversarial)", async () => {
    const out = await invoke("exception_handle", {
      type: "cosmic_ray",
      description: "U07-test",
      context: {},
      data: {},
      severity: "info",
    });
    expect(out.success).toBe(false);
    expect(String(out.error)).toMatch(/type/i);
  });

  it("Zod rejects empty description (boundary)", async () => {
    const out = await invoke("exception_handle", {
      type: "parameter_outlier",
      description: "",
      context: {},
      data: {},
      severity: "info",
    });
    expect(out.success).toBe(false);
    expect(String(out.error)).toMatch(/description/i);
  });

  it("stats action returns numeric totals reflecting events accumulated above", async () => {
    const out = await invoke("exception_stats", {});
    expect(out.success).toBe(true);
    const stats = out.data as {
      totalEvents: number; learnedCount: number; successRate: number;
      tipsGenerated: number; proposalsGenerated: number;
    };
    // We accumulated >= 4 events earlier in this describe block
    expect(stats.totalEvents).toBeGreaterThanOrEqual(4);
    // We recorded one success → at least one tip + one proposal
    expect(stats.tipsGenerated).toBeGreaterThanOrEqual(1);
    expect(stats.proposalsGenerated).toBeGreaterThanOrEqual(1);
    expect(stats.successRate).toBeGreaterThan(0);
  });
});

// ── MetaLearningOptimizerEngine — 2 actions ────────────────────────────────

describe("aiReasoningDispatcher — ai_metalearn_* (MetaLearningOptimizerEngine)", () => {
  beforeEach(() => {
    metaLearningOptimizerEngine.clear();
  });

  it("recommends the strategy with the highest Wilson lower bound (3 strategies × 1 scenario)", async () => {
    // Strategy A: 5/5 successes -> highest Wilson LB despite 1/1 looking perfect
    const aRecords = Array.from({ length: 5 }).map(() =>
      invoke("meta_learning_record", {
        scenario: "U07_pdf_extract", strategy: "transformer",
        success: true, durationMs: 800,
      }),
    );
    await Promise.all(aRecords);

    // Strategy B: 3/5 successes
    const bSuccess = Array.from({ length: 3 }).map(() =>
      invoke("meta_learning_record", {
        scenario: "U07_pdf_extract", strategy: "ocr_fallback",
        success: true, durationMs: 1200,
      }),
    );
    const bFail = Array.from({ length: 2 }).map(() =>
      invoke("meta_learning_record", {
        scenario: "U07_pdf_extract", strategy: "ocr_fallback",
        success: false, durationMs: 1500,
      }),
    );
    await Promise.all([...bSuccess, ...bFail]);

    // Strategy C: 1/1 -- looks perfect by raw rate; Wilson penalises low-N
    await invoke("meta_learning_record", {
      scenario: "U07_pdf_extract", strategy: "regex_only",
      success: true, durationMs: 50,
    });

    const rec = await invoke("meta_learning_recommend", { scenario: "U07_pdf_extract" });
    expect(rec.success).toBe(true);
    // Dispatcher spreads StrategyRecommendation fields to top level alongside
    // { scenario, recommendation } so strategy/wilsonLowerBound/rationale are
    // directly on data.
    const result = rec.data as {
      strategy: string; wilsonLowerBound: number; rationale: string;
      successRate: number; attempts: number;
    };
    expect(result.strategy).toBe("transformer");
    expect(result.attempts).toBe(5);
    expect(result.successRate).toBe(1);
    // Wilson LB for 5/5 at z=1.96 is ~0.566
    expect(result.wilsonLowerBound).toBeGreaterThan(0.5);
    expect(result.wilsonLowerBound).toBeLessThan(1.0);
    expect(result.rationale).toMatch(/Wilson/);
  });

  it("variability: tracks separate stats per scenario without cross-talk", async () => {
    await Promise.all([
      invoke("meta_learning_record", {
        scenario: "U07_cam_pick", strategy: "tribal", success: true,
      }),
      invoke("meta_learning_record", {
        scenario: "U07_cam_pick", strategy: "tribal", success: true,
      }),
      invoke("meta_learning_record", {
        scenario: "U07_quote", strategy: "param", success: false,
      }),
    ]);

    const cam = await invoke("meta_learning_recommend", { scenario: "U07_cam_pick" });
    expect((cam.data as { strategy: string }).strategy).toBe("tribal");
    expect((cam.data as { successRate: number }).successRate).toBe(1);

    const quote = await invoke("meta_learning_recommend", { scenario: "U07_quote" });
    expect((quote.data as { strategy: string }).strategy).toBe("param");
    expect((quote.data as { successRate: number }).successRate).toBe(0);
  });

  it("recommend returns null payload when no records match scenario (resource exhaustion)", async () => {
    const out = await invoke("meta_learning_recommend", { scenario: "U07_unseen_scenario_xyz" });
    expect(out.success).toBe(true);
    const data = out.data as { scenario: string; recommendation: unknown };
    // Dispatcher returns { scenario, recommendation: null } when engine has no
    // candidates; slimResponse strips literal nulls so recommendation is absent.
    expect(data.scenario).toBe("U07_unseen_scenario_xyz");
    expect(data.recommendation ?? null).toBeNull();
  });

  it("recommend respects minAttempts gate (variability)", async () => {
    await invoke("meta_learning_record", {
      scenario: "U07_gated", strategy: "low_n", success: true,
    });
    const out = await invoke("meta_learning_recommend", {
      scenario: "U07_gated",
      minAttempts: 5,
    });
    const data = out.data as { scenario: string; recommendation: unknown };
    expect(data.scenario).toBe("U07_gated");
    expect(data.recommendation ?? null).toBeNull();
  });

  it("Zod rejects empty scenario string (boundary)", async () => {
    const out = await invoke("meta_learning_record", {
      scenario: "",
      strategy: "any",
      success: true,
    });
    expect(out.success).toBe(false);
    expect(String(out.error)).toMatch(/scenario/i);
  });

  it("Zod rejects negative durationMs (adversarial)", async () => {
    const out = await invoke("meta_learning_record", {
      scenario: "U07_neg",
      strategy: "any",
      success: true,
      durationMs: -100,
    });
    expect(out.success).toBe(false);
    expect(String(out.error)).toMatch(/durationMs/i);
  });

  it("Zod rejects Infinity durationMs (adversarial)", async () => {
    const out = await invoke("meta_learning_record", {
      scenario: "U07_inf",
      strategy: "any",
      success: true,
      durationMs: Number.POSITIVE_INFINITY,
    });
    expect(out.success).toBe(false);
    expect(String(out.error)).toMatch(/durationMs/i);
  });
});
