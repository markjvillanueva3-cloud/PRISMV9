/**
 * AmbiguityResolutionEngine — Missing Data Detection + Default Application + User Prompting
 *
 * Analyzes extracted blueprint/CAD data for ambiguities and gaps:
 *   - Missing dimensions (no OD, no length, no material)
 *   - Unclear tolerances (general tolerance class missing)
 *   - Conflicting dimensions (overlapping features, impossible geometry)
 *   - Incomplete thread callouts
 *   - Surface finish gaps
 *
 * Classification:
 *   - can_proceed: apply ISO 2768-m defaults safely
 *   - must_ask: ambiguity too severe for safe defaults
 *
 * Generates user-friendly questions with context for each must-ask ambiguity.
 *
 * References:
 *   - ISO 2768-1:1989 (general tolerances for linear and angular dimensions)
 *   - ISO 2768-2:1989 (geometrical tolerances for features without individual tolerance)
 *   - ISO 1302:2002 (surface texture notation defaults)
 *   - ASME Y14.5-2018 §1.4 (fundamental rules — all dimensions must be specified)
 *
 * @module engines/AmbiguityResolutionEngine
 * @milestone LATHE-PRO-MS-1
 */

import { log } from "../utils/Logger.js";
import { generalToleranceLinear } from "./ToleranceEngine.js";
import type {
  TurningFeature,
  TurningFeatureType,
} from "./TurningPrintToProgramEngine.js";

// ============================================================================
// TYPES
// ============================================================================

export type AmbiguityType =
  | "missing_material"
  | "missing_od"
  | "missing_length"
  | "missing_bore_depth"
  | "missing_thread_pitch"
  | "missing_groove_width"
  | "missing_surface_finish"
  | "missing_tolerance_class"
  | "conflicting_dimensions"
  | "impossible_geometry"
  | "ambiguous_feature_type"
  | "incomplete_thread"
  | "no_datum_reference"
  | "unclear_bore_through_or_blind"
  | "missing_chamfer_spec"
  | "no_part_number";

export type AmbiguitySeverity = "info" | "warning" | "critical";

export interface Ambiguity {
  /** Unique ID for tracking */
  id: string;
  /** Ambiguity classification */
  type: AmbiguityType;
  /** Severity level */
  severity: AmbiguitySeverity;
  /** Which features are affected */
  affected_feature_ids: string[];
  /** Human-readable description */
  description: string;
  /** Whether we can safely apply a default and proceed */
  can_proceed: boolean;
  /** Default value to apply if can_proceed=true */
  default_value?: string;
  /** Default numeric value (for direct application) */
  default_numeric?: number;
  /** Confidence in the default (0-1) */
  default_confidence: number;
  /** User-friendly question to ask if must_ask */
  user_question?: string;
  /** Suggested options for the user */
  options?: string[];
  /** Reference standard for the default */
  reference?: string;
}

export interface AmbiguityResolutionInput {
  /** Features extracted so far */
  features: TurningFeature[];
  /** Whether material was specified */
  has_material: boolean;
  /** Material string (for validation) */
  material_callout?: string;
  /** Whether general tolerance class was found */
  has_general_tolerance: boolean;
  /** General tolerance class */
  general_tolerance_class?: "f" | "m" | "c" | "v";
  /** Whether any GD&T was found */
  has_gdt: boolean;
  /** Part number from title block */
  part_number?: string;
  /** Whether surface finish default was found */
  has_default_surface_finish: boolean;
  /** Default Ra (μm) */
  default_ra_um?: number;
  /** Part max OD from envelope */
  part_max_od_mm?: number;
  /** Part total length from envelope */
  part_total_length_mm?: number;
}

export interface AmbiguityResolutionResult {
  /** Total ambiguities found */
  total_ambiguities: number;
  /** Number that can proceed with defaults */
  can_proceed_count: number;
  /** Number that must ask the user */
  must_ask_count: number;
  /** Overall confidence score (0-100) */
  overall_confidence: number;
  /** All ambiguities */
  ambiguities: Ambiguity[];
  /** Defaults that were applied (for audit trail) */
  defaults_applied: Array<{
    feature_id: string;
    field: string;
    value: string;
    reference: string;
  }>;
  /** Summary suitable for display to user */
  user_summary: string;
}

// ISO 2768-1 general linear tolerances are now sourced from the canonical
// ToleranceEngine (`generalToleranceLinear`) — see `lookupISO2768Linear` below.
// The former private ISO_2768_LINEAR table here was a drifting duplicate that
// also carried 2 non-standard cells (a fabricated sub-0.5mm band and a v-class
// value for the 0.5–3mm band the standard leaves blank). De-duplicated in
// JULIETT-DB-COVERAGE-MS0 so there is a single source of truth.

/** Default surface finish by feature type (μm Ra) — conservative shop defaults */
const DEFAULT_RA_BY_FEATURE: Partial<Record<TurningFeatureType, number>> = {
  od_straight: 3.2,
  od_taper: 3.2,
  od_contour: 3.2,
  od_shoulder: 3.2,
  id_bore: 3.2,
  id_contour: 3.2,
  id_taper: 3.2,
  face: 3.2,
  thread_od: 1.6,
  thread_id: 1.6,
  groove_od: 3.2,
  groove_id: 3.2,
  groove_face: 3.2,
  groove_cutoff: 6.3,
  drill_through: 6.3,
  drill_blind: 6.3,
  part_off: 6.3,
};

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class AmbiguityResolutionEngine {

  /**
   * Analyze features and metadata for ambiguities, apply safe defaults,
   * and generate user questions for unresolvable gaps.
   *
   * @param input - Features and metadata from the intake pipeline
   * @returns Classified ambiguities with defaults and questions
   */
  resolve(input: AmbiguityResolutionInput): AmbiguityResolutionResult {
    const startMs = Date.now();
    const ambiguities: Ambiguity[] = [];
    const defaultsApplied: AmbiguityResolutionResult["defaults_applied"] = [];
    let ambIdx = 0;

    const tolClass = input.general_tolerance_class || "m";

    // ── Check 1: Material ──
    if (!input.has_material) {
      ambiguities.push({
        id: `AMB-${++ambIdx}`,
        type: "missing_material",
        severity: "critical",
        affected_feature_ids: input.features.map(f => f.id),
        description: "No material callout found in title block or notes.",
        can_proceed: false,
        default_confidence: 0,
        user_question: "What material is this part made from? (e.g., 4140, 303 Stainless, 6061-T6 Aluminum, Ti-6Al-4V)",
        options: ["4140 Steel", "1018 Steel", "303 Stainless", "304 Stainless", "6061-T6 Aluminum", "7075-T6 Aluminum", "Ti-6Al-4V", "Brass 360"],
        reference: "ASME Y14.5 §1.4 — material must be specified",
      });
    }

    // ── Check 2: Part number ──
    if (!input.part_number) {
      ambiguities.push({
        id: `AMB-${++ambIdx}`,
        type: "no_part_number",
        severity: "info",
        affected_feature_ids: [],
        description: "No part number found in title block.",
        can_proceed: true,
        default_value: "PRISM-AUTO-001",
        default_confidence: 0.3,
        reference: "Generated part number for traceability",
      });
      defaultsApplied.push({
        feature_id: "part",
        field: "part_number",
        value: "PRISM-AUTO-001",
        reference: "Auto-generated — no title block part number",
      });
    }

    // ── Check 3: General tolerance class ──
    if (!input.has_general_tolerance) {
      ambiguities.push({
        id: `AMB-${++ambIdx}`,
        type: "missing_tolerance_class",
        severity: "warning",
        affected_feature_ids: input.features.filter(f => f.tolerance_mm === undefined).map(f => f.id),
        description: "No general tolerance class specified. Applying ISO 2768-m (medium) as default.",
        can_proceed: true,
        default_value: "ISO 2768-m",
        default_confidence: 0.7,
        reference: "ISO 2768-1:1989 — class m is the most commonly used in general machining",
      });
    }

    // ── Check 4: Per-feature analysis ──
    for (const feature of input.features) {
      // 4a: Missing OD for OD features
      if (feature.type.startsWith("od") && !feature.od_mm) {
        ambiguities.push({
          id: `AMB-${++ambIdx}`,
          type: "missing_od",
          severity: "critical",
          affected_feature_ids: [feature.id],
          description: `Feature ${feature.id} (${feature.type}) has no outside diameter specified.`,
          can_proceed: false,
          default_confidence: 0,
          user_question: `What is the outside diameter for ${feature.type} feature ${feature.id}?`,
          options: [],
        });
      }

      // 4b: Missing bore diameter for ID features
      if (feature.type.startsWith("id") && !feature.id_mm && !feature.diameter_mm) {
        ambiguities.push({
          id: `AMB-${++ambIdx}`,
          type: "missing_od",
          severity: "critical",
          affected_feature_ids: [feature.id],
          description: `Feature ${feature.id} (${feature.type}) has no bore diameter specified.`,
          can_proceed: false,
          default_confidence: 0,
          user_question: `What is the bore diameter for ${feature.type} feature ${feature.id}?`,
        });
      }

      // 4c: Missing length
      if (feature.length_mm <= 0 && !feature.type.includes("face") && !feature.type.includes("chamfer")) {
        ambiguities.push({
          id: `AMB-${++ambIdx}`,
          type: "missing_length",
          severity: "warning",
          affected_feature_ids: [feature.id],
          description: `Feature ${feature.id} (${feature.type}) has no length specified.`,
          can_proceed: true,
          default_value: "10mm (assumed)",
          default_numeric: 10,
          default_confidence: 0.3,
          user_question: `What is the length of ${feature.type} feature ${feature.id}?`,
          reference: "Conservative default — verify before machining",
        });
        if (feature.length_mm <= 0) {
          feature.length_mm = 10;
          defaultsApplied.push({
            feature_id: feature.id,
            field: "length_mm",
            value: "10mm",
            reference: "Default — no dimension found for feature length",
          });
        }
      }

      // 4d: Missing thread pitch
      if (feature.type.includes("thread") && !feature.thread_pitch_mm) {
        ambiguities.push({
          id: `AMB-${++ambIdx}`,
          type: "incomplete_thread",
          severity: "critical",
          affected_feature_ids: [feature.id],
          description: `Thread feature ${feature.id} has no pitch specified.`,
          can_proceed: false,
          default_confidence: 0,
          user_question: `What is the thread specification for feature ${feature.id}? (e.g., M12x1.75, 1/2-13 UNC)`,
          options: ["M6x1.0", "M8x1.25", "M10x1.5", "M12x1.75", "M16x2.0", "M20x2.5",
                    "1/4-20 UNC", "5/16-18 UNC", "3/8-16 UNC", "1/2-13 UNC", "3/4-10 UNC"],
        });
      }

      // 4e: Missing groove width
      if (feature.type.includes("groove") && !feature.groove_width_mm && !feature.width_mm) {
        ambiguities.push({
          id: `AMB-${++ambIdx}`,
          type: "missing_groove_width",
          severity: "warning",
          affected_feature_ids: [feature.id],
          description: `Groove feature ${feature.id} has no width specified.`,
          can_proceed: true,
          default_value: "3mm (standard insert width)",
          default_numeric: 3,
          default_confidence: 0.5,
          user_question: `What is the groove width for feature ${feature.id}?`,
          reference: "3mm matches common grooving insert widths (ISCAR GFN 3)",
        });
        if (!feature.groove_width_mm) {
          feature.groove_width_mm = 3;
          defaultsApplied.push({
            feature_id: feature.id,
            field: "groove_width_mm",
            value: "3mm",
            reference: "Default — standard grooving insert width",
          });
        }
      }

      // 4f: Missing bore depth (blind bore)
      if (feature.type === "id_bore" && !feature.depth_mm && feature.length_mm <= 0) {
        ambiguities.push({
          id: `AMB-${++ambIdx}`,
          type: "unclear_bore_through_or_blind",
          severity: "warning",
          affected_feature_ids: [feature.id],
          description: `Bore ${feature.id} — unclear if through-bore or blind. No depth specified.`,
          can_proceed: true,
          default_value: "Assumed through-bore",
          default_confidence: 0.5,
          user_question: `Is bore ${feature.id} (Ø${feature.id_mm || feature.diameter_mm || "?"}mm) a through-bore or blind bore? If blind, what depth?`,
          options: ["Through-bore", "Blind — specify depth"],
        });
      }

      // 4g: Apply tolerance defaults (ISO 2768)
      if (feature.tolerance_mm === undefined) {
        const nominal = feature.od_mm || feature.id_mm || feature.diameter_mm || feature.length_mm;
        if (nominal > 0) {
          const tol = this.lookupISO2768Linear(nominal, tolClass);
          feature.tolerance_mm = tol;
          defaultsApplied.push({
            feature_id: feature.id,
            field: "tolerance_mm",
            value: `±${tol}mm`,
            reference: `ISO 2768-1:1989 class ${tolClass}`,
          });
        }
      }

      // 4h: Apply surface finish defaults
      if (feature.surface_finish_Ra_um === undefined) {
        const defaultRa = input.default_ra_um || DEFAULT_RA_BY_FEATURE[feature.type] || 3.2;
        feature.surface_finish_Ra_um = defaultRa;
        defaultsApplied.push({
          feature_id: feature.id,
          field: "surface_finish_Ra_um",
          value: `Ra ${defaultRa} μm`,
          reference: input.default_ra_um
            ? "Title block default surface finish"
            : "Shop standard — verify for critical surfaces",
        });
      }
    }

    // ── Check 5: Conflicting dimensions ──
    const odFeatures = input.features.filter(f => f.type.startsWith("od") && f.od_mm);
    for (let i = 0; i < odFeatures.length; i++) {
      for (let j = i + 1; j < odFeatures.length; j++) {
        const a = odFeatures[i];
        const b = odFeatures[j];
        // Check for overlapping Z positions with different ODs (could be valid step)
        if (a.position_z_mm !== undefined && b.position_z_mm !== undefined) {
          const aEnd = a.position_z_mm + a.length_mm;
          const bEnd = b.position_z_mm + b.length_mm;
          const overlap = Math.min(aEnd, bEnd) - Math.max(a.position_z_mm, b.position_z_mm);
          if (overlap > 0.5 && Math.abs((a.od_mm || 0) - (b.od_mm || 0)) > 0.1) {
            // Two different ODs at the same Z — could be valid (step) or conflicting
            if (Math.abs(overlap - a.length_mm) < 0.5 || Math.abs(overlap - b.length_mm) < 0.5) {
              // Nearly complete overlap → conflict
              ambiguities.push({
                id: `AMB-${++ambIdx}`,
                type: "conflicting_dimensions",
                severity: "warning",
                affected_feature_ids: [a.id, b.id],
                description: `Features ${a.id} (Ø${a.od_mm}mm) and ${b.id} (Ø${b.od_mm}mm) overlap at Z=${a.position_z_mm?.toFixed(1)}mm — conflicting diameters.`,
                can_proceed: true,
                default_value: `Using larger OD (Ø${Math.max(a.od_mm || 0, b.od_mm || 0)}mm)`,
                default_confidence: 0.4,
                user_question: `Two features overlap at Z≈${a.position_z_mm?.toFixed(1)}mm with different diameters (Ø${a.od_mm}mm vs Ø${b.od_mm}mm). Which is correct?`,
                options: [`Ø${a.od_mm}mm (${a.id})`, `Ø${b.od_mm}mm (${b.id})`, "Both — they are a step"],
              });
            }
          }
        }
      }
    }

    // ── Check 6: Impossible geometry ──
    if (input.part_max_od_mm && input.part_total_length_mm) {
      const lDRatio = input.part_total_length_mm / input.part_max_od_mm;
      if (lDRatio > 10) {
        ambiguities.push({
          id: `AMB-${++ambIdx}`,
          type: "impossible_geometry",
          severity: "warning",
          affected_feature_ids: [],
          description: `L/D ratio = ${lDRatio.toFixed(1)} — very slender part. Requires tailstock support and may need steady rest.`,
          can_proceed: true,
          default_value: "Tailstock support enabled",
          default_confidence: 0.9,
          reference: "L/D > 3 typically needs tailstock; L/D > 6 may need steady rest",
        });
      }

      // Check for bore depth vs OD (thin wall warning)
      const boreFeatures = input.features.filter(f => f.type.startsWith("id") && (f.id_mm || f.diameter_mm));
      for (const bore of boreFeatures) {
        const boreOD = bore.id_mm || bore.diameter_mm || 0;
        if (input.part_max_od_mm > 0 && boreOD > 0) {
          const wallThickness = (input.part_max_od_mm - boreOD) / 2;
          if (wallThickness < 2 && wallThickness > 0) {
            ambiguities.push({
              id: `AMB-${++ambIdx}`,
              type: "impossible_geometry",
              severity: "warning",
              affected_feature_ids: [bore.id],
              description: `Thin wall: OD=${input.part_max_od_mm}mm, bore=${boreOD}mm → wall=${wallThickness.toFixed(1)}mm. Risk of chatter/distortion.`,
              can_proceed: true,
              default_value: "Reduced DOC + spring pass recommended",
              default_confidence: 0.8,
              reference: "Wall thickness < 2mm requires special machining strategy",
            });
          }
        }
      }
    }

    // ── Check 7: Missing default surface finish (drawing-level) ──
    if (!input.has_default_surface_finish) {
      ambiguities.push({
        id: `AMB-${++ambIdx}`,
        type: "missing_surface_finish",
        severity: "info",
        affected_feature_ids: [],
        description: "No default surface finish specified on drawing. Applied Ra 3.2 μm (N8) as shop default.",
        can_proceed: true,
        default_value: "Ra 3.2 μm (N8)",
        default_confidence: 0.7,
        reference: "ISO 1302 — Ra 3.2 μm (N8) is standard machining finish",
      });
    }

    // ── Compute overall confidence ──
    const criticalCount = ambiguities.filter(a => a.severity === "critical").length;
    const warningCount = ambiguities.filter(a => a.severity === "warning").length;
    const mustAskCount = ambiguities.filter(a => !a.can_proceed).length;
    const canProceedCount = ambiguities.filter(a => a.can_proceed).length;

    // Confidence: start at 100, deduct per issue
    let confidence = 100;
    confidence -= criticalCount * 25;
    confidence -= warningCount * 5;
    confidence -= mustAskCount * 15;
    confidence = Math.max(0, Math.min(100, confidence));

    // ── Build user summary ──
    const summaryParts: string[] = [];
    if (mustAskCount > 0) {
      summaryParts.push(`${mustAskCount} question(s) require your input before proceeding`);
    }
    if (canProceedCount > 0) {
      summaryParts.push(`${canProceedCount} gap(s) resolved with safe defaults`);
    }
    if (defaultsApplied.length > 0) {
      summaryParts.push(`${defaultsApplied.length} default value(s) applied`);
    }
    const userSummary = summaryParts.length > 0
      ? summaryParts.join(". ") + "."
      : "No ambiguities detected — drawing is fully specified.";

    const elapsed = Date.now() - startMs;
    log.info(`[AmbiguityResolution] ${ambiguities.length} ambiguities (${mustAskCount} must-ask, ${canProceedCount} can-proceed), confidence=${confidence}% in ${elapsed}ms`);

    return {
      total_ambiguities: ambiguities.length,
      can_proceed_count: canProceedCount,
      must_ask_count: mustAskCount,
      overall_confidence: confidence,
      ambiguities,
      defaults_applied: defaultsApplied,
      user_summary: userSummary,
    };
  }

  // ── Private Helpers ──────────────────────────────────────────────

  /**
   * Look up ISO 2768-1 linear general tolerance (±mm) for a nominal + class.
   * Delegates to the canonical ToleranceEngine source (single source of truth).
   * This intake helper must ALWAYS return a usable number (never throw), so it
   * clamps the nominal into the tabulated 0.5–4000 mm range and falls back to
   * the coarsest tabulated class ("c") when the requested class is blank in the
   * standard for that band (v for ≤3 mm, f for >2000 mm).
   */
  private lookupISO2768Linear(nominal: number, tolClass: "f" | "m" | "c" | "v"): number {
    const clamped = Math.min(Math.max(Math.abs(nominal), 0.5), 4000);
    try {
      return generalToleranceLinear(clamped, tolClass).plusMinus_mm;
    } catch {
      return generalToleranceLinear(clamped, "c").plusMinus_mm;
    }
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const ambiguityResolutionEngine = new AmbiguityResolutionEngine();
