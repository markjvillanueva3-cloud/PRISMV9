/**
 * CAMX-MS20 Action Schemas — Zod
 *
 * 2 dispatcher actions (STEPNCEngines E1129):
 *   stepnc_parse    — parse STEP-NC / ISO 14649 / AP238 P21 file text
 *   stepnc_generate — generate STEP-NC P21 output from PRISM feature model
 */

import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

// ── Shared sub-schemas ────────────────────────────────────────────────────────

const ManufacturingFeatureSchema = z.object({
  id:            z.string().optional().describe("Feature identifier"),
  type:          z.enum(["pocket", "hole", "slot", "face", "boss", "thread", "chamfer"]).describe("Feature type"),
  depth_mm:      z.number().positive().optional().describe("Depth of the feature, mm"),
  width_mm:      z.number().positive().optional().describe("Width (for slots/pockets), mm"),
  length_mm:     z.number().positive().optional().describe("Length (for slots/pockets), mm"),
  diameter_mm:   z.number().positive().optional().describe("Diameter (for holes/bosses), mm"),
  tolerance_mm:  z.number().min(0).optional().describe("Dimensional tolerance, mm"),
  surface_finish_ra: z.number().min(0).optional().describe("Required surface finish Ra, µm"),
  location:      z.object({ x: z.number(), y: z.number(), z: z.number() }).optional().describe("Feature origin in workpiece CS"),
}).describe("A manufacturing feature to be machined");

const PRISMToolSchema = z.object({
  id:            z.string().optional().describe("Tool identifier"),
  type:          z.enum(["endmill", "drill", "tap", "ballnose", "face_mill", "bull_nose", "reamer", "thread_mill", "boring_bar", "turning_insert"]).describe("Tool type"),
  diameter_mm:   z.number().positive().describe("Cutting diameter, mm"),
  flutes:        z.number().int().positive().optional().describe("Number of flutes"),
  material:      z.string().optional().describe("Substrate (carbide, hss, ceramic, cbn, pcd)"),
  coating:       z.string().optional().describe("Coating (TiN, TiAlN, AlTiN, DLC, uncoated)"),
  length_mm:     z.number().positive().optional().describe("Overall length, mm"),
  corner_radius_mm: z.number().min(0).optional().describe("Corner radius, mm"),
}).describe("A PRISM tool record");

const CuttingParamsSchema = z.object({
  feature_id:    z.string().optional().describe("Feature this parameter set applies to"),
  tool_id:       z.string().optional().describe("Tool identifier"),
  spindle_rpm:   z.number().positive().optional().describe("Spindle speed, RPM"),
  feed_mmpm:     z.number().positive().optional().describe("Feed rate, mm/min"),
  doc_mm:        z.number().positive().optional().describe("Depth of cut, mm"),
  woc_mm:        z.number().positive().optional().describe("Width of cut / stepover, mm"),
  coolant:       z.string().optional().describe("Coolant strategy (flood, mql, dry, hpc)"),
  operation:     z.enum(["roughing", "semi_finishing", "finishing"]).optional().describe("Operation type"),
}).describe("Cutting parameters for one operation");

// ── Action schemas ─────────────────────────────────────────────────────────────

export const ACTION_CAMX_MS20_SCHEMAS: ActionSchemaMap = {

  /**
   * Parse a STEP-NC (ISO 14649 / AP238) P21 file into a structured model.
   *
   * Returns:
   *   workingsteps   — array of machining workingsteps with strategy + params
   *   workplans      — ordered sequences of workingstep references
   *   features       — manufacturing features (pockets, holes, slots, faces)
   *   tooling        — tool assemblies with geometry
   *   technology     — speed/feed/depth per operation
   *   prism_features — features mapped to PRISM feature model
   *   prism_tools    — tools mapped to PRISM tool model
   *   prism_params   — cutting params extracted per workingstep
   *
   * When extract_only is set, returns only the requested subset.
   */
  stepnc_parse: z.object({
    stepnc_text:  z.string().min(10).describe(
      "Full STEP-NC P21 file text (ISO-10303-21 ... END-ISO-10303-21) or a representative excerpt"
    ),
    extract_only: z.enum(["features", "tooling", "technology", "workingsteps", "workplans", "all"]).optional().describe(
      "Limit extraction to a subset (default: all)"
    ),
    map_to_prism: z.boolean().optional().describe(
      "When true, map extracted entities to PRISM feature/tool/params model (default: true)"
    ),
  }),

  /**
   * Generate a STEP-NC P21 file from PRISM feature model data.
   *
   * Implements:
   *   ISO 14649 Part 10  — general process data
   *   ISO 14649 Part 11  — milling workingsteps
   *   ISO 14649 Part 12  — turning workingsteps
   *   ISO 14649 Part 111 — tool definitions for milling
   *
   * Returns: STEP-NC P21 text (ISO-10303-21 ... END-ISO-10303-21)
   *
   * When include_parts is set, limits output to the specified AP238 parts.
   */
  stepnc_generate: z.object({
    features:     z.array(ManufacturingFeatureSchema).min(1).max(500).describe(
      "Manufacturing features to generate workingsteps for (1-500)"
    ),
    tools:        z.array(PRISMToolSchema).min(1).max(100).describe(
      "Tool definitions (1-100)"
    ),
    params:       z.array(CuttingParamsSchema).min(1).max(500).describe(
      "Cutting parameter sets per feature/operation (1-500)"
    ),
    workplan_name: z.string().optional().describe("Name for the main workplan (default: 'PRISM_WORKPLAN')"),
    include_parts: z.array(z.enum(["10", "11", "12", "111"])).optional().describe(
      "ISO 14649 parts to include (default: all applicable)"
    ),
    part_name:    z.string().optional().describe("Workpiece name embedded in STEP header"),
    author:       z.string().optional().describe("Author field in STEP header"),
  }),
};
