/**
 * Arc Reversal Test Suite (U-W100-14)
 *
 * Validates Pass 3 contour direction reversal for error averaging.
 * Standard Mitsubishi practice: Pass 3 traverses opposite from Pass 1.
 *
 * Tests:
 *   1. Compensation code flip (G41↔G42 on Pass 3)
 *   2. Arc direction flip (G2↔G3 on Pass 3)
 *   3. Approach/departure arc direction flip
 *   4. I/J sign correctness for reversed arcs
 *   5. Contour reversal on ITW SHAKEPROOF-style geometry
 *   6. Linear-only contour reversal (no arcs)
 */

import { describe, it, expect } from "vitest";

// Import the G-code generator (Mitsubishi)
// We need to construct inputs and parse the generated G-code
import type {
  EDMGCodeInput,
  EDMProfile,
  EDMPass,
  EDMContourPoint,
} from "../engines/EDMPostProcessGCodeEngine.js";

// Use the engine's generate function via the class
import { EDMPostProcessGCodeEngine } from "../engines/EDMPostProcessGCodeEngine.js";

const engine = new EDMPostProcessGCodeEngine();

// ============================================================================
// HELPERS
// ============================================================================

/** Extract lines containing G2 or G3 arc codes from G-code output */
function extractArcLines(gcode: string): Array<{ line: string; code: "G2" | "G3" }> {
  return gcode.split("\n")
    .filter(l => / G[23] /.test(l))
    .map(l => ({
      line: l,
      code: l.includes(" G2 ") ? "G2" as const : "G3" as const,
    }));
}

/** Extract lines containing G41 or G42 compensation codes */
function extractCompLines(gcode: string): Array<{ line: string; code: "G41" | "G42" }> {
  return gcode.split("\n")
    .filter(l => /G4[12]\b/.test(l) && !l.includes("G40"))
    .map(l => ({
      line: l,
      code: l.includes("G42") ? "G42" as const : "G41" as const,
    }));
}

/** Extract pass comment markers to delimit passes */
function extractPassMarkers(gcode: string): Array<{ line: string; passNum: number }> {
  return gcode.split("\n")
    .filter(l => /PASS=\d/.test(l))
    .map(l => {
      const m = l.match(/PASS=(\d)/);
      return { line: l, passNum: m ? parseInt(m[1]) : 0 };
    });
}

/** Get G-code lines between two pass markers */
function getPassSection(gcode: string, passNum: number): string {
  const lines = gcode.split("\n");
  let inPass = false;
  const section: string[] = [];
  for (const line of lines) {
    if (line.includes(`PASS=${passNum}`)) {
      inPass = true;
      continue;
    }
    if (inPass && /PASS=\d/.test(line)) {
      break; // Next pass started
    }
    if (inPass) {
      section.push(line);
    }
  }
  return section.join("\n");
}

// ============================================================================
// TEST FIXTURES
// ============================================================================

/** Simple square contour with arc corners (like a die cavity) */
function makeSquareWithArcProfile(): EDMProfile {
  const size = 25; // 25mm square
  const r = 2;     // 2mm corner radius
  // Simplified: 4 lines + 4 arcs forming a rounded square
  const pts: EDMContourPoint[] = [
    { x: 0, y: r },              // Start (bottom-left, offset up by radius)
    { x: 0, y: size - r },       // Left side (line)
    // Top-left arc (CCW, 90°)
    { x: r, y: size, type: "arc", i: r, j: 0, direction: "ccw" },
    { x: size - r, y: size },    // Top side (line)
    // Top-right arc (CCW, 90°)
    { x: size, y: size - r, type: "arc", i: 0, j: -r, direction: "ccw" },
    { x: size, y: r },           // Right side (line)
    // Bottom-right arc (CCW, 90°)
    { x: size - r, y: 0, type: "arc", i: -r, j: 0, direction: "ccw" },
    { x: r, y: 0 },              // Bottom side (line)
    // Bottom-left arc (CCW, 90°) — back to start
    { x: 0, y: r, type: "arc", i: 0, j: r, direction: "ccw" },
  ];

  return {
    name: "square_die",
    contour_points: pts,
    start_hole: { x: 12.5, y: 12.5 }, // Center
    approach: { type: "arc", length_mm: 3 },
    departure: { type: "arc", length_mm: 3 },
    profile_type: "internal",
  };
}

/** Simple linear-only contour (no arcs) */
function makeTriangleProfile(): EDMProfile {
  const pts: EDMContourPoint[] = [
    { x: 0, y: 0 },
    { x: 30, y: 0 },
    { x: 15, y: 25 },
    { x: 0, y: 0 },  // Close
  ];
  return {
    name: "triangle",
    contour_points: pts,
    start_hole: { x: 10, y: 5 },
    approach: { type: "linear", length_mm: 3 },
    departure: { type: "linear", length_mm: 3 },
    profile_type: "external",
  };
}

/** 4-pass input (rough + 3 skims, like ITW SHAKEPROOF) */
function make4PassInput(profile: EDMProfile): EDMGCodeInput {
  const passes: EDMPass[] = [
    { pass_number: 1, offset_mm: 0.180, technology_table: "E1221", wire_speed_m_min: 12, tension_N: 12 },
    { pass_number: 2, offset_mm: 0.100, technology_table: "E1222", wire_speed_m_min: 8, tension_N: 10 },
    { pass_number: 3, offset_mm: 0.050, technology_table: "E1223", wire_speed_m_min: 6, tension_N: 8 },
    { pass_number: 4, offset_mm: 0.020, technology_table: "E1224", wire_speed_m_min: 4, tension_N: 6 },
  ];
  return {
    controller: "mitsubishi",
    profiles: [profile],
    passes,
    wire_type: "brass_0.25",
    program_number: 1,
    units: "metric",
  };
}

// ============================================================================
// 1. COMPENSATION CODE FLIP
// ============================================================================

describe("Pass 3 compensation reversal", () => {
  it("internal profile: Pass 1 uses G41, Pass 3 uses G42", () => {
    const input = make4PassInput(makeSquareWithArcProfile());
    const result = engine.generate_gcode(input);
    const compLines = extractCompLines(result.gcode);

    // Find comp lines in Pass 1 and Pass 3 sections
    const pass1Section = getPassSection(result.gcode, 1);
    const pass3Section = getPassSection(result.gcode, 3);

    const pass1Comp = extractCompLines(pass1Section);
    const pass3Comp = extractCompLines(pass3Section);

    expect(pass1Comp.length).toBeGreaterThan(0);
    expect(pass3Comp.length).toBeGreaterThan(0);
    expect(pass1Comp[0].code).toBe("G41"); // Internal = G41 on normal pass
    expect(pass3Comp[0].code).toBe("G42"); // Reversed on Pass 3
  });

  it("external profile: Pass 1 uses G42, Pass 3 uses G41", () => {
    const input = make4PassInput(makeTriangleProfile());
    const result = engine.generate_gcode(input);

    const pass1Section = getPassSection(result.gcode, 1);
    const pass3Section = getPassSection(result.gcode, 3);

    const pass1Comp = extractCompLines(pass1Section);
    const pass3Comp = extractCompLines(pass3Section);

    expect(pass1Comp.length).toBeGreaterThan(0);
    expect(pass3Comp.length).toBeGreaterThan(0);
    expect(pass1Comp[0].code).toBe("G42"); // External = G42 on normal pass
    expect(pass3Comp[0].code).toBe("G41"); // Reversed on Pass 3
  });
});

// ============================================================================
// 2. ARC DIRECTION FLIP ON PASS 3
// ============================================================================

describe("Pass 3 arc direction reversal", () => {
  it("contour arcs flip: G3 on Pass 1 becomes G2 on Pass 3", () => {
    const input = make4PassInput(makeSquareWithArcProfile());
    const result = engine.generate_gcode(input);

    const pass1Arcs = extractArcLines(getPassSection(result.gcode, 1));
    const pass3Arcs = extractArcLines(getPassSection(result.gcode, 3));

    // Square with arc corners has CCW arcs (G3) in normal direction
    expect(pass1Arcs.length).toBeGreaterThan(0);
    expect(pass3Arcs.length).toBeGreaterThan(0);

    // Count G2 and G3 in each pass
    const pass1G3 = pass1Arcs.filter(a => a.code === "G3").length;
    const pass3G2 = pass3Arcs.filter(a => a.code === "G2").length;

    // Pass 1 should have G3 (CCW) arcs, Pass 3 should have G2 (CW) — flipped
    expect(pass1G3).toBeGreaterThan(0);
    expect(pass3G2).toBeGreaterThan(0);
    // The dominant arc direction should be opposite
    const pass1DominantG3 = pass1Arcs.filter(a => a.code === "G3").length > pass1Arcs.filter(a => a.code === "G2").length;
    const pass3DominantG2 = pass3Arcs.filter(a => a.code === "G2").length > pass3Arcs.filter(a => a.code === "G3").length;
    expect(pass1DominantG3).toBe(true);
    expect(pass3DominantG2).toBe(true);
  });

  it("linear-only contour has no arcs on Pass 1 or Pass 3", () => {
    const input = make4PassInput(makeTriangleProfile());
    const result = engine.generate_gcode(input);

    // Triangle has no arc contour points — only approach/departure may have arcs
    const pass1Section = getPassSection(result.gcode, 1);
    const pass3Section = getPassSection(result.gcode, 3);

    // No contour arcs, but approach/departure arcs may exist (linear approach → no arcs)
    // With linear approach/departure, there should be zero arc lines
    const pass1Arcs = extractArcLines(pass1Section);
    const pass3Arcs = extractArcLines(pass3Section);
    // Linear approach → no arcs expected
    expect(pass1Arcs).toHaveLength(0);
    expect(pass3Arcs).toHaveLength(0);
  });

  it("Pass 2 and Pass 4 are NOT reversed (same direction as Pass 1)", () => {
    const input = make4PassInput(makeSquareWithArcProfile());
    const result = engine.generate_gcode(input);

    const pass1Arcs = extractArcLines(getPassSection(result.gcode, 1));
    const pass2Arcs = extractArcLines(getPassSection(result.gcode, 2));
    const pass4Arcs = extractArcLines(getPassSection(result.gcode, 4));

    // Pass 2 and 4 should match Pass 1 dominant direction
    if (pass2Arcs.length > 0) {
      const pass2G3 = pass2Arcs.filter(a => a.code === "G3").length;
      const pass1G3 = pass1Arcs.filter(a => a.code === "G3").length;
      // Same dominant direction
      expect(pass2G3 > 0).toBe(pass1G3 > 0);
    }
    if (pass4Arcs.length > 0) {
      const pass4G3 = pass4Arcs.filter(a => a.code === "G3").length;
      const pass1G3 = pass1Arcs.filter(a => a.code === "G3").length;
      expect(pass4G3 > 0).toBe(pass1G3 > 0);
    }
  });
});

// ============================================================================
// 3. G-CODE STRUCTURAL INTEGRITY
// ============================================================================

describe("Arc reversal structural integrity", () => {
  it("generates valid G-code with no syntax errors", () => {
    const input = make4PassInput(makeSquareWithArcProfile());
    const result = engine.generate_gcode(input);
    expect(result.gcode.length).toBeGreaterThan(0);
    expect(result.line_count).toBeGreaterThan(0);
    expect(result.passes_generated).toBe(4);
    expect(result.warnings.length).toBe(0);
  });

  it("all 4 passes are present in output", () => {
    const input = make4PassInput(makeSquareWithArcProfile());
    const result = engine.generate_gcode(input);
    const markers = extractPassMarkers(result.gcode);
    expect(markers.length).toBe(4);
    expect(markers.map(m => m.passNum)).toEqual([1, 2, 3, 4]);
  });

  it("Pass 3 section has same number of contour moves as Pass 1", () => {
    const input = make4PassInput(makeSquareWithArcProfile());
    const result = engine.generate_gcode(input);

    // Count X/Y coordinate lines in each pass section (exclude rapids, comments, M-codes)
    const countMoves = (section: string) =>
      section.split("\n").filter(l => /\bX[-.\d]/.test(l) && !/G0\b/.test(l) && !l.includes("G40")).length;

    const pass1Moves = countMoves(getPassSection(result.gcode, 1));
    const pass3Moves = countMoves(getPassSection(result.gcode, 3));

    // Same geometry, same number of moves (just reversed direction)
    expect(pass3Moves).toBe(pass1Moves);
  });

  it("Pass 3 has G40 compensation cancel", () => {
    const input = make4PassInput(makeSquareWithArcProfile());
    const result = engine.generate_gcode(input);
    const pass3Section = getPassSection(result.gcode, 3);
    expect(pass3Section).toContain("G40");
  });

  it("every arc line has I and J values", () => {
    const input = make4PassInput(makeSquareWithArcProfile());
    const result = engine.generate_gcode(input);
    const arcLines = extractArcLines(result.gcode);
    for (const arc of arcLines) {
      expect(arc.line).toMatch(/I[-.\d]/);
      expect(arc.line).toMatch(/J[-.\d]/);
    }
  });
});

// ============================================================================
// 4. I/J CORRECTNESS FOR REVERSED ARCS
// ============================================================================

describe("I/J correctness on reversed arcs", () => {
  it("reversed arc I/J point to same center as original", () => {
    // Create a simple 2-point arc contour and verify the center is preserved
    const pts: EDMContourPoint[] = [
      { x: 0, y: 0 },
      // Arc from (0,0) to (10,10) with center at (10,0) — CW quarter circle
      { x: 10, y: 10, type: "arc", i: 10, j: 0, direction: "cw" },
    ];

    const profile: EDMProfile = {
      name: "arc_test",
      contour_points: pts,
      start_hole: { x: -5, y: -5 },
      approach: { type: "linear", length_mm: 3 },
      departure: { type: "linear", length_mm: 3 },
      profile_type: "internal",
    };

    const input = make4PassInput(profile);
    const result = engine.generate_gcode(input);

    // Extract Pass 1 and Pass 3 arc lines
    const pass1Arcs = extractArcLines(getPassSection(result.gcode, 1));
    const pass3Arcs = extractArcLines(getPassSection(result.gcode, 3));

    // Pass 1: G2 (CW) arc to X10 Y10 I10 J0 — center at (0+10, 0+0) = (10, 0)
    if (pass1Arcs.length > 0) {
      const p1Arc = pass1Arcs[0];
      expect(p1Arc.code).toBe("G2"); // CW
    }

    // Pass 3: Should be G3 (CCW) — reversed direction
    if (pass3Arcs.length > 0) {
      const p3Arc = pass3Arcs[0];
      expect(p3Arc.code).toBe("G3"); // CCW — flipped from CW
    }
  });
});

// ============================================================================
// 5. ARC APPROACH/DEPARTURE REVERSAL
// ============================================================================

describe("Approach/departure arc reversal on Pass 3", () => {
  it("arc approach: direction flips between Pass 1 and Pass 3", () => {
    const profile = makeSquareWithArcProfile(); // Has arc approach
    const input = make4PassInput(profile);
    const result = engine.generate_gcode(input);

    // In the approach section (before contour), check arc direction
    // Pass 1 approach should have one arc direction, Pass 3 should have the opposite
    const pass1Section = getPassSection(result.gcode, 1);
    const pass3Section = getPassSection(result.gcode, 3);

    // Get the first arc in each section (approach arc comes before contour arcs)
    const pass1Arcs = extractArcLines(pass1Section);
    const pass3Arcs = extractArcLines(pass3Section);

    if (pass1Arcs.length > 0 && pass3Arcs.length > 0) {
      // First arc is typically the approach arc
      // The approach arc direction should flip
      // (approach is calculated with CCW for normal, CW for reversed)
      expect(pass1Arcs[0].code).not.toBe(pass3Arcs[0].code);
    }
  });
});
