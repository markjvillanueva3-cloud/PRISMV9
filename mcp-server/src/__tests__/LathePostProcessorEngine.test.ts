/**
 * LathePostProcessorEngine.test.ts -- companion unit test (R9, U-PP-LATHE-POST-CORE-TEST)
 *
 * The base multi-dialect lathe post (6 controllers: fanuc_turning, haas_st, mazak_qt,
 * okuma_lb, siemens_840d, dmg_celos) had NO companion test -- only the OkumaB250 *master*
 * post engine was covered (928-line integration + 269-line sidecar). This suite verifies
 * the DIALECT-CORRECTNESS that echo's soul exists to guard: the same logical operation must
 * emit controller-specific G-code (Okuma G85 roughing + G71 threading + `G4 F` dwell + M50
 * coolant + `G0` rapids; Siemens CYCLE95/97 + LIMS= clamp + `;` comments; Fanuc G71/G76 +
 * `G04 P` dwell). Reference values are hand-traced from the dialect tables, so each assertion
 * FAILS if the dialect business-logic changes (R9 -- intent, not behavior).
 *
 * Real dependency: process() calls machiningPlaybookEngine.advise() -- NOT mocked. Warning
 * assertions use substring `.some(...)` (never exact array length) so playbook rules can't
 * make the dialect tests brittle.
 */

import { describe, it, expect } from "vitest";
import {
  LathePostProcessorEngine,
  lathePostProcessorEngine,
  type LathePostConfig,
  type LatheInput,
  type LatheMove,
} from "../engines/LathePostProcessorEngine.js";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function cfg(overrides: Partial<LathePostConfig> = {}): LathePostConfig {
  return {
    controller: "fanuc_turning",
    use_canned_cycles: true,
    use_css: false,
    use_tnrc: false,
    decimal_places: 3,
    line_numbers: false,
    line_number_increment: 10,
    coolant_code: "flood",
    safe_start_block: true,
    program_end: "M30",
    ...overrides,
  };
}

function input(overrides: Partial<LatheInput> = {}): LatheInput {
  return {
    moves: [{ type: "rapid", x: 25, z: 2 }],
    tool_number: 1,
    tool_orientation: 3,
    coolant: "flood",
    work_offset: "G54",
    spindle_rpm: 1200,
    feed_rate_mmrev: 0.2,
    ...overrides,
  };
}

const eng = new LathePostProcessorEngine();

// ---------------------------------------------------------------------------
// Program structure
// ---------------------------------------------------------------------------

describe("LathePostProcessorEngine -- program structure", () => {
  it("emits header comment, safe start, tool change, spindle start, and footer (M05/G28/M30)", () => {
    const r = eng.process(input(), cfg());
    expect(r.gcode).toContain("(PRISM LathePostProcessor"); // Fanuc paren-style header comment
    expect(r.gcode).toContain("G90 G80 G40 G54 G97 G99"); // fanuc safe start
    expect(r.gcode).toContain("T0103"); // T + tool(01) + orient(03)
    expect(r.gcode).toContain("M03"); // default spindle CW
    expect(r.gcode).toContain("M05"); // spindle stop
    expect(r.gcode).toContain("G28 U0 W0"); // home
    expect(r.gcode).toMatch(/M30\s*$/); // program end (default)
  });

  it("omits the safe-start block when safe_start_block=false", () => {
    const withStart = eng.process(input(), cfg({ safe_start_block: true }));
    const without = eng.process(input(), cfg({ safe_start_block: false }));
    expect(withStart.gcode).toContain("G90 G80 G40 G54 G97 G99");
    expect(without.gcode).not.toContain("G90 G80 G40 G54 G97 G99");
  });

  it("line_count equals the number of newline-joined gcode lines", () => {
    const r = eng.process(input({ moves: [{ type: "rapid", x: 25, z: 2 }, { type: "feed", x: 20, z: -10 }] }), cfg());
    expect(r.line_count).toBe(r.gcode.split("\n").length);
  });

  it("estimated_time_sec is a finite non-negative number", () => {
    const r = eng.process(input(), cfg());
    expect(Number.isFinite(r.estimated_time_sec)).toBe(true);
    expect(r.estimated_time_sec).toBeGreaterThanOrEqual(0);
  });
});

// ---------------------------------------------------------------------------
// SAFETY: G50 max-RPM clamp (G96 CSS without it = chuck overspeed)
// ---------------------------------------------------------------------------

describe("LathePostProcessorEngine -- G50 spindle-speed clamp (lathe safety)", () => {
  it("emits G50 S<max_rpm> in the safe-start block when max_rpm is configured", () => {
    const r = eng.process(input(), cfg({ max_rpm: 3500 }));
    expect(r.gcode).toContain("G50 S3500");
  });

  it("CSS mode emits G50 clamp immediately before G96 (Fanuc) -- clamp protects the CSS ramp", () => {
    const r = eng.process(
      input({ surface_speed_mmin: 200, spindle_rpm: undefined }),
      cfg({ use_css: true, max_rpm: 3500 }),
    );
    expect(r.gcode).toContain("G50 S3500");
    expect(r.gcode).toContain("G96 S200");
    // G50 clamp must precede the G96 it protects
    expect(r.gcode.indexOf("G50 S3500")).toBeLessThan(r.gcode.indexOf("G96 S200"));
  });

  it("falls back to G97 fixed-RPM when use_css is set but no surface speed is supplied", () => {
    const r = eng.process(input({ surface_speed_mmin: undefined, spindle_rpm: 1500 }), cfg({ use_css: true }));
    expect(r.gcode).toContain("G97 S1500");
    expect(r.gcode).not.toContain("G96 ");
  });
});

// ---------------------------------------------------------------------------
// Dialect divergence -- the core of echo's domain
// ---------------------------------------------------------------------------

describe("LathePostProcessorEngine -- Okuma OSP dialect divergence (vs Fanuc)", () => {
  const okuma = cfg({ controller: "okuma_lb" });

  it("OD roughing emits Okuma G85 NTURN (named label), NOT Fanuc G71", () => {
    const move: LatheMove = { type: "rough_od", depth_of_cut_mm: 2.0, finish_allowance_x_mm: 0.5, finish_allowance_z_mm: 0.1, feed: 0.2 };
    const r = eng.process(input({ moves: [move] }), okuma);
    expect(r.gcode).toContain("G85 NTURN D2.000 U0.500 W0.100 F0.2");
    expect(r.canned_cycles_used).toContain("G85");
    expect(r.canned_cycles_used).not.toContain("G71"); // G71 is Okuma's THREAD code, not roughing
  });

  it("threading emits Okuma G71 (...M33 M73), NOT Fanuc G76", () => {
    const move: LatheMove = { type: "thread", x: 0, z: -20, thread_pitch_mm: 1.5, thread_depth_mm: 0.92, thread_passes: 4 };
    const r = eng.process(input({ moves: [move] }), okuma);
    expect(r.gcode).toContain("G71 X0.000 Z-20.000 B60 D0.230 H0.920 F1.5000 M33 M73");
    expect(r.gcode).not.toContain("G76");
    expect(r.canned_cycles_used).toContain("G71");
  });

  it("dwell uses Okuma `G4 F<sec>` (seconds), not Fanuc `G04 P<ms>`", () => {
    const r = eng.process(input({ moves: [{ type: "dwell", dwell_sec: 1.0 }] }), okuma);
    expect(r.gcode).toContain("G4 F1.0");
    expect(r.gcode).not.toContain("G04 P1000");
  });

  it("coolant uses Okuma M50 (flood) and rapids use `G0` (no leading zero); program end M2", () => {
    const r = eng.process(input({ coolant: "flood", moves: [{ type: "rapid", x: 25, z: 2 }] }), okuma);
    expect(r.gcode).toContain("M50"); // flood coolant
    expect(r.gcode).toContain("G0 X25.000 Z2.000"); // Okuma single-digit rapid
    expect(r.gcode).toContain("M9"); // Okuma coolant off (single digit)
    expect(r.gcode).toMatch(/M2\s*$/); // Okuma program end
  });

  it("Okuma 6-digit tool code T<tt><oo><oo> and G54->G15 H1 work-offset remap", () => {
    const r = eng.process(input({ tool_number: 1, tool_orientation: 1, work_offset: "G54" }), okuma);
    expect(r.gcode).toContain("T010101"); // T + 01 + 01 + 01
    expect(r.gcode).toContain("G15 H1"); // Okuma work offset
  });
});

describe("LathePostProcessorEngine -- Siemens 840D / DMG CELOS dialect", () => {
  it("Siemens roughing emits CYCLE95 stock-removal, threading CYCLE97, comments use `;`", () => {
    const r = eng.process(
      input({ moves: [{ type: "rough_od", depth_of_cut_mm: 1.5, finish_allowance_x_mm: 0.4, finish_allowance_z_mm: 0.1, feed: 0.25 }] }),
      cfg({ controller: "siemens_840d" }),
    );
    expect(r.gcode).toContain('CYCLE95("CONTOUR1",1.500,0.400,0.100,0.25,,,2)');
    expect(r.gcode).toContain("; PRISM LathePostProcessor"); // semicolon comment style
  });

  it("Siemens CSS uses LIMS= speed clamp (not G50)", () => {
    const r = eng.process(
      input({ surface_speed_mmin: 180, spindle_rpm: undefined }),
      cfg({ controller: "siemens_840d", use_css: true, max_rpm: 4000 }),
    );
    expect(r.gcode).toContain("LIMS=4000");
    expect(r.gcode).toContain("G96 S180");
    expect(r.gcode).not.toContain("G50 S");
  });

  it("DMG CELOS inherits the Siemens CYCLE family + adds the CELOS turning-mode banner", () => {
    const r = eng.process(input(), cfg({ controller: "dmg_celos", safe_start_block: true }));
    expect(r.gcode).toContain("; CELOS TURNING MODE");
  });
});

describe("LathePostProcessorEngine -- Fanuc / Haas / Mazak tool-change + threading dialect", () => {
  it("Fanuc threading G76 emits the hand-traced P-word P041060 and pitch F1.5000", () => {
    const move: LatheMove = { type: "thread", x: 0, z: -20, thread_pitch_mm: 1.5, thread_depth_mm: 0.92, thread_passes: 4, thread_angle_deg: 60, thread_chamfer: 1.0 };
    const r = eng.process(input({ moves: [move] }), cfg({ controller: "fanuc_turning" }));
    // P = passes(04) + chamfer*10(10) + angle(60) [Fanuc P(m)(r)(a) order]; Q = round(depth/passes*1000)=230
    expect(r.gcode).toContain("G76 P041060 Q230 R0.1");
    expect(r.gcode).toContain("F1.5000");
    expect(r.canned_cycles_used).toContain("G76");
  });

  it("clamps an out-of-range chamfer (>=10 leads) to the 2-digit Fanuc r-field (00-99), keeping P 6 digits", () => {
    // round(10.0*10)=100 -> clamped to 99 -> P = 04 + 99 + 60 = P049960 (not a malformed 7-digit P-word)
    const move: LatheMove = { type: "thread", x: 0, z: -20, thread_pitch_mm: 1.5, thread_depth_mm: 0.92, thread_passes: 4, thread_angle_deg: 60, thread_chamfer: 10.0 };
    const r = eng.process(input({ moves: [move] }), cfg({ controller: "fanuc_turning" }));
    expect(r.gcode).toContain("G76 P049960 Q230 R0.1");
    expect(r.gcode).not.toMatch(/G76 P\d{7}/); // packed first-block P-word stays exactly 6 digits
  });

  it("Mazak tool change is 4-digit T<tttt> followed by M06; Fanuc is T<tt><oo>", () => {
    const mazak = eng.process(input({ tool_number: 3, tool_orientation: 2 }), cfg({ controller: "mazak_qt" }));
    const fanuc = eng.process(input({ tool_number: 3, tool_orientation: 2 }), cfg({ controller: "fanuc_turning" }));
    expect(mazak.gcode).toContain("T0003");
    expect(mazak.gcode).toContain("M06");
    expect(fanuc.gcode).toContain("T0302");
    expect(fanuc.gcode).not.toContain("M06");
  });

  it("Haas honors the configured decimal_places on coordinates", () => {
    const r = eng.process(input({ moves: [{ type: "rapid", x: 25, z: 2 }] }), cfg({ controller: "haas_st", decimal_places: 4 }));
    expect(r.gcode).toContain("G00 X25.0000 Z2.0000");
  });
});

// ---------------------------------------------------------------------------
// Canned-cycle behavior
// ---------------------------------------------------------------------------

describe("LathePostProcessorEngine -- canned cycles", () => {
  it("emits G80 cancel after any canned cycle is used", () => {
    const r = eng.process(input({ moves: [{ type: "rough_od" }] }), cfg());
    expect(r.gcode).toContain("G80");
    expect(r.canned_cycles_used).toContain("G71");
  });

  it("does NOT emit a canned cycle when use_canned_cycles=false -- warns and comments instead", () => {
    const r = eng.process(input({ moves: [{ type: "rough_od" }] }), cfg({ use_canned_cycles: false }));
    expect(r.gcode).toContain("G71 OD ROUGH CYCLE DISABLED");
    expect(r.canned_cycles_used).not.toContain("G71");
    expect(r.warnings.some((w) => w.includes("canned cycles disabled"))).toBe(true);
  });

  it("canned_cycles_used is de-duplicated across repeated operations (Set semantics)", () => {
    const r = eng.process(input({ moves: [{ type: "rough_od" }, { type: "rough_od" }, { type: "finish_cycle" }] }), cfg());
    expect(r.canned_cycles_used.filter((c) => c === "G71").length).toBe(1);
    expect(r.canned_cycles_used).toContain("G70"); // finish cycle (Fanuc)
  });

  it("de-duplicates the threading cycle code across repeated thread moves (G76 listed once)", () => {
    const t: LatheMove = { type: "thread", x: 0, z: -20, thread_pitch_mm: 1.5, thread_depth_mm: 0.92, thread_passes: 4 };
    const r = eng.process(input({ moves: [t, t] }), cfg({ controller: "fanuc_turning" }));
    expect(r.canned_cycles_used.filter((c) => c === "G76").length).toBe(1);
  });

  it("supportedCycles() reports the full G70-G76 + G84 set", () => {
    expect(eng.supportedCycles()).toEqual(["G70", "G71", "G72", "G73", "G74", "G75", "G76", "G84"]);
  });
});

// ---------------------------------------------------------------------------
// Tool nose radius compensation
// ---------------------------------------------------------------------------

describe("LathePostProcessorEngine -- tool nose radius comp (TNRC)", () => {
  it("orientation <=4 -> G41 (right side), and G40 cancel is appended", () => {
    const r = eng.process(input({ tool_orientation: 3, tool_nose_radius_mm: 0.4 }), cfg({ use_tnrc: true }));
    expect(r.gcode).toContain("G41");
    expect(r.gcode).toContain("G40");
  });

  it("orientation >4 -> G42 (left side)", () => {
    const r = eng.process(input({ tool_orientation: 6, tool_nose_radius_mm: 0.4 }), cfg({ use_tnrc: true }));
    expect(r.gcode).toContain("G42");
  });

  it("no TNRC codes when use_tnrc=false", () => {
    const r = eng.process(input({ tool_nose_radius_mm: 0.4 }), cfg({ use_tnrc: false }));
    expect(r.gcode).not.toMatch(/\bG4[12]\b/);
  });
});

// ---------------------------------------------------------------------------
// Formatting + program-flow options
// ---------------------------------------------------------------------------

describe("LathePostProcessorEngine -- formatting & program flow", () => {
  it("line_numbers=true prefixes every line N<n> incrementing by line_number_increment", () => {
    const r = eng.process(input(), cfg({ line_numbers: true, line_number_increment: 10 }));
    const lines = r.gcode.split("\n");
    expect(lines[0]).toMatch(/^N10 /);
    expect(lines[1]).toMatch(/^N20 /);
  });

  it("decimal_places controls coordinate precision (dp=4 -> X25.0000)", () => {
    const r = eng.process(input({ moves: [{ type: "rapid", x: 25, z: 2 }] }), cfg({ decimal_places: 4 }));
    expect(r.gcode).toContain("G00 X25.0000 Z2.0000");
  });

  it("bar_feeder=true emits M99 loop instead of the program-end code", () => {
    const r = eng.process(input(), cfg({ bar_feeder: true, program_end: "M30" }));
    expect(r.gcode).toContain("M99");
    expect(r.gcode).toContain("BAR FEED LOOP");
    expect(r.gcode).not.toMatch(/M30\s*$/);
  });

  it("program_end='%' wraps the program in % rewind-stop markers", () => {
    const r = eng.process(input(), cfg({ program_end: "%" }));
    const lines = r.gcode.split("\n");
    expect(lines[0]).toBe("%");
    expect(lines[lines.length - 1]).toBe("%");
  });

  it("spindle_direction='ccw' emits M04 instead of M03", () => {
    const r = eng.process(input(), cfg({ spindle_direction: "ccw" }));
    expect(r.gcode).toContain("M04");
    expect(r.gcode).not.toMatch(/\bM03\b/);
  });
});

// ---------------------------------------------------------------------------
// Failure & adversarial modes (R9: >=3 failure + >=2 adversarial)
// ---------------------------------------------------------------------------

describe("LathePostProcessorEngine -- failure & adversarial modes", () => {
  it("empty moves array still produces a valid skeleton program (no crash)", () => {
    const r = eng.process(input({ moves: [] }), cfg());
    expect(r.line_count).toBeGreaterThan(0);
    expect(r.gcode).toContain("M05");
    expect(r.gcode).toContain("G28 U0 W0");
    expect(r.gcode).toMatch(/M30\s*$/);
  });

  it("unknown move type -> warning + UNSUPPORTED comment, no throw (adversarial)", () => {
    const r = eng.process(input({ moves: [{ type: "warp_drive" as unknown as LatheMove["type"] }] }), cfg());
    expect(r.warnings.some((w) => w.includes("Unknown lathe move type"))).toBe(true);
    expect(r.gcode).toContain("UNSUPPORTED: warp_drive");
  });

  it("unknown controller falls back to the Fanuc dialect rather than throwing (adversarial)", () => {
    const r = eng.process(input({ moves: [{ type: "rapid", x: 25, z: 2 }] }), cfg({ controller: "ge_fanuc_bogus" as unknown as LathePostConfig["controller"] }));
    expect(r.gcode).toContain("G00 X25.000 Z2.000"); // Fanuc-style 3dp rapid
    expect(r.gcode).toContain("(PRISM LathePostProcessor"); // Fanuc paren comment
  });

  it("coolant='none' omits any coolant-on code but still emits coolant-off at end", () => {
    const r = eng.process(input({ coolant: "none" }), cfg());
    expect(r.gcode).not.toContain("M08");
    expect(r.gcode).toContain("M09"); // coolant off is unconditional
  });

  it("singleton instance is wired and behaves identically to a fresh instance", () => {
    const a = eng.process(input(), cfg());
    const b = lathePostProcessorEngine.process(input(), cfg());
    expect(b.gcode).toBe(a.gcode);
  });
});

// ---------------------------------------------------------------------------
// Public API: controller enumeration (legacy-caller gating)
// ---------------------------------------------------------------------------

describe("LathePostProcessorEngine -- supportedControllers()", () => {
  it("returns the EXTENDED 6-controller set for non-legacy callers (incl. Siemens + DMG)", () => {
    const list = eng.supportedControllers();
    expect(list).toHaveLength(6);
    expect(list).toContain("siemens_840d");
    expect(list).toContain("dmg_celos");
    expect(list).toContain("okuma_lb");
  });
});
