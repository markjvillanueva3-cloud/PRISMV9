/**
 * Tests for PrintToFusion360Bridge — CAD-COMPLETE-MS0/U-CADC-FUS-PRINT-01
 *
 * Coverage:
 *   - Happy paths: cylinder primitive, box primitive, hole profile, pocket profile, external profile
 *   - Failure modes: empty input, profile w/ NaN, profile w/ <3 pts, zero diameter, dim-only no-primitive
 *   - Adversarial: 100 profiles, Infinity in dim, oversize coordinates, mixed units
 *   - Round-trip: parameters & ops counted; provenance correct
 */

import { describe, it, expect } from "vitest";
import {
  PrintToFusion360Bridge,
  printToFusion360Bridge,
  type PrintToFusion360Input,
} from "../engines/PrintToFusion360Bridge.js";
import type { BlueprintAnalysis, ExtractedDimension } from "../engines/BlueprintOCREngine.js";
import type { ExtractedProfile } from "../engines/BlueprintVisionOCREngine.js";

// ── Test constants ───────────────────────────────────────────────────────────

const PROFILE_THRESHOLD_WARN = 50;
const TRIANGLE_MIN_POINTS = 3;
const INCH_TO_MM = 25.4;
const DEFAULT_BRIDGE_DEPTH = 10;
const FUSION_BRIDGE_VERSION = "1.0.0";

// ── Fixture factories ────────────────────────────────────────────────────────

function dim(
  type: ExtractedDimension["type"],
  nominal: number,
  unit: "mm" | "in" = "mm",
  id = `${type}-${Math.random().toString(36).slice(2, 7)}`,
): ExtractedDimension {
  return {
    id,
    type,
    nominal,
    unit,
    raw_text: `${nominal}${unit}`,
    confidence: 0.9,
  };
}

function emptyTitleBlock(
  overrides: Partial<BlueprintAnalysis["title_block"]> = {},
): BlueprintAnalysis["title_block"] {
  return {
    confidence: 0.9,
    ...overrides,
  };
}

function makeAnalysis(
  dims: ExtractedDimension[],
  tb: Partial<BlueprintAnalysis["title_block"]> = {},
): BlueprintAnalysis {
  return {
    dimensions: dims,
    gdt_frames: [],
    title_block: emptyTitleBlock(tb),
    notes: [],
    summary: {
      total_dimensions: dims.length,
      total_gdt: 0,
      total_notes: 0,
      tightest_tolerance_mm: 0.01,
      critical_features: [],
      material: tb.material ?? "",
      has_gdt: false,
    },
  };
}

function holeProfile(diameter_mm: number, x = 50, y = 50): ExtractedProfile {
  return {
    id: `hole-${diameter_mm}`,
    name: `Hole Ø${diameter_mm}`,
    type: "hole",
    points: [{ x, y }],
    is_closed: true,
    diameter_mm,
    confidence: 0.95,
  };
}

function pocketProfile(w: number, h: number): ExtractedProfile {
  return {
    id: `pocket-${w}x${h}`,
    name: `Pocket ${w}x${h}`,
    type: "pocket",
    points: [
      { x: 0, y: 0 },
      { x: w, y: 0 },
      { x: w, y: h },
      { x: 0, y: h },
    ],
    is_closed: true,
    width_mm: w,
    height_mm: h,
    confidence: 0.9,
  };
}

function externalProfile(points: Array<{ x: number; y: number }>): ExtractedProfile {
  return {
    id: `ext-${points.length}`,
    name: "Outer profile",
    type: "external",
    points,
    is_closed: true,
    confidence: 0.92,
  };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("PrintToFusion360Bridge — singleton + identity", () => {
  it("exports a singleton with version 1.0.0", () => {
    expect(printToFusion360Bridge).toBeInstanceOf(PrintToFusion360Bridge);
    expect(printToFusion360Bridge.version).toBe(FUSION_BRIDGE_VERSION);
  });

  it("declares the exact 5 supported operation kinds", () => {
    const ops = printToFusion360Bridge.supportedOperations();
    expect([...ops].sort()).toEqual(
      ["feature_extrude", "sketch_circle", "sketch_create", "sketch_line", "sketch_rectangle"],
    );
  });
});

describe("PrintToFusion360Bridge — validate()", () => {
  it("rejects null input", () => {
    const r = printToFusion360Bridge.validate(null as unknown as PrintToFusion360Input);
    expect(r.valid).toBe(false);
    expect(r.warnings).toEqual(["input is not an object"]);
  });

  it("rejects empty input with the canonical message", () => {
    const r = printToFusion360Bridge.validate({});
    expect(r.valid).toBe(false);
    expect(r.warnings).toContain("input must include at least one of: analysis, profiles, dimensions");
  });

  it("accepts dimensions-only input with zero warnings", () => {
    const r = printToFusion360Bridge.validate({ dimensions: [dim("diameter", 10)] });
    expect(r.valid).toBe(true);
    expect(r.warnings).toEqual([]);
  });

  it("flags negative defaultDepth without rejecting", () => {
    const r = printToFusion360Bridge.validate({
      profiles: [holeProfile(5)],
      defaultDepth: -1,
    });
    expect(r.valid).toBe(true);
    expect(r.warnings.some((w) => w.includes("defaultDepth -1"))).toBe(true);
  });
});

describe("PrintToFusion360Bridge — happy paths", () => {
  it("builds a cylinder primitive: 3 ops, radius 12.7 (Ø25.4mm), depth 50mm", () => {
    const out = printToFusion360Bridge.buildBridgeScript({
      analysis: makeAnalysis([dim("diameter", 25.4), dim("depth", 50)]),
      partName: "TestCyl",
    });
    expect(out.opsEmitted).toBe(3);
    expect(out.script).toContain("addByCenterRadius");
    expect(out.script).toContain("12.7*UNIT_FACTOR");
    expect(out.script).toMatch(/50\s*\*\s*UNIT_FACTOR/);
    expect(out.partName).toBe("TestCyl");
    expect(out.provenance.source).toBe("blueprint_analysis");
    expect(out.provenance.dimensionCount).toBe(2);
    expect(out.provenance.profileCount).toBe(0);
    expect(out.material).toBe(null);
  });

  it("builds a box primitive: rectangle 100x50, extrude 25 (sorted from 3 linears)", () => {
    const out = printToFusion360Bridge.buildBridgeScript({
      dimensions: [dim("linear", 100), dim("linear", 50), dim("linear", 25)],
    });
    expect(out.opsEmitted).toBe(3);
    expect(out.script).toContain("addTwoPointRectangle");
    // Largest two go to width/height, smallest to depth
    expect(out.parameters["rect_width"]?.value).toBe(100);
    expect(out.parameters["rect_height"]?.value).toBe(50);
    expect(out.parameters["extrude_depth"]?.value).toBe(25);
  });

  it("hole profile with Ø8 yields radius 4 + cut extrude (negative direction)", () => {
    const out = printToFusion360Bridge.buildBridgeScript({
      profiles: [holeProfile(8)],
      defaultDepth: 12,
    });
    expect(out.opsEmitted).toBe(3);
    expect(out.parameters["circle_radius"]?.value).toBe(4);
    expect(out.parameters["extrude_depth"]?.value).toBe(12);
    // Cut → negative direction prefix in the extrude line
    expect(out.script).toMatch(/-12\s*\*\s*UNIT_FACTOR/);
    expect(out.unsupported).toEqual([]);
  });

  it("pocket 40x20 emits sketch+rectangle+extrude with exact parameter values", () => {
    const out = printToFusion360Bridge.buildBridgeScript({
      profiles: [pocketProfile(40, 20)],
    });
    expect(out.opsEmitted).toBe(3);
    expect(out.parameters["rect_width"]?.value).toBe(40);
    expect(out.parameters["rect_height"]?.value).toBe(20);
    expect(out.parameters["extrude_depth"]?.value).toBe(DEFAULT_BRIDGE_DEPTH);
  });

  it("external 5-vertex profile emits 1+5+1=7 ops with 5 addByTwoPoints calls", () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 50, y: 0 },
      { x: 50, y: 30 },
      { x: 25, y: 45 },
      { x: 0, y: 30 },
    ];
    const out = printToFusion360Bridge.buildBridgeScript({
      profiles: [externalProfile(pts)],
    });
    expect(out.opsEmitted).toBe(1 + pts.length + 1);
    const lineMatches = out.script.match(/addByTwoPoints/g) ?? [];
    expect(lineMatches.length).toBe(pts.length);
  });

  it("carries title_block.material into a script trailer comment", () => {
    const out = printToFusion360Bridge.buildBridgeScript({
      analysis: makeAnalysis([dim("diameter", 10)], { material: "6061-T6 Aluminum" }),
    });
    expect(out.material).toBe("6061-T6 Aluminum");
    expect(out.script).toContain("# Material (from blueprint title block): 6061-T6 Aluminum");
  });

  it("derives part name from title_block.part_number when not overridden", () => {
    const out = printToFusion360Bridge.buildBridgeScript({
      analysis: makeAnalysis([dim("diameter", 10)], { part_number: "PN-12345-A" }),
    });
    expect(out.partName).toBe("PN-12345-A");
  });

  it("sanitizes part names: 'Part #1 (proto)/v2' → 'Part__1__proto__v2'", () => {
    const out = printToFusion360Bridge.buildBridgeScript({
      analysis: makeAnalysis([dim("diameter", 10)]),
      partName: "Part #1 (proto)/v2",
    });
    expect(out.partName).toBe("Part__1__proto__v2");
  });

  it("converts 1-inch diameter to 25.4mm → radius 12.7 in script", () => {
    const out = printToFusion360Bridge.buildBridgeScript({
      analysis: makeAnalysis([dim("diameter", 1, "in")]),
    });
    expect(out.parameters["circle_radius"]?.value).toBe(INCH_TO_MM / 2);
    expect(out.script).toContain("12.7*UNIT_FACTOR");
  });
});

describe("PrintToFusion360Bridge — failure modes", () => {
  it("throws 'PrintToFusion360Bridge: input is not an object' on null", () => {
    expect(() =>
      printToFusion360Bridge.buildBridgeScript(null as unknown as PrintToFusion360Input),
    ).toThrow("PrintToFusion360Bridge: input is not an object");
  });

  it("throws on empty input with canonical message", () => {
    expect(() => printToFusion360Bridge.buildBridgeScript({})).toThrow(
      /at least one of: analysis, profiles, dimensions/,
    );
  });

  it("throws 'zero operations' when only invalid profiles supplied", () => {
    const bad: ExtractedProfile = {
      id: "bad",
      name: "bad",
      type: "external",
      points: [
        { x: NaN, y: 0 },
        { x: 1, y: NaN },
      ],
      is_closed: false,
      confidence: 0.5,
    };
    expect(() => printToFusion360Bridge.buildBridgeScript({ profiles: [bad] })).toThrow(
      /zero operations/,
    );
  });

  it("rejects profile with diameter_mm = 0 → throws zero ops", () => {
    const bad: ExtractedProfile = {
      id: "bad-dia",
      name: "bad",
      type: "hole",
      points: [{ x: 0, y: 0 }],
      is_closed: true,
      diameter_mm: 0,
      confidence: 0.5,
    };
    expect(() => printToFusion360Bridge.buildBridgeScript({ profiles: [bad] })).toThrow(
      /zero operations/,
    );
  });

  it("skips external profile with 2 points but builds the valid hole alongside", () => {
    const out = printToFusion360Bridge.buildBridgeScript({
      profiles: [
        externalProfile([{ x: 0, y: 0 }, { x: 1, y: 1 }]),
        holeProfile(5),
      ],
    });
    expect(
      out.warnings.some((w) => w.includes("insufficient points") || w.includes("fewer than 3 points")),
    ).toBe(true);
    expect(out.opsEmitted).toBe(3); // only the hole's 3 ops
    // confirm the rejected one is the external profile
    expect(out.warnings.some((w) => w.includes("ext-2"))).toBe(true);
  });

  it("rejects profile with Infinity x-coord and emits a warning naming the profile", () => {
    const out = printToFusion360Bridge.buildBridgeScript({
      profiles: [
        externalProfile([
          { x: Infinity, y: 0 },
          { x: 1, y: 1 },
          { x: 2, y: 2 },
        ]),
        holeProfile(5),
      ],
    });
    expect(out.warnings.some((w) => w.includes("non-finite") && w.includes("ext-3"))).toBe(true);
    // The hole still produced ops
    expect(out.opsEmitted).toBe(3);
  });

  it("uses defaultDepth=7 for cut extrude when no depth dim supplied", () => {
    const out = printToFusion360Bridge.buildBridgeScript({
      profiles: [holeProfile(8)],
      defaultDepth: 7,
    });
    expect(out.parameters["extrude_depth"]?.value).toBe(7);
    expect(out.script).toMatch(/-7\s*\*\s*UNIT_FACTOR/);
  });

  it("warns 'mixed' units in title_block but defaults output to mm", () => {
    const out = printToFusion360Bridge.buildBridgeScript({
      analysis: makeAnalysis([dim("diameter", 10)], { units: "mixed" }),
    });
    expect(out.warnings.some((w) => w.includes("mixed"))).toBe(true);
    expect(out.units).toBe("mm");
  });
});

describe("PrintToFusion360Bridge — adversarial", () => {
  it("processes 100 hole profiles → exactly 300 ops emitted, warns about >50 threshold", () => {
    const profiles: ExtractedProfile[] = [];
    const TOTAL = 100;
    for (let i = 0; i < TOTAL; i++) {
      profiles.push(holeProfile(2 + (i % 10), i, i));
    }
    const out = printToFusion360Bridge.buildBridgeScript({ profiles });
    expect(out.opsEmitted).toBe(TOTAL * TRIANGLE_MIN_POINTS);
    expect(
      out.warnings.some((w) => w.includes(`exceeds ${PROFILE_THRESHOLD_WARN}`)),
    ).toBe(true);
  });

  it("rejects Infinity diameter via the no-finite-diameter path → throws", () => {
    expect(() =>
      printToFusion360Bridge.buildBridgeScript({
        dimensions: [dim("diameter", Infinity)],
      }),
    ).toThrow(/zero operations|cannot derive primitive/);
  });

  it("warns when external profile has coordinates >10000mm", () => {
    const out = printToFusion360Bridge.buildBridgeScript({
      profiles: [
        externalProfile([
          { x: 0, y: 0 },
          { x: 1_000_000, y: 0 },
          { x: 1_000_000, y: 1_000_000 },
        ]),
      ],
    });
    expect(out.warnings.some((w) => w.includes("outside reasonable range"))).toBe(true);
  });

  it("mixed source: depth dim from analysis applies to profile cut depth (=15mm)", () => {
    const out = printToFusion360Bridge.buildBridgeScript({
      analysis: makeAnalysis([dim("depth", 15)]),
      profiles: [holeProfile(6)],
    });
    expect(out.provenance.source).toBe("mixed");
    expect(out.parameters["extrude_depth"]?.value).toBe(15);
    expect(out.script).toMatch(/-15\s*\*\s*UNIT_FACTOR/);
  });
});

describe("PrintToFusion360Bridge — provenance + parameters round-trip", () => {
  it("provenance includes bridgeVersion, ISO timestamp, and counts", () => {
    const out = printToFusion360Bridge.buildBridgeScript({
      analysis: makeAnalysis([dim("diameter", 25)]),
      profiles: [holeProfile(6)],
    });
    expect(out.provenance.bridgeVersion).toBe(FUSION_BRIDGE_VERSION);
    expect(out.provenance.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    expect(out.provenance.profileCount).toBe(1);
    expect(out.provenance.dimensionCount).toBe(1);
    expect(out.provenance.source).toBe("mixed");
  });

  it("parameters include UNIT_FACTOR=1 (mm→cm = 0.1) and circle_radius=4", () => {
    const out = printToFusion360Bridge.buildBridgeScript({
      profiles: [holeProfile(8)],
      defaultDepth: 12,
    });
    expect(out.parameters["UNIT_FACTOR"]?.value).toBe(0.1);
    expect(out.parameters["circle_radius"]?.value).toBe(4);
    expect(out.parameters["extrude_depth"]?.value).toBe(12);
  });

  it("filename uses .py extension and includes script trailer with op/profile counts", () => {
    const out = printToFusion360Bridge.buildBridgeScript({
      profiles: [holeProfile(8)],
    });
    expect(out.filename.endsWith(".py")).toBe(true);
    expect(out.script).toContain("PRISM PrintToFusion360Bridge v1.0.0");
    expect(out.script).toContain("3 ops");
    expect(out.script).toContain("1 profiles");
  });
});
