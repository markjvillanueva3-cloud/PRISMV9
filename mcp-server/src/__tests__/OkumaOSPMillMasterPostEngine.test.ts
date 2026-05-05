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
  type MillTool,
  type MillMaterial,
  type PostMove,
} from "../engines/OkumaOSPMillMasterPostEngine.js";
import { CANONICAL_KIENZLE } from "../physics/constants.js";

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

// ---------------------------------------------------------------------------
// U-PPGOH02: postSingle simplified API (mirror of HurcoV11 U-PPGH11)
// ---------------------------------------------------------------------------

const POSTSINGLE_PROGRAM_BASE = 9000;
const POSTSINGLE_TOOL_NUM = 3;
const POSTSINGLE_DIA_MM = 10;
const POSTSINGLE_FLUTES = 4;
const POSTSINGLE_RPM = 8000;
const POSTSINGLE_FEED = 1500;
const POSTSINGLE_AP = 2;
const POSTSINGLE_ARC_R = 25;
const POSTSINGLE_ARC_X = 50;
const POSTSINGLE_ARC_Y = 50;
const POSTSINGLE_AGGRESSIVE_OUT_OF_RANGE = 99;

function postSingleMoves(): PostMove[] {
  return [
    { x: 0, y: 0, z: 5, type: "rapid" },
    { x: POSTSINGLE_ARC_X, y: 0, z: -POSTSINGLE_AP, type: "linear" },
    { x: POSTSINGLE_ARC_X, y: POSTSINGLE_ARC_Y, z: -POSTSINGLE_AP, type: "arc_cw", r: POSTSINGLE_ARC_R },
    { x: 0, y: POSTSINGLE_ARC_Y, z: -POSTSINGLE_AP, type: "linear" },
  ];
}

function findLine(gcode: string[], pred: (l: string) => boolean, label: string): string {
  const found = gcode.find(pred);
  if (found === undefined) {
    throw new Error(`findLine: no ${label} matching predicate in ${gcode.length} lines`);
  }
  return found;
}

function mustOkumaSheet<T>(v: T | undefined, label: string): T {
  if (v === undefined) throw new Error(`${label}: expected defined, got undefined`);
  return v;
}

describe("OkumaOSPMill — postSingle simplified API (U-PPGOH02)", () => {
  it("wraps a single PostMove array into a complete program with T<n> M6 emit", () => {
    const tool: MillTool = {
      number: POSTSINGLE_TOOL_NUM,
      diameter_mm: POSTSINGLE_DIA_MM,
      flutes: POSTSINGLE_FLUTES,
      description: "10MM CARBIDE",
      coating: "TiAlN",
      stickout_mm: 30,
    };
    const material: MillMaterial = { iso_group: "N", name: "6061-T6" };
    const result = okumaOSPMillMasterPostEngine.postSingle({
      toolpath: postSingleMoves(),
      material,
      tool,
      operation: "pocket",
      spindle_rpm: POSTSINGLE_RPM,
      feed_mm_min: POSTSINGLE_FEED,
      axial_depth_mm: POSTSINGLE_AP,
    }, { program_number: POSTSINGLE_PROGRAM_BASE + 1 });
    expect(result.tools_used).toEqual([POSTSINGLE_TOOL_NUM]);
    // OSP convention: T{n} on its own line, then M6
    expect(result.gcode.some(l => /^T3\b/.test(l))).toBe(true);
    expect(result.gcode.some(l => /^M6\b/.test(l))).toBe(true);
  });

  it("PostMove arc_cw with R is preserved through to G2 R# output (OSP dialect: unpadded G2)", () => {
    const result = okumaOSPMillMasterPostEngine.postSingle({
      toolpath: postSingleMoves(),
      material: { iso_group: "N" },
      tool: { number: 1, diameter_mm: 10, flutes: 4 },
      operation: "contour",
      spindle_rpm: 6000,
      feed_mm_min: 1000,
      axial_depth_mm: 2,
    }, { program_number: POSTSINGLE_PROGRAM_BASE + 2 });
    // OSP dialect emits unpadded G-codes ("G2", not "G02") — matches the
    // dialect cw_arc_code config in ControllerDialectEngine. \b after G2
    // ensures we don't accidentally match G20 (inch units) or G28 (home).
    const arc = findLine(result.gcode, l => /^G2\b/.test(l), "G2 line");
    expect(arc).toContain(`R${POSTSINGLE_ARC_R.toFixed(3)}`);
    expect(arc).toContain(`X${POSTSINGLE_ARC_X.toFixed(3)}`);
    expect(arc).toContain(`Y${POSTSINGLE_ARC_Y.toFixed(3)}`);
  });

  it("structured tool coating + stickout flow into setup_sheet entry by tool number", () => {
    const result = okumaOSPMillMasterPostEngine.postSingle({
      toolpath: postSingleMoves(),
      material: { iso_group: "N" },
      tool: { number: 9, diameter_mm: 8, flutes: 3, coating: "AlCrN", stickout_mm: 25 },
      operation: "pocket",
      spindle_rpm: 6000,
      feed_mm_min: 1000,
      axial_depth_mm: 2,
    }, { program_number: POSTSINGLE_PROGRAM_BASE + 3 });
    const t = mustOkumaSheet(result.setup_sheet, "postSingle setup_sheet").tools[0];
    expect(t.number).toBe(9);
    expect(t.coating).toBe("AlCrN");
    expect(t.stickout_mm).toBe(25);
    expect(t.diameter_mm).toBe(8);
  });

  it("forwards configOverrides — JM Die preset spread produces the M460V identifiers on setup_sheet", () => {
    const result = okumaOSPMillMasterPostEngine.postSingle({
      toolpath: postSingleMoves(),
      material: { iso_group: "P" },
      tool: { number: 4, diameter_mm: 12, flutes: 4 },
      operation: "pocket",
      spindle_rpm: 5000,
      feed_mm_min: 1200,
      axial_depth_mm: 2,
    }, {
      osp_family: "P300",
      program_number: POSTSINGLE_PROGRAM_BASE + 4,
      setup_sheet_machine_name: "Okuma Genos M460V-5AX",
      setup_sheet_controller_name: "OSP-P300MA-H",
    });
    const sheet = mustOkumaSheet(result.setup_sheet, "configOverride setup_sheet");
    expect(sheet.machine).toBe("Okuma Genos M460V-5AX");
    expect(sheet.controller).toBe("OSP-P300MA-H");
  });

  // U-PPGOH02 hardening: silent-disable guards. Each prevents a class of
  // caller mistake that would otherwise emit a malformed program.
  it("rejects empty toolpath (no useful program without coordinates)", () => {
    expect(() =>
      okumaOSPMillMasterPostEngine.postSingle({
        toolpath: [],
        material: { iso_group: "N" },
        tool: { number: 1, diameter_mm: 10, flutes: 4 },
        operation: "pocket",
        spindle_rpm: 6000,
        feed_mm_min: 1000,
        axial_depth_mm: 2,
      }, { program_number: POSTSINGLE_PROGRAM_BASE + 5 }),
    ).toThrow(/toolpath must contain at least one move/);
  });

  it("rejects tool.number=0 (invalid magazine slot)", () => {
    expect(() =>
      okumaOSPMillMasterPostEngine.postSingle({
        toolpath: postSingleMoves(),
        material: { iso_group: "N" },
        tool: { number: 0, diameter_mm: 10, flutes: 4 },
        operation: "pocket",
        spindle_rpm: 6000,
        feed_mm_min: 1000,
        axial_depth_mm: 2,
      }, { program_number: POSTSINGLE_PROGRAM_BASE + 6 }),
    ).toThrow(/invalid tool\.number=0/);
  });

  it("rejects NaN coordinate on any move (would emit NaN G-code)", () => {
    expect(() =>
      okumaOSPMillMasterPostEngine.postSingle({
        toolpath: [
          { x: 0, y: 0, z: 5, type: "rapid" },
          { x: Number.NaN, y: 10, z: -2, type: "linear" },
        ],
        material: { iso_group: "N" },
        tool: { number: 1, diameter_mm: 10, flutes: 4 },
        operation: "pocket",
        spindle_rpm: 6000,
        feed_mm_min: 1000,
        axial_depth_mm: 2,
      }, { program_number: POSTSINGLE_PROGRAM_BASE + 7 }),
    ).toThrow(/toolpath\[1\] has non-finite coordinate/);
  });

  it("rejects spindle_rpm<=0 (silent-disable guard against zero-cut conditions)", () => {
    expect(() =>
      okumaOSPMillMasterPostEngine.postSingle({
        toolpath: postSingleMoves(),
        material: { iso_group: "N" },
        tool: { number: 1, diameter_mm: 10, flutes: 4 },
        operation: "pocket",
        spindle_rpm: 0,
        feed_mm_min: 1000,
        axial_depth_mm: 2,
      }, { program_number: POSTSINGLE_PROGRAM_BASE + 8 }),
    ).toThrow(/spindle_rpm must be > 0/);
  });
});

// ---------------------------------------------------------------------------
// U-PPGOH03: op.tool structured shadowing on the verbose generateProgram path
// ---------------------------------------------------------------------------

const SHADOW_PROGRAM_BASE = 9100;
const SHADOW_TOOL_NUM = 5;
const SHADOW_DIA_MM = 8;
const SHADOW_FLUTES = 3;
const SHADOW_STRUCTURED_DESC = "STRUCTURED-NAME";
const SHADOW_FLAT_DESC = "FLAT-NAME";
const SHADOW_COATING = "AlCrN";
const SHADOW_STICKOUT_MM = 25;

describe("OkumaOSPMill — op.tool structured shadowing (U-PPGOH03)", () => {
  it("uses structured tool.description over flat tool_description in tool-length-comp emit", () => {
    const tool: MillTool = {
      number: SHADOW_TOOL_NUM,
      diameter_mm: SHADOW_DIA_MM,
      flutes: SHADOW_FLUTES,
      description: SHADOW_STRUCTURED_DESC,
    };
    const op: MillOperation = makeOp({
      tool_number: SHADOW_TOOL_NUM,
      tool_diameter_mm: SHADOW_DIA_MM,
      tool_flutes: SHADOW_FLUTES,
      tool_description: SHADOW_FLAT_DESC,
      tool,
    });
    const result = okumaOSPMillMasterPostEngine.generateProgram([op], {
      program_number: SHADOW_PROGRAM_BASE + 1,
    });
    // Default tlc mode is `G43_H` — emit `G43 H<n> (STRUCTURED-NAME)`. Flat name
    // must not appear anywhere in the program.
    const tlcLine = findLine(
      result.gcode,
      l => /^G43 H/.test(l),
      "G43 H tool-length-comp line",
    );
    expect(tlcLine).toContain(SHADOW_STRUCTURED_DESC);
    expect(result.gcode.some(l => l.includes(SHADOW_FLAT_DESC))).toBe(false);
  });

  it("structured tool.coating + tool.stickout_mm propagate into setup_sheet via the verbose path", () => {
    const tool: MillTool = {
      number: SHADOW_TOOL_NUM,
      diameter_mm: SHADOW_DIA_MM,
      flutes: SHADOW_FLUTES,
      coating: SHADOW_COATING,
      stickout_mm: SHADOW_STICKOUT_MM,
    };
    const op: MillOperation = makeOp({
      tool_number: SHADOW_TOOL_NUM,
      tool_diameter_mm: SHADOW_DIA_MM,
      tool_flutes: SHADOW_FLUTES,
      tool,
    });
    const result = okumaOSPMillMasterPostEngine.generateProgram([op], {
      program_number: SHADOW_PROGRAM_BASE + 2,
    });
    const sheet = mustOkumaSheet(result.setup_sheet, "verbose-path setup_sheet");
    const t = sheet.tools[0];
    expect(t.number).toBe(SHADOW_TOOL_NUM);
    expect(t.coating).toBe(SHADOW_COATING);
    expect(t.stickout_mm).toBe(SHADOW_STICKOUT_MM);
    expect(t.diameter_mm).toBe(SHADOW_DIA_MM);
  });

  it("flat-field caller (no op.tool) leaves coating/stickout undefined — backward-compat", () => {
    const op = makeOp({ tool_number: SHADOW_TOOL_NUM });
    const result = okumaOSPMillMasterPostEngine.generateProgram([op], {
      program_number: SHADOW_PROGRAM_BASE + 3,
    });
    const t = mustOkumaSheet(result.setup_sheet, "flat-path setup_sheet").tools[0];
    expect(t.coating === undefined).toBe(true);
    expect(t.stickout_mm === undefined).toBe(true);
  });

  it("throws when op.tool.number does not match flat tool_number (silent-reassignment guard)", () => {
    const tool: MillTool = {
      number: SHADOW_TOOL_NUM + 1,  // mismatch
      diameter_mm: SHADOW_DIA_MM,
      flutes: SHADOW_FLUTES,
    };
    const op = makeOp({ tool_number: SHADOW_TOOL_NUM, tool });
    expect(() =>
      okumaOSPMillMasterPostEngine.generateProgram([op], {
        program_number: SHADOW_PROGRAM_BASE + 4,
      }),
    ).toThrow(/structured tool\.number=6 does not match flat tool_number=5/);
  });
});

// ---------------------------------------------------------------------------
// U-PPGOH04: stickout deflection physics check
// ---------------------------------------------------------------------------

const STICKOUT_PROGRAM_BASE = 9200;
const STICKOUT_TOOL_NUM = 1;
const STICKOUT_DIA_6MM = 6;
const STICKOUT_FLUTES_3 = 3;
const STICKOUT_FAIL_MM = 30;            // 30/6 = 5x → fails (limit 4x)
const STICKOUT_PASS_MM = 18;            // 18/6 = 3x → passes (≤ 4x)
const STICKOUT_FAIL_RATIO = 5;
const STICKOUT_LIMIT_RATIO = 4;

describe("OkumaOSPMill — stickout deflection check (U-PPGOH04)", () => {
  it("appears only when op.tool.stickout_mm provided; fails when ratio > 4×D", () => {
    const tool: MillTool = {
      number: STICKOUT_TOOL_NUM,
      diameter_mm: STICKOUT_DIA_6MM,
      flutes: STICKOUT_FLUTES_3,
      stickout_mm: STICKOUT_FAIL_MM,
    };
    const withStickout = okumaOSPMillMasterPostEngine.generateProgram(
      [makeOp({ tool, tool_diameter_mm: STICKOUT_DIA_6MM, tool_flutes: STICKOUT_FLUTES_3 })],
      { program_number: STICKOUT_PROGRAM_BASE + 1 },
    );
    const stick = findCheck(withStickout.physics_checks, c => /stickout/.test(c.check));
    expect(stick.passed).toBe(false);
    expect(stick.value).toBe(STICKOUT_FAIL_RATIO);
    expect(stick.limit).toBe(STICKOUT_LIMIT_RATIO);
  });

  it("passes when stickout ratio ≤ 4×D (long-reach but within deflection envelope)", () => {
    const tool: MillTool = {
      number: STICKOUT_TOOL_NUM,
      diameter_mm: STICKOUT_DIA_6MM,
      flutes: STICKOUT_FLUTES_3,
      stickout_mm: STICKOUT_PASS_MM,
    };
    const result = okumaOSPMillMasterPostEngine.generateProgram(
      [makeOp({ tool, tool_diameter_mm: STICKOUT_DIA_6MM, tool_flutes: STICKOUT_FLUTES_3 })],
      { program_number: STICKOUT_PROGRAM_BASE + 2 },
    );
    const stick = findCheck(result.physics_checks, c => /stickout/.test(c.check));
    expect(stick.passed).toBe(true);
    expect(stick.value).toBe(STICKOUT_PASS_MM / STICKOUT_DIA_6MM);
  });

  it("flat-field caller (no op.tool) gets no stickout check entry — backward compat", () => {
    const result = okumaOSPMillMasterPostEngine.generateProgram(
      [makeOp({ tool_diameter_mm: STICKOUT_DIA_6MM, tool_flutes: STICKOUT_FLUTES_3 })],
      { program_number: STICKOUT_PROGRAM_BASE + 3 },
    );
    const stickAbsent = result.physics_checks.filter(c => /stickout/.test(c.check));
    expect(stickAbsent.length).toBe(0);
  });

  it("structured op.tool without stickout_mm also produces no stickout check (opt-in only)", () => {
    const tool: MillTool = {
      number: STICKOUT_TOOL_NUM,
      diameter_mm: STICKOUT_DIA_6MM,
      flutes: STICKOUT_FLUTES_3,
      // no stickout_mm
    };
    const result = okumaOSPMillMasterPostEngine.generateProgram(
      [makeOp({ tool, tool_diameter_mm: STICKOUT_DIA_6MM, tool_flutes: STICKOUT_FLUTES_3 })],
      { program_number: STICKOUT_PROGRAM_BASE + 4 },
    );
    const stickAbsent = result.physics_checks.filter(c => /stickout/.test(c.check));
    expect(stickAbsent.length).toBe(0);
  });
});

function findCheck<T extends { check: string }>(arr: T[], pred: (c: T) => boolean): T {
  const found = arr.find(pred);
  if (found === undefined) {
    throw new Error(`findCheck: no entry matching predicate in ${arr.length} checks`);
  }
  return found;
}

// ---------------------------------------------------------------------------
// U-PPGOH05: Kienzle-bounded feed clamp
// ---------------------------------------------------------------------------

const KIENZLE_PROGRAM_BASE = 9300;
const KIENZLE_MAX_FORCE_LOW = 1000;
const KIENZLE_MAX_FORCE_MID = 1500;
const KIENZLE_AP_HEAVY = 10;
const KIENZLE_AP_HEAVY_2 = 8;
const KIENZLE_FEED_HIGH = 4000;
const KIENZLE_FEED_HIGHER = 5000;
const KIENZLE_RPM = 4000;
const KIENZLE_RPM_LOW = 3000;
const KIENZLE_FLUTES_2 = 2;
const KIENZLE_TOLERANCE_FACTOR = 1.05;
const KIENZLE_LIGHT_FEED = 800;
const KIENZLE_LIGHT_AP = 0.5;

describe("OkumaOSPMill — Kienzle-bounded feed clamp (U-PPGOH05)", () => {
  it("reduces feed when predicted Fc exceeds max_cutting_force_N", () => {
    const result = okumaOSPMillMasterPostEngine.generateProgram([
      makeOp({
        material_iso: "P",
        axial_depth_mm: KIENZLE_AP_HEAVY,
        feed_mm_min: KIENZLE_FEED_HIGH,
        spindle_rpm: KIENZLE_RPM,
        tool_flutes: KIENZLE_FLUTES_2,
      }),
    ], {
      program_number: KIENZLE_PROGRAM_BASE + 1,
      max_cutting_force_N: KIENZLE_MAX_FORCE_LOW,
    });
    expect(result.feed_optimizations.length).toBe(1);
    const opt = result.feed_optimizations[0];
    expect(opt.original_feed_mm_min).toBe(KIENZLE_FEED_HIGH);
    expect(opt.optimized_feed_mm_min).toBeLessThan(KIENZLE_FEED_HIGH);
    expect(opt.reason).toMatch(/Kienzle Fc=\d+N exceeded 1000N/);
    expect(opt.label).toBe("KIENZLE-CLAMP");
  });

  it("never increases feed (light cut produces no Kienzle reduction entry)", () => {
    const result = okumaOSPMillMasterPostEngine.generateProgram([
      makeOp({
        material_iso: "N",
        axial_depth_mm: KIENZLE_LIGHT_AP,
        feed_mm_min: KIENZLE_LIGHT_FEED,
      }),
    ], { program_number: KIENZLE_PROGRAM_BASE + 2 });
    expect(result.feed_optimizations.length).toBe(0);
  });

  it("optimize_feeds:false disables Kienzle reduction even when force would exceed limit", () => {
    const result = okumaOSPMillMasterPostEngine.generateProgram([
      makeOp({
        material_iso: "P",
        axial_depth_mm: KIENZLE_AP_HEAVY,
        feed_mm_min: KIENZLE_FEED_HIGH,
        spindle_rpm: KIENZLE_RPM,
        tool_flutes: KIENZLE_FLUTES_2,
      }),
    ], {
      program_number: KIENZLE_PROGRAM_BASE + 3,
      max_cutting_force_N: KIENZLE_MAX_FORCE_LOW,
      optimize_feeds: false,
    });
    expect(result.feed_optimizations.length).toBe(0);
  });

  it("optimized feed produces Fc ≤ limit (verify bound by recomputing Kienzle)", () => {
    const op = makeOp({
      material_iso: "P",
      axial_depth_mm: KIENZLE_AP_HEAVY_2,
      feed_mm_min: KIENZLE_FEED_HIGHER,
      spindle_rpm: KIENZLE_RPM_LOW,
      tool_flutes: KIENZLE_FLUTES_2,
    });
    const maxF = KIENZLE_MAX_FORCE_MID;
    const result = okumaOSPMillMasterPostEngine.generateProgram([op], {
      program_number: KIENZLE_PROGRAM_BASE + 4,
      max_cutting_force_N: maxF,
    });
    expect(result.feed_optimizations.length).toBe(1);
    const optimized = result.feed_optimizations[0];
    const fzNew = optimized.optimized_feed_mm_min / (op.spindle_rpm * op.tool_flutes);
    const FcNew = CANONICAL_KIENZLE.P.kc1_1 * op.axial_depth_mm * Math.pow(fzNew, 1 - CANONICAL_KIENZLE.P.mc);
    expect(FcNew).toBeLessThanOrEqual(maxF * KIENZLE_TOLERANCE_FACTOR);
  });

  it("rejects max_cutting_force_N <= 0 (silent-disable guard)", () => {
    expect(() =>
      okumaOSPMillMasterPostEngine.generateProgram([makeOp()], {
        program_number: KIENZLE_PROGRAM_BASE + 5,
        max_cutting_force_N: 0,
      }),
    ).toThrow(/max_cutting_force_N must be > 0/);
  });

  it("block_id on Kienzle entry uses the same N-pad formula as block_annotations[]", () => {
    const result = okumaOSPMillMasterPostEngine.generateProgram([
      makeOp({
        material_iso: "P",
        axial_depth_mm: KIENZLE_AP_HEAVY,
        feed_mm_min: KIENZLE_FEED_HIGH,
        spindle_rpm: KIENZLE_RPM,
        tool_flutes: KIENZLE_FLUTES_2,
      }),
    ], {
      program_number: KIENZLE_PROGRAM_BASE + 6,
      max_cutting_force_N: KIENZLE_MAX_FORCE_LOW,
      n_number_pad_digits: 4,  // JM Die preset width
    });
    expect(result.feed_optimizations.length).toBe(1);
    const opt = result.feed_optimizations[0];
    // Pad-4 first op = N0100, matches block_annotations[0].block_id
    expect(opt.block_id).toBe("N0100");
    expect(result.block_annotations[0].block_id).toBe("N0100");
  });
});
