/**
 * CrossProcessHierarchicalNeuralOrchestratorEngine — T12-02 tests.
 * Compose tier outputs into a unified answer with provenance.
 */

import { describe, it, expect } from "vitest";
import {
  CrossProcessHierarchicalNeuralOrchestratorEngine as Orch,
  crossProcessHierarchicalNeuralOrchestrator,
  crossProcessHierarchicalNeuralOrchestratorAsync,
  buildOllamaTierInvoker,
  type OrchestrateInput,
  type AsyncTierInvoker,
  type TierInvokeContext,
  type OllamaTierClient,
} from "../engines/CrossProcessHierarchicalNeuralOrchestratorEngine.js";
import type { TierId } from "../engines/CrossProcessTierRouterEngine.js";

// Deterministic async invoker for orchestrateLive tests (NO network — returns a
// per-tier object so the test verifies real fan-out + composition, not Ollama).
const liveInvoker: AsyncTierInvoker = async (ctx) => ({
  answer: `live-${ctx.tier_id}`,
  engine: ctx.engine_id,
  intent: ctx.intent,
});

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

describe("fan_out_mode — R12 fail-loud stub-vs-real signal", () => {
  it("fan_out_mode='supplied' when a tier_invoker is provided and tiers respond", () => {
    const r = Orch.orchestrate({
      query: "is this safe to run",
      payload: {},
      tier_invoker: stubInvoker,
    });
    expect(r.provenance.filter((p) => p.status === "ok").length).toBeGreaterThan(0);
    expect(r.fan_out_mode).toBe("supplied");
  });

  it("fan_out_mode='default_stub' when NO tier_invoker is supplied (built-in placeholder ran)", () => {
    const r = Orch.orchestrate({
      query: "is this safe to run",
      payload: {},
    });
    expect(r.provenance.filter((p) => p.status === "ok").length).toBeGreaterThan(0);
    expect(r.fan_out_mode).toBe("default_stub");
  });

  it("default_stub headline FAILS LOUD — discloses placeholder, does NOT pose as a real answer", () => {
    const r = Orch.orchestrate({
      query: "is this safe to run",
      payload: {},
    });
    // tier_id still populated (routing reached the tier) but the headline must
    // not claim a confident real answer — it must disclose the stub.
    expect(r.primary_answer.tier_id).toBe("T8-03");
    expect(r.primary_answer.headline).toMatch(/STUB|placeholder/i);
    expect(r.primary_answer.headline).not.toMatch(/^Primary answer from/);
  });

  it("fan_out_mode='none' when no tier produces an ok output", () => {
    const r = Orch.orchestrate({
      query: "asdfgh nonsense xyz",
      context_hint: "auto",
      payload: {},
    });
    expect(r.provenance.filter((p) => p.status === "ok").length).toBe(0);
    expect(r.fan_out_mode).toBe("none");
  });

  it("supplied vs default_stub headlines differ for the SAME query (the only delta is the invoker)", () => {
    const real = Orch.orchestrate({ query: "is this safe to run", payload: {}, tier_invoker: stubInvoker });
    const stub = Orch.orchestrate({ query: "is this safe to run", payload: {} });
    expect(real.fan_out_mode).toBe("supplied");
    expect(stub.fan_out_mode).toBe("default_stub");
    expect(real.primary_answer.headline).not.toBe(stub.primary_answer.headline);
    expect(real.primary_answer.headline).toMatch(/^Primary answer from/);
  });

  it("orchestrateBrief forwards fan_out_mode (default_stub when no invoker)", () => {
    const r = Orch.orchestrateBrief({ query: "is this safe to run", payload: {} });
    expect(r.fan_out_mode).toBe("default_stub");
    const r2 = Orch.orchestrateBrief({ query: "is this safe to run", payload: {}, tier_invoker: stubInvoker });
    expect(r2.fan_out_mode).toBe("supplied");
  });

  it("dispatcher wrapper xproc_orchestrate_full surfaces fan_out_mode", () => {
    const r = crossProcessHierarchicalNeuralOrchestrator("xproc_orchestrate_full", {
      query: "is this safe to run",
      payload: {},
    }) as { fan_out_mode: string };
    expect(r.fan_out_mode).toBe("default_stub");
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

describe("orchestrateLive — real async fan-out (fan_out_mode='live')", () => {
  it("returns a LIVE headline from the highest-confidence tier, not a stub echo", async () => {
    const r = await Orch.orchestrateLive({ query: "is this safe to run", payload: {} }, liveInvoker);
    expect(r.fan_out_mode).toBe("live");
    expect(r.intent).toBe("safety_check");
    expect(r.primary_answer.tier_id).toBe("T8-03");
    expect(r.primary_answer.confidence).toBeCloseTo(0.95, 2);
    expect(r.primary_answer.headline).toMatch(/^Live answer from T8-03/);
    expect(r.primary_answer.headline).not.toMatch(/STUB|placeholder/i);
  });

  it("hands each tier a rich context (query, intent, reason, confidence, engine_id, payload)", async () => {
    const captured: TierInvokeContext[] = [];
    const capInvoker: AsyncTierInvoker = async (ctx) => { captured.push(ctx); return { ok: true }; };
    await Orch.orchestrateLive({ query: "is this safe to run", payload: { foo: "bar" } }, capInvoker);
    expect(captured.length).toBe(2);
    const t803 = captured.find((c) => c.tier_id === "T8-03");
    expect(t803?.tier_id).toBe("T8-03");
    expect(t803!.engine_id).toBe("CrossProcessNeuroSymbolicSafetyVerifierEngine");
    expect(t803!.intent).toBe("safety_check");
    expect(t803!.query).toBe("is this safe to run");
    expect(t803!.confidence).toBeCloseTo(0.95, 2);
    expect(t803!.reason).toMatch(/safety|neuro-symbolic/i);
    expect(t803!.payload).toEqual({ foo: "bar" });
  });

  it("fans out in parallel; provenance preserves route order (desc confidence) + carries real output", async () => {
    const r = await Orch.orchestrateLive({ query: "is this safe to run", payload: {} }, liveInvoker);
    const ok = r.provenance.filter((p) => p.status === "ok");
    expect(ok.length).toBe(2);
    expect(r.provenance[0].tier_id).toBe("T8-03"); // highest conf first
    expect(r.provenance[1].tier_id).toBe("T8-01");
    expect(r.provenance[0].output).toEqual({
      answer: "live-T8-03",
      engine: "CrossProcessNeuroSymbolicSafetyVerifierEngine",
      intent: "safety_check",
    });
  });

  it("one tier rejecting does NOT abort the others (graceful degradation, still 'live')", async () => {
    const flaky: AsyncTierInvoker = async (ctx) => {
      if (ctx.tier_id === "T8-01") throw new Error("flaky live T8-01");
      return { ok: ctx.tier_id };
    };
    const r = await Orch.orchestrateLive({ query: "is this safe to run", payload: {} }, flaky);
    const ok = r.provenance.filter((p) => p.status === "ok");
    const err = r.provenance.filter((p) => p.status === "error");
    expect(ok.map((p) => p.tier_id)).toEqual(["T8-03"]);
    expect(err.map((p) => p.tier_id)).toEqual(["T8-01"]);
    expect(err[0].error_message).toBe("flaky live T8-01");
    expect(r.fan_out_mode).toBe("live");
  });

  it("when EVERY available tier rejects, fan_out_mode='none' + headline does not claim an answer", async () => {
    const allFail: AsyncTierInvoker = async () => { throw new Error("ollama down"); };
    const r = await Orch.orchestrateLive({ query: "is this safe to run", payload: {} }, allFail);
    expect(r.provenance.filter((p) => p.status === "ok").length).toBe(0);
    expect(r.fan_out_mode).toBe("none");
    expect(r.primary_answer.tier_id).toBeNull();
    expect(r.primary_answer.headline).toMatch(/No tier responded/i);
  });

  it("unavailable tiers surface honestly (predict route → all blocked, invoker never called)", async () => {
    let called = 0;
    const countInvoker: AsyncTierInvoker = async (ctx) => { called++; return { ok: ctx.tier_id }; };
    const r = await Orch.orchestrateLive({ query: "predict SF for inconel", payload: {} }, countInvoker);
    const t102 = r.unavailable_tiers.find((u) => u.tier_id === "T1-02");
    expect(t102?.engine_id).toBe("CrossProcessTransferModelEngine");
    expect(t102?.reason).toMatch(/not yet built|prerequisite/i);
    expect(called).toBe(0); // none of the predict tiers are available
    expect(r.fan_out_mode).toBe("none");
    expect(r.primary_answer.headline).toMatch(/blocked|prerequisite/i);
  });

  it("nonsense query → empty provenance, fan_out_mode='none', null headline tier", async () => {
    const r = await Orch.orchestrateLive(
      { query: "asdfgh nonsense xyz", context_hint: "auto", payload: {} },
      liveInvoker,
    );
    expect(r.provenance).toEqual([]);
    expect(r.fan_out_mode).toBe("none");
    expect(r.primary_answer.tier_id).toBeNull();
    expect(r.primary_answer.confidence).toBe(0);
  });

  it("adversarial: invoker resolving null is recorded status='ok' with null output (a response IS a response)", async () => {
    const nullInvoker: AsyncTierInvoker = async () => null;
    const r = await Orch.orchestrateLive({ query: "is this safe to run", payload: {} }, nullInvoker);
    const ok = r.provenance.filter((p) => p.status === "ok");
    expect(ok.length).toBe(2);
    expect(ok[0].output).toBeNull();
    expect(r.fan_out_mode).toBe("live");
  });

  it("adversarial: rejects a non-function invoker (fail loud, do not silently stub)", async () => {
    await expect(
      Orch.orchestrateLive({ query: "is this safe to run", payload: {} }, null as unknown as AsyncTierInvoker),
    ).rejects.toThrow(/async tier invoker/i);
  });

  it("rejects empty query (Zod min(1)) and oversized query (Zod max(2000))", async () => {
    await expect(
      Orch.orchestrateLive({ query: "", payload: {} } as OrchestrateInput, liveInvoker),
    ).rejects.toThrow();
    await expect(
      Orch.orchestrateLive({ query: "x".repeat(2001), payload: {} } as OrchestrateInput, liveInvoker),
    ).rejects.toThrow();
  });

  it("total_round_trip_ms is non-negative and finite", async () => {
    const r = await Orch.orchestrateLive({ query: "is this safe to run", payload: {} }, liveInvoker);
    expect(r.total_round_trip_ms).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(r.total_round_trip_ms)).toBe(true);
  });

  it("LIVE vs sync-stub: SAME query, only the invoker differs → headlines + fan_out_mode diverge", async () => {
    const live = await Orch.orchestrateLive({ query: "is this safe to run", payload: {} }, liveInvoker);
    const stub = Orch.orchestrate({ query: "is this safe to run", payload: {} });
    expect(live.fan_out_mode).toBe("live");
    expect(stub.fan_out_mode).toBe("default_stub");
    expect(live.primary_answer.headline).not.toBe(stub.primary_answer.headline);
    expect(live.primary_answer.headline).toMatch(/^Live answer/);
    expect(stub.primary_answer.headline).toMatch(/STUB|placeholder/i);
  });
});

describe("crossProcessHierarchicalNeuralOrchestratorAsync — dispatcher round-trip", () => {
  it("xproc_orchestrate_live routes through the async wrapper with an injected invoker", async () => {
    const r = (await crossProcessHierarchicalNeuralOrchestratorAsync("xproc_orchestrate_live", {
      query: "is this safe to run",
      payload: {},
      tier_invoker_async: liveInvoker,
    })) as { fan_out_mode: string; primary_answer: { tier_id: string } };
    expect(r.fan_out_mode).toBe("live");
    expect(r.primary_answer.tier_id).toBe("T8-03");
  });

  it("async wrapper rejects an unknown action", async () => {
    await expect(crossProcessHierarchicalNeuralOrchestratorAsync("nope", {})).rejects.toThrow(/unknown action/i);
  });
});

describe("buildOllamaTierInvoker — Ollama-offload default invoker (injected stub client, no network)", () => {
  type GenResult = { ok: boolean; value: string | null; error: string | null; wallMs: number };
  function makeStub(cfg: {
    connectOk?: boolean;
    connectErr?: string | null;
    gen?: (o: { model: string; prompt: string; system?: string }) => Promise<GenResult>;
  }): { client: OllamaTierClient; calls: () => number; model: () => string } {
    let connectCalls = 0;
    let lastModel = "";
    const client: OllamaTierClient = {
      async connect() {
        connectCalls++;
        return { ok: cfg.connectOk ?? true, error: cfg.connectErr ?? null };
      },
      async generate(o) {
        lastModel = o.model;
        return cfg.gen ? cfg.gen(o) : { ok: true, value: "stub-answer", error: null, wallMs: 7 };
      },
    };
    return { client, calls: () => connectCalls, model: () => lastModel };
  }
  const ctx: TierInvokeContext = {
    tier_id: "T8-03",
    engine_id: "CrossProcessNeuroSymbolicSafetyVerifierEngine",
    reason: "neuro-symbolic safety verifier",
    confidence: 0.95,
    query: "is this safe",
    intent: "safety_check",
    payload: {},
  };

  it("happy path: returns {tier_id, engine_id, model, answer, wall_ms} from the real generate result", async () => {
    const { client } = makeStub({});
    const invoke = await buildOllamaTierInvoker({ client });
    const out = (await invoke(ctx)) as { tier_id: string; model: string; answer: string; wall_ms: number };
    expect(out.tier_id).toBe("T8-03");
    expect(out.answer).toBe("stub-answer");
    expect(out.wall_ms).toBe(7);
  });

  it("model resolution: defaults to qwen2.5-coder:32b when no opts.model + no env", async () => {
    const prev = process.env.PRISM_XPROC_LIVE_MODEL;
    delete process.env.PRISM_XPROC_LIVE_MODEL;
    try {
      const { client, model } = makeStub({});
      const invoke = await buildOllamaTierInvoker({ client });
      await invoke(ctx);
      expect(model()).toBe("qwen2.5-coder:32b");
    } finally {
      if (prev === undefined) delete process.env.PRISM_XPROC_LIVE_MODEL;
      else process.env.PRISM_XPROC_LIVE_MODEL = prev;
    }
  });

  it("model resolution: env PRISM_XPROC_LIVE_MODEL is honored (guards the string|false coalesce bug)", async () => {
    const prev = process.env.PRISM_XPROC_LIVE_MODEL;
    process.env.PRISM_XPROC_LIVE_MODEL = "env-model:7b";
    try {
      const { client, model } = makeStub({});
      const invoke = await buildOllamaTierInvoker({ client });
      await invoke(ctx);
      expect(model()).toBe("env-model:7b");
    } finally {
      if (prev === undefined) delete process.env.PRISM_XPROC_LIVE_MODEL;
      else process.env.PRISM_XPROC_LIVE_MODEL = prev;
    }
  });

  it("model resolution: explicit opts.model overrides env + default", async () => {
    const { client, model } = makeStub({});
    const invoke = await buildOllamaTierInvoker({ client, model: "gpt-oss:120b" });
    await invoke(ctx);
    expect(model()).toBe("gpt-oss:120b");
  });

  it("connect is memoized: 2 parallel tier calls trigger exactly ONE connect (no race)", async () => {
    const { client, calls } = makeStub({});
    const invoke = await buildOllamaTierInvoker({ client });
    await Promise.all([invoke(ctx), invoke({ ...ctx, tier_id: "T8-01" })]);
    expect(calls()).toBe(1);
  });

  it("fail-loud: connect failure throws (tier will record status='error', never a silent stub)", async () => {
    const { client } = makeStub({ connectOk: false, connectErr: "ECONNREFUSED" });
    const invoke = await buildOllamaTierInvoker({ client });
    await expect(invoke(ctx)).rejects.toThrow(/Ollama unreachable.*ECONNREFUSED/);
  });

  it("fail-loud: generate ok:false throws with the real error", async () => {
    const { client } = makeStub({ gen: async () => ({ ok: false, value: null, error: "model not found", wallMs: 3 }) });
    const invoke = await buildOllamaTierInvoker({ client });
    await expect(invoke(ctx)).rejects.toThrow(/generate failed.*model not found/);
  });

  it("fail-loud: empty/whitespace response throws (does not pose blank as an answer)", async () => {
    const { client } = makeStub({ gen: async () => ({ ok: true, value: "   ", error: null, wallMs: 3 }) });
    const invoke = await buildOllamaTierInvoker({ client });
    await expect(invoke(ctx)).rejects.toThrow(/generate failed/);
  });

  it("fail-loud: a hung generate is bounded by the timeout", async () => {
    const { client } = makeStub({ gen: () => new Promise<GenResult>(() => { /* never resolves */ }) });
    const invoke = await buildOllamaTierInvoker({ client, timeoutMs: 30 });
    await expect(invoke(ctx)).rejects.toThrow(/timed out/i);
  });

  it("round-trips through orchestrateLive: a stub-built invoker yields fan_out_mode='live'", async () => {
    const { client } = makeStub({ gen: async (o) => ({ ok: true, value: `ans for ${o.model}`, error: null, wallMs: 4 }) });
    const invoke = await buildOllamaTierInvoker({ client });
    const r = await Orch.orchestrateLive({ query: "is this safe to run", payload: {} }, invoke);
    expect(r.fan_out_mode).toBe("live");
    expect(r.provenance.filter((p) => p.status === "ok").length).toBe(2);
  });
});
