/**
 * NeuralModelRegistryEngine Tests
 *
 * Tests for model versioning, weight persistence, and G-code tagging.
 *
 * @module __tests__/NeuralModelRegistryEngine.test
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "fs";
import * as path from "path";
import {
  NeuralModelRegistryEngine,
  ModelCheckpoint,
} from "../engines/NeuralModelRegistryEngine.js";

// Use temp directory for tests (unique per test run)
const TEST_BASE_DIR = path.join(process.cwd(), `test-temp-models-${Date.now()}-${Math.random().toString(36).slice(2)}`);

describe("NeuralModelRegistryEngine", () => {
  let engine: NeuralModelRegistryEngine;

  // Sample checkpoint for testing
  const createSampleCheckpoint = (): ModelCheckpoint => ({
    modelId: "pp-transformer",
    version: "2.3.1",
    schemaVersion: 1,
    architecture: "transformer",
    parameterCount: 125_000_000,
    weights: [],
    config: {
      hiddenSize: 768,
      numLayers: 12,
      numHeads: 12,
      vocabSize: 50000,
    },
    trainingMetadata: {
      trainedAt: "2026-04-15T10:00:00Z",
      epochs: 100,
      finalLoss: 0.0234,
      validationAccuracy: 0.947,
      datasetVersion: "jmdie-lathe-v3",
      batchSize: 32,
      learningRate: 0.0001,
    },
    deploymentStatus: "development",
    description: "Post-processor transformer for lathe G-code optimization",
    tags: ["lathe", "post-processor", "transformer"],
  });

  beforeEach(async () => {
    // Create isolated engine for each test with unique directory
    const testDir = path.join(TEST_BASE_DIR, `test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await fs.mkdir(path.join(testDir, "data", "models"), { recursive: true });
    await fs.mkdir(path.join(testDir, "data", "state"), { recursive: true });

    engine = new NeuralModelRegistryEngine({
      baseDir: testDir,
      modelsSubdir: "data/models",
      registrySubpath: "data/state/model-registry.json",
    });
  });

  afterEach(async () => {
    // Cleanup test directories
    try {
      await fs.rm(TEST_BASE_DIR, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe("Model Registration", () => {
    it("should register a new model checkpoint", async () => {
      const result = await engine.registerModel(createSampleCheckpoint());

      expect(result.ok).toBe(true);
      expect(result.checkpoint).toBeDefined();
      expect(result.checkpoint?.modelId).toBe("pp-transformer");
      expect(result.checkpoint?.version).toBe("2.3.1");
      expect(result.checkpoint?.registeredAt).toBeDefined();
    });

    it("should reject duplicate model registration", async () => {
      await engine.registerModel(createSampleCheckpoint());
      const result = await engine.registerModel(createSampleCheckpoint());

      expect(result.ok).toBe(false);
      expect(result.error).toContain("already registered");
    });

    it("should validate semantic version format", async () => {
      const invalidCheckpoint = {
        ...createSampleCheckpoint(),
        version: "invalid-version",
      };

      const result = await engine.registerModel(invalidCheckpoint);

      expect(result.ok).toBe(false);
      expect(result.error).toContain("Invalid version format");
    });

    it("should accept valid semver with prerelease", async () => {
      const prerelease = {
        ...createSampleCheckpoint(),
        version: "2.4.0-beta.1",
      };

      const result = await engine.registerModel(prerelease);

      expect(result.ok).toBe(true);
      expect(result.checkpoint?.version).toBe("2.4.0-beta.1");
    });
  });

  describe("Model Retrieval", () => {
    beforeEach(async () => {
      await engine.registerModel(createSampleCheckpoint());
      await engine.registerModel({
        ...createSampleCheckpoint(),
        version: "2.3.0",
      });
      await engine.registerModel({
        ...createSampleCheckpoint(),
        version: "2.4.0",
        deploymentStatus: "staging",
      });
    });

    it("should retrieve model by ID and version", () => {
      const model = engine.getModel("pp-transformer", "2.3.1");

      expect(model).not.toBeNull();
      expect(model?.version).toBe("2.3.1");
    });

    it("should retrieve active version when version not specified", () => {
      const model = engine.getModel("pp-transformer");

      expect(model).not.toBeNull();
      // First registered version becomes active
      expect(model?.version).toBe("2.3.1");
    });

    it("should return null for non-existent model", () => {
      const model = engine.getModel("non-existent");

      expect(model).toBeNull();
    });

    it("should list all versions for a model", () => {
      const versions = engine.getModelVersions("pp-transformer");

      expect(versions).toHaveLength(3);
      expect(versions).toContain("2.3.0");
      expect(versions).toContain("2.3.1");
      expect(versions).toContain("2.4.0");
    });
  });

  describe("Model Filtering", () => {
    beforeEach(async () => {
      await engine.registerModel(createSampleCheckpoint());
      await engine.registerModel({
        ...createSampleCheckpoint(),
        modelId: "surface-cnn",
        version: "1.0.0",
        architecture: "cnn",
        tags: ["surface-finish", "cnn"],
      });
      await engine.registerModel({
        ...createSampleCheckpoint(),
        modelId: "tool-life-mlp",
        version: "1.0.0",
        architecture: "mlp",
        deploymentStatus: "production",
        tags: ["tool-life", "mlp"],
      });
    });

    it("should filter by architecture", () => {
      const transformers = engine.listModels({ architecture: "transformer" });
      const cnns = engine.listModels({ architecture: "cnn" });

      expect(transformers).toHaveLength(1);
      expect(cnns).toHaveLength(1);
      expect(transformers[0].modelId).toBe("pp-transformer");
      expect(cnns[0].modelId).toBe("surface-cnn");
    });

    it("should filter by deployment status", () => {
      const production = engine.listModels({ deploymentStatus: "production" });
      const development = engine.listModels({ deploymentStatus: "development" });

      expect(production).toHaveLength(1);
      expect(development).toHaveLength(2);
      expect(production[0].modelId).toBe("tool-life-mlp");
    });

    it("should filter by tags", () => {
      const latheModels = engine.listModels({ tags: ["lathe"] });
      const cnnModels = engine.listModels({ tags: ["cnn"] });

      expect(latheModels).toHaveLength(1);
      expect(cnnModels).toHaveLength(1);
    });

    it("should filter by model ID prefix", () => {
      const ppModels = engine.listModels({ modelIdPrefix: "pp-" });
      const toolModels = engine.listModels({ modelIdPrefix: "tool-" });

      expect(ppModels).toHaveLength(1);
      expect(toolModels).toHaveLength(1);
    });
  });

  describe("Model Promotion", () => {
    beforeEach(async () => {
      await engine.registerModel(createSampleCheckpoint());
      await engine.registerModel({
        ...createSampleCheckpoint(),
        version: "2.4.0",
        deploymentStatus: "staging",
      });
    });

    it("should promote model from development to staging", async () => {
      const result = await engine.promoteModel("pp-transformer", "2.3.1", "staging");

      expect(result.ok).toBe(true);

      const model = engine.getModel("pp-transformer", "2.3.1");
      expect(model?.deploymentStatus).toBe("staging");
    });

    it("should promote model to production and demote previous", async () => {
      // First promote 2.3.1 to production
      await engine.promoteModel("pp-transformer", "2.3.1", "staging");
      await engine.promoteModel("pp-transformer", "2.3.1", "production");

      // Then promote 2.4.0 to production
      const result = await engine.promoteModel("pp-transformer", "2.4.0", "production");

      expect(result.ok).toBe(true);

      const oldProd = engine.getModel("pp-transformer", "2.3.1");
      const newProd = engine.getModel("pp-transformer", "2.4.0");

      expect(oldProd?.deploymentStatus).toBe("staging"); // Demoted
      expect(newProd?.deploymentStatus).toBe("production");
    });

    it("should reject invalid promotion paths", async () => {
      // Cannot go from development directly to deprecated
      const result = await engine.promoteModel("pp-transformer", "2.3.1", "archived");

      expect(result.ok).toBe(false);
      expect(result.error).toContain("Cannot transition");
    });

    it("should update active version on production promotion", async () => {
      await engine.promoteModel("pp-transformer", "2.3.1", "staging");
      await engine.promoteModel("pp-transformer", "2.3.1", "production");

      const activeVersion = engine.getActiveVersion("pp-transformer");

      expect(activeVersion).toBe("2.3.1");
    });
  });

  describe("Model Deprecation and Rollback", () => {
    beforeEach(async () => {
      await engine.registerModel({
        ...createSampleCheckpoint(),
        version: "2.3.0",
        deploymentStatus: "staging",
      });
      await engine.registerModel({
        ...createSampleCheckpoint(),
        version: "2.3.1",
        deploymentStatus: "production",
      });
    });

    it("should deprecate a model", async () => {
      const result = await engine.deprecateModel("pp-transformer", "2.3.0");

      expect(result.ok).toBe(true);

      const model = engine.getModel("pp-transformer", "2.3.0");
      expect(model?.deploymentStatus).toBe("deprecated");
    });

    it("should rollback to a previous version", async () => {
      const result = await engine.rollbackModel("pp-transformer", "2.3.0");

      expect(result.ok).toBe(true);
      expect(result.previousVersion).toBe("2.3.1");

      const active = engine.getActiveVersion("pp-transformer");
      expect(active).toBe("2.3.0");

      const oldProd = engine.getModel("pp-transformer", "2.3.1");
      expect(oldProd?.deploymentStatus).toBe("staging");
    });

    it("should reject rollback to non-existent version", async () => {
      const result = await engine.rollbackModel("pp-transformer", "9.9.9");

      expect(result.ok).toBe(false);
      expect(result.error).toContain("not found");
    });
  });

  describe("Weight Storage", () => {
    beforeEach(async () => {
      await engine.registerModel(createSampleCheckpoint());
    });

    it("should store weights and compute checksum", async () => {
      const weights = new Float32Array([0.1, 0.2, 0.3, 0.4, 0.5]);

      const result = await engine.storeWeights(
        "pp-transformer",
        "2.3.1",
        "encoder.layer0.attention.q",
        weights,
        "float32"
      );

      expect(result.ok).toBe(true);
      expect(result.layer).toBeDefined();
      expect(result.layer?.layerName).toBe("encoder.layer0.attention.q");
      expect(result.layer?.checksum).toHaveLength(64); // SHA-256 hex
    });

    it("should reject storing weights for non-existent model", async () => {
      const weights = new Float32Array([0.1, 0.2, 0.3]);

      const result = await engine.storeWeights("non-existent", "1.0.0", "layer", weights);

      expect(result.ok).toBe(false);
      expect(result.error).toContain("not found");
    });

    it("should load weights with checksum validation", async () => {
      const original = new Float32Array([1.0, 2.0, 3.0, 4.0]);
      await engine.storeWeights("pp-transformer", "2.3.1", "test_layer", original);

      const result = await engine.loadWeights("pp-transformer", "2.3.1");

      expect(result.ok).toBe(true);
      expect(result.weights).toBeDefined();
      expect(result.weights?.has("test_layer")).toBe(true);

      const loaded = result.weights?.get("test_layer");
      expect(loaded).toHaveLength(4);
      expect(loaded?.[0]).toBeCloseTo(1.0);
      expect(loaded?.[3]).toBeCloseTo(4.0);
    });

    it("should cache loaded weights", async () => {
      const original = new Float32Array([1.0, 2.0, 3.0]);
      await engine.storeWeights("pp-transformer", "2.3.1", "cached_layer", original);

      // First load
      const result1 = await engine.loadWeights("pp-transformer", "2.3.1");
      // Second load (should use cache)
      const result2 = await engine.loadWeights("pp-transformer", "2.3.1");

      expect(result1.weights).toBe(result2.weights); // Same reference
    });

    it("should invalidate weight cache", async () => {
      const original = new Float32Array([1.0, 2.0]);
      await engine.storeWeights("pp-transformer", "2.3.1", "layer", original);

      await engine.loadWeights("pp-transformer", "2.3.1");
      engine.invalidateWeightCache("pp-transformer");

      const result = await engine.loadWeights("pp-transformer", "2.3.1");

      expect(result.ok).toBe(true);
    });
  });

  describe("G-code Tagging", () => {
    beforeEach(async () => {
      await engine.registerModel(createSampleCheckpoint());
    });

    it("should generate G-code header with model info", () => {
      const tag = engine.generateGCodeTag("pp-transformer", 94.7);

      expect(tag).toContain("(PRISM AI Model: pp-transformer-v2.3.1)");
      expect(tag).toContain("(Generated:");
      expect(tag).toContain("(Confidence: 94.7%)");
      expect(tag).toContain("(Architecture: transformer)");
    });

    it("should create structured G-code model tag", () => {
      const tag = engine.createGCodeModelTag("pp-transformer", 92.5);

      expect(tag.modelId).toBe("pp-transformer");
      expect(tag.version).toBe("2.3.1");
      expect(tag.confidence).toBe(92.5);
      expect(tag.generatedAt).toBeDefined();
    });

    it("should parse G-code header to extract model tag", () => {
      const gcode = `
(PRISM AI Model: pp-transformer-v2.3.1)
(Generated: 2026-04-15T12:00:00Z)
(Confidence: 94.7%)
(Architecture: transformer)
G0 X0 Y0
G1 X10 F200
      `;

      const tag = engine.parseGCodeTag(gcode);

      expect(tag).not.toBeNull();
      expect(tag?.modelId).toBe("pp-transformer");
      expect(tag?.version).toBe("2.3.1");
      expect(tag?.confidence).toBe(94.7);
    });

    it("should return null for G-code without model tag", () => {
      const gcode = `
(Some other comment)
G0 X0 Y0
G1 X10 F200
      `;

      const tag = engine.parseGCodeTag(gcode);

      expect(tag).toBeNull();
    });

    it("should handle unknown model in G-code tag", () => {
      const tag = engine.generateGCodeTag("unknown-model", 50.0);

      expect(tag).toContain("(PRISM AI Model: unknown-model-vunknown)");
    });
  });

  describe("Registry Statistics", () => {
    beforeEach(async () => {
      await engine.registerModel(createSampleCheckpoint());
      await engine.registerModel({
        ...createSampleCheckpoint(),
        modelId: "surface-cnn",
        version: "1.0.0",
        architecture: "cnn",
        parameterCount: 10_000_000,
        deploymentStatus: "production",
      });
      await engine.registerModel({
        ...createSampleCheckpoint(),
        version: "2.4.0",
        deploymentStatus: "staging",
      });
    });

    it("should compute accurate statistics", () => {
      const stats = engine.getStats();

      expect(stats.totalModels).toBe(2);
      expect(stats.totalVersions).toBe(3);
      expect(stats.totalParameters).toBe(260_000_000); // 125M + 125M + 10M
      expect(stats.byArchitecture.transformer).toBe(2);
      expect(stats.byArchitecture.cnn).toBe(1);
      expect(stats.byStatus.development).toBe(1);
      expect(stats.byStatus.staging).toBe(1);
      expect(stats.byStatus.production).toBe(1);
    });
  });

  describe("Semver Comparison", () => {
    beforeEach(async () => {
      // Register versions out of order
      await engine.registerModel({
        ...createSampleCheckpoint(),
        version: "2.10.0",
      });
      await engine.registerModel({
        ...createSampleCheckpoint(),
        version: "2.2.0",
      });
      await engine.registerModel({
        ...createSampleCheckpoint(),
        version: "2.9.0",
      });
    });

    it("should sort versions correctly", () => {
      const versions = engine.getModelVersions("pp-transformer");

      // Numeric sort, not alphabetic
      expect(versions[0]).toBe("2.2.0");
      expect(versions[1]).toBe("2.9.0");
      expect(versions[2]).toBe("2.10.0");
    });
  });
});
