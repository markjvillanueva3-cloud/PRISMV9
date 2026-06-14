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
// workflow_suggest — WorkflowTemplateEngine.suggestSequence
// ============================================================================

const workflow_suggest = z.object({
  process_type: z.enum([
    "2d_milling", "3d_milling", "5axis_milling",
    "turning", "mill_turn", "wire_edm", "sinker_edm", "grinding",
    "die_design", "mold_design", "fixture_design"
  ]).describe("Process type for workflow suggestion"),
  part_complexity: z.enum(["simple", "moderate", "complex", "extreme"]).optional()
    .describe("Part complexity classification"),
  features: z.array(z.string()).optional()
    .describe("List of features in the part"),
  material_group: z.string().optional()
    .describe("Material group (P, M, K, N, S, H)"),
  machine_type: z.string().optional()
    .describe("Machine type (lathe, vmc, hmc, 5axis)"),
}).passthrough();

// ============================================================================
// workflow_gap_analysis — WorkflowTemplateEngine.analyzeGaps
// ============================================================================

const workflow_gap_analysis = z.object({
  process_type: z.enum([
    "2d_milling", "3d_milling", "5axis_milling",
    "turning", "mill_turn", "wire_edm", "sinker_edm", "grinding",
    "die_design", "mold_design", "fixture_design"
  ]).describe("Process type for gap analysis"),
  provided_operations: z.array(z.string())
    .describe("List of operations to analyze against canonical template"),
}).passthrough();

// ============================================================================
// workflow_list_templates — WorkflowTemplateEngine.getTemplatesForProcess
// ============================================================================

const workflow_list_templates = z.object({
  process_type: z.enum([
    "2d_milling", "3d_milling", "5axis_milling",
    "turning", "mill_turn", "wire_edm", "sinker_edm", "grinding",
    "die_design", "mold_design", "fixture_design"
  ]).optional().describe("Filter by process type (omit for all)"),
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
  workflow_suggest,
  workflow_gap_analysis,
  workflow_list_templates,
  // WIRE-MULTIOP-DIRECT-MS0/U-VICTOR-MULTIOP-DIRECT (slot:victor, 2026-05-26)
  swiss_part_transfer_sequence: z.object({}).passthrough()
    .describe("SwissPartTransferSequenceEngine.generate — generate Swiss-type part-transfer sequence (main↔sub spindle handoff, pickup timing, part-catcher cycle). Returns PartTransferResult."),
  action_sequence_extract: z.object({
    tip: z.unknown().optional().describe("Single tip (ActionExtractionTip shape)"),
    tips: z.array(z.unknown()).optional().describe("Batch of tips (overrides `tip`)"),
    options: z.unknown().optional().describe("Optional extractor options"),
  }).passthrough()
    .describe("ActionSequenceExtractorEngine.extractFromTip or .extractBatch — extract an action sequence (verb + UI target + hotkey + dependencies) from a tribal-tip body. Used by /video-learn + /pdf-learn ingestion pipelines."),
};
