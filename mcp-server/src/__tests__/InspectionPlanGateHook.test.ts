/**
 * InspectionPlanGateHook — unit tests (MS8 / U-LPQ08)
 */
import { describe, it, expect } from "vitest";
import { inspectionPlanGate } from "../hooks/InspectionPlanGateHook.js";

function ctx(action: string, data: Record<string, unknown> = {}) {
  return { target: { action, data } } as any;
}

describe("InspectionPlanGateHook", () => {
  it("skips non-guarded actions", () => {
    const r = inspectionPlanGate.handler(ctx("some_other_action"));
    expect(r.success).toBe(true);
    expect(r.data?.skipped).toBe(true);
  });

  it("bypasses when skipInspectionGate=true", () => {
    const r = inspectionPlanGate.handler(
      ctx("turning_assemble_program", { skipInspectionGate: true }),
    );
    expect(r.success).toBe(true);
    expect(r.data?.bypass).toBe(true);
  });

  it("BLOCKS aerospace non-compliant package", () => {
    const r = inspectionPlanGate.handler(
      ctx("turning_assemble_program", {
        quality_package: {
          regime: "aerospace",
          is_compliant: false,
          blocking_issues: ["fai required but not produced"],
        },
      }),
    );
    expect(r.success).toBe(false);
    expect(r.blocked).toBe(true);
  });

  it("BLOCKS medical non-compliant package", () => {
    const r = inspectionPlanGate.handler(
      ctx("turning_swiss_channel_emit", {
        quality_package: {
          regime: "medical",
          is_compliant: false,
          blocking_issues: ["spc_prediction missing"],
        },
      }),
    );
    expect(r.success).toBe(false);
  });

  it("passes when regime is none, even if non-compliant", () => {
    const r = inspectionPlanGate.handler(
      ctx("turning_assemble_program", {
        quality_package: { regime: "none", is_compliant: false, blocking_issues: [] },
      }),
    );
    expect(r.success).toBe(true);
  });

  it("passes when compliant", () => {
    const r = inspectionPlanGate.handler(
      ctx("turning_assemble_program", {
        quality_package: { regime: "aerospace", is_compliant: true, blocking_issues: [] },
      }),
    );
    expect(r.success).toBe(true);
  });

  it("passes when no quality_package supplied (soft warn)", () => {
    const r = inspectionPlanGate.handler(ctx("turning_assemble_program"));
    expect(r.success).toBe(true);
    expect(String(r.message)).toMatch(/quality_package/);
  });

  it("guards fai_generate action", () => {
    const r = inspectionPlanGate.handler(
      ctx("turning_fai_generate", {
        quality_package: {
          regime: "safety_critical",
          is_compliant: false,
          blocking_issues: ["gage R&R failed"],
        },
      }),
    );
    expect(r.success).toBe(false);
  });

  it("BLOCK response carries regime + issues in data", () => {
    const r = inspectionPlanGate.handler(
      ctx("turning_quality_package", {
        quality_package: {
          regime: "aerospace",
          is_compliant: false,
          blocking_issues: ["fai missing", "gage R&R 15%"],
        },
      }),
    );
    expect(r.data?.regime).toBe("aerospace");
    expect(Array.isArray(r.data?.issues)).toBe(true);
  });

  it("truncates blocking_issues to first 3 in message", () => {
    const manyIssues = ["a", "b", "c", "d", "e"];
    const r = inspectionPlanGate.handler(
      ctx("turning_assemble_program", {
        quality_package: {
          regime: "aerospace",
          is_compliant: false,
          blocking_issues: manyIssues,
        },
      }),
    );
    expect(String(r.message)).toMatch(/a; b; c/);
    expect(String(r.message)).not.toMatch(/d; e/);
  });

  it("passes safety_critical when compliant", () => {
    const r = inspectionPlanGate.handler(
      ctx("turning_inspection_plan", {
        quality_package: { regime: "safety_critical", is_compliant: true, blocking_issues: [] },
      }),
    );
    expect(r.success).toBe(true);
  });

  it("hook metadata is correct", () => {
    expect(inspectionPlanGate.id).toBe("inspection-plan-gate");
    expect(inspectionPlanGate.mode).toBe("blocking");
    expect(inspectionPlanGate.enabled).toBe(true);
    expect(inspectionPlanGate.tags).toContain("fai");
  });
});
