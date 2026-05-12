/**
 * CimatronCAMBridgeEngine — Cimatron CAM System Data Bridge
 *
 * Bridges Cimatron CAM (3D Systems) project data, operations, tools, and
 * electrode design workflows into the PRISM unified manufacturing pipeline.
 *
 * Cimatron-specific strengths:
 *   - Mold/die focused machining workflows
 *   - Integrated electrode design and extraction
 *   - VoluMill-powered roughing (licensed integration)
 *   - 5-axis simultaneous machining
 *   - NC simulation with collision detection
 *
 * File formats supported:
 *   - .elt (Cimatron native project files)
 *   - .nc / .tap / .cnc (NC output with operation comments)
 *   - Tool library export (XML/CSV)
 *
 * @engine CimatronCAMBridgeEngine
 * @shortcode E1201
 * @dispatcher camDispatcher
 * @actions cimatron_extract, cimatron_analyze, cimatron_convert,
 *          cimatron_electrode_analyze, cimatron_operation_list
 * @milestone CAMX-MS15/U01
 */

import { CANONICAL_KIENZLE, type ISOGroup } from "../physics/constants.js";

// ═══════════════════════════════════════════════════════════════════════════════
// INTERFACES — Cimatron Data Structures
// ═══════════════════════════════════════════════════════════════════════════════

/** Cimatron project file metadata */
export interface CimatronProject {
  /** Path to the .elt project file */
  projectPath: string;
  /** Cimatron version (e.g., "16.0", "15.0 SP5") */
  version: string;
  /** Project name (from file or user-defined) */
  projectName: string;
  /** Creation timestamp */
  createdAt?: string;
  /** Last modified timestamp */
  modifiedAt?: string;
  /** Is this an electrode design project? */
  electrodeDesign?: boolean;
  /** Electrode-specific metadata (if electrodeDesign is true) */
  electrode?: CimatronElectrode;
  /** Mold/die project metadata */
  moldDie?: CimatronMoldDie;
  /** All machining operations in the project */
  operations: CimatronOperation[];
  /** All tools defined in the project */
  tools: CimatronTool[];
  /** NC programs generated from this project */
  ncPrograms?: CimatronNCProgram[];
  /** Stock model definition */
  stock?: CimatronStock;
  /** Work coordinate systems */
  workCoordinates?: CimatronWCS[];
  /** Simulation results (if available) */
  simulation?: CimatronSimulation;
}

/** Cimatron machining operation */
export interface CimatronOperation {
  /** Unique operation ID within the project */
  id: string;
  /** Operation name (user-defined or auto-generated) */
  name: string;
  /** Cimatron operation type (native cycle name) */
  type: CimatronOperationType;
  /** PRISM-normalized operation category */
  category: "roughing" | "semi_finishing" | "finishing" | "drilling" | "electrode" | "5_axis";
  /** Tool reference (by ID or number) */
  toolId?: string;
  toolNumber?: number;
  /** Cutting parameters */
  params: CimatronCuttingParams;
  /** Geometry selection (surface IDs, feature IDs) */
  geometry?: {
    surfaceIds?: string[];
    featureIds?: string[];
    containmentType?: "inside" | "outside" | "on" | "all";
  };
  /** IPW (In-Process Workpiece) reference */
  ipwReference?: string;
  /** Rest machining reference tools */
  restReferenceTools?: string[];
  /** Estimated cycle time from Cimatron (minutes) */
  estimatedCycleTime_min?: number;
  /** Toolpath length (mm) */
  toolpathLength_mm?: number;
  /** Number of Z-levels or passes */
  passCount?: number;
  /** Operation status */
  status: "pending" | "calculated" | "verified" | "posted" | "error";
  /** Warnings from calculation */
  warnings?: string[];
}

/** Cimatron native operation types */
export type CimatronOperationType =
  // Roughing
  | "volume_milling"
  | "rough_geodesic"
  | "spiral_roughing"
  | "z_level_roughing"
  | "rest_roughing"
  // Finishing
  | "z_level_finishing"
  | "3d_finishing"
  | "geodesic_finishing"
  | "pencil_milling"
  | "flat_land_finishing"
  | "spiral_finishing"
  | "raster_finishing"
  // 5-Axis
  | "5axis_finishing"
  | "5axis_swarf"
  | "5axis_contour"
  | "5axis_positional"
  // Drilling
  | "drilling"
  | "tapping"
  | "boring"
  | "reaming"
  | "gun_drilling"
  // Electrode
  | "electrode_roughing"
  | "electrode_finishing"
  | "electrode_detail"
  // Specialty
  | "engraving"
  | "t_slot"
  | "thread_milling";

/** Cimatron cutting parameters */
export interface CimatronCuttingParams {
  /** Spindle speed (RPM) */
  spindleRpm?: number;
  /** Cutting speed (m/min) — converted to RPM internally */
  cuttingSpeed_mpm?: number;
  /** Feed rate (mm/min) */
  feedRate_mmpm?: number;
  /** Feed per tooth (mm/tooth) */
  feedPerTooth_mm?: number;
  /** Plunge feed rate (mm/min) */
  plungeFeed_mmpm?: number;
  /** Step-down / axial depth of cut (mm) */
  stepDown_mm?: number;
  /** Step-over / radial depth of cut (mm) or percentage */
  stepOver_mm?: number;
  stepOver_pct?: number;
  /** Stock allowance for finishing (mm) */
  stockAllowance_mm?: number;
  /** Tolerance for toolpath calculation (mm) */
  tolerance_mm?: number;
  /** Coolant setting */
  coolant?: "flood" | "mist" | "air" | "through_tool" | "off";
  /** Cutting direction */
  cuttingDirection?: "climb" | "conventional" | "mixed";
  /** Entry method for roughing */
  entryMethod?: "plunge" | "ramp" | "helix" | "predrill";
  /** Helix diameter (if helix entry) */
  helixDiameter_mm?: number;
  /** Ramp angle (if ramp entry, degrees) */
  rampAngle_deg?: number;
}

/** Cimatron tool definition */
export interface CimatronTool {
  /** Tool ID (internal Cimatron reference) */
  id: string;
  /** Tool number (for NC output) */
  toolNumber: number;
  /** Tool name */
  name: string;
  /** Tool type */
  type: CimatronToolType;
  /** Diameter (mm) */
  diameter_mm: number;
  /** Corner radius for bull-nose, full radius for ball-end (mm) */
  cornerRadius_mm?: number;
  /** Flute length (mm) */
  fluteLength_mm?: number;
  /** Overall length (mm) */
  overallLength_mm?: number;
  /** Number of flutes */
  fluteCount: number;
  /** Holder ID reference */
  holderId?: string;
  /** Holder description */
  holderDescription?: string;
  /** Gauge length (mm) — tool tip to spindle face */
  gaugeLength_mm?: number;
  /** Tool material */
  material: "carbide" | "hss" | "ceramic" | "cbn" | "pcd" | "graphite_electrode";
  /** Coating */
  coating?: string;
  /** Manufacturer */
  manufacturer?: string;
  /** Part number */
  partNumber?: string;
  /** Cutting data / speeds-feeds (optional embedded) */
  cuttingData?: {
    defaultRpm?: number;
    defaultFeed_mmpm?: number;
    maxDepth_mm?: number;
  };
}

/** Cimatron tool types */
export type CimatronToolType =
  | "end_mill"
  | "ball_end"
  | "bull_nose"
  | "face_mill"
  | "drill"
  | "tap"
  | "reamer"
  | "boring_bar"
  | "chamfer"
  | "slot_drill"
  | "tapered"
  | "lollipop"
  | "dovetail"
  | "engraver";

/** Cimatron electrode metadata (mold/die industry specific) */
export interface CimatronElectrode {
  /** Electrode name / identifier */
  electrodeName: string;
  /** Electrode material */
  material: "graphite" | "copper" | "copper_tungsten" | "copper_graphite";
  /** Graphite grade (if graphite) */
  graphiteGrade?: string;
  /** Undersize for spark gap (mm per side) */
  undersize_mm: number;
  /** Electrode burn type */
  burnType: "roughing" | "semi_finishing" | "finishing";
  /** Extension beyond cavity edge (mm) */
  extensionSurface_mm?: number;
  /** Electrode blank dimensions (if defined) */
  blankDimensions?: {
    x_mm: number;
    y_mm: number;
    z_mm: number;
  };
  /** Reference cavity/core ID */
  cavityReference?: string;
  /** Holder/chuck attachment info */
  holderType?: "erowa" | "system_3r" | "macro" | "hirschmann" | "custom";
  /** Datum/reference ball position */
  datumPosition?: { x_mm: number; y_mm: number; z_mm: number };
  /** Estimated burn time (minutes) — from EDM parameters */
  estimatedBurnTime_min?: number;
  /** Number of cavities this electrode burns */
  cavityCount?: number;
}

/** Cimatron mold/die project metadata */
export interface CimatronMoldDie {
  /** Project type */
  projectType: "injection_mold" | "die_casting" | "stamping_die" | "forging_die" | "blow_mold" | "other";
  /** Part name being molded */
  partName?: string;
  /** Number of cavities */
  cavityCount?: number;
  /** Mold material */
  moldMaterial?: string;
  /** ISO material group of mold material */
  moldMaterialISO?: ISOGroup;
  /** Hardness (HRC) */
  hardness_hrc?: number;
  /** Parting line defined? */
  hasPartingLine?: boolean;
  /** Cooling channels defined? */
  hasCoolingChannels?: boolean;
  /** Ejector system defined? */
  hasEjectorSystem?: boolean;
  /** Hot runner system? */
  hotRunner?: boolean;
  /** Runner/gate type */
  gateType?: "edge" | "submarine" | "pin_point" | "hot_tip" | "valve_gate";
  /** Draft angle range (degrees) */
  draftAngle_deg?: { min: number; max: number };
}

/** Cimatron NC program output */
export interface CimatronNCProgram {
  /** Program name / number */
  programName: string;
  /** Output file path */
  filePath?: string;
  /** Post processor used */
  postProcessor: string;
  /** Controller target */
  controller: string;
  /** Operations included (by ID) */
  operationIds: string[];
  /** Total estimated cycle time (minutes) */
  totalCycleTime_min?: number;
  /** Total toolpath length (mm) */
  totalToolpathLength_mm?: number;
  /** Tools used (by number) */
  toolNumbers: number[];
  /** Generated timestamp */
  generatedAt?: string;
  /** NC code (if embedded/returned) */
  ncCode?: string;
}

/** Cimatron stock model */
export interface CimatronStock {
  /** Stock type */
  type: "bounding_box" | "cylinder" | "stl" | "solid" | "from_previous";
  /** Dimensions (for box/cylinder) */
  dimensions?: {
    x_mm?: number;
    y_mm?: number;
    z_mm?: number;
    diameter_mm?: number;
    length_mm?: number;
  };
  /** Stock material */
  material?: string;
  /** ISO group */
  isoGroup?: ISOGroup;
  /** Stock offset (mm) around part */
  offset_mm?: number;
  /** STL file path (if STL stock) */
  stlPath?: string;
}

/** Cimatron work coordinate system */
export interface CimatronWCS {
  /** WCS name / number (G54-G59, etc.) */
  name: string;
  /** Origin position relative to model datum */
  origin: { x_mm: number; y_mm: number; z_mm: number };
  /** Rotation (degrees) */
  rotation?: { a_deg?: number; b_deg?: number; c_deg?: number };
  /** Associated setup index */
  setupIndex?: number;
}

/** Cimatron simulation results */
export interface CimatronSimulation {
  /** Simulation completed successfully? */
  completed: boolean;
  /** Collision detected? */
  collisionDetected: boolean;
  /** Collision details */
  collisions?: Array<{
    type: "tool_holder" | "tool_shank" | "spindle" | "fixture" | "clamp";
    operationId: string;
    position?: { x: number; y: number; z: number };
    severity: "warning" | "error";
  }>;
  /** Gouge detected? */
  gougeDetected: boolean;
  /** Remaining stock volume (mm^3) */
  remainingStockVolume_mm3?: number;
  /** Material removal rate achieved (mm^3/min average) */
  averageMRR_mm3min?: number;
  /** Simulation time (seconds) */
  simulationTime_sec?: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXTRACTION RESULT INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

/** Result of extracting data from a Cimatron project */
export interface CimatronExtractionResult {
  success: boolean;
  project: CimatronProject | null;
  extractedAt: string;
  warnings: string[];
  errors: string[];
  /** Extraction statistics */
  stats: {
    operationCount: number;
    toolCount: number;
    ncProgramCount: number;
    estimatedTotalCycleTime_min?: number;
    electrodeCount?: number;
  };
}

/** Result of analyzing operations for PRISM optimization */
export interface CimatronAnalysisResult {
  success: boolean;
  projectPath: string;
  analysisType: "operations" | "electrode" | "mold_workflow" | "full";
  findings: CimatronFinding[];
  recommendations: CimatronRecommendation[];
  physicsValidation?: {
    forceWithinLimits: boolean;
    maxForce_N?: number;
    maxPower_kW?: number;
    warnings: string[];
  };
  moldDieAnalysis?: {
    complexityScore: number;
    estimatedMachiningHours: number;
    electrodesRequired: number;
    criticalFeatures: string[];
  };
}

/** Analysis finding */
export interface CimatronFinding {
  type: "issue" | "optimization" | "info";
  severity: "low" | "medium" | "high" | "critical";
  operationId?: string;
  toolId?: string;
  message: string;
  details?: Record<string, unknown>;
}

/** Optimization recommendation */
export interface CimatronRecommendation {
  category: "speed_feed" | "strategy" | "tool_selection" | "sequence" | "electrode" | "setup";
  priority: number;
  description: string;
  expectedBenefit: string;
  implementation?: string;
  relatedOperations?: string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// ENGINE IMPLEMENTATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * CimatronCAMBridgeEngine — Cimatron project data extraction and analysis
 *
 * Focuses on mold/die industry workflows with electrode design support.
 */
export class CimatronCAMBridgeEngine {
  readonly camSystem = "Cimatron";
  readonly vendor = "3D Systems";
  readonly supportedVersions = ["14.0", "15.0", "15.5", "16.0"];
  readonly fileExtensions = [".elt", ".nc", ".tap", ".cnc"];

  // ── Spark gap standards for electrode design (mold/die industry) ──
  private readonly SPARK_GAP_STANDARDS = {
    roughing: { undersize_mm: 0.25, tolerance_mm: 0.05 },
    semi_finishing: { undersize_mm: 0.12, tolerance_mm: 0.03 },
    finishing: { undersize_mm: 0.05, tolerance_mm: 0.01 },
  } as const;

  // ── Graphite grades commonly used with Cimatron electrode design ──
  private readonly GRAPHITE_GRADES = {
    "EDM-3": { grain_um: 5, flexural_MPa: 65, density_gcm3: 1.81, use: "fine_detail" },
    "EDM-200": { grain_um: 15, flexural_MPa: 48, density_gcm3: 1.78, use: "general_purpose" },
    "TTK-50": { grain_um: 2, flexural_MPa: 85, density_gcm3: 1.83, use: "ultra_fine" },
    "POCO-AF5": { grain_um: 5, flexural_MPa: 72, density_gcm3: 1.80, use: "aerospace_molds" },
    "SIGRAFINE-R8710": { grain_um: 10, flexural_MPa: 55, density_gcm3: 1.77, use: "large_electrodes" },
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // EXTRACTION METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Extract project data from a Cimatron .elt file or directory.
   * In a real implementation, this would parse the Cimatron file format.
   * Currently provides a structured interface for manual or API-based extraction.
   *
   * @param projectPath - Path to .elt file or Cimatron project directory
   * @param options - Extraction options
   */
  extract(
    projectPath: string,
    options: {
      includeToolpaths?: boolean;
      includeSimulation?: boolean;
      includeNCCode?: boolean;
      parseElectrodes?: boolean;
    } = {}
  ): CimatronExtractionResult {
    const warnings: string[] = [];
    const errors: string[] = [];

    // Validate file extension
    const ext = projectPath.toLowerCase().split(".").pop() || "";
    if (!this.fileExtensions.some((e) => e.slice(1) === ext) && !projectPath.endsWith("/")) {
      warnings.push(`File extension ".${ext}" not recognized. Expected: ${this.fileExtensions.join(", ")}`);
    }

    // In production, this would interface with Cimatron's API or parse the .elt file
    // For now, we return a structured placeholder indicating the expected data shape
    const project: CimatronProject = {
      projectPath,
      version: "16.0", // Would be extracted from file
      projectName: this._extractProjectName(projectPath),
      electrodeDesign: options.parseElectrodes ?? false,
      operations: [],
      tools: [],
    };

    // Note: Actual extraction requires Cimatron API access or file format parsing
    warnings.push(
      "Cimatron native file parsing requires Cimatron API or COM automation. " +
        "Use the cimatron_api_connect action for live extraction."
    );

    return {
      success: true,
      project,
      extractedAt: new Date().toISOString(),
      warnings,
      errors,
      stats: {
        operationCount: project.operations.length,
        toolCount: project.tools.length,
        ncProgramCount: project.ncPrograms?.length ?? 0,
        electrodeCount: project.electrodeDesign ? 1 : 0,
      },
    };
  }

  /**
   * Import project data from a structured JSON representation.
   * Use this when you have already extracted data from Cimatron (via API, manual entry, or export).
   */
  importFromJSON(data: Partial<CimatronProject>): CimatronExtractionResult {
    const warnings: string[] = [];
    const errors: string[] = [];

    // Validate required fields
    if (!data.projectPath) {
      errors.push("Missing required field: projectPath");
    }
    if (!data.version) {
      warnings.push("Missing version field — defaulting to 16.0");
    }

    // Normalize and validate operations
    const operations = (data.operations || []).map((op, idx) => this._normalizeOperation(op, idx, warnings));

    // Normalize tools
    const tools = (data.tools || []).map((tool, idx) => this._normalizeTool(tool, idx, warnings));

    // Validate electrode data if present
    if (data.electrodeDesign && data.electrode) {
      this._validateElectrode(data.electrode, warnings);
    }

    const project: CimatronProject = {
      projectPath: data.projectPath || "unknown",
      version: data.version || "16.0",
      projectName: data.projectName || this._extractProjectName(data.projectPath || ""),
      createdAt: data.createdAt,
      modifiedAt: data.modifiedAt,
      electrodeDesign: data.electrodeDesign,
      electrode: data.electrode,
      moldDie: data.moldDie,
      operations,
      tools,
      ncPrograms: data.ncPrograms,
      stock: data.stock,
      workCoordinates: data.workCoordinates,
      simulation: data.simulation,
    };

    return {
      success: errors.length === 0,
      project: errors.length === 0 ? project : null,
      extractedAt: new Date().toISOString(),
      warnings,
      errors,
      stats: {
        operationCount: operations.length,
        toolCount: tools.length,
        ncProgramCount: project.ncPrograms?.length ?? 0,
        estimatedTotalCycleTime_min: operations.reduce((sum, op) => sum + (op.estimatedCycleTime_min || 0), 0),
        electrodeCount: project.electrodeDesign ? 1 : 0,
      },
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ANALYSIS METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Analyze a Cimatron project for optimization opportunities.
   * Returns findings and recommendations based on PRISM physics validation.
   */
  analyze(
    project: CimatronProject,
    options: {
      analysisType?: "operations" | "electrode" | "mold_workflow" | "full";
      validatePhysics?: boolean;
      materialISOGroup?: ISOGroup;
    } = {}
  ): CimatronAnalysisResult {
    const analysisType = options.analysisType ?? "full";
    const findings: CimatronFinding[] = [];
    const recommendations: CimatronRecommendation[] = [];

    // Operation sequence analysis
    if (analysisType === "operations" || analysisType === "full") {
      this._analyzeOperations(project.operations, project.tools, findings, recommendations);
    }

    // Electrode-specific analysis
    if ((analysisType === "electrode" || analysisType === "full") && project.electrodeDesign) {
      this._analyzeElectrode(project.electrode!, project.moldDie, findings, recommendations);
    }

    // Mold/die workflow analysis
    if ((analysisType === "mold_workflow" || analysisType === "full") && project.moldDie) {
      this._analyzeMoldWorkflow(project, findings, recommendations);
    }

    // Physics validation
    let physicsValidation: CimatronAnalysisResult["physicsValidation"];
    if (options.validatePhysics !== false) {
      physicsValidation = this._validatePhysics(
        project.operations,
        project.tools,
        options.materialISOGroup ?? project.moldDie?.moldMaterialISO ?? "P"
      );
    }

    // Mold/die complexity analysis
    let moldDieAnalysis: CimatronAnalysisResult["moldDieAnalysis"];
    if (project.moldDie) {
      moldDieAnalysis = this._calculateMoldComplexity(project);
    }

    return {
      success: true,
      projectPath: project.projectPath,
      analysisType,
      findings,
      recommendations: recommendations.sort((a, b) => b.priority - a.priority),
      physicsValidation,
      moldDieAnalysis,
    };
  }

  /**
   * Analyze electrode design for EDM suitability.
   */
  analyzeElectrode(electrode: CimatronElectrode): {
    suitable: boolean;
    sparkGapVerified: boolean;
    materialRecommendation: string;
    warnings: string[];
    suggestions: string[];
  } {
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Verify spark gap against standards
    const standard = this.SPARK_GAP_STANDARDS[electrode.burnType];
    const sparkGapVerified =
      Math.abs(electrode.undersize_mm - standard.undersize_mm) <= standard.tolerance_mm;

    if (!sparkGapVerified) {
      warnings.push(
        `Undersize ${electrode.undersize_mm}mm does not match ${electrode.burnType} standard ` +
          `(expected ${standard.undersize_mm}mm +/- ${standard.tolerance_mm}mm)`
      );
    }

    // Material recommendation based on burn type
    let materialRecommendation = "";
    if (electrode.material === "graphite") {
      if (electrode.burnType === "finishing" && electrode.graphiteGrade) {
        const grade = this.GRAPHITE_GRADES[electrode.graphiteGrade as keyof typeof this.GRAPHITE_GRADES];
        if (grade && grade.grain_um > 5) {
          suggestions.push(
            `For finishing electrodes, consider finer grain graphite (<=5um). ` +
              `Current grade ${electrode.graphiteGrade} has ${grade.grain_um}um grain.`
          );
        }
      }
      materialRecommendation = electrode.burnType === "finishing" ? "EDM-3 or TTK-50 (fine grain)" : "EDM-200 (general purpose)";
    } else if (electrode.material === "copper") {
      materialRecommendation = "Copper recommended for carbide or PCD workpieces";
      if (electrode.burnType === "roughing") {
        suggestions.push("Copper electrodes have higher wear in roughing — consider graphite for roughing passes.");
      }
    }

    // Blank size optimization
    if (electrode.blankDimensions) {
      const { x_mm, y_mm, z_mm } = electrode.blankDimensions;
      const volume_mm3 = x_mm * y_mm * z_mm;
      if (volume_mm3 > 500000) {
        // > 500 cm^3
        suggestions.push(
          `Large electrode blank (${(volume_mm3 / 1000).toFixed(0)} cm^3). ` +
            "Consider electrode nesting to reduce material waste."
        );
      }
    }

    // Extension surface check
    if (electrode.extensionSurface_mm !== undefined && electrode.extensionSurface_mm < 1.5) {
      warnings.push(
        `Extension surface ${electrode.extensionSurface_mm}mm may be insufficient. ` +
          "Minimum 1.5-2mm recommended for proper spark gap at cavity edges."
      );
    }

    return {
      suitable: warnings.length === 0,
      sparkGapVerified,
      materialRecommendation,
      warnings,
      suggestions,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CONVERSION METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Convert Cimatron operations to PRISM unified format.
   * Enables cross-CAM comparison and optimization.
   */
  convertToPRISMFormat(project: CimatronProject): {
    operations: Array<{
      id: string;
      name: string;
      type: string;
      category: string;
      tool: { diameter_mm: number; type: string; fluteCount: number } | null;
      params: {
        rpm: number;
        feed_mmpm: number;
        doc_mm: number;
        woc_mm: number;
        coolant: string;
      };
      physics?: {
        estimatedForce_N?: number;
        estimatedPower_kW?: number;
        estimatedMRR_mm3min?: number;
      };
    }>;
    tools: Array<{
      number: number;
      type: string;
      diameter_mm: number;
      fluteCount: number;
      material: string;
    }>;
    summary: {
      totalOperations: number;
      totalTools: number;
      estimatedCycleTime_min: number;
      camSystem: string;
    };
  } {
    const toolMap = new Map(project.tools.map((t) => [t.id, t]));

    const operations = project.operations.map((op) => {
      const tool = op.toolId ? toolMap.get(op.toolId) : null;

      return {
        id: op.id,
        name: op.name,
        type: this._mapCimatronTypeToPRISM(op.type),
        category: op.category,
        tool: tool
          ? {
              diameter_mm: tool.diameter_mm,
              type: tool.type,
              fluteCount: tool.fluteCount,
            }
          : null,
        params: {
          rpm: op.params.spindleRpm || 0,
          feed_mmpm: op.params.feedRate_mmpm || 0,
          doc_mm: op.params.stepDown_mm || 0,
          woc_mm: op.params.stepOver_mm || 0,
          coolant: op.params.coolant || "flood",
        },
        physics: tool
          ? this._estimatePhysics(op.params, tool, project.stock?.isoGroup || "P")
          : undefined,
      };
    });

    const tools = project.tools.map((t) => ({
      number: t.toolNumber,
      type: t.type,
      diameter_mm: t.diameter_mm,
      fluteCount: t.fluteCount,
      material: t.material,
    }));

    return {
      operations,
      tools,
      summary: {
        totalOperations: operations.length,
        totalTools: tools.length,
        estimatedCycleTime_min: project.operations.reduce(
          (sum, op) => sum + (op.estimatedCycleTime_min || 0),
          0
        ),
        camSystem: this.camSystem,
      },
    };
  }

  /**
   * Generate a tool library export in XML format (Cimatron tool library compatible).
   */
  exportToolLibrary(
    tools: CimatronTool[],
    format: "xml" | "csv" = "xml"
  ): { content: string; filename: string; format: string } {
    if (format === "csv") {
      const header =
        "ToolNumber,Name,Type,Diameter_mm,CornerRadius_mm,FluteLength_mm,OverallLength_mm,FluteCount,Material,Coating";
      const rows = tools.map(
        (t) =>
          `${t.toolNumber},"${t.name}",${t.type},${t.diameter_mm},${t.cornerRadius_mm || 0},` +
          `${t.fluteLength_mm || 0},${t.overallLength_mm || 0},${t.fluteCount},${t.material},${t.coating || ""}`
      );
      return {
        content: [header, ...rows].join("\n"),
        filename: "cimatron_tools.csv",
        format: "csv",
      };
    }

    // XML format
    const xmlTools = tools
      .map(
        (t) => `  <Tool>
    <Number>${t.toolNumber}</Number>
    <Name>${this._escapeXml(t.name)}</Name>
    <Type>${t.type}</Type>
    <Diameter>${t.diameter_mm}</Diameter>
    <CornerRadius>${t.cornerRadius_mm || 0}</CornerRadius>
    <FluteLength>${t.fluteLength_mm || ""}</FluteLength>
    <OverallLength>${t.overallLength_mm || ""}</OverallLength>
    <FluteCount>${t.fluteCount}</FluteCount>
    <Material>${t.material}</Material>
    <Coating>${t.coating || ""}</Coating>
    <Manufacturer>${t.manufacturer || ""}</Manufacturer>
    <PartNumber>${t.partNumber || ""}</PartNumber>
  </Tool>`
      )
      .join("\n");

    return {
      content: `<?xml version="1.0" encoding="UTF-8"?>
<CimatronToolLibrary>
  <Version>1.0</Version>
  <ExportedBy>PRISM</ExportedBy>
  <ExportedAt>${new Date().toISOString()}</ExportedAt>
  <Tools>
${xmlTools}
  </Tools>
</CimatronToolLibrary>`,
      filename: "cimatron_tools.xml",
      format: "xml",
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MOLD/DIE SPECIFIC METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Generate electrode extraction parameters from cavity geometry.
   * JM Die relevance: Cold heading dies require precise electrode design.
   */
  generateElectrodeParameters(
    cavityDepth_mm: number,
    surfaceFinish_Ra: number,
    workpieceMaterial: ISOGroup,
    options: {
      electrodeCount?: number;
      holderType?: CimatronElectrode["holderType"];
    } = {}
  ): {
    roughingElectrode: CimatronElectrode;
    finishingElectrode: CimatronElectrode;
    semiFinishingElectrode?: CimatronElectrode;
    totalBurnTime_min: number;
    recommendations: string[];
  } {
    const recommendations: string[] = [];

    // Determine if semi-finish electrode is needed based on depth and finish
    const needsSemiFinish = cavityDepth_mm > 20 || surfaceFinish_Ra < 0.8;

    // Base electrode template
    const baseElectrode = (burnType: "roughing" | "semi_finishing" | "finishing"): CimatronElectrode => ({
      electrodeName: `ELEC_${burnType.toUpperCase()}`,
      material: "graphite",
      graphiteGrade: burnType === "finishing" ? "EDM-3" : "EDM-200",
      undersize_mm: this.SPARK_GAP_STANDARDS[burnType].undersize_mm,
      burnType,
      extensionSurface_mm: 2.0,
      holderType: options.holderType || "erowa",
    });

    const roughingElectrode = baseElectrode("roughing");
    const finishingElectrode = baseElectrode("finishing");
    const semiFinishingElectrode = needsSemiFinish ? baseElectrode("semi_finishing") : undefined;

    // Estimate burn times based on cavity depth and material
    // Reference: Kunieda 2005 EDM material removal model
    const materialFactor: Record<ISOGroup, number> = {
      P: 1.0, // Steel baseline
      M: 1.3, // Stainless slower
      K: 0.9, // Cast iron slightly faster
      N: 1.5, // Non-ferrous (varies widely)
      S: 1.4, // Superalloys slower
      H: 1.6, // Hardened steel slowest
    };

    const baseBurnRate_mm3min = 25; // Typical graphite electrode on steel
    const cavityVolume_mm3 = Math.pow(cavityDepth_mm, 3) * 0.5; // Rough estimate
    const effectiveRate = baseBurnRate_mm3min / materialFactor[workpieceMaterial];

    const roughingTime = (cavityVolume_mm3 * 0.7) / (effectiveRate * 2); // Roughing removes 70% faster
    const semiFinishTime = needsSemiFinish ? (cavityVolume_mm3 * 0.2) / effectiveRate : 0;
    const finishingTime = (cavityVolume_mm3 * 0.1) / (effectiveRate * 0.5); // Finishing is slower

    // Set estimated burn times
    roughingElectrode.estimatedBurnTime_min = Math.round(roughingTime);
    finishingElectrode.estimatedBurnTime_min = Math.round(finishingTime);
    if (semiFinishingElectrode) {
      semiFinishingElectrode.estimatedBurnTime_min = Math.round(semiFinishTime);
    }

    const totalBurnTime_min = roughingTime + semiFinishTime + finishingTime;

    // Generate recommendations
    if (cavityDepth_mm > 50) {
      recommendations.push(
        "Deep cavity (>50mm) — consider multiple roughing electrodes or orbital EDM strategy."
      );
    }
    if (surfaceFinish_Ra < 0.4) {
      recommendations.push(
        `Target Ra ${surfaceFinish_Ra}um requires fine-grain graphite (TTK-50 or equivalent) ` +
          "and multiple skim passes."
      );
    }
    if (workpieceMaterial === "H") {
      recommendations.push(
        "Hardened steel workpiece — expect 60% longer burn times. Consider copper electrodes for carbide inserts."
      );
    }

    return {
      roughingElectrode,
      finishingElectrode,
      semiFinishingElectrode,
      totalBurnTime_min: Math.round(totalBurnTime_min),
      recommendations,
    };
  }

  /**
   * List supported Cimatron operation types with descriptions.
   */
  listOperationTypes(): Array<{
    type: CimatronOperationType;
    category: CimatronOperation["category"];
    description: string;
    moldDieRelevance: "high" | "medium" | "low";
  }> {
    return [
      { type: "volume_milling", category: "roughing", description: "Stock-aware 3D roughing with IPW tracking", moldDieRelevance: "high" },
      { type: "rough_geodesic", category: "roughing", description: "HSM roughing with constant engagement control", moldDieRelevance: "high" },
      { type: "spiral_roughing", category: "roughing", description: "Inside-out spiral for round pockets", moldDieRelevance: "medium" },
      { type: "z_level_roughing", category: "roughing", description: "Traditional Z-level offset clearing", moldDieRelevance: "high" },
      { type: "rest_roughing", category: "roughing", description: "Target material left by previous tools", moldDieRelevance: "high" },
      { type: "z_level_finishing", category: "finishing", description: "Constant-Z passes for steep walls", moldDieRelevance: "high" },
      { type: "3d_finishing", category: "finishing", description: "Curvature-adaptive surface finishing", moldDieRelevance: "high" },
      { type: "geodesic_finishing", category: "finishing", description: "Follow surface curvature naturally", moldDieRelevance: "medium" },
      { type: "pencil_milling", category: "finishing", description: "Corner and concave cleanup", moldDieRelevance: "high" },
      { type: "flat_land_finishing", category: "finishing", description: "Parting plane and flat area finishing", moldDieRelevance: "high" },
      { type: "spiral_finishing", category: "finishing", description: "Spiral pattern for flat bottoms", moldDieRelevance: "medium" },
      { type: "raster_finishing", category: "finishing", description: "Linear raster pattern finishing", moldDieRelevance: "medium" },
      { type: "5axis_finishing", category: "5_axis", description: "Simultaneous 5-axis surface finishing", moldDieRelevance: "high" },
      { type: "5axis_swarf", category: "5_axis", description: "Flank milling of ruled surfaces", moldDieRelevance: "medium" },
      { type: "5axis_contour", category: "5_axis", description: "5-axis contour following", moldDieRelevance: "medium" },
      { type: "5axis_positional", category: "5_axis", description: "3+2 indexed machining", moldDieRelevance: "high" },
      { type: "drilling", category: "drilling", description: "Standard drilling cycles", moldDieRelevance: "high" },
      { type: "tapping", category: "drilling", description: "Thread tapping", moldDieRelevance: "medium" },
      { type: "boring", category: "drilling", description: "Precision boring", moldDieRelevance: "medium" },
      { type: "reaming", category: "drilling", description: "Hole finishing", moldDieRelevance: "medium" },
      { type: "gun_drilling", category: "drilling", description: "Deep hole drilling for cooling channels", moldDieRelevance: "high" },
      { type: "electrode_roughing", category: "electrode", description: "Roughing for EDM electrode", moldDieRelevance: "high" },
      { type: "electrode_finishing", category: "electrode", description: "Finishing for EDM electrode", moldDieRelevance: "high" },
      { type: "electrode_detail", category: "electrode", description: "Fine detail on electrode", moldDieRelevance: "high" },
      { type: "engraving", category: "finishing", description: "Text and logo engraving", moldDieRelevance: "low" },
      { type: "t_slot", category: "roughing", description: "T-slot machining", moldDieRelevance: "low" },
      { type: "thread_milling", category: "drilling", description: "Thread milling cycles", moldDieRelevance: "low" },
    ];
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PRIVATE HELPER METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  private _extractProjectName(path: string): string {
    const parts = path.replace(/\\/g, "/").split("/");
    const filename = parts.pop() || "untitled";
    return filename.replace(/\.[^.]+$/, "");
  }

  private _normalizeOperation(
    op: Partial<CimatronOperation>,
    index: number,
    warnings: string[]
  ): CimatronOperation {
    if (!op.type) {
      warnings.push(`Operation ${index} missing type — defaulting to volume_milling`);
    }
    if (!op.params) {
      warnings.push(`Operation ${index} missing cutting parameters`);
    }

    return {
      id: op.id || `op_${index}`,
      name: op.name || `Operation ${index + 1}`,
      type: op.type || "volume_milling",
      category: op.category || this._inferCategory(op.type || "volume_milling"),
      toolId: op.toolId,
      toolNumber: op.toolNumber,
      params: op.params || {},
      geometry: op.geometry,
      ipwReference: op.ipwReference,
      restReferenceTools: op.restReferenceTools,
      estimatedCycleTime_min: op.estimatedCycleTime_min,
      toolpathLength_mm: op.toolpathLength_mm,
      passCount: op.passCount,
      status: op.status || "pending",
      warnings: op.warnings,
    };
  }

  private _normalizeTool(
    tool: Partial<CimatronTool>,
    index: number,
    warnings: string[]
  ): CimatronTool {
    if (!tool.diameter_mm) {
      warnings.push(`Tool ${index} missing diameter — defaulting to 10mm`);
    }
    if (!tool.fluteCount) {
      warnings.push(`Tool ${index} missing flute count — defaulting to 4`);
    }

    return {
      id: tool.id || `tool_${index}`,
      toolNumber: tool.toolNumber ?? index + 1,
      name: tool.name || `Tool ${index + 1}`,
      type: tool.type || "end_mill",
      diameter_mm: tool.diameter_mm || 10,
      cornerRadius_mm: tool.cornerRadius_mm,
      fluteLength_mm: tool.fluteLength_mm,
      overallLength_mm: tool.overallLength_mm,
      fluteCount: tool.fluteCount || 4,
      holderId: tool.holderId,
      holderDescription: tool.holderDescription,
      gaugeLength_mm: tool.gaugeLength_mm,
      material: tool.material || "carbide",
      coating: tool.coating,
      manufacturer: tool.manufacturer,
      partNumber: tool.partNumber,
      cuttingData: tool.cuttingData,
    };
  }

  private _validateElectrode(electrode: CimatronElectrode, warnings: string[]): void {
    if (electrode.undersize_mm <= 0) {
      warnings.push("Electrode undersize must be positive for spark gap");
    }
    if (electrode.undersize_mm > 0.5) {
      warnings.push(`Large undersize ${electrode.undersize_mm}mm — verify against burn requirements`);
    }
    if (electrode.material === "graphite" && !electrode.graphiteGrade) {
      warnings.push("Graphite electrode missing grade specification");
    }
  }

  private _inferCategory(type: CimatronOperationType): CimatronOperation["category"] {
    if (type.includes("rough")) return "roughing";
    if (type.includes("finish") || type.includes("pencil") || type.includes("spiral")) return "finishing";
    if (type.includes("drill") || type.includes("tap") || type.includes("bore") || type.includes("ream")) return "drilling";
    if (type.includes("electrode")) return "electrode";
    if (type.includes("5axis")) return "5_axis";
    return "roughing";
  }

  private _analyzeOperations(
    operations: CimatronOperation[],
    tools: CimatronTool[],
    findings: CimatronFinding[],
    recommendations: CimatronRecommendation[]
  ): void {
    const toolMap = new Map(tools.map((t) => [t.id, t]));

    // Check for missing rest machining
    const roughingOps = operations.filter((op) => op.category === "roughing");
    const hasRestRoughing = operations.some((op) => op.type === "rest_roughing");
    if (roughingOps.length > 1 && !hasRestRoughing) {
      findings.push({
        type: "optimization",
        severity: "medium",
        message: "Multiple roughing operations without rest machining — may have redundant air cutting",
      });
      recommendations.push({
        category: "strategy",
        priority: 7,
        description: "Add rest roughing operation after primary roughing to target remaining material",
        expectedBenefit: "10-25% cycle time reduction by eliminating air cuts",
        relatedOperations: roughingOps.map((op) => op.id),
      });
    }

    // Check for HSM parameters on trochoidal operations
    for (const op of operations) {
      if (op.type === "rough_geodesic" || op.type === "volume_milling") {
        if (op.params.stepOver_pct && op.params.stepOver_pct > 20) {
          findings.push({
            type: "issue",
            severity: "medium",
            operationId: op.id,
            message: `High radial engagement (${op.params.stepOver_pct}%) on HSM operation — limits tool life`,
          });
          recommendations.push({
            category: "speed_feed",
            priority: 8,
            description: `Reduce stepover to 8-12% on operation ${op.name} for constant engagement HSM`,
            expectedBenefit: "2-3x tool life improvement with maintained MRR",
            implementation: "Set Step-Over to 10% with 2x axial depth increase",
            relatedOperations: [op.id],
          });
        }
      }

      // Check for pencil milling without proper reference tools
      if (op.type === "pencil_milling") {
        if (!op.restReferenceTools || op.restReferenceTools.length === 0) {
          findings.push({
            type: "issue",
            severity: "low",
            operationId: op.id,
            message: "Pencil milling without reference tools — may machine already-finished areas",
          });
        }
      }
    }

    // Check tool assignment
    for (const op of operations) {
      if (op.toolId && !toolMap.has(op.toolId)) {
        findings.push({
          type: "issue",
          severity: "high",
          operationId: op.id,
          message: `Operation references undefined tool: ${op.toolId}`,
        });
      }
    }
  }

  private _analyzeElectrode(
    electrode: CimatronElectrode,
    moldDie: CimatronMoldDie | undefined,
    findings: CimatronFinding[],
    recommendations: CimatronRecommendation[]
  ): void {
    // Analyze spark gap against standards
    const analysis = this.analyzeElectrode(electrode);
    if (!analysis.sparkGapVerified) {
      findings.push({
        type: "issue",
        severity: "high",
        message: analysis.warnings[0],
      });
    }

    for (const suggestion of analysis.suggestions) {
      recommendations.push({
        category: "electrode",
        priority: 6,
        description: suggestion,
        expectedBenefit: "Improved electrode performance and surface finish",
      });
    }

    // Cross-check with mold material if available
    if (moldDie?.hardness_hrc && moldDie.hardness_hrc > 52 && electrode.material === "graphite") {
      findings.push({
        type: "info",
        severity: "low",
        message: `Hardened workpiece (${moldDie.hardness_hrc} HRC) — graphite electrode will have higher wear`,
      });
      recommendations.push({
        category: "electrode",
        priority: 5,
        description: "For hardened steel >52 HRC, consider copper or copper-tungsten electrodes for reduced wear",
        expectedBenefit: "30-50% reduced electrode consumption",
      });
    }
  }

  private _analyzeMoldWorkflow(
    project: CimatronProject,
    findings: CimatronFinding[],
    recommendations: CimatronRecommendation[]
  ): void {
    const moldDie = project.moldDie!;

    // Check for cooling channel drilling
    if (moldDie.hasCoolingChannels && !project.operations.some((op) => op.type === "gun_drilling")) {
      findings.push({
        type: "info",
        severity: "low",
        message: "Cooling channels defined but no gun drilling operations — may be machined separately",
      });
    }

    // Check for ejector pin holes
    if (moldDie.hasEjectorSystem && !project.operations.some((op) => op.type === "reaming")) {
      findings.push({
        type: "optimization",
        severity: "low",
        message: "Ejector system defined — verify ejector pin holes have reaming operations for proper fit",
      });
    }

    // Parting line machining
    if (moldDie.hasPartingLine) {
      const hasFlatLandFinishing = project.operations.some((op) => op.type === "flat_land_finishing");
      if (!hasFlatLandFinishing) {
        recommendations.push({
          category: "strategy",
          priority: 6,
          description: "Add Flat Land Finishing for parting line surface — critical for mold sealing",
          expectedBenefit: "Proper parting line finish prevents flash",
        });
      }
    }

    // Multi-cavity optimization
    if (moldDie.cavityCount && moldDie.cavityCount > 1) {
      findings.push({
        type: "info",
        severity: "low",
        message: `Multi-cavity mold (${moldDie.cavityCount} cavities) — verify toolpath patterns and electrode families`,
      });
      recommendations.push({
        category: "sequence",
        priority: 5,
        description: "For multi-cavity molds, machine all cavities at each operation before tool change",
        expectedBenefit: "Reduced tool changes and improved consistency between cavities",
      });
    }
  }

  private _validatePhysics(
    operations: CimatronOperation[],
    tools: CimatronTool[],
    materialISO: ISOGroup
  ): CimatronAnalysisResult["physicsValidation"] {
    const toolMap = new Map(tools.map((t) => [t.id, t]));
    const warnings: string[] = [];
    let maxForce_N = 0;
    let maxPower_kW = 0;

    for (const op of operations) {
      if (!op.toolId || !op.params.spindleRpm || !op.params.feedRate_mmpm) continue;

      const tool = toolMap.get(op.toolId);
      if (!tool) continue;

      const physics = this._estimatePhysics(op.params, tool, materialISO);
      if (physics.estimatedForce_N && physics.estimatedForce_N > maxForce_N) {
        maxForce_N = physics.estimatedForce_N;
      }
      if (physics.estimatedPower_kW && physics.estimatedPower_kW > maxPower_kW) {
        maxPower_kW = physics.estimatedPower_kW;
      }

      // Warn on high forces
      if (physics.estimatedForce_N && physics.estimatedForce_N > 2000) {
        warnings.push(`Operation ${op.name}: High cutting force ${physics.estimatedForce_N.toFixed(0)}N`);
      }
    }

    return {
      forceWithinLimits: maxForce_N < 3000 && maxPower_kW < 20,
      maxForce_N: Math.round(maxForce_N),
      maxPower_kW: Math.round(maxPower_kW * 100) / 100,
      warnings,
    };
  }

  private _estimatePhysics(
    params: CimatronCuttingParams,
    tool: CimatronTool,
    materialISO: ISOGroup
  ): {
    estimatedForce_N?: number;
    estimatedPower_kW?: number;
    estimatedMRR_mm3min?: number;
  } {
    if (!params.spindleRpm || !params.feedRate_mmpm) return {};

    const kienzle = CANONICAL_KIENZLE[materialISO];
    const rpm = params.spindleRpm;
    const feed_mmpm = params.feedRate_mmpm;
    const ap = params.stepDown_mm || 3;
    const ae = params.stepOver_mm || tool.diameter_mm * 0.5;
    const z = tool.fluteCount;

    // Feed per tooth
    const fz = feed_mmpm / (rpm * z);

    // Kienzle force model: Fc = kc1_1 * h^(-mc) * ap * ae
    // h = chip thickness approx fz for milling
    const h = Math.max(0.01, fz);
    const Fc = kienzle.kc1_1 * Math.pow(h, -kienzle.mc) * ap * ae;

    // Cutting speed
    const vc = (Math.PI * tool.diameter_mm * rpm) / 1000; // m/min

    // Power: P = Fc * Vc / 60000 (kW)
    const power_kW = (Fc * vc) / 60000;

    // MRR: ap * ae * feed_mmpm
    const mrr_mm3min = ap * ae * feed_mmpm;

    return {
      estimatedForce_N: Math.round(Fc),
      estimatedPower_kW: Math.round(power_kW * 100) / 100,
      estimatedMRR_mm3min: Math.round(mrr_mm3min),
    };
  }

  private _calculateMoldComplexity(project: CimatronProject): CimatronAnalysisResult["moldDieAnalysis"] {
    const moldDie = project.moldDie!;

    // Complexity factors
    let complexityScore = 50; // Base

    if (moldDie.cavityCount && moldDie.cavityCount > 1) complexityScore += moldDie.cavityCount * 5;
    if (moldDie.hardness_hrc && moldDie.hardness_hrc > 48) complexityScore += 15;
    if (moldDie.hasPartingLine) complexityScore += 10;
    if (moldDie.hasCoolingChannels) complexityScore += 15;
    if (moldDie.hasEjectorSystem) complexityScore += 10;
    if (moldDie.hotRunner) complexityScore += 20;

    // Draft angle complexity
    if (moldDie.draftAngle_deg) {
      if (moldDie.draftAngle_deg.min < 0.5) complexityScore += 20; // Very tight draft
      else if (moldDie.draftAngle_deg.min < 1.0) complexityScore += 10;
    }

    complexityScore = Math.min(100, complexityScore);

    // Estimate machining hours based on operations and complexity
    const totalOpTime = project.operations.reduce((sum, op) => sum + (op.estimatedCycleTime_min || 30), 0);
    const estimatedMachiningHours = (totalOpTime / 60) * (1 + complexityScore / 200);

    // Electrode count estimation
    let electrodesRequired = 0;
    if (project.electrodeDesign) {
      electrodesRequired = moldDie.cavityCount || 1;
      if (complexityScore > 70) electrodesRequired *= 3; // R/S/F electrodes
      else electrodesRequired *= 2; // R/F electrodes
    }

    // Critical features identification
    const criticalFeatures: string[] = [];
    if (moldDie.draftAngle_deg && moldDie.draftAngle_deg.min < 1.0) {
      criticalFeatures.push(`Tight draft angles (${moldDie.draftAngle_deg.min}°)`);
    }
    if (moldDie.hardness_hrc && moldDie.hardness_hrc > 52) {
      criticalFeatures.push(`Hardened material (${moldDie.hardness_hrc} HRC)`);
    }
    if (moldDie.hasCoolingChannels) {
      criticalFeatures.push("Conformal cooling channels");
    }
    if (moldDie.gateType === "valve_gate" || moldDie.gateType === "hot_tip") {
      criticalFeatures.push(`${moldDie.gateType.replace("_", " ")} hot runner`);
    }

    return {
      complexityScore,
      estimatedMachiningHours: Math.round(estimatedMachiningHours * 10) / 10,
      electrodesRequired,
      criticalFeatures,
    };
  }

  private _mapCimatronTypeToPRISM(type: CimatronOperationType): string {
    const map: Record<string, string> = {
      volume_milling: "adaptive_clearing",
      rough_geodesic: "hsm_roughing",
      spiral_roughing: "pocket_roughing",
      z_level_roughing: "z_level_rough",
      rest_roughing: "rest_machining",
      z_level_finishing: "z_level_finish",
      "3d_finishing": "surface_finish",
      geodesic_finishing: "geodesic_finish",
      pencil_milling: "pencil_cleanup",
      flat_land_finishing: "flat_finish",
      spiral_finishing: "spiral_finish",
      raster_finishing: "raster_finish",
      "5axis_finishing": "5ax_finish",
      "5axis_swarf": "swarf_milling",
      "5axis_contour": "5ax_contour",
      "5axis_positional": "3plus2",
      drilling: "drilling",
      tapping: "tapping",
      boring: "boring",
      reaming: "reaming",
      gun_drilling: "deep_hole",
      electrode_roughing: "electrode_rough",
      electrode_finishing: "electrode_finish",
      electrode_detail: "electrode_detail",
      engraving: "engraving",
      t_slot: "t_slot",
      thread_milling: "thread_mill",
    };
    return map[type] || type;
  }

  private _escapeXml(str: string): string {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }
}

// ─── Singleton Export ─────────────────────────────────────────────────────────

export const cimatronCAMBridgeEngine = new CimatronCAMBridgeEngine();
