/**
 * LatheLoRAExperienceLedgerEngine — LATHE-LORA-MS0/U-LLR-LEDGER
 *
 * The experience-ledger layer (L3) of the lathe self-improving-AI loop. Per the
 * 2026-05-29 india-substrate discovery ([[reference_whiskey_india_ai_substrate_2026_05_29]]),
 * lathe is ALREADY a first-class `process` in the shared `crossProcessOutcomeStore`
 * (∈ OUTCOME_PROCESSES) + `CrossProcessNeuralLearningEngine` (∈ REPLAY_PROCESSES).
 * So this engine is a THIN lathe-typed FACADE over that shared store — NOT a parallel
 * ledger. Its value-add over calling the store directly:
 *   1. lathe-domain-typed input (turning params) → validated RecordEventInput{bridge:"ai", process:"lathe"}
 *   2. a deterministic machining reward function (finish adherence + failure penalty)
 *   3. lathe-scoped query / replay-sample / stats (always forces process:"lathe")
 *
 * Recording auto-fans-out to `feedbackBusEngine.publish("outcome.recorded")` (the store
 * does this) → the shared neural learner's auto-train + replay pull lathe rows for free.
 * Persistence is owned by the shared store (configureStorePath) — this engine holds NO
 * state of its own (no serialize/fromSerialized; nothing to drift).
 *
 * NOTE: the `outcome-bus-auto-tap.mjs` PostToolUse hook is absent in slot/whiskey
 * (1543 commits behind) — record lathe outcomes EXPLICITLY through this engine
 * until the slot syncs.
 */
import {
  crossProcessOutcomeStore,
  OUTCOME_KINDS,
  type OutcomeKind,
  type OutcomeRecord,
  type OutcomeQueryFilter,
  type RecordEventInput,
} from "./CrossProcessOutcomeStore.js";

/** Lathe-domain input for a LoRA inference event (the prediction, before the actual result is known). */
export interface LatheExperienceInput {
  /** Turning operation — required (e.g. "od_rough", "id_bore", "thread", "part_off", "face"). */
  operation: string;
  /** Optional grouping id — events sharing a jobId form a replayable chain. */
  jobId?: string;
  material?: string;
  toolMaterial?: string;
  machineFamily?: string;
  /** Controller — defaults to "okuma" (JM Die fleet is 100% Okuma OSP). */
  controller?: string;
  /** Target surface finish Ra in µm (drives the reward's finish-adherence term). */
  targetRaUm?: number;
  /** Predicted cutting parameters. */
  vc?: number;
  feedRate?: number;
  rpm?: number;
  ap?: number;
  /** The LoRA adapter / model that produced the prediction. */
  adapterId?: string;
  /** Whether the prediction itself reports success (pre-machining confidence gate). */
  predictedSuccess?: boolean;
  predictedMetrics?: Record<string, number>;
  intent?: string;
  /** Optional terminal outcome at record time (rare — usually pending → recordOutcome later). */
  outcome?: OutcomeRecord["outcome"];
}

/** The actual machined result that closes a pending lathe experience. */
export interface LatheOutcomeResult {
  kind: OutcomeKind;
  failureMode?: string;
  /** Measured shop-floor values (actual_ra_um, cycle_time_s, etc.). */
  actualMetrics?: Record<string, number>;
  /** Measured surface finish Ra in µm — compared to targetRaUm for the reward. */
  actualRaUm?: number;
  targetRaUm?: number;
  /** Hard-failure flags that zero the reward regardless of kind. */
  toolBreakage?: boolean;
  alarm?: boolean;
  notes?: string;
}

export interface LatheLedgerStats {
  total: number;
  pending: number;
  labeled: number;
  successRate: number;
}

const MAX_QUERY = 10_000;

export class LatheLoRAExperienceLedgerEngine {
  /**
   * Deterministic reward ∈ [0,1] for a completed lathe inference outcome.
   * Reference: RL reward shaping — bounded + monotonic in machining quality.
   * success→1, operator_override→0.5, failure→0, pending→0 (no signal yet);
   * finish-miss (actual Ra > target) costs up to −0.5 proportionally;
   * tool breakage / alarm hard-zero it.
   * @param kind terminal outcome kind
   * @returns reward in [0,1]
   */
  computeReward(
    kind: OutcomeKind,
    opts: { targetRaUm?: number; actualRaUm?: number; toolBreakage?: boolean; alarm?: boolean } = {},
  ): number {
    if (kind === "pending") return 0;
    let r = kind === "success" ? 1 : kind === "operator_override" ? 0.5 : 0;
    const { targetRaUm, actualRaUm } = opts;
    if (
      typeof targetRaUm === "number" &&
      typeof actualRaUm === "number" &&
      Number.isFinite(targetRaUm) &&
      Number.isFinite(actualRaUm) &&
      targetRaUm > 0 &&
      actualRaUm > 0 &&
      actualRaUm > targetRaUm
    ) {
      const over = (actualRaUm - targetRaUm) / targetRaUm;
      r -= Math.min(0.5, over * 0.5);
    }
    if (opts.toolBreakage || opts.alarm) r = 0;
    return Math.max(0, Math.min(1, r));
  }

  /**
   * Record a lathe LoRA inference event (usually pending; the actual result lands via recordOutcome).
   * Delegates persistence + bus fan-out to the shared crossProcessOutcomeStore.
   * @returns the store-assigned event id
   */
  record(input: LatheExperienceInput): string {
    if (!input || typeof input !== "object") {
      throw new Error("LatheLoRAExperienceLedger.record: input object required");
    }
    if (typeof input.operation !== "string" || input.operation.length === 0) {
      throw new Error("LatheLoRAExperienceLedger.record: non-empty 'operation' required");
    }
    const rec: RecordEventInput = {
      bridge: "ai",
      process: "lathe",
      jobId: input.jobId,
      request_summary: {
        material: input.material,
        operation: input.operation,
        tool_material: input.toolMaterial,
        machine_family: input.machineFamily,
        controller: input.controller ?? "okuma",
        target_ra_um: input.targetRaUm,
        cutting_speed_m_min: input.vc,
        feed_rate_mm_min: input.feedRate,
        spindle_rpm: input.rpm,
        depth_of_cut_mm: input.ap,
        intent: input.intent ?? "lathe_lora_inference",
      },
      response_summary: {
        primary_output: input.adapterId,
        success: input.predictedSuccess,
        metrics: input.predictedMetrics ?? {},
      },
      outcome: input.outcome,
    };
    return crossProcessOutcomeStore.record(rec);
  }

  /**
   * Close a pending lathe experience with the actual machined result + computed reward.
   * @returns {updated, reward} — updated=false if the id was unknown/already terminal
   */
  recordOutcome(id: string, result: LatheOutcomeResult): { updated: boolean; reward: number } {
    if (typeof id !== "string" || id.length === 0) {
      throw new Error("LatheLoRAExperienceLedger.recordOutcome: 'id' required");
    }
    if (!result || typeof result !== "object" || !OUTCOME_KINDS.includes(result.kind)) {
      throw new Error(
        `LatheLoRAExperienceLedger.recordOutcome: 'kind' must be one of ${OUTCOME_KINDS.join("|")}`,
      );
    }
    // Recover the stored target Ra if the caller omitted it on close (but supplied an
    // actual) — otherwise the finish-miss reward term would silently drop. Bounded lookup
    // (in-memory store, once per outcome) gated on the only case where it matters.
    let targetRaUm = result.targetRaUm;
    if (targetRaUm == null && typeof result.actualRaUm === "number") {
      const stored = this.query({ limit: MAX_QUERY }).find((r) => r.id === id);
      targetRaUm = stored?.request_summary.target_ra_um;
    }
    const reward = this.computeReward(result.kind, {
      targetRaUm,
      actualRaUm: result.actualRaUm,
      toolBreakage: result.toolBreakage,
      alarm: result.alarm,
    });
    const updated = crossProcessOutcomeStore.recordOutcome(id, {
      kind: result.kind,
      failure_mode: result.failureMode,
      actual_metrics: { ...(result.actualMetrics ?? {}), reward },
      notes: result.notes,
    });
    return { updated, reward };
  }

  /** Lathe-scoped outcome query (always forces process:"lathe"). */
  query(filter: Omit<OutcomeQueryFilter, "process"> = {}): OutcomeRecord[] {
    return crossProcessOutcomeStore.query({ ...filter, process: "lathe" });
  }

  /**
   * Most-recent labeled (non-pending) lathe records for replay training — deterministic (ts desc).
   * @param limit max records (clamped 1..10000)
   */
  replaySample(limit = 64, filter: Omit<OutcomeQueryFilter, "process"> = {}): OutcomeRecord[] {
    const lim = Math.max(1, Math.min(MAX_QUERY, Math.floor(limit) || 1));
    return this.query({ ...filter, limit: lim }).filter(
      (r) => r.outcome != null && r.outcome.kind !== "pending",
    );
  }

  /** Lathe ledger stats — optionally scoped by a query filter. */
  stats(filter: Omit<OutcomeQueryFilter, "process"> = {}): LatheLedgerStats {
    const all = this.query({ ...filter, limit: filter.limit ?? MAX_QUERY });
    const labeled = all.filter((r) => r.outcome != null && r.outcome.kind !== "pending");
    const success = labeled.filter((r) => r.outcome!.kind === "success").length;
    return {
      total: all.length,
      pending: all.length - labeled.length,
      labeled: labeled.length,
      successRate: labeled.length ? success / labeled.length : 0,
    };
  }
}

export const latheLoRAExperienceLedgerEngine = new LatheLoRAExperienceLedgerEngine();
