/**
 * MultiChannelCollisionEngine — per-engine tests (MS6a / U-LPM05)
 */
import { describe, it, expect } from "vitest";
import { multiChannelCollisionEngine } from "../engines/MultiChannelCollisionEngine.js";

function op(partial: Partial<Parameters<typeof multiChannelCollisionEngine.check>[0]["ops"][number]>) {
  return {
    op_id: "x",
    channel_id: 1,
    turret: 1,
    start_s: 0,
    end_s: 5,
    z_range_mm: [0, 30] as [number, number],
    x_mm: 25,
    tool_radius_mm: 5,
    ...partial,
  };
}

describe("MultiChannelCollisionEngine", () => {
  it("reports OK when no simultaneous pairs overlap in time", () => {
    const r = multiChannelCollisionEngine.check({
      ops: [
        op({ op_id: "a", channel_id: 1, turret: 1, start_s: 0, end_s: 5 }),
        op({ op_id: "b", channel_id: 2, turret: 2, start_s: 10, end_s: 15 }),
      ],
    });
    expect(r.is_safe).toBe(true);
    expect(r.pairs_checked).toBe(0);
  });

  it("skips pairs within the same channel (ops on one channel are always serial)", () => {
    const r = multiChannelCollisionEngine.check({
      ops: [
        op({ op_id: "a", channel_id: 1, turret: 1, start_s: 0, end_s: 10 }),
        op({ op_id: "b", channel_id: 1, turret: 1, start_s: 0, end_s: 10 }),
      ],
    });
    expect(r.pairs_checked).toBe(0);
  });

  it("flags Zone 1 critical when two turrets overlap in Z with negative clearance", () => {
    const r = multiChannelCollisionEngine.check({
      ops: [
        op({ op_id: "a", channel_id: 1, turret: 1, x_mm: 10, tool_radius_mm: 8, z_range_mm: [0, 30] }),
        op({ op_id: "b", channel_id: 2, turret: 2, x_mm: 15, tool_radius_mm: 8, z_range_mm: [10, 40] }),
      ],
    });
    const z1 = r.flags.find((f) => f.zone === 1);
    expect(z1).toBeTruthy();
    expect(z1!.severity).toBe("critical");
    expect(z1!.sync_insertion).toBeTruthy();
    expect(r.is_safe).toBe(false);
  });

  it("flags Zone 1 warning when clearance is positive but below min_clearance", () => {
    // clearance = |20 - 30| - (3 + 3) = 4mm, below 10mm floor → warning (not critical).
    const r = multiChannelCollisionEngine.check({
      ops: [
        op({ op_id: "a", channel_id: 1, turret: 1, x_mm: 20, tool_radius_mm: 3, z_range_mm: [0, 30] }),
        op({ op_id: "b", channel_id: 2, turret: 2, x_mm: 30, tool_radius_mm: 3, z_range_mm: [10, 40] }),
      ],
      min_clearance_mm: 10,
    });
    expect(r.flags.some((f) => f.zone === 1 && f.severity === "warning")).toBe(true);
  });

  it("passes when turrets are well-separated in Z (no overlap)", () => {
    const r = multiChannelCollisionEngine.check({
      ops: [
        op({ op_id: "a", channel_id: 1, turret: 1, z_range_mm: [0, 10] }),
        op({ op_id: "b", channel_id: 2, turret: 2, z_range_mm: [50, 100] }),
      ],
    });
    expect(r.flags.filter((f) => f.zone === 1)).toHaveLength(0);
  });

  it("flags Zone 4 critical when a turret indexes while the other turret cuts in the same Z band", () => {
    const r = multiChannelCollisionEngine.check({
      ops: [
        op({ op_id: "idx", channel_id: 1, turret: 1, is_turret_index: true, z_range_mm: [0, 20] }),
        op({ op_id: "cut", channel_id: 2, turret: 2, z_range_mm: [10, 30] }),
      ],
    });
    const z4 = r.flags.find((f) => f.zone === 4);
    expect(z4).toBeTruthy();
    expect(z4!.severity).toBe("critical");
  });

  it("computes deflection factor ≈ 2.0 for co-directional radial forces", () => {
    const r = multiChannelCollisionEngine.check({
      ops: [
        op({ op_id: "a", channel_id: 1, turret: 1, radial_force_n: 500, force_angle_deg: 90, z_range_mm: [0, 30] }),
        op({ op_id: "b", channel_id: 2, turret: 2, radial_force_n: 500, force_angle_deg: 90, x_mm: 35, z_range_mm: [10, 40] }),
      ],
    });
    const forceFlag = r.flags.find((f) => f.deflection_factor > 1.5);
    expect(forceFlag).toBeTruthy();
    expect(forceFlag!.deflection_factor).toBeGreaterThan(1.9);
  });

  it("does not flag force interaction for opposing forces (cancellation)", () => {
    const r = multiChannelCollisionEngine.check({
      ops: [
        op({ op_id: "a", channel_id: 1, turret: 1, radial_force_n: 500, force_angle_deg: 90, z_range_mm: [0, 30], x_mm: 10 }),
        op({ op_id: "b", channel_id: 2, turret: 2, radial_force_n: 500, force_angle_deg: 270, x_mm: 100, tool_radius_mm: 1, z_range_mm: [50, 80] }),
      ],
    });
    const forceFlag = r.flags.find((f) => f.deflection_factor > 1.1);
    expect(forceFlag).toBeFalsy();
  });

  it("emits a recommendation string on every flag", () => {
    const r = multiChannelCollisionEngine.check({
      ops: [
        op({ op_id: "a", channel_id: 1, turret: 1, x_mm: 10, tool_radius_mm: 8, z_range_mm: [0, 30] }),
        op({ op_id: "b", channel_id: 2, turret: 2, x_mm: 15, tool_radius_mm: 8, z_range_mm: [10, 40] }),
      ],
    });
    expect(r.flags.every((f) => f.recommendation.length > 0)).toBe(true);
  });

  it("summary reports BLOCK when any critical flag is present", () => {
    const r = multiChannelCollisionEngine.check({
      ops: [
        op({ op_id: "a", channel_id: 1, turret: 1, x_mm: 0, tool_radius_mm: 10, z_range_mm: [0, 30] }),
        op({ op_id: "b", channel_id: 2, turret: 2, x_mm: 5, tool_radius_mm: 10, z_range_mm: [10, 40] }),
      ],
    });
    expect(r.summary).toMatch(/BLOCK/);
  });

  it("summary reports OK when pairs checked but no flags raised", () => {
    const r = multiChannelCollisionEngine.check({
      ops: [
        op({ op_id: "a", channel_id: 1, turret: 1, z_range_mm: [0, 5], x_mm: 50, tool_radius_mm: 2 }),
        op({ op_id: "b", channel_id: 2, turret: 2, z_range_mm: [100, 110], x_mm: 50, tool_radius_mm: 2 }),
      ],
    });
    expect(r.summary).toMatch(/OK/);
  });

  it("handles empty op list without throwing", () => {
    const r = multiChannelCollisionEngine.check({ ops: [] });
    expect(r.is_safe).toBe(true);
    expect(r.flags).toHaveLength(0);
    expect(r.pairs_checked).toBe(0);
  });

  it("respects min_clearance_mm parameter when set", () => {
    const baseline = multiChannelCollisionEngine.check({
      ops: [
        op({ op_id: "a", channel_id: 1, turret: 1, x_mm: 20, tool_radius_mm: 5, z_range_mm: [0, 30] }),
        op({ op_id: "b", channel_id: 2, turret: 2, x_mm: 35, tool_radius_mm: 5, z_range_mm: [10, 40] }),
      ],
      min_clearance_mm: 3,
    });
    // Clearance = |20-35| - (5+5) = 5mm, above floor=3 → no flag.
    expect(baseline.flags.filter((f) => f.zone === 1)).toHaveLength(0);

    const strict = multiChannelCollisionEngine.check({
      ops: [
        op({ op_id: "a", channel_id: 1, turret: 1, x_mm: 20, tool_radius_mm: 5, z_range_mm: [0, 30] }),
        op({ op_id: "b", channel_id: 2, turret: 2, x_mm: 35, tool_radius_mm: 5, z_range_mm: [10, 40] }),
      ],
      min_clearance_mm: 10,
    });
    expect(strict.flags.some((f) => f.zone === 1)).toBe(true);
  });

  it("part_mounted_on='sub' triggers Zone 2 when main-turret crosses centreline", () => {
    const r = multiChannelCollisionEngine.check({
      ops: [
        op({ op_id: "main_cut", channel_id: 1, turret: 1, x_mm: 3, tool_radius_mm: 5, z_range_mm: [0, 30] }),
        op({ op_id: "sub_cut", channel_id: 2, turret: 2, x_mm: 20, tool_radius_mm: 5, z_range_mm: [100, 120] }),
      ],
      part_mounted_on: "sub",
    });
    const z2 = r.flags.find((f) => f.zone === 2 && /sub-spindle/.test(f.zone_description));
    expect(z2).toBeTruthy();
  });
});
