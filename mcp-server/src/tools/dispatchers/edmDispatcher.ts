/**
 * prism_edm — Non-Traditional Machining Dispatcher
 *
 * 12 actions: electrode_design, wire_settings, surface_integrity, micro_edm,
 *   laser_calculate, laser_materials, laser_machines, laser_gas_recommend,
 *   waterjet_calculate, waterjet_materials, waterjet_abrasives, waterjet_quality_levels
 *
 * Engine dependencies: ElectrodeDesignEngine, WireEDMSettingsEngine,
 *   EDMSurfaceIntegrityEngine, MicroEDMEngine, LaserCuttingEngine, WaterjetCuttingEngine
 */
import { z } from "zod";
import { log } from "../../utils/Logger.js";
import { slimResponse } from "../../utils/responseSlimmer.js";
import { dispatcherError, validateActionParams } from "../../utils/dispatcherMiddleware.js";
import { EDM_ACTION_SCHEMAS } from "../../schemas/edmActionSchemas.js";
import { hookExecutor } from "../../engines/HookExecutor.js";

let _electrode: any, _wire: any, _surface: any, _micro: any;
let _laser: any, _waterjet: any, _sinker: any;
async function getEngine(name: string): Promise<any> {
  switch (name) {
    case "electrode": return _electrode ??= (await import("../../engines/ElectrodeDesignEngine.js")).electrodeDesignEngine;
    case "wire": return _wire ??= (await import("../../engines/WireEDMSettingsEngine.js")).wireEDMSettingsEngine;
    case "surface": return _surface ??= (await import("../../engines/EDMSurfaceIntegrityEngine.js")).edmSurfaceIntegrityEngine;
    case "micro": return _micro ??= (await import("../../engines/MicroEDMEngine.js")).microEDMEngine;
    case "laser": return _laser ??= (await import("../../engines/LaserCuttingEngine.js")).laserCuttingEngine;
    case "waterjet": return _waterjet ??= (await import("../../engines/WaterjetCuttingEngine.js")).waterjetCuttingEngine;
    case "sinker": return _sinker ??= (await import("../../engines/SinkerEDMCalculatorEngine.js")).sinkerEDMCalculatorEngine;
    default: throw new Error(`Unknown engine: ${name}`);
  }
}

const ACTIONS = [
  "electrode_design", "wire_settings", "surface_integrity", "micro_edm",
  "laser_calculate", "laser_materials", "laser_machines", "laser_gas_recommend",
  "waterjet_calculate", "waterjet_materials", "waterjet_abrasives", "waterjet_quality_levels",
  "sinker_calculate", "sinker_materials", "sinker_vdi_scale", "sinker_recommend",
] as const;

/** Registers edm dispatcher.
 * @param server - MCP server instance
  * @returns void
 */
export function registerEdmDispatcher(server: any): void {
  server.tool(
    "prism_edm",
    `Non-traditional machining: EDM (electrode, wire, surface, micro), laser cutting (speed/kerf/cost), waterjet (abrasive/pure, Q1-Q5).
Actions: ${ACTIONS.join(", ")}.`,
    { action: z.enum(ACTIONS), params: z.record(z.string(), z.any()).optional() },
    async ({ action, params: rawParams = {} }: { action: typeof ACTIONS[number]; params?: Record<string, any> }) => {
      log.info(`[prism_edm] Action: ${action}`);
      let result: any;
      try {
        // H1-MS2: Auto-normalize snake_case → camelCase params
        let params = rawParams;
        try {
          const { normalizeParams } = await import("../../utils/paramNormalizer.js");
          params = normalizeParams(rawParams);
        } catch { /* normalizer not available */ }

        // Zod schema validation — electrode/wire/surface params
        const validation = validateActionParams(action, params, EDM_ACTION_SCHEMAS);
        if (!validation.valid) {
          return dispatcherError(
            `Invalid params for '${action}': ${validation.errorMessage}`,
            action,
            "prism_edm"
          );
        }

        // PRE-CALCULATION SAFETY HOOKS — recast layer, dielectric safety
        const hookCtx = {
          operation: action,
          target: { type: "calculation" as const, id: action, data: params },
          metadata: { dispatcher: "edmDispatcher", action, params }
        };
        const preResult = await hookExecutor.execute("pre-calculation", hookCtx);
        if (preResult.blocked) {
          return {
            content: [{ type: "text", text: JSON.stringify({
              blocked: true, blocker: preResult.blockedBy,
              reason: preResult.summary, action,
            }) }]
          };
        }

        switch (action) {
          case "electrode_design": {
            const engine = await getEngine("electrode");
            result = engine.design?.(params) ?? engine.calculate?.(params) ?? engine.compute?.(params) ?? { error: "ElectrodeDesign method not found" };
            break;
          }
          case "wire_settings": {
            const engine = await getEngine("wire");
            result = engine.calculate?.(params) ?? engine.compute?.(params) ?? { error: "WireEDMSettings method not found" };
            break;
          }
          case "surface_integrity": {
            const engine = await getEngine("surface");
            result = engine.assess?.(params) ?? engine.calculate?.(params) ?? engine.compute?.(params) ?? { error: "EDMSurfaceIntegrity method not found" };
            break;
          }
          case "micro_edm": {
            const engine = await getEngine("micro");
            result = engine.calculate?.(params) ?? engine.compute?.(params) ?? { error: "MicroEDM method not found" };
            break;
          }

          // --- Laser Cutting (reverse-engineered from monolith) ---
          case "laser_calculate": {
            const engine = await getEngine("laser");
            result = engine.calculateParams(params);
            break;
          }
          case "laser_materials": {
            const engine = await getEngine("laser");
            result = engine.listMaterials();
            break;
          }
          case "laser_machines": {
            const engine = await getEngine("laser");
            result = engine.listMachines();
            break;
          }
          case "laser_gas_recommend": {
            const engine = await getEngine("laser");
            result = engine.recommendGas(
              params.material ?? "mild_steel",
              params.priority ?? "quality"
            );
            break;
          }

          // --- Waterjet Cutting (reverse-engineered from monolith) ---
          case "waterjet_calculate": {
            const engine = await getEngine("waterjet");
            result = engine.calculateParams(params);
            break;
          }
          case "waterjet_materials": {
            const engine = await getEngine("waterjet");
            result = engine.listMaterials();
            break;
          }
          case "waterjet_abrasives": {
            const engine = await getEngine("waterjet");
            result = engine.listAbrasives();
            break;
          }
          case "waterjet_quality_levels": {
            const engine = await getEngine("waterjet");
            result = engine.listQualityLevels();
            break;
          }

          // --- Sinker EDM Calculator (reverse-engineered from monolith) ---
          case "sinker_calculate": {
            const engine = await getEngine("sinker");
            result = engine.calculate(params);
            break;
          }
          case "sinker_materials": {
            const engine = await getEngine("sinker");
            result = {
              electrode: engine.listElectrodeMaterials(),
              workpiece: engine.listWorkpieceMaterials(),
            };
            break;
          }
          case "sinker_vdi_scale": {
            const engine = await getEngine("sinker");
            result = engine.listVDIScale();
            break;
          }
          case "sinker_recommend": {
            const engine = await getEngine("sinker");
            result = engine.recommendSettings(params);
            break;
          }

          default:
            result = { error: `Unknown action: ${action}` };
        }
        // POST-CALCULATION HOOKS
        try {
          await hookExecutor.execute("post-calculation", {
            ...hookCtx, metadata: { ...hookCtx.metadata, result }
          });
        } catch (postErr) {
          log.warn(`[prism_edm] Post-calculation hook error: ${postErr}`);
        }
      } catch (error: any) {
        if (error?.name === "SafetyBlockError") throw error;
        return dispatcherError(error, action, "prism_edm");
      }
      return { content: [{ type: "text" as const, text: JSON.stringify(slimResponse(result)) }] };
    }
  );
}
