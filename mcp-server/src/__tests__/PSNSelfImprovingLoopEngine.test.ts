/**
 * PSNSelfImprovingLoopEngine tests — real reference values, no stubs.
 *
 * Verifies the self-improving loop composition:
 *   - classifyVerdict: verdict → loop_outcome + fold_weight + psi_delta
 *   - deriveLoopIterationId: deterministic, collision-resistant
 *   - ingest: CoV verify → adapter fold (conditional) → PSN psi_delta emit
 *   - confirmation gates: anomaly verdicts do NOT fold to adapter
 *   - S(x) gate inside adapter still routes critical to anomalies even when CoV passes
 *
 * slot:india /goal-psn-self-improving iter3
 */

import { describe, it, expect } from "vitest";
import {
  PSNSelfImprovingLoopEngine,
  classifyVerdict,
  deriveLoopIterationId,
  type LoopIngestInput,
} from "../engines/PSNSelfImprovingLoopEngine.js";
import { ShopProfileAdapterEngine, type ShopOutcomeRecord } from "../engines/ShopProfileAdapterEngine.js";
import {
  ChainOfVerificationEngine,
  type VerificationResult,
  type VerificationAnswer,
  type VerificationClaim,
} from "../engines/ChainOfVerificationEngine.js";
import { PSNAutonomyLoopEngine } from "../engines/PSNAutonomyLoopEngine.js";

// ============================================================================
// Helpers
// ============================================================================

function mkConfirmedResult(confidence: number, verdict: VerificationResult["verdict"] = "confirmed"): VerificationResult {
  return {
    success: true,
    verdict,
    posteriorConfidence: confidence,
    initialConfidence: 0.5,
    trace: [],
    bySeverity: {
      critical: { total: 0, confirms: 0, conflicts: 0, uncertain: 0, threw: 0 },
      high: { total: 0, confirms: 0, conflicts: 0, uncertain: 0, threw: 0 },
      medium: { total: 0, confirms: 0, conflicts: 0, uncertain: 0, threw: 0 },
      low: { total: 0, confirms: 0, conflicts: 0, uncertain: 0, threw: 0 },
    },
    claimId: "test-claim",
    domain: "generic",
    initialVerdict: "ok",
    shouldEscalate: false,
    evaluatedAt: "2026-05-25T21:00:00Z",
    engineVersion: "1.0.0",
  };
}

function mkOutcome(
  estimated: number,
  actual: number,
  s_of_x?: number,
  category: ShopOutcomeRecord["category"] = "lathe",
): ShopOutcomeRecord {
  return {
    observed_at: "2026-05-25T21:00:00Z",
    category,
    domain: "time",
    estimated,
    actual,
    unit: "min",
    s_of_x,
  };
}

const PASSING_QUESTIONS = [{ id: "q1", question: "is the estimate close?", severity: "low" as const }];

const PASSING_VERIFIER = async (q: { id: string }): Promise<VerificationAnswer> => ({
  questionId: q.id,
  outcome: "confirms",
  evidence: "actual within 25% of estimate",
  confidence: 0.9,
  citedIds: [],
});

const CONFLICTING_VERIFIER = async (q: { id: string }): Promise<VerificationAnswer> => ({
  questionId: q.id,
  outcome: "conflicts",
  evidence: "actual >100% of estimate",
  confidence: 0.9,
  citedIds: [],
});

function mkClaim(initialConfidence = 0.5): VerificationClaim {
  return {
    claimId: "test-claim-001",
    domain: "generic",
    summary: "lathe job took 12min vs 10min estimate",
    initialVerdict: "ok",
    initialConfidence,
    payload: { estimated: 10, actual: 12 },
  };
}

// ============================================================================
// classifyVerdict (pure helper)
// ============================================================================

describe("classifyVerdict", () => {
  it("confirmed @ confidence=0.9 → confirmed_full, fold_weight=1.0, psi_delta=0.16", () => {
    const r = classifyVerdict(mkConfirmedResult(0.9));
    expect(r.loop_outcome).toBe("confirmed_full");
    expect(r.fold_weight).toBe(1.0);
    // (0.9 - 0.5) * 0.4 = 0.16
    expect(r.psi_delta).toBeCloseTo(0.16, 5);
  });

  it("confirmed @ confidence=0.3 (below floor 0.5) → anomaly_only with negative psi_delta -0.28", () => {
    const r = classifyVerdict(mkConfirmedResult(0.3));
    expect(r.loop_outcome).toBe("anomaly_only");
    expect(r.fold_weight).toBe(0);
    // -(1 - 0.3) * 0.4 = -0.28
    expect(r.psi_delta).toBeCloseTo(-0.28, 5);
  });

  it("confirmed_with_caveat @ 0.8 → caveat path, fold 0.5, psi_delta=0.06", () => {
    const r = classifyVerdict(mkConfirmedResult(0.8, "confirmed_with_caveat"));
    expect(r.loop_outcome).toBe("confirmed_caveat");
    expect(r.fold_weight).toBe(0.5);
    // (0.8 - 0.5) * 0.5 * 0.4 = 0.06
    expect(r.psi_delta).toBeCloseTo(0.06, 5);
  });

  it("hallucinated_citation verdict → anomaly_only with negative psi_delta", () => {
    const r = classifyVerdict(mkConfirmedResult(0.2, "hallucinated_citation"));
    expect(r.loop_outcome).toBe("anomaly_only");
    expect(r.fold_weight).toBe(0);
    expect(r.psi_delta).toBeLessThan(0);
  });

  it("conflict verdict → anomaly_only", () => {
    const r = classifyVerdict(mkConfirmedResult(0.1, "conflict"));
    expect(r.loop_outcome).toBe("anomaly_only");
    expect(r.fold_weight).toBe(0);
  });
});

// ============================================================================
// deriveLoopIterationId (pure helper)
// ============================================================================

describe("deriveLoopIterationId", () => {
  it("identical inputs produce identical ids (deterministic)", () => {
    const a = deriveLoopIterationId({ shop_id: "jm-die", observed_at: "2026-05-25T21:00:00Z", category: "lathe", domain: "time" });
    const b = deriveLoopIterationId({ shop_id: "jm-die", observed_at: "2026-05-25T21:00:00Z", category: "lathe", domain: "time" });
    expect(a).toBe(b);
  });

  it("different shop_ids produce different ids", () => {
    const a = deriveLoopIterationId({ shop_id: "jm-die", observed_at: "T", category: "lathe", domain: "time" });
    const b = deriveLoopIterationId({ shop_id: "acme",    observed_at: "T", category: "lathe", domain: "time" });
    expect(a).not.toBe(b);
  });

  it("format: starts with 'loop-<shop>-<ts>-' and ends with 8 hex chars", () => {
    const id = deriveLoopIterationId({ shop_id: "jm-die", observed_at: "2026-05-25T21:00:00Z", category: "lathe", domain: "time" });
    expect(id.startsWith("loop-jm-die-2026-05-25T21:00:00Z-")).toBe(true);
    const hash = id.split("-").pop();
    expect(hash).toMatch(/^[0-9a-f]{8}$/);
  });

  it("different categories produce different ids (same shop+ts)", () => {
    const a = deriveLoopIterationId({ shop_id: "jm-die", observed_at: "T", category: "lathe", domain: "time" });
    const b = deriveLoopIterationId({ shop_id: "jm-die", observed_at: "T", category: "wedm",  domain: "time" });
    expect(a).not.toBe(b);
  });
});

// ============================================================================
// PSNSelfImprovingLoopEngine.ingest (composition)
// ============================================================================

describe("PSNSelfImprovingLoopEngine.ingest — composition", () => {
  function mkEngine(): { engine: PSNSelfImprovingLoopEngine; adapter: ShopProfileAdapterEngine } {
    const adapter = new ShopProfileAdapterEngine();
    const cov = new ChainOfVerificationEngine();
    const autonomy = new PSNAutonomyLoopEngine();
    return { engine: new PSNSelfImprovingLoopEngine(adapter, cov, autonomy), adapter };
  }

  function mkInput(verifier = PASSING_VERIFIER): LoopIngestInput {
    return {
      shop_id: "jm-die",
      outcome: mkOutcome(10, 12),
      claim: mkClaim(0.7),
      questions: PASSING_QUESTIONS,
      verifier,
    };
  }

  it("PASS verifier + normal outcome → confirmed_full + adapter folded + positive psi_delta", async () => {
    const { engine, adapter } = mkEngine();
    const result = await engine.ingest(mkInput());
    expect(result.cov_verdict).toBe("confirmed");
    expect(result.loop_outcome).toBe("confirmed_full");
    expect(result.adapter_folded).toBe(true);
    expect(result.psi_delta).toBeGreaterThan(0);
    expect(adapter.getDeltas("jm-die")?.time_by_category.lathe?.multiplier).toBeCloseTo(1.03, 5);
    expect(result.loop_iteration_id.startsWith("loop-jm-die-2026-05-25T21:00:00Z-")).toBe(true);
  });

  it("CONFLICTING verifier on critical question → conflict verdict + anomaly_only + no fold + negative psi_delta", async () => {
    const { engine, adapter } = mkEngine();
    const result = await engine.ingest({
      ...mkInput(CONFLICTING_VERIFIER),
      // critical severity escalates a conflict from caveat → conflict per CoV semantics
      questions: [{ id: "q1", question: "is the estimate close?", severity: "critical" as const }],
    });
    expect(result.cov_verdict).toBe("conflict");
    expect(result.loop_outcome).toBe("anomaly_only");
    expect(result.adapter_folded).toBe(false);
    expect(result.psi_delta).toBeLessThan(0);
    expect(adapter.getDeltas("jm-die")).toBeNull();
  });

  it("S(x)=0.5 outcome with PASS verifier → fold_skipped (adapter reroutes to anomalies)", async () => {
    const { engine, adapter } = mkEngine();
    const result = await engine.ingest({
      ...mkInput(),
      outcome: mkOutcome(10, 12, 0.5),
    });
    expect(result.cov_verdict).toBe("confirmed");
    expect(result.loop_outcome).toBe("fold_skipped");
    expect(result.adapter_folded).toBe(false);
    expect(adapter.getDeltas("jm-die")?.anomalies.length).toBe(1);
  });

  it("ingested_at is a fresh ISO timestamp (within 5s of now)", async () => {
    const { engine } = mkEngine();
    const t0 = Date.now();
    const result = await engine.ingest(mkInput());
    const tIng = Date.parse(result.ingested_at);
    expect(tIng - t0).toBeGreaterThanOrEqual(0);
    expect(tIng - t0).toBeLessThan(5000);
  });

  it("R12: throws on missing shop_id", async () => {
    const { engine } = mkEngine();
    await expect(engine.ingest({ ...mkInput(), shop_id: "" })).rejects.toThrow();
  });

  it("R12: throws on non-function verifier", async () => {
    const { engine } = mkEngine();
    const bad: LoopIngestInput = {
      ...mkInput(),
      verifier: null as unknown as typeof PASSING_VERIFIER,
    };
    await expect(engine.ingest(bad)).rejects.toThrow();
  });

  it("two PASS ingests on jm-die: evidence_count=2, multiplier 1.0555 (ewma drift)", async () => {
    const { engine, adapter } = mkEngine();
    await engine.ingest(mkInput());
    await engine.ingest({ ...mkInput(), outcome: mkOutcome(10, 12) });
    const d = adapter.getDeltas("jm-die");
    expect(d?.time_by_category.lathe?.evidence_count).toBe(2);
    // 2nd fold: ewma(1.03, 1.2) = 0.85*1.03 + 0.15*1.2 = 1.0555
    expect(d?.time_by_category.lathe?.multiplier).toBeCloseTo(1.0555, 4);
  });

  it("reward.reward is clamped to [-1, 1]", async () => {
    const { engine } = mkEngine();
    const result = await engine.ingest(mkInput());
    expect(result.reward.reward).toBeGreaterThanOrEqual(-1);
    expect(result.reward.reward).toBeLessThanOrEqual(1);
  });

  it("adapter_summary surfaces total_outcomes=1 after one PASS ingest, shop_id echoed", async () => {
    const { engine } = mkEngine();
    const result = await engine.ingest(mkInput());
    expect(result.adapter_summary?.total_outcomes).toBe(1);
    expect(result.adapter_summary?.shop_id).toBe("jm-die");
  });

  it("getShopDeltas null pre-ingest, total_outcomes=1 post-ingest", async () => {
    const { engine } = mkEngine();
    expect(engine.getShopDeltas("jm-die")).toBeNull();
    await engine.ingest(mkInput());
    expect(engine.getShopDeltas("jm-die")?.total_outcomes).toBe(1);
  });
});
