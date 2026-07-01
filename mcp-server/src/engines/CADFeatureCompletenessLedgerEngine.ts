/**
 * CADFeatureCompletenessLedgerEngine -- the print-feature completeness backbone for the
 * comprehensive CAD-drawing pipeline (delta/CAD, U-CADDRAW-FEATURE-LEDGER, 2026-06-19).
 *
 * WHY THIS EXISTS (root-cause fix, not a symptom patch):
 *   The 2026-06-16 yesterday-test drew a stepped-bore print and SILENTLY MISSED the far-side
 *   smaller bore diameter + the internal lead-in transition chamfer (commit 84a78522f8 patched
 *   the ONE VLM prompt). Features drop silently at EVERY stage -- extract, sketch, model, validate --
 *   because nothing ENUMERATES the print's full feature set and RECONCILES every downstream artifact
 *   against it. This engine is that enumerated, fail-loud ledger: build() turns a print extraction
 *   into a canonical entry-per-feature set (a stepped bore = N entries, NEVER collapsed to 1);
 *   reconcile() reports every feature present in the print but ABSENT/OUT-OF-TOL in the drawn model;
 *   advance() tracks each feature extracted -> sketched -> modeled -> validated.
 *
 * It is the data contract the sketch-first gate (S1) and the print-regen dim-by-dim gate (S5) both
 * reconcile against -- see state/shared/specs/CAD-DRAWING-PIPELINE-COMPREHENSIVE-2026-06-19.md.
 *
 * PURITY: pure + deterministic (no I/O, no mutation of inputs) -- mirrors the sibling
 *   CrossSourceDimensionReconciliationEngine. Persistence (schema-versioned, part-keyed JSON) is the
 *   DISPATCHER/runner's job; this engine is the enumeration + reconciliation MATH.
 *
 * UNITS: canonical mm (inch sources converted x25.4) -- a units mismatch is a 25.4x scale error
 *   (delta gotcha [[reference_delta_step_inch_unit_convention]]). Every comparison is mm-vs-mm.
 *
 * Actions (via cadDispatcher): cad_feature_ledger_build / cad_feature_ledger_reconcile / cad_feature_ledger_status
 */

import { z } from "zod";
import type {
  DimensionExtractionResult,
  ExtractedDimension,
  GDTCallout,
  ThreadCallout,
} from "./PDFBlueprintDimensionExtractorEngine.js";

// ============================================================================
// CONSTANTS
// ============================================================================

/** Exact international-inch definition (1 in = 25.4 mm). Unit conversion, NOT a physics constant. */
const MM_PER_INCH = 25.4;

export const CAD_FEATURE_LEDGER_SCHEMA_VERSION = "1.0.0";

/** Status lifecycle -- forward-only. A feature can never regress to an earlier stage. */
const STATUS_ORDER = ["extracted", "sketched", "modeled", "validated"] as const;
export type LedgerStatus = (typeof STATUS_ORDER)[number];

// ============================================================================
// TYPES
// ============================================================================

export type LedgerFeatureType =
  | "linear"
  | "diameter"
  | "radius"
  | "angle"
  | "chamfer"
  | "depth"
  | "counterbore"
  | "thread"
  | "gdt"
  | "unknown";

/** One enumerated print feature. nominalMm/tol*Mm are canonical mm. */
export interface LedgerEntry {
  id: string; // stable + unique within a ledger
  featureType: LedgerFeatureType;
  nominalMm: number;
  tolPlusMm: number; // magnitude added to nominal (>= 0)
  tolMinusMm: number; // magnitude subtracted from nominal (>= 0)
  datumRef: string[]; // [] if none
  view: string | null; // print view if known
  sourceUnit: "mm" | "inch";
  sourceConfidence: number; // [0,1]
  status: LedgerStatus;
  rawText: string;
  /** Populated (LOUD) when the source dimension was malformed (NaN/Infinity/negative tol). Never silently dropped. */
  invalid?: string;
}

export interface FeatureLedger {
  schemaVersion: string;
  partNumber: string;
  entries: LedgerEntry[];
  /** Count of entries flagged invalid -- a NON-ZERO value is a fail-loud signal that extraction was incomplete/corrupt. */
  invalidCount: number;
  builtFrom: { dimensions: number; gdt: number; threads: number };
}

/** A feature measured from the drawn model (mm canonical). label enables feature-paired matching. */
export interface ModelFeature {
  featureType: LedgerFeatureType;
  valueMm: number;
  label?: string;
}

export interface MismatchedEntry {
  entry: LedgerEntry;
  modelValueMm: number;
  deltaMm: number; // signed (model - nominal)
}

export interface ReconcileReport {
  /** true iff missing=0 AND mismatched=0 AND invalidCount=0 -- i.e. the model is 100% to the print. */
  complete: boolean;
  missing: LedgerEntry[]; // in the print/ledger, NOT in the model -- the "missed features" class
  extra: ModelFeature[]; // in the model, NOT in the print -- phantom/hallucinated geometry
  mismatched: MismatchedEntry[]; // matched feature but value out of tolerance band
  matched: number;
  invalidEntries: LedgerEntry[]; // entries that could not be reconciled because the source dim was malformed
}

// ============================================================================
// INPUT VALIDATION (Zod)
// ============================================================================

const ModelFeatureSchema = z.object({
  featureType: z.string().min(1),
  valueMm: z.number(),
  label: z.string().optional(),
});

const BuildInputSchema = z.object({
  partNumber: z.string().min(1, "partNumber is required (the ledger is part-keyed)"),
});

// ============================================================================
// ENGINE
// ============================================================================

export class CADFeatureCompletenessLedgerEngine {
  /**
   * Enumerate a print extraction into a canonical feature ledger -- one entry per feature,
   * NEVER collapsing distinct features (a stepped bore's two diameters stay two entries).
   *
   * @param extraction the PDFBlueprintDimensionExtractorEngine result for the print
   * @param partNumber part-number key for the persistent ledger
   * @returns a FeatureLedger with every dimension/thread/GD&T enumerated, malformed ones flagged (not dropped)
   */
  build(extraction: DimensionExtractionResult, partNumber: string): FeatureLedger {
    BuildInputSchema.parse({ partNumber });
    if (!extraction || typeof extraction !== "object") {
      throw new Error("CADFeatureCompletenessLedger.build: extraction is required");
    }

    const dims = Array.isArray(extraction.dimensions) ? extraction.dimensions : [];
    const gdt = Array.isArray(extraction.gdt_callouts) ? extraction.gdt_callouts : [];
    const threads = Array.isArray(extraction.threads) ? extraction.threads : [];

    const entries: LedgerEntry[] = [];
    const seq: Record<string, number> = {};
    const nextId = (type: string): string => {
      seq[type] = (seq[type] ?? 0) + 1;
      return `${type}-${seq[type]}`;
    };

    for (const d of dims) {
      entries.push(this.dimensionToEntry(d, nextId));
    }
    for (const t of threads) {
      entries.push(this.threadToEntry(t, nextId));
    }
    for (const g of gdt) {
      entries.push(this.gdtToEntry(g, nextId));
    }

    const invalidCount = entries.filter((e) => e.invalid !== undefined).length;

    return {
      schemaVersion: CAD_FEATURE_LEDGER_SCHEMA_VERSION,
      partNumber,
      entries,
      invalidCount,
      builtFrom: { dimensions: dims.length, gdt: gdt.length, threads: threads.length },
    };
  }

  /**
   * Reconcile a drawn model's features against the ledger. This is the fail-loud gate:
   * any ledger entry with no matching model feature is MISSING (the yesterday-test class).
   *
   * @param ledger the FeatureLedger from build()
   * @param modelFeatures features measured from the drawn model (mm canonical)
   * @returns a ReconcileReport; complete=true only when nothing is missing/mismatched/invalid
   */
  reconcile(ledger: FeatureLedger, modelFeatures: ModelFeature[]): ReconcileReport {
    if (!ledger || !Array.isArray(ledger.entries)) {
      throw new Error("CADFeatureCompletenessLedger.reconcile: a built ledger is required");
    }
    const features = z.array(ModelFeatureSchema).parse(modelFeatures ?? []) as ModelFeature[];

    const invalidEntries = ledger.entries.filter((e) => e.invalid !== undefined);
    const valid = ledger.entries.filter((e) => e.invalid === undefined);

    // Pool of model features still available to match (consumed greedily, nearest-first).
    const pool = features.map((f) => ({ f, used: false }));

    const missing: LedgerEntry[] = [];
    const mismatched: MismatchedEntry[] = [];
    let matched = 0;

    for (const entry of valid) {
      const lo = entry.nominalMm - entry.tolMinusMm;
      const hi = entry.nominalMm + entry.tolPlusMm;

      // Candidates: same feature type, not yet consumed. Nearest candidate by absolute value
      // distance to nominal wins, so two same-type features do not cross-match arbitrarily.
      const sameType = pool.filter((p) => !p.used && p.f.featureType === entry.featureType);
      if (sameType.length === 0) {
        missing.push(entry);
        continue;
      }

      let best = sameType[0];
      let bestDist = Math.abs(best.f.valueMm - entry.nominalMm);
      for (const c of sameType) {
        const dist = Math.abs(c.f.valueMm - entry.nominalMm);
        if (dist < bestDist) {
          best = c;
          bestDist = dist;
        }
      }

      best.used = true;
      const v = best.f.valueMm;
      if (v >= lo && v <= hi) {
        matched += 1;
      } else {
        mismatched.push({ entry, modelValueMm: v, deltaMm: v - entry.nominalMm });
      }
    }

    const extra = pool.filter((p) => !p.used).map((p) => p.f);

    return {
      complete: missing.length === 0 && mismatched.length === 0 && invalidEntries.length === 0,
      missing,
      extra,
      mismatched,
      matched,
      invalidEntries,
    };
  }

  /**
   * Advance a single feature's lifecycle status (forward-only). Returns a NEW ledger (no mutation).
   *
   * @throws if the id is unknown or the transition is backward (fail loud -- a silent no-op would
   *   let a never-drawn feature look "validated")
   */
  advance(ledger: FeatureLedger, featureId: string, toStatus: LedgerStatus): FeatureLedger {
    if (!STATUS_ORDER.includes(toStatus)) {
      throw new Error(`CADFeatureCompletenessLedger.advance: unknown status "${toStatus}"`);
    }
    const idx = ledger.entries.findIndex((e) => e.id === featureId);
    if (idx === -1) {
      throw new Error(`CADFeatureCompletenessLedger.advance: unknown feature id "${featureId}"`);
    }
    const current = ledger.entries[idx];
    const from = STATUS_ORDER.indexOf(current.status);
    const to = STATUS_ORDER.indexOf(toStatus);
    if (to < from) {
      throw new Error(
        `CADFeatureCompletenessLedger.advance: backward transition ${current.status}->${toStatus} for "${featureId}" is forbidden`,
      );
    }
    const entries = ledger.entries.map((e, i) => (i === idx ? { ...e, status: toStatus } : e));
    return { ...ledger, entries };
  }

  // --------------------------------------------------------------------------
  // INTERNALS
  // --------------------------------------------------------------------------

  private toMm(value: number, unit: "mm" | "inch"): number {
    return unit === "inch" ? value * MM_PER_INCH : value;
  }

  private dimensionToEntry(d: ExtractedDimension, nextId: (t: string) => string): LedgerEntry {
    const unit: "mm" | "inch" = d.unit === "inch" ? "inch" : "mm";
    const type = (d.type as LedgerFeatureType) ?? "unknown";
    const base: LedgerEntry = {
      id: nextId(type),
      featureType: type,
      nominalMm: this.toMm(d.nominal, unit),
      tolPlusMm: Math.abs(this.toMm(d.tolerance_plus, unit)),
      tolMinusMm: Math.abs(this.toMm(d.tolerance_minus, unit)),
      datumRef: [],
      view: null,
      sourceUnit: unit,
      sourceConfidence: 1,
      status: "extracted",
      rawText: d.raw_text ?? "",
    };
    const reason = this.validateNumeric(d.nominal, d.tolerance_plus, d.tolerance_minus);
    if (reason) base.invalid = reason;
    return base;
  }

  private threadToEntry(t: ThreadCallout, nextId: (t: string) => string): LedgerEntry {
    const major = typeof t.major_diameter === "number" ? t.major_diameter : NaN;
    // Major-diameter unit follows the spec: metric major dia is mm, imperial is inch.
    const unit: "mm" | "inch" = t.type === "imperial" ? "inch" : "mm";
    const entry: LedgerEntry = {
      id: nextId("thread"),
      featureType: "thread",
      nominalMm: this.toMm(major, unit),
      tolPlusMm: 0,
      tolMinusMm: 0,
      datumRef: [],
      view: null,
      sourceUnit: unit,
      sourceConfidence: 1,
      status: "extracted",
      rawText: t.spec ?? "",
    };
    if (!Number.isFinite(major)) entry.invalid = "thread major_diameter is not a finite number";
    return entry;
  }

  private gdtToEntry(g: GDTCallout, nextId: (t: string) => string): LedgerEntry {
    const entry: LedgerEntry = {
      id: nextId("gdt"),
      featureType: "gdt",
      nominalMm: Number.isFinite(g.value) ? g.value : NaN,
      tolPlusMm: 0,
      tolMinusMm: 0,
      datumRef: Array.isArray(g.datums) ? g.datums : [],
      view: null,
      sourceUnit: "mm",
      sourceConfidence: 1,
      status: "extracted",
      rawText: g.raw_text ?? "",
    };
    if (!Number.isFinite(g.value)) entry.invalid = "GD&T value is not a finite number";
    return entry;
  }

  /** Returns a fail-loud reason string if any numeric field is non-finite or a tolerance is negative; else "". */
  private validateNumeric(nominal: number, tolPlus: number, tolMinus: number): string {
    if (!Number.isFinite(nominal)) return "nominal is not a finite number";
    if (!Number.isFinite(tolPlus) || !Number.isFinite(tolMinus)) return "tolerance is not a finite number";
    if (tolPlus < 0 || tolMinus < 0) return "tolerance magnitude is negative";
    return "";
  }
}

export const cadFeatureCompletenessLedgerEngine = new CADFeatureCompletenessLedgerEngine();
