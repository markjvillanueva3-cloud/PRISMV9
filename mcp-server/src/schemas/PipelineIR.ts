/**
 * PipelineIR -- declarative, pipeline-as-data intermediate representation.
 *
 * PIPELINE-IR-MS0 / U-PIR01 (slot:bravo). PRISM has many imperative pipelines
 * (print-to-program, quote-to-ship, ...) hand-wired in TS. This IR expresses a
 * pipeline as DATA: a DAG of stages, each invoking one `dispatcher:action`, with
 * params that are either literals or references to an upstream stage's output.
 * That lets pipelines be validated, topologically ordered, persisted, diffed, and
 * executed generically (see PipelineIRConverterEngine / PipelineIRExecutorEngine,
 * U-PIR02/U-PIR03) instead of bespoke per-pipeline glue.
 *
 * This file is the FOUNDATION (the contract the converter + executor build on).
 * It enforces STRUCTURE only. Graph integrity (no cycles, no dangling refs, every
 * dependsOn resolvable) is the converter's job -- a structurally-valid IR can still
 * be a semantically-invalid graph, which is exactly why the converter exists.
 *
 * Zod v4. Conventions per src/schemas/*.ts.
 */
import { z } from "zod";

/** Error policy when a stage fails. abort (default) stops the run; continue skips to the next ready stage; retry re-runs up to `retries`. */
export const StageErrorPolicySchema = z.enum(["abort", "continue", "retry"]);
export type StageErrorPolicy = z.infer<typeof StageErrorPolicySchema>;

/**
 * A reference to a prior stage's produced value. `stage` is the producing stage id;
 * `path` (optional dotted path, e.g. "result.value") selects into that stage's output,
 * defaulting to the whole output object.
 */
export const StageRefSchema = z
  .object({
    stage: z.string().min(1, "ref.stage must be a non-empty stage id"),
    path: z.string().min(1).optional(),
  })
  .strict();
export type StageRef = z.infer<typeof StageRefSchema>;

/**
 * A parameter value: EITHER a literal (`{ value: ... }`) OR a reference to an upstream
 * stage output (`{ ref: {...} }`) -- never both, never neither (enforced by the union).
 */
export const ParamSpecSchema = z.union([
  // z.unknown() makes the key OPTIONAL, so require its presence explicitly --
  // otherwise an empty {} would parse as a literal-with-undefined (ambiguous; rejected).
  z.object({ value: z.unknown() }).strict().refine((o) => "value" in o, {
    message: "literal ParamSpec requires a `value` key",
  }),
  z.object({ ref: StageRefSchema }).strict(),
]);
export type ParamSpec = z.infer<typeof ParamSpecSchema>;

/** One pipeline stage: invoke `dispatcher:action` with resolved params after `dependsOn` stages complete. */
export const PipelineStageSchema = z
  .object({
    /** Unique within the pipeline; referenced by other stages' dependsOn / refs. */
    id: z.string().min(1, "stage.id must be non-empty"),
    /** Human label (optional). */
    label: z.string().optional(),
    /** Target MCP dispatcher, e.g. "prism_cad". */
    dispatcher: z.string().min(1, "stage.dispatcher must be non-empty"),
    /** Target action within the dispatcher, e.g. "extract_features". */
    action: z.string().min(1, "stage.action must be non-empty"),
    /** Named params; each is a literal or an upstream ref. Empty object = no params. */
    params: z.record(z.string(), ParamSpecSchema).default({}),
    /** Stage ids that must complete before this stage runs (the DAG edges). */
    dependsOn: z.array(z.string().min(1)).default([]),
    /** Optional gate: run this stage only when truthy. A literal or an upstream ref. */
    condition: ParamSpecSchema.optional(),
    /** Failure policy (default abort). */
    onError: StageErrorPolicySchema.default("abort"),
    /** Max retries when onError = "retry" (ignored otherwise). */
    retries: z.number().int().min(0).max(10).default(0),
  })
  .strict();
export type PipelineStage = z.infer<typeof PipelineStageSchema>;

/** A complete declarative pipeline. */
export const PipelineIRSchema = z
  .object({
    /** Stable pipeline identifier (e.g. "print-to-program"). */
    id: z.string().min(1, "pipeline.id must be non-empty"),
    /** Schema/pipeline version for migration + diffing. */
    version: z.string().min(1).default("1.0.0"),
    description: z.string().optional(),
    /** The stages; at least one. Graph validity is enforced by the converter, not here. */
    stages: z.array(PipelineStageSchema).min(1, "pipeline must have >= 1 stage"),
  })
  .strict();
export type PipelineIR = z.infer<typeof PipelineIRSchema>;

/**
 * A worked example: the print-to-program pipeline expressed as IR.
 * CAD feature extraction -> speed/feed calc (consuming the extracted material) ->
 * toolpath generation (consuming both) -> safety validation gate.
 * Demonstrates literals, upstream refs, dependsOn DAG edges, and an onError policy.
 */
export const PRINT_TO_PROGRAM_IR: PipelineIR = {
  id: "print-to-program",
  version: "1.0.0",
  description: "Upload print -> CAD features -> speed/feed -> toolpath -> safety gate.",
  stages: [
    {
      id: "extract",
      label: "Extract CAD features from the print",
      dispatcher: "prism_cad",
      action: "extract_features",
      params: { source: { value: "upload://print.step" } },
      dependsOn: [],
      onError: "abort",
      retries: 0,
    },
    {
      id: "speed_feed",
      label: "Compute speeds/feeds for the extracted material",
      dispatcher: "prism_calc",
      action: "speed_feed",
      params: {
        material: { ref: { stage: "extract", path: "material" } },
        feature: { ref: { stage: "extract", path: "features.0" } },
      },
      dependsOn: ["extract"],
      onError: "abort",
      retries: 0,
    },
    {
      id: "toolpath",
      label: "Generate toolpath",
      dispatcher: "prism_cam",
      action: "toolpath_generate",
      params: {
        features: { ref: { stage: "extract", path: "features" } },
        speedsFeeds: { ref: { stage: "speed_feed" } },
      },
      dependsOn: ["extract", "speed_feed"],
      onError: "retry",
      retries: 2,
    },
    {
      id: "safety",
      label: "Validate physics safety before emitting",
      dispatcher: "prism_safety",
      action: "validate_physics",
      params: { plan: { ref: { stage: "toolpath" } } },
      dependsOn: ["toolpath"],
      onError: "abort",
      retries: 0,
    },
  ],
};
