// scripts/lib/orchestrator-cad-fanout-streaming.test.mjs
//
// Tests for U-MMO-CAD-FANOUT-STREAMING.
// Run: node --test H:/prism/scripts/lib/orchestrator-cad-fanout-streaming.test.mjs

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_BUFFER_SIZE,
  createFeatureStreamer,
  createCADFanoutAdapter,
} from "./orchestrator-cad-fanout-streaming.mjs";
import { validateStageAdapter, createPipeline } from "./orchestrator-pipeline-shell.mjs";

const sampleFeatures = [
  { id: "f1", type: "hole", geometry: { d: 6 } },
  { id: "f2", type: "pocket", geometry: { w: 30, h: 15, d: 10 } },
  { id: "f3", type: "thread", geometry: { d: 12, pitch: 1.75 } },
  { id: "f4", type: "fillet", geometry: { r: 2 }, gdnt: { tol: 0.05 } },
];

// ---------------------------------------------------------------------------
// createFeatureStreamer — construction
// ---------------------------------------------------------------------------

describe("createFeatureStreamer construction", () => {
  it("rejects missing recognize fn", () => {
    assert.throws(() => createFeatureStreamer({}), /recognize fn required/);
  });

  it("rejects invalid bufferSize", () => {
    assert.throws(() => createFeatureStreamer({ recognize: () => [], bufferSize: 0 }), /positive number/);
    assert.throws(() => createFeatureStreamer({ recognize: () => [], bufferSize: -1 }), /positive number/);
  });

  it("exports DEFAULT_BUFFER_SIZE > 0", () => {
    assert.ok(DEFAULT_BUFFER_SIZE > 0);
  });
});

// ---------------------------------------------------------------------------
// Sync recognizer mode
// ---------------------------------------------------------------------------

describe("sync recognizer mode (array return)", () => {
  it("emits each feature to a subscriber in order", async () => {
    const collected = [];
    const s = createFeatureStreamer({ recognize: () => sampleFeatures });
    s.subscribe({ onFeature: (f, i) => collected.push({ f, i }) });
    const out = await s.run();
    assert.equal(collected.length, sampleFeatures.length);
    assert.deepEqual(collected.map((c) => c.f.id), ["f1", "f2", "f3", "f4"]);
    assert.deepEqual(collected.map((c) => c.i), [0, 1, 2, 3]);
    assert.deepEqual(out, sampleFeatures);
  });

  it("fans out to multiple subscribers", async () => {
    const a = [];
    const b = [];
    const s = createFeatureStreamer({ recognize: () => sampleFeatures });
    s.subscribe({ onFeature: (f) => a.push(f.id) });
    s.subscribe({ onFeature: (f) => b.push(f.id) });
    await s.run();
    assert.deepEqual(a, ["f1", "f2", "f3", "f4"]);
    assert.deepEqual(b, ["f1", "f2", "f3", "f4"]);
  });

  it("calls onComplete with the full collected array", async () => {
    let completed = null;
    const s = createFeatureStreamer({ recognize: () => sampleFeatures });
    s.subscribe({ onFeature: () => {}, onComplete: (all) => { completed = all; } });
    await s.run();
    assert.equal(completed.length, sampleFeatures.length);
  });

  it("R12: throws on non-array return from sync recognizer", () => {
    const s = createFeatureStreamer({ recognize: () => "not-an-array", recognizerMode: "sync" });
    assert.throws(() => s.run(), /must return an array/);
  });

  it("late subscribers receive replay of already-emitted features", async () => {
    const seen = [];
    const s = createFeatureStreamer({ recognize: () => sampleFeatures });
    await s.run();
    // Subscribe AFTER run — should still see all replayed
    s.subscribe({ onFeature: (f) => seen.push(f.id) });
    assert.deepEqual(seen, ["f1", "f2", "f3", "f4"]);
  });
});

// ---------------------------------------------------------------------------
// Async-iter recognizer mode
// ---------------------------------------------------------------------------

describe("async-iter recognizer mode", () => {
  async function* asyncRecognize() {
    for (const f of sampleFeatures) {
      yield f;
    }
  }

  it("emits features yielded by async iterator", async () => {
    const collected = [];
    const s = createFeatureStreamer({
      recognize: () => asyncRecognize(),
      recognizerMode: "async-iter",
    });
    s.subscribe({ onFeature: (f) => collected.push(f.id) });
    await s.run();
    assert.deepEqual(collected, ["f1", "f2", "f3", "f4"]);
  });

  it("R12: throws when async-iter mode returns non-iterable", async () => {
    const s = createFeatureStreamer({
      recognize: () => sampleFeatures,  // returns array, not async-iter
      recognizerMode: "async-iter",
    });
    await assert.rejects(s.run(), /must return an AsyncIterable/);
  });
});

// ---------------------------------------------------------------------------
// Push recognizer mode
// ---------------------------------------------------------------------------

describe("push recognizer mode (callback-driven)", () => {
  it("emits features through the callback", async () => {
    const collected = [];
    const s = createFeatureStreamer({
      recognize: (emit) => { for (const f of sampleFeatures) emit(f); },
      recognizerMode: "push",
    });
    s.subscribe({ onFeature: (f) => collected.push(f.id) });
    await s.run();
    assert.deepEqual(collected, ["f1", "f2", "f3", "f4"]);
  });

  it("auto-detects push mode when fn has callback parameter", async () => {
    const collected = [];
    const s = createFeatureStreamer({
      recognize: (emit) => { emit({ id: "auto", type: "hole" }); },
      // auto-detect (no explicit mode)
    });
    s.subscribe({ onFeature: (f) => collected.push(f.id) });
    await s.run();
    assert.deepEqual(collected, ["auto"]);
  });
});

// ---------------------------------------------------------------------------
// Error handling (R12 fail-loud)
// ---------------------------------------------------------------------------

describe("R12 fail-loud: error handling", () => {
  it("propagates recognizer throw via run() throw", () => {
    const s = createFeatureStreamer({
      recognize: () => { throw new Error("recognizer crash"); },
      recognizerMode: "sync",
    });
    assert.throws(() => s.run(), /recognizer crash/);
    assert.ok(s.error() instanceof Error);
  });

  it("calls subscriber.onError when stream errors", () => {
    let errCaught = null;
    const s = createFeatureStreamer({
      recognize: () => { throw new Error("boom"); },
      recognizerMode: "sync",
    });
    s.subscribe({ onFeature: () => {}, onError: (e) => { errCaught = e; } });
    assert.throws(() => s.run());
    assert.match(errCaught.message, /boom/);
  });

  it("subscriber.onFeature throw does NOT break the stream (observation only)", async () => {
    const survivors = [];
    const s = createFeatureStreamer({ recognize: () => sampleFeatures });
    s.subscribe({
      onFeature: (f) => { if (f.id === "f2") throw new Error("sub crash"); },
    });
    s.subscribe({
      onFeature: (f) => survivors.push(f.id),
    });
    await s.run();
    // Other subscriber still received all features
    assert.deepEqual(survivors, ["f1", "f2", "f3", "f4"]);
  });

  it("rejects re-running the same streamer", () => {
    const s = createFeatureStreamer({ recognize: () => sampleFeatures });
    s.run();
    assert.throws(() => s.run(), /already run/);
  });

  it("subscribe requires onFeature fn", () => {
    const s = createFeatureStreamer({ recognize: () => sampleFeatures });
    assert.throws(() => s.subscribe({}), /onFeature fn required/);
  });
});

// ---------------------------------------------------------------------------
// Diagnostics
// ---------------------------------------------------------------------------

describe("diagnostics", () => {
  it("emittedCount tracks features as they go out", async () => {
    const s = createFeatureStreamer({ recognize: () => sampleFeatures });
    await s.run();
    assert.equal(s.emittedCount(), sampleFeatures.length);
  });

  it("subscriberCount reflects current subscribers", () => {
    const s = createFeatureStreamer({ recognize: () => sampleFeatures });
    const unsub = s.subscribe({ onFeature: () => {} });
    assert.equal(s.subscriberCount(), 1);
    unsub();
    assert.equal(s.subscriberCount(), 0);
  });
});

// ---------------------------------------------------------------------------
// createCADFanoutAdapter (pipeline-shell adapter)
// ---------------------------------------------------------------------------

describe("createCADFanoutAdapter", () => {
  it("rejects missing recognize fn", () => {
    assert.throws(() => createCADFanoutAdapter({}), /recognize fn required/);
  });

  it("conforms to pipeline-shell adapter contract", () => {
    const a = createCADFanoutAdapter({ recognize: () => sampleFeatures });
    validateStageAdapter(a, "CAD");
  });

  it("returns featureGraph + confidence + evidence in adapter run()", () => {
    const a = createCADFanoutAdapter({ recognize: () => sampleFeatures });
    const r = a.run({ rfq_id: "X" }, {});
    assert.equal(r.confidence, 0.92);
    assert.equal(r.deferred, false);
    assert.equal(r.output.featureGraph.features.length, sampleFeatures.length);
    assert.ok(r.evidence.some((e) => e.includes("recognized 4 features")));
  });

  it("propagates GD&T side-channel from feature.gdnt entries", () => {
    const a = createCADFanoutAdapter({ recognize: () => sampleFeatures });
    const r = a.run({}, {});
    // sampleFeatures has 1 GD&T entry (f4)
    assert.ok(r.gdnt_passthrough);
    assert.equal(r.gdnt_passthrough.features.length, 1);
  });

  it("R12: surfaces recognizer throw as errored stage result", () => {
    const a = createCADFanoutAdapter({ recognize: () => { throw new Error("CAD crash"); } });
    const r = a.run({}, {});
    assert.equal(r.confidence, 0);
    assert.equal(r.output._error, true);
    assert.match(r.trace, /CAD-FANOUT error/);
  });

  it("subscribers see features even when adapter is invoked synchronously", () => {
    const seen = [];
    const a = createCADFanoutAdapter({
      recognize: () => sampleFeatures,
      subscribers: [{ onFeature: (f) => seen.push(f.id) }],
    });
    a.run({}, {});
    assert.deepEqual(seen, ["f1", "f2", "f3", "f4"]);
  });
});

// ---------------------------------------------------------------------------
// End-to-end with the pipeline shell
// ---------------------------------------------------------------------------

describe("end-to-end with pipeline shell", () => {
  it("CAD adapter contributes a real Stage 4 to a full pipeline run", () => {
    const p = createPipeline({ mode: "estimate" });
    p.registerStage("CAD", createCADFanoutAdapter({ recognize: () => sampleFeatures }));
    const r = p.run({ rfq_id: "INT-CAD" });
    const cad = r.decomposition.find((s) => s.stage === "CAD");
    assert.equal(cad.deferred, false);
    assert.equal(cad.confidence, 0.92);
    // GD&T side-channel propagated to pipeline-shell context
    assert.ok(r.gdnt_final, "GD&T side-channel should be propagated");
  });

  it("downstream subscriber can begin work as features stream in", () => {
    const order = [];
    const downstreamSub = { onFeature: (f) => order.push(`sub-saw-${f.id}`) };
    const p = createPipeline({ mode: "estimate" });
    p.registerStage("CAD", createCADFanoutAdapter({
      recognize: () => { order.push("rec-start"); return sampleFeatures; },
      subscribers: [downstreamSub],
    }));
    p.run({});
    assert.deepEqual(order, ["rec-start", "sub-saw-f1", "sub-saw-f2", "sub-saw-f3", "sub-saw-f4"]);
  });
});
