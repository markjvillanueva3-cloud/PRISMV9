/**
 * CAM-X MS22 U01 Action Schemas — META-FIX: schema recovery for U-WIRE12
 *
 * Zod validation schemas for the 16 dispatcher actions wired into prism_cam
 * by ENGINE-WIRE-MS0/U-WIRE12 (commit d86067041, 2026-04-27). The U-WIRE12
 * commit added the import + schema-spread for these actions in
 * camDispatcher.ts:108 and :181 but never staged this file — leaving the
 * import broken and breaking every dispatcher round-trip test that touches
 * the cam dispatcher (MS1-01..08, plus the U-WIRE12 round-trip tests).
 *
 * Engines covered (5):
 *   - Mastercam5AxisEngine                  (3 actions)
 *   - MultiAgentAIInterfaceEngine           (3 actions)
 *   - Fusion360AutomationBridge             (3 actions)
 *   - HyperMILLAutomationBridge             (3 actions)
 *   - HyperCADSMockLayer                    (4 actions)
 *
 * Conventions (matches sibling camxMs22U02ActionSchemas.ts):
 *   - Zod v4
 *   - .describe() on every field (drives MCP tool descriptions)
 *   - Snake_case enum values matching dispatcher action names
 *   - .passthrough() on every action object so camelCase / snake_case duals
 *     handled by the dispatcher (e.g. toolDiameterMm ?? tool_diameter_mm)
 *     don't trigger spurious rejection at schema time
 *   - Named export ACTION_CAMX_MS22_U01_SCHEMAS as Record<string, z.ZodType>
 */
import { z } from "zod";

// ─── Shared enums ──────────────────────────────────────────────────────
const ISO_GROUPS = ["P", "M", "K", "N", "S", "H"] as const;
const TOOL_TYPES = ["ballnose", "bullnose", "endmill", "barrel", "circle_segment", "tapered"] as const;

// ─── Mastercam5AxisEngine ──────────────────────────────────────────────
const FIVEAXIS_GEOMETRIES = [
  "impeller", "blisk", "blade", "port", "cavity", "swarf_wall", "deep_pocket",
  "undercut", "thin_wall", "freeform_surface", "turbine_vane", "general",
] as const;
const FIVEAXIS_GOALS = ["roughing", "semi_finishing", "finishing", "rest_machining"] as const;
const FIVEAXIS_KINEMATICS = ["head_head", "head_table", "table_table", "trunnion_table", "tilt_rotary"] as const;

const mastercam_5axis_recommend = z.object({
  geometry: z.enum(FIVEAXIS_GEOMETRIES).describe("Feature class to machine"),
  goal: z.enum(FIVEAXIS_GOALS).describe("Machining goal (roughing / finishing / etc)"),
  isoGroup: z.enum(ISO_GROUPS).optional().describe("ISO material group (P/M/K/N/S/H) — camelCase form"),
  iso_group: z.enum(ISO_GROUPS).optional().describe("ISO material group — snake_case form"),
  toolDiameterMm: z.number().positive().optional().describe("Tool diameter in mm — camelCase"),
  tool_diameter_mm: z.number().positive().optional().describe("Tool diameter in mm — snake_case"),
  toolType: z.enum(TOOL_TYPES).optional().describe("Tool type — camelCase"),
  tool_type: z.enum(TOOL_TYPES).optional().describe("Tool type — snake_case"),
  cornerRadiusMm: z.number().min(0).optional().describe("Tool corner radius (mm) — camelCase"),
  corner_radius_mm: z.number().min(0).optional().describe("Tool corner radius (mm) — snake_case"),
  kinematics: z.enum(FIVEAXIS_KINEMATICS).optional().describe("Machine kinematic chain"),
  maxWallAngleDeg: z.number().min(0).max(90).optional().describe("Max wall angle (deg) — camelCase"),
  max_wall_angle_deg: z.number().min(0).max(90).optional().describe("Max wall angle (deg) — snake_case"),
  minFilletRadiusMm: z.number().min(0).optional().describe("Minimum fillet radius (mm) — camelCase"),
  min_fillet_radius_mm: z.number().min(0).optional().describe("Minimum fillet radius (mm) — snake_case"),
  targetRaUm: z.number().positive().optional().describe("Target surface roughness Ra (µm) — camelCase"),
  target_ra_um: z.number().positive().optional().describe("Target surface roughness Ra (µm) — snake_case"),
  requireCollisionCheck: z.boolean().optional().describe("Require collision check — camelCase"),
  require_collision_check: z.boolean().optional().describe("Require collision check — snake_case"),
  partToleranceMm: z.number().positive().optional().describe("Part tolerance (mm) — camelCase"),
  part_tolerance_mm: z.number().positive().optional().describe("Part tolerance (mm) — snake_case"),
}).passthrough();

const mastercam_5axis_tilt_limits = z.object({
  tiltADeg: z.number().optional().describe("A-axis tilt angle (deg) — camelCase"),
  tilt_a_deg: z.number().optional().describe("A-axis tilt angle (deg) — snake_case"),
  tiltBDeg: z.number().optional().describe("B-axis tilt angle (deg) — camelCase"),
  tilt_b_deg: z.number().optional().describe("B-axis tilt angle (deg) — snake_case"),
  machineAMin: z.number().optional().describe("Machine A-axis min limit (deg) — camelCase"),
  machine_a_min: z.number().optional().describe("Machine A-axis min limit (deg) — snake_case"),
  machineAMax: z.number().optional().describe("Machine A-axis max limit (deg) — camelCase"),
  machine_a_max: z.number().optional().describe("Machine A-axis max limit (deg) — snake_case"),
  machineBMin: z.number().optional().describe("Machine B-axis min limit (deg) — camelCase"),
  machine_b_min: z.number().optional().describe("Machine B-axis min limit (deg) — snake_case"),
  machineBMax: z.number().optional().describe("Machine B-axis max limit (deg) — camelCase"),
  machine_b_max: z.number().optional().describe("Machine B-axis max limit (deg) — snake_case"),
}).passthrough();

const mastercam_5axis_list_strategies = z.object({}).passthrough();

// ─── MultiAgentAIInterfaceEngine ───────────────────────────────────────
const AGENT_FAMILIES = ["claude", "codex", "gemini", "ollama", "human", "other"] as const;
const CHAIN_STATUSES = ["active", "completed", "abandoned", "blocked", "queued"] as const;

const multi_agent_register_session = z.object({
  agent_id: z.string().min(1).describe("Unique agent session ID (e.g. claude-379c35e0)"),
  family: z.enum(AGENT_FAMILIES).describe("Agent family classification"),
  lane: z.string().optional().describe("Logical lane the agent is working in (e.g. CAM-EXHAUST-MS1)"),
  machine: z.string().optional().describe("Host machine identifier (hostname or PC name)"),
  token_budget: z.number().int().nonnegative().optional().describe("Token budget allocated to this session"),
}).passthrough();

const multi_agent_get_activity = z.object({}).passthrough();

const multi_agent_query_chains = z.object({
  intent_pattern: z.string().optional().describe("Pattern to match against chain intents"),
  source: z.string().optional().describe("Source filter (agent_id or family)"),
  status: z.enum(CHAIN_STATUSES).optional().describe("Chain status filter"),
  created_by: z.string().optional().describe("Filter by creating agent_id"),
  since: z.string().optional().describe("ISO timestamp — only return chains created after this"),
  limit: z.number().int().positive().max(1000).optional().describe("Max chains to return (default unbounded)"),
}).passthrough();

// ─── Fusion360AutomationBridge ─────────────────────────────────────────
const fusion360_open = z.object({
  file_path: z.string().min(1).describe("Path to Fusion 360 document (.f3d / .f3z) or cloud doc URN"),
  base_url: z.string().optional().describe("Override Fusion 360 automation service base URL"),
}).passthrough();

const fusion360_get_geometry = z.object({}).passthrough();

const fusion360_export_step = z.object({
  output_path: z.string().min(1).describe("Filesystem path where the STEP file will be written"),
}).passthrough();

// ─── HyperMILLAutomationBridge ─────────────────────────────────────────
const hypermill_bridge_open = z.object({
  file_path: z.string().min(1).describe("Path to hyperMILL document (.mxp / .mp / .step)"),
  ac_host: z.string().optional().describe("hyperMILL ACTIVATEcontrol host (defaults to localhost)"),
  ac_port: z.number().int().positive().max(65535).optional().describe("hyperMILL ACTIVATEcontrol port"),
}).passthrough();

const hypermill_bridge_get_geometry = z.object({}).passthrough();

const hypermill_bridge_export_step = z.object({
  output_path: z.string().min(1).describe("Filesystem path where the STEP export will be written"),
}).passthrough();

// ─── HyperCADSMockLayer ────────────────────────────────────────────────
const HYPERCADS_STOCK_MODES = ["bounding_box", "from_body", "from_cylinder", "from_model"] as const;

const hypercads_mock_import = z.object({
  file_path: z.string().optional().describe("Optional CAD file path to simulate importing"),
}).passthrough();

const hypercads_mock_heal = z.object({
  body_name: z.string().optional().describe("Optional body name to simulate healing"),
}).passthrough();

const hypercads_mock_analyze = z.object({
  body_name: z.string().optional().describe("Optional body name to simulate analyzing"),
}).passthrough();

const hypercads_mock_stock = z.object({
  mode: z.enum(HYPERCADS_STOCK_MODES).optional().describe("Stock-creation mode (defaults to bounding_box)"),
}).passthrough();

// ─── Export ────────────────────────────────────────────────────────────
export const ACTION_CAMX_MS22_U01_SCHEMAS: Record<string, z.ZodType> = {
  mastercam_5axis_recommend,
  mastercam_5axis_tilt_limits,
  mastercam_5axis_list_strategies,
  multi_agent_register_session,
  multi_agent_get_activity,
  multi_agent_query_chains,
  fusion360_open,
  fusion360_get_geometry,
  fusion360_export_step,
  hypermill_bridge_open,
  hypermill_bridge_get_geometry,
  hypermill_bridge_export_step,
  hypercads_mock_import,
  hypercads_mock_heal,
  hypercads_mock_analyze,
  hypercads_mock_stock,
};
