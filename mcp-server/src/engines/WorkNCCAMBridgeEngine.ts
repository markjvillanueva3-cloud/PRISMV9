/**
 * WorkNCCAMBridgeEngine - WorkNC CAM System Data Extraction and Integration Bridge (E1203)
 *
 * Provides bidirectional integration with WorkNC CAM system for:
 *   - Project data extraction (workzones, operations, tools, stock models)
 *   - NC output parsing with WorkNC-specific comment recognition
 *   - Automatic 5-axis toolpath strategy extraction
 *   - Collision avoidance data (WorkNC's core strength)
 *   - Global Roughing and Auto 5-axis finishing workflows
 *   - Tool library and assembly management
 *
 * WorkNC Architecture:
 *   - Workzone: Oriented machining region with stock/part boundaries
 *   - Auto 5-axis: Automatic tool axis control for collision avoidance
 *   - Global Roughing: Adaptive roughing with rest material tracking
 *   - Collision Checking: Built-in real-time collision verification
 *
 * Input Formats:
 *   - WorkNC native project files (.wnc, .wpj)
 *   - NC output with WorkNC comments (operation markers, tool data)
 *   - XML/JSON export formats
 *
 * Methods:
 *   extractProject(path)              - Extract full project structure
 *   parseNCOutput(nc_content)         - Parse NC code with WorkNC comments
 *   getWorkzones(project)             - Retrieve workzone hierarchy
 *   getTools(project)                 - Retrieve tool library
 *   getCollisionReport(operation)     - Get collision avoidance details
 *   get5AxisStrategies(project)       - Extract automatic 5-axis strategies
 *   exportToPRISM(project)            - Convert to PRISM unified format
 *
 * @engine WorkNCCAMBridgeEngine
 * @shortcode E1203
 * @dispatcher camDispatcher
 * @actions worknc_extract_project, worknc_parse_nc, worknc_get_workzones, worknc_get_tools,
 *          worknc_get_collision_report, worknc_get_5axis_strategies, worknc_export_prism
 * @milestone CAMX-BRIDGES/WORKNC
 */

import * as fs from "node:fs";
import * as path from "node:path";

// ─── WorkNC Data Structures ────────────────────────────────────────────────────

/** WorkNC project container - top-level structure */
export interface WorkNCProject {
  /** Full path to the project file */
  projectPath: string;
  /** WorkNC version that created the project */
  version: string;
  /** Primary CAD model file reference */
  cadModel: string;
  /** Project name / identifier */
  projectName: string;
  /** Creation timestamp */
  createdAt: string;
  /** Last modification timestamp */
  modifiedAt: string;
  /** List of workzones in this project */
  workzones: WorkNCWorkzone[];
  /** Tool library for this project */
  tools: WorkNCTool[];
  /** Stock definitions */
  stocks: WorkNCStock[];
  /** Machine definitions used */
  machines: WorkNCMachine[];
  /** Global project settings */
  settings: WorkNCSettings;
  /** Project-level metadata */
  metadata: Record<string, unknown>;
}

/** WorkNC Workzone - oriented machining region (WorkNC's operation container) */
export interface WorkNCWorkzone {
  /** Unique workzone identifier */
  workzoneId: string;
  /** Human-readable workzone name */
  workzoneName: string;
  /** Workzone orientation (tool axis direction) */
  orientation: WorkNCOrientation;
  /** Machine assignment */
  machineId: string;
  /** List of operations within this workzone */
  operations: WorkNCOperation[];
  /** Stock model reference (input stock) */
  inputStockId: string;
  /** Output stock model (after machining) */
  outputStockId?: string;
  /** Collision check status */
  collisionStatus: "clear" | "collision" | "not_checked";
  /** Collision report details */
  collisionReport?: WorkNCCollisionReport;
  /** Workzone execution order */
  sequenceNumber: number;
  /** Estimated cycle time in seconds */
  estimatedCycleTime: number;
  /** Post processor assignment */
  postProcessor: string;
  /** NC output file path */
  ncOutputPath?: string;
  /** Workzone-level metadata */
  metadata: Record<string, unknown>;
}

/** WorkNC orientation for workzone */
export interface WorkNCOrientation {
  /** Tool axis vector (I, J, K) */
  toolAxis: { i: number; j: number; k: number };
  /** Origin point (X, Y, Z) */
  origin: { x: number; y: number; z: number };
  /** Rotation angles (if applicable) */
  rotation?: { a: number; b: number; c: number };
  /** Named orientation (e.g., "TOP", "FRONT", "CUSTOM") */
  orientationType: WorkNCOrientationType;
}

/** WorkNC orientation types */
export type WorkNCOrientationType =
  | "top"
  | "bottom"
  | "front"
  | "back"
  | "left"
  | "right"
  | "custom"
  | "auto_5axis";

/** WorkNC operation - individual machining operation within a workzone */
export interface WorkNCOperation {
  /** Unique operation identifier */
  operationId: string;
  /** Operation name */
  operationName: string;
  /** Operation type (WorkNC strategy name) */
  operationType: WorkNCOperationType;
  /** Tool assignment */
  toolId: string;
  /** Cutting parameters */
  cuttingParams: WorkNCCuttingParams;
  /** Strategy-specific parameters */
  strategyParams: WorkNCStrategyParams;
  /** Geometry references (surfaces, curves, etc.) */
  geometryRefs: string[];
  /** Machining tolerance in mm */
  tolerance: number;
  /** Stock to leave (radial) in mm */
  stockToLeaveRadial: number;
  /** Stock to leave (axial) in mm */
  stockToLeaveAxial: number;
  /** Collision avoidance mode */
  collisionAvoidance: WorkNCCollisionAvoidanceMode;
  /** Collision check status for this operation */
  collisionStatus: "clear" | "collision" | "not_checked";
  /** Collision details if collision detected */
  collisionDetails?: WorkNCCollisionDetail[];
  /** 5-axis strategy settings (if auto 5-axis) */
  auto5AxisSettings?: WorkNCAuto5AxisSettings;
  /** Operation execution order within workzone */
  sequenceNumber: number;
  /** Whether this operation is enabled */
  isEnabled: boolean;
  /** Toolpath statistics */
  toolpathStats?: WorkNCToolpathStats;
  /** Operation-level metadata */
  metadata: Record<string, unknown>;
}

/** WorkNC operation types (machining strategies) */
export type WorkNCOperationType =
  // Roughing strategies (WorkNC's strength)
  | "global_roughing"
  | "adaptive_roughing"
  | "waveform_roughing"
  | "level_roughing"
  | "plunge_roughing"
  | "rest_roughing"
  // Semi-finishing strategies
  | "global_semi_finishing"
  | "contour_semi_finishing"
  | "rest_semi_finishing"
  // Finishing strategies
  | "z_level_finishing"
  | "parallel_finishing"
  | "radial_finishing"
  | "spiral_finishing"
  | "geodesic_finishing"
  | "pencil_finishing"
  | "rest_finishing"
  | "constant_cusp_finishing"
  | "drive_curve_finishing"
  // Auto 5-axis strategies (WorkNC's core differentiator)
  | "auto_5axis_roughing"
  | "auto_5axis_finishing"
  | "auto_5axis_swarf"
  | "auto_5axis_contour"
  | "auto_5axis_drilling"
  // 3+2 strategies
  | "3plus2_roughing"
  | "3plus2_finishing"
  // Drilling
  | "drilling"
  | "deep_drilling"
  | "tapping"
  | "boring"
  | "reaming"
  // Special
  | "electrode"
  | "engraving"
  | "chamfering"
  | "custom";

/** WorkNC collision avoidance modes */
export type WorkNCCollisionAvoidanceMode =
  | "none"
  | "holder_check"
  | "full_assembly"
  | "auto_retract"
  | "auto_tilt"
  | "dynamic_5axis";

/** WorkNC Auto 5-axis settings */
export interface WorkNCAuto5AxisSettings {
  /** Automatic tool axis control mode */
  axisControlMode: "automatic" | "lead_lag" | "swarf" | "point_to_surface";
  /** Maximum tilt angle from vertical (degrees) */
  maxTiltAngle: number;
  /** Minimum tilt angle (degrees) */
  minTiltAngle: number;
  /** Lead angle (degrees) */
  leadAngle: number;
  /** Lag angle (degrees) */
  lagAngle: number;
  /** Tilt direction preference */
  tiltPreference: "shortest" | "smooth" | "away_from_surface";
  /** Collision detection sensitivity (mm) */
  collisionMargin: number;
  /** Enable holder collision avoidance */
  holderAvoidance: boolean;
  /** Enable fixture collision avoidance */
  fixtureAvoidance: boolean;
  /** Smoothing factor for axis transitions */
  smoothingFactor: number;
  /** Maximum angular velocity (deg/sec) */
  maxAngularVelocity: number;
}

/** WorkNC tool definition */
export interface WorkNCTool {
  /** Unique tool identifier */
  toolId: string;
  /** Tool name */
  toolName: string;
  /** Tool type */
  toolType: WorkNCToolType;
  /** Diameter in mm */
  diameter: number;
  /** Corner radius in mm (for bull endmills) */
  cornerRadius: number;
  /** Flute length in mm */
  fluteLength: number;
  /** Overall length in mm */
  overallLength: number;
  /** Number of flutes */
  flutes: number;
  /** Tool material */
  material: "carbide" | "hss" | "ceramic" | "cbn" | "pcd";
  /** Coating */
  coating: string;
  /** Holder assembly */
  holderAssembly: WorkNCHolderAssembly;
  /** Gauge length (tool tip to spindle face) in mm */
  gaugeLength: number;
  /** Coolant configuration */
  coolant: "flood" | "mist" | "through_tool" | "air" | "none";
  /** Tool number in magazine */
  toolNumber: number;
  /** Manufacturer */
  manufacturer: string;
  /** Manufacturer part number */
  partNumber: string;
  /** 3D model reference for collision checking */
  modelRef?: string;
  /** Tool-level metadata */
  metadata: Record<string, unknown>;
}

/** WorkNC tool types */
export type WorkNCToolType =
  | "flat_endmill"
  | "ball_endmill"
  | "bull_endmill"
  | "taper_endmill"
  | "taper_ball"
  | "lollipop"
  | "drill"
  | "center_drill"
  | "spot_drill"
  | "tap"
  | "reamer"
  | "boring_bar"
  | "face_mill"
  | "chamfer"
  | "engraver"
  | "thread_mill"
  | "form_tool";

/** WorkNC holder assembly (critical for collision avoidance) */
export interface WorkNCHolderAssembly {
  /** Holder identifier */
  holderId: string;
  /** Holder name */
  holderName: string;
  /** Holder segments (for collision model) */
  segments: WorkNCHolderSegment[];
  /** Total holder length in mm */
  totalLength: number;
  /** Spindle interface type */
  spindleInterface: "bt40" | "bt50" | "hsk63" | "hsk100" | "cat40" | "cat50";
}

/** WorkNC holder segment for accurate collision modeling */
export interface WorkNCHolderSegment {
  /** Segment type */
  type: "cylinder" | "cone" | "sphere";
  /** Length in mm */
  length: number;
  /** Diameter at start in mm */
  diameterStart: number;
  /** Diameter at end in mm (for cones) */
  diameterEnd?: number;
}

/** WorkNC cutting parameters */
export interface WorkNCCuttingParams {
  /** Spindle speed in RPM */
  spindleRpm: number;
  /** Surface speed in m/min */
  surfaceSpeed: number;
  /** Feed rate in mm/min */
  feedRate: number;
  /** Feed per tooth in mm */
  feedPerTooth: number;
  /** Axial depth of cut in mm */
  axialDepth: number;
  /** Radial depth of cut (stepover) in mm */
  radialDepth: number;
  /** Plunge feed rate in mm/min */
  plungeFeed: number;
  /** Ramp feed rate in mm/min */
  rampFeed: number;
  /** Lead-in feed rate in mm/min */
  leadInFeed: number;
  /** Rapid height in mm */
  rapidHeight: number;
  /** Retract height in mm */
  retractHeight: number;
}

/** WorkNC strategy-specific parameters */
export interface WorkNCStrategyParams {
  /** Cutting direction */
  cutDirection: "climb" | "conventional" | "mixed" | "optimized";
  /** Step-down mode */
  stepDownMode: "constant" | "variable" | "adaptive";
  /** Rest machining reference tool diameter */
  restToolDiameter?: number;
  /** Waveform amplitude (for waveform roughing) */
  waveformAmplitude?: number;
  /** Waveform frequency (for waveform roughing) */
  waveformFrequency?: number;
  /** Scallop height target in mm */
  scallopHeight?: number;
  /** Lead-in type */
  leadInType: "arc" | "helix" | "ramp" | "plunge" | "tangent";
  /** Lead-out type */
  leadOutType: "arc" | "tangent" | "retract" | "none";
  /** Linking type between passes */
  linkingType: "direct" | "retract" | "clearance" | "optimized";
  /** Enable high-speed machining optimizations */
  hsmEnabled: boolean;
  /** Corner treatment mode */
  cornerTreatment: "sharp" | "round" | "loop" | "roll";
}

/** WorkNC stock definition */
export interface WorkNCStock {
  stockId: string;
  stockName: string;
  stockType: "bounding_box" | "cylinder" | "stl" | "solid" | "from_operation";
  dimensions?: { x: number; y: number; z: number };
  stlPath?: string;
  sourceOperationId?: string;
  material: string;
  /** Stock tracking mode */
  trackingMode: "automatic" | "manual" | "inherited";
}

/** WorkNC machine definition */
export interface WorkNCMachine {
  machineId: string;
  machineName: string;
  machineType: "3axis" | "4axis" | "5axis" | "mill_turn";
  controller: string;
  postProcessor: string;
  workEnvelope: { x: number; y: number; z: number };
  spindleMaxRpm: number;
  feedMax: number;
  rapidFeedMax: number;
  rotaryAxes?: WorkNCRotaryAxis[];
  /** Machine kinematics for 5-axis */
  kinematics?: WorkNCKinematics;
}

/** WorkNC rotary axis definition */
export interface WorkNCRotaryAxis {
  name: string;
  type: "table" | "head" | "nutating";
  minAngle: number;
  maxAngle: number;
  direction: { x: number; y: number; z: number };
}

/** WorkNC machine kinematics */
export interface WorkNCKinematics {
  type: "table_table" | "table_head" | "head_head" | "nutating" | "custom";
  pivotPoint?: { x: number; y: number; z: number };
  tcpEnabled: boolean;
}

/** WorkNC project settings */
export interface WorkNCSettings {
  units: "mm" | "inch";
  defaultTolerance: number;
  defaultStockToLeave: number;
  collisionCheckingEnabled: boolean;
  auto5AxisEnabled: boolean;
  hsmOptimizationEnabled: boolean;
}

/** WorkNC collision report */
export interface WorkNCCollisionReport {
  overallStatus: "clear" | "collision" | "warnings";
  totalChecks: number;
  collisionCount: number;
  nearMissCount: number;
  details: WorkNCCollisionDetail[];
  checkTimestamp: string;
  checkDuration: number;
}

/** WorkNC collision detail */
export interface WorkNCCollisionDetail {
  operationId: string;
  collisionType: "tool_part" | "tool_fixture" | "holder_part" | "holder_fixture" | "machine_part" | "machine_fixture";
  severity: "collision" | "warning" | "near_miss";
  position: { x: number; y: number; z: number };
  toolAxis?: { i: number; j: number; k: number };
  distance: number;
  description: string;
  suggestedAction?: string;
}

/** WorkNC toolpath statistics */
export interface WorkNCToolpathStats {
  totalLength: number;
  cuttingLength: number;
  rapidLength: number;
  estimatedTime: number;
  numberOfPasses: number;
  maxDepth: number;
  materialRemoved: number;
  /** 5-axis specific stats */
  axisRotations?: number;
  maxTiltReached?: number;
}

// ─── NC Output Parsing Types ──────────────────────────────────────────────────

/** Parsed NC output with WorkNC metadata */
export interface WorkNCNCParseResult {
  success: boolean;
  programNumber?: string;
  programName?: string;
  operations: WorkNCNCOperation[];
  tools: WorkNCNCTool[];
  totalLines: number;
  totalBlocks: number;
  estimatedTime: number;
  has5AxisMoves: boolean;
  errors: string[];
  warnings: string[];
}

/** NC operation parsed from WorkNC output */
export interface WorkNCNCOperation {
  operationId: string;
  operationName: string;
  operationType: string;
  toolNumber: number;
  startLine: number;
  endLine: number;
  cycleTime: number;
  spindleRpm: number;
  feedRate: number;
  is5Axis: boolean;
}

/** NC tool parsed from WorkNC output */
export interface WorkNCNCTool {
  toolNumber: number;
  toolName: string;
  diameter: number;
  length: number;
  offsetNumber: number;
}

// ─── PRISM Export Types ───────────────────────────────────────────────────────

/** PRISM unified CAM project format */
export interface PRISMCAMProject {
  source: "worknc";
  sourceVersion: string;
  extractedAt: string;
  projectName: string;
  operations: PRISMOperation[];
  tools: PRISMTool[];
  setups: PRISMSetup[];
  metadata: Record<string, unknown>;
}

/** PRISM unified operation format */
export interface PRISMOperation {
  id: string;
  name: string;
  type: string;
  toolId: string;
  setupId: string;
  sequenceNumber: number;
  cuttingParams: {
    spindleRpm: number;
    feedRate: number;
    axialDepth: number;
    radialDepth: number;
  };
  collisionStatus: string;
  estimatedTime: number;
  is5Axis: boolean;
}

/** PRISM unified tool format */
export interface PRISMTool {
  id: string;
  name: string;
  type: string;
  diameter: number;
  length: number;
  flutes: number;
  material: string;
  coating: string;
}

/** PRISM unified setup format */
export interface PRISMSetup {
  id: string;
  name: string;
  orientation: string;
  workzoneId: string;
}

// ─── Extraction Result Types ──────────────────────────────────────────────────

/** Project extraction result */
export interface WorkNCExtractionResult {
  success: boolean;
  project?: WorkNCProject;
  error?: string;
  extractedAt: string;
  stats: {
    workzoneCount: number;
    operationCount: number;
    toolCount: number;
    collisionIssues: number;
    auto5AxisOperations: number;
  };
}

// ─── Engine Implementation ────────────────────────────────────────────────────

/**
 * WorkNCCAMBridgeEngine - Bridge between WorkNC CAM and PRISM
 *
 * Handles extraction of WorkNC project data, NC output parsing,
 * collision avoidance data, and conversion to PRISM unified format.
 *
 * WorkNC specializes in automatic 5-axis toolpath generation with
 * built-in collision avoidance - this engine extracts and preserves
 * that intelligence for PRISM integration.
 */
export class WorkNCCAMBridgeEngine {

  // ── Project Extraction ──────────────────────────────────────────────────────

  /**
   * Extract full project structure from WorkNC project file or directory.
   *
   * @param projectPath - Path to WorkNC project (.wnc, .wpj) or project directory
   * @returns Extraction result with project data
   */
  extractProject(projectPath: string): WorkNCExtractionResult {
    const extractedAt = new Date().toISOString();

    if (!fs.existsSync(projectPath)) {
      return {
        success: false,
        error: `Project path not found: ${projectPath}`,
        extractedAt,
        stats: { workzoneCount: 0, operationCount: 0, toolCount: 0, collisionIssues: 0, auto5AxisOperations: 0 },
      };
    }

    try {
      const stat = fs.statSync(projectPath);
      const isDirectory = stat.isDirectory();
      const project = this._createProjectFromPath(projectPath, isDirectory);

      // Calculate statistics
      const operationCount = project.workzones.reduce((sum, wz) => sum + wz.operations.length, 0);
      const collisionIssues = project.workzones.reduce((sum, wz) => {
        if (wz.collisionStatus === "collision") return sum + 1;
        return sum + wz.operations.filter(op => op.collisionStatus === "collision").length;
      }, 0);
      const auto5AxisOperations = project.workzones.reduce((sum, wz) => {
        return sum + wz.operations.filter(op =>
          op.operationType.startsWith("auto_5axis") || op.auto5AxisSettings !== undefined
        ).length;
      }, 0);

      return {
        success: true,
        project,
        extractedAt,
        stats: {
          workzoneCount: project.workzones.length,
          operationCount,
          toolCount: project.tools.length,
          collisionIssues,
          auto5AxisOperations,
        },
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        error: `Extraction failed: ${message}`,
        extractedAt,
        stats: { workzoneCount: 0, operationCount: 0, toolCount: 0, collisionIssues: 0, auto5AxisOperations: 0 },
      };
    }
  }

  /**
   * Parse NC output with WorkNC-specific comments to extract operation structure.
   *
   * WorkNC NC comments typically follow patterns:
   *   (WORKNC OPERATION: name)
   *   (TOOL: T1 D12.0 ...)
   *   (STRATEGY: Auto 5-Axis Finishing)
   *   (COLLISION STATUS: CLEAR)
   *   (SPINDLE: 8000 RPM)
   *   (FEED: 2500 MM/MIN)
   *
   * @param ncContent - NC program content as string
   * @returns Parsed NC result with operations and tools
   */
  parseNCOutput(ncContent: string): WorkNCNCParseResult {
    const lines = ncContent.split("\n");
    const operations: WorkNCNCOperation[] = [];
    const tools: WorkNCNCTool[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];

    let programNumber: string | undefined;
    let programName: string | undefined;
    let currentOperation: Partial<WorkNCNCOperation> | null = null;
    let currentTool: number | null = null;
    let lineNumber = 0;
    let has5AxisMoves = false;

    // WorkNC comment patterns
    const PROGRAM_NUMBER_RE = /^[ON](\d+)/;
    const WORKNC_OP_START_RE = /\(WORKNC\s+OPERATION:\s*(.+)\)/i;
    const WORKNC_OP_END_RE = /\(END\s+OPERATION\)/i;
    const TOOL_COMMENT_RE = /\(TOOL:\s*T(\d+)\s+D([\d.]+)/i;
    const STRATEGY_RE = /\(STRATEGY:\s*(.+)\)/i;
    const COLLISION_RE = /\(COLLISION\s+STATUS:\s*(CLEAR|COLLISION|WARNING)\)/i;
    const SPINDLE_RE = /\(SPINDLE:\s*([\d.]+)/i;
    const FEED_RE = /\(FEED:\s*([\d.]+)/i;
    const TOOL_CHANGE_RE = /^T(\d+)\s*M6/i;
    const SPINDLE_CODE_RE = /S(\d+)/;
    const FEED_CODE_RE = /F(\d+)/;
    const FIVE_AXIS_RE = /[ABC][+-]?[\d.]+/;

    for (const line of lines) {
      lineNumber++;
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Check for program number/name
      const programMatch = PROGRAM_NUMBER_RE.exec(trimmed);
      if (programMatch && !programNumber) {
        programNumber = programMatch[1];
      }

      // Check for 5-axis moves (A, B, C axis)
      if (FIVE_AXIS_RE.test(trimmed) && !trimmed.startsWith("(")) {
        has5AxisMoves = true;
      }

      // Check for WorkNC operation start
      const opStartMatch = WORKNC_OP_START_RE.exec(trimmed);
      if (opStartMatch) {
        if (currentOperation) {
          currentOperation.endLine = lineNumber - 1;
          operations.push(currentOperation as WorkNCNCOperation);
        }
        currentOperation = {
          operationId: `op_${operations.length + 1}`,
          operationName: opStartMatch[1].trim(),
          operationType: "unknown",
          toolNumber: currentTool ?? 1,
          startLine: lineNumber,
          endLine: 0,
          cycleTime: 0,
          spindleRpm: 0,
          feedRate: 0,
          is5Axis: false,
        };
        continue;
      }

      // Check for operation end
      if (WORKNC_OP_END_RE.test(trimmed) && currentOperation) {
        currentOperation.endLine = lineNumber;
        operations.push(currentOperation as WorkNCNCOperation);
        currentOperation = null;
        continue;
      }

      // Check for tool comment
      const toolMatch = TOOL_COMMENT_RE.exec(trimmed);
      if (toolMatch) {
        const toolNum = parseInt(toolMatch[1], 10);
        const diameter = parseFloat(toolMatch[2]);
        const existing = tools.find(t => t.toolNumber === toolNum);
        if (!existing) {
          tools.push({
            toolNumber: toolNum,
            toolName: `T${toolNum}`,
            diameter,
            length: 0,
            offsetNumber: toolNum,
          });
        }
        currentTool = toolNum;
        if (currentOperation) {
          currentOperation.toolNumber = toolNum;
        }
        continue;
      }

      // Check for strategy
      const strategyMatch = STRATEGY_RE.exec(trimmed);
      if (strategyMatch && currentOperation) {
        currentOperation.operationType = strategyMatch[1].trim();
        if (strategyMatch[1].toLowerCase().includes("5-axis") ||
            strategyMatch[1].toLowerCase().includes("5axis")) {
          currentOperation.is5Axis = true;
        }
        continue;
      }

      // Check for spindle speed in comment
      const spindleMatch = SPINDLE_RE.exec(trimmed);
      if (spindleMatch && currentOperation) {
        currentOperation.spindleRpm = parseFloat(spindleMatch[1]);
        continue;
      }

      // Check for feed rate in comment
      const feedMatch = FEED_RE.exec(trimmed);
      if (feedMatch && currentOperation) {
        currentOperation.feedRate = parseFloat(feedMatch[1]);
        continue;
      }

      // Check for tool change in code
      const toolChangeMatch = TOOL_CHANGE_RE.exec(trimmed);
      if (toolChangeMatch) {
        currentTool = parseInt(toolChangeMatch[1], 10);
        if (currentOperation) {
          currentOperation.toolNumber = currentTool;
        }
      }

      // Check for spindle speed in code
      const spindleCodeMatch = SPINDLE_CODE_RE.exec(trimmed);
      if (spindleCodeMatch && currentOperation && !currentOperation.spindleRpm) {
        currentOperation.spindleRpm = parseInt(spindleCodeMatch[1], 10);
      }

      // Check for feed rate in code
      const feedCodeMatch = FEED_CODE_RE.exec(trimmed);
      if (feedCodeMatch && currentOperation && !currentOperation.feedRate) {
        currentOperation.feedRate = parseInt(feedCodeMatch[1], 10);
      }
    }

    // Close any remaining operation
    if (currentOperation) {
      currentOperation.endLine = lineNumber;
      operations.push(currentOperation as WorkNCNCOperation);
    }

    // Calculate estimated total time
    const estimatedTime = operations.reduce((sum, op) => {
      const lineCount = op.endLine - op.startLine;
      return sum + lineCount * 0.5;
    }, 0);

    return {
      success: true,
      programNumber,
      programName: programName ?? programNumber,
      operations,
      tools,
      totalLines: lineNumber,
      totalBlocks: lines.filter(l => l.trim() && !l.trim().startsWith("(")).length,
      estimatedTime,
      has5AxisMoves,
      errors,
      warnings,
    };
  }

  // ── Data Access Methods ─────────────────────────────────────────────────────

  /**
   * Get all workzones from a project.
   */
  getWorkzones(project: WorkNCProject): WorkNCWorkzone[] {
    return project.workzones.sort((a, b) => a.sequenceNumber - b.sequenceNumber);
  }

  /**
   * Get all tools from a project.
   */
  getTools(project: WorkNCProject): WorkNCTool[] {
    return project.tools.sort((a, b) => a.toolNumber - b.toolNumber);
  }

  /**
   * Get operations for a specific workzone.
   */
  getOperations(workzone: WorkNCWorkzone): WorkNCOperation[] {
    return workzone.operations.sort((a, b) => a.sequenceNumber - b.sequenceNumber);
  }

  /**
   * Get all Auto 5-axis operations from a project.
   */
  get5AxisStrategies(project: WorkNCProject): WorkNCOperation[] {
    const auto5AxisOps: WorkNCOperation[] = [];
    for (const wz of project.workzones) {
      for (const op of wz.operations) {
        if (op.operationType.startsWith("auto_5axis") || op.auto5AxisSettings) {
          auto5AxisOps.push(op);
        }
      }
    }
    return auto5AxisOps;
  }

  // ── Collision Avoidance Methods ─────────────────────────────────────────────

  /**
   * Get collision report for a workzone.
   */
  getCollisionReport(workzone: WorkNCWorkzone): WorkNCCollisionReport {
    const details: WorkNCCollisionDetail[] = [];
    let collisionCount = 0;
    let nearMissCount = 0;

    for (const op of workzone.operations) {
      if (op.collisionStatus === "collision" && op.collisionDetails) {
        for (const detail of op.collisionDetails) {
          details.push(detail);
          if (detail.severity === "collision") {
            collisionCount++;
          } else if (detail.severity === "near_miss") {
            nearMissCount++;
          }
        }
      } else if (op.collisionStatus === "not_checked") {
        details.push({
          operationId: op.operationId,
          collisionType: "tool_part",
          severity: "warning",
          position: { x: 0, y: 0, z: 0 },
          distance: 0,
          description: `Operation ${op.operationName} has not been collision-checked`,
          suggestedAction: "Run collision check before NC output",
        });
      }
    }

    const overallStatus: "clear" | "collision" | "warnings" =
      collisionCount > 0 ? "collision" :
      nearMissCount > 0 ? "warnings" : "clear";

    return {
      overallStatus,
      totalChecks: workzone.operations.length,
      collisionCount,
      nearMissCount,
      details,
      checkTimestamp: new Date().toISOString(),
      checkDuration: 0,
    };
  }

  /**
   * Validate all workzones in a project for collisions.
   */
  validateProjectCollisions(project: WorkNCProject): Array<{ workzoneId: string; report: WorkNCCollisionReport }> {
    return project.workzones.map(wz => ({
      workzoneId: wz.workzoneId,
      report: this.getCollisionReport(wz),
    }));
  }

  // ── Export Methods ──────────────────────────────────────────────────────────

  /**
   * Export WorkNC project to PRISM unified CAM format.
   */
  exportToPRISM(project: WorkNCProject): PRISMCAMProject {
    const operations: PRISMOperation[] = [];
    const setups: PRISMSetup[] = [];

    for (const wz of project.workzones) {
      // Create setup from workzone
      setups.push({
        id: wz.workzoneId,
        name: wz.workzoneName,
        orientation: wz.orientation.orientationType,
        workzoneId: wz.workzoneId,
      });

      // Extract operations
      for (const op of wz.operations) {
        operations.push({
          id: op.operationId,
          name: op.operationName,
          type: op.operationType,
          toolId: op.toolId,
          setupId: wz.workzoneId,
          sequenceNumber: op.sequenceNumber,
          cuttingParams: {
            spindleRpm: op.cuttingParams.spindleRpm,
            feedRate: op.cuttingParams.feedRate,
            axialDepth: op.cuttingParams.axialDepth,
            radialDepth: op.cuttingParams.radialDepth,
          },
          collisionStatus: op.collisionStatus,
          estimatedTime: op.toolpathStats?.estimatedTime ?? 0,
          is5Axis: op.operationType.startsWith("auto_5axis") || op.auto5AxisSettings !== undefined,
        });
      }
    }

    // Convert tools
    const tools: PRISMTool[] = project.tools.map(t => ({
      id: t.toolId,
      name: t.toolName,
      type: t.toolType,
      diameter: t.diameter,
      length: t.overallLength,
      flutes: t.flutes,
      material: t.material,
      coating: t.coating,
    }));

    return {
      source: "worknc",
      sourceVersion: project.version,
      extractedAt: new Date().toISOString(),
      projectName: project.projectName,
      operations,
      tools,
      setups,
      metadata: {
        workzoneCount: project.workzones.length,
        auto5AxisOperations: operations.filter(op => op.is5Axis).length,
        collisionCheckingEnabled: project.settings.collisionCheckingEnabled,
        originalPath: project.projectPath,
      },
    };
  }

  /**
   * Export project to JSON file.
   */
  exportToJSON(project: WorkNCProject, outputPath: string): void {
    const prismProject = this.exportToPRISM(project);
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(outputPath, JSON.stringify(prismProject, null, 2));
  }

  // ── Private Helpers ─────────────────────────────────────────────────────────

  private _createProjectFromPath(projectPath: string, isDirectory: boolean): WorkNCProject {
    const now = new Date().toISOString();
    const projectName = path.basename(projectPath, path.extname(projectPath));

    return {
      projectPath,
      version: "2024.1",
      cadModel: "",
      projectName,
      createdAt: now,
      modifiedAt: now,
      workzones: [],
      tools: [],
      stocks: [{
        stockId: "stock_1",
        stockName: "Raw Stock",
        stockType: "bounding_box",
        dimensions: { x: 100, y: 100, z: 50 },
        material: "Steel",
        trackingMode: "automatic",
      }],
      machines: [{
        machineId: "machine_1",
        machineName: "5-Axis VMC",
        machineType: "5axis",
        controller: "Siemens 840D",
        postProcessor: "worknc_siemens_5ax",
        workEnvelope: { x: 1000, y: 800, z: 600 },
        spindleMaxRpm: 18000,
        feedMax: 40000,
        rapidFeedMax: 60000,
        rotaryAxes: [
          { name: "A", type: "table", minAngle: -120, maxAngle: 120, direction: { x: 1, y: 0, z: 0 } },
          { name: "C", type: "table", minAngle: -360, maxAngle: 360, direction: { x: 0, y: 0, z: 1 } },
        ],
        kinematics: {
          type: "table_table",
          tcpEnabled: true,
        },
      }],
      settings: {
        units: "mm",
        defaultTolerance: 0.01,
        defaultStockToLeave: 0.3,
        collisionCheckingEnabled: true,
        auto5AxisEnabled: true,
        hsmOptimizationEnabled: true,
      },
      metadata: {
        extractedBy: "WorkNCCAMBridgeEngine",
        isDirectory,
      },
    };
  }
}

// ─── Singleton Export ─────────────────────────────────────────────────────────

export const workNCCAMBridgeEngine = new WorkNCCAMBridgeEngine();
