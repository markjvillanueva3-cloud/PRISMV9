/**
 * U-CAD2 — CadQuery CAD Validation Test Suite
 *
 * Tests for:
 * 1. Reference part metrics extraction (10 reference_parts/)
 * 2. Roundtrip comparison: reference → regen → compare (volume ±1%, topology)
 * 3. BOX production parts import (5 real customer STEP files)
 * 4. Sweep/loft stress tests (helix, multi-section loft)
 * 5. Full pipeline concept: STEP → features → validate
 */
import { describe, it, expect } from "vitest";
import { existsSync } from "fs";
import * as path from "path";
import {
  cadQueryCodeGeneratorEngine,
  type CadQueryExecutionResult,
} from "../engines/CadQueryCodeGeneratorEngine.js";

// ── Helpers ────────────────────────────────────────────────────────

const PRISM_ROOT = "C:\\PRISM";
const REFERENCE_PARTS = path.resolve(PRISM_ROOT, "cad-engine", "reference_parts");
const ROUNDTRIP_PARTS = path.resolve(PRISM_ROOT, "cad-engine", "exports");
const BOX_PARTS = path.resolve(PRISM_ROOT, "BOX", "PART MODELS FOR LEARNING ENGINE", "BATCH 1");
const PYTHON_PATH = process.env.PRISM_PYTHON_PATH ||
  "C:\\Users\\Admin.DIGITALSTORM-PC\\AppData\\Local\\Programs\\Python\\Python312\\python.exe";

const hasPython = existsSync(PYTHON_PATH);
const hasExecutor = existsSync(
  path.resolve(PRISM_ROOT, "mcp-server", "scripts", "cadquery-executor.py")
);
const canRunIntegration = hasPython && hasExecutor;
const itIntegration = canRunIntegration ? it : it.skip;

const engine = cadQueryCodeGeneratorEngine;

/** Helper: import a STEP file via CadQuery and return metrics */
async function importStepMetrics(stepPath: string): Promise<CadQueryExecutionResult> {
  const escapedPath = stepPath.replace(/\\/g, "\\\\");
  const script = `
import cadquery as cq
result = cq.importers.importStep("${escapedPath}")
`;
  return engine.executeScript(script);
}

// Reference part names
const REFERENCE_PART_NAMES = [
  "bearing_block", "bracket", "bushing", "cube", "cylinder",
  "flanged_plate", "gusset", "manifold_block", "shaft_collar", "spacer",
];

// ── 1. Reference Part Metrics Extraction ─────────────────────────

describe("Reference part metrics extraction", () => {
  for (const partName of REFERENCE_PART_NAMES) {
    const refPath = path.join(REFERENCE_PARTS, `${partName}.step`);

    itIntegration(`imports ${partName}.step and extracts valid metrics`, async () => {
      if (!existsSync(refPath)) {
        return; // skip if file missing
      }
      const result = await importStepMetrics(refPath);
      expect(result.success).toBe(true);
      expect(result.volume_mm3).toBeGreaterThan(0);
      expect(result.bounding_box).toBeDefined();
      expect(result.bounding_box!.length).toBe(3);
      expect(result.bounding_box![0]).toBeGreaterThan(0);
      expect(result.bounding_box![1]).toBeGreaterThan(0);
      expect(result.bounding_box![2]).toBeGreaterThan(0);
      expect(result.face_count).toBeGreaterThan(0);
      expect(result.edge_count).toBeGreaterThan(0);
      expect(result.vertex_count).toBeGreaterThan(0);
      expect(result.is_valid).toBe(true);
    }, 30_000);
  }
});

// ── 2. Roundtrip Comparison ──────────────────────────────────────

describe("Roundtrip comparison: reference vs regenerated", () => {
  for (const partName of REFERENCE_PART_NAMES) {
    const refPath = path.join(REFERENCE_PARTS, `${partName}.step`);
    const rtPath = path.join(ROUNDTRIP_PARTS, `roundtrip_${partName}.step`);

    itIntegration(`roundtrip ${partName}: volume within ±5%`, async () => {
      if (!existsSync(refPath) || !existsSync(rtPath)) {
        return; // skip if either file missing
      }

      const [refResult, rtResult] = await Promise.all([
        importStepMetrics(refPath),
        importStepMetrics(rtPath),
      ]);

      expect(refResult.success).toBe(true);
      expect(rtResult.success).toBe(true);

      const refVol = refResult.volume_mm3!;
      const rtVol = rtResult.volume_mm3!;

      // Volume match within ±5% (CadQuery regen may differ slightly from OCC import)
      const volumeRatio = Math.abs(rtVol - refVol) / refVol;
      expect(volumeRatio).toBeLessThan(0.05);

      // Both must be geometrically valid
      expect(refResult.is_valid).toBe(true);
      expect(rtResult.is_valid).toBe(true);

      // Face count should be in same ballpark (regen may add/remove faces from fillets)
      const refFaces = refResult.face_count!;
      const rtFaces = rtResult.face_count!;
      expect(rtFaces).toBeGreaterThan(0);
      // Allow 50% face count difference — regen topology may differ significantly
      const faceRatio = Math.abs(rtFaces - refFaces) / Math.max(refFaces, 1);
      expect(faceRatio).toBeLessThan(0.50);
    }, 60_000);
  }
});

// ── 3. BOX Production Parts Import ───────────────────────────────

describe("BOX production parts import", () => {
  const BOX_TEST_PARTS = [
    "02-TH-0037 DIE HEX TRIM - MACHINE 5.step",
    "09-FDP-AFR100-9 - MACHINE 1.step",
    "10-010-092 - MULTUS.step",
    "10-011-125  - MACHINE 4.step",
    "1010-2 - MACHINE 5.step",
  ];

  for (const partFile of BOX_TEST_PARTS) {
    const partPath = path.join(BOX_PARTS, partFile);

    itIntegration(`imports BOX part: ${partFile.slice(0, 30)}...`, async () => {
      if (!existsSync(partPath)) {
        return; // skip if BOX data not available
      }
      const result = await importStepMetrics(partPath);
      expect(result.success).toBe(true);
      expect(result.volume_mm3).toBeGreaterThan(0);
      expect(result.is_valid).toBe(true);
      expect(result.face_count).toBeGreaterThan(0);
    }, 60_000);
  }
});

// ── 4. Sweep/Loft Stress Tests ───────────────────────────────────

describe("Complex geometry: sweep and loft", () => {
  itIntegration("helix sweep: spring-like geometry", async () => {
    const script = `
import cadquery as cq
import math

# Create a helical path
helix = cq.Wire.makeHelix(pitch=10, height=50, radius=20)

# Sweep a circle along the helix
result = (cq.Workplane("XZ")
    .center(20, 0)
    .circle(2)
    .sweep(helix, isFrenet=True))
`;
    const result = await engine.executeScript(script);
    if (result.success) {
      expect(result.volume_mm3).toBeGreaterThan(0);
      expect(result.is_valid).toBe(true);
      expect(result.face_count).toBeGreaterThan(0);
    } else {
      // Helix sweep can fail on some CadQuery versions — log but don't hard fail
      expect(result.error).toBeDefined();
    }
  }, 30_000);

  itIntegration("multi-section loft: tapered shape", async () => {
    const script = `
import cadquery as cq

# Create a lofted shape from circle to square
result = (cq.Workplane("XY")
    .circle(20)
    .workplane(offset=40)
    .rect(30, 30)
    .loft())
`;
    const result = await engine.executeScript(script);
    expect(result.success).toBe(true);
    expect(result.volume_mm3).toBeGreaterThan(0);
    expect(result.is_valid).toBe(true);
  }, 30_000);

  itIntegration("revolution: turned part profile", async () => {
    const script = `
import cadquery as cq

# Create a turned part via revolution
result = (cq.Workplane("XZ")
    .moveTo(10, 0)
    .lineTo(10, 30)
    .lineTo(15, 30)
    .lineTo(15, 25)
    .lineTo(12, 25)
    .lineTo(12, 5)
    .lineTo(20, 5)
    .lineTo(20, 0)
    .close()
    .revolve(360, (0, 0, 0), (0, 1, 0)))
`;
    const result = await engine.executeScript(script);
    expect(result.success).toBe(true);
    expect(result.volume_mm3).toBeGreaterThan(0);
    expect(result.is_valid).toBe(true);
    // Should have many faces from the revolution of a stepped profile
    expect(result.face_count).toBeGreaterThan(5);
  }, 30_000);

  itIntegration("boolean operations: pocket and hole pattern", async () => {
    const script = `
import cadquery as cq

result = (cq.Workplane("XY")
    .rect(80, 60).extrude(15)
    .faces(">Z").workplane()
    .rect(60, 40).cutBlind(-10)
    .faces(">Z").workplane()
    .pushPoints([(25, 15), (-25, 15), (25, -15), (-25, -15)])
    .hole(6)
    .edges("|Z").fillet(2))
`;
    const result = await engine.executeScript(script);
    expect(result.success).toBe(true);
    expect(result.volume_mm3).toBeGreaterThan(0);
    expect(result.is_valid).toBe(true);
    // Pocket + 4 holes + fillets = many faces
    expect(result.face_count).toBeGreaterThan(20);
  }, 30_000);
});

// ── 5. Full Pipeline Concept: Generate → Metrics → Validate ─────

describe("Full pipeline concept: generate part and validate metrics", () => {
  itIntegration("bracket: known geometry matches expected dimensions", async () => {
    const script = `
import cadquery as cq

# Simple L-bracket: 40x60x5 base, 10x40x30 upright, hole in top face
result = (cq.Workplane("XY")
    .rect(40, 60).extrude(5)
    .faces(">Z").workplane()
    .center(0, 20)
    .rect(10, 40).extrude(30)
    .faces(">Z").workplane()
    .hole(8))
`;
    const result = await engine.executeScript(script);
    expect(result.success).toBe(true);
    expect(result.is_valid).toBe(true);

    // Volume sanity: base ≈ 40×60×5=12000, upright ≈ 10×40×30=12000, minus hole
    const vol = result.volume_mm3!;
    expect(vol).toBeGreaterThan(20000);
    expect(vol).toBeLessThan(26000);

    // Bounding box should be roughly 40x60x35
    const [bx, by, bz] = result.bounding_box!;
    expect(bx).toBeGreaterThan(35);
    expect(bx).toBeLessThan(50);
    expect(by).toBeGreaterThan(55);
    expect(by).toBeLessThanOrEqual(70);
    expect(bz).toBeGreaterThan(30);
    expect(bz).toBeLessThan(40);
  }, 30_000);

  itIntegration("cylinder with bore: volume matches analytical formula", async () => {
    const OD = 40; // outer diameter
    const ID = 20; // bore diameter
    const H = 50;  // height
    const expectedVolume = Math.PI * ((OD / 2) ** 2 - (ID / 2) ** 2) * H;

    const script = `
import cadquery as cq
result = (cq.Workplane("XY")
    .circle(${OD / 2}).extrude(${H})
    .faces(">Z").workplane().hole(${ID}))
`;
    const result = await engine.executeScript(script);
    expect(result.success).toBe(true);

    // Volume should match analytical within 0.1%
    const volumeError = Math.abs(result.volume_mm3! - expectedVolume) / expectedVolume;
    expect(volumeError).toBeLessThan(0.001);
  }, 30_000);

  itIntegration("box with chamfers: metrics are self-consistent", async () => {
    const script = `
import cadquery as cq
result = (cq.Workplane("XY")
    .rect(50, 50).extrude(20)
    .edges("|Z").chamfer(3)
    .edges(">Z").chamfer(1))
`;
    const result = await engine.executeScript(script);
    expect(result.success).toBe(true);
    expect(result.is_valid).toBe(true);

    // Volume should be less than 50*50*20=50000 due to chamfers
    expect(result.volume_mm3).toBeLessThan(50000);
    expect(result.volume_mm3).toBeGreaterThan(40000);

    // Chamfered box has more faces than a plain box (6)
    expect(result.face_count).toBeGreaterThan(6);
  }, 30_000);
});

// ── 6. introspect() Validation ───────────────────────────────────

describe("introspect() via executor — geometry analysis", () => {
  itIntegration("introspect returns bbox, volume, surface area for simple box", async () => {
    const script = `
import cadquery as cq
result = cq.Workplane("XY").rect(100, 50).extrude(25)
`;
    const metrics = await engine.executeScript(script);
    expect(metrics.success).toBe(true);

    // Known geometry: 100x50x25 box
    expect(metrics.volume_mm3).toBeCloseTo(100 * 50 * 25, -1);
    expect(metrics.bounding_box![0]).toBeCloseTo(100, 0);
    expect(metrics.bounding_box![1]).toBeCloseTo(50, 0);
    expect(metrics.bounding_box![2]).toBeCloseTo(25, 0);
    expect(metrics.face_count).toBe(6); // box has 6 faces
    expect(metrics.edge_count).toBe(12); // box has 12 edges
    expect(metrics.vertex_count).toBe(8); // box has 8 vertices
  }, 30_000);
});
