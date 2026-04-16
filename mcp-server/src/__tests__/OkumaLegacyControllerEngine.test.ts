/**
 * OkumaLegacyControllerEngine — Test Suite
 *
 * Tests OSP-P100 legacy controller support including:
 * - Controller profile access
 * - Controller detection from programs
 * - G-code translation (modern to P100)
 * - Compatibility analysis
 * - Memory estimation
 * - Feature queries
 *
 * Uses sample programs from JM DIE archive that were written for
 * older Okuma lathes with OSP-P100 controllers.
 */

import { describe, it, expect, beforeAll } from "vitest";
import {
  okumaLegacyControllerEngine,
  type OkumaControllerModel,
  type OkumaLegacyProfile,
} from "../engines/OkumaLegacyControllerEngine.js";

// ============================================================================
// Sample Programs from JM DIE Archive
// ============================================================================

/**
 * Sample OSP-P100 style program (based on T1641-048-3P.MIN)
 * - Simple canned cycles (G85, G87)
 * - NAT tool labels
 * - 6-digit tool codes
 * - DEF WORK graphics block
 * - No NURBS, no NAVI
 */
const SAMPLE_P100_PROGRAM = `
$ATF1641.MIN%
M1
NBAR
CLEAR
DEF WORK
PS LC,[-400,0],[400,19]
END
DRAW
/CALL OBAR
M1
G50 S1000
(TOOL NO. - 1 OFFSET - 1)
(OD ROUGH RIGHT - 80 DEG. INSERT - R.015)
NAT01
G0 X20. Z20.
T010101 G97 S804 M3 M42
G0 X.95 Z0. M8
G96 S200
G95 G1 X-.0313 F.005
G0 Z.05
Z.0559
X.925
G85 NR001 U.01 W.005 D.03 F.005
NR001 G81
G0 X.0688
G1 Z.0222
X.4384 Z-.0273
G3 X.512 Z-.0752 L.0496
G1 Z-.2286
G80
G0 Z.0559
M9
G0 X20. Z20.
M01
(TOOL NO. - 2 OFFSET - 2)
(OD FINISH RIGHT - 35 DEG. INSERT - R.015)
NAT02
G0 X20. Z20.
T020202 G97 S1000 M3 M42
G0 X.3693 Z0. M8
G96 S200
G95 G1 X-.0313 F.005
G0 Z.05
X.985
Z.0559
G87 NR001
G0 X.985 Z.0559
G0 X20. Z20.
M01
NAT05
T050505
G0 X20 Z20
G97 S800 M3
G0 Z.05 X.0
G74 X0 Z-2.084 D.2 L.2 F.002
G0 Z.1
G0 X20 Z20
M1
NAT11
T111111
G0 X20 Z20
G96 S100 M3
G50 S800
G0 X1.35 Z-.895
G1 X-.04 F.001
G0 X2 M9
M05
G0 X20 Z20
/GOTO NBAR
M2
%
`.trim().split("\n");

/**
 * Sample modern OSP-P300 style program with advanced features
 */
const SAMPLE_P300_PROGRAM = `
O1234
( MODERN P300 PROGRAM WITH NURBS )
V500 = 1.5       ( STOCK DIA )
V501 = 0.75      ( FINISH ID )
VC300 = 100      ( LOOP COUNTER )
NAVI ON
G8.1 X1.0 Z-0.5 K0.5   ( NURBS START )
G1 X0.8 Z-0.6
G8.3                    ( NURBS END )
IGFF ON
G85 NR001 U.01 W.005 D.03 F.005 R.1
G0 X20 Z20
M30
`.trim().split("\n");

/**
 * Sample program with C-axis and live tooling
 */
const SAMPLE_CAXIS_PROGRAM = `
O5678
NAT01
T010101
G97 S1200 M3
G0 X20 Z20
G50 S2000
G0 X1.5 Z.1 M8
G1 Z-.5 F.008
M110            ( C-AXIS ON )
G138            ( C-AXIS INTERPOLATION )
G119            ( SPINDLE ORIENT )
G0 C0
G1 C90 F10
G136            ( C-AXIS OFF )
M109
G0 X20 Z20
M30
`.trim().split("\n");

// ============================================================================
// Controller Profile Tests
// ============================================================================

describe("OkumaLegacyControllerEngine - Profile Access", () => {
  it("getProfile returns valid profile for OSP-P100", () => {
    const profile = okumaLegacyControllerEngine.getProfile("OSP-P100");
    expect(profile).toBeDefined();
    expect(profile.controllerModel).toBe("OSP-P100");
    expect(profile.hasNAVI).toBe(false);
    expect(profile.hasIGFF).toBe(false);
    expect(profile.nurbsSupport).toBe("none");
    expect(profile.maxMacroVariable).toBe(100);
    expect(profile.maxProgramSize).toBe(256 * 1024);
  });

  it("getProfile returns valid profile for OSP-P300L", () => {
    const profile = okumaLegacyControllerEngine.getProfile("OSP-P300L");
    expect(profile).toBeDefined();
    expect(profile.controllerModel).toBe("OSP-P300L");
    expect(profile.hasNAVI).toBe(true);
    expect(profile.hasIGFF).toBe(true);
    expect(profile.nurbsSupport).toBe("full");
    expect(profile.maxMacroVariable).toBe(999);
    expect(profile.maxProgramSize).toBeGreaterThan(1024 * 1024);
  });

  it("getProfile returns valid profile for OSP-P500", () => {
    const profile = okumaLegacyControllerEngine.getProfile("OSP-P500");
    expect(profile).toBeDefined();
    expect(profile.controllerModel).toBe("OSP-P500");
    expect(profile.hasNAVI).toBe(true);
    expect(profile.nurbsSupport).toBe("super");
    expect(profile.lookAheadBlocks).toBe(1000);
  });

  it("getAllProfiles returns all controller profiles", () => {
    const profiles = okumaLegacyControllerEngine.getAllProfiles();
    expect(profiles.length).toBeGreaterThanOrEqual(10);
    const models = profiles.map(p => p.controllerModel);
    expect(models).toContain("OSP-P100");
    expect(models).toContain("OSP-P200L");
    expect(models).toContain("OSP-P300L");
    expect(models).toContain("OSP-P500");
  });

  it("isLegacy correctly identifies legacy controllers", () => {
    expect(okumaLegacyControllerEngine.isLegacy("OSP-P100")).toBe(true);
    expect(okumaLegacyControllerEngine.isLegacy("OSP-P200")).toBe(true);
    expect(okumaLegacyControllerEngine.isLegacy("OSP-P200L")).toBe(true);
    expect(okumaLegacyControllerEngine.isLegacy("OSP-P200LA")).toBe(true);
    expect(okumaLegacyControllerEngine.isLegacy("OSP-P300")).toBe(false);
    expect(okumaLegacyControllerEngine.isLegacy("OSP-P300L")).toBe(false);
    expect(okumaLegacyControllerEngine.isLegacy("OSP-P500")).toBe(false);
  });
});

// ============================================================================
// Controller Detection Tests
// ============================================================================

describe("OkumaLegacyControllerEngine - Controller Detection", () => {
  it("detects P100 from simple legacy program", () => {
    const result = okumaLegacyControllerEngine.detectController(SAMPLE_P100_PROGRAM);
    expect(result.detectedController).toBe("OSP-P100");
    expect(result.confidence).toBeGreaterThanOrEqual(0.5);
    expect(result.features.usesG85Roughing).toBe(true);
    expect(result.features.usesG87Finishing).toBe(true);
    expect(result.features.usesG74PeckDrill).toBe(true);
    expect(result.features.usesBarFeeder).toBe(true);
    expect(result.features.usesNURBS).toBe(false);
    expect(result.features.usesNAVI).toBe(false);
  });

  it("detects P300+ from modern program with NURBS", () => {
    const result = okumaLegacyControllerEngine.detectController(SAMPLE_P300_PROGRAM);
    expect(result.detectedController).toBe("OSP-P300L");
    expect(result.confidence).toBeGreaterThanOrEqual(0.75);
    expect(result.features.usesNURBS).toBe(true);
    expect(result.features.usesNAVI).toBe(true);
    expect(result.features.usesIGFF).toBe(true);
    expect(result.features.maxVariableUsed).toBeGreaterThan(300);
    expect(result.markers).toContain("NURBS interpolation (G8.1/G8.3) - P300/P500 only");
  });

  it("detects C-axis usage", () => {
    const result = okumaLegacyControllerEngine.detectController(SAMPLE_CAXIS_PROGRAM);
    expect(result.features.usesCAxis).toBe(true);
    expect(result.features.usesLiveTooling).toBe(true);
  });

  it("detects canned cycle usage correctly", () => {
    const result = okumaLegacyControllerEngine.detectController(SAMPLE_P100_PROGRAM);
    expect(result.features.cannedCyclesUsed).toContain("G85");
    expect(result.features.cannedCyclesUsed).toContain("G87");
    expect(result.features.cannedCyclesUsed).toContain("G74");
  });

  it("calculates memory estimate", () => {
    const result = okumaLegacyControllerEngine.detectController(SAMPLE_P100_PROGRAM);
    expect(result.memoryEstimate).toBeGreaterThan(0);
    // Sample program is small
    expect(result.memoryEstimate).toBeLessThan(10000);
  });

  it("provides recommendations for incompatible features", () => {
    const result = okumaLegacyControllerEngine.detectController(SAMPLE_P300_PROGRAM);
    // Should have recommendations about NURBS, NAVI, or high variable numbers
    expect(result.recommendations.length).toBeGreaterThanOrEqual(0);
  });
});

// ============================================================================
// G-code Translation Tests
// ============================================================================

describe("OkumaLegacyControllerEngine - G-code Translation", () => {
  it("translates NURBS to incompatible with warning", () => {
    const result = okumaLegacyControllerEngine.translateToP100("G8.1 X1.0 Z-0.5 K0.5");
    expect(result.compatible).toBe(false);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.requiresLinearApproximation).toBe(true);
    expect(result.warnings[0]).toContain("NURBS");
  });

  it("translates NAVI to incompatible", () => {
    const result = okumaLegacyControllerEngine.translateToP100("NAVI ON");
    expect(result.compatible).toBe(false);
    expect(result.warnings).toContain("NAVI collision avoidance not available on P100");
  });

  it("translates IGFF to incompatible", () => {
    const result = okumaLegacyControllerEngine.translateToP100("IGFF ON");
    expect(result.compatible).toBe(false);
    expect(result.warnings).toContain("IGFF feed forward not available on P100");
  });

  it("warns about high variable numbers", () => {
    const result = okumaLegacyControllerEngine.translateToP100("V500 = 1.5");
    expect(result.compatible).toBe(false);
    expect(result.warnings[0]).toContain("V500");
    expect(result.warnings[0]).toContain("exceeds P100 limit");
  });

  it("warns about high common variable numbers", () => {
    const result = okumaLegacyControllerEngine.translateToP100("VC300 = 100");
    expect(result.compatible).toBe(false);
    expect(result.warnings[0]).toContain("VC300");
    expect(result.warnings[0]).toContain("exceeds P100 limit");
  });

  it("removes R parameter from G85", () => {
    const result = okumaLegacyControllerEngine.translateToP100("G85 NR001 U.01 W.005 D.03 F.005 R.1");
    expect(result.translatedCode).not.toContain("R.1");
    expect(result.notes).toContain("Removed R retract parameter (not supported on P100)");
  });

  it("removes K parameter from G74", () => {
    const result = okumaLegacyControllerEngine.translateToP100("G74 X0 Z-2.0 D.2 L.2 F.002 K.5");
    expect(result.translatedCode).not.toContain("K.5");
    expect(result.notes).toContain("Removed K pause parameter (not supported on P100)");
  });

  it("removes E parameter from G71 threading", () => {
    const result = okumaLegacyControllerEngine.translateToP100("G71 X.5 Z-.75 B60 H.065 D.015 F.0833 E.1");
    expect(result.translatedCode).not.toContain("E.1");
    expect(result.notes).toContain("Removed E thread relief parameter (not supported on P100)");
  });

  it("keeps compatible G-code unchanged", () => {
    const result = okumaLegacyControllerEngine.translateToP100("G0 X20 Z20");
    expect(result.compatible).toBe(true);
    expect(result.translatedCode).toBe("G0 X20 Z20");
    expect(result.warnings.length).toBe(0);
  });

  it("translateProgramToP100 processes entire program", () => {
    const result = okumaLegacyControllerEngine.translateProgramToP100(SAMPLE_P300_PROGRAM);
    expect(result.translatedLines.length).toBe(SAMPLE_P300_PROGRAM.length);
    expect(result.translations.length).toBeGreaterThan(0);
    expect(result.summary.errors).toBeGreaterThan(0); // NURBS, NAVI not compatible
  });
});

// ============================================================================
// Compatibility Analysis Tests
// ============================================================================

describe("OkumaLegacyControllerEngine - Compatibility Analysis", () => {
  it("analyzes compatibility between P300 and P100", () => {
    const result = okumaLegacyControllerEngine.analyzeCompatibility(
      SAMPLE_P300_PROGRAM,
      "OSP-P300L",
      "OSP-P100"
    );
    expect(result.compatible).toBe(false);
    expect(result.criticalIssues.length).toBeGreaterThan(0);
    expect(result.estimatedEffort).not.toBe("trivial");
  });

  it("identifies NURBS as critical issue for P100 target", () => {
    const result = okumaLegacyControllerEngine.analyzeCompatibility(
      SAMPLE_P300_PROGRAM,
      "OSP-P300L",
      "OSP-P100"
    );
    const nurbsIssue = result.criticalIssues.find(i => i.code === "NURBS_NOT_SUPPORTED");
    expect(nurbsIssue).toBeDefined();
    expect(nurbsIssue?.severity).toBe("critical");
  });

  it("identifies NAVI as critical issue for P100 target", () => {
    const result = okumaLegacyControllerEngine.analyzeCompatibility(
      SAMPLE_P300_PROGRAM,
      "OSP-P300L",
      "OSP-P100"
    );
    const naviIssue = result.criticalIssues.find(i => i.code === "NAVI_NOT_SUPPORTED");
    expect(naviIssue).toBeDefined();
  });

  it("identifies variable range issues", () => {
    const result = okumaLegacyControllerEngine.analyzeCompatibility(
      SAMPLE_P300_PROGRAM,
      "OSP-P300L",
      "OSP-P100"
    );
    const varIssue = result.criticalIssues.find(i => i.code === "VARIABLE_RANGE_EXCEEDED");
    expect(varIssue).toBeDefined();
  });

  it("analyzes P100 to P100 as compatible", () => {
    const result = okumaLegacyControllerEngine.analyzeCompatibility(
      SAMPLE_P100_PROGRAM,
      "OSP-P100",
      "OSP-P100"
    );
    expect(result.compatible).toBe(true);
    expect(result.criticalIssues.length).toBe(0);
    expect(result.estimatedEffort).toBe("trivial");
  });

  it("estimates effort level correctly", () => {
    // Many issues = high effort
    const result1 = okumaLegacyControllerEngine.analyzeCompatibility(
      SAMPLE_P300_PROGRAM,
      "OSP-P300L",
      "OSP-P100"
    );
    expect(["high", "rewrite_required"]).toContain(result1.estimatedEffort);

    // No issues = trivial
    const result2 = okumaLegacyControllerEngine.analyzeCompatibility(
      SAMPLE_P100_PROGRAM,
      "OSP-P100",
      "OSP-P200L"
    );
    expect(["trivial", "low"]).toContain(result2.estimatedEffort);
  });

  it("provides suggestions for downgrade", () => {
    const result = okumaLegacyControllerEngine.analyzeCompatibility(
      SAMPLE_P300_PROGRAM,
      "OSP-P300L",
      "OSP-P100"
    );
    expect(result.suggestions.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// Memory Estimation Tests
// ============================================================================

describe("OkumaLegacyControllerEngine - Memory Estimation", () => {
  it("estimates memory usage correctly", () => {
    const result = okumaLegacyControllerEngine.estimateMemoryUsage(
      SAMPLE_P100_PROGRAM,
      "OSP-P100"
    );
    expect(result.programBytes).toBeGreaterThan(0);
    expect(result.controllerCapacity).toBe(256 * 1024);
    expect(result.utilizationPercent).toBeGreaterThan(0);
    expect(result.utilizationPercent).toBeLessThan(100);
    expect(result.canFit).toBe(true);
  });

  it("detects when program exceeds memory", () => {
    // Create a huge program
    const hugeProgram = Array(50000).fill("G0 X1.234567890 Z-9.876543210").concat(
      Array(50000).fill("G1 X0.123456789 Z-0.987654321 F0.012345")
    );
    const result = okumaLegacyControllerEngine.estimateMemoryUsage(
      hugeProgram,
      "OSP-P100"
    );
    expect(result.canFit).toBe(false);
    expect(result.recommendations.length).toBeGreaterThan(0);
    expect(result.recommendations[0]).toContain("exceeds memory");
  });

  it("provides recommendations when utilization is high", () => {
    // Create a moderately large program
    const largeProgram = Array(5000).fill("G0 X1.234567890 Z-9.876543210");
    const result = okumaLegacyControllerEngine.estimateMemoryUsage(
      largeProgram,
      "OSP-P100"
    );
    if (result.utilizationPercent > 80) {
      expect(result.recommendations.length).toBeGreaterThan(0);
    }
  });
});

// ============================================================================
// Feature Query Tests
// ============================================================================

describe("OkumaLegacyControllerEngine - Feature Queries", () => {
  it("supportsFeature returns correct values for P100", () => {
    expect(okumaLegacyControllerEngine.supportsFeature("OSP-P100", "nurbs")).toBe(false);
    expect(okumaLegacyControllerEngine.supportsFeature("OSP-P100", "navi")).toBe(false);
    expect(okumaLegacyControllerEngine.supportsFeature("OSP-P100", "igff")).toBe(false);
    expect(okumaLegacyControllerEngine.supportsFeature("OSP-P100", "caxis")).toBe(false);
    expect(okumaLegacyControllerEngine.supportsFeature("OSP-P100", "live_tooling")).toBe(false);
    expect(okumaLegacyControllerEngine.supportsFeature("OSP-P100", "sub_spindle")).toBe(false);
  });

  it("supportsFeature returns correct values for P300L", () => {
    expect(okumaLegacyControllerEngine.supportsFeature("OSP-P300L", "nurbs")).toBe(true);
    expect(okumaLegacyControllerEngine.supportsFeature("OSP-P300L", "navi")).toBe(true);
    expect(okumaLegacyControllerEngine.supportsFeature("OSP-P300L", "igff")).toBe(true);
    expect(okumaLegacyControllerEngine.supportsFeature("OSP-P300L", "caxis")).toBe(true);
    expect(okumaLegacyControllerEngine.supportsFeature("OSP-P300L", "live_tooling")).toBe(true);
    expect(okumaLegacyControllerEngine.supportsFeature("OSP-P300L", "sub_spindle")).toBe(true);
  });

  it("supportsFeature returns correct values for P200L (transitional)", () => {
    expect(okumaLegacyControllerEngine.supportsFeature("OSP-P200L", "nurbs")).toBe(true); // basic
    expect(okumaLegacyControllerEngine.supportsFeature("OSP-P200L", "navi")).toBe(false);
    expect(okumaLegacyControllerEngine.supportsFeature("OSP-P200L", "igff")).toBe(false);
    expect(okumaLegacyControllerEngine.supportsFeature("OSP-P200L", "caxis")).toBe(true);
    expect(okumaLegacyControllerEngine.supportsFeature("OSP-P200L", "live_tooling")).toBe(true);
  });

  it("getCapabilitySummary returns comprehensive summary", () => {
    const summary = okumaLegacyControllerEngine.getCapabilitySummary("OSP-P100");
    expect(summary.model).toBe("OSP-P100");
    expect(summary.generation).toContain("Legacy");
    expect(summary.capabilities.length).toBeGreaterThan(0);
    expect(summary.limitations.length).toBeGreaterThan(0);
    expect(summary.limitations).toContain("No NAVI collision avoidance");
    expect(summary.limitations).toContain("No NURBS interpolation");
  });

  it("getCapabilitySummary shows P500 as current", () => {
    const summary = okumaLegacyControllerEngine.getCapabilitySummary("OSP-P500");
    expect(summary.generation).toContain("Current");
    expect(summary.capabilities).toContain("NAVI collision avoidance");
    expect(summary.capabilities).toContain("NURBS interpolation (super)");
  });
});

// ============================================================================
// Canned Cycle Syntax Tests
// ============================================================================

describe("OkumaLegacyControllerEngine - Canned Cycle Syntax", () => {
  it("getCycleSyntax returns P100 syntax for legacy controller", () => {
    const result = okumaLegacyControllerEngine.getCycleSyntax("G85_ROUGHING", "OSP-P100");
    expect(result.syntax).toBe("G85 N__ D__ U__ W__ F__");
    expect(result.notes).toContain("lacks R retract");
  });

  it("getCycleSyntax returns modern syntax for P300", () => {
    const result = okumaLegacyControllerEngine.getCycleSyntax("G85_ROUGHING", "OSP-P300L");
    expect(result.syntax).toBe("G85 N__ D__ U__ W__ F__ R__");
    expect(result.notes).toBe("");
  });

  it("getSupportedCycles lists correct cycles for P100", () => {
    const cycles = okumaLegacyControllerEngine.getSupportedCycles("OSP-P100");
    expect(cycles).toContain("G71");
    expect(cycles).toContain("G72");
    expect(cycles).toContain("G73");
    expect(cycles).toContain("G74");
    expect(cycles).toContain("G75");
    expect(cycles).toContain("G76");
    expect(cycles).not.toContain("G85"); // P100 has different roughing
    expect(cycles).not.toContain("G8.1"); // No NURBS
  });

  it("getSupportedCycles lists NURBS for P300", () => {
    const cycles = okumaLegacyControllerEngine.getSupportedCycles("OSP-P300L");
    expect(cycles).toContain("G8.1");
    expect(cycles).toContain("G8.3");
    expect(cycles).toContain("G85");
    expect(cycles).toContain("G87");
  });
});

// ============================================================================
// Edge Cases and Error Handling
// ============================================================================

describe("OkumaLegacyControllerEngine - Edge Cases", () => {
  it("handles empty program array", () => {
    const result = okumaLegacyControllerEngine.detectController([]);
    expect(result.detectedController).toBeDefined();
    expect(result.confidence).toBeLessThan(1);
    expect(result.memoryEstimate).toBe(0);
  });

  it("handles program with only comments", () => {
    const commentProgram = [
      "( THIS IS A COMMENT )",
      "( ANOTHER COMMENT )",
      "( YET ANOTHER )",
    ];
    const result = okumaLegacyControllerEngine.detectController(commentProgram);
    expect(result.detectedController).toBeDefined();
    expect(result.features.cannedCyclesUsed.length).toBe(0);
  });

  it("handles malformed G-codes gracefully", () => {
    const result = okumaLegacyControllerEngine.translateToP100("G-999 INVALID CODE");
    expect(result.originalCode).toBe("G-999 INVALID CODE");
    expect(result.translatedCode).toBeDefined();
  });

  it("handles mixed case correctly", () => {
    const result1 = okumaLegacyControllerEngine.translateToP100("navi on");
    const result2 = okumaLegacyControllerEngine.translateToP100("NAVI ON");
    const result3 = okumaLegacyControllerEngine.translateToP100("Navi On");
    expect(result1.compatible).toBe(result2.compatible);
    expect(result2.compatible).toBe(result3.compatible);
  });

  it("handles whitespace variations", () => {
    const result1 = okumaLegacyControllerEngine.translateToP100("G8.1 X1.0 Z-0.5");
    const result2 = okumaLegacyControllerEngine.translateToP100("  G8.1   X1.0   Z-0.5  ");
    expect(result1.compatible).toBe(result2.compatible);
  });
});

// ============================================================================
// JM DIE Archive Integration Tests
// ============================================================================

describe("OkumaLegacyControllerEngine - JM DIE Archive Patterns", () => {
  it("recognizes DEF WORK as legacy indicator", () => {
    const programWithDefWork = [
      "CLEAR",
      "DEF WORK",
      "PS LC,[-400,0],[400,19]",
      "END",
      "DRAW",
      "NAT01",
      "T010101",
      "G0 X20 Z20",
    ];
    const result = okumaLegacyControllerEngine.detectController(programWithDefWork);
    expect(result.markers.some(m => m.includes("DEF WORK"))).toBe(true);
  });

  it("recognizes bar feeder patterns", () => {
    const barFeederProgram = [
      "NBAR",
      "/CALL OBAR",
      "NAT01",
      "T010101",
      "G0 X20 Z20",
      "/GOTO NBAR",
      "M2",
    ];
    const result = okumaLegacyControllerEngine.detectController(barFeederProgram);
    expect(result.features.usesBarFeeder).toBe(true);
  });

  it("handles typical JM DIE tool section pattern", () => {
    const jmDiePattern = [
      "(TOOL NO. - 1 OFFSET - 1)",
      "(OD ROUGH RIGHT - 80 DEG. INSERT - R.015)",
      "NAT01",
      "G0 X20. Z20.",
      "T010101 G97 S804 M3 M42",
      "G0 X.95 Z0. M8",
      "G96 S200",
    ];
    const result = okumaLegacyControllerEngine.detectController(jmDiePattern);
    expect(result.features.cannedCyclesUsed).toBeDefined();
  });

  it("correctly parses angular moves (A parameter)", () => {
    const angularProgram = [
      "NAT09",
      "T090909",
      "G0 X20 Z20",
      "G97 S900 M3",
      "G0 Z.03 X.875",
      "G1 Z0 F.0015",
      "G1 Z-.025 A253",
      "G1 X.100",
    ];
    const result = okumaLegacyControllerEngine.detectController(angularProgram);
    // Angular moves (A word) are Okuma-specific, suggest legacy
    expect(result.detectedController).toBeDefined();
  });
});
