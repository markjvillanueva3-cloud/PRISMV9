/**
 * CADLiveBlueprintOcrAdapter — CAD-DRAW-MAX-MS1/U-PRINT-OCR-LIVE
 *
 * Live adapter wiring the existing {@link BlueprintVisionOCREngine} (Claude
 * Vision API powered) as the `ocrPrint` dependency of the round-trip
 * validation engine.
 *
 * Maps `ExtractedDimension[]` (from BlueprintVisionOCREngine) →
 * `PrintDimension[]` (the round-trip engine's expected shape). Preserves
 * dimension ids, labels, nominal values, and asymmetric tolerances.
 *
 * **Hermetic-testable via injectable analyzer.** Default uses the
 * `blueprintVisionOCREngine` singleton (which calls Claude Vision live);
 * tests can pass a stub analyzer that returns canned `BlueprintAnalysis`.
 *
 * Pipeline:
 *   printPath → image source → analyzeBlueprint() → BlueprintAnalysis
 *   → mapDimensions() → PrintOcrResult
 *
 * **Image format support (v1):** PNG / JPEG / WebP via file path.
 * PDF support (most JM Die prints are PDF) requires a PDF→image conversion
 * step — explicit follow-up unit `U-PRINT-OCR-PDF`. v1 fails-loud with a
 * clear error when fed a PDF directly.
 *
 * Refs: BlueprintVisionOCREngine (~38KB, uses Claude Vision API);
 *       CADRoundTripValidationEngine (consumer of `ocrPrint` contract).
 */

import { extname } from "node:path";
import { existsSync } from "node:fs";

import type {
  PrintOcrResult,
  PrintDimension,
  PrintFeature,
} from "./CADRoundTripValidationEngine.js";
import type {
  BlueprintVisionInput,
  BlueprintVisionResult,
} from "./BlueprintVisionOCREngine.js";
import { blueprintVisionOCREngine } from "./BlueprintVisionOCREngine.js";
import type {
  ExtractedDimension,
  ExtractedNote,
} from "./BlueprintOCREngine.js";

// ── Constants ────────────────────────────────────────────────────────────────

const SUPPORTED_IMAGE_EXTS = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif"]);
const UNSUPPORTED_FOLLOWUP_EXTS = new Set([".pdf", ".tif", ".tiff"]);

// ── Types ────────────────────────────────────────────────────────────────────

export interface BlueprintAnalyzer {
  analyzeBlueprint(input: BlueprintVisionInput): Promise<BlueprintVisionResult>;
}

export interface LiveOcrAdapterOptions {
  /** Blueprint type hint for prompt engineering (default: "general"). */
  blueprintType?: "wire_edm" | "milling" | "turning" | "general";
  /** Expected units (helps Vision focus, auto-detected if omitted). */
  expectedUnits?: "mm" | "inch";
  /** Extract 2D profile geometry contours (default false). */
  extractGeometry?: boolean;
  /** Inject analyzer for hermetic tests (default = blueprintVisionOCREngine). */
  analyzer?: BlueprintAnalyzer;
}

// ── Pure helpers ─────────────────────────────────────────────────────────────

/**
 * Determine if a file path is a supported image format for the live OCR.
 * Returns {ok:true} or {ok:false, reason} — pure, exported for tests.
 */
export function classifyPrintPath(p: string): { ok: true } | { ok: false; reason: string } {
  if (typeof p !== "string" || p.length === 0) {
    return { ok: false, reason: "printPath must be a non-empty string" };
  }
  const ext = extname(p).toLowerCase();
  if (SUPPORTED_IMAGE_EXTS.has(ext)) return { ok: true };
  if (UNSUPPORTED_FOLLOWUP_EXTS.has(ext)) {
    return { ok: false, reason: `${ext} requires PDF/TIFF-to-image conversion — see U-PRINT-OCR-PDF follow-up unit` };
  }
  return { ok: false, reason: `unsupported image extension ${ext} — supported: ${[...SUPPORTED_IMAGE_EXTS].join(", ")}` };
}

/**
 * Map a single ExtractedDimension → PrintDimension. Pure; exported for tests.
 * Returns null if the dim has no usable nominal value (filtered upstream).
 */
export function mapDimension(ed: ExtractedDimension, idx: number): PrintDimension | null {
  if (!ed || typeof ed !== "object") return null;
  const value = Number(ed.nominal);
  if (!Number.isFinite(value)) return null;
  const id = ed.id ?? `DIM-${String(idx + 1).padStart(3, "0")}`;
  const label = ed.label ?? ed.type ?? `dim-${idx + 1}`;
  const out: PrintDimension = {
    id,
    label,
    value,
    unit: ed.units ?? "in",
  };
  // Map asymmetric tolerance bands when present
  if (ed.tolerance && typeof ed.tolerance === "object") {
    const lower = Number(ed.tolerance.lower);
    const upper = Number(ed.tolerance.upper);
    if (Number.isFinite(lower) && Number.isFinite(upper)) {
      out.tolerance = { lower, upper };
    }
  }
  return out;
}

/**
 * Map BlueprintAnalysis → PrintOcrResult. Pure; exported for tests.
 * Filters out non-numeric dimensions (silently dropped — they'd fail the
 * match anyway with non-finite values, so dropping them upstream prevents
 * noise in the round-trip report).
 */
export function mapAnalysisToPrintOcr(
  printPath: string,
  analysis: BlueprintVisionResult,
): PrintOcrResult {
  const dims: PrintDimension[] = [];
  if (Array.isArray(analysis.dimensions)) {
    for (let i = 0; i < analysis.dimensions.length; i++) {
      const mapped = mapDimension(analysis.dimensions[i], i);
      if (mapped) dims.push(mapped);
    }
  }
  // Pull features from extracted profiles (geometry) + GD&T callouts
  const features: PrintFeature[] = [];
  if (Array.isArray(analysis.profiles)) {
    for (const prof of analysis.profiles) {
      if (!prof || typeof prof !== "object") continue;
      features.push({
        id: prof.id ?? `PROF-${features.length + 1}`,
        kind: prof.type ?? "profile",
        detail: prof.name,
      });
    }
  }
  if (Array.isArray(analysis.gdt_callouts)) {
    for (let i = 0; i < analysis.gdt_callouts.length; i++) {
      const g = analysis.gdt_callouts[i];
      if (!g || typeof g !== "object") continue;
      features.push({
        id: `GDT-${i + 1}`,
        kind: `gdt:${g.symbol ?? "unknown"}`,
        detail: g.tolerance_value ? String(g.tolerance_value) : undefined,
      });
    }
  }
  return {
    printPath,
    dimensions: dims,
    features,
    ocrConfidence: analysis.overall_confidence,
  };
}

// ── Engine ───────────────────────────────────────────────────────────────────

export class CADLiveBlueprintOcrAdapter {
  /**
   * Live OCR entry point — satisfies the `ocrPrint` contract of
   * CADRoundTripValidationEngine. Reads a file at printPath, sends it
   * through Claude Vision, and returns the mapped PrintOcrResult.
   *
   * Fails-loud (throws) when:
   *   - printPath does not exist on disk
   *   - extension is unsupported (PDF requires the follow-up unit)
   *   - analyzer throws
   */
  async ocrPrint(printPath: string, opts: LiveOcrAdapterOptions = {}): Promise<PrintOcrResult> {
    const classified = classifyPrintPath(printPath);
    if (!classified.ok) {
      throw new Error(`ocrPrint: ${classified.reason}`);
    }
    if (!existsSync(printPath)) {
      throw new Error(`ocrPrint: file not found at ${printPath}`);
    }
    const analyzer = opts.analyzer ?? blueprintVisionOCREngine;
    const result = await analyzer.analyzeBlueprint({
      image: { type: "file", path: printPath },
      expected_units: opts.expectedUnits,
      blueprint_type: opts.blueprintType ?? "general",
      extract_geometry: opts.extractGeometry ?? false,
    });
    return mapAnalysisToPrintOcr(printPath, result);
  }
}

export const cadLiveBlueprintOcrAdapter = new CADLiveBlueprintOcrAdapter();

/**
 * Convenience: a curried `ocrPrint` matching the RoundTripDependencies
 * contract exactly. Use in production by passing this directly as the
 * `ocrPrint` dep.
 */
export function makeLiveOcrPrintFn(opts: LiveOcrAdapterOptions = {}) {
  return (printPath: string) => cadLiveBlueprintOcrAdapter.ocrPrint(printPath, opts);
}
