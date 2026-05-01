/**
 * CAM-X MS22 U01 Action Schemas — U-WIRE12
 * Zod validation schemas for 5 newly-wired engines:
 *   mastercam5AxisEngine, multiAgentAIInterfaceEngine,
 *   fusion360AutomationBridge, hypermillAutomationBridge, hyperCADSMockLayer
 */
import { z } from "zod";

export const ACTION_CAMX_MS22_U01_SCHEMAS: Record<string, z.ZodType> = {

  // ── mastercam5AxisEngine ─────────────────────────────────────────────────────

  mastercam_5axis_recommend: z.object({
    geometry: z.enum([
      "freeform_surface","ruled_surface","steep_wall","shallow_area",
      "impeller_blade","impeller_hub","blisk","turbine_blade",
      "undercut","port_cavity","manifold","tube_bore","dental",
    ]).describe("Geometry type to machine"),
    goal: z.enum([
      "roughing","semi_finishing","finishing","rest_machining",
      "swarf_milling","point_milling","flow_milling",
    ]).describe("Machining goal"),
    isoGroup: z.enum(["P","M","K","N","S","H"]).describe("ISO material group"),
    toolDiameterMm: z.number().positive().describe("Tool diameter in mm"),
    toolType: z.enum(["ballnose","bullnose","endmill","barrel","circle_segment","tapered"])
      .describe("Tool type"),
    cornerRadiusMm: z.number().nonnegative().optional().describe("Corner radius for bullnose/barrel (mm)"),
    kinematics: z.enum(["trunnion_table","swivel_head","mixed","nutator"]).optional()
      .describe("Machine kinematics type"),
    maxWallAngleDeg: z.number().min(0).max(90).optional().describe("Max wall angle (degrees)"),
    minFilletRadiusMm: z.number().nonnegative().optional().describe("Min fillet radius (mm)"),
    targetRaUm: z.number().positive().optional().describe("Target surface roughness Ra (um)"),
    requireCollisionCheck: z.boolean().optional().describe("Require holder/spindle collision check"),
    partToleranceMm: z.number().positive().optional().describe("Part tolerance in mm"),
  }),

  mastercam_5axis_tilt_limits: z.object({
    tiltADeg: z.number().describe("A-axis tilt angle (degrees)"),
    tiltBDeg: z.number().describe("B-axis tilt angle (degrees)"),
    machineAMin: z.number().describe("Machine A-axis minimum limit (degrees)"),
    machineAMax: z.number().describe("Machine A-axis maximum limit (degrees)"),
    machineBMin: z.number().describe("Machine B-axis minimum limit (degrees)"),
    machineBMax: z.number().describe("Machine B-axis maximum limit (degrees)"),
  }),

  mastercam_5axis_list_strategies: z.object({}),

  // ── multiAgentAIInterfaceEngine ──────────────────────────────────────────────

  multi_agent_register_session: z.object({
    agent_id: z.string().describe("Unique agent identifier"),
    family: z.enum(["claude","codex"]).describe("Agent family"),
    lane: z.enum(["ai-integ","kar","backend","qa","rem","data","pipe","appw","frontend"]).optional().describe("Agent lane identifier"),
    machine: z.string().optional().describe("Machine/host running the agent"),
    token_budget: z.number().positive().optional().describe("Initial token budget"),
  }),

  multi_agent_get_activity: z.object({}),

  multi_agent_query_chains: z.object({
    intent_pattern: z.string().optional().describe("Regex pattern to match intent"),
    source: z.string().optional().describe("Filter by chain source"),
    status: z.string().optional().describe("Filter by chain status"),
    created_by: z.string().optional().describe("Filter by creator agent_id"),
    since: z.string().optional().describe("ISO timestamp — return chains created after this"),
    limit: z.number().positive().optional().describe("Max results to return"),
  }),

  // ── fusion360AutomationBridge ────────────────────────────────────────────────

  fusion360_open: z.object({
    file_path: z.string().describe("Path to .f3d or .f3z Fusion 360 file"),
    base_url: z.string().optional().describe("Custom add-in base URL (default: http://localhost:7374)"),
  }),

  fusion360_get_geometry: z.object({}),

  fusion360_export_step: z.object({
    output_path: z.string().describe("Output path for the STEP AP242 file"),
  }),

  // ── hypermillAutomationBridge ────────────────────────────────────────────────

  hypermill_bridge_open: z.object({
    file_path: z.string().describe("Path to .hmc hyperMILL file"),
    ac_host: z.string().optional().describe("hyperMILL AC host (default: localhost)"),
    ac_port: z.number().positive().optional().describe("hyperMILL AC port (default: 8080)"),
  }),

  hypermill_bridge_get_geometry: z.object({}),

  hypermill_bridge_export_step: z.object({
    output_path: z.string().describe("Output path for the STEP file"),
  }),

  // ── hyperCADSMockLayer ───────────────────────────────────────────────────────

  hypercads_mock_import: z.object({
    file_path: z.string().optional().describe("STEP file path (for traceability in mock response)"),
  }),

  hypercads_mock_heal: z.object({
    body_name: z.string().optional().describe("Body name for mock heal response"),
  }),

  hypercads_mock_analyze: z.object({
    body_name: z.string().optional().describe("Body name for mock analyze response"),
  }),

  hypercads_mock_stock: z.object({
    mode: z.string().optional().describe("Stock mode (default: bounding_box)"),
  }),
};
