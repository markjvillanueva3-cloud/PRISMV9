/**
 * LatheLoRADatasetValidatorEngine Tests — LATHE-LORA-MS0 U-LLR08
 */

import { describe, it, expect } from "vitest";
import {
  latheLoRADatasetValidatorEngine,
  type ValidationResult,
} from "../engines/LatheLoRADatasetValidatorEngine.js";
import type { TrainingExample } from "../engines/LatheLoRAExampleGeneratorEngine.js";

describe("LatheLoRADatasetValidatorEngine", () => {
  const validExample: TrainingExample = {
    id: "test-001",
    type: "speed_feed",
    instruction: "Calculate optimal cutting parameters for roughing tool steel on a lathe.",
    input: "Material: D2 tool steel, Operation: roughing, Diameter: 50mm",
    output: "**Speed/Feed Analysis:**\n\nFor D2 tool steel (ISO H group):\n- Recommended spindle speed: 800 RPM\n- Feed rate: 0.015 IPR\n- Depth of cut: 2.0mm\n\nUse CSS mode (G96) with spindle clamp.",
    confidence: 0.85,
    tags: ["kienzle", "speed_feed", "roughing"],
    source: {
      program: "test.MIN",
      operation: "roughing",
    },
  };

  const createValidExamples = (count: number): TrainingExample[] => {
    return Array.from({ length: count }, (_, i) => ({
      ...validExample,
      id: `test-${i.toString().padStart(3, "0")}`,
      instruction: `${validExample.instruction} Variant ${i}.`,
    }));
  };

  describe("validate", () => {
    it("validates valid dataset successfully", () => {
      const examples = createValidExamples(5);
      const result = latheLoRADatasetValidatorEngine.validate(examples);

      expect(result.valid).toBe(true);
      expect(result.score).toBeGreaterThan(50);
      expect(result.total_examples).toBe(5);
    });

    it("fails on empty dataset", () => {
      const result = latheLoRADatasetValidatorEngine.validate([]);

      expect(result.valid).toBe(false);
      expect(result.score).toBe(0);
      expect(result.issues.some(i => i.code === "EMPTY_DATASET")).toBe(true);
    });

    it("detects missing instruction", () => {
      const badExample = { ...validExample, instruction: "" } as TrainingExample;
      const result = latheLoRADatasetValidatorEngine.validate([badExample]);

      expect(result.issues.some(i => i.code === "MISSING_INSTRUCTION")).toBe(true);
    });

    it("detects missing output", () => {
      const badExample = { ...validExample, output: "" } as TrainingExample;
      const result = latheLoRADatasetValidatorEngine.validate([badExample]);

      expect(result.issues.some(i => i.code === "MISSING_OUTPUT")).toBe(true);
    });

    it("warns on low confidence", () => {
      const lowConfidence = { ...validExample, confidence: 0.3 };
      const result = latheLoRADatasetValidatorEngine.validate([lowConfidence]);

      expect(result.issues.some(i => i.code === "LOW_CONFIDENCE")).toBe(true);
    });
  });

  describe("content validation", () => {
    it("warns on short instruction", () => {
      const shortInstr = { ...validExample, instruction: "Short" };
      const result = latheLoRADatasetValidatorEngine.validate([shortInstr]);

      expect(result.issues.some(i => i.code === "SHORT_INSTRUCTION")).toBe(true);
    });

    it("warns on short output", () => {
      const shortOutput = { ...validExample, output: "Short output." };
      const result = latheLoRADatasetValidatorEngine.validate([shortOutput]);

      expect(result.issues.some(i => i.code === "SHORT_OUTPUT")).toBe(true);
    });
  });

  describe("physics validation", () => {
    it("warns on unusual RPM values", () => {
      const unusualRPM = {
        ...validExample,
        output: "Use spindle speed of 50000 RPM for best results.",
      };
      const result = latheLoRADatasetValidatorEngine.validate([unusualRPM], {
        check_physics: true,
      });

      expect(result.issues.some(i => i.code === "UNUSUAL_RPM")).toBe(true);
    });

    it("warns on unusual feed rates", () => {
      const unusualFeed = {
        ...validExample,
        output: "Set feed to 0.5 IPR for roughing.",
      };
      const result = latheLoRADatasetValidatorEngine.validate([unusualFeed], {
        check_physics: true,
      });

      expect(result.issues.some(i => i.code === "UNUSUAL_FEED")).toBe(true);
    });

    it("skips physics check when disabled", () => {
      const unusualRPM = {
        ...validExample,
        output: "Use spindle speed of 50000 RPM.",
      };
      const result = latheLoRADatasetValidatorEngine.validate([unusualRPM], {
        check_physics: false,
      });

      expect(result.issues.some(i => i.code === "UNUSUAL_RPM")).toBe(false);
    });
  });

  describe("diversity validation", () => {
    it("warns on missing required operation types", () => {
      const singleType: TrainingExample[] = [
        { ...validExample, source: { program: "test.MIN", operation: "drilling" } },
      ];
      const result = latheLoRADatasetValidatorEngine.validate(singleType, {
        required_operation_types: ["roughing", "finishing"],
      });

      expect(result.issues.some(i => i.code === "MISSING_OPERATION_TYPE")).toBe(true);
    });

    it("calculates diversity score", () => {
      const diverse = [
        { ...validExample, type: "speed_feed" as const },
        { ...validExample, id: "test-002", type: "code_explanation" as const, instruction: "Explain this code." },
        { ...validExample, id: "test-003", type: "optimization" as const, instruction: "Optimize this program." },
        { ...validExample, id: "test-004", type: "safety_check" as const, instruction: "Check safety." },
      ];
      const result = latheLoRADatasetValidatorEngine.validate(diverse);

      expect(result.metrics.diversity_score).toBeGreaterThan(0.5);
    });
  });

  describe("duplicate detection", () => {
    it("detects duplicate examples", () => {
      const duplicates = [
        validExample,
        { ...validExample, id: "test-002" }, // Same content, different ID
      ];
      const result = latheLoRADatasetValidatorEngine.validate(duplicates, {
        check_duplicates: true,
      });

      expect(result.issues.some(i => i.code === "DUPLICATE_EXAMPLE")).toBe(true);
    });

    it("skips duplicate check when disabled", () => {
      const duplicates = [
        validExample,
        { ...validExample, id: "test-002" },
      ];
      const result = latheLoRADatasetValidatorEngine.validate(duplicates, {
        check_duplicates: false,
      });

      expect(result.issues.some(i => i.code === "DUPLICATE_EXAMPLE")).toBe(false);
    });
  });

  describe("metrics", () => {
    it("calculates average lengths", () => {
      const examples = createValidExamples(3);
      const result = latheLoRADatasetValidatorEngine.validate(examples);

      expect(result.metrics.avg_instruction_length).toBeGreaterThan(0);
      expect(result.metrics.avg_output_length).toBeGreaterThan(0);
    });

    it("tracks type distribution", () => {
      const mixed = [
        { ...validExample, type: "speed_feed" as const },
        { ...validExample, id: "test-002", type: "code_explanation" as const, instruction: "Explain." },
      ];
      const result = latheLoRADatasetValidatorEngine.validate(mixed);

      expect(result.metrics.type_distribution["speed_feed"]).toBe(1);
      expect(result.metrics.type_distribution["code_explanation"]).toBe(1);
    });

    it("tracks operation coverage", () => {
      const examples = [
        { ...validExample, source: { program: "a.MIN", operation: "roughing" as const } },
        { ...validExample, id: "test-002", source: { program: "b.MIN", operation: "finishing" as const }, instruction: "Finishing example." },
      ];
      const result = latheLoRADatasetValidatorEngine.validate(examples);

      expect(result.metrics.operation_coverage).toContain("roughing");
      expect(result.metrics.operation_coverage).toContain("finishing");
    });
  });

  describe("score calculation", () => {
    it("gives high score to quality dataset", () => {
      const quality = createValidExamples(10);
      const result = latheLoRADatasetValidatorEngine.validate(quality);

      expect(result.score).toBeGreaterThan(60);
    });

    it("penalizes datasets with errors", () => {
      const withErrors = [
        { ...validExample, instruction: "" },
        { ...validExample, id: "test-002", output: "" },
      ];
      const result = latheLoRADatasetValidatorEngine.validate(withErrors);

      expect(result.score).toBeLessThan(50);
    });
  });

  describe("recommendations", () => {
    it("generates recommendations for issues", () => {
      const lowQuality = [
        { ...validExample, output: "Short." },
      ];
      const result = latheLoRADatasetValidatorEngine.validate(lowQuality);

      expect(result.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe("validateSingle", () => {
    it("validates single example", () => {
      const issues = latheLoRADatasetValidatorEngine.validateSingle(validExample);
      expect(Array.isArray(issues)).toBe(true);
    });
  });

  describe("getSummary", () => {
    it("generates readable summary", () => {
      const result = latheLoRADatasetValidatorEngine.validate(createValidExamples(3));
      const summary = latheLoRADatasetValidatorEngine.getSummary(result);

      expect(summary).toContain("Validation:");
      expect(summary).toContain("Score:");
      expect(summary).toContain("Examples:");
    });
  });
});
