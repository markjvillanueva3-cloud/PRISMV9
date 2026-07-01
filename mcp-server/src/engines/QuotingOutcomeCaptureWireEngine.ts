// WIRE-EXEMPT: Middleware engine -- routes quoting closed-loop outcomes to OutcomeCaptureBus, not intended for dispatcher exposure
/**
 * QuotingOutcomeCaptureWireEngine -- U-CHARLIE-QUOTING-OUTCOME-WIRE
 * ===============================================================
 *
 * @WIRE-EXEMPT Middleware engine -- routes quoting outcome records to the
 * OutcomeCaptureBus, not intended for direct dispatcher exposure.
 *
 * THE GAP THIS CLOSES (verified 2026-06-27, slot:charlie):
 * Quoting ran a self-contained closed loop (QuotingClosedLoopEngine /
 * QuotingClosedLoopRunnerEngine) but emitted *nothing* to
 * `outcomeCaptureBusEngine` -- the producer side of the P0-U04 learning-loop
 * bridge (`OutcomeCaptureBusToFeedbackBridgeEngine`, india 2026-06-02). The
 * speed_feed / post_processor / cad domains each ship a dedicated
 * `*OutcomeCaptureWireEngine` (the proven pattern); quoting had none. So
 * india's cross-process learner (CrossProcessNeuralLearningEngine + the
 * drift/calibration/replay/episodic consumers, which already map
 * `quote_accepted`/`quote_rejected` -> train labels) was blind to quoting
 * outcomes. The quoting CLAUDE.md/MEMORY/TOOLBELT documented
 * `xproc_outcome_publish` as the mechanism -- but that path was never wired,
 * and the *real* mechanism the learner consumes is the capture bus. This
 * engine is the single seam that connects charlie -> india's learning stack.
 *
 * Design invariants (mirror SFCOutcomeCaptureWireEngine + the bus contract):
 *   1. NEVER BLOCK / NEVER THROW. The closed loop calls this *after* it has
 *      observed an outcome; a bus failure must never break a cycle. Every
 *      method returns a result object; all delegation is try/caught.
 *   2. AUTO-LINEAGE. lineage_id = quote_id so a `recommendation_emitted`
 *      prediction pairs with its later `quote_accepted`/`quote_rejected`/
 *      `quote_vs_actual` realized signal on the same lineage.
 *   3. FAITHFUL KIND MAPPING. The QuoteOutcomeRecord's realized signal
 *      determines the kind (see `outcomeKindFor`): accepted=true ->
 *      quote_accepted, accepted=false -> quote_rejected, else a finite
 *      realized invoice -> quote_vs_actual, else recommendation_emitted
 *      (prediction-only, paired later). The learner self-filters by kind --
 *      we never fabricate a label (R12).
 *   4. IDEMPOTENT (best-effort). The closed loop re-loads outcomes each cycle;
 *      a bounded in-memory seen-set keyed by quote_id|kind|observed_at avoids
 *      re-emitting the same realized signal. The bus + bridge are themselves
 *      idempotent, so this is an efficiency guard, not a correctness contract.
 *
 * @module engines/QuotingOutcomeCaptureWireEngine
 * @milestone QUOTING-SYNERGY U-CHARLIE-QUOTING-OUTCOME-WIRE
 */

import {
  outcomeCaptureBusEngine,
  OutcomeCaptureBusEngine,
  type RecordOutcomeResult,
} from "./OutcomeCaptureBusEngine.js";
import type { QuoteOutcomeRecord } from "./QuotingClosedLoopEngine.js";
import type { OutcomeKindT } from "../schemas/outcomeEventSchema.js";

/** Result of one emission attempt. Always returned, even on bus rejection. */
export interface QuotingEmissionResult {
  ok: boolean;
  emitted: boolean;        // false when skipped (duplicate / unusable record)
  kind: OutcomeKindT | null;
  lineage_id: string;
  event_id: string;
  reason?: string;         // why emitted=false, when applicable
  warning?: string;
}

/** Upper bound on the dedup set before it is cleared (memory guard). */
export const SEEN_CAP = 50_000;

/**
 * Maps a quoting outcome record's realized signal to a canonical OutcomeKind.
 *
 * Precedence is deliberate and faithful to the data semantics:
 *   1. `accepted === true`  -> quote_accepted  (terminal success -- learner trains)
 *   2. `accepted === false` -> quote_rejected  (terminal failure -- learner trains)
 *   3. finite positive `actual_invoice_usd` -> quote_vs_actual (realized
 *      reconciliation -- calibration/drift consume it; binary learner skips)
 *   4. otherwise -> recommendation_emitted (prediction only; paired later by
 *      lineage_id == quote_id when the realized signal lands)
 *
 * Never throws; a malformed record falls through to recommendation_emitted.
 */
export function outcomeKindFor(record: QuoteOutcomeRecord): OutcomeKindT {
  if (record.accepted === true) return "quote_accepted";
  if (record.accepted === false) return "quote_rejected";
  const actual = record.actual_invoice_usd;
  if (typeof actual === "number" && Number.isFinite(actual) && actual > 0) {
    return "quote_vs_actual";
  }
  return "recommendation_emitted";
}

/**
 * Percent error of the prediction vs the realized actual, when both are
 * finite and the prediction is non-zero. Negative = under-quoted.
 * Returns undefined when it cannot be computed (no fabricated value).
 */
export function quoteDeltaPct(record: QuoteOutcomeRecord): number | undefined {
  const predicted = record.predicted_quote_usd;
  const actual = record.actual_invoice_usd;
  if (
    typeof predicted === "number" && Number.isFinite(predicted) && predicted !== 0 &&
    typeof actual === "number" && Number.isFinite(actual)
  ) {
    return ((actual - predicted) / predicted) * 100;
  }
  return undefined;
}

/** Dedup key -- the same realized outcome observed across cycles emits once. */
function seenKey(record: QuoteOutcomeRecord, kind: OutcomeKindT): string {
  return `${record.quote_id}|${kind}|${record.observed_at ?? ""}`;
}

/**
 * QuotingOutcomeCaptureWireEngine -- singleton wire from the quoting closed
 * loop to the OutcomeCaptureBus. The runner calls `recordOutcome(...)` for
 * each observed QuoteOutcomeRecord; the P0-U04 bridge then forwards the event
 * to india's learning stack.
 */
export class QuotingOutcomeCaptureWireEngine {
  private readonly bus: OutcomeCaptureBusEngine;
  /** Bounded dedup set -- see SEEN_CAP. Tests can inspect via `seenSize`. */
  private readonly seen = new Set<string>();

  constructor(bus: OutcomeCaptureBusEngine = outcomeCaptureBusEngine) {
    this.bus = bus;
  }

  /** Current dedup-set size (for tests / diagnostics). */
  get seenSize(): number {
    return this.seen.size;
  }

  /** Clears the dedup set (for tests / explicit reset). */
  reset(): void {
    this.seen.clear();
  }

  /**
   * Record one quoting outcome to the capture bus. Best-effort: never throws,
   * always returns a result. Skips (emitted:false) on a missing quote_id or a
   * duplicate already seen this process-lifetime.
   *
   * @param record  A QuoteOutcomeRecord observed by the closed loop.
   * @param opts    `agentId` for cross-chat attribution; `engine` label for
   *                provenance (defaults to the closed-loop runner).
   * @returns       Result incl. the assigned lineage_id + the mapped kind.
   */
  recordOutcome(
    record: QuoteOutcomeRecord,
    opts: { agentId?: string; engine?: string } = {},
  ): QuotingEmissionResult {
    const lineage = record?.quote_id ?? "";
    if (!lineage) {
      return {
        ok: false, emitted: false, kind: null, lineage_id: "", event_id: "",
        reason: "missing quote_id",
      };
    }

    const kind = outcomeKindFor(record);
    const key = seenKey(record, kind);
    if (this.seen.has(key)) {
      return {
        ok: true, emitted: false, kind, lineage_id: lineage, event_id: "",
        reason: "duplicate",
      };
    }

    try {
      const context: Record<string, unknown> = { engine: opts.engine ?? "QuotingClosedLoopRunnerEngine" };
      if (record.customer) context.customer = record.customer;
      if (record.part_id) context.part_number = record.part_id;
      if (record.material) context.material = record.material;
      if (record.machine_class) context.machine_class = record.machine_class;
      if (record.doc_date) context.doc_date = record.doc_date;

      // The cost numerics ride on the free-form recommended / actual / delta
      // surfaces (calibration + reconciliation consumers read these). They are
      // DELIBERATELY NOT placed on `numeric_features`: that surface enforces a
      // CLOSED machining-physics key allowlist (tool_diameter_mm, spindle_rpm,
      // feed_rate_mm_min, ...) for the neural feature vector -- a USD key there
      // fails the bus's Zod superRefine and the ENTIRE event is dropped
      // (verified live 2026-06-27; the fake-bus unit test could not catch it).
      const delta = quoteDeltaPct(record);

      const busResult: RecordOutcomeResult = this.bus.record({
        domain: "quote",
        kind,
        source: "system",
        lineage_id: lineage,
        agent_id: opts.agentId,
        context,
        recommended: { predicted_quote_usd: record.predicted_quote_usd },
        actual:
          typeof record.actual_invoice_usd === "number"
            ? { actual_invoice_usd: record.actual_invoice_usd }
            : undefined,
        delta: delta !== undefined ? { pct: delta } : undefined,
      });

      if (busResult.ok) {
        if (this.seen.size >= SEEN_CAP) this.seen.clear();
        this.seen.add(key);
      }

      return {
        ok: busResult.ok,
        emitted: busResult.ok,
        kind,
        lineage_id: busResult.lineage_id || lineage,
        event_id: busResult.event_id,
        warning: busResult.warning,
        reason: busResult.ok ? undefined : "bus rejected",
      };
    } catch (err) {
      // Invariant #1: never throw into the closed loop.
      return {
        ok: false, emitted: false, kind, lineage_id: lineage, event_id: "",
        reason: `emit error: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  /**
   * Emit a batch of observed outcomes (best-effort, idempotent per record).
   * Returns one result per input record, in order. Never throws.
   */
  recordOutcomes(
    records: ReadonlyArray<QuoteOutcomeRecord>,
    opts: { agentId?: string; engine?: string } = {},
  ): QuotingEmissionResult[] {
    if (!Array.isArray(records)) return [];
    return records.map((r) => this.recordOutcome(r, opts));
  }
}

export const quotingOutcomeCaptureWireEngine = new QuotingOutcomeCaptureWireEngine();
