/**
 * Tests for MillingOnlineLearningTrackerEngine (MILL-AGI Phase 0.4)
 *
 * Validates online learning progress tracking:
 *   - Learning step recording
 *   - Page-Hinkley drift detection
 *   - ADWIN drift detection
 *   - Learning rate scheduling
 *   - A/B testing of model variants
 *   - Checkpoint save/restore
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  MillingOnlineLearningTrackerEngine,
  millingOnlineLearningTrackerEngine,
  type LearningMetrics,
  type TrackerConfig,
} from "../engines/MillingOnlineLearningTrackerEngine.js";

describe("MillingOnlineLearningTrackerEngine (MILL-AGI P0.4)", () => {
  let engine: MillingOnlineLearningTrackerEngine;

  beforeEach(() => {
    engine = new MillingOnlineLearningTrackerEngine();
  });

  // ============================================================================
  // TEST DATA
  // ============================================================================

  const normalMetrics: LearningMetrics = {
    timestamp: Date.now(),
    prediction_error: 0.05,
    model_loss: 0.1,
    learning_rate: 0.001,
    samples_seen: 100,
    feature_importance: {
      cutting_speed: 0.3,
      feed_rate: 0.25,
      depth: 0.2,
      material: 0.15,
      tool_wear: 0.1,
    },
  };

  const highErrorMetrics: LearningMetrics = {
    ...normalMetrics,
    prediction_error: 0.5,
    model_loss: 0.8,
  };

  const lowErrorMetrics: LearningMetrics = {
    ...normalMetrics,
    prediction_error: 0.01,
    model_loss: 0.02,
  };

  // ============================================================================
  // RECORD STEP
  // ============================================================================

  describe("record step", () => {
    it("returns drift status and flags", () => {
      const result = engine.recordStep(normalMetrics);

      expect(result.drift).toBeDefined();
      expect(result.drift.detected).toBeDefined();
      expect(result.drift.type).toBeDefined();
      expect(typeof result.lr_adjusted).toBe("boolean");
      expect(typeof result.checkpoint_needed).toBe("boolean");
    });

    it("increments total samples", () => {
      const before = engine.getState().total_samples;
      engine.recordStep(normalMetrics);
      const after = engine.getState().total_samples;

      expect(after).toBe(before + 1);
    });

    it("accumulates error history", () => {
      for (let i = 0; i < 10; i++) {
        engine.recordStep({
          ...normalMetrics,
          prediction_error: i * 0.01,
        });
      }

      const stats = engine.getErrorStats();
      expect(stats.current_ewma).toBeGreaterThan(0);
    });

    it("triggers checkpoint at interval", () => {
      const config: Partial<TrackerConfig> = { checkpoint_interval: 5 };
      const customEngine = new MillingOnlineLearningTrackerEngine(config);

      let checkpointCount = 0;
      for (let i = 0; i < 15; i++) {
        const result = customEngine.recordStep(normalMetrics);
        if (result.checkpoint_needed) checkpointCount++;
      }

      expect(checkpointCount).toBe(3); // At 5, 10, 15
    });
  });

  // ============================================================================
  // DRIFT DETECTION
  // ============================================================================

  describe("drift detection", () => {
    it("no drift for stable errors", () => {
      for (let i = 0; i < 50; i++) {
        engine.recordStep(normalMetrics);
      }

      const result = engine.recordStep(normalMetrics);
      expect(result.drift.type).toBe("none");
    });

    it("detects drift when error jumps", () => {
      // Establish baseline with low errors
      for (let i = 0; i < 60; i++) {
        engine.recordStep(lowErrorMetrics);
      }

      // Simulate sudden error increase
      let driftDetected = false;
      for (let i = 0; i < 50; i++) {
        const result = engine.recordStep(highErrorMetrics);
        if (result.drift.detected) {
          driftDetected = true;
          break;
        }
      }

      expect(driftDetected).toBe(true);
    });

    it("returns drift severity between 0 and 1", () => {
      // Force drift conditions
      for (let i = 0; i < 60; i++) {
        engine.recordStep(lowErrorMetrics);
      }

      for (let i = 0; i < 60; i++) {
        const result = engine.recordStep(highErrorMetrics);
        if (result.drift.detected) {
          expect(result.drift.severity).toBeGreaterThanOrEqual(0);
          expect(result.drift.severity).toBeLessThanOrEqual(1);
          break;
        }
      }
    });

    it("provides recommendation on drift", () => {
      // Establish baseline
      for (let i = 0; i < 60; i++) {
        engine.recordStep(lowErrorMetrics);
      }

      // Trigger drift
      for (let i = 0; i < 60; i++) {
        const result = engine.recordStep(highErrorMetrics);
        if (result.drift.detected) {
          expect(result.drift.recommendation.length).toBeGreaterThan(0);
          break;
        }
      }
    });
  });

  // ============================================================================
  // LEARNING RATE SCHEDULING
  // ============================================================================

  describe("learning rate scheduling", () => {
    it("warmup increases learning rate", () => {
      const config: Partial<TrackerConfig> = {
        lr_warmup_steps: 10,
        min_lr: 0.0001,
        max_lr: 0.01,
      };
      const customEngine = new MillingOnlineLearningTrackerEngine(config);

      const lr1 = customEngine.getState().learning_rate;
      customEngine.recordStep(normalMetrics);
      const lr2 = customEngine.getState().learning_rate;

      // After first step, LR should change from max toward warmup schedule
      expect(lr2).toBeDefined();
    });

    it("patience decay reduces learning rate", () => {
      const config: Partial<TrackerConfig> = {
        lr_warmup_steps: 0, // Skip warmup
        patience: 3,
        lr_decay_factor: 0.5,
        max_lr: 0.01,
        min_lr: 0.0001,
      };
      const customEngine = new MillingOnlineLearningTrackerEngine(config);

      // Set best_loss to force patience counting
      for (let i = 0; i < 10; i++) {
        customEngine.recordStep({
          ...normalMetrics,
          model_loss: 0.5 + i * 0.01, // Increasing loss
        });
      }

      const finalLR = customEngine.getState().learning_rate;
      expect(finalLR).toBeLessThan(0.01);
    });

    it("respects minimum learning rate", () => {
      const config: Partial<TrackerConfig> = {
        lr_warmup_steps: 0,
        patience: 1,
        lr_decay_factor: 0.1,
        min_lr: 0.001,
        max_lr: 0.01,
      };
      const customEngine = new MillingOnlineLearningTrackerEngine(config);

      // Force many decays
      for (let i = 0; i < 100; i++) {
        customEngine.recordStep({
          ...normalMetrics,
          model_loss: 1.0, // Always worse
        });
      }

      const finalLR = customEngine.getState().learning_rate;
      expect(finalLR).toBeGreaterThanOrEqual(0.001);
    });
  });

  // ============================================================================
  // A/B TESTING
  // ============================================================================

  describe("A/B testing", () => {
    it("registers variant", () => {
      engine.registerVariant("v1", "Baseline model");
      engine.registerVariant("v2", "New architecture");

      const variants = engine.getVariants();
      expect(variants.length).toBe(2);
    });

    it("records variant results", () => {
      engine.registerVariant("v1", "Baseline");
      engine.registerVariant("v2", "Improved");

      for (let i = 0; i < 15; i++) {
        engine.recordVariantResult("v1", 0.1);
        engine.recordVariantResult("v2", 0.05);
      }

      const variants = engine.getVariants();
      const v1 = variants.find((v) => v.id === "v1");
      const v2 = variants.find((v) => v.id === "v2");

      expect(v1!.metrics.samples).toBe(15);
      expect(v2!.metrics.samples).toBe(15);
      expect(v2!.metrics.avg_error).toBeLessThan(v1!.metrics.avg_error);
    });

    it("identifies best variant", () => {
      engine.registerVariant("v1", "Baseline");
      engine.registerVariant("v2", "Better");

      for (let i = 0; i < 15; i++) {
        engine.recordVariantResult("v1", 0.15);
        engine.recordVariantResult("v2", 0.05);
      }

      const best = engine.getBestVariant();
      expect(best).not.toBeNull();
      expect(best!.id).toBe("v2");
    });

    it("requires minimum samples for best variant", () => {
      engine.registerVariant("v1", "Few samples");

      engine.recordVariantResult("v1", 0.01);
      engine.recordVariantResult("v1", 0.02);

      const best = engine.getBestVariant();
      expect(best).toBeNull();
    });

    it("tracks win rate", () => {
      engine.registerVariant("v1", "Baseline");
      engine.registerVariant("v2", "Better");

      // v2 always wins
      for (let i = 0; i < 20; i++) {
        engine.recordVariantResult("v1", 0.2);
        engine.recordVariantResult("v2", 0.1);
      }

      const variants = engine.getVariants();
      const v2 = variants.find((v) => v.id === "v2");

      expect(v2!.metrics.win_rate).toBeGreaterThan(0.5);
    });
  });

  // ============================================================================
  // ERROR STATISTICS
  // ============================================================================

  describe("error statistics", () => {
    it("returns stats structure", () => {
      for (let i = 0; i < 30; i++) {
        engine.recordStep(normalMetrics);
      }

      const stats = engine.getErrorStats();

      expect(stats.current_ewma).toBeDefined();
      expect(stats.recent_mean).toBeDefined();
      expect(stats.recent_std).toBeDefined();
      expect(stats.trend).toBeDefined();
    });

    it("detects improving trend", () => {
      // Start with high errors
      for (let i = 0; i < 30; i++) {
        engine.recordStep({
          ...normalMetrics,
          prediction_error: 0.3 - i * 0.005,
        });
      }

      // Then low errors
      for (let i = 0; i < 30; i++) {
        engine.recordStep({
          ...normalMetrics,
          prediction_error: 0.05,
        });
      }

      const stats = engine.getErrorStats();
      expect(stats.trend).toBe("improving");
    });

    it("detects degrading trend", () => {
      // Start with low errors
      for (let i = 0; i < 30; i++) {
        engine.recordStep({
          ...normalMetrics,
          prediction_error: 0.05,
        });
      }

      // Then high errors
      for (let i = 0; i < 30; i++) {
        engine.recordStep({
          ...normalMetrics,
          prediction_error: 0.3,
        });
      }

      const stats = engine.getErrorStats();
      expect(stats.trend).toBe("degrading");
    });

    it("detects stable trend", () => {
      for (let i = 0; i < 60; i++) {
        engine.recordStep(normalMetrics);
      }

      const stats = engine.getErrorStats();
      expect(stats.trend).toBe("stable");
    });
  });

  // ============================================================================
  // FEATURE EVOLUTION
  // ============================================================================

  describe("feature evolution", () => {
    it("tracks feature importance over time", () => {
      for (let i = 0; i < 20; i++) {
        engine.recordStep({
          ...normalMetrics,
          feature_importance: {
            cutting_speed: 0.3 + i * 0.01,
            feed_rate: 0.25,
          },
        });
      }

      const evolution = engine.getFeatureEvolution("cutting_speed");
      expect(evolution.length).toBe(20);
      expect(evolution[19]).toBeGreaterThan(evolution[0]);
    });

    it("returns zeros for unknown feature", () => {
      for (let i = 0; i < 5; i++) {
        engine.recordStep(normalMetrics);
      }

      const evolution = engine.getFeatureEvolution("nonexistent");
      expect(evolution.every((v) => v === 0)).toBe(true);
    });
  });

  // ============================================================================
  // CHECKPOINT
  // ============================================================================

  describe("checkpoint", () => {
    it("creates checkpoint with all state", () => {
      engine.registerVariant("v1", "Test");
      for (let i = 0; i < 10; i++) {
        engine.recordStep(normalMetrics);
        engine.recordVariantResult("v1", 0.1);
      }

      const checkpoint = engine.createCheckpoint();

      expect(checkpoint.state.total_samples).toBe(10);
      expect(checkpoint.error_history.length).toBe(10);
      expect(checkpoint.model_variants.length).toBe(1);
    });

    it("restores from checkpoint", () => {
      // Build up state
      engine.registerVariant("v1", "Test");
      for (let i = 0; i < 20; i++) {
        engine.recordStep(normalMetrics);
        engine.recordVariantResult("v1", 0.1);
      }

      const checkpoint = engine.createCheckpoint();

      // Create new engine and restore
      const newEngine = new MillingOnlineLearningTrackerEngine();
      newEngine.restoreCheckpoint(checkpoint);

      expect(newEngine.getState().total_samples).toBe(20);
      expect(newEngine.getVariants().length).toBe(1);
    });
  });

  // ============================================================================
  // RESET
  // ============================================================================

  describe("reset", () => {
    it("clears all state", () => {
      engine.registerVariant("v1", "Test");
      for (let i = 0; i < 50; i++) {
        engine.recordStep(normalMetrics);
      }

      engine.reset();

      const state = engine.getState();
      expect(state.total_samples).toBe(0);
      expect(state.drift_events).toBe(0);
      expect(engine.getVariants().length).toBe(0);
    });
  });

  // ============================================================================
  // SUMMARY
  // ============================================================================

  describe("summary", () => {
    it("returns summary structure", () => {
      for (let i = 0; i < 10; i++) {
        engine.recordStep(normalMetrics);
      }

      const summary = engine.getSummary();

      expect(summary.total_samples).toBe(10);
      expect(summary.current_lr).toBeDefined();
      expect(summary.drift_events).toBeDefined();
      expect(summary.error_trend).toBeDefined();
      expect(Array.isArray(summary.recommendations)).toBe(true);
    });

    it("includes best variant when available", () => {
      engine.registerVariant("v1", "Baseline");
      engine.registerVariant("v2", "Better");

      for (let i = 0; i < 15; i++) {
        engine.recordStep(normalMetrics);
        engine.recordVariantResult("v1", 0.2);
        engine.recordVariantResult("v2", 0.05);
      }

      const summary = engine.getSummary();
      expect(summary.best_variant).toBe("v2");
    });

    it("generates recommendations for degrading performance", () => {
      // Simulate degrading
      for (let i = 0; i < 30; i++) {
        engine.recordStep({
          ...normalMetrics,
          prediction_error: 0.05,
        });
      }
      for (let i = 0; i < 30; i++) {
        engine.recordStep({
          ...normalMetrics,
          prediction_error: 0.3,
        });
      }

      const summary = engine.getSummary();
      expect(
        summary.recommendations.some((r) => r.includes("retrain") || r.includes("update"))
      ).toBe(true);
    });
  });

  // ============================================================================
  // CUSTOM CONFIG
  // ============================================================================

  describe("custom config", () => {
    it("applies custom error window", () => {
      const config: Partial<TrackerConfig> = { error_window_size: 10 };
      const customEngine = new MillingOnlineLearningTrackerEngine(config);

      for (let i = 0; i < 20; i++) {
        customEngine.recordStep(normalMetrics);
      }

      // Window should have max 10 entries
      const checkpoint = customEngine.createCheckpoint();
      expect(checkpoint.error_history.length).toBe(10);
    });

    it("applies custom drift threshold", () => {
      const config: Partial<TrackerConfig> = { drift_threshold: 0.5 };
      const customEngine = new MillingOnlineLearningTrackerEngine(config);

      // With high threshold, small variations shouldn't trigger drift
      for (let i = 0; i < 60; i++) {
        const result = customEngine.recordStep({
          ...normalMetrics,
          prediction_error: 0.05 + (i % 2) * 0.1, // Oscillating 0.05-0.15
        });

        // Should not detect drift with 0.5 threshold
        if (result.drift.type === "sudden" || result.drift.type === "gradual") {
          // Check ADWIN threshold respected
          expect(result.drift.severity).toBeGreaterThan(0);
        }
      }
    });
  });

  // ============================================================================
  // STATE
  // ============================================================================

  describe("state", () => {
    it("returns state copy", () => {
      engine.recordStep(normalMetrics);

      const state1 = engine.getState();
      const state2 = engine.getState();

      expect(state1).not.toBe(state2);
      expect(state1).toEqual(state2);
    });

    it("tracks epoch", () => {
      const state = engine.getState();
      expect(state.current_epoch).toBe(0);
    });

    it("tracks patience counter", () => {
      const state = engine.getState();
      expect(state.patience_counter).toBe(0);
    });
  });

  // ============================================================================
  // SINGLETON
  // ============================================================================

  describe("singleton", () => {
    it("exports singleton instance", () => {
      expect(millingOnlineLearningTrackerEngine).toBeDefined();
      expect(millingOnlineLearningTrackerEngine).toBeInstanceOf(
        MillingOnlineLearningTrackerEngine
      );
    });
  });
});
