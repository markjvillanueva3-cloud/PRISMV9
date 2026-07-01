/**
 * PostProcessorEngine.test.ts
 *
 * Companion tests for PostProcessorEngine (L2-P2-MS1 CAD/CAM Layer).
 * All assertions are derived from the actual dialect tables and process() logic —
 * reference values are hand-traced from the source, not from constants.ts
 * (this engine generates G-code text, not physics quantities).
 *
 * Coverage:
 *  - process(): fanuc / haas / siemens / heidenhain / mazak / okuma dialects
 *  - process(): canned cycles (drill/tap/bore), line numbers, TCPM, smoothing
 *  - process(): unknown move type -> warning + comment fallback
 *  - process(): estimated_time_sec formula invariant
 *  - validate(): G28/G43 on heidenhain -> unsupported_codes
 *  - validate(): RPM > 30000 -> warning; feed > 15000 -> warning
 *  - validate(): clean G-code -> valid:true, empty arrays
 *  - supportedControllers(): exact 6-element set
 *  - Adversarial: empty moves array, null-ish text comment, zero feed rate
 */

import { describe, it, expect } from "vitest";
import {
  PostProcessorEngine,
  postProcessorEngine,
  type PostInput,
  type PostConfig,
} from "../engines/PostProcessorEngine.js";

// ---------------------------------------------------------------------------
// Shared minimal fixtures
// ---------------------------------------------------------------------------

function makeInput(overrides: Partial<PostInput> = {}): PostInput {
  return {
    moves: [{ type: "rapid", x: 10, y: 20, z: 5 }],
    tool_number: 1,
    tool_diameter_mm: 10,
    spindle_rpm: 3000,
    feed_rate_mmmin: 500,
    coolant: "flood",
    work_offset: "G54",
    ...overrides,
  };
}

function makeConfig(overrides: Partial<PostConfig> = {}): PostConfig {
  return {
    controller: "fanuc",
    use_canned_cycles: false,
    use_tool_length_comp: true,
    decimal_places: 3,
    line_numbers: false,
    line_number_increment: 10,
    coolant_code: "M08",
    safe_start_block: false,
    program_end: "M30",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// 1. supportedControllers()
// ---------------------------------------------------------------------------

describe("PostProcessorEngine.supportedControllers", () => {
  it("returns exactly the 6 known controller strings", () => {
    const controllers = postProcessorEngine.supportedControllers();
    expect(controllers).toHaveLength(6);
    const set = new Set(controllers);
    for (const c of ["fanuc", "haas", "siemens", "heidenhain", "mazak", "okuma"] as const) {
      expect(set.has(c)).toBe(true);
    }
  });

  it("singleton and new instance return the same set", () => {
    const engine = new PostProcessorEngine();
    expect(engine.supportedControllers().sort()).toEqual(
      postProcessorEngine.supportedControllers().sort()
    );
  });
});

// ---------------------------------------------------------------------------
// 2. process() — Fanuc dialect reference values
// ---------------------------------------------------------------------------

describe("PostProcessorEngine.process — fanuc dialect", () => {
  it("rapid move produces G00 line with 3-decimal coordinates", () => {
    const result = postProcessorEngine.process(
      makeInput({ moves: [{ type: "rapid", x: 10, y: 20, z: 5 }] }),
      makeConfig()
    );
    expect(result.controller).toBe("fanuc");
    expect(result.gcode).toContain("G00 X10.000 Y20.000 Z5.000");
  });

  it("feed move produces G01 line with default feed rate", () => {
    const result = postProcessorEngine.process(
      makeInput({ moves: [{ type: "feed", x: 10, y: 20, z: -5 }], feed_rate_mmmin: 500 }),
      makeConfig()
    );
    expect(result.gcode).toContain("G01 X10.000 Y20.000 Z-5.000 F500");
  });

  it("arc_cw produces G02 line with I/J radii", () => {
    const result = postProcessorEngine.process(
      makeInput({ moves: [{ type: "arc_cw", x: 15, y: 0, i: 5, j: 0, feed: 300 }] }),
      makeConfig()
    );
    expect(result.gcode).toContain("G02 X15.000 Y0.000 I5.000 J0.000 F300");
  });

  it("arc_ccw produces G03 line", () => {
    const result = postProcessorEngine.process(
      makeInput({ moves: [{ type: "arc_ccw", x: -5, y: 10, i: 0, j: 5, feed: 250 }] }),
      makeConfig()
    );
    expect(result.gcode).toContain("G03 X-5.000 Y10.000 I0.000 J5.000 F250");
  });

  it("comment move emits parenthesised Fanuc comment", () => {
    const result = postProcessorEngine.process(
      makeInput({ moves: [{ type: "comment", text: "OP-10 ROUGH" }] }),
      makeConfig()
    );
    expect(result.gcode).toContain("(OP-10 ROUGH)");
  });

  it("tool length comp enabled adds G43 Hxx line", () => {
    const result = postProcessorEngine.process(
      makeInput({ tool_number: 3 }),
      makeConfig({ use_tool_length_comp: true })
    );
    expect(result.gcode).toContain("G43 H3");
  });

  it("program_number pads to 4 digits in header", () => {
    const result = postProcessorEngine.process(
      makeInput(),
      makeConfig({ program_number: 42 })
    );
    expect(result.gcode).toContain("O0042");
  });

  it("line_count equals the number of addLine calls (>= newline-split count minus multi-line dialect expansions)", () => {
    const result = postProcessorEngine.process(
      makeInput({ moves: [{ type: "rapid", x: 0, y: 0, z: 50 }] }),
      makeConfig()
    );
    // line_count is lines[].length (one push per addLine call).
    // Multi-line dialect strings (e.g. safeRetract "G28 G91 Z0\nG90") are pushed
    // as ONE entry but expand to TWO lines when gcode is joined+split.
    // Therefore: gcode.split("\n").length >= line_count always holds.
    expect(result.line_count).toBeGreaterThan(0);
    expect(result.gcode.split("\n").length).toBeGreaterThanOrEqual(result.line_count);
  });

  it("program ends with M30 when program_end is M30", () => {
    const result = postProcessorEngine.process(makeInput(), makeConfig({ program_end: "M30" }));
    const lines = result.gcode.split("\n");
    expect(lines[lines.length - 1]).toBe("M30");
  });

  it("warnings array is empty for a clean well-typed input", () => {
    const result = postProcessorEngine.process(
      makeInput({ moves: [{ type: "rapid", x: 1, y: 2, z: 3 }] }),
      makeConfig()
    );
    expect(result.warnings).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 3. process() — line numbers
// ---------------------------------------------------------------------------

describe("PostProcessorEngine.process — line numbers", () => {
  it("line_numbers:true prefixes N10, N20, N30 with default increment 10", () => {
    const result = postProcessorEngine.process(
      makeInput({ moves: [{ type: "rapid", x: 0, y: 0, z: 50 }] }),
      makeConfig({ line_numbers: true, line_number_increment: 10 })
    );
    const lines = result.gcode.split("\n");
    // First line starts at N10
    expect(lines[0]).toMatch(/^N10 /);
    // Second line is N20
    expect(lines[1]).toMatch(/^N20 /);
  });

  it("line_number_increment:5 produces N5, N10, N15...", () => {
    const result = postProcessorEngine.process(
      makeInput({ moves: [] }),
      makeConfig({ line_numbers: true, line_number_increment: 5 })
    );
    const lines = result.gcode.split("\n");
    expect(lines[0]).toMatch(/^N5 /);
    expect(lines[1]).toMatch(/^N10 /);
  });
});

// ---------------------------------------------------------------------------
// 4. process() — canned cycles
// ---------------------------------------------------------------------------

describe("PostProcessorEngine.process — canned cycles", () => {
  it("drill with use_canned_cycles:true emits G81 and adds G81 to canned_cycles_used", () => {
    const result = postProcessorEngine.process(
      makeInput({ moves: [{ type: "drill", z: -15 }] }),
      makeConfig({ use_canned_cycles: true })
    );
    expect(result.gcode).toContain("G81");
    expect(result.canned_cycles_used).toContain("G81");
    // cancel modal
    expect(result.gcode).toContain("G80");
  });

  it("drill with use_canned_cycles:false emits G01 feed line instead", () => {
    const result = postProcessorEngine.process(
      makeInput({ moves: [{ type: "drill", z: -15 }] }),
      makeConfig({ use_canned_cycles: false })
    );
    expect(result.gcode).not.toContain("G81");
    expect(result.gcode).toContain("G01");
    expect(result.canned_cycles_used).toHaveLength(0);
  });

  it("tap with use_canned_cycles:true emits G84 with spindle_rpm * pitch feed", () => {
    const result = postProcessorEngine.process(
      makeInput({
        spindle_rpm: 500,
        moves: [{ type: "tap", z: -10, pitch: 1.5 }],
      }),
      makeConfig({ use_canned_cycles: true, decimal_places: 3 })
    );
    // F = spindle_rpm * pitch = 500 * 1.5 = 750
    expect(result.gcode).toContain("G84");
    expect(result.gcode).toContain("Z-10.000");
    expect(result.gcode).toContain("F750");
    expect(result.canned_cycles_used).toContain("G84");
  });

  it("bore with use_canned_cycles:true emits G76 cycle", () => {
    const result = postProcessorEngine.process(
      makeInput({ moves: [{ type: "bore", z: -20 }] }),
      makeConfig({ use_canned_cycles: true })
    );
    expect(result.gcode).toContain("G76");
    expect(result.canned_cycles_used).toContain("G76");
  });

  it("canned_cycles_used deduplicates repeated G81 calls", () => {
    const result = postProcessorEngine.process(
      makeInput({
        moves: [
          { type: "drill", z: -10 },
          { type: "drill", z: -15 },
          { type: "drill", z: -20 },
        ],
      }),
      makeConfig({ use_canned_cycles: true })
    );
    const g81Count = result.canned_cycles_used.filter((c) => c === "G81").length;
    expect(g81Count).toBe(1); // deduplicated via Set
  });
});

// ---------------------------------------------------------------------------
// 5. process() — controller dialect differences (haas / siemens / heidenhain / mazak / okuma)
// ---------------------------------------------------------------------------

describe("PostProcessorEngine.process — Haas dialect", () => {
  it("rapid uses 4 decimal places by default", () => {
    const result = postProcessorEngine.process(
      makeInput({ moves: [{ type: "rapid", x: 1, y: 2, z: 3 }] }),
      makeConfig({ controller: "haas", decimal_places: 4 })
    );
    expect(result.gcode).toContain("G00 X1.0000 Y2.0000 Z3.0000");
  });
});

describe("PostProcessorEngine.process — Siemens dialect", () => {
  it("rapid uses G0 (not G00) and comment uses semicolon syntax", () => {
    const result = postProcessorEngine.process(
      makeInput({ moves: [{ type: "rapid", x: 5, y: 5, z: 5 }] }),
      makeConfig({ controller: "siemens", decimal_places: 3 })
    );
    expect(result.gcode).toContain("G0 X5.000 Y5.000 Z5.000");
  });

  it("feed uses G1 (not G01)", () => {
    const result = postProcessorEngine.process(
      makeInput({ moves: [{ type: "feed", x: 5, y: 5, z: 0 }], feed_rate_mmmin: 300 }),
      makeConfig({ controller: "siemens", decimal_places: 3 })
    );
    expect(result.gcode).toContain("G1 X5.000 Y5.000 Z0.000 F300");
  });

  it("work offset G54 is translated to G500 for Siemens", () => {
    const result = postProcessorEngine.process(
      makeInput({ work_offset: "G54" }),
      makeConfig({ controller: "siemens" })
    );
    expect(result.gcode).toContain("G500");
    expect(result.gcode).not.toContain("G54");
  });

  it("comment uses '; text' syntax not parentheses", () => {
    const result = postProcessorEngine.process(
      makeInput({ moves: [{ type: "comment", text: "FINISH PASS" }] }),
      makeConfig({ controller: "siemens" })
    );
    expect(result.gcode).toContain("; FINISH PASS");
    expect(result.gcode).not.toContain("(FINISH PASS)");
  });
});

describe("PostProcessorEngine.process — Heidenhain dialect", () => {
  it("rapid uses 'L ... R0 FMAX' syntax", () => {
    const result = postProcessorEngine.process(
      makeInput({ moves: [{ type: "rapid", x: 10, y: 5, z: 50 }] }),
      makeConfig({ controller: "heidenhain", decimal_places: 3 })
    );
    expect(result.gcode).toContain("L X10.000 Y5.000 Z50.000 R0 FMAX");
  });

  it("safe_start_block emits BEGIN PGM PART MM", () => {
    const result = postProcessorEngine.process(
      makeInput(),
      makeConfig({ controller: "heidenhain", safe_start_block: true })
    );
    expect(result.gcode).toContain("BEGIN PGM PART MM");
  });

  it("program ends with END PGM PART MM for heidenhain", () => {
    const result = postProcessorEngine.process(
      makeInput(),
      makeConfig({ controller: "heidenhain" })
    );
    const lines = result.gcode.split("\n");
    expect(lines[lines.length - 1]).toBe("END PGM PART MM");
  });
});

describe("PostProcessorEngine.process — Mazak dialect", () => {
  it("tool number is zero-padded to 4 digits", () => {
    const result = postProcessorEngine.process(
      makeInput({ tool_number: 3 }),
      makeConfig({ controller: "mazak" })
    );
    expect(result.gcode).toContain("T0003");
  });
});

describe("PostProcessorEngine.process — Okuma dialect", () => {
  it("flood coolant emits M50 (not M08)", () => {
    const result = postProcessorEngine.process(
      makeInput({ coolant: "flood" }),
      makeConfig({ controller: "okuma" })
    );
    expect(result.gcode).toContain("M50");
  });

  it("mist coolant emits M51", () => {
    const result = postProcessorEngine.process(
      makeInput({ coolant: "mist" }),
      makeConfig({ controller: "okuma" })
    );
    expect(result.gcode).toContain("M51");
  });

  it("work offset G54 translates to G15 H1 for Okuma", () => {
    const result = postProcessorEngine.process(
      makeInput({ work_offset: "G54" }),
      makeConfig({ controller: "okuma" })
    );
    expect(result.gcode).toContain("G15 H1");
    expect(result.gcode).not.toContain("G54");
  });

  it("tool number is zero-padded to 4 digits", () => {
    const result = postProcessorEngine.process(
      makeInput({ tool_number: 7 }),
      makeConfig({ controller: "okuma" })
    );
    expect(result.gcode).toContain("T0007");
  });
});

// ---------------------------------------------------------------------------
// 6. process() — 5-axis TCPM mode (C-004)
// ---------------------------------------------------------------------------

describe("PostProcessorEngine.process — TCPM mode", () => {
  it("five_axis_mode:'tcpm' emits G43.4 instead of G43 for fanuc", () => {
    const result = postProcessorEngine.process(
      makeInput({ tool_number: 2 }),
      makeConfig({ five_axis_mode: "tcpm", use_tool_length_comp: true })
    );
    expect(result.gcode).toContain("G43.4 H2");
    expect(result.gcode).not.toContain("G43 H2");
  });

  it("five_axis_mode:'tcpm' emits TCPM OFF (G49) before end of program", () => {
    const result = postProcessorEngine.process(
      makeInput(),
      makeConfig({ five_axis_mode: "tcpm" })
    );
    expect(result.gcode).toContain("G49");
  });

  it("rotary axis A/B/C appended to rapid move", () => {
    const result = postProcessorEngine.process(
      makeInput({
        moves: [{ type: "rapid", x: 10, y: 10, z: 5, a: 30, b: 0, c: 45 }],
      }),
      makeConfig({ decimal_places: 3 })
    );
    expect(result.gcode).toContain("A30.000");
    expect(result.gcode).toContain("B0.000");
    expect(result.gcode).toContain("C45.000");
  });
});

// ---------------------------------------------------------------------------
// 7. process() — smoothing mode (C-005)
// ---------------------------------------------------------------------------

describe("PostProcessorEngine.process — smoothing mode", () => {
  it("smoothing_mode:'finish' for fanuc emits G5.1 Q1 and turns off with G5.1 Q0", () => {
    const result = postProcessorEngine.process(
      makeInput({ moves: [] }),
      makeConfig({ smoothing_mode: "finish" })
    );
    expect(result.gcode).toContain("G5.1 Q1");
    expect(result.gcode).toContain("G5.1 Q0");
  });

  it("smoothing_mode:'rough' for fanuc emits G64", () => {
    const result = postProcessorEngine.process(
      makeInput({ moves: [] }),
      makeConfig({ smoothing_mode: "rough" })
    );
    expect(result.gcode).toContain("G64");
  });

  it("smoothing_mode:'off' emits no smoothing codes", () => {
    const result = postProcessorEngine.process(
      makeInput({ moves: [] }),
      makeConfig({ smoothing_mode: "off" })
    );
    expect(result.gcode).not.toContain("G5.1");
    expect(result.gcode).not.toContain("G64");
  });
});

// ---------------------------------------------------------------------------
// 8. process() — estimated_time_sec algebraic invariant
// ---------------------------------------------------------------------------

describe("PostProcessorEngine.process — estimated_time_sec invariant", () => {
  it("zero feed_rate_mmmin yields time based only on line count overhead", () => {
    const result = postProcessorEngine.process(
      makeInput({ moves: [], feed_rate_mmmin: 0 }),
      makeConfig()
    );
    // When feed_rate = 0, formula is: lines.length * 0.05
    const expectedTime = Math.round(result.line_count * 0.05);
    expect(result.estimated_time_sec).toBe(expectedTime);
  });

  it("adding feed moves increases estimated_time_sec monotonically", () => {
    const withNoMoves = postProcessorEngine.process(
      makeInput({ moves: [], feed_rate_mmmin: 500 }),
      makeConfig()
    );
    const withFeedMoves = postProcessorEngine.process(
      makeInput({
        moves: [{ type: "feed", x: 10 }, { type: "feed", x: 20 }, { type: "feed", x: 30 }],
        feed_rate_mmmin: 500,
      }),
      makeConfig()
    );
    // 3 feed moves add totalFeedDist=30, plus 3 extra lines overhead
    expect(withFeedMoves.estimated_time_sec).toBeGreaterThan(withNoMoves.estimated_time_sec);
  });

  it("estimated_time_sec is a non-negative integer (Math.round applied)", () => {
    const result = postProcessorEngine.process(
      makeInput({ moves: [{ type: "arc_cw", x: 10, y: 0, i: 5, j: 0 }], feed_rate_mmmin: 300 }),
      makeConfig()
    );
    expect(result.estimated_time_sec).toBeGreaterThanOrEqual(0);
    expect(Number.isInteger(result.estimated_time_sec)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 9. process() — failure modes: unknown move type
// ---------------------------------------------------------------------------

describe("PostProcessorEngine.process — unknown move type fallback", () => {
  it("unknown move type emits a warning message", () => {
    const input = makeInput({ moves: [{ type: "probe" as any }] });
    const result = postProcessorEngine.process(input, makeConfig());
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toContain("probe");
  });

  it("unknown move type still emits an UNSUPPORTED comment line in gcode", () => {
    const input = makeInput({ moves: [{ type: "lasercut" as any }] });
    const result = postProcessorEngine.process(input, makeConfig());
    expect(result.gcode).toContain("UNSUPPORTED");
    expect(result.gcode).toContain("lasercut");
  });
});

// ---------------------------------------------------------------------------
// 10. process() — coolant variants
// ---------------------------------------------------------------------------

describe("PostProcessorEngine.process — coolant codes", () => {
  it("coolant:'flood' emits M08 for fanuc", () => {
    const result = postProcessorEngine.process(
      makeInput({ coolant: "flood" }),
      makeConfig({ controller: "fanuc" })
    );
    expect(result.gcode).toContain("M08");
  });

  it("coolant:'mist' emits M07 for fanuc", () => {
    const result = postProcessorEngine.process(
      makeInput({ coolant: "mist" }),
      makeConfig({ controller: "fanuc" })
    );
    expect(result.gcode).toContain("M07");
  });

  it("coolant:'none' does not emit coolant-on code for fanuc", () => {
    const result = postProcessorEngine.process(
      makeInput({ coolant: "none" }),
      makeConfig({ controller: "fanuc" })
    );
    // M08 and M07 should not be present
    expect(result.gcode).not.toContain("M08");
    expect(result.gcode).not.toContain("M07");
    // But M09 coolant-off is always emitted
    expect(result.gcode).toContain("M09");
  });
});

// ---------------------------------------------------------------------------
// 11. validate() — happy path
// ---------------------------------------------------------------------------

describe("PostProcessorEngine.validate — happy path", () => {
  it("clean G-code returns valid:true with empty error/warning/unsupported arrays", () => {
    const gcode = [
      "G90 G80 G40 G49",
      "T1 M06",
      "S2000 M03",
      "G00 X0 Y0 Z100",
      "G01 X10 Y10 F500",
      "M09",
      "M30",
    ].join("\n");
    const v = postProcessorEngine.validate(gcode, "fanuc");
    expect(v.valid).toBe(true);
    expect(v.errors).toHaveLength(0);
    expect(v.warnings).toHaveLength(0);
    expect(v.unsupported_codes).toHaveLength(0);
  });

  it("empty G-code string returns valid:true (no lines to check)", () => {
    const v = postProcessorEngine.validate("", "fanuc");
    expect(v.valid).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 12. validate() — failure modes
// ---------------------------------------------------------------------------

describe("PostProcessorEngine.validate — failure modes", () => {
  it("G28 on Heidenhain controller produces unsupported_codes entry", () => {
    const gcode = "G28 G91 Z0\nG90";
    const v = postProcessorEngine.validate(gcode, "heidenhain");
    expect(v.unsupported_codes.length).toBeGreaterThan(0);
    expect(v.unsupported_codes[0]).toContain("G28");
    expect(v.unsupported_codes[0]).toContain("Heidenhain");
  });

  it("G43 on Heidenhain controller produces unsupported_codes entry", () => {
    const gcode = "G43 H1";
    const v = postProcessorEngine.validate(gcode, "heidenhain");
    expect(v.unsupported_codes.length).toBeGreaterThan(0);
    expect(v.unsupported_codes[0]).toContain("G43");
  });

  it("spindle speed over 30000 RPM produces a warning", () => {
    const gcode = "T1 M06\nS35000 M03";
    const v = postProcessorEngine.validate(gcode, "fanuc");
    expect(v.warnings.length).toBeGreaterThan(0);
    expect(v.warnings.some((w) => w.includes("35000"))).toBe(true);
  });

  it("feed rate over 15000 mm/min produces a warning", () => {
    const gcode = "G01 X100 F18000";
    const v = postProcessorEngine.validate(gcode, "haas");
    expect(v.warnings.length).toBeGreaterThan(0);
    expect(v.warnings.some((w) => w.includes("18000"))).toBe(true);
  });

  it("G28 on fanuc (NOT heidenhain) does NOT produce unsupported entry", () => {
    const gcode = "G28 G91 Z0";
    const v = postProcessorEngine.validate(gcode, "fanuc");
    expect(v.unsupported_codes).toHaveLength(0);
  });

  it("valid field is false only when errors array is non-empty", () => {
    // validate() only pushes to errors[], never directly — currently always true unless caller
    // extends; verify the invariant: valid === (errors.length === 0)
    const gcode = "G28 G91 Z0\nS99999 M03";
    const v = postProcessorEngine.validate(gcode, "heidenhain");
    expect(v.valid).toBe(v.errors.length === 0);
  });
});

// ---------------------------------------------------------------------------
// 13. Adversarial inputs
// ---------------------------------------------------------------------------

describe("PostProcessorEngine.process — adversarial inputs", () => {
  it("empty moves array produces a valid PostResult with zero warnings", () => {
    const result = postProcessorEngine.process(
      makeInput({ moves: [] }),
      makeConfig()
    );
    expect(result.controller).toBe("fanuc");
    expect(result.gcode.length).toBeGreaterThan(0);
    expect(result.warnings).toHaveLength(0);
    expect(result.canned_cycles_used).toHaveLength(0);
    expect(result.line_count).toBeGreaterThan(0);
  });

  it("comment move with no text property emits nothing extra (no crash)", () => {
    // text is undefined — the engine guards with `if (move.text)`
    const result = postProcessorEngine.process(
      makeInput({ moves: [{ type: "comment" }] }),
      makeConfig()
    );
    expect(result.warnings).toHaveLength(0);
    // gcode must still be a non-empty string (header + footer present)
    expect(typeof result.gcode).toBe("string");
    expect(result.gcode.length).toBeGreaterThan(0);
  });

  it("very large tool number (9999) is formatted without overflow", () => {
    const result = postProcessorEngine.process(
      makeInput({ tool_number: 9999 }),
      makeConfig({ controller: "mazak" })
    );
    expect(result.gcode).toContain("T9999");
    expect(result.warnings).toHaveLength(0);
  });

  it("negative coordinate values appear correctly in G-code", () => {
    const result = postProcessorEngine.process(
      makeInput({ moves: [{ type: "feed", x: -50.5, y: -10.25, z: -100 }], feed_rate_mmmin: 200 }),
      makeConfig({ decimal_places: 3 })
    );
    expect(result.gcode).toContain("X-50.500");
    expect(result.gcode).toContain("Y-10.250");
    expect(result.gcode).toContain("Z-100.000");
  });

  it("safe_start_block with siemens emits CYCLE800() in header", () => {
    const result = postProcessorEngine.process(
      makeInput(),
      makeConfig({ controller: "siemens", safe_start_block: true })
    );
    expect(result.gcode).toContain("CYCLE800()");
  });
});

describe("PostProcessorEngine.validate — adversarial inputs", () => {
  it("whitespace-only lines are ignored (no false positives)", () => {
    const gcode = "   \n\t\n  \nG01 X10 F500\n  ";
    const v = postProcessorEngine.validate(gcode, "fanuc");
    expect(v.valid).toBe(true);
    expect(v.warnings).toHaveLength(0);
  });

  it("multiple G28 + G43 lines on heidenhain all produce unsupported entries", () => {
    const gcode = ["G28 G91 Z0", "G43 H1", "G28 G91 X0"].join("\n");
    const v = postProcessorEngine.validate(gcode, "heidenhain");
    expect(v.unsupported_codes.length).toBe(3);
  });
});
