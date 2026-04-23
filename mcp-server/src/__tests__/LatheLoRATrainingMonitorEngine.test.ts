/**
 * LatheLoRATrainingMonitorEngine Tests
 * LATHE-LORA-MS0 U-LLR12: Training progress monitoring
 */

import { describe, it, expect, beforeEach } from "vitest";
import { latheLoRATrainingMonitorEngine } from "../engines/LatheLoRATrainingMonitorEngine.js";

describe("LatheLoRATrainingMonitorEngine", () => {
  beforeEach(() => {
    latheLoRATrainingMonitorEngine.reset();
  });

  describe("initRun", () => {
    it("initializes training run with correct state", () => {
      const state = latheLoRATrainingMonitorEngine.initRun({
        run_id: "test-run-1",
        total_epochs: 3,
        total_steps: 1000,
      });

      expect(state.run_id).toBe("test-run-1");
      expect(state.status).toBe("initializing");
      expect(state.total_epochs).toBe(3);
      expect(state.total_steps).toBe(1000);
      expect(state.current_step).toBe(0);
      expect(state.best_eval_loss).toBe(Infinity);
    });

    it("resets checkpoints on new run", () => {
      latheLoRATrainingMonitorEngine.initRun({
        run_id: "run-1",
        total_epochs: 1,
        total_steps: 100,
      });
      latheLoRATrainingMonitorEngine.recordCheckpoint({
        step: 50, epoch: 0, path: "/tmp/cp", eval_loss: 0.5, is_best: true,
      });

      latheLoRATrainingMonitorEngine.initRun({
        run_id: "run-2",
        total_epochs: 1,
        total_steps: 100,
      });

      expect(latheLoRATrainingMonitorEngine.getBestCheckpoint()).toBeNull();
    });
  });

  describe("recordStep", () => {
    beforeEach(() => {
      latheLoRATrainingMonitorEngine.initRun({
        run_id: "test-run",
        total_epochs: 3,
        total_steps: 300,
      });
    });

    it("records step metrics", () => {
      const result = latheLoRATrainingMonitorEngine.recordStep({
        step: 1,
        epoch: 0,
        train_loss: 2.5,
        learning_rate: 1e-4,
        timestamp: Date.now(),
      });

      expect(result.state.status).toBe("training");
      expect(result.state.current_step).toBe(1);
      expect(result.state.metrics_history.length).toBe(1);
    });

    it("updates best eval loss when improved", () => {
      latheLoRATrainingMonitorEngine.recordStep({
        step: 1, epoch: 0, train_loss: 2.5, eval_loss: 2.0,
        learning_rate: 1e-4, timestamp: Date.now(),
      });
      latheLoRATrainingMonitorEngine.recordStep({
        step: 2, epoch: 0, train_loss: 2.3, eval_loss: 1.8,
        learning_rate: 1e-4, timestamp: Date.now(),
      });

      const state = latheLoRATrainingMonitorEngine.getState();
      expect(state?.best_eval_loss).toBe(1.8);
      expect(state?.best_step).toBe(2);
    });

    it("increments steps_since_improvement when no improvement", () => {
      latheLoRATrainingMonitorEngine.recordStep({
        step: 1, epoch: 0, train_loss: 2.5, eval_loss: 1.0,
        learning_rate: 1e-4, timestamp: Date.now(),
      });
      latheLoRATrainingMonitorEngine.recordStep({
        step: 2, epoch: 0, train_loss: 2.3, eval_loss: 1.1,
        learning_rate: 1e-4, timestamp: Date.now(),
      });

      const state = latheLoRATrainingMonitorEngine.getState();
      expect(state?.steps_since_improvement).toBe(1);
    });

    it("throws error if no run initialized", () => {
      latheLoRATrainingMonitorEngine.reset();
      expect(() => {
        latheLoRATrainingMonitorEngine.recordStep({
          step: 1, epoch: 0, train_loss: 2.5,
          learning_rate: 1e-4, timestamp: Date.now(),
        });
      }).toThrow("No training run initialized");
    });
  });

  describe("early stopping", () => {
    beforeEach(() => {
      latheLoRATrainingMonitorEngine.initRun({
        run_id: "early-stop-test",
        total_epochs: 10,
        total_steps: 1000,
      });
      latheLoRATrainingMonitorEngine.setEarlyStopping({
        patience: 3,
        min_delta: 0.01,
      });
    });

    it("triggers early stopping after patience exceeded", () => {
      // First step with good loss
      latheLoRATrainingMonitorEngine.recordStep({
        step: 1, epoch: 0, train_loss: 1.0, eval_loss: 0.5,
        learning_rate: 1e-4, timestamp: Date.now(),
      });

      // 3 steps without improvement
      for (let i = 2; i <= 4; i++) {
        const result = latheLoRATrainingMonitorEngine.recordStep({
          step: i, epoch: 0, train_loss: 1.0, eval_loss: 0.55,
          learning_rate: 1e-4, timestamp: Date.now(),
        });

        if (i === 4) {
          expect(result.should_stop).toBe(true);
        } else {
          expect(result.should_stop).toBe(false);
        }
      }
    });

    it("resets patience counter on improvement", () => {
      latheLoRATrainingMonitorEngine.recordStep({
        step: 1, epoch: 0, train_loss: 1.0, eval_loss: 0.5,
        learning_rate: 1e-4, timestamp: Date.now(),
      });
      latheLoRATrainingMonitorEngine.recordStep({
        step: 2, epoch: 0, train_loss: 1.0, eval_loss: 0.55,
        learning_rate: 1e-4, timestamp: Date.now(),
      });
      latheLoRATrainingMonitorEngine.recordStep({
        step: 3, epoch: 0, train_loss: 1.0, eval_loss: 0.4, // improvement
        learning_rate: 1e-4, timestamp: Date.now(),
      });

      const state = latheLoRATrainingMonitorEngine.getState();
      expect(state?.steps_since_improvement).toBe(0);
    });
  });

  describe("anomaly detection", () => {
    beforeEach(() => {
      latheLoRATrainingMonitorEngine.initRun({
        run_id: "anomaly-test",
        total_epochs: 3,
        total_steps: 100,
      });
    });

    it("detects NaN loss", () => {
      const result = latheLoRATrainingMonitorEngine.recordStep({
        step: 1, epoch: 0, train_loss: NaN,
        learning_rate: 1e-4, timestamp: Date.now(),
      });

      expect(result.anomaly).toBeDefined();
      expect(result.anomaly?.type).toBe("nan_loss");
      expect(result.anomaly?.severity).toBe("critical");
    });

    it("detects loss spike", () => {
      // Record 5 normal steps
      for (let i = 1; i <= 5; i++) {
        latheLoRATrainingMonitorEngine.recordStep({
          step: i, epoch: 0, train_loss: 1.0,
          learning_rate: 1e-4, timestamp: Date.now(),
        });
      }

      // Record spike
      const result = latheLoRATrainingMonitorEngine.recordStep({
        step: 6, epoch: 0, train_loss: 5.0, // 5x average
        learning_rate: 1e-4, timestamp: Date.now(),
      });

      expect(result.anomaly).toBeDefined();
      expect(result.anomaly?.type).toBe("loss_spike");
      expect(result.anomaly?.severity).toBe("warning");
    });

    it("detects gradient explosion", () => {
      const result = latheLoRATrainingMonitorEngine.recordStep({
        step: 1, epoch: 0, train_loss: 1.0,
        gradient_norm: 15.0, // > 10 threshold
        learning_rate: 1e-4, timestamp: Date.now(),
      });

      expect(result.anomaly).toBeDefined();
      expect(result.anomaly?.type).toBe("gradient_explosion");
    });

    it("detects learning stall", () => {
      // Record 50+ steps with same loss
      for (let i = 1; i <= 55; i++) {
        latheLoRATrainingMonitorEngine.recordStep({
          step: i, epoch: 0, train_loss: 1.0,
          learning_rate: 1e-4, timestamp: Date.now(),
        });
      }

      const state = latheLoRATrainingMonitorEngine.getState();
      const lastResult = latheLoRATrainingMonitorEngine.recordStep({
        step: 56, epoch: 0, train_loss: 1.0,
        learning_rate: 1e-4, timestamp: Date.now(),
      });

      expect(lastResult.anomaly).toBeDefined();
      expect(lastResult.anomaly?.type).toBe("learning_stall");
    });
  });

  describe("recordCheckpoint", () => {
    it("records checkpoint with timestamp", () => {
      latheLoRATrainingMonitorEngine.initRun({
        run_id: "cp-test", total_epochs: 1, total_steps: 100,
      });

      latheLoRATrainingMonitorEngine.recordCheckpoint({
        step: 50, epoch: 0, path: "/tmp/checkpoint-50",
        eval_loss: 0.5, is_best: true,
      });

      const best = latheLoRATrainingMonitorEngine.getBestCheckpoint();
      expect(best).toBeDefined();
      expect(best?.step).toBe(50);
      expect(best?.is_best).toBe(true);
      expect(best?.timestamp).toBeGreaterThan(0);
    });
  });

  describe("complete / fail", () => {
    beforeEach(() => {
      latheLoRATrainingMonitorEngine.initRun({
        run_id: "complete-test", total_epochs: 1, total_steps: 10,
      });
    });

    it("marks run as completed and returns summary", () => {
      latheLoRATrainingMonitorEngine.recordStep({
        step: 10, epoch: 0, train_loss: 0.5, eval_loss: 0.6,
        learning_rate: 1e-4, timestamp: Date.now(),
      });

      const summary = latheLoRATrainingMonitorEngine.complete();
      expect(summary.run_id).toBe("complete-test");
      expect(summary.final_train_loss).toBe(0.5);
      expect(latheLoRATrainingMonitorEngine.getState()?.status).toBe("completed");
    });

    it("marks run as failed", () => {
      latheLoRATrainingMonitorEngine.fail("OOM error");
      expect(latheLoRATrainingMonitorEngine.getState()?.status).toBe("failed");
    });
  });

  describe("getSummary", () => {
    it("calculates summary statistics", () => {
      latheLoRATrainingMonitorEngine.initRun({
        run_id: "summary-test", total_epochs: 1, total_steps: 5,
      });

      for (let i = 1; i <= 5; i++) {
        latheLoRATrainingMonitorEngine.recordStep({
          step: i, epoch: 0,
          train_loss: 2.0 - i * 0.2,
          eval_loss: 2.1 - i * 0.2,
          learning_rate: 1e-4,
          tokens_per_second: 100 + i * 10,
          vram_used_gb: 8 + i * 0.5,
          timestamp: Date.now(),
        });
      }

      const summary = latheLoRATrainingMonitorEngine.getSummary();
      expect(summary.total_steps).toBe(5);
      expect(summary.avg_tokens_per_second).toBeGreaterThan(0);
      expect(summary.peak_vram_gb).toBe(10.5);
      expect(summary.final_train_loss).toBe(1.0);
    });
  });

  describe("getProgress", () => {
    it("calculates progress percentage", () => {
      latheLoRATrainingMonitorEngine.initRun({
        run_id: "progress-test", total_epochs: 1, total_steps: 100,
      });

      latheLoRATrainingMonitorEngine.recordStep({
        step: 50, epoch: 0, train_loss: 1.0,
        learning_rate: 1e-4, timestamp: Date.now(),
      });

      const progress = latheLoRATrainingMonitorEngine.getProgress();
      expect(progress.percent).toBe(50);
      expect(progress.eta_seconds).toBeGreaterThanOrEqual(0);
    });

    it("returns 0 when no run", () => {
      const progress = latheLoRATrainingMonitorEngine.getProgress();
      expect(progress.percent).toBe(0);
      expect(progress.eta_seconds).toBe(0);
    });
  });

  describe("getLossHistory", () => {
    it("returns loss arrays for plotting", () => {
      latheLoRATrainingMonitorEngine.initRun({
        run_id: "history-test", total_epochs: 1, total_steps: 3,
      });

      for (let i = 1; i <= 3; i++) {
        latheLoRATrainingMonitorEngine.recordStep({
          step: i, epoch: 0,
          train_loss: 2.0 - i * 0.2,
          eval_loss: 2.1 - i * 0.2,
          learning_rate: 1e-4, timestamp: Date.now(),
        });
      }

      const history = latheLoRATrainingMonitorEngine.getLossHistory();
      expect(history.steps).toEqual([1, 2, 3]);
      expect(history.train_loss.length).toBe(3);
      expect(history.eval_loss.length).toBe(3);
    });

    it("returns empty arrays when no run", () => {
      const history = latheLoRATrainingMonitorEngine.getLossHistory();
      expect(history.steps).toEqual([]);
      expect(history.train_loss).toEqual([]);
    });
  });

  describe("getBestCheckpoint", () => {
    it("returns checkpoint marked as best", () => {
      latheLoRATrainingMonitorEngine.initRun({
        run_id: "best-cp-test", total_epochs: 1, total_steps: 100,
      });

      latheLoRATrainingMonitorEngine.recordCheckpoint({
        step: 25, epoch: 0, path: "/tmp/cp-25",
        eval_loss: 0.8, is_best: false,
      });
      latheLoRATrainingMonitorEngine.recordCheckpoint({
        step: 50, epoch: 0, path: "/tmp/cp-50",
        eval_loss: 0.5, is_best: true,
      });
      latheLoRATrainingMonitorEngine.recordCheckpoint({
        step: 75, epoch: 0, path: "/tmp/cp-75",
        eval_loss: 0.6, is_best: false,
      });

      const best = latheLoRATrainingMonitorEngine.getBestCheckpoint();
      expect(best?.step).toBe(50);
      expect(best?.eval_loss).toBe(0.5);
    });

    it("returns last checkpoint if none marked best", () => {
      latheLoRATrainingMonitorEngine.initRun({
        run_id: "no-best-test", total_epochs: 1, total_steps: 100,
      });

      latheLoRATrainingMonitorEngine.recordCheckpoint({
        step: 50, epoch: 0, path: "/tmp/cp-50",
        eval_loss: 0.5, is_best: false,
      });

      const best = latheLoRATrainingMonitorEngine.getBestCheckpoint();
      expect(best?.step).toBe(50);
    });
  });

  describe("formatProgress", () => {
    it("formats progress string with all info", () => {
      latheLoRATrainingMonitorEngine.initRun({
        run_id: "format-test", total_epochs: 3, total_steps: 300,
      });

      latheLoRATrainingMonitorEngine.recordStep({
        step: 150, epoch: 1, train_loss: 0.8, eval_loss: 0.9,
        learning_rate: 1e-4, timestamp: Date.now(),
      });

      const formatted = latheLoRATrainingMonitorEngine.formatProgress();
      expect(formatted).toContain("TRAINING");
      expect(formatted).toContain("150/300");
      expect(formatted).toContain("50.0%");
      expect(formatted).toContain("Epoch 1/3");
    });

    it("returns message when no training", () => {
      const formatted = latheLoRATrainingMonitorEngine.formatProgress();
      expect(formatted).toBe("No training in progress");
    });
  });

  describe("reset", () => {
    it("clears all state", () => {
      latheLoRATrainingMonitorEngine.initRun({
        run_id: "reset-test", total_epochs: 1, total_steps: 10,
      });
      latheLoRATrainingMonitorEngine.recordStep({
        step: 5, epoch: 0, train_loss: 1.0,
        learning_rate: 1e-4, timestamp: Date.now(),
      });

      latheLoRATrainingMonitorEngine.reset();

      expect(latheLoRATrainingMonitorEngine.getState()).toBeNull();
      expect(latheLoRATrainingMonitorEngine.getBestCheckpoint()).toBeNull();
    });
  });
});
