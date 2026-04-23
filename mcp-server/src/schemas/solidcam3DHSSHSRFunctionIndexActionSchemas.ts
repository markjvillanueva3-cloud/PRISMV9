/**
 * SolidCAM 3D HSS/HSR Function Index Action Schemas
 * @see CAM-EXHAUST-MS0 U-CAM35
 */
import { z } from "zod";

export const ACTION_SOLIDCAM_3D_HSS_HSR_FUNCTION_INDEX_SCHEMAS: Record<string, z.ZodType> = {
  solidcam_3d_hss_hsr_index: z.object({}).describe("Get the complete SolidCAM 3D HSS/HSR section"),
  solidcam_3d_hss_hsr_summary: z.object({}).describe("Get SolidCAM 3D HSS/HSR summary statistics"),
  solidcam_3d_hss_hsr_list_ops: z.object({}).describe("List all SolidCAM 3D HSS/HSR operations"),
  solidcam_3d_hss_hsr_get_op: z.object({
    operation_id: z.string().describe("Operation ID (e.g., hsr_roughing | hss_constant_z | hss_3d_stepover)"),
  }).describe("Get a specific SolidCAM 3D HSS/HSR operation by ID"),
  solidcam_3d_hss_hsr_by_category: z.object({
    category: z.string().describe("Category (roughing | finishing_z_level | finishing_planar | finishing_specialty)"),
  }).describe("Get SolidCAM 3D HSS/HSR operations by category"),
  solidcam_3d_hss_hsr_find_param: z.object({
    parameter_name: z.string().describe("Partial parameter name to find"),
    limit: z.number().optional().describe("Max results"),
  }).describe("Search parameters by name"),
  solidcam_3d_hss_hsr_recommend: z.object({
    wall_angle_deg: z.number().describe("Surface inclination 0=horizontal, 90=vertical"),
    geometry_hint: z.enum(["rotational", "freeform", "planar", "boundary"]).optional().describe("Optional geometry classification"),
  }).describe("Recommend an HSS/HSR strategy from wall angle + geometry hint"),
  solidcam_3d_hss_hsr_step_from_scallop: z.object({
    tool_radius_mm: z.number().describe("Ball-end tool radius (mm)"),
    scallop_height_mm: z.number().describe("Target scallop height (mm)"),
  }).describe("Compute step-over (mm) from target scallop height"),
};
