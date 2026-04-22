/**
 * prism_multiaxis_program — Multi-Axis Print-to-Program Dispatcher
 *
 * 2 actions across 1 engine:
 *   MultiAxisPrintToProgramEngine (2): multiaxis_print_to_program, multiaxis_process_plan
 *
 * Generates CNC programs for 3+2 indexed and 5-axis simultaneous machining.
 * Supports impeller blades, ports, undercuts, swept surfaces, angled features.
 *
 * @milestone PIPE-MS2
 */
import { z } from "zod";
import { log } from "../../utils/Logger.js";
import { dispatcherError, dispatcherResult, validateActionParams } from "../../utils/dispatcherMiddleware.js";
import { ACTION_MULTIAXIS_PROGRAM_SCHEMAS } from "../../schemas/multiAxisProgramActionSchemas.js";

// Lazy engine cache
let _multiAxisProg: any;

async function getEngine(): Promise<any> {
  return _multiAxisProg ??= (
    await import("../../engines/MultiAxisPrintToProgramEngine.js")
  ).multiAxisPrintToProgramEngine;
}

const ACTIONS = [
  "multiaxis_print_to_program",
  "multiaxis_process_plan",
] as const;

const actionEnum = z.enum(ACTIONS);

/**
 * Registers multi-axis program dispatcher.
 * @param server - MCP server instance
 */
export function registerMultiAxisProgramDispatcher(server: any): void {
  server.tool(
    "prism_multiaxis_program",
    `Multi-Axis Print-to-Program — generates CNC programs for 3+2 and 5-axis simultaneous machining.
Supports: impeller/blisk blades, ports, undercuts, dovetails, swept/ruled surfaces, angled holes/pockets.
G68.2 tilted work plane, G43.4/G43.5 TCP, singularity detection, rotary axis limit checks.
Actions: ${ACTIONS.join(", ")}.
Params: material, features[] (type, orientation {A_deg,B_deg,C_deg}, depth_mm, etc), machine_type, has_rtcp.`,
    {
      action: actionEnum,
      params: z.record(z.string(), z.any()).optional(),
    },
    async (args: any) => {
      const { action, params = {} } = args;
      log.info(`[prism_multiaxis_program] action=${action}`);

      const validation = validateActionParams(action, params, ACTION_MULTIAXIS_PROGRAM_SCHEMAS);
      if (!validation.valid) {
        return dispatcherError(
          `Invalid params for '${action}': ${validation.errorMessage}`,
          action,
          "prism_multiaxis_program"
        );
      }

      try {
        switch (action) {
          case "multiaxis_print_to_program": {
            const eng = await getEngine();
            const maResult = eng.calculate(action, params) as any;
            // PIPELINE-VAR U-PV03a: Auto-chain PostProcessor for per-block S/F optimization
            if (maResult?.program_text && maResult.program_text.length > 0) {
              try {
                const { postProcessorPipelineEngine } = await import("../../engines/PostProcessorPipelineEngine.js");
                const ppOutput = await postProcessorPipelineEngine.process({
                  gcode: maResult.program_text,
                  material: {
                    name: (params as any)?.material?.material_name || maResult.material,
                    iso_group: (params as any)?.material?.iso_group,
                  },
                  machine: {
                    name: (params as any)?.machine_model || "generic-5axis",
                  },
                  optimization_target: (params as any)?.optimization_target || "balanced",
                });
                if (ppOutput?.output_gcode) {
                  maResult.program_text = ppOutput.output_gcode;
                  maResult.postprocessor_applied = true;
                }
              } catch {
                // PostProcessor is non-blocking — fallback to original G-code
              }
            }
            return dispatcherResult(maResult);
          }
          case "multiaxis_process_plan": {
            const eng = await getEngine();
            const result = eng.calculate(action, params);
            return dispatcherResult(result);
          }
          default:
            return dispatcherError(`Unknown action: ${action}`, action, "prism_multiaxis_program");
        }
      } catch (err: any) {
        return dispatcherError(err, action, "prism_multiaxis_program");
      }
    }
  );
}
