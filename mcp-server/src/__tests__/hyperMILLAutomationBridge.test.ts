/**
 * hyperMILLAutomationBridge.test.ts — U-CAUT07 unit tests
 *
 * All tests run in MOCK mode (PRISM_CAD_MOCK=1) — no hyperMILL / AC install required.
 * Mirrors the FreeCAD/Fusion360 bridge test structure.
 */

import { describe, it, expect, beforeEach } from "vitest";

process.env["PRISM_CAD_MOCK"] = "1";

import {
  HyperMILLAutomationBridge,
  hypermillAutomationBridge,
  type HMCGeometry,
  type HMCOperation,
  type HMCOperationTree,
} from "../engines/HyperMILLAutomationBridge.js";

function fresh(): HyperMILLAutomationBridge {
  return new HyperMILLAutomationBridge();
}

describe("HyperMILLAutomationBridge singleton", () => {
  it("exports hypermillAutomationBridge as a HyperMILLAutomationBridge instance", () => {
    expect(hypermillAutomationBridge).toBeInstanceOf(HyperMILLAutomationBridge);
  });
});

describe("open() — mock mode", () => {
  it("returns mock AtomicValue for .hmc file", async () => {
    const b = fresh();
    const r = await b.open("C:/parts/core.hmc");
    expect(r.confidence).toBeGreaterThan(0);
    expect(r.source).toBe("mock");
    expect(r.value.filePath).toBe("C:/parts/core.hmc");
    expect(r.value.format).toBe(".hmc");
    expect(r.value.sessionId).toBeNull();
  });

  it("coerces unknown extensions to .hmc", async () => {
    const b = fresh();
    const r = await b.open("C:/parts/file.unknown");
    expect(r.value.format).toBe(".hmc");
  });

  it("records openFilePath on the bridge instance", async () => {
    const b = fresh();
    expect(b.currentFilePath).toBeNull();
    await b.open("C:/parts/core.hmc");
    expect(b.currentFilePath).toBe("C:/parts/core.hmc");
    expect(b.isSessionActive).toBe(true);
  });
});

describe("getGeometry() — mock mode", () => {
  let b: HyperMILLAutomationBridge;
  beforeEach(async () => {
    b = fresh();
    await b.open("C:/parts/core.hmc");
  });

  it("returns deterministic mock geometry", async () => {
    const g = await b.getGeometry();
    expect(g.source).toBe("mock");
    expect(g.confidence).toBe(1);
    expect(g.value.totalEntities).toBeGreaterThan(0);
  });

  it("geometry buckets are well-formed arrays", async () => {
    const g = (await b.getGeometry()).value as HMCGeometry;
    expect(Array.isArray(g.curves)).toBe(true);
    expect(Array.isArray(g.surfaces)).toBe(true);
    expect(Array.isArray(g.solids)).toBe(true);
    expect(Array.isArray(g.points)).toBe(true);
  });

  it("every curve entry carries a feature tag and a bbox", async () => {
    const g = (await b.getGeometry()).value as HMCGeometry;
    for (const c of g.curves) {
      expect(c.type).toBe("curve");
      expect(c.feature.length).toBeGreaterThan(0);
      expect(Array.isArray(c.bbox)).toBe(true);
      expect(c.bbox!.length).toBe(6);
    }
  });

  it("emits at least one solid body in mock data", async () => {
    const g = (await b.getGeometry()).value as HMCGeometry;
    expect(g.solids.length).toBeGreaterThan(0);
    expect(g.solids[0].type).toBe("solid");
  });
});

describe("getOperationTree() — mock mode", () => {
  let b: HyperMILLAutomationBridge;
  beforeEach(async () => {
    b = fresh();
    await b.open("C:/parts/core.hmc");
  });

  it("returns a job-containing tree", async () => {
    const t = await b.getOperationTree();
    expect(t.value.jobs.length).toBeGreaterThan(0);
  });

  it("totalOperations matches the sum across jobLists", async () => {
    const t = (await b.getOperationTree()).value as HMCOperationTree;
    let sum = 0;
    for (const job of t.jobs) {
      for (const list of job.jobLists) sum += list.operations.length;
    }
    expect(sum).toBe(t.totalOperations);
  });

  it("each job references a machine definition and postprocessor", async () => {
    const t = (await b.getOperationTree()).value as HMCOperationTree;
    for (const job of t.jobs) {
      expect(typeof job.machineDefinition).toBe("string");
      expect(job.machineDefinition.length).toBeGreaterThan(0);
      expect(typeof job.postProcessor).toBe("string");
      expect(job.postProcessor.length).toBeGreaterThan(0);
    }
  });

  it("operations reference valid hyperMILL cycle codes", async () => {
    const t = (await b.getOperationTree()).value as HMCOperationTree;
    const allowed = new Set([
      "3DPocketRoughing",
      "3DZLevel",
      "3DSurface",
      "5AxisSwarf",
      "5AxisTilt",
      "MillingFinishing",
      "DrillCycle",
      "TappingCycle",
    ]);
    for (const job of t.jobs) {
      for (const list of job.jobLists) {
        for (const op of list.operations) expect(allowed.has(op.cycleCode)).toBe(true);
      }
    }
  });

  it("mock tree exposes the three canonical job lists", async () => {
    const t = (await b.getOperationTree()).value as HMCOperationTree;
    const listNames = t.jobs.flatMap((j) => j.jobLists.map((l) => l.name));
    expect(listNames).toContain("Roughing");
    expect(listNames).toContain("Finishing");
    expect(listNames).toContain("5-Axis");
  });
});

describe("getToolpaths() — mock mode", () => {
  it("flattens the operation tree into a single operation list", async () => {
    const b = fresh();
    await b.open("C:/parts/core.hmc");
    const flat = (await b.getToolpaths()).value as HMCOperation[];
    const tree = (await b.getOperationTree()).value as HMCOperationTree;
    expect(flat.length).toBe(tree.totalOperations);
  });

  it("every operation carries positive tool/feed/spindle values", async () => {
    const b = fresh();
    await b.open("C:/parts/core.hmc");
    const flat = (await b.getToolpaths()).value as HMCOperation[];
    for (const op of flat) {
      expect(op.toolDiameter_mm).toBeGreaterThan(0);
      expect(op.spindleRpm).toBeGreaterThan(0);
      expect(op.feedRate_mmpm).toBeGreaterThan(0);
      expect(op.isEnabled).toBe(true);
    }
  });
});

describe("exportSTEP() — mock mode", () => {
  it("reports the output path and AP242 format", async () => {
    const b = fresh();
    await b.open("C:/parts/core.hmc");
    const r = await b.exportSTEP("C:/out/core.step");
    expect(r.source).toBe("mock");
    expect(r.value.outputPath).toBe("C:/out/core.step");
    expect(r.value.format).toBe("STEP AP242");
  });
});

describe("close() — mock mode", () => {
  it("clears the open file path and returns closed envelope", async () => {
    const b = fresh();
    await b.open("C:/parts/core.hmc");
    expect(b.currentFilePath).toBe("C:/parts/core.hmc");
    const r = await b.close();
    expect(r.value.closed).toBe(true);
    expect(r.value.sessionClosed).toBe(true);
    expect(b.currentFilePath).toBeNull();
    expect(b.isSessionActive).toBe(false);
  });

  it("close before open is idempotent (no throw)", async () => {
    const b = fresh();
    await expect(b.close()).resolves.toBeDefined();
  });
});

describe("Extension detection", () => {
  it("CAUT07 extensions round-trip to .hmc", async () => {
    const b = fresh();
    expect((await b.open("x.hmc")).value.format).toBe(".hmc");
    expect((await b.open("x.HMC")).value.format).toBe(".hmc");
  });
});
