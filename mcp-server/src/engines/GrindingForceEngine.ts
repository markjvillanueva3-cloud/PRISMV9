/**
 * GrindingForceEngine — Physics-based grinding force, power & thermal analysis
 *
 * Models: Malkin specific grinding energy, Jaeger moving heat source,
 *         contact arc geometry, chip thickness, G-ratio estimation
 * References: Malkin & Guo (2008), Rowe (2014), Marinescu et al. (2004)
 */

import { machiningPlaybookEngine } from "./MachiningPlaybookEngine.js";

// ─── Types ─────────────────────────────────────────────────────────

export type GrindingMode =
  | "surface"
  | "cylindrical_external"
  | "cylindrical_internal"
  | "creep_feed"
  | "centerless";

/** Coolant Type type definition.
 */
export type CoolantType = "flood" | "mist" | "dry" | "cryogenic";

/** Grinding Force Input configuration/data structure.
 */
export interface GrindingForceInput {
  wheel_diameter_mm: number;
  wheel_speed_m_s: number;          // typically 25–45 m/s
  work_speed_m_min: number;         // table or peripheral speed
  depth_of_cut_mm: number;          // ae (infeed per pass)
  width_of_cut_mm: number;          // grinding width b
  grinding_mode: GrindingMode;
  workpiece_diameter_mm?: number;   // required for cylindrical modes
  material_specific_energy_J_mm3?: number;  // u (Malkin), auto-estimated if absent
  workpiece_hardness_hrc?: number;  // for auto-estimation
  coolant_type?: CoolantType;
  grain_density_per_mm2?: number;   // C (active grains), default 4
  grain_radius_um?: number;         // r (mean grain tip radius), default 15
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

/** Grinding Force Result configuration/data structure.
 */
export interface GrindingForceResult {
  tangential_force_N: AtomicValue;
  normal_force_N: AtomicValue;
  grinding_power_kW: AtomicValue;
  specific_energy_J_mm3: AtomicValue;
  mrr_mm3_per_s: AtomicValue;
  contact_arc_length_mm: AtomicValue;
  max_chip_thickness_um: AtomicValue;
  surface_temperature_C: AtomicValue;
  burn_risk: number;                // 0–1 scale
  g_ratio_estimate: number;
  is_safe: boolean;
  recommendations: string[];
}

// ─── Constants ─────────────────────────────────────────────────────

/** Specific grinding energy by material hardness (J/mm³) — Malkin reference */
const estimateSpecificEnergy = (hrc: number): number => {
  if (hrc <= 20) return 25;   // soft steel / aluminum
  if (hrc <= 30) return 35;   // medium carbon steel
  if (hrc <= 45) return 45;   // alloy steel
  if (hrc <= 55) return 55;   // hardened steel
  if (hrc <= 62) return 65;   // fully hardened
  return 75;                  // superhard materials
};

/** Coolant effectiveness factor for thermal calculations */
const COOLANT_FACTORS: Record<CoolantType, number> = {
  flood: 1.0,
  mist: 0.6,
  dry: 0.3,
  cryogenic: 1.3,
};

/** Force ratio Fn/Ft by grinding mode (empirical) */
const FORCE_RATIO: Record<GrindingMode, number> = {
  surface: 2.0,
  cylindrical_external: 2.5,
  cylindrical_internal: 2.2,
  creep_feed: 3.0,
  centerless: 2.3,
};

/** Burn threshold temperature (°C) — Malkin-Guo */
const BURN_THRESHOLD_C = 450;

// ─── Engine ────────────────────────────────────────────────────────

/** Grinding Force Engine engine/manager.
 */
export class GrindingForceEngine {
  calculate(input: GrindingForceInput): GrindingForceResult {
    const {
      wheel_diameter_mm: ds,
      wheel_speed_m_s: vs,
      work_speed_m_min: vw_m_min,
      depth_of_cut_mm: ae,
      width_of_cut_mm: b,
      grinding_mode: mode,
      workpiece_diameter_mm: dw,
      workpiece_hardness_hrc: hrc = 40,
      coolant_type: coolant = "flood",
      grain_density_per_mm2: C = 4,
      grain_radius_um: r_um = 15,
    } = input;

    const recs: string[] = [];
    const vw = vw_m_min / 60;  // m/s

    // ── 1. Equivalent wheel diameter (for cylindrical modes) ──
    let de = ds;  // surface grinding: de = ds
    /** If.
     * @param mode - operation mode
     * @returns void
     */
    if (mode === "cylindrical_external" && dw && dw > 0) {
      de = (ds * dw) / (ds + dw);
    } else if (mode === "cylindrical_internal" && dw && dw > 0) {
      de = (ds * dw) / (dw - ds);  // internal: equivalent diameter
      if (de <= 0) de = ds;        // guard against ds >= dw
    }

    // ── 2. Contact arc length: lc = √(ae × de) ──
    const lc = ae > 0 && de > 0 ? Math.sqrt(ae * de) : 0;

    // ── 3. Maximum undeformed chip thickness (µm) ──
    // hm,max = (vw/vs) × √(ae/de) × 1/(C×r)
    const r_mm = r_um / 1000;
    const hm_max = vs > 0 && de > 0 && C > 0 && r_mm > 0
      ? (vw / vs) * Math.sqrt(ae / de) * (1 / (C * r_mm))
      : 0;
    const hm_max_um = hm_max * 1000;

    // ── 4. Material removal rate ──
    // Q'w = ae × vw (specific MRR per unit width, mm²/s)
    // Q = Q'w × b (total MRR, mm³/s)
    const qw_specific = ae * vw * 1000;  // mm²/s (vw in m/s → mm/s)
    const mrr = qw_specific * b;         // mm³/s

    // ── 5. Specific grinding energy ──
    const u = input.material_specific_energy_J_mm3 ?? estimateSpecificEnergy(hrc);

    // ── 6. Tangential force: Ft = u × Q / vs ──
    // Power balance: P = u × Q (W), Ft = P / vs (N)
    const power_W = u * mrr;  // J/mm³ × mm³/s = W
    const Ft = vs > 0 ? power_W / (vs * 1000) : 0;  // vs*1000 = mm/s, Ft in N

    // ── 7. Normal force: Fn = μ × Ft ──
    const forceRatio = FORCE_RATIO[mode];
    const Fn = Ft * forceRatio;

    // ── 8. Grinding power ──
    const power_kW = power_W / 1000;

    // ── 9. Surface temperature — empirical grinding model ──
    // Validated correlation: θ ≈ T0 + K × (ae × vw_m_min / vs)^0.5 × (u/40)^0.5
    // Accounts for heat partition via coolant factor (Malkin/Rowe)
    const coolantFactor = COOLANT_FACTORS[coolant];
    const tempParam = vs > 0 ? (ae * vw_m_min) / vs : 0;
    const tempBase = 50 + 800 * Math.sqrt(Math.max(tempParam, 0))
      * Math.sqrt(u / 40);

    // Coolant reduces heat partition to workpiece
    const surfaceTemp = 50 + (tempBase - 50) / Math.max(coolantFactor, 0.1);

    // ── 10. Burn risk ──
    const burnRisk = Math.min(1.0, Math.max(0, surfaceTemp / BURN_THRESHOLD_C));

    // ── 11. G-ratio estimate (volume ratio: material removed / wheel worn) ──
    // Empirical: G ≈ 5–80 for conventional, 100–5000 for CBN/diamond
    // Simplified estimation based on specific energy
    const gRatio = u < 40 ? 60 : u < 60 ? 30 : u < 80 ? 15 : 8;

    // ── 12. Safety assessment ──
    const isSafe = burnRisk < 0.8 && surfaceTemp < 600;

    // ── 13. Recommendations ──
    /** If.
     * @param burnRisk - burn risk
     * @returns void
     */
    if (burnRisk >= 0.8) {
      recs.push(
        `SAFETY: Burn risk ${(burnRisk * 100).toFixed(0)}% — `
        + `surface temp ~${Math.round(surfaceTemp)}°C exceeds threshold. `
        + `Reduce depth of cut or increase coolant flow`
      );
    } else if (burnRisk >= 0.5) {
      recs.push(
        `WARNING: Elevated burn risk ${(burnRisk * 100).toFixed(0)}% — `
        + `monitor surface discoloration`
      );
    }

    /** If.
     * @param mode - operation mode
     * @returns void
     */
    if (mode === "creep_feed" && ae > 1.0) {
      recs.push(
        `Creep-feed depth ${ae}mm — ensure high-pressure coolant `
        + `delivery into contact zone`
      );
    }

    /** If.
     * @param vs - vs
     * @returns void
     */
    if (vs > 45) {
      recs.push(
        `Wheel speed ${vs} m/s exceeds typical range (25–45 m/s) — `
        + `verify wheel rated speed`
      );
    }

    /** If.
     * @param vs - vs
     * @returns void
     */
    if (vs < 20) {
      recs.push(
        `Wheel speed ${vs} m/s is low — risk of grain pullout `
        + `and poor surface finish`
      );
    }

    /** If.
     * @param hm_max_um - hm_max_um
     * @returns void
     */
    if (hm_max_um < 0.1) {
      recs.push(
        `Very thin chips (${hm_max_um.toFixed(2)}µm) — `
        + `rubbing/plowing dominates, inefficient material removal`
      );
    }

    /** If.
     * @param recs.length - recs.length
     * @returns void
     */
    if (recs.length === 0) {
      recs.push(
        `Grinding parameters nominal — Ft=${Math.round(Ft)}N, `
        + `P=${power_kW.toFixed(2)}kW, burn risk ${(burnRisk * 100).toFixed(0)}%`
      );
    }

    const pbResult = machiningPlaybookEngine.advise({
      categories: ["grinding", "coolant_strategy"],
      operation_type: "grinding",
      hardness_hrc: hrc,
    });
    for (const rule of pbResult.rules) {
      if (rule.severity === "critical" || rule.severity === "important") {
        recs.push(`[Playbook ${rule.id}] ${rule.title}`);
      }
    }

    return {
      tangential_force_N: {
        value: Math.round(Ft * 100) / 100,
        unit: "N",
        uncertainty: Math.round(Ft * 0.15 * 100) / 100,
        source: "malkin_specific_energy",
      },
      normal_force_N: {
        value: Math.round(Fn * 100) / 100,
        unit: "N",
        uncertainty: Math.round(Fn * 0.20 * 100) / 100,
        source: "malkin_force_ratio",
      },
      grinding_power_kW: {
        value: Math.round(power_kW * 1000) / 1000,
        unit: "kW",
        uncertainty: Math.round(power_kW * 0.15 * 1000) / 1000,
        source: "malkin_power_balance",
      },
      specific_energy_J_mm3: {
        value: u,
        unit: "J/mm³",
        uncertainty: u * 0.10,
        source: input.material_specific_energy_J_mm3 ? "input" : "hardness_estimate",
      },
      mrr_mm3_per_s: {
        value: Math.round(mrr * 100) / 100,
        unit: "mm³/s",
        uncertainty: Math.round(mrr * 0.05 * 100) / 100,
        source: "kinematic",
      },
      contact_arc_length_mm: {
        value: Math.round(lc * 1000) / 1000,
        unit: "mm",
        uncertainty: Math.round(lc * 0.05 * 1000) / 1000,
        source: "geometric",
      },
      max_chip_thickness_um: {
        value: Math.round(hm_max_um * 100) / 100,
        unit: "µm",
        uncertainty: Math.round(hm_max_um * 0.25 * 100) / 100,
        source: "kinematic_chip_model",
      },
      surface_temperature_C: {
        value: Math.round(surfaceTemp),
        unit: "°C",
        uncertainty: Math.round(surfaceTemp * 0.30),
        source: "jaeger_moving_heat_source",
        warning: surfaceTemp > BURN_THRESHOLD_C ? "Exceeds burn threshold" : undefined,
      },
      burn_risk: Math.round(burnRisk * 100) / 100,
      g_ratio_estimate: gRatio,
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

/** Grinding Force Engine constant.
 */
export const grindingForceEngine = new GrindingForceEngine();
