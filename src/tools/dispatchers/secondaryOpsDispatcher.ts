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
  "suggest_finishing",
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
        let result: any;
        if (action === "suggest_finishing") {
          // Auto-suggest honing/burnishing/polishing when tolerance/finish exceeds primary op
          const tolerance_mm = params.tolerance_mm ?? 0.05;
          const target_Ra_um = params.target_Ra_um ?? 0.8;
          const bore_diameter_mm = params.bore_diameter_mm;
          const suggestions: Array<{ process: string; engine: string; reason: string }> = [];

          // Honing: bore finishing at Ra < 0.4µm or tolerance < ±0.01mm
          if (bore_diameter_mm && (target_Ra_um <= 0.4 || tolerance_mm <= 0.01)) {
            const { honingProcessEngine } = await import("../../engines/HoningProcessEngine.js");
            const design = honingProcessEngine.designHoningProcess({
              bore_diameter_mm, bore_length_mm: params.bore_length_mm ?? bore_diameter_mm * 2,
              material: params.material ?? "carbon_steel",
              initial_Ra_um: params.current_Ra_um ?? 1.6, target_Ra_um,
            });
            suggestions.push({
              process: "honing", engine: "HoningProcessEngine",
              reason: `Bore ±${tolerance_mm}mm / Ra ${target_Ra_um}µm exceeds turning/grinding capability. ` +
                `Estimated cycle: ${design.expected_cycle_time_sec}s, stone: ${design.stone_spec}`,
            });
          }

          // Burnishing: surface hardening + finish improvement to Ra < 0.2µm
          if (target_Ra_um <= 0.2) {
            const { burnishingPolishingEngine } = await import("../../engines/BurnishingPolishingEngine.js");
            const pred = burnishingPolishingEngine.predictBurnishing({
              process: "ball", material: params.material ?? "carbon_steel",
              initial_Ra_um: params.current_Ra_um ?? 0.8,
              burnishing_force_N: 200, feed_mm_per_rev: 0.1, speed_mpm: 50,
            });
            suggestions.push({
              process: "burnishing", engine: "BurnishingPolishingEngine",
              reason: `Target Ra ${target_Ra_um}µm needs burnishing. ` +
                `Predicted final Ra: ${pred.final_Ra_um.toFixed(3)}µm, +${pred.hardness_increase_HRC.toFixed(1)} HRC`,
            });
          }

          // Polishing: mirror finish Ra < 0.05µm
          if (target_Ra_um <= 0.05) {
            suggestions.push({
              process: "polishing", engine: "BurnishingPolishingEngine",
              reason: `Mirror finish Ra ${target_Ra_um}µm requires multi-stage polishing (grit progression)`,
            });
          }

          result = {
            tolerance_mm, target_Ra_um, suggestions,
            recommendation: suggestions.length > 0
              ? `${suggestions.length} finishing process(es) recommended`
              : "Primary operation sufficient — no secondary finishing needed",
          };
        } else {
          const eng = await getEngine();
          result = eng.calculate(action, params);
        }
        return dispatcherResult(result);
      } catch (err: any) {
        return dispatcherError(err, action, "prism_secondary_ops");
      }
    }
  );
}
