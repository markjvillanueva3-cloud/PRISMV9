/**
 * prism_edm — EDM Process Dispatcher
 *
 * 4 actions: electrode_design, wire_settings, surface_integrity, micro_edm
 *
 * Engine dependencies: ElectrodeDesignEngine, WireEDMSettingsEngine,
 *   EDMSurfaceIntegrityEngine, MicroEDMEngine
 */
import { z } from "zod";
import { log } from "../../utils/Logger.js";
import { slimResponse } from "../../utils/responseSlimmer.js";

let _electrode: any, _wire: any, _surface: any, _micro: any;
async function getEngine(name: string): Promise<any> {
  switch (name) {
    case "electrode": return _electrode ??= (await import("../../engines/ElectrodeDesignEngine.js")).electrodeDesignEngine;
    case "wire": return _wire ??= (await import("../../engines/WireEDMSettingsEngine.js")).wireEDMSettingsEngine;
    case "surface": return _surface ??= (await import("../../engines/EDMSurfaceIntegrityEngine.js")).edmSurfaceIntegrityEngine;
    case "micro": return _micro ??= (await import("../../engines/MicroEDMEngine.js")).microEDMEngine;
    default: throw new Error(`Unknown EDM engine: ${name}`);
  }
}

const ACTIONS = [
  "electrode_design", "wire_settings", "surface_integrity", "micro_edm",
] as const;

export function registerEdmDispatcher(server: any): void {
  server.tool(
    "prism_edm",
    `EDM Process dispatcher — electrode design, wire EDM settings, surface integrity assessment, micro-EDM parameters.
Actions: ${ACTIONS.join(", ")}.`,
    { action: z.enum(ACTIONS), params: z.record(z.any()).optional() },
    async ({ action, params = {} }: { action: typeof ACTIONS[number]; params?: Record<string, any> }) => {
      log.info(`[prism_edm] Action: ${action}`);
      let result: any;
      try {
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
          default:
            result = { error: `Unknown action: ${action}` };
        }
      } catch (err: any) {
        log.error(`[prism_edm] ${action} failed: ${err.message}`);
        result = { error: err.message, action };
      }
      return { content: [{ type: "text" as const, text: JSON.stringify(slimResponse(result)) }] };
    }
  );
}
