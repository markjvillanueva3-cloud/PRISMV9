/**
 * LaserMarkingEngine — L2-P4-MS1 PASS2 Specialty
 *
 * Calculates laser marking/engraving parameters for traceability,
 * serialization, and part identification per aerospace/medical standards.
 *
 * Supports: annealing, engraving, etching, and color change marking
 * on various materials. Handles UDI, Data Matrix, and 1D/2D barcodes.
 *
 * Actions: laser_mark_calc, laser_mark_validate, laser_mark_recommend
 */

// ============================================================================
// TYPES
// ============================================================================

export type MarkType = "anneal" | "engrave" | "etch" | "color_change" | "foam" | "ablation";
export type MarkContent = "text" | "data_matrix" | "qr_code" | "barcode_1d" | "logo" | "serial";
export type LaserMarkSource = "fiber_1064" | "co2_10600" | "uv_355" | "green_532";

export interface LaserMarkInput {
  laser_source: LaserMarkSource;
  power_W: number;
  mark_type: MarkType;
  content_type: MarkContent;
  material: string;
  mark_area_mm2: number;
  character_height_mm: number;
  line_count?: number;
  scan_speed_mm_per_sec?: number;
  frequency_kHz?: number;
  compliance_standard?: string;        // e.g., "AMS 2431", "FDA UDI"
}

export interface LaserMarkResult {
  recommended_speed_mm_per_sec: number;
  recommended_frequency_kHz: number;
  recommended_power_pct: number;
  line_spacing_mm: number;
  mark_depth_um: number;
  mark_time_sec: number;
  heat_affected_zone_um: number;
  readability_grade: "A" | "B" | "C" | "D" | "F";
  meets_compliance: boolean;
  recommendations: string[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

const SOURCE_WAVELENGTH: Record<LaserMarkSource, number> = {
  fiber_1064: 1064, co2_10600: 10600, uv_355: 355, green_532: 532,
};

const MARK_DEPTH: Record<MarkType, number> = {
  anneal: 0, engrave: 30, etch: 5, color_change: 0, foam: 10, ablation: 15,
};

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class LaserMarkingEngine {
  calculate(input: LaserMarkInput): LaserMarkResult {
    const baseSpeed = input.scan_speed_mm_per_sec || 500;
    const baseFreq = input.frequency_kHz || 30;

    // Material absorptivity at wavelength
    const absorp = this._absorptivity(input.material, input.laser_source);

    // Recommended speed (slower for deeper marks, faster for anneal)
    const depthTarget = MARK_DEPTH[input.mark_type];
    const speedFactor = depthTarget > 0 ? 1.0 / (1 + depthTarget * 0.02) : 1.5;
    const recSpeed = baseSpeed * speedFactor * absorp;

    // Recommended frequency
    const recFreq = input.mark_type === "anneal" ? 80 : input.mark_type === "engrave" ? 20 : 40;

    // Power percentage
    const recPower = input.mark_type === "anneal" ? 30
      : input.mark_type === "engrave" ? 80
      : 50;

    // Line spacing (hatch distance)
    const lineSpacing = input.mark_type === "engrave" ? 0.02 : 0.04;

    // Mark time estimation
    const totalLines = input.mark_area_mm2 / lineSpacing / input.character_height_mm;
    const pathLength = totalLines * input.character_height_mm;
    const markTime = pathLength / recSpeed;

    // HAZ estimation
    const haz = input.mark_type === "anneal" ? 0
      : input.mark_type === "engrave" ? 15
      : 5;

    // Readability grade (for barcodes/data matrix)
    const readGrade: LaserMarkResult["readability_grade"] =
      input.character_height_mm >= 3 && depthTarget <= 5 ? "A"
      : input.character_height_mm >= 2 ? "B"
      : input.character_height_mm >= 1 ? "C"
      : "D";

    // Compliance check
    const meetsCompliance = !input.compliance_standard || (readGrade <= "B" && haz < 20);

    // Recommendations
    const recs: string[] = [];
    if (input.material.toLowerCase().includes("stainless") && input.mark_type === "engrave") {
      recs.push("Anneal marking preferred for stainless steel — maintains corrosion resistance");
    }
    if (input.content_type === "data_matrix" && input.character_height_mm < 2) {
      recs.push("Data matrix <2mm — may not meet readability requirements; increase size");
    }
    if (input.laser_source === "co2_10600" && input.material.toLowerCase().includes("metal")) {
      recs.push("CO2 laser poor for metals — use fiber (1064nm) for metal marking");
    }
    if (input.compliance_standard === "AMS 2431" && input.mark_type !== "anneal") {
      recs.push("AMS 2431 may require low-stress marking — verify anneal type is acceptable");
    }
    if (recs.length === 0) {
      recs.push("Laser marking parameters acceptable — verify readability after first article");
    }

    return {
      recommended_speed_mm_per_sec: Math.round(recSpeed * 10) / 10,
      recommended_frequency_kHz: recFreq,
      recommended_power_pct: recPower,
      line_spacing_mm: lineSpacing,
      mark_depth_um: depthTarget,
      mark_time_sec: Math.round(markTime * 100) / 100,
      heat_affected_zone_um: haz,
      readability_grade: readGrade,
      meets_compliance: meetsCompliance,
      recommendations: recs,
    };
  }

  private _absorptivity(material: string, source: LaserMarkSource): number {
    const m = material.toLowerCase();
    const wl = SOURCE_WAVELENGTH[source];
    if (wl <= 532 && m.includes("metal")) return 0.6; // UV/green good for metals
    if (wl === 1064 && m.includes("steel")) return 0.45;
    if (wl === 1064 && m.includes("aluminum")) return 0.3;
    if (wl === 10600 && m.includes("plastic")) return 0.9;
    if (wl === 10600 && m.includes("wood")) return 0.85;
    return 0.5;
  }
}

export const laserMarkingEngine = new LaserMarkingEngine();
