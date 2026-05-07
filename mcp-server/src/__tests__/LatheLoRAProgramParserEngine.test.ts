/**
 * LatheLoRAProgramParserEngine Tests — LATHE-LORA-MS0 U-LLR06
 */

import { describe, it, expect } from "vitest";
import {
  latheLoRAProgramParserEngine,
  type ParseResult,
  type ParsedLine,
} from "../engines/LatheLoRAProgramParserEngine.js";

describe("LatheLoRAProgramParserEngine", () => {
  const SAMPLE_PROGRAM = `O0001
(SAMPLE LATHE PROGRAM)
G50 S2500
G96 S250 M03
T0101
G00 X50. Z5.
G71 U2. R1.
G71 P10 Q20 U0.5 W0.1 F0.2
N10 G00 X20.
G01 Z-30. F0.15
N20 X50.
G70 P10 Q20
M30
`;

  describe("parse", () => {
    it("parses valid program successfully", () => {
      const result = latheLoRAProgramParserEngine.parse(SAMPLE_PROGRAM, "test.MIN");
      expect(result.success).toBe(true);
      expect(result.lines.length).toBeGreaterThan(0);
      expect(result.structure.total_lines).toBe(14);
    });

    it("extracts program number", () => {
      const result = latheLoRAProgramParserEngine.parse(SAMPLE_PROGRAM);
      expect(result.structure.program_number).toBe("0001");
    });

    it("detects CSS mode", () => {
      const result = latheLoRAProgramParserEngine.parse(SAMPLE_PROGRAM);
      expect(result.structure.has_css).toBe(true);
    });

    it("detects spindle clamp", () => {
      const result = latheLoRAProgramParserEngine.parse(SAMPLE_PROGRAM);
      expect(result.structure.spindle_clamp).toBe(2500);
    });

    it("counts tool changes", () => {
      const result = latheLoRAProgramParserEngine.parse(SAMPLE_PROGRAM);
      expect(result.structure.tool_changes).toBe(1);
      expect(result.structure.unique_tools).toContain(101);
    });

    it("extracts operations", () => {
      const result = latheLoRAProgramParserEngine.parse(SAMPLE_PROGRAM);
      expect(result.structure.operations.length).toBeGreaterThan(0);
      const opTypes = result.structure.operations.map(o => o.operation_type);
      expect(opTypes).toContain("roughing");
      expect(opTypes).toContain("finishing");
    });

    it("extracts comments", () => {
      const result = latheLoRAProgramParserEngine.parse(SAMPLE_PROGRAM);
      expect(result.structure.comments).toContain("SAMPLE LATHE PROGRAM");
    });
  });

  describe("parseLine", () => {
    it("parses G-codes correctly", () => {
      const line = latheLoRAProgramParserEngine.parse("G00 X50. Z5.").lines[0];
      expect(line.g_codes).toContain("G00");
      expect(line.type).toBe("rapid");
    });

    it("parses M-codes correctly", () => {
      const line = latheLoRAProgramParserEngine.parse("M03").lines[0];
      expect(line.m_codes).toContain("M03");
      expect(line.type).toBe("spindle_on");
    });

    it("extracts parameters", () => {
      const line = latheLoRAProgramParserEngine.parse("G01 X25.5 Z-10. F0.15").lines[0];
      expect(line.parameters.X).toBe(25.5);
      expect(line.parameters.Z).toBe(-10);
      expect(line.parameters.F).toBe(0.15);
    });

    it("handles comments", () => {
      const line = latheLoRAProgramParserEngine.parse("G00 X0. (HOME POSITION)").lines[0];
      expect(line.comment).toBe("HOME POSITION");
    });

    it("identifies tool change", () => {
      const line = latheLoRAProgramParserEngine.parse("T0202").lines[0];
      expect(line.type).toBe("tool_change");
    });

    it("identifies roughing cycle", () => {
      const line = latheLoRAProgramParserEngine.parse("G71 U2. R1.").lines[0];
      expect(line.type).toBe("roughing_cycle");
    });

    it("identifies finishing cycle", () => {
      const line = latheLoRAProgramParserEngine.parse("G70 P10 Q20").lines[0];
      expect(line.type).toBe("finishing_cycle");
    });

    it("identifies threading cycle", () => {
      const line = latheLoRAProgramParserEngine.parse("G76 P010060 Q50 R0.05").lines[0];
      expect(line.type).toBe("threading_cycle");
    });
  });

  describe("Okuma OSP dialect", () => {
    it("detects tool life commands", () => {
      const result = latheLoRAProgramParserEngine.parse("VLMON[1]=10\nVGRLF[1]");
      expect(result.structure.has_tool_life).toBe(true);
      expect(result.structure.dialect_confidence).toBeGreaterThanOrEqual(0.8);
    });

    it("parses variable assignments", () => {
      const result = latheLoRAProgramParserEngine.parse("V100=25.5");
      expect(result.lines[0].type).toBe("variable_set");
      expect(result.structure.variables).toHaveProperty("V100", 25.5);
    });
  });

  describe("extractOperationContexts", () => {
    it("extracts contexts for operations", () => {
      const result = latheLoRAProgramParserEngine.parse(SAMPLE_PROGRAM);
      const contexts = latheLoRAProgramParserEngine.extractOperationContexts(result);

      expect(contexts.length).toBeGreaterThan(0);
      expect(contexts[0]).toHaveProperty("operation");
      expect(contexts[0]).toHaveProperty("context_before");
      expect(contexts[0]).toHaveProperty("operation_code");
      expect(contexts[0]).toHaveProperty("context_after");
      expect(contexts[0]).toHaveProperty("parameters");
    });
  });

  describe("isValidOkumaProgram", () => {
    it("validates proper Okuma program with tool life", () => {
      const okumaProgram = `O0001
(OKUMA OSP PROGRAM)
VLMON[1]=10
G50 S2500
G96 S250 M03
T0101
G71 U2. R1.
G70 P10 Q20
M30
`;
      const result = latheLoRAProgramParserEngine.parse(okumaProgram);
      expect(latheLoRAProgramParserEngine.isValidOkumaProgram(result)).toBe(true);
    });

    it("rejects empty program", () => {
      const result = latheLoRAProgramParserEngine.parse("");
      expect(latheLoRAProgramParserEngine.isValidOkumaProgram(result)).toBe(false);
    });
  });

  describe("getProgramSummary", () => {
    it("generates readable summary", () => {
      const result = latheLoRAProgramParserEngine.parse(SAMPLE_PROGRAM);
      const summary = latheLoRAProgramParserEngine.getProgramSummary(result);

      expect(summary).toContain("lines");
      expect(summary).toContain("tool changes");
      expect(summary).toContain("operations");
      expect(summary).toContain("CSS mode");
    });
  });

  describe("edge cases", () => {
    it("handles empty lines", () => {
      const result = latheLoRAProgramParserEngine.parse("\n\n\n");
      expect(result.success).toBe(true);
      expect(result.lines.every(l => l.type === "empty")).toBe(true);
    });

    it("handles comment-only program", () => {
      const result = latheLoRAProgramParserEngine.parse("(TEST)\n(COMMENT ONLY)");
      expect(result.success).toBe(true);
      expect(result.structure.comments.length).toBe(2);
    });

    it("handles negative coordinates", () => {
      const line = latheLoRAProgramParserEngine.parse("G01 X-25.5 Z-100.").lines[0];
      expect(line.parameters.X).toBe(-25.5);
      expect(line.parameters.Z).toBe(-100);
    });
  });
});
