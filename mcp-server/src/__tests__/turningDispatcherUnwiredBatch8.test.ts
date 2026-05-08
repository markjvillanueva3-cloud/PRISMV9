/**
 * E2E test for ENGINE-WIRE-LATHE-MS0/U-WIRE-LATHE-BATCH8 — 6 unwired
 * LoRA voter/combiner/deployment/cache/refinement/attention lathe engines.
 */
import { describe, it, expect } from "vitest";
import { promises as fsp } from "node:fs";
import path from "node:path";
import { latheLoRAEnsembleVoterEngine } from "../engines/LatheLoRAEnsembleVoterEngine.js";
import { latheLoRAEnsembleCombinerEngine } from "../engines/LatheLoRAEnsembleCombinerEngine.js";
import { latheLoRADeploymentEngine } from "../engines/LatheLoRADeploymentEngine.js";
import { latheLoRAEmbeddingCacheEngine } from "../engines/LatheLoRAEmbeddingCacheEngine.js";
import { latheLoRAAdaptiveRefinementEngine } from "../engines/LatheLoRAAdaptiveRefinementEngine.js";
import { latheLoRAAttentionAnalyzerEngine } from "../engines/LatheLoRAAttentionAnalyzerEngine.js";

const NEW_ACTIONS = [
  "lathe_lora_voter_stats",
  "lathe_lora_combiner_stats",
  "lathe_lora_deployment_stats",
  "lathe_lora_embedding_cache_stats",
  "lathe_lora_adaptive_refinement_stats",
  "lathe_lora_attention_analyzer_stats",
] as const;
const EXPECTED_ACTION_COUNT = NEW_ACTIONS.length;

const EXPECTED_VOTER_ZERO = { total_votes: 0, consensus_rate: 0, avg_voters_per_vote: 0, avg_winning_confidence: 0, strategy_distribution: {} } as const;
const EXPECTED_COMBINER_ZERO = { total_combinations: 0, avg_std_deviation: 0, avg_range: 0, avg_confidence: 0, method_distribution: {} } as const;
const EXPECTED_DEPLOYMENT_ZERO = { total_deployments: 0, active: 0, rolled_back: 0, failed: 0, avg_health_score: 0, strategy_distribution: {} } as const;
const EXPECTED_CACHE_ZERO = { total_entries: 0, capacity: 1000, total_hits: 0, total_misses: 0, hit_rate: 0, avg_hit_count: 0, memory_bytes_estimated: 0 } as const;

describe("U-WIRE-LATHE-BATCH8 — engines verified directly (exact zero-state assertions)", () => {
  it("voter zero-state", () => { expect(latheLoRAEnsembleVoterEngine.getStats()).toEqual(EXPECTED_VOTER_ZERO); });
  it("combiner zero-state", () => { expect(latheLoRAEnsembleCombinerEngine.getStats()).toEqual(EXPECTED_COMBINER_ZERO); });
  it("deployment zero-state", () => { expect(latheLoRADeploymentEngine.getStats()).toEqual(EXPECTED_DEPLOYMENT_ZERO); });
  it("cache zero-state with capacity===1000", () => { expect(latheLoRAEmbeddingCacheEngine.getStats()).toEqual(EXPECTED_CACHE_ZERO); });
  it("refinement zero-state numerics", () => {
    const s = latheLoRAAdaptiveRefinementEngine.getStats();
    expect(s.total_sessions).toBe(0); expect(s.converged).toBe(0); expect(s.failed).toBe(0);
    expect(s.avg_iterations).toBe(0); expect(s.avg_improvement).toBe(0);
  });
  it("attention zero-state numerics", () => {
    const s = latheLoRAAttentionAnalyzerEngine.getStats();
    expect(s.total_analyses).toBe(0); expect(s.focused_count).toBe(0); expect(s.focused_rate).toBe(0); expect(s.avg_entropy).toBe(0);
    expect(s.most_influential_categories).toEqual([]);
  });
  it("idempotent reads", () => {
    expect(latheLoRAEnsembleVoterEngine.getStats()).toEqual(latheLoRAEnsembleVoterEngine.getStats());
    expect(latheLoRADeploymentEngine.getStats()).toEqual(latheLoRADeploymentEngine.getStats());
    expect(latheLoRAEmbeddingCacheEngine.getStats()).toEqual(latheLoRAEmbeddingCacheEngine.getStats());
  });
});

describe("U-WIRE-LATHE-BATCH8 — dispatcher wiring", () => {
  it("all 6 actions in dispatcher source (enum + case)", async () => {
    const src = await fsp.readFile(path.resolve(__dirname, "..", "tools", "dispatchers", "turningDispatcher.ts"), "utf8");
    for (const a of NEW_ACTIONS) {
      const occurrences = src.split(`"${a}"`).length - 1;
      expect(occurrences).toBeGreaterThanOrEqual(2);
      const caseRe = new RegExp(`case\\s+"${a}"\\s*:\\s*{[\\s\\S]*?break;`, "m");
      expect(caseRe.test(src)).toBe(true);
    }
  });
  it("all 6 schemas in TURNING_ACTION_SCHEMAS", async () => {
    const { TURNING_ACTION_SCHEMAS } = await import("../schemas/turningActionSchemas.js");
    const present = NEW_ACTIONS.filter((a) => typeof (TURNING_ACTION_SCHEMAS as Record<string, { safeParse?: unknown }>)[a]?.safeParse === "function");
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
