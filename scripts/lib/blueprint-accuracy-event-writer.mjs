// blueprint-accuracy-event-writer.mjs -- canonical WRITER for the blueprint
// closed-loop ledger (state/shared/blueprint-accuracy-events.jsonl).
//
// This is the write-side counterpart to blueprint-accuracy-consumer-lib.mjs
// (the read-side). Until now there was NO canonical builder/appender: the
// outcome-event SHAPE was built inline in training-driver-lib runPipeline
// (Stage D) and the ledger APPEND was duplicated inline in
// harvest-prints-to-training.mjs (makeStubAdapters + makeLiveAdapters both
// carry an identical recordEvent). This lib consolidates both (R8 build-once)
// and adds the missing piece needed to close the MCP-path RAG-extraction loop:
// a builder that turns a BlueprintExtractionRAGEngine `BlueprintExtraction`
// (regions[]/sources[]/confidenceFloor) into a correctly-typed outcome_record
// event the consumer routes to xproc_outcome_record (NOT the unknown bucket).
//
// WHY a distinct `kind:"rag_extraction"`: the live ledger's existing
// outcome_record rows embed the VISION-OCR extraction shape
// (payload.extraction.dimensions[]/gdt[]), which aggregate-extractions-to-template
// mines. A RAG `BlueprintExtraction` is a DIFFERENT shape (regions[]). Tagging
// the kind keeps the two distinguishable so the template aggregator can tell a
// RAG row from a vision row instead of mis-mining it.
//
// WHY accurate:null on a RAG row: a RAG extraction is an UNCONFIRMED prediction
// emitted for "later operator-confirmation pairing" (engine step 9 docstring).
// It is not a clean-run boolean like the pipeline path -- accurate stays null
// until an operator_correction event pairs against it. The consumer treats it
// as an outcome_record regardless (it counts + windows + bumps the consolidate
// counter), so the prediction still drives the retrain loop.
//
// @slot india  @scope CAD-LEARNING-AI  @unit U-BPA-EVENT-WRITER-LIB

import { appendFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

/**
 * Canonical ledger path. Mirrors the resolution used by the consumer + every
 * existing driver: PRISM_BPA_EVENTS_FILE override, else the shared ledger.
 */
export const DEFAULT_EVENTS_FILE =
  process.env.PRISM_BPA_EVENTS_FILE || join(REPO_ROOT, "state", "shared", "blueprint-accuracy-events.jsonl");

/** Mean of an array of region confidences, NaN-safe; 0 for an empty array. */
function meanRegionConfidence(regions) {
  if (!Array.isArray(regions) || regions.length === 0) return 0;
  let sum = 0;
  let n = 0;
  for (const r of regions) {
    const c = Number(r && r.confidence);
    if (Number.isFinite(c)) {
      sum += c;
      n += 1;
    }
  }
  return n > 0 ? sum / n : 0;
}

/**
 * Build a canonical `outcome_record` event from a RAG `BlueprintExtraction`.
 *
 * Pure (no I/O). The full extraction is embedded under payload.extraction so
 * the U-TDP03-class aggregator/miner can mine it; the summary fields
 * (region_count / confidence_floor / extraction_confidence / sources_cited)
 * let a consumer route or filter without re-walking the nested object.
 *
 * @param {object} extraction -- a BlueprintExtraction (extractionId, pdfPath,
 *   page, customer?, familyMatchId, regions[], sources[], confidenceFloor,
 *   contradictionsDetected[], backendId)
 * @param {{ now?: () => string }} [opts]
 * @returns {{ type: "outcome_record", ts: string, payload: object }}
 */
export function buildExtractionOutcomeEvent(extraction, opts = {}) {
  if (!extraction || typeof extraction !== "object") {
    throw new Error("buildExtractionOutcomeEvent: extraction must be an object");
  }
  if (typeof extraction.pdfPath !== "string" || extraction.pdfPath.length === 0) {
    throw new Error("buildExtractionOutcomeEvent: extraction.pdfPath is required");
  }
  if (typeof extraction.extractionId !== "string" || extraction.extractionId.length === 0) {
    throw new Error("buildExtractionOutcomeEvent: extraction.extractionId is required");
  }
  const now = typeof opts.now === "function" ? opts.now : () => new Date().toISOString();
  const regions = Array.isArray(extraction.regions) ? extraction.regions : [];
  const sources = Array.isArray(extraction.sources) ? extraction.sources : [];

  return {
    type: "outcome_record",
    ts: now(),
    payload: {
      kind: "rag_extraction",
      pdf_path: extraction.pdfPath,
      page: Number.isInteger(extraction.page) ? extraction.page : null,
      customer: typeof extraction.customer === "string" ? extraction.customer : null,
      backend_id: typeof extraction.backendId === "string" ? extraction.backendId : null,
      extraction_id: extraction.extractionId,
      family_match_id: extraction.familyMatchId ?? null,
      region_count: regions.length,
      source_count: sources.length,
      // HARD-RULE mirror: a RAG extraction must cite >=1 source OR carry a
      // non-normal confidenceFloor. sources_cited surfaces which side held.
      sources_cited: sources.length > 0,
      confidence_floor: typeof extraction.confidenceFloor === "string" ? extraction.confidenceFloor : null,
      contradictions_detected: Array.isArray(extraction.contradictionsDetected)
        ? extraction.contradictionsDetected.length
        : 0,
      extraction_confidence: meanRegionConfidence(regions),
      // Full extraction embedded for the dimension/feature/tolerance miner.
      extraction,
      // Unconfirmed prediction -- pending operator-correction pairing (not a
      // clean-run boolean like the pipeline path).
      accurate: null,
    },
  };
}

/**
 * Canonical atomic appender to the blueprint-accuracy ledger. Consolidates the
 * inline recordEvent impls duplicated across the training drivers.
 *
 * Fail-LOUD on a malformed event (throws -- never silently writes garbage that
 * the consumer would drop). Fail-SOFT on an I/O error (returns
 * {success:false,error}) so it is a drop-in for the existing recordEvent
 * adapters, which tolerate a write failure as a recorded-but-degraded outcome.
 *
 * @param {object} event -- an event with a string `type` (and ideally ts/payload)
 * @param {{ path?: string }} [opts]
 * @returns {{ success: true, written_to: string } | { success: false, error: string }}
 */
export function appendAccuracyEvent(event, opts = {}) {
  if (!event || typeof event !== "object" || typeof event.type !== "string" || event.type.length === 0) {
    throw new Error("appendAccuracyEvent: event must be an object with a non-empty string `type`");
  }
  const path = typeof opts.path === "string" && opts.path.length > 0 ? opts.path : DEFAULT_EVENTS_FILE;
  try {
    const dir = dirname(path);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    appendFileSync(path, JSON.stringify(event) + "\n");
    return { success: true, written_to: path };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * Convenience: build a RAG-extraction outcome event and append it in one call.
 * This is the exact shape a recordOutcome IO wiring (engine step 9 / MCP
 * dispatcher) needs: `recordOutcome: async (ext) => recordExtractionOutcome(ext)`.
 *
 * @param {object} extraction
 * @param {{ now?: () => string, path?: string }} [opts]
 * @returns {{ success: boolean, written_to?: string, error?: string, event: object }}
 */
export function recordExtractionOutcome(extraction, opts = {}) {
  const event = buildExtractionOutcomeEvent(extraction, opts);
  const res = appendAccuracyEvent(event, opts);
  return { ...res, event };
}
