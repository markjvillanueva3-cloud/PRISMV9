/**
 * Zod schemas for WEDM Feature Importance Engine actions
 * @milestone WEDM-NEXT-MS0
 * @unit U-WN02
 */
import { z } from "zod";

const WEDMDataPointSchema = z.object({
  parameters: z.object({
    gapVoltage: z.number(),
    wireTension: z.number(),
    flushingPressure: z.number(),
    pulseOnTime: z.number(),
    pulseOffTime: z.number(),
    wireSpeed: z.number(),
  }),
  outcomes: z.object({
    mrr: z.number(),
    surfaceRa: z.number(),
    wireConsumption: z.number(),
    energyConsumption: z.number(),
  }),
  material: z.string(),
  thickness: z.number(),
});

const OutcomeSchema = z.enum(["mrr", "surfaceRa", "wireConsumption", "energyConsumption"]);
const FeatureSchema = z.enum(["gapVoltage", "wireTension", "flushingPressure", "pulseOnTime", "pulseOffTime", "wireSpeed"]);

export const WEDM_FEATURE_IMPORTANCE_SCHEMAS: Record<string, z.ZodTypeAny> = {
  wedm_feature_importance: z.object({
    data: z.array(WEDMDataPointSchema).optional().describe("Historical WEDM cutting data points"),
    target_outcome: OutcomeSchema.optional().default("mrr").describe("Outcome to analyze importance for"),
    n_permutations: z.number().int().min(1).max(100).optional().describe("Number of permutations for importance calculation"),
  }),

  wedm_partial_dependence: z.object({
    data: z.array(WEDMDataPointSchema).optional().describe("Historical WEDM cutting data points"),
    feature: FeatureSchema.describe("Feature to compute partial dependence for"),
    outcome: OutcomeSchema.optional().default("mrr").describe("Outcome to analyze"),
    n_points: z.number().int().min(5).max(100).optional().describe("Number of points in PDP curve"),
  }),

  wedm_feature_interactions: z.object({
    data: z.array(WEDMDataPointSchema).optional().describe("Historical WEDM cutting data points"),
    outcome: OutcomeSchema.optional().default("mrr").describe("Outcome to analyze interactions for"),
  }),

  wedm_optimization_guidance: z.object({
    data: z.array(WEDMDataPointSchema).optional().describe("Historical WEDM cutting data points"),
    target_outcome: OutcomeSchema.optional().default("mrr").describe("Outcome to optimize"),
    direction: z.enum(["maximize", "minimize"]).optional().default("maximize").describe("Optimization direction"),
    n_permutations: z.number().int().min(1).max(100).optional().describe("Number of permutations"),
  }),
};
