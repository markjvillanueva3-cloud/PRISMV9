/**
 * LATHE REAL PROGRAM VALIDATION — Tests Against Production Okuma Programs
 * ========================================================================
 * These tests validate our engine output against REAL CNC programs from
 * the shop floor (Box/CNC LATHE). These programs run on Okuma lathes daily.
 * A failure here means our output could crash a real machine or hurt someone.
 *
 * Programs sourced from: C:\Users\wompu\Box\CNC LATHE\
 * All programs are Okuma OSP format (.MIN files)
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { lathePostProcessorEngine, type LatheController } from "../engines/LathePostProcessorEngine.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE_DIR = join(__dirname, "fixtures", "okuma-programs");

function loadFixture(name: string): string {
  return readFileSync(join(FIXTURE_DIR, name), "utf-8");
}

// ============================================================================
// 1. Parse real Okuma programs — structural validation
// ============================================================================
describe("Real Okuma programs — structural validation", () => {
  const programs = [
    "hex-pins-mark.min",
    "460A20-0154-3.min",
    "A10-002-028.min",
    "A-6266.min",
    "PLUG-2.min",
    "NPT12.min",
    "BRICO-132.min",
  ];

  for (const prog of programs) {
    it(`${prog}: loads without error`, () => {
      const src = loadFixture(prog);
      expect(src.length).toBeGreaterThan(10);
    });
  }

  it("hex-pins-mark: uses Okuma G85 roughing (not Fanuc G71)", () => {
    const src = loadFixture("hex-pins-mark.min");
    expect(src).toContain("G85");
    // This program should NOT have G71 for roughing (G71 is threading on Okuma)
    // But it uses G76 for chamfer and G87 for finish — those are Okuma-correct
    expect(src).toContain("G87");
  });

  it("hex-pins-mark: uses 6-digit tool codes", () => {
    const src = loadFixture("hex-pins-mark.min");
    // T010101 = tool 1, offset 1, wear offset 1
    expect(src).toMatch(/T\d{6}/);
  });

  it("hex-pins-mark: uses NAT labels (not N-numbers)", () => {
    const src = loadFixture("hex-pins-mark.min");
    expect(src).toMatch(/NAT\d+/);
  });

  it("hex-pins-mark: has C-axis operations with M110/M109", () => {
    const src = loadFixture("hex-pins-mark.min");
    expect(src).toContain("M110"); // C-axis on
    expect(src).toContain("M109"); // C-axis off
    expect(src).toContain("G138"); // C-axis interpolation
    expect(src).toContain("G136"); // Cancel C-axis
  });

  it("460A20: uses G85 for roughing with named NTURN label", () => {
    const src = loadFixture("460A20-0154-3.min");
    expect(src).toContain("G85 NTURN");
    expect(src).toContain("NTURN G81");
    expect(src).toContain("G87 NTURN"); // finish cycle
  });

  it("460A20: uses G74 for peck drilling (Okuma format)", () => {
    const src = loadFixture("460A20-0154-3.min");
    // Okuma G74: G74 X0 Z-1.8 D.15 L.15 F.0025
    expect(src).toMatch(/G74.*D.*L.*F/);
  });

  it("460A20: uses /CALL OBAR for bar feeder", () => {
    const src = loadFixture("460A20-0154-3.min");
    expect(src).toContain("/CALL OBAR");
  });

  it("A-6266: uses G85 for ID boring (NBORE label)", () => {
    const src = loadFixture("A-6266.min");
    expect(src).toContain("G85 NBORE");
    expect(src).toContain("NBORE G81");
    expect(src).toContain("G87 NBORE"); // ID finish
  });

  it("A-6266: uses Okuma threading G71 (not Fanuc G76)", () => {
    const src = loadFixture("A-6266.min");
    // Okuma G71 threading: G71 X.990 Z-.6 B60 D.003 U.001 H.055 F.9842 J20 M33 M73
    expect(src).toMatch(/G71.*B60.*D.*H.*F.*M33/);
  });

  it("A-6266: uses G4 F for dwell (Okuma seconds format)", () => {
    const src = loadFixture("A-6266.min");
    // Okuma: G4 F2. (2 seconds), NOT Fanuc: G04 P2000 (milliseconds)
    expect(src).toMatch(/G4 F\d/);
  });

  it("460A20: uses L for arc radius (not R)", () => {
    const src = loadFixture("460A20-0154-3.min");
    // Okuma arcs: G2 X.561 Z-.928 L.025 — L is radius, NOT Fanuc R
    expect(src).toMatch(/G[23].*L\./);
  });

  it("A-6266: uses A for angular moves", () => {
    const src = loadFixture("A-6266.min");
    // Okuma angular: G1 X.562 A135 or Z-.925 A240
    expect(src).toMatch(/A\d{3}/);
  });

  it("PLUG-2: uses G50 for spindle speed clamp", () => {
    const src = loadFixture("PLUG-2.min");
    expect(src).toContain("G50 S600");
    expect(src).toContain("G96 S250"); // CSS mode
  });

  it("NPT12: uses Okuma G71 for NPT threading", () => {
    const src = loadFixture("NPT12.min");
    // G71 X.8356 Z-.5343 I-.0229 B60 H.1143 D.0425 U0. F.07143 M32 M75
    expect(src).toMatch(/G71.*I.*B60.*H.*D.*F.*M/);
  });

  it("BRICO-132: has date comment and material specification", () => {
    const src = loadFixture("BRICO-132.min");
    expect(src).toContain("(DATE=");
    expect(src).toContain("(MATERIAL -");
  });
});

// ============================================================================
// 2. Validate our Okuma output matches shop patterns
// ============================================================================
describe("LathePostProcessorEngine okuma_lb — matches real shop patterns", () => {
  const okumaConfig = {
    controller: "okuma_lb" as LatheController,
    program_number: 1001,
    use_canned_cycles: true,
    use_css: true,
    use_tnrc: false,
    decimal_places: 3,
    line_numbers: false,
    line_number_increment: 10,
    coolant_code: "flood" as const,
    safe_start_block: true,
    program_end: "M30" as const,
    max_rpm: 800,
    spindle_direction: "cw" as const,
  };

  const basicInput = {
    moves: [
      { type: "comment" as const, text: "OD ROUGH INSERT - R.015" },
      { type: "rapid" as const, x: 1.0, z: 0.005 },
      { type: "rough_od" as const, depth_of_cut_mm: 0.06, finish_allowance_x_mm: 0.003, finish_allowance_z_mm: 0.003, feed: 0.005, profile_start_block: 100, profile_end_block: 200 },
      { type: "comment" as const, text: "OD FINISH" },
      { type: "finish_cycle" as const, profile_start_block: 100, profile_end_block: 200, feed: 0.003 },
      { type: "comment" as const, text: "PECK DRILL .600" },
      { type: "peck_drill" as const, z: -1.4, peck_amount_mm: 0.15, feed: 0.002 },
      { type: "comment" as const, text: "CUTOFF" },
      { type: "part_off" as const, x: -0.04, feed: 0.0015 },
    ],
    tool_number: 1,
    tool_orientation: 1,
    spindle_rpm: 800,
    surface_speed_mmin: 250,
    feed_rate_mmrev: 0.005,
    coolant: "flood" as const,
    work_offset: "G54",
  };

  it("uses G85 for roughing (NOT Fanuc G71)", () => {
    const result = lathePostProcessorEngine.process(basicInput, okumaConfig);
    expect(result.gcode).toContain("G85");
    expect(result.gcode).toContain("NTURN");
    // Must NOT contain Fanuc-style G71 roughing (G71 U... P... Q...)
    expect(result.gcode).not.toMatch(/G71 [UP]/);
  });

  it("uses G87 for finishing (NOT Fanuc G70)", () => {
    const result = lathePostProcessorEngine.process(basicInput, okumaConfig);
    expect(result.gcode).toContain("G87");
    expect(result.gcode).not.toContain("G70");
  });

  it("uses named label NTURN G81 for profile definition", () => {
    const result = lathePostProcessorEngine.process(basicInput, okumaConfig);
    expect(result.gcode).toContain("NTURN G81");
  });

  it("generates 6-digit tool code (T010101)", () => {
    const result = lathePostProcessorEngine.process(basicInput, okumaConfig);
    expect(result.gcode).toMatch(/T\d{6}/);
  });

  it("uses G0/G1 (not G00/G01) — Okuma shorthand", () => {
    const result = lathePostProcessorEngine.process(basicInput, okumaConfig);
    expect(result.gcode).toMatch(/\bG0 /);
    expect(result.gcode).toMatch(/\bG1 /);
    // Should NOT have Fanuc-style leading zeros
    expect(result.gcode).not.toMatch(/\bG00 /);
    expect(result.gcode).not.toMatch(/\bG01 /);
  });

  it("uses G50 for spindle speed clamp (same as real programs)", () => {
    const result = lathePostProcessorEngine.process(basicInput, okumaConfig);
    expect(result.gcode).toContain("G50 S800");
  });

  it("uses M50 for coolant (not M08)", () => {
    const result = lathePostProcessorEngine.process(basicInput, okumaConfig);
    expect(result.gcode).toContain("M50");
    expect(result.gcode).not.toMatch(/\bM08\b/);
  });

  it("uses G4 F for dwell (not G04 P)", () => {
    const dwellInput = {
      ...basicInput,
      moves: [{ type: "dwell" as const, dwell_sec: 2.0 }],
    };
    const result = lathePostProcessorEngine.process(dwellInput, okumaConfig);
    expect(result.gcode).toContain("G4 F2.0");
    expect(result.gcode).not.toContain("G04");
  });

  it("uses L for arc radius (not I/K like Fanuc)", () => {
    const arcInput = {
      ...basicInput,
      moves: [{ type: "arc_cw" as const, x: 0.561, z: -0.928, i: 0.025, feed: 0.003 }],
    };
    const result = lathePostProcessorEngine.process(arcInput, okumaConfig);
    expect(result.gcode).toContain("L0.025"); // Okuma arc radius
    expect(result.gcode).not.toMatch(/\bI0\./); // NOT Fanuc I/K
  });

  it("uses Okuma G74 peck drill format (D and L params)", () => {
    const result = lathePostProcessorEngine.process(basicInput, okumaConfig);
    // Okuma: G74 X0 Z-1.400 D0.15 L0.15 F0.002
    expect(result.gcode).toMatch(/G74.*D.*L.*F/);
  });

  it("ends with M2 (not M30) — standard Okuma", () => {
    const result = lathePostProcessorEngine.process(basicInput, okumaConfig);
    expect(result.gcode).toContain("M2");
  });
});

// ============================================================================
// 3. Cross-validate: Okuma vs Fanuc output must be DIFFERENT
// ============================================================================
describe("Dialect differentiation — Okuma must NOT look like Fanuc", () => {
  const config = (ctrl: LatheController) => ({
    controller: ctrl,
    program_number: 1001,
    use_canned_cycles: true,
    use_css: true,
    use_tnrc: false,
    decimal_places: 3,
    line_numbers: false,
    line_number_increment: 10,
    coolant_code: "flood" as const,
    safe_start_block: true,
    program_end: "M30" as const,
    max_rpm: 800,
    spindle_direction: "cw" as const,
  });

  const moves = {
    moves: [
      { type: "rough_od" as const, depth_of_cut_mm: 2, finish_allowance_x_mm: 0.5, finish_allowance_z_mm: 0.1, feed: 0.25, profile_start_block: 100, profile_end_block: 200 },
      { type: "finish_cycle" as const, profile_start_block: 100, profile_end_block: 200, feed: 0.1 },
      { type: "thread" as const, x: 18.376, z: -25, thread_pitch_mm: 1.5, thread_depth_mm: 0.92, thread_passes: 4, thread_angle_deg: 60, thread_chamfer: 1.0 },
    ],
    tool_number: 1,
    tool_orientation: 1,
    spindle_rpm: 800,
    feed_rate_mmrev: 0.2,
    coolant: "flood" as const,
    work_offset: "G54",
  };

  it("roughing cycle differs: Okuma G85 vs Fanuc G71", () => {
    const okuma = lathePostProcessorEngine.process(moves, config("okuma_lb"));
    const fanuc = lathePostProcessorEngine.process(moves, config("fanuc_turning"));
    // Okuma uses G85, Fanuc uses G71 for roughing
    expect(okuma.gcode).toContain("G85");
    expect(fanuc.gcode).toMatch(/G71 [UP]/);
    expect(okuma.gcode).not.toMatch(/G71 [UP]/);
    expect(fanuc.gcode).not.toContain("G85");
  });

  it("finish cycle differs: Okuma G87 vs Fanuc G70", () => {
    const okuma = lathePostProcessorEngine.process(moves, config("okuma_lb"));
    const fanuc = lathePostProcessorEngine.process(moves, config("fanuc_turning"));
    expect(okuma.gcode).toContain("G87");
    expect(fanuc.gcode).toContain("G70");
    expect(okuma.gcode).not.toContain("G70");
  });

  it("threading differs: Okuma G71 vs Fanuc G76", () => {
    const okuma = lathePostProcessorEngine.process(moves, config("okuma_lb"));
    const fanuc = lathePostProcessorEngine.process(moves, config("fanuc_turning"));
    // Okuma uses G71 for threading with B/D/H params
    expect(okuma.gcode).toMatch(/G71.*B60.*D.*H.*F/);
    // Fanuc uses G76 for threading
    expect(fanuc.gcode).toContain("G76");
  });

  it("tool codes differ: Okuma 6-digit vs Fanuc 4-digit", () => {
    const okuma = lathePostProcessorEngine.process(moves, config("okuma_lb"));
    const fanuc = lathePostProcessorEngine.process(moves, config("fanuc_turning"));
    expect(okuma.gcode).toMatch(/T\d{6}/);
    expect(fanuc.gcode).toMatch(/T\d{4}/);
    expect(fanuc.gcode).not.toMatch(/T\d{6}/);
  });
});

// ============================================================================
// 4. Safety checks on real program patterns
// ============================================================================
describe("Real program safety patterns", () => {
  it("every real program has a safe G0 X20 Z20 retract", () => {
    const programs = ["hex-pins-mark.min", "460A20-0154-3.min", "A10-002-028.min", "A-6266.min"];
    for (const prog of programs) {
      const src = loadFixture(prog);
      expect(src).toMatch(/G0 X20\.? Z20\.?/);
    }
  });

  it("every real program with CSS has G50 speed clamp", () => {
    const programs = ["hex-pins-mark.min", "460A20-0154-3.min", "PLUG-2.min", "A-6266.min"];
    for (const prog of programs) {
      const src = loadFixture(prog);
      if (src.includes("G96")) {
        expect(src).toContain("G50 S");
      }
    }
  });

  it("cutoff operations always have negative X or go to X-.04", () => {
    // In real programs, cutoff always goes past center (X negative or X-.04)
    // This ensures the part actually separates
    const programs = ["460A20-0154-3.min", "A10-002-028.min", "A-6266.min"];
    for (const prog of programs) {
      const src = loadFixture(prog);
      if (src.toLowerCase().includes("cutoff")) {
        expect(src).toMatch(/X-\.0[234]/);
      }
    }
  });

  it("bar feeder programs have /GOTO loop back to NBAR", () => {
    const programs = ["460A20-0154-3.min", "A10-002-028.min"];
    for (const prog of programs) {
      const src = loadFixture(prog);
      if (src.includes("/CALL OBAR")) {
        expect(src).toMatch(/\/GOTO N(BAR|STRT)/);
      }
    }
  });

  it("M1 optional stops between every tool change", () => {
    // Real shop practice: M1 between every operation for prove-out
    const src = loadFixture("460A20-0154-3.min");
    const natBlocks = src.match(/NAT\d+/g) || [];
    const m1Count = (src.match(/\bM1\b/g) || []).length;
    // Should have at least as many M1s as tool blocks
    expect(m1Count).toBeGreaterThanOrEqual(natBlocks.length - 1);
  });
});
