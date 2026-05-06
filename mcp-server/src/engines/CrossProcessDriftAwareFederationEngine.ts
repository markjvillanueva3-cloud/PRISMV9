/**
 * CrossProcessDriftAwareFederationEngine — XPROC-NEURAL Tier 6 (T6-03)
 *
 * Federated-round participation gate. Composes T3-02 drift detection
 * (per-client driftConfidence ∈ [0,1]) with T6-01 FedAvg / T6-02 secure
 * aggregation to prevent a drifting shop from poisoning the global model.
 *
 * ## Why a separate gate
 *
 * Bonawitz secure aggregation (T6-02) gives the aggregator no view into
 * any individual client's gradient. That is the point — privacy. But it
 * is *also* a vulnerability: a malicious or simply broken client (sensor
 * miscalibration, post-tooling-change ledger, whatever) can submit garbage
 * weights and the aggregator can neither inspect them nor identify them.
 * The whole sum is corrupted with no breadcrumb.
 *
 * Drift detection at the *client side* (T3-02) is the only signal we can
 * extract before secure aggregation hides everything. Each client runs
 * DDM/EDDM/ADWIN against its own outcome stream and reports a calibrated
 * driftConfidence ∈ [0, 1]. The federation gate consumes these scores
 * and partitions the round's participants into:
 *
 *   - PARTICIPATE: driftConfidence < LOW_THRESHOLD. Healthy client; weights
 *     enter the round normally.
 *   - DEFER:       LOW ≤ driftConfidence < HIGH. Possibly drifting; the
 *     client is held out THIS round (avoids poisoning the aggregate) but
 *     remains in the federation. Operator may force-include via override.
 *   - REJECT:      driftConfidence ≥ HIGH. Strong drift signal (≥2 of 3
 *     detectors agreed per Tier 3 consensus rule). Client is excluded
 *     from this round AND flagged for operator review (T3-03 ConceptShift
 *     handles the recovery decision).
 *
 * Threshold defaults match the Tier 3 confidence quantization:
 *   driftConfidence = mean({DDM, EDDM, ADWIN} verdicts mapped to {0, 0.5, 1.0})
 *   so 0.34 corresponds to "≥1 detector at WARNING" and 0.67 to "≥2 detectors
 *   at full DRIFT." This is a deliberately conservative gate — single-detector
 *   warnings defer (cheap) rather than reject (expensive recovery).
 *
 * ## Acceptance (XPROC-NEURAL-ROADMAP.md Tier 6 R3)
 *
 *   "Rejects synthetic drift-injected client at ≥95% rate."
 *
 * Test suite verifies: with 100 healthy clients (driftConfidence ∼ U[0, 0.2])
 * and 1 drift-injected client (driftConfidence = 0.85), the gate rejects the
 * injected client across 50 trials with no healthy-client false rejections.
 *
 * ## Architecture decision — pure gate (matches T6-01, T6-02)
 *
 * Pure functions, no engine state:
 *   1. `gate({clients[], thresholds?, recentDecisions?})` — partition clients
 *      by drift score into {participate, defer, reject}. Optional history of
 *      previous gate decisions allows escalation policy: a client that was
 *      DEFER for 3+ consecutive rounds is auto-escalated to REJECT (operator
 *      review).
 *   2. `driftReport({clients[]})` — aggregate-level diagnostics. Counts per
 *      process, distribution percentiles, trending stats, ledger of warning
 *      vs drift-confidence levels. Used by T6-04 ClientSelectionScheduler.
 *
 * ## Failure modes covered
 *
 *   1. Empty clients list                     → invalid_input
 *   2. driftConfidence outside [0, 1]         → invalid_input (Zod)
 *   3. NaN in driftConfidence                 → invalid_input (Zod)
 *   4. thresholds with low > high             → invalid_input
 *   5. recentDecisions with unknown clientId  → silently ignored + warn
 *   6. duplicate clientId in clients          → keep first + warn
 *   7. all clients drifting                   → all REJECT, partition.participate=[]
 *   8. all clients healthy                    → no REJECT, partition.defer=[]
 *   9. consecutive-defer escalation > limit   → auto-escalate to REJECT + warn
 *
 * @module CrossProcessDriftAwareFederationEngine
 */

import { z } from "zod";

// ============================================================================
// Constants
// ============================================================================

/** Default low-confidence threshold: <0.34 = healthy. */
const DEFAULT_LOW_THRESHOLD = 0.34;

/** Default high-confidence threshold: ≥0.67 = strong drift, reject. */
const DEFAULT_HIGH_THRESHOLD = 0.67;

/** Auto-escalate to REJECT after this many consecutive DEFER rounds. */
const DEFAULT_MAX_CONSECUTIVE_DEFERS = 3;

/** Sanity bound on client count per round. */
const MAX_CLIENTS = 1024;

/** Sanity bound on per-client decision history. */
const MAX_HISTORY_ENTRIES = 100;

// ============================================================================
// Schemas
// ============================================================================

const GateDecisionEnum = z.enum(["participate", "defer", "reject"]);

const ClientDriftSchema = z.object({
  clientId: z.string().min(1).max(128),
  driftConfidence: z.number().finite().min(0).max(1),
  /** Optional: which Tier 3 detector(s) fired ("ddm" | "eddm" | "adwin"). */
  detectorFired: z.array(z.enum(["ddm", "eddm", "adwin"])).optional(),
  /** Optional: process tag for diagnostics aggregation (mill/lathe/wedm). */
  process: z.string().min(1).max(64).optional(),
});

const HistoryEntrySchema = z.object({
  clientId: z.string().min(1).max(128),
  /** Most recent decisions FIRST (index 0 = latest round). */
  pastDecisions: z.array(GateDecisionEnum).max(MAX_HISTORY_ENTRIES),
});

const ThresholdsSchema = z.object({
  low: z.number().finite().min(0).max(1).default(DEFAULT_LOW_THRESHOLD),
  high: z.number().finite().min(0).max(1).default(DEFAULT_HIGH_THRESHOLD),
  maxConsecutiveDefers: z.number().int().positive().max(50).default(DEFAULT_MAX_CONSECUTIVE_DEFERS),
});

const GateInputSchema = z.object({
  clients: z.array(ClientDriftSchema).min(1).max(MAX_CLIENTS),
  thresholds: ThresholdsSchema.optional(),
  recentDecisions: z.array(HistoryEntrySchema).max(MAX_CLIENTS).optional(),
});

const DriftReportInputSchema = z.object({
  clients: z.array(ClientDriftSchema).min(1).max(MAX_CLIENTS),
});

// ============================================================================
// Public types
// ============================================================================

export type GateDecision = "participate" | "defer" | "reject";

export interface ClientDrift {
  clientId: string;
  driftConfidence: number;
  detectorFired?: ("ddm" | "eddm" | "adwin")[];
  process?: string;
}

export interface ClientGateResult {
  clientId: string;
  decision: GateDecision;
  driftConfidence: number;
  /** Reason code: <below_low|above_high|in_warning_band|escalated_after_consecutive_defers>. */
  reason: "below_low" | "above_high" | "in_warning_band" | "escalated_after_consecutive_defers";
  /** Number of consecutive DEFER decisions including this round (0 if not deferring). */
  consecutiveDefers: number;
}

export interface GateOk {
  ok: true;
  participate: ClientGateResult[];
  defer: ClientGateResult[];
  reject: ClientGateResult[];
  /** Total clients evaluated (excluding dedup-dropped). */
  evaluated: number;
  /** Effective thresholds applied (defaults if not overridden). */
  thresholds: { low: number; high: number; maxConsecutiveDefers: number };
  warnings: string[];
}

export interface DriftReportOk {
  ok: true;
  total: number;
  /** Counts at the default thresholds. */
  healthy: number;     // < low
  warning: number;     // [low, high)
  drifting: number;    // ≥ high
  /** Mean / median / p90 of driftConfidence across all clients. */
  meanConfidence: number;
  medianConfidence: number;
  p90Confidence: number;
  /** Per-process counts when `process` field provided. */
  byProcess: Record<string, { total: number; healthy: number; warning: number; drifting: number }>;
  /** Per-detector tally of how often each detector fired (DDM/EDDM/ADWIN). */
  detectorTallies: { ddm: number; eddm: number; adwin: number };
  warnings: string[];
}

export interface OpErr {
  ok: false;
  error: "invalid_input" | "invalid_state";
  message: string;
}

export type GateResult = GateOk | OpErr;
export type DriftReportResult = DriftReportOk | OpErr;

// ============================================================================
// Helpers
// ============================================================================

function dedupClients(clients: ClientDrift[]): { unique: ClientDrift[]; warnings: string[] } {
  const seen = new Map<string, ClientDrift>();
  const warnings: string[] = [];
  for (const c of clients) {
    if (seen.has(c.clientId)) {
      warnings.push(`duplicate clientId '${c.clientId}' (kept first)`);
      continue;
    }
    seen.set(c.clientId, c);
  }
  return { unique: Array.from(seen.values()), warnings };
}

function consecutiveDefersFromHistory(
  past: GateDecision[] | undefined,
): number {
  if (!past || past.length === 0) return 0;
  let count = 0;
  // pastDecisions[0] is most recent, walk forward until non-defer.
  for (const d of past) {
    if (d === "defer") count++;
    else break;
  }
  return count;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0];
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  const frac = idx - lo;
  return sorted[lo] + (sorted[hi] - sorted[lo]) * frac;
}

// ============================================================================
// Public API
// ============================================================================

export class CrossProcessDriftAwareFederationEngine {
  static readonly tier = "T6-03";

  /**
   * Gate clients into {participate, defer, reject} per drift confidence.
   *
   * Auto-escalation: a client whose past N decisions are all DEFER (where
   * N = thresholds.maxConsecutiveDefers) is auto-escalated to REJECT this
   * round, even if its current driftConfidence is still in the warning band.
   * This prevents stale-but-not-quite-rejecting clients from indefinitely
   * dragging on the federation. Operator must explicitly clear and rejoin.
   */
  static gate(input: unknown): GateResult {
    const parsed = GateInputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false, error: "invalid_input",
        message: parsed.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
      };
    }
    const { clients } = parsed.data;
    const thresholds = parsed.data.thresholds ?? {
      low: DEFAULT_LOW_THRESHOLD,
      high: DEFAULT_HIGH_THRESHOLD,
      maxConsecutiveDefers: DEFAULT_MAX_CONSECUTIVE_DEFERS,
    };
    if (thresholds.low > thresholds.high) {
      return {
        ok: false, error: "invalid_input",
        message: `thresholds.low (${thresholds.low}) must be <= thresholds.high (${thresholds.high})`,
      };
    }

    const { unique, warnings } = dedupClients(clients as ClientDrift[]);
    const knownIds = new Set(unique.map((c) => c.clientId));
    const historyByClient = new Map<string, GateDecision[]>();
    for (const h of parsed.data.recentDecisions ?? []) {
      if (!knownIds.has(h.clientId)) {
        warnings.push(`recentDecisions entry for unknown clientId '${h.clientId}' ignored`);
        continue;
      }
      historyByClient.set(h.clientId, h.pastDecisions);
    }

    const participate: ClientGateResult[] = [];
    const defer: ClientGateResult[] = [];
    const reject: ClientGateResult[] = [];

    for (const c of unique) {
      const past = historyByClient.get(c.clientId);
      const priorDeferStreak = consecutiveDefersFromHistory(past);

      let decision: GateDecision;
      let reason: ClientGateResult["reason"];

      if (c.driftConfidence < thresholds.low) {
        decision = "participate";
        reason = "below_low";
      } else if (c.driftConfidence >= thresholds.high) {
        decision = "reject";
        reason = "above_high";
      } else {
        // In warning band — provisional defer, but escalate if too many
        // consecutive defers already.
        if (priorDeferStreak + 1 >= thresholds.maxConsecutiveDefers) {
          decision = "reject";
          reason = "escalated_after_consecutive_defers";
          warnings.push(
            `client '${c.clientId}' escalated to REJECT after ${priorDeferStreak + 1} consecutive defers (limit=${thresholds.maxConsecutiveDefers})`,
          );
        } else {
          decision = "defer";
          reason = "in_warning_band";
        }
      }

      const result: ClientGateResult = {
        clientId: c.clientId,
        decision,
        driftConfidence: c.driftConfidence,
        reason,
        consecutiveDefers: decision === "defer" ? priorDeferStreak + 1 : 0,
      };
      if (decision === "participate") participate.push(result);
      else if (decision === "defer") defer.push(result);
      else reject.push(result);
    }

    return {
      ok: true,
      participate,
      defer,
      reject,
      evaluated: unique.length,
      thresholds: { ...thresholds },
      warnings,
    };
  }

  /**
   * Aggregate-level drift diagnostics. Used by T6-04 ClientSelectionScheduler
   * to plan rounds, and by operator dashboards. Does NOT change any state.
   */
  static driftReport(input: unknown): DriftReportResult {
    const parsed = DriftReportInputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false, error: "invalid_input",
        message: parsed.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
      };
    }
    const { clients } = parsed.data;
    const { unique, warnings } = dedupClients(clients as ClientDrift[]);

    const total = unique.length;
    let healthy = 0, warning = 0, drifting = 0;
    let meanAcc = 0;
    const sorted: number[] = [];
    const byProcess: Record<string, { total: number; healthy: number; warning: number; drifting: number }> = {};
    const detectorTallies = { ddm: 0, eddm: 0, adwin: 0 };

    for (const c of unique) {
      meanAcc += c.driftConfidence;
      sorted.push(c.driftConfidence);
      if (c.driftConfidence < DEFAULT_LOW_THRESHOLD) healthy++;
      else if (c.driftConfidence >= DEFAULT_HIGH_THRESHOLD) drifting++;
      else warning++;

      if (c.process) {
        const slot = byProcess[c.process] ??= { total: 0, healthy: 0, warning: 0, drifting: 0 };
        slot.total++;
        if (c.driftConfidence < DEFAULT_LOW_THRESHOLD) slot.healthy++;
        else if (c.driftConfidence >= DEFAULT_HIGH_THRESHOLD) slot.drifting++;
        else slot.warning++;
      }

      if (c.detectorFired) {
        for (const d of c.detectorFired) detectorTallies[d]++;
      }
    }

    sorted.sort((a, b) => a - b);

    return {
      ok: true,
      total,
      healthy,
      warning,
      drifting,
      meanConfidence: total > 0 ? meanAcc / total : 0,
      medianConfidence: percentile(sorted, 0.5),
      p90Confidence: percentile(sorted, 0.9),
      byProcess,
      detectorTallies,
      warnings,
    };
  }

  /** Read-only constants snapshot. */
  static constants(): {
    DEFAULT_LOW_THRESHOLD: number;
    DEFAULT_HIGH_THRESHOLD: number;
    DEFAULT_MAX_CONSECUTIVE_DEFERS: number;
    MAX_CLIENTS: number;
  } {
    return {
      DEFAULT_LOW_THRESHOLD,
      DEFAULT_HIGH_THRESHOLD,
      DEFAULT_MAX_CONSECUTIVE_DEFERS,
      MAX_CLIENTS,
    };
  }
}

export const crossProcessDriftAwareFederationEngine = CrossProcessDriftAwareFederationEngine;

/** Dispatcher convenience wrapper. */
export function crossProcessDriftAwareFederation(
  action: string,
  params: Record<string, unknown>,
): unknown {
  switch (action) {
    case "xproc_fed_gate":
      return CrossProcessDriftAwareFederationEngine.gate(params);
    case "xproc_fed_drift_report":
      return CrossProcessDriftAwareFederationEngine.driftReport(params);
    case "xproc_fed_drift_constants":
      return CrossProcessDriftAwareFederationEngine.constants();
    default:
      throw new Error(`crossProcessDriftAwareFederation: unknown action '${action}'`);
  }
}
