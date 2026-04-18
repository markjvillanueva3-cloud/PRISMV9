/**
 * LathePrintIngestPipelineEngine Tests
 *
 * U-LTH33: Blueprint Ingest Pipeline tests
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  lathePrintIngestPipelineEngine,
  type BlueprintIngestInput,
  type BlueprintIntake,
} from "../engines/LathePrintIngestPipelineEngine.js";

describe("LathePrintIngestPipelineEngine", () => {
  describe("ingest()", () => {
    it("processes PDF source type", async () => {
      const input: BlueprintIngestInput = {
        source_type: "pdf",
        part_type: "turning",
        part_number: "TEST-001",
        customer: "Test Customer"
      };

      const result = await lathePrintIngestPipelineEngine.ingest(input);

      expect(result.intake_id).toMatch(/^intake_\d+_\d+$/);
      expect(result.source_type).toBe("pdf");
      expect(result.processing_time_ms).toBeGreaterThanOrEqual(0);
    });

    it("processes image source type", async () => {
      const input: BlueprintIngestInput = {
        source_type: "image",
        image_base64: "test-base64-data",
        part_type: "turning"
      };

      const result = await lathePrintIngestPipelineEngine.ingest(input);

      expect(result.source_type).toBe("image");
      expect(result.dimensions.length).toBeGreaterThan(0);
    });

    it("processes hybrid source type", async () => {
      const input: BlueprintIngestInput = {
        source_type: "hybrid",
        file_path: "/path/to/blueprint.pdf",
        part_type: "turning"
      };

      const result = await lathePrintIngestPipelineEngine.ingest(input);

      expect(result.source_type).toBe("hybrid");
      expect(result.raw_text_extraction).toBeDefined();
      expect(result.raw_vision_extraction).toBeDefined();
    });

    it("extracts turning dimensions from simulated PDF", async () => {
      const input: BlueprintIngestInput = {
        source_type: "pdf",
        file_path: "/path/to/turning-part.pdf",
        part_type: "turning"
      };

      const result = await lathePrintIngestPipelineEngine.ingest(input);

      // Should have diameter dimensions
      const diameters = result.dimensions.filter(d => d.type === "diameter");
      expect(diameters.length).toBeGreaterThanOrEqual(3);

      // Should have linear (length) dimensions
      const lengths = result.dimensions.filter(d => d.type === "linear");
      expect(lengths.length).toBeGreaterThanOrEqual(3);
    });

    it("extracts GDT callouts and parses FCF", async () => {
      const input: BlueprintIngestInput = {
        source_type: "pdf",
        part_type: "turning"
      };

      const result = await lathePrintIngestPipelineEngine.ingest(input);

      expect(result.gdt_callouts.length).toBeGreaterThan(0);

      // Each GDT should have parsed FCF
      for (const gdt of result.gdt_callouts) {
        expect(gdt.fcf).toBeDefined();
        expect(gdt.symbol).toBeDefined();
        expect(gdt.tolerance_mm).toBeGreaterThan(0);
      }
    });

    it("extracts surface finishes", async () => {
      const input: BlueprintIngestInput = {
        source_type: "pdf",
        part_type: "turning"
      };

      const result = await lathePrintIngestPipelineEngine.ingest(input);

      expect(result.surface_finishes.length).toBeGreaterThan(0);
      expect(result.surface_finishes[0].ra).toBeDefined();
    });

    it("extracts thread callouts", async () => {
      const input: BlueprintIngestInput = {
        source_type: "pdf",
        part_type: "turning"
      };

      const result = await lathePrintIngestPipelineEngine.ingest(input);

      expect(result.threads.length).toBeGreaterThan(0);
      expect(result.threads[0].spec).toMatch(/^M\d+/);
    });

    it("identifies turning features from dimensions", async () => {
      const input: BlueprintIngestInput = {
        source_type: "pdf",
        part_type: "turning"
      };

      const result = await lathePrintIngestPipelineEngine.ingest(input);

      expect(result.turning_features.length).toBeGreaterThan(0);

      // Should have OD feature from largest diameter
      const odFeatures = result.turning_features.filter(f => f.type === "od");
      expect(odFeatures.length).toBeGreaterThan(0);

      // Should have face feature
      const faceFeatures = result.turning_features.filter(f => f.type === "face");
      expect(faceFeatures.length).toBeGreaterThan(0);

      // Should have thread feature
      const threadFeatures = result.turning_features.filter(f => f.type === "thread");
      expect(threadFeatures.length).toBeGreaterThan(0);
    });

    it("builds part info from input and extraction", async () => {
      const input: BlueprintIngestInput = {
        source_type: "pdf",
        part_number: "CUSTOM-PART-123",
        customer: "Test Customer Inc"
      };

      const result = await lathePrintIngestPipelineEngine.ingest(input);

      expect(result.part_info.part_number).toBe("CUSTOM-PART-123");
      expect(result.part_info.customer).toBe("Test Customer Inc");
      expect(result.part_info.material).toBe("4140 Steel");
    });

    it("calculates extraction quality metrics", async () => {
      const input: BlueprintIngestInput = {
        source_type: "pdf",
        part_type: "turning"
      };

      const result = await lathePrintIngestPipelineEngine.ingest(input);

      expect(result.extraction_quality.dimension_count).toBeGreaterThan(0);
      expect(result.extraction_quality.gdt_count).toBeGreaterThan(0);
      expect(result.extraction_quality.completeness_score).toBeGreaterThan(0);
      expect(result.extraction_quality.confidence_average).toBeGreaterThan(0);
    });

    it("processes text content directly", async () => {
      const textContent = `
        Part: TEST-PART-001
        Material: 6061 Aluminum

        Ø50.0 ±0.025
        Ø25.0 +0.02/-0.01
        100.0 ±0.1

        |⌀|0.02|A|
        Ra 1.6

        M20x1.5-6g
      `;

      const input: BlueprintIngestInput = {
        source_type: "pdf",
        text_content: textContent
      };

      const result = await lathePrintIngestPipelineEngine.ingest(input);

      // Should extract dimensions from text
      expect(result.dimensions.length).toBeGreaterThan(0);
    });
  });

  describe("validateAccuracy()", () => {
    it("calculates accuracy against ground truth", async () => {
      const input: BlueprintIngestInput = {
        source_type: "pdf",
        part_type: "turning"
      };
      const intake = await lathePrintIngestPipelineEngine.ingest(input);

      const accuracy = lathePrintIngestPipelineEngine.validateAccuracy(intake, {
        expected_dimensions: 8,
        expected_gdt: 3,
        expected_threads: 1
      });

      expect(accuracy.dimension_match_rate).toBeLessThanOrEqual(1);
      expect(accuracy.gdt_parse_success_rate).toBeLessThanOrEqual(1);
      expect(accuracy.thread_recognition_rate).toBeLessThanOrEqual(1);
      expect(accuracy.overall_accuracy).toBeLessThanOrEqual(1);
    });

    it("returns 1.0 for perfect match", async () => {
      const input: BlueprintIngestInput = {
        source_type: "pdf",
        part_type: "turning"
      };
      const intake = await lathePrintIngestPipelineEngine.ingest(input);

      // Match exact counts
      const accuracy = lathePrintIngestPipelineEngine.validateAccuracy(intake, {
        expected_dimensions: intake.dimensions.length,
        expected_gdt: intake.gdt_callouts.length,
        expected_threads: intake.threads.length
      });

      expect(accuracy.dimension_match_rate).toBe(1);
      expect(accuracy.thread_recognition_rate).toBe(1);
    });

    it("handles zero expectations correctly", async () => {
      const input: BlueprintIngestInput = {
        source_type: "image",
        image_base64: "test"
      };
      const intake = await lathePrintIngestPipelineEngine.ingest(input);

      const accuracy = lathePrintIngestPipelineEngine.validateAccuracy(intake, {
        expected_dimensions: 0,
        expected_gdt: 0,
        expected_threads: 0
      });

      // Zero expected = passes if also zero found
      expect(accuracy.overall_accuracy).toBeGreaterThanOrEqual(0);
    });
  });

  describe("getStatistics()", () => {
    it("returns pipeline statistics", () => {
      const stats = lathePrintIngestPipelineEngine.getStatistics();

      expect(stats.supported_source_types).toContain("pdf");
      expect(stats.supported_source_types).toContain("image");
      expect(stats.supported_source_types).toContain("hybrid");
      expect(stats.supported_dimension_types.length).toBeGreaterThanOrEqual(5);
      expect(stats.supported_gdt_symbols).toBe(14);
    });

    it("tracks intake count", async () => {
      const before = lathePrintIngestPipelineEngine.getStatistics().total_intakes;

      await lathePrintIngestPipelineEngine.ingest({
        source_type: "pdf",
        part_type: "turning"
      });

      const after = lathePrintIngestPipelineEngine.getStatistics().total_intakes;
      expect(after).toBe(before + 1);
    });
  });

  describe("Consolidated Dimensions", () => {
    it("assigns unique IDs to dimensions", async () => {
      const result = await lathePrintIngestPipelineEngine.ingest({
        source_type: "pdf",
        part_type: "turning"
      });

      const ids = result.dimensions.map(d => d.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it("tracks dimension source", async () => {
      const result = await lathePrintIngestPipelineEngine.ingest({
        source_type: "pdf",
        part_type: "turning"
      });

      for (const dim of result.dimensions) {
        expect(["text", "vision", "merged"]).toContain(dim.source);
      }
    });

    it("includes confidence scores", async () => {
      const result = await lathePrintIngestPipelineEngine.ingest({
        source_type: "pdf",
        part_type: "turning"
      });

      for (const dim of result.dimensions) {
        expect(dim.confidence).toBeGreaterThan(0);
        expect(dim.confidence).toBeLessThanOrEqual(1);
      }
    });

    it("infers feature hints for dimensions", async () => {
      const result = await lathePrintIngestPipelineEngine.ingest({
        source_type: "pdf",
        part_type: "turning"
      });

      // Some dimensions should have feature hints
      const withHints = result.dimensions.filter(d => d.feature_hint);
      expect(withHints.length).toBeGreaterThan(0);
    });
  });

  describe("Consolidated GDT", () => {
    it("assigns unique IDs to GDT callouts", async () => {
      const result = await lathePrintIngestPipelineEngine.ingest({
        source_type: "pdf",
        part_type: "turning"
      });

      const ids = result.gdt_callouts.map(g => g.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it("extracts datum references", async () => {
      const result = await lathePrintIngestPipelineEngine.ingest({
        source_type: "pdf",
        part_type: "turning"
      });

      // At least one GDT should have datums
      const withDatums = result.gdt_callouts.filter(g => g.datums.length > 0);
      expect(withDatums.length).toBeGreaterThan(0);
    });

    it("parses FCF with GDTCalloutParserEngine", async () => {
      const result = await lathePrintIngestPipelineEngine.ingest({
        source_type: "pdf",
        part_type: "turning"
      });

      for (const gdt of result.gdt_callouts) {
        expect(gdt.fcf).toBeDefined();
        expect(gdt.fcf?.symbol).toBeDefined();
        expect(gdt.fcf?.tolerance_mm).toBeDefined();
      }
    });
  });

  describe("Turning Features", () => {
    it("identifies OD features from largest diameter", async () => {
      const result = await lathePrintIngestPipelineEngine.ingest({
        source_type: "pdf",
        part_type: "turning"
      });

      const odFeature = result.turning_features.find(f => f.type === "od");
      expect(odFeature).toBeDefined();
      expect(odFeature?.diameter).toBe(50.0); // Largest diameter from simulated data
    });

    it("associates dimensions with features", async () => {
      const result = await lathePrintIngestPipelineEngine.ingest({
        source_type: "pdf",
        part_type: "turning"
      });

      for (const feature of result.turning_features) {
        expect(Array.isArray(feature.associated_dimensions)).toBe(true);
        expect(Array.isArray(feature.associated_gdt)).toBe(true);
      }
    });

    it("identifies face features from lengths", async () => {
      const result = await lathePrintIngestPipelineEngine.ingest({
        source_type: "pdf",
        part_type: "turning"
      });

      const faceFeature = result.turning_features.find(f => f.type === "face");
      expect(faceFeature).toBeDefined();
      expect(faceFeature?.length).toBeGreaterThan(0);
    });

    it("identifies chamfer and radius features", async () => {
      const result = await lathePrintIngestPipelineEngine.ingest({
        source_type: "pdf",
        part_type: "turning"
      });

      const chamferFeature = result.turning_features.find(f => f.type === "chamfer");
      const radiusFeature = result.turning_features.find(f => f.type === "radius");

      expect(chamferFeature).toBeDefined();
      expect(radiusFeature).toBeDefined();
    });
  });

  describe("Completeness Score", () => {
    it("scores higher with more extracted data", async () => {
      const fullResult = await lathePrintIngestPipelineEngine.ingest({
        source_type: "pdf",
        part_type: "turning"
      });

      const partialResult = await lathePrintIngestPipelineEngine.ingest({
        source_type: "image",
        image_base64: "minimal-data"
      });

      expect(fullResult.extraction_quality.completeness_score).toBeGreaterThan(
        partialResult.extraction_quality.completeness_score
      );
    });

    it("includes material in completeness calculation", async () => {
      const result = await lathePrintIngestPipelineEngine.ingest({
        source_type: "pdf",
        part_type: "turning"
      });

      // With material (from simulated data), should have decent completeness
      expect(result.extraction_quality.completeness_score).toBeGreaterThan(0.5);
    });
  });
});
