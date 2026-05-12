/**
 * LATHE-MS0.5 — Dialect Reconciliation Tests
 * ============================================
 * U04: All 6 dialects produce valid output for same part
 * U05: Controller param changes output (Okuma G15, M50; Siemens CYCLE95, LIMS; DMG CELOS)
 */
import { describe, it, expect } from "vitest";
import { lathePostProcessorEngine, type LatheController, type LatheInput, type LathePostConfig } from "../engines/LathePostProcessorEngine.js";

// ============================================================================
// Shared test data — same part on all controllers
// ============================================================================

const TEST_MOVES: LatheInput["moves"] = [
  { type: "comment", text: "OD ROUGH" },
  { type: "rapid", x: 52, z: 2 },
  { type: "rough_od", depth_of_cut_mm: 2, finish_allowance_x_mm: 0.5, finish_allowance_z_mm: 0.1, profile_start_block: 100, profile_end_block: 200, feed: 0.25 },
  { type: "comment", text: "OD FINISH" },
  { type: "finish_cycle", profile_start_block: 100, profile_end_block: 200, feed: 0.1 },
  { type: "comment", text: "GROOVE" },
  { type: "groove", x: 30, z: -40, peck_amount_mm: 1.5, feed: 0.08 },
  { type: "comment", text: "THREAD M20x1.5" },
  { type: "thread", x: 18.376, z: -25, thread_pitch_mm: 1.5, thread_depth_mm: 0.92, thread_passes: 4, thread_angle_deg: 60, thread_chamfer: 1.0 },
  { type: "comment", text: "PECK DRILL" },
  { type: "peck_drill", z: -30, peck_amount_mm: 3, feed: 100 },
  { type: "comment", text: "PART OFF" },
  { type: "part_off", x: 0, feed: 0.05 },
];

const TEST_INPUT: LatheInput = {
  moves: TEST_MOVES,
  tool_number: 1,
  tool_orientation: 3,
  tool_nose_radius_mm: 0.8,
  spindle_rpm: 1200,
  surface_speed_mmin: 180,
  feed_rate_mmrev: 0.2,
  coolant: "flood",
  work_offset: "G54",
  part_diameter_mm: 50,
};

function makeConfig(controller: LatheController): LathePostConfig {
  return {
    controller,
    program_number: 1001,
    use_canned_cycles: true,
    use_css: true,
    use_tnrc: true,
    decimal_places: 3,
    line_numbers: false,
    line_number_increment: 10,
    coolant_code: "flood",
    safe_start_block: true,
    program_end: "M30",
    max_rpm: 3500,
    spindle_direction: "cw",
  };
}

// ============================================================================
// 1. All 6 dialects produce valid output for same part (U04)
// ============================================================================
describe("LathePostProcessorEngine — all 6 dialects produce valid output", () => {
  const controllers: LatheController[] = [
    "fanuc_turning", "haas_st", "mazak_qt", "okuma_lb", "siemens_840d", "dmg_celos",
  ];

  for (const ctrl of controllers) {
    it(`${ctrl}: produces non-empty G-code`, () => {
      const result = lathePostProcessorEngine.process(TEST_INPUT, makeConfig(ctrl));
      expect(result.gcode.length).toBeGreaterThan(100);
      expect(result.line_count).toBeGreaterThan(10);
      expect(result.controller).toBe(ctrl);
    });

    it(`${ctrl}: includes tool change`, () => {
      const result = lathePostProcessorEngine.process(TEST_INPUT, makeConfig(ctrl));
      expect(result.gcode).toContain("T");
    });

    it(`${ctrl}: includes spindle command`, () => {
      const result = lathePostProcessorEngine.process(TEST_INPUT, makeConfig(ctrl));
      expect(result.gcode).toContain("M03");
    });

    it(`${ctrl}: uses canned cycles`, () => {
      const result = lathePostProcessorEngine.process(TEST_INPUT, makeConfig(ctrl));
      expect(result.canned_cycles_used.length).toBeGreaterThan(0);
    });

    it(`${ctrl}: ends with program end code`, () => {
      const result = lathePostProcessorEngine.process(TEST_INPUT, makeConfig(ctrl));
      // Okuma uses M2, others use M30
      expect(result.gcode).toMatch(/M30|M2/);
    });
  }
});

// ============================================================================
// 2. Controller parameter MUST change output (U05)
// ============================================================================
describe("LathePostProcessorEngine — controller-specific output differences", () => {
  it("Okuma uses G18 turning plane and G15 H1 for work offset", () => {
    const result = lathePostProcessorEngine.process(TEST_INPUT, makeConfig("okuma_lb"));
    expect(result.gcode).toContain("G18"); // turning plane
    expect(result.gcode).toContain("G15 H1"); // work offset
  });

  it("Okuma uses M50 for flood coolant, not M08", () => {
    const result = lathePostProcessorEngine.process(TEST_INPUT, makeConfig("okuma_lb"));
    expect(result.gcode).toContain("M50");
    expect(result.gcode).not.toMatch(/\bM08\b/);
  });

  it("Okuma uses 6-digit tool code (T010101)", () => {
    const result = lathePostProcessorEngine.process(TEST_INPUT, makeConfig("okuma_lb"));
    // Real Okuma: T010101 = tool 1, offset 1, wear offset 1
    expect(result.gcode).toMatch(/T\d{6}/);
  });

  it("Siemens uses LIMS= for speed clamp, not G50", () => {
    const result = lathePostProcessorEngine.process(TEST_INPUT, makeConfig("siemens_840d"));
    expect(result.gcode).toContain("LIMS=");
    expect(result.gcode).not.toContain("G50");
  });

  it("Siemens uses CYCLE95 for stock removal, not G71", () => {
    const result = lathePostProcessorEngine.process(TEST_INPUT, makeConfig("siemens_840d"));
    expect(result.gcode).toContain("CYCLE95");
    expect(result.gcode).not.toContain("G71");
  });

  it("Siemens uses CYCLE97 for threading, not G76", () => {
    const result = lathePostProcessorEngine.process(TEST_INPUT, makeConfig("siemens_840d"));
    expect(result.gcode).toContain("CYCLE97");
    expect(result.gcode).not.toContain("G76");
  });

  it("Siemens uses G18 (ZX turning plane)", () => {
    const result = lathePostProcessorEngine.process(TEST_INPUT, makeConfig("siemens_840d"));
    expect(result.gcode).toContain("G18");
  });

  it("Siemens uses semicolon comments, not parentheses", () => {
    const result = lathePostProcessorEngine.process(TEST_INPUT, makeConfig("siemens_840d"));
    expect(result.gcode).toContain("; ");
    expect(result.gcode).not.toContain("(OD ROUGH)");
  });

  it("DMG CELOS includes CELOS TURNING MODE header", () => {
    const result = lathePostProcessorEngine.process(TEST_INPUT, makeConfig("dmg_celos"));
    expect(result.gcode).toContain("CELOS TURNING MODE");
  });

  it("DMG CELOS uses Siemens-style cycles (CYCLE95/97)", () => {
    const result = lathePostProcessorEngine.process(TEST_INPUT, makeConfig("dmg_celos"));
    expect(result.gcode).toContain("CYCLE95");
    expect(result.gcode).toContain("CYCLE97");
  });

  it("Fanuc uses G71 two-block format for roughing", () => {
    const result = lathePostProcessorEngine.process(TEST_INPUT, makeConfig("fanuc_turning"));
    expect(result.gcode).toContain("G71 U");
    expect(result.gcode).toContain("G71 P");
  });

  it("Haas uses D word in G71 (depth in microns)", () => {
    const result = lathePostProcessorEngine.process(TEST_INPUT, makeConfig("haas_st"));
    expect(result.gcode).toMatch(/G71.*D\d+/);
  });

  it("Mazak includes M06 after tool number", () => {
    const result = lathePostProcessorEngine.process(TEST_INPUT, makeConfig("mazak_qt"));
    expect(result.gcode).toContain("M06");
  });
});

// ============================================================================
// 3. supportedControllers returns all 6
// ============================================================================
describe("LathePostProcessorEngine — metadata", () => {
  it("reports 6 supported controllers", () => {
    const controllers = lathePostProcessorEngine.supportedControllers();
    expect(controllers.length).toBe(6);
    expect(controllers).toContain("fanuc_turning");
    expect(controllers).toContain("haas_st");
    expect(controllers).toContain("mazak_qt");
    expect(controllers).toContain("okuma_lb");
    expect(controllers).toContain("siemens_840d");
    expect(controllers).toContain("dmg_celos");
  });

  it("reports supported canned cycles", () => {
    const cycles = lathePostProcessorEngine.supportedCycles();
    expect(cycles).toContain("G71");
    expect(cycles).toContain("G76");
  });
});

// ============================================================================
// 4. CSS mode activation
// ============================================================================
describe("LathePostProcessorEngine — CSS mode", () => {
  it("activates G96 CSS mode when configured", () => {
    for (const ctrl of ["fanuc_turning", "haas_st", "mazak_qt", "okuma_lb"] as LatheController[]) {
      const result = lathePostProcessorEngine.process(TEST_INPUT, makeConfig(ctrl));
      expect(result.gcode).toContain("G96");
    }
  });

  it("Siemens/DMG also use G96 for CSS", () => {
    for (const ctrl of ["siemens_840d", "dmg_celos"] as LatheController[]) {
      const result = lathePostProcessorEngine.process(TEST_INPUT, makeConfig(ctrl));
      expect(result.gcode).toContain("G96");
    }
  });
});

// ============================================================================
// 5. Dispatcher wiring verification
// ============================================================================
describe("turningDispatcher — LATHE-MS0.5 wiring", () => {
  it("turning dispatcher source has 25+ actions", async () => {
    const fs = await import("fs");
    const path = new URL("../tools/dispatchers/turningDispatcher.ts", import.meta.url)
      .pathname.replace(/^\/([A-Z]:)/, "$1");
    const src = fs.readFileSync(path, "utf8");
    const actionMatch = src.match(/const ACTIONS = \[([\s\S]*?)\] as const/);
    expect(actionMatch).not.toBeNull();
    if (actionMatch) {
      const actionCount = (actionMatch[1].match(/"/g) || []).length / 2;
      expect(actionCount).toBeGreaterThanOrEqual(25);
    }
  });
});
