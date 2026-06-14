/**
 * prism_multi_op — Multi-Operation Orchestration Dispatcher
 *
 * 7 actions: rest_analyze, rest_quick_check, operation_sequence,
 *   transition_plan, transition_batch, adaptive_refine, multi_setup_plan
 *
 * Engine dependencies: RestMachiningEngine, OperationSequencerEngine,
 *   TransitionPathEngine, AdaptiveRefinementEngine, MultiSetupPlannerEngine
 * Milestone: CAMK-MS3
 */
import { z } from "zod";
import { log } from "../../utils/Logger.js";
import { slimResponse } from "../../utils/responseSlimmer.js";
import { dispatcherError, validateActionParams } from "../../utils/dispatcherMiddleware.js";
import { MULTI_OP_ACTION_SCHEMAS } from "../../schemas/multiOpActionSchemas.js";
import { hookExecutor } from "../../engines/HookExecutor.js";

let _rest: any, _seq: any, _trans: any, _refine: any, _setup: any;
async function getEngine(name: string): Promise<any> {
  switch (name) {
    case "rest": return _rest ??= (await import("../../engines/RestMachiningEngine.js")).restMachiningEngine;
    case "seq": return _seq ??= (await import("../../engines/OperationSequencerEngine.js")).operationSequencerEngine;
    case "trans": return _trans ??= (await import("../../engines/TransitionPathEngine.js")).transitionPathEngine;
    case "refine": return _refine ??= (await import("../../engines/AdaptiveRefinementEngine.js")).adaptiveRefinementEngine;
    case "setup": return _setup ??= (await import("../../engines/MultiSetupPlannerEngine.js")).multiSetupPlannerEngine;
    default: throw new Error(`Unknown multi-op engine: ${name}`);
  }
}

const ACTIONS = [
  "rest_analyze", "rest_quick_check",
  "operation_sequence",
  "transition_plan", "transition_batch",
  "adaptive_refine",
  "multi_setup_plan",
  // WIRE-MULTIOP-DIRECT-MS0/U-VICTOR-MULTIOP-DIRECT (slot:victor, 2026-05-26)
  // SwissPartTransferSequenceEngine.generate + ActionSequenceExtractorEngine.extractFromTip
  "swiss_part_transfer_sequence", "action_sequence_extract",
] as const;

/** Registers multi-operation orchestration dispatcher.
 * @param server - MCP server instance
 * @returns void
 */
export function registerMultiOpDispatcher(server: any): void {
  server.tool(
    "prism_multi_op",
    `Multi-Operation Orchestration dispatcher — rest machining analysis, operation sequencing, transition path planning, adaptive refinement, multi-setup planning.
Actions: ${ACTIONS.join(", ")}.
Params vary by action — pass relevant fields in params object.`,
    { action: z.enum(ACTIONS), params: z.record(z.string(), z.any()).optional() },
    async ({ action, params: rawParams = {} }: { action: typeof ACTIONS[number]; params?: Record<string, any> }) => {
      log.info(`[prism_multi_op] Action: ${action}`);
      let result: any;
      try {
        let params = rawParams;
        try {
          const { normalizeParams } = await import("../../utils/paramNormalizer.js");
          params = normalizeParams(rawParams);
        } catch { /* normalizer not available */ }

        const validation = validateActionParams(action, params, MULTI_OP_ACTION_SCHEMAS);
        if (!validation.valid) {
          return dispatcherError(
            `Invalid params for '${action}': ${validation.errorMessage}`,
            action,
            "prism_multi_op"
          );
        }

        // PRE-CALCULATION SAFETY HOOKS
        const hookCtx = {
          operation: action,
          target: { type: "calculation" as const, id: action, data: params },
          metadata: { dispatcher: "multiOpDispatcher", action, params }
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
          case "rest_analyze": {
            const eng = await getEngine("rest");
            result = eng.analyze(params);
            break;
          }
          case "rest_quick_check": {
            const eng = await getEngine("rest");
            result = eng.quickCheck(params);
            break;
          }
          case "operation_sequence": {
            const eng = await getEngine("seq");
            result = eng.sequence(params);
            break;
          }
          case "transition_plan": {
            const eng = await getEngine("trans");
            result = eng.plan(params);
            break;
          }
          case "transition_batch": {
            const eng = await getEngine("trans");
            result = eng.planBatch(params);
            break;
          }
          case "adaptive_refine": {
            const eng = await getEngine("refine");
            result = eng.refine(params);
            break;
          }
          case "multi_setup_plan": {
            const eng = await getEngine("setup");
            result = eng.plan(params);
            break;
          }
          // ─── WIRE-MULTIOP-DIRECT-MS0/U-VICTOR-MULTIOP-DIRECT (2026-05-26) ───
          case "swiss_part_transfer_sequence": {
            const { swissPartTransferSequenceEngine } = await import("../../engines/SwissPartTransferSequenceEngine.js");
            result = swissPartTransferSequenceEngine.generate(params as any);
            break;
          }
          case "action_sequence_extract": {
            const { ActionSequenceExtractorEngine } = await import("../../engines/ActionSequenceExtractorEngine.js");
            const p = params as any;
            if (Array.isArray(p?.tips)) {
              result = ActionSequenceExtractorEngine.extractBatch(p.tips, p?.options);
            } else {
              result = ActionSequenceExtractorEngine.extractFromTip(p?.tip ?? p, p?.options);
            }
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
          log.warn(`[prism_multi_op] Post-calculation hook error: ${postErr}`);
        }
      } catch (error: any) {
        if (error?.name === "SafetyBlockError") throw error;
        return dispatcherError(error, action, "prism_multi_op");
      }
      return { content: [{ type: "text" as const, text: JSON.stringify(slimResponse(result)) }] };
    }
  );
  log.info("Registered: prism_multi_op dispatcher (7 actions)");
}
