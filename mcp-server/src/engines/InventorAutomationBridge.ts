/**
 * InventorAutomationBridge — COM-based Autodesk Inventor geometry/tree bridge (E2480)
 *
 * Spawns InventorBridge.exe (C# COM host) as a long-lived child process and
 * communicates via newline-delimited JSON (NDJSON) over stdin/stdout.
 *
 * Supported file types: .ipt (parts), .iam (assemblies), .idw (drawings)
 * Handles iAssembly / iPart part-number-driven variants (iMate, iLogic detection).
 *
 * This is the CAD-geometry side. For CAM/G-code generation see:
 * InventorCAMCodeGeneratorEngine (E2401) — do NOT duplicate.
 *
 * Duplication check performed: keywords [inventor, bridge, automation, com]
 *   → InventorCAM* engines are CAM-focused; this engine is CAD geometry extraction.
 *   → No existing InventorAutomationBridge found. Proceeding.
 *
 * @engine InventorAutomationBridge
 * @shortcode E2480
 * @milestone CAD-AUTOMATION-MS0/U-CAUT03
 */

import { spawn, ChildProcess } from "child_process";
import { log } from "../utils/Logger.js";

// ── Constants ───────────────────────────────────────────────────────────────

const BRIDGE_EXE = process.env["INVENTOR_BRIDGE_EXE"] ?? "InventorBridge.exe";
const COMMAND_TIMEOUT_MS = 60_000;
const MOCK_MODE = process.env["PRISM_CAD_MOCK"] === "1";

// ── AtomicValue ─────────────────────────────────────────────────────────────

export interface AtomicValue<T> {
  value: T;
  confidence: number; // 0–1
  source: string;
  warning?: string;
}

// ── Domain Types ────────────────────────────────────────────────────────────

export interface InventorParameter {
  name: string;
  value: number | string;
  unit: string;
  expression: string;
  isKey: boolean;
  isILogic: boolean;
}

export interface InventorIProperty {
  set: string;
  name: string;
  value: string | number;
}

export interface InventorParameters {
  modelParameters: InventorParameter[];
  iProperties: InventorIProperty[];
  iAssemblyMember: boolean;
  iPartMember: boolean;
  hasIMate: boolean;
  hasILogic: boolean;
  partNumber: string;
  revision: string;
  material: string;
}

export interface FeatureNode {
  index: number;
  name: string;
  type: string;
  suppressed: boolean;
  healthStatus: "healthy" | "warning" | "error" | "unknown";
  children: FeatureNode[];
}

export interface InventorModelTree {
  rootName: string;
  fileType: "ipt" | "iam" | "idw" | "unknown";
  featureCount: number;
  features: FeatureNode[];
  components: string[]; // assembly sub-component names
}

export interface MassProperties {
  mass: number;          // kg
  volume: number;        // mm³
  centerOfMass: [number, number, number]; // mm [x, y, z]
  momentsOfInertia: {
    Ixx: number;
    Iyy: number;
    Izz: number;
    Ixy: number;
    Iyz: number;
    Ixz: number;
  };
  densityUsed: number;   // kg/mm³
}

// ── Bridge Protocol ─────────────────────────────────────────────────────────

interface BridgeRequest {
  id: string;
  cmd: "open" | "getParameters" | "getModelTree" | "exportSTEP" | "getMassProperties" | "close";
  args: Record<string, unknown>;
}

interface BridgeResponse {
  id: string;
  ok: boolean;
  data?: unknown;
  error?: string;
}

// ── Mock Fixtures ───────────────────────────────────────────────────────────

const MOCK_PARAMETERS: InventorParameters = {
  modelParameters: [
    { name: "d0", value: 25.4, unit: "mm", expression: "25.4 mm", isKey: true, isILogic: false },
    { name: "d1", value: 50.8, unit: "mm", expression: "d0 * 2", isKey: true, isILogic: false },
    { name: "thickness", value: 6.35, unit: "mm", expression: "6.35 mm", isKey: false, isILogic: false },
  ],
  iProperties: [
    { set: "Design Tracking Properties", name: "Part Number", value: "JM-MOCK-001" },
    { set: "Design Tracking Properties", name: "Revision Number", value: "A" },
    { set: "Summary Information", name: "Author", value: "JM Die" },
    { set: "Project", name: "Material", value: "M2 Tool Steel" },
  ],
  iAssemblyMember: false,
  iPartMember: false,
  hasIMate: false,
  hasILogic: false,
  partNumber: "JM-MOCK-001",
  revision: "A",
  material: "M2 Tool Steel",
};

const MOCK_MODEL_TREE: InventorModelTree = {
  rootName: "mock_part",
  fileType: "ipt",
  featureCount: 4,
  features: [
    {
      index: 0, name: "Extrusion1", type: "Extrude", suppressed: false, healthStatus: "healthy",
      children: [],
    },
    {
      index: 1, name: "Fillet1", type: "Fillet", suppressed: false, healthStatus: "healthy",
      children: [],
    },
    {
      index: 2, name: "Hole1", type: "Hole", suppressed: false, healthStatus: "healthy",
      children: [],
    },
    {
      index: 3, name: "ChamferPattern1", type: "RectangularPattern", suppressed: false, healthStatus: "healthy",
      children: [],
    },
  ],
  components: [],
};

const MOCK_MASS_PROPERTIES: MassProperties = {
  mass: 0.3124,
  volume: 39_847.2,
  centerOfMass: [12.7, 25.4, 3.175],
  momentsOfInertia: { Ixx: 1234.5, Iyy: 987.3, Izz: 2345.6, Ixy: -12.1, Iyz: 5.3, Ixz: -8.7 },
  densityUsed: 7.84e-6,
};

// ── Main Class ──────────────────────────────────────────────────────────────

export class InventorAutomationBridge {
  private proc: ChildProcess | null = null;
  private pendingRequests = new Map<
    string,
    { resolve: (v: BridgeResponse) => void; reject: (e: Error) => void; timer: ReturnType<typeof setTimeout> }
  >();
  private lineBuffer = "";
  private requestCounter = 0;

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  /**
   * Opens an Inventor document (.ipt/.iam/.idw).
   * In mock mode returns a fixture immediately.
   */
  async open(filePath: string): Promise<AtomicValue<{ opened: boolean; filePath: string }>> {
    if (MOCK_MODE) {
      return { value: { opened: true, filePath }, confidence: 1.0, source: "mock" };
    }
    await this.ensureProcess();
    const resp = await this.send({ cmd: "open", args: { filePath } });
    return {
      value: { opened: true, filePath },
      confidence: 0.99,
      source: "inventor-com",
      warning: resp.data ? undefined : "No data returned from bridge",
    };
  }

  /**
   * Extracts iProperties and model parameters from the active document.
   */
  async getParameters(): Promise<AtomicValue<InventorParameters>> {
    if (MOCK_MODE) {
      return { value: MOCK_PARAMETERS, confidence: 1.0, source: "mock" };
    }
    await this.ensureProcess();
    const resp = await this.send({ cmd: "getParameters", args: {} });
    return { value: resp.data as InventorParameters, confidence: 0.95, source: "inventor-com" };
  }

  /**
   * Returns the Inventor feature tree as normalized JSON.
   * Assembly sub-components listed in .components[].
   */
  async getModelTree(): Promise<AtomicValue<InventorModelTree>> {
    if (MOCK_MODE) {
      return { value: MOCK_MODEL_TREE, confidence: 1.0, source: "mock" };
    }
    await this.ensureProcess();
    const resp = await this.send({ cmd: "getModelTree", args: {} });
    return { value: resp.data as InventorModelTree, confidence: 0.95, source: "inventor-com" };
  }

  /**
   * Exports the active document to STEP AP214/AP242.
   * @param outputPath — full path for the .stp file
   */
  async exportSTEP(outputPath: string): Promise<AtomicValue<{ exported: boolean; outputPath: string; format: string }>> {
    if (MOCK_MODE) {
      return {
        value: { exported: true, outputPath, format: "AP214" },
        confidence: 1.0,
        source: "mock",
      };
    }
    await this.ensureProcess();
    const resp = await this.send({ cmd: "exportSTEP", args: { outputPath } });
    const data = resp.data as { format?: string } | undefined;
    return {
      value: { exported: true, outputPath, format: data?.format ?? "AP214" },
      confidence: 0.99,
      source: "inventor-com",
    };
  }

  /**
   * Returns mass properties: mass (kg), volume (mm³), center of mass, moments of inertia.
   */
  async getMassProperties(): Promise<AtomicValue<MassProperties>> {
    if (MOCK_MODE) {
      return { value: MOCK_MASS_PROPERTIES, confidence: 1.0, source: "mock" };
    }
    await this.ensureProcess();
    const resp = await this.send({ cmd: "getMassProperties", args: {} });
    return { value: resp.data as MassProperties, confidence: 0.97, source: "inventor-com" };
  }

  /**
   * Closes the active document and releases COM references.
   * Always call this when done — prevents Inventor ghost processes.
   */
  async close(): Promise<AtomicValue<{ closed: boolean }>> {
    if (MOCK_MODE) {
      return { value: { closed: true }, confidence: 1.0, source: "mock" };
    }
    if (!this.proc) {
      return { value: { closed: true }, confidence: 1.0, source: "inventor-com", warning: "No process to close" };
    }
    try {
      await this.send({ cmd: "close", args: {} });
    } catch {
      // Best-effort; still kill the process below
    }
    this.killProcess();
    return { value: { closed: true }, confidence: 1.0, source: "inventor-com" };
  }

  // ── Internal helpers ──────────────────────────────────────────────────────

  private async ensureProcess(): Promise<void> {
    if (this.proc && !this.proc.killed) return;

    log.info(`[InventorBridge] Spawning ${BRIDGE_EXE}`);
    this.proc = spawn(BRIDGE_EXE, [], {
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
    });

    this.proc.stdout!.setEncoding("utf8");
    this.proc.stdout!.on("data", (chunk: string) => this.handleChunk(chunk));

    this.proc.stderr!.setEncoding("utf8");
    this.proc.stderr!.on("data", (msg: string) => {
      log.warn(`[InventorBridge] stderr: ${msg.trim()}`);
    });

    this.proc.on("exit", (code) => {
      log.info(`[InventorBridge] Process exited: code=${code}`);
      this.rejectAllPending(new Error(`InventorBridge process exited (code=${code})`));
      this.proc = null;
    });

    this.proc.on("error", (err) => {
      log.error(`[InventorBridge] Spawn error: ${err.message}`);
      this.rejectAllPending(err);
      this.proc = null;
    });
  }

  private handleChunk(chunk: string): void {
    this.lineBuffer += chunk;
    const lines = this.lineBuffer.split("\n");
    this.lineBuffer = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const resp = JSON.parse(trimmed) as BridgeResponse;
        const pending = this.pendingRequests.get(resp.id);
        if (!pending) continue;
        clearTimeout(pending.timer);
        this.pendingRequests.delete(resp.id);
        if (resp.ok) {
          pending.resolve(resp);
        } else {
          pending.reject(new Error(resp.error ?? "InventorBridge command failed"));
        }
      } catch (err) {
        log.warn(`[InventorBridge] Bad JSON line: ${trimmed}`);
      }
    }
  }

  private send(payload: Omit<BridgeRequest, "id">): Promise<BridgeResponse> {
    return new Promise((resolve, reject) => {
      const id = `req-${++this.requestCounter}`;
      const req: BridgeRequest = { id, ...payload };

      const timer = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`InventorBridge timeout (${COMMAND_TIMEOUT_MS}ms) for cmd="${payload.cmd}"`));
      }, COMMAND_TIMEOUT_MS);

      this.pendingRequests.set(id, { resolve, reject, timer });

      const line = JSON.stringify(req) + "\n";
      if (!this.proc?.stdin?.writable) {
        clearTimeout(timer);
        this.pendingRequests.delete(id);
        reject(new Error("InventorBridge stdin not writable"));
        return;
      }
      this.proc.stdin.write(line);
    });
  }

  private rejectAllPending(err: Error): void {
    this.pendingRequests.forEach((pending) => {
      clearTimeout(pending.timer);
      pending.reject(err);
    });
    this.pendingRequests.clear();
  }

  private killProcess(): void {
    if (!this.proc) return;
    try {
      // Kill the entire process tree (Windows: taskkill; POSIX: SIGKILL)
      if (process.platform === "win32") {
        spawn("taskkill", ["/PID", String(this.proc.pid), "/T", "/F"], { stdio: "ignore" });
      } else {
        this.proc.kill("SIGKILL");
      }
    } catch {
      // Ignore kill errors
    }
    this.proc = null;
  }
}

// ── Singleton ────────────────────────────────────────────────────────────────

export const inventorAutomationBridge = new InventorAutomationBridge();
