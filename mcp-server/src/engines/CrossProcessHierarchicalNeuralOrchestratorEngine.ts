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
}

type TierInvoker = (tierId: TierId, engineId: string, payload: Record<string, unknown>) => unknown;

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
      headline = `Primary answer from ${top.tier_id} (${top.engine_id}) at confidence ${top.confidence.toFixed(2)}.`;
    } else if (unavailable.length > 0) {
      headline = `All ${unavailable.length} routed tier(s) blocked on prerequisites; routing decision recorded for follow-up.`;
    }

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
