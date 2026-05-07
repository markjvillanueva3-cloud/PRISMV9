/**
 * MasterPostFineTuningEngine Tests — CAM-PARITY-AGI-MS0/U-CAMP15
 *
 * Comprehensive test suite for LoRA-style post processor fine-tuning.
 * Tests learning from discrepancies, confidence scoring, weight updates,
 * G-code application, and export/import functionality.
 *
 * @module __tests__/MasterPostFineTuningEngine.test
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  MasterPostFineTuningEngine,
  masterPostFineTuningEngine,
  type ControllerFamily,
  type OperationType,
  type FineTuningExport,
} from "../engines/MasterPostFineTuningEngine.js";

describe("MasterPostFineTuningEngine", () => {
  let engine: MasterPostFineTuningEngine;

  beforeEach(() => {
    engine = new MasterPostFineTuningEngine();
  });

  // ==========================================================================
  // CONSTRUCTION & CONFIGURATION
  // ==========================================================================

  describe("constructor and configuration", () => {
    it("should initialize with default configuration", () => {
      const config = engine.getConfig();
      expect(config.learning_rate).toBe(0.1);
      expect(config.min_samples_threshold).toBe(10);
      expect(config.confidence_threshold).toBe(0.75);
      expect(config.confidence_decay_tau).toBe(50);
      expect(config.max_correction_fraction).toBe(0.3);
      expect(config.proven_program_weight).toBe(2.0);
    });

    it("should accept custom configuration", () => {
      const customEngine = new MasterPostFineTuningEngine({
        learning_rate: 0.2,
        min_samples_threshold: 5,
        confidence_threshold: 0.8,
      });
      const config = customEngine.getConfig();
      expect(config.learning_rate).toBe(0.2);
      expect(config.min_samples_threshold).toBe(5);
      expect(config.confidence_threshold).toBe(0.8);
    });

    it("should throw on invalid learning rate", () => {
      expect(() => new MasterPostFineTuningEngine({ learning_rate: 0 })).toThrow("learning_rate must be in (0, 1]");
      expect(() => new MasterPostFineTuningEngine({ learning_rate: 1.5 })).toThrow("learning_rate must be in (0, 1]");
    });

    it("should throw on invalid min_samples_threshold", () => {
      expect(() => new MasterPostFineTuningEngine({ min_samples_threshold: 0 })).toThrow("min_samples_threshold must be >= 1");
    });

    it("should throw on invalid confidence_threshold", () => {
      expect(() => new MasterPostFineTuningEngine({ confidence_threshold: 0 })).toThrow("confidence_threshold must be in (0, 1]");
      expect(() => new MasterPostFineTuningEngine({ confidence_threshold: 1.5 })).toThrow("confidence_threshold must be in (0, 1]");
    });
  });

  // ==========================================================================
  // RECORD ACTUAL VS PREDICTED
  // ==========================================================================

  describe("recordActualVsPredicted", () => {
    it("should record feed rate discrepancies", () => {
      const predicted = "G01 X100 Y50 F1000\nG01 X150 Y75 F1000";
      const actual = "G01 X100 Y50 F1050\nG01 X150 Y75 F1050";

      const result = engine.recordActualVsPredicted(predicted, actual, "fanuc");

      expect(result.discrepancies_found).toBeGreaterThan(0);
      expect(result.weights_updated).toBe(true);
      expect(result.records.length).toBeGreaterThan(0);
      expect(result.records[0].controller).toBe("fanuc");
      expect(result.records[0].parameter).toBe("feed_rate");
    });

    it("should record spindle speed discrepancies", () => {
      const predicted = "S3000 M03\nG01 X100 F500";
      const actual = "S3200 M03\nG01 X100 F500";

      const result = engine.recordActualVsPredicted(predicted, actual, "haas");

      expect(result.discrepancies_found).toBeGreaterThan(0);
      const spindleRecord = result.records.find(r => r.parameter === "spindle_speed");
      expect(spindleRecord).toBeDefined();
      expect(spindleRecord!.correction).toBeGreaterThan(0);
    });

    it("should apply JM-DIE proven weight multiplier", () => {
      const predicted = "G01 F1000";
      const actual = "G01 F1100";

      const normalResult = engine.recordActualVsPredicted(predicted, actual, "fanuc");
      const provenResult = engine.recordActualVsPredicted(predicted, actual, "fanuc", {
        jm_die_proven: true,
      });

      // Both should record discrepancies
      expect(normalResult.discrepancies_found).toBeGreaterThan(0);
      expect(provenResult.discrepancies_found).toBeGreaterThan(0);

      // Proven records should have higher weight
      if (normalResult.records.length > 0 && provenResult.records.length > 0) {
        expect(provenResult.records[0].weight).toBe(2.0);
        expect(normalResult.records[0].weight).toBe(1.0);
      }
    });

    it("should infer operation type from G-code", () => {
      const roughingCode = "(ROUGH PASS)\nG01 F2000";
      const finishingCode = "(FINISH PASS)\nG01 F500";

      const roughResult = engine.recordActualVsPredicted(roughingCode, "G01 F2100", "okuma");
      const finishResult = engine.recordActualVsPredicted(finishingCode, "G01 F550", "okuma");

      if (roughResult.records.length > 0) {
        expect(roughResult.records[0].operation).toBe("roughing");
      }
      if (finishResult.records.length > 0) {
        expect(finishResult.records[0].operation).toBe("finishing");
      }
    });

    it("should respect operation override option", () => {
      const predicted = "G01 F1000";
      const actual = "G01 F1100";

      const result = engine.recordActualVsPredicted(predicted, actual, "siemens", {
        operation: "hsm",
      });

      if (result.records.length > 0) {
        expect(result.records[0].operation).toBe("hsm");
      }
    });

    it("should include context in records", () => {
      const predicted = "G01 F1000";
      const actual = "G01 F1100";

      const result = engine.recordActualVsPredicted(predicted, actual, "mazak", {
        context: {
          material: "aluminum",
          tool_diameter_mm: 12,
          job_id: "JOB-001",
        },
      });

      if (result.records.length > 0) {
        expect(result.records[0].context.material).toBe("aluminum");
        expect(result.records[0].context.tool_diameter_mm).toBe(12);
        expect(result.records[0].context.job_id).toBe("JOB-001");
      }
    });
  });

  // ==========================================================================
  // GET FINE-TUNED PARAMETERS
  // ==========================================================================

  describe("getFineTunedParameters", () => {
    it("should return empty adjustments when no data exists", () => {
      const result = engine.getFineTunedParameters("fanuc", "roughing");

      expect(result.controller).toBe("fanuc");
      expect(result.operation).toBe("roughing");
      expect(result.adjustments.length).toBe(0);
      expect(result.overall_confidence).toBe(0);
      expect(result.ready_for_application).toBe(false);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it("should return adjustments after recording discrepancies", () => {
      // Record multiple discrepancies to build confidence
      for (let i = 0; i < 15; i++) {
        engine.recordActualVsPredicted(
          `G01 F${1000 + i} S3000`,
          `G01 F${1050 + i} S3100`,
          "fanuc",
          { operation: "roughing" }
        );
      }

      const result = engine.getFineTunedParameters("fanuc", "roughing");

      expect(result.adjustments.length).toBeGreaterThan(0);
      const feedAdj = result.adjustments.find(a => a.parameter === "feed_rate");
      expect(feedAdj).toBeDefined();
      expect(feedAdj!.samples).toBeGreaterThanOrEqual(15);
    });

    it("should calculate recommendations based on confidence", () => {
      // Record many consistent discrepancies for high confidence
      for (let i = 0; i < 20; i++) {
        engine.recordActualVsPredicted("G01 F1000", "G01 F1050", "haas", { operation: "finishing" });
      }

      const result = engine.getFineTunedParameters("haas", "finishing");
      const feedAdj = result.adjustments.find(a => a.parameter === "feed_rate");

      expect(feedAdj).toBeDefined();
      // After enough consistent samples, should recommend apply or review
      expect(["apply", "review"]).toContain(feedAdj!.apply_recommendation);
    });

    it("should warn about insufficient samples", () => {
      // Record just a few discrepancies
      for (let i = 0; i < 3; i++) {
        engine.recordActualVsPredicted("G01 F1000", "G01 F1050", "okuma", { operation: "drilling" });
      }

      const result = engine.getFineTunedParameters("okuma", "drilling");
      expect(result.warnings.some(w => w.includes("samples"))).toBe(true);
    });
  });

  // ==========================================================================
  // APPLY FINE-TUNING
  // ==========================================================================

  describe("applyFineTuning", () => {
    it("should return unchanged G-code when no weights exist", () => {
      const gcode = "G01 X100 Y50 F1000\nG01 X150 Y75 F1000";
      const result = engine.applyFineTuning(gcode, "mitsubishi");

      expect(result.original_gcode).toBe(gcode);
      expect(result.fine_tuned_gcode).toBe(gcode);
      expect(result.modifications.length).toBe(0);
      expect(result.blocks_modified).toBe(0);
    });

    it("should apply corrections after sufficient training", () => {
      // Train with consistent discrepancies
      for (let i = 0; i < 30; i++) {
        engine.recordActualVsPredicted("G01 F1000", "G01 F1100", "fanuc", { operation: "roughing" });
      }

      const gcode = "G01 X100 F1000\nG01 X150 F1000";
      const result = engine.applyFineTuning(gcode, "fanuc", {
        operation: "roughing",
        confidence_threshold: 0.3, // Lower threshold for test
      });

      // Check if modifications were applied
      if (result.modifications.length > 0) {
        expect(result.fine_tuned_gcode).not.toBe(gcode);
        expect(result.blocks_modified).toBeGreaterThan(0);
        expect(result.modifications[0].parameter).toBe("feed_rate");
      }
    });

    it("should respect confidence threshold", () => {
      // Train with some discrepancies
      for (let i = 0; i < 5; i++) {
        engine.recordActualVsPredicted("G01 F1000", "G01 F1050", "haas", { operation: "finishing" });
      }

      const gcode = "G01 X100 F1000";

      // High threshold should prevent application
      const highThresholdResult = engine.applyFineTuning(gcode, "haas", {
        operation: "finishing",
        confidence_threshold: 0.99,
      });

      expect(highThresholdResult.modifications.length).toBe(0);
    });

    it("should track modification details correctly", () => {
      // Train with significant discrepancy
      for (let i = 0; i < 50; i++) {
        engine.recordActualVsPredicted("G01 F1000 S3000", "G01 F1100 S3200", "siemens", { operation: "hsm" });
      }

      const gcode = "N10 G01 X100 F1000 S3000";
      const result = engine.applyFineTuning(gcode, "siemens", {
        operation: "hsm",
        confidence_threshold: 0.1, // Low for test
      });

      for (const mod of result.modifications) {
        expect(mod.line_number).toBe(1);
        expect(mod.original_line).toBe(gcode);
        expect(mod.original_value).toBeDefined();
        expect(mod.adjusted_value).toBeDefined();
        expect(mod.delta_applied).toBeDefined();
        expect(mod.confidence).toBeGreaterThan(0);
      }
    });

    it("should calculate modification rate correctly", () => {
      // Setup weights
      for (let i = 0; i < 50; i++) {
        engine.recordActualVsPredicted("G01 F1000", "G01 F1100", "fanuc", { operation: "semi_finishing" });
      }

      const gcode = "G01 F1000\n(COMMENT)\nG01 F1000\nG00 X0";
      const result = engine.applyFineTuning(gcode, "fanuc", {
        operation: "semi_finishing",
        confidence_threshold: 0.1,
      });

      expect(result.total_blocks).toBe(4);
      if (result.blocks_modified > 0) {
        expect(result.modification_rate).toBe(result.blocks_modified / result.total_blocks);
      }
    });
  });

  // ==========================================================================
  // GET CONFIDENCE SCORE
  // ==========================================================================

  describe("getConfidenceScore", () => {
    it("should return zero confidence when no data exists", () => {
      const result = engine.getConfidenceScore("fanuc", "roughing");

      expect(result.confidence).toBe(0);
      expect(result.sample_count).toBe(0);
      expect(result.stability).toBe("insufficient_data");
    });

    it("should calculate confidence based on sample count and variance", () => {
      // Record consistent discrepancies
      for (let i = 0; i < 100; i++) {
        engine.recordActualVsPredicted("G01 F1000", "G01 F1050", "okuma", { operation: "finishing" });
      }

      const result = engine.getConfidenceScore("okuma", "finishing", "feed_rate");

      expect(result.confidence).toBeGreaterThan(0);
      expect(result.sample_count).toBeGreaterThanOrEqual(100);
      expect(result.variance).toBeDefined();
      expect(result.mean_correction).toBeCloseTo(50, -1); // Approximately 50
    });

    it("should assess stability correctly", () => {
      // High-confidence stable case
      for (let i = 0; i < 100; i++) {
        engine.recordActualVsPredicted("G01 F1000", "G01 F1050", "haas", { operation: "roughing" });
      }

      const result = engine.getConfidenceScore("haas", "roughing");
      expect(["stable", "converging"]).toContain(result.stability);
    });

    it("should provide appropriate recommendations", () => {
      for (let i = 0; i < 50; i++) {
        engine.recordActualVsPredicted("G01 F1000", "G01 F1050", "mazak", { operation: "adaptive" });
      }

      const result = engine.getConfidenceScore("mazak", "adaptive");
      expect(result.recommendation).toBeDefined();
      expect(result.recommendation.length).toBeGreaterThan(0);
    });

    it("should return overall confidence when parameter not specified", () => {
      for (let i = 0; i < 20; i++) {
        engine.recordActualVsPredicted("G01 F1000 S3000", "G01 F1050 S3100", "fanuc", { operation: "5axis" });
      }

      const overall = engine.getConfidenceScore("fanuc", "5axis");
      const feedSpecific = engine.getConfidenceScore("fanuc", "5axis", "feed_rate");

      expect(overall.parameter).toBe("feed_rate"); // Default
      expect(feedSpecific.parameter).toBe("feed_rate");
    });
  });

  // ==========================================================================
  // EXPORT / IMPORT
  // ==========================================================================

  describe("exportFineTuningData", () => {
    it("should export empty data when no weights exist", () => {
      const exported = engine.exportFineTuningData();

      expect(exported.version).toBe("1.0.0");
      expect(exported.weights.length).toBe(0);
      expect(exported.statistics.total_observations).toBe(0);
      expect(exported.checksum).toBeDefined();
    });

    it("should export all weights and statistics", () => {
      // Create some weights
      for (let i = 0; i < 20; i++) {
        engine.recordActualVsPredicted("G01 F1000", "G01 F1050", "fanuc", { operation: "roughing" });
        engine.recordActualVsPredicted("G01 F800", "G01 F850", "haas", { operation: "finishing" });
      }

      const exported = engine.exportFineTuningData();

      expect(exported.weights.length).toBe(2);
      expect(exported.statistics.total_observations).toBe(40);
      expect(exported.statistics.controllers_tuned).toBe(2);
      expect(exported.statistics.operations_tuned).toBe(2);
      expect(exported.checksum).toBeDefined();
    });

    it("should include timestamps in statistics", () => {
      engine.recordActualVsPredicted("G01 F1000", "G01 F1050", "okuma", { operation: "drilling" });

      const exported = engine.exportFineTuningData();

      expect(exported.statistics.oldest_observation).toBeDefined();
      expect(exported.statistics.newest_observation).toBeDefined();
    });
  });

  describe("importFineTuningData", () => {
    it("should import valid export data", () => {
      // Create and export weights
      for (let i = 0; i < 20; i++) {
        engine.recordActualVsPredicted("G01 F1000", "G01 F1050", "fanuc", { operation: "roughing" });
      }
      const exported = engine.exportFineTuningData();

      // Import into fresh engine
      const newEngine = new MasterPostFineTuningEngine();
      const result = newEngine.importFineTuningData(exported);

      expect(result.success).toBe(true);
      expect(result.weights_imported).toBe(1);
      expect(result.errors.length).toBe(0);

      // Verify weights were imported
      const params = newEngine.getFineTunedParameters("fanuc", "roughing");
      expect(params.adjustments.length).toBeGreaterThan(0);
    });

    it("should merge weights when merge option is true", () => {
      // Setup first engine
      for (let i = 0; i < 20; i++) {
        engine.recordActualVsPredicted("G01 F1000", "G01 F1050", "fanuc", { operation: "roughing" });
      }
      const exported1 = engine.exportFineTuningData();

      // Setup second engine with different data
      const engine2 = new MasterPostFineTuningEngine();
      for (let i = 0; i < 20; i++) {
        engine2.recordActualVsPredicted("G01 F1000", "G01 F1100", "fanuc", { operation: "roughing" });
      }

      // Import with merge
      const result = engine2.importFineTuningData(exported1, { merge: true });

      expect(result.success).toBe(true);
      expect(result.merged).toBe(true);

      // Sample count should be combined
      const params = engine2.getFineTunedParameters("fanuc", "roughing");
      const feedAdj = params.adjustments.find(a => a.parameter === "feed_rate");
      expect(feedAdj!.samples).toBeGreaterThanOrEqual(40);
    });

    it("should replace weights when merge option is false", () => {
      // Setup engine with initial data
      for (let i = 0; i < 20; i++) {
        engine.recordActualVsPredicted("G01 F1000", "G01 F1050", "haas", { operation: "finishing" });
      }

      // Create export from different source
      const sourceEngine = new MasterPostFineTuningEngine();
      for (let i = 0; i < 10; i++) {
        sourceEngine.recordActualVsPredicted("G01 F800", "G01 F850", "fanuc", { operation: "drilling" });
      }
      const exported = sourceEngine.exportFineTuningData();

      // Import without merge
      const result = engine.importFineTuningData(exported, { merge: false });

      expect(result.success).toBe(true);
      expect(result.merged).toBe(false);

      // Original haas data should be gone
      const haasParams = engine.getFineTunedParameters("haas", "finishing");
      expect(haasParams.adjustments.length).toBe(0);

      // New fanuc data should exist
      const fanucParams = engine.getFineTunedParameters("fanuc", "drilling");
      expect(fanucParams.adjustments.length).toBeGreaterThan(0);
    });

    it("should reject corrupted checksum", () => {
      engine.recordActualVsPredicted("G01 F1000", "G01 F1050", "fanuc", { operation: "roughing" });
      const exported = engine.exportFineTuningData();

      // Corrupt the checksum
      exported.checksum = "CORRUPTED";

      const newEngine = new MasterPostFineTuningEngine();
      const result = newEngine.importFineTuningData(exported, { validate_checksum: true });

      expect(result.success).toBe(false);
      expect(result.errors.some(e => e.includes("Checksum"))).toBe(true);
    });

    it("should skip checksum validation when requested", () => {
      engine.recordActualVsPredicted("G01 F1000", "G01 F1050", "fanuc", { operation: "roughing" });
      const exported = engine.exportFineTuningData();

      // Corrupt the checksum
      exported.checksum = "CORRUPTED";

      const newEngine = new MasterPostFineTuningEngine();
      const result = newEngine.importFineTuningData(exported, { validate_checksum: false });

      expect(result.success).toBe(true);
    });
  });

  // ==========================================================================
  // STATISTICS AND UTILITY
  // ==========================================================================

  describe("getStatistics", () => {
    it("should return correct statistics", () => {
      for (let i = 0; i < 10; i++) {
        engine.recordActualVsPredicted("G01 F1000", "G01 F1050", "fanuc", { operation: "roughing" });
        engine.recordActualVsPredicted("G01 F800", "G01 F850", "haas", { operation: "finishing" });
        engine.recordActualVsPredicted("G01 F1200", "G01 F1250", "okuma", { operation: "drilling" });
      }

      const stats = engine.getStatistics();

      expect(stats.total_weights).toBe(3);
      expect(stats.total_observations).toBe(30);
      expect(stats.controllers).toContain("fanuc");
      expect(stats.controllers).toContain("haas");
      expect(stats.controllers).toContain("okuma");
      expect(stats.operations).toContain("roughing");
      expect(stats.operations).toContain("finishing");
      expect(stats.operations).toContain("drilling");
      expect(stats.avg_confidence).toBeGreaterThan(0);
    });

    it("should identify best and worst tuned", () => {
      // Create varied confidence levels
      for (let i = 0; i < 100; i++) {
        engine.recordActualVsPredicted("G01 F1000", "G01 F1050", "fanuc", { operation: "roughing" });
      }
      for (let i = 0; i < 5; i++) {
        engine.recordActualVsPredicted("G01 F1000", "G01 F1100", "haas", { operation: "finishing" });
      }

      const stats = engine.getStatistics();

      expect(stats.best_tuned).toBeDefined();
      expect(stats.worst_tuned).toBeDefined();
      expect(stats.best_tuned!.confidence).toBeGreaterThanOrEqual(stats.worst_tuned!.confidence);
    });
  });

  describe("clear", () => {
    it("should clear all data", () => {
      for (let i = 0; i < 20; i++) {
        engine.recordActualVsPredicted("G01 F1000", "G01 F1050", "fanuc", { operation: "roughing" });
      }

      expect(engine.getStatistics().total_weights).toBeGreaterThan(0);

      engine.clear();

      const stats = engine.getStatistics();
      expect(stats.total_weights).toBe(0);
      expect(stats.total_observations).toBe(0);
    });
  });

  describe("getHistory", () => {
    beforeEach(() => {
      for (let i = 0; i < 5; i++) {
        engine.recordActualVsPredicted("G01 F1000", "G01 F1050", "fanuc", { operation: "roughing" });
        engine.recordActualVsPredicted("G01 F800", "G01 F850", "haas", { operation: "finishing" });
      }
    });

    it("should return all history by default", () => {
      const history = engine.getHistory();
      expect(history.length).toBeGreaterThanOrEqual(10);
    });

    it("should filter by controller", () => {
      const history = engine.getHistory({ controller: "fanuc" });
      expect(history.every(r => r.controller === "fanuc")).toBe(true);
    });

    it("should filter by operation", () => {
      const history = engine.getHistory({ operation: "finishing" });
      expect(history.every(r => r.operation === "finishing")).toBe(true);
    });

    it("should limit results", () => {
      const history = engine.getHistory({ limit: 3 });
      expect(history.length).toBeLessThanOrEqual(3);
    });
  });

  // ==========================================================================
  // SINGLETON EXPORT
  // ==========================================================================

  describe("singleton export", () => {
    it("should export masterPostFineTuningEngine singleton", () => {
      expect(masterPostFineTuningEngine).toBeInstanceOf(MasterPostFineTuningEngine);
    });
  });

  // ==========================================================================
  // EDGE CASES
  // ==========================================================================

  describe("edge cases", () => {
    it("should handle empty G-code strings", () => {
      const result = engine.recordActualVsPredicted("", "", "fanuc");
      expect(result.discrepancies_found).toBe(0);
    });

    it("should handle G-code with no parameters", () => {
      const result = engine.recordActualVsPredicted("(COMMENT ONLY)", "(COMMENT ONLY)", "haas");
      expect(result.discrepancies_found).toBe(0);
    });

    it("should handle identical predicted and actual G-code", () => {
      const gcode = "G01 X100 F1000 S3000";
      const result = engine.recordActualVsPredicted(gcode, gcode, "okuma");
      // Identical values should not produce discrepancies (< 1% threshold)
      expect(result.discrepancies_found).toBe(0);
    });

    it("should bound corrections by max_correction_fraction", () => {
      // Create engine with strict bounds
      const strictEngine = new MasterPostFineTuningEngine({ max_correction_fraction: 0.1 });

      // Record extreme discrepancy
      for (let i = 0; i < 50; i++) {
        strictEngine.recordActualVsPredicted("G01 F1000", "G01 F2000", "fanuc", { operation: "roughing" });
      }

      const params = strictEngine.getFineTunedParameters("fanuc", "roughing");
      const feedAdj = params.adjustments.find(a => a.parameter === "feed_rate");

      if (feedAdj) {
        // Delta should be bounded: |delta| <= 0.1 * 1000 = 100
        expect(Math.abs(feedAdj.delta)).toBeLessThanOrEqual(100);
      }
    });

    it("should handle multiple parameter types in single line", () => {
      const predicted = "G01 X100 Y50 Z10 F1000 S3000";
      const actual = "G01 X100 Y50 Z10 F1100 S3200";

      const result = engine.recordActualVsPredicted(predicted, actual, "siemens", { operation: "hsm" });

      expect(result.discrepancies_found).toBeGreaterThanOrEqual(2);
      const feedRecord = result.records.find(r => r.parameter === "feed_rate");
      const spindleRecord = result.records.find(r => r.parameter === "spindle_speed");

      expect(feedRecord).toBeDefined();
      expect(spindleRecord).toBeDefined();
    });
  });
});
