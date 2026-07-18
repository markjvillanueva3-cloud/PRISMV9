// scripts/lib/training-driver-lib.mjs
//
// U-TDP01 — Print-to-CAM Training Driver (pure orchestrator core).
//
// Drives the full PRISM print→CAD→CAM pipeline on ONE print at a time and
// records the outcome to blueprint-accuracy-events.jsonl so the U-BPA-CONSUMER
// (shipped commit 6cbe5b1561) drains it on its next pass. Closes the gap
// between "infrastructure exists" and "system trains on real prints".
//
// Architecture: 4 stages, each takes an INJECTED adapter so the pure core is
// hermetic-testable. Production CLI shell wires real engines/dispatchers.
//
//   Stage A  EXTRACT  — blueprint PDF + part_class → BlueprintExtraction
//                       (via blueprint_rag_extract dispatcher action)
//   Stage B  CAD      — part_class + built_kinds → dispatched Fusion360 ops
//                       (via cad_class_drive_build, use_corpus_evidence=true)
//   Stage C  CAM      — CAD setup → Fusion360 CAM post-process
//                       (via cam_fusion_build_setup_create + postprocess)
//   Stage D  RECORD   — outcome event written to blueprint-accuracy-events.jsonl
//                       (the canonical bridge — consumer drains async)
//
// Failure semantics (R12 fail-loud):
//   - Each stage emits {status: "ok"|"failed"|"skipped"} with a reason.
//   - When Stage A fails, B+C are SKIPPED (cannot drive build without an
//     extraction). Stage D STILL fires with the failure recorded — the
//     training signal includes failures.
//   - When Stage B fails, Stage C is SKIPPED but D fires.
//   - When Stage C fails, D fires with the partial result recorded.
//   - When Stage D fails, the whole pipeline returns success=false because
//     a silent training-signal miss is the worst failure mode.
//
// Idempotency: caller is responsible for not re-running the same print twice
// (the driver does no dedup — emits one event per call). Consumer's
// lastProcessedOffset prevents double-counting on the consumer side.

/** Adapters injected by the caller. Production CLI wires these to real engines. */
export const REQUIRED_ADAPTERS = Object.freeze([
  "extract",   // ({pdf_path, part_class}) => Promise<{success, extraction?, error?}>
  "driveCad",  // ({part_class, built_kinds, use_corpus_evidence}) => Promise<{success, dispatched?, skipped?, error?}>
  "driveCam",  // ({part_class, cad_setup_id}) => Promise<{success, nc_output?, error?}>
  "recordEvent", // (event) => Promise<{success, error?}>
]);

/** Stage status values. */
export const STAGE_STATUS = Object.freeze({ OK: "ok", FAILED: "failed", SKIPPED: "skipped" });

/** All four stage names — for ordering + reporting. */
export const STAGE_NAMES = Object.freeze(["extract", "cad", "cam", "record"]);

/**
 * Validate the adapter object exposes every required function. Returns the
 * names of any missing/non-function adapters. Empty array = valid.
 *
 * @param {object} adapters
 * @returns {string[]}
 */
export function validateAdapters(adapters) {
  if (!adapters || typeof adapters !== "object") return [...REQUIRED_ADAPTERS];
  const missing = [];
  for (const name of REQUIRED_ADAPTERS) {
    if (typeof adapters[name] !== "function") missing.push(name);
  }
  return missing;
}

/**
 * Normalize a stage result to the canonical {status, reason?, data?} shape.
 * Defensive: if the adapter throws or returns a malformed shape, we coerce to
 * a "failed" stage result with the error message in `reason`.
 *
 * @param {unknown} raw — whatever the adapter returned/threw
 * @param {string} fallbackReason — used when raw is malformed
 * @returns {{status: string, reason?: string, data?: object}}
 */
function normalizeStageResult(raw, fallbackReason) {
  if (raw && typeof raw === "object") {
    if (raw.success === true) {
      return { status: STAGE_STATUS.OK, data: raw };
    }
    if (raw.success === false) {
      return { status: STAGE_STATUS.FAILED, reason: String(raw.error ?? fallbackReason), data: raw };
    }
  }
  return { status: STAGE_STATUS.FAILED, reason: fallbackReason };
}

/**
 * Run the full 4-stage pipeline on a single print. Pure (no I/O — caller's
 * adapters do the side effects).
 *
 * @param {{pdf_path: string, part_class: string, built_kinds?: string[], use_corpus_evidence?: boolean, operator_id?: string}} job
 * @param {object} adapters — must satisfy REQUIRED_ADAPTERS
 * @param {{now?: () => string}} [opts]
 * @returns {Promise<{success: boolean, stages: object, event: object, summary: object}>}
 */
export async function runPipeline(job, adapters, opts = {}) {
  const missing = validateAdapters(adapters);
  if (missing.length) {
    throw new Error(`training-driver: missing adapter(s): ${missing.join(", ")}`);
  }
  if (!job || typeof job !== "object") {
    throw new Error("training-driver: job must be an object");
  }
  if (typeof job.pdf_path !== "string" || !job.pdf_path) {
    throw new Error("training-driver: job.pdf_path must be a non-empty string");
  }
  if (typeof job.part_class !== "string" || !job.part_class) {
    throw new Error("training-driver: job.part_class must be a non-empty string");
  }
  const now = typeof opts.now === "function" ? opts.now : () => new Date().toISOString();

  const stages = {
    extract: { status: STAGE_STATUS.SKIPPED, reason: "not yet run" },
    cad:     { status: STAGE_STATUS.SKIPPED, reason: "not yet run" },
    cam:     { status: STAGE_STATUS.SKIPPED, reason: "not yet run" },
    record:  { status: STAGE_STATUS.SKIPPED, reason: "not yet run" },
  };

  // ── Stage A: EXTRACT ────────────────────────────────────────────
  let extraction = null;
  try {
    const r = await adapters.extract({ pdf_path: job.pdf_path, part_class: job.part_class });
    stages.extract = normalizeStageResult(r, "extract returned malformed result");
    if (stages.extract.status === STAGE_STATUS.OK) {
      extraction = r.extraction ?? null;
    }
  } catch (e) {
    stages.extract = { status: STAGE_STATUS.FAILED, reason: e instanceof Error ? e.message : String(e) };
  }

  // ── Stage B: CAD ────────────────────────────────────────────────
  let cadResult = null;
  if (stages.extract.status === STAGE_STATUS.OK) {
    try {
      const r = await adapters.driveCad({
        part_class: job.part_class,
        built_kinds: Array.isArray(job.built_kinds) ? [...job.built_kinds] : [],
        use_corpus_evidence: job.use_corpus_evidence !== false, // default true
      });
      stages.cad = normalizeStageResult(r, "driveCad returned malformed result");
      if (stages.cad.status === STAGE_STATUS.OK) {
        cadResult = r;
      }
    } catch (e) {
      stages.cad = { status: STAGE_STATUS.FAILED, reason: e instanceof Error ? e.message : String(e) };
    }
  } else {
    stages.cad = { status: STAGE_STATUS.SKIPPED, reason: "extract failed — cannot drive CAD without an extraction" };
  }

  // ── Stage C: CAM ────────────────────────────────────────────────
  let camResult = null;
  if (stages.cad.status === STAGE_STATUS.OK) {
    try {
      const r = await adapters.driveCam({ part_class: job.part_class, cad_setup_id: cadResult?.setup_id ?? null });
      stages.cam = normalizeStageResult(r, "driveCam returned malformed result");
      if (stages.cam.status === STAGE_STATUS.OK) {
        camResult = r;
      }
    } catch (e) {
      stages.cam = { status: STAGE_STATUS.FAILED, reason: e instanceof Error ? e.message : String(e) };
    }
  } else {
    stages.cam = { status: STAGE_STATUS.SKIPPED, reason: `CAD stage was ${stages.cad.status} — cannot drive CAM` };
  }

  // ── Stage D: RECORD ─────────────────────────────────────────────
  // ALWAYS runs — even when upstream stages failed, the training signal MUST
  // include the failure (silent miss = worst failure mode).
  const event = {
    type: "outcome_record",
    ts: now(),
    payload: {
      pdf_path: job.pdf_path,
      part_class: job.part_class,
      operator_id: job.operator_id ?? null,
      extract_status: stages.extract.status,
      cad_status: stages.cad.status,
      cam_status: stages.cam.status,
      // Confidence floor signal — when extract succeeded, this is the extraction
      // confidence; when it failed, this signals "no extraction" → consumer
      // would route to xproc_replay_add via priority 1.0.
      extraction_confidence: extraction?.confidence ?? null,
      // FULL extraction object — required by U-TDP03 aggregator to mine
      // dimension + feature + tolerance distributions per part_class. Without
      // this, the aggregator sees zero extractions and emits empty templates.
      // Size is bounded by the BlueprintExtractionRAGEngine output schema.
      extraction: extraction,
      cad_dispatched_count: cadResult?.dispatched?.length ?? 0,
      cad_skipped_count: cadResult?.skipped?.length ?? 0,
      cam_nc_output_present: camResult?.nc_output != null,
      // Accurate=true only when ALL upstream stages succeeded. A single failure
      // means the operator-correction signal is "this was not a clean run".
      accurate:
        stages.extract.status === STAGE_STATUS.OK &&
        stages.cad.status === STAGE_STATUS.OK &&
        stages.cam.status === STAGE_STATUS.OK,
    },
  };
  try {
    const r = await adapters.recordEvent(event);
    stages.record = normalizeStageResult(r, "recordEvent returned malformed result");
  } catch (e) {
    stages.record = { status: STAGE_STATUS.FAILED, reason: e instanceof Error ? e.message : String(e) };
  }

  // Pipeline success requires the RECORD stage to have fired correctly. We
  // tolerate upstream failures (they become training signal); we do NOT
  // tolerate failure to record (silent training-signal loss is unacceptable).
  const success = stages.record.status === STAGE_STATUS.OK;

  const summary = {
    pdf_path: job.pdf_path,
    part_class: job.part_class,
    stagesReached: STAGE_NAMES.filter((n) => stages[n].status !== STAGE_STATUS.SKIPPED).length,
    happyPath: event.payload.accurate,
    eventEmitted: stages.record.status === STAGE_STATUS.OK,
  };

  return { success, stages, event, summary };
}

/**
 * Build an `operator_correction` event payload from a manually-corrected
 * extraction. Surfaces the same shape the MS1 hook listens for on PostToolUse,
 * so an operator-correction-driver can emit events to the consumer pipeline
 * directly without going through Edit/Write/Bash tool calls.
 *
 * @param {{pdf_path: string, part_class: string, operator_id: string, extracted: object, corrected: object}} input
 * @param {{now?: () => string}} [opts]
 * @returns {object}
 */
export function buildOperatorCorrectionEvent(input, opts = {}) {
  if (!input || typeof input !== "object") {
    throw new Error("buildOperatorCorrectionEvent: input must be an object");
  }
  if (!input.pdf_path || !input.part_class || !input.operator_id) {
    throw new Error("buildOperatorCorrectionEvent: pdf_path + part_class + operator_id are required");
  }
  if (!input.extracted || !input.corrected) {
    throw new Error("buildOperatorCorrectionEvent: extracted + corrected must be present (the diff IS the signal)");
  }
  const now = typeof opts.now === "function" ? opts.now : () => new Date().toISOString();

  // Compute a tiny diff summary so consumers can route low-confidence cases
  // to xproc_replay_add. We don't try to be smart — just count differing keys.
  const extractedKeys = Object.keys(input.extracted);
  const correctedKeys = Object.keys(input.corrected);
  const allKeys = new Set([...extractedKeys, ...correctedKeys]);
  let differingKeyCount = 0;
  for (const k of allKeys) {
    const a = JSON.stringify(input.extracted[k]);
    const b = JSON.stringify(input.corrected[k]);
    if (a !== b) differingKeyCount += 1;
  }

  return {
    type: "outcome_record",
    ts: now(),
    payload: {
      kind: "operator_correction",
      pdf_path: input.pdf_path,
      part_class: input.part_class,
      operator_id: input.operator_id,
      extracted: input.extracted,
      corrected: input.corrected,
      differing_key_count: differingKeyCount,
      total_key_count: allKeys.size,
      accurate: differingKeyCount === 0,
    },
  };
}

/**
 * Aggregate a batch of pipeline results into a run-summary. Useful for cron
 * driver runs that process N prints per pass.
 *
 * @param {Array<{success: boolean, stages: object, event: object, summary: object}>} results
 * @returns {object}
 */
export function aggregateBatch(results) {
  const arr = Array.isArray(results) ? results : [];
  const out = {
    runCount: arr.length,
    successCount: 0,
    fullyHappyPathCount: 0,
    byStageStatus: {
      extract: { ok: 0, failed: 0, skipped: 0 },
      cad:     { ok: 0, failed: 0, skipped: 0 },
      cam:     { ok: 0, failed: 0, skipped: 0 },
      record:  { ok: 0, failed: 0, skipped: 0 },
    },
    partClasses: {},
  };
  for (const r of arr) {
    if (!r || typeof r !== "object") continue;
    if (r.success === true) out.successCount += 1;
    if (r.summary?.happyPath === true) out.fullyHappyPathCount += 1;
    for (const name of STAGE_NAMES) {
      const s = r.stages?.[name]?.status;
      if (s === STAGE_STATUS.OK) out.byStageStatus[name].ok += 1;
      else if (s === STAGE_STATUS.FAILED) out.byStageStatus[name].failed += 1;
      else if (s === STAGE_STATUS.SKIPPED) out.byStageStatus[name].skipped += 1;
    }
    const pc = r.summary?.part_class;
    if (typeof pc === "string") {
      out.partClasses[pc] = (out.partClasses[pc] ?? 0) + 1;
    }
  }
  return out;
}
