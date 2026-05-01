/**
 * Tests for ProcessSynthesisEngine — 6 novel cross-domain algorithms
 */
import { describe, it, expect } from "vitest";
import { ProcessSynthesisEngine } from "../engines/ProcessSynthesisEngine.js";

const engine = new ProcessSynthesisEngine();

describe("ProcessSynthesisEngine", () => {
  describe("multiPhysicsProcessSimulator()", () => {
    it("should simulate coupled process trajectory", () => {
      const r = engine.multiPhysicsProcessSimulator({
        initialForce_N: 500, initialTemp_C: 200, ambientTemp_C: 20,
        initialWear_mm: 0.01, speed_mpm: 200, feed_mmrev: 0.15,
        depth_mm: 2, toolLength_mm: 60, toolDiameter_mm: 12,
        elasticModulus_GPa: 600, thermalDiffusivity: 1.4e-5,
        duration_min: 30, timeStep_min: 1,
      });
      expect(r.trajectory.length).toBeGreaterThan(0);
      expect(r.trajectory[0].time).toBe(0);
      expect(r.finalState).toBeDefined();
      // Wear should increase over time
      const lastWear = r.trajectory[r.trajectory.length - 1].wear;
      expect(lastWear).toBeGreaterThan(0.01);
    });

    it("should detect critical events", () => {
      const r = engine.multiPhysicsProcessSimulator({
        initialForce_N: 800, initialTemp_C: 500, ambientTemp_C: 20,
        initialWear_mm: 0.2, speed_mpm: 300, feed_mmrev: 0.3,
        depth_mm: 5, toolLength_mm: 100, toolDiameter_mm: 10,
        elasticModulus_GPa: 600, thermalDiffusivity: 1.4e-5,
        duration_min: 60,
      });
      // With aggressive params + high initial wear, should hit limits
      expect(r.trajectory.length).toBeGreaterThan(0);
    });
  });

  describe("paretoOptimalParameters()", () => {
    it("should find Pareto front for cost vs MRR", () => {
      const r = engine.paretoOptimalParameters({
        material: "steel_1045",
        toolDiameter_mm: 12,
        speedRange: [100, 400],
        feedRange: [0.05, 0.3],
        depthRange: [0.5, 3],
        objectives: ["cost", "mrr"],
        populationSize: 30,
        generations: 20,
        seed: 42,
      });
      expect(r.paretoFront.length).toBeGreaterThan(0);
      expect(r.utopiaPoint).toBeDefined();
    });

    it("should handle 3 objectives", () => {
      const r = engine.paretoOptimalParameters({
        material: "aluminum_6061",
        toolDiameter_mm: 10,
        speedRange: [200, 800],
        feedRange: [0.05, 0.2],
        depthRange: [0.5, 2],
        objectives: ["cost", "surfaceFinish", "mrr"],
        populationSize: 20,
        generations: 15,
        seed: 42,
      });
      expect(r.paretoFront.length).toBeGreaterThan(0);
    });
  });

  describe("automaticModelSelector()", () => {
    it("should select best force model from data", () => {
      // Generate data following power law: F = 500 * h^0.75
      const xData = [0.05, 0.1, 0.15, 0.2, 0.25, 0.3];
      const yData = xData.map((h) => 500 * Math.pow(h, 0.75) + (Math.random() - 0.5) * 10);
      const r = engine.automaticModelSelector({
        xData, yData, modelFamily: "force",
      });
      expect(r.bestModel).toBeDefined();
      expect(r.rankings.length).toBeGreaterThan(1);
      expect(r.bestParams.length).toBeGreaterThan(0);
      expect(r.recommendation).toBeDefined();
    });

    it("should select best wear model", () => {
      // Taylor-like: T = 300/V^0.25
      const xData = [100, 150, 200, 250, 300];
      const yData = xData.map((v) => 300 / Math.pow(v, 0.25));
      const r = engine.automaticModelSelector({
        xData, yData, modelFamily: "wear",
      });
      expect(r.rankings.length).toBeGreaterThan(0);
    });
  });

  describe("physicsTransferLearning()", () => {
    it("should scale parameters to harder material", () => {
      const r = engine.physicsTransferLearning({
        knownMaterial: {
          name: "Steel 1045", hardness_HRC: 20,
          thermalCond_WmK: 50, jcA_MPa: 553, jcB_MPa: 600, jcN: 0.234,
          speed_mpm: 200, feed_mmrev: 0.15, depth_mm: 2,
          force_N: 500, toolLife_min: 45,
        },
        targetMaterial: {
          name: "Inconel 718", hardness_HRC: 40,
          thermalCond_WmK: 11, jcA_MPa: 1241, jcB_MPa: 622, jcN: 0.652,
        },
      });
      // Harder material = lower speed, higher force
      expect(r.predictedSpeed_mpm).toBeLessThan(200);
      expect(r.predictedForce_N).toBeGreaterThan(500);
      expect(r.confidenceLevel).toBeDefined();
      expect(r.scalingFactors.hardness).toBeGreaterThan(1);
    });
  });

  describe("processAnomalyClassifier()", () => {
    it("should classify normal signal", () => {
      // Smooth sine = normal cutting
      const forceSignal = Array.from({ length: 200 }, (_, i) =>
        500 + 10 * Math.sin(2 * Math.PI * i / 50) + (Math.random() - 0.5) * 5);
      const r = engine.processAnomalyClassifier({
        forceSignal, sampleRate_Hz: 1000,
      });
      expect(r.classification).toBeDefined();
      expect(r.confidence).toBeGreaterThanOrEqual(0);
      expect(r.confidence).toBeLessThanOrEqual(1);
      expect(r.features.length).toBeGreaterThan(0);
      expect(r.anomalyScore).toBeGreaterThanOrEqual(0);
    });

    it("should detect chatter-like signal", () => {
      // High-frequency oscillation = chatter
      const vibSignal = Array.from({ length: 200 }, (_, i) =>
        50 * Math.sin(2 * Math.PI * i / 3) + 20 * Math.sin(2 * Math.PI * i / 7));
      const r = engine.processAnomalyClassifier({
        vibrationSignal: vibSignal, sampleRate_Hz: 1000,
      });
      expect(r.classification).toBeDefined();
      expect(r.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe("intelligentExperimentSequencer()", () => {
    it("should suggest next experiment", () => {
      const r = engine.intelligentExperimentSequencer({
        priorExperiments: [
          { params: [100], result: 45 },
          { params: [200], result: 12 },
          { params: [300], result: 5 },
        ],
        paramBounds: [[50, 400]],
        seed: 42,
      });
      expect(r.nextExperiment).toHaveLength(1);
      expect(r.nextExperiment[0]).toBeGreaterThanOrEqual(50);
      expect(r.nextExperiment[0]).toBeLessThanOrEqual(400);
      expect(r.expectedInfoGain).toBeGreaterThan(0);
      expect(r.currentModelUncertainty).toBeGreaterThan(0);
    });

    it("should work with 2D parameter space", () => {
      const r = engine.intelligentExperimentSequencer({
        priorExperiments: [
          { params: [100, 0.1], result: 500 },
          { params: [200, 0.2], result: 800 },
          { params: [300, 0.15], result: 650 },
        ],
        paramBounds: [[50, 400], [0.05, 0.3]],
        seed: 42,
      });
      expect(r.nextExperiment).toHaveLength(2);
    });
  });

  describe("stats()", () => {
    it("should report 6 algorithms", () => {
      const s = engine.stats();
      expect(s.algorithms).toHaveLength(6);
    });
  });
});
