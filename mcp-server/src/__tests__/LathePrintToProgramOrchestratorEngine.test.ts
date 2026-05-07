/**
 * LathePrintToProgramOrchestratorEngine Tests
 *
 * U-LTH37: End-to-end pipeline orchestration tests
 */

import { describe, it, expect } from "vitest";
import {
  lathePrintToProgramOrchestratorEngine,
  type PrintToProgramInput,
} from "../engines/LathePrintToProgramOrchestratorEngine.js";

describe("LathePrintToProgramOrchestratorEngine", () => {
  const getTestInput = (): PrintToProgramInput => ({
    blueprint: {
      source_type: "pdf",
      part_type: "turning",
      part_number: "TEST-001",
      customer: "Test Customer"
    },
    program_number: 1001,
    program_name: "TEST PART",
    controller: "okuma_osp",
    machine_id: "LTH-01"
  });

  describe("execute()", () => {
    it("executes complete pipeline", async () => {
      const input = getTestInput();

      const result = await lathePrintToProgramOrchestratorEngine.execute(input);

      expect(result.pipeline_id).toMatch(/^pipeline_\d+_\d+$/);
      expect(result.success).toBe(true);
      expect(result.total_processing_time_ms).toBeGreaterThanOrEqual(0);
    });

    it("produces G-code output", async () => {
      const input = getTestInput();

      const result = await lathePrintToProgramOrchestratorEngine.execute(input);

      expect(result.gcode).toBeDefined();
      expect(result.gcode!.length).toBeGreaterThan(0);
      expect(result.gcode).toContain("O1001");
    });

    it("includes program object", async () => {
      const input = getTestInput();

      const result = await lathePrintToProgramOrchestratorEngine.execute(input);

      expect(result.program).toBeDefined();
      expect(result.program!.line_count).toBeGreaterThan(0);
    });

    it("completes all pipeline stages", async () => {
      const input = getTestInput();

      const result = await lathePrintToProgramOrchestratorEngine.execute(input);

      expect(result.stages.ingest.success).toBe(true);
      expect(result.stages.recognition.success).toBe(true);
      expect(result.stages.planning.success).toBe(true);
      expect(result.stages.generation.success).toBe(true);
    });

    it("tracks processing time per stage", async () => {
      const input = getTestInput();

      const result = await lathePrintToProgramOrchestratorEngine.execute(input);

      expect(result.stages.ingest.processing_time_ms).toBeGreaterThanOrEqual(0);
      expect(result.stages.recognition.processing_time_ms).toBeGreaterThanOrEqual(0);
      expect(result.stages.planning.processing_time_ms).toBeGreaterThanOrEqual(0);
      expect(result.stages.generation.processing_time_ms).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Pipeline Summary", () => {
    it("reports features recognized", async () => {
      const input = getTestInput();

      const result = await lathePrintToProgramOrchestratorEngine.execute(input);

      expect(result.summary.features_recognized).toBeGreaterThan(0);
    });

    it("reports toolpath segments", async () => {
      const input = getTestInput();

      const result = await lathePrintToProgramOrchestratorEngine.execute(input);

      expect(result.summary.toolpath_segments).toBeGreaterThan(0);
    });

    it("reports tool changes", async () => {
      const input = getTestInput();

      const result = await lathePrintToProgramOrchestratorEngine.execute(input);

      expect(result.summary.tool_changes).toBeGreaterThan(0);
    });

    it("reports estimated cycle time", async () => {
      const input = getTestInput();

      const result = await lathePrintToProgramOrchestratorEngine.execute(input);

      expect(result.summary.estimated_cycle_time_sec).toBeGreaterThan(0);
    });

    it("reports program line count", async () => {
      const input = getTestInput();

      const result = await lathePrintToProgramOrchestratorEngine.execute(input);

      expect(result.summary.program_line_count).toBeGreaterThan(0);
    });
  });

  describe("Stage Data Access", () => {
    it("provides ingest stage data", async () => {
      const input = getTestInput();

      const result = await lathePrintToProgramOrchestratorEngine.execute(input);

      expect(result.stages.ingest.data).toBeDefined();
      expect(result.stages.ingest.data!.dimensions.length).toBeGreaterThan(0);
    });

    it("provides recognition stage data", async () => {
      const input = getTestInput();

      const result = await lathePrintToProgramOrchestratorEngine.execute(input);

      expect(result.stages.recognition.data).toBeDefined();
      expect(result.stages.recognition.data!.feature_tree.features.length).toBeGreaterThan(0);
    });

    it("provides planning stage data", async () => {
      const input = getTestInput();

      const result = await lathePrintToProgramOrchestratorEngine.execute(input);

      expect(result.stages.planning.data).toBeDefined();
      expect(result.stages.planning.data!.segments.length).toBeGreaterThan(0);
    });

    it("provides generation stage data", async () => {
      const input = getTestInput();

      const result = await lathePrintToProgramOrchestratorEngine.execute(input);

      expect(result.stages.generation.data).toBeDefined();
      expect(result.stages.generation.data!.gcode.length).toBeGreaterThan(0);
    });
  });

  describe("Controller Configuration", () => {
    it("uses Okuma OSP by default", async () => {
      const input: PrintToProgramInput = {
        ...getTestInput(),
        controller: undefined
      };

      const result = await lathePrintToProgramOrchestratorEngine.execute(input);

      expect(result.program!.controller).toBe("okuma_osp");
    });

    it("supports Fanuc controller", async () => {
      const input: PrintToProgramInput = {
        ...getTestInput(),
        controller: "fanuc"
      };

      const result = await lathePrintToProgramOrchestratorEngine.execute(input);

      expect(result.program!.controller).toBe("fanuc");
      expect(result.gcode).toContain("%");
    });

    it("supports generic ISO", async () => {
      const input: PrintToProgramInput = {
        ...getTestInput(),
        controller: "generic_iso"
      };

      const result = await lathePrintToProgramOrchestratorEngine.execute(input);

      expect(result.program!.controller).toBe("generic_iso");
    });
  });

  describe("Planning Options", () => {
    it("passes planning config through", async () => {
      const input: PrintToProgramInput = {
        ...getTestInput(),
        planning: {
          max_depth_of_cut_mm: 2.0,
          finishing_allowance_mm: 0.5
        }
      };

      const result = await lathePrintToProgramOrchestratorEngine.execute(input);

      expect(result.success).toBe(true);
    });
  });

  describe("validateInput()", () => {
    it("validates correct input", () => {
      const input = getTestInput();

      const validation = lathePrintToProgramOrchestratorEngine.validateInput(input);

      expect(validation.valid).toBe(true);
      expect(validation.errors.length).toBe(0);
    });

    it("rejects missing program number", () => {
      const input: PrintToProgramInput = {
        ...getTestInput(),
        program_number: 0
      };

      const validation = lathePrintToProgramOrchestratorEngine.validateInput(input);

      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.includes("program number"))).toBe(true);
    });

    it("rejects empty program name", () => {
      const input: PrintToProgramInput = {
        ...getTestInput(),
        program_name: ""
      };

      const validation = lathePrintToProgramOrchestratorEngine.validateInput(input);

      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.includes("name"))).toBe(true);
    });
  });

  describe("executeWithProgress()", () => {
    it("calls progress callback for each stage", async () => {
      const input = getTestInput();
      const progressCalls: { stage: string; progress: number }[] = [];

      await lathePrintToProgramOrchestratorEngine.executeWithProgress(
        input,
        (stage, progress, message) => {
          progressCalls.push({ stage, progress });
        }
      );

      // Should have calls for all stages
      const stages = progressCalls.map(p => p.stage);
      expect(stages).toContain("ingest");
      expect(stages).toContain("recognition");
      expect(stages).toContain("planning");
      expect(stages).toContain("generation");
    });

    it("reports 100% progress for completed stages", async () => {
      const input = getTestInput();
      const completedStages: string[] = [];

      await lathePrintToProgramOrchestratorEngine.executeWithProgress(
        input,
        (stage, progress) => {
          if (progress === 100) {
            completedStages.push(stage);
          }
        }
      );

      expect(completedStages).toContain("ingest");
      expect(completedStages).toContain("recognition");
      expect(completedStages).toContain("planning");
      expect(completedStages).toContain("generation");
    });
  });

  describe("getStatistics()", () => {
    it("returns supported controllers", () => {
      const stats = lathePrintToProgramOrchestratorEngine.getStatistics();

      expect(stats.supported_controllers).toContain("okuma_osp");
      expect(stats.supported_controllers).toContain("fanuc");
      expect(stats.supported_controllers).toContain("generic_iso");
    });

    it("returns pipeline stages", () => {
      const stats = lathePrintToProgramOrchestratorEngine.getStatistics();

      expect(stats.pipeline_stages).toContain("ingest");
      expect(stats.pipeline_stages).toContain("recognition");
      expect(stats.pipeline_stages).toContain("planning");
      expect(stats.pipeline_stages).toContain("generation");
    });

    it("tracks pipeline count", async () => {
      const before = lathePrintToProgramOrchestratorEngine.getStatistics().total_pipelines;

      await lathePrintToProgramOrchestratorEngine.execute(getTestInput());

      const after = lathePrintToProgramOrchestratorEngine.getStatistics().total_pipelines;
      expect(after).toBe(before + 1);
    });
  });

  describe("Warnings and Errors", () => {
    it("collects warnings from all stages", async () => {
      const input = getTestInput();

      const result = await lathePrintToProgramOrchestratorEngine.execute(input);

      expect(Array.isArray(result.warnings)).toBe(true);
    });

    it("collects errors on failure", async () => {
      const input: PrintToProgramInput = {
        ...getTestInput(),
        blueprint: {
          source_type: "image",
          image_base64: "invalid"
        }
      };

      const result = await lathePrintToProgramOrchestratorEngine.execute(input);

      // Even with minimal input, should complete
      expect(Array.isArray(result.errors)).toBe(true);
    });
  });

  describe("End-to-End Integration", () => {
    it("generates complete program from blueprint", async () => {
      const input: PrintToProgramInput = {
        blueprint: {
          source_type: "pdf",
          part_type: "turning",
          part_number: "SHAFT-001",
          customer: "Acme Corp"
        },
        program_number: 2001,
        program_name: "ACME SHAFT",
        controller: "okuma_osp",
        machine_id: "LTH-01",
        include_comments: true
      };

      const result = await lathePrintToProgramOrchestratorEngine.execute(input);

      expect(result.success).toBe(true);
      expect(result.gcode).toContain("O2001");
      expect(result.gcode).toContain("ACME SHAFT");
      expect(result.gcode).toContain("SHAFT-001");
      expect(result.gcode).toContain("Acme Corp");
      expect(result.gcode).toContain("M30");
    });

    it("produces machine-ready code", async () => {
      const input = getTestInput();

      const result = await lathePrintToProgramOrchestratorEngine.execute(input);

      // Check for essential G-code elements
      expect(result.gcode).toMatch(/G\d+/); // G-codes
      expect(result.gcode).toMatch(/M\d+/); // M-codes
      expect(result.gcode).toMatch(/[XZ][\d.-]+/); // Axis moves
      expect(result.gcode).toMatch(/[FS]\d+/); // Feed and speed
    });
  });
});
