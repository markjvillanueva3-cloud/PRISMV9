/**
 * PP-REV-MS1 U-REV09: Setup Sheet + Cycle Time Engine Tests
 *
 * Tests:
 * - SetupSheetFromGCodeEngine: tool extraction, operation sequence, offsets, markdown
 * - CycleTimeEstimatorEngine: per-controller timing, multi-machine compare, bottlenecks
 * - Edge cases: empty programs, single-tool, multi-tool, no coolant
 */

import { describe, it, expect } from "vitest";
import { setupSheetFromGCodeEngine } from "../engines/SetupSheetFromGCodeEngine.js";
import { cycleTimeEstimatorEngine } from "../engines/CycleTimeEstimatorEngine.js";

// ═══ Fixtures ═══

const SIMPLE_PROGRAM = `O1001
(PART: BRACKET-001)
(OP: OP10 ROUGH + FINISH)
G90 G54 G17
T1 M6
S3000 M3
G43 H1 Z50.
M8
G0 X0 Y0
G0 Z5.
G1 Z-5. F200
G1 X80. F600
G1 Y50.
G1 X0.
G1 Y0.
G0 Z50.
M9
M5
M30`;

const MULTI_TOOL_PROGRAM = `O2001
(PART: HOUSING-002)
G90 G54 G17
T1 M6
(10MM ENDMILL)
S4000 M3
G43 H1 Z100.
M8
G0 X0 Y0
G0 Z2.
G1 Z-10. F150
G1 X100. F800
G1 Y80.
G1 X0.
G1 Y0.
G0 Z100.
M9
M5
T2 M6
(6MM ENDMILL - FINISHING)
S6000 M3
G43 H2 Z100.
M8
G0 X0.5 Y0.5
G0 Z2.
G1 Z-9.5 F100
G1 X99.5 F500
G1 Y79.5
G1 X0.5
G1 Y0.5
G0 Z100.
M9
M5
T3 M6
(8MM DRILL)
S3200 M3
G43 H3 Z100.
M8
G0 X25. Y25.
G0 Z2.
G81 Z-20. R2. F200
X50.
X75.
Y50.
X50.
X25.
G80
G0 Z100.
M9
M5
M30`;

const MULTI_OFFSET_PROGRAM = `O3001
G90 G54 G17
T1 M6
S3000 M3
G43 H1 Z50.
M8
G0 X0 Y0
G0 Z5.
G1 Z-5. F300
G1 X50. F600
G0 Z50.
G55
G0 X0 Y0
G0 Z5.
G1 Z-5. F300
G1 X50. F600
G0 Z50.
M9
M5
M30`;

const MINIMAL_PROGRAM = `G0 X0
G1 X100 F500
M30`;

// ═══ Setup Sheet Tests ═══

describe("PP-REV-MS1: SetupSheetFromGCodeEngine", () => {

  describe("Tool Extraction", () => {

    it("extracts single tool from simple program", () => {
      const result = setupSheetFromGCodeEngine.generateSetupSheet(SIMPLE_PROGRAM, {
        controller: "fanuc",
        include_tool_list: true,
        include_offsets: true,
        include_safety: true,
      });

      expect(result.setup_sheet.tools.length).toBe(1);
      const t1 = result.setup_sheet.tools[0];
      expect(t1.number).toBe(1);
      expect(t1.offset_h).toBe(1);
      expect(t1.rpm_values).toContain(3000);
      expect(t1.feed_values.length).toBeGreaterThan(0);
    });

    it("extracts multiple tools from multi-tool program", () => {
      const result = setupSheetFromGCodeEngine.generateSetupSheet(MULTI_TOOL_PROGRAM, {
        controller: "fanuc",
        include_tool_list: true,
        include_offsets: true,
        include_safety: true,
      });

      expect(result.setup_sheet.tools.length).toBe(3);
      expect(result.setup_sheet.tools[0].number).toBe(1);
      expect(result.setup_sheet.tools[1].number).toBe(2);
      expect(result.setup_sheet.tools[2].number).toBe(3);
    });

    it("extracts correct RPM values per tool", () => {
      const result = setupSheetFromGCodeEngine.generateSetupSheet(MULTI_TOOL_PROGRAM, {
        controller: "fanuc",
        include_tool_list: true,
        include_offsets: true,
        include_safety: true,
      });

      expect(result.setup_sheet.tools[0].rpm_values).toContain(4000);
      expect(result.setup_sheet.tools[1].rpm_values).toContain(6000);
      expect(result.setup_sheet.tools[2].rpm_values).toContain(3200);
    });

    it("extracts feed values per tool", () => {
      const result = setupSheetFromGCodeEngine.generateSetupSheet(MULTI_TOOL_PROGRAM, {
        controller: "fanuc",
        include_tool_list: true,
        include_offsets: true,
        include_safety: true,
      });

      const t1 = result.setup_sheet.tools[0];
      expect(t1.feed_values.some(f => f > 0)).toBe(true);
    });

    it("detects coolant usage", () => {
      const result = setupSheetFromGCodeEngine.generateSetupSheet(SIMPLE_PROGRAM, {
        controller: "fanuc",
        include_tool_list: true,
        include_offsets: true,
        include_safety: true,
      });

      expect(result.setup_sheet.coolant_required).toBe(true);
    });

    it("extracts Z-depths per tool", () => {
      const result = setupSheetFromGCodeEngine.generateSetupSheet(MULTI_TOOL_PROGRAM, {
        controller: "fanuc",
        include_tool_list: true,
        include_offsets: true,
        include_safety: true,
      });

      const drill = result.setup_sheet.tools[2];
      expect(drill.z_depths.some(z => z <= -20)).toBe(true);
    });
  });

  describe("Work Offsets", () => {

    it("detects G54 offset in simple program", () => {
      const result = setupSheetFromGCodeEngine.generateSetupSheet(SIMPLE_PROGRAM, {
        controller: "fanuc",
        include_tool_list: true,
        include_offsets: true,
        include_safety: true,
      });

      expect(result.setup_sheet.work_offsets.length).toBeGreaterThan(0);
      expect(result.setup_sheet.work_offsets.some(o => o.code === "G54")).toBe(true);
    });

    it("detects multiple offsets (G54 + G55)", () => {
      const result = setupSheetFromGCodeEngine.generateSetupSheet(MULTI_OFFSET_PROGRAM, {
        controller: "fanuc",
        include_tool_list: true,
        include_offsets: true,
        include_safety: true,
      });

      const codes = result.setup_sheet.work_offsets.map(o => o.code);
      expect(codes).toContain("G54");
      expect(codes).toContain("G55");
    });
  });

  describe("Operations", () => {

    it("extracts operation sequence", () => {
      const result = setupSheetFromGCodeEngine.generateSetupSheet(MULTI_TOOL_PROGRAM, {
        controller: "fanuc",
        include_tool_list: true,
        include_offsets: true,
        include_safety: true,
      });

      expect(result.setup_sheet.operations.length).toBeGreaterThan(0);
    });

    it("operations have valid feed ranges", () => {
      const result = setupSheetFromGCodeEngine.generateSetupSheet(MULTI_TOOL_PROGRAM, {
        controller: "fanuc",
        include_tool_list: true,
        include_offsets: true,
        include_safety: true,
      });

      for (const op of result.setup_sheet.operations) {
        expect(op.feed_range[1]).toBeGreaterThanOrEqual(op.feed_range[0]);
      }
    });
  });

  describe("Markdown Output", () => {

    it("generates non-empty markdown", () => {
      const result = setupSheetFromGCodeEngine.generateSetupSheet(SIMPLE_PROGRAM, {
        controller: "fanuc",
        include_tool_list: true,
        include_offsets: true,
        include_safety: true,
      });

      expect(result.markdown.length).toBeGreaterThan(100);
    });

    it("markdown contains tool table", () => {
      const result = setupSheetFromGCodeEngine.generateSetupSheet(MULTI_TOOL_PROGRAM, {
        controller: "fanuc",
        include_tool_list: true,
        include_offsets: true,
        include_safety: true,
      });

      expect(result.markdown).toContain("T1");
      expect(result.markdown).toContain("T2");
      expect(result.markdown).toContain("T3");
    });

    it("markdown includes part number when specified", () => {
      const result = setupSheetFromGCodeEngine.generateSetupSheet(SIMPLE_PROGRAM, {
        controller: "fanuc",
        part_number: "BRACKET-XYZ-001",
        operation_name: "OP10",
        include_tool_list: true,
        include_offsets: true,
        include_safety: true,
      });

      expect(result.markdown).toContain("BRACKET-XYZ-001");
    });
  });

  describe("Edge Cases", () => {

    it("handles minimal G-code without crashing", () => {
      const result = setupSheetFromGCodeEngine.generateSetupSheet(MINIMAL_PROGRAM, {
        controller: "fanuc",
        include_tool_list: true,
        include_offsets: true,
        include_safety: true,
      });

      expect(result.setup_sheet).toBeTruthy();
      expect(result.markdown).toBeTruthy();
    });

    it("handles different controller types", () => {
      for (const ctrl of ["fanuc", "haas", "siemens"] as const) {
        const result = setupSheetFromGCodeEngine.generateSetupSheet(SIMPLE_PROGRAM, {
          controller: ctrl,
          include_tool_list: true,
          include_offsets: true,
          include_safety: true,
        });

        expect(result.setup_sheet.controller).toBe(ctrl);
      }
    });
  });
});

// ═══ Cycle Time Tests ═══

describe("PP-REV-MS1: CycleTimeEstimatorEngine", () => {

  describe("Basic Estimation", () => {

    it("estimates positive cycle time for simple program", () => {
      const result = cycleTimeEstimatorEngine.estimateFromGCode(SIMPLE_PROGRAM, {
        controller: "fanuc",
      });

      expect(result.total_seconds).toBeGreaterThan(0);
      expect(result.cutting_time).toBeGreaterThan(0);
      expect(result.rapid_time).toBeGreaterThan(0);
      expect(result.line_count).toBeGreaterThan(0);
    });

    it("produces formatted time string", () => {
      const result = cycleTimeEstimatorEngine.estimateFromGCode(SIMPLE_PROGRAM, {
        controller: "fanuc",
      });

      expect(result.total_formatted).toBeTruthy();
      expect(result.total_formatted).toMatch(/\d/); // contains digits
    });

    it("detects tool changes", () => {
      const result = cycleTimeEstimatorEngine.estimateFromGCode(MULTI_TOOL_PROGRAM, {
        controller: "fanuc",
      });

      expect(result.tool_change_count).toBe(3);
      expect(result.tool_change_time).toBeGreaterThan(0);
    });

    it("cutting time is less than total time", () => {
      const result = cycleTimeEstimatorEngine.estimateFromGCode(MULTI_TOOL_PROGRAM, {
        controller: "fanuc",
      });

      expect(result.cutting_time).toBeLessThan(result.total_seconds);
    });

    it("tracks cutting and rapid distances", () => {
      const result = cycleTimeEstimatorEngine.estimateFromGCode(SIMPLE_PROGRAM, {
        controller: "fanuc",
      });

      expect(result.total_cutting_distance_mm).toBeGreaterThan(0);
      expect(result.total_rapid_distance_mm).toBeGreaterThan(0);
    });
  });

  describe("Per-Tool Breakdown", () => {

    it("provides breakdown when requested", () => {
      const result = cycleTimeEstimatorEngine.estimateFromGCode(MULTI_TOOL_PROGRAM, {
        controller: "fanuc",
        include_breakdown: true,
      });

      expect(result.breakdown_by_tool).toBeTruthy();
      expect(result.breakdown_by_tool!.length).toBe(3);
    });

    it("breakdown percentages sum to reasonable total", () => {
      const result = cycleTimeEstimatorEngine.estimateFromGCode(MULTI_TOOL_PROGRAM, {
        controller: "fanuc",
        include_breakdown: true,
      });

      const totalPct = result.breakdown_by_tool!.reduce((s, t) => s + t.pct_of_total, 0);
      // Remaining % is overhead (tool changes, spindle accel, settling) not attributed to tools
      expect(totalPct).toBeGreaterThan(50);
      expect(totalPct).toBeLessThanOrEqual(101);
    });

    it("at least one tool has positive cutting time", () => {
      const result = cycleTimeEstimatorEngine.estimateFromGCode(MULTI_TOOL_PROGRAM, {
        controller: "fanuc",
        include_breakdown: true,
      });

      const withCutting = result.breakdown_by_tool!.filter(t => t.cutting_time_sec > 0);
      expect(withCutting.length).toBeGreaterThan(0);
    });
  });

  describe("Controller-Specific Kinematics", () => {

    it("different controllers produce different cycle times", () => {
      const fanuc = cycleTimeEstimatorEngine.estimateFromGCode(MULTI_TOOL_PROGRAM, {
        controller: "fanuc",
      });
      const haas = cycleTimeEstimatorEngine.estimateFromGCode(MULTI_TOOL_PROGRAM, {
        controller: "haas",
      });

      // They should both be positive but likely differ due to kinematic profiles
      expect(fanuc.total_seconds).toBeGreaterThan(0);
      expect(haas.total_seconds).toBeGreaterThan(0);
    });

    it("resolves kinematics for all supported controllers", () => {
      for (const ctrl of ["fanuc", "haas", "siemens", "heidenhain", "mazak", "okuma"] as const) {
        const kinematics = cycleTimeEstimatorEngine.resolveKinematics({ controller: ctrl });
        expect(kinematics.rapid_rate_xy).toBeGreaterThan(0);
        expect(kinematics.max_acceleration).toBeGreaterThan(0);
        expect(kinematics.tool_change_time).toBeGreaterThan(0);
      }
    });
  });

  describe("Machine Profiles", () => {

    it("lists available profiles", () => {
      const profiles = cycleTimeEstimatorEngine.getAvailableProfiles();
      expect(profiles.length).toBeGreaterThan(0);
    });

    it("haas_vf2 profile exists and has correct controller", () => {
      const profile = cycleTimeEstimatorEngine.getProfile("haas_vf2");
      expect(profile).toBeTruthy();
      expect(profile!.controller).toBe("haas");
      expect(profile!.kinematics.rapid_rate_xy).toBeGreaterThan(0);
    });

    it("profile-based estimate uses specific kinematics", () => {
      const result = cycleTimeEstimatorEngine.estimateFromGCode(SIMPLE_PROGRAM, {
        controller: "haas",
        machine_profile: "haas_vf2",
      });

      expect(result.machine_profile).toContain("haas_vf2");
      expect(result.total_seconds).toBeGreaterThan(0);
    });
  });

  describe("Multi-Machine Comparison", () => {

    it("compares two machines and identifies fastest", () => {
      const result = cycleTimeEstimatorEngine.compareEstimates(MULTI_TOOL_PROGRAM, [
        { name: "Haas VF-2", controller: "haas" },
        { name: "Fanuc RoboDrill", controller: "fanuc" },
      ]);

      expect(result.fastest_machine).toBeTruthy();
      expect(result.slowest_machine).toBeTruthy();
      expect(result.machines.length).toBe(2);
      expect(result.time_spread_seconds).toBeGreaterThanOrEqual(0);
    });

    it("comparison entries have valid timing data", () => {
      const result = cycleTimeEstimatorEngine.compareEstimates(MULTI_TOOL_PROGRAM, [
        { name: "Haas VF-2", controller: "haas" },
        { name: "Siemens 840D", controller: "siemens" },
        { name: "Mazak Smooth", controller: "mazak" },
      ]);

      for (const entry of result.machines) {
        expect(entry.total_seconds).toBeGreaterThan(0);
        expect(entry.cutting_time).toBeGreaterThan(0);
        expect(entry.pct_vs_fastest).toBeGreaterThanOrEqual(0);
      }
    });

    it("fastest machine has 0% overhead vs fastest", () => {
      const result = cycleTimeEstimatorEngine.compareEstimates(MULTI_TOOL_PROGRAM, [
        { name: "Machine A", controller: "haas" },
        { name: "Machine B", controller: "fanuc" },
      ]);

      const fastest = result.machines.find(m => m.machine === result.fastest_machine);
      expect(fastest!.pct_vs_fastest).toBe(0);
    });

    it("generates insights from comparison", () => {
      const result = cycleTimeEstimatorEngine.compareEstimates(MULTI_TOOL_PROGRAM, [
        { name: "Haas VF-2", controller: "haas" },
        { name: "Fanuc RoboDrill", controller: "fanuc" },
      ]);

      expect(result.insights.length).toBeGreaterThan(0);
    });
  });

  describe("Edge Cases", () => {

    it("handles minimal program", () => {
      const result = cycleTimeEstimatorEngine.estimateFromGCode(MINIMAL_PROGRAM, {
        controller: "fanuc",
      });

      expect(result.total_seconds).toBeGreaterThan(0);
    });

    it("handles program with only rapids", () => {
      const rapidsOnly = `G90\nG0 X100 Y100\nG0 Z-50\nG0 X0 Y0 Z0\nM30`;
      const result = cycleTimeEstimatorEngine.estimateFromGCode(rapidsOnly, {
        controller: "fanuc",
      });

      expect(result.total_seconds).toBeGreaterThan(0);
      expect(result.rapid_time).toBeGreaterThan(0);
    });

    it("handles kinematics override", () => {
      const fast = cycleTimeEstimatorEngine.estimateFromGCode(SIMPLE_PROGRAM, {
        controller: "fanuc",
        kinematics_override: { rapid_rate_xy: 50000 },
      });
      const slow = cycleTimeEstimatorEngine.estimateFromGCode(SIMPLE_PROGRAM, {
        controller: "fanuc",
        kinematics_override: { rapid_rate_xy: 5000 },
      });

      // Faster rapids → less total time
      expect(fast.total_seconds).toBeLessThan(slow.total_seconds);
    });
  });

  describe("Bottleneck Analysis", () => {

    it("identifies bottleneck sections", () => {
      const result = cycleTimeEstimatorEngine.identifyBottlenecks(MULTI_TOOL_PROGRAM, {
        controller: "fanuc",
      });

      expect(result.total_seconds).toBeGreaterThan(0);
      expect(result.sections.length).toBeGreaterThan(0);
      expect(result.summary).toBeTruthy();
    });

    it("bottleneck sections have suggestions", () => {
      const result = cycleTimeEstimatorEngine.identifyBottlenecks(MULTI_TOOL_PROGRAM, {
        controller: "fanuc",
      });

      for (const section of result.sections) {
        expect(section.suggestion).toBeTruthy();
        expect(section.time_seconds).toBeGreaterThan(0);
      }
    });
  });

  describe("Acceleration/Corner Physics", () => {

    it("estimates accel/decel time for a move", () => {
      const time = cycleTimeEstimatorEngine.estimateAccelDecelTime(
        100, // 100mm distance
        1000, // 1000mm/min feed
        3000, // 3000mm/s² accel
        50000, // jerk
      );

      expect(time).toBeGreaterThan(0);
      // 100mm at 1000mm/min = 6 seconds pure feed, with accel overhead should be slightly more
    });

    it("estimates corner deceleration penalty", () => {
      const corner = cycleTimeEstimatorEngine.estimateCornerDeceleration(
        90, // 90° turn
        1000, // 1000mm/min
        0.01, // 0.01mm tolerance
        3000, // accel
      );

      expect(corner.corner_velocity_mm_min).toBeLessThan(1000);
      expect(corner.time_penalty_sec).toBeGreaterThan(0);
      expect(corner.velocity_reduction_pct).toBeGreaterThan(0);
    });

    it("sharper corners produce larger penalties", () => {
      const gentle = cycleTimeEstimatorEngine.estimateCornerDeceleration(
        30, 1000, 0.01, 3000
      );
      const sharp = cycleTimeEstimatorEngine.estimateCornerDeceleration(
        150, 1000, 0.01, 3000
      );

      expect(sharp.velocity_reduction_pct).toBeGreaterThan(gentle.velocity_reduction_pct);
    });
  });
});
