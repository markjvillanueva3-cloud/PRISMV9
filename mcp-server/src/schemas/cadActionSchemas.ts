/**
 * CAD Dispatcher Action Schemas
 *
 * Zod schemas for prism_cad dispatcher actions.
 * Per dispatcher conventions: every action should have a schema.
 *
 * @module schemas/cadActionSchemas
 */

import { z } from "zod";

// ── CadBridge operability (WIRE-UNWIRED-MS0/U-WIRE-CADBRIDGE) ────────────────
// Pure-inspection action — no params. Kept as a strict empty object so callers
// passing stray fields get a Zod boundary rejection rather than silent ignore.
const cadBridgeStatusSchema = z
  .object({})
  .strict()
  .describe(
    "prism_cad:cad_bridge_status — report CadBridge singleton + Python subprocess "
    + "state (initialized/ready/processAlive/pid/pendingRequests/etc.) WITHOUT "
    + "spawning the bridge. Returns instanceExists=false when getInstance() has "
    + "not been called this process. No params accepted.",
  );

// ── CAD Execution Outcome Bus (CAD-COMPLETE-MS0/U-CADC-LP01) ─────────────────
// Publish a CAD execution outcome to the dual-channel bus (durable JSONL +
// in-process subscribers). Stats/subscriber-count are read-only inspections.
const cadOutcomePublishSchema = z
  .object({
    adapterId: z
      .string()
      .min(1)
      .describe("CAD adapter that ran the operation (freecad, fusion360, mastercam, ...)"),
    scriptId: z.string().optional().describe("Optional script/program identifier this outcome belongs to"),
    success: z.boolean().describe("True iff the CAD operation completed without error"),
    errorMessage: z.string().optional().describe("Brief error message when success=false"),
    timingMs: z
      .number()
      .nonnegative()
      .finite()
      .describe("Wall-clock execution time in milliseconds, non-negative finite"),
    collision: z.boolean().optional().describe("True iff a fixture/tool/stock collision was reported"),
    regenerationOk: z.boolean().optional().describe("True iff post-execute regeneration validation passed"),
    lineageId: z.string().optional().describe("Optional caller-supplied lineage id; auto-issued if omitted"),
    timestamp: z.string().optional().describe("Optional ISO timestamp; auto-stamped if omitted"),
  })
  .strict()
  .describe(
    "prism_cad:cad_outcome_publish — publish a CADExecutionOutcome to the dual-channel"
    + " bus. Durable channel writes to OutcomeCaptureBus (cad shard, kind=cad_execution_outcome)."
    + " In-process channel notifies registered subscribers (LP02 collector, LP04 propagator)."
    + " Returns { lineageId, timestamp, subscribersNotified, handlerErrors, busOk, busWarning? }.",
  );
const cadOutcomeStatsSchema = z
  .object({})
  .strict()
  .describe(
    "prism_cad:cad_outcome_stats — snapshot of the CAD outcome bus counters"
    + " (totalPublished/totalSuccess/totalFailure/byAdapter/handlerErrors/busWriteFailures)."
    + " No params accepted.",
  );
const cadOutcomeSubscribersSchema = z
  .object({})
  .strict()
  .describe(
    "prism_cad:cad_outcome_subscribers — current in-process subscriber count for the"
    + " CAD outcome bus. No params accepted.",
  );

// ── CAD Per-Adapter Feedback Collector (CAD-COMPLETE-MS0/U-CADC-LP02) ─────────
// LP02 subscribes to the LP01 outcome bus and partitions outcomes into
// per-CAD-system ("NN head") rolling buffers. These actions are read-only
// inspections — ingestion happens via the bus subscription, not a dispatcher
// action.
const cadFeedbackMetricsSchema = z
  .object({
    headId: z
      .string()
      .min(1)
      .optional()
      .describe("NN head id == CAD adapter (freecad, fusion360, ...). Omit for every head."),
    window: z
      .number()
      .int()
      .positive()
      .optional()
      .describe("Rolling window length N for the metrics; defaults to the collector's window (50)."),
  })
  .strict()
  .describe(
    "prism_cad:cad_feedback_metrics — windowed per-NN-head feedback metrics"
    + " (success/failure/collision/regenOk rates, mean+p50+p95 timing). With headId:"
    + " one head; without: every head. Read-only.",
  );
const cadFeedbackBufferSchema = z
  .object({
    headId: z
      .string()
      .min(1)
      .describe("NN head id == CAD adapter whose feedback buffer to return."),
    limit: z
      .number()
      .int()
      .positive()
      .optional()
      .describe("Optional cap — return only the last `limit` samples (newest)."),
  })
  .strict()
  .describe(
    "prism_cad:cad_feedback_buffer — a copy of one NN head's feedback sample"
    + " buffer (oldest first), optionally limited to the last `limit` samples."
    + " Read-only.",
  );
const cadFeedbackStatsSchema = z
  .object({})
  .strict()
  .describe(
    "prism_cad:cad_feedback_stats — aggregate collector counters"
    + " (totalIngested/malformedDropped/headCount/byHead). No params accepted.",
  );

// ── CAD Head Replay Buffer (CAD-COMPLETE-MS0/U-CADC-LP03) ────────────────────
// LP03 is a per-NN-head Prioritized Experience Replay buffer. add()/sample()/
// updatePriorities() are the engine-to-engine API for LP04; these dispatcher
// actions are read-only inspections of the buffer state.
const cadReplayStatsSchema = z
  .object({})
  .strict()
  .describe(
    "prism_cad:cad_replay_stats — aggregate replay-buffer counters"
    + " (headCount/totalAdded/totalEvicted/totalSampled/byHead). No params accepted.",
  );
const cadReplayEntriesSchema = z
  .object({
    headId: z
      .string()
      .min(1)
      .describe("NN head id == CAD adapter whose replay entries to return."),
    limit: z
      .number()
      .int()
      .positive()
      .optional()
      .describe("Optional cap — return only the last `limit` entries (newest)."),
  })
  .strict()
  .describe(
    "prism_cad:cad_replay_entries — a copy of one NN head's prioritized replay"
    + " entries (oldest first), optionally limited to the last `limit`. Read-only.",
  );

// ── CAD Tolerance Signal Encoder (CAD-DRAW-MAX-MS0/P1-U09) ───────────────────
const cadToleranceEncodeSchema = z.object({
  callouts: z.array(z.object({
    tolerance_mm: z.number().optional(),
    gdt_symbol: z.string().optional(),
    feature: z.string().optional(),
  }).passthrough()),
}).strict();
const cadToleranceAugmentSchema = z.object({
  unifiedFeature: z.array(z.number()),
  callouts: z.array(z.object({
    tolerance_mm: z.number().optional(),
    gdt_symbol: z.string().optional(),
    feature: z.string().optional(),
  }).passthrough()),
}).strict();
const cadToleranceStatsSchema = z.object({}).strict();

// ── CAD Draw-Any-Part Orchestrator (CAD-DRAW-MAX-MS0/FINAL) ──────────────────
const cadDrawAnyPartSchema = z.object({
  intent: z.string().min(1).describe("Natural-language intent driving the decoder"),
  brep: z.object({
    faceCount: z.number().nonnegative().optional(),
    edgeCount: z.number().nonnegative().optional(),
    vertexCount: z.number().nonnegative().optional(),
  }).passthrough().optional().describe("Optional BRep summary carried into NN01"),
  sketch: z.object({
    constraintCount: z.number().nonnegative().optional(),
    entityCount: z.number().nonnegative().optional(),
  }).passthrough().optional().describe("Optional sketch summary carried into NN01"),
  callouts: z.array(z.object({
    tolerance_mm: z.number().optional(),
    gdt_symbol: z.string().optional(),
    feature: z.string().optional(),
  }).passthrough()).optional().describe("Optional GD&T callouts; triggers 6-d tolerance augmentation"),
  projectName: z.string().optional().describe("hyperCAD-S session project name (default 'PRISMDraw')"),
  maxOps: z.number().int().positive().optional().describe("Hard cap on iterations (default 15)"),
  poolStrategy: z.enum(["mean", "max", "last", "exp-decay", "attention"]).optional()
    .describe("CADSequencePool strategy fed to the unified-feature bridge"),
  continueOnFailure: z.boolean().optional()
    .describe("When false halt on first live failure; default true → keep iterating"),
}).strict();
const cadDrawAnyPartStatsSchema = z.object({}).strict();

// ── HyperCAD-S Tutorial Corpus Ingester (CAD-DRAW-MAX-MS0/P1-U08) ────────────
const hyperCADSTutorialCorpusIngestSchema = z.object({
  docs: z.array(z.object({
    source: z.string().describe("Source path or identifier of the tutorial document"),
    text: z.string().describe("Raw transcript / tutorial prose text"),
  })).describe("Open Mind hyperCAD-S tutorial documents to ingest"),
}).strict();
const hyperCADSTutorialCorpusStatsSchema = z.object({}).strict();

// ── CAD Reverse-Template Engine (CAD-REVERSE-ENGINEER-MS0/U1) ────────────────
const cadReverseOpsSchema = z.array(z.object({
  kind: z.string().describe("CAD operation kind (sketch_create, feature_extrude, …)"),
  args: z.record(z.string(), z.unknown()).optional().describe("Operation arguments"),
}).passthrough()).describe("Parsed feature tree — output of cad_feature_tree_extract");
const cadReverseTemplateSchema = z.object({
  ops: cadReverseOpsSchema,
}).strict();
const cadReverseCategorizeSchema = z.object({
  ops: cadReverseOpsSchema,
}).strict();
const cadReverseTemplateStatsSchema = z.object({}).strict();

// ── CAD Canonical-Tree Adapter (CAD-REVERSE-ENGINEER-MS0/U2) ─────────────────
const cadCanonicalTreeSchema = z.object({
  tree: z.object({
    sourceFile: z.string().describe("Source CAD file path"),
    sourceFormat: z.string().describe("Source format (FCStd, f3d, step, …)"),
    features: z.array(z.object({
      id: z.string(),
      type: z.string(),
      name: z.string(),
      parameters: z.record(z.string(), z.unknown()).optional(),
      suppressed: z.boolean().optional(),
      sourceType: z.string().optional(),
    }).passthrough()).describe("Canonical feature list"),
  }).passthrough().describe("CanonicalFeatureTree from cad_feature_tree_extract"),
}).strict();
const cadCanonicalAdaptStatsSchema = z.object({}).strict();

// ── CAD Reverse Corpus Catalog (CAD-REVERSE-ENGINEER-MS0/U3) ─────────────────
const cadCorpusTreeSchema = z.object({
  sourceFile: z.string(),
  sourceFormat: z.string(),
  features: z.array(z.object({
    id: z.string(),
    type: z.string(),
    name: z.string(),
    parameters: z.record(z.string(), z.unknown()).optional(),
    suppressed: z.boolean().optional(),
    sourceType: z.string().optional(),
  }).passthrough()),
}).passthrough();
const cadCorpusCatalogBuildSchema = z.object({
  trees: z.array(cadCorpusTreeSchema).describe("CanonicalFeatureTree batch from cad_feature_tree_extract"),
}).strict();
const cadCorpusCatalogMergeSchema = z.object({
  a: z.object({}).passthrough().describe("First CorpusCatalog chunk"),
  b: z.object({}).passthrough().describe("Second CorpusCatalog chunk"),
}).strict();
const cadCorpusCatalogStatsSchema = z.object({}).strict();

// ── CAD Unified Feature Bridge (CAD-DRAW-MAX-MS0/P1-U07) ─────────────────────
const cadUnifiedFeatureEncodeSchema = z.object({
  ops: z.array(z.object({ kind: z.string(), args: z.record(z.string(), z.unknown()).optional() }).passthrough()).optional(),
  brep: z.object({
    vertexCount: z.number().optional(),
    edgeCount: z.number().optional(),
    faceCount: z.number().optional(),
    shellCount: z.number().optional(),
    solidCount: z.number().optional(),
  }).strict().optional(),
  sketch: z.object({
    entityCount: z.number().optional(),
    constraintCount: z.number().optional(),
    dimensionCount: z.number().optional(),
    closedLoopCount: z.number().optional(),
  }).strict().optional(),
  poolStrategy: z.enum(["mean", "max", "last", "exp-decay", "attention"]).optional(),
  alpha: z.number().optional(),
}).strict();
const cadUnifiedFeatureLayoutSchema = z.object({}).strict();
const cadUnifiedFeatureStatsSchema = z.object({}).strict();

// ── CAD Sequence Pool (CAD-DRAW-MAX-MS0/P1-U05) ──────────────────────────────
const cadSequencePoolSchema = z.object({
  rows: z.array(z.array(z.number())),
  strategy: z.enum(["mean", "max", "last", "exp-decay", "attention"]).optional(),
  alpha: z.number().optional(),
  attentionQuery: z.array(z.number()).optional(),
  expectedDim: z.number().int().nonnegative().optional(),
}).strict();
const cadSequencePoolAllSchema = z.object({
  rows: z.array(z.array(z.number())),
  alpha: z.number().optional(),
  attentionQuery: z.array(z.number()).optional(),
  expectedDim: z.number().int().nonnegative().optional(),
}).strict();
const cadSequencePoolStrategiesSchema = z.object({}).strict();
const cadSequencePoolStatsSchema = z.object({}).strict();

// ── CAD Operation Decoder (CAD-DRAW-MAX-MS0/P1-U06) ──────────────────────────
const cadDecoderContextSchema = z.object({
  history: z.array(z.object({ kind: z.string(), args: z.record(z.string(), z.unknown()).optional() }).passthrough()).optional(),
}).passthrough();
const cadDecoderOptionsSchema = z.object({
  intent: z.string().optional(),
  useFallback: z.boolean().optional(),
}).passthrough();
const cadDecoderProposeSchema = z.object({
  ctx: cadDecoderContextSchema.optional(),
  options: cadDecoderOptionsSchema.optional(),
}).strict();
const cadDecoderProposeTopKSchema = z.object({
  ctx: cadDecoderContextSchema.optional(),
  options: cadDecoderOptionsSchema.optional(),
  k: z.number().int().positive().optional(),
}).strict();
const cadDecoderVocabSchema = z.object({}).strict();
const cadDecoderStatsSchema = z.object({}).strict();

// ── CAD Arg Encoder (CAD-DRAW-MAX-MS0/P1-U04) ────────────────────────────────
const cadArgEncoderEncodeSchema = z.object({
  args: z.record(z.string(), z.unknown()).optional(),
}).strict();
const cadArgEncoderBatchSchema = z.object({
  ops: z.array(z.object({
    kind: z.string(),
    args: z.record(z.string(), z.unknown()).optional(),
  }).passthrough()),
  pooled: z.boolean().optional(),
}).strict();
const cadArgEncoderStatsSchema = z.object({}).strict();

// ── CAD Regen Feedback Adapter (CAD-DRAW-MAX-MS0/P0-U03) ─────────────────────
// Merges regen-test result into the hyperCAD-S outcome overlay so LP04
// learns from geometric mismatch (not just script crash).
const cadRegenFeedbackPublishSchema = z.object({
  result: z.object({
    ok: z.boolean(),
    opId: z.string(),
    scriptText: z.string().optional().default(""),
    durationMs: z.number(),
    warnings: z.array(z.string()).optional().default([]),
    error: z.string().optional(),
    sessionOpCount: z.number().optional().default(0),
  }).passthrough(),
  regen: z.object({
    passed: z.boolean().optional(),
    metrics: z.record(z.string(), z.object({ passed: z.boolean().optional() }).passthrough()).optional(),
    topologyFailed: z.boolean().optional(),
  }).passthrough(),
  options: z.object({
    extraOverlay: z.object({
      collision: z.boolean().optional(),
      regenerationOk: z.boolean().optional(),
      lineageId: z.string().optional(),
    }).strict().optional(),
    deriveCollisionFromTopology: z.boolean().optional(),
  }).strict().optional(),
}).strict();
const cadRegenFeedbackStatsSchema = z.object({}).strict();

// ── HyperCAD-S Outcome Publisher (CAD-DRAW-MAX-MS0/P0-U02) ───────────────────
// Read-only stat actions; emission happens engine-to-engine.
const cadHypercadsOutcomeStatsSchema = z
  .object({})
  .strict()
  .describe(
    "prism_cad:cad_hypercads_outcome_stats — aggregate hyperCAD-S outcome-publisher"
    + " counters (totalAccepted/successCount/failureCount/totalPublishedOk/totalPublishedBusWarn/totalRejected).",
  );
const cadHypercadsOutcomeAdapterSchema = z
  .object({})
  .strict()
  .describe(
    "prism_cad:cad_hypercads_outcome_adapter — canonical adapterId string"
    + " emitted on every hyperCAD-S outcome.",
  );

// ── HyperCAD-S Live Bridge (CAD-DRAW-MAX-MS0/P0-U01) ─────────────────────────
// Per-op live-mutate facade over the AC Python bridge. All schemas accept
// the live-op param shape; strict invalid-input rejection is in the engine.
const hypercadsLiveNewDocSchema = z.object({
  projectName: z.string().optional(),
  units: z.enum(["mm", "in"]).optional(),
  targetVersion: z.string().optional(),
  outputDir: z.string().optional(),
}).strict();
const hypercadsLiveSketchSchema = z.object({
  plane: z.string().optional(),
  shapes: z.array(z.unknown()).optional(),
  ctx: hypercadsLiveNewDocSchema.optional(),
}).strict();
const hypercadsLiveExtrudeSchema = z.object({
  profileId: z.string().optional(),
  distance: z.number(),
  operation: z.enum(["new_body", "join", "cut", "intersect"]).optional(),
  ctx: hypercadsLiveNewDocSchema.optional(),
}).strict();
const hypercadsLiveEdgeOpSchema = z.object({
  edgeIds: z.array(z.string()).optional(),
  radius: z.number().optional(),
  distance: z.number().optional(),
  ctx: hypercadsLiveNewDocSchema.optional(),
}).strict();
const hypercadsLiveRevolveSchema = z.object({
  profileId: z.string().optional(),
  axisId: z.string().optional(),
  angle: z.number(),
  ctx: hypercadsLiveNewDocSchema.optional(),
}).strict();
const hypercadsLiveHoleSchema = z.object({
  x: z.number(), y: z.number(), diameter: z.number(), depth: z.number(),
  ctx: hypercadsLiveNewDocSchema.optional(),
}).strict();
const hypercadsLivePatternSchema = z.object({
  featureIds: z.array(z.string()).optional(),
  type: z.enum(["linear", "circular"]),
  count: z.number().int().positive(),
  spacing: z.number().optional(),
  ctx: hypercadsLiveNewDocSchema.optional(),
}).strict();
const hypercadsLiveCombineSchema = z.object({
  op: z.enum(["union", "subtract", "intersect"]),
  bodyIds: z.array(z.string()).optional(),
  ctx: hypercadsLiveNewDocSchema.optional(),
}).strict();
const hypercadsLiveShellSchema = z.object({
  bodyId: z.string().optional(),
  thickness: z.number(),
  ctx: hypercadsLiveNewDocSchema.optional(),
}).strict();
const hypercadsLiveExportSchema = z.object({
  format: z.enum(["step", "iges", "stl", "dxf", "pdf"]),
  path: z.string().optional(),
  ctx: hypercadsLiveNewDocSchema.optional(),
}).strict();
const hypercadsLiveGeometrySchema = z.object({
  projectName: z.string().optional(),
}).strict();
const hypercadsLiveUndoSchema = hypercadsLiveGeometrySchema;
const hypercadsLiveRegenerateSchema = z.object({
  projectName: z.string().optional(),
  ctx: hypercadsLiveNewDocSchema.optional(),
}).strict();
const hypercadsLiveExecuteRawSchema = z.object({
  code: z.string().min(1),
  projectName: z.string().optional(),
  filename: z.string().optional(),
}).strict();
const hypercadsLiveStatsSchema = z.object({}).strict();
const hypercadsLiveListSessionsSchema = z.object({}).strict();

// ── CAD Foundation Encoder (CAD-COMPLETE-MS0/U-CADC-NN01) ────────────────────
// NN01 is the shared tokenizer + foundation encoder; vocabulary derived
// deterministically from CAD_OPERATION_KINDS. Read-only dispatcher actions.
const cadEncoderVocabSchema = z
  .object({})
  .strict()
  .describe(
    "prism_cad:cad_encoder_vocab — sorted (tokenId, kind) snapshot of the"
    + " CAD_OPERATION_KINDS vocabulary. No params accepted.",
  );
const cadEncoderStatsSchema = z
  .object({})
  .strict()
  .describe(
    "prism_cad:cad_encoder_stats — aggregate encoder counters"
    + " (totalOpStream/totalBRep/totalSketch/totalUnified/totalUnknownTokens/vocabSize). No params accepted.",
  );

// ── CAD Master Brain Backprop Propagator (CAD-COMPLETE-MS0/U-CADC-LP04) ──────
// LP04 is the EWC++/LoRA-safe gradient propagator. propagate()/consolidate()
// are the engine-to-engine API; these dispatcher actions are read-only.
const cadBackpropParamsSchema = z
  .object({
    target: z
      .string()
      .min(1)
      .optional()
      .describe("Target id (head id, or omitted for the master). Returns current θ + EWC state."),
  })
  .strict()
  .describe(
    "prism_cad:cad_backprop_params — read current θ + EWC++ Fisher/θ* for"
    + " a target (head id or master if omitted). Read-only.",
  );
const cadBackpropStatsSchema = z
  .object({})
  .strict()
  .describe(
    "prism_cad:cad_backprop_stats — aggregate propagator counters"
    + " (totalPropagations/totalConsolidations/totalDroppedEntries/targets). No params accepted.",
  );

// ── Geometry Actions ──────────────────────────────────────────────────────────
const geometryCreateSchema = z.object({
  type: z.enum(["box", "cylinder", "sphere", "cone", "torus"]).optional(),
  dimensions: z.record(z.string(), z.number()).optional(),
});

const geometryTransformSchema = z.object({
  operation: z.enum(["translate", "rotate", "scale", "mirror"]).optional(),
  vector: z.array(z.number()).optional(),
  angle: z.number().optional(),
});

const geometryAnalyzeSchema = z.object({
  geometry_id: z.string().optional(),
});

// ── Mesh Actions ──────────────────────────────────────────────────────────────
const meshGenerateSchema = z.object({
  element_size_mm: z.number().optional(),
  quality: z.enum(["coarse", "medium", "fine"]).optional(),
});

const meshImportSchema = z.object({
  path: z.string().optional(),
  format: z.enum(["stl", "obj", "ply"]).optional(),
});

const meshExportSchema = z.object({
  path: z.string().optional(),
  format: z.enum(["stl", "obj", "ply"]).optional(),
});

// ── Feature Actions ───────────────────────────────────────────────────────────
const featureRecognizeSchema = z.object({
  geometry: z.any().optional(),
});

const featureEditSchema = z.object({
  feature_id: z.string().optional(),
  modifications: z.record(z.string(), z.any()).optional(),
});

// ── Stock/WCS/DfM Actions ─────────────────────────────────────────────────────
const stockModelSchema = z.object({
  material: z.string().optional(),
  dimensions: z.record(z.string(), z.number()).optional(),
});

const wcsSetupSchema = z.object({
  origin: z.array(z.number()).optional(),
  orientation: z.array(z.number()).optional(),
});

const dfmCheckSchema = z.object({
  geometry: z.any().optional(),
  process: z.string().optional(),
});

// ── Universal CAD Registry Actions (U-CADC03) ─────────────────────────────────
const cadRegistryScanSchema = z.object({
  root_paths: z.array(z.string()).optional(),
  rootPaths: z.array(z.string()).optional(),
  options: z.object({
    formats: z.array(z.string()).optional(),
    maxDepth: z.number().optional(),
    batchSize: z.number().optional(),
  }).optional(),
});

const cadRegistrySearchSchema = z.object({
  query: z.string().optional(),
  name: z.string().optional(),
  format: z.string().optional(),
  customer: z.string().optional(),
  limit: z.number().optional(),
});

const cadRegistryGetSchema = z.object({
  file_path: z.string().optional(),
  filePath: z.string().optional(),
  path: z.string().optional(),
});

const cadRegistryStatsSchema = z.object({}).optional();

// ── CAD Geometry Comparison Actions (U-CADC26) ────────────────────────────────
const geometryCompareFilesSchema = z.object({
  original_path: z.string().optional(),
  originalPath: z.string().optional(),
  generated_path: z.string().optional(),
  generatedPath: z.string().optional(),
  thresholds: z.record(z.string(), z.number()).optional(),
});

const geometryExtractMetricsSchema = z.object({
  file_path: z.string().optional(),
  filePath: z.string().optional(),
  path: z.string().optional(),
});

const geometryBatchCompareSchema = z.object({
  pairs: z.array(z.object({
    original: z.string(),
    generated: z.string(),
  })).optional(),
  thresholds: z.record(z.string(), z.number()).optional(),
});

const geometrySetThresholdsSchema = z.object({
  thresholds: z.record(z.string(), z.number()).optional(),
});

const geometryFormatDetectSchema = z.object({
  file_path: z.string().optional(),
  filePath: z.string().optional(),
  path: z.string().optional(),
});

// ── CAD Regeneration Test Actions (U-CADC21) ──────────────────────────────────
const cadRegenTestSchema = z.object({
  original_path: z.string().optional(),
  generated_path: z.string().optional(),
});

const cadRegenBatchSchema = z.object({
  pairs: z.array(z.any()).optional(),
});

const cadRegenCompareSchema = z.object({
  original: z.any().optional(),
  generated: z.any().optional(),
  thresholds: z.record(z.string(), z.number()).optional(),
});

const cadRegenThresholdsSchema = z.object({
  set: z.record(z.string(), z.number()).optional(),
});

// ── Print → Fusion 360 Bridge (U-CADC-FUS-PRINT-01) ─────────────────────────
const printToFusion360Schema = z.object({
  analysis: z.unknown().optional().describe("BlueprintAnalysis from BlueprintVisionOCREngine"),
  profiles: z.array(z.unknown()).optional().describe("ExtractedProfile[] from blueprint vision"),
  dimensions: z.array(z.unknown()).optional().describe("ExtractedDimension[] (used when no profiles)"),
  partName: z.string().optional().describe("Part name override"),
  part_name: z.string().optional(),
  units: z.enum(["mm", "in"]).optional().describe("Unit system (default: title_block.units → mm)"),
  outputDir: z.string().optional(),
  output_dir: z.string().optional(),
  targetVersion: z.enum(["2023", "2024", "2025"]).optional().describe("Fusion 360 version target"),
  target_version: z.enum(["2023", "2024", "2025"]).optional(),
  defaultDepth: z.number().optional().describe("Default extrusion depth in mm when no depth dim"),
  default_depth: z.number().optional(),
}).passthrough();

const printToFusion360ValidateSchema = z.object({
  analysis: z.unknown().optional(),
  profiles: z.array(z.unknown()).optional(),
  dimensions: z.array(z.unknown()).optional(),
  defaultDepth: z.number().optional(),
  default_depth: z.number().optional(),
}).passthrough();

const printToFusion360CapabilitiesSchema = z.object({}).passthrough();

// ── Print → Mastercam / Inventor / SolidWorks / Esprit Bridges ──────────────
const printToBridgeBaseSchema = z.object({
  analysis: z.unknown().optional(),
  profiles: z.array(z.unknown()).optional(),
  dimensions: z.array(z.unknown()).optional(),
  partName: z.string().optional(),
  part_name: z.string().optional(),
  units: z.enum(["mm", "in"]).optional(),
  defaultDepth: z.number().optional(),
  default_depth: z.number().optional(),
}).passthrough();

const printToCapabilitiesSchema = z.object({}).passthrough();

// ── Esprit Code Generator (U-CADC-ESP-CODEGEN-01) ───────────────────────────
const espritGenerateScriptSchema = z.object({
  operations: z.array(z.unknown()).optional(),
  projectName: z.string().optional(),
  units: z.enum(["mm", "in"]).optional(),
  outputDir: z.string().optional(),
  targetVersion: z.enum(["2023", "2024", "2025"]).optional(),
}).passthrough();

const espritCapabilitiesSchema = z.object({}).passthrough();

// ── Print → All CADs Orchestrator (U-CADC-PRINT-ORCHESTRATOR-01) ─────────────
const printToAllCadsSchema = z.object({
  analysis: z.unknown().optional(),
  profiles: z.array(z.unknown()).optional(),
  dimensions: z.array(z.unknown()).optional(),
  partName: z.string().optional(),
  part_name: z.string().optional(),
  units: z.enum(["mm", "in"]).optional(),
  outputDir: z.string().optional(),
  output_dir: z.string().optional(),
  defaultDepth: z.number().optional(),
  default_depth: z.number().optional(),
  targets: z.array(z.string()).optional(),
}).passthrough();

const printToAllCadsTargetsSchema = z.object({}).passthrough();

// ── Print → hyperCAD-S Analysis Bridge / Live Bridges (SW + Esprit) ─────────
const printToHyperCADSAnalysisSchema = z.object({
  analysis: z.unknown().optional(),
  profiles: z.array(z.unknown()).optional(),
  dimensions: z.array(z.unknown()).optional(),
  partName: z.string().optional(),
  part_name: z.string().optional(),
  units: z.enum(["mm", "in"]).optional(),
  outputDir: z.string().optional(),
  output_dir: z.string().optional(),
  targetVersion: z.enum(["2023", "2024", "2025"]).optional(),
  target_version: z.enum(["2023", "2024", "2025"]).optional(),
  defaultDepth: z.number().optional(),
  default_depth: z.number().optional(),
}).passthrough();

const liveExecuteSchema = z.object({
  script: z.union([z.string(), z.unknown()]).optional(),
  config: z.object({
    mode: z.enum(["http", "com", "mock"]),
    endpoint: z.string().optional(),
    timeoutMs: z.number().optional(),
    comShimPath: z.string().optional(),
  }).optional(),
  mode: z.enum(["http", "com", "mock"]).optional(),
}).passthrough();

const liveValidateSchema = z.object({
  config: z.object({
    mode: z.enum(["http", "com", "mock"]),
    endpoint: z.string().optional(),
    timeoutMs: z.number().optional(),
    comShimPath: z.string().optional(),
  }).optional(),
  mode: z.enum(["http", "com", "mock"]).optional(),
}).passthrough();

const liveModesSchema = z.object({}).passthrough();

// ── Blueprint OCR → 6-CAD Orchestrator (U-CADC-BPRINT-OCR-ORCH-01) ──
const blueprintToAllCadsSchema = z.object({
  image: z.object({
    type: z.enum(["base64", "file", "url"]),
    data: z.string().optional(),
    path: z.string().optional(),
    url: z.string().optional(),
    media_type: z.enum(["image/jpeg", "image/png", "image/gif", "image/webp"]).optional(),
  }).optional().describe("Image source — vision mode"),
  analysis: z.unknown().optional().describe("Pre-built BlueprintAnalysis — analysis mode"),
  profiles: z.array(z.unknown()).optional(),
  vision: z.object({
    expected_units: z.enum(["mm", "inch"]).optional(),
    blueprint_type: z.enum(["wire_edm", "milling", "turning", "general"]).optional(),
    extract_geometry: z.boolean().optional(),
    model: z.string().optional(),
  }).optional(),
  targets: z.array(z.string()).optional(),
  outputDir: z.string().optional(),
  output_dir: z.string().optional(),
  defaultDepth: z.number().optional(),
  default_depth: z.number().optional(),
  partName: z.string().optional(),
  part_name: z.string().optional(),
  units: z.enum(["mm", "in"]).optional(),
}).passthrough();

const blueprintToAllCadsCapabilitiesSchema = z.object({}).passthrough();

// ── CAD Trial-Error Learning Actions (U-CADC29) ───────────────────────────────
const cadTrialIngestSchema = z.object({
  outcome: z.unknown().optional(),
  outcomes: z.array(z.unknown()).optional(),
});

const cadTrialPatternsSchema = z.object({}).passthrough();

const cadTrialRecommendSchema = z.object({
  candidate: z
    .object({
      partType: z.string().optional(),
      features: z.array(z.string()).optional(),
      generator: z.string().optional(),
    })
    .passthrough()
    .optional(),
});

const cadTrialStatsSchema = z.object({
  since: z.string().optional(),
  partType: z.string().optional(),
});

const cadTrialResetSchema = z.object({
  eraseLedger: z.boolean().optional(),
});

// ── NACA Airfoil Engine Actions (U-CADC13) ────────────────────────────────────
const nacaGenerate4DigitSchema = z.object({
  designation: z.string().describe("4-digit NACA designator (e.g. '2412', '0012'). 'NACA' prefix and dashes/spaces are stripped automatically."),
  numPoints: z.number().optional().describe("Points per surface (upper + lower). Floor 3. Default 81."),
  chord: z.number().optional().describe("Chord length in the caller's units (typically meters). Default 1."),
  cosineSpacing: z.boolean().optional().describe("Use cosine clustering at leading edge. Default true."),
  closedTrailingEdge: z.boolean().optional().describe("Use a4 = -0.1036 for zero-thickness TE. Default true."),
});

const nacaGenerate5DigitSchema = z.object({
  designation: z.string().describe("5-digit NACA designator (e.g. '23012'). Supports standard {210,220,230,240,250} and reflexed {221,231,241,251} camber tags from NACA TR-537."),
  numPoints: z.number().optional().describe("Points per surface. Floor 3. Default 81."),
  chord: z.number().optional().describe("Chord length scaling. Default 1."),
  cosineSpacing: z.boolean().optional().describe("Use cosine clustering at leading edge. Default true."),
  closedTrailingEdge: z.boolean().optional().describe("Use a4 = -0.1036 for zero-thickness TE. Default true."),
});

const nacaParseUIUCDatSchema = z.object({
  content: z.string().describe("Raw text of a UIUC Airfoil Database Selig-format .dat file."),
  chord: z.number().optional().describe("Chord scaling applied to parsed coordinates. Default 1."),
});

// ── Lofted Wing Engine Actions (U-CADC14) ─────────────────────────────────────
const airfoilProfileRefSchema = z.object({
  naca4: z.string().optional().describe("Shortcut: 4-digit NACA designator (generates profile on the fly)."),
  naca5: z.string().optional().describe("Shortcut: 5-digit NACA designator (generates profile on the fly)."),
  uiucDat: z.string().optional().describe("Shortcut: raw UIUC Selig .dat content (parses on the fly)."),
  options: z.record(z.string(), z.any()).optional().describe("Options forwarded to NACAAirfoilEngine when using naca4/naca5 shortcut."),
  chord: z.number().optional().describe("Chord scaling for uiucDat shortcut."),
  // Passthrough for a full AirfoilProfile
  name: z.string().optional(),
  maxCamber: z.number().optional(),
  maxCamberPosition: z.number().optional(),
  maxThickness: z.number().optional(),
  upper: z.array(z.object({ x: z.number(), y: z.number() })).optional(),
  lower: z.array(z.object({ x: z.number(), y: z.number() })).optional(),
  selig: z.array(z.object({ x: z.number(), y: z.number() })).optional(),
});

const loftOptionsSchema = z.object({
  halfSpan: z.number().describe("Half-span (tip-to-root distance) in meters. Must be > 0."),
  rootChord: z.number().describe("Root chord in meters. Must be > 0."),
  tipChord: z.number().describe("Tip chord in meters. Must be > 0."),
  quarterChordSweepDeg: z.number().optional().describe("Quarter-chord sweep angle in degrees."),
  dihedralDeg: z.number().optional().describe("Dihedral angle in degrees (positive raises tip above root)."),
  tipTwistDeg: z.number().optional().describe("Twist at tip in degrees (washout is negative)."),
  rootTwistDeg: z.number().optional().describe("Twist at root in degrees (default 0)."),
  numStations: z.number().optional().describe("Number of spanwise stations including root and tip. Default 11."),
  cosineSpanwise: z.boolean().optional().describe("Use cosine clustering spanwise. Default true."),
});

const wingLoftSingleProfileSchema = z.object({
  profile: airfoilProfileRefSchema.describe("Single airfoil used at every spanwise station."),
  options: loftOptionsSchema.describe("Wing geometry options."),
});

const wingLoftBetweenProfilesSchema = z.object({
  rootProfile: airfoilProfileRefSchema.describe("Airfoil at the root station (y=0)."),
  tipProfile: airfoilProfileRefSchema.describe("Airfoil at the tip station (y=halfSpan)."),
  options: loftOptionsSchema.describe("Wing geometry options."),
});

const wingComputePropertiesSchema = z.object({
  sections: z.array(z.object({
    station: z.number(),
    chord: z.number(),
    twistRad: z.number().optional(),
    sweepOffset: z.number().optional(),
    dihedralOffset: z.number().optional(),
    profile: z.any().optional(),
  })).describe("Ordered spanwise sections (root→tip). Must have ≥2 entries."),
});

// ── Involute Gear Engine Actions (U-CADC15) ────────────────────────────────
const gearSpecSchema = z.object({
  teeth: z.number().describe("Number of teeth z. Must be integer ≥ 5."),
  module: z.number().describe("Module m in mm. Must be > 0."),
  pressureAngleDeg: z.number().optional().describe("Pressure angle in degrees. Default 20 (ISO 53)."),
  faceWidth: z.number().optional().describe("Face width in mm (informational, default 0)."),
  profileShift: z.number().optional().describe("Profile shift coefficient x. Default 0."),
  addendumCoeff: z.number().optional().describe("Addendum coefficient h_a* (default 1.0 per ISO 53)."),
  dedendumCoeff: z.number().optional().describe("Dedendum coefficient h_d* (default 1.25 per ISO 53)."),
});

const gearComputeGeometrySchema = z.object({
  spec: gearSpecSchema.optional().describe("Gear spec object. If omitted, the whole params object is used as the spec."),
  teeth: z.number().optional(),
  module: z.number().optional(),
  pressureAngleDeg: z.number().optional(),
  profileShift: z.number().optional(),
  faceWidth: z.number().optional(),
  addendumCoeff: z.number().optional(),
  dedendumCoeff: z.number().optional(),
});

const gearGenerateToothProfileSchema = gearComputeGeometrySchema.extend({
  samplesPerFlank: z.number().optional().describe("Number of involute samples per flank. Default 25, floor 5."),
});

const gearComputeContactRatioSchema = z.object({
  gear1: gearSpecSchema.describe("First mesh partner (pinion)."),
  gear2: gearSpecSchema.describe("Second mesh partner (gear). Module and pressure angle must match gear1."),
});

// ── Helical Spring Engine Actions (U-CADC16) ──────────────────────────────
const springSpecSchema = z.object({
  wireDiameter: z.number().describe("Wire diameter d in mm. Must be > 0."),
  meanCoilDiameter: z.number().describe("Mean coil diameter D in mm. Must be > d."),
  activeCoils: z.number().describe("Active coils N_a. Must be > 0."),
  endCondition: z.enum(["plain", "plain_ground", "squared", "squared_ground"]).optional(),
  material: z.enum(["music_wire", "hard_drawn", "chrome_vanadium", "chrome_silicon", "stainless_302", "phosphor_bronze", "inconel_x750"]).optional(),
  shearModulusMPa: z.number().optional().describe("Shear modulus G in MPa (override material lookup)."),
  pitch: z.number().optional(),
  freeLength: z.number().optional(),
  materialDensityKgM3: z.number().optional(),
});

const springBaseSchema = z.object({
  spec: springSpecSchema.optional(),
  wireDiameter: z.number().optional(),
  meanCoilDiameter: z.number().optional(),
  activeCoils: z.number().optional(),
  endCondition: z.string().optional(),
  material: z.string().optional(),
  shearModulusMPa: z.number().optional(),
  pitch: z.number().optional(),
  freeLength: z.number().optional(),
  materialDensityKgM3: z.number().optional(),
});

const springComputeGeometrySchema = springBaseSchema;
const springComputeMechanicsSchema = springBaseSchema;

const springComputeStressAtForceSchema = springBaseSchema.extend({
  forceN: z.number().describe("Axial force in N."),
  useWahl: z.boolean().optional().describe("Apply Wahl correction. Default true."),
});

const springGenerateCoilPathSchema = springBaseSchema.extend({
  samplesPerCoil: z.number().optional().describe("Samples per coil. Floor 8. Default 36."),
});

// ── Part Folder Organizer — JM Die per-customer / per-part-number library ─────
const _printRefSchema = z.object({
  source_pdf: z.string().optional().describe("Multi-page source PDF the print page lives in."),
  file: z.string().optional().describe("Alternatively, a standalone file already on disk to copy in as-is."),
  page: z.number().int().min(0).max(100_000).optional().describe("0-based page index inside source_pdf."),
  drawing_score: z.number().optional().describe("Drawing-likelihood score 0..1 from the OCR pass."),
  doc_id: z.string().optional().describe("Docustrata document id."),
  label: z.string().optional().describe("Human label, e.g. 'print' / 'PO' / 'router'."),
});
const _programRefSchema = z.object({
  source_path: z.string().describe("Absolute path to the program / CAD file in JM DIE/."),
  machine_category: z.string().optional().describe("lathe / mill / wire_edm / ..."),
  kind3: z.string().optional().describe("'nc_program' (→ CNC PROGRAM/) or 'cam_project' (→ CAD-CAM/)."),
  kind: z.string().optional().describe("'program' or 'cad'."),
  customer: z.string().optional().describe("Customer the file was filed under (path-derived)."),
  via: z.string().optional().describe("How it was matched: exact / loose / ..."),
  customer_match: z.string().optional().describe("Whether the program's path-customer agrees with the print's OCR'd customer."),
});
const createPartFolderSchema = z.object({
  part_number: z.union([z.string(), z.number()]).optional().describe("The part number (required). String or number."),
  customer: z.string().optional().describe("Customer folder name. If omitted, resolved from program_customers > print_customers > _UNASSIGNED."),
  part_number_normalized: z.string().optional().describe("Normalized PN (op-prefix/rev stripped)."),
  raw_variants: z.array(z.string()).optional().describe("Raw OCR variants of the PN."),
  print_customers: z.array(z.string()).optional().describe("Customer name(s) OCR'd from the print title block."),
  program_customers: z.array(z.string()).optional().describe("Customer name(s) derived from matched-program folder paths."),
  match_confidence: z.string().optional().describe("Join-table confidence tier: exact / loose / ambiguous / miss."),
  prints: z.array(_printRefSchema).optional().describe("Print pages / related documents to place in the folder root."),
  cnc_programs: z.array(_programRefSchema).optional().describe("Pre-classified NC programs → CNC PROGRAM/."),
  cad_cam: z.array(_programRefSchema).optional().describe("Pre-classified CAM projects / CAD models → CAD-CAM/."),
  programs: z.array(_programRefSchema).optional().describe("Un-classified program list — the engine routes each by kind3/extension."),
  library_root: z.string().optional().describe("Override the library root (default H:/PRISM/JM DIE/_PART LIBRARY)."),
  copy_mode: z.enum(["copy", "manifest", "hardlink"]).optional().describe("copy = physical copies (default); hardlink = same-volume links; manifest = no copies, paths recorded only."),
  overwrite: z.boolean().optional().describe("Rebuild an already-complete folder. Default false (idempotent skip)."),
  join_table_source: z.string().optional().describe("Provenance string recorded in the manifest."),
  notes: z.array(z.string()).optional().describe("Extra manifest notes."),
});
const getPartFolderSchema = z.object({
  customer: z.string().describe("Customer folder name."),
  part_number: z.union([z.string(), z.number()]).optional().describe("The part number (required)."),
  library_root: z.string().optional().describe("Override the library root."),
});
const partLibraryStatsSchema = z.object({
  library_root: z.string().optional().describe("Override the library root."),
  by_customer: z.boolean().optional().describe("Include a per-customer breakdown."),
  with_disk: z.boolean().optional().describe("Also walk every part folder for file count + byte size (slower)."),
});
const partLibraryPopulateSchema = z.object({
  join_jsonl: z.string().optional().describe("Path to the print→program join jsonl (default blueprint-program-join-full-v5.jsonl)."),
  phase7_jsonl: z.string().optional().describe("Path to the doc_id→PDF-path jsonl (default phase7-drawing-candidates.jsonl)."),
  library_root: z.string().optional().describe("Override the library root."),
  confidence_filter: z.array(z.string()).optional().describe("Only include these match_confidence tiers. Default: everything except 'garbage'."),
  copy_mode: z.enum(["copy", "manifest", "hardlink"]).optional().describe("File placement mode. Default copy."),
  limit: z.number().int().min(1).max(100_000).optional().describe("Max rows to drain this call. Default 25 (the python script is the unbounded bulk path)."),
  offset: z.number().int().min(0).optional().describe("Skip this many eligible rows before starting (for chunked draining)."),
  dry_run: z.boolean().optional().describe("Don't create anything — just report what would be created."),
});

// ── Macro library (catalog the JM Okuma-OSP lathe macros + match parts to families + place a labelled TEMPLATE; the gated fill/emit pipeline is MACRO-PROGRAM-PIPELINE-MS0) ──
const _macroGeometrySchema = z.object({
  length_mm: z.number().optional().describe("Overall length, mm."),
  max_od_mm: z.number().optional().describe("Maximum OD, mm."),
  min_od_mm: z.number().optional().describe("Minimum OD, mm (0 if no step-down)."),
  bore_id_mm: z.number().optional().describe("Through-bore diameter, mm (0/undefined if solid)."),
  wall_thickness_mm: z.number().optional().describe("Minimum wall thickness, mm."),
  stock_form: z.enum(["bar", "forging", "casting", "hex_bar", "tube", "pre_machined"]).optional().describe("Stock form."),
  features: z.array(z.string()).optional().describe("Feature-signature keywords."),
  tightest_tolerance_mm: z.number().optional().describe("Tightest tolerance, mm."),
  has_bolt_circle: z.boolean().optional().describe("Has a bolt circle / mounting holes."),
  has_keyway: z.boolean().optional().describe("Has a keyway."),
  has_threads: z.boolean().optional().describe("Has threads."),
  has_grooves: z.boolean().optional().describe("Has groove(s)."),
  od_step_count: z.number().int().optional().describe("Number of OD step diameters."),
  blind_bore: z.boolean().optional().describe("Bore is blind (not through)."),
  threaded_both_ends: z.boolean().optional().describe("Both ends threaded."),
  iso_group: z.string().optional().describe("Material ISO group."),
}).describe("Lathe part geometry (the LathePartClassifierEngine input).");
export const macroLibraryListSchema = z.object({
  dir: z.string().optional().describe("Override the macro source directory (default: JM DIE/Macro programs/)."),
  macro_source_dir: z.string().optional().describe("Alias for `dir`."),
});
export const macroMatchFamilySchema = z.object({
  geometry: _macroGeometrySchema.optional().describe("Lathe geometry — preferred; classified via LathePartClassifierEngine."),
  features: z.array(z.string()).optional().describe("Free-form feature keywords (also taken from geometry.features)."),
  name_text: z.string().optional().describe("Any text associated with the part (PN, description, drawing title) — die-detail names often encode the family."),
  counterbore_present: z.boolean().optional().describe("Explicit: a counterbore is present (overrides inference)."),
  flange_step_present: z.boolean().optional().describe("Explicit: a flange/brim step is present (overrides inference)."),
  od_taper_present: z.boolean().optional().describe("Explicit: an OD taper is present."),
  id_taper_present: z.boolean().optional().describe("Explicit: an ID taper is present."),
});
export const macroPlaceTemplateSchema = z.object({
  part_number: z.union([z.string(), z.number()]).describe("The part number (required)."),
  customer: z.string().optional().describe("Customer folder name. If omitted, falls back to _UNASSIGNED for the path."),
  family: z.enum(["wafer-insert", "casing", "casing-counterbore", "top-hat-casing"]).optional().describe("The macro family. If omitted, supply `match` so a family can be resolved."),
  match: macroMatchFamilySchema.optional().describe("Match input (geometry/features/name) — used to resolve a family when `family` is omitted."),
  library_root: z.string().optional().describe("Override the part-library root (tests use a temp dir)."),
  macro_source_dir: z.string().optional().describe("Override the macro source directory."),
  dry_run: z.boolean().optional().describe("Do everything except write."),
});
export const macroFanoutDryRunSchema = z.object({
  library_root: z.string().optional().describe("Override the part-library root."),
  limit: z.number().int().min(1).max(1_000_000).optional().describe("Max part folders to scan."),
  sample_size: z.number().int().min(0).max(1000).optional().describe("How many matched parts to include in the returned sample (default 25)."),
});

/**
 * MS0-U6 — MacroBulkEmitOrchestratorEngine.emitBatch (BULK PATH, gated, NEVER auto)
 *
 * Companion Stop hook `macro-bulk-emit-guard` blocks Stop if any batch ran
 * without a corresponding _BATCH_<n>_APPROVED marker. ALL files emitted by
 * the underlying U5 still carry `needsOperatorReview: true` — first-piece
 * prove-out is unconditional.
 */
export const macroBulkEmitBatchSchema = z.object({
  batchNumber: z.number().int().min(0).describe("Batch index (>=0). Batch 0 needs no prior approval; n>=1 requires _BATCH_{n-1}_APPROVED."),
  libraryRoot: z.string().min(1).describe("Library root for _MACRO_BATCH_<n>_REVIEW.md + _MACRO_BULK_LOG.md + _MACRO_NEEDS_HUMAN.md."),
  batchSize: z.number().int().min(1).max(500).optional().describe("Default 25; caps at 500."),
  parts: z.array(z.object({
    customerName: z.string().min(1),
    partNumber: z.string().min(1),
    features: z.unknown().optional(),
    needsHumanReason: z.string().optional(),
  })).describe("Explicit parts list — production callers feed from PartFolderOrganizerEngine + macroNeedsFill scan."),
  borderlineThreshold: z.number().min(0.70).max(2.0).optional().describe("Borderline band ceiling (default 0.75; parts with 0.70<=S(x)<this go to needsHuman, NOT emitted)."),
  fillMachineHint: z.string().optional().describe("Default 'OKUMA_LB-3000-EX'."),
  approvedEnvVarName: z.string().optional().describe("Default 'MACRO_PROGRAM_PIPELINE_BATCH_APPROVED'."),
  dryRun: z.boolean().optional().describe("Do everything except writes."),
});

export const macroApproveBatchSchema = z.object({
  batchNumber: z.number().int().min(0).describe("Batch index to approve (creates _BATCH_<n>_APPROVED marker)."),
  libraryRoot: z.string().min(1).describe("Library root (same as the batch's emit)."),
  approvedBy: z.string().min(1).describe("Operator identity (audit trail)."),
  approvalNote: z.string().optional().describe("Free-text note (e.g. 'reviewed 25 parts, 3 flagged')."),
});

/**
 * MS0-U5 — MacroPerMachineEmitterEngine.emitPerMachine
 *
 * Inputs at runtime use camelCase (dossier, partRef, targetMachines) because
 * the engine consumes the GateResult.dossier shape verbatim from U4 (which
 * also uses camelCase). The dispatcher passes params through unchanged after
 * shape-level validation — Zod here checks structure, not exact field-name
 * casing, so the engine's own Zod schema is the authoritative input gate.
 */
export const macroEmitPerMachineSchema = z.object({
  dossier: z.object({
    candidate: z.unknown().describe("MacroFillCandidate from U2 (carried inside the U4 dossier)."),
    safetyRecord: z.object({ passed: z.boolean() }).passthrough().describe("U4 SafetyRecord — must have passed=true."),
    needsOperatorReview: z.literal(true).describe("Always true on a U4-passed dossier."),
  }).passthrough().describe("The full SignoffDossier from MacroCandidateGateEngine.gateCandidate (passed=true)."),
  partRef: z.object({
    customerName: z.string().min(1).describe("Customer folder (single segment)."),
    partNumber: z.string().min(1).describe("Part number (single segment)."),
    cncProgramDir: z.string().optional().describe("Override CNC PROGRAM output dir. Must resolve under libraryRoot."),
    partJsonPath: z.string().optional().describe("Override part.json path. Must resolve under libraryRoot."),
    libraryRoot: z.string().optional().describe("Library root (defaults to H:/PRISM/JM DIE/_PART LIBRARY)."),
  }).describe("Part reference — where the .MIN files are written and which part.json is updated."),
  targetMachines: z.array(z.string()).optional().describe("Optional fleet restriction. undefined = full JM Die lathe fleet. [] = none (NOT a fallback)."),
});

// TRAINING-LEARNING-MS0/U1: CAD-side bridge for placing a lathe template into a part folder.
// Family enum is narrowed to the 4 OSP-anchored families — the ONLY families for which a
// .min macro source file exists in MacroLibraryEngine.CATALOG. Empirically verified
// 2026-05-13: a wider enum surfaces the engine's non-null-assertion crash at
// MacroLibraryEngine.ts:409 (`CATALOG.find(...)!` returns undefined for non-OSP families
// and the following `cat.file` access throws). Reviewer B's "widen the enum" P0 was based
// on a misreading: lathe_training_template_match (turning dispatcher) is the action that
// works with all 12 LatheTemplateFamily literals — it emits JSON training templates that
// have no .min source dependency. cad_lathe_template_place places real .min macro files
// and so is correctly scoped to the macro-library's actual surface. Dedicated schema (vs
// reusing macroPlaceTemplateSchema) preserves the option to evolve the two independently
// when MacroLibraryEngine.CATALOG widens in a future unit.
export const cadLatheTemplatePlaceSchema = z.object({
  part_number: z.union([z.string(), z.number()]).describe("The part number (required)."),
  customer: z.string().optional().describe("Customer folder name. If omitted, falls back to _UNASSIGNED for the path."),
  family: z.enum([
    "wafer-insert",
    "casing",
    "casing-counterbore",
    "top-hat-casing",
  ]).optional().describe("The lathe template family — restricted to the 4 OSP-anchored families that have a .min macro source file in MacroLibraryEngine.CATALOG. For broader 12-family lathe template extraction (JSON output, no .min dependency), use prism_turning:lathe_training_template_match."),
  match: macroMatchFamilySchema.optional().describe("Match input (geometry/features/name) — used to resolve a family when `family` is omitted."),
  library_root: z.string().optional().describe("Override the part-library root (tests use a temp dir)."),
  macro_source_dir: z.string().optional().describe("Override the macro source directory."),
  dry_run: z.boolean().optional().describe("Do everything except write."),
});

// ── U-PPL-D4 Program-Equivalent Index (echo's sibling-index approach) ──
// Pure composition over an existing CAD master-index (UniversalCADIndexEngine)
// + lathe `.MIN` JMDieDiskIndexEntry[]. Optional D1 link-index for print-ref
// enrichment. Output writes to data/state/cad-file-index/program-equivalent-index.json
// (sibling of the CAD master-index.json — never clobbers it).
export const programEquivalentIndexComposeSchema = z
  .object({
    cad_master_index_path: z
      .string()
      .optional()
      .describe(
        "Path to an existing CAD master-index.json (from UniversalCADIndexEngine.index()). When omitted the engine runs in lathe-only mode.",
      ),
    lathe_entries: z
      .array(z.record(z.string(), z.unknown()))
      .describe(
        "JMDieDiskIndexEntry[] for the lathe half of the archive — .MIN/.MAC files. Empty array runs CAD-only mode.",
      ),
    mcx_entries: z
      .array(z.record(z.string(), z.unknown()))
      .optional()
      .describe(
        "Optional McxBatchPerFileResult[] from McxBatchExtractorEngine (LATHE-PROD-READY-MS0/U-LPR28) — the mill-side Mastercam binary corpus (.mcx/.mcx-8/.mcx-9/.mcam). Each ok-status entry with a resolvable JM-Die PN becomes a mill-gcode kind row. Omit/empty for CAD+lathe-only mode.",
      ),
    join_jsonl_path: z
      .string()
      .optional()
      .describe(
        "Optional v6 join JSONL from BlueprintProgramJoinEngine — when present the engine loads the D1 link-index and enriches each entry with a print-ref.",
      ),
    input_program_paths: z
      .array(z.string())
      .optional()
      .describe(
        "Optional augmentation paths for the D1 link-index program-seed.",
      ),
    dry_run: z
      .boolean()
      .optional()
      .describe(
        "Safety gate — true (default) computes + returns only. Set false to atomically write program-equivalent-index.json.",
      ),
    output_path: z
      .string()
      .optional()
      .describe(
        "Override the output path (defaults to data/state/cad-file-index/program-equivalent-index.json).",
      ),
    limit: z
      .number()
      .int()
      .nonnegative()
      .optional()
      .describe("Cap on lathe entries processed (0 = no cap)."),
  })
  .passthrough();

// ── MS-PRINT-PROGRAM-LOOP/U-PPL-D4-EXT — CADArchiveJoinAugmenterEngine ───────
// COMPLEMENTARY approach to U-PPL-D4: instead of synthesizing a sibling index
// (echo's approach above), this engine EXTENDS the existing v6 join in-place
// by composing buildProgramSeedAugmentation. Distinct architectural choices
// serve distinct consumer paths — see CADArchiveJoinAugmenterEngine.ts header.
export const cadArchiveJoinAugmentSchema = z.object({
  masterIndexPath: z
    .string()
    .optional()
    .describe(
      "Absolute path to CADFileIndexerEngine master-index.json. Defaults to <cwd>/data/state/cad-file-index/master-index.json.",
    ),
  joinJsonlPath: z
    .string()
    .optional()
    .describe(
      "Path to BlueprintProgramJoinEngine v6 JSONL. Defaults to Docustrata/.index/blueprint-program-join-full-v6.jsonl.",
    ),
  triplesJsonlPath: z
    .string()
    .optional()
    .describe("Optional training-triples-v4.jsonl path (forwarded to loadJoinIndex)."),
  maxLineBytes: z
    .number()
    .int()
    .positive()
    .optional()
    .describe("Per-line byte cap when streaming the join JSONL. Default 4 MiB."),
  millOnly: z
    .boolean()
    .optional()
    .describe(
      "When true, reject CAD entries whose machineCategory is not in {mill, hurco, hypermill}. Default false (include all categories).",
    ),
  formats: z
    .array(z.string())
    .optional()
    .describe(
      "Optional override of the format allowlist. Defaults to MILL_PROGRAM_FORMATS (.ipt/.iam/.f3d/.f3z/.sldprt/.sldasm).",
    ),
});

/**
 * DocustrataCustomerIndexEngine — query the per-customer-folder rollup of the
 * Docustrata print archive (programs / CAD / matched prints per JM-Die customer).
 */
export const docustrataCustomerIndexSchema = z.object({
  mode: z
    .enum(["available", "totals", "list", "get", "search", "find_pn"])
    .describe(
      "available=is the index present · totals=index-wide counts · "
      + "list=all customers · get=one customer (needs customer) · "
      + "search=name substring (needs query) · find_pn=customers carrying "
      + "a part number (needs partNumber)",
    ),
  customer: z.string().optional().describe("customer name — required for mode 'get'"),
  query: z.string().optional().describe("name substring — required for mode 'search'"),
  partNumber: z.string().optional().describe("part number — required for mode 'find_pn'"),
  sortBy: z
    .enum(["programs", "cad", "prints", "name"])
    .optional()
    .describe("list/search sort key (default: programs, descending)"),
  limit: z
    .number()
    .int()
    .nonnegative()
    .optional()
    .describe("max rows for list/search (0 = empty list; omit = no limit)"),
});

// ── CAD Consensus Prediction Item (CAD-COMPLETE-MS0/U-AI-11) ─────────────────
// Shared schema reused across cad_consensus_score / cad_consensus_pick /
// cad_consensus_parameter_clusters. Extracted module-scope so the 3 actions
// stay DRY (P2-1 fix) AND every nested field carries .describe() per the
// schemas rule (P1-1 fix). CADEntity is structurally validated downstream
// by CADConsensusEngine — z.unknown() here avoids a schema circular dep.
const cadConsensusPredictionItemSchema = z.object({
  id: z.string().min(1).describe("Stable source identifier — must be unique within the prediction set (e.g. 'claude', 'ollama-32b', 'preview-A')"),
  diff: z
    .object({
      addedEntities: z.array(z.string()).describe("Entity ids this source predicts were added"),
      removedEntities: z.array(z.string()).describe("Entity ids this source predicts were removed"),
      parametersChanged: z.array(z.string()).describe("Parameter names this source predicts changed"),
      selectionChanged: z.boolean().describe("Whether this source predicts the selection set flipped"),
      unitsChanged: z.boolean().describe("Whether this source predicts the document units flipped"),
      identical: z.boolean().describe("Whether this source predicts no change at all (no-op consensus signal)"),
    })
    .describe("CADWorldDiff this source predicts — typically from CADWorldModelEngine.diff(before, after) or cadPreviewEngine.preview(...).diff"),
  projectedState: z
    .object({
      docId: z.string().describe("Document id this state belongs to"),
      entities: z.array(z.unknown()).describe("Believed entity list — CADEntity shape validated by engine (z.unknown() avoids schema circular dep)"),
      parameters: z.record(z.string(), z.number().finite()).describe("Believed parameter values (rejects NaN/Infinity at MCP boundary; engine also filters)"),
      selection: z.array(z.string()).describe("Currently-selected entity ids"),
      units: z.enum(["mm", "in"]).describe("Document units"),
      opCount: z.number().int().nonnegative().describe("Monotonic count of ops applied since document creation"),
    })
    .optional()
    .describe("Optional projected world state — when present, parameterValueClusters can compare numerical agreement (parameter values, not just which parameters changed)"),
});

/**
 * Action schemas for prism_cad dispatcher.
 * Maps action name to Zod schema for validation.
 */
// ── CAD coverage-meter feature actions (delta, 2026-06-26) -- the engines own deep VALUE validation
// (structured-fail-never-throw); these schemas catch gross TYPE/enum errors. ALL fields optional +
// z.coerce.number (mirrors the engines' Number() coercion) + .passthrough() so a previously-working
// call is NEVER rejected (the cadDispatcher BLOCKS on invalid params -- an over-strict schema would
// regress the action). base_plane stays z.string (the engine upper-cases it -> case-insensitive). ──
const cadFeatureSubtractSchema = z.object({
  op: z.enum(["cut_hole", "pocket", "groove"]).optional().describe("subtractive op"),
  operation: z.enum(["cut_hole", "pocket", "groove"]).optional().describe("alias of op"),
  base_volume_mm3: z.coerce.number().optional().describe("stock volume before the cut (mm^3)"),
  diameter_mm: z.coerce.number().optional().describe("hole diameter (mm)"),
  width_mm: z.coerce.number().optional().describe("pocket/groove width (mm)"),
  length_mm: z.coerce.number().optional().describe("pocket/groove length (mm)"),
  depth_mm: z.coerce.number().optional().describe("cut depth (mm)"),
}).passthrough();
const cadFeaturePatternSchema = z.object({
  kind: z.enum(["linear", "circular", "mirror"]).optional().describe("pattern kind"),
  pattern: z.enum(["linear", "circular", "mirror"]).optional().describe("alias of kind"),
  feature_volume_mm3: z.coerce.number().optional().describe("single-feature volume (mm^3)"),
  count: z.coerce.number().optional().describe("instance count"),
  spacing_mm: z.coerce.number().optional().describe("linear spacing (mm)"),
  radius_mm: z.coerce.number().optional().describe("circular radius (mm)"),
  plane: z.string().optional().describe("mirror plane"),
}).passthrough();
const cadDatumCreateSchema = z.object({
  kind: z.enum(["plane", "axis", "point"]).optional().describe("datum kind"),
  datum: z.enum(["plane", "axis", "point"]).optional().describe("alias of kind"),
  base_plane: z.string().optional().describe("base plane XY|YZ|XZ (engine upper-cases -> case-insensitive)"),
  plane: z.string().optional().describe("alias of base_plane"),
  offset_mm: z.coerce.number().optional().describe("signed datum-plane offset (mm)"),
  p1: z.array(z.coerce.number()).optional().describe("axis point 1 [x,y,z]"),
  p2: z.array(z.coerce.number()).optional().describe("axis point 2 [x,y,z]"),
  x: z.coerce.number().optional().describe("datum point x (mm)"),
  y: z.coerce.number().optional().describe("datum point y (mm)"),
  z: z.coerce.number().optional().describe("datum point z (mm)"),
}).passthrough();
const cadDieDesignSchema = z.object({
  mode: z.enum(["blank", "pierce"]).optional().describe("die-design mode"),
  feature_dim_mm: z.coerce.number().optional().describe("blank/hole size (mm)"),
  thickness_mm: z.coerce.number().optional().describe("material thickness (mm)"),
  clearance_pct_per_side: z.coerce.number().optional().describe("die clearance %/side (material-dependent caller param)"),
}).passthrough();
const cadBooleanSchema = z.object({
  op: z.enum(["union", "subtract", "intersect"]).optional().describe("boolean op"),
  operation: z.enum(["union", "subtract", "intersect"]).optional().describe("alias of op"),
  volume_a_mm3: z.coerce.number().optional().describe("solid A volume for the estimate (mm^3)"),
  volume_b_mm3: z.coerce.number().optional().describe("solid B volume for the estimate (mm^3)"),
  solid_a: z.string().optional().describe("solid A id for the real cadquery kernel"),
  solid_b: z.string().optional().describe("solid B id for the real cadquery kernel"),
  validate_geometry: z.boolean().optional().describe("run bridge geometry validation on the boolean result"),
}).passthrough();
const cadMateSchema = z.object({
  mate_type: z.enum(["coincident", "concentric", "distance", "angle", "parallel"]).optional().describe("assembly mate kind"),
  mate: z.enum(["coincident", "concentric", "distance", "angle", "parallel"]).optional().describe("alias of mate_type"),
  type: z.enum(["coincident", "concentric", "distance", "angle", "parallel"]).optional().describe("alias of mate_type"),
  distance_mm: z.coerce.number().optional().describe("distance-mate offset (mm)"),
  angle_deg: z.coerce.number().optional().describe("angle-mate angle (deg, 0..180)"),
  solid_a: z.string().optional().describe("component A name substituted into the constrain op"),
  solid_b: z.string().optional().describe("component B name substituted into the constrain op"),
}).passthrough();
const cadWeldmentSchema = z.object({
  op: z.enum(["member", "gusset", "weld_bead"]).optional().describe("weldment op"),
  weldment: z.enum(["member", "gusset", "weld_bead"]).optional().describe("alias of op"),
  type: z.enum(["member", "gusset", "weld_bead"]).optional().describe("alias of op"),
  section_area_mm2: z.coerce.number().optional().describe("member profile cross-section area (mm^2)"),
  length_mm: z.coerce.number().optional().describe("member / weld-bead length (mm)"),
  leg_a_mm: z.coerce.number().optional().describe("gusset leg A (mm)"),
  leg_b_mm: z.coerce.number().optional().describe("gusset leg B (mm)"),
  thickness_mm: z.coerce.number().optional().describe("gusset plate thickness (mm)"),
  leg_mm: z.coerce.number().optional().describe("fillet weld leg size (mm)"),
}).passthrough();
const cadSheetMetalSchema = z.object({
  op: z.enum(["bend_allowance", "flat_pattern"]).optional().describe("sheet-metal op"),
  operation: z.enum(["bend_allowance", "flat_pattern"]).optional().describe("alias of op"),
  type: z.enum(["bend_allowance", "flat_pattern"]).optional().describe("alias of op"),
  material: z.string().optional().describe("material (engine validates the known set)"),
  thickness_mm: z.coerce.number().optional().describe("sheet thickness (mm)"),
  bend_angle_deg: z.coerce.number().optional().describe("included bend angle (deg) -- bend_allowance"),
  inside_radius_mm: z.coerce.number().optional().describe("inside bend radius (mm) -- bend_allowance"),
  k_factor: z.coerce.number().optional().describe("neutral-axis K-factor override -- bend_allowance"),
  bend_method: z.string().optional().describe("air_bend|bottom_bend|coining|folding|roll_bend"),
  die_opening_mm: z.coerce.number().optional().describe("V-die opening (mm) -- bend_allowance"),
  bend_radius_mm: z.coerce.number().optional().describe("inside bend radius (mm) -- flat_pattern"),
  leg_lengths_mm: z.array(z.coerce.number()).optional().describe("flat-pattern leg lengths (mm)"),
  bend_angles_deg: z.array(z.coerce.number()).optional().describe("flat-pattern bend angles (deg)"),
  k_factor_override: z.coerce.number().optional().describe("K-factor override -- flat_pattern"),
}).passthrough();
const cad2DDrawingPartSize = z.object({
  x: z.coerce.number().describe("bounding-box width (front/top view width)"),
  y: z.coerce.number().describe("bounding-box depth (top view height, right view width)"),
  z: z.coerce.number().describe("bounding-box height (front/right view height)"),
});
const cad2DDrawingSchema = z.object({
  op: z.enum(["ortho_views"]).optional().describe("drawing-generation op"),
  operation: z.enum(["ortho_views"]).optional().describe("alias of op"),
  type: z.enum(["ortho_views"]).optional().describe("alias of op"),
  projection: z.enum(["first_angle", "third_angle"]).optional().describe("projection standard (default third_angle / ASME)"),
  view_spacing_mm: z.coerce.number().optional().describe("spacing between views (mm, default 100; mm-only -- rejected with units='inch')"),
  view_spacing: z.coerce.number().optional().describe("spacing between views in `units` (unsuffixed twin of view_spacing_mm; pass exactly one)"),
  units: z.enum(["mm", "in", "inch", "inches"]).optional().describe("declared input units (default mm; JM STEP convention is INCH -- declare it, engine converts via canonical INCH_TO_MM, never silently mixes)"),
  part_size_mm: cad2DDrawingPartSize.optional().describe("part bounding box (mm) -- enables view-overlap clearance + degenerate-geometry guard"),
  part_size: cad2DDrawingPartSize.optional().describe("part bounding box in `units` (unsuffixed twin of part_size_mm; pass exactly one)"),
  min_gap_mm: z.coerce.number().optional().describe("minimum white-space gap between view outlines (mm, house default 25)"),
  min_gap: z.coerce.number().optional().describe("minimum white-space gap in `units` (unsuffixed twin of min_gap_mm; pass exactly one)"),
}).passthrough();

export const ACTION_CAD_SCHEMAS: Record<string, z.ZodType<any>> = {
  // coverage-meter feature actions (delta 2026-06-26) -- wire input validation for the wired actions
  cad_feature_subtract: cadFeatureSubtractSchema,
  cad_feature_pattern: cadFeaturePatternSchema,
  cad_datum_create: cadDatumCreateSchema,
  cad_die_design: cadDieDesignSchema,
  cad_boolean: cadBooleanSchema,
  cad_mate: cadMateSchema,
  cad_weldment: cadWeldmentSchema,
  cad_sheetmetal: cadSheetMetalSchema,
  cad_drawing_generate: cad2DDrawingSchema,
  // cad_holdout_check (delta U-DELTA-HOLDOUT-CHECK-PARITY) -- train/test leak-check vs one+ frozen eval splits.
  // All fields optional at the type level; the action enforces ">=1 manifest AND >=1 train source" inline (R12).
  cad_holdout_check: z.object({
    holdoutManifest: z.union([z.string(), z.array(z.string())]).optional().describe("Frozen eval-split manifest path(s), repo-relative or absolute; a string or string[]"),
    holdoutManifests: z.array(z.string()).optional().describe("Multiple eval-split manifest paths, unioned (array form of holdoutManifest)"),
    trainPaths: z.array(z.string()).optional().describe("abs_path strings about to be trained on (checked via the path + stem arms)"),
    trainRecords: z.array(z.record(z.string(), z.unknown())).optional().describe("Full training-pair records with cad_files[]/part_number for the part-identity (id) arm"),
  }),
  // U-CADDRAW-FEATURE-LEDGER (delta) -- feature-completeness ledger (engine owns deep validation; z.unknown passthrough)
  cad_feature_ledger_build: z.object({
    extraction: z.unknown().describe("DimensionExtractionResult from PDFBlueprintDimensionExtractorEngine"),
    partNumber: z.string().optional().describe("part-number key for the ledger"),
    part_number: z.string().optional().describe("snake_case alias of partNumber"),
  }),
  cad_feature_ledger_reconcile: z.object({
    ledger: z.unknown().describe("FeatureLedger from cad_feature_ledger_build"),
    modelFeatures: z.array(z.unknown()).optional().describe("features measured from the drawn model (mm canonical)"),
    model_features: z.array(z.unknown()).optional().describe("snake_case alias of modelFeatures"),
  }),
  cad_feature_ledger_status: z.object({
    ledger: z.unknown().describe("FeatureLedger to advance"),
    featureId: z.string().optional().describe("id of the feature to advance"),
    feature_id: z.string().optional().describe("snake_case alias of featureId"),
    toStatus: z.string().optional().describe("target status: extracted|sketched|modeled|validated"),
    status: z.string().optional().describe("alias of toStatus"),
  }),
  cad_sketch_dim_gate: z.object({
    ledger: z.unknown().describe("FeatureLedger from cad_feature_ledger_build"),
    sketchDimensions: z.array(z.unknown()).optional().describe("dimensions captured from the 2D sketches (mm canonical)"),
    sketch_dimensions: z.array(z.unknown()).optional().describe("snake_case alias of sketchDimensions"),
  }),
  cad_tribal_draw_query: z.object({
    operation: z.string().optional().describe("drawing operation e.g. step-emit / electrode / replicate / mutate / sketch / verify"),
    featureType: z.string().optional().describe("feature being authored e.g. diameter / bore / electrode / chamfer"),
    query: z.string().optional().describe("free-text keyword query"),
    limit: z.number().int().min(0).max(50).optional().describe("cap on injected tips (default 5)"),
    context: z.unknown().optional().describe("DrawContext object alternative to the flat fields"),
    corpus: z.array(z.unknown()).optional().describe("inline CAD tribal tips; if absent the tracked CAD_DRAW_TRIBAL_TIPS catalog is used"),
  }),
  cad_apply_stock_allowance: z.object({
    nominalMm: z.number().optional().describe("nominal dimension (mm) to apply finish stock to (single mode)"),
    allowance: z.unknown().optional().describe("StockAllowance {op,surface,allowanceMm?,diametral?,electrodeMaterial?,regime?}"),
    items: z.array(z.unknown()).optional().describe("batch mode: [{nominalMm, allowance, label?}]"),
  }),
  // U-PPL-D4 (echo) — sibling program-equivalent-index.json producer
  program_equivalent_index_compose: programEquivalentIndexComposeSchema,
  // Docustrata customer-folder index — DocustrataCustomerIndexEngine query surface
  docustrata_customer_index: docustrataCustomerIndexSchema,
  // U-PPL-D4-EXT (delta) — bridge to extend existing v6 join with CAD entries
  cad_archive_join_augment: cadArchiveJoinAugmentSchema,
  cad_archive_join_augment_dry: cadArchiveJoinAugmentSchema,
  // WIRE-UNWIRED-MS0/U-WIRE-CADBRIDGE — CadBridge operability (no spawn)
  cad_bridge_status: cadBridgeStatusSchema,
  // CAD-COMPLETE-MS0/U-CADC-LP01 — CAD outcome bus (publish + inspect)
  cad_outcome_publish: cadOutcomePublishSchema,
  cad_outcome_stats: cadOutcomeStatsSchema,
  cad_outcome_subscribers: cadOutcomeSubscribersSchema,
  cad_feedback_metrics: cadFeedbackMetricsSchema,
  cad_feedback_buffer: cadFeedbackBufferSchema,
  cad_feedback_stats: cadFeedbackStatsSchema,
  cad_replay_stats: cadReplayStatsSchema,
  cad_replay_entries: cadReplayEntriesSchema,
  cad_backprop_params: cadBackpropParamsSchema,
  cad_backprop_stats: cadBackpropStatsSchema,
  cad_encoder_vocab: cadEncoderVocabSchema,
  cad_encoder_stats: cadEncoderStatsSchema,
  hypercads_live_new_doc: hypercadsLiveNewDocSchema,
  hypercads_live_sketch: hypercadsLiveSketchSchema,
  hypercads_live_extrude: hypercadsLiveExtrudeSchema,
  hypercads_live_fillet: hypercadsLiveEdgeOpSchema,
  hypercads_live_chamfer: hypercadsLiveEdgeOpSchema,
  hypercads_live_revolve: hypercadsLiveRevolveSchema,
  hypercads_live_hole: hypercadsLiveHoleSchema,
  hypercads_live_pattern: hypercadsLivePatternSchema,
  hypercads_live_combine: hypercadsLiveCombineSchema,
  hypercads_live_shell: hypercadsLiveShellSchema,
  hypercads_live_export: hypercadsLiveExportSchema,
  hypercads_live_geometry: hypercadsLiveGeometrySchema,
  hypercads_live_undo: hypercadsLiveUndoSchema,
  hypercads_live_regenerate: hypercadsLiveRegenerateSchema,
  hypercads_live_execute_raw: hypercadsLiveExecuteRawSchema,
  hypercads_live_stats: hypercadsLiveStatsSchema,
  hypercads_live_list_sessions: hypercadsLiveListSessionsSchema,
  cad_hypercads_outcome_stats: cadHypercadsOutcomeStatsSchema,
  cad_hypercads_outcome_adapter: cadHypercadsOutcomeAdapterSchema,
  cad_regen_feedback_publish: cadRegenFeedbackPublishSchema,
  cad_regen_feedback_stats: cadRegenFeedbackStatsSchema,
  cad_arg_encoder_encode: cadArgEncoderEncodeSchema,
  cad_arg_encoder_batch: cadArgEncoderBatchSchema,
  cad_arg_encoder_stats: cadArgEncoderStatsSchema,
  cad_decoder_propose: cadDecoderProposeSchema,
  cad_decoder_propose_topk: cadDecoderProposeTopKSchema,
  cad_decoder_vocab: cadDecoderVocabSchema,
  cad_decoder_stats: cadDecoderStatsSchema,
  cad_sequence_pool: cadSequencePoolSchema,
  cad_sequence_pool_all: cadSequencePoolAllSchema,
  cad_sequence_pool_strategies: cadSequencePoolStrategiesSchema,
  cad_sequence_pool_stats: cadSequencePoolStatsSchema,
  cad_unified_feature_encode: cadUnifiedFeatureEncodeSchema,
  cad_unified_feature_layout: cadUnifiedFeatureLayoutSchema,
  cad_unified_feature_stats: cadUnifiedFeatureStatsSchema,
  cad_tolerance_encode: cadToleranceEncodeSchema,
  cad_tolerance_augment: cadToleranceAugmentSchema,
  cad_tolerance_stats: cadToleranceStatsSchema,
  cad_draw_any_part: cadDrawAnyPartSchema,
  cad_draw_any_part_stats: cadDrawAnyPartStatsSchema,
  hypercads_tutorial_corpus_ingest: hyperCADSTutorialCorpusIngestSchema,
  hypercads_tutorial_corpus_stats: hyperCADSTutorialCorpusStatsSchema,
  cad_reverse_template: cadReverseTemplateSchema,
  cad_reverse_categorize: cadReverseCategorizeSchema,
  cad_reverse_template_stats: cadReverseTemplateStatsSchema,
  cad_canonical_to_ops: cadCanonicalTreeSchema,
  cad_canonical_reverse_engineer: cadCanonicalTreeSchema,
  cad_canonical_adapt_stats: cadCanonicalAdaptStatsSchema,
  cad_corpus_catalog_build: cadCorpusCatalogBuildSchema,
  cad_corpus_catalog_merge: cadCorpusCatalogMergeSchema,
  cad_corpus_catalog_stats: cadCorpusCatalogStatsSchema,
  // CAD-CLOSED-LOOP-MS0 -- CADRegenCorrectionEngine (Stage-6 CORRECT->CONVERGE).
  // Fields are optional + passthrough because the dispatcher also accepts camelCase
  // aliases (compareResult/correctionParams/params); the engine fail-loud guards
  // any genuinely-missing input. Validates the shape of whichever keys are present.
  cad_regen_correct: z
    .object({
      compare_result: z
        .object({
          overallPassed: z.boolean().optional(),
          passRate: z.number().optional(),
          metrics: z
            .array(
              z
                .object({
                  metric: z.string(),
                  original: z.number(),
                  generated: z.number(),
                  deltaPercent: z.number(),
                  threshold: z.number().optional(),
                  passed: z.boolean(),
                })
                .passthrough(),
            )
            .describe("Per-metric delta vector"),
        })
        .passthrough()
        .optional()
        .describe("ComparisonResult from geometry_compare_files (or camelCase compareResult)"),
      correction_params: z
        .array(
          z.object({
            name: z.string(),
            value: z.number(),
            influences: z.array(z.string()),
            min: z.number().optional(),
            max: z.number().optional(),
            monotonicity: z.number().optional(),
            opIndex: z.number().int().optional(),
            argKey: z.string().optional(),
          }),
        )
        .optional()
        .describe("Tunable params / convergence search space (or camelCase correctionParams/params)"),
      iteration: z.number().int().nonnegative().optional().describe("Correction steps already taken"),
      previous_max_delta_percent: z.number().optional().describe("Worst |deltaPercent| from the prior iteration"),
      stagnant_iterations: z.number().int().nonnegative().optional().describe("Consecutive prior non-progress iterations"),
      history: z
        .array(
          z.object({
            params: z.record(z.string(), z.number()),
            metrics: z.record(z.string(), z.number()),
          }),
        )
        .optional()
        .describe("Prior (param,metric) samples for the secant method"),
      config: z
        .object({
          maxIterations: z.number().int().positive(),
          plateauEpsilon: z.number(),
          plateauPatience: z.number().int().positive(),
          maxStepFraction: z.number(),
          method: z.enum(["proportional", "secant", "coordinate-descent", "auto"]),
          passRateTarget: z.number(),
        })
        .partial()
        .optional()
        .describe("Correction config overrides"),
    })
    .passthrough(),
  cad_regen_apply_template: z
    .object({
      op_template: z
        .array(z.object({ kind: z.string() }).passthrough())
        .optional()
        .describe("Reverse-engineered op stream (or camelCase opTemplate)"),
      corrections: z
        .array(z.object({ name: z.string(), newValue: z.number() }).passthrough())
        .optional()
        .describe("ParamCorrection[] from a correct() result"),
      param_lineage: z
        .array(z.object({ name: z.string() }).passthrough())
        .optional()
        .describe("CorrectionParam[] carrying opIndex+argKey lineage (or camelCase paramLineage)"),
    })
    .passthrough(),
  cad_regen_params_from_template: z
    .object({
      template: z
        .object({ params: z.array(z.object({ name: z.string() }).passthrough()) })
        .passthrough()
        .optional()
        .describe("ReverseEngineeredTemplate"),
      influence_map: z
        .record(z.string(), z.array(z.string()))
        .optional()
        .describe("metric name -> driving param names (or camelCase influenceMap)"),
    })
    .passthrough(),
  cad_regen_stats: z.object({}).passthrough().describe("No params; returns correction-engine counters"),
  // CAD-CLOSED-LOOP-MS0 -- control-point-cloud Hausdorff shape-fidelity metric.
  geometry_hausdorff: z
    .object({
      original_path: z.string().optional(),
      originalPath: z.string().optional(),
      file_a: z.string().optional(),
      fileA: z.string().optional(),
      generated_path: z.string().optional(),
      generatedPath: z.string().optional(),
      file_b: z.string().optional(),
      fileB: z.string().optional(),
      sample_cap: z.number().int().positive().optional(),
      sampleCap: z.number().int().positive().optional(),
      threshold_percent: z.number().optional(),
      thresholdPercent: z.number().optional(),
    })
    .passthrough()
    .describe("Hausdorff shape distance between two STEP files (reference fileA vs candidate fileB)"),
  // CAD-COMPLETE-MS0/U-AI-03 — UnitOfMeasureDisambiguationEngine (mm/inch resolver)
  cad_uom_resolve: z.object({
    input: z
      .union([z.string(), z.number()])
      .describe("Dimensional value to resolve — explicit ('0.5 in') or implicit ('0.5')"),
    documentUnit: z
      .enum(["metric", "imperial"])
      .optional()
      .describe("Declared default unit system of the CAD document"),
    priorUnitSystem: z
      .enum(["metric", "imperial"])
      .optional()
      .describe("Unit system of values already resolved this session"),
  }),
  cad_uom_resolve_batch: z.object({
    inputs: z
      .array(z.union([z.string(), z.number()]))
      .min(1)
      .describe("Dimensional values to resolve in order — earlier values anchor the unit for later ones"),
    documentUnit: z
      .enum(["metric", "imperial"])
      .optional()
      .describe("Declared default unit system of the CAD document"),
    priorUnitSystem: z
      .enum(["metric", "imperial"])
      .optional()
      .describe("Unit system of values already resolved this session"),
  }),
  cad_uom_convert: z.object({
    value: z.number().describe("Numeric value to convert"),
    from: z.enum(["mm", "in"]).describe("Source unit"),
    to: z.enum(["mm", "in"]).describe("Target unit"),
  }),
  // CAD-COMPLETE-MS0/U-AI-12 — RiskTierClassifierEngine (CAD-op risk tier)
  cad_risk_classify: z.object({
    kind: z.string().describe("CAD operation kind, e.g. 'extrude', 'delete_body', 'boolean_subtract'"),
    args: z
      .record(z.string(), z.unknown())
      .optional()
      .describe("Operation arguments — inspected for through-cut / subtract intent"),
    irreversible: z.boolean().optional().describe("True if the operation cannot be undone in the target CAD app"),
    touchesDatum: z
      .boolean()
      .optional()
      .describe("True if the op touches a datum, toleranced, or already-machined feature"),
    batch: z.boolean().optional().describe("True if the op fans out across multiple bodies / files / CAD apps"),
  }),
  cad_risk_classify_batch: z.object({
    ops: z
      .array(
        z.object({
          kind: z.string().describe("CAD operation kind"),
          args: z.record(z.string(), z.unknown()).optional().describe("Operation arguments"),
          irreversible: z.boolean().optional().describe("Op cannot be undone"),
          touchesDatum: z.boolean().optional().describe("Op touches a datum / toleranced / machined feature"),
          batch: z.boolean().optional().describe("Op fans out across bodies / files / apps"),
        }),
      )
      .min(1)
      .describe("Non-empty array of CAD operations to classify op-by-op"),
  }),
  cad_risk_classify_plan: z.object({
    ops: z
      .array(
        z.object({
          kind: z.string().describe("CAD operation kind"),
          args: z.record(z.string(), z.unknown()).optional().describe("Operation arguments"),
          irreversible: z.boolean().optional().describe("Op cannot be undone"),
          touchesDatum: z.boolean().optional().describe("Op touches a datum / toleranced / machined feature"),
          batch: z.boolean().optional().describe("Op fans out across bodies / files / apps"),
        }),
      )
      .describe("Ordered CAD operation plan classified as a whole (peak op + cumulative blast escalation)"),
  }),
  // CAD-COMPLETE-MS0/U-AI-09 — CADAppCircuitBreakerEngine (per-CAD-app breaker)
  cad_breaker_can_proceed: z.object({
    appId: z.string().describe("CAD application id, e.g. 'fusion360', 'hypermill', 'solidworks'"),
  }),
  cad_breaker_record_success: z.object({
    appId: z.string().describe("CAD application id"),
  }),
  cad_breaker_record_failure: z.object({
    appId: z.string().describe("CAD application id"),
    error: z.string().optional().describe("Failure detail recorded as the breaker's lastError"),
  }),
  cad_breaker_state: z.object({
    appId: z.string().describe("CAD application id"),
  }),
  cad_breaker_snapshot: z
    .object({})
    .describe("No parameters — returns the breaker state for every tracked CAD app"),
  // CAD-COMPLETE-MS0/U-AI-01 — CADFallbackRoutingEngine (preferred→next-best routing)
  cad_fallback_route: z.object({
    capability: z.string().optional().describe("Capability the caller needs, e.g. 'extrude', 'sheet_metal'"),
    preferredApp: z.string().optional().describe("CAD app the caller would prefer to use"),
    unavailable: z
      .array(z.string())
      .optional()
      .describe("App ids currently unavailable (circuit-broken / offline / excluded)"),
    apps: z
      .array(
        z.object({
          appId: z.string().describe("CAD application id"),
          priority: z.number().describe("Higher priority wins when several apps qualify"),
          capabilities: z.array(z.string()).describe("Capability tags the app supports"),
          enabled: z.boolean().optional().describe("Disabled apps are never selected"),
        }),
      )
      .optional()
      .describe("Inline CAD app list — overrides the registry when supplied"),
  }),
  cad_fallback_register: z.object({
    apps: z
      .array(
        z.object({
          appId: z.string().describe("CAD application id"),
          priority: z.number().describe("Higher priority wins when several apps qualify"),
          capabilities: z.array(z.string()).describe("Capability tags the app supports"),
          enabled: z.boolean().optional().describe("Disabled apps are never selected"),
        }),
      )
      .min(1)
      .describe("CAD app profiles to register in the routing registry"),
  }),
  cad_fallback_list: z.object({}).describe("No parameters — lists registered CAD apps by priority"),
  cad_fallback_reset: z.object({}).describe("No parameters — clears the CAD app routing registry"),
  cad_breaker_configure: z.object({
    appId: z.string().describe("CAD application id"),
    failureThreshold: z
      .number()
      .int()
      .min(1)
      .optional()
      .describe("Consecutive failures in CLOSED that trip the breaker OPEN"),
    successThreshold: z
      .number()
      .int()
      .min(1)
      .optional()
      .describe("Consecutive HALF_OPEN successes that close the breaker"),
    cooldownMs: z
      .number()
      .min(0)
      .optional()
      .describe("Milliseconds OPEN before a HALF_OPEN trial is permitted"),
    halfOpenMaxProbes: z
      .number()
      .int()
      .min(1)
      .optional()
      .describe("Max concurrent trial calls permitted while HALF_OPEN"),
  }),
  // CAD-COMPLETE-MS0/U-AI-02 — CADWorldModelEngine (CAD agent's document belief-state)
  cad_world_apply_op: z.object({
    docId: z.string().describe("Document id — the CAD document whose belief-state the op acts on"),
    op: z
      .object({
        kind: z.string().describe("Operation kind, e.g. 'create_body', 'extrude', 'delete', 'set_parameter'"),
        entityId: z.string().optional().describe("Target / new-entity id (auto-generated for a create op when omitted)"),
        entityKind: z
          .enum(["body", "sketch", "feature", "plane", "axis", "component"])
          .optional()
          .describe("Entity kind for a create op (inferred from op-kind tokens when omitted)"),
        name: z.string().optional().describe("Display name for a create / feature op"),
        parentId: z.string().optional().describe("Parent entity id for a create op"),
        parameter: z.string().optional().describe("Parameter name for a set-parameter op"),
        value: z.number().optional().describe("Parameter value for a set-parameter op (must be finite)"),
        units: z.enum(["mm", "in"]).optional().describe("New units for a set-units op"),
        selection: z.array(z.string()).optional().describe("Selection list for a select op"),
      })
      .optional()
      .describe("The CAD operation to apply (or pass the op fields inline — dispatcher accepts both)"),
    kind: z.string().optional().describe("Inline-op shortcut — operation kind"),
    entityId: z.string().optional().describe("Inline-op shortcut — target / new-entity id"),
    entityKind: z
      .enum(["body", "sketch", "feature", "plane", "axis", "component"])
      .optional()
      .describe("Inline-op shortcut — entity kind for a create op"),
    name: z.string().optional().describe("Inline-op shortcut — display name"),
    parentId: z.string().optional().describe("Inline-op shortcut — parent entity id"),
    parameter: z.string().optional().describe("Inline-op shortcut — parameter name"),
    value: z.number().optional().describe("Inline-op shortcut — parameter value (must be finite)"),
    units: z.enum(["mm", "in"]).optional().describe("Inline-op shortcut — units"),
    selection: z.array(z.string()).optional().describe("Inline-op shortcut — selection list"),
  }),
  cad_world_state: z.object({
    docId: z.string().describe("Document id whose believed state to read"),
  }),
  cad_world_checkpoint: z.object({
    docId: z.string().describe("Document id whose current state becomes the new diff baseline"),
  }),
  cad_world_diff: z.object({
    docId: z.string().describe("Document id — diff is computed against the document's last checkpoint"),
  }),
  cad_world_detect_drift: z.object({
    docId: z.string().describe("Document id whose belief-state is compared against the observation"),
    observed: z
      .object({
        entityIds: z.array(z.string()).describe("Entity ids the real CAD document currently has"),
        parameters: z
          .record(z.string(), z.number())
          .optional()
          .describe("Observed parameter name → value (partial observations are allowed)"),
        units: z.enum(["mm", "in"]).optional().describe("Active units in the real CAD document"),
      })
      .describe("What the agent actually saw when it queried the real CAD document"),
  }),
  cad_world_reset: z.object({
    docId: z
      .string()
      .optional()
      .describe("Document id to reset; omit to reset every tracked document"),
  }),
  // CAD-COMPLETE-MS0/U-AI-10 — CADTraceAssemblyEngine (OTel span -> end-to-end trace view)
  // Schemas are STRICTER than the engine's internal validation: caller-supplied
  // spans must carry a non-empty traceId / spanId / name and a finite startTime
  // (engine defaults like "(unnamed span)" are defense-in-depth for the
  // cad_trace_from_tracer adapter path, NOT a promise to MCP callers).
  cad_trace_assemble: z.object({
    spans: z
      .array(
        z.object({
          traceId: z.string().min(1).describe("Trace id (groups spans into one trace)"),
          spanId: z.string().min(1).describe("Span id (unique within a trace)"),
          parentSpanId: z.string().optional().describe("Parent span id; absent for a root span"),
          name: z.string().min(1).describe("Span operation name"),
          startTime: z.number().finite().describe("Span start time in ms (epoch or relative)"),
          endTime: z
            .number()
            .finite()
            .optional()
            .describe("Span end time in ms; absent for an in-progress span"),
          status: z.enum(["unset", "ok", "error"]).optional().describe("Span outcome status"),
          statusMessage: z.string().optional().describe("Optional status message (e.g. error text)"),
        }),
      )
      .describe("Flat span list — the engine groups by traceId and emits one TraceView per group"),
  }),
  cad_trace_get: z.object({
    spans: z
      .array(
        z.object({
          traceId: z.string().min(1).describe("Trace id"),
          spanId: z.string().min(1).describe("Span id"),
          parentSpanId: z.string().optional().describe("Parent span id; absent for a root span"),
          name: z.string().min(1).describe("Span operation name"),
          startTime: z.number().finite().describe("Span start time in ms"),
          endTime: z
            .number()
            .finite()
            .optional()
            .describe("Span end time in ms; absent if in-progress"),
          status: z.enum(["unset", "ok", "error"]).optional().describe("Span outcome status"),
          statusMessage: z.string().optional().describe("Optional status message"),
        }),
      )
      .describe("Flat span list to filter by traceId"),
    traceId: z
      .string()
      .min(1)
      .describe("Trace id to assemble (snake_case 'trace_id' alias auto-normalized at the dispatcher edge)"),
  }),
  cad_trace_from_tracer: z.object({
    traceId: z
      .string()
      .optional()
      .describe(
        "Optional trace id to filter the live OpenTelemetryTracingEngine output to one trace; omit to assemble every completed trace",
      ),
    tenantId: z
      .string()
      .min(1)
      .optional()
      .describe(
        "Optional tenant id — when set, only OTel spans tagged with this prism.tenant_id are admitted. PRIVILEGED: omitting in a multi-tenant deployment reads the global completed-span buffer.",
      ),
    maxTraces: z
      .number()
      .int()
      .min(1)
      .optional()
      .describe(
        "Cap on traces returned when traceId is omitted (default 100). Use trace_id for unbounded single-trace lookup.",
      ),
  }),
  // CAD-COMPLETE-MS0/U-AI-08 — CADTransactionEngine (atomic begin/apply/commit/rollback over CADWorldModelEngine)
  // Schemas mirror the cad_world_apply_op shape for the op field — same world
  // model, same op contract. Validation at the MCP edge is STRICTER than the
  // engine's internal checks (docId / txnId .min(1)) — caller-supplied ids
  // must be non-empty strings, not the engine-tolerated trimmed-empty fallback.
  cad_txn_begin: z.object({
    docId: z.string().min(1).describe("Document id whose world-model state becomes the transaction baseline"),
    units: z
      .enum(["mm", "in"])
      .optional()
      .describe("Units to assume if the document does not yet exist (default 'mm')"),
  }),
  cad_txn_apply: z.object({
    txnId: z.string().min(1).describe("Transaction id returned by cad_txn_begin"),
    op: z
      .object({
        kind: z.string().min(1).describe("Operation kind, e.g. 'create_body', 'extrude', 'delete', 'set_parameter'"),
        entityId: z.string().optional().describe("Target / new-entity id"),
        entityKind: z
          .enum(["body", "sketch", "feature", "plane", "axis", "component"])
          .optional()
          .describe("Entity kind for a create op (inferred from op-kind tokens when omitted)"),
        name: z.string().optional().describe("Display name for a create / feature op"),
        parentId: z.string().optional().describe("Parent entity id for a create op"),
        parameter: z.string().optional().describe("Parameter name for a set-parameter op"),
        value: z.number().finite().optional().describe("Parameter value for a set-parameter op (must be finite)"),
        units: z.enum(["mm", "in"]).optional().describe("New units for a set-units op"),
        selection: z.array(z.string()).optional().describe("Selection list for a select op"),
      })
      .describe("The CAD operation to apply inside the transaction"),
  }),
  cad_txn_commit: z.object({
    txnId: z.string().min(1).describe("Transaction id to commit (terminal — cannot be re-committed)"),
  }),
  cad_txn_rollback: z.object({
    txnId: z.string().min(1).describe("Transaction id to roll back (terminal — restores baseline + releases doc lock)"),
  }),
  cad_txn_status: z.object({
    txnId: z.string().min(1).describe("Transaction id to inspect (returns null when unknown)"),
  }),
  cad_txn_list: z.object({
    docId: z
      .string()
      .min(1)
      .optional()
      .describe("Optional docId filter; omit to list every tracked transaction (ordered oldest first)"),
  }),
  cad_txn_apply_all: z.object({
    docId: z.string().min(1).describe("Document id — begin/apply each/commit-or-rollback in one call"),
    ops: z
      .array(
        z.object({
          kind: z.string().min(1).describe("Operation kind"),
          entityId: z.string().optional(),
          entityKind: z.enum(["body", "sketch", "feature", "plane", "axis", "component"]).optional(),
          name: z.string().optional(),
          parentId: z.string().optional(),
          parameter: z.string().optional(),
          value: z.number().finite().optional(),
          units: z.enum(["mm", "in"]).optional(),
          selection: z.array(z.string()).optional(),
        }),
      )
      .max(1000)
      .describe("Ordered ops (cap 1000 — DoS guard); on any apply failure the auto-rollback restores the baseline and committed=false"),
    units: z.enum(["mm", "in"]).optional().describe("Units to assume if the document does not yet exist"),
  }),
  cad_txn_reset: z
    .object({
      confirm: z
        .literal("RESET_ALL_TRANSACTIONS")
        .describe(
          "REQUIRED literal 'RESET_ALL_TRANSACTIONS' — fleet-destructive; drops every tracked transaction and releases every doc lock, including peer chats' in-flight work. Test / hygiene only.",
        ),
    })
    .describe("DESTRUCTIVE: drop every transaction + release every doc lock across the whole fleet"),
  // CAD-COMPLETE-MS0/U-AI-07 — CADPreviewEngine (pure dry-run preview)
  cad_preview_apply: z
    .object({
      docId: z.string().min(1).describe("Document id to preview the op against (real world is NEVER mutated, even on success)"),
      op: z
        .object({
          kind: z.string().min(1).describe("Operation kind, e.g. 'create_body', 'extrude', 'delete', 'set_parameter'"),
          entityId: z.string().optional().describe("Target / new-entity id"),
          entityKind: z
            .enum(["body", "sketch", "feature", "plane", "axis", "component"])
            .optional()
            .describe("Entity kind for a create op (inferred from op-kind tokens when omitted)"),
          name: z.string().optional().describe("Display name for a create / feature op"),
          parentId: z.string().optional().describe("Parent entity id for a create op"),
          parameter: z.string().optional().describe("Parameter name for a set-parameter op"),
          value: z.number().finite().optional().describe("Parameter value for a set-parameter op (must be finite)"),
          units: z.enum(["mm", "in"]).optional().describe("New units for a set-units op"),
          selection: z.array(z.string()).optional().describe("Selection list for a select op"),
        })
        .describe("The CAD operation whose effect to preview"),
      units: z
        .enum(["mm", "in"])
        .optional()
        .describe("Units to assume if the document does not yet exist in the real world (default 'mm'; ignored for known docs)"),
    })
    .describe("Pure dry-run preview of a single op — returns projected state + diff WITHOUT mutating cadWorldModelEngine"),
  cad_preview_apply_all: z
    .object({
      docId: z.string().min(1).describe("Document id to preview the batch against (real world is NEVER mutated, even on success)"),
      ops: z
        .array(
          z.object({
            kind: z.string().min(1).describe("Operation kind"),
            entityId: z.string().optional(),
            entityKind: z.enum(["body", "sketch", "feature", "plane", "axis", "component"]).optional(),
            name: z.string().optional(),
            parentId: z.string().optional(),
            parameter: z.string().optional(),
            value: z.number().finite().optional(),
            units: z.enum(["mm", "in"]).optional(),
            selection: z.array(z.string()).optional(),
          }),
        )
        .max(1000)
        .describe("Ordered ops (cap 1000 — DoS guard); any failure → applied=false + projectedState=null (atomic all-or-nothing)"),
      units: z
        .enum(["mm", "in"])
        .optional()
        .describe("Units to assume if the document does not yet exist in the real world (default 'mm'; ignored for known docs)"),
    })
    .describe("Pure dry-run preview of an ordered batch — returns projected diff WITHOUT mutating cadWorldModelEngine; inherits atomicity from CADTransactionEngine.applyAll"),
  // CAD-COMPLETE-MS0/U-AI-11 — CADConsensusEngine. The 3 actions share
  // cadConsensusPredictionItemSchema (defined at module scope above) — full
  // .describe() on every nested field (P1-1 fix), DRY across all 3 (P2-1 fix).
  cad_consensus_score: z
    .object({
      predictions: z
        .array(cadConsensusPredictionItemSchema)
        .min(1)
        .max(100)
        .refine(
          (arr) => new Set(arr.map((p) => p.id)).size === arr.length,
          { message: "predictions[].id must be unique within the set" },
        )
        .describe("N predictions to consensus over (min 1, cap 100 — DoS guard); ids must be unique (schema-boundary refine + engine validation)"),
    })
    .describe("Per-field support fractions + pairwise Jaccard + meanAgreement over N CADWorldDiff predictions; pure structural scoring, no LLM calls"),
  cad_consensus_pick: z
    .object({
      predictions: z
        .array(cadConsensusPredictionItemSchema)
        .min(1)
        .max(100)
        .refine(
          (arr) => new Set(arr.map((p) => p.id)).size === arr.length,
          { message: "predictions[].id must be unique within the set" },
        )
        .describe("N predictions to consensus over (min 1, cap 100 — DoS guard); ids must be unique"),
      dissentThreshold: z
        .number()
        .finite()
        .min(0)
        .max(1)
        .optional()
        .describe("Predictions with agreement below this Jaccard threshold are reported as dissenters; default 0.5"),
    })
    .describe("Medoid pick (highest mean Jaccard to others) + dissenter list; tie-broken DETERMINISTICALLY by input order"),
  cad_consensus_parameter_clusters: z
    .object({
      predictions: z
        .array(cadConsensusPredictionItemSchema)
        .min(1)
        .max(100)
        .refine(
          (arr) => new Set(arr.map((p) => p.id)).size === arr.length,
          { message: "predictions[].id must be unique within the set" },
        )
        .describe("N predictions to cluster numerical values across (min 1, cap 100); only predictions with projectedState contribute"),
    })
    .describe("Per-parameter numerical-value clusters — same value within PARAM_EPSILON (1e-9) merges; multi-cluster means LLMs computed different values"),
  // Geometry
  geometry_create: geometryCreateSchema,
  geometry_transform: geometryTransformSchema,
  geometry_analyze: geometryAnalyzeSchema,
  // Mesh
  mesh_generate: meshGenerateSchema,
  mesh_import: meshImportSchema,
  mesh_export: meshExportSchema,
  // Feature
  feature_recognize: featureRecognizeSchema,
  feature_edit: featureEditSchema,
  // Stock/WCS/DfM
  stock_model: stockModelSchema,
  wcs_setup: wcsSetupSchema,
  dfm_check: dfmCheckSchema,
  // CAD Capability Negotiator — CAD-COMPLETE-MS0/U-CADC-AI03
  cad_capability_negotiate: z.object({
    ops: z.array(z.string()).describe("Ordered CAD operation kinds the caller wants to emit"),
    preferredSystem: z.string().optional().describe("Preferred CAD adapter id; picked first when policy allows"),
    policy: z.enum(["strict", "fallback", "best_fit"]).optional().describe("strict throws on missing op; fallback tries alternatives; best_fit picks highest coverage"),
    excludeSystems: z.array(z.string()).optional().describe("Adapter ids that may never be considered"),
    excludeSubprocess: z.boolean().optional().describe("When true, adapters with requiresSubprocess=true are filtered out"),
  }),
  cad_capability_negotiate_or_throw: z.object({
    // .min(1) — "throw on missing" with zero ops is semantically incoherent;
    // schema-reject at the MCP boundary so callers get a clear error rather
    // than silent trivial-supported behavior.
    ops: z.array(z.string()).min(1).describe("Ordered CAD operation kinds the caller wants to emit (at least one required)"),
    preferredSystem: z.string().optional().describe("Preferred CAD adapter id"),
    policy: z.enum(["strict", "fallback", "best_fit"]).optional().describe("Negotiation policy"),
    excludeSystems: z.array(z.string()).optional().describe("Adapter blocklist"),
    excludeSubprocess: z.boolean().optional().describe("Filter subprocess-required adapters"),
  }),
  cad_capability_list_gaps: z.object({
    referenceOps: z.array(z.string()).optional().describe("Optional op-kind reference list; when omitted returns the full capability snapshot per adapter"),
  }),
  // CAD Registry (U-CADC03)
  cad_registry_scan: cadRegistryScanSchema,
  cad_registry_search: cadRegistrySearchSchema,
  cad_registry_get: cadRegistryGetSchema,
  cad_registry_stats: cadRegistryStatsSchema ?? z.object({}),
  // Geometry Comparison (U-CADC26)
  geometry_compare_files: geometryCompareFilesSchema,
  geometry_extract_metrics: geometryExtractMetricsSchema,
  geometry_batch_compare: geometryBatchCompareSchema,
  geometry_set_thresholds: geometrySetThresholdsSchema,
  geometry_format_detect: geometryFormatDetectSchema,
  // CAD Regen Test (U-CADC21)
  cad_regen_test: cadRegenTestSchema,
  cad_regen_batch: cadRegenBatchSchema,
  cad_regen_compare: cadRegenCompareSchema,
  cad_regen_thresholds: cadRegenThresholdsSchema,
  // Print → Fusion 360 Bridge (U-CADC-FUS-PRINT-01)
  print_to_fusion360: printToFusion360Schema,
  print_to_fusion360_validate: printToFusion360ValidateSchema,
  print_to_fusion360_capabilities: printToFusion360CapabilitiesSchema,
  // Print → Mastercam / Inventor / SolidWorks / Esprit Bridges
  print_to_mastercam: printToBridgeBaseSchema,
  print_to_mastercam_validate: printToBridgeBaseSchema,
  print_to_mastercam_capabilities: printToCapabilitiesSchema,
  print_to_inventor: printToBridgeBaseSchema,
  print_to_inventor_validate: printToBridgeBaseSchema,
  print_to_inventor_capabilities: printToCapabilitiesSchema,
  print_to_solidworks: printToBridgeBaseSchema,
  print_to_solidworks_validate: printToBridgeBaseSchema,
  print_to_solidworks_capabilities: printToCapabilitiesSchema,
  print_to_esprit: printToBridgeBaseSchema,
  print_to_esprit_validate: printToBridgeBaseSchema,
  print_to_esprit_capabilities: printToCapabilitiesSchema,
  // Esprit Code Generator
  esprit_generate_script: espritGenerateScriptSchema,
  esprit_capabilities: espritCapabilitiesSchema,
  // Print → All CADs Orchestrator
  print_to_all_cads: printToAllCadsSchema,
  print_to_all_cads_validate: printToAllCadsSchema,
  print_to_all_cads_targets: printToAllCadsTargetsSchema,
  // Print → hyperCAD-S Analysis Bridge
  print_to_hypercads_analysis: printToHyperCADSAnalysisSchema,
  print_to_hypercads_analysis_validate: printToHyperCADSAnalysisSchema,
  print_to_hypercads_analysis_capabilities: liveModesSchema,
  // SolidWorks Live Bridge
  solidworks_live_execute: liveExecuteSchema,
  solidworks_live_validate: liveValidateSchema,
  solidworks_live_modes: liveModesSchema,
  // Esprit Live Bridge
  esprit_live_execute: liveExecuteSchema,
  esprit_live_validate: liveValidateSchema,
  esprit_live_modes: liveModesSchema,
  // Blueprint OCR → 6-CAD Orchestrator
  blueprint_to_all_cads: blueprintToAllCadsSchema,
  blueprint_to_all_cads_validate: blueprintToAllCadsSchema,
  blueprint_to_all_cads_capabilities: blueprintToAllCadsCapabilitiesSchema,
  // CAD Trial-Error Learning (U-CADC29)
  cad_trial_ingest: cadTrialIngestSchema,
  cad_trial_patterns: cadTrialPatternsSchema,
  cad_trial_recommend: cadTrialRecommendSchema,
  cad_trial_stats: cadTrialStatsSchema,
  cad_trial_reset: cadTrialResetSchema,
  // NACA Airfoil Engine (U-CADC13)
  naca_generate_4digit: nacaGenerate4DigitSchema,
  naca_generate_5digit: nacaGenerate5DigitSchema,
  naca_parse_uiuc_dat: nacaParseUIUCDatSchema,
  // Lofted Wing Engine (U-CADC14)
  wing_loft_single_profile: wingLoftSingleProfileSchema,
  wing_loft_between_profiles: wingLoftBetweenProfilesSchema,
  wing_compute_properties: wingComputePropertiesSchema,
  // Involute Gear Engine (U-CADC15)
  gear_compute_geometry: gearComputeGeometrySchema,
  gear_generate_tooth_profile: gearGenerateToothProfileSchema,
  gear_compute_contact_ratio: gearComputeContactRatioSchema,
  // Helical Spring Engine (U-CADC16)
  spring_compute_geometry: springComputeGeometrySchema,
  spring_compute_mechanics: springComputeMechanicsSchema,
  spring_compute_stress_at_force: springComputeStressAtForceSchema,
  spring_generate_coil_path: springGenerateCoilPathSchema,
  // Part Folder Organizer — JM Die per-customer / per-part-number library
  create_part_folder: createPartFolderSchema,
  get_part_folder: getPartFolderSchema,
  part_library_stats: partLibraryStatsSchema,
  part_library_populate: partLibraryPopulateSchema,
  // Macro library — catalog the JM Okuma-OSP lathe macros + match parts to families + place a labelled TEMPLATE
  macro_library_list: macroLibraryListSchema,
  macro_match_family: macroMatchFamilySchema,
  macro_place_template: macroPlaceTemplateSchema,
  macro_fanout_dry_run: macroFanoutDryRunSchema,
  // TRAINING-LEARNING-MS0/U1: CAD-domain bridge alias for macro_place_template,
  // scoped to ALL 12 LatheTemplateFamily literals (not just the 4 OSP-anchored).
  // Reviewer B P0: the envelope's `families_target` at MS0-U1 line 86 explicitly
  // includes `shaft` and `flange` — they must pass Zod even though the engine has
  // no OSP-anchored macro file for them (engine returns a structured graceful
  // failure: `{placed:false, family, reason: "macro source file not found: ..."}`).
  cad_lathe_template_place: cadLatheTemplatePlaceSchema,
};
