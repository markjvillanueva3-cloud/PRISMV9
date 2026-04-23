/**
 * SolidCAM iMachining Function Index Action Schemas
 * @see CAM-EXHAUST-MS0 U-CAM34
 */
import { z } from "zod";

export const ACTION_SOLIDCAM_IMACHINING_FUNCTION_INDEX_SCHEMAS: Record<string, z.ZodType> = {
  solidcam_imachining_index: z.object({}).describe("Get the complete SolidCAM iMachining section"),
  solidcam_imachining_summary: z.object({}).describe("Get SolidCAM iMachining summary statistics"),
  solidcam_imachining_list_ops: z.object({}).describe("List all SolidCAM iMachining operations"),
  solidcam_imachining_get_op: z.object({
    operation_id: z.string().describe("Operation ID (imachining_2d_full | imachining_3d | technology_wizard | tool_database)"),
  }).describe("Get a specific SolidCAM iMachining operation by ID"),
  solidcam_imachining_by_category: z.object({
    category: z.string().describe("Category to filter (adaptive_clearing | wizard | database)"),
  }).describe("Get SolidCAM iMachining operations by category"),
  solidcam_imachining_wizard: z.object({}).describe("Get Technology Wizard input and output parameter groups"),
  solidcam_imachining_find_param: z.object({
    parameter_name: z.string().describe("Partial parameter name to find"),
    limit: z.number().optional().describe("Max results"),
  }).describe("Search parameters by name"),
};
