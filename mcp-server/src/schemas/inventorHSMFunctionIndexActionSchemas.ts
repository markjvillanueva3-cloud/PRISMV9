/**
 * Inventor HSM Function Index Action Schemas
 * @see CAM-EXHAUST-MS0 U-CAM26
 */
import { z } from "zod";

export const ACTION_INVENTOR_HSM_FUNCTION_INDEX_SCHEMAS: Record<string, z.ZodType> = {
  inventor_hsm_function_index_get: z.object({}).describe("Get the Inventor HSM function index"),
  inventor_hsm_function_index_list_sections: z.object({}).describe("List all Inventor HSM sections"),
  inventor_hsm_function_index_get_section: z.object({
    section_key: z.string().describe("Section key to retrieve (e.g., '2.5d_milling')"),
  }).describe("Get a specific Inventor HSM section"),
  inventor_hsm_function_index_list_operations: z.object({}).describe("List all Inventor HSM operations"),
  inventor_hsm_function_index_find_parameter: z.object({
    parameter_name: z.string().describe("Parameter name to find"),
  }).describe("Find a parameter by name"),
  inventor_hsm_function_index_search_parameters: z.object({
    query: z.string().describe("Search query"),
    limit: z.number().optional().describe("Max results (default 20)"),
  }).describe("Search parameters by partial match"),
  inventor_hsm_function_index_get_operations_by_category: z.object({
    category: z.string().describe("Category to filter (roughing, finishing, holemaking)"),
  }).describe("Get operations by category"),
  inventor_hsm_function_index_get_summary: z.object({}).describe("Get index summary"),
  inventor_hsm_function_index_get_hsm_operations: z.object({}).describe("Get HSM/adaptive operations"),
  inventor_hsm_function_index_get_25d_operations: z.object({}).describe("Get 2.5D milling operations"),
};
