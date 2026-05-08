/**
 * E2E test for ENGINE-WIRE-LATHE-MS0/U-WIRE-LATHE-BATCH9 — 6 unwired
 * LoRA benchmark/continual/dataset/ensemble-orch/experiment/hyperparam lathe engines.
 */
import { describe, it, expect } from "vitest";
import { promises as fsp } from "node:fs";
import path from "node:path";
import { latheLoRABenchmarkSuiteEngine } from "../engines/LatheLoRABenchmarkSuiteEngine.js";
import { latheLoRAContinualLearningEngine } from "../engines/LatheLoRAContinualLearningEngine.js";
import { latheLoRADatasetBuilderEngine } from "../engines/LatheLoRADatasetBuilderEngine.js";
import { latheLoRAEnsembleOrchestratorEngine } from "../engines/LatheLoRAEnsembleOrchestratorEngine.js";
import { latheLoRAExperimentTrackerEngine } from "../engines/LatheLoRAExperimentTrackerEngine.js";
import { latheLoRAHyperparameterOptimizerEngine } from "../engines/LatheLoRAHyperparameterOptimizerEngine.js";

const NEW_ACTIONS = [
  "lathe_lora_benchmark_test_cases",
  "lathe_lora_continual_buffer_stats",
  "lathe_lora_dataset_stats",
  "lathe_lora_ensemble_orch_stats",
  "lathe_lora_experiment_stats",
  "lathe_lora_hyperparam_presets",
] as const;
const EXPECTED_ACTION_COUNT = NEW_ACTIONS.length;

// LatheLoRADatasetBuilderEngine.initStats() default values (line 152-169).
const EXPECTED_DATASET_ZERO = {
  total_programs_scanned: 0,
  valid_programs: 0,
  examples_generated: 0,
  train_examples: 0,
  val_examples: 0,
  test_examples: 0,
  by_operation: {},
  by_customer: {},
  by_complexity: {},
  tribal_tips_used: 0,
  avg_instruction_length: 0,
  avg_output_length: 0,
  generation_time_ms: 0,
} as const;

// LatheLoRAEnsembleOrchestratorEngine.getStats zero-branch (line 263-275).
const EXPECTED_ENSEMBLE_ORCH_ZERO = {
  total_runs: 0,
  active_runs: 0,
  completed_runs: 0,
  failed_runs: 0,
  partial_runs: 0,
  consensus_rate: 0,
  avg_latency_ms: 0,
  avg_final_confidence: 0,
  mode_distribution: {},
} as const;

// LatheLoRAExperimentTrackerEngine.getStats with no experiments (line 278-289).
const EXPECTED_EXPERIMENT_ZERO = {
  total_experiments: 0,
  running: 0,
  completed: 0,
  failed: 0,
  archived: 0,
  total_metrics_logged: 0,
  total_artifacts: 0,
} as const;

// LatheLoRAHyperparameterOptimizerEngine.listPresets() returns exactly 5
// hard-coded presets (line 196-204).
const EXPECTED_PRESET_NAMES = ["fast", "balanced", "quality", "memory_efficient", "high_rank"] as const;

describe("U-WIRE-LATHE-BATCH9 — engines verified directly (exact zero-state assertions)", () => {
  describe("LatheLoRABenchmarkSuiteEngine.getTestCases", () => {
    it("returns non-empty STANDARD_TEST_CASES array", () => {
      const cases = latheLoRABenchmarkSuiteEngine.getTestCases();
      expect(Array.isArray(cases)).toBe(true);
      expect(cases.length).toBeGreaterThan(0);
    });

    it("every test case has non-empty id+category strings", () => {
      const cases = latheLoRABenchmarkSuiteEngine.getTestCases();
      for (const tc of cases) {
        expect(typeof tc.id).toBe("string");
        expect(tc.id.length).toBeGreaterThan(0);
        expect(typeof tc.category).toBe("string");
      }
    });

    it("returns isolated copies (mutation-safe)", () => {
      const a = latheLoRABenchmarkSuiteEngine.getTestCases();
      const lenBefore = a.length;
      a.length = 0;
      const b = latheLoRABenchmarkSuiteEngine.getTestCases();
      expect(b.length).toBe(lenBefore);
    });
  });

  describe("LatheLoRAContinualLearningEngine.getBufferStats", () => {
    it("returns exact zero-state for empty replay buffer (avg_rating===0, by_category===empty)", () => {
      const s = latheLoRAContinualLearningEngine.getBufferStats();
      expect(s.total_experiences).toBe(0);
      expect(s.avg_rating).toBe(0);
      expect(s.by_category).toEqual({});
      // newest_timestamp starts at 0 sentinel; oldest_timestamp uses Date.now() so cannot pin exactly.
      expect(s.newest_timestamp).toBe(0);
      expect(typeof s.oldest_timestamp).toBe("number");
    });

    it("idempotent: repeat call yields same total_experiences=0", () => {
      const a = latheLoRAContinualLearningEngine.getBufferStats();
      const b = latheLoRAContinualLearningEngine.getBufferStats();
      expect(a.total_experiences).toBe(b.total_experiences);
      expect(a.total_experiences).toBe(0);
    });
  });

  describe("LatheLoRADatasetBuilderEngine.getStats", () => {
    it("returns exact initStats() zero-state", () => {
      const s = latheLoRADatasetBuilderEngine.getStats();
      expect(s).toEqual(EXPECTED_DATASET_ZERO);
    });

    it("returns shallow copy (mutating result does not leak)", () => {
      const a = latheLoRADatasetBuilderEngine.getStats();
      a.total_programs_scanned = 999;
      const b = latheLoRADatasetBuilderEngine.getStats();
      expect(b.total_programs_scanned).toBe(0);
    });
  });

  describe("LatheLoRAEnsembleOrchestratorEngine.getStats", () => {
    it("returns exact zero-branch values when no completed runs", () => {
      const s = latheLoRAEnsembleOrchestratorEngine.getStats();
      expect(s).toEqual(EXPECTED_ENSEMBLE_ORCH_ZERO);
    });

    it("idempotent: repeat call deep-equal", () => {
      const a = latheLoRAEnsembleOrchestratorEngine.getStats();
      const b = latheLoRAEnsembleOrchestratorEngine.getStats();
      expect(a).toEqual(b);
    });
  });

  describe("LatheLoRAExperimentTrackerEngine.getStats", () => {
    it("returns exact zero-state with no experiments", () => {
      const s = latheLoRAExperimentTrackerEngine.getStats();
      expect(s).toEqual(EXPECTED_EXPERIMENT_ZERO);
    });

    it("status counters sum to total_experiments (counting invariant)", () => {
      const s = latheLoRAExperimentTrackerEngine.getStats();
      expect(s.running + s.completed + s.failed + s.archived).toBe(s.total_experiments);
    });
  });

  describe("LatheLoRAHyperparameterOptimizerEngine.listPresets", () => {
    it("returns exactly 5 presets with the canonical names", () => {
      const presets = latheLoRAHyperparameterOptimizerEngine.listPresets();
      expect(presets.length).toBe(5);
      const names = presets.map((p) => p.name);
      expect(names).toEqual(EXPECTED_PRESET_NAMES);
    });

    it("every preset has a positive vram_estimate_gb", () => {
      const presets = latheLoRAHyperparameterOptimizerEngine.listPresets();
      for (const p of presets) {
        expect(typeof p.vram_estimate_gb).toBe("number");
        expect(p.vram_estimate_gb).toBeGreaterThan(0);
        expect(typeof p.description).toBe("string");
        expect(p.description.length).toBeGreaterThan(0);
      }
    });

    it("idempotent: two successive calls yield deep-equal arrays", () => {
      const a = latheLoRAHyperparameterOptimizerEngine.listPresets();
      const b = latheLoRAHyperparameterOptimizerEngine.listPresets();
      expect(a).toEqual(b);
    });
  });
});

describe("U-WIRE-LATHE-BATCH9 — dispatcher wiring", () => {
  it("all 6 actions in dispatcher source (enum + case-block)", async () => {
    const src = await fsp.readFile(path.resolve(__dirname, "..", "tools", "dispatchers", "turningDispatcher.ts"), "utf8");
    for (const a of NEW_ACTIONS) {
      const occurrences = src.split(`"${a}"`).length - 1;
      expect(occurrences).toBeGreaterThanOrEqual(2);
      const caseRe = new RegExp(`case\\s+"${a}"\\s*:\\s*{[\\s\\S]*?break;`, "m");
      expect(caseRe.test(src)).toBe(true);
    }
  });

  it("all 6 schemas registered in TURNING_ACTION_SCHEMAS", async () => {
    const { TURNING_ACTION_SCHEMAS } = await import("../schemas/turningActionSchemas.js");
    const present = NEW_ACTIONS.filter(
      (a) => typeof (TURNING_ACTION_SCHEMAS as Record<string, { safeParse?: unknown }>)[a]?.safeParse === "function",
    );
    expect(present.length).toBe(EXPECTED_ACTION_COUNT);
  });

  it("schemas accept zero-input + extra-key passthrough", async () => {
    const { TURNING_ACTION_SCHEMAS } = await import("../schemas/turningActionSchemas.js");
    const schemas = TURNING_ACTION_SCHEMAS as Record<string, { safeParse: (v: unknown) => { success: boolean } }>;
    for (const a of NEW_ACTIONS) {
      expect(schemas[a]!.safeParse({}).success).toBe(true);
      expect(schemas[a]!.safeParse({ x: 1 }).success).toBe(true);
    }
  });

  it("schemas REJECT string/number/null/array (4 failure modes)", async () => {
    const { TURNING_ACTION_SCHEMAS } = await import("../schemas/turningActionSchemas.js");
    const schemas = TURNING_ACTION_SCHEMAS as Record<string, { safeParse: (v: unknown) => { success: boolean } }>;
    for (const a of NEW_ACTIONS) {
      expect(schemas[a]!.safeParse("str").success).toBe(false);
      expect(schemas[a]!.safeParse(42).success).toBe(false);
      expect(schemas[a]!.safeParse(null).success).toBe(false);
      expect(schemas[a]!.safeParse([1, 2]).success).toBe(false);
    }
  });
});
