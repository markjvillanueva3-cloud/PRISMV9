/**
 * Zod schemas for WEDM Wire Stress Analysis actions (WEDM-BIZ-MS0 / U-WB04)
 * @description Combined mechanical fatigue + thermal stress analysis for wire electrodes
 */
import { z } from 'zod';

const WireMaterialSchema = z.enum([
  "brass_cuzn37",
  "brass_cuzn40",
  "coated_brass",
  "zinc_coated",
  "diffusion_annealed",
  "molybdenum",
  "tungsten",
]).describe('Wire electrode material');

const WireStressInputSchema = z.object({
  wire_material: z.union([WireMaterialSchema, z.string()]).describe('Wire electrode material'),
  wire_diameter_mm: z.number().positive().describe('Wire diameter [mm]'),
  tension_N: z.number().min(0).describe('Applied wire tension [N]'),
  wire_span_mm: z.number().positive().describe('Wire span between guides [mm]'),
  peak_current_A: z.number().positive().describe('Peak discharge current [A]'),
  pulse_on_us: z.number().positive().describe('Pulse on-time [µs]'),
  duty_cycle: z.number().min(0.001).max(1).describe('Duty cycle (0-1]'),
  temp_rise_K: z.number().min(0).optional().describe('Wire temperature rise [K]'),
  cumulative_cut_time_min: z.number().min(0).optional().describe('Cumulative cut time [min]'),
  wire_feed_m_min: z.number().positive().optional().describe('Wire feed speed [m/min]'),
  ambient_temp_C: z.number().optional().describe('Ambient temperature [°C]'),
});

const TensionOptimizationInputSchema = z.object({
  wire_material: z.union([WireMaterialSchema, z.string()]).describe('Wire electrode material'),
  wire_diameter_mm: z.number().positive().describe('Wire diameter [mm]'),
  wire_span_mm: z.number().positive().describe('Wire span [mm]'),
  peak_current_A: z.number().positive().describe('Peak current [A]'),
  pulse_on_us: z.number().positive().describe('Pulse on-time [µs]'),
  duty_cycle: z.number().min(0.001).max(1).describe('Duty cycle (0-1]'),
  target_life_min: z.number().positive().optional().describe('Target wire life [min]'),
});

const DamageAccumulationInputSchema = z.object({
  segments: z.array(z.object({
    input: WireStressInputSchema,
    duration_min: z.number().positive().describe('Segment duration [min]'),
  })).min(1).describe('Load history segments'),
});

export const WEDM_WIRE_STRESS_SCHEMAS: Record<string, z.ZodTypeAny> = {
  wedm_wire_stress_analyze: WireStressInputSchema,
  wedm_wire_stress_optimize_tension: TensionOptimizationInputSchema,
  wedm_wire_stress_accumulate_damage: DamageAccumulationInputSchema,
};
