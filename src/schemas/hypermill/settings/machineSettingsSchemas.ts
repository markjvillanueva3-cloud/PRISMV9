/**
 * Machine Settings Parameter Schemas — hyperMILL System Settings
 *
 * U-HKC36: Zod schemas for ~30 machine system settings covering
 * machine model identity, axis limits, spindle configuration,
 * machine capabilities, and kinematic geometry.
 *
 * AC Python call pattern:
 *   hm.settings.machine_model(machine_model="DMG_DMU50", kinematic_type="5axis", ...)
 *
 * @domain Settings / Machine
 * @milestone HM-KC-MS7/U-HKC36
 */

import { z } from "zod";

// ============================================================================
// 1. MACHINE MODEL SETTINGS (4 params)
// ============================================================================

export const machineModelSettingsSchema = z.object({
  machine_model: z
    .string()
    .min(1)
    .default("Generic_3Axis")
    .describe("Machine model identifier referencing the machine catalog entry"),
  kinematic_type: z
    .enum(["3axis", "4axis", "5axis", "turning", "millturn"])
    .default("3axis")
    .describe("Primary kinematic configuration of the machine"),
  manufacturer: z
    .string()
    .min(1)
    .default("Generic")
    .describe("Machine manufacturer name (e.g. DMG Mori, Hermle, Mazak)"),
  controller_type: z
    .string()
    .min(1)
    .default("Fanuc")
    .describe("CNC controller type (e.g. Fanuc, Siemens, Heidenhain, Mitsubishi)"),
});

export type MachineModelSettings = z.infer<typeof machineModelSettingsSchema>;

// ============================================================================
// 2. AXIS LIMIT SETTINGS (12 params)
// ============================================================================

export const axisLimitSettingsSchema = z.object({
  x_min: z
    .number()
    .min(-99999)
    .max(0)
    .default(-500)
    .describe("X-axis minimum travel limit, mm"),
  x_max: z
    .number()
    .min(0)
    .max(99999)
    .default(500)
    .describe("X-axis maximum travel limit, mm"),
  y_min: z
    .number()
    .min(-99999)
    .max(0)
    .default(-300)
    .describe("Y-axis minimum travel limit, mm"),
  y_max: z
    .number()
    .min(0)
    .max(99999)
    .default(300)
    .describe("Y-axis maximum travel limit, mm"),
  z_min: z
    .number()
    .min(-99999)
    .max(0)
    .default(-400)
    .describe("Z-axis minimum travel limit (must allow negative values for spindle descent), mm"),
  z_max: z
    .number()
    .min(0)
    .max(99999)
    .default(0)
    .describe("Z-axis maximum travel limit, mm"),
  a_min: z
    .number()
    .min(-720)
    .max(0)
    .default(-120)
    .describe("A-axis minimum rotary travel limit, degrees"),
  a_max: z
    .number()
    .min(0)
    .max(720)
    .default(120)
    .describe("A-axis maximum rotary travel limit, degrees"),
  b_min: z
    .number()
    .min(-720)
    .max(0)
    .default(-110)
    .describe("B-axis minimum rotary travel limit, degrees"),
  b_max: z
    .number()
    .min(0)
    .max(720)
    .default(110)
    .describe("B-axis maximum rotary travel limit, degrees"),
  c_min: z
    .number()
    .min(-720)
    .max(0)
    .default(-360)
    .describe("C-axis minimum rotary travel limit, degrees"),
  c_max: z
    .number()
    .min(0)
    .max(720)
    .default(360)
    .describe("C-axis maximum rotary travel limit, degrees"),
});

export type AxisLimitSettings = z.infer<typeof axisLimitSettingsSchema>;

// ============================================================================
// 3. SPINDLE CONFIG SETTINGS (6 params)
// ============================================================================

export const spindleConfigSettingsSchema = z.object({
  max_rpm: z
    .number()
    .int()
    .min(100)
    .max(60000)
    .default(12000)
    .describe("Maximum spindle speed, RPM (100–60000)"),
  min_rpm: z
    .number()
    .int()
    .min(0)
    .max(60000)
    .default(100)
    .describe("Minimum operable spindle speed, RPM"),
  power_kw: z
    .number()
    .min(0.1)
    .max(500)
    .default(15)
    .describe("Spindle motor continuous power rating, kW"),
  torque_nm: z
    .number()
    .min(0.1)
    .max(5000)
    .default(80)
    .describe("Spindle maximum torque at rated speed, Nm"),
  spindle_type: z
    .enum(["belt", "direct", "gear"])
    .default("direct")
    .describe("Spindle drive mechanism type affecting speed/torque characteristics"),
  gear_ranges: z
    .number()
    .int()
    .min(1)
    .max(8)
    .default(1)
    .describe("Number of spindle gear ranges (1 for direct-drive, 2+ for gear-head)"),
});

export type SpindleConfigSettings = z.infer<typeof spindleConfigSettingsSchema>;

// ============================================================================
// 4. MACHINE CAPABILITY SETTINGS (7 params)
// ============================================================================

export const machineCapabilitySettingsSchema = z.object({
  has_coolant_through: z
    .boolean()
    .default(false)
    .describe("Machine equipped with through-spindle coolant supply"),
  has_chip_conveyor: z
    .boolean()
    .default(false)
    .describe("Machine equipped with automatic chip conveyor system"),
  has_tool_setter: z
    .boolean()
    .default(true)
    .describe("Machine equipped with automatic tool length setter"),
  has_probe: z
    .boolean()
    .default(false)
    .describe("Machine equipped with in-spindle touch probe for part measurement"),
  max_tool_weight_kg: z
    .number()
    .min(0.01)
    .max(200)
    .default(5)
    .describe("Maximum allowable tool + holder assembly weight, kg"),
  max_tool_length_mm: z
    .number()
    .min(10)
    .max(2000)
    .default(400)
    .describe("Maximum allowable tool overall length (projection from spindle face), mm"),
  atc_capacity: z
    .number()
    .int()
    .min(0)
    .max(1000)
    .default(30)
    .describe("Automatic tool changer magazine capacity (0 = no ATC)"),
});

export type MachineCapabilitySettings = z.infer<typeof machineCapabilitySettingsSchema>;

// ============================================================================
// 5. MACHINE KINEMATICS SETTINGS (5 params)
// ============================================================================

export const machineKinematicsSettingsSchema = z.object({
  pivot_point_x: z
    .number()
    .min(-5000)
    .max(5000)
    .default(0)
    .describe("Rotary axis pivot point X coordinate in machine coordinates, mm"),
  pivot_point_y: z
    .number()
    .min(-5000)
    .max(5000)
    .default(0)
    .describe("Rotary axis pivot point Y coordinate in machine coordinates, mm"),
  pivot_point_z: z
    .number()
    .min(-5000)
    .max(5000)
    .default(150)
    .describe("Rotary axis pivot point Z coordinate in machine coordinates, mm"),
  rotary_axis_1_type: z
    .enum(["A", "B", "C", "none"])
    .default("B")
    .describe("Primary rotary axis identifier in the kinematic chain"),
  rotary_axis_2_type: z
    .enum(["A", "B", "C", "none"])
    .default("C")
    .describe("Secondary rotary axis identifier in the kinematic chain"),
  table_diameter_mm: z
    .number()
    .min(0)
    .max(10000)
    .default(630)
    .describe("Rotary/tilt table diameter or clamping circle diameter, mm (0 = no rotary table)"),
});

export type MachineKinematicsSettings = z.infer<typeof machineKinematicsSettingsSchema>;

// ============================================================================
// Schema Map (5 types, 34 params total)
// ============================================================================

/** All 5 machine settings schemas keyed by type */
export const MACHINE_SETTINGS_SCHEMA_MAP: Record<string, z.ZodObject<z.ZodRawShape>> = {
  machine_model: machineModelSettingsSchema,
  axis_limits: axisLimitSettingsSchema,
  spindle_config: spindleConfigSettingsSchema,
  machine_capability: machineCapabilitySettingsSchema,
  machine_kinematics: machineKinematicsSettingsSchema,
};

export type MachineSettingsType = keyof typeof MACHINE_SETTINGS_SCHEMA_MAP;

// ============================================================================
// Metadata
// ============================================================================

export interface MachineSettingsMeta {
  /** Number of Zod-validated parameters */
  paramCount: number;
  /** AC Python setter call template */
  acPythonSetter: string;
  /** Human-readable description */
  description: string;
}

export const MACHINE_SETTINGS_METADATA: Record<MachineSettingsType, MachineSettingsMeta> = {
  machine_model: {
    paramCount: 4,
    acPythonSetter: "hm.settings.machine_model",
    description: "Machine identity: model, kinematic class, manufacturer, and controller",
  },
  axis_limits: {
    paramCount: 12,
    acPythonSetter: "hm.settings.axis_limits",
    description: "Linear (X/Y/Z) and rotary (A/B/C) axis travel limit boundaries",
  },
  spindle_config: {
    paramCount: 6,
    acPythonSetter: "hm.settings.spindle_config",
    description: "Spindle speed range, power, torque, drive type, and gear ranges",
  },
  machine_capability: {
    paramCount: 7,
    acPythonSetter: "hm.settings.machine_capability",
    description: "Machine equipment flags: coolant, chip conveyor, tool setter, probe, ATC",
  },
  machine_kinematics: {
    paramCount: 6,
    acPythonSetter: "hm.settings.machine_kinematics",
    description: "Kinematic geometry: pivot point, rotary axis types, table diameter",
  },
};

// ============================================================================
// Computed Totals
// ============================================================================

/** Total parameter count across all 5 machine settings schemas */
export const MACHINE_SETTINGS_TOTAL_PARAM_COUNT = Object.values(MACHINE_SETTINGS_METADATA).reduce(
  (sum, meta) => sum + meta.paramCount,
  0,
);
