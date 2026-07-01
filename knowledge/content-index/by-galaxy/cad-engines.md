---
name: cad-engines
description: Strategic, categorized engine digest for the CAD (geometry + part-model) galaxy -- feature recognition, STEP/AP242 round-trip, geometry kernel, generative print/photo/text-to-CAD, seat bridges, closed-loop regen, and the S(x) collision gate.
type: reference
galaxy: cad
node_type: memory
---

# cad galaxy -- engine digest

## Overview

The cad galaxy is PRISM's geometry + part-model layer: prints/photos/text/intent -> solid models -> feature recognition -> dimensional validation -> neutral-format round-trip (grounded in `mcp-server/src/engines/cad/CLAUDE.md` sec 1). It OWNS the geometry kernel + ops (Vec3/Mat4/NURBS/CSG/boolean/tessellation), feature recognition + taxonomy, STEP/IGES/AP242 round-trip, generative CAD (blueprint->CAD, photo->CAD, text->CAD), seat bridges (Fusion 360, Inventor, SolidWorks, FreeCAD, Mastercam-CAD, BobCAD, hyperCAD-S, CadQuery), GD&T/drawing knowledge, and collision/stock clearance (the safety-relevant S(x) gate). It EXCLUDES CAM toolpath strategy (cam/kilo), controller G-code emission (post-processor/echo), OCR raster pixel->text (blueprint-vision/xray), and auto-quote pricing (quoting/charlie).

Slot: **delta** (`H:/prism-slot-delta`, branch `slot/delta`). Dispatchers (per `cad/CLAUDE.md` sec 4, action counts unverified against `z.enum` -- grep source before quoting): `cadDispatcher.ts` (~564 actions: `geometry_create`/`mesh_generate`/`feature_recognize`/`step_parse`/`cad_validate`/`collision_check`), `cadAutomationDispatcher.ts` (~367: `open`/`create_sketch`/`extrude_feature`/`export_step`/`navigate_by_reference`), `cadDrawingKnowledgeDispatcher.ts` (~11), `cadRegressionDispatcher.ts` (~37).

**Directory-structure note (load-bearing):** the `mcp-server/src/engines/cad/` sub-directory itself is doctrine-only -- it holds CLAUDE.md / MEMORY.md / PATHS.md / SOUL.md / TOOLBELT.md / AWARENESS.md plus exactly ONE `.ts` file, `cadGeomEvalHarness.ts` (geometry-eval harness). The actual CAD engines all live at the **top-level** `mcp-server/src/engines/` directory (as `cad/CLAUDE.md` sec 3 states: "All names Glob-confirmed at `mcp-server/src/engines/`"). This digest catalogs the top-level cad-galaxy engine surface: **122 `CAD`-prefixed engines** + the doctrine-named geometry/mesh/BRep/stock/collision-safety/seat-bridge/generative engines. The `Mastercam*` / `Inventor*CAM|HSM*` / `Inventory*` families that share the engines dir are deliberately excluded (owned by cam/kilo and business, per sec 1 EXCLUDES).

## Strategic categories

### 1. Geometry kernel + primitives
Core computational-geometry math and B-Rep/mesh operations. Pure computation, no I/O.
- `CADKernelEngine.ts` (Vec3/Mat4/NURBS/CSG/B-Rep/convex-hull/BVH)
- `GeometryEngine.ts`, `GeometryAlgorithmsEngine.ts`
- `MeshEngine.ts`, `MeshDecimationEngine.ts`, `BRepTessellatorEngine.ts`
- `StockModelEngine.ts`, `CADStockAllowanceEngine.ts`
- `CADBooleanEngine.ts`, `CADMateEngine.ts`, `CADReferenceGeometryEngine.ts`, `CADGeometricAugmentationEngine.ts`
- `cadGeomEvalHarness.ts` (in `cad/` -- geometry-eval harness)

### 2. Collision / clearance (SAFETY -- S(x) gate)
The clearance-margin gate that must pair with `prism_safety` before any cut (`cad/CLAUDE.md` sec 5 gotcha 6).
- `CollisionDetectionEngine.ts` (AABB/OBB clearance -- the canonical S(x) engine per sec 3)
- `CADPhysicsConsistencyGateEngine.ts`

### 3. Feature recognition + taxonomy + classification
Identify + classify geometric features; the print-to-CAD "what is this part" layer.
- `CADFeatureRecognitionEngine.ts` (FLAGGED STUB per ENGINE_DIGEST U-EFF25 -- verify body before wiring to cam/quoting)
- `CADOperationTaxonomyEngine.ts`, `CADOperationDecoderEngine.ts`
- `CADFeatureClassifierEngine.ts`, `CADFileClassifierEngine.ts`
- `CADClassFeatureLibraryEngine.ts`, `CADSubtractiveFeatureEngine.ts`
- `CADPartArchetypeRegistryEngine.ts`, `CADJMDieArchetypeFrequencyEngine.ts`
- `CADFeatureCompletenessLedgerEngine.ts`, `CADUnifiedFeatureBridgeEngine.ts`

### 4. STEP / AP242 IO + format conversion + round-trip validation
Neutral-format ingest/export and the accuracy gates that guard it.
- `CADToSTEPPipelineEngine.ts`, `CADFormatConversionMatrixEngine.ts`, `CADAdapterRegistry.ts`
- `CADAccuracyValidatorEngine.ts` (100% accuracy gate -- 5 validation layers)
- `CADRoundTripValidationEngine.ts`, `CADValidationRubricEngine.ts`
- `CADModelDimensionExtractorEngine.ts`, `CADCanonicalTreeAdapterEngine.ts`

### 5. Geometry comparison + regression + closed-loop replication
The COMPARE/CORRECT/CONVERGE controllers of the print-to-CAD replication loop.
- `CADGeometryComparisonEngine.ts` (format-agnostic volume/bbox/topology diff)
- `CADRegenCorrectionEngine.ts` (Stage-6 correct+converge controller), `CADRegenerationTestEngine.ts`, `CADRegenFeedbackAdapterEngine.ts`
- `CADTrialErrorLearningEngine.ts` (Bayesian failure-pattern learner), `CADVisualDiffEngine.ts`, `CADReverseTemplateEngine.ts`, `CADReverseCorpusCatalogEngine.ts`
- Regression harness family: `CADRegressionTestOrchestratorEngine.ts`, `CADRegressionWorkerThreadRunnerEngine.ts`, `CADRegressionResultsAnalyzerEngine.ts`, `CADRegressionReportGeneratorEngine.ts`, `CADRegressionDashboardEngine.ts`, `CADTestCheckpointEngine.ts`, `CADCAMGenerationTestEngine.ts`, `CADDrawAnyPartValidationHarnessEngine.ts`, `CADBundleReplayCompareEngine.ts`

### 6. Generative CAD + intent + planning (print/photo/text -> model)
Turn intent into an executable op stream + drive the multi-system producers.
- `BlueprintToCADGenerationEngine.ts`, `PartMediaToCADEngine.ts`, `BlueprintToAllCADsOrchestratorEngine.ts`
- `CADIntentDecomposerEngine.ts`, `CADOperationPlannerEngine.ts`, `CADPrintRegeneratorEngine.ts`, `CADRegenerationTestEngine.ts`
- `CADDrawAnyPartOrchestratorEngine.ts`, `CADMultiSystemAIProducerEngine.ts`, `CADBuilderFanoutEngine.ts`
- `CADDieDesignEngine.ts`, `CADSheetMetalEngine.ts`, `CADWeldmentEngine.ts`, `CAD2DDrawingEngine.ts`, `BliskCADEngine.ts`, `FiveAxisCADTemplateEngine.ts`, `HyperCADSElectrodeEngine.ts`

### 7. Seat bridges (per-CAD code generators / execution bridges)
Emit + run native macros for each CAD seat. Note: SolidWorks COM unregistered; hyperCAD-S = v31 not v33 (sec 5).
- `Fusion360CADGeneratorAdapter.ts`, `InventorCADCodeGeneratorEngine.ts`, `SolidWorksCADExecutionBridge.ts`
- `FreeCADCodeGeneratorEngine.ts`, `MastercamCADExecutionBridge.ts`, `BobCADCAMBridgeEngine.ts`
- `HyperCADSCodeGeneratorEngine.ts`, `CadQueryCodeGeneratorEngine.ts`, `CadBridge.ts`
- Automation plumbing: `CADAutomationRouter.ts`, `CADAutomationMockLayer.ts`, `CADCapabilityNegotiatorEngine.ts`, `CADFallbackRoutingEngine.ts`, `CADSystemRouterEngine.ts`, `CADInstallationProbeEngine.ts`, `CADLicenseHealthEngine.ts`, `CADScreenshotCapturer.ts`, `CADPreviewEngine.ts`, `CADPreviewThumbnailCacheEngine.ts`, `cadLiveDispatch.ts`

### 8. AI / neural / RAG / reasoning (PSN leg #10)
CAD-as-language, embeddings, reasoning chains, corpus learning -- the AI substrate participation.
- `CADReasoningChainEngine.ts`, `CADTokenRepresentationEngine.ts`, `CADSequenceTrainerEngine.ts`, `CADSequencePoolEngine.ts`
- `CADFeatureMemoryEngine.ts`, `CADFeatureEmbeddingEngine.ts`, `CADEmbeddingIndexOrchestratorEngine.ts`, `CADRetrievalAugmentationEngine.ts`, `CADKnowledgeGraphEngine.ts`, `CADWorldModelEngine.ts`
- `CADFoundationEncoderEngine.ts`, `CADSystemNeuralArchAdapterEngine.ts`, `CADParameterPredictorEngine.ts`, `CADToleranceSignalEncoderEngine.ts`, `CADArgEncoderEngine.ts`, `CADFunctionParameterEmitterEngine.ts`
- `CADAIStateMachineEngine.ts`, `CADConsensusEngine.ts`, `CADHeadReplayBufferEngine.ts`, `CADPatternEngine.ts`
- Corpus: `CADCorpusIngesterEngine.ts`, `CADCorpusIngestionEngine.ts`, `CADCorpusPatternEngine.ts`, `CADCorpusFeaturePrevalenceLearnerEngine.ts`, `CADTrainingCorpusOrchestratorEngine.ts`, `CADTrainingPipelineOrchestratorEngine.ts`

### 9. Drawing / GD&T knowledge
Engineering-drawing intelligence connecting model to manufacturing.
- `CADDrawingKnowledgeEngine.ts` (GD&T per ASME Y14.5-2018, DFM, Fusion sequences)
- `CADDrawingNumberNormalizerEngine.ts`, `CADSketchDimensionGateEngine.ts`, `CADTribalDrawInjectionEngine.ts`

### 10. Index / archive / corpus join + assembly graph
Catalog the CAD file corpus and bridge CAD files into the print<->program join.
- `CADFileIndexerEngine.ts`, `CadFileIndexEngine.ts`, `CADArchiveJoinAugmenterEngine.ts` (under-integrated per sec 5 gotcha 7)
- `CADAssemblyGraphEngine.ts`, `CADTraceAssemblyEngine.ts`, `CadPartLibraryEngine.ts`, `CADSearchUniversalEngine.ts`, `CADReverseCorpusCatalogEngine.ts`

### 11. Infrastructure / storage / security / lifecycle
Storage, transactions, tenancy, security, crash recovery, outcome bus -- the ops layer.
- `CADContentAddressableStoreEngine.ts`, `CADArtifactStorageEngine.ts`, `CADTransactionEngine.ts`, `CADReplicationDurabilityEngine.ts`, `CADCrashRecoveryEngine.ts`
- `CADAccessControlRBACABACEngine.ts`, `CADTenantNamespaceEngine.ts`, `CADPluginMTLSSecurityEngine.ts`, `CADPluginTamperAuditLogEngine.ts`, `CADBundleSigningVersioningEngine.ts`, `CADAppCircuitBreakerEngine.ts`
- `CADExecutionOutcomeBusEngine.ts`, `CADFailureTriageEngine.ts`, `CADPerAdapterFeedbackCollectorEngine.ts`, `CADRevisionDetectorEngine.ts`, `CADRevisionPromotionWorkflowEngine.ts`, `CADFilesystemReconciliationEngine.ts`

## Key engines (detailed)

### CADGeometryComparisonEngine.ts
Format-agnostic comparison of an original CAD file vs an AI-regenerated one across STEP/DXF/STL/IGES, computing volume delta (<5%), bounding-box delta (<2%), topology Jaccard similarity (>0.8), and feature-count delta (<20%). It is the COMPARE stage of the closed-loop replication methodology and is the single source of `ComparisonResult` deltas consumed by the correction controller. Notably honest about `volume`: STEP/IGES report a bbox-proxy, only STL does true signed-tet mesh volume.
- file: `mcp-server/src/engines/CADGeometryComparisonEngine.ts`
- exports: `CADFormat`, `BoundingBox`, `TopologyMetrics`, `ExtractedFeatures`, `GeometryMetrics`

### CADTrialErrorLearningEngine.ts
Learns from regeneration-test failures (output of `CADRegenerationTestEngine`) by extracting recurring failure patterns per category (volume/bbox/feature-count/topology/code-error mismatch) and scoring risk for new generation candidates. Uses a Laplace-smoothed frequentist failure-rate with a Beta(1,1) prior (Gelman BDA3) and shrinkage-weighted recommendation strength (Efron and Morris 1973). Pure-code, append-only JSONL ledger, with closed-loop attribution linking a recommendation to its realized outcome.
- file: `mcp-server/src/engines/CADTrialErrorLearningEngine.ts`
- exports: `FailureCategory`, `RegenerationOutcome`, `IngestResult`

### CADClassFeatureLibraryEngine.ts
Encodes the class-typical feature decomposition for each PartClass (e.g. a punch = stepped revolved axis + working-tip taper + central oil hole + cross-drilled relief + base chamfer), each feature tagged with corpus prevalence, a typical-size envelope, and a Fusion typed-API build hint. Built to fix the visual-fidelity failure where the system matched volume but did not know what a punch "looks like." Read-only, mineable from the 11,695-file local corpus via `CADCorpusPatternEngine` token frequencies. Marked `WIRE-EXEMPT` (training surface consumed by scripts + the print-to-CAD orchestrator).
- file: `mcp-server/src/engines/CADClassFeatureLibraryEngine.ts`
- exports: `FeatureTemplate`, `ClassFeatureTemplate`

### CADOperationTaxonomyEngine.ts
Comprehensive classification of every CAD operation with an aerospace/complex-surface focus: categorizes by feature type (sketch/solid/surface/assembly/analysis/annotation/utility), complexity level (basic..expert), and per-CAD-system support across 9 seats (fusion360/solidworks/inventor/mastercam/hypercad/freecad/nx/catia/creo). Each op carries a parameter spec, use cases, surface-continuity type (G0..G3), and an aerospace flag. Consumed by `CadQueryCodeGeneratorEngine` and the planner.
- file: `mcp-server/src/engines/CADOperationTaxonomyEngine.ts`
- exports: `OperationCategory`, `ComplexityLevel`, `CADSystem`, `ContinuityType`, `ParameterSpec`, `OperationDefinition`, `TaxonomyStats`

### CADDrawingKnowledgeEngine.ts
The engineering-drawing and design-intelligence layer linking CAD modeling to manufacturing: GD&T symbol selection + datum schemes (per ASME Y14.5-2018), drawing-view layouts, feature-based modeling sequence, per-process DFM rules, ISO 286 hole/shaft-basis tolerance/fit selection, and Fusion 360 feature-tree ordering. Ships the `GDT_RULES` table with per-symbol tight/standard/loose tolerance envelopes, machining impact, inspection method, and source citation.
- file: `mcp-server/src/engines/CADDrawingKnowledgeEngine.ts`
- exports: `GDTSymbol`, `GDTCategory`, `GDTRule`, `GDT_RULES`

### CADKernelEngine.ts
The computational-geometry + B-Rep kernel, ported from a 132KB monolith geometry engine. Provides Vec3/Mat4/Quaternion math, NURBS curve/surface evaluation, B-Rep topology (vertex/edge/face/shell/solid), CSG boolean ops, computational geometry (convex hull, Voronoi, Delaunay), bounding-volume hierarchy, and mesh tessellation. Pure server-side computation -- no rendering, no GPU. This is the geometric foundation the rest of the galaxy builds on.
- file: `mcp-server/src/engines/CADKernelEngine.ts`
- exports: `Vec2`, `Vec3`, `Vec4`, `Mat4`, `Quaternion`, `Ray`, `Plane`, `AABB`, `NURBSCurve` (+ B-Rep topology types)

### CADReasoningChainEngine.ts
Makes CAD generation auditable via explicit chain-of-thought: records why a fillet, draft angle, or wall thickness was chosen, tagging each design decision with a category and evidence source (input spec, DFM rule, material property, tribal knowledge, RAG-retrieved similar part, physics model, standard, customer pref). Wraps `NeuralCADGenerationEngine` with reasoning output, stores chains for traceability, and answers follow-up "why" queries. A PSN leg #10 AI engine (wired via `cad_reasoning_generate`/`_why`/`_get`).
- file: `mcp-server/src/engines/CADReasoningChainEngine.ts`
- exports: `DecisionCategory`, `EvidenceSource`, `DesignReasoningStep`

### CADArchiveJoinAugmenterEngine.ts
Bridges the CAD-archive master-index (`CADFileIndexerEngine` output) into the print<->program v6 join so it stops missing CAD-side hits, encoding the JM-Die tribal rule that Inventor/Fusion/SolidWorks mill jobs save NO G-code -- the `.ipt`/`.iam`/`.f3d`/`.SLDPRT` IS the program. Anti-dup by composition: composes `buildProgramSeedAugmentation` and consumes `CADFileIndexerEngine`/`BlueprintProgramJoinEngine` rather than duplicating them. Pure deterministic transforms; enriches each program-seed link with customer/machine-category/complexity/size for downstream cost/quoting/capacity routing. (Flagged under-integrated in `cad/CLAUDE.md` sec 5 gotcha 7 -- verify the edge is consumed.)
- file: `mcp-server/src/engines/CADArchiveJoinAugmenterEngine.ts`
- exports: `MILL_PROGRAM_FORMATS`, `filterMillEligibleEntries`, `augmentJoinFromCADIndex`, `loadAndAugment`

### CADAccuracyValidatorEngine.ts
The 100% accuracy gate before CAM handoff -- five validation layers (dimensional via Hausdorff distance, topology/closed-manifold, manufacturability/DFM, tolerance stack, visual/feature diff) that HARD BLOCK if ANY layer fails. Rationale: machined parts go into aircraft/medical/automotive, so no partial pass is acceptable. Produces a structured `ValidationReport` with per-layer scores, critical issues, and recommendations.
- file: `mcp-server/src/engines/CADAccuracyValidatorEngine.ts`
- exports: `LayerResult`, `ValidationReport`, `DimensionalSpec`, `FeatureComparison`

### CADIntentDecomposerEngine.ts
Parses free-form natural-language CAD intent ("draw a flange with 6 M8 bolt holes on a 100mm BCD in solidworks") into a structured payload the master control brain can orchestrate: cadSystem, operation type, parameters, planner-ready feature tree, ambiguities, and confidence. Backed by `IntentRouterEngine` classification plus CAD-specific vocabulary (14 CAD systems, 14 planner feature kinds). Normalizes metric+imperial units to mm while preserving `originalUnit`/`inchView` for inch-native shops; resolves imperial fractions; surfaces ambiguities as clarification questions rather than throwing.
- file: `mcp-server/src/engines/CADIntentDecomposerEngine.ts`
- exports: engine class + intent payload types (imports `CADFeatureIntent`/`PlannerFeatureKind`/`CADIntent` from the planner)

### CADOperationPlannerEngine.ts
Translates a high-level feature-tree intent into an ordered `CADOperation[]` stream any registered `ICADCodeGenerator` adapter can consume via `buildScript(ops, ctx)`. Responsibilities: feature expansion (an extrude intent fans into sketch_create -> sketch_rectangle -> sketch_close -> feature_extrude), dependency-graph topological sort with cycle rejection, per-adapter capability gating (substitute/warn/throw `UnsupportedFeatureError`), and cross-CAD retargeting. Pure-algorithm -- reads `CADAdapterRegistry` capability probes but executes nothing; output plugs into `prism_cad_automation.build_script`.
- file: `mcp-server/src/engines/CADOperationPlannerEngine.ts`
- exports: `PLANNER_FEATURE_KINDS` (+ planner intent/op types)

### CADRegenCorrectionEngine.ts
The Stage-6 CORRECT + CONVERGE controller that closes the CAD-replication loop -- a pure deterministic transform (not a model call) that reads a `ComparisonResult` delta vector plus the current parameter set and emits a corrected parameter set + convergence verdict. Offers lightest-first correction methods (proportional, secant, coordinate-descent, auto) and a convergence status enum (converged/iterate/plateau/max-iterations/no-correctable-params). Keeps determinism by mutating the spec (never the candidate output) and injecting the live `evaluate` reader into `runClosedLoop`.
- file: `mcp-server/src/engines/CADRegenCorrectionEngine.ts`
- exports: `CorrectionMethod`, `ConvergenceStatus`, `CorrectionParam`

### CADTokenRepresentationEngine.ts
Treats CAD operations as discrete tokens for transformer-based neural CAD generation, producing fixed-ID token sequences from structured operation descriptors and reversing them back into format-flavored operation arrays. Vocabulary is 256 tokens across 20 categories (sketch/constraint/feature_add/cut/mod/advanced/pattern/boolean/surface/sheet_metal/weldment/assembly/drawing/cam_bridge/value_*). Cites Vaswani et al. (positional encoding), DeepCAD (Wu 2021), and SkexGen (Xu 2022).
- file: `mcp-server/src/engines/CADTokenRepresentationEngine.ts`
- exports: `CADTokenCategory`, `CADTokenDef`

### CadQueryCodeGeneratorEngine.ts
Generates CadQuery Python scripts from video action sequences or natural-language descriptions, executes them via `cadquery-executor.py` (CadQuery 2.x + OpenCascade), and returns geometry metrics + STEP/STL exports. Two-layer architecture: TypeScript owns script generation/syntax-validation/prompting, Python owns the solid modeling. Prompt adapted from CQAsk / cad_prompts.py; consumes `CADOperationTaxonomyEngine`.
- file: `mcp-server/src/engines/CadQueryCodeGeneratorEngine.ts`
- exports: `GeneratedScript`, `StepResult`, `SyntaxCheckResult`, `CadQueryExecutionResult`

### CADFeatureMemoryEngine.ts
Persistent memory of CAD feature patterns with cosine-similarity search -- records every feature generation attempt (type, params, outcome, latency, error tags) over a deterministic 64-dim embedding (32 FNV-1a type buckets + 32 normalized param slots) so future generators reuse high-success patterns and warn on low-success ones. Brute-force cosine (fine to ~50k entries), atomic persistence via `atomicWriteJson`, embedding dimension sealed on first insert (corruption guard), and NaN/Infinity input validation.
- file: `mcp-server/src/engines/CADFeatureMemoryEngine.ts`
- exports: `CAD_FEATURE_EMBEDDING_DIM`, `DEFAULT_MEMORY_PATH`, `CAD_FEATURE_MEMORY_SCHEMA_VERSION`, `FeatureParamValue`, `FeatureParameters`, `RecordOutcome`

## Full engine index

One-liners for the ~15 detailed engines come from their file JSDoc (read this session); all others come from the file name + `cad/CLAUDE.md` sec 3/sec 5 role table and MEMORY.md. Entries not read end-to-end are marked "(header not read)". Category numbers map to the Strategic categories above.

| Engine | Category | One-line |
|--------|----------|----------|
| CADKernelEngine.ts | 1 geometry-kernel | Vec3/Mat4/NURBS/CSG/B-Rep computational-geometry kernel (ported from 132KB monolith). |
| GeometryEngine.ts | 1 geometry-kernel | Boolean/offset/fillet/transforms geometry ops (sec 3 role). (header not read) |
| GeometryAlgorithmsEngine.ts | 1 geometry-kernel | Geometry algorithm library. (header not read) |
| MeshEngine.ts | 1 geometry-kernel | Mesh generation/simplify/repair (sec 3 role). (header not read) |
| MeshDecimationEngine.ts | 1 geometry-kernel | Mesh decimation/simplification. (header not read) |
| BRepTessellatorEngine.ts | 1 geometry-kernel | B-Rep -> mesh tessellation (sec 3 role). (header not read) |
| StockModelEngine.ts | 1 geometry-kernel | Stock-removal simulation model (sec 3 role). (header not read) |
| CADStockAllowanceEngine.ts | 1 geometry-kernel | Stock-allowance computation. (header not read) |
| CADBooleanEngine.ts | 1 geometry-kernel | CSG boolean operations engine. (header not read) |
| CADMateEngine.ts | 1 geometry-kernel | Assembly mate/constraint geometry. (header not read) |
| CADReferenceGeometryEngine.ts | 1 geometry-kernel | Reference-geometry (planes/axes/points) construction. (header not read) |
| CADGeometricAugmentationEngine.ts | 1 geometry-kernel | Geometric augmentation for training data. (header not read) |
| cadGeomEvalHarness.ts | 1 geometry-kernel | Geometry-eval harness (only .ts file inside engines/cad/). (header not read) |
| CollisionDetectionEngine.ts | 2 collision-safety | SAFETY AABB/OBB clearance -- the S(x) gate; wrong constant = machine crash (sec 5 gotcha 6). (header not read) |
| CADPhysicsConsistencyGateEngine.ts | 2 collision-safety | Physics-consistency gate on generated geometry. (header not read) |
| CADFeatureRecognitionEngine.ts | 3 feature-recognition | Feature ID + classification -- FLAGGED STUB U-EFF25, verify body before wiring. |
| CADOperationTaxonomyEngine.ts | 3 feature-recognition | Comprehensive CAD-operation taxonomy (9 seats, aerospace-focused, G0-G3 continuity). |
| CADOperationDecoderEngine.ts | 3 feature-recognition | Decodes token/op sequences back to CAD operations. (header not read) |
| CADFeatureClassifierEngine.ts | 3 feature-recognition | Feature-type classifier. (header not read) |
| CADFileClassifierEngine.ts | 3 feature-recognition | Classifies CAD files by type/format. (header not read) |
| CADClassFeatureLibraryEngine.ts | 3 feature-recognition | Class-typical feature decomposition per PartClass (prevalence + Fusion build hints). |
| CADSubtractiveFeatureEngine.ts | 3 feature-recognition | Subtractive (pocket/hole/cut) feature modeling. (header not read) |
| CADPartArchetypeRegistryEngine.ts | 3 feature-recognition | Registry of part archetypes. (header not read) |
| CADJMDieArchetypeFrequencyEngine.ts | 3 feature-recognition | JM-Die part-archetype frequency stats. (header not read) |
| CADFeatureCompletenessLedgerEngine.ts | 3 feature-recognition | Ledger of feature-completeness per part. (header not read) |
| CADUnifiedFeatureBridgeEngine.ts | 3 feature-recognition | Unifies feature representations across sources. (header not read) |
| CADToSTEPPipelineEngine.ts | 4 step-io | Format-agnostic CAD -> STEP pipeline (sec 3 role). (header not read) |
| CADFormatConversionMatrixEngine.ts | 4 step-io | Format conversion matrix across CAD formats. (header not read) |
| CADAdapterRegistry.ts | 4 step-io | CAD format/converter/adapter registry. (header not read) |
| CADAccuracyValidatorEngine.ts | 4 step-io | 100% accuracy gate -- 5 validation layers, hard block on any fail. |
| CADRoundTripValidationEngine.ts | 4 step-io | Round-trip (export/re-import) validation. (header not read) |
| CADValidationRubricEngine.ts | 4 step-io | Validation rubric/scoring. (header not read) |
| CADModelDimensionExtractorEngine.ts | 4 step-io | Extracts dimensions from a CAD model. (header not read) |
| CADCanonicalTreeAdapterEngine.ts | 4 step-io | Adapts CAD feature trees to a canonical form. (header not read) |
| CADGeometryComparisonEngine.ts | 5 compare-regression | Format-agnostic volume/bbox/topology/feature diff (COMPARE stage). |
| CADRegenCorrectionEngine.ts | 5 compare-regression | Stage-6 CORRECT+CONVERGE deterministic controller (proportional/secant/coord-descent). |
| CADRegenerationTestEngine.ts | 5 compare-regression | Runs regeneration tests producing pass/fail outcomes. (header not read) |
| CADRegenFeedbackAdapterEngine.ts | 5 compare-regression | Adapts regen results into feedback signals. (header not read) |
| CADTrialErrorLearningEngine.ts | 5 compare-regression | Bayesian (Beta-Binomial) failure-pattern learner + risk scoring. |
| CADVisualDiffEngine.ts | 5 compare-regression | Visual diff of rendered CAD outputs. (header not read) |
| CADReverseTemplateEngine.ts | 5 compare-regression | Reverse-engineers a parametric template from geometry. (header not read) |
| CADReverseCorpusCatalogEngine.ts | 5 compare-regression | Catalogs reverse-engineered corpus templates. (header not read) |
| CADRegressionTestOrchestratorEngine.ts | 5 compare-regression | Orchestrates the regression test suite. (header not read) |
| CADRegressionWorkerThreadRunnerEngine.ts | 5 compare-regression | Runs regression tests on worker threads. (header not read) |
| CADRegressionResultsAnalyzerEngine.ts | 5 compare-regression | Analyzes regression results. (header not read) |
| CADRegressionReportGeneratorEngine.ts | 5 compare-regression | Generates regression reports. (header not read) |
| CADRegressionDashboardEngine.ts | 5 compare-regression | Regression dashboard. (header not read) |
| CADTestCheckpointEngine.ts | 5 compare-regression | Checkpoints test state. (header not read) |
| CADCAMGenerationTestEngine.ts | 5 compare-regression | CAD/CAM generation test harness. (header not read) |
| CADDrawAnyPartValidationHarnessEngine.ts | 5 compare-regression | Validation harness for the draw-any-part orchestrator. (header not read) |
| CADBundleReplayCompareEngine.ts | 5 compare-regression | Replays + compares generation bundles. (header not read) |
| BlueprintToCADGenerationEngine.ts | 6 generative | Print -> CAD generation (sec 3 role). (header not read) |
| PartMediaToCADEngine.ts | 6 generative | Photo/media -> CAD generation (sec 3 role). (header not read) |
| BlueprintToAllCADsOrchestratorEngine.ts | 6 generative | Orchestrates print -> all seat CADs. (header not read) |
| CADIntentDecomposerEngine.ts | 6 generative | NL intent -> structured CAD payload (14 systems, unit-normalized, ambiguity protocol). |
| CADOperationPlannerEngine.ts | 6 generative | Feature-tree intent -> ordered CADOperation[] with dep-sort + capability gating. |
| CADPrintRegeneratorEngine.ts | 6 generative | Regenerates CAD from a print. (header not read) |
| CADDrawAnyPartOrchestratorEngine.ts | 6 generative | Orchestrates drawing an arbitrary part. (header not read) |
| CADMultiSystemAIProducerEngine.ts | 6 generative | Produces CAD across multiple AI systems. (header not read) |
| CADBuilderFanoutEngine.ts | 6 generative | Fans out build tasks to CAD producers. (header not read) |
| CADDieDesignEngine.ts | 6 generative | Die-design generation. (header not read) |
| CADSheetMetalEngine.ts | 6 generative | Sheet-metal feature modeling. (header not read) |
| CADWeldmentEngine.ts | 6 generative | Weldment modeling. (header not read) |
| CAD2DDrawingEngine.ts | 6 generative | 2D drawing generation. (header not read) |
| BliskCADEngine.ts | 6 generative | Blisk/impeller CAD template (sec 3 role). (header not read) |
| FiveAxisCADTemplateEngine.ts | 6 generative | 5-axis CAD template (sec 3 role). (header not read) |
| HyperCADSElectrodeEngine.ts | 6 generative | hyperCAD-S electrode generation. (header not read) |
| Fusion360CADGeneratorAdapter.ts | 7 seat-bridge | Fusion 360 code-gen adapter (sec 3 role; API cm-vs-mm x10 trap, sec 5 gotcha 2). (header not read) |
| InventorCADCodeGeneratorEngine.ts | 7 seat-bridge | Inventor CAD code generator (sec 3 role). (header not read) |
| SolidWorksCADExecutionBridge.ts | 7 seat-bridge | SolidWorks execution bridge -- COM unregistered, not live (sec 5 gotcha 4). (header not read) |
| FreeCADCodeGeneratorEngine.ts | 7 seat-bridge | FreeCAD code generator (sec 3 role). (header not read) |
| MastercamCADExecutionBridge.ts | 7 seat-bridge | Mastercam CAD-side execution bridge (sec 3 role; CAM-side owned by kilo). (header not read) |
| BobCADCAMBridgeEngine.ts | 7 seat-bridge | BobCAD-CAM bridge (sec 3 role). (header not read) |
| HyperCADSCodeGeneratorEngine.ts | 7 seat-bridge | hyperCAD-S code generator (v31 not v33, sec 5 gotcha 3). (header not read) |
| CadQueryCodeGeneratorEngine.ts | 7 seat-bridge | CadQuery Python script gen + execution via cadquery-executor.py. |
| CadBridge.ts | 7 seat-bridge | Generic CAD bridge shim. (header not read) |
| CADAutomationRouter.ts | 7 seat-bridge | Routes automation calls to the right seat. (header not read) |
| CADAutomationMockLayer.ts | 7 seat-bridge | Mock automation layer for offline testing. (header not read) |
| CADCapabilityNegotiatorEngine.ts | 7 seat-bridge | Negotiates seat capabilities. (header not read) |
| CADFallbackRoutingEngine.ts | 7 seat-bridge | Fallback routing when a seat is unavailable. (header not read) |
| CADSystemRouterEngine.ts | 7 seat-bridge | Routes to a CAD system by intent/availability. (header not read) |
| CADInstallationProbeEngine.ts | 7 seat-bridge | Probes installed CAD seats. (header not read) |
| CADLicenseHealthEngine.ts | 7 seat-bridge | Checks CAD seat license health. (header not read) |
| CADScreenshotCapturer.ts | 7 seat-bridge | Captures CAD seat screenshots. (header not read) |
| CADPreviewEngine.ts | 7 seat-bridge | Generates CAD previews. (header not read) |
| CADPreviewThumbnailCacheEngine.ts | 7 seat-bridge | Caches preview thumbnails. (header not read) |
| cadLiveDispatch.ts | 7 seat-bridge | Live-dispatch shim for seat automation. (header not read) |
| CADReasoningChainEngine.ts | 8 ai-neural | Chain-of-thought reasoning over CAD design decisions (PSN leg #10). |
| CADTokenRepresentationEngine.ts | 8 ai-neural | CAD-as-language: 256-token vocab for transformer CAD gen (DeepCAD/SkexGen). |
| CADSequenceTrainerEngine.ts | 8 ai-neural | Trains on CAD op sequences. (header not read) |
| CADSequencePoolEngine.ts | 8 ai-neural | Pools CAD sequences for training. (header not read) |
| CADFeatureMemoryEngine.ts | 8 ai-neural | Persistent feature-pattern memory, 64-dim cosine similarity search. |
| CADFeatureEmbeddingEngine.ts | 8 ai-neural | Produces feature embeddings (PSN leg #10 AI engine). (header not read) |
| CADEmbeddingIndexOrchestratorEngine.ts | 8 ai-neural | Orchestrates the embedding index (PSN leg #10 AI engine). (header not read) |
| CADRetrievalAugmentationEngine.ts | 8 ai-neural | CAD-RAG retrieval augmentation. (header not read) |
| CADKnowledgeGraphEngine.ts | 8 ai-neural | CAD knowledge graph. (header not read) |
| CADWorldModelEngine.ts | 8 ai-neural | CAD world-model for generation. (header not read) |
| CADFoundationEncoderEngine.ts | 8 ai-neural | Foundation encoder for CAD tokens/features. (header not read) |
| CADSystemNeuralArchAdapterEngine.ts | 8 ai-neural | Adapts neural architectures per CAD system. (header not read) |
| CADParameterPredictorEngine.ts | 8 ai-neural | Predicts feature parameters. (header not read) |
| CADToleranceSignalEncoderEngine.ts | 8 ai-neural | Encodes tolerance signals for the model. (header not read) |
| CADArgEncoderEngine.ts | 8 ai-neural | Encodes op arguments to tokens. (header not read) |
| CADFunctionParameterEmitterEngine.ts | 8 ai-neural | Emits function parameters for seat APIs. (header not read) |
| CADAIStateMachineEngine.ts | 8 ai-neural | State machine for the CAD-AI pipeline. (header not read) |
| CADConsensusEngine.ts | 8 ai-neural | Multi-producer consensus over CAD outputs. (header not read) |
| CADHeadReplayBufferEngine.ts | 8 ai-neural | Replay buffer for RL/training heads. (header not read) |
| CADPatternEngine.ts | 8 ai-neural | CAD pattern detection/generation. (header not read) |
| CADCorpusIngesterEngine.ts | 8 ai-neural | Ingests CAD corpus files. (header not read) |
| CADCorpusIngestionEngine.ts | 8 ai-neural | CAD corpus ingestion pipeline. (header not read) |
| CADCorpusPatternEngine.ts | 8 ai-neural | Mines token/feature frequencies from the corpus. (header not read) |
| CADCorpusFeaturePrevalenceLearnerEngine.ts | 8 ai-neural | Learns feature prevalence overlays from the corpus. (header not read) |
| CADTrainingCorpusOrchestratorEngine.ts | 8 ai-neural | Orchestrates the training corpus. (header not read) |
| CADTrainingPipelineOrchestratorEngine.ts | 8 ai-neural | Orchestrates the training pipeline. (header not read) |
| CADDrawingKnowledgeEngine.ts | 9 drawing-gdt | GD&T (ASME Y14.5-2018) + DFM + ISO 286 fits + Fusion sequences knowledge base. |
| CADDrawingNumberNormalizerEngine.ts | 9 drawing-gdt | Normalizes drawing numbers. (header not read) |
| CADSketchDimensionGateEngine.ts | 9 drawing-gdt | Gates on sketch-dimension completeness. (header not read) |
| CADTribalDrawInjectionEngine.ts | 9 drawing-gdt | Injects tribal drawing knowledge. (header not read) |
| CADFileIndexerEngine.ts | 10 index-archive | Walks disk + builds CAD-archive master-index. (header not read) |
| CadFileIndexEngine.ts | 10 index-archive | CAD file index store. (header not read) |
| CADArchiveJoinAugmenterEngine.ts | 10 index-archive | Bridges CAD archive into print<->program v6 join (under-integrated, sec 5 gotcha 7). |
| CADAssemblyGraphEngine.ts | 10 index-archive | Assembly tree + component graph (sec 3 role). (header not read) |
| CADTraceAssemblyEngine.ts | 10 index-archive | Traces assembly structure. (header not read) |
| CadPartLibraryEngine.ts | 10 index-archive | Part library store. (header not read) |
| CADSearchUniversalEngine.ts | 10 index-archive | Universal search over CAD assets. (header not read) |
| CADReverseCorpusCatalogEngine.ts | 10 index-archive | Reverse-corpus catalog (also cat 5). (header not read) |
| CADContentAddressableStoreEngine.ts | 11 infra | Content-addressable (hash) store for CAD artifacts. (header not read) |
| CADArtifactStorageEngine.ts | 11 infra | Artifact storage. (header not read) |
| CADTransactionEngine.ts | 11 infra | Transactional CAD state changes. (header not read) |
| CADReplicationDurabilityEngine.ts | 11 infra | Replication/durability of CAD state. (header not read) |
| CADCrashRecoveryEngine.ts | 11 infra | Crash recovery for CAD sessions. (header not read) |
| CADAccessControlRBACABACEngine.ts | 11 infra | RBAC/ABAC access control (sec 3 role). (header not read) |
| CADTenantNamespaceEngine.ts | 11 infra | Multi-tenant namespacing. (header not read) |
| CADPluginMTLSSecurityEngine.ts | 11 infra | mTLS security for CAD plugins. (header not read) |
| CADPluginTamperAuditLogEngine.ts | 11 infra | Tamper audit log for plugins. (header not read) |
| CADBundleSigningVersioningEngine.ts | 11 infra | Signs + versions generation bundles. (header not read) |
| CADAppCircuitBreakerEngine.ts | 11 infra | Circuit breaker for CAD app calls. (header not read) |
| CADExecutionOutcomeBusEngine.ts | 11 infra | Publishes execution outcomes to a bus. (header not read) |
| CADFailureTriageEngine.ts | 11 infra | Triages CAD failures. (header not read) |
| CADPerAdapterFeedbackCollectorEngine.ts | 11 infra | Collects per-adapter feedback. (header not read) |
| CADRevisionDetectorEngine.ts | 11 infra | Detects part revisions. (header not read) |
| CADRevisionPromotionWorkflowEngine.ts | 11 infra | Promotes revisions through a workflow. (header not read) |
| CADFilesystemReconciliationEngine.ts | 11 infra | Reconciles CAD state vs filesystem. (header not read) |

**Coverage note (R12):** the table lists every engine I enumerated in scope -- 122 `CAD`-prefixed engines (`ls`-confirmed) plus the doctrine-named geometry/mesh/BRep/stock/collision/seat-bridge/generative engines from `cad/CLAUDE.md` sec 3. A handful of `CAD`-prefixed entries appear once under their primary category; a few (e.g. `CADReverseCorpusCatalogEngine`) legitimately span two. One-liners for the 15 detailed engines are grounded in file JSDoc read this session; all "(header not read)" one-liners are inferred from the file name + the sec 3 role table + MEMORY.md and should be verified against the file body before load-bearing use.
