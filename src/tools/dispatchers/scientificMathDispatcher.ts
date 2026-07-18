/**
 * prism_scientific_math — Scientific Mathematics Dispatcher
 *
 * 5 actions: stochastic_simulate, information_entropy, optimal_control,
 *   graph_solve, fuzzy_neural
 *
 * Engine dependencies: StochasticProcessEngine, InformationTheoryEngine,
 *   OptimalControlEngine, GraphTheoryEngine, FuzzyNeuralHybridEngine
 * Milestone: SCI-MS3
 */
import { z } from "zod";
import { log } from "../../utils/Logger.js";
import { slimResponse } from "../../utils/responseSlimmer.js";
import { dispatcherError, validateActionParams } from "../../utils/dispatcherMiddleware.js";
import { SCIENTIFIC_MATH_ACTION_SCHEMAS } from "../../schemas/scientificMathActionSchemas.js";
import { hookExecutor } from "../../engines/HookExecutor.js";

let _stoch: any, _info: any, _ctrl: any, _graph: any, _fuzzy: any;
async function getEngine(name: string): Promise<any> {
  switch (name) {
    case "stoch": return _stoch ??= (await import("../../engines/StochasticProcessEngine.js")).stochasticProcessEngine;
    case "info": return _info ??= (await import("../../engines/InformationTheoryEngine.js")).informationTheoryEngine;
    case "ctrl": return _ctrl ??= (await import("../../engines/OptimalControlEngine.js")).optimalControlEngine;
    case "graph": return _graph ??= (await import("../../engines/GraphTheoryEngine.js")).graphTheoryEngine;
    case "fuzzy": return _fuzzy ??= (await import("../../engines/FuzzyNeuralHybridEngine.js")).fuzzyNeuralHybridEngine;
    default: throw new Error(`Unknown scientific math engine: ${name}`);
  }
}

const ACTIONS = [
  "stochastic_simulate", "information_entropy",
  "optimal_control", "graph_solve", "fuzzy_neural",
] as const;

/** Registers scientific math dispatcher.
 * @param server - MCP server instance
 * @returns void
 */
export function registerScientificMathDispatcher(server: any): void {
  server.tool(
    "prism_scientific_math",
    `Scientific Mathematics dispatcher — stochastic processes (Markov/Wiener/Poisson/HMM), information theory (Shannon/mutual info/KL/transfer entropy), optimal control (Pontryagin/LQR/HJB), graph theory (topo sort/critical path/MST/TSP), fuzzy-neural hybrid (ANFIS/fuzzy Taguchi/fuzzy AHP).
Actions: ${ACTIONS.join(", ")}.
Params vary by action — pass relevant fields in params object.`,
    { action: z.enum(ACTIONS), params: z.record(z.string(), z.any()).optional() },
    async ({ action, params: rawParams = {} }: { action: typeof ACTIONS[number]; params?: Record<string, any> }) => {
      log.info(`[prism_scientific_math] Action: ${action}`);
      let result: any;
      try {
        let params = rawParams;
        try {
          const { normalizeParams } = await import("../../utils/paramNormalizer.js");
          params = normalizeParams(rawParams);
        } catch { /* normalizer not available */ }

        const validation = validateActionParams(action, params, SCIENTIFIC_MATH_ACTION_SCHEMAS);
        if (!validation.valid) {
          return dispatcherError(
            `Invalid params for '${action}': ${validation.errorMessage}`,
            action,
            "prism_scientific_math"
          );
        }

        // PRE-CALCULATION SAFETY HOOKS
        const hookCtx = {
          operation: action,
          target: { type: "calculation" as const, id: action, data: params },
          metadata: { dispatcher: "scientificMathDispatcher", action, params }
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
          case "stochastic_simulate": {
            const eng = await getEngine("stoch");
            result = eng.simulate(params);
            break;
          }
          case "information_entropy": {
            const eng = await getEngine("info");
            result = eng.analyze(params);
            break;
          }
          case "optimal_control": {
            const eng = await getEngine("ctrl");
            result = eng.optimize(params);
            break;
          }
          case "graph_solve": {
            const eng = await getEngine("graph");
            result = eng.solve(params);
            break;
          }
          case "fuzzy_neural": {
            const eng = await getEngine("fuzzy");
            result = eng.compute(params);
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
          log.warn(`[prism_scientific_math] Post-calculation hook error: ${postErr}`);
        }
      } catch (error: any) {
        if (error?.name === "SafetyBlockError") throw error;
        return dispatcherError(error, action, "prism_scientific_math");
      }
      return { content: [{ type: "text" as const, text: JSON.stringify(slimResponse(result)) }] };
    }
  );
  log.info("Registered: prism_scientific_math dispatcher (5 actions)");
}
