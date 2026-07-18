/**
 * prism_welding — Welding & Joining Dispatcher
 *
 * 6 actions: adhesive bonding, brazing/soldering, ultrasonic welding,
 *   weld distortion, weld strength, welding parameters
 */
import { z } from "zod";
import { log } from "../../utils/Logger.js";
import { slimResponse } from "../../utils/responseSlimmer.js";
import { dispatcherError, validateActionParams } from "../../utils/dispatcherMiddleware.js";
import { WELDING_JOINING_ACTION_SCHEMAS } from "../../schemas/weldingJoiningActionSchemas.js";
import { hookExecutor } from "../../engines/HookExecutor.js";

let _adhesive: any, _brazing: any, _ultrasonic: any;
let _distortion: any, _strength: any, _welding: any;

async function getEngine(name: string): Promise<any> {
  switch (name) {
    case "adhesive": return _adhesive ??= (await import("../../engines/AdhesiveBondEngine.js")).adhesiveBondEngine;
    case "brazing": return _brazing ??= (await import("../../engines/BrazingSolderingEngine.js")).brazingSolderingEngine;
    case "ultrasonic": return _ultrasonic ??= (await import("../../engines/UltrasonicWeldingEngine.js")).ultrasonicWeldingEngine;
    case "distortion": return _distortion ??= (await import("../../engines/WeldDistortionEngine.js")).weldDistortionEngine;
    case "strength": return _strength ??= (await import("../../engines/WeldStrengthEngine.js")).weldStrengthEngine;
    case "welding": return _welding ??= (await import("../../engines/WeldingEngine.js")).weldingEngine;
    default: throw new Error(`Unknown engine: ${name}`);
  }
}

const ACTIONS = [
  "adhesive_bond_calculate", "brazing_soldering_calculate",
  "ultrasonic_welding_calculate", "weld_distortion_calculate",
  "weld_strength_calculate", "welding_calculate",
] as const;

export function registerWeldingJoiningDispatcher(server: any): void {
  server.tool(
    "prism_welding",
    `Welding & joining: adhesive bonding, brazing/soldering, ultrasonic welding, weld distortion prediction, weld strength calculation, welding parameters (MIG/TIG/stick/flux core/sub arc/laser/EB).
Actions: ${ACTIONS.join(", ")}.`,
    { action: z.enum(ACTIONS), params: z.record(z.string(), z.any()).optional() },
    async ({ action, params: rawParams = {} }: { action: typeof ACTIONS[number]; params?: Record<string, any> }) => {
      log.info(`[prism_welding] Action: ${action} (6 actions wired)`);
      let result: any;
      try {
        let params = rawParams;
        try {
          const { normalizeParams } = await import("../../utils/paramNormalizer.js");
          params = normalizeParams(rawParams);
        } catch { /* normalizer not available */ }

        const validation = validateActionParams(action, params, WELDING_JOINING_ACTION_SCHEMAS);
        if (!validation.valid) {
          return dispatcherError(`Invalid params for '${action}': ${validation.errorMessage}`, action, "prism_welding");
        }

        const hookCtx = {
          operation: action,
          target: { type: "calculation" as const, id: action, data: params },
          metadata: { dispatcher: "weldingJoiningDispatcher", action, params }
        };
        const preResult = await hookExecutor.execute("pre-calculation", hookCtx);
        if (preResult.blocked) {
          return { content: [{ type: "text", text: JSON.stringify({ blocked: true, blocker: preResult.blockedBy, reason: preResult.summary, action }) }] };
        }

        const engineMap: Record<string, string> = {
          adhesive_bond_calculate: "adhesive",
          brazing_soldering_calculate: "brazing",
          ultrasonic_welding_calculate: "ultrasonic",
          weld_distortion_calculate: "distortion",
          weld_strength_calculate: "strength",
          welding_calculate: "welding",
        };

        const engineKey = engineMap[action];
        const eng = await getEngine(engineKey);
        result = eng.calculate?.(params) ?? eng.compute?.(params) ?? { error: `${engineKey} method not found` };

        try {
          await hookExecutor.execute("post-calculation", { ...hookCtx, metadata: { ...hookCtx.metadata, result } });
        } catch (postErr) {
          log.warn(`[prism_welding] Post-hook error: ${postErr}`);
        }
      } catch (error: any) {
        if (error?.name === "SafetyBlockError") throw error;
        return dispatcherError(error, action, "prism_welding");
      }
      return { content: [{ type: "text" as const, text: JSON.stringify(slimResponse(result)) }] };
    }
  );
}
