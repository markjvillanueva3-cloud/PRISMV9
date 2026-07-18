// WIRE-EXEMPT: external HTTP client consumed via direct import; SprutCAM integration follows the bridge-engine pattern. Test: src/__tests__/sprutcam-bridge.test.ts (kebab-case naming predates the hook).
/**
 * SprutCAMBridgeEngine — PRISM-side HTTP client for SprutCAM/SprutCAM X automation.
 *
 * SprutCAM is a versatile CAM system supporting:
 * - Robot machining (6-axis industrial robots with KUKA, ABB, FANUC)
 * - Multi-axis turning (mill-turn, Swiss-type, multi-channel)
 * - Wire EDM (4-axis taper cutting)
 * - Machine simulation with collision detection
 * - Waterjet, laser, plasma cutting
 * - Additive manufacturing (DED)
 *
 * This bridge communicates with a SprutCAM automation server add-in running
 * on localhost:18366. The companion server exposes SprutCAM's COM/API interface
 * through HTTP endpoints for project management, operation creation, simulation,
 * and NC code generation.
 *
 * @engine SprutCAMBridgeEngine
 * @shortcode E1180
 * @dispatcher camDispatcher
 * @actions sprutcam_connect, sprutcam_open_project, sprutcam_create_operation,
 *          sprutcam_run_simulation, sprutcam_generate_nc, sprutcam_robot_config
 * @milestone CAMX-MS13/U01
 */

// ─── Configuration ─────────────────────────────────────────────────────────────

const SPRUTCAM_DEFAULT_PORT = 18366;
const CONNECT_TIMEOUT_MS = 3000;
const REQUEST_TIMEOUT_MS = 30000;
const SIMULATION_TIMEOUT_MS = 300000; // 5 min for heavy simulations

// ─── SprutCAM-Specific Types ───────────────────────────────────────────────────

/**
 * SprutCAM project data extracted from a .stc/.stcx file.
 */
export interface SprutCAMProject {
  /** Path to the SprutCAM project file (.stc or .stcx). */
  projectPath: string;
  /** SprutCAM version (e.g., "17.0", "16.5"). */
  version: string;
  /** Whether machine simulation is enabled and configured. */
  machineSimulation: boolean;
  /** List of operations in the project. */
  operations: SprutOperation[];
  /** List of tools defined in the project. */
  tools: SprutTool[];
  /** Robot machining support enabled. */
  robotSupport?: boolean;
  /** Robot configuration (if robotSupport is true). */
  robotConfig?: SprutRobotConfig;
  /** Mill-turn configuration (if applicable). */
  millTurnConfig?: SprutMillTurnConfig;
  /** Wire EDM configuration (if applicable). */
  wireEdmConfig?: SprutWireEdmConfig;
  /** Machine definition with kinematic chain. */
  machineDefinition?: SprutMachineDefinition;
  /** Stock/workpiece definition. */
  stock?: SprutStock;
  /** Fixture definitions as collision bodies. */
  fixtures?: SprutFixture[];
}

/**
 * SprutCAM operation (machining strategy).
 */
export interface SprutOperation {
  /** Operation ID within the project. */
  id: string;
  /** Operation name (user-defined). */
  name: string;
  /** Operation type/strategy. */
  type: SprutOperationType;
  /** Associated tool ID. */
  toolId?: string;
  /** Machining parameters. */
  params: SprutOperationParams;
  /** Operation status. */
  status: "pending" | "calculated" | "verified" | "posted" | "error";
  /** Estimated cycle time in seconds (after calculation). */
  cycleTimeSec?: number;
  /** Toolpath statistics (after calculation). */
  toolpathStats?: SprutToolpathStats;
  /** Simulation result (after verification). */
  simulationResult?: SprutSimulationResult;
}

/**
 * SprutCAM operation types covering all supported processes.
 */
export type SprutOperationType =
  // Milling
  | "adaptive_roughing"
  | "contour_milling"
  | "pocket_milling"
  | "face_milling"
  | "3d_roughing"
  | "3d_finishing"
  | "rest_milling"
  | "engraving"
  // 5-axis
  | "5axis_contour"
  | "5axis_swarf"
  | "5axis_flowline"
  | "5axis_impeller"
  | "5axis_turbine_blade"
  // Turning
  | "od_roughing"
  | "od_finishing"
  | "id_boring"
  | "facing"
  | "grooving"
  | "threading"
  | "parting"
  // Mill-turn
  | "mill_turn_od"
  | "mill_turn_cross_drill"
  | "mill_turn_off_center"
  | "sub_spindle_transfer"
  | "swiss_type"
  // Drilling
  | "drill_simple"
  | "drill_peck"
  | "drill_chip_break"
  | "tapping"
  | "boring"
  | "reaming"
  // Wire EDM
  | "wire_edm_profile"
  | "wire_edm_taper"
  | "wire_edm_no_core"
  // Robot machining
  | "robot_contour"
  | "robot_surface"
  | "robot_deburring"
  | "robot_polishing"
  // Other processes
  | "waterjet_cut"
  | "laser_cut"
  | "plasma_cut"
  | "additive_ded"
  | "gear_hobbing"
  | "gear_skiving";

/**
 * SprutCAM operation parameters.
 */
export interface SprutOperationParams {
  // Common
  spindleRpm?: number;
  feedMmMin?: number;
  feedMmRev?: number;
  depthOfCutMm?: number;
  stepoverMm?: number;
  stepoverPercent?: number;
  // Adaptive roughing
  maxEngagementPercent?: number;
  chipLoadMm?: number;
  // 5-axis
  leadAngleDeg?: number;
  lagAngleDeg?: number;
  tiltAngleDeg?: number;
  toolAxisSmoothingDeg?: number;
  // Turning
  cssMpm?: number;
  maxRpm?: number;
  // Wire EDM
  wireOffsetMm?: number;
  skimCuts?: number;
  taperAngleDeg?: number;
  // Robot
  tcpSpeed?: number;
  robotAcceleration?: number;
  // Approach/retract
  approachType?: "tangent" | "perpendicular" | "helix" | "ramp";
  rampAngleDeg?: number;
  // Stock
  stockAllowanceMm?: number;
  finishAllowanceMm?: number;
  // Quality
  toleranceMm?: number;
  scalllopHeightMm?: number;
  // Custom parameters
  custom?: Record<string, number | string | boolean>;
}

/**
 * SprutCAM tool definition.
 */
export interface SprutTool {
  /** Tool ID. */
  id: string;
  /** Tool number in magazine. */
  number: number;
  /** Tool type. */
  type: SprutToolType;
  /** Tool diameter in mm. */
  diameterMm: number;
  /** Number of flutes/inserts. */
  fluteCount?: number;
  /** Flute length in mm. */
  fluteLengthMm?: number;
  /** Overall length in mm. */
  overallLengthMm?: number;
  /** Corner radius in mm. */
  cornerRadiusMm?: number;
  /** Taper angle for tapered tools. */
  taperAngleDeg?: number;
  /** Tool material. */
  material?: "carbide" | "hss" | "ceramic" | "cbn" | "pcd" | "diamond";
  /** Coating. */
  coating?: string;
  /** Tool holder ID. */
  holderId?: string;
  /** Holder gauge length. */
  holderGaugeLengthMm?: number;
  /** Tool description. */
  description?: string;
}

/**
 * SprutCAM tool types.
 */
export type SprutToolType =
  | "end_mill"
  | "ball_end"
  | "bull_nose"
  | "face_mill"
  | "drill"
  | "tap"
  | "reamer"
  | "boring_bar"
  | "turning_insert"
  | "grooving_insert"
  | "threading_insert"
  | "parting_insert"
  | "v_bit"
  | "chamfer_mill"
  | "slot_drill"
  | "t_slot"
  | "dovetail"
  | "barrel_cutter"
  | "lollipop"
  | "wire_electrode";

/**
 * SprutCAM robot configuration (SprutCAM Robot module).
 */
export interface SprutRobotConfig {
  /** Robot manufacturer (KUKA, ABB, FANUC, etc.). */
  manufacturer: string;
  /** Robot model. */
  model: string;
  /** Axis count (typically 6). */
  axisCount: number;
  /** DH parameters for kinematic model. */
  dhParameters?: {
    d: number[];
    a: number[];
    alpha: number[];
    theta: number[];
  };
  /** Tool Center Point offset. */
  tcpOffset: {
    x: number;
    y: number;
    z: number;
    rx?: number;
    ry?: number;
    rz?: number;
  };
  /** External axes (linear track, rotary table). */
  externalAxes?: {
    type: "linear" | "rotary";
    name: string;
    minLimit: number;
    maxLimit: number;
  }[];
  /** Reach in mm. */
  reachMm: number;
  /** Payload capacity in kg. */
  payloadKg: number;
  /** Singularity zones to avoid. */
  singularityZones?: {
    type: "wrist" | "shoulder" | "elbow";
    avoidanceStrategy: "tilt" | "reorient" | "split";
  }[];
}

/**
 * SprutCAM mill-turn configuration.
 */
export interface SprutMillTurnConfig {
  /** Machine type. */
  machineType: "mill_turn" | "swiss" | "multi_channel";
  /** Number of spindles. */
  spindleCount: number;
  /** Has sub-spindle. */
  hasSubSpindle: boolean;
  /** Has guide bushing (Swiss). */
  hasGuideBushing: boolean;
  /** Number of turrets. */
  turretCount: number;
  /** Live tooling available. */
  hasLiveTooling: boolean;
  /** Maximum live tool RPM. */
  maxLiveToolRpm?: number;
  /** Number of channels (for multi-channel). */
  channelCount: number;
  /** Synchronization mode. */
  syncMode: "wait" | "overlap" | "simultaneous";
}

/**
 * SprutCAM wire EDM configuration.
 */
export interface SprutWireEdmConfig {
  /** Wire diameter in mm. */
  wireDiameterMm: number;
  /** Wire material. */
  wireMaterial: "brass" | "coated_brass" | "zinc_coated" | "molybdenum";
  /** Has 4-axis UV capability. */
  has4Axis: boolean;
  /** Maximum taper angle in degrees. */
  maxTaperDeg?: number;
  /** Dielectric type. */
  dielectricType: "deionized_water" | "oil";
  /** Supports no-core cutting. */
  supportsNoCore: boolean;
  /** Power supply type. */
  powerSupplyType?: string;
  /** Threading capabilities. */
  threading: {
    autoThread: boolean;
    threadingHeadType?: "upper" | "submerged";
  };
}

/**
 * SprutCAM machine definition (kinematic chain).
 */
export interface SprutMachineDefinition {
  /** Machine name. */
  name: string;
  /** Machine type. */
  type: "3axis" | "4axis" | "5axis" | "lathe" | "mill_turn" | "wire_edm" | "robot";
  /** Controller type. */
  controller: string;
  /** Axis configuration. */
  axes: {
    name: string;
    type: "linear" | "rotary";
    direction: "X" | "Y" | "Z" | "A" | "B" | "C" | "U" | "V" | "W";
    minLimit: number;
    maxLimit: number;
    homePosition: number;
    maxFeed?: number;
    maxAccel?: number;
  }[];
  /** Spindle specifications. */
  spindle?: {
    maxRpm: number;
    minRpm: number;
    powerKw: number;
    torqueNm: number;
  };
  /** Work envelope in mm. */
  workEnvelope?: {
    xMin: number;
    xMax: number;
    yMin: number;
    yMax: number;
    zMin: number;
    zMax: number;
  };
  /** Tool changer. */
  toolChanger?: {
    type: "carousel" | "arm" | "turret" | "chain";
    capacity: number;
    changeTimeSec: number;
  };
}

/**
 * SprutCAM stock/workpiece definition.
 */
export interface SprutStock {
  /** Stock type. */
  type: "block" | "cylinder" | "tube" | "stl" | "from_cad";
  /** Dimensions for block stock. */
  block?: {
    lengthMm: number;
    widthMm: number;
    heightMm: number;
  };
  /** Dimensions for cylindrical stock. */
  cylinder?: {
    diameterMm: number;
    lengthMm: number;
    innerDiameterMm?: number;
  };
  /** Path to STL file for imported stock. */
  stlPath?: string;
  /** Material ISO group. */
  materialIsoGroup?: string;
  /** Material name. */
  materialName?: string;
  /** Hardness HRC. */
  hardnessHrc?: number;
}

/**
 * SprutCAM fixture definition (collision body).
 */
export interface SprutFixture {
  /** Fixture ID. */
  id: string;
  /** Fixture name. */
  name: string;
  /** Fixture type. */
  type: "vise" | "chuck" | "fixture_plate" | "soft_jaws" | "custom";
  /** Path to fixture CAD model. */
  cadPath?: string;
  /** Position relative to WCS. */
  position?: {
    x: number;
    y: number;
    z: number;
    rx?: number;
    ry?: number;
    rz?: number;
  };
  /** Is collision checking enabled. */
  collisionEnabled: boolean;
}

/**
 * SprutCAM toolpath statistics.
 */
export interface SprutToolpathStats {
  /** Total toolpath length in mm. */
  totalLengthMm: number;
  /** Cutting length in mm. */
  cuttingLengthMm: number;
  /** Rapid length in mm. */
  rapidLengthMm: number;
  /** Total moves. */
  totalMoves: number;
  /** Maximum Z depth. */
  maxDepthMm: number;
  /** Estimated cycle time in seconds. */
  cycleTimeSec: number;
}

/**
 * SprutCAM simulation result.
 */
export interface SprutSimulationResult {
  /** Simulation passed without collision. */
  passed: boolean;
  /** Collision detected. */
  collisionDetected: boolean;
  /** Collision details (if any). */
  collisions?: {
    type: "tool_fixture" | "tool_stock" | "holder_part" | "machine_part";
    operationId: string;
    moveIndex: number;
    description: string;
  }[];
  /** Near-miss warnings. */
  nearMisses?: {
    distanceMm: number;
    operationId: string;
    moveIndex: number;
  }[];
  /** Over-travel warnings (axis limits exceeded). */
  overTravel?: {
    axis: string;
    position: number;
    limit: number;
    operationId: string;
  }[];
  /** Material removal verification. */
  materialVerification?: {
    remainingStockMm3: number;
    targetAchieved: boolean;
    gougingDetected: boolean;
  };
  /** Simulation time in seconds. */
  simulationTimeSec: number;
}

/**
 * NC generation result.
 */
export interface SprutNCResult {
  /** Generation succeeded. */
  success: boolean;
  /** Path to generated NC file. */
  outputPath?: string;
  /** NC program name. */
  programName?: string;
  /** Post processor used. */
  postProcessor: string;
  /** Line count in generated NC. */
  lineCount: number;
  /** NC code content (if returnNc is true). */
  ncCode?: string;
  /** Warnings during generation. */
  warnings?: string[];
  /** Error message (if failed). */
  error?: string;
}

/**
 * Bridge connection result.
 */
export interface SprutConnectionResult {
  /** Connection succeeded. */
  connected: boolean;
  /** Host address. */
  host: string;
  /** Port number. */
  port: number;
  /** SprutCAM version. */
  sprutcamVersion?: string;
  /** Server version. */
  serverVersion?: string;
  /** Session ID. */
  sessionId?: string;
  /** Latency in ms. */
  latencyMs?: number;
  /** Message. */
  message: string;
}

/**
 * Action result from bridge commands.
 */
export interface SprutActionResult {
  /** Action succeeded. */
  success: boolean;
  /** Action name. */
  action: string;
  /** Result data. */
  data: Record<string, unknown>;
  /** Error message (if failed). */
  error?: string;
  /** Duration in ms. */
  durationMs: number;
  /** Session ID. */
  sessionId?: string;
}

// ─── Helper Types ─────────────────────────────────────────────────────────────

type FetchFn = (
  url: string,
  init?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    signal?: AbortSignal;
  }
) => Promise<{
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
  text(): Promise<string>;
}>;

// ─── Engine Implementation ────────────────────────────────────────────────────

/**
 * SprutCAMBridgeEngine — HTTP client for SprutCAM automation server.
 *
 * Requires the SprutCAM PRISM Bridge add-in running on the target host.
 * The add-in exposes SprutCAM's COM API through HTTP on port 18366.
 */
export class SprutCAMBridgeEngine {
  private _host = "localhost";
  private _port: number;
  private _connected = false;
  private _sessionId: string | undefined;
  private _sprutcamVersion: string | undefined;
  private _serverVersion: string | undefined;
  private _timeoutMs = REQUEST_TIMEOUT_MS;
  private _activeProject: SprutCAMProject | undefined;

  constructor(port: number = SPRUTCAM_DEFAULT_PORT) {
    this._port = port;
  }

  // ── HTTP Helpers ─────────────────────────────────────────────────────────────

  private async _getFetch(): Promise<FetchFn> {
    if (typeof globalThis.fetch === "function") {
      return globalThis.fetch.bind(globalThis) as unknown as FetchFn;
    }
    throw new Error(
      "[SprutCAM] No fetch implementation available. PRISM requires Node 18+ (current runtime is Node 22)."
    );
  }

  private _baseUrl(): string {
    return `http://${this._host}:${this._port}`;
  }

  private async _post(
    path: string,
    body: Record<string, unknown>,
    timeoutMs = this._timeoutMs
  ): Promise<Record<string, unknown>> {
    const fetchFn = await this._getFetch();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetchFn(`${this._baseUrl()}${path}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-PRISM-Client": "E1180",
          ...(this._sessionId ? { "X-Session-Id": this._sessionId } : {}),
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      const raw = await res.text();
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        parsed = { raw_text: raw };
      }
      if (!res.ok) {
        return { error: `HTTP ${res.status}`, detail: parsed };
      }
      return typeof parsed === "object" && parsed !== null
        ? (parsed as Record<string, unknown>)
        : { result: parsed };
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        throw new Error(`[SprutCAM] Request to ${path} timed out after ${timeoutMs}ms`);
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  private async _get(
    path: string,
    timeoutMs = this._timeoutMs
  ): Promise<Record<string, unknown>> {
    const fetchFn = await this._getFetch();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetchFn(`${this._baseUrl()}${path}`, {
        method: "GET",
        headers: {
          "X-PRISM-Client": "E1180",
          ...(this._sessionId ? { "X-Session-Id": this._sessionId } : {}),
        },
        signal: controller.signal,
      });
      const raw = await res.text();
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        parsed = { raw_text: raw };
      }
      if (!res.ok) {
        return { error: `HTTP ${res.status}`, detail: parsed };
      }
      return typeof parsed === "object" && parsed !== null
        ? (parsed as Record<string, unknown>)
        : { result: parsed };
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        throw new Error(`[SprutCAM] GET ${path} timed out after ${timeoutMs}ms`);
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  // ── Connection Management ───────────────────────────────────────────────────

  /**
   * Connect to the SprutCAM automation server.
   * @param host - Host address (default: localhost)
   * @param port - Port number (default: 18366)
   */
  async connect(
    host = "localhost",
    port: number = this._port
  ): Promise<SprutConnectionResult> {
    this._host = host;
    this._port = port;
    const t0 = Date.now();

    try {
      const res = await this._post(
        "/connect",
        {
          client: "PRISM-E1180",
          cam_system: "sprutcam",
        },
        CONNECT_TIMEOUT_MS
      );

      const latencyMs = Date.now() - t0;
      this._connected = !res.error;
      this._sessionId = String(res.session_id ?? res.sessionId ?? "");
      this._sprutcamVersion = String(res.sprutcam_version ?? res.version ?? "unknown");
      this._serverVersion = String(res.server_version ?? "unknown");

      return {
        connected: this._connected,
        host: this._host,
        port: this._port,
        sprutcamVersion: this._sprutcamVersion,
        serverVersion: this._serverVersion,
        sessionId: this._sessionId || undefined,
        latencyMs,
        message: this._connected
          ? `Connected to SprutCAM ${this._sprutcamVersion} at ${host}:${port}`
          : `Connection refused: ${JSON.stringify(res.error ?? res)}`,
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
   * Get server status without establishing a new session.
   */
  async getStatus(): Promise<SprutConnectionResult> {
    const t0 = Date.now();
    try {
      const res = await this._get("/status", CONNECT_TIMEOUT_MS);
      const latencyMs = Date.now() - t0;
      const alive =
        !res.error &&
        (res.status === "ok" || res.running === true || res.alive === true);
      return {
        connected: alive,
        host: this._host,
        port: this._port,
        sprutcamVersion: String(res.sprutcam_version ?? this._sprutcamVersion ?? "unknown"),
        serverVersion: String(res.server_version ?? this._serverVersion ?? "unknown"),
        sessionId: this._sessionId,
        latencyMs,
        message: alive
          ? `SprutCAM server is running (${this._host}:${this._port})`
          : `SprutCAM server not responding: ${JSON.stringify(res)}`,
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
   * Disconnect from the SprutCAM server.
   */
  async disconnect(): Promise<{ disconnected: boolean; message: string }> {
    try {
      await this._post(
        "/disconnect",
        {
          session_id: this._sessionId,
        },
        CONNECT_TIMEOUT_MS
      );
    } catch {
      // Best-effort
    }
    this._connected = false;
    this._sessionId = undefined;
    this._activeProject = undefined;
    return {
      disconnected: true,
      message: `Disconnected from SprutCAM (${this._host}:${this._port})`,
    };
  }

  // ── Project Management ──────────────────────────────────────────────────────

  /**
   * Open a SprutCAM project file (.stc or .stcx).
   * @param projectPath - Path to the SprutCAM project file
   */
  async openProject(projectPath: string): Promise<SprutActionResult & { project?: SprutCAMProject }> {
    const t0 = Date.now();
    try {
      const res = await this._post("/project/open", {
        path: projectPath,
        session_id: this._sessionId,
      });

      if (res.error) {
        return {
          success: false,
          action: "open_project",
          data: res,
          error: String(res.error),
          durationMs: Date.now() - t0,
          sessionId: this._sessionId,
        };
      }

      const project = this._parseProjectResponse(res, projectPath);
      this._activeProject = project;

      return {
        success: true,
        action: "open_project",
        data: res,
        project,
        durationMs: Date.now() - t0,
        sessionId: this._sessionId,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        action: "open_project",
        data: {},
        error: message,
        durationMs: Date.now() - t0,
        sessionId: this._sessionId,
      };
    }
  }

  /**
   * Create a new SprutCAM project.
   * @param params - Project creation parameters
   */
  async createProject(params: {
    name: string;
    machineType: SprutMachineDefinition["type"];
    controller?: string;
    stock?: SprutStock;
    cadFile?: string;
  }): Promise<SprutActionResult & { project?: SprutCAMProject }> {
    const t0 = Date.now();
    try {
      const res = await this._post("/project/create", {
        ...params,
        session_id: this._sessionId,
      });

      if (res.error) {
        return {
          success: false,
          action: "create_project",
          data: res,
          error: String(res.error),
          durationMs: Date.now() - t0,
          sessionId: this._sessionId,
        };
      }

      const project = this._parseProjectResponse(res, String(res.project_path ?? ""));
      this._activeProject = project;

      return {
        success: true,
        action: "create_project",
        data: res,
        project,
        durationMs: Date.now() - t0,
        sessionId: this._sessionId,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        action: "create_project",
        data: {},
        error: message,
        durationMs: Date.now() - t0,
        sessionId: this._sessionId,
      };
    }
  }

  /**
   * Save the current project.
   * @param savePath - Optional new path (save as)
   */
  async saveProject(savePath?: string): Promise<SprutActionResult> {
    const t0 = Date.now();
    try {
      const res = await this._post("/project/save", {
        path: savePath,
        session_id: this._sessionId,
      });

      return {
        success: !res.error,
        action: "save_project",
        data: res,
        error: res.error ? String(res.error) : undefined,
        durationMs: Date.now() - t0,
        sessionId: this._sessionId,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        action: "save_project",
        data: {},
        error: message,
        durationMs: Date.now() - t0,
        sessionId: this._sessionId,
      };
    }
  }

  /**
   * Get the active project data.
   */
  getActiveProject(): SprutCAMProject | undefined {
    return this._activeProject;
  }

  // ── Operation Management ────────────────────────────────────────────────────

  /**
   * Create a new operation in the current project.
   * @param params - Operation parameters
   */
  async createOperation(params: {
    type: SprutOperationType;
    name?: string;
    toolId?: string;
    params?: SprutOperationParams;
    geometrySelection?: {
      faces?: number[];
      edges?: number[];
      bodies?: number[];
    };
  }): Promise<SprutActionResult & { operation?: SprutOperation }> {
    const t0 = Date.now();
    try {
      const res = await this._post("/operation/create", {
        ...params,
        session_id: this._sessionId,
      });

      if (res.error) {
        return {
          success: false,
          action: "create_operation",
          data: res,
          error: String(res.error),
          durationMs: Date.now() - t0,
          sessionId: this._sessionId,
        };
      }

      const operation = this._parseOperationResponse(res);
      if (this._activeProject && operation) {
        this._activeProject.operations.push(operation);
      }

      return {
        success: true,
        action: "create_operation",
        data: res,
        operation,
        durationMs: Date.now() - t0,
        sessionId: this._sessionId,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        action: "create_operation",
        data: {},
        error: message,
        durationMs: Date.now() - t0,
        sessionId: this._sessionId,
      };
    }
  }

  /**
   * Modify operation parameters.
   * @param operationId - Operation ID to modify
   * @param params - Parameters to update
   */
  async modifyOperation(
    operationId: string,
    params: Partial<SprutOperationParams>
  ): Promise<SprutActionResult> {
    const t0 = Date.now();
    try {
      const res = await this._post("/operation/modify", {
        operation_id: operationId,
        params,
        session_id: this._sessionId,
      });

      return {
        success: !res.error,
        action: "modify_operation",
        data: res,
        error: res.error ? String(res.error) : undefined,
        durationMs: Date.now() - t0,
        sessionId: this._sessionId,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        action: "modify_operation",
        data: {},
        error: message,
        durationMs: Date.now() - t0,
        sessionId: this._sessionId,
      };
    }
  }

  /**
   * Calculate toolpath for operations.
   * @param operationIds - Operation IDs to calculate (empty = all)
   */
  async calculateToolpath(operationIds?: string[]): Promise<SprutActionResult> {
    const t0 = Date.now();
    try {
      const res = await this._post("/operation/calculate", {
        operation_ids: operationIds,
        calculate_all: !operationIds?.length,
        session_id: this._sessionId,
      });

      return {
        success: !res.error,
        action: "calculate_toolpath",
        data: res,
        error: res.error ? String(res.error) : undefined,
        durationMs: Date.now() - t0,
        sessionId: this._sessionId,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        action: "calculate_toolpath",
        data: {},
        error: message,
        durationMs: Date.now() - t0,
        sessionId: this._sessionId,
      };
    }
  }

  // ── Tool Management ─────────────────────────────────────────────────────────

  /**
   * Add or update a tool in the project tool library.
   * @param tool - Tool definition
   */
  async addTool(tool: Omit<SprutTool, "id">): Promise<SprutActionResult & { tool?: SprutTool }> {
    const t0 = Date.now();
    try {
      const res = await this._post("/tool/add", {
        ...tool,
        session_id: this._sessionId,
      });

      if (res.error) {
        return {
          success: false,
          action: "add_tool",
          data: res,
          error: String(res.error),
          durationMs: Date.now() - t0,
          sessionId: this._sessionId,
        };
      }

      const addedTool: SprutTool = {
        ...tool,
        id: String(res.tool_id ?? ""),
      };

      if (this._activeProject) {
        this._activeProject.tools.push(addedTool);
      }

      return {
        success: true,
        action: "add_tool",
        data: res,
        tool: addedTool,
        durationMs: Date.now() - t0,
        sessionId: this._sessionId,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        action: "add_tool",
        data: {},
        error: message,
        durationMs: Date.now() - t0,
        sessionId: this._sessionId,
      };
    }
  }

  /**
   * Query tools from the SprutCAM tool library.
   * @param query - Search parameters
   */
  async queryToolLibrary(query: {
    type?: SprutToolType;
    diameterMinMm?: number;
    diameterMaxMm?: number;
    material?: string;
  }): Promise<SprutActionResult & { tools?: SprutTool[] }> {
    const t0 = Date.now();
    try {
      const res = await this._post("/tool/query", {
        ...query,
        session_id: this._sessionId,
      });

      if (res.error) {
        return {
          success: false,
          action: "query_tool_library",
          data: res,
          error: String(res.error),
          durationMs: Date.now() - t0,
          sessionId: this._sessionId,
        };
      }

      const tools = Array.isArray(res.tools)
        ? (res.tools as SprutTool[])
        : [];

      return {
        success: true,
        action: "query_tool_library",
        data: res,
        tools,
        durationMs: Date.now() - t0,
        sessionId: this._sessionId,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        action: "query_tool_library",
        data: {},
        error: message,
        durationMs: Date.now() - t0,
        sessionId: this._sessionId,
      };
    }
  }

  // ── Simulation ──────────────────────────────────────────────────────────────

  /**
   * Run machine simulation with collision detection.
   * @param params - Simulation parameters
   */
  async runSimulation(params?: {
    operationIds?: string[];
    mode?: "fast" | "normal" | "detailed";
    nearMissDistanceMm?: number;
    checkToolHolder?: boolean;
    checkFixtures?: boolean;
  }): Promise<SprutActionResult & { result?: SprutSimulationResult }> {
    const t0 = Date.now();
    try {
      const res = await this._post(
        "/simulation/run",
        {
          ...params,
          session_id: this._sessionId,
        },
        SIMULATION_TIMEOUT_MS
      );

      if (res.error) {
        return {
          success: false,
          action: "run_simulation",
          data: res,
          error: String(res.error),
          durationMs: Date.now() - t0,
          sessionId: this._sessionId,
        };
      }

      const result = this._parseSimulationResult(res);

      return {
        success: true,
        action: "run_simulation",
        data: res,
        result,
        durationMs: Date.now() - t0,
        sessionId: this._sessionId,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        action: "run_simulation",
        data: {},
        error: message,
        durationMs: Date.now() - t0,
        sessionId: this._sessionId,
      };
    }
  }

  // ── NC Generation ───────────────────────────────────────────────────────────

  /**
   * Generate NC code via post processor.
   * @param params - NC generation parameters
   */
  async generateNC(params: {
    operationIds?: string[];
    postProcessor: string;
    outputFolder: string;
    programName?: string;
    outputUnits?: "mm" | "inch";
    returnNc?: boolean;
    splitByTool?: boolean;
  }): Promise<SprutActionResult & { ncResult?: SprutNCResult }> {
    const t0 = Date.now();
    try {
      const res = await this._post("/nc/generate", {
        ...params,
        session_id: this._sessionId,
      });

      if (res.error) {
        return {
          success: false,
          action: "generate_nc",
          data: res,
          error: String(res.error),
          durationMs: Date.now() - t0,
          sessionId: this._sessionId,
        };
      }

      const ncResult: SprutNCResult = {
        success: true,
        outputPath: String(res.output_path ?? ""),
        programName: String(res.program_name ?? params.programName ?? ""),
        postProcessor: params.postProcessor,
        lineCount: Number(res.line_count ?? 0),
        ncCode: params.returnNc ? String(res.nc_code ?? "") : undefined,
        warnings: Array.isArray(res.warnings)
          ? res.warnings.map(String)
          : undefined,
      };

      return {
        success: true,
        action: "generate_nc",
        data: res,
        ncResult,
        durationMs: Date.now() - t0,
        sessionId: this._sessionId,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        action: "generate_nc",
        data: {},
        error: message,
        durationMs: Date.now() - t0,
        sessionId: this._sessionId,
      };
    }
  }

  /**
   * List available post processors.
   */
  async listPostProcessors(): Promise<SprutActionResult & { postProcessors?: string[] }> {
    const t0 = Date.now();
    try {
      const res = await this._get("/nc/postprocessors");

      if (res.error) {
        return {
          success: false,
          action: "list_postprocessors",
          data: res,
          error: String(res.error),
          durationMs: Date.now() - t0,
          sessionId: this._sessionId,
        };
      }

      const postProcessors = Array.isArray(res.post_processors)
        ? res.post_processors.map(String)
        : [];

      return {
        success: true,
        action: "list_postprocessors",
        data: res,
        postProcessors,
        durationMs: Date.now() - t0,
        sessionId: this._sessionId,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        action: "list_postprocessors",
        data: {},
        error: message,
        durationMs: Date.now() - t0,
        sessionId: this._sessionId,
      };
    }
  }

  // ── Robot Configuration ─────────────────────────────────────────────────────

  /**
   * Configure robot machining settings (SprutCAM Robot module).
   * @param config - Robot configuration
   */
  async configureRobot(config: SprutRobotConfig): Promise<SprutActionResult> {
    const t0 = Date.now();
    try {
      const res = await this._post("/robot/configure", {
        ...config,
        session_id: this._sessionId,
      });

      if (!res.error && this._activeProject) {
        this._activeProject.robotSupport = true;
        this._activeProject.robotConfig = config;
      }

      return {
        success: !res.error,
        action: "configure_robot",
        data: res,
        error: res.error ? String(res.error) : undefined,
        durationMs: Date.now() - t0,
        sessionId: this._sessionId,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        action: "configure_robot",
        data: {},
        error: message,
        durationMs: Date.now() - t0,
        sessionId: this._sessionId,
      };
    }
  }

  /**
   * Check robot reachability for the current toolpath.
   */
  async checkRobotReachability(): Promise<
    SprutActionResult & {
      reachable?: boolean;
      unreachablePoints?: { index: number; reason: string }[];
      singularityWarnings?: { index: number; type: string }[];
    }
  > {
    const t0 = Date.now();
    try {
      const res = await this._post("/robot/reachability", {
        session_id: this._sessionId,
      });

      if (res.error) {
        return {
          success: false,
          action: "check_reachability",
          data: res,
          error: String(res.error),
          durationMs: Date.now() - t0,
          sessionId: this._sessionId,
        };
      }

      return {
        success: true,
        action: "check_reachability",
        data: res,
        reachable: Boolean(res.reachable),
        unreachablePoints: Array.isArray(res.unreachable_points)
          ? (res.unreachable_points as { index: number; reason: string }[])
          : undefined,
        singularityWarnings: Array.isArray(res.singularity_warnings)
          ? (res.singularity_warnings as { index: number; type: string }[])
          : undefined,
        durationMs: Date.now() - t0,
        sessionId: this._sessionId,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        action: "check_reachability",
        data: {},
        error: message,
        durationMs: Date.now() - t0,
        sessionId: this._sessionId,
      };
    }
  }

  // ── Mill-Turn Configuration ─────────────────────────────────────────────────

  /**
   * Configure mill-turn/Swiss-type settings.
   * @param config - Mill-turn configuration
   */
  async configureMillTurn(config: SprutMillTurnConfig): Promise<SprutActionResult> {
    const t0 = Date.now();
    try {
      const res = await this._post("/millturn/configure", {
        ...config,
        session_id: this._sessionId,
      });

      if (!res.error && this._activeProject) {
        this._activeProject.millTurnConfig = config;
      }

      return {
        success: !res.error,
        action: "configure_millturn",
        data: res,
        error: res.error ? String(res.error) : undefined,
        durationMs: Date.now() - t0,
        sessionId: this._sessionId,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        action: "configure_millturn",
        data: {},
        error: message,
        durationMs: Date.now() - t0,
        sessionId: this._sessionId,
      };
    }
  }

  /**
   * Create sub-spindle transfer operation.
   * @param params - Transfer parameters
   */
  async createSubSpindleTransfer(params: {
    transferPoint: { x: number; z: number };
    mainSpindleSpeed: number;
    subSpindleSpeed: number;
    syncMode: "match" | "async";
    gripperSequence: ("open" | "close" | "wait")[];
  }): Promise<SprutActionResult> {
    const t0 = Date.now();
    try {
      const res = await this._post("/millturn/transfer", {
        ...params,
        session_id: this._sessionId,
      });

      return {
        success: !res.error,
        action: "create_transfer",
        data: res,
        error: res.error ? String(res.error) : undefined,
        durationMs: Date.now() - t0,
        sessionId: this._sessionId,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        action: "create_transfer",
        data: {},
        error: message,
        durationMs: Date.now() - t0,
        sessionId: this._sessionId,
      };
    }
  }

  // ── Wire EDM Configuration ──────────────────────────────────────────────────

  /**
   * Configure wire EDM settings.
   * @param config - Wire EDM configuration
   */
  async configureWireEdm(config: SprutWireEdmConfig): Promise<SprutActionResult> {
    const t0 = Date.now();
    try {
      const res = await this._post("/wireedm/configure", {
        ...config,
        session_id: this._sessionId,
      });

      if (!res.error && this._activeProject) {
        this._activeProject.wireEdmConfig = config;
      }

      return {
        success: !res.error,
        action: "configure_wireedm",
        data: res,
        error: res.error ? String(res.error) : undefined,
        durationMs: Date.now() - t0,
        sessionId: this._sessionId,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        action: "configure_wireedm",
        data: {},
        error: message,
        durationMs: Date.now() - t0,
        sessionId: this._sessionId,
      };
    }
  }

  /**
   * Create wire EDM cutting operation.
   * @param params - Wire EDM operation parameters
   */
  async createWireEdmOperation(params: {
    type: "wire_edm_profile" | "wire_edm_taper" | "wire_edm_no_core";
    topContour?: { x: number; y: number }[];
    bottomContour?: { x: number; y: number }[];
    taperAngleDeg?: number;
    skimCuts?: number;
    roughWireOffsetMm?: number;
    skimWireOffsetMm?: number;
    noCoreTabsMm?: number;
  }): Promise<SprutActionResult & { operation?: SprutOperation }> {
    const t0 = Date.now();
    try {
      const res = await this._post("/wireedm/operation", {
        ...params,
        session_id: this._sessionId,
      });

      if (res.error) {
        return {
          success: false,
          action: "create_wireedm_operation",
          data: res,
          error: String(res.error),
          durationMs: Date.now() - t0,
          sessionId: this._sessionId,
        };
      }

      const operation = this._parseOperationResponse(res);

      return {
        success: true,
        action: "create_wireedm_operation",
        data: res,
        operation,
        durationMs: Date.now() - t0,
        sessionId: this._sessionId,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        action: "create_wireedm_operation",
        data: {},
        error: message,
        durationMs: Date.now() - t0,
        sessionId: this._sessionId,
      };
    }
  }

  // ── Machine Definition ──────────────────────────────────────────────────────

  /**
   * Set machine definition with kinematic chain.
   * @param machine - Machine definition
   */
  async setMachineDefinition(machine: SprutMachineDefinition): Promise<SprutActionResult> {
    const t0 = Date.now();
    try {
      const res = await this._post("/machine/define", {
        ...machine,
        session_id: this._sessionId,
      });

      if (!res.error && this._activeProject) {
        this._activeProject.machineDefinition = machine;
      }

      return {
        success: !res.error,
        action: "set_machine_definition",
        data: res,
        error: res.error ? String(res.error) : undefined,
        durationMs: Date.now() - t0,
        sessionId: this._sessionId,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        action: "set_machine_definition",
        data: {},
        error: message,
        durationMs: Date.now() - t0,
        sessionId: this._sessionId,
      };
    }
  }

  /**
   * List available machine definitions.
   */
  async listMachineDefinitions(): Promise<
    SprutActionResult & { machines?: { name: string; type: string; controller: string }[] }
  > {
    const t0 = Date.now();
    try {
      const res = await this._get("/machine/list");

      if (res.error) {
        return {
          success: false,
          action: "list_machines",
          data: res,
          error: String(res.error),
          durationMs: Date.now() - t0,
          sessionId: this._sessionId,
        };
      }

      const machines = Array.isArray(res.machines)
        ? (res.machines as { name: string; type: string; controller: string }[])
        : [];

      return {
        success: true,
        action: "list_machines",
        data: res,
        machines,
        durationMs: Date.now() - t0,
        sessionId: this._sessionId,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        action: "list_machines",
        data: {},
        error: message,
        durationMs: Date.now() - t0,
        sessionId: this._sessionId,
      };
    }
  }

  // ── IPW (In-Process Workpiece) ──────────────────────────────────────────────

  /**
   * Export IPW (In-Process Workpiece) as STL.
   * @param params - Export parameters
   */
  async exportIPW(params: {
    afterOperationId?: string;
    outputPath: string;
    resolutionMm?: number;
  }): Promise<SprutActionResult & { stlPath?: string }> {
    const t0 = Date.now();
    try {
      const res = await this._post("/ipw/export", {
        ...params,
        session_id: this._sessionId,
      });

      if (res.error) {
        return {
          success: false,
          action: "export_ipw",
          data: res,
          error: String(res.error),
          durationMs: Date.now() - t0,
          sessionId: this._sessionId,
        };
      }

      return {
        success: true,
        action: "export_ipw",
        data: res,
        stlPath: String(res.stl_path ?? params.outputPath),
        durationMs: Date.now() - t0,
        sessionId: this._sessionId,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        action: "export_ipw",
        data: {},
        error: message,
        durationMs: Date.now() - t0,
        sessionId: this._sessionId,
      };
    }
  }

  // ── Private Parsers ─────────────────────────────────────────────────────────

  private _parseProjectResponse(
    res: Record<string, unknown>,
    projectPath: string
  ): SprutCAMProject {
    return {
      projectPath,
      version: String(res.version ?? res.sprutcam_version ?? "unknown"),
      machineSimulation: Boolean(res.machine_simulation ?? res.simulation_enabled),
      operations: Array.isArray(res.operations)
        ? (res.operations as SprutOperation[])
        : [],
      tools: Array.isArray(res.tools) ? (res.tools as SprutTool[]) : [],
      robotSupport: Boolean(res.robot_support ?? res.has_robot),
      robotConfig: res.robot_config as SprutRobotConfig | undefined,
      millTurnConfig: res.millturn_config as SprutMillTurnConfig | undefined,
      wireEdmConfig: res.wireedm_config as SprutWireEdmConfig | undefined,
      machineDefinition: res.machine_definition as SprutMachineDefinition | undefined,
      stock: res.stock as SprutStock | undefined,
      fixtures: Array.isArray(res.fixtures)
        ? (res.fixtures as SprutFixture[])
        : undefined,
    };
  }

  private _parseOperationResponse(res: Record<string, unknown>): SprutOperation | undefined {
    if (!res.operation_id && !res.id) return undefined;
    return {
      id: String(res.operation_id ?? res.id ?? ""),
      name: String(res.name ?? res.operation_name ?? ""),
      type: (res.type ?? res.operation_type ?? "adaptive_roughing") as SprutOperationType,
      toolId: res.tool_id ? String(res.tool_id) : undefined,
      params: (res.params ?? {}) as SprutOperationParams,
      status: (res.status ?? "pending") as SprutOperation["status"],
      cycleTimeSec: res.cycle_time_sec ? Number(res.cycle_time_sec) : undefined,
      toolpathStats: res.toolpath_stats as SprutToolpathStats | undefined,
    };
  }

  private _parseSimulationResult(res: Record<string, unknown>): SprutSimulationResult {
    return {
      passed: Boolean(res.passed ?? res.success),
      collisionDetected: Boolean(res.collision_detected ?? res.collisions),
      collisions: Array.isArray(res.collisions)
        ? (res.collisions as SprutSimulationResult["collisions"])
        : undefined,
      nearMisses: Array.isArray(res.near_misses)
        ? (res.near_misses as SprutSimulationResult["nearMisses"])
        : undefined,
      overTravel: Array.isArray(res.over_travel)
        ? (res.over_travel as SprutSimulationResult["overTravel"])
        : undefined,
      materialVerification: res.material_verification as SprutSimulationResult["materialVerification"],
      simulationTimeSec: Number(res.simulation_time_sec ?? res.duration_sec ?? 0),
    };
  }
}

// ─── Singleton Export ──────────────────────────────────────────────────────────

/**
 * Singleton instance of SprutCAMBridgeEngine.
 * Use this for all SprutCAM automation operations.
 */
export const sprutCAMBridgeEngine = new SprutCAMBridgeEngine();
