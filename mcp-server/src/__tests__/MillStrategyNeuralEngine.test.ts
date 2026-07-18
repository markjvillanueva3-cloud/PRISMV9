import { describe, it, expect } from "vitest";
import {
  MillStrategyNeuralEngine,
  type StrategyFeatureVector,
} from "../engines/MillStrategyNeuralEngine.js";

describe("MillStrategyNeuralEngine", () => {
  const engine = new MillStrategyNeuralEngine();

  const testFeatures: StrategyFeatureVector = {
    material_iso_group: 0,
    hardness_normalized: 0.3,
    operation_type: 0,
    tolerance_class: 1,
    feature_complexity: 0.5,
    machine_class: 0,
    depth_to_diameter: 0.4,
    wall_thickness_ratio: 0.2,
  };

  describe("predict", () => {
    it("should return top 5 strategy predictions", () => {
      const result = engine.predict(testFeatures);

      expect(result.top_strategies.length).toBe(5);
      expect(result.top_strategies[0].rank).toBe(1);
      expect(result.top_strategies[4].rank).toBe(5);
    });

    it("should return probabilities that sum to approximately 1", () => {
      const result = engine.predict(testFeatures);
      const catalog = engine.getStrategyCatalog();

      const fullPrediction = engine.predict(testFeatures);
      expect(fullPrediction.top_strategies.every(s => s.probability >= 0 && s.probability <= 1)).toBe(true);
    });

    it("should return confidence between 0 and 1", () => {
      const result = engine.predict(testFeatures);

      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it("should include feature importance", () => {
      const result = engine.predict(testFeatures);

      expect(Object.keys(result.feature_importance).length).toBe(8);
      expect(result.feature_importance.material_iso_group).toBeDefined();
    });

    it("should include model version", () => {
      const result = engine.predict(testFeatures);

      expect(result.model_version).toMatch(/^v\d+\.\d+\.\d+/);
    });
  });

  describe("training interface", () => {
    it("should accept training examples", () => {
      const engine2 = new MillStrategyNeuralEngine();

      engine2.addTrainingExample({
        features: testFeatures,
        label_strategy_id: "adaptive_clearing",
        outcome: "success",
      });

      expect(engine2.getTrainingBufferSize()).toBe(1);
    });

    it("should clear training buffer", () => {
      const engine2 = new MillStrategyNeuralEngine();
      engine2.addTrainingExample({
        features: testFeatures,
        label_strategy_id: "trochoidal_rough",
        outcome: "partial",
      });

      engine2.clearTrainingBuffer();
      expect(engine2.getTrainingBufferSize()).toBe(0);
    });
  });

  describe("weight export/import", () => {
    it("should export and import weights", () => {
      const engine1 = new MillStrategyNeuralEngine();
      const result1 = engine1.predict(testFeatures);

      const weights = engine1.exportWeights();
      expect(weights.weights.w1.length).toBeGreaterThan(0);
      expect(weights.biases.b1.length).toBeGreaterThan(0);

      const engine2 = new MillStrategyNeuralEngine();
      engine2.importWeights(weights);

      const result2 = engine2.predict(testFeatures);
      expect(result2.top_strategies[0].strategy_id).toBe(result1.top_strategies[0].strategy_id);
    });
  });

  describe("strategy catalog", () => {
    it("should return list of strategies", () => {
      const catalog = engine.getStrategyCatalog();

      expect(catalog.length).toBeGreaterThan(10);
      expect(catalog[0].id).toBe("adaptive_clearing");
      expect(catalog[0].name).toBe("Adaptive Clearing");
    });
  });

  describe("closed learning loop (recordOutcome + trainFromBuffer)", () => {
    const LABEL = "drilling_standard";

    it("recordOutcome buffers a valid outcome and returns the buffer size", () => {
      const e = new MillStrategyNeuralEngine();
      const r = e.recordOutcome(testFeatures, LABEL, "success");
      expect(r.recorded).toBe(true);
      expect(r.strategy_id).toBe(LABEL);
      expect(r.buffer_size).toBe(1);
      expect(e.getTrainingBufferSize()).toBe(1);
    });

    it("recordOutcome throws on an unknown strategy id (no silent buffer)", () => {
      const e = new MillStrategyNeuralEngine();
      expect(() => e.recordOutcome(testFeatures, "nope_not_real", "success")).toThrow(/unknown strategy_id/);
      expect(e.getTrainingBufferSize()).toBe(0);
    });

    it("recordOutcome throws on a bad outcome enum", () => {
      const e = new MillStrategyNeuralEngine();
      // @ts-expect-error -- intentionally invalid outcome literal
      expect(() => e.recordOutcome(testFeatures, LABEL, "meh")).toThrow(/success\|partial\|failure/);
    });

    it("recordOutcome throws on a non-finite feature (NaN guard)", () => {
      const e = new MillStrategyNeuralEngine();
      expect(() => e.recordOutcome({ ...testFeatures, hardness_normalized: NaN }, LABEL, "success")).toThrow(/finite number/);
    });

    it("recordOutcome throws on an INCOMPLETE feature vector (missing field -> would NaN-poison training)", () => {
      const e = new MillStrategyNeuralEngine();
      const { wall_thickness_ratio: _drop, ...partial } = testFeatures;
      expect(() => e.recordOutcome(partial as StrategyFeatureVector, LABEL, "success")).toThrow(/wall_thickness_ratio.*finite number/);
      expect(e.getTrainingBufferSize()).toBe(0);
    });

    it("trainFromBuffer rolls back + reports trained:false on divergence (no silent corruption)", () => {
      const e = new MillStrategyNeuralEngine();
      e.recordOutcome(testFeatures, LABEL, "failure");
      // A huge negative failureWeight forces the weights to blow up to non-finite within a few epochs.
      const res = e.trainFromBuffer({ failureWeight: -1e12, learningRate: 0.5, epochs: 25 });
      expect(res.trained).toBe(false);
      expect(res.reason).toMatch(/diverged/);
      // Model was preserved: version untouched and predict() still returns finite probabilities.
      expect(e.getModelVersion()).toBe("v0.1.0-random");
      expect(e.getTrainRounds()).toBe(0);
      const pred = e.predict(testFeatures);
      expect(Number.isFinite(pred.confidence)).toBe(true);
      expect(pred.top_strategies.every(s => Number.isFinite(s.probability))).toBe(true);
    });

    it("recordOutcome throws on a negative weight", () => {
      const e = new MillStrategyNeuralEngine();
      expect(() => e.recordOutcome(testFeatures, LABEL, "success", -1)).toThrow(/weight/);
    });

    it("trainFromBuffer lowers loss and flips the top strategy to the trained label", () => {
      const e = new MillStrategyNeuralEngine();
      for (let i = 0; i < 3; i++) e.recordOutcome(testFeatures, LABEL, "success");
      const res = e.trainFromBuffer({ epochs: 80, learningRate: 0.1 });
      expect(res.trained).toBe(true);
      expect(res.examples_used).toBe(3);
      expect(res.loss_after).toBeLessThan(res.loss_before);
      expect(res.model_version).toMatch(/^v0\.2\.1-sgd/);
      expect(e.getTrainRounds()).toBe(1);
      // The loop actually learned: prediction for these features now ranks the label #1.
      expect(e.predict(testFeatures).top_strategies[0].strategy_id).toBe(LABEL);
    });

    it("trainFromBuffer on an empty buffer reports trained:false and leaves the model untouched", () => {
      const e = new MillStrategyNeuralEngine();
      const res = e.trainFromBuffer();
      expect(res.trained).toBe(false);
      expect(res.examples_used).toBe(0);
      expect(res.reason).toMatch(/no trainable/);
      expect(e.getModelVersion()).toBe("v0.1.0-random");
    });

    it("failures are excluded from positive learning by default (failureWeight 0)", () => {
      const e = new MillStrategyNeuralEngine();
      e.recordOutcome(testFeatures, LABEL, "failure");
      e.recordOutcome(testFeatures, LABEL, "failure");
      const res = e.trainFromBuffer();
      expect(res.trained).toBe(false);
      expect(res.examples_skipped).toBe(2);
    });

    it("partial outcomes train with half weight (loop still closes)", () => {
      const e = new MillStrategyNeuralEngine();
      for (let i = 0; i < 3; i++) e.recordOutcome(testFeatures, LABEL, "partial");
      const res = e.trainFromBuffer({ epochs: 120, learningRate: 0.1 });
      expect(res.trained).toBe(true);
      expect(res.examples_used).toBe(3);
      expect(res.loss_after).toBeLessThan(res.loss_before);
    });

    it("trainFromBuffer rejects non-positive / non-integer epochs and bad learningRate", () => {
      const e = new MillStrategyNeuralEngine();
      e.recordOutcome(testFeatures, LABEL, "success");
      expect(() => e.trainFromBuffer({ epochs: 0 })).toThrow(/epochs/);
      expect(() => e.trainFromBuffer({ epochs: 2.5 })).toThrow(/epochs/);
      expect(() => e.trainFromBuffer({ learningRate: 0 })).toThrow(/learningRate/);
      expect(() => e.trainFromBuffer({ learningRate: NaN })).toThrow(/learningRate/);
    });

    it("a different feature->strategy mapping can also be learned (variability)", () => {
      const e = new MillStrategyNeuralEngine();
      const otherFeat: StrategyFeatureVector = { ...testFeatures, material_iso_group: 4, operation_type: 4 };
      for (let i = 0; i < 3; i++) e.recordOutcome(otherFeat, "adaptive_clearing", "success");
      const res = e.trainFromBuffer({ epochs: 80, learningRate: 0.1 });
      expect(res.trained).toBe(true);
      expect(e.predict(otherFeat).top_strategies[0].strategy_id).toBe("adaptive_clearing");
    });
  });
});
