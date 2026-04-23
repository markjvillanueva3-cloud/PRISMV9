/**
 * cadAutomationRouter.test.ts — U-CAUT10 unit tests
 *
 * All tests run in MOCK mode (PRISM_CAD_MOCK=1) so the router short-circuits
 * to CADAutomationMockLayer for geometry/operation/toolpath calls while still
 * exercising the open/close delegation into each underlying bridge.
 */

import { describe, it, expect, beforeEach } from "vitest";

process.env["PRISM_CAD_MOCK"] = "1";

import {
  CADAutomationRouter,
  cadAutomationRouter,
  type CADBridgeKind,
} from "../engines/CADAutomationRouter.js";

function fresh(): CADAutomationRouter {
  return new CADAutomationRouter();
}

describe("CADAutomationRouter singleton", () => {
  it("exports cadAutomationRouter as a CADAutomationRouter instance", () => {
    expect(cadAutomationRouter).toBeInstanceOf(CADAutomationRouter);
  });
});

describe("route() — extension → bridge", () => {
  const cases: ReadonlyArray<{ file: string; bridge: CADBridgeKind }> = [
    { file: "x.sldprt", bridge: "solidworks" },
    { file: "x.sldasm", bridge: "solidworks" },
    { file: "x.ipt", bridge: "inventor" },
    { file: "x.iam", bridge: "inventor" },
    { file: "x.FCStd", bridge: "freecad" },
    { file: "x.FCStd1", bridge: "freecad" },
    { file: "x.mcam", bridge: "mastercam" },
    { file: "x.mcx", bridge: "mastercam" },
    { file: "x.mcx-8", bridge: "mastercam" },
    { file: "x.f3d", bridge: "fusion360" },
    { file: "x.f3z", bridge: "fusion360" },
    { file: "x.hmc", bridge: "hypermill" },
  ];

  for (const c of cases) {
    it(`${c.file} → ${c.bridge}`, () => {
      const d = fresh().route(c.file);
      expect(d.bridge).toBe(c.bridge);
    });
  }

  it("lowercase inputs resolve to canonical extension", () => {
    const r = fresh();
    expect(r.route("core.fcstd").ext).toBe(".FCStd");
    expect(r.route("core.mcx-8").ext).toBe(".mcx-8");
  });

  it("rejects unsupported extensions with a helpful error", () => {
    expect(() => fresh().route("report.xlsx")).toThrow(/Unsupported CAD extension/);
  });
});

describe("listSupportedExtensions() / supportsExtension()", () => {
  it("reports all 12 canonical extensions", () => {
    const r = fresh();
    expect(r.listSupportedExtensions().length).toBe(12);
  });

  it("supportsExtension() is case-insensitive", () => {
    const r = fresh();
    expect(r.supportsExtension(".HMC")).toBe(true);
    expect(r.supportsExtension(".FCSTD")).toBe(true);
    expect(r.supportsExtension(".step")).toBe(false);
  });
});

describe("open() / close() lifecycle", () => {
  let r: CADAutomationRouter;
  beforeEach(() => {
    r = fresh();
  });

  it("open() records a session and returns bridge + ext in the envelope", async () => {
    const env = await r.open("C:/parts/core.hmc");
    expect(env.bridge).toBe("hypermill");
    expect(env.ext).toBe(".hmc");
    expect(env.value.filePath).toBe("C:/parts/core.hmc");
  });

  it("close() tears down the session and returns a closed envelope", async () => {
    await r.open("C:/parts/core.hmc");
    const env = await r.close("C:/parts/core.hmc");
    expect(env.value.closed).toBe(true);
  });

  it("close() before open() is a no-op (warning set)", async () => {
    const env = await r.close("C:/parts/never-opened.hmc");
    expect(env.value.closed).toBe(true);
    expect(env.warning).toMatch(/No open session/);
  });
});

describe("getGeometry() — mock routed to mock layer", () => {
  it("returns normalized counts matching the mock fixture", async () => {
    const r = fresh();
    await r.open("C:/parts/core.hmc");
    const g = await r.getGeometry("C:/parts/core.hmc");
    expect(g.value.curves).toBe(36);
    expect(g.value.surfaces).toBe(18);
    expect(g.value.solids).toBe(2);
    expect(g.value.totalEntities).toBe(56);
    expect(g.source).toBe("mock");
  });

  it("throws when called without an open session", async () => {
    const r = fresh();
    await expect(r.getGeometry("C:/parts/missing.hmc")).rejects.toThrow(/No open session/);
  });
});

describe("getOperationTree() / getToolpaths() — mock routed to mock layer", () => {
  it("operationTree totals match the mock layer for .hmc", async () => {
    const r = fresh();
    await r.open("C:/parts/core.hmc");
    const t = await r.getOperationTree("C:/parts/core.hmc");
    expect(t.value.totalOperations).toBe(32);
    expect(t.value.cyclePalette.length).toBe(8);
  });

  it("toolpath count equals operationTree.totalOperations", async () => {
    const r = fresh();
    await r.open("C:/parts/core.hmc");
    const tree = await r.getOperationTree("C:/parts/core.hmc");
    const tp = await r.getToolpaths("C:/parts/core.hmc");
    expect(tp.value.length).toBe(tree.value.totalOperations);
  });

  it("operationTree for a pure-CAD format reports zero ops", async () => {
    const r = fresh();
    await r.open("C:/parts/part.sldprt");
    const t = await r.getOperationTree("C:/parts/part.sldprt");
    expect(t.value.totalOperations).toBe(0);
  });
});

describe("exportSTEP()", () => {
  it("reports AP242 format and the requested output path", async () => {
    const r = fresh();
    await r.open("C:/parts/core.hmc");
    const env = await r.exportSTEP("C:/parts/core.hmc", "C:/out/core.step");
    expect(env.value.outputPath).toBe("C:/out/core.step");
    expect(env.value.format).toBe("STEP AP242");
    expect(env.bridge).toBe("hypermill");
  });
});

describe("multi-file / multi-bridge sessions", () => {
  it("tracks distinct bridges for different open files", async () => {
    const r = fresh();
    await r.open("C:/parts/a.hmc");
    await r.open("C:/parts/b.f3d");
    await r.open("C:/parts/c.FCStd");

    const gA = await r.getGeometry("C:/parts/a.hmc");
    const gB = await r.getGeometry("C:/parts/b.f3d");
    const gC = await r.getGeometry("C:/parts/c.FCStd");

    expect(gA.bridge).toBe("hypermill");
    expect(gB.bridge).toBe("fusion360");
    expect(gC.bridge).toBe("freecad");
  });
});
