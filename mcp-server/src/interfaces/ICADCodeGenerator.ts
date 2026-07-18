/**
 * ICADCodeGenerator — U-CADC00 (PHASE-0B)
 *
 * Unified contract for every PRISM CAD-script generator. A single ICADCodeGenerator
 * implementation owns a specific CAD host (FreeCAD, Fusion 360, CadQuery /
 * OpenCascade, Inventor/iLogic, Mastercam NET-Hook, hyperMILL AC, hyperCAD-S AC,
 * SolidWorks VBA, etc.) and exposes a **common vocabulary** for building, running,
 * and validating scripts.
 *
 * Goals:
 *   - Synergy: every CAD target speaks the same operation vocabulary so upstream
 *     orchestrators (Intent → Feature → CAD → CAM) can retarget without rewiring.
 *   - Capability honesty: each generator declares what it supports; callers get a
 *     fail-fast error when asked to emit an op that the host does not handle.
 *   - Safe execution: executeScript() is typed as async so subprocess / out-of-
 *     process implementations (CadQuery via Python, Fusion via REST, Mastercam via
 *     COM+.NET) share one shape.
 *   - Traceability: buildScript() returns a Script plus per-op code lineage so
 *     reviewers can answer "where did this G-code parameter come from?".
 *
 * schemaVersion: 1.
 *
 * Sources:
 *   - CadQueryCodeGeneratorEngine (TypeScript → Python cadquery)
 *   - Fusion360CodeGeneratorEngine (TypeScript → Python fusion API, cm units)
 *   - HyperMillCodeGeneratorEngine (hyperMILL Automation Center Python)
 *   - InventorCAMCodeGeneratorEngine (iLogic VB.NET)
 *
 * @module interfaces/ICADCodeGenerator
 */

// ── CAD system registry ────────────────────────────────────────────────────

/**
 * Identifiers for every CAD host PRISM can emit scripts for. Grows monotonically;
 * additions must be appended rather than reordered.
 */
export const CAD_SYSTEMS = [
  "freecad",
  "fusion360",
  "cadquery",
  "inventor",
  "inventor_hsm",
  "solidworks",
  "mastercam",
  "hypermill",
  "hypercad_s",
  "catia_v5",
  "creo",
  "nx",
  "onshape",
  "rhino",
  "esprit",
] as const;
export type CADSystemId = (typeof CAD_SYSTEMS)[number];

// ── Canonical operation vocabulary ─────────────────────────────────────────

/**
 * Canonical CAD operation kinds. A host that does not support a given kind
 * omits it from its capability set and the base class throws a fast, typed
 * UnsupportedCapabilityError at build time.
 */
export const CAD_OPERATION_KINDS = [
  // Sketch
  "sketch_create",
  "sketch_close",
  "sketch_line",
  "sketch_arc",
  "sketch_circle",
  "sketch_rectangle",
  "sketch_polygon",
  "sketch_spline",
  "sketch_ellipse",
  "sketch_slot",
  "sketch_point",
  "sketch_constraint",
  "sketch_dimension",
  "sketch_centerline",
  "sketch_mirror",
  "sketch_offset",
  "sketch_trim",
  "sketch_extend",
  "sketch_fillet",
  "sketch_chamfer",
  // Feature (solid)
  "feature_extrude",
  "feature_revolve",
  "feature_loft",
  "feature_sweep",
  "feature_hole",
  "feature_pocket",
  "feature_fillet",
  "feature_chamfer",
  "feature_shell",
  "feature_draft",
  "feature_rib",
  "feature_thread",
  "feature_boss",
  "feature_mirror",
  "feature_pattern_linear",
  "feature_pattern_circular",
  // Feature (surface)
  "surface_ruled",
  "surface_loft",
  "surface_sweep",
  "surface_fill",
  "surface_offset",
  "surface_trim",
  "surface_extend",
  "surface_extrude",
  "surface_revolve",
  "surface_thicken",
  // Boolean / combine
  "boolean_union",
  "boolean_intersect",
  "boolean_subtract",
  // Pattern / transform
  "pattern_linear",
  "pattern_circular",
  "pattern_mirror",
  "transform_move",
  "transform_rotate",
  "transform_scale",
  "transform_mirror",
  "transform_pattern_linear",
  "transform_pattern_circular",
  // Reference geometry
  "datum_plane",
  "datum_axis",
  "datum_point",
  "datum_coord_system",
  // Assembly
  "assembly_insert",
  "assembly_insert_component",
  "assembly_mate_concentric",
  "assembly_mate_coincident",
  "assembly_mate_distance",
  "assembly_mate_angle",
  "assembly_mate_parallel",
  "assembly_mate",
  "assembly_pattern",
  "assembly_create",
  "assembly_add_component",
  "assembly_constrain",
  "assembly_explode",
  // Drawing
  "drawing_view_base",
  "drawing_view_section",
  "drawing_view_detail",
  "drawing_view",
  "drawing_dimension",
  "drawing_note",
  "drawing_annotation",
  // Import / export
  "import_step",
  "import_iges",
  "import_stl",
  "import_dxf",
  "import_jt",
  "import_parasolid",
  "export_step",
  "export_iges",
  "export_stl",
  "export_dxf",
  "export_pdf",
  "export_f3d",
  "export_jt",
  "export_parasolid",
  // Parametric / spreadsheet
  "parameter_declare",
  "parameter_equation",
  "parameter_table",
  // Utility
  "custom",
] as const;
export type CADOperationKind = (typeof CAD_OPERATION_KINDS)[number];

// ── Operation payload ──────────────────────────────────────────────────────

/** Free-form scalar map for operation arguments. */
export type CADOperationArgs = Record<
  string,
  string | number | boolean | null | undefined | ReadonlyArray<number> | ReadonlyArray<string>
>;

/**
 * A single operation request. Upstream layers pipe a stream of these into
 * `buildScript(ops, ctx)`; each implementation translates them into host syntax.
 */
export interface CADOperation {
  kind: CADOperationKind;
  args: CADOperationArgs;
  /** Caller-supplied stable id (used for lineage + telemetry). */
  operationId?: string;
  /** Human-readable description for reviewers + tribal-tip overlays. */
  description?: string;
  /** Non-fatal hints — e.g. "use peck drilling on L/D > 5". */
  hints?: ReadonlyArray<string>;
  /** Compatibility alias for args used by some legacy CAD generators. */
  params?: Record<string, unknown>;
  /** Index in the originating operation stream (lineage telemetry). */
  opIndex?: number;
  /** Compatibility alias for description used by some legacy CAD generators. */
  comment?: string;
}

// ── Build phase outputs ────────────────────────────────────────────────────

export interface CADScriptLineageEntry {
  /** Index of the source operation in the input stream. */
  opIndex: number;
  operationId?: string;
  kind: CADOperationKind;
  /** Line range inside the generated script, 1-based, end-inclusive. */
  lineStart: number;
  lineEnd: number;
  /** If the op was skipped (no-op), why. */
  skippedReason?: string;
}

export interface CADBuildWarning {
  opIndex: number;
  kind: CADOperationKind;
  message: string;
  severity: "info" | "warn" | "error";
}

/** Canonical shape returned by buildScript(). */
export interface CADScript<TBody = string> {
  cadSystem: CADSystemId;
  /** Host-native script body (Python, iLogic VB.NET, C# .NET, etc). */
  body: TBody;
  /** Suggested file name for the script. */
  filename: string;
  /** Ordered list of op → lines mapping. */
  lineage: ReadonlyArray<CADScriptLineageEntry>;
  /** Non-fatal build issues. Errors throw. */
  warnings: ReadonlyArray<CADBuildWarning>;
  /** Declared parameters (name → value + unit). */
  parameters: ReadonlyMap<
    string,
    { value: number | string | boolean; unit: string; description?: string }
  >;
  /** Imports / dependencies the host must load before running this script. */
  imports: ReadonlyArray<string>;
}

// ── Execute phase ──────────────────────────────────────────────────────────

export interface CADExecutionResult {
  ok: boolean;
  error?: string;
  /** Elapsed wall time for execution (not build). */
  durationMs: number;
  /** Host-specific geometry metrics (volume, bbox, face/edge/vertex count). */
  metrics?: {
    volumeMm3?: number;
    boundingBoxMm?: [number, number, number];
    centerMm?: [number, number, number];
    faceCount?: number;
    edgeCount?: number;
    vertexCount?: number;
    massKg?: number;
    surfaceAreaMm2?: number;
    /** Number of top-level solid bodies in the assembly (Fusion360). */
    bodyCount?: number;
    /** Count of feature-tree operations applied (Inventor CAD). */
    operationCount?: number;
  };
  /** Artifacts written to disk (STEP/STL/DXF exports, NC files, logs). */
  outputs?: ReadonlyArray<{ path: string; kind: string; bytes?: number }>;
  /** Legacy alias for `outputs` used by HyperCADS generator — flat string[] of paths. */
  outputFiles?: string[];
  /** Full stdout/stderr for debugging, truncated to 64 KiB by convention. */
  log?: string;
}

// ── Validation phase ──────────────────────────────────────────────────────

export interface CADValidationFinding {
  severity: "info" | "warn" | "error";
  code: string;
  message: string;
  opIndex?: number;
}

export interface CADValidationReport {
  ok: boolean;
  findings: ReadonlyArray<CADValidationFinding>;
  /** Machinist-acceptance score in [0,1] — how close to reference within ±10 %. */
  acceptanceScore?: number;
}

// ── Capability declaration ─────────────────────────────────────────────────

export interface CADCapabilityMatrix {
  cadSystem: CADSystemId;
  /** Ops the generator can emit. */
  supportedOps: ReadonlySet<CADOperationKind>;
  /** Units the host expects (mm vs cm vs in). Callers convert upstream. */
  nativeLengthUnit: "mm" | "cm" | "in" | "m";
  nativeAngleUnit: "deg" | "rad";
  /** True when execution crosses a process boundary (Python, COM, REST). */
  requiresSubprocess: boolean;
  /** Typical execution latency in ms. */
  typicalLatencyMs: number;
  /** Any op-specific limits (e.g. max loft profiles, max fillet radius). */
  limits?: Record<string, number>;
  /** Optional host software version (e.g. "Fusion360 2.0.19401"). Informational. */
  version?: string;
  /** Free-form informational note about the generator/host. */
  notes?: string;
  /** Max operation count the generator handles before quality degrades. */
  maxComplexity?: number;
  /** Whether the host supports undo of generated operations. */
  supportsUndo?: boolean;
  /** Whether the host supports parametric (feature-tree) modeling. */
  supportsParametric?: boolean;
}

// ── The interface itself ───────────────────────────────────────────────────

export interface ICADCodeGenerator<
  TScript = CADScript,
  TContext = Record<string, unknown>,
  TResult = CADExecutionResult,
> {
  readonly cadSystem: CADSystemId;
  readonly capabilities: CADCapabilityMatrix;

  /** Report capability matrix (immutable snapshot). */
  getCapabilities(): CADCapabilityMatrix;

  /**
   * Translate an ordered operation stream into a host-native script, carrying
   * op→line lineage and parameter metadata. Throws UnsupportedCapabilityError
   * if any op's kind is not in `capabilities.supportedOps`.
   */
  buildScript(
    ops: ReadonlyArray<CADOperation>,
    ctx?: TContext,
  ): TScript;

  /**
   * Execute a script through whatever channel the host needs (Python subprocess,
   * COM, REST, in-process). Returns geometry metrics + outputs.
   */
  executeScript(script: TScript): Promise<TResult>;

  /**
   * Validate a previous execution result against engineering acceptance rules
   * (non-null geometry, bbox within envelope, manifold, etc.).
   */
  validateOutput(result: TResult): CADValidationReport;
}
