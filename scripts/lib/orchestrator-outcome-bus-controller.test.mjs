// scripts/lib/orchestrator-outcome-bus-controller.test.mjs
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_BATCH_SIZE,
  SIGMA_MUTATION_THRESHOLD,
  AUROC_FLOOR,
  createOutcomeBusController,
} from "./orchestrator-outcome-bus-controller.mjs";

function evt(extra = {}) {
  return {
    stage: "SSF",
    engineRef: "SpeedFeedOrchestratorEngine",
    predicted: { cycle_sec: 600 },
    actual: { cycle_sec: 720 },
    part_id: "PART-001",
    timestamp: "2026-05-27T12:00:00.000Z",
    delta_sigma: 3.0,  // above threshold by default
    ...extra,
  };
}

describe("constants", () => {
  it("exports tunable thresholds", () => {
    assert.equal(typeof DEFAULT_BATCH_SIZE, "number");
    assert.equal(typeof SIGMA_MUTATION_THRESHOLD, "number");
    assert.equal(typeof AUROC_FLOOR, "number");
    assert.ok(AUROC_FLOOR > 0 && AUROC_FLOOR < 1);
  });
});

describe("createOutcomeBusController construction", () => {
  it("rejects batchSize < 1", () => {
    assert.throws(() => createOutcomeBusController({ batchSize: 0 }), /batchSize/);
  });
});

describe("ingest happy path", () => {
  it("processes event + fans out + counts processed", async () => {
    const sawOverride = [];
    const sawReplay = [];
    const c = createOutcomeBusController({
      onOverrideCapture: (e) => sawOverride.push(e.part_id),
      onReplayBuffer:    (e) => sawReplay.push(e.part_id),
    });
    const r = await c.ingest(evt());
    assert.equal(r.ingested, true);
    assert.equal(r.mutated, true);
    assert.deepEqual(sawOverride, ["PART-001"]);
    assert.deepEqual(sawReplay, ["PART-001"]);
    assert.equal(c.snapshot().processedCount, 1);
  });

  it("skips mutation when delta_sigma < threshold", async () => {
    const sawOverride = [];
    const c = createOutcomeBusController({
      onOverrideCapture: (e) => sawOverride.push(e.part_id),
    });
    const r = await c.ingest(evt({ delta_sigma: 0.5 }));
    assert.equal(r.mutated, false);
    assert.match(r.reason, /below-sigma-threshold/);
    assert.equal(sawOverride.length, 0);
    assert.equal(c.snapshot().skippedLowSigmaCount, 1);
  });

  it("acquires + releases lock when injected", async () => {
    const lockHistory = [];
    const c = createOutcomeBusController({
      lockAcquire: async (key) => {
        lockHistory.push(`acquired ${key}`);
        return async () => { lockHistory.push(`released ${key}`); };
      },
    });
    await c.ingest(evt());
    assert.deepEqual(lockHistory, [
      "acquired model::SpeedFeedOrchestratorEngine",
      "released model::SpeedFeedOrchestratorEngine",
    ]);
  });

  it("releases lock even if a fan-out throws (lock safety)", async () => {
    const lockHistory = [];
    const c = createOutcomeBusController({
      lockAcquire: async (key) => {
        lockHistory.push("acq");
        return async () => { lockHistory.push("rel"); };
      },
      onOverrideCapture: () => { throw new Error("fanout crash"); },
    });
    await c.ingest(evt());
    assert.deepEqual(lockHistory, ["acq", "rel"]);
  });

  it("logs audit entries per event", async () => {
    const audited = [];
    const c = createOutcomeBusController({ auditLog: (e) => audited.push(e) });
    await c.ingest(evt());
    await c.ingest(evt({ part_id: "PART-002" }));
    assert.equal(audited.length, 2);
    assert.ok(audited[0].event_id.includes("PART-001"));
  });
});

describe("R12 fail-loud: input validation", () => {
  it("rejects null event", async () => {
    const c = createOutcomeBusController({});
    await assert.rejects(c.ingest(null), /event object required/);
  });

  it("rejects event missing required field", async () => {
    const c = createOutcomeBusController({});
    await assert.rejects(c.ingest({ stage: "X" }), /event\.engineRef required/);
  });

  it("triggerRetrain rejects missing engineRef", async () => {
    const c = createOutcomeBusController({});
    await assert.rejects(c.triggerRetrain({}), /engineRef required/);
  });
});

describe("batch + flush", () => {
  it("flushes batch when threshold reached", async () => {
    const calibrated = [];
    const c = createOutcomeBusController({
      batchSize: 3,
      onCalibration: (events) => calibrated.push(events.length),
    });
    await c.ingest(evt({ part_id: "P1" }));
    await c.ingest(evt({ part_id: "P2" }));
    assert.equal(calibrated.length, 0);
    await c.ingest(evt({ part_id: "P3" }));  // hits threshold
    assert.deepEqual(calibrated, [3]);
  });

  it("flushBatch drains pending events on demand", async () => {
    const calibrated = [];
    const c = createOutcomeBusController({
      batchSize: 100,  // never auto-flush
      onCalibration: (events) => calibrated.push(events.length),
    });
    await c.ingest(evt({ part_id: "X" }));
    const r = await c.flushBatch();
    assert.equal(r.flushed, 1);
    assert.deepEqual(calibrated, [1]);
  });

  it("flushBatch on empty batch is a no-op", async () => {
    const c = createOutcomeBusController({});
    const r = await c.flushBatch();
    assert.equal(r.flushed, 0);
  });
});

describe("triggerRetrain — gates", () => {
  it("triggers retrain when AUROC above floor + no drop", async () => {
    const fired = [];
    const c = createOutcomeBusController({
      onRetrainTrigger: (e) => fired.push(e.engineRef),
    });
    const r = await c.triggerRetrain({ engineRef: "X", currentAUROC: 0.85, baselineAUROC: 0.84 });
    assert.equal(r.retrained, true);
    assert.deepEqual(fired, ["X"]);
  });

  it("rolls back instead of retraining when AUROC drops >5%", async () => {
    const c = createOutcomeBusController({});
    const r = await c.triggerRetrain({ engineRef: "X", currentAUROC: 0.70, baselineAUROC: 0.85 });
    assert.equal(r.retrained, false);
    assert.equal(r.rollback_triggered, true);
    assert.equal(c.snapshot().rollbacksCount, 1);
  });

  it("refuses retrain below AUROC floor", async () => {
    const fired = [];
    const c = createOutcomeBusController({
      onRetrainTrigger: (e) => fired.push(e),
    });
    const r = await c.triggerRetrain({ engineRef: "X", currentAUROC: 0.70, baselineAUROC: 0.71 });
    assert.equal(r.retrained, false);
    assert.match(r.reason, /below floor/);
    assert.equal(fired.length, 0);
  });
});

describe("snapshot + auditTail", () => {
  it("snapshot includes all counters", async () => {
    const c = createOutcomeBusController({});
    await c.ingest(evt());
    const s = c.snapshot();
    assert.equal(s.processedCount, 1);
    assert.equal(s.mutatedCount, 1);
    assert.equal(typeof s.auditCount, "number");
  });

  it("auditTail returns last N entries", async () => {
    const c = createOutcomeBusController({});
    for (let i = 0; i < 5; i++) await c.ingest(evt({ part_id: `P${i}` }));
    const tail = c.auditTail(3);
    assert.equal(tail.length, 3);
  });
});
