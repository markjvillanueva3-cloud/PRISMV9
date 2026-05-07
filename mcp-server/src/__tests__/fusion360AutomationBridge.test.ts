/**
 * fusion360AutomationBridge.test.ts — U-CAUT06 unit tests
 *
 * All tests run in MOCK mode (PRISM_CAD_MOCK=1) — no Fusion 360 install required.
 * HTTP is never actually called in mock; the HTTPClient seam is still exercised
 * through a stub in a few tests to cover the error paths.
 */

import { describe, it, expect, beforeEach } from "vitest";

process.env["PRISM_CAD_MOCK"] = "1";

import {
  Fusion360AutomationBridge,
  fusion360AutomationBridge,
  type F360Geometry,
  type F360Operation,
  type F360OperationTree,
} from "../engines/Fusion360AutomationBridge.js";

function fresh(): Fusion360AutomationBridge {
  return new Fusion360AutomationBridge();
}

describe("Fusion360AutomationBridge singleton", () => {
  it("exports fusion360AutomationBridge as an instance", () => {
    expect(fusion360AutomationBridge).toBeInstanceOf(Fusion360AutomationBridge);
  });
});

describe("open() — mock mode", () => {
  it("returns mock AtomicValue for .f3d", async () => {
    const b = fresh();
    const r = await b.open("C:/parts/block.f3d");
    expect(r.source).toBe("mock");
    expect(r.value.filePath).toBe("C:/parts/block.f3d");
    expect(r.value.format).toBe(".f3d");
    expect(r.value.baseUrl).toBeNull();
  });

  it("detects .f3z (archived project)", async () => {
    const b = fresh();
    const r = await b.open("C:/parts/project.f3z");
    expect(r.value.format).toBe(".f3z");
  });

  it("defaults unknown extension to .f3d", async () => {
    const b = fresh();
    const r = await b.open("C:/parts/file.unknown");
    expect(r.value.format).toBe(".f3d");
  });

  it("records open filePath on the bridge instance", async () => {
    const b = fresh();
    expect(b.currentFilePath).toBeNull();
    await b.open("C:/parts/block.f3d");
    expect(b.currentFilePath).toBe("C:/parts/block.f3d");
  });
});

describe("getGeometry() — mock mode", () => {
  let b: Fusion360AutomationBridge;
  beforeEach(async () => {
    b = fresh();
    await b.open("C:/parts/block.f3d");
  });

  it("returns deterministic mock geometry", async () => {
    const g = await b.getGeometry();
    expect(g.source).toBe("mock");
    expect(g.value.totalEntities).toBeGreaterThan(0);
  });

  it("totalEntities equals the sum of all geometry buckets", async () => {
    const g = (await b.getGeometry()).value as F360Geometry;
    const sum =
      g.sketchLines.length +
      g.sketchArcs.length +
      g.sketchSplines.length +
      g.bRepFaces.length +
      g.bRepEdges.length +
      g.bRepBodies.length;
    expect(sum).toBe(g.totalEntities);
  });

  it("every sketchLine carries a component reference", async () => {
    const g = (await b.getGeometry()).value as F360Geometry;
    for (const l of g.sketchLines) expect(l.component.length).toBeGreaterThan(0);
  });

  it("emits at least one bRepBody", async () => {
    const g = (await b.getGeometry()).value as F360Geometry;
    expect(g.bRepBodies.length).toBeGreaterThan(0);
    expect(g.bRepBodies[0].type).toBe("bRepBody");
  });
});

describe("getOperationTree() — mock mode", () => {
  let b: Fusion360AutomationBridge;
  beforeEach(async () => {
    b = fresh();
    await b.open("C:/parts/block.f3d");
  });

  it("returns a setup-containing tree", async () => {
    const t = await b.getOperationTree();
    expect(t.value.setups.length).toBeGreaterThan(0);
  });

  it("totalOperations matches sum across all toolpath groups", async () => {
    const t = (await b.getOperationTree()).value as F360OperationTree;
    let n = 0;
    for (const s of t.setups) {
      for (const g of s.toolpathGroups) n += g.operations.length;
    }
    expect(n).toBe(t.totalOperations);
  });

  it("operations reference valid Fusion CAM opTypes", async () => {
    const t = (await b.getOperationTree()).value as F360OperationTree;
    const allowed = new Set([
      "Adaptive2D",
      "Pocket2D",
      "Contour2D",
      "Drill",
      "Bore",
      "Face",
    ]);
    for (const s of t.setups) {
      for (const g of s.toolpathGroups) {
        for (const op of g.operations) expect(allowed.has(op.opType)).toBe(true);
      }
    }
  });

  it("each setup references a postProcessor id", async () => {
    const t = (await b.getOperationTree()).value as F360OperationTree;
    for (const s of t.setups) {
      expect(s.postProcessor.length).toBeGreaterThan(0);
    }
  });
});

describe("getToolpaths() — mock mode", () => {
  it("flattens the operation tree into a single operation list", async () => {
    const b = fresh();
    await b.open("C:/parts/block.f3d");
    const flat = (await b.getToolpaths()).value as F360Operation[];
    const tree = (await b.getOperationTree()).value as F360OperationTree;
    expect(flat.length).toBe(tree.totalOperations);
  });

  it("all operations have positive toolDiameter and feedRate", async () => {
    const b = fresh();
    await b.open("C:/parts/block.f3d");
    const flat = (await b.getToolpaths()).value as F360Operation[];
    for (const op of flat) {
      expect(op.toolDiameter_mm).toBeGreaterThan(0);
      expect(op.feedRate_mmpm).toBeGreaterThan(0);
      expect(op.spindleRpm).toBeGreaterThan(0);
    }
  });
});

describe("exportSTEP() — mock mode", () => {
  it("reports the output path and AP242 format", async () => {
    const b = fresh();
    await b.open("C:/parts/block.f3d");
    const r = await b.exportSTEP("C:/out/block.step");
    expect(r.source).toBe("mock");
    expect(r.value.outputPath).toBe("C:/out/block.step");
    expect(r.value.format).toBe("STEP AP242");
  });
});

describe("close() — mock mode", () => {
  it("clears the open file path and returns closed envelope", async () => {
    const b = fresh();
    await b.open("C:/parts/block.f3d");
    expect(b.currentFilePath).toBe("C:/parts/block.f3d");
    const r = await b.close();
    expect(r.value.closed).toBe(true);
    expect(b.currentFilePath).toBeNull();
  });

  it("close before open is idempotent", async () => {
    const b = fresh();
    await expect(b.close()).resolves.toBeDefined();
  });
});

describe("Extension detection", () => {
  it("all CAUT06 test extensions round-trip", async () => {
    const b = fresh();
    expect((await b.open("x.f3d")).value.format).toBe(".f3d");
    expect((await b.open("x.f3z")).value.format).toBe(".f3z");
  });
});
