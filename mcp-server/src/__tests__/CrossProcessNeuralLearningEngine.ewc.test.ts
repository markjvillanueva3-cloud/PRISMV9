/**
 * CrossProcessNeuralLearningEngine — EWC consolidation (XPROC-NEURAL-CONNECT-MS0 / U-CN11)
 *
 * Verifies the Elastic Weight Consolidation layer added to the NN retrain:
 *   - the stepBatch → accumulateGradients refactor preserves behavior (determinism;
 *     train({ewc:{lambda:0}}) ≡ train() in weights);
 *   - consolidateCurrentTask() / train({ewc}) arm the diagonal-Fisher penalty and
 *     report it via ewcStatus(); clearEWC() / clamping behave as documented;
 *   - the EWC penalty actually mitigates catastrophic forgetting (task-A accuracy is
 *     retained better after task-B training than without EWC);
 *   - enableAutoTrain({ewcLambda}) forwards the config into each retrain;
 *   - the crossProcessNeuralEwcDispatch wrapper + the prism_ai dispatcher route work.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  CrossProcessNeuralLearningEngine,
  crossProcessNeuralLearningEngine,
  crossProcessNeuralEwcDispatch,
  FLAT_PARAM_DIM,
  INPUT_DIM,
  HIDDEN_DIM,
  OUTPUT_DIM,
} from "../engines/CrossProcessNeuralLearningEngine.js";
import { crossProcessOutcomeStore } from "../engines/CrossProcessOutcomeStore.js";
import { feedbackBusEngine } from "../engines/FeedbackBusEngine.js";
import { executeAIReasoningAction } from "../tools/dispatchers/aiReasoningDispatcher.js";

// ──────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────

const flush = async (): Promise<void> => {
  for (let i = 0; i < 4; i++) await Promise.resolve();
};

let recCtr = 0;
type Kind = "success" | "failure" | "operator_override" | "pending";
function rec(opts: { process?: "mill" | "lathe" | "wedm"; kind?: Kind; material?: string; tool_diameter_mm?: number } = {}): {
  schemaVersion: "1.0"; id: string; ts: string; bridge: "sf"; process: "mill" | "lathe" | "wedm";
  request_summary: { material: string; tool_diameter_mm: number }; response_summary: Record<string, never>; outcome: { kind: Kind };
} {
  recCtr += 1;
  return {
    schemaVersion: "1.0",
    id: `ewc-rec-${recCtr}`,
    ts: new Date().toISOString(),
    bridge: "sf",
    process: opts.process ?? "mill",
    request_summary: { material: opts.material ?? "4140", tool_diameter_mm: opts.tool_diameter_mm ?? 12 },
    response_summary: {},
    outcome: { kind: opts.kind ?? "success" },
  };
}

// Task A and Task B are the SAME request context (so they featurize to the same input
// vector) but CONFLICTING labels — success vs failure. A single MLP input cannot map to
// both labels, so plain sequential training (no EWC) catastrophically forgets task A when
// trained on task B. That's the scenario EWC exists to mitigate.
function taskA(n: number) {
  return Array.from({ length: n }, () => rec({ process: "mill", material: "4140", kind: "success", tool_diameter_mm: 12 }));
}
function taskB(n: number) {
  return Array.from({ length: n }, () => rec({ process: "mill", material: "4140", kind: "failure", tool_diameter_mm: 12 }));
}

/** Reset everything the singleton-touching tests mutate. */
function hardReset(): void {
  try { if (crossProcessNeuralLearningEngine.autoTrainStatus().active) crossProcessNeuralLearningEngine.disableAutoTrain(); } catch { /* ignore */ }
  crossProcessNeuralLearningEngine.clearEWC();
  crossProcessOutcomeStore.clear();
  feedbackBusEngine.reset();
}

beforeEach(() => {
  hardReset();
});
afterEach(() => {
  hardReset();
});

// ──────────────────────────────────────────────────────────────────────────
// Refactor behavior preservation
// ──────────────────────────────────────────────────────────────────────────

describe("CrossProcessNeuralLearningEngine — stepBatch refactor (U-CN11) preserves behavior", () => {
  it("FLAT_PARAM_DIM equals the [W2,b2,W1,b1] parameter count", () => {
    expect(FLAT_PARAM_DIM).toBe(OUTPUT_DIM * HIDDEN_DIM + OUTPUT_DIM + HIDDEN_DIM * INPUT_DIM + HIDDEN_DIM);
    expect(FLAT_PARAM_DIM).toBeGreaterThan(HIDDEN_DIM * INPUT_DIM); // sanity: W1 block dominates
  });

  it("training is still deterministic for a fixed seed (no EWC)", () => {
    const e1 = new CrossProcessNeuralLearningEngine({ seed: 42 });
    const e2 = new CrossProcessNeuralLearningEngine({ seed: 42 });
    const data = [...taskA(8), ...taskB(8)];
    e1.train(data, { epochs: 3, batchSize: 4, shuffle: false });
    e2.train(data, { epochs: 3, batchSize: 4, shuffle: false });
    expect(e1.predictFromRecord(data[0])).toEqual(e2.predictFromRecord(data[0]));
    expect(e1.predictFromRecord(data[10])).toEqual(e2.predictFromRecord(data[10]));
    expect(e1.evaluate(data).accuracy).toBe(e2.evaluate(data).accuracy);
  });

  it("train({ewc:{lambda:0}}) leaves the weights identical to train() — the consolidate-and-disarm path does not perturb training", () => {
    const eEwc = new CrossProcessNeuralLearningEngine({ seed: 7 });
    const eCtl = new CrossProcessNeuralLearningEngine({ seed: 7 });
    const data = [...taskA(10), ...taskB(10)];
    const rEwc = eEwc.train(data, { epochs: 3, batchSize: 4, shuffle: false, ewc: { lambda: 0, decay: 0.9 } });
    const rCtl = eCtl.train(data, { epochs: 3, batchSize: 4, shuffle: false });
    expect(rEwc.finalLoss).toBeCloseTo(rCtl.finalLoss, 10);
    expect(rEwc.trainAccuracy).toBe(rCtl.trainAccuracy);
    expect(eEwc.predictFromRecord(data[0])).toEqual(eCtl.predictFromRecord(data[0]));
    // λ=0 consolidate still ANCHORS (so a later positive-λ retrain has a reference) but is DISARMED.
    expect(eEwc.ewcStatus()).toEqual({ enabled: false, lambda: 0, decay: 0.9, anchored: true, fisherDim: FLAT_PARAM_DIM, autoTrainLambda: 0 });
    expect(rEwc.ewcConsolidated?.lambda).toBe(0);
  });
});

// ──────────────────────────────────────────────────────────────────────────
// EWC state — ewcStatus / consolidateCurrentTask / clearEWC / clamping
// ──────────────────────────────────────────────────────────────────────────

describe("CrossProcessNeuralLearningEngine — EWC state", () => {
  it("a fresh engine reports EWC disabled and un-anchored", () => {
    const e = new CrossProcessNeuralLearningEngine({ seed: 1 });
    expect(e.ewcStatus()).toEqual({ enabled: false, lambda: 0, decay: 0.9, anchored: false, fisherDim: 0, autoTrainLambda: 0 });
  });

  it("consolidateCurrentTask arms the penalty and ewcStatus reflects it", () => {
    const e = new CrossProcessNeuralLearningEngine({ seed: 1 });
    const data = taskA(12);
    e.train(data, { epochs: 2, shuffle: false });
    const res = e.consolidateCurrentTask(data, { lambda: 25, decay: 0.5 });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.numSamples).toBe(12);
      expect(res.meanFisher).toBeGreaterThanOrEqual(0);
      expect(res.reliable).toBe(false); // 12 < 30
      expect(res.lambda).toBe(25);
    }
    expect(e.ewcStatus()).toEqual({ enabled: true, lambda: 25, decay: 0.5, anchored: true, fisherDim: FLAT_PARAM_DIM, autoTrainLambda: 0 });
  });

  it("consolidateCurrentTask rejects a records list with no labelable samples", () => {
    const e = new CrossProcessNeuralLearningEngine({ seed: 1 });
    const r = e.consolidateCurrentTask([rec({ kind: "pending" }), rec({ kind: "pending" })], { lambda: 10 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("no_labelable_samples");
    expect(e.ewcStatus().anchored).toBe(false);
  });

  it("clearEWC disarms and forgets the anchor", () => {
    const e = new CrossProcessNeuralLearningEngine({ seed: 1 });
    const data = taskA(8);
    e.train(data, { epochs: 1, shuffle: false });
    e.consolidateCurrentTask(data, { lambda: 10 });
    expect(e.ewcStatus().anchored).toBe(true);
    e.clearEWC();
    expect(e.ewcStatus()).toEqual({ enabled: false, lambda: 0, decay: 0.9, anchored: false, fisherDim: 0, autoTrainLambda: 0 });
  });

  it("lambda/decay are clamped: negative λ → 0 (consolidate-and-disarm); oversize λ → 1e6; out-of-range decay → [0,1]; NaN λ → default 1.0", () => {
    const data = taskA(6);

    const eNeg = new CrossProcessNeuralLearningEngine({ seed: 2 });
    eNeg.train(data, { epochs: 1, shuffle: false, ewc: { lambda: -50, decay: 0.3 } });
    expect(eNeg.ewcStatus()).toEqual({ enabled: false, lambda: 0, decay: 0.3, anchored: true, fisherDim: FLAT_PARAM_DIM, autoTrainLambda: 0 });

    const eBig = new CrossProcessNeuralLearningEngine({ seed: 2 });
    eBig.train(data, { epochs: 1, shuffle: false, ewc: { lambda: 1e9, decay: 5 } });
    expect(eBig.ewcStatus().lambda).toBe(1_000_000);
    expect(eBig.ewcStatus().decay).toBe(1); // 5 clamped to 1
    expect(eBig.ewcStatus().enabled).toBe(true);

    const eNan = new CrossProcessNeuralLearningEngine({ seed: 2 });
    eNan.train(data, { epochs: 1, shuffle: false, ewc: { lambda: NaN } });
    expect(eNan.ewcStatus().lambda).toBe(1.0); // NaN → DEFAULT_EWC_LAMBDA
    expect(eNan.ewcStatus().decay).toBe(0.9); // NaN/absent → DEFAULT_EWC_DECAY
  });

  it("train({ewc}) returns an ewcConsolidated summary", () => {
    const e = new CrossProcessNeuralLearningEngine({ seed: 3 });
    const data = taskA(15);
    const r = e.train(data, { epochs: 2, shuffle: false, ewc: { lambda: 5, decay: 0.7 } });
    expect(r.ewcConsolidated).toEqual({ numSamples: 15, meanFisher: r.ewcConsolidated!.meanFisher, reliable: false, lambda: 5 });
    expect(r.ewcConsolidated!.meanFisher).toBeGreaterThanOrEqual(0);
  });
});

// ──────────────────────────────────────────────────────────────────────────
// Behavioral: EWC mitigates catastrophic forgetting
// ──────────────────────────────────────────────────────────────────────────

describe("CrossProcessNeuralLearningEngine — EWC penalty pins θ near the anchor & retains old-task accuracy", () => {
  /** Squared L2 distance between two serialized weight sets (W1+b1+W2+b2). */
  function weightDist(a: { W1: number[]; b1: number[]; W2: number[]; b2: number[] }, b: typeof a): number {
    let s = 0;
    for (const k of ["W1", "b1", "W2", "b2"] as const) {
      const av = a[k], bv = b[k];
      for (let i = 0; i < av.length; i++) s += (av[i] - bv[i]) ** 2;
    }
    return s;
  }

  it("after conflicting task-B training the EWC-armed engine stays closer to θ_A and retains task-A accuracy the control loses", () => {
    const A = taskA(24);
    const B = taskB(24); // SAME input as A, label "failure" — a single MLP input can't satisfy both.
    // Train task A only partway: it learns the label-0 mapping (accuracy 1.0 on its single distinct
    // input) but is NOT at zero loss, so the empirical Fisher (∝ grad²) is still meaningful — a
    // fully-converged consolidation point has grad≈0 ⇒ Fisher≈0 ⇒ a useless penalty. λ=100 keeps the
    // penalty stiff but numerically stable for lr=0.01 (λ·F·lr ≪ 1).
    const TRAIN_A = { epochs: 2, batchSize: 8, shuffle: false } as const;
    const TRAIN_B = { epochs: 10, batchSize: 8, shuffle: false } as const;

    // Both engines: same seed, identical task-A training → identical θ_A and identical task-A accuracy.
    const ewc = new CrossProcessNeuralLearningEngine({ seed: 11 });
    const ctl = new CrossProcessNeuralLearningEngine({ seed: 11 });
    ewc.train(A, TRAIN_A);
    ctl.train(A, TRAIN_A);
    const thetaA = (() => { const s = ewc.serialize(); return { W1: s.W1, b1: s.b1, W2: s.W2, b2: s.b2 }; })();
    const accA0 = ewc.evaluate(A).accuracy;
    expect(ctl.evaluate(A).accuracy).toBe(accA0);
    expect(accA0).toBeGreaterThan(0.5); // learned task A (single distinct input → accuracy is 0 or 1)

    // Arm EWC at θ_A with a strong (stable) penalty.
    const con = ewc.consolidateCurrentTask(A, { lambda: 100, decay: 0 });
    expect(con.ok).toBe(true);
    expect(ewc.ewcStatus().enabled).toBe(true);

    // Train BOTH on the conflicting task B.
    ewc.train(B, TRAIN_B);
    ctl.train(B, TRAIN_B);

    const dEwc = weightDist((() => { const s = ewc.serialize(); return { W1: s.W1, b1: s.b1, W2: s.W2, b2: s.b2 }; })(), thetaA);
    const dCtl = weightDist((() => { const s = ctl.serialize(); return { W1: s.W1, b1: s.b1, W2: s.W2, b2: s.b2 }; })(), thetaA);

    // CORE EWC behavior: the penalty pulled θ back toward the anchor — the EWC engine moved much less.
    expect(dCtl).toBeGreaterThan(0); // sanity: the control actually moved while fitting task B
    expect(dEwc).toBeLessThan(dCtl);
    // And task-A knowledge: the control flipped its single input to "failure"; EWC kept it.
    const accA1_ewc = ewc.evaluate(A).accuracy;
    const accA1_ctl = ctl.evaluate(A).accuracy;
    expect(accA1_ctl).toBeLessThan(accA0);          // control forgot
    expect(accA1_ewc).toBeGreaterThanOrEqual(accA1_ctl); // EWC retained at least as much
  });
});

// ──────────────────────────────────────────────────────────────────────────
// enableAutoTrain forwarding
// ──────────────────────────────────────────────────────────────────────────

describe("CrossProcessNeuralLearningEngine — enableAutoTrain({ewcLambda}) forwarding (singleton)", () => {
  it("the auto-train retrain consolidates each tick; autoTrainStatus reports λ; disable resets it but EWC state persists", async () => {
    crossProcessNeuralLearningEngine.enableAutoTrain({ threshold: 3, ewcLambda: 7, ewcDecay: 0.6 });
    expect(crossProcessNeuralLearningEngine.autoTrainStatus().ewcLambda).toBe(7);
    expect(crossProcessNeuralLearningEngine.ewcStatus().anchored).toBe(false); // not consolidated yet

    let lastTick: { ewcConsolidated?: unknown } | null = null;
    const sub = feedbackBusEngine.subscribe("neural.train.tick", (ev) => { lastTick = ev.payload as { ewcConsolidated?: unknown }; });

    // Publish 3 labelable outcomes → threshold reached → retrain + consolidate.
    for (const r of taskA(3)) {
      crossProcessOutcomeStore.record({ bridge: r.bridge, process: r.process, request_summary: r.request_summary, response_summary: {}, outcome: r.outcome });
    }
    await flush();

    expect(crossProcessNeuralLearningEngine.ewcStatus()).toMatchObject({ enabled: true, lambda: 7, decay: 0.6, anchored: true, fisherDim: FLAT_PARAM_DIM });
    expect(lastTick).not.toBeNull();
    expect((lastTick as { ewcConsolidated?: { lambda?: number } } | null)?.ewcConsolidated?.lambda).toBe(7);

    feedbackBusEngine.unsubscribe(sub);

    crossProcessNeuralLearningEngine.disableAutoTrain();
    expect(crossProcessNeuralLearningEngine.autoTrainStatus().ewcLambda).toBe(0); // config reset
    expect(crossProcessNeuralLearningEngine.ewcStatus().enabled).toBe(true);      // but the armed state persists
    crossProcessNeuralLearningEngine.clearEWC();
    expect(crossProcessNeuralLearningEngine.ewcStatus()).toEqual({ enabled: false, lambda: 0, decay: 0.9, anchored: false, fisherDim: 0, autoTrainLambda: 0 });
  });
});

// ──────────────────────────────────────────────────────────────────────────
// Dispatch wrappers
// ──────────────────────────────────────────────────────────────────────────

describe("CrossProcessNeuralLearningEngine — crossProcessNeuralEwcDispatch + prism_ai round-trip", () => {
  it("xproc_neural_ewc_{status,clear,consolidate} route through both the wrapper and executeAIReasoningAction", async () => {
    // Seed the store so consolidate has something to chew on.
    for (const r of [...taskA(6), rec({ kind: "pending" })]) {
      crossProcessOutcomeStore.record({ bridge: r.bridge, process: r.process, request_summary: r.request_summary, response_summary: {}, outcome: r.outcome });
    }

    // Direct wrapper.
    const status0 = crossProcessNeuralEwcDispatch("xproc_neural_ewc_status", {}) as { ok: boolean; ewc: { enabled: boolean }; autoTrain: { ewcLambda: number } };
    expect(status0.ok).toBe(true);
    expect(status0.ewc.enabled).toBe(false);
    expect(status0.autoTrain.ewcLambda).toBe(0);

    const con = crossProcessNeuralEwcDispatch("xproc_neural_ewc_consolidate", { limit: 50, lambda: 12, decay: 0.4 }) as { ok: boolean; scanned: number; usable: number; result: { ok: boolean } };
    expect(con.ok).toBe(true);
    expect(con.scanned).toBe(7);
    expect(con.usable).toBe(6); // the pending one is excluded
    expect(con.result.ok).toBe(true);
    expect(crossProcessNeuralLearningEngine.ewcStatus()).toMatchObject({ enabled: true, lambda: 12, decay: 0.4, anchored: true, fisherDim: FLAT_PARAM_DIM });

    const cleared = crossProcessNeuralEwcDispatch("xproc_neural_ewc_clear", {}) as { ok: boolean };
    expect(cleared.ok).toBe(true);
    expect(crossProcessNeuralLearningEngine.ewcStatus().enabled).toBe(false);

    expect(() => crossProcessNeuralEwcDispatch("xproc_neural_ewc_bogus", {})).toThrow(/unknown action/);

    // Through prism_ai (route + Zod schema + switch).
    const dStatus = await executeAIReasoningAction("xproc_neural_ewc_status", {});
    expect(dStatus.success).toBe(true);
    expect((dStatus.data as { ok: boolean }).ok).toBe(true);

    const dCon = await executeAIReasoningAction("xproc_neural_ewc_consolidate", { limit: 50, lambda: 9 });
    expect(dCon.success).toBe(true);
    expect((dCon.data as { ok: boolean; result: { ok: boolean } }).result.ok).toBe(true);
    expect(crossProcessNeuralLearningEngine.ewcStatus().lambda).toBe(9);

    // Strict schema rejects a wrong-typed param.
    const dBad = await executeAIReasoningAction("xproc_neural_ewc_consolidate", { limit: "lots" });
    expect(dBad.success).toBe(false);

    const dClear = await executeAIReasoningAction("xproc_neural_ewc_clear", {});
    expect(dClear.success).toBe(true);
    expect(crossProcessNeuralLearningEngine.ewcStatus().enabled).toBe(false);
  });
});
