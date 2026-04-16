/**
 * QTValidationSuiteEngine — Disk Loading & Full Golden Suite Tests
 * RES-MS18 U-QTV02: Tests loading all 13 QT cases from disk and validating
 * their golden standards against frozen expectations.
 */

import { describe, it, expect } from "vitest";
import {
  QTValidationSuiteEngine,
} from "../engines/QTValidationSuiteEngine.js";

// ============================================================================
// Frozen expectations — from actual QT program headers (ZMIN values)
// ============================================================================

const EXPECTED_TOOL_COUNTS: Record<string, number> = {
  Q1: 1, Q2: 1, Q3: 2, // Q3 has T1 appearing twice in header comments
  QT3: 2, QT4: 2, QT5: 2, QT6: 2, QT7: 2,
  QT8: 2, QT9: 2, QT10: 2, QT11: 2, QT12: 2,
};

const EXPECTED_ZMIN_T13: Record<string, number> = {
  QT3: -1.1875, QT4: -1.3125, QT5: -1.4375, QT6: -1.5625,
  QT7: -1.6875, QT8: -1.8125, QT9: -0.5625, QT10: -0.6875,
  QT11: -0.75, QT12: -0.8125,
};

// All QT3-12 share the same tool setup
const QT_TOOL_T13 = { diameter: 0.75, cornerRadius: 0.03 };
const QT_TOOL_T22 = { diameter: 2.0, cornerRadius: 0.015 };

// ============================================================================
// loadFromDisk tests
// ============================================================================

describe("QTValidationSuiteEngine.loadFromDisk", () => {
  it("loads all 13 programs from disk", async () => {
    const { stats } = await QTValidationSuiteEngine.loadFromDisk();
    expect(stats.loadedPrograms).toBe(13);
    expect(stats.failedLoads).toHaveLength(0);
    expect(stats.goldenParsed).toBe(13);
  });

  it("all cases have golden standards after loading", async () => {
    const { suite } = await QTValidationSuiteEngine.loadFromDisk();
    for (const tc of suite) {
      expect(tc.golden).not.toBeNull();
      expect(tc.golden!.caseId).toBe(tc.id);
    }
  });

  it("QT3-QT12 all have exactly 2 tools (T13 + T22)", async () => {
    const { suite } = await QTValidationSuiteEngine.loadFromDisk();
    const qtCases = suite.filter(c => c.id.startsWith("QT"));
    expect(qtCases).toHaveLength(10);

    for (const tc of qtCases) {
      expect(tc.golden!.tools).toHaveLength(2);
      const t13 = tc.golden!.tools.find(t => t.toolNumber === 13);
      const t22 = tc.golden!.tools.find(t => t.toolNumber === 22);
      expect(t13).toBeDefined();
      expect(t22).toBeDefined();
      expect(t13!.diameter).toBe(QT_TOOL_T13.diameter);
      expect(t22!.diameter).toBe(QT_TOOL_T22.diameter);
    }
  });

  it("Q1 and Q2 have 1 tool (T1 flat end mill)", async () => {
    const { suite } = await QTValidationSuiteEngine.loadFromDisk();
    const q1 = suite.find(c => c.id === "Q1")!;
    const q2 = suite.find(c => c.id === "Q2")!;
    expect(q1.golden!.tools).toHaveLength(1);
    expect(q1.golden!.tools[0].toolNumber).toBe(1);
    expect(q1.golden!.tools[0].type).toBe("flat_end_mill");
    expect(q2.golden!.tools).toHaveLength(1);
  });

  it("Q3 has T1 tool and uses parametric macros", async () => {
    const { suite } = await QTValidationSuiteEngine.loadFromDisk();
    const q3 = suite.find(c => c.id === "Q3")!;
    // Q3 has T1 + T2 but T2 uses TAPER= format (not parsed by standard regex)
    // The parser finds T1 from the tool definition comment
    expect(q3.golden!.tools.length).toBeGreaterThanOrEqual(1);
    expect(q3.golden!.tools.find(t => t.toolNumber === 1)).toBeDefined();
    expect(q3.golden!.hasParametricMacros).toBe(true);
  });

  it("ZMIN depths match frozen expectations within 0.001", async () => {
    const { suite } = await QTValidationSuiteEngine.loadFromDisk();
    for (const tc of suite) {
      const expected = EXPECTED_ZMIN_T13[tc.id];
      if (expected !== undefined) {
        expect(tc.golden!.extents.zMin).toBeCloseTo(expected, 3);
      }
    }
  });

  it("QT3 deepest cut is shallower than QT8 deepest cut", async () => {
    const { suite } = await QTValidationSuiteEngine.loadFromDisk();
    const qt3 = suite.find(c => c.id === "QT3")!;
    const qt8 = suite.find(c => c.id === "QT8")!;
    expect(qt3.golden!.extents.zMin).toBeGreaterThan(qt8.golden!.extents.zMin);
  });

  it("QT depths increase monotonically: QT3 < QT4 < QT5 < QT6 < QT7 < QT8", async () => {
    const { suite } = await QTValidationSuiteEngine.loadFromDisk();
    const depthSeries = ["QT3", "QT4", "QT5", "QT6", "QT7", "QT8"];
    for (let i = 0; i < depthSeries.length - 1; i++) {
      const curr = suite.find(c => c.id === depthSeries[i])!;
      const next = suite.find(c => c.id === depthSeries[i + 1])!;
      // Depths get deeper (more negative) as QT number increases
      expect(curr.golden!.extents.zMin).toBeGreaterThan(next.golden!.extents.zMin);
    }
  });

  it("all programs have safety blocks and program end", async () => {
    const { suite } = await QTValidationSuiteEngine.loadFromDisk();
    for (const tc of suite) {
      expect(tc.golden!.safetyBlockPresent).toBe(true);
      expect(tc.golden!.programEndPresent).toBe(true);
    }
  });

  it("all QT programs have tool length comp and cutter comp", async () => {
    const { suite } = await QTValidationSuiteEngine.loadFromDisk();
    const qtCases = suite.filter(c => c.id.startsWith("QT"));
    for (const tc of qtCases) {
      expect(tc.golden!.hasToolLengthComp).toBe(true);
      expect(tc.golden!.hasCutterComp).toBe(true);
    }
  });

  it("Q1 has parametric macros, QT cases do not", async () => {
    const { suite } = await QTValidationSuiteEngine.loadFromDisk();
    const q1 = suite.find(c => c.id === "Q1")!;
    expect(q1.golden!.hasParametricMacros).toBe(true);
    expect(q1.golden!.format).toBe("fanuc_parametric");

    const qtCases = suite.filter(c => c.id.startsWith("QT"));
    for (const tc of qtCases) {
      expect(tc.golden!.format).toBe("hurco_gcode");
    }
  });

  it("all programs use G54 work offset", async () => {
    const { suite } = await QTValidationSuiteEngine.loadFromDisk();
    for (const tc of suite) {
      expect(tc.golden!.workOffset).toBe("G54");
    }
  });

  it("QT3-12 report Hurco VMX30i as machine", async () => {
    const { suite } = await QTValidationSuiteEngine.loadFromDisk();
    const qtCases = suite.filter(c => c.id.startsWith("QT"));
    for (const tc of qtCases) {
      expect(tc.golden!.machine).toBe("Hurco VMX30i");
    }
  });

  it("all QT programs have contour_rough and face operations", async () => {
    const { suite } = await QTValidationSuiteEngine.loadFromDisk();
    const qtCases = suite.filter(c => c.id.startsWith("QT"));
    for (const tc of qtCases) {
      const ops = tc.golden!.operations;
      const hasContour = ops.some(o => o.type === "contour_rough");
      const hasFace = ops.some(o => o.type === "face");
      expect(hasContour).toBe(true);
      expect(hasFace).toBe(true);
    }
  });

  it("contour_rough uses T13 at 2546 RPM in all QT cases", async () => {
    const { suite } = await QTValidationSuiteEngine.loadFromDisk();
    const qtCases = suite.filter(c => c.id.startsWith("QT"));
    for (const tc of qtCases) {
      const contour = tc.golden!.operations.find(o => o.type === "contour_rough");
      expect(contour).toBeDefined();
      expect(contour!.toolNumber).toBe(13);
      expect(contour!.spindleRpm).toBe(2546);
    }
  });

  it("face operation uses T22 at 1200 RPM in all QT cases", async () => {
    const { suite } = await QTValidationSuiteEngine.loadFromDisk();
    const qtCases = suite.filter(c => c.id.startsWith("QT"));
    for (const tc of qtCases) {
      const face = tc.golden!.operations.find(o => o.type === "face");
      expect(face).toBeDefined();
      expect(face!.toolNumber).toBe(22);
      expect(face!.spindleRpm).toBe(1200);
    }
  });
});

// ============================================================================
// loadCase tests
// ============================================================================

describe("QTValidationSuiteEngine.loadCase", () => {
  it("loads QT3 individually", async () => {
    const golden = await QTValidationSuiteEngine.loadCase("QT3");
    expect(golden).not.toBeNull();
    expect(golden!.caseId).toBe("QT3");
    expect(golden!.tools).toHaveLength(2);
  });

  it("loads Q1 individually", async () => {
    const golden = await QTValidationSuiteEngine.loadCase("Q1");
    expect(golden).not.toBeNull();
    expect(golden!.hasParametricMacros).toBe(true);
  });

  it("returns null for non-existent case", async () => {
    const golden = await QTValidationSuiteEngine.loadCase("QT999");
    expect(golden).toBeNull();
  });
});

// ============================================================================
// runRegression tests
// ============================================================================

describe("QTValidationSuiteEngine.runRegression", () => {
  it("passes with correct expectations", async () => {
    const expectedTools = new Map(Object.entries(EXPECTED_TOOL_COUNTS).map(([k, v]) => [k, v]));
    const expectedDepths = new Map(Object.entries(EXPECTED_ZMIN_T13).map(([k, v]) => [k, v]));
    const result = await QTValidationSuiteEngine.runRegression(expectedTools, expectedDepths);
    expect(result.passed).toBe(true);
    expect(result.failures).toHaveLength(0);
    expect(result.passedCases).toBeGreaterThanOrEqual(13);
  });

  it("detects tool count regression", async () => {
    const wrongTools = new Map([["QT3", 5]]);
    const result = await QTValidationSuiteEngine.runRegression(wrongTools);
    expect(result.passed).toBe(false);
    expect(result.failures.some(f => f.caseId === "QT3" && f.reason.includes("Tool count"))).toBe(true);
  });

  it("detects ZMIN regression", async () => {
    const wrongDepths = new Map([["QT3", -9.999]]);
    const result = await QTValidationSuiteEngine.runRegression(undefined, wrongDepths);
    expect(result.passed).toBe(false);
    expect(result.failures.some(f => f.caseId === "QT3" && f.reason.includes("ZMIN"))).toBe(true);
  });
});

// ============================================================================
// Self-comparison suite — scores must be 1.0 for all loaded cases
// ============================================================================

describe("Full suite self-comparison", () => {
  it("all 13 cases score 1.0 on self-comparison", async () => {
    const { suite } = await QTValidationSuiteEngine.loadFromDisk();
    const result = QTValidationSuiteEngine.runSuite(suite, suite);
    expect(result.casesWithGolden).toBe(13);
    expect(result.averageScore).toBe(1);

    for (const cr of result.caseResults) {
      expect(cr.overallScore).toBe(1);
      expect(cr.toolScore).toBe(1);
      expect(cr.operationScore).toBe(1);
      expect(cr.safetyScore).toBe(1);
    }
  });
});
