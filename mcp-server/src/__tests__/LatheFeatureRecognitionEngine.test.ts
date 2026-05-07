/**
 * LatheFeatureRecognitionEngine Tests
 *
 * U-LTH34: Turning-specific feature recognition tests
 */

import { describe, it, expect } from "vitest";
import {
  latheFeatureRecognitionEngine,
  type RecognizedTurningFeature,
} from "../engines/LatheFeatureRecognitionEngine.js";
import {
  lathePrintIngestPipelineEngine,
  type BlueprintIntake,
} from "../engines/LathePrintIngestPipelineEngine.js";

describe("LatheFeatureRecognitionEngine", () => {
  const getTestIntake = async (): Promise<BlueprintIntake> => {
    return lathePrintIngestPipelineEngine.ingest({
      source_type: "pdf",
      part_type: "turning",
      part_number: "TEST-001",
      customer: "Test Customer"
    });
  };

  describe("recognize()", () => {
    it("recognizes features from blueprint intake", async () => {
      const intake = await getTestIntake();

      const result = latheFeatureRecognitionEngine.recognize(intake);

      expect(result.recognition_id).toMatch(/^recog_\d+_\d+$/);
      expect(result.intake_id).toBe(intake.intake_id);
      expect(result.processing_time_ms).toBeGreaterThanOrEqual(0);
    });

    it("extracts external diameter features", async () => {
      const intake = await getTestIntake();

      const result = latheFeatureRecognitionEngine.recognize(intake);

      const externalFeatures = result.feature_tree.features.filter(
        f => f.type === "external_diameter"
      );

      expect(externalFeatures.length).toBeGreaterThan(0);

      for (const feat of externalFeatures) {
        expect(feat.end_diameter).toBeGreaterThan(0);
        expect(feat.suggested_operations).toContain("rough_turn");
        expect(feat.suggested_operations).toContain("finish_turn");
      }
    });

    it("extracts face features", async () => {
      const intake = await getTestIntake();

      const result = latheFeatureRecognitionEngine.recognize(intake);

      const faceFeatures = result.feature_tree.features.filter(
        f => f.type === "face"
      );

      expect(faceFeatures.length).toBeGreaterThan(0);

      for (const feat of faceFeatures) {
        expect(feat.suggested_operations).toContain("face");
      }
    });

    it("extracts thread features from intake", async () => {
      const intake = await getTestIntake();

      const result = latheFeatureRecognitionEngine.recognize(intake);

      const threadFeatures = result.feature_tree.features.filter(
        f => f.type.startsWith("thread")
      );

      expect(threadFeatures.length).toBeGreaterThan(0);
      expect(result.summary.has_threading).toBe(true);

      for (const feat of threadFeatures) {
        expect(feat.thread_spec).toBeDefined();
        expect(feat.suggested_operations).toContain("thread");
      }
    });

    it("extracts chamfer and radius features", async () => {
      const intake = await getTestIntake();

      const result = latheFeatureRecognitionEngine.recognize(intake);

      const chamferFeatures = result.feature_tree.features.filter(
        f => f.type === "chamfer"
      );
      const radiusFeatures = result.feature_tree.features.filter(
        f => f.type === "radius"
      );

      expect(chamferFeatures.length).toBeGreaterThan(0);
      expect(radiusFeatures.length).toBeGreaterThan(0);
    });

    it("infers stock dimensions", async () => {
      const intake = await getTestIntake();

      const result = latheFeatureRecognitionEngine.recognize(intake);

      expect(result.feature_tree.stock.diameter).toBeGreaterThan(0);
      expect(result.feature_tree.stock.length).toBeGreaterThan(0);
      expect(result.feature_tree.stock.material).toBe("4140 Steel");
    });

    it("builds operation sequence", async () => {
      const intake = await getTestIntake();

      const result = latheFeatureRecognitionEngine.recognize(intake);

      expect(result.feature_tree.operation_sequence.length).toBeGreaterThan(0);
      expect(result.feature_tree.estimated_operations).toBeGreaterThan(0);

      // Face should come early
      const faceIndex = result.feature_tree.operation_sequence.indexOf("face");
      const threadIndex = result.feature_tree.operation_sequence.indexOf("thread");

      if (faceIndex >= 0 && threadIndex >= 0) {
        expect(faceIndex).toBeLessThan(threadIndex);
      }
    });

    it("calculates complexity score", async () => {
      const intake = await getTestIntake();

      const result = latheFeatureRecognitionEngine.recognize(intake);

      expect(result.feature_tree.complexity_score).toBeGreaterThan(0);
      expect(result.feature_tree.complexity_score).toBeLessThanOrEqual(100);
    });
  });

  describe("Feature Details", () => {
    it("assigns unique IDs to features", async () => {
      const intake = await getTestIntake();

      const result = latheFeatureRecognitionEngine.recognize(intake);

      const ids = result.feature_tree.features.map(f => f.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it("tracks source dimensions in features", async () => {
      const intake = await getTestIntake();

      const result = latheFeatureRecognitionEngine.recognize(intake);

      const featuresWithSources = result.feature_tree.features.filter(
        f => f.source_dimensions.length > 0
      );

      expect(featuresWithSources.length).toBeGreaterThan(0);
    });

    it("includes diameter tolerances", async () => {
      const intake = await getTestIntake();

      const result = latheFeatureRecognitionEngine.recognize(intake);

      const externalFeatures = result.feature_tree.features.filter(
        f => f.type === "external_diameter"
      );

      for (const feat of externalFeatures) {
        expect(feat.diameter_tolerance).toBeDefined();
        expect(feat.diameter_tolerance?.plus).toBeGreaterThanOrEqual(0);
      }
    });

    it("includes stock allowance", async () => {
      const intake = await getTestIntake();

      const result = latheFeatureRecognitionEngine.recognize(intake);

      const externalFeatures = result.feature_tree.features.filter(
        f => f.type === "external_diameter"
      );

      for (const feat of externalFeatures) {
        expect(feat.stock_allowance_mm).toBeGreaterThanOrEqual(0);
      }
    });

    it("associates GDT with features", async () => {
      const intake = await getTestIntake();

      const result = latheFeatureRecognitionEngine.recognize(intake);

      // At least some features should have GDT requirements
      const featuresWithGDT = result.feature_tree.features.filter(
        f => f.gdt_requirements.length > 0 || f.datum_references.length > 0
      );

      expect(featuresWithGDT.length).toBeGreaterThan(0);
    });
  });

  describe("Summary", () => {
    it("counts features by type", async () => {
      const intake = await getTestIntake();

      const result = latheFeatureRecognitionEngine.recognize(intake);

      expect(result.summary.total_features).toBe(result.feature_tree.features.length);
      expect(typeof result.summary.feature_types).toBe("object");
    });

    it("detects threading presence", async () => {
      const intake = await getTestIntake();

      const result = latheFeatureRecognitionEngine.recognize(intake);

      const hasThreadFeatures = result.feature_tree.features.some(
        f => f.type.startsWith("thread")
      );

      expect(result.summary.has_threading).toBe(hasThreadFeatures);
    });

    it("calculates max depth of cut", async () => {
      const intake = await getTestIntake();

      const result = latheFeatureRecognitionEngine.recognize(intake);

      expect(result.summary.max_depth_of_cut_mm).toBeGreaterThanOrEqual(0);
    });

    it("counts tight tolerances", async () => {
      const intake = await getTestIntake();

      const result = latheFeatureRecognitionEngine.recognize(intake);

      expect(result.summary.tight_tolerance_count).toBeGreaterThanOrEqual(0);
    });
  });

  describe("getStatistics()", () => {
    it("returns supported feature types", () => {
      const stats = latheFeatureRecognitionEngine.getStatistics();

      expect(stats.supported_feature_types).toContain("external_diameter");
      expect(stats.supported_feature_types).toContain("thread_external");
      expect(stats.supported_feature_types).toContain("groove_external");
      expect(stats.supported_feature_types.length).toBeGreaterThan(15);
    });

    it("returns supported operations", () => {
      const stats = latheFeatureRecognitionEngine.getStatistics();

      expect(stats.supported_operations).toContain("rough_turn");
      expect(stats.supported_operations).toContain("finish_turn");
      expect(stats.supported_operations).toContain("thread");
      expect(stats.supported_operations).toContain("groove");
    });

    it("tracks recognition count", async () => {
      const before = latheFeatureRecognitionEngine.getStatistics().total_recognitions;

      const intake = await getTestIntake();
      latheFeatureRecognitionEngine.recognize(intake);

      const after = latheFeatureRecognitionEngine.getStatistics().total_recognitions;
      expect(after).toBe(before + 1);
    });
  });

  describe("Edge Cases", () => {
    it("handles minimal intake", async () => {
      const intake = await lathePrintIngestPipelineEngine.ingest({
        source_type: "image",
        image_base64: "minimal"
      });

      const result = latheFeatureRecognitionEngine.recognize(intake);

      expect(result.recognition_id).toBeDefined();
      expect(result.feature_tree).toBeDefined();
      expect(Array.isArray(result.warnings)).toBe(true);
    });

    it("reports warnings for missing features", async () => {
      const intake = await lathePrintIngestPipelineEngine.ingest({
        source_type: "image",
        image_base64: "minimal"
      });

      // Clear the turning features to force warnings
      const minimalIntake: BlueprintIntake = {
        ...intake,
        dimensions: [],
        turning_features: [],
        threads: []
      };

      const result = latheFeatureRecognitionEngine.recognize(minimalIntake);

      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe("Operation Sequencing", () => {
    it("sequences face before turning", async () => {
      const intake = await getTestIntake();

      const result = latheFeatureRecognitionEngine.recognize(intake);

      const seq = result.feature_tree.operation_sequence;
      const faceIdx = seq.indexOf("face");
      const roughTurnIdx = seq.indexOf("rough_turn");

      if (faceIdx >= 0 && roughTurnIdx >= 0) {
        expect(faceIdx).toBeLessThan(roughTurnIdx);
      }
    });

    it("sequences rough before finish", async () => {
      const intake = await getTestIntake();

      const result = latheFeatureRecognitionEngine.recognize(intake);

      const seq = result.feature_tree.operation_sequence;
      const roughIdx = seq.indexOf("rough_turn");
      const finishIdx = seq.indexOf("finish_turn");

      if (roughIdx >= 0 && finishIdx >= 0) {
        expect(roughIdx).toBeLessThan(finishIdx);
      }
    });

    it("sequences threading after turning", async () => {
      const intake = await getTestIntake();

      const result = latheFeatureRecognitionEngine.recognize(intake);

      const seq = result.feature_tree.operation_sequence;
      const finishTurnIdx = seq.indexOf("finish_turn");
      const threadIdx = seq.indexOf("thread");

      if (finishTurnIdx >= 0 && threadIdx >= 0) {
        expect(finishTurnIdx).toBeLessThan(threadIdx);
      }
    });
  });
});
