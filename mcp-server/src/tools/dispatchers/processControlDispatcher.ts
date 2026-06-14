/**
 * prism_process_control — Process Control & DOE Dispatcher
 *
 * 6 actions: ctc_analyze, ctc_optimal_gain, ctc_autocorrelation,
 *   spc_ewma, spc_cusum, doe_analyze
 *
 * Engine dependencies: CycleToControlEngine, SPCChartingEngine, DOEAnalysisEngine
 * Source: MIT 2.830J Control of Manufacturing Processes (Hardt/Siu)
 */
import { z } from "zod";
import { log } from "../../utils/Logger.js";
import { slimResponse } from "../../utils/responseSlimmer.js";
import { dispatcherError, validateActionParams } from "../../utils/dispatcherMiddleware.js";
import { PROCESS_CONTROL_ACTION_SCHEMAS } from "../../schemas/processControlActionSchemas.js";
import { hookExecutor } from "../../engines/HookExecutor.js";

let _ctc: any, _spc: any, _doe: any;
async function getEngine(name: string): Promise<any> {
  switch (name) {
    case "ctc": return _ctc ??= await import("../../engines/CycleToControlEngine.js");
    case "spc": return _spc ??= await import("../../engines/SPCChartingEngine.js");
    case "doe": return _doe ??= await import("../../engines/DOEAnalysisEngine.js");
    default: throw new Error(`Unknown process control engine: ${name}`);
  }
}

const ACTIONS = [
  "ctc_analyze", "ctc_optimal_gain", "ctc_autocorrelation",
  "spc_ewma", "spc_cusum", "doe_analyze",
  // WIRE-PROCESS-DIRECT-MS0/U-VICTOR-PROCESS-DIRECT (slot:victor, 2026-05-26):
  // close 2 unwired engines from the fresh audit. DOETaguchEngine (distinct
  // from the existing DOEAnalysisEngine — Taguchi method vs factorial) +
  // CUSUMEngine streaming wrapper (one-shot full-stream analysis).
  "doe_taguchi_compute", "cusum_stream_analyze",
] as const;

/** Registers process control dispatcher.
 * @param server - MCP server instance
  * @returns void
 */
export function registerProcessControlDispatcher(server: any): void {
  server.tool(
    "prism_process_control",
    `Process Control & DOE dispatcher — cycle-to-cycle feedback control analysis, advanced SPC charting (EWMA, CUSUM), and Design of Experiments (factorial, fractional factorial, ANOVA).
Actions: ${ACTIONS.join(", ")}.
Params vary by action — pass relevant fields in params object.`,
    { action: z.enum(ACTIONS), params: z.record(z.string(), z.any()).optional() },
    async ({ action, params: rawParams = {} }: { action: typeof ACTIONS[number]; params?: Record<string, any> }) => {
      log.info(`[prism_process_control] Action: ${action}`);
      let result: any;
      try {
        let params = rawParams;
        try {
          const { normalizeParams } = await import("../../utils/paramNormalizer.js");
          params = normalizeParams(rawParams);
        } catch { /* normalizer not available */ }

        // Zod schema validation — CTC/SPC/DOE params
        const validation = validateActionParams(action, params, PROCESS_CONTROL_ACTION_SCHEMAS);
        if (!validation.valid) {
          return dispatcherError(
            `Invalid params for '${action}': ${validation.errorMessage}`,
            action,
            "prism_process_control"
          );
        }

        // PRE-CALCULATION SAFETY HOOKS — machine limit guard
        const hookCtx = {
          operation: action,
          target: { type: "calculation" as const, id: action, data: params },
          metadata: { dispatcher: "processControlDispatcher", action, params }
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
          case "ctc_analyze": {
            const mod = await getEngine("ctc");
            result = mod.analyzeCtCControl(params);
            break;
          }
          case "ctc_optimal_gain": {
            const mod = await getEngine("ctc");
            result = mod.findOptimalGain(params);
            break;
          }
          case "ctc_autocorrelation": {
            const mod = await getEngine("ctc");
            const data = params.data || params.measurements || [];
            const maxLag = params.maxLag ?? params.max_lag;
            result = mod.analyzeAutocorrelation(data, maxLag);
            break;
          }
          case "spc_ewma": {
            const mod = await getEngine("spc");
            result = mod.computeEWMA(params);
            break;
          }
          case "spc_cusum": {
            const mod = await getEngine("spc");
            result = mod.computeCUSUM(params);
            break;
          }
          case "doe_analyze": {
            const mod = await getEngine("doe");
            if (params.factors && params.runs) {
              result = mod.analyzeFactorial(params);
            } else if (params.factors || params.factor_names) {
              const names = params.factor_names || (params.factors as Array<{ name: string }>).map((f) => f.name);
              const fractional = params.fractional ?? false;
              result = fractional
                ? mod.generateFractionalFactorial(names)
                : mod.generateFullFactorial(names);
            } else {
              result = { error: "doe_analyze requires 'factors' (with 'runs' for analysis, or alone for design generation)" };
            }
            break;
          }
          // ─── WIRE-PROCESS-DIRECT-MS0/U-VICTOR-PROCESS-DIRECT (2026-05-26) ───
          case "doe_taguchi_compute": {
            const { doeTaguchEngine } = await import("../../engines/DOETaguchEngine.js");
            result = doeTaguchEngine.compute(params as any);
            break;
          }
          case "cusum_stream_analyze": {
            const { CUSUMEngine } = await import("../../engines/CUSUMEngine.js");
            const p = params as any;
            const values: number[] = Array.isArray(p?.values) ? p.values : (Array.isArray(p?.data) ? p.data : []);
            const config = p?.config ?? { target: 0, k: 0.5, h: 5, sigma: 1 };
            if (!values.length) {
              result = { error: "cusum_stream_analyze requires `values` or `data` (non-empty number array)" };
              break;
            }
            const engine = new CUSUMEngine(config);
            const trace = values.map((v: number) => engine.step(v));
            const alarmCount = trace.filter((p: any) => p?.alarm === true).length;
            result = { config, n: values.length, trace, alarm_count: alarmCount, final: trace[trace.length - 1] };
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
          log.warn(`[prism_process_control] Post-calculation hook error: ${postErr}`);
        }
      } catch (error: any) {
        if (error?.name === "SafetyBlockError") throw error;
        return dispatcherError(error, action, "prism_process_control");
      }
      return { content: [{ type: "text" as const, text: JSON.stringify(slimResponse(result)) }] };
    }
  );
}
