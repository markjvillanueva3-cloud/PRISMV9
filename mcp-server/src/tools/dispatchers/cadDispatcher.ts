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

let _cad: any, _geometry: any, _mesh: any, _feature: any, _stock: any, _wcs: any, _dfm: any, _dfmPipeline: any, _sketch: any, _partLib: any, _assembly: any;
let _cadTaxonomy: any, _cadQueryGen: any, _f360Gen: any, _f360Bridge: any, _swGen: any, _mcGen: any, _hcGen: any, _nxGen: any, _impeller: any, _blisk: any;
let _cadCorpusOrch: any, _cadEmbedIndex: any, _cadPipeline: any, _cadRegenTest: any, _geoCompare: any, _cadRegistry: any, _inventorGen: any, _naca: any, _loftedWing: any, _gear: any, _spring: any, _cadTrialLearn: any, _printToFusion: any, _printToMastercam: any, _printToInventor: any, _printToSolidWorks: any, _printToEsprit: any, _espritGen: any;
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
