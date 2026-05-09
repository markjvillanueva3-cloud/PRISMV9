/**
 * Zod schemas for prism_resource_harvester dispatcher actions
 * RES-MS0: Resource harvesting pipeline
 */
import { z } from "zod";

export const ACTION_RESOURCE_HARVESTER_SCHEMAS: Record<string, z.ZodObject<any>> = {
  scan_folder: z.object({
    path: z.string().describe("Root folder path to scan (default: H:/prism/resources/)"),
    recursive: z.boolean().optional().describe("Scan subdirectories recursively (default: true)"),
    max_depth: z.number().optional().describe("Maximum recursion depth (default: 10)"),
  }),
  classify_file: z.object({
    file_path: z.string().describe("Path to file to classify"),
  }),
  get_index: z.object({
    filter_type: z.string().optional().describe("Filter by file type (pdf, cps, step, cyc, js, min, etc.)"),
    filter_domain: z.string().optional().describe("Filter by domain (tooling, machine, training, formula, cam_project, etc.)"),
    limit: z.number().optional().describe("Max results to return (default: 100)"),
  }),
  start_harvest: z.object({
    source_path: z.string().describe("Root path to harvest from"),
    file_types: z.array(z.string()).optional().describe("File types to harvest (default: all supported)"),
    dry_run: z.boolean().optional().describe("Preview harvest without writing (default: false)"),
  }),
  harvest_status: z.object({
    harvest_id: z.string().optional().describe("Specific harvest run ID (default: latest)"),
  }),
  harvest_resume: z.object({
    harvest_id: z.string().describe("Harvest run ID to resume"),
  }),

  // OBSIDIAN-AUTOMATE-MS3/U-JM-EXPOSE-2: surface JM Die Mill Harvest + Harvester + Inventory engines
  jm_mill_harvest: z.object({}).describe("Run JMDieMillProgramHarvestEngine.harvest (deep async harvest of CNC MILL HAAS archive)"),

  jm_mill_harvest_customer_recs: z.object({
    customer: z.string().min(1).describe("Customer folder name (e.g. ALCOA, ITW, FONTANA)"),
  }).describe("Get customer-specific harvest recommendations (HarvestEngine.getCustomerRecommendations)"),

  jm_mill_harvest_predict_tool: z.object({
    operation: z.string().min(1).describe("Operation name (rough, drill, finish, tap, etc.)"),
    material_iso: z.string().min(1).describe("ISO material group (P, M, K, N, S, H)"),
    diameter_mm: z.number().positive().optional().describe("Optional tool diameter (mm)"),
  }).describe("Predict tool from harvested patterns (HarvestEngine.predictTool)"),

  jm_mill_get_tool_rec: z.object({
    material: z.string().optional().describe("Material code or family"),
    feature: z.string().optional().describe("Feature type (pocket, slot, hole, contour)"),
    customer: z.string().optional().describe("Customer name filter"),
  }).describe("Get tool recommendation from HarvesterEngine.getToolRecommendation"),

  jm_mill_get_op_sequence: z.object({
    feature_type: z.string().min(1).describe("Feature type (pocket, slot, hole, contour, etc.)"),
  }).describe("Get operation sequence for a feature (HarvesterEngine.getOperationSequence)"),

  jm_mill_get_speeds_feeds: z.object({
    material: z.string().min(1).describe("Material code or family (e.g. AL6061, 17-4PH)"),
  }).describe("Get speeds/feeds recommendation by material (HarvesterEngine.getSpeedsFeedsRecommendation)"),

  jm_mill_get_tribal_tips: z.object({}).describe("Get all tribal tips harvested from JM Die mill programs (HarvesterEngine.getAllTribalTips)"),

  jm_mill_get_customers: z.object({}).describe("List all JM Die mill customers (HarvesterEngine.getCustomers)"),

  jm_program_inventory_scan: z.object({
    root_path: z.string().optional().describe("Root path to scan (default: JM Die root)"),
    max_depth: z.number().int().positive().optional().describe("Max recursion depth (default 10)"),
  }).describe("Scan JM Die archive for program inventory (JMDieProgramInventoryEngine.scan)"),

  jm_program_inventory_stats: z.object({
    root_path: z.string().optional().describe("Root path (default: JM Die root)"),
  }).describe("Quick stats over JM Die program inventory (InventoryEngine.getQuickStats)"),

  jm_program_find_by_customer: z.object({
    customer: z.string().min(1).describe("Customer name (case-insensitive)"),
  }).describe("Find programs by customer (InventoryEngine.findByCustomer)"),

  jm_program_find_by_controller: z.object({
    controller: z.string().min(1).describe("Controller family (Fanuc, Haas, Okuma, Mazak, etc.)"),
  }).describe("Find programs by controller (InventoryEngine.findByController)"),

  jm_program_find_by_type: z.object({
    program_type: z.string().min(1).describe("Program type (mill, lathe, edm, etc.)"),
  }).describe("Find programs by type (InventoryEngine.findByType)"),
};
