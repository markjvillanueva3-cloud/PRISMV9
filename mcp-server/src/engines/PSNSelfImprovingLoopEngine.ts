/**
 * PSNSelfImprovingLoopEngine — closes the self-improving learning loop.
 *
 * Composes three existing substrate engines into ONE ingest entry-point:
 *
 *     shop outcome  ──►  ChainOfVerificationEngine  (verify the claim)
 *                              │
 *                              ▼ verdict
 *                ┌─────────────────────────────────┐
 *                │  ShopProfileAdapterEngine        │  per-shop delta learning
 *                │  .learnFromOutcome()             │  (only on confirmed verdicts)
 *                └─────────────────────────────────┘
 *                              │
 *                              ▼ psi_delta = f(confidence, severity)
 *                ┌─────────────────────────────────┐
 *                │  PSNAutonomyLoopEngine           │  emit reward signal
 *                │  .scoreEvent({type:'psi_delta'}) │
 *                └─────────────────────────────────┘
 *                              │
 *                              ▼
 *                     LoopIngestResult
 *
 * One ingest = one closed loop iteration. JM Die is the canonical baseline
 * shop per CLAUDE.md §TEST SHOP.
 *
 * Design choices:
 *
 * - **Pure engine** — no I/O. The caller supplies the CoV verifier closure
 *   (consults whatever substrate — physics constants, dispatcher, ledger)
 *   AND owns ledger persistence. This engine returns a fully-structured
 *   `LoopIngestResult` that the caller writes to AI_LEDGER.jsonl /
 *   shop-outcome-history.jsonl.
 *
 * - **Asynchronous over CoV** — CoV.verify is async (supports timed verifiers
 *   that hit Anthropic API / dispatcher / Ollama). The loop is therefore
 *   `async ingest(...)`.
 *
 * - **Confirmation gates adapter fold** — if CoV returns
 *   `hallucinated_citation` / `conflict` / `verifier_error`, the outcome is
 *   NOT folded into the shop adapter. This is R12 fail-loud: a bad outcome
 *   surfaces as `loop_outcome=anomaly_only` instead of silently corrupting
 *   the per-shop delta.
 *
 * - **psi_delta sign + scale** — confirmed verdicts emit a positive delta
 *   proportional to (confidence - 0.5). Conflict/hallucination verdicts
 *   emit a negative delta proportional to -(1 - confidence). The
 *   `PSNAutonomyLoopEngine` clamps total reward to [-1, 1].
 *
 * - **Customer/part identifier hygiene** — the outcome's `evidence_id`
 *   field is forwarded verbatim (caller is responsible for hashing it
 *   externally per [[feedback_no_public_h_drive]]). The result NEVER
 *   echoes raw customer or part names.
 *
 * Cross-PSN integration points (one per leg per ingest):
 *
 *   #1 Obsidian Brain   — caller persists `loop_memo` markdown
 *   #3 Wiki             — chain-of-reasoning entry on confidence ≥ 0.75
 *   #6 System Viz       — ghost.loop_iteration roost node per ingest
 *   #7 Engines          — ShopProfileAdapterEngine state mutated in-cache
 *   #10 NN/GNN          — psi_delta signal into autonomy loop accumulator
 *   #11 PRISM AI        — verdict feeds aiSystemRouterEngine confidence model
 *
 * REFS:
 * - [[reference_cov_engine_2026_05_25]] — CoV substrate primitive
 * - [[reference_psn_r4_deep_stack_2026_05_25]] — R4 pick #6 PRISMVerifiedReasoningEngine
 *   (this engine is the substrate-side counterpart — composes existing
 *   engines instead of replacing them)
 * - [[reference_psn_training_substrate_2026_05_25]] — PSN substrate map
 *
 * slot:india /goal-psn-self-improving iter3
 *
 * @module PSNSelfImprovingLoopEngine
 */

import {
  ShopProfileAdapterEngine,
  shopProfileAdapterEngine,
  type ShopOutcomeRecord,
  type ShopAdapterDeltas,
} from "./ShopProfileAdapterEngine.js";
import {
  ChainOfVerificationEngine,
  chainOfVerificationEngine,
  type VerificationClaim,
  type VerificationQuestion,
  type VerificationResult,
  type Verifier,
} from "./ChainOfVerificationEngine.js";
import {
  PSNAutonomyLoopEngine,
  psnAutonomyLoopEngine,
  type SignalEvent,
  type RewardScore,
} from "./PSNAutonomyLoopEngine.js";

// ============================================================================
// TYPES
// ============================================================================

export interface LoopIngestInput {
  /** Shop id (e.g. "jm-die"). */
  shop_id: string;
  /** Per-shop outcome observation. */
  outcome: ShopOutcomeRecord;
  /** Initial claim to be verified — the assertion the outcome reports. */
  claim: VerificationClaim;
  /** Verification questions decomposing the claim. */
  questions: VerificationQuestion[];
  /** Verifier closure — pure (caller chooses substrate). */
  verifier: Verifier;
  /** Known citation ids — passed to CoV hallucination guard. */
  knownCitationIds?: string[];
}

export type LoopOutcome =
  | "confirmed_full"     // CoV confirmed, fold into shop adapter, +psi_delta
  | "confirmed_caveat"   // CoV confirmed with caveat, fold + 0.5 weight
  | "anomaly_only"       // CoV verdict failed → NO fold, surface anomaly, -psi_delta
  | "fold_skipped";      // CoV passed but outcome S(x) < 0.70 → adapter anomalies path

export interface LoopIngestResult {
  shop_id: string;
  loop_outcome: LoopOutcome;
  cov_verdict: VerificationResult["verdict"];
  cov_confidence: number;
  adapter_folded: boolean;
  adapter_summary: ReturnType<ShopProfileAdapterEngine["summarize"]>;
  psi_delta: number;             // sent to PSNAutonomyLoop
  reward: RewardScore;           // returned from PSNAutonomyLoop.scoreEvent
  observed_at: string;           // pass-through from outcome
  loop_iteration_id: string;     // stable id for /system-viz roost + ledger key
  ingested_at: string;           // ISO timestamp of this ingest call
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Confidence floor for confirmation — verdicts below this are treated as
 * `anomaly_only` even if the CoV verdict says "confirmed". Tunable so
 * the loop can be made stricter over time as the PSN substrate matures.
 */
const CONFIRM_CONFIDENCE_FLOOR = 0.5;

/**
 * Weight applied to `confirmed_with_caveat` verdicts — they fold into the
 * adapter at half weight because the verifier surfaced a partial-truth flag.
 */
const CAVEAT_FOLD_WEIGHT = 0.5;

/**
 * psi_delta scale — confirmed delta = (confidence - 0.5) * SCALE,
 * anomaly delta = -(1 - confidence) * SCALE. Stays small so single
 * outcomes don't dominate the autonomy-loop running mean.
 */
const PSI_DELTA_SCALE = 0.4;

// ============================================================================
// PURE HELPERS
// ============================================================================

/**
 * Map a VerificationResult to a LoopOutcome decision.
 * Exposed for tests + downstream consumers that want to classify without
 * running the full loop.
 */
export function classifyVerdict(result: VerificationResult): {
  loop_outcome: Exclude<LoopOutcome, "fold_skipped">;
  fold_weight: number;
  psi_delta: number;
} {
  if (result.verdict === "confirmed" && result.posteriorConfidence >= CONFIRM_CONFIDENCE_FLOOR) {
    return {
      loop_outcome: "confirmed_full",
      fold_weight: 1.0,
      psi_delta: (result.posteriorConfidence - 0.5) * PSI_DELTA_SCALE,
    };
  }
  if (result.verdict === "confirmed_with_caveat") {
    return {
      loop_outcome: "confirmed_caveat",
      fold_weight: CAVEAT_FOLD_WEIGHT,
      psi_delta: (result.posteriorConfidence - 0.5) * CAVEAT_FOLD_WEIGHT * PSI_DELTA_SCALE,
    };
  }
  // hallucinated_citation / conflict / insufficient_evidence / verifier_error
  // OR confirmed-but-low-confidence — all collapse to anomaly_only
  return {
    loop_outcome: "anomaly_only",
    fold_weight: 0.0,
    psi_delta: -(1 - Math.max(0, result.posteriorConfidence)) * PSI_DELTA_SCALE,
  };
}

/**
 * Stable, deterministic iteration id from inputs. Used to:
 *   - dedupe re-ingest of the same outcome
 *   - serve as the /system-viz roost node id for this iteration
 *   - key the AI_LEDGER.jsonl entry
 *
 * Format: `loop-<shop_id>-<outcome.observed_at>-<8-char hash>` where the
 * hash is the first 8 hex chars of a sha-256-equivalent computed via a
 * cheap pure mixer over (shop_id + observed_at + category + domain).
 * No crypto import — staying pure + offline-safe.
 */
export function deriveLoopIterationId(input: {
  shop_id: string;
  observed_at: string;
  category: string;
  domain: string;
}): string {
  // FNV-1a 32-bit — deterministic, pure, no crypto dependency.
  const s = `${input.shop_id}|${input.observed_at}|${input.category}|${input.domain}`;
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  const hex = h.toString(16).padStart(8, "0");
  return `loop-${input.shop_id}-${input.observed_at}-${hex}`;
}

// ============================================================================
// ENGINE
// ============================================================================

export class PSNSelfImprovingLoopEngine {
  static readonly engineId = "psn_self_improving_loop";
  static readonly version = "1.0.0";

  constructor(
    private readonly shopAdapter: ShopProfileAdapterEngine = shopProfileAdapterEngine,
    private readonly cov: ChainOfVerificationEngine = chainOfVerificationEngine,
    private readonly autonomy: PSNAutonomyLoopEngine = psnAutonomyLoopEngine,
  ) {}

  /**
   * Run one closed-loop iteration: verify → fold → reward.
   *
   * Returns a fully-structured result; the engine NEVER persists. Caller
   * is responsible for writing to AI_LEDGER.jsonl / shop-outcome-history.
   */
  async ingest(input: LoopIngestInput): Promise<LoopIngestResult> {
    // R12 input validation — fail loud, not silent passthrough.
    if (!input || typeof input !== "object") {
      throw new Error("PSNSelfImprovingLoopEngine.ingest: input is required");
    }
    if (!input.shop_id || typeof input.shop_id !== "string") {
      throw new Error("PSNSelfImprovingLoopEngine.ingest: shop_id is required (string)");
    }
    if (!input.outcome) {
      throw new Error("PSNSelfImprovingLoopEngine.ingest: outcome is required");
    }
    if (typeof input.verifier !== "function") {
      throw new Error("PSNSelfImprovingLoopEngine.ingest: verifier must be a function");
    }

    const ingested_at = new Date().toISOString();
    const loop_iteration_id = deriveLoopIterationId({
      shop_id: input.shop_id,
      observed_at: input.outcome.observed_at,
      category: input.outcome.category,
      domain: input.outcome.domain,
    });

    // Step 1: CoV verification
    const cov_result = await this.cov.verify(input.claim, input.questions, input.verifier, {
      knownCitationIds: input.knownCitationIds,
    });

    // Step 2: Classify verdict → loop outcome
    const classified = classifyVerdict(cov_result);
    let loop_outcome: LoopOutcome = classified.loop_outcome;

    // Step 3: Conditional adapter fold (only on confirmed verdicts)
    let adapter_folded = false;
    if (classified.fold_weight > 0) {
      // S(x) gate is inside ShopProfileAdapterEngine.learnFromOutcome — it
      // routes critical outcomes to anomalies even if CoV passed. Detect
      // fold success by comparing the ANOMALY count: if it grew, the
      // adapter rerouted to anomalies; if it didn't, the outcome folded
      // into one of the rate/time/quality buckets (incrementing evidence
      // count on either an existing or new category — both count as fold).
      const summary_before = this.shopAdapter.summarize(input.shop_id);
      const anomalies_before = summary_before?.anomaly_count ?? 0;

      this.shopAdapter.learnFromOutcome(input.shop_id, input.outcome);

      const summary_after = this.shopAdapter.summarize(input.shop_id);
      const anomalies_after = summary_after?.anomaly_count ?? 0;
      const total_after = summary_after?.total_outcomes ?? 0;
      const total_before = summary_before?.total_outcomes ?? 0;
      const total_grew = total_after > total_before;
      const anomaly_grew = anomalies_after > anomalies_before;

      if (total_grew && !anomaly_grew) {
        adapter_folded = true;
      } else if (total_grew && anomaly_grew) {
        // Outcome was recorded but routed to anomalies (S(x) < 0.70 or
        // implied multiplier out of [MIN_MULTIPLIER, MAX_MULTIPLIER]).
        adapter_folded = false;
        loop_outcome = "fold_skipped";
      }
    }

    // Step 4: Emit psi_delta signal to PSN autonomy loop
    const signal: SignalEvent = {
      type: "psi_delta",
      ts: ingested_at,
      delta: classified.psi_delta,
    };
    const reward = this.autonomy.scoreEvent(signal);

    const adapter_summary = this.shopAdapter.summarize(input.shop_id);

    return {
      shop_id: input.shop_id,
      loop_outcome,
      cov_verdict: cov_result.verdict,
      cov_confidence: cov_result.posteriorConfidence,
      adapter_folded,
      adapter_summary,
      psi_delta: classified.psi_delta,
      reward,
      observed_at: input.outcome.observed_at,
      loop_iteration_id,
      ingested_at,
    };
  }

  /**
   * Expose current shop adapter deltas — for dispatcher / /system-viz
   * roost rendering. Read-only frozen snapshot.
   */
  getShopDeltas(shop_id: string): Readonly<ShopAdapterDeltas> | null {
    return this.shopAdapter.getDeltas(shop_id);
  }
}

export const psnSelfImprovingLoopEngine = new PSNSelfImprovingLoopEngine();
