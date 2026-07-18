/**
 * CrossProcessHierarchicalNeuralOrchestratorEngine — XPROC-NEURAL Tier 12 (T12-02)
 *
 * Top-level operator-facing orchestrator. Composes outputs from multiple
 * XPROC tier engines into a single answer with full provenance.
 *
 * Pipeline:
 *   1. Route query → T12-01 returns tier list
 *   2. For each available tier, invoke its primary engine with the query's
 *      payload (events, candidates, context)
 *   3. Aggregate results into a primary_answer (highest-confidence tier wins
 *      the headline) plus a provenance array preserving every contributing
 *      tier's output
 *   4. Compute total_round_trip_ms (acceptance threshold: <500ms p99)
 *
 * Graceful degradation: tiers blocked on prerequisites are surfaced in
 * `unavailable_tiers` with their roadmap dependency chain. The orchestrator
 * does NOT block — it returns whatever subset of tiers responded so the
 * operator gets a partial-but-honest answer instead of a hard failure.
 *
 * Provenance is mandatory per CLAUDE.md operator-in-the-loop principle:
 * every tier output carries (tier_id, engine_id, output, confidence, runtime_ms)
 * so the operator can audit any single dimension before acting on the
 * orchestrator's headline recommendation.
 *
 * Brief mode (`xproc_orchestrate_brief`): returns the headline + top-3
 * provenance entries, dropping low-confidence tier outputs to keep the
 * shop-floor UI legible.
 *
 * @module CrossProcessHierarchicalNeuralOrchestratorEngine
 */

import { z } from "zod";
import {
  CrossProcessTierRouterEngine,
  type RouteInput,
  type RouteResult,
  type TierId,
} from "./CrossProcessTierRouterEngine.js";

const OrchestrateInputSchema = z.object({
  query: z.string().min(1).max(2000),
  context_hint: z.enum([
    "prediction", "safety", "explanation", "exploration",
    "calibration", "fleet", "novel_material", "auto",
  ]).default("auto"),
  max_tiers: z.number().int().min(1).max(11).default(4),
  payload: z.record(z.string(), z.unknown()).default({}).describe("Tier-specific inputs (events, candidates, history, etc.)"),
  tier_invoker: z.unknown().optional().describe("Optional sync invoker function for testing — bypasses real engine imports"),
});
export type OrchestrateInput = z.infer<typeof OrchestrateInputSchema>;

export interface ProvenanceEntry {
  tier_id: TierId;
  engine_id: string;
  confidence: number;
  output: unknown;
  runtime_ms: number;
  status: "ok" | "skipped_unavailable" | "error";
  error_message?: string;
}

export interface OrchestrateResult {
  query: string;
  intent: string;
  primary_answer: {
    headline: string;
    tier_id: TierId | null;
    confidence: number;
  };
  provenance: ProvenanceEntry[];
  unavailable_tiers: Array<{ tier_id: TierId; engine_id: string; reason: string }>;
  total_round_trip_ms: number;
  rationale: string;
  /**
   * R12 fail-loud signal: whether primary_answer came from a real supplied tier
   * invoker or the built-in placeholder stub. A consumer MUST check this before
   * trusting primary_answer -- in "default_stub" mode the headline is a placeholder
   * echo, NOT a real answer.
   *   "supplied"     -- a sync tier_invoker was provided; primary_answer is from it.
   *   "default_stub" -- NO tier_invoker; primary_answer is a placeholder echo.
   *   "live"         -- orchestrateLive ran a REAL async invoker (e.g. Ollama)
   *                     for >=1 tier; primary_answer is a genuine answer.
   *   "none"         -- no tier produced an ok output; primary_answer.tier_id is null.
   */
  fan_out_mode: "supplied" | "default_stub" | "live" | "none";
}

type TierInvoker = (tierId: TierId, engineId: string, payload: Record<string, unknown>) => unknown;

/**
 * Rich per-tier context handed to a LIVE async invoker. Unlike the sync
 * {@link TierInvoker} (positional tier_id/engine_id/payload), the async invoker
 * also receives the operator query, the routed intent, the tier's routing
 * rationale, and its confidence so it can produce a genuine per-dimension
 * answer (e.g. via a local Ollama model) instead of an echo.
 */
export interface TierInvokeContext {
  tier_id: TierId;
  engine_id: string;
  reason: string;
  confidence: number;
  query: string;
  intent: string;
  payload: Record<string, unknown>;
}
export type AsyncTierInvoker = (ctx: TierInvokeContext) => Promise<unknown>;

/**
 * Default invoker — for tiers that are built, invoke a deterministic stub
 * that returns the tier's name as evidence the routing reached it. The real
 * orchestrator can be retrofit with actual engine imports once cross-tier
 * payload schemas converge; for now this preserves the contract without
 * coupling the orchestrator to every engine signature (which would create
 * 44 import dependencies and a fragile ordering problem).
 */
const defaultInvoker: TierInvoker = (tierId, engineId) => ({
  tier_id: tierId,
  engine_id: engineId,
  echo: `Tier ${tierId} acknowledged via default stub invoker; supply tier_invoker for real fan-out.`,
});

export class CrossProcessHierarchicalNeuralOrchestratorEngine {
  /**
   * Full orchestration: route → fan-out → compose → return all provenance.
   */
  static orchestrate(input: OrchestrateInput): OrchestrateResult {
    const t0 = Date.now();
    const parsed = OrchestrateInputSchema.parse(input);

    const routeInput: RouteInput = {
      query: parsed.query,
      context_hint: parsed.context_hint,
      max_tiers: parsed.max_tiers,
    };
    const route: RouteResult = CrossProcessTierRouterEngine.route(routeInput);

    const usedDefaultInvoker = parsed.tier_invoker == null;
    const invoker: TierInvoker = (parsed.tier_invoker as TierInvoker | undefined) ?? defaultInvoker;

    const provenance: ProvenanceEntry[] = [];
    const unavailable: Array<{ tier_id: TierId; engine_id: string; reason: string }> = [];

    for (const tier of route.tiers) {
      if (!tier.available) {
        provenance.push({
          tier_id: tier.tier_id,
          engine_id: tier.engine_id,
          confidence: tier.confidence,
          output: null,
          runtime_ms: 0,
          status: "skipped_unavailable",
        });
        unavailable.push({
          tier_id: tier.tier_id,
          engine_id: tier.engine_id,
          reason: `Engine ${tier.engine_id} not yet built; routed by intent='${route.intent}' but blocked on roadmap prerequisites.`,
        });
        continue;
      }

      const tStart = Date.now();
      try {
        const out = invoker(tier.tier_id, tier.engine_id, parsed.payload);
        provenance.push({
          tier_id: tier.tier_id,
          engine_id: tier.engine_id,
          confidence: tier.confidence,
          output: out,
          runtime_ms: Date.now() - tStart,
          status: "ok",
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        provenance.push({
          tier_id: tier.tier_id,
          engine_id: tier.engine_id,
          confidence: tier.confidence,
          output: null,
          runtime_ms: Date.now() - tStart,
          status: "error",
          error_message: msg,
        });
      }
    }

    // Headline: highest-confidence ok-status tier
    const okEntries = provenance.filter((p) => p.status === "ok");
    let headlineTierId: TierId | null = null;
    let headlineConf = 0;
    let headline = "No tier responded successfully — see provenance for details.";

    if (okEntries.length > 0) {
      const top = okEntries.reduce((best, cur) => (cur.confidence > best.confidence ? cur : best));
      headlineTierId = top.tier_id;
      headlineConf = top.confidence;
      headline = usedDefaultInvoker
        ? `STUB fan-out: no tier_invoker supplied, so ${top.tier_id} (${top.engine_id}) returned a placeholder echo, NOT a real ${route.intent} answer. Supply tier_invoker for real tier engines.`
        : `Primary answer from ${top.tier_id} (${top.engine_id}) at confidence ${top.confidence.toFixed(2)}.`;
    } else if (unavailable.length > 0) {
      headline = `All ${unavailable.length} routed tier(s) blocked on prerequisites; routing decision recorded for follow-up.`;
    }

    const fanOutMode: "supplied" | "default_stub" | "none" =
      okEntries.length === 0 ? "none" : usedDefaultInvoker ? "default_stub" : "supplied";

    const elapsed = Date.now() - t0;
    return {
      query: parsed.query,
      intent: route.intent,
      primary_answer: {
        headline,
        tier_id: headlineTierId,
        confidence: headlineConf,
      },
      provenance,
      unavailable_tiers: unavailable,
      total_round_trip_ms: elapsed,
      rationale:
        `Routed ${route.tiers.length} tier(s) for intent '${route.intent}'; ` +
        `${okEntries.length} succeeded, ${unavailable.length} unavailable, ` +
        `${provenance.filter((p) => p.status === "error").length} errored. ` +
        `Total ${elapsed}ms.`,
      fan_out_mode: fanOutMode,
    };
  }

  /**
   * Live orchestration: SAME routing + provenance + headline contract as
   * {@link orchestrate}, but fans out to a REAL async invoker per available
   * tier (default supplied by the dispatcher: a local Ollama model -- see
   * {@link buildOllamaTierInvoker}) so the headline is a genuine answer, NOT
   * the placeholder echo of the sync default path.
   *
   * Tiers run in PARALLEL (Promise.all); provenance preserves route order. A
   * rejecting tier is recorded status='error' and does NOT abort the others
   * (graceful degradation, identical to the sync path). The engine stays
   * I/O-pure: the invoker is injected, so this method has zero Ollama coupling
   * and is fully testable with a deterministic mock invoker.
   *
   * @param input   same OrchestrateInput contract as orchestrate()
   * @param invoker REQUIRED async per-tier invoker (the Ollama-backed default
   *                lives in the wrapper, not here)
   * @returns OrchestrateResult with fan_out_mode 'live' (>=1 ok) or 'none'
   * @throws if `invoker` is not a function, or Zod input validation fails
   */
  static async orchestrateLive(
    input: OrchestrateInput,
    invoker: AsyncTierInvoker,
  ): Promise<OrchestrateResult> {
    const t0 = Date.now();
    const parsed = OrchestrateInputSchema.parse(input);
    if (typeof invoker !== "function") {
      throw new Error(
        "orchestrateLive requires an async tier invoker function; use sync orchestrate() for the stub path.",
      );
    }

    const route: RouteResult = CrossProcessTierRouterEngine.route({
      query: parsed.query,
      context_hint: parsed.context_hint,
      max_tiers: parsed.max_tiers,
    });

    const provenance: ProvenanceEntry[] = new Array(route.tiers.length);
    const unavailable: Array<{ tier_id: TierId; engine_id: string; reason: string }> = [];
    const jobs: Promise<void>[] = [];

    route.tiers.forEach((tier, i) => {
      if (!tier.available) {
        provenance[i] = {
          tier_id: tier.tier_id,
          engine_id: tier.engine_id,
          confidence: tier.confidence,
          output: null,
          runtime_ms: 0,
          status: "skipped_unavailable",
        };
        unavailable.push({
          tier_id: tier.tier_id,
          engine_id: tier.engine_id,
          reason: `Engine ${tier.engine_id} not yet built; routed by intent='${route.intent}' but blocked on roadmap prerequisites.`,
        });
        return;
      }
      const ctx: TierInvokeContext = {
        tier_id: tier.tier_id,
        engine_id: tier.engine_id,
        reason: tier.reason,
        confidence: tier.confidence,
        query: parsed.query,
        intent: route.intent,
        payload: parsed.payload,
      };
      jobs.push(
        (async () => {
          const tStart = Date.now();
          try {
            const out = await invoker(ctx);
            provenance[i] = {
              tier_id: tier.tier_id,
              engine_id: tier.engine_id,
              confidence: tier.confidence,
              output: out,
              runtime_ms: Date.now() - tStart,
              status: "ok",
            };
          } catch (e) {
            provenance[i] = {
              tier_id: tier.tier_id,
              engine_id: tier.engine_id,
              confidence: tier.confidence,
              output: null,
              runtime_ms: Date.now() - tStart,
              status: "error",
              error_message: e instanceof Error ? e.message : String(e),
            };
          }
        })(),
      );
    });

    await Promise.all(jobs);

    const okEntries = provenance.filter((p) => p.status === "ok");
    let headlineTierId: TierId | null = null;
    let headlineConf = 0;
    let headline = "No tier responded successfully -- see provenance for details.";

    if (okEntries.length > 0) {
      const top = okEntries.reduce((best, cur) => (cur.confidence > best.confidence ? cur : best));
      headlineTierId = top.tier_id;
      headlineConf = top.confidence;
      headline = `Live answer from ${top.tier_id} (${top.engine_id}) at confidence ${top.confidence.toFixed(2)}.`;
    } else if (unavailable.length > 0) {
      headline = `All ${unavailable.length} routed tier(s) blocked on prerequisites; routing decision recorded for follow-up.`;
    }

    const fanOutMode: OrchestrateResult["fan_out_mode"] = okEntries.length === 0 ? "none" : "live";
    const elapsed = Date.now() - t0;
    return {
      query: parsed.query,
      intent: route.intent,
      primary_answer: {
        headline,
        tier_id: headlineTierId,
        confidence: headlineConf,
      },
      provenance,
      unavailable_tiers: unavailable,
      total_round_trip_ms: elapsed,
      rationale:
        `Routed ${route.tiers.length} tier(s) for intent '${route.intent}'; ` +
        `${okEntries.length} succeeded, ${unavailable.length} unavailable, ` +
        `${provenance.filter((p) => p.status === "error").length} errored. ` +
        `Live fan-out, total ${elapsed}ms.`,
      fan_out_mode: fanOutMode,
    };
  }

  /**
   * Brief mode: keep only the headline + top-3 provenance entries, drop the rest.
   */
  static orchestrateBrief(input: OrchestrateInput): {
    headline: string;
    intent: string;
    top_provenance: ProvenanceEntry[];
    total_round_trip_ms: number;
    fan_out_mode: OrchestrateResult["fan_out_mode"];
  } {
    const full = this.orchestrate(input);
    const top = full.provenance
      .filter((p) => p.status === "ok")
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 3);
    return {
      headline: full.primary_answer.headline,
      intent: full.intent,
      top_provenance: top,
      total_round_trip_ms: full.total_round_trip_ms,
      fan_out_mode: full.fan_out_mode,
    };
  }

  static readonly engineId = "CrossProcessHierarchicalNeuralOrchestratorEngine";
  static readonly version = "1.0.0";
  static readonly tier = "T12-02";
}

export const crossProcessHierarchicalNeuralOrchestratorEngine = CrossProcessHierarchicalNeuralOrchestratorEngine;

export function crossProcessHierarchicalNeuralOrchestrator(action: string, params: Record<string, unknown>): unknown {
  switch (action) {
    case "xproc_orchestrate_full":
      return CrossProcessHierarchicalNeuralOrchestratorEngine.orchestrate(params as OrchestrateInput);
    case "xproc_orchestrate_brief":
      return CrossProcessHierarchicalNeuralOrchestratorEngine.orchestrateBrief(params as OrchestrateInput);
    default:
      throw new Error(`crossProcessHierarchicalNeuralOrchestrator: unknown action '${action}'`);
  }
}

/** Race a promise against a timeout so a hung tier (e.g. Ollama stall) fails loud. */
function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    p.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); },
    );
  });
}

/**
 * Minimal structural contract of the Ollama client the live invoker needs.
 * OllamaClientEngine satisfies this structurally; tests inject a stub so the
 * whole Ollama I/O path (connect / generate / timeout / fail-loud / model
 * resolution) is covered without a network call.
 */
export interface OllamaTierClient {
  connect(): Promise<{ ok: boolean; error: string | null }>;
  generate(o: {
    model: string;
    prompt: string;
    system?: string;
    temperature?: number;
    maxTokens?: number;
  }): Promise<{ ok: boolean; value: string | null; error: string | null; wallMs: number }>;
}

/**
 * Default LIVE tier invoker -- offloads each tier to the local Ollama model so
 * the orchestrator returns a REAL per-dimension answer at $0, instead of the
 * sync default's placeholder echo (work-order: "utilize ollama offloading").
 *
 * Fail-loud (R12): throws on an Ollama miss / timeout / empty response so the
 * tier is recorded status='error' with the real reason -- NEVER a silent stub.
 * The Ollama client is connected exactly once (memoized) and reused across the
 * parallel fan-out.
 *
 * Kept OUT of {@link CrossProcessHierarchicalNeuralOrchestratorEngine.orchestrateLive}
 * (which stays I/O-pure) and lazily imports the Ollama client so the pure
 * engine import stays cheap.
 *
 * @param opts.model     Ollama model id (default: env PRISM_XPROC_LIVE_MODEL or qwen2.5-coder:32b)
 * @param opts.timeoutMs per-tier wall-clock cap (default 30000)
 * @param opts.client    injected Ollama client (tests); defaults to a lazily-imported OllamaClientEngine
 */
export async function buildOllamaTierInvoker(opts?: {
  model?: string;
  timeoutMs?: number;
  client?: OllamaTierClient;
}): Promise<AsyncTierInvoker> {
  const client: OllamaTierClient =
    opts?.client ??
    (await import("./OllamaClientEngine.js").then((m) => new m.OllamaClientEngine()));
  // `??` does not coalesce `false`, so the env operand must be string|undefined,
  // never the boolean from a `typeof && ...` short-circuit (else model leaks `false`).
  const envModel =
    typeof process !== "undefined" ? process.env?.PRISM_XPROC_LIVE_MODEL : undefined;
  const model = opts?.model ?? envModel ?? "qwen2.5-coder:32b";
  const timeoutMs = opts?.timeoutMs ?? 30000;

  // Memoize connect so the parallel tier fan-out triggers exactly ONE connect
  // (no check-then-set race); a failed connect fails loud for every tier.
  let connectPromise: Promise<void> | null = null;
  const ensureConnected = (): Promise<void> => {
    if (!connectPromise) {
      connectPromise = client.connect().then((c) => {
        if (!c.ok) throw new Error(`Ollama unreachable for live tier fan-out: ${c.error ?? "connect failed"}`);
      });
    }
    return connectPromise;
  };

  return async (ctx: TierInvokeContext): Promise<unknown> => {
    await ensureConnected();
    const system =
      `You are PRISM XPROC tier ${ctx.tier_id} (${ctx.engine_id}). Your dimension: ${ctx.reason}. ` +
      `Answer ONLY for your dimension of the operator's ${ctx.intent} question, concisely (<=120 words), ` +
      `manufacturing-grounded. If you lack the data to answer, say so plainly -- never fabricate numbers.`;
    const payloadStr =
      Object.keys(ctx.payload).length > 0
        ? `\n\nContext payload: ${JSON.stringify(ctx.payload).slice(0, 2000)}`
        : "";
    const prompt = `Operator query: ${ctx.query}${payloadStr}`;
    const r = await withTimeout(
      client.generate({ model, prompt, system, temperature: 0.2, maxTokens: 400 }),
      timeoutMs,
      `tier ${ctx.tier_id} ollama generate`,
    );
    if (!r.ok || r.value == null || r.value.trim() === "") {
      throw new Error(`Ollama generate failed for ${ctx.tier_id}: ${r.error ?? "empty response"}`);
    }
    return { tier_id: ctx.tier_id, engine_id: ctx.engine_id, model, answer: r.value, wall_ms: r.wallMs };
  };
}

/**
 * Async dispatcher wrapper for the LIVE orchestration path. Routed via the
 * aiReasoningDispatcher XPROC_ROUTES map (action 'xproc_orchestrate_live').
 *
 * Invoker resolution: a caller may inject `tier_invoker_async` in params (used
 * by tests for a deterministic, network-free run); otherwise the Ollama-backed
 * default is built. Keeping the I/O in this wrapper (not the engine method)
 * preserves the engine's purity + testability.
 */
export async function crossProcessHierarchicalNeuralOrchestratorAsync(
  action: string,
  params: Record<string, unknown>,
): Promise<unknown> {
  switch (action) {
    case "xproc_orchestrate_live": {
      const injected = params.tier_invoker_async;
      const invoker: AsyncTierInvoker =
        typeof injected === "function"
          ? (injected as AsyncTierInvoker)
          : await buildOllamaTierInvoker();
      return CrossProcessHierarchicalNeuralOrchestratorEngine.orchestrateLive(
        params as OrchestrateInput,
        invoker,
      );
    }
    default:
      throw new Error(`crossProcessHierarchicalNeuralOrchestratorAsync: unknown action '${action}'`);
  }
}
