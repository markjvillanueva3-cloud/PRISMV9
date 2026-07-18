/**
 * prism_machining_kb — Machining Knowledge Base Dispatcher
 *
 * 14 actions across 1 engine:
 *   MachiningKnowledgeBaseEngine: Kienzle/Taylor constants, speed/feed tables,
 *   tap drill charts, peck rules, sequencing rules, surface finish prediction,
 *   coolant selection, threading strategies, safe-start blocks.
 *
 * Canonical source of truth for all PRISM physics and machining data.
 * Every constant cites its source (Sandvik, Kennametal, ISCAR, Walter, Haas, Machinery's Handbook).
 *
 * @milestone PIPE-MS2
 */
import { z } from "zod";
import { log } from "../../utils/Logger.js";
import { dispatcherError, dispatcherResult, validateActionParams } from "../../utils/dispatcherMiddleware.js";
import { ACTION_MACHINING_KB_SCHEMAS } from "../../schemas/machiningKnowledgeBaseActionSchemas.js";

let _kb: any;

async function getEngine(): Promise<any> {
  return _kb ??= (
    await import("../../engines/MachiningKnowledgeBaseEngine.js")
  ).machiningKnowledgeBaseEngine;
}

const ACTIONS = [
  "kb_lookup_kienzle", "kb_lookup_taylor", "kb_lookup_speed",
  "kb_lookup_tap_drill", "kb_calc_tap_drill", "kb_lookup_chip_load",
  "kb_lookup_peck_rule", "kb_predict_surface_finish",
  "kb_get_sequence_rules", "kb_get_safe_start", "kb_get_coolant",
  "kb_get_threading_strategy", "kb_drill_point_depth", "kb_full_reference",
  "kb_chip_thinning", "kb_corrected_force", "kb_thermal_derating",
  "kb_stability_check", "kb_power_check",
  "kb_select_workholding", "kb_select_toolpath", "kb_calculate_stock",
  "kb_plan_setups", "kb_tool_magazine_rules", "kb_get_toolpath_strategies",
  "kb_select_lathe", "kb_get_lathe_capabilities", "kb_get_turret_layout",
  "kb_get_lathe_strategy", "kb_get_all_lathe_strategies", "kb_get_vtl_rules",
  "kb_optimize_hole_sequence",
  "kb_select_insert_geometry", "kb_get_insert_geometry_db", "kb_get_nose_radius_guide",
  "kb_get_boring_bar_rules", "kb_get_grooving_parting_rules", "kb_get_css_g97_logic",
  "kb_get_cycle_time_formulas", "kb_get_tool_life_management", "kb_get_lathe_coolant",
  "kb_calculate_repositioning", "kb_get_controller_blocks", "kb_get_all_controller_blocks",
  "kb_optimize_bar_remnant", "kb_get_turret_index_times",
  "kb_get_controller_workarounds",
  "kb_analyze_turning_chatter", "kb_analyze_hard_turning",
  "kb_get_workholding_expanded", "kb_get_insert_shapes_extended",
  "kb_get_gcode_extended", "kb_get_lathe_probing", "kb_get_specialty_lathe_ops",
  "kb_get_cryogenic_turning", "kb_get_micro_turning",
] as const;

const actionEnum = z.enum(ACTIONS);

export function registerMachiningKnowledgeBaseDispatcher(server: any): void {
  server.tool(
    "prism_machining_kb",
    `Machining Knowledge Base — canonical reference for cutting data, physics constants, and G-code rules.
Kienzle kc1.1/mc (33 materials), Taylor C/n (19 tool-material combos), speed/feed tables (35 entries),
tap drill charts (UNC/Metric), chip loads, peck rules, surface finish prediction, operation sequencing,
coolant selection, threading strategies, chip thinning correction, corrected cutting force (rake/wear/engagement),
thermal derating, stability envelope check, power availability check,
workholding selection, toolpath strategy (HSM/trochoidal/adaptive/peel/plunge/waterline/scallop),
stock sizing, multi-op setup planning, tool magazine layout rules.
All values cite sources (Sandvik, Kennametal, ISCAR, Walter, Haas, Machinery's Handbook).
Actions: ${ACTIONS.join(", ")}.`,
    {
      action: actionEnum,
      params: z.record(z.string(), z.any()).optional(),
    },
    async (args: any) => {
      const { action, params = {} } = args;
      log.info(`[prism_machining_kb] action=${action}`);

      const validation = validateActionParams(action, params, ACTION_MACHINING_KB_SCHEMAS);
      if (!validation.valid) {
        return dispatcherError(`Invalid params for '${action}': ${validation.errorMessage}`, action, "prism_machining_kb");
      }

      try {
        const eng = await getEngine();
        const result = eng.calculate(action, params);
        return dispatcherResult(result);
      } catch (err: any) {
        return dispatcherError(err, action, "prism_machining_kb");
      }
    }
  );
}
