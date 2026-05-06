/**
 * CrossProcessFedAvgAggregatorEngine — XPROC-NEURAL Tier 6 (T6-01)
 *
 * Federated Averaging (McMahan, Moore, Ramage, Hampson, Arcas 2017,
 * "Communication-Efficient Learning of Deep Networks from Decentralized
 * Data," AISTATS) with PRISM's local-vs-shared client weighting.
 *
 * Vanilla FedAvg:
 *   w_global = Σ_i (n_i / N) · w_i
 *   where n_i is client i's local-data sample count, N = Σ_i n_i, and
 *   w_i is client i's locally-trained weight vector.
 *
 * PRISM extension (per CLAUDE.md federated weighting rule):
 *   Local clients (this shop's own data): full weight n_i.
 *   Shared clients (other shops' data via federation): halved n_i (= 0.5×).
 *   This biases the aggregate toward the local shop's distribution while
 *   still benefiting from cross-shop generalization. The 0.5× factor is
 *   the SLBRulesEngine constant from PRISM-SELF-AWARENESS-DIRECTIVE.md
 *   §federated-weighting.
 *
 * Architecture decision — pure aggregator (matches Tier 5 pattern):
 *   The engine accepts caller-supplied {weights[], sampleCount, isLocal}
 *   tuples per client. It does NOT train or hold any networks. This
 *   decouples T6-01 from any specific T1-02 implementation and lets
 *   T6-02 (SecureAggregation) and T6-03 (DriftAwareFederation) consume
 *   the same {clients[], clientUpdate} input shape.
 *
 *   Why pure aggregator vs full-stack FedAvg:
 *     1. Decouples from T1-02 (in-flight on a separate worktree).
 *     2. Composable: T6-02 can wrap our aggregate() with masking; T6-03
 *        can pre-filter clients before invoking our aggregate.
 *     3. Testable: synthetic client tuples let us verify the math
 *        (acceptance: aggregated weights match centralized baseline
 *        within 2% RMSE on synthetic data).
 *
 * Algorithm (per round):
 *   1. Compute effective sample counts: n_i_eff = isLocal ? n_i : SHARED_FACTOR × n_i.
 *   2. Compute total: N_eff = Σ_i n_i_eff.
 *   3. For each weight index k: w_global[k] = Σ_i (n_i_eff / N_eff) · w_i[k].
 *   4. Round summary: per-client contribution share, total participants,
 *      and the local-vs-shared split for governance audit.
 *
 * Failure modes covered:
 *   1. Empty client list                  → invalid_input
 *   2. Single-client aggregation          → returns that client's weights unchanged
 *   3. NaN/Inf in any weight              → invalid_input
 *   4. Mismatched weight-vector lengths   → invalid_input (Zod gate)
 *   5. n_i = 0 (zero-sample client)       → skipped + warn (no contribution)
 *   6. All clients have n_i = 0           → invalid_state on aggregate
 *   7. Negative sample counts             → invalid_input (Zod gate)
 *   8. Weight count beyond MAX_WEIGHTS    → invalid_input (DoS guard)
 *   9. Client count beyond MAX_CLIENTS    → invalid_input (DoS guard)
 *
 * Acceptance (XPROC-NEURAL-ROADMAP.md Tier 6 R1):
 *   "Aggregated weights match centralized-trained baseline within 2%
 *   accuracy." Verified in test suite via synthetic dataset where the
 *   centralized average is computed analytically and compared to the
 *   FedAvg aggregate at the per-element level.
 *
 * @module CrossProcessFedAvgAggregatorEngine
 */

import { z } from "zod";

// ============================================================================
// Constants
// ============================================================================

/** PRISM weighting rule: shared (cross-shop) clients are halved.
 *  Per CLAUDE.md §federated-weighting / PRISM-SELF-AWARENESS-DIRECTIVE.md. */
const SHARED_FACTOR = 0.5;

/** Sanity bound on per-client weight vector length. */
const MAX_WEIGHTS = 1_000_000;

/** Sanity bound on client count per round. */
const MAX_CLIENTS = 1024;

// ============================================================================
// Schemas
// ============================================================================

const ClientUpdateSchema = z.object({
  clientId: z.string().min(1).max(128),
  weights: z.array(z.number().finite()).min(1).max(MAX_WEIGHTS),
  sampleCount: z.number().int().nonnegative(),
  /** True for local-shop clients (full weight); false for federated peers (0.5×). */
  isLocal: z.boolean().default(true),
});

const AggregateInputSchema = z.object({
  clients: z.array(ClientUpdateSchema).min(1).max(MAX_CLIENTS),
});

const RoundSummaryInputSchema = z.object({
  clients: z.array(ClientUpdateSchema).min(1).max(MAX_CLIENTS),
});

// ============================================================================
// Public types
// ============================================================================

export interface ClientUpdate {
  clientId: string;
  weights: number[];
  sampleCount: number;
  isLocal: boolean;
}

export interface ClientContribution {
  clientId: string;
  effectiveSampleCount: number;
  share: number;       // n_i_eff / N_eff
  isLocal: boolean;
  skipped: boolean;
  reason?: string;
}

export interface AggregateOk {
  ok: true;
  /** Aggregated global weight vector. */
  globalWeights: number[];
  /** Effective participant count after zero-sample skipping. */
  effectiveParticipants: number;
  /** Total effective sample count (denominator). */
  totalEffectiveSamples: number;
  /** Per-client contribution diagnostics. */
  contributions: ClientContribution[];
  warnings: string[];
}

export interface RoundSummaryOk {
  ok: true;
  participants: number;
  localCount: number;
  sharedCount: number;
  localSampleSum: number;
  sharedSampleSum: number;
  /** Effective-weight ratio between local and shared (after SHARED_FACTOR). */
  localShareEffective: number;
  sharedShareEffective: number;
  warnings: string[];
}

export interface OpErr {
  ok: false;
  error: "invalid_input" | "invalid_state";
  message: string;
}

export type AggregateResult = AggregateOk | OpErr;
export type RoundSummaryResult = RoundSummaryOk | OpErr;

// ============================================================================
// Helpers
// ============================================================================

function ensureUniformLength(clients: ClientUpdate[]): { ok: true } | { ok: false; expected: number; mismatchAt: number } {
  if (clients.length === 0) return { ok: true };
  const expected = clients[0].weights.length;
  for (let i = 1; i < clients.length; i++) {
    if (clients[i].weights.length !== expected) {
      return { ok: false, expected, mismatchAt: i };
    }
  }
  return { ok: true };
}

function effectiveSampleCount(c: ClientUpdate): number {
  return c.isLocal ? c.sampleCount : SHARED_FACTOR * c.sampleCount;
}

// ============================================================================
// Public API
// ============================================================================

export class CrossProcessFedAvgAggregatorEngine {
  static readonly tier = "T6-01";

  /**
   * Aggregate a round of client weight vectors using FedAvg with PRISM's
   * local/shared weighting. Pure function.
   */
  static aggregate(input: unknown): AggregateResult {
    const parsed = AggregateInputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false, error: "invalid_input",
        message: parsed.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
      };
    }
    const { clients } = parsed.data;
    const lengthCheck = ensureUniformLength(clients as ClientUpdate[]);
    if (!lengthCheck.ok) {
      return {
        ok: false, error: "invalid_input",
        message: `weights length mismatch: client[0] has ${lengthCheck.expected}, client[${lengthCheck.mismatchAt}] differs`,
      };
    }

    const warnings: string[] = [];
    const contributions: ClientContribution[] = [];
    const eligibleClients: { update: ClientUpdate; effective: number }[] = [];
    for (const c of clients as ClientUpdate[]) {
      if (c.sampleCount === 0) {
        contributions.push({
          clientId: c.clientId,
          effectiveSampleCount: 0,
          share: 0,
          isLocal: c.isLocal,
          skipped: true,
          reason: "sampleCount=0",
        });
        warnings.push(`client '${c.clientId}' skipped (sampleCount=0)`);
        continue;
      }
      const eff = effectiveSampleCount(c);
      eligibleClients.push({ update: c, effective: eff });
    }
    if (eligibleClients.length === 0) {
      return { ok: false, error: "invalid_state", message: "no eligible clients (all skipped)" };
    }

    const totalEffective = eligibleClients.reduce<number>((a, x) => a + x.effective, 0);
    if (totalEffective === 0) {
      // Defensive — eligibleClients have eff > 0 by construction (sampleCount > 0
      // and SHARED_FACTOR > 0), but fixed-point arithmetic edge cases or future
      // changes to SHARED_FACTOR=0 should still error rather than divide-by-zero.
      return { ok: false, error: "invalid_state", message: "totalEffectiveSamples is zero" };
    }

    const dim = eligibleClients[0].update.weights.length;
    const globalWeights = new Array<number>(dim).fill(0);
    for (const { update, effective } of eligibleClients) {
      const share = effective / totalEffective;
      contributions.push({
        clientId: update.clientId,
        effectiveSampleCount: effective,
        share,
        isLocal: update.isLocal,
        skipped: false,
      });
      for (let k = 0; k < dim; k++) {
        globalWeights[k] += share * update.weights[k];
      }
    }
    return {
      ok: true,
      globalWeights,
      effectiveParticipants: eligibleClients.length,
      totalEffectiveSamples: totalEffective,
      contributions,
      warnings,
    };
  }

  /**
   * Compute round-level governance summary: local vs shared participation,
   * sample-count split, and effective-weight ratio. Used by T6-03/T6-04
   * for drift gating + scheduling decisions.
   */
  static roundSummary(input: unknown): RoundSummaryResult {
    const parsed = RoundSummaryInputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false, error: "invalid_input",
        message: parsed.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
      };
    }
    const { clients } = parsed.data;
    const warnings: string[] = [];

    let localCount = 0;
    let sharedCount = 0;
    let localSampleSum = 0;
    let sharedSampleSum = 0;
    for (const c of clients as ClientUpdate[]) {
      if (c.isLocal) {
        localCount++;
        localSampleSum += c.sampleCount;
      } else {
        sharedCount++;
        sharedSampleSum += c.sampleCount;
      }
    }
    const localEffective = localSampleSum;
    const sharedEffective = SHARED_FACTOR * sharedSampleSum;
    const totalEffective = localEffective + sharedEffective;
    if (totalEffective === 0) {
      warnings.push("all clients have sampleCount=0 — effective shares undefined");
    }
    return {
      ok: true,
      participants: clients.length,
      localCount,
      sharedCount,
      localSampleSum,
      sharedSampleSum,
      localShareEffective: totalEffective > 0 ? localEffective / totalEffective : 0,
      sharedShareEffective: totalEffective > 0 ? sharedEffective / totalEffective : 0,
      warnings,
    };
  }

  /** Read-only constants snapshot. */
  static constants(): {
    SHARED_FACTOR: number;
    MAX_WEIGHTS: number;
    MAX_CLIENTS: number;
  } {
    return { SHARED_FACTOR, MAX_WEIGHTS, MAX_CLIENTS };
  }
}

export const crossProcessFedAvgAggregatorEngine = CrossProcessFedAvgAggregatorEngine;

/**
 * Dispatcher convenience wrapper.
 */
export function crossProcessFedAvgAggregator(
  action: string,
  params: Record<string, unknown>,
): unknown {
  switch (action) {
    case "xproc_fed_aggregate":
      return CrossProcessFedAvgAggregatorEngine.aggregate(params);
    case "xproc_fed_round_summary":
      return CrossProcessFedAvgAggregatorEngine.roundSummary(params);
    case "xproc_fed_constants":
      return CrossProcessFedAvgAggregatorEngine.constants();
    default:
      throw new Error(`crossProcessFedAvgAggregator: unknown action '${action}'`);
  }
}
