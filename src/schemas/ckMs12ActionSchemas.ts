/**
 * CK-MS12 Action Schemas — Zod v4
 *
 * 10 dispatcher actions:
 *   nlp_cam_parse            — parse NL text to CAMFeature[]
 *   nlp_cam_parse_context    — parse with material/machine context
 *   nlp_cam_extract_dims     — extract dimensions from text
 *   program_compare          — full G-code comparison report
 *   program_diff             — line-by-line diff only
 *   program_compare_physics  — cutting physics comparison
 *   cam_cache_stats          — cache hit/miss/size stats
 *   cam_cache_clear          — clear cache (optional namespace)
 *   batch_cam_generate       — generate programs for multiple parts
 *   batch_cam_optimize       — sort parts for minimum setup changes
 */

import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

// ── Shared sub-schemas ────────────────────────────────────────────────────────

const partFeatureZ = z.object({
  type: z.string().describe(
    "Feature type: pocket | hole | slot | thread | face | profile | chamfer | fillet | boss | step"
  ),
  dimensions: z.record(z.string(), z.number()).describe(
    "Dimension map e.g. { length_mm: 50, width_mm: 30, depth_mm: 10, diameter_mm: 12 }"
  ),
  tolerance_mm:       z.number().positive().optional(),
  surface_finish_ra:  z.number().positive().optional().describe("Ra in µm"),
  thread_spec:        z.string().optional().describe("e.g. M10×1.5 or 1/4-20 UNC"),
}).passthrough();

const batchPartZ = z.object({
  part_id:    z.string().min(1).describe("Unique part identifier"),
  features:   z.array(partFeatureZ).min(1),
  material:   z.string().optional().describe(
    "e.g. aluminum_6061 | steel_4140 | stainless_316 | titanium_6al4v | inconel_718"
  ),
  machine:    z.string().optional().describe("e.g. Haas VF-2, DMG DMU 50"),
  controller: z.string().optional().describe(
    "e.g. fanuc_0i | siemens_840d | heidenhain_tnc640 | haas_ngc"
  ),
  quantity:   z.number().int().positive().optional().default(1),
  notes:      z.string().optional(),
}).passthrough();

const sharedConfigZ = z.object({
  machine:    z.string().optional(),
  controller: z.string().optional(),
  material:   z.string().optional(),
  coolant:    z.enum(["flood", "mist", "air", "dry"]).optional().default("flood"),
  units:      z.enum(["mm", "inch"]).optional().default("mm"),
}).passthrough();

// ── Action schemas ────────────────────────────────────────────────────────────

export const ACTION_CK_MS12_SCHEMAS: ActionSchemaMap = {

  /** Parse natural language text into CAM features. */
  nlp_cam_parse: z.object({
    text: z.string().min(3).describe(
      "Natural language description of part features, e.g. " +
      "'pocket 80x50mm 15mm deep, M10x1.5 threaded hole 20mm deep, Ra 0.8 finish'"
    ),
  }),

  /** Parse NL text with optional material and machine context. */
  nlp_cam_parse_context: z.object({
    text:     z.string().min(3).describe("Natural language part/feature description"),
    material: z.string().optional().describe(
      "Material hint e.g. '6061 aluminum', '4140 steel', 'Ti-6Al-4V'"
    ),
    machine:  z.string().optional().describe(
      "Machine hint e.g. 'Haas VF-2', 'DMG DMU 50', '5-axis'"
    ),
  }),

  /** Extract all numeric dimensions from text. */
  nlp_cam_extract_dims: z.object({
    text: z.string().min(1).describe(
      "Text containing dimensions, e.g. '25x50x10mm', 'Ø12mm hole', '±0.02 tolerance'"
    ),
  }),

  /** Full comparison of two G-code programs with physics overlay. */
  program_compare: z.object({
    program_a:   z.string().min(1).describe("First G-code program text"),
    program_b:   z.string().min(1).describe("Second G-code program text"),
    format:      z.enum(["full", "report", "summary"]).optional().default("full").describe(
      "full=FullComparison object | report=text report | summary=stats only"
    ),
  }),

  /** Line-by-line G-code diff (ignores comments, whitespace, block numbers). */
  program_diff: z.object({
    program_a: z.string().min(1).describe("First G-code program"),
    program_b: z.string().min(1).describe("Second G-code program"),
    context_lines: z.number().int().min(0).max(20).optional().default(3).describe(
      "Number of equal lines to show around each change"
    ),
  }),

  /** Compare cutting physics parameters between two programs. */
  program_compare_physics: z.object({
    program_a: z.string().min(1).describe("First G-code program"),
    program_b: z.string().min(1).describe("Second G-code program"),
  }),

  /** Return cache statistics (hit rate, size, namespaces). */
  cam_cache_stats: z.object({}),

  /** Clear cache entries, optionally scoped to a namespace. */
  cam_cache_clear: z.object({
    namespace: z.string().optional().describe(
      "If provided, only clear entries in this namespace; otherwise clear all"
    ),
  }),

  /** Generate G-code programs for multiple parts in a single batch call. */
  batch_cam_generate: z.object({
    parts: z.array(batchPartZ).min(1).max(100).describe(
      "Array of parts to generate programs for (max 100)"
    ),
    shared: sharedConfigZ.optional().describe(
      "Config applied to all parts unless overridden per-part"
    ),
    concurrency: z.number().int().min(1).max(16).optional().default(4).describe(
      "Max parallel generation tasks"
    ),
    on_error: z.enum(["skip", "abort"]).optional().default("skip").describe(
      "skip=continue after part failure | abort=stop immediately"
    ),
    optimize_order: z.boolean().optional().default(false).describe(
      "Sort parts for minimum material/tool setup changes before generating"
    ),
  }),

  /** Sort a list of parts to minimize material and tool setup changes. */
  batch_cam_optimize: z.object({
    parts: z.array(batchPartZ).min(1).describe("Parts to sort"),
  }),
};
