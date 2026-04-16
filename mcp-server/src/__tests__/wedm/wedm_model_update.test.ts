/**
 * WEDMModelUpdateEngine — WEDM AGI Phase 3 / P3-MS1 / U-P3-03 tests.
 *
 * Exit gate: committed updates preserve ≥ 95 % of prior performance on
 * held-out test set.
 */
import { describe, it, expect } from "vitest";
import {
  WEDMModelUpdateEngine,
  wedmModelUpdateEngine,
  type HeldOutSample,
  type Predictor,
} from "../../engines/WEDMModelUpdateEngine.js";

/** 2-D held-out set: y = 2*x₀ + 3*x₁. */
function makeHeldOut(n = 40, seed = 1): HeldOutSample[] {
  let s = seed >>> 0;
  const rand = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return (s & 0x7fffffff) / 0x7fffffff;
  };
  const out: HeldOutSample[] = [];
  for (let i = 0; i < n; i++) {
    const x = [rand() * 10, rand() * 10];
    const y = 2 * x[0] + 3 * x[1];
    out.push({ x, y });
  }
  return out;
}

const truePredictor: Predictor = (x) => 2 * x[0] + 3 * x[1];
const biasedPredictor = (bias: number): Predictor => (x) => 2 * x[0] + 3 * x[1] + bias;

describe("WEDMModelUpdateEngine — exit gate (≥95 % retention)", () => {
  it("singleton exported", () => {
    expect(wedmModelUpdateEngine).toBeInstanceOf(WEDMModelUpdateEngine);
  });

  it("commits when candidate is equal or better on MAE", () => {
    const engine = new WEDMModelUpdateEngine();
    const heldOut = makeHeldOut();
    const d = engine.evaluate({
      modelId: "wedm-ra-v1.8",
      metric: "mae",
      oldPredictor: biasedPredictor(0.5),
      candidatePredictor: biasedPredictor(0.1),
      heldOut,
    });
    expect(d.action).toBe("commit");
    expect(d.committed).toBe(true);
    expect(d.retentionRatio).toBeGreaterThanOrEqual(0.95);
  });

  it("rolls back when candidate degrades MAE by > 5 %", () => {
    const engine = new WEDMModelUpdateEngine();
    const heldOut = makeHeldOut();
    const d = engine.evaluate({
      modelId: "wedm-ra-v1.8",
      metric: "mae",
      oldPredictor: biasedPredictor(0.5),
      candidatePredictor: biasedPredictor(1.0), // worse
      heldOut,
    });
    expect(d.action).toBe("rollback");
    expect(d.committed).toBe(false);
    expect(d.retentionRatio).toBeLessThan(0.95);
  });

  it("enforces the 0.95 floor by default", () => {
    const engine = new WEDMModelUpdateEngine();
    const heldOut = makeHeldOut();
    const d = engine.evaluate({
      modelId: "m",
      metric: "mae",
      oldPredictor: biasedPredictor(0.1),
      candidatePredictor: biasedPredictor(0.15),
      heldOut,
    });
    expect(d.minRetention).toBe(0.95);
  });
});

describe("WEDMModelUpdateEngine — metric directions", () => {
  it("error metric: retention = old/cand (higher-is-better space)", () => {
    const engine = new WEDMModelUpdateEngine();
    const heldOut = makeHeldOut();
    const d = engine.evaluate({
      modelId: "m",
      metric: "rmse",
      oldPredictor: biasedPredictor(1.0),
      candidatePredictor: biasedPredictor(0.5),
      heldOut,
    });
    expect(d.retentionRatio).toBeGreaterThan(1); // candidate better
    expect(d.committed).toBe(true);
  });

  it("score metric: retention = cand/old", () => {
    const engine = new WEDMModelUpdateEngine();
    // r2: true-predictor = perfect r2=1; biased predictor slightly worse
    const heldOut = makeHeldOut();
    const d = engine.evaluate({
      modelId: "m",
      metric: "r2",
      oldPredictor: biasedPredictor(0.5),
      candidatePredictor: biasedPredictor(0.2),
      heldOut,
    });
    expect(d.retentionRatio).toBeGreaterThan(1);
    expect(d.committed).toBe(true);
  });

  it("accuracy: rollback when candidate flips a quarter of labels", () => {
    const engine = new WEDMModelUpdateEngine();
    // Binary classification via predictor returning 0 or 1.
    const heldOut: HeldOutSample[] = [];
    for (let i = 0; i < 40; i++) heldOut.push({ x: [i], y: i % 2 });
    const oldP: Predictor = (x) => x[0] % 2;
    // Flip 12 of 40 labels — acc drops from 1.0 to 0.70 → retention 0.70 < 0.95.
    const candP: Predictor = (x) => {
      const i = x[0] as number;
      if (i < 12) return (i + 1) % 2;
      return i % 2;
    };
    const d = engine.evaluate({
      modelId: "clf",
      metric: "acc",
      oldPredictor: oldP,
      candidatePredictor: candP,
      heldOut,
    });
    expect(d.action).toBe("rollback");
    expect(d.retentionRatio).toBeLessThan(0.95);
  });
});

describe("WEDMModelUpdateEngine — edge cases", () => {
  it("blocks when held-out set < 10 samples", () => {
    const engine = new WEDMModelUpdateEngine();
    const d = engine.evaluate({
      modelId: "tiny",
      metric: "mae",
      oldPredictor: truePredictor,
      candidatePredictor: truePredictor,
      heldOut: makeHeldOut(5),
    });
    expect(d.action).toBe("blocked-insufficient-data");
    expect(d.committed).toBe(false);
  });

  it("accepts identical models with retention = 1.0", () => {
    const engine = new WEDMModelUpdateEngine();
    const d = engine.evaluate({
      modelId: "ident",
      metric: "rmse",
      oldPredictor: biasedPredictor(0.3),
      candidatePredictor: biasedPredictor(0.3),
      heldOut: makeHeldOut(),
    });
    expect(d.retentionRatio).toBeCloseTo(1.0, 6);
    expect(d.committed).toBe(true);
  });

  it("allows a strict override below 0.95", () => {
    const engine = new WEDMModelUpdateEngine();
    const d = engine.evaluate({
      modelId: "strict",
      metric: "mae",
      oldPredictor: biasedPredictor(0.1),
      candidatePredictor: biasedPredictor(0.12),
      heldOut: makeHeldOut(),
      minRetention: 0.99,
    });
    expect(d.minRetention).toBe(0.99);
  });
});

describe("WEDMModelUpdateEngine — audit", () => {
  it("records each decision and returns most-recent-first", () => {
    const engine = new WEDMModelUpdateEngine();
    engine.evaluate({
      modelId: "a",
      metric: "mae",
      oldPredictor: biasedPredictor(0.1),
      candidatePredictor: biasedPredictor(0.05),
      heldOut: makeHeldOut(),
      label: "a-update",
    });
    engine.evaluate({
      modelId: "b",
      metric: "rmse",
      oldPredictor: biasedPredictor(0.1),
      candidatePredictor: biasedPredictor(0.2),
      heldOut: makeHeldOut(),
      label: "b-update",
    });
    const audit = engine.getAudit();
    expect(audit).toHaveLength(2);
    expect(audit[0].label).toBe("b-update");
    expect(audit[1].label).toBe("a-update");
  });

  it("resetAudit clears the ring", () => {
    const engine = new WEDMModelUpdateEngine();
    engine.evaluate({
      modelId: "a",
      metric: "mae",
      oldPredictor: biasedPredictor(0.1),
      candidatePredictor: biasedPredictor(0.05),
      heldOut: makeHeldOut(),
    });
    engine.resetAudit();
    expect(engine.getAudit()).toHaveLength(0);
  });
});

describe("WEDMModelUpdateEngine — evaluateBatch", () => {
  it("aggregates commit/rollback/blocked counts", () => {
    const engine = new WEDMModelUpdateEngine();
    const res = engine.evaluateBatch([
      {
        modelId: "good",
        metric: "mae",
        oldPredictor: biasedPredictor(0.5),
        candidatePredictor: biasedPredictor(0.1),
        heldOut: makeHeldOut(40, 1),
      },
      {
        modelId: "bad",
        metric: "mae",
        oldPredictor: biasedPredictor(0.1),
        candidatePredictor: biasedPredictor(1.0),
        heldOut: makeHeldOut(40, 2),
      },
      {
        modelId: "tiny",
        metric: "rmse",
        oldPredictor: biasedPredictor(0.3),
        candidatePredictor: biasedPredictor(0.3),
        heldOut: makeHeldOut(3, 3),
      },
    ]);
    expect(res.committed).toBe(1);
    expect(res.rolledBack).toBe(1);
    expect(res.blocked).toBe(1);
    expect(res.decisions.map((d) => d.modelId)).toEqual(["good", "bad", "tiny"]);
  });
});
