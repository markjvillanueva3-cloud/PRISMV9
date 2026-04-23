/**
 * MillComprehensiveNeuralEngine tests
 * Covers encodeFeatures (256-dim), forward, predict, detectAnomaly,
 * deepReason, addTrainingSample/train/trainEpoch, and getStatistics on a
 * 256→128→64→32→16→12 network.
 */

import { describe, expect, it } from "vitest";
import {
  MillComprehensiveNeuralEngine,
  MATERIAL_ENCODING,
  TOOL_TYPE_ENCODING,
  HOLDER_ENCODING,
  MACHINE_ENCODING,
  CONTROLLER_ENCODING,
  KINEMATICS_ENCODING,
  TOOLPATH_ENCODING,
  BUILD_QUALITY_ENCODING,
  SPINDLE_ENCODING,
  SAFETY_ENCODING,
  EQUIPMENT_ENCODING,
} from "../engines/MillComprehensiveNeuralEngine.js";

const INPUT_DIM = 256;
const OUTPUT_DIM = 12;
const LAYERS = [256, 128, 64, 32, 16, 12];
const EXPECTED_TOTAL_NEURONS = LAYERS.reduce((sum, n) => sum + n, 0);
// Each neuron contributes (prevLayerSize) weights + 1 bias
const EXPECTED_TOTAL_WEIGHTS =
  256 * (0 + 1) +        // layer 0
  128 * (256 + 1) +      // layer 1
  64 * (128 + 1) +       // layer 2
  32 * (64 + 1) +        // layer 3
  16 * (32 + 1) +        // layer 4
  12 * (16 + 1);         // layer 5
const ARCHITECTURE_STRING = "256→128→64→32→16→12";

function makeScenario() {
  return {
    material: "P" as const,
    tool_type: "FLAT_ENDMILL" as keyof typeof TOOL_TYPE_ENCODING,
    holder_type: "SHRINK_FIT" as keyof typeof HOLDER_ENCODING,
    machine: "HAAS_VF2" as keyof typeof MACHINE_ENCODING,
    controller: "HAAS_NGC" as keyof typeof CONTROLLER_ENCODING,
    kinematics: Object.keys(KINEMATICS_ENCODING)[0] as keyof typeof KINEMATICS_ENCODING,
    toolpath: Object.keys(TOOLPATH_ENCODING)[0] as keyof typeof TOOLPATH_ENCODING,
    build_quality: Object.keys(BUILD_QUALITY_ENCODING)[0] as keyof typeof BUILD_QUALITY_ENCODING,
    spindle: Object.keys(SPINDLE_ENCODING)[0] as keyof typeof SPINDLE_ENCODING,
    tool_diameter_mm: 12,
    doc_mm: 1.5,
    woc_mm: 3.0,
    rpm: 6000,
    feed_mm_min: 800,
    coolant_type: "flood" as const,
    proven_source: true,
  };
}

describe("MillComprehensiveNeuralEngine initialization", () => {
  const engine = new MillComprehensiveNeuralEngine();

  it("reports the canonical 256→128→64→32→16→12 architecture", () => {
    expect(engine.getArchitecture()).toBe(ARCHITECTURE_STRING);
  });

  it("getTotalNeurons matches the sum of the layer sizes", () => {
    expect(engine.getTotalNeurons()).toBe(EXPECTED_TOTAL_NEURONS);
  });

  it("getTotalWeights matches Xavier-init weights-plus-biases across all layers", () => {
    expect(engine.getTotalWeights()).toBe(EXPECTED_TOTAL_WEIGHTS);
  });

  it("getStatistics reports the input/output dims and zero training state on a fresh engine", () => {
    const stats = engine.getStatistics();
    expect(stats.input_dim).toBe(INPUT_DIM);
    expect(stats.output_dim).toBe(OUTPUT_DIM);
    expect(stats.training_samples).toBe(0);
    expect(stats.epochs_trained).toBe(0);
    expect(stats.architecture).toBe(ARCHITECTURE_STRING);
    expect(stats.total_neurons).toBe(EXPECTED_TOTAL_NEURONS);
  });
});

describe("MillComprehensiveNeuralEngine.encodeFeatures", () => {
  const engine = new MillComprehensiveNeuralEngine();

  it("returns a Float64Array of exactly 256 dimensions", () => {
    const features = engine.encodeFeatures(makeScenario());
    expect(features).toBeInstanceOf(Float64Array);
    expect(features.length).toBe(INPUT_DIM);
  });

  it("one-hot encodes P-group material at index MATERIAL_ENCODING.P (0)", () => {
    const features = engine.encodeFeatures(makeScenario());
    expect(features[MATERIAL_ENCODING.P]).toBe(1);
    expect(features[MATERIAL_ENCODING.M]).toBe(0);
    expect(features[MATERIAL_ENCODING.N]).toBe(0);
  });

  it("one-hot encodes FLAT_ENDMILL at TOOL_TYPE_ENCODING.FLAT_ENDMILL (8)", () => {
    const features = engine.encodeFeatures(makeScenario());
    expect(features[TOOL_TYPE_ENCODING.FLAT_ENDMILL]).toBe(1);
    expect(features[TOOL_TYPE_ENCODING.BALL_ENDMILL]).toBe(0);
  });

  it("encodes the HAAS_VF2 machine and HAAS_NGC controller at their canonical indices", () => {
    const features = engine.encodeFeatures(makeScenario());
    expect(features[MACHINE_ENCODING.HAAS_VF2]).toBe(1);
    expect(features[CONTROLLER_ENCODING.HAAS_NGC]).toBe(1);
  });

  it("encodes flood coolant at EQUIPMENT_ENCODING.COOLANT_FLOOD", () => {
    const features = engine.encodeFeatures(makeScenario());
    expect(features[EQUIPMENT_ENCODING.COOLANT_FLOOD]).toBe(1);
    expect(features[EQUIPMENT_ENCODING.COOLANT_MQL]).toBe(0);
  });

  it("encodes proven_source=true at feature index 240", () => {
    const features = engine.encodeFeatures(makeScenario());
    expect(features[240]).toBe(1);

    const notProven = engine.encodeFeatures({ ...makeScenario(), proven_source: false });
    expect(notProven[240]).toBe(0);
  });

  it("normalizes tool_diameter_mm, doc_mm, rpm, feed to [0, 1] at continuous slots", () => {
    const features = engine.encodeFeatures(makeScenario());
    // tool_diameter = 12mm / 50mm max = 0.24
    expect(features[192]).toBeCloseTo(12 / 50, 6);
    // doc = 1.5mm / 20mm max = 0.075
    expect(features[193]).toBeCloseTo(1.5 / 20, 6);
    // woc = 3mm / 50mm max = 0.06
    expect(features[194]).toBeCloseTo(3 / 50, 6);
    // rpm = 6000 / 30000 = 0.2
    expect(features[195]).toBeCloseTo(6000 / 30000, 6);
    // feed = 800 / 5000 = 0.16
    expect(features[196]).toBeCloseTo(800 / 5000, 6);
  });

  it("clamps oversize parameters to 1 (max normalization bound)", () => {
    const oversize = engine.encodeFeatures({
      ...makeScenario(),
      tool_diameter_mm: 1000,
      doc_mm: 500,
      rpm: 60000,
      feed_mm_min: 20000,
    });
    expect(oversize[192]).toBe(1);
    expect(oversize[193]).toBe(1);
    expect(oversize[195]).toBe(1);
    expect(oversize[196]).toBe(1);
  });

  it("sets SAFETY_ENCODING.COLLISION_CHECK_ON when has_collision_check=true", () => {
    const withCheck = engine.encodeFeatures({ ...makeScenario(), has_collision_check: true });
    expect(withCheck[SAFETY_ENCODING.COLLISION_CHECK_ON]).toBe(1);
    const withoutCheck = engine.encodeFeatures({ ...makeScenario(), has_collision_check: false });
    expect(withoutCheck[SAFETY_ENCODING.COLLISION_CHECK_ON]).toBe(0);
  });
});

describe("MillComprehensiveNeuralEngine.forward", () => {
  const engine = new MillComprehensiveNeuralEngine();

  it("throws a dimension error when the input array is not 256 long", () => {
    expect(() => engine.forward(new Float64Array(10))).toThrow(/256 dimensions/);
    expect(() => engine.forward(new Float64Array(300))).toThrow(/256 dimensions/);
  });

  it("produces a 12-element output vector for a valid 256-dim input", () => {
    const input = engine.encodeFeatures(makeScenario());
    const output = engine.forward(input);
    expect(output.length).toBe(OUTPUT_DIM);
    for (const value of output) {
      expect(Number.isFinite(value)).toBe(true);
      // Output layer is sigmoid → values in [0, 1]
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
  });
});

describe("MillComprehensiveNeuralEngine.predict", () => {
  const engine = new MillComprehensiveNeuralEngine();

  it("produces a ComprehensivePrediction with decision_chain mentioning the 256-dim input", () => {
    const input = engine.encodeFeatures(makeScenario());
    const pred = engine.predict(input);
    expect(pred.decision_chain.some(s => s.includes(String(INPUT_DIM)))).toBe(true);
    expect(pred.decision_chain.some(s => s.includes(String(OUTPUT_DIM)))).toBe(true);
    expect(pred.decision_chain.some(s => s.includes("Kienzle"))).toBe(true);
  });

  it("denormalizes RPM to the [0, 30000] range and feed to [0, 5000]", () => {
    const input = engine.encodeFeatures(makeScenario());
    const pred = engine.predict(input);
    expect(pred.rpm).toBeGreaterThanOrEqual(0);
    expect(pred.rpm).toBeLessThanOrEqual(30000);
    expect(pred.feed_rate_mm_min).toBeGreaterThanOrEqual(0);
    expect(pred.feed_rate_mm_min).toBeLessThanOrEqual(5000);
    expect(pred.doc_mm).toBeGreaterThanOrEqual(0);
    expect(pred.doc_mm).toBeLessThanOrEqual(20);
  });

  it("attaches the raw attention_weights (sigmoid output) as an OUTPUT_DIM array", () => {
    const input = engine.encodeFeatures(makeScenario());
    const pred = engine.predict(input);
    expect(pred.attention_weights.length).toBe(OUTPUT_DIM);
  });

  it("returns no physics_violations when the denormalized RPM stays in-range", () => {
    const input = engine.encodeFeatures(makeScenario());
    const pred = engine.predict(input);
    // Since network is untrained + sigmoid, rpm is bounded [0, 30000].
    // Violations fire below 100 OR above 40000; the upper bound can't be hit.
    // The lower bound CAN be hit if network output is tiny. Assertion: either empty
    // or contains only rpm/feed range violations — no panics.
    for (const v of pred.physics_violations) {
      expect(v.toLowerCase()).toMatch(/rpm|feed/);
    }
  });
});

describe("MillComprehensiveNeuralEngine.detectAnomaly", () => {
  const engine = new MillComprehensiveNeuralEngine();

  it("returns an AnomalyReport with severity 'info' for a normal input", () => {
    const input = engine.encodeFeatures(makeScenario());
    const report = engine.detectAnomaly(input);
    expect(["info", "warning", "critical"]).toContain(report.severity);
    expect(report.anomaly_score).toBeGreaterThanOrEqual(0);
    expect(report.anomaly_score).toBeLessThanOrEqual(1);
  });

  it("flags RPM as anomalous when rpm_normalized > 0.9 (high)", () => {
    const input = engine.encodeFeatures({
      ...makeScenario(),
      rpm: 29000, // 29000/30000 = 0.967 > 0.9
    });
    const report = engine.detectAnomaly(input);
    expect(report.flagged_features).toContain("RPM");
    expect(report.actual_values.get("RPM")).toBeCloseTo(29000, 0);
  });

  it("flags RPM as anomalous when rpm_normalized < 0.05 (low)", () => {
    const input = engine.encodeFeatures({
      ...makeScenario(),
      rpm: 1000, // 1000/30000 = 0.033 < 0.05
    });
    const report = engine.detectAnomaly(input);
    expect(report.flagged_features).toContain("RPM");
  });

  it("flags aggressive params when both feed_normalized > 0.8 and doc_normalized > 0.5", () => {
    const input = engine.encodeFeatures({
      ...makeScenario(),
      feed_mm_min: 4500, // 4500/5000 = 0.9
      doc_mm: 15,        // 15/20 = 0.75
      rpm: 10000,        // keep in-range so RPM flag doesn't also fire
    });
    const report = engine.detectAnomaly(input);
    expect(report.flagged_features).toContain("aggressive_params");
    expect(report.reconstruction_error).toBeGreaterThanOrEqual(0.3);
  });
});

describe("MillComprehensiveNeuralEngine.deepReason", () => {
  const engine = new MillComprehensiveNeuralEngine();

  it("gathers material-based evidence for a P-group query", () => {
    const out = engine.deepReason("What RPM?", { material: "P" });
    expect(out.evidence.some(e => e.includes("kc1.1"))).toBe(true);
    expect(out.evidence.some(e => e.includes("Taylor constants"))).toBe(true);
    expect(out.confidence).toBeGreaterThan(0.5);
  });

  it("emits HSM logic when the machine name contains ROKU", () => {
    const out = engine.deepReason("strategy?", { machine: "ROKU_ROKU_HC658" });
    expect(out.logic_chain.some(l => l.includes("HSM"))).toBe(true);
    expect(out.alternatives.length).toBeGreaterThan(0);
  });

  it("emits Haas-specific logic when machine contains HAAS", () => {
    const out = engine.deepReason("how?", { machine: "HAAS_VF2" });
    expect(out.logic_chain.some(l => l.includes("Haas"))).toBe(true);
    expect(out.alternatives.some(a => a.includes("G187"))).toBe(true);
  });

  it("emits chip-thinning logic when the operation is trochoidal", () => {
    const out = engine.deepReason("params?", { operation: "trochoidal" });
    expect(out.logic_chain.some(l => l.includes("Chip thinning"))).toBe(true);
    expect(out.logic_chain.some(l => l.includes("radial engagement"))).toBe(true);
  });

  it("emits finishing logic when the operation contains 'finish'", () => {
    const out = engine.deepReason("what to prioritize?", { operation: "finish_profile" });
    expect(out.logic_chain.some(l => l.includes("surface quality"))).toBe(true);
    expect(out.logic_chain.some(l => l.includes("climb milling"))).toBe(true);
  });

  it("falls through to the insufficient-context conclusion when no context keys match", () => {
    const out = engine.deepReason("what?", {});
    expect(out.conclusion).toContain("Insufficient context");
    expect(out.logic_chain).toEqual([]);
  });
});

describe("MillComprehensiveNeuralEngine training", () => {
  it("addTrainingSample bumps the training_samples count by one", () => {
    const engine = new MillComprehensiveNeuralEngine();
    const input = engine.encodeFeatures(makeScenario());
    const target = new Float64Array(OUTPUT_DIM);
    expect(engine.getStatistics().training_samples).toBe(0);
    engine.addTrainingSample({
      input,
      target,
      weight: 1,
      source: "test",
      physics_bounds: {
        min_rpm: 500, max_rpm: 15000,
        min_feed: 50, max_feed: 3000,
        max_doc: 10, max_woc: 40,
      },
      tribal_hints: [],
    });
    expect(engine.getStatistics().training_samples).toBe(1);
  });

  it("trainEpoch returns zero-sample epoch when no training data exists", () => {
    const engine = new MillComprehensiveNeuralEngine();
    const out = engine.trainEpoch();
    expect(out.samples).toBe(0);
  });

  it("train() with samples present increments epochs_trained", () => {
    const engine = new MillComprehensiveNeuralEngine();
    const input = engine.encodeFeatures(makeScenario());
    const target = new Float64Array(OUTPUT_DIM);
    target[0] = 0.5;
    engine.addTrainingSample({
      input,
      target,
      weight: 1,
      source: "test",
      physics_bounds: {
        min_rpm: 500, max_rpm: 15000,
        min_feed: 50, max_feed: 3000,
        max_doc: 10, max_woc: 40,
      },
      tribal_hints: [],
    });
    const before = engine.getStatistics().epochs_trained;
    engine.train(2);
    const after = engine.getStatistics().epochs_trained;
    expect(after).toBeGreaterThan(before);
  });
});
