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

// ── Print → Fusion 360 Bridge (U-CADC-FUS-PRINT-01) ─────────────────────────
const printToFusion360Schema = z.object({
  analysis: z.unknown().optional().describe("BlueprintAnalysis from BlueprintVisionOCREngine"),
  profiles: z.array(z.unknown()).optional().describe("ExtractedProfile[] from blueprint vision"),
  dimensions: z.array(z.unknown()).optional().describe("ExtractedDimension[] (used when no profiles)"),
  partName: z.string().optional().describe("Part name override"),
  part_name: z.string().optional(),
  units: z.enum(["mm", "in"]).optional().describe("Unit system (default: title_block.units → mm)"),
  outputDir: z.string().optional(),
  output_dir: z.string().optional(),
  targetVersion: z.enum(["2023", "2024", "2025"]).optional().describe("Fusion 360 version target"),
  target_version: z.enum(["2023", "2024", "2025"]).optional(),
  defaultDepth: z.number().optional().describe("Default extrusion depth in mm when no depth dim"),
  default_depth: z.number().optional(),
}).passthrough();

const printToFusion360ValidateSchema = z.object({
  analysis: z.unknown().optional(),
  profiles: z.array(z.unknown()).optional(),
  dimensions: z.array(z.unknown()).optional(),
  defaultDepth: z.number().optional(),
  default_depth: z.number().optional(),
}).passthrough();

const printToFusion360CapabilitiesSchema = z.object({}).passthrough();

// ── Print → Mastercam / Inventor / SolidWorks / Esprit Bridges ──────────────
const printToBridgeBaseSchema = z.object({
  analysis: z.unknown().optional(),
  profiles: z.array(z.unknown()).optional(),
  dimensions: z.array(z.unknown()).optional(),
  partName: z.string().optional(),
  part_name: z.string().optional(),
  units: z.enum(["mm", "in"]).optional(),
  defaultDepth: z.number().optional(),
  default_depth: z.number().optional(),
}).passthrough();

const printToCapabilitiesSchema = z.object({}).passthrough();

// ── Esprit Code Generator (U-CADC-ESP-CODEGEN-01) ───────────────────────────
const espritGenerateScriptSchema = z.object({
  operations: z.array(z.unknown()).optional(),
  projectName: z.string().optional(),
  units: z.enum(["mm", "in"]).optional(),
  outputDir: z.string().optional(),
  targetVersion: z.enum(["2023", "2024", "2025"]).optional(),
}).passthrough();

const espritCapabilitiesSchema = z.object({}).passthrough();

// ── Print → All CADs Orchestrator (U-CADC-PRINT-ORCHESTRATOR-01) ─────────────
const printToAllCadsSchema = z.object({
  analysis: z.unknown().optional(),
  profiles: z.array(z.unknown()).optional(),
  dimensions: z.array(z.unknown()).optional(),
  partName: z.string().optional(),
  part_name: z.string().optional(),
  units: z.enum(["mm", "in"]).optional(),
  outputDir: z.string().optional(),
  output_dir: z.string().optional(),
  defaultDepth: z.number().optional(),
  default_depth: z.number().optional(),
  targets: z.array(z.string()).optional(),
}).passthrough();

const printToAllCadsTargetsSchema = z.object({}).passthrough();

// ── Print → hyperCAD-S Analysis Bridge / Live Bridges (SW + Esprit) ─────────
const printToHyperCADSAnalysisSchema = z.object({
  analysis: z.unknown().optional(),
  profiles: z.array(z.unknown()).optional(),
  dimensions: z.array(z.unknown()).optional(),
  partName: z.string().optional(),
  part_name: z.string().optional(),
  units: z.enum(["mm", "in"]).optional(),
  outputDir: z.string().optional(),
  output_dir: z.string().optional(),
  targetVersion: z.enum(["2023", "2024", "2025"]).optional(),
  target_version: z.enum(["2023", "2024", "2025"]).optional(),
  defaultDepth: z.number().optional(),
  default_depth: z.number().optional(),
}).passthrough();

const liveExecuteSchema = z.object({
  script: z.union([z.string(), z.unknown()]).optional(),
  config: z.object({
    mode: z.enum(["http", "com", "mock"]),
    endpoint: z.string().optional(),
    timeoutMs: z.number().optional(),
    comShimPath: z.string().optional(),
  }).optional(),
  mode: z.enum(["http", "com", "mock"]).optional(),
}).passthrough();

const liveValidateSchema = z.object({
  config: z.object({
    mode: z.enum(["http", "com", "mock"]),
    endpoint: z.string().optional(),
    timeoutMs: z.number().optional(),
    comShimPath: z.string().optional(),
  }).optional(),
  mode: z.enum(["http", "com", "mock"]).optional(),
}).passthrough();

const liveModesSchema = z.object({}).passthrough();

// ── CAD Trial-Error Learning Actions (U-CADC29) ───────────────────────────────
const cadTrialIngestSchema = z.object({
  outcome: z.unknown().optional(),
  outcomes: z.array(z.unknown()).optional(),
});

const cadTrialPatternsSchema = z.object({}).passthrough();

const cadTrialRecommendSchema = z.object({
  candidate: z
    .object({
      partType: z.string().optional(),
      features: z.array(z.string()).optional(),
      generator: z.string().optional(),
    })
    .passthrough()
    .optional(),
});

const cadTrialStatsSchema = z.object({
  since: z.string().optional(),
  partType: z.string().optional(),
});

const cadTrialResetSchema = z.object({
  eraseLedger: z.boolean().optional(),
});

// ── NACA Airfoil Engine Actions (U-CADC13) ────────────────────────────────────
const nacaGenerate4DigitSchema = z.object({
  designation: z.string().describe("4-digit NACA designator (e.g. '2412', '0012'). 'NACA' prefix and dashes/spaces are stripped automatically."),
  numPoints: z.number().optional().describe("Points per surface (upper + lower). Floor 3. Default 81."),
  chord: z.number().optional().describe("Chord length in the caller's units (typically meters). Default 1."),
  cosineSpacing: z.boolean().optional().describe("Use cosine clustering at leading edge. Default true."),
  closedTrailingEdge: z.boolean().optional().describe("Use a4 = -0.1036 for zero-thickness TE. Default true."),
});

const nacaGenerate5DigitSchema = z.object({
  designation: z.string().describe("5-digit NACA designator (e.g. '23012'). Supports standard {210,220,230,240,250} and reflexed {221,231,241,251} camber tags from NACA TR-537."),
  numPoints: z.number().optional().describe("Points per surface. Floor 3. Default 81."),
  chord: z.number().optional().describe("Chord length scaling. Default 1."),
  cosineSpacing: z.boolean().optional().describe("Use cosine clustering at leading edge. Default true."),
  closedTrailingEdge: z.boolean().optional().describe("Use a4 = -0.1036 for zero-thickness TE. Default true."),
});

const nacaParseUIUCDatSchema = z.object({
  content: z.string().describe("Raw text of a UIUC Airfoil Database Selig-format .dat file."),
  chord: z.number().optional().describe("Chord scaling applied to parsed coordinates. Default 1."),
});

// ── Lofted Wing Engine Actions (U-CADC14) ─────────────────────────────────────
const airfoilProfileRefSchema = z.object({
  naca4: z.string().optional().describe("Shortcut: 4-digit NACA designator (generates profile on the fly)."),
  naca5: z.string().optional().describe("Shortcut: 5-digit NACA designator (generates profile on the fly)."),
  uiucDat: z.string().optional().describe("Shortcut: raw UIUC Selig .dat content (parses on the fly)."),
  options: z.record(z.string(), z.any()).optional().describe("Options forwarded to NACAAirfoilEngine when using naca4/naca5 shortcut."),
  chord: z.number().optional().describe("Chord scaling for uiucDat shortcut."),
  // Passthrough for a full AirfoilProfile
  name: z.string().optional(),
  maxCamber: z.number().optional(),
  maxCamberPosition: z.number().optional(),
  maxThickness: z.number().optional(),
  upper: z.array(z.object({ x: z.number(), y: z.number() })).optional(),
  lower: z.array(z.object({ x: z.number(), y: z.number() })).optional(),
  selig: z.array(z.object({ x: z.number(), y: z.number() })).optional(),
});

const loftOptionsSchema = z.object({
  halfSpan: z.number().describe("Half-span (tip-to-root distance) in meters. Must be > 0."),
  rootChord: z.number().describe("Root chord in meters. Must be > 0."),
  tipChord: z.number().describe("Tip chord in meters. Must be > 0."),
  quarterChordSweepDeg: z.number().optional().describe("Quarter-chord sweep angle in degrees."),
  dihedralDeg: z.number().optional().describe("Dihedral angle in degrees (positive raises tip above root)."),
  tipTwistDeg: z.number().optional().describe("Twist at tip in degrees (washout is negative)."),
  rootTwistDeg: z.number().optional().describe("Twist at root in degrees (default 0)."),
  numStations: z.number().optional().describe("Number of spanwise stations including root and tip. Default 11."),
  cosineSpanwise: z.boolean().optional().describe("Use cosine clustering spanwise. Default true."),
});

const wingLoftSingleProfileSchema = z.object({
  profile: airfoilProfileRefSchema.describe("Single airfoil used at every spanwise station."),
  options: loftOptionsSchema.describe("Wing geometry options."),
});

const wingLoftBetweenProfilesSchema = z.object({
  rootProfile: airfoilProfileRefSchema.describe("Airfoil at the root station (y=0)."),
  tipProfile: airfoilProfileRefSchema.describe("Airfoil at the tip station (y=halfSpan)."),
  options: loftOptionsSchema.describe("Wing geometry options."),
});

const wingComputePropertiesSchema = z.object({
  sections: z.array(z.object({
    station: z.number(),
    chord: z.number(),
    twistRad: z.number().optional(),
    sweepOffset: z.number().optional(),
    dihedralOffset: z.number().optional(),
    profile: z.any().optional(),
  })).describe("Ordered spanwise sections (root→tip). Must have ≥2 entries."),
});

// ── Involute Gear Engine Actions (U-CADC15) ────────────────────────────────
const gearSpecSchema = z.object({
  teeth: z.number().describe("Number of teeth z. Must be integer ≥ 5."),
  module: z.number().describe("Module m in mm. Must be > 0."),
  pressureAngleDeg: z.number().optional().describe("Pressure angle in degrees. Default 20 (ISO 53)."),
  faceWidth: z.number().optional().describe("Face width in mm (informational, default 0)."),
  profileShift: z.number().optional().describe("Profile shift coefficient x. Default 0."),
  addendumCoeff: z.number().optional().describe("Addendum coefficient h_a* (default 1.0 per ISO 53)."),
  dedendumCoeff: z.number().optional().describe("Dedendum coefficient h_d* (default 1.25 per ISO 53)."),
});

const gearComputeGeometrySchema = z.object({
  spec: gearSpecSchema.optional().describe("Gear spec object. If omitted, the whole params object is used as the spec."),
  teeth: z.number().optional(),
  module: z.number().optional(),
  pressureAngleDeg: z.number().optional(),
  profileShift: z.number().optional(),
  faceWidth: z.number().optional(),
  addendumCoeff: z.number().optional(),
  dedendumCoeff: z.number().optional(),
});

const gearGenerateToothProfileSchema = gearComputeGeometrySchema.extend({
  samplesPerFlank: z.number().optional().describe("Number of involute samples per flank. Default 25, floor 5."),
});

const gearComputeContactRatioSchema = z.object({
  gear1: gearSpecSchema.describe("First mesh partner (pinion)."),
  gear2: gearSpecSchema.describe("Second mesh partner (gear). Module and pressure angle must match gear1."),
});

// ── Helical Spring Engine Actions (U-CADC16) ──────────────────────────────
const springSpecSchema = z.object({
  wireDiameter: z.number().describe("Wire diameter d in mm. Must be > 0."),
  meanCoilDiameter: z.number().describe("Mean coil diameter D in mm. Must be > d."),
  activeCoils: z.number().describe("Active coils N_a. Must be > 0."),
  endCondition: z.enum(["plain", "plain_ground", "squared", "squared_ground"]).optional(),
  material: z.enum(["music_wire", "hard_drawn", "chrome_vanadium", "chrome_silicon", "stainless_302", "phosphor_bronze", "inconel_x750"]).optional(),
  shearModulusMPa: z.number().optional().describe("Shear modulus G in MPa (override material lookup)."),
  pitch: z.number().optional(),
  freeLength: z.number().optional(),
  materialDensityKgM3: z.number().optional(),
});

const springBaseSchema = z.object({
  spec: springSpecSchema.optional(),
  wireDiameter: z.number().optional(),
  meanCoilDiameter: z.number().optional(),
  activeCoils: z.number().optional(),
  endCondition: z.string().optional(),
  material: z.string().optional(),
  shearModulusMPa: z.number().optional(),
  pitch: z.number().optional(),
  freeLength: z.number().optional(),
  materialDensityKgM3: z.number().optional(),
});

const springComputeGeometrySchema = springBaseSchema;
const springComputeMechanicsSchema = springBaseSchema;

const springComputeStressAtForceSchema = springBaseSchema.extend({
  forceN: z.number().describe("Axial force in N."),
  useWahl: z.boolean().optional().describe("Apply Wahl correction. Default true."),
});

const springGenerateCoilPathSchema = springBaseSchema.extend({
  samplesPerCoil: z.number().optional().describe("Samples per coil. Floor 8. Default 36."),
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
  // Print → Fusion 360 Bridge (U-CADC-FUS-PRINT-01)
  print_to_fusion360: printToFusion360Schema,
  print_to_fusion360_validate: printToFusion360ValidateSchema,
  print_to_fusion360_capabilities: printToFusion360CapabilitiesSchema,
  // Print → Mastercam / Inventor / SolidWorks / Esprit Bridges
  print_to_mastercam: printToBridgeBaseSchema,
  print_to_mastercam_validate: printToBridgeBaseSchema,
  print_to_mastercam_capabilities: printToCapabilitiesSchema,
  print_to_inventor: printToBridgeBaseSchema,
  print_to_inventor_validate: printToBridgeBaseSchema,
  print_to_inventor_capabilities: printToCapabilitiesSchema,
  print_to_solidworks: printToBridgeBaseSchema,
  print_to_solidworks_validate: printToBridgeBaseSchema,
  print_to_solidworks_capabilities: printToCapabilitiesSchema,
  print_to_esprit: printToBridgeBaseSchema,
  print_to_esprit_validate: printToBridgeBaseSchema,
  print_to_esprit_capabilities: printToCapabilitiesSchema,
  // Esprit Code Generator
  esprit_generate_script: espritGenerateScriptSchema,
  esprit_capabilities: espritCapabilitiesSchema,
  // Print → All CADs Orchestrator
  print_to_all_cads: printToAllCadsSchema,
  print_to_all_cads_validate: printToAllCadsSchema,
  print_to_all_cads_targets: printToAllCadsTargetsSchema,
  // Print → hyperCAD-S Analysis Bridge
  print_to_hypercads_analysis: printToHyperCADSAnalysisSchema,
  print_to_hypercads_analysis_validate: printToHyperCADSAnalysisSchema,
  print_to_hypercads_analysis_capabilities: liveModesSchema,
  // SolidWorks Live Bridge
  solidworks_live_execute: liveExecuteSchema,
  solidworks_live_validate: liveValidateSchema,
  solidworks_live_modes: liveModesSchema,
  // Esprit Live Bridge
  esprit_live_execute: liveExecuteSchema,
  esprit_live_validate: liveValidateSchema,
  esprit_live_modes: liveModesSchema,
  // CAD Trial-Error Learning (U-CADC29)
  cad_trial_ingest: cadTrialIngestSchema,
  cad_trial_patterns: cadTrialPatternsSchema,
  cad_trial_recommend: cadTrialRecommendSchema,
  cad_trial_stats: cadTrialStatsSchema,
  cad_trial_reset: cadTrialResetSchema,
  // NACA Airfoil Engine (U-CADC13)
  naca_generate_4digit: nacaGenerate4DigitSchema,
  naca_generate_5digit: nacaGenerate5DigitSchema,
  naca_parse_uiuc_dat: nacaParseUIUCDatSchema,
  // Lofted Wing Engine (U-CADC14)
  wing_loft_single_profile: wingLoftSingleProfileSchema,
  wing_loft_between_profiles: wingLoftBetweenProfilesSchema,
  wing_compute_properties: wingComputePropertiesSchema,
  // Involute Gear Engine (U-CADC15)
  gear_compute_geometry: gearComputeGeometrySchema,
  gear_generate_tooth_profile: gearGenerateToothProfileSchema,
  gear_compute_contact_ratio: gearComputeContactRatioSchema,
  // Helical Spring Engine (U-CADC16)
  spring_compute_geometry: springComputeGeometrySchema,
  spring_compute_mechanics: springComputeMechanicsSchema,
  spring_compute_stress_at_force: springComputeStressAtForceSchema,
  spring_generate_coil_path: springGenerateCoilPathSchema,
};
