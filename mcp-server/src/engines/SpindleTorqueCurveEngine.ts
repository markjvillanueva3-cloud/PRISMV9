/**
 * SpindleTorqueCurveEngine
 * Models the spindle motor's torque-power characteristic curve for CNC machines.
 * Critical for verifying that programmed cuts don't exceed available torque at the operating RPM.
 *
 * The curve has two regions:
 * 1. Constant Torque (0 → base_speed): T = T_max, P increases linearly
 * 2. Constant Power (base_speed → max_speed): P = P_max, T = P_max × 9550 / n
 *
 * Many shops only check power (kW) but ignore torque (Nm) — this causes stalls
 * at low RPM with large tools, especially in titanium, stainless, and Inconel.
 *
 * Reference: CTE "Spindle power and torque limitations" (2024)
 *            Haas Automation spindle specifications
 *
 * Actions: spindle_torque_available, spindle_check_cut, spindle_max_mrr,
 *          spindle_plot_curve, spindle_recommend_rpm
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export interface SpindleSpec {
  max_power_kW: number;
  max_torque_Nm: number;
  base_speed_rpm?: number;
  max_rpm: number;
  drive_type?: "belt" | "direct" | "gear" | "integral";
}

export interface TorquePowerInput {
  rpm: number;
  spindle: SpindleSpec;
}

export interface TorquePowerResult {
  available_torque_Nm: number;
  available_power_kW: number;
  region: "constant_torque" | "constant_power" | "field_weakening";
  utilization_pct_at_given_cut?: number;
  base_speed_rpm: number;
  warnings: string[];
}

export interface CutFeasibilityInput {
  rpm: number;
  spindle: SpindleSpec;
  cutting_torque_Nm: number;
  cutting_power_kW: number;
}

export interface CutFeasibilityResult {
  torque_ok: boolean;
  power_ok: boolean;
  torque_margin_pct: number;
  power_margin_pct: number;
  limiting_factor: "torque" | "power" | "none";
  recommendation: string;
  warnings: string[];
}

export interface MaxMRRInput {
  rpm: number;
  spindle: SpindleSpec;
  material_kc1_1: number;
  material_mc: number;
  tool_diameter_mm: number;
  fz_mm: number;
}

export interface MaxMRRResult {
  max_mrr_cm3_per_min: number;
  max_ap_mm: number;
  max_ae_mm: number;
  limiting_factor: "torque" | "power";
  spindle_utilization_pct: number;
  warnings: string[];
}

export interface PlotCurveInput {
  spindle: SpindleSpec;
  rpm_points?: number;
}

export interface PlotCurveResult {
  curve: Array<{ rpm: number; torque_Nm: number; power_kW: number }>;
  base_speed_rpm: number;
  peak_torque_Nm: number;
  peak_power_kW: number;
}

export interface RecommendRPMInput {
  spindle: SpindleSpec;
  required_torque_Nm: number;
  required_power_kW: number;
  min_Vc_mpm: number;
  tool_diameter_mm: number;
}

export interface RecommendRPMResult {
  feasible: boolean;
  rpm_range: [number, number];
  optimal_rpm: number;
  reason: string;
  warnings: string[];
}

// Legacy interface kept for backward compatibility with existing `calculate()` callers
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

// ── Spindle Profiles ─────────────────────────────────────────────

/** Embedded spindle profiles for common CNC machines */
export const SPINDLE_PROFILES: Record<string, SpindleSpec> = {
  haas_vf2:        { max_power_kW: 22.4, max_torque_Nm: 122, base_speed_rpm: 1750, max_rpm: 8100,  drive_type: "belt" },
  haas_vf2_12k:    { max_power_kW: 22.4, max_torque_Nm: 122, base_speed_rpm: 1750, max_rpm: 12000, drive_type: "belt" },
  dmg_dmv50:       { max_power_kW: 25,   max_torque_Nm: 120, base_speed_rpm: 2000, max_rpm: 12000, drive_type: "direct" },
  dmg_dmu50:       { max_power_kW: 25,   max_torque_Nm: 87,  base_speed_rpm: 2750, max_rpm: 18000, drive_type: "integral" },
  mazak_vcn530c:   { max_power_kW: 30,   max_torque_Nm: 143, base_speed_rpm: 2000, max_rpm: 12000, drive_type: "belt" },
  okuma_genos_m560:{ max_power_kW: 22,   max_torque_Nm: 175, base_speed_rpm: 1200, max_rpm: 8000,  drive_type: "gear" },
  brother_s700x1:  { max_power_kW: 11,   max_torque_Nm: 35,  base_speed_rpm: 3000, max_rpm: 27000, drive_type: "integral" },
  haas_st20:       { max_power_kW: 14.9, max_torque_Nm: 203, base_speed_rpm: 700,  max_rpm: 4000,  drive_type: "belt" },
};

// ── Reference Data (legacy) ──────────────────────────────────────

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

  // ── Core helper: resolve base speed ─────────────────────────────
  private resolveBaseSpeed(spindle: SpindleSpec): number {
    if (spindle.base_speed_rpm && spindle.base_speed_rpm > 0) {
      return spindle.base_speed_rpm;
    }
    // base_speed = P_max * 1000 * 60 / (2π * T_max)
    // equivalently: base_speed = 9550 * P_max / T_max
    if (spindle.max_torque_Nm > 0) {
      return (9550 * spindle.max_power_kW) / spindle.max_torque_Nm;
    }
    // Fallback: assume base speed is 25% of max RPM
    return spindle.max_rpm * 0.25;
  }

  // ── Core helper: available torque and power at RPM ──────────────
  private availableAt(rpm: number, spindle: SpindleSpec): {
    torque_Nm: number; power_kW: number;
    region: "constant_torque" | "constant_power" | "field_weakening";
    base_speed_rpm: number;
  } {
    const baseSpeed = this.resolveBaseSpeed(spindle);

    if (rpm <= 0) {
      return {
        torque_Nm: spindle.max_torque_Nm,
        power_kW: 0,
        region: "constant_torque",
        base_speed_rpm: baseSpeed,
      };
    }

    if (rpm <= baseSpeed) {
      // Constant torque region
      const power = (spindle.max_torque_Nm * 2 * Math.PI * rpm) / 60000;
      return {
        torque_Nm: spindle.max_torque_Nm,
        power_kW: power,
        region: "constant_torque",
        base_speed_rpm: baseSpeed,
      };
    }

    if (rpm <= spindle.max_rpm) {
      // Constant power region: T = P / ω  (= P × 60000 / (2π·n), i.e. P × 9550 / n).
      // SAFETY: the available torque can never exceed the motor's rated T_max, nor
      // the available power exceed rated P_max. When the declared base speed sits
      // BELOW the true corner speed (n_corner = 60000·P / (2π·T)), the P/ω hyperbola
      // would report torque ABOVE what the motor delivers — a stall that
      // checkCutFeasibility would green-light. Take the physically consistent
      // envelope T = min(T_max, P/ω) and P = min(P_max, T_max·ω); these are exact
      // inverses so P = T·ω holds in every sub-region.
      // Ref: constant-power spindle-drive characteristic (Tlusty, "Manufacturing
      // Processes and Equipment", spindle drives; ISO 16090-1).
      const torque = Math.min(spindle.max_torque_Nm, (spindle.max_power_kW * 60000) / (2 * Math.PI * rpm));
      const power = Math.min(spindle.max_power_kW, (spindle.max_torque_Nm * 2 * Math.PI * rpm) / 60000);
      return {
        torque_Nm: torque,
        power_kW: power,
        region: "constant_power",
        base_speed_rpm: baseSpeed,
      };
    }

    // Field weakening: beyond max_rpm both torque and power drop. In this
    // high-speed (region-3) regime the deliverable POWER falls as 1/n, so torque
    // must fall as 1/n² to keep P = T·ω consistent. (Fix: torque previously fell
    // as 1/n, which implied CONSTANT power — contradicting the 1/n power reported
    // alongside it, an internal inconsistency of up to 2×.)
    // Ref: field-weakening motor characteristic (constant-power × speed-squared
    // torque roll-off).
    const ratio = spindle.max_rpm / rpm;
    const power = spindle.max_power_kW * ratio;
    const torqueAtMax = (spindle.max_power_kW * 60000) / (2 * Math.PI * spindle.max_rpm);
    return {
      torque_Nm: torqueAtMax * ratio * ratio,
      power_kW: power,
      region: "field_weakening",
      base_speed_rpm: baseSpeed,
    };
  }

  // ── Method 1: getAvailableTorqueAndPower ────────────────────────

  /**
   * Get available torque and power at a given RPM for a spindle.
   * Models the two-region (constant torque / constant power) characteristic.
   */
  getAvailableTorqueAndPower(input: TorquePowerInput): TorquePowerResult {
    const warnings: string[] = [];
    const { rpm, spindle } = input;

    if (rpm < 0) {
      warnings.push("Negative RPM provided — using absolute value");
    }
    const absRpm = Math.abs(rpm);

    const res = this.availableAt(absRpm, spindle);

    if (absRpm > spindle.max_rpm) {
      warnings.push(
        `RPM ${absRpm} exceeds spindle max ${spindle.max_rpm} — operating in field weakening`
      );
    }

    return {
      available_torque_Nm: r2(res.torque_Nm),
      available_power_kW: r3(res.power_kW),
      region: res.region,
      base_speed_rpm: r0(res.base_speed_rpm),
      warnings,
    };
  }

  // ── Method 2: checkCutFeasibility ───────────────────────────────

  /**
   * Check if a cutting operation's torque/power demands are within spindle limits.
   * cutting_torque = Fc × D / (2 × 1000) [Nm]
   * cutting_power = Fc × Vc / (60 × 1000) [kW]
   */
  checkCutFeasibility(input: CutFeasibilityInput): CutFeasibilityResult {
    const warnings: string[] = [];
    const { rpm, spindle, cutting_torque_Nm, cutting_power_kW } = input;
    const res = this.availableAt(Math.max(0, rpm), spindle);

    const torque_ok = cutting_torque_Nm <= res.torque_Nm;
    const power_ok = cutting_power_kW <= res.power_kW;

    const torque_margin_pct = res.torque_Nm > 0
      ? r1(((res.torque_Nm - cutting_torque_Nm) / res.torque_Nm) * 100)
      : 0;
    const power_margin_pct = res.power_kW > 0
      ? r1(((res.power_kW - cutting_power_kW) / res.power_kW) * 100)
      : 0;

    let limiting_factor: "torque" | "power" | "none" = "none";
    if (!torque_ok && !power_ok) {
      limiting_factor = torque_margin_pct < power_margin_pct ? "torque" : "power";
    } else if (!torque_ok) {
      limiting_factor = "torque";
    } else if (!power_ok) {
      limiting_factor = "power";
    } else if (torque_margin_pct < power_margin_pct) {
      // Both OK but torque has less margin
      limiting_factor = "torque";
    } else {
      limiting_factor = "power";
    }

    // When both are OK and margins are equal, use "none"
    if (torque_ok && power_ok && Math.abs(torque_margin_pct - power_margin_pct) < 0.5) {
      limiting_factor = "none";
    }

    let recommendation: string;
    if (torque_ok && power_ok) {
      if (Math.min(torque_margin_pct, power_margin_pct) < 15) {
        recommendation = `Cut is feasible but tight — only ${r0(Math.min(torque_margin_pct, power_margin_pct))}% margin on ${limiting_factor}. Consider reducing DOC or ae.`;
      } else {
        recommendation = "Cut is well within spindle capacity.";
      }
    } else if (!torque_ok) {
      recommendation = `Torque-limited: need ${r1(cutting_torque_Nm)} Nm but only ${r1(res.torque_Nm)} Nm available at ${rpm} RPM. ` +
        "Reduce DOC, ae, or increase RPM to move into constant-power region.";
      warnings.push("STALL RISK: Cutting torque exceeds available spindle torque");
    } else {
      recommendation = `Power-limited: need ${r2(cutting_power_kW)} kW but only ${r2(res.power_kW)} kW available. ` +
        "Reduce feed rate or DOC.";
      warnings.push("OVERLOAD RISK: Cutting power exceeds available spindle power");
    }

    return {
      torque_ok,
      power_ok,
      torque_margin_pct,
      power_margin_pct,
      limiting_factor,
      recommendation,
      warnings,
    };
  }

  // ── Method 3: findMaxMRR ────────────────────────────────────────

  /**
   * Find max MRR (ap × ae product) that stays within both torque AND power limits.
   * Uses Kienzle force model: Fc = kc1_1 × ap × fz^(1-mc)
   * Torque = Fc × D / (2000), Power = Fc × Vc / 60000
   */
  findMaxMRR(input: MaxMRRInput): MaxMRRResult {
    const warnings: string[] = [];
    const { rpm, spindle, material_kc1_1, material_mc, tool_diameter_mm, fz_mm } = input;

    const res = this.availableAt(Math.max(1, rpm), spindle);
    const Vc_mpm = Math.PI * tool_diameter_mm * rpm / 1000; // m/min

    // Kienzle: Fc = kc1_1 × ap × fz^(1-mc)  [N, ap in mm, fz in mm]
    // For a single-tooth equivalent: Fc_per_mm_ap = kc1_1 × fz^(1-mc)
    const fc_per_mm_ap = material_kc1_1 * Math.pow(Math.max(fz_mm, 0.001), 1 - material_mc);

    // Torque constraint: T_avail >= Fc × D / 2000
    // Fc = fc_per_mm_ap × ap, so ap_max_torque = T_avail × 2000 / (fc_per_mm_ap × D)
    const ap_max_torque = (res.torque_Nm * 2000) / (fc_per_mm_ap * tool_diameter_mm);

    // Power constraint: P_avail >= Fc × Vc / 60000
    // ap_max_power = P_avail × 60000 / (fc_per_mm_ap × Vc)
    const ap_max_power = Vc_mpm > 0
      ? (res.power_kW * 60000) / (fc_per_mm_ap * Vc_mpm)
      : Infinity;

    const ap_max = Math.min(ap_max_torque, ap_max_power);
    const limiting: "torque" | "power" = ap_max_torque < ap_max_power ? "torque" : "power";

    // For ae, assume ae = D (full slot) as default, then scale
    // MRR = ae × ap × fz × z × n / 1000 [cm³/min]
    // With ae = D: MRR = D × ap × fz × z × n / 1000
    // We assume z (flute count) from tool diameter heuristic
    const z = tool_diameter_mm <= 6 ? 2 : tool_diameter_mm <= 16 ? 3 : 4;
    const ae_max = tool_diameter_mm; // full slot as upper bound
    const max_ap = Math.max(0, r2(ap_max));
    const max_ae = r2(ae_max);

    // MRR = ae × ap × fz × z × n [mm³/min] → /1000 = cm³/min
    const max_mrr = r2((max_ae * max_ap * fz_mm * z * rpm) / 1000);

    // Utilization: actual force at max_ap vs available
    const fc_at_max = fc_per_mm_ap * max_ap;
    const torque_at_max = (fc_at_max * tool_diameter_mm) / 2000;
    const power_at_max = (fc_at_max * Vc_mpm) / 60000;
    const utilization = Math.max(
      res.torque_Nm > 0 ? (torque_at_max / res.torque_Nm) * 100 : 0,
      res.power_kW > 0 ? (power_at_max / res.power_kW) * 100 : 0
    );

    if (max_ap < 0.5) {
      warnings.push("Max ap is very small — consider a smaller tool or slower speed");
    }
    if (limiting === "torque" && res.region === "constant_torque") {
      warnings.push("Torque-limited in constant-torque region — increasing RPM won't help, reduce tool diameter or fz");
    }

    return {
      max_mrr_cm3_per_min: max_mrr,
      max_ap_mm: max_ap,
      max_ae_mm: max_ae,
      limiting_factor: limiting,
      spindle_utilization_pct: r1(Math.min(utilization, 100)),
      warnings,
    };
  }

  // ── Method 4: plotTorquePowerCurve ──────────────────────────────

  /**
   * Generate torque/power curve data for visualization.
   * Returns data points from 0 to max_rpm (or slightly beyond).
   */
  plotTorquePowerCurve(input: PlotCurveInput): PlotCurveResult {
    const { spindle, rpm_points = 50 } = input;
    const baseSpeed = this.resolveBaseSpeed(spindle);
    const points = Math.max(10, Math.min(rpm_points, 500));

    const curve: Array<{ rpm: number; torque_Nm: number; power_kW: number }> = [];
    const maxPlotRpm = spindle.max_rpm * 1.1; // show slightly beyond max

    for (let i = 0; i <= points; i++) {
      const rpm = r0((maxPlotRpm * i) / points);
      const res = this.availableAt(rpm, spindle);
      curve.push({
        rpm,
        torque_Nm: r2(res.torque_Nm),
        power_kW: r3(res.power_kW),
      });
    }

    return {
      curve,
      base_speed_rpm: r0(baseSpeed),
      peak_torque_Nm: spindle.max_torque_Nm,
      peak_power_kW: spindle.max_power_kW,
    };
  }

  // ── Method 5: recommendRPMForOperation ──────────────────────────

  /**
   * Find RPM range where both torque and power requirements are met.
   * Also considers minimum cutting speed (Vc) requirement.
   */
  recommendRPMForOperation(input: RecommendRPMInput): RecommendRPMResult {
    const warnings: string[] = [];
    const { spindle, required_torque_Nm, required_power_kW, min_Vc_mpm, tool_diameter_mm } = input;

    // Min RPM from cutting speed: n = Vc × 1000 / (π × D)
    const min_rpm_from_vc = (min_Vc_mpm * 1000) / (Math.PI * tool_diameter_mm);
    const baseSpeed = this.resolveBaseSpeed(spindle);

    // Find RPM range where torque requirement is met
    // In constant torque region (rpm <= baseSpeed): T = T_max
    // In constant power region (rpm > baseSpeed): T = P × 9550 / rpm
    // T >= required → rpm <= P × 9550 / required (in constant power region)
    let max_rpm_torque = spindle.max_rpm;
    if (required_torque_Nm > spindle.max_torque_Nm) {
      // Cannot meet torque requirement at any RPM
      return {
        feasible: false,
        rpm_range: [0, 0],
        optimal_rpm: 0,
        reason: `Required torque ${r1(required_torque_Nm)} Nm exceeds max spindle torque ${r1(spindle.max_torque_Nm)} Nm at any RPM.`,
        warnings: ["Reduce DOC, ae, or use a machine with more torque"],
      };
    }
    if (required_torque_Nm > 0) {
      // In constant power region, torque = P × 9550 / rpm
      // Required torque met when rpm <= P × 9550 / required_torque
      const max_rpm_cp = (spindle.max_power_kW * 9550) / required_torque_Nm;
      max_rpm_torque = Math.min(spindle.max_rpm, max_rpm_cp);
    }

    // Find RPM range where power requirement is met
    // In constant torque region: P = T × 2π × n / 60000
    // P >= required → n >= required × 60000 / (T × 2π)
    let min_rpm_power = 0;
    if (required_power_kW > spindle.max_power_kW) {
      return {
        feasible: false,
        rpm_range: [0, 0],
        optimal_rpm: 0,
        reason: `Required power ${r2(required_power_kW)} kW exceeds max spindle power ${r2(spindle.max_power_kW)} kW.`,
        warnings: ["Reduce feed, DOC, or use a more powerful machine"],
      };
    }
    if (required_power_kW > 0 && spindle.max_torque_Nm > 0) {
      // In constant torque region, power = T_max × 2π × n / 60000
      // Need: T_max × 2π × n / 60000 >= required_power
      // n >= required_power × 60000 / (T_max × 2π)
      min_rpm_power = (required_power_kW * 60000) / (spindle.max_torque_Nm * 2 * Math.PI);
    }

    // Combine constraints
    const rpm_low = Math.max(min_rpm_from_vc, min_rpm_power);
    const rpm_high = max_rpm_torque;

    if (rpm_low > rpm_high) {
      return {
        feasible: false,
        rpm_range: [r0(rpm_low), r0(rpm_high)],
        optimal_rpm: 0,
        reason: `No feasible RPM range: min required ${r0(rpm_low)} > max allowed ${r0(rpm_high)}. ` +
          "Torque and power requirements conflict at this speed range.",
        warnings: ["Consider reducing DOC/ae to lower torque demand, or accept lower Vc"],
      };
    }

    // Optimal RPM: near base speed if in range, else midpoint weighted toward base speed
    let optimal_rpm: number;
    if (baseSpeed >= rpm_low && baseSpeed <= rpm_high) {
      optimal_rpm = baseSpeed; // max MRR point
    } else if (baseSpeed < rpm_low) {
      optimal_rpm = rpm_low; // constrained by Vc or power
    } else {
      optimal_rpm = rpm_high; // constrained by torque
    }

    if (rpm_high - rpm_low < 200) {
      warnings.push("Very narrow feasible RPM range — small changes in conditions may exceed limits");
    }

    return {
      feasible: true,
      rpm_range: [r0(rpm_low), r0(rpm_high)],
      optimal_rpm: r0(optimal_rpm),
      reason: `Feasible RPM range: ${r0(rpm_low)}–${r0(rpm_high)}. ` +
        `Optimal at ${r0(optimal_rpm)} RPM (${baseSpeed >= rpm_low && baseSpeed <= rpm_high ? "base speed = max MRR" : "boundary of feasible range"}).`,
      warnings,
    };
  }

  // ── Legacy calculate() method (backward compat) ─────────────────

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
    const baseSpeed = input.base_speed_rpm
      ?? (maxPower * 1000 * 60) / (2 * Math.PI * maxTorque);

    // Available torque at operating RPM
    let availTorque: number;
    let region: string;
    if (opRpm <= baseSpeed) {
      availTorque = maxTorque;
      region = "constant_torque";
    } else if (opRpm <= maxRpm) {
      // Constant power: T = P / ω — clamped to the rated T_max, which the motor can
      // never exceed. Below the true corner speed the hyperbola would overstate
      // torque and green-light a stalling cut. (Fix: was unclamped.)
      availTorque = Math.min(maxTorque, (maxPower * 1000 * 60) / (2 * Math.PI * opRpm));
      region = "constant_power";
    } else {
      // Field weakening: P falls as 1/n ⇒ T falls as 1/n² to keep P = T·ω.
      const ratio = maxRpm / opRpm;
      availTorque = ((maxPower * 1000 * 60) / (2 * Math.PI * maxRpm)) * ratio * ratio;
      region = "field_weakening";
    }

    // Available power at operating RPM
    let availPower: number;
    if (opRpm <= baseSpeed) {
      availPower = (maxTorque * 2 * Math.PI * opRpm) / (60 * 1000);
    } else if (opRpm <= maxRpm) {
      // Consistent with the (possibly torque-clamped) available torque: below the
      // true corner speed the deliverable power is T_max·ω, not the full P_max.
      availPower = Math.min(maxPower, (maxTorque * 2 * Math.PI * opRpm) / (60 * 1000));
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

    const optimalMrrRpm = baseSpeed;
    const continuousRating = maxPower * 0.75;

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

  // ── Curve-based lookup (uses machine-torque-curves.ts data) ──────

  /**
   * Get available torque and power at a specific RPM using pre-computed
   * torque curve data from machine-torque-curves.ts.
   *
   * This method interpolates between curve data points rather than using
   * the two-region analytical model. Use this when real curve data is
   * available (HSMAdvisor, manufacturer specs, or computed curves).
   *
   * Falls back to the analytical model (availableAt) if no curve data
   * is provided.
   */
  getAvailableFromCurve(
    rpm: number,
    curvePoints: Array<{ rpm: number; torque_Nm: number; power_kW: number }>,
    baseSpeedRpm: number,
  ): { torque_Nm: number; power_kW: number; region: string } {
    if (!curvePoints || curvePoints.length === 0) {
      return { torque_Nm: 0, power_kW: 0, region: "no_data" };
    }

    if (rpm <= 0) {
      return { torque_Nm: curvePoints[0].torque_Nm, power_kW: 0, region: "stall" };
    }

    const pts = curvePoints;

    // Below first data point — constant torque
    if (rpm <= pts[0].rpm) {
      return { torque_Nm: pts[0].torque_Nm, power_kW: pts[0].power_kW, region: "constant_torque" };
    }

    // Beyond last data point — field weakening
    if (rpm >= pts[pts.length - 1].rpm) {
      const last = pts[pts.length - 1];
      const ratio = last.rpm / rpm;
      return {
        torque_Nm: r2(last.torque_Nm * ratio),
        power_kW: r2(last.power_kW * ratio),
        region: "field_weakening",
      };
    }

    // Linear interpolation between bounding points
    for (let i = 0; i < pts.length - 1; i++) {
      if (rpm >= pts[i].rpm && rpm <= pts[i + 1].rpm) {
        const span = pts[i + 1].rpm - pts[i].rpm;
        const frac = span > 0 ? (rpm - pts[i].rpm) / span : 0;
        const torque = pts[i].torque_Nm + frac * (pts[i + 1].torque_Nm - pts[i].torque_Nm);
        const power = pts[i].power_kW + frac * (pts[i + 1].power_kW - pts[i].power_kW);
        const region = rpm <= baseSpeedRpm ? "constant_torque" : "constant_power";
        return { torque_Nm: r2(torque), power_kW: r2(power), region };
      }
    }

    return { torque_Nm: 0, power_kW: 0, region: "error" };
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
function r3(n: number): number { return Math.round(n * 1000) / 1000; }

export const spindleTorqueCurveEngine = new SpindleTorqueCurveEngine();
