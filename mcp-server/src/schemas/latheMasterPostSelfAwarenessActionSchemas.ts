/**
 * Lathe Master Post Self-Awareness Action Schemas
 * ================================================
 * Zod schemas for lathe master post self-awareness actions (U-LTH27).
 *
 * Actions:
 *   lathe_selfaware_register       — Register a sub-post
 *   lathe_selfaware_detect_drift   — Detect drift for a sub-post
 *   lathe_selfaware_audit          — Audit all sub-posts
 *   lathe_selfaware_get_stats      — Get registry statistics
 *   lathe_selfaware_update_status  — Update validation status
 *   lathe_selfaware_seed_drift     — Seed drift for testing
 *
 * @module schemas/latheMasterPostSelfAwarenessActionSchemas
 * @version 1.0.0
 */

import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

// ─── Shared Schemas ───────────────────────────────────────────────────────

const SubPostDialectSchema = z
  .enum(["okuma", "fanuc", "mitsubishi", "haas", "mazak", "citizen", "generic"])
  .describe("Controller dialect.");

const SubPostFeaturesSchema = z.object({
  cssSupport: z.boolean().describe("Constant surface speed support."),
  cannedCycles: z.array(z.string()).describe("Supported canned cycles."),
  liveTooling: z.boolean().describe("Live tooling support."),
  subSpindle: z.boolean().describe("Sub-spindle support."),
  cAxis: z.boolean().describe("C-axis support."),
  yAxis: z.boolean().describe("Y-axis support."),
  bAxis: z.boolean().describe("B-axis support."),
  barFeeder: z.boolean().describe("Bar feeder integration."),
  partCatcher: z.boolean().describe("Part catcher integration."),
});

const ValidationErrorSchema = z.object({
  code: z.string().describe("Error code."),
  message: z.string().describe("Error message."),
  severity: z.enum(["critical", "major", "minor"]).describe("Error severity."),
  lineNumber: z.number().int().optional().describe("Line number if applicable."),
  block: z.string().optional().describe("G-code block if applicable."),
});

const ValidationStatusSchema = z.object({
  lastValidatedAt: z.string().describe("ISO timestamp of last validation."),
  passed: z.boolean().describe("Whether validation passed."),
  errors: z.array(ValidationErrorSchema).describe("Validation errors."),
  warnings: z.array(z.object({
    code: z.string(),
    message: z.string(),
    suggestion: z.string().optional(),
  })).describe("Validation warnings."),
  parityPercent: z.number().min(0).max(100).describe("Structural parity percentage."),
  safetyCriticalCount: z.number().min(0).describe("Safety-critical divergence count."),
});

const DriftTypeSchema = z.enum([
  "dialect_change",
  "feature_change",
  "validation_failure",
  "parity_drop",
  "safety_divergence",
  "version_mismatch",
  "checksum_mismatch",
  "missing_sub_post",
  "orphaned_sub_post",
]);

// ─── lathe_selfaware_register ─────────────────────────────────────────────

const lathe_selfaware_register = z
  .object({
    id: z.string().min(1).describe("Unique sub-post identifier."),
    name: z.string().min(1).describe("Human-readable sub-post name."),
    dialect: SubPostDialectSchema,
    version: z.string().optional().describe("Version string. Default: 1.0.0."),
    machineIds: z.array(z.string()).optional().describe("Associated machine IDs."),
    features: SubPostFeaturesSchema.optional().describe("Sub-post feature flags."),
  })
  .passthrough();

// ─── lathe_selfaware_detect_drift ─────────────────────────────────────────

const lathe_selfaware_detect_drift = z
  .object({
    subPostId: z.string().min(1).describe("Sub-post ID to check for drift."),
    currentState: z.object({
      dialect: SubPostDialectSchema.optional(),
      version: z.string().optional(),
      features: SubPostFeaturesSchema.optional(),
      validationStatus: ValidationStatusSchema.optional(),
      checksum: z.string().optional(),
    }).optional().describe("Current observed state to compare against registry."),
  })
  .passthrough();

// ─── lathe_selfaware_audit ────────────────────────────────────────────────

const lathe_selfaware_audit = z
  .object({
    includeOrphans: z.boolean().optional().describe("Include orphaned sub-posts. Default: true."),
    parityThreshold: z.number().min(0).max(100).optional().describe("Parity threshold. Default: 95."),
    maxSafetyDivergences: z.number().min(0).optional().describe("Max safety divergences. Default: 0."),
    validateAll: z.boolean().optional().describe("Force revalidation of all. Default: false."),
  })
  .passthrough();

// ─── lathe_selfaware_get_stats ────────────────────────────────────────────

const lathe_selfaware_get_stats = z
  .object({})
  .passthrough();

// ─── lathe_selfaware_update_status ────────────────────────────────────────

const lathe_selfaware_update_status = z
  .object({
    subPostId: z.string().min(1).describe("Sub-post ID to update."),
    status: ValidationStatusSchema.describe("New validation status."),
  })
  .passthrough();

// ─── lathe_selfaware_seed_drift ───────────────────────────────────────────

const lathe_selfaware_seed_drift = z
  .object({
    subPostId: z.string().min(1).describe("Sub-post ID for seeding."),
    driftType: DriftTypeSchema.describe("Type of drift to seed."),
    driftDetails: z.object({
      dialect: SubPostDialectSchema.optional(),
      version: z.string().optional(),
      features: SubPostFeaturesSchema.optional(),
      validationStatus: ValidationStatusSchema.optional(),
      checksum: z.string().optional(),
    }).describe("Drift details to inject."),
  })
  .passthrough();

// ─── Export map ───────────────────────────────────────────────────────────

export const ACTION_LATHE_SELFAWARE_SCHEMAS: ActionSchemaMap = {
  lathe_selfaware_register,
  lathe_selfaware_detect_drift,
  lathe_selfaware_audit,
  lathe_selfaware_get_stats,
  lathe_selfaware_update_status,
  lathe_selfaware_seed_drift,
};
