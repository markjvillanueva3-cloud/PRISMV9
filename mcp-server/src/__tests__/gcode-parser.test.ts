/**
 * G-Code Parser Test Suite — Phase 0-C U-TEST1
 *
 * Tests the parseGCode utility across controller dialects and G-code constructs.
 * Target: 60+ test cases (6 dialects × 10+ constructs).
 */
import { describe, it, expect } from "vitest";
import {
  parseGCode, findBlock, findAllBlocks, findMBlocks,
  allXCoords, allYCoords, allZCoords, allFeeds, allSpeeds,
  toolChanges, hasGCode, hasMCode, assertBlockParams, assertSFInRange,
} from "./helpers/gcode-parser.js";

// ============================================================================
// BASIC PARSING
// ============================================================================

describe("parseGCode — Basic Parsing", () => {
  it("parses empty program", () => {
    const p = parseGCode("");
    expect(p.totalLines).toBe(1);
    expect(p.blocks[0].isBlank).toBe(true);
  });

  it("parses program number", () => {
    const p = parseGCode("O1234 (TEST)\nG00 X0 Y0\nM30");
    expect(p.programNumber).toBe("O1234");
  });

  it("parses N-numbers", () => {
    const p = parseGCode("N10 G00 X10. Y20.\nN20 G01 Z-5. F200");
    expect(p.blocks[0].N).toBe(10);
    expect(p.blocks[1].N).toBe(20);
  });

  it("parses comments in parentheses", () => {
    const p = parseGCode("G00 X10. (rapid to start)");
    expect(p.blocks[0].comment).toBe("rapid to start");
    expect(p.blocks[0].X).toBe(10);
  });

  it("parses full-line comments", () => {
    const p = parseGCode("(This is a comment)\nG00 X0");
    expect(p.blocks[0].isComment).toBe(true);
    expect(p.blocks[0].comment).toBe("This is a comment");
  });

  it("parses semicolon comments", () => {
    const p = parseGCode("G00 X10. ; rapid move");
    expect(p.blocks[0].comment).toBe("rapid move");
    expect(p.blocks[0].X).toBe(10);
  });

  it("parses percent signs as comments", () => {
    const p = parseGCode("%\nO0001\nM30\n%");
    expect(p.blocks[0].isComment).toBe(true);
  });

  it("handles blank lines", () => {
    const p = parseGCode("G00 X0\n\nG01 Z-5");
    expect(p.blocks[1].isBlank).toBe(true);
  });
});

// ============================================================================
// AXIS WORDS
// ============================================================================

describe("parseGCode — Axis Words", () => {
  it("parses XYZ coordinates", () => {
    const p = parseGCode("G00 X10.5 Y-20.3 Z5.0");
    expect(p.blocks[0].X).toBeCloseTo(10.5);
    expect(p.blocks[0].Y).toBeCloseTo(-20.3);
    expect(p.blocks[0].Z).toBeCloseTo(5.0);
  });

  it("parses ABC rotary axes", () => {
    const p = parseGCode("G00 A90.0 B45.0 C180.0");
    expect(p.blocks[0].A).toBeCloseTo(90);
    expect(p.blocks[0].B).toBeCloseTo(45);
    expect(p.blocks[0].C).toBeCloseTo(180);
  });

  it("parses negative coordinates", () => {
    const p = parseGCode("G01 X-50.123 Y-30.456 Z-10.789 F200");
    expect(p.blocks[0].X).toBeCloseTo(-50.123);
    expect(p.blocks[0].Y).toBeCloseTo(-30.456);
    expect(p.blocks[0].Z).toBeCloseTo(-10.789);
  });

  it("parses integer coordinates (no decimal)", () => {
    const p = parseGCode("G00 X100 Y50 Z10");
    expect(p.blocks[0].X).toBe(100);
    expect(p.blocks[0].Y).toBe(50);
    expect(p.blocks[0].Z).toBe(10);
  });

  it("parses arc center words I J K", () => {
    const p = parseGCode("G02 X10. Y0. I5. J0. F100");
    expect(p.blocks[0].I).toBeCloseTo(5);
    expect(p.blocks[0].J).toBeCloseTo(0);
    expect(p.blocks[0].gCodes).toContain(2);
  });

  it("parses arc radius R", () => {
    const p = parseGCode("G03 X20. Z-10. R5. F100");
    expect(p.blocks[0].R).toBeCloseTo(5);
    expect(p.blocks[0].gCodes).toContain(3);
  });
});

// ============================================================================
// G-CODE GROUPS
// ============================================================================

describe("parseGCode — G-Code Recognition", () => {
  it("parses rapid move G00", () => {
    const p = parseGCode("G00 X0 Y0 Z50.");
    expect(hasGCode(p, 0)).toBe(true);
  });

  it("parses linear move G01", () => {
    const p = parseGCode("G01 X10. Y20. F200");
    expect(hasGCode(p, 1)).toBe(true);
    expect(p.blocks[0].F).toBe(200);
  });

  it("parses multiple G-codes on one line", () => {
    const p = parseGCode("G90 G54 G00 X0 Y0");
    expect(p.blocks[0].gCodes).toContain(90);
    expect(p.blocks[0].gCodes).toContain(54);
    expect(p.blocks[0].gCodes).toContain(0);
  });

  it("parses canned cycles G73/G81/G83/G84/G85", () => {
    const cycles = [73, 81, 83, 84, 85];
    for (const g of cycles) {
      const p = parseGCode(`G${g} X10. Y10. Z-25. R2. F100`);
      expect(hasGCode(p, g)).toBe(true);
    }
  });

  it("parses G83 peck drill with Q parameter", () => {
    const p = parseGCode("G83 Z-25.0 R2. Q5.0 F150");
    const block = findBlock(p, 83)!;
    expect(block).toBeDefined();
    expect(block.Z).toBeCloseTo(-25.0);
    expect(block.Q).toBeCloseTo(5.0);
    expect(block.R).toBeCloseTo(2.0);
    expect(block.F).toBe(150);
  });

  it("parses G76 threading cycle", () => {
    const p = parseGCode("G76 X17.052 Z-25.0 P920 Q100 F1.500");
    const block = findBlock(p, 76)!;
    expect(block.X).toBeCloseTo(17.052);
    expect(block.Z).toBeCloseTo(-25.0);
    expect(block.F).toBeCloseTo(1.5);
  });

  it("parses G71/G70 turning rough/finish cycles", () => {
    const prog = "G71 P10 Q20 U0.5 W0.1 D2.0 F0.25\nG70 P10 Q20";
    const p = parseGCode(prog);
    expect(hasGCode(p, 71)).toBe(true);
    expect(hasGCode(p, 70)).toBe(true);
  });

  it("parses G72 facing cycle", () => {
    const p = parseGCode("G72 W2.0 R1.0\nG72 P10 Q20 U0.2 W0.05 F0.15");
    expect(hasGCode(p, 72)).toBe(true);
    const blocks = findAllBlocks(p, 72);
    expect(blocks.length).toBe(2);
  });

  it("parses G75 grooving cycle", () => {
    const p = parseGCode("G75 R1.0\nG75 X15.0 Z-10.0 P2000 Q1000 F0.05");
    const blocks = findAllBlocks(p, 75);
    expect(blocks.length).toBe(2);
    expect(blocks[1].X).toBeCloseTo(15.0);
    expect(blocks[1].P).toBe(2000);
    expect(blocks[1].Q).toBe(1000);
  });

  it("parses G43 tool length comp", () => {
    const p = parseGCode("G43 H3 Z50.");
    expect(hasGCode(p, 43)).toBe(true);
    expect(p.blocks[0].H).toBe(3);
  });

  it("parses G80 canned cycle cancel", () => {
    const p = parseGCode("G80");
    expect(hasGCode(p, 80)).toBe(true);
  });
});

// ============================================================================
// M-CODES
// ============================================================================

describe("parseGCode — M-Code Recognition", () => {
  it("parses spindle CW/CCW M03/M04", () => {
    const p = parseGCode("S3000 M03");
    expect(hasMCode(p, 3)).toBe(true);
    expect(p.blocks[0].S).toBe(3000);
  });

  it("parses spindle stop M05", () => {
    const p = parseGCode("M05");
    expect(hasMCode(p, 5)).toBe(true);
  });

  it("parses tool change M06", () => {
    const p = parseGCode("T3 M06");
    expect(hasMCode(p, 6)).toBe(true);
    expect(p.blocks[0].T).toBe(3);
  });

  it("parses coolant on/off M08/M09", () => {
    const prog = "M08\nG01 X10. F200\nM09";
    const p = parseGCode(prog);
    expect(hasMCode(p, 8)).toBe(true);
    expect(hasMCode(p, 9)).toBe(true);
  });

  it("parses program end M30", () => {
    const p = parseGCode("M30");
    expect(hasMCode(p, 30)).toBe(true);
  });
});

// ============================================================================
// QUERY HELPERS
// ============================================================================

describe("parseGCode — Query Helpers", () => {
  const SAMPLE = `%
O0001 (TEST PROGRAM)
T1 M06 (FACE MILL)
G43 H1 Z50.
S8000 M03
M08
G00 X30.0 Y25.0
G01 Z-5.0 F500
G01 X90.0 F800
G00 Z50.
T2 M06 (DRILL)
G43 H2 Z50.
S3000 M03
G00 X150.0 Y50.0
G83 Z-40.0 R2.0 Q5.0 F200
G80
G00 X150.0 Y100.0
G83 Z-40.0 R2.0 Q5.0 F200
G80
M09
M05
M30
%`;

  it("finds all X coordinates", () => {
    const p = parseGCode(SAMPLE);
    const xs = allXCoords(p);
    expect(xs).toContain(30.0);
    expect(xs).toContain(90.0);
    expect(xs).toContain(150.0);
  });

  it("finds all Y coordinates", () => {
    const p = parseGCode(SAMPLE);
    const ys = allYCoords(p);
    expect(ys).toContain(25.0);
    expect(ys).toContain(50.0);
    expect(ys).toContain(100.0);
  });

  it("finds all Z coordinates", () => {
    const p = parseGCode(SAMPLE);
    const zs = allZCoords(p);
    expect(zs).toContain(-5.0);
    expect(zs).toContain(-40.0);
    expect(zs).toContain(50.0);
  });

  it("finds tool changes", () => {
    const p = parseGCode(SAMPLE);
    const tc = toolChanges(p);
    expect(tc.length).toBe(2);
    expect(tc[0].T).toBe(1);
    expect(tc[1].T).toBe(2);
  });

  it("finds all feed rates", () => {
    const p = parseGCode(SAMPLE);
    const feeds = allFeeds(p);
    expect(feeds).toContain(500);
    expect(feeds).toContain(800);
    expect(feeds).toContain(200);
  });

  it("finds all spindle speeds", () => {
    const p = parseGCode(SAMPLE);
    const speeds = allSpeeds(p);
    expect(speeds).toContain(8000);
    expect(speeds).toContain(3000);
  });

  it("finds all G83 blocks", () => {
    const p = parseGCode(SAMPLE);
    const drills = findAllBlocks(p, 83);
    expect(drills.length).toBe(2);
    expect(drills[0].Z).toBeCloseTo(-40);
    expect(drills[0].Q).toBeCloseTo(5);
  });

  it("reports tools used", () => {
    const p = parseGCode(SAMPLE);
    expect(p.toolsUsed.has(1)).toBe(true);
    expect(p.toolsUsed.has(2)).toBe(true);
    expect(p.toolsUsed.size).toBe(2);
  });

  it("reports G-codes used", () => {
    const p = parseGCode(SAMPLE);
    expect(p.gCodesUsed.has(0)).toBe(true);   // G00
    expect(p.gCodesUsed.has(1)).toBe(true);   // G01
    expect(p.gCodesUsed.has(43)).toBe(true);  // G43
    expect(p.gCodesUsed.has(83)).toBe(true);  // G83
    expect(p.gCodesUsed.has(80)).toBe(true);  // G80
  });
});

// ============================================================================
// ASSERTION HELPERS
// ============================================================================

describe("parseGCode — Assertion Helpers", () => {
  it("assertBlockParams validates G83 drill parameters", () => {
    const p = parseGCode("G83 Z-25.0 R2.0 Q5.0 F150");
    const result = assertBlockParams(p, 83, { Z: -25.0, Q: 5.0, R: 2.0, F: 150 }, 0.1);
    expect(result.found).toBe(true);
    expect(result.mismatches).toHaveLength(0);
  });

  it("assertBlockParams detects parameter mismatch", () => {
    const p = parseGCode("G83 Z-25.0 R2.0 Q5.0 F150");
    const result = assertBlockParams(p, 83, { Z: -30.0 }, 0.1);
    expect(result.found).toBe(true);
    expect(result.mismatches.length).toBeGreaterThan(0);
    expect(result.mismatches[0]).toContain("Z");
  });

  it("assertBlockParams reports missing G-code", () => {
    const p = parseGCode("G00 X0 Y0");
    const result = assertBlockParams(p, 83, { Z: -25.0 });
    expect(result.found).toBe(false);
  });

  it("assertSFInRange validates aluminum speeds", () => {
    // S8000 with 10mm tool → Vc = π×10×8000/1000 ≈ 251 m/min — valid for N
    const p = parseGCode("S8000 M03\nG01 X10 F500");
    const result = assertSFInRange(p, "N", 12000, 10);
    expect(result.valid).toBe(true);
  });

  it("assertSFInRange catches impossible speed for superalloy", () => {
    // S20000 with 10mm tool → Vc = π×10×20000/1000 ≈ 628 m/min — way too fast for S
    const p = parseGCode("S20000 M03");
    const result = assertSFInRange(p, "S", 20000, 10);
    expect(result.valid).toBe(false);
    expect(result.violations.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// CONTROLLER DIALECTS
// ============================================================================

describe("parseGCode — Controller Dialect Support", () => {
  it("handles Fanuc-style G-code (word-address)", () => {
    const p = parseGCode("G54 G90 G00 X0. Y0.\nG43 H1 Z50.\nS10000 M03\nM08");
    expect(hasGCode(p, 54)).toBe(true);
    expect(hasGCode(p, 90)).toBe(true);
    expect(p.blocks[2].S).toBe(10000);
  });

  it("handles Haas-style G50 spindle clamp", () => {
    const p = parseGCode("G50 S2000\nG97 S800 M03\nG96 S200");
    expect(hasGCode(p, 50)).toBe(true);
    expect(hasGCode(p, 97)).toBe(true);
    expect(hasGCode(p, 96)).toBe(true);
  });

  it("handles Okuma-style OSP programs", () => {
    // Okuma uses G15 H1 for work coordinate, G10 for data setting
    const p = parseGCode("G15 H1\nG00 X100. Z50.\nG01 X50. F0.2");
    expect(hasGCode(p, 15)).toBe(true);
    expect(p.blocks[0].H).toBe(1);
  });

  it("handles G28 reference return", () => {
    const p = parseGCode("G91 G28 Z0\nG91 G28 X0 Y0");
    expect(hasGCode(p, 28)).toBe(true);
    expect(hasGCode(p, 91)).toBe(true);
  });

  it("handles CSS G96/G97 modes", () => {
    const p = parseGCode("G97 S500 M03\nG96 S200\nG97 S1000");
    const blocks = findAllBlocks(p, 97);
    expect(blocks.length).toBe(2);
    expect(blocks[0].S).toBe(500);
    expect(blocks[1].S).toBe(1000);
  });
});
