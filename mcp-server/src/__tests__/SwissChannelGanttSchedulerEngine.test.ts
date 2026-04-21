/**
 * SwissChannelGanttSchedulerEngine — per-engine tests (MS6a / U-LPM04)
 */
import { describe, it, expect } from "vitest";
import { swissChannelGanttSchedulerEngine } from "../engines/SwissChannelGanttSchedulerEngine.js";

function baseInput() {
  return {
    channels: [
      { channel_id: 1, label: "main", tooling_available: ["OD_TURN", "BORE"] },
      { channel_id: 2, label: "sub", tooling_available: ["OD_TURN", "FACE"] },
    ],
    ops: [
      { op_id: "m1", channel_id: 1, duration_s: 10, tooling_required: "OD_TURN" },
      { op_id: "m2", channel_id: 1, duration_s: 10, tooling_required: "OD_TURN" },
      { op_id: "m3", channel_id: 1, duration_s: 10, tooling_required: "OD_TURN" },
      { op_id: "s1", channel_id: 2, duration_s: 5, tooling_required: "FACE" },
    ],
    sync_points: [
      { after_op: "m1", wait_channels: [1, 2], type: "generic" as const },
      { after_op: "m2", wait_channels: [1, 2], type: "generic" as const },
    ],
  };
}

describe("SwissChannelGanttSchedulerEngine", () => {
  it("reports original cycle-time as the critical path length", () => {
    const r = swissChannelGanttSchedulerEngine.balance(baseInput());
    expect(r.original_cycle_time_s).toBeGreaterThanOrEqual(30); // 3 × 10s main
    expect(r.original_critical_channel).toBe(1);
  });

  it("moves eligible ops off the critical channel to the lighter one", () => {
    const r = swissChannelGanttSchedulerEngine.balance(baseInput());
    expect(r.moves.length).toBeGreaterThan(0);
    // At least one move should target channel 2.
    expect(r.moves.some((m) => m.to_channel === 2)).toBe(true);
  });

  it("reduces cycle time when rebalancing helps", () => {
    const r = swissChannelGanttSchedulerEngine.balance(baseInput());
    expect(r.cycle_time_savings_s).toBeGreaterThanOrEqual(0);
    expect(r.proposed_cycle_time_s).toBeLessThanOrEqual(r.original_cycle_time_s);
  });

  it("won't move ops declared as pinned", () => {
    const input = baseInput();
    input.ops[0]!.pinned = true;
    const r = swissChannelGanttSchedulerEngine.balance(input);
    expect(r.moves.every((m) => m.op_id !== "m1")).toBe(true);
  });

  it("won't move an op to a channel missing the required tooling", () => {
    const input = baseInput();
    // m3 requires a brand-new tool family not available on channel 2.
    input.ops[2]!.tooling_required = "UNOBTAINIUM";
    const r = swissChannelGanttSchedulerEngine.balance(input);
    expect(r.moves.every((m) => m.op_id !== "m3")).toBe(true);
  });

  it("emits a warning when an op lacks tooling_required (can't safely rebalance)", () => {
    const input = baseInput();
    delete input.ops[1]!.tooling_required;
    const r = swissChannelGanttSchedulerEngine.balance(input);
    expect(r.warnings.some((w) => /tooling_required/.test(w))).toBe(true);
  });

  it("merges adjacent sync points within the merge-gap threshold", () => {
    const input = baseInput();
    // m1 and m2 both run on channel 1, end at ~10s and ~20s — gap 10s > 0.5s default, won't merge.
    // Override merge gap to include them.
    const r = swissChannelGanttSchedulerEngine.balance({ ...input, sync_merge_gap_s: 15 });
    expect(r.merged_syncs.length).toBeGreaterThan(0);
  });

  it("flags unknown channel reference in ops", () => {
    const input = baseInput();
    input.ops.push({ op_id: "ghost", channel_id: 9, duration_s: 1, tooling_required: "OD_TURN" });
    const r = swissChannelGanttSchedulerEngine.balance(input);
    expect(r.warnings.some((w) => /channel 9/.test(w))).toBe(true);
  });

  it("balance_acceptable is true when ratio ≤ target", () => {
    const r = swissChannelGanttSchedulerEngine.balance({ ...baseInput(), target_balance_ratio: 3.0 });
    expect(r.balance_acceptable).toBe(true);
  });

  it("rebalanced_ops length is preserved (no ops dropped)", () => {
    const r = swissChannelGanttSchedulerEngine.balance(baseInput());
    expect(r.rebalanced_ops).toHaveLength(4);
  });

  it("per-channel summary includes all channels even if empty", () => {
    const input = {
      channels: [
        { channel_id: 1, tooling_available: ["X"] },
        { channel_id: 2, tooling_available: ["X"] },
        { channel_id: 3, tooling_available: ["X"] },
      ],
      ops: [{ op_id: "only", channel_id: 1, duration_s: 5, tooling_required: "X" }],
      sync_points: [],
    };
    const r = swissChannelGanttSchedulerEngine.balance(input);
    expect(r.per_channel).toHaveLength(3);
  });

  it("warns when fewer than 2 channels", () => {
    const r = swissChannelGanttSchedulerEngine.balance({
      channels: [{ channel_id: 1, tooling_available: [] }],
      ops: [{ op_id: "x", channel_id: 1, duration_s: 1 }],
      sync_points: [],
    });
    expect(r.warnings.some((w) => /Fewer than 2 channels/.test(w))).toBe(true);
  });

  it("handles empty op list without throwing", () => {
    const r = swissChannelGanttSchedulerEngine.balance({
      channels: [{ channel_id: 1, tooling_available: [] }, { channel_id: 2, tooling_available: [] }],
      ops: [],
      sync_points: [],
    });
    expect(r.moves).toHaveLength(0);
    expect(r.original_cycle_time_s).toBe(0);
  });

  it("preserves a perfectly-balanced schedule (no moves)", () => {
    const r = swissChannelGanttSchedulerEngine.balance({
      channels: [
        { channel_id: 1, tooling_available: ["T"] },
        { channel_id: 2, tooling_available: ["T"] },
      ],
      ops: [
        { op_id: "a", channel_id: 1, duration_s: 10, tooling_required: "T" },
        { op_id: "b", channel_id: 2, duration_s: 10, tooling_required: "T" },
      ],
      sync_points: [],
    });
    expect(r.moves).toHaveLength(0);
    expect(r.proposed_balance_ratio).toBeCloseTo(1.0, 2);
  });
});
