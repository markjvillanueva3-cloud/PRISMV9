/**
 * TappingTorqueEngine — Tapping torque, axial force & breakage risk prediction
 *
 * Models: Kienzle-based tapping torque, form vs cut tap differentiation,
 *         blind-hole chip packing factor, spindle torque margin check
 * References: Emuge Tapping Handbook, Sandvik Threading Guide, Altintas (2012)
 * Safety: Tap breakage is the #1 cause of part scrap in threading operations
 */

import { CANONICAL_KIENZLE } from "../physics/constants.js";
import type { ISOGroup } from "../physics/constants.js";

// ─── Types ─────────────────────────────────────────────────────────

export type TapType = "cut_straight" | "cut_spiral_point" | "cut_spiral_flute" | "form";
/** Hole Type type definition.
 */
export type HoleType = "through" | "blind";

/** Tapping Torque Input configuration/data structure.
 */
export interface TappingTorqueInput {
  thread_major_diameter_mm: number;      // nominal thread diameter (e.g., 10 for M10)
  pitch_mm: number;                      // thread pitch (e.g., 1.5 for M10×1.5)
  tap_type?: TapType;                    // default cut_spiral_point
  hole_type?: HoleType;                  // default through
  thread_depth_mm?: number;              // engagement depth (default 1.5×diameter)
  thread_engagement_pct?: number;        // % thread height engaged (default 75%)
  workpiece_iso_group?: "P" | "M" | "K" | "N" | "S" | "H";
  workpiece_hardness_hrc?: number;       // for kc estimation
  material_kc1_1?: number;              // override specific cutting force
  spindle_rpm?: number;                 // tapping speed
  spindle_max_torque_Nm?: number;       // machine torque limit at tapping RPM
  coolant_active?: boolean;             // default true
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

/** Tapping Torque Result configuration/data structure.
 */
export interface TappingTorqueResult {
  cutting_torque_Nm: AtomicValue;
  axial_thrust_N: AtomicValue;
  tapping_power_kW: AtomicValue;
  torque_margin_pct: AtomicValue;
  max_safe_rpm: AtomicValue;
  breakage_risk: number;                 // 0–1 scale
  is_safe: boolean;
  recommendations: string[];
}

// ─── Constants ─────────────────────────────────────────────────────

/**
 * kc1.1 by ISO group for tapping — canonical base × tapping constraint multiplier.
 * Tapping sees ~10-20% higher effective kc than turning due to the constrained
 * chip formation geometry (thread flanks, partial engagement, re-cutting).
 * Source: Emuge Tapping Handbook (2019), validated against Sandvik threading data.
 */
const TAP_KC_MULTIPLIER: Record<ISOGroup, number> = {
  P: 1.11,   // 1800 × 1.11 ≈ 2000
  M: 1.14,   // 2100 × 1.14 ≈ 2400
  K: 1.09,   // 1100 × 1.09 ≈ 1200
  N: 1.14,   // 700  × 1.14 ≈ 800
  S: 1.14,   // 2800 × 1.14 ≈ 3200
  H: 1.19,   // 3200 × 1.19 ≈ 3800
};

/** Compute tapping-specific Kienzle constants from canonical base + tapping multiplier. */
const TAP_KC: Record<string, { kc1_1: number; mc: number }> = Object.fromEntries(
  (Object.keys(CANONICAL_KIENZLE) as ISOGroup[]).map(iso => [
    iso,
    {
      kc1_1: Math.round(CANONICAL_KIENZLE[iso].kc1_1 * TAP_KC_MULTIPLIER[iso]),
      mc: iso === "S" ? 0.22 : iso === "H" ? 0.20 : CANONICAL_KIENZLE[iso].mc,
    },
  ]),
);

/** Form tap multiplier — thread forming requires ~50-80% more torque */
const FORM_TAP_MULTIPLIER = 1.65;

/** Blind hole chip packing factor increment per L/D ratio */
const BLIND_HOLE_K = 0.15;

/** Coolant reduction factor (lubrication reduces friction torque) */
const COOLANT_TORQUE_FACTOR = { wet: 0.85, dry: 1.15 };

/** Maximum recommended tapping speed by ISO group (m/min) */
const MAX_TAP_SPEED: Record<string, number> = {
  P: 25, M: 12, K: 20, N: 40, S: 8, H: 10,
};

/**
 * Material-specific tapping speed ranges (m/min).
 * Source: OSG Tap Guide, ToolHIT tapping speeds reference, Sandvik threading recommendations.
 * Note: Form/roll taps can run 50-100% faster than the max values below.
 * For high-speed tapping with small-diameter taps (<M6) in aluminium, speeds of 100-150 m/min
 * are achievable on machines with synchronised rigid tapping.
 */
export const TAPPING_SFM_BY_MATERIAL: Record<string, { min_mpm: number; max_mpm: number; note: string }> = {
  low_carbon_steel:   { min_mpm: 6,   max_mpm: 15,  note: "ISO P — general carbon steel, e.g. 1018/1045" },
  tempered_hard_steel:{ min_mpm: 5,   max_mpm: 10,  note: "ISO H — tempered / hardened steel >30 HRC" },
  stainless_steel:    { min_mpm: 2,   max_mpm: 7,   note: "ISO M — austenitic/martensitic; work-hardens rapidly" },
  cast_iron:          { min_mpm: 8,   max_mpm: 10,  note: "ISO K — grey/ductile cast iron; brittle chip" },
  aluminum:           { min_mpm: 15,  max_mpm: 30,  note: "ISO N — free-cutting aluminium alloys" },
  titanium:           { min_mpm: 2,   max_mpm: 5,   note: "ISO S — galling risk; mandatory high-pressure coolant" },
  brass_bronze:       { min_mpm: 15,  max_mpm: 25,  note: "ISO N — free-machining copper alloys" },
  high_speed_small_dia:{ min_mpm: 100, max_mpm: 150, note: "Small-dia taps (<M6) in Al/brass on rigid-tapping machines" },
};

// ─── Engine ────────────────────────────────────────────────────────

/** Tapping Torque Engine engine/manager.
 */
export class TappingTorqueEngine {
  calculate(input: TappingTorqueInput): TappingTorqueResult {
    const {
      thread_major_diameter_mm: D,
      pitch_mm: p,
      tap_type: tapType = "cut_spiral_point",
      hole_type: holeType = "through",
      thread_engagement_pct: engPct = 75,
      workpiece_iso_group: iso = "P",
      workpiece_hardness_hrc: hrc,
      spindle_rpm: rpm = 500,
      spindle_max_torque_Nm: machTorque,
      coolant_active: coolant = true,
    } = input;

    const recs: string[] = [];

    // Thread depth: default 1.5× diameter
    const threadDepth = input.thread_depth_mm ?? D * 1.5;

    // ── 1. Thread geometry ──
    // Minor diameter: D_minor ≈ D - 1.0825 × pitch (ISO metric)
    const D_minor = D - 1.0825 * p;
    // Thread height: H = 0.5413 × pitch
    const H_thread = 0.5413 * p;
    // Engaged thread height
    const H_engaged = H_thread * (engPct / 100);

    // ── 2. Shear area per revolution ──
    // As = π × D_pitch × H_engaged × (number of teeth cutting per rev)
    // D_pitch = (D + D_minor) / 2 (pitch diameter)
    const D_pitch = (D + D_minor) / 2;
    // Number of teeth simultaneously engaged
    const teethEngaged = Math.max(1, Math.floor(threadDepth / p));
    // Shear area per tooth: As = (p/2) × H_engaged
    const As_per_tooth = (p / 2) * H_engaged;

    // ── 3. Specific cutting force ──
    const kcData = {
      kc1_1: input.material_kc1_1 ?? TAP_KC[iso].kc1_1,
      mc: TAP_KC[iso].mc,
    };
    // Chip thickness in tapping ≈ feed per tooth ≈ pitch / flutes (typically 3-4 flutes)
    const flutes = tapType === "form" ? 0 : (tapType === "cut_spiral_flute" ? 3 : 4);
    const h_tap = flutes > 0 ? p / flutes : p;
    const kc = kcData.kc1_1 * Math.pow(Math.max(h_tap, 0.01), -kcData.mc);

    // ── 4. Cutting torque ──
    // Md = kc × As × (D_pitch/2) × z_eff / (2π)
    // Simplified: Md = kc × As_per_tooth × z_eff × D_pitch / (4π)
    const z_eff = Math.min(teethEngaged, 6); // practical limit
    let Md = (kc * As_per_tooth * z_eff * D_pitch) / (4 * Math.PI * 1000); // Nm

    // ── 5. Form tap multiplier ──
    /** If.
     * @param tapType - tap type
     * @returns void
     */
    if (tapType === "form") {
      Md *= FORM_TAP_MULTIPLIER;
    }

    // ── 6. Blind hole chip packing ──
    /** If.
     * @param holeType - hole type
     * @returns void
     */
    if (holeType === "blind") {
      const LD_ratio = threadDepth / D;
      Md *= 1 + BLIND_HOLE_K * LD_ratio;
    }

    // ── 7. Coolant correction ──
    Md *= coolant ? COOLANT_TORQUE_FACTOR.wet : COOLANT_TORQUE_FACTOR.dry;

    // ── 8. Hardness correction ──
    /** If.
     * @param hrc - hrc
     * @returns void
     */
    if (hrc !== undefined) {
      if (hrc > 45) Md *= 1.3;
      else if (hrc > 35) Md *= 1.1;
      else if (hrc < 20) Md *= 0.85;
    }

    // ── 9. Axial thrust force ──
    // From lead mechanics: Fa = Md × 2π / pitch
    const Fa = (Md * 2 * Math.PI * 1000) / p; // N

    // ── 10. Tapping power ──
    const P_kW = (Md * 2 * Math.PI * rpm) / 60000;

    // ── 11. Torque margin ──
    const torqueMargin = machTorque && machTorque > 0
      ? ((machTorque - Md) / machTorque) * 100
      : 100;

    // ── 12. Max safe RPM ──
    const Vc_max = MAX_TAP_SPEED[iso] ?? 20;
    const maxRPM = D > 0 ? (Vc_max * 1000) / (Math.PI * D) : 1000;

    // ── 13. Breakage risk (0–1) ──
    let breakageRisk = 0;
    if (torqueMargin < 20) breakageRisk += 0.4;
    else if (torqueMargin < 40) breakageRisk += 0.15;
    if (holeType === "blind") breakageRisk += 0.15;
    if (tapType === "form" && iso === "M") breakageRisk += 0.2; // form tap in stainless = risky
    if (rpm > maxRPM) breakageRisk += 0.3;
    if (!coolant) breakageRisk += 0.1;
    breakageRisk = Math.min(1.0, breakageRisk);

    // ── 14. Safety ──
    const isSafe = breakageRisk < 0.6 && torqueMargin > 15;

    // ── 15. Recommendations ──
    /** If.
     * @param torqueMargin - torque margin
     * @returns void
     */
    if (torqueMargin < 20 && machTorque) {
      recs.push(
        `SAFETY: Torque margin only ${torqueMargin.toFixed(0)}% — `
        + `tap torque ${Md.toFixed(2)}Nm near machine limit ${machTorque}Nm. `
        + `Reduce tapping speed or use smaller engagement`
      );
    }

    /** If.
     * @param rpm - rpm
     * @returns void
     */
    if (rpm > maxRPM * 1.1) {
      recs.push(
        `Tapping speed exceeds recommended max for ${iso} material. `
        + `Max RPM: ${Math.round(maxRPM)} (Vc=${Vc_max} m/min). Current: ${rpm} RPM`
      );
    }

    /** If.
     * @param holeType - hole type
     * @returns void
     */
    if (holeType === "blind" && tapType === "cut_spiral_point") {
      recs.push(
        `Spiral point (gun) tap in blind hole — chips pushed forward, `
        + `risk of packing. Use spiral flute tap instead`
      );
    }

    if (tapType === "form" && (iso === "S" || iso === "H")) {
      recs.push(
        `Form tapping in ${iso === "S" ? "superalloy" : "hardened steel"} — `
        + `very high torque required. Consider cut tapping`
      );
    }

    /** If.
     * @param !coolant - !coolant
     * @returns void
     */
    if (!coolant && iso !== "K") {
      recs.push(
        `Dry tapping — risk of galling and accelerated tap wear. `
        + `Use cutting oil or at minimum MQL`
      );
    }

    /** If.
     * @param breakageRisk - breakage risk
     * @returns void
     */
    if (breakageRisk >= 0.5) {
      recs.push(
        `HIGH breakage risk (${(breakageRisk * 100).toFixed(0)}%) — `
        + `verify tap condition, reduce speed, ensure adequate coolant`
      );
    }

    /** If.
     * @param recs.length - recs.length
     * @returns void
     */
    if (recs.length === 0) {
      recs.push(
        `Tapping parameters nominal — torque ${Md.toFixed(2)}Nm, `
        + `M${D}×${p}, ${tapType.replace(/_/g, " ")}, `
        + `breakage risk ${(breakageRisk * 100).toFixed(0)}%`
      );
    }

    return {
      cutting_torque_Nm: {
        value: Math.round(Md * 1000) / 1000,
        unit: "Nm",
        uncertainty: Math.round(Md * 0.20 * 1000) / 1000,
        source: "kienzle_tapping",
      },
      axial_thrust_N: {
        value: Math.round(Fa),
        unit: "N",
        uncertainty: Math.round(Fa * 0.25),
        source: "lead_mechanics",
      },
      tapping_power_kW: {
        value: Math.round(P_kW * 1000) / 1000,
        unit: "kW",
        uncertainty: Math.round(P_kW * 0.20 * 1000) / 1000,
        source: "torque_speed",
      },
      torque_margin_pct: {
        value: Math.round(torqueMargin),
        unit: "%",
        uncertainty: 5,
        source: machTorque ? "machine_spec" : "no_machine_data",
        warning: torqueMargin < 20 ? "Low torque margin — breakage risk" : undefined,
      },
      max_safe_rpm: {
        value: Math.round(maxRPM),
        unit: "RPM",
        uncertainty: Math.round(maxRPM * 0.10),
        source: "iso_speed_limit",
      },
      breakage_risk: Math.round(breakageRisk * 100) / 100,
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

/** Tapping Torque Engine constant.
 */
export const tappingTorqueEngine = new TappingTorqueEngine();
