/**
 * MaterialTraceabilityGateHook — unit tests (MS9 / U-LPR06)
 */
import { describe, it, expect } from "vitest";
import { materialTraceabilityGate } from "../hooks/MaterialTraceabilityGateHook.js";

function ctx(action: string, data: Record<string, unknown> = {}) {
  return { target: { action, data } } as any;
}

describe("MaterialTraceabilityGateHook", () => {
  it("skips non-guarded actions", () => {
    const r = materialTraceabilityGate.handler(ctx("some_other_action"));
    expect(r.success).toBe(true);
    expect(r.data?.skipped).toBe(true);
  });

  it("bypasses on skipMaterialTraceabilityGate=true", () => {
    const r = materialTraceabilityGate.handler(
      ctx("turning_assemble_program", { skipMaterialTraceabilityGate: true }),
    );
    expect(r.success).toBe(true);
    expect(r.data?.bypass).toBe(true);
  });

  it("BLOCKS when biocompat_result.verdict=BLOCK", () => {
    const r = materialTraceabilityGate.handler(
      ctx("turning_biocompat_check", {
        biocompat_result: {
          verdict: "BLOCK",
          issues: [{ rule: "TI_NO_CHLORINATED_COOLANT", severity: "critical" }],
        },
      }),
    );
    expect(r.success).toBe(false);
    expect(r.blocked).toBe(true);
  });

  it("passes when biocompat_result is ALLOW", () => {
    const r = materialTraceabilityGate.handler(
      ctx("turning_assemble_program", { biocompat_result: { verdict: "ALLOW", issues: [] } }),
    );
    expect(r.success).toBe(true);
  });

  it("passes when biocompat is WARN (no block)", () => {
    const r = materialTraceabilityGate.handler(
      ctx("turning_assemble_program", { biocompat_result: { verdict: "WARN", issues: [] } }),
    );
    expect(r.success).toBe(true);
  });

  it("BLOCKS compliance non-compliant under aerospace", () => {
    const r = materialTraceabilityGate.handler(
      ctx("turning_assemble_program", {
        compliance_result: {
          regime: "aerospace",
          is_compliant: false,
          blocking_issues: ["CMTR NOT on file"],
        },
      }),
    );
    expect(r.success).toBe(false);
  });

  it("passes compliance non-compliant under regime=none", () => {
    const r = materialTraceabilityGate.handler(
      ctx("turning_assemble_program", {
        compliance_result: { regime: "none", is_compliant: false, blocking_issues: [] },
      }),
    );
    expect(r.success).toBe(true);
  });

  it("passes compliance compliant under medical", () => {
    const r = materialTraceabilityGate.handler(
      ctx("turning_swiss_channel_emit", {
        compliance_result: { regime: "medical", is_compliant: true, blocking_issues: [] },
      }),
    );
    expect(r.success).toBe(true);
  });

  it("BLOCK carries regime + issues in data", () => {
    const r = materialTraceabilityGate.handler(
      ctx("turning_assemble_program", {
        compliance_result: {
          regime: "medical",
          is_compliant: false,
          blocking_issues: ["DHR missing", "PQ incomplete"],
        },
      }),
    );
    expect(r.data?.regime).toBe("medical");
    expect(Array.isArray(r.data?.issues)).toBe(true);
  });

  it("biocompat BLOCK takes precedence over compliance pass", () => {
    const r = materialTraceabilityGate.handler(
      ctx("turning_assemble_program", {
        biocompat_result: {
          verdict: "BLOCK",
          issues: [{ rule: "TI_NO_IRON_CONTACT", severity: "critical" }],
        },
        compliance_result: { regime: "aerospace", is_compliant: true, blocking_issues: [] },
      }),
    );
    expect(r.success).toBe(false);
    expect(r.blocked).toBe(true);
  });

  it("passes when no reports supplied (soft advisory)", () => {
    const r = materialTraceabilityGate.handler(ctx("turning_assemble_program"));
    expect(r.success).toBe(true);
    expect(String(r.message)).toMatch(/compliance/);
  });

  it("hook metadata is correct", () => {
    expect(materialTraceabilityGate.id).toBe("material-traceability-gate");
    expect(materialTraceabilityGate.mode).toBe("blocking");
    expect(materialTraceabilityGate.priority).toBe("critical");
    expect(materialTraceabilityGate.enabled).toBe(true);
    expect(materialTraceabilityGate.tags).toContain("iso13485");
  });
});
