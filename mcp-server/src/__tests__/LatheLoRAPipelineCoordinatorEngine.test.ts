/**
 * Tests for LatheLoRAPipelineCoordinatorEngine — LATHE-LORA-MS0 U-LLR45
 */

import { describe, it, expect, beforeEach } from "vitest";
import { latheLoRAPipelineCoordinatorEngine } from "../engines/LatheLoRAPipelineCoordinatorEngine.js";

describe("LatheLoRAPipelineCoordinatorEngine", () => {
  beforeEach(() => {
    latheLoRAPipelineCoordinatorEngine.reset();
  });

  const makeStages = () => [
    { id: "s1", type: "data_collection" as const, name: "Collect", depends_on: [] },
    { id: "s2", type: "data_preprocessing" as const, name: "Preprocess", depends_on: ["s1"] },
    { id: "s3", type: "training" as const, name: "Train", depends_on: ["s2"] },
  ];

  describe("Configuration", () => {
    it("should have default config", () => {
      const c = latheLoRAPipelineCoordinatorEngine.getConfig();
      expect(c.max_parallel_stages).toBe(3);
      expect(c.fail_fast).toBe(true);
    });

    it("should update config", () => {
      latheLoRAPipelineCoordinatorEngine.setConfig({ fail_fast: false });
      expect(latheLoRAPipelineCoordinatorEngine.getConfig().fail_fast).toBe(false);
    });
  });

  describe("Pipeline Creation", () => {
    it("should create pipeline", () => {
      const p = latheLoRAPipelineCoordinatorEngine.createPipeline("test", makeStages());
      expect(p.id).toMatch(/^pipeline-/);
      expect(p.stages.size).toBe(3);
      expect(p.status).toBe("pending");
    });

    it("should initialize all stages as pending", () => {
      const p = latheLoRAPipelineCoordinatorEngine.createPipeline("test", makeStages());
      for (const s of p.stages.values()) {
        expect(s.status).toBe("pending");
      }
    });
  });

  describe("Ready Stages", () => {
    it("should find stages with no deps", () => {
      const p = latheLoRAPipelineCoordinatorEngine.createPipeline("test", makeStages());
      const ready = latheLoRAPipelineCoordinatorEngine.getReadyStages(p.id);
      expect(ready.length).toBe(1);
      expect(ready[0].id).toBe("s1");
    });

    it("should unblock after dep completes", () => {
      const p = latheLoRAPipelineCoordinatorEngine.createPipeline("test", makeStages());
      latheLoRAPipelineCoordinatorEngine.startStage(p.id, "s1");
      latheLoRAPipelineCoordinatorEngine.completeStage(p.id, "s1");
      const ready = latheLoRAPipelineCoordinatorEngine.getReadyStages(p.id);
      expect(ready.length).toBe(1);
      expect(ready[0].id).toBe("s2");
    });
  });

  describe("Stage Lifecycle", () => {
    it("should start stage", () => {
      const p = latheLoRAPipelineCoordinatorEngine.createPipeline("test", makeStages());
      expect(latheLoRAPipelineCoordinatorEngine.startStage(p.id, "s1")).toBe(true);
      const s = p.stages.get("s1");
      expect(s!.status).toBe("running");
    });

    it("should complete stage with output", () => {
      const p = latheLoRAPipelineCoordinatorEngine.createPipeline("test", makeStages());
      latheLoRAPipelineCoordinatorEngine.startStage(p.id, "s1");
      latheLoRAPipelineCoordinatorEngine.completeStage(p.id, "s1", { rows: 1000 });
      const s = p.stages.get("s1");
      expect(s!.status).toBe("completed");
      expect(s!.output!.rows).toBe(1000);
    });

    it("should fail stage and mark pipeline failed (fail_fast)", () => {
      const p = latheLoRAPipelineCoordinatorEngine.createPipeline("test", makeStages());
      latheLoRAPipelineCoordinatorEngine.startStage(p.id, "s1");
      latheLoRAPipelineCoordinatorEngine.failStage(p.id, "s1", "err");
      const archived = latheLoRAPipelineCoordinatorEngine.getPipeline(p.id);
      expect(archived!.status).toBe("failed");
    });

    it("should skip dependents on failure when configured", () => {
      latheLoRAPipelineCoordinatorEngine.setConfig({ fail_fast: false, enable_skip_on_failure: true });
      const p = latheLoRAPipelineCoordinatorEngine.createPipeline("test", makeStages());
      latheLoRAPipelineCoordinatorEngine.startStage(p.id, "s1");
      latheLoRAPipelineCoordinatorEngine.failStage(p.id, "s1", "err");
      expect(p.stages.get("s2")!.status).toBe("skipped");
    });
  });

  describe("Pipeline Completion", () => {
    it("should mark completed when all stages done", () => {
      const p = latheLoRAPipelineCoordinatorEngine.createPipeline("test", makeStages());
      for (const s of ["s1", "s2", "s3"]) {
        latheLoRAPipelineCoordinatorEngine.startStage(p.id, s);
        latheLoRAPipelineCoordinatorEngine.completeStage(p.id, s);
      }
      const archived = latheLoRAPipelineCoordinatorEngine.getPipeline(p.id);
      expect(archived!.status).toBe("completed");
    });
  });

  describe("Progress", () => {
    it("should compute progress", () => {
      const p = latheLoRAPipelineCoordinatorEngine.createPipeline("test", makeStages());
      expect(latheLoRAPipelineCoordinatorEngine.getProgress(p.id)).toBe(0);
      latheLoRAPipelineCoordinatorEngine.startStage(p.id, "s1");
      latheLoRAPipelineCoordinatorEngine.completeStage(p.id, "s1");
      expect(latheLoRAPipelineCoordinatorEngine.getProgress(p.id)).toBeCloseTo(1 / 3, 3);
    });
  });

  describe("Cancellation", () => {
    it("should cancel pipeline", () => {
      const p = latheLoRAPipelineCoordinatorEngine.createPipeline("test", makeStages());
      expect(latheLoRAPipelineCoordinatorEngine.cancel(p.id)).toBe(true);
      const cancelled = latheLoRAPipelineCoordinatorEngine.getPipeline(p.id);
      expect(cancelled!.status).toBe("cancelled");
    });
  });

  describe("Stats", () => {
    it("should compute stats", () => {
      const p = latheLoRAPipelineCoordinatorEngine.createPipeline("test", makeStages());
      for (const s of ["s1", "s2", "s3"]) {
        latheLoRAPipelineCoordinatorEngine.startStage(p.id, s);
        latheLoRAPipelineCoordinatorEngine.completeStage(p.id, s);
      }
      const stats = latheLoRAPipelineCoordinatorEngine.getStats();
      expect(stats.completed_pipelines).toBe(1);
    });

    it("should return summary", () => {
      expect(latheLoRAPipelineCoordinatorEngine.getSummary()).toContain("Pipeline Coordinator");
    });
  });
});
