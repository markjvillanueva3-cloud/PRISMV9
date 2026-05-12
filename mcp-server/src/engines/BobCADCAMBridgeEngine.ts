/**
 * BobCADCAMBridgeEngine - PRISM-side HTTP client for BobCAD-CAM automation.
 *
 * BobCAD-CAM is an affordable, easy-to-use CAM system popular with small shops:
 * - Mill module (2.5D, 3D, 4-axis, 5-axis indexed/simultaneous)
 * - Lathe module (OD/ID roughing, finishing, grooving, threading)
 * - Mill-Turn module (live tooling, sub-spindle, C-axis)
 * - Wire EDM module (2D/4-axis taper, no-core cutting)
 * - Integrated CAD with solid modeling
 * - Built-in simulation and verification
 * - Tool library management
 *
 * This bridge communicates with a BobCAD automation add-in running on localhost.
 * The companion server exposes BobCAD's API through HTTP endpoints for project
 * management, operation creation, simulation, and NC code generation.
 *
 * File formats:
 * - .bbcd - BobCAD native project file
 * - .bbcam - BobCAD CAM-only project
 * - NC output per post processor selection
 *
 * @engine BobCADCAMBridgeEngine
 * @shortcode E1210
 * @dispatcher camDispatcher
 * @actions bobcad_connect, bobcad_extract_project, bobcad_get_tools,
 *          bobcad_get_operations, bobcad_run_simulation, bobcad_generate_nc,
 *          bobcad_push_params, bobcad_sync_tools
 * @milestone CAMX-BRIDGES/U01
 */

// ─── Configuration ─────────────────────────────────────────────────────────────

const BOBCAD_DEFAULT_PORT = 18380;
const CONNECT_TIMEOUT_MS = 3000;
const REQUEST_TIMEOUT_MS = 30000;
const SIMULATION_TIMEOUT_MS = 180000; // 3 min for heavy simulations

// ─── BobCAD-Specific Types ─────────────────────────────────────────────────────

/**
 * BobCAD project data extracted from a .bbcd/.bbcam file.
 */
export interface BobCADProject {
  /** Path to the BobCAD project file. */
  projectPath: string;
  /** Project name. */
  projectName: string;
  /** BobCAD version (e.g., "V35", "V34"). */
  version: string;
  /** Machine type configured in project. */
  machineType: BobCADMachineType;
  /** Controller/post processor. */
  postProcessor?: string;
  /** List of operations in the project. */
  operations: BobCADOperation[];
  /** List of tools defined in the project. */
  tools: BobCADTool[];
  /** Work coordinate systems. */
  workOffsets: BobCADWorkOffset[];
  /** Stock definition. */
  stock?: BobCADStock;
  /** Fixture/clamp definitions. */
  fixtures?: BobCADFixture[];
  /** Project metadata. */
  metadata: BobCADProjectMetadata;
  /** Warnings during extraction. */
  warnings: string[];
  /** Errors during extraction. */
  errors: string[];
}

/**
 * BobCAD machine types.
 */
export type BobCADMachineType =
  | "mill_3axis"
  | "mill_4axis"
  | "mill_5axis_indexed"
  | "mill_5axis_simultaneous"
  | "lathe_2axis"
  | "lathe_with_live"
  | "mill_turn"
  | "wire_edm_2axis"
  | "wire_edm_4axis"
  | "router"
  | "plasma"
  | "laser"
  | "waterjet";

/**
 * BobCAD project metadata.
 */
export interface BobCADProjectMetadata {
  /** File creation date. */
  createdDate?: string;
  /** Last modified date. */
  modifiedDate?: string;
  /** Created by user. */
  createdBy?: string;
  /** Units used in project. */
  units: "mm" | "inch";
  /** Total estimated cycle time in seconds. */
  totalCycleTimeSec?: number;
  /** Total operations count. */
  totalOperations: number;
  /** Total tools count. */
  totalTools: number;
  /** Part name. */
  partName?: string;
  /** Part number. */
  partNumber?: string;
  /** Material specified. */
  material?: string;
}

/**
 * BobCAD operation (CAM feature).
 */
export interface BobCADOperation {
  /** Operation ID within the project. */
  operationId: string;
  /** Operation name (user-defined). */
  operationName: string;
  /** Operation type/strategy. */
  operationType: BobCADOperationType;
  /** Module this operation belongs to. */
  module: "mill" | "lathe" | "mill_turn" | "wire_edm";
  /** Associated tool number. */
  toolNumber: number;
  /** Sequence order in operation list. */
  sequenceOrder: number;
  /** Is operation enabled for posting. */
  enabled: boolean;
  /** Operation status. */
  status: "pending" | "calculated" | "simulated" | "posted" | "error";
  /** Work offset (G54, G55, etc.). */
  workOffset?: string;
  /** Coolant mode. */
  coolantMode?: "flood" | "mist" | "through_tool" | "air" | "off";
  /** Machining parameters. */
  machiningParams: BobCADMachiningParams;
  /** Toolpath statistics (after calculation). */
  toolpathStats?: BobCADToolpathStats;
  /** Simulation result (after verification). */
  simulationResult?: BobCADSimulationResult;
}

/**
 * BobCAD operation types.
 */
export type BobCADOperationType =
  // Mill 2.5D
  | "profiling"
  | "pocketing"
  | "facing"
  | "engraving"
  | "thread_milling"
  | "chamfer"
  // Mill 3D
  | "roughing_3d"
  | "finishing_3d"
  | "z_level_roughing"
  | "z_level_finishing"
  | "parallel_finishing"
  | "radial_finishing"
  | "spiral_finishing"
  | "pencil_tracing"
  | "rest_machining"
  // Mill 4/5-axis
  | "4axis_wrap"
  | "4axis_rotary"
  | "5axis_swarf"
  | "5axis_flowline"
  | "5axis_multiaxis"
  // Drilling
  | "drilling"
  | "peck_drilling"
  | "tapping"
  | "boring"
  | "reaming"
  | "counterbore"
  | "countersink"
  // Lathe
  | "lathe_roughing"
  | "lathe_finishing"
  | "lathe_facing"
  | "lathe_grooving"
  | "lathe_threading"
  | "lathe_parting"
  | "lathe_boring"
  | "lathe_drilling"
  // Wire EDM
  | "wire_profile"
  | "wire_taper"
  | "wire_no_core"
  | "wire_open_profile";

/**
 * BobCAD machining parameters.
 */
export interface BobCADMachiningParams {
  // Speed and feed
  spindleRpm?: number;
  feedRateMmMin?: number;
  feedPerTooth?: number;
  feedPerRev?: number;
  plungeFeedMmMin?: number;
  // Depth of cut
  depthOfCutMm?: number;
  stepdownMm?: number;
  stepoverMm?: number;
  stepoverPercent?: number;
  // Stock allowances
  stockAllowanceMm?: number;
  finishAllowanceMm?: number;
  floorAllowanceMm?: number;
  // Approach/retract
  approachType?: "direct" | "tangent" | "arc" | "helix" | "ramp";
  retractType?: "direct" | "tangent" | "arc";
  leadInRadius?: number;
  leadOutRadius?: number;
  rampAngleDeg?: number;
  helixDiameter?: number;
  // Heights
  clearancePlaneMm?: number;
  rapidPlaneMm?: number;
  feedPlaneMm?: number;
  depthMm?: number;
  // Lathe specific
  cssMpm?: number;
  maxLathRpm?: number;
  // Wire EDM specific
  wireOffsetMm?: number;
  numSkimCuts?: number;
  taperAngleDeg?: number;
  taperSide?: "left" | "right";
  // Quality
  toleranceMm?: number;
  surfaceFinish?: "rough" | "semi" | "finish" | "super_finish";
}

/**
 * BobCAD toolpath statistics.
 */
export interface BobCADToolpathStats {
  /** Total toolpath length in mm. */
  totalLengthMm: number;
  /** Rapid movement length in mm. */
  rapidLengthMm: number;
  /** Cutting movement length in mm. */
  cuttingLengthMm: number;
  /** Estimated cycle time in seconds. */
  estimatedTimeSec: number;
  /** Number of toolpath points. */
  pointCount: number;
  /** Minimum Z depth reached. */
  minZMm?: number;
  /** Maximum Z height. */
  maxZMm?: number;
  /** Bounding box of toolpath. */
  boundingBox?: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    minZ: number;
    maxZ: number;
  };
}

/**
 * BobCAD simulation result.
 */
export interface BobCADSimulationResult {
  /** Collision detected during simulation. */
  collisionDetected: boolean;
  /** Collision details. */
  collisions?: BobCADCollision[];
  /** Gouge detected (tool cutting too deep). */
  gougeDetected: boolean;
  /** Gouge details. */
  gouges?: BobCADGouge[];
  /** Rapid through material detected. */
  rapidThroughMaterial: boolean;
  /** Final cycle time from simulation in seconds. */
  cycleTimeSec: number;
  /** Material removal volume in mm^3. */
  materialRemovedMm3?: number;
  /** Remaining stock volume in mm^3. */
  remainingStockMm3?: number;
  /** Simulation warnings. */
  warnings: string[];
}

/**
 * Collision detected in simulation.
 */
export interface BobCADCollision {
  /** Collision type. */
  type: "tool_fixture" | "tool_stock" | "holder_stock" | "holder_fixture" | "machine_part";
  /** Location of collision. */
  location: [number, number, number];
  /** Severity level. */
  severity: "warning" | "error";
  /** Description. */
  description: string;
  /** Operation causing collision. */
  operationId?: string;
  /** Time in simulation when collision occurs. */
  timeSec?: number;
}

/**
 * Gouge detected in simulation.
 */
export interface BobCADGouge {
  /** Gouge depth in mm. */
  depthMm: number;
  /** Location of gouge. */
  location: [number, number, number];
  /** Operation causing gouge. */
  operationId?: string;
}

/**
 * BobCAD tool definition.
 */
export interface BobCADTool {
  /** Tool number in magazine/turret. */
  toolNumber: number;
  /** Tool ID (unique identifier). */
  toolId: string;
  /** Tool type. */
  toolType: BobCADToolType;
  /** Tool description. */
  description: string;
  /** Tool diameter in mm. */
  diameterMm: number;
  /** Corner radius in mm. */
  cornerRadiusMm: number;
  /** Flute/cutting length in mm. */
  fluteLengthMm: number;
  /** Overall length in mm. */
  overallLengthMm: number;
  /** Number of flutes. */
  flutes: number;
  /** Tool material. */
  material: "carbide" | "hss" | "ceramic" | "cbn" | "pcd" | "cobalt";
  /** Tool coating. */
  coating?: string;
  /** Holder ID. */
  holderId?: string;
  /** Gauge length in mm. */
  gaugeLengthMm?: number;
  /** Coolant through spindle capable. */
  coolantThrough: boolean;
  /** Manufacturer name. */
  manufacturer?: string;
  /** Part number. */
  partNumber?: string;
  /** Cutting data defaults. */
  cuttingData?: {
    surfaceSpeedMpm: number;
    feedPerToothMm: number;
    recommendedRpm: number;
    recommendedFeedMmMin: number;
  };
  // Lathe insert specific
  insertStyle?: string;
  insertAngle?: number;
  noseRadiusMm?: number;
  orientation?: number; // 1-9 for lathe tools
}

/**
 * BobCAD tool types.
 */
export type BobCADToolType =
  // Milling
  | "end_mill"
  | "ball_end_mill"
  | "bull_nose_mill"
  | "face_mill"
  | "shell_mill"
  | "chamfer_mill"
  | "thread_mill"
  | "slot_drill"
  | "t_slot"
  | "dovetail"
  | "lollipop"
  | "engraver"
  // Drilling
  | "drill"
  | "center_drill"
  | "spot_drill"
  | "tap"
  | "reamer"
  | "boring_bar"
  | "counterbore"
  | "countersink"
  // Lathe
  | "turning_insert"
  | "boring_insert"
  | "grooving_insert"
  | "threading_insert"
  | "parting_insert"
  // Wire EDM
  | "wire_electrode";

/**
 * BobCAD work offset.
 */
export interface BobCADWorkOffset {
  /** Offset ID. */
  id: string;
  /** G-code (G54, G55, etc.). */
  gCode: string;
  /** X offset in mm. */
  xMm: number;
  /** Y offset in mm. */
  yMm: number;
  /** Z offset in mm. */
  zMm: number;
  /** A rotation offset in degrees. */
  aDeg?: number;
  /** B rotation offset in degrees. */
  bDeg?: number;
  /** C rotation offset in degrees. */
  cDeg?: number;
  /** Description. */
  description?: string;
}

/**
 * BobCAD stock definition.
 */
export interface BobCADStock {
  /** Stock type. */
  type: "block" | "cylinder" | "tube" | "stl" | "solid";
  /** Dimensions for block stock. */
  block?: {
    lengthMm: number;
    widthMm: number;
    heightMm: number;
  };
  /** Dimensions for cylindrical stock (lathe). */
  cylinder?: {
    diameterMm: number;
    lengthMm: number;
    innerDiameterMm?: number;
  };
  /** Material name. */
  material?: string;
  /** Origin offset from WCS. */
  originOffset?: [number, number, number];
  /** Path to STL file if type is stl. */
  stlPath?: string;
}

/**
 * BobCAD fixture definition.
 */
export interface BobCADFixture {
  /** Fixture ID. */
  id: string;
  /** Fixture name. */
  name: string;
  /** Fixture type. */
  type: "vise" | "clamp" | "chuck" | "collet" | "fixture_plate" | "custom";
  /** Position relative to WCS. */
  position: [number, number, number];
  /** Include in collision checking. */
  collisionCheck: boolean;
  /** Path to STL model if custom. */
  stlPath?: string;
}

/**
 * Bridge connection result.
 */
export interface BobCADConnectionResult {
  /** Connection successful. */
  connected: boolean;
  /** Host address. */
  host: string;
  /** Port number. */
  port: number;
  /** BobCAD version detected. */
  bobcadVersion?: string;
  /** Session ID for this connection. */
  sessionId?: string;
  /** Status message. */
  message: string;
  /** Connection latency in ms. */
  latencyMs?: number;
}

/**
 * Parameter push result.
 */
export interface BobCADPushResult {
  /** Push successful. */
  success: boolean;
  /** Target operation ID. */
  operationId: string;
  /** Number of parameters updated. */
  parametersUpdated: number;
  /** Parameters that failed to update. */
  parametersFailed: string[];
  /** Status message. */
  message: string;
  /** Toolpath needs recalculation. */
  requiresRecalculation: boolean;
}

/**
 * Tool sync result.
 */
export interface BobCADToolSyncResult {
  /** Sync successful. */
  success: boolean;
  /** Tools added to BobCAD. */
  toolsAdded: number;
  /** Tools updated in BobCAD. */
  toolsUpdated: number;
  /** Tools removed from BobCAD. */
  toolsRemoved: number;
  /** Tools that failed to sync. */
  toolsFailed: string[];
  /** Sync direction. */
  syncDirection: "prism_to_bobcad" | "bobcad_to_prism" | "bidirectional";
  /** Status message. */
  message: string;
}

/**
 * NC generation result.
 */
export interface BobCADNCResult {
  /** Generation successful. */
  success: boolean;
  /** Output file path. */
  outputPath?: string;
  /** NC code content (if requested). */
  ncContent?: string;
  /** Post processor used. */
  postProcessor: string;
  /** Total lines generated. */
  totalLines: number;
  /** Warnings during generation. */
  warnings: string[];
  /** Errors during generation. */
  errors: string[];
}

/**
 * Extraction options.
 */
export interface BobCADExtractionOptions {
  /** Include toolpath statistics. */
  includeToolpaths?: boolean;
  /** Include simulation results. */
  includeSimulation?: boolean;
  /** Include stock definition. */
  includeStock?: boolean;
  /** Include fixture definitions. */
  includeFixtures?: boolean;
  /** Resolve tool library references. */
  resolveToolLibrary?: boolean;
}

// ─── Operation Type Mapping ────────────────────────────────────────────────────

const BOBCAD_OP_TYPE_MAP: Record<string, BobCADOperationType> = {
  "2D Profile": "profiling",
  "Pocket": "pocketing",
  "Face": "facing",
  "Engrave": "engraving",
  "Thread Mill": "thread_milling",
  "Z Level Rough": "z_level_roughing",
  "Z Level Finish": "z_level_finishing",
  "Parallel Finish": "parallel_finishing",
  "Radial Finish": "radial_finishing",
  "Spiral Finish": "spiral_finishing",
  "Pencil Trace": "pencil_tracing",
  "Multiaxis": "5axis_multiaxis",
  "Swarf": "5axis_swarf",
  "Drill": "drilling",
  "Peck Drill": "peck_drilling",
  "Tap": "tapping",
  "Rough Turn": "lathe_roughing",
  "Finish Turn": "lathe_finishing",
  "Face Turn": "lathe_facing",
  "Groove": "lathe_grooving",
  "Thread Turn": "lathe_threading",
  "Cutoff": "lathe_parting",
  "Wire Profile": "wire_profile",
  "Wire Taper": "wire_taper",
  "Wire No Core": "wire_no_core",
};

const BOBCAD_TOOL_TYPE_MAP: Record<string, BobCADToolType> = {
  "End Mill": "end_mill",
  "Ball Mill": "ball_end_mill",
  "Bull Mill": "bull_nose_mill",
  "Face Mill": "face_mill",
  "Chamfer": "chamfer_mill",
  "Drill": "drill",
  "Center Drill": "center_drill",
  "Tap": "tap",
  "Reamer": "reamer",
  "Turning": "turning_insert",
  "Boring": "boring_insert",
  "Grooving": "grooving_insert",
  "Threading": "threading_insert",
  "Parting": "parting_insert",
  "Wire": "wire_electrode",
};

// ─── Engine Implementation ─────────────────────────────────────────────────────

export class BobCADCAMBridgeEngine {
  private _host = "localhost";
  private _port = BOBCAD_DEFAULT_PORT;
  private _connected = false;
  private _sessionId: string | undefined;
  private _bobcadVersion: string | undefined;

  // ═══════════════════════════════════════════════════════════════════════════
  // Connection Management
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Connect to BobCAD-CAM automation server.
   * The companion add-in must be running inside BobCAD on the specified port.
   */
  async connect(
    host = "localhost",
    port = BOBCAD_DEFAULT_PORT
  ): Promise<BobCADConnectionResult> {
    this._host = host;
    this._port = port;
    const t0 = Date.now();

    try {
      const response = await this._post("/connect", {
        client: "PRISM-E1210",
        cam_system: "bobcad",
      }, CONNECT_TIMEOUT_MS);

      const latencyMs = Date.now() - t0;
      this._connected = !response.error;
      this._sessionId = String(response.session_id ?? response.sessionId ?? "");
      this._bobcadVersion = String(response.version ?? response.bobcad_version ?? "unknown");

      return {
        connected: this._connected,
        host: this._host,
        port: this._port,
        bobcadVersion: this._bobcadVersion,
        sessionId: this._sessionId || undefined,
        latencyMs,
        message: this._connected
          ? `Connected to BobCAD-CAM ${this._bobcadVersion} at ${host}:${port}`
          : `Connection refused: ${JSON.stringify(response.error ?? response)}`,
      };
    } catch (err: unknown) {
      this._connected = false;
      const message = err instanceof Error ? err.message : String(err);
      return {
        connected: false,
        host,
        port,
        message: `Failed to connect: ${message}`,
      };
    }
  }

  /**
   * Check connection status.
   */
  async getStatus(): Promise<BobCADConnectionResult> {
    const t0 = Date.now();
    try {
      const response = await this._get("/status", 3000);
      const latencyMs = Date.now() - t0;
      const alive = !response.error && (
        response.status === "ok" ||
        response.running === true ||
        response.alive === true
      );
      return {
        connected: alive,
        host: this._host,
        port: this._port,
        bobcadVersion: String(response.version ?? this._bobcadVersion ?? "unknown"),
        sessionId: this._sessionId,
        latencyMs,
        message: alive
          ? `BobCAD server running at ${this._host}:${this._port}`
          : `BobCAD server not responding: ${JSON.stringify(response)}`,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        connected: false,
        host: this._host,
        port: this._port,
        message: `Status check failed: ${message}`,
      };
    }
  }

  /**
   * Disconnect from BobCAD bridge server.
   */
  async disconnect(): Promise<{ disconnected: boolean; message: string }> {
    try {
      await this._post("/disconnect", { session_id: this._sessionId }, 3000);
    } catch {
      // Best-effort disconnect
    }
    this._connected = false;
    this._sessionId = undefined;
    return {
      disconnected: true,
      message: `Disconnected from BobCAD (${this._host}:${this._port})`,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Project Extraction
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Extract complete project data from a BobCAD project file.
   * Requires BobCAD bridge server with project open, or parses exported data.
   */
  async extractProject(
    projectPath: string,
    options: BobCADExtractionOptions = {}
  ): Promise<BobCADProject> {
    const warnings: string[] = [];
    const errors: string[] = [];

    const opts: Required<BobCADExtractionOptions> = {
      includeToolpaths: options.includeToolpaths ?? true,
      includeSimulation: options.includeSimulation ?? false,
      includeStock: options.includeStock ?? true,
      includeFixtures: options.includeFixtures ?? true,
      resolveToolLibrary: options.resolveToolLibrary ?? true,
    };

    // Try live extraction if connected
    if (this._connected) {
      try {
        const response = await this._post("/project/extract", {
          project_path: projectPath,
          ...opts,
          session_id: this._sessionId,
        });

        if (!response.error) {
          return this._normalizeProjectResponse(response, projectPath, warnings);
        }
        errors.push(`Live extraction failed: ${response.error}`);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        warnings.push(`Live extraction unavailable: ${msg}`);
      }
    }

    // Fallback to file-based extraction
    return this._extractFromFile(projectPath, warnings, errors);
  }

  private _extractFromFile(
    projectPath: string,
    warnings: string[],
    errors: string[]
  ): BobCADProject {
    warnings.push("File-based extraction: limited data without live BobCAD connection");
    const projectName = projectPath.split(/[/\\]/).pop()?.replace(/\.(bbcd|bbcam)$/i, "") ?? "Unknown";

    return {
      projectPath,
      projectName,
      version: "unknown",
      machineType: "mill_3axis",
      operations: [],
      tools: [],
      workOffsets: [],
      metadata: {
        units: "mm",
        totalOperations: 0,
        totalTools: 0,
      },
      warnings,
      errors: [...errors, "Live BobCAD connection required for full extraction"],
    };
  }

  private _normalizeProjectResponse(
    response: Record<string, unknown>,
    projectPath: string,
    warnings: string[]
  ): BobCADProject {
    const rawOps = (response.operations ?? response.Operations ?? []) as unknown[];
    const rawTools = (response.tools ?? response.Tools ?? []) as unknown[];
    const rawOffsets = (response.work_offsets ?? response.WorkOffsets ?? []) as unknown[];

    const operations = this._parseOperations(rawOps);
    const tools = this._parseTools(rawTools);
    const workOffsets = this._parseWorkOffsets(rawOffsets);

    const projectName = String(
      response.project_name ?? response.ProjectName ??
      projectPath.split(/[/\\]/).pop()?.replace(/\.(bbcd|bbcam)$/i, "") ?? "Unknown"
    );

    return {
      projectPath,
      projectName,
      version: String(response.version ?? "unknown"),
      machineType: (response.machine_type ?? "mill_3axis") as BobCADMachineType,
      postProcessor: response.post_processor as string | undefined,
      operations,
      tools,
      workOffsets,
      stock: this._parseStock(response.stock ?? response.Stock),
      fixtures: this._parseFixtures(response.fixtures ?? response.Fixtures),
      metadata: {
        createdDate: response.created_date as string | undefined,
        modifiedDate: response.modified_date as string | undefined,
        createdBy: response.created_by as string | undefined,
        units: (response.units ?? "mm") as "mm" | "inch",
        totalCycleTimeSec: this._coerceNum(response.total_cycle_time_sec),
        totalOperations: operations.length,
        totalTools: tools.length,
        partName: response.part_name as string | undefined,
        partNumber: response.part_number as string | undefined,
        material: response.material as string | undefined,
      },
      warnings,
      errors: [],
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Tool & Operation Accessors
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get tool list from current BobCAD session.
   */
  async getTools(): Promise<{ tools: BobCADTool[]; count: number; warnings: string[] }> {
    if (!this._connected) {
      return { tools: [], count: 0, warnings: ["Not connected to BobCAD"] };
    }

    try {
      const response = await this._post("/tools/list", { session_id: this._sessionId });
      if (response.error) {
        return { tools: [], count: 0, warnings: [`Failed: ${response.error}`] };
      }
      const tools = this._parseTools((response.tools ?? []) as unknown[]);
      return { tools, count: tools.length, warnings: [] };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { tools: [], count: 0, warnings: [`Error: ${msg}`] };
    }
  }

  /**
   * Get operation list from current BobCAD session.
   */
  async getOperations(): Promise<{ operations: BobCADOperation[]; count: number; warnings: string[] }> {
    if (!this._connected) {
      return { operations: [], count: 0, warnings: ["Not connected to BobCAD"] };
    }

    try {
      const response = await this._post("/operations/list", { session_id: this._sessionId });
      if (response.error) {
        return { operations: [], count: 0, warnings: [`Failed: ${response.error}`] };
      }
      const operations = this._parseOperations((response.operations ?? []) as unknown[]);
      return { operations, count: operations.length, warnings: [] };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { operations: [], count: 0, warnings: [`Error: ${msg}`] };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Simulation
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Run simulation/verification on operations.
   */
  async runSimulation(
    operationIds?: string[]
  ): Promise<{ success: boolean; results: BobCADSimulationResult[]; warnings: string[] }> {
    if (!this._connected) {
      return { success: false, results: [], warnings: ["Not connected to BobCAD"] };
    }

    try {
      const response = await this._post("/simulation/run", {
        operation_ids: operationIds,
        session_id: this._sessionId,
      }, SIMULATION_TIMEOUT_MS);

      if (response.error) {
        return { success: false, results: [], warnings: [`Simulation failed: ${response.error}`] };
      }

      const rawResults = (response.results ?? []) as unknown[];
      const results = rawResults.map(r => this._parseSimulationResult(r));

      return {
        success: true,
        results,
        warnings: (response.warnings ?? []) as string[],
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, results: [], warnings: [`Simulation error: ${msg}`] };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // NC Generation
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Generate NC code for operations.
   */
  async generateNC(
    outputPath: string,
    postProcessor?: string,
    operationIds?: string[]
  ): Promise<BobCADNCResult> {
    if (!this._connected) {
      return {
        success: false,
        postProcessor: postProcessor ?? "unknown",
        totalLines: 0,
        warnings: [],
        errors: ["Not connected to BobCAD"],
      };
    }

    try {
      const response = await this._post("/nc/generate", {
        output_path: outputPath,
        post_processor: postProcessor,
        operation_ids: operationIds,
        session_id: this._sessionId,
      });

      if (response.error) {
        return {
          success: false,
          postProcessor: postProcessor ?? "unknown",
          totalLines: 0,
          warnings: [],
          errors: [String(response.error)],
        };
      }

      return {
        success: true,
        outputPath: response.output_path as string | undefined,
        ncContent: response.nc_content as string | undefined,
        postProcessor: String(response.post_processor ?? postProcessor ?? "unknown"),
        totalLines: this._coerceNum(response.total_lines),
        warnings: (response.warnings ?? []) as string[],
        errors: [],
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        postProcessor: postProcessor ?? "unknown",
        totalLines: 0,
        warnings: [],
        errors: [`NC generation error: ${msg}`],
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Bidirectional: Push Parameters
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Push optimized parameters back to a BobCAD operation.
   */
  async pushParameters(
    operationId: string,
    parameters: Partial<BobCADMachiningParams>
  ): Promise<BobCADPushResult> {
    if (!this._connected) {
      return {
        success: false,
        operationId,
        parametersUpdated: 0,
        parametersFailed: Object.keys(parameters),
        message: "Not connected to BobCAD",
        requiresRecalculation: false,
      };
    }

    try {
      const response = await this._post("/operation/update", {
        operation_id: operationId,
        parameters,
        session_id: this._sessionId,
      });

      if (response.error) {
        return {
          success: false,
          operationId,
          parametersUpdated: 0,
          parametersFailed: Object.keys(parameters),
          message: `Push failed: ${response.error}`,
          requiresRecalculation: false,
        };
      }

      return {
        success: true,
        operationId,
        parametersUpdated: this._coerceNum(response.parameters_updated),
        parametersFailed: (response.parameters_failed ?? []) as string[],
        message: `Updated parameters for operation ${operationId}`,
        requiresRecalculation: Boolean(response.requires_recalculation ?? true),
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        operationId,
        parametersUpdated: 0,
        parametersFailed: Object.keys(parameters),
        message: `Push error: ${msg}`,
        requiresRecalculation: false,
      };
    }
  }

  /**
   * Synchronize tool library between PRISM and BobCAD.
   */
  async syncTools(
    prismTools: BobCADTool[],
    direction: "prism_to_bobcad" | "bobcad_to_prism" | "bidirectional" = "prism_to_bobcad"
  ): Promise<BobCADToolSyncResult> {
    if (!this._connected) {
      return {
        success: false,
        toolsAdded: 0,
        toolsUpdated: 0,
        toolsRemoved: 0,
        toolsFailed: prismTools.map(t => t.toolId),
        syncDirection: direction,
        message: "Not connected to BobCAD",
      };
    }

    try {
      const response = await this._post("/tools/sync", {
        tools: prismTools,
        direction,
        session_id: this._sessionId,
      });

      if (response.error) {
        return {
          success: false,
          toolsAdded: 0,
          toolsUpdated: 0,
          toolsRemoved: 0,
          toolsFailed: prismTools.map(t => t.toolId),
          syncDirection: direction,
          message: `Sync failed: ${response.error}`,
        };
      }

      return {
        success: true,
        toolsAdded: this._coerceNum(response.tools_added),
        toolsUpdated: this._coerceNum(response.tools_updated),
        toolsRemoved: this._coerceNum(response.tools_removed),
        toolsFailed: (response.tools_failed ?? []) as string[],
        syncDirection: direction,
        message: String(response.message ?? "Tool sync completed"),
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        toolsAdded: 0,
        toolsUpdated: 0,
        toolsRemoved: 0,
        toolsFailed: prismTools.map(t => t.toolId),
        syncDirection: direction,
        message: `Sync error: ${msg}`,
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Version Compatibility
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Check BobCAD version compatibility.
   * Supports BobCAD V30 (2018) and later.
   */
  checkVersionCompatibility(version: string): {
    compatible: boolean;
    minimumVersion: string;
    detectedVersion: string;
    warnings: string[];
  } {
    const warnings: string[] = [];
    const minimumVersion = "V30";

    // Parse version (formats: "V35", "V34.1", "35.0")
    const versionMatch = version.match(/V?(\d+)/i);
    const majorVersion = versionMatch ? parseInt(versionMatch[1], 10) : 0;

    if (majorVersion < 30) {
      warnings.push(`BobCAD ${version} is below minimum supported version ${minimumVersion}`);
    }

    if (majorVersion >= 30 && majorVersion < 33) {
      warnings.push("BobCAD V30-V32: Some advanced features may not be available");
    }

    return {
      compatible: majorVersion >= 30,
      minimumVersion,
      detectedVersion: version,
      warnings,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Private Helpers — Parsing
  // ═══════════════════════════════════════════════════════════════════════════

  private _parseOperations(rawOps: unknown[]): BobCADOperation[] {
    return rawOps
      .filter((o): o is Record<string, unknown> => o != null && typeof o === "object")
      .map((op, index) => {
        const rawType = String(op.type ?? op.Type ?? "unknown");
        const normalizedType = BOBCAD_OP_TYPE_MAP[rawType] ?? rawType.toLowerCase().replace(/\s+/g, "_") as BobCADOperationType;
        const params = (op.machining_params ?? op.MachiningParams ?? op.parameters ?? {}) as Record<string, unknown>;

        return {
          operationId: String(op.id ?? op.Id ?? `op-${index}`),
          operationName: String(op.name ?? op.Name ?? `Operation ${index + 1}`),
          operationType: normalizedType,
          module: (op.module ?? this._inferModule(normalizedType)) as BobCADOperation["module"],
          toolNumber: this._coerceNum(op.tool_number ?? op.ToolNumber),
          sequenceOrder: this._coerceNum(op.sequence ?? op.order, index),
          enabled: op.enabled !== false,
          status: (op.status ?? "pending") as BobCADOperation["status"],
          workOffset: op.work_offset as string | undefined,
          coolantMode: op.coolant as BobCADOperation["coolantMode"],
          machiningParams: {
            spindleRpm: this._optionalNum(params.rpm ?? params.spindle_rpm),
            feedRateMmMin: this._optionalNum(params.feed ?? params.feed_rate),
            feedPerTooth: this._optionalNum(params.fpt ?? params.feed_per_tooth),
            depthOfCutMm: this._optionalNum(params.doc ?? params.depth_of_cut),
            stepdownMm: this._optionalNum(params.stepdown),
            stepoverMm: this._optionalNum(params.stepover),
            stepoverPercent: this._optionalNum(params.stepover_percent),
            stockAllowanceMm: this._optionalNum(params.stock_allowance),
            clearancePlaneMm: this._optionalNum(params.clearance),
            toleranceMm: this._optionalNum(params.tolerance),
          },
          toolpathStats: this._parseToolpathStats(op.toolpath_stats ?? op.toolpath),
          simulationResult: this._parseSimulationResult(op.simulation),
        };
      });
  }

  private _inferModule(opType: BobCADOperationType): BobCADOperation["module"] {
    if (opType.startsWith("lathe_")) return "lathe";
    if (opType.startsWith("wire_")) return "wire_edm";
    if (opType.includes("mill_turn") || opType.includes("sub_spindle")) return "mill_turn";
    return "mill";
  }

  private _parseTools(rawTools: unknown[]): BobCADTool[] {
    return rawTools
      .filter((t): t is Record<string, unknown> => t != null && typeof t === "object")
      .map((tool) => {
        const rawType = String(tool.type ?? tool.Type ?? "End Mill");
        const normalizedType = BOBCAD_TOOL_TYPE_MAP[rawType] ?? rawType.toLowerCase().replace(/\s+/g, "_") as BobCADToolType;

        return {
          toolNumber: this._coerceNum(tool.number ?? tool.tool_number),
          toolId: String(tool.id ?? tool.tool_id ?? `tool-${tool.number}`),
          toolType: normalizedType,
          description: String(tool.description ?? `${rawType} Tool`),
          diameterMm: this._coerceNum(tool.diameter),
          cornerRadiusMm: this._coerceNum(tool.corner_radius),
          fluteLengthMm: this._coerceNum(tool.flute_length),
          overallLengthMm: this._coerceNum(tool.overall_length ?? tool.oal),
          flutes: this._coerceNum(tool.flutes ?? tool.num_flutes, 2),
          material: (tool.material ?? "carbide") as BobCADTool["material"],
          coating: tool.coating as string | undefined,
          holderId: tool.holder_id as string | undefined,
          gaugeLengthMm: this._optionalNum(tool.gauge_length),
          coolantThrough: Boolean(tool.coolant_through ?? false),
          manufacturer: tool.manufacturer as string | undefined,
          partNumber: tool.part_number as string | undefined,
          insertStyle: tool.insert_style as string | undefined,
          insertAngle: this._optionalNum(tool.insert_angle),
          noseRadiusMm: this._optionalNum(tool.nose_radius),
          orientation: this._optionalNum(tool.orientation),
        };
      });
  }

  private _parseWorkOffsets(rawOffsets: unknown[]): BobCADWorkOffset[] {
    return rawOffsets
      .filter((o): o is Record<string, unknown> => o != null && typeof o === "object")
      .map((offset) => ({
        id: String(offset.id ?? offset.g_code),
        gCode: String(offset.g_code ?? offset.GCode ?? "G54"),
        xMm: this._coerceNum(offset.x),
        yMm: this._coerceNum(offset.y),
        zMm: this._coerceNum(offset.z),
        aDeg: this._optionalNum(offset.a),
        bDeg: this._optionalNum(offset.b),
        cDeg: this._optionalNum(offset.c),
        description: offset.description as string | undefined,
      }));
  }

  private _parseStock(raw: unknown): BobCADStock | undefined {
    if (!raw || typeof raw !== "object") return undefined;
    const stock = raw as Record<string, unknown>;

    return {
      type: (stock.type ?? "block") as BobCADStock["type"],
      block: stock.block as BobCADStock["block"],
      cylinder: stock.cylinder as BobCADStock["cylinder"],
      material: stock.material as string | undefined,
      originOffset: stock.origin_offset as [number, number, number] | undefined,
      stlPath: stock.stl_path as string | undefined,
    };
  }

  private _parseFixtures(raw: unknown): BobCADFixture[] | undefined {
    if (!raw || !Array.isArray(raw)) return undefined;
    return raw
      .filter((f): f is Record<string, unknown> => f != null && typeof f === "object")
      .map((fix) => ({
        id: String(fix.id ?? "fixture-1"),
        name: String(fix.name ?? "Fixture"),
        type: (fix.type ?? "custom") as BobCADFixture["type"],
        position: (fix.position ?? [0, 0, 0]) as [number, number, number],
        collisionCheck: Boolean(fix.collision_check ?? true),
        stlPath: fix.stl_path as string | undefined,
      }));
  }

  private _parseToolpathStats(raw: unknown): BobCADToolpathStats | undefined {
    if (!raw || typeof raw !== "object") return undefined;
    const tp = raw as Record<string, unknown>;

    return {
      totalLengthMm: this._coerceNum(tp.total_length),
      rapidLengthMm: this._coerceNum(tp.rapid_length),
      cuttingLengthMm: this._coerceNum(tp.cutting_length),
      estimatedTimeSec: this._coerceNum(tp.estimated_time ?? tp.time_sec),
      pointCount: this._coerceNum(tp.point_count),
      minZMm: this._optionalNum(tp.min_z),
      maxZMm: this._optionalNum(tp.max_z),
      boundingBox: tp.bounding_box as BobCADToolpathStats["boundingBox"],
    };
  }

  private _parseSimulationResult(raw: unknown): BobCADSimulationResult {
    if (!raw || typeof raw !== "object") {
      return {
        collisionDetected: false,
        gougeDetected: false,
        rapidThroughMaterial: false,
        cycleTimeSec: 0,
        warnings: [],
      };
    }
    const sim = raw as Record<string, unknown>;

    return {
      collisionDetected: Boolean(sim.collision_detected ?? sim.has_collision),
      collisions: sim.collisions as BobCADCollision[] | undefined,
      gougeDetected: Boolean(sim.gouge_detected ?? sim.has_gouge),
      gouges: sim.gouges as BobCADGouge[] | undefined,
      rapidThroughMaterial: Boolean(sim.rapid_through_material),
      cycleTimeSec: this._coerceNum(sim.cycle_time ?? sim.time_sec),
      materialRemovedMm3: this._optionalNum(sim.material_removed),
      remainingStockMm3: this._optionalNum(sim.remaining_stock),
      warnings: (sim.warnings ?? []) as string[],
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Private Helpers — HTTP
  // ═══════════════════════════════════════════════════════════════════════════

  private async _post(
    path: string,
    body: Record<string, unknown>,
    timeoutMs = REQUEST_TIMEOUT_MS
  ): Promise<Record<string, unknown>> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(`http://${this._host}:${this._port}${path}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-PRISM-Client": "E1210-BobCADCAMBridge",
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timer);

      const text = await res.text();
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = { raw_text: text };
      }

      if (!res.ok) {
        return { error: `HTTP ${res.status}`, detail: parsed };
      }
      return (typeof parsed === "object" && parsed !== null)
        ? parsed as Record<string, unknown>
        : { result: parsed };
    } catch (err: unknown) {
      clearTimeout(timer);
      if (err instanceof Error && err.name === "AbortError") {
        throw new Error(`Request to ${path} timed out after ${timeoutMs}ms`);
      }
      throw err;
    }
  }

  private async _get(
    path: string,
    timeoutMs = REQUEST_TIMEOUT_MS
  ): Promise<Record<string, unknown>> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(`http://${this._host}:${this._port}${path}`, {
        method: "GET",
        headers: { "X-PRISM-Client": "E1210-BobCADCAMBridge" },
        signal: controller.signal,
      });
      clearTimeout(timer);

      const text = await res.text();
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = { raw_text: text };
      }

      if (!res.ok) {
        return { error: `HTTP ${res.status}`, detail: parsed };
      }
      return (typeof parsed === "object" && parsed !== null)
        ? parsed as Record<string, unknown>
        : { result: parsed };
    } catch (err: unknown) {
      clearTimeout(timer);
      if (err instanceof Error && err.name === "AbortError") {
        throw new Error(`GET ${path} timed out after ${timeoutMs}ms`);
      }
      throw err;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Private Helpers — Numeric Coercion
  // ═══════════════════════════════════════════════════════════════════════════

  private _coerceNum(v: unknown, fallback = 0): number {
    const n = parseFloat(String(v ?? ""));
    return isNaN(n) ? fallback : n;
  }

  private _optionalNum(v: unknown): number | undefined {
    if (v === undefined || v === null || v === "") return undefined;
    const n = parseFloat(String(v));
    return isNaN(n) ? undefined : n;
  }
}

// ─── Singleton Export ──────────────────────────────────────────────────────────

export const bobCADCAMBridgeEngine = new BobCADCAMBridgeEngine();
