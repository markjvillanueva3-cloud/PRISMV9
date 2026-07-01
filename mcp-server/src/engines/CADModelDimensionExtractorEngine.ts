/**
 * CADModelDimensionExtractorEngine — CAD-DRAW-MAX-MS1/U-CAD-DIM-EXTRACT
 *
 * Live `cadDimensionExtractor` adapter for the round-trip pipeline.
 * Walks a `DrawAnyPartResult.opLog` and extracts every numeric parameter
 * that represents a real part dimension (diameter, length, depth, radius,
 * angle, etc.) — returning a `PrintDimension[]` directly comparable to the
 * print-extracted dimension set.
 *
 * **Pure + hermetic.** Pulls dims from the in-memory op log; no BRep read
 * or live CAD session required. Determinism: given the same opLog, the
 * extracted dim list is byte-identical.
 *
 * **Extraction table** (op-kind → field names + dimension labels):
 *   sketch_circle      → diameter / radius*2          → "diameter"
 *   sketch_rectangle   → width, height                → "width" / "height"
 *   sketch_slot        → width, length                → "slot-width" / "slot-length"
 *   sketch_dimension   → value                        → "user-dim"
 *   sketch_fillet      → radius                       → "fillet-radius"
 *   sketch_chamfer     → distance                     → "chamfer-distance"
 *   feature_extrude    → depth / distance             → "extrude-depth"
 *   feature_revolve    → angle                        → "revolve-angle"
 *   feature_hole       → diameter, depth              → "hole-diameter" / "hole-depth"
 *   feature_thread     → diameter, pitch              → "thread-diameter" / "thread-pitch"
 *
 * Unknown op kinds produce no dimensions (silent skip). Unknown args
 * within a known op kind likewise skip — only the named fields contribute.
 *
 * Refs: CADRoundTripValidationEngine (consumer); ICADCodeGenerator (CADOperation type).
 */

import type { DrawAnyPartResult } from "./CADDrawAnyPartOrchestratorEngine.js";
import type { CADOperation } from "../interfaces/ICADCodeGenerator.js";
import type { PrintDimension } from "./CADRoundTripValidationEngine.js";

// ── Extraction table ─────────────────────────────────────────────────────────

interface DimRule {
  field: string;
  label: string;
  /** Optional value-transform (e.g. radius → diameter). */
  transform?: (v: number) => number;
}

const EXTRACTION_RULES: Record<string, DimRule[]> = Object.freeze({
  sketch_circle: [
    { field: "diameter", label: "diameter" },
    { field: "radius", label: "diameter", transform: r => r * 2 },
  ],
  sketch_rectangle: [
    { field: "width", label: "width" },
    { field: "height", label: "height" },
  ],
  sketch_slot: [
    { field: "width", label: "slot-width" },
    { field: "length", label: "slot-length" },
  ],
  sketch_dimension: [
    { field: "value", label: "user-dim" },
  ],
  sketch_fillet: [
    { field: "radius", label: "fillet-radius" },
  ],
  sketch_chamfer: [
    { field: "distance", label: "chamfer-distance" },
  ],
  feature_extrude: [
    { field: "depth", label: "extrude-depth" },
    { field: "distance", label: "extrude-depth" },
  ],
  feature_revolve: [
    { field: "angle", label: "revolve-angle" },
  ],
  feature_hole: [
    { field: "diameter", label: "hole-diameter" },
    { field: "depth", label: "hole-depth" },
  ],
  feature_thread: [
    { field: "diameter", label: "thread-diameter" },
    { field: "pitch", label: "thread-pitch" },
  ],
});

export const SUPPORTED_OP_KINDS = Object.freeze(Object.keys(EXTRACTION_RULES));

// ── Pure helpers ─────────────────────────────────────────────────────────────

/** Get a finite numeric arg from a CADOperation, or null. Pure. */
export function getNumericArg(op: CADOperation, field: string): number | null {
  if (!op || typeof op !== "object" || !op.args || typeof op.args !== "object") return null;
  const raw = (op.args as Record<string, unknown>)[field];
  if (raw === null || raw === undefined) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

/**
 * Extract all dimensions from a single CADOperation. Pure; returns an
 * array (possibly empty). Each dim gets a stable id derived from the
 * caller-supplied iteration index + the field name.
 */
export function extractDimsFromOp(op: CADOperation, iterIdx: number): PrintDimension[] {
  if (!op || typeof op !== "object" || typeof op.kind !== "string") return [];
  const rules = EXTRACTION_RULES[op.kind];
  if (!rules) return [];
  const seenLabels = new Set<string>(); // dedupe rules with same label (e.g. extrude depth+distance both map to "extrude-depth")
  const out: PrintDimension[] = [];
  for (const rule of rules) {
    if (seenLabels.has(rule.label)) continue;
    const v = getNumericArg(op, rule.field);
    if (v === null) continue;
    const value = rule.transform ? rule.transform(v) : v;
    if (!Number.isFinite(value)) continue;
    seenLabels.add(rule.label);
    // Stable id: DIM-{iterIdx}-{label} (rectangles produce 2 dims per op, hence label in id).
    out.push({
      id: `DIM-${String(iterIdx + 1).padStart(3, "0")}-${rule.label}`,
      label: rule.label,
      value,
      unit: "in",
    });
  }
  return out;
}

/**
 * Extract the full PrintDimension list from an opLog. Pure.
 * Iteration index is 1-based-ish (op[0] → DIM-001-*).
 */
export function extractDimsFromOpLog(opLog: ReadonlyArray<CADOperation>): PrintDimension[] {
  if (!Array.isArray(opLog)) return [];
  const out: PrintDimension[] = [];
  for (let i = 0; i < opLog.length; i++) {
    const dims = extractDimsFromOp(opLog[i], i);
    for (const d of dims) out.push(d);
  }
  return out;
}

// ── Engine ───────────────────────────────────────────────────────────────────

export class CADModelDimensionExtractorEngine {
  /**
   * Satisfies the `cadDimensionExtractor.extract` contract of the
   * round-trip engine. Pure (no I/O), async per the interface.
   */
  async extract(draw: DrawAnyPartResult): Promise<ReadonlyArray<PrintDimension>> {
    if (!draw || !Array.isArray(draw.opLog)) return [];
    return extractDimsFromOpLog(draw.opLog);
  }
}

export const cadModelDimensionExtractorEngine = new CADModelDimensionExtractorEngine();
