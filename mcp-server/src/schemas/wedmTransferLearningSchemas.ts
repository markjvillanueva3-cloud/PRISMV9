/**
 * Zod schemas for WEDM Transfer Learning Engine actions
 * @milestone WEDM-NEXT-MS0
 * @unit U-WN03
 */
import { z } from "zod";

const WEDMParametersSchema = z.object({
  gapVoltage: z.number().min(10).max(150),
  wireTension: z.number().min(1).max(30),
  flushingPressure: z.number().min(0.1).max(3),
  pulseOnTime: z.number().min(0.5).max(100),
  pulseOffTime: z.number().min(5).max(200),
  wireSpeed: z.number().min(1).max(30),
});

const MaterialPropertiesSchema = z.object({
  name: z.string(),
  conductivity: z.number().positive(),
  thermalConductivity: z.number().positive(),
  meltingPoint: z.number().positive(),
  hardness: z.number().min(0).max(100),
  density: z.number().positive(),
});

const MachineProfileSchema = z.object({
  name: z.string(),
  maxGapVoltage: z.number().positive(),
  maxWireTension: z.number().positive(),
  maxFlushingPressure: z.number().positive(),
  maxPulseOnTime: z.number().positive(),
  minPulseOffTime: z.number().positive(),
  maxWireSpeed: z.number().positive(),
  generatorType: z.enum(["iso-pulse", "relaxation", "transistor"]),
});

const SourceOutcomesSchema = z.object({
  mrr: z.number().optional(),
  surfaceRa: z.number().optional(),
  wireConsumption: z.number().optional(),
});

export const WEDM_TRANSFER_LEARNING_SCHEMAS: Record<string, z.ZodTypeAny> = {
  wedm_transfer_params: z.object({
    source_material: z.union([z.string(), MaterialPropertiesSchema]).describe("Source material name or properties"),
    target_material: z.union([z.string(), MaterialPropertiesSchema]).describe("Target material name or properties"),
    source_parameters: WEDMParametersSchema.describe("Optimized parameters from source domain"),
    source_machine: MachineProfileSchema.optional().describe("Source machine profile"),
    target_machine: MachineProfileSchema.optional().describe("Target machine profile"),
    source_outcomes: SourceOutcomesSchema.optional().describe("Outcomes achieved with source parameters"),
  }),

  wedm_material_similarity: z.object({
    source_material: z.union([z.string(), MaterialPropertiesSchema]).describe("Source material"),
    target_material: z.union([z.string(), MaterialPropertiesSchema]).describe("Target material"),
  }),

  wedm_batch_transfer: z.object({
    source_parameters: WEDMParametersSchema.describe("Source parameters to transfer"),
    source_material: z.string().describe("Source material name"),
    target_materials: z.array(z.string()).min(1).describe("List of target materials"),
    source_machine: MachineProfileSchema.optional(),
    target_machine: MachineProfileSchema.optional(),
  }),

  wedm_similar_materials: z.object({
    material: z.string().describe("Material to find similar materials for"),
    top_n: z.number().int().min(1).max(10).optional().describe("Number of similar materials to return"),
  }),

  wedm_validate_transfer: z.object({
    parameters: WEDMParametersSchema.describe("Transferred parameters to validate"),
    target_material: z.string().describe("Target material for validation context"),
  }),
};
