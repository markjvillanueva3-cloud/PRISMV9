/**
 * OkumaOSPMillMasterPostEngine unit tests — PPG-WIRE-MS5/U-PPGW-OkumaMill.
 *
 * Tests the engine in isolation (no sidecar/dispatcher round-trip — that
 * lives in OkumaOSPMillMasterPostEngine.SidecarIntegration.test.ts).
 *
 * Coverage:
 *   - Header / safe-start / G15 H{n} work-offset emission
 *   - N-label progression matches block_annotation block_id
 *   - P300 vs P500 family: G05.1 Q1 only when use_super_nurbs && P500
 *   - Tool change is two-line (Okuma convention, not Hurco-combined)
 *   - block_annotations[]: length, math, physics_basis, source_constants
 *   - Physics gate: Vc / chip-load / Kienzle Fc / spindle ceiling per ISO
 *   - Tribal-tip filtering (op-type / iso-group / osp-family gating)
 *   - getStats reports per-family controller string + features
 *
 * Per project safety rules (CLAUDE.md §SAFETY): NO inlined physics
 * constants (kc1_1, mc, Taylor C/n) — fixture S/F/ap/ae values are
 * positivity-guard inputs that drive the engine's labelling and physics
 * envelope, not material literals.
 */

import { describe, it, expect } from "vitest";

import {
  OkumaOSPMillMasterPostEngine,
  okumaOSPMillMasterPostEngine,
  type MillOperation,
  type OkumaOSPMillPostConfig,
} from "../engines/OkumaOSPMillMasterPostEngine.js";

const engine = new OkumaOSPMillMasterPostEngine();

function makeOp(overrides: Partial<MillOperation> = {}): MillOperation {
  return {
    operation_type: "pocket",
    tool_number: 1,
    tool_diameter_mm: 12,
    tool_flutes: 4,
    tool_description: "12mm carbide endmill",
    material_iso: "P",
    spindle_rpm: 4000,
    feed_mm_min: 800,
    axial_depth_mm: 2.0,
    radial_depth_mm: 6.0,
    coolant: "flood",
    coordinates: [
      { x: 0, y: 0, z: 5, type: "rapid" },
      { x: 0, y: 0, z: -2, type: "linear" },
      { x: 50, y: 0, z: -2, type: "linear" },
      { x: 50, y: 25, z: -2, type: "linear" },
      { x: 0, y: 25, z: -2, type: "linear" },
      { x: 0, y: 0, z: -2, type: "linear" },
      { x: 0, y: 0, z: 5, type: "rapid" },
    ],
    ...overrides,
  };
}

function makeCfg(overrides: Partial<OkumaOSPMillPostConfig> = {}): OkumaOSPMillPostConfig {
  return { program_number: 1234, osp_family: "P300", ...overrides };
}

// ============================================================================
// HEADER / SAFE-START / WORK OFFSET
// ============================================================================

describe("OkumaOSPMillMasterPostEngine — header & safe-start", () => {
  it("emits O{N} program number with parentheses comment", () => {
    const out = engine.generateProgram([makeOp()], makeCfg());
    expect(out.gcode[0]).toMatch(/^O1234 \(/);
    expect(out.gcode[0]).toContain("PRISM GENERATED");
  });

  it("emits MACHINE comment with explicit OSP family suffix", () => {
    const out300 = engine.generateProgram([makeOp()], makeCfg({ osp_family: "P300" }));
    const out500 = engine.generateProgram([makeOp()], makeCfg({ osp_family: "P500" }));
    expect(out300.gcode.some((l) => l.includes("OKUMA OSP-P300M"))).toBe(true);
    expect(out500.gcode.some((l) => l.includes("OKUMA OSP-P500M"))).toBe(true);
  });

  it("emits dialect-driven safe_start G90 G21 G17 G40 G80", () => {
    const out = engine.generateProgram([makeOp()], makeCfg());
    expect(out.gcode.some((l) => l === "G90 G21 G17 G40 G80")).toBe(true);
  });

  it("respects metric/inch units toggle", () => {
    const metric = engine.generateProgram([makeOp()], makeCfg({ units: "metric" }));
    const inch = engine.generateProgram([makeOp()], makeCfg({ units: "inch" }));
    expect(metric.gcode.some((l) => l === "G21")).toBe(true);
    expect(inch.gcode.some((l) => l === "G20")).toBe(true);
    expect(inch.gcode.some((l) => l === "G21")).toBe(false);
  });

  it("emits G15 H1 work-offset by default", () => {
    const out = engine.generateProgram([makeOp()], makeCfg());
    expect(out.gcode.some((l) => l.startsWith("G15 H1 "))).toBe(true);
  });

  it("emits G15 H{n} when work_offset_index is set", () => {
    const out = engine.generateProgram([makeOp()], makeCfg({ work_offset_index: 7 }));
    expect(out.gcode.some((l) => l.startsWith("G15 H7 "))).toBe(true);
    expect(out.gcode.some((l) => l.startsWith("G15 H1 "))).toBe(false);
  });
});

// ============================================================================
// SUPER-NURBS GATING (P500-only)
// ============================================================================

describe("OkumaOSPMillMasterPostEngine — Super-NURBS gating", () => {
  it("does NOT emit G05.1 Q1 on P300 even with use_super_nurbs=true", () => {
    const out = engine.generateProgram(
      [makeOp({ operation_type: "3d_surface" })],
      makeCfg({ osp_family: "P300", use_super_nurbs: true }),
    );
    expect(out.gcode.some((l) => l.startsWith("G05.1 Q1"))).toBe(false);
  });

  it("emits G05.1 Q1 + G05.1 Q0 bracket when P500 + use_super_nurbs=true", () => {
    const out = engine.generateProgram(
      [makeOp({ operation_type: "3d_surface" })],
      makeCfg({ osp_family: "P500", use_super_nurbs: true }),
    );
    expect(out.gcode.some((l) => l.startsWith("G05.1 Q1"))).toBe(true);
    expect(out.gcode.some((l) => l.startsWith("G05.1 Q0"))).toBe(true);
    expect(out.tribal_tips_applied.some((t) => t.includes("[super_nurbs]"))).toBe(true);
  });

  it("does NOT emit G05.1 Q1 on P500 when use_super_nurbs=false (default)", () => {
    const out = engine.generateProgram(
      [makeOp({ operation_type: "3d_surface" })],
      makeCfg({ osp_family: "P500" }),
    );
    expect(out.gcode.some((l) => l.startsWith("G05.1 Q1"))).toBe(false);
  });
});

// ============================================================================
// TOOL CHANGE — Okuma two-line convention
// ============================================================================

describe("OkumaOSPMillMasterPostEngine — tool change", () => {
  it("emits T{n} and M6 on separate lines (per dialect.tool_change_sequence)", () => {
    const out = engine.generateProgram([makeOp({ tool_number: 5 })], makeCfg());
    const tIdx = out.gcode.findIndex((l) => l === "T5");
    const m6Idx = out.gcode.findIndex((l) => l === "M6");
    expect(tIdx).toBeGreaterThan(0);
    expect(m6Idx).toBe(tIdx + 1);
  });

  it("does NOT combine into 'T{n} M6' line (Hurco-style)", () => {
    const out = engine.generateProgram([makeOp({ tool_number: 5 })], makeCfg());
    expect(out.gcode.some((l) => l === "T5 M6")).toBe(false);
  });

  it("emits G91 G28 Z0 retract before tool swap", () => {
    const out = engine.generateProgram([makeOp({ tool_number: 5 })], makeCfg());
    const retractIdx = out.gcode.findIndex((l) => l === "G91 G28 Z0");
    const tIdx = out.gcode.findIndex((l) => l === "T5");
    expect(retractIdx).toBeGreaterThan(0);
    expect(retractIdx).toBeLessThan(tIdx);
  });

  it("emits G43 H{n} tool-length comp after tool change", () => {
    const out = engine.generateProgram([makeOp({ tool_number: 5 })], makeCfg());
    expect(out.gcode.some((l) => l.startsWith("G43 H5"))).toBe(true);
  });
});

// ============================================================================
// SPINDLE-START LABEL — N-label progression matches block_annotation
// ============================================================================

describe("OkumaOSPMillMasterPostEngine — N-label progression", () => {
  it("single op: spindle-start labelled N100 with S/M3/F", () => {
    const out = engine.generateProgram(
      [makeOp({ spindle_rpm: 4000, feed_mm_min: 800 })],
      makeCfg(),
    );
    const spindleLine = out.gcode.find((l) => l.startsWith("N100 ")) ?? "";
    expect(spindleLine).toMatch(/^N100 S4000 M3 F800 /);
  });

  it("three ops: labels N100 / N110 / N120 in order", () => {
    const out = engine.generateProgram(
      [
        makeOp({ tool_number: 1, spindle_rpm: 4000, feed_mm_min: 800 }),
        makeOp({ tool_number: 2, spindle_rpm: 5000, feed_mm_min: 1000 }),
        makeOp({ tool_number: 3, spindle_rpm: 6000, feed_mm_min: 1200 }),
      ],
      makeCfg(),
    );
    const labels = ["N100", "N110", "N120"];
    for (const label of labels) {
      expect(out.gcode.some((l) => l.startsWith(`${label} S`))).toBe(true);
    }
  });

  it("block_annotation[i].block_id matches emitted N-label for that op", () => {
    const out = engine.generateProgram(
      [
        makeOp({ tool_number: 1 }),
        makeOp({ tool_number: 2 }),
        makeOp({ tool_number: 3 }),
      ],
      makeCfg(),
    );
    expect(out.block_annotations[0].block_id).toBe("N100");
    expect(out.block_annotations[1].block_id).toBe("N110");
    expect(out.block_annotations[2].block_id).toBe("N120");
  });
});

// ============================================================================
// BLOCK ANNOTATION — math + traceability
// ============================================================================

describe("OkumaOSPMillMasterPostEngine — block_annotations", () => {
  it("annotation count matches operation count", () => {
    const ops = [makeOp(), makeOp({ tool_number: 2 }), makeOp({ tool_number: 3 })];
    const out = engine.generateProgram(ops, makeCfg());
    expect(out.block_annotations).toHaveLength(3);
  });

  it("emitted.S_rpm / F_mmpm / ap_mm / ae_mm round-trip from input", () => {
    const out = engine.generateProgram(
      [
        makeOp({
          spindle_rpm: 4000,
          feed_mm_min: 800,
          axial_depth_mm: 2.5,
          radial_depth_mm: 5.5,
        }),
      ],
      makeCfg(),
    );
    const ann = out.block_annotations[0];
    expect(ann.emitted.S_rpm).toBe(4000);
    expect(ann.emitted.F_mmpm).toBe(800);
    expect(ann.emitted.ap_mm).toBe(2.5);
    expect(ann.emitted.ae_mm).toBe(5.5);
  });

  it("emitted.vc_mpm matches π·D·N/1000", () => {
    const out = engine.generateProgram(
      [makeOp({ tool_diameter_mm: 12, spindle_rpm: 4000 })],
      makeCfg(),
    );
    const expected = (Math.PI * 12 * 4000) / 1000;
    expect(out.block_annotations[0].emitted.vc_mpm).toBeCloseTo(expected, 6);
  });

  it("emitted.fpt_mm matches F/(N·z)", () => {
    const out = engine.generateProgram(
      [makeOp({ feed_mm_min: 800, spindle_rpm: 4000, tool_flutes: 4 })],
      makeCfg(),
    );
    const expected = 800 / (4000 * 4);
    expect(out.block_annotations[0].emitted.fpt_mm).toBeCloseTo(expected, 6);
  });

  it("physics_basis is 'kienzle'", () => {
    const out = engine.generateProgram([makeOp()], makeCfg());
    expect(out.block_annotations[0].physics_basis).toBe("kienzle");
  });

  it("source_constants references CANONICAL_KIENZLE.{iso} + CANONICAL_TAYLOR.{iso}", () => {
    const out = engine.generateProgram([makeOp({ material_iso: "M" })], makeCfg());
    const refs = out.block_annotations[0].source_constants;
    expect(refs).toContain("CANONICAL_KIENZLE.M");
    expect(refs).toContain("CANONICAL_TAYLOR.M");
  });

  it("tool_material defaults to 'carbide'", () => {
    const out = engine.generateProgram([makeOp()], makeCfg());
    expect(out.block_annotations[0].tool_material).toBe("carbide");
  });

  it("op_id format: op_{i+1}_{operation_type}", () => {
    const out = engine.generateProgram(
      [makeOp({ operation_type: "pocket" }), makeOp({ operation_type: "drill" })],
      makeCfg(),
    );
    expect(out.block_annotations[0].op_id).toBe("op_1_pocket");
    expect(out.block_annotations[1].op_id).toBe("op_2_drill");
  });

  it("preserves iso_group from operation", () => {
    const out = engine.generateProgram(
      [makeOp({ material_iso: "N" }), makeOp({ material_iso: "H" })],
      makeCfg(),
    );
    expect(out.block_annotations[0].iso_group).toBe("N");
    expect(out.block_annotations[1].iso_group).toBe("H");
  });
});

// ============================================================================
// PHYSICS GATE
// ============================================================================

describe("OkumaOSPMillMasterPostEngine — physics gate", () => {
  it("clean ISO-P op produces 4 physics_checks all passed", () => {
    const out = engine.generateProgram([makeOp()], makeCfg());
    expect(out.physics_checks).toHaveLength(4);
    expect(out.physics_checks.every((c) => c.passed)).toBe(true);
    expect(out.warnings).toHaveLength(0);
  });

  it("excessive RPM (above P300 ceiling 12000) produces failed spindle check", () => {
    const out = engine.generateProgram(
      [makeOp({ spindle_rpm: 14000 })],
      makeCfg({ osp_family: "P300" }),
    );
    const spindleCheck = out.physics_checks.find((c) => c.check.includes("Spindle"));
    expect(spindleCheck?.passed).toBe(false);
    expect(out.warnings.length).toBeGreaterThan(0);
  });

  it("P500 ceiling is 15000 — same 14000 RPM passes", () => {
    const out = engine.generateProgram(
      [makeOp({ spindle_rpm: 14000 })],
      makeCfg({ osp_family: "P500" }),
    );
    const spindleCheck = out.physics_checks.find((c) => c.check.includes("Spindle"));
    expect(spindleCheck?.passed).toBe(true);
  });

  it("max_spindle_rpm config override beats default ceiling", () => {
    const out = engine.generateProgram(
      [makeOp({ spindle_rpm: 14000 })],
      makeCfg({ osp_family: "P300", max_spindle_rpm: 20000 }),
    );
    const spindleCheck = out.physics_checks.find((c) => c.check.includes("Spindle"));
    expect(spindleCheck?.passed).toBe(true);
  });

  it("starved chip-load fails fz check (below floor)", () => {
    const out = engine.generateProgram(
      [makeOp({ feed_mm_min: 100, spindle_rpm: 4000, tool_flutes: 4 })],
      makeCfg(),
    );
    const fzCheck = out.physics_checks.find((c) => c.check.includes("Chip load"));
    expect(fzCheck?.passed).toBe(false);
  });

  it("aluminum (ISO-N) tolerates higher chip-load than steel ceiling", () => {
    const out = engine.generateProgram(
      [
        makeOp({
          material_iso: "N",
          feed_mm_min: 1200,
          spindle_rpm: 4000,
          tool_flutes: 2,
        }),
      ],
      makeCfg(),
    );
    const fzCheck = out.physics_checks.find((c) => c.check.includes("Chip load"));
    expect(fzCheck?.passed).toBe(true);
  });

  it("Kienzle Fc check value scales with axial depth of cut", () => {
    const light = engine.generateProgram([makeOp({ axial_depth_mm: 1.0 })], makeCfg());
    const heavy = engine.generateProgram([makeOp({ axial_depth_mm: 5.0 })], makeCfg());
    const fcLight = light.physics_checks.find((c) => c.check.includes("Cutting force"));
    const fcHeavy = heavy.physics_checks.find((c) => c.check.includes("Cutting force"));
    expect(fcLight?.value ?? 0).toBeGreaterThan(0);
    expect(fcHeavy?.value ?? 0).toBeGreaterThan(fcLight?.value ?? 0);
  });
});

// ============================================================================
// TRIBAL KNOWLEDGE
// ============================================================================

describe("OkumaOSPMillMasterPostEngine — tribal-tip filtering", () => {
  it("[work_offset] tip applies to all op-types", () => {
    const out = engine.generateProgram([makeOp({ operation_type: "drill" })], makeCfg());
    expect(out.tribal_tips_applied.some((t) => t.startsWith("[work_offset]"))).toBe(true);
  });

  it("[hardened] tip fires only for ISO-H material", () => {
    const out_p = engine.generateProgram(
      [makeOp({ material_iso: "P", operation_type: "contour" })],
      makeCfg(),
    );
    const out_h = engine.generateProgram(
      [makeOp({ material_iso: "H", operation_type: "contour" })],
      makeCfg(),
    );
    expect(out_p.tribal_tips_applied.some((t) => t.startsWith("[hardened]"))).toBe(false);
    expect(out_h.tribal_tips_applied.some((t) => t.startsWith("[hardened]"))).toBe(true);
  });

  it("[aluminum] tip fires only for ISO-N + matching op-type", () => {
    const out = engine.generateProgram(
      [makeOp({ material_iso: "N", operation_type: "pocket" })],
      makeCfg(),
    );
    expect(out.tribal_tips_applied.some((t) => t.startsWith("[aluminum]"))).toBe(true);
  });

  it("[super_nurbs] tip fires only when P500 + use_super_nurbs enabled", () => {
    const noNurbs = engine.generateProgram(
      [makeOp({ operation_type: "3d_surface" })],
      makeCfg({ osp_family: "P500", use_super_nurbs: false }),
    );
    const withNurbs = engine.generateProgram(
      [makeOp({ operation_type: "3d_surface" })],
      makeCfg({ osp_family: "P500", use_super_nurbs: true }),
    );
    const wrongFamily = engine.generateProgram(
      [makeOp({ operation_type: "3d_surface" })],
      makeCfg({ osp_family: "P300", use_super_nurbs: true }),
    );
    expect(noNurbs.tribal_tips_applied.some((t) => t.startsWith("[super_nurbs]"))).toBe(false);
    expect(withNurbs.tribal_tips_applied.some((t) => t.startsWith("[super_nurbs]"))).toBe(true);
    expect(wrongFamily.tribal_tips_applied.some((t) => t.startsWith("[super_nurbs]"))).toBe(false);
  });
});

// ============================================================================
// OUTPUT INVARIANTS
// ============================================================================

describe("OkumaOSPMillMasterPostEngine — output invariants", () => {
  it("tools_used is sorted unique tool numbers", () => {
    const out = engine.generateProgram(
      [
        makeOp({ tool_number: 5 }),
        makeOp({ tool_number: 2 }),
        makeOp({ tool_number: 5 }),
        makeOp({ tool_number: 8 }),
      ],
      makeCfg(),
    );
    expect(out.tools_used).toEqual([2, 5, 8]);
  });

  it("total_lines matches gcode array length", () => {
    const out = engine.generateProgram([makeOp()], makeCfg());
    expect(out.total_lines).toBe(out.gcode.length);
  });

  it("program_number echoes input config", () => {
    const out = engine.generateProgram([makeOp()], makeCfg({ program_number: 7777 }));
    expect(out.program_number).toBe(7777);
  });

  it("program ends with M30", () => {
    const out = engine.generateProgram([makeOp()], makeCfg());
    expect(out.gcode[out.gcode.length - 1]).toBe("M30");
  });

  it("estimated_cycle_min is positive", () => {
    const out = engine.generateProgram([makeOp()], makeCfg());
    expect(out.estimated_cycle_min).toBeGreaterThan(0);
  });
});

// ============================================================================
// SINGLETON + getStats
// ============================================================================

describe("OkumaOSPMillMasterPostEngine — singleton + introspection", () => {
  it("exported singleton is an instance of the class", () => {
    expect(okumaOSPMillMasterPostEngine).toBeInstanceOf(OkumaOSPMillMasterPostEngine);
  });

  it("getStats('P300') reports OSP-P300M controller", () => {
    const stats = engine.getStats("P300");
    expect(stats.controller).toBe("OSP-P300M");
    expect(stats.machine).toContain("MB-V");
    expect(stats.features.some((f) => f.includes("Super-NURBS"))).toBe(false);
  });

  it("getStats('P500') reports OSP-P500M controller + 5-axis features", () => {
    const stats = engine.getStats("P500");
    expect(stats.controller).toBe("OSP-P500M");
    expect(stats.machine).toContain("5-axis");
    expect(stats.features.some((f) => f.includes("Super-NURBS"))).toBe(true);
    expect(stats.features.some((f) => f.includes("TCPC"))).toBe(true);
  });

  it("tribal_tips count is positive (engine has at least one tip)", () => {
    expect(engine.getStats().tribal_tips).toBeGreaterThan(0);
  });
});

// ============================================================================
// NON-FINITE EMIT GUARD (U-PP-NONFINITE-EMIT-SWEEP) -- a NaN/Infinity coordinate,
// feed, or arc param must never leak a literal XNaN/FInfinity/IInfinity the OSP
// control rejects. Sibling of the RokuRoku/HaasNGC/OkumaB250-lathe fixes (R15).
// ============================================================================
describe("OkumaOSPMillMasterPostEngine -- non-finite emit guard (U-PP-NONFINITE-EMIT-SWEEP)", () => {
  const joined = (out: { gcode: string[] }) => out.gcode.join("\n");

  it("[regression] finite coordinates emit real motion with NO non-finite warning (byte path unchanged)", () => {
    const out = engine.generateProgram([makeOp()], makeCfg());
    expect(out.gcode.some((l) => /X50\.000 Y0\.000/.test(l))).toBe(true);
    expect(out.warnings.some((w) => w.includes("non-finite"))).toBe(false);
    expect(joined(out)).not.toContain("SKIPPED");
  });

  it("NaN X coordinate is skipped + warned -- no literal XNaN in G-code", () => {
    const out = engine.generateProgram([
      makeOp({ coordinates: [
        { x: 0, y: 0, z: 5, type: "rapid" },
        { x: NaN, y: 0, z: -2, type: "linear" },
        { x: 50, y: 0, z: -2, type: "linear" },
      ] }),
    ], makeCfg());
    expect(joined(out)).not.toContain("XNaN");
    expect(joined(out)).not.toContain("NaN");
    expect(out.warnings.some((w) => w.includes("non-finite XYZ"))).toBe(true);
    expect(out.gcode.some((l) => l.includes("NON-FINITE COORD SKIPPED"))).toBe(true);
    // the surrounding finite move still emits (only the bad move is dropped)
    expect(out.gcode.some((l) => /X50\.000/.test(l))).toBe(true);
  });

  it("Infinity Z coordinate is skipped -- no literal ZInfinity", () => {
    const out = engine.generateProgram([
      makeOp({ coordinates: [
        { x: 0, y: 0, z: Infinity, type: "rapid" },
        { x: 10, y: 10, z: -1, type: "linear" },
      ] }),
    ], makeCfg());
    expect(joined(out)).not.toContain("Infinity");
    expect(out.warnings.some((w) => w.includes("non-finite XYZ"))).toBe(true);
  });

  it("non-finite feed_mm_min emits a flagged F token (never FNaN/FInfinity) + warns", () => {
    const out = engine.generateProgram([makeOp({ feed_mm_min: Infinity })], makeCfg());
    expect(joined(out)).not.toContain("FInfinity");
    expect(joined(out)).not.toContain("FNaN");
    expect(out.warnings.some((w) => w.includes("feed_mm_min") && w.includes("non-finite"))).toBe(true);
  });

  it("non-finite arc I/J is omitted -- no literal IInfinity/JNaN", () => {
    const out = engine.generateProgram([
      makeOp({
        coordinates: [
          { x: 0, y: 0, z: -1, type: "linear" },
          { x: 10, y: 10, z: -1, type: "arc_cw" },
        ],
        arc_data: [{}, { i: Infinity, j: NaN }],
      }),
    ], makeCfg());
    expect(joined(out)).not.toContain("IInfinity");
    expect(joined(out)).not.toContain("Infinity");
    expect(joined(out)).not.toContain("NaN");
    expect(out.warnings.some((w) => w.includes("non-finite I/J"))).toBe(true);
  });
});

// ============================================================================
// DRILLING CANNED CYCLES (op.cycle field -- additive, dialect-code sourced)
//
// G-codes come from ControllerDialectEngine okuma_osp_p300 canned_cycles DB:
//   drill->G81, peck->G83 (peck_drill), chip_break->G73 (deep_hole),
//   tap->G84, bore->G85, cancel->G80
// The first cycle line is BARE (no XY) -- the approach block positions there.
// Subsequent holes are modal X Y. G80 cancels.
// Absent op.cycle -> byte-identical long-hand move list (additive invariant).
// ============================================================================
describe("OkumaOSPMillMasterPostEngine -- drilling canned cycles", () => {
  const cfg = makeCfg({ osp_family: "P300" });
  const gcode = (out: { gcode: string[] }) => out.gcode.join("\n");

  // Base drill op with a single hole at (10, 20). Depth -12 mm, R-plane 2 mm.
  function makeDrillOp(overrides: Partial<MillOperation> = {}): MillOperation {
    return {
      operation_type: "drill",
      tool_number: 3,
      tool_diameter_mm: 8,
      tool_flutes: 2,
      material_iso: "P",
      spindle_rpm: 1200,
      feed_mm_min: 120,
      axial_depth_mm: 12,
      coolant: "flood",
      coordinates: [
        { x: 10, y: 20, z: 5, type: "rapid" },  // approach -- bare cycle drills here
      ],
      ...overrides,
    };
  }

  // (a) drill op WITH cycle:{type:"drill"} -> G81 line + G80 cancel
  it("drill cycle emits G81 bare cycle line and G80 cancel", () => {
    const op = makeDrillOp({
      cycle: { type: "drill", depth_mm: -12, retract_mm: 2 },
    });
    const out = engine.generateProgram([op], cfg);
    const gc = gcode(out);
    // Dialect-sourced G81 with Z depth, R retract, and feed
    expect(gc).toContain("G81");
    expect(gc).toContain("Z-12.000");
    expect(gc).toContain("R2.000");
    expect(gc).toContain("F120");
    // Cancel
    expect(gc).toContain("G80");
    // No long-hand linear moves for the drill point
    expect(gc).not.toMatch(/G1 X10\.000 Y20\.000/);
    // Retract mode defaults to G99
    expect(gc).toContain("G99");
  });

  // (b) peck -> G83 + Q peck word
  it("peck cycle emits G83 with Q peck increment", () => {
    const op = makeDrillOp({
      cycle: { type: "peck", depth_mm: -15, retract_mm: 2, peck_mm: 3 },
    });
    const out = engine.generateProgram([op], cfg);
    const gc = gcode(out);
    // Dialect-sourced G83 (peck_drill)
    expect(gc).toContain("G83");
    expect(gc).toContain("Z-15.000");
    expect(gc).toContain("R2.000");
    expect(gc).toContain("Q3.000");
    expect(gc).toContain("G80");
  });

  // (c) ADDITIVE INVARIANT: drill op WITHOUT cycle field -> same long-hand
  //     move list as before this change (no G8x codes anywhere)
  it("drill op WITHOUT cycle field emits long-hand moves (no G8x) -- additive invariant", () => {
    const opNoCycle = makeDrillOp(); // no cycle field
    const out = engine.generateProgram([opNoCycle], cfg);
    const gc = gcode(out);
    // Must NOT emit any canned cycle G-code
    expect(gc).not.toContain("G81");
    expect(gc).not.toContain("G83");
    // No standalone G80 cancel line (G80 inside safe_start G90..G80 is fine)
    expect(out.gcode.some((l) => l.trim() === "G80")).toBe(false);
    // Must emit the long-hand rapid move from coordinates[]
    expect(gc).toContain("G0 X10.000 Y20.000 Z5.000");
  });

  // (d) 4-hole pattern -> modal X Y for holes 2..4
  it("4-hole pattern emits bare first-hole cycle then modal X Y for remaining holes", () => {
    const op = makeDrillOp({
      cycle: { type: "drill", depth_mm: -10, retract_mm: 2 },
      coordinates: [
        { x: 10, y: 0, z: 5, type: "rapid" },
        { x: 30, y: 0, z: 5, type: "rapid" },
        { x: 50, y: 0, z: 5, type: "rapid" },
        { x: 70, y: 0, z: 5, type: "rapid" },
      ],
    });
    const out = engine.generateProgram([op], cfg);
    const gc = gcode(out);
    // First-hole cycle line (BARE -- no X/Y on the cycle line itself)
    expect(gc).toContain("G99 G81 Z-10.000 R2.000 F120");
    // Modal positions for holes 2, 3, 4
    expect(gc).toContain("X30.000 Y0.000");
    expect(gc).toContain("X50.000 Y0.000");
    expect(gc).toContain("X70.000 Y0.000");
    // Exactly one standalone G80 cancel line (safe_start embeds G80 inside a longer line)
    expect(out.gcode.filter((l) => l.trim() === "G80").length).toBe(1);
  });

  // (e) chip_break -> G73 (deep_hole in dialect DB)
  it("chip_break cycle emits G73 with Q", () => {
    const op = makeDrillOp({
      cycle: { type: "chip_break", depth_mm: -20, retract_mm: 2, peck_mm: 5 },
    });
    const out = engine.generateProgram([op], cfg);
    const gc = gcode(out);
    expect(gc).toContain("G73");
    expect(gc).toContain("Q5.000");
    expect(gc).toContain("G80");
  });

  // (f) peck cycle missing peck_mm -> downgraded to G81 + warning
  it("peck cycle missing peck_mm downgrades to G81 and warns", () => {
    const op = makeDrillOp({
      cycle: { type: "peck", depth_mm: -12, retract_mm: 2 }, // no peck_mm
    });
    const out = engine.generateProgram([op], cfg);
    const gc = gcode(out);
    expect(gc).toContain("G81"); // downgraded
    expect(gc).not.toContain("G83");
    expect(out.warnings.some((w) => w.includes("peck") && w.includes("downgraded"))).toBe(true);
  });

  // (g) bore op with cycle -> G85
  it("bore op with cycle:{type:bore} emits G85", () => {
    const op: MillOperation = {
      ...makeDrillOp(),
      operation_type: "bore",
      cycle: { type: "bore", depth_mm: -8, retract_mm: 2 },
    };
    const out = engine.generateProgram([op], cfg);
    const gc = gcode(out);
    expect(gc).toContain("G85");
    expect(gc).toContain("Z-8.000");
    expect(gc).toContain("G80");
  });

  // (h) G98 retract mode -> emits G98 not G99
  it("retract_mode:initial emits G98 instead of G99", () => {
    const op = makeDrillOp({
      cycle: { type: "drill", depth_mm: -10, retract_mm: 2, retract_mode: "initial" },
    });
    const out = engine.generateProgram([op], cfg);
    const gc = gcode(out);
    expect(gc).toContain("G98");
    expect(gc).not.toContain("G99 G81");
  });
});
