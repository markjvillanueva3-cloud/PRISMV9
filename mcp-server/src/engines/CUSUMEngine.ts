/**
 * CUSUMEngine — Page's cumulative-sum change-detector
 *
 * Phase 0.22 U-SPC2 from UNIVERSAL-SKILLS-SCRIPTS-HOOKS-PLAN. Detects small,
 * persistent shifts in a process mean that slip past classical 3σ rules.
 * Implements the two-sided tabular CUSUM:
 *
 *   S_i^+ = max(0, S_{i-1}^+ + (x_i − μ) − k)
 *   S_i^− = max(0, S_{i-1}^− + (μ − x_i) − k)
 *   alarm if S_i^+ > h σ or S_i^− > h σ
 *
 * Where k is the allowable slack (typically 0.5σ for detecting a 1σ shift)
 * and h is the decision interval (typically 4σ or 5σ).
 *
 * Reference: Page (1954) "Continuous Inspection Schemes".
 *
 * @module engines/CUSUMEngine
 * @milestone PP-0.22-U-SPC2
 */

export interface CusumConfig {
  mean: number;
  stddev: number;
  k: number; // slack in units of σ
  h: number; // decision threshold in units of σ
}

export interface CusumPoint {
  index: number;
  value: number;
  sPlus: number;
  sMinus: number;
  alarm: "none" | "upper" | "lower";
}

export interface CusumResult {
  points: CusumPoint[];
  alarms: CusumPoint[];
  firstAlarm: CusumPoint | null;
}

export class CUSUMEngine {
  private config: CusumConfig;
  private sPlus = 0;
  private sMinus = 0;
  private stepIndex = 0;

  constructor(config: CusumConfig) {
    this.validateConfig(config);
    this.config = config;
  }

  reset(): void {
    this.sPlus = 0;
    this.sMinus = 0;
    this.stepIndex = 0;
  }

  setConfig(config: CusumConfig): void {
    this.validateConfig(config);
    this.config = config;
    this.reset();
  }

  step(value: number): CusumPoint {
    if (!Number.isFinite(value)) throw new Error("value must be finite");
    const { mean, stddev, k, h } = this.config;
    const kAbs = k * stddev;
    const hAbs = h * stddev;
    const deviation = value - mean;
    this.sPlus = Math.max(0, this.sPlus + deviation - kAbs);
    this.sMinus = Math.max(0, this.sMinus - deviation - kAbs);
    const alarm: CusumPoint["alarm"] =
      this.sPlus > hAbs ? "upper" : this.sMinus > hAbs ? "lower" : "none";
    const point: CusumPoint = {
      index: this.stepIndex,
      value,
      sPlus: round4(this.sPlus),
      sMinus: round4(this.sMinus),
      alarm,
    };
    this.stepIndex += 1;
    return point;
  }

  analyze(values: readonly number[]): CusumResult {
    this.reset();
    const points: CusumPoint[] = values.map((v) => this.step(v));
    const alarms = points.filter((p) => p.alarm !== "none");
    return { points, alarms, firstAlarm: alarms[0] ?? null };
  }

  /** Average run length until alarm (integer >= 1 on alarm, else null). */
  runLengthUntilAlarm(values: readonly number[]): number | null {
    const r = this.analyze(values);
    return r.firstAlarm ? r.firstAlarm.index + 1 : null;
  }

  private validateConfig(c: CusumConfig): void {
    if (!Number.isFinite(c.mean)) throw new Error("mean must be finite");
    if (!(c.stddev > 0)) throw new Error("stddev must be > 0");
    if (!(c.k >= 0)) throw new Error("k must be ≥ 0");
    if (!(c.h > 0)) throw new Error("h must be > 0");
  }
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}
