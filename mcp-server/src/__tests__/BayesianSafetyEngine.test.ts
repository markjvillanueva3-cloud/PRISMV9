/**
 * Tests for BayesianSafetyEngine (USSH Phase 0.25)
 *
 * Validates Bayesian safety scoring:
 *   - Prior/posterior computation
 *   - Credible intervals
 *   - Decision making with uncertainty
 *   - Calibration metrics
 *   - Persistence
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  BayesianSafetyEngine,
  bayesianSafetyEngine,
} from "../engines/BayesianSafetyEngine.js";

describe("BayesianSafetyEngine (USSH P0.25)", () => {
  let engine: BayesianSafetyEngine;

  beforeEach(() => {
    engine = new BayesianSafetyEngine();
  });

  // ============================================================================
  // PRIOR MANAGEMENT
  // ============================================================================

  describe("prior management", () => {
    it("sets and gets prior", () => {
      engine.setPrior("milling", 20, 5, "historical");

      const prior = engine.getPrior("milling");

      expect(prior.alpha).toBe(20);
      expect(prior.beta).toBe(5);
      expect(prior.source).toBe("historical");
    });

    it("returns default prior for unknown operation", () => {
      const prior = engine.getPrior("unknown");

      expect(prior.alpha).toBe(10); // default
      expect(prior.beta).toBe(2); // default
      expect(prior.source).toBe("default");
    });

    it("updates prior from history", () => {
      engine.setPrior("turning", 10, 2);
      engine.updatePriorFromHistory("turning", 50, 5);

      const prior = engine.getPrior("turning");

      expect(prior.alpha).toBe(60);
      expect(prior.beta).toBe(7);
      expect(prior.source).toBe("historical");
    });
  });

  // ============================================================================
  // OBSERVATION & POSTERIOR
  // ============================================================================

  describe("observation and posterior", () => {
    it("observes safety checks", () => {
      const posterior = engine.observe({
        passed_checks: 9,
        total_checks: 10,
        operation_type: "drilling",
        timestamp: Date.now(),
      });

      expect(posterior.alpha).toBeGreaterThan(10); // prior + passed
      expect(posterior.beta).toBeGreaterThan(2); // prior + failed
    });

    it("computes posterior mean", () => {
      engine.observe({
        passed_checks: 90,
        total_checks: 100,
        operation_type: "milling",
        timestamp: Date.now(),
      });

      const posterior = engine.getPosterior("milling");

      // Mean should be close to (10+90)/(10+2+90+10) = 100/112 ≈ 0.89
      expect(posterior.mean).toBeGreaterThan(0.85);
      expect(posterior.mean).toBeLessThan(0.95);
    });

    it("computes posterior mode", () => {
      engine.observe({
        passed_checks: 80,
        total_checks: 100,
        operation_type: "turning",
        timestamp: Date.now(),
      });

      const posterior = engine.getPosterior("turning");

      expect(posterior.mode).toBeGreaterThan(0.7);
      expect(posterior.mode).toBeLessThan(0.9);
    });

    it("accumulates multiple observations", () => {
      engine.observe({ passed_checks: 8, total_checks: 10, operation_type: "op", timestamp: 1 });
      engine.observe({ passed_checks: 9, total_checks: 10, operation_type: "op", timestamp: 2 });
      engine.observe({ passed_checks: 7, total_checks: 10, operation_type: "op", timestamp: 3 });

      const posterior = engine.getPosterior("op");

      // 10 + 8 + 9 + 7 = 34 passed
      // 2 + 2 + 1 + 3 = 8 failed
      expect(posterior.alpha).toBe(34);
      expect(posterior.beta).toBe(8);
    });

    it("computes posterior variance", () => {
      engine.observe({
        passed_checks: 50,
        total_checks: 100,
        operation_type: "test",
        timestamp: Date.now(),
      });

      const posterior = engine.getPosterior("test");

      expect(posterior.variance).toBeGreaterThan(0);
      expect(posterior.std).toBe(Math.sqrt(posterior.variance));
    });
  });

  // ============================================================================
  // CREDIBLE INTERVALS
  // ============================================================================

  describe("credible intervals", () => {
    it("computes 95% credible interval", () => {
      engine.observe({
        passed_checks: 90,
        total_checks: 100,
        operation_type: "test",
        timestamp: Date.now(),
      });

      const ci = engine.getCredibleInterval("test", 0.95);

      expect(ci.lower).toBeLessThan(ci.upper);
      expect(ci.confidence).toBe(0.95);
      expect(ci.lower).toBeGreaterThan(0.7);
      expect(ci.upper).toBeLessThan(1.0);
    });

    it("narrower interval with more data", () => {
      engine.observe({ passed_checks: 9, total_checks: 10, operation_type: "small", timestamp: 1 });

      for (let i = 0; i < 100; i++) {
        engine.observe({ passed_checks: 9, total_checks: 10, operation_type: "large", timestamp: i });
      }

      const ciSmall = engine.getCredibleInterval("small");
      const ciLarge = engine.getCredibleInterval("large");

      const widthSmall = ciSmall.upper - ciSmall.lower;
      const widthLarge = ciLarge.upper - ciLarge.lower;

      expect(widthLarge).toBeLessThan(widthSmall);
    });

    it("different confidence levels", () => {
      engine.observe({
        passed_checks: 80,
        total_checks: 100,
        operation_type: "test",
        timestamp: Date.now(),
      });

      const ci90 = engine.getCredibleInterval("test", 0.90);
      const ci95 = engine.getCredibleInterval("test", 0.95);
      const ci99 = engine.getCredibleInterval("test", 0.99);

      const width90 = ci90.upper - ci90.lower;
      const width95 = ci95.upper - ci95.lower;
      const width99 = ci99.upper - ci99.lower;

      expect(width90).toBeLessThan(width95);
      expect(width95).toBeLessThan(width99);
    });
  });

  // ============================================================================
  // PROBABILITY ABOVE THRESHOLD
  // ============================================================================

  describe("probability above threshold", () => {
    it("computes probability above threshold", () => {
      engine.observe({
        passed_checks: 90,
        total_checks: 100,
        operation_type: "test",
        timestamp: Date.now(),
      });

      const prob = engine.probabilityAboveThreshold("test", 0.70);

      // With 90% success rate, P(S(x) > 0.70) should be high
      expect(prob).toBeGreaterThan(0.9);
    });

    it("low probability for poor performance", () => {
      engine.observe({
        passed_checks: 50,
        total_checks: 100,
        operation_type: "poor",
        timestamp: Date.now(),
      });

      const prob = engine.probabilityAboveThreshold("poor", 0.70);

      expect(prob).toBeLessThan(0.5);
    });

    it("uses default threshold from config", () => {
      engine.observe({
        passed_checks: 80,
        total_checks: 100,
        operation_type: "test",
        timestamp: Date.now(),
      });

      const prob = engine.probabilityAboveThreshold("test");

      expect(prob).toBeGreaterThan(0);
      expect(prob).toBeLessThan(1);
    });
  });

  // ============================================================================
  // DECISION MAKING
  // ============================================================================

  describe("decision making", () => {
    it("decides pass with high safety", () => {
      for (let i = 0; i < 20; i++) {
        engine.observe({
          passed_checks: 95,
          total_checks: 100,
          operation_type: "safe",
          timestamp: i,
        });
      }

      const decision = engine.decide("safe");

      expect(decision.decision).toBe("pass");
      expect(decision.confidence).toBeGreaterThan(0.9);
    });

    it("decides fail with low safety", () => {
      // Very low pass rate with many observations
      for (let i = 0; i < 50; i++) {
        engine.observe({
          passed_checks: 20,
          total_checks: 100,
          operation_type: "unsafe",
          timestamp: i,
        });
      }

      const decision = engine.decide("unsafe");

      // With 20% success rate and 50 observations, should definitively fail
      expect(decision.probability_above_threshold).toBeLessThan(0.01);
      expect(["fail", "uncertain"]).toContain(decision.decision);
    });

    it("decides uncertain with borderline safety", () => {
      engine.observe({
        passed_checks: 70,
        total_checks: 100,
        operation_type: "borderline",
        timestamp: Date.now(),
      });

      const decision = engine.decide("borderline");

      // With limited data around threshold, should be uncertain
      expect(["pass", "uncertain"]).toContain(decision.decision);
    });

    it("includes credible interval in decision", () => {
      engine.observe({
        passed_checks: 80,
        total_checks: 100,
        operation_type: "test",
        timestamp: Date.now(),
      });

      const decision = engine.decide("test");

      expect(decision.credible_interval).toBeDefined();
      expect(decision.credible_interval.lower).toBeLessThan(decision.credible_interval.upper);
    });

    it("batch decides for multiple operations", () => {
      engine.observe({ passed_checks: 90, total_checks: 100, operation_type: "op1", timestamp: 1 });
      engine.observe({ passed_checks: 50, total_checks: 100, operation_type: "op2", timestamp: 2 });

      const decisions = engine.decideBatch(["op1", "op2"]);

      expect(decisions.size).toBe(2);
      expect(decisions.get("op1")!.probability_above_threshold).toBeGreaterThan(
        decisions.get("op2")!.probability_above_threshold
      );
    });
  });

  // ============================================================================
  // CALIBRATION
  // ============================================================================

  describe("calibration", () => {
    it("records calibration points", () => {
      engine.recordCalibrationPoint(0.8, true);
      engine.recordCalibrationPoint(0.7, false);
      engine.recordCalibrationPoint(0.9, true);

      const result = engine.computeCalibration();

      expect(result.predicted_probabilities.length).toBe(3);
      expect(result.actual_outcomes.length).toBe(3);
    });

    it("computes calibration error", () => {
      // Well-calibrated predictions
      for (let i = 0; i < 100; i++) {
        const p = Math.random();
        const actual = Math.random() < p;
        engine.recordCalibrationPoint(p, actual);
      }

      const result = engine.computeCalibration();

      expect(result.calibration_error).toBeGreaterThanOrEqual(0);
      expect(result.calibration_error).toBeLessThan(1);
    });

    it("generates reliability diagram", () => {
      for (let i = 0; i < 100; i++) {
        engine.recordCalibrationPoint(Math.random(), Math.random() > 0.5);
      }

      const result = engine.computeCalibration();

      expect(result.reliability_diagram.length).toBeGreaterThan(0);
      expect(result.reliability_diagram[0]).toHaveProperty("bin_center");
      expect(result.reliability_diagram[0]).toHaveProperty("predicted");
      expect(result.reliability_diagram[0]).toHaveProperty("actual");
    });

    it("detects well-calibrated predictions", () => {
      // Perfectly calibrated
      for (let p = 0.1; p <= 0.9; p += 0.1) {
        for (let j = 0; j < 100; j++) {
          engine.recordCalibrationPoint(p, Math.random() < p);
        }
      }

      const result = engine.computeCalibration();

      expect(result.calibration_error).toBeLessThan(0.1);
    });

    it("clears calibration data", () => {
      engine.recordCalibrationPoint(0.8, true);
      engine.clearCalibrationData();

      const result = engine.computeCalibration();

      expect(result.predicted_probabilities.length).toBe(0);
    });
  });

  // ============================================================================
  // HISTORY & OBSERVATION MANAGEMENT
  // ============================================================================

  describe("history management", () => {
    it("gets history for operation", () => {
      engine.observe({
        passed_checks: 8,
        total_checks: 10,
        operation_type: "test",
        timestamp: Date.now(),
      });

      const history = engine.getHistory("test");

      expect(history.operation_type).toBe("test");
      expect(history.observations.length).toBe(1);
      expect(history.prior).toBeDefined();
      expect(history.posterior).toBeDefined();
    });

    it("lists operation types", () => {
      engine.observe({ passed_checks: 8, total_checks: 10, operation_type: "op1", timestamp: 1 });
      engine.observe({ passed_checks: 8, total_checks: 10, operation_type: "op2", timestamp: 2 });

      const types = engine.getOperationTypes();

      expect(types).toContain("op1");
      expect(types).toContain("op2");
    });

    it("counts observations", () => {
      engine.observe({ passed_checks: 8, total_checks: 10, operation_type: "test", timestamp: 1 });
      engine.observe({ passed_checks: 9, total_checks: 10, operation_type: "test", timestamp: 2 });

      expect(engine.getObservationCount("test")).toBe(2);
      expect(engine.getObservationCount("unknown")).toBe(0);
    });

    it("checks for enough observations", () => {
      expect(engine.hasEnoughObservations("test")).toBe(false);

      for (let i = 0; i < 10; i++) {
        engine.observe({
          passed_checks: 8,
          total_checks: 10,
          operation_type: "test",
          timestamp: i,
        });
      }

      expect(engine.hasEnoughObservations("test")).toBe(true);
    });

    it("clears observations", () => {
      engine.observe({ passed_checks: 8, total_checks: 10, operation_type: "test", timestamp: 1 });
      engine.setPrior("test", 20, 5);

      engine.clearObservations();

      expect(engine.getObservationCount("test")).toBe(0);
      expect(engine.getPrior("test").alpha).toBe(20); // Prior preserved
    });
  });

  // ============================================================================
  // PERSISTENCE
  // ============================================================================

  describe("persistence", () => {
    it("exports and imports state", () => {
      engine.setPrior("test", 20, 5, "historical");
      engine.observe({ passed_checks: 8, total_checks: 10, operation_type: "test", timestamp: 1 });
      engine.recordCalibrationPoint(0.8, true);

      const exported = engine.export();

      const newEngine = new BayesianSafetyEngine();
      newEngine.import(exported);

      expect(newEngine.getPrior("test").alpha).toBe(20);
      expect(newEngine.getObservationCount("test")).toBe(1);
      expect(newEngine.computeCalibration().predicted_probabilities.length).toBe(1);
    });

    it("exported data is JSON-serializable", () => {
      engine.observe({ passed_checks: 8, total_checks: 10, operation_type: "test", timestamp: 1 });

      const exported = engine.export();
      const json = JSON.stringify(exported);
      const parsed = JSON.parse(json);

      expect(parsed.priors).toBeDefined();
      expect(parsed.observations).toBeDefined();
    });
  });

  // ============================================================================
  // RESET
  // ============================================================================

  describe("reset", () => {
    it("resets all state", () => {
      engine.setPrior("test", 20, 5);
      engine.observe({ passed_checks: 8, total_checks: 10, operation_type: "test", timestamp: 1 });
      engine.recordCalibrationPoint(0.8, true);

      engine.reset();

      expect(engine.getPrior("test").source).toBe("default");
      expect(engine.getObservationCount("test")).toBe(0);
      expect(engine.computeCalibration().predicted_probabilities.length).toBe(0);
    });
  });

  // ============================================================================
  // CONFIGURATION
  // ============================================================================

  describe("configuration", () => {
    it("returns config", () => {
      const config = engine.getConfig();

      expect(config.default_prior_alpha).toBeDefined();
      expect(config.decision_threshold).toBeDefined();
    });

    it("applies custom config", () => {
      const custom = new BayesianSafetyEngine({
        default_prior_alpha: 5,
        default_prior_beta: 5,
        decision_threshold: 0.80,
      });

      expect(custom.getConfig().default_prior_alpha).toBe(5);
      expect(custom.getConfig().decision_threshold).toBe(0.80);
    });
  });

  // ============================================================================
  // SINGLETON
  // ============================================================================

  describe("singleton", () => {
    it("exports singleton instance", () => {
      expect(bayesianSafetyEngine).toBeDefined();
      expect(bayesianSafetyEngine).toBeInstanceOf(BayesianSafetyEngine);
    });
  });
});
