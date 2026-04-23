/**
 * cadCatiaIntegrationTestSchema — U-CAD-APP-06 (PHASE-48)
 *
 * Headless CATIA V5/V6 integration-test fixtures driven through CAA batch
 * (`CATStart.exe -env <env> -direnv <dir> /batch`). Defines a taxonomy of
 * 10 canonical CATIA part / product families, a rich scenario DSL covering
 * parameter changes, Update cycles, feature activation, EKL relations, PLM
 * lifecycle, and the standard CATIA failure modes observed in CAA batches.
 *
 * schemaVersion: 1.
 *
 * Sources:
 *  - CATIA CAA V5 Batch + Runtime Environment docs (mkrun, CATStart)
 *  - CATIA V5 CAA Encyclopedia: Part/Product Structure, Knowledge, PLM Access
 *  - Dassault Systèmes Enterprise Test Cookbook (part fixtures, regen cases)
 *
 * @module schemas/cadCatiaIntegrationTestSchema
 */

import { z } from "zod";
import {
  CATIA_FEATURE_KINDS,
  CATIA_MODEL_KINDS,
  CATIA_PLM_STATES,
} from "./cadCatiaCaaV5Schema.js";

// ── Part/product family taxonomy (10 canonical CATIA families) ─────────────

export const CATIA_PART_FAMILIES = [
  "bracket",
  "shaft",
  "housing",
  "gear",
  "plate",
  "manifold",
  "impeller",
  "die_cavity",
  "fixture_base",
  "sheet_part",
] as const;
export type CatiaPartFamily = (typeof CATIA_PART_FAMILIES)[number];

/** File-extension hint per family (CATIA decides by top-type on load). */
export const CATIA_FAMILY_DEFAULT_KIND: Readonly<
  Record<CatiaPartFamily, (typeof CATIA_MODEL_KINDS)[number]>
> = Object.freeze({
  bracket: "CATPart",
  shaft: "CATPart",
  housing: "CATProduct",
  gear: "CATPart",
  plate: "CATPart",
  manifold: "CATProduct",
  impeller: "CATPart",
  die_cavity: "CATPart",
  fixture_base: "CATProduct",
  sheet_part: "CATPart",
});

// ── Scenario step kinds ────────────────────────────────────────────────────

export const CATIA_SCENARIO_STEP_KINDS = [
  "load_model",
  "set_parameter",
  "update_model",
  "deactivate_feature",
  "activate_feature",
  "run_ekl_relation",
  "set_plm_state",
  "save",
  "assert_parameter",
  "assert_feature_status",
  "assert_feature_count",
  "assert_update_succeeds",
  "assert_update_fails",
  "assert_ekl_verdict",
  "assert_plm_state",
  "assert_update_count",
] as const;
export type CatiaScenarioStepKind =
  (typeof CATIA_SCENARIO_STEP_KINDS)[number];

export const CatiaScenarioStepSchema = z
  .object({
    kind: z.enum(CATIA_SCENARIO_STEP_KINDS),
    /** Free-form arguments — interpretation depends on `kind`. */
    args: z
      .record(
        z.string(),
        z.union([z.string(), z.number(), z.boolean(), z.null()]),
      )
      .default({}),
    description: z.string().min(1),
    /** Per-step wall-clock budget; if exceeded driver may mark timeout. */
    timeoutMs: z.number().int().positive().default(30_000),
  })
  .strict();

export type CatiaScenarioStep = z.infer<typeof CatiaScenarioStepSchema>;

// ── Failure mode taxonomy ──────────────────────────────────────────────────

/**
 * Standard CATIA CAA batch failure modes. These map onto the `CATError`
 * families surfaced by CAA (Update, Knowledge, Structure, License, Io…).
 */
export const CATIA_FAILURE_MODES = [
  "update_error",
  "constraint_over_defined",
  "missing_reference",
  "knowledge_formula_error",
  "ekl_check_failed",
  "plm_transition_blocked",
  "license_unavailable",
  "io_error",
  "timeout",
  "parameter_out_of_range",
  "none",
] as const;
export type CatiaFailureMode = (typeof CATIA_FAILURE_MODES)[number];

// ── Runtime env fixture ────────────────────────────────────────────────────

/**
 * CAA batch environment fixture — matches what you would pass on the
 * `CATStart -env <env> -direnv <dir>` command line.
 */
export const CatiaEnvFixtureSchema = z
  .object({
    envName: z.string().min(1),
    envDir: z.string().min(1),
    catiaVersion: z.string().min(1).describe("e.g. 'V5-6R2021' / 'V6R2023x'"),
    locale: z
      .enum(["en_US", "fr_FR", "de_DE", "ja_JP", "zh_CN", "es_ES"])
      .default("en_US"),
    /** CATIA unit system to force at load (optional). */
    unitSystem: z
      .enum(["mks", "mmks", "ips", "fps"])
      .default("mmks"),
    /** Requested CAA license tokens (e.g. MD2, PR1, AS1). */
    licenses: z.array(z.string().min(1)).default([]),
    /** Extra env vars to set before launching CATStart. */
    envVars: z.record(z.string(), z.string()).default({}),
  })
  .strict();

export type CatiaEnvFixture = z.infer<typeof CatiaEnvFixtureSchema>;

// ── Scenario ───────────────────────────────────────────────────────────────

export const CatiaScenarioSchema = z
  .object({
    scenarioId: z.string().min(1),
    title: z.string().min(1),
    family: z.enum(CATIA_PART_FAMILIES),
    /** Deliverable kind (CATPart / CATProduct / CATDrawing / CATAnalysis). */
    modelKind: z.enum(CATIA_MODEL_KINDS),
    modelName: z
      .string()
      .min(1)
      .describe("CATIA file name, e.g. 'BRACKET.CATPart'"),
    expectedFeatures: z.array(z.enum(CATIA_FEATURE_KINDS)).default([]),
    env: CatiaEnvFixtureSchema,
    steps: z.array(CatiaScenarioStepSchema).nonempty(),
    /** If non-"none", scenario is a negative test: it is expected to fail. */
    expectedFailure: z.enum(CATIA_FAILURE_MODES).default("none"),
    /** Tags for CI routing (e.g. "smoke", "nightly", "ekl", "plm"). */
    tags: z.array(z.string().min(1)).default([]),
    /** Retry budget for flaky daemons. */
    maxRetries: z.number().int().nonnegative().default(0),
  })
  .strict();

export type CatiaScenario = z.infer<typeof CatiaScenarioSchema>;

// ── Results ────────────────────────────────────────────────────────────────

export const CATIA_STEP_RESULTS = ["pass", "fail", "skip"] as const;
export type CatiaStepResult = (typeof CATIA_STEP_RESULTS)[number];

export const CatiaStepOutcomeSchema = z
  .object({
    stepIndex: z.number().int().nonnegative(),
    description: z.string(),
    result: z.enum(CATIA_STEP_RESULTS),
    reason: z.string().optional(),
    durationMs: z.number().nonnegative(),
    /** True when step hit its per-step timeout. */
    timedOut: z.boolean().default(false),
  })
  .strict();

export type CatiaStepOutcome = z.infer<typeof CatiaStepOutcomeSchema>;

export const CATIA_SCENARIO_STATUS = [
  "pass",
  "fail",
  "skip",
  "expected_failure",
] as const;
export type CatiaScenarioStatus = (typeof CATIA_SCENARIO_STATUS)[number];

export const CatiaScenarioResultSchema = z
  .object({
    scenarioId: z.string(),
    family: z.enum(CATIA_PART_FAMILIES),
    modelKind: z.enum(CATIA_MODEL_KINDS),
    status: z.enum(CATIA_SCENARIO_STATUS),
    outcomes: z.array(CatiaStepOutcomeSchema),
    totalDurationMs: z.number().nonnegative(),
    failureMode: z.enum(CATIA_FAILURE_MODES).default("none"),
    reason: z.string().optional(),
    /** Number of full retries consumed before reaching this verdict. */
    retryCount: z.number().int().nonnegative().default(0),
  })
  .strict();

export type CatiaScenarioResult = z.infer<typeof CatiaScenarioResultSchema>;

// ── Aggregate report ───────────────────────────────────────────────────────

const FAMILY_COUNT_SCHEMA = z
  .object(
    Object.fromEntries(
      CATIA_PART_FAMILIES.map((f) => [
        f,
        z.number().int().nonnegative().optional(),
      ]),
    ) as Record<CatiaPartFamily, z.ZodOptional<z.ZodNumber>>,
  )
  .strict();

export const CatiaTestReportSchema = z
  .object({
    reportId: z.string(),
    startedAt: z.string(),
    endedAt: z.string(),
    results: z.array(CatiaScenarioResultSchema),
    summary: z
      .object({
        total: z.number().int().nonnegative(),
        passed: z.number().int().nonnegative(),
        failed: z.number().int().nonnegative(),
        skipped: z.number().int().nonnegative(),
        expectedFailures: z.number().int().nonnegative(),
      })
      .strict(),
    byFamily: FAMILY_COUNT_SCHEMA.default({}),
    byStatus: z
      .object({
        pass: z.number().int().nonnegative().default(0),
        fail: z.number().int().nonnegative().default(0),
        skip: z.number().int().nonnegative().default(0),
        expected_failure: z.number().int().nonnegative().default(0),
      })
      .strict()
      .default(() => ({ pass: 0, fail: 0, skip: 0, expected_failure: 0 })),
    p50DurationMs: z.number().nonnegative().default(0),
    p95DurationMs: z.number().nonnegative().default(0),
  })
  .strict();

export type CatiaTestReport = z.infer<typeof CatiaTestReportSchema>;

// Re-export PLM states list for test-side ergonomic imports.
export { CATIA_PLM_STATES };
