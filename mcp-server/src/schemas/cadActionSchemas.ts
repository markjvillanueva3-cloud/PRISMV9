/**
 * CAD Dispatcher Action Schemas
 *
 * Zod schemas for prism_cad dispatcher actions.
 * Per dispatcher conventions: every action should have a schema.
 *
 * @module schemas/cadActionSchemas
 */

import { z } from "zod";

// ── Geometry Actions ──────────────────────────────────────────────────────────
const geometryCreateSchema = z.object({
  type: z.enum(["box", "cylinder", "sphere", "cone", "torus"]).optional(),
  dimensions: z.record(z.number()).optional(),
});

const geometryTransformSchema = z.object({
  operation: z.enum(["translate", "rotate", "scale", "mirror"]).optional(),
  vector: z.array(z.number()).optional(),
  angle: z.number().optional(),
});

const geometryAnalyzeSchema = z.object({
  geometry_id: z.string().optional(),
});

// ── Mesh Actions ──────────────────────────────────────────────────────────────
const meshGenerateSchema = z.object({
  element_size_mm: z.number().optional(),
  quality: z.enum(["coarse", "medium", "fine"]).optional(),
});

const meshImportSchema = z.object({
  path: z.string().optional(),
  format: z.enum(["stl", "obj", "ply"]).optional(),
});

const meshExportSchema = z.object({
  path: z.string().optional(),
  format: z.enum(["stl", "obj", "ply"]).optional(),
});

// ── Feature Actions ───────────────────────────────────────────────────────────
const featureRecognizeSchema = z.object({
  geometry: z.any().optional(),
});

const featureEditSchema = z.object({
  feature_id: z.string().optional(),
  modifications: z.record(z.any()).optional(),
});

// ── Stock/WCS/DfM Actions ─────────────────────────────────────────────────────
const stockModelSchema = z.object({
  material: z.string().optional(),
  dimensions: z.record(z.number()).optional(),
});

const wcsSetupSchema = z.object({
  origin: z.array(z.number()).optional(),
  orientation: z.array(z.number()).optional(),
});

const dfmCheckSchema = z.object({
  geometry: z.any().optional(),
  process: z.string().optional(),
});

// ── Universal CAD Registry Actions (U-CADC03) ─────────────────────────────────
const cadRegistryScanSchema = z.object({
  root_paths: z.array(z.string()).optional(),
  rootPaths: z.array(z.string()).optional(),
  options: z.object({
    formats: z.array(z.string()).optional(),
    maxDepth: z.number().optional(),
    batchSize: z.number().optional(),
  }).optional(),
});

const cadRegistrySearchSchema = z.object({
  query: z.string().optional(),
  name: z.string().optional(),
  format: z.string().optional(),
  customer: z.string().optional(),
  limit: z.number().optional(),
});

const cadRegistryGetSchema = z.object({
  file_path: z.string().optional(),
  filePath: z.string().optional(),
  path: z.string().optional(),
});

const cadRegistryStatsSchema = z.object({}).optional();

// ── CAD Geometry Comparison Actions (U-CADC26) ────────────────────────────────
const geometryCompareFilesSchema = z.object({
  original_path: z.string().optional(),
  originalPath: z.string().optional(),
  generated_path: z.string().optional(),
  generatedPath: z.string().optional(),
  thresholds: z.record(z.number()).optional(),
});

const geometryExtractMetricsSchema = z.object({
  file_path: z.string().optional(),
  filePath: z.string().optional(),
  path: z.string().optional(),
});

const geometryBatchCompareSchema = z.object({
  pairs: z.array(z.object({
    original: z.string(),
    generated: z.string(),
  })).optional(),
  thresholds: z.record(z.number()).optional(),
});

const geometrySetThresholdsSchema = z.object({
  thresholds: z.record(z.number()).optional(),
});

const geometryFormatDetectSchema = z.object({
  file_path: z.string().optional(),
  filePath: z.string().optional(),
  path: z.string().optional(),
});

// ── CAD Regeneration Test Actions (U-CADC21) ──────────────────────────────────
const cadRegenTestSchema = z.object({
  original_path: z.string().optional(),
  generated_path: z.string().optional(),
});

const cadRegenBatchSchema = z.object({
  pairs: z.array(z.any()).optional(),
});

const cadRegenCompareSchema = z.object({
  original: z.any().optional(),
  generated: z.any().optional(),
  thresholds: z.record(z.number()).optional(),
});

const cadRegenThresholdsSchema = z.object({
  set: z.record(z.number()).optional(),
});

/**
 * Action schemas for prism_cad dispatcher.
 * Maps action name to Zod schema for validation.
 */
export const ACTION_CAD_SCHEMAS: Record<string, z.ZodType<any>> = {
  // Geometry
  geometry_create: geometryCreateSchema,
  geometry_transform: geometryTransformSchema,
  geometry_analyze: geometryAnalyzeSchema,
  // Mesh
  mesh_generate: meshGenerateSchema,
  mesh_import: meshImportSchema,
  mesh_export: meshExportSchema,
  // Feature
  feature_recognize: featureRecognizeSchema,
  feature_edit: featureEditSchema,
  // Stock/WCS/DfM
  stock_model: stockModelSchema,
  wcs_setup: wcsSetupSchema,
  dfm_check: dfmCheckSchema,
  // CAD Registry (U-CADC03)
  cad_registry_scan: cadRegistryScanSchema,
  cad_registry_search: cadRegistrySearchSchema,
  cad_registry_get: cadRegistryGetSchema,
  cad_registry_stats: cadRegistryStatsSchema ?? z.object({}),
  // Geometry Comparison (U-CADC26)
  geometry_compare_files: geometryCompareFilesSchema,
  geometry_extract_metrics: geometryExtractMetricsSchema,
  geometry_batch_compare: geometryBatchCompareSchema,
  geometry_set_thresholds: geometrySetThresholdsSchema,
  geometry_format_detect: geometryFormatDetectSchema,
  // CAD Regen Test (U-CADC21)
  cad_regen_test: cadRegenTestSchema,
  cad_regen_batch: cadRegenBatchSchema,
  cad_regen_compare: cadRegenCompareSchema,
  cad_regen_thresholds: cadRegenThresholdsSchema,
};
