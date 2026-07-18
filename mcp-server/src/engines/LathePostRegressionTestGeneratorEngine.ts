/**
 * LathePostRegressionTestGeneratorEngine — LATHE-MASTER U-LTH19
 *
 * Automatically generates regression tests from sample G-code programs.
 * Captures expected output characteristics to catch post-processor changes
 * that break valid output.
 *
 * Features:
 * - Extracts signature patterns from known-good G-code
 * - Generates vitest test cases
 * - Tracks critical blocks (program start, end, cycles, tool changes)
 * - Supports multiple controller dialects
 *
 * @module LathePostRegressionTestGeneratorEngine
 * @version 1.0.0
 * @milestone LATHE-MASTER U-LTH19
 */

import { z } from "zod";

// ── Schemas ─────────────────────────────────────────────────────────────────

export const PatternTypeSchema = z.enum([
  "program_start",
  "program_end",
  "tool_change",
  "spindle_command",
  "canned_cycle",
  "feedrate",
  "coordinate_move",
  "modal_setup",
  "coolant",
  "comment",
  "custom",
]);

export const ExtractedPatternSchema = z.object({
  type: PatternTypeSchema,
  regex: z.string(),
  description: z.string(),
  line_numbers: z.array(z.number()),
  samples: z.array(z.string()),
  required: z.boolean().default(true),
  order_sensitive: z.boolean().default(false),
});

export const RegressionTestSchema = z.object({
  test_id: z.string(),
  name: z.string(),
  description: z.string(),
  source_file: z.string().optional(),
  controller: z.string(),
  patterns: z.array(ExtractedPatternSchema),
  critical_blocks: z.array(z.string()),
  generated_at: z.string(),
  version: z.string(),
});

export const GeneratorInputSchema = z.object({
  gcode: z.array(z.string()),
  controller: z.string(),
  source_file: z.string().optional(),
  test_name: z.string().optional(),
  include_coordinates: z.boolean().default(false),
  include_comments: z.boolean().default(false),
});

export const GeneratorOutputSchema = z.object({
  success: z.boolean(),
  test: RegressionTestSchema.optional(),
  test_code: z.string().optional(),
  patterns_found: z.number(),
  warnings: z.array(z.string()),
  errors: z.array(z.string()),
});

export type PatternType = z.infer<typeof PatternTypeSchema>;
export type ExtractedPattern = z.infer<typeof ExtractedPatternSchema>;
export type RegressionTest = z.infer<typeof RegressionTestSchema>;
export type GeneratorInput = z.infer<typeof GeneratorInputSchema>;
export type GeneratorOutput = z.infer<typeof GeneratorOutputSchema>;

// ── Pattern Extractors ──────────────────────────────────────────────────────

interface PatternExtractor {
  type: PatternType;
  description: string;
  detect: (line: string) => boolean;
  extract: (line: string) => string;
  required: boolean;
  orderSensitive: boolean;
}

const PATTERN_EXTRACTORS: PatternExtractor[] = [
  {
    type: "program_start",
    description: "Program number declaration",
    detect: (line) => /^[%O]\d+/i.test(line.trim()),
    extract: (line) => line.trim().match(/^([%O]\d+)/i)?.[1] ?? line.trim(),
    required: true,
    orderSensitive: true,
  },
  {
    type: "program_end",
    description: "Program end command",
    detect: (line) => /M30|M02|M99/i.test(line),
    extract: (line) => line.trim().match(/(M30|M02|M99)/i)?.[1] ?? line.trim(),
    required: true,
    orderSensitive: true,
  },
  {
    type: "tool_change",
    description: "Tool change command",
    detect: (line) => /T\d{2,4}/i.test(line),
    extract: (line) => {
      const match = line.match(/T(\d{2,4})/i);
      return match ? `T${match[1]}` : line.trim();
    },
    required: false,
    orderSensitive: true,
  },
  {
    type: "spindle_command",
    description: "Spindle speed and direction",
    detect: (line) => /S\d+\s*(M0[345])?/i.test(line) || /M0[345]/i.test(line),
    extract: (line) => {
      const sMatch = line.match(/S(\d+)/i);
      const mMatch = line.match(/(M0[345])/i);
      return [sMatch?.[0], mMatch?.[1]].filter(Boolean).join(" ");
    },
    required: false,
    orderSensitive: false,
  },
  {
    type: "canned_cycle",
    description: "Canned cycle (G7x, G8x)",
    detect: (line) => /G7[0-6]|G8[0-9]/i.test(line),
    extract: (line) => {
      const match = line.match(/(G7[0-6]|G8[0-9])/i);
      return match?.[1] ?? line.trim();
    },
    required: false,
    orderSensitive: true,
  },
  {
    type: "feedrate",
    description: "Feed rate command",
    detect: (line) => /F[\d.]+/i.test(line),
    extract: (line) => {
      const match = line.match(/(F[\d.]+)/i);
      return match?.[1] ?? "";
    },
    required: false,
    orderSensitive: false,
  },
  {
    type: "coordinate_move",
    description: "Coordinate move (X/Z/Y)",
    detect: (line) => /[XYZ][+-]?[\d.]+/i.test(line),
    extract: (line) => {
      const coords = line.match(/[XYZ][+-]?[\d.]+/gi) ?? [];
      return coords.join(" ");
    },
    required: false,
    orderSensitive: true,
  },
  {
    type: "modal_setup",
    description: "Modal group setup (G00/G01/G02/G03)",
    detect: (line) => /G0[0-3]/i.test(line),
    extract: (line) => {
      const match = line.match(/(G0[0-3])/i);
      return match?.[1] ?? "";
    },
    required: false,
    orderSensitive: false,
  },
  {
    type: "coolant",
    description: "Coolant command",
    detect: (line) => /M0[789]|M09/i.test(line),
    extract: (line) => {
      const match = line.match(/(M0[789]|M09)/i);
      return match?.[1] ?? "";
    },
    required: false,
    orderSensitive: false,
  },
  {
    type: "comment",
    description: "Comment line",
    detect: (line) => /^\s*\(.*\)\s*$|^\s*;/.test(line),
    extract: (line) => line.trim(),
    required: false,
    orderSensitive: false,
  },
];

// ── Engine Implementation ───────────────────────────────────────────────────

export class LathePostRegressionTestGeneratorEngine {
  private static readonly VERSION = "1.0.0";

  /**
   * Generate regression test from G-code sample.
   */
  static generateTest(input: GeneratorInput): GeneratorOutput {
    const warnings: string[] = [];
    const errors: string[] = [];

    if (input.gcode.length === 0) {
      return {
        success: false,
        patterns_found: 0,
        warnings,
        errors: ["Empty G-code input"],
      };
    }

    const patterns = this.extractPatterns(input.gcode, input);
    const criticalBlocks = this.extractCriticalBlocks(input.gcode);

    if (patterns.length === 0) {
      warnings.push("No recognizable patterns found in G-code");
    }

    const hasStart = patterns.some(p => p.type === "program_start");
    const hasEnd = patterns.some(p => p.type === "program_end");

    if (!hasStart) {
      warnings.push("No program start (O-number or %) detected");
    }
    if (!hasEnd) {
      warnings.push("No program end (M30/M02) detected");
    }

    const testId = `regression_${input.controller}_${Date.now()}`;
    const testName = input.test_name ?? `${input.controller} regression test`;

    const test: RegressionTest = {
      test_id: testId,
      name: testName,
      description: `Auto-generated regression test for ${input.controller}`,
      source_file: input.source_file,
      controller: input.controller,
      patterns,
      critical_blocks: criticalBlocks,
      generated_at: new Date().toISOString(),
      version: this.VERSION,
    };

    const testCode = this.generateTestCode(test);

    return {
      success: errors.length === 0,
      test,
      test_code: testCode,
      patterns_found: patterns.length,
      warnings,
      errors,
    };
  }

  /**
   * Extract patterns from G-code.
   */
  private static extractPatterns(
    gcode: string[],
    options: GeneratorInput
  ): ExtractedPattern[] {
    const patternMap = new Map<PatternType, ExtractedPattern>();

    for (let i = 0; i < gcode.length; i++) {
      const line = gcode[i];

      for (const extractor of PATTERN_EXTRACTORS) {
        if (extractor.type === "coordinate_move" && !options.include_coordinates) {
          continue;
        }
        if (extractor.type === "comment" && !options.include_comments) {
          continue;
        }

        if (extractor.detect(line)) {
          const extracted = extractor.extract(line);
          if (!extracted) continue;

          const existing = patternMap.get(extractor.type);
          if (existing) {
            existing.line_numbers.push(i + 1);
            if (!existing.samples.includes(extracted)) {
              existing.samples.push(extracted);
            }
          } else {
            patternMap.set(extractor.type, {
              type: extractor.type,
              regex: this.generateRegex(extractor.type, extracted),
              description: extractor.description,
              line_numbers: [i + 1],
              samples: [extracted],
              required: extractor.required,
              order_sensitive: extractor.orderSensitive,
            });
          }
        }
      }
    }

    return Array.from(patternMap.values());
  }

  /**
   * Generate regex for pattern type.
   */
  private static generateRegex(type: PatternType, sample: string): string {
    switch (type) {
      case "program_start":
        return "^[%O]\\d+";
      case "program_end":
        return "M(30|02|99)";
      case "tool_change":
        return "T\\d{2,4}";
      case "spindle_command":
        return "S\\d+|M0[345]";
      case "canned_cycle":
        return "G7[0-6]|G8[0-9]";
      case "feedrate":
        return "F[\\d.]+";
      case "coordinate_move":
        return "[XYZ][+-]?[\\d.]+";
      case "modal_setup":
        return "G0[0-3]";
      case "coolant":
        return "M0[789]|M09";
      case "comment":
        return "\\(.*\\)|;.*";
      default:
        return sample.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }
  }

  /**
   * Extract critical blocks that must be preserved.
   */
  private static extractCriticalBlocks(gcode: string[]): string[] {
    const critical: string[] = [];

    for (let i = 0; i < gcode.length; i++) {
      const line = gcode[i].trim();
      if (!line || line.startsWith("(") || line.startsWith(";")) continue;

      if (/^[%O]\d+/i.test(line)) {
        critical.push(line);
      }
      if (/G7[0-6]|G76/i.test(line)) {
        critical.push(line);
      }
      if (/M30|M02$/i.test(line)) {
        critical.push(line);
      }
      if (/T\d{2,4}.*M0[36]/i.test(line)) {
        critical.push(line);
      }
    }

    return critical;
  }

  /**
   * Generate vitest test code.
   */
  private static generateTestCode(test: RegressionTest): string {
    const lines: string[] = [];

    lines.push(`/**`);
    lines.push(` * ${test.name}`);
    lines.push(` * Auto-generated regression test`);
    lines.push(` * Controller: ${test.controller}`);
    lines.push(` * Generated: ${test.generated_at}`);
    lines.push(` */`);
    lines.push(``);
    lines.push(`import { describe, it, expect } from "vitest";`);
    lines.push(``);
    lines.push(`describe("${test.name}", () => {`);

    for (const pattern of test.patterns) {
      if (!pattern.required) continue;

      lines.push(`  it("should contain ${pattern.description}", () => {`);
      lines.push(`    const gcode = getGeneratedGCode();`);
      lines.push(`    const pattern = /${pattern.regex}/i;`);
      lines.push(`    const hasPattern = gcode.some(line => pattern.test(line));`);
      lines.push(`    expect(hasPattern).toBe(true);`);
      lines.push(`  });`);
      lines.push(``);
    }

    if (test.critical_blocks.length > 0) {
      lines.push(`  it("should preserve critical blocks", () => {`);
      lines.push(`    const gcode = getGeneratedGCode();`);
      lines.push(`    const gcodeText = gcode.join("\\n");`);
      for (const block of test.critical_blocks.slice(0, 5)) {
        const escaped = block.replace(/"/g, '\\"');
        lines.push(`    expect(gcodeText).toContain("${escaped}");`);
      }
      lines.push(`  });`);
      lines.push(``);
    }

    const orderSensitive = test.patterns.filter(p => p.order_sensitive);
    if (orderSensitive.length >= 2) {
      lines.push(`  it("should maintain correct block order", () => {`);
      lines.push(`    const gcode = getGeneratedGCode();`);

      const startPattern = orderSensitive.find(p => p.type === "program_start");
      const endPattern = orderSensitive.find(p => p.type === "program_end");

      if (startPattern && endPattern) {
        lines.push(`    const startIdx = gcode.findIndex(l => /${startPattern.regex}/i.test(l));`);
        lines.push(`    const endIdx = gcode.findIndex(l => /${endPattern.regex}/i.test(l));`);
        lines.push(`    expect(startIdx).toBeLessThan(endIdx);`);
      }

      lines.push(`  });`);
    }

    lines.push(`});`);
    lines.push(``);
    lines.push(`function getGeneratedGCode(): string[] {`);
    lines.push(`  // Replace with actual post-processor output`);
    lines.push(`  return [];`);
    lines.push(`}`);

    return lines.join("\n");
  }

  /**
   * Generate regression tests from multiple samples.
   */
  static generateTestSuite(
    samples: Array<{ gcode: string[]; controller: string; name: string }>
  ): { tests: RegressionTest[]; combined_code: string } {
    const tests: RegressionTest[] = [];
    const codeBlocks: string[] = [];

    for (const sample of samples) {
      const result = this.generateTest({
        gcode: sample.gcode,
        controller: sample.controller,
        test_name: sample.name,
        include_coordinates: false,
        include_comments: false,
      });

      if (result.success && result.test) {
        tests.push(result.test);
        if (result.test_code) {
          codeBlocks.push(result.test_code);
        }
      }
    }

    return {
      tests,
      combined_code: codeBlocks.join("\n\n"),
    };
  }

  /**
   * Compare G-code against regression test.
   */
  static runRegressionTest(
    gcode: string[],
    test: RegressionTest
  ): { passed: boolean; failures: string[]; warnings: string[] } {
    const failures: string[] = [];
    const warnings: string[] = [];
    const gcodeText = gcode.join("\n");

    for (const pattern of test.patterns) {
      const regex = new RegExp(pattern.regex, "i");
      const found = gcode.some(line => regex.test(line));

      if (pattern.required && !found) {
        failures.push(`Missing required pattern: ${pattern.description} (${pattern.regex})`);
      } else if (!pattern.required && !found) {
        warnings.push(`Optional pattern not found: ${pattern.description}`);
      }
    }

    for (const block of test.critical_blocks) {
      if (!gcodeText.includes(block)) {
        failures.push(`Missing critical block: ${block}`);
      }
    }

    const startPattern = test.patterns.find(p => p.type === "program_start");
    const endPattern = test.patterns.find(p => p.type === "program_end");

    if (startPattern && endPattern) {
      const startIdx = gcode.findIndex(l => new RegExp(startPattern.regex, "i").test(l));
      const endIdx = gcode.findIndex(l => new RegExp(endPattern.regex, "i").test(l));

      if (startIdx >= 0 && endIdx >= 0 && startIdx >= endIdx) {
        failures.push("Program start must come before program end");
      }
    }

    return {
      passed: failures.length === 0,
      failures,
      warnings,
    };
  }

  /**
   * Get engine version.
   */
  static getVersion(): string {
    return this.VERSION;
  }

  /**
   * Get supported pattern types.
   */
  static getPatternTypes(): PatternType[] {
    return PATTERN_EXTRACTORS.map(e => e.type);
  }
}

// Export singleton
export const lathePostRegressionTestGeneratorEngine = LathePostRegressionTestGeneratorEngine;
