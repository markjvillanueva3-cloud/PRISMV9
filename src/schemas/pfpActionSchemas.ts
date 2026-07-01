/**
 * Zod action schemas for prism_pfp dispatcher (6 actions)
 *
 * - `.passthrough()` on all schemas: extra params flow through (hooks, metadata, debug)
 * - Only enforce fields the engine actually reads
 */

import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

const get_dashboard = z.object({}).passthrough();

const assess_risk = z.object({
  dispatcher: z.string().describe("Target dispatcher name"),
  action: z.string().optional().describe("Target action within dispatcher"),
  target_action: z.string().optional().describe("Alias for action"),
  call_number: z.number().optional().describe("Call sequence number (default: 0)"),
  context_depth: z.number().optional().describe("Context depth percentage (default: 0)"),
  param_keys: z.array(z.string()).optional().describe("Parameter key names for pattern matching"),
}).passthrough();

const get_patterns = z.object({
  type: z.string().optional().describe("Filter by pattern type"),
}).passthrough();

const get_history = z.object({
  dispatcher: z.string().optional().describe("Filter history by dispatcher"),
  limit: z.number().optional().describe("Max records to return (default: 50)"),
}).passthrough();

const force_extract = z.object({}).passthrough();

const update_config = z.object({}).passthrough();

export const ACTION_PFP_SCHEMAS: ActionSchemaMap = {
  get_dashboard,
  assess_risk,
  get_patterns,
  get_history,
  force_extract,
  update_config,
};
