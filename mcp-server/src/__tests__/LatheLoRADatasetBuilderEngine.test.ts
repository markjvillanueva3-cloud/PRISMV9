/**
 * LatheLoRADatasetBuilderEngine Tests — LATHE-LORA-MS0 U-LLR05
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  latheLoRADatasetBuilderEngine,
  type LoRAExample,
  type DatasetStats,
} from "../engines/LatheLoRADatasetBuilderEngine.js";

describe("LatheLoRADatasetBuilderEngine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("scanArchive", () => {
    it("returns empty array for non-existent path", async () => {
      const programs = await latheLoRADatasetBuilderEngine.scanArchive("/nonexistent/path");
      expect(programs).toEqual([]);
    });

    it("handles archive path gracefully", async () => {
      const programs = await latheLoRADatasetBuilderEngine.scanArchive("H:/PRISM/JM DIE/CNC LATHE");
      expect(Array.isArray(programs)).toBe(true);
    });
  });

  describe("getStats", () => {
    it("returns valid stats object", () => {
      const stats = latheLoRADatasetBuilderEngine.getStats();
      expect(stats).toHaveProperty("total_programs_scanned");
      expect(stats).toHaveProperty("examples_generated");
      expect(stats).toHaveProperty("train_examples");
      expect(stats).toHaveProperty("val_examples");
      expect(stats).toHaveProperty("test_examples");
      expect(typeof stats.total_programs_scanned).toBe("number");
    });
  });

  describe("getExamples", () => {
    it("returns array of examples", () => {
      const examples = latheLoRADatasetBuilderEngine.getExamples();
      expect(Array.isArray(examples)).toBe(true);
    });
  });

  describe("toAlpacaFormat", () => {
    it("converts examples to Alpaca format", () => {
      const alpaca = latheLoRADatasetBuilderEngine.toAlpacaFormat();
      expect(Array.isArray(alpaca)).toBe(true);
      if (alpaca.length > 0) {
        expect(alpaca[0]).toHaveProperty("instruction");
        expect(alpaca[0]).toHaveProperty("input");
        expect(alpaca[0]).toHaveProperty("output");
      }
    });
  });

  describe("toShareGPTFormat", () => {
    it("converts examples to ShareGPT format", () => {
      const sharegpt = latheLoRADatasetBuilderEngine.toShareGPTFormat();
      expect(Array.isArray(sharegpt)).toBe(true);
      if (sharegpt.length > 0) {
        expect(sharegpt[0]).toHaveProperty("conversations");
        expect(Array.isArray(sharegpt[0].conversations)).toBe(true);
      }
    });
  });

  describe("buildDataset", () => {
    it("returns result object with required fields", async () => {
      const result = await latheLoRADatasetBuilderEngine.buildDataset({
        maxPrograms: 5,
        outputDir: "H:/prism/mcp-server/data/test-lathe-lora",
      });

      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("stats");
      expect(result).toHaveProperty("errors");
      expect(result).toHaveProperty("warnings");
      expect(typeof result.success).toBe("boolean");
    });

    it("stats include split counts", async () => {
      const result = await latheLoRADatasetBuilderEngine.buildDataset({
        maxPrograms: 10,
        outputDir: "H:/prism/mcp-server/data/test-lathe-lora",
      });

      const { stats } = result;
      expect(stats.train_examples + stats.val_examples + stats.test_examples)
        .toBeLessThanOrEqual(stats.examples_generated);
    });
  });

  describe("example metadata", () => {
    it("examples have required metadata fields", () => {
      const examples = latheLoRADatasetBuilderEngine.getExamples();
      for (const ex of examples) {
        expect(ex).toHaveProperty("id");
        expect(ex).toHaveProperty("instruction");
        expect(ex).toHaveProperty("input");
        expect(ex).toHaveProperty("output");
        expect(ex).toHaveProperty("metadata");
        expect(ex.metadata).toHaveProperty("source_program");
        expect(ex.metadata).toHaveProperty("customer");
        expect(ex.metadata).toHaveProperty("operation_type");
        expect(ex.metadata).toHaveProperty("confidence");
      }
    });
  });

  describe("instruction templates", () => {
    it("generates varied instructions", async () => {
      await latheLoRADatasetBuilderEngine.buildDataset({
        maxPrograms: 20,
        outputDir: "H:/prism/mcp-server/data/test-lathe-lora",
      });

      const examples = latheLoRADatasetBuilderEngine.getExamples();
      if (examples.length >= 2) {
        const instructions = examples.map(e => e.instruction);
        const uniqueInstructions = new Set(instructions);
        expect(uniqueInstructions.size).toBeGreaterThan(1);
      }
    });
  });

  describe("tribal knowledge integration", () => {
    it("tracks tribal tips used in stats", async () => {
      const result = await latheLoRADatasetBuilderEngine.buildDataset({
        maxPrograms: 5,
        outputDir: "H:/prism/mcp-server/data/test-lathe-lora",
      });

      expect(typeof result.stats.tribal_tips_used).toBe("number");
    });
  });
});
