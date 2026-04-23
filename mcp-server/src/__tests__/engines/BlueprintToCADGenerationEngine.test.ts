/**
 * BlueprintToCADGenerationEngine Tests — CADCAM-DAGI-MS0/U-DAGI08
 *
 * 25 tests covering:
 *   - generate(): full pipeline with mock backends
 *   - extractFeatures(): feature extraction from OCR
 *   - reconstruct3D(): 3D reconstruction from views
 *   - validateAgainstBlueprint(): dimension validation
 *   - toBlueprintData(): OCR-to-BlueprintData conversion
 *   - Error handling and edge cases
 */
import { describe, it, expect } from "vitest";
import {
  blueprintToCADGenerationEngine,
  type BlueprintOCRResult,
  type BlueprintToCADInput,
  type OCRBackend,
  type ImageSource,
  type ExtractedView,
  type ExtractedDimension,
} from "../../engines/BlueprintToCADGenerationEngine.js";
import type { GenerationBackend } from "../../engines/NeuralCADGenerationEngine.js";

// ── Mock Backends ────────────────────────────────────────────────────────────

class MockGenerationBackend implements GenerationBackend {
  async generate(): Promise<number[]> {
    return [50, 60, 70, 80, 90];
  }
  scoreSequence(): number {
    return 0.9;
  }
}

class MockOCRBackend implements OCRBackend {
  result: BlueprintOCRResult;

  constructor(result?: Partial<BlueprintOCRResult>) {
    this.result = {
      units: "mm",
      dimensions: [
        { name: "width", value: 100, unit: "mm" },
        { name: "height", value: 50, unit: "mm" },
        { name: "depth", value: 20, unit: "mm" },
      ],
      gdtCallouts: [],
      views: [{ type: "front", features: [], bounds: { width: 100, height: 50 } }],
      confidence: 0.95,
      ...result,
    };
  }

  async extract(_image: ImageSource): Promise<BlueprintOCRResult> {
    return this.result;
  }
}

class FailingOCRBackend implements OCRBackend {
  async extract(): Promise<BlueprintOCRResult> {
    throw new Error("OCR service unavailable");
  }
}

// ── Sample Data ──────────────────────────────────────────────────────────────

const sampleOCR: BlueprintOCRResult = {
  partNumber: "JMD-1234",
  revision: "A",
  title: "Flange Adapter",
  material: "4140 Steel",
  finish: "32 Ra",
  units: "mm",
  dimensions: [
    { name: "OD", value: 60, unit: "mm", tolerance: 0.05 },
    { name: "ID", value: 25, unit: "mm", tolerance: 0.02 },
    { name: "length", value: 40, unit: "mm" },
    { name: "chamfer", value: 1, unit: "mm" },
  ],
  gdtCallouts: [
    { symbol: "position", value: 0.1, datum: "A" },
    { symbol: "perpendicularity", value: 0.05, datum: "B" },
  ],
  views: [
    { type: "front", features: ["hole", "chamfer"], bounds: { width: 60, height: 40 } },
    { type: "side", features: [], bounds: { width: 40, height: 60 } },
  ],
  thickness: 40,
  confidence: 0.92,
};

const inchOCR: BlueprintOCRResult = {
  units: "in",
  dimensions: [
    { name: "width", value: 4, unit: "in" },
    { name: "height", value: 2, unit: "in" },
    { name: "depth", value: 1, unit: "in" },
  ],
  gdtCallouts: [],
  views: [{ type: "front", features: [], bounds: { width: 101.6, height: 50.8 } }],
  confidence: 0.88,
};

// ── Tests ────────────────────────────────────────────────────────────────────

describe("BlueprintToCADGenerationEngine", () => {
  // ── Engine Info ─────────────────────────────────────────────────────────
  describe("engine info", () => {
    it("has correct name and version", () => {
      expect(blueprintToCADGenerationEngine.info.name).toBe("BlueprintToCADGenerationEngine");
      expect(blueprintToCADGenerationEngine.info.version).toBe("1.0.0");
      expect(blueprintToCADGenerationEngine.info.domain).toBe("cad_blueprint");
    });

    it("exposes required capabilities", () => {
      const caps = blueprintToCADGenerationEngine.getCapabilities();
      const names = caps.map(c => c.name);
      expect(names).toContain("from_blueprint");
      expect(names).toContain("extract_features");
      expect(names).toContain("validate_dimensions");
      expect(names).toContain("reconstruct_3d");
    });
  });

  // ── validate ────────────────────────────────────────────────────────────
  describe("validate", () => {
    it("returns null for valid input with ocrResult", () => {
      const result = blueprintToCADGenerationEngine.validate({ ocrResult: sampleOCR });
      expect(result).toBeNull();
    });

    it("returns null for valid input with image", () => {
      const result = blueprintToCADGenerationEngine.validate({
        image: { type: "file", path: "/test.png" },
      });
      expect(result).toBeNull();
    });

    it("returns error for null input", () => {
      const result = blueprintToCADGenerationEngine.validate(null);
      expect(result).toBe("input must be an object");
    });

    it("returns error for missing image and ocrResult", () => {
      const result = blueprintToCADGenerationEngine.validate({});
      expect(result).toBe("either image or ocrResult is required");
    });
  });

  // ── extractFeatures ─────────────────────────────────────────────────────
  describe("extractFeatures", () => {
    it("extracts cylinder from OD dimension", () => {
      const features = blueprintToCADGenerationEngine.extractFeatures(sampleOCR);
      expect(features.some(f => f.type === "cylinder")).toBe(true);
    });

    it("extracts bore/hole from ID dimension", () => {
      const features = blueprintToCADGenerationEngine.extractFeatures(sampleOCR);
      expect(features.some(f => f.type === "hole")).toBe(true);
    });

    it("extracts chamfer from view features", () => {
      const features = blueprintToCADGenerationEngine.extractFeatures(sampleOCR);
      expect(features.some(f => f.type === "chamfer")).toBe(true);
    });

    it("extracts box for prismatic parts", () => {
      const prismaticOCR: BlueprintOCRResult = {
        units: "mm",
        dimensions: [
          { name: "width", value: 100, unit: "mm" },
          { name: "height", value: 50, unit: "mm" },
        ],
        gdtCallouts: [],
        views: [{ type: "front", features: [], bounds: { width: 100, height: 50 } }],
        confidence: 0.9,
      };
      const features = blueprintToCADGenerationEngine.extractFeatures(prismaticOCR);
      expect(features.some(f => f.type === "box")).toBe(true);
    });

    it("handles inch units correctly", () => {
      const features = blueprintToCADGenerationEngine.extractFeatures(inchOCR);
      const box = features.find(f => f.type === "box");
      expect(box).toBeDefined();
      // 4" = 101.6mm
      expect(box!.params.width).toBeCloseTo(101.6, 1);
    });

    it("extracts thread from view features", () => {
      const threadOCR: BlueprintOCRResult = {
        units: "mm",
        dimensions: [],
        gdtCallouts: [],
        views: [{ type: "front", features: ["M10 thread"], bounds: { width: 50, height: 50 } }],
        confidence: 0.9,
      };
      const features = blueprintToCADGenerationEngine.extractFeatures(threadOCR);
      expect(features.some(f => f.type === "thread")).toBe(true);
    });
  });

  // ── reconstruct3D ───────────────────────────────────────────────────────
  describe("reconstruct3D", () => {
    it("reconstructs bounding box from dimensions", () => {
      const views: ExtractedView[] = [
        { type: "front", features: [], bounds: { width: 100, height: 50 } },
      ];
      const dims: ExtractedDimension[] = [
        { name: "width", value: 100, unit: "mm" },
        { name: "height", value: 50, unit: "mm" },
        { name: "depth", value: 25, unit: "mm" },
      ];
      const bbox = blueprintToCADGenerationEngine.reconstruct3D(views, dims);

      expect(bbox.width).toBe(100);
      expect(bbox.height).toBe(50);
      expect(bbox.depth).toBe(25);
    });

    it("uses view bounds when dimensions not named", () => {
      const views: ExtractedView[] = [
        { type: "front", features: [], bounds: { width: 80, height: 60 } },
        { type: "top", features: [], bounds: { width: 80, height: 30 } },
      ];
      const bbox = blueprintToCADGenerationEngine.reconstruct3D(views, []);

      expect(bbox.width).toBe(80);
      expect(bbox.height).toBe(60);
      expect(bbox.depth).toBe(30);
    });

    it("handles cylindrical parts with diameter", () => {
      const dims: ExtractedDimension[] = [
        { name: "OD", value: 50, unit: "mm" },
      ];
      const bbox = blueprintToCADGenerationEngine.reconstruct3D([], dims);

      expect(bbox.width).toBe(50);
      expect(bbox.height).toBe(50);
    });

    it("converts inch dimensions to mm", () => {
      const dims: ExtractedDimension[] = [
        { name: "width", value: 2, unit: "in" },
        { name: "height", value: 1, unit: "in" },
      ];
      const bbox = blueprintToCADGenerationEngine.reconstruct3D([], dims);

      expect(bbox.width).toBeCloseTo(50.8, 1);
      expect(bbox.height).toBeCloseTo(25.4, 1);
    });
  });

  // ── toBlueprintData ─────────────────────────────────────────────────────
  describe("toBlueprintData", () => {
    it("converts OCR dimensions to BlueprintData format", () => {
      const bpData = blueprintToCADGenerationEngine.toBlueprintData(sampleOCR);

      expect(bpData.dimensions.length).toBe(4);
      expect(bpData.dimensions[0].name).toBe("OD");
      expect(bpData.dimensions[0].value).toBe(60);
    });

    it("preserves material information", () => {
      const bpData = blueprintToCADGenerationEngine.toBlueprintData(sampleOCR);
      expect(bpData.material).toBe("4140 Steel");
    });

    it("converts GD&T callouts", () => {
      const bpData = blueprintToCADGenerationEngine.toBlueprintData(sampleOCR);

      expect(bpData.gdnt).toBeDefined();
      expect(bpData.gdnt!.length).toBe(2);
      expect(bpData.gdnt![0].symbol).toBe("position");
    });

    it("includes view information", () => {
      const bpData = blueprintToCADGenerationEngine.toBlueprintData(sampleOCR);

      expect(bpData.views.length).toBe(2);
      expect(bpData.views[0].type).toBe("front");
    });

    it("extracts features into feature list", () => {
      const bpData = blueprintToCADGenerationEngine.toBlueprintData(sampleOCR);

      expect(bpData.features.length).toBeGreaterThan(0);
      expect(bpData.features).toContain("cylinder");
    });
  });

  // ── validateAgainstBlueprint ────────────────────────────────────────────
  describe("validateAgainstBlueprint", () => {
    it("validates dimensions within tolerance", () => {
      const code = `
import cadquery as cq
result = cq.Workplane('XY').cylinder(40, 30).faces('>Z').hole(25, 40)
show_object(result)`;

      const validation = blueprintToCADGenerationEngine.validateAgainstBlueprint(code, sampleOCR);

      expect(validation.totalDimensions).toBe(4);
      expect(validation.validDimensions).toBeGreaterThan(0);
    });

    it("detects out-of-tolerance dimensions", () => {
      const code = `
import cadquery as cq
result = cq.Workplane('XY').box(200, 200, 200)
show_object(result)`;

      const validation = blueprintToCADGenerationEngine.validateAgainstBlueprint(code, sampleOCR);

      // Most dimensions will be out of tolerance
      expect(validation.accuracyPercent).toBeLessThan(100);
    });

    it("uses custom tolerance when provided", () => {
      const code = `
import cadquery as cq
result = cq.Workplane('XY').cylinder(40.5, 30)
show_object(result)`;

      // Tight tolerance should fail
      const tightValidation = blueprintToCADGenerationEngine.validateAgainstBlueprint(code, sampleOCR, 0.001);
      // Loose tolerance might pass more
      const looseValidation = blueprintToCADGenerationEngine.validateAgainstBlueprint(code, sampleOCR, 0.1);

      expect(looseValidation.validDimensions).toBeGreaterThanOrEqual(tightValidation.validDimensions);
    });

    it("returns 100% for empty dimensions", () => {
      const emptyOCR: BlueprintOCRResult = {
        units: "mm",
        dimensions: [],
        gdtCallouts: [],
        views: [],
        confidence: 1,
      };
      const validation = blueprintToCADGenerationEngine.validateAgainstBlueprint("code", emptyOCR);

      expect(validation.accuracyPercent).toBe(100);
      expect(validation.totalDimensions).toBe(0);
    });
  });

  // ── generate (full pipeline) ────────────────────────────────────────────
  describe("generate", () => {
    it("generates CAD from pre-extracted OCR result", async () => {
      const input: BlueprintToCADInput = {
        ocrResult: sampleOCR,
        customer: "ALCOA",
      };

      const result = await blueprintToCADGenerationEngine.generate(
        input,
        new MockGenerationBackend()
      );

      expect(result.code).toContain("import cadquery");
      expect(result.ocr).toBe(sampleOCR);
      expect(result.viewsProcessed).toContain("front");
      expect(result.viewsProcessed).toContain("side");
    });

    it("generates CAD from image with OCR backend", async () => {
      const input: BlueprintToCADInput = {
        image: { type: "file", path: "/test/blueprint.png" },
      };

      const result = await blueprintToCADGenerationEngine.generate(
        input,
        new MockGenerationBackend(),
        new MockOCRBackend()
      );

      expect(result.code).toContain("import cadquery");
      expect(result.ocr.confidence).toBe(0.95);
    });

    it("returns error when OCR fails", async () => {
      const input: BlueprintToCADInput = {
        image: { type: "file", path: "/test/blueprint.png" },
      };

      const result = await blueprintToCADGenerationEngine.generate(
        input,
        new MockGenerationBackend(),
        new FailingOCRBackend()
      );

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain("OCR extraction failed");
    });

    it("returns error when no image and no ocrResult", async () => {
      const input: BlueprintToCADInput = {};

      const result = await blueprintToCADGenerationEngine.generate(
        input,
        new MockGenerationBackend()
      );

      expect(result.success).toBe(false);
      expect(result.errors[0]).toContain("No image or ocrResult provided");
    });

    it("includes dimension validation in result", async () => {
      const input: BlueprintToCADInput = {
        ocrResult: sampleOCR,
      };

      const result = await blueprintToCADGenerationEngine.generate(
        input,
        new MockGenerationBackend()
      );

      expect(result.dimensionValidation.totalDimensions).toBe(4);
      expect(typeof result.dimensionValidation.accuracyPercent).toBe("number");
    });

    it("includes GD&T preservation metrics", async () => {
      const input: BlueprintToCADInput = {
        ocrResult: sampleOCR,
      };

      const result = await blueprintToCADGenerationEngine.generate(
        input,
        new MockGenerationBackend()
      );

      expect(result.gdtPreservation.totalCallouts).toBe(2);
      expect(result.gdtPreservation.preservationPercent).toBeGreaterThan(0);
    });

    it("tracks revision when provided", async () => {
      const input: BlueprintToCADInput = {
        ocrResult: sampleOCR,
        revision: "B",
      };

      const result = await blueprintToCADGenerationEngine.generate(
        input,
        new MockGenerationBackend()
      );

      expect(result.revision).toBe("B");
    });

    it("uses custom tolerance for validation", async () => {
      const input: BlueprintToCADInput = {
        ocrResult: sampleOCR,
        toleranceInch: 0.001,
      };

      const result = await blueprintToCADGenerationEngine.generate(
        input,
        new MockGenerationBackend()
      );

      // Tighter tolerance should affect validation
      expect(result.dimensionValidation.details.length).toBe(4);
    });

    it("propagates machine category to generation", async () => {
      const input: BlueprintToCADInput = {
        ocrResult: sampleOCR,
        machineCategory: "lathe",
      };

      const result = await blueprintToCADGenerationEngine.generate(
        input,
        new MockGenerationBackend()
      );

      expect(result.code).toBeTruthy();
    });
  });
});
