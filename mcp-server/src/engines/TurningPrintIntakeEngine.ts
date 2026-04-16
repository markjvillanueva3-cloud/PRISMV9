/**
 * TurningPrintIntakeEngine — Blueprint OCR to TurningFeature[] Converter
 *
 * Takes BlueprintVisionOCREngine output (BlueprintVisionResult) and converts
 * it into structured TurningFeature[] + TurningInput compatible with
 * TurningPrintToProgramEngine.
 *
 * Pipeline:
 *   photo/PDF → BlueprintVisionOCREngine → BlueprintVisionResult
 *     → TurningPrintIntakeEngine → TurningInput → TurningPrintToProgramEngine
 *
 * Handles:
 *   - Dimension → TurningFeature conversion (diameters, lengths, threads, grooves)
 *   - GD&T → tolerance requirements on features
 *   - Title block → material, part number, surface finish defaults
 *   - Profile geometry → G71/G70 contour points
 *   - ISO 2768-m general tolerance application for un-toleranced dimensions
 *
 * References:
 *   - ISO 128 (technical drawing conventions)
 *   - ASME Y14.5-2018 (GD&T)
 *   - ISO 2768-1/-2 (general tolerances)
 *   - ISO 1302 (surface texture notation)
 *
 * @module engines/TurningPrintIntakeEngine
 * @milestone LATHE-PRO-MS-1
 */

import { log } from "../utils/Logger.js";
import type {
  BlueprintVisionResult,
  ExtractedProfile,
  BlueprintVisionInput,
} from "./BlueprintVisionOCREngine.js";
import type {
  ExtractedDimension,
  ExtractedGDT,
  TitleBlockData,
  BlueprintAnalysis,
  DimensionType,
} from "./BlueprintOCREngine.js";
import type {
  TurningFeature,
  TurningFeatureType,
  TurningInput,
  TurningMaterial,
} from "./TurningPrintToProgramEngine.js";
import { materialCalloutParserEngine } from "./MaterialCalloutParserEngine.js";
import { toleranceExtractionEngine } from "./ToleranceExtractionEngine.js";

// ============================================================================
// TYPES
// ============================================================================

/** Result of the intake process — structured data ready for the turning pipeline */
export interface TurningIntakeResult {
  /** Whether conversion succeeded */
  success: boolean;
  /** Structured turning input ready for TurningPrintToProgramEngine */
  turning_input: TurningInput;
  /** Features extracted from the blueprint */
  features: TurningFeature[];
  /** Material parsed from title block */
  material: TurningMaterial;
  /** Dimensions that could not be mapped to features */
  unmapped_dimensions: ExtractedDimension[];
  /** Ambiguities requiring user confirmation */
  ambiguities: IntakeAmbiguity[];
  /** Warnings generated during conversion */
  warnings: IntakeWarning[];
  /** Statistics about the extraction */
  stats: {
    total_dimensions: number;
    mapped_features: number;
    unmapped_dimensions: number;
    gdt_applied: number;
    default_tolerances_applied: number;
    profiles_converted: number;
    confidence_avg: number;
  };
}

export interface IntakeAmbiguity {
  type: "missing_material" | "missing_dimension" | "conflicting_dims" | "unclear_tolerance"
    | "unknown_thread" | "missing_od" | "no_features";
  message: string;
  can_proceed_with_default: boolean;
  default_value?: string;
  affected_feature_ids: string[];
}

export interface IntakeWarning {
  stage: string;
  severity: "info" | "warning" | "critical";
  message: string;
}

/** Input for the intake engine — either a full VisionResult or a BlueprintAnalysis */
export interface TurningIntakeInput {
  /** Blueprint analysis result from BlueprintVisionOCREngine or BlueprintOCREngine */
  blueprint: BlueprintVisionResult | BlueprintAnalysis;
  /** Machine constraints (optional — defaults applied if omitted) */
  machine?: {
    max_spindle_rpm?: number;
    max_power_kW?: number;
    brand?: string;
    model?: string;
    controller?: "fanuc" | "haas" | "mazak" | "okuma" | "siemens";
    max_bar_od_mm?: number;
    has_tailstock?: boolean;
    has_sub_spindle?: boolean;
  };
  /** Bar stock override (auto-computed from max OD if omitted) */
  bar_stock_od_mm?: number;
  /** Optimization preference */
  optimization_target?: "balanced" | "max_speed" | "max_tool_life" | "min_cost" | "surface_quality";
}

// ============================================================================
// ISO 2768-1 GENERAL TOLERANCES (mm) — Class m (medium)
// Reference: ISO 2768-1:1989, Table 1
// ============================================================================

const ISO_2768_M_LINEAR: Array<{ up_to_mm: number; tolerance_mm: number }> = [
  { up_to_mm: 0.5,   tolerance_mm: 0.05 },
  { up_to_mm: 3,     tolerance_mm: 0.10 },
  { up_to_mm: 6,     tolerance_mm: 0.10 },
  { up_to_mm: 30,    tolerance_mm: 0.20 },
  { up_to_mm: 120,   tolerance_mm: 0.30 },
  { up_to_mm: 400,   tolerance_mm: 0.50 },
  { up_to_mm: 1000,  tolerance_mm: 0.80 },
  { up_to_mm: 2000,  tolerance_mm: 1.20 },
];

/** Look up ISO 2768-m general tolerance for a given nominal dimension */
function iso2768mTolerance(nominal_mm: number): number {
  const abs = Math.abs(nominal_mm);
  for (const band of ISO_2768_M_LINEAR) {
    if (abs <= band.up_to_mm) return band.tolerance_mm;
  }
  return 1.20; // >2000mm
}

// ============================================================================
// DIMENSION TYPE → TURNING FEATURE TYPE MAPPING
// ============================================================================

/**
 * Classify a dimension into a TurningFeatureType based on its DimensionType,
 * location hints, and nominal value context.
 */
function classifyDimension(
  dim: ExtractedDimension,
  allDims: ExtractedDimension[],
): { featureType: TurningFeatureType; isOD: boolean; isID: boolean } {
  const hint = (dim.location_hint || "").toLowerCase();
  const raw = (dim.raw_text || "").toLowerCase();

  // Thread detection
  if (dim.type === "thread" || raw.includes("thread") || /m\d+(\.\d+)?x/.test(raw)
      || /\d+[-/]\d+\s*(unf|unc|un|tpi)/i.test(raw)) {
    const isInternal = hint.includes("internal") || hint.includes("bore") || hint.includes("id");
    return { featureType: isInternal ? "thread_id" : "thread_od", isOD: !isInternal, isID: isInternal };
  }

  // Groove / undercut
  if (hint.includes("groove") || hint.includes("undercut") || hint.includes("relief")) {
    if (hint.includes("face")) return { featureType: "groove_face", isOD: false, isID: false };
    if (hint.includes("id") || hint.includes("bore")) return { featureType: "groove_id", isOD: false, isID: true };
    return { featureType: "groove_od", isOD: true, isID: false };
  }

  // Chamfer
  if (dim.type === "chamfer" || hint.includes("chamfer") || /\d+\s*[x×]\s*45/.test(raw)) {
    return { featureType: "od_contour", isOD: true, isID: false };
  }

  // Diameter types
  if (dim.type === "diameter") {
    if (hint.includes("bore") || hint.includes("id") || hint.includes("internal") || hint.includes("hole")) {
      return { featureType: "id_bore", isOD: false, isID: true };
    }
    return { featureType: "od_straight", isOD: true, isID: false };
  }

  // Depth — typically a bore or face feature
  if (dim.type === "depth") {
    return { featureType: "id_bore", isOD: false, isID: true };
  }

  // Radius
  if (dim.type === "radius") {
    return { featureType: "od_contour", isOD: true, isID: false };
  }

  // Angular — taper
  if (dim.type === "angular") {
    if (hint.includes("bore") || hint.includes("id")) {
      return { featureType: "id_taper", isOD: false, isID: true };
    }
    return { featureType: "od_taper", isOD: true, isID: false };
  }

  // Linear — context-dependent
  if (dim.type === "linear") {
    if (hint.includes("face") || hint.includes("length") || hint.includes("overall")) {
      return { featureType: "face", isOD: false, isID: false };
    }
    if (hint.includes("bore") || hint.includes("id")) {
      return { featureType: "id_bore", isOD: false, isID: true };
    }
    // Default: treat as OD straight (most common turning feature)
    return { featureType: "od_straight", isOD: true, isID: false };
  }

  // Counterbore/countersink
  if (dim.type === "counterbore" || dim.type === "countersink") {
    return { featureType: "id_bore", isOD: false, isID: true };
  }

  // Default fallback
  return { featureType: "od_straight", isOD: true, isID: false };
}

// ============================================================================
// PROFILE → TURNING FEATURE CONVERSION
// ============================================================================

/**
 * Convert extracted 2D profiles to TurningFeature with profile_points for G71/G70.
 * Assumes profiles are XY where X=radial (diameter), Y=axial (Z).
 */
function profileToTurningFeature(
  profile: ExtractedProfile,
  index: number,
): TurningFeature | null {
  if (!profile.points || profile.points.length < 2) return null;

  // Convert profile points to G71/G70 format: X=diameter, Z=axial
  const profilePoints = profile.points.map(pt => ({
    X: Math.abs(pt.x) * 2, // Convert radius to diameter
    Z: pt.y,
    type: "linear" as const,
  }));

  const maxX = Math.max(...profilePoints.map(p => p.X));
  const minZ = Math.min(...profilePoints.map(p => p.Z));
  const maxZ = Math.max(...profilePoints.map(p => p.Z));
  const length = Math.abs(maxZ - minZ);

  const featureType: TurningFeatureType = profile.type === "internal" ? "id_contour" : "od_contour";

  return {
    id: `PROF-${index + 1}`,
    type: featureType,
    od_mm: maxX,
    length_mm: length,
    profile_points: profilePoints,
  };
}

// ============================================================================
// MATERIAL PARSING (basic — full parser is MaterialCalloutParserEngine)
// ============================================================================

/** ISO group classification from common material names */
const MATERIAL_ISO_MAP: Record<string, "P" | "M" | "K" | "N" | "S" | "H"> = {
  // P — Carbon/alloy steels
  "steel": "P", "1018": "P", "1020": "P", "1045": "P", "4130": "P", "4140": "P",
  "4340": "P", "8620": "P", "a36": "P", "1215": "P", "12l14": "P",
  // M — Stainless steels
  "stainless": "M", "ss": "M", "303": "M", "304": "M", "316": "M", "316l": "M",
  "17-4": "M", "17-4ph": "M", "410": "M", "420": "M", "440c": "M",
  // K — Cast iron
  "cast iron": "K", "cast": "K", "ductile": "K", "gray iron": "K",
  "a48": "K", "a536": "K", "80-55-06": "K",
  // N — Non-ferrous
  "aluminum": "N", "aluminium": "N", "al": "N", "6061": "N", "7075": "N",
  "2024": "N", "brass": "N", "bronze": "N", "copper": "N", "nylon": "N",
  "delrin": "N", "acetal": "N", "peek": "N", "plastic": "N",
  // S — Superalloys
  "inconel": "S", "hastelloy": "S", "waspaloy": "S", "titanium": "S",
  "ti": "S", "ti-6al-4v": "S", "ti6al4v": "S", "monel": "S", "nimonic": "S",
  // H — Hardened
  "hardened": "H", "d2": "H", "m2": "H", "h13": "H", "s7": "H",
  "a2": "H", "o1": "H", "cpm": "H",
};

/**
 * Basic material classification from title block string.
 * For deep parsing, use MaterialCalloutParserEngine (U-LPI02).
 */
function classifyMaterial(materialStr: string): TurningMaterial {
  if (!materialStr) {
    return { material_name: "Unknown", iso_group: "P" };
  }

  const lower = materialStr.toLowerCase().trim();
  let iso: "P" | "M" | "K" | "N" | "S" | "H" = "P"; // Default to steel

  // Check hardness — any material >45 HRC is ISO H
  const hrcMatch = lower.match(/(\d+)\s*[-–]\s*(\d+)\s*hrc/i) || lower.match(/(\d+)\s*hrc/i);
  let hardness_hrc: number | undefined;
  if (hrcMatch) {
    hardness_hrc = hrcMatch[2] ? Math.round((parseInt(hrcMatch[1]) + parseInt(hrcMatch[2])) / 2)
                                : parseInt(hrcMatch[1]);
    if (hardness_hrc >= 45) iso = "H";
  }

  // Check against known materials
  if (iso !== "H") {
    for (const [key, group] of Object.entries(MATERIAL_ISO_MAP)) {
      if (lower.includes(key)) {
        iso = group;
        break;
      }
    }
  }

  return {
    material_name: materialStr.trim(),
    iso_group: iso,
    hardness_hrc,
  };
}

// ============================================================================
// THREAD PITCH PARSING
// ============================================================================

/** Parse thread callout strings like "M12x1.75", "1/2-13 UNC", "M8x1" */
function parseThreadPitch(raw: string): { pitch_mm: number; class?: string; starts?: number } | null {
  // Metric: M12x1.75, M8x1, M20x2.5
  const metricMatch = raw.match(/m(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)/i);
  if (metricMatch) {
    return { pitch_mm: parseFloat(metricMatch[2]) };
  }

  // Imperial UNC/UNF: 1/2-13 UNC, 3/8-24 UNF, #10-32 UNF
  const impMatch = raw.match(/(\d+(?:\/\d+)?)\s*[-–]\s*(\d+)\s*(UNC|UNF|UNEF|UN)/i);
  if (impMatch) {
    const tpi = parseInt(impMatch[2]);
    return { pitch_mm: 25.4 / tpi, class: impMatch[3].toUpperCase() };
  }

  // Pipe thread: NPT, BSPT
  if (/npt|bspt/i.test(raw)) {
    const sizeMatch = raw.match(/(\d+(?:\/\d+)?)\s*(?:"|in)?\s*(?:npt|bspt)/i);
    if (sizeMatch) {
      // NPT TPI lookup (common sizes)
      const nptTpi: Record<string, number> = {
        "1/8": 27, "1/4": 18, "3/8": 18, "1/2": 14, "3/4": 14,
        "1": 11.5, "1-1/4": 11.5, "1-1/2": 11.5, "2": 11.5,
      };
      const tpi = nptTpi[sizeMatch[1]] || 14;
      return { pitch_mm: 25.4 / tpi, class: "NPT" };
    }
  }

  return null;
}

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class TurningPrintIntakeEngine {

  /**
   * Convert a BlueprintVisionResult into TurningInput for the turning pipeline.
   *
   * @param input - Blueprint analysis + optional machine constraints
   * @returns Structured TurningInput with features, material, and tolerances
   */
  async convertBlueprint(input: TurningIntakeInput): Promise<TurningIntakeResult> {
    const startMs = Date.now();
    const warnings: IntakeWarning[] = [];
    const ambiguities: IntakeAmbiguity[] = [];
    const unmapped: ExtractedDimension[] = [];

    const bp = input.blueprint;
    const dims = bp.dimensions;
    const gdts = bp.gdt_frames;
    const titleBlock = bp.title_block;
    const profiles = "profiles" in bp ? (bp as BlueprintVisionResult).profiles : [];

    log.info(`[TurningPrintIntake] Processing ${dims.length} dimensions, ${gdts.length} GD&T frames, ${profiles.length} profiles`);

    // ── Step 1: Parse material via MaterialCalloutParserEngine ─────
    const materialCallouts: string[] = [];
    if (titleBlock.material) materialCallouts.push(titleBlock.material);
    // Also check material notes
    for (const note of bp.notes) {
      if (note.category === "material") materialCallouts.push(note.text);
    }

    let material: TurningMaterial;
    if (materialCallouts.length > 0) {
      const parsed = materialCalloutParserEngine.parseBest(materialCallouts);
      material = parsed.material;
      for (const w of parsed.warnings) {
        warnings.push({ stage: "material_parse", severity: "warning", message: w });
      }
      if (parsed.cross_references.length > 0) {
        warnings.push({
          stage: "material_parse",
          severity: "info",
          message: `Cross-refs: ${parsed.cross_references.join(", ")}`,
        });
      }
    } else {
      material = classifyMaterial("");
      ambiguities.push({
        type: "missing_material",
        message: "No material specified in title block or notes. Defaulting to ISO P (carbon steel).",
        can_proceed_with_default: true,
        default_value: "ISO P - Carbon Steel",
        affected_feature_ids: [],
      });
    }

    // ── Step 2: Extract default surface finish from title block ──────
    const defaultRa = this.extractDefaultRa(titleBlock, bp.notes);

    // ── Step 3: Convert dimensions to TurningFeature[] ──────────────
    const features: TurningFeature[] = [];
    let featureIndex = 0;

    // Group related dimensions (e.g., a diameter + length pair)
    const dimGroups = this.groupRelatedDimensions(dims);

    for (const group of dimGroups) {
      const primary = group[0];
      const { featureType, isOD, isID } = classifyDimension(primary, dims);

      const feature: TurningFeature = {
        id: `F-${++featureIndex}`,
        type: featureType,
        length_mm: 0,
      };

      // Apply dimensions from the group
      for (const dim of group) {
        this.applyDimensionToFeature(feature, dim, isOD, isID);
      }

      // Apply GD&T tolerances
      this.applyGDTToFeature(feature, gdts, warnings);

      // Apply ISO 2768-m defaults for un-toleranced features
      if (feature.tolerance_mm === undefined && feature.od_mm) {
        feature.tolerance_mm = iso2768mTolerance(feature.od_mm);
        warnings.push({
          stage: "tolerance_default",
          severity: "info",
          message: `Applied ISO 2768-m tolerance ±${feature.tolerance_mm}mm to ${feature.id} (${feature.type})`,
        });
      }

      // Apply default surface finish
      if (feature.surface_finish_Ra_um === undefined && defaultRa) {
        feature.surface_finish_Ra_um = defaultRa;
      }

      // Thread pitch parsing
      if (feature.type.includes("thread")) {
        const threadDim = group.find(d => d.type === "thread" || /m\d+|un[cf]|npt/i.test(d.raw_text));
        if (threadDim) {
          const threadData = parseThreadPitch(threadDim.raw_text);
          if (threadData) {
            feature.thread_pitch_mm = threadData.pitch_mm;
            feature.thread_class = threadData.class;
            feature.thread_starts = threadData.starts;
          }
        }
      }

      // Validate minimum data
      if (feature.length_mm > 0 || feature.od_mm || feature.id_mm
          || feature.type.includes("thread") || feature.taper_angle_deg) {
        features.push(feature);
      } else {
        unmapped.push(primary);
      }
    }

    // ── Step 4: Convert profiles to contour features ─────────────────
    let profilesConverted = 0;
    for (let i = 0; i < profiles.length; i++) {
      const contourFeature = profileToTurningFeature(profiles[i], i);
      if (contourFeature) {
        features.push(contourFeature);
        profilesConverted++;
      }
    }

    // ── Step 4b: Run ToleranceExtractionEngine for strategy data ─────
    const generalTolClass = this.detectGeneralToleranceClass(titleBlock);
    const tolResult = toleranceExtractionEngine.extract(dims, gdts, generalTolClass);
    // Apply tolerance strategies back to features
    for (const ft of tolResult.feature_tolerances) {
      const match = features.find(f => f.id === ft.feature_id);
      if (match && ft.strategy.implied_ra_um !== undefined) {
        // Tighter Ra wins
        if (match.surface_finish_Ra_um === undefined || ft.strategy.implied_ra_um < match.surface_finish_Ra_um) {
          match.surface_finish_Ra_um = ft.strategy.implied_ra_um;
        }
      }
    }
    for (const w of tolResult.warnings) {
      warnings.push({ stage: "tolerance_extraction", severity: "warning", message: w });
    }

    // ── Step 5: Compute part envelope ────────────────────────────────
    const maxOD = Math.max(0, ...features.filter(f => f.od_mm).map(f => f.od_mm!));
    const maxLength = Math.max(0, ...features.map(f => f.length_mm));
    const partBounds = "part_bounds_mm" in bp ? (bp as BlueprintVisionResult).part_bounds_mm : undefined;

    const partLength = partBounds?.height || maxLength || 50; // fallback
    const partOD = partBounds?.width || maxOD || 25; // fallback

    // Bar stock: next standard size up from max OD + 2mm allowance
    const barStockOD = input.bar_stock_od_mm || this.selectBarStock(partOD);

    if (features.length === 0) {
      ambiguities.push({
        type: "no_features",
        message: "No turning features could be extracted from the blueprint. Manual feature entry required.",
        can_proceed_with_default: false,
        affected_feature_ids: [],
      });
    }

    // ── Step 6: Build TurningInput ──────────────────────────────────
    const turningInput: TurningInput = {
      part_number: titleBlock.part_number || "INTAKE-001",
      material,
      bar_stock_od_mm: barStockOD,
      finished_od_mm: partOD,
      part_length_mm: partLength,
      features,
      chuck_type: input.machine?.has_sub_spindle ? "collet" : "3_jaw",
      max_spindle_rpm: input.machine?.max_spindle_rpm || 4000,
      max_power_kW: input.machine?.max_power_kW || 15,
      machine_brand: input.machine?.brand,
      machine_model: input.machine?.model,
      optimization_target: input.optimization_target || "balanced",
      tailstock: input.machine?.has_tailstock ?? (partLength / partOD > 3),
      sub_spindle: input.machine?.has_sub_spindle || false,
      controller: input.machine?.controller || "fanuc",
    };

    // ── Step 7: Compute stats ────────────────────────────────────────
    const confidences = dims.map(d => d.confidence);
    const avgConfidence = confidences.length > 0
      ? confidences.reduce((a, b) => a + b, 0) / confidences.length
      : 0;

    const gdsApplied = features.filter(f =>
      f.surface_finish_Ra_um !== undefined && f.surface_finish_Ra_um !== defaultRa
    ).length;

    const defaultTolsApplied = warnings.filter(w => w.stage === "tolerance_default").length;

    const elapsed = Date.now() - startMs;
    log.info(`[TurningPrintIntake] Complete: ${features.length} features, ${unmapped.length} unmapped, ${ambiguities.length} ambiguities in ${elapsed}ms`);

    return {
      success: features.length > 0,
      turning_input: turningInput,
      features,
      material,
      unmapped_dimensions: unmapped,
      ambiguities,
      warnings,
      stats: {
        total_dimensions: dims.length,
        mapped_features: features.length,
        unmapped_dimensions: unmapped.length,
        gdt_applied: gdsApplied,
        default_tolerances_applied: defaultTolsApplied,
        profiles_converted: profilesConverted,
        confidence_avg: Math.round(avgConfidence * 100) / 100,
      },
    };
  }

  // ── Private Helpers ──────────────────────────────────────────────────

  /** Extract default Ra from title block or notes */
  private extractDefaultRa(titleBlock: TitleBlockData, notes: BlueprintAnalysis["notes"]): number | undefined {
    // Check title block finish field
    if (titleBlock.finish) {
      const raMatch = titleBlock.finish.match(/ra\s*(\d+(?:\.\d+)?)/i)
        || titleBlock.finish.match(/(\d+(?:\.\d+)?)\s*[μu]m/i);
      if (raMatch) return parseFloat(raMatch[1]);

      // Common surface finish symbols
      const finishMap: Record<string, number> = {
        "n4": 0.2, "n5": 0.4, "n6": 0.8, "n7": 1.6, "n8": 3.2, "n9": 6.3, "n10": 12.5,
      };
      const lower = titleBlock.finish.toLowerCase();
      for (const [sym, ra] of Object.entries(finishMap)) {
        if (lower.includes(sym)) return ra;
      }
    }

    // Check notes for surface finish
    const finishNotes = notes.filter(n => n.category === "finish" || n.text.toLowerCase().includes("surface finish"));
    for (const note of finishNotes) {
      const raMatch = note.text.match(/ra\s*(\d+(?:\.\d+)?)/i);
      if (raMatch) return parseFloat(raMatch[1]);
    }

    return undefined;
  }

  /** Detect ISO 2768 general tolerance class from title block */
  private detectGeneralToleranceClass(titleBlock: TitleBlockData): "f" | "m" | "c" | "v" {
    const genTol = (titleBlock.general_tolerance || "").toLowerCase();
    if (genTol.includes("2768") || genTol.includes("general")) {
      if (/\bf\b/.test(genTol)) return "f";
      if (/\bm\b/.test(genTol)) return "m";
      if (/\bc\b/.test(genTol)) return "c";
      if (/\bv\b/.test(genTol)) return "v";
    }
    return "m"; // Default: ISO 2768-m (medium)
  }

  /**
   * Group dimensions that likely refer to the same feature.
   * For turning: a diameter + length pair at the same location → one feature.
   */
  private groupRelatedDimensions(dims: ExtractedDimension[]): ExtractedDimension[][] {
    const used = new Set<number>();
    const groups: ExtractedDimension[][] = [];

    // Sort: diameters first (they're the primary feature identifier in turning)
    const sorted = [...dims].sort((a, b) => {
      const aPriority = a.type === "diameter" ? 0 : a.type === "thread" ? 1 : 2;
      const bPriority = b.type === "diameter" ? 0 : b.type === "thread" ? 1 : 2;
      return aPriority - bPriority;
    });

    for (let i = 0; i < sorted.length; i++) {
      if (used.has(i)) continue;
      const group: ExtractedDimension[] = [sorted[i]];
      used.add(i);

      // Find related dimensions (same location hint or complementary type)
      const hint = (sorted[i].location_hint || "").toLowerCase();
      for (let j = i + 1; j < sorted.length; j++) {
        if (used.has(j)) continue;
        const otherHint = (sorted[j].location_hint || "").toLowerCase();

        // Match by shared location keywords
        if (hint && otherHint && this.hintOverlap(hint, otherHint)) {
          group.push(sorted[j]);
          used.add(j);
        }
      }

      groups.push(group);
    }

    return groups;
  }

  /** Check if two location hints refer to the same feature */
  private hintOverlap(a: string, b: string): boolean {
    const wordsA = new Set(a.split(/\s+/).filter(w => w.length > 2));
    const wordsB = new Set(b.split(/\s+/).filter(w => w.length > 2));
    let overlap = 0;
    for (const w of wordsA) {
      if (wordsB.has(w)) overlap++;
    }
    return overlap >= 1 && overlap / Math.min(wordsA.size, wordsB.size) > 0.3;
  }

  /** Apply a dimension to a TurningFeature */
  private applyDimensionToFeature(
    feature: TurningFeature,
    dim: ExtractedDimension,
    isOD: boolean,
    isID: boolean,
  ): void {
    const val = dim.unit === "in" ? dim.nominal * 25.4 : dim.nominal;

    switch (dim.type) {
      case "diameter":
        if (isOD) feature.od_mm = val;
        else if (isID) feature.id_mm = val;
        feature.diameter_mm = val;
        break;
      case "linear":
        feature.length_mm = Math.max(feature.length_mm, val);
        break;
      case "depth":
        feature.depth_mm = val;
        feature.length_mm = Math.max(feature.length_mm, val);
        break;
      case "radius":
        // Could be a fillet, contour radius, or nose radius ref
        if (!feature.od_mm) feature.od_mm = val * 2;
        break;
      case "angular":
        feature.taper_angle_deg = val;
        break;
      case "chamfer":
        // Chamfers don't change primary dimensions but set the contour type
        feature.depth_mm = val;
        break;
      case "thread":
        feature.diameter_mm = val;
        if (isOD) feature.od_mm = val;
        else feature.id_mm = val;
        break;
      case "counterbore":
      case "countersink":
        feature.id_mm = val;
        break;
    }

    // Apply dimension tolerance
    if (dim.tolerance) {
      const tolRange = Math.abs(dim.tolerance.upper - dim.tolerance.lower);
      feature.tolerance_mm = tolRange / 2; // Half-range bilateral equivalent
    }

    // Apply surface finish from dimension
    if (dim.surface_finish_ra !== undefined && dim.surface_finish_ra !== null) {
      feature.surface_finish_Ra_um = dim.surface_finish_ra;
    }
  }

  /** Apply GD&T frames to matching features */
  private applyGDTToFeature(
    feature: TurningFeature,
    gdts: ExtractedGDT[],
    warnings: IntakeWarning[],
  ): void {
    for (const gdt of gdts) {
      const appliedTo = (gdt.applied_to || "").toLowerCase();
      const featureId = feature.id.toLowerCase();

      // Match GD&T to feature by location or type
      const isRelevant =
        appliedTo.includes(featureId) ||
        (feature.type.includes("od") && (appliedTo.includes("od") || appliedTo.includes("outside"))) ||
        (feature.type.includes("id") && (appliedTo.includes("id") || appliedTo.includes("bore"))) ||
        (feature.type.includes("thread") && appliedTo.includes("thread"));

      if (!isRelevant) continue;

      // Concentricity/runout → tighter tolerance
      if (gdt.symbol === "concentricity" || gdt.symbol === "circular_runout" || gdt.symbol === "total_runout") {
        const gdtTol = gdt.tolerance_unit === "in" ? gdt.tolerance_value * 25.4 : gdt.tolerance_value;
        if (feature.tolerance_mm === undefined || gdtTol < feature.tolerance_mm) {
          feature.tolerance_mm = gdtTol;
          warnings.push({
            stage: "gdt_application",
            severity: "info",
            message: `Applied ${gdt.symbol} tolerance ${gdtTol}mm to ${feature.id}`,
          });
        }
      }

      // Cylindricity → surface finish implication
      if (gdt.symbol === "cylindricity") {
        const impliedRa = gdt.tolerance_value * 10; // Rough approximation: cylindricity × 10 ≈ Ra
        if (feature.surface_finish_Ra_um === undefined || impliedRa < feature.surface_finish_Ra_um) {
          feature.surface_finish_Ra_um = impliedRa;
        }
      }
    }
  }

  /** Select nearest standard bar stock diameter */
  private selectBarStock(maxFinishedOD: number): number {
    // Standard metric bar stock sizes (mm) — most common lathe stock
    const standardSizes = [
      6, 8, 10, 12, 14, 16, 18, 20, 22, 25, 28, 30, 32, 35, 38,
      40, 42, 45, 48, 50, 55, 60, 63, 65, 70, 75, 80, 85, 90, 95,
      100, 110, 120, 125, 130, 140, 150, 160, 170, 180, 190, 200,
      220, 250, 280, 300,
    ];

    // Add 2mm stock allowance for facing + cleanup
    const required = maxFinishedOD + 2;

    for (const size of standardSizes) {
      if (size >= required) return size;
    }

    // Beyond standard sizes, round up to nearest 10mm
    return Math.ceil(required / 10) * 10;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const turningPrintIntakeEngine = new TurningPrintIntakeEngine();
