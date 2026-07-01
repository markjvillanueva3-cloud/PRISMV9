/**
 * StockSelectionEngine — Automatic Bar Stock Selection from Part Geometry
 *
 * Computes optimal raw material selection for CNC turning:
 *   - Bar stock diameter: nearest standard size + facing allowance
 *   - Bar length: part + facing stock + cutoff width + grip length
 *   - Material weight from density × volume
 *   - Remnant percentage (waste ratio)
 *   - Supports metric, imperial, tube, and hex stock catalogs
 *
 * References:
 *   - ISO 1035-1 (hot-rolled steel bars — diameter tolerances)
 *   - ASTM A108 (cold-finished carbon/alloy steel bars)
 *   - Material densities from canonical physics constants
 *
 * @module engines/StockSelectionEngine
 * @milestone LATHE-PRO-MS-1
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

export type StockShape = "round" | "tube" | "hex" | "square";

export interface StockSelectionInput {
  /** Maximum finished OD of the part (mm) */
  max_finished_od_mm: number;
  /** Total finished part length (mm) */
  part_length_mm: number;
  /** Material ISO group for density lookup */
  iso_group?: "P" | "M" | "K" | "N" | "S" | "H";
  /** Material density override (kg/m³) */
  density_kg_m3?: number;
  /** Preferred stock shape */
  preferred_shape?: StockShape;
  /** Preferred unit system */
  preferred_units?: "metric" | "imperial" | "any";
  /** Minimum bore ID (mm) — if > 0, consider tube stock */
  min_bore_id_mm?: number;
  /** Machine bar feeder capacity (max OD, mm) */
  bar_feeder_max_od_mm?: number;
  /** Machine chuck capacity (max OD, mm) */
  chuck_max_od_mm?: number;
  /** Cutoff tool width (mm, default 3.0) */
  cutoff_width_mm?: number;
  /** Grip length for chuck/collet (mm, default 25) */
  grip_length_mm?: number;
  /** Facing allowance per end (mm, default 1.0) */
  facing_allowance_mm?: number;
  /** Number of parts per bar (for batch optimization) */
  parts_per_bar?: number;
}

export interface StockCandidate {
  /** Stock outer diameter (mm) */
  od_mm: number;
  /** Stock inner diameter for tube (mm), 0 for solid */
  id_mm: number;
  /** Stock shape */
  shape: StockShape;
  /** Whether this is a standard catalog size */
  is_standard: boolean;
  /** Unit system of the stock */
  unit_system: "metric" | "imperial";
  /** Original catalog value (for display) */
  catalog_value: string;
  /** Required bar length for 1 part (mm) */
  bar_length_1pc_mm: number;
  /** Material weight for 1 part's stock (kg) */
  weight_1pc_kg: number;
  /** Material volume for finished part (mm³, approximate) */
  finished_volume_mm3: number;
  /** Material removed (mm³) */
  removed_volume_mm3: number;
  /** Remnant percentage: material removed / stock volume */
  remnant_pct: number;
  /** Radial allowance: (stock_od - finished_od) / 2 */
  radial_allowance_mm: number;
  /** Score (lower = better, weighted by waste, availability, allowance) */
  score: number;
}

export interface StockSelectionResult {
  /** Whether a valid stock was found */
  success: boolean;
  /** Best recommendation */
  recommended: StockCandidate | null;
  /** All candidates ranked by score */
  candidates: StockCandidate[];
  /** Warnings */
  warnings: string[];
  /** Input echo for traceability */
  input_echo: {
    max_od_mm: number;
    part_length_mm: number;
    iso_group: string;
    density_kg_m3: number;
  };
}

// ============================================================================
// STOCK CATALOGS
// ============================================================================

/** Standard metric round bar sizes (mm) — ISO 1035, common CNC stock */
const METRIC_ROUND: number[] = [
  6, 8, 10, 12, 14, 16, 18, 20, 22, 25,
  28, 30, 32, 35, 38, 40, 42, 45, 48, 50,
  55, 60, 63, 65, 70, 75, 80, 85, 90, 95,
  100, 110, 120, 125, 130, 140, 150, 160, 170, 180,
  190, 200, 220, 250, 280, 300,
];

/** Standard imperial round bar sizes (inches → mm) */
const IMPERIAL_ROUND_IN: number[] = [
  0.250, 0.3125, 0.375, 0.500, 0.625, 0.750, 0.875,
  1.000, 1.125, 1.250, 1.375, 1.500, 1.625, 1.750,
  2.000, 2.250, 2.500, 2.750,
  3.000, 3.250, 3.500, 3.750,
  4.000, 4.500, 5.000, 5.500, 6.000,
  7.000, 8.000, 9.000, 10.000, 12.000,
];

/** Standard metric tube stock: [OD_mm, wall_mm] */
const METRIC_TUBE: Array<[number, number]> = [
  [20, 2], [20, 3], [25, 2], [25, 3], [25, 5],
  [30, 3], [30, 5], [32, 3], [32, 5],
  [35, 3], [35, 5], [38, 3], [38, 5],
  [40, 3], [40, 5], [42, 3], [42, 5],
  [45, 5], [48, 5], [50, 5], [50, 8],
  [55, 5], [60, 5], [60, 8], [63, 5],
  [65, 5], [70, 5], [70, 8], [75, 5], [75, 8],
  [80, 5], [80, 8], [80, 10], [85, 5], [90, 5], [90, 8],
  [95, 5], [100, 5], [100, 8], [100, 10],
  [110, 8], [120, 8], [120, 10], [125, 10],
  [130, 10], [140, 10], [150, 10], [160, 10],
];

/** Standard metric hex bar sizes — across-flats (mm) */
const METRIC_HEX_AF: number[] = [
  6, 7, 8, 10, 12, 13, 14, 17, 19, 22, 24, 27, 30, 32, 36, 41, 46, 50, 55, 60, 65, 70, 75,
];

// ============================================================================
// MATERIAL DENSITIES (kg/m³) — by ISO group
// Reference: Matweb.com, ASM Handbook Vol. 1
// ============================================================================

const DENSITY_BY_ISO: Record<string, number> = {
  P: 7850,   // Carbon/alloy steel
  M: 7950,   // Stainless steel (304/316 average)
  K: 7200,   // Cast iron
  N: 2700,   // Aluminum (6061/7075 average)
  S: 4430,   // Titanium (Ti-6Al-4V)
  H: 7800,   // Hardened tool steel
};

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class StockSelectionEngine {

  /**
   * Select optimal bar stock for a turned part.
   *
   * @param input - Part geometry and constraints
   * @returns Ranked stock candidates with the best recommendation
   */
  select(input: StockSelectionInput): StockSelectionResult {
    const startMs = Date.now();
    const warnings: string[] = [];

    const maxOD = input.max_finished_od_mm;
    const partLen = input.part_length_mm;
    const isoGroup = input.iso_group || "P";
    const density = input.density_kg_m3 || DENSITY_BY_ISO[isoGroup] || 7850;
    const cutoff = input.cutoff_width_mm ?? 3.0;
    const grip = input.grip_length_mm ?? 25;
    const facingAllowance = input.facing_allowance_mm ?? 1.0;
    const preferredUnits = input.preferred_units || "any";
    const preferredShape = input.preferred_shape || "round";
    const boreID = input.min_bore_id_mm || 0;

    log.info(`[StockSelection] OD=${maxOD}mm, L=${partLen}mm, ISO=${isoGroup}, shape=${preferredShape}`);

    if (maxOD <= 0 || partLen <= 0) {
      return {
        success: false, recommended: null, candidates: [],
        warnings: ["Invalid input: OD and length must be > 0"],
        input_echo: { max_od_mm: maxOD, part_length_mm: partLen, iso_group: isoGroup, density_kg_m3: density },
      };
    }

    // ── Compute required bar length for 1 part ──
    const barLength1pc = partLen + (facingAllowance * 2) + cutoff + grip;

    // ── Radial allowance: minimum 1mm per side for cleanup ──
    const minRadialAllowance = 1.0;
    const requiredOD = maxOD + minRadialAllowance * 2;

    // ── Finished part approximate volume (cylinder) ──
    const finishedVol = Math.PI / 4 * maxOD * maxOD * partLen; // mm³

    // ── Generate candidates ──
    const candidates: StockCandidate[] = [];

    // Metric round bar
    if (preferredUnits !== "imperial") {
      for (const size of METRIC_ROUND) {
        if (size < requiredOD) continue;
        if (size > requiredOD * 3) break; // Don't consider stock >3x the part size
        if (input.chuck_max_od_mm && size > input.chuck_max_od_mm) continue;
        if (input.bar_feeder_max_od_mm && size > input.bar_feeder_max_od_mm) continue;

        candidates.push(this.buildCandidate(
          size, 0, "round", "metric", `Ø${size}mm`,
          barLength1pc, finishedVol, maxOD, density,
        ));
      }
    }

    // Imperial round bar
    if (preferredUnits !== "metric") {
      for (const sizeIn of IMPERIAL_ROUND_IN) {
        const sizeMM = sizeIn * 25.4;
        if (sizeMM < requiredOD) continue;
        if (sizeMM > requiredOD * 3) break;
        if (input.chuck_max_od_mm && sizeMM > input.chuck_max_od_mm) continue;
        if (input.bar_feeder_max_od_mm && sizeMM > input.bar_feeder_max_od_mm) continue;

        const label = this.formatImperial(sizeIn);
        candidates.push(this.buildCandidate(
          sizeMM, 0, "round", "imperial", label,
          barLength1pc, finishedVol, maxOD, density,
        ));
      }
    }

    // Tube stock (if bore exists and OD > 20mm)
    if ((preferredShape === "tube" || boreID > 5) && maxOD >= 18) {
      for (const [tubeOD, wall] of METRIC_TUBE) {
        const tubeID = tubeOD - wall * 2;
        if (tubeOD < requiredOD) continue;
        if (tubeOD > requiredOD * 2.5) continue;
        // Tube ID must be smaller than the finished bore (need machining allowance)
        if (boreID > 0 && tubeID > boreID - 2) continue;
        if (input.chuck_max_od_mm && tubeOD > input.chuck_max_od_mm) continue;

        candidates.push(this.buildCandidate(
          tubeOD, tubeID, "tube", "metric",
          `Ø${tubeOD}×${wall}mm tube`,
          barLength1pc, finishedVol, maxOD, density,
        ));
      }
    }

    // Hex stock (if hex feature or preferred)
    if (preferredShape === "hex") {
      for (const af of METRIC_HEX_AF) {
        // Hex across-flats → circumscribed circle diameter
        const circumOD = af / Math.cos(Math.PI / 6); // AF / cos(30°)
        if (circumOD < requiredOD) continue;
        if (circumOD > requiredOD * 2.5) break;

        candidates.push(this.buildCandidate(
          circumOD, 0, "hex", "metric", `${af}mm AF hex`,
          barLength1pc, finishedVol, maxOD, density,
        ));
      }
    }

    // ── Sort by score ──
    candidates.sort((a, b) => a.score - b.score);

    // ── Machine constraints warnings ──
    if (input.bar_feeder_max_od_mm && requiredOD > input.bar_feeder_max_od_mm) {
      warnings.push(`Part OD ${maxOD}mm exceeds bar feeder capacity ${input.bar_feeder_max_od_mm}mm — manual loading required`);
    }
    if (input.chuck_max_od_mm && requiredOD > input.chuck_max_od_mm) {
      warnings.push(`Part OD ${maxOD}mm exceeds chuck capacity ${input.chuck_max_od_mm}mm`);
    }

    // ── Tube stock suggestion ──
    if (boreID > 10 && preferredShape === "round") {
      const tubeCandidate = candidates.find(c => c.shape === "tube");
      if (!tubeCandidate) {
        warnings.push(`Bore Ø${boreID}mm detected — consider tube stock to reduce material removal`);
      }
    }

    const recommended = candidates.length > 0 ? candidates[0] : null;

    if (!recommended) {
      warnings.push("No standard stock found — custom size or forging required");
    }

    const elapsed = Date.now() - startMs;
    log.info(`[StockSelection] ${candidates.length} candidates, best: ${recommended?.catalog_value || "none"} in ${elapsed}ms`);

    return {
      success: candidates.length > 0,
      recommended,
      candidates: candidates.slice(0, 10), // Top 10
      warnings,
      input_echo: { max_od_mm: maxOD, part_length_mm: partLen, iso_group: isoGroup, density_kg_m3: density },
    };
  }

  /**
   * Compute how many parts fit in a standard bar length.
   *
   * @param stockOD - Stock diameter (mm)
   * @param partLength - Finished part length (mm)
   * @param barLengths - Available bar lengths to check (mm), default [1000, 2000, 3000, 6000]
   * @returns Parts per bar for each bar length
   */
  partsPerBar(
    partLength: number,
    cutoffWidth: number = 3.0,
    gripLength: number = 25,
    facingAllowance: number = 1.0,
    barLengths: number[] = [1000, 2000, 3000, 6000],
  ): Array<{ bar_length_mm: number; parts_count: number; remnant_mm: number; utilization_pct: number }> {
    const perPart = partLength + facingAllowance * 2 + cutoffWidth;
    const results: Array<{ bar_length_mm: number; parts_count: number; remnant_mm: number; utilization_pct: number }> = [];

    for (const barLen of barLengths) {
      const usable = barLen - gripLength; // Grip on one end
      const parts = Math.max(0, Math.floor(usable / perPart));
      const used = parts * perPart + gripLength;
      const remnant = barLen - used;
      const utilization = parts > 0 ? (parts * (partLength + facingAllowance * 2)) / barLen * 100 : 0;

      results.push({
        bar_length_mm: barLen,
        parts_count: parts,
        remnant_mm: Math.max(0, remnant),
        utilization_pct: Math.round(utilization * 10) / 10,
      });
    }

    return results;
  }

  // ── Private Helpers ──────────────────────────────────────────────

  /** Build a stock candidate with computed metrics */
  private buildCandidate(
    od: number,
    id: number,
    shape: StockShape,
    unitSystem: "metric" | "imperial",
    catalogValue: string,
    barLength1pc: number,
    finishedVolume: number,
    finishedOD: number,
    density: number,
  ): StockCandidate {
    // Stock volume for 1 part's length
    const stockArea = shape === "hex"
      ? (3 * Math.sqrt(3) / 2) * (od * Math.cos(Math.PI / 6) / 2) ** 2  // hex area from circumscribed OD
      : Math.PI / 4 * (od * od - id * id);  // round/tube annular area
    const stockVol = stockArea * barLength1pc; // mm³
    const removedVol = stockVol - finishedVolume;
    const remnantPct = stockVol > 0 ? (removedVol / stockVol) * 100 : 100;
    const weight = (density / 1e9) * stockVol; // kg (density in kg/m³ → kg/mm³ = /1e9)
    const radialAllowance = (od - finishedOD) / 2;

    // Score: lower is better
    // Factors: waste (40%), radial allowance closeness (30%), standard preference (20%), unit preference (10%)
    const wastePenalty = remnantPct * 0.4;
    const allowancePenalty = Math.max(0, radialAllowance - 2) * 5 * 0.3; // Penalty for >2mm allowance
    const standardBonus = 0; // All catalog sizes are standard
    const unitPenalty = 0; // Already filtered by preference

    const score = wastePenalty + allowancePenalty + standardBonus + unitPenalty;

    return {
      od_mm: Math.round(od * 100) / 100,
      id_mm: Math.round(id * 100) / 100,
      shape,
      is_standard: true,
      unit_system: unitSystem,
      catalog_value: catalogValue,
      bar_length_1pc_mm: Math.round(barLength1pc * 10) / 10,
      weight_1pc_kg: Math.round(weight * 1000) / 1000,
      finished_volume_mm3: Math.round(finishedVolume),
      removed_volume_mm3: Math.round(Math.max(0, removedVol)),
      remnant_pct: Math.round(remnantPct * 10) / 10,
      radial_allowance_mm: Math.round(radialAllowance * 100) / 100,
      score: Math.round(score * 100) / 100,
    };
  }

  /** Format imperial size as fraction string */
  private formatImperial(inches: number): string {
    // Common fractions
    const fracs: Array<[number, string]> = [
      [0.250, "1/4\""], [0.3125, "5/16\""], [0.375, "3/8\""],
      [0.500, "1/2\""], [0.625, "5/8\""], [0.750, "3/4\""],
      [0.875, "7/8\""], [1.000, "1\""], [1.125, "1-1/8\""],
      [1.250, "1-1/4\""], [1.375, "1-3/8\""], [1.500, "1-1/2\""],
      [1.625, "1-5/8\""], [1.750, "1-3/4\""],
      [2.000, "2\""], [2.250, "2-1/4\""], [2.500, "2-1/2\""],
      [2.750, "2-3/4\""], [3.000, "3\""], [3.250, "3-1/4\""],
      [3.500, "3-1/2\""], [3.750, "3-3/4\""],
      [4.000, "4\""], [4.500, "4-1/2\""], [5.000, "5\""],
      [5.500, "5-1/2\""], [6.000, "6\""],
      [7.000, "7\""], [8.000, "8\""], [9.000, "9\""],
      [10.000, "10\""], [12.000, "12\""],
    ];

    for (const [val, label] of fracs) {
      if (Math.abs(val - inches) < 0.001) return label;
    }
    return `${inches}"`;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const stockSelectionEngine = new StockSelectionEngine();
