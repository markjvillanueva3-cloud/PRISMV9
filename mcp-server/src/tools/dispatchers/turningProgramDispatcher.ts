/**
 * prism_turning_program — Turning Print-to-Program Dispatcher
 *
 * 2 actions across 1 engine:
 *   TurningPrintToProgramEngine (2): turning_print_to_program, turning_process_plan
 *
 * Generates complete CNC lathe programs from feature descriptions.
 * Covers OD/ID profiling, facing, grooving, threading, boring, parting.
 *
 * @milestone PIPE-MS2
 */
import { z } from "zod";
import { log } from "../../utils/Logger.js";
import { dispatcherError, dispatcherResult, validateActionParams } from "../../utils/dispatcherMiddleware.js";
import { ACTION_TURNING_PROGRAM_SCHEMAS } from "../../schemas/turningProgramActionSchemas.js";

// Lazy engine cache
let _turningProg: any;

async function getEngine(): Promise<any> {
  return _turningProg ??= (
    await import("../../engines/TurningPrintToProgramEngine.js")
  ).turningPrintToProgramEngine;
}

const ACTIONS = [
  "turning_print_to_program",
  "turning_process_plan",
] as const;

const actionEnum = z.enum(ACTIONS);

/**
 * Registers turning program dispatcher.
 * @param server - MCP server instance
 */
export function registerTurningProgramDispatcher(server: any): void {
  server.tool(
    "prism_turning_program",
    `Turning Print-to-Program — generates complete CNC lathe programs from part feature descriptions.
Covers OD/ID profiling, facing, grooving, threading, boring, parting, taper turning.
Inline Kienzle/Taylor physics for cutting forces, power, tool life, surface finish.
Actions: ${ACTIONS.join(", ")}.
Params: material (iso_group, material_name), bar_stock_od_mm, part_length_mm, features[] (type, od_mm, length_mm, etc).`,
    {
      action: actionEnum,
      params: z.record(z.string(), z.any()).optional(),
    },
    async (args: any) => {
      const { action, params = {} } = args;
      log.info(`[prism_turning_program] action=${action}`);

      const validation = validateActionParams(action, params, ACTION_TURNING_PROGRAM_SCHEMAS);
      if (!validation.valid) {
        return dispatcherError(
          `Invalid params for '${action}': ${validation.errorMessage}`,
          action,
          "prism_turning_program"
        );
      }

      try {
        switch (action) {
          case "turning_print_to_program":
          case "turning_process_plan": {
            const eng = await getEngine();
            const result = eng.calculate(action, params);
            return dispatcherResult(result);
          }
          default:
            return dispatcherError(`Unknown action: ${action}`, action, "prism_turning_program");
        }
      } catch (err: any) {
        return dispatcherError(err, action, "prism_turning_program");
      }
    }
  );
}
