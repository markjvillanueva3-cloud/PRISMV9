/**
 * MillingMachineIntelligenceEngine tests — MILL-MASTER-AI-WIRING / U1-SPIKE-MMI
 *
 * Covers the three bespoke-AI methods being retrofitted onto the PRISM AI stack:
 *   - findSimilarMachines      (bespoke cosine similarity → hypothesisRanker)
 *   - recommendToolpath        (bespoke keyword scoring  → hypothesisRanker)
 *   - generateReasoningChain   (bespoke 5-step chain     → treeOfThought + selfAwareness + explainer)
 *
 * Invariants enforced:
 *   - useAI omitted ≡ useAI:'off' ≡ legacy output (bit-identical deep-equal).
 *   - useAI:'on' returns the same TYPE as legacy (additive-only API).
 *   - useAI:'on' spike gate per envelope global_contracts:
 *       • reasoning chain has >= 2 steps AND at least 1 evidence item across steps,
 *       • sources[] cites at least one PRISM-AI source tag (tree/hyp/aware/explainer).
 *   - Single-call wall-clock: useAI:'off' < 50 ms, useAI:'on' < 500 ms.
 *   - Output schema hash for useAI:'off' matches the U0 baseline for the
 *     recommendToolpath entry.
 *
 * @envelope mcp-server/data/milestones/MILL-MASTER-AI-WIRING.json (U1-SPIKE-MMI)
 * @baseline mcp-server/data/benchmarks/mill-master-ai-wiring-baseline.json
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import {
  millingMachineIntelligenceEngine,
  type MachineQuery,
} from "../engines/MillingMachineIntelligenceEngine.js";

// Latency ceilings from envelope global_contracts.latency_budgets_ms.
const LEGACY_WALL_CLOCK_CEILING_MS = 50;
const AI_WALL_CLOCK_CEILING_MS = 500;
const SCHEMA_HASH_LEN = 16;

function schemaHash(value: unknown): string {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  const t = typeof value;
  if (t !== "object") return t;
  if (Array.isArray(value)) {
    const sampleHash = value.length === 0 ? "empty" : schemaHash(value[0]);
    return createHash("sha256")
      .update(`array<${sampleHash}>`)
      .digest("hex")
      .slice(0, SCHEMA_HASH_LEN);
  }
  const keys = Object.keys(value as Record<string, unknown>).sort().join(",");
  return createHash("sha256").update(keys).digest("hex").slice(0, SCHEMA_HASH_LEN);
}

function loadBaselineRecommendHash(): string {
  const p = resolve(process.cwd(), "data/benchmarks/mill-master-ai-wiring-baseline.json");
  const raw = JSON.parse(readFileSync(p, "utf8")) as {
    entries: Record<string, { output_schema_hash: string | null }>;
  };
  const entry =
    raw.entries["MillingMachineIntelligenceEngine::recommendToolpath(op, controller, hasCam)"];
  if (!entry || typeof entry.output_schema_hash !== "string") {
    throw new Error("U0 baseline missing recommendToolpath entry with string output_schema_hash");
  }
  return entry.output_schema_hash;
}

const MMI = millingMachineIntelligenceEngine;

// ============================================================================
// LEGACY-PATH PRESERVATION (useAI omitted ≡ useAI:'off')
// ============================================================================

describe("MillingMachineIntelligenceEngine — useAI:'off' bit-identical to legacy", () => {
  it("findSimilarMachines: useAI omitted and useAI:'off' return deep-equal results", () => {
    const pool = MMI.getJMDieMachines();
    expect(pool.length).toBeGreaterThanOrEqual(3);
    const src = pool[0];

    const legacy = MMI.findSimilarMachines(src, 5);
    const offPath = MMI.findSimilarMachines(src, 5, "off");

    expect(offPath).toEqual(legacy);
    // Must also be non-trivial — a no-op "off" path that returned [] would pass
    // toEqual but fail the bit-identical semantic. Legacy on a pool >= 3 always
    // produces at least 1 match (self excluded).
    expect(offPath.length).toBeGreaterThanOrEqual(1);
  });

  it("recommendToolpath: useAI omitted and useAI:'off' return deep-equal results", () => {
    const legacy = MMI.recommendToolpath("pocket milling", "hurco_winmax", true);
    const offPath = MMI.recommendToolpath("pocket milling", "hurco_winmax", true, "off");

    expect(offPath).toEqual(legacy);
    expect(offPath.length).toBeGreaterThanOrEqual(1);
    for (const s of offPath) {
      expect(s.controllers_supported).toContain("hurco_winmax");
    }
  });

  it("generateReasoningChain: useAI omitted and useAI:'off' return deep-equal results", () => {
    const query: MachineQuery = {
      query_type: "toolpath_selection",
      natural_language: "rough a pocket in P20 steel",
      controller: "haas_ngc",
      operation: "rough pocket",
    };

    const legacy = MMI.generateReasoningChain(query);
    const offPath = MMI.generateReasoningChain(query, "off");

    expect(offPath).toEqual(legacy);
    expect(offPath.steps.length).toBe(5); // legacy produces exactly 5 steps
    expect(offPath.query).toBe(query.natural_language);
  });

  it("recommendToolpath useAI:'off' schema hash matches U0 baseline", () => {
    const out = MMI.recommendToolpath("pocket milling", "hurco_winmax", true, "off");
    const expected = loadBaselineRecommendHash();
    expect(schemaHash(out)).toBe(expected);
  });
});

// ============================================================================
// AI-PATH SHAPE + SPIKE GATE
// ============================================================================

describe("MillingMachineIntelligenceEngine — useAI:'on' PRISM-AI wiring", () => {
  it("findSimilarMachines: useAI:'on' returns a non-empty MachineSimilarityMatch[]", () => {
    const pool = MMI.getJMDieMachines();
    const src = pool[0];
    const matches = MMI.findSimilarMachines(src, 5, "on");

    expect(Array.isArray(matches)).toBe(true);
    expect(matches.length).toBeGreaterThanOrEqual(1);
    expect(matches.length).toBeLessThanOrEqual(5);

    for (const m of matches) {
      expect(typeof m.machine.id).toBe("string");
      expect(m.machine.id.length).toBeGreaterThan(0);
      expect(m.machine.id).not.toBe(src.id); // never includes self
      expect(typeof m.similarity_score).toBe("number");
      expect(m.similarity_score).toBeGreaterThanOrEqual(0);
      expect(m.similarity_score).toBeLessThanOrEqual(100);
      expect(typeof m.explanation).toBe("string");
      expect(m.explanation.length).toBeGreaterThan(0);
    }

    // Monotone non-increasing ordering by similarity_score
    for (let i = 1; i < matches.length; i++) {
      expect(matches[i].similarity_score).toBeLessThanOrEqual(matches[i - 1].similarity_score);
    }
  });

  it("findSimilarMachines: useAI:'on' preserves pool membership (no spurious candidates)", () => {
    const pool = MMI.getJMDieMachines();
    const src = pool[0];
    const legacy = MMI.findSimilarMachines(src, pool.length, "off");
    const aiPath = MMI.findSimilarMachines(src, pool.length, "on");

    // Same underlying pool (same machine set), same length when limit >= pool size.
    expect(aiPath.length).toBe(legacy.length);
    const legacyIds = new Set(legacy.map(m => m.machine.id));
    const aiIds = new Set(aiPath.map(m => m.machine.id));
    expect(aiIds).toEqual(legacyIds);
  });

  it("recommendToolpath: useAI:'on' returns controller-compatible ToolpathStrategy[]", () => {
    const out = MMI.recommendToolpath("pocket milling", "hurco_winmax", true, "on");

    expect(Array.isArray(out)).toBe(true);
    expect(out.length).toBeGreaterThanOrEqual(1);
    expect(out.length).toBeLessThanOrEqual(5);
    for (const s of out) {
      expect(typeof s.name).toBe("string");
      expect(s.name.length).toBeGreaterThan(0);
      expect(s.controllers_supported).toContain("hurco_winmax");
    }
  });

  it("generateReasoningChain: useAI:'on' SPIKE GATE — >= 2 steps AND >= 1 cited evidence", () => {
    const query: MachineQuery = {
      query_type: "toolpath_selection",
      natural_language: "adaptive rough pocket in P20 with a 12mm ball endmill",
      controller: "haas_ngc",
      operation: "adaptive rough pocket",
      material: "P20",
    };

    const chain = MMI.generateReasoningChain(query, "on");

    expect(chain.query).toBe(query.natural_language);
    expect(Array.isArray(chain.steps)).toBe(true);

    // SPIKE GATE #1: at least 2 reasoning steps (branch_count >= 2)
    expect(chain.steps.length).toBeGreaterThanOrEqual(2);

    // SPIKE GATE #2: at least one step cites >= 1 evidence item
    const totalEvidence = chain.steps.reduce((sum, s) => sum + s.evidence.length, 0);
    expect(totalEvidence).toBeGreaterThanOrEqual(1);

    // Every step has a non-empty content string and a bounded confidence.
    for (const step of chain.steps) {
      expect(typeof step.content).toBe("string");
      expect(step.content.length).toBeGreaterThan(0);
      expect(step.confidence).toBeGreaterThanOrEqual(0);
      expect(step.confidence).toBeLessThanOrEqual(100);
    }

    // Chain-level confidence bounded.
    expect(chain.confidence).toBeGreaterThanOrEqual(0);
    expect(chain.confidence).toBeLessThanOrEqual(100);
  });

  it("generateReasoningChain: useAI:'on' cites >= 1 AI source (tree/hypothesis/awareness/explainer)", () => {
    const query: MachineQuery = {
      query_type: "parameter_recommendation",
      natural_language: "best roughing parameters for 4140 steel on a Haas VF-2",
      controller: "haas_ngc",
      operation: "rough profile",
      material: "4140",
    };

    const chain = MMI.generateReasoningChain(query, "on");

    expect(Array.isArray(chain.sources)).toBe(true);
    expect(chain.sources.length).toBeGreaterThanOrEqual(1);

    const aiTag = /(tree_of_thought|hypothesis_ranker|self_awareness|ai_decision_explanation)/;
    const aiSources = chain.sources.filter(s => aiTag.test(s));
    expect(aiSources.length).toBeGreaterThanOrEqual(1);
  });

  it("useAI:'auto' routes to AI path when budget allows (spike: equivalent to 'on')", () => {
    const pool = MMI.getJMDieMachines();
    const out = MMI.findSimilarMachines(pool[0], 3, "auto");
    expect(Array.isArray(out)).toBe(true);
    expect(out.length).toBeGreaterThanOrEqual(1);
    expect(out.length).toBeLessThanOrEqual(3);
  });
});

// ============================================================================
// LATENCY CEILINGS (single-call bound on p95)
// ============================================================================

describe("MillingMachineIntelligenceEngine — latency budgets", () => {
  it("useAI:'off' single-call wall clock < 50 ms for each method", () => {
    const pool = MMI.getJMDieMachines();
    const src = pool[0];
    const q: MachineQuery = {
      query_type: "toolpath_selection",
      natural_language: "pocket milling",
      controller: "haas_ngc",
    };

    for (let i = 0; i < 5; i++) {
      const t1 = performance.now();
      MMI.findSimilarMachines(src, 5, "off");
      expect(performance.now() - t1).toBeLessThan(LEGACY_WALL_CLOCK_CEILING_MS);

      const t2 = performance.now();
      MMI.recommendToolpath("pocket milling", "hurco_winmax", true, "off");
      expect(performance.now() - t2).toBeLessThan(LEGACY_WALL_CLOCK_CEILING_MS);

      const t3 = performance.now();
      MMI.generateReasoningChain(q, "off");
      expect(performance.now() - t3).toBeLessThan(LEGACY_WALL_CLOCK_CEILING_MS);
    }
  });

  it("useAI:'on' single-call wall clock < 500 ms for each method", () => {
    const pool = MMI.getJMDieMachines();
    const src = pool[0];
    const q: MachineQuery = {
      query_type: "toolpath_selection",
      natural_language: "pocket milling",
      controller: "haas_ngc",
    };

    const t1 = performance.now();
    MMI.findSimilarMachines(src, 5, "on");
    expect(performance.now() - t1).toBeLessThan(AI_WALL_CLOCK_CEILING_MS);

    const t2 = performance.now();
    MMI.recommendToolpath("pocket milling", "hurco_winmax", true, "on");
    expect(performance.now() - t2).toBeLessThan(AI_WALL_CLOCK_CEILING_MS);

    const t3 = performance.now();
    MMI.generateReasoningChain(q, "on");
    expect(performance.now() - t3).toBeLessThan(AI_WALL_CLOCK_CEILING_MS);
  });
});

// ============================================================================
// FAIL-CLOSED: AI path failure falls back to legacy without throwing
// ============================================================================

describe("MillingMachineIntelligenceEngine — AI path is fail-closed", () => {
  it("findSimilarMachines with a synthetic machine id still succeeds on useAI:'on'", () => {
    const pool = MMI.getJMDieMachines();
    const synthetic = { ...pool[0], id: "synthetic-does-not-exist" };
    const out = MMI.findSimilarMachines(synthetic, 3, "on");
    expect(Array.isArray(out)).toBe(true);
    expect(out.length).toBeGreaterThanOrEqual(1);
  });

  it("generateReasoningChain with a minimal empty query does not throw on useAI:'on'", () => {
    const q: MachineQuery = {
      query_type: "gcode_help",
      natural_language: "",
    };
    const chain = MMI.generateReasoningChain(q, "on");
    expect(chain.query).toBe("");
    expect(Array.isArray(chain.steps)).toBe(true);
    expect(chain.steps.length).toBeGreaterThanOrEqual(2);
  });
});
