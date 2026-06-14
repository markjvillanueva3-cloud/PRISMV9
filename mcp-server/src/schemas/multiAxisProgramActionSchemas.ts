/**
 * Multi-Axis Program Action Schemas — Zod v4
 *
 * Schemas for MultiAxisPrintToProgramEngine (2 actions)
 */

import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

const orientationZ = z.object({
  A_deg: z.number(),
  B_deg: z.number(),
  C_deg: z.number(),
  lead_deg: z.number().optional(),
  lag_deg: z.number().optional(),
  tilt_deg: z.number().optional(),
}).passthrough();

const multiAxisFeatureZ = z.object({
  id: z.string(),
  type: z.string(),
  orientation: orientationZ,
  diameter_mm: z.number().optional(),
  depth_mm: z.number(),
  width_mm: z.number().optional(),
  length_mm: z.number().optional(),
  surface_finish_Ra_um: z.number().optional(),
  tolerance_mm: z.number().optional(),
  blade_count: z.number().optional(),
  blade_wrap_deg: z.number().optional(),
  port_diameter_mm: z.number().optional(),
  port_depth_mm: z.number().optional(),
  scallop_height_mm: z.number().optional(),
}).passthrough();

const multiAxisMaterialZ = z.object({
  material_name: z.string(),
  iso_group: z.enum(["P", "M", "K", "N", "S", "H"]),
  hardness_hrc: z.number().optional(),
}).passthrough();

const multiAxisInputZ = z.object({
  part_number: z.string().optional(),
  material: multiAxisMaterialZ,
  machine_type: z.enum(["5ax_trunnion", "5ax_swivel_head", "5ax_nutating", "3plus2_rotary", "5ax_gantry"]).optional(),
  controller: z.string().optional(),
  max_spindle_rpm: z.number().optional(),
  max_power_kW: z.number().optional(),
  has_rtcp: z.boolean().optional(),
  features: z.array(multiAxisFeatureZ),
  optimization_target: z.enum(["balanced", "max_speed", "max_tool_life", "surface_quality"]).optional(),
  tcp_mode: z.boolean().optional(),
}).passthrough();

const multiaxis_print_to_program = multiAxisInputZ;
const multiaxis_process_plan = multiAxisInputZ;

// ── Program replication (retrieve similar existing program + adapt) ───────────
// Corpus records are internally-produced FeatureSequenceRecords — kept loose
// (z.any()) rather than re-deriving the full nested record shape in Zod.
const recognizedFeatureZ = z.object({
  id: z.string().describe("Feature id from the print"),
  type: z.string().describe("Feature type, e.g. through_hole, pocket_rectangular"),
  dimensions: z.record(z.string(), z.any()).optional().describe("Feature dimensions in mm"),
  position: z.object({ x: z.number(), y: z.number(), z: z.number() }).partial().optional()
    .describe("Feature position in mm"),
  orientation: z
    .object({ axis: z.string(), angle_deg: z.number().optional() })
    .passthrough()
    .optional()
    .describe("Feature orientation — custom axis or non-zero angle implies rotary (≥4-axis)"),
}).passthrough();

const replicate_from_print = z.object({
  part_name: z.string().describe("New part name from the print title block"),
  material: z.string().describe("New part material designation"),
  iso_group: z.enum(["P", "M", "K", "N", "S", "H"]).optional().describe("ISO machinability group of the new material"),
  dimensions: z.object({ x: z.number(), y: z.number(), z: z.number() }).describe("Stock bounding box in mm"),
  features: z.array(recognizedFeatureZ).describe("Features recognized from the print"),
  corpus: z.array(z.any()).describe("Existing programs (FeatureSequenceRecords) to retrieve from"),
  target_axis_count: z.union([z.literal(3), z.literal(4), z.literal(5)]).optional()
    .describe("Axis capability of the target machine — gates which corpus programs are usable (default 3)"),
  machine_max_rpm: z.number().optional().describe("Max spindle RPM clamp for adapted speeds"),
  machine_max_feed: z.number().optional().describe("Max feed mm/min clamp for adapted feeds"),
  min_score: z.number().optional().describe("Minimum similarity 0-100 to accept a match (default 25)"),
  top_n: z.number().optional().describe("Candidates to consider before axis-gating (default 5)"),
}).passthrough();

const replicate_similarity_search = replicate_from_print;

const replicate_corpus_index = z.object({
  corpus: z.array(z.any()).describe("Existing programs (FeatureSequenceRecords) to index for retrieval"),
}).passthrough();

export const ACTION_MULTIAXIS_PROGRAM_SCHEMAS: ActionSchemaMap = {
  multiaxis_print_to_program,
  multiaxis_process_plan,
  replicate_from_print,
  replicate_similarity_search,
  replicate_corpus_index,
};
