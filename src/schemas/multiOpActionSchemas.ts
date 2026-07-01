/**
 * Multi-Operation Dispatcher Action Schemas
 * ==========================================
 * Per-action Zod schemas for all 7 prism_multi_op actions.
 * CAMK-MS3: Rest machining, operation sequencing, transition paths,
 * adaptive refinement, multi-setup planning.
 *
 * @module schemas/multiOpActionSchemas
 * @version 1.0.0
 */

import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

// ============================================================================
// rest_analyze — RestMachiningEngine.analyze
// ============================================================================

const rest_analyze = z.object({
  geometry: z.record(z.string(), z.any()).optional(),
  previous_tool: z.record(z.string(), z.any()).optional(),
  new_tool: z.record(z.string(), z.any()).optional(),
  material: z.string().optional(),
}).passthrough();

// ============================================================================
// rest_quick_check — RestMachiningEngine.quickCheck
// ============================================================================

const rest_quick_check = z.object({
  geometry: z.record(z.string(), z.any()).optional(),
  previous_tool: z.record(z.string(), z.any()).optional(),
}).passthrough();

// ============================================================================
// operation_sequence — OperationSequencerEngine.sequence
// ============================================================================

const operation_sequence = z.object({
  operations: z.array(z.record(z.string(), z.any())).optional(),
  constraints: z.record(z.string(), z.any()).optional(),
  material: z.string().optional(),
}).passthrough();

// ============================================================================
// transition_plan — TransitionPathEngine.plan
// ============================================================================

const transition_plan = z.object({
  from_op: z.record(z.string(), z.any()).optional(),
  to_op: z.record(z.string(), z.any()).optional(),
  machine: z.record(z.string(), z.any()).optional(),
}).passthrough();

// ============================================================================
// transition_batch — TransitionPathEngine.planBatch
// ============================================================================

const transition_batch = z.object({
  transitions: z.array(z.record(z.string(), z.any())).optional(),
  machine: z.record(z.string(), z.any()).optional(),
}).passthrough();

// ============================================================================
// adaptive_refine — AdaptiveRefinementEngine.refine
// ============================================================================

const adaptive_refine = z.object({
  toolpath: z.record(z.string(), z.any()).optional(),
  feedback: z.record(z.string(), z.any()).optional(),
  tolerance: z.number().positive().optional(),
}).passthrough();

// ============================================================================
// multi_setup_plan — MultiSetupPlannerEngine.plan
// ============================================================================

const multi_setup_plan = z.object({
  part: z.record(z.string(), z.any()).optional(),
  features: z.array(z.record(z.string(), z.any())).optional(),
  machine: z.record(z.string(), z.any()).optional(),
}).passthrough();

// ============================================================================
// EXPORT MAP
// ============================================================================

export const MULTI_OP_ACTION_SCHEMAS: ActionSchemaMap = {
  rest_analyze,
  rest_quick_check,
  operation_sequence,
  transition_plan,
  transition_batch,
  adaptive_refine,
  multi_setup_plan,
};
