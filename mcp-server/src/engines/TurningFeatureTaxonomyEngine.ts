/**
 * TurningFeatureTaxonomyEngine — Profile Segment → Classified TurningFeature[]
 *
 * Takes a 2D XZ profile (from TurningRevProfileEngine or TurningCADImportEngine)
 * plus optional OCR-extracted dimensions (from BlueprintVisionOCREngine) and
 * classifies each segment into one of 20+ turning feature types.
 *
 * Feature taxonomy:
 *   OD: OD_STRAIGHT, OD_TAPER, OD_ARC, OD_STEP, OD_SHOULDER
 *   ID: BORE_THROUGH, BORE_BLIND, BORE_STEP, BORE_TAPER
 *   Face: FACE, CHAMFER, RADIUS
 *   Groove: GROOVE_OD, GROOVE_ID, GROOVE_FACE
 *   Thread: THREAD_EXTERNAL, THREAD_INTERNAL
 *   Special: UNDERCUT_DIN509, KNURL, CENTER_DRILL
 *
 * Each classified feature gets:
 *   - Geometry (diameter, length, taper angle, etc.)
 *   - Tolerance (from OCR match or ISO 2768 default)
 *   - Surface finish (from OCR or industry default)
 *   - Source traceability (profile segment IDs + OCR dimension IDs)
 *
 * References:
 *   - DIN 509:2006 (undercut forms E and F)
 *   - ISO 13715:2017 (edges of undefined shape)
 *   - ISO 1302:2002 (surface texture indication)
 *
 * @module engines/TurningFeatureTaxonomyEngine
 * @milestone LATHE-PRO-MS-1 U-LPI10
 */

import { log } from "../utils/Logger.js";
import type { XZSegment } from "./TurningRevProfileEngine.js";
import type { TurningFeature, TurningFeatureType } from "./TurningPrintToProgramEngine.js";

// ============================================================================
// TYPES
// ============================================================================

/** An OCR-extracted dimension that may be matched to a feature */
export interface OCRDimension {
  id: string;
  /** Nominal value in mm */
  value_mm: number;
  /** Tolerance (if explicitly callout) */
  tolerance_plus_mm?: number;
  tolerance_minus_mm?: number;
  /** Fit notation (e.g., "H7", "g6") */
  fit_notation?: string;
  /** Surface finish callout (Ra µm) */
  surface_finish_Ra_um?: number;
  /** Thread callout (e.g., "M12x1.75") */
  thread_callout?: string;
  /** Estimated position in drawing (for proximity matching) */
  position_hint?: { x_mm: number; z_mm: number };
  /** Type hint from OCR context */
  type_hint?: "diameter" | "length" | "depth" | "width" | "angle" | "thread" | "radius";
}

/** Input for the taxonomy engine */
export interface TaxonomyInput {
  /** OD profile segments from TurningRevProfileEngine */
  od_profile: XZSegment[];
  /** ID profile segments (if bore exists) */
  id_profile: XZSegment[];
  /** OCR-extracted dimensions (optional — enhances classification) */
  ocr_dimensions?: OCRDimension[];
  /** Non-axi feature count (for reference) */
  non_axi_count?: number;
  /** ISO 2768 tolerance class (for default tolerances) */
  iso2768_class?: "f" | "m" | "c" | "v";
  /** Default surface finish Ra (µm) */
  default_ra_um?: number;
}

/** Classification result for a single feature */
export interface ClassifiedFeature extends TurningFeature {
  /** Source segment IDs from the profile */
  source_segments: string[];
  /** Matched OCR dimension IDs */
  matched_ocr_ids: string[];
  /** Classification confidence (0-1) */
  classification_confidence: number;
  /** Tolerance source */
  tolerance_source?: "ocr_explicit" | "ocr_fit" | "iso2768_default" | "industry_default";
  /** Surface finish source */
  finish_source?: "ocr_explicit" | "feature_default";
}

/** Full taxonomy result */
export interface TaxonomyResult {
  features: ClassifiedFeature[];
  unmatched_dimensions: OCRDimension[];
  classification_summary: Record<string, number>;
  total_features: number;
  orphan_dimension_rate: number;
}

// ============================================================================
// CONSTANTS — Feature Detection Thresholds
// ============================================================================

/** Minimum segment length to classify (mm) */
const MIN_SEG_LENGTH = 0.01;

/** Maximum groove width (mm) — wider than this is an OD step, not groove */
const MAX_GROOVE_WIDTH = 15.0;

/** Maximum chamfer length (mm) */
const MAX_CHAMFER_LENGTH = 5.0;

/** Maximum fillet radius (mm) for automatic classification */
const MAX_FILLET_RADIUS = 10.0;

/** DIN 509 undercut width ranges (mm) for forms E and F */
const DIN509_WIDTH_RANGE = { min: 0.3, max: 6.0 };

/** Default Ra by feature type (ISO 1302 / industry standard) µm */
const DEFAULT_RA: Record<string, number> = {
  OD_STRAIGHT: 3.2,
  OD_TAPER: 3.2,
  OD_ARC: 3.2,
  OD_STEP: 3.2,
  OD_SHOULDER: 3.2,
  BORE_THROUGH: 3.2,
  BORE_BLIND: 3.2,
  BORE_STEP: 3.2,
  BORE_TAPER: 3.2,
  FACE: 3.2,
  CHAMFER: 6.3,
  RADIUS: 3.2,
  GROOVE_OD: 3.2,
  GROOVE_ID: 3.2,
  GROOVE_FACE: 3.2,
  THREAD_EXTERNAL: 1.6,
  THREAD_INTERNAL: 1.6,
  UNDERCUT_DIN509: 6.3,
  KNURL: 12.5,
  CENTER_DRILL: 6.3,
};

/** Map from taxonomy type to TurningFeatureType */
const TYPE_MAP: Record<string, TurningFeatureType> = {
  OD_STRAIGHT: "od_straight",
  OD_TAPER: "od_taper",
  OD_ARC: "od_contour",
  OD_STEP: "od_straight",
  OD_SHOULDER: "od_shoulder",
  BORE_THROUGH: "id_bore",
  BORE_BLIND: "id_bore",
  BORE_STEP: "id_bore",
  BORE_TAPER: "id_taper",
  FACE: "face",
  CHAMFER: "face",
  RADIUS: "od_contour",
  GROOVE_OD: "groove_od",
  GROOVE_ID: "groove_id",
  GROOVE_FACE: "groove_face",
  THREAD_EXTERNAL: "thread_od",
  THREAD_INTERNAL: "thread_id",
  UNDERCUT_DIN509: "groove_od",
  KNURL: "od_straight",
  CENTER_DRILL: "drill_center",
};

// ============================================================================
// ISO 2768-1 LINEAR TOLERANCE TABLE (mm) — for default assignment
// ============================================================================

interface ToleranceBand {
  min: number;
  max: number;
  f: number;
  m: number;
  c: number;
  v: number;
}

const ISO_2768_LINEAR: ToleranceBand[] = [
  { min: 0.5, max: 3,    f: 0.05, m: 0.1,  c: 0.2,  v: 0.5  },
  { min: 3,   max: 6,    f: 0.05, m: 0.1,  c: 0.3,  v: 1.0  },
  { min: 6,   max: 30,   f: 0.1,  m: 0.2,  c: 0.5,  v: 1.5  },
  { min: 30,  max: 120,  f: 0.15, m: 0.3,  c: 0.8,  v: 2.5  },
  { min: 120, max: 400,  f: 0.2,  m: 0.5,  c: 1.2,  v: 4.0  },
  { min: 400, max: 1000, f: 0.3,  m: 0.8,  c: 2.0,  v: 6.0  },
  { min: 1000, max: 2000, f: 0.5, m: 1.2, c: 3.0, v: 8.0 },
  { min: 2000, max: 4000, f: 0.5, m: 2.0, c: 4.0, v: 12.0 },
];

function getISO2768Tolerance(nominal_mm: number, cls: "f" | "m" | "c" | "v"): number {
  for (const band of ISO_2768_LINEAR) {
    if (nominal_mm > band.min && nominal_mm <= band.max) return band[cls];
  }
  // Below 0.5mm or above 4000mm — use nearest band
  if (nominal_mm <= 0.5) return ISO_2768_LINEAR[0][cls];
  return ISO_2768_LINEAR[ISO_2768_LINEAR.length - 1][cls];
}

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class TurningFeatureTaxonomyEngine {

  /**
   * Classify profile segments into TurningFeature[] with full taxonomy.
   *
   * @param input - OD/ID profiles + optional OCR dimensions
   * @returns Classified features with tolerance and finish assignments
   */
  static classify(input: TaxonomyInput): TaxonomyResult {
    const t0 = Date.now();
    const toleranceClass = input.iso2768_class || "m";
    const defaultRa = input.default_ra_um || 3.2;
    const features: ClassifiedFeature[] = [];
    const matchedOCR = new Set<string>();
    let fIdx = 0;

    log.info(`[FeatureTaxonomy] Classifying ${input.od_profile.length} OD + ${input.id_profile.length} ID segments`);

    // ── Classify OD profile segments ──────────────────────────────────
    for (let i = 0; i < input.od_profile.length; i++) {
      const seg = input.od_profile[i];
      const prev = i > 0 ? input.od_profile[i - 1] : null;
      const next = i < input.od_profile.length - 1 ? input.od_profile[i + 1] : null;

      const classified = TurningFeatureTaxonomyEngine.classifyODSegment(
        seg, prev, next, ++fIdx, input.ocr_dimensions, toleranceClass, defaultRa,
      );
      if (classified) {
        features.push(classified);
        for (const oid of classified.matched_ocr_ids) matchedOCR.add(oid);
      }
    }

    // ── Classify ID profile segments ─────────────────────────────────
    for (let i = 0; i < input.id_profile.length; i++) {
      const seg = input.id_profile[i];
      const prev = i > 0 ? input.id_profile[i - 1] : null;
      const next = i < input.id_profile.length - 1 ? input.id_profile[i + 1] : null;

      const classified = TurningFeatureTaxonomyEngine.classifyIDSegment(
        seg, prev, next, ++fIdx, input.ocr_dimensions, toleranceClass, defaultRa,
      );
      if (classified) {
        features.push(classified);
        for (const oid of classified.matched_ocr_ids) matchedOCR.add(oid);
      }
    }

    // ── Match remaining OCR thread callouts to features ──────────────
    if (input.ocr_dimensions) {
      for (const dim of input.ocr_dimensions) {
        if (matchedOCR.has(dim.id) || !dim.thread_callout) continue;
        // Find closest diameter feature
        const match = TurningFeatureTaxonomyEngine.findClosestDiameterFeature(features, dim);
        if (match) {
          match.type = dim.value_mm > (match.od_mm || 0)
            ? "thread_od" as TurningFeatureType
            : "thread_id" as TurningFeatureType;
          match.thread_class = dim.thread_callout;
          const pitch = TurningFeatureTaxonomyEngine.parseThreadPitch(dim.thread_callout);
          if (pitch) match.thread_pitch_mm = pitch;
          match.surface_finish_Ra_um = 1.6;
          match.finish_source = "feature_default";
          match.matched_ocr_ids.push(dim.id);
          matchedOCR.add(dim.id);
        }
      }
    }

    // ── Compute unmatched dimensions ─────────────────────────────────
    const unmatched = (input.ocr_dimensions || []).filter(d => !matchedOCR.has(d.id));
    const orphanRate = input.ocr_dimensions && input.ocr_dimensions.length > 0
      ? unmatched.length / input.ocr_dimensions.length
      : 0;

    // ── Summary ──────────────────────────────────────────────────────
    const summary: Record<string, number> = {};
    for (const f of features) {
      summary[f.type] = (summary[f.type] || 0) + 1;
    }

    const elapsed = Date.now() - t0;
    log.info(`[FeatureTaxonomy] ${features.length} features classified in ${elapsed}ms (${unmatched.length} unmatched OCR dims)`);

    return {
      features,
      unmatched_dimensions: unmatched,
      classification_summary: summary,
      total_features: features.length,
      orphan_dimension_rate: orphanRate,
    };
  }

  // ── OD Segment Classification ───────────────────────────────────────

  private static classifyODSegment(
    seg: XZSegment,
    prev: XZSegment | null,
    next: XZSegment | null,
    idx: number,
    ocrDims: OCRDimension[] | undefined,
    tolClass: "f" | "m" | "c" | "v",
    defaultRa: number,
  ): ClassifiedFeature | null {
    const dx = seg.end.x - seg.start.x; // radial change
    const dz = seg.end.z - seg.start.z; // axial change
    const segLen = Math.hypot(dx, dz);
    if (segLen < MIN_SEG_LENGTH) return null;

    const avgDia = (seg.start.x + seg.end.x); // diameter = 2 × radius
    const absLen = Math.abs(dz);
    const absDx = Math.abs(dx);

    let taxoType: string;
    let confidence = 0.8;

    if (seg.type === "arc") {
      // Arc on OD → contour or radius/fillet
      if (seg.arc_radius_mm && seg.arc_radius_mm < MAX_FILLET_RADIUS && segLen < MAX_CHAMFER_LENGTH) {
        taxoType = "RADIUS";
        confidence = 0.9;
      } else {
        taxoType = "OD_ARC";
        confidence = 0.85;
      }
    } else if (absDx < 0.01 && absLen > 0.5) {
      // Horizontal (constant radius) → straight or undercut check
      taxoType = "OD_STRAIGHT";
      confidence = 0.95;

      // Check for undercut: very short segment between two larger-radius segments
      if (prev && next && absLen <= DIN509_WIDTH_RANGE.max && absLen >= DIN509_WIDTH_RANGE.min) {
        const prevR = Math.max(prev.start.x, prev.end.x);
        const nextR = Math.max(next.start.x, next.end.x);
        if (seg.start.x < prevR * 0.95 && seg.start.x < nextR * 0.95) {
          taxoType = "UNDERCUT_DIN509";
          confidence = 0.85;
        }
      }
    } else if (absLen < 0.01 && absDx > 0.1) {
      // Vertical (radius change at same Z) → shoulder or face
      if (prev && seg.end.x < prev.end.x) {
        taxoType = "OD_SHOULDER";
      } else {
        taxoType = "FACE";
      }
      confidence = 0.9;
    } else if (absDx > 0.1 && absLen > 0.1) {
      // Angled line → taper or chamfer
      const angle = Math.abs(Math.atan2(absDx, absLen) * 180 / Math.PI);
      if (segLen < MAX_CHAMFER_LENGTH && (Math.abs(angle - 45) < 10 || segLen < 3)) {
        taxoType = "CHAMFER";
        confidence = 0.85;
      } else {
        taxoType = "OD_TAPER";
        confidence = 0.8;
      }
    } else {
      taxoType = "OD_STRAIGHT";
      confidence = 0.6;
    }

    // Check for groove pattern (narrow radial dip between neighbors)
    if (prev && next && taxoType === "OD_STRAIGHT") {
      const prevR = Math.max(prev.start.x, prev.end.x);
      const nextR = Math.max(next.start.x, next.end.x);
      const myR = Math.min(seg.start.x, seg.end.x);
      if (myR < prevR * 0.9 && myR < nextR * 0.9 && absLen < MAX_GROOVE_WIDTH) {
        taxoType = "GROOVE_OD";
        confidence = 0.85;
      }
    }

    // Build feature
    const featureType = TYPE_MAP[taxoType] || "od_straight";
    const nominal = avgDia > 0 ? avgDia : absLen;
    const tol = getISO2768Tolerance(nominal, tolClass);
    const ra = DEFAULT_RA[taxoType] || defaultRa;

    const feature: ClassifiedFeature = {
      id: `TAX-OD-${idx}`,
      type: featureType,
      od_mm: avgDia,
      length_mm: absLen,
      position_z_mm: Math.min(seg.start.z, seg.end.z),
      tolerance_mm: tol,
      surface_finish_Ra_um: ra,
      source_segments: [seg.source_face_id || `od-${idx}`],
      matched_ocr_ids: [],
      classification_confidence: confidence,
      tolerance_source: "iso2768_default",
      finish_source: "feature_default",
    };

    // Taper angle
    if (taxoType === "OD_TAPER" || taxoType === "CHAMFER") {
      feature.taper_angle_deg = Math.abs(Math.atan2(absDx, absLen) * 180 / Math.PI);
    }

    // Groove dimensions
    if (taxoType === "GROOVE_OD" || taxoType === "UNDERCUT_DIN509") {
      feature.groove_width_mm = absLen;
      feature.groove_depth_mm = absDx;
    }

    // Match OCR dimensions
    if (ocrDims) {
      TurningFeatureTaxonomyEngine.matchOCRToFeature(feature, ocrDims, taxoType);
    }

    return feature;
  }

  // ── ID Segment Classification ───────────────────────────────────────

  private static classifyIDSegment(
    seg: XZSegment,
    prev: XZSegment | null,
    next: XZSegment | null,
    idx: number,
    ocrDims: OCRDimension[] | undefined,
    tolClass: "f" | "m" | "c" | "v",
    defaultRa: number,
  ): ClassifiedFeature | null {
    const dx = seg.end.x - seg.start.x;
    const dz = seg.end.z - seg.start.z;
    const segLen = Math.hypot(dx, dz);
    if (segLen < MIN_SEG_LENGTH) return null;

    const avgDia = (seg.start.x + seg.end.x); // diameter = 2 × radius
    const absLen = Math.abs(dz);
    const absDx = Math.abs(dx);

    let taxoType: string;
    let confidence = 0.8;

    if (seg.type === "arc") {
      taxoType = "BORE_TAPER"; // Arc in bore is unusual, classify as taper
      confidence = 0.7;
    } else if (absDx < 0.01 && absLen > 0.5) {
      // Constant radius bore
      // Determine through vs blind by checking if profile continues past this segment
      if (!next || (next && Math.abs(next.end.z - seg.end.z) < 0.5)) {
        taxoType = "BORE_BLIND";
      } else {
        taxoType = "BORE_THROUGH";
      }
      confidence = 0.85;
    } else if (absLen < 0.01 && absDx > 0.1) {
      // Step in bore diameter
      taxoType = "BORE_STEP";
      confidence = 0.85;
    } else if (absDx > 0.1 && absLen > 0.1) {
      taxoType = "BORE_TAPER";
      confidence = 0.8;
    } else {
      taxoType = "BORE_THROUGH";
      confidence = 0.6;
    }

    // Check for ID groove
    if (prev && next) {
      const prevR = Math.min(prev.start.x, prev.end.x);
      const nextR = Math.min(next.start.x, next.end.x);
      const myR = Math.max(seg.start.x, seg.end.x);
      if (myR > prevR * 1.1 && myR > nextR * 1.1 && absLen < MAX_GROOVE_WIDTH) {
        taxoType = "GROOVE_ID";
        confidence = 0.85;
      }
    }

    const featureType = TYPE_MAP[taxoType] || "id_bore";
    const nominal = avgDia > 0 ? avgDia : absLen;
    const tol = getISO2768Tolerance(nominal, tolClass);
    const ra = DEFAULT_RA[taxoType] || defaultRa;

    const feature: ClassifiedFeature = {
      id: `TAX-ID-${idx}`,
      type: featureType,
      id_mm: avgDia,
      length_mm: absLen,
      position_z_mm: Math.min(seg.start.z, seg.end.z),
      tolerance_mm: tol,
      surface_finish_Ra_um: ra,
      source_segments: [seg.source_face_id || `id-${idx}`],
      matched_ocr_ids: [],
      classification_confidence: confidence,
      tolerance_source: "iso2768_default",
      finish_source: "feature_default",
    };

    if (taxoType === "BORE_TAPER") {
      feature.taper_angle_deg = Math.abs(Math.atan2(absDx, absLen) * 180 / Math.PI);
    }
    if (taxoType === "GROOVE_ID") {
      feature.groove_width_mm = absLen;
      feature.groove_depth_mm = absDx;
    }

    if (ocrDims) {
      TurningFeatureTaxonomyEngine.matchOCRToFeature(feature, ocrDims, taxoType);
    }

    return feature;
  }

  // ── OCR Dimension Matching ──────────────────────────────────────────

  /** Match OCR dimensions to a classified feature by geometric proximity */
  private static matchOCRToFeature(
    feature: ClassifiedFeature,
    dims: OCRDimension[],
    taxoType: string,
  ): void {
    const featureZ = feature.position_z_mm || 0;
    const featureDia = feature.od_mm || feature.id_mm || 0;

    for (const dim of dims) {
      let matched = false;

      // Match diameter dimensions to OD/ID features
      if (dim.type_hint === "diameter" && featureDia > 0) {
        if (Math.abs(dim.value_mm - featureDia) < featureDia * 0.05) {
          matched = true;
          feature.od_mm = dim.value_mm; // Use OCR value (more precise)
        }
      }

      // Match length dimensions
      if (dim.type_hint === "length" && feature.length_mm > 0) {
        if (Math.abs(dim.value_mm - feature.length_mm) < feature.length_mm * 0.1) {
          matched = true;
          feature.length_mm = dim.value_mm;
        }
      }

      // Match by position hint
      if (!matched && dim.position_hint) {
        const dist = Math.hypot(
          dim.position_hint.x_mm - featureDia / 2,
          dim.position_hint.z_mm - featureZ,
        );
        if (dist < 10) matched = true;
      }

      // Thread match
      if (dim.thread_callout && (taxoType.includes("THREAD") || taxoType === "OD_STRAIGHT")) {
        if (Math.abs(dim.value_mm - featureDia) < featureDia * 0.05) {
          feature.type = featureDia > 0 && taxoType.includes("ID") ? "thread_id" : "thread_od";
          feature.thread_class = dim.thread_callout;
          const pitch = TurningFeatureTaxonomyEngine.parseThreadPitch(dim.thread_callout);
          if (pitch) feature.thread_pitch_mm = pitch;
          feature.surface_finish_Ra_um = 1.6;
          feature.finish_source = "feature_default";
          matched = true;
        }
      }

      if (matched) {
        feature.matched_ocr_ids.push(dim.id);

        // Apply explicit tolerances from OCR
        if (dim.tolerance_plus_mm !== undefined && dim.tolerance_minus_mm !== undefined) {
          feature.tolerance_mm = Math.max(Math.abs(dim.tolerance_plus_mm), Math.abs(dim.tolerance_minus_mm));
          feature.tolerance_source = "ocr_explicit";
        } else if (dim.fit_notation) {
          feature.tolerance_source = "ocr_fit";
          // FitNotationParserEngine will resolve the actual tolerance band
        }

        // Apply explicit surface finish
        if (dim.surface_finish_Ra_um !== undefined) {
          feature.surface_finish_Ra_um = dim.surface_finish_Ra_um;
          feature.finish_source = "ocr_explicit";
        }
      }
    }
  }

  /** Find the closest diameter feature to an OCR dimension */
  private static findClosestDiameterFeature(
    features: ClassifiedFeature[],
    dim: OCRDimension,
  ): ClassifiedFeature | null {
    let best: ClassifiedFeature | null = null;
    let bestDist = Infinity;

    for (const f of features) {
      const fDia = f.od_mm || f.id_mm || 0;
      if (fDia <= 0) continue;
      const dist = Math.abs(fDia - dim.value_mm);
      if (dist < bestDist && dist < fDia * 0.1) {
        bestDist = dist;
        best = f;
      }
    }
    return best;
  }

  /** Parse thread pitch from callout string (e.g., "M12x1.75" → 1.75) */
  private static parseThreadPitch(callout: string): number | null {
    // Metric: M12x1.75
    const mMatch = callout.match(/[Mm](\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)/);
    if (mMatch) return parseFloat(mMatch[2]);

    // UNC/UNF: 1/2-13 → pitch = 25.4/13
    const uncMatch = callout.match(/(\d+(?:\/\d+)?)\s*-\s*(\d+)/);
    if (uncMatch) return 25.4 / parseFloat(uncMatch[2]);

    return null;
  }
}

/** Singleton instance */
export const turningFeatureTaxonomyEngine = new TurningFeatureTaxonomyEngine();
