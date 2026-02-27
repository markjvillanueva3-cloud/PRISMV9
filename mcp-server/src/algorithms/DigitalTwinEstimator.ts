/**
 * Digital Twin Estimator — State Estimation for Virtual Machine Model
 *
 * Combines physics-based models with real-time sensor data to maintain
 * a digital twin of the machining process. Uses complementary filter
 * to blend model predictions with observations.
 *
 * Manufacturing uses: process state tracking, predictive maintenance,
 * virtual metrology, what-if simulation.
 *
 * References:
 * - Grieves, M. (2014). "Digital Twin: Manufacturing Excellence"
 * - Tao, F. et al. (2018). "Digital Twin in Industry: State-of-the-Art"
 *
 * @module algorithms/DigitalTwinEstimator
 */

import type {
  Algorithm, AlgorithmMeta, ValidationResult, ValidationIssue, WithWarnings,
} from "./types.js";

export interface TwinState {
  /** State variable name. */
  name: string;
  /** Physics model prediction. */
  model_value: number;
  /** Sensor observation (if available). */
  sensor_value?: number;
  /** Model confidence [0-1]. Default 0.5. */
  model_confidence?: number;
  /** Sensor noise std dev. Default 0.1. */
  sensor_noise?: number;
  /** Units. */
  unit?: string;
}

export interface DigitalTwinEstimatorInput {
  /** State variables to estimate. */
  states: TwinState[];
  /** Time step [s]. Default 1. */
  dt?: number;
  /** Previous fused estimates (for temporal smoothing). */
  previous_estimates?: Record<string, number>;
  /** Temporal smoothing factor [0-1]. 0 = no smoothing. Default 0.3. */
  smoothing?: number;
  /** Health threshold — deviation triggering alert [%]. Default 10. */
  health_threshold_pct?: number;
}

export interface TwinEstimate {
  name: string;
  fused_value: number;
  model_value: number;
  sensor_value: number | null;
  deviation_pct: number;
  confidence: number;
  source: "model" | "sensor" | "fused";
  unit: string;
}

export interface DigitalTwinEstimatorOutput extends WithWarnings {
  estimates: TwinEstimate[];
  overall_health: number;
  anomalies: string[];
  model_sensor_agreement: number;
  dt: number;
  calculation_method: string;
}

export class DigitalTwinEstimator implements Algorithm<DigitalTwinEstimatorInput, DigitalTwinEstimatorOutput> {

  validate(input: DigitalTwinEstimatorInput): ValidationResult {
    const issues: ValidationIssue[] = [];
    if (!input.states?.length) issues.push({ field: "states", message: "At least 1 state required", severity: "error" });
    input.states?.forEach((s, i) => {
      if (!s.name) issues.push({ field: `states[${i}].name`, message: "Name required", severity: "error" });
      if (s.model_value === undefined) issues.push({ field: `states[${i}].model_value`, message: "Model value required", severity: "error" });
    });
    return { valid: issues.filter(i => i.severity === "error").length === 0, issues };
  }

  calculate(input: DigitalTwinEstimatorInput): DigitalTwinEstimatorOutput {
    const warnings: string[] = [];
    const anomalies: string[] = [];
    const { states } = input;
    const dt = input.dt ?? 1;
    const smoothing = input.smoothing ?? 0.3;
    const healthThresh = input.health_threshold_pct ?? 10;
    const prevEst = input.previous_estimates ?? {};

    const estimates: TwinEstimate[] = [];
    let totalAgreement = 0;
    let agreementCount = 0;

    for (const state of states) {
      const modelConf = state.model_confidence ?? 0.5;
      const sensorNoise = state.sensor_noise ?? 0.1;
      const hasSensor = state.sensor_value !== undefined && state.sensor_value !== null;

      let fused: number;
      let source: "model" | "sensor" | "fused";
      let confidence: number;

      if (hasSensor) {
        // Complementary filter: blend model and sensor
        const sensorConf = 1 / (1 + sensorNoise * sensorNoise);
        const totalConf = modelConf + sensorConf;
        const modelWeight = modelConf / totalConf;
        const sensorWeight = sensorConf / totalConf;

        fused = modelWeight * state.model_value + sensorWeight * state.sensor_value!;
        source = "fused";
        confidence = Math.min(1, totalConf / 2);

        // Agreement metric
        const deviation = Math.abs(state.model_value - state.sensor_value!) /
          (Math.abs(state.model_value) + 1e-10);
        const agreement = Math.max(0, 1 - deviation);
        totalAgreement += agreement;
        agreementCount++;

        if (deviation * 100 > healthThresh) {
          anomalies.push(`${state.name}: model-sensor deviation ${(deviation * 100).toFixed(1)}% exceeds ${healthThresh}%`);
        }
      } else {
        fused = state.model_value;
        source = "model";
        confidence = modelConf;
      }

      // Temporal smoothing
      if (prevEst[state.name] !== undefined) {
        fused = smoothing * prevEst[state.name] + (1 - smoothing) * fused;
      }

      const deviation_pct = hasSensor
        ? Math.abs(state.model_value - state.sensor_value!) / (Math.abs(state.sensor_value!) + 1e-10) * 100
        : 0;

      estimates.push({
        name: state.name,
        fused_value: fused,
        model_value: state.model_value,
        sensor_value: hasSensor ? state.sensor_value! : null,
        deviation_pct,
        confidence,
        source,
        unit: state.unit ?? "",
      });
    }

    const overallHealth = anomalies.length === 0 ? 1.0
      : Math.max(0, 1 - anomalies.length / states.length);

    return {
      estimates,
      overall_health: overallHealth,
      anomalies,
      model_sensor_agreement: agreementCount > 0 ? totalAgreement / agreementCount : 1,
      dt,
      warnings,
      calculation_method: `Digital twin complementary filter (smoothing=${smoothing})`,
    };
  }

  getMetadata(): AlgorithmMeta {
    return {
      id: "digital-twin-estimator",
      name: "Digital Twin State Estimator",
      description: "Fuses physics model predictions with sensor data for virtual machine state",
      formula: "x_fused = w_m × x_model + w_s × x_sensor; w = confidence / Σconfidence",
      reference: "Grieves (2014); Tao et al. (2018)",
      safety_class: "standard",
      domain: "control",
      inputs: { states: "Model predictions + sensor values", smoothing: "Temporal filter [0-1]" },
      outputs: { estimates: "Fused state estimates", overall_health: "System health [0-1]", anomalies: "Deviations" },
    };
  }
}
