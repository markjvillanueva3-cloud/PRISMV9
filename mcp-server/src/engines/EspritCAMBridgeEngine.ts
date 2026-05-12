/**
 * EspritCAMBridgeEngine — Bidirectional Bridge to Esprit CAM System
 *
 * Provides comprehensive data extraction and communication with Esprit CAM,
 * supporting multiple input formats:
 *   - Native Esprit project files (.esp, .esprit)
 *   - APT/CL data export
 *   - NC output with operation comments
 *
 * Extracted data includes:
 *   - Tool list with full geometries
 *   - Operation sequence with parameters
 *   - Machining parameters (feeds, speeds, depths)
 *   - Stock model definitions
 *   - Fixture/setup information
 *   - Simulation results
 *
 * Future bidirectional support:
 *   - Push optimized parameters back to Esprit
 *   - Sync tool libraries
 *   - Update machining strategies
 *
 * @engine EspritCAMBridgeEngine
 * @shortcode E1200
 * @dispatcher camDispatcher
 * @actions esprit_extract_project, esprit_parse_apt, esprit_parse_nc,
 *   esprit_get_tools, esprit_get_operations, esprit_push_params,
 *   esprit_connect, esprit_status, esprit_sync_tools
 * @milestone CAMX-BRIDGES/U01
 */

import { log } from "../utils/Logger.js";

// ═══════════════════════════════════════════════════════════════════════════════
// Types & Interfaces
// ═══════════════════════════════════════════════════════════════════════════════

/** Stock model definition from Esprit */
export interface StockDefinition {
  type: "block" | "cylinder" | "stl" | "solid";
  dimensions: {
    length_mm?: number;
    width_mm?: number;
    height_mm?: number;
    diameter_mm?: number;
    inner_diameter_mm?: number;
  };
  material?: string;
  origin_offset?: [number, number, number];
  stl_path?: string;
}

/** Work offset definition */
export interface WorkOffset {
  id: string;
  g_code: string;           // G54, G55, etc.
  x_mm: number;
  y_mm: number;
  z_mm: number;
  a_deg?: number;
  b_deg?: number;
  c_deg?: number;
  description?: string;
}

/** Toolpath data extracted from Esprit */
export interface ToolpathData {
  total_length_mm: number;
  rapid_length_mm: number;
  cutting_length_mm: number;
  estimated_time_sec: number;
  min_z_mm: number;
  max_z_mm: number;
  bounding_box?: {
    min: [number, number, number];
    max: [number, number, number];
  };
  point_count: number;
}

/** Simulation result from Esprit */
export interface SimulationData {
  collision_detected: boolean;
  collisions?: Array<{
    type: string;
    location: [number, number, number];
    severity: "warning" | "error";
    description: string;
  }>;
  gouge_detected: boolean;
  gouges?: Array<{
    depth_mm: number;
    location: [number, number, number];
  }>;
  cycle_time_sec: number;
  material_removed_mm3?: number;
  warnings: string[];
}

/** Esprit tool definition */
export interface EspritTool {
  tool_number: number;
  tool_id: string;
  tool_type: string;          // "endmill", "ballmill", "drill", "tap", etc.
  description: string;
  diameter_mm: number;
  corner_radius_mm: number;
  flute_length_mm: number;
  overall_length_mm: number;
  flutes: number;
  material: string;           // "carbide", "hss", "ceramic", "cbn", "pcd"
  coating: string;
  holder_id?: string;
  holder_length_mm?: number;
  gauge_length_mm?: number;
  coolant_through: boolean;
  manufacturer?: string;
  part_number?: string;
  cutting_data?: {
    vc_mpm: number;           // Surface speed m/min
    fz_mm: number;            // Feed per tooth mm
    rpm: number;
    feed_mmpm: number;
  };
}

/** Esprit operation definition */
export interface EspritOperation {
  operationId: string;
  operationName: string;
  operationType: string;      // "roughing", "finishing", "drilling", "profiling", etc.
  toolNumber: number;
  toolpath?: ToolpathData;
  parameters: Record<string, number | string | boolean>;
  simulationResult?: SimulationData;
  sequence_order: number;
  enabled: boolean;
  work_offset?: string;       // G54, G55, etc.
  coolant_mode?: string;
  spindle_direction?: "cw" | "ccw";
  // Machining parameters
  machining_params: {
    rpm?: number;
    feed_mmpm?: number;
    plunge_feed_mmpm?: number;
    stepover_mm?: number;
    stepdown_mm?: number;
    axial_doc_mm?: number;
    radial_doc_mm?: number;
    approach_type?: string;
    retract_type?: string;
    clearance_plane_mm?: number;
    safety_height_mm?: number;
  };
}

/** Esprit project extracted data */
export interface EspritProject {
  projectPath: string;
  projectName: string;
  version: string;            // Esprit version
  machineType: string;
  machineId?: string;
  controllerType?: string;
  operations: EspritOperation[];
  tools: EspritTool[];
  workOffsets: WorkOffset[];
  stockModel?: StockDefinition;
  fixture?: {
    id: string;
    name: string;
    description?: string;
    components: Array<{
      name: string;
      type: string;
      position: [number, number, number];
    }>;
  };
  metadata: {
    created_date?: string;
    modified_date?: string;
    created_by?: string;
    units: "mm" | "inch";
    total_cycle_time_sec?: number;
    total_operations: number;
    total_tools: number;
  };
  warnings: string[];
  errors: string[];
}

/** APT/CL parsed data */
export interface APTData {
  source_file: string;
  apt_version?: string;
  units: "mm" | "inch";
  tool_changes: Array<{
    tool_number: number;
    tool_id?: string;
    position_index: number;
  }>;
  operations: Array<{
    name?: string;
    type: string;
    commands: string[];
    parameters: Record<string, number | string>;
  }>;
  goto_points: number;
  rapid_moves: number;
  cutting_moves: number;
  cycles: Array<{
    type: string;
    count: number;
  }>;
  warnings: string[];
}

/** NC file parsed data */
export interface NCParsedData {
  source_file: string;
  controller_hint?: string;
  operations: Array<{
    operation_id?: string;
    operation_name?: string;
    tool_number: number;
    start_line: number;
    end_line: number;
    parameters: Record<string, number | string>;
    comments: string[];
  }>;
  tools_used: number[];
  work_offsets_used: string[];
  total_lines: number;
  g_codes_used: string[];
  m_codes_used: string[];
  warnings: string[];
}

/** Bridge connection result */
export interface EspritConnectionResult {
  connected: boolean;
  host: string;
  port: number;
  esprit_version?: string;
  session_id?: string;
  message: string;
  latency_ms?: number;
}

/** Parameter push result */
export interface EspritPushResult {
  success: boolean;
  operation_id: string;
  parameters_updated: number;
  parameters_failed: string[];
  message: string;
  requires_regeneration: boolean;
}

/** Tool sync result */
export interface EspritToolSyncResult {
  success: boolean;
  tools_added: number;
  tools_updated: number;
  tools_removed: number;
  tools_failed: string[];
  sync_direction: "prism_to_esprit" | "esprit_to_prism" | "bidirectional";
  message: string;
}

/** Extraction options */
export interface EspritExtractionOptions {
  include_toolpaths?: boolean;
  include_simulation?: boolean;
  include_stock?: boolean;
  include_fixture?: boolean;
  resolve_tool_library?: boolean;
  parse_comments?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════════

const ESPRIT_DEFAULT_PORT = 18366;
const CONNECT_TIMEOUT_MS = 5000;
const REQUEST_TIMEOUT_MS = 30000;

/** Esprit operation type mapping */
const ESPRIT_OP_TYPE_MAP: Record<string, string> = {
  // Milling
  "FaceMilling": "facing",
  "PocketMilling": "pocketing",
  "ContourMilling": "profiling",
  "SpiralPocket": "pocketing",
  "HorizontalRoughing": "roughing",
  "ZLevelRoughing": "roughing",
  "ZLevelFinishing": "finishing",
  "PencilTrace": "finishing",
  "Morph": "finishing",
  "FlowlineFinishing": "finishing",
  "SwarfMilling": "finishing",
  "MultiAxisRoughing": "roughing",
  "MultiAxisFinishing": "finishing",
  // Drilling
  "Drilling": "drilling",
  "DeepHoleDrilling": "drilling",
  "PeckDrilling": "drilling",
  "Tapping": "tapping",
  "Reaming": "reaming",
  "Boring": "boring",
  "Countersink": "countersinking",
  "Counterbore": "counterboring",
  // Turning
  "Roughing": "roughing",
  "Finishing": "finishing",
  "Facing": "facing",
  "Grooving": "grooving",
  "Threading": "threading",
  "Parting": "parting",
  // Wire EDM
  "WireProfile": "wire_edm",
  "WireTaper": "wire_edm",
  // Default
  "default": "unknown",
};

/** Esprit tool type mapping */
const ESPRIT_TOOL_TYPE_MAP: Record<string, string> = {
  "End Mill": "endmill",
  "Ball End Mill": "ballmill",
  "Bull Nose": "radiusmill",
  "Face Mill": "facemill",
  "Drill": "drill",
  "Center Drill": "centerdrill",
  "Spot Drill": "spotdrill",
  "Tap": "tap",
  "Reamer": "reamer",
  "Boring Bar": "boring",
  "Chamfer Mill": "chamfer",
  "Thread Mill": "threadmill",
  "T-Slot": "tslot",
  "Dovetail": "dovetail",
  "Lollipop": "lollipop",
  "Turning Tool": "turning",
  "Grooving Tool": "grooving",
  "Threading Tool": "threading",
  "Parting Tool": "parting",
};

// ═══════════════════════════════════════════════════════════════════════════════
// Engine Implementation
// ═══════════════════════════════════════════════════════════════════════════════

export class EspritCAMBridgeEngine {
  private _host = "localhost";
  private _port = ESPRIT_DEFAULT_PORT;
  private _connected = false;
  private _sessionId: string | undefined;
  private _espritVersion: string | undefined;

  // ═══════════════════════════════════════════════════════════════════════════
  // Connection Management
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Connect to Esprit CAM HTTP bridge server.
   * The companion server must be running inside Esprit on the specified port.
   *
   * @param host - Server hostname (default: localhost)
   * @param port - Server port (default: 18366)
   */
  async connect(
    host = "localhost",
    port = ESPRIT_DEFAULT_PORT
  ): Promise<EspritConnectionResult> {
    this._host = host;
    this._port = port;
    const t0 = Date.now();

    try {
      const response = await this._post("/connect", {
        client: "PRISM-E1200",
        cam_system: "esprit",
      }, CONNECT_TIMEOUT_MS);

      const latency_ms = Date.now() - t0;
      this._connected = !response.error;
      this._sessionId = String(response.session_id ?? response.sessionId ?? "");
      this._espritVersion = String(response.version ?? response.esprit_version ?? "unknown");

      return {
        connected: this._connected,
        host: this._host,
        port: this._port,
        esprit_version: this._espritVersion,
        session_id: this._sessionId || undefined,
        latency_ms,
        message: this._connected
          ? `Connected to Esprit ${this._espritVersion} at ${host}:${port}`
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
   * Check connection status without establishing new session.
   */
  async getStatus(): Promise<EspritConnectionResult> {
    const t0 = Date.now();
    try {
      const response = await this._get("/status", 3000);
      const latency_ms = Date.now() - t0;
      const alive = !response.error && (
        response.status === "ok" ||
        response.running === true ||
        response.alive === true
      );
      return {
        connected: alive,
        host: this._host,
        port: this._port,
        esprit_version: String(response.version ?? this._espritVersion ?? "unknown"),
        session_id: this._sessionId,
        latency_ms,
        message: alive
          ? `Esprit server running at ${this._host}:${this._port}`
          : `Esprit server not responding: ${JSON.stringify(response)}`,
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
   * Disconnect from Esprit bridge server.
   */
  async disconnect(): Promise<{ disconnected: boolean; message: string }> {
    try {
      await this._post("/disconnect", {
        session_id: this._sessionId,
      }, 3000);
    } catch {
      // Best-effort disconnect
    }
    this._connected = false;
    this._sessionId = undefined;
    return {
      disconnected: true,
      message: `Disconnected from Esprit (${this._host}:${this._port})`,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Project Extraction — Native Esprit Files
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Extract complete project data from an Esprit project file.
   * Requires the Esprit bridge server to be running with the project open.
   *
   * @param projectPath - Path to .esp or .esprit file
   * @param options - Extraction options
   */
  async extractProject(
    projectPath: string,
    options: EspritExtractionOptions = {}
  ): Promise<EspritProject> {
    const warnings: string[] = [];
    const errors: string[] = [];

    // Default options
    const opts: Required<EspritExtractionOptions> = {
      include_toolpaths: options.include_toolpaths ?? true,
      include_simulation: options.include_simulation ?? false,
      include_stock: options.include_stock ?? true,
      include_fixture: options.include_fixture ?? true,
      resolve_tool_library: options.resolve_tool_library ?? true,
      parse_comments: options.parse_comments ?? true,
    };

    // If connected, use live extraction
    if (this._connected) {
      try {
        const response = await this._post("/project/extract", {
          project_path: projectPath,
          ...opts,
          session_id: this._sessionId,
        });

        if (response.error) {
          errors.push(`Live extraction failed: ${response.error}`);
        } else {
          return this._normalizeProjectResponse(response, projectPath, warnings);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        warnings.push(`Live extraction unavailable: ${msg}. Attempting file-based extraction.`);
      }
    }

    // Fall back to file-based extraction (parse exported data)
    return this._extractFromFile(projectPath, opts, warnings, errors);
  }

  /**
   * Extract project from file without live connection.
   * Parses exported JSON/XML data from Esprit.
   */
  private _extractFromFile(
    projectPath: string,
    options: Required<EspritExtractionOptions>,
    warnings: string[],
    errors: string[]
  ): EspritProject {
    // This is a fallback when live bridge is unavailable
    // In production, this would read exported Esprit data files
    warnings.push("File-based extraction: limited data available without live Esprit connection");

    const projectName = projectPath.split(/[/\\]/).pop()?.replace(/\.(esp|esprit)$/i, "") ?? "Unknown";

    return {
      projectPath,
      projectName,
      version: "unknown",
      machineType: "unknown",
      operations: [],
      tools: [],
      workOffsets: [],
      stockModel: undefined,
      fixture: undefined,
      metadata: {
        units: "mm",
        total_operations: 0,
        total_tools: 0,
      },
      warnings,
      errors: [...errors, "Live Esprit connection required for full extraction"],
    };
  }

  /**
   * Normalize raw API response to EspritProject structure.
   */
  private _normalizeProjectResponse(
    response: Record<string, unknown>,
    projectPath: string,
    warnings: string[]
  ): EspritProject {
    const rawOps = (response.operations ?? response.Operations ?? []) as unknown[];
    const rawTools = (response.tools ?? response.Tools ?? []) as unknown[];
    const rawOffsets = (response.work_offsets ?? response.WorkOffsets ?? []) as unknown[];

    const operations = this._parseOperations(rawOps);
    const tools = this._parseTools(rawTools);
    const workOffsets = this._parseWorkOffsets(rawOffsets);

    const projectName = String(
      response.project_name ?? response.ProjectName ??
      projectPath.split(/[/\\]/).pop()?.replace(/\.(esp|esprit)$/i, "") ?? "Unknown"
    );

    return {
      projectPath,
      projectName,
      version: String(response.version ?? response.Version ?? "unknown"),
      machineType: String(response.machine_type ?? response.MachineType ?? "unknown"),
      machineId: response.machine_id as string | undefined,
      controllerType: response.controller_type as string | undefined,
      operations,
      tools,
      workOffsets,
      stockModel: this._parseStockModel(response.stock ?? response.Stock),
      fixture: this._parseFixture(response.fixture ?? response.Fixture),
      metadata: {
        created_date: response.created_date as string | undefined,
        modified_date: response.modified_date as string | undefined,
        created_by: response.created_by as string | undefined,
        units: (response.units ?? "mm") as "mm" | "inch",
        total_cycle_time_sec: this._coerceNum(response.total_cycle_time_sec),
        total_operations: operations.length,
        total_tools: tools.length,
      },
      warnings,
      errors: [],
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // APT/CL Parsing
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Parse APT/CL data exported from Esprit.
   * APT (Automatically Programmed Tool) is a standard toolpath format.
   *
   * @param aptContent - APT/CL file content as string
   * @param sourceFile - Source file path for reference
   */
  parseAPT(aptContent: string, sourceFile: string): APTData {
    const warnings: string[] = [];
    const lines = aptContent.split(/\r?\n/);
    const toolChanges: APTData["tool_changes"] = [];
    const operations: APTData["operations"] = [];
    const cycles: APTData["cycles"] = [];
    let gotoPoints = 0;
    let rapidMoves = 0;
    let cuttingMoves = 0;
    let units: "mm" | "inch" = "mm";
    let aptVersion: string | undefined;
    let currentOp: APTData["operations"][0] | null = null;

    const cycleCount: Record<string, number> = {};

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim().toUpperCase();
      if (!line || line.startsWith("$$")) continue; // Skip comments

      // Parse PARTNO/MACHIN for metadata
      if (line.startsWith("PARTNO")) {
        aptVersion = line.match(/PARTNO\s*\/\s*'?([^']+)'?/)?.[1];
      }

      // Units
      if (line.includes("INCH")) units = "inch";
      if (line.includes("MM") || line.includes("METRIC")) units = "mm";

      // Tool changes
      const toolMatch = line.match(/LOADTL\s*\/\s*(\d+)/);
      if (toolMatch) {
        toolChanges.push({
          tool_number: parseInt(toolMatch[1], 10),
          position_index: i,
        });
        // Start new operation
        if (currentOp) operations.push(currentOp);
        currentOp = {
          type: "unknown",
          commands: [],
          parameters: {},
        };
      }

      // GOTO points
      if (line.startsWith("GOTO")) {
        gotoPoints++;
        const coords = line.match(/GOTO\s*\/\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)/);
        if (coords && currentOp) {
          currentOp.commands.push(line);
        }
      }

      // RAPID moves
      if (line.includes("RAPID")) {
        rapidMoves++;
        if (currentOp) currentOp.commands.push(line);
      }

      // FEDRAT (feed rate)
      const fedMatch = line.match(/FEDRAT\s*\/\s*([-\d.]+)/);
      if (fedMatch && currentOp) {
        currentOp.parameters.feed = parseFloat(fedMatch[1]);
        cuttingMoves++;
      }

      // SPINDL (spindle)
      const spindlMatch = line.match(/SPINDL\s*\/\s*([-\d.]+)/);
      if (spindlMatch && currentOp) {
        currentOp.parameters.rpm = parseFloat(spindlMatch[1]);
      }

      // Canned cycles
      const cycleMatch = line.match(/^(CYCLE|DRILL|BORE|TAP|REAM)\s*\//);
      if (cycleMatch) {
        const cycleType = cycleMatch[1];
        cycleCount[cycleType] = (cycleCount[cycleType] || 0) + 1;
        if (currentOp) {
          currentOp.type = cycleType.toLowerCase();
          currentOp.commands.push(line);
        }
      }
    }

    // Push last operation
    if (currentOp) operations.push(currentOp);

    // Build cycles array
    for (const [type, count] of Object.entries(cycleCount)) {
      cycles.push({ type, count });
    }

    if (toolChanges.length === 0) {
      warnings.push("No tool changes found in APT file");
    }

    return {
      source_file: sourceFile,
      apt_version: aptVersion,
      units,
      tool_changes: toolChanges,
      operations,
      goto_points: gotoPoints,
      rapid_moves: rapidMoves,
      cutting_moves: cuttingMoves,
      cycles,
      warnings,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // NC Output Parsing
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Parse NC output file with operation comments.
   * Extracts operation boundaries, tools, and parameters from G-code.
   *
   * @param ncContent - NC file content as string
   * @param sourceFile - Source file path for reference
   */
  parseNC(ncContent: string, sourceFile: string): NCParsedData {
    const warnings: string[] = [];
    const lines = ncContent.split(/\r?\n/);
    const operations: NCParsedData["operations"] = [];
    const toolsUsed = new Set<number>();
    const workOffsetsUsed = new Set<string>();
    const gCodesUsed = new Set<string>();
    const mCodesUsed = new Set<string>();

    let currentOp: NCParsedData["operations"][0] | null = null;
    let controllerHint: string | undefined;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const lineNum = i + 1;

      // Detect controller from header comments
      if (line.startsWith("(") || line.startsWith(";")) {
        const comment = line.replace(/^[(\;]|[\)]$/g, "").trim();

        // Look for operation markers
        if (comment.match(/OPERATION|OP\s*[:=]?\s*\d+|TOOL PATH/i)) {
          // Close previous operation
          if (currentOp) {
            currentOp.end_line = lineNum - 1;
            operations.push(currentOp);
          }
          currentOp = {
            operation_name: comment,
            tool_number: 0,
            start_line: lineNum,
            end_line: lineNum,
            parameters: {},
            comments: [comment],
          };
        } else if (currentOp) {
          currentOp.comments.push(comment);
        }

        // Controller hints
        if (comment.match(/FANUC/i)) controllerHint = "fanuc";
        else if (comment.match(/HAAS/i)) controllerHint = "haas";
        else if (comment.match(/SIEMENS|SINUMERIK/i)) controllerHint = "siemens";
        else if (comment.match(/HEIDENHAIN/i)) controllerHint = "heidenhain";
        else if (comment.match(/MAZAK/i)) controllerHint = "mazatrol";
        else if (comment.match(/OKUMA/i)) controllerHint = "okuma";

        continue;
      }

      // Tool changes (T-word)
      const toolMatch = line.match(/T(\d+)/);
      if (toolMatch) {
        const toolNum = parseInt(toolMatch[1], 10);
        toolsUsed.add(toolNum);

        if (currentOp) {
          currentOp.tool_number = toolNum;
        } else {
          // Start new operation on tool change
          currentOp = {
            tool_number: toolNum,
            start_line: lineNum,
            end_line: lineNum,
            parameters: {},
            comments: [],
          };
        }
      }

      // Work offsets
      const offsetMatch = line.match(/G(5[4-9]|54\.[1-9])/);
      if (offsetMatch) {
        workOffsetsUsed.add(`G${offsetMatch[1]}`);
        if (currentOp) {
          currentOp.parameters.work_offset = `G${offsetMatch[1]}`;
        }
      }

      // G-codes
      const gCodes = line.match(/G\d+(\.\d+)?/g);
      if (gCodes) {
        gCodes.forEach(g => gCodesUsed.add(g));
      }

      // M-codes
      const mCodes = line.match(/M\d+/g);
      if (mCodes) {
        mCodes.forEach(m => mCodesUsed.add(m));
      }

      // Feed rate
      const feedMatch = line.match(/F([\d.]+)/);
      if (feedMatch && currentOp) {
        currentOp.parameters.feed = parseFloat(feedMatch[1]);
      }

      // Spindle speed
      const speedMatch = line.match(/S([\d.]+)/);
      if (speedMatch && currentOp) {
        currentOp.parameters.rpm = parseFloat(speedMatch[1]);
      }
    }

    // Close last operation
    if (currentOp) {
      currentOp.end_line = lines.length;
      operations.push(currentOp);
    }

    if (operations.length === 0) {
      warnings.push("No operations detected from comments. Consider enabling Esprit operation comments in post processor.");
    }

    return {
      source_file: sourceFile,
      controller_hint: controllerHint,
      operations,
      tools_used: Array.from(toolsUsed).sort((a, b) => a - b),
      work_offsets_used: Array.from(workOffsetsUsed).sort(),
      total_lines: lines.length,
      g_codes_used: Array.from(gCodesUsed).sort(),
      m_codes_used: Array.from(mCodesUsed).sort(),
      warnings,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Tool & Operation Accessors
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get tool list from current Esprit session.
   * Requires active connection to Esprit bridge.
   */
  async getTools(): Promise<{ tools: EspritTool[]; count: number; warnings: string[] }> {
    if (!this._connected) {
      return {
        tools: [],
        count: 0,
        warnings: ["Not connected to Esprit. Call connect() first."],
      };
    }

    try {
      const response = await this._post("/tools/list", {
        session_id: this._sessionId,
      });

      if (response.error) {
        return {
          tools: [],
          count: 0,
          warnings: [`Failed to get tools: ${response.error}`],
        };
      }

      const rawTools = (response.tools ?? response.Tools ?? []) as unknown[];
      const tools = this._parseTools(rawTools);

      return {
        tools,
        count: tools.length,
        warnings: [],
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        tools: [],
        count: 0,
        warnings: [`Error getting tools: ${msg}`],
      };
    }
  }

  /**
   * Get operation list from current Esprit session.
   * Requires active connection to Esprit bridge.
   */
  async getOperations(): Promise<{ operations: EspritOperation[]; count: number; warnings: string[] }> {
    if (!this._connected) {
      return {
        operations: [],
        count: 0,
        warnings: ["Not connected to Esprit. Call connect() first."],
      };
    }

    try {
      const response = await this._post("/operations/list", {
        session_id: this._sessionId,
      });

      if (response.error) {
        return {
          operations: [],
          count: 0,
          warnings: [`Failed to get operations: ${response.error}`],
        };
      }

      const rawOps = (response.operations ?? response.Operations ?? []) as unknown[];
      const operations = this._parseOperations(rawOps);

      return {
        operations,
        count: operations.length,
        warnings: [],
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        operations: [],
        count: 0,
        warnings: [`Error getting operations: ${msg}`],
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Bidirectional: Push Parameters Back to Esprit
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Push optimized parameters back to an Esprit operation.
   * This enables PRISM to update Esprit with calculated optimal values.
   *
   * @param operationId - Target operation ID
   * @param parameters - Parameters to update
   */
  async pushParameters(
    operationId: string,
    parameters: Partial<EspritOperation["machining_params"]>
  ): Promise<EspritPushResult> {
    if (!this._connected) {
      return {
        success: false,
        operation_id: operationId,
        parameters_updated: 0,
        parameters_failed: Object.keys(parameters),
        message: "Not connected to Esprit. Call connect() first.",
        requires_regeneration: false,
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
          operation_id: operationId,
          parameters_updated: 0,
          parameters_failed: Object.keys(parameters),
          message: `Push failed: ${response.error}`,
          requires_regeneration: false,
        };
      }

      const updated = this._coerceNum(response.parameters_updated ?? response.updated);
      const failed = (response.parameters_failed ?? []) as string[];
      const requiresRegen = Boolean(response.requires_regeneration ?? response.needs_regen ?? true);

      return {
        success: failed.length === 0,
        operation_id: operationId,
        parameters_updated: updated,
        parameters_failed: failed,
        message: `Updated ${updated} parameters for operation ${operationId}`,
        requires_regeneration: requiresRegen,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        operation_id: operationId,
        parameters_updated: 0,
        parameters_failed: Object.keys(parameters),
        message: `Push error: ${msg}`,
        requires_regeneration: false,
      };
    }
  }

  /**
   * Synchronize tool library between PRISM and Esprit.
   *
   * @param prismTools - Tools from PRISM catalog to sync
   * @param direction - Sync direction
   */
  async syncTools(
    prismTools: EspritTool[],
    direction: "prism_to_esprit" | "esprit_to_prism" | "bidirectional" = "prism_to_esprit"
  ): Promise<EspritToolSyncResult> {
    if (!this._connected) {
      return {
        success: false,
        tools_added: 0,
        tools_updated: 0,
        tools_removed: 0,
        tools_failed: prismTools.map(t => t.tool_id),
        sync_direction: direction,
        message: "Not connected to Esprit. Call connect() first.",
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
          tools_added: 0,
          tools_updated: 0,
          tools_removed: 0,
          tools_failed: prismTools.map(t => t.tool_id),
          sync_direction: direction,
          message: `Sync failed: ${response.error}`,
        };
      }

      return {
        success: true,
        tools_added: this._coerceNum(response.tools_added),
        tools_updated: this._coerceNum(response.tools_updated),
        tools_removed: this._coerceNum(response.tools_removed),
        tools_failed: (response.tools_failed ?? []) as string[],
        sync_direction: direction,
        message: String(response.message ?? "Tool sync completed"),
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        tools_added: 0,
        tools_updated: 0,
        tools_removed: 0,
        tools_failed: prismTools.map(t => t.tool_id),
        sync_direction: direction,
        message: `Sync error: ${msg}`,
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Version & Compatibility
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Check Esprit version compatibility with this bridge.
   * Supports Esprit 2017 and later.
   *
   * @param version - Esprit version string (e.g., "2023.1", "2021 R2")
   */
  checkVersionCompatibility(version: string): {
    compatible: boolean;
    minimum_version: string;
    detected_version: string;
    warnings: string[];
  } {
    const warnings: string[] = [];
    const minimumVersion = "2017";

    // Parse version (handle formats like "2023.1", "2021 R2", "v2020")
    const versionMatch = version.match(/(\d{4})/);
    const yearVersion = versionMatch ? parseInt(versionMatch[1], 10) : 0;

    if (yearVersion < 2017) {
      warnings.push(`Esprit version ${version} is below minimum supported version ${minimumVersion}`);
      warnings.push("Some features may not work correctly");
    }

    if (yearVersion >= 2017 && yearVersion < 2020) {
      warnings.push("Esprit 2017-2019: Limited API support. Consider upgrading for full functionality.");
    }

    return {
      compatible: yearVersion >= 2017,
      minimum_version: minimumVersion,
      detected_version: version,
      warnings,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Private Helpers — Parsing
  // ═══════════════════════════════════════════════════════════════════════════

  private _parseOperations(rawOps: unknown[]): EspritOperation[] {
    return rawOps
      .filter((o): o is Record<string, unknown> => o != null && typeof o === "object")
      .map((op, index) => {
        const rawType = String(op.type ?? op.Type ?? op.operation_type ?? "unknown");
        const normalizedType = ESPRIT_OP_TYPE_MAP[rawType] ?? ESPRIT_OP_TYPE_MAP["default"];

        const params = (op.parameters ?? op.Parameters ?? {}) as Record<string, unknown>;
        const machiningParams = (op.machining_params ?? op.MachiningParams ?? params) as Record<string, unknown>;

        return {
          operationId: String(op.id ?? op.Id ?? op.operation_id ?? `op-${index}`),
          operationName: String(op.name ?? op.Name ?? op.operation_name ?? `Operation ${index + 1}`),
          operationType: normalizedType,
          toolNumber: this._coerceNum(op.tool_number ?? op.ToolNumber ?? op.tool),
          toolpath: this._parseToolpath(op.toolpath ?? op.Toolpath),
          parameters: this._sanitizeParams(params),
          simulationResult: this._parseSimulation(op.simulation ?? op.Simulation),
          sequence_order: this._coerceNum(op.sequence ?? op.Sequence ?? op.order, index),
          enabled: op.enabled !== false && op.Enabled !== false,
          work_offset: op.work_offset as string | undefined,
          coolant_mode: op.coolant as string | undefined,
          spindle_direction: (op.spindle_direction ?? "cw") as "cw" | "ccw",
          machining_params: {
            rpm: this._coerceNum(machiningParams.rpm ?? machiningParams.RPM),
            feed_mmpm: this._coerceNum(machiningParams.feed ?? machiningParams.Feed ?? machiningParams.feed_mmpm),
            plunge_feed_mmpm: this._coerceNum(machiningParams.plunge_feed ?? machiningParams.PlungeFeed),
            stepover_mm: this._coerceNum(machiningParams.stepover ?? machiningParams.Stepover),
            stepdown_mm: this._coerceNum(machiningParams.stepdown ?? machiningParams.Stepdown),
            axial_doc_mm: this._coerceNum(machiningParams.axial_doc ?? machiningParams.AxialDOC),
            radial_doc_mm: this._coerceNum(machiningParams.radial_doc ?? machiningParams.RadialDOC),
            approach_type: machiningParams.approach as string | undefined,
            retract_type: machiningParams.retract as string | undefined,
            clearance_plane_mm: this._coerceNum(machiningParams.clearance ?? machiningParams.ClearancePlane),
            safety_height_mm: this._coerceNum(machiningParams.safety_height ?? machiningParams.SafetyHeight),
          },
        };
      });
  }

  private _parseTools(rawTools: unknown[]): EspritTool[] {
    return rawTools
      .filter((t): t is Record<string, unknown> => t != null && typeof t === "object")
      .map((tool) => {
        const rawType = String(tool.type ?? tool.Type ?? tool.tool_type ?? "End Mill");
        const normalizedType = ESPRIT_TOOL_TYPE_MAP[rawType] ?? rawType.toLowerCase().replace(/\s+/g, "_");

        const cutData = (tool.cutting_data ?? tool.CuttingData ?? {}) as Record<string, unknown>;

        return {
          tool_number: this._coerceNum(tool.number ?? tool.Number ?? tool.tool_number),
          tool_id: String(tool.id ?? tool.Id ?? tool.tool_id ?? `tool-${tool.number}`),
          tool_type: normalizedType,
          description: String(tool.description ?? tool.Description ?? `${rawType} Tool`),
          diameter_mm: this._coerceNum(tool.diameter ?? tool.Diameter),
          corner_radius_mm: this._coerceNum(tool.corner_radius ?? tool.CornerRadius),
          flute_length_mm: this._coerceNum(tool.flute_length ?? tool.FluteLength),
          overall_length_mm: this._coerceNum(tool.oal ?? tool.OAL ?? tool.overall_length),
          flutes: this._coerceNum(tool.flutes ?? tool.Flutes ?? tool.num_flutes, 2),
          material: String(tool.material ?? tool.Material ?? "carbide").toLowerCase(),
          coating: String(tool.coating ?? tool.Coating ?? "uncoated").toLowerCase(),
          holder_id: tool.holder_id as string | undefined,
          holder_length_mm: this._coerceNum(tool.holder_length ?? tool.HolderLength),
          gauge_length_mm: this._coerceNum(tool.gauge_length ?? tool.GaugeLength),
          coolant_through: Boolean(tool.coolant_through ?? tool.CoolantThrough ?? false),
          manufacturer: tool.manufacturer as string | undefined,
          part_number: tool.part_number as string | undefined,
          cutting_data: cutData ? {
            vc_mpm: this._coerceNum(cutData.vc ?? cutData.Vc ?? cutData.surface_speed),
            fz_mm: this._coerceNum(cutData.fz ?? cutData.Fz ?? cutData.chip_load),
            rpm: this._coerceNum(cutData.rpm ?? cutData.RPM),
            feed_mmpm: this._coerceNum(cutData.feed ?? cutData.Feed),
          } : undefined,
        };
      });
  }

  private _parseWorkOffsets(rawOffsets: unknown[]): WorkOffset[] {
    return rawOffsets
      .filter((o): o is Record<string, unknown> => o != null && typeof o === "object")
      .map((offset) => ({
        id: String(offset.id ?? offset.Id ?? offset.g_code),
        g_code: String(offset.g_code ?? offset.GCode ?? "G54"),
        x_mm: this._coerceNum(offset.x ?? offset.X),
        y_mm: this._coerceNum(offset.y ?? offset.Y),
        z_mm: this._coerceNum(offset.z ?? offset.Z),
        a_deg: this._optionalNum(offset.a ?? offset.A),
        b_deg: this._optionalNum(offset.b ?? offset.B),
        c_deg: this._optionalNum(offset.c ?? offset.C),
        description: offset.description as string | undefined,
      }));
  }

  private _parseToolpath(raw: unknown): ToolpathData | undefined {
    if (!raw || typeof raw !== "object") return undefined;
    const tp = raw as Record<string, unknown>;

    return {
      total_length_mm: this._coerceNum(tp.total_length ?? tp.TotalLength),
      rapid_length_mm: this._coerceNum(tp.rapid_length ?? tp.RapidLength),
      cutting_length_mm: this._coerceNum(tp.cutting_length ?? tp.CuttingLength),
      estimated_time_sec: this._coerceNum(tp.estimated_time ?? tp.EstimatedTime ?? tp.time_sec),
      min_z_mm: this._coerceNum(tp.min_z ?? tp.MinZ),
      max_z_mm: this._coerceNum(tp.max_z ?? tp.MaxZ),
      bounding_box: tp.bounding_box as ToolpathData["bounding_box"],
      point_count: this._coerceNum(tp.point_count ?? tp.PointCount ?? tp.points),
    };
  }

  private _parseSimulation(raw: unknown): SimulationData | undefined {
    if (!raw || typeof raw !== "object") return undefined;
    const sim = raw as Record<string, unknown>;

    return {
      collision_detected: Boolean(sim.collision_detected ?? sim.CollisionDetected ?? sim.has_collision),
      collisions: (sim.collisions ?? sim.Collisions) as SimulationData["collisions"],
      gouge_detected: Boolean(sim.gouge_detected ?? sim.GougeDetected ?? sim.has_gouge),
      gouges: (sim.gouges ?? sim.Gouges) as SimulationData["gouges"],
      cycle_time_sec: this._coerceNum(sim.cycle_time ?? sim.CycleTime ?? sim.time_sec),
      material_removed_mm3: this._optionalNum(sim.material_removed ?? sim.MaterialRemoved),
      warnings: (sim.warnings ?? []) as string[],
    };
  }

  private _parseStockModel(raw: unknown): StockDefinition | undefined {
    if (!raw || typeof raw !== "object") return undefined;
    const stock = raw as Record<string, unknown>;
    const dims = (stock.dimensions ?? stock.Dimensions ?? stock) as Record<string, unknown>;

    return {
      type: (stock.type ?? stock.Type ?? "block") as StockDefinition["type"],
      dimensions: {
        length_mm: this._optionalNum(dims.length ?? dims.Length),
        width_mm: this._optionalNum(dims.width ?? dims.Width),
        height_mm: this._optionalNum(dims.height ?? dims.Height),
        diameter_mm: this._optionalNum(dims.diameter ?? dims.Diameter),
        inner_diameter_mm: this._optionalNum(dims.inner_diameter ?? dims.InnerDiameter),
      },
      material: stock.material as string | undefined,
      origin_offset: stock.origin_offset as [number, number, number] | undefined,
      stl_path: stock.stl_path as string | undefined,
    };
  }

  private _parseFixture(raw: unknown): EspritProject["fixture"] | undefined {
    if (!raw || typeof raw !== "object") return undefined;
    const fix = raw as Record<string, unknown>;

    return {
      id: String(fix.id ?? fix.Id ?? "fixture-1"),
      name: String(fix.name ?? fix.Name ?? "Main Fixture"),
      description: fix.description as string | undefined,
      components: ((fix.components ?? fix.Components ?? []) as unknown[])
        .filter((c): c is Record<string, unknown> => c != null && typeof c === "object")
        .map(comp => ({
          name: String(comp.name ?? comp.Name ?? "Component"),
          type: String(comp.type ?? comp.Type ?? "clamp"),
          position: (comp.position ?? comp.Position ?? [0, 0, 0]) as [number, number, number],
        })),
    };
  }

  private _sanitizeParams(params: Record<string, unknown>): Record<string, number | string | boolean> {
    const result: Record<string, number | string | boolean> = {};
    for (const [key, value] of Object.entries(params)) {
      if (typeof value === "number" || typeof value === "string" || typeof value === "boolean") {
        result[key] = value;
      } else if (value != null) {
        result[key] = String(value);
      }
    }
    return result;
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
          "X-PRISM-Client": "E1200-EspritCAMBridge",
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
        headers: { "X-PRISM-Client": "E1200-EspritCAMBridge" },
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

// ═══════════════════════════════════════════════════════════════════════════════
// Singleton Export
// ═══════════════════════════════════════════════════════════════════════════════

export const espritCAMBridgeEngine = new EspritCAMBridgeEngine();
