/**
 * Lathe Post-Generator Dispatcher Action Schemas
 * ==============================================
 * Per-action Zod schemas for lathe post-processor generator actions
 * wired through camDispatcher (U-LTH23).
 *
 * Actions:
 *   lathe_postgen_ingest     — Ingest controller spec → structured metadata
 *   lathe_postgen_skeleton   — Generate post skeleton from dialect
 *   lathe_postgen_transfer   — Transfer knowledge from one controller to another
 *   lathe_postgen_validate   — Run 27 PP validators on generated G-code
 *   lathe_postgen_test       — Generate regression tests from sample programs
 *   lathe_postgen_register   — Query/register in post knowledge graph
 *   lathe_postgen_feedback   — Active learning from shop-floor failures
 *   lathe_postgen_uncertainty — Ensemble-based confidence scoring
 *
 * @module schemas/lathePostgenActionSchemas
 * @version 1.0.0
 */

import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

// ─── lathe_postgen_ingest ─────────────────────────────────────────────────

const lathe_postgen_ingest = z
  .object({
    spec_text: z
      .string()
      .min(1)
      .optional()
      .describe(
        "Raw controller specification text (manual excerpt, programming guide). Required unless spec_file provided.",
      ),
    spec_file: z
      .string()
      .optional()
      .describe("Path to spec file (PDF/TXT). Alternative to spec_text."),
    controller_hint: z
      .string()
      .optional()
      .describe(
        "Hint for controller identification (e.g. 'Okuma OSP-P300L', 'Fanuc 31i'). Helps parsing.",
      ),
  })
  .refine((d) => d.spec_text || d.spec_file, {
    message: "Either spec_text or spec_file must be provided",
  });

// ─── lathe_postgen_skeleton ───────────────────────────────────────────────

const lathe_postgen_skeleton = z
  .object({
    controller: z
      .string()
      .min(1)
      .describe("Target controller ID (e.g. 'okuma_osp_p300l', 'fanuc_31i_turning')."),
    dialect: z
      .string()
      .optional()
      .describe(
        "G-code dialect override. If omitted, auto-detected from controller.",
      ),
    features: z
      .array(z.string())
      .optional()
      .describe(
        "Required post features (e.g. ['live_tooling', 'sub_spindle', 'y_axis']).",
      ),
    reference_programs: z
      .array(z.string())
      .optional()
      .describe("Sample G-code programs for pattern extraction."),
  })
  .passthrough();

// ─── lathe_postgen_transfer ───────────────────────────────────────────────

const lathe_postgen_transfer = z
  .object({
    source_controller: z
      .string()
      .min(1)
      .describe("Source controller ID to transfer from (e.g. 'fanuc_31i')."),
    target_controller: z
      .string()
      .min(1)
      .describe("Target controller ID to transfer to (e.g. 'mitsubishi_m80')."),
    transfer_mode: z
      .enum(["full", "partial", "cycles_only", "macros_only"])
      .optional()
      .describe("Transfer scope. Default: 'full'."),
  })
  .passthrough();

// ─── lathe_postgen_validate ───────────────────────────────────────────────

const lathe_postgen_validate = z
  .object({
    gcode: z
      .union([z.string(), z.array(z.string())])
      .describe("G-code program to validate (string or array of lines)."),
    controller: z
      .string()
      .min(1)
      .describe("Controller ID for dialect-aware validation."),
    validator_categories: z
      .array(z.string())
      .optional()
      .describe(
        "Validator categories to run (e.g. ['arc', 'tool_change', 'spindle']). Default: all.",
      ),
    strict_mode: z
      .boolean()
      .optional()
      .describe("When true, warnings become errors. Default: false."),
  })
  .passthrough();

// ─── lathe_postgen_test ───────────────────────────────────────────────────

const lathe_postgen_test = z
  .object({
    gcode: z
      .union([z.string(), z.array(z.string())])
      .describe("G-code program to extract test patterns from."),
    program_id: z
      .string()
      .min(1)
      .describe("Unique program identifier for test naming."),
    controller: z
      .string()
      .min(1)
      .describe("Controller ID for dialect context."),
    generate_vitest: z
      .boolean()
      .optional()
      .describe("Generate Vitest code. Default: true."),
  })
  .passthrough();

// ─── lathe_postgen_register ───────────────────────────────────────────────

const lathe_postgen_register = z
  .object({
    controller_id: z
      .string()
      .min(1)
      .describe("Controller ID to query or register."),
    query_type: z
      .enum([
        "get_cycles",
        "get_features",
        "get_validators",
        "compatible_dialects",
        "infer_properties",
        "find_path",
      ])
      .optional()
      .describe("Type of knowledge graph query. If omitted, returns node info."),
    query_params: z
      .record(z.string(), z.unknown())
      .optional()
      .describe(
        "Additional params for query (e.g. {manufacturer, features} for infer_properties).",
      ),
  })
  .passthrough();

// ─── lathe_postgen_feedback ───────────────────────────────────────────────

const lathe_postgen_feedback = z
  .object({
    operation: z
      .enum([
        "queue_failure",
        "categorize",
        "propose_correction",
        "verify",
        "incorporate",
        "regenerate",
        "get_metrics",
      ])
      .describe("Feedback operation type."),
    program_id: z
      .string()
      .optional()
      .describe("Program ID (required for queue_failure)."),
    controller: z
      .string()
      .optional()
      .describe("Controller ID (required for queue_failure)."),
    description: z
      .string()
      .optional()
      .describe("Failure description (required for queue_failure, categorize)."),
    machine_message: z
      .string()
      .optional()
      .describe("Machine error message from alarm/fault."),
    severity: z
      .enum(["critical", "major", "minor", "cosmetic"])
      .optional()
      .describe("Severity level for queue_failure."),
    failure_id: z
      .string()
      .optional()
      .describe("Failure ID (required for propose_correction, verify, incorporate)."),
    correction: z
      .string()
      .optional()
      .describe("Correction text (required for verify)."),
    gcode: z
      .union([z.string(), z.array(z.string())])
      .optional()
      .describe("G-code to regenerate with learned rules (for regenerate)."),
  })
  .passthrough();

// ─── lathe_postgen_uncertainty ────────────────────────────────────────────

const lathe_postgen_uncertainty = z
  .object({
    operation: z
      .enum([
        "analyze_block",
        "analyze_program",
        "get_flagged",
        "check_production_ready",
        "get_config",
      ])
      .describe("Uncertainty analysis operation."),
    gcode: z
      .union([z.string(), z.array(z.string())])
      .optional()
      .describe("G-code to analyze (required for analyze_* and check_*)."),
    program_id: z
      .string()
      .optional()
      .describe("Program ID (required for analyze_program)."),
    controller: z
      .string()
      .optional()
      .describe("Controller ID (required for analyze_program)."),
    line_number: z
      .number()
      .int()
      .positive()
      .optional()
      .describe("Line number for analyze_block. Default: 1."),
    config: z
      .object({
        ensemble_size: z.number().int().min(2).max(20).optional(),
        disagreement_threshold: z.number().min(0).max(1).optional(),
        complexity_weight: z.number().min(0).max(1).optional(),
      })
      .optional()
      .describe("Uncertainty engine configuration overrides."),
  })
  .passthrough();

// ─── lathe_postgen_full ───────────────────────────────────────────────────

const lathe_postgen_full = z
  .object({
    controller_hint: z
      .string()
      .min(1)
      .describe("Controller identification hint (e.g. 'mitsubishi-m80-l', 'fanuc-31i-t')."),
    spec_text: z
      .string()
      .optional()
      .describe("Raw controller specification text (optional if using built-in)."),
    spec_file: z
      .string()
      .optional()
      .describe("Path to spec file (PDF/TXT). Alternative to spec_text."),
    features: z
      .array(z.string())
      .optional()
      .describe("Required post features (e.g. ['live_tooling', 'sub_spindle'])."),
    reference_programs: z
      .array(z.string())
      .optional()
      .describe("Sample G-code programs for pattern extraction and testing."),
    transfer_from: z
      .string()
      .optional()
      .describe("Source controller ID to transfer knowledge from."),
    include_tests: z
      .boolean()
      .optional()
      .describe("Generate regression tests. Default: true."),
    register: z
      .boolean()
      .optional()
      .describe("Register in knowledge graph after validation. Default: true."),
    strict_mode: z
      .boolean()
      .optional()
      .describe("Treat warnings as errors. Default: false."),
    output_dir: z
      .string()
      .optional()
      .describe("Output directory for generated post files."),
  })
  .passthrough();

// ─── Export map ───────────────────────────────────────────────────────────

export const ACTION_LATHE_POSTGEN_SCHEMAS: ActionSchemaMap = {
  lathe_postgen_ingest,
  lathe_postgen_skeleton,
  lathe_postgen_transfer,
  lathe_postgen_validate,
  lathe_postgen_test,
  lathe_postgen_register,
  lathe_postgen_feedback,
  lathe_postgen_uncertainty,
  lathe_postgen_full,
};
