/**
 * CADAutomationRouter — unified format→bridge selector for CAD automation.
 *
 * Callers pass any CAD file path and get a single, uniform API surface
 * (open / getGeometry / getToolpaths / getOperationTree / exportSTEP / close)
 * regardless of which of the six underlying bridges (SolidWorks, Inventor,
 * FreeCAD, Mastercam, Fusion 360, hyperMILL) actually services the call.
 *
 * The router:
 *   - resolves a file's extension to the correct bridge
 *   - owns an open-session map so subsequent calls route to the same bridge
 *   - returns a common CADEnvelope<T> shape (normalized AtomicValue) so the
 *     MCP dispatcher (U-CAUT11) can wire a single set of actions to all six
 *   - short-circuits to CADAutomationMockLayer (U-CAUT09) in PRISM_CAD_MOCK=1
 *     mode when the caller asks for a fingerprinted fixture rather than a
 *     live bridge round-trip (used by U-CAUT12 integration smoke)
 *
 * @engine CADAutomationRouter
 * @shortcode E1307
 * @milestone CAD-AUTOMATION-MS0/U-CAUT10
 */

import * as path from "node:path";
import { log } from "../utils/Logger.js";
import {
  cadAutomationMockLayer,
  type SupportedCADExt,
} from "./CADAutomationMockLayer.js";

// Bridges
import { solidWorksAutomationBridge } from "./SolidWorksAutomationBridge.js";
import { inventorAutomationBridge } from "./InventorAutomationBridge.js";
import { freecadAutomationBridge } from "./FreeCADAutomationBridge.js";
import { mastercamAutomationBridge } from "./MastercamAutomationBridge.js";
import { fusion360AutomationBridge } from "./Fusion360AutomationBridge.js";
import { hypermillAutomationBridge } from "./HyperMILLAutomationBridge.js";

// ── Types ─────────────────────────────────────────────────────────────────────

export type CADBridgeKind =
  | "solidworks"
  | "inventor"
  | "freecad"
  | "mastercam"
  | "fusion360"
  | "hypermill";

export interface CADEnvelope<T> {
  value: T;
  confidence: number;
  source: string;
  warning?: string;
  bridge: CADBridgeKind;
  ext: SupportedCADExt;
}

export interface CADRoutingDecision {
  bridge: CADBridgeKind;
  ext: SupportedCADExt;
  filePath: string;
}

/** Common return shape for getGeometry across all bridges. */
export interface NormalizedGeometry {
  curves: number;
  surfaces: number;
  solids: number;
  points: number;
  totalEntities: number;
}

/** Common return shape for getOperationTree across all bridges. */
export interface NormalizedOperationTree {
  jobCount: number;
  totalOperations: number;
  cyclePalette: ReadonlyArray<string>;
}

export interface NormalizedToolpathOp {
  index: number;
  cycleCode: string;
  toolDiameter_mm: number;
  spindleRpm: number;
  feedRate_mmpm: number;
}

// ── Extension → bridge mapping ────────────────────────────────────────────────

const EXT_TO_BRIDGE: Record<SupportedCADExt, CADBridgeKind> = {
  ".sldprt": "solidworks",
  ".sldasm": "solidworks",
  ".ipt": "inventor",
  ".iam": "inventor",
  ".FCStd": "freecad",
  ".FCStd1": "freecad",
  ".mcam": "mastercam",
  ".mcx": "mastercam",
  ".mcx-8": "mastercam",
  ".f3d": "fusion360",
  ".f3z": "fusion360",
  ".hmc": "hypermill",
};

const LOWER_EXT_TO_CANONICAL: Record<string, SupportedCADExt> = (() => {
  const out: Record<string, SupportedCADExt> = {};
  for (const ext of Object.keys(EXT_TO_BRIDGE) as SupportedCADExt[]) {
    out[ext.toLowerCase()] = ext;
  }
  return out;
})();

// ── Router ────────────────────────────────────────────────────────────────────

export class CADAutomationRouter {
  /** Tracks which bridge each open file path is being served by. */
  private openSessions = new Map<string, { bridge: CADBridgeKind; ext: SupportedCADExt }>();

  private get isMock(): boolean {
    return process.env["PRISM_CAD_MOCK"] === "1";
  }

  /** Resolve a file path to a routing decision, without opening anything. */
  route(filePath: string): CADRoutingDecision {
    const rawExt = path.extname(filePath);
    const canonical = LOWER_EXT_TO_CANONICAL[rawExt.toLowerCase()];
    if (!canonical) {
      throw new Error(
        `[CADAutomationRouter] Unsupported CAD extension '${rawExt}' for ${filePath}. ` +
          `Supported: ${Object.keys(EXT_TO_BRIDGE).join(", ")}`,
      );
    }
    return { bridge: EXT_TO_BRIDGE[canonical], ext: canonical, filePath };
  }

  listSupportedExtensions(): SupportedCADExt[] {
    return Object.keys(EXT_TO_BRIDGE) as SupportedCADExt[];
  }

  supportsExtension(ext: string): boolean {
    return Object.prototype.hasOwnProperty.call(
      LOWER_EXT_TO_CANONICAL,
      ext.toLowerCase(),
    );
  }

  // ── Lifecycle ───────────────────────────────────────────────────────────────

  async open(filePath: string): Promise<CADEnvelope<{ filePath: string; ext: SupportedCADExt }>> {
    const decision = this.route(filePath);
    this.openSessions.set(filePath, { bridge: decision.bridge, ext: decision.ext });
    log.info(
      `[CADAutomationRouter] route ${decision.ext} → ${decision.bridge} for ${filePath}`,
    );

    // In mock mode we never touch the underlying bridges — their singletons may
    // have frozen their mock flag at module-load time (before the test could set
    // PRISM_CAD_MOCK=1), which would incorrectly trigger live process spawns.
    // The mock layer (CADAutomationMockLayer) already fully covers the
    // geometry/op/toolpath surface, so the open/close round-trip is a no-op.
    if (this.isMock) {
      return {
        value: { filePath, ext: decision.ext },
        confidence: 1,
        source: "mock",
        bridge: decision.bridge,
        ext: decision.ext,
      };
    }

    const delegated = await this.delegate(decision.bridge, (b) => b.open(filePath));

    return {
      value: { filePath, ext: decision.ext },
      confidence: delegated.confidence,
      source: delegated.source,
      warning: delegated.warning,
      bridge: decision.bridge,
      ext: decision.ext,
    };
  }

  async getGeometry(filePath: string): Promise<CADEnvelope<NormalizedGeometry>> {
    const session = this.requireSession(filePath);
    const normalized = this.isMock
      ? cadAutomationMockLayer.geometryFor(session.ext)
      : await this.loadLiveGeometry(session.bridge);

    return {
      value: {
        curves: normalized.curves,
        surfaces: normalized.surfaces,
        solids: normalized.solids,
        points: normalized.points,
        totalEntities: normalized.totalEntities,
      },
      confidence: this.isMock ? 1 : 0.95,
      source: this.isMock ? "mock" : `cad-router:${session.bridge}`,
      bridge: session.bridge,
      ext: session.ext,
    };
  }

  async getOperationTree(
    filePath: string,
  ): Promise<CADEnvelope<NormalizedOperationTree>> {
    const session = this.requireSession(filePath);
    const normalized = this.isMock
      ? cadAutomationMockLayer.operationTreeFor(session.ext)
      : await this.loadLiveOperationTree(session.bridge);

    return {
      value: {
        jobCount: normalized.jobCount,
        totalOperations: normalized.totalOperations,
        cyclePalette: normalized.cyclePalette,
      },
      confidence: this.isMock ? 1 : 0.95,
      source: this.isMock ? "mock" : `cad-router:${session.bridge}`,
      bridge: session.bridge,
      ext: session.ext,
    };
  }

  async getToolpaths(filePath: string): Promise<CADEnvelope<NormalizedToolpathOp[]>> {
    const session = this.requireSession(filePath);
    const ops = this.isMock
      ? cadAutomationMockLayer.toolpathsFor(session.ext)
      : await this.loadLiveToolpaths(session.bridge);

    return {
      value: ops,
      confidence: this.isMock ? 1 : 0.95,
      source: this.isMock ? "mock" : `cad-router:${session.bridge}`,
      bridge: session.bridge,
      ext: session.ext,
    };
  }

  async exportSTEP(
    filePath: string,
    outputPath: string,
  ): Promise<CADEnvelope<{ outputPath: string; format: "STEP AP242" }>> {
    const session = this.requireSession(filePath);
    if (!this.isMock) {
      await this.delegate(session.bridge, (b) => b.exportSTEP(outputPath));
    }
    return {
      value: { outputPath, format: "STEP AP242" },
      confidence: this.isMock ? 1 : 0.95,
      source: this.isMock ? "mock" : `cad-router:${session.bridge}`,
      bridge: session.bridge,
      ext: session.ext,
    };
  }

  async close(filePath: string): Promise<CADEnvelope<{ closed: true }>> {
    const session = this.openSessions.get(filePath);
    if (!session) {
      return {
        value: { closed: true },
        confidence: 1,
        source: "noop",
        bridge: "freecad",
        ext: ".FCStd",
        warning: `No open session for ${filePath}`,
      };
    }
    if (!this.isMock) {
      try {
        await this.delegate(session.bridge, (b) => b.close());
      } catch (err) {
        log.warn(`[CADAutomationRouter] close failed for ${filePath}: ${String(err)}`);
      }
    }
    this.openSessions.delete(filePath);
    return {
      value: { closed: true },
      confidence: 1,
      source: this.isMock ? "mock" : `cad-router:${session.bridge}`,
      bridge: session.bridge,
      ext: session.ext,
    };
  }

  // ── Helpers / bridge plumbing ───────────────────────────────────────────────

  private requireSession(filePath: string): {
    bridge: CADBridgeKind;
    ext: SupportedCADExt;
  } {
    const s = this.openSessions.get(filePath);
    if (!s) throw new Error(`[CADAutomationRouter] No open session for ${filePath}`);
    return s;
  }

  private async delegate<T>(
    bridge: CADBridgeKind,
    fn: (b: AnyBridge) => Promise<T>,
  ): Promise<T> {
    const b = this.bridgeFor(bridge);
    return fn(b);
  }

  private bridgeFor(kind: CADBridgeKind): AnyBridge {
    switch (kind) {
      case "solidworks":
        return solidWorksAutomationBridge as unknown as AnyBridge;
      case "inventor":
        return inventorAutomationBridge as unknown as AnyBridge;
      case "freecad":
        return freecadAutomationBridge as unknown as AnyBridge;
      case "mastercam":
        return mastercamAutomationBridge as unknown as AnyBridge;
      case "fusion360":
        return fusion360AutomationBridge as unknown as AnyBridge;
      case "hypermill":
        return hypermillAutomationBridge as unknown as AnyBridge;
    }
  }

  private async loadLiveGeometry(kind: CADBridgeKind): Promise<NormalizedGeometry> {
    const b = this.bridgeFor(kind);
    const res = await b.getGeometry();
    const v = res.value as Record<string, unknown>;
    const normalize = (name: string): number => {
      const field = v[name];
      if (Array.isArray(field)) return field.length;
      if (typeof field === "number") return field;
      return 0;
    };
    const curves = normalize("curves") + normalize("lines") + normalize("arcs") + normalize("splines")
      + normalize("sketchLines") + normalize("sketchArcs") + normalize("sketchSplines")
      + normalize("bRepEdges");
    const surfaces = normalize("surfaces") + normalize("bRepFaces");
    const solids = normalize("solids") + normalize("bRepBodies");
    const points = normalize("points");
    const totalEntities = typeof v["totalEntities"] === "number"
      ? (v["totalEntities"] as number)
      : curves + surfaces + solids + points;
    return { curves, surfaces, solids, points, totalEntities };
  }

  private async loadLiveOperationTree(
    kind: CADBridgeKind,
  ): Promise<NormalizedOperationTree> {
    const b = this.bridgeFor(kind);
    const res = await b.getOperationTree();
    const v = res.value as Record<string, unknown>;
    const jobs = (v["jobs"] as unknown[] | undefined) ?? (v["setups"] as unknown[] | undefined) ?? [];
    const totalOps = typeof v["totalOperations"] === "number" ? (v["totalOperations"] as number) : 0;
    const palette = new Set<string>();
    if (Array.isArray(jobs)) {
      for (const job of jobs as Array<Record<string, unknown>>) {
        const groups =
          (job["jobLists"] as unknown[] | undefined) ??
          (job["toolpathGroups"] as unknown[] | undefined) ??
          [];
        for (const g of groups as Array<Record<string, unknown>>) {
          const ops = (g["operations"] as unknown[] | undefined) ?? [];
          for (const op of ops as Array<Record<string, unknown>>) {
            const code = (op["cycleCode"] as string | undefined) ?? (op["opType"] as string | undefined);
            if (code) palette.add(code);
          }
        }
      }
    }
    return {
      jobCount: Array.isArray(jobs) ? jobs.length : 0,
      totalOperations: totalOps,
      cyclePalette: Array.from(palette),
    };
  }

  private async loadLiveToolpaths(kind: CADBridgeKind): Promise<NormalizedToolpathOp[]> {
    const b = this.bridgeFor(kind);
    const res = await b.getToolpaths();
    const ops = res.value as Array<Record<string, unknown>>;
    return ops.map((op, i) => ({
      index: (op["index"] as number | undefined) ?? i,
      cycleCode:
        (op["cycleCode"] as string | undefined) ??
        (op["opType"] as string | undefined) ??
        "Unknown",
      toolDiameter_mm: (op["toolDiameter_mm"] as number | undefined) ?? 0,
      spindleRpm: (op["spindleRpm"] as number | undefined) ?? 0,
      feedRate_mmpm: (op["feedRate_mmpm"] as number | undefined) ?? 0,
    }));
  }
}

// ── Bridge structural type (minimum surface the router needs) ────────────────

interface AnyBridge {
  open(
    filePath: string,
    opts?: unknown,
  ): Promise<{ value: unknown; confidence: number; source: string; warning?: string }>;
  getGeometry(): Promise<{ value: unknown; confidence: number; source: string }>;
  getToolpaths(): Promise<{ value: unknown; confidence: number; source: string }>;
  getOperationTree(): Promise<{ value: unknown; confidence: number; source: string }>;
  exportSTEP(
    outputPath: string,
  ): Promise<{ value: unknown; confidence: number; source: string }>;
  close(): Promise<{ value: unknown; confidence: number; source: string }>;
}

// ── Singleton ─────────────────────────────────────────────────────────────────

export const cadAutomationRouter = new CADAutomationRouter();
