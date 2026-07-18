/**
 * Tests for prism_ai ledger_* + ledger_drift_* wiring
 * CAM-ML-CLOSEDLOOP-MS0 U-CMCCL11
 *
 * Exercises all 10 new actions (6 ledger + 4 drift) through the real
 * dispatcher registration — schema validation, case handlers, engine
 * integration. No mocks of the underlying engines.
 */

import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { registerAIReasoningDispatcher } from "../tools/dispatchers/aiReasoningDispatcher.js";
import { masterAITrainingLedgerEngine } from "../engines/MasterAITrainingLedgerEngine.js";
import { loRADriftCoordinatorEngine } from "../engines/LoRADriftCoordinatorEngine.js";
import { policyExperienceLedgerEngine } from "../engines/PolicyExperienceLedgerEngine.js";
import { temporalReasoningEngine } from "../engines/TemporalReasoningEngine.js";
import { knowledgeIngestionOrchestratorEngine } from "../engines/KnowledgeIngestionOrchestratorEngine.js";

type Handler = (args: { action: string; params?: Record<string, any> }) => Promise<any>;

function createServer(): { handler: Promise<Handler> } {
  let resolve!: (h: Handler) => void;
  const handler = new Promise<Handler>((r) => (resolve = r));
  const fakeServer = {
    tool(_name: string, _desc: string, _schema: any, fn: Handler) {
      resolve(fn);
    },
  };
  registerAIReasoningDispatcher(fakeServer);
  return { handler };
}

async function call(handler: Handler, action: string, params: Record<string, any> = {}): Promise<any> {
  const r = await handler({ action, params });
  const text = r?.content?.[0]?.text ?? JSON.stringify(r);
  try {
    return JSON.parse(text);
  } catch {
    return r;
  }
}

function sampleEntry(runId: string, overrides: Record<string, any> = {}) {
  return {
    runId,
    pipelineType: "milling",
    datasetFingerprint: `fp-${runId}`,
    version: "20260420.1",
    trainingMetrics: { loss: 0.3, accuracy: 0.85, mae: 0.1, evalScore: 75 },
    deploymentStatus: "deployed",
    sloTargets: { minEvalScore: 70, maxLoss: 0.5 },
    createdAt: "2026-04-20T00:00:00Z",
    ...overrides,
  };
}

describe("prism_ai ledger actions (U-CMCCL11)", () => {
  let handler: Handler;

  beforeAll(async () => {
    handler = await createServer().handler;
  });

  beforeEach(() => {
    masterAITrainingLedgerEngine.reset();
    loRADriftCoordinatorEngine.reset();
  });

  it("ledger_ingest appends and echoes entry", async () => {
    const r = await call(handler, "ledger_ingest", sampleEntry("r1"));
    expect(r.data.entry?.runId).toBe("r1");
    expect(r.data.entry?.schemaVersion).toBe(1);
  });

  it("ledger_ingest rejects missing required field", async () => {
    const partial = sampleEntry("r2");
    delete (partial as any).pipelineType;
    const r = await call(handler, "ledger_ingest", partial);
    expect(r.error).toMatch(/missing pipelineType/);
  });

  it("ledger_ingest surfaces engine errors (invalid pipelineType)", async () => {
    const r = await call(handler, "ledger_ingest", sampleEntry("r3", { pipelineType: "nonsense" }));
    expect(r.error).toMatch(/invalid pipelineType/);
  });

  it("ledger_query returns all entries with no filter", async () => {
    await call(handler, "ledger_ingest", sampleEntry("r1"));
    await call(handler, "ledger_ingest", sampleEntry("r2", { pipelineType: "wedm" }));
    const r = await call(handler, "ledger_query", {});
    expect(r.data.count).toBe(2);
  });

  it("ledger_query filters by pipelineType", async () => {
    await call(handler, "ledger_ingest", sampleEntry("r1"));
    await call(handler, "ledger_ingest", sampleEntry("r2", { pipelineType: "wedm" }));
    const r = await call(handler, "ledger_query", { pipelineType: "wedm" });
    expect(r.data.count).toBe(1);
  });

  it("ledger_replay returns the entry by runId", async () => {
    await call(handler, "ledger_ingest", sampleEntry("r1"));
    const r = await call(handler, "ledger_replay", { runId: "r1" });
    expect(r.data.found).toBe(true);
    expect(r.data.entry.runId).toBe("r1");
  });

  it("ledger_replay reports not-found cleanly", async () => {
    const r = await call(handler, "ledger_replay", { runId: "missing" });
    expect(r.data.found).toBe(false);
  });

  it("ledger_compare returns head-to-head stability", async () => {
    for (let i = 1; i <= 3; i += 1) {
      await call(handler, "ledger_ingest", sampleEntry(`m${i}`, {
        pipelineType: "milling",
        trainingMetrics: { loss: 0.3, accuracy: 0.85, mae: 0.1, evalScore: 74 + i },
      }));
    }
    for (let i = 1; i <= 3; i += 1) {
      await call(handler, "ledger_ingest", sampleEntry(`w${i}`, {
        pipelineType: "wedm",
        trainingMetrics: { loss: 0.3, accuracy: 0.85, mae: 0.1, evalScore: 30 + i * 20 },
      }));
    }
    const r = await call(handler, "ledger_compare", { pipelineA: "milling", pipelineB: "wedm" });
    expect(r.data.moreStable).toBe("milling");
  });

  it("ledger_slo returns 8-pipeline dashboard", async () => {
    const r = await call(handler, "ledger_slo", {});
    expect(r.data.slos).toHaveLength(8);
  });

  it("ledger_status reports totalRuns + stability per pipeline", async () => {
    await call(handler, "ledger_ingest", sampleEntry("r1"));
    const r = await call(handler, "ledger_status", {});
    expect(r.data.totalRuns).toBe(1);
    expect(r.data.supportedPipelines).toHaveLength(8);
    expect(r.data.stability).toHaveLength(8);
  });
});

describe("prism_ai ledger_drift_* actions (U-CMCCL10)", () => {
  let handler: Handler;

  beforeAll(async () => {
    handler = await createServer().handler;
  });

  beforeEach(() => {
    loRADriftCoordinatorEngine.reset();
  });

  it("ledger_drift_record returns a drift event", async () => {
    const r = await call(handler, "ledger_drift_record", {
      pipelineType: "milling",
      delta: 0.15,
      observedAt: "2026-04-20T10:00:00Z",
      baselineEvalScore: 80,
      currentEvalScore: 68,
    });
    expect(r.data.event?.kind).toBe("pipelineDrift");
  });

  it("ledger_drift_record rejects missing delta", async () => {
    const r = await call(handler, "ledger_drift_record", {
      pipelineType: "milling",
      observedAt: "2026-04-20T10:00:00Z",
      baselineEvalScore: 80,
      currentEvalScore: 68,
    });
    expect(r.error).toMatch(/missing delta/);
  });

  it("ledger_drift_active lists active drifted pipelines", async () => {
    await call(handler, "ledger_drift_record", {
      pipelineType: "milling",
      delta: 0.15,
      observedAt: new Date().toISOString(),
      baselineEvalScore: 80,
      currentEvalScore: 68,
    });
    const r = await call(handler, "ledger_drift_active", {});
    expect(r.data.activePipelines).toContain("milling");
  });

  it("ledger_drift_check reports shouldTriggerMasterRetrain", async () => {
    await call(handler, "ledger_drift_record", {
      pipelineType: "milling",
      delta: 0.15,
      observedAt: new Date().toISOString(),
      baselineEvalScore: 80,
      currentEvalScore: 68,
    });
    const r = await call(handler, "ledger_drift_check", {});
    expect(r.data.shouldTriggerMasterRetrain).toBe(false);
    await call(handler, "ledger_drift_record", {
      pipelineType: "wedm",
      delta: 0.20,
      observedAt: new Date().toISOString(),
      baselineEvalScore: 75,
      currentEvalScore: 60,
    });
    const r2 = await call(handler, "ledger_drift_check", {});
    expect(r2.data.shouldTriggerMasterRetrain).toBe(true);
  });

  it("ledger_drift_config returns current config", async () => {
    const r = await call(handler, "ledger_drift_config", {});
    expect(r.data.config.coordinatedThreshold).toBeGreaterThanOrEqual(2);
    expect(typeof r.data.config.windowMs).toBe("number");
    expect(typeof r.data.config.driftDeltaFloor).toBe("number");
  });

  it("ledger_drift_config accepts valid set patch", async () => {
    const r = await call(handler, "ledger_drift_config", { set: { driftDeltaFloor: 0.15 } });
    expect(r.data.config?.driftDeltaFloor).toBeCloseTo(0.15, 6);
  });

  it("ledger_drift_config rejects invalid threshold via engine error", async () => {
    const r = await call(handler, "ledger_drift_config", { set: { coordinatedThreshold: 0 } });
    expect(r.error).toMatch(/threshold/i);
  });

  it("ledger_drift_config does NOT mutate config when a patch is rejected (validate-before-assign)", async () => {
    const before = await call(handler, "ledger_drift_config", {});
    const thresholdBefore = before.data.config.coordinatedThreshold;
    const bad = await call(handler, "ledger_drift_config", { set: { coordinatedThreshold: 0 } });
    expect(bad.success).toBe(false); // dispatcherError -- the invalid patch is rejected
    const after = await call(handler, "ledger_drift_config", {});
    // Pre-fix this was 0 (mutate-then-validate left a partial-apply pollution that leaked
    // into later record/check calls); validate-before-assign keeps the config unchanged.
    expect(after.data.config.coordinatedThreshold).toBe(thresholdBefore);
    expect(after.data.config.coordinatedThreshold).toBeGreaterThanOrEqual(2);
  });
});

// INDIA-AI-ORPHAN-WIRE unit 3 -- IntentClassifierEngine (PUOA tier-routing; pure regex/keyword, no NN).
describe("prism_ai INDIA_AI_ORPHAN intent actions (U-WIRE-INTENT)", () => {
  let handler: Handler;
  beforeAll(async () => {
    handler = await createServer().handler;
  });

  // The prism_ai dispatcher wraps every case result as { success:true, data: slimResponse(result) }
  // (aiReasoningDispatcher.ts:4806-4808), so case-level fields live under r.data and the case's own
  // success flag is r.data.success. slimResponse keeps booleans + non-empty scalars; it strips empty
  // arrays (so entities/domains may be absent when empty -- assert on the stable case-success instead).
  it("classify_intent returns routing metadata for a real intent string", async () => {
    const r = await call(handler, "classify_intent", { intent: "calculate the feed rate for 6061 aluminum on a 3-axis mill" });
    expect(r.success).toBe(true);
    expect(r.data.success).toBe(true);
    expect(typeof r.data.tier).toBe("string");
    expect(typeof r.data.category).toBe("string");
    expect(typeof r.data.confidence).toBe("number");
    expect(r.data.confidence).toBeGreaterThanOrEqual(0);
    expect(r.data.normalized_intent).toBe("calculate the feed rate for 6061 aluminum on a 3-axis mill");
  });

  it("classify_intent rejects a missing/non-string intent with a specific error", async () => {
    const r = await call(handler, "classify_intent", {});
    expect(r.data.success).toBe(false);
    expect(r.data.error).toMatch(/intent/i);
    const r2 = await call(handler, "classify_intent", { intent: 42 });
    expect(r2.data.success).toBe(false);
    const r3 = await call(handler, "classify_intent", { intent: "   " });
    expect(r3.data.success).toBe(false);
  });

  it("quick_classify_intent returns minimal routing (tier + category)", async () => {
    const r = await call(handler, "quick_classify_intent", { intent: "optimize wire EDM cut for D2 tool steel" });
    expect(r.data.success).toBe(true);
    expect(typeof r.data.tier).toBe("string");
    expect(typeof r.data.category).toBe("string");
    expect(typeof r.data.primary_domain).toBe("string");
  });

  it("extract_intent_entities succeeds at the case level for a valid intent", async () => {
    const r = await call(handler, "extract_intent_entities", { intent: "drill a 0.25 inch hole in 304 stainless" });
    expect(r.success).toBe(true);
    expect(r.data.success).toBe(true);
  });

  it("extract_intent_entities guards a non-string intent", async () => {
    const r = await call(handler, "extract_intent_entities", { intent: null });
    expect(r.data.success).toBe(false);
    expect(r.data.error).toMatch(/intent/i);
  });
});

// INDIA-AI-ORPHAN-WIRE units 4-7 -- the 4 remaining WIRE_SAFE_DATA engines
// (PolicyExperienceLedger / TemporalReasoning / RealTimeAnomalyDetection /
// KnowledgeIngestion). DATA/stats/provenance ONLY (R12 -- never NN inference).
// Every assertion reads r.data.* (the dispatcher wraps {success:true, data: slimResponse(result)});
// slimResponse recurses + strips empty arrays, so reads go via the stable `count` field.
describe("prism_ai INDIA_AI_ORPHAN data engines (U-WIRE-DATA-ENGINES)", () => {
  let handler: Handler;
  beforeAll(async () => {
    handler = await createServer().handler;
  });

  // ---- Unit 4: PolicyExperienceLedgerEngine (offline-RL (s,a,r,s') ledger) ----
  it("policy_experience_stats surfaces the engine stats under data", async () => {
    const orig = policyExperienceLedgerEngine.stats;
    (policyExperienceLedgerEngine as any).stats = () => ({
      root_dir: "test",
      total: 3,
      by_domain: { milling: 2, wedm: 1 },
      by_adapter: { __none__: 3 },
      reward_summary: { mean: 0.5, min: 0.1, max: 0.9 },
    });
    try {
      const r = await call(handler, "policy_experience_stats", {});
      expect(r.data.success).toBe(true);
      expect(r.data.total).toBe(3);
      expect(r.data.by_domain.milling).toBe(2);
      expect(r.data.reward_summary.max).toBeCloseTo(0.9, 6);
    } finally {
      (policyExperienceLedgerEngine as any).stats = orig;
    }
  });

  it("policy_experience_query passes the caller filter through and reports count===tuples.length", async () => {
    const orig = policyExperienceLedgerEngine.query;
    let received: any = null;
    (policyExperienceLedgerEngine as any).query = (q: any) => {
      received = q;
      return { tuples: [{ experience_id: "e1" }, { experience_id: "e2" }], truncated: false };
    };
    try {
      const r = await call(handler, "policy_experience_query", { domain: "wedm", limit: 5 });
      expect(r.data.success).toBe(true);
      expect(r.data.count).toBe(2);
      expect(r.data.tuples.length).toBe(2);
      expect(received.domain).toBe("wedm");
      expect(received.limit).toBe(5);
    } finally {
      (policyExperienceLedgerEngine as any).query = orig;
    }
  });

  it("policy_experience_query over the real (possibly empty) ledger returns a consistent shape", async () => {
    const r = await call(handler, "policy_experience_query", {});
    expect(r.data.success).toBe(true);
    expect(typeof r.data.count).toBe("number");
    expect(r.data.count).toBeGreaterThanOrEqual(0);
    // count is the source-of-truth length even when slimResponse strips an empty tuples array.
    if (r.data.count > 0) {
      expect(r.data.tuples.length).toBe(r.data.count);
    }
  });

  // ---- Unit 5: TemporalReasoningEngine (in-memory OLS timeline ledger) ----
  it("temporal_snapshots returns the recorded snapshots for a series", async () => {
    temporalReasoningEngine.clear("svi");
    temporalReasoningEngine.record("svi", 0.8, "2026-06-01T00:00:00Z");
    temporalReasoningEngine.record("svi", 0.85, "2026-06-05T00:00:00Z");
    const r = await call(handler, "temporal_snapshots", { series: "svi" });
    expect(r.data.success).toBe(true);
    expect(r.data.count).toBe(2);
    expect(r.data.snapshots[0].value).toBeCloseTo(0.8, 6);
    expect(r.data.snapshots[1].value).toBeCloseTo(0.85, 6);
    temporalReasoningEngine.clear("svi");
  });

  it("temporal_snapshots returns an honest empty read for an unknown series", async () => {
    const r = await call(handler, "temporal_snapshots", { series: "does-not-exist-xyz" });
    expect(r.data.success).toBe(true);
    expect(r.data.count).toBe(0);
  });

  it("temporal_snapshots rejects a missing/non-string series", async () => {
    const r = await call(handler, "temporal_snapshots", {});
    expect(r.data.success).toBe(false);
    expect(r.data.error).toMatch(/series/i);
    const r2 = await call(handler, "temporal_snapshots", { series: 42 });
    expect(r2.data.success).toBe(false);
  });

  it("temporal_project returns an OLS slope of +1/day with r2=1 over a linear series", async () => {
    temporalReasoningEngine.clear("ramp");
    temporalReasoningEngine.record("ramp", 0, "2026-06-01T00:00:00Z");
    temporalReasoningEngine.record("ramp", 4, "2026-06-05T00:00:00Z"); // +4 over 4 days
    const r = await call(handler, "temporal_project", { series: "ramp", windowSize: 10 });
    expect(r.data.success).toBe(true);
    expect(r.data.hasProjection).toBe(true);
    expect(r.data.projection.slopePerDay).toBeCloseTo(1, 4);
    expect(r.data.projection.r2).toBeCloseTo(1, 4);
    temporalReasoningEngine.clear("ramp");
  });

  it("temporal_project returns hasProjection=false for <2 snapshots", async () => {
    temporalReasoningEngine.clear("thin");
    temporalReasoningEngine.record("thin", 1, "2026-06-01T00:00:00Z");
    const r = await call(handler, "temporal_project", { series: "thin" });
    expect(r.data.success).toBe(true);
    expect(r.data.hasProjection).toBe(false);
    temporalReasoningEngine.clear("thin");
  });

  it("temporal_forecast returns a deterministic ETA (6 days) to target", async () => {
    temporalReasoningEngine.clear("eta");
    temporalReasoningEngine.record("eta", 0, "2026-06-01T00:00:00Z");
    temporalReasoningEngine.record("eta", 4, "2026-06-05T00:00:00Z"); // current=4, slope=+1/day
    const r = await call(handler, "temporal_forecast", { series: "eta", target: 10, nowIso: "2026-06-05T00:00:00Z" });
    expect(r.data.success).toBe(true);
    expect(r.data.etaDays).toBeCloseTo(6, 4); // (10-4)/1 = 6 days
    expect(r.data.etaIso).toBe("2026-06-11T00:00:00.000Z"); // 2026-06-05 + 6 days
    temporalReasoningEngine.clear("eta");
  });

  it("temporal_forecast rejects a missing/NaN target (adversarial)", async () => {
    temporalReasoningEngine.clear("eta2");
    temporalReasoningEngine.record("eta2", 0, "2026-06-01T00:00:00Z");
    temporalReasoningEngine.record("eta2", 4, "2026-06-05T00:00:00Z");
    const rMissing = await call(handler, "temporal_forecast", { series: "eta2" });
    expect(rMissing.data.success).toBe(false);
    expect(rMissing.data.error).toMatch(/target/i);
    const rNaN = await call(handler, "temporal_forecast", { series: "eta2", target: Number.NaN });
    expect(rNaN.data.success).toBe(false);
    temporalReasoningEngine.clear("eta2");
  });

  // ---- Unit 6: RealTimeAnomalyDetectionEngine (5 deterministic detectors) ----
  it("detect_cutting_anomalies reports 'normal' for a constant signal (all 5 detectors run)", async () => {
    const r = await call(handler, "detect_cutting_anomalies", {
      samples: new Array(128).fill(0.5),
      sample_rate_hz: 1000,
    });
    expect(r.data.success).toBe(true);
    expect(r.data.unit).toBe("anomaly_detection_result");
    expect(r.data.value.overall_status).toBe("normal");
    expect(r.data.value.method_summaries.length).toBe(5);
    expect(typeof r.data.value.false_positive_estimate).toBe("number");
  });

  it("detect_cutting_anomalies rejects empty / missing samples", async () => {
    const rEmpty = await call(handler, "detect_cutting_anomalies", { samples: [], sample_rate_hz: 1000 });
    expect(rEmpty.data.success).toBe(false);
    expect(rEmpty.data.error).toMatch(/samples/i);
    const rMissing = await call(handler, "detect_cutting_anomalies", { sample_rate_hz: 1000 });
    expect(rMissing.data.success).toBe(false);
  });

  it("detect_cutting_anomalies rejects a NaN-poisoned sample window (adversarial)", async () => {
    const r = await call(handler, "detect_cutting_anomalies", { samples: [1, Number.NaN, 3], sample_rate_hz: 1000 });
    expect(r.data.success).toBe(false);
    expect(r.data.error).toMatch(/samples/i);
  });

  it("detect_cutting_anomalies rejects a non-positive / missing sample_rate_hz", async () => {
    const rZero = await call(handler, "detect_cutting_anomalies", { samples: [1, 2, 3], sample_rate_hz: 0 });
    expect(rZero.data.success).toBe(false);
    expect(rZero.data.error).toMatch(/sample_rate_hz/i);
    const rMissing = await call(handler, "detect_cutting_anomalies", { samples: [1, 2, 3] });
    expect(rMissing.data.success).toBe(false);
    expect(rMissing.data.error).toMatch(/sample_rate_hz/i);
  });

  it("detect_cutting_anomalies rejects an oversized sample window (resource exhaustion)", async () => {
    const r = await call(handler, "detect_cutting_anomalies", {
      samples: new Array(250001).fill(0.5),
      sample_rate_hz: 1000,
    });
    expect(r.data.success).toBe(false);
    expect(r.data.error).toMatch(/too large|max/i);
  });

  // ---- Unit 7: KnowledgeIngestionOrchestratorEngine (discovery + ingestion) ----
  it("knowledge_ingestion_stats returns the processed-count snapshot", async () => {
    const r = await call(handler, "knowledge_ingestion_stats", {});
    expect(r.data.success).toBe(true);
    expect(typeof r.data.processedCount).toBe("number");
    expect(r.data.processedCount).toBeGreaterThanOrEqual(0);
    expect(r.data.categories.tool_catalog).toBe(0);
    expect(r.data.categories.mit_course).toBe(0);
  });

  it("knowledge_ingestion_pending awaits getPending and reports count (hermetic monkeypatch)", async () => {
    const orig = knowledgeIngestionOrchestratorEngine.getPending;
    (knowledgeIngestionOrchestratorEngine as any).getPending = async () => [
      { path: "/x/tool.pdf", name: "tool.pdf", category: "tool_catalog", processed: false },
      { path: "/y/hb.pdf", name: "hb.pdf", category: "handbook", processed: false },
    ];
    try {
      const r = await call(handler, "knowledge_ingestion_pending", {});
      expect(r.data.success).toBe(true);
      expect(r.data.count).toBe(2);
      expect(r.data.pending[0].category).toBe("tool_catalog");
    } finally {
      (knowledgeIngestionOrchestratorEngine as any).getPending = orig;
    }
  });

  it("knowledge_ingestion_pending surfaces an engine throw as a dispatcher error (not a fake success)", async () => {
    const orig = knowledgeIngestionOrchestratorEngine.getPending;
    (knowledgeIngestionOrchestratorEngine as any).getPending = async () => {
      throw new Error("discoverResources boom");
    };
    try {
      const r = await call(handler, "knowledge_ingestion_pending", {});
      // dispatcherError is top-level (NOT wrapped under data) -- the catch path.
      expect(r.success).toBe(false);
      expect(r.error).toMatch(/boom/);
    } finally {
      (knowledgeIngestionOrchestratorEngine as any).getPending = orig;
    }
  });
});
