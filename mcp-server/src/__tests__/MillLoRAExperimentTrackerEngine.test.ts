/**
 * MillLoRAExperimentTrackerEngine — Test Suite
 * =============================================
 * MILL-PARITY-UPGRADE-MS0 / U-MILL-LORA-EXPERIMENT-TRACKER (iter91)
 *
 * Mill parity for LatheLoRAExperimentTrackerEngine.test.ts with MILL-CANONICAL
 * coverage:
 *   - Per-axis_mode experiment scope
 *   - Mill-canonical metric vocabulary with auto-resolved direction
 *   - Mill-canonical artifact types
 *   - findBestPerAxis() per-axis_mode best-of map
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  MillLoRAExperimentTrackerEngine,
  MILL_CANONICAL_METRICS,
  MILL_CANONICAL_ARTIFACT_TYPES,
  type MillExperiment,
} from "../engines/MillLoRAExperimentTrackerEngine.js";

describe("MillLoRAExperimentTrackerEngine", () => {
  let engine: MillLoRAExperimentTrackerEngine;

  beforeEach(() => {
    engine = new MillLoRAExperimentTrackerEngine();
  });

  describe("MILL_CANONICAL_METRICS vocabulary", () => {
    it("registers 5 mill-canonical metrics", () => {
      expect(Object.keys(MILL_CANONICAL_METRICS).sort()).toEqual([
        "chatter_violation_rate",
        "dimensional_pass_pct",
        "fpa_pass_rate",
        "surface_finish_ra_um",
        "tcpm_solver_failure_rate",
      ]);
    });

    it("chatter / tcpm / surface are minimize", () => {
      expect(MILL_CANONICAL_METRICS["chatter_violation_rate"]).toBe("minimize");
      expect(MILL_CANONICAL_METRICS["tcpm_solver_failure_rate"]).toBe("minimize");
      expect(MILL_CANONICAL_METRICS["surface_finish_ra_um"]).toBe("minimize");
    });

    it("fpa / dimensional are maximize", () => {
      expect(MILL_CANONICAL_METRICS["fpa_pass_rate"]).toBe("maximize");
      expect(MILL_CANONICAL_METRICS["dimensional_pass_pct"]).toBe("maximize");
    });
  });

  describe("MILL_CANONICAL_ARTIFACT_TYPES", () => {
    it("registers 3 mill-canonical artifact types", () => {
      expect(MILL_CANONICAL_ARTIFACT_TYPES.length).toBe(3);
      expect(MILL_CANONICAL_ARTIFACT_TYPES).toContain("vericut_log");
      expect(MILL_CANONICAL_ARTIFACT_TYPES).toContain("post_processor_dump");
      expect(MILL_CANONICAL_ARTIFACT_TYPES).toContain("op_time_breakdown");
    });
  });

  describe("createExperiment", () => {
    it("creates a running experiment with default axis_mode=shared", () => {
      const e = engine.createExperiment("test-1", { lr: 0.001 });
      expect(e.status).toBe("running");
      expect(e.axis_mode).toBe("shared");
      expect(e.hyperparameters.lr).toBeCloseTo(0.001, 6);
    });

    it("accepts opts.axis_mode + tags + description", () => {
      const e = engine.createExperiment("e1", { lr: 0.001 }, {
        axis_mode: "5_axis_simul",
        tags: ["baseline", "5ax"],
        description: "First 5-axis run",
      });
      expect(e.axis_mode).toBe("5_axis_simul");
      expect(e.tags).toEqual(["baseline", "5ax"]);
      expect(e.description).toBe("First 5-axis run");
    });
  });

  describe("logMetric / logMetrics", () => {
    it("logs single metric on a running experiment", () => {
      const e = engine.createExperiment("e", {});
      expect(engine.logMetric(e.id, "loss", 0.5, 0)).toBe(true);
      expect(engine.logMetric(e.id, "loss", 0.4, 1)).toBe(true);
      const series = engine.getMetricSeries(e.id, "loss");
      expect(series.length).toBe(2);
    });

    it("rejects metrics on completed experiments", () => {
      const e = engine.createExperiment("e", {});
      engine.completeExperiment(e.id);
      expect(engine.logMetric(e.id, "loss", 0.1, 0)).toBe(false);
    });

    it("logs batch via logMetrics", () => {
      const e = engine.createExperiment("e", {});
      engine.logMetrics(e.id, { loss: 0.5, val_loss: 0.6, chatter_violation_rate: 0.03 }, 0);
      expect(engine.getMetricSeries(e.id, "loss").length).toBe(1);
      expect(engine.getMetricSeries(e.id, "val_loss").length).toBe(1);
      expect(engine.getMetricSeries(e.id, "chatter_violation_rate").length).toBe(1);
    });

    it("respects max_metrics_per_experiment cap (sliding window)", () => {
      engine.setConfig({ max_metrics_per_experiment: 10 });
      const e = engine.createExperiment("e", {});
      for (let i = 0; i < 15; i++) engine.logMetric(e.id, "m", i, i);
      const series = engine.getMetricSeries(e.id, "m");
      expect(series.length <= 11).toBe(true);
    });
  });

  describe("getMetricGoal — MILL-CANONICAL direction resolution", () => {
    it("returns minimize for chatter_violation_rate (mill-canonical)", () => {
      expect(engine.getMetricGoal("chatter_violation_rate")).toBe("minimize");
    });

    it("returns maximize for fpa_pass_rate (mill-canonical)", () => {
      expect(engine.getMetricGoal("fpa_pass_rate")).toBe("maximize");
    });

    it("falls back to config metric_goal for unknown metrics", () => {
      engine.setConfig({ metric_goal: "minimize" });
      expect(engine.getMetricGoal("val_loss")).toBe("minimize");
      engine.setConfig({ metric_goal: "maximize" });
      expect(engine.getMetricGoal("custom_unknown")).toBe("maximize");
    });
  });

  describe("getBestMetric — direction auto-resolved", () => {
    it("picks minimum for chatter_violation_rate without explicit goal", () => {
      const e = engine.createExperiment("e", {});
      engine.logMetric(e.id, "chatter_violation_rate", 0.05, 0);
      engine.logMetric(e.id, "chatter_violation_rate", 0.03, 1);
      engine.logMetric(e.id, "chatter_violation_rate", 0.07, 2);
      expect(engine.getBestMetric(e.id, "chatter_violation_rate")).toBeCloseTo(0.03, 6);
    });

    it("picks maximum for fpa_pass_rate without explicit goal", () => {
      const e = engine.createExperiment("e", {});
      engine.logMetric(e.id, "fpa_pass_rate", 0.85, 0);
      engine.logMetric(e.id, "fpa_pass_rate", 0.95, 1);
      engine.logMetric(e.id, "fpa_pass_rate", 0.90, 2);
      expect(engine.getBestMetric(e.id, "fpa_pass_rate")).toBeCloseTo(0.95, 6);
    });

    it("explicit goal overrides mill-canonical default", () => {
      const e = engine.createExperiment("e", {});
      engine.logMetric(e.id, "chatter_violation_rate", 0.05, 0);
      engine.logMetric(e.id, "chatter_violation_rate", 0.03, 1);
      expect(engine.getBestMetric(e.id, "chatter_violation_rate", "maximize")).toBeCloseTo(0.05, 6);
    });

    it("returns undefined for empty metric series", () => {
      const e = engine.createExperiment("e", {});
      const r = engine.getBestMetric(e.id, "nonexistent");
      expect(r === undefined).toBe(true);
    });
  });

  describe("getLatestMetric", () => {
    it("returns the last step's value", () => {
      const e = engine.createExperiment("e", {});
      engine.logMetric(e.id, "loss", 0.5, 0);
      engine.logMetric(e.id, "loss", 0.3, 1);
      expect(engine.getLatestMetric(e.id, "loss")).toBeCloseTo(0.3, 6);
    });
  });

  describe("addArtifact (mill-canonical types accepted)", () => {
    it("accepts vericut_log", () => {
      const e = engine.createExperiment("e", {});
      expect(engine.addArtifact(e.id, {
        name: "vericut-run-1", path: "/v/r1.log", type: "vericut_log",
      })).toBe(true);
    });

    it("accepts post_processor_dump", () => {
      const e = engine.createExperiment("e", {});
      expect(engine.addArtifact(e.id, {
        name: "mc-post", path: "/p/m.nc", type: "post_processor_dump",
      })).toBe(true);
    });

    it("accepts op_time_breakdown", () => {
      const e = engine.createExperiment("e", {});
      expect(engine.addArtifact(e.id, {
        name: "iter86", path: "/o/b.json", type: "op_time_breakdown",
      })).toBe(true);
    });
  });

  describe("completeExperiment", () => {
    it("transitions running → completed with timestamp", () => {
      const e = engine.createExperiment("e", {});
      expect(engine.completeExperiment(e.id)).toBe(true);
      const got = engine.getExperiment(e.id);
      expect((got as { status: string }).status).toBe("completed");
      expect(typeof (got as { completed_at: number }).completed_at).toBe("number");
    });

    it("allows failed status", () => {
      const e = engine.createExperiment("e", {});
      engine.completeExperiment(e.id, "failed");
      const got = engine.getExperiment(e.id);
      expect((got as { status: string }).status).toBe("failed");
    });

    it("rejects double-complete", () => {
      const e = engine.createExperiment("e", {});
      engine.completeExperiment(e.id);
      expect(engine.completeExperiment(e.id)).toBe(false);
    });
  });

  describe("findBestExperiment", () => {
    it("picks lowest chatter across completed experiments", () => {
      const a = engine.createExperiment("a", {});
      engine.logMetric(a.id, "chatter_violation_rate", 0.05, 0);
      engine.completeExperiment(a.id);
      const b = engine.createExperiment("b", {});
      engine.logMetric(b.id, "chatter_violation_rate", 0.02, 0);
      engine.completeExperiment(b.id);

      const best = engine.findBestExperiment({ metric: "chatter_violation_rate" });
      expect((best as MillExperiment).id).toBe(b.id);
    });

    it("MILL-CANONICAL: filters by axis_mode", () => {
      const e3 = engine.createExperiment("e3", {}, { axis_mode: "3_axis" });
      engine.logMetric(e3.id, "fpa_pass_rate", 0.90, 0);
      engine.completeExperiment(e3.id);
      const e5 = engine.createExperiment("e5", {}, { axis_mode: "5_axis_simul" });
      engine.logMetric(e5.id, "fpa_pass_rate", 0.80, 0);
      engine.completeExperiment(e5.id);

      const best3 = engine.findBestExperiment({ axis_mode: "3_axis", metric: "fpa_pass_rate" });
      const best5 = engine.findBestExperiment({ axis_mode: "5_axis_simul", metric: "fpa_pass_rate" });
      expect((best3 as MillExperiment).id).toBe(e3.id);
      expect((best5 as MillExperiment).id).toBe(e5.id);
    });

    it("filters by tag", () => {
      const a = engine.createExperiment("a", {}, { tags: ["v1"] });
      engine.logMetric(a.id, "val_loss", 0.5, 0);
      engine.completeExperiment(a.id);
      const b = engine.createExperiment("b", {}, { tags: ["v2"] });
      engine.logMetric(b.id, "val_loss", 0.3, 0);
      engine.completeExperiment(b.id);

      const best = engine.findBestExperiment({ tag: "v1", metric: "val_loss" });
      expect((best as MillExperiment).id).toBe(a.id);
    });

    it("returns null when no completed experiments exist", () => {
      expect(engine.findBestExperiment()).toBe(null);
    });
  });

  describe("MILL-CANONICAL: findBestPerAxis", () => {
    it("returns best per-axis_mode entry", () => {
      const e3 = engine.createExperiment("e3", {}, { axis_mode: "3_axis" });
      engine.logMetric(e3.id, "fpa_pass_rate", 0.95, 0);
      engine.completeExperiment(e3.id);
      const e5 = engine.createExperiment("e5", {}, { axis_mode: "5_axis_simul" });
      engine.logMetric(e5.id, "fpa_pass_rate", 0.85, 0);
      engine.completeExperiment(e5.id);

      const map = engine.findBestPerAxis("fpa_pass_rate");
      expect((map["3_axis"] as MillExperiment).id).toBe(e3.id);
      expect((map["5_axis_simul"] as MillExperiment).id).toBe(e5.id);
    });

    it("omits axes with no completed experiments", () => {
      const e3 = engine.createExperiment("e3", {}, { axis_mode: "3_axis" });
      engine.logMetric(e3.id, "val_loss", 0.5, 0);
      engine.completeExperiment(e3.id);
      const map = engine.findBestPerAxis();
      expect("4_axis_index" in map).toBe(false);
      expect("5_axis_simul" in map).toBe(false);
    });
  });

  describe("compareExperiments", () => {
    it("picks lower val_loss as winner (minimize default)", () => {
      const a = engine.createExperiment("a", {});
      engine.logMetric(a.id, "val_loss", 0.5, 0);
      const b = engine.createExperiment("b", {});
      engine.logMetric(b.id, "val_loss", 0.3, 0);
      const r = engine.compareExperiments(a.id, b.id, "val_loss");
      expect(r.winner).toBe(b.id);
    });

    it("uses mill-canonical direction for chatter (minimize)", () => {
      const a = engine.createExperiment("a", {});
      engine.logMetric(a.id, "chatter_violation_rate", 0.03, 0);
      const b = engine.createExperiment("b", {});
      engine.logMetric(b.id, "chatter_violation_rate", 0.05, 0);
      const r = engine.compareExperiments(a.id, b.id, "chatter_violation_rate");
      expect(r.winner).toBe(a.id);
    });

    it("uses mill-canonical direction for fpa (maximize)", () => {
      const a = engine.createExperiment("a", {});
      engine.logMetric(a.id, "fpa_pass_rate", 0.95, 0);
      const b = engine.createExperiment("b", {});
      engine.logMetric(b.id, "fpa_pass_rate", 0.85, 0);
      const r = engine.compareExperiments(a.id, b.id, "fpa_pass_rate");
      expect(r.winner).toBe(a.id);
    });

    it("returns null winner on tie", () => {
      const a = engine.createExperiment("a", {});
      engine.logMetric(a.id, "val_loss", 0.5, 0);
      const b = engine.createExperiment("b", {});
      engine.logMetric(b.id, "val_loss", 0.5, 0);
      const r = engine.compareExperiments(a.id, b.id, "val_loss");
      expect(r.winner).toBe(null);
    });

    it("returns null winner when either side missing the metric", () => {
      const a = engine.createExperiment("a", {});
      engine.logMetric(a.id, "val_loss", 0.5, 0);
      const b = engine.createExperiment("b", {});
      const r = engine.compareExperiments(a.id, b.id, "val_loss");
      expect(r.winner).toBe(null);
    });
  });

  describe("getExperiments filtering", () => {
    it("filters by status", () => {
      const a = engine.createExperiment("a", {});
      const b = engine.createExperiment("b", {});
      engine.completeExperiment(a.id);
      expect(engine.getExperiments({ status: "completed" }).length).toBe(1);
      expect(engine.getExperiments({ status: "running" }).length).toBe(1);
    });

    it("filters by axis_mode", () => {
      engine.createExperiment("a", {}, { axis_mode: "3_axis" });
      engine.createExperiment("b", {}, { axis_mode: "5_axis_simul" });
      engine.createExperiment("c", {}, { axis_mode: "5_axis_simul" });
      expect(engine.getExperiments({ axis_mode: "5_axis_simul" }).length).toBe(2);
      expect(engine.getExperiments({ axis_mode: "3_axis" }).length).toBe(1);
    });

    it("filters by tag", () => {
      engine.createExperiment("a", {}, { tags: ["t1"] });
      engine.createExperiment("b", {}, { tags: ["t2"] });
      expect(engine.getExperiments({ tag: "t1" }).length).toBe(1);
    });
  });

  describe("archive", () => {
    it("moves experiment to archived status", () => {
      const e = engine.createExperiment("e", {});
      engine.archive(e.id);
      const got = engine.getExperiment(e.id);
      expect((got as { status: string }).status).toBe("archived");
    });
  });

  describe("getStats", () => {
    it("includes experiments_by_axis and artifacts_by_type breakdowns", () => {
      const e3 = engine.createExperiment("e3", {}, { axis_mode: "3_axis" });
      engine.addArtifact(e3.id, { name: "v", path: "/v", type: "vericut_log" });
      engine.addArtifact(e3.id, { name: "p", path: "/p", type: "post_processor_dump" });
      engine.createExperiment("e5", {}, { axis_mode: "5_axis_simul" });

      const s = engine.getStats();
      expect(s.total_experiments).toBe(2);
      expect(s.experiments_by_axis["3_axis"]).toBe(1);
      expect(s.experiments_by_axis["5_axis_simul"]).toBe(1);
      expect(s.artifacts_by_type["vericut_log"]).toBe(1);
      expect(s.artifacts_by_type["post_processor_dump"]).toBe(1);
    });
  });

  describe("reset", () => {
    it("clears all experiments and reverts config", () => {
      const e = engine.createExperiment("e", {});
      engine.logMetric(e.id, "loss", 0.5, 0);
      engine.setConfig({ primary_metric: "custom" });
      engine.reset();
      expect(engine.getStats().total_experiments).toBe(0);
      expect(engine.getConfig().primary_metric).toBe("val_loss");
    });
  });
});
