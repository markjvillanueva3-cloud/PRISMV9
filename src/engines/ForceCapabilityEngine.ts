/**
 * ForceCapabilityEngine — Machine force/power/torque feasibility for operation sequences
 *
 * Checks whether the machine has sufficient power, torque, and force handling
 * capability for each operation, accounting for cumulative thermal growth and
 * tool wear impact on cutting forces.
 *
 * Models: Kienzle cutting force, spindle power/torque, cantilever deflection,
 *         linear thermal growth, Taylor-based wear force amplification,
 *         clamp force safety factor with friction coefficient
 * References: Altintas (2012) Ch.2-3, ISO 3002, Kienzle (1952), Taylor (1907)
 * Safety: Prevents spindle overload, workpiece pull-out, excessive deflection
 */

// ─── Types ─────────────────────────────────────────────────────────

export interface AtomicValue<T> {
  value: T;
  confidence: number;
  source: string;
}

export interface MachineCapability {
  max_power_kw: number;
  max_torque_Nm: number;
  max_rpm: number;
  max_thrust_N?: number;
  spindle_taper?: string;
  rigidity?: "low" | "medium" | "high";
}

export interface OperationForceInput {
  id: string;
  type: string;
  tool_diameter_mm: number;
  flutes: number;
  depth_mm: number;
  width_mm?: number;
  cutting_speed_mpm: number;
  feed_per_tooth_mm: number;
  material_kc1_1: number;
  material_mc: number;
  tool_stickout_mm?: number;
  clamp_force_N?: number;
  elapsed_cutting_time_min?: number;
  tool_life_min?: number;
}

export interface ForceCapabilityResult {
  feasible: boolean;
  checks: ForceCheck[];
  total_power_utilization_pct: number;
  total_torque_utilization_pct: number;
  thermal_growth_um: number;
  wear_force_increase_pct: number;
  limiting_operation: string | null;
  recommendations: string[];
}

export interface ForceCheck {
  operation_id: string;
  cutting_force_N: number;
  power_kw: number;
  torque_Nm: number;
  power_utilization_pct: number;
  torque_utilization_pct: number;
  deflection_um: number;
  clamp_safety_factor: number;
  thermal_growth_um: number;
  wear_factor: number;
  feasible: boolean;
  limiting_factor: string | null;
}

// ─── Constants ─────────────────────────────────────────────────────

/** Young's modulus for cemented carbide (Pa) */
const E_CARBIDE_PA = 600e9;

/** Coefficient of thermal expansion for steel (µm/m/°C) */
const ALPHA_STEEL = 11.7;

/** Temperature rise rate during cutting (°C per minute of cutting) */
const THERMAL_RATE_C_PER_MIN = 2.0;

/** Representative workpiece length for thermal growth calculation (mm) */
const THERMAL_LENGTH_MM = 300;

/** Friction coefficient for vise clamping */
const MU_VISE = 0.15;

/** Maximum acceptable deflection (µm) before warning */
const MAX_DEFLECTION_UM = 50;

/** Maximum acceptable power utilization (%) */
const MAX_POWER_UTIL_PCT = 90;

/** Maximum acceptable torque utilization (%) */
const MAX_TORQUE_UTIL_PCT = 90;

/** Minimum acceptable clamp safety factor */
const MIN_CLAMP_SF = 2.0;

/** Default tool stickout (mm) when not specified */
const DEFAULT_STICKOUT_MM = 50;

/** Default tool life (min) when not specified */
const DEFAULT_TOOL_LIFE_MIN = 60;

// ─── Engine ────────────────────────────────────────────────────────

export class ForceCapabilityEngine {
  /**
   * Check a full operation sequence for force/power/torque feasibility.
   * Accumulates thermal growth across operations.
   */
  checkSequence(
    machine: MachineCapability,
    operations: OperationForceInput[]
  ): AtomicValue<ForceCapabilityResult> {
    const checks: ForceCheck[] = [];
    const recommendations: string[] = [];
    let cumulativeThermalMinutes = 0;
    let maxPowerUtil = 0;
    let maxTorqueUtil = 0;
    let limitingOp: string | null = null;
    let overallFeasible = true;
    let maxWearIncrease = 0;

    for (const op of operations) {
      // Accumulate cutting time for thermal growth
      const elapsedMin = op.elapsed_cutting_time_min ?? 0;
      cumulativeThermalMinutes += elapsedMin;

      const check = this._evaluateOperation(machine, op, cumulativeThermalMinutes);
      checks.push(check);

      if (check.power_utilization_pct > maxPowerUtil) {
        maxPowerUtil = check.power_utilization_pct;
      }
      if (check.torque_utilization_pct > maxTorqueUtil) {
        maxTorqueUtil = check.torque_utilization_pct;
      }

      const wearIncreasePct = (check.wear_factor - 1) * 100;
      if (wearIncreasePct > maxWearIncrease) {
        maxWearIncrease = wearIncreasePct;
      }

      if (!check.feasible) {
        overallFeasible = false;
        if (!limitingOp) {
          limitingOp = check.operation_id;
        }
      }
    }

    // Generate recommendations
    this._generateRecommendations(checks, machine, recommendations);

    const thermalGrowth = this._thermalGrowth(cumulativeThermalMinutes);

    const result: ForceCapabilityResult = {
      feasible: overallFeasible,
      checks,
      total_power_utilization_pct: maxPowerUtil,
      total_torque_utilization_pct: maxTorqueUtil,
      thermal_growth_um: thermalGrowth,
      wear_force_increase_pct: maxWearIncrease,
      limiting_operation: limitingOp,
      recommendations,
    };

    return {
      value: result,
      confidence: 0.85,
      source: "ForceCapabilityEngine.checkSequence (Kienzle+Taylor+thermal)",
    };
  }

  /**
   * Check a single operation for force/power/torque feasibility.
   */
  checkSingleOperation(
    machine: MachineCapability,
    op: OperationForceInput
  ): AtomicValue<ForceCheck> {
    const elapsedMin = op.elapsed_cutting_time_min ?? 0;
    const check = this._evaluateOperation(machine, op, elapsedMin);

    return {
      value: check,
      confidence: 0.85,
      source: "ForceCapabilityEngine.checkSingleOperation (Kienzle+Taylor)",
    };
  }

  // ─── Internal Methods ──────────────────────────────────────────

  /**
   * Evaluate a single operation against machine capability.
   * @param cumulativeThermalMin - total cutting minutes up to and including this op (for thermal growth)
   */
  private _evaluateOperation(
    machine: MachineCapability,
    op: OperationForceInput,
    cumulativeThermalMin: number
  ): ForceCheck {
    // Kienzle cutting force: Fc = kc1.1 × ap × fz^(1-mc)
    const ap = op.depth_mm;
    const fz = op.feed_per_tooth_mm;
    const kc1_1 = op.material_kc1_1;
    const mc = op.material_mc;

    const Fc_fresh = kc1_1 * ap * Math.pow(fz, 1 - mc);

    // Wear factor: F_worn = F_fresh × (1 + 0.3 × (t/T)^0.5)
    const elapsedMin = op.elapsed_cutting_time_min ?? 0;
    const toolLifeMin = op.tool_life_min ?? DEFAULT_TOOL_LIFE_MIN;
    const lifeRatio = Math.min(elapsedMin / toolLifeMin, 1.0);
    const wearFactor = 1 + 0.3 * Math.sqrt(lifeRatio);
    const Fc = Fc_fresh * wearFactor;

    // Spindle RPM from cutting speed: n = (1000 × Vc) / (π × D)
    const D = op.tool_diameter_mm;
    const rpm = (1000 * op.cutting_speed_mpm) / (Math.PI * D);

    // Power: P = Fc × Vc / 60000 (kW)
    const power_kw = (Fc * op.cutting_speed_mpm) / 60000;

    // Torque: T = Fc × D / 2000 (Nm)
    const torque_Nm = (Fc * D) / 2000;

    // Utilization
    const powerUtil = (power_kw / machine.max_power_kw) * 100;
    const torqueUtil = (torque_Nm / machine.max_torque_Nm) * 100;

    // Deflection: δ = F × L³ / (3 × E × I), I = π×d⁴/64
    const stickout = op.tool_stickout_mm ?? DEFAULT_STICKOUT_MM;
    const L = stickout / 1000; // convert to meters
    const d = D / 1000; // convert to meters
    const I = (Math.PI * Math.pow(d, 4)) / 64;
    const deflection_m = (Fc * Math.pow(L, 3)) / (3 * E_CARBIDE_PA * I);
    const deflection_um = deflection_m * 1e6;

    // Thermal growth
    const thermalGrowth = this._thermalGrowth(cumulativeThermalMin);

    // Clamp safety factor: SF = F_clamp / (F_cut / μ)
    // Rearranged: the clamp must resist F_cut; friction assists, so SF = F_clamp × μ / F_cut
    // More commonly: SF = F_clamp / (F_cut × safety_factor_geometry)
    // Using: SF = F_clamp × μ / F_cut  (friction-based clamping model)
    let clampSF = Infinity;
    if (op.clamp_force_N !== undefined && op.clamp_force_N > 0) {
      clampSF = (op.clamp_force_N * MU_VISE) / Fc;
    }

    // Feed force (thrust) — approximate as 0.5 × Fc for milling
    const feedForce = Fc * 0.5;

    // Determine feasibility and limiting factor
    let feasible = true;
    let limitingFactor: string | null = null;

    if (powerUtil > 100) {
      feasible = false;
      limitingFactor = "power";
    } else if (torqueUtil > 100) {
      feasible = false;
      limitingFactor = "torque";
    } else if (clampSF < 1.0) {
      feasible = false;
      limitingFactor = "clamping";
    } else if (machine.max_thrust_N !== undefined && feedForce > machine.max_thrust_N) {
      feasible = false;
      limitingFactor = "axis_thrust";
    } else if (deflection_um > MAX_DEFLECTION_UM) {
      // Deflection is a warning but can be limiting for precision work
      if (deflection_um > MAX_DEFLECTION_UM * 4) {
        feasible = false;
        limitingFactor = "deflection";
      } else {
        limitingFactor = "deflection_warning";
      }
    } else if (powerUtil > MAX_POWER_UTIL_PCT) {
      limitingFactor = "power_near_limit";
    } else if (torqueUtil > MAX_TORQUE_UTIL_PCT) {
      limitingFactor = "torque_near_limit";
    } else if (clampSF < MIN_CLAMP_SF) {
      limitingFactor = "clamping_marginal";
    }

    return {
      operation_id: op.id,
      cutting_force_N: Fc,
      power_kw,
      torque_Nm: torque_Nm,
      power_utilization_pct: powerUtil,
      torque_utilization_pct: torqueUtil,
      deflection_um,
      clamp_safety_factor: clampSF === Infinity ? 999 : clampSF,
      thermal_growth_um: thermalGrowth,
      wear_factor: wearFactor,
      feasible,
      limiting_factor: limitingFactor,
    };
  }

  /**
   * Calculate thermal growth in µm from cumulative cutting minutes.
   * ΔL = α × ΔT × L, where ΔT accumulates at THERMAL_RATE_C_PER_MIN
   */
  private _thermalGrowth(cumulativeMinutes: number): number {
    const deltaT = cumulativeMinutes * THERMAL_RATE_C_PER_MIN;
    // α in µm/m/°C, L in mm → convert L to m
    const L_m = THERMAL_LENGTH_MM / 1000;
    return ALPHA_STEEL * deltaT * L_m;
  }

  /**
   * Generate actionable recommendations from check results.
   */
  private _generateRecommendations(
    checks: ForceCheck[],
    machine: MachineCapability,
    recommendations: string[]
  ): void {
    for (const check of checks) {
      if (check.power_utilization_pct > 100) {
        recommendations.push(
          `Op ${check.operation_id}: Power exceeded (${check.power_utilization_pct.toFixed(1)}%). ` +
          `Reduce depth of cut or cutting speed.`
        );
      } else if (check.power_utilization_pct > MAX_POWER_UTIL_PCT) {
        recommendations.push(
          `Op ${check.operation_id}: Power near limit (${check.power_utilization_pct.toFixed(1)}%). ` +
          `Consider reducing parameters for safety margin.`
        );
      }

      if (check.torque_utilization_pct > 100) {
        recommendations.push(
          `Op ${check.operation_id}: Torque exceeded (${check.torque_utilization_pct.toFixed(1)}%). ` +
          `Increase RPM or reduce depth/feed.`
        );
      }

      if (check.limiting_factor === "deflection" || check.limiting_factor === "deflection_warning") {
        recommendations.push(
          `Op ${check.operation_id}: Tool deflection ${check.deflection_um.toFixed(1)}µm. ` +
          `Use shorter stickout or larger diameter tool.`
        );
      }

      if (check.clamp_safety_factor < MIN_CLAMP_SF && check.clamp_safety_factor < 999) {
        recommendations.push(
          `Op ${check.operation_id}: Clamp safety factor ${check.clamp_safety_factor.toFixed(2)} ` +
          `below minimum ${MIN_CLAMP_SF}. Increase clamping force or reduce cutting forces.`
        );
      }

      if (check.limiting_factor === "axis_thrust") {
        recommendations.push(
          `Op ${check.operation_id}: Feed force exceeds axis thrust limit. Reduce feed rate.`
        );
      }

      if (check.wear_factor > 1.2) {
        recommendations.push(
          `Op ${check.operation_id}: Tool wear increasing forces by ${((check.wear_factor - 1) * 100).toFixed(1)}%. ` +
          `Consider tool change.`
        );
      }

      if (check.thermal_growth_um > 20) {
        recommendations.push(
          `Op ${check.operation_id}: Thermal growth ${check.thermal_growth_um.toFixed(1)}µm. ` +
          `Allow thermal stabilization or apply compensation.`
        );
      }
    }
  }
}

// ─── Singleton ─────────────────────────────────────────────────────

export const forceCapabilityEngine = new ForceCapabilityEngine();
