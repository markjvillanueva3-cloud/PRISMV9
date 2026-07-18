/**
 * SpindlePowerCheckEngine — Spindle Power & Torque Validation
 *
 * Validates that machining parameters are within spindle limits:
 * - Power consumption from MRR and specific cutting energy
 * - Torque at the cutting point
 * - Speed range validation (constant power vs constant torque)
 * - Power curve interpolation for given RPM
 * - Utilization percentage and headroom
 *
 * Key physics: Spindle power P = kc × MRR / (60 × 10⁶) kW.
 * Torque T = P × 9549 / RPM. Most spindles have a constant
 * torque region (low RPM) and constant power region (high RPM)
 * with a knee point between them.
 *
 * Reference: Sandvik power/torque calculation guide,
 *            Machinery's Handbook Ch.29,
 *            ISO 3685 (tool life / power)
 *
 * Actions: power_check, torque_check, spindle_validate
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export interface PowerCheckInput {
  mrr_cm3_per_min: number;
  material_iso_group?: "P" | "M" | "K" | "N" | "S" | "H";
  spindle_power_kw?: number;
  spindle_max_rpm?: number;
  spindle_knee_rpm?: number;
  current_rpm: number;
  machine_efficiency?: number;
}

export interface PowerCheckResult {
  cutting_power: AtomicValue;
  spindle_power_required: AtomicValue;
  available_power: AtomicValue;
  utilization: AtomicValue;
  torque_required: AtomicValue;
  available_torque: AtomicValue;
  headroom: AtomicValue;
  is_within_limits: boolean;
  recommendation: string;
  warnings: string[];
}

export interface TorqueCheckInput {
  cutting_force_n: number;
  tool_diameter_mm: number;
  current_rpm: number;
  spindle_max_torque_nm?: number;
}

export interface TorqueCheckResult {
  torque_required: AtomicValue;
  torque_available: AtomicValue;
  utilization: AtomicValue;
  is_within_limits: boolean;
  warnings: string[];
}

// ── Reference Data ────────────────────────────────────────────────

/**
 * Representative AVERAGE specific cutting energy for power estimation (unit power), by ISO group.
 * N/mm^2 == W.s/mm^3. Deliberately conservative, chip-thickness-AVERAGED values -- this coarse power
 * gate has NO chip-thickness input, so it cannot apply the Kienzle size-effect kc = kc1_1 * h^(-mc).
 * These are NOT Kienzle kc1.1 (the value at h=1mm): a raw kc1.1 (P=1800) would UNDER-predict power on
 * thin-chip finishing ops (true kc @ h=0.05mm ~= 1800*0.05^-0.25 ~= 3806 N/mm^2) and make the over-power
 * warning fire too late -- a measured safety regression (physics-reviewer FAIL, 2026-07-01). For the
 * h-resolved kc use SpecificCuttingEnergyEngine (prism_calc:calc_specific_cutting_energy).
 * Source: Machinery's Handbook Ch.29 unit power; Sandvik power guide; cf. REFERENCE_SPECIFIC_ENERGY
 * (Klocke 2011). AUDIT-EXEMPT: representative unit-power, intentionally NOT kc1.1 -- do not "dedup" to
 * CANONICAL_KIENZLE (that swap lowers the power estimate and under-warns the spindle-overload gate).
 */
const KC_VALUES: Record<string, number> = {
  P: 2200, M: 2600, K: 1400, N: 800, S: 3000, H: 3800,
};

/** Default spindle specs (typical VMC) */
const DEFAULT_SPINDLE = {
  power_kw: 15,
  max_rpm: 12000,
  knee_rpm: 4000,
  max_torque_nm: 36, // at knee point
};

// ── Engine ─────────────────────────────────────────────────────────

export class SpindlePowerCheckEngine {
  /**
   * Check if MRR is achievable with spindle power.
   */
  powerCheck(input: PowerCheckInput): PowerCheckResult {
    const warnings: string[] = [];
    const iso = input.material_iso_group ?? "P";
    const mrr = input.mrr_cm3_per_min;
    const rpm = input.current_rpm;
    const efficiency = input.machine_efficiency ?? 0.85;

    const maxPower = input.spindle_power_kw ??
      DEFAULT_SPINDLE.power_kw;
    const maxRpm = input.spindle_max_rpm ??
      DEFAULT_SPINDLE.max_rpm;
    const kneeRpm = input.spindle_knee_rpm ??
      DEFAULT_SPINDLE.knee_rpm;

    // Cutting power
    // P_cut = kc × MRR / (60 × 1000) kW
    // MRR in cm³/min → mm³/min × 1000
    const kc = KC_VALUES[iso] ?? 2200;
    const cuttingPower = (kc * mrr * 1000) / (60 * 1e6);

    // Spindle power required (accounting for efficiency)
    const spindlePowerReq = cuttingPower / efficiency;

    // Available power at current RPM
    // Below knee: constant torque → power scales linearly with RPM
    // Above knee: constant power
    let availPower: number;
    if (rpm <= kneeRpm) {
      availPower = maxPower * (rpm / kneeRpm);
    } else {
      availPower = maxPower;
    }

    // Torque
    const torqueRequired = rpm > 0
      ? (spindlePowerReq * 9549) / rpm : 0;
    const maxTorque = (maxPower * 9549) / kneeRpm;
    let availTorque: number;
    if (rpm <= kneeRpm) {
      availTorque = maxTorque;
    } else {
      availTorque = (maxPower * 9549) / rpm;
    }

    // Utilization
    const utilization = availPower > 0
      ? (spindlePowerReq / availPower) * 100 : 0;
    const headroom = availPower > 0
      ? ((availPower - spindlePowerReq) / availPower) * 100
      : 0;

    const isWithin = spindlePowerReq <= availPower &&
      torqueRequired <= availTorque;

    // Recommendation
    let recommendation: string;
    if (utilization < 50) {
      recommendation = "Well within limits — " +
        "could increase MRR for productivity";
    } else if (utilization < 80) {
      recommendation = "Good utilization — optimal range";
    } else if (utilization < 100) {
      recommendation = "Near spindle limit — " +
        "monitor for thermal/power issues";
    } else {
      recommendation = "Exceeds spindle capacity — " +
        "reduce MRR, speed, or depth of cut";
    }

    // Warnings
    if (utilization > 100) {
      warnings.push(
        `Power required ${r1(spindlePowerReq)}kW exceeds ` +
        `available ${r1(availPower)}kW`
      );
    }
    if (utilization > 90 && utilization <= 100) {
      warnings.push(
        "Operating above 90% spindle capacity — " +
        "limited headroom for load spikes"
      );
    }
    if (rpm < kneeRpm * 0.3) {
      warnings.push(
        "Low RPM — operating in reduced power zone, " +
        "only torque-limited capacity available"
      );
    }
    if (torqueRequired > availTorque) {
      warnings.push(
        `Torque ${r1(torqueRequired)}Nm exceeds ` +
        `available ${r1(availTorque)}Nm at ${rpm} RPM`
      );
    }

    return {
      cutting_power: av(r2(cuttingPower), "kW", 0.1,
        "kc × MRR / 60M"),
      spindle_power_required: av(r2(spindlePowerReq), "kW", 0.1,
        "P_cut / efficiency"),
      available_power: av(r1(availPower), "kW", 0.05,
        rpm <= kneeRpm
          ? "Linear below knee RPM"
          : "Constant above knee RPM"),
      utilization: av(Math.round(utilization), "%", 0.05,
        "P_required / P_available × 100"),
      torque_required: av(r1(torqueRequired), "Nm", 0.1,
        "P × 9549 / RPM"),
      available_torque: av(r1(availTorque), "Nm", 0.05,
        rpm <= kneeRpm
          ? "Max torque (constant)"
          : "P × 9549 / RPM"),
      headroom: av(Math.round(headroom), "%", 0.05,
        "Remaining capacity"),
      is_within_limits: isWithin,
      recommendation,
      warnings,
    };
  }

  /**
   * Quick torque check from cutting force and tool diameter.
   */
  torqueCheck(input: TorqueCheckInput): TorqueCheckResult {
    const warnings: string[] = [];
    const fc = input.cutting_force_n;
    const d = input.tool_diameter_mm;
    const rpm = input.current_rpm;

    // Torque = F × r = F × (D/2) / 1000 (Nm)
    const torqueReq = (fc * d / 2) / 1000;

    // Available torque
    const maxTorque = input.spindle_max_torque_nm ??
      DEFAULT_SPINDLE.max_torque_nm;

    const utilization = maxTorque > 0
      ? (torqueReq / maxTorque) * 100 : 0;
    const isWithin = torqueReq <= maxTorque;

    if (!isWithin) {
      warnings.push(
        `Torque ${r1(torqueReq)}Nm exceeds ` +
        `spindle max ${maxTorque}Nm`
      );
    }
    if (utilization > 80 && isWithin) {
      warnings.push(
        "Torque utilization > 80% — limited margin"
      );
    }

    return {
      torque_required: av(r1(torqueReq), "Nm", 0.1,
        "F × D/2 / 1000"),
      torque_available: av(maxTorque, "Nm", 0.05,
        "Spindle max torque"),
      utilization: av(Math.round(utilization), "%", 0.05,
        "T_req / T_max × 100"),
      is_within_limits: isWithin,
      warnings,
    };
  }
}

// ── Helpers ───────────────────────────────────────────────────────

function av(
  value: number, unit: string,
  uncertainty: number, source: string
): AtomicValue {
  return { value, unit, uncertainty, source };
}

function r1(n: number): number { return Math.round(n * 10) / 10; }
function r2(n: number): number { return Math.round(n * 100) / 100; }

export const spindlePowerCheckEngine =
  new SpindlePowerCheckEngine();
