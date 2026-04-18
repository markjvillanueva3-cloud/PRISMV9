/**
 * LatheLoRAEvalHarnessEngine Tests
 *
 * U-LTH71: Evaluation harness for LoRA fine-tuned models
 */

import { describe, it, expect, beforeEach } from "vitest";
import { latheLoRAEvalHarnessEngine } from "../engines/LatheLoRAEvalHarnessEngine.js";

describe("LatheLoRAEvalHarnessEngine", () => {
  beforeEach(() => {
    latheLoRAEvalHarnessEngine.setConfig({
      model_path: "models/lathe-lora/final",
      eval_dataset_path: "data/training/lathe-lora-eval.jsonl",
      max_samples: 100,
    });
  });

  describe("Configuration", () => {
    it("sets and gets config", () => {
      latheLoRAEvalHarnessEngine.setConfig({
        max_samples: 50,
        temperature: 0.5,
      });

      const config = latheLoRAEvalHarnessEngine.getConfig();

      expect(config.max_samples).toBe(50);
      expect(config.temperature).toBe(0.5);
    });

    it("has sensible defaults", () => {
      const config = latheLoRAEvalHarnessEngine.getConfig();

      expect(config.top_p).toBe(0.9);
      expect(config.max_new_tokens).toBe(1024);
      expect(config.batch_size).toBe(1);
    });
  });

  describe("G-Code Analysis", () => {
    it("detects program number", () => {
      const metrics = latheLoRAEvalHarnessEngine.analyzeGCode("O0001\nG0 X100\nM30");

      expect(metrics.has_program_number).toBe(true);
    });

    it("detects missing program number", () => {
      const metrics = latheLoRAEvalHarnessEngine.analyzeGCode("G0 X100\nM30");

      expect(metrics.has_program_number).toBe(false);
    });

    it("detects program end (M30)", () => {
      const metrics = latheLoRAEvalHarnessEngine.analyzeGCode("O0001\nG0 X100\nM30");

      expect(metrics.has_program_end).toBe(true);
    });

    it("detects program end (M02)", () => {
      const metrics = latheLoRAEvalHarnessEngine.analyzeGCode("O0001\nG0 X100\nM02");

      expect(metrics.has_program_end).toBe(true);
    });

    it("detects safe start (G28)", () => {
      const metrics = latheLoRAEvalHarnessEngine.analyzeGCode("O0001\nG28 U0 W0\nM30");

      expect(metrics.has_safe_start).toBe(true);
    });

    it("detects home return before end", () => {
      const metrics = latheLoRAEvalHarnessEngine.analyzeGCode(
        "O0001\nG0 X100\nG28 U0 W0\nM30"
      );

      expect(metrics.has_home_return).toBe(true);
    });

    it("detects no home return before end", () => {
      const metrics = latheLoRAEvalHarnessEngine.analyzeGCode("O0001\nG0 X100\nM30");

      expect(metrics.has_home_return).toBe(false);
    });

    it("counts valid G codes", () => {
      const metrics = latheLoRAEvalHarnessEngine.analyzeGCode(
        "G0 X100\nG1 Z-50 F0.2\nG2 X50 Z-100 R25"
      );

      expect(metrics.valid_g_codes).toBe(3);
      expect(metrics.invalid_g_codes).toBe(0);
    });

    it("counts invalid G codes", () => {
      const metrics = latheLoRAEvalHarnessEngine.analyzeGCode("G0 X100\nG999 Z-50");

      expect(metrics.valid_g_codes).toBe(1);
      expect(metrics.invalid_g_codes).toBe(1);
    });

    it("counts M codes", () => {
      const metrics = latheLoRAEvalHarnessEngine.analyzeGCode("M03 S1000\nM08\nM30");

      expect(metrics.valid_m_codes).toBe(3);
    });

    it("counts tools", () => {
      const metrics = latheLoRAEvalHarnessEngine.analyzeGCode(
        "T0101\nG0 X100\nT0202\nG0 X50\nT0303"
      );

      expect(metrics.tool_count).toBe(3);
    });

    it("counts line count", () => {
      const metrics = latheLoRAEvalHarnessEngine.analyzeGCode("O0001\nG0 X100\nG1 Z-50\nM30");

      expect(metrics.line_count).toBe(4);
    });
  });

  describe("Structural Scoring", () => {
    it("gives full score for complete program", () => {
      const metrics = latheLoRAEvalHarnessEngine.analyzeGCode(
        "O0001\nG28 U0 W0\nT0101\nG50 S3000\nG96 S200 M03\nG0 X100\nG1 Z-50 F0.2\nG1 X50\nG1 Z-80\nG28 U0 W0\nM30"
      );

      const score = latheLoRAEvalHarnessEngine.scoreStructural(metrics);

      expect(score).toBe(100);
    });

    it("deducts for missing program number", () => {
      const metrics = latheLoRAEvalHarnessEngine.analyzeGCode(
        "G28 U0 W0\nT0101\nG0 X100\nG28 U0 W0\nM30"
      );

      const score = latheLoRAEvalHarnessEngine.scoreStructural(metrics);

      expect(score).toBeLessThan(100);
    });

    it("deducts heavily for missing M30", () => {
      const metrics = latheLoRAEvalHarnessEngine.analyzeGCode("O0001\nG28 U0 W0\nG0 X100");

      const score = latheLoRAEvalHarnessEngine.scoreStructural(metrics);

      expect(score).toBeLessThan(80);
    });
  });

  describe("Syntax Scoring", () => {
    it("gives full score for all valid codes", () => {
      const metrics = latheLoRAEvalHarnessEngine.analyzeGCode(
        "G0 X100\nG1 Z-50\nM03\nM30"
      );

      const score = latheLoRAEvalHarnessEngine.scoreSyntax(metrics);

      expect(score).toBe(100);
    });

    it("gives zero for no codes", () => {
      const metrics = latheLoRAEvalHarnessEngine.analyzeGCode("X100 Z50");

      const score = latheLoRAEvalHarnessEngine.scoreSyntax(metrics);

      expect(score).toBe(0);
    });

    it("penalizes invalid codes", () => {
      const metrics = latheLoRAEvalHarnessEngine.analyzeGCode("G0 X100\nG999 Z50");

      const score = latheLoRAEvalHarnessEngine.scoreSyntax(metrics);

      expect(score).toBe(50);
    });
  });

  describe("Semantic Scoring", () => {
    it("gives full score for matching operations", () => {
      const generated = "G71 U2 R1\nG71 P10 Q20\nG70 P10 Q20";
      const expected = "G71 U2 R1\nG71 P10 Q20\nG70 P10 Q20";

      const score = latheLoRAEvalHarnessEngine.scoreSemantic(generated, expected);

      expect(score).toBe(100);
    });

    it("penalizes missing operations", () => {
      const generated = "G71 U2 R1";
      const expected = "G71 U2 R1\nG70 P10 Q20\nG76 P020060";

      const score = latheLoRAEvalHarnessEngine.scoreSemantic(generated, expected);

      expect(score).toBeLessThan(100);
    });

    it("handles threading detection", () => {
      const generated = "G76 P020060 Q100";
      const expected = "G76 P020060 Q100";

      const score = latheLoRAEvalHarnessEngine.scoreSemantic(generated, expected);

      expect(score).toBe(100);
    });
  });

  describe("Sample Evaluation", () => {
    it("evaluates a sample", () => {
      const sample = latheLoRAEvalHarnessEngine.evaluateSample(
        "Generate lathe program",
        "Customer: ALCOA",
        "O0001\nG28 U0 W0\nM30",
        "O0001\nG28 U0 W0\nG0 X100\nG28 U0 W0\nM30",
        150
      );

      expect(sample.instruction).toBe("Generate lathe program");
      expect(sample.latency_ms).toBe(150);
      expect(sample.scores.overall).toBeGreaterThan(0);
    });

    it("includes metrics in sample", () => {
      const sample = latheLoRAEvalHarnessEngine.evaluateSample(
        "Generate",
        "",
        "O0001\nM30",
        "O0001\nT0101\nG0 X100\nM30",
        100
      );

      expect(sample.metrics.tool_count).toBe(1);
      expect(sample.metrics.has_program_number).toBe(true);
    });
  });

  describe("Report Generation", () => {
    it("generates report from samples", () => {
      const samples = [
        latheLoRAEvalHarnessEngine.evaluateSample("Test", "", "O0001\nM30", "O0001\nM30", 100),
        latheLoRAEvalHarnessEngine.evaluateSample("Test2", "", "O0001\nM30", "O0001\nG0 X100\nM30", 150),
      ];

      const report = latheLoRAEvalHarnessEngine.generateReport(samples);

      expect(report.samples_evaluated).toBe(2);
      expect(report.aggregate_scores.overall.mean).toBeGreaterThan(0);
    });

    it("computes pass rates", () => {
      const samples = [
        latheLoRAEvalHarnessEngine.evaluateSample("Test", "", "O0001\nM30", "O0001\nM30", 100),
        latheLoRAEvalHarnessEngine.evaluateSample("Test2", "", "O0001\nM30", "G0 X100", 100),
      ];

      const report = latheLoRAEvalHarnessEngine.generateReport(samples);

      expect(report.pass_rates.has_program_end).toBe(0.5);
    });

    it("computes latency percentiles", () => {
      const samples = Array.from({ length: 100 }, (_, i) =>
        latheLoRAEvalHarnessEngine.evaluateSample("Test", "", "O0001\nM30", "O0001\nM30", i * 10)
      );

      const report = latheLoRAEvalHarnessEngine.generateReport(samples);

      expect(report.latency.p50_ms).toBeGreaterThan(0);
      expect(report.latency.p95_ms).toBeGreaterThan(report.latency.p50_ms);
    });
  });

  describe("Threshold Checking", () => {
    it("passes when thresholds met", () => {
      const samples = Array.from({ length: 10 }, () =>
        latheLoRAEvalHarnessEngine.evaluateSample(
          "Test", "",
          "O0001\nG28 U0 W0\nT0101\nG0 X100\nG1 Z-50\nG28 U0 W0\nM30",
          "O0001\nG28 U0 W0\nT0101\nG0 X100\nG1 Z-50\nG28 U0 W0\nM30",
          100
        )
      );

      const report = latheLoRAEvalHarnessEngine.generateReport(samples);
      const result = latheLoRAEvalHarnessEngine.checkThresholds(report);

      expect(result.passed).toBe(true);
    });

    it("fails when overall score too low", () => {
      const samples = Array.from({ length: 10 }, () =>
        latheLoRAEvalHarnessEngine.evaluateSample("Test", "", "O0001\nM30", "X100", 100)
      );

      const report = latheLoRAEvalHarnessEngine.generateReport(samples);
      const result = latheLoRAEvalHarnessEngine.checkThresholds(report);

      expect(result.passed).toBe(false);
      expect(result.failures.some(f => f.includes("Overall score"))).toBe(true);
    });
  });

  describe("Report Comparison", () => {
    it("detects improvements", () => {
      const baseline = latheLoRAEvalHarnessEngine.generateReport([
        latheLoRAEvalHarnessEngine.evaluateSample("Test", "", "O0001\nM30", "G0 X100", 200),
      ]);

      const current = latheLoRAEvalHarnessEngine.generateReport([
        latheLoRAEvalHarnessEngine.evaluateSample(
          "Test", "",
          "O0001\nG28 U0 W0\nM30",
          "O0001\nG28 U0 W0\nM30",
          100
        ),
      ]);

      const comparison = latheLoRAEvalHarnessEngine.compareReports(baseline, current);

      expect(comparison.improved.length).toBeGreaterThan(0);
    });

    it("detects regressions", () => {
      const baseline = latheLoRAEvalHarnessEngine.generateReport([
        latheLoRAEvalHarnessEngine.evaluateSample(
          "Test", "",
          "O0001\nG28 U0 W0\nM30",
          "O0001\nG28 U0 W0\nM30",
          100
        ),
      ]);

      const current = latheLoRAEvalHarnessEngine.generateReport([
        latheLoRAEvalHarnessEngine.evaluateSample("Test", "", "O0001\nM30", "X100", 200),
      ]);

      const comparison = latheLoRAEvalHarnessEngine.compareReports(baseline, current);

      expect(comparison.regressed.length).toBeGreaterThan(0);
    });
  });

  describe("Eval Script Generation", () => {
    it("generates evaluation script", () => {
      const script = latheLoRAEvalHarnessEngine.generateEvalScript();

      expect(script).toContain("#!/usr/bin/env python3");
      expect(script).toContain("FastLanguageModel");
      expect(script).toContain("def generate");
    });

    it("includes config in script", () => {
      latheLoRAEvalHarnessEngine.setConfig({
        model_path: "custom/path",
        max_samples: 50,
      });

      const script = latheLoRAEvalHarnessEngine.generateEvalScript();

      expect(script).toContain("custom/path");
      expect(script).toContain('"max_samples": 50');
    });
  });

  describe("Edge Cases", () => {
    it("handles empty content", () => {
      const metrics = latheLoRAEvalHarnessEngine.analyzeGCode("");

      expect(metrics.line_count).toBe(0);
      expect(metrics.valid_g_codes).toBe(0);
    });

    it("handles empty samples array", () => {
      const report = latheLoRAEvalHarnessEngine.generateReport([]);

      expect(report.samples_evaluated).toBe(0);
      expect(report.aggregate_scores.overall.mean).toBe(0);
    });
  });
});
