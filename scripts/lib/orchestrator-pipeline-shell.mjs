// scripts/lib/orchestrator-pipeline-shell.mjs
//
// U-MMO-PIPELINE-SHELL — 16-stage MASTER-MACHINIST-ORCHESTRATOR skeleton.
//
// PURPOSE
// The composing layer over PRISM's 3,500-engine substrate. Per the
// MASTER-MACHINIST-ORCHESTRATOR-MS0 spec
// (state/shared/specs/MASTER-MACHINIST-ORCHESTRATOR-2026-05-26.md):
//
//   16 stages × 2 side-channels (GD&T + confidence-trace)
//
// This shell is intentionally pure-functional and facade-only. Each stage
// has a default no-op adapter that emits a zero-cost +/- "unbuilt" mark.
// The 10 sierra-owned units that depend on this shell each register a real
// adapter for their stage(s). Other slots (india/juliett/golf/hotel) also
// register adapters for their units.
//
// The cost-emit contract on every stage adapter is:
//   adapter(stageInput, context) -> {
//     cost: number,                     // dollars contributed by this stage
//     duration_estimate_sec: number,    // wall-clock estimate
//     confidence: number,               // 0..1; lower → wider intervals
//     evidence: string[],               // why this cost (auditable)
//     gdnt_passthrough: object | null,  // GD&T side-channel propagation
//     trace: string,                    // explain-trace for stakeholder UX
//     output: object,                   // domain output for next stage
//     deferred: boolean,                // true if adapter is unbuilt no-op
//   }
//
// Two run modes:
//   - "estimate": dry-run for QUOTE-DRY-RUN (no metal moves). Aggregates
//     stage costs into a quote with P50/P95/P99 bands per
//     U-MMO-QUOTE-DRY-RUN.
//   - "execute": production run. Stages may invoke real engines and emit
//     real-time outcomes to the OUTCOME-BUS (U-MMO-OUTCOME-BUS-CONTROLLER).
//
// DOCTRINE
//   - R8 (read before write): each stage adapter MUST cite the underlying
//     PRISM engine(s) it delegates to. The shell verifies adapter
//     declarations.
//   - R9 (tests verify intent): per-stage tests assert that an unbuilt
//     no-op adapter returns deferred=true + 0 cost (so quote-dry-run
//     surfaces the gap honestly per R12 fail-loud).
//   - R10 (checkpoint state): every stage execution writes to the
//     pipeline run-log so the operator can resume mid-pipeline.
//   - R11 (match conventions): adapter contract mirrors the pure-fn
//     boundary used in cag-router + lora-training-pipeline.
//   - R12 (fail-loud): unbuilt stages NEVER fake a cost — they return
//     deferred=true and the orchestrator surfaces this in the quote
//     decomposition as "UNBUILT: $0 estimated, cost likely higher."

// ---------------------------------------------------------------------------
// STAGE REGISTRY — canonical 16-stage list
// ---------------------------------------------------------------------------

export const PIPELINE_VERSION = "1.0.0";

export const STAGE_IDS = Object.freeze([
  "INPUT",                  // 1.  RFQ + blueprint/photo/STEP intake
  "MATERIAL_RESOLVE",       // 2.  Material spec + heat-treat + supplier
  "FEASIBILITY_GATE",       // 3.  Pre-quote feasibility (fixes wrong-order)
  "CAD",                    // 4.  Text/blueprint/photo → 3D + featureDAG
  "SETUP_PLAN",             // 5.  Workholding + datum + multi-op sequence
  "METHOD_ROUTER",          // 6.  CAM vs macro vs conversational vs on-machine
  "CAM_STRATEGY",           // 7.  200+ toolpath selection
  "SSF",                    // 8.  Speed/feed/chatter
  "TOOL_CRIB",              // 9.  Real JM Die inventory + substitute
  "POST",                   // 10. Controller-dialect G-code emit
  "SETUP_VALIDATION",       // 11. Air-cut + datum-offset proof
  "SIM_QA",                 // 12. Collision + safety Ω/S(x)
  "FAI_GATE",               // 13. CMM + Cpk + PPAP
  "SECONDARY_OPS",          // 14. Heat-treat/grind/anodize/plate routing
  "EXECUTE",                // 15. MACHINE_RUN dispatcher
  "ERP_COST_QUOTE",         // 16. Cost rollup + invoice + win/lose
]);

export const STAGE_METADATA = Object.freeze({
  INPUT:              { stage_no:  1, side_channel_owner: "GDNT_INIT",     hub_engine: "PrintToProgramPipelineEngine" },
  MATERIAL_RESOLVE:   { stage_no:  2, side_channel_owner: null,            hub_engine: "MaterialEquivalenceEngine" },
  FEASIBILITY_GATE:   { stage_no:  3, side_channel_owner: null,            hub_engine: "FeasibilityOrchestratorEngine" },
  CAD:                { stage_no:  4, side_channel_owner: null,            hub_engine: "CADSystemRouterEngine" },
  SETUP_PLAN:         { stage_no:  5, side_channel_owner: null,            hub_engine: "SetupOrchestrationEngine"  /* U-MMO-SETUP-ORCH — to build */ },
  METHOD_ROUTER:      { stage_no:  6, side_channel_owner: null,            hub_engine: "ProgrammingMethodOrchestratorEngine"  /* U-MMO-METHOD-ROUTER — to build */ },
  CAM_STRATEGY:       { stage_no:  7, side_channel_owner: null,            hub_engine: "CAMKernelOrchestratorEngine" },
  SSF:                { stage_no:  8, side_channel_owner: null,            hub_engine: "SpeedFeedOrchestratorEngine" },
  TOOL_CRIB:          { stage_no:  9, side_channel_owner: null,            hub_engine: "ToolInventoryOrchestratorEngine" },
  POST:               { stage_no: 10, side_channel_owner: null,            hub_engine: "MasterPostProcessorEngine" },
  SETUP_VALIDATION:   { stage_no: 11, side_channel_owner: null,            hub_engine: "CalibratedSimulationEngine" },
  SIM_QA:             { stage_no: 12, side_channel_owner: null,            hub_engine: "SimulationEngine" },
  FAI_GATE:           { stage_no: 13, side_channel_owner: "GDNT_CONSUME",  hub_engine: "PRISMOmegaSafetyEngine" },
  SECONDARY_OPS:      { stage_no: 14, side_channel_owner: null,            hub_engine: "SecondaryOpsEngine" },
  EXECUTE:            { stage_no: 15, side_channel_owner: null,            hub_engine: "prism_machine_run"  /* U-MMO-MACHINE-RUN-DISPATCHER — to build */ },
  ERP_COST_QUOTE:     { stage_no: 16, side_channel_owner: null,            hub_engine: "QuoteToShipOrchestratorEngine" },
});

// ---------------------------------------------------------------------------
// VALIDATION
// ---------------------------------------------------------------------------

/**
 * Validate that a stage adapter conforms to the contract.
 * @param {object} adapter
 * @param {string} stageId
 * @returns {void}
 */
export function validateStageAdapter(adapter, stageId) {
  if (!adapter || typeof adapter !== "object") {
    throw new Error(`validateStageAdapter[${stageId}]: adapter must be an object`);
  }
  if (!STAGE_IDS.includes(stageId)) {
    throw new Error(`validateStageAdapter: invalid stageId '${stageId}'`);
  }
  if (typeof adapter.run !== "function") {
    throw new Error(`validateStageAdapter[${stageId}]: adapter.run(input, context) required`);
  }
  if (typeof adapter.engineRef !== "string") {
    throw new Error(`validateStageAdapter[${stageId}]: adapter.engineRef (string) required — cite the PRISM engine this adapter delegates to (R8)`);
  }
}

// ---------------------------------------------------------------------------
// DEFAULT NO-OP ADAPTER
// ---------------------------------------------------------------------------

/**
 * Create a no-op stage adapter that surfaces "unbuilt" honestly (R12).
 * Used for stages whose unit hasn't shipped yet.
 *
 * @param {string} stageId
 * @returns {object}
 */
export function createNoopAdapter(stageId) {
  if (!STAGE_IDS.includes(stageId)) {
    throw new Error(`createNoopAdapter: invalid stageId '${stageId}'`);
  }
  const meta = STAGE_METADATA[stageId];
  return {
    engineRef: meta.hub_engine + " (UNBUILT-NOOP)",
    isNoop: true,
    run(_input, _context) {
      return {
        cost: 0,
        duration_estimate_sec: 0,
        confidence: 0,
        evidence: [`stage ${stageId} adapter not yet registered — quote will UNDERESTIMATE by this stage's contribution`],
        gdnt_passthrough: null,
        trace: `UNBUILT: ${stageId} — register an adapter via Pipeline.registerStage(${stageId}, adapter)`,
        output: { _noop: true, stage: stageId },
        deferred: true,
      };
    },
  };
}

// ---------------------------------------------------------------------------
// PIPELINE CONSTRUCTOR
// ---------------------------------------------------------------------------

/**
 * Build a pipeline shell with no-op adapters everywhere. Callers register
 * real adapters via .registerStage() as their unit ships.
 *
 * @param {object} [opts]
 * @param {string} [opts.mode="estimate"] - "estimate" | "execute"
 * @param {Function} [opts.audit] - (entry) => void per-stage audit hook
 * @returns {object}
 */
export function createPipeline(opts = {}) {
  const mode = opts.mode || "estimate";
  if (mode !== "estimate" && mode !== "execute") {
    throw new Error(`createPipeline: mode must be "estimate" | "execute", got "${mode}"`);
  }
  const audit = typeof opts.audit === "function" ? opts.audit : null;

  // Each stage starts with a no-op adapter
  const adapters = {};
  for (const id of STAGE_IDS) {
    adapters[id] = createNoopAdapter(id);
  }

  return {
    version: PIPELINE_VERSION,
    mode,
    stageIds: STAGE_IDS,
    stageMetadata: STAGE_METADATA,

    /**
     * Register a real adapter for a stage. Replaces the no-op default.
     */
    registerStage(stageId, adapter) {
      validateStageAdapter(adapter, stageId);
      adapters[stageId] = { ...adapter, isNoop: false };
    },

    /**
     * List registered stages with their adapters.
     */
    listStages() {
      return STAGE_IDS.map((id) => ({
        stageId: id,
        ...STAGE_METADATA[id],
        engineRef: adapters[id].engineRef,
        isNoop: adapters[id].isNoop !== false,
      }));
    },

    /**
     * Run the full 16-stage pipeline against an input. Returns the
     * stage-by-stage decomposition + aggregated totals.
     *
     * In "estimate" mode this is the dry-run that powers QUOTE-DRY-RUN.
     * In "execute" mode this is the production run that emits outcomes
     * to the OUTCOME-BUS.
     *
     * @param {object} initialInput
     * @returns {{ decomposition: object[], totals: object, gdnt_final: object | null }}
     */
    run(initialInput) {
      if (!initialInput || typeof initialInput !== "object") {
        throw new Error(`Pipeline.run: initialInput object required`);
      }
      const decomposition = [];
      const context = {
        gdnt_payload: null,    // GD&T side-channel A
        confidence_trace: [],  // confidence side-channel B
        mode,
        startTime: new Date().toISOString(),
      };
      let stageInput = initialInput;

      for (const stageId of STAGE_IDS) {
        const adapter = adapters[stageId];
        const meta = STAGE_METADATA[stageId];
        let result;
        try {
          result = adapter.run(stageInput, context);
        } catch (err) {
          // R12 fail-loud: surface the stage that crashed
          result = {
            cost: 0, duration_estimate_sec: 0, confidence: 0,
            evidence: [`stage ${stageId} threw: ${err.message}`],
            gdnt_passthrough: null,
            trace: `ERROR in ${stageId}: ${err.message}`,
            output: { _error: true, message: err.message },
            deferred: false,
            errored: true,
          };
        }
        // Validate cost-emit contract
        if (typeof result.cost !== "number" || !Number.isFinite(result.cost)) {
          throw new Error(`Pipeline.run[${stageId}]: adapter returned non-finite cost (${result.cost}) — R12 violation`);
        }
        if (typeof result.confidence !== "number" || result.confidence < 0 || result.confidence > 1) {
          throw new Error(`Pipeline.run[${stageId}]: confidence must be in [0,1], got ${result.confidence}`);
        }
        // Propagate GD&T side-channel
        if (result.gdnt_passthrough != null) {
          context.gdnt_payload = result.gdnt_passthrough;
        }
        context.confidence_trace.push({ stage: stageId, confidence: result.confidence });
        decomposition.push({
          stage: stageId,
          stage_no: meta.stage_no,
          engineRef: adapter.engineRef,
          cost: result.cost,
          duration_estimate_sec: result.duration_estimate_sec || 0,
          confidence: result.confidence,
          evidence: result.evidence || [],
          trace: result.trace || "",
          deferred: result.deferred === true,
          errored: result.errored === true,
        });
        if (audit) {
          audit({ stageId, result, context: { mode, gdnt_payload: context.gdnt_payload } });
        }
        // Pass output forward for next stage's input
        stageInput = { ...stageInput, prior: result.output };
      }

      // Aggregate
      const totals = aggregateDecomposition(decomposition);
      return {
        decomposition,
        totals,
        gdnt_final: context.gdnt_payload,
        confidence_trace: context.confidence_trace,
        run_metadata: {
          mode,
          startTime: context.startTime,
          endTime: new Date().toISOString(),
          version: PIPELINE_VERSION,
        },
      };
    },
  };
}

// ---------------------------------------------------------------------------
// AGGREGATION (powers QUOTE-DRY-RUN's P50/P95/P99 bands)
// ---------------------------------------------------------------------------

/**
 * Aggregate a per-stage decomposition into pipeline totals + uncertainty
 * bands. This is the math behind QUOTE-DRY-RUN's quote_low_p50 /
 * quote_med_p95 / quote_high_p99 contract.
 *
 * Confidence-weighted bands: lower-confidence stages contribute wider
 * intervals. Each stage's cost is scaled by (1 / confidence) for the
 * upper band and confidence for the lower band — bounded so unbuilt
 * stages (confidence=0) don't blow up.
 *
 * @param {object[]} decomposition - from Pipeline.run().decomposition
 * @returns {object}
 */
export function aggregateDecomposition(decomposition) {
  if (!Array.isArray(decomposition)) {
    throw new Error("aggregateDecomposition: decomposition must be an array");
  }
  let sum = 0;
  let sumLow = 0;
  let sumHigh = 0;
  let totalDuration = 0;
  const deferred = [];
  const errored = [];
  const minConfidence = { value: 1, stage: null };

  for (const stage of decomposition) {
    const c = stage.cost || 0;
    sum += c;
    totalDuration += stage.duration_estimate_sec || 0;
    // Confidence-weighted bands. Floor confidence at 0.1 to bound
    // multiplicative blow-up on unbuilt stages.
    const conf = Math.max(stage.confidence ?? 0, 0.1);
    sumLow  += c * conf;          // p50-conservative-on-cost (lower)
    sumHigh += c / conf;          // p99 worst-case (higher)
    if (stage.deferred) deferred.push(stage.stage);
    if (stage.errored) errored.push(stage.stage);
    if ((stage.confidence ?? 1) < minConfidence.value) {
      minConfidence.value = stage.confidence ?? 0;
      minConfidence.stage = stage.stage;
    }
  }

  // P95 is midway between P50 (sum at declared confidences) and P99
  const p50 = sum;
  const p99 = sumHigh;
  const p95 = p50 + (p99 - p50) * 0.66; // gaussian-ish, 1.65σ ≈ 0.66 of (P99-P50)

  return {
    cost_p50: round2(p50),
    cost_p95: round2(p95),
    cost_p99: round2(p99),
    cost_low_band: round2(sumLow),
    duration_total_sec: Math.round(totalDuration),
    deferred_stages: deferred,
    errored_stages: errored,
    min_confidence: minConfidence,
    quote_reliability:
      deferred.length === 0 && errored.length === 0
        ? "ALPHA"
        : deferred.length <= 4 && errored.length === 0
          ? "BETA"
          : "GAMMA",
  };
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

// ---------------------------------------------------------------------------
// COMPACT 1-LINE SUMMARY (for hook injection / logs)
// ---------------------------------------------------------------------------

/**
 * @param {ReturnType<typeof aggregateDecomposition>} totals
 * @returns {string}
 */
export function summarizeRun(totals) {
  if (!totals) return "(no run totals)";
  return `Pipeline: $${totals.cost_p50}/p50 → $${totals.cost_p95}/p95 → $${totals.cost_p99}/p99 · ${totals.duration_total_sec}s · ${totals.quote_reliability} · deferred=[${totals.deferred_stages.join(",")}]`;
}
