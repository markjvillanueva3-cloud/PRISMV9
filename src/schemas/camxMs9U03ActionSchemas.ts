/**
 * CAMX-MS9 U03 Action Schemas — Zod v4
 *
 * 2 dispatcher actions (HyperMillToolExportEngine E1127):
 *   hypermill_tool_export      — export PRISM tools to hyperMILL .hmt SQLite format
 *   hypermill_tool_export_job  — export a job-specific tool subset to hyperMILL format
 */

import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

// ── Shared sub-schemas ─────────────────────────────────────────────────────────

const hmGeometryClassZ = z.enum([
  "AdditiveDevice",
  "AxialRecessingTool",
  "BackboringTool",
  "Ballmill",
  "BoringBar",
  "ChamferedCutter",
  "ConicalBarrelTool",
  "Drilltool",
  "Endmill",
  "GeneralBarrelTool",
  "GeneralTurningTool",
  "GrindingBit",
  "GunDrill",
  "IndexableHighFeedCutter",
  "IndexableRoundInsertCutter",
  "LensCutter",
  "Lollipop",
  "PartingTool",
  "RadialRecessingTool",
  "Radiusmill",
  "Reamer",
  "RollTurnTool",
  "TSlotCutter",
  "TangentBarrelTool",
  "Tap",
  "ThreadMill",
  "ThreadingTool",
  "TouchProbe",
  "Woodruff",
]).describe("hyperMILL geometry class (29 supported types from sqlite.sql v1.53)");

const toolMaterialZ = z.enum([
  "carbide",
  "cbn",
  "ceramic",
  "cermet",
  "hss",
  "pcd",
]).describe("Tool substrate material");

const exportOptionsZ = z.object({
  include_nctool: z.boolean().optional().default(true).describe(
    "Include NCTools table entries (assembled tool with holder ref). Default true.",
  ),
  include_depot: z.boolean().optional().default(true).describe(
    "Include DepotItems table entries (magazine slot assignments). Default true.",
  ),
  include_materials: z.boolean().optional().default(true).describe(
    "Include Materials table entries (6 ISO groups with Vc/fz factors). Default true.",
  ),
  start_id: z.number().int().positive().optional().default(1).describe(
    "Starting tool_id for the Tools table (default 1).",
  ),
  start_slot: z.number().int().positive().optional().default(1).describe(
    "Starting magazine slot number for DepotItems (default 1).",
  ),
  mm_system_id: z.enum(["1", "2"]).optional().default("1").describe(
    "Unit system: 1=Metric (default), 2=Inch. All PRISM dimensions assumed metric.",
  ),
}).passthrough().describe("hyperMILL export options");

const filterZ = z.object({
  manufacturer: z.string().optional().describe(
    "Filter by manufacturer name (partial match, case-insensitive)",
  ),
  tool_type: z.string().optional().describe(
    "Filter by PRISM tool type (e.g. 'end_mill', 'drill', 'ball_mill')",
  ),
  diameter_range_mm: z.tuple([
    z.number().positive().describe("Minimum diameter, mm"),
    z.number().positive().describe("Maximum diameter, mm"),
  ]).optional().describe("Diameter range [min, max] in mm"),
  tool_material: toolMaterialZ.optional().describe("Filter by tool substrate material"),
  max_tools: z.number().int().positive().max(50000).optional().default(5000).describe(
    "Maximum number of tools to export (default 5000).",
  ),
}).passthrough().describe("Export filter — omit to export full PRISM catalog");

// ── Job tool descriptor ────────────────────────────────────────────────────────

const jobToolZ = z.object({
  type: z.string().optional().describe(
    "PRISM tool type (e.g. 'end_mill', 'drill', 'ball_mill', 'tap')",
  ),
  diameter_mm: z.number().positive().optional().describe("Required cutting diameter, mm"),
  flutes: z.number().int().positive().optional().describe("Number of flutes"),
  manufacturer: z.string().optional().describe("Preferred manufacturer"),
  part_number: z.string().optional().describe("Specific manufacturer part number"),
  corner_radius_mm: z.number().min(0).optional().describe(
    "Corner radius for bull-nose / radiusmill, mm (0 = sharp endmill)",
  ),
  flute_length_mm: z.number().positive().optional().describe("Flute (cutting) length, mm"),
  overall_length_mm: z.number().positive().optional().describe("Overall tool length, mm"),
  material: toolMaterialZ.optional().describe("Tool substrate material"),
  coating: z.string().optional().describe("Tool coating (e.g. TiAlN, AlCrN, uncoated)"),
  label: z.string().optional().describe("Descriptive label for the tool"),
}).passthrough().describe("Job-required tool descriptor for hyperMILL export");

// ── Action Schemas ─────────────────────────────────────────────────────────────

export const ACTION_CAMX_MS9_U03_SCHEMAS: ActionSchemaMap = {
  hypermill_tool_export: z.object({
    tools: z.array(z.record(z.string(), z.any())).optional().describe(
      "PRISM tool objects to export. Omit to export from the full PRISM catalog (up to filter.max_tools).",
    ),
    filter: filterZ.optional().describe(
      "Filter criteria for catalog query. Only used when tools array is omitted.",
    ),
    options: exportOptionsZ.optional().describe(
      "Export options: table inclusion flags, starting IDs, unit system.",
    ),
  }),

  hypermill_tool_export_job: z.object({
    job_tools: z.array(jobToolZ).min(1).max(500).describe(
      "List of tools required for this job. Each entry resolves against the PRISM catalog; " +
      "unmatched tools are synthesized from geometry spec.",
    ),
    options: exportOptionsZ.optional().describe(
      "Export options: table inclusion flags, starting IDs, unit system.",
    ),
  }),
};
