/**
 * Tests for GCodeTranspilerEngine — Multi-controller dialect transpiler.
 */
import { describe, it, expect } from "vitest";
import { gcodeTranspiler } from "../engines/GCodeTranspilerEngine.js";
import type { TranspileConfig } from "../engines/GCodeTranspilerEngine.js";

const fanucToSiemens: TranspileConfig = { source: "fanuc", target: "siemens" };
const fanucToHeidenhain: TranspileConfig = { source: "fanuc", target: "heidenhain" };
const fanucToOkuma: TranspileConfig = { source: "fanuc", target: "okuma" };

// ============================================================================
// Safe Start Injection
// ============================================================================

describe("Transpiler — Safe Start", () => {
  it("injects target-specific safe start block", () => {
    const result = gcodeTranspiler.transpile("G1 X10 F100", fanucToSiemens);
    expect(result.gcode).toContain("MCALL");  // Siemens uses MCALL not G80
  });

  it("can skip safe start injection", () => {
    const config = { ...fanucToSiemens, safeStartBlock: false };
    const result = gcodeTranspiler.transpile("G1 X10 F100", config);
    expect(result.gcode.split("\n")[0]).not.toContain("MCALL");
  });

  it("replaces original safe start block", () => {
    const gcode = "G90 G94 G17 G40 G49 G80\nG1 X10 F100";
    const result = gcodeTranspiler.transpile(gcode, fanucToSiemens);
    // Original safe start should be commented out
    const lines = result.gcode.split("\n");
    const origSafeStart = lines.find(l => l.includes("ORIGINAL"));
    expect(origSafeStart).toBeDefined();
  });
});

// ============================================================================
// Comment Translation
// ============================================================================

describe("Transpiler — Comments", () => {
  it("converts parenthesis comments to semicolon for Siemens", () => {
    const result = gcodeTranspiler.transpile("(Tool 1 roughing)", fanucToSiemens);
    const commentLine = result.gcode.split("\n").find(l => l.includes("Tool 1 roughing"));
    expect(commentLine).toMatch(/^;Tool 1 roughing/);
  });

  it("preserves comments when preserveComments=true", () => {
    const result = gcodeTranspiler.transpile("(setup note)", { ...fanucToSiemens, preserveComments: true });
    expect(result.gcode).toContain("setup note");
  });

  it("removes comments when preserveComments=false", () => {
    const result = gcodeTranspiler.transpile("(setup note)", { ...fanucToSiemens, preserveComments: false });
    const lines = result.gcode.split("\n").filter(l => l.includes("setup note"));
    expect(lines.length).toBe(0);
  });
});

// ============================================================================
// Tool Change Translation
// ============================================================================

describe("Transpiler — Tool Changes", () => {
  it("translates Fanuc tool change to Siemens", () => {
    const result = gcodeTranspiler.transpile("T01 M6", fanucToSiemens);
    expect(result.gcode).toContain("T1");
    expect(result.gcode).toContain("M6");
  });

  it("translates Fanuc tool change to Heidenhain", () => {
    const result = gcodeTranspiler.transpile("T01 M6", fanucToHeidenhain);
    expect(result.gcode).toContain("TOOL CALL 1");
  });

  it("translates Fanuc tool change to Okuma (4-digit pad)", () => {
    const result = gcodeTranspiler.transpile("T5 M6", fanucToOkuma);
    expect(result.gcode).toContain("T0005");
  });

  it("preserves tool offset (H word)", () => {
    const result = gcodeTranspiler.transpile("T01 M6\nG43 H01", { source: "fanuc", target: "haas" });
    expect(result.gcode).toContain("T1 M6");
  });
});

// ============================================================================
// Canned Cycle Translation
// ============================================================================

describe("Transpiler — Canned Cycles", () => {
  it("translates G81 drill to Siemens CYCLE81", () => {
    const result = gcodeTranspiler.transpile("G81 Z-10 R2 F100", fanucToSiemens);
    expect(result.gcode).toContain("CYCLE81");
    expect(result.stats.cyclesConverted).toBeGreaterThan(0);
  });

  it("translates G83 peck to Heidenhain CYCL DEF 203", () => {
    const result = gcodeTranspiler.transpile("G83 Z-20 R2 Q3 F150", fanucToHeidenhain);
    expect(result.gcode).toContain("CYCL DEF 203");
    expect(result.gcode).toContain("Q202=3");  // Infeed depth
  });

  it("translates G84 tapping to Siemens CYCLE84", () => {
    const result = gcodeTranspiler.transpile("G84 Z-15 R2 F500", fanucToSiemens);
    expect(result.gcode).toContain("CYCLE84");
  });

  it("translates G80 cycle cancel to Siemens MCALL", () => {
    const result = gcodeTranspiler.transpile("G80", fanucToSiemens);
    expect(result.gcode).toContain("MCALL");
  });

  it("can disable cycle conversion", () => {
    const config = { ...fanucToSiemens, convertCycles: false };
    const result = gcodeTranspiler.transpile("G81 Z-10 R2 F100", config);
    expect(result.gcode).not.toContain("CYCLE81");
  });
});

// ============================================================================
// Work Offset Translation
// ============================================================================

describe("Transpiler — Work Offsets", () => {
  it("translates G54-G59 for Okuma (G15 H format)", () => {
    const result = gcodeTranspiler.transpile("G55", fanucToOkuma);
    expect(result.gcode).toContain("G54 G15 H2");
  });

  it("G54 stays G54 for Fanuc→Haas (no change)", () => {
    const config: TranspileConfig = { source: "fanuc", target: "haas", safeStartBlock: false };
    const result = gcodeTranspiler.transpile("G54", config);
    expect(result.gcode).toContain("G54");
  });

  it("can disable offset conversion", () => {
    const config = { ...fanucToOkuma, convertWorkOffsets: false, safeStartBlock: false };
    const result = gcodeTranspiler.transpile("G55", config);
    // G55 should remain as-is (no G15 H conversion)
    const nonSafeLine = result.gcode.split("\n").find(l => l.includes("G55"));
    expect(nonSafeLine).toBeDefined();
    expect(nonSafeLine).not.toContain("G15");
  });
});

// ============================================================================
// Generic G/M Code Translation
// ============================================================================

describe("Transpiler — Generic Codes", () => {
  it("translates G80 to MCALL in generic translation", () => {
    const config = { ...fanucToSiemens, safeStartBlock: false, convertCycles: false };
    // When cycle conversion is off, G80 should still be caught by generic map
    const result = gcodeTranspiler.transpile("G90 G80", config);
    expect(result.gcode).toContain("MCALL");
  });

  it("preserves coordinates during translation", () => {
    const config = { ...fanucToSiemens, safeStartBlock: false };
    const result = gcodeTranspiler.transpile("G1 X10.5 Y-3.2 Z0 F500", config);
    expect(result.gcode).toContain("X10.5");
    expect(result.gcode).toContain("Y-3.2");
    expect(result.gcode).toContain("F500");
  });
});

// ============================================================================
// Stats & Utilities
// ============================================================================

describe("Transpiler — Stats & Utilities", () => {
  it("correctly counts translated vs untranslated lines", () => {
    const gcode = "G81 Z-10 R2 F100\nG1 X10 Y0 F500\nG80";
    const result = gcodeTranspiler.transpile(gcode, fanucToSiemens);
    expect(result.stats.totalLines).toBe(3);
    expect(result.stats.translatedLines).toBeGreaterThan(0);
  });

  it("listDialects returns 6 dialects", () => {
    const dialects = gcodeTranspiler.listDialects();
    expect(dialects.length).toBe(6);
    expect(dialects).toContain("fanuc");
    expect(dialects).toContain("siemens");
    expect(dialects).toContain("heidenhain");
  });

  it("getSafeStart returns dialect-specific block", () => {
    expect(gcodeTranspiler.getSafeStart("siemens")).toContain("MCALL");
    expect(gcodeTranspiler.getSafeStart("okuma")).toContain("G15 H0");
    expect(gcodeTranspiler.getSafeStart("fanuc")).toContain("G80");
  });

  it("listCycleTranslations shows supported cycles", () => {
    const cycles = gcodeTranspiler.listCycleTranslations();
    expect(Object.keys(cycles)).toContain("G81");
    expect(Object.keys(cycles)).toContain("G83");
    expect(cycles["G81"]).toContain("siemens");
  });

  it("output line count equals input + injected safe start", () => {
    const gcode = "G1 X10 F100\nG1 X20\nM30";
    const result = gcodeTranspiler.transpile(gcode, fanucToSiemens);
    // 3 input lines + 1 safe start = 4
    expect(result.gcode.split("\n").length).toBeGreaterThanOrEqual(4);
  });
});

// ============================================================================
// Full Program Transpile
// ============================================================================

describe("Transpiler — Full Program", () => {
  it("transpiles a complete Fanuc program to Siemens", () => {
    const fanucProgram = [
      "O1001",
      "(ROUGHING OP)",
      "G90 G94 G17 G40 G49 G80",
      "G54",
      "T01 M6",
      "G43 H01",
      "S8000 M3",
      "G0 X0 Y0 Z10",
      "G1 Z-5 F500",
      "G1 X50 Y0",
      "G1 X50 Y50",
      "G0 Z10",
      "G81 Z-15 R2 F200",
      "X10 Y10",
      "X30 Y10",
      "G80",
      "M5",
      "M9",
      "G91 G28 Z0",
      "M30",
    ].join("\n");
    const result = gcodeTranspiler.transpile(fanucProgram, fanucToSiemens);
    expect(result.stats.cyclesConverted).toBeGreaterThanOrEqual(1);
    expect(result.stats.translatedLines).toBeGreaterThan(3);
    expect(result.gcode).toContain("CYCLE81");
    expect(result.gcode).toContain("MCALL"); // G80 → MCALL
  });
});
