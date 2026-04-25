/**
 * CAD Automation Dispatcher Action Schemas
 * =========================================
 * Per-action Zod schemas for `prism_cad_automation` actions added by
 * U-CUIX-P0-19 (CAD-UIX-MS0) — the dispatcher surface that routes
 * build_script / execute_script / validate_script / list_capabilities /
 * list_systems to the correct adapter via CADAdapterRegistry.
 *
 * The 15 pre-existing actions (route/list_supported_extensions/open/close/
 * get_geometry/etc.) retain the previous no-schema behaviour: `validateActionParams`
 * returns valid=true for any action not keyed in the map, preserving
 * backward compatibility while the new AI-control surface validates input
 * strictly.
 *
 * @module schemas/cadAutomationActionSchemas
 * @version 1.0.0
 */

import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

// ─── Shared enums ─────────────────────────────────────────────────────────

/**
 * Canonical CAD system registry — kept in sync with CAD_SYSTEMS in
 * src/interfaces/ICADCodeGenerator.ts. The dispatcher accepts any of these;
 * unregistered ones route to `UnknownCADSystemError` at the adapter layer.
 */
const cadSystemId = z
  .enum([
    "freecad",
    "fusion360",
    "cadquery",
    "inventor",
    "inventor_hsm",
    "solidworks",
    "mastercam",
    "hypermill",
    "hypercad_s",
    "catia_v5",
    "creo",
    "nx",
    "onshape",
    "rhino",
  ])
  .describe("CAD host system — one of the 14 registered CAD_SYSTEMS.");

/** Canonical CAD operation kind — subset of CAD_OPERATION_KINDS (keeps
 *  schema terse; adapter rejects unsupported kinds with typed error). */
const cadOperationKind = z
  .string()
  .min(1)
  .describe(
    "CAD operation kind (e.g. 'sketch_line', 'feature_extrude'). See CAD_OPERATION_KINDS in ICADCodeGenerator.ts.",
  );

/** One operation entry in the build_script `operations[]` payload. */
const cadOperation = z
  .object({
    kind: cadOperationKind,
    args: z
      .record(z.string(), z.unknown())
      .describe("Operation arguments — shape depends on kind."),
    operationId: z
      .string()
      .optional()
      .describe("Stable caller-supplied id for lineage + telemetry."),
    description: z
      .string()
      .optional()
      .describe("Human-readable description for reviewers."),
    hints: z
      .array(z.string())
      .optional()
      .describe("Non-fatal hints (e.g. 'use peck drilling on L/D > 5')."),
  })
  .passthrough();

// ─── list_systems ────────────────────────────────────────────────────────

const list_systems = z
  .object({
    include_unregistered: z
      .boolean()
      .optional()
      .describe("When true, return both registered and unregistered CAD systems."),
  })
  .passthrough();

// ─── list_capabilities ────────────────────────────────────────────────────

const list_capabilities = z
  .object({
    cad_system: cadSystemId
      .optional()
      .describe(
        "If provided, return only this system's capability matrix. If omitted, return all registered.",
      ),
  })
  .passthrough();

// ─── build_script ────────────────────────────────────────────────────────

const build_script = z
  .object({
    cad_system: cadSystemId,
    operations: z
      .array(cadOperation)
      .min(1)
      .describe(
        "Ordered CADOperation stream. Runs through adapter.buildScript(ops, ctx).",
      ),
    context: z
      .record(z.string(), z.unknown())
      .optional()
      .describe("Optional host-specific context passed to adapter.buildScript(ctx)."),
  })
  .passthrough();

// ─── execute_script ──────────────────────────────────────────────────────

const execute_script = z
  .object({
    cad_system: cadSystemId,
    script: z
      .object({
        cadSystem: cadSystemId,
        body: z.string().min(1).describe("Host-native script body (Python / VB.NET / C# etc)."),
        filename: z.string().min(1),
        imports: z.array(z.string()).optional(),
        parameters: z
          .array(
            z.tuple([
              z.string(),
              z.object({
                value: z.union([z.number(), z.string(), z.boolean()]),
                unit: z.string(),
                description: z.string().optional(),
              }),
            ]),
          )
          .optional()
          .describe("Parameters array-of-[key, value] (Map serialization)."),
        lineage: z.array(z.any()).optional(),
        warnings: z.array(z.any()).optional(),
      })
      .passthrough(),
  })
  .passthrough();

// ─── validate_script ─────────────────────────────────────────────────────

const validate_script = z
  .object({
    cad_system: cadSystemId,
    execution_result: z
      .object({
        ok: z.boolean(),
        error: z.string().optional(),
        durationMs: z.number().nonnegative().optional(),
        metrics: z
          .object({
            volumeMm3: z.number().optional(),
            boundingBoxMm: z.array(z.number()).length(3).optional(),
            centerMm: z.array(z.number()).length(3).optional(),
            faceCount: z.number().int().nonnegative().optional(),
            edgeCount: z.number().int().nonnegative().optional(),
            vertexCount: z.number().int().nonnegative().optional(),
            massKg: z.number().optional(),
            surfaceAreaMm2: z.number().optional(),
          })
          .passthrough()
          .optional(),
        outputs: z
          .array(
            z.object({
              path: z.string(),
              kind: z.string(),
              bytes: z.number().optional(),
            }),
          )
          .optional(),
        log: z.string().optional(),
      })
      .passthrough(),
  })
  .passthrough();

// ─── plan_ops (U-CUIX-P0-20) ─────────────────────────────────────────────

const plannerFeatureKinds = z.enum([
  "rectangle_extrude",
  "circle_extrude",
  "rectangle_pocket",
  "circle_pocket",
  "hole",
  "fillet_edges",
  "chamfer_edges",
  "revolve_rectangle",
  "shell",
  "linear_pattern",
  "circular_pattern",
  "boolean_union",
  "boolean_subtract",
  "export_step",
]);

const plannerFeatureIntent = z
  .object({
    id: z.string().min(1).describe("Stable feature id for dependsOn references."),
    kind: plannerFeatureKinds,
    params: z.record(z.string(), z.unknown()),
    dependsOn: z.array(z.string()).optional(),
    description: z.string().optional(),
  })
  .passthrough();

const plan_ops = z
  .object({
    intent: z
      .object({
        name: z.string().min(1),
        cadSystem: cadSystemId,
        units: z.enum(["mm", "cm", "in"]).optional(),
        features: z.array(plannerFeatureIntent).min(1),
        parameters: z
          .record(
            z.string(),
            z.object({
              value: z.union([z.number(), z.string(), z.boolean()]),
              unit: z.string().optional(),
              description: z.string().optional(),
            }),
          )
          .optional(),
      })
      .passthrough(),
  })
  .passthrough();

// ─── plan_complex_part (U-CUIX-P0-21) ────────────────────────────────────

const complexPartBody = z
  .object({
    id: z.string().min(1),
    displayName: z.string().optional(),
    features: z.array(plannerFeatureIntent).min(1),
    dependsOn: z.array(z.string()).optional(),
    booleanOp: z.enum(["union", "subtract", "intersect"]).optional(),
    booleanTargets: z.array(z.string()).optional(),
  })
  .passthrough();

const complexPartConfiguration = z
  .object({
    name: z.string().min(1),
    parameterOverrides: z.record(
      z.string(),
      z.union([z.number(), z.string(), z.boolean()]),
    ),
    hiddenBodies: z.array(z.string()).optional(),
    description: z.string().optional(),
  })
  .passthrough();

const plan_complex_part = z
  .object({
    intent: z
      .object({
        name: z.string().min(1),
        cadSystem: cadSystemId,
        description: z.string().optional(),
        units: z.enum(["mm", "cm", "in"]).optional(),
        parameters: z
          .record(
            z.string(),
            z.object({
              value: z.union([z.number(), z.string(), z.boolean()]),
              unit: z.string().optional(),
              description: z.string().optional(),
            }),
          )
          .optional(),
        bodies: z.array(complexPartBody).min(1),
        configurations: z.array(complexPartConfiguration).optional(),
      })
      .passthrough(),
  })
  .passthrough();

// ─── plan_assembly (U-CUIX-P0-22) ────────────────────────────────────────

const assemblyMateKinds = z.enum([
  "concentric",
  "coincident",
  "distance",
  "angle",
  "parallel",
]);

const assemblyComponentSource = z.union([
  z.object({
    kind: z.literal("complex_part"),
    intent: z.any(), // ComplexPartIntent — shape mirrors plan_complex_part.intent
  }),
  z.object({
    kind: z.literal("import"),
    path: z.string().min(1),
    format: z.enum(["step", "iges", "stl"]),
  }),
]);

const assemblyComponent = z
  .object({
    id: z.string().min(1),
    displayName: z.string().optional(),
    source: assemblyComponentSource,
    placement: z
      .object({
        position: z.array(z.number()).length(3).optional(),
        rotationDeg: z.array(z.number()).length(3).optional(),
      })
      .optional(),
    quantity: z.number().int().min(1).optional(),
    dependsOn: z.array(z.string()).optional(),
  })
  .passthrough();

const assemblyMate = z
  .object({
    id: z.string().min(1),
    kind: assemblyMateKinds,
    componentA: z.string().min(1),
    referenceA: z.string().min(1),
    componentB: z.string().min(1),
    referenceB: z.string().min(1),
    value: z.number().optional(),
    description: z.string().optional(),
  })
  .passthrough();

const assemblyDrawingView = z
  .object({
    kind: z.enum(["base", "section", "detail", "isometric", "exploded"]),
    name: z.string().min(1),
    scale: z.number().positive().optional(),
    parentView: z.string().optional(),
    annotations: z
      .array(
        z.object({
          kind: z.enum(["dimension", "note"]),
          target: z.string().min(1),
          value: z.string().optional(),
        }),
      )
      .optional(),
  })
  .passthrough();

const plan_assembly = z
  .object({
    intent: z
      .object({
        name: z.string().min(1),
        cadSystem: cadSystemId,
        description: z.string().optional(),
        units: z.enum(["mm", "cm", "in"]).optional(),
        components: z.array(assemblyComponent).min(1),
        mates: z.array(assemblyMate).optional(),
        bom: z
          .object({
            mode: z.enum(["structured", "parts_only", "indented"]).optional(),
            includeDescriptions: z.boolean().optional(),
            customColumns: z.array(z.string()).optional(),
          })
          .optional(),
        drawings: z.array(assemblyDrawingView).optional(),
      })
      .passthrough(),
  })
  .passthrough();

// ─── orchestrate_intent (U-CADC-AI01) ────────────────────────────────────

const orchestrate_intent = z
  .object({
    intent: z
      .object({
        tier: z.enum(["op", "part", "assembly"]),
        intent: z.any(),
      })
      .passthrough(),
    options: z
      .object({
        execute: z.boolean().optional(),
        validate: z.boolean().optional(),
        cadSystemOverride: z.union([cadSystemId, z.literal("auto")]).optional(),
        softFail: z.boolean().optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

// ─── decompose_intent (U-CADC-AI02) ──────────────────────────────────────

const decompose_intent = z
  .object({
    input: z
      .string()
      .min(1)
      .describe("Natural-language CAD intent to parse."),
    nameHint: z
      .string()
      .optional()
      .describe("Optional name override for the emitted CADIntent."),
  })
  .passthrough();

// ─── FSM (U-CADC-AI04) ───────────────────────────────────────────────────

const fsm_open = z
  .object({
    sessionId: z.string().min(1).describe("Caller-chosen FSM session id."),
  })
  .passthrough();

const fsm_close = fsm_open;

const fsm_snapshot = fsm_open;

const fsm_allowed_events = fsm_open;

const fsm_log = z
  .object({
    sessionId: z.string().min(1),
    tail: z.number().int().positive().max(1000).optional(),
  })
  .passthrough();

const fsm_list = z.object({}).passthrough();

const fsm_dispatch = z
  .object({
    sessionId: z.string().min(1),
    event: z.enum([
      "start",
      "decomposed",
      "planned",
      "executed",
      "validated",
      "learned",
      "fail",
      "reset",
      "pause",
      "resume",
    ]),
    payload: z.any().optional(),
  })
  .passthrough();

// ─── Airfoil library (U-CADC13) ──────────────────────────────────────────

const airfoil_list = z.object({}).passthrough();

const airfoil_query = z
  .object({
    designation: z.string().optional(),
    family: z.enum(["naca-4", "naca-5"]).optional(),
    thicknessPct: z.number().positive().max(40).optional(),
    thicknessToleranceAbs: z.number().nonnegative().max(10).optional(),
  })
  .passthrough();

const airfoil_get = z
  .object({
    designation: z.string().min(1),
    samplesPerSurface: z.number().int().min(8).max(500).optional(),
  })
  .passthrough();

const airfoil_interpolate = z
  .object({
    designation: z.string().min(1),
    x: z.number().min(0).max(1),
    surface: z.enum(["upper", "lower"]),
    samplesPerSurface: z.number().int().min(8).max(500).optional(),
  })
  .passthrough();


// ─── Feature memory (U-CADC28 / CAD-COMPLETE-MS0) ────────────────────────

const featureMemoryParamValue = z.union([z.number(), z.string(), z.boolean()]);

const feature_memory_record = z
  .object({
    feature_type: z.string().min(1),
    parameters: z.record(z.string(), featureMemoryParamValue),
    outcome: z.enum(["success", "failure"]),
    gen_time_ms: z.number().min(0).finite(),
    error_pattern: z.string().min(1).max(256).optional(),
    persist: z.boolean().optional(),
  })
  .passthrough();

const feature_memory_query = z
  .object({
    feature_type: z.string().min(1),
    parameters: z.record(z.string(), featureMemoryParamValue),
    topK: z.number().int().min(1).max(100).optional(),
    minSuccessRate: z.number().min(0).max(1).optional(),
    minAttempts: z.number().int().min(0).optional(),
    featureTypeFilter: z.string().min(1).optional(),
  })
  .passthrough();

const feature_memory_lookup = z
  .object({ id: z.string().min(1) })
  .passthrough();

const feature_memory_stats = z.object({}).passthrough();

// ─── CAD→STEP pipeline (U-CGT03 / CAD-GROUND-TRUTH-MS0) ───────────────────

const step_pipeline_batch_item = z.object({
  filePath: z.string().min(1),
  outputPath: z.string().min(1),
});

const step_pipeline_run = z
  .object({
    filePath: z.string().min(1),
    outputPath: z.string().min(1),
    requireOutputParent: z.boolean().optional(),
    validate: z.boolean().optional(),
  })
  .passthrough();

const step_pipeline_batch = z
  .object({
    items: z.array(step_pipeline_batch_item).min(1),
    continueOnError: z.boolean().optional(),
  })
  .passthrough();

const step_validate = z
  .object({ stepFilePath: z.string().min(1) })
  .passthrough();

const step_pipeline_strategies = z
  .object({ ext: z.string().min(1) })
  .passthrough();

const step_pipeline_supported = z.object({}).passthrough();

// ─── Ground-truth feature tree (U-CGT04 / CAD-GROUND-TRUTH-MS0) ───────────

const sourceFormatEnum = z.enum(["FCStd", "f3d", "f3z", "step", "sldprt", "sldasm", "ipt", "iam", "mcam", "mcx", "mcx-8", "hmc", "unknown"]);

const feature_tree_extract = z
  .object({
    filePath: z.string().min(1),
    formatHint: sourceFormatEnum.optional(),
  })
  .passthrough();

const feature_tree_validate = z
  .object({ candidate: z.unknown() })
  .passthrough();

const feature_tree_recompute_signature = z
  .object({ tree: z.unknown() })
  .passthrough();

const feature_tree_canonical_types = z.object({}).passthrough();

const feature_tree_source_formats = z.object({}).passthrough();

// ─── Native parsers (U-CGT01 FCStd, U-CGT02 F3D / CAD-GROUND-TRUTH-MS0) ───

const fcstd_parse = z
  .object({ filePath: z.string().min(1) })
  .passthrough();

const f3d_parse = z
  .object({ filePath: z.string().min(1) })
  .passthrough();

const f3z_parse = z
  .object({ filePath: z.string().min(1) })
  .passthrough();

// ─── Dimensional signature (U-CGT05 / CAD-GROUND-TRUTH-MS0) ──────────────

const dim_signature_extract = z
  .object({ filePath: z.string().min(1) })
  .passthrough();

const dim_signature_extract_text = z
  .object({
    stepText: z.string().min(1),
    sourceFile: z.string().min(1),
  })
  .passthrough();

const dim_signature_compare = z
  .object({ a: z.unknown(), b: z.unknown() })
  .passthrough();

const dim_signature_validate = z
  .object({ candidate: z.unknown() })
  .passthrough();

const dim_signature_recompute = z
  .object({ signature: z.unknown() })
  .passthrough();

// ─── Ground-truth registry (U-CGT08 / CAD-GROUND-TRUTH-MS0) ──────────────

const machineCategoryEnum = z.enum(["mill","lathe","edm","wedm","grinder","additive","other"]);
const complexityTierEnum = z.enum(["simple","medium","complex"]);
const bundleStatusEnum = z.enum(["ok","partial","failed","skipped"]);

const gtRegistryQueryOptions = z
  .object({
    limit: z.number().int().min(0).optional(),
    sortBy: z.enum(["fileId","envelopeM","featureCount"]).optional(),
    status: bundleStatusEnum.optional(),
  })
  .passthrough();

const gt_registry_build_index = z
  .object({ outputRoot: z.string().min(1), includeNonOk: z.boolean().optional() })
  .passthrough();

const gt_registry_find_file_id = z
  .object({ fileId: z.string().min(1) })
  .passthrough();

const gt_registry_find_customer = z
  .object({ name: z.string().min(1), options: gtRegistryQueryOptions.optional() })
  .passthrough();

const gt_registry_find_machine = z
  .object({ category: machineCategoryEnum, options: gtRegistryQueryOptions.optional() })
  .passthrough();

const gt_registry_find_complexity = z
  .object({ tier: complexityTierEnum, options: gtRegistryQueryOptions.optional() })
  .passthrough();

const gt_registry_find_format = z
  .object({ format: z.string().min(2), options: gtRegistryQueryOptions.optional() })
  .passthrough();

const gt_registry_query = z
  .object({
    filter: z.object({
      customer: z.string().optional(),
      machineCategory: machineCategoryEnum.optional(),
      complexity: complexityTierEnum.optional(),
      format: z.string().optional(),
      status: bundleStatusEnum.optional(),
    }).passthrough(),
    options: gtRegistryQueryOptions.optional(),
  })
  .passthrough();

const gt_registry_stats = z.object({}).passthrough();
const gt_registry_dump = z.object({ filePath: z.string().min(1) }).passthrough();
const gt_registry_load = z.object({ filePath: z.string().min(1) }).passthrough();


// ─── Ground-truth validation (U-CGT09 / CAD-GROUND-TRUTH-MS0) ────────────

const gt_validate_bundle = z
  .object({
    bundleDir: z.string().min(1),
    fileId: z.string().min(1),
    skipScreenshots: z.boolean().optional(),
    quarantineFailedStatus: z.boolean().optional(),
    quarantinePartialStatus: z.boolean().optional(),
  })
  .passthrough();

const gt_validate_corpus = z
  .object({
    outputRoot: z.string().min(1),
    skipScreenshots: z.boolean().optional(),
    quarantineFailedStatus: z.boolean().optional(),
    quarantinePartialStatus: z.boolean().optional(),
    limit: z.number().int().min(0).optional(),
  })
  .passthrough();

const gt_export_quarantine = z
  .object({
    report: z.unknown(),
    filePath: z.string().min(1),
  })
  .passthrough();

const gt_validate_report = z
  .object({ candidate: z.unknown() })
  .passthrough();

const gt_list_issue_codes = z.object({}).passthrough();

// ─── Export map ──────────────────────────────────────────────────────────

export const CAD_AUTOMATION_ACTION_SCHEMAS: ActionSchemaMap = {
  list_systems,
  list_capabilities,
  build_script,
  execute_script,
  validate_script,
  plan_ops,
  plan_complex_part,
  plan_assembly,
  orchestrate_intent,
  decompose_intent,
  fsm_open,
  fsm_close,
  fsm_dispatch,
  fsm_snapshot,
  fsm_log,
  fsm_list,
  fsm_allowed_events,
  airfoil_list,
  airfoil_query,
  airfoil_get,
  airfoil_interpolate,
  feature_memory_record,
  feature_memory_query,
  feature_memory_lookup,
  feature_memory_stats,
  step_pipeline_run,
  step_pipeline_batch,
  step_validate,
  step_pipeline_strategies,
  step_pipeline_supported,
  feature_tree_extract,
  feature_tree_validate,
  feature_tree_recompute_signature,
  feature_tree_canonical_types,
  feature_tree_source_formats,
  fcstd_parse,
  f3d_parse,
  f3z_parse,
  dim_signature_extract,
  dim_signature_extract_text,
  dim_signature_compare,
  dim_signature_validate,
  dim_signature_recompute,
  gt_registry_build_index,
  gt_registry_find_file_id,
  gt_registry_find_customer,
  gt_registry_find_machine,
  gt_registry_find_complexity,
  gt_registry_find_format,
  gt_registry_query,
  gt_registry_stats,
  gt_registry_dump,
  gt_registry_load,
  gt_validate_bundle,
  gt_validate_corpus,
  gt_export_quarantine,
  gt_validate_report,
  gt_list_issue_codes,
};
