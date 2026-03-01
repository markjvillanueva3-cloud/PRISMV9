/**
 * CuttingPowerBudgetEngine — Machine power/torque budget & inverse solver
 *
 * Models: Spindle torque-speed curve (constant torque / constant power regions),
 *         power utilization, maximum MRR within power envelope, inverse feed solver
 * References: Altintas (2012) Ch.3, Machine Tool Dynamics, ISO 3002
 * Safety: Prevents spindle overload, enables machine-matched parameter selection
 */

// ─── Types ─────────────────────────────────────────────────────────

export interface PowerBudgetInput {
  machine_power_kW: number;              // rated continuous spindle power
  machine_max_torque_Nm?: number;        // max torque (if not given, derived from power + base RPM)
  machine_base_rpm?: number;             // RPM where max torque transitions to max power (default 2000)
  machine_max_rpm?: number;              // spindle max speed (default 10000)
  cutting_speed_m_min: number;           // Vc
  tool_diameter_mm?: number;             // for RPM calc (milling/drilling) — omit for turning
  workpiece_diameter_mm?: number;        // for RPM calc (turning) — omit for milling
  feed_mm_rev?: number;                  // feed per rev (turning/drilling)
  feed_mm_tooth?: number;               // feed per tooth (milling)
  flutes?: number;                       // number of teeth (milling, default 4)
  depth_of_cut_mm: number;              // axial DOC (ap)
  width_of_cut_mm?: number;             // radial DOC (ae, milling only)
  material_kc1_1?: number;              // specific cutting force
  material_mc?: number;                 // Kienzle exponent
  iso_group?: "P" | "M" | "K" | "N" | "S" | "H";
}

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
  warning?: string;
}

export interface PowerBudgetResult {
  required_power_kW: AtomicValue;
  available_power_kW: AtomicValue;
  required_torque_Nm: AtomicValue;
  available_torque_Nm: AtomicValue;
  power_utilization_pct: AtomicValue;
  torque_utilization_pct: AtomicValue;
  limiting_factor: "power" | "torque" | "none";
  max_feed_at_limit: AtomicValue;
  max_mrr_cm3_min: AtomicValue;
  spindle_rpm: number;
  is_safe: boolean;
  recommendations: string[];
}

// ─── Constants ─────────────────────────────────────────────────────

const KC_ISO: Record<string, { kc1_1: number; mc: number }> = {
  P: { kc1_1: 1800, mc: 0.25 },
  M: { kc1_1: 2100, mc: 0.25 },
  K: { kc1_1: 1100, mc: 0.25 },
  N: { kc1_1: 700,  mc: 0.25 },
  S: { kc1_1: 2800, mc: 0.22 },
  H: { kc1_1: 3200, mc: 0.20 },
};

// ─── Engine ────────────────────────────────────────────────────────

export class CuttingPowerBudgetEngine {
  calculate(input: PowerBudgetInput): PowerBudgetResult {
    const {
      machine_power_kW: P_rated,
      machine_max_rpm: maxRPM = 10000,
      cutting_speed_m_min: Vc,
      depth_of_cut_mm: ap,
      width_of_cut_mm: ae,
      flutes = 4,
      iso_group: iso = "P",
    } = input;

    const recs: string[] = [];

    // ── 1. Determine spindle RPM ──
    let rpm: number;
    if (input.workpiece_diameter_mm && input.workpiece_diameter_mm > 0) {
      // Turning: n = Vc×1000 / (π×D)
      rpm = (Vc * 1000) / (Math.PI * input.workpiece_diameter_mm);
    } else if (input.tool_diameter_mm && input.tool_diameter_mm > 0) {
      // Milling/drilling: n = Vc×1000 / (π×d)
      rpm = (Vc * 1000) / (Math.PI * input.tool_diameter_mm);
    } else {
      rpm = 1000; // fallback
    }
    rpm = Math.min(rpm, maxRPM);

    // ── 2. Base RPM (torque-power transition) ──
    const baseRPM = input.machine_base_rpm ?? 2000;

    // ── 3. Max torque ──
    // If not given, derive from rated power at base RPM: T = P×9549/n
    const T_rated = input.machine_max_torque_Nm
      ?? (P_rated * 9549 / baseRPM);

    // ── 4. Spindle torque-speed curve ──
    // Below base RPM: torque = T_rated (constant), power = T_rated × n / 9549
    // Above base RPM: power = P_rated (constant), torque = P_rated × 9549 / n
    const T_available = rpm <= baseRPM
      ? T_rated
      : Math.min(T_rated, (P_rated * 9549) / rpm);
    const P_available = rpm <= baseRPM
      ? Math.min(P_rated, (T_rated * rpm) / 9549)
      : P_rated;

    // ── 5. Cutting force (Kienzle) ──
    const kcData = {
      kc1_1: input.material_kc1_1 ?? KC_ISO[iso].kc1_1,
      mc: input.material_mc ?? KC_ISO[iso].mc,
    };

    // Determine feed rate
    let f_rev: number; // feed per revolution
    if (input.feed_mm_rev) {
      f_rev = input.feed_mm_rev;
    } else if (input.feed_mm_tooth) {
      f_rev = input.feed_mm_tooth * flutes;
    } else {
      f_rev = 0.15; // default
    }

    // Feed rate in mm/min
    const vf = f_rev * rpm;

    // Chip thickness (simplified)
    const h = Math.max(f_rev * 0.5, 0.01);
    const kc = kcData.kc1_1 * Math.pow(h, -kcData.mc);

    // ── 6. Required power ──
    // P = kc × ae × ap × vf / (60 × 10⁶) (kW)
    // For turning: ae = f_rev (feed), already in ap × f
    const ae_eff = ae ?? f_rev; // turning: ae = feed
    const P_required = (kc * ae_eff * ap * vf) / (60 * 1e6);

    // ── 7. Required torque ──
    const T_required = rpm > 0 ? (P_required * 9549) / rpm : 0;

    // ── 8. Utilization ──
    const powerUtil = P_available > 0 ? (P_required / P_available) * 100 : 0;
    const torqueUtil = T_available > 0 ? (T_required / T_available) * 100 : 0;
    const limitingFactor: "power" | "torque" | "none" =
      powerUtil > torqueUtil
        ? (powerUtil > 80 ? "power" : "none")
        : (torqueUtil > 80 ? "torque" : "none");

    // ── 9. Inverse solve: max feed rate within power envelope ──
    // P_max = kc × ae × ap × (f_max × rpm) / (60 × 10⁶)
    // f_max = P_max × 60 × 10⁶ / (kc × ae × ap × rpm)
    const f_max = rpm > 0 && kc > 0 && ae_eff > 0 && ap > 0
      ? (P_available * 60 * 1e6) / (kc * ae_eff * ap * rpm)
      : 999;

    // ── 10. Max MRR within envelope ──
    // MRR = ae × ap × vf_max / 1000 (cm³/min)
    const vf_max = f_max * rpm;
    const maxMRR = (ae_eff * ap * vf_max) / 1000;

    // ── 11. Safety ──
    const isSafe = powerUtil < 95 && torqueUtil < 95;

    // ── 12. Recommendations ──
    if (powerUtil > 95 || torqueUtil > 95) {
      const factor = powerUtil > torqueUtil ? "power" : "torque";
      recs.push(
        `SAFETY: ${factor} overload (${Math.max(powerUtil, torqueUtil).toFixed(0)}%). `
        + `Reduce feed to max ${f_max.toFixed(3)} mm/rev or reduce depth of cut`
      );
    } else if (powerUtil > 80 || torqueUtil > 80) {
      recs.push(
        `High ${limitingFactor !== "none" ? limitingFactor : "power"} utilization — `
        + `operating near machine capacity. Consider lighter cuts for tool life`
      );
    }

    if (rpm <= baseRPM && torqueUtil > powerUtil * 1.2) {
      recs.push(
        `Operating in constant-torque region (${Math.round(rpm)} RPM < base ${baseRPM}). `
        + `Torque is the limiting factor — increase speed to reach power region`
      );
    }

    if (powerUtil < 30 && torqueUtil < 30) {
      recs.push(
        `Machine underutilized (${Math.max(powerUtil, torqueUtil).toFixed(0)}%). `
        + `Can increase feed up to ${f_max.toFixed(3)} mm/rev (max MRR: ${maxMRR.toFixed(1)} cm³/min)`
      );
    }

    if (recs.length === 0) {
      recs.push(
        `Power budget OK — P=${P_required.toFixed(2)}kW/${P_available.toFixed(1)}kW `
        + `(${powerUtil.toFixed(0)}%), T=${T_required.toFixed(1)}Nm/${T_available.toFixed(0)}Nm `
        + `(${torqueUtil.toFixed(0)}%)`
      );
    }

    return {
      required_power_kW: {
        value: Math.round(P_required * 1000) / 1000,
        unit: "kW",
        uncertainty: Math.round(P_required * 0.15 * 1000) / 1000,
        source: "kienzle_power",
      },
      available_power_kW: {
        value: Math.round(P_available * 100) / 100,
        unit: "kW",
        uncertainty: Math.round(P_available * 0.05 * 100) / 100,
        source: "torque_speed_curve",
      },
      required_torque_Nm: {
        value: Math.round(T_required * 100) / 100,
        unit: "Nm",
        uncertainty: Math.round(T_required * 0.15 * 100) / 100,
        source: "power_speed_relation",
      },
      available_torque_Nm: {
        value: Math.round(T_available * 10) / 10,
        unit: "Nm",
        uncertainty: Math.round(T_available * 0.05 * 10) / 10,
        source: "torque_speed_curve",
      },
      power_utilization_pct: {
        value: Math.round(powerUtil),
        unit: "%",
        uncertainty: 5,
        source: "ratio",
      },
      torque_utilization_pct: {
        value: Math.round(torqueUtil),
        unit: "%",
        uncertainty: 5,
        source: "ratio",
      },
      limiting_factor: limitingFactor,
      max_feed_at_limit: {
        value: Math.round(Math.min(f_max, 10) * 1000) / 1000,
        unit: "mm/rev",
        uncertainty: Math.round(Math.min(f_max, 10) * 0.15 * 1000) / 1000,
        source: "inverse_power_solve",
      },
      max_mrr_cm3_min: {
        value: Math.round(Math.min(maxMRR, 9999) * 10) / 10,
        unit: "cm³/min",
        uncertainty: Math.round(Math.min(maxMRR, 9999) * 0.15 * 10) / 10,
        source: "power_envelope",
      },
      spindle_rpm: Math.round(rpm),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const cuttingPowerBudgetEngine = new CuttingPowerBudgetEngine();
