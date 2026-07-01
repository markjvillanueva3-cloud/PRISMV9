// scripts/lib/orchestrator-dark-stage-instrumentation.test.mjs
//
// Tests for U-MMO-DARK-STAGE-INSTRUMENTATION.
// Run: node --test H:/prism/scripts/lib/orchestrator-dark-stage-instrumentation.test.mjs

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  computeDelta,
  instrumentStageAdapter,
  instrumentDarkStages,
} from "./orchestrator-dark-stage-instrumentation.mjs";
import { createPipeline } from "./orchestrator-pipeline-shell.mjs";
import { createFeasibilityGateAdapter } from "./orchestrator-stage-adapters.mjs";

// ---------------------------------------------------------------------------
// computeDelta
// ---------------------------------------------------------------------------

describe("computeDelta", () => {
  it("returns zero magnitude when predicted == actual", () => {
    const d = computeDelta({ cycle: 60, scrap: 0.02 }, { cycle: 60, scrap: 0.02 });
    assert.equal(d.magnitude, 0);
    assert.equal(d.per_field.cycle, 0);
    assert.equal(d.per_field.scrap, 0);
  });

  it("computes per-field delta for numeric fields", () => {
    const d = computeDelta({ cycle: 60, scrap: 0.02 }, { cycle: 65, scrap: 0.05 });
    assert.equal(d.per_field.cycle, 5);
    assert.ok(Math.abs(d.per_field.scrap - 0.03) < 1e-9);
    assert.ok(d.magnitude > 0);
  });

  it("magnitude is Euclidean distance", () => {
    const d = computeDelta({ a: 0, b: 0 }, { a: 3, b: 4 });
    assert.equal(d.magnitude, 5);  // sqrt(9+16) = 5
  });

  it("handles boolean fields (0/1 distance)", () => {
    const d = computeDelta({ feasible: true }, { feasible: false });
    assert.equal(d.per_field.feasible, 1);
    assert.equal(d.magnitude, 1);
  });

  it("handles string fields (0/1 distance)", () => {
    const d = computeDelta({ material: "4140" }, { material: "316L" });
    assert.equal(d.per_field.material, 1);
  });

  it("skips fields of non-comparable types", () => {
    const d = computeDelta({ a: 5 }, { a: "string" });
    assert.equal(d.per_field.a, undefined);
  });

  it("returns empty deltas for null inputs", () => {
    assert.deepEqual(computeDelta(null, { a: 1 }).per_field, {});
    assert.equal(computeDelta(null, { a: 1 }).magnitude, 0);
    assert.deepEqual(computeDelta({ a: 1 }, null).per_field, {});
  });

  it("ignores NaN/Infinity (only finite numbers compared)", () => {
    const d = computeDelta({ a: 5, b: 10 }, { a: NaN, b: Infinity });
    assert.equal(d.per_field.a, undefined);
    assert.equal(d.per_field.b, undefined);
    assert.equal(d.magnitude, 0);
  });
});

// ---------------------------------------------------------------------------
// instrumentStageAdapter — construction
// ---------------------------------------------------------------------------

describe("instrumentStageAdapter construction", () => {
  const base = createFeasibilityGateAdapter({ callEngine: () => ({ feasible: true, confidence: 0.9 }) });

  it("rejects missing baseAdapter", () => {
    assert.throws(() => instrumentStageAdapter(null, { stageId: "FEASIBILITY_GATE", emit: () => {} }), /baseAdapter/);
  });

  it("rejects baseAdapter without .run()", () => {
    assert.throws(() => instrumentStageAdapter({ engineRef: "x" }, { stageId: "FEASIBILITY_GATE", emit: () => {} }), /\.run\(\)/);
  });

  it("rejects missing options.emit", () => {
    assert.throws(() => instrumentStageAdapter(base, { stageId: "FEASIBILITY_GATE" }), /emit fn required/);
  });

  it("rejects missing stageId", () => {
    assert.throws(() => instrumentStageAdapter(base, { emit: () => {} }), /stageId required/);
  });

  it("tags engineRef with +instrumented marker", () => {
    const wrapped = instrumentStageAdapter(base, { stageId: "FEASIBILITY_GATE", emit: () => {} });
    assert.match(wrapped.engineRef, /\+instrumented/);
  });

  it("preserves stageId", () => {
    const wrapped = instrumentStageAdapter(base, { stageId: "FEASIBILITY_GATE", emit: () => {} });
    assert.equal(wrapped.stageId, "FEASIBILITY_GATE");
  });
});

// ---------------------------------------------------------------------------
// instrumentStageAdapter — event emission
// ---------------------------------------------------------------------------

describe("instrumentStageAdapter — event emission", () => {
  function makeBase(result = { feasible: true, confidence: 0.9 }) {
    return createFeasibilityGateAdapter({ callEngine: () => result });
  }

  it("emits start + predicted + end events on a successful run", () => {
    const events = [];
    const wrapped = instrumentStageAdapter(makeBase(), {
      stageId: "FEASIBILITY_GATE",
      emit: (e) => events.push(e),
    });
    wrapped.run({ rfq_id: "X" }, {});
    const types = events.map((e) => e.type);
    assert.deepEqual(types, ["start", "predicted", "end"]);
  });

  it("predicted event includes the base adapter's output + confidence", () => {
    const events = [];
    const wrapped = instrumentStageAdapter(makeBase(), {
      stageId: "FEASIBILITY_GATE",
      emit: (e) => events.push(e),
    });
    wrapped.run({ rfq_id: "X" }, {});
    const pred = events.find((e) => e.type === "predicted");
    assert.equal(pred.predicted.feasible, true);
    assert.equal(pred.confidence, 0.9);  // engine returned 0.9 — adapter passes through
  });

  it("end event includes duration_ms", () => {
    const events = [];
    const wrapped = instrumentStageAdapter(makeBase(), {
      stageId: "FEASIBILITY_GATE",
      emit: (e) => events.push(e),
    });
    wrapped.run({}, {});
    const end = events.find((e) => e.type === "end");
    assert.equal(typeof end.duration_ms, "number");
    assert.ok(end.duration_ms >= 0);
  });

  it("emits error event when the base adapter throws (then re-throws)", () => {
    const events = [];
    const throwingBase = {
      engineRef: "ThrowingBase",
      run: () => { throw new Error("base crash"); },
    };
    const wrapped = instrumentStageAdapter(throwingBase, {
      stageId: "FEASIBILITY_GATE",
      emit: (e) => events.push(e),
    });
    assert.throws(() => wrapped.run({}, {}), /base crash/);
    const types = events.map((e) => e.type);
    assert.ok(types.includes("error"));
    const errorEvent = events.find((e) => e.type === "error");
    assert.match(errorEvent.error, /base crash/);
  });

  it("a throwing emit() does NOT break the run (observation never breaks control)", () => {
    const wrapped = instrumentStageAdapter(makeBase(), {
      stageId: "FEASIBILITY_GATE",
      emit: () => { throw new Error("sink down"); },
    });
    // Should not throw
    const r = wrapped.run({ rfq_id: "X" }, {});
    assert.equal(r.output.feasible, true);
  });

  it("propagates the base result intact (instrumentation is observation only)", () => {
    const wrapped = instrumentStageAdapter(makeBase(), {
      stageId: "FEASIBILITY_GATE",
      emit: () => {},
    });
    const r = wrapped.run({ rfq_id: "X" }, {});
    assert.equal(r.output.feasible, true);
    assert.equal(r.confidence, 0.9);  // engine returned 0.9; adapter passes through
    assert.match(r.trace, /FEASIBILITY-GATE PASS/);
  });
});

// ---------------------------------------------------------------------------
// recordActual — closing the predicted/actual loop
// ---------------------------------------------------------------------------

describe("recordActual — predicted-vs-actual delta", () => {
  function makeBase() {
    return {
      engineRef: "TestBase",
      run: () => ({
        cost: 50, confidence: 0.85, duration_estimate_sec: 600,
        evidence: [], gdnt_passthrough: null, trace: "predicted",
        output: { feasible: true, cycle_sec: 600 },
        deferred: false,
      }),
    };
  }

  it("emits actual event with delta after run + recordActual", () => {
    const events = [];
    const wrapped = instrumentStageAdapter(makeBase(), {
      stageId: "FEASIBILITY_GATE",
      emit: (e) => events.push(e),
    });
    const input = { rfq_id: "REAL-001" };
    wrapped.run(input, {});
    wrapped.recordActual(input, { feasible: true, cycle_sec: 720 });

    const actualEvent = events.find((e) => e.type === "actual");
    assert.ok(actualEvent, "should emit actual event");
    assert.equal(actualEvent.predicted.cycle_sec, 600);
    assert.equal(actualEvent.actual.cycle_sec, 720);
    assert.equal(actualEvent.delta.per_field.cycle_sec, 120);
  });

  it("emits orphan-actual event when no matching prediction exists", () => {
    const events = [];
    const wrapped = instrumentStageAdapter(makeBase(), {
      stageId: "FEASIBILITY_GATE",
      emit: (e) => events.push(e),
    });
    wrapped.recordActual({ rfq_id: "NEVER-PREDICTED" }, { cycle_sec: 500 });
    const orphan = events.find((e) => e.type === "actual" && e.error);
    assert.ok(orphan, "should emit orphan-actual event");
    assert.equal(orphan.delta, null);
  });

  it("pendingPredictions decreases after recordActual clears it", () => {
    const wrapped = instrumentStageAdapter(makeBase(), {
      stageId: "FEASIBILITY_GATE",
      emit: () => {},
    });
    const input = { rfq_id: "X" };
    wrapped.run(input, {});
    assert.equal(wrapped.pendingPredictions(), 1);
    wrapped.recordActual(input, { cycle_sec: 500 });
    assert.equal(wrapped.pendingPredictions(), 0);
  });

  it("ring buffer bounds prediction map to prevent unbounded growth", () => {
    // Run more than the cap (1000) and verify the size stays bounded.
    const wrapped = instrumentStageAdapter(makeBase(), {
      stageId: "FEASIBILITY_GATE",
      emit: () => {},
    });
    for (let i = 0; i < 1100; i++) {
      wrapped.run({ rfq_id: `X-${i}` }, {});
    }
    assert.ok(wrapped.pendingPredictions() <= 1000,
      `pendingPredictions should be ≤1000, got ${wrapped.pendingPredictions()}`);
  });
});

// ---------------------------------------------------------------------------
// instrumentDarkStages convenience
// ---------------------------------------------------------------------------

describe("instrumentDarkStages", () => {
  it("returns wrapped count for stages that are not no-ops", () => {
    const p = createPipeline({ mode: "estimate" });
    p.registerStage("FEASIBILITY_GATE",
      createFeasibilityGateAdapter({ callEngine: () => ({ feasible: true, confidence: 0.9 }) }));
    const r = instrumentDarkStages(p, ["FEASIBILITY_GATE", "MATERIAL_RESOLVE", "SETUP_PLAN"], () => {});
    // Only FEASIBILITY_GATE is wired; the other two are still no-ops + skipped
    assert.equal(r.wrapped, 1);
  });

  it("rejects null pipeline", () => {
    assert.throws(() => instrumentDarkStages(null, [], () => {}), /pipeline required/);
  });

  it("rejects non-array stageIds", () => {
    assert.throws(() => instrumentDarkStages(createPipeline(), "FEASIBILITY_GATE", () => {}), /array/);
  });

  it("rejects missing emit", () => {
    assert.throws(() => instrumentDarkStages(createPipeline(), [], null), /emit fn required/);
  });

  it("rejects unknown stageId", () => {
    assert.throws(() => instrumentDarkStages(createPipeline(), ["BOGUS_STAGE"], () => {}), /unknown stage/);
  });
});

// ---------------------------------------------------------------------------
// End-to-end: dark stage in a pipeline run
// ---------------------------------------------------------------------------

describe("end-to-end: instrumented dark stage in a pipeline", () => {
  it("instrumented stage still runs through the pipeline cleanly + emits events", () => {
    const events = [];
    const p = createPipeline({ mode: "estimate" });
    const base = createFeasibilityGateAdapter({
      callEngine: () => ({ feasible: true, reasons: ["envelope OK"], confidence: 0.95 }),
    });
    const wrapped = instrumentStageAdapter(base, {
      stageId: "FEASIBILITY_GATE",
      emit: (e) => events.push(e),
    });
    p.registerStage("FEASIBILITY_GATE", wrapped);
    const r = p.run({ rfq_id: "INT" });
    const feas = r.decomposition.find((s) => s.stage === "FEASIBILITY_GATE");
    assert.equal(feas.deferred, false);
    assert.match(feas.engineRef, /\+instrumented/);
    // 3 events fired (start, predicted, end)
    assert.equal(events.length, 3);
    assert.deepEqual(events.map((e) => e.type), ["start", "predicted", "end"]);
  });
});
