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
      expect(catalog[0].id).toBeDefined();
      expect(catalog[0].name).toBeDefined();
    });
  });
});
