/**
 * PostOutputGenerationEngine tests -- POST-ULT-MS12 Pipeline Phase 6.
 *
 * Verified exported symbols:
 *   class PostOutputGenerationEngine
 *   const postOutputGenerationEngine (singleton)
 *   type OutputGenerationInput, OutputGenerationResult, SetupSheet,
 *        ProgramAnalytics, ProbeRoutine, ControllerFamily, OperationInfo
 *
 * Coverage: generate, format_only, setup_sheet, analytics, prove_out,
 *           generateCannedCycle, generateProbeRoutines, listControllers,
 *           resolveController (utility), injectProperties, dialects,
 *           program size split, prove-out feed halving.
 */

import { describe, it, expect } from "vitest";
import {
  PostOutputGenerationEngine,
  postOutputGenerationEngine,
  type OutputGenerationInput,
  type OperationInfo,
} from "../engines/PostOutputGenerationEngine.js";

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const MINIMAL_INPUT: OutputGenerationInput = {
  optimized_gcode: "G00 X0 Y0\nG01 X10.0 Y5.0 F200\nM05",
  controller: "fanuc",
  machine_options: {},
};

const OP1: OperationInfo = {
  name: "Rough Mill",
  tool_number: 1,
  tool_description: "20mm 4-Flute EM",
  tool_diameter_mm: 20,
  tool_projection_mm: 75,
  holder: "ER32",
  operation_type: "roughing",
  physics_data: {
    force_range_N: [400, 1200],
    power_range_kW: [2.0, 5.5],
    cycle_time_sec: 120,
    tool_life_consumed_percent: 15,
    original_cycle_sec: 160,
    optimized_cycle_sec: 120,
  },
  wcs_offset: "G54",
  critical_features: [
    { feature: "bore_main", nominal: "25.400", tolerance: "+0.000/-0.013", method: "CMM" },
  ],
};

const OP2: OperationInfo = {
  name: "Finish Mill",
  tool_number: 2,
  tool_description: "10mm 4-Flute EM Finish",
  tool_diameter_mm: 10,
  tool_projection_mm: 50,
  holder: "ER16",
  operation_type: "finish",
  physics_data: {
    force_range_N: [150, 400],
    power_range_kW: [0.5, 2.0],
    cycle_time_sec: 90,
    tool_life_consumed_percent: 8,
    original_cycle_sec: 110,
    optimized_cycle_sec: 90,
    predicted_ra_um: 0.8,
  },
  wcs_offset: "G54",
};

const FULL_INPUT: OutputGenerationInput = {
  optimized_gcode: "T1 M06\nG00 X0 Y0\nG01 X50.0 Y0.0 F500\nT2 M06\nG01 X50.0 Y50.0 F300\nM30",
  controller: "fanuc",
  controller_variant: "31i",
  machine_options: { hasProbing: true, hasRigidTap: true, hasTSC: false },
  program_number: 1234,
  program_name: "BRACKET_PART",
  generate_setup_sheet: true,
  generate_probe_routines: true,
  generate_analytics: true,
  generate_prove_out: true,
  inject_operator_comments: true,
  optimize_program_size: true,
  operations: [OP1, OP2],
  machine_rate_per_hr: 120,
  tool_cost_per_part: 4.5,
};

// ---------------------------------------------------------------------------
// Singleton identity
// ---------------------------------------------------------------------------

describe("singleton", () => {
  it("exports a pre-constructed instance of PostOutputGenerationEngine", () => {
    expect(postOutputGenerationEngine).toBeInstanceOf(PostOutputGenerationEngine);
  });

  it("singleton and a fresh instance produce identical results on identical input", () => {
    const fresh = new PostOutputGenerationEngine();
    const r1 = postOutputGenerationEngine.format_only(MINIMAL_INPUT);
    const r2 = fresh.format_only(MINIMAL_INPUT);
    expect(r1.final_gcode).toBe(r2.final_gcode);
  });
});

// ---------------------------------------------------------------------------
// listControllers
// ---------------------------------------------------------------------------

describe("listControllers", () => {
  it("returns exactly 6 controller families", () => {
    const list = postOutputGenerationEngine.listControllers();
    expect(list).toHaveLength(6);
  });

  it("includes fanuc, haas, siemens, heidenhain, mazak, okuma", () => {
    const families = postOutputGenerationEngine.listControllers().map((c) => c.family);
    for (const f of ["fanuc", "haas", "siemens", "heidenhain", "mazak", "okuma"] as const) {
      expect(families).toContain(f);
    }
  });

  it("each entry has a non-empty aliases array", () => {
    for (const entry of postOutputGenerationEngine.listControllers()) {
      expect(entry.aliases.length).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// resolveController (utility method)
// ---------------------------------------------------------------------------

describe("resolveController", () => {
  it("resolves 'haas-vf' to haas family", () => {
    const tpl = postOutputGenerationEngine.resolveController("haas-vf");
    expect((tpl as { family: string }).family).toBe("haas");
  });

  it("resolves 'sinumerik' to siemens family", () => {
    const tpl = postOutputGenerationEngine.resolveController("sinumerik");
    expect((tpl as { family: string }).family).toBe("siemens");
  });

  it("falls back to fanuc for unknown controller string", () => {
    const tpl = postOutputGenerationEngine.resolveController("totally_unknown_xyz");
    expect((tpl as { family: string }).family).toBe("fanuc");
  });

  it("resolve is case-insensitive -- 'HAAS' resolves to haas", () => {
    const tpl = postOutputGenerationEngine.resolveController("HAAS");
    expect((tpl as { family: string }).family).toBe("haas");
  });
});

// ---------------------------------------------------------------------------
// format_only
// ---------------------------------------------------------------------------

describe("format_only", () => {
  it("wraps fanuc output with % header and M30 footer", () => {
    const r = postOutputGenerationEngine.format_only({
      ...MINIMAL_INPUT,
      program_number: 42,
      program_name: "TEST",
    });
    const lines = r.final_gcode.split("\n");
    expect(lines[0]).toBe("%");
    expect(lines[1]).toBe("O0042 (TEST)");
    expect(lines).toContain("M30");
    expect(lines[lines.length - 1]).toBe("%");
  });

  it("wraps okuma output with O#### header and M02 footer (no leading %)", () => {
    const r = postOutputGenerationEngine.format_only({
      ...MINIMAL_INPUT,
      controller: "okuma",
      program_number: 5,
      program_name: "OKUMA_TEST",
    });
    const lines = r.final_gcode.split("\n");
    expect(lines[0]).toBe("O0005 (OKUMA_TEST)");
    expect(lines).toContain("M02");
    // okuma has no wrapperStart/End
    expect(lines[lines.length - 1]).not.toBe("%");
  });

  it("wraps heidenhain output with BEGIN PGM / END PGM", () => {
    const r = postOutputGenerationEngine.format_only({
      ...MINIMAL_INPUT,
      controller: "heidenhain",
      program_name: "HPGM",
    });
    const lines = r.final_gcode.split("\n");
    expect(lines[0]).toBe("BEGIN PGM HPGM MM");
    expect(lines).toContain("END PGM");
  });

  it("defaults program number to 1 and name to PRISM_PROGRAM when not supplied", () => {
    const r = postOutputGenerationEngine.format_only(MINIMAL_INPUT);
    expect(r.final_gcode).toContain("O0001 (PRISM_PROGRAM)");
  });

  it("file_size_bytes is the UTF-8 byte length of final_gcode", () => {
    const r = postOutputGenerationEngine.format_only(MINIMAL_INPUT);
    const expected = new TextEncoder().encode(r.final_gcode).length;
    expect(r.file_size_bytes).toBe(expected);
  });

  it("line_count equals number of newline-delimited lines", () => {
    const r = postOutputGenerationEngine.format_only(MINIMAL_INPUT);
    expect(r.line_count).toBe(r.final_gcode.split("\n").length);
  });

  it("was_split is always false in format_only mode", () => {
    const r = postOutputGenerationEngine.format_only(MINIMAL_INPUT);
    expect(r.was_split).toBe(false);
  });

  it("strips TSC code M88 and replaces with M8 when hasTSC=false (property injection)", () => {
    const r = postOutputGenerationEngine.format_only({
      ...MINIMAL_INPUT,
      optimized_gcode: "G01 X10 F200\nM88\nM30",
      machine_options: { hasTSC: false },
    });
    expect(r.final_gcode).not.toContain("M88");
    expect(r.final_gcode).toContain("M8");
  });

  it("does NOT strip M88 when hasTSC option is absent (undefined = no rule fires)", () => {
    const r = postOutputGenerationEngine.format_only({
      ...MINIMAL_INPUT,
      optimized_gcode: "G01 X10 F200\nM88\nM30",
      machine_options: {},
    });
    expect(r.final_gcode).toContain("M88");
  });

  it("siemens includes SUPA in safe-start block", () => {
    const r = postOutputGenerationEngine.format_only({
      ...MINIMAL_INPUT,
      controller: "siemens",
    });
    expect(r.final_gcode).toContain("SUPA");
  });

  it("haas extended work offset: G54.1 P3 (n=3, not >6) is rewritten to G154 P9 (6+3)", () => {
    // translateDialect: G54.1 P3 -> n=3, n<=6 so workOffsetFormat(6+3=9) -> "G154 P9"
    const r = postOutputGenerationEngine.format_only({
      ...MINIMAL_INPUT,
      optimized_gcode: "G54.1 P3\nG01 X10 F200\nM30",
      controller: "haas",
      machine_options: {},
    });
    expect(r.final_gcode).toContain("G154 P9");
  });

  it("adversarial: gcode with no newlines still produces valid wrapping", () => {
    const r = postOutputGenerationEngine.format_only({
      ...MINIMAL_INPUT,
      optimized_gcode: "G01X10F200",
      program_number: 1,
      program_name: "FLAT",
    });
    expect(r.final_gcode).toContain("O0001 (FLAT)");
    expect(r.final_gcode).toContain("M30");
    expect(r.line_count).toBeGreaterThan(1);
  });

  it("adversarial: empty gcode string produces wrapped skeleton -- byte invariant holds", () => {
    const r = postOutputGenerationEngine.format_only({
      ...MINIMAL_INPUT,
      optimized_gcode: "",
      program_number: 99,
      program_name: "EMPTY",
    });
    expect(r.final_gcode).toContain("O0099 (EMPTY)");
    expect(r.final_gcode).toContain("M30");
    expect(r.file_size_bytes).toBe(new TextEncoder().encode(r.final_gcode).length);
  });
});

// ---------------------------------------------------------------------------
// generateCannedCycle
// ---------------------------------------------------------------------------

describe("generateCannedCycle", () => {
  it("fanuc drill: G81 Z-depth R-retract Feed -- concrete reference values", () => {
    const s = postOutputGenerationEngine.generateCannedCycle("fanuc", {
      type: "drill",
      depth: -25,
      retract: 2,
      diameter_mm: 10,
      feed: 150,
    });
    expect(s).toBe("G81 Z-25.000 R2.000 F150.0");
  });

  it("haas drill uses 4 decimal places for Z and R", () => {
    const s = postOutputGenerationEngine.generateCannedCycle("haas", {
      type: "drill",
      depth: -12.7,
      retract: 1.5,
      diameter_mm: 6,
      feed: 100,
    });
    expect(s).toBe("G81 Z-12.7000 R1.5000 F100.0");
  });

  it("fanuc peck: peck depth = max(0.5, dia*3.0) = 30.0 for 10mm tool with no hardness", () => {
    // hardnessFactor=1.0 -> peckDepth = max(0.5, 10*3.0*1.0) = 30.000
    const s = postOutputGenerationEngine.generateCannedCycle("fanuc", {
      type: "peck",
      depth: -50,
      retract: 2,
      diameter_mm: 10,
      feed: 120,
    });
    expect(s).toBe("G83 Z-50.000 R2.000 Q30.000 F120.0");
  });

  it("peck depth reduces with high hardness (60 HRC): factor=0.4, peckDepth=max(0.5,8*3*0.4)=9.6", () => {
    // factor = max(0.3, 1 - (60-20)*0.015) = max(0.3, 0.4) = 0.4
    // peckDepth = max(0.5, 8 * 3.0 * 0.4) = 9.6
    const s = postOutputGenerationEngine.generateCannedCycle("fanuc", {
      type: "peck",
      depth: -40,
      retract: 2,
      diameter_mm: 8,
      material_hardness_hrc: 60,
      feed: 80,
    });
    expect(s).toBe("G83 Z-40.000 R2.000 Q9.600 F80.0");
  });

  it("tap: fanuc G84 with feed = speed * pitch (500 * 1.25 = 625.0)", () => {
    const s = postOutputGenerationEngine.generateCannedCycle("fanuc", {
      type: "tap",
      depth: -20,
      retract: 2,
      diameter_mm: 10,
      pitch: 1.25,
      speed: 500,
    });
    expect(s).toBe("G84 Z-20.000 R2.0 F625.0 S500");
  });

  it("haas tap uses G84.2 with J2 rigid tap modifier", () => {
    const s = postOutputGenerationEngine.generateCannedCycle("haas", {
      type: "tap",
      depth: -15,
      retract: 2,
      diameter_mm: 8,
      pitch: 1.0,
      speed: 600,
    });
    expect(s).toBe("G84.2 Z-15.0000 R2.0 F600.0 S600 J2");
  });

  it("chipBreak type: peck depth = 30*0.5 = 15 (half-peck) for 10mm dia, no hardness", () => {
    // peckDepth = 30 -> chipBreak Q = 30*0.5 = 15.000
    const s = postOutputGenerationEngine.generateCannedCycle("fanuc", {
      type: "chipBreak",
      depth: -60,
      retract: 2,
      diameter_mm: 10,
      feed: 100,
    });
    expect(s).toBe("G73 Z-60.000 R2.000 Q15.000 F100.0");
  });

  it("okuma bore uses G86 (not G85 like fanuc/mazak)", () => {
    const s = postOutputGenerationEngine.generateCannedCycle("okuma", {
      type: "bore",
      depth: -30,
      retract: 2,
      diameter_mm: 20,
      feed: 80,
    });
    expect(s).toBe("G86 Z-30.000 R2.000 F80.0");
  });

  it("siemens drill uses CYCLE81 format with retract and depth", () => {
    const s = postOutputGenerationEngine.generateCannedCycle("siemens", {
      type: "drill",
      depth: -20,
      retract: 5,
      diameter_mm: 8,
      feed: 120,
    });
    expect(s).toBe("CYCLE81(5.000, 0, 2, -20.000)");
  });

  it("heidenhain drill uses CYCL DEF 200 block format with Q-param depth and feed", () => {
    const s = postOutputGenerationEngine.generateCannedCycle("heidenhain", {
      type: "drill",
      depth: -15,
      retract: 3,
      diameter_mm: 6,
      feed: 90,
    });
    expect(s).toContain("CYCL DEF 200 DRILLING");
    expect(s).toContain("Q201=15.000");
    expect(s).toContain("Q206=90");
  });

  it("unknown controller falls back to fanuc G81 drill", () => {
    const s = postOutputGenerationEngine.generateCannedCycle("no_such_controller", {
      type: "drill",
      depth: -10,
      retract: 2,
      diameter_mm: 6,
      feed: 100,
    });
    expect(s).toBe("G81 Z-10.000 R2.000 F100.0");
  });
});

// ---------------------------------------------------------------------------
// generateProbeRoutines
// ---------------------------------------------------------------------------

describe("generateProbeRoutines", () => {
  it("returns one routine per requested type", () => {
    const routines = postOutputGenerationEngine.generateProbeRoutines(
      "fanuc",
      [OP1],
      ["wcs_setup", "first_article"],
    );
    expect(routines).toHaveLength(2);
    expect(routines[0].type).toBe("wcs_setup");
    expect(routines[1].type).toBe("first_article");
  });

  it("wcs_setup routine contains X/Y/Z datum probe calls (G65 P9811 for fanuc)", () => {
    const [r] = postOutputGenerationEngine.generateProbeRoutines("fanuc", [OP1], ["wcs_setup"]);
    expect(r.gcode).toContain("G65 P9811 X0.000");
    expect(r.gcode).toContain("G65 P9811 Y0.000");
    expect(r.gcode).toContain("G65 P9811 Z0.000");
    expect(r.features).toContain("X datum");
    expect(r.features).toContain("Y datum");
    expect(r.features).toContain("Z datum");
  });

  it("first_article routine probes bore features with G65 P9814 D25.400 for fanuc", () => {
    const [r] = postOutputGenerationEngine.generateProbeRoutines("fanuc", [OP1], ["first_article"]);
    // OP1 has critical_feature 'bore_main' nominal 25.400
    expect(r.gcode).toContain("G65 P9814");
    expect(r.gcode).toContain("D25.400");
    expect(r.features.some((f) => f.includes("bore_main"))).toBe(true);
  });

  it("okuma wcs_setup uses G65 P8811 (not P9811)", () => {
    const [r] = postOutputGenerationEngine.generateProbeRoutines("okuma", [OP1], ["wcs_setup"]);
    expect(r.gcode).toContain("G65 P8811");
    expect(r.gcode).not.toContain("G65 P9811");
  });

  it("in_process with no critical features includes NO CRITICAL FEATURES comment", () => {
    const opNoCrit: OperationInfo = {
      name: "Simple Op",
      tool_number: 3,
      tool_description: "Drill",
      operation_type: "drilling",
    };
    const [r] = postOutputGenerationEngine.generateProbeRoutines("fanuc", [opNoCrit], ["in_process"]);
    expect(r.gcode).toContain("NO CRITICAL FEATURES");
  });

  it("returns empty array when types list is empty", () => {
    const routines = postOutputGenerationEngine.generateProbeRoutines("fanuc", [OP1], []);
    expect(routines).toHaveLength(0);
  });

  it("adversarial: empty operations list -- wcs_setup still returns X/Y/Z datum probes", () => {
    const [r] = postOutputGenerationEngine.generateProbeRoutines("fanuc", [], ["wcs_setup"]);
    expect(r.features).toContain("X datum");
  });
});

// ---------------------------------------------------------------------------
// analytics action
// ---------------------------------------------------------------------------

describe("analytics", () => {
  it("total_cycle_time_sec includes tool-change overhead + rapid time on top of op times", () => {
    // OP1 cycle=120, OP2 cycle=90 -> opSum=210
    // tool_changes=2 distinct tools -> toolChangeTime = 2*8 = 16
    // rapidTime = 210 * 0.1 = 21
    // totalCycleTime = round(210 + 16 + 21) = 247
    const r = postOutputGenerationEngine.analytics({
      ...MINIMAL_INPUT,
      operations: [OP1, OP2],
    });
    const a = r.analytics!;
    expect(a.total_cycle_time_sec).toBe(247);
  });

  it("cutting_time_sec is round(75% of op-sum) = round(157.5) = 158", () => {
    const a = postOutputGenerationEngine.analytics({
      ...MINIMAL_INPUT,
      operations: [OP1, OP2],
    }).analytics!;
    expect(a.cutting_time_sec).toBe(158);
  });

  it("non_cutting_time_sec = 2*8 + 210*0.1 = 37 (tool-change + rapid)", () => {
    const a = postOutputGenerationEngine.analytics({
      ...MINIMAL_INPUT,
      operations: [OP1, OP2],
    }).analytics!;
    expect(a.non_cutting_time_sec).toBe(37);
  });

  it("optimization_delta time_saved_sec = (160+110) - (120+90) = 60", () => {
    const a = postOutputGenerationEngine.analytics({
      ...MINIMAL_INPUT,
      operations: [OP1, OP2],
    }).analytics!;
    expect(a.optimization_delta.time_saved_sec).toBe(60);
  });

  it("optimization_delta time_saved_percent = round1dp(60/270 * 100) = 22.2", () => {
    const a = postOutputGenerationEngine.analytics({
      ...MINIMAL_INPUT,
      operations: [OP1, OP2],
    }).analytics!;
    expect(a.optimization_delta.time_saved_percent).toBeCloseTo(22.2, 1);
  });

  it("cost estimate cost_per_part = round2dp(247/3600 * 120) when machine_rate_per_hr=120", () => {
    const expected = Math.round((247 / 3600) * 120 * 100) / 100;
    const a = postOutputGenerationEngine.analytics({
      ...MINIMAL_INPUT,
      operations: [OP1, OP2],
      machine_rate_per_hr: 120,
      tool_cost_per_part: 3.0,
    }).analytics!;
    expect(a.cost_estimate!.machine_rate_per_hr).toBe(120);
    expect(a.cost_estimate!.tool_cost_per_part).toBe(3.0);
    expect(a.cost_estimate!.cost_per_part).toBeCloseTo(expected, 1);
  });

  it("cost estimate absent when machine_rate_per_hr not provided", () => {
    const a = postOutputGenerationEngine.analytics({
      ...MINIMAL_INPUT,
      operations: [OP1, OP2],
    }).analytics!;
    // must be undefined -- no cost data to compute
    expect(a.cost_estimate).toBeUndefined();
  });

  it("per_operation array has one entry per operation with correct fields", () => {
    const a = postOutputGenerationEngine.analytics({
      ...MINIMAL_INPUT,
      operations: [OP1, OP2],
    }).analytics!;
    expect(a.per_operation).toHaveLength(2);
    expect(a.per_operation[0].op).toBe(1);
    expect(a.per_operation[0].name).toBe("Rough Mill");
    expect(a.per_operation[0].time_sec).toBe(120);
    expect(a.per_operation[0].force_range_N).toEqual([400, 1200]);
    expect(a.per_operation[0].power_range_kW).toEqual([2.0, 5.5]);
    expect(a.per_operation[1].predicted_ra_um).toBeCloseTo(0.8, 3);
  });

  it("analytics with zero operations: total_cycle_time_sec=0, per_operation=[], time_saved=0", () => {
    const a = postOutputGenerationEngine.analytics({
      ...MINIMAL_INPUT,
      operations: [],
    }).analytics!;
    expect(a.total_cycle_time_sec).toBe(0);
    expect(a.per_operation).toHaveLength(0);
    expect(a.optimization_delta.time_saved_sec).toBe(0);
  });

  it("final_gcode is unchanged (pass-through) in analytics action", () => {
    const body = "G01 X10 F200";
    const r = postOutputGenerationEngine.analytics({
      ...MINIMAL_INPUT,
      optimized_gcode: body,
      operations: [],
    });
    expect(r.final_gcode).toBe(body);
  });
});

// ---------------------------------------------------------------------------
// setup_sheet action
// ---------------------------------------------------------------------------

describe("setup_sheet", () => {
  it("program_info number is padded to O#### format", () => {
    const r = postOutputGenerationEngine.setup_sheet({
      ...MINIMAL_INPUT,
      program_number: 7,
      program_name: "MY_PART",
      operations: [OP1],
    });
    expect(r.setup_sheet!.program_info.number).toBe("O0007");
    expect(r.setup_sheet!.program_info.name).toBe("MY_PART");
  });

  it("tool_list deduplicates tools by tool_number (OP1 appears twice -> 2 unique tools)", () => {
    const opDup: OperationInfo = { ...OP1, name: "Re-entry Rough" };
    const r = postOutputGenerationEngine.setup_sheet({
      ...MINIMAL_INPUT,
      operations: [OP1, opDup, OP2],
    });
    expect(r.setup_sheet!.tool_list).toHaveLength(2);
  });

  it("finish op tool entry has CHECK RUNOUT note", () => {
    const r = postOutputGenerationEngine.setup_sheet({
      ...MINIMAL_INPUT,
      operations: [OP2],
    });
    expect(r.setup_sheet!.tool_list[0].notes).toContain("RUNOUT");
  });

  it("wcs_setup defaults to G54 when no wcs_offset on any op", () => {
    const opNoWcs: OperationInfo = {
      name: "Op",
      tool_number: 1,
      tool_description: "Drill",
      operation_type: "drilling",
    };
    const r = postOutputGenerationEngine.setup_sheet({
      ...MINIMAL_INPUT,
      operations: [opNoWcs],
    });
    expect(r.setup_sheet!.wcs_setup[0].offset).toBe("G54");
  });

  it("inspection_checklist contains critical features from OP1 (bore_main)", () => {
    const r = postOutputGenerationEngine.setup_sheet({
      ...MINIMAL_INPUT,
      operations: [OP1, OP2],
    });
    const items = r.setup_sheet!.inspection_checklist;
    expect(items.length).toBeGreaterThanOrEqual(1);
    expect(items[0].feature).toBe("bore_main");
    expect(items[0].nominal).toBe("25.400");
  });

  it("notes list includes controller family name and PRISM tag", () => {
    const r = postOutputGenerationEngine.setup_sheet({
      ...MINIMAL_INPUT,
      controller: "haas",
      controller_variant: "NGC",
      operations: [OP1],
    });
    const notes = r.setup_sheet!.notes;
    expect(notes.some((n) => n.includes("HAAS"))).toBe(true);
    expect(notes.some((n) => n.includes("PRISM"))).toBe(true);
  });

  it("final_gcode is the original optimized_gcode unchanged", () => {
    const body = "G01 X50.0 F300";
    const r = postOutputGenerationEngine.setup_sheet({
      ...MINIMAL_INPUT,
      optimized_gcode: body,
      operations: [OP1],
    });
    expect(r.final_gcode).toBe(body);
  });
});

// ---------------------------------------------------------------------------
// prove_out action
// ---------------------------------------------------------------------------

describe("prove_out", () => {
  it("halves all F feed-rate values: F400->F200.0 and F800->F400.0", () => {
    const r = postOutputGenerationEngine.prove_out({
      ...MINIMAL_INPUT,
      optimized_gcode: "G01 X10.0 F400\nG01 Y5.0 F800",
    });
    expect(r.prove_out_gcode).toContain("F200.0");
    expect(r.prove_out_gcode).toContain("F400.0");
  });

  it("prefixes plunge rapid moves (G00 Z-) with block-delete /", () => {
    const r = postOutputGenerationEngine.prove_out({
      ...MINIMAL_INPUT,
      optimized_gcode: "G00 Z-5.0\nG01 X10.0 F300",
    });
    expect(r.prove_out_gcode).toContain("/G00 Z-5.0");
  });

  it("inserts M01 optional stop after every tool change (2 tool changes -> 2 M01 lines)", () => {
    const r = postOutputGenerationEngine.prove_out({
      ...MINIMAL_INPUT,
      optimized_gcode: "T1 M06\nG01 X10 F200\nT2 M06\nG01 X20 F300",
    });
    const m01Lines = r.prove_out_gcode!.split("\n").filter((l) => l.trim() === "M01");
    expect(m01Lines.length).toBe(2);
  });

  it("adds PROVE-OUT MODE header comment and END PROVE-OUT MODE footer comment", () => {
    const r = postOutputGenerationEngine.prove_out({
      ...MINIMAL_INPUT,
      optimized_gcode: "G01 X10 F100",
    });
    expect(r.prove_out_gcode).toContain("PROVE-OUT MODE");
    expect(r.prove_out_gcode).toContain("END PROVE-OUT MODE");
  });

  it("original final_gcode is unchanged by prove_out action", () => {
    const body = "G01 X10.0 F200";
    const r = postOutputGenerationEngine.prove_out({
      ...MINIMAL_INPUT,
      optimized_gcode: body,
    });
    expect(r.final_gcode).toBe(body);
  });

  it("adversarial: gcode with no F codes -- prove_out gcode contains no NaN", () => {
    const r = postOutputGenerationEngine.prove_out({
      ...MINIMAL_INPUT,
      optimized_gcode: "G00 X0 Y0\nM05\nM30",
    });
    expect(r.prove_out_gcode).not.toContain("NaN");
    expect(r.prove_out_gcode).toContain("PROVE-OUT MODE");
  });
});

// ---------------------------------------------------------------------------
// generate (full pipeline)
// ---------------------------------------------------------------------------

describe("generate -- full pipeline", () => {
  it("returns final_gcode with fanuc O1234 program header", () => {
    const r = postOutputGenerationEngine.generate(FULL_INPUT);
    expect(r.final_gcode).toContain("O1234 (BRACKET_PART)");
  });

  it("analytics comment block embedded in final_gcode", () => {
    const r = postOutputGenerationEngine.generate(FULL_INPUT);
    expect(r.final_gcode).toContain("PRISM ANALYTICS REPORT");
  });

  it("operator comments injected at T1 tool change boundary", () => {
    const r = postOutputGenerationEngine.generate(FULL_INPUT);
    expect(r.final_gcode).toContain("OP1:");
  });

  it("setup_sheet program_info.number = 'O1234' for program_number=1234", () => {
    const r = postOutputGenerationEngine.generate(FULL_INPUT);
    expect(r.setup_sheet!.program_info.number).toBe("O1234");
  });

  it("probe_routines has 3 entries (wcs_setup, in_process, first_article)", () => {
    const r = postOutputGenerationEngine.generate(FULL_INPUT);
    expect(r.probe_routines!).toHaveLength(3);
    expect(r.probe_routines![0].type).toBe("wcs_setup");
    expect(r.probe_routines![1].type).toBe("in_process");
    expect(r.probe_routines![2].type).toBe("first_article");
  });

  it("prove_out_gcode contains PROVE-OUT MODE header", () => {
    const r = postOutputGenerationEngine.generate(FULL_INPUT);
    expect(r.prove_out_gcode).toContain("PROVE-OUT MODE");
  });

  it("file_size_bytes == byte length of final_gcode (algebraic identity)", () => {
    const r = postOutputGenerationEngine.generate(FULL_INPUT);
    expect(r.file_size_bytes).toBe(new TextEncoder().encode(r.final_gcode).length);
  });

  it("line_count == final_gcode split by newline length (algebraic identity)", () => {
    const r = postOutputGenerationEngine.generate(FULL_INPUT);
    expect(r.line_count).toBe(r.final_gcode.split("\n").length);
  });

  it("was_split=false when program fits within controller_memory_kb=1024", () => {
    const r = postOutputGenerationEngine.generate({
      ...FULL_INPUT,
      controller_memory_kb: 1024,
    });
    expect(r.was_split).toBe(false);
    expect(r.subprograms).toBeUndefined();
  });

  it("was_split=true and subprograms.length>0 when memory_kb is tiny (1 byte limit)", () => {
    // Generate a program with multiple tool changes well over 1KB
    const bigGcode = Array.from({ length: 20 }, (_, i) =>
      `T${i + 1} M06\nG01 X${i * 10}.0 Y0.0 F300\n`.repeat(5),
    ).join("\n");

    const r = postOutputGenerationEngine.generate({
      ...MINIMAL_INPUT,
      optimized_gcode: bigGcode,
      controller_memory_kb: 1,
      program_number: 100,
      operations: [],
    });
    expect(r.was_split).toBe(true);
    expect(r.subprograms!.length).toBeGreaterThan(0);
  });

  it("subprograms use M99 return code (not M30) for fanuc sub-program format", () => {
    const bigGcode = Array.from({ length: 20 }, (_, i) =>
      `T${i + 1} M06\nG01 X${i * 10}.0 Y0.0 F300\n`.repeat(5),
    ).join("\n");

    const r = postOutputGenerationEngine.generate({
      ...MINIMAL_INPUT,
      optimized_gcode: bigGcode,
      controller_memory_kb: 1,
      program_number: 100,
      operations: [],
    });
    expect(r.subprograms![0]).toContain("M99");
  });

  it("generate with no operations: analytics/probe_routines/setup_sheet all absent", () => {
    const r = postOutputGenerationEngine.generate({
      ...MINIMAL_INPUT,
      operations: [],
      generate_analytics: true,
      generate_probe_routines: true,
      generate_setup_sheet: true,
    });
    expect(r.analytics).toBeUndefined();
    expect(r.probe_routines).toBeUndefined();
    expect(r.setup_sheet).toBeUndefined();
  });

  it("haas-specific: G84.2 replaced with G84 when hasRigidTap=false", () => {
    const r = postOutputGenerationEngine.generate({
      ...MINIMAL_INPUT,
      optimized_gcode: "G84.2 Z-20.000 R2.0 F625.0 S500",
      controller: "haas",
      machine_options: { hasRigidTap: false },
    });
    expect(r.final_gcode).not.toContain("G84.2");
    expect(r.final_gcode).toContain("G84");
  });

  it("SSV codes M138 and M139 stripped when hasSSV=false", () => {
    const r = postOutputGenerationEngine.generate({
      ...MINIMAL_INPUT,
      optimized_gcode: "M138\nG01 X10 F300\nM139",
      machine_options: { hasSSV: false },
    });
    expect(r.final_gcode).not.toContain("M138");
    expect(r.final_gcode).not.toContain("M139");
  });

  it("siemens full generate: Siemens header present and M30 footer, no % wrapper", () => {
    const r = postOutputGenerationEngine.generate({
      ...MINIMAL_INPUT,
      controller: "siemens",
      program_name: "SIEMENS_TEST",
      program_number: 1,
    });
    expect(r.final_gcode).toContain("; Program: SIEMENS_TEST");
    expect(r.final_gcode).toContain("M30");
    // siemens has no wrapperStart so must not begin with %
    expect(r.final_gcode.trimStart().startsWith("%")).toBe(false);
  });

  it("adversarial: undefined operations treated as empty -- final_gcode still valid", () => {
    const r = postOutputGenerationEngine.generate({
      ...MINIMAL_INPUT,
      operations: undefined,
      generate_analytics: true,
    });
    // final_gcode must contain the fanuc header -- proves pipeline completed
    expect(r.final_gcode).toContain("O0001 (PRISM_PROGRAM)");
    expect(r.analytics).toBeUndefined();
  });
});
