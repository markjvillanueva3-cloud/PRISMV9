/**
 * Zod schemas for WEDM Wire Tension Optimizer actions (WEDM-BIZ-MS0 / U-WB05)
 * @description Optimal wire tension for geometry + material complexity
 */
import { z } from 'zod';

const GeometryComplexitySchema = z.enum([
  "simple",
  "moderate",
  "complex",
  "ultra_precision",
]).describe('Geometry complexity class');

const TensionOptimizerInputSchema = z.object({
  wire_material: z.string().describe('Wire electrode material'),
  wire_diameter_mm: z.number().positive().describe('Wire diameter [mm]'),
  workpiece_material: z.string().describe('Workpiece material'),
  thickness_mm: z.number().positive().describe('Workpiece thickness / wire span [mm]'),
  geometry_complexity: GeometryComplexitySchema.optional(),
  corner_count: z.number().int().min(0).optional().describe('Corners in profile'),
  min_corner_radius_mm: z.number().min(0).optional().describe('Smallest inside radius [mm]'),
  taper_angle_deg: z.number().optional().describe('Taper angle [deg]'),
  peak_current_A: z.number().positive().describe('Peak current [A]'),
  pulse_on_us: z.number().positive().describe('Pulse on-time [µs]'),
  duty_cycle: z.number().min(0.001).max(1).describe('Duty cycle'),
  force_per_amp: z.number().positive().optional().describe('Discharge force per amp [N/A]'),
  target_life_min: z.number().positive().optional().describe('Target wire life [min]'),
});

const CompareScenariosInputSchema = z.object({
  scenarios: z.array(z.object({
    name: z.string(),
    input: TensionOptimizerInputSchema,
  })).min(1).describe('List of scenarios to compare'),
});

export const WEDM_WIRE_TENSION_OPT_SCHEMAS: Record<string, z.ZodTypeAny> = {
  wedm_wire_tension_optimize: TensionOptimizerInputSchema,
  wedm_wire_tension_compare_scenarios: CompareScenariosInputSchema,
};
