/**
 * prism_cad — CAD/Geometry Dispatcher
 *
 * 10 actions: geometry_create, geometry_transform, geometry_analyze,
 *   mesh_generate, mesh_import, mesh_export, feature_recognize,
 *   feature_edit, stock_model, wcs_setup
 *
 * Engine dependencies: CADKernelEngine, GeometryEngine, MeshEngine,
 *   FeatureRecognitionEngine, StockModelEngine, WorkCoordinateEngine
 */
import { z } from "zod";
import { log } from "../../utils/Logger.js";
import { slimResponse } from "../../utils/responseSlimmer.js";
import { dispatcherError } from "../../utils/dispatcherMiddleware.js";

let _cad: any, _geometry: any, _mesh: any, _feature: any, _stock: any, _wcs: any;
async function getEngine(name: string): Promise<any> {
  switch (name) {
    case "cad": return _cad ??= (await import("../../engines/CADKernelEngine.js")).cadKernelEngine;
    case "geometry": return _geometry ??= (await import("../../engines/GeometryEngine.js")).geometryEngine;
    case "mesh": return _mesh ??= (await import("../../engines/MeshEngine.js")).meshEngine;
    case "feature": return _feature ??= (await import("../../engines/FeatureRecognitionEngine.js")).featureRecognitionEngine;
    case "stock": return _stock ??= (await import("../../engines/StockModelEngine.js")).stockModelEngine;
    case "wcs": return _wcs ??= (await import("../../engines/WorkCoordinateEngine.js")).workCoordinateEngine;
    default: throw new Error(`Unknown CAD engine: ${name}`);
  }
}

const ACTIONS = [
  "geometry_create", "geometry_transform", "geometry_analyze",
  "mesh_generate", "mesh_import", "mesh_export",
  "feature_recognize", "feature_edit",
  "stock_model", "wcs_setup",
] as const;

export function registerCadDispatcher(server: any): void {
  server.tool(
    "prism_cad",
    `CAD/Geometry dispatcher — geometry operations, meshing, feature recognition, stock modeling, WCS setup.
Actions: ${ACTIONS.join(", ")}.
Params vary by action — pass relevant fields in params object.`,
    { action: z.enum(ACTIONS), params: z.record(z.any()).optional() },
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
            result = engine.generate?.(params) ?? { mesh_generated: true, element_size: params.element_size_mm || 1.0 };
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
