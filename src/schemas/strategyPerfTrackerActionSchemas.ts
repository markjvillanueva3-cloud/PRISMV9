/**
 * Strategy Performance Tracker Action Schemas — Zod v4
 *
 * 4 dispatcher actions (StrategyPerformanceTrackerEngine E1131):
 *   strategy_perf_record   — record a strategy execution (predicted vs actual)
 *   strategy_perf_accuracy — query prediction accuracy with MAPE/bias/R²/Wilson CI
 *   strategy_perf_top      — get top-performing strategies for a feature/material
 *   strategy_perf_stats    — overall tracker statistics
 *
 * @milestone CAMX-MS15/U01
 */

import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

// ─── Shared sub-schemas ───────────────────────────────────────────────────────

const IsoGroupEnum = z.enum(["H", "K", "M", "N", "P", "S"]).describe(
  "ISO material group: P=steel, M=stainless, K=cast iron, N=non-ferrous, S=superalloy, H=hardened"
);

const OutcomeEnum = z.enum(["failure", "partial", "success"]).describe(
  "Execution outcome: success (part OK, tool survived), partial (marginal), failure"
);

const PredictedMetricsSchema = z.object({
  cycle_time_min: z.number().positive().optional().describe("Predicted cycle time, min"),
  tool_life_min:  z.number().positive().optional().describe("Predicted tool life, min"),
  Ra_um:          z.number().positive().optional().describe("Predicted surface roughness Ra, µm"),
  Fc_N:           z.number().positive().optional().describe("Predicted cutting force Fc, N"),
  power_kW:       z.number().positive().optional().describe("Predicted spindle power, kW"),
}).describe("PRISM-predicted performance metrics");

const ActualMetricsSchema = z.object({
  cycle_time_min: z.number().positive().optional().describe("Measured cycle time, min"),
  tool_life_min:  z.number().positive().optional().describe("Measured tool life, min"),
  Ra_um:          z.number().positive().optional().describe("Measured surface roughness Ra, µm"),
  Fc_N:           z.number().positive().optional().describe("Measured cutting force Fc, N (requires dynamometer)"),
  power_kW:       z.number().positive().optional().describe("Measured spindle power, kW (from spindle load)"),
}).describe("Actual measured performance metrics — omit any metric not measured");

// ─── Action schemas ───────────────────────────────────────────────────────────

export const ACTION_STRATEGY_PERF_TRACKER_SCHEMAS: ActionSchemaMap = {

  /**
   * Record a strategy execution — predicted vs actual metrics.
   * Deltas are computed automatically: (actual − predicted) / predicted × 100.
   * Auto-persists to ~/.prism/strategy-performance.json every 10 records.
   */
  strategy_perf_record: z.object({
    strategy_id: z.string().describe(
      "Strategy identifier, e.g. 'hm_optimized_roughing', 'adaptive_clearing'"
    ),
    feature_type: z.string().describe(
      "Geometry feature type, e.g. 'pocket', 'contour', 'slot', 'face', 'bore'"
    ),
    material_iso: IsoGroupEnum,
    tool_id: z.string().optional().describe(
      "Tool identifier, e.g. 'T01', 'Sandvik-R390-10mm'"
    ),
    machine_id: z.string().optional().describe(
      "Machine identifier, e.g. 'DMG-DMU50', 'Mazak-VCU-500'"
    ),
    predicted: PredictedMetricsSchema,
    actual: ActualMetricsSchema,
    outcome: OutcomeEnum,
    execution_id: z.string().optional().describe(
      "Unique execution ID. Auto-generated if omitted"
    ),
    notes: z.string().optional().describe(
      "Optional free-form notes about this execution"
    ),
  }),

  /**
   * Compute prediction accuracy statistics for matching executions.
   *
   * Returns per-metric MAPE, bias, std_dev, R², and Wilson 95% CI on within-10%-error rate.
   * At least 2 data points per metric are required for statistics.
   * All filters are optional — omit all to get global accuracy across all executions.
   */
  strategy_perf_accuracy: z.object({
    strategy_id: z.string().optional().describe(
      "Filter by strategy ID. Omit to aggregate across all strategies"
    ),
    material_iso: IsoGroupEnum.optional().describe(
      "Filter by ISO material group. Omit for all materials"
    ),
    feature_type: z.string().optional().describe(
      "Filter by feature type. Omit for all feature types"
    ),
  }),

  /**
   * Get top-performing strategies for a specific feature type + material combination.
   *
   * Ranks by composite score: lower cycle_time + Ra = better, higher tool_life = better.
   * Weights: cycle_time 35%, tool_life 35%, Ra 30%.
   */
  strategy_perf_top: z.object({
    feature_type: z.string().describe(
      "Geometry feature type to rank strategies for, e.g. 'pocket', 'contour'"
    ),
    material_iso: IsoGroupEnum.describe(
      "ISO material group to scope the ranking"
    ),
    limit: z.number().int().min(1).max(50).optional().default(10).describe(
      "Maximum number of top strategies to return. Default 10"
    ),
  }),

  /**
   * Overall tracking statistics — execution counts, success rates, MAPE summary,
   * most-tracked strategy, and data age.
   */
  strategy_perf_stats: z.object({}),
};
