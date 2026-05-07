/**
 * Zod schemas for WEDM ML Parameter Optimizer actions
 * @milestone WEDM-NEXT-MS0
 * @unit U-WN01
 */
import { z } from 'zod';

const ParameterBoundsSchema = z.object({
  gapVoltage: z.object({ min: z.number(), max: z.number() }).optional(),
  wireTension: z.object({ min: z.number(), max: z.number() }).optional(),
  flushingPressure: z.object({ min: z.number(), max: z.number() }).optional(),
  pulseOnTime: z.object({ min: z.number(), max: z.number() }).optional(),
  pulseOffTime: z.object({ min: z.number(), max: z.number() }).optional(),
  wireSpeed: z.object({ min: z.number(), max: z.number() }).optional(),
});

const ParameterSetSchema = z.object({
  gapVoltage: z.number(),
  wireTension: z.number(),
  flushingPressure: z.number(),
  pulseOnTime: z.number(),
  pulseOffTime: z.number(),
  wireSpeed: z.number(),
});

const ObjectiveSchema = z.object({
  type: z.enum(['mrr', 'surface_quality', 'wire_consumption', 'energy', 'multi']),
  weights: z.object({
    mrr: z.number().optional(),
    surfaceRa: z.number().optional(),
    wireConsumption: z.number().optional(),
    energyConsumption: z.number().optional(),
  }).optional(),
  constraints: z.object({
    maxRa: z.number().optional(),
    minMRR: z.number().optional(),
    maxWireBreakRisk: z.number().optional(),
  }).optional(),
});

const ObservationSchema = z.object({
  parameters: ParameterSetSchema,
  outcomes: z.object({
    mrr: z.number(),
    surfaceRa: z.number(),
    wireConsumption: z.number(),
    energyConsumption: z.number(),
    wireBreakOccurred: z.boolean(),
  }),
  timestamp: z.string(),
  material: z.string(),
  thickness: z.number(),
});

export const WEDM_ML_OPTIMIZER_SCHEMAS: Record<string, z.ZodTypeAny> = {
  wedm_ml_optimize_init: z.object({
    material: z.string().describe('Workpiece material (e.g., steel, aluminum, titanium)'),
    thickness: z.number().positive().describe('Workpiece thickness in mm'),
    objective: ObjectiveSchema.describe('Optimization objective (mrr, surface_quality, etc.)'),
    bounds: ParameterBoundsSchema.optional().describe('Optional custom parameter bounds'),
    prior_observations: z.array(ObservationSchema).optional().describe('Prior cutting observations for warm start'),
  }),

  wedm_ml_optimize_observe: z.object({
    session_id: z.string().uuid().describe('Optimization session ID'),
    observation: ObservationSchema.describe('Observed cutting results'),
  }),

  wedm_ml_optimize_status: z.object({
    session_id: z.string().uuid().describe('Optimization session ID'),
  }),

  wedm_ml_optimize_close: z.object({
    session_id: z.string().uuid().describe('Optimization session ID to close'),
  }),
};
