/**
 * AxisCompensationEngine — Machine Axis Compensation Calculator
 *
 * Calculates axis compensation values:
 * - Thermal growth compensation per axis
 * - Backlash compensation values
 * - Leadscrew pitch error compensation table
 * - Thermal time constants for warmup
 * - Compensation update intervals
 *
 * Key physics: Machine tools grow thermally at ~10-12μm/m/°C
 * for steel structures. Spindle growth is mainly axial (Z).
 * Backlash is mechanical play in the drivetrain, typically
 * 2-10μm for ballscrews. Pitch error compounds over travel
 * length. Modern machines use glass scales for closed-loop
 * compensation.
 *
 * Reference: ISO 230-3 (Thermal effects on machines),
 *            ISO 230-2 (Positioning accuracy),
 *            Machinery's Handbook Ch.35 (Machine Tools)
 *
 * Actions: axis_compensation_calc
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export interface AxisCompensationInput {
  axis: "X" | "Y" | "Z";
  travel_mm: number;
  temperature_rise_c?: number;
  ambient_temp_c?: number;
  machine_type?: "vmc" | "hmc" | "lathe" | "5axis";
  has_glass_scale?: boolean;
  measured_backlash_mm?: number;
  screw_pitch_mm?: number;
  screw_class?: "C3" | "C5" | "C7" | "C10";
}

export interface AxisCompensationResult {
  thermal_growth: AtomicValue;
  backlash_compensation: AtomicValue;
  pitch_error_per_300mm: AtomicValue;
  total_error_budget: AtomicValue;
  warmup_time: AtomicValue;
  compensation_interval: AtomicValue;
  scale_feedback: AtomicValue;
  achievable_accuracy: AtomicValue;
  warnings: string[];
}

// ── Reference Data ────────────────────────────────────────────────

/** Ballscrew accuracy class (μm per 300mm) */
const SCREW_ACCURACY: Record<string, number> = {
  C3: 8,
  C5: 18,
  C7: 50,
  C10: 210,
};

/** Typical backlash by machine type (mm) */
const TYPICAL_BACKLASH: Record<string, number> = {
  vmc: 0.005,
  hmc: 0.004,
  lathe: 0.006,
  "5axis": 0.003,
};

/** Thermal time constant (minutes to 63% of final growth) */
const THERMAL_TAU: Record<string, number> = {
  vmc: 45,
  hmc: 40,
  lathe: 35,
  "5axis": 50,
};

// ── Engine ─────────────────────────────────────────────────────────

export class AxisCompensationEngine {
  calculate(input: AxisCompensationInput): AxisCompensationResult {
    const warnings: string[] = [];
    const axis = input.axis;
    const travel = input.travel_mm;
    const dT = input.temperature_rise_c ?? 3;
    const machType = input.machine_type ?? "vmc";
    const hasScale = input.has_glass_scale ?? false;
    const screwClass = input.screw_class ?? "C5";
    const screwPitch = input.screw_pitch_mm ?? 10;

    // CTE of machine structure (steel ≈ 12 μm/m/°C)
    const cte = 12; // μm/m/°C

    // Thermal growth: ΔL = CTE × L × ΔT
    const thermalGrowth = cte * 1e-6 * (travel / 1000)
      * dT * 1000; // result in mm

    // Z-axis gets extra spindle growth
    const spindleGrowth = axis === "Z" ? dT * 0.005 : 0;
    const totalThermal = thermalGrowth + spindleGrowth;

    // Backlash
    const backlash = input.measured_backlash_mm
      ?? TYPICAL_BACKLASH[machType] ?? 0.005;

    // Pitch error per 300mm
    const pitchError = SCREW_ACCURACY[screwClass] ?? 18;
    const pitchErrorMm = pitchError / 1000;
    // Scale over full travel
    const pitchErrorTotal = pitchErrorMm * (travel / 300);

    // Total error budget (worst case sum)
    const totalError = totalThermal + backlash + pitchErrorTotal;

    // Scale feedback reduces errors
    const scaleReduction = hasScale ? 0.1 : 1.0; // 90% reduction
    const scaledError = totalError * scaleReduction;

    // Warmup time (3× time constant for 95% steady state)
    const tau = THERMAL_TAU[machType] ?? 45;
    const warmupTime = tau * 3;

    // Compensation update interval
    const compInterval = hasScale ? 0 : 30; // minutes (0 = continuous)

    // Achievable accuracy after compensation
    const achievable = hasScale
      ? Math.max(0.002, scaledError)
      : Math.max(0.005, totalError * 0.3);

    // Warnings
    if (totalThermal > 0.02) {
      warnings.push(
        `Thermal growth ${r4(totalThermal)}mm on ${axis} — ` +
        "run warmup cycle before precision work"
      );
    }
    if (backlash > 0.010) {
      warnings.push(
        `Backlash ${r4(backlash)}mm is high — ` +
        "check ballscrew preload and gibs"
      );
    }
    if (screwClass === "C7" || screwClass === "C10") {
      warnings.push(
        `${screwClass} screw — consider glass scale for ` +
        "positioning accuracy"
      );
    }
    if (!hasScale && travel > 500) {
      warnings.push(
        "Long travel without scale feedback — " +
        "pitch error accumulates over distance"
      );
    }
    if (axis === "Z" && dT > 5) {
      warnings.push(
        "Significant Z-axis thermal growth from spindle — " +
        "use spindle chiller"
      );
    }

    return {
      thermal_growth: av(r4(totalThermal), "mm", 0.002,
        axis === "Z"
          ? `Structure ${r4(thermalGrowth)} + spindle ${r4(spindleGrowth)}`
          : `CTE × ${travel}mm × ${dT}°C`),
      backlash_compensation: av(r4(backlash), "mm", 0.001,
        input.measured_backlash_mm
          ? "Measured value"
          : `${machType} typical`),
      pitch_error_per_300mm: av(pitchError, "μm", 0,
        `${screwClass} class ballscrew`),
      total_error_budget: av(r4(totalError), "mm", 0.005,
        "Thermal + backlash + pitch error"),
      warmup_time: av(warmupTime, "min", 5,
        `3×τ (${tau}min) for 95% stability`),
      compensation_interval: av(compInterval, "min", 0,
        hasScale
          ? "Continuous — scale feedback"
          : "Periodic re-measurement needed"),
      scale_feedback: av(scaleReduction, "factor", 0,
        hasScale
          ? "Glass scale: 90% error reduction"
          : "No scale — open-loop only"),
      achievable_accuracy: av(r4(achievable), "mm", 0.001,
        hasScale
          ? "With scale compensation"
          : "With periodic comp table"),
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

function r4(n: number): number { return Math.round(n * 10000) / 10000; }

export const axisCompensationEngine = new AxisCompensationEngine();
