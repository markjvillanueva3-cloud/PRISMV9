/**
 * prism_hole_pattern — Hole Pattern Pipeline Dispatcher
 *
 * 3 actions across 1 engine:
 *   HolePatternPipelineEngine (3): hole_pattern_program, hole_pattern_detect, hole_pattern_optimize
 *
 * Recognizes hole patterns (bolt circles, grids, linear rows), optimizes
 * drill sequence via nearest-neighbor TSP, plans multi-stage operations
 * (spot, drill, ream, tap, counterbore), generates G-code with canned cycles.
 *
 * @milestone PIPE-MS2
 */
import { z } from "zod";
import { log } from "../../utils/Logger.js";
import { dispatcherError, dispatcherResult, validateActionParams } from "../../utils/dispatcherMiddleware.js";
import { ACTION_HOLE_PATTERN_SCHEMAS } from "../../schemas/holePatternActionSchemas.js";

// Lazy engine cache
let _holePattern: any;

async function getEngine(): Promise<any> {
  return _holePattern ??= (
    await import("../../engines/HolePatternPipelineEngine.js")
  ).holePatternPipelineEngine;
}

const ACTIONS = [
  "hole_pattern_program",
  "hole_pattern_detect",
  "hole_pattern_optimize",
] as const;

const actionEnum = z.enum(ACTIONS);

/**
 * Registers hole pattern pipeline dispatcher.
 * @param server - MCP server instance
 */
export function registerHolePatternDispatcher(server: any): void {
  server.tool(
    "prism_hole_pattern",
    `Hole Pattern Pipeline — pattern recognition, sequence optimization, and G-code generation for drilling operations.
Detects bolt circles, rectangular grids, linear rows. TSP nearest-neighbor optimization.
Canned cycles: G81/G73/G83 drill, G82 counterbore, G84 rigid tap, G85 ream.
Actions: ${ACTIONS.join(", ")}.
Params: material, holes[] (id, type, x_mm, y_mm, diameter_mm, depth_mm, tap_pitch_mm, etc).`,
    {
      action: actionEnum,
      params: z.record(z.string(), z.any()).optional(),
    },
    async (args: any) => {
      const { action, params = {} } = args;
      log.info(`[prism_hole_pattern] action=${action}`);

      const validation = validateActionParams(action, params, ACTION_HOLE_PATTERN_SCHEMAS);
      if (!validation.valid) {
        return dispatcherError(
          `Invalid params for '${action}': ${validation.errorMessage}`,
          action,
          "prism_hole_pattern"
        );
      }

      try {
        switch (action) {
          case "hole_pattern_program":
          case "hole_pattern_detect":
          case "hole_pattern_optimize": {
            const eng = await getEngine();
            const result = eng.calculate(action, params);
            return dispatcherResult(result);
          }
          default:
            return dispatcherError(`Unknown action: ${action}`, action, "prism_hole_pattern");
        }
      } catch (err: any) {
        return dispatcherError(err, action, "prism_hole_pattern");
      }
    }
  );
}
