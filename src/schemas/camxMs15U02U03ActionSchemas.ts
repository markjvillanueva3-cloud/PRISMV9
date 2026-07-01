/**
 * CAMX-MS15 U02 + U03 Action Schemas — Zod v4
 *
 * 7 dispatcher actions across 2 engines:
 *
 *   E1151 StrategyRankingUpdateEngine (CAMX-MS15/U02):
 *     strategy_ranking_record      — record actual result for a strategy/material/tool
 *     strategy_ranking_get         — get strategies ranked by Wilson score lower bound
 *     strategy_ranking_confidence  — get confidence (sample count + CI width) for a triple
 *
 *   E1152 AnomalyDetectionEngine (CAMX-MS15/U03):
 *     anomaly_detect               — detect deviation of actual from predicted (Mahalanobis)
 *     anomaly_record_and_detect    — store + detect in one call
 *     anomaly_history              — retrieve past anomaly records with filters
 *     anomaly_auto_adjust          — propose constant corrections from anomaly pattern
 */

import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

// ── E1151: StrategyRankingUpdateEngine ───────────────────────────────────────

const strategyOutcomeZ = z.object({
  success: z.boolean().describe("Part accepted and no tool breakage"),
  cycle_time_actual: z.number().positive().optional().describe("Actual cycle time [min]"),
  cycle_time_predicted: z.number().positive().optional().describe("Predicted cycle time [min]"),
  tool_life_actual: z.number().positive().optional().describe("Actual tool life [min]"),
  tool_life_predicted: z.number().positive().optional().describe("Predicted tool life [min]"),
}).passthrough();

// ── E1152: AnomalyDetectionEngine ───────────────────────────────────────────

const predictedValuesZ = z.object({
  cycle_time_min: z.number().positive().optional(),
  tool_life_min: z.number().positive().optional(),
  surface_roughness_um: z.number().positive().optional(),
  cutting_force_N: z.number().positive().optional(),
  power_kW: z.number().positive().optional(),
}).passthrough();

const actualValuesZ = z.object({
  cycle_time_min: z.number().positive().optional(),
  tool_life_min: z.number().positive().optional(),
  surface_roughness_um: z.number().positive().optional(),
  cutting_force_N: z.number().positive().optional(),
  power_kW: z.number().positive().optional(),
}).passthrough();

const anomalyContextZ = z.object({
  job_id: z.string().optional(),
  machine_id: z.string().optional(),
  strategy: z.string().optional(),
  material: z.string().optional(),
  tool: z.string().optional(),
  notes: z.string().optional(),
}).passthrough();

const anomalyDetectionResultZ = z.object({
  is_anomaly: z.boolean(),
  distance: z.number().nonnegative(),
  threshold: z.number().nonnegative(),
  degrees_of_freedom: z.number().int().nonnegative(),
  factors: z.array(z.object({
    dimension: z.string(),
    predicted: z.number(),
    actual: z.number(),
    deviation_ratio: z.number(),
    relative_error: z.number(),
    z_score: z.number(),
  })),
  severity: z.enum(["none", "mild", "moderate", "severe"]),
  timestamp: z.number().int().positive(),
}).passthrough();

export const ACTION_CAMX_MS15_U02_U03_SCHEMAS: ActionSchemaMap = {

  // ── E1151: StrategyRankingUpdateEngine ────────────────────────────────────

  strategy_ranking_record: z.object({
    strategy: z.string().min(1).describe("CAM strategy name"),
    material: z.string().min(1).describe("Material identifier (ISO group or specific name)"),
    tool: z.string().min(1).describe("Tool identifier or feature_type prefix"),
    outcome: strategyOutcomeZ.describe("Observed machining outcome"),
  }),

  strategy_ranking_get: z.object({
    material: z.string().optional().describe("Filter by material (omit for all)"),
    feature_type: z.string().optional().describe("Filter by feature_type prefix in tool field"),
  }),

  strategy_ranking_confidence: z.object({
    strategy: z.string().min(1).describe("Strategy name"),
    material: z.string().min(1).describe("Material identifier"),
    tool: z.string().default("*").describe("Tool identifier (default '*' for material-level)"),
  }),

  // ── E1152: AnomalyDetectionEngine ─────────────────────────────────────────

  anomaly_detect: z.object({
    predicted: predictedValuesZ.describe("Predicted values from CAM/physics models"),
    actual: actualValuesZ.describe("Actual measured values from shop floor"),
  }),

  anomaly_record_and_detect: z.object({
    predicted: predictedValuesZ.describe("Predicted values"),
    actual: actualValuesZ.describe("Actual measured values"),
    context: anomalyContextZ.optional().describe("Job/machine/strategy context"),
  }),

  anomaly_history: z.object({
    machine_id: z.string().optional().describe("Filter by machine"),
    strategy: z.string().optional().describe("Filter by strategy"),
    material: z.string().optional().describe("Filter by material"),
    is_anomaly: z.boolean().optional().describe("Filter to only anomalies (true) or non-anomalies (false)"),
    since_ms: z.number().int().positive().optional().describe("Only records since epoch ms"),
    limit: z.number().int().positive().max(500).optional().describe("Max records to return"),
  }),

  anomaly_auto_adjust: z.object({
    anomaly: anomalyDetectionResultZ.describe("AnomalyDetectionResult from anomaly_detect or anomaly_record_and_detect"),
  }),
};
