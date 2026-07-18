/**
 * TurningForceEngine — Single-point turning force, power & torque prediction
 *
 * Models: Kienzle specific cutting force with turning chip geometry,
 *         force decomposition (Fc/Ff/Fp), spindle power & torque
 * References: Altintas (2012) Ch.2, Sandvik Coromant Technical Guide
 * Safety: Spindle overload detection, insert load assessment
 */

import { CANONICAL_KIENZLE } from "../physics/constants.js";

// ─── Types ─────────────────────────────────────────────────────────

export type TurningOperation = "longitudinal" | "facing" | "parting" | "boring" | "grooving";
/** I S O Group type definition.
 */
export type ISOGroup = "P" | "M" | "K" | "N" | "S" | "H";

/** Turning Force Input configuration/data structure.
 */
export interface TurningForceInput {
  cutting_speed_m_min: number;           // Vc
  feed_mm_rev: number;                   // f
  depth_of_cut_mm: number;              // ap
  lead_angle_deg?: number;              // κr (default 95° for standard CNMG)
  nose_radius_mm?: number;              // rε (default 0.8mm)
  rake_angle_deg?: number;              // γ (default 6°)
  iso_group?: ISOGroup;                 // workpiece ISO group (default "P")
  material_kc1_1?: number;             // override specific cutting force
  material_mc?: number;                // override Kienzle exponent
  workpiece_diameter_mm?: number;       // for RPM/torque calc
  spindle_power_kW?: number;           // machine rated power (for utilization)
  operation?: TurningOperation;         // default "longitudinal"
}

/** Atomic Value configuration/data structure.
 */
export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
  warning?: string;
}

/** Turning Force Result configuration/data structure.
 */
export interface TurningForceResult {
  tangential_force_Fc_N: AtomicValue;
  feed_force_Ff_N: AtomicValue;
  radial_force_Fp_N: AtomicValue;
  resultant_force_N: AtomicValue;
  cutting_power_kW: AtomicValue;
  spindle_torque_Nm: AtomicValue;
  specific_cutting_force_N_mm2: AtomicValue;
  chip_thickness_mm: AtomicValue;
  chip_width_mm: AtomicValue;
  power_utilization_pct: number;
  is_safe: boolean;
  recommendations: string[];
}

// ─── Constants ─────────────────────────────────────────────────────

/**
 * Kienzle kc1.1 and mc by ISO group -- imported from the canonical Sandvik-Coromant turning table
 * (CANONICAL_KIENZLE, physics/constants.ts). Was an inline "Altintas Table 2.1" copy whose mc diverged
 * on K/N/S/H (kc1_1 already matched canonical). Physics-reviewer 2026-07-01: for TURNING, Sandvik General
 * Turning (ISO 3685) is the more authoritative mc source than the general/milling Altintas table; adopting
 * it raises Fc ~+17% (S/Ti) and ~+26% (H) at thin chips, so the spindle-overload / is_safe gate trips
 * EARLIER (strictly MORE conservative), and it removes the inline-constant drift hazard.
 */
const KIENZLE_ISO: Record<ISOGroup, { kc1_1: number; mc: number }> = CANONICAL_KIENZLE;

/** Force ratios by ISO group: Ff/Fc and Fp/Fc (empirical) */
const FORCE_RATIOS: Record<ISOGroup, { kf: number; kp: number }> = {
  P: { kf: 0.40, kp: 0.25 },
  M: { kf: 0.45, kp: 0.30 },
  K: { kf: 0.35, kp: 0.20 },
  N: { kf: 0.30, kp: 0.20 },
  S: { kf: 0.50, kp: 0.35 },
  H: { kf: 0.35, kp: 0.30 },
};

/** Rake angle correction factor: kc_corrected = kc × (1 - γ/100) */
const rakeCorrection = (gamma_deg: number): number =>
  1 - (gamma_deg - 6) * 0.01; // reference at γ = 6°

// ─── Engine ────────────────────────────────────────────────────────

/** Turning Force Engine engine/manager.
 */
export class TurningForceEngine {
  calculate(input: TurningForceInput): TurningForceResult {
    const {
      cutting_speed_m_min: Vc,
      feed_mm_rev: f,
      depth_of_cut_mm: ap,
      lead_angle_deg: kr_deg = 95,
      nose_radius_mm: re = 0.8,
      rake_angle_deg: gamma = 6,
      iso_group: iso = "P",
      workpiece_diameter_mm: dw,
      spindle_power_kW: machPower,
      operation = "longitudinal",
    } = input;

    const recs: string[] = [];

    // ── 1. Lead angle ──
    const kr = kr_deg * (Math.PI / 180);
    const sinKr = Math.sin(kr);
    const cosKr = Math.cos(kr);

    // ── 2. Chip geometry for turning ──
    // h = f × sin(κr), b = ap / sin(κr)
    const h = f * sinKr;              // undeformed chip thickness (mm)
    const b = sinKr > 0 ? ap / sinKr : ap;  // chip width (mm)

    // ── 3. Specific cutting force (Kienzle) ──
    const kienzle = {
      kc1_1: input.material_kc1_1 ?? KIENZLE_ISO[iso].kc1_1,
      mc: input.material_mc ?? KIENZLE_ISO[iso].mc,
    };
    const h_eff = Math.max(h, 0.001);
    let kc = kienzle.kc1_1 * Math.pow(h_eff, -kienzle.mc);

    // Rake angle correction
    kc *= rakeCorrection(gamma);

    // Parting/grooving correction (higher force due to constrained chip flow)
    /** If.
     * @param operation - operation
     * @returns void
     */
    if (operation === "parting" || operation === "grooving") {
      kc *= 1.25;
    }

    // ── 4. Tangential force: Fc = kc × h × b ──
    const Fc = kc * h * b;

    // ── 5. Feed and radial forces ──
    const ratios = FORCE_RATIOS[iso];
    const Ff = Fc * ratios.kf;
    const Fp = Fc * ratios.kp;

    // ── 6. Resultant force ──
    const Fr = Math.sqrt(Fc * Fc + Ff * Ff + Fp * Fp);

    // ── 7. Cutting power ──
    const P_kW = (Fc * Vc) / 60000;

    // ── 8. Spindle RPM and torque ──
    const rpm = dw && dw > 0 ? (Vc * 1000) / (Math.PI * dw) : 0;
    const T_Nm = rpm > 0 ? (P_kW * 9549) / rpm : 0;

    // ── 9. Power utilization ──
    const powerUtil = machPower && machPower > 0
      ? (P_kW / machPower) * 100
      : 0;

    // ── 10. Safety ──
    const isSafe = powerUtil < 90 && Fc < 10000;

    // ── 11. Recommendations ──
    /** If.
     * @param powerUtil - power util
     * @returns void
     */
    if (powerUtil > 85) {
      recs.push(
        `SAFETY: Power utilization ${powerUtil.toFixed(0)}% — approaching machine limit. `
        + `Reduce feed or depth of cut`
      );
    } else if (powerUtil > 70) {
      recs.push(
        `Power utilization ${powerUtil.toFixed(0)}% — moderate. `
        + `Consider reducing for tool life optimization`
      );
    }

    /** If.
     * @param h - h
     * @returns void
     */
    if (h < 0.05) {
      recs.push(
        `Chip thickness ${(h * 1000).toFixed(0)}µm very thin — `
        + `rubbing/plowing risk. Increase feed or lead angle`
      );
    }

    /** If.
     * @param operation - operation
     * @returns void
     */
    if (operation === "parting" && f > 0.2) {
      recs.push(
        `Parting at f=${f} mm/rev is aggressive — `
        + `risk of blade breakage. Consider f < 0.15 mm/rev`
      );
    }

    /** If.
     * @param iso - iso
     * @returns void
     */
    if (iso === "S" && Vc > 60) {
      recs.push(
        `Superalloy at Vc=${Vc} m/min — verify tool grade `
        + `supports this speed (ceramic or CBN recommended)`
      );
    }

    /** If.
     * @param iso - iso
     * @returns void
     */
    if (iso === "H" && Vc > 150) {
      recs.push(
        `Hardened steel at Vc=${Vc} m/min — `
        + `CBN or ceramic insert required`
      );
    }

    /** If.
     * @param recs.length - recs.length
     * @returns void
     */
    if (recs.length === 0) {
      recs.push(
        `Turning parameters nominal — Fc=${Math.round(Fc)}N, `
        + `P=${P_kW.toFixed(2)}kW, ${operation}`
      );
    }

    return {
      tangential_force_Fc_N: {
        value: Math.round(Fc),
        unit: "N",
        uncertainty: Math.round(Fc * 0.15),
        source: "kienzle_turning",
      },
      feed_force_Ff_N: {
        value: Math.round(Ff),
        unit: "N",
        uncertainty: Math.round(Ff * 0.20),
        source: "kienzle_force_ratio",
      },
      radial_force_Fp_N: {
        value: Math.round(Fp),
        unit: "N",
        uncertainty: Math.round(Fp * 0.25),
        source: "kienzle_force_ratio",
      },
      resultant_force_N: {
        value: Math.round(Fr),
        unit: "N",
        uncertainty: Math.round(Fr * 0.15),
        source: "vector_sum",
      },
      cutting_power_kW: {
        value: Math.round(P_kW * 1000) / 1000,
        unit: "kW",
        uncertainty: Math.round(P_kW * 0.15 * 1000) / 1000,
        source: "Fc_times_Vc",
      },
      spindle_torque_Nm: {
        value: Math.round(T_Nm * 100) / 100,
        unit: "Nm",
        uncertainty: Math.round(T_Nm * 0.15 * 100) / 100,
        source: "power_speed_relation",
      },
      specific_cutting_force_N_mm2: {
        value: Math.round(kc),
        unit: "N/mm²",
        uncertainty: Math.round(kc * 0.10),
        source: "kienzle_model",
      },
      chip_thickness_mm: {
        value: Math.round(h * 1000) / 1000,
        unit: "mm",
        uncertainty: Math.round(h * 0.05 * 1000) / 1000,
        source: "geometric",
      },
      chip_width_mm: {
        value: Math.round(b * 100) / 100,
        unit: "mm",
        uncertainty: Math.round(b * 0.05 * 100) / 100,
        source: "geometric",
      },
      power_utilization_pct: Math.round(powerUtil),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

/** Turning Force Engine constant.
 */
export const turningForceEngine = new TurningForceEngine();
