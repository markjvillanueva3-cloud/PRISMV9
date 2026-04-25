/**
 * cadAutomationDispatcher.universalIndex.test.ts — U-CADC01..U-CADC04
 *
 * End-to-end test for the universal_cad_* action surface. Drives every
 * action through the real prism_cad_automation dispatcher with a tiny
 * synthetic CAD corpus on a temp filesystem so no JM Die path is required.
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

import {
  registerCadAutomationDispatcher,
  CAD_AUTOMATION_ACTIONS,
} from "../tools/dispatchers/cadAutomationDispatcher.js";
import {
  TARGET_CAD_FORMATS,
  UNIVERSAL_ROOT_PATHS,
} from "../engines/UniversalCADIndexEngine.js";

interface CapturedTool {
  name: string;
  description: string;
  schema: unknown;
  handler: (args: {
    action: string;
    params?: Record<string, unknown>;
  }) => Promise<unknown>;
}

function makeStubServer() {
  const tools: CapturedTool[] = [];
  return {
    tools,
    tool(
      name: string,
      description: string,
      schema: unknown,
      handler: CapturedTool["handler"],
    ) {
      tools.push({ name, description, schema, handler });
    },
  };
}

let handler: CapturedTool["handler"];

async function invoke(
  action: string,
  params: Record<string, unknown> = {},
): Promise<Record<string, unknown>> {
  const res = (await handler({ action, params })) as Record<string, unknown>;
  if (res && Array.isArray((res as { content?: unknown[] }).content)) {
    const arr = (res as { content: Array<{ text?: string }> }).content;
    const text = arr[0]?.text ?? "";
    return JSON.parse(text) as Record<string, unknown>;
  }
  return res;
}

beforeAll(() => {
  const server = makeStubServer();
  registerCadAutomationDispatcher(
    server as unknown as Parameters<typeof registerCadAutomationDispatcher>[0],
  );
  const tool = server.tools.find((t) => t.name === "prism_cad_automation");
  if (!tool) throw new Error("prism_cad_automation tool was not registered");
  handler = tool.handler;
});

let tmpRoot: string;

/** Build a synthetic mini-corpus exercising 5 formats spanning vendors. */
function buildSyntheticCorpus(rootDir: string): {
  rootPaths: string[];
  outputPath: string;
} {
  const a = path.join(rootDir, "alcoa-lathe");
  const b = path.join(rootDir, "itw-mill");
  fs.mkdirSync(a, { recursive: true });
  fs.mkdirSync(b, { recursive: true });
  // 5 spanning formats — STEP, SLDPRT, IPT, DXF, STL — tests Variability floor
  fs.writeFileSync(path.join(a, "part-01.step"), "ISO-10303-21;\nDATA;\nENDSEC;\nEND-ISO-10303-21;\n");
  fs.writeFileSync(path.join(a, "part-02.step"), "ISO-10303-21;\nDATA;\nENDSEC;\nEND-ISO-10303-21;\n");
  fs.writeFileSync(path.join(a, "fixture-01.dxf"), "0\nSECTION\n2\nHEADER\n0\nENDSEC\n0\nEOF\n");
  fs.writeFileSync(path.join(b, "casting-01.sldprt"), "MOCK-SLDPRT-BINARY");
  fs.writeFileSync(path.join(b, "bracket-01.ipt"), "MOCK-IPT-BINARY");
  fs.writeFileSync(path.join(b, "frame-01.stl"), "solid frame\nendsolid frame\n");
  return {
    rootPaths: [a, b],
    outputPath: path.join(rootDir, "master-index.json"),
  };
}

beforeEach(() => {
  tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "prism-cadc01-"));
});

afterEach(() => {
  try {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  } catch {
    // ignore best-effort cleanup
  }
});

describe("cadAutomationDispatcher — U-CADC01..U-CADC04 action surface", () => {
  it("exposes the 6 universal_cad_* actions in CAD_AUTOMATION_ACTIONS", () => {
    const actions = CAD_AUTOMATION_ACTIONS as readonly string[];
    expect(actions).toContain("universal_cad_index");
    expect(actions).toContain("universal_cad_load");
    expect(actions).toContain("universal_cad_coverage");
    expect(actions).toContain("universal_cad_has_coverage");
    expect(actions).toContain("universal_cad_target_formats");
    expect(actions).toContain("universal_cad_root_paths");
  });

  it("universal_cad_target_formats returns the 15 documented target extensions", async () => {
    const out = await invoke("universal_cad_target_formats", {});
    expect(out["count"]).toBe(15);
    const formats = out["formats"] as string[];
    // Spanning vendor formats — Inventor, SolidWorks, neutral STEP/IGES, raw
    expect(formats).toContain(".ipt");
    expect(formats).toContain(".sldprt");
    expect(formats).toContain(".step");
    expect(formats).toContain(".iges");
    expect(formats).toContain(".dxf");
    expect(formats).toContain(".stl");
    expect(formats).toContain(".f3d");
    expect(formats).toContain(".x_t");
    expect(formats).toContain(".sat");
    // The exported tuple is the contract — assert byte-identical shape.
    expect(formats).toEqual([...TARGET_CAD_FORMATS]);
  });

  it("universal_cad_root_paths returns the universal default root list", async () => {
    const out = await invoke("universal_cad_root_paths", {});
    expect(out["count"]).toBe(UNIVERSAL_ROOT_PATHS.length);
    expect(out["paths"]).toEqual([...UNIVERSAL_ROOT_PATHS]);
    const paths = out["paths"] as string[];
    expect(paths.some((p) => p.includes("JM DIE"))).toBe(true);
  });
});

describe("universal_cad_index — full scan path", () => {
  it("scans a synthetic 6-file/2-vendor corpus and tallies byFormat counts", async () => {
    const { rootPaths, outputPath } = buildSyntheticCorpus(tmpRoot);
    const result = await invoke("universal_cad_index", {
      rootPaths,
      outputPath,
      persist: false,
    });
    const masterIndex = result["index"] as Record<string, unknown>;
    expect(masterIndex["totalFiles"]).toBe(6);
    const byFormat = masterIndex["byFormat"] as Record<string, number>;
    expect(byFormat[".step"]).toBe(2);
    expect(byFormat[".dxf"]).toBe(1);
    expect(byFormat[".sldprt"]).toBe(1);
    expect(byFormat[".ipt"]).toBe(1);
    expect(byFormat[".stl"]).toBe(1);

    const coverage = result["coverage"] as Record<string, unknown>;
    const counts = coverage["formatCounts"] as Record<string, number>;
    expect(counts[".step"]).toBe(2);
    expect(counts[".dxf"]).toBe(1);
    // 5 of 15 target formats covered → 1/3 coverage
    expect(coverage["coveragePct"]).toBeCloseTo(5 / 15, 5);
    const covered = coverage["coveredFormats"] as string[];
    expect(covered).toContain(".step");
    expect(covered).toContain(".dxf");
    expect(covered).toContain(".sldprt");
    expect(covered).toContain(".ipt");
    expect(covered).toContain(".stl");
  });

  it("rootPaths can be omitted — engine falls back to universal defaults", async () => {
    // Defaults point at H:\PRISM\… which may not exist on the test box;
    // engine handles missing roots gracefully and returns an empty index.
    const result = await invoke("universal_cad_index", { persist: false });
    const masterIndex = result["index"] as Record<string, unknown>;
    expect(typeof masterIndex["totalFiles"]).toBe("number");
    expect(masterIndex["rootPaths"]).toEqual([...UNIVERSAL_ROOT_PATHS]);
  });

  it("persist=true writes master-index.json to disk for U-CADC02", async () => {
    const { rootPaths, outputPath } = buildSyntheticCorpus(tmpRoot);
    const result = await invoke("universal_cad_index", {
      rootPaths,
      outputPath,
      persist: true,
    });
    expect(result["source"]).toBe("UniversalCADIndexEngine");
    expect(fs.existsSync(outputPath)).toBe(true);
    const persisted = JSON.parse(fs.readFileSync(outputPath, "utf8"));
    expect(persisted["totalFiles"]).toBe(6);
    expect(persisted["schemaVersion"]).toBe(1);
  });
});

describe("universal_cad_load — read existing master-index.json", () => {
  it("returns the persisted master index when present on disk", async () => {
    const { rootPaths, outputPath } = buildSyntheticCorpus(tmpRoot);
    await invoke("universal_cad_index", { rootPaths, outputPath, persist: true });
    const loaded = await invoke("universal_cad_load", { outputPath });
    expect(loaded["totalFiles"]).toBe(6);
    expect(loaded["schemaVersion"]).toBe(1);
  });

  it("returns structured error envelope when master index does not exist", async () => {
    const out = await invoke("universal_cad_load", {
      outputPath: path.join(tmpRoot, "does-not-exist.json"),
    });
    expect(typeof out["error"]).toBe("string");
    expect(out["error"]).toContain("not found");
  });
});

describe("universal_cad_coverage — coverage report from a MasterIndex", () => {
  it("computes per-format counts + missing list from a hand-built index", async () => {
    const index = {
      schemaVersion: 1,
      generatedAt: "2026-04-25T00:00:00Z",
      rootPaths: ["/x"],
      totalFiles: 3,
      byFormat: { ".step": 1, ".dxf": 1, ".sldprt": 1 },
      byMachineCategory: {},
      byCustomer: {},
      files: [],
    };
    const coverage = await invoke("universal_cad_coverage", { index });
    expect(coverage["coveragePct"]).toBeCloseTo(3 / 15, 5);
    const missing = coverage["missingFormats"] as string[];
    expect(missing).toContain(".ipt");
    expect(missing).toContain(".f3d");
    expect(missing).not.toContain(".step");
  });

  it("zero-format index reports 0 coverage and full missing list", async () => {
    const empty = {
      schemaVersion: 1,
      generatedAt: "2026-04-25T00:00:00Z",
      rootPaths: [],
      totalFiles: 0,
      byFormat: {},
      byMachineCategory: {},
      byCustomer: {},
      files: [],
    };
    const out = await invoke("universal_cad_coverage", { index: empty });
    expect(out["coveragePct"]).toBe(0);
    expect((out["missingFormats"] as string[]).length).toBe(15);
    // empty array suppressed by responseSlimmer — coveredFormats may be absent
    const covered = (out["coveredFormats"] as string[] | undefined) ?? [];
    expect(covered.length).toBe(0);
  });
});

describe("universal_cad_has_coverage — threshold gate", () => {
  it("reports hasCoverage=false for an index missing target formats", async () => {
    const partial = {
      schemaVersion: 1,
      generatedAt: "2026-04-25T00:00:00Z",
      rootPaths: ["/x"],
      totalFiles: 1,
      byFormat: { ".step": 1 },
      byMachineCategory: {},
      byCustomer: {},
      files: [],
    };
    const strict = await invoke("universal_cad_has_coverage", { index: partial });
    expect(strict["hasCoverage"]).toBe(false);
    // Lower the bar to ~6% (1 of 15) and the same index passes
    const lenient = await invoke("universal_cad_has_coverage", {
      index: partial,
      minCoveragePct: 1 / 15,
    });
    expect(lenient["hasCoverage"]).toBe(true);
  });

  it("reports hasCoverage=true when all 15 target formats are present", async () => {
    const byFormat: Record<string, number> = {};
    for (const f of TARGET_CAD_FORMATS) byFormat[f] = 1;
    const full = {
      schemaVersion: 1,
      generatedAt: "2026-04-25T00:00:00Z",
      rootPaths: ["/x"],
      totalFiles: TARGET_CAD_FORMATS.length,
      byFormat,
      byMachineCategory: {},
      byCustomer: {},
      files: [],
    };
    const out = await invoke("universal_cad_has_coverage", {
      index: full,
      minCoveragePct: 1.0,
    });
    expect(out["hasCoverage"]).toBe(true);
  });
});

describe("Adversarial / failure-mode coverage", () => {
  it("universal_cad_coverage with garbage payload returns structured error, no throw", async () => {
    const out = await invoke("universal_cad_coverage", {
      index: { not: "a real master index" },
    });
    expect(typeof out["error"]).toBe("string");
  });

  it("universal_cad_index with maxDepth=0 still returns a valid index shape", async () => {
    const { rootPaths } = buildSyntheticCorpus(tmpRoot);
    const result = await invoke("universal_cad_index", {
      rootPaths,
      maxDepth: 0,
      persist: false,
    });
    const masterIndex = result["index"] as Record<string, unknown>;
    expect(typeof masterIndex["totalFiles"]).toBe("number");
    expect(masterIndex["schemaVersion"]).toBe(1);
  });

  it("universal_cad_index with empty rootPaths array returns zero-file index", async () => {
    const result = await invoke("universal_cad_index", {
      rootPaths: [],
      persist: false,
    });
    const masterIndex = result["index"] as Record<string, unknown>;
    expect(masterIndex["totalFiles"]).toBe(0);
  });
});
