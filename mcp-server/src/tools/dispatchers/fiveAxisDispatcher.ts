/**
 * prism_5axis — 5-Axis Kinematics Dispatcher
 * *** SAFETY CRITICAL *** — singularity/collision/RTCP errors cause crashes
 *
 * 5 actions: rtcp_calc, singularity_check, tilt_optimize, work_envelope, inverse_kin
 *
 * Engine dependencies: RTCP_CompensationEngine, SingularityAvoidanceEngine,
 *   TiltAngleOptimizationEngine, WorkEnvelopeValidatorEngine, InverseKinematicsSolverEngine
 */
import { z } from "zod";
import { log } from "../../utils/Logger.js";
import { slimResponse } from "../../utils/responseSlimmer.js";
import { validateActionParams, dispatcherError } from "../../utils/dispatcherMiddleware.js";
import { ACTION_FIVEAXIS_SCHEMAS } from "../../schemas/fiveAxisActionSchemas.js";
import { hookExecutor } from "../../engines/HookExecutor.js";

let _rtcp: any, _sing: any, _tilt: any, _envelope: any, _ik: any;
async function getEngine(name: string): Promise<any> {
  switch (name) {
    case "rtcp": return _rtcp ??= (await import("../../engines/RTCP_CompensationEngine.js")).rtcpCompensationEngine;
    case "sing": return _sing ??= (await import("../../engines/SingularityAvoidanceEngine.js")).singularityAvoidanceEngine;
    case "tilt": return _tilt ??= (await import("../../engines/TiltAngleOptimizationEngine.js")).tiltAngleOptimizationEngine;
    case "envelope": return _envelope ??= (await import("../../engines/WorkEnvelopeValidatorEngine.js")).workEnvelopeValidatorEngine;
    case "ik": return _ik ??= (await import("../../engines/InverseKinematicsSolverEngine.js")).inverseKinematicsSolverEngine;
    default: throw new Error(`Unknown 5-axis engine: ${name}`);
  }
}

const ACTIONS = [
  // Core 5-Axis Kinematics (5 actions)
  "rtcp_calc", "singularity_check", "tilt_optimize",
  "work_envelope", "inverse_kin",
  // MILL-HARD-MS2: 4th Axis (2 actions)
  "fourth_axis_index", "fourth_axis_decide",
  // MILL-HARD-MS3-MS8: 5-Axis Advanced (12 actions)
  "five_axis_decide", "five_axis_toolpath_synthesize",
  "five_axis_deep_learn", "five_axis_cad_template",
  "five_axis_orchestrate", "five_axis_orchestrate_sequence",
  "five_axis_ai_nl", "five_axis_ai_predict_life",
  "five_axis_ai_score", "five_axis_ai_explain",
  "five_axis_ai_troubleshoot", "five_axis_ai_rl",
] as const;

/** Registers five axis dispatcher.
 * @param server - MCP server instance
  * @returns void
 */
export function registerFiveAxisDispatcher(server: any): void {
  server.tool(
    "prism_5axis",
    `5-Axis Kinematics dispatcher — SAFETY CRITICAL. RTCP compensation, singularity avoidance, tilt optimization, work envelope validation, inverse kinematics.
Actions: ${ACTIONS.join(", ")}.`,
    { action: z.enum(ACTIONS), params: z.record(z.string(), z.any()).optional() },
    async ({ action, params: rawParams = {} }: { action: typeof ACTIONS[number]; params?: Record<string, any> }) => {
      log.info(`[prism_5axis] Action: ${action}`);
      let result: any;
      try {
        // H1-MS2: Auto-normalize snake_case → camelCase params
        let params = rawParams;
        try {
          const { normalizeParams } = await import("../../utils/paramNormalizer.js");
          params = normalizeParams(rawParams);
        } catch { /* normalizer not available */ }

        // SYS-MS6: Validate params against per-action Zod schema (STRICT — safety-critical)
        const validation = validateActionParams(action, params, ACTION_FIVEAXIS_SCHEMAS);
        if (!validation.valid) {
          return dispatcherError(
            `Invalid params for '${action}': ${validation.errorMessage}`,
            action,
            "prism_5axis"
          );
        }

        // PRE-CALCULATION SAFETY HOOKS — singularity, RTCP, work envelope blocking
        const hookCtx = {
          operation: action,
          target: { type: "calculation" as const, id: action, data: params },
          metadata: { dispatcher: "fiveAxisDispatcher", action, params }
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
          case "rtcp_calc": {
            const engine = await getEngine("rtcp");
            result = engine.compensate?.(params) ?? engine.calculate?.(params) ?? engine.compute?.(params) ?? { error: "RTCP method not found" };
            break;
          }
          case "singularity_check": {
            const engine = await getEngine("sing");
            result = engine.detect?.(params) ?? engine.check?.(params) ?? engine.compute?.(params) ?? { error: "Singularity method not found" };
            break;
          }
          case "tilt_optimize": {
            const engine = await getEngine("tilt");
            result = engine.optimize?.(params) ?? engine.calculate?.(params) ?? engine.compute?.(params) ?? { error: "TiltAngle method not found" };
            break;
          }
          case "work_envelope": {
            const engine = await getEngine("envelope");
            result = engine.validate?.(params) ?? engine.check?.(params) ?? engine.compute?.(params) ?? { error: "WorkEnvelope method not found" };
            break;
          }
          case "inverse_kin": {
            const engine = await getEngine("ik");
            result = engine.solve?.(params) ?? engine.calculate?.(params) ?? engine.compute?.(params) ?? { error: "IK method not found" };
            break;
          }

          // MILL-HARD-MS2: 4th Axis Indexing
          case "fourth_axis_index": {
            const { fourthAxisIndexingEngine } = await import("../../engines/FourthAxisIndexingEngine.js");
            result = fourthAxisIndexingEngine.computeIndexing(params as any);
            break;
          }
          case "fourth_axis_decide": {
            const { fourthAxisDecisionEngine } = await import("../../engines/FourthAxisDecisionEngine.js");
            result = fourthAxisDecisionEngine.decide(params as any);
            break;
          }

          // MILL-HARD-MS3: 5-Axis Decision
          case "five_axis_decide": {
            const { fiveAxisDecisionEngine } = await import("../../engines/FiveAxisDecisionEngine.js");
            result = fiveAxisDecisionEngine.decide(params as any);
            break;
          }

          // MILL-HARD-MS4: Toolpath Synthesis
          case "five_axis_toolpath_synthesize": {
            const { fiveAxisToolpathSynthesisEngine } = await import("../../engines/FiveAxisToolpathSynthesisEngine.js");
            result = fiveAxisToolpathSynthesisEngine.synthesize(params as any);
            break;
          }

          // MILL-HARD-MS5: Deep Learning
          case "five_axis_deep_learn": {
            const { fiveAxisDeepLearningEngine } = await import("../../engines/FiveAxisDeepLearningEngine.js");
            result = fiveAxisDeepLearningEngine.findSimilar?.(params as any) ?? fiveAxisDeepLearningEngine.learn?.(params as any);
            break;
          }

          // MILL-HARD-MS6: CAD Templates
          case "five_axis_cad_template": {
            const { fiveAxisCADTemplateEngine } = await import("../../engines/FiveAxisCADTemplateEngine.js");
            result = fiveAxisCADTemplateEngine.generateTemplate?.(params as any) ?? fiveAxisCADTemplateEngine.matchTemplate?.(params as any);
            break;
          }

          // MILL-HARD-MS7: Orchestration
          case "five_axis_orchestrate": {
            const { fiveAxisOrchestrationEngine } = await import("../../engines/FiveAxisOrchestrationEngine.js");
            result = fiveAxisOrchestrationEngine.orchestrate?.(params as any) ?? fiveAxisOrchestrationEngine.plan?.(params as any);
            break;
          }
          case "five_axis_orchestrate_sequence": {
            const { fiveAxisOrchestrationEngine } = await import("../../engines/FiveAxisOrchestrationEngine.js");
            result = fiveAxisOrchestrationEngine.generateSequence?.(params as any);
            break;
          }

          // MILL-HARD-MS8: AI Ultra-Intelligence
          case "five_axis_ai_nl": {
            const { fiveAxisAIUltraIntelligenceEngine } = await import("../../engines/FiveAxisAIUltraIntelligenceEngine.js");
            result = fiveAxisAIUltraIntelligenceEngine.processNL?.(params as any);
            break;
          }
          case "five_axis_ai_predict_life": {
            const { fiveAxisAIUltraIntelligenceEngine } = await import("../../engines/FiveAxisAIUltraIntelligenceEngine.js");
            result = fiveAxisAIUltraIntelligenceEngine.predictToolLife?.(params as any);
            break;
          }
          case "five_axis_ai_score": {
            const { fiveAxisAIUltraIntelligenceEngine } = await import("../../engines/FiveAxisAIUltraIntelligenceEngine.js");
            result = fiveAxisAIUltraIntelligenceEngine.scoreToolpath?.(params as any);
            break;
          }
          case "five_axis_ai_explain": {
            const { fiveAxisAIUltraIntelligenceEngine } = await import("../../engines/FiveAxisAIUltraIntelligenceEngine.js");
            result = fiveAxisAIUltraIntelligenceEngine.explain?.(params as any);
            break;
          }
          case "five_axis_ai_troubleshoot": {
            const { fiveAxisAIUltraIntelligenceEngine } = await import("../../engines/FiveAxisAIUltraIntelligenceEngine.js");
            result = fiveAxisAIUltraIntelligenceEngine.troubleshoot?.(params as any);
            break;
          }
          case "five_axis_ai_rl": {
            const { fiveAxisAIUltraIntelligenceEngine } = await import("../../engines/FiveAxisAIUltraIntelligenceEngine.js");
            result = fiveAxisAIUltraIntelligenceEngine.learnFromOutcome?.(params as any);
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
          log.warn(`[prism_5axis] Post-calculation hook error: ${postErr}`);
        }
      } catch (error: any) {
        if (error?.name === "SafetyBlockError") throw error;
        return dispatcherError(error, action, "prism_5axis");
      }
      return { content: [{ type: "text" as const, text: JSON.stringify(slimResponse(result)) }] };
    }
  );
}
