/**
 * LathePostGeneratorValidatorWiringEngine Tests — LATHE-MASTER U-LTH18
 *
 * Tests validator wiring, program validation, and configuration derivation.
 */

import { describe, it, expect } from "vitest";
import {
  LathePostGeneratorValidatorWiringEngine,
  ValidatorConfig,
  ValidatorCategory,
} from "../engines/LathePostGeneratorValidatorWiringEngine.js";
import { ControllerSpec } from "../engines/LathePostGeneratorSpecIngestEngine.js";

// ── Test Fixtures ───────────────────────────────────────────────────────────

const createFanucSpec = (): ControllerSpec => ({
  controller_id: "fanuc-31it",
  manufacturer: "Fanuc",
  model: "31i-T",
  axes: [
    { letter: "X", type: "linear", range_min: -50, range_max: 300 },
    { letter: "Z", type: "linear", range_min: -500, range_max: 100 },
    { letter: "C", type: "rotary", range_min: 0, range_max: 360 },
  ],
  dialect: {
    family: "fanuc",
    program_start: "O",
    program_end: "M30",
    comment_style: "parentheses",
    line_numbers: "optional",
    arc_format: "IJK",
    canned_cycle_format: "modal",
    decimal_point: "required",
  },
  canned_cycles: [
    { code: "G71", name: "Rough Turning Cycle" },
    { code: "G76", name: "Threading Cycle" },
  ],
  max_tool_offsets: 32,
  features: ["live_tooling", "c_axis"],
});

const createOkumaSpec = (): ControllerSpec => ({
  controller_id: "okuma-osp-p300l",
  manufacturer: "Okuma",
  model: "OSP-P300L",
  axes: [
    { letter: "X", type: "linear", range_min: 0, range_max: 400 },
    { letter: "Z", type: "linear", range_min: -600, range_max: 50 },
  ],
  dialect: {
    family: "okuma",
    program_start: "O",
    program_end: "M02",
    comment_style: "parentheses",
    line_numbers: "required",
    arc_format: "R",
    canned_cycle_format: "one_shot",
    decimal_point: "optional",
  },
  canned_cycles: [],
  max_tool_offsets: 64,
  features: [],
});

const validProgram = [
  "O0001",
  "(TEST PROGRAM)",
  "N10 G00 X100. Z10.",
  "N20 S200 M03",
  "N30 G01 Z-50. F0.2",
  "N40 G00 X200. Z100.",
  "M30",
];

const invalidSyntaxProgram = [
  "O0001",
  "G00 X100 @#$%",
  "M30",
];

const noEndProgram = [
  "O0001",
  "G00 X100. Z10.",
];

const noStartProgram = [
  "G00 X100. Z10.",
  "M30",
];

const modalConflictProgram = [
  "O0001",
  "G00 G01 X100.",
  "M30",
];

const highSpindleProgram = [
  "O0001",
  "S8000 M03",
  "G00 X100.",
  "M30",
];

const lowSpindleProgram = [
  "O0001",
  "S25 M03",
  "G00 X100.",
  "M30",
];

const highToolOffsetProgram = [
  "O0001",
  "T0199",
  "G00 X100.",
  "M30",
];

// ── wireValidators Tests ────────────────────────────────────────────────────

describe("LathePostGeneratorValidatorWiringEngine", () => {
  describe("wireValidators", () => {
    it("wires all 27 validators for Fanuc spec", () => {
      const result = LathePostGeneratorValidatorWiringEngine.wireValidators({
        controller_spec: createFanucSpec(),
        post_id: "fanuc-post-001",
      });

      expect(result.success).toBe(true);
      expect(result.post_id).toBe("fanuc-post-001");
      expect(result.wired_validators.length).toBe(27);
      expect(result.skipped_validators.length).toBe(0);
      expect(result.errors.length).toBe(0);
    });

    it("configures axis limits from ControllerSpec", () => {
      const result = LathePostGeneratorValidatorWiringEngine.wireValidators({
        controller_spec: createFanucSpec(),
        post_id: "fanuc-test",
      });

      const axisLimitsValidator = result.wired_validators.find(
        v => v.validator_id === "pp_kinematics_axis_limits"
      );

      expect(axisLimitsValidator).toBeDefined();
      expect(axisLimitsValidator!.config).toBeDefined();
      expect(axisLimitsValidator!.config!.x_min).toBe(-50);
      expect(axisLimitsValidator!.config!.x_max).toBe(300);
      expect(axisLimitsValidator!.config!.z_min).toBe(-500);
      expect(axisLimitsValidator!.config!.z_max).toBe(100);
    });

    it("configures line number requirement from dialect", () => {
      const okumaResult = LathePostGeneratorValidatorWiringEngine.wireValidators({
        controller_spec: createOkumaSpec(),
        post_id: "okuma-test",
      });

      const lineNumValidator = okumaResult.wired_validators.find(
        v => v.validator_id === "pp_syntax_line_number"
      );

      expect(lineNumValidator).toBeDefined();
      expect(lineNumValidator!.config!.require_line_numbers).toBe(true);

      const fanucResult = LathePostGeneratorValidatorWiringEngine.wireValidators({
        controller_spec: createFanucSpec(),
        post_id: "fanuc-test",
      });

      const fanucLineNum = fanucResult.wired_validators.find(
        v => v.validator_id === "pp_syntax_line_number"
      );
      expect(fanucLineNum!.config!.require_line_numbers).toBe(false);
    });

    it("configures tool offset limit from spec", () => {
      const result = LathePostGeneratorValidatorWiringEngine.wireValidators({
        controller_spec: createFanucSpec(),
        post_id: "fanuc-test",
      });

      const toolValidator = result.wired_validators.find(
        v => v.validator_id === "pp_tooling_offset"
      );

      expect(toolValidator).toBeDefined();
      expect(toolValidator!.config!.max_offset_number).toBe(32);
    });

    it("skips validators by category", () => {
      const result = LathePostGeneratorValidatorWiringEngine.wireValidators({
        controller_spec: createFanucSpec(),
        post_id: "fanuc-test",
        skip_categories: ["physics", "performance"],
      });

      expect(result.success).toBe(true);
      expect(result.skipped_validators).toContain("pp_physics_cutting_force");
      expect(result.skipped_validators).toContain("pp_physics_power");
      expect(result.skipped_validators).toContain("pp_physics_thermal");
      expect(result.skipped_validators).toContain("pp_physics_chip_load");

      const hasPhysics = result.wired_validators.some(v => v.category === "physics");
      expect(hasPhysics).toBe(false);
    });

    it("handles custom validators overriding built-in", () => {
      const customValidator: ValidatorConfig = {
        validator_id: "pp_safety_spindle",
        enabled: true,
        severity: "warning",
        category: "safety",
        config: { max_rpm: 10000, min_rpm: 100 },
      };

      const result = LathePostGeneratorValidatorWiringEngine.wireValidators({
        controller_spec: createFanucSpec(),
        post_id: "fanuc-test",
        custom_validators: [customValidator],
      });

      expect(result.success).toBe(true);
      expect(result.warnings).toContain("Custom validator pp_safety_spindle overrides built-in");

      const spindleValidator = result.wired_validators.find(
        v => v.validator_id === "pp_safety_spindle"
      );
      expect(spindleValidator!.config!.max_rpm).toBe(10000);
      expect(spindleValidator!.severity).toBe("warning");
    });

    it("adds custom validators without conflicts", () => {
      const customValidator: ValidatorConfig = {
        validator_id: "pp_custom_shop_rule",
        enabled: true,
        severity: "warning",
        category: "safety",
        config: { shop_id: "jm-die" },
      };

      const result = LathePostGeneratorValidatorWiringEngine.wireValidators({
        controller_spec: createFanucSpec(),
        post_id: "fanuc-test",
        custom_validators: [customValidator],
      });

      expect(result.success).toBe(true);
      expect(result.warnings.length).toBe(0);
      expect(result.wired_validators.length).toBe(28);

      const custom = result.wired_validators.find(v => v.validator_id === "pp_custom_shop_rule");
      expect(custom).toBeDefined();
    });

    it("configures program end from dialect", () => {
      const fanucResult = LathePostGeneratorValidatorWiringEngine.wireValidators({
        controller_spec: createFanucSpec(),
        post_id: "fanuc-test",
      });

      const fanucEnd = fanucResult.wired_validators.find(
        v => v.validator_id === "pp_structure_program_end"
      );
      expect(fanucEnd!.config!.end_code).toBe("M30");

      const okumaResult = LathePostGeneratorValidatorWiringEngine.wireValidators({
        controller_spec: createOkumaSpec(),
        post_id: "okuma-test",
      });

      const okumaEnd = okumaResult.wired_validators.find(
        v => v.validator_id === "pp_structure_program_end"
      );
      expect(okumaEnd!.config!.end_code).toBe("M02");
    });
  });

  // ── validateProgram Tests ─────────────────────────────────────────────────

  describe("validateProgram", () => {
    it("runs all 27 validators on valid program", () => {
      const wiring = LathePostGeneratorValidatorWiringEngine.wireValidators({
        controller_spec: createFanucSpec(),
        post_id: "fanuc-test",
      });

      const report = LathePostGeneratorValidatorWiringEngine.validateProgram(
        validProgram,
        wiring.wired_validators
      );

      expect(report.total_validators).toBe(27);
      expect(report.results.length).toBe(27);
      expect(report.execution_time_ms).toBeGreaterThanOrEqual(0);
      expect(report.passed + report.failed).toBe(27);
    });

    it("detects invalid G-code syntax", () => {
      const wiring = LathePostGeneratorValidatorWiringEngine.wireValidators({
        controller_spec: createFanucSpec(),
        post_id: "fanuc-test",
      });

      const report = LathePostGeneratorValidatorWiringEngine.validateProgram(
        invalidSyntaxProgram,
        wiring.wired_validators
      );

      expect(report.success).toBe(false);
      expect(report.errors).toBeGreaterThan(0);

      const syntaxResult = report.results.find(r => r.validator_id === "pp_syntax_gcode");
      expect(syntaxResult).toBeDefined();
      expect(syntaxResult!.passed).toBe(false);
      expect(syntaxResult!.line_number).toBeGreaterThan(0);
    });

    it("detects missing program end", () => {
      const wiring = LathePostGeneratorValidatorWiringEngine.wireValidators({
        controller_spec: createFanucSpec(),
        post_id: "fanuc-test",
      });

      const report = LathePostGeneratorValidatorWiringEngine.validateProgram(
        noEndProgram,
        wiring.wired_validators
      );

      const endResult = report.results.find(r => r.validator_id === "pp_structure_program_end");
      expect(endResult).toBeDefined();
      expect(endResult!.passed).toBe(false);
      expect(endResult!.message).toContain("M30");
    });

    it("detects missing program start when required", () => {
      const wiring = LathePostGeneratorValidatorWiringEngine.wireValidators({
        controller_spec: createFanucSpec(),
        post_id: "fanuc-test",
      });

      const report = LathePostGeneratorValidatorWiringEngine.validateProgram(
        noStartProgram,
        wiring.wired_validators
      );

      const startResult = report.results.find(r => r.validator_id === "pp_structure_program_start");
      expect(startResult).toBeDefined();
      expect(startResult!.passed).toBe(false);
    });

    it("detects modal group conflicts", () => {
      const wiring = LathePostGeneratorValidatorWiringEngine.wireValidators({
        controller_spec: createFanucSpec(),
        post_id: "fanuc-test",
      });

      const report = LathePostGeneratorValidatorWiringEngine.validateProgram(
        modalConflictProgram,
        wiring.wired_validators
      );

      const modalResult = report.results.find(r => r.validator_id === "pp_modal_group");
      expect(modalResult).toBeDefined();
      expect(modalResult!.passed).toBe(false);
      expect(modalResult!.message).toContain("G00");
      expect(modalResult!.message).toContain("G01");
    });

    it("detects spindle speed above max", () => {
      const wiring = LathePostGeneratorValidatorWiringEngine.wireValidators({
        controller_spec: createFanucSpec(),
        post_id: "fanuc-test",
      });

      const report = LathePostGeneratorValidatorWiringEngine.validateProgram(
        highSpindleProgram,
        wiring.wired_validators
      );

      const spindleResult = report.results.find(r => r.validator_id === "pp_safety_spindle");
      expect(spindleResult).toBeDefined();
      expect(spindleResult!.passed).toBe(false);
      expect(spindleResult!.message).toContain("8000");
      expect(spindleResult!.message).toContain("exceeds");
    });

    it("warns on spindle speed below min", () => {
      const wiring = LathePostGeneratorValidatorWiringEngine.wireValidators({
        controller_spec: createFanucSpec(),
        post_id: "fanuc-test",
      });

      const report = LathePostGeneratorValidatorWiringEngine.validateProgram(
        lowSpindleProgram,
        wiring.wired_validators
      );

      const spindleResult = report.results.find(r => r.validator_id === "pp_safety_spindle");
      expect(spindleResult).toBeDefined();
      expect(spindleResult!.passed).toBe(false);
      expect(spindleResult!.severity).toBe("warning");
    });

    it("detects tool offset exceeding max", () => {
      const wiring = LathePostGeneratorValidatorWiringEngine.wireValidators({
        controller_spec: createFanucSpec(),
        post_id: "fanuc-test",
      });

      const report = LathePostGeneratorValidatorWiringEngine.validateProgram(
        highToolOffsetProgram,
        wiring.wired_validators
      );

      const toolResult = report.results.find(r => r.validator_id === "pp_tooling_offset");
      expect(toolResult).toBeDefined();
      expect(toolResult!.passed).toBe(false);
      expect(toolResult!.message).toContain("99");
    });

    it("skips disabled validators", () => {
      const wiring = LathePostGeneratorValidatorWiringEngine.wireValidators({
        controller_spec: createFanucSpec(),
        post_id: "fanuc-test",
      });

      // Disable syntax validator
      const validators = wiring.wired_validators.map(v =>
        v.validator_id === "pp_syntax_gcode" ? { ...v, enabled: false } : v
      );

      const report = LathePostGeneratorValidatorWiringEngine.validateProgram(
        invalidSyntaxProgram,
        validators
      );

      expect(report.total_validators).toBe(26);
      const syntaxResult = report.results.find(r => r.validator_id === "pp_syntax_gcode");
      expect(syntaxResult).toBeUndefined();
    });

    it("handles empty program", () => {
      const wiring = LathePostGeneratorValidatorWiringEngine.wireValidators({
        controller_spec: createFanucSpec(),
        post_id: "fanuc-test",
      });

      const report = LathePostGeneratorValidatorWiringEngine.validateProgram(
        [],
        wiring.wired_validators
      );

      expect(report.success).toBe(false);
      const startResult = report.results.find(r => r.validator_id === "pp_structure_program_start");
      expect(startResult!.passed).toBe(false);
      expect(startResult!.message).toContain("No program content");
    });

    it("handles comments-only program", () => {
      const commentsOnly = [
        "(HEADER COMMENT)",
        "(ANOTHER COMMENT)",
      ];

      const wiring = LathePostGeneratorValidatorWiringEngine.wireValidators({
        controller_spec: createFanucSpec(),
        post_id: "fanuc-test",
      });

      const report = LathePostGeneratorValidatorWiringEngine.validateProgram(
        commentsOnly,
        wiring.wired_validators
      );

      expect(report.success).toBe(false);
    });

    it("calculates execution time", () => {
      const wiring = LathePostGeneratorValidatorWiringEngine.wireValidators({
        controller_spec: createFanucSpec(),
        post_id: "fanuc-test",
      });

      const report = LathePostGeneratorValidatorWiringEngine.validateProgram(
        validProgram,
        wiring.wired_validators
      );

      expect(report.execution_time_ms).toBeGreaterThanOrEqual(0);
      expect(typeof report.execution_time_ms).toBe("number");
    });
  });

  // ── Static Method Tests ───────────────────────────────────────────────────

  describe("listValidators", () => {
    it("returns all 27 validators", () => {
      const validators = LathePostGeneratorValidatorWiringEngine.listValidators();
      expect(validators.length).toBe(27);
    });

    it("returns defensive copy", () => {
      const validators1 = LathePostGeneratorValidatorWiringEngine.listValidators();
      const validators2 = LathePostGeneratorValidatorWiringEngine.listValidators();
      expect(validators1).not.toBe(validators2);
    });

    it("includes all validator properties", () => {
      const validators = LathePostGeneratorValidatorWiringEngine.listValidators();
      for (const v of validators) {
        expect(v.id).toBeDefined();
        expect(v.name).toBeDefined();
        expect(v.category).toBeDefined();
        expect(v.defaultSeverity).toBeDefined();
        expect(v.description).toBeDefined();
        expect(v.dialects).toBeDefined();
        expect(v.configurable).toBeDefined();
      }
    });
  });

  describe("getValidatorsByCategory", () => {
    it("returns 5 syntax validators", () => {
      const validators = LathePostGeneratorValidatorWiringEngine.getValidatorsByCategory("syntax");
      expect(validators.length).toBe(5);
      expect(validators.every(v => v.category === "syntax")).toBe(true);
    });

    it("returns 4 safety validators", () => {
      const validators = LathePostGeneratorValidatorWiringEngine.getValidatorsByCategory("safety");
      expect(validators.length).toBe(4);
    });

    it("returns 1 coolant validator", () => {
      const validators = LathePostGeneratorValidatorWiringEngine.getValidatorsByCategory("coolant");
      expect(validators.length).toBe(1);
    });

    it("returns 4 physics validators", () => {
      const validators = LathePostGeneratorValidatorWiringEngine.getValidatorsByCategory("physics");
      expect(validators.length).toBe(4);
    });

    it("returns 4 kinematics validators", () => {
      const validators = LathePostGeneratorValidatorWiringEngine.getValidatorsByCategory("kinematics");
      expect(validators.length).toBe(4);
    });

    it("returns 3 tooling validators", () => {
      const validators = LathePostGeneratorValidatorWiringEngine.getValidatorsByCategory("tooling");
      expect(validators.length).toBe(3);
    });

    it("returns 3 program_structure validators", () => {
      const validators = LathePostGeneratorValidatorWiringEngine.getValidatorsByCategory("program_structure");
      expect(validators.length).toBe(3);
    });

    it("returns 3 modal_state validators", () => {
      const validators = LathePostGeneratorValidatorWiringEngine.getValidatorsByCategory("modal_state");
      expect(validators.length).toBe(3);
    });

    it("returns empty array for unused category", () => {
      const validators = LathePostGeneratorValidatorWiringEngine.getValidatorsByCategory("dimension");
      expect(validators.length).toBe(0);
    });
  });

  describe("getValidatorCount", () => {
    it("returns 27", () => {
      expect(LathePostGeneratorValidatorWiringEngine.getValidatorCount()).toBe(27);
    });
  });

  describe("getVersion", () => {
    it("returns version string", () => {
      const version = LathePostGeneratorValidatorWiringEngine.getVersion();
      expect(version).toBe("1.0.0");
      expect(typeof version).toBe("string");
    });
  });

  // ── Edge Cases ────────────────────────────────────────────────────────────

  describe("edge cases", () => {
    it("handles program with only whitespace lines", () => {
      const whitespaceProgram = ["   ", "\t", "  \n  "];

      const wiring = LathePostGeneratorValidatorWiringEngine.wireValidators({
        controller_spec: createFanucSpec(),
        post_id: "fanuc-test",
      });

      const report = LathePostGeneratorValidatorWiringEngine.validateProgram(
        whitespaceProgram,
        wiring.wired_validators
      );

      expect(report.success).toBe(false);
    });

    it("handles mixed valid and invalid lines", () => {
      const mixedProgram = [
        "O0001",
        "G00 X100. Z10.",
        "INVALID_LINE @#$",
        "G01 X50. Z-25.",
        "M30",
      ];

      const wiring = LathePostGeneratorValidatorWiringEngine.wireValidators({
        controller_spec: createFanucSpec(),
        post_id: "fanuc-test",
      });

      const report = LathePostGeneratorValidatorWiringEngine.validateProgram(
        mixedProgram,
        wiring.wired_validators
      );

      const syntaxResult = report.results.find(r => r.validator_id === "pp_syntax_gcode");
      expect(syntaxResult!.passed).toBe(false);
      expect(syntaxResult!.line_number).toBeGreaterThan(0);
    });

    it("handles spec with no axes defined", () => {
      const minimalSpec: ControllerSpec = {
        controller_id: "minimal",
        manufacturer: "Test",
        model: "Test",
        axes: [],
        dialect: {
          family: "fanuc",
          program_start: "O",
          program_end: "M30",
          comment_style: "parentheses",
          line_numbers: "optional",
          arc_format: "IJK",
          canned_cycle_format: "modal",
          decimal_point: "required",
        },
        canned_cycles: [],
        features: [],
      };

      const result = LathePostGeneratorValidatorWiringEngine.wireValidators({
        controller_spec: minimalSpec,
        post_id: "minimal-test",
      });

      expect(result.success).toBe(true);

      const axisValidator = result.wired_validators.find(
        v => v.validator_id === "pp_kinematics_axis_limits"
      );
      expect(axisValidator!.config).toBeUndefined();
    });

    it("handles S0 spindle command (spindle stop)", () => {
      const spindleStopProgram = [
        "O0001",
        "S0 M05",
        "M30",
      ];

      const wiring = LathePostGeneratorValidatorWiringEngine.wireValidators({
        controller_spec: createFanucSpec(),
        post_id: "fanuc-test",
      });

      const report = LathePostGeneratorValidatorWiringEngine.validateProgram(
        spindleStopProgram,
        wiring.wired_validators
      );

      const spindleResult = report.results.find(r => r.validator_id === "pp_safety_spindle");
      expect(spindleResult!.passed).toBe(true);
    });

    it("validates program with macro variable assignments", () => {
      const macroProgram = [
        "O0001",
        "#100=50.0",
        "#101=100.0",
        "M30",
      ];

      const wiring = LathePostGeneratorValidatorWiringEngine.wireValidators({
        controller_spec: createFanucSpec(),
        post_id: "fanuc-test",
      });

      const report = LathePostGeneratorValidatorWiringEngine.validateProgram(
        macroProgram,
        wiring.wired_validators
      );

      expect(report.total_validators).toBe(27);
      const syntaxResult = report.results.find(r => r.validator_id === "pp_syntax_gcode");
      expect(syntaxResult).toBeDefined();
    });

    it("validates program with block delete marker", () => {
      const blockDeleteProgram = [
        "O0001",
        "/ G00 X100.",
        "G01 Z-50. F0.2",
        "M30",
      ];

      const wiring = LathePostGeneratorValidatorWiringEngine.wireValidators({
        controller_spec: createFanucSpec(),
        post_id: "fanuc-test",
      });

      const report = LathePostGeneratorValidatorWiringEngine.validateProgram(
        blockDeleteProgram,
        wiring.wired_validators
      );

      expect(report.total_validators).toBe(27);
      const structureResult = report.results.find(r => r.validator_id === "pp_structure_program_end");
      expect(structureResult!.passed).toBe(true);
    });

    it("handles O-number program start formats", () => {
      const oNumberProgram = [
        "O1234",
        "G00 X100.",
        "M30",
      ];

      const wiring = LathePostGeneratorValidatorWiringEngine.wireValidators({
        controller_spec: createFanucSpec(),
        post_id: "fanuc-test",
      });

      const report = LathePostGeneratorValidatorWiringEngine.validateProgram(
        oNumberProgram,
        wiring.wired_validators
      );

      const startResult = report.results.find(r => r.validator_id === "pp_structure_program_start");
      expect(startResult!.passed).toBe(true);
    });

    it("handles M99 as valid program end (subprogram)", () => {
      const subprogramEnd = [
        "O9001",
        "G00 X100.",
        "M99",
      ];

      const wiring = LathePostGeneratorValidatorWiringEngine.wireValidators({
        controller_spec: createFanucSpec(),
        post_id: "fanuc-test",
      });

      const report = LathePostGeneratorValidatorWiringEngine.validateProgram(
        subprogramEnd,
        wiring.wired_validators
      );

      const endResult = report.results.find(r => r.validator_id === "pp_structure_program_end");
      expect(endResult!.passed).toBe(true);
    });
  });
});
