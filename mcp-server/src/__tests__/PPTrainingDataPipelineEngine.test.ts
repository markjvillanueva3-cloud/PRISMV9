/**
 * PPTrainingDataPipelineEngine Tests — PP-DL-MS0
 */
import { describe, it, expect } from "vitest";
import {
  PPTrainingDataPipelineEngine,
  ppTrainingDataPipelineEngine,
  type TrainingRecord,
} from "../engines/PPTrainingDataPipelineEngine.js";

const FANUC_PROGRAM = `%
O0001
(PART: TEST-001)
G90 G21 G17 G40 G80 G49
G91 G28 Z0
T1 M6
G54
G43 H1 Z50.0
S5000 M3
M8
G0 X0 Y0
G0 Z5.0
G1 Z-2.0 F200
G1 X50.0 F500
G1 Y30.0
G2 X30.0 Y50.0 I-20.0 J0
G0 Z5.0
G91 G28 Z0
T2 M6
G54
G43 H2 Z50.0
S8000 M3
G0 X10.0 Y10.0
G0 Z2.0
G1 Z-0.5 F100
G1 X40.0
G1 Y25.0
G0 Z50.0
M5
M9
G91 G28 Z0
M30
%`;

const SIEMENS_PROGRAM = `; SIEMENS 840D TEST
DEF REAL _DEPTH=10.0
T1 D1
M6
G54
G90 G0 X0 Y0
S4000 M3
M8
CYCLE81(100, 0, 1, -25)
CYCLE81(100, 0, 1, -25)
G0 Z100
M5
M9
M30`;

const SIMPLE_PROGRAM = `G90 G21
G0 X0 Y0 Z5
G1 Z-1 F200
G1 X10
M30`;

describe("PPTrainingDataPipelineEngine", () => {
  it("exports singleton", () => {
    expect(ppTrainingDataPipelineEngine).toBeInstanceOf(PPTrainingDataPipelineEngine);
  });

  describe("processProgram - Fanuc", () => {
    let record: TrainingRecord;

    it("processes without error", () => {
      record = ppTrainingDataPipelineEngine.processProgram(FANUC_PROGRAM, "O0001.nc");
      expect(record).toBeDefined();
    });

    it("detects Fanuc controller", () => {
      record = ppTrainingDataPipelineEngine.processProgram(FANUC_PROGRAM);
      expect(record.controller_label).toBe("fanuc");
    });

    it("counts total lines", () => {
      record = ppTrainingDataPipelineEngine.processProgram(FANUC_PROGRAM);
      expect(record.features.total_lines).toBeGreaterThan(20);
    });

    it("detects 2 tool changes", () => {
      record = ppTrainingDataPipelineEngine.processProgram(FANUC_PROGRAM);
      expect(record.features.tool_changes).toBeGreaterThanOrEqual(2);
      expect(record.features.unique_tools).toBeGreaterThanOrEqual(2);
    });

    it("extracts operations", () => {
      record = ppTrainingDataPipelineEngine.processProgram(FANUC_PROGRAM);
      expect(record.features.operations.length).toBeGreaterThanOrEqual(2);
    });

    it("detects canned cycles as false (no G81-G89)", () => {
      record = ppTrainingDataPipelineEngine.processProgram(FANUC_PROGRAM);
      expect(record.features.has_canned_cycles).toBe(false);
    });

    it("detects max spindle speed", () => {
      record = ppTrainingDataPipelineEngine.processProgram(FANUC_PROGRAM);
      expect(record.features.max_spindle_speed).toBe(8000);
    });

    it("has reasonable quality score", () => {
      record = ppTrainingDataPipelineEngine.processProgram(FANUC_PROGRAM);
      expect(record.quality_score).toBeGreaterThan(0.5);
    });

    it("assigns complexity label", () => {
      record = ppTrainingDataPipelineEngine.processProgram(FANUC_PROGRAM);
      expect(["simple", "moderate", "complex", "expert"]).toContain(record.complexity_label);
    });

    it("preserves source file", () => {
      record = ppTrainingDataPipelineEngine.processProgram(FANUC_PROGRAM, "O0001.nc");
      expect(record.source_file).toBe("O0001.nc");
    });
  });

  describe("processProgram - Siemens", () => {
    it("detects Siemens controller", () => {
      const record = ppTrainingDataPipelineEngine.processProgram(SIEMENS_PROGRAM);
      expect(record.controller_label).toBe("siemens");
    });

    it("detects canned cycles (CYCLE81)", () => {
      const record = ppTrainingDataPipelineEngine.processProgram(SIEMENS_PROGRAM);
      expect(record.features.has_canned_cycles).toBe(true);
    });

    it("extracts operation labels", () => {
      const record = ppTrainingDataPipelineEngine.processProgram(SIEMENS_PROGRAM);
      expect(record.operation_labels.length).toBeGreaterThan(0);
    });
  });

  describe("processProgram - simple", () => {
    it("handles minimal program", () => {
      const record = ppTrainingDataPipelineEngine.processProgram(SIMPLE_PROGRAM);
      expect(record.features.total_lines).toBeGreaterThanOrEqual(4);
    });

    it("simple program has lower quality (no tool change)", () => {
      const record = ppTrainingDataPipelineEngine.processProgram(SIMPLE_PROGRAM);
      const fullRecord = ppTrainingDataPipelineEngine.processProgram(FANUC_PROGRAM);
      expect(record.quality_score).toBeLessThanOrEqual(fullRecord.quality_score);
    });

    it("assigns simple complexity", () => {
      const record = ppTrainingDataPipelineEngine.processProgram(SIMPLE_PROGRAM);
      expect(record.complexity_label).toBe("simple");
    });
  });

  describe("processBatch", () => {
    it("processes multiple programs", () => {
      const records = ppTrainingDataPipelineEngine.processBatch([
        { gcode: FANUC_PROGRAM, file: "test1.nc" },
        { gcode: SIEMENS_PROGRAM, file: "test2.nc" },
      ]);
      expect(records.length).toBe(2);
      expect(records[0].controller_label).toBe("fanuc");
      expect(records[1].controller_label).toBe("siemens");
    });
  });

  describe("getStats", () => {
    it("tracks pipeline statistics", () => {
      const engine = new PPTrainingDataPipelineEngine();
      engine.processProgram(FANUC_PROGRAM);
      engine.processProgram(SIEMENS_PROGRAM);
      const stats = engine.getStats();
      expect(stats.programs_processed).toBe(2);
      expect(stats.total_lines_parsed).toBeGreaterThan(30);
      expect(stats.controller_distribution).toHaveProperty("fanuc");
      expect(stats.controller_distribution).toHaveProperty("siemens");
    });

    it("resetStats clears counters", () => {
      const engine = new PPTrainingDataPipelineEngine();
      engine.processProgram(FANUC_PROGRAM);
      engine.resetStats();
      expect(engine.getStats().programs_processed).toBe(0);
    });
  });

  describe("5-axis detection", () => {
    it("detects G43.4 as 5-axis", () => {
      const gcode = `G90 G21\nG43.4 H1\nG1 X10 Y10 Z5 A10 C20 F200\nM30`;
      const record = ppTrainingDataPipelineEngine.processProgram(gcode);
      expect(record.features.has_5axis).toBe(true);
    });

    it("detects TRAORI as 5-axis", () => {
      const gcode = `G90\nTRAORI\nG1 X10 Y10 A5 B3 F200\nM30`;
      const record = ppTrainingDataPipelineEngine.processProgram(gcode);
      expect(record.features.has_5axis).toBe(true);
    });

    it("simple 3-axis is not 5-axis", () => {
      const record = ppTrainingDataPipelineEngine.processProgram(SIMPLE_PROGRAM);
      expect(record.features.has_5axis).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("handles empty program", () => {
      const record = ppTrainingDataPipelineEngine.processProgram("");
      expect(record.features.total_lines).toBe(1);
      expect(record.quality_score).toBeLessThan(0.5);
    });

    it("handles program with only comments", () => {
      const record = ppTrainingDataPipelineEngine.processProgram("(COMMENT 1)\n(COMMENT 2)\n; end");
      expect(record.features.total_blocks).toBeGreaterThan(0);
    });
  });
});
