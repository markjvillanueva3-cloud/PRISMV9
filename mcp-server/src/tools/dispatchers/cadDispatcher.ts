/**
 * prism_cad — CAD/Geometry Dispatcher
 *
 * 13 actions: geometry_create, geometry_transform, geometry_analyze,
 *   mesh_generate, mesh_import, mesh_export, feature_recognize,
 *   feature_edit, stock_model, wcs_setup, dfm_check, face_mill_select,
 *   deep_hole_technique
 *
 * Engine dependencies: CADKernelEngine, GeometryEngine, MeshEngine,
 *   FeatureRecognitionEngine, StockModelEngine, WorkCoordinateEngine,
 *   DfMRulesEngine
 */
import { z } from "zod";
import { log } from "../../utils/Logger.js";
import { slimResponse } from "../../utils/responseSlimmer.js";
import { dispatcherError } from "../../utils/dispatcherMiddleware.js";

let _cad: any, _geometry: any, _mesh: any, _feature: any, _stock: any, _wcs: any, _dfm: any, _sketch: any, _partLib: any, _assembly: any;
async function getEngine(name: string): Promise<any> {
  switch (name) {
    case "cad": return _cad ??= (await import("../../engines/CADKernelEngine.js")).cadKernelEngine;
    case "geometry": return _geometry ??= (await import("../../engines/GeometryEngine.js")).geometryEngine;
    case "mesh": return _mesh ??= (await import("../../engines/MeshEngine.js")).meshEngine;
    case "feature": return _feature ??= (await import("../../engines/FeatureRecognitionEngine.js")).featureRecognitionEngine;
    case "stock": return _stock ??= (await import("../../engines/StockModelEngine.js")).stockModelEngine;
    case "wcs": return _wcs ??= (await import("../../engines/WorkCoordinateEngine.js")).workCoordinateEngine;
    case "dfm": return _dfm ??= await import("../../engines/DfMRulesEngine.js");
    case "sketch": return _sketch ??= (await import("../../engines/SketchEngine.js")).sketchEngine;
    case "partLib": return _partLib ??= (await import("../../engines/ParametricPartLibraryEngine.js")).parametricPartLibraryEngine;
    case "assembly": return _assembly ??= (await import("../../engines/AssemblyEngine.js")).assemblyEngine;
    default: throw new Error(`Unknown CAD engine: ${name}`);
  }
}

const ACTIONS = [
  "geometry_create", "geometry_transform", "geometry_analyze",
  "mesh_generate", "mesh_import", "mesh_export",
  "feature_recognize", "feature_edit",
  "stock_model", "wcs_setup",
  "dfm_check", "face_mill_select", "deep_hole_technique",
  "sketch_create", "sketch_add_entity", "sketch_analyze",
  "sketch_to_svg", "sketch_to_cadquery",
  "part_create", "part_add_feature", "part_estimate_volume",
  "part_template_box", "part_template_cylinder", "part_template_flange",
  "part_template_bracket",
  "part_library_create", "part_library_list_types",
  "assembly_create", "assembly_add_component", "assembly_add_mate",
  "assembly_position", "assembly_bom", "assembly_to_cadquery",
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
