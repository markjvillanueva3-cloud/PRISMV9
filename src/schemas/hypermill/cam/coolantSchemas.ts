/**
 * Coolant Parameter Schemas — hyperMILL CAM
 *
 * U-HKC21: Zod schemas for 3 coolant profile types used across hyperMILL
 * cycle families. Each profile defines coolant delivery, pressure, flow,
 * and nozzle configuration for different cooling strategies.
 *
 * AC Python call pattern:
 *   hm.coolant.standard(mode="flood", pressure=20, flow_rate=15, ...)
 *
 * @domain CAM-Coolant
 * @milestone HM-KC-MS3/U-HKC21
 */

import { z } from "zod";

// ── 1. Standard Coolant (12 params) ───────────────────────────────────────────

export const standardCoolantSchema = z.object({
  mode: z
    .enum(["off", "flood", "mist", "through_tool", "air_blast", "mql"])
    .describe("Coolant delivery mode for standard machining operations"),
  pressure: z
    .number()
    .min(0)
    .max(300)
    .describe("Coolant delivery pressure, bar"),
  flow_rate: z
    .number()
    .min(0)
    .max(100)
    .describe("Coolant volumetric flow rate, l/min"),
  nozzle_count: z
    .number()
    .int()
    .min(0)
    .max(12)
    .default(1)
    .describe("Number of active coolant nozzles directed at cutting zone"),
  nozzle_angle: z
    .number()
    .min(0)
    .max(360)
    .default(45)
    .describe("Nozzle orientation angle relative to tool axis, degrees"),
  temperature: z
    .number()
    .min(-40)
    .max(60)
    .optional()
    .describe("Coolant temperature setpoint for chiller-equipped systems, deg C"),
  concentration_pct: z
    .number()
    .min(0)
    .max(100)
    .default(8)
    .describe("Coolant concentration percentage for water-soluble fluids, %"),
  mist_air_pressure: z
    .number()
    .min(0)
    .max(10)
    .default(4)
    .describe("Air pressure for mist/MQL atomization, bar"),
  chip_flush: z
    .boolean()
    .default(false)
    .describe("Enable dedicated chip flushing nozzle separate from cutting coolant"),
  m_code_on: z
    .number()
    .int()
    .min(0)
    .max(999)
    .default(8)
    .describe("M-code for coolant ON command in G-code output"),
  m_code_off: z
    .number()
    .int()
    .min(0)
    .max(999)
    .default(9)
    .describe("M-code for coolant OFF command in G-code output"),
  filter_micron_rating: z
    .number()
    .min(1)
    .max(500)
    .default(25)
    .describe("Coolant filter rating for required filtration level, micrometers"),
});

export type StandardCoolant = z.infer<typeof standardCoolantSchema>;

// ── 2. High Pressure Coolant (12 params) ──────────────────────────────────────

export const highPressureCoolantSchema = z.object({
  pressure: z
    .number()
    .min(10)
    .max(300)
    .describe("High-pressure coolant delivery pressure, bar (DFM-critical: must match pump capacity)"),
  through_spindle: z
    .boolean()
    .default(true)
    .describe("Deliver coolant through the spindle center bore"),
  through_tool: z
    .boolean()
    .default(true)
    .describe("Deliver coolant through internal tool passages to cutting edge"),
  min_hole_diameter: z
    .number()
    .min(0.5)
    .max(100)
    .describe("Minimum through-tool coolant hole diameter at tool tip, mm"),
  programmable_pressure: z
    .boolean()
    .default(false)
    .describe("Enable programmable pressure control via M-codes for pressure-by-operation"),
  pressure_by_depth: z
    .boolean()
    .default(false)
    .describe("Increase coolant pressure proportionally with hole depth for chip evacuation"),
  max_pressure: z
    .number()
    .min(10)
    .max(350)
    .default(70)
    .describe("Maximum allowable pressure for safety interlock, bar"),
  flow_rate: z
    .number()
    .min(0.5)
    .max(80)
    .describe("Coolant flow rate at operating pressure, l/min"),
  filter_required: z
    .boolean()
    .default(true)
    .describe("Require fine filtration for through-tool delivery (prevents nozzle clogging)"),
  pressure_ramp_time: z
    .number()
    .min(0)
    .max(30)
    .default(2)
    .describe("Time to ramp pressure from zero to operating level, sec"),
  chip_break_assist: z
    .boolean()
    .default(true)
    .describe("Use high-pressure pulses to assist chip breaking in deep holes"),
  m_code_hp_on: z
    .number()
    .int()
    .min(0)
    .max(999)
    .default(88)
    .describe("M-code for high-pressure coolant ON command"),
});

export type HighPressureCoolant = z.infer<typeof highPressureCoolantSchema>;

// ── 3. Cryogenic Coolant (10 params) ──────────────────────────────────────────

export const cryogenicCoolantSchema = z.object({
  type: z
    .enum(["co2", "ln2", "none"])
    .describe("Cryogenic coolant medium: CO2 (carbon dioxide), LN2 (liquid nitrogen), or none"),
  flow_rate: z
    .number()
    .min(0)
    .max(50)
    .describe("Cryogenic medium flow rate, l/min"),
  nozzle_position: z
    .enum(["flood", "directed", "internal"])
    .describe("Nozzle delivery position: external flood, directed jet, or internal through-tool"),
  temperature_target: z
    .number()
    .min(-196)
    .max(0)
    .describe("Target temperature at cutting zone, deg C"),
  pressure: z
    .number()
    .min(1)
    .max(300)
    .describe("Delivery pressure for cryogenic medium, bar"),
  pre_cool_time: z
    .number()
    .min(0)
    .max(120)
    .default(10)
    .describe("Pre-cooling dwell time before machining begins, sec"),
  mql_hybrid: z
    .boolean()
    .default(false)
    .describe("Enable hybrid cryo+MQL mode combining cryogenic cooling with micro-lubrication"),
  mql_flow_rate: z
    .number()
    .min(0)
    .max(1)
    .default(0)
    .describe("MQL oil flow rate when hybrid mode is active, ml/min"),
  safety_shutoff_temp: z
    .number()
    .min(-200)
    .max(-50)
    .default(-100)
    .describe("Safety shutoff temperature threshold for equipment protection, deg C"),
  exhaust_extraction: z
    .boolean()
    .default(true)
    .describe("Enable gas exhaust extraction system for operator safety"),
});

export type CryogenicCoolant = z.infer<typeof cryogenicCoolantSchema>;

// ── Schema Map ────────────────────────────────────────────────────────────────

/** All 3 coolant profile schemas keyed by profile type */
export const COOLANT_SCHEMA_MAP = {
  standard: standardCoolantSchema,
  high_pressure: highPressureCoolantSchema,
  cryogenic: cryogenicCoolantSchema,
} as const;

export type CoolantProfileType = keyof typeof COOLANT_SCHEMA_MAP;

// ── Metadata ──────────────────────────────────────────────────────────────────

/** Metadata record for every coolant profile type */
export interface CoolantMeta {
  /** Number of Zod-validated parameters */
  paramCount: number;
  /** AC Python setter call template */
  acPythonSetter: string;
  /** Human-readable description */
  description: string;
  /** DFM flags: which parameters have manufacturing-critical ranges */
  dfmCriticalParams?: string[];
}

/** Metadata for each coolant profile type with AC Python setter references */
export const COOLANT_METADATA: Record<CoolantProfileType, CoolantMeta> = {
  standard: {
    paramCount: 12,
    acPythonSetter: "hm.coolant.standard",
    description: "Standard coolant delivery with flood, mist, MQL, and air blast modes",
  },
  high_pressure: {
    paramCount: 12,
    acPythonSetter: "hm.coolant.high_pressure",
    description: "High-pressure coolant delivery through spindle/tool for chip evacuation",
    dfmCriticalParams: ["pressure", "min_hole_diameter"],
  },
  cryogenic: {
    paramCount: 10,
    acPythonSetter: "hm.coolant.cryogenic",
    description: "Cryogenic coolant delivery with CO2 or LN2 for heat-resistant alloy machining",
    dfmCriticalParams: ["type", "temperature_target"],
  },
};

// ── Computed Totals ───────────────────────────────────────────────────────────

/** Total parameter count across all 3 coolant profile schemas */
export const COOLANT_TOTAL_PARAM_COUNT = Object.values(COOLANT_METADATA).reduce(
  (sum, meta) => sum + meta.paramCount,
  0,
);
