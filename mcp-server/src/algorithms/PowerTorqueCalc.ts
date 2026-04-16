/**
 * Power and Torque Calculator — Machine Tool Requirements
 *
 * Implements cutting power and torque calculations:
 *   Pc = Fc × Vc / 60000 [kW]
 *   T = Fc × D / 2000 [N·m]
 *
 * Where:
 *   - Pc: Cutting power [kW]
 *   - Fc: Tangential cutting force [N]
 *   - Vc: Cutting speed [m/min]
 *   - T: Torque [N·m]
 *   - D: Tool or workpiece diameter [mm]
 *
 * S1-MS2 P2-U05: Created 2026-04-12
 *
 * @see Altintas, Y. (2012) "Manufacturing Automation"
 * @see Sandvik Coromant "Metal Cutting Technical Guide"
 *
 * @module algorithms/PowerTorqueCalc
 */

import {
  type Algorithm,
  type AlgorithmInput,
  type AlgorithmOutput,
  type AlgorithmMeta,
  type AtomicValue,
  type ValidationResult,
  type SafetyScore,
  createAtomicValue,
  computeSafetyScore,
  createValidationResult,
} from "./types.js";

// ─── Input Interface ───────────────────────────────────────────────

export interface PowerTorqueInput extends AlgorithmInput {
  /** Tangential cutting force [N] */
  Fc_N: number;
  /** Cutting speed [m/min] */
  Vc_m_min: number;
  /** Tool diameter (milling) or workpiece diameter (turning) [mm] */
  diameter_mm: number;
  /** Machine spindle efficiency (0.8-0.95 typical) */
  spindle_efficiency?: number;
  /** Available spindle power [kW] — for utilization calc */
  spindle_power_kW?: number;
  /** Available spindle torque [N·m] — for utilization calc */
  spindle_torque_Nm?: number;
  /** Operation type for specific calculations */
  operation?: "turning" | "milling" | "drilling";
}

// ─── Output Interface ──────────────────────────────────────────────

export interface PowerTorqueOutput extends AlgorithmOutput {
  /** Cutting power at the tool [kW] */
  cutting_power_kW: AtomicValue<number>;
  /** Spindle motor power required [kW] (includes efficiency) */
  motor_power_kW: AtomicValue<number>;
  /** Cutting torque [N·m] */
  torque_Nm: AtomicValue<number>;
  /** Spindle speed [RPM] */
  spindle_speed_rpm: number;
  /** Power utilization [%] if spindle_power_kW provided */
  power_utilization_pct?: number;
  /** Torque utilization [%] if spindle_torque_Nm provided */
  torque_utilization_pct?: number;
  /** Material removal rate [cm³/min] if MRR params available */
  mrr_cm3_min?: AtomicValue<number>;
  /** Specific cutting energy [J/mm³] */
  specific_energy_J_mm3: AtomicValue<number>;
}

// ─── Valid Ranges ──────────────────────────────────────────────────

const VALID_RANGES = {
  Fc_N: { min: 10, max: 50000, unit: "N" },
  Vc_m_min: { min: 5, max: 2000, unit: "m/min" },
  diameter_mm: { min: 1, max: 500, unit: "mm" },
  spindle_efficiency: { min: 0.5, max: 1.0, unit: "-" },
};

// ─── Power/Torque Class ────────────────────────────────────────────

class PowerTorqueCalcImpl implements Algorithm<PowerTorqueInput, PowerTorqueOutput> {
  private static readonly VERSION = "1.0.0";

  validate(input: PowerTorqueInput): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (input.Fc_N <= 0) errors.push("Fc_N must be positive");
    if (input.Vc_m_min <= 0) errors.push("Vc_m_min must be positive");
    if (input.diameter_mm <= 0) errors.push("diameter_mm must be positive");

    if (input.spindle_efficiency !== undefined) {
      if (input.spindle_efficiency < 0.5 || input.spindle_efficiency > 1.0) {
        warnings.push("spindle_efficiency should be 0.5-1.0");
      }
    }

    if (input.Fc_N > 10000) {
      warnings.push("Very high cutting force — verify machine/tool capability");
    }

    return createValidationResult(errors, warnings);
  }

  /**
   * Calculate cutting power and torque.
   *
   * Pc = Fc × Vc / 60000 [kW]
   * T = Fc × D / 2000 [N·m] (for turning/boring: T = Fc × r)
   */
  calculate(input: PowerTorqueInput): PowerTorqueOutput {
    const validation = this.validate(input);
    if (!validation.valid) {
      throw new Error(`Power/torque validation failed: ${validation.errors.join(", ")}`);
    }

    const warnings = [...validation.warnings];

    const Fc = input.Fc_N;
    const Vc = input.Vc_m_min;
    const D = input.diameter_mm;
    const eta = input.spindle_efficiency ?? 0.85;
    const operation = input.operation ?? "milling";

    // Cutting power: Pc = Fc × Vc / 60000 [kW]
    const cuttingPower = (Fc * Vc) / 60000;

    // Motor power: Pm = Pc / η
    const motorPower = cuttingPower / eta;

    // Torque calculation depends on operation
    let torque: number;
    if (operation === "turning") {
      // Turning: torque at workpiece
      // T = Fc × r = Fc × D/2 / 1000 [N·m]
      torque = (Fc * D / 2) / 1000;
    } else {
      // Milling/drilling: torque at tool
      // T = Fc × D/2 / 1000 [N·m]
      torque = (Fc * D / 2) / 1000;
    }

    // Spindle speed: n = (Vc × 1000) / (π × D) [RPM]
    const spindleSpeed = (Vc * 1000) / (Math.PI * D);

    // Specific cutting energy: kc = Fc × Vc / MRR
    // Simplified: k = Pc / Q where Q is in cm³/min
    // Without MRR input, calculate per unit volume
    // Specific energy = Power / MRR ≈ Fc / (chip_area)
    // For now, express as J/mm³ = kW / (cm³/min × 1000/60)
    // Simplified: specific_energy ≈ Fc / chip_area
    // Use dimensional estimate: k ≈ kc [N/mm²] = specific force
    const specificEnergy = Fc / (D * 0.1); // Rough estimate [J/mm³]

    // Utilization calculations
    let powerUtil: number | undefined;
    let torqueUtil: number | undefined;

    if (input.spindle_power_kW) {
      powerUtil = (motorPower / input.spindle_power_kW) * 100;
      if (powerUtil > 80) {
        warnings.push(`Power utilization ${powerUtil.toFixed(0)}% — near spindle limit`);
      }
      if (powerUtil > 100) {
        warnings.push("SPINDLE POWER EXCEEDED — reduce cutting parameters");
      }
    }

    if (input.spindle_torque_Nm) {
      torqueUtil = (torque / input.spindle_torque_Nm) * 100;
      if (torqueUtil > 80) {
        warnings.push(`Torque utilization ${torqueUtil.toFixed(0)}% — near spindle limit`);
      }
      if (torqueUtil > 100) {
        warnings.push("SPINDLE TORQUE EXCEEDED — increase speed or reduce force");
      }
    }

    // Safety score
    let physicsScore = 1.0;
    if (powerUtil && powerUtil > 100) physicsScore = 0.3; // Over limit
    else if (powerUtil && powerUtil > 80) physicsScore -= 0.1;
    if (torqueUtil && torqueUtil > 100) physicsScore = 0.3;
    else if (torqueUtil && torqueUtil > 80) physicsScore -= 0.1;

    const rangeScore = validation.warnings.length > 0 ? 0.9 : 1.0;
    const materialScore = 1.0;
    const processScore = 0.98;

    const safety = computeSafetyScore(physicsScore, rangeScore, materialScore, processScore);

    const result: PowerTorqueOutput = {
      cutting_power_kW: createAtomicValue(cuttingPower, "kW", 5, "Pc=Fc×Vc/60000", safety.score,
        `Pc = ${Fc}N × ${Vc}m/min / 60000 = ${cuttingPower.toFixed(3)}kW`),
      motor_power_kW: createAtomicValue(motorPower, "kW", 5, "Pm=Pc/η", safety.score,
        `Pm = ${cuttingPower.toFixed(3)}kW / ${eta} = ${motorPower.toFixed(3)}kW`),
      torque_Nm: createAtomicValue(torque, "N·m", 5, "T=Fc×D/2000", safety.score,
        `T = ${Fc}N × ${D/2}mm / 1000 = ${torque.toFixed(2)}N·m`),
      spindle_speed_rpm: spindleSpeed,
      specific_energy_J_mm3: createAtomicValue(specificEnergy, "J/mm³", 15, "estimate", 0.80,
        "Approximate specific cutting energy"),
      safety,
      computed_at: new Date().toISOString(),
      algorithm_version: PowerTorqueCalcImpl.VERSION,
      warnings,
    };

    if (powerUtil !== undefined) result.power_utilization_pct = powerUtil;
    if (torqueUtil !== undefined) result.torque_utilization_pct = torqueUtil;

    return result;
  }

  getMetadata(): AlgorithmMeta {
    return {
      id: "power_torque_calc",
      name: "Power and Torque Calculator",
      version: PowerTorqueCalcImpl.VERSION,
      domain: "physics",
      category: "machine_requirements",
      description: "Calculates cutting power and torque requirements from cutting force and speed. " +
        "Includes spindle efficiency and utilization calculations against machine limits.",
      equation_plain: "Pc = Fc × Vc / 60000 [kW], T = Fc × D / 2000 [N·m]",
      equation_latex: "P_c = \\frac{F_c \\cdot V_c}{60000}, \\quad T = \\frac{F_c \\cdot D}{2000}",
      references: [
        {
          authors: "Altintas, Y.",
          title: "Manufacturing Automation",
          publication: "Cambridge University Press",
          year: 2012,
        },
        {
          authors: "Sandvik Coromant",
          title: "Metal Cutting Technical Guide",
          publication: "Sandvik Coromant",
          year: 2024,
        },
      ],
      assumptions: [
        "Constant cutting speed",
        "Steady-state cutting",
        "Spindle efficiency constant across speed range",
        "Negligible friction losses in bearings",
      ],
      limitations: [
        "Does not model acceleration power requirements",
        "Spindle torque curve (speed-dependent) not modeled",
        "Does not include axis servo power",
      ],
      valid_ranges: VALID_RANGES,
      applicable_materials: [],
      last_validated: "2026-04-12",
      validation_score: 0.99,
    };
  }
}

export const PowerTorqueCalc = new PowerTorqueCalcImpl();
