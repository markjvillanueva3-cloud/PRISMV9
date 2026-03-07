/**
 * SpindleTorqueCurveEngine — Spindle Torque/Power Curve Analyzer
 *
 * Analyzes spindle performance at operating point:
 * - Constant torque vs constant power regions
 * - Available torque at operating RPM
 * - Power at operating RPM
 * - Base speed (corner speed) identification
 * - Torque margin for cutting operation
 * - Optimal RPM for maximum metal removal
 *
 * Key physics: Below base speed, torque is constant (T = T_max).
 * Above base speed, power is constant (P = P_max), so torque
 * falls as T = P/(2π·n/60). The base speed = P_max/(2π·T_max/60).
 * Heavy cuts at low RPM need torque; high-speed finishing needs
 * power. Gear ranges shift the curve.
 *
 * Reference: Spindle motor characteristics (Fanuc/Siemens),
 *            Machine tool drive design,
 *            Sandvik power/torque calculation guide
 *
 * Actions: spindle_torque_curve_calc
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export interface SpindleTorqueCurveInput {
  max_power_kw?: number;
  max_torque_nm?: number;
  max_rpm?: number;
  base_speed_rpm?: number;
  operating_rpm: number;
  required_torque_nm?: number;
  required_power_kw?: number;
  gear_range?: "low" | "high" | "direct";
  duty_cycle?: "S1" | "S3_25" | "S6_40";
  spindle_type?: "belt" | "gear" | "direct" | "integral";
}

export interface SpindleTorqueCurveResult {
  available_torque: AtomicValue;
  available_power: AtomicValue;
  base_speed: AtomicValue;
  operating_region: AtomicValue;
  torque_margin: AtomicValue;
  power_margin: AtomicValue;
  optimal_mrr_rpm: AtomicValue;
  continuous_rating: AtomicValue;
  torque_sufficient: AtomicValue;
  power_sufficient: AtomicValue;
  warnings: string[];
}

// ── Reference Data ────────────────────────────────────────────────

/** Typical spindle specs by type */
const SPINDLE_SPECS: Record<string, {
  power: number; torque: number; maxRpm: number;
}> = {
  belt:     { power: 22.4, torque: 122, maxRpm: 8100 },
  gear:     { power: 18.5, torque: 350, maxRpm: 6000 },
  direct:   { power: 30,   torque: 95,  maxRpm: 15000 },
  integral: { power: 37,   torque: 70,  maxRpm: 20000 },
};

/** Duty cycle derating factors */
const DUTY_DERATING: Record<string, number> = {
  S1: 1.0,      // continuous
  S3_25: 0.85,  // 25% intermittent
  S6_40: 0.90,  // 40% continuous with load
};

/** Gear range multipliers */
const GEAR_FACTORS: Record<string, { torqueMult: number; rpmMult: number }> = {
  low:    { torqueMult: 2.5, rpmMult: 0.3 },
  high:   { torqueMult: 1.0, rpmMult: 1.0 },
  direct: { torqueMult: 1.0, rpmMult: 1.0 },
};

// ── Engine ─────────────────────────────────────────────────────────

export class SpindleTorqueCurveEngine {
  calculate(input: SpindleTorqueCurveInput): SpindleTorqueCurveResult {
    const warnings: string[] = [];
    const sType = input.spindle_type ?? "belt";
    const specs = SPINDLE_SPECS[sType] ?? SPINDLE_SPECS.belt;
    const duty = input.duty_cycle ?? "S1";
    const gearRange = input.gear_range ?? "high";
    const gearFactor = GEAR_FACTORS[gearRange] ?? GEAR_FACTORS.high;

    const derating = DUTY_DERATING[duty] ?? 1.0;
    const maxPower = (input.max_power_kw ?? specs.power) * derating;
    const maxTorque = (input.max_torque_nm ?? specs.torque)
      * derating * gearFactor.torqueMult;
    const maxRpm = (input.max_rpm ?? specs.maxRpm) * gearFactor.rpmMult;
    const opRpm = input.operating_rpm;

    // Base speed (corner speed): where constant torque meets constant power
    // P = T × 2π × n/60, so n_base = P×60/(2π×T)
    const baseSpeed = input.base_speed_rpm
      ?? (maxPower * 1000 * 60) / (2 * Math.PI * maxTorque);

    // Available torque at operating RPM
    let availTorque: number;
    let region: string;
    if (opRpm <= baseSpeed) {
      availTorque = maxTorque;
      region = "constant_torque";
    } else if (opRpm <= maxRpm) {
      // Constant power region: T = P/(2π·n/60)
      availTorque = (maxPower * 1000 * 60) / (2 * Math.PI * opRpm);
      region = "constant_power";
    } else {
      // Beyond max RPM: field weakening, both drop
      const ratio = maxRpm / opRpm;
      availTorque = (maxPower * 1000 * 60) /
        (2 * Math.PI * maxRpm) * ratio;
      region = "field_weakening";
    }

    // Available power at operating RPM
    let availPower: number;
    if (opRpm <= baseSpeed) {
      availPower = (maxTorque * 2 * Math.PI * opRpm) / (60 * 1000);
    } else if (opRpm <= maxRpm) {
      availPower = maxPower;
    } else {
      availPower = maxPower * (maxRpm / opRpm);
    }

    // Margins
    const reqTorque = input.required_torque_nm ?? 0;
    const reqPower = input.required_power_kw ?? 0;
    const torqueMargin = reqTorque > 0
      ? ((availTorque - reqTorque) / reqTorque) * 100 : 100;
    const powerMargin = reqPower > 0
      ? ((availPower - reqPower) / reqPower) * 100 : 100;

    const torqueSufficient = reqTorque <= 0 || availTorque >= reqTorque;
    const powerSufficient = reqPower <= 0 || availPower >= reqPower;

    // Optimal RPM for max MRR (at base speed, both torque and power are max)
    const optimalMrrRpm = baseSpeed;

    // Continuous rating (typically 70-80% of peak)
    const continuousRating = maxPower * 0.75;

    // Warnings
    if (!torqueSufficient) {
      warnings.push(
        `Required torque ${r1(reqTorque)} Nm exceeds available ` +
        `${r1(availTorque)} Nm at ${opRpm} RPM — reduce DOC or speed`
      );
    }
    if (!powerSufficient) {
      warnings.push(
        `Required power ${r1(reqPower)} kW exceeds available ` +
        `${r1(availPower)} kW — reduce feed or DOC`
      );
    }
    if (region === "field_weakening") {
      warnings.push(
        `Operating at ${opRpm} RPM in field weakening region — ` +
        "both torque and power reduced"
      );
    }
    if (opRpm > maxRpm) {
      warnings.push(
        `RPM ${opRpm} exceeds spindle max ${r0(maxRpm)} — ` +
        "reduce speed"
      );
    }
    if (torqueMargin >= 0 && torqueMargin < 20 && reqTorque > 0) {
      warnings.push(
        `Torque margin only ${r0(torqueMargin)}% — ` +
        "limited headroom for harder material zones"
      );
    }
    if (gearRange === "low" && opRpm > baseSpeed * 0.8) {
      warnings.push(
        "Low gear at high RPM — consider switching to high gear"
      );
    }

    return {
      available_torque: av(r1(availTorque), "Nm", 2,
        region === "constant_torque"
          ? "Constant torque region"
          : `P×60/(2π×${opRpm})`),
      available_power: av(r2(availPower), "kW", 0.2,
        region === "constant_power"
          ? "Constant power region"
          : `T×2π×${opRpm}/60000`),
      base_speed: av(r0(baseSpeed), "rpm", 10,
        "P×60/(2π×T_max)"),
      operating_region: av(
        region === "constant_torque" ? 1
          : region === "constant_power" ? 2 : 3,
        region, 0, `${opRpm} RPM vs base ${r0(baseSpeed)} RPM`),
      torque_margin: av(r1(torqueMargin), "%", 2,
        `(${r1(availTorque)} - ${r1(reqTorque)}) / ${r1(reqTorque)} × 100`),
      power_margin: av(r1(powerMargin), "%", 2,
        `(${r2(availPower)} - ${r1(reqPower)}) / ${r1(reqPower)} × 100`),
      optimal_mrr_rpm: av(r0(optimalMrrRpm), "rpm", 50,
        "Base speed = max torque × power intersection"),
      continuous_rating: av(r1(continuousRating), "kW", 0.5,
        "~75% of peak rating"),
      torque_sufficient: av(torqueSufficient ? 1 : 0,
        torqueSufficient ? "YES" : "NO", 0,
        `Need ${r1(reqTorque)} Nm, have ${r1(availTorque)} Nm`),
      power_sufficient: av(powerSufficient ? 1 : 0,
        powerSufficient ? "YES" : "NO", 0,
        `Need ${r1(reqPower)} kW, have ${r2(availPower)} kW`),
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

function r0(n: number): number { return Math.round(n); }
function r1(n: number): number { return Math.round(n * 10) / 10; }
function r2(n: number): number { return Math.round(n * 100) / 100; }

export const spindleTorqueCurveEngine = new SpindleTorqueCurveEngine();
