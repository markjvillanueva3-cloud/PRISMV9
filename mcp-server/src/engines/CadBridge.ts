/**
 * CadBridge — TypeScript client for the Python CAD engine.
 *
 * Spawns bridge.py as a child process, communicates via JSON-RPC
 * over stdin/stdout. Manages process lifecycle (lazy start, health
 * check, auto-restart on crash, cleanup on shutdown).
 *
 * Usage:
 *   const bridge = CadBridge.getInstance();
 *   const result = await bridge.createGeometry({ type: "box", width: 20, height: 20, depth: 20 });
 */

import { spawn, ChildProcess } from "child_process";
import * as path from "path";
import * as readline from "readline";
import { PATHS } from "../constants.js";

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

/** Cad Geometry Request configuration/data structure.
 */
export interface CadGeometryRequest {
  type: "box" | "cylinder" | "sphere" | "cone" | "sketch_extrude";
  width?: number;
  height?: number;
  depth?: number;
  radius?: number;
  radius_bottom?: number;
  radius_top?: number;
  shape?: string;
  extrude_height?: number;
  sides?: number;
  centered?: boolean;
  name?: string;
  // Optional feature operations
  fillet_radius?: number;
  fillet_edges?: string;
  chamfer_distance?: number;
  chamfer_edges?: string;
  hole_diameter?: number;
  hole_depth?: number;
  hole_position?: [number, number];
  shell_thickness?: number;
  shell_faces?: string;
}

/** Cad Geometry Result configuration/data structure.
 */
export interface CadGeometryResult {
  solid_id: string;
  volume_mm3: number;
  bounding_box: {
    min: [number, number, number];
    max: [number, number, number];
    size: [number, number, number];
  };
}

/** Cad Validation Result configuration/data structure.
 */
export interface CadValidationResult {
  is_valid: boolean;
  is_manifold: boolean;
  is_watertight: boolean;
  volume_mm3: number;
  surface_area_mm2: number;
  bounding_box: Record<string, unknown>;
  center_of_mass: Record<string, unknown>;
  min_wall_thickness_mm: number | null;
  face_count: number;
  edge_count: number;
  vertex_count: number;
  findings: Array<{
    check: string;
    passed: boolean;
    severity: string;
    message: string;
    value: number | null;
  }>;
}

/** Cad Export Result configuration/data structure.
 */
export interface CadExportResult {
  output_path: string;
  format: string;
  format_version: string;
  file_size_bytes: number;
  success: boolean;
}

/** Cad Analysis Result configuration/data structure.
 */
export interface CadAnalysisResult {
  volume_mm3: number;
  surface_area_mm2: number;
  bounding_box: {
    min: [number, number, number];
    max: [number, number, number];
    size: [number, number, number];
    center: [number, number, number];
  };
  center_of_mass: [number, number, number];
}

interface JsonRpcRequest {
  jsonrpc: "2.0";
  method: string;
  params: Record<string, unknown>;
  id: number;
}

interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: number | null;
  result?: unknown;
  error?: { code: number; message: string };
  method?: string; // for "ready" notification
}

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (reason: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

// ---------------------------------------------------------------------------
// CadBridge
// ---------------------------------------------------------------------------

/** Cad Bridge engine/manager.
 */
export class CadBridge {
  private static instance: CadBridge | null = null;

  private process: ChildProcess | null = null;
  private rl: readline.Interface | null = null;
  private nextId = 1;
  private pending = new Map<number, PendingRequest>();
  private ready = false;
  private starting = false;
  private startPromise: Promise<void> | null = null;
  private startupTimer: ReturnType<typeof setTimeout> | null = null;

  private readonly pythonPath: string;
  private readonly bridgePath: string;
  private readonly timeout: number;

  private constructor(options?: { timeout?: number }) {
    this.pythonPath = PATHS.PYTHON;
    this.bridgePath = path.resolve(
      PATHS.PRISM_ROOT,
      "cad-engine",
      "src",
      "bridge.py"
    );
    this.timeout = options?.timeout ?? 30_000;
  }

  static getInstance(options?: { timeout?: number }): CadBridge {
    if (!CadBridge.instance) {
      CadBridge.instance = new CadBridge(options);
    }
    return CadBridge.instance;
  }

  /**
   * Returns the live singleton WITHOUT constructing one if none exists.
   * Used by the prism_cad:cad_bridge_status dispatcher action so operability
   * inspection never has the side effect of spawning a CadBridge instance.
   * Returns null when getInstance() has not yet been called this process.
   */
  static peekInstance(): CadBridge | null {
    return CadBridge.instance;
  }

  /**
   * Synchronous status snapshot. No spawn, no I/O — pure inspection of
   * this singleton's internal state. Safe for high-frequency observability
   * polling and hermetic unit tests. Operators see whether the Python
   * bridge subprocess is alive without round-tripping JSON-RPC.
   *
   * @returns {{ initialized: boolean, ready: boolean, starting: boolean, processAlive: boolean, processPid: number | null, pendingRequests: number, nextRequestId: number, pythonPath: string, bridgePath: string, timeoutMs: number }}
   */
  getStatus(): {
    initialized: true;
    ready: boolean;
    starting: boolean;
    processAlive: boolean;
    processPid: number | null;
    pendingRequests: number;
    nextRequestId: number;
    pythonPath: string;
    bridgePath: string;
    timeoutMs: number;
  } {
    const processAlive = !!(this.process && !this.process.killed);
    const processPid = this.process?.pid ?? null;
    return {
      initialized: true,
      ready: this.ready && processAlive,
      starting: this.starting,
      processAlive,
      processPid: typeof processPid === "number" ? processPid : null,
      pendingRequests: this.pending.size,
      nextRequestId: this.nextId,
      pythonPath: this.pythonPath,
      bridgePath: this.bridgePath,
      timeoutMs: this.timeout,
    };
  }

  // ── Process lifecycle ──────────────────────────────────────────────

  private async ensureRunning(): Promise<void> {
    if (this.ready && this.process && !this.process.killed) {
      return;
    }
    // Guard: set starting before creating promise to prevent dual-start
    if (this.starting && this.startPromise) {
      return this.startPromise;
    }
    this.starting = true;
    this.startPromise = this.start().finally(() => {
      this.starting = false;
      this.startPromise = null;
    });
    return this.startPromise;
  }

  private start(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.cleanup();

      this.process = spawn(this.pythonPath, [this.bridgePath], {
        stdio: ["pipe", "pipe", "pipe"],
        cwd: path.dirname(this.bridgePath),
      });

      // Parse stdout line-by-line
      this.rl = readline.createInterface({
        input: this.process.stdout!,
        crlfDelay: Infinity,
      });

      this.rl.on("line", (line: string) => {
        this.handleLine(line, resolve);
      });

      this.process.stderr?.on("data", (data: Buffer) => {
        const msg = data.toString().trim();
        if (msg) {
          console.error(`[CadBridge stderr] ${msg}`);
        }
      });

      this.process.on("exit", (code) => {
        this.ready = false;
        // Reject all pending requests
        for (const [, req] of this.pending) {
          req.reject(new Error(`Python bridge exited with code ${code}`));
          clearTimeout(req.timer);
        }
        this.pending.clear();
      });

      this.process.on("error", (err) => {
        this.ready = false;
        // Also reject pending requests on spawn error
        for (const [, req] of this.pending) {
          req.reject(err);
          clearTimeout(req.timer);
        }
        this.pending.clear();
        reject(err);
      });

      // Startup timeout — store ref so cleanup can clear it
      this.startupTimer = setTimeout(() => {
        if (!this.ready) {
          this.cleanup();
          reject(new Error("CadBridge startup timeout (10s)"));
        }
      }, 10_000);
    });
  }

  private handleLine(line: string, onReady?: (value: void) => void): void {
    let response: JsonRpcResponse;
    try {
      response = JSON.parse(line);
    } catch {
      console.error(`[CadBridge] Invalid JSON from bridge: ${line}`);
      return;
    }

    // Handle "ready" notification
    if (response.method === "ready") {
      this.ready = true;
      if (this.startupTimer) {
        clearTimeout(this.startupTimer);
        this.startupTimer = null;
      }
      onReady?.();
      return;
    }

    // Handle response to a pending request
    if (response.id != null) {
      const pending = this.pending.get(response.id);
      if (pending) {
        this.pending.delete(response.id);
        clearTimeout(pending.timer);

        if (response.error) {
          pending.reject(
            new Error(`CadBridge error [${response.error.code}]: ${response.error.message}`)
          );
        } else {
          pending.resolve(response.result);
        }
      }
    }
  }

  private cleanup(): void {
    if (this.startupTimer) {
      clearTimeout(this.startupTimer);
      this.startupTimer = null;
    }
    if (this.rl) {
      this.rl.close();
      this.rl = null;
    }
    if (this.process && !this.process.killed) {
      this.process.kill();
    }
    this.process = null;
    this.ready = false;
  }

  // ── JSON-RPC call ──────────────────────────────────────────────────

  private async call<T>(method: string, params: Record<string, unknown> = {}): Promise<T> {
    await this.ensureRunning();

    const id = this.nextId++;
    const request: JsonRpcRequest = {
      jsonrpc: "2.0",
      method,
      params,
      id,
    };

    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`CadBridge timeout (${this.timeout}ms) on method: ${method}`));
      }, this.timeout);

      this.pending.set(id, {
        resolve: resolve as (value: unknown) => void,
        reject,
        timer,
      });

      const line = JSON.stringify(request) + "\n";
      this.process!.stdin!.write(line);
    });
  }

  // ── Public API ─────────────────────────────────────────────────────

  async ping(): Promise<{ status: string; version: string; solids_in_memory: number }> {
    return this.call("ping");
  }

  async createGeometry(params: CadGeometryRequest): Promise<CadGeometryResult> {
    return this.call("create_geometry", params as unknown as Record<string, unknown>);
  }

  async booleanOp(params: {
    operation: "union" | "subtract" | "intersect";
    solid_a: string;
    solid_b: string;
  }): Promise<{ solid_id: string; volume_mm3: number }> {
    return this.call("boolean", params);
  }

  async transform(params: {
    solid_id: string;
    operation: "translate" | "rotate" | "mirror";
    vector?: [number, number, number];
    axis?: [number, number, number];
    angle?: number;
    plane?: string;
  }): Promise<{ solid_id: string; volume_mm3: number }> {
    return this.call("transform", params);
  }

  async validateGeometry(params: {
    solid_id: string;
    min_wall_mm?: number;
    check_thickness?: boolean;
    thickness_samples?: number;
  }): Promise<CadValidationResult> {
    return this.call("validate_geometry", params);
  }

  async analyzeGeometry(params: {
    solid_id: string;
  }): Promise<CadAnalysisResult> {
    return this.call("analyze_geometry", params);
  }

  async exportGeometry(params: {
    solid_id: string;
    format: "STEP" | "STL" | "IGES" | "DXF";
    output_path: string;
    tolerance?: number;
    binary?: boolean;
  }): Promise<CadExportResult> {
    return this.call("export_geometry", params);
  }

  async importStep(params: {
    input_path: string;
  }): Promise<{ solid_id: string; volume_mm3: number }> {
    return this.call("import_step", params);
  }

  async clear(): Promise<{ cleared: number }> {
    return this.call("clear");
  }

  /** Shut down the Python bridge process and reset singleton. */
  async shutdown(): Promise<void> {
    this.cleanup();
    CadBridge.instance = null;
  }
}

/** Convenience getter matching PRISM singleton pattern. */
export function getCadBridge(options?: { timeout?: number }): CadBridge {
  return CadBridge.getInstance(options);
}
