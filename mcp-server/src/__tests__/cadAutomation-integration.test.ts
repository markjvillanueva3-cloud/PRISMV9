/**
 * cadAutomation-integration.test.ts — U-CAUT12 multi-format integration smoke
 *
 * End-to-end pass through the CAD automation stack:
 *   (12 extensions × 2-3 files each = 30 synthetic files)
 *     stub file path
 *        → CADAutomationRouter.route
 *        → CADAutomationRouter.open
 *        → CADAutomationRouter.getGeometry / getOperationTree / getToolpaths
 *        → CADAutomationRouter.exportSTEP
 *        → CADAutomationRouter.close
 *        → prism_cad_automation dispatcher invocation
 *
 * And a fingerprint pin against CADAutomationMockLayer.allFingerprints(). If
 * anyone changes a fixture count without bumping the pin, this test fails —
 * exactly the drift detection U-CAUT12 was scoped to provide.
 *
 * All tests run in PRISM_CAD_MOCK=1 so no bridge process is ever spawned.
 */

import { describe, it, expect, beforeAll } from "vitest";

process.env["PRISM_CAD_MOCK"] = "1";

import { cadAutomationRouter, type CADBridgeKind } from "../engines/CADAutomationRouter.js";
import {
  cadAutomationMockLayer,
  type SupportedCADExt,
} from "../engines/CADAutomationMockLayer.js";
import {
  registerCadAutomationDispatcher,
  CAD_AUTOMATION_ACTIONS,
} from "../tools/dispatchers/cadAutomationDispatcher.js";

// ── 30-file corpus: 2-3 synthetic paths per extension ─────────────────────────

interface CorpusEntry {
  filePath: string;
  ext: SupportedCADExt;
  bridge: CADBridgeKind;
}

const CORPUS: CorpusEntry[] = [
  // SolidWorks (2+2=4)
  { filePath: "C:/jobs/alpha.sldprt", ext: ".sldprt", bridge: "solidworks" },
  { filePath: "C:/jobs/beta.sldprt", ext: ".sldprt", bridge: "solidworks" },
  { filePath: "C:/jobs/gamma.sldasm", ext: ".sldasm", bridge: "solidworks" },
  { filePath: "C:/jobs/delta.sldasm", ext: ".sldasm", bridge: "solidworks" },
  // Inventor (2+2=4)
  { filePath: "C:/jobs/core.ipt", ext: ".ipt", bridge: "inventor" },
  { filePath: "C:/jobs/cavity.ipt", ext: ".ipt", bridge: "inventor" },
  { filePath: "C:/jobs/mold.iam", ext: ".iam", bridge: "inventor" },
  { filePath: "C:/jobs/fixture.iam", ext: ".iam", bridge: "inventor" },
  // FreeCAD (2+2=4)
  { filePath: "C:/jobs/bracket.FCStd", ext: ".FCStd", bridge: "freecad" },
  { filePath: "C:/jobs/plate.FCStd", ext: ".FCStd", bridge: "freecad" },
  { filePath: "C:/jobs/bracket.FCStd1", ext: ".FCStd1", bridge: "freecad" },
  { filePath: "C:/jobs/plate.FCStd1", ext: ".FCStd1", bridge: "freecad" },
  // Mastercam (2+2+2=6)
  { filePath: "C:/jobs/housing.mcam", ext: ".mcam", bridge: "mastercam" },
  { filePath: "C:/jobs/mount.mcam", ext: ".mcam", bridge: "mastercam" },
  { filePath: "C:/jobs/legacy1.mcx", ext: ".mcx", bridge: "mastercam" },
  { filePath: "C:/jobs/legacy2.mcx", ext: ".mcx", bridge: "mastercam" },
  { filePath: "C:/jobs/legacy8a.mcx-8", ext: ".mcx-8", bridge: "mastercam" },
  { filePath: "C:/jobs/legacy8b.mcx-8", ext: ".mcx-8", bridge: "mastercam" },
  // Fusion 360 (2+2=4)
  { filePath: "C:/jobs/shell.f3d", ext: ".f3d", bridge: "fusion360" },
  { filePath: "C:/jobs/cover.f3d", ext: ".f3d", bridge: "fusion360" },
  { filePath: "C:/jobs/archive1.f3z", ext: ".f3z", bridge: "fusion360" },
  { filePath: "C:/jobs/archive2.f3z", ext: ".f3z", bridge: "fusion360" },
  // hyperMILL (3)
  { filePath: "C:/jobs/impeller.hmc", ext: ".hmc", bridge: "hypermill" },
  { filePath: "C:/jobs/blisk.hmc", ext: ".hmc", bridge: "hypermill" },
  { filePath: "C:/jobs/blade.hmc", ext: ".hmc", bridge: "hypermill" },
  // Case-varied extras (5) — verify case-insensitive routing
  { filePath: "C:/jobs/case1.HMC", ext: ".hmc", bridge: "hypermill" },
  { filePath: "C:/jobs/case2.Fcstd", ext: ".FCStd", bridge: "freecad" },
  { filePath: "C:/jobs/case3.MCAM", ext: ".mcam", bridge: "mastercam" },
  { filePath: "C:/jobs/case4.F3D", ext: ".f3d", bridge: "fusion360" },
  { filePath: "C:/jobs/case5.SLDPRT", ext: ".sldprt", bridge: "solidworks" },
];

// Sanity: confirm corpus size for the documented 30-file scope.
expect(CORPUS.length).toBeGreaterThanOrEqual(30);

// ── Fingerprint pin ────────────────────────────────────────────────────────────
// If any fixture table changes in the mock layer, update this map. That's
// intentional — the whole point of this test is to surface silent drift.

const PINNED_FINGERPRINTS: Record<SupportedCADExt, string> = {
  ".sldprt": ".sldprt:0:12:3:0:15:0:0:",
  ".sldasm": ".sldasm:0:36:9:0:45:0:0:",
  ".ipt": ".ipt:0:14:3:0:17:0:0:",
  ".iam": ".iam:0:42:11:0:53:0:0:",
  ".FCStd": ".FCStd:24:16:2:4:46:1:18:Pocket|Profile|Drilling|Surface|Adaptive",
  ".FCStd1": ".FCStd1:24:16:2:4:46:1:18:Pocket|Profile|Drilling|Surface|Adaptive",
  ".mcam": ".mcam:20:10:2:0:32:1:24:Dynamic2D|Dynamic3D|Contour|Pocket|Drill|HighSpeed",
  ".mcx": ".mcx:20:10:2:0:32:1:24:Dynamic2D|Dynamic3D|Contour|Pocket|Drill|HighSpeed",
  ".mcx-8": ".mcx-8:20:10:2:0:32:1:24:Dynamic2D|Dynamic3D|Contour|Pocket|Drill|HighSpeed",
  ".f3d": ".f3d:0:28:3:0:31:1:22:Adaptive2D|Pocket2D|Contour2D|Drill|Bore|Face",
  ".f3z": ".f3z:0:28:3:0:31:1:22:Adaptive2D|Pocket2D|Contour2D|Drill|Bore|Face",
  ".hmc":
    ".hmc:36:18:2:0:56:1:32:3DPocketRoughing|3DZLevel|3DSurface|5AxisSwarf|5AxisTilt|MillingFinishing|DrillCycle|TappingCycle",
};

// ── Dispatcher wiring (for the "through the MCP surface" pass) ────────────────

interface CapturedTool {
  name: string;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<{
    content: Array<{ type: string; text: string }>;
  }>;
}

let dispatchHandler: CapturedTool["handler"];

async function dispatch(action: string, params: Record<string, unknown> = {}) {
  // Robust against handler shape evolution: handler may throw, omit content,
  // or return `{isError, content}` on error. Surface a uniform envelope so
  // tests can assert success/error without crashing on missing fields.
  let res: { content?: Array<{ text?: string }> };
  try {
    res = await dispatchHandler({ action, params });
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) } as Record<string, unknown>;
  }
  const text = res.content?.[0]?.text ?? "";
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { success: false, __raw: text } as Record<string, unknown>;
  }
}

beforeAll(() => {
  const caps: CapturedTool[] = [];
  const stub = {
    tool(name: string, _d: string, _s: unknown, handler: CapturedTool["handler"]) {
      caps.push({ name, handler });
    },
  };
  registerCadAutomationDispatcher(stub as any);
  const t = caps.find((c) => c.name === "prism_cad_automation");
  if (!t) throw new Error("Dispatcher did not register");
  dispatchHandler = t.handler;
});

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("U-CAUT12 / fingerprint pin", () => {
  it("every extension's fingerprint matches the pinned value", () => {
    const all = cadAutomationMockLayer.allFingerprints();
    for (const ext of Object.keys(PINNED_FINGERPRINTS) as SupportedCADExt[]) {
      expect(all[ext]).toBe(PINNED_FINGERPRINTS[ext]);
    }
  });

  it("mock layer does not emit any extra extensions beyond the 12 pinned ones", () => {
    const all = cadAutomationMockLayer.allFingerprints();
    expect(Object.keys(all).length).toBe(Object.keys(PINNED_FINGERPRINTS).length);
  });
});

describe("U-CAUT12 / corpus routing", () => {
  it("every corpus file routes to the expected bridge", () => {
    for (const entry of CORPUS) {
      const d = cadAutomationRouter.route(entry.filePath);
      expect(d.bridge).toBe(entry.bridge);
      expect(d.ext).toBe(entry.ext);
    }
  });
});

describe("U-CAUT12 / router lifecycle round-trip", () => {
  it("open → getGeometry → getOperationTree → exportSTEP → close for all 30 files", async () => {
    for (const entry of CORPUS) {
      const open = await cadAutomationRouter.open(entry.filePath);
      expect(open.bridge).toBe(entry.bridge);

      const g = await cadAutomationRouter.getGeometry(entry.filePath);
      expect(g.value.totalEntities).toBeGreaterThan(0);

      const t = await cadAutomationRouter.getOperationTree(entry.filePath);
      expect(typeof t.value.totalOperations).toBe("number");

      const tp = await cadAutomationRouter.getToolpaths(entry.filePath);
      expect(tp.value.length).toBe(t.value.totalOperations);

      const step = await cadAutomationRouter.exportSTEP(
        entry.filePath,
        `C:/out/${entry.ext}.step`,
      );
      expect(step.value.format).toBe("STEP AP242");

      const close = await cadAutomationRouter.close(entry.filePath);
      expect(close.value.closed).toBe(true);
    }
  });

  it("geometry counts for every file equal the mock-layer fixture for its ext", async () => {
    for (const entry of CORPUS) {
      await cadAutomationRouter.open(entry.filePath);
      const g = await cadAutomationRouter.getGeometry(entry.filePath);
      const fixture = cadAutomationMockLayer.geometryFor(entry.ext);
      expect(g.value.totalEntities).toBe(fixture.totalEntities);
      expect(g.value.solids).toBe(fixture.solids);
      await cadAutomationRouter.close(entry.filePath);
    }
  });
});

describe("U-CAUT12 / MCP dispatcher pass-through", () => {
  it("prism_cad_automation exposes at least the 14 canonical actions (anti-regression floor)", () => {
    // Later units added AI/planner/decomposer actions on top of the original 14.
    // The invariant we care about is that the canonical surface never shrinks
    // below the U-CAUT11 baseline. The exact count is allowed to grow.
    expect(CAD_AUTOMATION_ACTIONS.length).toBeGreaterThanOrEqual(14);
  });

  it("CAD_AUTOMATION_ACTIONS contains every original U-CAUT11 canonical name", () => {
    const canonical: readonly string[] = [
      "route",
      "list_supported_extensions",
      "supports_extension",
      "open",
      "close",
      "get_geometry",
      "get_operation_tree",
      "get_toolpaths",
      "export_step",
      "mock_geometry",
      "mock_operation_tree",
      "mock_toolpaths",
      "mock_fingerprint",
      "mock_all_fingerprints",
    ];
    for (const a of canonical) expect(CAD_AUTOMATION_ACTIONS).toContain(a);
  });

  it("route through the dispatcher for every corpus file", async () => {
    for (const entry of CORPUS) {
      const r = await dispatch("route", { filePath: entry.filePath });
      expect(r["bridge"]).toBe(entry.bridge);
      expect(r["ext"]).toBe(entry.ext);
    }
  });

  it("mock_fingerprint through the dispatcher matches the pin for each extension", async () => {
    for (const ext of Object.keys(PINNED_FINGERPRINTS) as SupportedCADExt[]) {
      const r = await dispatch("mock_fingerprint", { ext });
      expect(r["fingerprint"]).toBe(PINNED_FINGERPRINTS[ext]);
    }
  });

  it("mock_all_fingerprints matches every pinned value in a single call", async () => {
    const r = await dispatch("mock_all_fingerprints", {});
    for (const ext of Object.keys(PINNED_FINGERPRINTS) as SupportedCADExt[]) {
      expect(r[ext]).toBe(PINNED_FINGERPRINTS[ext]);
    }
  });

  it("list_supported_extensions reports the full 12-extension set", async () => {
    const r = await dispatch("list_supported_extensions", {});
    const exts = (r["extensions"] as string[]) ?? [];
    for (const ext of Object.keys(PINNED_FINGERPRINTS) as SupportedCADExt[]) {
      expect(exts).toContain(ext);
    }
  });
});

describe("U-CAUT12 / fail-fast on unsupported inputs", () => {
  it("router.route throws on unknown extension", () => {
    expect(() => cadAutomationRouter.route("C:/jobs/report.xlsx")).toThrow();
  });

  it("dispatcher returns an error envelope on unknown extension", async () => {
    const r = await dispatch("route", { filePath: "C:/jobs/report.pdf" });
    expect(r["success"] === false || (r["error"] as unknown) !== undefined).toBe(true);
  });
});
