/**
 * BlueprintOCRAdapter — Contract for blueprint-OCR backends in the print-to-program pipeline.
 *
 * Shipped: 2026-05-23, slot:kilo iter 8 (U-OCR-ADAPTER-IFACE from KILO-QUEUE-PSN-SYNERGY-2026-05-23).
 * Part of: U-GAP-P2P-OCR-DIMENSION decomposition (multi-session ML build).
 *
 * Purpose: Defines the contract any OCR backend (eDOCr2, PaddleOCR, future cloud APIs)
 * must implement to feed the print-to-program pipeline. The pipeline consumes the
 * adapter output; no consumer should depend on a concrete backend.
 *
 * Per kilo's slot soul:
 *   - validate-blueprint-extraction-before-cam: confidence_per_field MUST be reported
 *     so downstream consumers can gate PMI/GD&T propagation on threshold.
 *   - silent-fallback-on-ambiguous-callouts → reject: the adapter returns the raw
 *     ambiguity, never a heuristic-filled value.
 *   - tolerance-stack propagation: tolerances are returned as min/max bounds, never
 *     as nominal-only, so downstream can propagate without loosening.
 *
 * Cross-refs:
 *   - Spec:    state/shared/specs/KILO-QUEUE-PSN-SYNERGY-2026-05-23.md (U-OCR-*)
 *   - Wiki:    knowledge/wiki/architecture/p2p-intake-check-discipline.md
 *   - Feedback: knowledge/memories/feedback/feedback_p2p_pre_flight_discipline_2026_05_23.md
 *   - Memory:  reference_kilo_queue_revisit_2026_05_23
 *   - Consumer: PrintToProgramPipelineEngine.validateIntake() (when integrated)
 *
 * Implementation status: INTERFACE ONLY. Concrete impls (U-OCR-EDOCR2-IMPL,
 * U-OCR-PADDLEOCR-IMPL) deferred to dedicated multi-session ML chats per the
 * kilo-queue PSN-synergy decomposition.
 */

/** Single dimension call-out extracted from a blueprint. */
export interface ExtractedDimension {
  /** Dimension identifier on the drawing (e.g., "D3", "ID-12"). */
  id: string;
  /** Nominal value in the unit specified. */
  nominal: number;
  /** Unit of measure. */
  unit: "mm" | "in" | "deg" | "rad";
  /** Tolerance bounds — required, must be min/max (never nominal-only). */
  tolerance: { min: number; max: number };
  /** Optional GD&T callouts attached to this dimension. */
  gdt?: GDTCallout[];
  /** Optional fit callout (e.g., "H7/g6"). */
  fit?: string;
  /** Per-field OCR confidence in [0, 1]. Caller MUST gate on threshold. */
  confidence: number;
  /** Source region on the drawing for traceability. */
  source_region?: { page: number; bbox: [number, number, number, number] };
}

/** Geometric Dimensioning & Tolerancing (GD&T) feature control frame. */
export interface GDTCallout {
  /** Symbol (e.g., "FLATNESS", "TRUE_POSITION", "CYLINDRICITY"). */
  symbol: string;
  /** Tolerance value. */
  value: number;
  /** Unit (typically same as base dimension). */
  unit: "mm" | "in";
  /** Material condition modifier. */
  material_condition?: "MMC" | "LMC" | "RFS";
  /** Datum references (e.g., ["A", "B", "C"]). */
  datums?: string[];
  /** Per-callout confidence. */
  confidence: number;
}

/** Product Manufacturing Information (PMI) annotation that is NOT a dimension. */
export interface PMIAnnotation {
  /** Free-form annotation type (e.g., "surface_finish", "thread_callout", "weld_symbol"). */
  type: string;
  /** Annotation value or text. */
  value: string | number;
  /** Per-annotation confidence. */
  confidence: number;
  /** Source region for traceability. */
  source_region?: { page: number; bbox: [number, number, number, number] };
}

/** Material call-out extracted from the title block or notes. */
export interface ExtractedMaterial {
  /** Material name as written on the drawing (e.g., "1045 steel"). */
  material_name: string;
  /** ISO group if inferable (P/M/K/N/S/H). Undefined → caller must default. */
  iso_group?: "P" | "M" | "K" | "N" | "S" | "H";
  /** Confidence in the material identification. */
  confidence: number;
}

/** Aggregate confidence summary so consumers can gate without iterating. */
export interface OCRConfidenceSummary {
  /** Overall confidence (geometric mean of per-field). */
  overall: number;
  /** Min confidence across all fields (worst case). */
  min: number;
  /** Count of fields below 0.7 — caller should flag for operator review. */
  low_confidence_count: number;
  /** Count of fields with no confidence reported (adapter bug). */
  missing_confidence_count: number;
}

/** Complete OCR result for a single blueprint. */
export interface BlueprintOCRResult {
  /** Source identifier (file path or URL). */
  source: string;
  /** All extracted dimensions. May be empty if blueprint is text-only. */
  dimensions: ExtractedDimension[];
  /** All extracted PMI annotations. */
  pmi: PMIAnnotation[];
  /** Material call-out (single drawing → single material assumption). */
  material?: ExtractedMaterial;
  /** Aggregate confidence so consumers don't iterate per-field. */
  confidence: OCRConfidenceSummary;
  /** OCR backend identifier (e.g., "edocr2-v0.3", "paddleocr-v2.7"). */
  backend: string;
  /** Wall-clock OCR runtime in ms (for telemetry / cost ranking). */
  duration_ms: number;
  /** Backend-specific raw output for debugging. NEVER required by consumers. */
  raw?: unknown;
}

/** Input options for the OCR call. */
export interface BlueprintOCROptions {
  /** Backend hint (caller may request specific backend; adapter may ignore). */
  preferred_backend?: string;
  /** Hard cap on OCR duration in ms. Adapter MUST honor by returning partial. */
  max_duration_ms?: number;
  /** Per-field confidence threshold below which fields are dropped from result. */
  confidence_floor?: number;
  /** Whether to include raw backend output (default false to reduce payload). */
  include_raw?: boolean;
}

/**
 * Contract any blueprint-OCR backend MUST implement.
 *
 * The pipeline calls `extract()` with a source (file path / URL / base64 image)
 * and receives a `BlueprintOCRResult`. The pipeline does NOT inspect the backend's
 * internals — it only consumes the result. This isolates the multi-session ML
 * build effort from the rest of the print-to-program pipeline.
 */
export interface BlueprintOCRAdapter {
  /** Identifier for this backend (e.g., "edocr2", "paddleocr"). */
  readonly backend: string;
  /** Adapter version (semver). */
  readonly version: string;
  /**
   * Extract dimensions / PMI / material from a blueprint source.
   *
   * @param source - File path, URL, or base64-encoded image.
   * @param options - Optional caller hints.
   * @returns Promise resolving to the extraction result.
   * @throws If the source cannot be read or the backend is unavailable.
   *   NEVER returns a "best effort heuristic" — per kilo soul refuse-list:
   *   silent-fallback-on-ambiguous-callouts → reject.
   */
  extract(source: string, options?: BlueprintOCROptions): Promise<BlueprintOCRResult>;
  /**
   * Quick health-check / availability probe. Used by router engines to pick
   * the cheapest healthy backend.
   *
   * @returns true if the backend is ready to handle extract() calls.
   */
  ping(): Promise<boolean>;
}

/**
 * Helper: aggregate a confidence summary from per-field confidences.
 * Adapters can call this to avoid re-implementing the reduction.
 */
export function summarizeConfidence(
  fieldConfidences: number[],
  lowThreshold: number = 0.7,
): OCRConfidenceSummary {
  if (fieldConfidences.length === 0) {
    return { overall: 0, min: 0, low_confidence_count: 0, missing_confidence_count: 0 };
  }
  const reported = fieldConfidences.filter(c => typeof c === "number" && !Number.isNaN(c));
  const missing = fieldConfidences.length - reported.length;
  if (reported.length === 0) {
    return { overall: 0, min: 0, low_confidence_count: 0, missing_confidence_count: missing };
  }
  // Geometric mean to penalize any single weak field.
  const logSum = reported.reduce((acc, c) => acc + Math.log(Math.max(c, 1e-9)), 0);
  const overall = Math.exp(logSum / reported.length);
  const min = Math.min(...reported);
  const low_confidence_count = reported.filter(c => c < lowThreshold).length;
  return {
    overall: Math.round(overall * 1e6) / 1e6,
    min: Math.round(min * 1e6) / 1e6,
    low_confidence_count,
    missing_confidence_count: missing,
  };
}
