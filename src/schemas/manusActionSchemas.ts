/**
 * Manus Dispatcher Action Schemas
 * =================================
 * Per-action Zod schemas for all 11 prism_manus actions.
 * Validated AFTER normalizeParams(), BEFORE engine dispatch.
 *
 * @module schemas/manusActionSchemas
 * @version 1.0.0
 */

import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

// ============================================================================
// REUSABLE FIELD SCHEMAS
// ============================================================================

const optStr = z.string().optional();
const optNum = z.number().optional();

// ============================================================================
// create_task
// ============================================================================

const create_task = z.object({
  prompt: z.string().describe("Task prompt for Claude"),
  mode: z.enum(["quality", "speed", "balanced", "deep"]).optional().describe("Execution mode (default: 'quality')"),
}).passthrough();

// ============================================================================
// task_status
// ============================================================================

const task_status = z.object({
  task_id: z.string().describe("ID of the task to check"),
}).passthrough();

// ============================================================================
// task_result
// ============================================================================

const task_result = z.object({
  task_id: z.string().describe("ID of the task to get result for"),
}).passthrough();

// ============================================================================
// cancel_task
// ============================================================================

const cancel_task = z.object({
  task_id: z.string().describe("ID of the task to cancel"),
}).passthrough();

// ============================================================================
// list_tasks
// ============================================================================

const list_tasks = z.object({
  limit: z.number().int().positive().optional().describe("Max tasks to return (default: 20)"),
}).passthrough();

// ============================================================================
// knowledge_lookup
// ============================================================================

const knowledge_lookup = z.object({
  query: z.string().describe("Research query"),
  depth: z.enum(["standard", "deep"]).optional().describe("Research depth (default: 'standard')"),
}).passthrough();

// ============================================================================
// code_reasoning
// ============================================================================

const code_reasoning = z.object({
  code: z.string().describe("Code to analyze"),
  language: optStr.describe("Programming language (default: 'python')"),
  task_description: optStr.describe("Description of what the code should do"),
}).passthrough();

// ============================================================================
// hook_trigger
// ============================================================================

const hook_trigger = z.object({
  hook_id: z.string().describe("ID of hook to trigger"),
  params: z.record(z.string(), z.unknown()).optional().describe("Parameters to pass to hook"),
}).passthrough();

// ============================================================================
// hook_list
// ============================================================================

const hook_list = z.object({
  domain: optStr.describe("Filter by domain"),
  category: optStr.describe("Filter by category"),
}).passthrough();

// ============================================================================
// hook_chain
// ============================================================================

const hook_chain = z.object({
  start_hook_id: z.string().describe("Starting hook ID for chain traversal"),
  max_depth: z.number().int().positive().optional().describe("Max chain depth (default: 10)"),
}).passthrough();

// ============================================================================
// hook_stats — no params required
// ============================================================================

const hook_stats = z.object({}).passthrough();

// ============================================================================
// EXPORTED SCHEMA MAP
// ============================================================================

export const ACTION_MANUS_SCHEMAS: ActionSchemaMap = {
  create_task,
  task_status,
  task_result,
  cancel_task,
  list_tasks,
  knowledge_lookup,
  code_reasoning,
  hook_trigger,
  hook_list,
  hook_chain,
  hook_stats,
};
