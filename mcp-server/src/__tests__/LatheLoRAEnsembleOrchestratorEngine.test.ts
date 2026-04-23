/**
 * Tests for LatheLoRAEnsembleOrchestratorEngine — LATHE-LORA-MS0 U-LLR44
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  latheLoRAEnsembleOrchestratorEngine,
  type ModelExecution,
} from "../engines/LatheLoRAEnsembleOrchestratorEngine.js";

describe("LatheLoRAEnsembleOrchestratorEngine", () => {
  beforeEach(() => {
    latheLoRAEnsembleOrchestratorEngine.reset();
  });

  describe("Configuration", () => {
    it("should have default config", () => {
      const config = latheLoRAEnsembleOrchestratorEngine.getConfig();
      expect(config.default_mode).toBe("parallel");
      expect(config.max_models_per_run).toBe(5);
      expect(config.min_successful_for_consensus).toBe(2);
    });

    it("should update config", () => {
      latheLoRAEnsembleOrchestratorEngine.setConfig({ default_mode: "sequential" });
      expect(latheLoRAEnsembleOrchestratorEngine.getConfig().default_mode).toBe("sequential");
    });
  });

  describe("Run Lifecycle", () => {
    it("should start a run", () => {
      const run = latheLoRAEnsembleOrchestratorEngine.startRun("test input", ["m1", "m2"]);
      expect(run.id).toMatch(/^run-/);
      expect(run.status).toBe("running");
      expect(run.models_requested).toEqual(["m1", "m2"]);
    });

    it("should throw on no models", () => {
      expect(() => latheLoRAEnsembleOrchestratorEngine.startRun("test", [])).toThrow();
    });

    it("should throw on too many models", () => {
      expect(() =>
        latheLoRAEnsembleOrchestratorEngine.startRun("test", ["m1", "m2", "m3", "m4", "m5", "m6"]),
      ).toThrow();
    });

    it("should track active runs", () => {
      latheLoRAEnsembleOrchestratorEngine.startRun("t1", ["m1"]);
      latheLoRAEnsembleOrchestratorEngine.startRun("t2", ["m1"]);
      expect(latheLoRAEnsembleOrchestratorEngine.getActiveRuns().length).toBe(2);
    });
  });

  describe("Execution Recording", () => {
    it("should record execution", () => {
      const run = latheLoRAEnsembleOrchestratorEngine.startRun("test", ["m1", "m2"]);
      const exec: ModelExecution = {
        model_id: "m1",
        status: "success",
        prediction: "output1",
        confidence: 0.9,
        latency_ms: 200,
      };
      expect(latheLoRAEnsembleOrchestratorEngine.recordExecution(run.id, exec)).toBe(true);
      expect(run.executions.length).toBe(1);
    });

    it("should fail for unknown run", () => {
      const exec: ModelExecution = {
        model_id: "m1",
        status: "success",
        confidence: 0.9,
        latency_ms: 100,
      };
      expect(latheLoRAEnsembleOrchestratorEngine.recordExecution("unknown", exec)).toBe(false);
    });

    it("should use max latency for parallel", () => {
      const run = latheLoRAEnsembleOrchestratorEngine.startRun("t", ["m1", "m2"], "parallel");
      latheLoRAEnsembleOrchestratorEngine.recordExecution(run.id, {
        model_id: "m1",
        status: "success",
        confidence: 0.9,
        latency_ms: 100,
      });
      latheLoRAEnsembleOrchestratorEngine.recordExecution(run.id, {
        model_id: "m2",
        status: "success",
        confidence: 0.8,
        latency_ms: 300,
      });
      expect(run.total_latency_ms).toBe(300);
    });

    it("should sum latency for sequential", () => {
      const run = latheLoRAEnsembleOrchestratorEngine.startRun("t", ["m1", "m2"], "sequential");
      latheLoRAEnsembleOrchestratorEngine.recordExecution(run.id, {
        model_id: "m1",
        status: "success",
        confidence: 0.9,
        latency_ms: 100,
      });
      latheLoRAEnsembleOrchestratorEngine.recordExecution(run.id, {
        model_id: "m2",
        status: "success",
        confidence: 0.8,
        latency_ms: 200,
      });
      expect(run.total_latency_ms).toBe(300);
    });
  });

  describe("Cascade Early Stop", () => {
    it("should signal stop on high confidence", () => {
      const run = latheLoRAEnsembleOrchestratorEngine.startRun("t", ["m1", "m2"], "cascade");
      latheLoRAEnsembleOrchestratorEngine.recordExecution(run.id, {
        model_id: "m1",
        status: "success",
        confidence: 0.97,
        latency_ms: 100,
      });
      expect(latheLoRAEnsembleOrchestratorEngine.shouldCascadeStop(run.id)).toBe(true);
    });

    it("should not stop on low confidence", () => {
      const run = latheLoRAEnsembleOrchestratorEngine.startRun("t", ["m1", "m2"], "cascade");
      latheLoRAEnsembleOrchestratorEngine.recordExecution(run.id, {
        model_id: "m1",
        status: "success",
        confidence: 0.5,
        latency_ms: 100,
      });
      expect(latheLoRAEnsembleOrchestratorEngine.shouldCascadeStop(run.id)).toBe(false);
    });

    it("should return false for non-cascade mode", () => {
      const run = latheLoRAEnsembleOrchestratorEngine.startRun("t", ["m1"], "parallel");
      latheLoRAEnsembleOrchestratorEngine.recordExecution(run.id, {
        model_id: "m1",
        status: "success",
        confidence: 0.99,
        latency_ms: 100,
      });
      expect(latheLoRAEnsembleOrchestratorEngine.shouldCascadeStop(run.id)).toBe(false);
    });
  });

  describe("Run Completion", () => {
    it("should complete a run with consensus", () => {
      const run = latheLoRAEnsembleOrchestratorEngine.startRun("t", ["m1", "m2"]);
      latheLoRAEnsembleOrchestratorEngine.recordExecution(run.id, {
        model_id: "m1",
        status: "success",
        prediction: "A",
        confidence: 0.9,
        latency_ms: 100,
      });
      latheLoRAEnsembleOrchestratorEngine.recordExecution(run.id, {
        model_id: "m2",
        status: "success",
        prediction: "A",
        confidence: 0.8,
        latency_ms: 150,
      });
      const completed = latheLoRAEnsembleOrchestratorEngine.completeRun(run.id);
      expect(completed).not.toBeNull();
      expect(completed!.status).toBe("completed");
      expect(completed!.final_prediction).toBe("A");
      expect(completed!.consensus_reached).toBe(true);
    });

    it("should mark partial when some fail", () => {
      const run = latheLoRAEnsembleOrchestratorEngine.startRun("t", ["m1", "m2"]);
      latheLoRAEnsembleOrchestratorEngine.recordExecution(run.id, {
        model_id: "m1",
        status: "success",
        prediction: "A",
        confidence: 0.9,
        latency_ms: 100,
      });
      latheLoRAEnsembleOrchestratorEngine.recordExecution(run.id, {
        model_id: "m2",
        status: "failure",
        confidence: 0,
        latency_ms: 50,
      });
      const completed = latheLoRAEnsembleOrchestratorEngine.completeRun(run.id);
      expect(completed!.status).toBe("partial");
    });

    it("should mark failed when all fail", () => {
      const run = latheLoRAEnsembleOrchestratorEngine.startRun("t", ["m1"]);
      latheLoRAEnsembleOrchestratorEngine.recordExecution(run.id, {
        model_id: "m1",
        status: "failure",
        confidence: 0,
        latency_ms: 50,
      });
      const completed = latheLoRAEnsembleOrchestratorEngine.completeRun(run.id);
      expect(completed!.status).toBe("failed");
    });

    it("should compute confidence-weighted numeric value", () => {
      const run = latheLoRAEnsembleOrchestratorEngine.startRun("t", ["m1", "m2"]);
      latheLoRAEnsembleOrchestratorEngine.recordExecution(run.id, {
        model_id: "m1",
        status: "success",
        prediction: "val",
        numeric_value: 100,
        confidence: 0.8,
        latency_ms: 100,
      });
      latheLoRAEnsembleOrchestratorEngine.recordExecution(run.id, {
        model_id: "m2",
        status: "success",
        prediction: "val",
        numeric_value: 200,
        confidence: 0.2,
        latency_ms: 100,
      });
      const completed = latheLoRAEnsembleOrchestratorEngine.completeRun(run.id);
      // (100*0.8 + 200*0.2) / 1.0 = 120
      expect(completed!.final_value).toBeCloseTo(120, 1);
    });

    it("should move to completedRuns", () => {
      const run = latheLoRAEnsembleOrchestratorEngine.startRun("t", ["m1"]);
      latheLoRAEnsembleOrchestratorEngine.recordExecution(run.id, {
        model_id: "m1",
        status: "success",
        prediction: "A",
        confidence: 0.9,
        latency_ms: 100,
      });
      latheLoRAEnsembleOrchestratorEngine.completeRun(run.id);
      expect(latheLoRAEnsembleOrchestratorEngine.getActiveRuns().length).toBe(0);
      expect(latheLoRAEnsembleOrchestratorEngine.getCompletedRuns().length).toBe(1);
    });
  });

  describe("Run Lookup", () => {
    it("should find active run", () => {
      const run = latheLoRAEnsembleOrchestratorEngine.startRun("t", ["m1"]);
      expect(latheLoRAEnsembleOrchestratorEngine.getRun(run.id)).toBeDefined();
    });

    it("should find completed run", () => {
      const run = latheLoRAEnsembleOrchestratorEngine.startRun("t", ["m1"]);
      latheLoRAEnsembleOrchestratorEngine.recordExecution(run.id, {
        model_id: "m1",
        status: "success",
        prediction: "A",
        confidence: 0.9,
        latency_ms: 100,
      });
      latheLoRAEnsembleOrchestratorEngine.completeRun(run.id);
      expect(latheLoRAEnsembleOrchestratorEngine.getRun(run.id)).toBeDefined();
    });
  });

  describe("Stats", () => {
    it("should compute stats", () => {
      const run = latheLoRAEnsembleOrchestratorEngine.startRun("t", ["m1", "m2"]);
      latheLoRAEnsembleOrchestratorEngine.recordExecution(run.id, {
        model_id: "m1",
        status: "success",
        prediction: "A",
        confidence: 0.9,
        latency_ms: 100,
      });
      latheLoRAEnsembleOrchestratorEngine.recordExecution(run.id, {
        model_id: "m2",
        status: "success",
        prediction: "A",
        confidence: 0.8,
        latency_ms: 100,
      });
      latheLoRAEnsembleOrchestratorEngine.completeRun(run.id);
      const stats = latheLoRAEnsembleOrchestratorEngine.getStats();
      expect(stats.total_runs).toBe(1);
      expect(stats.completed_runs).toBe(1);
      expect(stats.consensus_rate).toBe(1);
    });

    it("should return empty stats when no runs", () => {
      const stats = latheLoRAEnsembleOrchestratorEngine.getStats();
      expect(stats.total_runs).toBe(0);
    });

    it("should return summary", () => {
      expect(latheLoRAEnsembleOrchestratorEngine.getSummary()).toContain("Ensemble Orchestrator");
    });
  });
});
