/**
 * DocumentExtractionContract -- the VERSIONED, app-facing shape of a NON-blueprint document extraction
 * (office docs / catalogs / manuals / setup sheets / spec docs / image OCR).
 *
 * WHY (blueprint-extraction-consumer-application-map-2026-06-24, section 3): the blueprint path is wired
 * (BlueprintExtractionContract + blueprintExtractionRouter -> 13 feature consumers), but the
 * DOCUMENT-reading path systematically DEAD-ENDS -- office/OCR extraction of speeds/feeds/tool-codes/
 * materials/procedures reaches the engines (OfficeDocumentPipelineEngine, ImageOCRPipelineEngine,
 * documentLearningDispatcher) but never reaches a consumer (tool-crib / SFC / tribal-knowledge / academy /
 * LoRA training). The keystone for closing that class is THIS contract: the one stable, versioned shape a
 * document consumer binds to -- the sibling of BlueprintExtractionContract for unstructured documents.
 * `documentExtractionRouter` (next unit) fans a validated contract to those consumers.
 *
 * NORMALIZER: `normalizeOfficeExtractToContract` maps the live
 * `OfficeDocumentPipelineEngine.ExtractionResult.extractedData` ({speeds, feeds, toolCodes, partNumbers,
 * materials}: string[][]) into typed `DocEntry[]`. That extraction is REGEX-heuristic (no per-entry
 * confidence), so each entry is assigned a documented sub-floor default confidence -> needs_confirm, i.e.
 * a regex-matched tool code NEVER auto-feeds a consumer without operator confirmation (R12 -- honest about
 * regex reliability, the same human-in-the-loop discipline the blueprint per-field 0.70 floor enforces).
 *
 * @module schemas/DocumentExtractionContract
 * @since   U-XRAY-DOCUMENT-EXTRACT-CONTRACT (2026-06-24, slot xray)
 */

import { z } from "zod";

// ============================================================================
// CONSTANTS
// ============================================================================

export const DOCUMENT_EXTRACTION_CONTRACT_VERSION = "1.0.0";

/** Per-entry operator-confirm floor: an entry below this REQUIRES operator confirmation before any
 * downstream (tool-crib register / SFC / tribal capture) consumption. Mirrors the blueprint 0.70 floor.
 * An OCR/extraction confidence THRESHOLD, not a physics constant (the no-inline-physics rule governs
 * Kienzle/Taylor/material values only). */
export const DOC_PER_FIELD_CONFIRM_FLOOR = 0.7;

/** Default confidence assigned to a REGEX-extracted office entry (no per-entry confidence from the
 * producer). Deliberately BELOW the confirm floor -> every regex match routes to operator-confirm, never
 * silently trusted (R12). The producer's loose toolCode/partNumber patterns over-match; confirmation is
 * mandatory before a consumer acts on them. */
export const OFFICE_REGEX_DEFAULT_CONFIDENCE = 0.6;

/** Known document-entry kinds the router can route. `kind` is an open string (a future producer may emit
 * a new kind) but these are the routable vocabulary; an unknown kind is preserved + routed to no consumer. */
export const DOC_ENTRY_KINDS = [
  "speed",
  "feed",
  "tool_code",
  "part_number",
  "material",
  "procedure",
  "measurement",
  "tolerance",
  "note",
] as const;
export type DocEntryKind = (typeof DOC_ENTRY_KINDS)[number];

/** Document classification (best-effort; drives router doc-type gating). */
export const DOC_TYPES = ["office", "catalog", "manual", "setup_sheet", "spec", "ocr", "unknown"] as const;
export type DocType = (typeof DOC_TYPES)[number];

// ============================================================================
// ZOD SCHEMAS
// ============================================================================

export const docEntrySchema = z
  .object({
    kind: z.string().describe("entry kind (speed|feed|tool_code|part_number|material|procedure|...); open vocabulary"),
    value: z.string().describe("the extracted value text (e.g. '1200 rpm', 'CNMG432', '4140')"),
    confidence: z.number().min(0).max(1).describe("per-entry extraction confidence [0,1]"),
    needs_confirm: z.boolean().describe("true when confidence < confirm_floor -> operator MUST confirm before downstream use"),
  })
  .describe("one extracted document fact with trust metadata");

export const docSummarySchema = z
  .object({
    n_entries: z.number().int().nonnegative(),
    n_needs_confirm: z.number().int().nonnegative().describe("entries below the confirm floor"),
    by_kind: z.record(z.string(), z.number().int().nonnegative()).describe("entry count per kind (routing pre-aggregate)"),
  })
  .describe("rollup counts for the app trust banner + the router");

export const documentExtractionContractSchema = z
  .object({
    schemaVersion: z.literal(DOCUMENT_EXTRACTION_CONTRACT_VERSION),
    source: z.string().optional().describe("document path / SHA provenance"),
    doc_type: z.string().describe("document classification (office|catalog|manual|setup_sheet|spec|ocr|unknown)"),
    // `.default([])` so a contract that round-tripped through a response slimmer (which drops empty
    // arrays) re-parses cleanly -- an absent entries array means "none extracted", not an invalid contract.
    entries: z.array(docEntrySchema).default([]),
    confirm_floor: z.number().min(0).max(1).describe("the per-entry confidence floor used to compute needs_confirm"),
    summary: docSummarySchema,
  })
  .describe("versioned document extraction contract -- the stable shape document-feature consumers bind to");

// ============================================================================
// INFERRED TYPES
// ============================================================================

export type DocumentExtractionContract = z.infer<typeof documentExtractionContractSchema>;
export type DocEntry = z.infer<typeof docEntrySchema>;

// ============================================================================
// NORMALIZER + VALIDATOR
// ============================================================================

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return n < 0 ? 0 : n > 1 ? 1 : n;
}

/** the office producer's 5 array fields -> their canonical DocEntry kind. */
const OFFICE_FIELD_TO_KIND: Record<string, DocEntryKind> = {
  speeds: "speed",
  feeds: "feed",
  toolCodes: "tool_code",
  partNumbers: "part_number",
  materials: "material",
};

/** the image-OCR producer's 5 array fields -> DocEntry kind. `numbers`/`dates` are preserved (no data
 * loss) but route to no consumer (they are not a routable manufacturing fact). */
const OCR_FIELD_TO_KIND: Record<string, string> = {
  measurements: "measurement",
  toolCodes: "tool_code",
  partNumbers: "part_number",
  numbers: "number",
  dates: "date",
};

/**
 * Build deduped, blank-stripped DocEntries from a `{field: string[]}` producer object using a field->kind
 * map + a uniform confidence. Shared by every producer normalizer (R8 -- the entry-building shape lives
 * in ONE place). Pure + total (non-array fields -> skipped).
 */
function buildEntriesFromArrays(
  data: Record<string, unknown>,
  fieldToKind: Record<string, string>,
  confidence: number,
  needsConfirm: boolean,
): DocEntry[] {
  const entries: DocEntry[] = [];
  for (const [field, kind] of Object.entries(fieldToKind)) {
    const arr = Array.isArray(data[field]) ? (data[field] as unknown[]) : [];
    const seen = new Set<string>();
    for (const v of arr) {
      const value = typeof v === "string" ? v.trim() : "";
      if (!value || seen.has(value)) continue; // drop blanks + within-kind duplicates
      seen.add(value);
      entries.push({ kind, value, confidence, needs_confirm: needsConfirm });
    }
  }
  return entries;
}

interface NormalizeOpts {
  /** override the per-entry confidence floor (default DOC_PER_FIELD_CONFIRM_FLOOR). */
  confirmFloor?: number;
  /** override the default confidence for regex-extracted entries (default OFFICE_REGEX_DEFAULT_CONFIDENCE). */
  entryConfidence?: number;
  source?: string;
  docType?: string;
}

/** Build the summary rollup (needs_confirm count + per-kind counts) from typed entries. Pure. */
function finalizeDocContract(
  entries: DocEntry[],
  opts: { confirmFloor: number; source?: string; docType: string },
): DocumentExtractionContract {
  const by_kind: Record<string, number> = {};
  for (const e of entries) by_kind[e.kind] = (by_kind[e.kind] ?? 0) + 1;
  const contract: DocumentExtractionContract = {
    schemaVersion: DOCUMENT_EXTRACTION_CONTRACT_VERSION,
    doc_type: opts.docType,
    entries,
    confirm_floor: opts.confirmFloor,
    summary: {
      n_entries: entries.length,
      n_needs_confirm: entries.filter((e) => e.needs_confirm).length,
      by_kind,
    },
  };
  if (opts.source) contract.source = opts.source;
  return contract;
}

/**
 * Map an `OfficeDocumentPipelineEngine.ExtractionResult` (or its `.extractedData`) into the versioned
 * contract. Pure -- no I/O. Each regex-extracted value becomes a typed `DocEntry` with a documented
 * sub-floor default confidence (-> needs_confirm), because office regex extraction is heuristic and must
 * be operator-confirmed before a consumer acts on it. Blank/duplicate values within a kind are dropped.
 *
 * Accepts either the full `ExtractionResult` (reads `.extractedData` + `.metadata.path`) or a bare
 * `extractedData` object (the 5 string[] fields).
 */
export function normalizeOfficeExtractToContract(extraction: unknown, opts: NormalizeOpts = {}): DocumentExtractionContract {
  const floor = Number.isFinite(opts.confirmFloor as number) ? (opts.confirmFloor as number) : DOC_PER_FIELD_CONFIRM_FLOOR;
  const conf = clamp01(Number.isFinite(opts.entryConfidence as number) ? (opts.entryConfidence as number) : OFFICE_REGEX_DEFAULT_CONFIDENCE);
  const needsConfirm = conf < floor;

  const e = (extraction && typeof extraction === "object" ? extraction : {}) as Record<string, any>;
  // accept the full ExtractionResult (.extractedData) OR a bare extractedData object
  const data = (e.extractedData && typeof e.extractedData === "object" ? e.extractedData : e) as Record<string, unknown>;
  const source = opts.source || (e.metadata && typeof e.metadata.path === "string" ? (e.metadata.path as string) : undefined);

  const entries = buildEntriesFromArrays(data, OFFICE_FIELD_TO_KIND, conf, needsConfirm);

  return finalizeDocContract(entries, {
    confirmFloor: floor,
    source,
    docType: opts.docType || "office",
  });
}

/**
 * Map an `ImageOCRPipelineEngine.OCRResult` (or its `.extractedData`) into the versioned contract. Pure --
 * no I/O. Unlike office regex, an OCR result carries a real per-result `confidence`, so each entry takes
 * THAT confidence (operator-confirm follows the same floor). measurements/toolCodes/partNumbers map to
 * their canonical kinds; numbers/dates are preserved but unrouted (not a routable manufacturing fact).
 *
 * Accepts either the full `OCRResult` (reads `.extractedData` + `.confidence` + `.imagePath`) or a bare
 * `extractedData` object (then `opts.entryConfidence` or the default applies).
 */
export function normalizeOcrExtractToContract(ocr: unknown, opts: NormalizeOpts = {}): DocumentExtractionContract {
  const floor = Number.isFinite(opts.confirmFloor as number) ? (opts.confirmFloor as number) : DOC_PER_FIELD_CONFIRM_FLOOR;
  const o = (ocr && typeof ocr === "object" ? ocr : {}) as Record<string, any>;
  const data = (o.extractedData && typeof o.extractedData === "object" ? o.extractedData : o) as Record<string, unknown>;
  // confidence priority: explicit opt > the OCR result's own confidence > the regex default floor-miss
  const conf = clamp01(
    Number.isFinite(opts.entryConfidence as number)
      ? (opts.entryConfidence as number)
      : typeof o.confidence === "number" && Number.isFinite(o.confidence)
        ? o.confidence
        : OFFICE_REGEX_DEFAULT_CONFIDENCE,
  );
  const needsConfirm = conf < floor;
  const source = opts.source || (typeof o.imagePath === "string" ? (o.imagePath as string) : undefined);

  const entries = buildEntriesFromArrays(data, OCR_FIELD_TO_KIND, conf, needsConfirm);

  return finalizeDocContract(entries, {
    confirmFloor: floor,
    source,
    docType: opts.docType || "ocr",
  });
}

/** A procedure-like signal in a learned tip's category/title -> DocEntry kind "procedure" (else "note").
 * Both kinds route ONLY to tribal_capture, so the distinction is semantic, not routing-affecting. */
const DOCLEARN_PROCEDURE_HINT = /\b(procedure|process|setup|step|how[- ]?to|instruction|operation|sequence)\b/i;

/**
 * Map a documentLearning `ContentIngestionPipelineEngine.IngestionResult` (or its `.items[]`, or a bare
 * `IngestionItem[]`) into the versioned contract. Pure -- no I/O. Each learned tip
 * (`{title, body, category, confidence}`) becomes a `procedure`/`note` DocEntry that carries the tip's OWN
 * confidence -- unlike office regex, documentLearning items have a real per-item confidence, so a
 * high-confidence learned tip can reach `tribal_capture` without operator-confirm while a low-confidence
 * one is gated. `value` = "title: body" (or whichever is present). Blank/duplicate values are dropped.
 *
 * Closes the "DocumentLearningPage -> tribal-knowledge" dead-end (consumer-application-map section 3:
 * "More producer normalizers ... documentLearning DocRecord").
 */
export function normalizeDocLearningToContract(ingestion: unknown, opts: NormalizeOpts = {}): DocumentExtractionContract {
  const floor = Number.isFinite(opts.confirmFloor as number) ? (opts.confirmFloor as number) : DOC_PER_FIELD_CONFIRM_FLOOR;
  const g = (ingestion && typeof ingestion === "object" ? ingestion : {}) as Record<string, any>;
  // accept the full IngestionResult (.items[]) OR a bare items array
  const items: unknown[] = Array.isArray(g.items) ? g.items : Array.isArray(ingestion) ? (ingestion as unknown[]) : [];
  const entries: DocEntry[] = [];
  const seen = new Set<string>();
  for (const raw of items) {
    if (!raw || typeof raw !== "object") continue;
    const it = raw as Record<string, unknown>;
    const title = typeof it.title === "string" ? it.title.trim() : "";
    const body = typeof it.body === "string" ? it.body.trim() : "";
    const value = title && body ? `${title}: ${body}` : title || body;
    if (!value || seen.has(value)) continue; // drop blanks + duplicates
    seen.add(value);
    const conf = clamp01(
      typeof it.confidence === "number" && Number.isFinite(it.confidence) ? (it.confidence as number) : OFFICE_REGEX_DEFAULT_CONFIDENCE,
    );
    const cat = typeof it.category === "string" ? it.category : "";
    const kind: DocEntryKind = DOCLEARN_PROCEDURE_HINT.test(cat) || DOCLEARN_PROCEDURE_HINT.test(title) ? "procedure" : "note";
    entries.push({ kind, value, confidence: conf, needs_confirm: conf < floor });
  }
  const source = opts.source || (typeof g.source_attribution === "string" ? (g.source_attribution as string) : undefined);
  return finalizeDocContract(entries, { confirmFloor: floor, source, docType: opts.docType || "manual" });
}

export interface DocContractValidation {
  ok: boolean;
  data?: DocumentExtractionContract;
  errors?: string[];
}

/** Validate an object against the contract. Returns {ok, data} or {ok:false, errors[]} (never throws). */
export function validateDocumentExtractionContract(obj: unknown): DocContractValidation {
  const res = documentExtractionContractSchema.safeParse(obj);
  if (res.success) return { ok: true, data: res.data };
  return { ok: false, errors: res.error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`) };
}
