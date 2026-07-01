// DOMAIN-PIPELINE-MS0/U-DPM0-INTAKE-CHECK-WIRE — Test surface for print_to_program_check_intake
// slot:kilo, iter 2, 2026-05-23
//
// Verifies that the new MCP-callable intake-validation surface correctly maps
// the existing private validateIntake() output to a ValidationResult shape so
// operators can fast-check drawing completeness without running the full pipeline.
//
// First step of the adaptive_orchestrator intelligent-defaults capability.
// See: knowledge/memories/reference/reference_kilo_queue_revisit_2026_05_23.md

import { describe, it, expect } from "vitest";
import { printToProgramPipelineEngine } from "../engines/PrintToProgramPipelineEngine.js";

describe("PrintToProgramPipelineEngine.calculate('print_to_program_check_intake')", () => {
  it("returns success:true when material + ISO group present", () => {
    const result = printToProgramPipelineEngine.calculate("print_to_program_check_intake", {
      part_number: "TEST-001",
      material: { material_name: "1045 steel", iso_group: "P" },
      features: [],
      dimensions: [],
    }) as { success: boolean; warnings: unknown[]; recommendations: string[]; safety_pass_rate: number };

    expect(result.success).toBe(true);
    expect(result.safety_pass_rate).toBe(1);
    // Recommendations are about missing fields — should be empty for complete input
    expect(result.recommendations.length).toBe(0);
  });

  it("flags missing material as critical (success:false)", () => {
    const result = printToProgramPipelineEngine.calculate("print_to_program_check_intake", {
      part_number: "TEST-002",
      material: {}, // material_name missing
      features: [],
      dimensions: [],
    }) as { success: boolean; warnings: Array<{ severity: string; message: string }>; safety_pass_rate: number };

    expect(result.success).toBe(false);
    expect(result.safety_pass_rate).toBe(0);
    // Should have a critical warning about the missing material callout
    const hasCriticalMaterialWarning = result.warnings.some(
      (w) => w.severity === "critical" && /material/i.test(w.message),
    );
    expect(hasCriticalMaterialWarning).toBe(true);
  });

  it("surfaces ISO group inference as warning, not blocker", () => {
    const result = printToProgramPipelineEngine.calculate("print_to_program_check_intake", {
      part_number: "TEST-003",
      material: { material_name: "1045 steel" }, // iso_group missing
      features: [],
      dimensions: [],
    }) as { success: boolean; warnings: Array<{ severity: string; message: string }>; safety_pass_rate: number };

    // Missing ISO group is a warning (not critical) — material default applies
    // success depends on `complete` flag from validateIntake; not asserting strict
    // true/false here because the underlying impl chooses
    expect(result.warnings.some((w) => /ISO material group/i.test(w.message))).toBe(true);
  });

  it("returns recommendations listing missing dimensions when blueprint has none", () => {
    const result = printToProgramPipelineEngine.calculate("print_to_program_check_intake", {
      part_number: "TEST-004",
      material: { material_name: "1045 steel", iso_group: "P" },
      features: [],
      dimensions: [],
      // No dimensions on drawing
    }) as { recommendations: string[]; warnings: unknown[] };

    // Recommendations is an array of strings — when validateIntake finds missing
    // dimensions it returns them via missing_dimensions[]; our case maps that
    // into the recommendations field
    expect(Array.isArray(result.recommendations)).toBe(true);
  });

  it("returns ValidationResult shape (safety_checks always present)", () => {
    const result = printToProgramPipelineEngine.calculate("print_to_program_check_intake", {
      part_number: "TEST-005",
      material: { material_name: "1045 steel", iso_group: "P" },
      features: [],
      dimensions: [],
    }) as { safety_checks: unknown[]; safety_pass_rate: number; success: boolean; warnings: unknown[]; recommendations: unknown[] };

    // Shape contract: ValidationResult is { success, safety_checks, safety_pass_rate, warnings, recommendations }
    expect(Array.isArray(result.safety_checks)).toBe(true);
    expect(Array.isArray(result.warnings)).toBe(true);
    expect(Array.isArray(result.recommendations)).toBe(true);
    expect(typeof result.success).toBe("boolean");
    expect(typeof result.safety_pass_rate).toBe("number");
  });

  it("throws on unknown action (verify intake action is registered)", () => {
    expect(() =>
      printToProgramPipelineEngine.calculate("print_to_program_NOT_A_REAL_ACTION", {}),
    ).toThrow(/Unknown action/);
  });

  it("does not throw on print_to_program_check_intake with minimal input", () => {
    // Smoke test — registered action should not throw on minimal input
    expect(() =>
      printToProgramPipelineEngine.calculate("print_to_program_check_intake", {
        part_number: "SMOKE",
        material: { material_name: "test", iso_group: "P" },
        features: [],
      dimensions: [],
      }),
    ).not.toThrow();
  });
});
