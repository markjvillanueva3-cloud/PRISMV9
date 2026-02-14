import { z } from "zod";
import { handleCollisionTool } from "../collisionTools.js";
import { handleCoolantValidationTool } from "../coolantValidationTools.js";
import { handleSpindleProtectionTool } from "../spindleProtectionTools.js";
import { handleToolBreakageTool } from "../toolBreakageTools.js";
import { handleWorkholdingTool } from "../workholdingTools.js";

const COLLISION_ACTIONS = new Set([
  "check_toolpath_collision", "validate_rapid_moves", "check_fixture_clearance",
  "calculate_safe_approach", "detect_near_miss", "generate_collision_report",
  "validate_tool_clearance", "check_5axis_head_clearance"
]);

const COOLANT_ACTIONS = new Set([
  "validate_coolant_flow", "check_through_spindle_coolant", "calculate_chip_evacuation",
  "validate_mql_parameters", "get_coolant_recommendations"
]);

const SPINDLE_ACTIONS = new Set([
  "check_spindle_torque", "check_spindle_power", "validate_spindle_speed",
  "monitor_spindle_thermal", "get_spindle_safe_envelope"
]);

const BREAKAGE_ACTIONS = new Set([
  "predict_tool_breakage", "calculate_tool_stress", "check_chip_load_limits",
  "estimate_tool_fatigue", "get_safe_cutting_limits"
]);

const WORKHOLDING_ACTIONS = new Set([
  "calculate_clamp_force_required", "validate_workholding_setup", "check_pullout_resistance",
  "analyze_liftoff_moment", "calculate_part_deflection", "validate_vacuum_fixture"
]);
const ALL_ACTIONS = [
  ...COLLISION_ACTIONS, ...COOLANT_ACTIONS, ...SPINDLE_ACTIONS,
  ...BREAKAGE_ACTIONS, ...WORKHOLDING_ACTIONS
] as const;

export function registerSafetyDispatcher(server: any): void {
  server.tool(
    "prism_safety",
    `Safety-critical manufacturing validations: collision detection, coolant/spindle/tool/workholding checks. SAFETY CRITICAL.`,
    {
      action: z.enum(ALL_ACTIONS as unknown as [string, ...string[]]),
      params: z.record(z.any()).optional()
    },
    async ({ action, params = {} }: { action: string; params: Record<string, any> }) => {
      try {
        let result: any;

        if (COLLISION_ACTIONS.has(action)) {
          result = await handleCollisionTool(action, params);
        } else if (COOLANT_ACTIONS.has(action)) {
          result = await handleCoolantValidationTool(action, params);
        } else if (SPINDLE_ACTIONS.has(action)) {
          result = await handleSpindleProtectionTool(action, params);
        } else if (BREAKAGE_ACTIONS.has(action)) {
          result = await handleToolBreakageTool(action, params);
        } else if (WORKHOLDING_ACTIONS.has(action)) {
          result = await handleWorkholdingTool(action, params);
        } else {
          return { content: [{ type: "text" as const, text: JSON.stringify({ error: `Unknown safety action: ${action}` }) }] };
        }

        // Wrap raw result in MCP format if needed
        if (result && !result.content) {
          return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
        }
        return result;
      } catch (error: any) {
        return { content: [{ type: "text" as const, text: JSON.stringify({ error: `Safety tool error: ${error.message}`, action }) }], isError: true };
      }
    }
  );
}
