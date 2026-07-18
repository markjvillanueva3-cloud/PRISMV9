/**
 * CADRegenerationTestEngine — CAD-COMPLETE-MS0/U-CADC21
 *
 * Compares generated CAD against original to validate regeneration fidelity.
 * Given an original CAD file, generates equivalent via NeuralCADGenerationEngine,
 * then compares: volume delta, bounding box match, topology similarity.
 *
 * Comparison metrics:
 *   - Volume delta: |V_gen - V_orig| / V_orig (threshold: 5%)
 *   - Bounding box: max(|dim_gen - dim_orig|) / dim_orig (threshold: 2%)
 *   - Topology: Jaccard similarity of feature types (threshold: 80%)
 *   - Feature count: |N_gen - N_orig| / N_orig (threshold: 20%)
 *
 * Result: PASS if all metrics within threshold, FAIL otherwise.
 *
 * Dependencies:
 *   - NeuralCADGenerationEngine (U-DAGI07) for generation
 *   - CADTrainingCorpusOrchestratorEngine for file parsing
 */
import { z } from "zod";

// ── Types ────────────────────────────────────────────────────────────────────

export interface BoundingBox {
  minX: number;
  minY: number;
  minZ: number;
  maxX: number;
  maxY: number;
  maxZ: number;
}

export interface CADGeometry {
  volume: number;
  surfaceArea: number;
  boundingBox: BoundingBox;
  features: string[];
  featureCount: number;
}

export interface ComparisonThresholds {
  volumeDeltaPercent: number;
  bboxDeltaPercent: number;
  topologySimilarityMin: number;
  featureCountDeltaPercent: number;
}

export interface MetricResult {
  name: string;
  originalValue: number;
  generatedValue: number;
  delta: number;
  deltaPercent: number;
  threshold: number;
  passed: boolean;
}

export interface TopologyResult {
  originalFeatures: string[];
  generatedFeatures: string[];
  intersection: string[];
  union: string[];
  jaccardSimilarity: number;
  threshold: number;
  passed: boolean;
}

export interface RegenerationTestResult {
  testId: string;
  originalPath: string;
  status: "pass" | "fail" | "error";
  metrics: {
    volume: MetricResult;
    bboxX: MetricResult;
    bboxY: MetricResult;
    bboxZ: MetricResult;
    featureCount: MetricResult;
    topology: TopologyResult;
  };
  overallScore: number;
  passedCount: number;
  totalCount: number;
  generatedCode?: string;
  error?: string;
  durationMs: number;
  timestamp: string;
}

export interface BatchTestConfig {
  paths: string[];
  thresholds?: Partial<ComparisonThresholds>;
  maxConcurrent?: number;
  stopOnFirstFail?: boolean;
}

export interface BatchTestResult {
  batchId: string;
  totalTests: number;
  passed: number;
  failed: number;
  errors: number;
  passRate: number;
  results: RegenerationTestResult[];
  durationMs: number;
  timestamp: string;
}

// ── Zod Schemas ──────────────────────────────────────────────────────────────

const BoundingBoxSchema = z.object({
  minX: z.number(),
  minY: z.number(),
  minZ: z.number(),
  maxX: z.number(),
  maxY: z.number(),
  maxZ: z.number(),
});

const CADGeometrySchema = z.object({
  volume: z.number().nonnegative(),
  surfaceArea: z.number().nonnegative(),
  boundingBox: BoundingBoxSchema,
  features: z.array(z.string()),
  featureCount: z.number().int().nonnegative(),
});

const ThresholdsSchema = z.object({
  volumeDeltaPercent: z.number().min(0).max(100).default(5),
  bboxDeltaPercent: z.number().min(0).max(100).default(2),
  topologySimilarityMin: z.number().min(0).max(1).default(0.8),
  featureCountDeltaPercent: z.number().min(0).max(100).default(20),
});

const TestConfigSchema = z.object({
  originalPath: z.string().min(1),
  thresholds: ThresholdsSchema.partial().optional(),
  generateOptions: z.record(z.string(), z.unknown()).optional(),
});

// ── Default thresholds ───────────────────────────────────────────────────────

const DEFAULT_THRESHOLDS: ComparisonThresholds = {
  volumeDeltaPercent: 5,
  bboxDeltaPercent: 2,
  topologySimilarityMin: 0.8,
  featureCountDeltaPercent: 20,
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function generateTestId(): string {
  const ts = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
  const rand = Math.random().toString(36).slice(2, 6);
  return `REGEN-${ts}-${rand}`;
}

function generateBatchId(): string {
  const ts = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
  const rand = Math.random().toString(36).slice(2, 6);
  return `BATCH-${ts}-${rand}`;
}

function computeJaccardSimilarity(setA: string[], setB: string[]): {
  intersection: string[];
  union: string[];
  similarity: number;
} {
  const a = new Set(setA);
  const b = new Set(setB);
  const intersection = [...a].filter((x) => b.has(x));
  const union = [...new Set([...a, ...b])];
  const similarity = union.length === 0 ? 1 : intersection.length / union.length;
  return { intersection, union, similarity };
}

function computeMetric(
  name: string,
  original: number,
  generated: number,
  thresholdPercent: number
): MetricResult {
  const delta = Math.abs(generated - original);
  const deltaPercent = original === 0 ? (generated === 0 ? 0 : 100) : (delta / original) * 100;
  return {
    name,
    originalValue: original,
    generatedValue: generated,
    delta,
    deltaPercent,
    threshold: thresholdPercent,
    passed: deltaPercent <= thresholdPercent,
  };
}

function bboxDimension(bbox: BoundingBox, axis: "x" | "y" | "z"): number {
  switch (axis) {
    case "x": return bbox.maxX - bbox.minX;
    case "y": return bbox.maxY - bbox.minY;
    case "z": return bbox.maxZ - bbox.minZ;
  }
}

// ── Mock geometry extraction (placeholder for real CAD kernel) ───────────────

function extractGeometryFromPath(filePath: string): CADGeometry {
  // In production, this would use OpenCASCADE or similar to extract real geometry.
  // For now, generate deterministic mock based on filename hash.
  const hash = filePath.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const seed = hash % 1000;

  const features = ["extrude", "fillet", "chamfer", "hole", "pocket"]
    .filter((_, i) => (seed + i) % 3 === 0);

  return {
    volume: 1000 + (seed % 500),
    surfaceArea: 600 + (seed % 200),
    boundingBox: {
      minX: 0,
      minY: 0,
      minZ: 0,
      maxX: 100 + (seed % 50),
      maxY: 80 + (seed % 40),
      maxZ: 30 + (seed % 20),
    },
    features,
    featureCount: features.length,
  };
}

function extractGeometryFromCode(cadQueryCode: string): CADGeometry {
  // Parse CadQuery code to extract geometry.
  // For now, estimate from code patterns.
  const lines = cadQueryCode.split("\n");
  const features: string[] = [];

  if (cadQueryCode.includes("extrude")) features.push("extrude");
  if (cadQueryCode.includes("fillet")) features.push("fillet");
  if (cadQueryCode.includes("chamfer")) features.push("chamfer");
  if (cadQueryCode.includes("hole")) features.push("hole");
  if (cadQueryCode.includes("pocket") || cadQueryCode.includes("cut")) features.push("pocket");
  if (cadQueryCode.includes("revolve")) features.push("revolve");
  if (cadQueryCode.includes("sweep")) features.push("sweep");
  if (cadQueryCode.includes("loft")) features.push("loft");

  // Estimate dimensions from box() calls
  const boxMatch = cadQueryCode.match(/box\s*\(\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*\)/);
  let x = 100, y = 80, z = 30;
  if (boxMatch) {
    x = parseFloat(boxMatch[1]);
    y = parseFloat(boxMatch[2]);
    z = parseFloat(boxMatch[3]);
  }

  return {
    volume: x * y * z,
    surfaceArea: 2 * (x * y + y * z + z * x),
    boundingBox: { minX: 0, minY: 0, minZ: 0, maxX: x, maxY: y, maxZ: z },
    features,
    featureCount: features.length,
  };
}

// ── Engine ───────────────────────────────────────────────────────────────────

export class CADRegenerationTestEngine {
  private defaultThresholds: ComparisonThresholds;

  constructor(thresholds?: Partial<ComparisonThresholds>) {
    this.defaultThresholds = { ...DEFAULT_THRESHOLDS, ...thresholds };
  }

  getInfo() {
    return {
      name: "CADRegenerationTestEngine",
      version: "1.0.0",
      domain: "cad_testing",
      description:
        "Compares generated CAD against original. " +
        "Metrics: volume delta, bbox match, topology similarity.",
    };
  }

  getCapabilities() {
    return [
      { name: "test", description: "Run single regeneration test", actions: ["cad_regen_test"] },
      { name: "batch", description: "Run batch tests", actions: ["cad_regen_batch"] },
      { name: "compare", description: "Compare two geometries", actions: ["cad_regen_compare"] },
      { name: "thresholds", description: "Get/set thresholds", actions: ["cad_regen_thresholds"] },
    ];
  }

  validate(input: unknown): string | null {
    if (input == null || typeof input !== "object") return "input must be an object";
    const result = TestConfigSchema.safeParse(input);
    if (!result.success) {
      return result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    }
    return null;
  }

  /**
   * Run a single regeneration test.
   */
  async test(config: {
    originalPath: string;
    thresholds?: Partial<ComparisonThresholds>;
    generateOptions?: Record<string, unknown>;
  }): Promise<RegenerationTestResult> {
    const startTime = Date.now();
    const testId = generateTestId();
    const thresholds = { ...this.defaultThresholds, ...config.thresholds };

    try {
      // 1. Extract geometry from original file
      const originalGeometry = extractGeometryFromPath(config.originalPath);

      // 2. Generate equivalent via NeuralCADGenerationEngine
      const { neuralCADGenerationEngine: neuralCadGenerationEngine } = await import("./NeuralCADGenerationEngine.js");

      // Create a description from the original geometry
      const description = `Generate a ${originalGeometry.features.join(", ")} part with approximate dimensions ${bboxDimension(originalGeometry.boundingBox, "x")}x${bboxDimension(originalGeometry.boundingBox, "y")}x${bboxDimension(originalGeometry.boundingBox, "z")}mm`;

      // Mock backend for testing (in production, wire real LLM)
      const mockBackend = {
        generate: async (_prompt: string) => {
          // Return simple CadQuery code based on dimensions
          const bbox = originalGeometry.boundingBox;
          const x = bboxDimension(bbox, "x");
          const y = bboxDimension(bbox, "y");
          const z = bboxDimension(bbox, "z");
          return {
            tokens: [],
            text: `import cadquery as cq\nresult = cq.Workplane("XY").box(${x}, ${y}, ${z})${originalGeometry.features.includes("fillet") ? ".edges().fillet(2)" : ""}${originalGeometry.features.includes("hole") ? '.faces(">Z").hole(10)' : ""}`,
          };
        },
      };

      const genResult = await neuralCadGenerationEngine.generate(
        { type: "text", text: description },
        mockBackend as any,
        undefined,
        undefined,
        { maxRetries: 1, temperature: 0.3 }
      );

      if (!genResult.success || !genResult.code) {
        return {
          testId,
          originalPath: config.originalPath,
          status: "error",
          metrics: this.createEmptyMetrics(thresholds),
          overallScore: 0,
          passedCount: 0,
          totalCount: 6,
          error: genResult.error ?? "Generation failed",
          durationMs: Date.now() - startTime,
          timestamp: new Date().toISOString(),
        };
      }

      // 3. Extract geometry from generated code
      const generatedGeometry = extractGeometryFromCode(genResult.code);

      // 4. Compare metrics
      const metrics = this.compareGeometries(originalGeometry, generatedGeometry, thresholds);
      const passedCount = Object.values(metrics).filter((m) => m.passed).length;
      const totalCount = Object.keys(metrics).length;
      const overallScore = passedCount / totalCount;
      const status = passedCount === totalCount ? "pass" : "fail";

      return {
        testId,
        originalPath: config.originalPath,
        status,
        metrics,
        overallScore,
        passedCount,
        totalCount,
        generatedCode: genResult.code,
        durationMs: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        testId,
        originalPath: config.originalPath,
        status: "error",
        metrics: this.createEmptyMetrics(thresholds),
        overallScore: 0,
        passedCount: 0,
        totalCount: 6,
        error: error instanceof Error ? error.message : String(error),
        durationMs: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Compare two geometries directly.
   */
  compare(
    original: CADGeometry,
    generated: CADGeometry,
    thresholds?: Partial<ComparisonThresholds>
  ): {
    metrics: RegenerationTestResult["metrics"];
    passed: boolean;
    overallScore: number;
  } {
    const t = { ...this.defaultThresholds, ...thresholds };
    const metrics = this.compareGeometries(original, generated, t);
    const passedCount = Object.values(metrics).filter((m) => m.passed).length;
    const totalCount = Object.keys(metrics).length;
    return {
      metrics,
      passed: passedCount === totalCount,
      overallScore: passedCount / totalCount,
    };
  }

  /**
   * Run batch regeneration tests.
   */
  async batch(config: BatchTestConfig): Promise<BatchTestResult> {
    const startTime = Date.now();
    const batchId = generateBatchId();
    const results: RegenerationTestResult[] = [];
    let passed = 0;
    let failed = 0;
    let errors = 0;

    for (const path of config.paths) {
      const result = await this.test({
        originalPath: path,
        thresholds: config.thresholds,
      });

      results.push(result);

      switch (result.status) {
        case "pass":
          passed++;
          break;
        case "fail":
          failed++;
          if (config.stopOnFirstFail) {
            return {
              batchId,
              totalTests: results.length,
              passed,
              failed,
              errors,
              passRate: passed / results.length,
              results,
              durationMs: Date.now() - startTime,
              timestamp: new Date().toISOString(),
            };
          }
          break;
        case "error":
          errors++;
          break;
      }
    }

    return {
      batchId,
      totalTests: results.length,
      passed,
      failed,
      errors,
      passRate: results.length > 0 ? passed / results.length : 0,
      results,
      durationMs: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get current thresholds.
   */
  getThresholds(): ComparisonThresholds {
    return { ...this.defaultThresholds };
  }

  /**
   * Set thresholds.
   */
  setThresholds(thresholds: Partial<ComparisonThresholds>): ComparisonThresholds {
    this.defaultThresholds = { ...this.defaultThresholds, ...thresholds };
    return this.getThresholds();
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private compareGeometries(
    original: CADGeometry,
    generated: CADGeometry,
    thresholds: ComparisonThresholds
  ): RegenerationTestResult["metrics"] {
    const volume = computeMetric(
      "volume",
      original.volume,
      generated.volume,
      thresholds.volumeDeltaPercent
    );

    const bboxX = computeMetric(
      "bboxX",
      bboxDimension(original.boundingBox, "x"),
      bboxDimension(generated.boundingBox, "x"),
      thresholds.bboxDeltaPercent
    );

    const bboxY = computeMetric(
      "bboxY",
      bboxDimension(original.boundingBox, "y"),
      bboxDimension(generated.boundingBox, "y"),
      thresholds.bboxDeltaPercent
    );

    const bboxZ = computeMetric(
      "bboxZ",
      bboxDimension(original.boundingBox, "z"),
      bboxDimension(generated.boundingBox, "z"),
      thresholds.bboxDeltaPercent
    );

    const featureCount = computeMetric(
      "featureCount",
      original.featureCount,
      generated.featureCount,
      thresholds.featureCountDeltaPercent
    );

    const { intersection, union, similarity } = computeJaccardSimilarity(
      original.features,
      generated.features
    );

    const topology: TopologyResult = {
      originalFeatures: original.features,
      generatedFeatures: generated.features,
      intersection,
      union,
      jaccardSimilarity: similarity,
      threshold: thresholds.topologySimilarityMin,
      passed: similarity >= thresholds.topologySimilarityMin,
    };

    return { volume, bboxX, bboxY, bboxZ, featureCount, topology };
  }

  private createEmptyMetrics(thresholds: ComparisonThresholds): RegenerationTestResult["metrics"] {
    return {
      volume: { name: "volume", originalValue: 0, generatedValue: 0, delta: 0, deltaPercent: 0, threshold: thresholds.volumeDeltaPercent, passed: false },
      bboxX: { name: "bboxX", originalValue: 0, generatedValue: 0, delta: 0, deltaPercent: 0, threshold: thresholds.bboxDeltaPercent, passed: false },
      bboxY: { name: "bboxY", originalValue: 0, generatedValue: 0, delta: 0, deltaPercent: 0, threshold: thresholds.bboxDeltaPercent, passed: false },
      bboxZ: { name: "bboxZ", originalValue: 0, generatedValue: 0, delta: 0, deltaPercent: 0, threshold: thresholds.bboxDeltaPercent, passed: false },
      featureCount: { name: "featureCount", originalValue: 0, generatedValue: 0, delta: 0, deltaPercent: 0, threshold: thresholds.featureCountDeltaPercent, passed: false },
      topology: { originalFeatures: [], generatedFeatures: [], intersection: [], union: [], jaccardSimilarity: 0, threshold: thresholds.topologySimilarityMin, passed: false },
    };
  }
}

export const cadRegenerationTestEngine = new CADRegenerationTestEngine();
