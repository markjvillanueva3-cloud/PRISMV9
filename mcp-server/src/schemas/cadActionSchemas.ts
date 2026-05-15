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

// ── Blueprint OCR → 6-CAD Orchestrator (U-CADC-BPRINT-OCR-ORCH-01) ──
const blueprintToAllCadsSchema = z.object({
  image: z.object({
    type: z.enum(["base64", "file", "url"]),
    data: z.string().optional(),
    path: z.string().optional(),
    url: z.string().optional(),
    media_type: z.enum(["image/jpeg", "image/png", "image/gif", "image/webp"]).optional(),
  }).optional().describe("Image source — vision mode"),
  analysis: z.unknown().optional().describe("Pre-built BlueprintAnalysis — analysis mode"),
  profiles: z.array(z.unknown()).optional(),
  vision: z.object({
    expected_units: z.enum(["mm", "inch"]).optional(),
    blueprint_type: z.enum(["wire_edm", "milling", "turning", "general"]).optional(),
    extract_geometry: z.boolean().optional(),
    model: z.string().optional(),
  }).optional(),
  targets: z.array(z.string()).optional(),
  outputDir: z.string().optional(),
  output_dir: z.string().optional(),
  defaultDepth: z.number().optional(),
  default_depth: z.number().optional(),
  partName: z.string().optional(),
  part_name: z.string().optional(),
  units: z.enum(["mm", "in"]).optional(),
}).passthrough();

const blueprintToAllCadsCapabilitiesSchema = z.object({}).passthrough();

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

// ── Part Folder Organizer — JM Die per-customer / per-part-number library ─────
const _printRefSchema = z.object({
  source_pdf: z.string().optional().describe("Multi-page source PDF the print page lives in."),
  file: z.string().optional().describe("Alternatively, a standalone file already on disk to copy in as-is."),
  page: z.number().int().min(0).max(100_000).optional().describe("0-based page index inside source_pdf."),
  drawing_score: z.number().optional().describe("Drawing-likelihood score 0..1 from the OCR pass."),
  doc_id: z.string().optional().describe("Docustrata document id."),
  label: z.string().optional().describe("Human label, e.g. 'print' / 'PO' / 'router'."),
});
const _programRefSchema = z.object({
  source_path: z.string().describe("Absolute path to the program / CAD file in JM DIE/."),
  machine_category: z.string().optional().describe("lathe / mill / wire_edm / ..."),
  kind3: z.string().optional().describe("'nc_program' (→ CNC PROGRAM/) or 'cam_project' (→ CAD-CAM/)."),
  kind: z.string().optional().describe("'program' or 'cad'."),
  customer: z.string().optional().describe("Customer the file was filed under (path-derived)."),
  via: z.string().optional().describe("How it was matched: exact / loose / ..."),
  customer_match: z.string().optional().describe("Whether the program's path-customer agrees with the print's OCR'd customer."),
});
const createPartFolderSchema = z.object({
  part_number: z.union([z.string(), z.number()]).optional().describe("The part number (required). String or number."),
  customer: z.string().optional().describe("Customer folder name. If omitted, resolved from program_customers > print_customers > _UNASSIGNED."),
  part_number_normalized: z.string().optional().describe("Normalized PN (op-prefix/rev stripped)."),
  raw_variants: z.array(z.string()).optional().describe("Raw OCR variants of the PN."),
  print_customers: z.array(z.string()).optional().describe("Customer name(s) OCR'd from the print title block."),
  program_customers: z.array(z.string()).optional().describe("Customer name(s) derived from matched-program folder paths."),
  match_confidence: z.string().optional().describe("Join-table confidence tier: exact / loose / ambiguous / miss."),
  prints: z.array(_printRefSchema).optional().describe("Print pages / related documents to place in the folder root."),
  cnc_programs: z.array(_programRefSchema).optional().describe("Pre-classified NC programs → CNC PROGRAM/."),
  cad_cam: z.array(_programRefSchema).optional().describe("Pre-classified CAM projects / CAD models → CAD-CAM/."),
  programs: z.array(_programRefSchema).optional().describe("Un-classified program list — the engine routes each by kind3/extension."),
  library_root: z.string().optional().describe("Override the library root (default H:/PRISM/JM DIE/_PART LIBRARY)."),
  copy_mode: z.enum(["copy", "manifest", "hardlink"]).optional().describe("copy = physical copies (default); hardlink = same-volume links; manifest = no copies, paths recorded only."),
  overwrite: z.boolean().optional().describe("Rebuild an already-complete folder. Default false (idempotent skip)."),
  join_table_source: z.string().optional().describe("Provenance string recorded in the manifest."),
  notes: z.array(z.string()).optional().describe("Extra manifest notes."),
});
const getPartFolderSchema = z.object({
  customer: z.string().describe("Customer folder name."),
  part_number: z.union([z.string(), z.number()]).optional().describe("The part number (required)."),
  library_root: z.string().optional().describe("Override the library root."),
});
const partLibraryStatsSchema = z.object({
  library_root: z.string().optional().describe("Override the library root."),
  by_customer: z.boolean().optional().describe("Include a per-customer breakdown."),
  with_disk: z.boolean().optional().describe("Also walk every part folder for file count + byte size (slower)."),
});
const partLibraryPopulateSchema = z.object({
  join_jsonl: z.string().optional().describe("Path to the print→program join jsonl (default blueprint-program-join-full-v5.jsonl)."),
  phase7_jsonl: z.string().optional().describe("Path to the doc_id→PDF-path jsonl (default phase7-drawing-candidates.jsonl)."),
  library_root: z.string().optional().describe("Override the library root."),
  confidence_filter: z.array(z.string()).optional().describe("Only include these match_confidence tiers. Default: everything except 'garbage'."),
  copy_mode: z.enum(["copy", "manifest", "hardlink"]).optional().describe("File placement mode. Default copy."),
  limit: z.number().int().min(1).max(100_000).optional().describe("Max rows to drain this call. Default 25 (the python script is the unbounded bulk path)."),
  offset: z.number().int().min(0).optional().describe("Skip this many eligible rows before starting (for chunked draining)."),
  dry_run: z.boolean().optional().describe("Don't create anything — just report what would be created."),
});

// ── Macro library (catalog the JM Okuma-OSP lathe macros + match parts to families + place a labelled TEMPLATE; the gated fill/emit pipeline is MACRO-PROGRAM-PIPELINE-MS0) ──
const _macroGeometrySchema = z.object({
  length_mm: z.number().optional().describe("Overall length, mm."),
  max_od_mm: z.number().optional().describe("Maximum OD, mm."),
  min_od_mm: z.number().optional().describe("Minimum OD, mm (0 if no step-down)."),
  bore_id_mm: z.number().optional().describe("Through-bore diameter, mm (0/undefined if solid)."),
  wall_thickness_mm: z.number().optional().describe("Minimum wall thickness, mm."),
  stock_form: z.enum(["bar", "forging", "casting", "hex_bar", "tube", "pre_machined"]).optional().describe("Stock form."),
  features: z.array(z.string()).optional().describe("Feature-signature keywords."),
  tightest_tolerance_mm: z.number().optional().describe("Tightest tolerance, mm."),
  has_bolt_circle: z.boolean().optional().describe("Has a bolt circle / mounting holes."),
  has_keyway: z.boolean().optional().describe("Has a keyway."),
  has_threads: z.boolean().optional().describe("Has threads."),
  has_grooves: z.boolean().optional().describe("Has groove(s)."),
  od_step_count: z.number().int().optional().describe("Number of OD step diameters."),
  blind_bore: z.boolean().optional().describe("Bore is blind (not through)."),
  threaded_both_ends: z.boolean().optional().describe("Both ends threaded."),
  iso_group: z.string().optional().describe("Material ISO group."),
}).describe("Lathe part geometry (the LathePartClassifierEngine input).");
export const macroLibraryListSchema = z.object({
  dir: z.string().optional().describe("Override the macro source directory (default: JM DIE/Macro programs/)."),
  macro_source_dir: z.string().optional().describe("Alias for `dir`."),
});
export const macroMatchFamilySchema = z.object({
  geometry: _macroGeometrySchema.optional().describe("Lathe geometry — preferred; classified via LathePartClassifierEngine."),
  features: z.array(z.string()).optional().describe("Free-form feature keywords (also taken from geometry.features)."),
  name_text: z.string().optional().describe("Any text associated with the part (PN, description, drawing title) — die-detail names often encode the family."),
  counterbore_present: z.boolean().optional().describe("Explicit: a counterbore is present (overrides inference)."),
  flange_step_present: z.boolean().optional().describe("Explicit: a flange/brim step is present (overrides inference)."),
  od_taper_present: z.boolean().optional().describe("Explicit: an OD taper is present."),
  id_taper_present: z.boolean().optional().describe("Explicit: an ID taper is present."),
});
export const macroPlaceTemplateSchema = z.object({
  part_number: z.union([z.string(), z.number()]).describe("The part number (required)."),
  customer: z.string().optional().describe("Customer folder name. If omitted, falls back to _UNASSIGNED for the path."),
  family: z.enum(["wafer-insert", "casing", "casing-counterbore", "top-hat-casing"]).optional().describe("The macro family. If omitted, supply `match` so a family can be resolved."),
  match: macroMatchFamilySchema.optional().describe("Match input (geometry/features/name) — used to resolve a family when `family` is omitted."),
  library_root: z.string().optional().describe("Override the part-library root (tests use a temp dir)."),
  macro_source_dir: z.string().optional().describe("Override the macro source directory."),
  dry_run: z.boolean().optional().describe("Do everything except write."),
});
export const macroFanoutDryRunSchema = z.object({
  library_root: z.string().optional().describe("Override the part-library root."),
  limit: z.number().int().min(1).max(1_000_000).optional().describe("Max part folders to scan."),
  sample_size: z.number().int().min(0).max(1000).optional().describe("How many matched parts to include in the returned sample (default 25)."),
});

/**
 * MS0-U6 — MacroBulkEmitOrchestratorEngine.emitBatch (BULK PATH, gated, NEVER auto)
 *
 * Companion Stop hook `macro-bulk-emit-guard` blocks Stop if any batch ran
 * without a corresponding _BATCH_<n>_APPROVED marker. ALL files emitted by
 * the underlying U5 still carry `needsOperatorReview: true` — first-piece
 * prove-out is unconditional.
 */
export const macroBulkEmitBatchSchema = z.object({
  batchNumber: z.number().int().min(0).describe("Batch index (>=0). Batch 0 needs no prior approval; n>=1 requires _BATCH_{n-1}_APPROVED."),
  libraryRoot: z.string().min(1).describe("Library root for _MACRO_BATCH_<n>_REVIEW.md + _MACRO_BULK_LOG.md + _MACRO_NEEDS_HUMAN.md."),
  batchSize: z.number().int().min(1).max(500).optional().describe("Default 25; caps at 500."),
  parts: z.array(z.object({
    customerName: z.string().min(1),
    partNumber: z.string().min(1),
    features: z.unknown().optional(),
    needsHumanReason: z.string().optional(),
  })).describe("Explicit parts list — production callers feed from PartFolderOrganizerEngine + macroNeedsFill scan."),
  borderlineThreshold: z.number().min(0.70).max(2.0).optional().describe("Borderline band ceiling (default 0.75; parts with 0.70<=S(x)<this go to needsHuman, NOT emitted)."),
  fillMachineHint: z.string().optional().describe("Default 'OKUMA_LB-3000-EX'."),
  approvedEnvVarName: z.string().optional().describe("Default 'MACRO_PROGRAM_PIPELINE_BATCH_APPROVED'."),
  dryRun: z.boolean().optional().describe("Do everything except writes."),
});

export const macroApproveBatchSchema = z.object({
  batchNumber: z.number().int().min(0).describe("Batch index to approve (creates _BATCH_<n>_APPROVED marker)."),
  libraryRoot: z.string().min(1).describe("Library root (same as the batch's emit)."),
  approvedBy: z.string().min(1).describe("Operator identity (audit trail)."),
  approvalNote: z.string().optional().describe("Free-text note (e.g. 'reviewed 25 parts, 3 flagged')."),
});

/**
 * MS0-U5 — MacroPerMachineEmitterEngine.emitPerMachine
 *
 * Inputs at runtime use camelCase (dossier, partRef, targetMachines) because
 * the engine consumes the GateResult.dossier shape verbatim from U4 (which
 * also uses camelCase). The dispatcher passes params through unchanged after
 * shape-level validation — Zod here checks structure, not exact field-name
 * casing, so the engine's own Zod schema is the authoritative input gate.
 */
export const macroEmitPerMachineSchema = z.object({
  dossier: z.object({
    candidate: z.unknown().describe("MacroFillCandidate from U2 (carried inside the U4 dossier)."),
    safetyRecord: z.object({ passed: z.boolean() }).passthrough().describe("U4 SafetyRecord — must have passed=true."),
    needsOperatorReview: z.literal(true).describe("Always true on a U4-passed dossier."),
  }).passthrough().describe("The full SignoffDossier from MacroCandidateGateEngine.gateCandidate (passed=true)."),
  partRef: z.object({
    customerName: z.string().min(1).describe("Customer folder (single segment)."),
    partNumber: z.string().min(1).describe("Part number (single segment)."),
    cncProgramDir: z.string().optional().describe("Override CNC PROGRAM output dir. Must resolve under libraryRoot."),
    partJsonPath: z.string().optional().describe("Override part.json path. Must resolve under libraryRoot."),
    libraryRoot: z.string().optional().describe("Library root (defaults to H:/PRISM/JM DIE/_PART LIBRARY)."),
  }).describe("Part reference — where the .MIN files are written and which part.json is updated."),
  targetMachines: z.array(z.string()).optional().describe("Optional fleet restriction. undefined = full JM Die lathe fleet. [] = none (NOT a fallback)."),
});

// TRAINING-LEARNING-MS0/U1: CAD-side bridge for placing a lathe template into a part folder.
// Family enum is narrowed to the 4 OSP-anchored families — the ONLY families for which a
// .min macro source file exists in MacroLibraryEngine.CATALOG. Empirically verified
// 2026-05-13: a wider enum surfaces the engine's non-null-assertion crash at
// MacroLibraryEngine.ts:409 (`CATALOG.find(...)!` returns undefined for non-OSP families
// and the following `cat.file` access throws). Reviewer B's "widen the enum" P0 was based
// on a misreading: lathe_training_template_match (turning dispatcher) is the action that
// works with all 12 LatheTemplateFamily literals — it emits JSON training templates that
// have no .min source dependency. cad_lathe_template_place places real .min macro files
// and so is correctly scoped to the macro-library's actual surface. Dedicated schema (vs
// reusing macroPlaceTemplateSchema) preserves the option to evolve the two independently
// when MacroLibraryEngine.CATALOG widens in a future unit.
export const cadLatheTemplatePlaceSchema = z.object({
  part_number: z.union([z.string(), z.number()]).describe("The part number (required)."),
  customer: z.string().optional().describe("Customer folder name. If omitted, falls back to _UNASSIGNED for the path."),
  family: z.enum([
    "wafer-insert",
    "casing",
    "casing-counterbore",
    "top-hat-casing",
  ]).optional().describe("The lathe template family — restricted to the 4 OSP-anchored families that have a .min macro source file in MacroLibraryEngine.CATALOG. For broader 12-family lathe template extraction (JSON output, no .min dependency), use prism_turning:lathe_training_template_match."),
  match: macroMatchFamilySchema.optional().describe("Match input (geometry/features/name) — used to resolve a family when `family` is omitted."),
  library_root: z.string().optional().describe("Override the part-library root (tests use a temp dir)."),
  macro_source_dir: z.string().optional().describe("Override the macro source directory."),
  dry_run: z.boolean().optional().describe("Do everything except write."),
});

// MS-PRINT-PROGRAM-LOOP/U-PPL-D4 — CADArchiveJoinAugmenterEngine inputs.
export const cadArchiveJoinAugmentSchema = z.object({
  masterIndexPath: z
    .string()
    .optional()
    .describe(
      "Absolute path to CADFileIndexerEngine master-index.json. Defaults to <cwd>/data/state/cad-file-index/master-index.json.",
    ),
  joinJsonlPath: z
    .string()
    .optional()
    .describe(
      "Path to BlueprintProgramJoinEngine v6 JSONL. Defaults to Docustrata/.index/blueprint-program-join-full-v6.jsonl.",
    ),
  triplesJsonlPath: z
    .string()
    .optional()
    .describe("Optional training-triples-v4.jsonl path (forwarded to loadJoinIndex)."),
  maxLineBytes: z
    .number()
    .int()
    .positive()
    .optional()
    .describe("Per-line byte cap when streaming the join JSONL. Default 4 MiB."),
  millOnly: z
    .boolean()
    .optional()
    .describe(
      "When true, reject CAD entries whose machineCategory is not in {mill, hurco, hypermill}. Default false (include all categories).",
    ),
  formats: z
    .array(z.string())
    .optional()
    .describe(
      "Optional override of the format allowlist. Defaults to MILL_PROGRAM_FORMATS (.ipt/.iam/.f3d/.f3z/.sldprt/.sldasm).",
    ),
});

/**
 * Action schemas for prism_cad dispatcher.
 * Maps action name to Zod schema for validation.
 */
export const ACTION_CAD_SCHEMAS: Record<string, z.ZodType<any>> = {
  // MS-PRINT-PROGRAM-LOOP/U-PPL-D4
  cad_archive_join_augment: cadArchiveJoinAugmentSchema,
  cad_archive_join_augment_dry: cadArchiveJoinAugmentSchema,
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
  // CAD Capability Negotiator — CAD-COMPLETE-MS0/U-CADC-AI03
  cad_capability_negotiate: z.object({
    ops: z.array(z.string()).describe("Ordered CAD operation kinds the caller wants to emit"),
    preferredSystem: z.string().optional().describe("Preferred CAD adapter id; picked first when policy allows"),
    policy: z.enum(["strict", "fallback", "best_fit"]).optional().describe("strict throws on missing op; fallback tries alternatives; best_fit picks highest coverage"),
    excludeSystems: z.array(z.string()).optional().describe("Adapter ids that may never be considered"),
    excludeSubprocess: z.boolean().optional().describe("When true, adapters with requiresSubprocess=true are filtered out"),
  }),
  cad_capability_negotiate_or_throw: z.object({
    // .min(1) — "throw on missing" with zero ops is semantically incoherent;
    // schema-reject at the MCP boundary so callers get a clear error rather
    // than silent trivial-supported behavior.
    ops: z.array(z.string()).min(1).describe("Ordered CAD operation kinds the caller wants to emit (at least one required)"),
    preferredSystem: z.string().optional().describe("Preferred CAD adapter id"),
    policy: z.enum(["strict", "fallback", "best_fit"]).optional().describe("Negotiation policy"),
    excludeSystems: z.array(z.string()).optional().describe("Adapter blocklist"),
    excludeSubprocess: z.boolean().optional().describe("Filter subprocess-required adapters"),
  }),
  cad_capability_list_gaps: z.object({
    referenceOps: z.array(z.string()).optional().describe("Optional op-kind reference list; when omitted returns the full capability snapshot per adapter"),
  }),
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
  // Blueprint OCR → 6-CAD Orchestrator
  blueprint_to_all_cads: blueprintToAllCadsSchema,
  blueprint_to_all_cads_validate: blueprintToAllCadsSchema,
  blueprint_to_all_cads_capabilities: blueprintToAllCadsCapabilitiesSchema,
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
  // Part Folder Organizer — JM Die per-customer / per-part-number library
  create_part_folder: createPartFolderSchema,
  get_part_folder: getPartFolderSchema,
  part_library_stats: partLibraryStatsSchema,
  part_library_populate: partLibraryPopulateSchema,
  // Macro library — catalog the JM Okuma-OSP lathe macros + match parts to families + place a labelled TEMPLATE
  macro_library_list: macroLibraryListSchema,
  macro_match_family: macroMatchFamilySchema,
  macro_place_template: macroPlaceTemplateSchema,
  macro_fanout_dry_run: macroFanoutDryRunSchema,
  // TRAINING-LEARNING-MS0/U1: CAD-domain bridge alias for macro_place_template,
  // scoped to ALL 12 LatheTemplateFamily literals (not just the 4 OSP-anchored).
  // Reviewer B P0: the envelope's `families_target` at MS0-U1 line 86 explicitly
  // includes `shaft` and `flange` — they must pass Zod even though the engine has
  // no OSP-anchored macro file for them (engine returns a structured graceful
  // failure: `{placed:false, family, reason: "macro source file not found: ..."}`).
  cad_lathe_template_place: cadLatheTemplatePlaceSchema,
};
