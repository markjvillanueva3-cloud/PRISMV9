/**
 * VIRTUAL Machining Parameter Schemas — hyperMILL Settings
 *
 * U-HKC37: Zod schemas for simulation quality, display, and behavior settings
 * used by the hyperMILL VIRTUAL Machining module.
 *
 * AC Python call pattern:
 *   hm.settings.virtual_machining.set_quality(simulation_quality="standard", ...)
 *
 * @domain Settings / VIRTUAL Machining
 * @milestone HM-KC-MS7/U-HKC37
 */

import { z } from "zod";

// ============================================================================
// 1. SIMULATION QUALITY SETTINGS (4 params)
// ============================================================================

export const simQualitySettingsSchema = z.object({
  simulation_quality: z
    .enum(["draft", "standard", "high", "ultra"])
    .default("standard")
    .describe("Overall simulation fidelity preset: draft (fastest) through ultra (highest accuracy)"),
  collision_tolerance_mm: z
    .number()
    .min(0.01)
    .max(1.0)
    .default(0.1)
    .describe("Minimum clearance distance flagged as a collision during VIRTUAL Machining simulation, mm (0.01–1.0)"),
  stock_mesh_density: z
    .enum(["coarse", "medium", "fine"])
    .default("medium")
    .describe("Tessellation density for the stock mesh used in material removal simulation"),
  animation_speed: z
    .number()
    .min(0.1)
    .max(10.0)
    .default(1.0)
    .describe("Simulation playback speed multiplier relative to real-time (0.1x slow to 10x fast)"),
});

export type SimQualitySettings = z.infer<typeof simQualitySettingsSchema>;

// ============================================================================
// 2. SIMULATION DISPLAY SETTINGS (6 params)
// ============================================================================

const hexColorSchema = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, "Must be a valid hex color string (e.g. #FF0000)");

export const simDisplaySettingsSchema = z.object({
  show_tool_path: z
    .boolean()
    .default(true)
    .describe("Display the tool center point path as a visible trace during simulation"),
  show_stock_removal: z
    .boolean()
    .default(true)
    .describe("Render progressive stock material removal as simulation advances"),
  show_collision_zones: z
    .boolean()
    .default(true)
    .describe("Highlight geometry regions where collisions are detected during simulation"),
  highlight_gouge: z
    .boolean()
    .default(true)
    .describe("Visually highlight gouge regions where the tool has cut below the design surface"),
  gouge_color: hexColorSchema
    .default("#FF3300")
    .describe("Display color for gouge highlight regions in the VIRTUAL Machining viewport, hex string"),
  material_removal_color: hexColorSchema
    .default("#88CCFF")
    .describe("Display color for the progressively removed material volume during simulation, hex string"),
});

export type SimDisplaySettings = z.infer<typeof simDisplaySettingsSchema>;

// ============================================================================
// 3. SIMULATION BEHAVIOR SETTINGS (5 params)
// ============================================================================

export const simBehaviorSettingsSchema = z.object({
  auto_simulate_after_calculate: z
    .boolean()
    .default(false)
    .describe("Automatically launch VIRTUAL Machining simulation after toolpath calculation completes"),
  pause_on_collision: z
    .boolean()
    .default(true)
    .describe("Pause simulation playback automatically when a collision event is detected"),
  save_simulation_results: z
    .boolean()
    .default(true)
    .describe("Persist simulation results (collision log, gouge map) to the project file after completion"),
  max_simulation_time_min: z
    .number()
    .int()
    .min(1)
    .max(480)
    .default(60)
    .describe("Maximum allowed simulation wall-clock time before automatic cancellation, minutes (1–480)"),
  report_material_removal_volume: z
    .boolean()
    .default(false)
    .describe("Compute and report total material removal volume after simulation completes"),
});

export type SimBehaviorSettings = z.infer<typeof simBehaviorSettingsSchema>;

// ============================================================================
// Schema Map (3 types)
// ============================================================================

/** All VIRTUAL Machining settings schemas keyed by type */
export const VIRTUAL_MACHINING_SCHEMA_MAP: Record<string, z.ZodObject<z.ZodRawShape>> = {
  sim_quality: simQualitySettingsSchema,
  sim_display: simDisplaySettingsSchema,
  sim_behavior: simBehaviorSettingsSchema,
};

export type VirtualMachiningSchemaType = keyof typeof VIRTUAL_MACHINING_SCHEMA_MAP;

// ============================================================================
// Metadata
// ============================================================================

export interface VirtualMachiningMeta {
  paramCount: number;
  acPythonSetter: string;
  description: string;
}

export const VIRTUAL_MACHINING_METADATA: Record<string, VirtualMachiningMeta> = {
  sim_quality: {
    paramCount: 4,
    acPythonSetter: "hm.settings.virtual_machining.set_quality",
    description: "Configure simulation fidelity, collision tolerance, stock mesh density, and animation speed",
  },
  sim_display: {
    paramCount: 6,
    acPythonSetter: "hm.settings.virtual_machining.set_display",
    description: "Configure toolpath trace, stock removal, collision zone, and gouge display colors",
  },
  sim_behavior: {
    paramCount: 5,
    acPythonSetter: "hm.settings.virtual_machining.set_behavior",
    description: "Configure auto-simulate trigger, collision pause, result saving, and time limits",
  },
};

// ============================================================================
// Computed Totals
// ============================================================================

/** Total parameter count across all VIRTUAL Machining settings schemas */
export const VIRTUAL_MACHINING_TOTAL_PARAM_COUNT = Object.values(VIRTUAL_MACHINING_METADATA).reduce(
  (sum, meta) => sum + meta.paramCount,
  0,
);
