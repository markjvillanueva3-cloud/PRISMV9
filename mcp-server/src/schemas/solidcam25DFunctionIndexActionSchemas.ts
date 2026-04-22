/**
 * SolidCAM 2.5D Function Index Action Schemas
 * @see CAM-EXHAUST-MS0 U-CAM33
 */
import { z } from "zod";

export const ACTION_SOLIDCAM_25D_FUNCTION_INDEX_SCHEMAS: Record<string, z.ZodType> = {
  solidcam_25d_index: z.object({}).describe("Get the complete SolidCAM 2.5D operations index"),
  solidcam_25d_summary: z.object({}).describe("Get SolidCAM 2.5D summary statistics"),
  solidcam_25d_list_ops: z.object({}).describe("List all SolidCAM 2.5D operations"),
  solidcam_25d_get_op: z.object({
    operation_id: z.string().describe("Operation ID (e.g., profile_2d, pocket_2d, imachining_2d)"),
  }).describe("Get a specific SolidCAM 2.5D operation by ID"),
  solidcam_25d_by_category: z.object({
    category: z.string().describe("Category to filter (roughing, finishing, holemaking, threading)"),
  }).describe("Get SolidCAM 2.5D operations by category"),
  solidcam_25d_imachining: z.object({}).describe("Get iMachining 2D specific parameters and operation details"),
};
