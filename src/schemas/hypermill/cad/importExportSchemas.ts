/**
 * Import/Export & Measure/Bounding Parameter Schemas — hyperCAD-S I/O and Measurement
 *
 * U-HKC10: Zod schemas for 4 import/export and 3 measure/bounding operation types
 * used in hyperCAD-S. Each schema defines the parameter set the AC Python API accepts
 * when configuring file I/O or measurement operations.
 *
 * AC Python call pattern:
 *   hm.io.step_import(healing_tolerance=0.01, unit_mode='mm', sew_faces=true, ...)
 *   hm.measure.bounding_box(box_type='aligned', padding=0.0, ...)
 *
 * @domain CAD-ImportExport, CAD-Measure
 * @milestone HM-KC-MS1/U-HKC10
 */

import { z } from "zod";

// ══════════════════════════════════════════════════════════════════════════════
// IMPORT / EXPORT SCHEMAS
// ══════════════════════════════════════════════════════════════════════════════

// ── Shared types ─────────────────────────────────────────────────────────────

/** Metadata record for every import/export operation type */
export interface ImportExportMeta {
  /** Number of Zod-validated parameters */
  paramCount: number;
  /** AC Python setter call template */
  acPythonSetter: string;
  /** Human-readable description */
  description: string;
}

// ── 1. STEP Import ──────────────────────────────────────────────────────────

export const stepImportSchema = z.object({
  healing_tolerance: z
    .number()
    .min(0.001)
    .max(1.0)
    .default(0.01)
    .describe("Geometric healing tolerance for gap closure and edge repair, mm"),
  unit_mode: z
    .enum(["mm", "inch", "auto"])
    .default("auto")
    .describe("Unit interpretation mode for the imported STEP file"),
  sew_faces: z
    .boolean()
    .default(true)
    .describe("Sew loose faces into closed shells during import"),
  simplify_geometry: z
    .boolean()
    .default(false)
    .describe("Simplify analytical surfaces (e.g., spline-to-cylinder) where possible"),
  layer_mapping: z
    .enum(["preserve", "flatten", "by_color"])
    .default("preserve")
    .describe("How source layers/levels are mapped into the hyperCAD-S layer structure"),
});

export type StepImport = z.infer<typeof stepImportSchema>;

// ── 2. IGES Import ──────────────────────────────────────────────────────────

export const igesImportSchema = z.object({
  trim_repair: z
    .boolean()
    .default(true)
    .describe("Repair trimming curves that deviate from surface boundaries"),
  surface_mode: z
    .enum(["nurbs", "analytic", "auto"])
    .default("auto")
    .describe("Surface representation preference after import"),
  color_import: z
    .boolean()
    .default(true)
    .describe("Import entity colors from the IGES file"),
  level_filter: z
    .string()
    .default("")
    .describe("Comma-separated IGES level numbers to import (empty = all levels)"),
});

export type IgesImport = z.infer<typeof igesImportSchema>;

// ── 3. Native Import ────────────────────────────────────────────────────────

export const nativeImportSchema = z.object({
  version_check: z
    .boolean()
    .default(true)
    .describe("Verify file version compatibility before importing"),
  feature_tree: z
    .boolean()
    .default(true)
    .describe("Import the parametric feature tree (false = dumb solid only)"),
  pmi_import: z
    .boolean()
    .default(false)
    .describe("Import Product Manufacturing Information (GD&T annotations, notes)"),
  coordinate_system: z
    .enum(["absolute", "relative"])
    .default("absolute")
    .describe("Coordinate system mapping: absolute = world origin, relative = part origin"),
});

export type NativeImport = z.infer<typeof nativeImportSchema>;

// ── 4. Export Settings ──────────────────────────────────────────────────────

export const exportSettingsSchema = z.object({
  format: z
    .enum(["step", "iges", "stl", "obj", "3mf", "parasolid"])
    .describe("Target export file format"),
  tessellation_quality: z
    .enum(["coarse", "medium", "fine", "custom"])
    .default("medium")
    .describe("Tessellation quality for mesh-based formats (STL, OBJ, 3MF)"),
  deviation_tolerance: z
    .number()
    .min(0.0001)
    .max(1.0)
    .default(0.01)
    .describe("Maximum chordal deviation from true geometry for tessellation, mm"),
  angular_tolerance: z
    .number()
    .min(0.1)
    .max(45)
    .default(15)
    .describe("Maximum angular deviation between adjacent facet normals, degrees"),
  binary_format: z
    .boolean()
    .default(true)
    .describe("Use binary encoding (true) or ASCII (false) for supported formats"),
});

export type ExportSettings = z.infer<typeof exportSettingsSchema>;

// ── Import/Export Schema Map ────────────────────────────────────────────────

/** Union type of all import/export parameter objects */
export type ImportExportSchemas = {
  step_import: StepImport;
  iges_import: IgesImport;
  native_import: NativeImport;
  export_settings: ExportSettings;
};

/** Flat map from operation name to its Zod schema */
export const IMPORT_EXPORT_SCHEMA_MAP = {
  step_import: stepImportSchema,
  iges_import: igesImportSchema,
  native_import: nativeImportSchema,
  export_settings: exportSettingsSchema,
} as const;

// ── Import/Export Metadata ──────────────────────────────────────────────────

export const IMPORT_EXPORT_METADATA: Record<string, ImportExportMeta> = {
  step_import: {
    paramCount: 5,
    acPythonSetter:
      "hm.io.step_import(file={file_path}, heal_tol={healing_tolerance}, units='{unit_mode}', sew={sew_faces}, simplify={simplify_geometry}, layers='{layer_mapping}')",
    description: "Imports STEP (AP203/AP214) geometry with healing, unit conversion, and layer mapping",
  },
  iges_import: {
    paramCount: 4,
    acPythonSetter:
      "hm.io.iges_import(file={file_path}, trim_repair={trim_repair}, surface='{surface_mode}', colors={color_import}, levels='{level_filter}')",
    description: "Imports IGES geometry with trim repair and surface conversion options",
  },
  native_import: {
    paramCount: 4,
    acPythonSetter:
      "hm.io.native_import(file={file_path}, version_check={version_check}, features={feature_tree}, pmi={pmi_import}, coords='{coordinate_system}')",
    description: "Imports native CAD formats with optional feature tree and PMI data",
  },
  export_settings: {
    paramCount: 5,
    acPythonSetter:
      "hm.io.export(body={body_ref}, format='{format}', tessellation='{tessellation_quality}', deviation={deviation_tolerance}, angular={angular_tolerance}, binary={binary_format})",
    description: "Exports geometry to neutral or mesh formats with tessellation quality control",
  },
};

/**
 * Total parameter count across all 4 import/export operation schemas.
 */
export const IMPORT_EXPORT_TOTAL_PARAM_COUNT: number = Object.values(
  IMPORT_EXPORT_METADATA
).reduce((sum, meta) => sum + meta.paramCount, 0);

// ══════════════════════════════════════════════════════════════════════════════
// MEASURE / BOUNDING SCHEMAS
// ══════════════════════════════════════════════════════════════════════════════

// ── Shared types ─────────────────────────────────────────────────────────────

/** Metadata record for every measure/bounding operation type */
export interface MeasureBoundingMeta {
  /** Number of Zod-validated parameters */
  paramCount: number;
  /** AC Python setter call template */
  acPythonSetter: string;
  /** Human-readable description */
  description: string;
}

// ── 1. Bounding Box ─────────────────────────────────────────────────────────

export const boundingBoxSchema = z.object({
  box_type: z
    .enum(["aligned", "oriented", "minimum"])
    .default("aligned")
    .describe("Bounding box orientation: aligned = axis-aligned, oriented = OBB, minimum = smallest volume"),
  padding: z
    .number()
    .min(0)
    .max(100)
    .default(0)
    .describe("Uniform padding added to each side of the bounding box, mm"),
  include_fixtures: z
    .boolean()
    .default(false)
    .describe("Include fixture/clamp geometry in the bounding box calculation"),
});

export type BoundingBox = z.infer<typeof boundingBoxSchema>;

// ── 2. Stock From Model ─────────────────────────────────────────────────────

export const stockFromModelSchema = z.object({
  offset_x: z
    .number()
    .min(0)
    .max(500)
    .default(2)
    .describe("Stock offset in X direction (per side), mm"),
  offset_y: z
    .number()
    .min(0)
    .max(500)
    .default(2)
    .describe("Stock offset in Y direction (per side), mm"),
  offset_z: z
    .number()
    .min(0)
    .max(500)
    .default(2)
    .describe("Stock offset in Z direction (per side), mm"),
  round_to_increment: z
    .number()
    .min(0.1)
    .max(50)
    .default(5)
    .describe("Round stock dimensions up to the nearest increment for standard bar/plate sizes, mm"),
  stock_shape: z
    .enum(["rectangular", "cylindrical"])
    .default("rectangular")
    .describe("Stock blank shape: rectangular (block) or cylindrical (round bar)"),
});

export type StockFromModel = z.infer<typeof stockFromModelSchema>;

// ── 3. Point Measure ────────────────────────────────────────────────────────

export const pointMeasureSchema = z.object({
  coordinate_system: z
    .enum(["absolute", "wcs", "local"])
    .default("absolute")
    .describe("Coordinate system for reporting measured values"),
  decimal_places: z
    .number()
    .int()
    .min(1)
    .max(8)
    .default(4)
    .describe("Number of decimal places in measured coordinate output"),
  snap_to_geometry: z
    .boolean()
    .default(true)
    .describe("Snap measurement point to nearest geometric entity (vertex, edge, face)"),
});

export type PointMeasure = z.infer<typeof pointMeasureSchema>;

// ── Measure/Bounding Schema Map ─────────────────────────────────────────────

/** Union type of all measure/bounding parameter objects */
export type MeasureBoundingSchemas = {
  bounding_box: BoundingBox;
  stock_from_model: StockFromModel;
  point_measure: PointMeasure;
};

/** Flat map from operation name to its Zod schema */
export const MEASURE_BOUNDING_SCHEMA_MAP = {
  bounding_box: boundingBoxSchema,
  stock_from_model: stockFromModelSchema,
  point_measure: pointMeasureSchema,
} as const;

// ── Measure/Bounding Metadata ───────────────────────────────────────────────

export const MEASURE_BOUNDING_METADATA: Record<string, MeasureBoundingMeta> = {
  bounding_box: {
    paramCount: 3,
    acPythonSetter:
      "hm.measure.bounding_box(body={body_ref}, type='{box_type}', padding={padding}, fixtures={include_fixtures})",
    description: "Computes axis-aligned, oriented, or minimum bounding box around selected geometry",
  },
  stock_from_model: {
    paramCount: 5,
    acPythonSetter:
      "hm.measure.stock_from_model(body={body_ref}, ox={offset_x}, oy={offset_y}, oz={offset_z}, increment={round_to_increment}, shape='{stock_shape}')",
    description: "Derives stock blank dimensions from part bounding box with per-axis offsets and size rounding",
  },
  point_measure: {
    paramCount: 3,
    acPythonSetter:
      "hm.measure.point(point={point_ref}, coords='{coordinate_system}', decimals={decimal_places}, snap={snap_to_geometry})",
    description: "Measures a point location in the selected coordinate system with configurable precision",
  },
};

/**
 * Total parameter count across all 3 measure/bounding operation schemas.
 */
export const MEASURE_BOUNDING_TOTAL_PARAM_COUNT: number = Object.values(
  MEASURE_BOUNDING_METADATA
).reduce((sum, meta) => sum + meta.paramCount, 0);
