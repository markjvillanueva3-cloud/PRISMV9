/**
 * nightSHIFT Batch Configuration Parameter Schemas — hyperMILL Settings
 *
 * U-HKC37: Zod schemas for nightSHIFT batch job configuration and behavior settings.
 *
 * AC Python call pattern:
 *   hm.settings.nightshift.set_batch_config(max_parallel_jobs=4, ...)
 *
 * @domain Settings / nightSHIFT
 * @milestone HM-KC-MS7/U-HKC37
 */

import { z } from "zod";

// ============================================================================
// 1. BATCH CONFIG SETTINGS (5 params)
// ============================================================================

export const batchConfigSettingsSchema = z.object({
  max_parallel_jobs: z
    .number()
    .int()
    .min(1)
    .max(16)
    .default(4)
    .describe("Maximum number of toolpath calculation jobs executed concurrently by nightSHIFT (1–16)"),
  job_priority: z
    .enum(["low", "normal", "high", "critical"])
    .default("normal")
    .describe("Default processing priority for nightSHIFT batch jobs"),
  notification_email: z
    .string()
    .email()
    .default("ops@shop.local")
    .describe("Email address to receive nightSHIFT batch completion and error notifications"),
  notification_on_complete: z
    .boolean()
    .default(true)
    .describe("Send an email notification when all batch jobs complete successfully"),
  notification_on_error: z
    .boolean()
    .default(true)
    .describe("Send an email notification if any batch job fails or encounters an error"),
});

export type BatchConfigSettings = z.infer<typeof batchConfigSettingsSchema>;

// ============================================================================
// 2. BATCH BEHAVIOR SETTINGS (5 params)
// ============================================================================

export const batchBehaviorSettingsSchema = z.object({
  auto_post_after_calculate: z
    .boolean()
    .default(false)
    .describe("Automatically run NC post-processing after batch toolpath calculation completes"),
  auto_simulate: z
    .boolean()
    .default(false)
    .describe("Automatically run VIRTUAL Machining simulation after batch calculation (may extend runtime)"),
  retry_on_failure: z
    .boolean()
    .default(true)
    .describe("Automatically retry failed batch jobs once before marking them as permanently failed"),
  max_retries: z
    .number()
    .int()
    .min(0)
    .max(5)
    .default(1)
    .describe("Maximum number of automatic retry attempts for a failed batch job (0–5)"),
  queue_timeout_hours: z
    .number()
    .int()
    .min(1)
    .max(72)
    .default(8)
    .describe("Maximum hours a job may remain queued before being marked as timed out (1–72)"),
});

export type BatchBehaviorSettings = z.infer<typeof batchBehaviorSettingsSchema>;

// ============================================================================
// Schema Map (2 types)
// ============================================================================

/** All nightSHIFT settings schemas keyed by type */
export const NIGHTSHIFT_SCHEMA_MAP: Record<string, z.ZodObject<z.ZodRawShape>> = {
  batch_config: batchConfigSettingsSchema,
  batch_behavior: batchBehaviorSettingsSchema,
};

export type NightShiftSchemaType = keyof typeof NIGHTSHIFT_SCHEMA_MAP;

// ============================================================================
// Metadata
// ============================================================================

export interface NightShiftMeta {
  paramCount: number;
  acPythonSetter: string;
  description: string;
}

export const NIGHTSHIFT_METADATA: Record<string, NightShiftMeta> = {
  batch_config: {
    paramCount: 5,
    acPythonSetter: "hm.settings.nightshift.set_batch_config",
    description: "Configure parallel job count, priority, and email notification settings for nightSHIFT batches",
  },
  batch_behavior: {
    paramCount: 5,
    acPythonSetter: "hm.settings.nightshift.set_batch_behavior",
    description: "Configure auto-post, auto-simulate, retry behavior, and queue timeout for nightSHIFT batches",
  },
};

// ============================================================================
// Computed Totals
// ============================================================================

/** Total parameter count across all nightSHIFT settings schemas */
export const NIGHTSHIFT_TOTAL_PARAM_COUNT = Object.values(NIGHTSHIFT_METADATA).reduce(
  (sum, meta) => sum + meta.paramCount,
  0,
);
