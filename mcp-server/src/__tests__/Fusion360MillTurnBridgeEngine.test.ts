/**
 * Fusion360MillTurnBridgeEngine.test.ts
 */

import { describe, it, expect } from "vitest";
import {
  Fusion360MillTurnBridgeEngine,
  MillTurnArchetypeSchema,
  SpindleConfigSchema,
  ThreadCycleParamsSchema,
  type MillTurnArchetype,
} from "../engines/Fusion360MillTurnBridgeEngine.js";

function mustFind(id: string): MillTurnArchetype {
  const m = Fusion360MillTurnBridgeEngine.lookup(id);
  if (m === null) throw new Error(`expected archetype ${id}, got null`);
  return m;
}

describe("Fusion360MillTurnBridgeEngine — catalog shape", () => {
  it("exposes exactly 8 archetypes", () => {
    expect(Fusion360MillTurnBridgeEngine.count()).toBe(8);
    expect(Fusion360MillTurnBridgeEngine.EXPECTED_TOTAL).toBe(8);
  });

  it("audit invariant passes", () => {
    const a = Fusion360MillTurnBridgeEngine.auditCatalog();
    expect(a.ok).toBe(true);
    expect(a.errors).toEqual([]);
  });
});

describe("Fusion360MillTurnBridgeEngine — per-archetype lookup", () => {
  it("Mazak Integrex i-200ST is twin-spindle synchronized with B-axis", () => {
    const m = mustFind("mazak_integrex_i200_st");
    expect(m.spindle_config).toBe("twin_spindle_synchronized");
    expect(m.has_b_axis).toBe(true);
    expect(m.has_y_axis).toBe(true);
    expect(m.has_live_tooling).toBe(true);
  });

  it("Hardinge Quest GT27 SP is single spindle, NO live tooling", () => {
    const m = mustFind("hardinge_quest_gt27_sp");
    expect(m.spindle_config).toBe("single_spindle");
    expect(m.has_live_tooling).toBe(false);
  });

  it("Doosan SMX is twin-spindle pickup with B-axis", () => {
    const m = mustFind("doosan_puma_smx_2100sb");
    expect(m.spindle_config).toBe("twin_spindle_pickup");
    expect(m.has_b_axis).toBe(true);
  });

  it("lookup returns null + mustLookup throws on unknown id", () => {
    expect(Fusion360MillTurnBridgeEngine.lookup("nope")).toBeNull();
    expect(() => Fusion360MillTurnBridgeEngine.mustLookup("nope")).toThrow(/unknown archetype id/);
  });
});

describe("Fusion360MillTurnBridgeEngine — filters", () => {
  it("listFullMillTurn excludes Hardinge (no live tooling) — 7 of 8", () => {
    const full = Fusion360MillTurnBridgeEngine.listFullMillTurn();
    expect(full.length).toBe(7);
    for (const m of full) {
      expect(m.has_live_tooling).toBe(true);
      expect(m.has_y_axis).toBe(true);
    }
  });

  it("listBySpindleConfig('twin_spindle_pickup') returns the pickup archetypes", () => {
    const pickup = Fusion360MillTurnBridgeEngine.listBySpindleConfig("twin_spindle_pickup");
    expect(pickup.length).toBeGreaterThanOrEqual(2);
    for (const m of pickup) expect(m.spindle_config).toBe("twin_spindle_pickup");
  });
});

describe("Fusion360MillTurnBridgeEngine — validateHandoff", () => {
  it("ok when handoff matches twin-spindle archetype", () => {
    const r = Fusion360MillTurnBridgeEngine.validateHandoff({
      archetype_id: "doosan_puma_smx_2100sb",
      handoff: { source_spindle: "main", target_spindle: "sub", pickup_distance_mm: 100, pickup_feed_mmpm: 1000, synchronize_rpm: false, cutoff_after_pickup: true },
    });
    expect(r.ok).toBe(true);
  });

  it("flags single-spindle archetype as having no sub-spindle", () => {
    const r = Fusion360MillTurnBridgeEngine.validateHandoff({
      archetype_id: "hardinge_quest_gt27_sp",
      handoff: { source_spindle: "main", target_spindle: "sub", pickup_distance_mm: 100, pickup_feed_mmpm: 1000, synchronize_rpm: false, cutoff_after_pickup: true },
    });
    expect(r.ok).toBe(false);
    expect(r.reasons.some(s => s.includes("no sub-spindle"))).toBe(true);
  });

  it("flags synchronize_rpm requested on a pickup-only machine", () => {
    const r = Fusion360MillTurnBridgeEngine.validateHandoff({
      archetype_id: "doosan_puma_smx_2100sb",
      handoff: { source_spindle: "main", target_spindle: "sub", pickup_distance_mm: 100, pickup_feed_mmpm: 1000, synchronize_rpm: true, cutoff_after_pickup: true },
    });
    expect(r.ok).toBe(false);
    expect(r.reasons.some(s => s.includes("Synchronize RPM"))).toBe(true);
  });

  it("flags pickup feed > 5000 mm/min", () => {
    const r = Fusion360MillTurnBridgeEngine.validateHandoff({
      archetype_id: "mazak_integrex_i200_st",
      handoff: { source_spindle: "main", target_spindle: "sub", pickup_distance_mm: 100, pickup_feed_mmpm: 8000, synchronize_rpm: true, cutoff_after_pickup: true },
    });
    expect(r.ok).toBe(false);
    expect(r.reasons.some(s => s.includes("Pickup feed"))).toBe(true);
  });

  it("flags pickup distance > machine length", () => {
    const r = Fusion360MillTurnBridgeEngine.validateHandoff({
      archetype_id: "haas_ds30y",
      handoff: { source_spindle: "main", target_spindle: "sub", pickup_distance_mm: 800, pickup_feed_mmpm: 1000, synchronize_rpm: false, cutoff_after_pickup: true },
    });
    expect(r.ok).toBe(false);
    expect(r.reasons.some(s => s.includes("Pickup distance"))).toBe(true);
  });
});

describe("Fusion360MillTurnBridgeEngine — threadPassSchedule", () => {
  it("M30 × 3.5 thread, 5 passes — total depth ≈ pitch × cos(30°) ≈ 3.03 mm", () => {
    const r = Fusion360MillTurnBridgeEngine.threadPassSchedule(
      { major_diameter_mm: 30, pitch_mm: 3.5, thread_length_mm: 50, starts: 1, half_angle_deg: 30, is_internal: false },
      5,
    );
    expect(r.total_depth_mm).toBeCloseTo(3.5 * Math.cos((30 * Math.PI) / 180), 4);
    expect(r.pass_depths_mm.length).toBe(5);
    // Last pass should equal total depth.
    expect(r.pass_depths_mm[r.pass_depths_mm.length - 1]).toBeCloseTo(r.total_depth_mm, 4);
    // First pass should be smaller than last.
    expect(r.pass_depths_mm[0]).toBeLessThan(r.pass_depths_mm[r.pass_depths_mm.length - 1]);
  });

  it("constant-volume pass schedule increases monotonically", () => {
    const r = Fusion360MillTurnBridgeEngine.threadPassSchedule(
      { major_diameter_mm: 25, pitch_mm: 2.0, thread_length_mm: 40, starts: 1, half_angle_deg: 30, is_internal: false },
      8,
    );
    for (let i = 1; i < r.pass_depths_mm.length; i++) {
      expect(r.pass_depths_mm[i]).toBeGreaterThan(r.pass_depths_mm[i - 1]);
    }
  });

  it("ACME thread (half_angle 14.5°) gives different depth than UN (30°)", () => {
    const acme = Fusion360MillTurnBridgeEngine.threadPassSchedule(
      { major_diameter_mm: 25, pitch_mm: 2.5, thread_length_mm: 40, starts: 1, half_angle_deg: 14.5, is_internal: false },
      4,
    );
    const un = Fusion360MillTurnBridgeEngine.threadPassSchedule(
      { major_diameter_mm: 25, pitch_mm: 2.5, thread_length_mm: 40, starts: 1, half_angle_deg: 30, is_internal: false },
      4,
    );
    expect(acme.total_depth_mm).toBeGreaterThan(un.total_depth_mm);
  });

  it("throws on num_passes out of [1, 30] range", () => {
    expect(() => Fusion360MillTurnBridgeEngine.threadPassSchedule(
      { major_diameter_mm: 25, pitch_mm: 2.0, thread_length_mm: 40, starts: 1, half_angle_deg: 30, is_internal: false },
      0,
    )).toThrow(/num_passes must be in \[1, 30\]/);
    expect(() => Fusion360MillTurnBridgeEngine.threadPassSchedule(
      { major_diameter_mm: 25, pitch_mm: 2.0, thread_length_mm: 40, starts: 1, half_angle_deg: 30, is_internal: false },
      50,
    )).toThrow();
  });
});

describe("Fusion360MillTurnBridgeEngine — schema validation", () => {
  it("MillTurnArchetypeSchema rejects non-snake_case id", () => {
    expect(() => MillTurnArchetypeSchema.parse({
      id: "BadId", display_name: "x", vendor: "x", spindle_config: "single_spindle",
      has_b_axis: false, has_y_axis: false, has_live_tooling: false,
      max_workpiece_dia_mm: 100, max_workpiece_length_mm: 100, notes: "x",
    })).toThrow();
  });

  it("SpindleConfigSchema rejects unknown config", () => {
    const bad: unknown = "triple_spindle";
    expect(() => SpindleConfigSchema.parse(bad)).toThrow();
  });

  it("ThreadCycleParamsSchema rejects starts > 8", () => {
    expect(() => ThreadCycleParamsSchema.parse({
      major_diameter_mm: 25, pitch_mm: 2.0, thread_length_mm: 40,
      starts: 12, half_angle_deg: 30, is_internal: false,
    })).toThrow();
  });

  it("ThreadCycleParamsSchema rejects half_angle out of [5, 45] range", () => {
    expect(() => ThreadCycleParamsSchema.parse({
      major_diameter_mm: 25, pitch_mm: 2.0, thread_length_mm: 40,
      starts: 1, half_angle_deg: 60, is_internal: false,
    })).toThrow();
  });
});

describe("Fusion360MillTurnBridgeEngine — dispatcher round-trip", () => {
  it("ACTIONS array exposes the mill-turn actions", async () => {
    const mod = await import("../tools/dispatchers/camDispatcher.js");
    expect(mod.ACTIONS).toContain("cam_fusion360_millturn_list");
    expect(mod.ACTIONS).toContain("cam_fusion360_millturn_lookup");
    expect(mod.ACTIONS).toContain("cam_fusion360_millturn_validate_handoff");
    expect(mod.ACTIONS).toContain("cam_fusion360_millturn_thread_passes");
    expect(mod.ACTIONS).toContain("cam_fusion360_millturn_audit");
  });

  it("engine reachable via dynamic-import path", async () => {
    const mod = await import("../engines/Fusion360MillTurnBridgeEngine.js");
    expect(mod.Fusion360MillTurnBridgeEngine.count()).toBe(8);
  });
});
