/**
 * FiveAxisOrchestrationEngine tests — MILL-MASTER-AI-WIRING / U4-5AX-ORCH
 *
 * Wires the orchestration chain onto:
 *   prismUnifiedOrchestratorEngine.routeToTier
 *     → cognitiveBudgetAllocatorEngine.allocate
 *     → agenticLoopEngine.run          (iterative refinement, <=3 rounds)
 *
 * Exit condition per envelope: confidence >= 0.85 OR rounds == 3.
 *
 * Required test cases per envelope:
 *   - budget-overrun test case producing legacy fallback (explicit).
 *   - >= 20 assertions; no mocks on PRISM engines under test.
 *
 * @envelope mcp-server/data/milestones/MILL-MASTER-AI-WIRING.json (U4-5AX-ORCH)
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  FiveAxisOrchestrationEngine,
} from "../engines/FiveAxisOrchestrationEngine.js";
import {
  resetBudgetOverruns,
} from "../engines/MillAIWiring.js";
import type { MaterialProps } from "../engines/FiveAxisToolpathSynthesisEngine.js";

const LEGACY_WALL_CLOCK_CEILING_MS = 50;
const AI_WALL_CLOCK_CEILING_MS = 500;

const P20_STEEL: MaterialProps = {
  name: "P20",
  iso_group: "P",
  kc11_mpa: 2200,
  mc: 0.25,
  density_kg_m3: 7850,
  thermal_conductivity_w_mk: 35,
  specific_heat_j_kgk: 460,
};

// Pin Date.now for ID-generation determinism so .toEqual() on sequences
// doesn't break on monotonic ID drift between calls.
function stripNondeterministic(seq: unknown): unknown {
  const clone = JSON.parse(JSON.stringify(seq));
  if (clone && typeof clone === "object") {
    clone.id = "FROZEN";
    clone.part_id = "FROZEN";
    clone.created_at = "FROZEN";
    if (Array.isArray(clone.operations)) {
      for (const op of clone.operations) {
        if (op && typeof op === "object") op.id = "FROZEN";
      }
    }
    if (clone.stock_model && typeof clone.stock_model === "object") {
      clone.stock_model.id = "FROZEN";
    }
  }
  return clone;
}

// ============================================================================
// useAI:'off' bit-identical to legacy
// ============================================================================

describe("FiveAxisOrchestrationEngine.generateSequenceOrchestrated — useAI:'off'", () => {
  it("returns { sequence } whose deterministic fields deep-equal legacy generateSequence", async () => {
    const legacy = FiveAxisOrchestrationEngine.generateSequence(
      "ruled_surface",
      P20_STEEL,
      "OKUMA_M460V_5AX",
      { target_ra_um: 1.6 },
    );
    const out = await FiveAxisOrchestrationEngine.generateSequenceOrchestrated(
      "ruled_surface",
      P20_STEEL,
      "OKUMA_M460V_5AX",
      { target_ra_um: 1.6, useAI: "off" },
    );
    expect(out.ai).toBe(undefined);
    expect(stripNondeterministic(out.sequence)).toEqual(stripNondeterministic(legacy));
  });

  it("omitting useAI equals useAI:'off'", async () => {
    const a = await FiveAxisOrchestrationEngine.generateSequenceOrchestrated(
      "freeform_surface",
      P20_STEEL,
      "OKUMA_M460V_5AX",
    );
    const b = await FiveAxisOrchestrationEngine.generateSequenceOrchestrated(
      "freeform_surface",
      P20_STEEL,
      "OKUMA_M460V_5AX",
      { useAI: "off" },
    );
    expect(a.ai).toBe(undefined);
    expect(b.ai).toBe(undefined);
    expect(stripNondeterministic(a.sequence)).toEqual(stripNondeterministic(b.sequence));
  });
});

// ============================================================================
// useAI:'on' pipeline invariants
// ============================================================================

describe("FiveAxisOrchestrationEngine.generateSequenceOrchestrated — useAI:'on' pipeline", () => {
  it("returns a sequence with >= 2 operations AND a populated ai side-channel", async () => {
    const out = await FiveAxisOrchestrationEngine.generateSequenceOrchestrated(
      "impeller_blade",
      P20_STEEL,
      "OKUMA_M460V_5AX",
      { useAI: "on", target_ra_um: 0.8 },
    );
    expect(out.sequence.operations.length).toBeGreaterThanOrEqual(2);
    expect(typeof out.ai).toBe("object");
    expect(out.ai === null).toBe(false);

    const ai = out.ai!;
    // Tier routing stage
    expect(["simple", "moderate", "complex", "critical"]).toContain(ai.tier_complexity);
    expect(typeof ai.tier).toBe("string");
    expect(ai.tier.length).toBeGreaterThan(0);
    // Budget allocation stage
    expect(typeof ai.budget_depth).toBe("string");
    expect(ai.budget_max_tokens).toBeGreaterThanOrEqual(0);
    // Agentic loop rounds
    expect(ai.refinement_rounds).toBeGreaterThanOrEqual(1);
    expect(ai.refinement_rounds).toBeLessThanOrEqual(3);
    expect(ai.final_confidence).toBeGreaterThanOrEqual(0);
    expect(ai.final_confidence).toBeLessThanOrEqual(1);
    expect(Array.isArray(ai.sources)).toBe(true);
    expect(ai.sources.length).toBeGreaterThanOrEqual(1);
  });

  it("cites all three pipeline stages in sources[] on a happy path", async () => {
    const out = await FiveAxisOrchestrationEngine.generateSequenceOrchestrated(
      "deep_cavity",
      P20_STEEL,
      "OKUMA_M460V_5AX",
      { useAI: "on" },
    );
    const sources = out.ai!.sources;
    expect(sources.some(s => /unified_orchestrator/.test(s))).toBe(true);
    expect(sources.some(s => /cognitive_budget/.test(s))).toBe(true);
    expect(sources.some(s => /agentic_loop/.test(s))).toBe(true);
  });

  it("caps refinement_rounds at the configured maxRefinementRounds", async () => {
    const out = await FiveAxisOrchestrationEngine.generateSequenceOrchestrated(
      "freeform_surface",
      P20_STEEL,
      "OKUMA_M460V_5AX",
      { useAI: "on", maxRefinementRounds: 2 },
    );
    expect(out.ai!.refinement_rounds).toBeLessThanOrEqual(2);
    expect(out.ai!.refinement_rounds).toBeGreaterThanOrEqual(1);
  });

  it("exits early when final_confidence >= targetConfidence (0.1 is effectively always-true)", async () => {
    const out = await FiveAxisOrchestrationEngine.generateSequenceOrchestrated(
      "freeform_surface",
      P20_STEEL,
      "OKUMA_M460V_5AX",
      { useAI: "on", targetConfidence: 0.1 },
    );
    // At targetConfidence=0.1, the first round should satisfy the gate.
    expect(out.ai!.refinement_rounds).toBe(1);
    expect(out.ai!.exit_reason).toBe("confidence_reached");
  });
});

// ============================================================================
// Budget-overrun fallback to legacy (envelope-required case)
// ============================================================================

describe("FiveAxisOrchestrationEngine.generateSequenceOrchestrated — budget overrun", () => {
  beforeEach(() => resetBudgetOverruns());

  it("useAI:'auto' with budgetMs=1 overruns then auto-downgrades the next call to legacy", async () => {
    const capId = "5ax_orch_auto_downgrade_" + Date.now();
    const first = await FiveAxisOrchestrationEngine.generateSequenceOrchestrated(
      "impeller_blade",
      P20_STEEL,
      "OKUMA_M460V_5AX",
      {
        useAI: "auto",
        budgetMs: 1,
        capabilityId: capId,
      },
    );
    // First call: may succeed OR may already be downgraded — either way, no throw.
    // What we care about is the next call behavior.
    expect(typeof first.sequence.operations).toBe("object");

    const second = await FiveAxisOrchestrationEngine.generateSequenceOrchestrated(
      "impeller_blade",
      P20_STEEL,
      "OKUMA_M460V_5AX",
      {
        useAI: "auto",
        budgetMs: 1,
        capabilityId: capId,
      },
    );
    // Legacy fallback: ai side-channel must be absent.
    expect(second.ai).toBe(undefined);
    expect(second.sequence.operations.length).toBeGreaterThanOrEqual(2);
  });
});

// ============================================================================
// Failure modes + adversarial inputs
// ============================================================================

describe("FiveAxisOrchestrationEngine.generateSequenceOrchestrated — hardening", () => {
  it("fails closed when an unknown machine id is passed — returns legacy sequence, no throw", async () => {
    const out = await FiveAxisOrchestrationEngine.generateSequenceOrchestrated(
      "ruled_surface",
      P20_STEEL,
      "NOT_A_REAL_MACHINE",
      { useAI: "on" },
    );
    expect(out.sequence.machine_id).toBe("NOT_A_REAL_MACHINE");
    expect(out.sequence.operations.length).toBeGreaterThanOrEqual(2);
  });

  it("extreme maxRefinementRounds (1e6) is clamped to <= 3 and does not hang", async () => {
    const t0 = performance.now();
    const out = await FiveAxisOrchestrationEngine.generateSequenceOrchestrated(
      "freeform_surface",
      P20_STEEL,
      "OKUMA_M460V_5AX",
      { useAI: "on", maxRefinementRounds: 1e6 },
    );
    expect(performance.now() - t0).toBeLessThan(2000);
    expect(out.ai!.refinement_rounds).toBeLessThanOrEqual(3);
  });

  it("NaN targetConfidence does not throw and produces a finite final_confidence", async () => {
    const out = await FiveAxisOrchestrationEngine.generateSequenceOrchestrated(
      "ruled_surface",
      P20_STEEL,
      "OKUMA_M460V_5AX",
      { useAI: "on", targetConfidence: Number.NaN },
    );
    expect(Number.isFinite(out.ai!.final_confidence)).toBe(true);
    expect(out.ai!.final_confidence).toBeGreaterThanOrEqual(0);
    expect(out.ai!.final_confidence).toBeLessThanOrEqual(1);
  });
});

// ============================================================================
// Latency ceilings per envelope global_contracts.latency_budgets_ms
// ============================================================================

describe("FiveAxisOrchestrationEngine.generateSequenceOrchestrated — latency", () => {
  it("useAI:'off' single-call wall clock < 50 ms", async () => {
    const t = performance.now();
    await FiveAxisOrchestrationEngine.generateSequenceOrchestrated(
      "ruled_surface",
      P20_STEEL,
      "OKUMA_M460V_5AX",
      { useAI: "off" },
    );
    expect(performance.now() - t).toBeLessThan(LEGACY_WALL_CLOCK_CEILING_MS);
  });

  it("useAI:'on' single-call wall clock < 500 ms on a typical part", async () => {
    const t = performance.now();
    await FiveAxisOrchestrationEngine.generateSequenceOrchestrated(
      "ruled_surface",
      P20_STEEL,
      "OKUMA_M460V_5AX",
      { useAI: "on" },
    );
    expect(performance.now() - t).toBeLessThan(AI_WALL_CLOCK_CEILING_MS);
  });
});
