/**
 * Zod schemas for WEDM Online Learning Engine actions
 * @milestone WEDM-NEXT-MS0
 * @unit U-WN04
 */
import { z } from "zod";

const WEDMParametersSchema = z.object({
  gapVoltage: z.number().min(10).max(150).describe("Gap voltage in V"),
  wireTension: z.number().min(1).max(30).describe("Wire tension in N"),
  flushingPressure: z.number().min(0.1).max(3).describe("Flushing pressure in MPa"),
  pulseOnTime: z.number().min(0.5).max(100).describe("Pulse on time in µs"),
  pulseOffTime: z.number().min(5).max(200).describe("Pulse off time in µs"),
  wireSpeed: z.number().min(1).max(30).describe("Wire speed in m/min"),
});

const OutcomesSchema = z.object({
  mrr: z.number().min(0).describe("Material removal rate in mm³/min"),
  surfaceRa: z.number().min(0).describe("Surface roughness Ra in µm"),
  wireConsumption: z.number().min(0).describe("Wire consumption in m/part"),
  energyConsumption: z.number().min(0).describe("Energy consumption in kWh"),
});

const ProductionFeedbackSchema = z.object({
  parameters: WEDMParametersSchema.describe("Cutting parameters used"),
  actualOutcomes: OutcomesSchema.describe("Actual measured outcomes"),
  predictedOutcomes: OutcomesSchema.optional().describe("Predicted outcomes if available"),
  material: z.string().describe("Material name"),
  thickness: z.number().positive().describe("Workpiece thickness in mm"),
  machineId: z.string().optional().describe("Machine identifier"),
  timestamp: z.string().describe("ISO timestamp"),
  wireBreakOccurred: z.boolean().optional().describe("Whether wire break happened"),
  qualityAccepted: z.boolean().optional().describe("Whether part passed QC"),
});

const ModelStateSchema = z.object({
  coefficients: z.record(z.string(), z.record(z.string(), z.number())),
  biases: z.record(z.string(), z.number()),
  observationCount: z.number().int().min(0),
  lastUpdated: z.string(),
  learningRate: z.number().positive(),
  momentumTerms: z.record(z.string(), z.record(z.string(), z.number())),
});

export const WEDM_ONLINE_LEARNING_SCHEMAS: Record<string, z.ZodTypeAny> = {
  wedm_online_init: z.object({
    material: z.string().describe("Material name for model context"),
    machine_id: z.string().optional().default("default").describe("Machine identifier"),
  }),

  wedm_online_predict: z.object({
    material: z.string().describe("Material name"),
    parameters: WEDMParametersSchema.describe("Parameters to predict outcomes for"),
    thickness: z.number().positive().describe("Workpiece thickness in mm"),
    machine_id: z.string().optional().default("default").describe("Machine identifier"),
  }),

  wedm_online_update: z.object({
    feedback: ProductionFeedbackSchema.describe("Production feedback entry"),
  }),

  wedm_online_batch_update: z.object({
    feedback_list: z.array(ProductionFeedbackSchema).min(1).describe("Batch of feedback entries"),
  }),

  wedm_online_stats: z.object({
    material: z.string().describe("Material name"),
    machine_id: z.string().optional().default("default").describe("Machine identifier"),
  }),

  wedm_online_state: z.object({
    material: z.string().describe("Material name"),
    machine_id: z.string().optional().default("default").describe("Machine identifier"),
  }),

  wedm_online_reset: z.object({
    material: z.string().describe("Material name"),
    machine_id: z.string().optional().default("default").describe("Machine identifier"),
  }),

  wedm_online_export: z.object({
    material: z.string().describe("Material name"),
    machine_id: z.string().optional().default("default").describe("Machine identifier"),
  }),

  wedm_online_import: z.object({
    model_id: z.string().describe("Model identifier (material_machineId)"),
    state: ModelStateSchema.describe("Model state to import"),
    history: z.array(ProductionFeedbackSchema).optional().describe("Historical feedback"),
  }),

  wedm_online_list: z.object({}).describe("List all active models"),

  wedm_online_drift: z.object({
    material: z.string().describe("Material name"),
    machine_id: z.string().optional().default("default").describe("Machine identifier"),
  }),
};
