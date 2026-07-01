/**
 * CADSketchDimensionGateEngine -- the SKETCH-FIRST first-line-of-defense gate
 * (delta/CAD, U-CADDRAW-SKETCH-DIM-GATE, 2026-06-19).
 *
 * Stage S1 of the comprehensive CAD-drawing pipeline
 * (state/shared/specs/CAD-DRAWING-PIPELINE-COMPREHENSIVE-2026-06-19.md): a print is a set of
 * dimensioned 2D views, so the model is authored SKETCH-FIRST -- 2D sketches whose dimensions are
 * checked against the print BEFORE any 3D feature is built. This is the cheap early gate that would
 * have caught yesterday's missed stepped-bore features at the sketch stage instead of after modeling.
 *
 * It COMPOSES CADFeatureCompletenessLedgerEngine (the keystone): it reconciles the dimensions
 * captured in the sketches against the print-feature ledger, advances every captured feature to
 * status 'sketched', and emits a PASS/FAIL gate. PASS only when every SKETCHABLE print dimension is
 * captured within tolerance -- GD&T / threads are deferred (they are annotations, not sketch geometry,
 * and are captured at a later stage), so they never block the sketch gate.
 *
 * PURITY: pure + deterministic; never mutates the input ledger (advance() returns a new ledger).
 * UNITS: canonical mm (the ledger and the sketch dims are both mm; the ledger handles inch->mm).
 *
 * Actions (via cadDispatcher): cad_sketch_dim_gate
 */

import { z } from "zod";
import {
  cadFeatureCompletenessLedgerEngine,
  type FeatureLedger,
  type LedgerEntry,
  type LedgerFeatureType,
  type MismatchedEntry,
  type ModelFeature,
} from "./CADFeatureCompletenessLedgerEngine.js";

// Feature kinds that can be expressed as a dimension on a 2D sketch. GD&T frames and thread callouts
// are annotations, not sketch geometry, so they are DEFERRED (not gated at the sketch stage).
const SKETCHABLE_TYPES: ReadonlySet<LedgerFeatureType> = new Set<LedgerFeatureType>([
  "linear",
  "diameter",
  "radius",
  "angle",
  "chamfer",
  "depth",
  "counterbore",
]);

export interface SketchGateReport {
  /** true only when every SKETCHABLE print dim is captured within tolerance AND no ledger entry is invalid. */
  pass: boolean;
  /** how many sketchable print features the sketches captured within tolerance. */
  capturedCount: number;
  /** sketchable print dims NOT captured by any sketch -- the BLOCK-3D signal (the "missed features" class). */
  uncaptured: LedgerEntry[];
  /** captured, but the sketch dimension is out of the print tolerance band. */
  outOfTol: MismatchedEntry[];
  /** sketch dims with no print/ledger match -- advisory (an extra sketch dim does not block the gate). */
  notOnPrint: ModelFeature[];
  /** GD&T / thread entries -- not expressible as a sketch dim; deferred to a later stage, never blocking. */
  deferredNonSketchable: LedgerEntry[];
  /** malformed ledger entries (from build) -- block the gate until extraction is fixed. */
  invalid: LedgerEntry[];
  /** the ledger with every captured sketchable feature advanced extracted -> sketched (NEW object; input untouched). */
  advancedLedger: FeatureLedger;
}

const ModelFeatureArraySchema = z.array(
  z.object({
    featureType: z.string().min(1),
    valueMm: z.number(),
    label: z.string().optional(),
  }),
);

export class CADSketchDimensionGateEngine {
  /**
   * Evaluate the sketch-first gate: reconcile the captured sketch dimensions against the print-feature
   * ledger, advance captured features to 'sketched', and decide whether 3D build may proceed.
   *
   * @param ledger the FeatureLedger from cadFeatureCompletenessLedgerEngine.build()
   * @param sketchDimensions dimensions captured from the 2D sketches (mm canonical)
   * @returns a SketchGateReport; pass=true blocks nothing, pass=false names exactly what is uncaptured/out-of-tol
   */
  evaluate(ledger: FeatureLedger, sketchDimensions: ModelFeature[]): SketchGateReport {
    if (!ledger || !Array.isArray(ledger.entries)) {
      throw new Error("CADSketchDimensionGate.evaluate: a built FeatureLedger is required");
    }
    const sketch = ModelFeatureArraySchema.parse(sketchDimensions ?? []) as ModelFeature[];

    const rec = cadFeatureCompletenessLedgerEngine.reconcile(ledger, sketch);

    const missingIds = new Set(rec.missing.map((e) => e.id));
    const mismatchedIds = new Set(rec.mismatched.map((m) => m.entry.id));
    const invalidIds = new Set(rec.invalidEntries.map((e) => e.id));

    const uncaptured = rec.missing.filter((e) => SKETCHABLE_TYPES.has(e.featureType));
    const outOfTol = rec.mismatched.filter((m) => SKETCHABLE_TYPES.has(m.entry.featureType));
    const deferredNonSketchable = rec.missing.filter((e) => !SKETCHABLE_TYPES.has(e.featureType));

    // A sketchable entry is CAPTURED iff it is valid and not in missing/mismatched/invalid.
    const matchedSketchable = ledger.entries.filter(
      (e) =>
        SKETCHABLE_TYPES.has(e.featureType) &&
        e.invalid === undefined &&
        !invalidIds.has(e.id) &&
        !missingIds.has(e.id) &&
        !mismatchedIds.has(e.id),
    );

    // Advance every freshly-captured feature extracted -> sketched (forward-only; idempotent on re-eval).
    let advancedLedger = ledger;
    for (const e of matchedSketchable) {
      if (e.status === "extracted") {
        advancedLedger = cadFeatureCompletenessLedgerEngine.advance(advancedLedger, e.id, "sketched");
      }
    }

    const pass = uncaptured.length === 0 && outOfTol.length === 0 && rec.invalidEntries.length === 0;

    return {
      pass,
      capturedCount: matchedSketchable.length,
      uncaptured,
      outOfTol,
      notOnPrint: rec.extra,
      deferredNonSketchable,
      invalid: rec.invalidEntries,
      advancedLedger,
    };
  }
}

export const cadSketchDimensionGateEngine = new CADSketchDimensionGateEngine();
