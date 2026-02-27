/**
 * L2 Engine Dispatcher — Wires 8 monolith-ported engines to MCP surface
 * Actions: aiml_predict, aiml_classify, aiml_anomaly, cad_geometry, cad_mesh,
 *   cam_toolpath, cam_gcode, cam_collision, file_parse, file_generate,
 *   sim_gcode, sim_cycle_time, viz_scene, viz_toolpath,
 *   report_setup_sheet, report_cost, report_tool_list, report_speed_feed,
 *   settings_get, settings_update, settings_convert, settings_safety
 */
import { z } from "zod";
import { log } from "../../utils/Logger.js";
import { slimResponse, getCurrentPressurePct, getSlimLevel } from "../../utils/responseSlimmer.js";
import { dispatcherError } from "../../utils/dispatcherMiddleware.js";

// Lazy-load engines to avoid circular deps and startup cost
let _aiml: any, _cad: any, _cam: any, _fileIO: any, _sim: any, _viz: any, _report: any, _settings: any;
async function getEngine(name: string): Promise<any> {
  switch (name) {
    case "aiml": return _aiml ??= (await import("../../engines/AIMLEngine.js")).aimlEngine;
    case "cad": return _cad ??= (await import("../../engines/CADKernelEngine.js")).cadKernelEngine;
    case "cam": return _cam ??= (await import("../../engines/CAMKernelEngine.js")).camKernelEngine;
    case "fileio": return _fileIO ??= (await import("../../engines/FileIOEngine.js")).fileIOEngine;
    case "sim": return _sim ??= (await import("../../engines/SimulationEngine.js")).simulationEngine;
    case "viz": return _viz ??= (await import("../../engines/VisualizationEngine.js")).visualizationEngine;
    case "report": return _report ??= (await import("../../engines/ReportEngine.js")).reportEngine;
    case "settings": return _settings ??= (await import("../../engines/SettingsEngine.js")).settingsEngine;
    default: throw new Error(`Unknown L2 engine: ${name}`);
  }
}

const ACTIONS = [
  // AI/ML (AIMLEngine)
  "aiml_predict", "aiml_classify", "aiml_anomaly", "aiml_cluster", "aiml_models",
  // CAD Kernel (CADKernelEngine)
  "cad_geometry", "cad_mesh", "cad_curve", "cad_capabilities",
  // CAM Kernel (CAMKernelEngine)
  "cam_toolpath", "cam_gcode", "cam_collision", "cam_chip_thinning", "cam_capabilities",
  // File I/O (FileIOEngine)
  "file_parse", "file_generate", "file_formats",
  // Simulation (SimulationEngine)
  "sim_gcode", "sim_cycle_time", "sim_verify", "sim_capabilities",
  // Visualization (VisualizationEngine)
  "viz_scene", "viz_toolpath", "viz_heatmap", "viz_presets",
  // Reports (ReportEngine)
  "report_setup_sheet", "report_cost", "report_tool_list", "report_speed_feed",
  "report_alarm", "report_inspection", "report_templates",
  // Settings (SettingsEngine)
  "settings_get", "settings_update", "settings_convert", "settings_presets",
  "settings_safety", "settings_apply_preset",
] as const;

export function registerL2EngineDispatcher(server: any): void {
  server.tool(
    "prism_l2",
    `L2 Engine dispatcher — 8 ported monolith engines (AI/ML, CAD, CAM, File I/O, Simulation, Visualization, Reports, Settings).
Actions: ${ACTIONS.join(", ")}.
Params vary by action — pass relevant fields in params object.`,
    { action: z.enum(ACTIONS), params: z.record(z.any()).optional() },
    async ({ action, params: rawParams = {} }: { action: typeof ACTIONS[number]; params?: Record<string, any> }) => {
      log.info(`[prism_l2] Action: ${action}`);
      let result: any;
      try {
        // H1-MS2: Auto-normalize snake_case → camelCase params
        let params = rawParams;
        try {
          const { normalizeParams } = await import("../../utils/paramNormalizer.js");
          params = normalizeParams(rawParams);
        } catch { /* normalizer not available */ }
        switch (action) {

          // ================================================================
          // AI/ML ENGINE
          // ================================================================
          case "aiml_predict": {
            const engine = await getEngine("aiml");
            result = engine.predict(params);
            break;
          }
          case "aiml_classify": {
            const engine = await getEngine("aiml");
            result = engine.classifyIntent(params.query || params.text || "");
            break;
          }
          case "aiml_anomaly": {
            const engine = await getEngine("aiml");
            result = engine.detectAnomaly(params.features || params, params.model_id || "default");
            break;
          }
          case "aiml_cluster": {
            const engine = await getEngine("aiml");
            result = engine.cluster(params);
            break;
          }
          case "aiml_models": {
            const engine = await getEngine("aiml");
            result = { models: engine.listModels(params.domain), performance: engine.getModelPerformance() };
            break;
          }

          // ================================================================
          // CAD KERNEL ENGINE
          // ================================================================
          case "cad_geometry": {
            const engine = await getEngine("cad");
            const op = params.operation || params.op;
            switch (op) {
              case "convex_hull_3d": result = engine.convexHull3D(params.points); break;
              case "convex_hull_2d": result = engine.convexHull2D(params.points); break;
              case "point_in_polygon": result = { inside: engine.pointInPolygon2D(params.point, params.polygon) }; break;
              case "polygon_area": result = { area: engine.polygonArea2D(params.polygon) }; break;
              case "aabb": result = engine.computeAABB(params.points); break;
              case "aabb_overlap": result = { overlap: engine.aabbOverlap(params.a, params.b) }; break;
              case "ray_aabb": result = engine.rayAABBIntersect(params.ray, params.aabb); break;
              case "ray_triangle": result = engine.rayTriangleIntersect(params.ray, params.triangle); break;
              case "distance_point_line": result = { distance: engine.pointToLineDistance(params.point, params.line_start, params.line_end) }; break;
              case "distance_point_plane": result = { distance: engine.pointToPlaneDistance(params.point, params.plane_normal, params.plane_d) }; break;
              default: result = { error: `Unknown cad_geometry op: ${op}`, available: ["convex_hull_3d", "convex_hull_2d", "point_in_polygon", "polygon_area", "aabb", "aabb_overlap", "ray_aabb", "ray_triangle", "distance_point_line", "distance_point_plane"] };
            }
            break;
          }
          case "cad_mesh": {
            const engine = await getEngine("cad");
            const op = params.operation || params.op;
            switch (op) {
              case "generate_box": result = engine.generateBox(params.width, params.height, params.depth); break;
              case "generate_cylinder": result = engine.generateCylinder(params.radius, params.height, params.segments); break;
              case "volume": result = { volume: engine.meshVolume(params.mesh) }; break;
              case "surface_area": result = { area: engine.meshSurfaceArea(params.mesh) }; break;
              case "centroid": result = engine.meshCentroid(params.mesh); break;
              case "triangle_normal": result = engine.triangleNormal(params.a, params.b, params.c); break;
              case "triangle_area": result = { area: engine.triangleArea(params.a, params.b, params.c) }; break;
              default: result = { error: `Unknown cad_mesh op: ${op}`, available: ["generate_box", "generate_cylinder", "volume", "surface_area", "centroid", "triangle_normal", "triangle_area"] };
            }
            break;
          }
          case "cad_curve": {
            const engine = await getEngine("cad");
            const op = params.operation || params.op;
            switch (op) {
              case "nurbs": result = engine.evaluateNURBSCurve(params.curve, params.t); break;
              case "bspline": result = engine.evaluateBSplineCurve(params.curve, params.t); break;
              case "bezier": result = engine.evaluateBezierCurve(params.curve, params.t); break;
              case "sample": result = { points: engine.sampleCurve(params.curve, params.samples || 50) }; break;
              default: result = { error: `Unknown cad_curve op: ${op}`, available: ["nurbs", "bspline", "bezier", "sample"] };
            }
            break;
          }
          case "cad_capabilities": {
            const engine = await getEngine("cad");
            result = engine.getCapabilities();
            break;
          }

          // ================================================================
          // CAM KERNEL ENGINE
          // ================================================================
          case "cam_toolpath": {
            const engine = await getEngine("cam");
            const op = params.operation || params.type || "face_mill";
            switch (op) {
              case "face_mill": result = engine.generateFaceMill(params); break;
              case "pocket_2d": result = engine.generatePocket2D(params); break;
              case "contour_2d": result = engine.generateContour2D(params); break;
              case "helical_ramp": result = engine.generateHelicalRamp(params); break;
              case "peck_drill": result = engine.generatePeckDrill(params); break;
              case "entry_strategy": result = engine.selectEntryStrategy(params.tool, params.material, params.feature_width, params.depth); break;
              default: result = { error: `Unknown cam_toolpath op: ${op}`, available: ["face_mill", "pocket_2d", "contour_2d", "helical_ramp", "peck_drill", "entry_strategy"] };
            }
            break;
          }
          case "cam_gcode": {
            const engine = await getEngine("cam");
            if (params.program) {
              result = engine.generateProgram(params);
            } else {
              result = { lines: engine.serializeGCode(params.moves, params.params || {}) };
            }
            break;
          }
          case "cam_collision": {
            const engine = await getEngine("cam");
            result = engine.checkCollisions(params);
            break;
          }
          case "cam_chip_thinning": {
            const engine = await getEngine("cam");
            result = engine.calculateChipThinning(params.programmed_chipload, params.radial_depth, params.tool_diameter);
            break;
          }
          case "cam_capabilities": {
            const engine = await getEngine("cam");
            result = engine.getCapabilities();
            break;
          }

          // ================================================================
          // FILE I/O ENGINE
          // ================================================================
          case "file_parse": {
            const engine = await getEngine("fileio");
            result = engine.parse(params.content, params.format);
            break;
          }
          case "file_generate": {
            const engine = await getEngine("fileio");
            const fmt = (params.format || "stl").toLowerCase();
            if (fmt === "stl") result = { output: engine.generateSTL(params.name || "part", params.triangles) };
            else if (fmt === "dxf") result = { output: engine.generateDXF(params.entities) };
            else result = { error: `Unsupported format: ${fmt}`, available: ["stl", "dxf"] };
            break;
          }
          case "file_formats": {
            const engine = await getEngine("fileio");
            result = { formats: engine.listFormats() };
            break;
          }

          // ================================================================
          // SIMULATION ENGINE
          // ================================================================
          case "sim_gcode": {
            const engine = await getEngine("sim");
            result = engine.simulate(params);
            break;
          }
          case "sim_cycle_time": {
            const engine = await getEngine("sim");
            result = engine.estimateCycleTime(params);
            break;
          }
          case "sim_verify": {
            const engine = await getEngine("sim");
            result = engine.verifyToolpath(params);
            break;
          }
          case "sim_capabilities": {
            const engine = await getEngine("sim");
            result = engine.getCapabilities();
            break;
          }

          // ================================================================
          // VISUALIZATION ENGINE
          // ================================================================
          case "viz_scene": {
            const engine = await getEngine("viz");
            result = engine.buildScene(params);
            break;
          }
          case "viz_toolpath": {
            const engine = await getEngine("viz");
            result = engine.generateToolpathVis(params.moves, params.color_mode || "by_type");
            break;
          }
          case "viz_heatmap": {
            const engine = await getEngine("viz");
            result = engine.generateHeatmap(params.type, params.min, params.max, params.unit);
            break;
          }
          case "viz_presets": {
            const engine = await getEngine("viz");
            result = { presets: engine.listViewPresets() };
            break;
          }

          // ================================================================
          // REPORT ENGINE
          // ================================================================
          case "report_setup_sheet": {
            const engine = await getEngine("report");
            result = engine.generateSetupSheet(params);
            break;
          }
          case "report_cost": {
            const engine = await getEngine("report");
            result = engine.generateCostEstimate(params);
            break;
          }
          case "report_tool_list": {
            const engine = await getEngine("report");
            result = engine.generateToolList(params);
            break;
          }
          case "report_speed_feed": {
            const engine = await getEngine("report");
            result = engine.generateSpeedFeedCard(params);
            break;
          }
          case "report_alarm": {
            const engine = await getEngine("report");
            result = engine.generateAlarmReport(params);
            break;
          }
          case "report_inspection": {
            const engine = await getEngine("report");
            result = engine.generateInspectionPlan(params);
            break;
          }
          case "report_templates": {
            const engine = await getEngine("report");
            result = engine.listTemplates();
            break;
          }

          // ================================================================
          // SETTINGS ENGINE
          // ================================================================
          case "settings_get": {
            const engine = await getEngine("settings");
            result = engine.getSettings(params.user_id);
            break;
          }
          case "settings_update": {
            const engine = await getEngine("settings");
            result = engine.updateSettings(params.user_id || "default", params.settings || params);
            break;
          }
          case "settings_convert": {
            const engine = await getEngine("settings");
            if (params.results) {
              result = engine.convertResults(params.results, params.from_system, params.user_id);
            } else {
              result = engine.convertUnit(params.value, params.from, params.to, params.category);
            }
            break;
          }
          case "settings_presets": {
            const engine = await getEngine("settings");
            result = { presets: engine.listPresets(params.user_id) };
            break;
          }
          case "settings_safety": {
            const engine = await getEngine("settings");
            if (params.check) {
              result = engine.checkSafetyLimits(params.check, params.user_id);
            } else {
              result = engine.getSafetyLimits(params.user_id);
            }
            break;
          }
          case "settings_apply_preset": {
            const engine = await getEngine("settings");
            result = engine.applyPreset(params.preset_id, params.base_params || {}, params.user_id);
            break;
          }

          default:
            result = { error: `Unknown L2 action: ${action}`, available_actions: ACTIONS };
        }

        const pressurePct = getCurrentPressurePct();
        return { content: [{ type: "text", text: JSON.stringify(slimResponse(result, getSlimLevel(pressurePct))) }] };

      } catch (error: any) {
        log.error(`[prism_l2] Error in ${action}:`, error);
        return dispatcherError(error, action, "prism_l2");
      }
    }
  );
}
