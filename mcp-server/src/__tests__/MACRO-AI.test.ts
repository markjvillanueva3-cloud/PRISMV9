/**
 * MACRO-AI.test.ts — MacroProgramIntelligenceEngine Test Suite
 *
 * 42 tests across 6 describe blocks verifying:
 *   1. parseOkumaMacro  — AST structure, variable extraction, safety checks
 *   2. generateMacro    — Pattern matching, code output, controller selection
 *   3. optimizeMacro    — Suggestion detection, issue identification
 *   4. translateMacro   — Okuma→Fanuc dialect translation rules
 *   5. debugMacro       — Error pattern matching and fix suggestions
 *   6. explainMacro     — Annotation accuracy, pattern detection, tribal tips
 *
 * All tests use REAL Okuma OSP code fragments derived from:
 *   - CASING_MACRO.MIN  (JM Die production macro)
 *   - CBORE_CASING_MACRO.MIN (JM Die production macro)
 */

import { describe, it, expect } from "vitest";
import {
  MacroProgramIntelligenceEngine,
  type MacroAST,
  type MacroGenerationResult,
  type MacroOptimizationResult,
  type MacroTranslationResult,
  type MacroDebugResult,
  type MacroExplanation,
} from "../engines/MacroProgramIntelligenceEngine.js";

// ============================================================================
// SHARED FIXTURES — real Okuma OSP code fragments
// ============================================================================

/** Minimal valid casing macro derived from CASING_MACRO.MIN. */
const MINIMAL_CASING_MACRO = `O1001
(T010101 - FACE/OD ROUGH)
(T020202 - FACE/OD FINISH)
(T030303 - SPOT DRILL)
(T050505 - DRILL 1)
(T111111 - CUTOFF)

(========== STOCK AND MODEL ==========)
V1 = 1.905           (STOCK DIAMETER)
V2 = 1.755           (FINISH OD)
V3 = 0.59375         (DRILL SIZE)
V4 = 0.618           (FINISH ID)
V5 = 2.015           (PART LENGTH)
V100 = 0.015         (STOCK FACE OFFSET)

(========== OD CHAMFER ==========)
V6 = 0.04            (CHAMFER Z DEPTH)
V7 = 1               (1=CHAMFER, 2=RADIUS)
V8 = 45              (CHAMFER ANGLE)

(========== DRILL PARAMETERS ==========)
V25 = 0.59375        (DRILL 1 DIAMETER)
V26 = 95             (DRILL 1 SFM)
V27 = 0.005          (DRILL 1 FEED)
V29 = 130            (DRILL 1 POINT ANGLE)
V30 = 0              (DRILL 1 PECK: 0=NO, 1=YES)

(========== AUTO-CALCULATIONS ==========)
V71 = [V26 * 3.82] / V25   (DRILL 1 RPM)
V72 = V25 / 2 / TAN[V29 / 2]  (DRILL 1 POINT DEPTH)
V74 = -V72                 (DRILL 1 Z DEPTH)
V84 = 180 - V8             (OD CHAMFER ANGLE FOR OKUMA)
V87 = [V45 * 3.82] / V1   (OD ROUGH INITIAL RPM)

(PROGRAM START)
G50 S2500
G0 X20. Z20.
N1 T010101
M8
G97 S[V87] M3
G0 Z0.045
X[V1]
G96 S755 M3
G41 X[V1] Z0.015 F0.008
X0.
G40 X0.031 Z0.045
G80
M9
G0 X20.
Z20.
M1

N2 T030303
M8
G97 S1518 M3
G0 Z0.545
X0.
G1 Z-0.085 F0.002
G0 Z0.545
M5
M9
G0 X20.
Z20.
M1
M30
`;

/** Macro with deliberate issues for optimization tests. */
const PROBLEMATIC_MACRO = `O2001
(T010101 - OD ROUGH)
V1 = 2.0             (STOCK DIAMETER)
V2 = 1.75            (FINISH OD)
V45 = 700            (OD ROUGH SFM)
V99 = 0.031          (DECLARED BUT NEVER USED)

(NO G50 — INTENTIONALLY MISSING)
G0 X20. Z20.
N1 T010101
M8
G97 S1334 M3
G0 Z0.045
G96 S700 M3
G96 S700 M3
X[V1]
G1 Z-2.0 F0.012
G0 X20. Z20.
G0 X20. Z20.
M5
(NO M9)
(NO G40)
M30
`;

/** Okuma code for translation test. */
const OKUMA_TRANSLATION_CODE = `O3001
V1 = 1.5             (STOCK DIAMETER)
V87 = [V45 * 3.82] / V1   (OD ROUGH RPM)
G50 S2500
N1 T010101
G97 S[V87] M3
G74 X0. Z-2.0 I0.13 D2.1 F0.005
G180
M30
`;

/** Macro with undefined GOTO target. */
const MACRO_BAD_GOTO = `O4001
V1 = 1.0
IF [V1 GT 2.0] GOTO NBIG
G1 Z-1.0 F0.01
(NBIG is never defined)
M30
`;

/** Macro with bracket syntax errors. */
const MACRO_SYNTAX_ERROR = `O5001
V1 = 1.905
V87 = [V45 * 3.82 / V1   (MISSING CLOSING BRACKET)
G50 S2500
M30
`;

// ============================================================================
// 1. parseOkumaMacro
// ============================================================================

describe("MacroProgramIntelligenceEngine.parseOkumaMacro", () => {
  it("returns a MacroAST with correct program number", () => {
    const ast = MacroProgramIntelligenceEngine.parseOkumaMacro(MINIMAL_CASING_MACRO);
    expect(ast.programNumber).toBe("O1001");
  });

  it("extracts all tool definitions from header comments", () => {
    const ast = MacroProgramIntelligenceEngine.parseOkumaMacro(MINIMAL_CASING_MACRO);
    expect(ast.toolDefinitions.length).toBeGreaterThanOrEqual(3);
    const codes = ast.toolDefinitions.map(t => t.toolCode);
    expect(codes).toContain("T010101");
    expect(codes).toContain("T020202");
    expect(codes).toContain("T111111");
  });

  it("extracts V-variable assignments with initial values", () => {
    const ast = MacroProgramIntelligenceEngine.parseOkumaMacro(MINIMAL_CASING_MACRO);
    expect(ast.variables["V1"]).toBeDefined();
    expect(ast.variables["V1"].initialValue).toBe(1.905);
    expect(ast.variables["V2"].initialValue).toBe(1.755);
    expect(ast.variables["V5"].initialValue).toBe(2.015);
  });

  it("classifies geometry variables by number range", () => {
    const ast = MacroProgramIntelligenceEngine.parseOkumaMacro(MINIMAL_CASING_MACRO);
    expect(ast.variables["V1"].category).toBe("geometry");
    expect(ast.variables["V4"].category).toBe("geometry");
  });

  it("classifies drill param variables V20-V34", () => {
    const ast = MacroProgramIntelligenceEngine.parseOkumaMacro(MINIMAL_CASING_MACRO);
    expect(ast.variables["V25"].category).toBe("drill_params");
    expect(ast.variables["V26"].category).toBe("drill_params");
    expect(ast.variables["V29"].category).toBe("drill_params");
  });

  it("identifies auto-calculations with formula field set", () => {
    const ast = MacroProgramIntelligenceEngine.parseOkumaMacro(MINIMAL_CASING_MACRO);
    expect(ast.variables["V71"].formula).toBeDefined();
    expect(ast.variables["V71"].formula).toContain("3.82");
    expect(ast.variables["V71"].category).toBe("calculated");
  });

  it("extracts autoCalcs with dependsOn list", () => {
    const ast = MacroProgramIntelligenceEngine.parseOkumaMacro(MINIMAL_CASING_MACRO);
    const v71calc = ast.autoCalcs.find(c => c.variable === "V71");
    expect(v71calc).toBeDefined();
    expect(v71calc!.dependsOn).toContain("V26");
    expect(v71calc!.dependsOn).toContain("V25");
  });

  it("extracts comment text into variable.comment", () => {
    const ast = MacroProgramIntelligenceEngine.parseOkumaMacro(MINIMAL_CASING_MACRO);
    expect(ast.variables["V1"].comment).toContain("STOCK DIAMETER");
    expect(ast.variables["V26"].comment).toContain("SFM");
  });

  it("detects G50 speed clamp for safety check", () => {
    const ast = MacroProgramIntelligenceEngine.parseOkumaMacro(MINIMAL_CASING_MACRO);
    expect(ast.safetyChecks.hasG50SpeedClamp).toBe(true);
  });

  it("detects G40 comp cancel for safety check", () => {
    const ast = MacroProgramIntelligenceEngine.parseOkumaMacro(MINIMAL_CASING_MACRO);
    expect(ast.safetyChecks.hasG40CompCancel).toBe(true);
  });

  it("detects M9 coolant off for safety check", () => {
    const ast = MacroProgramIntelligenceEngine.parseOkumaMacro(MINIMAL_CASING_MACRO);
    expect(ast.safetyChecks.hasCoolantOff).toBe(true);
  });

  it("detects X20/Z20 safe retract", () => {
    const ast = MacroProgramIntelligenceEngine.parseOkumaMacro(MINIMAL_CASING_MACRO);
    expect(ast.safetyChecks.hasRetractToSafePos).toBe(true);
  });

  it("reports no safety issues for a clean macro", () => {
    const ast = MacroProgramIntelligenceEngine.parseOkumaMacro(MINIMAL_CASING_MACRO);
    expect(ast.safetyChecks.issues).toHaveLength(0);
  });

  it("correctly sets controller field", () => {
    const ast = MacroProgramIntelligenceEngine.parseOkumaMacro(MINIMAL_CASING_MACRO, "okuma_osp");
    expect(ast.controller).toBe("okuma_osp");
  });

  it("reports total line count", () => {
    const ast = MacroProgramIntelligenceEngine.parseOkumaMacro(MINIMAL_CASING_MACRO);
    expect(ast.lineCount).toBeGreaterThan(30);
  });
});

// ============================================================================
// 2. generateMacro
// ============================================================================

describe("MacroProgramIntelligenceEngine.generateMacro", () => {
  it("matches casing turning from description", () => {
    const result = MacroProgramIntelligenceEngine.generateMacro(
      "casing turning with OD and ID bore and cutoff",
      "okuma_osp",
    );
    expect(result.success).toBe(true);
    expect(result.patternUsed).toBe("casing_turning");
  });

  it("matches counterbore from description keywords", () => {
    const result = MacroProgramIntelligenceEngine.generateMacro(
      "counterbore casing with pilot drill and 180 degree flat bottom drill",
      "okuma_osp",
    );
    expect(result.success).toBe(true);
    expect(result.patternUsed).toBe("counterbore_casing");
  });

  it("returns non-empty code string", () => {
    const result = MacroProgramIntelligenceEngine.generateMacro("casing turning", "okuma_osp");
    expect(result.code.length).toBeGreaterThan(200);
    expect(result.code).toContain("V1 =");
  });

  it("includes variable guide with adjustable entries", () => {
    const result = MacroProgramIntelligenceEngine.generateMacro("casing turning", "okuma_osp");
    expect(result.variableGuide.length).toBeGreaterThan(5);
    const v1entry = result.variableGuide.find(g => g.variable === "V1");
    expect(v1entry).toBeDefined();
    expect(v1entry!.adjustable).toBe(true);
  });

  it("auto-calc variable guide entries are not adjustable", () => {
    const result = MacroProgramIntelligenceEngine.generateMacro("casing turning", "okuma_osp");
    const calcEntry = result.variableGuide.find(g => g.variable === "V70" || g.variable === "V87");
    if (calcEntry) {
      expect(calcEntry.adjustable).toBe(false);
    }
  });

  it("includes operation sequence", () => {
    const result = MacroProgramIntelligenceEngine.generateMacro("casing turning od id cutoff", "okuma_osp");
    expect(result.operationSequence.length).toBeGreaterThan(2);
  });

  it("applies geometry overrides to generated code", () => {
    const result = MacroProgramIntelligenceEngine.generateMacro(
      "casing turning",
      "okuma_osp",
      { partGeometry: { stockDiameter: 3.25, finishOD: 3.0 } },
    );
    expect(result.code).toContain("V1 = 3.2500");
    expect(result.code).toContain("V2 = 3.0000");
  });

  it("returns confidence > 0.5 for matched patterns", () => {
    const result = MacroProgramIntelligenceEngine.generateMacro("casing turning od rough id bore cutoff", "okuma_osp");
    expect(result.confidence).toBeGreaterThan(0.5);
  });

  it("generates translated Fanuc code when controller=fanuc", () => {
    const result = MacroProgramIntelligenceEngine.generateMacro("casing turning", "fanuc");
    // V-variables should be translated to # syntax
    expect(result.code).toContain("#1 =");
  });

  it("includes notes about grounding source file", () => {
    const result = MacroProgramIntelligenceEngine.generateMacro("casing turning", "okuma_osp");
    expect(result.notes.some(n => n.includes("CASING_MACRO"))).toBe(true);
  });
});

// ============================================================================
// 3. optimizeMacro
// ============================================================================

describe("MacroProgramIntelligenceEngine.optimizeMacro", () => {
  it("returns correct original line count", () => {
    const result = MacroProgramIntelligenceEngine.optimizeMacro(PROBLEMATIC_MACRO);
    const expectedLines = PROBLEMATIC_MACRO.split("\n").length;
    expect(result.originalLineCount).toBe(expectedLines);
  });

  it("detects missing G50 speed clamp as critical", () => {
    const result = MacroProgramIntelligenceEngine.optimizeMacro(PROBLEMATIC_MACRO);
    const speedIssue = result.suggestions.find(s => s.type === "missing_speed_clamp");
    expect(speedIssue).toBeDefined();
    expect(speedIssue!.severity).toBe("critical");
  });

  it("detects missing G40 comp cancel as critical", () => {
    const result = MacroProgramIntelligenceEngine.optimizeMacro(PROBLEMATIC_MACRO);
    const compIssue = result.suggestions.find(s => s.type === "missing_comp_cancel");
    expect(compIssue).toBeDefined();
    expect(compIssue!.severity).toBe("critical");
  });

  it("detects missing M9 coolant off as warning", () => {
    const result = MacroProgramIntelligenceEngine.optimizeMacro(PROBLEMATIC_MACRO);
    const coolantIssue = result.suggestions.find(s => s.type === "missing_coolant_off");
    expect(coolantIssue).toBeDefined();
    expect(coolantIssue!.severity).toBe("warning");
  });

  it("detects redundant G96 mode switches", () => {
    const result = MacroProgramIntelligenceEngine.optimizeMacro(PROBLEMATIC_MACRO);
    const modeIssue = result.suggestions.find(s => s.type === "redundant_mode_switch");
    expect(modeIssue).toBeDefined();
  });

  it("detects consecutive double retracts", () => {
    const result = MacroProgramIntelligenceEngine.optimizeMacro(PROBLEMATIC_MACRO);
    const retractIssue = result.suggestions.find(s => s.type === "redundant_retract");
    expect(retractIssue).toBeDefined();
  });

  it("returns no critical issues for a clean macro", () => {
    const result = MacroProgramIntelligenceEngine.optimizeMacro(MINIMAL_CASING_MACRO);
    const criticals = result.suggestions.filter(s => s.severity === "critical");
    expect(criticals).toHaveLength(0);
  });

  it("preserves original code (no auto-modification)", () => {
    const result = MacroProgramIntelligenceEngine.optimizeMacro(MINIMAL_CASING_MACRO);
    expect(result.optimizedCode).toBe(MINIMAL_CASING_MACRO);
    expect(result.totalSuggestionsApplied).toBe(0);
  });
});

// ============================================================================
// 4. translateMacro
// ============================================================================

describe("MacroProgramIntelligenceEngine.translateMacro", () => {
  it("translates V-variables to # syntax for Fanuc", () => {
    const result = MacroProgramIntelligenceEngine.translateMacro(
      "okuma_osp", "fanuc", OKUMA_TRANSLATION_CODE,
    );
    expect(result.success).toBe(true);
    expect(result.translatedCode).toContain("#1 =");
    expect(result.translatedCode).toContain("#87 =");
  });

  it("translates 6-digit Okuma tool code to 4-digit Fanuc", () => {
    const result = MacroProgramIntelligenceEngine.translateMacro(
      "okuma_osp", "fanuc", "N1 T010101",
    );
    expect(result.translatedCode).toContain("T0101");
    expect(result.translatedCode).not.toContain("T010101");
  });

  it("replaces G74 peck drill with G83 for Fanuc", () => {
    const result = MacroProgramIntelligenceEngine.translateMacro(
      "okuma_osp", "fanuc",
      "G74 X0. Z[V74] I[V28] D[V73 + 0.1] F[V27]",
    );
    expect(result.translatedCode).toContain("G83");
  });

  it("replaces G180 with comment for Fanuc", () => {
    const result = MacroProgramIntelligenceEngine.translateMacro(
      "okuma_osp", "fanuc", "G180",
    );
    expect(result.translatedCode).toContain("OKUMA GRAPHICS CANCEL");
  });

  it("replaces G270 with comment for Fanuc", () => {
    const result = MacroProgramIntelligenceEngine.translateMacro(
      "okuma_osp", "fanuc", "G270",
    );
    expect(result.translatedCode).toContain("OKUMA GRAPHICS LOCK");
  });

  it("reports mappingsApplied for each rule that fired", () => {
    const result = MacroProgramIntelligenceEngine.translateMacro(
      "okuma_osp", "fanuc", OKUMA_TRANSLATION_CODE,
    );
    expect(result.mappingsApplied.length).toBeGreaterThan(0);
  });

  it("returns success=true for same-controller translation with warning", () => {
    const result = MacroProgramIntelligenceEngine.translateMacro(
      "okuma_osp", "okuma_osp", OKUMA_TRANSLATION_CODE,
    );
    expect(result.success).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.translatedCode).toBe(OKUMA_TRANSLATION_CODE);
  });

  it("returns success=false and warning for unsupported pair (okuma→siemens)", () => {
    const result = MacroProgramIntelligenceEngine.translateMacro(
      "okuma_osp", "siemens", OKUMA_TRANSLATION_CODE,
    );
    expect(result.success).toBe(false);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it("correctly translates Fanuc # back to Okuma V", () => {
    const result = MacroProgramIntelligenceEngine.translateMacro(
      "fanuc", "okuma_osp", "#1 = 1.905",
    );
    expect(result.translatedCode).toContain("V1");
  });
});

// ============================================================================
// 5. debugMacro
// ============================================================================

describe("MacroProgramIntelligenceEngine.debugMacro", () => {
  it("identifies undefined_label category for GOTO error", () => {
    const result = MacroProgramIntelligenceEngine.debugMacro(
      MACRO_BAD_GOTO,
      "Undefined label NBIG",
    );
    expect(result.errorCategory).toBe("undefined_label");
  });

  it("returns affected lines for undefined label", () => {
    const result = MacroProgramIntelligenceEngine.debugMacro(
      MACRO_BAD_GOTO,
      "Undefined label",
    );
    expect(result.affectedLines.length).toBeGreaterThan(0);
  });

  it("provides fix suggestions for undefined label", () => {
    const result = MacroProgramIntelligenceEngine.debugMacro(
      MACRO_BAD_GOTO,
      "label not found",
    );
    expect(result.suggestedFixes.length).toBeGreaterThan(0);
    expect(result.suggestedFixes.some(f => f.toLowerCase().includes("label"))).toBe(true);
  });

  it("identifies syntax_error for bracket mismatch", () => {
    const result = MacroProgramIntelligenceEngine.debugMacro(
      MACRO_SYNTAX_ERROR,
      "syntax error in expression",
    );
    expect(result.errorCategory).toBe("syntax_error");
  });

  it("flags unmatched bracket on the correct line", () => {
    const result = MacroProgramIntelligenceEngine.debugMacro(
      MACRO_SYNTAX_ERROR,
      "bracket format error",
    );
    const bracketDiag = result.diagnostics.find(d => d.issue.includes("bracket") || d.issue.includes("racket"));
    expect(bracketDiag).toBeDefined();
  });

  it("identifies division_by_zero when error message matches", () => {
    const codeWithDiv = `O6001\nV1 = 0\nV87 = [V45 * 3.82] / V1\nM30`;
    const result = MacroProgramIntelligenceEngine.debugMacro(codeWithDiv, "divide by zero error");
    expect(result.errorCategory).toBe("division_by_zero");
    expect(result.affectedLines.length).toBeGreaterThan(0);
  });

  it("identifies tool_comp_error for G41 G42 messages", () => {
    const result = MacroProgramIntelligenceEngine.debugMacro(
      MINIMAL_CASING_MACRO,
      "compensation error G41",
    );
    expect(result.errorCategory).toBe("tool_comp_error");
    expect(result.suggestedFixes.length).toBeGreaterThan(0);
  });

  it("includes prevention tips for every error category", () => {
    const result = MacroProgramIntelligenceEngine.debugMacro(
      MACRO_BAD_GOTO, "label not found",
    );
    expect(result.preventionTips.length).toBeGreaterThan(0);
  });

  it("returns unknown category gracefully for unrecognized errors", () => {
    const result = MacroProgramIntelligenceEngine.debugMacro(
      MINIMAL_CASING_MACRO,
      "ALARM 9999 UNKNOWN MACHINE ERROR",
    );
    expect(result.errorCategory).toBe("unknown");
    expect(result.suggestedFixes.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// 6. explainMacro
// ============================================================================

describe("MacroProgramIntelligenceEngine.explainMacro", () => {
  it("returns a non-empty title with program number", () => {
    const result = MacroProgramIntelligenceEngine.explainMacro(MINIMAL_CASING_MACRO);
    expect(result.title).toContain("O1001");
  });

  it("summary includes variable count", () => {
    const result = MacroProgramIntelligenceEngine.explainMacro(MINIMAL_CASING_MACRO);
    expect(result.summary).toMatch(/\d+ variables/);
  });

  it("summary mentions auto-calculated count", () => {
    const result = MacroProgramIntelligenceEngine.explainMacro(MINIMAL_CASING_MACRO);
    expect(result.summary).toContain("auto-calculated");
  });

  it("annotates every non-empty line", () => {
    const result = MacroProgramIntelligenceEngine.explainMacro(MINIMAL_CASING_MACRO);
    const nonEmpty = MINIMAL_CASING_MACRO.split("\n").filter(l => l.trim().length > 0);
    expect(result.annotatedLines.length).toBeGreaterThanOrEqual(nonEmpty.length * 0.9);
  });

  it("detects G50 speed clamp pattern", () => {
    const result = MacroProgramIntelligenceEngine.explainMacro(MINIMAL_CASING_MACRO);
    expect(result.patternsSeen.some(p => p.toLowerCase().includes("g50") || p.toLowerCase().includes("clamp"))).toBe(true);
  });

  it("detects RPM formula pattern (3.82 constant)", () => {
    const result = MacroProgramIntelligenceEngine.explainMacro(MINIMAL_CASING_MACRO);
    expect(result.patternsSeen.some(p => p.includes("3.82"))).toBe(true);
  });

  it("annotates G50 line with critical importance", () => {
    const result = MacroProgramIntelligenceEngine.explainMacro(MINIMAL_CASING_MACRO);
    const g50line = result.annotatedLines.find(l => l.code.includes("G50"));
    expect(g50line).toBeDefined();
    expect(g50line!.importance).toBe("critical");
  });

  it("annotates G0 X20 Z20 retract as critical", () => {
    const result = MacroProgramIntelligenceEngine.explainMacro(MINIMAL_CASING_MACRO);
    const retractLine = result.annotatedLines.find(l => l.code.includes("G0") && l.code.includes("X20"));
    expect(retractLine).toBeDefined();
    expect(retractLine!.importance).toBe("critical");
  });

  it("includes variable guide with adjustable flags", () => {
    const result = MacroProgramIntelligenceEngine.explainMacro(MINIMAL_CASING_MACRO);
    expect(result.variableGuide.length).toBeGreaterThan(3);
    const v1 = result.variableGuide.find(v => v.variable === "V1");
    expect(v1).toBeDefined();
    expect(v1!.adjustable).toBe(true);
  });

  it("includes tribal tips about RPM constant 3.82", () => {
    const result = MacroProgramIntelligenceEngine.explainMacro(MINIMAL_CASING_MACRO);
    expect(result.tribalTips.some(t => t.includes("3.82"))).toBe(true);
  });

  it("includes tribal tip about G50 when clamp is missing", () => {
    const result = MacroProgramIntelligenceEngine.explainMacro(PROBLEMATIC_MACRO);
    expect(result.tribalTips.some(t => t.toUpperCase().includes("G50") || t.toUpperCase().includes("SAFETY"))).toBe(true);
  });

  it("returns okuma_osp as default controller in explanation", () => {
    const result = MacroProgramIntelligenceEngine.explainMacro(MINIMAL_CASING_MACRO);
    expect(result.controller).toBe("okuma_osp");
  });
});

// ============================================================================
// 7. searchPatternLibrary
// ============================================================================

describe("MacroProgramIntelligenceEngine.searchPatternLibrary", () => {
  it("returns casing turning for 'casing' query", () => {
    const results = MacroProgramIntelligenceEngine.searchPatternLibrary("casing");
    expect(results.length).toBeGreaterThan(0);
    expect(results.some(r => r.id === "casing_turning")).toBe(true);
  });

  it("returns counterbore pattern for 'counterbore' query", () => {
    const results = MacroProgramIntelligenceEngine.searchPatternLibrary("counterbore");
    expect(results.length).toBeGreaterThan(0);
    expect(results.some(r => r.id === "counterbore_casing")).toBe(true);
  });

  it("returns peck drill pattern for 'peck' query", () => {
    const results = MacroProgramIntelligenceEngine.searchPatternLibrary("peck");
    expect(results.length).toBeGreaterThan(0);
    expect(results.some(r => r.id === "peck_drilling")).toBe(true);
  });

  it("returns empty array for nonsense query", () => {
    const results = MacroProgramIntelligenceEngine.searchPatternLibrary("zxqwerty_no_match_xyz");
    expect(results).toHaveLength(0);
  });

  it("all pattern library entries have non-empty templateCode", () => {
    const results = MacroProgramIntelligenceEngine.searchPatternLibrary("casing");
    for (const r of results) {
      expect(r.templateCode.length).toBeGreaterThan(50);
    }
  });
});
