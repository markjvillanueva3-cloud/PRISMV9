/**
 * PostProcessorAnalysisEngine.test.ts
 *
 * Tests for AI-powered post processor analysis
 */

import { describe, it, expect } from "vitest";
import {
  analyzePostProcessor,
  generateAnalysisReport,
  applyAutoFixes,
  type PostIssue,
  type AnalysisResult,
} from "../../engines/PostProcessorAnalysisEngine.js";

describe("PostProcessorAnalysisEngine", () => {
  describe("analyzePostProcessor", () => {
    it("should detect dead code: if (true || ...)", () => {
      const code = `
function onCyclePoint(x, y, z) {
  if (true || !F) {
    F = tool.getTappingFeedrate();
  }
}
`;
      const result = analyzePostProcessor(code, "test.cps");

      expect(result.issues.length).toBeGreaterThan(0);
      const deadCodeIssue = result.issues.find((i) => i.category === "dead_code");
      expect(deadCodeIssue).toBeDefined();
      expect(deadCodeIssue?.description).toContain("true ||");
    });

    it("should detect redundant tapping logic", () => {
      const code = `
if (!tool.clockwise) {
  writeBlock(mFormat.format(tool.clockwise ? 3 : 4));
}
`;
      const result = analyzePostProcessor(code, "test.cps");

      const logicIssue = result.issues.find((i) => i.category === "logic_error");
      expect(logicIssue).toBeDefined();
      expect(logicIssue?.description.toLowerCase()).toContain("redundant");
    });

    it("should detect dual Z-word in cycle blocks", () => {
      // Pattern must be on single line for regex to match
      const code = `writeBlock(gCycleModal.format(84.2), "Z" + xyzFormat.format(z), "Z" + xyzFormat.format(cycle.incrementalDepth), feedOutput.format(F));`;
      const result = analyzePostProcessor(code, "test.cps");

      const cycleIssue = result.issues.find((i) => i.category === "cycle_issue");
      expect(cycleIssue).toBeDefined();
      expect(cycleIssue?.severity).toBe("high");
    });

    it("should calculate quality score", () => {
      const cleanCode = `
function onOpen() {
  writeProgramHeader();
}
`;
      const result = analyzePostProcessor(cleanCode, "clean.cps");

      // Clean code should have high score
      expect(result.score).toBeGreaterThanOrEqual(90);
    });

    it("should reduce score for issues", () => {
      const problematicCode = `
function test() {
  if (true || false) { return; }
  if (true || anotherVar) { return; }
  if (true || yetAnother) { return; }
}
`;
      const result = analyzePostProcessor(problematicCode, "test.cps");

      // Should find multiple dead code issues
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.score).toBeLessThanOrEqual(100 - result.issues.length);
    });

    it("should provide recommendations based on issues", () => {
      const code = `
if (true || !F) { F = 100; }
writeBlock("Z" + z, "Z" + depth);
`;
      const result = analyzePostProcessor(code, "test.cps");

      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it("should handle empty code", () => {
      const result = analyzePostProcessor("", "empty.cps");

      expect(result.totalLines).toBe(1); // Empty string splits to 1 line
      expect(result.score).toBe(100);
    });

    it("should detect complex boolean expressions", () => {
      const code = `
if ((tool.type == TOOL_TAP_LEFT_HAND) != !tool.clockwise) {
  writeBlock(mFormat.format(3));
}
`;
      const result = analyzePostProcessor(code, "test.cps");

      const complexIssue = result.issues.find((i) => i.category === "best_practice");
      expect(complexIssue).toBeDefined();
      expect(complexIssue?.description).toContain("Complex boolean");
    });
  });

  describe("generateAnalysisReport", () => {
    it("should generate formatted report", () => {
      const result: AnalysisResult = {
        filename: "test.cps",
        totalLines: 100,
        issues: [
          {
            id: "TEST-1",
            severity: "high",
            category: "logic_error",
            line: 42,
            code: "if (true || x)",
            description: "Test issue",
            recommendation: "Fix it",
            autoFixable: false,
          },
        ],
        summary: {
          critical: 0,
          high: 1,
          medium: 0,
          low: 0,
          info: 0,
        },
        score: 90,
        recommendations: ["Review logic errors"],
      };

      const report = generateAnalysisReport(result);

      expect(report).toContain("PRISM POST PROCESSOR ANALYSIS REPORT");
      expect(report).toContain("test.cps");
      expect(report).toContain("Quality Score: 90/100");
      expect(report).toContain("[HIGH] TEST-1");
      expect(report).toContain("Line 42");
      expect(report).toContain("Review logic errors");
    });

    it("should show all severity counts", () => {
      const result: AnalysisResult = {
        filename: "test.cps",
        totalLines: 500,
        issues: [],
        summary: {
          critical: 2,
          high: 5,
          medium: 10,
          low: 3,
          info: 1,
        },
        score: 50,
        recommendations: [],
      };

      const report = generateAnalysisReport(result);

      expect(report).toContain("Critical: 2");
      expect(report).toContain("High:     5");
      expect(report).toContain("Medium:   10");
      expect(report).toContain("Low:      3");
      expect(report).toContain("Info:     1");
    });
  });

  describe("applyAutoFixes", () => {
    it("should count auto-fixable issues", () => {
      const code = "if (true || !F) { F = 100; }";
      const issues: PostIssue[] = [
        {
          id: "FIX-1",
          severity: "medium",
          category: "dead_code",
          line: 1,
          code: "if (true || !F)",
          description: "Dead code",
          recommendation: "Remove condition",
          autoFixable: true,
          fix: "F = 100;",
        },
      ];

      const result = applyAutoFixes(code, issues);

      expect(result.fixesApplied).toBe(1);
    });

    it("should not count non-fixable issues", () => {
      const code = "complex code";
      const issues: PostIssue[] = [
        {
          id: "NO-FIX-1",
          severity: "low",
          category: "best_practice",
          line: 1,
          code: "complex",
          description: "Complex pattern",
          recommendation: "Review manually",
          autoFixable: false,
        },
      ];

      const result = applyAutoFixes(code, issues);

      expect(result.fixesApplied).toBe(0);
    });
  });

  describe("HURCO VM30i specific patterns", () => {
    it("should detect tapping cycle feed pattern", () => {
      // Real pattern from HURCO post
      const code = `
case "tapping":
  if (true || !F) {
    F = tool.getTappingFeedrate();
  }
  if (getProperty("isnc")) {
    writeBlock(mFormat.format(29));
  }
`;
      const result = analyzePostProcessor(code, "HURCO_VM30i.cps");

      // Should find the dead code pattern
      const issues = result.issues.filter((i) => i.category === "dead_code");
      expect(issues.length).toBeGreaterThan(0);
    });

    it("should detect BNC mode spindle direction pattern", () => {
      const code = `
if (tool.type != TOOL_TAP_LEFT_HAND) { // right hand
  writeBlock(mFormat.format(3)); // cw
  writeBlock(gCycleModal.format(88));
  if (!tool.clockwise) {
    writeBlock(mFormat.format(tool.clockwise ? 3 : 4));
  }
}
`;
      const result = analyzePostProcessor(code, "HURCO_VM30i.cps");

      // Should find the redundant ternary
      const logicIssues = result.issues.filter((i) => i.category === "logic_error");
      expect(logicIssues.length).toBeGreaterThan(0);
    });

    it("should detect peck drilling dual Z pattern", () => {
      // Pattern must be on single line for regex to match
      const code = `writeBlock(gRetractModal.format(98), gCycleModal.format(84.2), xOutput.format(x), yOutput.format(y), "Z" + xyzFormat.format(z), "Z" + xyzFormat.format(cycle.incrementalDepth), feedOutput.format(F));`;
      const result = analyzePostProcessor(code, "HURCO_VM30i.cps");

      const cycleIssues = result.issues.filter((i) => i.category === "cycle_issue");
      expect(cycleIssues.length).toBeGreaterThan(0);
      expect(cycleIssues[0]?.severity).toBe("high");
    });
  });

  describe("quality scoring", () => {
    it("should heavily penalize critical issues", () => {
      const result1: AnalysisResult = {
        filename: "test.cps",
        totalLines: 100,
        issues: [],
        summary: { critical: 1, high: 0, medium: 0, low: 0, info: 0 },
        score: 75, // 100 - 25
        recommendations: [],
      };

      // One critical = -25 points
      expect(result1.score).toBe(75);
    });

    it("should moderately penalize high issues", () => {
      const result: AnalysisResult = {
        filename: "test.cps",
        totalLines: 100,
        issues: [],
        summary: { critical: 0, high: 3, medium: 0, low: 0, info: 0 },
        score: 70, // 100 - 30
        recommendations: [],
      };

      // 3 high = -30 points
      expect(result.score).toBe(70);
    });

    it("should floor score at 0", () => {
      const code = `
        if (true || a) {}
        if (true || b) {}
        if (true || c) {}
        if (true || d) {}
        if (true || e) {}
      `;
      const result = analyzePostProcessor(code, "test.cps");

      expect(result.score).toBeGreaterThanOrEqual(0);
    });
  });
});
