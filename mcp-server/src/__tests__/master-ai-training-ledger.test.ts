/**
 * Tests for MasterAITrainingLedgerEngine + LoRADriftCoordinatorEngine
 * CAM-ML-CLOSEDLOOP-MS0 U-CMCCL09 + U-CMCCL10
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  masterAITrainingLedgerEngine,
  LEDGER_SCHEMA_VERSION,
  type LedgerEntry,
} from "../engines/MasterAITrainingLedgerEngine.js";
import {
  loRADriftCoordinatorEngine,
  createLoRADriftCoordinator,
} from "../engines/LoRADriftCoordinatorEngine.js";

function entry(i: number, overrides: Partial<Omit<LedgerEntry, "schemaVersion">> = {}) {
  return {
    runId: `run-${i}`,
    pipelineType: "milling" as const,
    datasetFingerprint: `fp-${i}`,
    version: `20260420.${i}`,
    trainingMetrics: { loss: 0.3, accuracy: 0.85, mae: 0.1, evalScore: 75 },
    deploymentStatus: "deployed" as const,
    sloTargets: { minEvalScore: 70, maxLoss: 0.5 },
    createdAt: `2026-04-${String(i).padStart(2, "0")}T00:00:00Z`,
    ...overrides,
  };
}

describe("MasterAITrainingLedgerEngine", () => {
  beforeEach(() => masterAITrainingLedgerEngine.reset());

  it("has schemaVersion 1", () => {
    expect(LEDGER_SCHEMA_VERSION).toBe(1);
  });

  it("ingests a valid entry and stamps schemaVersion", () => {
    const e = masterAITrainingLedgerEngine.ingest(entry(1));
    expect(e.runId).toBe("run-1");
    expect(e.schemaVersion).toBe(1);
    expect(masterAITrainingLedgerEngine.totalRuns()).toBe(1);
  });

  it("rejects duplicate runId", () => {
    masterAITrainingLedgerEngine.ingest(entry(1));
    expect(() => masterAITrainingLedgerEngine.ingest(entry(1))).toThrow(/duplicate/);
  });

  it("rejects invalid pipelineType", () => {
    expect(() =>
      masterAITrainingLedgerEngine.ingest(entry(1, { pipelineType: "magic" as any })),
    ).toThrow(/invalid pipelineType/);
  });

  it("rejects non-finite metrics", () => {
    expect(() =>
      masterAITrainingLedgerEngine.ingest(
        entry(1, { trainingMetrics: { loss: NaN, accuracy: 1, mae: 0, evalScore: 70 } }),
      ),
    ).toThrow(/finite/);
  });

  it("replay returns null for unknown runId", () => {
    expect(masterAITrainingLedgerEngine.replay("missing")).toBeNull();
  });

  it("query filters by pipelineType", () => {
    masterAITrainingLedgerEngine.ingest(entry(1, { pipelineType: "milling" }));
    masterAITrainingLedgerEngine.ingest(entry(2, { pipelineType: "wedm" }));
    const hits = masterAITrainingLedgerEngine.query({ pipelineType: "wedm" });
    expect(hits).toHaveLength(1);
    expect(hits[0].runId).toBe("run-2");
  });

  it("query filters by deploymentStatus", () => {
    masterAITrainingLedgerEngine.ingest(entry(1, { deploymentStatus: "deployed" }));
    masterAITrainingLedgerEngine.ingest(entry(2, { deploymentStatus: "rolled-back" }));
    expect(masterAITrainingLedgerEngine.query({ deploymentStatus: "rolled-back" })).toHaveLength(1);
  });

  it("query filters by minEvalScore", () => {
    masterAITrainingLedgerEngine.ingest(entry(1, { trainingMetrics: { loss: 0.3, accuracy: 0.85, mae: 0.1, evalScore: 60 } }));
    masterAITrainingLedgerEngine.ingest(entry(2, { trainingMetrics: { loss: 0.2, accuracy: 0.9, mae: 0.08, evalScore: 80 } }));
    expect(masterAITrainingLedgerEngine.query({ minEvalScore: 70 })).toHaveLength(1);
  });

  it("query filters by date range", () => {
    masterAITrainingLedgerEngine.ingest(entry(1, { createdAt: "2026-04-10T00:00:00Z" }));
    masterAITrainingLedgerEngine.ingest(entry(2, { createdAt: "2026-04-20T00:00:00Z" }));
    const r = masterAITrainingLedgerEngine.query({ createdAfter: "2026-04-15T00:00:00Z" });
    expect(r).toHaveLength(1);
    expect(r[0].runId).toBe("run-2");
  });

  it("pipelineStability reports CV, min, max, run count", () => {
    masterAITrainingLedgerEngine.ingest(entry(1, { trainingMetrics: { loss: 0.3, accuracy: 0.85, mae: 0.1, evalScore: 70 } }));
    masterAITrainingLedgerEngine.ingest(entry(2, { trainingMetrics: { loss: 0.3, accuracy: 0.85, mae: 0.1, evalScore: 80 } }));
    const s = masterAITrainingLedgerEngine.pipelineStability("milling");
    expect(s.runCount).toBe(2);
    expect(s.meanEvalScore).toBe(75);
    expect(s.minEvalScore).toBe(70);
    expect(s.maxEvalScore).toBe(80);
    expect(s.coefficientOfVariation).toBeGreaterThan(0);
  });

  it("compare picks lower-CV pipeline as more stable", () => {
    // Milling has tight cluster around 75 (CV ≈ 0.0094)
    masterAITrainingLedgerEngine.ingest(entry(1, { pipelineType: "milling", trainingMetrics: { loss: 0.3, accuracy: 0.85, mae: 0.1, evalScore: 74 } }));
    masterAITrainingLedgerEngine.ingest(entry(2, { pipelineType: "milling", trainingMetrics: { loss: 0.3, accuracy: 0.85, mae: 0.1, evalScore: 75 } }));
    masterAITrainingLedgerEngine.ingest(entry(3, { pipelineType: "milling", trainingMetrics: { loss: 0.3, accuracy: 0.85, mae: 0.1, evalScore: 76 } }));
    // WEDM has wide scatter (CV ≈ 0.5)
    masterAITrainingLedgerEngine.ingest(entry(4, { pipelineType: "wedm", trainingMetrics: { loss: 0.3, accuracy: 0.85, mae: 0.1, evalScore: 30 } }));
    masterAITrainingLedgerEngine.ingest(entry(5, { pipelineType: "wedm", trainingMetrics: { loss: 0.3, accuracy: 0.85, mae: 0.1, evalScore: 60 } }));
    masterAITrainingLedgerEngine.ingest(entry(6, { pipelineType: "wedm", trainingMetrics: { loss: 0.3, accuracy: 0.85, mae: 0.1, evalScore: 90 } }));
    const cmp = masterAITrainingLedgerEngine.compare("milling", "wedm");
    expect(cmp.moreStable).toBe("milling");
  });

  it("sloStatus reports pass/fail against targets", () => {
    masterAITrainingLedgerEngine.ingest(entry(1, {
      pipelineType: "milling",
      trainingMetrics: { loss: 0.3, accuracy: 0.85, mae: 0.1, evalScore: 80 },
      sloTargets: { minEvalScore: 70, maxLoss: 0.5 },
    }));
    masterAITrainingLedgerEngine.ingest(entry(2, {
      pipelineType: "milling",
      trainingMetrics: { loss: 0.3, accuracy: 0.85, mae: 0.1, evalScore: 50 },
      sloTargets: { minEvalScore: 70, maxLoss: 0.5 },
    }));
    const slos = masterAITrainingLedgerEngine.sloStatus();
    const mill = slos.find((s) => s.pipelineType === "milling")!;
    expect(mill.runCount).toBe(2);
    expect(mill.passing).toBe(1);
    expect(mill.failing).toBe(1);
    expect(mill.passRate).toBeCloseTo(0.5, 6);
  });

  it("sloStatus includes all 8 pipelines even with no runs", () => {
    const slos = masterAITrainingLedgerEngine.sloStatus();
    expect(slos).toHaveLength(8);
    for (const s of slos) expect(s.runCount).toBe(0);
  });

  it("supportedPipelines returns a copy (mutation-safe)", () => {
    const a = masterAITrainingLedgerEngine.supportedPipelines();
    a.push("junk" as any);
    const b = masterAITrainingLedgerEngine.supportedPipelines();
    expect(b).not.toContain("junk");
  });

  it("compare handles self-comparison gracefully", () => {
    masterAITrainingLedgerEngine.ingest(entry(1));
    masterAITrainingLedgerEngine.ingest(entry(2));
    const cmp = masterAITrainingLedgerEngine.compare("milling", "milling");
    expect(cmp.moreStable).toBe("tie");
  });

  it("rejects empty runId", () => {
    expect(() => masterAITrainingLedgerEngine.ingest(entry(1, { runId: "" }))).toThrow(/runId/);
  });
});

describe("LoRADriftCoordinatorEngine", () => {
  beforeEach(() => loRADriftCoordinatorEngine.reset());

  it("defaults window to 2h, threshold 2, floor 0.10", () => {
    const c = loRADriftCoordinatorEngine.getConfig();
    expect(c.windowMs).toBe(2 * 60 * 60 * 1000);
    expect(c.coordinatedThreshold).toBe(2);
    expect(c.driftDeltaFloor).toBeCloseTo(0.10, 6);
  });

  it("single drift → pipelineDrift event, severity warning", () => {
    const clock = () => new Date("2026-04-20T10:00:00Z");
    const c = createLoRADriftCoordinator(clock);
    const ev = c.record({
      pipelineType: "milling",
      delta: 0.15,
      observedAt: "2026-04-20T10:00:00Z",
      baselineEvalScore: 80,
      currentEvalScore: 68,
    });
    expect(ev.kind).toBe("pipelineDrift");
    expect(ev.severity).toBe("warning");
  });

  it("below-floor delta → info (no alert)", () => {
    const clock = () => new Date("2026-04-20T10:00:00Z");
    const c = createLoRADriftCoordinator(clock);
    const ev = c.record({
      pipelineType: "milling",
      delta: 0.05,
      observedAt: "2026-04-20T10:00:00Z",
      baselineEvalScore: 80,
      currentEvalScore: 76,
    });
    expect(ev.severity).toBe("info");
  });

  it("two pipelines drifting in window → coordinatedDrift (critical)", () => {
    const clock = () => new Date("2026-04-20T10:00:00Z");
    const c = createLoRADriftCoordinator(clock);
    c.record({ pipelineType: "milling", delta: 0.15, observedAt: "2026-04-20T09:50:00Z", baselineEvalScore: 80, currentEvalScore: 68 });
    const ev = c.record({ pipelineType: "wedm", delta: 0.20, observedAt: "2026-04-20T10:00:00Z", baselineEvalScore: 75, currentEvalScore: 60 });
    expect(ev.kind).toBe("coordinatedDrift");
    expect(ev.severity).toBe("critical");
    expect(ev.pipelineTypes.sort()).toEqual(["milling", "wedm"]);
  });

  it("drifts outside the window don't count as coordinated", () => {
    const clock = () => new Date("2026-04-20T10:00:00Z");
    const c = createLoRADriftCoordinator(clock, { windowMs: 60 * 1000 }); // 1-minute window
    c.record({ pipelineType: "milling", delta: 0.15, observedAt: "2026-04-20T09:00:00Z", baselineEvalScore: 80, currentEvalScore: 68 });
    // Milling drift is 1h old; with 1-min window it's expired.
    const ev = c.record({ pipelineType: "wedm", delta: 0.20, observedAt: "2026-04-20T10:00:00Z", baselineEvalScore: 75, currentEvalScore: 60 });
    expect(ev.kind).toBe("pipelineDrift");
  });

  it("activePipelines returns only drifted pipelines within window", () => {
    const clock = () => new Date("2026-04-20T10:00:00Z");
    const c = createLoRADriftCoordinator(clock);
    c.record({ pipelineType: "milling", delta: 0.15, observedAt: "2026-04-20T09:50:00Z", baselineEvalScore: 80, currentEvalScore: 68 });
    c.record({ pipelineType: "laser", delta: 0.05, observedAt: "2026-04-20T09:55:00Z", baselineEvalScore: 80, currentEvalScore: 76 });
    const active = c.activePipelines();
    expect(active).toContain("milling");
    expect(active).not.toContain("laser"); // below floor
  });

  it("shouldTriggerMasterRetrain=false with one drifted pipeline", () => {
    const clock = () => new Date("2026-04-20T10:00:00Z");
    const c = createLoRADriftCoordinator(clock);
    c.record({ pipelineType: "milling", delta: 0.15, observedAt: "2026-04-20T10:00:00Z", baselineEvalScore: 80, currentEvalScore: 68 });
    expect(c.shouldTriggerMasterRetrain()).toBe(false);
  });

  it("shouldTriggerMasterRetrain=true with two drifted pipelines", () => {
    const clock = () => new Date("2026-04-20T10:00:00Z");
    const c = createLoRADriftCoordinator(clock);
    c.record({ pipelineType: "milling", delta: 0.15, observedAt: "2026-04-20T09:55:00Z", baselineEvalScore: 80, currentEvalScore: 68 });
    c.record({ pipelineType: "wedm", delta: 0.20, observedAt: "2026-04-20T10:00:00Z", baselineEvalScore: 75, currentEvalScore: 60 });
    expect(c.shouldTriggerMasterRetrain()).toBe(true);
  });

  it("checkAllClear returns event when no active drifts", () => {
    const clock = () => new Date("2026-04-20T10:00:00Z");
    const c = createLoRADriftCoordinator(clock);
    c.record({ pipelineType: "milling", delta: 0.05, observedAt: "2026-04-20T10:00:00Z", baselineEvalScore: 80, currentEvalScore: 76 });
    // Not drifted (below floor) but recorded → allClear should fire.
    const ev = c.checkAllClear();
    expect(ev?.kind).toBe("allClear");
  });

  it("rejects invalid config (threshold < 2)", () => {
    const c = createLoRADriftCoordinator(() => new Date());
    expect(() => c.setConfig({ coordinatedThreshold: 1 })).toThrow(/threshold/i);
  });

  it("record rejects non-finite delta", () => {
    const c = createLoRADriftCoordinator(() => new Date());
    expect(() =>
      c.record({ pipelineType: "milling", delta: NaN, observedAt: "2026-04-20T00:00:00Z", baselineEvalScore: 1, currentEvalScore: 1 }),
    ).toThrow(/finite/);
  });

  it("prunes old observations automatically on record", () => {
    const clock = () => new Date("2026-04-20T10:00:00Z");
    const c = createLoRADriftCoordinator(clock, { windowMs: 60 * 1000 });
    c.record({ pipelineType: "milling", delta: 0.15, observedAt: "2026-04-20T09:50:00Z", baselineEvalScore: 80, currentEvalScore: 68 });
    c.record({ pipelineType: "wedm", delta: 0.20, observedAt: "2026-04-20T10:00:00Z", baselineEvalScore: 75, currentEvalScore: 60 });
    // Milling was 10m old > 1-min window → should be pruned.
    expect(c.bufferSize()).toBe(1);
  });
});
