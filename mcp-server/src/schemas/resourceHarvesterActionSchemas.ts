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
};
