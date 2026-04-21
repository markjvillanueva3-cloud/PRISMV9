/**
 * WEDMJobUnitPresenterEngine — Inch-first I/O for WEDMJobOutcomeEngine.
 *
 * Context
 * -------
 * JM Die and most US shops work in inches, microinches (µin for surface
 * finish), and feet (for wire spool consumption). WEDM_JOB_HISTORY.json
 * stores canonical SI (mm, µm, m) per schema v1. This engine is the
 * presentation layer that:
 *
 *   • Accepts a US-denominated job record and rewrites it into the
 *     canonical SI shape consumed by WEDMJobOutcomeEngine.record().
 *   • Translates a stored record back to a US view for dashboards / reports.
 *   • Translates history stats to US units for shop-floor dashboards.
 *
 * Design
 * ------
 *   • Constants: the mm→inch factor is `INCHES_PER_MM = 1 / 25.4`, where
 *     25.4 mm per inch is the EXACT definition from the International Yard
 *     and Pound Agreement of 1959 (NIST SP 811 §B.8). Not a measurement,
 *     not a fabrication — it is the SI/US customary bridge by treaty.
 *   • We avoid the pre-existing UnitConversionEngine.convert() entry point
 *     because it rounds to 4 decimals; WEDM tolerances are routinely 5-6
 *     decimals (0.00005" = 0.00127 mm). We use the same numeric factor
 *     directly and cite the canonical source here.
 *   • Round-trip: inch → mm → inch is bit-exact for values whose binary-64
 *     representation permits it; the test file asserts ≤ 1 ULP on a curated
 *     set of typical shop values (0.500", 0.250", 0.010", 0.0005", etc.).
 *
 * Scope
 * -----
 *   Inch-presentation only. No physics is re-computed. No Ra is re-derived.
 *   This is a pure lossless unit-relabeling pass over existing records.
 *
 * References
 * ----------
 *   • NIST Special Publication 811 (2008), Appendix B, Table B.8.
 *   • International Yard and Pound Agreement of 1959.
 *   • ASME Y14.5 — Geometric Dimensioning and Tolerancing (US drawing
 *     convention: inches / microinches for WEDM wire-path work).
 *
 * @module engines/WEDMJobUnitPresenterEngine
 */

import type {
  RecordJobInput,
} from "./WEDMJobOutcomeEngine.js";
import type {
  WEDMJobRecord,
} from "../schemas/wedmJobHistorySchema.js";

// ─────────────────────────────────────────────────────────────────────────────
// CANONICAL CONSTANTS (literature-cited)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 25.4 mm per inch — EXACT by the International Yard and Pound Agreement of
 * 1959, codified in NIST SP 811 §B.8. Also the definition ASME Y14.5 and
 * ISO 3041 use for drawing-scale conversions.
 */
export const MM_PER_INCH_EXACT = 25.4 as const;

/** Derived inverse, exact within IEEE-754 binary-64 representation. */
export const INCHES_PER_MM = 1 / MM_PER_INCH_EXACT;

/** µm per µin: 0.0254 exactly (1 µin = 2.54 × 10⁻⁸ m = 0.0254 µm). */
export const UM_PER_UIN_EXACT = 0.0254 as const;
export const UIN_PER_UM = 1 / UM_PER_UIN_EXACT;

/** Meters per foot: 0.3048 exactly (International Yard & Pound, 1959). */
export const M_PER_FT_EXACT = 0.3048 as const;
export const FT_PER_M = 1 / M_PER_FT_EXACT;

// ─────────────────────────────────────────────────────────────────────────────
// US-DENOMINATED INPUT / VIEW SHAPES
// ─────────────────────────────────────────────────────────────────────────────

export type WireBreakActionUS = "restart" | "abort" | "slow_and_resume";

export interface WireBreakEventUS {
  elapsed_cut_min: number;
  peak_current_A?: number;
  action: WireBreakActionUS;
}

export interface USJobInput_Input {
  material: string;
  hardness_hrc?: number;
  thickness_in: number;
  wire_diameter_in: number;
  wire_material: string;
  profile_length_in: number;
  num_passes: number;
  /** Surface-finish target in microinches (Ra). US drawing convention. */
  target_ra_uin: number;
  tolerance_in: number;
  controller:
    | "fanuc"
    | "sodick"
    | "makino"
    | "mitsubishi"
    | "agiecharmilles"
    | "accutex"
    | "unknown";
  peak_current_A?: number;
  on_time_us?: number;
  off_time_us?: number;
}

export interface USJobInput_Outcome {
  /** Measured Ra in µin. */
  measured_ra_uin: number;
  measured_ra_source: "cmm" | "controller" | "operator" | "predicted" | "sensor" | "derived";
  measured_ra_uncertainty_uin?: number;
  measured_cycle_min: number;
  measured_cycle_source: "cmm" | "controller" | "operator" | "predicted" | "sensor" | "derived";
  /** Measured recast-layer depth in µin (optional). */
  measured_recast_uin?: number;
  measured_recast_source?: "cmm" | "controller" | "operator" | "predicted" | "sensor" | "derived";
  wire_break_count: number;
  wire_break_events: WireBreakEventUS[];
  /** Wire consumed in feet. */
  wire_consumed_ft: number;
  accepted: boolean;
  rejection_codes: string[];
}

export interface USJobInput_Predicted {
  predicted_ra_uin?: number;
  predicted_cycle_min?: number;
  predicted_recast_uin?: number;
  predicted_wire_break_probability?: number;
  model_name?: string;
  model_version?: string;
}

export interface USJobInput {
  shop_id?: string;
  machine_id: string;
  operator_id?: string;
  customer?: string;
  part_number?: string;
  program_file?: string;
  input: USJobInput_Input;
  outcome: USJobInput_Outcome;
  predicted?: USJobInput_Predicted;
  notes?: string;
}

export interface USJobView_Input {
  material: string;
  hardness_hrc?: number;
  thickness_in: number;
  wire_diameter_in: number;
  wire_material: string;
  profile_length_in: number;
  num_passes: number;
  target_ra_uin: number;
  tolerance_in: number;
  controller: string;
  peak_current_A?: number;
  on_time_us?: number;
  off_time_us?: number;
}

export interface USJobView_Outcome {
  measured_ra: { value: number; unit: "µin"; source: string; uncertainty?: number };
  measured_cycle_min: { value: number; unit: "min"; source: string };
  measured_recast?: { value: number; unit: "µin"; source: string };
  wire_break_count: number;
  wire_break_events: WireBreakEventUS[];
  wire_consumed_ft: number;
  accepted: boolean;
  rejection_codes: string[];
}

export interface USJobView {
  job_id: string;
  recorded_at: string;
  shop_id: string;
  machine_id: string;
  operator_id?: string;
  customer?: string;
  part_number?: string;
  program_file?: string;
  input: USJobView_Input;
  outcome: USJobView_Outcome;
  predicted?: {
    predicted_ra_uin?: number;
    predicted_cycle_min?: number;
    predicted_recast_uin?: number;
    predicted_wire_break_probability?: number;
    model_name?: string;
    model_version?: string;
  };
  notes?: string;
  _units_system: "US";
}

export interface USStatsView {
  total_records: number;
  sequence: number;
  materials: Record<string, number>;
  acceptance_rate: number;
  total_wire_break_events: number;
  mean_cycle_min: number;
  mean_ra_uin: number;
  file_path: string;
  _units_system: "US";
}

// ─────────────────────────────────────────────────────────────────────────────
// CONVERSION PRIMITIVES (exact constants, no rounding)
// ─────────────────────────────────────────────────────────────────────────────

function inToMm(inches: number): number {
  return inches * MM_PER_INCH_EXACT;
}

function mmToIn(mm: number): number {
  return mm * INCHES_PER_MM;
}

function uinToUm(uin: number): number {
  return uin * UM_PER_UIN_EXACT;
}

function umToUin(um: number): number {
  return um * UIN_PER_UM;
}

function ftToM(ft: number): number {
  return ft * M_PER_FT_EXACT;
}

function mToFt(m: number): number {
  return m * FT_PER_M;
}

// ─────────────────────────────────────────────────────────────────────────────
// ENGINE
// ─────────────────────────────────────────────────────────────────────────────

export class WEDMJobUnitPresenterEngine {
  readonly name = "WEDMJobUnitPresenterEngine";
  readonly version = "1.0.0";

  /**
   * Translate a US-denominated job record into the canonical SI input shape
   * WEDMJobOutcomeEngine.record() expects. No data loss — every inch/µin/ft
   * value is multiplied by the NIST-exact factor.
   */
  fromUSInput(us: USJobInput): RecordJobInput {
    return {
      shop_id: us.shop_id ?? "jm-die",
      machine_id: us.machine_id,
      operator_id: us.operator_id,
      customer: us.customer,
      part_number: us.part_number,
      program_file: us.program_file,
      input: {
        material: us.input.material,
        hardness_hrc: us.input.hardness_hrc,
        thickness_mm: inToMm(us.input.thickness_in),
        wire_diameter_mm: inToMm(us.input.wire_diameter_in),
        wire_material: us.input.wire_material,
        profile_length_mm: inToMm(us.input.profile_length_in),
        num_passes: us.input.num_passes,
        target_ra_um: uinToUm(us.input.target_ra_uin),
        tolerance_mm: inToMm(us.input.tolerance_in),
        controller: us.input.controller,
        peak_current_A: us.input.peak_current_A,
        on_time_us: us.input.on_time_us,
        off_time_us: us.input.off_time_us,
      },
      outcome: {
        measured_ra: {
          value: uinToUm(us.outcome.measured_ra_uin),
          unit: "um",
          source: us.outcome.measured_ra_source,
          uncertainty:
            us.outcome.measured_ra_uncertainty_uin !== undefined
              ? uinToUm(us.outcome.measured_ra_uncertainty_uin)
              : undefined,
        },
        measured_cycle_min: {
          value: us.outcome.measured_cycle_min,
          unit: "min",
          source: us.outcome.measured_cycle_source,
        },
        measured_recast_um:
          us.outcome.measured_recast_uin !== undefined
            ? {
                value: uinToUm(us.outcome.measured_recast_uin),
                unit: "um",
                source: us.outcome.measured_recast_source ?? "derived",
              }
            : undefined,
        wire_break_count: us.outcome.wire_break_count,
        wire_break_events: us.outcome.wire_break_events.map((e) => ({
          elapsed_cut_min: e.elapsed_cut_min,
          peak_current_A: e.peak_current_A,
          action: e.action,
        })),
        wire_consumed_m: ftToM(us.outcome.wire_consumed_ft),
        accepted: us.outcome.accepted,
        rejection_codes: us.outcome.rejection_codes,
      },
      predicted:
        us.predicted !== undefined
          ? {
              predicted_ra_um:
                us.predicted.predicted_ra_uin !== undefined
                  ? uinToUm(us.predicted.predicted_ra_uin)
                  : undefined,
              predicted_cycle_min: us.predicted.predicted_cycle_min,
              predicted_recast_um:
                us.predicted.predicted_recast_uin !== undefined
                  ? uinToUm(us.predicted.predicted_recast_uin)
                  : undefined,
              predicted_wire_break_probability:
                us.predicted.predicted_wire_break_probability,
              model_name: us.predicted.model_name,
              model_version: us.predicted.model_version,
            }
          : undefined,
      notes: us.notes,
    };
  }

  /** Translate a stored SI record into a US view (inches / µin / feet). */
  toUSView(record: WEDMJobRecord): USJobView {
    const view: USJobView = {
      job_id: record.job_id,
      recorded_at: record.recorded_at,
      shop_id: record.shop_id,
      machine_id: record.machine_id,
      operator_id: record.operator_id,
      customer: record.customer,
      part_number: record.part_number,
      program_file: record.program_file,
      input: {
        material: record.input.material,
        hardness_hrc: record.input.hardness_hrc,
        thickness_in: mmToIn(record.input.thickness_mm),
        wire_diameter_in: mmToIn(record.input.wire_diameter_mm),
        wire_material: record.input.wire_material,
        profile_length_in: mmToIn(record.input.profile_length_mm),
        num_passes: record.input.num_passes,
        target_ra_uin: umToUin(record.input.target_ra_um),
        tolerance_in: mmToIn(record.input.tolerance_mm),
        controller: record.input.controller,
        peak_current_A: record.input.peak_current_A,
        on_time_us: record.input.on_time_us,
        off_time_us: record.input.off_time_us,
      },
      outcome: {
        measured_ra: {
          value: umToUin(record.outcome.measured_ra.value),
          unit: "µin",
          source: record.outcome.measured_ra.source,
          uncertainty:
            record.outcome.measured_ra.uncertainty !== undefined
              ? umToUin(record.outcome.measured_ra.uncertainty)
              : undefined,
        },
        measured_cycle_min: {
          value: record.outcome.measured_cycle_min.value,
          unit: "min",
          source: record.outcome.measured_cycle_min.source,
        },
        measured_recast:
          record.outcome.measured_recast_um !== undefined
            ? {
                value: umToUin(record.outcome.measured_recast_um.value),
                unit: "µin",
                source: record.outcome.measured_recast_um.source,
              }
            : undefined,
        wire_break_count: record.outcome.wire_break_count,
        wire_break_events: record.outcome.wire_break_events.map((e) => ({
          elapsed_cut_min: e.elapsed_cut_min,
          peak_current_A: e.peak_current_A,
          action: e.action,
        })),
        wire_consumed_ft: mToFt(record.outcome.wire_consumed_m),
        accepted: record.outcome.accepted,
        rejection_codes: record.outcome.rejection_codes,
      },
      predicted:
        record.predicted !== undefined
          ? {
              predicted_ra_uin:
                record.predicted.predicted_ra_um !== undefined
                  ? umToUin(record.predicted.predicted_ra_um)
                  : undefined,
              predicted_cycle_min: record.predicted.predicted_cycle_min,
              predicted_recast_uin:
                record.predicted.predicted_recast_um !== undefined
                  ? umToUin(record.predicted.predicted_recast_um)
                  : undefined,
              predicted_wire_break_probability:
                record.predicted.predicted_wire_break_probability,
              model_name: record.predicted.model_name,
              model_version: record.predicted.model_version,
            }
          : undefined,
      notes: record.notes,
      _units_system: "US",
    };
    return view;
  }

  /** Translate history stats to US display units (mean_ra_um → mean_ra_uin). */
  statsToUS(stats: {
    total_records: number;
    sequence: number;
    materials: Record<string, number>;
    acceptance_rate: number;
    total_wire_break_events: number;
    mean_cycle_min: number;
    mean_ra_um: number;
    file_path: string;
  }): USStatsView {
    return {
      total_records: stats.total_records,
      sequence: stats.sequence,
      materials: stats.materials,
      acceptance_rate: stats.acceptance_rate,
      total_wire_break_events: stats.total_wire_break_events,
      mean_cycle_min: stats.mean_cycle_min,
      mean_ra_uin: umToUin(stats.mean_ra_um),
      file_path: stats.file_path,
      _units_system: "US",
    };
  }
}

export const wedmJobUnitPresenterEngine = new WEDMJobUnitPresenterEngine();
