# TSC Per-Slot Punch-List — owner-actionable error queues (2026-06-15, slot:papa)

> papa (build-helper) split of the tsc baseline by owning slot so each domain owner can clear its own rows.
> papa cleared the ENTIRE generic-infra seam (638->615 across slices e9f5005612 / e2d54d8e6c / 3b2d5724ba; see TSC-BASELINE-REMEDIATION-MAP for the per-slice + verified-domain-finding table). The lines below are the
> DOMAIN-OWNED remainder — each needs the owner's domain knowledge (the type/producer drift papa proved on
> WEDMSetupSheet: code reads fields the producer doesn't compute). Source: TSC-BASELINE-638-2026-06-15.txt.
> Each owner: `cd mcp-server && NODE_OPTIONS=--max-old-space-size=16384 npx tsc --noEmit | grep <your-engine-prefix>` to refresh, fix code<->type drift (no weakening), commit 0-new.

## delta (CAD) — 111 errors
```
src/data/cad-validation-corpus.ts(34,11): error TS2353: Object literal may only specify known properties, and 'kind' does not exist in type 'ToleranceCallout'.
src/data/cad-validation-corpus.ts(35,11): error TS2353: Object literal may only specify known properties, and 'kind' does not exist in type 'ToleranceCallout'.
src/data/cad-validation-corpus.ts(36,11): error TS2353: Object literal may only specify known properties, and 'kind' does not exist in type 'ToleranceCallout'.
src/data/cad-validation-corpus.ts(54,20): error TS2353: Object literal may only specify known properties, and 'kind' does not exist in type 'ToleranceCallout'.
src/data/cad-validation-corpus.ts(64,11): error TS2353: Object literal may only specify known properties, and 'kind' does not exist in type 'ToleranceCallout'.
src/data/cad-validation-corpus.ts(65,11): error TS2353: Object literal may only specify known properties, and 'kind' does not exist in type 'ToleranceCallout'.
src/data/cad-validation-corpus.ts(81,11): error TS2353: Object literal may only specify known properties, and 'kind' does not exist in type 'ToleranceCallout'.
src/data/cad-validation-corpus.ts(82,11): error TS2353: Object literal may only specify known properties, and 'kind' does not exist in type 'ToleranceCallout'.
src/data/cad-validation-corpus.ts(101,11): error TS2353: Object literal may only specify known properties, and 'kind' does not exist in type 'ToleranceCallout'.
src/data/cad-validation-corpus.ts(102,11): error TS2353: Object literal may only specify known properties, and 'kind' does not exist in type 'ToleranceCallout'.
src/data/cad-validation-corpus.ts(126,11): error TS2353: Object literal may only specify known properties, and 'kind' does not exist in type 'ToleranceCallout'.
src/data/cad-validation-corpus.ts(127,11): error TS2353: Object literal may only specify known properties, and 'kind' does not exist in type 'ToleranceCallout'.
src/data/cad-validation-corpus.ts(138,11): error TS2353: Object literal may only specify known properties, and 'kind' does not exist in type 'ToleranceCallout'.
src/data/cad-validation-corpus.ts(139,11): error TS2353: Object literal may only specify known properties, and 'kind' does not exist in type 'ToleranceCallout'.
src/data/cad-validation-corpus.ts(158,11): error TS2353: Object literal may only specify known properties, and 'kind' does not exist in type 'ToleranceCallout'.
src/data/cad-validation-corpus.ts(159,11): error TS2353: Object literal may only specify known properties, and 'kind' does not exist in type 'ToleranceCallout'.
src/engines/CADAccuracyValidatorEngine.ts(93,7): error TS2720: Class 'CADAccuracyValidatorEngine' incorrectly implements class 'BaseEngine'. Did you mean to extend 'BaseEngine' and inherit its members as a subclass?
src/engines/CADAccuracyValidatorEngine.ts(558,35): error TS2362: The left-hand side of an arithmetic operation must be of type 'any', 'number', 'bigint' or an enum type.
src/engines/CADAccuracyValidatorEngine.ts(669,47): error TS2322: Type 'number | undefined' is not assignable to type 'string | number'.
src/engines/CADAdapterRegistry.ts(97,20): error TS2339: Property 'mastercamCADGeneratorAdapter' does not exist on type 'typeof import("H:/PRISM/mcp-server/src/engines/MastercamCodeGeneratorEngine")'.
src/engines/CADArchiveJoinAugmenterEngine.ts(337,16): error TS2339: Property 'has' does not exist on type 'readonly (".mcam" | ".ipt" | ".iam" | ".f3d" | ".f3z" | ".sldprt" | ".sldasm" | ".prt" | ".step" | ".stp" | ".iges" | ".igs" | ".stl" | ".mcx-8" | ".dwg" | ".dxf" | ".idw" | ".sat" | ".hmc" | ... 5 more ... | ".FCStd")[] | ReadonlySet<...>'.
src/engines/CADFeatureClassifierEngine.ts(99,7): error TS2739: Type '{ through_hole: { family: "rotational"; baseComplexity: number; baseRisk: { volume: number; bbox: number; featureCount: number; topology: number; }; }; blind_hole: { family: "rotational"; baseComplexity: number; baseRisk: { ...; }; }; ... 18 more ...; contour_3d: { ...; }; }' is missing the following properties from type 'Record<FeatureType, FeatureProfile>': thread_internal, pocket_complex, slot_dovetail, slot_t_shaped
src/engines/CADFileClassifierEngine.ts(60,7): error TS2739: Type '{ ".sldprt": { category: "part"; testStrategy: "open_part"; handler: string; }; ".sldasm": { category: "assembly"; testStrategy: "open_assembly"; handler: string; }; ".slddrw": { category: "drawing"; testStrategy: "open_drawing"; handler: string; }; ... 16 more ...; ".x_b": { ...; }; }' is missing the following properties from type 'Record<".mcam" | ".ipt" | ".iam" | ".f3d" | ".f3z" | ".sldprt" | ".sldasm" | ".prt" | ".step" | ".stp" | ".iges" | ".igs" | ".stl" | ".mcx-8" | ".dwg" | ".dxf" | ".idw" | ".sat" | ".hmc" | ... 5 more ... | ".FCStd", FormatProfile>': ".prt", ".dwg", ".dxf", ".sat", ".3dm"
src/engines/CADGeometricAugmentationEngine.ts(254,5): error TS2349: This expression is not callable.
src/engines/CADGeometryComparisonEngine.ts(295,7): error TS2720: Class 'CADGeometryComparisonEngine' incorrectly implements class 'BaseEngine'. Did you mean to extend 'BaseEngine' and inherit its members as a subclass?
src/engines/CADLiveBlueprintOcrAdapter.ts(96,20): error TS2339: Property 'label' does not exist on type 'ExtractedDimension'.
src/engines/CADLiveBlueprintOcrAdapter.ts(101,14): error TS2551: Property 'units' does not exist on type 'ExtractedDimension'. Did you mean 'unit'?
src/engines/CADLiveBlueprintOcrAdapter.ts(143,30): error TS2339: Property 'gdt_callouts' does not exist on type 'BlueprintVisionResult'.
src/engines/CADLiveBlueprintOcrAdapter.ts(144,34): error TS2339: Property 'gdt_callouts' does not exist on type 'BlueprintVisionResult'.
src/engines/CADLiveBlueprintOcrAdapter.ts(145,26): error TS2339: Property 'gdt_callouts' does not exist on type 'BlueprintVisionResult'.
src/engines/CADLiveBlueprintOcrAdapter.ts(158,29): error TS2339: Property 'overall_confidence' does not exist on type 'BlueprintVisionResult'.
src/engines/CADParameterPredictorEngine.ts(140,7): error TS2739: Type '{ through_hole: ("hole_depth_mm" | "hole_diameter_mm")[]; blind_hole: ("hole_depth_mm" | "hole_diameter_mm")[]; counterbore: ("counterbore_diameter_mm" | "counterbore_depth_mm" | "hole_depth_mm" | "hole_diameter_mm")[]; ... 17 more ...; contour_3d: ("extrusion_depth_mm" | "fillet_radius_mm")[]; }' is missing the following properties from type 'Record<FeatureType, PredictableParam[]>': thread_internal, pocket_complex, slot_dovetail, slot_t_shaped
src/engines/CADPartArchetypeRegistryEngine.ts(37,11): error TS2554: Expected 2-3 arguments, but got 1.
src/engines/CadPartLibraryEngine.ts(345,7): error TS2322: Type 'Dirent<string>[]' is not assignable to type 'Dirent<NonSharedBuffer>[]'.
src/engines/CadQueryCodeGeneratorEngine.ts(326,47): error TS2339: Property 'generateCadQueryCode' does not exist on type 'CADOperationTaxonomyEngine'.
src/engines/CadQueryCodeGeneratorEngine.ts(379,47): error TS2339: Property 'generateCadQueryCode' does not exist on type 'CADOperationTaxonomyEngine'.
src/engines/CADReasoningChainEngine.ts(118,7): error TS2720: Class 'CADReasoningChainEngine' incorrectly implements class 'BaseEngine'. Did you mean to extend 'BaseEngine' and inherit its members as a subclass?
src/engines/CADReasoningChainEngine.ts(631,36): error TS2365: Operator '<' cannot be applied to types 'string | number' and 'number'.
src/engines/CADReasoningChainEngine.ts(646,48): error TS2365: Operator '<' cannot be applied to types 'string | number' and 'number'.
src/engines/CADRegenerationTestEngine.ts(318,15): error TS2339: Property 'neuralCadGenerationEngine' does not exist on type 'typeof import("H:/PRISM/mcp-server/src/engines/NeuralCADGenerationEngine")'.
src/engines/CADTokenRepresentationEngine.ts(164,14): error TS2515: Non-abstract class 'CADTokenRepresentationEngine' does not implement inherited abstract member validate from class 'BaseEngine'.
src/engines/CADTokenRepresentationEngine.ts(628,13): error TS2416: Property 'executeImpl' in type 'CADTokenRepresentationEngine' is not assignable to the same property in base type 'BaseEngine'.
src/engines/CADTrialErrorLearningEngine.ts(402,19): error TS7053: Element implicitly has an 'any' type because expression of type 'string' can't be used to index type 'Partial<Record<FailureCategory, { failures: number; successes: number; rate: number; }>> | Record<string, { failures: number; successes: number; rate: number; }>'.
src/engines/CADTrialErrorLearningEngine.ts(537,37): error TS2345: Argument of type 'string' is not assignable to parameter of type 'never'.
src/engines/CADValidationRubricEngine.ts(209,3): error TS2578: Unused '@ts-expect-error' directive.
src/engines/CATIAMachiningAIOrchestrationEngine.ts(223,52): error TS2339: Property 'selectStrategy' does not exist on type 'CATIAStrategyEngine'.
src/engines/ElectrodeAdvancedAIEngine.ts(462,9): error TS2322: Type '{ discharge_energy_mJ: { from: number; to: number; }; num_skim_passes?: undefined; electrode_grain_size_um?: undefined; duty_cycle?: undefined; spark_gap_mm?: undefined; } | { num_skim_passes: { ...; }; discharge_energy_mJ?: undefined; electrode_grain_size_um?: undefined; duty_cycle?: undefined; spark_gap_mm?: undef...' is not assignable to type 'Record<string, { from: number; to: number; }>'.
src/engines/ElectrodeAdvancedAIEngine.ts(955,9): error TS2345: Argument of type 'number | "graphite"' is not assignable to parameter of type 'string'.
src/engines/ElectrodeAdvancedAIEngine.ts(1156,9): error TS2322: Type 'string' is not assignable to type 'number'.
src/engines/ElectrodeAIReasoningEngine.ts(539,41): error TS2339: Property 'sinker_spark_gap' does not exist on type '{ readonly spark_erosion: { readonly C_d: 2.1; readonly current_exp_d: 0.43; readonly ton_exp_d: 0.44; readonly C_p: 0.54; readonly current_exp_p: 0.38; readonly ton_exp_p: 0.38; readonly C_mrr: 0.0085; ... 5 more ...; readonly source: "DiBitonto et al. ASME J. Eng. Ind. 111(2) 1989; Sato et al. JSME Int. J. 33(4) 1...'.
src/engines/ElectrodeAIReasoningEngine.ts(540,40): error TS2339: Property 'sinker_spark_gap' does not exist on type '{ readonly spark_erosion: { readonly C_d: 2.1; readonly current_exp_d: 0.43; readonly ton_exp_d: 0.44; readonly C_p: 0.54; readonly current_exp_p: 0.38; readonly ton_exp_p: 0.38; readonly C_mrr: 0.0085; ... 5 more ...; readonly source: "DiBitonto et al. ASME J. Eng. Ind. 111(2) 1989; Sato et al. JSME Int. J. 33(4) 1...'.
src/engines/ElectrodeAIReasoningEngine.ts(541,42): error TS2339: Property 'sinker_spark_gap' does not exist on type '{ readonly spark_erosion: { readonly C_d: 2.1; readonly current_exp_d: 0.43; readonly ton_exp_d: 0.44; readonly C_p: 0.54; readonly current_exp_p: 0.38; readonly ton_exp_p: 0.38; readonly C_mrr: 0.0085; ... 5 more ...; readonly source: "DiBitonto et al. ASME J. Eng. Ind. 111(2) 1989; Sato et al. JSME Int. J. 33(4) 1...'.
src/engines/ElectrodeAIReasoningEngine.ts(542,39): error TS2339: Property 'sinker_duty_cycle' does not exist on type '{ readonly spark_erosion: { readonly C_d: 2.1; readonly current_exp_d: 0.43; readonly ton_exp_d: 0.44; readonly C_p: 0.54; readonly current_exp_p: 0.38; readonly ton_exp_p: 0.38; readonly C_mrr: 0.0085; ... 5 more ...; readonly source: "DiBitonto et al. ASME J. Eng. Ind. 111(2) 1989; Sato et al. JSME Int. J. 33(4) 1...'.
src/engines/HyperCADSCodeGeneratorEngine.ts(65,12): error TS2820: Type '"hypercads"' is not assignable to type '"fusion360" | "mastercam" | "nx" | "hypermill" | "solidworks" | "freecad" | "cadquery" | "esprit" | "onshape" | "inventor_hsm" | "creo" | "inventor" | "hypercad_s" | "catia_v5" | "rhino"'. Did you mean '"hypercad_s"'?
src/engines/HyperCADSCodeGeneratorEngine.ts(68,5): error TS2820: Type '"hypercads"' is not assignable to type '"fusion360" | "mastercam" | "nx" | "hypermill" | "solidworks" | "freecad" | "cadquery" | "esprit" | "onshape" | "inventor_hsm" | "creo" | "inventor" | "hypercad_s" | "catia_v5" | "rhino"'. Did you mean '"hypercad_s"'?
src/engines/HyperCADSCodeGeneratorEngine.ts(203,17): error TS2352: Conversion of type 'string | number | boolean | readonly string[] | readonly number[] | null | undefined' to type 'number[][]' may be a mistake because neither type sufficiently overlaps with the other. If this was intentional, convert the expression to 'unknown' first.
src/engines/HyperCADSLiveBridgeEngine.ts(174,7): error TS2322: Type 'string' is not assignable to type '"2025" | "2023" | "2024" | undefined'.
src/engines/HyperCADSLiveBridgeEngine.ts(191,7): error TS2322: Type 'readonly CADBuildWarning[]' is not assignable to type 'readonly string[]'.
src/engines/HyperCADSLiveBridgeEngine.ts(280,7): error TS2322: Type 'string' is not assignable to type '"2025" | "2023" | "2024" | undefined'.
src/engines/HyperCADSLiveBridgeEngine.ts(293,7): error TS2322: Type 'readonly CADBuildWarning[]' is not assignable to type 'readonly string[]'.
src/engines/HyperCADSLiveBridgeEngine.ts(319,51): error TS2345: Argument of type '{ body: string; cadSystem: "hypercads"; filename: string; parameters: Map<string, unknown>; lineage: Array<{ opIndex: number; opId?: string; opKind: string; lineRange: [number, number]; }>; warnings: string[]; imports: string[]; }' is not assignable to parameter of type 'CADScript<string>'.
src/engines/ImpellerCADEngine.ts(370,7): error TS2322: Type 'number[][]' is not assignable to type 'string | number | boolean | readonly string[] | readonly number[] | null | undefined'.
src/engines/ImpellerCADEngine.ts(433,7): error TS2322: Type 'number[][]' is not assignable to type 'string | number | boolean | readonly string[] | readonly number[] | null | undefined'.
src/engines/ImpellerCADEngine.ts(568,7): error TS2322: Type '[number, number, number][]' is not assignable to type 'string | number | boolean | readonly string[] | readonly number[] | null | undefined'.
src/engines/ImpellerCADEngine.ts(614,9): error TS2322: Type 'number[][]' is not assignable to type 'string | number | boolean | readonly string[] | readonly number[] | null | undefined'.
src/engines/ImpellerCADEngine.ts(629,9): error TS2322: Type 'number[][]' is not assignable to type 'string | number | boolean | readonly string[] | readonly number[] | null | undefined'.
src/engines/InventorCADCodeGeneratorEngine.ts(139,3): error TS2322: Type 'Set<string>' is not assignable to type 'ReadonlySet<"custom" | "sketch_create" | "sketch_line" | "sketch_arc" | "sketch_circle" | "sketch_rectangle" | "sketch_spline" | "sketch_dimension" | "sketch_constraint" | "sketch_trim" | ... 89 more ... | "parameter_table">'.
src/engines/InventorCADCodeGeneratorEngine.ts(528,11): error TS2416: Property 'requireArg' in type 'InventorCADCodeGeneratorEngine' is not assignable to the same property in base type 'UnifiedCADCodeGeneratorBase<InventorCADContext>'.
src/engines/InventorCADCodeGeneratorEngine.ts(730,20): error TS2352: Conversion of type 'string | number | boolean | readonly string[] | readonly number[] | null | undefined' to type '[number, number][]' may be a mistake because neither type sufficiently overlaps with the other. If this was intentional, convert the expression to 'unknown' first.
src/engines/InventorCADCodeGeneratorEngine.ts(2077,9): error TS2353: Object literal may only specify known properties, and 'warningCount' does not exist in type '{ volumeMm3?: number | undefined; boundingBoxMm?: [number, number, number] | undefined; centerMm?: [number, number, number] | undefined; faceCount?: number | undefined; edgeCount?: number | undefined; ... 4 more ...; operationCount?: number | undefined; }'.
src/engines/LatheMasterOrchestratorFacadeEngine.ts(242,53): error TS2339: Property 'activate' does not exist on type 'TribalKnowledgeActivationEngine'.
src/engines/LatheMasterOrchestratorFacadeEngine.ts(261,15): error TS2353: Object literal may only specify known properties, and 'operation' does not exist in type '{ program?: string | undefined; material?: string | undefined; part_geometry?: Record<string, unknown> | undefined; symptoms?: string[] | undefined; constraints?: Record<string, unknown> | undefined; programs?: string[] | undefined; }'.
src/engines/LatheMasterOrchestratorFacadeEngine.ts(451,46): error TS2339: Property 'collision' does not exist on type 'CollisionResult'.
src/engines/LatheMasterOrchestratorFacadeEngine.ts(454,45): error TS2339: Property 'collision' does not exist on type 'CollisionResult'.
src/engines/LatheMasterOrchestratorFacadeEngine.ts(475,69): error TS2554: Expected 9 arguments, but got 5.
src/engines/LatheMasterOrchestratorFacadeEngine.ts(485,17): error TS2554: Expected 1 arguments, but got 4.
src/engines/LatheMasterOrchestratorFacadeEngine.ts(488,44): error TS2345: Argument of type 'string' is not assignable to parameter of type 'number'.
src/engines/LatheMasterOrchestratorFacadeEngine.ts(514,37): error TS2339: Property 'power_kW' does not exist on type 'TurningForces'.
src/engines/LatheMasterOrchestratorFacadeEngine.ts(544,68): error TS2339: Property 'activate' does not exist on type 'TribalKnowledgeActivationEngine'.
src/engines/LatheMasterOrchestratorFacadeEngine.ts(679,16): error TS2339: Property 'emit' does not exist on type 'EventBus'.
src/engines/NeuralCADGenerationEngine.ts(469,67): error TS2345: Argument of type 'TokenSeq' is not assignable to parameter of type 'TokenSequence'.
src/engines/NeuralCADGenerationEngine.ts(470,23): error TS2339: Property 'ops' does not exist on type 'CADProgram'.
src/engines/NeuralCADGenerationEngine.ts(470,42): error TS2339: Property 'ops' does not exist on type 'CADProgram'.
src/engines/NeuralCADGenerationEngine.ts(471,47): error TS2339: Property 'ops' does not exist on type 'CADProgram'.
src/engines/SolidWorksAutomationBridge.ts(160,7): error TS2322: Type 'number' is not assignable to type 'undefined'.
src/engines/SolidWorksAutomationBridge.ts(174,7): error TS2322: Type 'number' is not assignable to type 'undefined'.
src/engines/SolidWorksAutomationBridge.ts(189,7): error TS2322: Type 'number' is not assignable to type 'undefined'.
src/engines/SolidWorksAutomationBridge.ts(204,7): error TS2322: Type 'number' is not assignable to type 'undefined'.
src/engines/SolidWorksAutomationBridge.ts(218,7): error TS2322: Type 'number' is not assignable to type 'undefined'.
src/engines/SolidWorksAutomationBridge.ts(235,7): error TS2322: Type 'number' is not assignable to type 'undefined'.
src/engines/SolidWorksCodeGeneratorEngine.ts(223,12): error TS2741: Property 'cadSystem' is missing in type '{ supportedOps: Set<"custom" | "sketch_create" | "sketch_line" | "sketch_arc" | "sketch_circle" | "sketch_rectangle" | "sketch_spline" | "sketch_dimension" | "sketch_constraint" | ... 90 more ... | "parameter_table">; ... 4 more ...; limits: { ...; }; }' but required in type 'CADCapabilityMatrix'.
src/engines/SolidWorksCodeGeneratorEngine.ts(539,28): error TS2881: This expression is never nullish.
src/engines/SolidWorksCodeGeneratorEngine.ts(1127,19): error TS2416: Property 'runScriptBody' in type 'SolidWorksCodeGeneratorEngine' is not assignable to the same property in base type 'UnifiedCADCodeGeneratorBase<SolidWorksGenerationContext>'.
src/engines/SolidWorksCodeGeneratorEngine.ts(1133,9): error TS2353: Object literal may only specify known properties, and 'success' does not exist in type 'CADExecutionResult'.
src/engines/SolidWorksCodeGeneratorEngine.ts(1142,55): error TS2339: Property 'executeVBA' does not exist on type 'SolidWorksAutomationBridge'.
src/engines/SolidWorksCodeGeneratorEngine.ts(1144,9): error TS2353: Object literal may only specify known properties, and 'success' does not exist in type 'CADExecutionResult'.
src/engines/SolidWorksCodeGeneratorEngine.ts(1153,9): error TS2353: Object literal may only specify known properties, and 'success' does not exist in type 'CADExecutionResult'.
src/engines/TextToCADGenerationEngine.ts(473,7): error TS2352: Conversion of type 'Record<string, unknown>' to type 'TextToCADInput' may be a mistake because neither type sufficiently overlaps with the other. If this was intentional, convert the expression to 'unknown' first.
src/engines/TrilobeElectrodeGeometryEngine.ts(525,19): error TS2339: Property 'sinker_spark_gap' does not exist on type '{ readonly spark_erosion: { readonly C_d: 2.1; readonly current_exp_d: 0.43; readonly ton_exp_d: 0.44; readonly C_p: 0.54; readonly current_exp_p: 0.38; readonly ton_exp_p: 0.38; readonly C_mrr: 0.0085; ... 5 more ...; readonly source: "DiBitonto et al. ASME J. Eng. Ind. 111(2) 1989; Sato et al. JSME Int. J. 33(4) 1...'.
src/engines/TrilobeElectrodeGeometryEngine.ts(527,21): error TS2339: Property 'sinker_spark_gap' does not exist on type '{ readonly spark_erosion: { readonly C_d: 2.1; readonly current_exp_d: 0.43; readonly ton_exp_d: 0.44; readonly C_p: 0.54; readonly current_exp_p: 0.38; readonly ton_exp_p: 0.38; readonly C_mrr: 0.0085; ... 5 more ...; readonly source: "DiBitonto et al. ASME J. Eng. Ind. 111(2) 1989; Sato et al. JSME Int. J. 33(4) 1...'.
src/engines/TrilobeElectrodeGeometryEngine.ts(528,21): error TS2339: Property 'sinker_spark_gap' does not exist on type '{ readonly spark_erosion: { readonly C_d: 2.1; readonly current_exp_d: 0.43; readonly ton_exp_d: 0.44; readonly C_p: 0.54; readonly current_exp_p: 0.38; readonly ton_exp_p: 0.38; readonly C_mrr: 0.0085; ... 5 more ...; readonly source: "DiBitonto et al. ASME J. Eng. Ind. 111(2) 1989; Sato et al. JSME Int. J. 33(4) 1...'.
src/hooks/CADRegressionSafetyHooks.ts(254,3): error TS2322: Type '"quality"' is not assignable to type 'HookCategory'.
src/hooks/CADRegressionSafetyHooks.ts(286,3): error TS2322: Type '"quality"' is not assignable to type 'HookCategory'.
src/tools/dispatchers/cadDispatcher.ts(3328,90): error TS2344: Type '((confidenceTier: "operator_verified" | "ensemble_consensus" | "single_backend") => Promise<LoRATrainingPair[]>) | undefined' does not satisfy the constraint '(...args: any) => any'.
src/tools/dispatchers/cadDispatcher.ts(4152,88): error TS2339: Property 'axis_errors' does not exist on type 'CapabilityAccuracyOptions | undefined'.
src/tools/dispatchers/cadDispatcher.ts(4153,62): error TS2339: Property 'squareness' does not exist on type 'CapabilityAccuracyOptions | undefined'.
src/tools/dispatchers/cadDispatcher.ts(4154,60): error TS2339: Property 'workspace' does not exist on type 'CapabilityAccuracyOptions | undefined'.
src/tools/dispatchers/cadDispatcher.ts(4156,91): error TS2339: Property 'abbe_queries' does not exist on type 'CapabilityAccuracyOptions | undefined'.
src/tools/dispatchers/cadDispatcher.ts(4157,79): error TS2339: Property 'ball_bar' does not exist on type 'CapabilityAccuracyOptions | undefined'.
src/tools/dispatchers/cadDispatcher.ts(4774,96): error TS2345: Argument of type 'Record<string, any>' is not assignable to parameter of type 'DrawAnyPartInput'.
src/tools/dispatchers/cadDispatcher.ts(5810,55): error TS2339: Property 'workbench' does not exist on type '{ workbench?: "Machining" | "Sketcher" | "PartDesign" | "AssemblyDesign" | "Drafting" | "GenerativeShapeDesign" | "DMUNavigator" | "ProcessEngineer" | undefined; limit?: number | undefined; } | undefined'.
```

## mike (WEDM) — 106 errors
```
src/engines/WEDMArchiveBackfillEngine.ts(115,25): error TS2345: Argument of type 'string | undefined' is not assignable to parameter of type 'PathLike'.
src/engines/WEDMArchiveBackfillEngine.ts(116,37): error TS2769: No overload matches this call.
src/engines/WEDMArchiveBackfillEngine.ts(263,13): error TS2322: Type '{ filePath: string; customer: string; fileName: string; }' is not assignable to type 'string'.
src/engines/WEDMArchiveBackfillEngine.ts(268,13): error TS2322: Type '{ qualityScore: number | undefined; passCount: number | undefined; feedRates: number[] | undefined; }' is not assignable to type 'string'.
src/engines/WEDMCalculatorAIEngine.ts(550,7): error TS2322: Type '"wedm_calculator"' is not assignable to type 'AIReasoningDomain'.
src/engines/WEDMFeedbackIngestionEngine.ts(168,15): error TS2353: Object literal may only specify known properties, and 'predicted' does not exist in type 'PostOptions'.
src/engines/WEDMFeedbackIngestionEngine.ts(169,63): error TS2363: The right-hand side of an arithmetic operation must be of type 'any', 'number', 'bigint' or an enum type.
src/engines/WEDMFeedbackIngestionEngine.ts(169,79): error TS2363: The right-hand side of an arithmetic operation must be of type 'any', 'number', 'bigint' or an enum type.
src/engines/WEDMGapVoltageControlEngine.ts(324,9): error TS2322: Type 'number' is not assignable to type '80'.
src/engines/WEDMGapVoltageControlEngine.ts(326,9): error TS2322: Type 'number' is not assignable to type '10'.
src/engines/WEDMJobCreatorEngine.ts(135,28): error TS2339: Property 'type' does not exist on type 'PassDetail'.
src/engines/WEDMJobCreatorEngine.ts(145,77): error TS2339: Property 'e_pack_code' does not exist on type 'PassDetail'.
src/engines/WEDMJobCreatorEngine.ts(145,108): error TS2551: Property 'predicted_ra_um' does not exist on type 'PassDetail'. Did you mean 'expected_ra_um'?
src/engines/WEDMJobCreatorEngine.ts(207,26): error TS18048: 'program.estimated_time_min' is possibly 'undefined'.
src/engines/WEDMJobCreatorEngine.ts(207,86): error TS2339: Property 'wire_consumption_m' does not exist on type 'WEDMGenerateResult'.
src/engines/WEDMJobCreatorEngine.ts(207,125): error TS18048: 'program.predicted_ra_um' is possibly 'undefined'.
src/engines/WEDMJobCreatorEngine.ts(231,9): error TS2322: Type 'string | undefined' is not assignable to type 'string'.
src/engines/WEDMJobCreatorEngine.ts(232,9): error TS2322: Type 'number | undefined' is not assignable to type 'number'.
src/engines/WEDMJobCreatorEngine.ts(233,9): error TS2322: Type 'number | undefined' is not assignable to type 'number'.
src/engines/WEDMJobCreatorEngine.ts(234,9): error TS2322: Type 'number | undefined' is not assignable to type 'number'.
src/engines/WEDMJobCreatorEngine.ts(235,9): error TS2322: Type 'number | undefined' is not assignable to type 'number'.
src/engines/WEDMJobCreatorEngine.ts(236,9): error TS2322: Type 'number | undefined' is not assignable to type 'number'.
src/engines/WEDMJobCreatorEngine.ts(237,37): error TS2339: Property 'wire_consumption_m' does not exist on type 'WEDMGenerateResult'.
src/engines/WEDMMultiAgentDispatchEngine.ts(108,7): error TS2322: Type 'string[] | null' is not assignable to type 'string | null'.
src/engines/WEDMNeuralTrainingEngine.ts(570,29): error TS2367: This comparison appears to be unintentional because the types '0.2' and '0' have no overlap.
src/engines/WEDMNeuralTrainingEngine.ts(1934,15): error TS2339: Property 'body' does not exist on type '{ readonly id: "wedm-kb-005"; readonly title: "Coated wire reduces breaks in carbide and PCD"; readonly body: "When cutting tungsten carbide (WC) or PCD (polycrystalline diamond), use zinc-coated brass wire instead of plain brass. The zinc coating acts as a sacrificial layer, vaporizing during discharge and improvin...'.
src/engines/WEDMNeuralTrainingEngine.ts(1934,42): error TS2339: Property 'body' does not exist on type '{ readonly id: "wedm-kb-005"; readonly title: "Coated wire reduces breaks in carbide and PCD"; readonly body: "When cutting tungsten carbide (WC) or PCD (polycrystalline diamond), use zinc-coated brass wire instead of plain brass. The zinc coating acts as a sacrificial layer, vaporizing during discharge and improvin...'.
src/engines/WEDMNeuralTrainingEngine.ts(1945,30): error TS2339: Property 'body' does not exist on type '{ readonly id: "wedm-kb-005"; readonly title: "Coated wire reduces breaks in carbide and PCD"; readonly body: "When cutting tungsten carbide (WC) or PCD (polycrystalline diamond), use zinc-coated brass wire instead of plain brass. The zinc coating acts as a sacrificial layer, vaporizing during discharge and improvin...'.
src/engines/WEDMNeuralTrainingEngine.ts(2351,7): error TS2322: Type '"wedm_neural_optimization"' is not assignable to type 'AIReasoningDomain'.
src/engines/WEDMPrintToProgramEngine.ts(1000,29): error TS18048: 'result.confidence_score' is possibly 'undefined'.
src/engines/WEDMProductionReadinessEngine.ts(424,7): error TS2322: Type '"wedm_calibration"' is not assignable to type 'AIReasoningDomain'.
src/engines/WEDMProductionReadinessEngine.ts(475,7): error TS2322: Type '"wedm_calibration"' is not assignable to type 'AIReasoningDomain'.
src/engines/WEDMProductionReadinessEngine.ts(507,7): error TS2322: Type '"wedm_calibration"' is not assignable to type 'AIReasoningDomain'.
src/engines/WedmProgramIndexEngine.ts(276,7): error TS2322: Type 'Dirent<string>[]' is not assignable to type 'Dirent<NonSharedBuffer>[]'.
src/engines/WedmProgramIndexEngine.ts(285,44): error TS2345: Argument of type 'NonSharedBuffer' is not assignable to parameter of type 'string'.
src/engines/WedmProgramIndexEngine.ts(291,11): error TS2345: Argument of type 'NonSharedBuffer' is not assignable to parameter of type 'string'.
src/engines/WedmProgramIndexEngine.ts(301,11): error TS2345: Argument of type 'NonSharedBuffer' is not assignable to parameter of type 'string'.
src/engines/WedmProgramIndexEngine.ts(333,7): error TS2322: Type 'Dirent<string>[]' is not assignable to type 'Dirent<NonSharedBuffer>[]'.
src/engines/WedmProgramIndexEngine.ts(339,43): error TS2345: Argument of type 'NonSharedBuffer' is not assignable to parameter of type 'string'.
src/engines/WedmProgramIndexEngine.ts(353,11): error TS2345: Argument of type 'NonSharedBuffer' is not assignable to parameter of type 'string'.
src/engines/WEDMProgramOptimizerEngine.ts(551,81): error TS2345: Argument of type 'number' is not assignable to parameter of type 'never'.
src/engines/WEDMProgramSafetyGateEngine.ts(292,7): error TS2353: Object literal may only specify known properties, and 'threshold' does not exist in type 'SafetyGateResult'.
src/engines/WEDMProgramSafetyGateEngine.ts(376,29): error TS2339: Property 'toUpperCase' does not exist on type 'never'.
src/engines/WEDMSafetyEnvelopeEngine.ts(62,3): error TS2740: Type '{ wire_tension_gf: { min: number; max: number; soft_band: number; }; gap_V: { min: number; max: number; soft_band: number; }; resistivity_Mohm_cm: { min: number; max: number; soft_band: number; }; tank_level_pct: { ...; }; wire_breaks_in_window: { ...; }; }' is missing the following properties from type 'Record<keyof EnvelopeReading, EnvelopeLimit>': X_mm, Y_mm, Z_upper_mm, Z_lower_mm, and 2 more.
src/engines/WEDMSetupSheetEngine.ts(221,37): error TS18048: 'passes' is possibly 'undefined'.
src/engines/WEDMSetupSheetEngine.ts(234,22): error TS18048: 'cycleTime' is possibly 'undefined'.
src/engines/WEDMSetupSheetEngine.ts(234,32): error TS2339: Property 'cutting_time_min' does not exist on type 'CycleTimeBreakdown'.
src/engines/WEDMSetupSheetEngine.ts(235,25): error TS18048: 'cycleTime' is possibly 'undefined'.
src/engines/WEDMSetupSheetEngine.ts(236,19): error TS18048: 'cycleTime' is possibly 'undefined'.
src/engines/WEDMSetupSheetEngine.ts(236,29): error TS2339: Property 'per_pass' does not exist on type 'CycleTimeBreakdown'.
src/engines/WEDMSetupSheetEngine.ts(243,19): error TS18048: 'sheet' is possibly 'undefined'.
src/engines/WEDMSetupSheetEngine.ts(244,24): error TS2339: Property 'wire_consumption_m' does not exist on type 'WEDMGenerateResult'.
src/engines/WEDMSetupSheetEngine.ts(251,7): error TS18048: 'sheet' is possibly 'undefined'.
src/engines/WEDMSetupSheetEngine.ts(251,7): error TS18048: 'sheet.thickness_mm' is possibly 'undefined'.
src/engines/WEDMSetupSheetEngine.ts(252,40): error TS18048: 'sheet' is possibly 'undefined'.
src/engines/WEDMSetupSheetEngine.ts(252,121): error TS18048: 'sheet' is possibly 'undefined'.
src/engines/WEDMSetupSheetEngine.ts(254,7): error TS18048: 'sheet' is possibly 'undefined'.
src/engines/WEDMSetupSheetEngine.ts(257,7): error TS18048: 'sheet' is possibly 'undefined'.
src/engines/WEDMSetupSheetEngine.ts(257,7): error TS18048: 'sheet.material' is possibly 'undefined'.
src/engines/WEDMSetupSheetEngine.ts(265,33): error TS18048: 'sheet' is possibly 'undefined'.
src/engines/WEDMSetupSheetEngine.ts(265,33): error TS2345: Argument of type 'number | undefined' is not assignable to parameter of type 'number'.
src/engines/WEDMSetupSheetEngine.ts(265,53): error TS18048: 'sheet' is possibly 'undefined'.
src/engines/WEDMSetupSheetEngine.ts(265,79): error TS18048: 'sheet' is possibly 'undefined'.
src/engines/WEDMSetupSheetEngine.ts(265,85): error TS2339: Property 'num_passes' does not exist on type 'SetupSheet'.
src/engines/WEDMSetupSheetEngine.ts(271,7): error TS2322: Type 'string | undefined' is not assignable to type 'string'.
src/engines/WEDMSetupSheetEngine.ts(271,18): error TS18048: 'sheet' is possibly 'undefined'.
src/engines/WEDMSetupSheetEngine.ts(272,7): error TS2322: Type 'string | undefined' is not assignable to type 'string'.
src/engines/WEDMSetupSheetEngine.ts(272,20): error TS18048: 'sheet' is possibly 'undefined'.
src/engines/WEDMSetupSheetEngine.ts(273,7): error TS2322: Type 'string | undefined' is not assignable to type 'string'.
src/engines/WEDMSetupSheetEngine.ts(273,17): error TS18048: 'sheet' is possibly 'undefined'.
src/engines/WEDMSetupSheetEngine.ts(275,7): error TS2322: Type 'number | undefined' is not assignable to type 'number'.
src/engines/WEDMSetupSheetEngine.ts(275,21): error TS18048: 'sheet' is possibly 'undefined'.
src/engines/WEDMSetupSheetEngine.ts(276,18): error TS18048: 'sheet' is possibly 'undefined'.
src/engines/WEDMSetupSheetEngine.ts(278,19): error TS18048: 'sheet' is possibly 'undefined'.
src/engines/WEDMSetupSheetEngine.ts(278,25): error TS2339: Property 'controller' does not exist on type 'SetupSheet'.
src/engines/WEDMSetupSheetEngine.ts(279,23): error TS18048: 'sheet' is possibly 'undefined'.
src/engines/WEDMSetupSheetEngine.ts(279,29): error TS2339: Property 'program_number' does not exist on type 'SetupSheet'.
src/engines/WEDMSetupSheetEngine.ts(283,27): error TS18048: 'sheet' is possibly 'undefined'.
src/engines/WEDMSetupSheetEngine.ts(284,18): error TS18048: 'sheet' is possibly 'undefined'.
src/engines/WEDMSetupSheetEngine.ts(284,24): error TS2339: Property 'submerged' does not exist on type 'SetupSheet'.
src/engines/WEDMSetupSheetEngine.ts(285,21): error TS18048: 'sheet' is possibly 'undefined'.
src/engines/WEDMSetupSheetEngine.ts(285,27): error TS2339: Property 'num_profiles' does not exist on type 'SetupSheet'.
src/engines/WEDMSetupSheetEngine.ts(286,19): error TS18048: 'sheet' is possibly 'undefined'.
src/engines/WEDMSetupSheetEngine.ts(286,25): error TS2339: Property 'num_passes' does not exist on type 'SetupSheet'.
src/engines/WEDMSetupSheetEngine.ts(289,19): error TS18048: 'sheet' is possibly 'undefined'.
src/engines/WEDMSetupSheetEngine.ts(289,25): error TS2339: Property 'submerged' does not exist on type 'SetupSheet'.
src/engines/WEDMSetupSheetEngine.ts(290,29): error TS18048: 'sheet' is possibly 'undefined'.
src/engines/WEDMSetupSheetEngine.ts(290,29): error TS18048: 'sheet.thickness_mm' is possibly 'undefined'.
src/engines/WEDMSetupSheetEngine.ts(295,25): error TS18048: 'cycleTime' is possibly 'undefined'.
src/engines/WEDMSetupSheetEngine.ts(310,16): error TS18048: 'confidence' is possibly 'undefined'.
src/engines/WEDMSetupSheetEngine.ts(311,16): error TS18048: 'confidence' is possibly 'undefined'.
src/engines/WEDMSetupSheetEngine.ts(311,27): error TS2339: Property 'summary' does not exist on type 'ConfidenceScore'.
src/engines/WireEDMDeepAIHardeningEngine.ts(1597,31): error TS2339: Property 'on' does not exist on type 'ECodePass'.
src/engines/WireEDMDeepAIHardeningEngine.ts(1598,27): error TS2339: Property 'on' does not exist on type 'ECodePass'.
src/engines/WireEDMDeepAIHardeningEngine.ts(1599,28): error TS2339: Property 'off' does not exist on type 'ECodePass'.
src/engines/WireEDMMachineTechDataEngine.ts(377,7): error TS2741: Property 'method' is missing in type '{ found: false; exact_match: false; machine: WEDMMachineModel; wire_diameter_mm: number; material: TechMaterial; thickness_mm: number; passes: never[]; source: string; }' but required in type 'TechLookupResult'.
src/engines/WireEDMMachineTechDataEngine.ts(396,7): error TS2741: Property 'method' is missing in type '{ found: false; exact_match: false; machine: WEDMMachineModel; wire_diameter_mm: number; material: TechMaterial; thickness_mm: number; passes: never[]; source: string; }' but required in type 'TechLookupResult'.
src/engines/WireEDMMachineTechDataEngine.ts(841,20): error TS2339: Property 'toLowerCase' does not exist on type 'never'.
src/engines/WireEDMNeuralOrchestrationEngine.ts(793,7): error TS2322: Type '"brass"' is not assignable to type 'WireType'.
src/engines/WireEDMNeuralOrchestrationEngine.ts(794,7): error TS2322: Type 'string' is not assignable to type 'WireDiameter'.
src/hooks/WEDMGnnHooks.ts(47,3): error TS2322: Type '"quality"' is not assignable to type 'HookCategory'.
src/hooks/WEDMLearningHooks.ts(79,3): error TS2322: Type '"medium"' is not assignable to type 'HookPriority'.
src/hooks/WEDMLearningHooks.ts(175,3): error TS2322: Type '"quality"' is not assignable to type 'HookCategory'.
src/hooks/WEDMPerceptionHooks.ts(77,3): error TS2322: Type '"quality"' is not assignable to type 'HookCategory'.
src/hooks/WEDMSVIHooks.ts(61,3): error TS2322: Type '"awareness"' is not assignable to type 'HookCategory'.
src/hooks/WEDMSVIHooks.ts(63,3): error TS2322: Type '"medium"' is not assignable to type 'HookPriority'.
```

## india (AI-training) — 88 errors
```
src/engines/CADReasoningChainEngine.ts(118,7): error TS2720: Class 'CADReasoningChainEngine' incorrectly implements class 'BaseEngine'. Did you mean to extend 'BaseEngine' and inherit its members as a subclass?
src/engines/CADReasoningChainEngine.ts(631,36): error TS2365: Operator '<' cannot be applied to types 'string | number' and 'number'.
src/engines/CADReasoningChainEngine.ts(646,48): error TS2365: Operator '<' cannot be applied to types 'string | number' and 'number'.
src/engines/CADRegenerationTestEngine.ts(318,15): error TS2339: Property 'neuralCadGenerationEngine' does not exist on type 'typeof import("H:/PRISM/mcp-server/src/engines/NeuralCADGenerationEngine")'.
src/engines/CAMDeepLearningEngine.ts(1305,9): error TS2322: Type 'string | number | boolean' is not assignable to type 'string | number'.
src/engines/CAMLoRAAdapterTrainerEngine.ts(331,44): error TS2339: Property 'cam_system' does not exist on type 'OutcomeRequestSummary'.
src/engines/CAMLoRAAdapterTrainerEngine.ts(368,7): error TS2322: Type 'OutcomeRequestSummary' is not assignable to type 'Record<string, unknown>'.
src/engines/CAMLoRAAdapterTrainerEngine.ts(369,7): error TS2322: Type 'OutcomeResponseSummary' is not assignable to type 'Record<string, unknown>'.
src/engines/ChatterNeuralClassifierEngine.ts(283,72): error TS2551: Property 'kc11' does not exist on type '{ kc1_1: number; mc: number; }'. Did you mean 'kc1_1'?
src/engines/ControllerKnowledgeEngine.ts(489,7): error TS2353: Object literal may only specify known properties, and 'threadingCycle' does not exist in type 'GCodeDialect'.
src/engines/ControllerKnowledgeEngine.ts(998,7): error TS2561: Object literal may only specify known properties, but 'toolLengthCompTCPC' does not exist in type 'GCodeDialect'. Did you mean to write 'toolLengthComp'?
src/engines/ControllerKnowledgeEngine.ts(1361,7): error TS2561: Object literal may only specify known properties, but 'nanoSmoothingCode' does not exist in type 'GCodeDialect'. Did you mean to write 'smoothingCode'?
src/engines/ControllerKnowledgeEngine.ts(2365,7): error TS2561: Object literal may only specify known properties, but 'toolLengthCompFixed' does not exist in type 'GCodeDialect'. Did you mean to write 'toolLengthComp'?
src/engines/DecisionReasoningEngine.ts(1211,5): error TS2322: Type '{ id: string; name: string; category: "machine"; properties: { type: "mill" | "lathe" | "mill_turn" | "grinder" | "5axis" | "edm_wire" | "edm_sinker"; work_envelope: { x_travel: number; y_travel: number; z_travel: number; max_diameter?: number | undefined; max_length?: number | undefined; }; spindle: { ...; }; capab...' is not assignable to type 'DecisionCandidate[]'.
src/engines/ElectrodeAIReasoningEngine.ts(539,41): error TS2339: Property 'sinker_spark_gap' does not exist on type '{ readonly spark_erosion: { readonly C_d: 2.1; readonly current_exp_d: 0.43; readonly ton_exp_d: 0.44; readonly C_p: 0.54; readonly current_exp_p: 0.38; readonly ton_exp_p: 0.38; readonly C_mrr: 0.0085; ... 5 more ...; readonly source: "DiBitonto et al. ASME J. Eng. Ind. 111(2) 1989; Sato et al. JSME Int. J. 33(4) 1...'.
src/engines/ElectrodeAIReasoningEngine.ts(540,40): error TS2339: Property 'sinker_spark_gap' does not exist on type '{ readonly spark_erosion: { readonly C_d: 2.1; readonly current_exp_d: 0.43; readonly ton_exp_d: 0.44; readonly C_p: 0.54; readonly current_exp_p: 0.38; readonly ton_exp_p: 0.38; readonly C_mrr: 0.0085; ... 5 more ...; readonly source: "DiBitonto et al. ASME J. Eng. Ind. 111(2) 1989; Sato et al. JSME Int. J. 33(4) 1...'.
src/engines/ElectrodeAIReasoningEngine.ts(541,42): error TS2339: Property 'sinker_spark_gap' does not exist on type '{ readonly spark_erosion: { readonly C_d: 2.1; readonly current_exp_d: 0.43; readonly ton_exp_d: 0.44; readonly C_p: 0.54; readonly current_exp_p: 0.38; readonly ton_exp_p: 0.38; readonly C_mrr: 0.0085; ... 5 more ...; readonly source: "DiBitonto et al. ASME J. Eng. Ind. 111(2) 1989; Sato et al. JSME Int. J. 33(4) 1...'.
src/engines/ElectrodeAIReasoningEngine.ts(542,39): error TS2339: Property 'sinker_duty_cycle' does not exist on type '{ readonly spark_erosion: { readonly C_d: 2.1; readonly current_exp_d: 0.43; readonly ton_exp_d: 0.44; readonly C_p: 0.54; readonly current_exp_p: 0.38; readonly ton_exp_p: 0.38; readonly C_mrr: 0.0085; ... 5 more ...; readonly source: "DiBitonto et al. ASME J. Eng. Ind. 111(2) 1989; Sato et al. JSME Int. J. 33(4) 1...'.
src/engines/FiveAxisDeepLearningEngine.ts(313,5): error TS2739: Type '{ name: string; iso_group: "H"; kc11_mpa: number; mc: number; hardness_hrc: number; thermal_conductivity_w_mk: number; }' is missing the following properties from type 'MaterialProps': density_kg_m3, specific_heat_j_kgk
src/engines/FiveAxisDeepLearningEngine.ts(397,5): error TS2739: Type '{ name: string; iso_group: "H"; kc11_mpa: number; mc: number; hardness_hrc: number; thermal_conductivity_w_mk: number; }' is missing the following properties from type 'MaterialProps': density_kg_m3, specific_heat_j_kgk
src/engines/FiveAxisDeepLearningEngine.ts(481,5): error TS2739: Type '{ name: string; iso_group: "N"; kc11_mpa: number; mc: number; hardness_hrc: number; thermal_conductivity_w_mk: number; }' is missing the following properties from type 'MaterialProps': density_kg_m3, specific_heat_j_kgk
src/engines/KnowledgeGraphNeuralBridgeEngine.ts(308,7): error TS2322: Type 'string | null | undefined' is not assignable to type 'string | null'.
src/engines/KnowledgeGraphNeuralBridgeEngine.ts(471,7): error TS2322: Type 'string | undefined' is not assignable to type 'string | null'.
src/engines/LatheLoRADatasetBuilderEngine.ts(560,44): error TS2339: Property 'query' does not exist on type 'TribalKnowledgeEngine'.
src/engines/LatheLoRAExperimentTrackerEngine.ts(252,62): error TS2345: Argument of type 'string | undefined' is not assignable to parameter of type 'string'.
src/engines/LatheSpeedFeedReasoningBridgeEngine.ts(282,9): error TS2322: Type 'string' is not assignable to type '"roughing" | "finishing" | "semi_finishing" | "drilling" | "boring" | "grooving" | "parting" | "threading"'.
src/engines/LatheSpeedFeedReasoningBridgeEngine.ts(297,9): error TS2322: Type 'string' is not assignable to type '"balanced" | "conservative" | "aggressive" | "maximum_mrr" | undefined'.
src/engines/LatheSpeedFeedReasoningBridgeEngine.ts(302,9): error TS2322: Type 'string' is not assignable to type '"flood" | "mist" | "dry" | "cryogenic" | "high_pressure" | undefined'.
src/engines/LatheSpeedFeedReasoningBridgeEngine.ts(517,11): error TS2739: Type '{ vc_min: number; vc_max: number; feed_min: number; feed_max: number; }' is missing the following properties from type 'SpeedFeedBand': doc_min, doc_max
src/engines/LatheTribalIntegrationEngine.ts(1006,7): error TS2322: Type '("negative" | "positive" | "constraint" | LatheMaterialIso | LatheOperationType | undefined)[]' is not assignable to type 'string[]'.
src/engines/LatheTribalIntegrationEngine.ts(1007,19): error TS2677: A type predicate's type must be assignable to its parameter's type.
src/engines/LoRACompositionEngine.ts(161,51): error TS2345: Argument of type '{ domain: "quality" | "post_processor" | "mill" | "lathe" | "mill_turn" | "sinker_edm" | "grinder" | "waterjet" | "laser" | "other" | "speed_feed" | "quote" | "wedm" | "cam" | "erp" | ... 4 more ... | "schedule"; material: string | undefined; machine: string | undefined; operation: string | undefined; top_k: number; }' is not assignable to parameter of type '{ domain: "quality" | "post_processor" | "mill" | "lathe" | "mill_turn" | "sinker_edm" | "grinder" | "waterjet" | "laser" | "other" | "speed_feed" | "quote" | "wedm" | "cam" | "erp" | ... 4 more ... | "schedule"; ... 5 more ...; quality_weights?: number[] | undefined; }'.
src/engines/MillTribalIntegrationEngine.ts(436,13): error TS18048: 'signal.adjustment.rpm_factor' is possibly 'undefined'.
src/engines/MillTribalIntegrationEngine.ts(437,14): error TS18048: 'signal.adjustment.feed_factor' is possibly 'undefined'.
src/engines/MillTribalIntegrationEngine.ts(438,13): error TS18048: 'signal.adjustment.doc_factor' is possibly 'undefined'.
src/engines/MITCourseKnowledgeEngine.ts(445,38): error TS7006: Parameter 'e' implicitly has an 'any' type.
src/engines/MITCourseKnowledgeEngine.ts(521,37): error TS7006: Parameter 'e' implicitly has an 'any' type.
src/engines/MITCourseRegistryEngine.ts(129,14): error TS2654: Non-abstract class 'MITCourseRegistryEngine' is missing implementations for the following members of 'BaseEngine': 'getCapabilities', 'validate', 'executeImpl'.
src/engines/MITCourseRegistryEngine.ts(140,5): error TS2554: Expected 1 arguments, but got 0.
src/engines/MultiPathReasoningEngine.ts(110,18): error TS2430: Interface 'MultiPathProblem' incorrectly extends interface 'ManufacturingProblem'.
src/engines/MultiPathReasoningEngine.ts(382,11): error TS2322: Type '{ problem: string; known_facts: string[]; maxPaths?: number; maxDepth?: number; beamWidth?: number; pruneThreshold?: number; strategy?: GenerationStrategy; scoreWeights?: Partial<ScoreWeights>; ... 13 more ...; confidence_threshold?: number; }' is not assignable to type 'ManufacturingProblem'.
src/engines/MultiPathReasoningEngine.ts(579,11): error TS2322: Type '{ approaches: string[]; maxPaths: number; domain: ManufacturingDomain; material?: MaterialContext; machine_id?: string; operation?: string; budget?: number; ... 9 more ...; confidence_threshold?: number; }' is not assignable to type 'MultiPathProblem'.
src/engines/NeuralCADGenerationEngine.ts(469,67): error TS2345: Argument of type 'TokenSeq' is not assignable to parameter of type 'TokenSequence'.
src/engines/NeuralCADGenerationEngine.ts(470,23): error TS2339: Property 'ops' does not exist on type 'CADProgram'.
src/engines/NeuralCADGenerationEngine.ts(470,42): error TS2339: Property 'ops' does not exist on type 'CADProgram'.
src/engines/NeuralCADGenerationEngine.ts(471,47): error TS2339: Property 'ops' does not exist on type 'CADProgram'.
src/engines/PostProcessorKnowledgeEngine.ts(1743,5): error TS2322: Type 'boolean' is not assignable to type 'string | number'.
src/engines/PostProcessorKnowledgeEngine.ts(1754,5): error TS2322: Type 'boolean' is not assignable to type 'string | number'.
src/engines/PostProcessorMetaLearningEngine.ts(915,44): error TS2345: Argument of type 'OptimizedPost' is not assignable to parameter of type 'PostOutput'.
src/engines/ReasoningChainSharingEngine.ts(360,53): error TS18048: 'query.min_confidence' is possibly 'undefined'.
src/engines/ReasoningChainSharingEngine.ts(492,50): error TS2339: Property 'captureKnowledge' does not exist on type 'TribalKnowledgeEngine'.
src/engines/ReasoningChainSharingEngine.ts(655,32): error TS2345: Argument of type 'string' is not assignable to parameter of type 'EventHandler<unknown>'.
src/engines/TrainingSchedulerEngine.ts(152,38): error TS18048: 'module.quiz' is possibly 'undefined'.
src/engines/TrainingSchedulerEngine.ts(152,50): error TS2339: Property 'id' does not exist on type 'ModuleQuiz'.
src/engines/TrainingSchedulerEngine.ts(155,26): error TS18048: 'module.quiz' is possibly 'undefined'.
src/engines/TrainingSchedulerEngine.ts(155,38): error TS2339: Property 'passingScore' does not exist on type 'ModuleQuiz'.
src/engines/TrainingSchedulerEngine.ts(233,32): error TS18048: 'm.estimatedMinutes' is possibly 'undefined'.
src/engines/TrainingSchedulerEngine.ts(246,11): error TS2322: Type 'number | undefined' is not assignable to type 'number'.
src/engines/TrainingSchedulerEngine.ts(249,29): error TS18048: 'm.estimatedMinutes' is possibly 'undefined'.
src/engines/TribalCorpusOrchestratorEngine.ts(137,62): error TS2352: Conversion of type 'Record<string, unknown>' to type 'SinkerCorpusInput' may be a mistake because neither type sufficiently overlaps with the other. If this was intentional, convert the expression to 'unknown' first.
src/engines/TribalCorpusOrchestratorEngine.ts(143,65): error TS2352: Conversion of type 'Record<string, unknown>' to type 'LaserCorpusInput' may be a mistake because neither type sufficiently overlaps with the other. If this was intentional, convert the expression to 'unknown' first.
src/engines/TribalCorpusOrchestratorEngine.ts(149,68): error TS2352: Conversion of type 'Record<string, unknown>' to type 'WaterjetCorpusInput' may be a mistake because neither type sufficiently overlaps with the other. If this was intentional, convert the expression to 'unknown' first.
src/engines/TribalCorpusOrchestratorEngine.ts(155,61): error TS2352: Conversion of type 'Record<string, unknown>' to type 'GrindCorpusInput' may be a mistake because neither type sufficiently overlaps with the other. If this was intentional, convert the expression to 'unknown' first.
src/engines/TribalCorpusOrchestratorEngine.ts(161,60): error TS2352: Conversion of type 'Record<string, unknown>' to type 'WeldCorpusInput' may be a mistake because neither type sufficiently overlaps with the other. If this was intentional, convert the expression to 'unknown' first.
src/engines/TribalCorpusOrchestratorEngine.ts(167,74): error TS2352: Conversion of type 'Record<string, unknown>' to type 'AMCorpusInput' may be a mistake because neither type sufficiently overlaps with the other. If this was intentional, convert the expression to 'unknown' first.
src/engines/TribalCorpusOrchestratorEngine.ts(174,59): error TS2352: Conversion of type 'Record<string, unknown>' to type 'OperatorCoachingInput' may be a mistake because neither type sufficiently overlaps with the other. If this was intentional, convert the expression to 'unknown' first.
src/engines/TribalKnowledgeActivationEngine.ts(546,21): error TS2367: This comparison appears to be unintentional because the types '"partial" | "domain"' and '"exact"' have no overlap.
src/engines/TribalKnowledgeAdvisorEngine.ts(426,21): error TS2339: Property 'tips' does not exist on type 'KnowledgeTip[]'.
src/engines/WEDMNeuralTrainingEngine.ts(570,29): error TS2367: This comparison appears to be unintentional because the types '0.2' and '0' have no overlap.
src/engines/WEDMNeuralTrainingEngine.ts(1934,15): error TS2339: Property 'body' does not exist on type '{ readonly id: "wedm-kb-005"; readonly title: "Coated wire reduces breaks in carbide and PCD"; readonly body: "When cutting tungsten carbide (WC) or PCD (polycrystalline diamond), use zinc-coated brass wire instead of plain brass. The zinc coating acts as a sacrificial layer, vaporizing during discharge and improvin...'.
src/engines/WEDMNeuralTrainingEngine.ts(1934,42): error TS2339: Property 'body' does not exist on type '{ readonly id: "wedm-kb-005"; readonly title: "Coated wire reduces breaks in carbide and PCD"; readonly body: "When cutting tungsten carbide (WC) or PCD (polycrystalline diamond), use zinc-coated brass wire instead of plain brass. The zinc coating acts as a sacrificial layer, vaporizing during discharge and improvin...'.
src/engines/WEDMNeuralTrainingEngine.ts(1945,30): error TS2339: Property 'body' does not exist on type '{ readonly id: "wedm-kb-005"; readonly title: "Coated wire reduces breaks in carbide and PCD"; readonly body: "When cutting tungsten carbide (WC) or PCD (polycrystalline diamond), use zinc-coated brass wire instead of plain brass. The zinc coating acts as a sacrificial layer, vaporizing during discharge and improvin...'.
src/engines/WEDMNeuralTrainingEngine.ts(2351,7): error TS2322: Type '"wedm_neural_optimization"' is not assignable to type 'AIReasoningDomain'.
src/engines/WireEDMNeuralOrchestrationEngine.ts(793,7): error TS2322: Type '"brass"' is not assignable to type 'WireType'.
src/engines/WireEDMNeuralOrchestrationEngine.ts(794,7): error TS2322: Type 'string' is not assignable to type 'WireDiameter'.
src/engines/XProcNeuralAutoFireEngine.ts(284,28): error TS2345: Argument of type '"conformal_monitor_bridge"' is not assignable to parameter of type 'AutoFireComponentKey'.
src/engines/XProcNeuralAutoFireEngine.ts(344,8): error TS2322: Type '"conformal_monitor_bridge"' is not assignable to type 'AutoFireComponentKey'.
src/hooks/KnowledgeHooks.ts(234,3): error TS2322: Type '"knowledge"' is not assignable to type 'HookCategory'.
src/hooks/KnowledgeHooks.ts(333,3): error TS2322: Type '"knowledge"' is not assignable to type 'HookCategory'.
src/hooks/WEDMGnnHooks.ts(47,3): error TS2322: Type '"quality"' is not assignable to type 'HookCategory'.
src/tools/dispatchers/knowledgeDispatcher.ts(1066,19): error TS2345: Argument of type 'string' is not assignable to parameter of type 'keyof MachiningParameters'.
src/tools/dispatchers/knowledgeDispatcher.ts(1246,19): error TS2345: Argument of type 'number | undefined' is not assignable to parameter of type '{ operation_id: string; operation?: string | undefined; material_iso_group?: string | undefined; machine_id?: string | undefined; workholding?: string | undefined; tool_diameter_mm?: number | undefined; query?: string | undefined; limit?: number | undefined; }'.
src/tools/dispatchers/knowledgeDispatcher.ts(1839,35): error TS18048: 'mod.quiz' is possibly 'undefined'.
src/tools/dispatchers/knowledgeDispatcher.ts(1839,45): error TS2339: Property 'questions' does not exist on type 'ModuleQuiz'.
src/tools/dispatchers/knowledgeDispatcher.ts(1840,30): error TS2339: Property 'questions' does not exist on type 'ModuleQuiz'.
src/tools/dispatchers/knowledgeDispatcher.ts(1843,24): error TS18048: 'mod.quiz' is possibly 'undefined'.
src/tools/dispatchers/knowledgeDispatcher.ts(1843,34): error TS2339: Property 'id' does not exist on type 'ModuleQuiz'.
src/tools/dispatchers/knowledgeDispatcher.ts(2813,21): error TS2322: Type '(e: string) => Promise<number[]>' is not assignable to type '(text: string) => Promise<{ ok: true; vector: number[]; } | { ok: false; reason: string; }>'.
```

## whiskey (Lathe) — 81 errors
```
src/engines/JMDieLatheProgramUpgraderV2Engine.ts(259,52): error TS2345: Argument of type '{ operation: "facing" | "drilling" | "boring" | "reaming" | "tapping" | "turning" | "grooving" | "threading" | "milling"; cut_type: "semi_finishing"; iso_group: ISOGroup; ... 5 more ...; optimize_for: "tool_life" | ... 2 more ... | "productivity"; }' is not assignable to parameter of type 'UltimateSpeedFeedInput'.
src/engines/JMDieLatheProgramUpgraderV2Engine.ts(271,30): error TS2551: Property 'cutting_speed_mpm' does not exist on type 'UltimateSpeedFeedResult'. Did you mean 'cutting_speed'?
src/engines/JMDieLatheProgramUpgraderV2Engine.ts(271,75): error TS2551: Property 'cutting_speed_mpm' does not exist on type 'UltimateSpeedFeedResult'. Did you mean 'cutting_speed'?
src/engines/JMDieLatheProgramUpgraderV2Engine.ts(272,34): error TS2551: Property 'feed_per_rev_mm' does not exist on type 'UltimateSpeedFeedResult'. Did you mean 'feed_per_rev'?
src/engines/JMDieLatheProgramUpgraderV2Engine.ts(273,32): error TS2339: Property 'feed_rate_mmmin' does not exist on type 'UltimateSpeedFeedResult'.
src/engines/JMDieLatheProgramUpgraderV2Engine.ts(274,38): error TS2339: Property 'feed_rate_mmmin' does not exist on type 'UltimateSpeedFeedResult'.
src/engines/JMDieLatheProgramUpgraderV2Engine.ts(275,27): error TS2551: Property 'axial_depth_mm' does not exist on type 'UltimateSpeedFeedResult'. Did you mean 'axial_depth'?
src/engines/LatheActiveLearningEngine.ts(1547,52): error TS2769: No overload matches this call.
src/engines/LatheActiveLearningEngine.ts(1549,7): error TS2769: No overload matches this call.
src/engines/LatheActiveLearningEngine.ts(1568,41): error TS18048: 'point.quality_class' is possibly 'undefined'.
src/engines/LatheAdvancedOperationsEngine.ts(827,7): error TS2353: Object literal may only specify known properties, and 'y_axis' does not exist in type 'Record<"four_jaw" | "offset_tailstock" | "eccentric_chuck", string[]>'.
src/engines/LatheAdvancedOperationsEngine.ts(847,29): error TS2367: This comparison appears to be unintentional because the types '"four_jaw" | "offset_tailstock" | "eccentric_chuck"' and '"y_axis"' have no overlap.
src/engines/LatheAIFeatureRegistration.ts(503,11): error TS2561: Object literal may only specify known properties, but 'domain' does not exist in type 'Partial<AIFeature>'. Did you mean to write 'domains'?
src/engines/LatheAIUltraEngine.ts(1968,37): error TS2352: Conversion of type 'Record<string, unknown>' to type 'LLMQueryContext' may be a mistake because neither type sufficiently overlaps with the other. If this was intentional, convert the expression to 'unknown' first.
src/engines/LatheCAMIntelligenceEngine.ts(558,19): error TS7053: Element implicitly has an 'any' type because expression of type '"moderate" | "none" | "severe" | "minor"' can't be used to index type '{ minor: number; moderate: number; severe: number; }'.
src/engines/LatheCAMIntelligenceEngine.ts(911,21): error TS2304: Cannot find name 'DecisionCriterion'.
src/engines/LatheCAMIntelligenceEngine.ts(1344,39): error TS2367: This comparison appears to be unintentional because the types 'LatheCADFeature' and '"bore"' have no overlap.
src/engines/LatheChipMechanicsEngine.ts(1308,7): error TS2322: Type 'boolean | undefined' is not assignable to type 'boolean'.
src/engines/LatheCuttingChemistryEngine.ts(1901,26): error TS2367: This comparison appears to be unintentional because the types '"semi_synthetic" | "full_synthetic" | "vegetable_ester" | "water_soluble_oil" | "mql_oil"' and '"straight_oil"' have no overlap.
src/engines/LatheCuttingChemistryEngine.ts(2110,45): error TS2367: This comparison appears to be unintentional because the types '"low" | "moderate" | "high"' and '"extreme"' have no overlap.
src/engines/LatheDeepAIHardeningEngine.ts(825,85): error TS2339: Property 'custom' does not exist on type 'Record<LathePartFamily, LatheOperationType[]>'.
src/engines/LatheIntelligenceEngine.ts(533,15): error TS2367: This comparison appears to be unintentional because the types '"critical" | "high" | "medium"' and '"none"' have no overlap.
src/engines/LatheIntelligenceEngine.ts(716,7): error TS2322: Type 'number | boolean | undefined' is not assignable to type 'boolean'.
src/engines/LatheJobProfitabilityAnalyticsEngine.ts(199,13): error TS2739: Type '{}' is missing the following properties from type '{ by: "customer" | "part_number"; top_n: number; since_iso?: string | undefined; until_iso?: string | undefined; }': by, top_n
src/engines/LatheLoRADatasetBuilderEngine.ts(560,44): error TS2339: Property 'query' does not exist on type 'TribalKnowledgeEngine'.
src/engines/LatheLoRAExperimentTrackerEngine.ts(252,62): error TS2345: Argument of type 'string | undefined' is not assignable to parameter of type 'string'.
src/engines/LatheMasterOrchestratorFacadeEngine.ts(242,53): error TS2339: Property 'activate' does not exist on type 'TribalKnowledgeActivationEngine'.
src/engines/LatheMasterOrchestratorFacadeEngine.ts(261,15): error TS2353: Object literal may only specify known properties, and 'operation' does not exist in type '{ program?: string | undefined; material?: string | undefined; part_geometry?: Record<string, unknown> | undefined; symptoms?: string[] | undefined; constraints?: Record<string, unknown> | undefined; programs?: string[] | undefined; }'.
src/engines/LatheMasterOrchestratorFacadeEngine.ts(451,46): error TS2339: Property 'collision' does not exist on type 'CollisionResult'.
src/engines/LatheMasterOrchestratorFacadeEngine.ts(454,45): error TS2339: Property 'collision' does not exist on type 'CollisionResult'.
src/engines/LatheMasterOrchestratorFacadeEngine.ts(475,69): error TS2554: Expected 9 arguments, but got 5.
src/engines/LatheMasterOrchestratorFacadeEngine.ts(485,17): error TS2554: Expected 1 arguments, but got 4.
src/engines/LatheMasterOrchestratorFacadeEngine.ts(488,44): error TS2345: Argument of type 'string' is not assignable to parameter of type 'number'.
src/engines/LatheMasterOrchestratorFacadeEngine.ts(514,37): error TS2339: Property 'power_kW' does not exist on type 'TurningForces'.
src/engines/LatheMasterOrchestratorFacadeEngine.ts(544,68): error TS2339: Property 'activate' does not exist on type 'TribalKnowledgeActivationEngine'.
src/engines/LatheMasterOrchestratorFacadeEngine.ts(679,16): error TS2339: Property 'emit' does not exist on type 'EventBus'.
src/engines/LatheMasterPostSelfAwarenessEngine.ts(519,28): error TS2345: Argument of type '{ id: string; name: string; dialect: "generic"; }' is not assignable to parameter of type '{ id: string; name: string; dialect: "fanuc" | "haas" | "okuma" | "mitsubishi" | "mazak" | "generic" | "citizen"; version: string; machineIds: string[]; features?: { cssSupport: boolean; cannedCycles: string[]; ... 6 more ...; partCatcher: boolean; } | undefined; }'.
src/engines/LathePostGeneratorActiveLearningEngine.ts(253,45): error TS2367: This comparison appears to be unintentional because the types '"unknown" | "syntax_error" | "cycle_error" | "tool_error" | "coolant_error" | "coordinate_error" | "compatibility_error"' and '"cosmetic"' have no overlap.
src/engines/LathePostGeneratorDialectEngine.ts(421,26): error TS2345: Argument of type '{ controller_id: string; cycle_code: string; parameters: { depth_of_cut: number; finish_allowance_x: number; finish_allowance_z: number; profile_start_block: number; profile_end_block: number; feed_rate: number; }; include_comments: true; use_line_numbers: false; }' is not assignable to parameter of type '{ controller_id: string; cycle_code: string; parameters: { depth_of_cut?: number | undefined; finish_allowance_x?: number | undefined; finish_allowance_z?: number | undefined; profile_start_block?: number | undefined; ... 17 more ...; spindle_speed?: number | undefined; }; line_number_start: number; line_number_incr...'.
src/engines/LathePostGeneratorDialectEngine.ts(449,26): error TS2345: Argument of type '{ controller_id: string; cycle_code: string; parameters: { thread_pitch: number; thread_depth: number; thread_angle: number; first_cut_depth: number; thread_end_x: number; thread_end_z: number; }; include_comments: true; use_line_numbers: false; }' is not assignable to parameter of type '{ controller_id: string; cycle_code: string; parameters: { depth_of_cut?: number | undefined; finish_allowance_x?: number | undefined; finish_allowance_z?: number | undefined; profile_start_block?: number | undefined; ... 17 more ...; spindle_speed?: number | undefined; }; line_number_start: number; line_number_incr...'.
src/engines/LathePostGeneratorDialectEngine.ts(475,26): error TS2345: Argument of type '{ controller_id: string; cycle_code: string; parameters: { hole_depth: number; peck_depth: number; retract_plane: number; feed_rate: number; }; include_comments: true; use_line_numbers: false; }' is not assignable to parameter of type '{ controller_id: string; cycle_code: string; parameters: { depth_of_cut?: number | undefined; finish_allowance_x?: number | undefined; finish_allowance_z?: number | undefined; profile_start_block?: number | undefined; ... 17 more ...; spindle_speed?: number | undefined; }; line_number_start: number; line_number_incr...'.
src/engines/LathePostGeneratorDialectEngine.ts(564,35): error TS2345: Argument of type '{ controller_id: string; cycle_code: string; parameters: { depth_of_cut?: number | undefined; finish_allowance_x?: number | undefined; finish_allowance_z?: number | undefined; profile_start_block?: number | undefined; ... 17 more ...; spindle_speed?: number | undefined; }; include_comments: false; use_line_numbers: ...' is not assignable to parameter of type '{ controller_id: string; cycle_code: string; parameters: { depth_of_cut?: number | undefined; finish_allowance_x?: number | undefined; finish_allowance_z?: number | undefined; profile_start_block?: number | undefined; ... 17 more ...; spindle_speed?: number | undefined; }; line_number_start: number; line_number_incr...'.
src/engines/LathePostProcessorAIEngine.ts(983,13): error TS2322: Type '"sequence"' is not assignable to type '"safety" | "efficiency" | "best_practice" | "compatibility"'.
src/engines/LathePostProcessorAIEngine.ts(1010,15): error TS2322: Type '"syntax"' is not assignable to type '"safety" | "efficiency" | "best_practice" | "compatibility"'.
src/engines/LathePostProcessorAIEngine.ts(2091,37): error TS2352: Conversion of type 'Record<string, unknown>' to type 'LLMPostQuery' may be a mistake because neither type sufficiently overlaps with the other. If this was intentional, convert the expression to 'unknown' first.
src/engines/LathePostRegressionTestGeneratorEngine.ts(447,40): error TS2345: Argument of type '{ gcode: string[]; controller: string; test_name: string; }' is not assignable to parameter of type '{ gcode: string[]; controller: string; include_coordinates: boolean; include_comments: boolean; source_file?: string | undefined; test_name?: string | undefined; }'.
src/engines/LathePrintSetupSelectionEngine.ts(175,26): error TS7053: Element implicitly has an 'any' type because expression of type '"roughing" | "finishing" | "drilling" | "parting" | "threading" | "default"' can't be used to index type '{ readonly roughing: 2.5; readonly finishing: 2; readonly parting: 3; readonly threading: 2.5; readonly default: 2; }'.
src/engines/LathePrintToleranceStackEngine.ts(775,35): error TS2339: Property 'errors' does not exist on type 'ZodError<{ recognition_id: string; datum_chains: { id: string; datums: { id: string; featureId: string; label: string; priority: number; featureType: string; surfaceType: "spherical" | "cylindrical" | "planar" | "conical"; diameter_mm?: number | undefined; z_position_mm?: number | undefined; }[]; totalBudget_mm: num...'.
src/engines/LatheProofCarryingEmitEngine.ts(266,9): error TS2322: Type '"BLOCKED" | "SAFE" | "UNVERIFIED"' is not assignable to type '"BLOCKED" | "WARNING" | "SAFE" | "SKIPPED"'.
src/engines/LatheQualityGateEngine.ts(712,13): error TS2353: Object literal may only specify known properties, and 'type' does not exist in type 'OperationInput'.
src/engines/LatheQualityGateEngine.ts(722,27): error TS2339: Property 'material' does not exist on type 'ValidationContext'.
src/engines/LatheQualityGateEngine.ts(723,32): error TS2339: Property 'material' does not exist on type 'ValidationContext'.
src/engines/LatheQualityGateEngine.ts(724,35): error TS2339: Property 'material' does not exist on type 'ValidationContext'.
src/engines/LatheQualityGateEngine.ts(730,43): error TS2339: Property 'max_power_kw' does not exist on type 'QualityGateMachine'.
src/engines/LatheQualityGateEngine.ts(1421,41): error TS2550: Property 'findLastIndex' does not exist on type 'QualityGateOperation[]'. Do you need to change your target library? Try changing the 'lib' compiler option to 'es2023' or later.
src/engines/LatheQualityGateEngine.ts(1421,55): error TS7006: Parameter 'op' implicitly has an 'any' type.
src/engines/LatheShopAwareOptimizationEngine.ts(527,61): error TS2339: Property 'raw_gcode' does not exist on type 'ParsedToolBlock'.
src/engines/LatheShopAwareOptimizationEngine.ts(641,63): error TS2345: Argument of type 'string | number' is not assignable to parameter of type 'string'.
src/engines/LatheShopAwareOptimizationEngine.ts(643,24): error TS2345: Argument of type 'string | number' is not assignable to parameter of type 'string'.
src/engines/LatheSpeedFeedReasoningBridgeEngine.ts(282,9): error TS2322: Type 'string' is not assignable to type '"roughing" | "finishing" | "semi_finishing" | "drilling" | "boring" | "grooving" | "parting" | "threading"'.
src/engines/LatheSpeedFeedReasoningBridgeEngine.ts(297,9): error TS2322: Type 'string' is not assignable to type '"balanced" | "conservative" | "aggressive" | "maximum_mrr" | undefined'.
src/engines/LatheSpeedFeedReasoningBridgeEngine.ts(302,9): error TS2322: Type 'string' is not assignable to type '"flood" | "mist" | "dry" | "cryogenic" | "high_pressure" | undefined'.
src/engines/LatheSpeedFeedReasoningBridgeEngine.ts(517,11): error TS2739: Type '{ vc_min: number; vc_max: number; feed_min: number; feed_max: number; }' is missing the following properties from type 'SpeedFeedBand': doc_min, doc_max
src/engines/LatheThermodynamicsEngine.ts(2062,9): error TS2322: Type 'number | boolean | undefined' is not assignable to type 'boolean'.
src/engines/LatheTransformerEngine.ts(2342,9): error TS2322: Type '"warning" | "critical" | "suggestion"' is not assignable to type '"info" | "warning" | "critical"'.
src/engines/LatheTribalIntegrationEngine.ts(1006,7): error TS2322: Type '("negative" | "positive" | "constraint" | LatheMaterialIso | LatheOperationType | undefined)[]' is not assignable to type 'string[]'.
src/engines/LatheTribalIntegrationEngine.ts(1007,19): error TS2677: A type predicate's type must be assignable to its parameter's type.
src/engines/LatheTurningFeatureRecognizerEngine.ts(267,7): error TS2322: Type 'boolean | undefined' is not assignable to type 'boolean'.
src/engines/LatheTurningFeatureRecognizerEngine.ts(320,7): error TS2322: Type 'boolean | undefined' is not assignable to type 'boolean'.
src/engines/TurningInsertLifeEngine.ts(248,69): error TS2554: Expected 3 arguments, but got 4.
src/engines/TurningInsertLifeEngine.ts(437,75): error TS2554: Expected 3 arguments, but got 4.
src/engines/TurningInsertLifeEngine.ts(451,65): error TS2554: Expected 3 arguments, but got 4.
src/engines/TurningInsertLifeEngine.ts(465,72): error TS2554: Expected 3 arguments, but got 4.
src/engines/TurningStochasticPlanEngine.ts(92,45): error TS2339: Property 'insertChangeSchedule' does not exist on type 'TurningInsertLifeEngine'.
src/engines/TurningStochasticPlanEngine.ts(97,48): error TS2339: Property 'wearAccumulation' does not exist on type 'TurningInsertLifeEngine'.
src/engines/VendorTurningCatalogExtractorEngine.ts(395,13): error TS2367: This comparison appears to be unintentional because the types '"roughing" | "finishing" | "medium"' and '"universal"' have no overlap.
src/hooks/HyperMillTurningHooks.ts(176,3): error TS2322: Type '"quality"' is not assignable to type 'HookCategory'.
src/hooks/LatheSafetyHooks.ts(199,3): error TS2322: Type '"quality"' is not assignable to type 'HookCategory'.
src/hooks/LatheSafetyHooks.ts(234,3): error TS2322: Type '"quality"' is not assignable to type 'HookCategory'.
src/hooks/LatheSafetyHooks.ts(269,3): error TS2322: Type '"quality"' is not assignable to type 'HookCategory'.
src/hooks/LatheSafetyHooks.ts(271,3): error TS2322: Type '"medium"' is not assignable to type 'HookPriority'.
```

## kilo (CAM) — 24 errors
```
src/engines/CADAdapterRegistry.ts(97,20): error TS2339: Property 'mastercamCADGeneratorAdapter' does not exist on type 'typeof import("H:/PRISM/mcp-server/src/engines/MastercamCodeGeneratorEngine")'.
src/engines/FiveAxisToolpathSynthesisEngine.ts(1211,40): error TS2353: Object literal may only specify known properties, and 'k' does not exist in type 'Vec3'.
src/engines/Fusion360CodeGeneratorEngine.ts(113,5): error TS2353: Object literal may only specify known properties, and 'notes' does not exist in type 'CADCapabilityMatrix'.
src/engines/Fusion360CodeGeneratorEngine.ts(1704,9): error TS2561: Object literal may only specify known properties, but 'output' does not exist in type 'CADExecutionResult'. Did you mean to write 'outputs'?
src/engines/Fusion360StrategyEngine.ts(334,34): error TS2339: Property 'kc1_1' does not exist on type 'Record<ISOGroup, { kc1_1: number; mc: number; }>'.
src/engines/hypermill/STEPFeatureExtractorEngine.ts(74,7): error TS2739: Type '{ face: number; step: number; pocket_rectangular: number; pocket_circular: number; pocket_freeform: number; contour_2d: number; contour_3d: number; slot_through: number; slot_blind: number; ... 11 more ...; thread_external: number; }' is missing the following properties from type 'Record<FeatureType, number>': thread_internal, pocket_complex, slot_dovetail, slot_t_shaped
src/engines/hypermill/STEPFeatureExtractorEngine.ts(106,7): error TS2739: Type '{ face: { type: "face_mill"; diamFactor: number; }; step: { type: "endmill_flat"; diamFactor: number; }; pocket_rectangular: { type: "endmill_flat"; diamFactor: number; }; pocket_circular: { type: "endmill_flat"; diamFactor: number; }; ... 16 more ...; thread_external: { ...; }; }' is missing the following properties from type 'Record<FeatureType, { type: "other" | "drill" | "reamer" | "tap" | "thread_mill" | "boring_bar" | "chamfer_mill" | "probe" | "face_mill" | "insert" | "endmill_flat" | "endmill_ball" | "endmill_torus"; diamFactor: number; }>': thread_internal, pocket_complex, slot_dovetail, slot_t_shaped
src/engines/hypermill/STEPFeatureExtractorEngine.ts(131,7): error TS2739: Type '{ face: string; step: string; pocket_rectangular: string; pocket_circular: string; pocket_freeform: string; contour_2d: string; contour_3d: string; slot_through: string; slot_blind: string; ... 11 more ...; thread_external: string; }' is missing the following properties from type 'Record<FeatureType, string>': thread_internal, pocket_complex, slot_dovetail, slot_t_shaped
src/engines/HyperMillAIOrchestrationEngine.ts(260,57): error TS2339: Property 'getPhysicsProfile' does not exist on type 'HyperMillMaterialBridgeEngine'.
src/engines/HyperMillAIOrchestrationEngine.ts(295,37): error TS2339: Property 'cutting_parameters' does not exist on type 'StrategySelectionResult'.
src/engines/HyperMillAIOrchestrationEngine.ts(296,39): error TS2339: Property 'cutting_parameters' does not exist on type 'StrategySelectionResult'.
src/engines/HyperMillResourceIndexEngine.ts(179,7): error TS2322: Type 'Dirent<string>[]' is not assignable to type 'Dirent<NonSharedBuffer>[]'.
src/engines/HyperMillSurfaceIntegrityBridge.ts(467,19): error TS2339: Property 'maxSafeVc_m_min' does not exist on type 'WhiteLayerThreshold'.
src/engines/HyperMillSurfaceIntegrityBridge.ts(471,63): error TS2339: Property 'description' does not exist on type 'WhiteLayerThreshold'.
src/engines/IntelligentSequencingAdapter.ts(50,8): error TS2724: '"./IntelligentSequencingEngine.js"' has no exported member named 'SequenceResult'. Did you mean 'SequencingResult'?
src/engines/MastercamAIOrchestrationEngine.ts(247,9): error TS2322: Type '"slot" | "steep_wall" | "freeform_surface" | "deep_cavity" | "flat_area" | "open_pocket" | "closed_pocket"' is not assignable to type 'MastercamFeatureType'.
src/engines/MastercamAIOrchestrationEngine.ts(249,9): error TS2322: Type '"mill_turn" | "5axis_mill" | "3axis_mill" | "5axis_table_head" | "4axis_mill"' is not assignable to type 'MastercamMachineType'.
src/engines/MastercamCodeGeneratorEngine.ts(167,5): error TS2353: Object literal may only specify known properties, and 'notes' does not exist in type 'CADCapabilityMatrix'.
src/engines/MastercamCodeGeneratorEngine.ts(501,20): error TS2352: Conversion of type 'string | number | boolean | readonly string[] | readonly number[] | null | undefined' to type 'number[][]' may be a mistake because neither type sufficiently overlaps with the other. If this was intentional, convert the expression to 'unknown' first.
src/engines/MastercamEDMBridge.ts(102,12): error TS2678: Type '"micro_hole"' is not comparable to type '"through_pocket" | "open_contour" | "closed_contour_no_core" | "tapered_contour" | "uv_xy_pair" | "blind_cavity" | "rib_burn"'.
src/engines/MastercamProbingBridge.ts(277,29): error TS2339: Property 'boss' does not exist on type '{ single_point_z: string; bore: string; tool_length: string; tool_breakage: string; }'.
src/engines/MastercamProbingBridge.ts(281,29): error TS2339: Property 'web' does not exist on type '{ single_point_z: string; bore: string; tool_length: string; tool_breakage: string; }'.
src/engines/MastercamProbingBridge.ts(372,5): error TS2322: Type '{ feature_id: string; nominal: number; measured: number; deviation: number; in_tolerance: boolean; action_taken: "none" | "alarm" | "skip" | "update_wcs" | "update_tool" | "alarmed"; timestamp: string; }[]' is not assignable to type 'ProbeVerificationResult[]'.
src/hooks/HyperMillTurningHooks.ts(176,3): error TS2322: Type '"quality"' is not assignable to type 'HookCategory'.
```

## oscar (Speed-Feed) — 30 errors
```
src/algorithms/KienzleForceModel.ts(222,23): error TS7053: Element implicitly has an 'any' type because expression of type 'string' can't be used to index type 'Record<ISOGroup, { kc1_1: number; mc: number; }>'.
src/engines/LatheSpeedFeedReasoningBridgeEngine.ts(282,9): error TS2322: Type 'string' is not assignable to type '"roughing" | "finishing" | "semi_finishing" | "drilling" | "boring" | "grooving" | "parting" | "threading"'.
src/engines/LatheSpeedFeedReasoningBridgeEngine.ts(297,9): error TS2322: Type 'string' is not assignable to type '"balanced" | "conservative" | "aggressive" | "maximum_mrr" | undefined'.
src/engines/LatheSpeedFeedReasoningBridgeEngine.ts(302,9): error TS2322: Type 'string' is not assignable to type '"flood" | "mist" | "dry" | "cryogenic" | "high_pressure" | undefined'.
src/engines/LatheSpeedFeedReasoningBridgeEngine.ts(517,11): error TS2739: Type '{ vc_min: number; vc_max: number; feed_min: number; feed_max: number; }' is missing the following properties from type 'SpeedFeedBand': doc_min, doc_max
src/engines/MachineAwareSpeedFeedEngine.ts(417,47): error TS2339: Property 'executeById' does not exist on type 'HookExecutorEngine'.
src/engines/SpeedFeedAdvancedAIEngine.ts(330,19): error TS7053: Element implicitly has an 'any' type because expression of type 'string' can't be used to index type 'Record<ISOGroup, { kc1_1: number; mc: number; }>'.
src/engines/SpeedFeedAdvancedAIEngine.ts(331,18): error TS7053: Element implicitly has an 'any' type because expression of type 'string' can't be used to index type 'Record<ISOGroup, { C: number; n: number; }>'.
src/engines/SpeedFeedExhaustiveCombinationEngine.ts(329,42): error TS2322: Type '"cat40" | "hsk63" | "er32"' is not assignable to type 'ToolHolderType | undefined'.
src/engines/SpeedFeedExhaustiveCombinationEngine.ts(331,73): error TS2322: Type '"adaptive" | "climb" | "conventional"' is not assignable to type '"adaptive" | "hsm" | "conventional" | "slot" | "plunge" | "trochoidal" | "hpc" | undefined'.
src/engines/SpeedFeedNineAxisOrchestratorEngine.ts(960,36): error TS2538: Type 'undefined' cannot be used as an index type.
src/engines/SpeedFeedNineAxisOrchestratorEngine.ts(1239,34): error TS18047: 'current_cost_per_part_usd' is possibly 'null'.
src/engines/SpeedFeedNineAxisOrchestratorEngine.ts(1242,49): error TS18047: 'current_cost_per_part_usd' is possibly 'null'.
src/engines/SpeedFeedNineAxisOrchestratorEngine.ts(1253,34): error TS18047: 'current_cost_per_part_usd' is possibly 'null'.
src/engines/SpeedFeedNineAxisOrchestratorEngine.ts(1256,49): error TS18047: 'current_cost_per_part_usd' is possibly 'null'.
src/engines/SpeedFeedNineAxisOrchestratorEngine.ts(1267,34): error TS18047: 'current_cost_per_part_usd' is possibly 'null'.
src/engines/SpeedFeedNineAxisOrchestratorEngine.ts(1270,49): error TS18047: 'current_cost_per_part_usd' is possibly 'null'.
src/engines/SpeedFeedNineAxisOrchestratorEngine.ts(1280,34): error TS18047: 'current_cost_per_part_usd' is possibly 'null'.
src/engines/SpeedFeedNineAxisOrchestratorEngine.ts(1283,51): error TS18047: 'current_cost_per_part_usd' is possibly 'null'.
src/engines/SpeedFeedNineAxisOrchestratorEngine.ts(1293,34): error TS18047: 'current_cost_per_part_usd' is possibly 'null'.
src/engines/SpeedFeedNineAxisOrchestratorEngine.ts(1296,51): error TS18047: 'current_cost_per_part_usd' is possibly 'null'.
src/engines/SpeedFeedNineAxisOrchestratorEngine.ts(1306,40): error TS2345: Argument of type 'number | null' is not assignable to parameter of type 'number'.
src/engines/SpeedFeedNineAxisOrchestratorEngine.ts(1413,5): error TS2741: Property 'part_volume_cm3' is missing in type '{ machine: { name: string; kinematics: MachineKinematics; work_envelope_mm: { x: number; y: number; z: number; }; build_quality: BuildQuality; way_type: WayType; ... 9 more ...; max_feed_mmmin: number; }; ... 7 more ...; toolpath: { ...; }; }' but required in type 'Required<Omit<NineAxisInput, "mode" | "batch_size" | "tool_library">>'.
src/engines/SpeedFeedPropagationBridgeEngine.ts(284,42): error TS2538: Type 'undefined' cannot be used as an index type.
src/engines/SpeedFeedPropagationBridgeEngine.ts(335,7): error TS2322: Type 'number | undefined' is not assignable to type 'number'.
src/engines/SpeedFeedPropagationBridgeEngine.ts(336,7): error TS2322: Type 'string | undefined' is not assignable to type 'string'.
src/engines/SpeedFeedPropagationBridgeEngine.ts(337,7): error TS2322: Type 'string | undefined' is not assignable to type 'string'.
src/engines/SpeedFeedPropagationBridgeEngine.ts(339,7): error TS2322: Type 'string | undefined' is not assignable to type 'string'.
src/engines/SpeedFeedPropagationBridgeEngine.ts(372,7): error TS2322: Type 'string | undefined' is not assignable to type 'string'.
src/engines/SpeedFeedUltimateAIEngine.ts(1168,18): error TS7053: Element implicitly has an 'any' type because expression of type 'string' can't be used to index type 'Record<ISOGroup, { C: number; n: number; }>'.
```

## hotel (Business) — 21 errors
```
src/algorithms/RANSACHyperplane.ts(148,11): error TS2322: Type 'number' is not assignable to type '0 | 1'.
src/algorithms/RANSACHyperplane.ts(149,11): error TS2322: Type 'number' is not assignable to type '0 | 1'.
src/algorithms/RANSACHyperplane.ts(286,7): error TS2322: Type '"spatial"' is not assignable to type '"optimization" | "physics" | "vibration" | "power" | "tool_life" | "force" | "thermal" | "stability" | "wear" | "control" | "surface" | "geometry" | "dynamics" | "numerical" | ... 7 more ... | undefined'.
src/engines/CADParameterPredictorEngine.ts(140,7): error TS2739: Type '{ through_hole: ("hole_depth_mm" | "hole_diameter_mm")[]; blind_hole: ("hole_depth_mm" | "hole_diameter_mm")[]; counterbore: ("counterbore_diameter_mm" | "counterbore_depth_mm" | "hole_depth_mm" | "hole_diameter_mm")[]; ... 17 more ...; contour_3d: ("extrusion_depth_mm" | "fillet_radius_mm")[]; }' is missing the following properties from type 'Record<FeatureType, PredictableParam[]>': thread_internal, pocket_complex, slot_dovetail, slot_t_shaped
src/engines/ERPIntegrationEngine.ts(112,27): error TS18048: 'mat' is possibly 'undefined'.
src/engines/ERPIntegrationEngine.ts(112,48): error TS18048: 'mat' is possibly 'undefined'.
src/engines/LatheMasterPostSelfAwarenessEngine.ts(519,28): error TS2345: Argument of type '{ id: string; name: string; dialect: "generic"; }' is not assignable to parameter of type '{ id: string; name: string; dialect: "fanuc" | "haas" | "okuma" | "mitsubishi" | "mazak" | "generic" | "citizen"; version: string; machineIds: string[]; features?: { cssSupport: boolean; cannedCycles: string[]; ... 6 more ...; partCatcher: boolean; } | undefined; }'.
src/engines/MultiERPConnectorEngine.ts(267,45): error TS18048: 'resolved' is possibly 'undefined'.
src/engines/OSHA300LogEngine.ts(223,7): error TS7053: Element implicitly has an 'any' type because expression of type 'any' can't be used to index type 'Record<IncidentNature, number>'.
src/engines/ProcessIntelligenceRouterEngine.ts(40,66): error TS2307: Cannot find module './CrossProcessSpeedFeedBridge.js' or its corresponding type declarations.
src/engines/ProcessIntelligenceRouterEngine.ts(44,8): error TS2307: Cannot find module './CrossProcessPostBridge.js' or its corresponding type declarations.
src/engines/ProcessIntelligenceRouterEngine.ts(45,62): error TS2307: Cannot find module './CrossProcessFeatureBridge.js' or its corresponding type declarations.
src/engines/ProcessIntelligenceRouterEngine.ts(301,62): error TS2307: Cannot find module './CrossProcessFeatureBridge.js' or its corresponding type declarations.
src/engines/ProcessIntelligenceRouterEngine.ts(322,13): error TS2307: Cannot find module './CrossProcessSpeedFeedBridge.js' or its corresponding type declarations.
src/engines/ProcessIntelligenceRouterEngine.ts(343,59): error TS2307: Cannot find module './CrossProcessPostBridge.js' or its corresponding type declarations.
src/engines/RealTimeFinancialSnapshotEngine.ts(157,45): error TS2551: Property 'top_5_share_pct' does not exist on type 'RevenueConcentration'. Did you mean 'top5_share_pct'?
src/engines/RealTimeFinancialSnapshotEngine.ts(158,28): error TS2551: Property 'concentration_risk_grade' does not exist on type 'RevenueConcentration'. Did you mean 'concentration_risk'?
src/engines/RealTimeFinancialSnapshotEngine.ts(180,53): error TS2339: Property 'revenue' does not exist on type 'IncomeStatement'.
src/engines/RealTimeFinancialSnapshotEngine.ts(181,53): error TS2339: Property 'cogs' does not exist on type 'IncomeStatement'.
src/engines/RealTimeFinancialSnapshotEngine.ts(192,28): error TS2339: Property 'revenue' does not exist on type 'IncomeStatement'.
src/engines/RealTimeFinancialSnapshotEngine.ts(193,25): error TS2339: Property 'cogs' does not exist on type 'IncomeStatement'.
```

## foxtrot (Mill) — 15 errors
```
src/engines/MillingDeepAIHardeningEngine.ts(1412,11): error TS2741: Property 'steep_wall' is missing in type '{ closed_pocket: "2d_milling"; open_pocket: "2d_milling"; slot_through: "2d_milling"; slot_blind: "2d_milling"; hole_through: "drilling"; hole_blind: "drilling"; threaded_hole: "thread_milling"; ... 13 more ...; ruled_surface: "5axis_simultaneous"; }' but required in type 'Record<HyperMillFeatureType, HyperMillStrategyCategory>'.
src/engines/MillingPhysicsKernelEngine.ts(924,53): error TS2345: Argument of type '{ tool_diameter_mm: number; tool_overhang_mm: number; cutting_force_N: number; force_direction?: "radial" | "axial" | "tangential" | undefined; tool_material?: "ceramic" | "carbide" | ... 4 more ... | undefined; ... 4 more ...; tolerance_target_mm?: number | undefined; }' is not assignable to parameter of type 'ToolDeflectionInput'.
src/engines/MillingPhysicsKernelEngine.ts(997,49): error TS2345: Argument of type '{ segments: { fz: number; stepover_mm: number; cusp_angle_deg?: number | undefined; surface_speed_mpm?: number | undefined; inclination_deg?: number | undefined; }[]; tool: { corner_radius_mm: number; ball_radius_mm?: number | undefined; edge_radius_um?: number | undefined; flute_count?: number | undefined; }; algor...' is not assignable to parameter of type 'SurfaceFinishInput'.
src/engines/MillingPhysicsKernelEngine.ts(1091,62): error TS2339: Property 'fosmTaylor' does not exist on type 'StochasticToolWearEngine'.
src/engines/MillingPhysicsKernelEngine.ts(1144,62): error TS2554: Expected 3 arguments, but got 1.
src/engines/MillingPhysicsKernelEngine.ts(1145,62): error TS2554: Expected 3 arguments, but got 1.
src/engines/MillingPhysicsKernelEngine.ts(1146,62): error TS2554: Expected 2 arguments, but got 1.
src/engines/MillingPhysicsKernelEngine.ts(1227,74): error TS2554: Expected 3 arguments, but got 5.
src/engines/MillingPhysicsKernelEngine.ts(1229,61): error TS2554: Expected 2 arguments, but got 4.
src/engines/MillingPhysicsKernelEngine.ts(1351,67): error TS2554: Expected 2 arguments, but got 6.
src/engines/MillingPhysicsKernelEngine.ts(1492,61): error TS2554: Expected 3-7 arguments, but got 1.
src/engines/MillingUltimateAIEngine.ts(1171,72): error TS18048: 'context.max_cycle_time_min' is possibly 'undefined'.
src/engines/MillingUltimateAIEngine.ts(1176,78): error TS18048: 'context.surface_finish_ra' is possibly 'undefined'.
src/engines/MillProgramLearningEngine.ts(266,37): error TS2345: Argument of type '{ category: "hsm"; material: string; title: string; body: string; confidence: number; source: string; } | { category: "hardened_material"; material: string; title: string; body: string; confidence: number; source: string; } | { ...; } | { ...; }' is not assignable to parameter of type 'TribalTip'.
src/hooks/HyperMillTurningHooks.ts(176,3): error TS2322: Type '"quality"' is not assignable to type 'HookCategory'.
```

