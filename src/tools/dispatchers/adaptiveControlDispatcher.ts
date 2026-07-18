/**
 * prism_adaptive_control — Adaptive Control & Digital Twin Dispatcher
 *
 * 12 actions: adaptive_feed, adaptive_feed_tune, adaptive_spindle,
 *   adaptive_spindle_stability, adaptive_spindle_chatter, bayesian_calibrate,
 *   bayesian_predict_force, tool_life_predict, tool_life_weibull,
 *   tool_life_replacement, digital_twin_sync, digital_twin_query
 *
 * Engine dependencies: AdaptiveFeedControlEngine, AdaptiveSpindleControlEngine,
 *   BayesianAdaptiveEngine, ToolLifeAdaptiveEngine, DigitalTwinSyncEngine
 * Milestone: SCI-MS1
 */
import { z } from "zod";
import { log } from "../../utils/Logger.js";
import { slimResponse } from "../../utils/responseSlimmer.js";
import { dispatcherError, validateActionParams } from "../../utils/dispatcherMiddleware.js";
import { ADAPTIVE_CONTROL_ACTION_SCHEMAS } from "../../schemas/adaptiveControlActionSchemas.js";
import { hookExecutor } from "../../engines/HookExecutor.js";

let _afc: any, _asc: any, _bay: any, _tla: any, _dts: any;
async function getEngine(name: string): Promise<any> {
  switch (name) {
    case "afc": return _afc ??= (await import("../../engines/AdaptiveFeedControlEngine.js")).adaptiveFeedControlEngine;
    case "asc": return _asc ??= (await import("../../engines/AdaptiveSpindleControlEngine.js")).adaptiveSpindleControlEngine;
    case "bay": return _bay ??= (await import("../../engines/BayesianAdaptiveEngine.js")).bayesianAdaptiveEngine;
    case "tla": return _tla ??= (await import("../../engines/ToolLifeAdaptiveEngine.js")).toolLifeAdaptiveEngine;
    case "dts": return _dts ??= (await import("../../engines/DigitalTwinSyncEngine.js")).digitalTwinSyncEngine;
    default: throw new Error(`Unknown adaptive control engine: ${name}`);
  }
}

const ACTIONS = [
  "adaptive_feed", "adaptive_feed_tune",
  "adaptive_spindle", "adaptive_spindle_stability", "adaptive_spindle_chatter",
  "bayesian_calibrate", "bayesian_predict_force",
  "tool_life_predict", "tool_life_weibull", "tool_life_replacement",
  "digital_twin_sync", "digital_twin_query",
] as const;

/** Registers adaptive control dispatcher.
 * @param server - MCP server instance
 * @returns void
 */
export function registerAdaptiveControlDispatcher(server: any): void {
  server.tool(
    "prism_adaptive_control",
    `Adaptive Control & Digital Twin dispatcher — real-time feed/spindle adaptation, Bayesian force calibration, Weibull tool life prediction, digital twin synchronization.
Actions: ${ACTIONS.join(", ")}.
Params vary by action — pass relevant fields in params object.`,
    { action: z.enum(ACTIONS), params: z.record(z.string(), z.any()).optional() },
    async ({ action, params: rawParams = {} }: { action: typeof ACTIONS[number]; params?: Record<string, any> }) => {
      log.info(`[prism_adaptive_control] Action: ${action}`);
      let result: any;
      try {
        let params = rawParams;
        try {
          const { normalizeParams } = await import("../../utils/paramNormalizer.js");
          params = normalizeParams(rawParams);
        } catch { /* normalizer not available */ }

        const validation = validateActionParams(action, params, ADAPTIVE_CONTROL_ACTION_SCHEMAS);
        if (!validation.valid) {
          return dispatcherError(
            `Invalid params for '${action}': ${validation.errorMessage}`,
            action,
            "prism_adaptive_control"
          );
        }

        // PRE-CALCULATION SAFETY HOOKS
        const hookCtx = {
          operation: action,
          target: { type: "calculation" as const, id: action, data: params },
          metadata: { dispatcher: "adaptiveControlDispatcher", action, params }
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
          case "adaptive_feed": {
            const eng = await getEngine("afc");
            result = eng.adapt(params);
            break;
          }
          case "adaptive_feed_tune": {
            const eng = await getEngine("afc");
            result = eng.tuneGains(params);
            break;
          }
          case "adaptive_spindle": {
            const eng = await getEngine("asc");
            result = eng.adapt(params);
            break;
          }
          case "adaptive_spindle_stability": {
            const eng = await getEngine("asc");
            result = eng.stabilityLimit(
              params.rpm, params.natural_freq ?? params.naturalFreq,
              params.damping, params.Kc, params.stiffness, params.flutes
            );
            result = { critical_depth: result };
            break;
          }
          case "adaptive_spindle_chatter": {
            const eng = await getEngine("asc");
            result = eng.detectChatter(params.signal, params.sample_rate ?? params.sampleRate, params.rpm, params.flutes);
            break;
          }
          case "bayesian_calibrate": {
            const eng = await getEngine("bay");
            result = eng.calibrate(params);
            break;
          }
          case "bayesian_predict_force": {
            const eng = await getEngine("bay");
            result = { force_N: eng.predictForce(params.kc11, params.mc, params.h_mm, params.b_mm) };
            break;
          }
          case "tool_life_predict": {
            const eng = await getEngine("tla");
            result = eng.predict(params);
            break;
          }
          case "tool_life_weibull": {
            const eng = await getEngine("tla");
            result = eng.weibullMLE(params.times, params.censored);
            break;
          }
          case "tool_life_replacement": {
            const eng = await getEngine("tla");
            result = { optimal_time: eng.optimalReplacement(params.beta, params.eta, params.C_r, params.C_f) };
            break;
          }
          case "digital_twin_sync": {
            const eng = await getEngine("dts");
            result = eng.sync(params);
            break;
          }
          case "digital_twin_query": {
            const eng = await getEngine("dts");
            result = eng.queryForAlgorithm(params.state || {}, params.algorithm);
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
          log.warn(`[prism_adaptive_control] Post-calculation hook error: ${postErr}`);
        }
      } catch (error: any) {
        if (error?.name === "SafetyBlockError") throw error;
        return dispatcherError(error, action, "prism_adaptive_control");
      }
      return { content: [{ type: "text" as const, text: JSON.stringify(slimResponse(result)) }] };
    }
  );
  log.info("Registered: prism_adaptive_control dispatcher (12 actions)");
}
