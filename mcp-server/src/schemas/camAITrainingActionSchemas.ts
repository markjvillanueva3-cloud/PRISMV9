/**
 * camAITrainingActionSchemas — CAM-AI-TRAINING-MS0/U-CAMT-B-DISP
 *
 * Zod schemas for the camAITrainingDispatcher actions. Each schema is the
 * sole source of truth for parameter validation at the dispatcher boundary.
 */
import { z } from "zod";

/** Common Zod refinement: non-empty trimmed string. */
const NonEmptyString = z.string().min(1, "must be non-empty");

export const CAM_AI_TRAINING_ACTION_SCHEMAS = {
  // Taxonomy (B01) — 5 actions
  cam_op_taxonomy_operations: z.object({}),
  cam_op_taxonomy_spec: z.object({
    op: NonEmptyString,
  }),
  cam_op_taxonomy_by_family: z.object({}),
  cam_op_taxonomy_per_software: z.object({
    op: NonEmptyString,
    system: NonEmptyString,
  }),
  cam_op_taxonomy_coverage: z.object({}),

  // Input-schema (B02) — 4 actions
  cam_input_schema_get: z.object({
    op: NonEmptyString,
    system: NonEmptyString,
  }),
  cam_input_schema_validate: z.object({
    op: NonEmptyString,
    system: NonEmptyString,
    values: z.record(z.string(), z.unknown()).default({}),
  }),
  cam_input_schema_params: z.object({
    op: NonEmptyString,
    system: NonEmptyString,
  }),
  cam_input_schema_coverage: z.object({}),

  // Template generator (B03) — 4 actions
  cam_template_generate: z.object({
    op: NonEmptyString,
    system: NonEmptyString,
    featureClass: NonEmptyString,
    overrides: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
  }),
  cam_template_for_op: z.object({
    op: NonEmptyString,
    featureClass: NonEmptyString,
    overrides: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
  }),
  cam_template_all: z.object({}),
  cam_template_stats: z.object({}),

  // Provenance ledger (A09) — 3 actions
  cam_provenance_check: z.object({
    record: z.record(z.string(), z.unknown()),
  }),
  cam_provenance_aggregate: z.object({}),
  cam_provenance_reconcile: z.object({
    catalog: z.array(z.string()),
  }),

  // Click-sequence (B-CLICK) — 3 actions
  cam_click_sequence_build: z.object({
    op: NonEmptyString,
    system: NonEmptyString,
    featureClass: NonEmptyString,
    overrides: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
  }),
  cam_click_sequence_from_catalog: z.object({
    op: NonEmptyString,
    system: NonEmptyString,
    featureClass: NonEmptyString,
    catalog: z.record(z.string(), z.unknown()),
    overrides: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
  }),
  cam_click_param_label: z.object({
    system: NonEmptyString,
    canonicalId: NonEmptyString,
  }),
};

export type CAMAITrainingActionSchemaKey = keyof typeof CAM_AI_TRAINING_ACTION_SCHEMAS;
