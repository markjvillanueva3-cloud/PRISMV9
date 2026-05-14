/**
 * Zod schemas for prism_resource_harvesting dispatcher actions.
 * RESOURCE-HARVEST-MS1: AutomatedResourceHarvestingPipeline wiring.
 */
import { z } from "zod";

// ── Shared sub-schemas ────────────────────────────────────────

const ResourceType = z.enum(["pdf", "video", "mit_course", "cam_file", "nc_program"])
  .describe("Resource type to target");

// ── Action schemas ────────────────────────────────────────────

export const HarvestScanSchema = z.object({}).describe(
  "No params required — scans all resource directories and returns counts by type"
);

export const HarvestStartSchema = z.object({
  types: z.array(ResourceType).optional()
    .describe("Limit harvest to specific resource types (default: all)"),
  domains: z.array(z.string()).optional()
    .describe("Limit harvest to specific domain tags (e.g. cam_hypermill, controller_haas)"),
  limit: z.number().int().positive().optional()
    .describe("Maximum number of resources to process in this run"),
}).describe("Start a full automated harvesting run across all resource directories");

export const HarvestProgressSchema = z.object({}).describe(
  "No params required — returns current progress counters and percent complete"
);

export const HarvestStatusSchema = z.object({}).describe(
  "No params required — returns whether a harvest is currently running"
);

export const HarvestJobsSchema = z.object({
  status: z.enum(["pending", "scanning", "extracting", "ingesting", "complete", "failed"]).optional()
    .describe("Filter jobs by status (default: return all jobs)"),
  limit: z.number().int().positive().optional()
    .describe("Maximum number of jobs to return (default: all)"),
}).describe("Get all harvest jobs, optionally filtered by status");

export const HarvestResultsSchema = z.object({
  success_only: z.boolean().optional()
    .describe("When true, return only successful results (default: return all)"),
  limit: z.number().int().positive().optional()
    .describe("Maximum number of results to return (default: all)"),
}).describe("Get all harvest results from the current or last completed run");

export const HarvestDryRunSchema = z.object({
  types: z.array(ResourceType).optional()
    .describe("Limit dry-run to specific resource types (default: all)"),
  domains: z.array(z.string()).optional()
    .describe("Limit dry-run to specific domain tags"),
  limit: z.number().int().positive().optional()
    .describe("Maximum number of resources to preview"),
}).describe("Simulate a harvest run — scans and plans jobs without extracting or ingesting");

export const HarvestFilterSchema = z.object({
  types: z.array(ResourceType).optional()
    .describe("Resource types to include in the filtered harvest"),
  domains: z.array(z.string()).optional()
    .describe("Domain tags to include (e.g. cam_hypermill, controller_fanuc, mit_course)"),
  limit: z.number().int().positive().optional()
    .describe("Cap the number of resources processed"),
}).describe("Run a harvest restricted to a specific subset by type, domain, or count");

// ── Schema map for action routing ─────────────────────────────

export const ACTION_RESOURCE_HARVESTING_SCHEMAS: Record<string, z.ZodType> = {
  harvest_scan:     HarvestScanSchema,
  harvest_start:    HarvestStartSchema,
  harvest_progress: HarvestProgressSchema,
  harvest_status:   HarvestStatusSchema,
  harvest_jobs:     HarvestJobsSchema,
  harvest_results:  HarvestResultsSchema,
  harvest_dry_run:  HarvestDryRunSchema,
  harvest_filter:   HarvestFilterSchema,
};
