/**
 * Zod schemas for WEDM Gap Voltage Control actions (WEDM-BIZ-MS0)
 * @description Schema definitions for gap voltage dynamics, discharge probability,
 * and servo optimization
 */
import { z } from 'zod';

const DielectricTypeSchema = z.enum([
  "deionized_water",
  "tap_water",
  "oil_based",
  "synthetic",
  "kerosene",
]).describe('Dielectric fluid type');

const GapVoltageInputSchema = z.object({
  dielectric_type: DielectricTypeSchema,
  debris_ppm: z.number().min(0).describe('Debris concentration in ppm'),
  gap_distance_um: z.number().positive().describe('Wire-workpiece gap in µm'),
  peak_current_A: z.number().positive().optional().describe('Peak current in Amperes'),
  pulse_on_us: z.number().positive().optional().describe('Pulse on-time in microseconds'),
  workpiece_material: z.string().optional().describe('Workpiece material for debris behavior'),
});

const ServoOptimizationInputSchema = z.object({
  target_discharge_probability: z.number().min(0.5).max(0.99).describe('Target discharge probability (0.5-0.99)'),
  dielectric_type: DielectricTypeSchema,
  max_debris_ppm: z.number().min(0).default(100).describe('Maximum expected debris concentration'),
});

const DielectricComparisonInputSchema = z.object({
  debris_ppm: z.number().min(0).describe('Debris concentration in ppm'),
  gap_distance_um: z.number().positive().describe('Wire-workpiece gap in µm'),
});

export const WEDM_GAP_VOLTAGE_SCHEMAS: Record<string, z.ZodTypeAny> = {
  wedm_gap_voltage: GapVoltageInputSchema,
  wedm_gap_voltage_validate: GapVoltageInputSchema,
  wedm_gap_voltage_optimize_servo: ServoOptimizationInputSchema,
  wedm_gap_voltage_compare_dielectrics: DielectricComparisonInputSchema,
  wedm_gap_voltage_list_dielectrics: z.object({}).describe('No parameters required'),
};
