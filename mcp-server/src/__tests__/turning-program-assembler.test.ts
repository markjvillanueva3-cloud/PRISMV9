/**
 * Tests for TurningProgramAssemblerEngine
 * Covers program assembly, tool auto-selection, cycle time estimation,
 * and program validation.
 */
import { describe, it, expect } from "vitest";
import { turningProgramAssemblerEngine } from "../engines/TurningProgramAssemblerEngine.js";
import type {
  TurningPartProfile,
  ProfilePoint,
} from "../engines/TurningProgramAssemblerEngine.js";

// ── Shared fixtures ──────────────────────────────────────────────

const simplePart: TurningPartProfile = {
  bar_diameter_mm: 50,
  bar_length_mm: 80,
  material: "steel_1045",
  od_profile: [
    { z_mm: 0, x_mm: 40 },
    { z_mm: -30, x_mm: 40 },
    { z_mm: -30, x_mm: 50 },
    { z_mm: -60, x_mm: 50 },
  ],
};

const partWithFeatures: TurningPartProfile = {
  bar_diameter_mm: 60,
  bar_length_mm: 100,
  material: "aluminum_6061",
  od_profile: [
    { z_mm: 0, x_mm: 45 },
    { z_mm: -40, x_mm: 45 },
    { z_mm: -40, x_mm: 60 },
    { z_mm: -80, x_mm: 60 },
  ],
  od_grooves: [
    { z_position_mm: -35, width_mm: 3, depth_mm: 5 },
  ],
  od_threads: [
    {
      z_start_mm: -2,
      z_end_mm: -25,
      pitch_mm: 1.5,
      major_dia_mm: 45,
    },
  ],
  center_drill: true,
  drill_diameter_mm: 15,
  drill_depth_mm: 50,
  part_off_width_mm: 3,
};

describe("TurningProgramAssemblerEngine", () => {
  // ── Tool Auto-Selection ────────────────────────────────────────

  describe("autoSelectTools", () => {
    it("should auto-select tools for a simple OD part", () => {
      const result = turningProgramAssemblerEngine.autoSelectTools({
        part: simplePart,
      });

      expect(result.value).toBeDefined();
      expect(result.unit).toBeTruthy();
      expect(Array.isArray(result.value)).toBe(true);
      expect(result.value.length).toBeGreaterThan(0);

      // Each tool assignment should have required fields
      for (const tool of result.value) {
        expect(tool.station).toBeGreaterThanOrEqual(1);
        expect(tool.station).toBeLessThanOrEqual(12);
        expect(typeof tool.tool_type).toBe("string");
        expect(typeof tool.description).toBe("string");
        expect(tool.nose_radius_mm).toBeGreaterThan(0);
        expect(tool.orientation).toBeGreaterThanOrEqual(1);
        expect(tool.orientation).toBeLessThanOrEqual(9);
      }
    });

    it("should assign more tools for a part with features", () => {
      const simple = turningProgramAssemblerEngine.autoSelectTools({
        part: simplePart,
      });
      const complex = turningProgramAssemblerEngine.autoSelectTools({
        part: partWithFeatures,
      });

      // Part with grooves, threads, drilling needs more tools
      expect(complex.value.length).toBeGreaterThan(simple.value.length);
    });
  });

  // ── Full Program Assembly ──────────────────────────────────────

  describe("assembleTurningProgram", () => {
    it("should assemble a complete program for simple OD part", async () => {
      const result = await turningProgramAssemblerEngine
        .assembleTurningProgram({
          part: simplePart,
          controller: "fanuc",
        });

      expect(result.value).toBeDefined();
      const prog = result.value;

      expect(prog.program_number).toBeTruthy();
      expect(prog.safe_start_block).toBeTruthy();
      expect(Array.isArray(prog.header_comments)).toBe(true);
      expect(Array.isArray(prog.tool_list)).toBe(true);
      expect(prog.tool_list.length).toBeGreaterThan(0);
      expect(Array.isArray(prog.operations)).toBe(true);
      expect(prog.operations.length).toBeGreaterThan(0);

      // Each operation should have G-code
      for (const op of prog.operations) {
        expect(op.type).toBeTruthy();
        expect(op.name).toBeTruthy();
        expect(op.tool_station).toBeGreaterThanOrEqual(1);
        expect(Array.isArray(op.gcode_lines)).toBe(true);
        expect(op.gcode_lines.length).toBeGreaterThan(0);
        expect(op.estimated_time_s).toBeGreaterThanOrEqual(0);
      }
    });

    it("should assemble program with threads and grooves", async () => {
      const result = await turningProgramAssemblerEngine
        .assembleTurningProgram({
          part: partWithFeatures,
          controller: "fanuc",
        });

      const prog = result.value;
      const opTypes = prog.operations.map((o) => o.type);

      // Should contain threading and grooving operations
      expect(
        opTypes.some((t) => t.includes("thread") || t.includes("Thread"))
      ).toBe(true);
      expect(
        opTypes.some((t) => t.includes("groove") || t.includes("Groove"))
      ).toBe(true);
    });

    it("should include part-off when specified", async () => {
      const result = await turningProgramAssemblerEngine
        .assembleTurningProgram({
          part: partWithFeatures,
          controller: "fanuc",
        });

      const prog = result.value;
      const allGcode = prog.operations
        .flatMap((o) => o.gcode_lines)
        .join("\n");

      // Part-off typically uses G75 or X0 plunge
      const hasPartOff = prog.operations.some(
        (o) =>
          o.type.includes("part") ||
          o.type.includes("Part") ||
          o.type.includes("cutoff") ||
          o.type.includes("Cutoff")
      );
      expect(hasPartOff).toBe(true);
    });
  });

  // ── Program Validation ─────────────────────────────────────────

  describe("validateProgram", () => {
    it("should validate a well-formed program", async () => {
      // First assemble a program, then validate it
      const assembled = await turningProgramAssemblerEngine
        .assembleTurningProgram({
          part: simplePart,
          controller: "fanuc",
        });

      const result = await turningProgramAssemblerEngine.validateProgram({
        part: simplePart,
        tools: assembled.value.tool_list,
        machine_max_rpm: 6000,
      });

      expect(result.value).toBeDefined();
    });
  });

  // ── Cycle Time Estimation ──────────────────────────────────────

  describe("estimateCycleTime", () => {
    it("should estimate cycle time from assembled operations", async () => {
      const assembled = await turningProgramAssemblerEngine
        .assembleTurningProgram({
          part: simplePart,
          controller: "fanuc",
        });

      const result = turningProgramAssemblerEngine.estimateCycleTime({
        part: simplePart,
        tools: assembled.value.tool_list,
        operations: assembled.value.operations,
      });

      expect(result.value).toBeDefined();
      expect(result.value.total_s).toBeGreaterThan(0);
      expect(result.value.cutting_s).toBeGreaterThanOrEqual(0);
      expect(result.value.rapid_s).toBeGreaterThanOrEqual(0);
      expect(result.value.total_s).toBeGreaterThanOrEqual(
        result.value.cutting_s
      );
    });
  });
});
