/**
 * Electrode Design Parameter Schemas — hyperCAD-S Electrode Operations
 *
 * U-HKC10: Zod schemas for 5 electrode operation types used in hyperCAD-S.
 * Each schema defines the parameter set the AC Python API accepts when creating
 * or editing an electrode design feature.
 *
 * AC Python call pattern:
 *   hm.electrode.design(overcut_rough=0.3, spark_gap=0.1, electrode_material='graphite', ...)
 *
 * @domain CAD-Electrode
 * @milestone HM-KC-MS1/U-HKC10
 */

import { z } from "zod";

// ── Shared types ─────────────────────────────────────────────────────────────

/** Metadata record for every electrode operation type */
export interface ElectrodeOperationMeta {
  /** Number of Zod-validated parameters */
  paramCount: number;
  /** AC Python setter call template */
  acPythonSetter: string;
  /** Human-readable description */
  description: string;
  /** DFM flags: which parameters have manufacturing-critical ranges */
  dfmCriticalParams?: string[];
}

// ── 1. Electrode Design ─────────────────────────────────────────────────────

export const electrodeDesignSchema = z.object({
  overcut_rough: z
    .number()
    .min(0.05)
    .max(2.0)
    .describe("Rough overcut offset applied to electrode geometry, mm (DFM-critical: affects spark erosion depth)"),
  overcut_finish: z
    .number()
    .min(0.005)
    .max(0.5)
    .describe("Finish overcut offset for final electrode shape, mm (DFM-critical: controls surface quality)"),
  spark_gap: z
    .number()
    .min(0.01)
    .max(1.0)
    .describe("Spark gap between electrode and workpiece, mm (DFM-critical: must match dielectric + material pair)"),
  electrode_material: z
    .enum(["copper", "graphite", "copper_tungsten", "silver_tungsten"])
    .default("graphite")
    .describe("Electrode material type — determines wear ratio and surface finish capability"),
  wear_ratio: z
    .number()
    .min(0.01)
    .max(10)
    .default(1.0)
    .describe("Volumetric wear ratio (electrode wear / workpiece removal), dimensionless"),
  clearance_angle: z
    .number()
    .min(0)
    .max(30)
    .default(0)
    .describe("Clearance angle on electrode sidewalls for flushing and chip evacuation, degrees"),
});

export type ElectrodeDesign = z.infer<typeof electrodeDesignSchema>;

// ── 2. Holder Library ───────────────────────────────────────────────────────

export const holderLibrarySchema = z.object({
  holder_type: z
    .enum(["standard", "erowa", "system3r", "custom"])
    .default("standard")
    .describe("Electrode holder system type for EDM machine compatibility"),
  shank_diameter: z
    .number()
    .min(3)
    .max(100)
    .default(20)
    .describe("Holder shank diameter, mm"),
  reach_length: z
    .number()
    .min(5)
    .max(500)
    .default(50)
    .describe("Effective reach length from holder face to electrode tip, mm"),
  taper_type: z
    .enum(["none", "morse", "bt", "hsk", "er"])
    .default("none")
    .describe("Taper interface type between holder and machine spindle/chuck"),
});

export type HolderLibrary = z.infer<typeof holderLibrarySchema>;

// ── 3. Virtual Electrode ────────────────────────────────────────────────────

export const virtualElectrodeSchema = z.object({
  extraction_mode: z
    .enum(["cavity", "boss", "combined"])
    .default("cavity")
    .describe("Method for extracting electrode shape from part geometry"),
  offset_value: z
    .number()
    .min(-5)
    .max(5)
    .default(0)
    .describe("Additional offset applied to the extracted electrode shape, mm"),
  draft_check: z
    .boolean()
    .default(true)
    .describe("Enable draft angle validation on extracted electrode faces"),
  min_draft: z
    .number()
    .min(0)
    .max(30)
    .default(0.5)
    .describe("Minimum acceptable draft angle for electrode extraction, degrees"),
  split_electrodes: z
    .boolean()
    .default(false)
    .describe("Split complex geometry into multiple electrode bodies for better access"),
});

export type VirtualElectrode = z.infer<typeof virtualElectrodeSchema>;

// ── 4. Side Electrode ───────────────────────────────────────────────────────

export const sideElectrodeSchema = z.object({
  approach_direction: z
    .enum(["x_pos", "x_neg", "y_pos", "y_neg", "z_neg", "custom"])
    .default("z_neg")
    .describe("Electrode approach direction relative to workpiece coordinate system"),
  tilt_angle: z
    .number()
    .min(0)
    .max(45)
    .default(0)
    .describe("Tilt angle of the electrode relative to approach direction, degrees"),
  side_clearance: z
    .number()
    .min(0.01)
    .max(20)
    .default(1.0)
    .describe("Lateral clearance between electrode body and adjacent workpiece surfaces, mm"),
});

export type SideElectrode = z.infer<typeof sideElectrodeSchema>;

// ── 5. Spark Gap Validation ─────────────────────────────────────────────────

export const sparkGapValidationSchema = z.object({
  gap_tolerance: z
    .number()
    .min(0.001)
    .max(0.5)
    .default(0.01)
    .describe("Allowable deviation from nominal spark gap, mm"),
  material_conductivity_factor: z
    .number()
    .min(0.1)
    .max(10)
    .default(1.0)
    .describe("Material conductivity correction factor, dimensionless (higher = more conductive workpiece)"),
  dielectric_type: z
    .enum(["oil", "deionized_water", "kerosene"])
    .default("oil")
    .describe("Dielectric fluid type — affects spark gap and surface finish"),
  flushing_pressure: z
    .number()
    .min(0.5)
    .max(20)
    .default(3.0)
    .describe("Dielectric flushing pressure at the spark gap, bar"),
});

export type SparkGapValidation = z.infer<typeof sparkGapValidationSchema>;

// ── Electrode Schema Map ────────────────────────────────────────────────────

/** Union type of all electrode parameter objects */
export type ElectrodeSchemas = {
  electrode_design: ElectrodeDesign;
  holder_library: HolderLibrary;
  virtual_electrode: VirtualElectrode;
  side_electrode: SideElectrode;
  spark_gap_validation: SparkGapValidation;
};

/** Flat map from operation name to its Zod schema */
export const ELECTRODE_SCHEMA_MAP = {
  electrode_design: electrodeDesignSchema,
  holder_library: holderLibrarySchema,
  virtual_electrode: virtualElectrodeSchema,
  side_electrode: sideElectrodeSchema,
  spark_gap_validation: sparkGapValidationSchema,
} as const;

// ── Electrode Metadata ──────────────────────────────────────────────────────

export const ELECTRODE_METADATA: Record<string, ElectrodeOperationMeta> = {
  electrode_design: {
    paramCount: 6,
    acPythonSetter:
      "hm.electrode.design(overcut_rough={overcut_rough}, overcut_finish={overcut_finish}, spark_gap={spark_gap}, material='{electrode_material}', wear_ratio={wear_ratio}, clearance_angle={clearance_angle})",
    description: "Defines electrode geometry with overcut offsets, material, and wear parameters for EDM sinking",
    dfmCriticalParams: ["spark_gap", "overcut_rough", "overcut_finish"],
  },
  holder_library: {
    paramCount: 4,
    acPythonSetter:
      "hm.electrode.holder(type='{holder_type}', shank_dia={shank_diameter}, reach={reach_length}, taper='{taper_type}')",
    description: "Assigns a holder from the electrode holder library for machine compatibility",
  },
  virtual_electrode: {
    paramCount: 5,
    acPythonSetter:
      "hm.electrode.virtual(mode='{extraction_mode}', offset={offset_value}, draft_check={draft_check}, min_draft={min_draft}, split={split_electrodes})",
    description: "Extracts electrode shape from part cavity or boss geometry with draft validation",
  },
  side_electrode: {
    paramCount: 3,
    acPythonSetter:
      "hm.electrode.side(approach='{approach_direction}', tilt={tilt_angle}, clearance={side_clearance})",
    description: "Configures a side-approach electrode for lateral cavity features",
  },
  spark_gap_validation: {
    paramCount: 4,
    acPythonSetter:
      "hm.electrode.validate_gap(tolerance={gap_tolerance}, conductivity={material_conductivity_factor}, dielectric='{dielectric_type}', flush_pressure={flushing_pressure})",
    description: "Validates spark gap uniformity across electrode surfaces with material and dielectric corrections",
  },
};

/**
 * Total parameter count across all 5 electrode operation schemas.
 */
export const ELECTRODE_TOTAL_PARAM_COUNT: number = Object.values(
  ELECTRODE_METADATA
).reduce((sum, meta) => sum + meta.paramCount, 0);
