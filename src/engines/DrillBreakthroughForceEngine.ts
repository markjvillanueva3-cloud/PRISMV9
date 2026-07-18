/**
 * DrillBreakthroughForceEngine — Drilling thrust force & exit breakthrough prediction
 *
 * Models: Kienzle-based drilling thrust, chisel edge contribution,
 *         breakthrough force spike prediction, exit feed recommendation
 * References: Shaw (2005), Altintas (2012), Klocke (2011)
 * Safety: Critical for thin-wall, composite, and stacked material drilling
 */

import { getKienzle, CANONICAL_KIENZLE } from "../physics/constants.js";

// ─── Types ─────────────────────────────────────────────────────────

export type ExitSupport = "none" | "backed" | "sacrificial";
/** Burr Risk type definition.
 */
export type BurrRisk = "low" | "medium" | "high";

/** Drill Breakthrough Input configuration/data structure.
 */
export interface DrillBreakthroughInput {
  drill_diameter_mm: number;
  point_angle_deg: number;            // typically 118° or 140°
  web_thickness_mm?: number;          // chisel edge width (default: 0.18 × diameter)
  helix_angle_deg?: number;           // default 30°
  feed_mm_rev: number;
  spindle_rpm: number;
  workpiece_thickness_mm: number;
  material_kc1_1?: number;            // specific cutting force (N/mm²)
  material_mc?: number;               // Kienzle exponent
  workpiece_hardness_hrc?: number;    // for auto-estimation of kc1_1
  is_through_hole: boolean;
  exit_support?: ExitSupport;         // workpiece support on exit side
  remaining_thickness_mm?: number;    // for in-progress monitoring
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

/** Drill Breakthrough Result configuration/data structure.
 */
export interface DrillBreakthroughResult {
  steady_state_thrust_N: AtomicValue;
  steady_state_torque_Nm: AtomicValue;
  peak_breakthrough_thrust_N: AtomicValue;
  breakthrough_torque_Nm: AtomicValue;
  recommended_exit_feed_mm_rev: AtomicValue;
  critical_remaining_mm: AtomicValue;
  chisel_edge_contribution_pct: number;
  exit_burr_risk: BurrRisk;
  is_safe: boolean;
  recommendations: string[];
}

// ─── Constants ─────────────────────────────────────────────────────

/**
 * Estimate kc1_1 from hardness when not provided.
 * Maps HRC ranges to canonical ISO group Kienzle constants with hardness corrections.
 * Source: Canonical CANONICAL_KIENZLE (Sandvik/Altintas), hardness interpolation per Shaw (2005).
 */
const estimateKc = (hrc: number): { kc1_1: number; mc: number } => {
  if (hrc <= 15) return { kc1_1: CANONICAL_KIENZLE.N.kc1_1 + 500, mc: 0.25 };  // soft steel / aluminum (~1200)
  if (hrc <= 25) return { kc1_1: Math.round(CANONICAL_KIENZLE.P.kc1_1 * 0.83), mc: 0.26 };  // low carbon steel (~1500)
  if (hrc <= 35) return { kc1_1: CANONICAL_KIENZLE.P.kc1_1, mc: CANONICAL_KIENZLE.P.mc };    // medium carbon steel (1800)
  if (hrc <= 45) return { kc1_1: Math.round(CANONICAL_KIENZLE.M.kc1_1 * 1.05), mc: 0.24 };  // alloy steel (~2200)
  if (hrc <= 55) return { kc1_1: CANONICAL_KIENZLE.S.kc1_1, mc: 0.22 };                      // hardened steel (2800)
  return { kc1_1: Math.round(CANONICAL_KIENZLE.H.kc1_1 * 1.09), mc: 0.20 };                  // fully hardened (~3500)
};

/**
 * Chisel edge thrust fraction — empirical (Shaw 2005)
 * Chisel edge typically contributes 40–60% of total thrust
 * Higher web thickness ratio → higher chisel contribution
 */
const chiselFraction = (webRatio: number): number => {
  // webRatio = web_thickness / drill_diameter
  return Math.min(0.70, 0.30 + 0.80 * webRatio);
};

/** Breakthrough spike multiplier by exit support type */
const BREAKTHROUGH_MULTIPLIER: Record<ExitSupport, number> = {
  none: 1.6,        // unsupported: high spike
  backed: 1.15,     // backed plate: minimal spike
  sacrificial: 1.25, // sacrificial layer: moderate
};

// ─── Engine ────────────────────────────────────────────────────────

/** Drill Breakthrough Force Engine engine/manager.
 */
export class DrillBreakthroughForceEngine {
  calculate(input: DrillBreakthroughInput): DrillBreakthroughResult {
    const {
      drill_diameter_mm: d,
      point_angle_deg: pa,
      helix_angle_deg: helix = 30,
      feed_mm_rev: f,
      spindle_rpm: rpm,
      workpiece_thickness_mm: thickness,
      workpiece_hardness_hrc: hrc = 30,
      is_through_hole: isThrough,
      exit_support: support = "none",
      remaining_thickness_mm: remaining,
    } = input;

    const recs: string[] = [];

    // Web thickness: default 18% of diameter (standard twist drill)
    const web = input.web_thickness_mm ?? d * 0.18;

    // ── 1. Cutting force coefficients ──
    const kc1_1 = input.material_kc1_1 ?? estimateKc(hrc).kc1_1;
    const mc = input.material_mc ?? estimateKc(hrc).mc;

    // ── 2. Half point angle ──
    const kappa = (pa / 2) * (Math.PI / 180);  // half point angle in rad
    const sinKappa = Math.sin(kappa);
    const cosKappa = Math.cos(kappa);

    // ── 3. Steady-state thrust force ──
    // Ft = 0.5 × kc × f × d × sin(κ) × correction
    // where kc = kc1_1 × h^(-mc), h = f×sin(κ)/2 (undeformed chip thickness)
    const h = f > 0 ? (f * sinKappa) / 2 : 0.01;
    const kc = kc1_1 * Math.pow(Math.max(h, 0.001), -mc);

    // Cutting lip thrust (two lips)
    const Ft_lips = kc * f * (d / 2) * sinKappa;

    // Chisel edge thrust
    const webRatio = d > 0 ? web / d : 0.18;
    const chiselPct = chiselFraction(webRatio);

    // Total thrust: lips contribute (1 - chiselPct), chisel adds chiselPct
    // So: Ft_total = Ft_lips / (1 - chiselPct)
    const Ft_total = chiselPct < 1.0 ? Ft_lips / (1 - chiselPct) : Ft_lips * 2;

    // ── 4. Steady-state torque ──
    // M = kc × f × d² / 8 (two lips)
    const torque = kc * f * d * d / 8;
    const torque_Nm = torque / 1000;

    // ── 5. Breakthrough (exit) force spike ──
    const btMultiplier = BREAKTHROUGH_MULTIPLIER[support];
    const Ft_breakthrough = isThrough ? Ft_total * btMultiplier : Ft_total;
    const torque_bt = isThrough ? torque_Nm * (btMultiplier * 0.6 + 0.4) : torque_Nm;

    // ── 6. Critical remaining thickness ──
    // When the drill cone starts to exit: t_crit = (d/2) / tan(κ)
    const tanKappa = Math.tan(kappa);
    const t_crit = tanKappa > 0 ? (d / 2) / tanKappa : d;

    // ── 7. Recommended exit feed ──
    // Reduce feed to 50% when remaining < t_crit, 30% for unsupported
    const feedReductionFactor = support === "none" ? 0.30
      : support === "sacrificial" ? 0.50 : 0.70;
    const exitFeed = f * feedReductionFactor;

    // ── 8. Exit burr risk ──
    let burrRisk: BurrRisk = "low";
    /** If.
     * @param isThrough - is through
     * @returns void
     */
    if (isThrough) {
      if (support === "none" && f > 0.15) burrRisk = "high";
      else if (support === "none" && f > 0.08) burrRisk = "medium";
      else if (support === "sacrificial" && f > 0.20) burrRisk = "medium";
    }

    // Ductile materials (low hardness) produce larger burrs
    if (hrc < 20 && burrRisk === "medium") burrRisk = "high";

    // ── 9. Safety assessment ──
    // Check if remaining thickness is in danger zone
    const inBreakthroughZone = remaining !== undefined && remaining < t_crit;
    const isSafe = !inBreakthroughZone || support !== "none" || f <= exitFeed;

    // ── 10. Recommendations ──
    /** If.
     * @param inBreakthroughZone - in breakthrough zone
     * @returns void
     */
    if (inBreakthroughZone && support === "none") {
      recs.push(
        `SAFETY: Drill is ${remaining?.toFixed(2)}mm from exit `
        + `(critical at ${t_crit.toFixed(2)}mm) — reduce feed to `
        + `${exitFeed.toFixed(3)} mm/rev immediately`
      );
    }

    /** If.
     * @param isThrough - is through
     * @returns void
     */
    if (isThrough && support === "none") {
      recs.push(
        `Through-hole with no exit support — peak thrust will spike `
        + `to ~${Math.round(Ft_breakthrough)}N `
        + `(${(btMultiplier * 100).toFixed(0)}% of steady-state). `
        + `Use backing plate or reduce feed at exit`
      );
    }

    /** If.
     * @param burrRisk - burr risk
     * @returns void
     */
    if (burrRisk === "high") {
      recs.push(
        `High exit burr risk — consider deburring pass, `
        + `pecking near exit, or countersink from exit side`
      );
    }

    /** If.
     * @param web - web
     * @returns void
     */
    if (web / d > 0.25) {
      recs.push(
        `Large web ratio (${(web / d * 100).toFixed(0)}%) — `
        + `chisel edge produces ${(chiselPct * 100).toFixed(0)}% `
        + `of thrust. Consider web thinning`
      );
    }

    /** If.
     * @param f - f
     * @returns void
     */
    if (f > 0.35 * d) {
      recs.push(
        `Feed ${f} mm/rev is very high for ${d}mm drill `
        + `(${(f / d * 100).toFixed(0)}% of diameter) — `
        + `risk of drill breakage`
      );
    }

    /** If.
     * @param recs.length - recs.length
     * @returns void
     */
    if (recs.length === 0) {
      recs.push(
        `Drilling parameters nominal — thrust ${Math.round(Ft_total)}N, `
        + `torque ${torque_Nm.toFixed(2)}Nm, `
        + `${isThrough ? "through-hole" : "blind hole"}`
      );
    }

    // Playbook consultation for deep hole / hole making rules
    try {
      const { machiningPlaybookEngine } = require("./MachiningPlaybookEngine.js");
      const aspectRatio = d > 0 ? thickness / d : undefined;
      const pbResult = machiningPlaybookEngine.advise({
        categories: ["deep_hole", "hole_making"],
        ...(aspectRatio !== undefined && { aspect_ratio: aspectRatio }),
      });
      for (const rule of pbResult.rules) {
        if (rule.severity === "critical" || rule.severity === "important") {
          recs.push(`[Playbook ${rule.id}] ${rule.title}`);
        }
      }
    } catch { /* playbook not available */ }

    // ── 11. Uncertainty ──
    const thrustUncertainty = Ft_total * 0.15;
    const btUncertainty = Ft_breakthrough * 0.25;  // higher for breakthrough

    return {
      steady_state_thrust_N: {
        value: Math.round(Ft_total),
        unit: "N",
        uncertainty: Math.round(thrustUncertainty),
        source: "kienzle_drilling",
      },
      steady_state_torque_Nm: {
        value: Math.round(torque_Nm * 100) / 100,
        unit: "Nm",
        uncertainty: Math.round(torque_Nm * 0.15 * 100) / 100,
        source: "kienzle_drilling",
      },
      peak_breakthrough_thrust_N: {
        value: Math.round(Ft_breakthrough),
        unit: "N",
        uncertainty: Math.round(btUncertainty),
        source: "shaw_breakthrough_model",
        warning: Ft_breakthrough > 5000
          ? "Very high breakthrough force" : undefined,
      },
      breakthrough_torque_Nm: {
        value: Math.round(torque_bt * 100) / 100,
        unit: "Nm",
        uncertainty: Math.round(torque_bt * 0.20 * 100) / 100,
        source: "shaw_breakthrough_model",
      },
      recommended_exit_feed_mm_rev: {
        value: Math.round(exitFeed * 1000) / 1000,
        unit: "mm/rev",
        uncertainty: exitFeed * 0.10,
        source: "empirical_exit_strategy",
      },
      critical_remaining_mm: {
        value: Math.round(t_crit * 100) / 100,
        unit: "mm",
        uncertainty: t_crit * 0.05,
        source: "geometric_cone_exit",
      },
      chisel_edge_contribution_pct: Math.round(chiselPct * 100),
      exit_burr_risk: burrRisk,
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

/** Drill Breakthrough Force Engine constant.
 */
export const drillBreakthroughForceEngine = new DrillBreakthroughForceEngine();
