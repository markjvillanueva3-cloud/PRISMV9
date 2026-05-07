/**
 * LathePostProcessorDialectValidatorEngine — LATHE-PROD-READY-MS0 U-LPR03
 *
 * Tests dialect comparison and structural parity validation.
 */

import { describe, it, expect } from "vitest";
import {
  LathePostProcessorDialectValidatorEngine,
  DialectComparisonResult,
} from "../engines/LathePostProcessorDialectValidatorEngine.js";

describe("LathePostProcessorDialectValidatorEngine", () => {
  describe("parseGCodeBlock", () => {
    it("parses simple G-code block", () => {
      const block = LathePostProcessorDialectValidatorEngine.parseGCodeBlock(
        "G01 X25.0 Z-10.0 F0.15",
        1
      );
      expect(block.g_codes).toContain("G01");
      expect(block.addresses.get("X")).toBeCloseTo(25.0, 3);
      expect(block.addresses.get("Z")).toBeCloseTo(-10.0, 3);
      expect(block.addresses.get("F")).toBeCloseTo(0.15, 3);
    });

    it("parses block with M-codes", () => {
      const block = LathePostProcessorDialectValidatorEngine.parseGCodeBlock(
        "M03 S1500",
        1
      );
      expect(block.m_codes).toContain("M03");
      expect(block.addresses.get("S")).toBe(1500);
    });

    it("parses block with comment", () => {
      const block = LathePostProcessorDialectValidatorEngine.parseGCodeBlock(
        "G00 X50.0 (RAPID TO SAFE)",
        1
      );
      expect(block.g_codes).toContain("G00");
      expect(block.comment).toBe("RAPID TO SAFE");
    });

    it("parses CSS G96 block", () => {
      const block = LathePostProcessorDialectValidatorEngine.parseGCodeBlock(
        "G96 S180 M03",
        1
      );
      expect(block.g_codes).toContain("G96");
      expect(block.addresses.get("S")).toBe(180);
    });
  });

  describe("parseProgram", () => {
    it("parses multi-line program", () => {
      const content = `%
O1234
N10 G00 X100.0 Z5.0
N20 G96 S180 M03
N30 G01 X50.0 F0.2
M30
%`;
      const blocks = LathePostProcessorDialectValidatorEngine.parseProgram(content);
      expect(blocks.length).toBe(4);
      expect(blocks[0].g_codes).toContain("G00");
      expect(blocks[1].g_codes).toContain("G96");
    });

    it("ignores % and O lines", () => {
      const content = `%
O0001
G00 X10.0
%`;
      const blocks = LathePostProcessorDialectValidatorEngine.parseProgram(content);
      expect(blocks.length).toBe(1);
    });
  });

  describe("detectDialectFeatures", () => {
    it("detects CSS usage with G96", () => {
      const blocks = LathePostProcessorDialectValidatorEngine.parseProgram(
        "G96 S180 M03"
      );
      const features = LathePostProcessorDialectValidatorEngine.detectDialectFeatures(blocks);
      expect(features.css_usage).toBe(true);
    });

    it("detects canned cycles", () => {
      const blocks = LathePostProcessorDialectValidatorEngine.parseProgram(`
G71 U2.0 R1.0
G71 P100 Q200 U0.5 W0.1 F0.25
G70 P100 Q200
`);
      const features = LathePostProcessorDialectValidatorEngine.detectDialectFeatures(blocks);
      expect(features.canned_cycles).toContain("G71");
      expect(features.canned_cycles).toContain("G70");
    });

    it("detects Y-axis usage", () => {
      const blocks = LathePostProcessorDialectValidatorEngine.parseProgram(
        "G01 X25.0 Y5.0 Z-10.0 F0.1"
      );
      const features = LathePostProcessorDialectValidatorEngine.detectDialectFeatures(blocks);
      expect(features.y_axis).toBe(true);
    });

    it("detects C-axis polar mode", () => {
      const blocks = LathePostProcessorDialectValidatorEngine.parseProgram(
        "G12.1\nG01 C45.0 X10.0\nG13.1"
      );
      const features = LathePostProcessorDialectValidatorEngine.detectDialectFeatures(blocks);
      expect(features.c_axis).toBe(true);
    });

    it("detects live tooling M-codes", () => {
      const blocks = LathePostProcessorDialectValidatorEngine.parseProgram(
        "M45 S3000"
      );
      const features = LathePostProcessorDialectValidatorEngine.detectDialectFeatures(blocks);
      expect(features.live_tooling).toBe(true);
    });
  });

  describe("compare", () => {
    it("returns 100% parity for identical programs", () => {
      const program = `G00 X100.0 Z5.0
G96 S180 M03
G01 X50.0 Z0.0 F0.2
G01 Z-25.0
M30`;
      const result = LathePostProcessorDialectValidatorEngine.compare(
        "test.MIN",
        program,
        program
      );
      expect(result.structural_parity_percent).toBe(100);
      expect(result.safety_critical_divergences.length).toBe(0);
    });

    it("detects spindle speed divergence as safety-critical", () => {
      const ref = "G96 S180 M03";
      const gen = "G96 S250 M03";
      const result = LathePostProcessorDialectValidatorEngine.compare(
        "test.MIN",
        ref,
        gen
      );
      expect(result.safety_critical_divergences.length).toBeGreaterThan(0);
      expect(result.safety_critical_divergences[0].category).toBe("spindle");
    });

    it("detects feed rate divergence as safety-critical", () => {
      const ref = "G01 X50.0 F0.15";
      const gen = "G01 X50.0 F0.25";
      const result = LathePostProcessorDialectValidatorEngine.compare(
        "test.MIN",
        ref,
        gen
      );
      expect(result.safety_critical_divergences.length).toBeGreaterThan(0);
    });

    it("ignores minor comment differences", () => {
      const ref = "G01 X50.0 (TURN OD)";
      const gen = "G01 X50.0 (OD TURNING)";
      const result = LathePostProcessorDialectValidatorEngine.compare(
        "test.MIN",
        ref,
        gen
      );
      expect(result.structural_parity_percent).toBe(100);
    });

    it("reports missing blocks", () => {
      const ref = `G00 X100.0
G01 X50.0 F0.2
G01 Z-25.0`;
      const gen = `G00 X100.0
G01 X50.0 F0.2`;
      const result = LathePostProcessorDialectValidatorEngine.compare(
        "test.MIN",
        ref,
        gen
      );
      expect(result.structural_divergences.some(d => d.type === "missing")).toBe(true);
    });

    it("reports extra blocks", () => {
      const ref = "G00 X100.0";
      const gen = `G00 X100.0
G01 X50.0 F0.2`;
      const result = LathePostProcessorDialectValidatorEngine.compare(
        "test.MIN",
        ref,
        gen
      );
      expect(result.structural_divergences.some(d => d.type === "extra")).toBe(true);
    });
  });

  describe("validateBatch", () => {
    it("passes batch when all samples meet criteria", () => {
      const samples = [
        { path: "a.MIN", reference: "G00 X100.0", generated: "G00 X100.0" },
        { path: "b.MIN", reference: "G01 X50.0 F0.2", generated: "G01 X50.0 F0.2" },
      ];
      const report = LathePostProcessorDialectValidatorEngine.validateBatch(samples);
      expect(report.summary.gate_passed).toBe(true);
      expect(report.overall_parity_percent).toBe(100);
    });

    it("fails batch on safety-critical divergence", () => {
      const samples = [
        { path: "a.MIN", reference: "G96 S180 M03", generated: "G96 S500 M03" },
      ];
      const report = LathePostProcessorDialectValidatorEngine.validateBatch(samples);
      expect(report.summary.zero_safety_divergences).toBe(false);
      expect(report.summary.gate_passed).toBe(false);
    });

    it("fails batch when parity below 95%", () => {
      const ref = Array(100).fill("G01 X50.0 F0.2").join("\n");
      const gen = Array(100).fill("G01 X60.0 F0.2").join("\n");
      const samples = [{ path: "a.MIN", reference: ref, generated: gen }];
      const report = LathePostProcessorDialectValidatorEngine.validateBatch(samples);
      expect(report.summary.meets_95_parity).toBe(false);
    });

    it("handles empty batch", () => {
      const report = LathePostProcessorDialectValidatorEngine.validateBatch([]);
      expect(report.total_samples).toBe(0);
      expect(report.overall_parity_percent).toBe(100);
    });
  });
});
