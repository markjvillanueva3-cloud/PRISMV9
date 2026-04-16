/**
 * EWMAEngine — Exponentially Weighted Moving Average control chart
 *
 * Phase 0.22 U-SPC3 from UNIVERSAL-SKILLS-SCRIPTS-HOOKS-PLAN. Smooth
 * detection of process shifts via:
 *
 *   z_i = λ·x_i + (1−λ)·z_{i−1},  z_0 = μ
 *   UCL/LCL at i = μ ± L·σ·√(λ/(2−λ) · (1 − (1−λ)^{2i}))
 *
 * Where λ ∈ (0, 1] is the smoothing constant (0.1–0.3 typical) and L is the
 * control-limit multiplier (≈2.7–3.0). Reference: Roberts (1959)
 * "Control Chart Tests Based on Geometric Moving Averages".
 *
 * @module engines/EWMAEngine
 * @milestone PP-0.22-U-SPC3
 */

export interface EwmaConfig {
  mean: number;
  stddev: number;
  lambda: number; // smoothing constant in (0, 1]
  L: number; // control-limit multiplier > 0
}

export interface EwmaPoint {
  index: number;
  value: number;
  z: number;
  ucl: number;
  lcl: number;
  alarm: "none" | "upper" | "lower";
}

export interface EwmaResult {
  points: EwmaPoint[];
  alarms: EwmaPoint[];
  firstAlarm: EwmaPoint | null;
}

export class EWMAEngine {
  private config: EwmaConfig;
  private z: number;
  private stepIndex = 0;

  constructor(config: EwmaConfig) {
    this.validateConfig(config);
    this.config = config;
    this.z = config.mean;
  }

  reset(): void {
    this.z = this.config.mean;
    this.stepIndex = 0;
  }

  setConfig(config: EwmaConfig): void {
    this.validateConfig(config);
    this.config = config;
    this.reset();
  }

  step(value: number): EwmaPoint {
    if (!Number.isFinite(value)) throw new Error("value must be finite");
    const { mean, stddev, lambda, L } = this.config;
    this.z = lambda * value + (1 - lambda) * this.z;
    const i = this.stepIndex + 1;
    const variance =
      (lambda / (2 - lambda)) * (1 - Math.pow(1 - lambda, 2 * i)) * stddev * stddev;
    const width = L * Math.sqrt(variance);
    const ucl = mean + width;
    const lcl = mean - width;
    const alarm: EwmaPoint["alarm"] = this.z > ucl ? "upper" : this.z < lcl ? "lower" : "none";
    const point: EwmaPoint = {
      index: this.stepIndex,
      value,
      z: round4(this.z),
      ucl: round4(ucl),
      lcl: round4(lcl),
      alarm,
    };
    this.stepIndex += 1;
    return point;
  }

  analyze(values: readonly number[]): EwmaResult {
    this.reset();
    const points: EwmaPoint[] = values.map((v) => this.step(v));
    const alarms = points.filter((p) => p.alarm !== "none");
    return { points, alarms, firstAlarm: alarms[0] ?? null };
  }

  /** Steady-state half-width = L·σ·√(λ/(2−λ)). Useful for configuration. */
  steadyStateHalfWidth(): number {
    const { stddev, lambda, L } = this.config;
    return round4(L * stddev * Math.sqrt(lambda / (2 - lambda)));
  }

  private validateConfig(c: EwmaConfig): void {
    if (!Number.isFinite(c.mean)) throw new Error("mean must be finite");
    if (!(c.stddev > 0)) throw new Error("stddev must be > 0");
    if (!(c.lambda > 0 && c.lambda <= 1)) throw new Error("lambda must be in (0, 1]");
    if (!(c.L > 0)) throw new Error("L must be > 0");
  }
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}
