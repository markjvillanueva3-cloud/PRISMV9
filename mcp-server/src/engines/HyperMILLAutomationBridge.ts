/**
 * HyperMILLAutomationBridge — OPEN MIND AutomationCenter (AC) bridge for .hmc
 *
 * Thin orchestration layer over the existing hyperMILL AC infrastructure:
 *   - HyperMillACConnectionManager  (session + health)
 *   - HyperMillACScriptExecutor     (sandboxed Python script execution)
 *   - HyperMillCodeGeneratorEngine  (script templating)
 *
 * This bridge does NOT re-implement AC protocol; it composes the above into
 * the same open/getGeometry/getToolpaths/getOperationTree/exportSTEP/close
 * surface as the sibling bridges (SolidWorks/Inventor/FreeCAD/Mastercam/Fusion360)
 * so the CADAutomationRouter (U-CAUT10) can dispatch all six uniformly.
 *
 * Supported file formats: .hmc (primary hyperMILL project container).
 * Mock mode: set PRISM_CAD_MOCK=1 to bypass AC and return fixture data.
 *
 * @engine HyperMILLAutomationBridge
 * @shortcode E1304
 * @milestone CAD-AUTOMATION-MS0/U-CAUT07
 */

import * as path from "node:path";
import { log } from "../utils/Logger.js";
import { HyperMillACConnectionManager } from "./HyperMillACConnectionManager.js";
import { HyperMillACScriptExecutor } from "./HyperMillACScriptExecutor.js";

// ── AtomicValue<T> ────────────────────────────────────────────────────────────

export interface AtomicValue<T> {
  value: T;
  confidence: number;
  source: string;
  warning?: string;
}

// ── Domain types ──────────────────────────────────────────────────────────────

export type HMCExt = ".hmc";

export interface HMCGeometryEntity {
  type: "curve" | "surface" | "solid" | "point";
  id: string;
  feature: string;
  bbox?: [number, number, number, number, number, number];
}

export interface HMCGeometry {
  curves: HMCGeometryEntity[];
  surfaces: HMCGeometryEntity[];
  solids: HMCGeometryEntity[];
  points: HMCGeometryEntity[];
  totalEntities: number;
}

export interface HMCOperation {
  index: number;
  name: string;
  /** hyperMILL cycle code, e.g. "3DPocketRoughing", "5AxisSwarf", "MirrorProbe". */
  cycleCode: string;
  toolDiameter_mm: number;
  toolType: string;
  spindleRpm: number;
  feedRate_mmpm: number;
  isEnabled: boolean;
}

export interface HMCJobList {
  name: string;
  operations: HMCOperation[];
}

export interface HMCJob {
  name: string;
  machineDefinition: string;
  postProcessor: string;
  jobLists: HMCJobList[];
}

export interface HMCOperationTree {
  jobs: HMCJob[];
  totalOperations: number;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const MOCK_ENV = "PRISM_CAD_MOCK";
const DEFAULT_AC_HOST = "127.0.0.1";
const DEFAULT_AC_PORT = 18365;

// ── Mock fixtures ─────────────────────────────────────────────────────────────

const MOCK_GEOMETRY: HMCGeometry = {
  curves: Array.from({ length: 36 }, (_, i) => ({
    type: "curve" as const,
    id: `Curve${String(i + 1).padStart(3, "0")}`,
    feature: "OuterProfile",
    bbox: [0, 0, 0, 120, 80, 0] as [number, number, number, number, number, number],
  })),
  surfaces: Array.from({ length: 18 }, (_, i) => ({
    type: "surface" as const,
    id: `Surface${String(i + 1).padStart(3, "0")}`,
    feature: "Core",
  })),
  solids: [
    { type: "solid" as const, id: "Body_Core", feature: "Core" },
    { type: "solid" as const, id: "Body_Cavity", feature: "Cavity" },
  ],
  points: [],
  totalEntities: 56,
};

function buildMockOperationTree(): HMCOperationTree {
  const cycles = [
    "3DPocketRoughing",
    "3DZLevel",
    "3DSurface",
    "5AxisSwarf",
    "5AxisTilt",
    "MillingFinishing",
    "DrillCycle",
    "TappingCycle",
  ];
  const ops: HMCOperation[] = Array.from({ length: 32 }, (_, i) => ({
    index: i,
    name: `Op_${i + 1}`,
    cycleCode: cycles[i % cycles.length],
    toolDiameter_mm: [6, 8, 10, 12, 16, 20][i % 6],
    toolType: ["endmill", "ballnose", "torus", "drill", "tap", "facemill"][i % 6],
    spindleRpm: 8000 + i * 250,
    feedRate_mmpm: 1400 + i * 80,
    isEnabled: true,
  }));

  return {
    jobs: [
      {
        name: "Job_Core",
        machineDefinition: "DMG MORI DMU 50",
        postProcessor: "heidenhain_tnc640",
        jobLists: [
          { name: "Roughing", operations: ops.slice(0, 10) },
          { name: "Finishing", operations: ops.slice(10, 22) },
          { name: "5-Axis", operations: ops.slice(22, 32) },
        ],
      },
    ],
    totalOperations: 32,
  };
}

// ── Engine ────────────────────────────────────────────────────────────────────

export class HyperMILLAutomationBridge {
  private conn: HyperMillACConnectionManager;
  private exec: HyperMillACScriptExecutor;
  private openFilePath: string | null = null;
  private sessionActive = false;

  constructor(opts: {
    acHost?: string;
    acPort?: number;
    conn?: HyperMillACConnectionManager;
    exec?: HyperMillACScriptExecutor;
  } = {}) {
    const host = opts.acHost ?? DEFAULT_AC_HOST;
    const port = opts.acPort ?? DEFAULT_AC_PORT;
    const mockMode = process.env[MOCK_ENV] === "1";

    this.conn =
      opts.conn ??
      new HyperMillACConnectionManager({ host, port, mockMode });
    this.exec =
      opts.exec ??
      new HyperMillACScriptExecutor({ mockMode, acHost: host, acPort: port });
  }

  private get isMock(): boolean {
    return process.env[MOCK_ENV] === "1";
  }

  private detectExtension(filePath: string): HMCExt {
    const ext = path.extname(filePath).toLowerCase();
    if (ext !== ".hmc") {
      log.warn(
        `[HyperMILLAutomationBridge] Unexpected extension '${ext}' — treating as .hmc`,
      );
    }
    return ".hmc";
  }

  // ── Lifecycle ───────────────────────────────────────────────────────────────

  async open(
    filePath: string,
    _opts: { acHost?: string; acPort?: number } = {},
  ): Promise<AtomicValue<{ filePath: string; format: HMCExt; sessionId: string | null }>> {
    const format = this.detectExtension(filePath);

    if (this.isMock) {
      this.openFilePath = filePath;
      this.sessionActive = true;
      log.info(`[HyperMILLAutomationBridge] MOCK open: ${filePath}`);
      return {
        value: { filePath, format, sessionId: null },
        confidence: 1.0,
        source: "mock",
      };
    }

    const connectResult = await this.conn.connect();
    if (!connectResult.connected) {
      throw new Error(
        `[HyperMILLAutomationBridge] AC connect failed: ${connectResult.message}`,
      );
    }

    const openScript =
      `# prism-open\n` +
      `import prism_ac as prism\n` +
      `prism.open_project(${JSON.stringify(filePath)})\n`;

    const exec = await this.exec.execute(openScript, { filePath });
    if (!exec.success) {
      throw new Error(`open failed: ${exec.error ?? exec.stderr}`);
    }

    this.openFilePath = filePath;
    this.sessionActive = true;

    return {
      value: { filePath, format, sessionId: connectResult.sessionId ?? null },
      confidence: 0.95,
      source: "hypermill-ac",
    };
  }

  async getGeometry(): Promise<AtomicValue<HMCGeometry>> {
    if (this.isMock) {
      return { value: MOCK_GEOMETRY, confidence: 1.0, source: "mock" };
    }
    this.assertOpen();

    const script =
      `# prism-get-geometry\n` +
      `import prism_ac as prism\n` +
      `print(prism.geometry_json())\n`;

    const exec = await this.exec.execute(script);
    if (!exec.success) throw new Error(`getGeometry failed: ${exec.error ?? exec.stderr}`);
    const parsed = safeParseJson<HMCGeometry>(exec.stdout);
    if (!parsed) throw new Error("getGeometry: AC stdout did not parse as HMCGeometry JSON");

    return { value: parsed, confidence: 0.95, source: "hypermill-ac" };
  }

  async getToolpaths(): Promise<AtomicValue<HMCOperation[]>> {
    const tree = await this.getOperationTree();
    const ops: HMCOperation[] = [];
    for (const job of tree.value.jobs) {
      for (const list of job.jobLists) {
        ops.push(...list.operations);
      }
    }
    return { value: ops, confidence: tree.confidence, source: tree.source };
  }

  async getOperationTree(): Promise<AtomicValue<HMCOperationTree>> {
    if (this.isMock) {
      return { value: buildMockOperationTree(), confidence: 1.0, source: "mock" };
    }
    this.assertOpen();

    const script =
      `# prism-get-operation-tree\n` +
      `import prism_ac as prism\n` +
      `print(prism.operation_tree_json())\n`;

    const exec = await this.exec.execute(script);
    if (!exec.success) throw new Error(`getOperationTree failed: ${exec.error ?? exec.stderr}`);
    const parsed = safeParseJson<HMCOperationTree>(exec.stdout);
    if (!parsed) {
      throw new Error("getOperationTree: AC stdout did not parse as HMCOperationTree JSON");
    }

    return { value: parsed, confidence: 0.95, source: "hypermill-ac" };
  }

  async exportSTEP(
    outputPath: string,
  ): Promise<AtomicValue<{ outputPath: string; format: "STEP AP242" }>> {
    if (this.isMock) {
      log.info(`[HyperMILLAutomationBridge] MOCK exportSTEP → ${outputPath}`);
      return {
        value: { outputPath, format: "STEP AP242" },
        confidence: 1.0,
        source: "mock",
      };
    }
    this.assertOpen();

    const script =
      `# prism-export-step\n` +
      `import prism_ac as prism\n` +
      `prism.export_step(${JSON.stringify(outputPath)}, format="AP242")\n`;

    const exec = await this.exec.execute(script, { outputPath });
    if (!exec.success) throw new Error(`exportSTEP failed: ${exec.error ?? exec.stderr}`);

    return {
      value: { outputPath, format: "STEP AP242" },
      confidence: 0.95,
      source: "hypermill-ac",
    };
  }

  async close(): Promise<AtomicValue<{ closed: true; sessionClosed: boolean }>> {
    if (this.isMock) {
      this.openFilePath = null;
      this.sessionActive = false;
      return { value: { closed: true, sessionClosed: true }, confidence: 1.0, source: "mock" };
    }

    if (this.sessionActive) {
      const script =
        `# prism-close\n` +
        `import prism_ac as prism\n` +
        `prism.close_project()\n`;
      try {
        await this.exec.execute(script);
      } catch {
        // best-effort
      }
    }
    const discRes = this.conn.disconnect();
    this.openFilePath = null;
    this.sessionActive = false;

    return {
      value: { closed: true, sessionClosed: discRes.disconnected },
      confidence: 1.0,
      source: "hypermill-ac",
    };
  }

  private assertOpen(): void {
    if (!this.sessionActive) throw new Error("No open document — call open() first");
  }

  // Exposed for tests
  get currentFilePath(): string | null {
    return this.openFilePath;
  }
  get isSessionActive(): boolean {
    return this.sessionActive;
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function safeParseJson<T>(s: string): T | null {
  try {
    const trimmed = s.trim();
    if (!trimmed) return null;
    return JSON.parse(trimmed) as T;
  } catch {
    return null;
  }
}

// ── Singleton export ──────────────────────────────────────────────────────────

export const hypermillAutomationBridge = new HyperMILLAutomationBridge();
