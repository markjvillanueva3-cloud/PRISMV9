/**
 * SolidWorksAutomationBridge — PRISM-side TypeScript host for SolidWorks COM automation.
 *
 * CAD-AUTOMATION-MS0 / U-CAUT02
 *
 * Architecture:
 *   TypeScript (this file) ──execFile──> SolidWorksBridge.exe
 *                          <──── newline-delimited JSON stdout ──────
 *
 * The C# bridge hosts SldWorks.Application via COM interop. This engine spawns
 * it on first use, sends JSON commands over stdin, reads JSON responses from
 * stdout, and hard-kills the process on timeout or explicit close().
 *
 * Mock mode: set PRISM_CAD_MOCK=1 to bypass process spawn entirely and return
 * deterministic fixture data. Used by tests and CI where SolidWorks is absent.
 *
 * @module engines/SolidWorksAutomationBridge
 */

import { log } from "../utils/Logger.js";
import type { AtomicValue } from "../algorithms/types.js";
import { spawn, ChildProcess } from "child_process";
import * as readline from "readline";
import * as path from "path";
import * as fs from "fs";
import { fileURLToPath } from "url";

// ── Constants ──────────────────────────────────────────────────────────────

const OPERATION_TIMEOUT_MS = 60_000;
const SPAWN_TIMEOUT_MS = 20_000;
const BRIDGE_EXE_NAME = "SolidWorksBridge.exe";

/** Path to the compiled C# bridge binary. */
function resolveBridgePath(): string {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  // Walk up from dist/ back to project root
  const projectRoot = path.resolve(__dirname, "..", "..");
  return path.join(projectRoot, "bridges", "solidworks", BRIDGE_EXE_NAME);
}

// ── Types ──────────────────────────────────────────────────────────────────

export type SWCommand =
  | "open"
  | "getFeatureTree"
  | "exportSTEP"
  | "exportPDF"
  | "getBoundingBox"
  | "close";

export interface SWRequest {
  id: number;
  cmd: SWCommand;
  args: Record<string, unknown>;
}

export interface SWResponse {
  id: number;
  ok: boolean;
  result?: unknown;
  error?: string;
}

export interface FeatureNode {
  name: string;
  type: string;
  suppressed: boolean;
  children?: FeatureNode[];
}

export interface BoundingBox {
  min: [number, number, number];
  max: [number, number, number];
  units: "mm";
}

export interface OpenResult {
  filePath: string;
  documentType: "part" | "assembly" | "drawing" | "unknown";
  title: string;
}

// ── Pending request tracker ────────────────────────────────────────────────

interface PendingEntry {
  resolve: (value: unknown) => void;
  reject: (reason: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

// ── Mock fixtures ──────────────────────────────────────────────────────────

const MOCK_RESPONSES: Partial<Record<SWCommand, unknown>> = {
  open: {
    filePath: "/mock/part.sldprt",
    documentType: "part",
    title: "mock_part",
  } satisfies OpenResult,
  getFeatureTree: {
    features: [
      { name: "Boss-Extrude1", type: "Extrude", suppressed: false, children: [] },
      { name: "Cut-Extrude1", type: "Cut", suppressed: false, children: [] },
      { name: "Fillet1", type: "Fillet", suppressed: false, children: [] },
    ],
  },
  exportSTEP: { outputPath: "/mock/export.step", success: true },
  exportPDF: { outputPath: "/mock/export.pdf", success: true },
  getBoundingBox: {
    min: [0.0, 0.0, 0.0],
    max: [100.0, 50.0, 25.0],
    units: "mm",
  } satisfies BoundingBox,
  close: { closed: true },
};

// ── Engine ─────────────────────────────────────────────────────────────────

/**
 * SolidWorksAutomationBridge
 *
 * Manages the SolidWorks COM bridge process lifecycle.
 * All public methods return AtomicValue<T> for PRISM pipeline compatibility.
 * Process is spawned lazily on first operation and reused across calls.
 */
export class SolidWorksAutomationBridge {
  private _process: ChildProcess | null = null;
  private _rl: readline.Interface | null = null;
  private _pending = new Map<number, PendingEntry>();
  private _nextId = 1;
  private _ready = false;
  private _spawnPromise: Promise<void> | null = null;

  constructor() {
    if (this._mockMode) {
      log.info("[SWBridge] Mock mode active — no SolidWorksBridge.exe will be spawned");
    }
  }

  /**
   * Read PRISM_CAD_MOCK lazily so that a module-level singleton picks up env
   * changes made by beforeEach() in tests. Evaluated on every send() call.
   */
  private get _mockMode(): boolean {
    return process.env["PRISM_CAD_MOCK"] === "1";
  }

  // ── Public API ─────────────────────────────────────────────────────────

  /**
   * Open a SolidWorks document (.sldprt / .sldasm / .slddrw).
   * @param filePath Absolute path to the SolidWorks file
   */
  async open(filePath: string): Promise<AtomicValue<OpenResult>> {
    const result = await this._send<OpenResult>("open", { filePath });
    return {
      value: result,
      unit: "document",
      uncertainty: undefined, // document-open is deterministic; non-number T → undefined per AtomicValue contract
      confidence: 0.95,
      source: "SolidWorksAutomationBridge.open",
    };
  }

  /**
   * Retrieve the feature tree of the active document as canonical JSON.
   */
  async getFeatureTree(): Promise<AtomicValue<{ features: FeatureNode[] }>> {
    const result = await this._send<{ features: FeatureNode[] }>("getFeatureTree", {});
    return {
      value: result,
      unit: "feature_tree",
      uncertainty: undefined, // feature tree content is deterministic; non-number T → undefined per AtomicValue contract
      confidence: 0.98,
      source: "SolidWorksAutomationBridge.getFeatureTree",
    };
  }

  /**
   * Export the active document to STEP AP214 format.
   * @param outputPath Absolute path for the output .step file
   */
  async exportSTEP(outputPath: string): Promise<AtomicValue<{ outputPath: string; success: boolean }>> {
    const result = await this._send<{ outputPath: string; success: boolean }>("exportSTEP", { outputPath });
    return {
      value: result,
      unit: "file",
      uncertainty: undefined, // non-number T → undefined per AtomicValue contract
      confidence: 0.99,
      source: "SolidWorksAutomationBridge.exportSTEP",
    };
  }

  /**
   * Export the active document (drawing or part) to PDF.
   * @param outputPath Absolute path for the output .pdf file
   */
  async exportPDF(outputPath: string): Promise<AtomicValue<{ outputPath: string; success: boolean }>> {
    const result = await this._send<{ outputPath: string; success: boolean }>("exportPDF", { outputPath });
    return {
      value: result,
      unit: "file",
      uncertainty: undefined, // non-number T → undefined per AtomicValue contract
      confidence: 0.99,
      source: "SolidWorksAutomationBridge.exportPDF",
    };
  }

  /**
   * Get the axis-aligned bounding box of the active document in mm.
   */
  async getBoundingBox(): Promise<AtomicValue<BoundingBox>> {
    const result = await this._send<BoundingBox>("getBoundingBox", {});
    return {
      value: result,
      unit: "mm",
      uncertainty: undefined, // non-number T → undefined per AtomicValue contract
      uncertainty_pct: 0.001,
      confidence: 0.97,
      source: "SolidWorksAutomationBridge.getBoundingBox",
    };
  }

  /**
   * Close the active document and free COM resources.
   * Also terminates the bridge process.
   */
  async close(): Promise<AtomicValue<{ closed: boolean }>> {
    const result = await this._send<{ closed: boolean }>("close", {});
    this._killProcess();
    return {
      value: result,
      unit: "none",
      uncertainty: undefined, // non-number T → undefined per AtomicValue contract
      confidence: 1.0,
      source: "SolidWorksAutomationBridge.close",
    };
  }

  /**
   * Forcefully terminate the bridge process without sending a close command.
   * Use when the process is unresponsive.
   */
  terminate(): void {
    this._killProcess();
  }

  // ── Private: process lifecycle ─────────────────────────────────────────

  private async _ensureRunning(): Promise<void> {
    if (this._mockMode) return;
    if (this._ready && this._process && !this._process.killed) return;
    if (this._spawnPromise) return this._spawnPromise;

    this._spawnPromise = this._spawnBridge().finally(() => {
      this._spawnPromise = null;
    });
    return this._spawnPromise;
  }

  private _spawnBridge(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const bridgePath = resolveBridgePath();

      if (!fs.existsSync(bridgePath)) {
        reject(
          new Error(
            `SolidWorksBridge.exe not found at ${bridgePath}. ` +
            `Run bridges/solidworks/build.bat to compile the C# host.`
          )
        );
        return;
      }

      log.info(`[SWBridge] Spawning ${bridgePath}`);

      // spawn: no shell, no injection surface
      this._process = spawn(bridgePath, [], {
        stdio: ["pipe", "pipe", "pipe"],
        shell: false,
      });

      // Startup timeout
      const startupTimer = setTimeout(() => {
        this._killProcess();
        reject(new Error(`SolidWorksBridge.exe did not become ready within ${SPAWN_TIMEOUT_MS}ms`));
      }, SPAWN_TIMEOUT_MS);

      // stdout: newline-delimited JSON responses
      this._rl = readline.createInterface({
        input: this._process.stdout!,
        crlfDelay: Infinity,
      });

      this._rl.on("line", (line: string) => {
        const trimmed = line.trim();
        if (!trimmed) return;

        // First non-empty line after spawn is the "ready" signal
        if (!this._ready && trimmed === '{"ready":true}') {
          clearTimeout(startupTimer);
          this._ready = true;
          log.info("[SWBridge] Bridge ready");
          resolve();
          return;
        }

        this._handleResponse(trimmed);
      });

      this._process.stderr?.on("data", (data: Buffer) => {
        log.warn(`[SWBridge] stderr: ${data.toString().trim()}`);
      });

      this._process.on("exit", (code: number | null) => {
        log.info(`[SWBridge] Process exited with code ${code}`);
        this._ready = false;
        this._process = null;
        this._rl = null;
        // Reject all pending requests
        this._pending.forEach((entry, id) => {
          clearTimeout(entry.timer);
          entry.reject(new Error(`SolidWorksBridge.exe exited (code ${code}) with request ${id} pending`));
        });
        this._pending.clear();
      });

      this._process.on("error", (err: Error) => {
        clearTimeout(startupTimer);
        this._ready = false;
        reject(new Error(`Failed to spawn SolidWorksBridge.exe: ${err.message}`));
      });
    });
  }

  private _handleResponse(line: string): void {
    let parsed: SWResponse;
    try {
      parsed = JSON.parse(line) as SWResponse;
    } catch {
      log.warn(`[SWBridge] Unparseable response line: ${line.substring(0, 200)}`);
      return;
    }

    const entry = this._pending.get(parsed.id);
    if (!entry) {
      log.warn(`[SWBridge] Response for unknown request id=${parsed.id}`);
      return;
    }

    clearTimeout(entry.timer);
    this._pending.delete(parsed.id);

    if (parsed.ok && parsed.result !== undefined) {
      entry.resolve(parsed.result);
    } else {
      entry.reject(new Error(parsed.error ?? `SWBridge command failed (id=${parsed.id})`));
    }
  }

  private _killProcess(): void {
    if (this._process && !this._process.killed) {
      log.info("[SWBridge] Killing bridge process");
      this._process.kill("SIGTERM");
      // On Windows SIGTERM may not propagate; use TASKKILL via pid
      if (this._process.pid) {
        try {
          process.kill(this._process.pid, 9);
        } catch {
          // Already dead — ignore
        }
      }
    }
    this._ready = false;
    this._process = null;
    this._rl = null;
  }

  // ── Private: IPC send ──────────────────────────────────────────────────

  private async _send<T>(cmd: SWCommand, args: Record<string, unknown>): Promise<T> {
    if (this._mockMode) {
      const fixture = MOCK_RESPONSES[cmd];
      if (fixture === undefined) {
        throw new Error(`[SWBridge] Mock: no fixture defined for command "${cmd}"`);
      }
      return fixture as T;
    }

    await this._ensureRunning();

    const id = this._nextId++;
    const request: SWRequest = { id, cmd, args };
    const line = JSON.stringify(request) + "\n";

    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this._pending.delete(id);
        // Hard-kill on timeout per milestone spec
        log.error(`[SWBridge] Operation "${cmd}" timed out after ${OPERATION_TIMEOUT_MS}ms — hard-killing process`);
        this._killProcess();
        reject(new Error(`SolidWorks operation "${cmd}" timed out after ${OPERATION_TIMEOUT_MS}ms`));
      }, OPERATION_TIMEOUT_MS);

      this._pending.set(id, {
        resolve: resolve as (value: unknown) => void,
        reject,
        timer,
      });

      if (!this._process?.stdin) {
        clearTimeout(timer);
        this._pending.delete(id);
        reject(new Error("[SWBridge] stdin not available — process not running"));
        return;
      }

      this._process.stdin.write(line, (err?: Error | null) => {
        if (err) {
          clearTimeout(timer);
          this._pending.delete(id);
          reject(new Error(`[SWBridge] Failed to write to bridge stdin: ${err.message}`));
        }
      });
    });
  }
}

// ── Singleton export ────────────────────────────────────────────────────────

export const solidWorksAutomationBridge = new SolidWorksAutomationBridge();
