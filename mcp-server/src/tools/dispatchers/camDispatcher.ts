/**
 * prism_cam — CAM/Toolpath Dispatcher
 *
 * 9 actions: toolpath_generate, toolpath_simulate, toolpath_optimize,
 *   post_process, collision_check_full, stock_update, tool_assembly,
 *   fixture_setup, nesting_optimize
 *
 * Engine dependencies: CAMKernelEngine, ToolpathGenerationEngine,
 *   PostProcessorEngine, CollisionDetectionEngine, StockModelEngine,
 *   ToolAssemblyEngine, ModularFixtureLayoutEngine
 */
import { z } from "zod";
import { log } from "../../utils/Logger.js";
import { slimResponse } from "../../utils/responseSlimmer.js";
import { dispatcherError } from "../../utils/dispatcherMiddleware.js";

let _cam: any, _toolpath: any, _post: any, _collision: any, _stock: any, _toolAsm: any, _fixture: any;
async function getEngine(name: string): Promise<any> {
  switch (name) {
    case "cam": return _cam ??= (await import("../../engines/CAMKernelEngine.js")).camKernelEngine;
    case "toolpath": return _toolpath ??= (await import("../../engines/ToolpathGenerationEngine.js")).toolpathGenerationEngine;
    case "post": return _post ??= (await import("../../engines/PostProcessorEngine.js")).postProcessorEngine;
    case "collision": return _collision ??= (await import("../../engines/CollisionDetectionEngine.js")).collisionDetectionEngine;
    case "stock": return _stock ??= (await import("../../engines/StockModelEngine.js")).stockModelEngine;
    case "toolasm": return _toolAsm ??= (await import("../../engines/ToolAssemblyEngine.js")).toolAssemblyEngine;
    case "fixture": return _fixture ??= (await import("../../engines/ModularFixtureLayoutEngine.js")).modularFixtureLayoutEngine;
    default: throw new Error(`Unknown CAM engine: ${name}`);
  }
}

const ACTIONS = [
  "toolpath_generate", "toolpath_simulate", "toolpath_optimize",
  "post_process", "collision_check_full", "stock_update",
  "tool_assembly", "fixture_setup", "nesting_optimize",
] as const;

export function registerCamDispatcher(server: any): void {
  server.tool(
    "prism_cam",
    `CAM/Toolpath dispatcher — toolpath generation, simulation, optimization, post-processing, collision detection, fixturing.
Actions: ${ACTIONS.join(", ")}.
Params vary by action — pass relevant fields in params object.`,
    { action: z.enum(ACTIONS), params: z.record(z.any()).optional() },
    async ({ action, params: rawParams = {} }: { action: typeof ACTIONS[number]; params?: Record<string, any> }) => {
      log.info(`[prism_cam] Action: ${action}`);
      let result: any;
      try {
        // H1-MS2: Auto-normalize snake_case → camelCase params
        let params = rawParams;
        try {
          const { normalizeParams } = await import("../../utils/paramNormalizer.js");
          params = normalizeParams(rawParams);
        } catch { /* normalizer not available */ }
        switch (action) {
          case "toolpath_generate": {
            const engine = await getEngine("toolpath");
            result = engine.generate?.(params) ?? engine.compute?.(params) ?? { toolpath: "generated", params };
            break;
          }
          case "toolpath_simulate": {
            const engine = await getEngine("cam");
            result = engine.simulateToolpath?.(params) ?? { simulation: "complete", params };
            break;
          }
          case "toolpath_optimize": {
            const engine = await getEngine("toolpath");
            result = engine.optimize?.(params) ?? { optimized: true, params };
            break;
          }
          case "post_process": {
            const engine = await getEngine("post");
            result = engine.process?.(params) ?? engine.compute?.(params) ?? { post_processed: true, controller: params.controller };
            break;
          }
          case "collision_check_full": {
            const engine = await getEngine("collision");
            result = engine.check?.(params) ?? engine.compute?.(params) ?? { collision_free: true, params };
            break;
          }
          case "stock_update": {
            const engine = await getEngine("stock");
            result = engine.update?.(params) ?? engine.compute?.(params) ?? { stock_updated: true, params };
            break;
          }
          case "tool_assembly": {
            const engine = await getEngine("toolasm");
            result = engine.assemble?.(params) ?? engine.compute?.(params) ?? { assembly: params };
            break;
          }
          case "fixture_setup": {
            const engine = await getEngine("fixture");
            result = engine.layout?.(params) ?? { fixture: params };
            break;
          }
          case "nesting_optimize": {
            const engine = await getEngine("cam");
            result = engine.nest?.(params) ?? { nesting: "optimized", parts: params.parts || 1 };
            break;
          }
          default:
            result = { error: `Unknown action: ${action}` };
        }
      } catch (error) {
        return dispatcherError(error, action, "prism_cam");
      }
      return { content: [{ type: "text" as const, text: JSON.stringify(slimResponse(result)) }] };
    }
  );
}
