// scripts/lib/orchestrator-override-receipt-loop.test.mjs
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_RETRAIN_THRESHOLD,
  VALID_INTENTS,
  createOverrideReceiptStore,
} from "./orchestrator-override-receipt-loop.mjs";

function makeStore(overrides = {}) {
  const events = [];
  const store = createOverrideReceiptStore({
    emit: (e) => events.push(e),
    retrainThreshold: 5,
    now: () => "2026-05-27T00:00:00.000Z",
    ...overrides,
  });
  return { store, events };
}

function baseOverride(extra = {}) {
  return { stage: "SSF", engineRef: "SpeedFeedOrchestratorEngine", suggested: { rpm: 2000 }, actual: { rpm: 1800 }, intent: "tribal", ...extra };
}

describe("createOverrideReceiptStore", () => {
  it("rejects missing emit fn", () => {
    assert.throws(() => createOverrideReceiptStore({}), /emit fn required/);
  });

  it("rejects retrainThreshold < 1", () => {
    assert.throws(() => createOverrideReceiptStore({ emit: () => {}, retrainThreshold: 0 }), />= 1/);
  });

  it("exports VALID_INTENTS frozen with 4 entries", () => {
    assert.equal(VALID_INTENTS.length, 4);
    assert.ok(Object.isFrozen(VALID_INTENTS));
    for (const i of ["tribal", "emergency", "over-conservative", "over-aggressive"]) {
      assert.ok(VALID_INTENTS.includes(i));
    }
  });

  it("DEFAULT_RETRAIN_THRESHOLD is a positive integer", () => {
    assert.ok(Number.isInteger(DEFAULT_RETRAIN_THRESHOLD));
    assert.ok(DEFAULT_RETRAIN_THRESHOLD > 0);
  });
});

describe("captureOverride happy path", () => {
  it("records + returns a receipt with count=1 on first override", () => {
    const { store } = makeStore();
    const r = store.captureOverride(baseOverride());
    assert.equal(r.recorded, true);
    assert.equal(r.intent, "tribal");
    assert.equal(r.count_this_period, 1);
    assert.equal(r.retrain_triggered, false);
    assert.match(r.message, /1\/5/);
  });

  it("increments per-engine counter on successive overrides", () => {
    const { store } = makeStore();
    store.captureOverride(baseOverride());
    store.captureOverride(baseOverride());
    const r = store.captureOverride(baseOverride());
    assert.equal(r.count_this_period, 3);
    assert.equal(store.counterFor("SSF", "SpeedFeedOrchestratorEngine"), 3);
  });

  it("emits 2 events per capture (captured + receipt)", () => {
    const { store, events } = makeStore();
    store.captureOverride(baseOverride());
    const types = events.map((e) => e.type);
    assert.ok(types.includes("override.captured"));
    assert.ok(types.includes("override.receipt"));
  });

  it("captures all 4 intent classes — variability axis", () => {
    const { store } = makeStore();
    for (const intent of VALID_INTENTS) {
      const r = store.captureOverride(baseOverride({ intent }));
      assert.equal(r.intent, intent);
      assert.equal(r.recorded, true);
    }
  });

  it("emit failures do not break captureOverride (R12 observation-not-control)", () => {
    const store = createOverrideReceiptStore({
      emit: () => { throw new Error("sink down"); },
      retrainThreshold: 5,
    });
    const r = store.captureOverride(baseOverride());
    assert.equal(r.recorded, true);
  });
});

describe("retrain threshold + auto-trigger", () => {
  it("emits retrain_triggered + resets counter at threshold", () => {
    const { store, events } = makeStore();
    for (let i = 0; i < 5; i++) store.captureOverride(baseOverride());
    const retrainEvents = events.filter((e) => e.type === "override.retrain_triggered");
    assert.equal(retrainEvents.length, 1);
    assert.equal(retrainEvents[0].count, 5);
    assert.equal(retrainEvents[0].threshold, 5);
    assert.equal(store.counterFor("SSF", "SpeedFeedOrchestratorEngine"), 0);
  });

  it("receipt at the threshold flips retrain_triggered=true + resets count to 0", () => {
    const { store } = makeStore();
    for (let i = 0; i < 4; i++) store.captureOverride(baseOverride());
    const r = store.captureOverride(baseOverride()); // 5th
    assert.equal(r.retrain_triggered, true);
    assert.equal(r.count_this_period, 0);
    assert.match(r.message, /Retrain queued/);
  });

  it("per-engine counters are independent (variability)", () => {
    const { store } = makeStore();
    store.captureOverride(baseOverride({ stage: "SSF" }));
    store.captureOverride(baseOverride({ stage: "CAM_STRATEGY", engineRef: "CAMKernelOrchestratorEngine" }));
    assert.equal(store.counterFor("SSF", "SpeedFeedOrchestratorEngine"), 1);
    assert.equal(store.counterFor("CAM_STRATEGY", "CAMKernelOrchestratorEngine"), 1);
  });
});

describe("R12 fail-loud: input validation", () => {
  it("rejects null override", () => {
    const { store } = makeStore();
    assert.throws(() => store.captureOverride(null), /override object required/);
  });

  it("rejects missing stage", () => {
    const { store } = makeStore();
    assert.throws(() => store.captureOverride({ engineRef: "X", intent: "tribal" }), /stage \(string\) required/);
  });

  it("rejects missing engineRef", () => {
    const { store } = makeStore();
    assert.throws(() => store.captureOverride({ stage: "SSF", intent: "tribal" }), /engineRef \(string\) required/);
  });

  it("rejects invalid intent", () => {
    const { store } = makeStore();
    assert.throws(() => store.captureOverride({ stage: "SSF", engineRef: "X", intent: "vibes" }), /intent must be one of/);
  });
});

describe("dashboardSnapshot", () => {
  it("aggregates per-engine counts + retrain progress percent", () => {
    const { store } = makeStore();
    store.captureOverride(baseOverride());
    store.captureOverride(baseOverride());
    const snap = store.dashboardSnapshot();
    assert.equal(snap.retrainThreshold, 5);
    assert.equal(snap.engines.length, 1);
    assert.equal(snap.engines[0].count_this_period, 2);
    assert.equal(snap.engines[0].retrain_progress_pct, 40);  // 2/5 = 40%
  });

  it("byIntent breakdown across captures", () => {
    const { store } = makeStore();
    store.captureOverride(baseOverride({ intent: "tribal" }));
    store.captureOverride(baseOverride({ intent: "tribal" }));
    store.captureOverride(baseOverride({ intent: "emergency" }));
    store.captureOverride(baseOverride({ intent: "over-aggressive" }));
    const snap = store.dashboardSnapshot();
    assert.equal(snap.byIntent.tribal, 2);
    assert.equal(snap.byIntent.emergency, 1);
    assert.equal(snap.byIntent["over-aggressive"], 1);
  });
});

describe("rlTrainingRecords — only tribal + emergency feed RL (Agent I doctrine)", () => {
  it("returns only tribal + emergency intent records", () => {
    const { store } = makeStore();
    store.captureOverride(baseOverride({ intent: "tribal" }));
    store.captureOverride(baseOverride({ intent: "emergency" }));
    store.captureOverride(baseOverride({ intent: "over-aggressive" }));
    store.captureOverride(baseOverride({ intent: "over-conservative" }));
    const rl = store.rlTrainingRecords();
    assert.equal(rl.length, 2);
    assert.ok(rl.every((r) => r.intent === "tribal" || r.intent === "emergency"));
  });
});

describe("deterministic", () => {
  it("same sequence of captures produces same receipts", () => {
    const a = makeStore().store;
    const b = makeStore().store;
    const seq = [
      baseOverride(),
      baseOverride({ intent: "emergency" }),
      baseOverride({ stage: "POST", engineRef: "MasterPostProcessorEngine" }),
    ];
    const ra = seq.map((o) => a.captureOverride(o));
    const rb = seq.map((o) => b.captureOverride(o));
    assert.deepEqual(ra, rb);
  });
});
