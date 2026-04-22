/**
 * Zod schemas for WEDM MRR Physics actions (WEDM-BIZ-MS0)
 * @description Schema definitions for MRR calculation, cut time estimation,
 * material comparison, and parameter optimization
 */
import { z } from 'zod';

const WorkpieceMaterialSchema = z.enum([
  "steel",
  "stainless",
  "aluminum",
  "titanium",
  "tungsten_carbide",
  "inconel",
  "copper",
  "pcd",
]).describe('Workpiece material type');

const WireMaterialSchema = z.enum([
  "brass",
  "zinc_coated",
  "diffusion_annealed",
  "molybdenum",
  "tungsten",
]).describe('Wire electrode material');

const ServoSettingsSchema = z.object({
  targetGapVoltage_V: z.number().positive().optional().describe('Servo target gap voltage [V]'),
  adaptiveGain: z.number().min(0.1).max(1.0).optional().describe('Servo response gain [0.1-1.0]'),
  feedOverride_percent: z.number().min(1).max(200).optional().describe('Manual feed override [%]'),
}).optional().describe('Servo control settings');

const MRRInputSchema = z.object({
  material: z.union([WorkpieceMaterialSchema, z.string()]).describe('Workpiece material'),
  thickness_mm: z.number().positive().describe('Workpiece thickness [mm]'),
  wire_type: WireMaterialSchema.optional().describe('Wire electrode type'),
  wire_diameter_mm: z.number().positive().optional().describe('Wire diameter [mm], default 0.25'),
  pulse_on_us: z.number().positive().describe('Pulse on-time [µs]'),
  pulse_off_us: z.number().positive().describe('Pulse off-time [µs]'),
  current_A: z.number().positive().describe('Peak current [A]'),
  voltage_V: z.number().positive().optional().describe('Gap voltage [V]'),
  servo: ServoSettingsSchema,
  flushing_pressure_bar: z.number().min(0).optional().describe('Flushing pressure [bar]'),
});

const CutTimeInputSchema = MRRInputSchema.extend({
  profile_length_mm: z.number().positive().describe('Total profile/cut length [mm]'),
  num_skim_passes: z.number().int().min(0).max(5).optional().describe('Number of skim passes (0-5)'),
  num_start_holes: z.number().int().min(0).optional().describe('Number of start holes to thread'),
  include_setup: z.boolean().optional().describe('Include setup time overhead'),
});

const CompareMaterialsInputSchema = z.object({
  materials: z.array(WorkpieceMaterialSchema).min(1).describe('Materials to compare'),
  thickness_mm: z.number().positive().describe('Workpiece thickness [mm]'),
  pulse_on_us: z.number().positive().describe('Pulse on-time [µs]'),
  pulse_off_us: z.number().positive().describe('Pulse off-time [µs]'),
  current_A: z.number().positive().describe('Peak current [A]'),
});

const OptimizeInputSchema = z.object({
  target_mrr_mm3_min: z.number().positive().describe('Target MRR [mm³/min]'),
  material: WorkpieceMaterialSchema,
  thickness_mm: z.number().positive().describe('Workpiece thickness [mm]'),
  max_current_A: z.number().positive().optional().describe('Maximum allowed current [A]'),
  max_pulse_on_us: z.number().positive().optional().describe('Maximum pulse on-time [µs]'),
  min_surface_finish: z.boolean().optional().describe('Optimize for surface finish'),
});

const ValidateInputSchema = MRRInputSchema.extend({
  measured_mrr_mm3_min: z.number().positive().describe('Measured MRR to validate against [mm³/min]'),
});

export const WEDM_MRR_SCHEMAS: Record<string, z.ZodTypeAny> = {
  wedm_mrr_calculate: MRRInputSchema,
  wedm_mrr_cut_time: CutTimeInputSchema,
  wedm_mrr_compare_materials: CompareMaterialsInputSchema,
  wedm_mrr_optimize: OptimizeInputSchema,
  wedm_mrr_validate: ValidateInputSchema,
  wedm_mrr_list_materials: z.object({}).describe('No parameters required'),
  wedm_mrr_list_wires: z.object({}).describe('No parameters required'),
};
