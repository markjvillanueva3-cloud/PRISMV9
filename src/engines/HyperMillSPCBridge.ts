/**
 * HyperMillSPCBridge — Generate SPC measurement plan from hyperMILL operations
 *
 * Connects SPCProcessCapabilityEngine to hyperMILL job output:
 *   - Generates measurement plan from operation sequence
 *   - Maps critical dimensions → control chart types:
 *       n ≥ 5 → X-bar R chart (subgroup monitoring)
 *       n = 1 → Individual / Moving Range (I-MR) chart
 *   - Calculates Cp/Cpk targets per feature (aerospace: ≥ 1.33)
 *   - Assigns sampling frequency based on characteristic criticality
 *
 * Control chart selection rule (per AIAG SPC Manual 2nd Ed., §4):
 *   - Subgroup size n ≥ 5: use X-bar and R chart (d2, d3 factors for control limits)
 *   - Subgroup size n = 1 or n < 5: use Individual / Moving Range (I-MR) chart
 *   - Attribute data (pass/fail): use p-chart or np-chart
 *
 * References:
 *   - AIAG SPC Manual 2nd Edition (2005) — Statistical Process Control reference manual
 *   - ISO 22514-1 (2014) — Statistics in process management, capability study
 *   - AIAG MSA 4th Edition (2010) — Measurement System Analysis
 *   - AS9100 Rev D §10.3 — Continual improvement of processes
 *
 * HM-REV-MS10 / U-HMR53
 */

import { spcProcessCapabilityEngine } from "./SPCProcessCapabilityEngine.js";
import type { SPCInput, SPCResult } from "./SPCProcessCapabilityEngine.js";
import type { HyperMillOperation } from "./HyperMillSetupSheetBridge.js";

// ============================================================================
// Types
// ============================================================================

/** Chart type selection output */
export type ControlChartType = "xbar_r" | "xbar_s" | "individual_mr" | "p_chart" | "np_chart";

/** Aerospace standard minimum Cpk target */
export const AEROSPACE_CPK_TARGET = 1.33;

/** Automotive/general minimum Cpk target */
export const GENERAL_CPK_TARGET = 1.00;

export interface SPCFeaturePlan {
  /** Source operation ID */
  operation_id: string;
  /** Feature name from operation */
  feature_name: string;
  /** Nominal dimension (mm) */
  nominal_mm: number;
  /** Upper spec limit = nominal + tolerance_plus */
  usl_mm: number;
  /** Lower spec limit = nominal - tolerance_minus */
  lsl_mm: number;
  /** Control chart type (driven by subgroup_size) */
  chart_type: ControlChartType;
  /** Subgroup size used for chart selection */
  subgroup_size: number;
  /** Target Cpk for this feature */
  target_cpk: number;
  /** Sampling frequency recommendation */
  sampling_frequency: string;
  /** Is a critical characteristic */
  is_critical: boolean;
  /** Measurement method */
  measurement_method: string;
}

export interface SPCControlPlanEntry {
  /** Sequential control plan entry number */
  entry_number: number;
  feature_plan: SPCFeaturePlan;
  /** SPC computation with synthetic initial data (3-sigma placeholder) */
  capability_estimate: SPCResult | null;
  /** Process in control (initial estimate) */
  initial_control_status: "capable" | "marginal" | "not_capable" | "no_data";
}

export interface HyperMillSPCInput {
  /** hyperMILL job ID */
  job_id: string;
  /** Part number */
  part_number: string;
  /** hyperMILL operations */
  operations: HyperMillOperation[];
  /** Subgroup size (drives chart type selection) */
  subgroup_size?: number;
  /** Target Cpk for all aerospace features */
  target_cpk?: number;
  /** Whether this is an aerospace job (stricter targets) */
  aerospace?: boolean;
}

export interface HyperMillSPCResult {
  job_id: string;
  part_number: string;
  /** Number of features in the SPC plan */
  feature_count: number;
  /** Number of critical features */
  critical_feature_count: number;
  /** Default subgroup size used */
  subgroup_size: number;
  /** Chart type applied to features with this subgroup size */
  default_chart_type: ControlChartType;
  /** Target Cpk for all features */
  target_cpk: number;
  /** Full control plan */
  control_plan: SPCControlPlanEntry[];
  /** Summary of chart types used */
  chart_type_summary: Record<string, number>;
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Select control chart type based on subgroup size.
 * Per AIAG SPC Manual 2nd Ed. §4:
 *   n ≥ 5 → X-bar R
 *   2 ≤ n < 5 → X-bar R (smaller subgroups, less power)
 *   n = 1 → I-MR
 *
 * @param subgroupSize - subgroup size
 * @returns ControlChartType
 */
function selectChartType(subgroupSize: number): ControlChartType {
  if (subgroupSize >= 5) return "xbar_r";
  if (subgroupSize >= 2) return "xbar_r";
  return "individual_mr";
}

/**
 * Generate synthetic initial measurements centered on nominal
 * for capability pre-estimation (process sigma assumed from tolerance / 6).
 */
function syntheticMeasurements(
  nominal: number,
  tol_plus: number,
  tol_minus: number,
  n = 25
): number[] {
  // Use tolerance / 8 as process sigma (Cpk ≈ 1.33 assumption)
  const sigma = Math.min(tol_plus, tol_minus) / 4;
  if (sigma <= 0) return Array(n).fill(nominal);
  const measurements: number[] = [];
  // Deterministic seeded sequence (no Math.random — tests must be deterministic)
  for (let i = 0; i < n; i++) {
    // Simple deterministic normal approximation via sum of 12 uniform [0,1) - 6
    let sum = 0;
    for (let j = 0; j < 12; j++) {
      sum += ((i * 31 + j * 17 + 7) % 100) / 100;
    }
    const z = sum - 6; // approx standard normal
    measurements.push(nominal + z * sigma);
  }
  return measurements;
}

// ============================================================================
// Engine
// ============================================================================

export class HyperMillSPCBridge {
  /**
   * Generate SPC measurement plan from hyperMILL operation sequence.
   *
   * @param input - hyperMILL job data
   * @returns SPC control plan with chart types and Cpk targets
   */
  generate(input: HyperMillSPCInput): HyperMillSPCResult {
    const {
      job_id,
      part_number,
      operations,
      subgroup_size = 5,
      target_cpk = AEROSPACE_CPK_TARGET,
      aerospace = true,
    } = input;

    // ── Filter to toleranced operations ───────────────────────────────────
    const tolerancedOps = operations.filter(
      (op) =>
        op.nominal_dimension_mm !== undefined &&
        (op.tolerance_plus_mm !== undefined || op.tolerance_minus_mm !== undefined)
    );

    const defaultChartType = selectChartType(subgroup_size);
    const chartTypeSummary: Record<string, number> = {};

    // ── Build control plan ────────────────────────────────────────────────
    const controlPlan: SPCControlPlanEntry[] = tolerancedOps.map((op, idx) => {
      const nominal = op.nominal_dimension_mm!;
      const tol_plus = op.tolerance_plus_mm ?? 0.1;
      const tol_minus = op.tolerance_minus_mm ?? 0.1;

      const usl = nominal + tol_plus;
      const lsl = nominal - tol_minus;

      // Feature-level subgroup size (can override per feature in future)
      const featureSubgroupSize = subgroup_size;
      const chartType = selectChartType(featureSubgroupSize);
      chartTypeSummary[chartType] = (chartTypeSummary[chartType] ?? 0) + 1;

      const isCritical = op.is_critical ?? false;
      const featureCpkTarget = isCritical ? Math.max(target_cpk, AEROSPACE_CPK_TARGET) : target_cpk;

      // Measurement method based on tolerance
      const tol = Math.min(tol_plus, tol_minus);
      const measurementMethod =
        tol <= 0.02 ? "CMM" : tol <= 0.1 ? "CMM / Gauge" : "Gauge";

      // Sampling frequency
      const samplingFrequency =
        isCritical
          ? "Every 5th part (100% for first 30 parts)"
          : "Every 10th part (SPC subgroup)";

      const featurePlan: SPCFeaturePlan = {
        operation_id: op.operation_id,
        feature_name: op.operation_name,
        nominal_mm: nominal,
        usl_mm: usl,
        lsl_mm: lsl,
        chart_type: chartType,
        subgroup_size: featureSubgroupSize,
        target_cpk: featureCpkTarget,
        sampling_frequency: samplingFrequency,
        is_critical: isCritical,
        measurement_method: measurementMethod,
      };

      // ── Pre-estimate capability with synthetic data ────────────────────
      let capabilityEstimate: SPCResult | null = null;
      try {
        const measurements = syntheticMeasurements(nominal, tol_plus, tol_minus, 25);
        const spcInput: SPCInput = {
          measurements,
          nominal,
          upper_tolerance: tol_plus,
          lower_tolerance: tol_minus,
          subgroup_size: featureSubgroupSize,
          feature_name: op.operation_name,
        };
        const result = spcProcessCapabilityEngine.compute(spcInput);
        capabilityEstimate = result.value;
      } catch {
        capabilityEstimate = null;
      }

      const initialStatus: SPCControlPlanEntry["initial_control_status"] =
        capabilityEstimate === null
          ? "no_data"
          : capabilityEstimate.process_assessment;

      return {
        entry_number: idx + 1,
        feature_plan: featurePlan,
        capability_estimate: capabilityEstimate,
        initial_control_status: initialStatus,
      };
    });

    const criticalCount = controlPlan.filter(
      (e) => e.feature_plan.is_critical
    ).length;

    return {
      job_id,
      part_number,
      feature_count: controlPlan.length,
      critical_feature_count: criticalCount,
      subgroup_size,
      default_chart_type: defaultChartType,
      target_cpk,
      control_plan: controlPlan,
      chart_type_summary: chartTypeSummary,
    };
  }
}

export const hyperMillSPCBridge = new HyperMillSPCBridge();
