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
};
