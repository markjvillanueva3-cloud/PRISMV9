/**
 * Intelligence Dispatcher Action Schemas
 * =======================================
 * Per-action Zod schemas for all 49 core prism_intelligence actions.
 * Validated AFTER normalizeParams(), BEFORE engine dispatch.
 *
 * @module schemas/intelligenceActionSchemas
 * @version 1.0.0
 */

import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

// ============================================================================
// REUSABLE FIELD SCHEMAS
// ============================================================================

const optStr = z.string().optional();
const optNum = z.number().optional();
const optPosNum = z.number().positive().optional();
const optBool = z.boolean().optional();
const optStrArr = z.array(z.string()).optional();
const responseLevel = z.enum(["minimal", "summary", "full"]).optional();

// ============================================================================
// IntelligenceEngine core actions (11)
// ============================================================================

const job_plan = z.object({
  material: z.string().min(1),
  feature: z.string().min(1),
  dimensions: z.object({
    depth: z.number().positive(),
    width: optPosNum,
    length: optPosNum,
    diameter: optPosNum,
  }),
  tolerance: optPosNum,
  surface_finish: optPosNum,
  machine_id: optStr,
  tool_id: optStr,
  response_level: responseLevel,
  modal: z.object({
    natural_frequency: optPosNum,
    damping_ratio: optPosNum,
    stiffness: optPosNum,
  }).optional(),
  machine_power_kw: optPosNum,
}).passthrough();

const setup_sheet = z.object({
  material: z.string().min(1),
  operations: z.array(z.object({
    feature: optStr,
    depth: optPosNum,
    width: optPosNum,
    length: optPosNum,
    diameter: optPosNum,
    tolerance: optPosNum,
    surface_finish: optPosNum,
  }).passthrough()),
  format: z.enum(["json", "markdown", "text"]).optional(),
  tolerance: optPosNum,
  surface_finish: optPosNum,
  machine_id: optStr,
  response_level: responseLevel,
}).passthrough();

const process_cost = z.object({
  material: z.string().min(1),
  operations: z.array(z.object({
    feature: optStr,
    depth: optPosNum,
    width: optPosNum,
    length: optPosNum,
    diameter: optPosNum,
  }).passthrough()),
  machine_rate_per_hour: optPosNum,
  tool_cost: optPosNum,
  batch_size: z.number().int().positive().optional(),
  setup_time_min: optPosNum,
  response_level: responseLevel,
}).passthrough();

const material_recommend = z.object({
  application: z.string().min(1),
  iso_group: optStr,
  hardness_range: z.object({
    min: optNum,
    max: optNum,
  }).optional(),
  limit: z.number().int().positive().optional(),
  priorities: optStrArr,
  response_level: responseLevel,
}).passthrough();

const tool_recommend = z.object({
  material: z.string().min(1),
  feature: z.string().min(1),
  iso_group: optStr,
  limit: z.number().int().positive().optional(),
  diameter: optPosNum,
  tool_type: optStr,
  coating: optStr,
  response_level: responseLevel,
}).passthrough();

const machine_recommend = z.object({
  part_envelope: z.object({
    x: z.number().positive(),
    y: z.number().positive(),
    z: z.number().positive(),
  }),
  type: optStr,
  manufacturer: optStr,
  min_spindle_rpm: optPosNum,
  min_spindle_power: optPosNum,
  simultaneous_axes: z.number().int().min(3).max(5).optional(),
  limit: z.number().int().positive().optional(),
  response_level: responseLevel,
}).passthrough();

const what_if = z.object({
  baseline: z.record(z.string(), z.unknown()),
  changes: z.record(z.string(), z.unknown()),
  material: optStr,
  response_level: responseLevel,
}).passthrough();

const failure_diagnose = z.object({
  symptoms: z.union([z.array(z.string()), z.string()]).optional(),
  alarm_code: z.union([z.string(), z.number()]).optional(),
  controller: optStr,
  material: optStr,
  operation: optStr,
  machine: optStr,
  response_level: responseLevel,
}).passthrough();

const parameter_optimize = z.object({
  material: z.string().min(1),
  objectives: z.object({
    productivity: optNum,
    cost: optNum,
    quality: optNum,
    tool_life: optNum,
  }).passthrough(),
  constraints: z.record(z.string(), z.unknown()).optional(),
  tool_diameter: optPosNum,
  response_level: responseLevel,
}).passthrough();

const cycle_time_estimate = z.object({
  operations: z.array(z.object({
    feature: optStr,
    depth: optPosNum,
    width: optPosNum,
    length: optPosNum,
    diameter: optPosNum,
    material: optStr,
  }).passthrough()),
  material: optStr,
  tool_change_time: optPosNum,
  rapid_rate: optPosNum,
  response_level: responseLevel,
}).passthrough();

const quality_predict = z.object({
  material: z.string().min(1),
  parameters: z.object({
    cutting_speed: optPosNum,
    feed_per_tooth: optPosNum,
    axial_depth: optPosNum,
    radial_depth: optPosNum,
    tool_diameter: optPosNum,
    number_of_teeth: z.number().int().positive().optional(),
  }).passthrough(),
  nose_radius: optPosNum,
  overhang_length: optPosNum,
  operation: optStr,
  response_level: responseLevel,
}).passthrough();

// ============================================================================
// JobLearningEngine actions (2)
// ============================================================================

const job_record = z.object({
  material: z.string().min(1),
  operation: z.string().min(1),
  parameters_used: z.object({
    vc_mpm: z.number().positive(),
    fz_mm: z.number().positive(),
    ap_mm: z.number().positive(),
    ae_mm: optPosNum,
    strategy: optStr,
    tool: optStr,
  }).passthrough(),
  outcome: z.object({
    actual_tool_life_min: optPosNum,
    actual_surface_finish_ra: optPosNum,
    actual_cycle_time_min: optPosNum,
    chatter_occurred: optBool,
    tool_failure_mode: z.enum(["none", "flank_wear", "crater_wear", "chipping", "breakage"]).optional(),
    operator_notes: optStr,
  }).passthrough(),
  job_plan_id: optStr,
  machine: optStr,
  timestamp: optStr,
}).passthrough();

const job_insights = z.object({
  material: optStr,
  operation: optStr,
  machine: optStr,
  min_jobs: z.number().int().positive().optional(),
}).passthrough();

// ============================================================================
// AlgorithmGatewayEngine (1)
// ============================================================================

const algorithm_select = z.object({
  problem_type: z.enum(["optimize", "predict", "classify", "interpolate", "sequence", "filter"]),
  domain: z.enum(["cutting_params", "toolpath", "scheduling", "quality", "maintenance"]),
  data: z.record(z.string(), z.unknown()).optional(),
}).passthrough();

// ============================================================================
// ShopSchedulerEngine (1)
// ============================================================================

const machine_utilization = z.object({
  machine_ids: z.array(z.string()).optional(),
  time_range: optStr,
  response_level: responseLevel,
}).passthrough();

// ============================================================================
// IntentDecompositionEngine (1)
// ============================================================================

const decompose_intent = z.object({
  query: z.string().min(1),
  context: z.record(z.string(), z.unknown()).optional(),
  persona: optStr,
}).passthrough();

// ============================================================================
// ResponseFormatterEngine (1)
// ============================================================================

const format_response = z.object({
  data: z.record(z.string(), z.unknown()),
  persona: optStr,
  units: z.enum(["metric", "imperial"]).optional(),
  format: optStr,
}).passthrough();

// ============================================================================
// WorkflowChainsEngine (3)
// ============================================================================

const workflow_match = z.object({
  query: z.string().min(1),
  context: z.record(z.string(), z.unknown()).optional(),
}).passthrough();

const workflow_get = z.object({
  workflow_id: z.string().min(1),
  persona: optStr,
}).passthrough();

const workflow_list = z.object({
  category: optStr,
  limit: z.number().int().positive().optional(),
}).passthrough();

// ============================================================================
// OnboardingEngine (5)
// ============================================================================

const onboarding_welcome = z.object({
  user_id: optStr,
}).passthrough();

const onboarding_state = z.object({
  user_id: optStr,
}).passthrough();

const onboarding_record = z.object({
  user_id: optStr,
  interaction_type: optStr,
  data: z.record(z.string(), z.unknown()).optional(),
}).passthrough();

const onboarding_suggestion = z.object({
  user_id: optStr,
  level: optStr,
}).passthrough();

const onboarding_reset = z.object({
  user_id: optStr,
}).passthrough();

// ============================================================================
// SetupSheetEngine (2)
// ============================================================================

const setup_sheet_format = z.object({
  job_id: optStr,
  material: optStr,
  operations: z.array(z.record(z.string(), z.unknown())).optional(),
  format: z.enum(["json", "markdown", "text", "html"]).optional(),
}).passthrough();

const setup_sheet_template = z.object({
  format: z.enum(["json", "markdown", "text", "html"]).optional(),
}).passthrough();

// ============================================================================
// ConversationalMemoryEngine (8)
// ============================================================================

const conversation_context = z.object({
  user_id: optStr,
}).passthrough();

const conversation_transition = z.object({
  user_id: optStr,
  new_topic: optStr,
}).passthrough();

const job_start = z.object({
  material: optStr,
  machine: optStr,
  operation: optStr,
  tools: optStrArr,
}).passthrough();

const job_update = z.object({
  id: optStr,
  material: optStr,
  machine: optStr,
  operation: optStr,
  tools: optStrArr,
  data: z.record(z.string(), z.unknown()).optional(),
}).passthrough();

const job_find = z.object({
  material: optStr,
  machine: optStr,
  operation: optStr,
  id: optStr,
}).passthrough();

const job_resume = z.object({
  id: z.string().min(1),
}).passthrough();

const job_complete = z.object({
  id: optStr,
  outcome: z.record(z.string(), z.unknown()).optional(),
}).passthrough();

const job_list_recent = z.object({
  limit: z.number().int().positive().optional(),
}).passthrough();

// ============================================================================
// UserWorkflowSkillsEngine (6)
// ============================================================================

const skill_list = z.object({
  category: optStr,
  limit: z.number().int().positive().optional(),
}).passthrough();

const skill_get = z.object({
  skill_id: z.string().min(1),
}).passthrough();

const skill_search = z.object({
  query: z.string().min(1),
  limit: z.number().int().positive().optional(),
}).passthrough();

const skill_match = z.object({
  query: z.string().min(1),
  context: z.record(z.string(), z.unknown()).optional(),
}).passthrough();

const skill_steps = z.object({
  skill_id: z.string().min(1),
  persona: optStr,
}).passthrough();

const skill_for_persona = z.object({
  skill_id: z.string().min(1),
  persona: z.string().min(1),
}).passthrough();

// ============================================================================
// UserAssistanceSkillsEngine (8)
// ============================================================================

const assist_list = z.object({
  category: optStr,
  limit: z.number().int().positive().optional(),
}).passthrough();

const assist_get = z.object({
  id: z.string().min(1),
}).passthrough();

const assist_search = z.object({
  query: z.string().min(1),
  limit: z.number().int().positive().optional(),
}).passthrough();

const assist_match = z.object({
  query: z.string().min(1),
  context: z.record(z.string(), z.unknown()).optional(),
}).passthrough();

const assist_explain = z.object({
  parameter: z.string().min(1),
  value: z.union([z.string(), z.number()]).optional(),
  context: z.record(z.string(), z.unknown()).optional(),
}).passthrough();

const assist_confidence = z.object({
  data: z.record(z.string(), z.unknown()).optional(),
  action: optStr,
}).passthrough();

const assist_mistakes = z.object({
  operation: optStr,
  material: optStr,
  limit: z.number().int().positive().optional(),
}).passthrough();

const assist_safety = z.object({
  parameters: z.record(z.string(), z.unknown()).optional(),
  material: optStr,
  operation: optStr,
}).passthrough();

// ============================================================================
// EXPORT MAP — 49 core actions
// ============================================================================

export const ACTION_INTELLIGENCE_SCHEMAS: ActionSchemaMap = {
  // IntelligenceEngine (11)
  job_plan,
  setup_sheet,
  process_cost,
  material_recommend,
  tool_recommend,
  machine_recommend,
  what_if,
  failure_diagnose,
  parameter_optimize,
  cycle_time_estimate,
  quality_predict,
  // JobLearningEngine (2)
  job_record,
  job_insights,
  // AlgorithmGatewayEngine (1)
  algorithm_select,
  // ShopSchedulerEngine (1)
  machine_utilization,
  // IntentDecompositionEngine (1)
  decompose_intent,
  // ResponseFormatterEngine (1)
  format_response,
  // WorkflowChainsEngine (3)
  workflow_match,
  workflow_get,
  workflow_list,
  // OnboardingEngine (5)
  onboarding_welcome,
  onboarding_state,
  onboarding_record,
  onboarding_suggestion,
  onboarding_reset,
  // SetupSheetEngine (2)
  setup_sheet_format,
  setup_sheet_template,
  // ConversationalMemoryEngine (8)
  conversation_context,
  conversation_transition,
  job_start,
  job_update,
  job_find,
  job_resume,
  job_complete,
  job_list_recent,
  // UserWorkflowSkillsEngine (6)
  skill_list,
  skill_get,
  skill_search,
  skill_match,
  skill_steps,
  skill_for_persona,
  // UserAssistanceSkillsEngine (8)
  assist_list,
  assist_get,
  assist_search,
  assist_match,
  assist_explain,
  assist_confidence,
  assist_mistakes,
  assist_safety,
};
