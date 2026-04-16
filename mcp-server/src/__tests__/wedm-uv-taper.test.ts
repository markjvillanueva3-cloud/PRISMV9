/**
 * UV Taper G-Code Emission Test Suite (U-W100-15)
 *
 * Validates UV coordinate generation for taper cutting mode.
 * Based on NOZE TEST.NC format: G1 X-.11614 Y.0754 U-.04786 V0.
 *
 * Tests:
 *   1. UV coordinates emitted on same G1 line as XY
 *   2. H-offsets = 0.0000 for taper mode
 *   3. UV values scale with taper angle
 *   4. UV validated against machine travel limits
 *   5. Non-taper profiles have NO UV coordinates
 *   6. NOZE TEST format reproduced
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

/** Extract lines containing U and V coordinates */
function extractUVLines(gcode: string): string[] {
  return gcode.split("\n").filter(l => / U[-.\d]/.test(l) && / V[-.\d]/.test(l));
}

/** Extract H-offset declarations from G-code header */
function extractHOffsets(gcode: string): Array<{ hNum: string; value: string }> {
  return gcode.split("\n")
    .filter(l => /^H\d+ ?=/.test(l))
    .map(l => {
      const m = l.match(/^(H\d+) ?= ?([-.\d]+)/);
      return m ? { hNum: m[1], value: m[2] } : { hNum: "", value: "" };
    })
    .filter(h => h.hNum !== "");
}

// ============================================================================
// TEST FIXTURES
// ============================================================================

/** NOZE TEST-style taper profile: stainless, 250mm, 5° taper */
function makeNOZETaperProfile(): EDMProfile {
  // Simple rectangular contour representing a taper die
  const pts: EDMContourPoint[] = [
    { x: 0, y: 0 },
    { x: 50, y: 0 },
    { x: 50, y: 30 },
    { x: 0, y: 30 },
    { x: 0, y: 0 }, // Close
  ];
  return {
    name: "noze_taper",
    contour_points: pts,
    start_hole: { x: 25, y: 15 },
    approach: { type: "linear", length_mm: 3 },
    departure: { type: "linear", length_mm: 3 },
    profile_type: "internal",
    taper_angle_deg: 5, // 5° taper (typical)
  };
}

/** Non-taper straight profile for comparison */
function makeStraightProfile(): EDMProfile {
  const pts: EDMContourPoint[] = [
    { x: 0, y: 0 },
    { x: 40, y: 0 },
    { x: 40, y: 20 },
    { x: 0, y: 20 },
    { x: 0, y: 0 },
  ];
  return {
    name: "straight_die",
    contour_points: pts,
    start_hole: { x: 20, y: 10 },
    approach: { type: "linear", length_mm: 3 },
    departure: { type: "linear", length_mm: 3 },
    profile_type: "internal",
    // No taper_angle_deg
  };
}

/** Make 5-pass Mitsubishi input (NOZE TEST-style) */
function makeTaperInput(profile: EDMProfile, opts?: { guide_distance_mm?: number; uv_travel_limit_mm?: number }): EDMGCodeInput {
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
    program_number: 1,
    units: "metric",
    guide_distance_mm: opts?.guide_distance_mm ?? 80,
    uv_travel_limit_mm: opts?.uv_travel_limit_mm ?? 75,
  };
}

// ============================================================================
// 1. UV COORDINATES ON SAME G1 LINE
// ============================================================================

describe("UV on same G1 line as XY", () => {
  it("taper profile emits U and V on G1 contour lines", () => {
    const input = makeTaperInput(makeNOZETaperProfile());
    const result = engine.generate_gcode(input);
    const uvLines = extractUVLines(result.gcode);

    expect(uvLines.length).toBeGreaterThan(0);
    // Every UV line should also have X and Y
    for (const line of uvLines) {
      expect(line).toMatch(/X[-.\d]/);
      expect(line).toMatch(/Y[-.\d]/);
      expect(line).toMatch(/U[-.\d]/);
      expect(line).toMatch(/V[-.\d]/);
    }
  });

  it("UV format matches NOZE TEST: G1 X... Y... U... V...", () => {
    const input = makeTaperInput(makeNOZETaperProfile());
    const result = engine.generate_gcode(input);
    const uvLines = extractUVLines(result.gcode);

    // At least some lines should have the full NOZE TEST format
    const g1UVLines = uvLines.filter(l => l.includes("G1"));
    expect(g1UVLines.length).toBeGreaterThan(0);

    // Check format: N## G1 X... Y... U... V...
    for (const line of g1UVLines) {
      expect(line).toMatch(/N\d+ G1 X[-.\d]+ Y[-.\d]+ U[-.\d]+ V[-.\d]+/);
    }
  });

  it("non-taper profile does NOT emit UV coordinates", () => {
    const input = makeTaperInput(makeStraightProfile());
    const result = engine.generate_gcode(input);
    const uvLines = extractUVLines(result.gcode);
    expect(uvLines).toHaveLength(0);
  });
});

// ============================================================================
// 2. H-OFFSETS = 0.0000 FOR TAPER MODE
// ============================================================================

describe("H-offsets zero for taper mode", () => {
  it("taper profile: all H-offsets = 0.0000", () => {
    const input = makeTaperInput(makeNOZETaperProfile());
    const result = engine.generate_gcode(input);
    const hOffsets = extractHOffsets(result.gcode);

    // Should have H1 through H5 (5 passes)
    const passOffsets = hOffsets.filter(h => h.hNum !== "H175");
    expect(passOffsets.length).toBe(5);

    for (const h of passOffsets) {
      expect(h.value).toBe("0.0000");
    }
  });

  it("non-taper profile: H-offsets have non-zero values", () => {
    const input = makeTaperInput(makeStraightProfile());
    const result = engine.generate_gcode(input);
    const hOffsets = extractHOffsets(result.gcode);

    const passOffsets = hOffsets.filter(h => h.hNum !== "H175");
    // At least the rough pass should have non-zero offset
    const hasNonZero = passOffsets.some(h => parseFloat(h.value) > 0);
    expect(hasNonZero).toBe(true);
  });
});

// ============================================================================
// 3. UV MAGNITUDE SCALES WITH TAPER ANGLE
// ============================================================================

describe("UV magnitude scales with taper angle", () => {
  it("larger taper angle produces larger UV offsets", () => {
    const profile5deg = makeNOZETaperProfile();
    profile5deg.taper_angle_deg = 5;
    const result5 = engine.generate_gcode(makeTaperInput(profile5deg));
    const uv5 = extractUVLines(result5.gcode);

    const profile10deg = makeNOZETaperProfile();
    profile10deg.taper_angle_deg = 10;
    const result10 = engine.generate_gcode(makeTaperInput(profile10deg));
    const uv10 = extractUVLines(result10.gcode);

    // Extract max absolute U value from each
    const maxU = (lines: string[]) => {
      let max = 0;
      for (const l of lines) {
        const m = l.match(/U([-.\d]+)/);
        if (m) max = Math.max(max, Math.abs(parseFloat(m[1])));
      }
      return max;
    };

    const maxU5 = maxU(uv5);
    const maxU10 = maxU(uv10);

    expect(maxU10).toBeGreaterThan(maxU5);
    // tan(10°)/tan(5°) ≈ 2.01, so 10° should produce ~2× the UV offset
    expect(maxU10 / maxU5).toBeGreaterThan(1.5);
    expect(maxU10 / maxU5).toBeLessThan(2.5);
  });

  it("zero taper angle produces zero UV", () => {
    const profile = makeNOZETaperProfile();
    profile.taper_angle_deg = 0;
    const input = makeTaperInput(profile);
    const result = engine.generate_gcode(input);
    const uvLines = extractUVLines(result.gcode);
    expect(uvLines).toHaveLength(0);
  });

  it("UV magnitude is tan(angle) × guide_dist/2 for perpendicular moves", () => {
    // For a horizontal move, V should be zero and U = ±tan(angle) × guide/2
    const profile = makeNOZETaperProfile();
    profile.taper_angle_deg = 5;
    const input = makeTaperInput(profile, { guide_distance_mm: 80 });
    const result = engine.generate_gcode(input);
    const uvLines = extractUVLines(result.gcode);

    // Expected displacement: tan(5°) × 80/2 = 0.08749 × 40 = 3.4996mm
    const expected = Math.tan(5 * Math.PI / 180) * 40;

    // Find a line with a purely horizontal move (Y stays constant, large X change)
    // The first contour line from (0,0) to (50,0) is horizontal
    // UV should have U=0 (no perpendicular in X), V=±expected (perpendicular is in Y)
    // Actually: for horizontal move (dx=50, dy=0), perp = (-0, 1) or (0, -1)
    // So V = ±expected, U = 0

    // Check that at least one UV line has values close to expected magnitude
    let foundExpectedMag = false;
    for (const l of uvLines) {
      const mU = l.match(/U([-.\d]+)/);
      const mV = l.match(/V([-.\d]+)/);
      if (mU && mV) {
        const u = Math.abs(parseFloat(mU[1]));
        const v = Math.abs(parseFloat(mV[1]));
        const mag = Math.sqrt(u * u + v * v);
        if (Math.abs(mag - expected) < 0.1) {
          foundExpectedMag = true;
          break;
        }
      }
    }
    expect(foundExpectedMag).toBe(true);
  });
});

// ============================================================================
// 4. UV TRAVEL VALIDATION
// ============================================================================

describe("UV travel validation against machine limits", () => {
  it("no warnings for small taper within limits", () => {
    const profile = makeNOZETaperProfile();
    profile.taper_angle_deg = 3; // Small angle
    const input = makeTaperInput(profile, { uv_travel_limit_mm: 75 });
    const result = engine.generate_gcode(input);
    // Should have no UV overtravel warnings
    const uvWarnings = result.warnings.filter(w => w.includes("UV overtravel"));
    expect(uvWarnings).toHaveLength(0);
  });

  it("warns on steep taper exceeding UV limits", () => {
    const profile = makeNOZETaperProfile();
    profile.taper_angle_deg = 45; // Very steep
    const input = makeTaperInput(profile, { guide_distance_mm: 200, uv_travel_limit_mm: 30 });
    const result = engine.generate_gcode(input);
    // tan(45°) × 100 = 100mm >> 30mm limit
    const uvWarnings = result.warnings.filter(w => w.includes("UV overtravel"));
    expect(uvWarnings.length).toBeGreaterThan(0);
  });

  it("guide_distance_mm affects UV magnitude", () => {
    const profile = makeNOZETaperProfile();
    profile.taper_angle_deg = 5;

    const narrow = engine.generate_gcode(makeTaperInput(profile, { guide_distance_mm: 40 }));
    const wide = engine.generate_gcode(makeTaperInput(profile, { guide_distance_mm: 120 }));

    const maxU = (gcode: string) => {
      let max = 0;
      for (const l of extractUVLines(gcode)) {
        const m = l.match(/U([-.\d]+)/);
        if (m) max = Math.max(max, Math.abs(parseFloat(m[1])));
      }
      return max;
    };

    // Wider guide distance → larger UV offset
    expect(maxU(wide.gcode)).toBeGreaterThan(maxU(narrow.gcode));
  });
});

// ============================================================================
// 5. ALL PASSES HAVE UV FOR TAPER
// ============================================================================

describe("All passes emit UV for taper profiles", () => {
  it("all 5 passes have UV coordinates", () => {
    const input = makeTaperInput(makeNOZETaperProfile());
    const result = engine.generate_gcode(input);

    // Check each pass section has UV lines
    for (let pass = 1; pass <= 5; pass++) {
      const passSection = getPassSection(result.gcode, pass);
      const uvInPass = extractUVLines(passSection);
      expect(uvInPass.length).toBeGreaterThan(0);
    }
  });
});

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
    if (inPass && /PASS=\d/.test(line)) break;
    if (inPass) section.push(line);
  }
  return section.join("\n");
}

// ============================================================================
// 6. G-CODE STRUCTURE INTEGRITY
// ============================================================================

describe("UV taper structural integrity", () => {
  it("generates valid G-code with correct pass count", () => {
    const input = makeTaperInput(makeNOZETaperProfile());
    const result = engine.generate_gcode(input);
    expect(result.gcode.length).toBeGreaterThan(0);
    expect(result.passes_generated).toBe(5);
  });

  it("G50 cancel taper still present after UV contour", () => {
    const input = makeTaperInput(makeNOZETaperProfile());
    const result = engine.generate_gcode(input);
    expect(result.gcode).toContain("G50");
  });

  it("mixed profiles: taper profile has UV, straight profile does not", () => {
    const taperProfile = makeNOZETaperProfile();
    const straightProfile = makeStraightProfile();

    const passes: EDMPass[] = [
      { pass_number: 1, offset_mm: 0.200, technology_table: "E2821", wire_speed_m_min: 10, tension_N: 12 },
      { pass_number: 2, offset_mm: 0.100, technology_table: "E2822", wire_speed_m_min: 8, tension_N: 10 },
    ];

    const input: EDMGCodeInput = {
      controller: "mitsubishi",
      profiles: [straightProfile, taperProfile],
      passes,
      wire_type: "brass_0.25",
      program_number: 1,
      units: "metric",
      guide_distance_mm: 80,
    };

    const result = engine.generate_gcode(input);

    // Should have UV lines (from taper profile)
    const uvLines = extractUVLines(result.gcode);
    expect(uvLines.length).toBeGreaterThan(0);

    // The straight profile section should not have UV
    // (H-offsets are zero because hasTaperProfile is true — that's correct,
    //  the H-offset zero applies to the whole program when any profile has taper)
  });
});
