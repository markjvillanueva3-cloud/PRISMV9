/**
 * L4-P0-MS1: 20 Core Hooks + 6 Cadences — unit tests
 *
 * HookResult shape: { success, blocked, message, score, warnings, issues, ... }
 */
import { describe, it, expect } from "vitest";
import { safetyQualityHooks } from "../hooks/SafetyQualityHooks.js";
import { cadenceHooks } from "../hooks/CadenceDefinitions.js";
import { HookContext } from "../engines/HookExecutor.js";

function makeCtx(data: Record<string, any> = {}): HookContext {
  return { target: { data }, source: "test", timestamp: Date.now() } as any;
}

// ============================================================================
// Registration counts
// ============================================================================
describe("L4 hook registration", () => {
  it("safetyQualityHooks exports 20 hooks", () => {
    expect(safetyQualityHooks.length).toBe(20);
  });

  it("cadenceHooks exports 6 cadences", () => {
    expect(cadenceHooks.length).toBe(6);
  });

  it("all hooks have unique ids", () => {
    const all = [...safetyQualityHooks, ...cadenceHooks];
    const ids = all.map(h => h.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("5+ safety hooks are blocking + critical", () => {
    const blocking = safetyQualityHooks.filter(h => h.mode === "blocking" && h.priority === "critical");
    expect(blocking.length).toBeGreaterThanOrEqual(5);
  });
});

// ============================================================================
// Safety Hooks — BLOCKING
// ============================================================================
describe("Safety hooks (blocking)", () => {
  const safety = safetyQualityHooks.filter(h => h.mode === "blocking");

  it("pre_calculate_safety blocks negative spindle RPM", () => {
    const hook = safety.find(h => h.id === "pre-calculate-safety")!;
    const result = hook.handler(makeCtx({ spindleRpm: -100 })) as any;
    expect(result.blocked).toBe(true);
  });

  it("pre_calculate_safety passes valid params", () => {
    const hook = safety.find(h => h.id === "pre-calculate-safety")!;
    const result = hook.handler(makeCtx({ spindleRpm: 5000, feedRate: 1000, depthOfCut: 3 })) as any;
    expect(result.blocked).toBe(false);
    expect(result.success).toBe(true);
  });

  it("post_calculate_safety blocks excessive force", () => {
    const hook = safety.find(h => h.id === "post-calculate-safety")!;
    const result = hook.handler(makeCtx({ cuttingForce_N: 200000 })) as any;
    expect(result.blocked).toBe(true);
  });

  it("pre_gcode_safety blocks excessive rapid traverse", () => {
    const hook = safety.find(h => h.id === "pre-gcode-safety")!;
    const result = hook.handler(makeCtx({ rapidTraverse_mm_min: 200000 })) as any;
    expect(result.blocked).toBe(true);
  });

  it("post_toolpath_safety blocks collision", () => {
    const hook = safety.find(h => h.id === "post-toolpath-safety")!;
    const result = hook.handler(makeCtx({ collisionDetected: true })) as any;
    expect(result.blocked).toBe(true);
  });

  it("machine_limit_guard blocks spindle over max", () => {
    const hook = safety.find(h => h.id === "machine-limit-guard")!;
    const result = hook.handler(makeCtx({
      spindleRpm: 20000,
      machineLimits: { maxRpm: 15000 },
    })) as any;
    expect(result.blocked).toBe(true);
  });

  it("machine_limit_guard passes within limits", () => {
    const hook = safety.find(h => h.id === "machine-limit-guard")!;
    const result = hook.handler(makeCtx({
      spindleRpm: 10000,
      machineLimits: { maxRpm: 15000 },
    })) as any;
    expect(result.blocked).toBe(false);
    expect(result.success).toBe(true);
  });
});

// ============================================================================
// Quality Hooks — WARNING
// ============================================================================
describe("Quality hooks (warning)", () => {
  it("post_measurement_spc warns on low Cpk", () => {
    const hook = safetyQualityHooks.find(h => h.id === "post-measurement-spc")!;
    const result = hook.handler(makeCtx({ cpk: 0.8 })) as any;
    expect(result.warnings).toBeDefined();
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it("tolerance_drift_alert warns at 90% consumed", () => {
    const hook = safetyQualityHooks.find(h => h.id === "tolerance-drift-alert")!;
    const result = hook.handler(makeCtx({
      nominal: 25.0, upperTolerance: 0.05, lowerTolerance: -0.05,
      actualDimension: 25.045,
    })) as any;
    expect(result.warnings).toBeDefined();
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it("tool_wear_threshold warns on high flank wear", () => {
    const hook = safetyQualityHooks.find(h => h.id === "tool-wear-threshold")!;
    const result = hook.handler(makeCtx({ flankWear_mm: 0.4 })) as any;
    expect(result.warnings).toBeDefined();
  });

  it("surface_quality_gate warns when Ra exceeds target", () => {
    const hook = safetyQualityHooks.find(h => h.id === "surface-quality-gate")!;
    const result = hook.handler(makeCtx({ Ra_um: 3.2, targetRa_um: 1.6 })) as any;
    expect(result.warnings).toBeDefined();
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// Business Hooks
// ============================================================================
describe("Business hooks", () => {
  it("job_cost_update returns success", () => {
    const hook = safetyQualityHooks.find(h => h.id === "job-cost-update")!;
    const result = hook.handler(makeCtx({ cycleTime_min: 12, toolCost: 5 })) as any;
    expect(result.success).toBe(true);
  });

  it("schedule_conflict warns on overlapping jobs", () => {
    const hook = safetyQualityHooks.find(h => h.id === "schedule-conflict")!;
    const result = hook.handler(makeCtx({ overlappingJobs: ["J1", "J2"] })) as any;
    expect(result.warnings).toBeDefined();
  });

  it("inventory_low_alert warns below reorder point", () => {
    const hook = safetyQualityHooks.find(h => h.id === "inventory-low-alert")!;
    const result = hook.handler(makeCtx({ stockLevel: 3, reorderPoint: 10 })) as any;
    expect(result.warnings).toBeDefined();
  });
});

// ============================================================================
// System Hooks
// ============================================================================
describe("System hooks", () => {
  it("pre_api_auth blocks unauthenticated", () => {
    const hook = safetyQualityHooks.find(h => h.id === "pre-api-auth")!;
    const result = hook.handler(makeCtx({ authenticated: false })) as any;
    expect(result.blocked).toBe(true);
  });

  it("rate_limit_check blocks when depleted", () => {
    const hook = safetyQualityHooks.find(h => h.id === "rate-limit-check")!;
    const result = hook.handler(makeCtx({ rateLimitRemaining: 0 })) as any;
    expect(result.blocked).toBe(true);
  });

  it("health_check_hook succeeds normally", () => {
    const hook = safetyQualityHooks.find(h => h.id === "health-check-hook")!;
    const result = hook.handler(makeCtx({})) as any;
    expect(result.success).toBe(true);
  });

  it("context_overflow_guard warns at 85%", () => {
    const hook = safetyQualityHooks.find(h => h.id === "context-overflow-guard")!;
    const result = hook.handler(makeCtx({ contextUsagePct: 85 })) as any;
    expect(result.warnings).toBeDefined();
  });
});

// ============================================================================
// Cadence Hooks
// ============================================================================
describe("Cadence hooks", () => {
  it("daily_tool_wear_check warns on critical tool", () => {
    const hook = cadenceHooks.find(h => h.id === "cadence-daily-tool-wear")!;
    const result = hook.handler(makeCtx({
      activeTools: [{ id: "T1", lifeRemainingPct: 5 }],
    })) as any;
    expect(result.warnings).toBeDefined();
  });

  it("weekly_maintenance_forecast warns on overdue service", () => {
    const hook = cadenceHooks.find(h => h.id === "cadence-weekly-maintenance")!;
    const result = hook.handler(makeCtx({
      machines: [{ id: "M1", hoursSinceService: 480, serviceInterval_hrs: 500 }],
    })) as any;
    expect(result.warnings).toBeDefined();
  });

  it("hourly_machine_health warns on high temp", () => {
    const hook = cadenceHooks.find(h => h.id === "cadence-hourly-machine-health")!;
    const result = hook.handler(makeCtx({ spindleTemp_C: 70 })) as any;
    expect(result.warnings).toBeDefined();
  });

  it("shift_change_handoff succeeds", () => {
    const hook = cadenceHooks.find(h => h.id === "cadence-shift-handoff")!;
    const result = hook.handler(makeCtx({ shift: "day", activeJobs: 5 })) as any;
    expect(result.success).toBe(true);
  });

  it("quarterly_calibration warns on overdue machine", () => {
    const hook = cadenceHooks.find(h => h.id === "cadence-quarterly-calibration")!;
    const result = hook.handler(makeCtx({
      machines: [{ id: "VMC-01", daysSinceCalibration: 100, calibrationInterval_days: 90 }],
    })) as any;
    expect(result.warnings).toBeDefined();
  });
});
