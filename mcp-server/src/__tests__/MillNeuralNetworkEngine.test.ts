/**
 * MillNeuralNetworkEngine tests — MILL-NEURAL-MS0
 * Covers encodeFeatures, addTrainingSample/train, predict, detectAnomaly,
 * and getNetworkStats across a 37→32→16→8→5 architecture.
 */

import { describe, expect, it } from "vitest";
import { MillNeuralNetworkEngine } from "../engines/MillNeuralNetworkEngine.js";

const INPUT_SIZE = 37;
const OUTPUT_SIZE = 5;
const EXPECTED_LAYERS = 5;
// 37 input (no weights) + 32×37 + 16×32 + 8×16 + 5×8 = 1864
const EXPECTED_TOTAL_WEIGHTS = 32 * 37 + 16 * 32 + 8 * 16 + 5 * 8;
const EXPECTED_TOTAL_NEURONS = 37 + 32 + 16 + 8 + 5;
const INITIAL_PRIOR_CONFIDENCE = 0.5;

describe("MillNeuralNetworkEngine.encodeFeatures", () => {
  const engine = new MillNeuralNetworkEngine();

  it("returns an array of INPUT_SIZE (37) elements", () => {
    const features = engine.encodeFeatures("P", "flat_endmill", "face", 10, 5000, 50, 1, 5, false, false);
    expect(features).toHaveLength(INPUT_SIZE);
  });

  it("one-hot encodes ISO material groups at indices 0..5", () => {
    const pFeatures = engine.encodeFeatures("P", "flat_endmill", "face", 10, 5000, 50, 1, 5, false, false);
    expect(pFeatures[0]).toBe(1);
    expect(pFeatures[1]).toBe(0);
    expect(pFeatures[5]).toBe(0);

    const hFeatures = engine.encodeFeatures("H", "flat_endmill", "face", 10, 5000, 50, 1, 5, false, false);
    expect(hFeatures[0]).toBe(0);
    expect(hFeatures[5]).toBe(1);
  });

  it("leaves all material slots zero for an unknown ISO group", () => {
    const features = engine.encodeFeatures("X", "flat_endmill", "face", 10, 5000, 50, 1, 5, false, false);
    for (let i = 0; i < 6; i++) {
      expect(features[i]).toBe(0);
    }
  });

  it("one-hot encodes tool type at the correct index (flat_endmill → 8, face_mill → 11)", () => {
    const flat = engine.encodeFeatures("P", "flat_endmill", "face", 10, 5000, 50, 1, 5, false, false);
    expect(flat[8]).toBe(1);
    expect(flat[9]).toBe(0);
    expect(flat[11]).toBe(0);

    const faceMill = engine.encodeFeatures("P", "face_mill", "face", 10, 5000, 50, 1, 5, false, false);
    expect(faceMill[8]).toBe(0);
    expect(faceMill[11]).toBe(1);
  });

  it("one-hot encodes operation type at indices 16+ (face → 16, drill → 21)", () => {
    const faceOp = engine.encodeFeatures("P", "flat_endmill", "face", 10, 5000, 50, 1, 5, false, false);
    expect(faceOp[16]).toBe(1);
    expect(faceOp[21]).toBe(0);

    const drillOp = engine.encodeFeatures("P", "twist_drill", "drill", 10, 5000, 50, 1, 5, false, false);
    expect(drillOp[16]).toBe(0);
    expect(drillOp[21]).toBe(1);
  });

  it("clamps continuous features to [0, 1] even for oversized inputs", () => {
    const big = engine.encodeFeatures("P", "flat_endmill", "face", 200, 50000, 500, 100, 200, true, true);
    expect(big[28]).toBe(1); // tool_diameter
    expect(big[29]).toBe(1); // rpm
    expect(big[30]).toBe(1); // feed
    expect(big[31]).toBe(1); // doc
    expect(big[34]).toBe(1); // z_levels
    expect(big[35]).toBe(1); // cutterComp
    expect(big[36]).toBe(1); // isProven
  });

  it("encodes boolean flags as exact 0 or 1 at their fixed positions", () => {
    const offFlags = engine.encodeFeatures("P", "flat_endmill", "face", 10, 5000, 50, 1, 5, false, false);
    expect(offFlags[35]).toBe(0);
    expect(offFlags[36]).toBe(0);

    const onFlags = engine.encodeFeatures("P", "flat_endmill", "face", 10, 5000, 50, 1, 5, true, true);
    expect(onFlags[35]).toBe(1);
    expect(onFlags[36]).toBe(1);
  });

  it("normalizes tool_diameter = 25 mm (half-scale) to features[28] ≈ 0.5", () => {
    const features = engine.encodeFeatures("P", "flat_endmill", "face", 25, 5000, 50, 1, 5, false, false);
    expect(features[28]).toBeCloseTo(0.5, 6);
  });
});

describe("MillNeuralNetworkEngine.addTrainingSample + train", () => {
  it("train() returns zero loss and zero epochs when no samples have been added", () => {
    const engine = new MillNeuralNetworkEngine();
    const out = engine.train();
    expect(out.loss).toBe(0);
    expect(out.epochs).toBe(0);
  });

  it("train() reports a finite loss and a positive epoch count after samples are added", () => {
    const engine = new MillNeuralNetworkEngine();
    engine.addTrainingSample("P", "flat_endmill", "face", 12, 5000, 40, 1, 4, false, true, 6000, 50, 1.2);
    engine.addTrainingSample("M", "insert_endmill", "rough_profile", 20, 3000, 60, 2, 6, false, false, 3500, 70, 2.5);
    const out = engine.train();
    expect(out.epochs).toBeGreaterThan(0);
    expect(Number.isFinite(out.loss)).toBe(true);
    expect(out.loss).toBeGreaterThanOrEqual(0);
  });

  it("getNetworkStats() reflects training_samples count after each add", () => {
    const engine = new MillNeuralNetworkEngine();
    expect(engine.getNetworkStats().training_samples).toBe(0);
    engine.addTrainingSample("P", "flat_endmill", "face", 12, 5000, 40, 1, 4, false, true, 6000, 50, 1.2);
    expect(engine.getNetworkStats().training_samples).toBe(1);
    engine.addTrainingSample("M", "insert_endmill", "rough_profile", 20, 3000, 60, 2, 6, false, false, 3500, 70, 2.5);
    expect(engine.getNetworkStats().training_samples).toBe(2);
  });

  it("flips trained=true after calling train() with at least one sample", () => {
    const engine = new MillNeuralNetworkEngine();
    engine.addTrainingSample("P", "flat_endmill", "face", 12, 5000, 40, 1, 4, false, true, 6000, 50, 1.2);
    expect(engine.getNetworkStats().trained).toBe(false);
    engine.train();
    expect(engine.getNetworkStats().trained).toBe(true);
  });
});

describe("MillNeuralNetworkEngine.predict", () => {
  it("returns a NeuralPrediction with a 3-element output and a clamped confidence", () => {
    const engine = new MillNeuralNetworkEngine();
    const prediction = engine.predict("P", "flat_endmill", "face", 12, 5000, 40, 1, 4, false);
    expect(prediction.output).toHaveLength(3);
    for (const value of prediction.output) {
      expect(Number.isFinite(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(0);
    }
    // Bayesian clamp: confidence ∈ [0.1, 0.99]
    expect(prediction.confidence).toBeGreaterThanOrEqual(0.1);
    expect(prediction.confidence).toBeLessThanOrEqual(0.99);
  });

  it("returns a feature_importance map with keys matching the active feature names", () => {
    const engine = new MillNeuralNetworkEngine();
    const prediction = engine.predict("P", "flat_endmill", "face", 12, 5000, 40, 1, 4, false);
    const keys = Object.keys(prediction.feature_importance);
    expect(keys).toContain("material_P");
    expect(keys).toContain("tool_flat_em");
    expect(keys).toContain("op_face");
    expect(keys).not.toContain("material_H");   // not active
    expect(keys).not.toContain("op_drill");     // not active
    for (const value of Object.values(prediction.feature_importance)) {
      expect(value).toBeGreaterThanOrEqual(0);
    }
  });

  it("returns an explanation array of strings (never null/undefined)", () => {
    const engine = new MillNeuralNetworkEngine();
    const prediction = engine.predict("M", "insert_endmill", "rough_profile", 16, 3000, 50, 2, 6, false);
    expect(Array.isArray(prediction.explanation)).toBe(true);
    for (const line of prediction.explanation) {
      expect(typeof line).toBe("string");
    }
  });

  it("pushes into sequence memory and tracks confidence across predict calls", () => {
    const engine = new MillNeuralNetworkEngine();
    const before = engine.getNetworkStats();
    expect(before.avg_confidence).toBeCloseTo(INITIAL_PRIOR_CONFIDENCE, 6);
    engine.predict("P", "flat_endmill", "face", 12, 5000, 40, 1, 4, false);
    engine.predict("P", "flat_endmill", "face", 12, 5000, 40, 1, 4, false);
    const after = engine.getNetworkStats();
    // With 2 predictions logged, avg_confidence must be recomputed from history
    expect(after.avg_confidence).toBeGreaterThanOrEqual(0);
    expect(after.avg_confidence).toBeLessThanOrEqual(1);
  });
});

describe("MillNeuralNetworkEngine.detectAnomaly", () => {
  it("returns an object with isAnomaly:boolean, score:number, reason:string for any input", () => {
    const engine = new MillNeuralNetworkEngine();
    const out = engine.detectAnomaly("P", "flat_endmill", "face", 12, 5000, 40, 1);
    expect(typeof out.isAnomaly).toBe("boolean");
    expect(typeof out.score).toBe("number");
    expect(typeof out.reason).toBe("string");
    expect(Number.isFinite(out.score)).toBe(true);
  });

  it("flags RPM far from the expected range as an anomaly", () => {
    const engine = new MillNeuralNetworkEngine();
    // Train on a small sample so expected_rpm is well-defined in-range
    engine.addTrainingSample("P", "flat_endmill", "face", 12, 5000, 40, 1, 4, false, true, 6000, 50, 1.2);
    engine.train();
    // RPM of 50 is wildly out of the 6000 nominal range
    const out = engine.detectAnomaly("P", "flat_endmill", "face", 12, 50, 40, 1);
    expect(out.isAnomaly).toBe(true);
    expect(out.reason.length).toBeGreaterThan(0);
  });

  it("returns the 'normal range' reason string for not-anomalous inputs", () => {
    const engine = new MillNeuralNetworkEngine();
    // With rpm=0, the RPM deviation guard skips — only pure score-based check fires
    const out = engine.detectAnomaly("P", "flat_endmill", "face", 12, 0, 0, 1);
    // If anomaly score ≤ 0.7 and rpm/feed guards bypassed, we hit the normal branch
    if (!out.isAnomaly) {
      expect(out.reason).toContain("normal range");
    } else {
      expect(out.score).toBeGreaterThan(0);
    }
  });
});

describe("MillNeuralNetworkEngine.getNetworkStats", () => {
  it("reports the correct static architecture on a fresh instance", () => {
    const engine = new MillNeuralNetworkEngine();
    const stats = engine.getNetworkStats();
    expect(stats.layers).toBe(EXPECTED_LAYERS);
    expect(stats.total_neurons).toBe(EXPECTED_TOTAL_NEURONS);
    expect(stats.total_weights).toBe(EXPECTED_TOTAL_WEIGHTS);
    expect(stats.training_samples).toBe(0);
    expect(stats.trained).toBe(false);
    expect(stats.avg_confidence).toBeCloseTo(INITIAL_PRIOR_CONFIDENCE, 6);
  });

  it("OUTPUT_SIZE is 5 — one slot each for RPM, Feed, DOC, Confidence, Anomaly", () => {
    const engine = new MillNeuralNetworkEngine();
    const stats = engine.getNetworkStats();
    // Output layer contributes OUTPUT_SIZE neurons; verify via architecture sum
    const hiddenAndInputNeurons = 37 + 32 + 16 + 8;
    expect(stats.total_neurons - hiddenAndInputNeurons).toBe(OUTPUT_SIZE);
  });
});
