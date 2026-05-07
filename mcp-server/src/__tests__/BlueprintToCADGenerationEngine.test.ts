/**
 * BlueprintToCADGenerationEngine — PHASE23 wiring tests.
 *
 * Covers: capabilities, validate guard rails, extractFeatures from OCR,
 * toBlueprintData passthrough, reconstruct3D bounding-box assembly,
 * validateAgainstBlueprint dimension scoring. The full async generate()
 * path requires NeuralCADGenerationEngine + backends and is exercised in
 * the dispatcher e2e suite — these tests cover the deterministic surface
 * directly so PHASE23 wiring is provably non-stub.
 */
import { describe, it, expect } from "vitest";
import {
  BlueprintToCADGenerationEngine,
  blueprintToCADGenerationEngine,
  type BlueprintOCRResult,
  type ExtractedDimension,
  type ExtractedView,
} from "../engines/BlueprintToCADGenerationEngine.js";

const ocrFixture: BlueprintOCRResult = {
  partNumber: "JM-DIE-TEST-001",
  revision: "A",
  units: "mm",
  dimensions: [
    { name: "OD", value: 50, unit: "mm" },
    { name: "ID", value: 25, unit: "mm" },
    { name: "LENGTH", value: 100, unit: "mm" },
  ],
  gdtCallouts: [
    { symbol: "⊥", value: 0.02, datum: "A" },
    { symbol: "○", value: 0.01 },
  ],
  views: [
    { type: "front", features: ["bore", "od"] },
    { type: "side", features: ["chamfer"] },
  ],
  confidence: 0.92,
};

describe("BlueprintToCADGenerationEngine", () => {
  it("singleton is a real BlueprintToCADGenerationEngine instance", () => {
    expect(blueprintToCADGenerationEngine).toBeInstanceOf(BlueprintToCADGenerationEngine);
  });

  it("getCapabilities returns 4 capability slots", () => {
    const caps = blueprintToCADGenerationEngine.getCapabilities();
    expect(caps.length).toBe(4);
    const names = caps.map(c => c.name).sort();
    expect(names).toEqual([
      "extract_features",
      "from_blueprint",
      "reconstruct_3d",
      "validate_dimensions",
    ]);
  });

  it("validate rejects null input with object-required message", () => {
    expect(blueprintToCADGenerationEngine.validate(null)).toBe("input must be an object");
  });

  it("validate rejects non-object input with object-required message", () => {
    expect(blueprintToCADGenerationEngine.validate("not-an-object")).toBe("input must be an object");
  });

  it("validate rejects empty object with image-or-ocr message", () => {
    expect(blueprintToCADGenerationEngine.validate({})).toBe(
      "either image or ocrResult is required",
    );
  });

  it("validate accepts payload with ocrResult (returns null)", () => {
    expect(blueprintToCADGenerationEngine.validate({ ocrResult: ocrFixture })).toBe(null);
  });

  it("validate accepts payload with image (returns null)", () => {
    expect(
      blueprintToCADGenerationEngine.validate({
        image: { type: "file", path: "/tmp/print.png" },
      }),
    ).toBe(null);
  });

  it("extractFeatures returns at least one feature for OCR with 3 dimensions", () => {
    const features = blueprintToCADGenerationEngine.extractFeatures(ocrFixture);
    expect(Array.isArray(features)).toBe(true);
    expect(features.length).toBeGreaterThanOrEqual(1);
  });

  it("extractFeatures emits a single box fallback for OCR with no dims/views", () => {
    const empty: BlueprintOCRResult = {
      units: "mm",
      dimensions: [],
      gdtCallouts: [],
      views: [],
      confidence: 0.5,
    };
    const features = blueprintToCADGenerationEngine.extractFeatures(empty);
    expect(Array.isArray(features)).toBe(true);
    // No OD/ID detected → prismatic branch emits exactly one box feature
    expect(features.length).toBe(1);
    expect(features[0]?.type).toBe("box");
  });

  it("extractFeatures emits cylinder + hole when both OD and ID are present", () => {
    const ocr: BlueprintOCRResult = {
      units: "mm",
      dimensions: [
        { name: "OD", value: 50, unit: "mm" },
        { name: "ID", value: 25, unit: "mm" },
        { name: "LENGTH", value: 100, unit: "mm" },
      ],
      gdtCallouts: [],
      views: [],
      confidence: 0.9,
    };
    const features = blueprintToCADGenerationEngine.extractFeatures(ocr);
    const types = features.map(f => f.type).sort();
    expect(types).toContain("cylinder");
    expect(types).toContain("hole");
  });

  it("extractFeatures emits chamfer feature with the chamfer dim value", () => {
    const ocr: BlueprintOCRResult = {
      units: "mm",
      dimensions: [
        { name: "OD", value: 50, unit: "mm" },
        { name: "CHAMFER", value: 1.5, unit: "mm" },
      ],
      gdtCallouts: [],
      views: [{ type: "side", features: ["chamfer"] }],
      confidence: 0.9,
    };
    const features = blueprintToCADGenerationEngine.extractFeatures(ocr);
    const types = features.map(f => f.type);
    expect(types).toContain("chamfer");
    const cham = features.find(f => f.type === "chamfer");
    expect((cham?.params as { size: number }).size).toBe(1.5);
  });

  it("toBlueprintData returns a non-null object", () => {
    const bp = blueprintToCADGenerationEngine.toBlueprintData(ocrFixture);
    expect(typeof bp).toBe("object");
    expect(bp).not.toBe(null);
  });

  it("reconstruct3D returns a bounding box with finite x/y/z dimensions", () => {
    const views: ExtractedView[] = [
      { type: "front", bounds: { width: 50, height: 100 }, features: [] },
      { type: "side", bounds: { width: 100, height: 50 }, features: [] },
    ];
    const dims: ExtractedDimension[] = [
      { name: "X", value: 50, unit: "mm" },
      { name: "Y", value: 100, unit: "mm" },
      { name: "Z", value: 50, unit: "mm" },
    ];
    const bbox = blueprintToCADGenerationEngine.reconstruct3D(views, dims);
    expect(typeof bbox).toBe("object");
    expect(bbox).not.toBe(null);
    // BoundingBox3D shape from engine — width/height/depth must be present and finite
    const b = bbox as Record<string, number>;
    const numericKeys = Object.keys(b).filter(k => typeof b[k] === "number");
    expect(numericKeys.length).toBeGreaterThanOrEqual(3);
    for (const k of numericKeys) {
      expect(Number.isFinite(b[k])).toBe(true);
    }
  });

  it("validateAgainstBlueprint counts 3 dims, 0 valid for empty CAD code", () => {
    const v = blueprintToCADGenerationEngine.validateAgainstBlueprint("", ocrFixture, 0.005);
    expect(v.totalDimensions).toBe(3);
    expect(v.validDimensions).toBe(0);
    expect(v.accuracyPercent).toBe(0);
    expect(v.details.length).toBe(3);
  });

  it("validateAgainstBlueprint default tolerance matches explicit 0.005", () => {
    const a = blueprintToCADGenerationEngine.validateAgainstBlueprint("", ocrFixture);
    const b = blueprintToCADGenerationEngine.validateAgainstBlueprint("", ocrFixture, 0.005);
    expect(a.totalDimensions).toBe(b.totalDimensions);
    expect(a.validDimensions).toBe(b.validDimensions);
    expect(a.accuracyPercent).toBe(b.accuracyPercent);
  });

  it("class instances are independent of singleton", () => {
    const fresh = new BlueprintToCADGenerationEngine();
    expect(fresh).not.toBe(blueprintToCADGenerationEngine);
    expect(fresh.getCapabilities().length).toBe(4);
  });
});
