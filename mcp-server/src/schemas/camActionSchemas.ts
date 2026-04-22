/**
 * CAM Action Schemas — Zod validation schemas for camDispatcher actions
 */
import { z } from "zod";

export const ACTION_CAM_SCHEMAS: Record<string, z.ZodType> = {
  lathe_masterpost_regression_run: z.object({
    machines: z.array(z.string()).optional(),
    jobs: z.array(z.string()).optional(),
    validators: z.array(z.enum(["syntax", "safety", "envelope", "dialect", "timing"])).optional(),
    updateBaseline: z.boolean().optional(),
    diffOnly: z.boolean().optional(),
  }),
  lathe_masterpost_regression_lock: z.object({
    cells: z.array(z.object({ machineId: z.string(), jobId: z.string() })).optional(),
    force: z.boolean().optional(),
  }),
  lathe_masterpost_regression_diff: z.object({
    machineId: z.string().optional(),
    jobId: z.string().optional(),
    threshold: z.number().optional(),
  }),
  lathe_masterpost_regression_stats: z.object({}),
  lathe_masterpost_regression_clear: z.object({}),

  // Deep Reasoning Engine actions
  lathe_masterpost_deep_explain: z.object({
    machineId: z.string().describe("Target machine ID"),
    operation: z.string().optional().describe("Operation type (turning, boring, threading, etc.)"),
    constraints: z.record(z.unknown()).optional().describe("Additional constraints"),
  }),
  lathe_masterpost_deep_causal: z.object({
    machineId: z.string().describe("Machine ID for causal inference"),
    operation: z.string().optional().describe("Operation context"),
  }),
  lathe_masterpost_deep_counterfactual: z.object({
    machineId: z.string().describe("Machine ID for counterfactual analysis"),
    hypotheticalChange: z.string().describe("Hypothetical change to analyze"),
  }),
  lathe_masterpost_deep_history: z.object({
    limit: z.number().optional().describe("Max trace entries to return"),
  }),
  lathe_masterpost_deep_stats: z.object({}),
  lathe_masterpost_deep_clear: z.object({}),

  // Ensemble Cross-Check Engine actions
  lathe_masterpost_ensemble_run: z.object({
    machineId: z.string().describe("Machine ID for ensemble run"),
    program: z.string().describe("G-code program to check"),
    operation: z.string().optional().describe("Operation type"),
  }),
  lathe_masterpost_ensemble_candidates: z.object({
    machineId: z.string().describe("Machine ID to find candidates for"),
    operation: z.string().optional().describe("Operation type filter"),
  }),
  lathe_masterpost_ensemble_ambiguous: z.object({
    machineId: z.string().describe("Machine ID to check for ambiguity"),
  }),
  lathe_masterpost_ensemble_divergences: z.object({
    outputs: z.array(z.object({
      postId: z.string(),
      gcode: z.array(z.string()),
    })).describe("Post outputs to compare"),
    threshold: z.number().optional().describe("Divergence threshold (0-1)"),
  }),
  lathe_masterpost_ensemble_history: z.object({
    limit: z.number().optional().describe("Max results to return"),
  }),
  lathe_masterpost_ensemble_stats: z.object({}),
  lathe_masterpost_ensemble_clear: z.object({}),
};
