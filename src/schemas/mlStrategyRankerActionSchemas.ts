/**
 * ML Strategy Ranker Action Schemas — Zod v4
 *
 * 4 dispatcher actions (MachineLearningStrategyRankerEngine E1107):
 *   ml_strategy_record    — record an actual machining outcome
 *   ml_strategy_rank      — rank candidate strategies with Bayesian posteriors
 *   ml_strategy_history   — query performance history with optional filters
 *   ml_strategy_recommend — get a single best-strategy recommendation
 */

import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

// ── Action schemas ────────────────────────────────────────────────────────────

export const ACTION_ML_STRATEGY_RANKER_SCHEMAS: ActionSchemaMap = {

  /**
   * Record an actual machining outcome for Bayesian strategy ranking.
   * Feeds real results back to update priors.
   */
  ml_strategy_record: z.object({
    strategy: z.string().describe(
      "Strategy identifier (e.g., 'adaptive_clearing', 'high_speed_contour')"
    ),
    feature_type: z.string().describe(
      "Geometry feature type (e.g., 'pocket', 'contour', 'slot', 'face', 'bore')"
    ),
    material_iso: z.enum(["H", "K", "M", "N", "P", "S"]).describe(
      "ISO material group: P=steel, M=stainless, K=cast iron, N=non-ferrous, S=superalloy, H=hardened"
    ),
    cycle_time_min: z.number().positive().optional().describe(
      "Measured cycle time in minutes"
    ),
    tool_life_min: z.number().positive().optional().describe(
      "Measured tool life in minutes"
    ),
    Ra_um: z.number().positive().optional().describe(
      "Measured surface roughness Ra in micrometers"
    ),
    scrap_rate: z.number().min(0).max(1).optional().describe(
      "Observed scrap rate as fraction 0-1"
    ),
    success: z.boolean().optional().describe(
      "Whether the outcome was successful (tool survived, part within tolerance)"
    ),
    composite_score: z.number().min(0).max(100).optional().describe(
      "Overall composite score 0-100. Auto-computed from individual metrics if omitted"
    ),
  }),

  /**
   * Rank candidate strategies using Bayesian posteriors + exploration.
   * Returns ranked list with confidence intervals and Thompson/UCB1 scores.
   */
  ml_strategy_rank: z.object({
    feature_type: z.string().describe(
      "Geometry feature type to rank strategies for"
    ),
    material_iso: z.enum(["H", "K", "M", "N", "P", "S"]).describe(
      "ISO material group"
    ),
    candidates: z.array(z.string()).min(1).describe(
      "Array of strategy identifiers to rank"
    ),
    exploration: z.enum(["greedy", "thompson", "ucb1"]).optional().default("thompson").describe(
      "Exploration strategy: 'thompson' (default, probabilistic), 'ucb1' (optimistic), 'greedy' (exploit only)"
    ),
  }),

  /**
   * Query performance history with optional filters.
   * Returns accumulated statistics for matching strategy/feature/material combinations.
   */
  ml_strategy_history: z.object({
    strategy: z.string().optional().describe(
      "Filter by strategy identifier"
    ),
    feature_type: z.string().optional().describe(
      "Filter by feature type"
    ),
    material_iso: z.enum(["H", "K", "M", "N", "P", "S"]).optional().describe(
      "Filter by ISO material group"
    ),
  }),

  /**
   * Get a single recommended strategy with confidence and justification.
   * Uses Bayesian posterior mean with priority weighting.
   */
  ml_strategy_recommend: z.object({
    feature_type: z.string().describe(
      "Geometry feature type"
    ),
    material_iso: z.enum(["H", "K", "M", "N", "P", "S"]).describe(
      "ISO material group"
    ),
    priority: z.enum(["balanced", "cost", "quality", "speed", "tool_life"]).optional().default("balanced").describe(
      "Optimization priority. Default balanced"
    ),
  }),
};
