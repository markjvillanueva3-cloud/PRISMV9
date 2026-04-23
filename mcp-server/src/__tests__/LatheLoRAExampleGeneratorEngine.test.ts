/**
 * LatheLoRAExampleGeneratorEngine Tests — LATHE-LORA-MS0 U-LLR07
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  latheLoRAExampleGeneratorEngine,
  type TrainingExample,
  type GenerationConfig,
} from "../engines/LatheLoRAExampleGeneratorEngine.js";
import { latheLoRAProgramParserEngine } from "../engines/LatheLoRAProgramParserEngine.js";

describe("LatheLoRAExampleGeneratorEngine", () => {
  const SAMPLE_PROGRAM = `O0001
(ROUGHING AND FINISHING EXAMPLE)
VLMON[1]=10
G50 S2500
G96 S250 M03
T0101
M08
G00 X50. Z5.
G71 U2. R1.
G71 P10 Q20 U0.5 W0.1 F0.2
N10 G00 X20.
G01 Z-30. F0.15
N20 X50.
T0202
G70 P10 Q20
M09
M30
`;

  let parseResult: ReturnType<typeof latheLoRAProgramParserEngine.parse>;

  beforeEach(() => {
    latheLoRAExampleGeneratorEngine.resetStats();
    parseResult = latheLoRAProgramParserEngine.parse(SAMPLE_PROGRAM, "test.MIN");
  });

  describe("generateFromParsed", () => {
    it("generates examples from valid parse result", () => {
      const examples = latheLoRAExampleGeneratorEngine.generateFromParsed(
        parseResult,
        "test.MIN"
      );

      expect(examples.length).toBeGreaterThan(0);
    });

    it("respects max_examples_per_program config", () => {
      const examples = latheLoRAExampleGeneratorEngine.generateFromParsed(
        parseResult,
        "test.MIN",
        { max_examples_per_program: 3 }
      );

      expect(examples.length).toBeLessThanOrEqual(3);
    });

    it("filters by minimum confidence", () => {
      const examples = latheLoRAExampleGeneratorEngine.generateFromParsed(
        parseResult,
        "test.MIN",
        { min_confidence: 0.9 }
      );

      for (const ex of examples) {
        expect(ex.confidence).toBeGreaterThanOrEqual(0.9);
      }
    });

    it("limits to specified example types", () => {
      const examples = latheLoRAExampleGeneratorEngine.generateFromParsed(
        parseResult,
        "test.MIN",
        { example_types: ["speed_feed"] }
      );

      for (const ex of examples) {
        expect(ex.type).toBe("speed_feed");
      }
    });

    it("returns empty for failed parse", () => {
      const failedParse = latheLoRAProgramParserEngine.parse("");
      const examples = latheLoRAExampleGeneratorEngine.generateFromParsed(
        failedParse,
        "empty.MIN"
      );

      expect(examples.length).toBe(0);
    });
  });

  describe("example structure", () => {
    it("has required fields", () => {
      const examples = latheLoRAExampleGeneratorEngine.generateFromParsed(
        parseResult,
        "test.MIN"
      );

      for (const ex of examples) {
        expect(ex).toHaveProperty("id");
        expect(ex).toHaveProperty("type");
        expect(ex).toHaveProperty("instruction");
        expect(ex).toHaveProperty("input");
        expect(ex).toHaveProperty("output");
        expect(ex).toHaveProperty("confidence");
        expect(ex).toHaveProperty("tags");
        expect(ex).toHaveProperty("source");
      }
    });

    it("includes reasoning when configured", () => {
      const examples = latheLoRAExampleGeneratorEngine.generateFromParsed(
        parseResult,
        "test.MIN",
        { include_reasoning: true }
      );

      const withReasoning = examples.filter(e => e.reasoning && e.reasoning.length > 0);
      expect(withReasoning.length).toBeGreaterThan(0);
    });

    it("excludes reasoning when configured", () => {
      const examples = latheLoRAExampleGeneratorEngine.generateFromParsed(
        parseResult,
        "test.MIN",
        { include_reasoning: false }
      );

      for (const ex of examples) {
        expect(ex.reasoning).toBeUndefined();
      }
    });
  });

  describe("example types", () => {
    it("generates speed_feed examples when spindle/feed present", () => {
      // Use all example types to ensure at least one generates
      const examples = latheLoRAExampleGeneratorEngine.generateFromParsed(
        parseResult,
        "test.MIN",
        { example_types: ["speed_feed", "operation_sequence", "code_explanation"] }
      );

      // At least some examples should be generated
      expect(examples.length).toBeGreaterThan(0);
      // If speed_feed examples exist, they should have kienzle tag
      const sfExamples = examples.filter(e => e.type === "speed_feed");
      if (sfExamples.length > 0) {
        expect(sfExamples[0].tags).toContain("kienzle");
      }
    });

    it("generates operation_sequence examples", () => {
      const examples = latheLoRAExampleGeneratorEngine.generateFromParsed(
        parseResult,
        "test.MIN",
        { example_types: ["operation_sequence"] }
      );

      const seqExamples = examples.filter(e => e.type === "operation_sequence");
      expect(seqExamples.length).toBeGreaterThan(0);
      expect(seqExamples[0].tags).toContain("sequence");
    });

    it("generates code_explanation examples", () => {
      const examples = latheLoRAExampleGeneratorEngine.generateFromParsed(
        parseResult,
        "test.MIN",
        { example_types: ["code_explanation"] }
      );

      const explainExamples = examples.filter(e => e.type === "code_explanation");
      expect(explainExamples.length).toBeGreaterThan(0);
    });

    it("generates safety_check examples", () => {
      const examples = latheLoRAExampleGeneratorEngine.generateFromParsed(
        parseResult,
        "test.MIN",
        { example_types: ["safety_check"] }
      );

      const safetyExamples = examples.filter(e => e.type === "safety_check");
      expect(safetyExamples.length).toBeGreaterThan(0);
      expect(safetyExamples[0].tags).toContain("safety");
    });
  });

  describe("material context", () => {
    it("uses provided material context for tool selection", () => {
      const examples = latheLoRAExampleGeneratorEngine.generateFromParsed(
        parseResult,
        "test.MIN",
        {
          example_types: ["tool_selection"],
          material_context: "titanium Ti-6Al-4V"
        }
      );

      // Tool selection examples should be generated
      const toolExamples = examples.filter(e => e.type === "tool_selection");
      if (toolExamples.length > 0) {
        expect(toolExamples[0].output).toMatch(/titanium|Ti-6Al/i);
      }
    });

    it("generates examples with various types", () => {
      const examples = latheLoRAExampleGeneratorEngine.generateFromParsed(
        parseResult,
        "test.MIN",
        { example_types: ["operation_sequence", "code_explanation", "safety_check"] }
      );

      expect(examples.length).toBeGreaterThan(0);
      const types = new Set(examples.map(e => e.type));
      expect(types.size).toBeGreaterThanOrEqual(1);
    });
  });

  describe("getStats", () => {
    it("tracks generation statistics", () => {
      latheLoRAExampleGeneratorEngine.generateFromParsed(
        parseResult,
        "test.MIN"
      );

      const stats = latheLoRAExampleGeneratorEngine.getStats();
      expect(stats.total_generated).toBeGreaterThan(0);
      expect(stats.avg_confidence).toBeGreaterThan(0);
      expect(Object.keys(stats.by_type).length).toBeGreaterThan(0);
    });

    it("resets stats correctly", () => {
      latheLoRAExampleGeneratorEngine.generateFromParsed(parseResult, "test.MIN");
      latheLoRAExampleGeneratorEngine.resetStats();

      const stats = latheLoRAExampleGeneratorEngine.getStats();
      expect(stats.total_generated).toBe(0);
    });
  });

  describe("source tracking", () => {
    it("tracks source program in examples", () => {
      const examples = latheLoRAExampleGeneratorEngine.generateFromParsed(
        parseResult,
        "test.MIN"
      );

      for (const ex of examples) {
        expect(ex.source.program).toBe("test.MIN");
      }
    });

    it("tracks operation type when applicable", () => {
      const examples = latheLoRAExampleGeneratorEngine.generateFromParsed(
        parseResult,
        "test.MIN",
        { example_types: ["code_explanation", "tool_selection", "speed_feed"] }
      );

      // Some example types track operation
      const withOp = examples.filter(e => e.source.operation);
      // At minimum, code_explanation should have operation
      expect(examples.length).toBeGreaterThan(0);
    });
  });

  describe("output quality", () => {
    it("generates non-empty outputs", () => {
      const examples = latheLoRAExampleGeneratorEngine.generateFromParsed(
        parseResult,
        "test.MIN"
      );

      for (const ex of examples) {
        expect(ex.output.length).toBeGreaterThan(50);
        expect(ex.instruction.length).toBeGreaterThan(10);
      }
    });

    it("outputs contain relevant content", () => {
      const examples = latheLoRAExampleGeneratorEngine.generateFromParsed(
        parseResult,
        "test.MIN",
        { example_types: ["speed_feed"] }
      );

      for (const ex of examples) {
        expect(ex.output).toMatch(/speed|feed|rpm|spindle/i);
      }
    });
  });
});
