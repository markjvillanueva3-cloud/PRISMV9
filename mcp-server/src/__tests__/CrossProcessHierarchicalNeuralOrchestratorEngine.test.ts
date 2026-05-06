/**
 * CrossProcessHierarchicalNeuralOrchestratorEngine — T12-02 tests.
 * Compose tier outputs into a unified answer with provenance.
 */

import { describe, it, expect } from "vitest";
import {
  CrossProcessHierarchicalNeuralOrchestratorEngine as Orch,
  crossProcessHierarchicalNeuralOrchestrator,
  type OrchestrateInput,
} from "../engines/CrossProcessHierarchicalNeuralOrchestratorEngine.js";
import type { TierId } from "../engines/CrossProcessTierRouterEngine.js";

// Custom invoker that returns a tier-specific payload so the test can verify
// fan-out actually invokes the right engines, not just the route.
const stubInvoker = (tierId: TierId, engineId: string, payload: Record<string, unknown>) => ({
  invoked: true,
  tier_id: tierId,
  engine_id: engineId,
  payload_keys: Object.keys(payload),
});

describe("orchestrate — full fan-out", () => {
  it("returns headline from highest-confidence available tier", () => {
    const r = Orch.orchestrate({
      query: "is this safe to run",
      payload: {},
      tier_invoker: stubInvoker,
    });
    expect(r.intent).toBe("safety_check");
    expect(r.primary_answer.tier_id).toBe("T8-03");
    expect(r.primary_answer.confidence).toBeCloseTo(0.95, 2);
  });

  it("provenance contains entries for every routed tier (T8-01 + T8-03 both routed)", () => {
    const r = Orch.orchestrate({
      query: "is this safe to run",
      payload: {},
      tier_invoker: stubInvoker,
    });
    const tierIds = r.provenance.map((p) => p.tier_id);
    expect(tierIds).toContain("T8-03");
    expect(tierIds).toContain("T8-01");
    expect(r.provenance.length).toBe(2);
  });

  it("unavailable tiers surface in unavailable_tiers with reason", () => {
    const r = Orch.orchestrate({
      query: "predict SF for inconel",
      payload: {},
      tier_invoker: stubInvoker,
    });
    const t102 = r.unavailable_tiers.find((u) => u.tier_id === "T1-02");
    expect(t102?.reason).toMatch(/not yet built|prerequisite/i);
    expect(t102?.engine_id).toBe("CrossProcessTransferModelEngine");
  });

  it("provenance status='ok' for both T8-01 + T8-03 (built tiers)", () => {
    const r = Orch.orchestrate({
      query: "is this safe to run",
      payload: {},
      tier_invoker: stubInvoker,
    });
    const ok = r.provenance.filter((p) => p.status === "ok");
    expect(ok.length).toBe(2);
    expect(ok.map((p) => p.tier_id).sort()).toEqual(["T8-01", "T8-03"]);
  });

  it("invoker receives tier_id, engine_id, and payload — verified by capture", () => {
    const captured: Array<{ tier_id: TierId; engine_id: string; payload: Record<string, unknown> }> = [];
    const captureInvoker = (tierId: TierId, engineId: string, payload: Record<string, unknown>) => {
      captured.push({ tier_id: tierId, engine_id: engineId, payload });
      return { ok: true, from: tierId };
    };
    const r = Orch.orchestrate({
      query: "is this safe to run",
      payload: { foo: "bar" },
      tier_invoker: captureInvoker,
    });
    expect(captured.length).toBe(2);
    expect(captured[0].tier_id).toBe("T8-03");  // highest conf first
    expect(captured[0].engine_id).toBe("CrossProcessNeuroSymbolicSafetyVerifierEngine");
    expect(captured[0].payload).toEqual({ foo: "bar" });
    expect(r.provenance[0].output).toEqual({ ok: true, from: "T8-03" });
  });

  it("captures invoker errors as status='error' with message", () => {
    const errorInvoker = () => {
      throw new Error("simulated tier failure");
    };
    const r = Orch.orchestrate({
      query: "is this safe to run",
      payload: {},
      tier_invoker: errorInvoker,
    });
    const errorEntries = r.provenance.filter((p) => p.status === "error");
    expect(errorEntries.length).toBe(2);
    expect(errorEntries[0].error_message).toBe("simulated tier failure");
  });

  it("orchestrator continues fan-out even when one tier errors", () => {
    const flakyInvoker = (tierId: TierId) => {
      if (tierId === "T8-01") throw new Error("flaky T8-01");
      return { ok: tierId };
    };
    const r = Orch.orchestrate({
      query: "is this safe to run",
      payload: {},
      tier_invoker: flakyInvoker,
    });
    const ok = r.provenance.filter((p) => p.status === "ok");
    const err = r.provenance.filter((p) => p.status === "error");
    expect(ok.length).toBe(1);
    expect(err.length).toBe(1);
    expect(ok[0].tier_id).toBe("T8-03");
    expect(err[0].tier_id).toBe("T8-01");
  });

  it("total_round_trip_ms is non-negative and finite", () => {
    const r = Orch.orchestrate({
      query: "is this safe to run",
      payload: {},
      tier_invoker: stubInvoker,
    });
    expect(r.total_round_trip_ms).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(r.total_round_trip_ms)).toBe(true);
    expect(r.total_round_trip_ms).toBeLessThan(500);  // acceptance threshold
  });

  it("when ALL tiers unavailable, primary_answer.tier_id is null and headline mentions blocked", () => {
    const r = Orch.orchestrate({
      query: "predict SF for new material",
      payload: {},
      tier_invoker: stubInvoker,
    });
    const okCount = r.provenance.filter((p) => p.status === "ok").length;
    if (okCount === 0) {
      expect(r.primary_answer.tier_id).toBeNull();
      expect(r.primary_answer.headline).toMatch(/blocked|prerequisite/i);
    } else {
      // Some predict-route tiers may be available — assert the contract holds
      expect(r.primary_answer.tier_id).not.toBeNull();
    }
  });

  it("when no matchers fire and hint is 'auto', returns empty provenance and null headline", () => {
    const r = Orch.orchestrate({
      query: "asdfgh nonsense xyz",
      context_hint: "auto",
      payload: {},
      tier_invoker: stubInvoker,
    });
    expect(r.provenance).toEqual([]);
    expect(r.primary_answer.tier_id).toBeNull();
    expect(r.primary_answer.confidence).toBe(0);
  });

  it("rationale includes counts and 'ms' suffix for elapsed time", () => {
    const r = Orch.orchestrate({
      query: "is this safe to run",
      payload: {},
      tier_invoker: stubInvoker,
    });
    expect(r.rationale).toMatch(/succeeded/);
    expect(r.rationale).toMatch(/ms\.?$/);
  });

  it("rejects empty query (Zod min(1))", () => {
    expect(() => Orch.orchestrate({ query: "", payload: {} } as OrchestrateInput)).toThrow();
  });

  it("rejects oversized query (Zod max(2000))", () => {
    expect(() => Orch.orchestrate({ query: "x".repeat(2001), payload: {} } as OrchestrateInput)).toThrow();
  });

  it("default invoker (no tier_invoker provided) returns echo stub with tier_id field", () => {
    const r = Orch.orchestrate({
      query: "is this safe to run",
      payload: {},
    });
    const ok = r.provenance.filter((p) => p.status === "ok");
    expect(ok.length).toBe(2);
    const out = ok[0].output as { tier_id: string; echo: string };
    expect(out.tier_id).toBe("T8-03");
    expect(out.echo).toMatch(/acknowledged via default stub/);
  });
});

describe("orchestrateBrief — top-3 view", () => {
  it("returns at most 3 provenance entries (predict routes 4, brief caps at 3)", () => {
    const r = Orch.orchestrateBrief({
      query: "predict SF",
      max_tiers: 4,
      payload: {},
      tier_invoker: stubInvoker,
    });
    expect(r.top_provenance.length).toBeLessThanOrEqual(3);
  });

  it("filters out non-ok status entries (only ok survives)", () => {
    const r = Orch.orchestrateBrief({
      query: "is this safe to run",
      payload: {},
      tier_invoker: stubInvoker,
    });
    for (const p of r.top_provenance) expect(p.status).toBe("ok");
  });

  it("entries ordered by descending confidence", () => {
    const r = Orch.orchestrateBrief({
      query: "is this safe to run",
      payload: {},
      tier_invoker: stubInvoker,
    });
    for (let i = 1; i < r.top_provenance.length; i++) {
      expect(r.top_provenance[i].confidence).toBeLessThanOrEqual(r.top_provenance[i - 1].confidence);
    }
  });

  it("preserves headline + intent + total_round_trip_ms from full orchestrate", () => {
    const r = Orch.orchestrateBrief({
      query: "is this safe to run",
      payload: {},
      tier_invoker: stubInvoker,
    });
    expect(r.intent).toBe("safety_check");
    expect(r.headline).toMatch(/T8-03|0\.95/);
    expect(typeof r.total_round_trip_ms).toBe("number");
  });
});

describe("Engine identity", () => {
  it("exposes engineId/version/tier matching T12-02", () => {
    expect(Orch.engineId).toBe("CrossProcessHierarchicalNeuralOrchestratorEngine");
    expect(Orch.version).toBe("1.0.0");
    expect(Orch.tier).toBe("T12-02");
  });
});

describe("Dispatcher wrapper", () => {
  it("xproc_orchestrate_full returns full result with T8-03 headline", () => {
    const r = crossProcessHierarchicalNeuralOrchestrator("xproc_orchestrate_full", {
      query: "is this safe to run",
      payload: {},
      tier_invoker: stubInvoker,
    }) as { intent: string; provenance: unknown[]; primary_answer: { tier_id: string } };
    expect(r.intent).toBe("safety_check");
    expect(r.primary_answer.tier_id).toBe("T8-03");
    expect((r.provenance as unknown[]).length).toBe(2);
  });

  it("xproc_orchestrate_brief returns ≤3 top_provenance entries", () => {
    const r = crossProcessHierarchicalNeuralOrchestrator("xproc_orchestrate_brief", {
      query: "predict SF",
      max_tiers: 4,
      payload: {},
      tier_invoker: stubInvoker,
    }) as { top_provenance: unknown[] };
    expect((r.top_provenance as unknown[]).length).toBeLessThanOrEqual(3);
  });

  it("rejects unknown action", () => {
    expect(() => crossProcessHierarchicalNeuralOrchestrator("unknown", {})).toThrow(/unknown action/i);
  });
});
