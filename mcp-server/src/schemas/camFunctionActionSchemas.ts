/**
 * Zod Action Schemas — camFunctionDispatcher (prism_cam_function)
 * ==============================================================
 * 8 actions wiring U-CAM71..U-CAM78 engines:
 *   - cam_func_route                — CAMFunctionRouterEngine
 *   - cam_func_validate             — CAMParameterValidatorEngine
 *   - cam_func_strategy_recommend   — CAMStrategyRecommenderEngine
 *   - cam_func_param_optimize       — CAMParameterOptimizerEngine
 *   - cam_func_translate            — CAMCrossSystemTranslatorEngine
 *   - cam_func_agi_reason           — CAMAGIReasoningEngine
 *   - cam_func_tribal_lookup        — CAMTribalKnowledgeEngine
 *   - cam_func_feature_recognize    — CAMFeatureLearningEngine
 *
 * Authored 2026-05-06 — CAM-EXHAUST-MS0 U-CAM79.
 * @version 1.0.0
 */

import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

// ============================================================================
// FUNCTION ROUTING / VALIDATION
// ============================================================================

/** cam_func_route — natural-language intent → CAM function/operation candidate */
const cam_func_route = z.object({
  intent: z.string().min(1, "intent is required"),
  target_cam: z.string().optional(),
}).passthrough();

/** cam_func_validate — validate CAM parameters against per-CAM catalog + plausibility ranges */
const cam_func_validate = z.object({
  target_cam: z.string().min(1, "target_cam is required"),
  parameters: z.record(z.string(), z.unknown()).optional(),
  operation: z.string().optional(),
}).passthrough();

// ============================================================================
// STRATEGY / OPTIMIZATION
// ============================================================================

/** cam_func_strategy_recommend — multi-CAM strategy ranking from corpus */
const cam_func_strategy_recommend = z.object({
  target_cam: z.string().min(1, "target_cam is required"),
  part_hint: z.string().optional(),
  material: z.string().optional(),
  max_alternatives: z.number().int().positive().max(50).optional(),
}).passthrough();

/** cam_func_param_optimize — bias parameters toward objective with plausibility clamps */
const cam_func_param_optimize = z.object({
  target_cam: z.string().min(1, "target_cam is required"),
  objective: z.enum(["cycle_time", "surface_finish", "tool_life", "balanced"]),
  current: z.record(z.string(), z.number()),
  max_step_pct: z.number().positive().max(1).optional(),
}).passthrough();

// ============================================================================
// CROSS-SYSTEM TRANSLATION / REASONING
// ============================================================================

/** cam_func_translate — port operation+params from source CAM to target CAM */
const cam_func_translate = z.object({
  source_cam: z.string().min(1, "source_cam is required"),
  target_cam: z.string().min(1, "target_cam is required"),
  source_operation: z.string().min(1, "source_operation is required"),
  source_parameters: z.record(z.string(), z.unknown()).optional(),
}).passthrough();

/** cam_func_agi_reason — score options against decision context */
const cam_func_agi_reason = z.object({
  target_cam: z.string().min(1, "target_cam is required"),
  decision_context: z.string().min(1, "decision_context is required"),
  options: z.array(z.string()).optional(),
}).passthrough();

// ============================================================================
// TRIBAL KNOWLEDGE / FEATURE RECOGNITION
// ============================================================================

/** cam_func_tribal_lookup — query curated CAM tribal-knowledge corpus */
const cam_func_tribal_lookup = z.object({
  target_cam: z.string().min(1, "target_cam is required"),
  query: z.string().min(1, "query is required"),
  max_tips: z.number().int().positive().max(50).optional(),
}).passthrough();

/** cam_func_feature_recognize — recognize features from free-form geometry hint */
const cam_func_feature_recognize = z.object({
  target_cam: z.string().min(1, "target_cam is required"),
  part_geometry_hint: z.string().optional(),
}).passthrough();

// ============================================================================
// EXPORT MAP
// ============================================================================

export const CAM_FUNCTION_ACTION_SCHEMAS: ActionSchemaMap = {
  cam_func_route,
  cam_func_validate,
  cam_func_strategy_recommend,
  cam_func_param_optimize,
  cam_func_translate,
  cam_func_agi_reason,
  cam_func_tribal_lookup,
  cam_func_feature_recognize,
};
