/**
 * PID Controller — Proportional-Integral-Derivative Control
 *
 * Discrete PID controller for real-time machining process regulation.
 * Supports anti-windup, derivative filtering, output clamping, and
 * auto-tuning via Ziegler-Nichols relay method.
 *
 * Manufacturing uses: feed rate control, spindle speed regulation,
 * temperature control, force-based adaptive machining.
 *
 * References:
 * - Åström, K.J. & Murray, R.M. (2008). "Feedback Systems"
 * - Ziegler, J.G. & Nichols, N.B. (1942). "Optimum Settings for Automatic Controllers"
 *
 * @module algorithms/PIDController
 */

import type {
  Algorithm, AlgorithmMeta, ValidationResult, ValidationIssue, WithWarnings,
} from "./types.js";

export interface PIDControllerInput {
  /** Setpoint (desired value). */
  setpoint: number;
  /** Process variable history (most recent measurements). */
  process_values: number[];
  /** Sample time [s]. Default 0.1. */
  dt?: number;
  /** Proportional gain. Default 1.0. */
  Kp?: number;
  /** Integral gain. Default 0.1. */
  Ki?: number;
  /** Derivative gain. Default 0.05. */
  Kd?: number;
  /** Output minimum. Default -100. */
  output_min?: number;
  /** Output maximum. Default 100. */
  output_max?: number;
  /** Anti-windup enabled. Default true. */
  anti_windup?: boolean;
  /** Derivative filter coefficient [0-1]. 0=no filter. Default 0.1. */
  derivative_filter?: number;
  /** Auto-tune mode: provide oscillation data for Ziegler-Nichols. */
  auto_tune?: { ultimate_gain: number; ultimate_period: number; controller_type?: "P" | "PI" | "PID" };
}

export interface PIDStep {
  time: number;
  setpoint: number;
  process_value: number;
  error: number;
  p_term: number;
  i_term: number;
  d_term: number;
  output: number;
}

export interface PIDControllerOutput extends WithWarnings {
  steps: PIDStep[];
  current_output: number;
  current_error: number;
  integral_sum: number;
  is_saturated: boolean;
  settling_time: number | null;
  overshoot_pct: number;
  steady_state_error: number;
  tuned_gains: { Kp: number; Ki: number; Kd: number } | null;
  calculation_method: string;
}

export class PIDController implements Algorithm<PIDControllerInput, PIDControllerOutput> {

  validate(input: PIDControllerInput): ValidationResult {
    const issues: ValidationIssue[] = [];
    if (input.setpoint === undefined) issues.push({ field: "setpoint", message: "Required", severity: "error" });
    if (!input.process_values?.length) issues.push({ field: "process_values", message: "At least 1 value required", severity: "error" });
    if ((input.dt ?? 0.1) <= 0) issues.push({ field: "dt", message: "Must be > 0", severity: "error" });
    if (input.auto_tune) {
      if (input.auto_tune.ultimate_gain <= 0) issues.push({ field: "auto_tune.ultimate_gain", message: "Must be > 0", severity: "error" });
      if (input.auto_tune.ultimate_period <= 0) issues.push({ field: "auto_tune.ultimate_period", message: "Must be > 0", severity: "error" });
    }
    return { valid: issues.filter(i => i.severity === "error").length === 0, issues };
  }

  calculate(input: PIDControllerInput): PIDControllerOutput {
    const warnings: string[] = [];
    const { setpoint, process_values } = input;
    const dt = input.dt ?? 0.1;
    let Kp = input.Kp ?? 1.0;
    let Ki = input.Ki ?? 0.1;
    let Kd = input.Kd ?? 0.05;
    const outMin = input.output_min ?? -100;
    const outMax = input.output_max ?? 100;
    const antiWindup = input.anti_windup ?? true;
    const derFilter = input.derivative_filter ?? 0.1;

    // Auto-tune via Ziegler-Nichols
    let tunedGains: { Kp: number; Ki: number; Kd: number } | null = null;
    if (input.auto_tune) {
      const { ultimate_gain: Ku, ultimate_period: Tu } = input.auto_tune;
      const type = input.auto_tune.controller_type ?? "PID";
      if (type === "P") { Kp = 0.5 * Ku; Ki = 0; Kd = 0; }
      else if (type === "PI") { Kp = 0.45 * Ku; Ki = Kp / (Tu / 1.2); Kd = 0; }
      else { Kp = 0.6 * Ku; Ki = Kp / (Tu / 2); Kd = Kp * Tu / 8; }
      tunedGains = { Kp, Ki, Kd };
    }

    const steps: PIDStep[] = [];
    let integral = 0;
    let prevError = setpoint - process_values[0];
    let prevDerivative = 0;
    let isSaturated = false;
    let peakValue = -Infinity;
    let settlingTime: number | null = null;

    for (let t = 0; t < process_values.length; t++) {
      const pv = process_values[t];
      const error = setpoint - pv;
      const time = t * dt;

      // P term
      const pTerm = Kp * error;

      // I term with anti-windup
      integral += error * dt;
      if (antiWindup) {
        const maxIntegral = (outMax - outMin) / (2 * Math.max(Ki, 1e-10));
        integral = Math.max(-maxIntegral, Math.min(maxIntegral, integral));
      }
      const iTerm = Ki * integral;

      // D term with low-pass filter
      let rawDeriv = t > 0 ? (error - prevError) / dt : 0;
      let dTerm: number;
      if (derFilter > 0) {
        const filteredDeriv = derFilter * prevDerivative + (1 - derFilter) * rawDeriv;
        dTerm = Kd * filteredDeriv;
        prevDerivative = filteredDeriv;
      } else {
        dTerm = Kd * rawDeriv;
      }

      // Output with clamping
      let output = pTerm + iTerm + dTerm;
      isSaturated = output < outMin || output > outMax;
      output = Math.max(outMin, Math.min(outMax, output));

      steps.push({ time, setpoint, process_value: pv, error, p_term: pTerm, i_term: iTerm, d_term: dTerm, output });
      prevError = error;

      // Track peak for overshoot
      if (pv > peakValue) peakValue = pv;

      // Settling time: last time error exceeds 5% of setpoint
      if (Math.abs(error) > Math.abs(setpoint) * 0.05) {
        settlingTime = time;
      }
    }

    const lastError = steps[steps.length - 1].error;
    const overshoot = setpoint !== 0 ? Math.max(0, (peakValue - setpoint) / Math.abs(setpoint)) * 100 : 0;

    return {
      steps,
      current_output: steps[steps.length - 1].output,
      current_error: lastError,
      integral_sum: integral,
      is_saturated: isSaturated,
      settling_time: settlingTime !== null ? settlingTime + dt : null,
      overshoot_pct: overshoot,
      steady_state_error: lastError,
      tuned_gains: tunedGains,
      warnings,
      calculation_method: `Discrete PID (Kp=${Kp.toFixed(3)}, Ki=${Ki.toFixed(3)}, Kd=${Kd.toFixed(3)}, dt=${dt}s)`,
    };
  }

  getMetadata(): AlgorithmMeta {
    return {
      id: "pid-controller",
      name: "PID Controller",
      description: "Discrete PID with anti-windup, derivative filter, and Ziegler-Nichols auto-tune",
      formula: "u(t) = Kp×e + Ki×∫e×dt + Kd×de/dt",
      reference: "Åström & Murray (2008); Ziegler & Nichols (1942)",
      safety_class: "standard",
      domain: "control",
      inputs: { setpoint: "Target value", process_values: "Measurement history", Kp: "Proportional gain" },
      outputs: { current_output: "Control signal", settling_time: "Time to 5% band [s]", overshoot_pct: "Peak overshoot [%]" },
    };
  }
}
