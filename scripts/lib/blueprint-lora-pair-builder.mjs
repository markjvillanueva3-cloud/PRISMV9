/**
 * blueprint-lora-pair-builder (U-BPA-LORA-PAIRS, slot:india)
 *
 * Closes predictions->outcomes->RETRAIN on the LoRA surface: turns the shared
 * blueprint-accuracy-events.jsonl ledger into BlueprintLoRABridgeEngine
 * `LoRATrainingPair[]`, so blueprint_lora_prepare_set can default its training
 * data from CONFIRMED ground-truth instead of requiring caller-supplied pairs.
 *
 * VERIFIED live-data distribution (2026-06-24): the ledger holds two row types --
 *   (A) {type:"outcome_record", payload:{extract_status:"failed", extraction:null,
 *       accurate:false, ...}}  = pipeline FAILURE TELEMETRY. extraction is null,
 *       so there is NO ground-truth value to learn -> EXCLUDED (untrainable).
 *   (B) {type:"operator_correction", payload:{pdf_path, drawing, part, part_class,
 *       failure_mode, extracted_wrong:{...}, operator_truth:{...}, lesson, ...}}
 *       = HUMAN-CONFIRMED ground truth -> the trainable signal.
 * India rule: only train on data whose label is trustworthy. operator_correction
 * rows (operator_verified tier) are the trustworthy signal today; the count is
 * small but the PIPE compounds as corrections accrue.
 *
 * Forward-compatible: a `type:"outcome_record"` row with payload.accurate===true
 * AND a populated payload.extraction is an operator-confirmed-correct extraction
 * (operator_verified tier) -- mapped too, for when the recordOutcome confirm-path
 * starts populating those. Unconfirmed (accurate:null) + failed (accurate:false)
 * rows are never trainable.
 *
 * Fail-soft: a missing/unreadable/empty ledger returns []. Pure + injectable.
 */
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parseEventsBlob } from "./blueprint-accuracy-consumer-lib.mjs";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
export const DEFAULT_EVENTS_FILE =
  process.env.PRISM_BPA_EVENTS_FILE ||
  join(REPO_ROOT, "state", "shared", "blueprint-accuracy-events.jsonl");

/** Valid LoRA confidence tiers (mirror of BlueprintLoRABridgeEngine LORA_CONFIDENCE_TIERS). */
export const LORA_TIERS = Object.freeze(["operator_verified", "ensemble_consensus", "single_backend"]);

function str(v) { return typeof v === "string" ? v : (v == null ? "" : String(v)); }

/**
 * Map a single confirmed ledger event to a LoRATrainingPair, or null if the row
 * is not trainable. `index` disambiguates the pairId.
 */
export function eventToPair(ev, index) {
  if (!ev || typeof ev !== "object") return null;
  const p = ev.payload || {};

  // (B) operator_correction -- human-confirmed ground truth.
  if (ev.type === "operator_correction") {
    if (!p.operator_truth || typeof p.operator_truth !== "object") return null; // no truth -> not trainable
    return {
      tier: "operator_verified",
      pair: {
        pairId: `lora:opcorr:${str(ev.ts) || index}:${index}`,
        customer: str(p.customer), // usually absent on corrections -> "" (engine anonymizes downstream)
        partNumber: str(p.drawing) || str(p.part),
        pdfPath: str(p.pdf_path),
        extractionType: str(p.part_class) || str(p.failure_mode) || "operator_correction",
        groundTruthValue: JSON.stringify(p.operator_truth),
        context: `lesson: ${str(p.lesson)} | wrong: ${JSON.stringify(p.extracted_wrong ?? null)}`,
      },
    };
  }

  // (A-confirmed) outcome_record with operator-confirmed-correct extraction.
  if (ev.type === "outcome_record" && p.accurate === true && p.extraction && typeof p.extraction === "object") {
    const ex = p.extraction;
    return {
      tier: "operator_verified",
      pair: {
        pairId: `lora:confirmed:${str(ev.ts) || index}:${index}`,
        customer: str(ex.customer ?? p.customer),
        partNumber: str(ex.partNumber ?? p.part_class),
        pdfPath: str(ex.pdfPath ?? p.pdf_path),
        extractionType: str(p.part_class) || "rag_extraction",
        groundTruthValue: JSON.stringify(ex.regions ?? ex),
        context: `confirmed-accurate extraction (floor: ${str(ex.confidenceFloor)})`,
      },
    };
  }

  // Everything else (accurate:false failure telemetry, accurate:null unconfirmed) -> not trainable.
  return null;
}

/**
 * Build LoRATrainingPair[] for a requested tier from the ledger.
 * @param {{tier?: string, eventsFile?: string, readImpl?: (p:string)=>string}} [opts]
 */
export function buildLoRAPairsFromLedger(opts = {}) {
  const eventsFile = opts.eventsFile || DEFAULT_EVENTS_FILE;
  const tier = LORA_TIERS.includes(opts.tier) ? opts.tier : "operator_verified";
  const read = opts.readImpl || ((p) => (existsSync(p) ? readFileSync(p, "utf8") : ""));
  let blob = "";
  try { blob = read(eventsFile); } catch { return []; } // fail-soft on I/O
  const { events } = parseEventsBlob(blob);
  const pairs = [];
  for (let i = 0; i < events.length; i += 1) {
    const mapped = eventToPair(events[i], i);
    if (mapped && mapped.tier === tier) pairs.push(mapped.pair);
  }
  return pairs;
}

/**
 * Resolve the training pairs for a `blueprint_lora_prepare_set` request
 * (U-BPA-LORA-PAIRS-WIRE).
 *
 * Caller-supplied `precomputedPairs[]` win (explicit override) -- but ONLY when
 * they are a NON-EMPTY array, mirroring the RAG `retrieveTribal` caller-override
 * convention (cadDispatcher ~L3404: "caller-supplied sources win"). An absent /
 * empty / non-array value falls back to the closed-loop ledger at the requested
 * tier, so the MCP LoRA path DEFAULTS its training data from CONFIRMED ground
 * truth instead of forcing the caller to assemble pairs by hand -- this closes
 * predictions->outcomes->RETRAIN on the LoRA surface (the third arrow that was
 * missing while the builder existed but was unwired to its consumer).
 *
 * Returns `{pairs, source, empty}` so the dispatcher can surface provenance
 * (R12: never silently swap the data source under the caller) AND loudly flag a
 * 0-pair ledger default. `empty` is true ONLY when the data was defaulted from
 * the ledger but no CONFIRMED ground truth exists at the requested tier yet
 * (e.g. `ensemble_consensus` / `single_backend` before any operator correction
 * accrues). A caller-supplied set is never flagged empty (the caller chose it).
 * The flag exists so a 0-pair ledger default is never silently mistaken for a
 * real training set and exported as an empty bundle.
 *
 * @param {{precomputedPairs?: unknown, tier?: string, buildImpl?: (o:object)=>unknown[], eventsFile?: string}} [opts]
 * @returns {{pairs: object[], source: "caller" | "ledger", empty: boolean}}
 */
export function resolveLoRATrainingPairs(opts = {}) {
  const { precomputedPairs, tier, buildImpl, eventsFile } = opts;
  if (Array.isArray(precomputedPairs) && precomputedPairs.length > 0) {
    return { pairs: precomputedPairs, source: "caller", empty: false };
  }
  const build = typeof buildImpl === "function" ? buildImpl : buildLoRAPairsFromLedger;
  const built = build({ tier, eventsFile });
  const pairs = Array.isArray(built) ? built : [];
  return { pairs, source: "ledger", empty: pairs.length === 0 };
}
