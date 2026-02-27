/**
 * prism_turning — Turning-Specific Dispatcher
 * *** SAFETY CRITICAL *** — clamping forces affect workpiece ejection risk
 *
 * 6 actions: chuck_force, tailstock, steady_rest, live_tool, bar_pull, thread_single_point
 *
 * Engine dependencies: ChuckJawForceEngine, TailstockForceEngine,
 *   SteadyRestPlacementEngine, LiveToolingEngine, BarPullerTimingEngine,
 *   SinglePointThreadEngine
 */
import { z } from "zod";
import { log } from "../../utils/Logger.js";
import { slimResponse } from "../../utils/responseSlimmer.js";
import { dispatcherError } from "../../utils/dispatcherMiddleware.js";

let _chuck: any, _tail: any, _steady: any, _live: any, _bar: any, _thread: any;
async function getEngine(name: string): Promise<any> {
  switch (name) {
    case "chuck": return _chuck ??= (await import("../../engines/ChuckJawForceEngine.js")).chuckJawForceEngine;
    case "tail": return _tail ??= (await import("../../engines/TailstockForceEngine.js")).tailstockForceEngine;
    case "steady": return _steady ??= (await import("../../engines/SteadyRestPlacementEngine.js")).steadyRestPlacementEngine;
    case "live": return _live ??= (await import("../../engines/LiveToolingEngine.js")).liveToolingEngine;
    case "bar": return _bar ??= (await import("../../engines/BarPullerTimingEngine.js")).barPullerTimingEngine;
    case "thread": return _thread ??= (await import("../../engines/SinglePointThreadEngine.js")).singlePointThreadEngine;
    default: throw new Error(`Unknown turning engine: ${name}`);
  }
}

const ACTIONS = [
  "chuck_force", "tailstock", "steady_rest",
  "live_tool", "bar_pull", "thread_single_point",
] as const;

export function registerTurningDispatcher(server: any): void {
  server.tool(
    "prism_turning",
    `Turning-specific dispatcher — SAFETY CRITICAL. Chuck jaw force, tailstock, steady rest, live tooling, bar puller, single-point threading.
Actions: ${ACTIONS.join(", ")}.`,
    { action: z.enum(ACTIONS), params: z.record(z.any()).optional() },
    async ({ action, params: rawParams = {} }: { action: typeof ACTIONS[number]; params?: Record<string, any> }) => {
      log.info(`[prism_turning] Action: ${action}`);
      let result: any;
      try {
        // H1-MS2: Auto-normalize snake_case → camelCase params
        let params = rawParams;
        try {
          const { normalizeParams } = await import("../../utils/paramNormalizer.js");
          params = normalizeParams(rawParams);
        } catch { /* normalizer not available */ }
        switch (action) {
          case "chuck_force": {
            const engine = await getEngine("chuck");
            result = engine.calculate?.(params) ?? engine.compute?.(params) ?? { error: "ChuckJawForceEngine method not found" };
            break;
          }
          case "tailstock": {
            const engine = await getEngine("tail");
            result = engine.calculate?.(params) ?? engine.compute?.(params) ?? { error: "TailstockForceEngine method not found" };
            break;
          }
          case "steady_rest": {
            const engine = await getEngine("steady");
            result = engine.calculate?.(params) ?? engine.optimize?.(params) ?? engine.compute?.(params) ?? { error: "SteadyRestPlacementEngine method not found" };
            break;
          }
          case "live_tool": {
            const engine = await getEngine("live");
            result = engine.calculate?.(params) ?? engine.compute?.(params) ?? { error: "LiveToolingEngine method not found" };
            break;
          }
          case "bar_pull": {
            const engine = await getEngine("bar");
            result = engine.calculate?.(params) ?? engine.optimize?.(params) ?? engine.compute?.(params) ?? { error: "BarPullerTimingEngine method not found" };
            break;
          }
          case "thread_single_point": {
            const engine = await getEngine("thread");
            result = engine.calculate?.(params) ?? engine.plan?.(params) ?? engine.compute?.(params) ?? { error: "SinglePointThreadEngine method not found" };
            break;
          }
          default:
            result = { error: `Unknown action: ${action}` };
        }
      } catch (error) {
        return dispatcherError(error, action, "prism_turning");
      }
      return { content: [{ type: "text" as const, text: JSON.stringify(slimResponse(result)) }] };
    }
  );
}
