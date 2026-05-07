/**
 * WEDM Recast Layer ML Schemas
 *
 * WEDM-NEXT-MS0 / U-WN06
 */

import { z } from "zod";

const WireMaterialEnum = z.enum(["brass", "zinc_coated", "molybdenum", "tungsten"]);
const FlushingModeEnum = z.enum(["submerged", "upper_lower", "coaxial", "none"]);
const PassTypeEnum = z.enum(["rough", "skim1", "skim2", "skim3", "finish"]);
const DielectricTypeEnum = z.enum(["deionized_water", "oil", "kerosene"]);

const RecastMLInputSchema = z.object({
  material: z.string().describe("Workpiece material (e.g., tool_steel, inconel, D2)"),
  thicknessMm: z.number().positive().describe("Workpiece thickness in mm"),
  peakCurrentA: z.number().positive().describe("Peak discharge current in amperes"),
  voltageV: z.number().positive().describe("Gap voltage in volts"),
  pulseOnUs: z.number().positive().describe("Pulse on-time in microseconds"),
  pulseOffUs: z.number().positive().describe("Pulse off-time in microseconds"),
  wireDiameterMm: z.number().positive().describe("Wire diameter in mm"),
  wireMaterial: WireMaterialEnum.describe("Wire material type"),
  flushingPressureBar: z.number().nonnegative().optional().describe("Flushing pressure in bar"),
  flushingMode: FlushingModeEnum.optional().describe("Flushing configuration"),
  numPasses: z.number().int().positive().optional().describe("Total number of passes"),
  passType: PassTypeEnum.optional().describe("Current pass type"),
  dielectricType: DielectricTypeEnum.optional().describe("Dielectric fluid type"),
  machineAge: z.number().nonnegative().optional().describe("Machine age in years"),
});

export const WEDM_RECAST_ML_SCHEMAS = {
  wedm_recast_ml_predict: RecastMLInputSchema.describe(
    "Predict recast layer thickness using ML ensemble model"
  ),

  wedm_recast_ml_train: z.object({
    samples: z.array(z.object({
      input: RecastMLInputSchema,
      measuredDepthUm: z.number().nonnegative().describe("Measured recast depth in microns"),
      timestamp: z.number().optional().describe("Measurement timestamp"),
      machineId: z.string().optional().describe("Machine identifier"),
      jobId: z.string().optional().describe("Job identifier"),
    })).min(1).describe("Training samples with measured recast depths"),
  }).describe("Train recast ML model on empirical measurements"),

  wedm_recast_ml_add_sample: z.object({
    input: RecastMLInputSchema,
    measuredDepthUm: z.number().nonnegative().describe("Measured recast depth in microns"),
    timestamp: z.number().optional().describe("Measurement timestamp"),
    machineId: z.string().optional().describe("Machine identifier"),
    jobId: z.string().optional().describe("Job identifier"),
  }).describe("Add single training sample for online learning"),

  wedm_recast_ml_stats: z.object({}).describe("Get ML model statistics"),

  wedm_recast_ml_reset: z.object({}).describe("Reset ML model to untrained state"),
};

export type WedmRecastMLAction = keyof typeof WEDM_RECAST_ML_SCHEMAS;
