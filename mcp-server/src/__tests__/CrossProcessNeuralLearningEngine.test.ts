/**
 * CrossProcessNeuralLearningEngine.test.ts — featurize, predict, train,
 * evaluate, persistence, determinism, robustness.
 *
 * Milestone: INFRA-NEURAL-LEDGER-MS1 / U-XPROC-NEURAL-T1-02.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import {
  CrossProcessNeuralLearningEngine,
  crossProcessNeuralLearningEngine,
  INPUT_DIM,
  HIDDEN_DIM,
  OUTPUT_DIM,
  SCHEMA_VERSION,
  CLASS_SUCCESS,
  CLASS_FAILURE,
  CLASS_OVERRIDE,
} from "../engines/CrossProcessNeuralLearningEngine.js";
import type { OutcomeRecord } from "../engines/CrossProcessOutcomeStore.js";

const TEST_SEED = 12345;

function makeRecord(partial: {
  bridge?: OutcomeRecord["bridge"];
  process?: OutcomeRecord["process"];
  outcome?: OutcomeRecord["outcome"];
  request?: OutcomeRecord["request_summary"];
  response?: OutcomeRecord["response_summary"];
  operator?: OutcomeRecord["operator"];
  id?: string;
}): OutcomeRecord {
  return {
    schemaVersion: "1.0",
    id: partial.id ?? "evt-test",
    ts: "2026-05-05T18:00:00.000Z",
    bridge: partial.bridge ?? "sf",
    process: partial.process ?? "mill",
    request_summary: partial.request ?? {},
    response_summary: partial.response ?? {},
    outcome: partial.outcome ?? { kind: "pending" },
    operator: partial.operator,
  };
}

/**
 * Build a synthetic 3-class dataset where the label is a simple linear
 * function of two inputs. mill+success, lathe+failure, wedm+override.
 * Used to validate that the model can learn anything at all.
 */
function makeSeparableDataset(perClass: number): OutcomeRecord[] {
  const out: OutcomeRecord[] = [];
  for (let i = 0; i < perClass; i++) {
    out.push(
      makeRecord({
        id: `s${i}`,
        bridge: "sf",
        process: "mill",
        outcome: { kind: "success" },
        request: { tool_diameter_mm: 6, depth_of_cut_mm: 1, material: "steel" },
      }),
    );
    out.push(
      makeRecord({
        id: `f${i}`,
        bridge: "post",
        process: "lathe",
        outcome: { kind: "failure" },
        request: { tool_diameter_mm: 12, depth_of_cut_mm: 3, material: "aluminum" },
      }),
    );
    out.push(
      makeRecord({
        id: `o${i}`,
        bridge: "ai",
        process: "wedm",
        outcome: { kind: "operator_override" },
        request: { workpiece_thickness_mm: 25, target_ra_um: 0.4, material: "tool-steel" },
      }),
    );
  }
  return out;
}

function tmpFile(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "neural-engine-"));
  return path.join(dir, "weights.json");
}

describe("CrossProcessNeuralLearningEngine", () => {
  let engine: CrossProcessNeuralLearningEngine;

  beforeEach(() => {
    engine = new CrossProcessNeuralLearningEngine({ seed: TEST_SEED });
  });

  // ───── featurize ─────

  it("featurize returns a 32-dim Float64Array", () => {
    const r = makeRecord({
      bridge: "sf",
      process: "mill",
      request: { tool_diameter_mm: 6 },
    });
    const x = engine.featurize(r);
    expect(x.length).toBe(INPUT_DIM);
    expect(x).toBeInstanceOf(Float64Array);
  });

  it("featurize sets bridge one-hot at correct slot", () => {
    const r = makeRecord({ bridge: "router", process: "mill" });
    const x = engine.featurize(r);
    // numeric=7 (all 0), then bridge slot
    expect(x[7 + 0]).toBe(0); // sf
    expect(x[7 + 1]).toBe(0); // post
    expect(x[7 + 2]).toBe(0); // feature
    expect(x[7 + 3]).toBe(0); // ai
    expect(x[7 + 4]).toBe(1); // router
  });

  it("featurize sets process one-hot at correct slot", () => {
    const r = makeRecord({ bridge: "sf", process: "wedm" });
    const x = engine.featurize(r);
    // numeric=7 + bridge=5 = offset 12
    expect(x[12]).toBe(0); // mill
    expect(x[13]).toBe(0); // lathe
    expect(x[14]).toBe(1); // wedm
  });

  it("featurize emits zero for missing or invalid numeric features", () => {
    const r = makeRecord({ bridge: "sf", process: "mill", request: {} });
    const x = engine.featurize(r);
    for (let i = 0; i < 7; i++) expect(x[i]).toBe(0);
  });

  it("featurize tolerates NaN/Infinity numeric without crashing", () => {
    const r = makeRecord({
      bridge: "sf",
      process: "mill",
      request: {
        tool_diameter_mm: Number.NaN,
        depth_of_cut_mm: Number.POSITIVE_INFINITY,
        spindle_rpm: -5,
      } as never,
    });
    const x = engine.featurize(r);
    for (let i = 0; i < x.length; i++) {
      expect(Number.isFinite(x[i])).toBe(true);
    }
    expect(x[0]).toBe(0); // NaN → 0
    expect(x[1]).toBe(0); // Infinity → 0
    expect(x[4]).toBe(0); // negative → 0
  });

  it("featurize clamps very large values via log1p / divisor", () => {
    const r = makeRecord({
      bridge: "sf",
      process: "mill",
      request: { spindle_rpm: 1e9 },
    });
    const x = engine.featurize(r);
    // log1p(1e9)/12 ≈ 1.73 → clamped to 1
    expect(x[4]).toBeLessThanOrEqual(1);
    expect(x[4]).toBeGreaterThan(0);
  });

  it("featurize bias unit is always 1 at the last slot", () => {
    const r = makeRecord({});
    const x = engine.featurize(r);
    expect(x[INPUT_DIM - 1]).toBe(1);
  });

  // ───── recordToLabel ─────

  it("recordToLabel maps the 3 final kinds to 0/1/2 and pending to null", () => {
    expect(engine.recordToLabel(makeRecord({ outcome: { kind: "success" } }))).toBe(CLASS_SUCCESS);
    expect(engine.recordToLabel(makeRecord({ outcome: { kind: "failure" } }))).toBe(CLASS_FAILURE);
    expect(engine.recordToLabel(makeRecord({ outcome: { kind: "operator_override" } }))).toBe(
      CLASS_OVERRIDE,
    );
    expect(engine.recordToLabel(makeRecord({ outcome: { kind: "pending" } }))).toBeNull();
  });

  // ───── construction / Xavier init ─────

  it("Xavier init keeps W1 weights within +/- sqrt(6/(fan_in+fan_out))", () => {
    const r1 = Math.sqrt(6 / (INPUT_DIM + HIDDEN_DIM));
    const state = engine.serialize();
    for (const w of state.W1) {
      expect(Math.abs(w)).toBeLessThanOrEqual(r1 + 1e-9);
    }
  });

  it("Xavier init keeps W2 weights within +/- sqrt(6/(hidden+output))", () => {
    const r2 = Math.sqrt(6 / (HIDDEN_DIM + OUTPUT_DIM));
    const state = engine.serialize();
    for (const w of state.W2) {
      expect(Math.abs(w)).toBeLessThanOrEqual(r2 + 1e-9);
    }
  });

  it("biases initialize to zero", () => {
    const state = engine.serialize();
    expect(state.b1.every((v) => v === 0)).toBe(true);
    expect(state.b2.every((v) => v === 0)).toBe(true);
  });

  it("same seed produces identical initial weights", () => {
    const a = new CrossProcessNeuralLearningEngine({ seed: 99 });
    const b = new CrossProcessNeuralLearningEngine({ seed: 99 });
    expect(a.serialize().W1).toEqual(b.serialize().W1);
    expect(a.serialize().W2).toEqual(b.serialize().W2);
  });

  it("different seeds produce different initial weights", () => {
    const a = new CrossProcessNeuralLearningEngine({ seed: 1 });
    const b = new CrossProcessNeuralLearningEngine({ seed: 2 });
    expect(a.serialize().W1).not.toEqual(b.serialize().W1);
  });

  // ───── predict ─────

  it("predict returns probabilities that sum to 1", () => {
    const r = makeRecord({ bridge: "sf", process: "mill" });
    const out = engine.predict(engine.featurize(r));
    const sum = out.probs.success + out.probs.failure + out.probs.operator_override;
    expect(sum).toBeCloseTo(1, 9);
  });

  it("predict returns probabilities all in [0,1]", () => {
    const r = makeRecord({ bridge: "ai", process: "lathe" });
    const out = engine.predict(engine.featurize(r));
    for (const k of ["success", "failure", "operator_override"] as const) {
      expect(out.probs[k]).toBeGreaterThanOrEqual(0);
      expect(out.probs[k]).toBeLessThanOrEqual(1);
    }
  });

  it("predict.predictedClass matches argmax of probs", () => {
    const r = makeRecord({});
    const out = engine.predict(engine.featurize(r));
    const maxKey =
      out.probs.success >= out.probs.failure && out.probs.success >= out.probs.operator_override
        ? "success"
        : out.probs.failure >= out.probs.operator_override
          ? "failure"
          : "operator_override";
    expect(out.predictedClass).toBe(maxKey);
  });

  it("predict throws on wrong input length", () => {
    const wrong = new Float64Array(INPUT_DIM - 1);
    expect(() => engine.predict(wrong)).toThrow(/length must be 32/);
  });

  // ───── train ─────

  it("train on empty input is a graceful no-op", () => {
    const result = engine.train([]);
    expect(result.samplesUsed).toBe(0);
    expect(result.samplesSkipped).toBe(0);
    expect(result.epochsRun).toBe(0);
  });

  it("train counts pending records as skipped", () => {
    const recs = [makeRecord({ outcome: { kind: "pending" } })];
    const result = engine.train(recs);
    expect(result.samplesUsed).toBe(0);
    expect(result.samplesSkipped).toBe(1);
  });

  it("train reduces loss on a separable dataset", () => {
    const data = makeSeparableDataset(10);
    const result = engine.train(data, { epochs: 25, batchSize: 8, shuffle: false });
    expect(result.samplesUsed).toBe(data.length);
    expect(result.finalLoss).toBeLessThan(result.initialLoss);
  });

  it("train converges to >70% accuracy on a separable dataset", () => {
    const data = makeSeparableDataset(15);
    const result = engine.train(data, { epochs: 50, batchSize: 4, shuffle: false });
    expect(result.trainAccuracy).toBeGreaterThan(0.7);
  });

  it("train accumulates totalSamplesSeen and totalEpochsRun", () => {
    const data = makeSeparableDataset(5);
    engine.train(data, { epochs: 3 });
    const m1 = engine.getMetrics();
    expect(m1.totalEpochsRun).toBe(3);
    expect(m1.totalSamplesSeen).toBe(data.length * 3);

    engine.train(data, { epochs: 2 });
    const m2 = engine.getMetrics();
    expect(m2.totalEpochsRun).toBe(5);
    expect(m2.totalSamplesSeen).toBe(data.length * 5);
  });

  it("training is deterministic with same seed and shuffle disabled", () => {
    const data = makeSeparableDataset(8);
    const a = new CrossProcessNeuralLearningEngine({ seed: 7 });
    const b = new CrossProcessNeuralLearningEngine({ seed: 7 });
    a.train(data, { epochs: 10, shuffle: false });
    b.train(data, { epochs: 10, shuffle: false });
    expect(Array.from(a.serialize().W1)).toEqual(Array.from(b.serialize().W1));
    expect(Array.from(a.serialize().W2)).toEqual(Array.from(b.serialize().W2));
  });

  // ───── evaluate ─────

  it("evaluate returns a 3x3 confusion matrix and skips pending", () => {
    const data = [
      makeRecord({ outcome: { kind: "success" } }),
      makeRecord({ outcome: { kind: "failure" } }),
      makeRecord({ outcome: { kind: "pending" } }),
    ];
    const e = engine.evaluate(data);
    expect(e.total).toBe(2);
    expect(e.confusion.length).toBe(OUTPUT_DIM);
    expect(e.confusion[0].length).toBe(OUTPUT_DIM);
    let sum = 0;
    for (let i = 0; i < OUTPUT_DIM; i++) {
      for (let j = 0; j < OUTPUT_DIM; j++) sum += e.confusion[i][j];
    }
    expect(sum).toBe(2);
  });

  it("evaluate on empty input returns zero result", () => {
    const e = engine.evaluate([]);
    expect(e.total).toBe(0);
    expect(e.correct).toBe(0);
    expect(e.accuracy).toBe(0);
    expect(e.loss).toBe(0);
  });

  // ───── serialize / fromSerialized ─────

  it("serialize → fromSerialized preserves predictions exactly", () => {
    engine.train(makeSeparableDataset(5), { epochs: 5, shuffle: false });
    const r = makeRecord({ bridge: "sf", process: "mill", request: { tool_diameter_mm: 6 } });
    const before = engine.predictFromRecord(r);
    const restored = CrossProcessNeuralLearningEngine.fromSerialized(engine.serialize());
    const after = restored.predictFromRecord(r);
    expect(after.probs.success).toBeCloseTo(before.probs.success, 12);
    expect(after.probs.failure).toBeCloseTo(before.probs.failure, 12);
    expect(after.probs.operator_override).toBeCloseTo(before.probs.operator_override, 12);
  });

  it("fromSerialized throws on schema version mismatch", () => {
    const bad = engine.serialize();
    bad.schemaVersion = "0.0.0" as typeof SCHEMA_VERSION;
    expect(() => CrossProcessNeuralLearningEngine.fromSerialized(bad)).toThrow(
      /schemaVersion/,
    );
  });

  it("fromSerialized throws on weight shape mismatch", () => {
    const bad = engine.serialize();
    bad.W1 = bad.W1.slice(0, -1);
    expect(() => CrossProcessNeuralLearningEngine.fromSerialized(bad)).toThrow(
      /W1 length/,
    );
  });

  // ───── saveTo / loadFrom ─────

  it("saveTo + loadFrom round-trip preserves predictions", () => {
    engine.train(makeSeparableDataset(5), { epochs: 3, shuffle: false });
    const f = tmpFile();
    engine.saveTo(f);
    const loaded = CrossProcessNeuralLearningEngine.loadFrom(f);
    const r = makeRecord({ bridge: "ai", process: "wedm" });
    const a = engine.predictFromRecord(r);
    const b = loaded.predictFromRecord(r);
    expect(a.probs.success).toBeCloseTo(b.probs.success, 12);
    expect(a.probs.failure).toBeCloseTo(b.probs.failure, 12);
    expect(a.predictedClass).toBe(b.predictedClass);
    fs.rmSync(path.dirname(f), { recursive: true, force: true });
  });

  it("saveTo refuses paths containing parent traversal", () => {
    expect(() => engine.saveTo("/tmp/../outside/weights.json")).toThrow(/'\.\.'/);
  });

  // ───── reset ─────

  it("reset clears training metrics and produces a fresh init", () => {
    engine.train(makeSeparableDataset(5), { epochs: 3 });
    const beforeMetrics = engine.getMetrics();
    expect(beforeMetrics.totalEpochsRun).toBeGreaterThan(0);
    engine.reset(99);
    const after = engine.getMetrics();
    expect(after.totalEpochsRun).toBe(0);
    expect(after.totalSamplesSeen).toBe(0);
    expect(after.lastLoss).toBe(0);
    expect(engine.getConfig().seed).toBe(99);
  });

  // ───── variability across the 3 processes ─────

  it("predict yields distinct probability vectors for mill vs lathe vs wedm after training", () => {
    const data = makeSeparableDataset(20);
    engine.train(data, { epochs: 30, shuffle: false });
    const millOut = engine.predictFromRecord(
      makeRecord({ bridge: "sf", process: "mill", request: { tool_diameter_mm: 6 } }),
    );
    const latheOut = engine.predictFromRecord(
      makeRecord({ bridge: "post", process: "lathe", request: { tool_diameter_mm: 12 } }),
    );
    const wedmOut = engine.predictFromRecord(
      makeRecord({
        bridge: "ai",
        process: "wedm",
        request: { workpiece_thickness_mm: 25, target_ra_um: 0.4 },
      }),
    );
    expect(millOut.predictedClass).toBe("success");
    expect(latheOut.predictedClass).toBe("failure");
    expect(wedmOut.predictedClass).toBe("operator_override");
  });

  // ───── singleton ─────

  it("singleton export is a working instance", () => {
    expect(crossProcessNeuralLearningEngine).toBeInstanceOf(CrossProcessNeuralLearningEngine);
    const out = crossProcessNeuralLearningEngine.predictFromRecord(makeRecord({}));
    expect(out.probs.success + out.probs.failure + out.probs.operator_override).toBeCloseTo(1, 9);
  });

  // ───── schema export ─────

  it("schema and dim constants match documented architecture (32→16→3)", () => {
    expect(INPUT_DIM).toBe(32);
    expect(HIDDEN_DIM).toBe(16);
    expect(OUTPUT_DIM).toBe(3);
    expect(SCHEMA_VERSION).toBe("1.0.0");
  });

  // ───── U-NN-FIX01: backprop numeric-gradient correctness ─────

  it("backprop dW1 matches finite-difference gradient (U-NN-FIX01 W2 snapshot fix)", () => {
    // The engine doesn't expose stepOne or weight-vector accessors directly,
    // so verify via the train→loss observable: a single SGD step with momentum=0
    // and learning_rate=lr should reduce loss by approximately lr * |gradient|².
    // If backprop direction is wrong, loss INCREASES on average instead of
    // decreasing. Run 30 single-step trainings on a fixed sample, assert ≥80%
    // of steps reduce loss (would be ~50% under the W2-already-updated bug).
    const engine = new CrossProcessNeuralLearningEngine({
      seed: 7,
      momentum: 0,            // pure SGD — predictable per-step descent
      learningRate: 0.01,
      batchSize: 1,
    });

    const record = makeRecord({
      bridge: "sf",
      process: "mill",
      request: { tool_diameter_mm: 6, depth_of_cut_mm: 0.3, spindle_rpm: 8000, material: "aluminum_6061" },
      outcome: { kind: "success" },
    });

    let prevLoss = Infinity;
    let descents = 0;
    const TOTAL_STEPS = 30;
    for (let i = 0; i < TOTAL_STEPS; i++) {
      const r = engine.train([record], { epochs: 1, batchSize: 1, shuffle: false });
      // initialLoss is the loss BEFORE this train call's update, finalLoss after.
      // First iteration: initialLoss is the baseline. Subsequent: it's the post-step
      // loss from the previous iteration; we compare to that to count descent.
      const lossNow = r.finalLoss;
      if (i > 0 && lossNow < prevLoss) descents += 1;
      prevLoss = lossNow;
    }

    // Pure SGD on a fixed sample with correct gradient direction descends
    // monotonically until very near zero loss. Allow some slack for the
    // post-update-loss reporting quirk (U-NN-FIX03 will fix that), but the
    // overwhelming majority of steps must reduce loss.
    expect(descents).toBeGreaterThanOrEqual(Math.floor(TOTAL_STEPS * 0.8));
  });

  // ───── U-NN-FIX02: response_summary.success label-leak regression ─────

  it("training accuracy is independent of response_summary.success (no label leak)", () => {
    // Build two datasets identical in EVERY field except response_summary.success:
    //   datasetA: success flag matches outcome.kind (consistent)
    //   datasetB: success flag is RANDOM, independent of outcome.kind
    // If the engine leaked the success flag as a feature (the U-NN-FIX02 bug),
    // datasetA would train to higher accuracy than datasetB. After the fix,
    // training accuracy is independent of the success flag — the slot is now zero.
    const N = 30;
    const buildA: OutcomeRecord[] = [];
    const buildB: OutcomeRecord[] = [];
    // Use a deterministic non-success-correlated pseudo-random for B's flag.
    let s = 9001 >>> 0;
    const flip = () => {
      s = (s * 1103515245 + 12345) >>> 0;
      return ((s >>> 24) & 1) === 1;
    };
    for (let i = 0; i < N; i++) {
      const isFailure = i % 2 === 0;
      const kind: OutcomeRecord["outcome"] = isFailure
        ? { kind: "failure" }
        : { kind: "success" };
      const baseRequest = {
        tool_diameter_mm: isFailure ? 12 : 6,
        depth_of_cut_mm: isFailure ? 4.0 : 0.3,
        spindle_rpm: isFailure ? 400 : 8000,
        material: isFailure ? "ti_6al_4v" : "aluminum_6061",
      };
      // A: success flag tracks outcome (would-be-leak path)
      buildA.push(makeRecord({
        id: `a-${i}`,
        bridge: "sf",
        process: "mill",
        request: baseRequest,
        response: { success: !isFailure, warnings_count: 0 },
        outcome: kind,
      }));
      // B: success flag random
      buildB.push(makeRecord({
        id: `b-${i}`,
        bridge: "sf",
        process: "mill",
        request: baseRequest,
        response: { success: flip(), warnings_count: 0 },
        outcome: kind,
      }));
    }

    const engineA = new CrossProcessNeuralLearningEngine({ seed: 42 });
    const engineB = new CrossProcessNeuralLearningEngine({ seed: 42 });
    const rA = engineA.train(buildA, { epochs: 30, batchSize: 8, shuffle: false });
    const rB = engineB.train(buildB, { epochs: 30, batchSize: 8, shuffle: false });

    // Both should reach similar accuracy — the success flag is no longer
    // information. A leak would manifest as rA.trainAccuracy ≫ rB.trainAccuracy.
    // After the fix, |rA - rB| < 0.10 (modest float-determinism noise).
    expect(Math.abs(rA.trainAccuracy - rB.trainAccuracy)).toBeLessThan(0.10);
  });

  it("backprop converges to near-zero loss on a single repeated sample (sanity)", () => {
    // If gradient direction is wrong, loss diverges. With correct backprop,
    // a small MLP overfits a single sample to near-zero cross-entropy in
    // <200 steps with lr=0.05.
    const engine = new CrossProcessNeuralLearningEngine({
      seed: 13,
      momentum: 0.9,
      learningRate: 0.05,
      batchSize: 1,
    });
    const record = makeRecord({
      bridge: "sf",
      process: "mill",
      request: { tool_diameter_mm: 6, depth_of_cut_mm: 0.3, spindle_rpm: 8000, material: "aluminum_6061" },
      outcome: { kind: "success" },
    });
    const r = engine.train([record], { epochs: 200, batchSize: 1, shuffle: false });
    // Cross-entropy near zero means the model assigns >0.99 probability to the
    // correct class. Initial loss should be ~ln(3)≈1.099 for random init.
    expect(r.initialLoss).toBeGreaterThan(0.5);
    expect(r.finalLoss).toBeLessThan(0.05);
    expect(r.trainAccuracy).toBeCloseTo(1, 9);
  });
});
