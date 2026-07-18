/**
 * OutcomePublishAdapterEngine — XPROC-NEURAL-CONNECT-MS0 / U-CN01
 *
 * The single canonical entry point for domain engines (mill / lathe / WEDM /
 * SF orchestrator / alarm decoder / probe ingest) to report a shop-floor
 * outcome to the cross-process learning graph. Wraps
 * `CrossProcessOutcomeStore.record()` (which already publishes
 * `outcome.recorded` to the feedback bus) plus a small set of conveniences:
 *
 *   - publish()              — canonical bridge call (typed RecordEventInput)
 *   - publishWithActuals()   — pairs request + response + actual_metrics in one call
 *   - publishFailure()       — emits kind=failure with alarm/failure_mode context
 *   - publishOverride()      — emits kind=operator_override with reason
 *   - updateOutcome()        — pending → terminal transition (delegates to recordOutcome)
 *   - stats()                — per-adapter counters (totals + by_bridge + by_process + last_ts)
 *   - reset()                — test-only counter reset
 *
 * Why a separate adapter vs domain engines calling OutcomeStore directly:
 *   1. Domain engines today don't touch the bus at all (audit shows OutcomeStore
 *      and CrossProcessNeuralLearningEngine are the ONLY publishers on main).
 *      A single import path lowers wiring cost and standardizes input shape.
 *   2. The adapter validates input via Zod before routing to OutcomeStore —
 *      catches malformed payloads at the publish boundary instead of letting
 *      them poison the ledger.
 *   3. Per-adapter stats let us audit which domain engines are publishing
 *      vs which are still silent — drives the next round of wiring work.
 *   4. Failure / override conveniences make the call site one line instead
 *      of three (assemble outcome object → recordEvent → done).
 *
 * Activation rule for callers:
 *   Domain engines emit on their TERMINAL path — after the engine has
 *   produced a recommendation/program/decision AND the result is observable.
 *   For "still in flight" cases use kind="pending" and call updateOutcome()
 *   later when the shop-floor outcome lands.
 *
 * Failure modes covered:
 *   1. Missing bridge / process     → invalid_input
 *   2. Unknown bridge name          → invalid_input (validated against OUTCOME_BRIDGES)
 *   3. Unknown process name         → invalid_input (validated against OUTCOME_PROCESSES)
 *   4. Unknown outcome.kind         → invalid_input (validated against OUTCOME_KINDS)
 *   5. NaN / Infinity in actuals    → invalid_input (each metric must be finite)
 *   6. Empty alarm code on failure  → invalid_input (failure mode must be informative)
 *   7. updateOutcome on unknown id  → ok:true, updated:false (mirrors recordOutcome)
 *
 * @engine OutcomePublishAdapterEngine
 * @milestone XPROC-NEURAL-CONNECT-MS0 / U-CN01
 * @see CrossProcessOutcomeStore     — backing ledger + bus publisher
 * @see CrossProcessNeuralLearningEngine — primary downstream consumer
 * @see CrossProcessRewardShaperEngine    — outcome.kind → reward mapping (TIER03)
 */

import { z } from "zod";
import {
  crossProcessOutcomeStore,
  OUTCOME_BRIDGES,
  OUTCOME_KINDS,
  OUTCOME_PROCESSES,
  type OutcomeBridge,
  type OutcomeKind,
  type OutcomeProcess,
  type OutcomeRecord,
  type RecordEventInput,
} from "./CrossProcessOutcomeStore.js";
import { ensureXprocLedgerDurable } from "./XprocOutcomeLedgerDurability.js";

// ============================================================================
// Schemas — gate every public method at the boundary
// ============================================================================

const BridgeSchema = z.enum(OUTCOME_BRIDGES);
const ProcessSchema = z.enum(OUTCOME_PROCESSES);
const KindSchema = z.enum(OUTCOME_KINDS);

/** Numeric metrics map — all values must be finite numbers (no NaN/Infinity). */
const FiniteMetricsSchema = z
  .record(z.string(), z.number().finite())
  .refine(
    (m) => Object.values(m).every((v) => Number.isFinite(v)),
    { message: "actual_metrics must contain only finite numbers" },
  );

const RequestSummarySchema = z
  .object({
    intent: z.string().optional(),
    material: z.string().optional(),
    tool_material: z.string().optional(),
    machine_family: z.string().optional(),
    operation: z.string().optional(),
    feature: z.string().optional(),
    controller: z.string().optional(),
    customer: z.string().optional(),
    quality_tier: z.string().optional(),
    tool_diameter_mm: z.number().nonnegative().finite().optional(),
    depth_of_cut_mm: z.number().nonnegative().finite().optional(),
    workpiece_thickness_mm: z.number().nonnegative().finite().optional(),
    target_ra_um: z.number().nonnegative().finite().optional(),
    spindle_rpm: z.number().nonnegative().finite().optional(),
    feed_rate_mm_min: z.number().nonnegative().finite().optional(),
    cutting_speed_m_min: z.number().nonnegative().finite().optional(),
  })
  .passthrough();

const ResponseSummarySchema = z
  .object({
    primary_output: z.string().optional(),
    success: z.boolean().optional(),
    warnings_count: z.number().int().nonnegative().optional(),
    metrics: FiniteMetricsSchema.optional(),
  })
  .passthrough();

const OperatorSchema = z
  .object({
    id: z.string().optional(),
    skill_level: z.enum(["beginner", "intermediate", "expert"]).optional(),
    override_reason: z.string().optional(),
  })
  .passthrough();

const OutcomeBlockSchema = z
  .object({
    kind: KindSchema,
    failure_mode: z.string().min(1).optional(),
    actual_metrics: FiniteMetricsSchema.optional(),
    notes: z.string().optional(),
  })
  .passthrough();

const PublishInputSchema = z.object({
  bridge: BridgeSchema,
  process: ProcessSchema,
  request_summary: RequestSummarySchema.optional(),
  response_summary: ResponseSummarySchema.optional(),
  outcome: OutcomeBlockSchema.optional(),
  operator: OperatorSchema.optional(),
});

const PublishWithActualsInputSchema = PublishInputSchema.extend({
  outcome_kind: KindSchema,
  actual_metrics: FiniteMetricsSchema.optional(),
  failure_mode: z.string().min(1).optional(),
  notes: z.string().optional(),
});

const PublishFailureInputSchema = z.object({
  bridge: BridgeSchema,
  process: ProcessSchema,
  failure_mode: z.string().min(1, "failure_mode required and non-empty"),
  request_summary: RequestSummarySchema.optional(),
  response_summary: ResponseSummarySchema.optional(),
  actual_metrics: FiniteMetricsSchema.optional(),
  operator: OperatorSchema.optional(),
  notes: z.string().optional(),
});

const PublishOverrideInputSchema = z.object({
  bridge: BridgeSchema,
  process: ProcessSchema,
  override_reason: z.string().min(1, "override_reason required and non-empty"),
  request_summary: RequestSummarySchema.optional(),
  response_summary: ResponseSummarySchema.optional(),
  actual_metrics: FiniteMetricsSchema.optional(),
  operator_id: z.string().optional(),
  operator_skill_level: z.enum(["beginner", "intermediate", "expert"]).optional(),
  notes: z.string().optional(),
});

const UpdateOutcomeInputSchema = z.object({
  id: z.string().min(1),
  kind: KindSchema,
  failure_mode: z.string().min(1).optional(),
  actual_metrics: FiniteMetricsSchema.optional(),
  notes: z.string().optional(),
});

// ============================================================================
// Public types (exported for typed callers)
// ============================================================================

export interface PublishOk {
  ok: true;
  id: string;
  bridge: OutcomeBridge;
  process: OutcomeProcess;
  outcome_kind: OutcomeKind;
}

export interface UpdateOk {
  ok: true;
  id: string;
  updated: boolean;
}

export interface OpErr {
  ok: false;
  error: "invalid_input";
  message: string;
}

export type PublishResult = PublishOk | OpErr;
export type UpdateResult = UpdateOk | OpErr;

export interface AdapterStats {
  total_published: number;
  total_updated: number;
  total_rejected: number;
  by_bridge: Record<OutcomeBridge, number>;
  by_process: Record<OutcomeProcess, number>;
  by_outcome_kind: Record<OutcomeKind, number>;
  last_published_at: string | null;
}

// ============================================================================
// Engine
// ============================================================================

function emptyByBridge(): Record<OutcomeBridge, number> {
  return { sf: 0, post: 0, feature: 0, ai: 0, router: 0 };
}
function emptyByProcess(): Record<OutcomeProcess, number> {
  return { mill: 0, lathe: 0, wedm: 0 };
}
function emptyByKind(): Record<OutcomeKind, number> {
  return { success: 0, failure: 0, operator_override: 0, pending: 0 };
}

function zodMessage(err: z.ZodError): string {
  return err.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`).join("; ");
}

export class OutcomePublishAdapterEngine {
  static readonly milestone = "XPROC-NEURAL-CONNECT-MS0";
  static readonly unit = "U-CN01";

  // Per-adapter telemetry. Module-level state so all dispatcher invocations
  // and direct static calls share one count — same convention as
  // CrossProcessNeuralLearningEngine's class-static state.
  private static totalPublished = 0;
  private static totalUpdated = 0;
  private static totalRejected = 0;
  private static byBridge: Record<OutcomeBridge, number> = emptyByBridge();
  private static byProcess: Record<OutcomeProcess, number> = emptyByProcess();
  private static byKind: Record<OutcomeKind, number> = emptyByKind();
  private static lastPublishedAt: string | null = null;

  /**
   * Canonical publish: domain engine reports an outcome. Wraps
   * `crossProcessOutcomeStore.record()` (which auto-publishes
   * `outcome.recorded` to the feedback bus). Validates input via Zod;
   * malformed payloads are rejected with `invalid_input`.
   *
   * The outcome block is optional — when absent, the record lands with
   * `kind=pending` and the caller can transition it later via
   * `updateOutcome(id, { kind: ..., ... })`.
   *
   * @returns `{ok:true, id, bridge, process, outcome_kind}` on success
   * @returns `{ok:false, error:"invalid_input", message}` on validation failure
   */
  static publish(input: unknown): PublishResult {
    // U-XPROC-LEDGER-DURABLE: lazily wire durable persistence on first publish (idempotent,
    // race-free via the cold-start buffer). Fire-and-forget -- never blocks the sync funnel.
    void ensureXprocLedgerDurable();
    const parsed = PublishInputSchema.safeParse(input);
    if (!parsed.success) {
      this.totalRejected += 1;
      return { ok: false, error: "invalid_input", message: zodMessage(parsed.error) };
    }
    const data = parsed.data;
    const recordInput: RecordEventInput = {
      bridge: data.bridge,
      process: data.process,
      request_summary: data.request_summary,
      response_summary: data.response_summary,
      outcome: data.outcome,
      operator: data.operator,
    };
    const id = crossProcessOutcomeStore.record(recordInput);
    const kind: OutcomeKind = data.outcome?.kind ?? "pending";
    this.totalPublished += 1;
    this.byBridge[data.bridge] += 1;
    this.byProcess[data.process] += 1;
    this.byKind[kind] += 1;
    this.lastPublishedAt = new Date().toISOString();
    return { ok: true, id, bridge: data.bridge, process: data.process, outcome_kind: kind };
  }

  /**
   * Convenience: publish with the canonical request + response + outcome
   * triple in one call. Use this when the domain engine already has the
   * shop-floor actuals at the moment of recording (synchronous path).
   *
   * Equivalent to `publish({...input, outcome: {kind, actual_metrics, failure_mode, notes}})`.
   */
  static publishWithActuals(input: unknown): PublishResult {
    const parsed = PublishWithActualsInputSchema.safeParse(input);
    if (!parsed.success) {
      this.totalRejected += 1;
      return { ok: false, error: "invalid_input", message: zodMessage(parsed.error) };
    }
    const d = parsed.data;
    return this.publish({
      bridge: d.bridge,
      process: d.process,
      request_summary: d.request_summary,
      response_summary: d.response_summary,
      operator: d.operator,
      outcome: {
        kind: d.outcome_kind,
        failure_mode: d.failure_mode,
        actual_metrics: d.actual_metrics,
        notes: d.notes,
      },
    });
  }

  /**
   * Convenience: publish a `kind=failure` outcome with alarm / failure-mode
   * context. The `failure_mode` string is required and non-empty — fail-fast
   * gate on uninformative failures (without a mode the NN can't learn the
   * failure type).
   */
  static publishFailure(input: unknown): PublishResult {
    const parsed = PublishFailureInputSchema.safeParse(input);
    if (!parsed.success) {
      this.totalRejected += 1;
      return { ok: false, error: "invalid_input", message: zodMessage(parsed.error) };
    }
    const d = parsed.data;
    return this.publish({
      bridge: d.bridge,
      process: d.process,
      request_summary: d.request_summary,
      response_summary: d.response_summary,
      operator: d.operator,
      outcome: {
        kind: "failure",
        failure_mode: d.failure_mode,
        actual_metrics: d.actual_metrics,
        notes: d.notes,
      },
    });
  }

  /**
   * Convenience: publish a `kind=operator_override` outcome. Required
   * `override_reason` documents WHY the operator overrode the recommended
   * action — this is the tribal-knowledge tap (the operator may have a
   * shop-floor heuristic the NN should learn FROM, not penalize).
   */
  static publishOverride(input: unknown): PublishResult {
    const parsed = PublishOverrideInputSchema.safeParse(input);
    if (!parsed.success) {
      this.totalRejected += 1;
      return { ok: false, error: "invalid_input", message: zodMessage(parsed.error) };
    }
    const d = parsed.data;
    return this.publish({
      bridge: d.bridge,
      process: d.process,
      request_summary: d.request_summary,
      response_summary: d.response_summary,
      operator: d.operator_id || d.operator_skill_level
        ? {
            id: d.operator_id,
            skill_level: d.operator_skill_level,
            override_reason: d.override_reason,
          }
        : { override_reason: d.override_reason },
      outcome: {
        kind: "operator_override",
        actual_metrics: d.actual_metrics,
        notes: d.notes,
      },
    });
  }

  /**
   * Pending → terminal transition. Delegates to
   * `crossProcessOutcomeStore.recordOutcome(id, ...)` which fires the
   * `outcome.completed` bus event when the kind actually transitioned.
   *
   * Returns `{ok:true, updated:false}` for unknown ids (not an error —
   * mirrors the underlying ledger's idempotent semantics).
   */
  static updateOutcome(input: unknown): UpdateResult {
    // U-XPROC-LEDGER-DURABLE: updateOutcome bypasses publish() (calls recordOutcome
    // directly), so wire durability here too -- pending->terminal must persist.
    void ensureXprocLedgerDurable();
    const parsed = UpdateOutcomeInputSchema.safeParse(input);
    if (!parsed.success) {
      this.totalRejected += 1;
      return { ok: false, error: "invalid_input", message: zodMessage(parsed.error) };
    }
    const d = parsed.data;
    const outcome: NonNullable<OutcomeRecord["outcome"]> = {
      kind: d.kind,
      failure_mode: d.failure_mode,
      actual_metrics: d.actual_metrics,
      notes: d.notes,
    };
    const updated = crossProcessOutcomeStore.recordOutcome(d.id, outcome);
    if (updated) {
      this.totalUpdated += 1;
      this.byKind[d.kind] += 1;
      this.lastPublishedAt = new Date().toISOString();
    }
    return { ok: true, id: d.id, updated };
  }

  /** Snapshot of adapter telemetry. Pure read; no side effects. */
  static stats(): AdapterStats {
    return {
      total_published: this.totalPublished,
      total_updated: this.totalUpdated,
      total_rejected: this.totalRejected,
      by_bridge: { ...this.byBridge },
      by_process: { ...this.byProcess },
      by_outcome_kind: { ...this.byKind },
      last_published_at: this.lastPublishedAt,
    };
  }

  /** Reset all counters. Test-only — does NOT touch the ledger. */
  static reset(): void {
    this.totalPublished = 0;
    this.totalUpdated = 0;
    this.totalRejected = 0;
    this.byBridge = emptyByBridge();
    this.byProcess = emptyByProcess();
    this.byKind = emptyByKind();
    this.lastPublishedAt = null;
  }
}

export const outcomePublishAdapterEngine = OutcomePublishAdapterEngine;

/**
 * Dispatcher entry. Mirrors the static-class dispatch convention used by
 * CrossProcessRewardShaperEngine + CrossProcessPolicyGradientEngine.
 */
export function outcomePublishAdapterDispatch(
  action: string,
  params: Record<string, unknown>,
): unknown {
  switch (action) {
    case "xproc_outcome_publish":
      return OutcomePublishAdapterEngine.publish(params);
    case "xproc_outcome_publish_with_actuals":
      return OutcomePublishAdapterEngine.publishWithActuals(params);
    case "xproc_outcome_publish_failure":
      return OutcomePublishAdapterEngine.publishFailure(params);
    case "xproc_outcome_publish_override":
      return OutcomePublishAdapterEngine.publishOverride(params);
    case "xproc_outcome_update":
      return OutcomePublishAdapterEngine.updateOutcome(params);
    case "xproc_outcome_adapter_stats":
      return { ok: true, stats: OutcomePublishAdapterEngine.stats() };
    case "xproc_outcome_adapter_reset":
      OutcomePublishAdapterEngine.reset();
      return { ok: true, reset: true };
    default:
      throw new Error(`outcomePublishAdapterDispatch: unknown action '${action}'`);
  }
}
