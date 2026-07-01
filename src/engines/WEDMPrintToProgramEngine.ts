/**
 * WEDMPrintToProgramEngine — Wire EDM File-to-Program Pipeline
 *
 * End-to-end bridge: DXF/geometry → multi-pass plan → Mitsubishi G-code.
 *
 * Pipeline stages:
 *   1. Parse geometry (DXF or pre-parsed contours)
 *   2. Classify features for wire EDM
 *   3. Calculate multi-pass strategy (offsets, feeds, E-packs)
 *   4. Generate controller-specific G-code (Mitsubishi default)
 *   5. Return complete NC program + setup sheet
 *
 * Wires together (existing engines):
 *   - DXFGeometryParserEngine — DXF → WireEDMContour[] (arc-preserving)
 *   - WireEDMSettingsEngine — material/thickness → speeds, offsets, tension
 *   - EDMMultiPassStrategyEngine — tolerance/Ra → pass plan with energy cascade
 *   - EDMPostProcessGCodeEngine — profiles + passes → controller G-code
 *
 * Calibrated against real Mitsubishi programs from Box Drive:
 *   - ITW SHAKEPROOF 500-30540-24000-04.NC (4-pass, hex + circle)
 *   - NOZE TEST.NC (5-pass, UV taper with E2821-E2825)
 *
 * @module engines/WEDMPrintToProgramEngine
 */

import { log } from "../utils/Logger.js";
import type { WireEDMContour, GeometrySegment, ArcSegment, GeometryParseResult } from "./DXFGeometryParserEngine.js";
import type { EDMGCodeInput, EDMProfile, EDMContourPoint, EDMPass, EDMGCodeResult, WireEDMController } from "./EDMPostProcessGCodeEngine.js";
import type { MultiPassInput, MultiPassPlan, PassDetail } from "./EDMMultiPassStrategyEngine.js";
import type { WireEDMInput, WireEDMResult, WireType } from "./WireEDMSettingsEngine.js";

// ============================================================================
// PUBLIC TYPES
// ============================================================================

export interface WEDMProgramInput {
  /** DXF file content (string) — will be parsed via DXFGeometryParserEngine */
  dxf_content?: string;
  /** Pre-parsed contours — skip DXF parsing if provided */
  contours?: WireEDMContour[];
  /** Material name (e.g., "D2", "4140", "A2", "S7", "stainless 304") */
  material: string;
  /** Material hardness in HRC */
  hardness_hrc?: number;
  /** Workpiece thickness in mm */
  thickness_mm: number;
  /** Target surface finish in µm Ra */
  target_ra_um?: number;
  /** Target dimensional accuracy in mm */
  target_accuracy_mm?: number;
  /** Wire type (defaults to brass_0.25 for general purpose) */
  wire_type?: WireType;
  /** Wire diameter in mm (derived from wire_type if not specified) */
  wire_diameter_mm?: number;
  /** Taper angle in degrees (0 for straight cuts) */
  taper_angle_deg?: number;
  /** Controller dialect (defaults to mitsubishi) */
  controller?: WireEDMController;
  /** Program number for NC header */
  program_number?: number;
  /** Units for output */
  units?: "metric" | "imperial";
  /** Submerged cutting (default true) */
  submerged?: boolean;
  /** Part name for documentation */
  part_name?: string;
  /** Part number for documentation */
  part_number?: string;
  /** Which contour indices to cut (default: all) */
  contour_indices?: number[];
  /** Flush pressure override in bar */
  flush_pressure_bar?: number;

  // ── Shop-Critical Inputs (user-adjustable) ──────────────────────

  /** Work origin override — where G92 sets X0 Y0 (default: 0,0) */
  origin?: { x: number; y: number };

  /** Stock allowance in mm — added to ALL pass offsets.
   *  Positive = overcut (leave extra stock, part is undersized).
   *  Negative = undercut (remove extra, part is oversized).
   *  Use for tolerance adjustment, press-fit, etc. */
  stock_allowance_mm?: number;

  /** Lead-in distance in mm (approach to cut — default 2.0) */
  lead_in_mm?: number;
  /** Lead-in type (default "linear") */
  lead_in_type?: "linear" | "arc" | "tangent";
  /** Lead-in arc radius (only for arc type, default = lead_in_mm) */
  lead_in_radius_mm?: number;

  /** Lead-out distance in mm (departure from cut — default 2.0) */
  lead_out_mm?: number;
  /** Lead-out type (default "linear") */
  lead_out_type?: "linear" | "arc" | "tangent";
  /** Lead-out arc radius (only for arc type, default = lead_out_mm) */
  lead_out_radius_mm?: number;

  /** Start hole position override per profile (index → {x,y}).
   *  If not set, auto-calculated from contour bounding box. */
  start_holes?: Array<{ x: number; y: number } | null>;

  /** Wire compensation: if you planned with one wire size but are running another,
   *  this adjusts all offsets by (actual_wire_radius - planned_wire_radius).
   *  E.g., planned 0.25mm, running 0.20mm → offset_adjust = -0.025mm per side. */
  actual_wire_diameter_mm?: number;

  /** Per-pass offset override in mm (bypasses physics calculation).
   *  Array length must match number of passes. Null entries use calculated value. */
  offset_overrides_mm?: Array<number | null>;

  /** Per-pass feed rate override in mm/min.
   *  Null entries use calculated value. */
  feed_overrides_mm_min?: Array<number | null>;
}

// ============================================================================
// CYCLE TIME BREAKDOWN TYPES (U-W100-19)
// ============================================================================

/**
 * Per-pass cutting time breakdown.
 * Cutting time = path_length_mm / feed_mm_min for each pass.
 */
export interface PassTimeBreakdown {
  pass_number: number;
  pass_type: string;
  /** Total path length for this pass: Σ(profile_perimeter + approach + departure) across all profiles */
  path_length_mm: number;
  /** Feed rate from physics model (mm/min) */
  feed_mm_min: number;
  /** Pure cutting time = path_length / feed (min) */
  cutting_time_min: number;
}

/**
 * Complete cycle time breakdown with all non-cutting components.
 *
 * Total = Σ(cutting_time per pass) + threading + dwell + rapid + aux
 *
 * Threading: Mitsubishi M20 command, ~45s per profile (30-60s range)
 * Dwell: G4 X5. = 5s between pass transitions
 * Rapid: G0 moves between start holes at machine traverse rate (~15 m/min)
 * Aux: Tank fill (M78 ~30s), wire cut/re-thread between profiles (~30s each)
 */
export interface CycleTimeBreakdown {
  /** Total estimated cycle time in minutes */
  total_time_min: number;
  /** Per-pass cutting time breakdown */
  per_pass: PassTimeBreakdown[];
  /** Total cutting time across all passes (min) */
  cutting_time_min: number;
  /** Wire threading time: ~45s per profile (min) */
  threading_time_min: number;
  /** Inter-pass dwell time: 5s × (passes - 1) × profiles (min) */
  dwell_time_min: number;
  /** Rapid traverse time between profiles/start holes (min) */
  rapid_time_min: number;
  /** Auxiliary time: tank fill, wire cut/thread between profiles (min) */
  aux_time_min: number;
  /** Human-readable summary */
  summary: string;
}

// ============================================================================
// CONFIDENCE SCORING (U-W100-26)
// ============================================================================

/**
 * Confidence score per parameter category.
 *
 * Scoring criteria:
 *   Pulse:    100% = imported tech table, 90% = published Klocke, 70% = interpolated/Kunieda
 *   Offset:   100% = validated dimensional data, 90% = DiBitonto crater model
 *   Feed:     100% = published lookup, 90% = Kunieda MRR, 70% = interpolated
 *   E-Pack:   100% = machine-matched tech table, 80% = generic Mitsubishi format
 *   Geometry: 100% = all contours closed + DXF complete, 80% = minor warnings
 *
 * Overall = weighted minimum across categories.
 * Weights: pulse=0.25, offset=0.15, feed=0.30, epack=0.15, geometry=0.15
 */
export interface ConfidenceCategory {
  /** Score 0-100 */
  score: number;
  /** Human-readable reason for this score */
  reason: string;
}

export interface ConfidenceScore {
  /** Per-category scores */
  pulse: ConfidenceCategory;
  offset: ConfidenceCategory;
  feed: ConfidenceCategory;
  epack: ConfidenceCategory;
  geometry: ConfidenceCategory;
  /** Overall weighted score 0-100 */
  overall: number;
  /** Summary explanation */
  summary: string;
}

/** U-W100-32: Slug management — per-internal-contour slug data */
export interface SlugInfo {
  /** Contour ID */
  contour_id: string;
  /** Slug area in mm² */
  area_mm2: number;
  /** Slug weight in kg: W = A × t × ρ */
  weight_kg: number;
  /** Slug classification */
  category: "light" | "medium" | "heavy" | "very_heavy";
  /** Recommended number of tabs */
  recommended_tabs: number;
  /** Whether operator intervention is needed (heavy/very_heavy) */
  intervention_needed: boolean;
  /** Human-readable handling note */
  handling_note: string;
}

/** U-W100-33: Flushing strategy — auto-selected mode with per-pass pressure */
export interface FlushingStrategy {
  /** Auto-selected flushing mode */
  mode: "submerged" | "spray_jet" | "combined";
  /** Reason for mode selection */
  reason: string;
  /** Base flushing pressure in bar */
  base_pressure_bar: number;
  /** Per-pass flushing pressure (rough higher, finish lower) */
  per_pass_pressure_bar: number[];
  /** Nozzle gap recommendation for finish passes */
  finish_nozzle_gap_mm: number;
  /** Whether machine pump can handle the required pressure */
  pump_within_limits: boolean;
}

export interface WEDMProgramResult {
  success: boolean;
  /** Complete G-code program text (ready for .NC file) */
  program_text: string;
  /** Program line count */
  line_count: number;
  /** Controller used */
  controller: string;
  /** Number of profiles (contours) cut */
  profiles_cut: number;
  /** Number of passes per profile */
  passes_per_profile: number;
  /** Total estimated cutting time in minutes */
  estimated_time_min: number;
  /** Predicted final surface finish */
  predicted_ra_um: number;
  /** Predicted dimensional accuracy */
  predicted_accuracy_mm: number;
  /** Per-pass detail */
  pass_details: PassSummary[];
  /** Wire consumption estimate in meters */
  wire_consumption_m: number;
  /** Setup sheet data */
  setup_sheet: SetupSheet;
  /** Geometry summary */
  geometry_summary: GeometrySummary;
  /** Warnings and notes */
  warnings: string[];
  /** Pipeline stages completed */
  stages_completed: string[];
  /** Physics-based cycle time with per-pass breakdown (U-W100-19) */
  cycle_time_breakdown: CycleTimeBreakdown;
  /** Per-category confidence score (U-W100-26) */
  confidence_score: ConfidenceScore;
  /** U-W100-32: Slug management per internal contour */
  slug_management?: SlugInfo[];
  /** U-W100-33: Auto-selected flushing strategy */
  flushing_strategy?: FlushingStrategy;
}

export interface PassSummary {
  pass_number: number;
  type: string;
  offset_mm: number;
  feed_mm_min: number;
  e_pack_code: string;
  wire_speed_m_min: number;
  tension_N: number;
  predicted_ra_um: number;
  /** Predicted recast layer depth (µm) after this pass */
  predicted_recast_um: number;
}

export interface SetupSheet {
  part_name: string;
  part_number: string;
  material: string;
  thickness_mm: number;
  wire_type: string;
  wire_diameter_mm: number;
  controller: string;
  program_number: number;
  num_profiles: number;
  num_passes: number;
  total_time_min: number;
  wire_needed_m: number;
  flush_pressure_bar: number;
  submerged: boolean;
  notes: string[];
}

interface GeometrySummary {
  num_contours: number;
  num_selected: number;
  total_perimeter_mm: number;
  contour_details: Array<{
    id: string;
    is_exterior: boolean;
    perimeter_mm: number;
    area_mm2: number;
    segment_count: number;
    has_arcs: boolean;
  }>;
}

// ============================================================================
// E-PACK TECHNOLOGY TABLE CODE GENERATOR (U-W100-11)
// ============================================================================

/**
 * Mitsubishi E-pack material groups.
 *
 * Derived from Mitsubishi FA-S/MV-S technology tables.
 * Group maps ISO thermal/electrical properties to machine condition families.
 *
 * Group | Materials            | Thermal Key
 * ------+----------------------+------------------
 *   1   | Carbon/tool steel    | Medium k, high Tm
 *   2   | Stainless steel      | Low k, high Tm
 *   3   | Aluminum/non-ferrous | High k, low Tm
 *   4   | Copper/brass         | Very high k, medium Tm
 *   5   | Carbide (WC-Co)      | High Tm, brittle
 *   6   | Titanium             | Low k, low α
 *   7   | Superalloy (Ni-base) | Very low k, high Tm
 */
const EPACK_MATERIAL_GROUPS: Record<string, number> = {
  steel: 1, tool_steel: 1, hardened_steel: 1, carbon_steel: 1,
  stainless: 2,
  aluminum: 3,
  copper: 4,
  carbide: 5,
  titanium: 6,
  inconel: 7,
};

/**
 * Resolve material name to E-pack material group (1-7).
 * Uses same resolver as WireEDMSettingsEngine for consistency.
 */
export function resolveEPackMaterialGroup(material: string): number {
  const m = material.toLowerCase();
  if (m.includes("stainless") || m.includes("304") || m.includes("316") || m.includes("17-4")) return 2;
  if (m.includes("aluminum") || m.includes("6061") || m.includes("7075") || m.includes("2024")) return 3;
  if (m.includes("copper") || m.includes("brass") || m.includes("beryllium") || m.includes("c110")) return 4;
  if (m.includes("carbide") || m.includes("tungsten") && !m.includes("wire")) return 5;
  if (m.includes("titanium") || m.includes("ti-6al") || m.includes("ti6al")) return 6;
  if (m.includes("inconel") || m.includes("718") || m.includes("hastelloy") || m.includes("nimonic")) return 7;
  // Default: steel group (includes D2, H13, A2, O1, 4140, 1018, etc.)
  return 1;
}

/**
 * Resolve workpiece thickness to E-pack thickness code (0-9).
 *
 * Mitsubishi FA technology tables index conditions by thickness range.
 * Ranges derived from published Mitsubishi condition tables:
 *
 * Code | Range (mm)  | Typical parts
 * -----+-------------+-------------------
 *   0  | < 5         | Thin foils, micro parts
 *   1  | 5 – 12      | Thin stamping dies
 *   2  | 12 – 30     | Standard dies (most common)
 *   3  | 30 – 50     | Medium dies
 *   4  | 50 – 75     | Thick dies
 *   5  | 75 – 100    | Heavy tooling
 *   6  | 100 – 150   | Large molds
 *   7  | 150 – 200   | Extra heavy
 *   8  | 200 – 300   | Special applications
 *   9  | > 300       | Maximum capacity
 */
export function resolveEPackThicknessCode(thickness_mm: number): number {
  if (thickness_mm < 5)   return 0;
  if (thickness_mm < 12)  return 1;
  if (thickness_mm < 30)  return 2;
  if (thickness_mm < 50)  return 3;
  if (thickness_mm < 75)  return 4;
  if (thickness_mm < 100) return 5;
  if (thickness_mm < 150) return 6;
  if (thickness_mm < 200) return 7;
  if (thickness_mm < 300) return 8;
  return 9;
}

/**
 * Resolve cutting condition code from target Ra and wire type.
 *
 * Code | Condition    | Target Ra (µm)
 * -----+--------------+----------------
 *   1  | High speed   | > 3.2 (roughing only, no skim required)
 *   2  | Standard     | 1.6 – 3.2 (typical production)
 *   3  | Fine         | 0.8 – 1.6 (precision tooling)
 *   4  | Extra fine   | 0.4 – 0.8 (optical/medical)
 *   5  | Ultra fine   | < 0.4 (mirror finish)
 *
 * Coated wire shifts condition +1 (better Ra capability).
 */
export function resolveEPackConditionCode(
  target_ra_um: number = 3.2,
  wire_type: string = "brass",
): number {
  let code: number;
  if (target_ra_um > 3.2)       code = 1;
  else if (target_ra_um > 1.6)  code = 2;
  else if (target_ra_um > 0.8)  code = 3;
  else if (target_ra_um > 0.4)  code = 4;
  else                          code = 5;

  // Coated wire enables finer conditions at same pass count
  if (wire_type.includes("coated") || wire_type.includes("zinc")) {
    code = Math.max(1, code - 1);
  }

  return code;
}

/**
 * Generate Mitsubishi E-pack technology table code.
 *
 * Format: E{material_group:1-7}{thickness_code:0-9}{condition:1-5}{pass:1-9}
 *
 * Real program validation:
 *   ITW SHAKEPROOF — D2 tool steel, 25.4mm, Ra 0.8µm:
 *     E1221 (group=1:steel, thick=2:12-30mm, cond=2:standard, pass=1) ✓
 *     E1222 (pass=2) ✓, E1223 (pass=3) ✓, E1224 (pass=4) ✓
 *
 *   NOZE TEST — stainless, 250mm, taper profile:
 *     E2821 (group=2:stainless, thick=8:200-300mm, cond=2:standard, pass=1) ✓
 *     E2822-E2825 (passes 2-5) ✓
 *
 * @param material    Material name (e.g., "D2", "stainless 316")
 * @param thickness_mm Workpiece thickness in mm
 * @param passNumber  Pass number (1-based)
 * @param target_ra_um Target surface finish (default 3.2µm)
 * @param wire_type   Wire type string (default "brass")
 * @returns E-pack code string (e.g., "E1221")
 */
export function generateEPackCode(
  material: string,
  thickness_mm: number,
  passNumber: number,
  target_ra_um: number = 3.2,
  wire_type: string = "brass",
): string {
  const matGroup = resolveEPackMaterialGroup(material);
  const thickCode = resolveEPackThicknessCode(thickness_mm);
  const condCode = resolveEPackConditionCode(target_ra_um, wire_type);

  return `E${matGroup}${thickCode}${condCode}${passNumber}`;
}

/**
 * Decode an E-pack code into its constituent fields.
 * Useful for validation, tech table import, and debugging.
 *
 * @param code E-pack code string (e.g., "E1221")
 * @returns Decoded fields or null if invalid format
 */
export function decodeEPackCode(code: string): {
  material_group: number;
  thickness_code: number;
  condition_code: number;
  pass_number: number;
} | null {
  const match = code.match(/^E(\d)(\d)(\d)(\d)$/);
  if (!match) return null;
  return {
    material_group: parseInt(match[1]),
    thickness_code: parseInt(match[2]),
    condition_code: parseInt(match[3]),
    pass_number: parseInt(match[4]),
  };
}

// ============================================================================
// E-PACK VALIDATION (U-W100-13)
// ============================================================================

/** Valid field ranges for Mitsubishi E-pack codes */
const EPACK_FIELD_RANGES = {
  material_group: { min: 1, max: 7 },
  thickness_code: { min: 0, max: 9 },
  condition_code: { min: 1, max: 5 },
  pass_number:    { min: 1, max: 9 },
};

/** Machine-specific E-pack capabilities (max passes vary by condition) */
const MACHINE_EPACK_LIMITS: Record<string, { max_passes_by_condition: number[]; max_thickness_code: number }> = {
  // Mitsubishi MV1200-S / MV2400-R — full tech table set
  "mitsubishi_mv": { max_passes_by_condition: [0, 4, 5, 6, 7, 7], max_thickness_code: 9 },
  // Sodick — fewer fine conditions on thick stock
  "sodick":        { max_passes_by_condition: [0, 3, 5, 5, 7, 7], max_thickness_code: 8 },
  // Default — conservative
  "default":       { max_passes_by_condition: [0, 4, 5, 6, 7, 9], max_thickness_code: 9 },
};

/** Result of E-pack validation */
export interface EPackValidationResult {
  valid: boolean;
  code: string;
  decoded: ReturnType<typeof decodeEPackCode>;
  errors: string[];
  warnings: string[];
  discrepancies: Array<{
    field: string;
    expected: string;
    actual: string;
    severity: "info" | "warning" | "error";
  }>;
}

/**
 * Validate an E-pack code against field ranges and machine capabilities.
 *
 * Checks:
 *   1. Format: E followed by exactly 4 digits
 *   2. Field ranges: material_group 1-7, thickness_code 0-9, condition 1-5, pass 1-9
 *   3. Machine limits: pass count within machine's capability for the condition code
 *   4. Physics consistency: skim passes should have finer conditions than rough
 *
 * @param code E-pack code string (e.g., "E1221")
 * @param machine_family Machine family key (e.g., "mitsubishi_mv", "sodick")
 * @returns Validation result with errors, warnings, and discrepancies
 */
export function validateEPackCode(
  code: string,
  machine_family: string = "default",
): EPackValidationResult {
  const result: EPackValidationResult = {
    valid: true,
    code,
    decoded: null,
    errors: [],
    warnings: [],
    discrepancies: [],
  };

  // Step 1: Format check
  const decoded = decodeEPackCode(code);
  if (!decoded) {
    result.valid = false;
    result.errors.push(`Invalid E-pack format: "${code}" — expected E followed by 4 digits (E####)`);
    return result;
  }
  result.decoded = decoded;

  // Step 2: Field range checks
  const { material_group, thickness_code, condition_code, pass_number } = decoded;

  if (material_group < EPACK_FIELD_RANGES.material_group.min || material_group > EPACK_FIELD_RANGES.material_group.max) {
    result.valid = false;
    result.errors.push(`Material group ${material_group} out of range [${EPACK_FIELD_RANGES.material_group.min}-${EPACK_FIELD_RANGES.material_group.max}]`);
  }
  if (thickness_code < EPACK_FIELD_RANGES.thickness_code.min || thickness_code > EPACK_FIELD_RANGES.thickness_code.max) {
    result.valid = false;
    result.errors.push(`Thickness code ${thickness_code} out of range [${EPACK_FIELD_RANGES.thickness_code.min}-${EPACK_FIELD_RANGES.thickness_code.max}]`);
  }
  if (condition_code < EPACK_FIELD_RANGES.condition_code.min || condition_code > EPACK_FIELD_RANGES.condition_code.max) {
    result.valid = false;
    result.errors.push(`Condition code ${condition_code} out of range [${EPACK_FIELD_RANGES.condition_code.min}-${EPACK_FIELD_RANGES.condition_code.max}]`);
  }
  if (pass_number < EPACK_FIELD_RANGES.pass_number.min || pass_number > EPACK_FIELD_RANGES.pass_number.max) {
    result.valid = false;
    result.errors.push(`Pass number ${pass_number} out of range [${EPACK_FIELD_RANGES.pass_number.min}-${EPACK_FIELD_RANGES.pass_number.max}]`);
  }

  if (!result.valid) return result;

  // Step 3: Machine capability check
  const limits = MACHINE_EPACK_LIMITS[machine_family] ?? MACHINE_EPACK_LIMITS["default"];

  if (thickness_code > limits.max_thickness_code) {
    result.warnings.push(`Thickness code ${thickness_code} may exceed machine capability (max ${limits.max_thickness_code})`);
    result.discrepancies.push({
      field: "thickness_code",
      expected: `≤ ${limits.max_thickness_code}`,
      actual: String(thickness_code),
      severity: "warning",
    });
  }

  const maxPasses = limits.max_passes_by_condition[condition_code] ?? 9;
  if (pass_number > maxPasses) {
    result.warnings.push(`Pass ${pass_number} exceeds typical max (${maxPasses}) for condition ${condition_code} on ${machine_family}`);
    result.discrepancies.push({
      field: "pass_number",
      expected: `≤ ${maxPasses}`,
      actual: String(pass_number),
      severity: "warning",
    });
  }

  // Step 4: Physics consistency — high-speed condition should only be pass 1 (rough)
  if (condition_code === 1 && pass_number > 1) {
    result.warnings.push("High-speed condition (code 1) on skim pass — typically only used for rough");
    result.discrepancies.push({
      field: "condition_vs_pass",
      expected: "condition 1 → pass 1 only",
      actual: `condition 1, pass ${pass_number}`,
      severity: "info",
    });
  }

  // Ultra-fine condition on first pass is unusual
  if (condition_code === 5 && pass_number === 1) {
    result.warnings.push("Ultra-fine condition (code 5) on rough pass — unusual, verify tech table");
    result.discrepancies.push({
      field: "condition_vs_pass",
      expected: "condition 5 → skim passes only",
      actual: `condition 5, pass ${pass_number}`,
      severity: "warning",
    });
  }

  return result;
}

/**
 * Cross-validate an E-pack code against imported tech table parameters.
 *
 * Checks physics consistency:
 *   - Skim passes should have lower current than rough
 *   - Later passes should have shorter t_on (energy cascade)
 *   - Wire speed should be within machine limits
 *
 * @param code E-pack code
 * @param params Imported tech table parameters for this code
 * @param roughParams Imported tech table parameters for the corresponding rough pass
 * @returns Discrepancies found (empty array = consistent)
 */
export function crossValidateEPackParams(
  code: string,
  params: { t_on_us: number; t_off_us: number; peak_current_A: number; wire_speed_m_min?: number },
  roughParams?: { t_on_us: number; t_off_us: number; peak_current_A: number },
): Array<{ field: string; issue: string; severity: "info" | "warning" | "error" }> {
  const issues: Array<{ field: string; issue: string; severity: "info" | "warning" | "error" }> = [];
  const decoded = decodeEPackCode(code);
  if (!decoded) return [{ field: "code", issue: `Invalid code format: ${code}`, severity: "error" }];

  // Physics bounds (from EPackTableImportEngine)
  if (params.t_on_us < 0.1 || params.t_on_us > 50) {
    issues.push({ field: "t_on_us", issue: `t_on=${params.t_on_us}µs outside physics range [0.1-50]`, severity: "error" });
  }
  if (params.t_off_us < 1 || params.t_off_us > 100) {
    issues.push({ field: "t_off_us", issue: `t_off=${params.t_off_us}µs outside physics range [1-100]`, severity: "error" });
  }
  if (params.peak_current_A < 0.5 || params.peak_current_A > 60) {
    issues.push({ field: "peak_current_A", issue: `I_peak=${params.peak_current_A}A outside physics range [0.5-60]`, severity: "error" });
  }
  if (params.wire_speed_m_min !== undefined && (params.wire_speed_m_min < 1 || params.wire_speed_m_min > 25)) {
    issues.push({ field: "wire_speed_m_min", issue: `Wire speed=${params.wire_speed_m_min}m/min outside range [1-25]`, severity: "error" });
  }

  // Skim vs rough cross-validation
  if (roughParams && decoded.pass_number > 1) {
    if (params.peak_current_A >= roughParams.peak_current_A) {
      issues.push({
        field: "peak_current_A",
        issue: `Skim pass ${decoded.pass_number} current (${params.peak_current_A}A) ≥ rough current (${roughParams.peak_current_A}A) — expected lower`,
        severity: "warning",
      });
    }
    if (params.t_on_us >= roughParams.t_on_us) {
      issues.push({
        field: "t_on_us",
        issue: `Skim pass ${decoded.pass_number} t_on (${params.t_on_us}µs) ≥ rough t_on (${roughParams.t_on_us}µs) — expected shorter for energy cascade`,
        severity: "warning",
      });
    }
  }

  return issues;
}

// ============================================================================
// GEOMETRY BRIDGE: WireEDMContour → EDMProfile
// ============================================================================

/**
 * Convert DXFGeometryParserEngine contours to EDMPostProcessGCodeEngine profiles.
 *
 * Transforms:
 *   LineSegment → EDMContourPoint { x, y }
 *   ArcSegment  → EDMContourPoint { x: end.x, y: end.y, type: "arc", i, j, direction }
 *
 * Arc I/J are incremental from the arc start point to the center.
 */
function contourToProfile(
  contour: WireEDMContour,
  index: number,
  input: WEDMProgramInput,
): EDMProfile {
  const points: EDMContourPoint[] = [];

  for (let i = 0; i < contour.segments.length; i++) {
    const seg = contour.segments[i];

    if (i === 0) {
      points.push({ x: seg.start.x, y: seg.start.y });
    }

    if (seg.type === "arc") {
      const arc = seg as ArcSegment;
      const iVal = arc.center.x - arc.start.x;
      const jVal = arc.center.y - arc.start.y;
      points.push({
        x: arc.end.x, y: arc.end.y,
        type: "arc", i: iVal, j: jVal,
        direction: arc.ccw ? "ccw" : "cw",
      });
    } else {
      points.push({ x: seg.end.x, y: seg.end.y });
    }
  }

  // Start hole: user override → auto-calculate from bbox
  const userHole = input.start_holes?.[index];
  const startHole = userHole
    ? { x: userHole.x, y: userHole.y }
    : contour.is_exterior
      ? { x: contour.bbox.min_x - 5, y: (contour.bbox.min_y + contour.bbox.max_y) / 2 }
      : { x: (contour.bbox.min_x + contour.bbox.max_x) / 2, y: (contour.bbox.min_y + contour.bbox.max_y) / 2 };

  // Lead-in / lead-out: user override → defaults
  const approach = {
    type: input.lead_in_type || "linear",
    length_mm: input.lead_in_mm ?? 2.0,
  };
  const departure = {
    type: input.lead_out_type || "linear",
    length_mm: input.lead_out_mm ?? 2.0,
  };

  return {
    name: contour.id || `profile_${index + 1}`,
    contour_points: points,
    start_hole: startHole,
    approach,
    departure,
    profile_type: contour.is_exterior ? "external" : "internal",
    taper_angle_deg: input.taper_angle_deg || 0,
  };
}

// ============================================================================
// PASS PLAN → EDMPass BRIDGE
// ============================================================================

/**
 * Convert EDMMultiPassStrategyEngine PassDetail[] to EDMPostProcessGCodeEngine EDMPass[].
 *
 * Applies user overrides:
 *   - stock_allowance_mm: added to every pass offset (positive=overcut, negative=undercut)
 *   - actual_wire_diameter_mm: compensates for wire size mismatch vs planned
 *   - offset_overrides_mm: per-pass explicit offset (bypasses calculation)
 *   - feed_overrides_mm_min: per-pass explicit feed rate
 */
function passDetailsToEDMPasses(
  details: PassDetail[],
  material: string,
  thickness_mm: number,
  wireTension: number,
  input: WEDMProgramInput,
): EDMPass[] {
  // Wire size compensation: if actual wire differs from planned
  const plannedDia = input.wire_diameter_mm || WIRE_DIAMETER_MAP[input.wire_type || "coated_0.25"] || 0.25;
  const actualDia = input.actual_wire_diameter_mm || plannedDia;
  const wireCompensation = (actualDia - plannedDia) / 2; // radius difference

  // Stock allowance: positive = leave more stock (overcut), negative = remove more (undercut)
  const stockAdj = input.stock_allowance_mm || 0;

  return details.map((d, idx) => {
    // Base offset from physics
    let offset = d.offset_mm;

    // Apply per-pass override if provided
    if (input.offset_overrides_mm?.[idx] != null) {
      offset = input.offset_overrides_mm[idx]!;
    } else {
      // Apply wire compensation + stock allowance
      offset += wireCompensation + stockAdj;
      // Clamp: offset must be positive (at minimum spark gap)
      offset = Math.max(0.005, offset);
    }

    // Feed rate: use physics-derived cutting speed (not wire transport speed)
    let feedRate = d.cutting_speed_mm_min > 0 ? d.cutting_speed_mm_min : d.wire_speed_m_min;
    if (input.feed_overrides_mm_min?.[idx] != null) {
      feedRate = input.feed_overrides_mm_min[idx]!;
    }

    return {
      pass_number: d.pass_number,
      offset_mm: +offset.toFixed(4),
      technology_table: generateEPackCode(
        material, thickness_mm, d.pass_number,
        input.target_ra_um ?? 3.2,
        input.wire_type ?? "brass_0.25",
      ),
      wire_speed_m_min: feedRate,
      tension_N: wireTension,
      power_setting: d.peak_current_A,
      servo_voltage: undefined,
      corner_strategy: idx === 0 ? "auto" as const : "exact_stop" as const,
    };
  });
}

// ============================================================================
// WIRE TYPE RESOLUTION
// ============================================================================

const WIRE_DIAMETER_MAP: Record<WireType, number> = {
  "brass_0.25": 0.25,
  "brass_0.20": 0.20,
  "coated_0.25": 0.25,
  "coated_0.20": 0.20,
  "moly_0.10": 0.10,
  "tungsten_0.05": 0.05,
};

// ============================================================================
// CYCLE TIME ESTIMATOR (U-W100-19)
// ============================================================================

/**
 * Physics-based cycle time estimation with per-pass breakdown.
 *
 * Components:
 *   Cutting  = Σ(path_length / feed_rate) per pass
 *   Threading = 45s per profile (Mitsubishi M20, range 30-60s)
 *   Dwell    = 5s × (passes - 1) × profiles (G4 X5.)
 *   Rapid    = Σ(distance between start holes) / rapid_rate
 *   Aux      = tank fill 30s + wire cut/re-thread 30s × (profiles - 1)
 *
 * Feed rates come from EDMMultiPassStrategyEngine pass plan (physics-derived).
 * Path length = perimeter + approach_length + departure_length per profile.
 *
 * Validated against Lemhunter: tool_steel 50mm ≈ 150 mm²/min area MRR.
 *
 * @param passSummaries Per-pass feed rates from the multi-pass plan
 * @param totalPerimeter Total perimeter of all selected profiles (mm)
 * @param numProfiles Number of profiles being cut
 * @param approachLength Lead-in distance per profile (mm, default 2.0)
 * @param departureLength Lead-out distance per profile (mm, default 2.0)
 * @param startHoles Start hole positions for rapid distance calculation
 */
export function estimateCycleTime(
  passSummaries: PassSummary[],
  totalPerimeter: number,
  numProfiles: number,
  approachLength: number = 2.0,
  departureLength: number = 2.0,
  startHoles?: Array<{ x: number; y: number }>,
): CycleTimeBreakdown {
  const THREADING_TIME_S = 45;   // Mitsubishi M20: 30-60s typical, use midpoint
  const DWELL_TIME_S = 5;        // G4 X5. between pass transitions
  const TANK_FILL_S = 30;        // M78 M78 fill time
  const WIRE_CUT_THREAD_S = 30;  // M21 + M20 between profiles
  const RAPID_RATE_MM_MIN = 15000; // G0 traverse ~15 m/min on Mitsubishi FA

  // Path length per pass = (total perimeter + approach + departure per profile) × numProfiles
  const pathPerProfile = totalPerimeter / Math.max(numProfiles, 1);
  const pathWithLeads = pathPerProfile + approachLength + departureLength;
  const totalPathPerPass = pathWithLeads * numProfiles;

  // Per-pass cutting time
  const perPass: PassTimeBreakdown[] = passSummaries.map(p => {
    const feed = p.feed_mm_min > 0 ? p.feed_mm_min : 3.0; // fallback 3 mm/min
    const cuttingTime = totalPathPerPass / feed;
    return {
      pass_number: p.pass_number,
      pass_type: p.type,
      path_length_mm: +totalPathPerPass.toFixed(1),
      feed_mm_min: +feed.toFixed(3),
      cutting_time_min: +cuttingTime.toFixed(2),
    };
  });

  const cuttingTimeMin = perPass.reduce((s, p) => s + p.cutting_time_min, 0);

  // Threading: once per profile (first threading + re-threads after wire cuts)
  const threadingTimeSec = THREADING_TIME_S * numProfiles;
  const threadingTimeMin = threadingTimeSec / 60;

  // Dwell between passes: (passes - 1) transitions per profile
  const numDwells = Math.max(passSummaries.length - 1, 0) * numProfiles;
  const dwellTimeSec = DWELL_TIME_S * numDwells;
  const dwellTimeMin = dwellTimeSec / 60;

  // Rapid traverse between profiles
  let rapidDistMm = 0;
  if (startHoles && startHoles.length > 1) {
    for (let i = 1; i < startHoles.length; i++) {
      const dx = startHoles[i].x - startHoles[i - 1].x;
      const dy = startHoles[i].y - startHoles[i - 1].y;
      rapidDistMm += Math.sqrt(dx * dx + dy * dy);
    }
  }
  // Add return-to-zero at end (~50mm typical)
  if (startHoles && startHoles.length > 0) {
    const last = startHoles[startHoles.length - 1];
    rapidDistMm += Math.sqrt(last.x * last.x + last.y * last.y);
  }
  const rapidTimeMin = rapidDistMm / RAPID_RATE_MM_MIN;

  // Auxiliary: tank fill + wire cut/re-thread between profiles
  const auxTimeSec = TANK_FILL_S + WIRE_CUT_THREAD_S * Math.max(numProfiles - 1, 0);
  const auxTimeMin = auxTimeSec / 60;

  const totalTimeMin = cuttingTimeMin + threadingTimeMin + dwellTimeMin + rapidTimeMin + auxTimeMin;

  // Summary
  const passBreakdown = perPass.map(p =>
    `Pass ${p.pass_number} (${p.pass_type}): ${p.cutting_time_min.toFixed(1)} min @ F${p.feed_mm_min.toFixed(1)} mm/min`
  ).join("; ");

  const summary = `Total ${totalTimeMin.toFixed(1)} min — Cutting: ${cuttingTimeMin.toFixed(1)}, ` +
    `Threading: ${threadingTimeMin.toFixed(1)}, Dwell: ${dwellTimeMin.toFixed(1)}, ` +
    `Rapid: ${rapidTimeMin.toFixed(2)}, Aux: ${auxTimeMin.toFixed(1)} | ${passBreakdown}`;

  return {
    total_time_min: +totalTimeMin.toFixed(2),
    per_pass: perPass,
    cutting_time_min: +cuttingTimeMin.toFixed(2),
    threading_time_min: +threadingTimeMin.toFixed(2),
    dwell_time_min: +dwellTimeMin.toFixed(2),
    rapid_time_min: +rapidTimeMin.toFixed(4),
    aux_time_min: +auxTimeMin.toFixed(2),
    summary,
  };
}

function resolveWireType(input: WEDMProgramInput): WireType {
  if (input.wire_type) return input.wire_type;

  // Auto-select based on material
  const m = input.material.toLowerCase();
  if (m.includes("carbide") || m.includes("tungsten")) return "moly_0.10";
  if (m.includes("titanium")) return "coated_0.25";

  // Default: zinc-coated 0.25 for speed/reliability
  return "coated_0.25";
}

// ============================================================================
// CONFIDENCE SCORING HELPER (U-W100-26)
// ============================================================================

/**
 * Compute per-category confidence score based on derivation chain.
 *
 * @param derivation Feed derivation from WireEDMSettingsEngine
 * @param multiPassPlan Multi-pass plan from EDMMultiPassStrategyEngine
 * @param geometryIssueCount Number of geometry issues from DXF parsing
 * @param epackCodes E-pack codes from pass details
 * @param hasContours Whether contours were provided (vs DXF parsed)
 * @param hasDxf Whether DXF content was provided
 */
function computeConfidenceScore(
  derivation: { method: string; active_constraint: string; source: string },
  multiPassPlan: { passes: Array<{ pass_type: string; offset_mm: number }> },
  geometryIssueCount: number,
  epackCodes: string[],
  hasContours: boolean,
  hasDxf: boolean,
): ConfidenceScore {
  // ---- Pulse confidence ----
  let pulseScore: number;
  let pulseReason: string;
  if (derivation.method === "published_lookup") {
    pulseScore = 95;
    pulseReason = "Pulse parameters from published cutting conditions (Klocke/Lemhunter)";
  } else if (derivation.method === "interpolated") {
    pulseScore = 80;
    pulseReason = "Pulse parameters interpolated from nearest published data point";
  } else {
    pulseScore = 70;
    pulseReason = "Pulse parameters derived from Kunieda MRR model (no published match)";
  }

  // ---- Offset confidence ----
  const offsets = multiPassPlan.passes.map(p => p.offset_mm);
  const allOffsetsValid = offsets.every(o => Number.isFinite(o) && o > 0);
  const offsetsMonotonic = offsets.length <= 1 ||
    offsets.every((o, i) => i === 0 || o <= offsets[i - 1] + 0.001);

  let offsetScore: number;
  let offsetReason: string;
  if (allOffsetsValid && offsetsMonotonic) {
    offsetScore = 90;
    offsetReason = "Offsets from DiBitonto crater model, monotonically decreasing";
  } else if (allOffsetsValid) {
    offsetScore = 75;
    offsetReason = "Offsets from DiBitonto model but non-monotonic sequence detected";
  } else {
    offsetScore = 50;
    offsetReason = "Some offset values are invalid or zero";
  }

  // ---- Feed confidence ----
  let feedScore: number;
  let feedReason: string;
  if (derivation.method === "published_lookup") {
    feedScore = 100;
    feedReason = "Feed rate from published lookup — highest confidence";
  } else if (derivation.method === "kunieda_mrr") {
    if (derivation.active_constraint === "none") {
      feedScore = 90;
      feedReason = "Feed from Kunieda MRR thermodynamics (unconstrained)";
    } else {
      feedScore = 85;
      feedReason = `Feed from Kunieda MRR, limited by ${derivation.active_constraint} constraint`;
    }
  } else {
    feedScore = 75;
    feedReason = "Feed interpolated from nearest published conditions";
  }

  // ---- E-Pack confidence ----
  const allEpackValid = epackCodes.length > 0 && epackCodes.every(c => /^E\d{4}$/.test(c));
  let epackScore: number;
  let epackReason: string;
  if (allEpackValid) {
    epackScore = 85;
    epackReason = "E-pack codes in Mitsubishi E#### format from material/thickness mapping";
  } else if (epackCodes.length > 0) {
    epackScore = 60;
    epackReason = "Some E-pack codes missing or invalid format";
  } else {
    epackScore = 40;
    epackReason = "No E-pack codes generated";
  }

  // ---- Geometry confidence ----
  let geometryScore: number;
  let geometryReason: string;
  if (hasDxf && geometryIssueCount === 0) {
    geometryScore = 100;
    geometryReason = "DXF parsed with no geometry issues — full confidence";
  } else if (hasContours && geometryIssueCount === 0) {
    geometryScore = 95;
    geometryReason = "Pre-parsed contours provided, all closed and valid";
  } else if (geometryIssueCount <= 2) {
    geometryScore = 80;
    geometryReason = `Minor geometry warnings (${geometryIssueCount} issues)`;
  } else {
    geometryScore = 60;
    geometryReason = `Geometry has ${geometryIssueCount} issues — review recommended`;
  }

  // ---- Overall: weighted minimum ----
  const weighted = (
    pulseScore * 0.25 +
    offsetScore * 0.15 +
    feedScore * 0.30 +
    epackScore * 0.15 +
    geometryScore * 0.15
  );
  const minScore = Math.min(pulseScore, offsetScore, feedScore, epackScore, geometryScore);
  const overall = Math.round((weighted + minScore) / 2);

  const categories = [
    { name: "Pulse", score: pulseScore },
    { name: "Offset", score: offsetScore },
    { name: "Feed", score: feedScore },
    { name: "E-Pack", score: epackScore },
    { name: "Geometry", score: geometryScore },
  ];
  const weakest = categories.reduce((a, b) => a.score < b.score ? a : b);
  const summary = overall >= 90
    ? `High confidence (${overall}%) — all parameters from validated sources`
    : overall >= 70
    ? `Good confidence (${overall}%) — weakest: ${weakest.name} (${weakest.score}%)`
    : `Moderate confidence (${overall}%) — review ${weakest.name} (${weakest.score}%) before production`;

  return {
    pulse: { score: pulseScore, reason: pulseReason },
    offset: { score: offsetScore, reason: offsetReason },
    feed: { score: feedScore, reason: feedReason },
    epack: { score: epackScore, reason: epackReason },
    geometry: { score: geometryScore, reason: geometryReason },
    overall,
    summary,
  };
}

// ============================================================================
// SLUG MANAGEMENT (U-W100-32)
// ============================================================================

/**
 * Material density in kg/mm³ — sourced from ASM Handbook Vol. 1.
 * Used for slug weight calculation: W = area_mm2 × thickness_mm × density.
 */
const MATERIAL_DENSITY_KG_MM3: Record<string, number> = {
  "D2": 7.7e-6,    // AISI D2 cold work tool steel
  "A2": 7.86e-6,   // AISI A2
  "S7": 7.83e-6,   // AISI S7
  "H13": 7.8e-6,   // AISI H13
  "4140": 7.85e-6,  // AISI 4140
  "1018": 7.87e-6,  // AISI 1018
  "304SS": 8.0e-6,  // 304 stainless
  "316SS": 8.0e-6,  // 316 stainless
  "6061": 2.71e-6,  // 6061-T6 aluminum
  "7075": 2.81e-6,  // 7075-T6 aluminum
  "WC": 15.63e-6,   // Tungsten carbide
  "Inconel 718": 8.19e-6,
  "Ti-6Al-4V": 4.43e-6,
  "copper": 8.96e-6,
  "brass": 8.53e-6,
};

/** Resolve material density, defaulting to steel if unknown. */
function getMaterialDensity(material: string): number {
  const upper = material.toUpperCase().replace(/[\s-]+/g, "");
  for (const [key, val] of Object.entries(MATERIAL_DENSITY_KG_MM3)) {
    if (upper.includes(key.toUpperCase().replace(/[\s-]+/g, ""))) return val;
  }
  // Default to general steel density
  return 7.85e-6;
}

/**
 * Compute slug management data for internal (non-exterior) contours.
 * W = area_mm2 × thickness_mm × density_kg_mm3
 *
 * Classification thresholds (per industry practice):
 *   light:      < 0.1 kg — free drop OK
 *   medium:     0.1–0.5 kg — controlled drop, operator aware
 *   heavy:      0.5–2.0 kg — tabs required, support fixture
 *   very_heavy: > 2.0 kg — vacuum/crane extraction required
 */
function computeSlugManagement(
  contours: Array<{ id: string; is_exterior: boolean; area_mm2: number }>,
  thickness_mm: number,
  material: string,
): SlugInfo[] {
  const density = getMaterialDensity(material);
  const slugs: SlugInfo[] = [];

  for (const c of contours) {
    // Only internal contours create slugs
    if (c.is_exterior) continue;

    const weight = c.area_mm2 * thickness_mm * density;
    let category: SlugInfo["category"];
    let tabs: number;
    let intervention: boolean;
    let note: string;

    if (weight < 0.1) {
      category = "light";
      tabs = 0;
      intervention = false;
      note = `Light slug (${(weight * 1000).toFixed(1)}g) — free drop OK`;
    } else if (weight < 0.5) {
      category = "medium";
      tabs = 1;
      intervention = false;
      note = `Medium slug (${(weight * 1000).toFixed(0)}g) — controlled drop, verify clearance below workpiece`;
    } else if (weight < 2.0) {
      category = "heavy";
      tabs = 2;
      intervention = true;
      note = `Heavy slug (${(weight * 1000).toFixed(0)}g) — tabs required, use support fixture or magnet`;
    } else {
      category = "very_heavy";
      tabs = 3;
      intervention = true;
      note = `Very heavy slug (${weight.toFixed(2)}kg) — vacuum extraction or crane assist required`;
    }

    slugs.push({
      contour_id: c.id,
      area_mm2: c.area_mm2,
      weight_kg: weight,
      category,
      recommended_tabs: tabs,
      intervention_needed: intervention,
      handling_note: note,
    });
  }

  return slugs;
}

// ============================================================================
// FLUSHING STRATEGY (U-W100-33)
// ============================================================================

/**
 * Auto-select flushing mode based on thickness and geometry.
 *
 * Decision rules (from published guidelines — Klocke 2013 Ch.8, Sodick manual):
 *   submerged: best finish, fewest wire breaks. Default for thin/medium parts.
 *   spray_jet: better debris evacuation for thick roughing. Thin parts (<10mm).
 *   combined:  submerged tank + nozzle jets for thick (>80mm) or enclosed geometry.
 *
 * Pressure scaling follows Darcy-Weisbach principle:
 *   ΔP ∝ thickness / kerf_width. Thicker = higher pressure needed.
 *   Rough: 3-5 bar (submerged), 8-15 bar (jet)
 *   Finish: 1-2 bar (submerged), 2-4 bar (jet)
 *
 * Typical machine pump limits: 10-15 bar max.
 */
function computeFlushingStrategy(
  thickness_mm: number,
  numPasses: number,
  hasEnclosedGeometry: boolean,
  submerged: boolean,
  maxPumpPressure_bar = 15,
): FlushingStrategy {
  // Auto-select mode
  let mode: FlushingStrategy["mode"];
  let reason: string;

  if (thickness_mm > 80) {
    if (hasEnclosedGeometry) {
      mode = "combined";
      reason = `Thick section (${thickness_mm}mm) with enclosed geometry — combined submerged + jet nozzles for debris evacuation`;
    } else {
      mode = "combined";
      reason = `Thick section (${thickness_mm}mm) — combined mode for adequate debris clearing through long kerf`;
    }
  } else if (thickness_mm < 10) {
    mode = submerged ? "submerged" : "spray_jet";
    reason = thickness_mm < 10
      ? `Thin section (${thickness_mm}mm) — ${mode} mode adequate`
      : `Standard thickness — submerged for optimal surface finish`;
  } else {
    mode = "submerged";
    reason = `Standard thickness (${thickness_mm}mm) — submerged for optimal finish and fewest wire breaks`;
  }

  // Base pressure (submerged rough)
  let basePressure = mode === "spray_jet" ? 10 : 4;

  // Thickness scaling: Darcy-Weisbach approximation
  if (thickness_mm > 30) {
    basePressure *= Math.min(1.8, 1 + (thickness_mm - 30) / 150);
  }
  basePressure = parseFloat(basePressure.toFixed(1));

  // Per-pass pressure: rough=100%, skim1=70%, skim2=50%, skim3+=40%
  const passFactors = [1.0]; // rough
  for (let i = 1; i < numPasses; i++) {
    if (i === 1) passFactors.push(0.7);
    else if (i === 2) passFactors.push(0.5);
    else passFactors.push(0.4);
  }
  const perPassPressure = passFactors.map(f => parseFloat((basePressure * f).toFixed(1)));

  // Nozzle gap for finish: tighter = better finish
  const finishGap = thickness_mm > 50 ? 1.5 : thickness_mm > 20 ? 1.0 : 0.5;

  // Pump limit check
  const maxRequired = Math.max(...perPassPressure);
  const pumpOk = maxRequired <= maxPumpPressure_bar;

  return {
    mode,
    reason,
    base_pressure_bar: basePressure,
    per_pass_pressure_bar: perPassPressure,
    finish_nozzle_gap_mm: finishGap,
    pump_within_limits: pumpOk,
  };
}

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class WEDMPrintToProgramEngine {
  /**
   * Full pipeline: DXF/contours → multi-pass plan → G-code program.
   *
   * This is the main entry point for photo-to-program workflow.
   */
  async generate(input: WEDMProgramInput): Promise<WEDMProgramResult> {
    const stages: string[] = [];
    const warnings: string[] = [];

    // ---- FIX C1: NaN/invalid input validation ----
    if (!Number.isFinite(input.thickness_mm) || input.thickness_mm <= 0) {
      return { ...this._failResult(input, []), success: false,
        warnings: [`Invalid thickness_mm: ${input.thickness_mm} — must be a positive number`], stages_completed: [] };
    }
    if (input.target_ra_um !== undefined && (!Number.isFinite(input.target_ra_um) || input.target_ra_um <= 0)) {
      return { ...this._failResult(input, []), success: false,
        warnings: [`Invalid target_ra_um: ${input.target_ra_um} — must be a positive number`], stages_completed: [] };
    }
    if (input.target_accuracy_mm !== undefined && (!Number.isFinite(input.target_accuracy_mm) || input.target_accuracy_mm <= 0)) {
      return { ...this._failResult(input, []), success: false,
        warnings: [`Invalid target_accuracy_mm: ${input.target_accuracy_mm} — must be a positive number`], stages_completed: [] };
    }
    if (input.actual_wire_diameter_mm !== undefined && (!Number.isFinite(input.actual_wire_diameter_mm) || input.actual_wire_diameter_mm <= 0)) {
      return { ...this._failResult(input, []), success: false,
        warnings: [`Invalid actual_wire_diameter_mm: ${input.actual_wire_diameter_mm} — must be positive`], stages_completed: [] };
    }

    // ---- Stage 1: Geometry ----
    let contours: WireEDMContour[];
    let geometryIssues: string[] = [];

    if (input.contours && input.contours.length > 0) {
      contours = input.contours;
      stages.push("geometry_provided");
    } else if (input.dxf_content) {
      const { dxfGeometryParserEngine } = await import("./DXFGeometryParserEngine.js");
      const parseResult = dxfGeometryParserEngine.parseGeometryFile(input.dxf_content, "dxf");
      contours = parseResult.contours;
      geometryIssues = parseResult.issues
        .filter(i => i.severity === "error")
        .map(i => i.message);
      if (geometryIssues.length > 0) {
        warnings.push(...geometryIssues.map(i => `Geometry: ${i}`));
      }
      stages.push("dxf_parsed");
    } else {
      return { ...this._failResult(input, ["No geometry provided — supply dxf_content or contours"]), stages_completed: stages };
    }

    // Filter to closed contours only (open contours can't be wire-cut)
    const closedContours = contours.filter(c => c.is_closed);
    if (closedContours.length === 0) {
      warnings.push("No closed contours found — wire EDM requires closed profiles");
      return {
        ...this._failResult(input, warnings),
        geometry_summary: {
          num_contours: contours.length,
          num_selected: 0,
          total_perimeter_mm: contours.reduce((s, c) => s + c.perimeter_mm, 0),
          contour_details: contours.map(c => ({
            id: c.id,
            is_exterior: c.is_exterior,
            perimeter_mm: c.perimeter_mm,
            area_mm2: c.area_mm2,
            segment_count: c.segments.length,
            has_arcs: c.segments.some(s => s.type === "arc"),
          })),
        },
        stages_completed: stages,
      };
    }

    // Select which contours to cut
    const selectedContours = input.contour_indices
      ? closedContours.filter((_, i) => input.contour_indices!.includes(i))
      : closedContours;

    stages.push("contours_selected");

    // ---- Stage 1.5: Slug Management (U-W100-32) ----
    const slugInfos = computeSlugManagement(selectedContours, input.thickness_mm, input.material);
    if (slugInfos.length > 0) {
      stages.push("slug_managed");
      for (const slug of slugInfos) {
        if (slug.category === "heavy" || slug.category === "very_heavy") {
          warnings.push(`Slug warning (${slug.contour_id}): ${slug.handling_note}`);
        }
      }
    }

    // ---- Stage 2: Wire EDM Settings ----
    const wireType = resolveWireType(input);
    const wireDia = input.wire_diameter_mm || WIRE_DIAMETER_MAP[wireType] || 0.25;

    const { wireEDMSettingsEngine } = await import("./WireEDMSettingsEngine.js");
    const settingsInput: WireEDMInput = {
      wire_type: wireType,
      workpiece_material: input.material,
      workpiece_thickness_mm: input.thickness_mm,
      workpiece_hardness_HRC: input.hardness_hrc || 58,
      target_surface_finish_Ra_um: input.target_ra_um || 0.8,
      target_accuracy_mm: input.target_accuracy_mm || 0.005,
      taper_angle_deg: input.taper_angle_deg || 0,
      is_submerged: input.submerged !== false,
    };
    const settings = wireEDMSettingsEngine.calculate(settingsInput);
    stages.push("settings_calculated");

    // ---- Stage 3: Multi-Pass Strategy ----
    const totalPerimeter = selectedContours.reduce((s, c) => s + c.perimeter_mm, 0);

    const { edmMultiPassStrategyEngine } = await import("./EDMMultiPassStrategyEngine.js");
    const multiPassInput: MultiPassInput = {
      material: input.material,
      thickness_mm: input.thickness_mm,
      profile_length_mm: totalPerimeter,
      tolerance_mm: input.target_accuracy_mm || 0.005,
      target_ra_um: input.target_ra_um || 0.8,
      wire_diameter_mm: wireDia,
      wire_type: wireType,
      is_hardened: (input.hardness_hrc || 0) > 45,
      hardness_hrc: input.hardness_hrc,
      distortion_risk: input.thickness_mm > 100 || totalPerimeter > 500,
    };
    const multiPassPlan = edmMultiPassStrategyEngine.full_plan(multiPassInput);
    stages.push("multipass_planned");

    // ---- Stage 3.5: Flushing Strategy (U-W100-33) ----
    const hasEnclosedGeometry = selectedContours.some(c => !c.is_exterior);
    const flushingStrategy = computeFlushingStrategy(
      input.thickness_mm,
      multiPassPlan.total_passes,
      hasEnclosedGeometry,
      input.submerged !== false,
    );
    stages.push("flushing_planned");
    if (!flushingStrategy.pump_within_limits) {
      warnings.push(`Flushing warning: required pressure ${Math.max(...flushingStrategy.per_pass_pressure_bar)} bar exceeds typical pump limit (15 bar)`);
    }
    if (input.thickness_mm > 80) {
      warnings.push(`Thick section flushing: ${flushingStrategy.mode} mode auto-selected — ${flushingStrategy.reason}`);
    }

    // ---- Stage 4: Build G-code Input ----
    const profiles: EDMProfile[] = selectedContours.map((c, i) => {
      return contourToProfile(c, i, input);
    });

    const edmPasses = passDetailsToEDMPasses(
      multiPassPlan.passes,
      input.material,
      input.thickness_mm,
      settings.wire_tension_N,
      input,
    );

    // Log applied adjustments
    if (input.stock_allowance_mm) {
      warnings.push(`Stock allowance: ${input.stock_allowance_mm > 0 ? '+' : ''}${input.stock_allowance_mm}mm applied to all offsets`);
    }
    if (input.actual_wire_diameter_mm && input.actual_wire_diameter_mm !== (input.wire_diameter_mm || WIRE_DIAMETER_MAP[wireType])) {
      const planned = input.wire_diameter_mm || WIRE_DIAMETER_MAP[wireType] || 0.25;
      warnings.push(`Wire compensation: planned ${planned}mm → actual ${input.actual_wire_diameter_mm}mm (${((input.actual_wire_diameter_mm - planned) / 2 * 1000).toFixed(1)}µm offset adjust)`);
    }

    const gcodeInput: EDMGCodeInput = {
      controller: input.controller || "mitsubishi",
      profiles,
      passes: edmPasses,
      wire_type: wireType,
      program_number: input.program_number || 1,
      units: input.units || "imperial",
      taper_mode: (input.taper_angle_deg || 0) > 0,
      submerged: input.submerged !== false,
      flush_pressure_bar: input.flush_pressure_bar || settings.flushing_pressure_bar,
      work_offset: input.origin
        ? `G92 X${input.origin.x.toFixed(4)} Y${input.origin.y.toFixed(4)}`
        : undefined,
    };

    // ---- Stage 5: Generate G-code ----
    const { edmPostProcessGCodeEngine } = await import("./EDMPostProcessGCodeEngine.js");
    const gcodeResult: EDMGCodeResult = edmPostProcessGCodeEngine.generate_gcode(gcodeInput);
    stages.push("gcode_generated");

    // ---- Build Result ----
    // Use adjusted values from edmPasses (includes stock allowance, wire comp, overrides)
    const passSummaries: PassSummary[] = multiPassPlan.passes.map((d: PassDetail, i: number) => ({
      pass_number: d.pass_number,
      type: d.pass_type,
      offset_mm: edmPasses[i]?.offset_mm ?? d.offset_mm,
      feed_mm_min: d.cutting_speed_mm_min > 0 ? d.cutting_speed_mm_min : (edmPasses[i]?.wire_speed_m_min ?? 3.0),
      e_pack_code: edmPasses[i]?.technology_table || "",
      wire_speed_m_min: edmPasses[i]?.wire_speed_m_min ?? d.wire_speed_m_min,
      tension_N: settings.wire_tension_N,
      predicted_ra_um: d.predicted_ra_um,
      predicted_recast_um: d.predicted_recast_um ?? 0,
    }));

    const setupSheet: SetupSheet = {
      part_name: input.part_name || "WEDM Part",
      part_number: input.part_number || "",
      material: input.material,
      thickness_mm: input.thickness_mm,
      wire_type: wireType,
      wire_diameter_mm: wireDia,
      controller: input.controller || "mitsubishi",
      program_number: input.program_number || 1,
      num_profiles: profiles.length,
      num_passes: multiPassPlan.total_passes,
      total_time_min: multiPassPlan.total_time_min,
      wire_needed_m: multiPassPlan.total_wire_m,
      flush_pressure_bar: settings.flushing_pressure_bar,
      submerged: input.submerged !== false,
      notes: [
        ...settings.recommendations,
        ...gcodeResult.warnings,
        ...(multiPassPlan.distortion_plan?.stress_relief_recommended
          ? [`Stress relief recommended: ${multiPassPlan.distortion_plan.stress_relief_temp_C}°C for ${multiPassPlan.distortion_plan.stress_relief_time_hours}h`]
          : []),
      ],
    };

    const geometrySummary: GeometrySummary = {
      num_contours: contours.length,
      num_selected: selectedContours.length,
      total_perimeter_mm: totalPerimeter,
      contour_details: selectedContours.map(c => ({
        id: c.id,
        is_exterior: c.is_exterior,
        perimeter_mm: c.perimeter_mm,
        area_mm2: c.area_mm2,
        segment_count: c.segments.length,
        has_arcs: c.segments.some(s => s.type === "arc"),
      })),
    };

    const finalPass = multiPassPlan.passes[multiPassPlan.passes.length - 1];

    // ---- Stage 6: Physics-based cycle time estimation (U-W100-19) ----
    const startHolePositions = profiles.map(p => p.start_hole);
    const cycleTimeBreakdown = estimateCycleTime(
      passSummaries,
      totalPerimeter,
      profiles.length,
      input.lead_in_mm ?? 2.0,
      input.lead_out_mm ?? 2.0,
      startHolePositions,
    );
    stages.push("cycle_time_estimated");

    // ---- Stage 7: Confidence scoring (U-W100-26) ----
    const epackCodes = passSummaries.map(p => p.e_pack_code).filter(c => c.length > 0);
    const confidenceScore = computeConfidenceScore(
      settings.derivation,
      multiPassPlan,
      geometryIssues.length,
      epackCodes,
      !!(input.contours && input.contours.length > 0),
      !!input.dxf_content,
    );
    stages.push("confidence_scored");

    return {
      success: true,
      program_text: gcodeResult.gcode,
      line_count: gcodeResult.line_count,
      controller: gcodeResult.controller,
      profiles_cut: gcodeResult.profiles_cut,
      passes_per_profile: gcodeResult.passes_generated,
      estimated_time_min: cycleTimeBreakdown.total_time_min,
      predicted_ra_um: finalPass?.predicted_ra_um ?? multiPassPlan.predicted_final_ra_um,
      predicted_accuracy_mm: multiPassPlan.predicted_final_tolerance_mm,
      pass_details: passSummaries,
      wire_consumption_m: multiPassPlan.total_wire_m,
      setup_sheet: setupSheet,
      geometry_summary: geometrySummary,
      warnings: [...warnings, ...gcodeResult.warnings],
      stages_completed: stages,
      cycle_time_breakdown: cycleTimeBreakdown,
      confidence_score: confidenceScore,
      slug_management: slugInfos.length > 0 ? slugInfos : undefined,
      flushing_strategy: flushingStrategy,
    };
  }

  private _failResult(input: WEDMProgramInput, warnings: string[]): WEDMProgramResult {
    const emptyCycleTime: CycleTimeBreakdown = {
      total_time_min: 0, per_pass: [], cutting_time_min: 0,
      threading_time_min: 0, dwell_time_min: 0, rapid_time_min: 0,
      aux_time_min: 0, summary: "No cycle time — generation failed",
    };
    return {
      success: false, program_text: "", line_count: 0,
      controller: input.controller || "mitsubishi", profiles_cut: 0,
      passes_per_profile: 0, estimated_time_min: 0, predicted_ra_um: 0,
      predicted_accuracy_mm: 0, pass_details: [], wire_consumption_m: 0,
      setup_sheet: this._emptySetupSheet(input),
      geometry_summary: { num_contours: 0, num_selected: 0, total_perimeter_mm: 0, contour_details: [] },
      warnings, stages_completed: [],
      cycle_time_breakdown: emptyCycleTime,
      confidence_score: {
        pulse: { score: 0, reason: "Generation failed" },
        offset: { score: 0, reason: "Generation failed" },
        feed: { score: 0, reason: "Generation failed" },
        epack: { score: 0, reason: "Generation failed" },
        geometry: { score: 0, reason: "Generation failed" },
        overall: 0,
        summary: "Generation failed — no confidence score available",
      },
    };
  }

  private _emptySetupSheet(input: WEDMProgramInput): SetupSheet {
    return {
      part_name: input.part_name || "",
      part_number: input.part_number || "",
      material: input.material,
      thickness_mm: input.thickness_mm,
      wire_type: input.wire_type || "coated_0.25",
      wire_diameter_mm: input.wire_diameter_mm || 0.25,
      controller: input.controller || "mitsubishi",
      program_number: input.program_number || 1,
      num_profiles: 0,
      num_passes: 0,
      total_time_min: 0,
      wire_needed_m: 0,
      flush_pressure_bar: 5,
      submerged: true,
      notes: [],
    };
  }
}

export const wedmPrintToProgramEngine = new WEDMPrintToProgramEngine();
