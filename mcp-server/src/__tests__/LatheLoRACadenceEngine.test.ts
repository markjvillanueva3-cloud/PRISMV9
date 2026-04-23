/**
 * LatheLoRACadenceEngine Tests
 * U-LLR01: Training cadence scheduler tests
 */

import { describe, it, expect, beforeEach } from "vitest";
import { latheLoRACadenceEngine } from "../engines/LatheLoRACadenceEngine.js";

describe("LatheLoRACadenceEngine", () => {
  beforeEach(() => {
    latheLoRACadenceEngine.reset();
  });

  describe("configuration", () => {
    it("returns default config", () => {
      const config = latheLoRACadenceEngine.getConfig();
      expect(config.enabled).toBe(true);
      expect(config.interval).toBe("weekly");
      expect(config.min_new_programs).toBe(50);
    });

    it("merges partial config", () => {
      const config = latheLoRACadenceEngine.setConfig({
        interval: "daily",
        min_new_programs: 100,
      });
      expect(config.interval).toBe("daily");
      expect(config.min_new_programs).toBe(100);
      expect(config.enabled).toBe(true);
    });
  });

  describe("schedule calculation", () => {
    it("calculates next daily run", () => {
      latheLoRACadenceEngine.setConfig({ interval: "daily", hour: 2 });
      const baseDate = new Date("2026-04-18T10:00:00Z");
      const next = latheLoRACadenceEngine.calculateNextRun(baseDate);
      expect(next.getHours()).toBe(2);
      expect(next > baseDate).toBe(true);
    });

    it("returns epoch for on-demand", () => {
      latheLoRACadenceEngine.setConfig({ interval: "on-demand" });
      const next = latheLoRACadenceEngine.calculateNextRun();
      expect(next.getTime()).toBe(0);
    });
  });

  describe("trigger evaluation", () => {
    it("returns false when disabled", () => {
      latheLoRACadenceEngine.setConfig({ enabled: false });
      const result = latheLoRACadenceEngine.shouldTriggerRun();
      expect(result.should).toBe(false);
      expect(result.details).toBe("Cadence disabled");
    });

    it("returns false for on-demand", () => {
      latheLoRACadenceEngine.setConfig({ interval: "on-demand" });
      const result = latheLoRACadenceEngine.shouldTriggerRun();
      expect(result.should).toBe(false);
      expect(result.details).toBe("On-demand only");
    });
  });

  describe("drift detection", () => {
    it("detects drift above threshold", () => {
      latheLoRACadenceEngine.setConfig({ drift_threshold: 0.1 });
      const result = latheLoRACadenceEngine.checkDrift(70, 80);
      expect(result.drifted).toBe(true);
      expect(result.delta).toBe(0.13);
    });

    it("no drift below threshold", () => {
      latheLoRACadenceEngine.setConfig({ drift_threshold: 0.1 });
      const result = latheLoRACadenceEngine.checkDrift(78, 80);
      expect(result.drifted).toBe(false);
    });
  });

  describe("run management", () => {
    it("starts a run", () => {
      const run = latheLoRACadenceEngine.startRun("manual", "Test run");
      expect(run.status).toBe("running");
      expect(run.triggered_by).toBe("manual");
      expect(run.notes).toBe("Test run");
      expect(run.version).toMatch(/^\d{8}\.\d+$/);
    });

    it("completes a run with metrics", () => {
      const run = latheLoRACadenceEngine.startRun("scheduled");
      const completed = latheLoRACadenceEngine.completeRun(run.run_id, {
        dataset_size: 1000,
        training_loss: 0.5,
        eval_score: 85,
        new_programs: 150,
      }, "/models/v1");

      expect(completed.status).toBe("completed");
      expect(completed.metrics?.eval_score).toBe(85);
      expect(completed.model_path).toBe("/models/v1");
    });

    it("fails a run with error", () => {
      const run = latheLoRACadenceEngine.startRun("manual");
      const failed = latheLoRACadenceEngine.failRun(run.run_id, "Out of memory");
      expect(failed.status).toBe("failed");
      expect(failed.notes).toContain("Out of memory");
    });

    it("throws on unknown run id", () => {
      expect(() => latheLoRACadenceEngine.completeRun("unknown", null, "")).toThrow();
    });
  });

  describe("version management", () => {
    it("generates sequential versions via runs", () => {
      const run1 = latheLoRACadenceEngine.startRun("manual");
      latheLoRACadenceEngine.completeRun(run1.run_id, {
        dataset_size: 100, training_loss: 0.3, eval_score: 70, new_programs: 50
      }, "/models/v1");

      const run2 = latheLoRACadenceEngine.startRun("manual");
      expect(run2.version).not.toBe(run1.version);
      expect(run2.version).toMatch(/^\d{8}\.2$/);
    });

    it("promotes a version", () => {
      const run = latheLoRACadenceEngine.startRun("manual");
      latheLoRACadenceEngine.setConfig({ auto_promote: false });
      latheLoRACadenceEngine.completeRun(run.run_id, {
        dataset_size: 100, training_loss: 0.3, eval_score: 90, new_programs: 50
      }, "/models/test");

      const promoted = latheLoRACadenceEngine.promoteVersion(run.version);
      expect(promoted.is_active).toBe(true);
      expect(promoted.promoted_at).toBeDefined();
    });

    it("auto-promotes high-scoring versions", () => {
      latheLoRACadenceEngine.setConfig({ auto_promote: true, performance_threshold: 65 });
      const run = latheLoRACadenceEngine.startRun("scheduled");
      latheLoRACadenceEngine.completeRun(run.run_id, {
        dataset_size: 100, training_loss: 0.3, eval_score: 80, new_programs: 50
      }, "/models/test");

      const active = latheLoRACadenceEngine.getActiveVersion();
      expect(active).not.toBeNull();
      expect(active?.version).toBe(run.version);
    });
  });

  describe("program tracking", () => {
    it("accumulates new programs", () => {
      expect(latheLoRACadenceEngine.recordNewPrograms(10)).toBe(10);
      expect(latheLoRACadenceEngine.recordNewPrograms(25)).toBe(35);
    });

    it("resets after run completion", () => {
      latheLoRACadenceEngine.recordNewPrograms(100);
      const run = latheLoRACadenceEngine.startRun("scheduled");
      latheLoRACadenceEngine.completeRun(run.run_id, {
        dataset_size: 100, training_loss: 0.3, eval_score: 70, new_programs: 100
      }, "/models/test");

      const state = latheLoRACadenceEngine.getState();
      expect(state.programs_since_last_run).toBe(0);
    });
  });

  describe("cron expression", () => {
    it("generates daily cron", () => {
      latheLoRACadenceEngine.setConfig({ interval: "daily", hour: 3 });
      expect(latheLoRACadenceEngine.getCronExpression()).toBe("0 3 * * *");
    });

    it("generates weekly cron", () => {
      latheLoRACadenceEngine.setConfig({ interval: "weekly", hour: 2, day_of_week: 0 });
      expect(latheLoRACadenceEngine.getCronExpression()).toBe("0 2 * * 0");
    });

    it("generates monthly cron", () => {
      latheLoRACadenceEngine.setConfig({ interval: "monthly", hour: 1, day_of_month: 15 });
      expect(latheLoRACadenceEngine.getCronExpression()).toBe("0 1 15 * *");
    });
  });

  describe("summary", () => {
    it("returns correct summary stats", () => {
      latheLoRACadenceEngine.setConfig({ auto_promote: false });

      const run1 = latheLoRACadenceEngine.startRun("scheduled");
      const completed1 = latheLoRACadenceEngine.completeRun(run1.run_id, {
        dataset_size: 100, training_loss: 0.3, eval_score: 80, new_programs: 50
      }, "/models/v1");
      expect(completed1.status).toBe("completed");

      const run2 = latheLoRACadenceEngine.startRun("manual");
      const failed2 = latheLoRACadenceEngine.failRun(run2.run_id, "Test failure");
      expect(failed2.status).toBe("failed");

      latheLoRACadenceEngine.recordNewPrograms(25);

      const summary = latheLoRACadenceEngine.getSummary();
      expect(summary.total_runs).toBe(2);
      expect(summary.programs_pending).toBe(25);
    });
  });
});
