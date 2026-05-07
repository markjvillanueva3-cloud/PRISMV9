/**
 * LatheProgramGeneratorEngine Tests
 *
 * U-LTH36: G-code generation tests
 */

import { describe, it, expect } from "vitest";
import {
  latheProgramGeneratorEngine,
  type ProgramGenerationConfig,
  type GeneratedProgram,
} from "../engines/LatheProgramGeneratorEngine.js";
import { latheToolpathPlannerEngine } from "../engines/LatheToolpathPlannerEngine.js";
import { latheFeatureRecognitionEngine } from "../engines/LatheFeatureRecognitionEngine.js";
import { lathePrintIngestPipelineEngine } from "../engines/LathePrintIngestPipelineEngine.js";

describe("LatheProgramGeneratorEngine", () => {
  const getTestPlan = async () => {
    const intake = await lathePrintIngestPipelineEngine.ingest({
      source_type: "pdf",
      part_type: "turning",
      part_number: "TEST-001"
    });
    const recognition = latheFeatureRecognitionEngine.recognize(intake);
    return latheToolpathPlannerEngine.plan(recognition);
  };

  const getDefaultConfig = (): ProgramGenerationConfig => ({
    controller: "okuma_osp",
    header: {
      program_number: 1001,
      program_name: "TEST PART",
      part_number: "TEST-001",
      customer: "Test Customer",
      material: "4140 Steel"
    }
  });

  describe("generate()", () => {
    it("generates program from toolpath plan", async () => {
      const plan = await getTestPlan();
      const config = getDefaultConfig();

      const program = latheProgramGeneratorEngine.generate(plan, config);

      expect(program.program_id).toMatch(/^prog_\d+_\d+$/);
      expect(program.plan_id).toBe(plan.plan_id);
      expect(program.processing_time_ms).toBeGreaterThanOrEqual(0);
    });

    it("generates valid G-code output", async () => {
      const plan = await getTestPlan();
      const config = getDefaultConfig();

      const program = latheProgramGeneratorEngine.generate(plan, config);

      expect(program.gcode.length).toBeGreaterThan(0);
      expect(program.line_count).toBeGreaterThan(0);
      expect(program.character_count).toBe(program.gcode.length);
    });

    it("includes program header", async () => {
      const plan = await getTestPlan();
      const config = getDefaultConfig();

      const program = latheProgramGeneratorEngine.generate(plan, config);

      expect(program.gcode).toContain("O1001");
      expect(program.gcode).toContain("TEST PART");
      expect(program.gcode).toContain("PART: TEST-001");
      expect(program.gcode).toContain("MATERIAL: 4140 Steel");
    });

    it("includes safety block", async () => {
      const plan = await getTestPlan();
      const config = getDefaultConfig();

      const program = latheProgramGeneratorEngine.generate(plan, config);

      expect(program.gcode).toContain("G40");
      expect(program.gcode).toContain("G80");
      expect(program.gcode).toContain("G28");
    });

    it("includes program end", async () => {
      const plan = await getTestPlan();
      const config = getDefaultConfig();

      const program = latheProgramGeneratorEngine.generate(plan, config);

      expect(program.gcode).toContain("M05");
      expect(program.gcode).toContain("M30");
    });

    it("tracks tool calls", async () => {
      const plan = await getTestPlan();
      const config = getDefaultConfig();

      const program = latheProgramGeneratorEngine.generate(plan, config);

      expect(program.tool_calls).toBe(plan.total_tool_changes);
    });

    it("includes estimated runtime", async () => {
      const plan = await getTestPlan();
      const config = getDefaultConfig();

      const program = latheProgramGeneratorEngine.generate(plan, config);

      expect(program.estimated_runtime_sec).toBe(plan.total_cycle_time_sec);
    });
  });

  describe("Controller Formats", () => {
    it("generates Okuma OSP format", async () => {
      const plan = await getTestPlan();
      const config: ProgramGenerationConfig = {
        ...getDefaultConfig(),
        controller: "okuma_osp"
      };

      const program = latheProgramGeneratorEngine.generate(plan, config);

      expect(program.controller).toBe("okuma_osp");
      expect(program.gcode).toContain("O1001");
      expect(program.gcode).toContain("G50 S3000");
    });

    it("generates Fanuc format", async () => {
      const plan = await getTestPlan();
      const config: ProgramGenerationConfig = {
        ...getDefaultConfig(),
        controller: "fanuc"
      };

      const program = latheProgramGeneratorEngine.generate(plan, config);

      expect(program.controller).toBe("fanuc");
      expect(program.gcode).toContain("%");
      expect(program.gcode).toContain("O1001");
    });

    it("generates generic ISO format", async () => {
      const plan = await getTestPlan();
      const config: ProgramGenerationConfig = {
        ...getDefaultConfig(),
        controller: "generic_iso"
      };

      const program = latheProgramGeneratorEngine.generate(plan, config);

      expect(program.controller).toBe("generic_iso");
      expect(program.gcode).toContain("%");
    });
  });

  describe("Line Numbers", () => {
    it("includes line numbers by default", async () => {
      const plan = await getTestPlan();
      const config = getDefaultConfig();

      const program = latheProgramGeneratorEngine.generate(plan, config);

      expect(program.gcode).toMatch(/N\d+/);
    });

    it("respects line number configuration", async () => {
      const plan = await getTestPlan();
      const config: ProgramGenerationConfig = {
        ...getDefaultConfig(),
        line_number_start: 100,
        line_number_increment: 5
      };

      const program = latheProgramGeneratorEngine.generate(plan, config);

      expect(program.gcode).toContain("N100");
      expect(program.gcode).toContain("N105");
    });

    it("can omit line numbers", async () => {
      const plan = await getTestPlan();
      const config: ProgramGenerationConfig = {
        ...getDefaultConfig(),
        include_line_numbers: false
      };

      const program = latheProgramGeneratorEngine.generate(plan, config);

      // Should have G-codes but fewer N-prefixed lines
      expect(program.gcode).toContain("G00");
      // Line numbers should be minimal (only in canned cycle definitions)
      const lineNumMatches = program.gcode.match(/^N\d+/gm);
      expect(lineNumMatches?.length || 0).toBeLessThan(10);
    });
  });

  describe("Canned Cycles", () => {
    it("generates G71 for rough turning", async () => {
      const plan = await getTestPlan();
      const config = getDefaultConfig();

      const program = latheProgramGeneratorEngine.generate(plan, config);

      if (plan.segments.some(s => s.cycle_type === "G71")) {
        expect(program.gcode).toContain("G71");
        expect(program.cycle_calls).toBeGreaterThan(0);
      }
    });

    it("generates G76 for threading", async () => {
      const plan = await getTestPlan();
      const config = getDefaultConfig();

      const program = latheProgramGeneratorEngine.generate(plan, config);

      if (plan.segments.some(s => s.cycle_type === "G76")) {
        expect(program.gcode).toContain("G76");
      }
    });

    it("generates G83 for peck drilling", async () => {
      const plan = await getTestPlan();
      const config = getDefaultConfig();

      const program = latheProgramGeneratorEngine.generate(plan, config);

      if (plan.segments.some(s => s.cycle_type === "G83")) {
        expect(program.gcode).toContain("G83");
        expect(program.gcode).toContain("G80"); // Cycle cancel
      }
    });
  });

  describe("Comments", () => {
    it("includes comments by default", async () => {
      const plan = await getTestPlan();
      const config = getDefaultConfig();

      const program = latheProgramGeneratorEngine.generate(plan, config);

      expect(program.gcode).toMatch(/\(.*\)/);
    });

    it("includes operation headers", async () => {
      const plan = await getTestPlan();
      const config: ProgramGenerationConfig = {
        ...getDefaultConfig(),
        include_operation_headers: true
      };

      const program = latheProgramGeneratorEngine.generate(plan, config);

      expect(program.gcode).toContain("TOOL");
    });

    it("can omit comments", async () => {
      const plan = await getTestPlan();
      const config: ProgramGenerationConfig = {
        ...getDefaultConfig(),
        include_comments: false
      };

      const program = latheProgramGeneratorEngine.generate(plan, config);

      // Should have fewer comment lines (header comments still present)
      const commentCount = (program.gcode.match(/\(/g) || []).length;
      expect(commentCount).toBeLessThan(20);
    });
  });

  describe("Tool Changes", () => {
    it("generates tool call codes", async () => {
      const plan = await getTestPlan();
      const config = getDefaultConfig();

      const program = latheProgramGeneratorEngine.generate(plan, config);

      // Should have T-codes
      expect(program.gcode).toMatch(/T\d+/);
    });

    it("includes return to safe position", async () => {
      const plan = await getTestPlan();
      const config = getDefaultConfig();

      const program = latheProgramGeneratorEngine.generate(plan, config);

      // Should have G00 rapid moves to safe position
      expect(program.gcode).toContain("G00 X200 Z300");
    });
  });

  describe("Spindle Control", () => {
    it("includes spindle start commands", async () => {
      const plan = await getTestPlan();
      const config = getDefaultConfig();

      const program = latheProgramGeneratorEngine.generate(plan, config);

      expect(program.gcode).toMatch(/M0[34]/); // M03 or M04
    });

    it("uses CSS mode G96", async () => {
      const plan = await getTestPlan();
      const config = getDefaultConfig();

      const program = latheProgramGeneratorEngine.generate(plan, config);

      expect(program.gcode).toContain("G96");
    });

    it("uses constant RPM G97 for threading", async () => {
      const plan = await getTestPlan();
      const config = getDefaultConfig();

      const program = latheProgramGeneratorEngine.generate(plan, config);

      // If threading exists, should have G97
      if (plan.segments.some(s => s.operation === "thread")) {
        expect(program.gcode).toContain("G97");
      }
    });
  });

  describe("getStatistics()", () => {
    it("returns supported controllers", () => {
      const stats = latheProgramGeneratorEngine.getStatistics();

      expect(stats.supported_controllers).toContain("okuma_osp");
      expect(stats.supported_controllers).toContain("fanuc");
      expect(stats.supported_controllers).toContain("generic_iso");
    });

    it("returns supported cycles", () => {
      const stats = latheProgramGeneratorEngine.getStatistics();

      expect(stats.supported_cycles).toContain("G71");
      expect(stats.supported_cycles).toContain("G76");
      expect(stats.supported_cycles).toContain("G83");
    });

    it("tracks program count", async () => {
      const before = latheProgramGeneratorEngine.getStatistics().total_programs;

      const plan = await getTestPlan();
      latheProgramGeneratorEngine.generate(plan, getDefaultConfig());

      const after = latheProgramGeneratorEngine.getStatistics().total_programs;
      expect(after).toBe(before + 1);
    });
  });

  describe("Header Configuration", () => {
    it("includes all header fields", async () => {
      const plan = await getTestPlan();
      const config: ProgramGenerationConfig = {
        controller: "okuma_osp",
        header: {
          program_number: 2001,
          program_name: "CUSTOM PART",
          part_number: "CUST-123",
          customer: "Big Customer Inc",
          material: "6061 Aluminum",
          machine_id: "LTH-01"
        }
      };

      const program = latheProgramGeneratorEngine.generate(plan, config);

      expect(program.gcode).toContain("O2001");
      expect(program.gcode).toContain("CUSTOM PART");
      expect(program.gcode).toContain("CUST-123");
      expect(program.gcode).toContain("Big Customer Inc");
      expect(program.gcode).toContain("6061 Aluminum");
      expect(program.gcode).toContain("LTH-01");
    });
  });

  describe("Edge Cases", () => {
    it("handles empty toolpath plan", async () => {
      const intake = await lathePrintIngestPipelineEngine.ingest({
        source_type: "image",
        image_base64: "minimal"
      });

      const recognition = latheFeatureRecognitionEngine.recognize({
        ...intake,
        dimensions: [],
        turning_features: []
      });

      const emptyPlan = latheToolpathPlannerEngine.plan(recognition);
      const config = getDefaultConfig();

      const program = latheProgramGeneratorEngine.generate(emptyPlan, config);

      expect(program.gcode).toContain("O1001");
      expect(program.gcode).toContain("M30");
    });
  });
});
