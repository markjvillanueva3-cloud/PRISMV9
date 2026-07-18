import { z } from "zod";

/**
 * CAM-DRIVE RECIPE SCHEMA (CAMDRIVE-RECIPE-ENGINE-MS0)
 *
 * Zod v4 contract for the autonomous CAM-drive replay artifacts:
 *  - a parameterized RECIPE (state/shared/cam-drive/recipes/<id>.json) the
 *    CAMDriveRecipeEngine compiles + executes with ZERO LLM, and
 *  - the DECISION-RULE REGISTRY (state/shared/cam-drive/decision-rules.json)
 *    whose rules populate each step's bodyTemplate placeholders.
 *
 * A recipe is a strict superset of an ExtractedAction[] (VideoActionExtractorEngine
 * output): a compiler maps each ExtractedAction into a Step, attaching
 * decisionRuleRef + gate + verify the raw extraction lacks — so video-captured
 * AND live-captured procedures share ONE replay format.
 *
 * Provenance: workflow cam-drive-automation-map (2026-05-31). Wires into existing
 * PRISM infra (Fusion360LiveBridgeEngine replay surface, CAMDriveGateEngine fuse,
 * ActionTraceEngine, OutcomeCaptureBusEngine learning loop) — never inlines
 * physics constants (those resolve from src/physics/constants.ts at compile time).
 */

/** Pipeline stage for a recipe step (CAM-drive granularity, mapped to DOMAIN-PIPELINE-MS0). */
export const camDriveStageSchema = z
  .enum([
    "doc_resolve",
    "doc_saveas",
    "part_insert",
    "part_raise",
    "stock_generate",
    "fixture_mate",
    "setup_create",
    "tool_assign",
    "op_create",
    "toolpath_generate",
    "toolpath_status",
    "geometry_probe",
    "doc_save",
    "safety_validate",
    "post",
  ])
  .describe("CAM-drive pipeline stage this step belongs to");

/** Where a step actuates: a prism_cam dispatcher action and/or the Fusion360LiveBridge HTTP path. */
export const camDriveEndpointSchema = z
  .object({
    dispatcher: z.string().describe("MCP dispatcher, e.g. 'prism_cam'").optional(),
    dispatcherAction: z
      .string()
      .nullable()
      .describe("EXACT wired prism_cam action, e.g. cam_drive_create_operation; null for bridge-only steps")
      .optional(),
    httpPath: z
      .string()
      .nullable()
      .describe("Fusion360LiveBridge endpoint the dispatcher/engine hits, e.g. /cam/operation")
      .optional(),
    method: z.enum(["POST", "GET"]).describe("HTTP method").optional(),
  })
  .describe("Dual address for the step: MCP-first, bridge-fallback (both real)");

/** Safety-gate declaration — the CAMDriveGateEngine fuse for an actuating step. */
export const camDriveGateSchema = z
  .object({
    required: z.boolean().describe("true for op_create + post; gate must clear before actuation"),
    system: z.literal("fusion360").describe("CAM system the catalog gate validates against").optional(),
    catalogOperation: z.string().describe("catalog op id validated (NOT vendor operation_type)").optional(),
    allowUnknownParams: z
      .boolean()
      .describe("advisory unknown-param mode (catalogs ~55-59% complete)")
      .optional(),
  })
  .describe("CAMDriveGateEngine.gate() declaration for this step");

/** Post-action assertion the engine checks BEFORE advancing (replay-safety). */
export const camDriveVerifySchema = z
  .object({
    kind: z
      .enum(["field_truthy", "field_equals", "field_gte", "status_success", "job_complete"])
      .describe("assertion kind"),
    path: z.string().describe("dot-path into the result, e.g. 'success' or 'job.status'"),
    expected: z.unknown().describe("expected value for field_equals/field_gte").optional(),
    timeoutMs: z.number().int().positive().describe("poll timeout for job_complete").optional(),
    note: z.string().optional(),
  })
  .describe("Post-action verification assertion");

/** Deterministic, NO-LLM recovery policy on step failure. */
export const camDriveOnFailSchema = z
  .object({
    policy: z
      .enum(["abort", "retry", "gate_to_operator", "skip_if_optional"])
      .describe("deterministic recovery policy"),
    maxRetries: z.number().int().nonnegative().describe("recipe-level retry for transient failures").optional(),
    operatorPrompt: z.string().describe("prompt shown for gate_to_operator").optional(),
    captureOutcome: z.boolean().describe("emit a (failure) outcome to the learning loop — negative signal is signal").optional(),
  })
  .describe("Failure recovery policy");

/** One parameterized, replayable step. */
export const camDriveStepSchema = z
  .object({
    stepId: z.number().int().positive().describe("1-based ordinal"),
    stage: camDriveStageSchema,
    name: z.string().describe("human label, e.g. 'Adaptive rough Op-1'"),
    status: z.enum(["proven", "planned"]).describe("proven=executed live; planned=mapped, not yet run").optional(),
    action: z.string().describe("semantic action label").optional(),
    endpoint: camDriveEndpointSchema,
    bodyTemplate: z
      .record(z.string(), z.unknown())
      .describe("JSON body with ${...} placeholders the compiler resolves from decisionRule outputs + live probe"),
    decisionRuleRef: z
      .array(z.string())
      .describe("ids into the decision-rule registry that POPULATE the placeholders"),
    gate: camDriveGateSchema.optional(),
    verify: camDriveVerifySchema,
    onFail: camDriveOnFailSchema,
    optional: z.boolean().describe("skip_if_optional eligible (e.g. chamfer on a part with no chamfer feature)").optional(),
    featureRef: z.string().describe("for per-feature op_create steps — the RecognizedFeature this op machines").optional(),
    note: z.string().optional(),
  })
  .describe("A single parameterized CAM-drive step");

/** Recipe root — adopts PRISM state-file conventions (schemaVersion + generatedAt + advisoryOnly + mustHumanVerify). */
export const camDriveRecipeSchema = z
  .object({
    schemaVersion: z.string().describe("SemVer; major bump = breaking step-contract change"),
    recipeId: z.string().describe("stable id, e.g. UPSET_OP1_5AX_2026-05-31"),
    generatedAt: z.string().describe("ISO-8601 date or datetime"),
    advisoryOnly: z.boolean().describe("false = canonical executable contract"),
    mustHumanVerify: z.boolean().describe("shop-floor gate — operator review before live drive"),
    author: z.string().optional(),
    source: z
      .object({ kind: z.enum(["live-capture", "video", "handoff"]), ref: z.string() })
      .describe("provenance of the captured procedure")
      .optional(),
    units: z.enum(["inch", "mm"]).describe("UNITS-FIRST safety rail — pinned at root, asserted at compile"),
    bridgeUrl: z.string().describe("F360_URL the recipe was proven against").optional(),
    project: z
      .object({
        name: z.string(),
        partFileId: z.string().optional(),
        fixtureFileId: z.string().optional(),
        machine: z.string(),
        machineTemplate: z.string().optional(),
        machineFileId: z.string().optional(),
        material: z.string(),
        isoGroup: z.string().optional(),
        op: z.string().optional(),
      })
      .describe("part/machine/material identity"),
    inputs: z
      .record(z.string(), z.unknown())
      .describe("replay-time inputs the engine resolves: geometryProbe, toolLibrary, fixtureGeometry, physicsConstants, decisionRules")
      .optional(),
    scrutinyGates: z.record(z.string(), z.string()).describe("e.g. {perFileShop:'S(x)>=0.98', tier:'Omega>=0.95'}").optional(),
    postProcessor: z.string().describe("path to the .cps post").optional(),
    linkedAssets: z.array(z.string()).describe("tool libs, docs (mirrors `consumes`)").optional(),
    steps: z.array(camDriveStepSchema).min(1).describe("ordered, replayable steps"),
  })
  .describe("A parameterized, LLM-free-replayable CAM-drive recipe");

/** One decision rule in the registry. Kept permissive — rule bodies are formula/algorithm strings + params. */
export const camDriveDecisionRuleSchema = z
  .object({
    kind: z
      .enum(["GEOMETRIC", "PHYSICS", "CATALOG_LOOKUP", "SELECTION", "THRESHOLD_GATE", "GEOMETRIC+THRESHOLD", "PHYSICS+THRESHOLD"])
      .describe("rule category"),
    inputs: z.array(z.string()).describe("named inputs the rule consumes").optional(),
    formula: z.string().describe("closed-form formula").optional(),
    algorithm: z.string().describe("algorithm description when not closed-form").optional(),
    objective: z.string().describe("argmax objective for SELECTION rules").optional(),
    delegate: z.string().describe("engine method this rule delegates to (e.g. CAMDriveGateEngine.gate)").optional(),
    constantsRef: z.string().describe("where constants live — NEVER inlined").optional(),
    params: z.record(z.string(), z.unknown()).describe("tunable params (learning-loop-editable)").optional(),
    output: z.string().describe("what the rule produces").optional(),
    guard: z.string().describe("validity guard / safety bound").optional(),
  })
  .passthrough()
  .describe("A deterministic decision rule (formula/argmax/decision-table/threshold)");

/** Decision-rule registry root. */
export const camDriveDecisionRulesSchema = z
  .object({
    schemaVersion: z.string(),
    generatedAt: z.string(),
    advisoryOnly: z.boolean(),
    mustHumanVerify: z.boolean(),
    author: z.string().optional(),
    purpose: z.string().optional(),
    constantsRef: z.string().describe("physics constants source — NEVER inlined in rule bodies").optional(),
    units: z.enum(["inch", "mm"]).optional(),
    learningLoop: z.record(z.string(), z.unknown()).optional(),
    rules: z.record(z.string(), camDriveDecisionRuleSchema).describe("ruleId -> rule"),
  })
  .describe("The CAM-drive decision-rule registry");

export type CamDriveStage = z.infer<typeof camDriveStageSchema>;
export type CamDriveEndpoint = z.infer<typeof camDriveEndpointSchema>;
export type CamDriveGate = z.infer<typeof camDriveGateSchema>;
export type CamDriveVerify = z.infer<typeof camDriveVerifySchema>;
export type CamDriveOnFail = z.infer<typeof camDriveOnFailSchema>;
export type CamDriveStep = z.infer<typeof camDriveStepSchema>;
export type CamDriveRecipe = z.infer<typeof camDriveRecipeSchema>;
export type CamDriveDecisionRule = z.infer<typeof camDriveDecisionRuleSchema>;
export type CamDriveDecisionRules = z.infer<typeof camDriveDecisionRulesSchema>;
