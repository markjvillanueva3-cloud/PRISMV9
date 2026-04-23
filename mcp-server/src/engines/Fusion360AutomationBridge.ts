/**
 * Fusion360AutomationBridge — HTTP bridge for Autodesk Fusion 360 (.f3d/.f3z).
 *
 * Fusion 360 exposes automation via an add-in that runs a local HTTP server
 * (default http://127.0.0.1:7540). This bridge issues newline-delimited JSON
 * requests against that add-in and exposes the same lifecycle as the sibling
 * bridges so the CADAutomationRouter (U-CAUT10) can treat all six CAD systems
 * uniformly.
 *
 * Supported file formats: .f3d (primary), .f3z (archive/packed project).
 * Mock mode: set PRISM_CAD_MOCK=1 to bypass HTTP and return fixture data.
 *
 * @engine Fusion360AutomationBridge
 * @shortcode E1303
 * @milestone CAD-AUTOMATION-MS0/U-CAUT06
 */

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

export type F360Ext = ".f3d" | ".f3z";

export interface F360GeometryEntity {
  type: "sketchLine" | "sketchArc" | "sketchSpline" | "bRepFace" | "bRepEdge" | "bRepBody" | "point";
  id: string;
  component: string;
  /** Bounding box [minX,minY,minZ,maxX,maxY,maxZ] in mm */
  bbox?: [number, number, number, number, number, number];
}

export interface F360Geometry {
  sketchLines: F360GeometryEntity[];
  sketchArcs: F360GeometryEntity[];
  sketchSplines: F360GeometryEntity[];
  bRepFaces: F360GeometryEntity[];
  bRepEdges: F360GeometryEntity[];
  bRepBodies: F360GeometryEntity[];
  totalEntities: number;
}

export interface F360Operation {
  index: number;
  name: string;
  /** Fusion CAM operation type: Adaptive2D, Pocket2D, Contour2D, Drill, Bore, Face, etc. */
  opType: string;
  toolDiameter_mm: number;
  toolType: string;
  spindleRpm: number;
  feedRate_mmpm: number;
  isSuppressed: boolean;
}

export interface F360ToolpathGroup {
  name: string;
  operations: F360Operation[];
}

export interface F360Setup {
  name: string;
  stockMaterial: string;
  postProcessor: string;
  toolpathGroups: F360ToolpathGroup[];
}

export interface F360OperationTree {
  setups: F360Setup[];
  totalOperations: number;
}

// ── HTTP protocol ─────────────────────────────────────────────────────────────

interface HTTPCommand {
  id: string;
  cmd: "open" | "getGeometry" | "getToolpaths" | "getOperationTree" | "exportSTEP" | "close";
  args: Record<string, unknown>;
}

interface HTTPResponse {
  id: string;
  ok: boolean;
  data?: unknown;
  error?: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const OP_TIMEOUT_MS = 30_000;
const READY_TIMEOUT_MS = 10_000;
const READY_POLL_INTERVAL_MS = 500;
const F360_DEFAULT_URL = "http://127.0.0.1:7540";
const MOCK_ENV = "PRISM_CAD_MOCK";

// ── Mock fixtures ─────────────────────────────────────────────────────────────

const MOCK_GEOMETRY: F360Geometry = {
  sketchLines: Array.from({ length: 24 }, (_, i) => ({
    type: "sketchLine" as const,
    id: `SL${String(i + 1).padStart(3, "0")}`,
    component: "Component1",
    bbox: [0, 0, 0, 50, 50, 0] as [number, number, number, number, number, number],
  })),
  sketchArcs: Array.from({ length: 6 }, (_, i) => ({
    type: "sketchArc" as const,
    id: `SA${String(i + 1).padStart(3, "0")}`,
    component: "Component1",
  })),
  sketchSplines: [
    { type: "sketchSpline" as const, id: "SP001", component: "Component1" },
  ],
  bRepFaces: Array.from({ length: 12 }, (_, i) => ({
    type: "bRepFace" as const,
    id: `F${String(i + 1).padStart(3, "0")}`,
    component: "Component1",
  })),
  bRepEdges: Array.from({ length: 24 }, (_, i) => ({
    type: "bRepEdge" as const,
    id: `E${String(i + 1).padStart(3, "0")}`,
    component: "Component1",
  })),
  bRepBodies: [
    { type: "bRepBody" as const, id: "B001", component: "Component1" },
  ],
  totalEntities: 68,
};

function buildMockOperationTree(): F360OperationTree {
  const ops: F360Operation[] = Array.from({ length: 22 }, (_, i) => ({
    index: i,
    name: `Op_${i + 1}`,
    opType: [
      "Adaptive2D",
      "Pocket2D",
      "Contour2D",
      "Drill",
      "Bore",
      "Face",
    ][i % 6],
    toolDiameter_mm: [6, 8, 10, 12, 16][i % 5],
    toolType: ["endmill", "ballnose", "drill", "bullnose", "face_mill"][i % 5],
    spindleRpm: 10000 + i * 200,
    feedRate_mmpm: 1500 + i * 80,
    isSuppressed: false,
  }));

  return {
    setups: [
      {
        name: "Setup1",
        stockMaterial: "6061-T6 Aluminum",
        postProcessor: "haas_next_generation",
        toolpathGroups: [
          { name: "2D Roughing", operations: ops.slice(0, 8) },
          { name: "3D Roughing", operations: ops.slice(8, 14) },
          { name: "Finishing", operations: ops.slice(14, 22) },
        ],
      },
    ],
    totalOperations: 22,
  };
}

// ── HTTP client (uses built-in fetch — Node 18+) ─────────────────────────────

interface HTTPClient {
  post(url: string, body: HTTPCommand, timeoutMs: number): Promise<HTTPResponse>;
  ping(url: string): Promise<boolean>;
}

function defaultHTTPClient(): HTTPClient {
  return {
    post: async (url, body, timeoutMs) => {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), timeoutMs);
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
          signal: ctrl.signal,
        });
        const text = await res.text();
        try {
          return JSON.parse(text) as HTTPResponse;
        } catch {
          return { id: body.id, ok: false, error: `Non-JSON response: ${text.slice(0, 200)}` };
        }
      } catch (err: any) {
        return { id: body.id, ok: false, error: String(err?.message ?? err) };
      } finally {
        clearTimeout(timer);
      }
    },
    ping: async (url) => {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 2000);
      try {
        const res = await fetch(`${url}/ping`, { signal: ctrl.signal });
        return res.ok;
      } catch {
        return false;
      } finally {
        clearTimeout(timer);
      }
    },
  };
}

// ── Engine ────────────────────────────────────────────────────────────────────

export class Fusion360AutomationBridge {
  private baseUrl = F360_DEFAULT_URL;
  private openFilePath: string | null = null;
  private idSeq = 0;
  private http: HTTPClient;

  constructor(http?: HTTPClient) {
    this.http = http ?? defaultHTTPClient();
  }

  private get isMock(): boolean {
    return process.env[MOCK_ENV] === "1";
  }

  private nextId(): string {
    return `f360-${++this.idSeq}-${Date.now()}`;
  }

  private detectExtension(filePath: string): F360Ext {
    return path.extname(filePath) === ".f3z" ? ".f3z" : ".f3d";
  }

  // ── Lifecycle ───────────────────────────────────────────────────────────────

  async open(
    filePath: string,
    opts: { baseUrl?: string } = {},
  ): Promise<AtomicValue<{ filePath: string; format: F360Ext; baseUrl: string | null }>> {
    const format = this.detectExtension(filePath);

    if (this.isMock) {
      this.openFilePath = filePath;
      log.info(`[Fusion360AutomationBridge] MOCK open: ${filePath} (${format})`);
      return {
        value: { filePath, format, baseUrl: null },
        confidence: 1.0,
        source: "mock",
      };
    }

    this.baseUrl = opts.baseUrl ?? F360_DEFAULT_URL;
    log.info(`[Fusion360AutomationBridge] Probing add-in at ${this.baseUrl}`);

    // Wait until the Fusion add-in is reachable.
    const readyDeadline = Date.now() + READY_TIMEOUT_MS;
    let reachable = false;
    while (Date.now() < readyDeadline) {
      if (await this.http.ping(this.baseUrl)) {
        reachable = true;
        break;
      }
      await new Promise((r) => setTimeout(r, READY_POLL_INTERVAL_MS));
    }
    if (!reachable) {
      throw new Error(
        `[Fusion360AutomationBridge] Fusion add-in not reachable at ${this.baseUrl} after ${READY_TIMEOUT_MS}ms`,
      );
    }

    const resp = await this.http.post(
      `${this.baseUrl}/rpc`,
      { id: this.nextId(), cmd: "open", args: { filePath, format } },
      OP_TIMEOUT_MS,
    );
    if (!resp.ok) throw new Error(`open failed: ${resp.error}`);
    this.openFilePath = filePath;

    return {
      value: { filePath, format, baseUrl: this.baseUrl },
      confidence: 0.95,
      source: "fusion360-http",
    };
  }

  async getGeometry(): Promise<AtomicValue<F360Geometry>> {
    if (this.isMock) {
      return { value: MOCK_GEOMETRY, confidence: 1.0, source: "mock" };
    }
    if (!this.openFilePath) throw new Error("No open document — call open() first");

    const resp = await this.http.post(
      `${this.baseUrl}/rpc`,
      { id: this.nextId(), cmd: "getGeometry", args: {} },
      OP_TIMEOUT_MS,
    );
    if (!resp.ok) throw new Error(`getGeometry failed: ${resp.error}`);
    return {
      value: resp.data as F360Geometry,
      confidence: 0.95,
      source: "fusion360-http",
    };
  }

  async getToolpaths(): Promise<AtomicValue<F360Operation[]>> {
    const tree = await this.getOperationTree();
    const ops: F360Operation[] = [];
    for (const setup of tree.value.setups) {
      for (const tg of setup.toolpathGroups) {
        ops.push(...tg.operations);
      }
    }
    return { value: ops, confidence: tree.confidence, source: tree.source };
  }

  async getOperationTree(): Promise<AtomicValue<F360OperationTree>> {
    if (this.isMock) {
      return { value: buildMockOperationTree(), confidence: 1.0, source: "mock" };
    }
    if (!this.openFilePath) throw new Error("No open document — call open() first");

    const resp = await this.http.post(
      `${this.baseUrl}/rpc`,
      { id: this.nextId(), cmd: "getOperationTree", args: {} },
      OP_TIMEOUT_MS,
    );
    if (!resp.ok) throw new Error(`getOperationTree failed: ${resp.error}`);
    return {
      value: resp.data as F360OperationTree,
      confidence: 0.95,
      source: "fusion360-http",
    };
  }

  async exportSTEP(
    outputPath: string,
  ): Promise<AtomicValue<{ outputPath: string; format: "STEP AP242" }>> {
    if (this.isMock) {
      log.info(`[Fusion360AutomationBridge] MOCK exportSTEP → ${outputPath}`);
      return {
        value: { outputPath, format: "STEP AP242" },
        confidence: 1.0,
        source: "mock",
      };
    }
    if (!this.openFilePath) throw new Error("No open document — call open() first");

    const resp = await this.http.post(
      `${this.baseUrl}/rpc`,
      { id: this.nextId(), cmd: "exportSTEP", args: { outputPath, format: "STEP AP242" } },
      OP_TIMEOUT_MS,
    );
    if (!resp.ok) throw new Error(`exportSTEP failed: ${resp.error}`);

    return {
      value: { outputPath, format: "STEP AP242" },
      confidence: 0.95,
      source: "fusion360-http",
    };
  }

  async close(): Promise<AtomicValue<{ closed: true; baseUrl: string | null }>> {
    if (this.isMock) {
      this.openFilePath = null;
      return { value: { closed: true, baseUrl: null }, confidence: 1.0, source: "mock" };
    }

    const base = this.baseUrl;
    if (this.openFilePath) {
      try {
        await this.http.post(
          `${base}/rpc`,
          { id: this.nextId(), cmd: "close", args: {} },
          3000,
        );
      } catch {
        // best-effort
      }
    }
    this.openFilePath = null;
    return { value: { closed: true, baseUrl: base }, confidence: 1.0, source: "fusion360-http" };
  }

  // Test helpers
  get currentFilePath(): string | null {
    return this.openFilePath;
  }
  get currentBaseUrl(): string {
    return this.baseUrl;
  }
}

// ── Singleton export ──────────────────────────────────────────────────────────

export const fusion360AutomationBridge = new Fusion360AutomationBridge();
