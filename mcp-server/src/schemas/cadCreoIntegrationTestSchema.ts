/**
 * cadCreoIntegrationTestSchema — U-CAD-APP-03 (PHASE-48)
 *
 * Headless Creo integration test fixtures: 10 canonical part types, each
 * with scenarios and assertions. The fixture runner is agnostic of the
 * actual Creo process — scenarios are executed against a pluggable
 * scenario driver so CI can run these in either an in-memory stub or a
 * real Creo daemon.
 *
 * schemaVersion: 1.
 *
 * @module schemas/cadCreoIntegrationTestSchema
 */

import { z } from "zod";
import { CREO_FEATURE_KINDS } from "./cadCreoToolkitSchema.js";

// ── Part-type taxonomy (10 canonical families) ─────────────────────────────

export const CREO_PART_TYPES = [
  "bracket",
  "shaft",
  "housing",
  "gear",
  "plate",
  "manifold",
  "impeller",
  "die_punch",
  "fixture_base",
  "sheet_part",
] as const;
export type CreoPartType = (typeof CREO_PART_TYPES)[number];

// ── Scenario step ──────────────────────────────────────────────────────────

export const SCENARIO_STEP_KINDS = [
  "load_model",
  "set_parameter",
  "regenerate",
  "suppress_feature",
  "resume_feature",
  "assert_parameter",
  "assert_feature_status",
  "assert_feature_count",
  "assert_regen_succeeds",
  "assert_regen_fails",
  "save",
] as const;
export type ScenarioStepKind = (typeof SCENARIO_STEP_KINDS)[number];

export const ScenarioStepSchema = z
  .object({
    kind: z.enum(SCENARIO_STEP_KINDS),
    /** Step arguments — interpretation depends on kind. */
    args: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).default({}),
    description: z.string().min(1),
  })
  .strict();

export type ScenarioStep = z.infer<typeof ScenarioStepSchema>;

// ── Expected failure ───────────────────────────────────────────────────────

export const CREO_FAILURE_MODES = [
  "regen_fail",
  "parameter_out_of_range",
  "feature_dependency_break",
  "timeout",
  "missing_datum",
  "none",
] as const;
export type CreoFailureMode = (typeof CREO_FAILURE_MODES)[number];

// ── Scenario ───────────────────────────────────────────────────────────────

export const ScenarioSchema = z
  .object({
    scenarioId: z.string().min(1),
    title: z.string().min(1),
    partType: z.enum(CREO_PART_TYPES),
    modelName: z.string().min(1),
    /** Feature kinds expected to appear in the model tree. */
    expectedFeatures: z.array(z.enum(CREO_FEATURE_KINDS)).default([]),
    steps: z.array(ScenarioStepSchema).nonempty(),
    expectedFailure: z.enum(CREO_FAILURE_MODES).default("none"),
  })
  .strict();

export type Scenario = z.infer<typeof ScenarioSchema>;

// ── Result ──────────────────────────────────────────────────────────────────

export const STEP_RESULTS = ["pass", "fail", "skip"] as const;
export type StepResult = (typeof STEP_RESULTS)[number];

export const StepOutcomeSchema = z
  .object({
    stepIndex: z.number().int().nonnegative(),
    description: z.string(),
    result: z.enum(STEP_RESULTS),
    reason: z.string().optional(),
    durationMs: z.number().nonnegative(),
  })
  .strict();

export type StepOutcome = z.infer<typeof StepOutcomeSchema>;

export const ScenarioResultSchema = z
  .object({
    scenarioId: z.string(),
    partType: z.enum(CREO_PART_TYPES),
    status: z.enum(["pass", "fail", "skip", "expected_failure"]),
    outcomes: z.array(StepOutcomeSchema),
    totalDurationMs: z.number().nonnegative(),
    failureMode: z.enum(CREO_FAILURE_MODES).default("none"),
    reason: z.string().optional(),
  })
  .strict();

export type ScenarioResult = z.infer<typeof ScenarioResultSchema>;

// ── Aggregate report ───────────────────────────────────────────────────────

export const TestReportSchema = z
  .object({
    reportId: z.string(),
    startedAt: z.string(),
    endedAt: z.string(),
    results: z.array(ScenarioResultSchema),
    summary: z
      .object({
        total: z.number().int().nonnegative(),
        passed: z.number().int().nonnegative(),
        failed: z.number().int().nonnegative(),
        skipped: z.number().int().nonnegative(),
        expectedFailures: z.number().int().nonnegative(),
      })
      .strict(),
    byPartType: z
      .object({
        bracket: z.number().int().nonnegative().optional(),
        shaft: z.number().int().nonnegative().optional(),
        housing: z.number().int().nonnegative().optional(),
        gear: z.number().int().nonnegative().optional(),
        plate: z.number().int().nonnegative().optional(),
        manifold: z.number().int().nonnegative().optional(),
        impeller: z.number().int().nonnegative().optional(),
        die_punch: z.number().int().nonnegative().optional(),
        fixture_base: z.number().int().nonnegative().optional(),
        sheet_part: z.number().int().nonnegative().optional(),
      })
      .strict()
      .default({}),
  })
  .strict();

export type TestReport = z.infer<typeof TestReportSchema>;
