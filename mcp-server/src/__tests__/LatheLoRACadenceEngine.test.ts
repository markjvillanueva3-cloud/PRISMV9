/**
 * LatheLoRACadenceEngine Tests
 *
 * U-LTH75: Training cadence scheduler for LoRA fine-tuning
 */

import { describe, it, expect, beforeEach } from "vitest";
import { latheLoRACadenceEngine } from "../engines/LatheLoRACadenceEngine.js";

describe("LatheLoRACadenceEngine", () => {
  beforeEach(() => {
    latheLoRACadenceEngine.reset();
    latheLoRACadenceEngine.setConfig({
      enabled: true,
      interval: "weekly",
      day_of_week: 0,
      hour: 2,
      min_new_programs: 50,
      retrain_on_drift: true,
      drift_threshold: 0.1,
      performance_threshold: 65,
      max_versions: 5,
      auto_promote: true,
    });
  });

  describe("Configuration", () => {
    it("sets and gets config", () => {
      latheLoRACadenceEngine.setConfig({
        interval: "daily",
        hour: 3,
      });

      const config = latheLoRACadenceEngine.getConfig();

      expect(config.interval).toBe("daily");
      expect(config.hour).toBe(3);
    });

    it("has sensible defaults", () => {
      latheLoRACadenceEngine.reset();
      const config = latheLoRACadenceEngine.getConfig();

      expect(config.enabled).toBe(true);
      expect(config.interval).toBe("weekly");
      expect(config.max_versions).toBe(5);
    });
  });

  describe("State Management", () => {
    it("returns state", () => {
      const state = latheLoRACadenceEngine.getState();

      expect(state.runs).toHaveLength(0);
      expect(state.versions).toHaveLength(0);
      expect(state.programs_since_last_run).toBe(0);
    });

    it("resets state", () => {
      latheLoRACadenceEngine.recordNewPrograms(100);
      latheLoRACadenceEngine.reset();

      const state = latheLoRACadenceEngine.getState();
      expect(state.programs_since_last_run).toBe(0);
    });
  });

  describe("Schedule Calculation", () => {
    it("calculates next daily run", () => {
      latheLoRACadenceEngine.setConfig({ interval: "daily", hour: 2 });
      const from = new Date("2024-06-15T10:00:00Z");
      const next = latheLoRACadenceEngine.calculateNextRun(from);

      expect(next.getHours()).toBe(2);
      expect(next > from).toBe(true);
    });

    it("calculates next weekly run", () => {
      latheLoRACadenceEngine.setConfig({ interval: "weekly", day_of_week: 0, hour: 2 });
      const from = new Date("2024-06-15T10:00:00Z");
      const next = latheLoRACadenceEngine.calculateNextRun(from);

      expect(next.getDay()).toBe(0);
    });

    it("calculates next monthly run", () => {
      latheLoRACadenceEngine.setConfig({ interval: "monthly", day_of_month: 1, hour: 2 });
      const from = new Date("2024-06-15T10:00:00Z");
      const next = latheLoRACadenceEngine.calculateNextRun(from);

      expect(next.getDate()).toBe(1);
    });

    it("returns epoch for on-demand", () => {
      latheLoRACadenceEngine.setConfig({ interval: "on-demand" });
      const next = latheLoRACadenceEngine.calculateNextRun();

      expect(next.getTime()).toBe(0);
    });
  });

  describe("Trigger Evaluation", () => {
    it("does not trigger when disabled", () => {
      latheLoRACadenceEngine.setConfig({ enabled: false });
      const result = latheLoRACadenceEngine.shouldTriggerRun();

      expect(result.should).toBe(false);
      expect(result.details).toContain("disabled");
    });

    it("does not trigger on-demand", () => {
      latheLoRACadenceEngine.setConfig({ interval: "on-demand" });
      const result = latheLoRACadenceEngine.shouldTriggerRun();

      expect(result.should).toBe(false);
    });

    it("does not trigger without enough new programs", () => {
      latheLoRACadenceEngine.setConfig({ min_new_programs: 100 });
      latheLoRACadenceEngine.recordNewPrograms(50);

      const result = latheLoRACadenceEngine.shouldTriggerRun();

      expect(result.should).toBe(false);
      expect(result.details).toContain("Only 50");
    });
  });

  describe("Drift Detection", () => {
    it("detects drift above threshold", () => {
      const result = latheLoRACadenceEngine.checkDrift(80, 100);

      expect(result.drifted).toBe(true);
      expect(result.delta).toBe(0.2);
    });

    it("does not detect drift below threshold", () => {
      const result = latheLoRACadenceEngine.checkDrift(95, 100);

      expect(result.drifted).toBe(false);
      expect(result.delta).toBe(0.05);
    });
  });

  describe("Performance Check", () => {
    it("accepts score above threshold", () => {
      const result = latheLoRACadenceEngine.checkPerformance(75);

      expect(result.acceptable).toBe(true);
      expect(result.delta).toBe(10);
    });

    it("rejects score below threshold", () => {
      const result = latheLoRACadenceEngine.checkPerformance(50);

      expect(result.acceptable).toBe(false);
      expect(result.delta).toBe(-15);
    });
  });

  describe("Run Management", () => {
    it("starts a run", () => {
      const run = latheLoRACadenceEngine.startRun("manual", "Test run");

      expect(run.status).toBe("running");
      expect(run.triggered_by).toBe("manual");
      expect(run.notes).toBe("Test run");
    });

    it("completes a run", () => {
      const run = latheLoRACadenceEngine.startRun("scheduled");
      const completed = latheLoRACadenceEngine.completeRun(run.run_id, {
        dataset_size: 1000,
        training_loss: 0.5,
        eval_score: 75,
        new_programs: 100,
      }, "models/v1");

      expect(completed.status).toBe("completed");
      expect(completed.metrics?.eval_score).toBe(75);
      expect(completed.model_path).toBe("models/v1");
    });

    it("fails a run", () => {
      const run = latheLoRACadenceEngine.startRun("manual");
      const failed = latheLoRACadenceEngine.failRun(run.run_id, "Out of memory");

      expect(failed.status).toBe("failed");
      expect(failed.notes).toContain("Out of memory");
    });

    it("resets programs count after completion", () => {
      latheLoRACadenceEngine.recordNewPrograms(100);
      const run = latheLoRACadenceEngine.startRun("scheduled");
      latheLoRACadenceEngine.completeRun(run.run_id, {
        dataset_size: 100,
        training_loss: 0.5,
        eval_score: 75,
        new_programs: 100,
      }, "models/v1");

      const state = latheLoRACadenceEngine.getState();
      expect(state.programs_since_last_run).toBe(0);
    });
  });

  describe("Version Management", () => {
    it("generates version string", () => {
      const version = latheLoRACadenceEngine.generateVersion();

      expect(version).toMatch(/^\d{8}\.\d+$/);
    });

    it("promotes version", () => {
      const run = latheLoRACadenceEngine.startRun("manual");
      latheLoRACadenceEngine.completeRun(run.run_id, {
        dataset_size: 100,
        training_loss: 0.5,
        eval_score: 75,
        new_programs: 100,
      }, "models/v1");

      const promoted = latheLoRACadenceEngine.promoteVersion(run.version);

      expect(promoted.is_active).toBe(true);
      expect(promoted.promoted_at).toBeDefined();
    });

    it("deprecates version", () => {
      const run = latheLoRACadenceEngine.startRun("manual");
      latheLoRACadenceEngine.completeRun(run.run_id, {
        dataset_size: 100,
        training_loss: 0.5,
        eval_score: 75,
        new_programs: 100,
      }, "models/v1");
      latheLoRACadenceEngine.promoteVersion(run.version);

      const deprecated = latheLoRACadenceEngine.deprecateVersion(run.version);

      expect(deprecated.is_active).toBe(false);
      expect(deprecated.deprecated_at).toBeDefined();
    });

    it("auto-promotes when score meets threshold", () => {
      latheLoRACadenceEngine.setConfig({ auto_promote: true, performance_threshold: 70 });
      const run = latheLoRACadenceEngine.startRun("scheduled");
      latheLoRACadenceEngine.completeRun(run.run_id, {
        dataset_size: 100,
        training_loss: 0.5,
        eval_score: 75,
        new_programs: 100,
      }, "models/v1");

      expect(run.promoted).toBe(true);
    });
  });

  describe("Program Tracking", () => {
    it("records new programs", () => {
      latheLoRACadenceEngine.recordNewPrograms(25);
      latheLoRACadenceEngine.recordNewPrograms(30);

      const state = latheLoRACadenceEngine.getState();
      expect(state.programs_since_last_run).toBe(55);
    });
  });

  describe("Cron Expression", () => {
    it("generates daily cron", () => {
      latheLoRACadenceEngine.setConfig({ interval: "daily", hour: 3 });
      const cron = latheLoRACadenceEngine.getCronExpression();

      expect(cron).toBe("0 3 * * *");
    });

    it("generates weekly cron", () => {
      latheLoRACadenceEngine.setConfig({ interval: "weekly", day_of_week: 1, hour: 2 });
      const cron = latheLoRACadenceEngine.getCronExpression();

      expect(cron).toBe("0 2 * * 1");
    });

    it("generates monthly cron", () => {
      latheLoRACadenceEngine.setConfig({ interval: "monthly", day_of_month: 15, hour: 4 });
      const cron = latheLoRACadenceEngine.getCronExpression();

      expect(cron).toBe("0 4 15 * *");
    });

    it("returns comment for on-demand", () => {
      latheLoRACadenceEngine.setConfig({ interval: "on-demand" });
      const cron = latheLoRACadenceEngine.getCronExpression();

      expect(cron).toContain("#");
    });
  });

  describe("History", () => {
    it("returns run history", () => {
      latheLoRACadenceEngine.startRun("manual");
      latheLoRACadenceEngine.startRun("scheduled");

      const history = latheLoRACadenceEngine.getRunHistory();

      expect(history.length).toBe(2);
      expect(history[0].triggered_by).toBe("scheduled");
    });

    it("returns version history", () => {
      const run1 = latheLoRACadenceEngine.startRun("manual");
      latheLoRACadenceEngine.completeRun(run1.run_id, {
        dataset_size: 100,
        training_loss: 0.5,
        eval_score: 75,
        new_programs: 50,
      }, "models/v1");

      const versions = latheLoRACadenceEngine.getVersionHistory();

      expect(versions.length).toBe(1);
    });

    it("returns active version", () => {
      const run = latheLoRACadenceEngine.startRun("manual");
      latheLoRACadenceEngine.completeRun(run.run_id, {
        dataset_size: 100,
        training_loss: 0.5,
        eval_score: 75,
        new_programs: 50,
      }, "models/v1");
      latheLoRACadenceEngine.promoteVersion(run.version);

      const active = latheLoRACadenceEngine.getActiveVersion();

      expect(active).not.toBeNull();
      expect(active?.is_active).toBe(true);
    });
  });

  describe("Summary", () => {
    it("generates summary", () => {
      latheLoRACadenceEngine.recordNewPrograms(75);
      const run = latheLoRACadenceEngine.startRun("manual");
      latheLoRACadenceEngine.completeRun(run.run_id, {
        dataset_size: 100,
        training_loss: 0.5,
        eval_score: 75,
        new_programs: 75,
      }, "models/v1");

      const summary = latheLoRACadenceEngine.getSummary();

      expect(summary.enabled).toBe(true);
      expect(summary.total_runs).toBe(1);
      expect(summary.successful_runs).toBe(1);
      expect(summary.failed_runs).toBe(0);
    });

    it("returns null next_run for on-demand", () => {
      latheLoRACadenceEngine.setConfig({ interval: "on-demand" });

      const summary = latheLoRACadenceEngine.getSummary();

      expect(summary.next_run).toBeNull();
    });
  });
});
