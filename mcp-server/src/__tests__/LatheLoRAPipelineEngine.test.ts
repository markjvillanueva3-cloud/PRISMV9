/**
 * LatheLoRAPipelineEngine Tests
 * U-LLR02: Pipeline orchestrator tests
 */

import { describe, it, expect, beforeEach } from "vitest";
import { latheLoRAPipelineEngine } from "../engines/LatheLoRAPipelineEngine.js";

describe("LatheLoRAPipelineEngine", () => {
  beforeEach(() => {
    latheLoRAPipelineEngine.reset();
  });

  describe("configuration", () => {
    it("returns default config", () => {
      const config = latheLoRAPipelineEngine.getConfig();
      expect(config.base_model).toBe("unsloth/llama-3-8b-bnb-4bit");
      expect(config.stages.length).toBe(7);
      expect(config.training_preset).toBe("balanced");
    });

    it("merges partial config", () => {
      const config = latheLoRAPipelineEngine.setConfig({
        training_preset: "quality",
        quant_format: "awq",
      });
      expect(config.training_preset).toBe("quality");
      expect(config.quant_format).toBe("awq");
      expect(config.deploy_target).toBe("ollama");
    });
  });

  describe("state management", () => {
    it("returns null when not initialized", () => {
      expect(latheLoRAPipelineEngine.getState()).toBeNull();
    });

    it("initializes pipeline state", () => {
      const state = latheLoRAPipelineEngine.initializePipeline();
      expect(state.status).toBe("idle");
      expect(state.current_stage).toBeNull();
      expect(state.stage_results).toHaveLength(0);
      expect(state.started_at).toBeDefined();
    });
  });

  describe("stage execution", () => {
    beforeEach(() => {
      latheLoRAPipelineEngine.initializePipeline();
    });

    it("starts a stage", () => {
      const result = latheLoRAPipelineEngine.startStage("dataset");
      expect(result.status).toBe("running");
      expect(result.stage).toBe("dataset");
      expect(result.started_at).toBeDefined();

      const state = latheLoRAPipelineEngine.getState();
      expect(state?.current_stage).toBe("dataset");
      expect(state?.status).toBe("running");
    });

    it("skips stages in skip list", () => {
      latheLoRAPipelineEngine.setConfig({ skip_stages: ["evaluation"] });
      latheLoRAPipelineEngine.initializePipeline();

      const result = latheLoRAPipelineEngine.startStage("evaluation");
      expect(result.status).toBe("skipped");
    });

    it("completes a stage with outputs", () => {
      latheLoRAPipelineEngine.startStage("dataset");
      const result = latheLoRAPipelineEngine.completeStage(
        "dataset",
        { data_path: "/data/train.jsonl" },
        { examples: 1500 }
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.data_path).toBe("/data/train.jsonl");
      expect(result.metrics?.examples).toBe(1500);
      expect(result.duration_ms).toBeDefined();
    });

    it("fails a stage with error", () => {
      latheLoRAPipelineEngine.startStage("training");
      const result = latheLoRAPipelineEngine.failStage("training", "CUDA out of memory");

      expect(result.status).toBe("failed");
      expect(result.error).toBe("CUDA out of memory");

      const state = latheLoRAPipelineEngine.getState();
      expect(state?.status).toBe("failed");
    });

    it("throws when pipeline not initialized", () => {
      latheLoRAPipelineEngine.reset();
      expect(() => latheLoRAPipelineEngine.startStage("dataset")).toThrow();
    });
  });

  describe("stage commands", () => {
    it("generates dataset command", () => {
      const cmd = latheLoRAPipelineEngine.getStageCommand("dataset");
      expect(cmd).toContain("build_dataset.py");
      expect(cmd).toContain("JM DIE");
    });

    it("generates training command", () => {
      latheLoRAPipelineEngine.setConfig({ training_preset: "quality" });
      const cmd = latheLoRAPipelineEngine.getStageCommand("training");
      expect(cmd).toContain("train_lathe_lora.py");
      expect(cmd).toContain("--preset quality");
    });

    it("generates quantize command for gguf", () => {
      const cmd = latheLoRAPipelineEngine.getStageCommand("quantize");
      expect(cmd).toContain("quantize_gguf.py");
    });

    it("generates deploy command for ollama", () => {
      const cmd = latheLoRAPipelineEngine.getStageCommand("deploy");
      expect(cmd).toContain("ollama create");
    });
  });

  describe("pipeline script", () => {
    it("generates bash script with all stages", () => {
      const script = latheLoRAPipelineEngine.generatePipelineScript();
      expect(script).toContain("#!/usr/bin/env bash");
      expect(script).toContain("set -e");
      expect(script).toContain("Starting stage: dataset");
      expect(script).toContain("Starting stage: training");
      expect(script).toContain("Starting stage: verify");
    });

    it("skips stages in skip list", () => {
      latheLoRAPipelineEngine.setConfig({ skip_stages: ["quantize", "deploy"] });
      const script = latheLoRAPipelineEngine.generatePipelineScript();
      expect(script).toContain("# Skipping stage: quantize");
      expect(script).toContain("# Skipping stage: deploy");
    });
  });

  describe("report generation", () => {
    it("generates failure report when not initialized", () => {
      const report = latheLoRAPipelineEngine.generateReport();
      expect(report.status).toBe("failure");
      expect(report.recommendations).toContain("Pipeline was not initialized");
    });

    it("generates success report after completion", () => {
      latheLoRAPipelineEngine.initializePipeline();
      latheLoRAPipelineEngine.startStage("dataset");
      latheLoRAPipelineEngine.completeStage("dataset", {}, { dataset_size: 1000 });
      latheLoRAPipelineEngine.startStage("training");
      latheLoRAPipelineEngine.completeStage("training", {}, { training_loss: 0.5, eval_score: 85 });

      const report = latheLoRAPipelineEngine.generateReport();
      expect(report.status).toBe("success");
      expect(report.stages_completed).toBe(2);
      expect(report.metrics.dataset_size).toBe(1000);
      expect(report.metrics.eval_score).toBe(85);
    });

    it("generates partial report with failures", () => {
      latheLoRAPipelineEngine.initializePipeline();
      latheLoRAPipelineEngine.startStage("dataset");
      latheLoRAPipelineEngine.completeStage("dataset", {}, {});
      latheLoRAPipelineEngine.startStage("training");
      latheLoRAPipelineEngine.failStage("training", "OOM");

      const report = latheLoRAPipelineEngine.generateReport();
      expect(report.status).toBe("partial");
      expect(report.stages_completed).toBe(1);
      expect(report.stages_failed).toBe(1);
      expect(report.recommendations).toContain("Fix failed stages: training");
    });
  });

  describe("validation", () => {
    it("validates valid config", () => {
      const result = latheLoRAPipelineEngine.validateConfig();
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("errors on missing pipeline_id", () => {
      latheLoRAPipelineEngine.setConfig({ pipeline_id: "" });
      const result = latheLoRAPipelineEngine.validateConfig();
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("pipeline_id is required");
    });

    it("warns on low eval threshold", () => {
      latheLoRAPipelineEngine.setConfig({ eval_threshold: 40 });
      const result = latheLoRAPipelineEngine.validateConfig();
      expect(result.warnings).toContain("eval_threshold < 50 may allow low-quality models");
    });
  });

  describe("dependencies", () => {
    it("returns empty deps for dataset", () => {
      expect(latheLoRAPipelineEngine.getStageDependencies("dataset")).toHaveLength(0);
    });

    it("returns training dep for evaluation", () => {
      expect(latheLoRAPipelineEngine.getStageDependencies("evaluation")).toContain("training");
    });

    it("returns full chain for verify", () => {
      const deps = latheLoRAPipelineEngine.getStageDependencies("verify");
      expect(deps).toContain("deploy");
    });
  });

  describe("canRunStage", () => {
    it("cannot run when not initialized", () => {
      const result = latheLoRAPipelineEngine.canRunStage("dataset");
      expect(result.can).toBe(false);
      expect(result.reason).toBe("Pipeline not initialized");
    });

    it("can run dataset without deps", () => {
      latheLoRAPipelineEngine.initializePipeline();
      const result = latheLoRAPipelineEngine.canRunStage("dataset");
      expect(result.can).toBe(true);
    });

    it("cannot run evaluation without training", () => {
      latheLoRAPipelineEngine.initializePipeline();
      const result = latheLoRAPipelineEngine.canRunStage("evaluation");
      expect(result.can).toBe(false);
      expect(result.reason).toContain("training");
    });
  });

  describe("duration estimation", () => {
    it("estimates total duration", () => {
      const est = latheLoRAPipelineEngine.getEstimatedDuration();
      expect(est.total_minutes).toBeGreaterThan(100);
      expect(est.by_stage.training).toBe(120);
    });

    it("excludes skipped stages", () => {
      latheLoRAPipelineEngine.setConfig({ skip_stages: ["training"] });
      const est = latheLoRAPipelineEngine.getEstimatedDuration();
      expect(est.by_stage.training).toBeUndefined();
      expect(est.total_minutes).toBeLessThan(100);
    });
  });

  describe("formatting", () => {
    it("formats seconds", () => {
      expect(latheLoRAPipelineEngine.formatDuration(45000)).toBe("45s");
    });

    it("formats minutes", () => {
      expect(latheLoRAPipelineEngine.formatDuration(150000)).toBe("2m 30s");
    });

    it("formats hours", () => {
      expect(latheLoRAPipelineEngine.formatDuration(7500000)).toBe("2h 5m");
    });
  });
});
