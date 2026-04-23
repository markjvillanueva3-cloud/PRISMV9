/**
 * FreeCADAutomationBridge — Python-subprocess bridge for FreeCAD (.FCStd).
 *
 * Spawns FreeCADCmd (or python with FreeCAD on PYTHONPATH) running a small
 * companion script that speaks newline-delimited JSON over stdin/stdout.
 * Composes existing FreeCAD support engines (none wired yet — this bridge is
 * the first FreeCAD surface) and exposes the same lifecycle as the
 * SolidWorks/Inventor/Mastercam bridges: open/getGeometry/getToolpaths/
 * getOperationTree/exportSTEP/close.
 *
 * Supported file formats: .FCStd (primary), .FCStd1 (backup/autosave).
 * Mock mode: set PRISM_CAD_MOCK=1 to bypass spawn/IPC and return fixtures.
 *
 * @engine FreeCADAutomationBridge
 * @shortcode E1302
 * @milestone CAD-AUTOMATION-MS0/U-CAUT04
 */

import { execFile, spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import * as path from "node:path";
import { log } from "../utils/Logger.js";

// ── AtomicValue<T> ────────────────────────────────────────────────────────────

export interface AtomicValue<T> {
  value: T;
  confidence: number;
  source: string;
  warning?: string;
}

// ── Domain types ──────────────────────────────────────────────────────────────

export type FCStdExt = ".FCStd" | ".FCStd1";

export interface FCStdGeometryEntity {
  type: "line" | "arc" | "spline" | "surface" | "point" | "solid";
  id: string;
  label: string;
  /** Bounding box [minX,minY,minZ,maxX,maxY,maxZ] in mm */
  bbox?: [number, number, number, number, number, number];
}

export interface FCStdGeometry {
  lines: FCStdGeometryEntity[];
  arcs: FCStdGeometryEntity[];
  splines: FCStdGeometryEntity[];
  surfaces: FCStdGeometryEntity[];
  solids: FCStdGeometryEntity[];
  totalEntities: number;
}

export interface FCStdOperation {
  index: number;
  name: string;
  /** FreeCAD Path workbench op type: Pocket, Profile, Drilling, Surface, Adaptive, etc. */
  opType: string;
  toolDiameter_mm: number;
  toolType: string;
  spindleRpm: number;
  feedRate_mmpm: number;
  isEnabled: boolean;
}

export interface FCStdToolpathGroup {
  name: string;
  operations: FCStdOperation[];
}

export interface FCStdJob {
  name: string;
  stockMaterial: string;
  postProcessor: string;
  toolpathGroups: FCStdToolpathGroup[];
}

export interface FCStdOperationTree {
  jobs: FCStdJob[];
  totalOperations: number;
}

// ── IPC protocol ──────────────────────────────────────────────────────────────

interface IPCCommand {
  id: string;
  cmd: "open" | "getGeometry" | "getToolpaths" | "getOperationTree" | "exportSTEP" | "close";
  args: Record<string, unknown>;
}

interface IPCResponse {
  id: string;
  ok: boolean;
  data?: unknown;
  error?: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const OP_TIMEOUT_MS = 30_000;
const PROC_READY_TIMEOUT_MS = 10_000;
const FREECAD_CMD_DEFAULT = "FreeCADCmd";
const COMPANION_SCRIPT_DEFAULT = "C:/ProgramData/PRISM/bridges/freecad_bridge.py";
const MOCK_ENV = "PRISM_CAD_MOCK";

// ── Mock fixtures ─────────────────────────────────────────────────────────────

const MOCK_GEOMETRY: FCStdGeometry = {
  lines: Array.from({ length: 32 }, (_, i) => ({
    type: "line" as const,
    id: `Line${String(i + 1).padStart(3, "0")}`,
    label: `Line ${i + 1}`,
    bbox: [0, 0, 0, 100, 100, 0] as [number, number, number, number, number, number],
  })),
  arcs: Array.from({ length: 8 }, (_, i) => ({
    type: "arc" as const,
    id: `Arc${String(i + 1).padStart(3, "0")}`,
    label: `Arc ${i + 1}`,
  })),
  splines: [
    { type: "spline" as const, id: "BSpline001", label: "BSpline 1" },
    { type: "spline" as const, id: "BSpline002", label: "BSpline 2" },
  ],
  surfaces: Array.from({ length: 6 }, (_, i) => ({
    type: "surface" as const,
    id: `Face${String(i + 1).padStart(3, "0")}`,
    label: `Face ${i + 1}`,
  })),
  solids: [{ type: "solid" as const, id: "Body001", label: "Body" }],
  totalEntities: 49,
};

function buildMockOperationTree(): FCStdOperationTree {
  const ops: FCStdOperation[] = Array.from({ length: 18 }, (_, i) => ({
    index: i,
    name: `Operation_${i + 1}`,
    opType: ["Pocket", "Profile", "Drilling", "Surface", "Adaptive"][i % 5],
    toolDiameter_mm: [6, 8, 10, 12][i % 4],
    toolType: ["endmill", "ballnose", "drill", "bullnose"][i % 4],
    spindleRpm: 8000 + i * 200,
    feedRate_mmpm: 1200 + i * 100,
    isEnabled: true,
  }));

  return {
    jobs: [
      {
        name: "Job001",
        stockMaterial: "AISI 4140",
        postProcessor: "linuxcnc",
        toolpathGroups: [
          { name: "Roughing", operations: ops.slice(0, 8) },
          { name: "Finishing", operations: ops.slice(8, 18) },
        ],
      },
    ],
    totalOperations: 18,
  };
}

// ── execFileNoThrow ───────────────────────────────────────────────────────────

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

// ── Stdio JSON client ─────────────────────────────────────────────────────────

class FCStdIPCClient {
  private proc: ChildProcessWithoutNullStreams | null = null;
  private buf = "";
  private pending = new Map<string, {
    resolve: (r: IPCResponse) => void;
    reject: (e: Error) => void;
    timer: ReturnType<typeof setTimeout>;
  }>();
  private ready = false;
  private readyWaiters: Array<() => void> = [];

  spawn(cmd: string, args: string[]): void {
    const proc = spawn(cmd, args, {
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
    });
    this.proc = proc;

    proc.stdout.on("data", (chunk: Buffer) => {
      this.buf += chunk.toString("utf8");
      let nl: number;
      while ((nl = this.buf.indexOf("\n")) !== -1) {
        const line = this.buf.slice(0, nl).trim();
        this.buf = this.buf.slice(nl + 1);
        if (!line) continue;
        if (line === "__PRISM_FCSTD_READY__") {
          this.ready = true;
          for (const w of this.readyWaiters) w();
          this.readyWaiters = [];
          continue;
        }
        try {
          const resp: IPCResponse = JSON.parse(line);
          const p = this.pending.get(resp.id);
          if (p) {
            clearTimeout(p.timer);
            this.pending.delete(resp.id);
            p.resolve(resp);
          }
        } catch {
          // unstructured output from FreeCAD — ignore
        }
      }
    });

    proc.stderr.on("data", (chunk: Buffer) => {
      const msg = chunk.toString("utf8").trim();
      if (msg) log.warn(`[FreeCADAutomationBridge] stderr: ${msg}`);
    });

    proc.on("exit", (code) => {
      log.info(`[FreeCADAutomationBridge] FreeCADCmd exited code=${code}`);
      for (const p of this.pending.values()) {
        clearTimeout(p.timer);
        p.reject(new Error(`FreeCADCmd exited before responding (code=${code})`));
      }
      this.pending.clear();
      this.proc = null;
      this.ready = false;
    });
  }

  waitReady(timeoutMs = PROC_READY_TIMEOUT_MS): Promise<void> {
    if (this.ready) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("FreeCADCmd ready timeout")), timeoutMs);
      this.readyWaiters.push(() => {
        clearTimeout(timer);
        resolve();
      });
    });
  }

  send(cmd: IPCCommand, timeoutMs = OP_TIMEOUT_MS): Promise<IPCResponse> {
    return new Promise((resolve, reject) => {
      if (!this.proc) {
        reject(new Error("FreeCADCmd not spawned"));
        return;
      }
      const timer = setTimeout(() => {
        this.pending.delete(cmd.id);
        reject(new Error(`Command timeout: ${cmd.cmd} (${timeoutMs}ms)`));
      }, timeoutMs);
      this.pending.set(cmd.id, { resolve, reject, timer });
      this.proc.stdin.write(JSON.stringify(cmd) + "\n", "utf8");
    });
  }

  destroy(): void {
    for (const p of this.pending.values()) {
      clearTimeout(p.timer);
      p.reject(new Error("IPC destroyed"));
    }
    this.pending.clear();
    if (this.proc) {
      try {
        this.proc.stdin.end();
      } catch {
        // ignore
      }
      this.proc.kill();
    }
    this.proc = null;
    this.ready = false;
  }

  get pid(): number | null {
    return this.proc?.pid ?? null;
  }
}

// ── Engine ────────────────────────────────────────────────────────────────────

export class FreeCADAutomationBridge {
  private ipc: FCStdIPCClient | null = null;
  private openFilePath: string | null = null;
  private idSeq = 0;

  private get isMock(): boolean {
    return process.env[MOCK_ENV] === "1";
  }

  private nextId(): string {
    return `fcstd-${++this.idSeq}-${Date.now()}`;
  }

  private detectExtension(filePath: string): FCStdExt {
    const ext = path.extname(filePath);
    return ext === ".FCStd1" ? ".FCStd1" : ".FCStd";
  }

  // ── Lifecycle ───────────────────────────────────────────────────────────────

  async open(
    filePath: string,
    opts: {
      freecadCmd?: string;
      companionScript?: string;
    } = {},
  ): Promise<AtomicValue<{ filePath: string; format: FCStdExt; pid: number | null }>> {
    const format = this.detectExtension(filePath);

    if (this.isMock) {
      this.openFilePath = filePath;
      log.info(`[FreeCADAutomationBridge] MOCK open: ${filePath} (${format})`);
      return {
        value: { filePath, format, pid: null },
        confidence: 1.0,
        source: "mock",
      };
    }

    const exe = opts.freecadCmd ?? FREECAD_CMD_DEFAULT;
    const script = opts.companionScript ?? COMPANION_SCRIPT_DEFAULT;

    log.info(`[FreeCADAutomationBridge] Spawning: ${exe} ${script}`);
    this.ipc = new FCStdIPCClient();
    this.ipc.spawn(exe, [script]);

    try {
      await this.ipc.waitReady();
    } catch (err) {
      this.ipc.destroy();
      this.ipc = null;
      throw err;
    }

    const resp = await this.ipc.send({
      id: this.nextId(),
      cmd: "open",
      args: { filePath, format },
    });
    if (!resp.ok) throw new Error(`open failed: ${resp.error}`);
    this.openFilePath = filePath;

    return {
      value: { filePath, format, pid: this.ipc.pid },
      confidence: 0.95,
      source: "freecad-python-ipc",
    };
  }

  async getGeometry(): Promise<AtomicValue<FCStdGeometry>> {
    if (this.isMock) {
      return { value: MOCK_GEOMETRY, confidence: 1.0, source: "mock" };
    }
    if (!this.ipc) throw new Error("No open document — call open() first");

    const resp = await this.ipc.send({ id: this.nextId(), cmd: "getGeometry", args: {} });
    if (!resp.ok) throw new Error(`getGeometry failed: ${resp.error}`);

    return {
      value: resp.data as FCStdGeometry,
      confidence: 0.95,
      source: "freecad-python-ipc",
    };
  }

  async getToolpaths(): Promise<AtomicValue<FCStdOperation[]>> {
    const tree = await this.getOperationTree();
    const ops: FCStdOperation[] = [];
    for (const job of tree.value.jobs) {
      for (const tg of job.toolpathGroups) {
        ops.push(...tg.operations);
      }
    }
    return {
      value: ops,
      confidence: tree.confidence,
      source: tree.source,
    };
  }

  async getOperationTree(): Promise<AtomicValue<FCStdOperationTree>> {
    if (this.isMock) {
      return { value: buildMockOperationTree(), confidence: 1.0, source: "mock" };
    }
    if (!this.ipc) throw new Error("No open document — call open() first");

    const resp = await this.ipc.send({ id: this.nextId(), cmd: "getOperationTree", args: {} });
    if (!resp.ok) throw new Error(`getOperationTree failed: ${resp.error}`);

    return {
      value: resp.data as FCStdOperationTree,
      confidence: 0.95,
      source: "freecad-python-ipc",
    };
  }

  async exportSTEP(
    outputPath: string,
  ): Promise<AtomicValue<{ outputPath: string; format: "STEP AP242" }>> {
    if (this.isMock) {
      log.info(`[FreeCADAutomationBridge] MOCK exportSTEP → ${outputPath}`);
      return {
        value: { outputPath, format: "STEP AP242" },
        confidence: 1.0,
        source: "mock",
      };
    }
    if (!this.ipc) throw new Error("No open document — call open() first");

    const resp = await this.ipc.send({
      id: this.nextId(),
      cmd: "exportSTEP",
      args: { outputPath, format: "STEP AP242" },
    });
    if (!resp.ok) throw new Error(`exportSTEP failed: ${resp.error}`);

    return {
      value: { outputPath, format: "STEP AP242" },
      confidence: 0.95,
      source: "freecad-python-ipc",
    };
  }

  async close(): Promise<AtomicValue<{ closed: true; pid: number | null }>> {
    if (this.isMock) {
      this.openFilePath = null;
      return { value: { closed: true, pid: null }, confidence: 1.0, source: "mock" };
    }

    const pid = this.ipc?.pid ?? null;
    if (this.ipc) {
      try {
        await this.ipc.send({ id: this.nextId(), cmd: "close", args: {} }, 3000);
      } catch {
        // best-effort
      }
      this.ipc.destroy();
      this.ipc = null;
    }

    if (pid) {
      // Ensure the FreeCADCmd process is fully gone (destroy kills it but
      // Windows subprocess reaping is sometimes lazy).
      await execFileNoThrow("taskkill", ["/PID", String(pid), "/F"], 5000);
    }

    this.openFilePath = null;
    return { value: { closed: true, pid }, confidence: 1.0, source: "freecad-python-ipc" };
  }

  // Exposed for tests
  get currentFilePath(): string | null {
    return this.openFilePath;
  }
}

// ── Singleton export ──────────────────────────────────────────────────────────

export const freecadAutomationBridge = new FreeCADAutomationBridge();
