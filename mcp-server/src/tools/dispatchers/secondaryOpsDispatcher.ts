/**
 * prism_secondary_ops — Secondary Operations Dispatcher
 *
 * 2 actions: secondary_ops_pipeline, secondary_ops_plan
 *
 * Deburring (chamfer/back/brush), in-process probing (Renishaw G65 macros),
 * engraving/marking (text/serial/date/dot peen), wash/air blast cycles,
 * tool breakage checks, part flip, pallet change.
 *
 * @milestone PIPE-MS2
 */
import { z } from "zod";
import { log } from "../../utils/Logger.js";
import { dispatcherError, dispatcherResult, validateActionParams } from "../../utils/dispatcherMiddleware.js";
import { ACTION_SECONDARY_OPS_SCHEMAS } from "../../schemas/secondaryOpsActionSchemas.js";

let _secOps: any;

async function getEngine(): Promise<any> {
  return _secOps ??= (
    await import("../../engines/SecondaryOpsPipelineEngine.js")
  ).secondaryOpsPipelineEngine;
}

const ACTIONS = [
  "secondary_ops_pipeline",
  "secondary_ops_plan",
] as const;

const actionEnum = z.enum(ACTIONS);

export function registerSecondaryOpsDispatcher(server: any): void {
  server.tool(
    "prism_secondary_ops",
    `Secondary Operations — deburring, probing, engraving, washing, tool checks.
Chamfer/back/brush deburr, Renishaw-style probe macros (bore/boss/web/surface/datum),
text/serial/date engraving, dot peen, wash/air blast, tool breakage detection, part flip, pallet change.
Actions: ${ACTIONS.join(", ")}.
Params: operations[] (id, type, chamfer_size_mm, probe_axis, nominal_mm, tolerance_mm, text, etc).`,
    {
      action: actionEnum,
      params: z.record(z.string(), z.any()).optional(),
    },
    async (args: any) => {
      const { action, params = {} } = args;
      log.info(`[prism_secondary_ops] action=${action}`);

      const validation = validateActionParams(action, params, ACTION_SECONDARY_OPS_SCHEMAS);
      if (!validation.valid) {
        return dispatcherError(`Invalid params for '${action}': ${validation.errorMessage}`, action, "prism_secondary_ops");
      }

      try {
        const eng = await getEngine();
        const result = eng.calculate(action, params);
        return dispatcherResult(result);
      } catch (err: any) {
        return dispatcherError(err, action, "prism_secondary_ops");
      }
    }
  );
}
