/**
 * WEDM Heat Affected Zone Schemas
 *
 * WEDM-NEXT-MS0 / U-WN07
 */

import { z } from "zod";

const WireMaterialEnum = z.enum(["brass", "zinc_coated", "molybdenum", "tungsten"]);
const FlushingModeEnum = z.enum(["submerged", "upper_lower", "coaxial", "none"]);
const PassTypeEnum = z.enum(["rough", "skim1", "skim2", "skim3", "finish"]);

const HAZInputSchema = z.object({
  material: z.string().describe("Workpiece material (e.g., tool_steel, inconel, D2)"),
  thicknessMm: z.number().positive().describe("Workpiece thickness in mm"),
  peakCurrentA: z.number().positive().describe("Peak discharge current in amperes"),
  voltageV: z.number().positive().describe("Gap voltage in volts"),
  pulseOnUs: z.number().positive().describe("Pulse on-time in microseconds"),
  pulseOffUs: z.number().positive().describe("Pulse off-time in microseconds"),
  wireDiameterMm: z.number().positive().describe("Wire diameter in mm"),
  wireMaterial: WireMaterialEnum.describe("Wire material type"),
  flushingMode: FlushingModeEnum.optional().describe("Flushing configuration"),
  numPasses: z.number().int().positive().optional().describe("Total number of passes"),
  passType: PassTypeEnum.optional().describe("Current pass type"),
  targetHardnessHRC: z.number().optional().describe("Target hardness in HRC"),
});

export const WEDM_HAZ_SCHEMAS = {
  wedm_haz_predict: HAZInputSchema.describe(
    "Predict HAZ depth and microstructure from EDM parameters"
  ),

  wedm_haz_stock_allowance: HAZInputSchema.describe(
    "Recommend stock allowance to remove HAZ completely"
  ),

  wedm_haz_compare: z.object({
    inputs: z.array(HAZInputSchema).min(2).max(10).describe("Parameter sets to compare"),
  }).describe("Compare HAZ impact across multiple parameter sets"),
};

export type WedmHAZAction = keyof typeof WEDM_HAZ_SCHEMAS;
