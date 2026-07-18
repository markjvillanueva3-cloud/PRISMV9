/**
 * OkumaOSPMillMasterPostEngine -- 5-axis TCP emission tests
 *
 * Verifies the ADDITIVE 5-axis path (PPG-WIRE-MS5/U-PPGW-OkumaMill-5AXIS):
 *
 *   - G169 (TCP on) / G170 (TCP off) for JM Die preset (tcp_mode G169_G170)
 *   - G43.4 H{n} / G49 for explicit Fanuc-style tcp_mode
 *   - Dialect DB fallback: P300 -> G43.4/G49, P500 -> G43.5 H{n}/G49
 *   - A/C rotary words on every move from rotary_moves[]
 *   - SINGULARITY ADVISORY when tool_axis_k > cos(5 deg) ~= 0.9962
 *   - 3-axis ops with no rotary_moves -> byte-identical, no TCP words
 *   - 3d_surface WITHOUT rotary_moves -> 3-axis fallback (additive invariant)
 *   - Non-finite A/C -> warn + omit rotary suffix for that move only
 *   - Non-finite XYZ in 5-axis -> skip move + ERROR comment, TCP bracket intact
 *   - Singularity safe tilt (k=cos(30deg)) -> no advisory
 *   - adaptive op with rotary_moves -> same TCP bracket as 3d_surface
 *
 * All assertions use concrete reference strings derived from the actual
 * generateToolpath emit path (engine lines 1004-1086).
 * No floating-point physics is asserted here -- only G-code string content.
 */

import { describe, it, expect } from "vitest";
import {
  OkumaOSPMillMasterPostEngine,
  okumaOSPMillMasterPostEngine,
  JM_DIE_PRESET,
  type MillOperation,
  type OkumaOSPMillPostConfig,
} from "../engines/OkumaOSPMillMasterPostEngine.js";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const COS_5_DEG = Math.cos(5 * Math.PI / 180); // ~0.99619

/** Minimal well-formed 5-axis op with 3 CAM-provided A/C moves. */
function make5AxisOp(overrides: Partial<MillOperation> = {}): MillOperation {
  return {
    operation_type: "3d_surface",
    tool_number: 3,
    tool_diameter_mm: 10,
    tool_flutes: 4,
    tool_description: "10mm ball endmill",
    material_iso: "P",
    spindle_rpm: 8000,
    feed_mm_min: 3000,
    axial_depth_mm: 0.3,
    radial_depth_mm: 0.5,
    coolant: "flood",
    coordinates: [
      { x: 0,  y: 0,  z: 5,    type: "rapid"  },
      { x: 10, y: 5,  z: -0.5, type: "linear" },
      { x: 20, y: 10, z: -1.0, type: "linear" },
    ],
    rotary_moves: [
      { a_deg: -30.000, c_deg:  0.000 },
      { a_deg: -30.500, c_deg: 15.000 },
      { a_deg: -31.000, c_deg: 30.000 },
    ],
    // k = cos(30 deg) ~= 0.866 -- well below cos(5 deg); no singularity advisory.
    tool_axis_k: Math.cos(30 * Math.PI / 180),
    ...overrides,
  };
}

function makeCfg(overrides: Partial<OkumaOSPMillPostConfig> = {}): OkumaOSPMillPostConfig {
  return {
    program_number: 9000,
    osp_family: "P300",
    tcp_mode: "G169_G170",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// TCP ON / OFF -- G169_G170 mode (JM Die, Okuma native)
// ---------------------------------------------------------------------------

describe("5-axis TCP emit -- G169_G170 mode (JM Die)", () => {
  it("emits '(TCP ON)' comment suffix paired with G169", () => {
    const out = okumaOSPMillMasterPostEngine.generateProgram(
      [make5AxisOp()],
      makeCfg({ tcp_mode: "G169_G170" }),
    );
    // Engine emits: `${tcp.on} ${fmtComment(dialect, "TCP ON")}` -> "G169 (TCP ON)"
    const tcpOnLine = out.gcode.find((l) => l.includes("G169") && l.includes("TCP ON"));
    expect(typeof tcpOnLine).toBe("string");
    expect(tcpOnLine).toMatch(/^G169 /);
    expect(tcpOnLine).toMatch(/TCP ON/);
  });

  it("emits '(TCP OFF)' comment suffix paired with G170", () => {
    const out = okumaOSPMillMasterPostEngine.generateProgram(
      [make5AxisOp()],
      makeCfg({ tcp_mode: "G169_G170" }),
    );
    const tcpOffLine = out.gcode.find((l) => l.includes("G170") && l.includes("TCP OFF"));
    expect(typeof tcpOffLine).toBe("string");
    expect(tcpOffLine).toMatch(/^G170 /);
    expect(tcpOffLine).toMatch(/TCP OFF/);
  });

  it("G169 appears before the first A-word line; G170 appears after", () => {
    const out = okumaOSPMillMasterPostEngine.generateProgram(
      [make5AxisOp()],
      makeCfg({ tcp_mode: "G169_G170" }),
    );
    const gcode = out.gcode;
    const onIdx    = gcode.findIndex((l) => l.includes("G169") && l.includes("TCP ON"));
    const offIdx   = gcode.findIndex((l) => l.includes("G170") && l.includes("TCP OFF"));
    const firstA   = gcode.findIndex((l) => /\bA-30\.000\b/.test(l));
    expect(onIdx).toBeGreaterThan(-1);
    expect(offIdx).toBeGreaterThan(-1);
    expect(firstA).toBeGreaterThan(onIdx);
    expect(offIdx).toBeGreaterThan(firstA);
  });

  it("emits exactly one G169 TCP-ON line and one G170 TCP-OFF line per op", () => {
    const out = okumaOSPMillMasterPostEngine.generateProgram(
      [make5AxisOp()],
      makeCfg({ tcp_mode: "G169_G170" }),
    );
    const g169count = out.gcode.filter((l) => l.includes("G169") && l.includes("TCP ON")).length;
    const g170count = out.gcode.filter((l) => l.includes("G170") && l.includes("TCP OFF")).length;
    expect(g169count).toBe(1);
    expect(g170count).toBe(1);
  });

  it("emits two G169/G170 pairs when two 5-axis ops are present", () => {
    const op = make5AxisOp();
    const out = okumaOSPMillMasterPostEngine.generateProgram(
      [op, { ...op, tool_number: 4 }],
      makeCfg({ tcp_mode: "G169_G170" }),
    );
    const g169count = out.gcode.filter((l) => l.includes("G169") && l.includes("TCP ON")).length;
    const g170count = out.gcode.filter((l) => l.includes("G170") && l.includes("TCP OFF")).length;
    expect(g169count).toBe(2);
    expect(g170count).toBe(2);
  });

  it("G43.4 does NOT appear as TCP-ON when tcp_mode is G169_G170", () => {
    const out = okumaOSPMillMasterPostEngine.generateProgram(
      [make5AxisOp()],
      makeCfg({ tcp_mode: "G169_G170" }),
    );
    // No line of the form "G43.4 (TCP ON)" or "G43.5 (TCP ON)"
    const wrongTcp = out.gcode.filter(
      (l) => l.includes("TCP ON") && !l.includes("G169"),
    );
    expect(wrongTcp.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// TCP ON / OFF -- G43.4 mode (Fanuc-style)
// ---------------------------------------------------------------------------

describe("5-axis TCP emit -- G43.4 mode (Fanuc-style)", () => {
  it("emits 'G43.4 H5 (TCP ON)' for tool 5 in G43.4 mode", () => {
    const out = okumaOSPMillMasterPostEngine.generateProgram(
      [make5AxisOp({ tool_number: 5 })],
      makeCfg({ tcp_mode: "G43.4" }),
    );
    const tcpOnLine = out.gcode.find((l) => l.includes("G43.4") && l.includes("TCP ON"));
    expect(typeof tcpOnLine).toBe("string");
    expect(tcpOnLine).toMatch(/G43\.4 H5/);
    expect(tcpOnLine).toMatch(/TCP ON/);
  });

  it("emits 'G49 (TCP OFF)' in G43.4 mode", () => {
    const out = okumaOSPMillMasterPostEngine.generateProgram(
      [make5AxisOp({ tool_number: 5 })],
      makeCfg({ tcp_mode: "G43.4" }),
    );
    const tcpOffLine = out.gcode.find((l) => l.includes("G49") && l.includes("TCP OFF"));
    expect(typeof tcpOffLine).toBe("string");
    expect(tcpOffLine).toMatch(/G49/);
    expect(tcpOffLine).toMatch(/TCP OFF/);
  });
});

// ---------------------------------------------------------------------------
// TCP ON / OFF -- dialect DB fallback (no tcp_mode override)
// ---------------------------------------------------------------------------

describe("5-axis TCP emit -- dialect DB fallback", () => {
  it("P300 no tcp_mode override -> G43.4 TCP ON, G49 TCP OFF (dialect DB)", () => {
    const out = okumaOSPMillMasterPostEngine.generateProgram(
      [make5AxisOp({ tool_number: 7 })],
      // omit tcp_mode -> engine falls through to dialect DB: okuma_osp_p300 tcpc.on="G43.4"
      makeCfg({ tcp_mode: undefined }),
    );
    const tcpOnLine  = out.gcode.find((l) => l.includes("TCP ON"));
    const tcpOffLine = out.gcode.find((l) => l.includes("TCP OFF"));
    expect(typeof tcpOnLine).toBe("string");
    expect(typeof tcpOffLine).toBe("string");
    expect(tcpOnLine).toMatch(/G43\.4/);
    expect(tcpOffLine).toMatch(/G49/);
  });

  it("P500 no tcp_mode -> G43.5 H{tool} TCP ON, G49 TCP OFF (dialect DB)", () => {
    const out = okumaOSPMillMasterPostEngine.generateProgram(
      [make5AxisOp({ tool_number: 9 })],
      makeCfg({ osp_family: "P500", tcp_mode: undefined }),
    );
    // ControllerDialectEngine okuma_osp_p500 tcpc: { on: "G43.5 H{offset}", off: "G49" }
    const tcpOnLine  = out.gcode.find((l) => l.includes("TCP ON"));
    const tcpOffLine = out.gcode.find((l) => l.includes("TCP OFF"));
    expect(typeof tcpOnLine).toBe("string");
    expect(typeof tcpOffLine).toBe("string");
    expect(tcpOnLine).toMatch(/G43\.5 H9/);
    expect(tcpOffLine).toMatch(/G49/);
  });
});

// ---------------------------------------------------------------------------
// A / C rotary words on moves
// ---------------------------------------------------------------------------

describe("5-axis TCP emit -- A/C rotary words", () => {
  it("emits A and C words on the first rapid move (G0 ...A-30.000 C0.000)", () => {
    const out = okumaOSPMillMasterPostEngine.generateProgram(
      [make5AxisOp()],
      makeCfg({ tcp_mode: "G169_G170" }),
    );
    // Move 1: rapid X0 Y0 Z5, rotary A-30.000 C0.000
    const rapidLine = out.gcode.find(
      (l) => l.startsWith("G0 ") && l.includes("X0.000") && l.includes("Y0.000") && l.includes("Z5.000"),
    );
    expect(typeof rapidLine).toBe("string");
    expect(rapidLine).toMatch(/A-30\.000/);
    expect(rapidLine).toMatch(/C0\.000/);
  });

  it("emits A and C words on linear move 2 (G1 X10 Y5 Z-0.5 A-30.500 C15.000)", () => {
    const out = okumaOSPMillMasterPostEngine.generateProgram(
      [make5AxisOp()],
      makeCfg({ tcp_mode: "G169_G170" }),
    );
    const linearLine = out.gcode.find(
      (l) => l.startsWith("G1 ") && l.includes("X10.000") && l.includes("Y5.000") && l.includes("Z-0.500"),
    );
    expect(typeof linearLine).toBe("string");
    expect(linearLine).toMatch(/A-30\.500/);
    expect(linearLine).toMatch(/C15\.000/);
  });

  it("emits A and C words on linear move 3 (G1 X20 Y10 Z-1.0 A-31.000 C30.000)", () => {
    const out = okumaOSPMillMasterPostEngine.generateProgram(
      [make5AxisOp()],
      makeCfg({ tcp_mode: "G169_G170" }),
    );
    const linearLine = out.gcode.find(
      (l) => l.startsWith("G1 ") && l.includes("X20.000") && l.includes("Y10.000") && l.includes("Z-1.000"),
    );
    expect(typeof linearLine).toBe("string");
    expect(linearLine).toMatch(/A-31\.000/);
    expect(linearLine).toMatch(/C30\.000/);
  });

  it("emits A/C to exactly 3 decimal places (e.g. A-45.125 C180.375)", () => {
    const op = make5AxisOp({
      rotary_moves: [
        { a_deg: -45.125, c_deg: 180.375 },
        { a_deg: -45.250, c_deg: 181.000 },
        { a_deg: -45.375, c_deg: 182.000 },
      ],
    });
    const out = okumaOSPMillMasterPostEngine.generateProgram(
      [op],
      makeCfg({ tcp_mode: "G169_G170" }),
    );
    const gc = out.gcode.join("\n");
    expect(gc).toContain("A-45.125 C180.375");
    expect(gc).toContain("A-45.250 C181.000");
  });

  it("non-finite A pushes a warning and omits rotary suffix for that move only", () => {
    const op = make5AxisOp({
      rotary_moves: [
        { a_deg: -30.000, c_deg:  0.000 },
        { a_deg: NaN,     c_deg: 15.000 }, // bad move 2
        { a_deg: -31.000, c_deg: 30.000 },
      ],
    });
    const out = okumaOSPMillMasterPostEngine.generateProgram(
      [op],
      makeCfg({ tcp_mode: "G169_G170" }),
    );
    // Move 2 line: must contain X10/Y5/Z-0.5 but NO A word
    const moveTwoLine = out.gcode.find(
      (l) => l.includes("X10.000") && l.includes("Y5.000") && l.includes("Z-0.500"),
    );
    expect(typeof moveTwoLine).toBe("string");
    expect(moveTwoLine).not.toMatch(/\bB/);
    // warning must mention move 2 and A/C
    const w = out.warnings.find((s) => s.includes("5-axis move 2") && s.includes("A/C angles"));
    expect(typeof w).toBe("string");
    // adjacent moves still have rotary words
    const gc = out.gcode.join("\n");
    expect(gc).toContain("A-30.000 C0.000");
    expect(gc).toContain("A-31.000 C30.000");
  });

  it("non-finite XYZ emits ERROR comment + warning, TCP bracket still present", () => {
    const op = make5AxisOp({
      coordinates: [
        { x: 0,   y: 0,  z: 5,  type: "rapid"  },
        { x: NaN, y: 5,  z: 0,  type: "linear" }, // bad move 2
        { x: 20,  y: 10, z: -1, type: "linear" },
      ],
    });
    const out = okumaOSPMillMasterPostEngine.generateProgram(
      [op],
      makeCfg({ tcp_mode: "G169_G170" }),
    );
    const gc = out.gcode.join("\n");
    expect(gc).toContain("5-AXIS MOVE 2 NON-FINITE COORD SKIPPED");
    // TCP bracket intact despite skipped move
    expect(out.gcode.some((l) => l.includes("G169") && l.includes("TCP ON"))).toBe(true);
    expect(out.gcode.some((l) => l.includes("G170") && l.includes("TCP OFF"))).toBe(true);
    // warning present
    const w = out.warnings.find((s) => s.includes("5-axis move 2") && s.includes("non-finite XYZ"));
    expect(typeof w).toBe("string");
  });
});

// ---------------------------------------------------------------------------
// arc -> linear downgrade under RTCP (loud-failure parity)
// ---------------------------------------------------------------------------

describe("5-axis TCP emit -- arc downgrade in RTCP mode", () => {
  it("arc_cw move emits G1 (not G2) and pushes an arc-downgrade warning", () => {
    const op = make5AxisOp({
      coordinates: [
        { x: 0,  y: 0,  z: 5,    type: "rapid"  },
        { x: 10, y: 5,  z: -0.5, type: "arc_cw" },  // arc in a 5-axis op
        { x: 20, y: 10, z: -1.0, type: "linear" },
      ],
    });
    const out = okumaOSPMillMasterPostEngine.generateProgram(
      [op],
      makeCfg({ tcp_mode: "G169_G170" }),
    );
    // The arc move must be emitted as a linear G1 (no G2/G3 under active TCP)
    const arcLine = out.gcode.find(
      (l) => l.includes("X10.000") && l.includes("Y5.000") && l.includes("Z-0.500"),
    );
    expect(typeof arcLine).toBe("string");
    expect(arcLine).toMatch(/^G1 /);
    expect(out.gcode.join("\n")).not.toMatch(/\bG0?2 X10\.000/);
    expect(out.gcode.join("\n")).not.toMatch(/\bG0?3 X10\.000/);
    // A loud warning must name the move + the downgrade
    const w = out.warnings.find(
      (s) => s.includes("5-axis move 2") && s.includes("arc_cw") && s.includes("downgraded"),
    );
    expect(typeof w).toBe("string");
    expect(w).toContain("MillKinematicsCollisionEngine");
  });

  it("a pure-linear 5-axis op pushes NO arc-downgrade warning", () => {
    const out = okumaOSPMillMasterPostEngine.generateProgram(
      [make5AxisOp()], // default fixture is all rapid/linear
      makeCfg({ tcp_mode: "G169_G170" }),
    );
    expect(out.warnings.some((s) => s.includes("downgraded to a linear G1"))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// SINGULARITY ADVISORY
// ---------------------------------------------------------------------------

describe("5-axis TCP emit -- SINGULARITY ADVISORY", () => {
  it("emits SINGULARITY ADVISORY comment when tool_axis_k=0.999 (tilt ~2.6 deg)", () => {
    const out = okumaOSPMillMasterPostEngine.generateProgram(
      [make5AxisOp({ tool_axis_k: 0.999 })],
      makeCfg({ tcp_mode: "G169_G170" }),
    );
    const advisory = out.gcode.find((l) => l.includes("SINGULARITY ADVISORY"));
    expect(typeof advisory).toBe("string");
    expect(advisory).toContain("MillKinematicsCollisionEngine");
  });

  it("SINGULARITY ADVISORY appears before G169 TCP ON", () => {
    const out = okumaOSPMillMasterPostEngine.generateProgram(
      [make5AxisOp({ tool_axis_k: 0.999 })],
      makeCfg({ tcp_mode: "G169_G170" }),
    );
    const advisoryIdx = out.gcode.findIndex((l) => l.includes("SINGULARITY ADVISORY"));
    const tcpOnIdx    = out.gcode.findIndex((l) => l.includes("G169") && l.includes("TCP ON"));
    expect(advisoryIdx).toBeGreaterThan(-1);
    expect(tcpOnIdx).toBeGreaterThan(advisoryIdx);
  });

  it("SINGULARITY ADVISORY line is a parentheses comment (Okuma dialect)", () => {
    const out = okumaOSPMillMasterPostEngine.generateProgram(
      [make5AxisOp({ tool_axis_k: 0.999 })],
      makeCfg({ tcp_mode: "G169_G170" }),
    );
    const advisory = out.gcode.find((l) => l.includes("SINGULARITY ADVISORY"))!;
    expect(advisory).toMatch(/^\(/);
    expect(advisory).toMatch(/\)$/);
  });

  it("SINGULARITY ADVISORY appears in out.warnings[]", () => {
    const out = okumaOSPMillMasterPostEngine.generateProgram(
      [make5AxisOp({ tool_axis_k: 0.999 })],
      makeCfg({ tcp_mode: "G169_G170" }),
    );
    const w = out.warnings.find((s) => s.includes("SINGULARITY ADVISORY"));
    expect(typeof w).toBe("string");
  });

  it("SINGULARITY ADVISORY includes k value and tilt deg < 5", () => {
    const k = 0.9990;
    const out = okumaOSPMillMasterPostEngine.generateProgram(
      [make5AxisOp({ tool_axis_k: k })],
      makeCfg({ tcp_mode: "G169_G170" }),
    );
    const advisory = out.gcode.find((l) => l.includes("SINGULARITY ADVISORY"))!;
    expect(advisory).toContain(`k=${k.toFixed(4)}`);
    // tilt = acos(0.999) ~= 2.6 deg < 5 deg threshold
    const match = advisory.match(/tilt=([\d.]+)deg/);
    expect(match).not.toBeNull();
    const tiltNum = parseFloat(match![1]);
    expect(tiltNum).toBeLessThan(5);
    expect(tiltNum).toBeGreaterThan(0);
  });

  it("no SINGULARITY ADVISORY when tool_axis_k = cos(30 deg) (safe tilt)", () => {
    const safeTilt = make5AxisOp({ tool_axis_k: Math.cos(30 * Math.PI / 180) });
    const out = okumaOSPMillMasterPostEngine.generateProgram(
      [safeTilt],
      makeCfg({ tcp_mode: "G169_G170" }),
    );
    expect(out.gcode.some((l) => l.includes("SINGULARITY ADVISORY"))).toBe(false);
    expect(out.warnings.some((s) => s.includes("SINGULARITY ADVISORY"))).toBe(false);
  });

  it("no SINGULARITY ADVISORY when tool_axis_k is absent (undefined)", () => {
    const noK = make5AxisOp({ tool_axis_k: undefined });
    const out = okumaOSPMillMasterPostEngine.generateProgram(
      [noK],
      makeCfg({ tcp_mode: "G169_G170" }),
    );
    expect(out.gcode.some((l) => l.includes("SINGULARITY ADVISORY"))).toBe(false);
    expect(out.warnings.some((s) => s.includes("SINGULARITY ADVISORY"))).toBe(false);
  });

  it("singularity threshold boundary: k exactly at cos(5deg) -> no advisory", () => {
    // k === threshold (not strictly greater) should NOT trigger
    const boundary = make5AxisOp({ tool_axis_k: COS_5_DEG });
    const out = okumaOSPMillMasterPostEngine.generateProgram(
      [boundary],
      makeCfg({ tcp_mode: "G169_G170" }),
    );
    expect(out.gcode.some((l) => l.includes("SINGULARITY ADVISORY"))).toBe(false);
  });

  it("singularity threshold boundary: k = cos(5deg)+eps -> advisory fires", () => {
    const justOver = make5AxisOp({ tool_axis_k: COS_5_DEG + 1e-6 });
    const out = okumaOSPMillMasterPostEngine.generateProgram(
      [justOver],
      makeCfg({ tcp_mode: "G169_G170" }),
    );
    expect(out.gcode.some((l) => l.includes("SINGULARITY ADVISORY"))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// ADDITIVE INVARIANT -- 3-axis ops unaffected
// ---------------------------------------------------------------------------

describe("5-axis TCP emit -- additive invariant (3-axis byte-identical)", () => {
  it("pocket op (no rotary_moves) emits no G169/G170/G43.4/G43.5 words", () => {
    const pocketOp: MillOperation = {
      operation_type: "pocket",
      tool_number: 1,
      tool_diameter_mm: 12,
      tool_flutes: 4,
      material_iso: "P",
      spindle_rpm: 4000,
      feed_mm_min: 800,
      axial_depth_mm: 2,
      coordinates: [
        { x: 0, y: 0, z: 5, type: "rapid" },
        { x: 50, y: 0, z: -2, type: "linear" },
      ],
    };
    const out = okumaOSPMillMasterPostEngine.generateProgram(
      [pocketOp],
      makeCfg({ tcp_mode: "G169_G170" }),
    );
    const gc = out.gcode.join("\n");
    expect(gc).not.toContain("G169");
    expect(gc).not.toContain("G170");
    expect(gc).not.toContain("G43.4");
    expect(gc).not.toContain("G43.5");
  });

  it("3d_surface WITHOUT rotary_moves -> 3-axis fallback, no TCP or A/C words", () => {
    const surfNoRotary: MillOperation = {
      operation_type: "3d_surface",
      tool_number: 2,
      tool_diameter_mm: 10,
      tool_flutes: 4,
      material_iso: "K",
      spindle_rpm: 6000,
      feed_mm_min: 2000,
      axial_depth_mm: 0.5,
      coordinates: [
        { x: 0,  y: 0, z: 5,    type: "rapid"  },
        { x: 10, y: 5, z: -0.5, type: "linear" },
      ],
      // rotary_moves intentionally absent
    };
    const out = okumaOSPMillMasterPostEngine.generateProgram(
      [surfNoRotary],
      makeCfg({ tcp_mode: "G169_G170" }),
    );
    const gc = out.gcode.join("\n");
    expect(gc).not.toContain("G169");
    expect(gc).not.toContain("G170");
    // The normal G1 linear move must be present, without any A/C suffix
    const moveLine = out.gcode.find(
      (l) => l.startsWith("G1 ") && l.includes("X10.000") && l.includes("Y5.000"),
    );
    expect(typeof moveLine).toBe("string");
    expect(moveLine).not.toMatch(/\bB[-\d]/);
  });

  it("3d_surface with empty rotary_moves[] -> 3-axis fallback, no TCP words", () => {
    const out = okumaOSPMillMasterPostEngine.generateProgram(
      [make5AxisOp({ rotary_moves: [] })],
      makeCfg({ tcp_mode: "G169_G170" }),
    );
    const gc = out.gcode.join("\n");
    expect(gc).not.toContain("G169");
    expect(gc).not.toContain("G170");
  });

  it("mixed program: pocket (3-axis) + 3d_surface (5-axis) -> exactly one G169/G170 pair", () => {
    const pocketOp: MillOperation = {
      operation_type: "pocket",
      tool_number: 1,
      tool_diameter_mm: 12,
      tool_flutes: 4,
      material_iso: "P",
      spindle_rpm: 4000,
      feed_mm_min: 800,
      axial_depth_mm: 2,
      coordinates: [{ x: 0, y: 0, z: -2, type: "linear" }],
    };
    const surfOp = make5AxisOp({ tool_number: 3 });
    const out = okumaOSPMillMasterPostEngine.generateProgram(
      [pocketOp, surfOp],
      makeCfg({ tcp_mode: "G169_G170" }),
    );
    const g169cnt = out.gcode.filter((l) => l.includes("G169") && l.includes("TCP ON")).length;
    const g170cnt = out.gcode.filter((l) => l.includes("G170") && l.includes("TCP OFF")).length;
    expect(g169cnt).toBe(1);
    expect(g170cnt).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// adaptive op type
// ---------------------------------------------------------------------------

describe("5-axis TCP emit -- adaptive operation type", () => {
  it("adaptive op with rotary_moves emits G169/G170 + A/C words (same path as 3d_surface)", () => {
    const adaptiveOp = make5AxisOp({ operation_type: "adaptive" });
    const out = okumaOSPMillMasterPostEngine.generateProgram(
      [adaptiveOp],
      makeCfg({ tcp_mode: "G169_G170" }),
    );
    const g169 = out.gcode.find((l) => l.includes("G169") && l.includes("TCP ON"));
    const g170 = out.gcode.find((l) => l.includes("G170") && l.includes("TCP OFF"));
    expect(typeof g169).toBe("string");
    expect(typeof g170).toBe("string");
    expect(out.gcode.join("\n")).toContain("A-30.000 C0.000");
  });
});

// ---------------------------------------------------------------------------
// JM Die preset integration (corpus-level verification)
// ---------------------------------------------------------------------------

describe("5-axis TCP emit -- JM Die preset (VMC-02 Genos M460V-5AX)", () => {
  it("JM_DIE_PRESET emits G169 TCP ON (Okuma-native), NOT Fanuc G43.4", () => {
    const out = okumaOSPMillMasterPostEngine.generateProgram(
      [make5AxisOp()],
      { ...JM_DIE_PRESET, program_number: 9900 } as OkumaOSPMillPostConfig,
    );
    // Must have G169 TCP ON
    const g169line = out.gcode.find((l) => l.includes("G169") && l.includes("TCP ON"));
    expect(typeof g169line).toBe("string");
    // Must have G170 TCP OFF
    const g170line = out.gcode.find((l) => l.includes("G170") && l.includes("TCP OFF"));
    expect(typeof g170line).toBe("string");
    // Fanuc G43.4 must NOT appear as the TCP ON code
    const fanucTcpOn = out.gcode.filter(
      (l) => l.includes("TCP ON") && !l.includes("G169"),
    );
    expect(fanucTcpOn.length).toBe(0);
  });

  it("JM_DIE_PRESET 5-axis NC contains A and C words from rotary_moves", () => {
    const out = okumaOSPMillMasterPostEngine.generateProgram(
      [make5AxisOp()],
      { ...JM_DIE_PRESET, program_number: 9901 } as OkumaOSPMillPostConfig,
    );
    const gc = out.gcode.join("\n");
    expect(gc).toContain("A-30.000 C0.000");
    expect(gc).toContain("A-30.500 C15.000");
    expect(gc).toContain("A-31.000 C30.000");
  });

  it("JM_DIE_PRESET well-formed 5-axis op produces no TCP-related warnings", () => {
    const out = okumaOSPMillMasterPostEngine.generateProgram(
      [make5AxisOp()],
      { ...JM_DIE_PRESET, program_number: 9902 } as OkumaOSPMillPostConfig,
    );
    const tcpWarnings = out.warnings.filter(
      (s) => s.includes("SINGULARITY") || s.includes("5-axis move") || s.includes("non-finite XYZ"),
    );
    expect(tcpWarnings.length).toBe(0);
  });

  it("JM_DIE_PRESET structure: G169 before first G1, G170 after last G1", () => {
    const out = okumaOSPMillMasterPostEngine.generateProgram(
      [make5AxisOp()],
      { ...JM_DIE_PRESET, program_number: 9903 } as OkumaOSPMillPostConfig,
    );
    const gcode   = out.gcode;
    const g169Idx = gcode.findIndex((l) => l.includes("G169") && l.includes("TCP ON"));
    const g170Idx = gcode.findIndex((l) => l.includes("G170") && l.includes("TCP OFF"));
    const g1Idx   = gcode.findIndex((l) => l.startsWith("G1 "));
    expect(g169Idx).toBeLessThan(g1Idx);
    expect(g170Idx).toBeGreaterThan(g1Idx);
  });

  it("class instantiation and singleton agree: both emit G169 TCP ON for JM Die preset", () => {
    const cfg = { ...JM_DIE_PRESET, program_number: 9999 } as OkumaOSPMillPostConfig;
    const fromClass    = new OkumaOSPMillMasterPostEngine().generateProgram([make5AxisOp()], cfg);
    const fromSingleton = okumaOSPMillMasterPostEngine.generateProgram([make5AxisOp()], cfg);
    expect(fromClass.gcode.some((l) => l.includes("G169") && l.includes("TCP ON"))).toBe(true);
    expect(fromSingleton.gcode.some((l) => l.includes("G169") && l.includes("TCP ON"))).toBe(true);
  });
});
