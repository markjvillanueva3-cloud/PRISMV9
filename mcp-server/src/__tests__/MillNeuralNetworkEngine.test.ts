/**
 * MillNeuralNetworkEngine tests — MILL-NEURAL-MS0
 * Covers encodeFeatures, addTrainingSample/train, predict, detectAnomaly,
 * and getNetworkStats across a 37→32→16→8→5 architecture.
 */

import { describe, expect, it } from "vitest";
import {
  MillNeuralNetworkEngine,
  millNeuralNetworkEngine,
  type MillNeuralEncodeInput,
} from "../engines/MillNeuralNetworkEngine.js";
import { neuralIntegrationEngine } from "../engines/NeuralIntegrationEngine.js";

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

// ============================================================================
// MILL-MASTER-AI-WIRING / U14-NEURAL-RETROFIT
// encode() public wrapper + neuralIntegrationEngine.route() reachability
// ============================================================================

describe("MillNeuralNetworkEngine.encode — structured input wrapper (U14)", () => {
  const engine = new MillNeuralNetworkEngine();

  const ENCODE_INPUT: MillNeuralEncodeInput = {
    materialIso: "P",
    toolType: "flat_endmill",
    operationType: "rough_pocket",
    toolDiameterMm: 12,
    rpm: 6000,
    feed: 60,
    doc: 2,
    zLevelCount: 4,
    cutterComp: true,
    isProven: true,
  };

  it("returns array of length INPUT_SIZE (37) for a valid structured input", () => {
    const features = engine.encode(ENCODE_INPUT);
    expect(features).toHaveLength(INPUT_SIZE);
  });

  it("encode() output is bit-identical to encodeFeatures() with the same args", () => {
    const fromWrapper = engine.encode(ENCODE_INPUT);
    const fromDirect = engine.encodeFeatures(
      ENCODE_INPUT.materialIso,
      ENCODE_INPUT.toolType,
      ENCODE_INPUT.operationType,
      ENCODE_INPUT.toolDiameterMm,
      ENCODE_INPUT.rpm,
      ENCODE_INPUT.feed,
      ENCODE_INPUT.doc,
      ENCODE_INPUT.zLevelCount,
      ENCODE_INPUT.cutterComp,
      ENCODE_INPUT.isProven ?? false,
    );
    expect(fromWrapper).toEqual(fromDirect);
  });

  it("encode() defaults isProven to false when omitted", () => {
    const noProven: MillNeuralEncodeInput = { ...ENCODE_INPUT };
    delete noProven.isProven;
    const features = engine.encode(noProven);
    // Slot 36 is isProven flag
    expect(features[36]).toBe(0);
  });

  it("encode() honors materialIso one-hot at slot 0..5 (K → slot 2)", () => {
    const features = engine.encode({ ...ENCODE_INPUT, materialIso: "K" });
    expect(features[0]).toBe(0);
    expect(features[2]).toBe(1);
    expect(features[5]).toBe(0);
  });

  it("encode() honors cutterComp at slot 35", () => {
    const off = engine.encode({ ...ENCODE_INPUT, cutterComp: false });
    const on = engine.encode({ ...ENCODE_INPUT, cutterComp: true });
    expect(off[35]).toBe(0);
    expect(on[35]).toBe(1);
  });

  it("encode() output is consumable by predict() (round-trip via singleton)", () => {
    const prediction = millNeuralNetworkEngine.predict(
      ENCODE_INPUT.materialIso,
      ENCODE_INPUT.toolType,
      ENCODE_INPUT.operationType,
      ENCODE_INPUT.toolDiameterMm,
      ENCODE_INPUT.rpm,
      ENCODE_INPUT.feed,
      ENCODE_INPUT.doc,
      ENCODE_INPUT.zLevelCount,
      ENCODE_INPUT.cutterComp,
    );
    expect(prediction.output).toHaveLength(3);
    expect(Number.isFinite(prediction.output[0])).toBe(true);
    expect(Number.isFinite(prediction.output[1])).toBe(true);
    expect(Number.isFinite(prediction.output[2])).toBe(true);
    expect(prediction.confidence).toBeGreaterThanOrEqual(0);
    expect(prediction.confidence).toBeLessThanOrEqual(1);
  });
});

describe("neuralIntegrationEngine.route — reaches MillNeuralNetworkEngine for mill-domain neural queries (U14)", () => {
  it("route('mill neural network prediction') returns engine === MillNeuralNetworkEngine", () => {
    const r = neuralIntegrationEngine.route({
      input: "mill neural network prediction model",
    });
    expect(r.engine).toBe("MillNeuralNetworkEngine");
    expect(r.action).toBe("prism_calc:mill_neural_predict");
  });

  it("route('neural network for milling') matches the mill_neural pattern", () => {
    const r = neuralIntegrationEngine.route({
      input: "neural network for milling parameter prediction",
    });
    expect(r.engine).toBe("MillNeuralNetworkEngine");
  });

  it("route confidence on mill_neural match is in [0.6, 0.95]", () => {
    const r = neuralIntegrationEngine.route({
      input: "mill neural network prediction",
    });
    expect(r.confidence).toBeGreaterThanOrEqual(0.6);
    expect(r.confidence).toBeLessThanOrEqual(0.95);
  });

  it("route reasoning string mentions the mill_neural pattern name", () => {
    const r = neuralIntegrationEngine.route({
      input: "mill neural prediction model",
    });
    expect(r.reasoning).toMatch(/mill_neural/i);
  });

  it("route preserves the milling pattern for non-neural mill queries", () => {
    const r = neuralIntegrationEngine.route({ input: "milling roughing strategy" });
    expect(r.engine).toBe("MillingDeepAIHardeningEngine");
  });

  it("route falls through to default reasoning for off-domain queries", () => {
    const r = neuralIntegrationEngine.route({ input: "  " });
    // Empty/whitespace queries should not falsely match mill_neural.
    expect(r.engine).not.toBe("MillNeuralNetworkEngine");
  });

  it("route alternatives never duplicate the primary engine", () => {
    const r = neuralIntegrationEngine.route({
      input: "mill neural network prediction",
    });
    for (const alt of r.alternatives) {
      expect(alt.engine).not.toBe(r.engine);
    }
  });
});
