/**
 * CamOutcomeFeedbackAdapterEngine — U-CAM-LOOP-WIRE-CONSUMER (2026-05-31, slot kilo)
 * ================================================================================
 *
 * The schema bridge that closes the CAM self-learning loop. The producer side
 * (CAMDriveRecipeEngine → OutcomeCaptureBus, U-CAM-LOOP-DOMAIN-ISOLATE) stores
 * events in the canonical OutcomeCaptureBus shape:
 *     { event_id, lineage_id, domain, kind, source, timestamp, context, actual, ... }
 * The consumer side (OutcomeFeedbackWireEngine.computeCorpusDelta /
 * SelfLearningLoopOrchestratorEngine) requires the wire shape:
 *     { outcomeId, templateId, decision, observed: 'success'|'partial'|'fail',
 *       query, measuredFeatures, timestamp }
 *
 * Before this engine the two shapes were incompatible — OutcomeFeedbackWire's
 * isValidOutcome() rejected every real bus event (no outcomeId/decision/observed),
 * so the loop's consumer half was dead even though both halves were built+tested.
 * This adapter is the missing translation.
 *
 * DESIGN — honest labels only (ML expert mode: garbage in, garbage out):
 *   - `observed` is derived from the event KIND + the actual-payload signal via an
 *     explicit rule table. When an event carries NO clear success/fail signal, the
 *     mapper returns null and the batch drops it — we never fabricate a label, which
 *     would poison the training corpus. Dropping an ambiguous event is correct.
 *   - `templateId` is the CAM-drive recipeId (the artifact being validated), parsed
 *     from the `recipeId:runId` lineage_id, or an explicit context.template_id.
 *
 * Pure static methods — no fs, no bus, no side effects. The dispatcher
 * (prism_cam:cam_outcome_feedback_compute_delta) queries the cam shard, maps via
 * this adapter, then calls the OutcomeFeedbackWire pure fns.
 *
 * @module engines/CamOutcomeFeedbackAdapterEngine
 * @milestone CAM-LEARN-LOOP U-CAM-LOOP-WIRE-CONSUMER
 */

/** The wire-outcome shape OutcomeFeedbackWireEngine.isValidOutcome() accepts. */
export interface WireOutcome {
  outcomeId: string;
  templateId: string;
  decision: string;
  observed: "success" | "partial" | "fail";
  query: string | null;
  measuredFeatures: Record<string, number> | null;
  timestamp: string;
}

/** Minimal structural view of an OutcomeCaptureBus event (as read back from a shard). */
export interface BusEventLike {
  event_id?: unknown;
  lineage_id?: unknown;
  kind?: unknown;
  timestamp?: unknown;
  context?: unknown;
  actual?: unknown;
  numeric_features?: unknown;
}

// Event kinds whose semantics directly imply a terminal outcome, independent of payload.
const SUCCESS_KINDS = new Set<string>(["first_article_pass", "quote_accepted", "collision_avoided"]);
const FAIL_KINDS = new Set<string>([
  "first_article_fail",
  "scrap_event",
  "tool_break",
  "chatter_event",
  "quote_rejected",
]);
// An operator overriding the AI's recommendation is a PARTIAL signal — the
// recommendation was usable enough to start from but needed adjustment.
const PARTIAL_KINDS = new Set<string>(["operator_override", "post_editor_edit"]);

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

export class CamOutcomeFeedbackAdapterEngine {
  /**
   * Derive the canonical observed signal from a bus event. Returns null when the
   * event carries no clear success/fail signal — the caller MUST drop a null
   * (never coerce it to a label; that would inject noise into the corpus).
   */
  static deriveObserved(ev: BusEventLike): "success" | "partial" | "fail" | null {
    const kind = typeof ev.kind === "string" ? ev.kind : "";
    if (SUCCESS_KINDS.has(kind)) return "success";
    if (FAIL_KINDS.has(kind)) return "fail";
    if (PARTIAL_KINDS.has(kind)) return "partial";

    // Payload-driven kinds (recommendation_emitted, cross_process_*, etc.):
    // read the actual-payload success markers the CAM-drive engine emits.
    const actual = asRecord(ev.actual);
    if (actual) {
      const postedOk = actual.postedOk;
      const success = actual.success;
      const gateBlocks = typeof actual.gateBlocks === "number" ? actual.gateBlocks : 0;
      if (postedOk === false || success === false) return "fail";
      if (postedOk === true || success === true) {
        // Posted, but one or more steps were gated/aborted → partial, not clean success.
        return gateBlocks > 0 ? "partial" : "success";
      }
    }
    // No usable signal — drop rather than fabricate.
    return null;
  }

  /**
   * Resolve the templateId: the artifact whose production is being scored. For a
   * CAM-drive replay this is the recipeId (lineage_id = `recipeId:runId`). An
   * explicit context.template_id wins if present.
   */
  static resolveTemplateId(ev: BusEventLike): string {
    const ctx = asRecord(ev.context);
    const explicit = ctx && typeof ctx.template_id === "string" ? ctx.template_id : null;
    if (explicit) return explicit;
    const lineage = typeof ev.lineage_id === "string" ? ev.lineage_id : "";
    if (lineage.includes(":")) return lineage.slice(0, lineage.indexOf(":"));
    if (lineage) return lineage;
    return "_compose_";
  }

  /**
   * Map ONE OutcomeCaptureBus event to a WireOutcome, or null if it cannot be
   * scored (missing id, or no derivable observed signal).
   */
  static busEventToWireOutcome(ev: BusEventLike): WireOutcome | null {
    if (!ev || typeof ev !== "object") return null;
    const outcomeId = typeof ev.event_id === "string" && ev.event_id ? ev.event_id : null;
    if (!outcomeId) return null;
    const observed = CamOutcomeFeedbackAdapterEngine.deriveObserved(ev);
    if (!observed) return null;

    const ctx = asRecord(ev.context);
    const decision =
      ctx && typeof ctx.action === "string" && ctx.action
        ? ctx.action
        : typeof ev.kind === "string" && ev.kind
          ? ev.kind
          : "unknown";

    const query =
      ctx && typeof ctx.part_number === "string"
        ? ctx.part_number
        : ctx && typeof ctx.program === "string"
          ? ctx.program
          : null;

    const nf = asRecord(ev.numeric_features);
    let measuredFeatures: Record<string, number> | null = null;
    if (nf) {
      const finite: Record<string, number> = {};
      for (const [k, v] of Object.entries(nf)) {
        if (typeof v === "number" && Number.isFinite(v)) finite[k] = v;
      }
      if (Object.keys(finite).length > 0) measuredFeatures = finite;
    }

    return {
      outcomeId,
      templateId: CamOutcomeFeedbackAdapterEngine.resolveTemplateId(ev),
      decision,
      observed,
      query,
      measuredFeatures,
      timestamp: typeof ev.timestamp === "string" ? ev.timestamp : "",
    };
  }

  /**
   * Map a batch of bus events to WireOutcomes, dropping any that cannot be scored.
   * Returns both the mapped outcomes and a count of dropped events for honest
   * telemetry (the caller should surface droppedCount — silent drops hide data issues).
   */
  static busEventsToWireOutcomes(events: BusEventLike[]): { outcomes: WireOutcome[]; dropped: number } {
    if (!Array.isArray(events)) return { outcomes: [], dropped: 0 };
    const outcomes: WireOutcome[] = [];
    let dropped = 0;
    for (const ev of events) {
      const w = CamOutcomeFeedbackAdapterEngine.busEventToWireOutcome(ev);
      if (w) outcomes.push(w);
      else dropped += 1;
    }
    return { outcomes, dropped };
  }

  static getSelfAwareness() {
    return {
      name: "CamOutcomeFeedbackAdapterEngine",
      version: "1.0.0",
      milestone: "CAM-LEARN-LOOP U-CAM-LOOP-WIRE-CONSUMER",
      capabilities: ["deriveObserved", "resolveTemplateId", "busEventToWireOutcome", "busEventsToWireOutcomes"],
      dependencies: ["outcomeEventSchema (shape)", "OutcomeFeedbackWireEngine (consumer)"],
      dataSourcesUsed: ["state/outcomes/cam.jsonl"],
    };
  }
}
