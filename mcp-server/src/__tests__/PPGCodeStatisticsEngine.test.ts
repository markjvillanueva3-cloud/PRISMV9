/**
 * PPGCodeStatisticsEngine Tests
 */
import { describe, it, expect } from "vitest";
import {
  PPGCodeStatisticsEngine,
  ppGCodeStatisticsEngine,
} from "../engines/PPGCodeStatisticsEngine.js";

const SAMPLE = `%
O1001 (POCKET MILL — 2 TOOLS)
G90 G21 G17
G54
T1 M6 (ROUGH ENDMILL 10MM)
S2000 M3
M8
G0 X10 Y10
G0 Z5
G1 Z-1 F200
G1 X50 Y10
G1 X50 Y40
G1 X10 Y40
G1 X10 Y10
G0 Z25
T2 M6 (FINISH ENDMILL 6MM)
S3500 M3
G0 X10 Y10
G0 Z5
G1 Z-1 F150
G2 X20 Y20 I10 J0
G3 X30 Y20 I5 J0
G0 Z25
M9
M5
M30
%`;

describe("PPGCodeStatisticsEngine", () => {
  it("exports singleton", () => {
    expect(ppGCodeStatisticsEngine).toBeInstanceOf(PPGCodeStatisticsEngine);
  });

  describe("top-level program metadata", () => {
    it("captures program number", () => {
      const r = ppGCodeStatisticsEngine.analyze(SAMPLE);
      expect(r.program_number).toBe("1001");
    });

    it("captures leading comment", () => {
      const r = ppGCodeStatisticsEngine.analyze(SAMPLE);
      expect(r.program_comment).toContain("POCKET MILL");
    });

    it("counts total lines", () => {
      const r = ppGCodeStatisticsEngine.analyze(SAMPLE);
      expect(r.total_lines).toBeGreaterThan(20);
    });

    it("reports total bytes > 0", () => {
      const r = ppGCodeStatisticsEngine.analyze(SAMPLE);
      expect(r.total_bytes).toBeGreaterThan(0);
    });
  });

  describe("G-code histogram", () => {
    it("counts G0 rapid moves", () => {
      const r = ppGCodeStatisticsEngine.analyze(SAMPLE);
      expect(r.g_code_histogram["G0"]).toBeGreaterThan(0);
    });

    it("counts G1 feed moves", () => {
      const r = ppGCodeStatisticsEngine.analyze(SAMPLE);
      expect(r.g_code_histogram["G1"]).toBeGreaterThanOrEqual(5);
    });

    it("counts G2 and G3 arc moves", () => {
      const r = ppGCodeStatisticsEngine.analyze(SAMPLE);
      expect(r.g_code_histogram["G2"]).toBe(1);
      expect(r.g_code_histogram["G3"]).toBe(1);
    });

    it("captures G90 distance mode", () => {
      const r = ppGCodeStatisticsEngine.analyze(SAMPLE);
      expect(r.g_code_histogram["G90"]).toBe(1);
    });

    it("captures G21 units", () => {
      const r = ppGCodeStatisticsEngine.analyze(SAMPLE);
      expect(r.g_code_histogram["G21"]).toBe(1);
      expect(r.uses_mm).toBe(true);
      expect(r.uses_inches).toBe(false);
    });
  });

  describe("M-code histogram", () => {
    it("counts spindle commands", () => {
      const r = ppGCodeStatisticsEngine.analyze(SAMPLE);
      expect(r.m_code_histogram["M3"]).toBe(2);
      expect(r.m_code_histogram["M5"]).toBe(1);
    });

    it("counts coolant", () => {
      const r = ppGCodeStatisticsEngine.analyze(SAMPLE);
      expect(r.m_code_histogram["M8"]).toBe(1);
      expect(r.m_code_histogram["M9"]).toBe(1);
    });

    it("counts program end", () => {
      const r = ppGCodeStatisticsEngine.analyze(SAMPLE);
      expect(r.m_code_histogram["M30"]).toBe(1);
      expect(r.has_program_end).toBe(true);
    });
  });

  describe("tool usage", () => {
    it("detects tool changes", () => {
      const r = ppGCodeStatisticsEngine.analyze(SAMPLE);
      expect(r.tool_changes).toBe(2);
    });

    it("reports unique tool count", () => {
      const r = ppGCodeStatisticsEngine.analyze(SAMPLE);
      expect(r.unique_tool_count).toBe(2);
    });

    it("lists tools in order of appearance", () => {
      const r = ppGCodeStatisticsEngine.analyze(SAMPLE);
      expect(r.tools[0].tool_number).toBe(1);
      expect(r.tools[1].tool_number).toBe(2);
    });

    it("captures tool first_line and last_line", () => {
      const r = ppGCodeStatisticsEngine.analyze(SAMPLE);
      expect(r.tools[0].first_line).toBeLessThan(r.tools[0].last_line + 1);
    });
  });

  describe("work offsets", () => {
    it("captures G54 usage", () => {
      const r = ppGCodeStatisticsEngine.analyze(SAMPLE);
      expect(r.work_offsets_used).toContain("G54");
    });

    it("returns empty array if no work offsets", () => {
      const noOffset = `G90 G21\nS1000 M3\nM30`;
      const r = ppGCodeStatisticsEngine.analyze(noOffset);
      expect(r.work_offsets_used.length).toBe(0);
    });
  });

  describe("feed rate distribution", () => {
    it("counts feed rate occurrences", () => {
      const r = ppGCodeStatisticsEngine.analyze(SAMPLE);
      expect(r.feed_rates.count).toBe(2); // F200 and F150
    });

    it("reports min/max feed", () => {
      const r = ppGCodeStatisticsEngine.analyze(SAMPLE);
      expect(r.feed_rates.min).toBe(150);
      expect(r.feed_rates.max).toBe(200);
    });

    it("reports mean feed", () => {
      const r = ppGCodeStatisticsEngine.analyze(SAMPLE);
      expect(r.feed_rates.mean).toBe(175);
    });

    it("unique_values=2 when two distinct feeds", () => {
      const r = ppGCodeStatisticsEngine.analyze(SAMPLE);
      expect(r.feed_rates.unique_values).toBe(2);
    });
  });

  describe("spindle speed distribution", () => {
    it("captures speeds", () => {
      const r = ppGCodeStatisticsEngine.analyze(SAMPLE);
      expect(r.spindle_speeds.min).toBe(2000);
      expect(r.spindle_speeds.max).toBe(3500);
    });

    it("count=2 for two S-words", () => {
      const r = ppGCodeStatisticsEngine.analyze(SAMPLE);
      expect(r.spindle_speeds.count).toBe(2);
    });
  });

  describe("axis word usage", () => {
    it("counts X, Y, Z words", () => {
      const r = ppGCodeStatisticsEngine.analyze(SAMPLE);
      expect(r.axis_words.X).toBeGreaterThan(5);
      expect(r.axis_words.Y).toBeGreaterThan(5);
      expect(r.axis_words.Z).toBeGreaterThan(2);
    });

    it("counts I, J arc centers", () => {
      const r = ppGCodeStatisticsEngine.analyze(SAMPLE);
      expect(r.axis_words.I).toBe(2);
      expect(r.axis_words.J).toBe(2);
    });

    it("A, B, C are zero for 3-axis program", () => {
      const r = ppGCodeStatisticsEngine.analyze(SAMPLE);
      expect(r.axis_words.A).toBe(0);
      expect(r.axis_words.B).toBe(0);
      expect(r.axis_words.C).toBe(0);
    });
  });

  describe("move type stats", () => {
    it("counts rapid vs feed moves", () => {
      const r = ppGCodeStatisticsEngine.analyze(SAMPLE);
      expect(r.moves.rapid_moves).toBeGreaterThan(0);
      expect(r.moves.feed_moves).toBeGreaterThan(0);
    });

    it("sums rapid and feed distances", () => {
      const r = ppGCodeStatisticsEngine.analyze(SAMPLE);
      expect(r.moves.rapid_distance).toBeGreaterThan(0);
      expect(r.moves.feed_distance).toBeGreaterThan(0);
    });

    it("computes cut_to_rapid_ratio", () => {
      const r = ppGCodeStatisticsEngine.analyze(SAMPLE);
      expect(r.moves.cut_to_rapid_ratio).toBeGreaterThan(0);
    });

    it("counts G2 arc cw and G3 arc ccw separately", () => {
      const r = ppGCodeStatisticsEngine.analyze(SAMPLE);
      expect(r.moves.arc_cw_moves).toBe(1);
      expect(r.moves.arc_ccw_moves).toBe(1);
    });
  });

  describe("block statistics", () => {
    it("tracks motion blocks", () => {
      const r = ppGCodeStatisticsEngine.analyze(SAMPLE);
      expect(r.blocks.motion_blocks).toBeGreaterThan(0);
    });

    it("counts annotated comments", () => {
      const r = ppGCodeStatisticsEngine.analyze(SAMPLE);
      expect(r.blocks.annotated_comment_count).toBeGreaterThan(0);
    });

    it("total_blocks matches line count", () => {
      const r = ppGCodeStatisticsEngine.analyze(SAMPLE);
      expect(r.blocks.total_blocks).toBe(r.total_lines);
    });

    it("n_numbered_blocks=0 when no N-numbers", () => {
      const r = ppGCodeStatisticsEngine.analyze(SAMPLE);
      expect(r.blocks.n_numbered_blocks).toBe(0);
    });

    it("detects N-numbered blocks", () => {
      const nNumbered = `N10 G90 G21\nN20 S1000 M3\nN30 M30`;
      const r = ppGCodeStatisticsEngine.analyze(nNumbered);
      expect(r.blocks.n_numbered_blocks).toBe(3);
    });
  });

  describe("feature flags", () => {
    it("no cutter comp when G41/G42 absent", () => {
      const r = ppGCodeStatisticsEngine.analyze(SAMPLE);
      expect(r.has_cutter_comp).toBe(false);
    });

    it("detects cutter comp", () => {
      const code = `G90 G21\nG41 D1 X10\nG1 F200\nG40\nM30`;
      const r = ppGCodeStatisticsEngine.analyze(code);
      expect(r.has_cutter_comp).toBe(true);
    });

    it("detects drill cycle", () => {
      const code = `G90 G21\nG81 X0 Y0 Z-5 R2 F100\nG80\nM30`;
      const r = ppGCodeStatisticsEngine.analyze(code);
      expect(r.has_drill_cycle).toBe(true);
    });

    it("detects subprogram call", () => {
      const code = `G90 G21\nM98 P1001\nM30`;
      const r = ppGCodeStatisticsEngine.analyze(code);
      expect(r.has_subprogram_call).toBe(true);
    });

    it("detects macro", () => {
      const code = `G90 G21\n#100=10\nIF [#100 GT 5] GOTO 10\nM30`;
      const r = ppGCodeStatisticsEngine.analyze(code);
      expect(r.has_macro).toBe(true);
    });

    it("detects probing (G31)", () => {
      const code = `G90 G21\nG31 X10 F100\nM30`;
      const r = ppGCodeStatisticsEngine.analyze(code);
      expect(r.has_probing).toBe(true);
    });

    it("detects inches mode", () => {
      const code = `G90 G20\nM30`;
      const r = ppGCodeStatisticsEngine.analyze(code);
      expect(r.uses_inches).toBe(true);
      expect(r.uses_mm).toBe(false);
    });
  });

  describe("similarity", () => {
    it("similarity to itself = 1", () => {
      const r = ppGCodeStatisticsEngine.analyze(SAMPLE);
      expect(ppGCodeStatisticsEngine.similarity(r, r)).toBeCloseTo(1, 3);
    });

    it("similarity to totally different program < 0.5", () => {
      const r1 = ppGCodeStatisticsEngine.analyze(SAMPLE);
      const r2 = ppGCodeStatisticsEngine.analyze(
        `G90 G21\nG31 X10 F100\nG31 X20 F100\nG31 X30 F100\nM30`,
      );
      expect(ppGCodeStatisticsEngine.similarity(r1, r2)).toBeLessThan(0.8);
    });

    it("similarity is symmetric", () => {
      const r1 = ppGCodeStatisticsEngine.analyze(SAMPLE);
      const r2 = ppGCodeStatisticsEngine.analyze(
        `G90 G21\nG1 X10 F200\nM30`,
      );
      const s1 = ppGCodeStatisticsEngine.similarity(r1, r2);
      const s2 = ppGCodeStatisticsEngine.similarity(r2, r1);
      expect(s1).toBeCloseTo(s2, 4);
    });
  });

  describe("edge cases", () => {
    it("handles empty program", () => {
      const r = ppGCodeStatisticsEngine.analyze("");
      expect(r.total_lines).toBe(1); // split("") → [""]
      expect(r.tool_changes).toBe(0);
      expect(r.has_program_end).toBe(false);
    });

    it("handles program without program number", () => {
      const r = ppGCodeStatisticsEngine.analyze("G90 G21\nM30");
      expect(r.program_number).toBeUndefined();
    });

    it("handles single-line M30 as program end", () => {
      const r = ppGCodeStatisticsEngine.analyze("M30");
      expect(r.has_program_end).toBe(true);
    });

    it("handles comments correctly without breaking parsing", () => {
      const r = ppGCodeStatisticsEngine.analyze(
        `G90 (ABSOLUTE) G21 (MM)\nG1 X10 (MOVE) F200\nM30`,
      );
      expect(r.g_code_histogram["G90"]).toBe(1);
      expect(r.g_code_histogram["G21"]).toBe(1);
      expect(r.g_code_histogram["G1"]).toBe(1);
    });
  });
});
