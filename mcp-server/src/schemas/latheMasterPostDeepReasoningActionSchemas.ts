/**
 * Lathe Master Post Deep Reasoning Action Schemas — U-LTH28
 * @module schemas/latheMasterPostDeepReasoningActionSchemas
 */

import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

const lathe_deepreason_explain = z.object({
  machineId: z.string().min(1).describe("Machine ID to explain routing for."),
  operation: z.string().optional().describe("Operation type."),
  controller: z.string().optional().describe("Controller override."),
  requireCapabilities: z.array(z.string()).optional().describe("Required capabilities."),
  strictMode: z.boolean().optional().describe("Strict validation mode."),
}).passthrough();

const lathe_deepreason_causal = z.object({
  machineId: z.string().min(1).describe("Machine ID for causal inference."),
  operation: z.string().optional().describe("Operation context."),
}).passthrough();

const lathe_deepreason_counterfactual = z.object({
  machineId: z.string().min(1).describe("Machine ID."),
  hypotheticalChange: z.string().min(1).describe("What-if scenario."),
}).passthrough();

const lathe_deepreason_get_stats = z.object({}).passthrough();

export const ACTION_LATHE_DEEPREASON_SCHEMAS: ActionSchemaMap = {
  lathe_deepreason_explain,
  lathe_deepreason_causal,
  lathe_deepreason_counterfactual,
  lathe_deepreason_get_stats,
};
