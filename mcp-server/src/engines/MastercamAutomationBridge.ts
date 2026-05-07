/**
 * MastercamAutomationBridge — Process-level spawn + named-pipe IPC bridge for Mastercam.
 *
 * Spawns Mastercam.exe with -runchook pointing at MastercamNetHook.dll, establishes
 * a named-pipe channel (\\.\pipe\prism-mcam-{pid}), and dispatches JSON commands.
 * Composes existing Mastercam* engines — does NOT re-implement strategy/code/cycle logic.
 *
 * Supported file formats: .mcx-8 (Mastercam 2018+), .mcam (Mastercam 2019+), .MCX (pre-2018)
 * Mock mode: set PRISM_CAD_MOCK=1 to bypass spawn/IPC and return fixture data.
 *
 * @engine MastercamAutomationBridge
 * @shortcode E1301
 * @milestone CAD-AUTOMATION-MS0/U-CAUT05
 */

import { execFile, spawn } from "node:child_process";
import * as net from "node:net";
import * as path from "node:path";
import { log } from "../utils/Logger.js";

// ── Composed engines (strategy/code/cycle logic lives here, not duplicated) ──
import { mastercamStrategyEngine } from "./MastercamStrategyEngine.js";
import { mastercamCodeGeneratorEngine } from "./MastercamCodeGeneratorEngine.js";
import { mastercamCycleCatalogEngine } from "./MastercamCycleCatalogEngine.js";

// ── AtomicValue<T> ────────────────────────────────────────────────────────────

export interface AtomicValue<T> {
  value: T;
  confidence: number;       // 0–1
  source: string;
  warning?: string;
}

// ── Domain types ──────────────────────────────────────────────────────────────

export type McamFileExt = ".mcx-8" | ".mcam" | ".MCX";

export interface McamGeometryEntity {
  type: "line" | "arc" | "spline" | "surface" | "point";
  id: number;
  layer: number;
  color: number;
  /** Bounding box [minX,minY,minZ,maxX,maxY,maxZ] in mm */
  bbox?: [number, number, number, number, number, number];
}

export interface McamGeometry {
  lines: McamGeometryEntity[];
  arcs: McamGeometryEntity[];
  splines: McamGeometryEntity[];
  surfaces: McamGeometryEntity[];
  totalEntities: number;
}

export interface McamOperation {
  index: number;
  name: string;
  /** Mastercam cycle code e.g. "2D:DynamicContour" */
  cycleCode: string;
  toolDiameter_mm: number;
  toolType: string;
  spindleRpm: number;
  feedRate_mmpm: number;
  isEnabled: boolean;
  isDirty: boolean;
}

export interface McamToolpathGroup {
  name: string;
  operations: McamOperation[];
}

export interface McamMachineGroup {
  name: string;
  controller: string;
  postProcessor: string;
  toolpathGroups: McamToolpathGroup[];
}

export interface McamOperationTree {
  machineGroups: McamMachineGroup[];
  totalOperations: number;
}

// ── IPC protocol ──────────────────────────────────────────────────────────────

interface PipeCommand {
  id: string;
  cmd: "open" | "getGeometry" | "getToolpaths" | "getOperationTree" | "exportSTEP" | "close";
  args: Record<string, unknown>;
}

interface PipeResponse {
  id: string;
  ok: boolean;
  data?: unknown;
  error?: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const OP_TIMEOUT_MS = 45_000;   // Mastercam is slower to init than SW/Inventor
const PIPE_CONNECT_TIMEOUT_MS = 10_000;
const MASTERCAM_DEFAULT_PATH = "C:/Program Files/Mastercam 2024/Mastercam.exe";
const NETHOOK_DLL_DEFAULT = "C:/ProgramData/PRISM/bridges/MastercamNetHook.dll";
const MOCK_ENV = "PRISM_CAD_MOCK";

// ── Mock fixtures ─────────────────────────────────────────────────────────────

const MOCK_GEOMETRY: McamGeometry = {
  lines: Array.from({ length: 48 }, (_, i) => ({
    type: "line" as const, id: i + 1, layer: 1, color: 10,
    bbox: [0, 0, 0, 100, 100, 0] as [number,number,number,number,number,number],
  })),
  arcs: Array.from({ length: 12 }, (_, i) => ({
    type: "arc" as const, id: 1000 + i, layer: 1, color: 10,
  })),
  splines: Array.from({ length: 4 }, (_, i) => ({
    type: "spline" as const, id: 2000 + i, layer: 2, color: 20,
  })),
  surfaces: Array.from({ length: 8 }, (_, i) => ({
    type: "surface" as const, id: 3000 + i, layer: 3, color: 30,
  })),
  totalEntities: 72,
};

function buildMockOperationTree(): McamOperationTree {
  const cycles = mastercamCycleCatalogEngine.listAll().slice(0, 10);
  const ops: McamOperation[] = Array.from({ length: 52 }, (_, i) => ({
    index: i,
    name: `Operation_${i + 1}`,
    cycleCode: cycles[i % cycles.length]?.code ?? "2D:DynamicContour",
    toolDiameter_mm: [6, 8, 10, 12, 16][i % 5],
    toolType: ["endmill", "ballnose", "drill", "bullnose", "face_mill"][i % 5],
    spindleRpm: 6000 + (i * 100),
    feedRate_mmpm: 1500 + (i * 50),
    isEnabled: true,
    isDirty: false,
  }));

  return {
    machineGroups: [
      {
        name: "Machine Group 1",
        controller: "Okuma OSP-P300",
        postProcessor: "MPOKUMA",
        toolpathGroups: [
          { name: "Roughing", operations: ops.slice(0, 18) },
          { name: "Semi-Finish", operations: ops.slice(18, 34) },
          { name: "Finishing", operations: ops.slice(34, 52) },
        ],
      },
    ],
    totalOperations: 52,
  };
}

// ── execFileNoThrow ────────────────────────────────────────────────────────────

function execFileNoThrow(
  bin: string,
  args: string[],
  timeoutMs = 10_000,
): Promise<{ stdout: string; stderr: string; code: number }> {
  return new Promise((resolve) => {
    execFile(
      bin,
      args,
      { timeout: timeoutMs, windowsHide: true, maxBuffer: 2 * 1024 * 1024 },
      (err, stdout, stderr) => {
        const rawCode = err ? (err as NodeJS.ErrnoException & { code?: unknown }).code : 0;
        const code = typeof rawCode === "number" ? rawCode : err ? 1 : 0;
        resolve({
          stdout: typeof stdout === "string" ? stdout : "",
          stderr: typeof stderr === "string" ? stderr : "",
          code,
        });
      },
    );
  });
}

// ── PipeClient ────────────────────────────────────────────────────────────────

class McamPipeClient {
  private socket: net.Socket | null = null;
  private readonly pipeName: string;
  private pending = new Map<string, {
    resolve: (r: PipeResponse) => void;
    reject: (e: Error) => void;
    timer: ReturnType<typeof setTimeout>;
  }>();
  private buf = "";

  constructor(pipeName: string) {
    this.pipeName = pipeName;
  }

  async connect(timeoutMs = PIPE_CONNECT_TIMEOUT_MS): Promise<void> {
    return new Promise((resolve, reject) => {
      const sock = net.createConnection(this.pipeName);
      const timer = setTimeout(() => {
        sock.destroy();
        reject(new Error(`Pipe connect timeout: ${this.pipeName}`));
      }, timeoutMs);

      sock.once("connect", () => {
        clearTimeout(timer);
        this.socket = sock;

        sock.on("data", (chunk) => {
          this.buf += chunk.toString("utf8");
          let nl: number;
          while ((nl = this.buf.indexOf("\n")) !== -1) {
            const line = this.buf.slice(0, nl).trim();
            this.buf = this.buf.slice(nl + 1);
            if (!line) continue;
            try {
              const resp: PipeResponse = JSON.parse(line);
              const pending = this.pending.get(resp.id);
              if (pending) {
                clearTimeout(pending.timer);
                this.pending.delete(resp.id);
                pending.resolve(resp);
              }
            } catch { /* malformed line — ignore */ }
          }
        });

        sock.on("error", (err) => {
          for (const p of this.pending.values()) {
            clearTimeout(p.timer);
            p.reject(err);
          }
          this.pending.clear();
        });

        resolve();
      });

      sock.once("error", (err) => {
        clearTimeout(timer);
        reject(err);
      });
    });
  }

  send(cmd: PipeCommand, timeoutMs = OP_TIMEOUT_MS): Promise<PipeResponse> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error("Pipe not connected"));
        return;
      }
      const timer = setTimeout(() => {
        this.pending.delete(cmd.id);
        reject(new Error(`Command timeout: ${cmd.cmd} (${timeoutMs}ms)`));
      }, timeoutMs);

      this.pending.set(cmd.id, { resolve, reject, timer });
      this.socket.write(JSON.stringify(cmd) + "\n", "utf8");
    });
  }

  destroy(): void {
    for (const p of this.pending.values()) {
      clearTimeout(p.timer);
      p.reject(new Error("Pipe destroyed"));
    }
    this.pending.clear();
    this.socket?.destroy();
    this.socket = null;
  }
}

// ── Engine ────────────────────────────────────────────────────────────────────

export class MastercamAutomationBridge {
  private pid: number | null = null;
  private pipe: McamPipeClient | null = null;
  private openFilePath: string | null = null;
  private idSeq = 0;

  private get isMock(): boolean {
    return process.env[MOCK_ENV] === "1";
  }

  private nextId(): string {
    return `mcam-${++this.idSeq}-${Date.now()}`;
  }

  private detectExtension(filePath: string): McamFileExt {
    const ext = path.extname(filePath);
    if (ext === ".MCX") return ".MCX";
    if (ext === ".mcam") return ".mcam";
    return ".mcx-8";
  }

  // ── Exposed engine accessors (compose — don't duplicate) ────────────────────

  /** Strategy recommendations via MastercamStrategyEngine */
  get strategy() { return mastercamStrategyEngine; }
  /** Code generation via MastercamCodeGeneratorEngine */
  get codeGen() { return mastercamCodeGeneratorEngine; }
  /** Cycle catalog via MastercamCycleCatalogEngine */
  get cycles() { return mastercamCycleCatalogEngine; }

  // ── Lifecycle ───────────────────────────────────────────────────────────────

  /**
   * Open a Mastercam file. Spawns Mastercam.exe with -runchook if not in mock mode.
   * Supports .mcx-8 (2018+), .mcam (2019+), legacy .MCX (pre-2018).
   */
  async open(
    filePath: string,
    opts: {
      mastercamExe?: string;
      netHookDll?: string;
    } = {},
  ): Promise<AtomicValue<{ filePath: string; format: McamFileExt; pid: number | null }>> {
    const format = this.detectExtension(filePath);

    if (this.isMock) {
      this.openFilePath = filePath;
      log.info(`[MastercamAutomationBridge] MOCK open: ${filePath} (${format})`);
      return {
        value: { filePath, format, pid: null },
        confidence: 1.0,
        source: "mock",
      };
    }

    const exe = opts.mastercamExe ?? MASTERCAM_DEFAULT_PATH;
    const dll = opts.netHookDll ?? NETHOOK_DLL_DEFAULT;

    log.info(`[MastercamAutomationBridge] Spawning: ${exe} -runchook "${dll}"`);

    // Spawn Mastercam in background — we don't await its exit (it stays open)
    const child = spawn(exe, ["-runchook", dll], {
      detached: true,
      windowsHide: false,
      stdio: "ignore",
    });
    this.pid = child.pid ?? null;
    child.unref();

    const pipeName = `\\\\.\\pipe\\prism-mcam-${this.pid}`;
    this.pipe = new McamPipeClient(pipeName);

    // Retry connection — Mastercam takes a few seconds to load the NET-Hook
    let connected = false;
    for (let attempt = 0; attempt < 6; attempt++) {
      await new Promise((r) => setTimeout(r, 2000 + attempt * 1000));
      try {
        await this.pipe.connect();
        connected = true;
        break;
      } catch { /* retry */ }
    }

    if (!connected) {
      throw new Error(
        `[MastercamAutomationBridge] Could not connect to pipe ${pipeName} after 6 attempts`,
      );
    }

    const resp = await this.pipe.send({
      id: this.nextId(),
      cmd: "open",
      args: { filePath, format },
    });

    if (!resp.ok) throw new Error(`open failed: ${resp.error}`);
    this.openFilePath = filePath;

    return {
      value: { filePath, format, pid: this.pid },
      confidence: 0.95,
      source: "nethook-ipc",
    };
  }

  /**
   * Extract all geometry entities (lines, arcs, splines, surfaces).
   */
  async getGeometry(): Promise<AtomicValue<McamGeometry>> {
    if (this.isMock) {
      return { value: MOCK_GEOMETRY, confidence: 1.0, source: "mock" };
    }
    if (!this.pipe) throw new Error("No open document — call open() first");

    const resp = await this.pipe.send({ id: this.nextId(), cmd: "getGeometry", args: {} });
    if (!resp.ok) throw new Error(`getGeometry failed: ${resp.error}`);

    return {
      value: resp.data as McamGeometry,
      confidence: 0.95,
      source: "nethook-ipc",
    };
  }

  /**
   * Returns all enabled operations from all machine groups (50+ toolpaths typical).
   */
  async getToolpaths(): Promise<AtomicValue<McamOperation[]>> {
    const treeResult = await this.getOperationTree();
    const ops: McamOperation[] = [];
    for (const mg of treeResult.value.machineGroups) {
      for (const tg of mg.toolpathGroups) {
        ops.push(...tg.operations);
      }
    }
    return {
      value: ops,
      confidence: treeResult.confidence,
      source: treeResult.source,
    };
  }

  /**
   * Returns the full job tree: Machine Group → Toolpath Group → Operations.
   */
  async getOperationTree(): Promise<AtomicValue<McamOperationTree>> {
    if (this.isMock) {
      return { value: buildMockOperationTree(), confidence: 1.0, source: "mock" };
    }
    if (!this.pipe) throw new Error("No open document — call open() first");

    const resp = await this.pipe.send({
      id: this.nextId(),
      cmd: "getOperationTree",
      args: {},
    });
    if (!resp.ok) throw new Error(`getOperationTree failed: ${resp.error}`);

    return {
      value: resp.data as McamOperationTree,
      confidence: 0.95,
      source: "nethook-ipc",
    };
  }

  /**
   * Export the open document as STEP AP242.
   * @param outputPath Full path for the output .step/.stp file
   */
  async exportSTEP(outputPath: string): Promise<AtomicValue<{ outputPath: string; format: "STEP AP242" }>> {
    if (this.isMock) {
      log.info(`[MastercamAutomationBridge] MOCK exportSTEP → ${outputPath}`);
      return {
        value: { outputPath, format: "STEP AP242" },
        confidence: 1.0,
        source: "mock",
      };
    }
    if (!this.pipe) throw new Error("No open document — call open() first");

    const resp = await this.pipe.send({
      id: this.nextId(),
      cmd: "exportSTEP",
      args: { outputPath, format: "STEP AP242" },
    });
    if (!resp.ok) throw new Error(`exportSTEP failed: ${resp.error}`);

    return {
      value: { outputPath, format: "STEP AP242" },
      confidence: 0.95,
      source: "nethook-ipc",
    };
  }

  /**
   * Unload the document and clean up NET-Hook state.
   * Sends close command over pipe then destroys the pipe connection.
   */
  async close(): Promise<AtomicValue<{ closed: true; pid: number | null }>> {
    if (this.isMock) {
      this.openFilePath = null;
      return { value: { closed: true, pid: null }, confidence: 1.0, source: "mock" };
    }

    if (this.pipe) {
      try {
        await this.pipe.send({ id: this.nextId(), cmd: "close", args: {} });
      } catch { /* best-effort */ }
      this.pipe.destroy();
      this.pipe = null;
    }

    const pid = this.pid;
    if (pid) {
      // Signal Mastercam to exit; ignore errors (already closed)
      await execFileNoThrow("taskkill", ["/PID", String(pid), "/F"], 5000);
    }

    this.pid = null;
    this.openFilePath = null;

    return {
      value: { closed: true, pid },
      confidence: 1.0,
      source: "nethook-ipc",
    };
  }
}

// ── Singleton export ───────────────────────────────────────────────────────────

export const mastercamAutomationBridge = new MastercamAutomationBridge();
