/**
 * CAMX-MS10 U01 Action Schemas — Zod v4
 *
 * 2 dispatcher actions (MastercamToolExportEngine E1123):
 *   mastercam_tool_export      — export PRISM tool catalog in Mastercam format
 *   mastercam_tool_export_job  — export job-specific tool subset
 */

import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

// ── Shared sub-schemas ─────────────────────────────────────────────────────────

const isoGroupZ = z.enum(["H", "K", "M", "N", "P", "S"]).describe(
  "ISO material group: P=Steel, M=Stainless, K=Cast Iron, N=Non-Ferrous, S=Superalloy, H=Hardened",
);

const toolTypeZ = z.enum([
  "ball", "boring_bar", "bull", "chamfer", "drill", "endmill",
  "face", "form", "reamer", "spot_drill", "tap", "thread_mill",
]).describe("Mastercam tool type classification");

const toolMaterialZ = z.enum([
  "carbide", "cbn", "ceramic", "cermet", "hss", "pcd",
]).describe("Tool substrate material");

const formatZ = z.enum(["json", "mcam-operations", "mcam-tools"])
  .optional()
  .default("mcam-tools")
  .describe("Output format: mcam-tools (default) | mcam-operations | json");

const filterZ = z.object({
  manufacturer: z.string().optional().describe(
    "Filter by manufacturer name (partial match, case-insensitive)",
  ),
  tool_type: toolTypeZ.optional().describe("Filter by tool type"),
  diameter_range_mm: z.tuple([
    z.number().positive().describe("Minimum diameter, mm"),
    z.number().positive().describe("Maximum diameter, mm"),
  ]).optional().describe("Diameter range [min, max] in mm"),
  tool_material: toolMaterialZ.optional().describe("Filter by tool substrate material"),
  iso_group: isoGroupZ.optional().describe(
    "Optimize cutting data for this ISO group (default: all 6 groups)",
  ),
  max_per_library: z.number().int().positive().max(10000).optional().default(2000).describe(
    "Max tools per library partition (default 2000; large catalogs create multiple partitions)",
  ),
  max_tools: z.number().int().positive().max(100000).optional().default(5000).describe(
    "Overall tool count cap (default 5000)",
  ),
}).passthrough().describe("Export filter criteria");

// ── Job tool descriptor ────────────────────────────────────────────────────────

const jobToolZ = z.object({
  type: toolTypeZ.optional().describe("Required tool type"),
  diameter_mm: z.number().positive().optional().describe("Required cutting diameter, mm"),
  flutes: z.number().int().positive().optional().describe("Number of flutes"),
  manufacturer: z.string().optional().describe("Preferred manufacturer"),
  part_number: z.string().optional().describe("Specific part number (exact catalog match)"),
  iso_group: isoGroupZ.optional().describe(
    "Primary ISO group for this tool's cutting data (default: all)",
  ),
}).passthrough().describe("Job-required tool descriptor");

// ── Export cutting data tool descriptor ───────────────────────────────────────

const cuttingDataToolZ = z.object({
  diameter_mm: z.number().positive().describe("Tool cutting diameter, mm"),
  type: toolTypeZ.optional().describe("Tool type"),
  flutes: z.number().int().positive().optional().describe("Number of flutes"),
  coating: z.string().optional().describe(
    "Coating identifier: TiN | TiCN | TiAlN | AlTiN | AlCrN | DLC | diamond | uncoated",
  ),
  tool_material: toolMaterialZ.optional().describe("Tool substrate material"),
  manufacturer: z.string().optional().describe("Manufacturer name"),
  part_number: z.string().optional().describe("Part number"),
}).passthrough().describe("Tool descriptor for cutting data export");

// ── Action Schemas ─────────────────────────────────────────────────────────────

export const ACTION_CAMX_MS10_U01_SCHEMAS: ActionSchemaMap = {
  mastercam_tool_export: z.object({
    filter: filterZ.optional().describe(
      "Filter criteria. Omit for full catalog export (partitioned by manufacturer).",
    ),
    format: formatZ,
    include_cutting_data: z.boolean().optional().default(true).describe(
      "Include per-material cutting data tables (Vc, fz, ap, ae, RPM, feed). Default true.",
    ),
    cutting_data_materials: z.array(isoGroupZ).optional().describe(
      "ISO groups to include in cutting data (default: all 6). Use to reduce output size.",
    ),
  }),

  mastercam_tool_export_job: z.object({
    job_tools: z.array(jobToolZ).min(1).max(500).describe(
      "List of tools required for this job. Each entry resolves against the PRISM catalog.",
    ),
    format: formatZ,
    cutting_data_materials: z.array(isoGroupZ).optional().describe(
      "ISO groups for cutting data. Default: all 6 groups.",
    ),
  }),
};
