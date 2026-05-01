/**
 * prism_threading_pipeline — Threading Pipeline Dispatcher
 *
 * 3 actions across 1 engine:
 *   ThreadingPipelineEngine: threading_pipeline, threading_plan, threading_pass_schedule
 *
 * Single-point turning threads (G76/G92), thread milling (helical G02/G03),
 * rigid tapping (G84), pipe threads (NPT/BSP), multi-start, ACME/trapezoidal.
 * Constant chip area pass scheduling, infeed strategy selection.
 *
 * @milestone PIPE-MS2
 */
import { z } from "zod";
import { log } from "../../utils/Logger.js";
import { dispatcherError, dispatcherResult, validateActionParams } from "../../utils/dispatcherMiddleware.js";
import { ACTION_THREADING_PIPELINE_SCHEMAS } from "../../schemas/threadingPipelineActionSchemas.js";

let _threading: any;

async function getEngine(): Promise<any> {
  return _threading ??= (
    await import("../../engines/ThreadingPipelineEngine.js")
  ).threadingPipelineEngine;
}

const ACTIONS = [
  "threading_pipeline",
  "threading_plan",
  "threading_pass_schedule",
] as const;

const actionEnum = z.enum(ACTIONS);

export function registerThreadingPipelineDispatcher(server: any): void {
  server.tool(
    "prism_threading_pipeline",
    `Threading Pipeline — complete thread programming for lathe and mill.
Single-point G76 (radial/modified-flank/alternating infeed), thread milling (helical interpolation),
rigid tapping G84, roll form tapping. Supports: metric, UNC/UNF, BSP, NPT, ACME, trapezoidal,
multi-start. Constant chip area pass scheduling from Sandvik methodology.
Actions: ${ACTIONS.join(", ")}.
Params: material, threads[] (type, method, major_diameter_mm, pitch_mm, length_mm, internal, hand).`,
    {
      action: actionEnum,
      params: z.record(z.string(), z.any()).optional(),
    },
    async (args: any) => {
      const { action, params = {} } = args;
      log.info(`[prism_threading_pipeline] action=${action}`);

      const validation = validateActionParams(action, params, ACTION_THREADING_PIPELINE_SCHEMAS);
      if (!validation.valid) {
        return dispatcherError(`Invalid params for '${action}': ${validation.errorMessage}`, action, "prism_threading_pipeline");
      }

      try {
        const eng = await getEngine();
        const result = eng.calculate(action, params);
        return dispatcherResult(result);
      } catch (err: any) {
        return dispatcherError(err, action, "prism_threading_pipeline");
      }
    }
  );
}
