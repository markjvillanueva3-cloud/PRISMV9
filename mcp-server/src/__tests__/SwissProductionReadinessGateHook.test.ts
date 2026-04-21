/**
 * SwissProductionReadinessGateHook — unit tests (MS6b / U-LPS27)
 */
import { describe, it, expect } from "vitest";
import { swissProductionReadinessGate } from "../hooks/SwissProductionReadinessGateHook.js";

function ctx(action: string, data: Record<string, unknown> = {}) {
  return { target: { action, data } } as any;
}

describe("SwissProductionReadinessGateHook", () => {
  it("skips non-Swiss actions", () => {
    const r = swissProductionReadinessGate.handler(ctx("some_other_action"));
    expect(r.success).toBe(true);
    expect(r.data?.skipped).toBe(true);
  });

  it("bypasses when skipProductionGate=true", () => {
    const r = swissProductionReadinessGate.handler(ctx("turning_swiss_channel_emit", { skipProductionGate: true }));
    expect(r.success).toBe(true);
    expect(r.data?.bypass).toBe(true);
  });

  it("BLOCKS when unmanned_verdict=RED", () => {
    const r = swissProductionReadinessGate.handler(ctx("turning_swiss_channel_emit", { unmanned_verdict: "RED" }));
    expect(r.success).toBe(false);
    expect(r.blocked).toBe(true);
  });

  it("passes YELLOW with advisory note", () => {
    const r = swissProductionReadinessGate.handler(ctx("turning_swiss_unmanned_score", { unmanned_verdict: "YELLOW" }));
    expect(r.success).toBe(true);
    expect(String(r.message)).toMatch(/periodic operator check/);
  });

  it("passes GREEN", () => {
    const r = swissProductionReadinessGate.handler(ctx("turning_swiss_unmanned_score", { unmanned_verdict: "GREEN" }));
    expect(r.success).toBe(true);
  });

  it("BLOCKS emit when bar_plan is missing", () => {
    const r = swissProductionReadinessGate.handler(ctx("turning_swiss_channel_emit"));
    expect(r.success).toBe(false);
    expect(r.blocked).toBe(true);
    expect(String(r.message)).toMatch(/bar_plan/);
  });

  it("BLOCKS emit when bar_plan has parts_per_bar=0", () => {
    const r = swissProductionReadinessGate.handler(
      ctx("turning_swiss_channel_emit", { bar_plan: { parts_per_bar: 0, bars_required: 0 } }),
    );
    expect(r.success).toBe(false);
    expect(String(r.message)).toMatch(/parts_per_bar=0/);
  });

  it("allows emit when bar_plan is valid + no RED verdict", () => {
    const r = swissProductionReadinessGate.handler(
      ctx("turning_swiss_channel_emit", {
        bar_plan: { parts_per_bar: 100, bars_required: 2 },
      }),
    );
    expect(r.success).toBe(true);
  });

  it("allows bar_management action without pre-existing plan (first call)", () => {
    const r = swissProductionReadinessGate.handler(ctx("turning_swiss_bar_management"));
    expect(r.success).toBe(true);
  });

  it("allows unmanned_score action without pre-existing plan (first call)", () => {
    const r = swissProductionReadinessGate.handler(ctx("turning_swiss_unmanned_score"));
    expect(r.success).toBe(true);
  });

  it("hook definition has required metadata", () => {
    expect(swissProductionReadinessGate.id).toBe("swiss-production-readiness-gate");
    expect(swissProductionReadinessGate.mode).toBe("blocking");
    expect(swissProductionReadinessGate.enabled).toBe(true);
    expect(swissProductionReadinessGate.tags).toContain("lights-out");
  });

  it("BLOCK carries verdict in metadata", () => {
    const r = swissProductionReadinessGate.handler(ctx("turning_swiss_channel_emit", { unmanned_verdict: "RED" }));
    expect(r.data?.verdict).toBe("RED");
  });
});
