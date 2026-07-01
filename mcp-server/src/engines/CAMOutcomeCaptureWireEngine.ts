// WIRE-EXEMPT: Middleware engine -- dual-emits CAM outcomes to the universal
// OutcomeCaptureBus + the CrossProcessOutcomeStore (FeedbackBus training path),
// not intended for direct dispatcher exposure.
/**
 * CAMOutcomeCaptureWireEngine -- U5 (CLOSE-THE-LOOP CAM training producer)
 * =======================================================================
 *
 * @WIRE-EXEMPT Middleware engine -- routes CAM closed-loop outcomes to the
 * learning stack, not intended for direct dispatcher exposure. It is its own
 * singleton (`camOutcomeCaptureWireEngine`), per the producer-side exemption
 * documented in CLAUDE.md §ENGINE WIRING.
 *
 * THE GAP THIS CLOSES (verified live 2026-06-30, slot:india):
 * The CAM closed loop was WIRED but NEVER FED. The three CAM outcome shards
 *   `mcp-server/state/features/cam/{toolpath,post,nc_validate}_outcome/v1.jsonl`
 * held only 4 seed records total, and -- critically -- those records live in
 * the FeatureStore JSONL format (`{feature_group, feature_values, entity_id}`),
 * which is DISCONNECTED from the two surfaces that actually drive training:
 *
 *   1. `OutcomeCaptureBusEngine` -- the universal per-domain event spine
 *      (`state/outcomes/cam.jsonl`) that MLLineage / FeatureStore / drift
 *      consumers re-read. The quoting/SFC/CAD domains each ship a dedicated
 *      `*OutcomeCaptureWireEngine`; CAM had NONE.
 *   2. `CrossProcessOutcomeStore.record()` -- which synchronously publishes
 *      `outcome.recorded` to the in-process `FeedbackBusEngine`. That publish
 *      is what `CrossProcessNeuralLearningEngine.enableAutoTrain()` (U-NN-LOOP03)
 *      subscribes to: a recorded outcome with a usable label
 *      (`outcome.kind` in {success, failure, operator_override}) is buffered and,
 *      at threshold, triggers `train()` + a `neural.train.tick` publish.
 *
 * So a CAM run produced FeatureStore telemetry that no trainer ever saw. This
 * engine is the single seam that makes CAM a real training-data PRODUCER:
 * every observed CAM outcome DUAL-EMITS to (1) the durable universal bus AND
 * (2) the CrossProcessOutcomeStore -> FeedbackBus -> neural learner path.
 *
 * PATTERN SOURCE (cloned, not forked): `CADExecutionOutcomeBusEngine`
 * (CAD-COMPLETE-MS0/U-CADC-LP01) is the proven dual-channel emitter -- durable
 * `outcomeCaptureBusEngine.record({domain, kind, source:"system", ...})` plus
 * in-process fan-out. We add the CrossProcessOutcomeStore leg because THAT is
 * the leg the neural learner consumes (CADExecutionOutcomeBusEngine forwards
 * only to the universal bus; CAM must reach the FeedbackBus training path).
 *
 * VERIFIED CONTRACT CONSTRAINTS (each one a real drop-trap if violated):
 *   A. `domain: "cam"` + `kind: "cross_process_stage_complete"` -- both valid
 *      in `outcomeEventSchema`. `cross_process_stage_complete` is a v1.1.0-only
 *      kind, so the bus auto-stamps schemaVersion 1.1.0 (via pickSchemaVersion);
 *      we place the pipeline stage on `context.pipeline_stage`.
 *   B. `numeric_features` on the universal bus enforces a CLOSED 7-key
 *      cutting-physics allowlist (NUMERIC_FEATURE_KEYS). CAM extras
 *      (cycle_time_min, mrr_avg_mm3_min, lines_emitted, ...) are NOT in that
 *      set -- putting them there fails the Zod superRefine and DROPS THE WHOLE
 *      EVENT (charlie's verified 2026-06-27 trap). CAM numerics therefore ride
 *      on the free-form `context` / `actual` / `response_summary.metrics`
 *      surfaces, never `numeric_features`.
 *   C. `CrossProcessOutcomeStore` has a HARDCODED vocabulary:
 *        - bridge in {sf, post, feature, ai, router} -- CAM toolpath -> "feature",
 *          post/nc emit -> "post". No "cam" bridge exists (verified).
 *        - process in {mill, lathe, wedm} -- a CAM outcome is FOR a machine
 *          process; the caller supplies it. `record()` THROWS on an unknown
 *          process, so we validate + default to "mill" and NEVER throw upward.
 *        - request_summary numeric keys are validated against the SAME 7-key
 *          allowlist (validateNumericFeatures throws on a non-finite value) --
 *          so CAM extras go on `response_summary.metrics` (free Record) +
 *          `outcome.actual_metrics`, never on the numeric request fields.
 *   D. Only `outcome.kind` in {success, failure, operator_override} yields a
 *      training label; anything else the learner silently skips. We map each
 *      CAM outcome type to a faithful success/failure verdict (see verdictFor)
 *      -- we NEVER fabricate a success (R12).
 *
 * DESIGN INVARIANTS (mirror OutcomeCaptureBus + the sibling wire engines):
 *   1. NEVER BLOCK / NEVER THROW. The closed loop calls this AFTER it has
 *      observed an outcome; a bus/store failure must never break a cycle.
 *      Every method returns a result object; every delegation is try/caught.
 *   2. AUTO-LINEAGE. lineage_id defaults to entity_id so a later realized
 *      signal pairs on the same lineage. jobId threads both legs for replay.
 *   3. HONEST VERDICT. verdictFor() derives success/failure from the outcome's
 *      OWN signals (fatal_errors, sim_collisions, sim_overtravel, validated);
 *      ambiguous -> "pending" (skipped by the learner), never a fake success.
 *   4. TWO-LEG BEST-EFFORT. Each leg's success is reported independently
 *      (busOk / storeOk) so a partial failure is visible, not hidden.
 *
 * @module engines/CAMOutcomeCaptureWireEngine
 * @milestone CLOSE-THE-LOOP-CAM U5
 */

import {
  outcomeCaptureBusEngine,
  OutcomeCaptureBusEngine,
  type RecordOutcomeResult,
} from "./OutcomeCaptureBusEngine.js";
import {
  crossProcessOutcomeStore,
  CrossProcessOutcomeStore,
  OUTCOME_PROCESSES,
  type OutcomeBridge,
  type OutcomeProcess,
  type OutcomeKind as StoreOutcomeKind,
} from "./CrossProcessOutcomeStore.js";

/** The three CAM outcome families that flow through the closed loop. */
export type CAMOutcomeType = "toolpath" | "post" | "nc_validate";

/**
 * One observed CAM outcome. Fields mirror the FeatureStore `feature_values`
 * payloads already written to the CAM shards -- so the closed-loop runner can
 * hand this engine the same object it persists, with a couple of routing hints.
 * All shape-specific numerics are optional; verdictFor() reads only the ones
 * that determine success/failure.
 */
export interface CAMOutcomeInput {
  /** Which CAM outcome family this is -- routes bridge + pipeline stage. */
  type: CAMOutcomeType;
  /** Stable id for the outcome (FeatureStore entity_id). Becomes lineage_id. */
  entityId: string;
  /**
   * Target machine process this CAM job is FOR. MUST be a CrossProcessOutcomeStore
   * process (mill|lathe|wedm); an unknown/absent value defaults to "mill" and is
   * flagged in the result (NEVER throws -- the store would).
   */
  process?: string;
  /** Optional job id -- threads both legs for replay chains. */
  jobId?: string;
  /** CAM system slug (e.g. "hyperMILL_5axis", "SolidCAM_iMachining"). */
  camSystem?: string;
  /** Controller slug for post/nc outcomes (e.g. "okuma_osp", "haas_ngc"). */
  controller?: string;
  /** Post system slug for post outcomes (e.g. "PRISM_post"). */
  postSystem?: string;
  /** Strategy slug for toolpath outcomes (e.g. "adaptive_morph"). */
  strategy?: string;
  /** Optional customer / part / operation context. */
  customer?: string;
  partNumber?: string;
  operation?: string;
  /**
   * Free-form numeric telemetry from the outcome (cycle_time_min,
   * mrr_avg_mm3_min, lines_emitted, sim_collisions, fatal_errors, warnings,
   * ...). These ride the free-form surfaces -- NEVER numeric_features. Any
   * verdict-determining flags below are read directly, not from this map.
   */
  metrics?: Record<string, number>;
  // ---- verdict-determining signals (optional; read by verdictFor) ----
  /** nc_validate: count of fatal errors. >0 => failure. */
  fatalErrors?: number;
  /** post/toolpath: reported collision count. >0 => failure. */
  simCollisions?: number;
  /** post: reported overtravel count. >0 => failure. */
  simOvertravel?: number;
  /** post: explicit validation flag. false => failure, true => success. */
  validated?: boolean;
  /** True if an operator overrode the CAM recommendation (=> operator_override). */
  operatorOverride?: boolean;
  /** Optional confidence (0-1) the CAM engine attaches. */
  confidence?: number;
  /** Optional agent id for cross-chat attribution. */
  agentId?: string;
  /** Explicit verdict override -- when the caller already knows success/failure. */
  verdict?: StoreOutcomeKind;
}

/** Result of one dual-emit attempt. Always returned, even on rejection. */
export interface CAMEmissionResult {
  ok: boolean;                     // true iff BOTH legs succeeded
  emitted: boolean;                // false when skipped (bad input)
  type: CAMOutcomeType;
  lineage_id: string;
  /** Mapped CrossProcessOutcomeStore label (success|failure|operator_override|pending). */
  verdict: StoreOutcomeKind;
  /** Store bridge the outcome routed to (feature|post). */
  bridge: OutcomeBridge;
  /** Machine process the outcome routed to (validated). */
  process: OutcomeProcess;
  /** Universal-bus (durable) leg. */
  busOk: boolean;
  busEventId: string;
  busWarning?: string;
  /** CrossProcessOutcomeStore -> FeedbackBus (training) leg. */
  storeOk: boolean;
  storeEventId: string;
  storeWarning?: string;
  /** Populated when a bad process defaulted, or input was unusable. */
  reason?: string;
}

/** Default machine process when the caller omits/mis-supplies one. */
const DEFAULT_PROCESS: OutcomeProcess = "mill";

/**
 * Route a CAM outcome type to its CrossProcessOutcomeStore bridge + the
 * canonical universal-bus pipeline_stage label.
 *   - toolpath  -> bridge "feature", stage "toolpath_generate"
 *   - post      -> bridge "post",    stage "post_process"
 *   - nc_validate -> bridge "post",  stage "nc_validate"
 */
export function routeFor(type: CAMOutcomeType): { bridge: OutcomeBridge; stage: string } {
  switch (type) {
    case "toolpath":
      return { bridge: "feature", stage: "toolpath_generate" };
    case "post":
      return { bridge: "post", stage: "post_process" };
    case "nc_validate":
      return { bridge: "post", stage: "nc_validate" };
  }
}

/**
 * Derive an HONEST success/failure/override verdict from the outcome's OWN
 * signals. Precedence:
 *   1. explicit `verdict` override wins (caller already knows).
 *   2. `operatorOverride === true` -> "operator_override".
 *   3. any hard failure signal (fatalErrors>0, simCollisions>0,
 *      simOvertravel>0, validated===false) -> "failure".
 *   4. a positive completion signal (validated===true, OR a nc_validate/post/
 *      toolpath with zero failure signals AND at least one observed metric)
 *      -> "success".
 *   5. otherwise -> "pending" (learner skips it; NEVER a fabricated success).
 */
export function verdictFor(input: CAMOutcomeInput): StoreOutcomeKind {
  if (
    input.verdict === "success" ||
    input.verdict === "failure" ||
    input.verdict === "operator_override" ||
    input.verdict === "pending"
  ) {
    return input.verdict;
  }
  if (input.operatorOverride === true) return "operator_override";

  const fatal = num(input.fatalErrors);
  const collisions = num(input.simCollisions);
  const overtravel = num(input.simOvertravel);
  if ((fatal !== undefined && fatal > 0) ||
      (collisions !== undefined && collisions > 0) ||
      (overtravel !== undefined && overtravel > 0) ||
      input.validated === false) {
    return "failure";
  }

  // Positive completion evidence.
  if (input.validated === true) return "success";
  const hasFailureSignalPresent =
    fatal !== undefined || collisions !== undefined || overtravel !== undefined;
  const hasMetric = input.metrics !== undefined && Object.keys(input.metrics).length > 0;
  if (hasFailureSignalPresent && hasMetric) {
    // Failure signals were observed and all read zero, and we have telemetry:
    // a clean, completed CAM outcome.
    return "success";
  }
  return "pending";
}

function num(v: unknown): number | undefined {
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

/** Validate a caller-supplied process against the store's closed vocabulary. */
function resolveProcess(raw: string | undefined): { process: OutcomeProcess; defaulted: boolean } {
  if (raw && (OUTCOME_PROCESSES as readonly string[]).includes(raw)) {
    return { process: raw as OutcomeProcess, defaulted: false };
  }
  return { process: DEFAULT_PROCESS, defaulted: true };
}

/**
 * Build the free-form, JSON-safe metrics map for the store's
 * `response_summary.metrics` + `outcome.actual_metrics`. Only finite numbers
 * survive (NaN/Infinity dropped) so the JSONL line stays well-formed. The
 * verdict-flag fields are folded in so they are queryable downstream.
 */
export function buildMetrics(input: CAMOutcomeInput): Record<string, number> {
  const out: Record<string, number> = {};
  const src = input.metrics ?? {};
  for (const [k, v] of Object.entries(src)) {
    if (typeof v === "number" && Number.isFinite(v)) out[k] = v;
  }
  const flags: Array<[string, number | undefined]> = [
    ["fatal_errors", num(input.fatalErrors)],
    ["sim_collisions", num(input.simCollisions)],
    ["sim_overtravel", num(input.simOvertravel)],
  ];
  for (const [k, v] of flags) {
    if (v !== undefined && out[k] === undefined) out[k] = v;
  }
  return out;
}

/**
 * CAMOutcomeCaptureWireEngine -- singleton dual-emit wire from the CAM closed
 * loop to (1) the universal OutcomeCaptureBus and (2) the CrossProcessOutcomeStore
 * (FeedbackBus training path). The runner calls `recordOutcome(...)` once per
 * observed CAM outcome.
 */
export class CAMOutcomeCaptureWireEngine {
  private readonly bus: OutcomeCaptureBusEngine;
  private readonly store: CrossProcessOutcomeStore;

  constructor(
    bus: OutcomeCaptureBusEngine = outcomeCaptureBusEngine,
    store: CrossProcessOutcomeStore = crossProcessOutcomeStore,
  ) {
    this.bus = bus;
    this.store = store;
  }

  /**
   * Record one CAM outcome, DUAL-EMITTING to both learning surfaces.
   * Best-effort: never throws, always returns a result carrying both legs'
   * success flags + the mapped verdict/bridge/process.
   *
   * @param input  A CAM outcome observed by the closed loop.
   */
  recordOutcome(input: CAMOutcomeInput): CAMEmissionResult {
    // --- input guard (never throw) -------------------------------------
    const type = input?.type;
    const entityId = input?.entityId ?? "";
    if (type !== "toolpath" && type !== "post" && type !== "nc_validate") {
      return this.badInput("toolpath", entityId, `invalid outcome type "${String(type)}"`);
    }
    if (!entityId) {
      return this.badInput(type, "", "missing entityId");
    }

    const { bridge, stage } = routeFor(type);
    const verdict = verdictFor(input);
    const { process, defaulted } = resolveProcess(input.process);
    const metrics = buildMetrics(input);

    // --- Leg 1: durable universal OutcomeCaptureBus (cam shard) ---------
    let busOk = false;
    let busEventId = "";
    let busWarning: string | undefined;
    try {
      const context: Record<string, unknown> = {
        engine: "CAMOutcomeCaptureWireEngine",
        pipeline_stage: stage,           // v1.1.0 -> auto-stamps schemaVersion 1.1.0
        cam_outcome_type: type,
      };
      if (input.jobId) context.job_id = input.jobId;
      if (input.camSystem) context.cam_system = input.camSystem;
      if (input.controller) context.controller = input.controller;
      if (input.postSystem) context.post_system = input.postSystem;
      if (input.strategy) context.strategy = input.strategy;
      if (input.customer) context.customer = input.customer;
      if (input.partNumber) context.part_number = input.partNumber;
      if (input.operation) context.operation = input.operation;
      context.process = process;
      context.verdict = verdict;

      const busResult: RecordOutcomeResult = this.bus.record({
        domain: "cam",
        // cross_process_stage_complete is a v1.1.0 kind -> schema auto-bumps.
        kind: "cross_process_stage_complete",
        source: "system",
        lineage_id: entityId,
        agent_id: input.agentId,
        confidence: input.confidence,
        context,
        // CAM numerics ride the free-form `actual` surface -- NOT numeric_features
        // (that surface would drop the whole event on a non-allowlist key).
        actual: { verdict, metrics },
      });
      busOk = busResult.ok;
      busEventId = busResult.event_id;
      busWarning = busResult.ok ? undefined : (busResult.warning ?? "universal bus rejected");
    } catch (err) {
      busWarning = `bus emit error: ${err instanceof Error ? err.message : String(err)}`;
    }

    // --- Leg 2: CrossProcessOutcomeStore -> FeedbackBus (training) ------
    // This is the leg the neural learner (enableAutoTrain, U-NN-LOOP03)
    // consumes: record() synchronously publishes "outcome.recorded" to the
    // FeedbackBus, and a labelled record (verdict in {success,failure,
    // operator_override}) becomes a training sample.
    let storeOk = false;
    let storeEventId = "";
    let storeWarning: string | undefined;
    try {
      const request_summary: Record<string, unknown> = {
        cam_system: input.camSystem,
        controller: input.controller,
        operation: input.operation,
        customer: input.customer,
        feature: type,          // categorical: which CAM outcome family
        intent: stage,
      };
      // Prune undefined so the store's request_summary stays tidy (its numeric
      // validator only touches the 7 allowlisted keys, none of which we set --
      // so no non-finite-throw path is reachable here).
      for (const k of Object.keys(request_summary)) {
        if (request_summary[k] === undefined) delete request_summary[k];
      }

      const outcomeBlock =
        verdict === "pending"
          ? { kind: "pending" as StoreOutcomeKind }
          : {
              kind: verdict,
              actual_metrics: metrics,
              notes: `CAM ${type} outcome (stage=${stage})`,
            };

      storeEventId = this.store.record({
        bridge,
        process,
        jobId: input.jobId,
        request_summary,
        response_summary: {
          primary_output: input.strategy ?? input.postSystem ?? type,
          success: verdict === "success",
          metrics,
        },
        outcome: outcomeBlock,
        operator: input.operatorOverride ? { override_reason: "cam_operator_override" } : undefined,
      });
      storeOk = typeof storeEventId === "string" && storeEventId.length > 0;
    } catch (err) {
      // The store THROWS on a bad process/kind; we already validated both, so a
      // throw here is unexpected -- surface it, never propagate (invariant #1).
      storeWarning = `store emit error: ${err instanceof Error ? err.message : String(err)}`;
    }

    return {
      ok: busOk && storeOk,
      emitted: true,
      type,
      lineage_id: entityId,
      verdict,
      bridge,
      process,
      busOk,
      busEventId,
      busWarning,
      storeOk,
      storeEventId,
      storeWarning,
      reason: defaulted
        ? `process "${String(input.process)}" not in [${OUTCOME_PROCESSES.join(", ")}] -- defaulted to "${DEFAULT_PROCESS}"`
        : undefined,
    };
  }

  /**
   * Emit a batch of observed outcomes (best-effort per record). Returns one
   * result per input record, in order. Never throws.
   */
  recordOutcomes(inputs: ReadonlyArray<CAMOutcomeInput>): CAMEmissionResult[] {
    if (!Array.isArray(inputs)) return [];
    return inputs.map((i) => this.recordOutcome(i));
  }

  private badInput(type: CAMOutcomeType, lineage: string, reason: string): CAMEmissionResult {
    const { bridge } = routeFor(type);
    return {
      ok: false,
      emitted: false,
      type,
      lineage_id: lineage,
      verdict: "pending",
      bridge,
      process: DEFAULT_PROCESS,
      busOk: false,
      busEventId: "",
      storeOk: false,
      storeEventId: "",
      reason,
    };
  }
}

export const camOutcomeCaptureWireEngine = new CAMOutcomeCaptureWireEngine();
