/**
 * TurningOffsetCompensationEngine — Wear-to-offset mapping, probing, auto-offset, accuracy prediction.
 *
 * Combines offset management capabilities for CNC lathe production:
 * 1. Wear-to-offset: VB → diameter growth/Z shift via approach angle geometry
 * 2. Probing cycle generator: Renishaw-compatible touch probe G-code
 * 3. Auto-offset macro: Custom Macro B (Fanuc), NVAR (Okuma), Macro (Haas)
 * 4. Accuracy predictor: dimension vs part number with/without compensation
 * 5. SPC Cpk prediction: with and without offset management
 *
 * Formulas:
 * - ΔD = 2 × VB × cos(κ_r) — diameter growth from flank wear
 * - ΔZ = VB × sin(κ_r) — Z-direction shift from nose wear
 * - Thermal: ΔL = α × L × ΔT — linear thermal expansion
 *
 * References:
 * - ISO 3685:1993 — wear measurement geometry
 * - Fanuc Custom Macro B Programming Manual
 * - Renishaw "Probing for CNC Lathes" application guide
 * - Sandvik "Offset management in turning" technical note
 *
 * @module engines/TurningOffsetCompensationEngine
 * @milestone LATHE-PRO-MS2 U-LPT01..U-LPT05
 */

import {
  CANONICAL_MATERIAL_DB,
  type ISOGroup,
} from "../physics/constants.js";

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface WearToOffsetInput {
  /** Flank wear VB [µm] */
  vb_um: number;
  /** Approach angle κ_r [degrees] — typically 90° for OD, 45° for facing */
  approach_angle_deg: number;
  /** Nose radius wear [µm] (optional, defaults to 30% of VB) */
  nose_wear_um?: number;
  /** Thermal growth of workpiece [µm] (optional) */
  thermal_growth_um?: number;
}

export interface WearToOffsetResult {
  /** Diameter error from wear [µm] — positive means part is oversize */
  delta_diameter_um: number;
  /** Z-direction error from wear [µm] */
  delta_z_um: number;
  /** Recommended X offset adjustment [µm] — negative tightens tolerance */
  x_offset_adj_um: number;
  /** Recommended Z offset adjustment [µm] */
  z_offset_adj_um: number;
  /** Total radial error including thermal [µm] */
  total_radial_error_um: number;
  source: string;
}

export type ControllerDialect = "fanuc" | "okuma" | "haas" | "mazak" | "siemens";

export interface ProbingCycleInput {
  controller: ControllerDialect;
  /** Probe type */
  probe_type: "od" | "bore" | "face" | "length";
  /** Nominal dimension [mm] */
  nominal_mm: number;
  /** Tolerance [mm] */
  tolerance_mm: number;
  /** Measurement Z position [mm] */
  z_position_mm: number;
  /** Tool offset register number */
  offset_register: number;
  /** Trigger: every N parts */
  trigger_every_n_parts?: number;
}

export interface ProbingCycleResult {
  /** Generated G-code for probing */
  gcode: string;
  /** Controller dialect used */
  controller: ControllerDialect;
  /** Cycle description */
  description: string;
}

export interface AutoOffsetMacroInput {
  controller: ControllerDialect;
  /** Nominal dimension [mm] */
  nominal_mm: number;
  /** Tolerance [mm] */
  tolerance_mm: number;
  /** Tool offset register number */
  offset_register: number;
  /** Max single adjustment [mm] (safety limit) */
  max_adjustment_mm?: number;
  /** Axis: X for diameter, Z for length */
  axis: "X" | "Z";
}

export interface AutoOffsetMacroResult {
  /** Generated macro code */
  macro_code: string;
  controller: ControllerDialect;
  /** Safety limit applied [mm] */
  safety_limit_mm: number;
  description: string;
}

export interface AccuracyPredictionInput {
  iso_group: ISOGroup;
  /** Nominal dimension [mm] */
  nominal_mm: number;
  /** Tolerance band [mm] (±) */
  tolerance_mm: number;
  /** Batch size */
  batch_size: number;
  /** Wear per part [µm VB] */
  wear_per_part_um: number;
  /** Approach angle [degrees] */
  approach_angle_deg?: number;
  /** Whether auto-offset is enabled */
  auto_offset_enabled?: boolean;
  /** Probe trigger interval (every N parts) */
  probe_interval?: number;
}

export interface AccuracyPredictionResult {
  /** Predicted dimension at each part [µm deviation from nominal] */
  dimension_curve: Array<{ part: number; deviation_um: number; in_tolerance: boolean }>;
  /** First part to exceed tolerance (without compensation) */
  first_oot_part_uncompensated: number;
  /** First part to exceed tolerance (with compensation, if enabled) */
  first_oot_part_compensated: number | null;
  /** Predicted Cpk without compensation */
  cpk_uncompensated: number;
  /** Predicted Cpk with compensation */
  cpk_compensated: number | null;
  /** Parts saved by auto-offset */
  parts_saved: number;
  source: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

/** Max single offset adjustment [mm] — prevents catastrophic crash */
const DEFAULT_MAX_ADJUSTMENT_MM = 0.050;

// ═══════════════════════════════════════════════════════════════════════════
// ENGINE
// ═══════════════════════════════════════════════════════════════════════════

class TurningOffsetCompensationEngine {

  // ── U-LPT01: Wear-to-Offset Mapping ─────────────────────────────────────

  /**
   * Convert flank/nose wear to dimensional error and offset adjustment.
   *
   * ΔD = 2 × VB × cos(κ_r) — Ref: ISO 3685, Sandvik wear geometry
   * ΔZ = VB × sin(κ_r)
   *
   * @param input - Wear state and geometry
   * @returns Offset adjustments in X and Z
   */
  wearToOffset(input: WearToOffsetInput): WearToOffsetResult {
    const kappa_rad = (input.approach_angle_deg * Math.PI) / 180;
    const vb_mm = input.vb_um / 1000;
    const noseWear_mm = (input.nose_wear_um ?? input.vb_um * 0.3) / 1000;

    // Diameter growth from flank wear
    const deltaD_mm = 2 * vb_mm * Math.cos(kappa_rad);
    const deltaD_um = deltaD_mm * 1000;

    // Z shift from nose wear
    const deltaZ_mm = noseWear_mm * Math.sin(kappa_rad);
    const deltaZ_um = deltaZ_mm * 1000;

    // Thermal growth contribution
    const thermal_um = input.thermal_growth_um ?? 0;

    // Offset adjustments (negative = compensate oversize → cut tighter)
    const xAdj = -(deltaD_um / 2 + thermal_um / 2);
    const zAdj = -deltaZ_um;

    return {
      delta_diameter_um: round2(deltaD_um),
      delta_z_um: round2(deltaZ_um),
      x_offset_adj_um: round2(xAdj),
      z_offset_adj_um: round2(zAdj),
      total_radial_error_um: round2(deltaD_um / 2 + thermal_um),
      source: "TurningOffsetCompensationEngine.wearToOffset (ISO 3685 geometry)",
    };
  }

  // ── U-LPT02: Probing Cycle Generator ────────────────────────────────────

  /**
   * Generate in-process probing G-code for various controllers.
   *
   * Ref: Renishaw "Probing for CNC Lathes", Fanuc Custom Macro B
   */
  generateProbingCycle(input: ProbingCycleInput): ProbingCycleResult {
    const generators: Record<ControllerDialect, () => string> = {
      fanuc: () => this.fanucProbe(input),
      haas: () => this.haasProbe(input),
      okuma: () => this.okumaProbe(input),
      mazak: () => this.mazakProbe(input),
      siemens: () => this.siemensProbe(input),
    };

    const gen = generators[input.controller] ?? generators.fanuc;
    return {
      gcode: gen(),
      controller: input.controller,
      description: `${input.probe_type} probe at Z${input.z_position_mm} for Ø${input.nominal_mm}±${input.tolerance_mm}`,
    };
  }

  private fanucProbe(p: ProbingCycleInput): string {
    const lines: string[] = [];
    lines.push(`(--- PROBING CYCLE: ${p.probe_type.toUpperCase()} ---)`);
    lines.push(`G00 Z${p.z_position_mm.toFixed(1)} (Move to measurement Z)`);
    if (p.probe_type === "od") {
      lines.push(`G65 P9023 D${p.nominal_mm.toFixed(3)} T${p.offset_register.toString().padStart(2, "0")} (Renishaw OD probe)`);
    } else if (p.probe_type === "bore") {
      lines.push(`G65 P9814 Z${p.z_position_mm.toFixed(1)} D${p.nominal_mm.toFixed(3)} T${p.offset_register.toString().padStart(2, "0")} (Renishaw bore probe)`);
    } else if (p.probe_type === "face") {
      lines.push(`G65 P9023 Z${p.nominal_mm.toFixed(3)} T${p.offset_register.toString().padStart(2, "0")} (Renishaw face probe)`);
    } else {
      lines.push(`G65 P9023 D${p.nominal_mm.toFixed(3)} T${p.offset_register.toString().padStart(2, "0")} (Renishaw length probe)`);
    }
    lines.push(`(Tolerance: ±${p.tolerance_mm.toFixed(3)} mm)`);
    return lines.join("\n");
  }

  private haasProbe(p: ProbingCycleInput): string {
    const lines: string[] = [];
    lines.push(`(--- HAAS PROBING CYCLE: ${p.probe_type.toUpperCase()} ---)`);
    lines.push(`G00 Z${p.z_position_mm.toFixed(1)}`);
    if (p.probe_type === "od") {
      lines.push(`G65 P9023 A${p.nominal_mm.toFixed(3)} B${p.tolerance_mm.toFixed(3)} T${p.offset_register}`);
    } else {
      lines.push(`G65 P9814 A${p.nominal_mm.toFixed(3)} B${p.tolerance_mm.toFixed(3)} T${p.offset_register}`);
    }
    return lines.join("\n");
  }

  private okumaProbe(p: ProbingCycleInput): string {
    const lines: string[] = [];
    lines.push(`(--- OKUMA PROBING CYCLE: ${p.probe_type.toUpperCase()} ---)`);
    lines.push(`G00 Z${p.z_position_mm.toFixed(1)}`);
    lines.push(`VMES[1]=${p.nominal_mm.toFixed(3)} (Nominal dimension)`);
    lines.push(`VMES[2]=${p.tolerance_mm.toFixed(3)} (Tolerance)`);
    lines.push(`CALL OMEASURE (Okuma measurement cycle)`);
    return lines.join("\n");
  }

  private mazakProbe(p: ProbingCycleInput): string {
    const lines: string[] = [];
    lines.push(`(--- MAZAK PROBING CYCLE: ${p.probe_type.toUpperCase()} ---)`);
    lines.push(`G00 Z${p.z_position_mm.toFixed(1)}`);
    lines.push(`G65 P8990 D${p.nominal_mm.toFixed(3)} L${p.tolerance_mm.toFixed(3)} T${p.offset_register}`);
    return lines.join("\n");
  }

  private siemensProbe(p: ProbingCycleInput): string {
    const lines: string[] = [];
    lines.push(`; --- SIEMENS PROBING CYCLE: ${p.probe_type.toUpperCase()} ---`);
    lines.push(`G0 Z${p.z_position_mm.toFixed(1)}`);
    lines.push(`CYCLE978(${p.nominal_mm.toFixed(3)},${p.tolerance_mm.toFixed(3)},${p.offset_register})`);
    return lines.join("\n");
  }

  // ── U-LPT03: Auto-Offset Macro ──────────────────────────────────────────

  /**
   * Generate macro code for automatic offset adjustment after probing.
   * Enforces safety limit: max single adjustment = 0.05mm by default.
   *
   * Ref: Fanuc Custom Macro B, Okuma NVAR system
   */
  generateAutoOffsetMacro(input: AutoOffsetMacroInput): AutoOffsetMacroResult {
    const maxAdj = input.max_adjustment_mm ?? DEFAULT_MAX_ADJUSTMENT_MM;
    const generators: Record<ControllerDialect, () => string> = {
      fanuc: () => this.fanucMacro(input, maxAdj),
      haas: () => this.haasMacro(input, maxAdj),
      okuma: () => this.okumaMacro(input, maxAdj),
      mazak: () => this.mazakMacro(input, maxAdj),
      siemens: () => this.siemensMacro(input, maxAdj),
    };

    const gen = generators[input.controller] ?? generators.fanuc;
    return {
      macro_code: gen(),
      controller: input.controller,
      safety_limit_mm: maxAdj,
      description: `Auto-offset ${input.axis} for T${input.offset_register}, ±${maxAdj}mm max`,
    };
  }

  private fanucMacro(p: AutoOffsetMacroInput, maxAdj: number): string {
    const reg = p.offset_register;
    const nominal = p.nominal_mm;
    const axis = p.axis;
    // #500 = measured value (from probe), #501 = nominal, #502 = error, #503 = offset register
    return [
      `(--- AUTO-OFFSET MACRO: ${axis} AXIS, T${reg} ---)`,
      `#501 = ${nominal.toFixed(3)} (Nominal)`,
      `#502 = #500 - #501 (Error = measured - nominal)`,
      `IF [ABS[#502] GT ${maxAdj.toFixed(3)}] GOTO 9000 (Safety: reject if > ${maxAdj}mm)`,
      axis === "X"
        ? `#[10000 + ${reg} * 2] = #[10000 + ${reg} * 2] - #502 / 2 (Adjust X wear offset — diameter)`
        : `#[11000 + ${reg}] = #[11000 + ${reg}] - #502 (Adjust Z wear offset)`,
      `#3000 = 0 (Clear alarm)`,
      `M99`,
      `N9000 #3000 = 100 (ALARM: OFFSET EXCEEDS ${maxAdj}mm SAFETY LIMIT)`,
    ].join("\n");
  }

  private haasMacro(p: AutoOffsetMacroInput, maxAdj: number): string {
    return [
      `(--- HAAS AUTO-OFFSET: ${p.axis} AXIS, T${p.offset_register} ---)`,
      `#501 = ${p.nominal_mm.toFixed(3)}`,
      `#502 = #500 - #501`,
      `IF [ABS[#502] GT ${maxAdj.toFixed(3)}] GOTO 9000`,
      p.axis === "X"
        ? `#[10001 + ${p.offset_register}] = #[10001 + ${p.offset_register}] - #502 / 2`
        : `#[11001 + ${p.offset_register}] = #[11001 + ${p.offset_register}] - #502`,
      `M99`,
      `N9000 #3000 = 100 (SAFETY LIMIT EXCEEDED)`,
    ].join("\n");
  }

  private okumaMacro(p: AutoOffsetMacroInput, maxAdj: number): string {
    return [
      `(--- OKUMA AUTO-OFFSET: ${p.axis} AXIS, T${p.offset_register} ---)`,
      `VNOMINAL = ${p.nominal_mm.toFixed(3)}`,
      `VERROR = VMEASURED - VNOMINAL`,
      `IF [ABS[VERROR] GT ${maxAdj.toFixed(3)}] THEN`,
      `  NVAR = 100 : REM ALARM - SAFETY LIMIT`,
      `ELSE`,
      p.axis === "X"
        ? `  VTOFX[${p.offset_register}] = VTOFX[${p.offset_register}] - VERROR / 2`
        : `  VTOFZ[${p.offset_register}] = VTOFZ[${p.offset_register}] - VERROR`,
      `END IF`,
    ].join("\n");
  }

  private mazakMacro(p: AutoOffsetMacroInput, maxAdj: number): string {
    return [
      `(--- MAZAK AUTO-OFFSET: ${p.axis} AXIS, T${p.offset_register} ---)`,
      `#501 = ${p.nominal_mm.toFixed(3)}`,
      `#502 = #500 - #501`,
      `IF [ABS[#502] GT ${maxAdj.toFixed(3)}] GOTO 9000`,
      p.axis === "X"
        ? `#[10000 + ${p.offset_register} * 2] = #[10000 + ${p.offset_register} * 2] - #502 / 2`
        : `#[11000 + ${p.offset_register}] = #[11000 + ${p.offset_register}] - #502`,
      `M99`,
      `N9000 #3000 = 100 (SAFETY LIMIT)`,
    ].join("\n");
  }

  private siemensMacro(p: AutoOffsetMacroInput, maxAdj: number): string {
    return [
      `; --- SIEMENS AUTO-OFFSET: ${p.axis} AXIS, T${p.offset_register} ---`,
      `DEF REAL NOMINAL = ${p.nominal_mm.toFixed(3)}`,
      `DEF REAL ERROR = $AA_MW[${p.axis === "X" ? 1 : 3}] - NOMINAL`,
      `IF ABS(ERROR) > ${maxAdj.toFixed(3)}`,
      `  SETAL(61000) ; Safety alarm`,
      `ELSE`,
      `  $TC_DP${p.axis === "X" ? "3" : "4"}[1,${p.offset_register}] = $TC_DP${p.axis === "X" ? "3" : "4"}[1,${p.offset_register}] - ERROR${p.axis === "X" ? " / 2" : ""}`,
      `ENDIF`,
    ].join("\n");
  }

  // ── U-LPT04: Accuracy Prediction ────────────────────────────────────────

  /**
   * Predict dimensional accuracy across a batch with and without auto-compensation.
   * Also computes predicted Cpk.
   *
   * @param input - Batch parameters and wear rate
   * @returns Dimension curve, OOT part numbers, Cpk values
   */
  predictAccuracy(input: AccuracyPredictionInput): AccuracyPredictionResult {
    const kappa_deg = input.approach_angle_deg ?? 90;
    const kappa_rad = (kappa_deg * Math.PI) / 180;
    const tolUm = input.tolerance_mm * 1000;
    const probeInterval = input.probe_interval ?? 10;

    const curve: AccuracyPredictionResult["dimension_curve"] = [];
    let firstOOT_uncomp = input.batch_size + 1;
    let firstOOT_comp: number | null = null;
    let accumulatedWear = 0;
    let lastCorrectedWear = 0;

    const deviations_uncomp: number[] = [];
    const deviations_comp: number[] = [];

    for (let part = 1; part <= input.batch_size; part++) {
      accumulatedWear += input.wear_per_part_um;

      // Uncompensated deviation
      const deltaD_um = 2 * (accumulatedWear / 1000) * Math.cos(kappa_rad) * 1000;
      deviations_uncomp.push(deltaD_um);

      if (deltaD_um > tolUm && part < firstOOT_uncomp) {
        firstOOT_uncomp = part;
      }

      // Compensated deviation (probing resets accumulated error)
      let compDeviation = deltaD_um;
      if (input.auto_offset_enabled) {
        if (part % probeInterval === 0) {
          lastCorrectedWear = accumulatedWear;
        }
        const residualWear = accumulatedWear - lastCorrectedWear;
        compDeviation = 2 * (residualWear / 1000) * Math.cos(kappa_rad) * 1000;
      }
      deviations_comp.push(compDeviation);

      if (input.auto_offset_enabled && compDeviation > tolUm && firstOOT_comp === null) {
        firstOOT_comp = part;
      }

      // Sample the curve (every 5th part or key points)
      if (part <= 5 || part % 5 === 0 || part === input.batch_size) {
        curve.push({
          part,
          deviation_um: round2(input.auto_offset_enabled ? compDeviation : deltaD_um),
          in_tolerance: (input.auto_offset_enabled ? compDeviation : deltaD_um) <= tolUm,
        });
      }
    }

    // Cpk calculation
    const cpk_uncomp = this.computeCpk(deviations_uncomp, tolUm);
    const cpk_comp = input.auto_offset_enabled ? this.computeCpk(deviations_comp, tolUm) : null;

    const partsSaved = input.auto_offset_enabled
      ? Math.max(0, (firstOOT_comp ?? input.batch_size + 1) - firstOOT_uncomp)
      : 0;

    return {
      dimension_curve: curve,
      first_oot_part_uncompensated: firstOOT_uncomp > input.batch_size ? input.batch_size : firstOOT_uncomp,
      first_oot_part_compensated: input.auto_offset_enabled
        ? (firstOOT_comp !== null && firstOOT_comp <= input.batch_size ? firstOOT_comp : null)
        : null,
      cpk_uncompensated: round2(cpk_uncomp),
      cpk_compensated: cpk_comp !== null ? round2(cpk_comp) : null,
      parts_saved: partsSaved,
      source: "TurningOffsetCompensationEngine.predictAccuracy",
    };
  }

  /** Compute process capability Cpk from deviation data */
  private computeCpk(deviations: number[], toleranceUm: number): number {
    if (deviations.length < 2) return 0;
    const mean = deviations.reduce((s, d) => s + d, 0) / deviations.length;
    const variance = deviations.reduce((s, d) => s + (d - mean) ** 2, 0) / (deviations.length - 1);
    const sigma = Math.sqrt(variance);
    if (sigma <= 0) return 10; // Perfect process

    // Cpk = min((USL - µ), (µ - LSL)) / (3σ)
    // USL = +toleranceUm, LSL = -toleranceUm (but deviations are always positive = oversize)
    // So Cpu = (toleranceUm - mean) / (3σ)
    const cpu = (toleranceUm - mean) / (3 * sigma);
    const cpl = (mean + toleranceUm) / (3 * sigma); // LSL is negative
    return Math.min(cpu, cpl);
  }
}

function round2(n: number): number { return Math.round(n * 100) / 100; }

export const turningOffsetCompensationEngine = new TurningOffsetCompensationEngine();
export { TurningOffsetCompensationEngine };
