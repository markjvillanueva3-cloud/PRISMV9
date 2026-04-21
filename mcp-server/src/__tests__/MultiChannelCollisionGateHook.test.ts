/**
 * MultiChannelCollisionGateHook — hook unit tests (MS6a / U-LPM08)
 */
import { describe, it, expect } from "vitest";
import { multiChannelCollisionGate } from "../hooks/MultiChannelCollisionGateHook.js";

function ctx(action: string, data: Record<string, unknown> = {}) {
  return {
    // Minimal stub that matches HookContext signature.
    target: { action, data },
  } as any;
}

describe("MultiChannelCollisionGateHook", () => {
  it("skips non-multichannel actions", () => {
    const r = multiChannelCollisionGate.handler(ctx("some_other_action"));
    expect(r.success).toBe(true);
    expect(r.data?.skipped).toBe(true);
  });

  it("skips when skipCollisionGate flag is set", () => {
    const r = multiChannelCollisionGate.handler(ctx("turning_swiss_channel_emit", { skipCollisionGate: true }));
    expect(r.success).toBe(true);
    expect(r.data?.bypass).toBe(true);
  });

  it("blocks when pre-computed collision_report is not safe", () => {
    const r = multiChannelCollisionGate.handler(
      ctx("turning_swiss_channel_emit", {
        collision_report: {
          is_safe: false,
          critical_count: 2,
          flags: [
            { severity: "critical", zone: 1, op_a: "a", op_b: "b" },
            { severity: "critical", zone: 4, op_a: "c", op_b: "d" },
          ],
        },
      }),
    );
    expect(r.success).toBe(false);
    expect(r.blocked).toBe(true);
  });

  it("passes when pre-computed collision_report is safe", () => {
    const r = multiChannelCollisionGate.handler(
      ctx("turning_swiss_channel_balance", {
        collision_report: { is_safe: true, flags: [] },
      }),
    );
    expect(r.success).toBe(true);
  });

  it("blocks when sync_verify_result is not safe", () => {
    const r = multiChannelCollisionGate.handler(
      ctx("turning_swiss_channel_emit", {
        sync_verify_result: { is_safe: false, critical_count: 1, summary: "deadlock detected" },
      }),
    );
    expect(r.success).toBe(false);
    expect(r.blocked).toBe(true);
  });

  it("advises running collision check when emit has no report", () => {
    const r = multiChannelCollisionGate.handler(ctx("turning_swiss_channel_emit"));
    expect(r.success).toBe(true);
    expect(String(r.message)).toMatch(/collision_check/);
  });

  it("handles balance action without pre-computed report", () => {
    const r = multiChannelCollisionGate.handler(ctx("turning_swiss_channel_balance"));
    expect(r.success).toBe(true);
  });

  it("handles collision_check action itself", () => {
    const r = multiChannelCollisionGate.handler(ctx("turning_swiss_collision_check"));
    expect(r.success).toBe(true);
  });

  it("handles part_transfer action", () => {
    const r = multiChannelCollisionGate.handler(ctx("turning_swiss_part_transfer"));
    expect(r.success).toBe(true);
  });

  it("handles legacy mill_turn_multi_channel action", () => {
    const r = multiChannelCollisionGate.handler(ctx("mill_turn_multi_channel"));
    expect(r.success).toBe(true);
  });

  it("carries violations in block metadata (up to 5)", () => {
    const manyFlags = Array.from({ length: 10 }, (_, i) => ({
      severity: "critical" as const,
      zone: 1,
      op_a: `a${i}`,
      op_b: `b${i}`,
    }));
    const r = multiChannelCollisionGate.handler(
      ctx("turning_swiss_channel_emit", {
        collision_report: { is_safe: false, critical_count: 10, flags: manyFlags },
      }),
    );
    expect(r.success).toBe(false);
    expect(Array.isArray(r.data?.violations)).toBe(true);
    expect((r.data?.violations as unknown[]).length).toBeLessThanOrEqual(5);
  });

  it("hook definition has required metadata", () => {
    expect(multiChannelCollisionGate.id).toBe("multi-channel-collision-gate");
    expect(multiChannelCollisionGate.mode).toBe("blocking");
    expect(multiChannelCollisionGate.priority).toBe("critical");
    expect(multiChannelCollisionGate.enabled).toBe(true);
    expect(multiChannelCollisionGate.tags).toContain("collision");
  });
});
