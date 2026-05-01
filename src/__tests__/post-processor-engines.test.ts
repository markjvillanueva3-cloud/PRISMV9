/**
 * Tests for post-processor generation engines:
 * - LathePostProcessorEngine
 * - ProbingCycleEngine
 * - SubprogramEngine
 *
 * Source: forge-triple post-processor improvement pipeline
 */
import { describe, it, expect } from "vitest";
import {
  LathePostProcessorEngine,
  type LathePostConfig,
  type LatheInput,
} from "../engines/LathePostProcessorEngine.js";
import {
  ProbingCycleEngine,
  type ProbeConfig,
  type ProbeParams,
} from "../engines/ProbingCycleEngine.js";
import {
  SubprogramEngine,
  type SubprogramCall,
  type PatternRepeatConfig,
  type ParametricBlock,
  type ConditionalTemplate,
} from "../engines/SubprogramEngine.js";

// ============================================================================
// LathePostProcessorEngine
// ============================================================================

describe("LathePostProcessorEngine", () => {
  const engine = new LathePostProcessorEngine();

  const baseConfig: LathePostConfig = {
    controller: "fanuc_turning",
    program_number: 1001,
    use_canned_cycles: true,
    use_css: true,
    use_tnrc: false,
    decimal_places: 3,
    line_numbers: false,
    line_number_increment: 10,
    coolant_code: "flood",
    safe_start_block: true,
    program_end: "M30",
    max_rpm: 3500,
  };

  const baseInput: LatheInput = {
    moves: [],
    tool_number: 1,
    tool_orientation: 3,
    spindle_rpm: 1500,
    surface_speed_mmin: 200,
    feed_rate_mmrev: 0.25,
    coolant: "flood",
    work_offset: "G54",
  };

  it("generates basic Fanuc turning program structure", () => {
    const result = engine.process(
      { ...baseInput, moves: [
        { type: "rapid", x: 50, z: 2 },
        { type: "feed", x: 48, z: -30 },
        { type: "rapid", x: 100, z: 50 },
      ]},
      baseConfig
    );
    expect(result.controller).toBe("fanuc_turning");
    expect(result.gcode).toContain("O1001");
    expect(result.gcode).toContain("G96 S200");   // CSS mode
    expect(result.gcode).toContain("G50 S3500");   // max RPM clamp
    expect(result.gcode).toContain("G00 X50.000 Z2.000");
    expect(result.gcode).toContain("G01 X48.000 Z-30.000 F0.25");
    expect(result.gcode).toContain("M30");
    expect(result.line_count).toBeGreaterThan(5);
  });

  it("generates G71 OD roughing cycle", () => {
    const result = engine.process(
      { ...baseInput, moves: [
        { type: "rough_od",
          depth_of_cut_mm: 2.0,
          finish_allowance_x_mm: 0.5,
          finish_allowance_z_mm: 0.1,
          profile_start_block: 100,
          profile_end_block: 200 },
      ]},
      baseConfig
    );
    expect(result.gcode).toContain("G71");
    expect(result.gcode).toContain("U2.000");
    expect(result.gcode).toContain("P100 Q200");
    expect(result.canned_cycles_used).toContain("G71");
  });

  it("generates G72 face roughing cycle", () => {
    const result = engine.process(
      { ...baseInput, moves: [
        { type: "rough_face",
          depth_of_cut_mm: 1.5,
          profile_start_block: 100,
          profile_end_block: 200 },
      ]},
      baseConfig
    );
    expect(result.gcode).toContain("G72");
    expect(result.canned_cycles_used).toContain("G72");
  });

  it("generates G70 finish cycle", () => {
    const result = engine.process(
      { ...baseInput, moves: [
        { type: "finish_cycle",
          profile_start_block: 100,
          profile_end_block: 200 },
      ]},
      baseConfig
    );
    expect(result.gcode).toContain("G70 P100 Q200");
    expect(result.canned_cycles_used).toContain("G70");
  });

  it("generates G76 threading cycle", () => {
    const result = engine.process(
      { ...baseInput, moves: [
        { type: "thread",
          x: 18.376,
          z: -20,
          thread_pitch_mm: 2.0,
          thread_depth_mm: 1.227,
          thread_passes: 6,
          thread_angle_deg: 60 },
      ]},
      baseConfig
    );
    expect(result.gcode).toContain("G76");
    expect(result.gcode).toContain("X18.376");
    expect(result.gcode).toContain("F2.0000");
    expect(result.canned_cycles_used).toContain("G76");
  });

  it("generates G74 peck drilling cycle", () => {
    const result = engine.process(
      { ...baseInput, moves: [
        { type: "peck_drill", z: -40, peck_amount_mm: 5.0, feed: 100 },
      ]},
      baseConfig
    );
    expect(result.gcode).toContain("G74");
    expect(result.gcode).toContain("Z-40.000");
    expect(result.canned_cycles_used).toContain("G74");
  });

  it("generates G75 grooving cycle", () => {
    const result = engine.process(
      { ...baseInput, moves: [
        { type: "groove", x: 20, z: -15, peck_amount_mm: 1.0 },
      ]},
      baseConfig
    );
    expect(result.gcode).toContain("G75");
    expect(result.canned_cycles_used).toContain("G75");
  });

  it("generates part-off move", () => {
    const result = engine.process(
      { ...baseInput, moves: [
        { type: "part_off", x: 0, feed: 0.05 },
      ]},
      baseConfig
    );
    expect(result.gcode).toContain("G01 X0.000 F0.05");
  });

  it("supports arc moves on lathe (G02/G03)", () => {
    const result = engine.process(
      { ...baseInput, moves: [
        { type: "arc_cw", x: 30, z: -10, i: 5, k: 0 },
        { type: "arc_ccw", x: 25, z: -15, i: 0, k: -5 },
      ]},
      baseConfig
    );
    expect(result.gcode).toContain("G02");
    expect(result.gcode).toContain("G03");
  });

  it("applies TNRC when configured", () => {
    const result = engine.process(
      { ...baseInput, tool_nose_radius_mm: 0.4 },
      { ...baseConfig, use_tnrc: true }
    );
    // Tool orientation 3 → "right" → G41
    expect(result.gcode).toContain("G41");
    expect(result.gcode).toContain("G40");  // cancel at end
  });

  it("uses RPM mode when CSS disabled", () => {
    const result = engine.process(
      { ...baseInput, surface_speed_mmin: undefined },
      { ...baseConfig, use_css: false }
    );
    expect(result.gcode).toContain("G97 S1500");
    expect(result.gcode).not.toContain("G96");
  });

  it("supports all 4 lathe controllers", () => {
    const controllers = engine.supportedControllers();
    expect(controllers).toHaveLength(4);
    expect(controllers).toContain("fanuc_turning");
    expect(controllers).toContain("haas_st");
    expect(controllers).toContain("mazak_qt");
    expect(controllers).toContain("okuma_lb");
  });

  it("surfaces turning and post-processing playbook warnings", () => {
    const result = engine.process(
      { ...baseInput, moves: [{ type: "feed", x: 48, z: -30 }] },
      baseConfig
    );

    expect(result.warnings.some(w => w.includes("[Playbook PP-001]"))).toBe(true);
  });

  it("Haas ST uses 4 decimal places", () => {
    const result = engine.process(
      { ...baseInput, moves: [
        { type: "feed", x: 25.1234, z: -10.5678 },
      ]},
      { ...baseConfig, controller: "haas_st", decimal_places: 4 }
    );
    expect(result.gcode).toContain("X25.1234");
    expect(result.gcode).toContain("Z-10.5678");
  });

  it("Okuma LB uses M50/M51 for coolant", () => {
    const result = engine.process(baseInput, { ...baseConfig, controller: "okuma_lb" });
    expect(result.gcode).toContain("M50");  // flood
  });

  it("generates bar feeder loop with M99", () => {
    const result = engine.process(baseInput, { ...baseConfig, bar_feeder: true });
    expect(result.gcode).toContain("M99");
    expect(result.gcode).toContain("BAR FEED");
  });

  it("includes line numbers when enabled", () => {
    const result = engine.process(
      { ...baseInput, moves: [{ type: "rapid", x: 50, z: 2 }] },
      { ...baseConfig, line_numbers: true }
    );
    expect(result.gcode).toMatch(/N\d+ /);
  });

  it("warns on canned cycle when disabled", () => {
    const result = engine.process(
      { ...baseInput, moves: [{ type: "rough_od" }] },
      { ...baseConfig, use_canned_cycles: false }
    );
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toContain("canned cycles disabled");
  });

  it("handles dwell and spindle orient", () => {
    const result = engine.process(
      { ...baseInput, moves: [
        { type: "dwell", dwell_sec: 2.5 },
        { type: "spindle_orient" },
      ]},
      baseConfig
    );
    expect(result.gcode).toContain("G04");
    expect(result.gcode).toContain("M19");
  });

  it("lists supported cycles", () => {
    const cycles = engine.supportedCycles();
    expect(cycles).toContain("G70");
    expect(cycles).toContain("G76");
    expect(cycles.length).toBeGreaterThanOrEqual(7);
  });

  it("handles comments in moves", () => {
    const result = engine.process(
      { ...baseInput, moves: [{ type: "comment", text: "OD FINISH PASS" }] },
      baseConfig
    );
    expect(result.gcode).toContain("OD FINISH PASS");
  });
});

// ============================================================================
// ProbingCycleEngine
// ============================================================================

describe("ProbingCycleEngine", () => {
  const engine = new ProbingCycleEngine();

  const baseConfig: ProbeConfig = {
    controller: "renishaw_haas",
    probe_tool_number: 99,
    feed_rate: 500,
    retract_distance: 2,
    overtravel: 10,
    print_result: true,
  };

  it("generates Renishaw bore probing (G65 P9812)", () => {
    const result = engine.generate(
      { operation: "bore", x: 50, y: 25, z: -5, expected_diameter: 20 },
      baseConfig
    );
    expect(result.gcode).toContain("G65 P9812");
    expect(result.gcode).toContain("D20");
    expect(result.operation).toBe("bore");
    expect(result.controller).toBe("renishaw_haas");
  });

  it("generates Renishaw boss probing (G65 P9814)", () => {
    const result = engine.generate(
      { operation: "boss", x: 0, y: 0, z: -3, expected_diameter: 30 },
      baseConfig
    );
    expect(result.gcode).toContain("G65 P9814");
  });

  it("generates surface Z probing", () => {
    const result = engine.generate(
      { operation: "surface_z", x: 50, y: 25, z: 0, approach_z: 10 },
      baseConfig
    );
    expect(result.gcode).toContain("G65 P9811");
    expect(result.gcode).toContain("Z0");
  });

  it("generates corner probing for X/Y datum", () => {
    const result = engine.generate(
      { operation: "corner", x: 0, y: 0 },
      baseConfig
    );
    expect(result.gcode).toContain("CORNER");
    expect(result.gcode).toContain("G65 P9811");
  });

  it("generates web X probing (G65 P9843)", () => {
    const result = engine.generate(
      { operation: "web_x", x: 25, y: 0, z: -5, expected_width: 40 },
      baseConfig
    );
    expect(result.gcode).toContain("G65 P9843");
    expect(result.gcode).toContain("X40");
  });

  it("generates Heidenhain bore probing (TCH PROBE 421)", () => {
    const result = engine.generate(
      { operation: "bore", x: 50, y: 25, z: -5, expected_diameter: 20 },
      { ...baseConfig, controller: "heidenhain" }
    );
    expect(result.gcode).toContain("TCH PROBE 421");
    expect(result.gcode).toContain("Q262=20.000");
  });

  it("generates Heidenhain surface Z probing (TCH PROBE 427)", () => {
    const result = engine.generate(
      { operation: "surface_z", x: 0, y: 0, z: 0 },
      { ...baseConfig, controller: "heidenhain" }
    );
    expect(result.gcode).toContain("TCH PROBE 427");
  });

  it("generates Siemens bore probing (CYCLE977)", () => {
    const result = engine.generate(
      { operation: "bore", expected_diameter: 25, z: -10 },
      { ...baseConfig, controller: "siemens" }
    );
    expect(result.gcode).toContain("CYCLE977");
  });

  it("generates tool length measurement", () => {
    const result = engine.generate(
      { operation: "tool_length", expected_length: 80 },
      baseConfig
    );
    expect(result.gcode).toContain("P9023");
    expect(result.gcode).toContain("TOOL LENGTH");
  });

  it("generates tool diameter measurement", () => {
    const result = engine.generate(
      { operation: "tool_diameter", expected_diameter: 12 },
      baseConfig
    );
    expect(result.gcode).toContain("P9023");
    expect(result.gcode).toContain("D12");
  });

  it("tracks work offset variables", () => {
    const result = engine.generate(
      { operation: "bore", x: 0, y: 0, expected_diameter: 20 },
      { ...baseConfig, work_offset_to_set: "G54" }
    );
    expect(result.variables_set).toContain("G54");
  });

  it("supports all 4 probe controllers", () => {
    const controllers = engine.supportedControllers();
    expect(controllers).toHaveLength(4);
    expect(controllers).toContain("renishaw_fanuc");
    expect(controllers).toContain("heidenhain");
    expect(controllers).toContain("siemens");
  });

  it("supports all 12 probe operations", () => {
    const ops = engine.supportedOperations();
    expect(ops).toHaveLength(12);
    expect(ops).toContain("bore");
    expect(ops).toContain("surface_z");
    expect(ops).toContain("tool_length");
  });

  it("generates angle probing", () => {
    const result = engine.generate(
      { operation: "angle", x: 0, y: 0, expected_width: 100 },
      baseConfig
    );
    expect(result.gcode).toContain("ANGLE");
  });

  it("adds tolerance check comment", () => {
    const result = engine.generate(
      { operation: "surface_z", tolerance_mm: 0.02 },
      baseConfig
    );
    expect(result.gcode).toContain("TOLERANCE CHECK");
    expect(result.gcode).toContain("0.02");
  });
});

// ============================================================================
// SubprogramEngine
// ============================================================================

describe("SubprogramEngine", () => {
  const engine = new SubprogramEngine();

  it("generates Fanuc M98 subprogram call", () => {
    const result = engine.generateCall(
      { program_number: 2000, repeat_count: 3 },
      "fanuc"
    );
    expect(result.gcode).toContain("M98 P2000 L3");
    expect(result.subprograms_called).toContain(2000);
  });

  it("generates Haas M98 call with arguments", () => {
    const result = engine.generateCall(
      { program_number: 5000, arguments: { A: 10, B: 25 } },
      "haas"
    );
    expect(result.gcode).toContain("M98 P5000");
    expect(result.gcode).toContain("A10");
    expect(result.gcode).toContain("B25");
  });

  it("generates Siemens CALL syntax", () => {
    const result = engine.generateCall(
      { program_number: 100 },
      "siemens"
    );
    expect(result.gcode).toContain('CALL "100"');
  });

  it("generates Heidenhain PGM CALL", () => {
    const result = engine.generateCall(
      { program_number: 500, repeat_count: 4 },
      "heidenhain"
    );
    expect(result.gcode).toContain("CALL PGM 500 REP 4");
  });

  it("generates pattern repeat with coordinate shifts", () => {
    const config: PatternRepeatConfig = {
      subprogram_number: 1000,
      positions: [
        { x: 0, y: 0 },
        { x: 50, y: 0 },
        { x: 100, y: 0 },
        { x: 0, y: 50 },
      ],
    };
    const result = engine.generatePatternRepeat(config, "fanuc");
    expect(result.gcode).toContain("G52 X0.000 Y0.000");
    expect(result.gcode).toContain("G52 X50.000 Y0.000");
    expect(result.gcode).toContain("G52 X100.000 Y0.000");
    expect(result.gcode).toContain("M98 P1000");
    // Should have 4 M98 calls
    expect(result.gcode.split("M98 P1000").length - 1).toBe(4);
    expect(result.subprograms_called).toContain(1000);
  });

  it("generates pattern repeat with rotation", () => {
    const config: PatternRepeatConfig = {
      subprogram_number: 2000,
      positions: [
        { x: 0, y: 0, angle: 0 },
        { x: 0, y: 0, angle: 90 },
        { x: 0, y: 0, angle: 180 },
      ],
    };
    const result = engine.generatePatternRepeat(config, "fanuc");
    expect(result.gcode).toContain("G68 X0 Y0 R90.000");
    expect(result.gcode).toContain("G69"); // cancel rotation
  });

  it("generates Siemens pattern with TRANS/AROT", () => {
    const config: PatternRepeatConfig = {
      subprogram_number: 100,
      positions: [
        { x: 25, y: 25, angle: 45 },
      ],
    };
    const result = engine.generatePatternRepeat(config, "siemens");
    expect(result.gcode).toContain("TRANS X25.000 Y25.000");
    expect(result.gcode).toContain("AROT RPL=45.000");
    expect(result.gcode).toContain('CALL "100"');
  });

  it("generates Heidenhain pattern with CYCL DEF 7", () => {
    const config: PatternRepeatConfig = {
      subprogram_number: 300,
      positions: [{ x: 10, y: 20 }],
    };
    const result = engine.generatePatternRepeat(config, "heidenhain");
    expect(result.gcode).toContain("CYCL DEF 7.0 DATUM SHIFT");
    expect(result.gcode).toContain("CYCL DEF 7.1 X10.000");
    expect(result.gcode).toContain("CALL PGM 300");
  });

  it("generates parametric variable assignments for Fanuc", () => {
    const block: ParametricBlock = {
      variables: { A: 10.5, B: 25, C: 3.14 },
    };
    const result = engine.generateVariables(block, "fanuc");
    expect(result.gcode).toContain("#100=10.5");
    expect(result.gcode).toContain("#101=25");
    expect(result.gcode).toContain("#102=3.14");
  });

  it("generates Siemens R-parameter assignments", () => {
    const block: ParametricBlock = {
      variables: { A: 100 },
    };
    const result = engine.generateVariables(block, "siemens");
    expect(result.gcode).toContain("R100=100");
  });

  it("generates Heidenhain Q-parameter assignments", () => {
    const block: ParametricBlock = {
      variables: { A: 50 },
    };
    const result = engine.generateVariables(block, "heidenhain");
    expect(result.gcode).toContain("FN 0: Q100 = +50.000");
  });

  it("generates IF/GOTO conditional for Fanuc", () => {
    const template: ConditionalTemplate = {
      type: "if_goto",
      condition: "#100 GT 10",
      goto_line: 500,
    };
    const result = engine.generateConditional(template, "fanuc");
    expect(result.gcode).toContain("IF [#100 GT 10] GOTO 500");
  });

  it("generates WHILE/DO loop for Fanuc", () => {
    const template: ConditionalTemplate = {
      type: "while_do",
      condition: "#100 LT 5",
      body_lines: ["#100=#100+1", "G01 X#101 F500"],
    };
    const result = engine.generateConditional(template, "fanuc");
    expect(result.gcode).toContain("WHILE [#100 LT 5] DO1");
    expect(result.gcode).toContain("#100=#100+1");
    expect(result.gcode).toContain("END1");
  });

  it("generates Siemens IF/THEN", () => {
    const template: ConditionalTemplate = {
      type: "if_then",
      condition: "R100 > 10",
      body_lines: ["R101 = R100 * 2"],
    };
    const result = engine.generateConditional(template, "siemens");
    expect(result.gcode).toContain("IF R100 > 10");
    expect(result.gcode).toContain("ENDIF");
  });

  it("generates complete subprogram wrapper", () => {
    const result = engine.generateSubprogram(
      9001,
      ["G00 X0 Y0", "G01 Z-10 F500", "G01 X50 F200"],
      "fanuc"
    );
    expect(result.gcode).toContain("O9001");
    expect(result.gcode).toContain("M99");
    expect(result.gcode).toContain("G01 Z-10 F500");
  });

  it("generates Heidenhain subprogram wrapper", () => {
    const result = engine.generateSubprogram(
      200,
      ["L X10 Y20 R0 F500"],
      "heidenhain"
    );
    expect(result.gcode).toContain("BEGIN PGM 200 MM");
    expect(result.gcode).toContain("END PGM 200 MM");
  });

  it("supports all 4 controllers", () => {
    const controllers = engine.supportedControllers();
    expect(controllers).toHaveLength(4);
  });

  it("warns when IF/GOTO missing goto_line", () => {
    const result = engine.generateConditional(
      { type: "if_goto", condition: "#100 GT 0" },
      "fanuc"
    );
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it("warns when WHILE/DO missing body", () => {
    const result = engine.generateConditional(
      { type: "while_do", condition: "#100 LT 5" },
      "fanuc"
    );
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});
