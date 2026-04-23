/**
 * MastercamSPCBridge — Statistical Process Control Integration for Mastercam
 *
 * Bridges Mastercam toolpath data with PRISM SPC engines for:
 *   - X-bar R charts from machined features
 *   - Process capability (Cp, Cpk, Pp, Ppk)
 *   - Control limit calculations
 *   - Out-of-control detection
 *   - Nelson SPC rules integration
 *
 * @module engines/MastercamSPCBridge
 * @milestone CAM-PARITY-AGI-MS0/U-CAMP04
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

export interface SPCFeature {
  feature_id: string;
  feature_type: "diameter" | "length" | "position" | "angle" | "surface";
  nominal: number;
  tolerance_plus: number;
  tolerance_minus: number;
  unit: "mm" | "inch";
}

export interface SPCMeasurement {
  feature_id: string;
  measured_value: number;
  timestamp: string;
  part_number: number;
  operator?: string;
  machine_id?: string;
}

export interface XBarRChart {
  feature_id: string;
  subgroup_size: number;
  x_bar_values: number[];
  r_values: number[];
  x_bar_ucl: number;
  x_bar_lcl: number;
  x_bar_cl: number;
  r_ucl: number;
  r_lcl: number;
  r_cl: number;
  out_of_control_points: number[];
  nelson_violations: NelsonViolation[];
}

export interface NelsonViolation {
  rule: number;
  description: string;
  points: number[];
  severity: "warning" | "critical";
}

export interface ProcessCapability {
  feature_id: string;
  Cp: number;
  Cpk: number;
  Pp: number;
  Ppk: number;
  sigma_short: number;
  sigma_long: number;
  ppm_defective: number;
  process_status: "capable" | "marginal" | "incapable";
  recommendations: string[];
}

export interface SPCAnalysisResult {
  job_id: string;
  feature_count: number;
  charts: XBarRChart[];
  capabilities: ProcessCapability[];
  overall_status: "in_control" | "warning" | "out_of_control";
  summary: string;
  timestamp: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

// A2, D3, D4 factors for X-bar R charts (n = 2-10)
const A2_FACTORS: Record<number, number> = {
  2: 1.880, 3: 1.023, 4: 0.729, 5: 0.577,
  6: 0.483, 7: 0.419, 8: 0.373, 9: 0.337, 10: 0.308
};

const D3_FACTORS: Record<number, number> = {
  2: 0, 3: 0, 4: 0, 5: 0,
  6: 0, 7: 0.076, 8: 0.136, 9: 0.184, 10: 0.223
};

const D4_FACTORS: Record<number, number> = {
  2: 3.267, 3: 2.575, 4: 2.282, 5: 2.115,
  6: 2.004, 7: 1.924, 8: 1.864, 9: 1.816, 10: 1.777
};

const d2_FACTORS: Record<number, number> = {
  2: 1.128, 3: 1.693, 4: 2.059, 5: 2.326,
  6: 2.534, 7: 2.704, 8: 2.847, 9: 2.970, 10: 3.078
};

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class MastercamSPCBridge {
  /**
   * Create X-bar R chart from measurements
   */
  createXBarRChart(
    feature: SPCFeature,
    measurements: SPCMeasurement[],
    subgroupSize: number = 5
  ): XBarRChart {
    const featureMeasurements = measurements
      .filter(m => m.feature_id === feature.feature_id)
      .sort((a, b) => a.part_number - b.part_number);

    // Group into subgroups
    const subgroups: number[][] = [];
    for (let i = 0; i < featureMeasurements.length; i += subgroupSize) {
      const group = featureMeasurements
        .slice(i, i + subgroupSize)
        .map(m => m.measured_value);
      if (group.length === subgroupSize) {
        subgroups.push(group);
      }
    }

    // Calculate X-bar and R for each subgroup
    const xBars = subgroups.map(g => g.reduce((a, b) => a + b, 0) / g.length);
    const ranges = subgroups.map(g => Math.max(...g) - Math.min(...g));

    // Calculate control limits
    const xBarBar = xBars.reduce((a, b) => a + b, 0) / xBars.length;
    const rBar = ranges.reduce((a, b) => a + b, 0) / ranges.length;

    const A2 = A2_FACTORS[subgroupSize] || 0.577;
    const D3 = D3_FACTORS[subgroupSize] || 0;
    const D4 = D4_FACTORS[subgroupSize] || 2.115;

    const xBarUCL = xBarBar + A2 * rBar;
    const xBarLCL = xBarBar - A2 * rBar;
    const rUCL = D4 * rBar;
    const rLCL = D3 * rBar;

    // Find out-of-control points
    const outOfControl: number[] = [];
    xBars.forEach((xb, i) => {
      if (xb > xBarUCL || xb < xBarLCL) outOfControl.push(i);
    });
    ranges.forEach((r, i) => {
      if (r > rUCL || r < rLCL) {
        if (!outOfControl.includes(i)) outOfControl.push(i);
      }
    });

    // Check Nelson rules
    const nelsonViolations = this.checkNelsonRules(xBars, xBarBar, (xBarUCL - xBarBar) / 3);

    return {
      feature_id: feature.feature_id,
      subgroup_size: subgroupSize,
      x_bar_values: xBars,
      r_values: ranges,
      x_bar_ucl: Math.round(xBarUCL * 10000) / 10000,
      x_bar_lcl: Math.round(xBarLCL * 10000) / 10000,
      x_bar_cl: Math.round(xBarBar * 10000) / 10000,
      r_ucl: Math.round(rUCL * 10000) / 10000,
      r_lcl: Math.round(rLCL * 10000) / 10000,
      r_cl: Math.round(rBar * 10000) / 10000,
      out_of_control_points: outOfControl,
      nelson_violations: nelsonViolations
    };
  }

  /**
   * Check Nelson SPC rules for systematic patterns
   */
  private checkNelsonRules(values: number[], centerLine: number, sigma: number): NelsonViolation[] {
    const violations: NelsonViolation[] = [];

    // Rule 1: Point beyond 3σ (already checked in out_of_control)

    // Rule 2: 9 consecutive points on same side of center
    for (let i = 0; i <= values.length - 9; i++) {
      const slice = values.slice(i, i + 9);
      const allAbove = slice.every(v => v > centerLine);
      const allBelow = slice.every(v => v < centerLine);
      if (allAbove || allBelow) {
        violations.push({
          rule: 2,
          description: "9 consecutive points on same side of center line",
          points: Array.from({ length: 9 }, (_, j) => i + j),
          severity: "warning"
        });
        break;
      }
    }

    // Rule 3: 6 consecutive points increasing or decreasing
    for (let i = 0; i <= values.length - 6; i++) {
      const slice = values.slice(i, i + 6);
      let increasing = true;
      let decreasing = true;
      for (let j = 1; j < slice.length; j++) {
        if (slice[j] <= slice[j - 1]) increasing = false;
        if (slice[j] >= slice[j - 1]) decreasing = false;
      }
      if (increasing || decreasing) {
        violations.push({
          rule: 3,
          description: "6 consecutive points steadily increasing or decreasing",
          points: Array.from({ length: 6 }, (_, j) => i + j),
          severity: "warning"
        });
        break;
      }
    }

    // Rule 4: 14 consecutive points alternating up and down
    for (let i = 0; i <= values.length - 14; i++) {
      const slice = values.slice(i, i + 14);
      let alternating = true;
      for (let j = 2; j < slice.length; j++) {
        const prevDir = slice[j - 1] - slice[j - 2];
        const currDir = slice[j] - slice[j - 1];
        if (prevDir * currDir >= 0) {
          alternating = false;
          break;
        }
      }
      if (alternating) {
        violations.push({
          rule: 4,
          description: "14 consecutive points alternating up and down",
          points: Array.from({ length: 14 }, (_, j) => i + j),
          severity: "critical"
        });
        break;
      }
    }

    // Rule 5: 2 out of 3 points beyond 2σ
    const twoSigma = 2 * sigma;
    for (let i = 0; i <= values.length - 3; i++) {
      const slice = values.slice(i, i + 3);
      const beyond2Sigma = slice.filter(v => Math.abs(v - centerLine) > twoSigma).length;
      if (beyond2Sigma >= 2) {
        violations.push({
          rule: 5,
          description: "2 out of 3 consecutive points beyond 2σ",
          points: Array.from({ length: 3 }, (_, j) => i + j),
          severity: "warning"
        });
        break;
      }
    }

    return violations;
  }

  /**
   * Calculate process capability indices
   */
  calculateCapability(
    feature: SPCFeature,
    measurements: SPCMeasurement[],
    subgroupSize: number = 5
  ): ProcessCapability {
    const values = measurements
      .filter(m => m.feature_id === feature.feature_id)
      .map(m => m.measured_value);

    const n = values.length;
    const mean = values.reduce((a, b) => a + b, 0) / n;

    // Short-term sigma (from R-bar method)
    const chart = this.createXBarRChart(feature, measurements, subgroupSize);
    const d2 = d2_FACTORS[subgroupSize] || 2.326;
    const sigmaShort = chart.r_cl / d2;

    // Long-term sigma (overall standard deviation)
    const sigmaLong = Math.sqrt(
      values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / (n - 1)
    );

    // Specification limits
    const USL = feature.nominal + feature.tolerance_plus;
    const LSL = feature.nominal - feature.tolerance_minus;

    // Capability indices
    const Cp = (USL - LSL) / (6 * sigmaShort);
    const Cpk = Math.min(
      (USL - mean) / (3 * sigmaShort),
      (mean - LSL) / (3 * sigmaShort)
    );
    const Pp = (USL - LSL) / (6 * sigmaLong);
    const Ppk = Math.min(
      (USL - mean) / (3 * sigmaLong),
      (mean - LSL) / (3 * sigmaLong)
    );

    // PPM defective (assuming normal distribution)
    const zUpper = (USL - mean) / sigmaLong;
    const zLower = (mean - LSL) / sigmaLong;
    const ppmUpper = this.normalCDF(-zUpper) * 1e6;
    const ppmLower = this.normalCDF(-zLower) * 1e6;
    const ppmDefective = Math.round(ppmUpper + ppmLower);

    // Determine status and recommendations
    const recommendations: string[] = [];
    let status: "capable" | "marginal" | "incapable";

    if (Cpk >= 1.33) {
      status = "capable";
    } else if (Cpk >= 1.0) {
      status = "marginal";
      recommendations.push("Process is marginally capable - consider reducing variation");
    } else {
      status = "incapable";
      recommendations.push("Process is NOT capable - immediate action required");
    }

    if (Cp > Cpk * 1.2) {
      recommendations.push("Process is off-center - adjust setup to center on nominal");
    }

    if (sigmaLong > sigmaShort * 1.5) {
      recommendations.push("High long-term variation - investigate special causes");
    }

    return {
      feature_id: feature.feature_id,
      Cp: Math.round(Cp * 100) / 100,
      Cpk: Math.round(Cpk * 100) / 100,
      Pp: Math.round(Pp * 100) / 100,
      Ppk: Math.round(Ppk * 100) / 100,
      sigma_short: Math.round(sigmaShort * 10000) / 10000,
      sigma_long: Math.round(sigmaLong * 10000) / 10000,
      ppm_defective: ppmDefective,
      process_status: status,
      recommendations
    };
  }

  /**
   * Standard normal CDF approximation
   */
  private normalCDF(z: number): number {
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;

    const sign = z < 0 ? -1 : 1;
    z = Math.abs(z) / Math.sqrt(2);

    const t = 1.0 / (1.0 + p * z);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-z * z);

    return 0.5 * (1.0 + sign * y);
  }

  /**
   * Full SPC analysis for a Mastercam job
   */
  analyzeJob(
    jobId: string,
    features: SPCFeature[],
    measurements: SPCMeasurement[],
    subgroupSize: number = 5
  ): SPCAnalysisResult {
    const charts: XBarRChart[] = [];
    const capabilities: ProcessCapability[] = [];
    let overallStatus: "in_control" | "warning" | "out_of_control" = "in_control";

    for (const feature of features) {
      const featureMeasurements = measurements.filter(m => m.feature_id === feature.feature_id);
      if (featureMeasurements.length >= subgroupSize * 2) {
        const chart = this.createXBarRChart(feature, measurements, subgroupSize);
        const capability = this.calculateCapability(feature, measurements, subgroupSize);

        charts.push(chart);
        capabilities.push(capability);

        if (chart.out_of_control_points.length > 0 || capability.process_status === "incapable") {
          overallStatus = "out_of_control";
        } else if (
          chart.nelson_violations.length > 0 ||
          capability.process_status === "marginal"
        ) {
          if (overallStatus !== "out_of_control") {
            overallStatus = "warning";
          }
        }
      }
    }

    const capableCount = capabilities.filter(c => c.process_status === "capable").length;
    const summary = `${capableCount}/${capabilities.length} features capable. ` +
      `${charts.reduce((sum, c) => sum + c.out_of_control_points.length, 0)} out-of-control points.`;

    log.info(`[MastercamSPCBridge] Job ${jobId} analyzed: ${summary}`);

    return {
      job_id: jobId,
      feature_count: features.length,
      charts,
      capabilities,
      overall_status: overallStatus,
      summary,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get stats about the SPC bridge
   */
  getStats(): { features_supported: number; nelson_rules: number; capability_indices: number } {
    return {
      features_supported: 5, // diameter, length, position, angle, surface
      nelson_rules: 5,       // Rules 1-5 implemented
      capability_indices: 4  // Cp, Cpk, Pp, Ppk
    };
  }
}

// Singleton export
export const mastercamSPCBridge = new MastercamSPCBridge();
