/**
 * CC-MS0: CadBridge Integration Tests
 *
 * Tests the TypeScript ↔ Python CAD bridge round-trip:
 * - Process lifecycle (spawn, ready signal, shutdown)
 * - Geometry creation (box, cylinder, sphere)
 * - Boolean operations
 * - Geometry validation
 * - STEP export + import round-trip with volume comparison
 * - Error handling (invalid params, unknown methods)
 */
import { describe, it, expect, afterAll } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { CadBridge } from "../engines/CadBridge.js";

// Use a fresh instance for tests (not the singleton)
const bridge = CadBridge.getInstance({ timeout: 15_000 });

const EXPORTS_DIR = path.resolve("C:\\PRISM\\cad-engine\\exports\\integration");

afterAll(async () => {
  await bridge.shutdown();
  // Clean up test exports
  if (fs.existsSync(EXPORTS_DIR)) {
    fs.rmSync(EXPORTS_DIR, { recursive: true, force: true });
  }
});

// ============================================================================
// Process lifecycle
// ============================================================================
describe("CadBridge process lifecycle", () => {
  it("responds to ping with status ok", async () => {
    const result = await bridge.ping();
    expect(result.status).toBe("ok");
    expect(result.version).toBe("0.1.0");
    expect(typeof result.solids_in_memory).toBe("number");
  });
});

// ============================================================================
// Geometry creation
// ============================================================================
describe("CadBridge geometry creation", () => {
  it("creates a box with correct volume", async () => {
    const result = await bridge.createGeometry({
      type: "box",
      width: 20,
      height: 20,
      depth: 20,
    });
    expect(result.solid_id).toBeTruthy();
    expect(result.volume_mm3).toBeCloseTo(8000, 0);
    expect(result.bounding_box.size).toEqual([20, 20, 20]);
  });

  it("creates a cylinder with correct volume", async () => {
    const result = await bridge.createGeometry({
      type: "cylinder",
      radius: 10,
      height: 25,
    });
    expect(result.solid_id).toBeTruthy();
    // pi * 10^2 * 25 = 7853.98
    expect(result.volume_mm3).toBeCloseTo(7853.98, 0);
  });

  it("creates a sphere with correct volume", async () => {
    const result = await bridge.createGeometry({
      type: "sphere",
      radius: 15,
    });
    expect(result.solid_id).toBeTruthy();
    // 4/3 * pi * 15^3 = 14137.17
    expect(result.volume_mm3).toBeCloseTo(14137.17, 0);
  });

  it("creates geometry with fillet applied", async () => {
    const result = await bridge.createGeometry({
      type: "box",
      width: 30,
      height: 30,
      depth: 30,
      fillet_radius: 2,
    });
    expect(result.solid_id).toBeTruthy();
    // Filleted box has slightly less volume than raw box
    expect(result.volume_mm3).toBeLessThan(27000);
    expect(result.volume_mm3).toBeGreaterThan(25000);
  });
});

// ============================================================================
// Boolean operations
// ============================================================================
describe("CadBridge boolean operations", () => {
  it("subtracts cylinder from box", async () => {
    const box = await bridge.createGeometry({
      type: "box",
      width: 20,
      height: 20,
      depth: 20,
    });
    const cyl = await bridge.createGeometry({
      type: "cylinder",
      radius: 5,
      height: 30,
    });
    const result = await bridge.booleanOp({
      operation: "subtract",
      solid_a: box.solid_id,
      solid_b: cyl.solid_id,
    });
    expect(result.solid_id).toBeTruthy();
    // 8000 - pi*5^2*20 = 8000 - 1570.8 = 6429.2
    expect(result.volume_mm3).toBeCloseTo(6429.2, 0);
  });
});

// ============================================================================
// Geometry validation
// ============================================================================
describe("CadBridge geometry validation", () => {
  it("validates a box as manifold and watertight", async () => {
    const box = await bridge.createGeometry({
      type: "box",
      width: 25,
      height: 25,
      depth: 25,
    });
    const report = await bridge.validateGeometry({
      solid_id: box.solid_id,
      check_thickness: false,
    });
    expect(report.is_valid).toBe(true);
    expect(report.is_manifold).toBe(true);
    expect(report.is_watertight).toBe(true);
    expect(report.volume_mm3).toBeCloseTo(15625, 0);
    expect(report.face_count).toBe(6);
  });
});

// ============================================================================
// Export + import round-trip
// ============================================================================
describe("CadBridge STEP round-trip", () => {
  it("exports and re-imports with volume within 0.1%", async () => {
    fs.mkdirSync(EXPORTS_DIR, { recursive: true });
    const stepPath = path.join(EXPORTS_DIR, "roundtrip_box.step");

    // Create
    const box = await bridge.createGeometry({
      type: "box",
      width: 30,
      height: 40,
      depth: 50,
    });
    const originalVolume = box.volume_mm3;

    // Export
    const exported = await bridge.exportGeometry({
      solid_id: box.solid_id,
      format: "STEP",
      output_path: stepPath,
    });
    expect(exported.success).toBe(true);
    expect(exported.file_size_bytes).toBeGreaterThan(0);

    // Re-import
    const imported = await bridge.importStep({ input_path: stepPath });
    const pctDiff =
      (Math.abs(originalVolume - imported.volume_mm3) / originalVolume) * 100;
    expect(pctDiff).toBeLessThan(0.1);
  });
});

// ============================================================================
// Error handling
// ============================================================================
describe("CadBridge error handling", () => {
  it("rejects invalid solid_id", async () => {
    await expect(
      bridge.validateGeometry({ solid_id: "nonexistent_999" })
    ).rejects.toThrow("Unknown solid ID");
  });

  it("rejects invalid geometry type", async () => {
    await expect(
      bridge.createGeometry({ type: "dodecahedron" as never })
    ).rejects.toThrow("Unknown geometry type");
  });
});

// ============================================================================
// Memory management
// ============================================================================
describe("CadBridge memory management", () => {
  it("clears all stored solids", async () => {
    // Create a few solids
    await bridge.createGeometry({ type: "box", width: 5, height: 5, depth: 5 });
    await bridge.createGeometry({ type: "sphere", radius: 3 });

    const result = await bridge.clear();
    expect(result.cleared).toBeGreaterThanOrEqual(2);

    // Verify ping shows 0 solids
    const ping = await bridge.ping();
    expect(ping.solids_in_memory).toBe(0);
  });
});
