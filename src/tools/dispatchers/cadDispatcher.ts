/**
 * prism_cad — CAD/Geometry Dispatcher
 *
 * 61 actions: geometry (3), mesh (3), feature (2), stock/wcs/dfm (5),
 *   sketch (5), part (7), part_library (2), assembly (6),
 *   cad_taxonomy (3), cadquery (5), f360_codegen (4), f360_live (14), blueprint (2)
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
let _cadTaxonomy: any, _cadQueryGen: any, _f360Gen: any, _f360Bridge: any;
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
    default: throw new Error(`Unknown CAD engine: ${name}`);
  }
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
              ? tx.getOperationsByCategory(params.category)
              : tx.getAllOperations();
            break;
          }
          case "cad_taxonomy_generate": {
            const tx = await getEngine("cadTaxonomy");
            result = { code: tx.generateCadQueryCode(params.action ?? params) };
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
