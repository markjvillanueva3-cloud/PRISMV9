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
    expect(r.entry?.runId).toBe("r1");
    expect(r.entry?.schemaVersion).toBe(1);
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
    expect(r.count).toBe(2);
  });

  it("ledger_query filters by pipelineType", async () => {
    await call(handler, "ledger_ingest", sampleEntry("r1"));
    await call(handler, "ledger_ingest", sampleEntry("r2", { pipelineType: "wedm" }));
    const r = await call(handler, "ledger_query", { pipelineType: "wedm" });
    expect(r.count).toBe(1);
  });

  it("ledger_replay returns the entry by runId", async () => {
    await call(handler, "ledger_ingest", sampleEntry("r1"));
    const r = await call(handler, "ledger_replay", { runId: "r1" });
    expect(r.found).toBe(true);
    expect(r.entry.runId).toBe("r1");
  });

  it("ledger_replay reports not-found cleanly", async () => {
    const r = await call(handler, "ledger_replay", { runId: "missing" });
    expect(r.found).toBe(false);
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
    expect(r.moreStable).toBe("milling");
  });

  it("ledger_slo returns 8-pipeline dashboard", async () => {
    const r = await call(handler, "ledger_slo", {});
    expect(r.slos).toHaveLength(8);
  });

  it("ledger_status reports totalRuns + stability per pipeline", async () => {
    await call(handler, "ledger_ingest", sampleEntry("r1"));
    const r = await call(handler, "ledger_status", {});
    expect(r.totalRuns).toBe(1);
    expect(r.supportedPipelines).toHaveLength(8);
    expect(r.stability).toHaveLength(8);
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
    expect(r.event?.kind).toBe("pipelineDrift");
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
    expect(r.activePipelines).toContain("milling");
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
    expect(r.shouldTriggerMasterRetrain).toBe(false);
    await call(handler, "ledger_drift_record", {
      pipelineType: "wedm",
      delta: 0.20,
      observedAt: new Date().toISOString(),
      baselineEvalScore: 75,
      currentEvalScore: 60,
    });
    const r2 = await call(handler, "ledger_drift_check", {});
    expect(r2.shouldTriggerMasterRetrain).toBe(true);
  });

  it("ledger_drift_config returns current config", async () => {
    const r = await call(handler, "ledger_drift_config", {});
    expect(r.config).toBeDefined();
    expect(r.config.coordinatedThreshold).toBeGreaterThanOrEqual(2);
  });

  it("ledger_drift_config accepts valid set patch", async () => {
    const r = await call(handler, "ledger_drift_config", { set: { driftDeltaFloor: 0.15 } });
    expect(r.config?.driftDeltaFloor).toBeCloseTo(0.15, 6);
  });

  it("ledger_drift_config rejects invalid threshold via engine error", async () => {
    const r = await call(handler, "ledger_drift_config", { set: { coordinatedThreshold: 0 } });
    expect(r.error).toMatch(/threshold/i);
  });
});
