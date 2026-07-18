/**
 * MachineWarmupEngine — Machine Tool Warmup Schedule Calculator
 *
 * Calculates optimal warmup procedure:
 * - Spindle warmup RPM steps and duration
 * - Axis exercise distances and speeds
 * - Thermal stabilization time estimation
 * - Positioning accuracy vs warmup time
 * - Environmental compensation window
 * - First-part risk assessment
 *
 * Key physics: Machine thermal equilibrium follows exponential
 * curve: ΔT(t) = ΔT_final × (1 - e^(-t/τ)) where τ is the
 * thermal time constant (typically 30-90 min for spindle,
 * 60-180 min for structure). Spindle growth follows similar
 * curve with τ_spindle ≈ 20-40 min.
 *
 * Reference: ISO 230-3 (thermal effects on machine tools),
 *            Bryan's thermal error principles,
 *            DMG MORI warmup recommendations
 *
 * Actions: machine_warmup_calc
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export interface MachineWarmupInput {
  max_spindle_rpm?: number;
  spindle_type?: "belt" | "gear" | "direct" | "integral";
  ambient_temp_c?: number;
  ambient_change_c_hr?: number;
  machine_class?: "standard" | "precision" | "ultraprecision";
  idle_hours?: number;
  required_accuracy_mm?: number;
  axes?: number;
  has_linear_scale?: boolean;
  has_spindle_chiller?: boolean;
}

export interface MachineWarmupResult {
  spindle_warmup_time: AtomicValue;
  axis_warmup_time: AtomicValue;
  total_warmup_time: AtomicValue;
  spindle_steps: AtomicValue;
  thermal_stability_pct: AtomicValue;
  first_part_risk: AtomicValue;
  expected_drift_mm: AtomicValue;
  recheck_interval: AtomicValue;
  energy_cost: AtomicValue;
  skip_ok: AtomicValue;
  warnings: string[];
}

// ── Reference Data ────────────────────────────────────────────────

/** Thermal time constants (minutes) by machine class */
const TAU_SPINDLE: Record<string, number> = {
  standard: 30,
  precision: 25,
  ultraprecision: 20,
};

const TAU_STRUCTURE: Record<string, number> = {
  standard: 90,
  precision: 120,
  ultraprecision: 180,
};

/** Max thermal drift (mm) by machine class after cold start */
const MAX_DRIFT: Record<string, number> = {
  standard: 0.050,
  precision: 0.020,
  ultraprecision: 0.005,
};

// ── Engine ─────────────────────────────────────────────────────────

export class MachineWarmupEngine {
  calculate(input: MachineWarmupInput): MachineWarmupResult {
    const warnings: string[] = [];
    const maxRpm = input.max_spindle_rpm ?? 10000;
    const sType = input.spindle_type ?? "belt";
    const ambient = input.ambient_temp_c ?? 22;
    const ambientChange = input.ambient_change_c_hr ?? 1;
    const mClass = input.machine_class ?? "standard";
    const idleHrs = input.idle_hours ?? 12;
    const reqAcc = input.required_accuracy_mm ?? 0.025;
    const nAxes = input.axes ?? 3;
    const hasScale = input.has_linear_scale ?? false;
    const hasChiller = input.has_spindle_chiller ?? false;

    const tauSpindle = TAU_SPINDLE[mClass] ?? 30;
    const tauStruct = TAU_STRUCTURE[mClass] ?? 90;
    const maxDrift = MAX_DRIFT[mClass] ?? 0.050;

    // Spindle warmup time depends on idle time and accuracy needed
    // More idle = more warmup needed
    const coldFactor = Math.min(idleHrs / 8, 1.5); // up to 1.5x for long idle
    const chillerFactor = hasChiller ? 0.6 : 1.0;

    // Time to reach target accuracy
    // drift(t) = maxDrift × e^(-t/τ), solve for drift = reqAcc
    // t = -τ × ln(reqAcc/maxDrift)
    let spindleWarmup: number;
    if (reqAcc >= maxDrift) {
      spindleWarmup = 0; // already within tolerance
    } else {
      spindleWarmup = -tauSpindle * Math.log(reqAcc / maxDrift)
        * coldFactor * chillerFactor;
    }
    spindleWarmup = Math.max(spindleWarmup, 5); // minimum 5 min

    // Axis warmup
    const scaleFactor = hasScale ? 0.7 : 1.0;
    let axisWarmup: number;
    if (reqAcc >= maxDrift) {
      axisWarmup = 5;
    } else {
      axisWarmup = -tauStruct * Math.log(reqAcc / maxDrift)
        * coldFactor * scaleFactor * 0.3; // axes warm faster with motion
    }
    axisWarmup = Math.max(axisWarmup, 5) * (nAxes / 3);

    const totalWarmup = Math.max(spindleWarmup, axisWarmup);

    // Spindle warmup steps (ramp up in 3-5 steps)
    const nSteps = maxRpm > 15000 ? 5
      : maxRpm > 8000 ? 4 : 3;

    // Thermal stability after warmup (%)
    const stability = (1 - Math.exp(-totalWarmup / tauSpindle)) * 100;

    // Expected drift during first part (residual)
    const expectedDrift = maxDrift *
      Math.exp(-totalWarmup / tauSpindle) * coldFactor;

    // First part risk
    let firstPartRisk: number;
    if (expectedDrift < reqAcc * 0.5) firstPartRisk = 10;
    else if (expectedDrift < reqAcc) firstPartRisk = 30;
    else if (expectedDrift < reqAcc * 2) firstPartRisk = 60;
    else firstPartRisk = 90;

    // Recheck interval (when to re-measure)
    const recheckMin = ambientChange > 2
      ? 30 : ambientChange > 1
      ? 60 : 120;

    // Energy cost estimate (kW during warmup)
    const spindlePower = maxRpm > 15000 ? 15 : maxRpm > 8000 ? 10 : 7;
    const energyCost = (spindlePower * totalWarmup / 60) * 0.12; // $0.12/kWh

    // Can we skip warmup?
    const skipOk = idleHrs < 2 && reqAcc > 0.030;

    // Warnings
    if (idleHrs > 48) {
      warnings.push(
        `Machine idle ${idleHrs}h — extended warmup needed, ` +
        "run full program with sacrificial part first"
      );
    }
    if (ambient < 18 || ambient > 26) {
      warnings.push(
        `Ambient ${ambient}°C outside 20±2°C — ` +
        "thermal compensation less predictable"
      );
    }
    if (ambientChange > 3) {
      warnings.push(
        `Ambient changing ${ambientChange}°C/hr — ` +
        "frequent re-zeroing needed"
      );
    }
    if (firstPartRisk > 50) {
      warnings.push(
        "First part scrap risk is high — " +
        "measure first part before running batch"
      );
    }
    if (mClass === "ultraprecision" && !hasChiller) {
      warnings.push(
        "Ultraprecision machine without spindle chiller — " +
        "thermal drift will be significant"
      );
    }
    if (spindleWarmup > 30) {
      warnings.push(
        `Spindle warmup ${r0(spindleWarmup)}min — ` +
        "consider spindle chiller to reduce time"
      );
    }

    return {
      spindle_warmup_time: av(r0(spindleWarmup), "min", 2,
        `τ=${tauSpindle}min, drift target ${reqAcc}mm`),
      axis_warmup_time: av(r0(axisWarmup), "min", 2,
        `${nAxes} axes, ${hasScale ? "with" : "no"} scale`),
      total_warmup_time: av(r0(totalWarmup), "min", 3,
        "max(spindle, axis) warmup"),
      spindle_steps: av(nSteps, "steps", 0,
        `Ramp to ${maxRpm} RPM in ${nSteps} steps`),
      thermal_stability_pct: av(r1(stability), "%", 2,
        `1 - e^(-t/${tauSpindle})`),
      first_part_risk: av(firstPartRisk, "%", 5,
        `Drift ${r4(expectedDrift)}mm vs tol ${reqAcc}mm`),
      expected_drift_mm: av(r4(expectedDrift), "mm", 0.005,
        "Residual drift after warmup"),
      recheck_interval: av(recheckMin, "min", 10,
        `Ambient changing ${ambientChange}°C/hr`),
      energy_cost: av(r2(energyCost), "$", 0.05,
        `${spindlePower}kW × ${r0(totalWarmup)}min`),
      skip_ok: av(skipOk ? 1 : 0,
        skipOk ? "OK_TO_SKIP" : "WARMUP_NEEDED", 0,
        `Idle ${idleHrs}h, accuracy ${reqAcc}mm`),
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
function r4(n: number): number { return Math.round(n * 10000) / 10000; }

export const machineWarmupEngine = new MachineWarmupEngine();
