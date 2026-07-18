/**
 * KiloCamDatasetBuilderEngine — KILO-CAM-MASTERY-MS0 campaign iter 3
 *
 * Emits LoRA training tuples from the cam-toolpath coverage catalog.
 * Each tuple shape: { intent, features, system } → { strategy, parameters,
 * dialog_inputs, click_path }. Consumed by CAMLoRAAdapterTrainerEngine
 * (echo's existing per-system trainer) when training Pillar-B "how to CAM"
 * adapters for hyperMILL > Fusion > Mastercam > Esprit.
 *
 * Pure function — no I/O at the engine layer. Reads the catalog as a typed
 * JSON document passed in by the caller, returns the dataset rows. This
 * keeps the engine deterministic + unit-testable without filesystem fakes.
 *
 * The dataset row shape is intentionally minimal (intent/features/system →
 * strategy/parameters) — Pillar-A (CAD how-to) + Pillar-C (function-index
 * completeness) feed `dialog_inputs` and `click_path` from separate sources
 * (vendor docs ingest + per-system FunctionIndexEngine scan), which the
 * trainer joins on `system + strategy` at training time.
 *
 * Per kilo refuse-list:
 *   - no-silent-fallback-on-ambiguous: rows without a known category are
 *     surfaced in `untyped_toolpaths` (NOT emitted as training rows)
 *   - dropping-tolerance-stack-on-translate: `tolerance_total_mm` (when
 *     present on the input intent) flows through to the output row
 *   - emitting-program-without-pmi-validation: the dataset shape requires
 *     `material_iso_group` on every row — caller can't bypass it
 *
 * @milestone KILO-CAM-MASTERY-MS0
 * @version 1.0.0
 */

import { z } from "zod";

// ============================================================================
// CATALOG INPUT SHAPE (the JSON written in iter2)
// ============================================================================

export const CamToolpathSchema = z.object({
  id: z.string(),
  category: z.string(),
  geometry_hint: z.string(),
});
export type CamToolpath = z.infer<typeof CamToolpathSchema>;

export const CamSystemEntrySchema = z.object({
  version: z.string(),
  vendor_doc_anchor: z.string(),
  toolpath_count: z.number().int().min(0),
  toolpaths: z.array(CamToolpathSchema).min(1),
}).passthrough();
export type CamSystemEntry = z.infer<typeof CamSystemEntrySchema>;

export const CamToolpathCatalogSchema = z.object({
  schemaVersion: z.literal("1.0.0"),
  priority_order: z.array(z.string()).min(1),
  systems: z.record(z.string(), CamSystemEntrySchema),
}).passthrough();
export type CamToolpathCatalog = z.infer<typeof CamToolpathCatalogSchema>;

// ============================================================================
// DATASET ROW SHAPE
// ============================================================================

export const DatasetIntentSchema = z.enum([
  "use_every_toolpath",        // Phase 5 — coverage demo
  "best_strategy_for_feature", // Phase 6 — optimized program
  "fallback_strategy",          // Phase 6 — when primary strategy fails
]);
export type DatasetIntent = z.infer<typeof DatasetIntentSchema>;

export const DatasetRowSchema = z.object({
  schemaVersion: z.literal("1.0.0"),
  source: z.literal("kilo_cam_dataset_builder"),
  system: z.string(),
  toolpath_id: z.string(),
  category: z.string(),
  geometry_hint: z.string(),
  intent: DatasetIntentSchema,
  material_iso_group: z.enum(["P", "M", "K", "N", "S", "H"]),
  /** Default strategy_id mirrors toolpath_id — overridden at training time
   *  if the trainer has empirical-better alternatives. */
  strategy_id: z.string(),
  parameters: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
  tolerance_total_mm: z.number().min(0).optional(),
});
export type DatasetRow = z.infer<typeof DatasetRowSchema>;

export const BuildDatasetResultSchema = z.object({
  schemaVersion: z.literal("1.0.0"),
  source: z.literal("kilo_cam_dataset_builder"),
  intent: DatasetIntentSchema,
  material_iso_group: z.enum(["P", "M", "K", "N", "S", "H"]),
  rows: z.array(DatasetRowSchema),
  system_row_counts: z.record(z.string(), z.number().int().min(0)),
  total_rows: z.number().int().min(0),
  /** Toolpaths in the catalog whose category is empty — flagged for catalog
   *  curator, NOT silently included (refuse-list compliance). */
  untyped_toolpaths: z.array(z.object({
    system: z.string(),
    toolpath_id: z.string(),
  })),
});
export type BuildDatasetResult = z.infer<typeof BuildDatasetResultSchema>;

// ============================================================================
// BUILD DATASET — emit one row per (system, toolpath) for the given intent
// ============================================================================

export interface BuildOpts {
  /** Which CAM systems to include. Defaults to catalog.priority_order. */
  systems?: string[];
  /** Override material — defaults to P (carbon steel) as Phase-5 default. */
  material_iso_group?: "P" | "M" | "K" | "N" | "S" | "H";
  /** Phase 5 default: all toolpaths get a row. Phase 6 picks subset by feature target. */
  intent?: DatasetIntent;
  /** Optional per-row tolerance (applies uniformly if set). */
  tolerance_total_mm?: number;
}

function buildDataset(
  catalog: CamToolpathCatalog,
  opts?: BuildOpts,
): BuildDatasetResult {
  CamToolpathCatalogSchema.parse(catalog);

  const intent: DatasetIntent = opts?.intent ?? "use_every_toolpath";
  const material = opts?.material_iso_group ?? "P";
  const systems = opts?.systems ?? catalog.priority_order;

  const rows: DatasetRow[] = [];
  const counts: Record<string, number> = {};
  const untyped: Array<{ system: string; toolpath_id: string }> = [];

  for (const system of systems) {
    const entry = catalog.systems[system];
    if (!entry) continue;
    counts[system] = 0;
    for (const tp of entry.toolpaths) {
      if (!tp.category || tp.category.trim() === "") {
        untyped.push({ system, toolpath_id: tp.id });
        continue; // refuse-list: never silently emit a row with empty category
      }
      const row: DatasetRow = {
        schemaVersion: "1.0.0",
        source: "kilo_cam_dataset_builder",
        system,
        toolpath_id: tp.id,
        category: tp.category,
        geometry_hint: tp.geometry_hint,
        intent,
        material_iso_group: material,
        strategy_id: tp.id, // default: 1:1 with toolpath ID
        parameters: {
          // Phase-5 placeholders — real values fill at training time from
          // SpeedFeedOrchestrator + ChatterStability + ToolLifeEngine
          spindle_rpm: 0,
          feed_mm_min: 0,
          ap_mm: 0,
          ae_mm: 0,
        },
      };
      if (opts?.tolerance_total_mm !== undefined) {
        row.tolerance_total_mm = opts.tolerance_total_mm;
      }
      rows.push(row);
      counts[system]++;
    }
  }

  return {
    schemaVersion: "1.0.0",
    source: "kilo_cam_dataset_builder",
    intent,
    material_iso_group: material,
    rows,
    system_row_counts: counts,
    total_rows: rows.length,
    untyped_toolpaths: untyped,
  };
}

// ============================================================================
// CLASS WRAPPER
// ============================================================================

class KiloCamDatasetBuilderEngine {
  static buildDataset = buildDataset;
}

export const kiloCamDatasetBuilderEngine = KiloCamDatasetBuilderEngine;
