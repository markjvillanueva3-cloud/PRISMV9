/**
 * Zod schemas for WEDM Spark Erosion Model actions (WEDM-BIZ-MS0)
 * @description Schema definitions for DiBitonto-Sato hybrid spark erosion physics
 * including crater geometry, MRR, Ra surface roughness, and cut time prediction
 */
import { z } from 'zod';

const SparkErosionInputSchema = z.object({
  material: z.string().describe('Workpiece material (steel, aluminum, titanium, tungsten_carbide, etc.)'),
  thickness_mm: z.number().positive().describe('Workpiece thickness in mm'),
  pulse_on_us: z.number().positive().describe('Pulse on-time in microseconds'),
  pulse_off_us: z.number().positive().describe('Pulse off-time in microseconds'),
  current_A: z.number().positive().describe('Discharge current in Amperes'),
  voltage_V: z.number().positive().optional().describe('Arc voltage in Volts (default 25V)'),
  wire_diameter_mm: z.number().positive().optional().describe('Wire diameter in mm (default 0.25mm)'),
});

const MaterialCompareInputSchema = z.object({
  materials: z.array(z.string()).min(1).describe('List of materials to compare'),
  thickness_mm: z.number().positive().describe('Workpiece thickness in mm'),
  pulse_on_us: z.number().positive().describe('Pulse on-time in microseconds'),
  pulse_off_us: z.number().positive().describe('Pulse off-time in microseconds'),
  current_A: z.number().positive().describe('Discharge current in Amperes'),
});

const CutTimeInputSchema = z.object({
  material: z.string().describe('Workpiece material'),
  thickness_mm: z.number().positive().describe('Workpiece thickness in mm'),
  pulse_on_us: z.number().positive().describe('Pulse on-time in microseconds'),
  pulse_off_us: z.number().positive().describe('Pulse off-time in microseconds'),
  current_A: z.number().positive().describe('Discharge current in Amperes'),
  cut_length_mm: z.number().positive().describe('Total cut length in mm'),
  wire_diameter_mm: z.number().positive().optional().describe('Wire diameter in mm (default 0.25mm)'),
});

export const WEDM_SPARK_EROSION_SCHEMAS: Record<string, z.ZodTypeAny> = {
  wedm_spark_erosion: SparkErosionInputSchema,
  wedm_spark_erosion_compare: MaterialCompareInputSchema,
  wedm_spark_erosion_validate: SparkErosionInputSchema,
  wedm_spark_erosion_cut_time: CutTimeInputSchema,
};
