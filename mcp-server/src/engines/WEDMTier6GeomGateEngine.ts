/**
 * WEDMTier6GeomGateEngine — Tier 6 Progressive Die Geometry Validation
 *
 * Validates WEDM geometry constraints for progressive die and multi-slide parts:
 *   1. Minimum corner radius check (wire_dia + 2·gap)
 *   2. Part dimension envelope validation
 *   3. Feature spacing checks (punch-to-punch, slot widths)
 *   4. Station alignment verification
 *   5. Composite S(x) safety score
 *
 * Physics Model — Minimum Achievable Radius
 * -----------------------------------------
 * The wire cannot cut sharper than its physical kerf width:
 *
 *   R_min = wire_dia/2 + spark_gap
 *
 * For safety, the gate checks against a more conservative limit:
 *
 *   R_limit = wire_dia + 2·gap
 *
 * This ensures sufficient clearance for:
 *   - Wire bow at corners
 *   - Spark erosion uniformity
 *   - Finish pass offsets
 *
 * MS-P3-TIER6A/U-P3-T6A-04
 *
 * @see EDMWireSlugCornerTaperEngine — corner classification
 * @see EDMMultiPassStrategyEngine — finish pass planning
 *
 * Source: Mitsubishi MV1200R §3.2; Sodick VL400Q taper manual; Ho & Newman CIRP 2003
 */

import { WEDM_TAPER_SPEC, WEDM_HEAD_CLEARANCE, WEDM_SAFETY_GATE } from "../physics/wedm-constants.js";

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export type ValidationSeverity = "pass" | "warning" | "error" | "hard_block";

export interface CornerSpec {
  /** Corner ID or index */
  id: string | number;
  /** Corner radius [mm]. 0 for sharp. */
  radius_mm: number;
  /** Corner angle [degrees]. 90 = right angle. */
  angle_deg?: number;
  /** Corner location X [mm] */
  x?: number;
  /** Corner location Y [mm] */
  y?: number;
}

export interface StationSpec {
  /** Station number (1-based) */
  station_number: number;
  /** Station pitch from previous [mm] */
  pitch_mm: number;
  /** Station feature description */
  feature?: string;
  /** Station-specific corners */
  corners?: CornerSpec[];
}

export interface SlotSpec {
  /** Slot ID */
  id: string | number;
  /** Slot width [mm] */
  width_mm: number;
  /** Slot length [mm] */
  length_mm: number;
  /** Slot depth [mm] (for blind slots) */
  depth_mm?: number;
}

export interface Tier6GeomInput {
  /** Part name/ID */
  part_id: string;
  /** Wire diameter [mm]. Default 0.25. */
  wire_diameter_mm?: number;
  /** One-sided spark gap [mm]. Default 0.025. */
  spark_gap_mm?: number;
  /** Part thickness [mm]. Required. */
  thickness_mm: number;
  /** Part overall X dimension [mm]. */
  part_width_mm: number;
  /** Part overall Y dimension [mm]. */
  part_height_mm: number;
  /** Material type for speed lookup. */
  material?: string;
  /** List of corners to validate. */
  corners?: CornerSpec[];
  /** Progressive die station specs. */
  stations?: StationSpec[];
  /** Slot features to validate. */
  slots?: SlotSpec[];
  /** Number of die stations. */
  station_count?: number;
  /** Nominal station pitch [mm]. */
  station_pitch_mm?: number;
  /** Machine envelope X [mm]. Default 500. */
  machine_envelope_x_mm?: number;
  /** Machine envelope Y [mm]. Default 350. */
  machine_envelope_y_mm?: number;
  /** Machine envelope Z [mm]. Default 250. */
  machine_envelope_z_mm?: number;
  /** Whether to apply strict progressive die rules. */
  progressive_die_mode?: boolean;
  /** Allow tribal override for marginal cases. */
  tribal_override?: boolean;
}

export interface CornerValidation {
  corner_id: string | number;
  radius_mm: number;
  min_required_mm: number;
  margin_mm: number;
  severity: ValidationSeverity;
  message: string;
}

export interface SlotValidation {
  slot_id: string | number;
  width_mm: number;
  min_required_mm: number;
  margin_mm: number;
  severity: ValidationSeverity;
  message: string;
}

export interface StationValidation {
  station_number: number;
  pitch_mm: number;
  pitch_deviation_pct: number;
  severity: ValidationSeverity;
  message: string;
}

export interface EnvelopeValidation {
  dimension: "X" | "Y" | "Z";
  part_mm: number;
  envelope_mm: number;
  margin_pct: number;
  severity: ValidationSeverity;
  message: string;
}

export interface Tier6GeomResult {
  success: boolean;
  part_id: string;
  /** Overall safety score S(x) ∈ [0, 1] */
  safety_score: number;
  /** Safety verdict: pass, warning, hard_block */
  verdict: ValidationSeverity;
  /** Computed minimum achievable radius [mm] */
  min_achievable_radius_mm: number;
  /** Corner validations */
  corners: CornerValidation[];
  /** Slot validations */
  slots: SlotValidation[];
  /** Station validations */
  stations: StationValidation[];
  /** Envelope validations */
  envelope: EnvelopeValidation[];
  /** Count of errors by severity */
  error_counts: {
    pass: number;
    warning: number;
    error: number;
    hard_block: number;
  };
  /** Whether tribal override was applied */
  tribal_override_applied: boolean;
  /** Recommendations for fixing issues */
  recommendations: string[];
  /** Summary message */
  summary: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ══════════════════════════════════════════════════════════════════════════════

const DEFAULT_WIRE_DIA_MM = 0.25;
const DEFAULT_SPARK_GAP_MM = 0.025;
const DEFAULT_ENVELOPE_X_MM = 500;
const DEFAULT_ENVELOPE_Y_MM = 350;
const DEFAULT_ENVELOPE_Z_MM = 250;

/** Station pitch tolerance for progressive dies [%] */
const PITCH_TOLERANCE_PCT = 0.5;

/** Minimum margin from envelope edge [%] */
const ENVELOPE_MARGIN_PCT = 5;

// ══════════════════════════════════════════════════════════════════════════════
// ENGINE
// ══════════════════════════════════════════════════════════════════════════════

export class WEDMTier6GeomGateEngine {
  readonly name = "WEDMTier6GeomGateEngine";
  readonly version = "1.0.0";

  /**
   * Validate Tier 6 progressive die geometry.
   *
   * @param input - Geometry validation parameters
   * @returns Tier6GeomResult with safety score and validations
   */
  validate(input: Tier6GeomInput): Tier6GeomResult {
    if (!this.validateInput(input)) {
      return this.buildInvalidResult(input.part_id || "unknown", "Invalid input parameters");
    }

    const {
      part_id,
      wire_diameter_mm = DEFAULT_WIRE_DIA_MM,
      spark_gap_mm = DEFAULT_SPARK_GAP_MM,
      thickness_mm,
      part_width_mm,
      part_height_mm,
      corners = [],
      stations = [],
      slots = [],
      station_pitch_mm,
      machine_envelope_x_mm = DEFAULT_ENVELOPE_X_MM,
      machine_envelope_y_mm = DEFAULT_ENVELOPE_Y_MM,
      machine_envelope_z_mm = DEFAULT_ENVELOPE_Z_MM,
      progressive_die_mode = false,
      tribal_override = false,
    } = input;

    const minAchievableRadius = this.computeMinRadius(wire_diameter_mm, spark_gap_mm);
    const minSlotWidth = this.computeMinSlotWidth(wire_diameter_mm, spark_gap_mm);

    const cornerValidations = this.validateCorners(corners, minAchievableRadius);
    const slotValidations = this.validateSlots(slots, minSlotWidth);
    const stationValidations = this.validateStations(stations, station_pitch_mm, progressive_die_mode);
    const envelopeValidations = this.validateEnvelope(
      part_width_mm,
      part_height_mm,
      thickness_mm,
      machine_envelope_x_mm,
      machine_envelope_y_mm,
      machine_envelope_z_mm
    );

    const allValidations = [
      ...cornerValidations,
      ...slotValidations,
      ...stationValidations,
      ...envelopeValidations,
    ];

    const errorCounts = this.countErrors(allValidations);
    const safetyScore = this.computeSafetyScore(allValidations, errorCounts);
    const verdict = this.determineVerdict(safetyScore, errorCounts, tribal_override);
    const recommendations = this.generateRecommendations(
      cornerValidations,
      slotValidations,
      stationValidations,
      envelopeValidations,
      minAchievableRadius
    );

    return {
      success: verdict !== "hard_block",
      part_id,
      safety_score: Math.round(safetyScore * 1000) / 1000,
      verdict,
      min_achievable_radius_mm: Math.round(minAchievableRadius * 1000) / 1000,
      corners: cornerValidations,
      slots: slotValidations,
      stations: stationValidations,
      envelope: envelopeValidations,
      error_counts: errorCounts,
      tribal_override_applied: tribal_override && verdict !== "hard_block",
      recommendations,
      summary: this.buildSummary(part_id, verdict, safetyScore, errorCounts),
    };
  }

  /**
   * Compute minimum achievable radius for given wire and gap.
   *
   * R_limit = wire_dia + 2·gap (per milestone spec)
   */
  computeMinRadius(wire_diameter_mm: number, spark_gap_mm: number): number {
    return wire_diameter_mm + 2 * spark_gap_mm;
  }

  /**
   * Compute minimum slot width for wire to fit.
   *
   * Slot must be wide enough for wire + spark gap on both sides.
   */
  computeMinSlotWidth(wire_diameter_mm: number, spark_gap_mm: number): number {
    return wire_diameter_mm + 2 * spark_gap_mm;
  }

  /**
   * Check if a corner radius is achievable.
   */
  isCornerAchievable(
    corner_radius_mm: number,
    wire_diameter_mm: number = DEFAULT_WIRE_DIA_MM,
    spark_gap_mm: number = DEFAULT_SPARK_GAP_MM
  ): boolean {
    const minRadius = this.computeMinRadius(wire_diameter_mm, spark_gap_mm);
    return corner_radius_mm >= minRadius;
  }

  /**
   * Check if a slot is cuttable.
   */
  isSlotCuttable(
    slot_width_mm: number,
    wire_diameter_mm: number = DEFAULT_WIRE_DIA_MM,
    spark_gap_mm: number = DEFAULT_SPARK_GAP_MM
  ): boolean {
    const minWidth = this.computeMinSlotWidth(wire_diameter_mm, spark_gap_mm);
    return slot_width_mm >= minWidth;
  }

  /**
   * Get recommended wire diameter for a target corner radius.
   */
  recommendWireForRadius(target_radius_mm: number, spark_gap_mm: number = DEFAULT_SPARK_GAP_MM): number {
    // R_limit = wire_dia + 2·gap → wire_dia = R_limit - 2·gap
    const maxWire = target_radius_mm - 2 * spark_gap_mm;
    // Round to standard wire sizes: 0.10, 0.15, 0.20, 0.25, 0.30
    const standardSizes = [0.10, 0.15, 0.20, 0.25, 0.30];
    // Find largest standard size that fits
    let best = standardSizes[0];
    for (const size of standardSizes) {
      if (size <= maxWire) {
        best = size;
      }
    }
    return best;
  }

  /**
   * Batch validate multiple parts.
   */
  validateBatch(parts: Tier6GeomInput[]): Tier6GeomResult[] {
    return parts.map((part) => this.validate(part));
  }

  // ════════════════════════════════════════════════════════════════════════════
  // PRIVATE HELPERS
  // ════════════════════════════════════════════════════════════════════════════

  private validateCorners(corners: CornerSpec[], minRadius: number): CornerValidation[] {
    return corners.map((corner) => {
      const margin = corner.radius_mm - minRadius;
      let severity: ValidationSeverity;
      let message: string;

      if (corner.radius_mm === 0) {
        // Sharp corner - not achievable
        severity = "hard_block";
        message = `Sharp corner (R=0) not achievable. Minimum radius: ${minRadius.toFixed(3)}mm`;
      } else if (corner.radius_mm < minRadius) {
        severity = "hard_block";
        message = `Corner R${corner.radius_mm}mm < minimum achievable ${minRadius.toFixed(3)}mm`;
      } else if (margin < 0.05) {
        severity = "warning";
        message = `Corner R${corner.radius_mm}mm close to limit (margin: ${margin.toFixed(3)}mm)`;
      } else {
        severity = "pass";
        message = `Corner R${corner.radius_mm}mm OK (margin: ${margin.toFixed(3)}mm)`;
      }

      return {
        corner_id: corner.id,
        radius_mm: corner.radius_mm,
        min_required_mm: minRadius,
        margin_mm: Math.round(margin * 1000) / 1000,
        severity,
        message,
      };
    });
  }

  private validateSlots(slots: SlotSpec[], minWidth: number): SlotValidation[] {
    return slots.map((slot) => {
      const margin = slot.width_mm - minWidth;
      let severity: ValidationSeverity;
      let message: string;

      if (slot.width_mm < minWidth) {
        severity = "hard_block";
        message = `Slot ${slot.id} width ${slot.width_mm}mm < minimum ${minWidth.toFixed(3)}mm`;
      } else if (margin < 0.05) {
        severity = "warning";
        message = `Slot ${slot.id} width ${slot.width_mm}mm close to limit (margin: ${margin.toFixed(3)}mm)`;
      } else {
        severity = "pass";
        message = `Slot ${slot.id} width ${slot.width_mm}mm OK`;
      }

      return {
        slot_id: slot.id,
        width_mm: slot.width_mm,
        min_required_mm: minWidth,
        margin_mm: Math.round(margin * 1000) / 1000,
        severity,
        message,
      };
    });
  }

  private validateStations(
    stations: StationSpec[],
    nominalPitch?: number,
    progressiveMode: boolean = false
  ): StationValidation[] {
    if (!progressiveMode || stations.length === 0 || nominalPitch === undefined) {
      return [];
    }

    return stations.map((station) => {
      const deviation = Math.abs(station.pitch_mm - nominalPitch) / nominalPitch * 100;
      let severity: ValidationSeverity;
      let message: string;

      if (deviation > PITCH_TOLERANCE_PCT * 2) {
        severity = "error";
        message = `Station ${station.station_number} pitch ${station.pitch_mm}mm deviates ${deviation.toFixed(2)}% from nominal`;
      } else if (deviation > PITCH_TOLERANCE_PCT) {
        severity = "warning";
        message = `Station ${station.station_number} pitch ${station.pitch_mm}mm near tolerance`;
      } else {
        severity = "pass";
        message = `Station ${station.station_number} pitch ${station.pitch_mm}mm OK`;
      }

      return {
        station_number: station.station_number,
        pitch_mm: station.pitch_mm,
        pitch_deviation_pct: Math.round(deviation * 100) / 100,
        severity,
        message,
      };
    });
  }

  private validateEnvelope(
    partX: number,
    partY: number,
    partZ: number,
    envX: number,
    envY: number,
    envZ: number
  ): EnvelopeValidation[] {
    const validations: EnvelopeValidation[] = [];
    const checks: Array<{ dim: "X" | "Y" | "Z"; part: number; env: number }> = [
      { dim: "X", part: partX, env: envX },
      { dim: "Y", part: partY, env: envY },
      { dim: "Z", part: partZ, env: envZ },
    ];

    for (const { dim, part, env } of checks) {
      const margin = (env - part) / env * 100;
      let severity: ValidationSeverity;
      let message: string;

      if (part > env) {
        severity = "hard_block";
        message = `Part ${dim} (${part}mm) exceeds machine envelope (${env}mm)`;
      } else if (margin < ENVELOPE_MARGIN_PCT) {
        severity = "warning";
        message = `Part ${dim} (${part}mm) close to envelope limit (${margin.toFixed(1)}% margin)`;
      } else {
        severity = "pass";
        message = `Part ${dim} (${part}mm) within envelope (${margin.toFixed(1)}% margin)`;
      }

      validations.push({
        dimension: dim,
        part_mm: part,
        envelope_mm: env,
        margin_pct: Math.round(margin * 10) / 10,
        severity,
        message,
      });
    }

    return validations;
  }

  private countErrors(validations: Array<{ severity: ValidationSeverity }>): Tier6GeomResult["error_counts"] {
    const counts = { pass: 0, warning: 0, error: 0, hard_block: 0 };
    for (const v of validations) {
      counts[v.severity]++;
    }
    return counts;
  }

  private computeSafetyScore(
    validations: Array<{ severity: ValidationSeverity }>,
    counts: Tier6GeomResult["error_counts"]
  ): number {
    if (validations.length === 0) return 1.0;

    const total = validations.length;
    const weighted =
      counts.pass * 1.0 +
      counts.warning * 0.8 +
      counts.error * 0.4 +
      counts.hard_block * 0.0;

    return weighted / total;
  }

  private determineVerdict(
    safetyScore: number,
    counts: Tier6GeomResult["error_counts"],
    tribalOverride: boolean
  ): ValidationSeverity {
    // Hard blocks cannot be overridden
    if (counts.hard_block > 0) return "hard_block";

    const thresholds = WEDM_SAFETY_GATE.thresholds;

    if (safetyScore >= thresholds.pass) {
      return "pass";
    } else if (safetyScore >= thresholds.warn) {
      // Tribal override can promote warning to pass
      if (tribalOverride) return "pass";
      return "warning";
    } else {
      return "hard_block";
    }
  }

  private generateRecommendations(
    corners: CornerValidation[],
    slots: SlotValidation[],
    stations: StationValidation[],
    envelope: EnvelopeValidation[],
    minRadius: number
  ): string[] {
    const recs: string[] = [];

    const badCorners = corners.filter((c) => c.severity === "hard_block" || c.severity === "error");
    if (badCorners.length > 0) {
      recs.push(`Increase ${badCorners.length} corner radii to at least ${minRadius.toFixed(3)}mm`);
      const sharpCount = badCorners.filter((c) => c.radius_mm === 0).length;
      if (sharpCount > 0) {
        recs.push(`Add ${minRadius.toFixed(2)}mm fillets to ${sharpCount} sharp corners`);
      }
    }

    const badSlots = slots.filter((s) => s.severity === "hard_block" || s.severity === "error");
    if (badSlots.length > 0) {
      recs.push(`Widen ${badSlots.length} slots to minimum cuttable width`);
    }

    const badEnvelope = envelope.filter((e) => e.severity === "hard_block");
    if (badEnvelope.length > 0) {
      for (const e of badEnvelope) {
        recs.push(`Reduce part ${e.dimension} dimension or use larger machine`);
      }
    }

    const warnCorners = corners.filter((c) => c.severity === "warning");
    if (warnCorners.length > 0) {
      recs.push("Consider using finer wire (0.20mm or 0.15mm) for marginal corners");
    }

    if (stations.some((s) => s.severity !== "pass")) {
      recs.push("Verify station pitch alignment with die design");
    }

    return recs;
  }

  private buildSummary(
    partId: string,
    verdict: ValidationSeverity,
    score: number,
    counts: Tier6GeomResult["error_counts"]
  ): string {
    const verdictText = {
      pass: "PASS",
      warning: "WARNING",
      error: "ERROR",
      hard_block: "HARD BLOCK",
    }[verdict];

    const issues = counts.hard_block + counts.error + counts.warning;
    const issueText = issues > 0 ? ` (${issues} issue${issues > 1 ? "s" : ""})` : "";

    return `${partId}: ${verdictText} S(x)=${score.toFixed(3)}${issueText}`;
  }

  private validateInput(input: Tier6GeomInput): boolean {
    if (!input.part_id || typeof input.part_id !== "string") return false;
    if (typeof input.thickness_mm !== "number" || input.thickness_mm <= 0) return false;
    if (typeof input.part_width_mm !== "number" || input.part_width_mm <= 0) return false;
    if (typeof input.part_height_mm !== "number" || input.part_height_mm <= 0) return false;
    if (!Number.isFinite(input.thickness_mm)) return false;
    if (!Number.isFinite(input.part_width_mm)) return false;
    if (!Number.isFinite(input.part_height_mm)) return false;
    return true;
  }

  private buildInvalidResult(partId: string, reason: string): Tier6GeomResult {
    return {
      success: false,
      part_id: partId,
      safety_score: 0,
      verdict: "hard_block",
      min_achievable_radius_mm: 0,
      corners: [],
      slots: [],
      stations: [],
      envelope: [],
      error_counts: { pass: 0, warning: 0, error: 0, hard_block: 1 },
      tribal_override_applied: false,
      recommendations: [reason],
      summary: `${partId}: INVALID - ${reason}`,
    };
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// SINGLETON EXPORT
// ══════════════════════════════════════════════════════════════════════════════

export const wedmTier6GeomGateEngine = new WEDMTier6GeomGateEngine();
export default wedmTier6GeomGateEngine;
