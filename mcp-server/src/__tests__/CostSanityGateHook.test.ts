/**
 * CostSanityGateHook — unit tests (MS10 / U-LPE07)
 */
import { describe, it, expect } from "vitest";
import { costSanityGate } from "../hooks/CostSanityGateHook.js";

function ctx(action: string, data: Record<string, unknown> = {}) {
  return { target: { action, data } } as any;
}

describe("CostSanityGateHook", () => {
  it("skips non-guarded actions", () => {
    const r = costSanityGate.handler(ctx("some_other_action"));
    expect(r.success).toBe(true);
    expect(r.data?.skipped).toBe(true);
  });

  it("bypasses when skipCostSanityGate=true", () => {
    const r = costSanityGate.handler(ctx("turning_cost_per_part", { skipCostSanityGate: true }));
    expect(r.success).toBe(true);
    expect(r.data?.bypass).toBe(true);
  });

  it("passes when no cost_per_part_result supplied", () => {
    const r = costSanityGate.handler(ctx("turning_cost_per_part"));
    expect(r.success).toBe(true);
  });

  it("passes when within_benchmark + balanced buckets", () => {
    const r = costSanityGate.handler(
      ctx("turning_cost_per_part", {
        cost_per_part_result: {
          total_cost_per_part: 7.5,
          within_benchmark: true,
          buckets: [
            { name: "machine_time", percent_of_total: 50 },
            { name: "material_cost", percent_of_total: 30 },
            { name: "setup", percent_of_total: 20 },
          ],
        },
      }),
    );
    expect(r.success).toBe(true);
  });

  it("WARNS when total exceeds benchmark", () => {
    const r = costSanityGate.handler(
      ctx("turning_cost_per_part", {
        cost_per_part_result: {
          total_cost_per_part: 50,
          within_benchmark: false,
          buckets: [],
        },
      }),
    );
    expect(r.success).toBe(true); // non-blocking
    expect(String(r.message)).toMatch(/WARN/);
  });

  it("WARNS when a bucket concentration exceeds 70%", () => {
    const r = costSanityGate.handler(
      ctx("turning_cost_per_part", {
        cost_per_part_result: {
          total_cost_per_part: 10,
          within_benchmark: true,
          buckets: [
            { name: "tool_cost", percent_of_total: 85 },
            { name: "machine_time", percent_of_total: 15 },
          ],
        },
      }),
    );
    expect(String(r.message)).toMatch(/WARN/);
    expect(String(r.message)).toMatch(/tool_cost/);
  });

  it("does not warn when top bucket is exactly below threshold", () => {
    const r = costSanityGate.handler(
      ctx("turning_cost_per_part", {
        cost_per_part_result: {
          total_cost_per_part: 10,
          within_benchmark: true,
          buckets: [{ name: "tool_cost", percent_of_total: 69 }],
        },
      }),
    );
    expect(r.success).toBe(true);
    expect(String(r.message ?? "")).not.toMatch(/WARN/);
  });

  it("reports failure when block_on_cost_anomaly=true + benchmark exceeded", () => {
    // Hook mode is non_blocking, so `blocked` flag remains false; success=false
    // is the caller's signal to halt. Message carries "BLOCK:" prefix.
    const r = costSanityGate.handler(
      ctx("turning_cost_per_part", {
        block_on_cost_anomaly: true,
        cost_per_part_result: {
          total_cost_per_part: 50,
          within_benchmark: false,
          buckets: [],
        },
      }),
    );
    expect(r.success).toBe(false);
    expect(String(r.message)).toMatch(/BLOCK/);
  });

  it("reasons array included in data payload for warnings", () => {
    const r = costSanityGate.handler(
      ctx("turning_cost_per_part", {
        cost_per_part_result: {
          total_cost_per_part: 20,
          within_benchmark: false,
          buckets: [{ name: "material_cost", percent_of_total: 90 }],
        },
      }),
    );
    expect(Array.isArray(r.data?.reasons)).toBe(true);
    expect((r.data?.reasons as any[]).length).toBeGreaterThanOrEqual(2);
  });

  it("guards turning_quote action", () => {
    const r = costSanityGate.handler(
      ctx("turning_quote", {
        cost_per_part_result: {
          total_cost_per_part: 100,
          within_benchmark: false,
          buckets: [],
        },
      }),
    );
    expect(String(r.message)).toMatch(/WARN|BLOCK/);
  });

  it("hook definition has expected metadata", () => {
    expect(costSanityGate.id).toBe("cost-sanity-gate");
    expect(costSanityGate.mode).toBe("non_blocking");
    expect(costSanityGate.enabled).toBe(true);
    expect(costSanityGate.tags).toContain("cost");
  });
});
