/**
 * Lathe Post-Generator Action Schemas — LATHE-MASTER U-LTH23
 *
 * Schemas for 8 lathe_postgen_* actions wired through camDispatcher.
 */

import { z } from "zod";

// ── Shared Schemas ──────────────────────────────────────────────────────────

const ControllerSpecSchema = z.object({
  manufacturer: z.string(),
  model: z.string(),
  version: z.string().optional(),
  dialect: z.string().optional(),
  features: z.array(z.string()).optional(),
  cycles: z.array(z.string()).optional(),
});

const GCodeBlockSchema = z.string();

const UncertaintyCategorySchema = z.enum([
  "syntax", "motion", "tooling", "spindle", "coolant",
  "cycle", "coordinates", "safety", "timing", "unknown",
]);

const RiskLevelSchema = z.enum(["low", "medium", "high", "critical"]);

// ── Action Schemas ──────────────────────────────────────────────────────────

export const ACTION_LATHE_POSTGEN_SCHEMAS = {
  lathe_postgen_ingest: z.object({
    spec_text: z.string().optional(),
    spec_url: z.string().optional(),
    spec_file: z.string().optional(),
    controller_hint: z.string().optional(),
  }).refine(
    (data) => data.spec_text || data.spec_url || data.spec_file,
    { message: "At least one of spec_text, spec_url, or spec_file required" }
  ),

  lathe_postgen_skeleton: z.object({
    controller: z.string(),
    dialect: z.string().optional(),
    features: z.array(z.string()).optional(),
    reference_programs: z.array(z.string()).optional(),
  }),

  lathe_postgen_transfer: z.object({
    source_controller: z.string(),
    target_controller: z.string(),
    source_post: z.string().optional(),
    transfer_mode: z.enum(["full", "cycles_only", "structure_only"]).optional(),
  }),

  lathe_postgen_validate: z.object({
    gcode: z.array(GCodeBlockSchema),
    controller: z.string(),
    validator_categories: z.array(z.string()).optional(),
    strict_mode: z.boolean().optional(),
  }),

  lathe_postgen_test: z.object({
    gcode: z.array(GCodeBlockSchema),
    program_id: z.string(),
    controller: z.string(),
    generate_vitest: z.boolean().optional(),
  }),

  lathe_postgen_register: z.object({
    controller_id: z.string(),
    controller_spec: ControllerSpecSchema.optional(),
    query_type: z.enum([
      "get_cycles", "get_features", "get_validators",
      "compatible_dialects", "infer_properties", "find_path",
    ]).optional(),
    query_params: z.record(z.unknown()).optional(),
  }),

  lathe_postgen_feedback: z.object({
    operation: z.enum([
      "queue_failure", "categorize", "propose_correction",
      "verify", "incorporate", "regenerate", "get_metrics",
    ]),
    failure_id: z.string().optional(),
    program_id: z.string().optional(),
    controller: z.string().optional(),
    description: z.string().optional(),
    machine_message: z.string().optional(),
    severity: z.enum(["critical", "major", "minor", "cosmetic"]).optional(),
    correction: z.object({
      original_block: z.string(),
      corrected_block: z.string(),
      rule_description: z.string(),
    }).optional(),
  }),

  lathe_postgen_uncertainty: z.object({
    operation: z.enum([
      "analyze_block", "analyze_program", "get_flagged",
      "check_production_ready", "get_config",
    ]),
    gcode: z.union([z.string(), z.array(GCodeBlockSchema)]).optional(),
    program_id: z.string().optional(),
    controller: z.string().optional(),
    line_number: z.number().optional(),
    config: z.object({
      num_models: z.number().optional(),
      dropout_rate: z.number().optional(),
      disagreement_threshold: z.number().optional(),
      min_confidence_threshold: z.number().optional(),
    }).optional(),
  }),
};

export type LathePostgenIngestParams = z.infer<typeof ACTION_LATHE_POSTGEN_SCHEMAS.lathe_postgen_ingest>;
export type LathePostgenSkeletonParams = z.infer<typeof ACTION_LATHE_POSTGEN_SCHEMAS.lathe_postgen_skeleton>;
export type LathePostgenTransferParams = z.infer<typeof ACTION_LATHE_POSTGEN_SCHEMAS.lathe_postgen_transfer>;
export type LathePostgenValidateParams = z.infer<typeof ACTION_LATHE_POSTGEN_SCHEMAS.lathe_postgen_validate>;
export type LathePostgenTestParams = z.infer<typeof ACTION_LATHE_POSTGEN_SCHEMAS.lathe_postgen_test>;
export type LathePostgenRegisterParams = z.infer<typeof ACTION_LATHE_POSTGEN_SCHEMAS.lathe_postgen_register>;
export type LathePostgenFeedbackParams = z.infer<typeof ACTION_LATHE_POSTGEN_SCHEMAS.lathe_postgen_feedback>;
export type LathePostgenUncertaintyParams = z.infer<typeof ACTION_LATHE_POSTGEN_SCHEMAS.lathe_postgen_uncertainty>;
