/**
 * freeCADAutomationBridge.test.ts — U-CAUT04 unit tests
 *
 * All tests run in MOCK mode (PRISM_CAD_MOCK=1) — no FreeCAD install required.
 * Mirrors the SolidWorks/Inventor/Mastercam bridge test structure.
 */

import { describe, it, expect, beforeEach } from "vitest";

process.env["PRISM_CAD_MOCK"] = "1";

import {
  FreeCADAutomationBridge,
  freecadAutomationBridge,
  type FCStdGeometry,
  type FCStdOperation,
  type FCStdOperationTree,
} from "../engines/FreeCADAutomationBridge.js";

function freshBridge(): FreeCADAutomationBridge {
  return new FreeCADAutomationBridge();
}

describe("FreeCADAutomationBridge singleton", () => {
  it("exports freecadAutomationBridge as a FreeCADAutomationBridge instance", () => {
    expect(freecadAutomationBridge).toBeInstanceOf(FreeCADAutomationBridge);
  });
});

describe("open() — mock mode", () => {
  it("returns mock AtomicValue for .FCStd file", async () => {
    const bridge = freshBridge();
    const r = await bridge.open("C:/parts/block.FCStd");
    expect(r.confidence).toBeGreaterThan(0);
    expect(r.source).toBe("mock");
    expect(r.value.filePath).toBe("C:/parts/block.FCStd");
    expect(r.value.format).toBe(".FCStd");
    expect(r.value.pid).toBeNull();
  });

  it("detects .FCStd1 (backup) extension", async () => {
    const bridge = freshBridge();
    const r = await bridge.open("C:/parts/block.FCStd1");
    expect(r.value.format).toBe(".FCStd1");
  });

  it("defaults unknown extension to .FCStd", async () => {
    const bridge = freshBridge();
    const r = await bridge.open("C:/parts/block.unknown");
    expect(r.value.format).toBe(".FCStd");
  });

  it("records open filePath on the bridge instance", async () => {
    const bridge = freshBridge();
    expect(bridge.currentFilePath).toBeNull();
    await bridge.open("C:/parts/block.FCStd");
    expect(bridge.currentFilePath).toBe("C:/parts/block.FCStd");
  });
});

describe("getGeometry() — mock mode", () => {
  let bridge: FreeCADAutomationBridge;
  beforeEach(async () => {
    bridge = freshBridge();
    await bridge.open("C:/parts/block.FCStd");
  });

  it("returns deterministic mock geometry", async () => {
    const g = await bridge.getGeometry();
    expect(g.source).toBe("mock");
    expect(g.confidence).toBe(1);
    expect(g.value.totalEntities).toBeGreaterThan(0);
  });

  it("geometry buckets are well-formed arrays", async () => {
    const g = (await bridge.getGeometry()).value as FCStdGeometry;
    expect(Array.isArray(g.lines)).toBe(true);
    expect(Array.isArray(g.arcs)).toBe(true);
    expect(Array.isArray(g.splines)).toBe(true);
    expect(Array.isArray(g.surfaces)).toBe(true);
    expect(Array.isArray(g.solids)).toBe(true);
  });

  it("totalEntities equals the sum of all bucket sizes", async () => {
    const g = (await bridge.getGeometry()).value as FCStdGeometry;
    const sum =
      g.lines.length + g.arcs.length + g.splines.length + g.surfaces.length + g.solids.length;
    expect(sum).toBe(g.totalEntities);
  });

  it("emits at least one Body solid in mock data", async () => {
    const g = (await bridge.getGeometry()).value as FCStdGeometry;
    expect(g.solids.length).toBeGreaterThan(0);
    expect(g.solids[0].type).toBe("solid");
  });
});

describe("getOperationTree() — mock mode", () => {
  let bridge: FreeCADAutomationBridge;
  beforeEach(async () => {
    bridge = freshBridge();
    await bridge.open("C:/parts/block.FCStd");
  });

  it("returns a job-containing tree", async () => {
    const t = await bridge.getOperationTree();
    expect(t.value.jobs.length).toBeGreaterThan(0);
  });

  it("totalOperations matches the sum across toolpath groups", async () => {
    const t = (await bridge.getOperationTree()).value as FCStdOperationTree;
    let sum = 0;
    for (const job of t.jobs) {
      for (const tg of job.toolpathGroups) sum += tg.operations.length;
    }
    expect(sum).toBe(t.totalOperations);
  });

  it("reports a stock material on each job", async () => {
    const t = (await bridge.getOperationTree()).value as FCStdOperationTree;
    for (const job of t.jobs) {
      expect(typeof job.stockMaterial).toBe("string");
      expect(job.stockMaterial.length).toBeGreaterThan(0);
    }
  });

  it("operations reference valid FreeCAD Path opTypes", async () => {
    const t = (await bridge.getOperationTree()).value as FCStdOperationTree;
    const allowed = new Set(["Pocket", "Profile", "Drilling", "Surface", "Adaptive"]);
    for (const job of t.jobs) {
      for (const tg of job.toolpathGroups) {
        for (const op of tg.operations) expect(allowed.has(op.opType)).toBe(true);
      }
    }
  });
});

describe("getToolpaths() — mock mode", () => {
  it("flattens the operation tree into an operations list", async () => {
    const bridge = freshBridge();
    await bridge.open("C:/parts/block.FCStd");
    const flat = (await bridge.getToolpaths()).value as FCStdOperation[];
    const tree = (await bridge.getOperationTree()).value as FCStdOperationTree;
    expect(flat.length).toBe(tree.totalOperations);
  });

  it("operations carry tool diameter and spindle rpm", async () => {
    const bridge = freshBridge();
    await bridge.open("C:/parts/block.FCStd");
    const flat = (await bridge.getToolpaths()).value as FCStdOperation[];
    for (const op of flat) {
      expect(op.toolDiameter_mm).toBeGreaterThan(0);
      expect(op.spindleRpm).toBeGreaterThan(0);
      expect(op.feedRate_mmpm).toBeGreaterThan(0);
    }
  });
});

describe("exportSTEP() — mock mode", () => {
  it("reports the requested output path and AP242 format", async () => {
    const bridge = freshBridge();
    await bridge.open("C:/parts/block.FCStd");
    const r = await bridge.exportSTEP("C:/out/block.step");
    expect(r.source).toBe("mock");
    expect(r.value.outputPath).toBe("C:/out/block.step");
    expect(r.value.format).toBe("STEP AP242");
  });
});

describe("close() — mock mode", () => {
  it("clears the open file path and returns closed envelope", async () => {
    const bridge = freshBridge();
    await bridge.open("C:/parts/block.FCStd");
    expect(bridge.currentFilePath).toBe("C:/parts/block.FCStd");
    const r = await bridge.close();
    expect(r.value.closed).toBe(true);
    expect(r.value.pid).toBeNull();
    expect(bridge.currentFilePath).toBeNull();
  });

  it("close-before-open is idempotent (no throw)", async () => {
    const bridge = freshBridge();
    await expect(bridge.close()).resolves.toBeDefined();
  });
});

describe("Extension detection", () => {
  it("all CAUT04 test extensions round-trip", async () => {
    const bridge = freshBridge();
    expect((await bridge.open("x.FCStd")).value.format).toBe(".FCStd");
    expect((await bridge.open("x.FCStd1")).value.format).toBe(".FCStd1");
  });
});
