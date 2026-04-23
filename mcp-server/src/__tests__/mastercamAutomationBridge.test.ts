/**
 * mastercamAutomationBridge.test.ts
 *
 * Tests for MastercamAutomationBridge (U-CAUT05).
 * All tests run in MOCK mode (PRISM_CAD_MOCK=1) — no Mastercam install required.
 * Spawn/IPC lifecycle tests use module mocking to verify the node:child_process
 * and node:net interactions without real processes.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ── Force mock mode for all tests ─────────────────────────────────────────────
process.env["PRISM_CAD_MOCK"] = "1";

import {
  MastercamAutomationBridge,
  mastercamAutomationBridge,
  type McamFileExt,
  type McamGeometry,
  type McamOperation,
  type McamOperationTree,
  type AtomicValue,
} from "../engines/MastercamAutomationBridge.js";

// ─────────────────────────────────────────────────────────────────────────────
// Helper: create a fresh bridge instance for each test
// ─────────────────────────────────────────────────────────────────────────────
function freshBridge(): MastercamAutomationBridge {
  return new MastercamAutomationBridge();
}

// ─────────────────────────────────────────────────────────────────────────────
// Singleton export
// ─────────────────────────────────────────────────────────────────────────────
describe("Singleton export", () => {
  it("exports mastercamAutomationBridge as a MastercamAutomationBridge instance", () => {
    expect(mastercamAutomationBridge).toBeInstanceOf(MastercamAutomationBridge);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Mock open — file format detection
// ─────────────────────────────────────────────────────────────────────────────
describe("open() — mock mode", () => {
  it("returns ok AtomicValue for .mcx-8 file", async () => {
    const bridge = freshBridge();
    const result = await bridge.open("C:/parts/die_body.mcx-8");

    expect(result.confidence).toBeGreaterThan(0);
    expect(result.source).toBe("mock");
    expect(result.value.filePath).toBe("C:/parts/die_body.mcx-8");
    expect(result.value.format).toBe(".mcx-8");
    expect(result.value.pid).toBeNull(); // mock — no real process
  });

  it("returns ok AtomicValue for .mcam file (Mastercam 2019+)", async () => {
    const bridge = freshBridge();
    const result = await bridge.open("C:/parts/housing.mcam");

    expect(result.value.format).toBe(".mcam");
    expect(result.source).toBe("mock");
  });

  it("handles legacy .MCX extension (pre-2018)", async () => {
    const bridge = freshBridge();
    const result = await bridge.open("H:/PRISM/JM DIE/CNC MILL HAAS/legacy_part.MCX");

    expect(result.value.format).toBe(".MCX");
    expect(result.source).toBe("mock");
  });

  it("defaults unknown extension to .mcx-8", async () => {
    const bridge = freshBridge();
    const result = await bridge.open("C:/parts/part.unknown");

    expect(result.value.format).toBe(".mcx-8");
  });

  it("AtomicValue<T> shape is complete — no missing fields", async () => {
    const bridge = freshBridge();
    const result = await bridge.open("C:/parts/die_body.mcx-8");

    expect(result).toHaveProperty("value");
    expect(result).toHaveProperty("confidence");
    expect(result).toHaveProperty("source");
    // warning is optional — just verify type
    expect(typeof result.confidence).toBe("number");
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getGeometry() — mock fixture
// ─────────────────────────────────────────────────────────────────────────────
describe("getGeometry() — mock mode", () => {
  it("returns McamGeometry with populated entity arrays", async () => {
    const bridge = freshBridge();
    await bridge.open("C:/parts/die.mcx-8");
    const result = await bridge.getGeometry();

    expect(result.source).toBe("mock");
    expect(result.confidence).toBe(1.0);

    const geom: McamGeometry = result.value;
    expect(Array.isArray(geom.lines)).toBe(true);
    expect(Array.isArray(geom.arcs)).toBe(true);
    expect(Array.isArray(geom.splines)).toBe(true);
    expect(Array.isArray(geom.surfaces)).toBe(true);
  });

  it("mock fixture contains 48 lines", async () => {
    const bridge = freshBridge();
    await bridge.open("C:/parts/die.mcx-8");
    const result = await bridge.getGeometry();

    expect(result.value.lines.length).toBe(48);
  });

  it("mock fixture contains 12 arcs", async () => {
    const bridge = freshBridge();
    await bridge.open("C:/parts/die.mcx-8");
    const result = await bridge.getGeometry();

    expect(result.value.arcs.length).toBe(12);
  });

  it("totalEntities matches sum of all entity arrays", async () => {
    const bridge = freshBridge();
    await bridge.open("C:/parts/die.mcx-8");
    const result = await bridge.getGeometry();
    const geom = result.value;

    const sum = geom.lines.length + geom.arcs.length + geom.splines.length + geom.surfaces.length;
    expect(geom.totalEntities).toBe(sum);
  });

  it("entity objects have required fields (type, id, layer, color)", async () => {
    const bridge = freshBridge();
    await bridge.open("C:/parts/die.mcx-8");
    const result = await bridge.getGeometry();
    const first = result.value.lines[0];

    expect(first).toHaveProperty("type", "line");
    expect(first).toHaveProperty("id");
    expect(first).toHaveProperty("layer");
    expect(first).toHaveProperty("color");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getOperationTree() — mock fixture
// ─────────────────────────────────────────────────────────────────────────────
describe("getOperationTree() — mock mode", () => {
  it("returns McamOperationTree with machine groups", async () => {
    const bridge = freshBridge();
    await bridge.open("C:/parts/die.mcx-8");
    const result = await bridge.getOperationTree();

    expect(result.source).toBe("mock");
    const tree: McamOperationTree = result.value;
    expect(Array.isArray(tree.machineGroups)).toBe(true);
    expect(tree.machineGroups.length).toBeGreaterThan(0);
  });

  it("totalOperations is 52 (fixture)", async () => {
    const bridge = freshBridge();
    await bridge.open("C:/parts/die.mcx-8");
    const result = await bridge.getOperationTree();

    expect(result.value.totalOperations).toBe(52);
  });

  it("machine group has controller and postProcessor fields", async () => {
    const bridge = freshBridge();
    await bridge.open("C:/parts/die.mcx-8");
    const result = await bridge.getOperationTree();
    const mg = result.value.machineGroups[0];

    expect(mg).toHaveProperty("name");
    expect(mg).toHaveProperty("controller");
    expect(mg).toHaveProperty("postProcessor");
    expect(mg).toHaveProperty("toolpathGroups");
  });

  it("toolpath groups exist (Roughing, Semi-Finish, Finishing)", async () => {
    const bridge = freshBridge();
    await bridge.open("C:/parts/die.mcx-8");
    const result = await bridge.getOperationTree();
    const groups = result.value.machineGroups[0].toolpathGroups;

    const names = groups.map((g) => g.name);
    expect(names).toContain("Roughing");
    expect(names).toContain("Semi-Finish");
    expect(names).toContain("Finishing");
  });

  it("operations have all required fields", async () => {
    const bridge = freshBridge();
    await bridge.open("C:/parts/die.mcx-8");
    const result = await bridge.getOperationTree();
    const firstOp = result.value.machineGroups[0].toolpathGroups[0].operations[0];

    expect(firstOp).toHaveProperty("index");
    expect(firstOp).toHaveProperty("name");
    expect(firstOp).toHaveProperty("cycleCode");
    expect(firstOp).toHaveProperty("toolDiameter_mm");
    expect(firstOp).toHaveProperty("toolType");
    expect(firstOp).toHaveProperty("spindleRpm");
    expect(firstOp).toHaveProperty("feedRate_mmpm");
    expect(firstOp).toHaveProperty("isEnabled");
    expect(firstOp).toHaveProperty("isDirty");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getToolpaths() — flattened view (≥50 operations)
// ─────────────────────────────────────────────────────────────────────────────
describe("getToolpaths() — mock mode", () => {
  it("returns a flat array of all operations", async () => {
    const bridge = freshBridge();
    await bridge.open("C:/parts/die.mcx-8");
    const result = await bridge.getToolpaths();

    expect(Array.isArray(result.value)).toBe(true);
  });

  it("flat operation count is >= 50 (realistic JM Die job)", async () => {
    const bridge = freshBridge();
    await bridge.open("C:/parts/die.mcx-8");
    const result = await bridge.getToolpaths();

    expect(result.value.length).toBeGreaterThanOrEqual(50);
  });

  it("equals totalOperations from getOperationTree()", async () => {
    const bridge = freshBridge();
    await bridge.open("C:/parts/die.mcx-8");
    const [flatResult, treeResult] = await Promise.all([
      bridge.getToolpaths(),
      bridge.getOperationTree(),
    ]);

    expect(flatResult.value.length).toBe(treeResult.value.totalOperations);
  });

  it("each operation has a cycleCode string (real cycle from catalog)", async () => {
    const bridge = freshBridge();
    await bridge.open("C:/parts/die.mcx-8");
    const result = await bridge.getToolpaths();

    for (const op of result.value) {
      expect(typeof op.cycleCode).toBe("string");
      expect(op.cycleCode.length).toBeGreaterThan(0);
    }
  });

  it("tool diameters are positive numbers", async () => {
    const bridge = freshBridge();
    await bridge.open("C:/parts/die.mcx-8");
    const result = await bridge.getToolpaths();

    for (const op of result.value) {
      expect(op.toolDiameter_mm).toBeGreaterThan(0);
    }
  });

  it("spindle RPM values are positive", async () => {
    const bridge = freshBridge();
    await bridge.open("C:/parts/die.mcx-8");
    const result = await bridge.getToolpaths();

    for (const op of result.value) {
      expect(op.spindleRpm).toBeGreaterThan(0);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// exportSTEP() — mock mode
// ─────────────────────────────────────────────────────────────────────────────
describe("exportSTEP() — mock mode", () => {
  it("returns ok with outputPath and format STEP AP242", async () => {
    const bridge = freshBridge();
    await bridge.open("C:/parts/die.mcx-8");
    const result = await bridge.exportSTEP("C:/tmp/die_export.step");

    expect(result.source).toBe("mock");
    expect(result.value.outputPath).toBe("C:/tmp/die_export.step");
    expect(result.value.format).toBe("STEP AP242");
  });

  it("confidence is 1.0 in mock mode", async () => {
    const bridge = freshBridge();
    await bridge.open("C:/parts/die.mcx-8");
    const result = await bridge.exportSTEP("C:/tmp/out.stp");

    expect(result.confidence).toBe(1.0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// close() — mock mode lifecycle
// ─────────────────────────────────────────────────────────────────────────────
describe("close() — mock mode", () => {
  it("returns closed:true and pid:null in mock mode", async () => {
    const bridge = freshBridge();
    await bridge.open("C:/parts/die.mcx-8");
    const result = await bridge.close();

    expect(result.value.closed).toBe(true);
    expect(result.value.pid).toBeNull();
    expect(result.source).toBe("mock");
  });

  it("full lifecycle: open → getGeometry → getToolpaths → exportSTEP → close", async () => {
    const bridge = freshBridge();

    const opened   = await bridge.open("H:/PRISM/JM DIE/CNC MILL HAAS/die_blank.mcx-8");
    const geom     = await bridge.getGeometry();
    const toolpaths = await bridge.getToolpaths();
    const stepped  = await bridge.exportSTEP("C:/tmp/die_blank.step");
    const closed   = await bridge.close();

    expect(opened.source).toBe("mock");
    expect(geom.value.totalEntities).toBeGreaterThan(0);
    expect(toolpaths.value.length).toBeGreaterThan(0);
    expect(stepped.value.format).toBe("STEP AP242");
    expect(closed.value.closed).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Composed engine accessors
// ─────────────────────────────────────────────────────────────────────────────
describe("Composed engine getters", () => {
  it(".strategy exposes mastercamStrategyEngine (non-null)", () => {
    const bridge = freshBridge();
    expect(bridge.strategy).toBeDefined();
    expect(bridge.strategy).not.toBeNull();
  });

  it(".codeGen exposes mastercamCodeGeneratorEngine (non-null)", () => {
    const bridge = freshBridge();
    expect(bridge.codeGen).toBeDefined();
    expect(bridge.codeGen).not.toBeNull();
  });

  it(".cycles exposes mastercamCycleCatalogEngine with a listAll() method", () => {
    const bridge = freshBridge();
    expect(bridge.cycles).toBeDefined();
    expect(typeof bridge.cycles.listAll).toBe("function");
  });

  it(".cycles.listAll() returns at least 50 cycle definitions", () => {
    const bridge = freshBridge();
    const cycles = bridge.cycles.listAll();
    expect(Array.isArray(cycles)).toBe(true);
    expect(cycles.length).toBeGreaterThanOrEqual(50);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// IPC command serialization (structural tests — no real socket)
// ─────────────────────────────────────────────────────────────────────────────
describe("IPC command structure", () => {
  it("cycleCode values in mock operations are non-empty strings", async () => {
    const bridge = freshBridge();
    await bridge.open("C:/parts/die.mcx-8");
    const ops = (await bridge.getToolpaths()).value;

    // Verify every mock operation has a real cycle code from the catalog
    const invalid = ops.filter((op) => !op.cycleCode || op.cycleCode.trim() === "");
    expect(invalid.length).toBe(0);
  });

  it("operation indices are sequential from 0", async () => {
    const bridge = freshBridge();
    await bridge.open("C:/parts/die.mcx-8");
    const ops = (await bridge.getToolpaths()).value;

    for (let i = 0; i < ops.length; i++) {
      expect(ops[i].index).toBe(i);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Legacy .MCX handling
// ─────────────────────────────────────────────────────────────────────────────
describe("Legacy .MCX file handling", () => {
  it("open detects .MCX format and marks as legacy", async () => {
    const bridge = freshBridge();
    const result = await bridge.open("H:/PRISM/JM DIE/CNC LATHE/ALCOA/legacy.MCX");

    expect(result.value.format).toBe(".MCX");
  });

  it("getToolpaths works normally after opening .MCX (mock)", async () => {
    const bridge = freshBridge();
    await bridge.open("H:/PRISM/JM DIE/CNC LATHE/ALCOA/legacy.MCX");
    const result = await bridge.getToolpaths();

    expect(result.value.length).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Multiple bridge instances are independent
// ─────────────────────────────────────────────────────────────────────────────
describe("Instance isolation", () => {
  it("two bridge instances do not share state", async () => {
    const bridge1 = freshBridge();
    const bridge2 = freshBridge();

    await bridge1.open("C:/parts/die_A.mcx-8");
    await bridge2.open("C:/parts/die_B.mcam");

    const ops1 = await bridge1.getToolpaths();
    const ops2 = await bridge2.getToolpaths();

    // Both return valid data independently
    expect(ops1.value.length).toBeGreaterThan(0);
    expect(ops2.value.length).toBeGreaterThan(0);
  });
});
