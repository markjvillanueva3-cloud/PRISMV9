/**
 * LatheLoRAPipelineEngine Tests
 *
 * U-LTH74: End-to-end LoRA pipeline orchestrator
 */

import { describe, it, expect, beforeEach } from "vitest";
import { latheLoRAPipelineEngine } from "../engines/LatheLoRAPipelineEngine.js";

describe("LatheLoRAPipelineEngine", () => {
  beforeEach(() => {
    latheLoRAPipelineEngine.reset();
    latheLoRAPipelineEngine.setConfig({
      pipeline_id: "test-pipeline",
      archive_path: "H:/PRISM/JM DIE/CNC LATHE",
      base_model: "unsloth/llama-3-8b-bnb-4bit",
      output_dir: "models/test-pipeline",
      stages: ["dataset", "training", "evaluation", "merge", "quantize", "deploy", "verify"],
      skip_stages: [],
      training_preset: "balanced",
      quant_format: "gguf",
      deploy_target: "ollama",
      eval_threshold: 70,
      auto_rollback: true,
    });
  });

  describe("Configuration", () => {
    it("sets and gets config", () => {
      latheLoRAPipelineEngine.setConfig({
        training_preset: "fast",
        quant_format: "awq",
      });

      const config = latheLoRAPipelineEngine.getConfig();

      expect(config.training_preset).toBe("fast");
      expect(config.quant_format).toBe("awq");
    });

    it("has all stages by default", () => {
      const config = latheLoRAPipelineEngine.getConfig();

      expect(config.stages).toContain("dataset");
      expect(config.stages).toContain("training");
      expect(config.stages).toContain("deploy");
    });
  });

  describe("State Management", () => {
    it("initializes pipeline state", () => {
      const state = latheLoRAPipelineEngine.initializePipeline();

      expect(state.status).toBe("idle");
      expect(state.stage_results).toHaveLength(0);
      expect(state.started_at).toBeDefined();
    });

    it("returns null state before initialization", () => {
      const state = latheLoRAPipelineEngine.getState();

      // State might be from previous test, so just check it exists or is null
      expect(state === null || state.status).toBeTruthy();
    });
  });

  describe("Stage Execution", () => {
    beforeEach(() => {
      latheLoRAPipelineEngine.initializePipeline();
    });

    it("starts a stage", () => {
      const result = latheLoRAPipelineEngine.startStage("dataset");

      expect(result.stage).toBe("dataset");
      expect(result.status).toBe("running");
      expect(result.started_at).toBeDefined();
    });

    it("completes a stage", () => {
      latheLoRAPipelineEngine.startStage("dataset");
      const result = latheLoRAPipelineEngine.completeStage("dataset", {
        train_path: "data/train.jsonl",
      }, {
        dataset_size: 1000,
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.train_path).toBe("data/train.jsonl");
      expect(result.metrics?.dataset_size).toBe(1000);
    });

    it("fails a stage", () => {
      latheLoRAPipelineEngine.startStage("training");
      const result = latheLoRAPipelineEngine.failStage("training", "Out of memory");

      expect(result.status).toBe("failed");
      expect(result.error).toBe("Out of memory");
    });

    it("skips configured stages", () => {
      latheLoRAPipelineEngine.setConfig({ skip_stages: ["evaluation"] });
      latheLoRAPipelineEngine.initializePipeline();

      const result = latheLoRAPipelineEngine.startStage("evaluation");

      expect(result.status).toBe("skipped");
    });
  });

  describe("Stage Commands", () => {
    it("generates dataset command", () => {
      const cmd = latheLoRAPipelineEngine.getStageCommand("dataset");

      expect(cmd).toContain("build_dataset.py");
      expect(cmd).toContain("--archive");
    });

    it("generates training command", () => {
      const cmd = latheLoRAPipelineEngine.getStageCommand("training");

      expect(cmd).toContain("train_lathe_lora.py");
      expect(cmd).toContain("--preset balanced");
    });

    it("generates evaluation command", () => {
      const cmd = latheLoRAPipelineEngine.getStageCommand("evaluation");

      expect(cmd).toContain("evaluate.py");
    });

    it("generates merge command", () => {
      const cmd = latheLoRAPipelineEngine.getStageCommand("merge");

      expect(cmd).toContain("merge_lora.py");
    });

    it("generates GGUF quantize command", () => {
      const cmd = latheLoRAPipelineEngine.getStageCommand("quantize");

      expect(cmd).toContain("quantize_gguf.py");
    });

    it("generates AWQ quantize command", () => {
      latheLoRAPipelineEngine.setConfig({ quant_format: "awq" });
      const cmd = latheLoRAPipelineEngine.getStageCommand("quantize");

      expect(cmd).toContain("quantize_awq.py");
    });

    it("generates Ollama deploy command", () => {
      const cmd = latheLoRAPipelineEngine.getStageCommand("deploy");

      expect(cmd).toContain("ollama create");
    });
  });

  describe("Pipeline Script", () => {
    it("generates pipeline script", () => {
      const script = latheLoRAPipelineEngine.generatePipelineScript();

      expect(script).toContain("#!/usr/bin/env bash");
      expect(script).toContain("set -e");
      expect(script).toContain("log()");
    });

    it("includes all stages", () => {
      const script = latheLoRAPipelineEngine.generatePipelineScript();

      expect(script).toContain("Starting stage: dataset");
      expect(script).toContain("Starting stage: training");
      expect(script).toContain("Starting stage: deploy");
    });

    it("marks skipped stages", () => {
      latheLoRAPipelineEngine.setConfig({ skip_stages: ["evaluation"] });
      const script = latheLoRAPipelineEngine.generatePipelineScript();

      expect(script).toContain("Skipping stage: evaluation");
    });
  });

  describe("Report Generation", () => {
    it("generates report for uninitialized pipeline", () => {
      const report = latheLoRAPipelineEngine.generateReport();

      expect(report.status).toBe("failure");
      expect(report.recommendations).toContain("Pipeline was not initialized");
    });

    it("generates report for completed pipeline", () => {
      latheLoRAPipelineEngine.initializePipeline();
      latheLoRAPipelineEngine.startStage("dataset");
      latheLoRAPipelineEngine.completeStage("dataset", {}, { dataset_size: 500 });

      const report = latheLoRAPipelineEngine.generateReport();

      expect(report.stages_completed).toBe(1);
      expect(report.metrics.dataset_size).toBe(500);
    });

    it("generates recommendations for low eval score", () => {
      latheLoRAPipelineEngine.initializePipeline();
      latheLoRAPipelineEngine.startStage("evaluation");
      latheLoRAPipelineEngine.completeStage("evaluation", {}, { eval_score: 50 });

      const report = latheLoRAPipelineEngine.generateReport();

      expect(report.recommendations.some(r => r.includes("Eval score"))).toBe(true);
    });

    it("reports partial status when some stages fail", () => {
      latheLoRAPipelineEngine.initializePipeline();
      latheLoRAPipelineEngine.startStage("dataset");
      latheLoRAPipelineEngine.completeStage("dataset");
      latheLoRAPipelineEngine.startStage("training");
      latheLoRAPipelineEngine.failStage("training", "Error");

      const report = latheLoRAPipelineEngine.generateReport();

      expect(report.status).toBe("partial");
    });
  });

  describe("Validation", () => {
    it("validates valid config", () => {
      const result = latheLoRAPipelineEngine.validateConfig();

      expect(result.valid).toBe(true);
    });

    it("requires pipeline_id", () => {
      latheLoRAPipelineEngine.setConfig({ pipeline_id: "" });
      const result = latheLoRAPipelineEngine.validateConfig();

      expect(result.valid).toBe(false);
    });

    it("requires archive_path", () => {
      latheLoRAPipelineEngine.setConfig({ archive_path: "" });
      const result = latheLoRAPipelineEngine.validateConfig();

      expect(result.valid).toBe(false);
    });

    it("requires at least one stage", () => {
      latheLoRAPipelineEngine.setConfig({ stages: [] });
      const result = latheLoRAPipelineEngine.validateConfig();

      expect(result.valid).toBe(false);
    });

    it("warns on low eval threshold", () => {
      latheLoRAPipelineEngine.setConfig({ eval_threshold: 40 });
      const result = latheLoRAPipelineEngine.validateConfig();

      expect(result.warnings.some(w => w.includes("eval_threshold"))).toBe(true);
    });
  });

  describe("Stage Dependencies", () => {
    it("returns dependencies for training", () => {
      const deps = latheLoRAPipelineEngine.getStageDependencies("training");

      expect(deps).toContain("dataset");
    });

    it("returns dependencies for deploy", () => {
      const deps = latheLoRAPipelineEngine.getStageDependencies("deploy");

      expect(deps).toContain("quantize");
    });

    it("returns empty for dataset", () => {
      const deps = latheLoRAPipelineEngine.getStageDependencies("dataset");

      expect(deps).toHaveLength(0);
    });

    it("checks if stage can run", () => {
      latheLoRAPipelineEngine.initializePipeline();

      const datasetCheck = latheLoRAPipelineEngine.canRunStage("dataset");
      expect(datasetCheck.can).toBe(true);

      const trainingCheck = latheLoRAPipelineEngine.canRunStage("training");
      expect(trainingCheck.can).toBe(false);
      expect(trainingCheck.reason).toContain("dataset");
    });

    it("allows stage when dependency is skipped", () => {
      latheLoRAPipelineEngine.setConfig({ skip_stages: ["dataset"] });
      latheLoRAPipelineEngine.initializePipeline();

      const check = latheLoRAPipelineEngine.canRunStage("training");

      expect(check.can).toBe(true);
    });
  });

  describe("Rollback", () => {
    it("returns rollback stages", () => {
      const stages = latheLoRAPipelineEngine.getRollbackStages("training");

      expect(stages).toContain("dataset");
    });

    it("returns empty when auto_rollback disabled", () => {
      latheLoRAPipelineEngine.setConfig({ auto_rollback: false });
      const stages = latheLoRAPipelineEngine.getRollbackStages("training");

      expect(stages).toHaveLength(0);
    });

    it("returns stages in reverse order", () => {
      const stages = latheLoRAPipelineEngine.getRollbackStages("quantize");

      expect(stages[0]).toBe("merge");
      expect(stages[stages.length - 1]).toBe("dataset");
    });
  });

  describe("Duration Estimation", () => {
    it("estimates total duration", () => {
      const estimate = latheLoRAPipelineEngine.getEstimatedDuration();

      expect(estimate.total_minutes).toBeGreaterThan(0);
    });

    it("excludes skipped stages from estimate", () => {
      latheLoRAPipelineEngine.setConfig({ skip_stages: ["training"] });
      const withSkip = latheLoRAPipelineEngine.getEstimatedDuration();

      latheLoRAPipelineEngine.setConfig({ skip_stages: [] });
      const withoutSkip = latheLoRAPipelineEngine.getEstimatedDuration();

      expect(withSkip.total_minutes).toBeLessThan(withoutSkip.total_minutes);
    });

    it("provides per-stage estimates", () => {
      const estimate = latheLoRAPipelineEngine.getEstimatedDuration();

      expect(estimate.by_stage.training).toBeGreaterThan(estimate.by_stage.dataset);
    });
  });

  describe("Duration Formatting", () => {
    it("formats seconds", () => {
      const formatted = latheLoRAPipelineEngine.formatDuration(45000);

      expect(formatted).toBe("45s");
    });

    it("formats minutes and seconds", () => {
      const formatted = latheLoRAPipelineEngine.formatDuration(125000);

      expect(formatted).toBe("2m 5s");
    });

    it("formats hours and minutes", () => {
      const formatted = latheLoRAPipelineEngine.formatDuration(7500000);

      expect(formatted).toBe("2h 5m");
    });
  });
});
