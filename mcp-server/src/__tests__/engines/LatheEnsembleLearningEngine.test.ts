/**
 * LatheEnsembleLearningEngine Tests
 * ==================================
 * Comprehensive tests for ensemble learning methods for lathe parameter prediction.
 *
 * @module __tests__/engines/LatheEnsembleLearningEngine.test
 */

import { describe, it, expect, beforeAll } from "vitest";
import {
  LatheEnsembleLearningEngine,
  latheEnsembleLearningEngine,
  type LatheTrainingPoint,
  type RandomForestModel,
  type GradientBoostingModel,
  type XGBoostModel,
} from "../../engines/LatheEnsembleLearningEngine.js";

describe("LatheEnsembleLearningEngine", () => {
  let engine: LatheEnsembleLearningEngine;
  let syntheticData: LatheTrainingPoint[];

  beforeAll(() => {
    engine = new LatheEnsembleLearningEngine();
    // Generate synthetic training data
    syntheticData = engine.generateSyntheticData(200, 42);
  });

  // ========================================================================
  // Feature Encoding Tests
  // ========================================================================

  describe("Feature Encoding", () => {
    it("should encode lathe training point to numeric vector", () => {
      const point: LatheTrainingPoint = {
        material_iso: "P",
        hardness_hrc: 30,
        diameter_mm: 50,
        length_mm: 100,
        operation: "roughing",
        tool_nose_radius_mm: 0.8,
        tool_lead_angle_deg: 95,
        machine_power_kw: 20,
        rigidity_factor: 0.8,
      };

      const encoded = engine.encodeFeatures(point);

      expect(encoded.vector).toBeInstanceOf(Array);
      expect(encoded.dimension).toBe(14);
      expect(encoded.featureNames).toHaveLength(14);
      expect(encoded.vector.every(v => v >= 0 && v <= 1.5)).toBe(true);
    });

    it("should encode dataset correctly", () => {
      const data = syntheticData.slice(0, 10);
      const { X, featureNames } = engine.encodeDataset(data);

      expect(X).toHaveLength(10);
      expect(X[0]).toHaveLength(14);
      expect(featureNames).toHaveLength(14);
    });

    it("should handle different ISO groups", () => {
      const isoGroups: Array<"P" | "M" | "K" | "N" | "S" | "H"> = ["P", "M", "K", "N", "S", "H"];

      for (const iso of isoGroups) {
        const point: LatheTrainingPoint = {
          material_iso: iso,
          hardness_hrc: 30,
          diameter_mm: 50,
          length_mm: 100,
          operation: "finishing",
          tool_nose_radius_mm: 0.8,
          tool_lead_angle_deg: 95,
          machine_power_kw: 20,
          rigidity_factor: 0.8,
        };

        const encoded = engine.encodeFeatures(point);
        expect(encoded.vector[0]).toBe(isoGroups.indexOf(iso) / 5);
      }
    });
  });

  // ========================================================================
  // Random Forest Tests
  // ========================================================================

  describe("Random Forest (Bagging)", () => {
    it("should train random forest for regression", () => {
      const result = engine.trainRandomForest(
        syntheticData.slice(0, 100),
        20,
        "cutting_speed",
        { maxDepth: 5, seed: 42 }
      );

      expect(result.model).toBeDefined();
      const model = result.model as RandomForestModel;
      expect(model.trees).toHaveLength(20);
      expect(model.mode).toBe("regression");
      expect(model.featureImportance).toHaveLength(14);
      expect(result.trainingTime_ms).toBeGreaterThan(0);
    });

    it("should train random forest for classification", () => {
      const result = engine.trainRandomForest(
        syntheticData.slice(0, 100),
        30,
        "quality",
        { maxDepth: 6, seed: 42 }
      );

      const model = result.model as RandomForestModel;
      expect(model.mode).toBe("classification");
      expect(model.oobError).toBeLessThan(1);
      expect(model.oobError).toBeGreaterThanOrEqual(0);
    });

    it("should compute OOB error", () => {
      const result = engine.trainRandomForest(
        syntheticData.slice(0, 100),
        50,
        "surface_finish",
        { seed: 42 }
      );

      const model = result.model as RandomForestModel;
      expect(model.oobError).toBeDefined();
      expect(typeof model.oobError).toBe("number");
    });

    it("should compute feature importance", () => {
      const result = engine.trainRandomForest(
        syntheticData.slice(0, 100),
        30,
        "tool_life",
        { seed: 42 }
      );

      const model = result.model as RandomForestModel;
      const sumImportance = model.featureImportance.reduce((a, b) => a + b, 0);
      expect(sumImportance).toBeCloseTo(1, 1);
    });
  });

  // ========================================================================
  // Gradient Boosting Tests
  // ========================================================================

  describe("Gradient Boosting", () => {
    it("should train gradient boosting model", () => {
      const result = engine.trainGradientBoosting(
        syntheticData.slice(0, 100),
        50,
        "cutting_speed",
        { learningRate: 0.1, maxDepth: 3, seed: 42 }
      );

      const model = result.model as GradientBoostingModel;
      expect(model.trees).toHaveLength(50);
      expect(model.learningRate).toBe(0.1);
      expect(model.residualHistory).toHaveLength(50);
    });

    it("should reduce residuals over iterations", () => {
      const result = engine.trainGradientBoosting(
        syntheticData.slice(0, 100),
        100,
        "surface_finish",
        { learningRate: 0.1, seed: 42 }
      );

      const model = result.model as GradientBoostingModel;
      const firstResidual = model.residualHistory[0];
      const lastResidual = model.residualHistory[model.residualHistory.length - 1];

      expect(lastResidual).toBeLessThan(firstResidual);
    });

    it("should support stochastic gradient boosting", () => {
      const result = engine.trainGradientBoosting(
        syntheticData.slice(0, 100),
        50,
        "cycle_time",
        { subsampleRatio: 0.8, seed: 42 }
      );

      expect(result.trainingError).toBeGreaterThan(0);
    });
  });

  // ========================================================================
  // AdaBoost Tests
  // ========================================================================

  describe("AdaBoost", () => {
    it("should train AdaBoost classifier", () => {
      const result = engine.trainAdaBoost(
        syntheticData.slice(0, 100),
        30,
        { seed: 42 }
      );

      const model = result.model as any;
      expect(model.stumps).toHaveLength(30);
      expect(model.alphas).toHaveLength(30);
      expect(model.classes.length).toBeGreaterThan(0);
    });

    it("should compute sample weights and alphas", () => {
      const result = engine.trainAdaBoost(
        syntheticData.slice(0, 100),
        20,
        { seed: 42 }
      );

      const model = result.model as any;
      expect(model.alphas.every((a: number) => typeof a === "number")).toBe(true);
      expect(model.trainingError).toHaveLength(20);
    });
  });

  // ========================================================================
  // XGBoost Tests
  // ========================================================================

  describe("XGBoost", () => {
    it("should train XGBoost with regularization", () => {
      const result = engine.trainXGBoost(
        syntheticData.slice(0, 100),
        50,
        "cutting_speed",
        { lambda: 1.0, gamma: 0.1, seed: 42 }
      );

      const model = result.model as XGBoostModel;
      expect(model.trees).toHaveLength(50);
      expect(model.lambda).toBe(1.0);
      expect(model.gamma).toBe(0.1);
    });

    it("should reduce training loss over rounds", () => {
      const result = engine.trainXGBoost(
        syntheticData.slice(0, 100),
        100,
        "feed",
        { learningRate: 0.3, seed: 42 }
      );

      const model = result.model as XGBoostModel;
      const firstLoss = model.trainingLoss[0];
      const lastLoss = model.trainingLoss[model.trainingLoss.length - 1];

      expect(lastLoss).toBeLessThan(firstLoss);
    });

    it("should support column subsampling", () => {
      const result = engine.trainXGBoost(
        syntheticData.slice(0, 100),
        30,
        "depth_of_cut",
        { colsampleRatio: 0.7, seed: 42 }
      );

      expect(result.featureImportance).toHaveLength(14);
    });
  });

  // ========================================================================
  // Stacking Tests
  // ========================================================================

  describe("Stacking", () => {
    it("should create stacked ensemble", () => {
      // Train base models
      const rf = engine.trainRandomForest(syntheticData.slice(0, 80), 20, "cutting_speed", { seed: 42 });
      const gb = engine.trainGradientBoosting(syntheticData.slice(0, 80), 30, "cutting_speed", { seed: 42 });
      const xgb = engine.trainXGBoost(syntheticData.slice(0, 80), 30, "cutting_speed", { seed: 42 });

      const stackedModel = engine.createStackedEnsemble(
        [rf.model as RandomForestModel, gb.model as GradientBoostingModel, xgb.model as XGBoostModel],
        syntheticData.slice(0, 80),
        "cutting_speed",
        { cvFolds: 3, seed: 42 }
      );

      expect(stackedModel.baseLearners).toHaveLength(3);
      expect(stackedModel.metaLearner).toBeDefined();
      expect(stackedModel.cvFolds).toBe(3);
    });

    it("should have blending weights", () => {
      const rf = engine.trainRandomForest(syntheticData.slice(0, 80), 15, "surface_finish", { seed: 42 });
      const gb = engine.trainGradientBoosting(syntheticData.slice(0, 80), 25, "surface_finish", { seed: 42 });

      const stackedModel = engine.createStackedEnsemble(
        [rf.model as RandomForestModel, gb.model as GradientBoostingModel],
        syntheticData.slice(0, 80),
        "surface_finish",
        { cvFolds: 5, seed: 42 }
      );

      expect(stackedModel.blendingWeights).toBeDefined();
      expect(stackedModel.blendingWeights!.length).toBe(2);
    });
  });

  // ========================================================================
  // Voting Tests
  // ========================================================================

  describe("Voting", () => {
    let rfModel: RandomForestModel;
    let gbModel: GradientBoostingModel;
    let xgbModel: XGBoostModel;

    beforeAll(() => {
      const rf = engine.trainRandomForest(syntheticData.slice(0, 80), 20, "cutting_speed", { seed: 42 });
      const gb = engine.trainGradientBoosting(syntheticData.slice(0, 80), 30, "cutting_speed", { seed: 42 });
      const xgb = engine.trainXGBoost(syntheticData.slice(0, 80), 30, "cutting_speed", { seed: 42 });

      rfModel = rf.model as RandomForestModel;
      gbModel = gb.model as GradientBoostingModel;
      xgbModel = xgb.model as XGBoostModel;
    });

    it("should predict with hard voting", () => {
      const result = engine.predictWithVoting(
        [rfModel, gbModel, xgbModel],
        syntheticData[90],
        "hard"
      );

      expect(result.prediction).toBeGreaterThan(0);
      expect(result.modelPredictions).toHaveLength(3);
      expect(result.consensusLevel).toBeGreaterThanOrEqual(0);
      expect(result.consensusLevel).toBeLessThanOrEqual(1);
    });

    it("should predict with soft voting", () => {
      const result = engine.predictWithVoting(
        [rfModel, gbModel, xgbModel],
        syntheticData[91],
        "soft"
      );

      expect(result.prediction).toBeGreaterThan(0);
      expect(result.uncertainty).toBeGreaterThanOrEqual(0);
    });

    it("should predict with weighted voting", () => {
      const weights = [0.5, 0.3, 0.2];
      const result = engine.predictWithVoting(
        [rfModel, gbModel, xgbModel],
        syntheticData[92],
        "weighted",
        weights
      );

      expect(result.modelWeights).toEqual(weights);
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it("should adjust voting weights dynamically", () => {
      const currentWeights = [0.33, 0.33, 0.34];
      const recentErrors = [
        [0.1, 0.2, 0.15],   // Model 0 errors
        [0.3, 0.4, 0.35],   // Model 1 errors
        [0.2, 0.25, 0.22],  // Model 2 errors
      ];

      const newWeights = engine.adjustVotingWeights(currentWeights, recentErrors, 0.1);

      expect(newWeights).toHaveLength(3);
      const sum = newWeights.reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1, 5);
      // Model 0 has lowest error, should have highest weight
      expect(newWeights[0]).toBeGreaterThan(newWeights[1]);
    });
  });

  // ========================================================================
  // Diversity Metrics Tests
  // ========================================================================

  describe("Diversity Metrics", () => {
    it("should measure model diversity", () => {
      const rf = engine.trainRandomForest(syntheticData.slice(0, 80), 20, "cutting_speed", { seed: 42 });
      const gb = engine.trainGradientBoosting(syntheticData.slice(0, 80), 30, "cutting_speed", { seed: 43 });
      const xgb = engine.trainXGBoost(syntheticData.slice(0, 80), 30, "cutting_speed", { seed: 44 });

      const diversity = engine.measureDiversity(
        [rf.model as RandomForestModel, gb.model as GradientBoostingModel, xgb.model as XGBoostModel],
        syntheticData.slice(80, 100),
        "cutting_speed"
      );

      expect(diversity.qStatistic).toBeDefined();
      expect(diversity.correlation).toBeDefined();
      expect(diversity.disagreement).toBeGreaterThanOrEqual(0);
      expect(diversity.doubleFault).toBeGreaterThanOrEqual(0);
      expect(diversity.entropyMeasure).toBeGreaterThanOrEqual(0);
      expect(diversity.kohavi_wolpert).toBeGreaterThanOrEqual(0);
    });

    it("should have bounded diversity metrics", () => {
      const rf1 = engine.trainRandomForest(syntheticData.slice(0, 80), 15, "surface_finish", { seed: 42 });
      const rf2 = engine.trainRandomForest(syntheticData.slice(0, 80), 15, "surface_finish", { seed: 100 });

      const diversity = engine.measureDiversity(
        [rf1.model as RandomForestModel, rf2.model as RandomForestModel],
        syntheticData.slice(80, 100),
        "surface_finish"
      );

      expect(diversity.qStatistic).toBeGreaterThanOrEqual(-1);
      expect(diversity.qStatistic).toBeLessThanOrEqual(1);
      expect(diversity.correlation).toBeGreaterThanOrEqual(-1);
      expect(diversity.correlation).toBeLessThanOrEqual(1);
    });
  });

  // ========================================================================
  // Ensemble Pruning Tests
  // ========================================================================

  describe("Ensemble Pruning", () => {
    it("should prune ensemble to target size", () => {
      const models = [];
      for (let i = 0; i < 5; i++) {
        const rf = engine.trainRandomForest(syntheticData.slice(0, 80), 10, "cutting_speed", { seed: 42 + i });
        models.push(rf.model as RandomForestModel);
      }

      const selected = engine.pruneEnsemble(
        models,
        syntheticData.slice(80, 100),
        "cutting_speed",
        3
      );

      expect(selected).toHaveLength(3);
      expect(new Set(selected).size).toBe(3);  // All unique
    });

    it("should select diverse high-performing models", () => {
      const models = [];
      for (let i = 0; i < 6; i++) {
        const rf = engine.trainRandomForest(syntheticData.slice(0, 80), 15, "tool_life", { seed: i * 10 });
        models.push(rf.model as RandomForestModel);
      }

      const selected = engine.pruneEnsemble(
        models,
        syntheticData.slice(80, 100),
        "tool_life",
        4
      );

      expect(selected).toHaveLength(4);
      expect(selected.every(idx => idx >= 0 && idx < 6)).toBe(true);
    });
  });

  // ========================================================================
  // Manufacturing Ensemble Tests
  // ========================================================================

  describe("Surface Finish Ensemble", () => {
    it("should create surface finish ensemble", () => {
      const ensemble = engine.createSurfaceFinishEnsemble(syntheticData.slice(0, 100), { seed: 42 });

      expect(ensemble.rfModel).toBeDefined();
      expect(ensemble.gbModel).toBeDefined();
      expect(ensemble.xgbModel).toBeDefined();
      expect(ensemble.physicsWeight).toBeGreaterThan(0);
      expect(ensemble.physicsWeight).toBeLessThan(1);
    });

    it("should predict surface finish", () => {
      const ensemble = engine.createSurfaceFinishEnsemble(syntheticData.slice(0, 100), { seed: 42 });

      const result = engine.predictSurfaceFinish(ensemble, {
        material_iso: "P",
        hardness_hrc: 30,
        diameter_mm: 50,
        length_mm: 100,
        operation: "finishing",
        tool_nose_radius_mm: 0.8,
        tool_lead_angle_deg: 95,
        machine_power_kw: 20,
        rigidity_factor: 0.8,
        feed_mm_rev: 0.15,
      });

      expect(result.Ra).toBeGreaterThan(0);
      expect(result.Ra).toBeLessThan(25);
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.source).toBe("ensemble_physics_blend");
    });
  });

  describe("Tool Life Ensemble", () => {
    it("should create tool life ensemble", () => {
      const ensemble = engine.createToolLifeEnsemble(syntheticData.slice(0, 100), { seed: 42 });

      expect(ensemble.rfModel).toBeDefined();
      expect(ensemble.gbModel).toBeDefined();
      expect(ensemble.physicsAdjustment).toBeGreaterThan(0);
    });

    it("should predict tool life with factors", () => {
      const ensemble = engine.createToolLifeEnsemble(syntheticData.slice(0, 100), { seed: 42 });

      const result = engine.predictToolLife(ensemble, {
        material_iso: "M",
        hardness_hrc: 50,
        diameter_mm: 40,
        length_mm: 80,
        operation: "roughing",
        tool_nose_radius_mm: 0.8,
        tool_lead_angle_deg: 95,
        machine_power_kw: 20,
        rigidity_factor: 0.4,
        cutting_speed_m_min: 180,
      });

      expect(result.toolLife_min).toBeGreaterThan(0);
      expect(result.toolLife_min).toBeLessThanOrEqual(300);
      expect(result.factors).toBeInstanceOf(Array);
    });
  });

  describe("Cycle Time Ensemble", () => {
    it("should create cycle time ensemble", () => {
      const ensemble = engine.createCycleTimeEnsemble(syntheticData.slice(0, 100), { seed: 42 });

      expect(ensemble.rfModel).toBeDefined();
      expect(ensemble.xgbModel).toBeDefined();
    });

    it("should predict cycle time with breakdown", () => {
      const ensemble = engine.createCycleTimeEnsemble(syntheticData.slice(0, 100), { seed: 42 });

      const result = engine.predictCycleTime(ensemble, {
        material_iso: "P",
        hardness_hrc: 28,
        diameter_mm: 60,
        length_mm: 120,
        operation: "roughing",
        tool_nose_radius_mm: 0.8,
        tool_lead_angle_deg: 95,
        machine_power_kw: 25,
        rigidity_factor: 0.7,
        cutting_speed_m_min: 200,
        feed_mm_rev: 0.25,
      });

      expect(result.cycleTime_sec).toBeGreaterThan(0);
      expect(result.breakdown).toHaveProperty("cutting");
      expect(result.breakdown).toHaveProperty("rapid");
      expect(result.breakdown).toHaveProperty("tool_change");
    });
  });

  describe("Quality Classification Ensemble", () => {
    it("should create quality ensemble", () => {
      const ensemble = engine.createQualityEnsemble(syntheticData.slice(0, 100), { seed: 42 });

      expect(ensemble.rfModel).toBeDefined();
      expect(ensemble.adaModel).toBeDefined();
    });

    it("should predict quality class with risks", () => {
      const ensemble = engine.createQualityEnsemble(syntheticData.slice(0, 100), { seed: 42 });

      const result = engine.predictQuality(ensemble, {
        material_iso: "S",
        hardness_hrc: 55,
        diameter_mm: 30,
        length_mm: 200,
        operation: "finishing",
        tool_nose_radius_mm: 0.4,
        tool_lead_angle_deg: 95,
        machine_power_kw: 15,
        rigidity_factor: 0.3,
      });

      expect(result.qualityClass).toBeGreaterThanOrEqual(0);
      expect(result.qualityClass).toBeLessThanOrEqual(3);
      expect(["reject", "acceptable", "good", "excellent"]).toContain(result.className);
      expect(result.risks).toBeInstanceOf(Array);
    });
  });

  describe("Comprehensive Manufacturing Prediction", () => {
    it("should predict all manufacturing metrics", () => {
      const surfaceEnsemble = engine.createSurfaceFinishEnsemble(syntheticData.slice(0, 100), { seed: 42 });
      const toolLifeEnsemble = engine.createToolLifeEnsemble(syntheticData.slice(0, 100), { seed: 42 });
      const cycleTimeEnsemble = engine.createCycleTimeEnsemble(syntheticData.slice(0, 100), { seed: 42 });
      const qualityEnsemble = engine.createQualityEnsemble(syntheticData.slice(0, 100), { seed: 42 });

      const result = engine.predictAllManufacturingMetrics(
        surfaceEnsemble,
        toolLifeEnsemble,
        cycleTimeEnsemble,
        qualityEnsemble,
        {
          material_iso: "P",
          hardness_hrc: 32,
          diameter_mm: 50,
          length_mm: 100,
          operation: "finishing",
          tool_nose_radius_mm: 0.8,
          tool_lead_angle_deg: 95,
          machine_power_kw: 20,
          rigidity_factor: 0.75,
          cutting_speed_m_min: 220,
          feed_mm_rev: 0.12,
        }
      );

      expect(result.surfaceFinish_Ra).toBeGreaterThan(0);
      expect(result.toolLife_min).toBeGreaterThan(0);
      expect(result.cycleTime_sec).toBeGreaterThan(0);
      expect(result.qualityClass).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.recommendations).toBeInstanceOf(Array);
    });
  });

  // ========================================================================
  // Cross-Validation Tests
  // ========================================================================

  describe("Cross-Validation", () => {
    it("should perform k-fold cross-validation for random forest", () => {
      const result = engine.crossValidate(
        syntheticData.slice(0, 100),
        "cutting_speed",
        "rf",
        5,
        42
      );

      expect(result.foldErrors).toHaveLength(5);
      expect(result.meanError).toBeGreaterThan(0);
      expect(result.stdError).toBeGreaterThanOrEqual(0);
    });

    it("should perform cross-validation for gradient boosting", () => {
      const result = engine.crossValidate(
        syntheticData.slice(0, 100),
        "surface_finish",
        "gb",
        3,
        42
      );

      expect(result.foldErrors).toHaveLength(3);
    });

    it("should perform cross-validation for XGBoost", () => {
      const result = engine.crossValidate(
        syntheticData.slice(0, 100),
        "tool_life",
        "xgb",
        4,
        42
      );

      expect(result.foldErrors).toHaveLength(4);
    });
  });

  // ========================================================================
  // Synthetic Data Generation Tests
  // ========================================================================

  describe("Synthetic Data Generation", () => {
    it("should generate valid training data", () => {
      const data = engine.generateSyntheticData(50, 123);

      expect(data).toHaveLength(50);
      expect(data[0].material_iso).toBeDefined();
      expect(data[0].hardness_hrc).toBeGreaterThan(0);
      expect(data[0].diameter_mm).toBeGreaterThan(0);
      expect(data[0].cutting_speed_m_min).toBeGreaterThan(0);
    });

    it("should be deterministic with seed", () => {
      const data1 = engine.generateSyntheticData(20, 42);
      const data2 = engine.generateSyntheticData(20, 42);

      expect(data1[0].hardness_hrc).toBe(data2[0].hardness_hrc);
      expect(data1[5].diameter_mm).toBe(data2[5].diameter_mm);
    });

    it("should generate realistic ranges", () => {
      const data = engine.generateSyntheticData(100, 42);

      for (const point of data) {
        expect(point.hardness_hrc).toBeGreaterThanOrEqual(20);
        expect(point.hardness_hrc).toBeLessThanOrEqual(60);
        expect(point.diameter_mm).toBeGreaterThanOrEqual(20);
        expect(point.diameter_mm).toBeLessThanOrEqual(200);
        expect(point.surface_finish_ra).toBeGreaterThan(0);
        expect(point.tool_life_min).toBeGreaterThan(0);
        expect(point.quality_class).toBeGreaterThanOrEqual(0);
        expect(point.quality_class).toBeLessThanOrEqual(3);
      }
    });
  });

  // ========================================================================
  // Singleton Export Tests
  // ========================================================================

  describe("Singleton Export", () => {
    it("should export singleton instance", () => {
      expect(latheEnsembleLearningEngine).toBeInstanceOf(LatheEnsembleLearningEngine);
    });

    it("should track statistics", () => {
      const stats = engine.getStats();

      expect(stats.totalCalculations).toBeGreaterThan(0);
      expect(typeof stats.registeredModels).toBe("number");
    });
  });
});
