/**
 * Anomaly Detector — Statistical Process Control (SPC)
 *
 * Implements Western Electric rules and Shewhart control charts for
 * manufacturing process anomaly detection. Detects out-of-control conditions
 * using mean, range, and sigma-based rules.
 *
 * Manufacturing uses: SPC charting, process drift detection, quality alert
 * generation, OOC (out-of-control) condition identification.
 *
 * References:
 * - Western Electric (1956). "Statistical Quality Control Handbook"
 * - Montgomery, D.C. (2012). "Statistical Quality Control", 7th ed.
 * - Nelson, L.S. (1984). "The Shewhart Control Chart"
 *
 * @module algorithms/AnomalyDetector
 */

import type {
  Algorithm, AlgorithmMeta, ValidationResult, ValidationIssue, WithWarnings,
} from "./types.js";

export interface AnomalyDetectorInput {
  /** Process data points. */
  data: number[];
  /** Known process mean (if null, computed from data). */
  process_mean?: number;
  /** Known process std dev (if null, computed from data). */
  process_sigma?: number;
  /** Sigma multiplier for control limits. Default 3. */
  sigma_multiplier?: number;
  /** Window size for moving average. Default 5. */
  window_size?: number;
  /** Apply Western Electric rules. Default true. */
  western_electric?: boolean;
  /** Apply Nelson rules. Default false. */
  nelson_rules?: boolean;
}

export interface AnomalyResult {
  index: number;
  value: number;
  z_score: number;
  rule_violated: string;
  severity: "warning" | "alarm";
}

export interface AnomalyDetectorOutput extends WithWarnings {
  anomalies: AnomalyResult[];
  process_mean: number;
  process_sigma: number;
  ucl: number;
  lcl: number;
  cpk: number;
  in_control: boolean;
  anomaly_rate: number;
  z_scores: number[];
  calculation_method: string;
}

export class AnomalyDetector implements Algorithm<AnomalyDetectorInput, AnomalyDetectorOutput> {

  validate(input: AnomalyDetectorInput): ValidationResult {
    const issues: ValidationIssue[] = [];
    if (!input.data?.length || input.data.length < 5) {
      issues.push({ field: "data", message: "At least 5 data points required", severity: "error" });
    }
    if ((input.sigma_multiplier ?? 3) <= 0) {
      issues.push({ field: "sigma_multiplier", message: "Must be > 0", severity: "error" });
    }
    return { valid: issues.filter(i => i.severity === "error").length === 0, issues };
  }

  calculate(input: AnomalyDetectorInput): AnomalyDetectorOutput {
    const warnings: string[] = [];
    const { data } = input;
    const n = data.length;
    const k = input.sigma_multiplier ?? 3;
    const useWE = input.western_electric ?? true;
    const useNelson = input.nelson_rules ?? false;

    // Process statistics
    const mean = input.process_mean ?? data.reduce((s, v) => s + v, 0) / n;
    const sigma = input.process_sigma ?? Math.sqrt(data.reduce((s, v) => s + (v - mean) ** 2, 0) / (n - 1));
    const ucl = mean + k * sigma;
    const lcl = mean - k * sigma;

    const zScores = data.map(v => sigma > 0 ? (v - mean) / sigma : 0);
    const anomalies: AnomalyResult[] = [];

    // Rule 1: Point beyond ±3σ
    for (let i = 0; i < n; i++) {
      if (Math.abs(zScores[i]) > k) {
        anomalies.push({ index: i, value: data[i], z_score: zScores[i], rule_violated: "Beyond ±3σ", severity: "alarm" });
      }
    }

    if (useWE) {
      // Rule 2: 2 of 3 consecutive points beyond ±2σ (same side)
      for (let i = 2; i < n; i++) {
        const window = [zScores[i - 2], zScores[i - 1], zScores[i]];
        const above2 = window.filter(z => z > 2).length;
        const below2 = window.filter(z => z < -2).length;
        if (above2 >= 2 || below2 >= 2) {
          if (!anomalies.some(a => a.index === i)) {
            anomalies.push({ index: i, value: data[i], z_score: zScores[i], rule_violated: "WE Rule 2: 2/3 beyond ±2σ", severity: "warning" });
          }
        }
      }

      // Rule 3: 4 of 5 consecutive points beyond ±1σ (same side)
      for (let i = 4; i < n; i++) {
        const window = zScores.slice(i - 4, i + 1);
        const above1 = window.filter(z => z > 1).length;
        const below1 = window.filter(z => z < -1).length;
        if (above1 >= 4 || below1 >= 4) {
          if (!anomalies.some(a => a.index === i)) {
            anomalies.push({ index: i, value: data[i], z_score: zScores[i], rule_violated: "WE Rule 3: 4/5 beyond ±1σ", severity: "warning" });
          }
        }
      }

      // Rule 4: 8 consecutive points on same side of mean
      for (let i = 7; i < n; i++) {
        const window = zScores.slice(i - 7, i + 1);
        if (window.every(z => z > 0) || window.every(z => z < 0)) {
          if (!anomalies.some(a => a.index === i)) {
            anomalies.push({ index: i, value: data[i], z_score: zScores[i], rule_violated: "WE Rule 4: 8 consecutive same side", severity: "warning" });
          }
        }
      }
    }

    if (useNelson) {
      // Nelson Rule 5: 6 consecutive increasing or decreasing
      for (let i = 5; i < n; i++) {
        const window = data.slice(i - 5, i + 1);
        const increasing = window.every((v, j) => j === 0 || v > window[j - 1]);
        const decreasing = window.every((v, j) => j === 0 || v < window[j - 1]);
        if (increasing || decreasing) {
          if (!anomalies.some(a => a.index === i)) {
            anomalies.push({ index: i, value: data[i], z_score: zScores[i], rule_violated: "Nelson: 6 monotonic", severity: "warning" });
          }
        }
      }
    }

    // Cpk
    const cpk = sigma > 0 ? Math.min((ucl - mean) / (3 * sigma), (mean - lcl) / (3 * sigma)) : 0;

    anomalies.sort((a, b) => a.index - b.index);

    return {
      anomalies,
      process_mean: mean,
      process_sigma: sigma,
      ucl, lcl, cpk,
      in_control: anomalies.filter(a => a.severity === "alarm").length === 0,
      anomaly_rate: anomalies.length / n,
      z_scores: zScores,
      warnings,
      calculation_method: `SPC Shewhart chart (${k}σ limits${useWE ? " + Western Electric" : ""}${useNelson ? " + Nelson" : ""})`,
    };
  }

  getMetadata(): AlgorithmMeta {
    return {
      id: "anomaly-detector",
      name: "Anomaly Detector (SPC)",
      description: "Statistical process control with Western Electric and Nelson rules",
      formula: "UCL = μ + kσ; LCL = μ - kσ; z = (x - μ) / σ",
      reference: "Western Electric (1956); Montgomery (2012); Nelson (1984)",
      safety_class: "standard",
      domain: "signal",
      inputs: { data: "Process measurements", sigma_multiplier: "Control limit k", western_electric: "Apply WE rules" },
      outputs: { anomalies: "Detected out-of-control points", cpk: "Process capability", in_control: "Process status" },
    };
  }
}
