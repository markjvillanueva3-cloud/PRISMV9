/**
 * Fusion360 Function Index Action Schemas
 * @see CAM-EXHAUST-MS0 U-CAM25
 */
import { z } from "zod";

export const ACTION_FUSION360_FUNCTION_INDEX_SCHEMAS: Record<string, z.ZodType> = {
  fusion360_function_index_get: z.object({}).describe("Get the Fusion 360 function index"),
  fusion360_function_index_list_modules: z.object({}).describe("List all Fusion 360 CAM modules"),
  fusion360_function_index_get_module: z.object({
    module_id: z.string().describe("Module ID to retrieve"),
  }).describe("Get a specific Fusion 360 CAM module"),
  fusion360_function_index_list_toolpaths: z.object({}).describe("List all Fusion 360 toolpaths"),
  fusion360_function_index_find_parameter: z.object({
    parameter_name: z.string().describe("Parameter name to find"),
  }).describe("Find a parameter by name"),
  fusion360_function_index_search_parameters: z.object({
    query: z.string().describe("Search query"),
    limit: z.number().optional().describe("Max results"),
  }).describe("Search parameters by partial match"),
  fusion360_function_index_get_toolpaths_by_category: z.object({
    category: z.string().describe("Category to filter (2d, 3d, multiaxis, turning)"),
  }).describe("Get toolpaths by category"),
  fusion360_function_index_get_summary: z.object({}).describe("Get index summary"),
  fusion360_function_index_get_hsm_toolpaths: z.object({}).describe("Get HSM-capable toolpaths"),
  fusion360_function_index_get_mfg_ext_toolpaths: z.object({}).describe("Get Manufacturing Extension toolpaths"),
};
