/**
 * BlueprintExtractionContract -- the VERSIONED, app-facing shape of a blueprint OCR extraction.
 *
 * WHY (the app-integration keystone, blueprint-vision-app-integration-plan-2026-06-23): the
 * blueprint-vision backend is mature (VLM-ensemble OCR -> fused dims/gd&t/notes), but the app stops
 * at "file uploaded" and every consumer (the upload->extract route, the quote autopopulate, the
 * drawing-view panel) needs ONE stable JSON shape to bind to. This module is xray's cross-phase
 * deliverable: the contract every app consumer reads, VERSIONED so a producer change can never
 * silently break a consumer (a schemaVersion bump + migration is forced instead). The producer side
 * (drawing_extract route) is owned by papa/quebec per the plan; xray owns THIS contract.
 *
 * NORMALIZER: `normalizeFusedToContract` maps the live `fuseEnsemble` output
 * (scripts/lib/vision-ensemble-fuse.mjs: {dimensions, gdt, notes, profiles, surface_finishes,
 * summary}) into this contract, attaching the per-field operator-confirm flag. The fuse's per-dim
 * `agreement_confidence` (noisy-OR ensemble agreement) IS the contract `confidence`.
 *
 * @module schemas/BlueprintExtractionContract
 * @since   U-XRAY-EXTRACTION-CONTRACT (2026-06-23, slot xray)
 */

import { z } from "zod";

// ============================================================================
// CONSTANTS
// ============================================================================

export const BLUEPRINT_EXTRACTION_CONTRACT_VERSION = "1.0.0";

/**
 * OCR per-field operator-confirm floor: a field whose confidence is below this REQUIRES operator
 * confirmation before any downstream (quote / program / inspection) consumption. Verified-shipped
 * value 0.70 (PRINT-TO-INSPECTION-PIPELINE-V2; [[reference_xray_confidence_thresholds_reconciled]]).
 * This is an OCR confidence THRESHOLD, not a physics constant -- it correctly lives with the contract,
 * NOT in src/physics/constants.ts (the no-inline-physics-constants rule governs physics values only).
 */
export const OCR_PER_FIELD_CONFIRM_FLOOR = 0.70;

/** Inch->mm conversion (unit conversion, NOT a physics constant -- the no-inline-physics rule governs
 * Kienzle/Taylor/material values only). Used to normalize CAD-drawing dims that carry their own inch unit. */
const MM_PER_INCH = 25.4;

// ============================================================================
// ZOD SCHEMAS
// ============================================================================

export const dimensionStatusEnum = z
  .enum(["corroborated", "partial", "singleton", "unknown"])
  .describe("ensemble corroboration status: corroborated=>=quorum models agree; singleton=1 model; partial=between");

export const contractDimensionSchema = z
  .object({
    value_mm: z.number().describe("dimension value in canonical millimetres (PRISM internal unit)"),
    type: z.string().describe("dimension type (linear|diameter|radius|angular|...); 'unknown' if unresolved"),
    confidence: z.number().min(0).max(1).describe("per-field extraction confidence [0,1] (ensemble noisy-OR agreement)"),
    needs_confirm: z.boolean().describe("true when confidence < confirm_floor OR hallucination_candidate (single-model) -> operator MUST confirm before downstream use"),
    status: dimensionStatusEnum,
    hallucination_candidate: z.boolean().describe("seen by only 1 of >=2 models -> low trust"),
  })
  .describe("one extracted dimension with trust metadata");

export const contractCalloutSchema = z
  .object({
    value: z.string().describe("the callout text (GD&T FCF / note / profile / surface-finish symbol)"),
    confidence: z.number().min(0).max(1).describe("per-field extraction confidence [0,1]"),
    needs_confirm: z.boolean().describe("true when confidence < confirm_floor OR hallucination_candidate (single-model)"),
    hallucination_candidate: z.boolean().describe("seen by only 1 of >=2 models"),
  })
  .describe("one non-dimensional callout (gdt / note / profile / surface_finish)");

export const titleBlockSchema = z
  .object({
    customer: z.string().optional().describe("customer / company name (redaction target)"),
    part_number: z.string().optional(),
    material: z.string().optional(),
    revision: z.string().optional(),
    units: z.string().optional().describe("title-block declared units (in / mm)"),
  })
  .catchall(z.unknown())
  .describe("title-block fields (best-effort; catchall preserves unknown keys)");

export const contractSummarySchema = z
  .object({
    n_dimensions: z.number().int().nonnegative(),
    n_needs_confirm: z.number().int().nonnegative().describe("total fields (dims + callouts) below the confirm floor OR flagged hallucination_candidate"),
    n_corroborated: z.number().int().nonnegative().describe("dims with status=corroborated (>=quorum models)"),
    n_gdt: z.number().int().nonnegative(),
    n_notes: z.number().int().nonnegative(),
    n_profiles: z.number().int().nonnegative(),
    n_surface_finishes: z.number().int().nonnegative(),
    n_models: z.number().int().nonnegative().describe("VLM ensemble depth that produced this extraction"),
  })
  .describe("rollup counts for the app trust banner");

export const blueprintExtractionContractSchema = z
  .object({
    schemaVersion: z.literal(BLUEPRINT_EXTRACTION_CONTRACT_VERSION),
    units: z.literal("mm").describe("all dimensions are millimetres (PRISM internal unit; normalize at the extraction boundary)"),
    source: z.string().optional().describe("print path / SHA provenance"),
    // `.default([])` so a contract that round-tripped through a response slimmer (which drops empty
    // arrays) re-parses cleanly -- an absent array means "none extracted", not an invalid contract.
    // The output type stays `T[]` (a present array is used as-is); this only relaxes the INPUT.
    dimensions: z.array(contractDimensionSchema).default([]),
    gdt: z.array(contractCalloutSchema).default([]),
    notes: z.array(contractCalloutSchema).default([]),
    profiles: z.array(contractCalloutSchema).default([]),
    surface_finishes: z.array(contractCalloutSchema).default([]),
    title_block: titleBlockSchema.optional(),
    confirm_floor: z.number().min(0).max(1).describe("the per-field confidence floor used to compute needs_confirm"),
    summary: contractSummarySchema,
  })
  .describe("versioned blueprint extraction contract -- the stable shape app consumers bind to");

// ============================================================================
// INFERRED TYPES
// ============================================================================

export type BlueprintExtractionContract = z.infer<typeof blueprintExtractionContractSchema>;
export type ContractDimension = z.infer<typeof contractDimensionSchema>;
export type ContractCallout = z.infer<typeof contractCalloutSchema>;
export type ContractTitleBlock = z.infer<typeof titleBlockSchema>;

// ============================================================================
// NORMALIZER + VALIDATOR
// ============================================================================

const STATUS_VALUES = new Set(["corroborated", "partial", "singleton", "unknown"]);

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return n < 0 ? 0 : n > 1 ? 1 : n;
}

/** First finite number among the args (per-field confidence may be `agreement_confidence` or `confidence`). */
function firstNum(...vals: unknown[]): number {
  for (const v of vals) if (typeof v === "number" && Number.isFinite(v)) return v;
  return 0;
}

/**
 * Extract a string callout from a non-dim field object. Field names match the REAL producer reps
 * (scripts/lib/ollama-vision-extract-lib.mjs): gdt -> `raw_text` (full FCF) | `symbol`;
 * notes -> `text`; profiles -> `name`; surface_finishes -> `raw_text`. `raw_text` is searched FIRST so
 * a GD&T callout keeps its full feature-control-frame ("|POS|0.05|A|") rather than the bare symbol.
 */
function calloutText(c: Record<string, unknown>): string {
  for (const k of ["raw_text", "value", "text", "fcf", "callout", "symbol", "name", "note"]) {
    const v = c[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

/**
 * Per-callout confidence. The producer emits an explicit `confidence` only for gdt + profiles; notes +
 * surface_finishes carry NONE (extractNote/extractSurfaceFinish). For those, the fuse still attaches
 * `corroboration` + `n_models`, so use the agreement FRACTION (how many of the ensemble independently
 * saw the callout) as the honest trust proxy -- NOT a hardcoded 0, which would mark every real note as
 * needs_confirm. Explicit > 0 always wins.
 */
function calloutConfidence(c: Record<string, unknown>): number {
  const explicit = firstNum(c.agreement_confidence, c.confidence);
  if (explicit > 0) return clamp01(explicit);
  const corr = typeof c.corroboration === "number" ? c.corroboration : 0;
  const nm = typeof c.n_models === "number" ? c.n_models : 0;
  return nm > 0 ? clamp01(corr / nm) : 0;
}

interface NormalizeOpts {
  confirmFloor?: number;
  source?: string;
  titleBlock?: Record<string, unknown>;
}

interface FinalizeOpts {
  confirmFloor: number;
  source?: string;
  titleBlock?: Record<string, unknown>;
  nModels: number;
}

/**
 * Assemble the versioned contract from already-mapped typed arrays + roll up the summary
 * (needs_confirm count spans dims AND callouts; n_corroborated counts status==='corroborated').
 * Shared by every producer-specific normalizer so the envelope/summary shape lives in ONE place
 * (R8 -- a producer change can never drift the rollup). Pure -- no I/O.
 */
function finalizeContract(
  dimensions: ContractDimension[],
  gdt: ContractCallout[],
  notes: ContractCallout[],
  profiles: ContractCallout[],
  surface_finishes: ContractCallout[],
  opts: FinalizeOpts,
): BlueprintExtractionContract {
  const allCallouts = [...gdt, ...notes, ...profiles, ...surface_finishes];
  const nNeedsConfirm = dimensions.filter((d) => d.needs_confirm).length + allCallouts.filter((c) => c.needs_confirm).length;

  const contract: BlueprintExtractionContract = {
    schemaVersion: BLUEPRINT_EXTRACTION_CONTRACT_VERSION,
    units: "mm",
    dimensions,
    gdt,
    notes,
    profiles,
    surface_finishes,
    confirm_floor: opts.confirmFloor,
    summary: {
      n_dimensions: dimensions.length,
      n_needs_confirm: nNeedsConfirm,
      n_corroborated: dimensions.filter((d) => d.status === "corroborated").length,
      n_gdt: gdt.length,
      n_notes: notes.length,
      n_profiles: profiles.length,
      n_surface_finishes: surface_finishes.length,
      n_models: opts.nModels,
    },
  };
  if (opts.source) contract.source = opts.source;
  if (opts.titleBlock && typeof opts.titleBlock === "object") contract.title_block = opts.titleBlock as ContractTitleBlock;
  return contract;
}

/**
 * Map a `fuseEnsemble` output object into the versioned contract. Pure -- no I/O. The fuse's per-dim
 * `agreement_confidence` becomes `confidence`; `needs_confirm = confidence < confirmFloor || hallucination_candidate`
 * (a single-model dim is low cross-model trust and must reach the operator gate regardless of its self-confidence).
 * Dims with a non-finite value_mm are dropped (never emit an unusable dimension to a consumer).
 */
export function normalizeFusedToContract(fused: unknown, opts: NormalizeOpts = {}): BlueprintExtractionContract {
  const floor = Number.isFinite(opts.confirmFloor as number) ? (opts.confirmFloor as number) : OCR_PER_FIELD_CONFIRM_FLOOR;
  const f = (fused && typeof fused === "object" ? fused : {}) as Record<string, any>;

  const dimensions: ContractDimension[] = (Array.isArray(f.dimensions) ? f.dimensions : [])
    .map((d: Record<string, unknown>) => {
      const confidence = clamp01(firstNum(d.agreement_confidence, d.confidence));
      const status = STATUS_VALUES.has(d.status as string) ? (d.status as ContractDimension["status"]) : "unknown";
      // A dim only ONE model saw (hallucination_candidate) is low cross-model trust REGARDLESS of its
      // single-model self-confidence (a singleton's agreement_confidence is a default ~0.9, NOT corroboration)
      // -> it MUST reach the operator gate. needs_confirm therefore honors the ensemble's hallucination flag,
      // not just the confidence floor (else 38/40 single-model dims on a real print pass as "confirmed").
      const hallucination_candidate = Boolean(d.hallucination_candidate);
      return {
        value_mm: Number(d.value_mm),
        type: typeof d.type === "string" ? (d.type as string) : "unknown",
        confidence,
        needs_confirm: confidence < floor || hallucination_candidate,
        status,
        hallucination_candidate,
      };
    })
    .filter((d: ContractDimension) => Number.isFinite(d.value_mm));

  const mapCallouts = (arr: unknown): ContractCallout[] =>
    (Array.isArray(arr) ? arr : []).map((c: Record<string, unknown>) => {
      const confidence = calloutConfidence(c);
      const hallucination_candidate = Boolean(c.hallucination_candidate);
      return {
        value: calloutText(c),
        confidence,
        // same rule as dims: a single-model (hallucination_candidate) callout is operator-gated regardless
        // of its self-confidence -- the ensemble's low-trust flag must reach needs_confirm, not stay inert.
        needs_confirm: confidence < floor || hallucination_candidate,
        hallucination_candidate,
      };
    });

  return finalizeContract(
    dimensions,
    mapCallouts(f.gdt),
    mapCallouts(f.notes),
    mapCallouts(f.profiles),
    mapCallouts(f.surface_finishes),
    {
      confirmFloor: floor,
      source: opts.source,
      titleBlock: (opts.titleBlock || f.title_block) as Record<string, unknown> | undefined,
      nModels: firstNum(f.summary?.n_models),
    },
  );
}

/**
 * Loose structural type for `Drawing2DExtractionEngine.ExtractionResult` (the `drawing_extract`
 * dispatcher producer). Each `Dimension` carries its OWN `unit` ('mm'|'in') and a raw `value` --
 * NOT a pre-normalized `value_mm` -- so this is a DISTINCT producer shape from the VLM fuse.
 */
interface DrawingExtractLike {
  success?: boolean;
  dimensions?: Array<{ value?: unknown; unit?: unknown; type?: unknown; text?: unknown }>;
  annotations?: unknown;
  partInfo?: { partNumber?: unknown; revision?: unknown; material?: unknown };
  metadata?: { path?: unknown; units?: unknown };
}

/** DXF/DWG dimension type -> canonical contract DimType ('radial' is the DXF spelling of 'radius'). */
const DXF_TYPE_MAP: Record<string, string> = {
  radial: "radius",
  radius: "radius",
  diameter: "diameter",
  linear: "linear",
  angular: "angular",
};

/**
 * Map a `Drawing2DExtractionEngine.extractDrawing` result (the dispatcher-reachable `drawing_extract`
 * geometry producer) into the versioned contract. Pure -- no I/O. This is the GEOMETRY-path sibling of
 * `normalizeFusedToContract` (the VLM-path normalizer): the two producers have INCOMPATIBLE shapes, so
 * feeding a drawing-extract result through the fuse normalizer would silently drop every dimension
 * (its `value_mm` is undefined) -- this normalizer closes that seam.
 *
 * Semantics for deterministic geometry parse (vs VLM guessing):
 *  - UNITS-FIRST (xray's #1 refuse -- a units miss is a 25.4x scale error): each dim carries its OWN
 *    `unit`. A recognized inch unit ('in'/'inch'/'in.') is converted value*25.4 -> mm at the boundary;
 *    a recognized 'mm' passes through; an UNRECOGNIZED/missing unit is KEPT (no data loss) but forced
 *    needs_confirm so it is NEVER silently trusted as mm.
 *  - confidence: a successful parse yields EXACT CAD-authored values -> 1.0 (no operator re-read needed);
 *    a producer that SIGNALS failure (success===false) -> 0.5 (< floor -> needs_confirm). NB the current
 *    Drawing2DExtractionEngine always returns success:true (DWG-without-SDK only warns) -- the 0.5 branch
 *    is a defensive guard for that-or-future producers, locked by test, not a live engine path today.
 *  - value guard: only a number or a non-empty numeric string is accepted; ''/null/false/[] are DROPPED
 *    (never coerced to a fake value_mm:0).
 *  - status stays 'unknown' + hallucination_candidate=false: the ensemble-corroboration concept is
 *    VLM-only; a single deterministic parser neither corroborates nor hallucinates.
 *  - DXF `annotations` are unclassified free text -> honest `notes` (NOT GD&T/surface-finish, which the
 *    geometry parser does not classify); gdt/profiles/surface_finishes stay empty.
 *  - title_block from `partInfo` (+ metadata.units); n_models=0 (no VLM ensemble).
 */
export function normalizeDrawingExtractToContract(extraction: unknown, opts: NormalizeOpts = {}): BlueprintExtractionContract {
  const floor = Number.isFinite(opts.confirmFloor as number) ? (opts.confirmFloor as number) : OCR_PER_FIELD_CONFIRM_FLOOR;
  const e = (extraction && typeof extraction === "object" ? extraction : {}) as DrawingExtractLike;

  const parseOk = e.success !== false; // absent success treated as ok (engine omits it only on a non-result)
  const conf = parseOk ? 1.0 : 0.5;
  const needsConfirm = conf < floor;

  const dimensions: ContractDimension[] = (Array.isArray(e.dimensions) ? e.dimensions : [])
    .map((d): ContractDimension | null => {
      // value guard: accept a number or a non-empty numeric string ONLY -- never coerce ''/null/false/[]
      // to a fake 0 (Number("")===0 is the silent-loss trap).
      const rawVal =
        typeof d?.value === "number"
          ? d.value
          : typeof d?.value === "string" && d.value.trim() !== ""
            ? Number(d.value)
            : Number.NaN;
      if (!Number.isFinite(rawVal)) return null; // never emit an unusable dimension
      // UNITS-FIRST: convert ONLY a recognized inch unit; recognized mm passes through; an
      // unrecognized/missing unit is kept but forced needs_confirm (never silently trusted as mm).
      const unit = typeof d?.unit === "string" ? d.unit.trim().toLowerCase() : "";
      const isInch = unit === "in" || unit === "inch" || unit === "in.";
      const isMm = unit === "mm";
      const value_mm = isInch ? rawVal * MM_PER_INCH : rawVal;
      const unitAmbiguous = !isInch && !isMm;
      const t = typeof d?.type === "string" ? (DXF_TYPE_MAP[d.type] || d.type) : "unknown";
      return {
        value_mm,
        type: t,
        confidence: conf,
        needs_confirm: needsConfirm || unitAmbiguous,
        status: "unknown",
        hallucination_candidate: false,
      };
    })
    .filter((d): d is ContractDimension => d !== null);

  const notes: ContractCallout[] = (Array.isArray(e.annotations) ? e.annotations : [])
    .map((a) => (typeof a === "string" ? a.trim() : ""))
    .filter((a) => a.length > 0)
    .map((a) => ({ value: a, confidence: conf, needs_confirm: needsConfirm, hallucination_candidate: false }));

  const pi = (e.partInfo && typeof e.partInfo === "object" ? e.partInfo : {}) as Record<string, unknown>;
  const titleBlock: Record<string, unknown> = {};
  if (typeof pi.partNumber === "string" && pi.partNumber) titleBlock.part_number = pi.partNumber;
  if (typeof pi.revision === "string" && pi.revision) titleBlock.revision = pi.revision;
  if (typeof pi.material === "string" && pi.material) titleBlock.material = pi.material;
  if (e.metadata && typeof e.metadata.units === "string") titleBlock.units = e.metadata.units;

  const source =
    opts.source || (e.metadata && typeof e.metadata.path === "string" ? (e.metadata.path as string) : undefined);

  return finalizeContract(dimensions, [], notes, [], [], {
    confirmFloor: floor,
    source,
    titleBlock: Object.keys(titleBlock).length ? titleBlock : opts.titleBlock,
    nModels: 0, // deterministic geometry parser -> no VLM ensemble depth
  });
}

export interface ContractValidation {
  ok: boolean;
  data?: BlueprintExtractionContract;
  errors?: string[];
}

/** Validate an object against the contract. Returns {ok, data} or {ok:false, errors[]} (never throws). */
export function validateBlueprintExtractionContract(obj: unknown): ContractValidation {
  const res = blueprintExtractionContractSchema.safeParse(obj);
  if (res.success) return { ok: true, data: res.data };
  return { ok: false, errors: res.error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`) };
}
