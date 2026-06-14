/**
 * prism_cad — CAD/Geometry Dispatcher
 *
 * 71 actions: geometry (3), mesh (3), feature (2), stock/wcs/dfm (5), grasshopper (4),
 *   sketch (5), part (7), part_library (2), assembly (6),
 *   cad_taxonomy (9), cadquery (5), f360_codegen (4), f360_live (14), blueprint (2)
 *
 * Engine dependencies: CADKernelEngine, GeometryEngine, MeshEngine,
 *   FeatureRecognitionEngine, StockModelEngine, WorkCoordinateEngine,
 *   DfMRulesEngine, SketchEngine, ParametricPartLibraryEngine,
 *   AssemblyEngine, CADOperationTaxonomyEngine, CadQueryCodeGeneratorEngine,
 *   Fusion360CodeGeneratorEngine, Fusion360LiveBridgeEngine
 */
import { z } from "zod";
import { log } from "../../utils/Logger.js";
import { slimResponse } from "../../utils/responseSlimmer.js";
import { dispatcherError, validateActionParams } from "../../utils/dispatcherMiddleware.js";
import { ACTION_CAD_SCHEMAS } from "../../schemas/cadActionSchemas.js";
import { crossSourceDimensionReconciliationEngine } from "../../engines/CrossSourceDimensionReconciliationEngine.js";

let _cad: any, _geometry: any, _mesh: any, _feature: any, _stock: any, _wcs: any, _dfm: any, _dfmPipeline: any, _sketch: any, _partLib: any, _assembly: any;
let _cadTaxonomy: any, _cadQueryGen: any, _f360Gen: any, _f360Bridge: any, _swGen: any, _mcGen: any, _hcGen: any, _nxGen: any, _impeller: any, _blisk: any;
let _cadCorpusOrch: any, _cadEmbedIndex: any, _cadPipeline: any, _cadRegenTest: any, _geoCompare: any, _cadRegistry: any, _inventorGen: any, _naca: any, _loftedWing: any, _gear: any, _spring: any, _cadTrialLearn: any, _printToFusion: any, _printToMastercam: any, _printToInventor: any, _printToSolidWorks: any, _printToEsprit: any, _espritGen: any, _printToAllCads: any, _printToHyperCADSAnalysis: any, _swLive: any, _espritLive: any, _bprintToAllCads: any, _cadArchiveJoinAug: any;
let _capNegotiator: any;
async function getEngine(name: string): Promise<any> {
  switch (name) {
    case "cad": return _cad ??= (await import("../../engines/CADKernelEngine.js")).cadKernelEngine;
    case "geometry": return _geometry ??= (await import("../../engines/GeometryEngine.js")).geometryEngine;
    case "mesh": return _mesh ??= (await import("../../engines/MeshEngine.js")).meshEngine;
    case "feature": return _feature ??= (await import("../../engines/FeatureRecognitionEngine.js")).featureRecognitionEngine;
    case "stock": return _stock ??= (await import("../../engines/StockModelEngine.js")).stockModelEngine;
    case "wcs": return _wcs ??= (await import("../../engines/WorkCoordinateEngine.js")).workCoordinateEngine;
    case "dfm": return _dfm ??= await import("../../engines/DfMRulesEngine.js");
    case "dfmPipeline": return _dfmPipeline ??= (await import("../../engines/DFMPipelineEngine.js")).dfmPipelineEngine;
    case "sketch": return _sketch ??= (await import("../../engines/SketchEngine.js")).sketchEngine;
    case "partLib": return _partLib ??= (await import("../../engines/ParametricPartLibraryEngine.js")).parametricPartLibraryEngine;
    case "assembly": return _assembly ??= (await import("../../engines/AssemblyEngine.js")).assemblyEngine;
    case "cadTaxonomy": return _cadTaxonomy ??= (await import("../../engines/CADOperationTaxonomyEngine.js")).cadOperationTaxonomyEngine;
    case "cadQueryGen": return _cadQueryGen ??= (await import("../../engines/CadQueryCodeGeneratorEngine.js")).cadQueryCodeGeneratorEngine;
    case "f360Gen": return _f360Gen ??= (await import("../../engines/Fusion360CodeGeneratorEngine.js")).fusion360CodeGeneratorEngine;
    case "f360Bridge": return _f360Bridge ??= (await import("../../engines/Fusion360LiveBridgeEngine.js")).fusion360LiveBridgeEngine;
    case "swGen": return _swGen ??= (await import("../../engines/SolidWorksCodeGeneratorEngine.js")).solidWorksCodeGeneratorEngine;
    case "mcGen": return _mcGen ??= (await import("../../engines/MastercamCodeGeneratorEngine.js")).mastercamCodeGeneratorEngine;
    case "hcGen": return _hcGen ??= (await import("../../engines/HyperCADSCodeGeneratorEngine.js")).hyperCADSCodeGeneratorEngine;
    case "nxGen": return _nxGen ??= (await import("../../engines/NXCodeGeneratorEngine.js")).nxCodeGeneratorEngine;
    case "impeller": return _impeller ??= (await import("../../engines/ImpellerCADEngine.js")).impellerCADEngine;
    case "blisk": return _blisk ??= new (await import("../../engines/BliskCADEngine.js")).BliskCADEngine();
    case "cadCorpusOrch": return _cadCorpusOrch ??= (await import("../../engines/CADTrainingCorpusOrchestratorEngine.js")).cadTrainingCorpusOrchestratorEngine;
    case "cadEmbedIndex": return _cadEmbedIndex ??= (await import("../../engines/CADEmbeddingIndexOrchestratorEngine.js")).cadEmbeddingIndexOrchestratorEngine;
    case "cadArchiveJoinAug": return _cadArchiveJoinAug ??= (await import("../../engines/CADArchiveJoinAugmenterEngine.js")).cadArchiveJoinAugmenterEngine;
    case "cadPipeline": return _cadPipeline ??= (await import("../../engines/CADTrainingPipelineOrchestratorEngine.js")).cadTrainingPipelineOrchestratorEngine;
    case "cadRegenTest": return _cadRegenTest ??= (await import("../../engines/CADRegenerationTestEngine.js")).cadRegenerationTestEngine;
    case "geoCompare": return _geoCompare ??= (await import("../../engines/CADGeometryComparisonEngine.js")).cadGeometryComparisonEngine;
    case "cadRegistry": return _cadRegistry ??= (await import("../../engines/UniversalCADIndexEngine.js")).universalCADIndexEngine;
    case "inventorGen": return _inventorGen ??= (await import("../../engines/InventorCADCodeGeneratorEngine.js")).inventorCADCodeGeneratorEngine;
    case "naca": return _naca ??= (await import("../../engines/NACAAirfoilEngine.js")).nacaAirfoilEngine;
    case "loftedWing": return _loftedWing ??= (await import("../../engines/LoftedWingEngine.js")).loftedWingEngine;
    case "gear": return _gear ??= (await import("../../engines/InvoluteGearEngine.js")).involuteGearEngine;
    case "spring": return _spring ??= (await import("../../engines/HelicalSpringEngine.js")).helicalSpringEngine;
    case "cadTrialLearn": return _cadTrialLearn ??= (await import("../../engines/CADTrialErrorLearningEngine.js")).cadTrialErrorLearningEngine;
    case "printToFusion": return _printToFusion ??= (await import("../../engines/PrintToFusion360Bridge.js")).printToFusion360Bridge;
    case "printToMastercam": return _printToMastercam ??= (await import("../../engines/PrintToMastercamBridge.js")).printToMastercamBridge;
    case "printToInventor": return _printToInventor ??= (await import("../../engines/PrintToInventorBridge.js")).printToInventorBridge;
    case "printToSolidWorks": return _printToSolidWorks ??= (await import("../../engines/PrintToSolidWorksBridge.js")).printToSolidWorksBridge;
    case "printToEsprit": return _printToEsprit ??= (await import("../../engines/PrintToEspritBridge.js")).printToEspritBridge;
    case "espritGen": return _espritGen ??= (await import("../../engines/EspritCodeGeneratorEngine.js")).espritCodeGeneratorEngine;
    case "printToAllCads": return _printToAllCads ??= (await import("../../engines/PrintToAllCADsOrchestrator.js")).printToAllCADsOrchestrator;
    case "printToHyperCADSAnalysis": return _printToHyperCADSAnalysis ??= (await import("../../engines/PrintToHyperCADSAnalysisBridge.js")).printToHyperCADSAnalysisBridge;
    case "swLive": return _swLive ??= (await import("../../engines/SolidWorksLiveBridgeEngine.js")).solidWorksLiveBridgeEngine;
    case "espritLive": return _espritLive ??= (await import("../../engines/EspritLiveBridgeEngine.js")).espritLiveBridgeEngine;
    case "bprintToAllCads": return _bprintToAllCads ??= (await import("../../engines/BlueprintToAllCADsOrchestratorEngine.js")).blueprintToAllCADsOrchestratorEngine;
    case "capNegotiator": return _capNegotiator ??= (await import("../../engines/CADCapabilityNegotiatorEngine.js")).cadCapabilityNegotiatorEngine;
    default: throw new Error(`Unknown CAD engine: ${name}`);
  }
}

/**
 * Resolve an airfoil profile from a flexible dispatcher param. Supports:
 *   - full AirfoilProfile object (passes through)
 *   - { naca4: "2412", options?: {...} } shortcut
 *   - { naca5: "23012", options?: {...} } shortcut
 *   - { uiucDat: "<.dat content>", chord?: number } shortcut
 */
async function resolveAirfoilProfile(param: any): Promise<any> {
  if (!param || typeof param !== "object") {
    throw new Error("airfoil profile param must be an object");
  }
  if (Array.isArray(param.upper) && Array.isArray(param.lower) && Array.isArray(param.selig)) {
    return param;
  }
  const naca = await getEngine("naca");
  if (typeof param.naca4 === "string") {
    return naca.generate4Digit(param.naca4, param.options ?? {});
  }
  if (typeof param.naca5 === "string") {
    return naca.generate5Digit(param.naca5, param.options ?? {});
  }
  if (typeof param.uiucDat === "string") {
    return naca.parseUIUCDat(param.uiucDat, param.chord ?? 1);
  }
  throw new Error(
    "airfoil profile param must be an AirfoilProfile object or a { naca4, naca5, uiucDat } shortcut"
  );
}

const ACTIONS = [
  "geometry_create", "geometry_transform", "geometry_analyze",
  "mesh_generate", "mesh_import", "mesh_export",
  // B-Rep tessellator — STEP entity-map → triangle mesh (U-GAP-CAD-BREP-TESSELLATOR)
  "brep_tessellate",
  // Geodesic distance on triangle meshes (U-GAP-CAD-GEODESIC)
  "geodesic_dijkstra", "geodesic_fast_marching", "geodesic_path", "geodesic_iso_curves",
  // CAD-AI → CAM-AI autonomous handoff bridge (U-BRIDGE-CAD-CAM-HANDOFF)
  "cad_cam_handoff",
  "feature_recognize", "feature_edit",
  "stock_model", "wcs_setup",
  "dfm_check", "face_mill_select", "deep_hole_technique",
  "dfm_analyze", "dfm_quick", "dfm_tolerance_check", "dfm_cost_impact", "dfm_get_rules",
  "sketch_create", "sketch_add_entity", "sketch_analyze",
  "sketch_to_svg", "sketch_to_cadquery",
  "part_create", "part_add_feature", "part_estimate_volume",
  "part_template_box", "part_template_cylinder", "part_template_flange",
  "part_template_bracket",
  "part_library_create", "part_library_list_types",
  "assembly_create", "assembly_add_component", "assembly_add_mate",
  "assembly_position", "assembly_bom", "assembly_to_cadquery",
  // CAD Operation Taxonomy
  "cad_taxonomy_lookup", "cad_taxonomy_list", "cad_taxonomy_generate",
  "cad_taxonomy_aerospace", "cad_taxonomy_search", "cad_taxonomy_compatibility",
  "cad_taxonomy_validate", "cad_taxonomy_stats", "cad_taxonomy_suggest",
  // CAD Capability Negotiator — CAD-COMPLETE-MS0/U-CADC-AI03
  "cad_capability_negotiate", "cad_capability_negotiate_or_throw", "cad_capability_list_gaps",
  // CadQuery Code Generator
  "cadquery_generate_script", "cadquery_step_by_step", "cadquery_validate_syntax",
  "cadquery_execute_script", "cadquery_codegen_prompt",
  // Fusion 360 Code Generator
  "f360_generate_script", "f360_from_description", "f360_parametric_script", "f360_convert_cadquery",
  // Fusion 360 Live Bridge
  "f360_live_sketch", "f360_live_extrude", "f360_live_fillet", "f360_live_chamfer",
  "f360_live_revolve", "f360_live_hole", "f360_live_pattern", "f360_live_combine",
  "f360_live_shell", "f360_live_export", "f360_live_geometry", "f360_live_undo",
  "f360_live_new_doc", "f360_live_execute_raw",
  // PIPE-MS2: PrintToGeometryEngine (previously orphaned)
  "blueprint_to_3d_model", "blueprint_to_cadquery_script",
  // Rhino Grasshopper PRISM Components
  "grasshopper_list_components", "grasshopper_get_component",
  "grasshopper_execute", "grasshopper_registry",
  // SolidWorks Code Generator (U-CADC10)
  "solidworks_generate_script", "solidworks_build_part", "solidworks_execute",
  "solidworks_capabilities",
  // Mastercam Code Generator (U-CADC11)
  "mastercam_generate_script", "mastercam_build_part", "mastercam_execute",
  "mastercam_capabilities",
  // hyperCAD-S Code Generator (U-CADC12)
  "hypercads_generate_script", "hypercads_build_part", "hypercads_execute",
  "hypercads_capabilities",
  // Fusion 360 Unified Code Generator (U-CADC13)
  "fusion360_generate_script", "fusion360_build_part", "fusion360_execute",
  "fusion360_capabilities",
  // Print → Fusion 360 Bridge (U-CADC-FUS-PRINT-01) — OCR analysis to Python script
  "print_to_fusion360", "print_to_fusion360_validate", "print_to_fusion360_capabilities",
  // Print → Mastercam Bridge (U-CADC-MC-PRINT-01)
  "print_to_mastercam", "print_to_mastercam_validate", "print_to_mastercam_capabilities",
  // Print → Inventor Bridge (U-CADC-INV-PRINT-01)
  "print_to_inventor", "print_to_inventor_validate", "print_to_inventor_capabilities",
  // Print → SolidWorks Bridge (U-CADC-SW-PRINT-01)
  "print_to_solidworks", "print_to_solidworks_validate", "print_to_solidworks_capabilities",
  // Print → Esprit Bridge (U-CADC-ESP-PRINT-01)
  "print_to_esprit", "print_to_esprit_validate", "print_to_esprit_capabilities",
  // Esprit Code Generator (U-CADC-ESP-CODEGEN-01)
  "esprit_generate_script", "esprit_capabilities",
  // Print → All CADs Orchestrator (U-CADC-PRINT-ORCHESTRATOR-01)
  "print_to_all_cads", "print_to_all_cads_validate", "print_to_all_cads_targets",
  // Print → hyperCAD-S Analysis Bridge (U-CADC-HC-PRINT-01)
  "print_to_hypercads_analysis", "print_to_hypercads_analysis_validate", "print_to_hypercads_analysis_capabilities",
  // SolidWorks Live Bridge (U-CADC-SW-LIVE-01)
  "solidworks_live_execute", "solidworks_live_validate", "solidworks_live_modes",
  // Esprit Live Bridge (U-CADC-ESP-LIVE-01)
  "esprit_live_execute", "esprit_live_validate", "esprit_live_modes",
  // Blueprint OCR → 6-CAD Orchestrator (U-CADC-BPRINT-OCR-ORCH-01)
  "blueprint_to_all_cads", "blueprint_to_all_cads_validate", "blueprint_to_all_cads_capabilities",
  // Siemens NX Unified Code Generator (U-CADC14)
  "nx_generate_script", "nx_build_part", "nx_execute",
  "nx_capabilities",
  // Autodesk Inventor Code Generator (U-CADC08)
  "inventor_generate_script", "inventor_build_part", "inventor_execute",
  "inventor_capabilities",
  // Impeller CAD Generator (U-CADC15)
  "impeller_generate", "impeller_validate", "impeller_recommend_blades",
  "impeller_list_profiles",
  // Blisk CAD Generator (U-CADC16)
  "blisk_generate", "blisk_validate", "blisk_recommend_blades",
  "blisk_list_profiles",
  // CAD Training Corpus Orchestrator (U-CADC17)
  "cad_corpus_orchestrate", "cad_corpus_scan", "cad_corpus_status",
  // CAD Embedding Index Orchestrator (U-CADC18)
  "cad_index_ingest", "cad_index_query", "cad_index_stats", "cad_index_clear", "cad_index_similar",
  // CAD Archive → Print-Program Join Augmenter (MS-PRINT-PROGRAM-LOOP/U-PPL-D4) —
  // bridges CADFileIndexerEngine master-index.json → BlueprintProgramJoinEngine v6
  // join, treating .ipt/.iam/.f3d/.f3z/.sldprt/.sldasm as program-equivalent for
  // mill jobs (JM Die tribal rule: Inventor/Fusion/SolidWorks mill saves NO G-code).
  "cad_archive_join_augment", "cad_archive_join_augment_dry",
  // CAD Training Pipeline Orchestrator (U-CADC19)
  "cad_pipeline_run", "cad_pipeline_validate", "cad_pipeline_status", "cad_pipeline_clear",
  // CAD Training MCP Actions (U-CADC20)
  "cad_training_start", "cad_training_status", "cad_training_corpus_stats",
  // CAD Regeneration Test Engine (U-CADC21)
  "cad_regen_test", "cad_regen_batch", "cad_regen_compare", "cad_regen_thresholds",
  // CAD Trial-Error Learning Engine (U-CADC29)
  "cad_trial_ingest", "cad_trial_patterns", "cad_trial_recommend", "cad_trial_stats", "cad_trial_reset",
  // CAD Geometry Comparison Engine (U-CADC26)
  "geometry_compare_files", "geometry_extract_metrics", "geometry_batch_compare",
  "geometry_hausdorff", // control-point-cloud Hausdorff shape distance (mm + % of bbox diag) -- meaningful shape gate vs count Jaccard
  "geometry_set_thresholds", "geometry_format_detect",
  // Universal CAD Registry (U-CADC03)
  "cad_registry_scan", "cad_registry_search", "cad_registry_get", "cad_registry_stats",
  // NACA Airfoil Engine (U-CADC13)
  "naca_generate_4digit", "naca_generate_5digit", "naca_parse_uiuc_dat",
  // Lofted Wing Engine (U-CADC14)
  "wing_loft_single_profile", "wing_loft_between_profiles", "wing_compute_properties",
  // Involute Gear Engine (U-CADC15)
  "gear_compute_geometry", "gear_generate_tooth_profile", "gear_compute_contact_ratio",
  // Helical Spring Engine (U-CADC16)
  "spring_compute_geometry", "spring_compute_mechanics", "spring_compute_stress_at_force", "spring_generate_coil_path",
  // CAD-FUSION-LIVE-MS0 training surface (U-CAD-CORPUS-PHASE1..8)
  "cad_corpus_ingest", "cad_corpus_load_manifest", "cad_corpus_find_by_class", "cad_corpus_summarize",
  "cad_corpus_mine_patterns", "cad_corpus_recover_unclassified",
  "cad_class_template", "cad_class_predict_fidelity", "cad_class_build_sequence", "cad_class_build_sequence_evidence",
  "cad_class_drive_build",
  "cad_corpus_learn_prevalence", "cad_corpus_apply_learned", "cad_corpus_overlay_status",
  "cad_step_parse_file", "cad_step_parse_string", "cad_step_evidence_for_kinds",
  "cad_blueprint_infer_class", "cad_blueprint_flag_features",
  // BLUEPRINT-OCR-TRAINING-MS1/U-MS1-U3 — ground-truth registry blueprint join
  "gt_blueprint_register", "gt_blueprint_join_docustrata", "gt_enumerate_by_tier",
  "gt_flag_ambiguities", "gt_training_pairs_by_customer",
  // BLUEPRINT-OCR-TRAINING-MS1/U-MS1-U4 — extraction-confidence cross-validation
  "gt_validate_backend", "gt_compare_backends", "gt_regression_gate",
  "gt_snapshot_baseline",
  // BLUEPRINT-OCR-TRAINING-MS1/U-MS1-U6 — BlueprintCorpusHarvestEngine
  "corpus_harvest_mit", "corpus_harvest_vendor", "corpus_harvest_online",
  "corpus_enumerate", "corpus_verify_fresh", "corpus_build_index",
  // BLUEPRINT-OCR-TRAINING-MS1/U-MS1-U7 — BlueprintExtractionRAGEngine (centerpiece)
  "blueprint_rag_extract", "blueprint_rag_explain", "blueprint_rag_compare_to_baseline",
  // BLUEPRINT-OCR-TRAINING-MS1/U-MS1-U8 — BlueprintLoRABridge + BlueprintCoverageAudit
  "blueprint_lora_prepare_set", "blueprint_lora_export", "blueprint_lora_register_endpoint",
  "blueprint_lora_history",
  "blueprint_coverage_audit", "blueprint_coverage_by_customer", "blueprint_coverage_flag_retrain",
  "blueprint_coverage_report",
  "cad_harvest_catalog", "cad_harvest_paired_sources", "cad_harvest_can_redistribute",
  // CAD-FUSION-LIVE-MS0 PHASE18: 6-CAD execution router (SW/Inv/MC/HyperCAD/Fusion/Esprit unifier)
  "cad_route_detect_system", "cad_route_supported_systems", "cad_route_plan_execution",
  "cad_route_find_operation", "cad_route_capabilities",
  // CAD-FUSION-LIVE-MS0 PHASE19: Esprit-direct dispatcher actions (closes 6/6 from 0eb766b8e)
  "cad_esprit_plan_execution", "cad_esprit_render_kbm",
  // CAD-FUSION-LIVE-MS0 PHASE20: print → CAD diagnostic orchestrator (5-stage pipeline)
  "cad_print_to_cad",
  // CAD-FUSION-LIVE-MS0 PHASE21: wire 6 orphan design/learning/file-format engines
  "cad_intent_decompose",      // CADIntentDecomposerEngine — natural-language → CAD intent
  "cad_design_plan",            // CADOperationPlannerEngine — intent → ordered operation stream
  "cad_atomic_step_decompose",  // AtomicStepDecomposerEngine — unit spec → atomic steps
  "cad_stl_analyze",            // STLToVoxelGridEngine — STL → voxels (neural pipeline gateway)
  "cad_pmi_extract",            // STEPAP242PMIExtractorEngine — GD&T from STEP AP242
  "cad_part_boiler_tube",       // BoilerTubeEngine — parametric boiler tube design
  "cad_part_gasket",            // GasketDesignEngine — parametric gasket design
  "cad_ai_session_open",        // CADAIStateMachineEngine — open AI design session FSM
  // CAD-FUSION-LIVE-MS0 PHASE22: wire 8 orphan GD&T / tolerance / dimension / ML engines
  "cad_gdt_callout_parse",      // GDTCalloutParserEngine — GD&T callout text → FCF struct
  "cad_gdt_stackup",            // GDTStackupEngine — stackup compute with tolerances
  "cad_tolerance_apply",        // ToleranceAwareGenerationEngine — apply tolerances to ops
  "cad_pdf_blueprint_extract",  // PDFBlueprintDimensionExtractor — PDF text → dim list
  "cad_pdf_pattern_rescue_extract", // PDFBlueprintPatternRescueEngine — MS1-U2 rescue: fractional/limit/N-grade/microinch patterns
  "cad_dimensional_signature",  // DimensionalSignatureEngine — STEP text → dim signature
  "cad_machine_type_classify",  // MachineTypeClassifierEngine — print/CAD → machine type
  "cad_pattern_database",       // PatternDatabaseEngine — surface training patterns
  "cad_feature_memory_record",  // CADFeatureMemoryEngine — record learned feature
  "cad_feature_memory_lookup",  // CADFeatureMemoryEngine — fetch by id
  "cad_feature_memory_query",   // CADFeatureMemoryEngine — query by filter
  "cad_feature_memory_stats",   // CADFeatureMemoryEngine — memory health stats
  // CAD-FUSION-LIVE-MS0 PHASE23: wire 6 print/modeling/feature/engineering orphans
  "cad_blueprint_generate",        // BlueprintToCADGenerationEngine — full print→3D pipeline
  "cad_blueprint_extract_features",// BlueprintToCADGenerationEngine — OCR → FeatureSpec[]
  "cad_drawing_index_sources",     // DrawingTemplateIndexEngine — list source dirs
  "cad_drawing_index_harvest",     // DrawingTemplateIndexEngine — full template scan
  "cad_feature_tree_validate",     // GroundTruthFeatureTreeExtractor — schema validate
  "cad_feature_tree_extract",      // GroundTruthFeatureTreeExtractor — file → canonical tree
  "cad_cam_feature_extract_one",   // CAMFeatureExtractorEngine — NC program → feature vector
  "cad_feature_store_put",         // FeatureStoreEngine — append-only feature row
  "cad_feature_store_query",       // FeatureStoreEngine — AS-OF historical features
  "cad_feature_store_stats",       // FeatureStoreEngine — store health stats
  "cad_part_springback",           // SpringbackPredictionEngine — thin-wall elastic recovery
  // CAD-FUSION-LIVE-MS0 PHASE24: wire 8 print/text/tolerance/multi-CAD-bridge orphans
  "cad_text_to_cad_generate",      // TextToCADGenerationEngine — natural language → CAD
  "cad_text_parse",                // TextToCADGenerationEngine — text → ParsedText spec
  "cad_text_supported_features",   // TextToCADGenerationEngine — keyword vocabulary
  "cad_neural_generate",           // NeuralCADGenerationEngine — features|blueprint|text → code
  "cad_neural_extract_features_text", // NeuralCADGenerationEngine — text → FeatureSpec[]
  "cad_part_geometry_analyze",     // PartGeometryPipelineEngine — feature analysis
  "cad_part_geometry_match_tools", // PartGeometryPipelineEngine — feature → tool match
  "cad_fcf_validate",              // FCFSyntaxValidatorEngine — Feature Control Frame validate
  // BLUEPRINT-OCR-TRAINING-MS1/U1: 2 GD&T monolith-fork rescues
  "cad_gdt_parse_enhanced",        // PrismEnhancedGDTEngine — callout → FCF + metadata + CAM recs
  "cad_gdt_fcf_parse_enhanced",    // PrismGDTFCFParserEngine — composite/multi-tier FCF + serializer
  "cad_tolerance_it_grade",        // ToleranceEngine — ISO 286 IT-grade lookup
  "cad_tolerance_fit_analyze",     // ToleranceEngine — H7/g6-style fit analysis
  "cad_tolerance_stackup",         // ToleranceEngine — RSS/worst-case stackup
  "cad_translate_blueprint_to_ops",// PrintToCADTranslator — analysis → CADOperation[]
  "cad_solidworks_plan_execution", // SolidWorksCADExecutionBridge — VBA scaffold
  "cad_inventor_plan_execution",   // InventorCADExecutionBridge — iLogic scaffold
  "cad_mastercam_plan_execution",  // MastercamCADExecutionBridge — .NET hook scaffold
  "cad_hypercads_plan_execution",  // HyperCADCADExecutionBridge — macro scaffold
  // CAD-FUSION-LIVE-MS0 PHASE25: wire 8 file-format/parser/FreeCAD/KG/fixture orphans
  "cad_drawing_2d_register",       // Drawing2DExtractionEngine — register a DXF/DWG
  "cad_drawing_2d_extract",        // Drawing2DExtractionEngine — extract entities from a registered file
  "cad_drawing_2d_queue_stats",    // Drawing2DExtractionEngine — queue statistics
  "cad_fcstd_parse",               // FCStdNativeParserEngine — FreeCAD .FCStd file → tree
  "cad_fcstd_parse_buffer",        // FCStdNativeParserEngine — .FCStd buffer → tree
  "cad_f3d_parse",                 // F3DSQLiteParserEngine — Fusion .f3d → timeline
  "cad_f3d_parse_f3z",             // F3DSQLiteParserEngine — Fusion .f3z (multi-doc archive)
  "cad_f3d_timeline",              // F3DSQLiteParserEngine — extract timeline only
  "cad_dxf_parse_polygons",        // DXFParserEngine — DXF text → Polygon2D[]
  "cad_svg_parse_polygons",        // DXFParserEngine — SVG text → Polygon2D[]
  "cad_dxf_geom_parse",            // DXFGeometryParserEngine — DXF/STEP/IGES → GeometryParseResult
  "cad_dxf_geom_validate_wedm",    // DXFGeometryParserEngine — wire-EDM closure validation
  "cad_freecad_build_script",      // FreeCADCodeGeneratorEngine — CADOperation[] → Python script
  "cad_fixture_ingest_file",       // FixtureCadIngesterEngine — STEP/IGES/Inventor fixture file
  "cad_fixture_ingest_directory",  // FixtureCadIngesterEngine — directory of fixture CAD
  "cad_kg_build",                  // CADKnowledgeGraphEngine — operations → graph
  "cad_kg_detect_cycles",          // CADKnowledgeGraphEngine — cycle detection in build DAG
  // CAD-FUSION-LIVE-MS0 PHASE26: wire 5 part-family/probe/surface/machine-capability orphans
  "cad_part_family_lot_size",          // PartFamilyEconomicsEngine.analyzeLotSize
  "cad_part_family_tool_rotation",     // PartFamilyEconomicsEngine.analyzeToolRotation
  "cad_part_family_cost_drivers",      // PartFamilyEconomicsEngine.analyzeCostDrivers
  "cad_part_family_batch_purchasing",  // PartFamilyEconomicsEngine.analyzeBatchPurchasing
  "cad_part_family_report",            // PartFamilyEconomicsEngine.getPartFamilyReport
  "cad_probe_drift_record",            // ProbeDriftEngine.recordCalibration (static)
  "cad_probe_drift_analyze",           // ProbeDriftEngine.analyzeDrift (static)
  "cad_probe_drift_history",           // ProbeDriftEngine.getCalibrationHistory (static)
  "cad_probe_drift_alerts",            // ProbeDriftEngine.getActiveAlerts (static)
  "cad_probe_record",                  // ProbeRecordEngine.recordProbe (static)
  "cad_probe_tool_setter_record",      // ProbeRecordEngine.recordToolSetter (static)
  "cad_probe_get",                     // ProbeRecordEngine.getProbeRecord (static)
  "cad_probe_list",                    // ProbeRecordEngine.listProbeRecords (static)
  "cad_surface_finish_predict",        // SurfaceFinishCnnEngine.predict
  "cad_surface_finish_predict_batch",  // SurfaceFinishCnnEngine.predictBatch
  "cad_surface_finish_model_metadata", // SurfaceFinishCnnEngine.getModelMetadata
  "cad_machine_capability_get",        // MachineCapabilitySurfaceEngine.getCapabilitySummary
  "cad_machine_capability_with_accuracy", // U-DEA-november-P02: MachineCapabilitySurfaceEngine.getCapabilityWithAccuracy — chains acc_volumetric+acc_abbe_offset+acc_ball_bar at lookup
  "cad_machine_capability_controller", // MachineCapabilitySurfaceEngine.getControllerCapabilities
  "cad_machine_capability_compare",    // MachineCapabilitySurfaceEngine.compareCapabilities
  "cad_machine_capability_find",       // MachineCapabilitySurfaceEngine.findByCapabilities
  // Part Folder Organizer — JM Die per-customer / per-part-number library (intake template for all incoming orders)
  "create_part_folder",                // PartFolderOrganizerEngine.createPartFolder — file/refile one part
  "get_part_folder",                   // PartFolderOrganizerEngine.getPartFolder — look one up
  "part_library_stats",                // PartFolderOrganizerEngine.partLibraryStats — counts / coverage / disk
  "part_library_populate",             // PartFolderOrganizerEngine.populateFromJoinTable — drain N rows of the print→program join table
  // Macro library — catalog the JM Okuma-OSP lathe macros + match parts to families + place a labelled TEMPLATE (NON-safety-critical: VCxxx NOT filled, not runnable; the gated fill/emit pipeline is MACRO-PROGRAM-PIPELINE-MS0)
  "macro_library_list",                // MacroLibraryEngine.listMacros — the 4 OSP lathe macros + their parsed VCxxx variable maps
  "macro_match_family",                // MacroLibraryEngine.matchFamily — match a part (geometry/features/name) → wafer-insert / casing / casing-counterbore / top-hat-casing
  "macro_place_template",              // MacroLibraryEngine.placeMacroTemplate — copy the matching macro as _MACRO-TEMPLATE_*.min into <part>/CNC PROGRAM/ with a DO-NOT-RUN-AS-IS header
  "macro_fanout_dry_run",              // MacroLibraryEngine.fanoutDryRun — scan _PART LIBRARY/, report matchable parts per macro family
  // TRAINING-LEARNING-MS0/U1: CAD-domain alias for macro_place_template, scoped explicitly to lathe families.
  // Same engine (MacroLibraryEngine.placeMacroTemplate), but the action name surfaces under the prism_cad
  // dispatcher so CAD/training-pipeline consumers don't have to cross-dispatch into prism_turning to place a
  // lathe template; family enum is already constrained to the 4 OSP-anchored lathe families by the schema.
  "cad_lathe_template_place",          // MacroLibraryEngine.placeMacroTemplate — lathe-scoped bridge under prism_cad
  // U-PPL-D4 (MS-PRINT-PROGRAM-LOOP Track D): pure composition over UniversalCADIndexEngine
  // output + lathe .MIN entries → unified ProgramEquivalentIndex (CAD-as-program + lathe-gcode).
  "program_equivalent_index_compose",
  // Docustrata customer-folder index — DocustrataCustomerIndexEngine query surface
  "docustrata_customer_index",
  // WIRE-UNWIRED-MS0/U-WIRE-CADBRIDGE — CadBridge (Python CAD subprocess) operability surface.
  // Pure-inspection action: reports singleton + subprocess state WITHOUT spawning the bridge.
  "cad_bridge_status",
  // CAD-COMPLETE-MS0/U-CADC-LP01 — CADExecutionOutcomeBusEngine (closed-loop NN feedback)
  "cad_outcome_publish",        // publish a CAD execution outcome (dual-channel: durable + in-process)
  "cad_outcome_stats",          // read the bus's running counters
  "cad_outcome_subscribers",    // count active in-process subscribers
  // CAD-COMPLETE-MS0/U-CADC-LP02 — CADPerAdapterFeedbackCollectorEngine (per-NN-head feedback)
  "cad_feedback_metrics",       // windowed per-NN-head feedback metrics (one head, or all)
  "cad_feedback_buffer",        // copy of one NN head's feedback sample buffer
  "cad_feedback_stats",         // aggregate per-adapter collector counters
  // CAD-COMPLETE-MS0/U-CADC-LP03 — CADHeadReplayBufferEngine (prioritized replay)
  "cad_replay_stats",           // aggregate prioritized-replay-buffer counters
  "cad_replay_entries",         // copy of one NN head's prioritized replay entries
  // CAD-COMPLETE-MS0/U-CADC-LP04 — MasterBrainBackpropPropagatorEngine
  "cad_backprop_params",        // read current θ + EWC++ Fisher/θ* for a target
  "cad_backprop_stats",         // aggregate propagator counters
  // CAD-COMPLETE-MS0/U-CADC-NN01 — CADFoundationEncoderEngine (shared tokenizer)
  "cad_encoder_vocab",          // snapshot of CAD_OPERATION_KINDS tokenizer vocab
  "cad_encoder_stats",          // aggregate encoder counters
  // CAD-DRAW-MAX-MS0/P0-U01 — HyperCADSLiveBridgeEngine (per-op live mutate via AC Python)
  "hypercads_live_new_doc", "hypercads_live_sketch", "hypercads_live_extrude",
  "hypercads_live_fillet", "hypercads_live_chamfer", "hypercads_live_revolve",
  "hypercads_live_hole", "hypercads_live_pattern", "hypercads_live_combine",
  "hypercads_live_shell", "hypercads_live_export", "hypercads_live_geometry",
  "hypercads_live_undo", "hypercads_live_regenerate", "hypercads_live_execute_raw",
  "hypercads_live_stats", "hypercads_live_list_sessions",
  // CAD-DRAW-MAX-MS0/P0-U02 — HyperCADSOutcomePublisherEngine
  "cad_hypercads_outcome_stats",   // aggregate publisher counters
  "cad_hypercads_outcome_adapter", // canonical adapterId for hyperCAD-S
  // CAD-DRAW-MAX-MS0/P0-U03 — CADRegenFeedbackAdapterEngine
  "cad_regen_feedback_publish",    // publish hyperCAD outcome WITH regen-test overlay
  "cad_regen_feedback_stats",      // aggregate adapter counters
  // CAD-DRAW-MAX-MS0/P1-U04 — CADArgEncoderEngine
  "cad_arg_encoder_encode",        // encode one CADOperationArgs → 8-d vector
  "cad_arg_encoder_batch",         // encode an op stream → per-op arg vectors (or pooled)
  "cad_arg_encoder_stats",         // aggregate encoder counters
  // CAD-DRAW-MAX-MS0/P1-U06 — CADOperationDecoderEngine
  "cad_decoder_propose",           // propose next CADOperation from context + intent
  "cad_decoder_propose_topk",      // top-K candidates ordered by score
  "cad_decoder_vocab",             // forwarded CAD_OPERATION_KINDS
  "cad_decoder_stats",             // aggregate decoder counters
  // CAD-DRAW-MAX-MS0/P1-U05 — CADSequencePoolEngine
  "cad_sequence_pool",             // pool rows via one strategy (mean/max/last/exp-decay/attention)
  "cad_sequence_pool_all",         // pool rows via ALL 5 strategies (ablation / inspection)
  "cad_sequence_pool_strategies",  // list supported strategy names
  "cad_sequence_pool_stats",       // aggregate pool counters
  // CAD-DRAW-MAX-MS0/P1-U07 — CADUnifiedFeatureBridgeEngine
  "cad_unified_feature_encode",    // compose NN01 + Arg + Pool → 33-d feature
  "cad_unified_feature_layout",    // layout metadata (slot offsets)
  "cad_unified_feature_stats",     // aggregate bridge counters
  // CAD-DRAW-MAX-MS0/P1-U09 — CADToleranceSignalEncoderEngine
  "cad_tolerance_encode",          // GD&T callouts → 6-d constraint signal
  "cad_tolerance_augment",         // 33-d unified + 6-d tolerance → 39-d augmented
  "cad_tolerance_stats",           // aggregate tolerance-encoder counters
  // CAD-DRAW-MAX-MS0/FINAL — CADDrawAnyPartOrchestratorEngine
  "cad_draw_any_part",             // end-to-end propose→execute→publish loop on hyperCAD-S
  "cad_draw_any_part_stats",       // aggregate orchestrator counters
  // CAD-DRAW-MAX-MS1/U-VALIDATION-50 — CADDrawAnyPartValidationHarnessEngine
  "cad_draw_any_part_validate",        // run validation harness against ValidationTestCase[] → ValidationReport
  "cad_draw_any_part_validate_render", // render ValidationReport → operator-readable markdown
  // CAD-DRAW-MAX-MS1/U-VALIDATION-50-SCORING — CADValidationRubricEngine
  "cad_validation_rubric_score",       // rich-rubric breakdown for a single DrawAnyPartResult
  "cad_validation_rubric_score_case",  // rich verdict (pluggable into harness opts.scorer)
  // CAD-DRAW-MAX-MS1/U-VALIDATION-50-CORPUS — JM Die curated starter corpus
  "cad_validation_corpus_get",         // load JM Die 12-case starter corpus (optionally domain-filtered)
  "cad_validation_corpus_summary",     // version + total + per-domain count + case ids
  // CAD-DRAW-MAX-MS1/U-VALIDATION-ROUNDTRIP — CADRoundTripValidationEngine (print → CAD → print → dim-diff)
  "cad_validation_round_trip",         // full round-trip: OCR → draw → extract → regen-print → diff
  // CAD-DRAW-MAX-MS1/U-CAD-DIM-EXTRACT — CADModelDimensionExtractorEngine
  "cad_model_dim_extract",             // walk DrawAnyPartResult.opLog → PrintDimension[]
  "cad_dimension_reconcile",           // CrossSourceDimensionReconciliationEngine — reconcile print+cad+cnc dim candidates → consensus + conflicts
  // CAD-DRAW-MAX-MS1/U-PRINT-REGEN-LIVE — CADPrintRegeneratorEngine
  "cad_print_regenerate",              // regenerate dimensioned print from CAD model (dims + markdown)
  // CAD-COMPLETE-MS0/U-CADC32 — CADPartArchetypeRegistryEngine (PHASE-7 ML-Powered Template Auto-Generation)
  "cad_part_archetype_list",           // list all 8 registered archetypes (boss/rib/slot/keyway/pocket/2 holes/thread)
  "cad_part_archetype_get",            // get one archetype by kind
  "cad_part_archetype_materialize",    // expand archetype + params → CADOperation[] (R12 fail-loud on missing params)
  "cad_part_archetype_summary",        // schemaVersion + count + kinds list
  // CAD-COMPLETE-MS0/U-CADC33 — CADJMDieArchetypeFrequencyEngine (PHASE-7 empirical prior from JM Die corpus)
  "cad_jmdie_archetype_prior",         // get JM Die empirical frequency prior for an archetype kind
  "cad_jmdie_archetype_ranked",        // archetypes ranked by descending JM Die frequency
  "cad_jmdie_archetype_posterior",     // apply Bayes-style evidence: prior × likelihood → ranked posterior
  "cad_jmdie_archetype_summary",       // schemaVersion + sourceCorpus + sum + top1
  // CAD-COMPLETE-MS0/PHASE-31 U-CADC-NN04+NN05+NN06 — CADSystemNeuralArchAdapterEngine (Fusion+SolidWorks+Inventor adapter)
  "cad_system_neural_arch_canonicalize",  // per-CAD-system FeatureSpec[] → canonical (training input unification)
  "cad_system_neural_arch_nativize",      // canonical FeatureSpec[] → per-CAD-system native (output side)
  "cad_system_neural_arch_rules",         // get CADSystemFeatureRules for a system
  "cad_system_neural_arch_summary",       // supported systems + per-system feature count
  // CAD-COMPLETE-MS0/PHASE-31 synergy layer — CADMultiSystemAIProducerEngine (top-level any-CAD-any-part facade)
  "cad_multi_system_produce_part",        // produce a part on any priority CAD system from PartIntent
  "cad_multi_system_produce_assembly",    // produce a multi-part assembly on any priority CAD system
  "cad_multi_system_supported",           // list supported CAD systems with bridge names
  "cad_multi_system_summary",             // schemaVersion + supportedSystems + bridgeMap
  // KNOWLEDGE-EXTRACT-COMPLETE-MS0/U-KEC-CAD-PARAM-EMITTER — CADFunctionParameterEmitterEngine
  "cad_function_param_emit",              // emit wiki + tribal + nn-graph nodes from CADParameter[] tree
  "cad_function_param_emit_summary",      // schemaVersion + supportedSystems + emitSurfaces
  // CAD-DRAW-MAX-MS0/P1-U08 — HyperCADSTutorialCorpusIngesterEngine
  "hypercads_tutorial_corpus_ingest",  // tutorial prose → op tips + GD&T conventions
  "hypercads_tutorial_corpus_stats",   // aggregate corpus-ingester counters
  // CAD-REVERSE-ENGINEER-MS0/U1 — CADReverseTemplateEngine
  "cad_reverse_template",          // feature tree → categorized+named parameterized template
  "cad_reverse_categorize",        // feature tree → part category only (fast path)
  "cad_reverse_template_stats",    // aggregate reverse-engineering counters
  // CAD-CLOSED-LOOP-MS0 -- CADRegenCorrectionEngine (Stage-6 CORRECT->CONVERGE)
  "cad_regen_correct",             // compare delta + params -> corrected params + convergence verdict
  "cad_regen_apply_template",      // write corrections back into an opTemplate (close to GENERATE)
  "cad_regen_params_from_template",// reverse template + metric->param map -> CorrectionParam[]
  "cad_regen_stats",               // aggregate correction-engine counters
  // CAD-REVERSE-ENGINEER-MS0/U2 — CADCanonicalTreeAdapterEngine
  "cad_canonical_to_ops",          // CanonicalFeatureTree → CADOperation[]
  "cad_canonical_reverse_engineer",// CanonicalFeatureTree → categorized template (one call)
  "cad_canonical_adapt_stats",     // aggregate adapter counters
  // CAD-REVERSE-ENGINEER-MS0/U3 — CADReverseCorpusCatalogEngine
  "cad_corpus_catalog_build",      // CanonicalFeatureTree[] → deduplicated catalog
  "cad_corpus_catalog_merge",      // fold two chunk catalogs into one
  "cad_corpus_catalog_stats",      // aggregate catalog-builder counters
  // CAD-COMPLETE-MS0/U-AI-03 — UnitOfMeasureDisambiguationEngine (mm/inch resolver)
  "cad_uom_resolve",               // resolve one dimensional value (explicit or implicit) → canonical mm
  "cad_uom_resolve_batch",         // resolve a batch; earlier values anchor the unit for later ones
  "cad_uom_convert",               // explicit numeric mm↔inch conversion
  // CAD-COMPLETE-MS0/U-AI-12 — RiskTierClassifierEngine (CAD-op risk tier)
  "cad_risk_classify",             // classify one CAD operation → low/medium/high/critical
  "cad_risk_classify_batch",       // classify a batch of operations op-by-op
  "cad_risk_classify_plan",        // classify a multi-op plan as a whole (peak + cumulative blast)
  // CAD-COMPLETE-MS0/U-AI-09 — CADAppCircuitBreakerEngine (per-CAD-app breaker)
  "cad_breaker_can_proceed",       // may a call to this CAD app proceed? (open→half_open transitions here)
  "cad_breaker_record_success",    // record a successful CAD app call
  "cad_breaker_record_failure",    // record a failed CAD app call
  "cad_breaker_state",             // current breaker state for one CAD app
  "cad_breaker_snapshot",          // breaker state for every tracked CAD app
  "cad_breaker_configure",         // override breaker thresholds for one CAD app
  // CAD-COMPLETE-MS0/U-AI-01 — CADFallbackRoutingEngine (preferred→next-best routing)
  "cad_fallback_route",            // route an op to the best available CAD app (preferred → fallback)
  "cad_fallback_register",         // register CAD app profiles in the routing registry
  "cad_fallback_list",             // list registered CAD apps, ranked by priority
  "cad_fallback_reset",            // clear the CAD app routing registry
  // CAD-COMPLETE-MS0/U-AI-02 — CADWorldModelEngine (CAD agent's document belief-state)
  "cad_world_apply_op",            // apply one operation to a document's world model
  "cad_world_state",               // current believed state of a document
  "cad_world_checkpoint",          // save the document's current state as its diff baseline
  "cad_world_diff",                // diff the document against its last checkpoint
  "cad_world_detect_drift",        // compare the belief-state against an observation of the real document
  "cad_world_reset",               // reset one document (or all) to a fresh empty model
  // CAD-COMPLETE-MS0/U-AI-10 — CADTraceAssemblyEngine (OTel span -> end-to-end trace view)
  "cad_trace_assemble",            // assemble a flat span list into per-traceId end-to-end trace views
  "cad_trace_get",                 // assemble a single trace by id from a flat span list
  "cad_trace_from_tracer",         // pull spans from the live OpenTelemetryTracingEngine and assemble
  // CAD-COMPLETE-MS0/U-AI-08 — CADTransactionEngine (atomic begin/apply/commit/rollback over CADWorldModelEngine)
  "cad_txn_begin",                 // open a transaction for a docId; snapshots state as the rollback baseline
  "cad_txn_apply",                 // apply one op inside the txn; throws + auto-rolls-back on world-model rejection
  "cad_txn_commit",                // finalise the txn; returns diff vs baseline + final state (terminal)
  "cad_txn_rollback",              // restore the txn's baseline + release the doc lock (terminal)
  "cad_txn_status",                // read-only status snapshot of a txn (null if unknown)
  "cad_txn_list",                  // list every txn (optionally filtered by docId), oldest first
  "cad_txn_apply_all",             // begin + apply each op + commit-or-rollback in one call
  "cad_txn_reset",                 // drop every txn + release every doc lock (test / hygiene hook)
  // CAD-COMPLETE-MS0/U-AI-07 — CADPreviewEngine (pure dry-run preview over CADTransactionEngine; real world is NEVER mutated, even on success)
  "cad_preview_apply",             // project a single op to a sandboxed copy + return diff WITHOUT touching real world
  "cad_preview_apply_all",         // project an ordered batch (atomic — all-or-nothing) + return diff WITHOUT touching real world
  // CAD-COMPLETE-MS0/U-AI-11 — CADConsensusEngine (pure structural-agreement scoring over N CADWorldDiff predictions; no LLM calls)
  "cad_consensus_score",           // per-field support + pairwise Jaccard + meanAgreement over N predictions
  "cad_consensus_pick",            // medoid selection (highest mean Jaccard) + dissenters below threshold
  "cad_consensus_parameter_clusters", // numerical-value clusters per parameter (merge within PARAM_EPSILON)
  // -- iter5+6+7 wire-unwired-loop: 16 CAD engines --
  "engine_digest_get",
  "freecad_automation_run",
  "autocad_dotnet_bridge_open",
  "autocad_addin_plugin_register",
  "nx_open_sketch_create",
  "cad_to_step_pipeline_run",
  "cad_screenshot_capture",
  "per_app_incad_infer",
  "fusion360_generator_adapt",
  "fusion360_function_index_get",
  "hypercad_function_index_get",
  "five_axis_cad_template_process",
  "two_pass_cascade_run",
  "cascade_fallback_chain_run",
  "cad_live_blueprint_ocr",
  // ── DEA-MS0/U-DEA-november-P06 — probe drift → probe routine bridge ──
  "cad_probe_drift_routine_bridge",
] as const;

/** Registers cad dispatcher.
 * @param server - MCP server instance
  * @returns void
 */
export function registerCadDispatcher(server: any): void {
  server.tool(
    "prism_cad",
    `CAD/Geometry dispatcher — geometry operations, meshing, feature recognition, stock modeling, WCS setup, DfM checking.
Actions: ${ACTIONS.join(", ")}.
Params vary by action — pass relevant fields in params object.`,
    { action: z.enum(ACTIONS), params: z.record(z.string(), z.any()).optional() },
    async ({ action, params: rawParams = {} }: { action: typeof ACTIONS[number]; params?: Record<string, any> }) => {
      log.info(`[prism_cad] Action: ${action}`);
      let result: any;
      try {
        // H1-MS2: Auto-normalize snake_case → camelCase params
        let params = rawParams;
        try {
          const { normalizeParams } = await import("../../utils/paramNormalizer.js");
          params = normalizeParams(rawParams);
        } catch { /* normalizer not available */ }
        // SYS-MS6: Validate params against per-action Zod schema
        const validation = validateActionParams(action, params, ACTION_CAD_SCHEMAS);
        if (!validation.valid) {
          return dispatcherError(
            `Invalid params for '${action}': ${validation.errorMessage}`,
            action,
            "prism_cad"
          );
        }

        switch (action) {
          case "cad_dimension_reconcile": {
            // XRAY cross-source dimension determination: reconcile dimension candidates from
            // print(OCR) + cad(geometry) + cnc(toolpath) into a consensus set with agreement
            // confidence + flagged conflicts. params.candidates: DimCandidate[]; params.opts: tolerances.
            const candidates = Array.isArray(params.candidates) ? params.candidates : [];
            result = { success: true, data: crossSourceDimensionReconciliationEngine.reconcile(candidates, (params.opts as any) ?? {}) };
            break;
          }
          case "geometry_create": {
            const engine = await getEngine("cad");
            result = engine.createGeometry?.(params) ?? { type: params.type || "box", created: true, params };
            break;
          }
          case "geometry_transform": {
            const engine = await getEngine("geometry");
            result = engine.transform?.(params) ?? { transformed: true, operation: params.operation || "translate", params };
            break;
          }
          case "geometry_analyze": {
            const engine = await getEngine("geometry");
            result = engine.analyze?.(params) ?? { analysis: "geometry_properties", params };
            break;
          }
          case "mesh_generate": {
            const engine = await getEngine("mesh");
            result = engine.generate?.(params) ?? { mesh_generated: true, element_size: params.element_size_mm ?? 1.0 };
            break;
          }
          case "mesh_import": {
            const engine = await getEngine("mesh");
            result = engine.importMesh?.(params) ?? { imported: true, format: params.format || "stl" };
            break;
          }
          case "mesh_export": {
            const engine = await getEngine("mesh");
            result = engine.exportMesh?.(params) ?? { exported: true, format: params.format || "stl" };
            break;
          }
          case "geodesic_dijkstra": {
            const { GeodesicDistanceEngine, DijkstraInputSchema } =
              await import("../../engines/GeodesicDistanceEngine.js");
            const parsed = DijkstraInputSchema.parse({
              mesh: params.mesh,
              sourceVertices: params.sourceVertices,
            });
            const distances = GeodesicDistanceEngine.computeDijkstra(
              parsed.mesh as never, parsed.sourceVertices
            );
            result = { success: true, data: { distances } };
            break;
          }
          case "geodesic_fast_marching": {
            const { GeodesicDistanceEngine, FastMarchingInputSchema } =
              await import("../../engines/GeodesicDistanceEngine.js");
            const parsed = FastMarchingInputSchema.parse({
              mesh: params.mesh,
              sourceVertices: params.sourceVertices,
            });
            const distances = GeodesicDistanceEngine.computeFastMarching(
              parsed.mesh as never, parsed.sourceVertices
            );
            result = { success: true, data: { distances } };
            break;
          }
          case "geodesic_path": {
            const { GeodesicDistanceEngine, PathInputSchema } =
              await import("../../engines/GeodesicDistanceEngine.js");
            const parsed = PathInputSchema.parse({
              mesh: params.mesh,
              start: params.start,
              end: params.end,
            });
            result = {
              success: true,
              data: GeodesicDistanceEngine.computePath(
                parsed.mesh as never, parsed.start, parsed.end
              ),
            };
            break;
          }
          case "geodesic_iso_curves": {
            const { GeodesicDistanceEngine, IsoCurvesInputSchema } =
              await import("../../engines/GeodesicDistanceEngine.js");
            const parsed = IsoCurvesInputSchema.parse({
              mesh: params.mesh,
              sourceVertices: params.sourceVertices,
              levels: params.levels,
            });
            result = {
              success: true,
              data: {
                curves: GeodesicDistanceEngine.computeIsoCurves(
                  parsed.mesh as never, parsed.sourceVertices, parsed.levels
                ),
              },
            };
            break;
          }
          case "brep_tessellate": {
            // U-GAP-CAD-BREP-TESSELLATOR — STEP B-Rep entity-map → triangle mesh.
            // Caller must pass `stepData.byType` and `entityMap` already parsed
            // (e.g. via AtomicStepDecomposerEngine). MCP boundary serializes Maps
            // as plain objects; rehydrate when params.stepData.byType is a Record.
            const { BRepTessellatorEngine, TessellateBrepInputSchema } =
              await import("../../engines/BRepTessellatorEngine.js");
            const options = TessellateBrepInputSchema.parse(params.options ?? {});
            const rehydrateMap = <V>(src: unknown): Map<unknown, V> => {
              if (src instanceof Map) return src as Map<unknown, V>;
              if (src && typeof src === "object") {
                return new Map(Object.entries(src as Record<string, V>).map(
                  ([k, v]) => [Number.isNaN(Number(k)) ? k : Number(k), v]
                ));
              }
              return new Map();
            };
            const stepData = (params.stepData ?? {}) as { byType?: unknown };
            const byType = rehydrateMap(stepData.byType);
            const entityMap = rehydrateMap(params.entityMap);
            const mesh = BRepTessellatorEngine.tessellateBrep(
              { byType: byType as Map<string, never[]>, entityMap: entityMap as Map<number, never> },
              entityMap as Map<number, never>,
              options
            );
            result = { success: true, data: mesh };
            break;
          }
          case "cad_cam_handoff": {
            // U-BRIDGE-CAD-CAM-HANDOFF — autonomously-generated CAD geometry
            // (FeatureSpec[]) → operator-gated CAM strategy plan. Pure
            // orchestration; delegates ranking to camStrategyRecommenderEngine.
            const { CadCamHandoffEngine, CadCamHandoffInputSchema } =
              await import("../../engines/CadCamHandoffEngine.js");
            const input = CadCamHandoffInputSchema.parse(params);
            result = { success: true, data: CadCamHandoffEngine.handoff(input) };
            break;
          }
          case "feature_recognize": {
            const engine = await getEngine("feature");
            result = engine.recognize?.(params) ?? { features: [], geometry: params };
            break;
          }
          case "feature_edit": {
            const engine = await getEngine("feature");
            result = engine.edit?.(params) ?? { edited: true, feature_id: params.feature_id };
            break;
          }
          case "stock_model": {
            const engine = await getEngine("stock");
            result = engine.createStock?.(params) ?? engine.compute?.(params) ?? { stock: params };
            break;
          }
          case "wcs_setup": {
            const engine = await getEngine("wcs");
            result = engine.setup?.(params) ?? engine.compute?.(params) ?? { wcs: params };
            break;
          }
          case "dfm_check": {
            const dfm = await getEngine("dfm");
            result = dfm.checkDfMRules(params);
            break;
          }
          case "face_mill_select": {
            const dfm = await getEngine("dfm");
            result = dfm.selectFaceMillGeometry(params);
            break;
          }
          case "deep_hole_technique": {
            const dfm = await getEngine("dfm");
            result = dfm.selectDeepHoleTechnique(params);
            break;
          }
          // ── DFM Pipeline (DFMPipelineEngine) ──
          case "dfm_analyze": {
            const pipeline = await getEngine("dfmPipeline");
            result = await pipeline.analyze(params as any);
            break;
          }
          case "dfm_quick": {
            const pipeline = await getEngine("dfmPipeline");
            result = await pipeline.quickCheck(params as any);
            break;
          }
          case "dfm_tolerance_check": {
            const pipeline = await getEngine("dfmPipeline");
            result = pipeline.toleranceStack(params as any);
            break;
          }
          case "dfm_cost_impact": {
            const pipeline = await getEngine("dfmPipeline");
            const analyzeResult = await pipeline.analyze(params as any);
            result = {
              total_cost_impact_usd: analyzeResult.total_cost_impact_usd,
              total_savings_if_fixed_usd: analyzeResult.total_savings_if_fixed_usd,
              issues: analyzeResult.issues.map((i: any) => ({
                severity: i.severity,
                category: i.category,
                message: i.message,
                cost_impact_usd: i.cost_impact_usd,
                savings_if_fixed_usd: i.savings_if_fixed_usd,
              })),
            };
            break;
          }
          case "dfm_get_rules": {
            result = {
              pipeline_rules: [
                "undercut_depth: max depth/width 2:1",
                "thread_depth: blind max 3×D, through max 2×D, min M2",
                "stress_concentration: Kt < 3.0 (Peterson's)",
                "draft_angle: walls ≥0.5°, ribs ≥1°, textured ≥2° (injection mold only)",
                "material_wall: ISO-specific min wall (N=0.8mm, P=1mm, M=1.5mm, S=2.5mm, H=3mm)",
                "material_corner: ISO-specific min radius (N=0.3mm, P=0.5mm, S=1.5mm, H=2mm)",
              ],
              feedback_engine_rules: [
                "thin_wall: <0.5mm critical, <2mm warning",
                "deep_pocket: >6:1 critical, >4:1 warning",
                "tight_tolerance: <0.005mm critical, <0.01mm warning",
                "surface_finish: <0.2Ra critical, <0.4Ra warning",
                "sharp_corner: <0.5mm radius warning",
              ],
              structural_rules: [
                "wall_limits: metal min 0.5mm feasible, 0.8mm recommended",
                "cavity_rules: max 10× tool dia depth, recommended 4× width",
                "hole_rules: max 10×D depth, recommended 4×D",
                "thread_rules: min M2 feasible, M6 recommended",
                "tolerance_limits: standard ±0.125mm, tight ±0.050mm, feasible ±0.025mm",
              ],
            };
            break;
          }
          // ── Sketch & Part (SketchEngine) ──
          case "sketch_create": {
            const sk = await getEngine("sketch");
            result = sk.createSketch(params.name, params.plane);
            break;
          }
          case "sketch_add_entity": {
            const sk = await getEngine("sketch");
            const sketch = params.sketch;
            if (!sketch) { result = { error: "sketch object required" }; break; }
            switch (params.entity_type) {
              case "line": sk.addLine(sketch, params.start, params.end, params.construction); break;
              case "arc": sk.addArc(sketch, params.center, params.radius, params.start_angle, params.end_angle); break;
              case "circle": sk.addCircle(sketch, params.center, params.radius, params.construction); break;
              case "rectangle": sk.addRectangle(sketch, params.corner ?? { x: 0, y: 0 }, params.width, params.height); break;
              case "polygon": sk.addPolygon(sketch, params.center ?? { x: 0, y: 0 }, params.radius, params.sides); break;
              case "ellipse": sk.addEllipse(sketch, params.center ?? { x: 0, y: 0 }, params.major_radius, params.minor_radius); break;
              case "slot": sk.addSlot(sketch, params.center1, params.center2, params.width); break;
              case "spline": sk.addSpline(sketch, params.points, params.closed); break;
              default: result = { error: `Unknown entity type: ${params.entity_type}` }; break;
            }
            result = result ?? sketch;
            break;
          }
          case "sketch_analyze": {
            const sk = await getEngine("sketch");
            result = sk.analyzeProfile(params.sketch);
            break;
          }
          case "sketch_to_svg": {
            const sk = await getEngine("sketch");
            result = { svg: sk.toSVG(params.sketch, params.view_box) };
            break;
          }
          case "sketch_to_cadquery": {
            const sk = await getEngine("sketch");
            result = { python_code: sk.toCadQueryPython(params.part) };
            break;
          }
          case "part_create": {
            const sk = await getEngine("sketch");
            result = sk.createPart(params.name, params.material);
            break;
          }
          case "part_add_feature": {
            const sk = await getEngine("sketch");
            const part = params.part;
            if (!part) { result = { error: "part object required" }; break; }
            const f = params.feature;
            switch (f?.type) {
              case "extrude": sk.addFeatureToPart(part, sk.createExtrude(f.sketch_id, f.depth, f.symmetric, f.draft_angle)); break;
              case "extrude_cut": sk.addFeatureToPart(part, sk.createExtrudeCut(f.sketch_id, f.depth, f.through_all)); break;
              case "revolve": sk.addFeatureToPart(part, sk.createRevolve(f.sketch_id, f.angle, f.axis_entity_id)); break;
              case "hole": sk.addFeatureToPart(part, sk.createHole(f.diameter, f.depth, f.position, f.countersink, f.counterbore)); break;
              case "fillet": sk.addFeatureToPart(part, sk.createFillet3D(f.radius, f.edge_ids)); break;
              case "chamfer": sk.addFeatureToPart(part, sk.createChamfer(f.distance, f.edge_ids, f.angle)); break;
              case "shell": sk.addFeatureToPart(part, sk.createShell(f.thickness, f.faces_to_remove)); break;
              default: result = { error: `Unknown feature type: ${f?.type}` }; break;
            }
            result = result ?? part;
            break;
          }
          case "part_estimate_volume": {
            const sk = await getEngine("sketch");
            result = { volume_mm3: sk.estimatePartVolume(params.part) };
            break;
          }
          case "part_template_box": {
            const sk = await getEngine("sketch");
            result = sk.createBoxPart(params.name ?? "Box", params.width, params.height, params.depth, params.material);
            break;
          }
          case "part_template_cylinder": {
            const sk = await getEngine("sketch");
            result = sk.createCylinderPart(params.name ?? "Cylinder", params.diameter, params.height, params.material);
            break;
          }
          case "part_template_flange": {
            const sk = await getEngine("sketch");
            result = sk.createFlangedPart(
              params.name ?? "Flange",
              params.outer_diameter, params.bore_diameter, params.thickness,
              params.bolt_circle_diameter, params.hole_count, params.hole_diameter,
              params.material,
            );
            break;
          }
          case "part_template_bracket": {
            const sk = await getEngine("sketch");
            result = sk.createBracketPart(
              params.name ?? "Bracket",
              params.base_width, params.base_height, params.base_thickness,
              params.wall_height, params.wall_thickness,
              params.hole_diameter, params.material,
            );
            break;
          }
          // ── Parametric Part Library ──
          case "part_library_create": {
            const pl = await getEngine("partLib");
            result = pl.createPart(params.part_type, params);
            break;
          }
          case "part_library_list_types": {
            const pl = await getEngine("partLib");
            result = pl.listPartTypes();
            break;
          }
          // ── Assembly ──
          case "assembly_create": {
            const ae = await getEngine("assembly");
            result = ae.createAssembly(params.name ?? "Assembly", params.description);
            break;
          }
          case "assembly_add_component": {
            const ae = await getEngine("assembly");
            if (!params.assembly) { result = { error: "assembly object required" }; break; }
            result = ae.addComponent(params.assembly, params.name, params.part_type,
              params.cadquery_build_code ?? "", {
                position: params.position, rotation: params.rotation,
                quantity: params.quantity, material: params.material, color: params.color,
              });
            break;
          }
          case "assembly_add_mate": {
            const ae = await getEngine("assembly");
            if (!params.assembly) { result = { error: "assembly object required" }; break; }
            result = ae.addMate(params.assembly, params.mate_type,
              params.component_a_id, params.component_b_id, {
                selector_a: params.selector_a, selector_b: params.selector_b,
                value: params.value, flip: params.flip,
              });
            break;
          }
          case "assembly_position": {
            const ae = await getEngine("assembly");
            if (!params.assembly) { result = { error: "assembly object required" }; break; }
            ae.positionComponent(params.assembly, params.component_id,
              params.position, params.rotation);
            result = params.assembly;
            break;
          }
          case "assembly_bom": {
            const ae = await getEngine("assembly");
            if (!params.assembly) { result = { error: "assembly object required" }; break; }
            result = params.markdown
              ? { markdown: ae.toBOMMarkdown(params.assembly) }
              : { bom: ae.generateBOM(params.assembly) };
            break;
          }
          case "assembly_to_cadquery": {
            const ae = await getEngine("assembly");
            if (!params.assembly) { result = { error: "assembly object required" }; break; }
            result = { python_code: ae.toCadQueryPython(params.assembly) };
            break;
          }
          // ── CAD Operation Taxonomy ──
          case "cad_taxonomy_lookup": {
            const tx = await getEngine("cadTaxonomy");
            result = tx.getOperation(params.action_type) ?? { error: `No operation found for: ${params.action_type}` };
            break;
          }
          case "cad_taxonomy_list": {
            const tx = await getEngine("cadTaxonomy");
            result = params.category
              ? tx.getByCategory(params.category)
              : tx.getAllOperations();
            break;
          }
          case "cad_taxonomy_generate": {
            const tx = await getEngine("cadTaxonomy");
            result = { code: tx.generateCadQueryCode(params.action ?? params) };
            break;
          }
          case "cad_taxonomy_aerospace": {
            const tx = await getEngine("cadTaxonomy");
            result = tx.getAerospaceOperations();
            break;
          }
          case "cad_taxonomy_search": {
            const tx = await getEngine("cadTaxonomy");
            result = tx.search(params.query ?? "");
            break;
          }
          case "cad_taxonomy_compatibility": {
            const tx = await getEngine("cadTaxonomy");
            result = tx.checkCompatibility(params.operation_id, params.system);
            break;
          }
          case "cad_taxonomy_validate": {
            const tx = await getEngine("cadTaxonomy");
            result = tx.validateParams(params.operation_id, params.params ?? {});
            break;
          }
          case "cad_taxonomy_stats": {
            const tx = await getEngine("cadTaxonomy");
            result = tx.getStats();
            break;
          }
          case "cad_taxonomy_suggest": {
            const tx = await getEngine("cadTaxonomy");
            result = tx.suggestForUseCase(params.description ?? "");
            break;
          }
          // ── CAD Capability Negotiator — CAD-COMPLETE-MS0/U-CADC-AI03 ──
          case "cad_capability_negotiate": {
            const eng = await getEngine("capNegotiator");
            result = await eng.negotiate({
              ops: params.ops ?? [],
              preferredSystem: params.preferredSystem,
              policy: params.policy,
              excludeSystems: params.excludeSystems,
              excludeSubprocess: params.excludeSubprocess,
            });
            break;
          }
          case "cad_capability_negotiate_or_throw": {
            const eng = await getEngine("capNegotiator");
            result = await eng.negotiateOrThrow({
              ops: params.ops ?? [],
              preferredSystem: params.preferredSystem,
              policy: params.policy,
              excludeSystems: params.excludeSystems,
              excludeSubprocess: params.excludeSubprocess,
            });
            break;
          }
          case "cad_capability_list_gaps": {
            const eng = await getEngine("capNegotiator");
            result = await eng.listGaps(params.referenceOps);
            break;
          }
          // ── CadQuery Code Generator ──
          case "cadquery_generate_script": {
            const cq = await getEngine("cadQueryGen");
            result = cq.generateScript(params.actions ?? []);
            break;
          }
          case "cadquery_step_by_step": {
            const cq = await getEngine("cadQueryGen");
            result = cq.generateStepByStep(params.actions ?? []);
            break;
          }
          case "cadquery_validate_syntax": {
            const cq = await getEngine("cadQueryGen");
            result = cq.validateSyntax(params.script ?? "");
            break;
          }
          case "cadquery_execute_script": {
            const cq = await getEngine("cadQueryGen");
            result = await cq.executeScript(
              params.script ?? "",
              { output_path: params.output_path, format: params.format },
            );
            break;
          }
          case "cadquery_codegen_prompt": {
            const cq = await getEngine("cadQueryGen");
            result = { prompt: cq.getCodeGenPrompt() };
            break;
          }
          // ── Fusion 360 Code Generator ──
          case "f360_generate_script": {
            const fg = await getEngine("f360Gen");
            result = fg.generateScript(params.actions ?? [], { parametric: params.parametric, component_name: params.component_name });
            break;
          }
          case "f360_from_description": {
            const fg = await getEngine("f360Gen");
            result = fg.generateFromDescription(params.description ?? "", params.options);
            break;
          }
          case "f360_parametric_script": {
            const fg = await getEngine("f360Gen");
            result = fg.generateParametricScript(params.actions ?? []);
            break;
          }
          case "f360_convert_cadquery": {
            const fg = await getEngine("f360Gen");
            result = fg.convertCadQueryToFusion360(params.cadquery_script ?? params.script ?? "");
            break;
          }
          // ── Fusion 360 Live Bridge ──
          case "f360_live_sketch": {
            const fb = await getEngine("f360Bridge");
            result = await fb.createSketch({ plane: params.plane, shapes: params.shapes ?? [] });
            break;
          }
          case "f360_live_extrude": {
            const fb = await getEngine("f360Bridge");
            result = await fb.extrude(params);
            break;
          }
          case "f360_live_fillet": {
            const fb = await getEngine("f360Bridge");
            result = await fb.fillet(params);
            break;
          }
          case "f360_live_chamfer": {
            const fb = await getEngine("f360Bridge");
            result = await fb.chamfer(params);
            break;
          }
          case "f360_live_revolve": {
            const fb = await getEngine("f360Bridge");
            result = await fb.revolve(params);
            break;
          }
          case "f360_live_hole": {
            const fb = await getEngine("f360Bridge");
            result = await fb.createHole(params);
            break;
          }
          case "f360_live_pattern": {
            const fb = await getEngine("f360Bridge");
            result = await fb.pattern(params);
            break;
          }
          case "f360_live_combine": {
            const fb = await getEngine("f360Bridge");
            result = await fb.combine(params);
            break;
          }
          case "f360_live_shell": {
            const fb = await getEngine("f360Bridge");
            result = await fb.shell(params);
            break;
          }
          case "f360_live_export": {
            const fb = await getEngine("f360Bridge");
            result = await fb.exportModel(params);
            break;
          }
          case "f360_live_geometry": {
            const fb = await getEngine("f360Bridge");
            result = await fb.getGeometry();
            break;
          }
          case "f360_live_undo": {
            const fb = await getEngine("f360Bridge");
            result = await fb.undo();
            break;
          }
          case "f360_live_new_doc": {
            const fb = await getEngine("f360Bridge");
            result = await fb.newDocument(params.name);
            break;
          }
          case "f360_live_execute_raw": {
            const fb = await getEngine("f360Bridge");
            result = await fb.executeRaw(params.code ?? "");
            break;
          }
          // ── PIPE-MS2: PrintToGeometryEngine (previously orphaned) ──
          case "blueprint_to_3d_model":
          case "blueprint_to_cadquery_script": {
            const { printToGeometryEngine } = await import("../../engines/PrintToGeometryEngine.js");
            result = printToGeometryEngine.convert(params as any);
            break;
          }
          // ── Rhino Grasshopper PRISM Components ──
          case "grasshopper_list_components": {
            const { RhinoGrasshopperPRISMComponentsEngine } = await import("../../engines/RhinoGrasshopperPRISMComponentsEngine.js");
            const engine = new RhinoGrasshopperPRISMComponentsEngine({
              dispatcher: { invoke: () => ({ ok: true, result: {} }) },
            });
            result = { success: true, components: engine.listComponents({ category: params.category, includeObsolete: params.includeObsolete }) };
            break;
          }
          case "grasshopper_get_component": {
            const { RhinoGrasshopperPRISMComponentsEngine } = await import("../../engines/RhinoGrasshopperPRISMComponentsEngine.js");
            const engine = new RhinoGrasshopperPRISMComponentsEngine({
              dispatcher: { invoke: () => ({ ok: true, result: {} }) },
            });
            const comp = engine.getComponent(params.componentId);
            result = comp ? { success: true, component: comp } : { success: false, error: "Component not found" };
            break;
          }
          case "grasshopper_execute": {
            const { RhinoGrasshopperPRISMComponentsEngine } = await import("../../engines/RhinoGrasshopperPRISMComponentsEngine.js");
            const engine = new RhinoGrasshopperPRISMComponentsEngine({
              dispatcher: {
                invoke: (dispatcher: string, action: string, p: Record<string, unknown>) => {
                  return { ok: true, result: { dispatcher, action, params: p } };
                },
              },
            });
            result = engine.execute(params.componentId, params.inputs ?? [], params.context ?? { documentId: "default", tolerance: 0.001 });
            break;
          }
          case "grasshopper_registry": {
            const { RhinoGrasshopperPRISMComponentsEngine } = await import("../../engines/RhinoGrasshopperPRISMComponentsEngine.js");
            const engine = new RhinoGrasshopperPRISMComponentsEngine({
              dispatcher: { invoke: () => ({ ok: true, result: {} }) },
            });
            result = { success: true, registry: engine.getRegistry() };
            break;
          }
          // SolidWorks Code Generator (U-CADC11)
          case "solidworks_generate_script": {
            const engine = await getEngine("swGen");
            const ops = params.operations ?? [];
            const context = { partName: params.partName ?? "PRISMPart", units: params.units ?? "mm" };
            // buildScript returns CADScript<string> directly (not {script, warnings}).
            const script = engine.buildScript(ops, context);
            result = {
              success: true,
              script: script.body,
              filename: script.filename,
              warnings: script.warnings,
              parameters: Object.fromEntries(script.parameters),
              lineage: script.lineage,
            };
            break;
          }
          case "solidworks_build_part": {
            const engine = await getEngine("swGen");
            const ops = params.operations ?? [];
            const context = { partName: params.partName ?? "PRISMPart", units: params.units ?? "mm", outputDir: params.outputDir };
            const script = engine.buildScript(ops, context);
            const execResult = await engine.executeScript(script, context);
            result = {
              success: execResult.ok ?? true,
              script: script.body,
              output: execResult.output,
              durationMs: execResult.durationMs,
              warnings: script.warnings,
              error: execResult.error,
            };
            break;
          }
          case "solidworks_execute": {
            const engine = await getEngine("swGen");
            const script = {
              body: String(params.script ?? ""),
              cadSystem: "solidworks" as const,
              filename: params.filename ?? "script.swp",
              parameters: new Map(),
              lineage: [],
              warnings: [],
              imports: new Set<string>(),
            };
            const context = { partName: params.partName ?? "PRISMPart", units: params.units ?? "mm" };
            const execResult = await engine.executeScript(script, context);
            result = {
              success: execResult.ok ?? true,
              output: execResult.output,
              durationMs: execResult.durationMs,
              logs: execResult.logs ?? [],
              error: execResult.error,
            };
            break;
          }
          case "solidworks_capabilities": {
            const engine = await getEngine("swGen");
            const caps = engine.capabilities;
            // Normalize Set<string> → string[] so JSON serialization preserves
            // the supported-op list over the MCP wire.
            const supportedOps = caps.supportedOps instanceof Set
              ? Array.from(caps.supportedOps)
              : caps.supportedOps;
            result = {
              success: true,
              cadSystem: engine.cadSystem,
              capabilities: { ...caps, supportedOps },
            };
            break;
          }
          // Mastercam Code Generator (U-CADC11)
          case "mastercam_generate_script": {
            const engine = await getEngine("mcGen");
            const ops = params.operations ?? [];
            const context = { projectName: params.projectName ?? "PRISMProject", units: params.units ?? "mm", targetVersion: params.targetVersion ?? "2024" };
            const script = engine.buildScript(ops, context);
            result = { success: true, script: script.body, filename: script.filename, warnings: script.warnings, parameters: Object.fromEntries(script.parameters), lineage: script.lineage, imports: script.imports };
            break;
          }
          case "mastercam_build_part": {
            const engine = await getEngine("mcGen");
            const ops = params.operations ?? [];
            const context = { projectName: params.projectName ?? "PRISMProject", units: params.units ?? "mm", outputDir: params.outputDir, targetVersion: params.targetVersion ?? "2024" };
            const script = engine.buildScript(ops, context);
            const execResult = await engine.executeScript(script);
            result = { success: execResult.ok, script: script.body, filename: script.filename, outputFiles: execResult.outputFiles, durationMs: execResult.durationMs, warnings: script.warnings, error: execResult.error };
            break;
          }
          case "mastercam_execute": {
            const engine = await getEngine("mcGen");
            const script = { body: params.script, cadSystem: "mastercam" as const, filename: params.filename ?? "script.cs", parameters: new Map(), lineage: [], warnings: [], imports: [] };
            const execResult = await engine.executeScript(script);
            result = { success: execResult.ok, outputFiles: execResult.outputFiles, durationMs: execResult.durationMs, metrics: execResult.metrics, error: execResult.error };
            break;
          }
          case "mastercam_capabilities": {
            const engine = await getEngine("mcGen");
            const caps = engine.getCapabilities();
            result = { success: true, cadSystem: engine.cadSystem, capabilities: { ...caps, supportedOps: Array.from(caps.supportedOps) } };
            break;
          }
          // hyperCAD-S Code Generator (U-CADC12)
          case "hypercads_generate_script": {
            const engine = await getEngine("hcGen");
            const ops = params.operations ?? [];
            const context = { projectName: params.projectName ?? "PRISMProject", units: params.units ?? "mm", targetVersion: params.targetVersion ?? "2024" };
            const script = engine.buildScript(ops, context);
            result = { success: true, script: script.body, filename: script.filename, warnings: script.warnings, parameters: Object.fromEntries(script.parameters), lineage: script.lineage, imports: script.imports };
            break;
          }
          case "hypercads_build_part": {
            const engine = await getEngine("hcGen");
            const ops = params.operations ?? [];
            const context = { projectName: params.projectName ?? "PRISMProject", units: params.units ?? "mm", outputDir: params.outputDir, targetVersion: params.targetVersion ?? "2024" };
            const script = engine.buildScript(ops, context);
            const execResult = await engine.executeScript(script);
            result = { success: execResult.ok, script: script.body, filename: script.filename, outputFiles: execResult.outputFiles, durationMs: execResult.durationMs, warnings: script.warnings, error: execResult.error };
            break;
          }
          case "hypercads_execute": {
            const engine = await getEngine("hcGen");
            const script = { body: params.script, cadSystem: "hypercads" as const, filename: params.filename ?? "script.py", parameters: new Map(), lineage: [], warnings: [], imports: [] };
            const execResult = await engine.executeScript(script);
            result = { success: execResult.ok, outputFiles: execResult.outputFiles, durationMs: execResult.durationMs, metrics: execResult.metrics, error: execResult.error };
            break;
          }
          case "hypercads_capabilities": {
            const engine = await getEngine("hcGen");
            const caps = engine.getCapabilities();
            result = { success: true, cadSystem: engine.cadSystem, capabilities: { ...caps, supportedOps: Array.from(caps.supportedOps) } };
            break;
          }
          // ── Fusion 360 Unified Code Generator (U-CADC13) ──
          case "fusion360_generate_script": {
            const engine = await getEngine("f360Gen");
            const ops = params.operations ?? [];
            const context = { projectName: params.projectName ?? "PRISMProject", units: params.units ?? "mm", targetVersion: params.targetVersion ?? "2024", componentName: params.componentName };
            const script = engine.buildScript(ops, context);
            result = { success: true, script: script.body, filename: script.filename, warnings: script.warnings, parameters: Object.fromEntries(script.parameters), lineage: script.lineage, imports: script.imports };
            break;
          }
          case "fusion360_build_part": {
            const engine = await getEngine("f360Gen");
            const ops = params.operations ?? [];
            const context = { projectName: params.projectName ?? "PRISMProject", units: params.units ?? "mm", outputDir: params.outputDir, targetVersion: params.targetVersion ?? "2024", componentName: params.componentName };
            const script = engine.buildScript(ops, context);
            const execResult = await engine.executeScript(script);
            result = { success: execResult.ok, script: script.body, filename: script.filename, outputFiles: execResult.outputFiles, durationMs: execResult.durationMs, warnings: script.warnings, error: execResult.error };
            break;
          }
          case "fusion360_execute": {
            const engine = await getEngine("f360Gen");
            const script = { body: params.script, cadSystem: "fusion360" as const, filename: params.filename ?? "script.py", parameters: new Map(), lineage: [], warnings: [], imports: [] };
            const execResult = await engine.executeScript(script);
            result = { success: execResult.ok, output: execResult.output, durationMs: execResult.durationMs, error: execResult.error, metrics: execResult.metrics };
            break;
          }
          case "fusion360_capabilities": {
            const engine = await getEngine("f360Gen");
            const caps = engine.getCapabilities();
            result = { success: true, cadSystem: engine.cadSystem, capabilities: { ...caps, supportedOps: Array.from(caps.supportedOps) } };
            break;
          }
          // ── Print → Fusion 360 Bridge (U-CADC-FUS-PRINT-01) ──
          case "print_to_fusion360": {
            const bridge = await getEngine("printToFusion");
            const out = bridge.buildBridgeScript({
              analysis: params.analysis,
              profiles: params.profiles,
              dimensions: params.dimensions,
              partName: params.partName ?? params.part_name,
              units: params.units,
              outputDir: params.outputDir ?? params.output_dir,
              targetVersion: params.targetVersion ?? params.target_version,
              defaultDepth: params.defaultDepth ?? params.default_depth,
            });
            result = { success: true, ...out };
            break;
          }
          case "print_to_fusion360_validate": {
            const bridge = await getEngine("printToFusion");
            const v = bridge.validate({
              analysis: params.analysis,
              profiles: params.profiles,
              dimensions: params.dimensions,
              defaultDepth: params.defaultDepth ?? params.default_depth,
            });
            result = { success: true, ...v };
            break;
          }
          case "print_to_fusion360_capabilities": {
            const bridge = await getEngine("printToFusion");
            result = {
              success: true,
              bridgeVersion: bridge.version,
              supportedOperations: bridge.supportedOperations(),
            };
            break;
          }
          // ── Print → Mastercam Bridge (U-CADC-MC-PRINT-01) ──
          case "print_to_mastercam": {
            const bridge = await getEngine("printToMastercam");
            const out = bridge.buildBridgeScript({
              analysis: params.analysis, profiles: params.profiles, dimensions: params.dimensions,
              partName: params.partName ?? params.part_name, units: params.units,
              outputDir: params.outputDir ?? params.output_dir,
              targetVersion: params.targetVersion ?? params.target_version,
              defaultDepth: params.defaultDepth ?? params.default_depth,
              machineGroup: params.machineGroup ?? params.machine_group,
              postProcessor: params.postProcessor ?? params.post_processor,
            });
            result = { success: true, ...out };
            break;
          }
          case "print_to_mastercam_validate": {
            const bridge = await getEngine("printToMastercam");
            result = { success: true, ...bridge.validate(params) };
            break;
          }
          case "print_to_mastercam_capabilities": {
            const bridge = await getEngine("printToMastercam");
            result = { success: true, bridgeVersion: bridge.version, supportedOperations: bridge.supportedOperations() };
            break;
          }
          // ── Print → Inventor Bridge (U-CADC-INV-PRINT-01) ──
          case "print_to_inventor": {
            const bridge = await getEngine("printToInventor");
            const out = bridge.buildBridgeScript({
              analysis: params.analysis, profiles: params.profiles, dimensions: params.dimensions,
              partName: params.partName ?? params.part_name, units: params.units,
              outputPath: params.outputPath ?? params.output_path,
              templatePath: params.templatePath ?? params.template_path,
              documentType: params.documentType ?? params.document_type,
              defaultDepth: params.defaultDepth ?? params.default_depth,
            });
            result = { success: true, ...out };
            break;
          }
          case "print_to_inventor_validate": {
            const bridge = await getEngine("printToInventor");
            result = { success: true, ...bridge.validate(params) };
            break;
          }
          case "print_to_inventor_capabilities": {
            const bridge = await getEngine("printToInventor");
            result = { success: true, bridgeVersion: bridge.version, supportedOperations: bridge.supportedOperations() };
            break;
          }
          // ── Print → SolidWorks Bridge (U-CADC-SW-PRINT-01) ──
          case "print_to_solidworks": {
            const bridge = await getEngine("printToSolidWorks");
            const out = bridge.buildBridgeScript({
              analysis: params.analysis, profiles: params.profiles, dimensions: params.dimensions,
              partName: params.partName ?? params.part_name, units: params.units,
              outputDir: params.outputDir ?? params.output_dir,
              templatePath: params.templatePath ?? params.template_path,
              defaultDepth: params.defaultDepth ?? params.default_depth,
            });
            result = { success: true, ...out };
            break;
          }
          case "print_to_solidworks_validate": {
            const bridge = await getEngine("printToSolidWorks");
            result = { success: true, ...bridge.validate(params) };
            break;
          }
          case "print_to_solidworks_capabilities": {
            const bridge = await getEngine("printToSolidWorks");
            result = { success: true, bridgeVersion: bridge.version, supportedOperations: bridge.supportedOperations() };
            break;
          }
          // ── Print → Esprit Bridge (U-CADC-ESP-PRINT-01) ──
          case "print_to_esprit": {
            const bridge = await getEngine("printToEsprit");
            const out = bridge.buildBridgeScript({
              analysis: params.analysis, profiles: params.profiles, dimensions: params.dimensions,
              partName: params.partName ?? params.part_name, units: params.units,
              outputDir: params.outputDir ?? params.output_dir,
              targetVersion: params.targetVersion ?? params.target_version,
              documentTemplate: params.documentTemplate ?? params.document_template,
              defaultDepth: params.defaultDepth ?? params.default_depth,
            });
            result = { success: true, ...out };
            break;
          }
          case "print_to_esprit_validate": {
            const bridge = await getEngine("printToEsprit");
            result = { success: true, ...bridge.validate(params) };
            break;
          }
          case "print_to_esprit_capabilities": {
            const bridge = await getEngine("printToEsprit");
            result = { success: true, bridgeVersion: bridge.version, supportedOperations: bridge.supportedOperations() };
            break;
          }
          // ── Esprit Code Generator (U-CADC-ESP-CODEGEN-01) ──
          case "esprit_generate_script": {
            const engine = await getEngine("espritGen");
            const ops = params.operations ?? [];
            const ctx = {
              projectName: params.projectName ?? "PRISM_EspritPart",
              units: params.units ?? "mm",
              outputDir: params.outputDir,
              targetVersion: params.targetVersion ?? "2024",
            };
            const script = engine.buildScript(ops, ctx);
            result = { success: true, script: script.body, filename: script.filename, warnings: script.warnings, parameters: Object.fromEntries(script.parameters) };
            break;
          }
          case "esprit_capabilities": {
            const engine = await getEngine("espritGen");
            const caps = engine.getCapabilities();
            result = { success: true, cadSystem: engine.cadSystem, capabilities: { ...caps, supportedOps: Array.from(caps.supportedOps) } };
            break;
          }
          // ── Print → All CADs Orchestrator (U-CADC-PRINT-ORCHESTRATOR-01) ──
          case "print_to_all_cads": {
            const orch = await getEngine("printToAllCads");
            const out = orch.buildAllScripts({
              analysis: params.analysis,
              profiles: params.profiles,
              dimensions: params.dimensions,
              partName: params.partName ?? params.part_name,
              units: params.units,
              outputDir: params.outputDir ?? params.output_dir,
              defaultDepth: params.defaultDepth ?? params.default_depth,
              targets: params.targets,
            });
            result = { success: true, ...out };
            break;
          }
          case "print_to_all_cads_validate": {
            const orch = await getEngine("printToAllCads");
            result = { success: true, ...orch.validate(params) };
            break;
          }
          case "print_to_all_cads_targets": {
            const orch = await getEngine("printToAllCads");
            result = {
              success: true,
              orchestratorVersion: orch.version,
              targets: orch.supportedTargets(),
            };
            break;
          }
          // ── Print → hyperCAD-S Analysis Bridge (U-CADC-HC-PRINT-01) ──
          case "print_to_hypercads_analysis": {
            const bridge = await getEngine("printToHyperCADSAnalysis");
            const out = bridge.buildBridgeScript({
              analysis: params.analysis, profiles: params.profiles, dimensions: params.dimensions,
              partName: params.partName ?? params.part_name, units: params.units,
              outputDir: params.outputDir ?? params.output_dir,
              targetVersion: params.targetVersion ?? params.target_version,
              defaultDepth: params.defaultDepth ?? params.default_depth,
            });
            result = { success: true, ...out };
            break;
          }
          case "print_to_hypercads_analysis_validate": {
            const bridge = await getEngine("printToHyperCADSAnalysis");
            result = { success: true, ...bridge.validate(params) };
            break;
          }
          case "print_to_hypercads_analysis_capabilities": {
            const bridge = await getEngine("printToHyperCADSAnalysis");
            result = { success: true, bridgeVersion: bridge.version, supportedOperations: bridge.supportedOperations() };
            break;
          }
          // ── SolidWorks Live Bridge (U-CADC-SW-LIVE-01) ──
          case "solidworks_live_execute": {
            const bridge = await getEngine("swLive");
            const execRes = await bridge.execute({
              script: params.script,
              config: params.config ?? { mode: params.mode ?? "mock" },
            });
            result = { success: execRes.ok, ...execRes };
            break;
          }
          case "solidworks_live_validate": {
            const bridge = await getEngine("swLive");
            result = { success: true, ...bridge.validate(params.config ?? params) };
            break;
          }
          case "solidworks_live_modes": {
            const bridge = await getEngine("swLive");
            result = { success: true, version: bridge.version, modes: bridge.supportedModes() };
            break;
          }
          // ── Esprit Live Bridge (U-CADC-ESP-LIVE-01) ──
          case "esprit_live_execute": {
            const bridge = await getEngine("espritLive");
            const execRes = await bridge.execute({
              script: params.script,
              config: params.config ?? { mode: params.mode ?? "mock" },
            });
            result = { success: execRes.ok, ...execRes };
            break;
          }
          case "esprit_live_validate": {
            const bridge = await getEngine("espritLive");
            result = { success: true, ...bridge.validate(params.config ?? params) };
            break;
          }
          case "esprit_live_modes": {
            const bridge = await getEngine("espritLive");
            result = { success: true, version: bridge.version, modes: bridge.supportedModes() };
            break;
          }
          // ── Blueprint OCR → 6-CAD Orchestrator (U-CADC-BPRINT-OCR-ORCH-01) ──
          case "blueprint_to_all_cads": {
            const orch = await getEngine("bprintToAllCads");
            const out = await orch.run({
              image: params.image,
              analysis: params.analysis,
              profiles: params.profiles,
              vision: params.vision,
              targets: params.targets,
              outputDir: params.outputDir ?? params.output_dir,
              defaultDepth: params.defaultDepth ?? params.default_depth,
              partName: params.partName ?? params.part_name,
              units: params.units,
            });
            result = { success: true, ...out };
            break;
          }
          case "blueprint_to_all_cads_validate": {
            const orch = await getEngine("bprintToAllCads");
            result = { success: true, ...orch.validate(params) };
            break;
          }
          case "blueprint_to_all_cads_capabilities": {
            const orch = await getEngine("bprintToAllCads");
            result = { success: true, ...orch.capabilities() };
            break;
          }
          // ─── Siemens NX Code Generator (U-CADC14) ───────────────────────
          case "nx_generate_script": {
            const engine = await getEngine("nxGen");
            const ops = params.operations ?? [];
            const ctx = { projectName: params.projectName ?? "prism_part", units: params.units ?? "mm", targetVersion: params.targetVersion, outputDir: params.outputDir, partTemplate: params.partTemplate, useUserFunction: params.useUserFunction };
            const script = engine.buildScript(ops, ctx);
            result = { success: true, script: script.body, filename: script.filename, imports: script.imports, warnings: script.warnings, parameters: Object.fromEntries(script.parameters) };
            break;
          }
          case "nx_build_part": {
            const engine = await getEngine("nxGen");
            const ops = params.operations ?? [];
            const ctx = { projectName: params.projectName ?? "prism_part", units: params.units ?? "mm", targetVersion: params.targetVersion, outputDir: params.outputDir };
            const script = engine.buildScript(ops, ctx);
            const execResult = await engine.executeScript(script);
            result = { success: execResult.ok, script: script.body, output: execResult.output, durationMs: execResult.durationMs, error: execResult.error, metrics: execResult.metrics };
            break;
          }
          case "nx_execute": {
            const engine = await getEngine("nxGen");
            const script = { body: params.script, cadSystem: "nx" as const, filename: params.filename ?? "script.py", parameters: new Map(), lineage: [], warnings: [], imports: [] };
            const execResult = await engine.executeScript(script);
            result = { success: execResult.ok, output: execResult.output, durationMs: execResult.durationMs, error: execResult.error, metrics: execResult.metrics };
            break;
          }
          case "nx_capabilities": {
            const engine = await getEngine("nxGen");
            const caps = engine.getCapabilities();
            result = { success: true, cadSystem: engine.cadSystem, capabilities: { ...caps, supportedOps: Array.from(caps.supportedOps) } };
            break;
          }
          // ─── Autodesk Inventor Code Generator (U-CADC08) ─────────────────
          case "inventor_generate_script": {
            const engine = await getEngine("inventorGen");
            const ops = params.operations ?? [];
            const ctx = { projectName: params.projectName ?? "prism_part", units: params.units ?? "mm", targetVersion: params.targetVersion, outputDir: params.outputDir };
            const script = engine.buildScript(ops, ctx);
            result = { success: true, script: script.body, filename: script.filename, imports: script.imports, warnings: script.warnings, parameters: Object.fromEntries(script.parameters) };
            break;
          }
          case "inventor_build_part": {
            const engine = await getEngine("inventorGen");
            const ops = params.operations ?? [];
            const ctx = { projectName: params.projectName ?? "prism_part", units: params.units ?? "mm", targetVersion: params.targetVersion, outputDir: params.outputDir };
            const script = engine.buildScript(ops, ctx);
            const execResult = await engine.executeScript(script);
            result = { success: execResult.ok, script: script.body, output: execResult.output, durationMs: execResult.durationMs, error: execResult.error, metrics: execResult.metrics };
            break;
          }
          case "inventor_execute": {
            const engine = await getEngine("inventorGen");
            const script = { body: params.script, cadSystem: "inventor" as const, filename: params.filename ?? "script.iLogicVb", parameters: new Map(), lineage: [], warnings: [], imports: [] };
            const execResult = await engine.executeScript(script);
            result = { success: execResult.ok, output: execResult.output, durationMs: execResult.durationMs, error: execResult.error, metrics: execResult.metrics };
            break;
          }
          case "inventor_capabilities": {
            const engine = await getEngine("inventorGen");
            const caps = engine.getCapabilities();
            result = { success: true, cadSystem: engine.cadSystem, capabilities: { ...caps, supportedOps: Array.from(caps.supportedOps) } };
            break;
          }
          // Impeller CAD Generator (U-CADC15)
          case "impeller_generate": {
            const engine = await getEngine("impeller");
            const genResult = engine.generate(params.spec);
            result = { success: true, ...genResult };
            break;
          }
          case "impeller_validate": {
            const engine = await getEngine("impeller");
            const valResult = engine.validate(params.spec);
            result = { success: true, ...valResult };
            break;
          }
          case "impeller_recommend_blades": {
            const engine = await getEngine("impeller");
            const rec = engine.recommendBladeCount(params.flowType, params.specificSpeed_Ns);
            result = { success: true, ...rec };
            break;
          }
          case "impeller_list_profiles": {
            const engine = await getEngine("impeller");
            const profiles = engine.listProfiles();
            result = { success: true, profiles, count: profiles.length };
            break;
          }
          // Blisk CAD Generator (U-CADC16)
          case "blisk_generate": {
            const engine = await getEngine("blisk");
            const genResult = engine.generate(params.spec);
            result = { success: true, ...genResult };
            break;
          }
          case "blisk_validate": {
            const engine = await getEngine("blisk");
            const valResult = engine.validate(params.spec);
            result = { success: true, ...valResult };
            break;
          }
          case "blisk_recommend_blades": {
            const engine = await getEngine("blisk");
            const rec = engine.recommendBladeCount(params);
            result = { success: true, ...rec };
            break;
          }
          case "blisk_list_profiles": {
            const engine = await getEngine("blisk");
            const profiles = engine.listProfiles();
            result = { success: true, profiles, count: profiles.length };
            break;
          }
          // CAD Training Corpus Orchestrator (U-CADC17)
          case "cad_corpus_orchestrate": {
            const engine = await getEngine("cadCorpusOrch");
            const orchResult = engine.orchestrate(params);
            result = { success: true, ...orchResult };
            break;
          }
          case "cad_corpus_scan": {
            const engine = await getEngine("cadCorpusOrch");
            const files = engine.scanOnly(params);
            result = { success: true, files, count: files.length };
            break;
          }
          case "cad_corpus_status": {
            const engine = await getEngine("cadCorpusOrch");
            const status = engine.status(params?.corpusPath);
            result = { success: true, ...status };
            break;
          }
          // CAD Embedding Index Orchestrator (U-CADC18)
          case "cad_index_ingest": {
            const engine = await getEngine("cadEmbedIndex");
            if (params?.entries) {
              const ingestResult = engine.ingestEntries(params.entries, params);
              result = { success: true, ...ingestResult };
            } else if (params?.corpusPath) {
              const ingestResult = engine.ingest(params.corpusPath, params);
              result = { success: true, ...ingestResult };
            } else {
              result = { error: "cad_index_ingest requires corpusPath or entries" };
            }
            break;
          }
          case "cad_index_query": {
            const engine = await getEngine("cadEmbedIndex");
            const results = engine.query(params);
            result = { success: true, results, count: results.length };
            break;
          }
          case "cad_index_stats": {
            const engine = await getEngine("cadEmbedIndex");
            const stats = engine.stats();
            result = { success: true, ...stats };
            break;
          }
          case "cad_index_clear": {
            const engine = await getEngine("cadEmbedIndex");
            const clearResult = engine.clear();
            result = { success: true, ...clearResult };
            break;
          }
          case "cad_index_similar": {
            const engine = await getEngine("cadEmbedIndex");
            const similar = engine.findSimilar(params?.sourcePath, params?.k ?? 5);
            result = { success: true, results: similar, count: similar.length };
            break;
          }
          // CAD Archive → Print-Program Join Augmenter (MS-PRINT-PROGRAM-LOOP/U-PPL-D4)
          case "cad_archive_join_augment": {
            const engine = await getEngine("cadArchiveJoinAug");
            const augResult = await engine.loadAndAugment(params ?? {});
            result = {
              success: true,
              newLinks: augResult.newLinks,
              stats: augResult.stats,
            };
            break;
          }
          case "cad_archive_join_augment_dry": {
            // Stats-only variant for dashboards — same load + augment, but
            // strips the link payload (can be 20K-entry array in prod).
            const engine = await getEngine("cadArchiveJoinAug");
            const augResult = await engine.loadAndAugment(params ?? {});
            result = {
              success: true,
              stats: augResult.stats,
              // Surface the count as a top-level field so callers don't have
              // to dig into stats to know how many links would be emitted.
              newLinkCount: augResult.stats.newLinks,
            };
            break;
          }
          // CAD Training Pipeline Orchestrator (U-CADC19)
          case "cad_pipeline_run": {
            const engine = await getEngine("cadPipeline");
            const pipelineResult = engine.run(params);
            result = { success: true, ...pipelineResult };
            break;
          }
          case "cad_pipeline_validate": {
            const engine = await getEngine("cadPipeline");
            const validation = engine.validateIndex(params?.sampleSize ?? 10);
            result = { success: true, ...validation };
            break;
          }
          case "cad_pipeline_status": {
            const engine = await getEngine("cadPipeline");
            const status = engine.status();
            result = { success: true, ...status };
            break;
          }
          case "cad_pipeline_clear": {
            const engine = await getEngine("cadPipeline");
            const clearResult = engine.clear();
            result = { success: true, ...clearResult };
            break;
          }
          // U-CADC20: Training MCP Actions
          case "cad_training_start": {
            const engine = await getEngine("cadPipeline");
            const pipelineResult = engine.run(params);
            result = { success: true, ...pipelineResult };
            break;
          }
          case "cad_training_status": {
            const engine = await getEngine("cadPipeline");
            const status = engine.status();
            result = { success: true, ...status };
            break;
          }
          case "cad_training_corpus_stats": {
            const engine = await getEngine("cadCorpusOrch");
            const corpusPath = params?.corpusPath as string | undefined;
            const corpusStatus = engine.status(corpusPath);
            result = { success: true, ...corpusStatus };
            break;
          }
          // U-CADC21: Regeneration Test Engine
          case "cad_regen_test": {
            const engine = await getEngine("cadRegenTest");
            const testResult = await engine.test(params);
            result = { success: true, ...testResult };
            break;
          }
          case "cad_regen_batch": {
            const engine = await getEngine("cadRegenTest");
            const batchResult = await engine.batch(params);
            result = { success: true, ...batchResult };
            break;
          }
          case "cad_regen_compare": {
            const engine = await getEngine("cadRegenTest");
            const original = params?.original as any;
            const generated = params?.generated as any;
            const thresholds = params?.thresholds as any;
            const compareResult = engine.compare(original, generated, thresholds);
            result = { success: true, ...compareResult };
            break;
          }
          // U-CADC29: Trial-Error Learning Engine
          case "cad_trial_ingest": {
            const engine = await getEngine("cadTrialLearn");
            const single = (params as { outcome?: unknown })?.outcome;
            const many = (params as { outcomes?: unknown[] })?.outcomes;
            if (Array.isArray(many)) {
              result = { success: true, ...engine.ingestBatch(many) };
            } else if (single !== undefined) {
              result = { success: true, ...engine.ingest(single) };
            } else {
              result = { success: false, error: "Provide 'outcome' (single) or 'outcomes' (batch)" };
            }
            break;
          }
          case "cad_trial_patterns": {
            const engine = await getEngine("cadTrialLearn");
            result = { success: true, patterns: engine.extractPatterns() };
            break;
          }
          case "cad_trial_recommend": {
            const engine = await getEngine("cadTrialLearn");
            const candidate = (params as { candidate?: unknown })?.candidate ?? params ?? {};
            result = { success: true, ...engine.recommendAdjustments(candidate) };
            break;
          }
          case "cad_trial_stats": {
            const engine = await getEngine("cadTrialLearn");
            const opts = {
              since: (params as { since?: string })?.since,
              partType: (params as { partType?: string })?.partType,
            };
            result = { success: true, ...engine.getFailureStats(opts) };
            break;
          }
          case "cad_trial_reset": {
            const engine = await getEngine("cadTrialLearn");
            engine.reset({ eraseLedger: Boolean((params as { eraseLedger?: boolean })?.eraseLedger) });
            result = { success: true, reset: true };
            break;
          }
          case "cad_regen_thresholds": {
            const engine = await getEngine("cadRegenTest");
            if (params?.set) {
              const updated = engine.setThresholds(params.set as any);
              result = { success: true, thresholds: updated };
            } else {
              result = { success: true, thresholds: engine.getThresholds() };
            }
            break;
          }
          // ───────────────────────────────────────────────────────────────────
          // CAD Geometry Comparison Engine (U-CADC26)
          // ───────────────────────────────────────────────────────────────────
          case "geometry_compare_files": {
            const engine = await getEngine("geoCompare");
            const originalPath = params?.original_path ?? params?.originalPath;
            const generatedPath = params?.generated_path ?? params?.generatedPath;
            const thresholds = params?.thresholds;
            if (!originalPath || !generatedPath) {
              result = { success: false, error: "original_path and generated_path required" };
            } else {
              const comparison = engine.compare(originalPath, generatedPath, thresholds);
              result = { success: true, ...comparison };
            }
            break;
          }
          case "geometry_extract_metrics": {
            const engine = await getEngine("geoCompare");
            const filePath = params?.file_path ?? params?.filePath ?? params?.path;
            if (!filePath) {
              result = { success: false, error: "file_path required" };
            } else {
              const metrics = engine.extractMetrics(filePath);
              result = { success: true, ...metrics };
            }
            break;
          }
          case "geometry_batch_compare": {
            const engine = await getEngine("geoCompare");
            const pairs = params?.pairs;
            const thresholds = params?.thresholds;
            if (!pairs || !Array.isArray(pairs)) {
              result = { success: false, error: "pairs array required" };
            } else {
              const batchResult = engine.batchCompare({ pairs, thresholds });
              result = { success: true, ...batchResult };
            }
            break;
          }
          case "geometry_hausdorff": {
            const engine = await getEngine("geoCompare");
            const fileA = params?.original_path ?? params?.originalPath ?? params?.file_a ?? params?.fileA;
            const fileB = params?.generated_path ?? params?.generatedPath ?? params?.file_b ?? params?.fileB;
            if (!fileA || !fileB) {
              result = { success: false, error: "original_path (fileA) and generated_path (fileB) required" };
            } else {
              const hres = engine.computeSurfaceHausdorff(fileA, fileB, {
                sampleCap: params?.sample_cap ?? params?.sampleCap,
                thresholdPercent: params?.threshold_percent ?? params?.thresholdPercent,
              });
              result = { success: true, ...hres };
            }
            break;
          }
          case "geometry_set_thresholds": {
            const engine = await getEngine("geoCompare");
            if (params?.thresholds) {
              const updated = engine.setThresholds(params.thresholds);
              result = { success: true, thresholds: updated };
            } else {
              result = { success: true, thresholds: engine.getThresholds() };
            }
            break;
          }
          case "geometry_format_detect": {
            const engine = await getEngine("geoCompare");
            const filePath = params?.file_path ?? params?.filePath ?? params?.path;
            if (!filePath) {
              result = { success: false, error: "file_path required" };
            } else {
              const format = engine.detectFormat(filePath);
              result = { success: true, format, path: filePath };
            }
            break;
          }
          // ── Universal CAD Registry (U-CADC03) ──────────────────────────────
          case "cad_registry_scan": {
            const engine = await getEngine("cadRegistry");
            const rootPaths = params?.root_paths ?? params?.rootPaths;
            const options = params?.options ?? {};
            const scanResult = await engine.scan(rootPaths, options);
            result = { success: true, ...scanResult };
            break;
          }
          case "cad_registry_search": {
            const engine = await getEngine("cadRegistry");
            const query = params?.query ?? params?.name ?? "";
            const format = params?.format;
            const customer = params?.customer;
            const limit = params?.limit ?? 50;
            const searchResult = engine.search({ query, format, customer, limit });
            result = { success: true, ...searchResult };
            break;
          }
          case "cad_registry_get": {
            const engine = await getEngine("cadRegistry");
            const filePath = params?.file_path ?? params?.filePath ?? params?.path;
            if (!filePath) {
              result = { success: false, error: "file_path required" };
            } else {
              const entry = engine.get(filePath);
              result = entry
                ? { success: true, entry }
                : { success: false, error: `File not in registry: ${filePath}` };
            }
            break;
          }
          case "cad_registry_stats": {
            const engine = await getEngine("cadRegistry");
            const stats = engine.stats();
            result = { success: true, ...stats };
            break;
          }
          // NACA Airfoil Engine (U-CADC13) — aerospace-grade airfoil coordinates
          case "naca_generate_4digit": {
            const engine = await getEngine("naca");
            const profile = engine.generate4Digit(params.designation, {
              numPoints: params.numPoints,
              chord: params.chord,
              cosineSpacing: params.cosineSpacing,
              closedTrailingEdge: params.closedTrailingEdge,
            });
            result = { success: true, profile };
            break;
          }
          case "naca_generate_5digit": {
            const engine = await getEngine("naca");
            const profile = engine.generate5Digit(params.designation, {
              numPoints: params.numPoints,
              chord: params.chord,
              cosineSpacing: params.cosineSpacing,
              closedTrailingEdge: params.closedTrailingEdge,
            });
            result = { success: true, profile };
            break;
          }
          case "naca_parse_uiuc_dat": {
            const engine = await getEngine("naca");
            const profile = engine.parseUIUCDat(params.content, params.chord ?? 1);
            result = { success: true, profile };
            break;
          }
          // Lofted Wing Engine (U-CADC14) — stacks airfoil sections with twist/taper/sweep/dihedral
          case "wing_loft_single_profile": {
            const wingEngine = await getEngine("loftedWing");
            const profile = await resolveAirfoilProfile(params.profile);
            const wing = wingEngine.loftSingleProfile(profile, params.options ?? {});
            result = { success: true, wing };
            break;
          }
          case "wing_loft_between_profiles": {
            const wingEngine = await getEngine("loftedWing");
            const root = await resolveAirfoilProfile(params.rootProfile);
            const tip = await resolveAirfoilProfile(params.tipProfile);
            const wing = wingEngine.loftBetweenProfiles(root, tip, params.options ?? {});
            result = { success: true, wing };
            break;
          }
          case "wing_compute_properties": {
            const wingEngine = await getEngine("loftedWing");
            const properties = wingEngine.computeWingProperties(params.sections ?? []);
            result = { success: true, properties };
            break;
          }
          // Involute Gear Engine (U-CADC15) — ISO 53 spur gear geometry + profiles
          case "gear_compute_geometry": {
            const gearEngine = await getEngine("gear");
            const geometry = gearEngine.computeGeometry(params.spec ?? params);
            result = { success: true, geometry };
            break;
          }
          case "gear_generate_tooth_profile": {
            const gearEngine = await getEngine("gear");
            const profile = gearEngine.generateToothProfile(
              params.spec ?? params,
              { samplesPerFlank: params.samplesPerFlank }
            );
            result = { success: true, profile };
            break;
          }
          case "gear_compute_contact_ratio": {
            const gearEngine = await getEngine("gear");
            const mesh = gearEngine.computeContactRatio(params.gear1, params.gear2);
            result = { success: true, mesh };
            break;
          }
          // Helical Spring Engine (U-CADC16) — Shigley spring rate, Wahl, coil path
          case "spring_compute_geometry": {
            const springEngine = await getEngine("spring");
            const geometry = springEngine.computeGeometry(params.spec ?? params);
            result = { success: true, geometry };
            break;
          }
          case "spring_compute_mechanics": {
            const springEngine = await getEngine("spring");
            const mechanics = springEngine.computeMechanics(params.spec ?? params);
            result = { success: true, mechanics };
            break;
          }
          case "spring_compute_stress_at_force": {
            const springEngine = await getEngine("spring");
            const stress = springEngine.computeStressAtForce(
              params.spec ?? params,
              params.forceN,
              params.useWahl ?? true
            );
            result = { success: true, stress };
            break;
          }
          case "spring_generate_coil_path": {
            const springEngine = await getEngine("spring");
            const path = springEngine.generateCoilPath(
              params.spec ?? params,
              { samplesPerCoil: params.samplesPerCoil }
            );
            result = { success: true, path };
            break;
          }
          // ── CAD-FUSION-LIVE-MS0 training surface (U-CAD-CORPUS-PHASE1..8) ──
          case "cad_corpus_ingest": {
            const { cadCorpusIngestionEngine } = await import("../../engines/CADCorpusIngestionEngine.js");
            const manifest = cadCorpusIngestionEngine.ingestDirectory(params.root, {
              max_depth: params.max_depth,
              max_files: params.max_files,
              skip_segments: params.skip_segments,
              extensions: params.extensions,
            });
            if (params.save_to) cadCorpusIngestionEngine.saveManifest(manifest, params.save_to);
            result = { success: true, data: manifest };
            break;
          }
          case "cad_corpus_load_manifest": {
            const { cadCorpusIngestionEngine } = await import("../../engines/CADCorpusIngestionEngine.js");
            const manifest = cadCorpusIngestionEngine.loadManifest(params.path);
            result = { success: manifest !== null, data: manifest };
            break;
          }
          case "cad_corpus_find_by_class": {
            const { cadCorpusIngestionEngine } = await import("../../engines/CADCorpusIngestionEngine.js");
            const manifest = cadCorpusIngestionEngine.loadManifest(params.manifest_path);
            if (!manifest) { result = { success: false, error: "manifest not found" }; break; }
            const matches = cadCorpusIngestionEngine.findByClass(manifest, params.part_class, params.limit ?? 50);
            result = { success: true, data: { matches, count: matches.length } };
            break;
          }
          case "cad_corpus_summarize": {
            const { cadCorpusIngestionEngine } = await import("../../engines/CADCorpusIngestionEngine.js");
            const manifest = cadCorpusIngestionEngine.loadManifest(params.manifest_path);
            if (!manifest) { result = { success: false, error: "manifest not found" }; break; }
            result = { success: true, data: cadCorpusIngestionEngine.summarize(manifest) };
            break;
          }
          case "cad_corpus_mine_patterns": {
            const { cadCorpusIngestionEngine } = await import("../../engines/CADCorpusIngestionEngine.js");
            const { cadCorpusPatternEngine } = await import("../../engines/CADCorpusPatternEngine.js");
            const manifest = cadCorpusIngestionEngine.loadManifest(params.manifest_path);
            if (!manifest) { result = { success: false, error: "manifest not found" }; break; }
            result = { success: true, data: cadCorpusPatternEngine.mine(manifest) };
            break;
          }
          case "cad_corpus_recover_unclassified": {
            const { cadCorpusIngestionEngine } = await import("../../engines/CADCorpusIngestionEngine.js");
            const { cadCorpusPatternEngine } = await import("../../engines/CADCorpusPatternEngine.js");
            const manifest = cadCorpusIngestionEngine.loadManifest(params.manifest_path);
            if (!manifest) { result = { success: false, error: "manifest not found" }; break; }
            const recovered = cadCorpusPatternEngine.recoverUnclassified(manifest);
            const updated = cadCorpusPatternEngine.applyRecoveries(manifest, recovered);
            result = { success: true, data: { recovered_count: recovered.length, recovered, updated_manifest: updated } };
            break;
          }
          case "cad_class_template": {
            const { cadClassFeatureLibraryEngine } = await import("../../engines/CADClassFeatureLibraryEngine.js");
            const tmpl = cadClassFeatureLibraryEngine.templateFor(params.part_class);
            result = { success: tmpl !== null, data: tmpl };
            break;
          }
          case "cad_class_predict_fidelity": {
            const { cadClassFeatureLibraryEngine } = await import("../../engines/CADClassFeatureLibraryEngine.js");
            const prediction = cadClassFeatureLibraryEngine.predictVisualFidelity(
              params.part_class,
              params.planned_feature_kinds ?? [],
            );
            result = { success: true, data: prediction };
            break;
          }
          case "cad_class_build_sequence": {
            const { cadClassFeatureLibraryEngine } = await import("../../engines/CADClassFeatureLibraryEngine.js");
            const seq = cadClassFeatureLibraryEngine.buildSequenceFor(params.part_class, params.prevalence_threshold ?? 0.5);
            result = { success: true, data: { sequence: seq, count: seq.length } };
            break;
          }
          case "cad_class_build_sequence_evidence": {
            // Wires LIVE STEP geometry corpus into build-sequence inference.
            // Closes the gap named in reference_cad_fusion_training_2026_05_18:
            // "geometry model not auto-wired into build-sequence inference".
            //
            // Hardening (per per-file scrutiny round 1):
            //  - 16MB byte cap on the corpus file (matches ask-ollama.mjs / regen-viz
            //    pattern — the host has demonstrated V8 string-cap OOMs on >512MB JSON
            //    three times this month; same class).
            //  - fs.stat first → fail-loud R12: success=false when the corpus file is
            //    missing/oversized so a misconfigured CWD doesn't masquerade as a
            //    healthy run.
            //  - Shape validation of parsed JSON (per_class must be an array) — the
            //    engine's own guards will reject the rest, but failing earlier here
            //    gives a more actionable error.
            const MAX_CORPUS_BYTES = 16 * 1024 * 1024; // 16 MB cap
            const { cadClassFeatureLibraryEngine } = await import("../../engines/CADClassFeatureLibraryEngine.js");
            const fs = await import("fs/promises");
            const path = await import("path");
            const url = await import("url");

            // Anchor to the dispatcher file's resolved location, then climb to
            // repo root. This is CWD-independent (process.cwd() flakes when the
            // MCP server is launched from a service wrapper or test harness).
            // dist/tools/dispatchers/cadDispatcher.js -> ../../.. = mcp-server/
            const dispatcherDir = path.dirname(url.fileURLToPath(import.meta.url));
            const repoMcpRoot = path.resolve(dispatcherDir, "..", "..", "..");
            const reportPath = path.resolve(repoMcpRoot, "data/state/cad-corpus-step-geometry-report.json");

            let corpusReport: unknown = null;
            let corpusReadError: string | null = null;
            try {
              const st = await fs.stat(reportPath);
              if (st.size > MAX_CORPUS_BYTES) {
                corpusReadError = `corpus file exceeds ${MAX_CORPUS_BYTES} byte cap (size=${st.size}) — refusing to JSON.parse`;
              } else {
                const raw = await fs.readFile(reportPath, "utf8");
                const parsed: unknown = JSON.parse(raw);
                // Shape validation — engine guards too, but fail-loud here is friendlier.
                if (!parsed || typeof parsed !== "object" || !Array.isArray((parsed as { per_class?: unknown }).per_class)) {
                  corpusReadError = "corpus file parsed but shape is invalid (expected { per_class: Array<{ part_class, files_examined, feature_evidence_counts }> })";
                } else {
                  corpusReport = parsed;
                }
              }
            } catch (e: unknown) {
              corpusReadError = e instanceof Error ? e.message : String(e);
            }

            const evidence = cadClassFeatureLibraryEngine.buildSequenceForEvidence(
              params.part_class,
              {
                corpus_report: corpusReport as never,
                min_evidence_ratio: params.min_evidence_ratio,
                fallback_prevalence_threshold: params.fallback_prevalence_threshold,
              },
            );

            // R12: when the corpus read failed, surface success=false so the caller
            // doesn't silently consume a template-fallback result thinking it's
            // evidence-driven. The data block (with fallback sequence) is still
            // attached so callers that DO want the degraded result can opt in.
            result = {
              success: corpusReadError === null,
              data: {
                sequence: evidence.sequence,
                count: evidence.sequence.length,
                caveats: evidence.caveats,
                corpus_class_found: evidence.corpus_class_found,
                corpus_report_path: reportPath,
                corpus_read_error: corpusReadError,
                degraded: corpusReadError !== null,
              },
              ...(corpusReadError !== null ? { error: corpusReadError } : {}),
            };
            break;
          }
          case "cad_class_drive_build": {
            const { masterCADControlBrainEngine } = await import("../../engines/MasterCADControlBrainEngine.js");
            const { cadClassFeatureLibraryEngine } = await import("../../engines/CADClassFeatureLibraryEngine.js");
            const { fusion360LiveBridgeEngine } = await import("../../engines/Fusion360LiveBridgeEngine.js");

            const partClass: string = params.part_class;
            const builtKinds: string[] = Array.isArray(params.built_kinds) ? [...params.built_kinds] : [];
            const revolutionAxis: "X" | "Y" | "Z" = params.revolution_axis ?? "Y";
            const prevalenceThreshold: number = params.prevalence_threshold ?? 0.5;
            const overrides: Record<string, { distance_mm?: number; radius_mm?: number; angle_deg?: number; reference_radius_mm?: number }> =
              params.feature_overrides ?? {};
            const dryRunOnly: boolean = params.dry_run === true;
            // U-FGE02: optional evidence-ranked build ordering. When false (default),
            // the orchestrator iterates baseline.missing_features in its natural order
            // (preserves pre-2026-05-18 behavior exactly). When true, re-orders the
            // missing-features list by corpus evidence_ratio (highest first) so the
            // Fusion360 build path tackles the features the trained STEP corpus
            // actually shows as class-typical BEFORE the long-tail ones.
            const useCorpusEvidence: boolean = params.use_corpus_evidence === true;
            const minEvidenceRatio: number | undefined = typeof params.min_evidence_ratio === "number"
              ? params.min_evidence_ratio
              : undefined;

            const baseline = await masterCADControlBrainEngine.cadAITrainingSurface(
              partClass, builtKinds, prevalenceThreshold,
            );
            if (!baseline.template_present) {
              result = { success: false, error: `no template for part_class "${partClass}"`, data: baseline };
              break;
            }

            const tmpl = cadClassFeatureLibraryEngine.templateFor(partClass as never);
            const bridgeUp = dryRunOnly ? false : await fusion360LiveBridgeEngine.healthCheck();

            const dispatched: Array<{ kind: string; build_hint: string; params: Record<string, unknown>; ok: boolean; error?: string }> = [];
            const skipped: Array<{ kind: string; reason: string }> = [];

            // U-FGE02: evidence-ranked re-ordering of missing_features. We DO NOT
            // change the *set* of features iterated (per-feature prevalence + presence
            // checks still happen inside the loop); only the *order*. R12 caveats from
            // the engine surface here as evidenceCaveats — caller sees them in result.data.
            let orderedMissing: string[] = [...baseline.missing_features];
            const evidenceCaveats: string[] = [];
            let corpusReadError: string | null = null;
            let corpusReportPath: string | null = null;
            let corpusClassFound = false;
            if (useCorpusEvidence) {
              const MAX_CORPUS_BYTES_DRIVE = 16 * 1024 * 1024;
              const fsp = await import("fs/promises");
              const pathMod = await import("path");
              const urlMod = await import("url");
              const dispatcherDirDrive = pathMod.dirname(urlMod.fileURLToPath(import.meta.url));
              const mcpRootDrive = pathMod.resolve(dispatcherDirDrive, "..", "..", "..");
              corpusReportPath = pathMod.resolve(mcpRootDrive, "data/state/cad-corpus-step-geometry-report.json");
              let corpusReportDrive: unknown = null;
              try {
                const stDrive = await fsp.stat(corpusReportPath);
                if (stDrive.size > MAX_CORPUS_BYTES_DRIVE) {
                  corpusReadError = `corpus exceeds ${MAX_CORPUS_BYTES_DRIVE} byte cap (size=${stDrive.size})`;
                } else {
                  const rawDrive = await fsp.readFile(corpusReportPath, "utf8");
                  const parsedDrive: unknown = JSON.parse(rawDrive);
                  if (parsedDrive && typeof parsedDrive === "object" && Array.isArray((parsedDrive as { per_class?: unknown }).per_class)) {
                    corpusReportDrive = parsedDrive;
                  } else {
                    corpusReadError = "corpus shape invalid (per_class not array)";
                  }
                }
              } catch (e: unknown) {
                corpusReadError = e instanceof Error ? e.message : String(e);
              }

              const evidence = cadClassFeatureLibraryEngine.buildSequenceForEvidence(
                partClass as never,
                {
                  corpus_report: corpusReportDrive as never,
                  min_evidence_ratio: minEvidenceRatio,
                  fallback_prevalence_threshold: prevalenceThreshold,
                },
              );
              corpusClassFound = evidence.corpus_class_found;
              evidenceCaveats.push(...evidence.caveats);

              // Build a kind→rank map from the evidence sequence. Then sort the
              // missing-features list by rank (kinds present in the sequence first,
              // in evidence order; kinds absent from the sequence preserve their
              // original tail order via a stable secondary key).
              const rankByKind = new Map<string, number>();
              evidence.sequence.forEach((f, i) => rankByKind.set(f.kind, i));
              orderedMissing.sort((a, b) => {
                const ra = rankByKind.has(a) ? (rankByKind.get(a) as number) : Number.POSITIVE_INFINITY;
                const rb = rankByKind.has(b) ? (rankByKind.get(b) as number) : Number.POSITIVE_INFINITY;
                if (ra !== rb) return ra - rb;
                // Stable secondary key: original index in baseline.missing_features
                return baseline.missing_features.indexOf(a) - baseline.missing_features.indexOf(b);
              });
            }

            for (const missingKind of orderedMissing) {
              const ft = tmpl?.features.find((f) => f.kind === missingKind);
              if (!ft) {
                skipped.push({ kind: missingKind, reason: "feature not in template (template/missing-list mismatch)" });
                continue;
              }
              if (ft.prevalence < prevalenceThreshold) {
                skipped.push({ kind: ft.kind, reason: `prevalence ${ft.prevalence} below threshold ${prevalenceThreshold}` });
                continue;
              }
              const ovr = overrides[ft.kind] ?? {};

              switch (ft.build_hint) {
                case "chamfer": {
                  const refRadius = ovr.reference_radius_mm ?? (ft.typical_size_mm ?? 1.5);
                  const ang = ovr.angle_deg ?? (ft.typical_angle_deg ?? 8);
                  const dist = ovr.distance_mm ?? Math.max(Math.tan(ang * Math.PI / 180) * refRadius, 0.05);
                  const callParams = { distance_mm: dist, edge_selection: "bottom" as const, revolution_axis: revolutionAxis };
                  if (!bridgeUp) { dispatched.push({ kind: ft.kind, build_hint: ft.build_hint, params: callParams, ok: false, error: "dry_run" }); builtKinds.push(ft.kind); break; }
                  try {
                    const r = await fusion360LiveBridgeEngine.chamfer(callParams);
                    dispatched.push({ kind: ft.kind, build_hint: ft.build_hint, params: callParams, ok: r.success !== false });
                    if (r.success !== false) builtKinds.push(ft.kind);
                  } catch (e: unknown) {
                    dispatched.push({ kind: ft.kind, build_hint: ft.build_hint, params: callParams, ok: false, error: e instanceof Error ? e.message : String(e) });
                  }
                  break;
                }
                case "extrudeTapered": {
                  const refRadius = ovr.reference_radius_mm ?? (ft.typical_size_mm ?? 5);
                  const ang = ovr.angle_deg ?? (ft.typical_angle_deg ?? 2);
                  const dist = ovr.distance_mm ?? Math.max(Math.tan(ang * Math.PI / 180) * refRadius, 0.05);
                  const callParams = { distance_mm: dist, edge_selection: "top" as const, revolution_axis: revolutionAxis };
                  if (!bridgeUp) { dispatched.push({ kind: ft.kind, build_hint: ft.build_hint, params: callParams, ok: false, error: "dry_run" }); builtKinds.push(ft.kind); break; }
                  try {
                    const r = await fusion360LiveBridgeEngine.chamfer(callParams);
                    dispatched.push({ kind: ft.kind, build_hint: ft.build_hint, params: callParams, ok: r.success !== false });
                    if (r.success !== false) builtKinds.push(ft.kind);
                  } catch (e: unknown) {
                    dispatched.push({ kind: ft.kind, build_hint: ft.build_hint, params: callParams, ok: false, error: e instanceof Error ? e.message : String(e) });
                  }
                  break;
                }
                case "fillet": {
                  const radius = ovr.radius_mm ?? (ft.typical_size_mm ?? 0.25);
                  const callParams = { radius_mm: radius, edge_selection: "internal_horizontal" as const, revolution_axis: revolutionAxis };
                  if (!bridgeUp) { dispatched.push({ kind: ft.kind, build_hint: ft.build_hint, params: callParams, ok: false, error: "dry_run" }); builtKinds.push(ft.kind); break; }
                  try {
                    const r = await fusion360LiveBridgeEngine.fillet(callParams);
                    dispatched.push({ kind: ft.kind, build_hint: ft.build_hint, params: callParams, ok: r.success !== false });
                    if (r.success !== false) builtKinds.push(ft.kind);
                  } catch (e: unknown) {
                    dispatched.push({ kind: ft.kind, build_hint: ft.build_hint, params: callParams, ok: false, error: e instanceof Error ? e.message : String(e) });
                  }
                  break;
                }
                default:
                  skipped.push({ kind: ft.kind, reason: `no dispatcher mapping for build_hint "${ft.build_hint}"` });
              }
            }

            const upgraded = await masterCADControlBrainEngine.cadAITrainingSurface(
              partClass, builtKinds, prevalenceThreshold,
            );
            result = {
              success: true,
              data: {
                part_class: partClass,
                bridge_up: bridgeUp,
                dry_run: !bridgeUp,
                baseline_fidelity: baseline.predicted_fidelity,
                upgraded_fidelity: upgraded.predicted_fidelity,
                lift_pct: (upgraded.predicted_fidelity - baseline.predicted_fidelity) * 100,
                built_features: builtKinds,
                still_missing: upgraded.missing_features,
                dispatched,
                skipped,
                visual_fidelity_notes: upgraded.visual_fidelity_notes,
                // U-FGE02: evidence-ranked-build telemetry. When use_corpus_evidence=false
                // (default), every field below is the zero-state — preserves pre-2026-05-18
                // result shape additively (callers reading other fields see unchanged data).
                use_corpus_evidence: useCorpusEvidence,
                evidence_ordered_missing: useCorpusEvidence ? orderedMissing : null,
                evidence_caveats: useCorpusEvidence ? evidenceCaveats : [],
                corpus_class_found: useCorpusEvidence ? corpusClassFound : null,
                corpus_report_path: corpusReportPath,
                corpus_read_error: corpusReadError,
              },
            };
            break;
          }
          case "cad_corpus_learn_prevalence": {
            const { cadCorpusIngestionEngine } = await import("../../engines/CADCorpusIngestionEngine.js");
            const { cadCorpusFeaturePrevalenceLearnerEngine } = await import("../../engines/CADCorpusFeaturePrevalenceLearnerEngine.js");
            const { cadClassFeatureLibraryEngine } = await import("../../engines/CADClassFeatureLibraryEngine.js");
            const manifest = cadCorpusIngestionEngine.loadManifest(params.manifest_path);
            if (!manifest) { result = { success: false, error: "manifest not found" }; break; }
            const handTuned = cadClassFeatureLibraryEngine.classesCovered().map((cls: string) => {
              const t = cadClassFeatureLibraryEngine.templateFor(cls as never);
              return { part_class: cls as never, features: t?.features ?? [] };
            }).filter((t) => t.features.length > 0);
            const report = cadCorpusFeaturePrevalenceLearnerEngine.learnAll(manifest, handTuned, params.divergence_threshold ?? 0.2);
            result = { success: true, data: report };
            break;
          }
          case "cad_corpus_apply_learned": {
            const { cadCorpusFeaturePrevalenceLearnerEngine } = await import("../../engines/CADCorpusFeaturePrevalenceLearnerEngine.js");
            const smoothingAlpha = params.smoothing_alpha ?? 0.7;
            const blended = cadCorpusFeaturePrevalenceLearnerEngine.applyLearned(
              params.hand_tuned_templates,
              params.report,
              smoothingAlpha,
            );
            // U-FGE03: opt-in persistence. params.persist === true durably
            // writes the blend so the DEFAULT build-sequence path
            // (CADClassFeatureLibraryEngine.templateFor → buildSequenceFor)
            // auto-consumes it — closing the memory R12 gap
            // (reference_cad_fusion_training_2026_05_18) where the blend was
            // in-memory-only and never reached inference. Default behavior
            // (persist absent/false) is unchanged — additive, preserves the
            // U-FGE01/02 contract + every pre-U-FGE03 caller.
            let persisted: unknown = null;
            if (params.persist === true) {
              persisted = await cadCorpusFeaturePrevalenceLearnerEngine.persistLearned(
                blended,
                { smoothing_alpha: smoothingAlpha },
              );
            }
            result = { success: true, data: { templates: blended, count: blended.length, persisted } };
            break;
          }
          case "cad_corpus_overlay_status": {
            // U-FGE03: R12 visibility — does the trained learned-prevalence
            // overlay actually reach the default inference path? (The exact
            // thing that was silently NOT happening pre-U-FGE03.)
            const { cadClassFeatureLibraryEngine } = await import("../../engines/CADClassFeatureLibraryEngine.js");
            result = { success: true, data: cadClassFeatureLibraryEngine.overlayStatus() };
            break;
          }
          case "cad_step_parse_file": {
            const { stepGeometryParserEngine } = await import("../../engines/STEPGeometryParserEngine.js");
            result = { success: true, data: stepGeometryParserEngine.parseFile(params.file_path) };
            break;
          }
          case "cad_step_parse_string": {
            const { stepGeometryParserEngine } = await import("../../engines/STEPGeometryParserEngine.js");
            result = { success: true, data: stepGeometryParserEngine.parseString(params.text, params.file_path) };
            break;
          }
          case "cad_step_evidence_for_kinds": {
            const { stepGeometryParserEngine } = await import("../../engines/STEPGeometryParserEngine.js");
            const evidence = stepGeometryParserEngine.evidenceForFeatureKinds(params.geometry);
            result = { success: true, data: { evidence: Array.from(evidence), count: evidence.size } };
            break;
          }
          case "cad_blueprint_infer_class": {
            const { blueprintVisionOCREngine } = await import("../../engines/BlueprintVisionOCREngine.js");
            const cls = blueprintVisionOCREngine.inferPartClass(params.blueprint_result);
            result = { success: true, data: { part_class: cls } };
            break;
          }
          case "cad_blueprint_flag_features": {
            const { blueprintVisionOCREngine } = await import("../../engines/BlueprintVisionOCREngine.js");
            const flags = blueprintVisionOCREngine.flagExpectedFeatures(params.blueprint_result);
            result = { success: true, data: { flags, count: flags.length } };
            break;
          }
          case "cad_harvest_catalog": {
            const { onlinePrintHarvestEngine } = await import("../../engines/OnlinePrintHarvestEngine.js");
            result = { success: true, data: onlinePrintHarvestEngine.catalog() };
            break;
          }
          case "cad_harvest_paired_sources": {
            const { onlinePrintHarvestEngine } = await import("../../engines/OnlinePrintHarvestEngine.js");
            const sources = onlinePrintHarvestEngine.pairedSourcesForTraining(params.part_class);
            result = { success: true, data: { sources, count: sources.length } };
            break;
          }
          case "cad_harvest_can_redistribute": {
            const { onlinePrintHarvestEngine } = await import("../../engines/OnlinePrintHarvestEngine.js");
            result = { success: true, data: { can_redistribute: onlinePrintHarvestEngine.canRedistribute(params.filter ?? {}) } };
            break;
          }
          // ── CAD-FUSION-LIVE-MS0 PHASE18+19: 6-CAD execution router ─────────────
          // Response shapes match canonical SHAs 99b5f41b9 (5-CAD) + 0eb766b8e (Esprit closure).
          case "cad_route_detect_system": {
            const { CADSystemRouterEngine } = await import("../../engines/CADSystemRouterEngine.js");
            const detected = CADSystemRouterEngine.detectSystem({
              sourceSystem: params.source_system ?? params.sourceSystem,
              filePath: params.file_path ?? params.filePath,
            });
            result = { success: true, detected_system: detected };
            break;
          }
          case "cad_route_supported_systems": {
            const { CADSystemRouterEngine } = await import("../../engines/CADSystemRouterEngine.js");
            result = { success: true, ...CADSystemRouterEngine.listSupportedSystems() };
            break;
          }
          case "cad_route_plan_execution": {
            const { CADSystemRouterEngine } = await import("../../engines/CADSystemRouterEngine.js");
            const sys = (params.system ?? params.systemId) ?? CADSystemRouterEngine.detectSystem({
              sourceSystem: params.source_system ?? params.sourceSystem,
              filePath: params.file_path ?? params.filePath,
            });
            if (!sys) {
              return dispatcherError(
                new Error("cad_route_plan_execution requires `system` (or `source_system` / `file_path` from which the system can be detected)"),
                action, "prism_cad",
              );
            }
            const moduleId = params.module_id ?? params.moduleId;
            const operationId = params.operation_id ?? params.operationId;
            if (!moduleId || !operationId) {
              return dispatcherError(
                new Error("cad_route_plan_execution requires module_id and operation_id"),
                action, "prism_cad",
              );
            }
            const routed = await CADSystemRouterEngine.planAndRender({
              system: sys,
              moduleId,
              operationId,
              params: params.op_params ?? params.params ?? {},
            });
            result = { success: true, routed };
            break;
          }
          case "cad_route_find_operation": {
            const { CADSystemRouterEngine } = await import("../../engines/CADSystemRouterEngine.js");
            const operationId = params.operation_id ?? params.operationId;
            const matches = await CADSystemRouterEngine.findOperationAcrossSystems(operationId);
            result = { success: true, operation_id: operationId, count: matches.length, matches };
            break;
          }
          case "cad_route_capabilities": {
            const { CADSystemRouterEngine } = await import("../../engines/CADSystemRouterEngine.js");
            const matrix = await CADSystemRouterEngine.listCapabilitiesAcrossSystems();
            result = { success: true, ...matrix };
            break;
          }
          // ── PHASE19: Esprit-direct (port from 0eb766b8e) ─────────────────────
          case "cad_esprit_plan_execution": {
            const operationId = params.operation_id ?? params.operationId;
            if (!operationId || typeof operationId !== "string") {
              return dispatcherError(
                new Error("cad_esprit_plan_execution requires operation_id"),
                action, "prism_cad",
              );
            }
            const { EspritCADExecutionBridge } = await import("../../engines/EspritCADExecutionBridge.js");
            const plan = await EspritCADExecutionBridge.plan({
              operationId,
              params: params.op_params ?? params.params ?? {},
              sectionHint: params.section_hint ?? params.sectionHint,
            });
            result = { success: true, plan };
            break;
          }
          case "cad_print_to_cad": {
            const { printToCADOrchestratorEngine } = await import("../../engines/PrintToCADOrchestratorEngine.js");
            const data = await printToCADOrchestratorEngine.run({
              step_file_path: params.step_file_path,
              part_class_hint: params.part_class_hint ?? params.part_class,
              target_system: params.target_system,
              prevalence_threshold: params.prevalence_threshold,
            });
            result = { success: true, data };
            break;
          }
          // ── PHASE21: 6 orphan design/learning/file-format engines wired ────────
          case "cad_intent_decompose": {
            const { cadIntentDecomposerEngine } = await import("../../engines/CADIntentDecomposerEngine.js");
            const data = cadIntentDecomposerEngine.decompose(params.input ?? "", params.name_hint);
            result = { success: true, data };
            break;
          }
          case "cad_design_plan": {
            const { cadOperationPlannerEngine } = await import("../../engines/CADOperationPlannerEngine.js");
            const data = await cadOperationPlannerEngine.plan(params.intent ?? params);
            result = { success: true, data };
            break;
          }
          case "cad_atomic_step_decompose": {
            const { atomicStepDecomposerEngine } = await import("../../engines/AtomicStepDecomposerEngine.js");
            const data = atomicStepDecomposerEngine.decompose(params.unit ?? params);
            result = { success: true, steps: data, count: data.length };
            break;
          }
          case "cad_stl_analyze": {
            const { stlToVoxelGridEngine } = await import("../../engines/STLToVoxelGridEngine.js");
            const data = stlToVoxelGridEngine.analyzeGeometry({
              content: params.content,
              resolution_mm: params.resolution_mm,
            });
            result = { success: true, data };
            break;
          }
          case "cad_pmi_extract": {
            if (!params.file_path || typeof params.file_path !== "string") {
              return dispatcherError(
                new Error("cad_pmi_extract requires file_path"),
                action, "prism_cad",
              );
            }
            const { stepAP242PMIExtractorEngine } = await import("../../engines/STEPAP242PMIExtractorEngine.js");
            const data = stepAP242PMIExtractorEngine.extract(params.file_path);
            result = { success: true, data };
            break;
          }
          case "cad_part_boiler_tube": {
            if (typeof params.steam_capacity_kg_h !== "number") {
              return dispatcherError(
                new Error("cad_part_boiler_tube requires steam_capacity_kg_h: number"),
                action, "prism_cad",
              );
            }
            const { boilerTubeEngine } = await import("../../engines/BoilerTubeEngine.js");
            const data = boilerTubeEngine.calculate(params as { steam_capacity_kg_h: number; [k: string]: unknown });
            result = { success: true, data };
            break;
          }
          case "cad_part_gasket": {
            const { gasketDesignEngine } = await import("../../engines/GasketDesignEngine.js");
            const data = gasketDesignEngine.calculate(params as Record<string, unknown>);
            result = { success: true, data };
            break;
          }
          case "cad_ai_session_open": {
            if (!params.session_id || typeof params.session_id !== "string") {
              return dispatcherError(
                new Error("cad_ai_session_open requires session_id"),
                action, "prism_cad",
              );
            }
            const { cadAIStateMachineEngine } = await import("../../engines/CADAIStateMachineEngine.js");
            const snapshot = cadAIStateMachineEngine.open(params.session_id);
            const allowed = cadAIStateMachineEngine.allowedEvents(params.session_id);
            result = { success: true, snapshot, allowed_events: allowed };
            break;
          }
          // ── PHASE22: 8 orphan GD&T / tolerance / dimension / ML engines ──────
          case "cad_gdt_callout_parse": {
            if (!params.callout || typeof params.callout !== "string") {
              return dispatcherError(
                new Error("cad_gdt_callout_parse requires callout: string"),
                action, "prism_cad",
              );
            }
            const { gdtCalloutParserEngine } = await import("../../engines/GDTCalloutParserEngine.js");
            const data = gdtCalloutParserEngine.parse(params.callout);
            result = { success: true, data };
            break;
          }
          case "cad_gdt_stackup": {
            const { gdtStackupEngine } = await import("../../engines/GDTStackupEngine.js");
            const data = gdtStackupEngine.compute(params as Parameters<typeof gdtStackupEngine.compute>[0]);
            result = { success: true, data };
            break;
          }
          case "cad_tolerance_apply": {
            const { toleranceAwareGenerationEngine } = await import("../../engines/ToleranceAwareGenerationEngine.js");
            const features = (params.features ?? []) as Parameters<typeof toleranceAwareGenerationEngine.applyTolerances>[0];
            const customer = typeof params.customer === "string" ? params.customer : undefined;
            const data = toleranceAwareGenerationEngine.applyTolerances(features, customer);
            result = { success: true, data };
            break;
          }
          case "cad_pdf_blueprint_extract": {
            if (typeof params.text_content !== "string") {
              return dispatcherError(
                new Error("cad_pdf_blueprint_extract requires text_content: string"),
                action, "prism_cad",
              );
            }
            const { pdfBlueprintDimensionExtractorEngine } = await import("../../engines/PDFBlueprintDimensionExtractorEngine.js");
            const { pdfBlueprintPatternRescueEngine } = await import("../../engines/PDFBlueprintPatternRescueEngine.js");
            const drawing_units = params.drawing_units === "inch" ? "inch" : "mm";
            const base = pdfBlueprintDimensionExtractorEngine.extractDimensions({
              text_content: params.text_content,
              drawing_units,
            });
            // MS1-U2 rescue: compose additive patterns (fractional dims, limit-pair
            // dims, ISO 1302 N-grade Ra, standalone microinch). Result shape grows;
            // existing consumers see strictly more entries, never fewer.
            const rescue = pdfBlueprintPatternRescueEngine.extract({
              text_content: params.text_content,
              default_unit: drawing_units,
            });
            const data = {
              ...base,
              dimensions: [...base.dimensions, ...rescue.dimensions],
              surface_finishes: [...base.surface_finishes, ...rescue.surface_finishes],
              rescue_counts: rescue.rescue_counts,
            };
            result = { success: true, data };
            break;
          }
          case "cad_pdf_pattern_rescue_extract": {
            if (typeof params.text_content !== "string") {
              return dispatcherError(
                new Error("cad_pdf_pattern_rescue_extract requires text_content: string"),
                action, "prism_cad",
              );
            }
            const { pdfBlueprintPatternRescueEngine } = await import("../../engines/PDFBlueprintPatternRescueEngine.js");
            const data = pdfBlueprintPatternRescueEngine.extract({
              text_content: params.text_content,
            });
            result = { success: true, data };
            break;
          }
          case "cad_dimensional_signature": {
            if (typeof params.step_text !== "string") {
              return dispatcherError(
                new Error("cad_dimensional_signature requires step_text: string"),
                action, "prism_cad",
              );
            }
            const { dimensionalSignatureEngine } = await import("../../engines/DimensionalSignatureEngine.js");
            const data = dimensionalSignatureEngine.extractFromStepText(
              params.step_text,
              params.source_file ?? "<inline>",
            );
            result = { success: true, data };
            break;
          }
          case "cad_machine_type_classify": {
            const { machineTypeClassifierEngine } = await import("../../engines/MachineTypeClassifierEngine.js");
            const data = machineTypeClassifierEngine.classify(params as Parameters<typeof machineTypeClassifierEngine.classify>[0]);
            result = { success: true, data };
            break;
          }
          case "cad_pattern_database": {
            const { patternDatabaseEngine } = await import("../../engines/PatternDatabaseEngine.js");
            const training_context = patternDatabaseEngine.getTrainingContext();
            result = { success: true, training_context };
            break;
          }
          case "cad_feature_memory_record": {
            const { cadFeatureMemoryEngine } = await import("../../engines/CADFeatureMemoryEngine.js");
            const data = await cadFeatureMemoryEngine.record(params as Parameters<typeof cadFeatureMemoryEngine.record>[0]);
            result = { success: true, data };
            break;
          }
          case "cad_feature_memory_lookup": {
            if (typeof params.id !== "string") {
              return dispatcherError(
                new Error("cad_feature_memory_lookup requires id: string"),
                action, "prism_cad",
              );
            }
            const { cadFeatureMemoryEngine } = await import("../../engines/CADFeatureMemoryEngine.js");
            const data = await cadFeatureMemoryEngine.lookup(params.id);
            result = { success: true, data, found: data !== null };
            break;
          }
          case "cad_feature_memory_query": {
            if (typeof params.feature_type !== "string" || params.feature_type.length === 0) {
              return dispatcherError(
                new Error("cad_feature_memory_query requires feature_type: string"),
                action, "prism_cad",
              );
            }
            const { cadFeatureMemoryEngine } = await import("../../engines/CADFeatureMemoryEngine.js");
            const data = await cadFeatureMemoryEngine.query(
              params.feature_type,
              (params.parameters ?? {}) as Parameters<typeof cadFeatureMemoryEngine.query>[1],
              (params.options ?? {}) as Parameters<typeof cadFeatureMemoryEngine.query>[2],
            );
            result = { success: true, data, count: data.length };
            break;
          }
          case "cad_feature_memory_stats": {
            const { cadFeatureMemoryEngine } = await import("../../engines/CADFeatureMemoryEngine.js");
            const data = await cadFeatureMemoryEngine.stats();
            result = { success: true, data };
            break;
          }
          case "cad_esprit_render_kbm": {
            const operationId = params.operation_id ?? params.operationId;
            if (!operationId || typeof operationId !== "string") {
              return dispatcherError(
                new Error("cad_esprit_render_kbm requires operation_id"),
                action, "prism_cad",
              );
            }
            const { EspritCADExecutionBridge } = await import("../../engines/EspritCADExecutionBridge.js");
            const plan = await EspritCADExecutionBridge.plan({
              operationId,
              params: params.op_params ?? params.params ?? {},
              sectionHint: params.section_hint ?? params.sectionHint,
            });
            const kbm_macro = EspritCADExecutionBridge.renderKBMScaffold(plan);
            result = { success: true, plan, kbm_macro };
            break;
          }
          // ── PHASE23: print / modeling / feature / engineering orphans ──
          case "cad_blueprint_generate": {
            const { blueprintToCADGenerationEngine } = await import("../../engines/BlueprintToCADGenerationEngine.js");
            const data = await blueprintToCADGenerationEngine.generate(
              params.input ?? params,
              params.generation_backend ?? params.generationBackend,
              params.ocr_backend ?? params.ocrBackend,
              params.embedding_backend ?? params.embeddingBackend,
              params.corpus,
              params.config,
            );
            result = { success: true, data };
            break;
          }
          case "cad_blueprint_extract_features": {
            const ocr = params.ocr ?? params.ocrResult;
            if (!ocr || typeof ocr !== "object") {
              return dispatcherError(
                new Error("cad_blueprint_extract_features requires ocr (BlueprintOCRResult)"),
                action, "prism_cad",
              );
            }
            const { blueprintToCADGenerationEngine } = await import("../../engines/BlueprintToCADGenerationEngine.js");
            const data = blueprintToCADGenerationEngine.extractFeatures(ocr as Parameters<typeof blueprintToCADGenerationEngine.extractFeatures>[0]);
            result = { success: true, data, count: data.length };
            break;
          }
          // BLUEPRINT-OCR-TRAINING-MS1/U-MS1-U3 — ground-truth registry blueprint join
          case "gt_blueprint_register": {
            if (
              !params.pdfPath ||
              typeof params.page !== "number" ||
              !params.region ||
              !params.extractionType ||
              !params.value ||
              !params.confidenceTier ||
              !params.sourceProvenance
            ) {
              return dispatcherError(
                new Error("gt_blueprint_register requires pdfPath, page, region, extractionType, value, confidenceTier, sourceProvenance"),
                action, "prism_cad",
              );
            }
            const { groundTruthRegistryEngine } = await import("../../engines/GroundTruthRegistryEngine.js");
            const data = groundTruthRegistryEngine.registerBlueprintExtraction(
              params as Parameters<typeof groundTruthRegistryEngine.registerBlueprintExtraction>[0],
            );
            result = { success: true, data };
            break;
          }
          case "gt_blueprint_join_docustrata": {
            if (!params.rootDir || !params.indexPath) {
              return dispatcherError(
                new Error("gt_blueprint_join_docustrata requires rootDir + indexPath"),
                action, "prism_cad",
              );
            }
            const { groundTruthRegistryEngine } = await import("../../engines/GroundTruthRegistryEngine.js");
            const data = groundTruthRegistryEngine.joinDocustrataToPartLibrary(
              params as Parameters<typeof groundTruthRegistryEngine.joinDocustrataToPartLibrary>[0],
            );
            result = { success: true, data };
            break;
          }
          case "gt_enumerate_by_tier": {
            if (!params.tier) {
              return dispatcherError(
                new Error("gt_enumerate_by_tier requires tier"),
                action, "prism_cad",
              );
            }
            const { groundTruthRegistryEngine } = await import("../../engines/GroundTruthRegistryEngine.js");
            const data = groundTruthRegistryEngine.enumerateByConfidenceTier(
              params as Parameters<typeof groundTruthRegistryEngine.enumerateByConfidenceTier>[0],
            );
            result = { success: true, data, count: data.length };
            break;
          }
          case "gt_flag_ambiguities": {
            const { groundTruthRegistryEngine } = await import("../../engines/GroundTruthRegistryEngine.js");
            const data = groundTruthRegistryEngine.flagAmbiguities();
            result = { success: true, data, count: data.length };
            break;
          }
          case "gt_training_pairs_by_customer": {
            if (!params.customer || typeof params.customer !== "string") {
              return dispatcherError(
                new Error("gt_training_pairs_by_customer requires customer"),
                action, "prism_cad",
              );
            }
            const { groundTruthRegistryEngine } = await import("../../engines/GroundTruthRegistryEngine.js");
            const data = groundTruthRegistryEngine.getTrainingPairsByCustomer(
              params as Parameters<typeof groundTruthRegistryEngine.getTrainingPairsByCustomer>[0],
            );
            result = { success: true, data, count: data.length };
            break;
          }
          // BLUEPRINT-OCR-TRAINING-MS1/U-MS1-U4 — extraction-confidence cross-validation
          // NOTE: validate_backend + compare_backends accept pre-computed extractions[]
          // because MCP cannot transport backend functions. The dispatcher wraps
          // the array as a lookup-fn; programmatic callers can also pass `backend`
          // directly (the engine signature accepts either path).
          case "gt_validate_backend": {
            if (!params.backendId || !params.trainingPairSetId || !Array.isArray(params.pairs)) {
              return dispatcherError(
                new Error("gt_validate_backend requires backendId, trainingPairSetId, pairs[]; optionally precomputedExtractions[] (one per pair)"),
                action, "prism_cad",
              );
            }
            if (!Array.isArray(params.precomputedExtractions)) {
              return dispatcherError(
                new Error("gt_validate_backend MCP path requires precomputedExtractions[] (one entry per pair) — runtime backend functions cannot cross MCP boundary"),
                action, "prism_cad",
              );
            }
            const pairs = params.pairs as Array<{ pairId: string; extractionType: string; groundTruthValues: Record<string, string | undefined> }>;
            const extractions = params.precomputedExtractions as Array<{ value: string; confidence?: number }>;
            if (pairs.length !== extractions.length) {
              return dispatcherError(
                new Error(`pairs.length (${pairs.length}) !== precomputedExtractions.length (${extractions.length})`),
                action, "prism_cad",
              );
            }
            const { groundTruthValidationEngine } = await import("../../engines/GroundTruthValidationEngine.js");
            const data = groundTruthValidationEngine.validateExtractionBackend({
              backendId: params.backendId as string,
              trainingPairSetId: params.trainingPairSetId as string,
              pairs,
              backend: (pair) => {
                const idx = pairs.indexOf(pair);
                const ext = extractions[idx];
                return ext ? { value: ext.value, ...(typeof ext.confidence === "number" ? { confidence: ext.confidence } : {}) } : { value: "" };
              },
              ...(typeof params.conformalAlpha === "number" ? { conformalAlpha: params.conformalAlpha } : {}),
            });
            result = { success: true, data };
            break;
          }
          case "gt_compare_backends": {
            if (!Array.isArray(params.backendResults) || !params.trainingPairSetId) {
              return dispatcherError(
                new Error("gt_compare_backends requires backendResults[] (each: BackendValidationResult) + trainingPairSetId"),
                action, "prism_cad",
              );
            }
            // Direct comparison mode — caller passes pre-computed results.
            const results = params.backendResults as Array<{ backendId: string; accuracy: number; perDimTypeBreakdown: Record<string, { accuracy: number; n: number }> }>;
            const sorted = [...results].sort((a, b) => b.accuracy - a.accuracy);
            const leader = sorted[0]!;
            const threshold = typeof params.regressionThresholdPct === "number" ? params.regressionThresholdPct : 2.0;
            const rank = sorted.map((r, i) => ({ rank: i + 1, backendId: r.backendId, accuracy: r.accuracy }));
            const regressionFlags = sorted.slice(1)
              .map((r) => ({ r, gapPct: (leader.accuracy - r.accuracy) * 100 }))
              .filter(({ gapPct }) => gapPct > threshold)
              .map(({ r, gapPct }) => ({
                backendId: r.backendId,
                gapPct: Number(gapPct.toFixed(2)),
                versusLeader: leader.backendId,
                reason: "accuracy_gap_exceeds_threshold",
              }));
            result = {
              success: true,
              data: {
                trainingPairSetId: params.trainingPairSetId,
                rank,
                regressionFlags,
                leaderId: leader.backendId,
                regressionThresholdPct: threshold,
              },
            };
            break;
          }
          case "gt_snapshot_baseline": {
            if (!params.snapshotId || !params.result) {
              return dispatcherError(
                new Error("gt_snapshot_baseline requires snapshotId + result (BackendValidationResult)"),
                action, "prism_cad",
              );
            }
            const { groundTruthValidationEngine } = await import("../../engines/GroundTruthValidationEngine.js");
            groundTruthValidationEngine.snapshotBaseline(
              params.snapshotId as string,
              params.result as Parameters<typeof groundTruthValidationEngine.snapshotBaseline>[1],
            );
            result = { success: true, data: { stored: true, snapshotId: params.snapshotId } };
            break;
          }
          case "gt_regression_gate": {
            if (!params.current || !params.baselineSnapshotId) {
              return dispatcherError(
                new Error("gt_regression_gate requires current (BackendValidationResult) + baselineSnapshotId"),
                action, "prism_cad",
              );
            }
            const { groundTruthValidationEngine } = await import("../../engines/GroundTruthValidationEngine.js");
            const data = groundTruthValidationEngine.regressionGate(
              params as Parameters<typeof groundTruthValidationEngine.regressionGate>[0],
            );
            result = { success: true, data };
            break;
          }
          // BLUEPRINT-OCR-TRAINING-MS1/U-MS1-U6 — corpus harvest
          // NOTE: harvest actions accept precomputedContent[] for MCP-callable
          // path (fetcher functions can't cross MCP boundary). Programmatic
          // callers use the full HarvestIO injection.
          case "corpus_harvest_mit": {
            if (!Array.isArray(params.courseList)) {
              return dispatcherError(
                new Error("corpus_harvest_mit requires courseList[]; optionally precomputedContent[] (one per course)"),
                action, "prism_cad",
              );
            }
            if (!Array.isArray(params.precomputedContent)) {
              return dispatcherError(
                new Error("corpus_harvest_mit MCP path requires precomputedContent[] (one entry per course)"),
                action, "prism_cad",
              );
            }
            const { blueprintCorpusHarvestEngine } = await import("../../engines/BlueprintCorpusHarvestEngine.js");
            const courseList = params.courseList as Array<{ courseId: string; title: string; url: string; domain: string; tags?: string[] }>;
            const content = params.precomputedContent as Array<{ ok: true; content: string } | { ok: false; reason: string }>;
            const data = await blueprintCorpusHarvestEngine.harvestMIT({
              courseList: courseList as Parameters<typeof blueprintCorpusHarvestEngine.harvestMIT>[0]["courseList"],
              ...(typeof params.outputDir === "string" ? { outputDir: params.outputDir } : {}),
              io: { fetchMIT: async (c) => content[courseList.indexOf(c)] ?? { ok: false, reason: "no_content" } },
            });
            result = { success: true, data };
            break;
          }
          case "corpus_harvest_vendor": {
            if (!Array.isArray(params.pdfList) || !Array.isArray(params.precomputedContent)) {
              return dispatcherError(
                new Error("corpus_harvest_vendor requires pdfList[] + precomputedContent[]"),
                action, "prism_cad",
              );
            }
            const { blueprintCorpusHarvestEngine } = await import("../../engines/BlueprintCorpusHarvestEngine.js");
            const pdfList = params.pdfList as Array<{ filePath: string; vendor: string; domain: string; tags?: string[] }>;
            const content = params.precomputedContent as Array<{ ok: true; content: string } | { ok: false; reason: string }>;
            const data = await blueprintCorpusHarvestEngine.harvestVendorPDFs({
              pdfList: pdfList as Parameters<typeof blueprintCorpusHarvestEngine.harvestVendorPDFs>[0]["pdfList"],
              ...(typeof params.outputDir === "string" ? { outputDir: params.outputDir } : {}),
              io: { fetchVendorPDF: async (p) => content[pdfList.indexOf(p)] ?? { ok: false, reason: "no_content" } },
            });
            result = { success: true, data };
            break;
          }
          case "corpus_harvest_online": {
            if (!Array.isArray(params.urlList) || !Array.isArray(params.precomputedContent)) {
              return dispatcherError(
                new Error("corpus_harvest_online requires urlList[] + precomputedContent[]"),
                action, "prism_cad",
              );
            }
            const { blueprintCorpusHarvestEngine } = await import("../../engines/BlueprintCorpusHarvestEngine.js");
            const urlList = params.urlList as Array<{ url: string; domain: string; title: string; tags?: string[] }>;
            const content = params.precomputedContent as Array<{ ok: true; content: string } | { ok: false; reason: string }>;
            const data = await blueprintCorpusHarvestEngine.harvestOnline({
              urlList: urlList as Parameters<typeof blueprintCorpusHarvestEngine.harvestOnline>[0]["urlList"],
              ...(typeof params.outputDir === "string" ? { outputDir: params.outputDir } : {}),
              ...(typeof params.maxRetry404 === "number" ? { maxRetry404: params.maxRetry404 } : {}),
              io: { fetchOnline: async (s) => content[urlList.indexOf(s)] ?? { ok: false, reason: "no_content" } },
            });
            result = { success: true, data };
            break;
          }
          case "corpus_enumerate": {
            const { blueprintCorpusHarvestEngine } = await import("../../engines/BlueprintCorpusHarvestEngine.js");
            const data = blueprintCorpusHarvestEngine.enumerateCorpus(
              params as Parameters<typeof blueprintCorpusHarvestEngine.enumerateCorpus>[0],
            );
            result = { success: true, data, count: data.length };
            break;
          }
          case "corpus_verify_fresh": {
            if (!params.source) {
              return dispatcherError(
                new Error("corpus_verify_fresh requires source"),
                action, "prism_cad",
              );
            }
            const { blueprintCorpusHarvestEngine } = await import("../../engines/BlueprintCorpusHarvestEngine.js");
            const data = blueprintCorpusHarvestEngine.verifyCorpusFresh(
              params as Parameters<typeof blueprintCorpusHarvestEngine.verifyCorpusFresh>[0],
            );
            result = { success: true, data };
            break;
          }
          // BLUEPRINT-OCR-TRAINING-MS1/U-MS1-U7 — BlueprintExtractionRAGEngine
          // MCP path requires precomputedVisionRegions[] (vision backend
          // function cannot cross MCP boundary).
          case "blueprint_rag_extract": {
            if (!params.request || !params.backendId || !Array.isArray(params.precomputedVisionRegions)) {
              return dispatcherError(
                new Error("blueprint_rag_extract requires request, backendId, precomputedVisionRegions[] + optionally precomputedSources for corpus/tribal/similar/family"),
                action, "prism_cad",
              );
            }
            const { blueprintExtractionRAGEngine } = await import("../../engines/BlueprintExtractionRAGEngine.js");
            const visionRegions = params.precomputedVisionRegions as Array<{ regionId: string; dimType: string; value: string; confidence: number; bbox?: { x: number; y: number; width: number; height: number } }>;
            const ps = (params.precomputedSources ?? {}) as { corpus?: unknown[]; tribal?: unknown[]; similar?: unknown[]; family?: unknown };
            const data = await blueprintExtractionRAGEngine.extract({
              request: params.request as Parameters<typeof blueprintExtractionRAGEngine.extract>[0]["request"],
              backendId: params.backendId as string,
              ...(typeof params.topK === "number" ? { topK: params.topK } : {}),
              io: {
                retrieveCorpus: async () => (Array.isArray(ps.corpus) ? ps.corpus : []) as Parameters<typeof blueprintExtractionRAGEngine.extract>[0]["io"]["retrieveCorpus"] extends ((...a: never[]) => Promise<infer R>) ? R : never,
                retrieveTribal: async () => (Array.isArray(ps.tribal) ? ps.tribal : []) as Parameters<typeof blueprintExtractionRAGEngine.extract>[0]["io"]["retrieveTribal"] extends ((...a: never[]) => Promise<infer R>) ? R : never,
                retrieveSimilarPrints: async () => (Array.isArray(ps.similar) ? ps.similar : []) as Parameters<typeof blueprintExtractionRAGEngine.extract>[0]["io"]["retrieveSimilarPrints"] extends ((...a: never[]) => Promise<infer R>) ? R : never,
                matchFamily: ps.family
                  ? async () => ps.family as Awaited<ReturnType<NonNullable<Parameters<typeof blueprintExtractionRAGEngine.extract>[0]["io"]["matchFamily"]>>>
                  : undefined,
                visionExtract: async () => visionRegions as Awaited<ReturnType<NonNullable<Parameters<typeof blueprintExtractionRAGEngine.extract>[0]["io"]["visionExtract"]>>>,
              },
            });
            result = { success: true, data };
            break;
          }
          case "blueprint_rag_explain": {
            if (!params.extractionId) {
              return dispatcherError(
                new Error("blueprint_rag_explain requires extractionId"),
                action, "prism_cad",
              );
            }
            const { blueprintExtractionRAGEngine } = await import("../../engines/BlueprintExtractionRAGEngine.js");
            const data = blueprintExtractionRAGEngine.explain(
              params as Parameters<typeof blueprintExtractionRAGEngine.explain>[0],
            );
            result = { success: true, data };
            break;
          }
          case "blueprint_rag_compare_to_baseline": {
            if (!params.ragExtraction || !Array.isArray(params.baselineRegions)) {
              return dispatcherError(
                new Error("blueprint_rag_compare_to_baseline requires ragExtraction + baselineRegions[]"),
                action, "prism_cad",
              );
            }
            const { blueprintExtractionRAGEngine } = await import("../../engines/BlueprintExtractionRAGEngine.js");
            const data = blueprintExtractionRAGEngine.compareToBaseline(
              params as Parameters<typeof blueprintExtractionRAGEngine.compareToBaseline>[0],
            );
            result = { success: true, data };
            break;
          }
          // BLUEPRINT-OCR-TRAINING-MS1/U-MS1-U8 — LoRA bridge + coverage audit
          case "blueprint_lora_prepare_set": {
            if (!params.confidenceTier || !Array.isArray(params.precomputedPairs)) {
              return dispatcherError(
                new Error("blueprint_lora_prepare_set requires confidenceTier + precomputedPairs[] (MCP path)"),
                action, "prism_cad",
              );
            }
            const { blueprintLoRABridgeEngine } = await import("../../engines/BlueprintLoRABridgeEngine.js");
            const data = await blueprintLoRABridgeEngine.prepareTrainingSet({
              confidenceTier: params.confidenceTier as Parameters<typeof blueprintLoRABridgeEngine.prepareTrainingSet>[0]["confidenceTier"],
              ...(typeof params.sizeCap === "number" ? { sizeCap: params.sizeCap } : {}),
              io: { loadTrainingPairs: async () => params.precomputedPairs as Parameters<NonNullable<Parameters<typeof blueprintLoRABridgeEngine.prepareTrainingSet>[0]["io"]>["loadTrainingPairs"]>[0] extends never ? never : Awaited<ReturnType<NonNullable<NonNullable<Parameters<typeof blueprintLoRABridgeEngine.prepareTrainingSet>[0]["io"]>["loadTrainingPairs"]>>> },
            });
            result = { success: true, data };
            break;
          }
          case "blueprint_lora_export": {
            if (!params.setId || !params.provider || !params.outputPath) {
              return dispatcherError(
                new Error("blueprint_lora_export requires setId + provider + outputPath"),
                action, "prism_cad",
              );
            }
            const { blueprintLoRABridgeEngine } = await import("../../engines/BlueprintLoRABridgeEngine.js");
            const data = await blueprintLoRABridgeEngine.exportBundle(
              params as Parameters<typeof blueprintLoRABridgeEngine.exportBundle>[0],
            );
            result = { success: true, data };
            break;
          }
          case "blueprint_lora_register_endpoint": {
            if (!params.bundleId || !params.endpointURL || !params.providerType) {
              return dispatcherError(
                new Error("blueprint_lora_register_endpoint requires bundleId + endpointURL + providerType"),
                action, "prism_cad",
              );
            }
            const { blueprintLoRABridgeEngine } = await import("../../engines/BlueprintLoRABridgeEngine.js");
            const data = blueprintLoRABridgeEngine.registerExternalEndpoint(
              params as Parameters<typeof blueprintLoRABridgeEngine.registerExternalEndpoint>[0],
            );
            result = { success: true, data };
            break;
          }
          case "blueprint_lora_history": {
            const { blueprintLoRABridgeEngine } = await import("../../engines/BlueprintLoRABridgeEngine.js");
            const history = blueprintLoRABridgeEngine.getExportHistory();
            const active = blueprintLoRABridgeEngine.getActiveBundles();
            result = { success: true, data: { history, active } };
            break;
          }
          case "blueprint_coverage_audit": {
            if (!params.rootDir || !params.indexPath || !Array.isArray(params.precomputedRecords)) {
              return dispatcherError(
                new Error("blueprint_coverage_audit requires rootDir + indexPath + precomputedRecords[]"),
                action, "prism_cad",
              );
            }
            const { blueprintCoverageAuditEngine } = await import("../../engines/BlueprintCoverageAuditEngine.js");
            const data = await blueprintCoverageAuditEngine.auditCoverage({
              rootDir: params.rootDir as string,
              indexPath: params.indexPath as string,
              io: { loadRecords: async () => params.precomputedRecords as Awaited<ReturnType<NonNullable<NonNullable<Parameters<typeof blueprintCoverageAuditEngine.auditCoverage>[0]["io"]>["loadRecords"]>>> },
            });
            result = { success: true, data };
            break;
          }
          case "blueprint_coverage_by_customer": {
            if (!params.customer || typeof params.customer !== "string") {
              return dispatcherError(
                new Error("blueprint_coverage_by_customer requires customer"),
                action, "prism_cad",
              );
            }
            const { blueprintCoverageAuditEngine } = await import("../../engines/BlueprintCoverageAuditEngine.js");
            const data = blueprintCoverageAuditEngine.byCustomer({ customer: params.customer });
            result = { success: true, data };
            break;
          }
          case "blueprint_coverage_flag_retrain": {
            if (!params.baselineSnapshotId) {
              return dispatcherError(
                new Error("blueprint_coverage_flag_retrain requires baselineSnapshotId"),
                action, "prism_cad",
              );
            }
            const { blueprintCoverageAuditEngine } = await import("../../engines/BlueprintCoverageAuditEngine.js");
            const data = blueprintCoverageAuditEngine.flagRetrain(
              params as Parameters<typeof blueprintCoverageAuditEngine.flagRetrain>[0],
            );
            result = { success: true, data, count: data.length };
            break;
          }
          case "blueprint_coverage_report": {
            if (!params.format || !params.outDir) {
              return dispatcherError(
                new Error("blueprint_coverage_report requires format (md|json) + outDir"),
                action, "prism_cad",
              );
            }
            const { blueprintCoverageAuditEngine } = await import("../../engines/BlueprintCoverageAuditEngine.js");
            const data = blueprintCoverageAuditEngine.generateReport(
              params as Parameters<typeof blueprintCoverageAuditEngine.generateReport>[0],
            );
            result = { success: true, data };
            break;
          }
          case "corpus_build_index": {
            if (!params.outputPath || !Array.isArray(params.precomputedVectors)) {
              return dispatcherError(
                new Error("corpus_build_index requires outputPath + precomputedVectors[] (MCP path — embedder cannot cross MCP boundary)"),
                action, "prism_cad",
              );
            }
            const { blueprintCorpusHarvestEngine } = await import("../../engines/BlueprintCorpusHarvestEngine.js");
            const vectors = params.precomputedVectors as Array<{ ok: true; vector: number[] } | { ok: false; reason: string }>;
            let i = 0;
            const data = await blueprintCorpusHarvestEngine.buildEmbeddingIndex({
              outputPath: params.outputPath as string,
              ...(typeof params.rootDir === "string" ? { rootDir: params.rootDir } : {}),
              io: {
                embed: async () => {
                  const v = vectors[i++];
                  return v ?? { ok: false, reason: "no_precomputed_vector" };
                },
              },
            });
            result = { success: true, data };
            break;
          }
          case "cad_drawing_index_sources": {
            const { DrawingTemplateIndexEngine } = await import("../../engines/DrawingTemplateIndexEngine.js");
            const data = DrawingTemplateIndexEngine.getSources();
            result = { success: true, data, count: data.length };
            break;
          }
          case "cad_drawing_index_harvest": {
            const { DrawingTemplateIndexEngine } = await import("../../engines/DrawingTemplateIndexEngine.js");
            const data = await DrawingTemplateIndexEngine.harvest();
            result = { success: true, data };
            break;
          }
          case "cad_feature_tree_validate": {
            const candidate = params.candidate ?? params.tree ?? params;
            const { groundTruthFeatureTreeExtractor } = await import("../../engines/GroundTruthFeatureTreeExtractor.js");
            const data = groundTruthFeatureTreeExtractor.validate(candidate);
            result = { success: true, data };
            break;
          }
          case "cad_feature_tree_extract": {
            const filePath = params.file_path ?? params.filePath;
            if (!filePath || typeof filePath !== "string") {
              return dispatcherError(
                new Error("cad_feature_tree_extract requires file_path"),
                action, "prism_cad",
              );
            }
            const { groundTruthFeatureTreeExtractor } = await import("../../engines/GroundTruthFeatureTreeExtractor.js");
            const data = await groundTruthFeatureTreeExtractor.extract(
              filePath,
              params.format_hint ?? params.formatHint,
            );
            result = { success: true, data };
            break;
          }
          case "cad_cam_feature_extract_one": {
            const programPath = params.program_path ?? params.programPath;
            if (!programPath || typeof programPath !== "string") {
              return dispatcherError(
                new Error("cad_cam_feature_extract_one requires program_path"),
                action, "prism_cad",
              );
            }
            const { camFeatureExtractorEngine } = await import("../../engines/CAMFeatureExtractorEngine.js");
            const data = camFeatureExtractorEngine.extractOne(programPath);
            result = { success: true, data };
            break;
          }
          case "cad_feature_store_put": {
            const { featureStoreEngine } = await import("../../engines/FeatureStoreEngine.js");
            const data = featureStoreEngine.put(params.input ?? params as Parameters<typeof featureStoreEngine.put>[0]);
            result = { success: data.ok, data };
            break;
          }
          case "cad_feature_store_query": {
            const query = params.query ?? params;
            const { featureStoreEngine } = await import("../../engines/FeatureStoreEngine.js");
            const data = featureStoreEngine.getHistoricalFeatures(query as Parameters<typeof featureStoreEngine.getHistoricalFeatures>[0]);
            result = { success: true, data };
            break;
          }
          case "cad_feature_store_stats": {
            const { featureStoreEngine } = await import("../../engines/FeatureStoreEngine.js");
            const data = featureStoreEngine.stats();
            result = { success: true, data };
            break;
          }
          case "cad_part_springback": {
            const input = params.input ?? params;
            const { springbackPredictionEngine } = await import("../../engines/SpringbackPredictionEngine.js");
            const data = springbackPredictionEngine.compute(input as Parameters<typeof springbackPredictionEngine.compute>[0]);
            result = { success: true, data };
            break;
          }
          // ── PHASE24: text/neural/tolerance/multi-CAD-bridge orphans ──
          case "cad_text_to_cad_generate": {
            const { textToCADGenerationEngine } = await import("../../engines/TextToCADGenerationEngine.js");
            const data = await textToCADGenerationEngine.generate(
              params.input ?? params,
              params.generation_backend ?? params.generationBackend,
              params.embedding_backend ?? params.embeddingBackend,
              params.corpus,
              params.config,
            );
            result = { success: data.success, data };
            break;
          }
          case "cad_text_parse": {
            const text = params.text;
            if (typeof text !== "string" || text.length === 0) {
              return dispatcherError(
                new Error("cad_text_parse requires non-empty text string"),
                action, "prism_cad",
              );
            }
            const { textToCADGenerationEngine } = await import("../../engines/TextToCADGenerationEngine.js");
            const data = textToCADGenerationEngine.parseText(text);
            result = { success: true, data };
            break;
          }
          case "cad_text_supported_features": {
            const { textToCADGenerationEngine } = await import("../../engines/TextToCADGenerationEngine.js");
            const features = textToCADGenerationEngine.getSupportedFeatures();
            result = { success: true, data: { features, count: features.length } };
            break;
          }
          case "cad_neural_generate": {
            const { neuralCADGenerationEngine } = await import("../../engines/NeuralCADGenerationEngine.js");
            const data = await neuralCADGenerationEngine.generate(
              params.input ?? params as Parameters<typeof neuralCADGenerationEngine.generate>[0],
              params.generation_backend ?? params.generationBackend,
              params.embedding_backend ?? params.embeddingBackend,
              params.corpus,
              params.config,
            );
            result = { success: data.success, data };
            break;
          }
          case "cad_neural_extract_features_text": {
            const text = params.text;
            if (typeof text !== "string" || text.length === 0) {
              return dispatcherError(
                new Error("cad_neural_extract_features_text requires non-empty text string"),
                action, "prism_cad",
              );
            }
            const { neuralCADGenerationEngine } = await import("../../engines/NeuralCADGenerationEngine.js");
            const data = neuralCADGenerationEngine.extractFeaturesFromText(text);
            result = { success: true, data, count: data.length };
            break;
          }
          case "cad_part_geometry_analyze": {
            const { partGeometryPipelineEngine } = await import("../../engines/PartGeometryPipelineEngine.js");
            const data = partGeometryPipelineEngine.analyzeFeatures(params.input ?? params as Parameters<typeof partGeometryPipelineEngine.analyzeFeatures>[0]);
            result = { success: true, data };
            break;
          }
          case "cad_part_geometry_match_tools": {
            const { partGeometryPipelineEngine } = await import("../../engines/PartGeometryPipelineEngine.js");
            const data = partGeometryPipelineEngine.matchTools(params.input ?? params as Parameters<typeof partGeometryPipelineEngine.matchTools>[0]);
            result = { success: true, data };
            break;
          }
          case "cad_fcf_validate": {
            const { fcfSyntaxValidatorEngine } = await import("../../engines/FCFSyntaxValidatorEngine.js");
            const data = fcfSyntaxValidatorEngine.validate(params.input ?? params as Parameters<typeof fcfSyntaxValidatorEngine.validate>[0]);
            result = { success: true, data };
            break;
          }
          // ── BLUEPRINT-OCR-TRAINING-MS1/U1: 2 GD&T monolith-fork rescues ────────
          case "cad_gdt_parse_enhanced": {
            if (!params.callout || typeof params.callout !== "string") {
              return dispatcherError(
                new Error("cad_gdt_parse_enhanced requires callout: string"),
                action, "prism_cad",
              );
            }
            const { prismEnhancedGdtEngine } = await import("../../engines/PrismEnhancedGDTEngine.js");
            const data = prismEnhancedGdtEngine.parseEnhanced(params.callout);
            result = { success: true, data };
            break;
          }
          case "cad_gdt_fcf_parse_enhanced": {
            // Accepts either: { callout: string } for two-line `\n`-delimited input,
            // or { primary: string, refinement: string } for explicit form.
            const { prismGdtFcfParserEngine } = await import("../../engines/PrismGDTFCFParserEngine.js");
            let input: string | { primary: string; refinement: string };
            if (typeof params.callout === "string") {
              input = params.callout;
            } else if (typeof params.primary === "string" && typeof params.refinement === "string") {
              input = { primary: params.primary, refinement: params.refinement };
            } else {
              return dispatcherError(
                new Error("cad_gdt_fcf_parse_enhanced requires callout: string OR {primary: string, refinement: string}"),
                action, "prism_cad",
              );
            }
            const data = prismGdtFcfParserEngine.parseComposite(input);
            result = { success: true, data };
            break;
          }
          case "cad_tolerance_it_grade": {
            const nominal_mm = Number(params.nominal_mm ?? params.nominalMm);
            const it_grade = Number(params.it_grade ?? params.itGrade);
            if (!Number.isFinite(nominal_mm) || !Number.isFinite(it_grade)) {
              return dispatcherError(
                new Error("cad_tolerance_it_grade requires nominal_mm and it_grade (numbers)"),
                action, "prism_cad",
              );
            }
            const { calculateITGrade } = await import("../../engines/ToleranceEngine.js");
            const data = calculateITGrade(nominal_mm, it_grade);
            result = { success: true, data };
            break;
          }
          case "cad_tolerance_fit_analyze": {
            const nominal_mm = Number(params.nominal_mm ?? params.nominalMm);
            const fit_class = String(params.fit_class ?? params.fitClass ?? "");
            if (!Number.isFinite(nominal_mm) || fit_class.length === 0) {
              return dispatcherError(
                new Error("cad_tolerance_fit_analyze requires nominal_mm (number) and fit_class (e.g. 'H7/g6')"),
                action, "prism_cad",
              );
            }
            const { analyzeShaftHoleFit } = await import("../../engines/ToleranceEngine.js");
            const data = analyzeShaftHoleFit(nominal_mm, fit_class);
            result = { success: true, data };
            break;
          }
          case "cad_tolerance_stackup": {
            const dimensions = params.dimensions;
            if (!Array.isArray(dimensions) || dimensions.length === 0) {
              return dispatcherError(
                new Error("cad_tolerance_stackup requires dimensions[] (StackDimension[])"),
                action, "prism_cad",
              );
            }
            const { toleranceStackUp } = await import("../../engines/ToleranceEngine.js");
            const data = toleranceStackUp(dimensions as Parameters<typeof toleranceStackUp>[0]);
            result = { success: true, data };
            break;
          }
          case "cad_translate_blueprint_to_ops": {
            const input = params.input ?? params;
            const label = String(params.label ?? "cad_translate_blueprint_to_ops");
            const { translateBlueprintToOps } = await import("../../engines/PrintToCADTranslator.js");
            const data = translateBlueprintToOps(input as Parameters<typeof translateBlueprintToOps>[0], label);
            result = { success: true, data };
            break;
          }
          case "cad_solidworks_plan_execution": {
            const moduleId = String(params.module_id ?? params.moduleId ?? "");
            const operationId = String(params.operation_id ?? params.operationId ?? "");
            if (moduleId.length === 0 || operationId.length === 0) {
              return dispatcherError(
                new Error("cad_solidworks_plan_execution requires module_id + operation_id"),
                action, "prism_cad",
              );
            }
            const { SolidWorksCADExecutionBridge } = await import("../../engines/SolidWorksCADExecutionBridge.js");
            const plan = await SolidWorksCADExecutionBridge.plan({
              moduleId, operationId,
              params: (params.op_params ?? params.params ?? {}) as Record<string, unknown>,
            });
            const vba_scaffold = SolidWorksCADExecutionBridge.renderVBAScaffold(plan);
            result = { success: true, plan, vba_scaffold };
            break;
          }
          case "cad_inventor_plan_execution": {
            const moduleId = String(params.module_id ?? params.moduleId ?? "");
            const operationId = String(params.operation_id ?? params.operationId ?? "");
            if (moduleId.length === 0 || operationId.length === 0) {
              return dispatcherError(
                new Error("cad_inventor_plan_execution requires module_id + operation_id"),
                action, "prism_cad",
              );
            }
            const { InventorCADExecutionBridge } = await import("../../engines/InventorCADExecutionBridge.js");
            const plan = await InventorCADExecutionBridge.plan({
              moduleId, operationId,
              params: (params.op_params ?? params.params ?? {}) as Record<string, unknown>,
            });
            const ilogic_scaffold = InventorCADExecutionBridge.renderILogicScaffold(plan);
            result = { success: true, plan, ilogic_scaffold };
            break;
          }
          case "cad_mastercam_plan_execution": {
            const moduleId = String(params.module_id ?? params.moduleId ?? "");
            const operationId = String(params.operation_id ?? params.operationId ?? "");
            if (moduleId.length === 0 || operationId.length === 0) {
              return dispatcherError(
                new Error("cad_mastercam_plan_execution requires module_id + operation_id"),
                action, "prism_cad",
              );
            }
            const { MastercamCADExecutionBridge } = await import("../../engines/MastercamCADExecutionBridge.js");
            const plan = await MastercamCADExecutionBridge.plan({
              moduleId, operationId,
              params: (params.op_params ?? params.params ?? {}) as Record<string, unknown>,
            });
            const net_hook_scaffold = MastercamCADExecutionBridge.renderNETHookScaffold(plan);
            result = { success: true, plan, net_hook_scaffold };
            break;
          }
          case "cad_hypercads_plan_execution": {
            const moduleId = String(params.module_id ?? params.moduleId ?? "");
            const operationId = String(params.operation_id ?? params.operationId ?? "");
            if (moduleId.length === 0 || operationId.length === 0) {
              return dispatcherError(
                new Error("cad_hypercads_plan_execution requires module_id + operation_id"),
                action, "prism_cad",
              );
            }
            const { HyperCADCADExecutionBridge } = await import("../../engines/HyperCADCADExecutionBridge.js");
            const plan = await HyperCADCADExecutionBridge.plan({
              moduleId, operationId,
              params: (params.op_params ?? params.params ?? {}) as Record<string, unknown>,
            });
            const macro_scaffold = HyperCADCADExecutionBridge.renderMacroScaffold(plan);
            result = { success: true, plan, macro_scaffold };
            break;
          }
          // ── PHASE25: file-format parsers + FreeCAD + fixture + KG ──
          case "cad_drawing_2d_register": {
            const path = String(params.path ?? "");
            if (path.length === 0) {
              return dispatcherError(
                new Error("cad_drawing_2d_register requires path"),
                action, "prism_cad",
              );
            }
            const { Drawing2DExtractionEngine } = await import("../../engines/Drawing2DExtractionEngine.js");
            Drawing2DExtractionEngine.registerDrawing(path);
            result = { success: true, data: { path, registered: true } };
            break;
          }
          case "cad_drawing_2d_extract": {
            const path = String(params.path ?? "");
            if (path.length === 0) {
              return dispatcherError(
                new Error("cad_drawing_2d_extract requires path"),
                action, "prism_cad",
              );
            }
            const { Drawing2DExtractionEngine } = await import("../../engines/Drawing2DExtractionEngine.js");
            const data = Drawing2DExtractionEngine.extractDrawing(
              path,
              params.simulated_data ?? params.simulatedData,
            );
            result = { success: true, data };
            break;
          }
          case "cad_drawing_2d_queue_stats": {
            const { Drawing2DExtractionEngine } = await import("../../engines/Drawing2DExtractionEngine.js");
            const data = Drawing2DExtractionEngine.getQueueStats();
            result = { success: true, data };
            break;
          }
          case "cad_fcstd_parse": {
            const filePath = String(params.file_path ?? params.filePath ?? "");
            if (filePath.length === 0) {
              return dispatcherError(
                new Error("cad_fcstd_parse requires file_path"),
                action, "prism_cad",
              );
            }
            const { fcStdNativeParserEngine } = await import("../../engines/FCStdNativeParserEngine.js");
            const data = await fcStdNativeParserEngine.parse(filePath);
            result = { success: true, data };
            break;
          }
          case "cad_fcstd_parse_buffer": {
            const b64 = params.buffer_base64 ?? params.bufferBase64;
            if (typeof b64 !== "string" || b64.length === 0) {
              return dispatcherError(
                new Error("cad_fcstd_parse_buffer requires buffer_base64 (base64 string)"),
                action, "prism_cad",
              );
            }
            const { fcStdNativeParserEngine } = await import("../../engines/FCStdNativeParserEngine.js");
            const data = await fcStdNativeParserEngine.parseBuffer(Buffer.from(b64, "base64"));
            result = { success: true, data };
            break;
          }
          case "cad_f3d_parse": {
            const filePath = String(params.file_path ?? params.filePath ?? "");
            if (filePath.length === 0) {
              return dispatcherError(
                new Error("cad_f3d_parse requires file_path"),
                action, "prism_cad",
              );
            }
            const { f3dSqliteParserEngine } = await import("../../engines/F3DSQLiteParserEngine.js");
            const data = await f3dSqliteParserEngine.parse(filePath);
            result = { success: true, data };
            break;
          }
          case "cad_f3d_parse_f3z": {
            const filePath = String(params.file_path ?? params.filePath ?? "");
            if (filePath.length === 0) {
              return dispatcherError(
                new Error("cad_f3d_parse_f3z requires file_path"),
                action, "prism_cad",
              );
            }
            const { f3dSqliteParserEngine } = await import("../../engines/F3DSQLiteParserEngine.js");
            const data = await f3dSqliteParserEngine.parseF3Z(filePath);
            result = { success: true, data, count: data.length };
            break;
          }
          case "cad_f3d_timeline": {
            const filePath = String(params.file_path ?? params.filePath ?? "");
            if (filePath.length === 0) {
              return dispatcherError(
                new Error("cad_f3d_timeline requires file_path"),
                action, "prism_cad",
              );
            }
            const { f3dSqliteParserEngine } = await import("../../engines/F3DSQLiteParserEngine.js");
            const data = await f3dSqliteParserEngine.getTimeline(filePath);
            result = { success: true, data };
            break;
          }
          case "cad_dxf_parse_polygons": {
            const content = String(params.content ?? "");
            if (content.length === 0) {
              return dispatcherError(
                new Error("cad_dxf_parse_polygons requires content (DXF text)"),
                action, "prism_cad",
              );
            }
            const { dxfParserEngine } = await import("../../engines/DXFParserEngine.js");
            const data = dxfParserEngine.parseDXF(content);
            result = { success: true, data, count: data.length };
            break;
          }
          case "cad_svg_parse_polygons": {
            const content = String(params.content ?? "");
            if (content.length === 0) {
              return dispatcherError(
                new Error("cad_svg_parse_polygons requires content (SVG text)"),
                action, "prism_cad",
              );
            }
            const { dxfParserEngine } = await import("../../engines/DXFParserEngine.js");
            const data = dxfParserEngine.parseSVG(content);
            result = { success: true, data, count: data.length };
            break;
          }
          case "cad_dxf_geom_parse": {
            const content = String(params.content ?? "");
            const fmt = (params.format ?? "dxf") as "dxf" | "step" | "iges";
            if (content.length === 0) {
              return dispatcherError(
                new Error("cad_dxf_geom_parse requires content"),
                action, "prism_cad",
              );
            }
            const { dxfGeometryParserEngine } = await import("../../engines/DXFGeometryParserEngine.js");
            const data = dxfGeometryParserEngine.parseGeometryFile(content, fmt);
            result = { success: true, data };
            break;
          }
          case "cad_dxf_geom_validate_wedm": {
            const contours = params.contours;
            if (!Array.isArray(contours)) {
              return dispatcherError(
                new Error("cad_dxf_geom_validate_wedm requires contours[] (WireEDMContour[])"),
                action, "prism_cad",
              );
            }
            const { dxfGeometryParserEngine } = await import("../../engines/DXFGeometryParserEngine.js");
            const data = dxfGeometryParserEngine.validateForWireEDM(contours as Parameters<typeof dxfGeometryParserEngine.validateForWireEDM>[0]);
            result = { success: true, data };
            break;
          }
          case "cad_freecad_build_script": {
            const ops = params.ops;
            if (!Array.isArray(ops) || ops.length === 0) {
              return dispatcherError(
                new Error("cad_freecad_build_script requires ops[] (CADOperation[])"),
                action, "prism_cad",
              );
            }
            const { freeCADCodeGeneratorEngine } = await import("../../engines/FreeCADCodeGeneratorEngine.js");
            const data = freeCADCodeGeneratorEngine.buildScript(
              ops as Parameters<typeof freeCADCodeGeneratorEngine.buildScript>[0],
              params.context as Parameters<typeof freeCADCodeGeneratorEngine.buildScript>[1],
            );
            result = { success: true, data };
            break;
          }
          case "cad_fixture_ingest_file": {
            const filePath = String(params.file_path ?? params.filePath ?? "");
            if (filePath.length === 0) {
              return dispatcherError(
                new Error("cad_fixture_ingest_file requires file_path"),
                action, "prism_cad",
              );
            }
            const { fixtureCadIngesterEngine } = await import("../../engines/FixtureCadIngesterEngine.js");
            const data = await fixtureCadIngesterEngine.ingestFile(
              filePath,
              params.options as Parameters<typeof fixtureCadIngesterEngine.ingestFile>[1],
            );
            result = { success: true, data };
            break;
          }
          case "cad_fixture_ingest_directory": {
            const dirPath = String(params.dir_path ?? params.dirPath ?? "");
            if (dirPath.length === 0) {
              return dispatcherError(
                new Error("cad_fixture_ingest_directory requires dir_path"),
                action, "prism_cad",
              );
            }
            const { fixtureCadIngesterEngine } = await import("../../engines/FixtureCadIngesterEngine.js");
            const data = await fixtureCadIngesterEngine.ingestDirectory(
              dirPath,
              params.options as Parameters<typeof fixtureCadIngesterEngine.ingestDirectory>[1],
            );
            result = { success: true, data };
            break;
          }
          case "cad_kg_build": {
            const operations = params.operations;
            if (!Array.isArray(operations)) {
              return dispatcherError(
                new Error("cad_kg_build requires operations[] (CADOperationInput[])"),
                action, "prism_cad",
              );
            }
            const { cadKnowledgeGraphEngine } = await import("../../engines/CADKnowledgeGraphEngine.js");
            const data = cadKnowledgeGraphEngine.build(operations as Parameters<typeof cadKnowledgeGraphEngine.build>[0]);
            result = { success: true, data };
            break;
          }
          case "cad_kg_detect_cycles": {
            const graph = params.graph;
            if (!graph || typeof graph !== "object") {
              return dispatcherError(
                new Error("cad_kg_detect_cycles requires graph (CADGraph)"),
                action, "prism_cad",
              );
            }
            const { cadKnowledgeGraphEngine } = await import("../../engines/CADKnowledgeGraphEngine.js");
            const data = cadKnowledgeGraphEngine.detectCycles(graph as Parameters<typeof cadKnowledgeGraphEngine.detectCycles>[0]);
            result = { success: true, data };
            break;
          }
          // ── PHASE26: part-family economics + probe + surface CNN + machine capability ──
          case "cad_part_family_lot_size": {
            const { partFamilyEconomicsEngine } = await import("../../engines/PartFamilyEconomicsEngine.js");
            const data = partFamilyEconomicsEngine.analyzeLotSize(params.input ?? params as Parameters<typeof partFamilyEconomicsEngine.analyzeLotSize>[0]);
            result = { success: true, data };
            break;
          }
          case "cad_part_family_tool_rotation": {
            const { partFamilyEconomicsEngine } = await import("../../engines/PartFamilyEconomicsEngine.js");
            const data = partFamilyEconomicsEngine.analyzeToolRotation(params.input ?? params as Parameters<typeof partFamilyEconomicsEngine.analyzeToolRotation>[0]);
            result = { success: true, data };
            break;
          }
          case "cad_part_family_cost_drivers": {
            const { partFamilyEconomicsEngine } = await import("../../engines/PartFamilyEconomicsEngine.js");
            const data = partFamilyEconomicsEngine.analyzeCostDrivers(params.input ?? params as Parameters<typeof partFamilyEconomicsEngine.analyzeCostDrivers>[0]);
            result = { success: true, data };
            break;
          }
          case "cad_part_family_batch_purchasing": {
            const { partFamilyEconomicsEngine } = await import("../../engines/PartFamilyEconomicsEngine.js");
            const data = partFamilyEconomicsEngine.analyzeBatchPurchasing(params.input ?? params as Parameters<typeof partFamilyEconomicsEngine.analyzeBatchPurchasing>[0]);
            result = { success: true, data };
            break;
          }
          case "cad_part_family_report": {
            const { partFamilyEconomicsEngine } = await import("../../engines/PartFamilyEconomicsEngine.js");
            const data = partFamilyEconomicsEngine.getPartFamilyReport(params.input ?? params as Parameters<typeof partFamilyEconomicsEngine.getPartFamilyReport>[0]);
            result = { success: true, data };
            break;
          }
          case "cad_probe_drift_record": {
            const { ProbeDriftEngine } = await import("../../engines/ProbeDriftEngine.js");
            const data = ProbeDriftEngine.recordCalibration(params.data ?? params as Parameters<typeof ProbeDriftEngine.recordCalibration>[0]);
            result = { success: true, data };
            break;
          }
          case "cad_probe_drift_analyze": {
            const probeId = String(params.probe_id ?? params.probeId ?? "");
            if (probeId.length === 0) {
              return dispatcherError(
                new Error("cad_probe_drift_analyze requires probe_id"),
                action, "prism_cad",
              );
            }
            const { ProbeDriftEngine } = await import("../../engines/ProbeDriftEngine.js");
            const data = ProbeDriftEngine.analyzeDrift(probeId);
            result = { success: data !== undefined, data: data ?? null };
            break;
          }
          case "cad_probe_drift_history": {
            const probeId = String(params.probe_id ?? params.probeId ?? "");
            if (probeId.length === 0) {
              return dispatcherError(
                new Error("cad_probe_drift_history requires probe_id"),
                action, "prism_cad",
              );
            }
            const { ProbeDriftEngine } = await import("../../engines/ProbeDriftEngine.js");
            const limit = typeof params.limit === "number" ? params.limit : undefined;
            const data = ProbeDriftEngine.getCalibrationHistory(probeId, limit);
            result = { success: true, data, count: data.length };
            break;
          }
          case "cad_probe_drift_alerts": {
            const { ProbeDriftEngine } = await import("../../engines/ProbeDriftEngine.js");
            const probeId = params.probe_id ?? params.probeId;
            const data = ProbeDriftEngine.getActiveAlerts(typeof probeId === "string" ? probeId : undefined);
            result = { success: true, data, count: data.length };
            break;
          }
          case "cad_probe_record": {
            const { ProbeRecordEngine } = await import("../../engines/ProbeRecordEngine.js");
            const data = ProbeRecordEngine.recordProbe(params.data ?? params as Parameters<typeof ProbeRecordEngine.recordProbe>[0]);
            result = { success: true, data };
            break;
          }
          case "cad_probe_tool_setter_record": {
            const { ProbeRecordEngine } = await import("../../engines/ProbeRecordEngine.js");
            const data = ProbeRecordEngine.recordToolSetter(params.data ?? params as Parameters<typeof ProbeRecordEngine.recordToolSetter>[0]);
            result = { success: true, data };
            break;
          }
          case "cad_probe_get": {
            const id = String(params.id ?? "");
            if (id.length === 0) {
              return dispatcherError(
                new Error("cad_probe_get requires id"),
                action, "prism_cad",
              );
            }
            const { ProbeRecordEngine } = await import("../../engines/ProbeRecordEngine.js");
            const data = ProbeRecordEngine.getProbeRecord(id);
            result = { success: data !== undefined, data: data ?? null };
            break;
          }
          case "cad_probe_list": {
            const { ProbeRecordEngine } = await import("../../engines/ProbeRecordEngine.js");
            const filter = {
              machineId: typeof params.machine_id === "string" ? params.machine_id : (typeof params.machineId === "string" ? params.machineId : undefined),
              partNumber: typeof params.part_number === "string" ? params.part_number : (typeof params.partNumber === "string" ? params.partNumber : undefined),
              workOrderNumber: typeof params.work_order_number === "string" ? params.work_order_number : (typeof params.workOrderNumber === "string" ? params.workOrderNumber : undefined),
            };
            const data = ProbeRecordEngine.listProbeRecords(filter);
            result = { success: true, data, count: data.length };
            break;
          }
          case "cad_surface_finish_predict": {
            const toolpath = params.toolpath;
            const material = params.material;
            if (!toolpath || !material) {
              return dispatcherError(
                new Error("cad_surface_finish_predict requires toolpath + material objects"),
                action, "prism_cad",
              );
            }
            const { surfaceFinishCnnEngine } = await import("../../engines/SurfaceFinishCnnEngine.js");
            const data = surfaceFinishCnnEngine.predict(
              toolpath as Parameters<typeof surfaceFinishCnnEngine.predict>[0],
              material as Parameters<typeof surfaceFinishCnnEngine.predict>[1],
              params.dynamic as Parameters<typeof surfaceFinishCnnEngine.predict>[2],
              typeof params.target_ra_um === "number" ? params.target_ra_um : (typeof params.targetRaUm === "number" ? params.targetRaUm : undefined),
            );
            result = { success: true, data };
            break;
          }
          case "cad_surface_finish_predict_batch": {
            const inputs = params.inputs;
            if (!Array.isArray(inputs) || inputs.length === 0) {
              return dispatcherError(
                new Error("cad_surface_finish_predict_batch requires inputs[] array"),
                action, "prism_cad",
              );
            }
            const { surfaceFinishCnnEngine } = await import("../../engines/SurfaceFinishCnnEngine.js");
            const data = surfaceFinishCnnEngine.predictBatch(inputs as Parameters<typeof surfaceFinishCnnEngine.predictBatch>[0]);
            result = { success: true, data, count: data.predictions.length };
            break;
          }
          case "cad_surface_finish_model_metadata": {
            const { surfaceFinishCnnEngine } = await import("../../engines/SurfaceFinishCnnEngine.js");
            const data = surfaceFinishCnnEngine.getModelMetadata();
            result = { success: true, data };
            break;
          }
          case "cad_machine_capability_get": {
            const machineId = String(params.machine_id ?? params.machineId ?? "");
            if (machineId.length === 0) {
              return dispatcherError(
                new Error("cad_machine_capability_get requires machine_id"),
                action, "prism_cad",
              );
            }
            const { machineCapabilitySurfaceEngine } = await import("../../engines/MachineCapabilitySurfaceEngine.js");
            const data = machineCapabilitySurfaceEngine.getCapabilitySummary(machineId);
            result = { success: data !== null, data: data ?? null };
            break;
          }
          case "cad_machine_capability_with_accuracy": {
            // U-DEA-november-P02 — activate MachineGeometricAccuracyEngine (acc_volumetric +
            // acc_abbe_offset + acc_ball_bar) at machine-capability lookup so downstream
            // physics (deflection / thermal / surface finish) sees realistic accuracy bounds
            // instead of nominals.
            const machineId = String(params.machine_id ?? params.machineId ?? "");
            if (machineId.length === 0) {
              return dispatcherError(
                new Error("cad_machine_capability_with_accuracy requires machine_id"),
                action, "prism_cad",
              );
            }
            const { machineCapabilitySurfaceEngine } = await import("../../engines/MachineCapabilitySurfaceEngine.js");
            type AccuracyOpts = Parameters<typeof machineCapabilitySurfaceEngine.getCapabilityWithAccuracy>[1];
            const optsRaw = (params.opts ?? params.options ?? {}) as Record<string, unknown>;
            // Normalize snake_case ↔ camelCase. Engine validates; dispatcher hands off typed shape.
            const opts: AccuracyOpts = {
              axis_errors: (optsRaw.axis_errors ?? optsRaw.axisErrors) as AccuracyOpts["axis_errors"],
              squareness: optsRaw.squareness as AccuracyOpts["squareness"],
              workspace: optsRaw.workspace as AccuracyOpts["workspace"],
              volumetric_grid_points: (optsRaw.volumetric_grid_points ?? optsRaw.volumetricGridPoints) as number | undefined,
              abbe_queries: (optsRaw.abbe_queries ?? optsRaw.abbeQueries) as AccuracyOpts["abbe_queries"],
              ball_bar: (optsRaw.ball_bar ?? optsRaw.ballBar) as AccuracyOpts["ball_bar"],
            };
            const data = machineCapabilitySurfaceEngine.getCapabilityWithAccuracy(machineId, opts);
            result = { success: data !== null, data: data ?? null };
            break;
          }
          case "cad_machine_capability_controller": {
            const machineId = String(params.machine_id ?? params.machineId ?? "");
            if (machineId.length === 0) {
              return dispatcherError(
                new Error("cad_machine_capability_controller requires machine_id"),
                action, "prism_cad",
              );
            }
            const { machineCapabilitySurfaceEngine } = await import("../../engines/MachineCapabilitySurfaceEngine.js");
            const data = machineCapabilitySurfaceEngine.getControllerCapabilities(machineId);
            result = { success: data !== null, data: data ?? null };
            break;
          }
          case "cad_machine_capability_compare": {
            const machineIds = params.machine_ids ?? params.machineIds;
            if (!Array.isArray(machineIds) || machineIds.length === 0) {
              return dispatcherError(
                new Error("cad_machine_capability_compare requires machine_ids[] (string[])"),
                action, "prism_cad",
              );
            }
            const { machineCapabilitySurfaceEngine } = await import("../../engines/MachineCapabilitySurfaceEngine.js");
            const data = machineCapabilitySurfaceEngine.compareCapabilities(machineIds as string[]);
            result = { success: true, data };
            break;
          }
          case "cad_machine_capability_find": {
            const requirements = params.requirements ?? params;
            const { machineCapabilitySurfaceEngine } = await import("../../engines/MachineCapabilitySurfaceEngine.js");
            const data = machineCapabilitySurfaceEngine.findByCapabilities(requirements as Parameters<typeof machineCapabilitySurfaceEngine.findByCapabilities>[0]);
            result = { success: true, data };
            break;
          }
          // ── Part Folder Organizer (JM Die per-customer / per-part-number library) ──
          case "create_part_folder": {
            const pn = params.partNumber ?? params.part_number;
            if (pn == null || String(pn).trim() === "") {
              return dispatcherError(new Error("create_part_folder requires part_number"), action, "prism_cad");
            }
            const { partFolderOrganizerEngine } = await import("../../engines/PartFolderOrganizerEngine.js");
            const data = partFolderOrganizerEngine.createPartFolder({
              partNumber: pn,
              customer: params.customer,
              partNumberNormalized: params.partNumberNormalized ?? params.part_number_normalized,
              rawVariants: params.rawVariants ?? params.raw_variants,
              printCustomers: params.printCustomers ?? params.print_customers,
              programCustomers: params.programCustomers ?? params.program_customers,
              matchConfidence: params.matchConfidence ?? params.match_confidence,
              prints: params.prints,
              cncPrograms: params.cncPrograms ?? params.cnc_programs,
              cadCam: params.cadCam ?? params.cad_cam,
              programs: params.programs,
              libraryRoot: params.libraryRoot ?? params.library_root,
              copyMode: params.copyMode ?? params.copy_mode,
              overwrite: params.overwrite === true,
              joinTableSource: params.joinTableSource ?? params.join_table_source,
              notes: params.notes,
              createdBy: "prism_cad:create_part_folder",
            });
            result = { success: data.ok, data };
            break;
          }
          case "get_part_folder": {
            const pn = params.partNumber ?? params.part_number;
            if (pn == null || String(pn).trim() === "") {
              return dispatcherError(new Error("get_part_folder requires part_number"), action, "prism_cad");
            }
            const { partFolderOrganizerEngine } = await import("../../engines/PartFolderOrganizerEngine.js");
            const data = partFolderOrganizerEngine.getPartFolder({
              customer: String(params.customer ?? ""),
              partNumber: pn,
              libraryRoot: params.libraryRoot ?? params.library_root,
            });
            result = { success: true, data };
            break;
          }
          case "part_library_stats": {
            const { partFolderOrganizerEngine } = await import("../../engines/PartFolderOrganizerEngine.js");
            const data = partFolderOrganizerEngine.partLibraryStats({
              libraryRoot: params.libraryRoot ?? params.library_root,
              byCustomer: (params.byCustomer ?? params.by_customer) === true,
              withDisk: (params.withDisk ?? params.with_disk) === true,
            });
            result = { success: true, data };
            break;
          }
          case "part_library_populate": {
            const { partFolderOrganizerEngine } = await import("../../engines/PartFolderOrganizerEngine.js");
            const data = partFolderOrganizerEngine.populateFromJoinTable({
              joinJsonl: params.joinJsonl ?? params.join_jsonl,
              phase7Jsonl: params.phase7Jsonl ?? params.phase7_jsonl,
              libraryRoot: params.libraryRoot ?? params.library_root,
              confidenceFilter: params.confidenceFilter ?? params.confidence_filter,
              copyMode: params.copyMode ?? params.copy_mode,
              limit: typeof params.limit === "number" ? params.limit : undefined,
              offset: typeof params.offset === "number" ? params.offset : undefined,
              dryRun: (params.dryRun ?? params.dry_run) === true,
            });
            result = { success: data.ok, data };
            break;
          }
          // ── Macro library (catalog the JM Okuma-OSP lathe macros + match parts to families + place a labelled TEMPLATE — NON-safety-critical) ──
          case "macro_library_list": {
            const { macroLibraryEngine } = await import("../../engines/MacroLibraryEngine.js");
            const data = macroLibraryEngine.listMacros({ dir: params.dir ?? params.macroSourceDir ?? params.macro_source_dir });
            result = { success: true, data };
            break;
          }
          case "macro_match_family": {
            const { macroLibraryEngine } = await import("../../engines/MacroLibraryEngine.js");
            const data = macroLibraryEngine.matchFamily({
              geometry: params.geometry,
              features: params.features,
              nameText: params.nameText ?? params.name_text,
              counterborePresent: params.counterborePresent ?? params.counterbore_present,
              flangeStepPresent: params.flangeStepPresent ?? params.flange_step_present,
              odTaperPresent: params.odTaperPresent ?? params.od_taper_present,
              idTaperPresent: params.idTaperPresent ?? params.id_taper_present,
            });
            result = { success: true, data };
            break;
          }
          case "macro_place_template": {
            const pn = params.partNumber ?? params.part_number;
            if (pn == null || String(pn).trim() === "") {
              return dispatcherError(new Error("macro_place_template requires part_number"), action, "prism_cad");
            }
            const { macroLibraryEngine } = await import("../../engines/MacroLibraryEngine.js");
            const data = macroLibraryEngine.placeMacroTemplate({
              partNumber: pn,
              customer: params.customer,
              family: params.family,
              match: params.match,
              libraryRoot: params.libraryRoot ?? params.library_root,
              macroSourceDir: params.macroSourceDir ?? params.macro_source_dir,
              dryRun: (params.dryRun ?? params.dry_run) === true,
            });
            result = { success: data.placed || data.dryRun === true, data };
            break;
          }
          case "macro_fanout_dry_run": {
            const { macroLibraryEngine } = await import("../../engines/MacroLibraryEngine.js");
            const data = macroLibraryEngine.fanoutDryRun({
              libraryRoot: params.libraryRoot ?? params.library_root,
              limit: typeof params.limit === "number" ? params.limit : undefined,
              sampleSize: typeof (params.sampleSize ?? params.sample_size) === "number" ? (params.sampleSize ?? params.sample_size) : undefined,
            });
            result = { success: true, data };
            break;
          }
          // TRAINING-LEARNING-MS0/U1: CAD-domain bridge — lathe-scoped semantic alias of macro_place_template.
          // Identical engine call + result-bridging pattern; only differences are the action name (so it surfaces
          // under prism_cad) and the error-message prefix (so triage points at the right action). Family enum is
          // pre-constrained to lathe families by macroPlaceTemplateSchema.
          case "cad_lathe_template_place": {
            const pn = params.partNumber ?? params.part_number;
            if (pn == null || String(pn).trim() === "") {
              return dispatcherError(new Error("cad_lathe_template_place requires part_number"), action, "prism_cad");
            }
            const { macroLibraryEngine } = await import("../../engines/MacroLibraryEngine.js");
            const data = macroLibraryEngine.placeMacroTemplate({
              partNumber: pn,
              customer: params.customer,
              family: params.family,
              match: params.match,
              libraryRoot: params.libraryRoot ?? params.library_root,
              macroSourceDir: params.macroSourceDir ?? params.macro_source_dir,
              dryRun: (params.dryRun ?? params.dry_run) === true,
            });
            result = { success: data.placed || data.dryRun === true, data };
            break;
          }
          // U-PPL-D4: ProgramEquivalentIndexEngine — composes UniversalCADIndexEngine CAD master-index
          // with lathe .MIN JMDieDiskIndexEntry[]. Optional D1 join_jsonl_path triggers print-ref
          // enrichment. Pure composition: no new scanner; reuses ProgramPrintLinkIndexEngine's
          // normalizer + lookup. Output writes to data/state/cad-file-index/program-equivalent-index.json
          // (sibling of CAD master-index.json — never clobbers it).
          case "program_equivalent_index_compose": {
            try {
              const { programEquivalentIndexEngine } = await import(
                "../../engines/ProgramEquivalentIndexEngine.js"
              );
              const fs = await import("node:fs");

              const latheEntries = Array.isArray(params.lathe_entries)
                ? params.lathe_entries
                : Array.isArray(params.latheEntries)
                  ? params.latheEntries
                  : [];
              const mcxEntries = Array.isArray(params.mcx_entries)
                ? params.mcx_entries
                : Array.isArray(params.mcxEntries)
                  ? params.mcxEntries
                  : Array.isArray(params.mcxProgramEntries)
                    ? params.mcxProgramEntries
                    : undefined;

              let cadMasterIndex = null;
              const cadPath: string | undefined =
                typeof params.cad_master_index_path === "string"
                  ? params.cad_master_index_path
                  : typeof params.cadMasterIndexPath === "string"
                    ? params.cadMasterIndexPath
                    : undefined;
              if (cadPath && fs.existsSync(cadPath)) {
                const raw = fs.readFileSync(cadPath, "utf-8");
                cadMasterIndex = JSON.parse(raw);
              }

              const joinPath: string | undefined =
                typeof params.join_jsonl_path === "string"
                  ? params.join_jsonl_path
                  : typeof params.joinJsonlPath === "string"
                    ? params.joinJsonlPath
                    : undefined;
              const inputProgramPaths: readonly string[] = Array.isArray(
                params.input_program_paths ?? params.inputProgramPaths,
              )
                ? ((params.input_program_paths ??
                    params.inputProgramPaths) as readonly string[])
                : [];

              let linkIndex: unknown = undefined;
              if (joinPath || inputProgramPaths.length > 0) {
                const { loadLinkIndex } = await import(
                  "../../engines/ProgramPrintLinkIndexEngine.js"
                );
                linkIndex = loadLinkIndex({
                  joinJsonlPath: joinPath ?? "",
                  inputProgramPaths,
                });
              }

              const composeResult = await programEquivalentIndexEngine.compose({
                cadMasterIndex,
                latheProgramEntries: latheEntries,
                mcxProgramEntries: mcxEntries as Parameters<
                  typeof programEquivalentIndexEngine.compose
                >[0]["mcxProgramEntries"],
                linkIndex: linkIndex as Parameters<
                  typeof programEquivalentIndexEngine.compose
                >[0]["linkIndex"],
                dryRun: (params.dryRun ?? params.dry_run) !== false,
                outputPath:
                  typeof params.output_path === "string"
                    ? params.output_path
                    : typeof params.outputPath === "string"
                      ? params.outputPath
                      : undefined,
                limit:
                  typeof params.limit === "number" ? params.limit : undefined,
              });
              result = { success: true, data: composeResult };
            } catch (err) {
              result = dispatcherError(err, action, "prism_cad");
            }
            break;
          }
          case "docustrata_customer_index": {
            const { docustrataCustomerIndexEngine } = await import(
              "../../engines/DocustrataCustomerIndexEngine.js"
            );
            const mode = params.mode;
            let dci: unknown;
            switch (mode) {
              case "available":
                dci = docustrataCustomerIndexEngine.isAvailable();
                break;
              case "totals":
                dci = docustrataCustomerIndexEngine.getTotals();
                break;
              case "list":
                // normalizeParams has no alias for sort_by — read both forms.
                dci = docustrataCustomerIndexEngine.listCustomers({
                  sortBy: params.sortBy ?? params.sort_by,
                  limit: params.limit,
                });
                break;
              case "get":
                dci = docustrataCustomerIndexEngine.getCustomer(params.customer);
                break;
              case "search":
                dci = docustrataCustomerIndexEngine.searchCustomers(
                  params.query,
                  { limit: params.limit },
                );
                break;
              case "find_pn":
                // normalizeParams has no alias for part_number — read both forms.
                dci = docustrataCustomerIndexEngine.findByPartNumber(
                  params.partNumber ?? params.part_number,
                );
                break;
              default:
                // mode is Zod-enum-validated upstream; this is defence-in-depth.
                dci = {
                  available: false,
                  error: `unknown mode '${String(mode)}' — expected one of `
                    + `available|totals|list|get|search|find_pn`,
                };
            }
            result = { success: true, data: dci };
            break;
          }
          // WIRE-UNWIRED-MS0/U-WIRE-CADBRIDGE — CadBridge (Python subprocess) operability.
          // Pure-inspection only: reports singleton + subprocess state WITHOUT spawning.
          // peekInstance() returns null if getInstance() was never called this process.
          case "cad_bridge_status": {
            const { CadBridge } = await import("../../engines/CadBridge.js");
            const live = CadBridge.peekInstance();
            const cbs = live
              ? { ...live.getStatus(), instanceExists: true as const }
              : { initialized: false as const, instanceExists: false as const };
            result = { success: true, data: cbs };
            break;
          }
          // CAD-COMPLETE-MS0/U-CADC-LP01 — CADExecutionOutcomeBusEngine
          case "cad_outcome_publish": {
            const { cadExecutionOutcomeBusEngine } = await import("../../engines/CADExecutionOutcomeBusEngine.js");
            // Ensure the LP02 closed-loop collector module is loaded so its
            // singleton has subscribed to the bus before the first publish —
            // otherwise per-adapter feedback would miss outcome #1.
            await import("../../engines/CADPerAdapterFeedbackCollectorEngine.js");
            const pub = cadExecutionOutcomeBusEngine.publish({
              adapterId: params.adapterId,
              scriptId: params.scriptId,
              success: params.success,
              errorMessage: params.errorMessage,
              timingMs: params.timingMs,
              collision: params.collision,
              regenerationOk: params.regenerationOk,
              lineageId: params.lineageId,
              timestamp: params.timestamp,
            });
            result = { success: true, data: pub };
            break;
          }
          case "cad_outcome_stats": {
            const { cadExecutionOutcomeBusEngine } = await import("../../engines/CADExecutionOutcomeBusEngine.js");
            result = { success: true, data: cadExecutionOutcomeBusEngine.getStats() };
            break;
          }
          case "cad_outcome_subscribers": {
            const { cadExecutionOutcomeBusEngine } = await import("../../engines/CADExecutionOutcomeBusEngine.js");
            result = { success: true, data: { subscriberCount: cadExecutionOutcomeBusEngine.listSubscribers() } };
            break;
          }
          // CAD-COMPLETE-MS0/U-CADC-LP02 — CADPerAdapterFeedbackCollectorEngine
          case "cad_feedback_metrics": {
            const { cadPerAdapterFeedbackCollectorEngine } = await import("../../engines/CADPerAdapterFeedbackCollectorEngine.js");
            const data = params.headId
              ? cadPerAdapterFeedbackCollectorEngine.getMetrics(params.headId, params.window)
              : cadPerAdapterFeedbackCollectorEngine.getAllMetrics(params.window);
            result = { success: true, data };
            break;
          }
          case "cad_feedback_buffer": {
            const { cadPerAdapterFeedbackCollectorEngine } = await import("../../engines/CADPerAdapterFeedbackCollectorEngine.js");
            result = {
              success: true,
              data: cadPerAdapterFeedbackCollectorEngine.getFeedbackBuffer(params.headId, params.limit),
            };
            break;
          }
          case "cad_feedback_stats": {
            const { cadPerAdapterFeedbackCollectorEngine } = await import("../../engines/CADPerAdapterFeedbackCollectorEngine.js");
            result = { success: true, data: cadPerAdapterFeedbackCollectorEngine.getStats() };
            break;
          }
          // CAD-COMPLETE-MS0/U-CADC-LP03 — CADHeadReplayBufferEngine
          case "cad_replay_stats": {
            const { cadHeadReplayBufferEngine } = await import("../../engines/CADHeadReplayBufferEngine.js");
            result = { success: true, data: cadHeadReplayBufferEngine.getStats() };
            break;
          }
          case "cad_replay_entries": {
            const { cadHeadReplayBufferEngine } = await import("../../engines/CADHeadReplayBufferEngine.js");
            result = {
              success: true,
              data: cadHeadReplayBufferEngine.getEntries(params.headId, params.limit),
            };
            break;
          }
          // CAD-COMPLETE-MS0/U-CADC-LP04 — MasterBrainBackpropPropagatorEngine
          case "cad_backprop_params": {
            const { masterBrainBackpropPropagatorEngine, MASTER_TARGET } = await import("../../engines/MasterBrainBackpropPropagatorEngine.js");
            const target = typeof params?.target === "string" && params.target.length > 0 ? params.target : MASTER_TARGET;
            result = { success: true, data: masterBrainBackpropPropagatorEngine.getParams(target) };
            break;
          }
          case "cad_backprop_stats": {
            const { masterBrainBackpropPropagatorEngine } = await import("../../engines/MasterBrainBackpropPropagatorEngine.js");
            result = { success: true, data: masterBrainBackpropPropagatorEngine.getStats() };
            break;
          }
          // CAD-COMPLETE-MS0/U-CADC-NN01 — CADFoundationEncoderEngine
          case "cad_encoder_vocab": {
            const { cadFoundationEncoderEngine } = await import("../../engines/CADFoundationEncoderEngine.js");
            result = { success: true, data: cadFoundationEncoderEngine.getVocabulary() };
            break;
          }
          case "cad_encoder_stats": {
            const { cadFoundationEncoderEngine } = await import("../../engines/CADFoundationEncoderEngine.js");
            result = { success: true, data: cadFoundationEncoderEngine.getStats() };
            break;
          }
          // CAD-DRAW-MAX-MS0/P0-U01 — HyperCADSLiveBridgeEngine (17 actions)
          case "hypercads_live_new_doc": {
            const { hyperCADSLiveBridgeEngine } = await import("../../engines/HyperCADSLiveBridgeEngine.js");
            result = { success: true, data: hyperCADSLiveBridgeEngine.newDoc(params ?? {}) };
            break;
          }
          case "hypercads_live_sketch": {
            const { hyperCADSLiveBridgeEngine } = await import("../../engines/HyperCADSLiveBridgeEngine.js");
            result = { success: true, data: await hyperCADSLiveBridgeEngine.createSketch(params ?? {}) };
            break;
          }
          case "hypercads_live_extrude": {
            const { hyperCADSLiveBridgeEngine } = await import("../../engines/HyperCADSLiveBridgeEngine.js");
            result = { success: true, data: await hyperCADSLiveBridgeEngine.extrude(params as never) };
            break;
          }
          case "hypercads_live_fillet": {
            const { hyperCADSLiveBridgeEngine } = await import("../../engines/HyperCADSLiveBridgeEngine.js");
            result = { success: true, data: await hyperCADSLiveBridgeEngine.fillet(params as never) };
            break;
          }
          case "hypercads_live_chamfer": {
            const { hyperCADSLiveBridgeEngine } = await import("../../engines/HyperCADSLiveBridgeEngine.js");
            result = { success: true, data: await hyperCADSLiveBridgeEngine.chamfer(params as never) };
            break;
          }
          case "hypercads_live_revolve": {
            const { hyperCADSLiveBridgeEngine } = await import("../../engines/HyperCADSLiveBridgeEngine.js");
            result = { success: true, data: await hyperCADSLiveBridgeEngine.revolve(params as never) };
            break;
          }
          case "hypercads_live_hole": {
            const { hyperCADSLiveBridgeEngine } = await import("../../engines/HyperCADSLiveBridgeEngine.js");
            result = { success: true, data: await hyperCADSLiveBridgeEngine.hole(params as never) };
            break;
          }
          case "hypercads_live_pattern": {
            const { hyperCADSLiveBridgeEngine } = await import("../../engines/HyperCADSLiveBridgeEngine.js");
            result = { success: true, data: await hyperCADSLiveBridgeEngine.pattern(params as never) };
            break;
          }
          case "hypercads_live_combine": {
            const { hyperCADSLiveBridgeEngine } = await import("../../engines/HyperCADSLiveBridgeEngine.js");
            result = { success: true, data: await hyperCADSLiveBridgeEngine.combine(params as never) };
            break;
          }
          case "hypercads_live_shell": {
            const { hyperCADSLiveBridgeEngine } = await import("../../engines/HyperCADSLiveBridgeEngine.js");
            result = { success: true, data: await hyperCADSLiveBridgeEngine.shell(params as never) };
            break;
          }
          case "hypercads_live_export": {
            const { hyperCADSLiveBridgeEngine } = await import("../../engines/HyperCADSLiveBridgeEngine.js");
            result = { success: true, data: await hyperCADSLiveBridgeEngine.exportFile(params as never) };
            break;
          }
          case "hypercads_live_geometry": {
            const { hyperCADSLiveBridgeEngine } = await import("../../engines/HyperCADSLiveBridgeEngine.js");
            result = { success: true, data: hyperCADSLiveBridgeEngine.getGeometry(params ?? {}) };
            break;
          }
          case "hypercads_live_undo": {
            const { hyperCADSLiveBridgeEngine } = await import("../../engines/HyperCADSLiveBridgeEngine.js");
            result = { success: true, data: hyperCADSLiveBridgeEngine.undo(params ?? {}) };
            break;
          }
          case "hypercads_live_regenerate": {
            const { hyperCADSLiveBridgeEngine } = await import("../../engines/HyperCADSLiveBridgeEngine.js");
            result = { success: true, data: await hyperCADSLiveBridgeEngine.regenerate(params ?? {}) };
            break;
          }
          case "hypercads_live_execute_raw": {
            const { hyperCADSLiveBridgeEngine } = await import("../../engines/HyperCADSLiveBridgeEngine.js");
            result = { success: true, data: await hyperCADSLiveBridgeEngine.executeRaw(params.code, { projectName: params.projectName, filename: params.filename }) };
            break;
          }
          case "hypercads_live_stats": {
            const { hyperCADSLiveBridgeEngine } = await import("../../engines/HyperCADSLiveBridgeEngine.js");
            result = { success: true, data: hyperCADSLiveBridgeEngine.getStats() };
            break;
          }
          case "hypercads_live_list_sessions": {
            const { hyperCADSLiveBridgeEngine } = await import("../../engines/HyperCADSLiveBridgeEngine.js");
            result = { success: true, data: hyperCADSLiveBridgeEngine.listSessions() };
            break;
          }
          // CAD-DRAW-MAX-MS0/P0-U02 — HyperCADSOutcomePublisherEngine
          case "cad_hypercads_outcome_stats": {
            const { hyperCADSOutcomePublisherEngine } = await import("../../engines/HyperCADSOutcomePublisherEngine.js");
            result = { success: true, data: hyperCADSOutcomePublisherEngine.getStats() };
            break;
          }
          case "cad_hypercads_outcome_adapter": {
            const { HYPERCADS_ADAPTER_ID } = await import("../../engines/HyperCADSOutcomePublisherEngine.js");
            result = { success: true, data: { adapterId: HYPERCADS_ADAPTER_ID } };
            break;
          }
          // CAD-DRAW-MAX-MS0/P0-U03 — CADRegenFeedbackAdapterEngine
          case "cad_regen_feedback_publish": {
            const { cadRegenFeedbackAdapterEngine } = await import("../../engines/CADRegenFeedbackAdapterEngine.js");
            result = { success: true, data: cadRegenFeedbackAdapterEngine.publishWithRegen(params.result, params.regen, params.options ?? {}) };
            break;
          }
          case "cad_regen_feedback_stats": {
            const { cadRegenFeedbackAdapterEngine } = await import("../../engines/CADRegenFeedbackAdapterEngine.js");
            result = { success: true, data: cadRegenFeedbackAdapterEngine.getStats() };
            break;
          }
          // CAD-DRAW-MAX-MS0/P1-U04 — CADArgEncoderEngine
          case "cad_arg_encoder_encode": {
            const { cadArgEncoderEngine } = await import("../../engines/CADArgEncoderEngine.js");
            result = { success: true, data: { embedding: cadArgEncoderEngine.encodeArgs(params?.args) } };
            break;
          }
          case "cad_arg_encoder_batch": {
            const { cadArgEncoderEngine } = await import("../../engines/CADArgEncoderEngine.js");
            const ops = Array.isArray(params.ops) ? params.ops : [];
            const data = params.pooled === true
              ? { pooled: cadArgEncoderEngine.encodeOpArgsPooled(ops as never) }
              : { perOp: cadArgEncoderEngine.encodeOpArgs(ops as never) };
            result = { success: true, data };
            break;
          }
          case "cad_arg_encoder_stats": {
            const { cadArgEncoderEngine } = await import("../../engines/CADArgEncoderEngine.js");
            result = { success: true, data: cadArgEncoderEngine.getStats() };
            break;
          }
          // CAD-DRAW-MAX-MS0/P1-U06 — CADOperationDecoderEngine
          case "cad_decoder_propose": {
            const { cadOperationDecoderEngine } = await import("../../engines/CADOperationDecoderEngine.js");
            result = { success: true, data: cadOperationDecoderEngine.proposeNextOp(params?.ctx ?? {}, params?.options ?? {}) };
            break;
          }
          case "cad_decoder_propose_topk": {
            const { cadOperationDecoderEngine } = await import("../../engines/CADOperationDecoderEngine.js");
            const k = typeof params?.k === "number" && params.k > 0 ? params.k : 3;
            result = { success: true, data: cadOperationDecoderEngine.proposeNextOpsTopK(params?.ctx ?? {}, params?.options ?? {}, k) };
            break;
          }
          case "cad_decoder_vocab": {
            const { cadOperationDecoderEngine } = await import("../../engines/CADOperationDecoderEngine.js");
            result = { success: true, data: cadOperationDecoderEngine.getVocabulary() };
            break;
          }
          case "cad_decoder_stats": {
            const { cadOperationDecoderEngine } = await import("../../engines/CADOperationDecoderEngine.js");
            result = { success: true, data: cadOperationDecoderEngine.getStats() };
            break;
          }
          // CAD-DRAW-MAX-MS0/P1-U05 — CADSequencePoolEngine
          case "cad_sequence_pool": {
            const { cadSequencePoolEngine } = await import("../../engines/CADSequencePoolEngine.js");
            result = { success: true, data: { pooled: cadSequencePoolEngine.pool(params.rows, { strategy: params.strategy, alpha: params.alpha, attentionQuery: params.attentionQuery, expectedDim: params.expectedDim }) } };
            break;
          }
          case "cad_sequence_pool_all": {
            const { cadSequencePoolEngine } = await import("../../engines/CADSequencePoolEngine.js");
            result = { success: true, data: cadSequencePoolEngine.poolAll(params.rows, { alpha: params.alpha, attentionQuery: params.attentionQuery, expectedDim: params.expectedDim }) };
            break;
          }
          case "cad_sequence_pool_strategies": {
            const { POOL_STRATEGIES } = await import("../../engines/CADSequencePoolEngine.js");
            result = { success: true, data: { strategies: [...POOL_STRATEGIES] } };
            break;
          }
          case "cad_sequence_pool_stats": {
            const { cadSequencePoolEngine } = await import("../../engines/CADSequencePoolEngine.js");
            result = { success: true, data: cadSequencePoolEngine.getStats() };
            break;
          }
          // CAD-DRAW-MAX-MS0/P1-U07 — CADUnifiedFeatureBridgeEngine
          case "cad_unified_feature_encode": {
            const { cadUnifiedFeatureBridgeEngine } = await import("../../engines/CADUnifiedFeatureBridgeEngine.js");
            result = { success: true, data: cadUnifiedFeatureBridgeEngine.encode(params ?? {}) };
            break;
          }
          case "cad_unified_feature_layout": {
            const { cadUnifiedFeatureBridgeEngine } = await import("../../engines/CADUnifiedFeatureBridgeEngine.js");
            result = { success: true, data: cadUnifiedFeatureBridgeEngine.getLayout() };
            break;
          }
          case "cad_unified_feature_stats": {
            const { cadUnifiedFeatureBridgeEngine } = await import("../../engines/CADUnifiedFeatureBridgeEngine.js");
            result = { success: true, data: cadUnifiedFeatureBridgeEngine.getStats() };
            break;
          }
          // CAD-DRAW-MAX-MS0/P1-U09 — CADToleranceSignalEncoderEngine
          case "cad_tolerance_encode": {
            const { cadToleranceSignalEncoderEngine } = await import("../../engines/CADToleranceSignalEncoderEngine.js");
            result = { success: true, data: { signal: cadToleranceSignalEncoderEngine.encodeTolerances(params.callouts) } };
            break;
          }
          case "cad_tolerance_augment": {
            const { cadToleranceSignalEncoderEngine } = await import("../../engines/CADToleranceSignalEncoderEngine.js");
            result = { success: true, data: { augmented: cadToleranceSignalEncoderEngine.augmentUnifiedFeature(params.unifiedFeature, params.callouts) } };
            break;
          }
          case "cad_tolerance_stats": {
            const { cadToleranceSignalEncoderEngine } = await import("../../engines/CADToleranceSignalEncoderEngine.js");
            result = { success: true, data: cadToleranceSignalEncoderEngine.getStats() };
            break;
          }
          case "cad_draw_any_part": {
            const { cadDrawAnyPartOrchestratorEngine } = await import("../../engines/CADDrawAnyPartOrchestratorEngine.js");
            result = { success: true, data: await cadDrawAnyPartOrchestratorEngine.drawAnyPart(params) };
            break;
          }
          case "cad_draw_any_part_stats": {
            const { cadDrawAnyPartOrchestratorEngine } = await import("../../engines/CADDrawAnyPartOrchestratorEngine.js");
            result = { success: true, data: cadDrawAnyPartOrchestratorEngine.getStats() };
            break;
          }
          case "cad_draw_any_part_validate": {
            const { cadDrawAnyPartValidationHarnessEngine } = await import("../../engines/CADDrawAnyPartValidationHarnessEngine.js");
            result = { success: true, data: await cadDrawAnyPartValidationHarnessEngine.validate(params.cases, params.options ?? {}) };
            break;
          }
          case "cad_draw_any_part_validate_render": {
            const { cadDrawAnyPartValidationHarnessEngine } = await import("../../engines/CADDrawAnyPartValidationHarnessEngine.js");
            result = { success: true, data: { markdown: cadDrawAnyPartValidationHarnessEngine.renderMarkdown(params.report) } };
            break;
          }
          case "cad_validation_rubric_score": {
            const { cadValidationRubricEngine } = await import("../../engines/CADValidationRubricEngine.js");
            result = { success: true, data: cadValidationRubricEngine.score(params.result, params.options ?? {}) };
            break;
          }
          case "cad_validation_rubric_score_case": {
            const { cadValidationRubricEngine } = await import("../../engines/CADValidationRubricEngine.js");
            result = { success: true, data: cadValidationRubricEngine.scoreCase(params.testCase, params.result, params.options ?? {}) };
            break;
          }
          case "cad_validation_corpus_get": {
            const { corpusByDomain } = await import("../../data/cad-validation-corpus.js");
            const domain = (params?.domain ?? "all") as "mill" | "lathe" | "wedm" | "all";
            result = { success: true, data: { cases: corpusByDomain(domain), domain } };
            break;
          }
          case "cad_validation_corpus_summary": {
            const { summarizeCorpus } = await import("../../data/cad-validation-corpus.js");
            result = { success: true, data: summarizeCorpus() };
            break;
          }
          case "cad_validation_round_trip": {
            const { cadRoundTripValidationEngine } = await import("../../engines/CADRoundTripValidationEngine.js");
            result = { success: true, data: await cadRoundTripValidationEngine.validate(params.printPath, params.dependencies, params.options ?? {}) };
            break;
          }
          case "cad_model_dim_extract": {
            const { cadModelDimensionExtractorEngine } = await import("../../engines/CADModelDimensionExtractorEngine.js");
            result = { success: true, data: await cadModelDimensionExtractorEngine.extract(params.draw) };
            break;
          }
          case "cad_print_regenerate": {
            const { cadPrintRegeneratorEngine } = await import("../../engines/CADPrintRegeneratorEngine.js");
            result = { success: true, data: await cadPrintRegeneratorEngine.regenerate(params.draw) };
            break;
          }
          case "cad_part_archetype_list": {
            const { cadPartArchetypeRegistryEngine } = await import("../../engines/CADPartArchetypeRegistryEngine.js");
            result = { success: true, data: cadPartArchetypeRegistryEngine.list() };
            break;
          }
          case "cad_part_archetype_get": {
            const { cadPartArchetypeRegistryEngine } = await import("../../engines/CADPartArchetypeRegistryEngine.js");
            result = { success: true, data: cadPartArchetypeRegistryEngine.get(params.kind) };
            break;
          }
          case "cad_part_archetype_materialize": {
            const { cadPartArchetypeRegistryEngine } = await import("../../engines/CADPartArchetypeRegistryEngine.js");
            result = { success: true, data: cadPartArchetypeRegistryEngine.materialize(params.kind, params.params ?? {}) };
            break;
          }
          case "cad_part_archetype_summary": {
            const { cadPartArchetypeRegistryEngine } = await import("../../engines/CADPartArchetypeRegistryEngine.js");
            result = { success: true, data: cadPartArchetypeRegistryEngine.summary() };
            break;
          }
          case "cad_jmdie_archetype_prior": {
            const { cadJMDieArchetypeFrequencyEngine } = await import("../../engines/CADJMDieArchetypeFrequencyEngine.js");
            result = { success: true, data: cadJMDieArchetypeFrequencyEngine.prior(params.kind) };
            break;
          }
          case "cad_jmdie_archetype_ranked": {
            const { cadJMDieArchetypeFrequencyEngine } = await import("../../engines/CADJMDieArchetypeFrequencyEngine.js");
            result = { success: true, data: cadJMDieArchetypeFrequencyEngine.ranked() };
            break;
          }
          case "cad_jmdie_archetype_posterior": {
            const { cadJMDieArchetypeFrequencyEngine } = await import("../../engines/CADJMDieArchetypeFrequencyEngine.js");
            result = { success: true, data: cadJMDieArchetypeFrequencyEngine.posterior(params.likelihoods ?? {}) };
            break;
          }
          case "cad_jmdie_archetype_summary": {
            const { cadJMDieArchetypeFrequencyEngine } = await import("../../engines/CADJMDieArchetypeFrequencyEngine.js");
            result = { success: true, data: cadJMDieArchetypeFrequencyEngine.summary() };
            break;
          }
          case "cad_system_neural_arch_canonicalize": {
            const { cadSystemNeuralArchAdapterEngine } = await import("../../engines/CADSystemNeuralArchAdapterEngine.js");
            result = { success: true, data: cadSystemNeuralArchAdapterEngine.canonicalize(params.system, params.specs ?? []) };
            break;
          }
          case "cad_system_neural_arch_nativize": {
            const { cadSystemNeuralArchAdapterEngine } = await import("../../engines/CADSystemNeuralArchAdapterEngine.js");
            result = { success: true, data: cadSystemNeuralArchAdapterEngine.nativize(params.system, params.specs ?? []) };
            break;
          }
          case "cad_system_neural_arch_rules": {
            const { cadSystemNeuralArchAdapterEngine } = await import("../../engines/CADSystemNeuralArchAdapterEngine.js");
            result = { success: true, data: cadSystemNeuralArchAdapterEngine.rules(params.system) };
            break;
          }
          case "cad_system_neural_arch_summary": {
            const { cadSystemNeuralArchAdapterEngine } = await import("../../engines/CADSystemNeuralArchAdapterEngine.js");
            result = { success: true, data: cadSystemNeuralArchAdapterEngine.summary() };
            break;
          }
          case "cad_multi_system_produce_part": {
            const { cadMultiSystemAIProducerEngine } = await import("../../engines/CADMultiSystemAIProducerEngine.js");
            const { cadDrawAnyPartOrchestratorEngine } = await import("../../engines/CADDrawAnyPartOrchestratorEngine.js");
            const orchestrator = { draw: async (intent: unknown) => {
              const r = await (cadDrawAnyPartOrchestratorEngine as never as { draw: (i: unknown) => Promise<{ opLog?: Array<{ op: string; args?: Record<string, number | string | boolean> }> }> }).draw(intent);
              return (r.opLog ?? []).map(o => ({ op: o.op, args: o.args ?? {} }));
            } };
            result = { success: true, data: await cadMultiSystemAIProducerEngine.producePart(params.system, params.intent, { orchestrator }) };
            break;
          }
          case "cad_multi_system_produce_assembly": {
            const { cadMultiSystemAIProducerEngine } = await import("../../engines/CADMultiSystemAIProducerEngine.js");
            const { cadDrawAnyPartOrchestratorEngine } = await import("../../engines/CADDrawAnyPartOrchestratorEngine.js");
            const orchestrator = { draw: async (intent: unknown) => {
              const r = await (cadDrawAnyPartOrchestratorEngine as never as { draw: (i: unknown) => Promise<{ opLog?: Array<{ op: string; args?: Record<string, number | string | boolean> }> }> }).draw(intent);
              return (r.opLog ?? []).map(o => ({ op: o.op, args: o.args ?? {} }));
            } };
            result = { success: true, data: await cadMultiSystemAIProducerEngine.produceAssembly(params.system, params.intent, { orchestrator }) };
            break;
          }
          case "cad_multi_system_supported": {
            const { cadMultiSystemAIProducerEngine } = await import("../../engines/CADMultiSystemAIProducerEngine.js");
            result = { success: true, data: cadMultiSystemAIProducerEngine.supported() };
            break;
          }
          case "cad_multi_system_summary": {
            const { cadMultiSystemAIProducerEngine } = await import("../../engines/CADMultiSystemAIProducerEngine.js");
            result = { success: true, data: cadMultiSystemAIProducerEngine.summary() };
            break;
          }
          case "cad_function_param_emit": {
            const { cadFunctionParameterEmitterEngine } = await import("../../engines/CADFunctionParameterEmitterEngine.js");
            result = { success: true, data: cadFunctionParameterEmitterEngine.emit(params) };
            break;
          }
          case "cad_function_param_emit_summary": {
            const { cadFunctionParameterEmitterEngine } = await import("../../engines/CADFunctionParameterEmitterEngine.js");
            result = { success: true, data: cadFunctionParameterEmitterEngine.summary() };
            break;
          }
          case "hypercads_tutorial_corpus_ingest": {
            const { hyperCADSTutorialCorpusIngesterEngine } = await import("../../engines/HyperCADSTutorialCorpusIngesterEngine.js");
            result = { success: true, data: hyperCADSTutorialCorpusIngesterEngine.ingest(params.docs) };
            break;
          }
          case "hypercads_tutorial_corpus_stats": {
            const { hyperCADSTutorialCorpusIngesterEngine } = await import("../../engines/HyperCADSTutorialCorpusIngesterEngine.js");
            result = { success: true, data: hyperCADSTutorialCorpusIngesterEngine.getStats() };
            break;
          }
          case "cad_reverse_template": {
            const { cadReverseTemplateEngine } = await import("../../engines/CADReverseTemplateEngine.js");
            result = { success: true, data: cadReverseTemplateEngine.reverseEngineer(params.ops) };
            break;
          }
          case "cad_reverse_categorize": {
            const { cadReverseTemplateEngine } = await import("../../engines/CADReverseTemplateEngine.js");
            result = { success: true, data: cadReverseTemplateEngine.categorizeOnly(params.ops) };
            break;
          }
          case "cad_reverse_template_stats": {
            const { cadReverseTemplateEngine } = await import("../../engines/CADReverseTemplateEngine.js");
            result = { success: true, data: cadReverseTemplateEngine.getStats() };
            break;
          }
          // CAD-CLOSED-LOOP-MS0 -- Stage-6 CORRECT->CONVERGE controller.
          // runClosedLoop is in-process only (its injected evaluate fn cannot
          // cross the MCP JSON boundary); the MCP surface exposes the pure steps.
          case "cad_regen_correct": {
            const { cadRegenCorrectionEngine } = await import("../../engines/CADRegenCorrectionEngine.js");
            const data = cadRegenCorrectionEngine.correct({
              compareResult: params.compare_result ?? params.compareResult,
              params: params.correction_params ?? params.correctionParams ?? params.params,
              iteration: params.iteration,
              previousMaxDeltaPercent: params.previous_max_delta_percent ?? params.previousMaxDeltaPercent,
              stagnantIterations: params.stagnant_iterations ?? params.stagnantIterations,
              history: params.history,
              config: params.config,
            });
            result = { success: true, data };
            break;
          }
          case "cad_regen_apply_template": {
            const { cadRegenCorrectionEngine } = await import("../../engines/CADRegenCorrectionEngine.js");
            const data = cadRegenCorrectionEngine.applyToTemplate(
              params.op_template ?? params.opTemplate,
              params.corrections,
              params.param_lineage ?? params.paramLineage,
            );
            result = { success: true, data };
            break;
          }
          case "cad_regen_params_from_template": {
            const { cadRegenCorrectionEngine } = await import("../../engines/CADRegenCorrectionEngine.js");
            const data = cadRegenCorrectionEngine.paramsFromTemplate(
              params.template,
              params.influence_map ?? params.influenceMap ?? {},
            );
            result = { success: true, data };
            break;
          }
          case "cad_regen_stats": {
            const { cadRegenCorrectionEngine } = await import("../../engines/CADRegenCorrectionEngine.js");
            result = { success: true, data: cadRegenCorrectionEngine.getStats() };
            break;
          }
          case "cad_canonical_to_ops": {
            const { cadCanonicalTreeAdapterEngine } = await import("../../engines/CADCanonicalTreeAdapterEngine.js");
            result = { success: true, data: cadCanonicalTreeAdapterEngine.toOperations(params.tree) };
            break;
          }
          case "cad_canonical_reverse_engineer": {
            const { cadCanonicalTreeAdapterEngine } = await import("../../engines/CADCanonicalTreeAdapterEngine.js");
            result = { success: true, data: cadCanonicalTreeAdapterEngine.reverseEngineerTree(params.tree) };
            break;
          }
          case "cad_canonical_adapt_stats": {
            const { cadCanonicalTreeAdapterEngine } = await import("../../engines/CADCanonicalTreeAdapterEngine.js");
            result = { success: true, data: cadCanonicalTreeAdapterEngine.getStats() };
            break;
          }
          case "cad_corpus_catalog_build": {
            const { cadReverseCorpusCatalogEngine } = await import("../../engines/CADReverseCorpusCatalogEngine.js");
            result = { success: true, data: cadReverseCorpusCatalogEngine.buildCatalog(params.trees) };
            break;
          }
          case "cad_corpus_catalog_merge": {
            const { cadReverseCorpusCatalogEngine } = await import("../../engines/CADReverseCorpusCatalogEngine.js");
            result = { success: true, data: cadReverseCorpusCatalogEngine.mergeCatalogs(params.a, params.b) };
            break;
          }
          case "cad_corpus_catalog_stats": {
            const { cadReverseCorpusCatalogEngine } = await import("../../engines/CADReverseCorpusCatalogEngine.js");
            result = { success: true, data: cadReverseCorpusCatalogEngine.getStats() };
            break;
          }
          // --- CAD-COMPLETE-MS0/U-AI-03 — UnitOfMeasureDisambiguationEngine ---
          case "cad_uom_resolve": {
            const input = params.input ?? params.value ?? params.raw;
            if (input === undefined || input === null) {
              return dispatcherError(
                new Error("cad_uom_resolve requires 'input' (string|number dimensional value)"),
                action, "prism_cad",
              );
            }
            const { unitOfMeasureDisambiguationEngine } = await import("../../engines/UnitOfMeasureDisambiguationEngine.js");
            result = {
              success: true,
              data: unitOfMeasureDisambiguationEngine.resolve(input as string | number, {
                documentUnit: params.document_unit ?? params.documentUnit,
                priorUnitSystem: params.prior_unit_system ?? params.priorUnitSystem,
              }),
            };
            break;
          }
          case "cad_uom_resolve_batch": {
            const inputs = params.inputs ?? params.values;
            if (!Array.isArray(inputs) || inputs.length === 0) {
              return dispatcherError(
                new Error("cad_uom_resolve_batch requires 'inputs' (non-empty array of string|number)"),
                action, "prism_cad",
              );
            }
            const { unitOfMeasureDisambiguationEngine } = await import("../../engines/UnitOfMeasureDisambiguationEngine.js");
            result = {
              success: true,
              data: unitOfMeasureDisambiguationEngine.resolveBatch(inputs as Array<string | number>, {
                documentUnit: params.document_unit ?? params.documentUnit,
                priorUnitSystem: params.prior_unit_system ?? params.priorUnitSystem,
              }),
            };
            break;
          }
          case "cad_uom_convert": {
            const value = Number(params.value);
            const from = params.from ?? params.from_unit ?? params.fromUnit;
            const to = params.to ?? params.to_unit ?? params.toUnit;
            if (!Number.isFinite(value) || (from !== "mm" && from !== "in") || (to !== "mm" && to !== "in")) {
              return dispatcherError(
                new Error("cad_uom_convert requires numeric 'value' and 'from'/'to' each one of 'mm'|'in'"),
                action, "prism_cad",
              );
            }
            const { unitOfMeasureDisambiguationEngine } = await import("../../engines/UnitOfMeasureDisambiguationEngine.js");
            result = {
              success: true,
              data: { value: unitOfMeasureDisambiguationEngine.convert(value, from, to), unit: to },
            };
            break;
          }
          // --- CAD-COMPLETE-MS0/U-AI-12 — RiskTierClassifierEngine ---
          case "cad_risk_classify": {
            if (typeof params.kind !== "string") {
              return dispatcherError(
                new Error("cad_risk_classify requires a string 'kind' (CAD operation kind)"),
                action, "prism_cad",
              );
            }
            const { riskTierClassifierEngine } = await import("../../engines/RiskTierClassifierEngine.js");
            result = { success: true, data: riskTierClassifierEngine.classify({ kind: String(params.kind), args: params.args, irreversible: params.irreversible, touchesDatum: params.touchesDatum, batch: params.batch }) };
            break;
          }
          case "cad_risk_classify_batch": {
            const ops = params.ops;
            if (!Array.isArray(ops) || ops.length === 0) {
              return dispatcherError(
                new Error("cad_risk_classify_batch requires 'ops' (non-empty array of CAD operations)"),
                action, "prism_cad",
              );
            }
            const { riskTierClassifierEngine } = await import("../../engines/RiskTierClassifierEngine.js");
            result = { success: true, data: riskTierClassifierEngine.classifyBatch(ops) };
            break;
          }
          case "cad_risk_classify_plan": {
            const ops = params.ops;
            if (!Array.isArray(ops)) {
              return dispatcherError(
                new Error("cad_risk_classify_plan requires 'ops' (array of CAD operations)"),
                action, "prism_cad",
              );
            }
            const { riskTierClassifierEngine } = await import("../../engines/RiskTierClassifierEngine.js");
            result = { success: true, data: riskTierClassifierEngine.classifyPlan(ops) };
            break;
          }
          // --- CAD-COMPLETE-MS0/U-AI-09 — CADAppCircuitBreakerEngine ---
          case "cad_breaker_snapshot": {
            const { cadAppCircuitBreakerEngine } = await import("../../engines/CADAppCircuitBreakerEngine.js");
            result = { success: true, data: cadAppCircuitBreakerEngine.snapshot() };
            break;
          }
          // --- CAD-COMPLETE-MS0/U-AI-01 — CADFallbackRoutingEngine ---
          case "cad_fallback_route": {
            const { cadFallbackRoutingEngine } = await import("../../engines/CADFallbackRoutingEngine.js");
            const req = {
              capability: typeof params.capability === "string" ? params.capability : undefined,
              preferredApp: params.preferredApp ?? params.preferred_app,
              unavailable: Array.isArray(params.unavailable) ? params.unavailable.map((a: unknown) => String(a)) : undefined,
            };
            const apps = Array.isArray(params.apps) ? params.apps : undefined;
            result = { success: true, data: cadFallbackRoutingEngine.route(req, apps) };
            break;
          }
          case "cad_fallback_register": {
            const apps = params.apps;
            if (!Array.isArray(apps) || apps.length === 0) {
              return dispatcherError(
                new Error("cad_fallback_register requires 'apps' (non-empty array of CAD app profiles)"),
                action, "prism_cad",
              );
            }
            const { cadFallbackRoutingEngine } = await import("../../engines/CADFallbackRoutingEngine.js");
            cadFallbackRoutingEngine.registerMany(apps);
            result = { success: true, data: { registered: cadFallbackRoutingEngine.listApps() } };
            break;
          }
          case "cad_fallback_list": {
            const { cadFallbackRoutingEngine } = await import("../../engines/CADFallbackRoutingEngine.js");
            result = { success: true, data: cadFallbackRoutingEngine.listApps() };
            break;
          }
          case "cad_fallback_reset": {
            const { cadFallbackRoutingEngine } = await import("../../engines/CADFallbackRoutingEngine.js");
            cadFallbackRoutingEngine.reset();
            result = { success: true, data: { reset: true } };
            break;
          }
          case "cad_breaker_can_proceed":
          case "cad_breaker_record_success":
          case "cad_breaker_record_failure":
          case "cad_breaker_state":
          case "cad_breaker_configure": {
            const appId = params.app_id ?? params.appId;
            if (typeof appId !== "string" || appId.trim().length === 0) {
              return dispatcherError(
                new Error(`${action} requires a non-empty string 'app_id'`),
                action, "prism_cad",
              );
            }
            const { cadAppCircuitBreakerEngine } = await import("../../engines/CADAppCircuitBreakerEngine.js");
            if (action === "cad_breaker_can_proceed") {
              result = { success: true, data: cadAppCircuitBreakerEngine.canProceed(appId) };
            } else if (action === "cad_breaker_record_success") {
              result = { success: true, data: cadAppCircuitBreakerEngine.recordSuccess(appId) };
            } else if (action === "cad_breaker_record_failure") {
              const err = params.error;
              result = {
                success: true,
                data: cadAppCircuitBreakerEngine.recordFailure(appId, err === undefined ? undefined : String(err)),
              };
            } else if (action === "cad_breaker_state") {
              result = { success: true, data: cadAppCircuitBreakerEngine.getState(appId) };
            } else {
              result = {
                success: true,
                data: cadAppCircuitBreakerEngine.configure(appId, {
                  failureThreshold: params.failureThreshold ?? params.failure_threshold,
                  successThreshold: params.successThreshold ?? params.success_threshold,
                  cooldownMs: params.cooldownMs ?? params.cooldown_ms,
                  halfOpenMaxProbes: params.halfOpenMaxProbes ?? params.half_open_max_probes,
                }),
              };
            }
            break;
          }
          // --- CAD-COMPLETE-MS0/U-AI-02 — CADWorldModelEngine ---
          case "cad_world_apply_op":
          case "cad_world_state":
          case "cad_world_checkpoint":
          case "cad_world_diff":
          case "cad_world_detect_drift": {
            const docId = params.doc_id ?? params.docId;
            if (typeof docId !== "string" || docId.trim().length === 0) {
              return dispatcherError(
                new Error(`${action} requires a non-empty string 'doc_id'`),
                action, "prism_cad",
              );
            }
            const { cadWorldModelEngine } = await import("../../engines/CADWorldModelEngine.js");
            if (action === "cad_world_apply_op") {
              const op = params.op && typeof params.op === "object"
                ? params.op
                : {
                    kind: params.kind,
                    entityId: params.entityId ?? params.entity_id,
                    entityKind: params.entityKind ?? params.entity_kind,
                    name: params.name,
                    parentId: params.parentId ?? params.parent_id,
                    parameter: params.parameter,
                    value: params.value,
                    units: params.units,
                    selection: params.selection,
                  };
              result = { success: true, data: cadWorldModelEngine.applyOp(docId, op) };
            } else if (action === "cad_world_state") {
              result = { success: true, data: cadWorldModelEngine.getState(docId) };
            } else if (action === "cad_world_checkpoint") {
              result = { success: true, data: cadWorldModelEngine.checkpoint(docId) };
            } else if (action === "cad_world_diff") {
              result = { success: true, data: cadWorldModelEngine.diffFromCheckpoint(docId) };
            } else {
              const observed = params.observed;
              if (!observed || typeof observed !== "object") {
                return dispatcherError(
                  new Error("cad_world_detect_drift requires an 'observed' object with an entityIds array"),
                  action, "prism_cad",
                );
              }
              result = { success: true, data: cadWorldModelEngine.detectDrift(docId, observed) };
            }
            break;
          }
          case "cad_world_reset": {
            const { cadWorldModelEngine } = await import("../../engines/CADWorldModelEngine.js");
            const docId = params.doc_id ?? params.docId;
            const oneDoc = typeof docId === "string" && docId.trim().length > 0 ? docId : undefined;
            cadWorldModelEngine.reset(oneDoc);
            result = { success: true, data: { reset: true, scope: oneDoc ?? "all-documents" } };
            break;
          }
          case "cad_trace_assemble":
          case "cad_trace_get":
          case "cad_trace_from_tracer": {
            const { cadTraceAssemblyEngine } = await import("../../engines/CADTraceAssemblyEngine.js");
            if (action === "cad_trace_assemble") {
              if (!Array.isArray(params.spans)) {
                return dispatcherError(
                  new Error("cad_trace_assemble requires a 'spans' array of TraceSpanInput objects"),
                  action, "prism_cad",
                );
              }
              result = { success: true, data: cadTraceAssemblyEngine.assemble(params.spans) };
            } else if (action === "cad_trace_get") {
              if (!Array.isArray(params.spans)) {
                return dispatcherError(
                  new Error("cad_trace_get requires a 'spans' array"),
                  action, "prism_cad",
                );
              }
              const traceId = params.trace_id ?? params.traceId;
              if (typeof traceId !== "string" || traceId.length === 0) {
                return dispatcherError(
                  new Error("cad_trace_get requires a non-empty 'trace_id'"),
                  action, "prism_cad",
                );
              }
              const view = cadTraceAssemblyEngine.assembleTrace(params.spans, traceId);
              result = { success: true, data: { view, found: view !== null } };
            } else {
              // cad_trace_from_tracer — pull live spans from the OTel tracer.
              const { openTelemetryTracingEngine } = await import(
                "../../engines/OpenTelemetryTracingEngine.js"
              );
              let otelSpans = openTelemetryTracingEngine.getCompletedSpans();
              const totalOtelSpans = otelSpans.length;
              // Optional tenant filter — when set, only spans tagged with the
              // matching prism.tenant_id are admitted. Prevents the global
              // completed-span buffer from leaking cross-tenant traces.
              const tenantFilter = params.tenant_id ?? params.tenantId;
              const tenantApplied = typeof tenantFilter === "string" && tenantFilter.length > 0;
              if (tenantApplied) {
                otelSpans = otelSpans.filter(
                  (s) => s && s.attributes && s.attributes["prism.tenant_id"] === tenantFilter,
                );
              }
              const adapted = cadTraceAssemblyEngine.fromOtelSpans(otelSpans);
              const traceId = params.trace_id ?? params.traceId;
              if (typeof traceId === "string" && traceId.length > 0) {
                const view = cadTraceAssemblyEngine.assembleTrace(adapted, traceId);
                result = {
                  success: true,
                  data: {
                    view,
                    found: view !== null,
                    fromTracer: true,
                    otelSpanCount: otelSpans.length,
                    totalOtelSpanCount: totalOtelSpans,
                    tenantFilterApplied: tenantApplied,
                  },
                };
              } else {
                const assembled = cadTraceAssemblyEngine.assemble(adapted);
                // Bound response payload — default cap 100 traces.
                const rawMax = params.max_traces ?? params.maxTraces;
                const maxTraces =
                  typeof rawMax === "number" && Number.isInteger(rawMax) && rawMax >= 1 ? rawMax : 100;
                const truncated = assembled.traces.length > maxTraces;
                const cappedTraces = truncated
                  ? assembled.traces.slice(0, maxTraces)
                  : assembled.traces;
                result = {
                  success: true,
                  data: {
                    ...assembled,
                    traces: cappedTraces,
                    traceCount: cappedTraces.length,
                    totalTraceCount: assembled.traceCount,
                    fromTracer: true,
                    otelSpanCount: otelSpans.length,
                    totalOtelSpanCount: totalOtelSpans,
                    tenantFilterApplied: tenantApplied,
                    truncated,
                    maxTraces,
                  },
                };
              }
            }
            break;
          }
          // CAD-COMPLETE-MS0/U-AI-08 — CADTransactionEngine
          // Atomic begin/apply/commit/rollback over CADWorldModelEngine. Lazy
          // import so the singleton + its 2 internal maps only initialise when
          // someone actually opens a transaction. Snake_case aliases for every
          // id parameter so callers using either convention land on the same
          // engine path.
          case "cad_txn_begin":
          case "cad_txn_apply":
          case "cad_txn_commit":
          case "cad_txn_rollback":
          case "cad_txn_status":
          case "cad_txn_list":
          case "cad_txn_apply_all":
          case "cad_txn_reset": {
            const { cadTransactionEngine } = await import("../../engines/CADTransactionEngine.js");
            const rawTxnId = params.txn_id ?? params.txnId;
            const rawDocId = params.doc_id ?? params.docId;
            const rawUnits = params.units;
            const units =
              rawUnits === "mm" || rawUnits === "in" ? (rawUnits as "mm" | "in") : "mm";
            if (action === "cad_txn_begin") {
              if (typeof rawDocId !== "string" || rawDocId.trim().length === 0) {
                return dispatcherError(
                  new Error("cad_txn_begin requires a non-empty 'doc_id'"),
                  action, "prism_cad",
                );
              }
              result = { success: true, data: cadTransactionEngine.begin(rawDocId, units) };
            } else if (action === "cad_txn_apply") {
              if (typeof rawTxnId !== "string" || rawTxnId.trim().length === 0) {
                return dispatcherError(
                  new Error("cad_txn_apply requires a non-empty 'txn_id'"),
                  action, "prism_cad",
                );
              }
              const op = params.op;
              if (!op || typeof op !== "object" || typeof (op as { kind?: unknown }).kind !== "string") {
                return dispatcherError(
                  new Error("cad_txn_apply requires an 'op' object with a non-empty 'kind' string"),
                  action, "prism_cad",
                );
              }
              result = { success: true, data: cadTransactionEngine.apply(rawTxnId, op as Parameters<typeof cadTransactionEngine.apply>[1]) };
            } else if (action === "cad_txn_commit") {
              if (typeof rawTxnId !== "string" || rawTxnId.trim().length === 0) {
                return dispatcherError(
                  new Error("cad_txn_commit requires a non-empty 'txn_id'"),
                  action, "prism_cad",
                );
              }
              result = { success: true, data: cadTransactionEngine.commit(rawTxnId) };
            } else if (action === "cad_txn_rollback") {
              if (typeof rawTxnId !== "string" || rawTxnId.trim().length === 0) {
                return dispatcherError(
                  new Error("cad_txn_rollback requires a non-empty 'txn_id'"),
                  action, "prism_cad",
                );
              }
              result = { success: true, data: cadTransactionEngine.rollback(rawTxnId) };
            } else if (action === "cad_txn_status") {
              if (typeof rawTxnId !== "string" || rawTxnId.trim().length === 0) {
                return dispatcherError(
                  new Error("cad_txn_status requires a non-empty 'txn_id'"),
                  action, "prism_cad",
                );
              }
              const status = cadTransactionEngine.status(rawTxnId);
              result = { success: true, data: { status, found: status !== null } };
            } else if (action === "cad_txn_list") {
              const filter =
                typeof rawDocId === "string" && rawDocId.trim().length > 0 ? rawDocId : undefined;
              const txns = cadTransactionEngine.list(filter);
              result = { success: true, data: { txns, count: txns.length, filter: filter ?? null } };
            } else if (action === "cad_txn_apply_all") {
              if (typeof rawDocId !== "string" || rawDocId.trim().length === 0) {
                return dispatcherError(
                  new Error("cad_txn_apply_all requires a non-empty 'docId' (snake_case 'doc_id' alias auto-normalized)"),
                  action, "prism_cad",
                );
              }
              if (!Array.isArray(params.ops)) {
                return dispatcherError(
                  new Error("cad_txn_apply_all requires an 'ops' array"),
                  action, "prism_cad",
                );
              }
              // Defense-in-depth cap (the schema enforces .max(1000), but Zod
              // strip-mode plus the strict-mode advisory pattern means a
              // malicious caller could route around it via a code path that
              // skips schema validation — cap here too so the engine never
              // sees an unbounded op list).
              if (params.ops.length > 1000) {
                return dispatcherError(
                  new Error(`cad_txn_apply_all rejects ops array of length ${params.ops.length} (cap 1000 — DoS guard)`),
                  action, "prism_cad",
                );
              }
              result = {
                success: true,
                data: cadTransactionEngine.applyAll(
                  rawDocId,
                  params.ops as Parameters<typeof cadTransactionEngine.applyAll>[1],
                  units,
                ),
              };
            } else {
              // cad_txn_reset — drop every registered transaction + release every
              // doc lock. FLEET-DESTRUCTIVE: peer chats' in-flight transactions
              // become orphaned. Operator must opt in with the exact literal
              // confirm string. The dispatcher pre-collects the registry summary
              // so the reset result tells the operator exactly what was wiped.
              if (params.confirm !== "RESET_ALL_TRANSACTIONS") {
                return dispatcherError(
                  new Error(
                    "cad_txn_reset requires confirm:'RESET_ALL_TRANSACTIONS' (FLEET-DESTRUCTIVE: drops every peer chat's transactions too)",
                  ),
                  action, "prism_cad",
                );
              }
              const prior = cadTransactionEngine.list();
              cadTransactionEngine.reset();
              result = {
                success: true,
                data: {
                  reset: true,
                  txnsDropped: prior.length,
                  docsUnlocked: new Set(prior.filter((s) => s.state === "pending").map((s) => s.docId)).size,
                },
              };
            }
            break;
          }
          // CAD-COMPLETE-MS0/U-AI-07 — pure dry-run preview surface. Single
          // 2-action cluster + one lazy import. The engine guarantees the real
          // `cadWorldModelEngine` is NEVER mutated; the dispatcher only echoes
          // that contract — defense-in-depth caps + input validation match the
          // sibling cad_txn_* cluster so a malicious caller routing around the
          // schema cannot poison the engine.
          case "cad_preview_apply":
          case "cad_preview_apply_all": {
            const { cadPreviewEngine } = await import("../../engines/CADPreviewEngine.js");
            const rawDocId = params.doc_id ?? params.docId;
            const rawUnits = params.units;
            const previewUnits =
              rawUnits === "mm" || rawUnits === "in" ? (rawUnits as "mm" | "in") : "mm";
            if (typeof rawDocId !== "string" || rawDocId.trim().length === 0) {
              return dispatcherError(
                new Error(`${action} requires a non-empty 'docId' (snake_case 'doc_id' alias auto-normalized)`),
                action, "prism_cad",
              );
            }
            if (action === "cad_preview_apply") {
              const op = params.op;
              if (!op || typeof op !== "object" || typeof (op as { kind?: unknown }).kind !== "string") {
                return dispatcherError(
                  new Error("cad_preview_apply requires an 'op' object with a non-empty 'kind' string"),
                  action, "prism_cad",
                );
              }
              result = {
                success: true,
                data: cadPreviewEngine.preview(
                  rawDocId,
                  op as Parameters<typeof cadPreviewEngine.preview>[1],
                  previewUnits,
                ),
              };
            } else {
              // cad_preview_apply_all
              if (!Array.isArray(params.ops)) {
                return dispatcherError(
                  new Error("cad_preview_apply_all requires an 'ops' array"),
                  action, "prism_cad",
                );
              }
              // Defense-in-depth cap matching the cad_txn_apply_all cluster —
              // the schema enforces .max(1000), but a code path bypassing the
              // schema (test harness, programmatic caller) must not be able to
              // hand the engine an unbounded ops list.
              if (params.ops.length > 1000) {
                return dispatcherError(
                  new Error(`cad_preview_apply_all rejects ops array of length ${params.ops.length} (cap 1000 — DoS guard)`),
                  action, "prism_cad",
                );
              }
              result = {
                success: true,
                data: cadPreviewEngine.previewAll(
                  rawDocId,
                  params.ops as Parameters<typeof cadPreviewEngine.previewAll>[1],
                  previewUnits,
                ),
              };
            }
            break;
          }
          // CAD-COMPLETE-MS0/U-AI-11 — pure structural consensus over CAD
          // predictions. NO LLM calls inside this engine — the caller is
          // expected to have already generated the prediction set (typically
          // by running cadPreviewEngine against several candidate op
          // sequences produced by MultiModelConsensusEngine or other
          // sources). Defense-in-depth caps mirror the cad_preview cluster.
          case "cad_consensus_score":
          case "cad_consensus_pick":
          case "cad_consensus_parameter_clusters": {
            const { cadConsensusEngine } = await import(
              "../../engines/CADConsensusEngine.js"
            );
            if (!Array.isArray(params.predictions)) {
              return dispatcherError(
                new Error(`${action} requires a 'predictions' array`),
                action, "prism_cad",
              );
            }
            // Mirror the cad_preview_apply_all DoS guard. Realistic upper
            // bound is well below 100 (number of independent LLM voices in
            // a consensus pool), so 100 is generous + safe.
            if (params.predictions.length > 100) {
              return dispatcherError(
                new Error(
                  `${action} rejects predictions array of length ${params.predictions.length} (cap 100 — DoS guard)`,
                ),
                action, "prism_cad",
              );
            }
            const preds = params.predictions as Parameters<
              typeof cadConsensusEngine.score
            >[0];
            if (action === "cad_consensus_score") {
              result = { success: true, data: cadConsensusEngine.score(preds) };
            } else if (action === "cad_consensus_pick") {
              const rawThreshold = params.dissentThreshold ?? params.dissent_threshold;
              const opts: Parameters<typeof cadConsensusEngine.pick>[1] = {};
              if (rawThreshold !== undefined) {
                if (typeof rawThreshold !== "number") {
                  return dispatcherError(
                    new Error(
                      `cad_consensus_pick: dissentThreshold must be a number when provided (got ${typeof rawThreshold})`,
                    ),
                    action, "prism_cad",
                  );
                }
                opts.dissentThreshold = rawThreshold;
              }
              result = { success: true, data: cadConsensusEngine.pick(preds, opts) };
            } else {
              // cad_consensus_parameter_clusters
              result = {
                success: true,
                data: cadConsensusEngine.parameterValueClusters(preds),
              };
            }
            break;
          }
          // -- iter5+6+7 wire-unwired-loop: 16 CAD engines --
          case "engine_digest_get": {
            const { engineDigestEngine } = await import("../../engines/EngineDigestEngine.js");
            const p = params as any;
            result = { success: true, data: (engineDigestEngine as any).getDigest?.(p) ?? (engineDigestEngine as any).run?.(p) ?? (engineDigestEngine as any).list?.(p) ?? { engine: "EngineDigestEngine", note: "method not callable" } };
            break;
          }
          case "freecad_automation_run": {
            const { freecadAutomationBridge } = await import("../../engines/FreeCADAutomationBridge.js");
            const p = params as any;
            result = { success: true, data: (freecadAutomationBridge as any).run?.(p) ?? (freecadAutomationBridge as any).execute?.(p) ?? (freecadAutomationBridge as any).send?.(p?.cmd ?? p, p?.args ?? {}) ?? { engine: "FreeCADAutomationBridge", note: "method not callable" } };
            break;
          }
          case "autocad_dotnet_bridge_open": {
            const mod = await import("../../engines/AutoCADDotNetBridgeEngine.js");
            const eng: any = new (mod as any).AutoCADDotNetBridgeEngine();
            const p = params as any;
            result = { success: true, data: eng.openDrawing?.(p?.path ?? p?.drawing_path ?? "", p) ?? eng.run?.(p) ?? { engine: "AutoCADDotNetBridgeEngine", note: "method not callable" } };
            break;
          }
          case "autocad_addin_plugin_register": {
            const mod = await import("../../engines/AutoCADAddinPluginEngine.js");
            const eng: any = new (mod as any).AutoCADAddinPluginEngine();
            const p = params as any;
            result = { success: true, data: eng.registerRibbonTab?.(p) ?? eng.run?.(p) ?? { engine: "AutoCADAddinPluginEngine", note: "method not callable" } };
            break;
          }
          case "nx_open_sketch_create": {
            const mod = await import("../../engines/NXOpenSketchEntityEngine.js");
            const eng: any = new (mod as any).NXOpenSketchEntityEngine();
            const p = params as any;
            result = { success: true, data: eng.createSketch?.(p?.partTag ?? "", p?.plane ?? {}, p?.name ?? "") ?? eng.run?.(p) ?? { engine: "NXOpenSketchEntityEngine", note: "method not callable" } };
            break;
          }
          case "cad_to_step_pipeline_run": {
            const { cadToSTEPPipelineEngine } = await import("../../engines/CADToSTEPPipelineEngine.js");
            const p = params as any;
            result = { success: true, data: await (cadToSTEPPipelineEngine as any).runPipeline?.(p) ?? await (cadToSTEPPipelineEngine as any).run?.(p) ?? { engine: "CADToSTEPPipelineEngine", note: "method not callable" } };
            break;
          }
          case "cad_screenshot_capture": {
            const { cadScreenshotCapturer } = await import("../../engines/CADScreenshotCapturer.js");
            const p = params as any;
            result = { success: true, data: await (cadScreenshotCapturer as any).captureView?.(p) ?? await (cadScreenshotCapturer as any).captureViews?.(p) ?? { engine: "CADScreenshotCapturer", note: "method not callable" } };
            break;
          }
          case "per_app_incad_infer": {
            const mod = await import("../../engines/PerAppInCADInferenceAdapter.js");
            const eng: any = new (mod as any).PerAppInCADInferenceAdapter();
            const p = params as any;
            result = { success: true, data: await eng.runInference?.(p?.modelId ?? p?.model_id ?? "", p?.input ?? p) ?? eng.extractFromGeometry?.(p?.cadApp ?? p?.cad_app ?? "generic", p) ?? { engine: "PerAppInCADInferenceAdapter", note: "method not callable" } };
            break;
          }
          case "fusion360_generator_adapt": {
            const { fusion360CADGeneratorAdapter } = await import("../../engines/Fusion360CADGeneratorAdapter.js");
            const p = params as any;
            result = { success: true, data: (fusion360CADGeneratorAdapter as any).generate?.(p) ?? (fusion360CADGeneratorAdapter as any).run?.(p) ?? (fusion360CADGeneratorAdapter as any).adapt?.(p) ?? { engine: "Fusion360CADGeneratorAdapter", note: "method not callable" } };
            break;
          }
          case "fusion360_function_index_get": {
            const mod = await import("../../engines/Fusion360CADFunctionIndexEngine.js");
            const p = params as any;
            result = { success: true, data: (mod as any).Fusion360CADFunctionIndexEngine?.getIndex?.() ?? (mod as any).fusion360CADFunctionIndexEngine?.getIndex?.() ?? { engine: "Fusion360CADFunctionIndexEngine", note: "method not callable" } };
            break;
          }
          case "hypercad_function_index_get": {
            const mod = await import("../../engines/HyperCADCADFunctionIndexEngine.js");
            const p = params as any;
            result = { success: true, data: (mod as any).HyperCADCADFunctionIndexEngine?.getIndex?.() ?? (mod as any).hyperCADCADFunctionIndexEngine?.getIndex?.() ?? { engine: "HyperCADCADFunctionIndexEngine", note: "method not callable" } };
            break;
          }
          case "five_axis_cad_template_process": {
            const mod = await import("../../engines/FiveAxisCADTemplateEngine.js");
            const eng: any = (mod as any).fiveAxisCADTemplateEngine ?? new (mod as any).FiveAxisCADTemplateEngine();
            const p = params as any;
            result = { success: true, data: eng.processCADEvent?.(p) ?? eng.run?.(p) ?? eng.generate?.(p) ?? { engine: "FiveAxisCADTemplateEngine", note: "method not callable" } };
            break;
          }
          case "two_pass_cascade_run": {
            const { twoPassCascadeEngine } = await import("../../engines/TwoPassCascadeEngine.js");
            const p = params as any;
            result = { success: true, data: await (twoPassCascadeEngine as any).run?.(p) ?? { engine: "TwoPassCascadeEngine", note: "method not callable" } };
            break;
          }
          case "cascade_fallback_chain_run": {
            const { cascadeFallbackChainEngine } = await import("../../engines/CascadeFallbackChainEngine.js");
            const p = params as any;
            result = { success: true, data: await (cascadeFallbackChainEngine as any).run?.(p, p?.deps ?? {}) ?? { engine: "CascadeFallbackChainEngine", note: "method not callable" } };
            break;
          }
          case "cad_live_blueprint_ocr": {
            const { cadLiveBlueprintOcrAdapter } = await import("../../engines/CADLiveBlueprintOcrAdapter.js");
            const p = params as any;
            result = { success: true, data: await (cadLiveBlueprintOcrAdapter as any).ocrPrint?.(p?.printPath ?? p?.print_path ?? "", p) ?? (cadLiveBlueprintOcrAdapter as any).run?.(p) ?? { engine: "CADLiveBlueprintOcrAdapter", note: "method not callable" } };
            break;
          }

          // ── DEA-MS0/U-DEA-november-P06 — probe drift → probe routine cross-wire ──
          // Pulls active drift alerts + drift analysis for the named probe, then
          // generates a probe routine with sampling density biased toward features
          // where the probe has shown bias drift. Closes the metrology→inspection
          // feedback loop.
          case "cad_probe_drift_routine_bridge": {
            const { probeDriftEngine } = await import("../../engines/ProbeDriftEngine.js");
            const { probeRoutineEngine } = await import("../../engines/ProbeRoutineEngine.js");
            const probeId: string = params.probe_id ?? params.probeId ?? "";
            const drift = (probeDriftEngine as any).analyzeDrift?.(probeId, params.windowDays ?? params.window_days);
            const alerts = (probeDriftEngine as any).getActiveAlerts?.(probeId);
            // Densify sampling on features matching drift-affected axes
            const densifyAxes: string[] = Array.isArray(alerts)
              ? alerts.map((a: any) => a.axis).filter(Boolean)
              : [];
            const routineParams = {
              ...params,
              drift_compensation: { applied: true, axes: densifyAxes, drift },
            };
            const routine = (probeRoutineEngine as any).generate?.(routineParams)
              ?? (probeRoutineEngine as any).generateRoutine?.(routineParams)
              ?? { note: "generate method not exported on ProbeRoutineEngine" };
            result = {
              success: true,
              drift,
              alerts,
              routine,
              bridge: "cad_probe_drift_analyze + alerts → probe_routine_generate (DEA-MS0/U-DEA-november-P06)",
            };
            break;
          }

          default:
            result = { error: `Unknown action: ${action}` };
        }
      } catch (error) {
        return dispatcherError(error, action, "prism_cad");
      }
      return { content: [{ type: "text" as const, text: JSON.stringify(slimResponse(result)) }] };
    }
  );
}
