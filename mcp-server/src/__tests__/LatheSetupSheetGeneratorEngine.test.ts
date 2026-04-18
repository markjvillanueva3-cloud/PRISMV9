/**
 * LatheSetupSheetGeneratorEngine Tests
 *
 * U-LTH39: Setup sheet generation tests
 */

import { describe, it, expect } from "vitest";
import {
  latheSetupSheetGeneratorEngine,
  type SetupSheet,
} from "../engines/LatheSetupSheetGeneratorEngine.js";
import { lathePrintToProgramOrchestratorEngine } from "../engines/LathePrintToProgramOrchestratorEngine.js";

describe("LatheSetupSheetGeneratorEngine", () => {
  const getTestData = async () => {
    const result = await lathePrintToProgramOrchestratorEngine.execute({
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

    return {
      program: result.program!,
      plan: result.stages.planning.data!,
      recognition: result.stages.recognition.data!,
      intake: result.stages.ingest.data!
    };
  };

  describe("generate()", () => {
    it("generates setup sheet from pipeline data", async () => {
      const { program, plan, recognition, intake } = await getTestData();

      const sheet = latheSetupSheetGeneratorEngine.generate(
        program, plan, recognition, intake
      );

      expect(sheet.sheet_id).toMatch(/^setup_\d+_\d+$/);
      expect(sheet.generated_at).toBeDefined();
      expect(sheet.processing_time_ms).toBeGreaterThanOrEqual(0);
    });

    it("includes header information", async () => {
      const { program, plan, recognition, intake } = await getTestData();

      const sheet = latheSetupSheetGeneratorEngine.generate(
        program, plan, recognition, intake
      );

      expect(sheet.header.program_number).toBe(1001);
      expect(sheet.header.program_name).toBe("TEST PART");
      expect(sheet.header.part_number).toBe("TEST-001");
    });

    it("includes stock specification", async () => {
      const { program, plan, recognition, intake } = await getTestData();

      const sheet = latheSetupSheetGeneratorEngine.generate(
        program, plan, recognition, intake
      );

      expect(sheet.stock.material).toBeDefined();
      expect(sheet.stock.diameter_mm).toBeGreaterThan(0);
      expect(sheet.stock.length_mm).toBeGreaterThan(0);
      expect(sheet.stock.form).toBe("round_bar");
    });

    it("includes work holding setup", async () => {
      const { program, plan, recognition, intake } = await getTestData();

      const sheet = latheSetupSheetGeneratorEngine.generate(
        program, plan, recognition, intake
      );

      expect(sheet.work_holding.type).toBeDefined();
      expect(sheet.work_holding.grip_diameter_mm).toBeGreaterThan(0);
      expect(sheet.work_holding.stick_out_mm).toBeGreaterThan(0);
      expect(typeof sheet.work_holding.tailstock_required).toBe("boolean");
    });
  });

  describe("Tool List", () => {
    it("generates tool list entries", async () => {
      const { program, plan, recognition, intake } = await getTestData();

      const sheet = latheSetupSheetGeneratorEngine.generate(
        program, plan, recognition, intake
      );

      expect(sheet.tool_list.length).toBeGreaterThan(0);
    });

    it("includes tool number and description", async () => {
      const { program, plan, recognition, intake } = await getTestData();

      const sheet = latheSetupSheetGeneratorEngine.generate(
        program, plan, recognition, intake
      );

      for (const tool of sheet.tool_list) {
        expect(tool.tool_number).toBeGreaterThan(0);
        expect(tool.description.length).toBeGreaterThan(0);
        expect(tool.offset_number).toBe(tool.tool_number);
      }
    });

    it("includes insert specifications", async () => {
      const { program, plan, recognition, intake } = await getTestData();

      const sheet = latheSetupSheetGeneratorEngine.generate(
        program, plan, recognition, intake
      );

      // At least some tools should have insert specs
      const toolsWithInserts = sheet.tool_list.filter(t => t.insert_spec);
      expect(toolsWithInserts.length).toBeGreaterThan(0);
    });
  });

  describe("Setup Steps", () => {
    it("generates setup steps", async () => {
      const { program, plan, recognition, intake } = await getTestData();

      const sheet = latheSetupSheetGeneratorEngine.generate(
        program, plan, recognition, intake
      );

      expect(sheet.setup_steps.length).toBeGreaterThan(0);
    });

    it("numbers steps sequentially", async () => {
      const { program, plan, recognition, intake } = await getTestData();

      const sheet = latheSetupSheetGeneratorEngine.generate(
        program, plan, recognition, intake
      );

      for (let i = 0; i < sheet.setup_steps.length; i++) {
        expect(sheet.setup_steps[i].step_number).toBe(i + 1);
      }
    });

    it("marks critical steps", async () => {
      const { program, plan, recognition, intake } = await getTestData();

      const sheet = latheSetupSheetGeneratorEngine.generate(
        program, plan, recognition, intake
      );

      const criticalSteps = sheet.setup_steps.filter(s => s.critical);
      expect(criticalSteps.length).toBeGreaterThan(0);
    });

    it("includes safety step first", async () => {
      const { program, plan, recognition, intake } = await getTestData();

      const sheet = latheSetupSheetGeneratorEngine.generate(
        program, plan, recognition, intake
      );

      expect(sheet.setup_steps[0].category).toBe("safety");
    });

    it("categorizes steps appropriately", async () => {
      const { program, plan, recognition, intake } = await getTestData();

      const sheet = latheSetupSheetGeneratorEngine.generate(
        program, plan, recognition, intake
      );

      const categories = sheet.setup_steps.map(s => s.category);
      expect(categories).toContain("work_holding");
      expect(categories).toContain("tool_setup");
      expect(categories).toContain("program");
    });
  });

  describe("Cycle Info", () => {
    it("includes estimated cycle time", async () => {
      const { program, plan, recognition, intake } = await getTestData();

      const sheet = latheSetupSheetGeneratorEngine.generate(
        program, plan, recognition, intake
      );

      expect(sheet.cycle_info.estimated_cycle_time_sec).toBeGreaterThan(0);
    });

    it("includes tool change count", async () => {
      const { program, plan, recognition, intake } = await getTestData();

      const sheet = latheSetupSheetGeneratorEngine.generate(
        program, plan, recognition, intake
      );

      expect(sheet.cycle_info.tool_changes).toBeGreaterThan(0);
    });
  });

  describe("Safety Notes", () => {
    it("includes safety notes by default", async () => {
      const { program, plan, recognition, intake } = await getTestData();

      const sheet = latheSetupSheetGeneratorEngine.generate(
        program, plan, recognition, intake
      );

      expect(sheet.safety_notes.length).toBeGreaterThan(0);
    });

    it("can exclude safety notes", async () => {
      const { program, plan, recognition, intake } = await getTestData();

      const sheet = latheSetupSheetGeneratorEngine.generate(
        program, plan, recognition, intake,
        { include_safety: false }
      );

      expect(sheet.safety_notes.length).toBe(0);
    });

    it("includes threading safety note when applicable", async () => {
      const { program, plan, recognition, intake } = await getTestData();

      const sheet = latheSetupSheetGeneratorEngine.generate(
        program, plan, recognition, intake
      );

      if (recognition.summary.has_threading) {
        const hasThreadingNote = sheet.safety_notes.some(n =>
          n.toLowerCase().includes("thread")
        );
        expect(hasThreadingNote).toBe(true);
      }
    });
  });

  describe("Quality Checks", () => {
    it("includes quality checks by default", async () => {
      const { program, plan, recognition, intake } = await getTestData();

      const sheet = latheSetupSheetGeneratorEngine.generate(
        program, plan, recognition, intake
      );

      expect(sheet.quality_checks.length).toBeGreaterThan(0);
    });

    it("can exclude quality checks", async () => {
      const { program, plan, recognition, intake } = await getTestData();

      const sheet = latheSetupSheetGeneratorEngine.generate(
        program, plan, recognition, intake,
        { include_quality: false }
      );

      expect(sheet.quality_checks.length).toBe(0);
    });

    it("includes check frequency", async () => {
      const { program, plan, recognition, intake } = await getTestData();

      const sheet = latheSetupSheetGeneratorEngine.generate(
        program, plan, recognition, intake
      );

      for (const check of sheet.quality_checks) {
        expect(check.frequency.length).toBeGreaterThan(0);
      }
    });
  });

  describe("Formatted Output", () => {
    it("generates formatted text", async () => {
      const { program, plan, recognition, intake } = await getTestData();

      const sheet = latheSetupSheetGeneratorEngine.generate(
        program, plan, recognition, intake
      );

      expect(sheet.formatted_text.length).toBeGreaterThan(0);
      expect(sheet.formatted_text).toContain("SETUP SHEET");
      expect(sheet.formatted_text).toContain("O1001");
    });

    it("includes stock info in text output", async () => {
      const { program, plan, recognition, intake } = await getTestData();

      const sheet = latheSetupSheetGeneratorEngine.generate(
        program, plan, recognition, intake
      );

      expect(sheet.formatted_text).toContain("STOCK");
      expect(sheet.formatted_text).toContain("Material");
    });

    it("includes tool list in text output", async () => {
      const { program, plan, recognition, intake } = await getTestData();

      const sheet = latheSetupSheetGeneratorEngine.generate(
        program, plan, recognition, intake
      );

      expect(sheet.formatted_text).toContain("TOOL LIST");
    });

    it("generates HTML when requested", async () => {
      const { program, plan, recognition, intake } = await getTestData();

      const sheet = latheSetupSheetGeneratorEngine.generate(
        program, plan, recognition, intake,
        { include_html: true }
      );

      expect(sheet.formatted_html).toBeDefined();
      expect(sheet.formatted_html).toContain("<!DOCTYPE html>");
      expect(sheet.formatted_html).toContain("Setup Sheet");
    });

    it("omits HTML by default", async () => {
      const { program, plan, recognition, intake } = await getTestData();

      const sheet = latheSetupSheetGeneratorEngine.generate(
        program, plan, recognition, intake
      );

      expect(sheet.formatted_html).toBeUndefined();
    });
  });

  describe("Configuration", () => {
    it("accepts operator name", async () => {
      const { program, plan, recognition, intake } = await getTestData();

      const sheet = latheSetupSheetGeneratorEngine.generate(
        program, plan, recognition, intake,
        { operator_name: "John Operator" }
      );

      expect(sheet.header.created_by).toBe("John Operator");
    });

    it("accepts machine ID override", async () => {
      const { program, plan, recognition, intake } = await getTestData();

      const sheet = latheSetupSheetGeneratorEngine.generate(
        program, plan, recognition, intake,
        { machine_id: "CUSTOM-LATHE" }
      );

      expect(sheet.header.machine_id).toBe("CUSTOM-LATHE");
    });
  });

  describe("getStatistics()", () => {
    it("returns supported work holding types", () => {
      const stats = latheSetupSheetGeneratorEngine.getStatistics();

      expect(stats.supported_work_holding).toContain("chuck_3jaw");
      expect(stats.supported_work_holding).toContain("collet");
    });

    it("returns supported stock forms", () => {
      const stats = latheSetupSheetGeneratorEngine.getStatistics();

      expect(stats.supported_stock_forms).toContain("round_bar");
      expect(stats.supported_stock_forms).toContain("forging");
    });

    it("tracks sheet count", async () => {
      const before = latheSetupSheetGeneratorEngine.getStatistics().total_sheets;

      const { program, plan, recognition, intake } = await getTestData();
      latheSetupSheetGeneratorEngine.generate(program, plan, recognition, intake);

      const after = latheSetupSheetGeneratorEngine.getStatistics().total_sheets;
      expect(after).toBe(before + 1);
    });
  });
});
