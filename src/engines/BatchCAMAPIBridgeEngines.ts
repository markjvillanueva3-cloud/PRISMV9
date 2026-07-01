// @ts-nocheck
/**
 * BatchCAMAPIBridgeEngines — 4 CAM HTTP API Bridge Engines in One File (E1144)
 *
 * Each engine is a PRISM-side HTTP client that communicates with a running CAM
 * system instance through a local add-in/plugin HTTP server.  The companion
 * server-side components (CHook server, SolidWorks API server, NXOpen server,
 * hyperMILL AC server) must already be running on the target host before any
 * action can succeed.
 *
 * Engines:
 *   MastercamNETBridgeEngine      — Port 18362  (.NET CHook API server)
 *   SolidCAMSolidWorksBridgeEngine — Port 18363 (SolidWorks API server)
 *   NXOpenBridgeEngine            — Port 18364  (NXOpen Python API server)
 *   HyperMillACBridgeEngine       — Port 18365  (hyperMILL Automation Center)
 *
 * Methods per engine:
 *   connect(host, port)           — test connection to CAM server
 *   getStatus()                   — is the CAM system running and connected?
 *   executeAction(action, params) — dispatch a named action to the CAM server
 *   listActions()                 — enumerate all supported actions
 *   disconnect()                  — clean up connection state
 *
 * @engine BatchCAMAPIBridgeEngines
 * @shortcode E1144
 * @dispatcher camDispatcher
 * @actions
 *   mastercam_api_connect, mastercam_api_execute,
 *   solidcam_api_connect, solidcam_api_execute,
 *   nxopen_api_connect, nxopen_api_execute,
 *   hypermill_ac_connect, hypermill_ac_execute
 * @milestone CAMX-MS12/U01
 */

// ─── Shared Types ─────────────────────────────────────────────────────────────

/** Result returned by any bridge connect() or getStatus() call */
export interface BridgeConnectionResult {
  connected: boolean;
  host: string;
  port: number;
  cam_system: string;
  server_version?: string;
  session_id?: string;
  message: string;
  latency_ms?: number;
}

/** Result returned by any bridge executeAction() call */
export interface BridgeActionResult {
  success: boolean;
  cam_system: string;
  action: string;
  data: Record<string, unknown>;
  error?: string;
  duration_ms: number;
  session_id?: string;
}

/** Minimal fetch-compatible interface so the class can use Node fetch or a polyfill */
type FetchFn = (url: string, init?: {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  signal?: AbortSignal;
}) => Promise<{ ok: boolean; status: number; json(): Promise<unknown>; text(): Promise<string> }>;

// ─── Shared Base Class ────────────────────────────────────────────────────────

/**
 * CAMAPIBridgeBase — base class shared by all four bridge engines.
 *
 * Handles HTTP transport, connection state, session management, and generic
 * command dispatch.  Subclasses declare their default port and action list.
 */
abstract class CAMAPIBridgeBase {
  readonly camSystem: string;
  protected readonly defaultPort: number;
  protected abstract readonly supportedActions: readonly string[];

  protected _host = "localhost";
  protected _port: number;
  protected _connected = false;
  protected _sessionId: string | undefined;
  protected _serverVersion: string | undefined;
  protected _timeoutMs = 10_000;

  constructor(camSystem: string, defaultPort: number) {
    this.camSystem = camSystem;
    this.defaultPort = defaultPort;
    this._port = defaultPort;
  }

  // ── HTTP helpers ────────────────────────────────────────────────────────────

  /** Resolve Node 18+ native fetch or fall back to require('node-fetch'). */
  protected async _getFetch(): Promise<FetchFn> {
    if (typeof globalThis.fetch === "function") {
      return globalThis.fetch.bind(globalThis) as unknown as FetchFn;
    }
    try {
      const mod = await import("node-fetch");
      return (mod.default ?? mod) as unknown as FetchFn;
    } catch {
      throw new Error(
        `[${this.camSystem}] No fetch implementation available. ` +
        "Upgrade to Node 18+ or install node-fetch."
      );
    }
  }

  /** Base URL for this bridge's HTTP server. */
  protected _baseUrl(): string {
    return `http://${this._host}:${this._port}`;
  }

  /**
   * Core HTTP POST helper.
   * Throws on network errors; returns parsed JSON body on success.
   * Returns { error } shape on non-2xx responses.
   */
  protected async _post(
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
        headers: { "Content-Type": "application/json", "X-PRISM-Client": "E1144" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      const raw = await res.text();
      let parsed: unknown;
      try { parsed = JSON.parse(raw); } catch { parsed = { raw_text: raw }; }
      if (!res.ok) {
        return { error: `HTTP ${res.status}`, detail: parsed };
      }
      return (typeof parsed === "object" && parsed !== null)
        ? parsed as Record<string, unknown>
        : { result: parsed };
    } catch (err: any) {
      if (err?.name === "AbortError") {
        throw new Error(`[${this.camSystem}] Request to ${path} timed out after ${timeoutMs}ms`);
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  /** HTTP GET helper for lightweight status probes. */
  protected async _get(
    path: string,
    timeoutMs = this._timeoutMs
  ): Promise<Record<string, unknown>> {
    const fetchFn = await this._getFetch();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetchFn(`${this._baseUrl()}${path}`, {
        method: "GET",
        headers: { "X-PRISM-Client": "E1144" },
        signal: controller.signal,
      });
      const raw = await res.text();
      let parsed: unknown;
      try { parsed = JSON.parse(raw); } catch { parsed = { raw_text: raw }; }
      if (!res.ok) return { error: `HTTP ${res.status}`, detail: parsed };
      return (typeof parsed === "object" && parsed !== null)
        ? parsed as Record<string, unknown>
        : { result: parsed };
    } catch (err: any) {
      if (err?.name === "AbortError") {
        throw new Error(`[${this.camSystem}] GET ${path} timed out after ${timeoutMs}ms`);
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  /**
   * connect() — establish a session with the CAM HTTP server.
   * Stores host/port for subsequent calls.  Safe to call repeatedly.
   */
  async connect(
    host = "localhost",
    port: number = this.defaultPort
  ): Promise<BridgeConnectionResult> {
    this._host = host;
    this._port = port;
    const t0 = Date.now();

    try {
      const res = await this._post("/connect", {
        client: "PRISM-E1144",
        cam_system: this.camSystem,
      }, 5_000);

      const latency_ms = Date.now() - t0;
      this._connected = !res.error;
      this._sessionId = String(res.session_id ?? res.sessionId ?? "");
      this._serverVersion = String(res.version ?? res.server_version ?? "unknown");

      return {
        connected: this._connected,
        host: this._host,
        port: this._port,
        cam_system: this.camSystem,
        server_version: this._serverVersion,
        session_id: this._sessionId || undefined,
        latency_ms,
        message: this._connected
          ? `Connected to ${this.camSystem} server at ${host}:${port}`
          : `Connection refused: ${JSON.stringify(res.error ?? res)}`,
      };
    } catch (err: any) {
      this._connected = false;
      return {
        connected: false,
        host,
        port,
        cam_system: this.camSystem,
        message: `Failed to connect: ${err?.message ?? String(err)}`,
      };
    }
  }

  /**
   * getStatus() — lightweight health-check without starting a new session.
   * Does not mutate _connected; callers should call connect() first.
   */
  async getStatus(): Promise<BridgeConnectionResult> {
    const t0 = Date.now();
    try {
      const res = await this._get("/status", 3_000);
      const latency_ms = Date.now() - t0;
      const alive = !res.error && (res.status === "ok" || res.running === true || res.alive === true);
      return {
        connected: alive,
        host: this._host,
        port: this._port,
        cam_system: this.camSystem,
        server_version: String(res.version ?? res.server_version ?? this._serverVersion ?? "unknown"),
        session_id: this._sessionId,
        latency_ms,
        message: alive
          ? `${this.camSystem} server is running (${this._host}:${this._port})`
          : `${this.camSystem} server not responding: ${JSON.stringify(res)}`,
      };
    } catch (err: any) {
      return {
        connected: false,
        host: this._host,
        port: this._port,
        cam_system: this.camSystem,
        message: `Status check failed: ${err?.message ?? String(err)}`,
      };
    }
  }

  /**
   * disconnect() — clean up session.  Sends a best-effort disconnect request
   * and resets local state regardless of server response.
   */
  async disconnect(): Promise<{ disconnected: boolean; message: string }> {
    try {
      await this._post("/disconnect", {
        session_id: this._sessionId,
        cam_system: this.camSystem,
      }, 3_000);
    } catch { /* best-effort */ }
    this._connected = false;
    this._sessionId = undefined;
    return {
      disconnected: true,
      message: `Disconnected from ${this.camSystem} (${this._host}:${this._port})`,
    };
  }

  /**
   * sendCommand() — generic low-level command sender.
   * Wraps _post() with session ID injection and standard error shape.
   */
  async sendCommand(
    action: string,
    params: Record<string, unknown> = {}
  ): Promise<Record<string, unknown>> {
    return this._post("/command", {
      action,
      params,
      session_id: this._sessionId,
      cam_system: this.camSystem,
    });
  }

  /**
   * executeAction() — dispatch a named action supported by this engine.
   * Returns a BridgeActionResult with timing and error normalisation.
   */
  async executeAction(
    action: string,
    params: Record<string, unknown> = {}
  ): Promise<BridgeActionResult> {
    const t0 = Date.now();

    if (!this.supportedActions.includes(action)) {
      return {
        success: false,
        cam_system: this.camSystem,
        action,
        data: {},
        error: `Action "${action}" not supported by ${this.camSystem}. Supported: ${this.supportedActions.join(", ")}`,
        duration_ms: 0,
        session_id: this._sessionId,
      };
    }

    try {
      const res = await this.sendCommand(action, params);
      const duration_ms = Date.now() - t0;

      if (res.error) {
        return {
          success: false,
          cam_system: this.camSystem,
          action,
          data: res,
          error: String(res.error),
          duration_ms,
          session_id: this._sessionId,
        };
      }

      return {
        success: true,
        cam_system: this.camSystem,
        action,
        data: res,
        duration_ms,
        session_id: this._sessionId,
      };
    } catch (err: any) {
      return {
        success: false,
        cam_system: this.camSystem,
        action,
        data: {},
        error: err?.message ?? String(err),
        duration_ms: Date.now() - t0,
        session_id: this._sessionId,
      };
    }
  }

  /** listActions() — return the set of actions supported by this engine. */
  listActions(): { cam_system: string; actions: readonly string[]; count: number } {
    return {
      cam_system: this.camSystem,
      actions: this.supportedActions,
      count: this.supportedActions.length,
    };
  }
}

// ─── Engine 1: MastercamNETBridgeEngine ───────────────────────────────────────

/**
 * MastercamNETBridgeEngine (Port 18362)
 *
 * HTTP bridge to Mastercam via the .NET CHook API server.  The companion
 * server (Mastercam.PrismBridge.exe or similar) must be loaded as a C-Hook
 * add-in and will be listening on port 18362.
 *
 * Supported actions:
 *   create_operation       — create a new toolpath operation in the active file
 *   modify_parameters      — modify parameters on an existing operation
 *   regenerate_toolpath    — regenerate (recalculate) selected operations
 *   access_stock_model     — read or update the stock model geometry
 *   query_tool_library     — query the Mastercam tool library
 *   run_post_processor     — run the active post processor and emit NC code
 *   batch_operations       — execute a batch of operations in sequence
 *   get_machine_group      — retrieve machine group properties and settings
 */
export class MastercamNETBridgeEngine extends CAMAPIBridgeBase {
  protected readonly supportedActions = [
    "create_operation",
    "modify_parameters",
    "regenerate_toolpath",
    "access_stock_model",
    "query_tool_library",
    "run_post_processor",
    "batch_operations",
    "get_machine_group",
  ] as const;

  constructor() {
    super("mastercam", 18362);
  }

  // ── Action-specific convenience wrappers ─────────────────────────────────

  /** Create a new toolpath operation. */
  async createOperation(params: {
    operation_type: string;   // "contour" | "pocket" | "drill" | "surface_rough" | ...
    tool_number?: number;
    tool_diameter_mm?: number;
    cut_depth_mm?: number;
    stepover_pct?: number;
    spindle_rpm?: number;
    feed_mmpm?: number;
    geometry_ids?: string[];  // Mastercam geometry selection IDs
    machine_group?: number;
    [key: string]: unknown;
  }): Promise<BridgeActionResult> {
    return this.executeAction("create_operation", params);
  }

  /** Modify parameters on an existing operation by ID or index. */
  async modifyParameters(params: {
    operation_id?: string;
    operation_index?: number;
    changes: Record<string, unknown>;
  }): Promise<BridgeActionResult> {
    return this.executeAction("modify_parameters", params);
  }

  /** Regenerate toolpath for one or more operations. */
  async regenerateToolpath(params: {
    operation_ids?: string[];
    all?: boolean;
    verify?: boolean;
  }): Promise<BridgeActionResult> {
    return this.executeAction("regenerate_toolpath", params);
  }

  /** Read or update the stock model. */
  async accessStockModel(params: {
    mode: "read" | "update" | "reset";
    stock_type?: "bounding_box" | "cylinder" | "stl" | "solid";
    dimensions?: Record<string, number>;
    stl_path?: string;
  }): Promise<BridgeActionResult> {
    return this.executeAction("access_stock_model", params);
  }

  /** Query the Mastercam tool library. */
  async queryToolLibrary(params: {
    tool_type?: string;
    diameter_min_mm?: number;
    diameter_max_mm?: number;
    material?: string;
    library_path?: string;
    query?: string;
  }): Promise<BridgeActionResult> {
    return this.executeAction("query_tool_library", params);
  }

  /** Run the post processor and return NC code or save to file. */
  async runPostProcessor(params: {
    operations?: string[];
    post_name?: string;
    output_path?: string;
    machine_group?: number;
    return_nc?: boolean;
  }): Promise<BridgeActionResult> {
    return this.executeAction("run_post_processor", params);
  }

  /** Execute a batch of operations in sequence. */
  async batchOperations(params: {
    operations: Array<{ action: string; params: Record<string, unknown> }>;
    stop_on_error?: boolean;
  }): Promise<BridgeActionResult> {
    return this.executeAction("batch_operations", params);
  }

  /** Get machine group properties. */
  async getMachineGroup(params: {
    group_index?: number;
    include_tools?: boolean;
    include_stock?: boolean;
  }): Promise<BridgeActionResult> {
    return this.executeAction("get_machine_group", params);
  }
}

// ─── Engine 2: SolidCAMSolidWorksBridgeEngine ─────────────────────────────────

/**
 * SolidCAMSolidWorksBridgeEngine (Port 18363)
 *
 * HTTP bridge to SolidCAM via the SolidWorks API server.  Requires the
 * PRISM bridge add-in registered as a SolidWorks macro or stand-alone
 * API server on port 18363.
 *
 * Supported actions:
 *   create_operation             — create a new SolidCAM operation
 *   modify_imachining_params     — adjust iMachining Technology Wizard settings
 *   set_technology_wizard_level  — set the iMachining technology level
 *   access_tool_table            — query or update the SolidCAM tool table
 *   run_gpp_post                 — run the GPP post processor
 *   get_solidworks_model_info    — retrieve geometry and feature data from SW
 */
export class SolidCAMSolidWorksBridgeEngine extends CAMAPIBridgeBase {
  protected readonly supportedActions = [
    "create_operation",
    "modify_imachining_params",
    "set_technology_wizard_level",
    "access_tool_table",
    "run_gpp_post",
    "get_solidworks_model_info",
  ] as const;

  constructor() {
    super("solidcam", 18363);
  }

  // ── Action-specific convenience wrappers ─────────────────────────────────

  /** Create a new SolidCAM operation on the active CAM part. */
  async createOperation(params: {
    operation_type: string;   // "iMachining2D" | "iMachining3D" | "Profile" | "Pocket" | ...
    tool_id?: number;
    geometry?: Record<string, unknown>;
    cam_part_name?: string;
    [key: string]: unknown;
  }): Promise<BridgeActionResult> {
    return this.executeAction("create_operation", params);
  }

  /** Adjust iMachining Technology Wizard parameters. */
  async modifyIMachiningParams(params: {
    operation_id?: string;
    cutting_conditions?: "recommended" | "aggressive" | "conservative" | "custom";
    morphic_factor?: number;
    chip_thinning?: boolean;
    tool_engagement_angle?: number;
    [key: string]: unknown;
  }): Promise<BridgeActionResult> {
    return this.executeAction("modify_imachining_params", params);
  }

  /** Set the iMachining Technology Wizard level. */
  async setTechnologyWizardLevel(params: {
    operation_id?: string;
    level: number;  // 1–10 in SolidCAM's wizard scale
    apply_to_all?: boolean;
  }): Promise<BridgeActionResult> {
    return this.executeAction("set_technology_wizard_level", params);
  }

  /** Query or update the SolidCAM tool table. */
  async accessToolTable(params: {
    mode: "read" | "add" | "update" | "delete";
    tool_id?: number;
    tool_data?: Record<string, unknown>;
    filter?: Record<string, unknown>;
  }): Promise<BridgeActionResult> {
    return this.executeAction("access_tool_table", params);
  }

  /** Run the GPP post processor and return NC code. */
  async runGPPPost(params: {
    machine_name?: string;
    operations?: string[];
    output_path?: string;
    return_nc?: boolean;
    controller?: string;
  }): Promise<BridgeActionResult> {
    return this.executeAction("run_gpp_post", params);
  }

  /** Retrieve SolidWorks model geometry and feature info. */
  async getSolidWorksModelInfo(params: {
    include_bodies?: boolean;
    include_features?: boolean;
    include_dimensions?: boolean;
    active_config?: boolean;
  }): Promise<BridgeActionResult> {
    return this.executeAction("get_solidworks_model_info", params);
  }
}

// ─── Engine 3: NXOpenBridgeEngine ─────────────────────────────────────────────

/**
 * NXOpenBridgeEngine (Port 18364)
 *
 * HTTP bridge to Siemens NX via the NXOpen Python API server.  The companion
 * server is a Python script that uses the NXOpen API to drive NX Manufacturing
 * and exposes a REST-ish HTTP interface on port 18364.
 *
 * Supported actions:
 *   create_operation    — create a new NX Manufacturing operation
 *   configure_ipw       — configure In-Process Workpiece (IPW) settings
 *   run_fbm             — run Feature-Based Machining (FBM) recognition
 *   modify_cutting_data — update cutting parameters for an operation
 *   regenerate_toolpath — regenerate selected operations
 *   post_process        — run post processing for selected operations
 *   query_tool_library  — query the NX tool library / tool catalog
 */
export class NXOpenBridgeEngine extends CAMAPIBridgeBase {
  protected readonly supportedActions = [
    "create_operation",
    "configure_ipw",
    "run_fbm",
    "modify_cutting_data",
    "regenerate_toolpath",
    "post_process",
    "query_tool_library",
  ] as const;

  constructor() {
    super("nxopen", 18364);
  }

  // ── Action-specific convenience wrappers ─────────────────────────────────

  /** Create a new NX Manufacturing operation. */
  async createOperation(params: {
    operation_type: string;  // "CAVITY_MILL" | "ZLEVEL_PROFILE" | "CONTOUR_AREA" | "DRILL" | ...
    program_name?: string;
    tool_name?: string;
    method?: string;
    geometry_group?: string;
    [key: string]: unknown;
  }): Promise<BridgeActionResult> {
    return this.executeAction("create_operation", params);
  }

  /** Configure the In-Process Workpiece (IPW). */
  async configureIPW(params: {
    mode: "blank" | "reference_tool" | "3d_ipw";
    reference_tool_name?: string;
    ipw_geometry?: Record<string, unknown>;
    update_all?: boolean;
  }): Promise<BridgeActionResult> {
    return this.executeAction("configure_ipw", params);
  }

  /** Run Feature-Based Machining recognition on the active part. */
  async runFBM(params: {
    feature_types?: string[];  // "HOLE" | "POCKET" | "SLOT" | "BOSS" | ...
    machine_template?: string;
    auto_generate?: boolean;
    geometry_filter?: Record<string, unknown>;
  }): Promise<BridgeActionResult> {
    return this.executeAction("run_fbm", params);
  }

  /** Modify cutting data for an existing operation. */
  async modifyCuttingData(params: {
    operation_name?: string;
    spindle_speed_rpm?: number;
    feed_rate_mmpm?: number;
    cut_depth_mm?: number;
    stepover_mm?: number;
    [key: string]: unknown;
  }): Promise<BridgeActionResult> {
    return this.executeAction("modify_cutting_data", params);
  }

  /** Regenerate toolpath for one or more operations. */
  async regenerateToolpath(params: {
    operation_names?: string[];
    program_name?: string;
    verify?: boolean;
  }): Promise<BridgeActionResult> {
    return this.executeAction("regenerate_toolpath", params);
  }

  /** Run post processing and return NC code. */
  async postProcess(params: {
    operation_names?: string[];
    post_name?: string;
    output_path?: string;
    return_nc?: boolean;
    machine_code?: string;
  }): Promise<BridgeActionResult> {
    return this.executeAction("post_process", params);
  }

  /** Query the NX tool library. */
  async queryToolLibrary(params: {
    tool_type?: string;
    diameter_min_mm?: number;
    diameter_max_mm?: number;
    library_name?: string;
    query?: string;
  }): Promise<BridgeActionResult> {
    return this.executeAction("query_tool_library", params);
  }
}

// ─── Engine 4: HyperMillACBridgeEngine ────────────────────────────────────────

/**
 * HyperMillACBridgeEngine (Port 18365)
 *
 * HTTP bridge to hyperMILL via the hyperMILL Automation Center (AC).
 * The AC is an OPEN MIND API layer that allows scripted control of hyperMILL.
 * The companion server wraps the AC COM/API and exposes HTTP on port 18365.
 *
 * Supported actions:
 *   create_job        — create a new hyperMILL job (Joblist)
 *   add_operation     — add a machining cycle to an existing job
 *   set_cycle_params  — set parameters for a specific cycle
 *   run_nc_generation — run NC code generation (post processing)
 *   access_tool_db    — query or update the hyperMILL tool database
 *   get_machine_config — retrieve machine and controller configuration
 */
export class HyperMillACBridgeEngine extends CAMAPIBridgeBase {
  protected readonly supportedActions = [
    "create_job",
    "add_operation",
    "set_cycle_params",
    "run_nc_generation",
    "access_tool_db",
    "get_machine_config",
  ] as const;

  constructor() {
    super("hypermill_ac", 18365);
  }

  // ── Action-specific convenience wrappers ─────────────────────────────────

  /** Create a new hyperMILL job (Joblist). */
  async createJob(params: {
    job_name: string;
    model_file?: string;
    machine_name?: string;
    controller_name?: string;
    material?: string;
    zero_point?: Record<string, number>;
    [key: string]: unknown;
  }): Promise<BridgeActionResult> {
    return this.executeAction("create_job", params);
  }

  /** Add a machining cycle/operation to an existing job. */
  async addOperation(params: {
    job_name?: string;
    cycle_type: string;  // "3d_optimized_roughing" | "3d_profile_finishing" | "drilling" | ...
    tool_id?: number;
    tool_name?: string;
    feature_name?: string;
    cycle_params?: Record<string, unknown>;
  }): Promise<BridgeActionResult> {
    return this.executeAction("add_operation", params);
  }

  /** Set or update parameters for a specific cycle/operation. */
  async setCycleParams(params: {
    job_name?: string;
    operation_index?: number;
    operation_name?: string;
    params: Record<string, unknown>;
    recalculate?: boolean;
  }): Promise<BridgeActionResult> {
    return this.executeAction("set_cycle_params", params);
  }

  /** Run NC code generation for a job or set of operations. */
  async runNCGeneration(params: {
    job_name?: string;
    operations?: string[];
    output_dir?: string;
    return_nc?: boolean;
    split_by_tool?: boolean;
  }): Promise<BridgeActionResult> {
    return this.executeAction("run_nc_generation", params);
  }

  /** Query or update the hyperMILL tool database. */
  async accessToolDB(params: {
    mode: "read" | "add" | "update" | "delete" | "search";
    tool_id?: number;
    tool_data?: Record<string, unknown>;
    query?: string;
    filter?: Record<string, unknown>;
  }): Promise<BridgeActionResult> {
    return this.executeAction("access_tool_db", params);
  }

  /** Retrieve machine and controller configuration from the AC. */
  async getMachineConfig(params: {
    machine_name?: string;
    include_kinematics?: boolean;
    include_controller?: boolean;
    include_post_settings?: boolean;
  }): Promise<BridgeActionResult> {
    return this.executeAction("get_machine_config", params);
  }
}

// ─── Singletons ───────────────────────────────────────────────────────────────

export const mastercamNETBridgeEngine        = new MastercamNETBridgeEngine();
export const solidCAMSolidWorksBridgeEngine  = new SolidCAMSolidWorksBridgeEngine();
export const nxOpenBridgeEngine              = new NXOpenBridgeEngine();
export const hyperMillACBridgeEngine         = new HyperMillACBridgeEngine();
