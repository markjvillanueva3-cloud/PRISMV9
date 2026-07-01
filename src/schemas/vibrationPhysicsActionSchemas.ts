/**
 * Auto-generated Zod action schemas for vibrationPhysicsDispatcher
 * Generated: 2026-04-04
 */
import { z } from "zod";

export const ACTION_VIBRATION_PHYSICS_SCHEMAS: Record<string, z.ZodObject<any>> = {
  "burr": z.object({}).passthrough(),
  "burr_formation_calculate": z.object({}).passthrough(),
  "calculation": z.object({}).passthrough(),
  "centerless_grinding_calculate": z.object({}).passthrough(),
  "chatter": z.object({}).passthrough(),
  "chip_conveyor_calculate": z.object({}).passthrough(),
  "cutter_contact_calculate": z.object({}).passthrough(),
  "dampening": z.object({}).passthrough(),
  "fourier": z.object({}).passthrough(),
  "fourier_analysis": z.object({}).passthrough(),
  "grinding_wheel_calculate": z.object({}).passthrough(),
  "isolation": z.object({}).passthrough(),
  "post_processor_generate": z.object({}).passthrough(),
  "regenerative_chatter_predict": z.object({}).passthrough(),
  "surface_finish_calculate": z.object({ ra_target: z.number().optional(), tool_nose_radius: z.number().optional(), feed_per_rev: z.number().optional() }).passthrough(),
  "surface_grinding_calculate": z.object({ ra_target: z.number().optional(), tool_nose_radius: z.number().optional(), feed_per_rev: z.number().optional() }).passthrough(),
  "tap_drill_calculate": z.object({}).passthrough(),
  "tribology": z.object({}).passthrough(),
  "tribology_calculate": z.object({}).passthrough(),
  "vam_calculate": z.object({}).passthrough(),
  "vibration_dampening_calculate": z.object({ material: z.string().optional(), tool_diameter: z.number().optional(), depth_of_cut: z.number().optional(), feed_rate: z.number().optional(), cutting_speed: z.number().optional() }).passthrough(),
  "vibration_isolation_calculate": z.object({ material: z.string().optional(), tool_diameter: z.number().optional(), depth_of_cut: z.number().optional(), feed_rate: z.number().optional(), cutting_speed: z.number().optional() }).passthrough(),
  "wavelet": z.object({}).passthrough(),
  "wavelet_analysis": z.object({}).passthrough(),
};
