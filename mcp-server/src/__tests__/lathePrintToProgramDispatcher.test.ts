/**
 * lathePrintToProgramDispatcher Tests
 *
 * U-LTH40: Dispatcher for Print-to-Program Pipeline
 */

import { describe, it, expect } from "vitest";
import {
  dispatchLathePrintToProgram,
  LathePrintToProgramAction,
  LATHE_PRINT_TO_PROGRAM_DISPATCHER_ACTIONS,
} from "../dispatchers/lathePrintToProgramDispatcher.js";

describe("lathePrintToProgramDispatcher", () => {
  const testBlueprint = {
    source_type: "pdf" as const,
    part_type: "turning" as const,
    part_number: "DISP-001",
    customer: "Test Corp",
  };

  describe("Action Enum", () => {
    it("defines all 7 actions", () => {
      const actions = LathePrintToProgramAction.options;
      expect(actions).toContain("print_full");
      expect(actions).toContain("print_ingest");
      expect(actions).toContain("print_recognize");
      expect(actions).toContain("print_plan");
      expect(actions).toContain("print_generate");
      expect(actions).toContain("print_verify");
      expect(actions).toContain("print_setup");
      expect(actions.length).toBe(7);
    });
  });

  describe("Action Definitions", () => {
    it("exports action definitions for all actions", () => {
      expect(LATHE_PRINT_TO_PROGRAM_DISPATCHER_ACTIONS.print_full).toBeDefined();
      expect(LATHE_PRINT_TO_PROGRAM_DISPATCHER_ACTIONS.print_ingest).toBeDefined();
      expect(LATHE_PRINT_TO_PROGRAM_DISPATCHER_ACTIONS.print_recognize).toBeDefined();
      expect(LATHE_PRINT_TO_PROGRAM_DISPATCHER_ACTIONS.print_plan).toBeDefined();
      expect(LATHE_PRINT_TO_PROGRAM_DISPATCHER_ACTIONS.print_generate).toBeDefined();
      expect(LATHE_PRINT_TO_PROGRAM_DISPATCHER_ACTIONS.print_verify).toBeDefined();
      expect(LATHE_PRINT_TO_PROGRAM_DISPATCHER_ACTIONS.print_setup).toBeDefined();
    });

    it("each action has description and schema", () => {
      for (const [name, def] of Object.entries(LATHE_PRINT_TO_PROGRAM_DISPATCHER_ACTIONS)) {
        expect(def.description).toBeDefined();
        expect(def.description.length).toBeGreaterThan(0);
        expect(def.schema).toBeDefined();
      }
    });
  });

  describe("print_full", () => {
    it("executes full pipeline successfully", async () => {
      const result = await dispatchLathePrintToProgram("print_full", {
        blueprint: testBlueprint,
        program_number: 5001,
        program_name: "FULL PIPELINE TEST",
        controller: "okuma_osp",
        machine_id: "LTH-DISP-01",
      });

      expect(result.success).toBe(true);
      expect(result.action).toBe("print_full");
      expect(result.execution_time_ms).toBeGreaterThanOrEqual(0);
      expect(result.data).toBeDefined();
    });

    it("includes G-code in full pipeline result", async () => {
      const result = await dispatchLathePrintToProgram("print_full", {
        blueprint: testBlueprint,
        program_number: 5002,
        program_name: "GCODE TEST",
        controller: "fanuc",
      });

      expect(result.success).toBe(true);
      const data = result.data as { gcode?: string };
      expect(data.gcode).toBeDefined();
      expect(data.gcode).toContain("O5002");
    });

    it("includes verification when requested", async () => {
      const result = await dispatchLathePrintToProgram("print_full", {
        blueprint: testBlueprint,
        program_number: 5003,
        program_name: "VERIFY TEST",
        include_verification: true,
      });

      expect(result.success).toBe(true);
      const data = result.data as { verification?: unknown };
      expect(data.verification).toBeDefined();
    });

    it("includes setup sheet when requested", async () => {
      const result = await dispatchLathePrintToProgram("print_full", {
        blueprint: testBlueprint,
        program_number: 5004,
        program_name: "SETUP TEST",
        include_setup_sheet: true,
      });

      expect(result.success).toBe(true);
      const data = result.data as { setup_sheet?: unknown };
      expect(data.setup_sheet).toBeDefined();
    });
  });

  describe("print_ingest", () => {
    it("ingests blueprint successfully", async () => {
      const result = await dispatchLathePrintToProgram("print_ingest", {
        source_type: "pdf",
        part_type: "turning",
        part_number: "INGEST-001",
      });

      expect(result.success).toBe(true);
      expect(result.action).toBe("print_ingest");
      expect(result.data).toBeDefined();
    });

    it("returns intake_id and dimensions", async () => {
      const result = await dispatchLathePrintToProgram("print_ingest", {
        source_type: "pdf",
        part_type: "turning",
      });

      expect(result.success).toBe(true);
      const data = result.data as { intake_id?: string; dimensions?: unknown[] };
      expect(data.intake_id).toMatch(/^intake_\d+_\d+$/);
      expect(data.dimensions).toBeDefined();
    });

    it("accepts image source type", async () => {
      const result = await dispatchLathePrintToProgram("print_ingest", {
        source_type: "image",
        part_type: "turning",
      });

      expect(result.success).toBe(true);
    });
  });

  describe("print_recognize", () => {
    it("recognizes features from blueprint", async () => {
      const result = await dispatchLathePrintToProgram("print_recognize", {
        blueprint: testBlueprint,
      });

      expect(result.success).toBe(true);
      expect(result.action).toBe("print_recognize");
      expect(result.data).toBeDefined();
    });

    it("returns recognition_id and feature_tree", async () => {
      const result = await dispatchLathePrintToProgram("print_recognize", {
        blueprint: testBlueprint,
      });

      expect(result.success).toBe(true);
      const data = result.data as { recognition_id?: string; feature_tree?: unknown };
      expect(data.recognition_id).toMatch(/^recog_\d+_\d+$/);
      expect(data.feature_tree).toBeDefined();
    });

    it("fails without blueprint", async () => {
      const result = await dispatchLathePrintToProgram("print_recognize", {});

      expect(result.success).toBe(false);
      expect(result.error).toContain("blueprint is required");
    });
  });

  describe("print_plan", () => {
    it("plans toolpaths from blueprint", async () => {
      const result = await dispatchLathePrintToProgram("print_plan", {
        blueprint: testBlueprint,
      });

      expect(result.success).toBe(true);
      expect(result.action).toBe("print_plan");
      expect(result.data).toBeDefined();
    });

    it("returns plan_id and segments", async () => {
      const result = await dispatchLathePrintToProgram("print_plan", {
        blueprint: testBlueprint,
      });

      expect(result.success).toBe(true);
      const data = result.data as { plan_id?: string; segments?: unknown[] };
      expect(data.plan_id).toMatch(/^plan_\d+_\d+$/);
      expect(data.segments).toBeDefined();
    });

    it("accepts planning config", async () => {
      const result = await dispatchLathePrintToProgram("print_plan", {
        blueprint: testBlueprint,
        config: {
          max_depth_of_cut_mm: 2.5,
          finishing_allowance_mm: 0.15,
        },
      });

      expect(result.success).toBe(true);
    });

    it("fails without blueprint", async () => {
      const result = await dispatchLathePrintToProgram("print_plan", {});

      expect(result.success).toBe(false);
      expect(result.error).toContain("blueprint is required");
    });
  });

  describe("print_generate", () => {
    it("generates G-code from blueprint", async () => {
      const result = await dispatchLathePrintToProgram("print_generate", {
        blueprint: testBlueprint,
        program_number: 6001,
        program_name: "GEN TEST",
      });

      expect(result.success).toBe(true);
      expect(result.action).toBe("print_generate");
      expect(result.data).toBeDefined();
    });

    it("returns program with G-code", async () => {
      const result = await dispatchLathePrintToProgram("print_generate", {
        blueprint: testBlueprint,
        program_number: 6002,
        program_name: "GEN GCODE",
        controller: "okuma_osp",
      });

      expect(result.success).toBe(true);
      const data = result.data as { gcode?: string };
      expect(data.gcode).toBeDefined();
      expect(data.gcode).toContain("O6002");
    });

    it("supports different controllers", async () => {
      const controllers = ["okuma_osp", "fanuc", "generic_iso"] as const;

      for (const controller of controllers) {
        const result = await dispatchLathePrintToProgram("print_generate", {
          blueprint: testBlueprint,
          program_number: 6010,
          program_name: "CTRL TEST",
          controller,
        });

        expect(result.success).toBe(true);
      }
    });

    it("includes line numbers when requested", async () => {
      const result = await dispatchLathePrintToProgram("print_generate", {
        blueprint: testBlueprint,
        program_number: 6003,
        program_name: "LINE NUM",
        include_line_numbers: true,
      });

      expect(result.success).toBe(true);
      const data = result.data as { gcode?: string };
      expect(data.gcode).toMatch(/N\d+/);
    });

    it("fails without blueprint", async () => {
      const result = await dispatchLathePrintToProgram("print_generate", {
        program_number: 6004,
        program_name: "NO BLUEPRINT",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("blueprint is required");
    });
  });

  describe("print_verify", () => {
    it("verifies valid G-code", async () => {
      const gcode = `O7001 (VERIFY TEST)
G28 U0 W0
G50 S2500
T0101
G96 S200 M03
G00 X52.0 Z2.0
G01 Z0.0 F0.2
X50.0 F0.15
G00 X100.0 Z50.0
M30`;

      const result = await dispatchLathePrintToProgram("print_verify", {
        gcode,
      });

      expect(result.success).toBe(true);
      expect(result.action).toBe("print_verify");
      expect(result.data).toBeDefined();
    });

    it("returns verification result", async () => {
      const gcode = `O7002
G28 U0 W0
M30`;

      const result = await dispatchLathePrintToProgram("print_verify", {
        gcode,
      });

      expect(result.success).toBe(true);
      const data = result.data as { passed?: boolean };
      expect(typeof data.passed).toBe("boolean");
    });

    it("accepts machine limits", async () => {
      const gcode = `O7003
G00 X100.0 Z100.0
M30`;

      const result = await dispatchLathePrintToProgram("print_verify", {
        gcode,
        limits: {
          x_max_mm: 200,
          z_max_mm: 300,
          spindle_max_rpm: 4000,
        },
      });

      expect(result.success).toBe(true);
    });

    it("detects issues in invalid G-code", async () => {
      const gcode = `O7004
G00 X9999.0
S99999 M03
M30`;

      const result = await dispatchLathePrintToProgram("print_verify", {
        gcode,
        limits: {
          x_max_mm: 300,
          spindle_max_rpm: 5000,
        },
      });

      expect(result.success).toBe(true);
      const data = result.data as { issues?: unknown[] };
      expect(data.issues).toBeDefined();
      expect(data.issues!.length).toBeGreaterThan(0);
    });
  });

  describe("print_setup", () => {
    it("generates setup sheet", async () => {
      const result = await dispatchLathePrintToProgram("print_setup", {
        blueprint: testBlueprint,
        program_number: 8001,
        program_name: "SETUP TEST",
      });

      expect(result.success).toBe(true);
      expect(result.action).toBe("print_setup");
      expect(result.data).toBeDefined();
    });

    it("returns sheet with tool list", async () => {
      const result = await dispatchLathePrintToProgram("print_setup", {
        blueprint: testBlueprint,
        program_number: 8002,
        program_name: "TOOL LIST",
      });

      expect(result.success).toBe(true);
      const data = result.data as { tool_list?: unknown[] };
      expect(data.tool_list).toBeDefined();
      expect(data.tool_list!.length).toBeGreaterThan(0);
    });

    it("accepts operator name", async () => {
      const result = await dispatchLathePrintToProgram("print_setup", {
        blueprint: testBlueprint,
        program_number: 8003,
        program_name: "OPERATOR",
        operator_name: "John Smith",
      });

      expect(result.success).toBe(true);
      const data = result.data as { header?: { created_by?: string } };
      expect(data.header?.created_by).toBe("John Smith");
    });

    it("includes HTML when requested", async () => {
      const result = await dispatchLathePrintToProgram("print_setup", {
        blueprint: testBlueprint,
        program_number: 8004,
        program_name: "HTML TEST",
        include_html: true,
      });

      expect(result.success).toBe(true);
      const data = result.data as { formatted_html?: string };
      expect(data.formatted_html).toBeDefined();
      expect(data.formatted_html).toContain("<!DOCTYPE html>");
    });

    it("can exclude safety notes", async () => {
      const result = await dispatchLathePrintToProgram("print_setup", {
        blueprint: testBlueprint,
        program_number: 8005,
        program_name: "NO SAFETY",
        include_safety: false,
      });

      expect(result.success).toBe(true);
      const data = result.data as { safety_notes?: unknown[] };
      expect(data.safety_notes?.length).toBe(0);
    });

    it("can exclude quality checks", async () => {
      const result = await dispatchLathePrintToProgram("print_setup", {
        blueprint: testBlueprint,
        program_number: 8006,
        program_name: "NO QC",
        include_quality: false,
      });

      expect(result.success).toBe(true);
      const data = result.data as { quality_checks?: unknown[] };
      expect(data.quality_checks?.length).toBe(0);
    });
  });

  describe("Error Handling", () => {
    it("returns error for unknown action", async () => {
      const result = await dispatchLathePrintToProgram(
        "unknown_action" as any,
        {}
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Unknown action");
    });

    it("returns error for invalid schema", async () => {
      const result = await dispatchLathePrintToProgram("print_full", {
        blueprint: { source_type: "invalid" },
        program_number: "not a number",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("includes execution time even on error", async () => {
      const result = await dispatchLathePrintToProgram("print_recognize", {});

      expect(result.success).toBe(false);
      expect(result.execution_time_ms).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Result Structure", () => {
    it("always returns required fields", async () => {
      const result = await dispatchLathePrintToProgram("print_ingest", {
        source_type: "pdf",
      });

      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("action");
      expect(result).toHaveProperty("execution_time_ms");
    });

    it("success result has data, no error", async () => {
      const result = await dispatchLathePrintToProgram("print_ingest", {
        source_type: "pdf",
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.error).toBeUndefined();
    });

    it("failure result has error, no data", async () => {
      const result = await dispatchLathePrintToProgram("print_recognize", {});

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.data).toBeUndefined();
    });
  });
});
