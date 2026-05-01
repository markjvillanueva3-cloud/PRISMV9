/**
 * G-Code Structure Validation Test Suite (U-W100-16)
 *
 * Integration tests that validate generated WEDM programs against
 * real-world program structure. Combines arc reversal + UV taper + E-pack
 * + H-offset + compensation into full-program structural checks.
 *
 * References:
 *   - ITW SHAKEPROOF: D2, 4-pass, E1221-E1224, arc reversal on Pass 3
 *   - NOZE TEST: taper profile, UV on G1 lines, H-offsets 0.0000
 *
 * Exit gate checks:
 *   1. G-code structure matches ITW SHAKEPROOF (arc directions)
 *   2. G-code structure matches NOZE TEST (UV format)
 *   3. Combined arc reversal + UV works in single program
 *   4. Multi-profile programs have correct per-profile handling
 */

import { describe, it, expect } from "vitest";
import type {
  EDMGCodeInput,
  EDMProfile,
  EDMPass,
  EDMContourPoint,
} from "../engines/EDMPostProcessGCodeEngine.js";
import { EDMPostProcessGCodeEngine } from "../engines/EDMPostProcessGCodeEngine.js";

const engine = new EDMPostProcessGCodeEngine();

// ============================================================================
// HELPERS
// ============================================================================

function getPassSection(gcode: string, passNum: number): string {
  const lines = gcode.split("\n");
  let inPass = false;
  const section: string[] = [];
  for (const line of lines) {
    if (line.includes(`PASS=${passNum}`)) {
      inPass = true;
      continue;
    }
    if (inPass && /PASS=\d/.test(line)) break;
    if (inPass) section.push(line);
  }
  return section.join("\n");
}

function extractArcLines(gcode: string): Array<{ line: string; code: "G2" | "G3" }> {
  return gcode.split("\n")
    .filter(l => / G[23] /.test(l))
    .map(l => ({
      line: l,
      code: l.includes(" G2 ") ? "G2" as const : "G3" as const,
    }));
}

function extractCompLines(gcode: string): Array<{ code: "G41" | "G42" }> {
  return gcode.split("\n")
    .filter(l => /G4[12]\b/.test(l) && !l.includes("G40"))
    .map(l => ({
      code: l.includes("G42") ? "G42" as const : "G41" as const,
    }));
}

function extractHOffsets(gcode: string): Array<{ hNum: string; value: number }> {
  return gcode.split("\n")
    .filter(l => /^H\d+ ?=/.test(l))
    .map(l => {
      const m = l.match(/^(H\d+) ?= ?([-.\d]+)/);
      return m ? { hNum: m[1], value: parseFloat(m[2]) } : null;
    })
    .filter((h): h is { hNum: string; value: number } => h !== null && h.hNum !== "H175");
}

function extractUVLines(gcode: string): string[] {
  return gcode.split("\n").filter(l => / U[-.\d]/.test(l) && / V[-.\d]/.test(l));
}

function extractEPackLines(gcode: string): string[] {
  return gcode.split("\n").filter(l => /E\d{4}/.test(l));
}

function countMotionLines(section: string): number {
  return section.split("\n")
    .filter(l => /\bX[-.\d]/.test(l) && !/G0\b/.test(l) && !l.includes("G40"))
    .length;
}

// ============================================================================
// TEST FIXTURES — ITW SHAKEPROOF structure
// ============================================================================

/** ITW SHAKEPROOF-like: D2 tool steel, 4-pass, internal die cavity with arcs */
function makeITWShakeproofInput(): EDMGCodeInput {
  const pts: EDMContourPoint[] = [
    { x: 0, y: 2 },
    { x: 0, y: 23 },
    { x: 2, y: 25, type: "arc", i: 2, j: 0, direction: "ccw" },
    { x: 23, y: 25 },
    { x: 25, y: 23, type: "arc", i: 0, j: -2, direction: "ccw" },
    { x: 25, y: 2 },
    { x: 23, y: 0, type: "arc", i: -2, j: 0, direction: "ccw" },
    { x: 2, y: 0 },
    { x: 0, y: 2, type: "arc", i: 0, j: 2, direction: "ccw" },
  ];

  const profile: EDMProfile = {
    name: "itw_die_cavity",
    contour_points: pts,
    start_hole: { x: 12.5, y: 12.5 },
    approach: { type: "arc", length_mm: 3 },
    departure: { type: "arc", length_mm: 3 },
    profile_type: "internal",
  };

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
    program_number: 100,
    units: "metric",
  };
}

/** NOZE TEST-like: taper profile, 5-pass, UV coordinates */
function makeNozeTestInput(): EDMGCodeInput {
  const pts: EDMContourPoint[] = [
    { x: 0, y: 0 },
    { x: 50, y: 0 },
    { x: 50, y: 30 },
    { x: 0, y: 30 },
    { x: 0, y: 0 },
  ];

  const profile: EDMProfile = {
    name: "noze_taper_die",
    contour_points: pts,
    start_hole: { x: 25, y: 15 },
    approach: { type: "linear", length_mm: 3 },
    departure: { type: "linear", length_mm: 3 },
    profile_type: "internal",
    taper_angle_deg: 5,
  };

  const passes: EDMPass[] = [
    { pass_number: 1, offset_mm: 0.200, technology_table: "E2821", wire_speed_m_min: 10, tension_N: 12 },
    { pass_number: 2, offset_mm: 0.120, technology_table: "E2822", wire_speed_m_min: 8, tension_N: 10 },
    { pass_number: 3, offset_mm: 0.060, technology_table: "E2823", wire_speed_m_min: 6, tension_N: 8 },
    { pass_number: 4, offset_mm: 0.030, technology_table: "E2824", wire_speed_m_min: 4, tension_N: 6 },
    { pass_number: 5, offset_mm: 0.010, technology_table: "E2825", wire_speed_m_min: 3, tension_N: 5 },
  ];

  return {
    controller: "mitsubishi",
    profiles: [profile],
    passes,
    wire_type: "brass_0.25",
    program_number: 200,
    units: "metric",
    guide_distance_mm: 80,
    uv_travel_limit_mm: 75,
  };
}

// ============================================================================
// 1. ITW SHAKEPROOF STRUCTURAL VALIDATION
// ============================================================================

describe("ITW SHAKEPROOF program structure", () => {
  it("generates 4-pass program with correct E-pack codes", () => {
    const result = engine.generate_gcode(makeITWShakeproofInput());
    expect(result.passes_generated).toBe(4);
    expect(result.gcode).toContain("E1221");
    expect(result.gcode).toContain("E1222");
    expect(result.gcode).toContain("E1223");
    expect(result.gcode).toContain("E1224");
  });

  it("Pass 1: G41 compensation + G3 arcs (internal die, CCW contour)", () => {
    const result = engine.generate_gcode(makeITWShakeproofInput());
    const p1 = getPassSection(result.gcode, 1);

    const comp = extractCompLines(p1);
    expect(comp.length).toBeGreaterThan(0);
    expect(comp[0].code).toBe("G41"); // Internal = G41

    const arcs = extractArcLines(p1);
    const g3Count = arcs.filter(a => a.code === "G3").length;
    expect(g3Count).toBeGreaterThan(0); // CCW arcs dominant
  });

  it("Pass 3: G42 compensation + G2 arcs (reversed)", () => {
    const result = engine.generate_gcode(makeITWShakeproofInput());
    const p3 = getPassSection(result.gcode, 3);

    const comp = extractCompLines(p3);
    expect(comp.length).toBeGreaterThan(0);
    expect(comp[0].code).toBe("G42"); // Reversed from G41

    const arcs = extractArcLines(p3);
    const g2Count = arcs.filter(a => a.code === "G2").length;
    expect(g2Count).toBeGreaterThan(0); // CW arcs dominant (reversed)
  });

  it("Pass 2 and Pass 4: same direction as Pass 1 (not reversed)", () => {
    const result = engine.generate_gcode(makeITWShakeproofInput());

    const p1Comp = extractCompLines(getPassSection(result.gcode, 1));
    const p2Comp = extractCompLines(getPassSection(result.gcode, 2));
    const p4Comp = extractCompLines(getPassSection(result.gcode, 4));

    expect(p1Comp[0].code).toBe("G41");
    if (p2Comp.length > 0) expect(p2Comp[0].code).toBe("G41"); // Same as Pass 1
    if (p4Comp.length > 0) expect(p4Comp[0].code).toBe("G41"); // Same as Pass 1
  });

  it("H-offsets decrease monotonically (rough > skims)", () => {
    const result = engine.generate_gcode(makeITWShakeproofInput());
    const hOffsets = extractHOffsets(result.gcode);

    // H1 > H2 > H3 > H4
    expect(hOffsets.length).toBe(4);
    for (let i = 0; i < hOffsets.length - 1; i++) {
      expect(hOffsets[i].value).toBeGreaterThan(hOffsets[i + 1].value);
    }
  });

  it("no UV coordinates in non-taper program", () => {
    const result = engine.generate_gcode(makeITWShakeproofInput());
    const uvLines = extractUVLines(result.gcode);
    expect(uvLines).toHaveLength(0);
  });

  it("contour move count consistent across passes (Pass 3 reversed = Pass 1)", () => {
    const result = engine.generate_gcode(makeITWShakeproofInput());
    const p1Moves = countMotionLines(getPassSection(result.gcode, 1));
    const p2Moves = countMotionLines(getPassSection(result.gcode, 2));
    const p3Moves = countMotionLines(getPassSection(result.gcode, 3));
    const p4Moves = countMotionLines(getPassSection(result.gcode, 4));

    expect(p1Moves).toBeGreaterThan(0);
    // Pass 3 (reversed) must match Pass 1 exactly — same geometry, opposite direction
    expect(p3Moves).toBe(p1Moves);
    // Other passes may differ by ±1 (approach/departure line variations)
    expect(Math.abs(p2Moves - p1Moves)).toBeLessThanOrEqual(1);
    expect(Math.abs(p4Moves - p1Moves)).toBeLessThanOrEqual(1);
  });

  it("every pass has G40 compensation cancel", () => {
    const result = engine.generate_gcode(makeITWShakeproofInput());
    for (let p = 1; p <= 4; p++) {
      const section = getPassSection(result.gcode, p);
      expect(section).toContain("G40");
    }
  });

  it("program has threading codes (M20/M21 or M50/M60)", () => {
    const result = engine.generate_gcode(makeITWShakeproofInput());
    // Mitsubishi uses M20 (thread) and M21 (cut wire) or equivalent
    const hasThread = result.gcode.includes("M20") || result.gcode.includes("M50");
    expect(hasThread).toBe(true);
  });
});

// ============================================================================
// 2. NOZE TEST STRUCTURAL VALIDATION
// ============================================================================

describe("NOZE TEST program structure", () => {
  it("generates 5-pass taper program", () => {
    const result = engine.generate_gcode(makeNozeTestInput());
    expect(result.passes_generated).toBe(5);
  });

  it("all H-offsets = 0.0000 for taper mode", () => {
    const result = engine.generate_gcode(makeNozeTestInput());
    const hOffsets = extractHOffsets(result.gcode);
    expect(hOffsets.length).toBe(5);
    for (const h of hOffsets) {
      expect(h.value).toBeCloseTo(0, 4);
    }
  });

  it("UV coordinates on every G1 contour line", () => {
    const result = engine.generate_gcode(makeNozeTestInput());
    const uvLines = extractUVLines(result.gcode);
    expect(uvLines.length).toBeGreaterThan(0);

    // All UV lines are G1 lines with XYZUV format
    for (const line of uvLines) {
      expect(line).toMatch(/G1 X[-.\d]+ Y[-.\d]+ U[-.\d]+ V[-.\d]+/);
    }
  });

  it("UV present in all 5 passes", () => {
    const result = engine.generate_gcode(makeNozeTestInput());
    for (let p = 1; p <= 5; p++) {
      const section = getPassSection(result.gcode, p);
      const uvInPass = extractUVLines(section);
      expect(uvInPass.length).toBeGreaterThan(0);
    }
  });

  it("E-pack codes E2821-E2825 present", () => {
    const result = engine.generate_gcode(makeNozeTestInput());
    expect(result.gcode).toContain("E2821");
    expect(result.gcode).toContain("E2822");
    expect(result.gcode).toContain("E2823");
    expect(result.gcode).toContain("E2824");
    expect(result.gcode).toContain("E2825");
  });

  it("UV magnitude consistent with 5° taper at 80mm guide distance", () => {
    const result = engine.generate_gcode(makeNozeTestInput());
    const uvLines = extractUVLines(result.gcode);
    // Expected: tan(5°) × 40mm = 3.4996mm
    const expected = Math.tan(5 * Math.PI / 180) * 40;

    let foundCorrectMag = false;
    for (const line of uvLines) {
      const mU = line.match(/U([-.\d]+)/);
      const mV = line.match(/V([-.\d]+)/);
      if (mU && mV) {
        const u = Math.abs(parseFloat(mU[1]));
        const v = Math.abs(parseFloat(mV[1]));
        const mag = Math.sqrt(u * u + v * v);
        if (Math.abs(mag - expected) < 0.2) {
          foundCorrectMag = true;
          break;
        }
      }
    }
    expect(foundCorrectMag).toBe(true);
  });

  it("Pass 3 arcs reversed even with taper", () => {
    // NOZE TEST has linear contour, but let's test a taper profile with arcs
    const pts: EDMContourPoint[] = [
      { x: 0, y: 2 },
      { x: 0, y: 18 },
      { x: 2, y: 20, type: "arc", i: 2, j: 0, direction: "ccw" },
      { x: 18, y: 20 },
      { x: 20, y: 18, type: "arc", i: 0, j: -2, direction: "ccw" },
      { x: 20, y: 2 },
      { x: 18, y: 0, type: "arc", i: -2, j: 0, direction: "ccw" },
      { x: 2, y: 0 },
      { x: 0, y: 2, type: "arc", i: 0, j: 2, direction: "ccw" },
    ];

    const profile: EDMProfile = {
      name: "taper_with_arcs",
      contour_points: pts,
      start_hole: { x: 10, y: 10 },
      approach: { type: "arc", length_mm: 3 },
      departure: { type: "arc", length_mm: 3 },
      profile_type: "internal",
      taper_angle_deg: 3,
    };

    const input: EDMGCodeInput = {
      controller: "mitsubishi",
      profiles: [profile],
      passes: [
        { pass_number: 1, offset_mm: 0.180, technology_table: "E1221", wire_speed_m_min: 12, tension_N: 12 },
        { pass_number: 2, offset_mm: 0.100, technology_table: "E1222", wire_speed_m_min: 8, tension_N: 10 },
        { pass_number: 3, offset_mm: 0.050, technology_table: "E1223", wire_speed_m_min: 6, tension_N: 8 },
        { pass_number: 4, offset_mm: 0.020, technology_table: "E1224", wire_speed_m_min: 4, tension_N: 6 },
      ],
      wire_type: "brass_0.25",
      program_number: 300,
      units: "metric",
      guide_distance_mm: 60,
    };

    const result = engine.generate_gcode(input);

    // Pass 1: G3 arcs (CCW) + UV
    const p1Arcs = extractArcLines(getPassSection(result.gcode, 1));
    const p1G3 = p1Arcs.filter(a => a.code === "G3").length;
    expect(p1G3).toBeGreaterThan(0);

    // Pass 3: G2 arcs (CW, reversed) + UV
    const p3Arcs = extractArcLines(getPassSection(result.gcode, 3));
    const p3G2 = p3Arcs.filter(a => a.code === "G2").length;
    expect(p3G2).toBeGreaterThan(0);

    // Both passes should have UV (taper profile)
    const p1UV = extractUVLines(getPassSection(result.gcode, 1));
    const p3UV = extractUVLines(getPassSection(result.gcode, 3));
    expect(p1UV.length).toBeGreaterThan(0);
    expect(p3UV.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// 3. COMBINED MULTI-PROFILE PROGRAM
// ============================================================================

describe("Multi-profile combined program", () => {
  it("taper + non-taper profiles in same program", () => {
    const straightProfile: EDMProfile = {
      name: "straight_pocket",
      contour_points: [
        { x: 0, y: 0 },
        { x: 30, y: 0 },
        { x: 30, y: 20 },
        { x: 0, y: 20 },
        { x: 0, y: 0 },
      ],
      start_hole: { x: 15, y: 10 },
      approach: { type: "linear", length_mm: 3 },
      departure: { type: "linear", length_mm: 3 },
      profile_type: "internal",
    };

    const taperProfile: EDMProfile = {
      name: "taper_opening",
      contour_points: [
        { x: 60, y: 0 },
        { x: 90, y: 0 },
        { x: 90, y: 20 },
        { x: 60, y: 20 },
        { x: 60, y: 0 },
      ],
      start_hole: { x: 75, y: 10 },
      approach: { type: "linear", length_mm: 3 },
      departure: { type: "linear", length_mm: 3 },
      profile_type: "internal",
      taper_angle_deg: 5,
    };

    const passes: EDMPass[] = [
      { pass_number: 1, offset_mm: 0.180, technology_table: "E1221", wire_speed_m_min: 12, tension_N: 12 },
      { pass_number: 2, offset_mm: 0.100, technology_table: "E1222", wire_speed_m_min: 8, tension_N: 10 },
    ];

    const input: EDMGCodeInput = {
      controller: "mitsubishi",
      profiles: [straightProfile, taperProfile],
      passes,
      wire_type: "brass_0.25",
      program_number: 400,
      units: "metric",
      guide_distance_mm: 80,
    };

    const result = engine.generate_gcode(input);
    expect(result.profiles_cut).toBe(2);

    // H-offsets = 0 when any profile has taper
    const hOffsets = extractHOffsets(result.gcode);
    for (const h of hOffsets) {
      expect(h.value).toBeCloseTo(0, 4);
    }

    // UV lines should exist (from taper profile)
    const uvLines = extractUVLines(result.gcode);
    expect(uvLines.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// 4. PROGRAM-LEVEL STRUCTURAL CHECKS
// ============================================================================

describe("Program-level structural integrity", () => {
  it("Mitsubishi program starts with % and ends with M30/M02", () => {
    const result = engine.generate_gcode(makeITWShakeproofInput());
    const lines = result.gcode.split("\n").filter(l => l.trim().length > 0);
    expect(lines[0]).toContain("%");
    const lastContent = lines[lines.length - 1];
    expect(lastContent.includes("M30") || lastContent.includes("M02") || lastContent.includes("%")).toBe(true);
  });

  it("all arc lines have I and J values", () => {
    const result = engine.generate_gcode(makeITWShakeproofInput());
    const arcs = extractArcLines(result.gcode);
    for (const arc of arcs) {
      expect(arc.line).toMatch(/I[-.\d]/);
      expect(arc.line).toMatch(/J[-.\d]/);
    }
  });

  it("no duplicate pass markers", () => {
    const result = engine.generate_gcode(makeITWShakeproofInput());
    const passMarkers = result.gcode.split("\n").filter(l => /PASS=\d/.test(l));
    const passNums = passMarkers.map(l => {
      const m = l.match(/PASS=(\d)/);
      return m ? parseInt(m[1]) : 0;
    });
    const unique = new Set(passNums);
    expect(unique.size).toBe(passNums.length);
  });

  it("line numbers are sequential", () => {
    const result = engine.generate_gcode(makeITWShakeproofInput());
    const lineNums = result.gcode.split("\n")
      .filter(l => /^N\d+/.test(l))
      .map(l => {
        const m = l.match(/^N(\d+)/);
        return m ? parseInt(m[1]) : 0;
      });

    for (let i = 1; i < lineNums.length; i++) {
      expect(lineNums[i]).toBeGreaterThan(lineNums[i - 1]);
    }
  });

  it("no NaN or undefined in generated G-code", () => {
    const result = engine.generate_gcode(makeITWShakeproofInput());
    expect(result.gcode).not.toContain("NaN");
    expect(result.gcode).not.toContain("undefined");
    expect(result.gcode).not.toContain("null");
  });

  it("NOZE TEST program: no NaN or undefined", () => {
    const result = engine.generate_gcode(makeNozeTestInput());
    expect(result.gcode).not.toContain("NaN");
    expect(result.gcode).not.toContain("undefined");
    expect(result.gcode).not.toContain("null");
  });
});
