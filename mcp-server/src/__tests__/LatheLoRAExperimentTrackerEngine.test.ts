/**
 * Tests for LatheLoRAExperimentTrackerEngine — LATHE-LORA-MS0 U-LLR47
 */

import { describe, it, expect, beforeEach } from "vitest";
import { latheLoRAExperimentTrackerEngine } from "../engines/LatheLoRAExperimentTrackerEngine.js";

describe("LatheLoRAExperimentTrackerEngine", () => {
  beforeEach(() => {
    latheLoRAExperimentTrackerEngine.reset();
  });

  describe("Configuration", () => {
    it("should have default config", () => {
      const c = latheLoRAExperimentTrackerEngine.getConfig();
      expect(c.primary_metric).toBe("val_loss");
      expect(c.metric_goal).toBe("minimize");
    });

    it("should update config", () => {
      latheLoRAExperimentTrackerEngine.setConfig({ primary_metric: "accuracy", metric_goal: "maximize" });
      expect(latheLoRAExperimentTrackerEngine.getConfig().primary_metric).toBe("accuracy");
    });
  });

  describe("Experiment Lifecycle", () => {
    it("should create experiment", () => {
      const e = latheLoRAExperimentTrackerEngine.createExperiment("exp1", { lr: 1e-4 });
      expect(e.id).toMatch(/^exp-/);
      expect(e.status).toBe("running");
      expect(e.hyperparameters.lr).toBe(1e-4);
    });

    it("should complete experiment", () => {
      const e = latheLoRAExperimentTrackerEngine.createExperiment("exp1", {});
      latheLoRAExperimentTrackerEngine.completeExperiment(e.id);
      expect(e.status).toBe("completed");
      expect(e.completed_at).toBeDefined();
    });

    it("should mark failed experiment", () => {
      const e = latheLoRAExperimentTrackerEngine.createExperiment("exp1", {});
      latheLoRAExperimentTrackerEngine.completeExperiment(e.id, "failed");
      expect(e.status).toBe("failed");
    });

    it("should archive experiment", () => {
      const e = latheLoRAExperimentTrackerEngine.createExperiment("exp1", {});
      latheLoRAExperimentTrackerEngine.archive(e.id);
      expect(e.status).toBe("archived");
    });
  });

  describe("Metric Logging", () => {
    it("should log a metric", () => {
      const e = latheLoRAExperimentTrackerEngine.createExperiment("exp1", {});
      expect(latheLoRAExperimentTrackerEngine.logMetric(e.id, "loss", 0.5, 1)).toBe(true);
      expect(e.metrics.length).toBe(1);
    });

    it("should log multiple metrics", () => {
      const e = latheLoRAExperimentTrackerEngine.createExperiment("exp1", {});
      latheLoRAExperimentTrackerEngine.logMetrics(e.id, { loss: 0.5, acc: 0.8 }, 1);
      expect(e.metrics.length).toBe(2);
    });

    it("should not log on completed experiment", () => {
      const e = latheLoRAExperimentTrackerEngine.createExperiment("exp1", {});
      latheLoRAExperimentTrackerEngine.completeExperiment(e.id);
      expect(latheLoRAExperimentTrackerEngine.logMetric(e.id, "loss", 0.5, 1)).toBe(false);
    });
  });

  describe("Metric Queries", () => {
    it("should get metric series", () => {
      const e = latheLoRAExperimentTrackerEngine.createExperiment("exp1", {});
      latheLoRAExperimentTrackerEngine.logMetric(e.id, "loss", 0.5, 1);
      latheLoRAExperimentTrackerEngine.logMetric(e.id, "loss", 0.3, 2);
      const series = latheLoRAExperimentTrackerEngine.getMetricSeries(e.id, "loss");
      expect(series.length).toBe(2);
      expect(series[0].step).toBe(1);
      expect(series[1].step).toBe(2);
    });

    it("should get latest metric", () => {
      const e = latheLoRAExperimentTrackerEngine.createExperiment("exp1", {});
      latheLoRAExperimentTrackerEngine.logMetric(e.id, "loss", 0.5, 1);
      latheLoRAExperimentTrackerEngine.logMetric(e.id, "loss", 0.3, 2);
      expect(latheLoRAExperimentTrackerEngine.getLatestMetric(e.id, "loss")).toBe(0.3);
    });

    it("should get best metric (minimize)", () => {
      const e = latheLoRAExperimentTrackerEngine.createExperiment("exp1", {});
      latheLoRAExperimentTrackerEngine.logMetric(e.id, "loss", 0.5, 1);
      latheLoRAExperimentTrackerEngine.logMetric(e.id, "loss", 0.3, 2);
      latheLoRAExperimentTrackerEngine.logMetric(e.id, "loss", 0.4, 3);
      expect(latheLoRAExperimentTrackerEngine.getBestMetric(e.id, "loss")).toBe(0.3);
    });

    it("should get best metric (maximize)", () => {
      const e = latheLoRAExperimentTrackerEngine.createExperiment("exp1", {});
      latheLoRAExperimentTrackerEngine.logMetric(e.id, "acc", 0.5, 1);
      latheLoRAExperimentTrackerEngine.logMetric(e.id, "acc", 0.8, 2);
      expect(latheLoRAExperimentTrackerEngine.getBestMetric(e.id, "acc", "maximize")).toBe(0.8);
    });
  });

  describe("Artifacts", () => {
    it("should add artifact", () => {
      const e = latheLoRAExperimentTrackerEngine.createExperiment("exp1", {});
      latheLoRAExperimentTrackerEngine.addArtifact(e.id, {
        name: "model.safetensors",
        path: "/tmp/model",
        type: "model",
      });
      expect(e.artifacts.length).toBe(1);
    });
  });

  describe("Best Experiment", () => {
    it("should find best experiment by primary metric", () => {
      const e1 = latheLoRAExperimentTrackerEngine.createExperiment("e1", {});
      latheLoRAExperimentTrackerEngine.logMetric(e1.id, "val_loss", 0.5, 1);
      latheLoRAExperimentTrackerEngine.completeExperiment(e1.id);

      const e2 = latheLoRAExperimentTrackerEngine.createExperiment("e2", {});
      latheLoRAExperimentTrackerEngine.logMetric(e2.id, "val_loss", 0.3, 1);
      latheLoRAExperimentTrackerEngine.completeExperiment(e2.id);

      const best = latheLoRAExperimentTrackerEngine.findBestExperiment();
      expect(best!.id).toBe(e2.id);
    });

    it("should filter by tag", () => {
      const e1 = latheLoRAExperimentTrackerEngine.createExperiment("e1", {}, ["v1"]);
      latheLoRAExperimentTrackerEngine.logMetric(e1.id, "val_loss", 0.5, 1);
      latheLoRAExperimentTrackerEngine.completeExperiment(e1.id);

      const e2 = latheLoRAExperimentTrackerEngine.createExperiment("e2", {}, ["v2"]);
      latheLoRAExperimentTrackerEngine.logMetric(e2.id, "val_loss", 0.3, 1);
      latheLoRAExperimentTrackerEngine.completeExperiment(e2.id);

      const best = latheLoRAExperimentTrackerEngine.findBestExperiment("v1");
      expect(best!.id).toBe(e1.id);
    });
  });

  describe("Comparison", () => {
    it("should compare experiments", () => {
      const e1 = latheLoRAExperimentTrackerEngine.createExperiment("e1", {});
      latheLoRAExperimentTrackerEngine.logMetric(e1.id, "loss", 0.5, 1);

      const e2 = latheLoRAExperimentTrackerEngine.createExperiment("e2", {});
      latheLoRAExperimentTrackerEngine.logMetric(e2.id, "loss", 0.3, 1);

      const cmp = latheLoRAExperimentTrackerEngine.compareExperiments(e1.id, e2.id, "loss");
      expect(cmp.winner).toBe(e2.id);
    });
  });

  describe("Filters", () => {
    it("should filter by status", () => {
      const e1 = latheLoRAExperimentTrackerEngine.createExperiment("e1", {});
      latheLoRAExperimentTrackerEngine.completeExperiment(e1.id);
      latheLoRAExperimentTrackerEngine.createExperiment("e2", {});
      expect(latheLoRAExperimentTrackerEngine.getExperiments({ status: "completed" }).length).toBe(1);
    });
  });

  describe("Stats", () => {
    it("should compute stats", () => {
      latheLoRAExperimentTrackerEngine.createExperiment("e1", {});
      const stats = latheLoRAExperimentTrackerEngine.getStats();
      expect(stats.total_experiments).toBe(1);
      expect(stats.running).toBe(1);
    });

    it("should return summary", () => {
      expect(latheLoRAExperimentTrackerEngine.getSummary()).toContain("Experiment Tracker");
    });
  });
});
