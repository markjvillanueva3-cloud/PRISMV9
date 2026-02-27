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
import { dispatcherError } from "../../utils/dispatcherMiddleware.js";

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
  "rtcp_calc", "singularity_check", "tilt_optimize",
  "work_envelope", "inverse_kin",
] as const;

export function registerFiveAxisDispatcher(server: any): void {
  server.tool(
    "prism_5axis",
    `5-Axis Kinematics dispatcher — SAFETY CRITICAL. RTCP compensation, singularity avoidance, tilt optimization, work envelope validation, inverse kinematics.
Actions: ${ACTIONS.join(", ")}.`,
    { action: z.enum(ACTIONS), params: z.record(z.any()).optional() },
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
          default:
            result = { error: `Unknown action: ${action}` };
        }
      } catch (error) {
        return dispatcherError(error, action, "prism_5axis");
      }
      return { content: [{ type: "text" as const, text: JSON.stringify(slimResponse(result)) }] };
    }
  );
}
