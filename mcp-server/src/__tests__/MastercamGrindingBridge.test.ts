/**
 * MastercamGrindingBridge.test.ts
 */

import { describe, it, expect } from "vitest";
import {
  MastercamGrindingBridge,
  GrindingKindSchema,
  WheelGritSchema,
  GrindingFeatureSchema,
  type GrindingFeature,
} from "../engines/MastercamGrindingBridge.js";

function feature(over: Partial<GrindingFeature>): GrindingFeature {
  return {
    kind: over.kind ?? "surface_horizontal",
    name: over.name ?? "test",
    workpiece_iso_group: over.workpiece_iso_group ?? "P",
    stock_to_remove_mm: over.stock_to_remove_mm ?? 0.1,
    surface_finish_ra_um: over.surface_finish_ra_um ?? 0.4,
    wheel_dia_mm: over.wheel_dia_mm ?? 200,
    wheel_width_mm: over.wheel_width_mm ?? 20,
    workpiece_dia_mm: over.workpiece_dia_mm,
  };
}

describe("MastercamGrindingBridge — wheelRpmFromSurfaceSpeed", () => {
  it("Vc = π × D × n / 60000 inversion: 30 m/s on 200mm wheel ≈ 2865 rpm", () => {
    const rpm = MastercamGrindingBridge.wheelRpmFromSurfaceSpeed(200, 30);
    // n = 30 × 60000 / (π × 200) ≈ 2864.79
    expect(rpm).toBeGreaterThanOrEqual(2860);
    expect(rpm).toBeLessThanOrEqual(2870);
  });

  it("CBN at 60 m/s on same wheel ≈ 5730 rpm", () => {
    const rpm = MastercamGrindingBridge.wheelRpmFromSurfaceSpeed(200, 60);
    expect(rpm).toBeGreaterThanOrEqual(5725);
    expect(rpm).toBeLessThanOrEqual(5735);
  });

  it("smaller wheel → higher RPM at same surface speed", () => {
    const big = MastercamGrindingBridge.wheelRpmFromSurfaceSpeed(300, 30);
    const small = MastercamGrindingBridge.wheelRpmFromSurfaceSpeed(100, 30);
    expect(small).toBeGreaterThan(big);
  });

  it("throws on non-positive wheel diameter", () => {
    expect(() => MastercamGrindingBridge.wheelRpmFromSurfaceSpeed(0, 30)).toThrow();
    expect(() => MastercamGrindingBridge.wheelRpmFromSurfaceSpeed(-1, 30)).toThrow();
  });

  it("throws on non-positive surface speed", () => {
    expect(() => MastercamGrindingBridge.wheelRpmFromSurfaceSpeed(200, 0)).toThrow();
  });
});

describe("MastercamGrindingBridge — plan", () => {
  it("steel surface horizontal at Ra 0.4 µm: 2 finish + 2 spark-out + medium grit", () => {
    const p = MastercamGrindingBridge.plan(feature({
      kind: "surface_horizontal", workpiece_iso_group: "P",
      surface_finish_ra_um: 0.4, stock_to_remove_mm: 0.1,
    }));
    expect(p.cycle_code).toBe("GRIND:Surface:H");
    expect(p.finish_pass_count).toBe(2);
    expect(p.spark_out_passes).toBe(2);
    expect(p.wheel_grit).toBe("medium_80");
    expect(p.needs_dressing_between_finish).toBe(false);
  });

  it("Inconel cylindrical OD: CBN-speed wheel (60 m/s)", () => {
    const p = MastercamGrindingBridge.plan(feature({
      kind: "cylindrical_od", workpiece_iso_group: "S",
      wheel_dia_mm: 200,
    }));
    expect(p.cycle_code).toBe("GRIND:Cyl:OD");
    // 60 m/s on 200mm wheel ≈ 5730 rpm
    expect(p.wheel_rpm).toBeGreaterThan(5500);
  });

  it("fine finish (Ra 0.1 µm) → 3 finish + 3 spark-out + dressing required", () => {
    const p = MastercamGrindingBridge.plan(feature({
      kind: "surface_horizontal", workpiece_iso_group: "P",
      surface_finish_ra_um: 0.1, stock_to_remove_mm: 0.05,
    }));
    expect(p.finish_pass_count).toBe(3);
    expect(p.spark_out_passes).toBe(3);
    expect(p.needs_dressing_between_finish).toBe(true);
    expect(p.wheel_grit).toBe("extra_fine_220");
  });

  it("rough finish (Ra 3.2 µm) → coarsest grit + 1 spark-out + no dressing", () => {
    const p = MastercamGrindingBridge.plan(feature({
      kind: "surface_horizontal", workpiece_iso_group: "P",
      surface_finish_ra_um: 3.2, stock_to_remove_mm: 0.5,
    }));
    expect(p.wheel_grit).toBe("rough_46");
    expect(p.spark_out_passes).toBe(1);
    expect(p.needs_dressing_between_finish).toBe(false);
  });

  it("rough_pass_count scales with stock to remove (0.5 mm stock → 8 caps)", () => {
    const p = MastercamGrindingBridge.plan(feature({
      kind: "surface_horizontal", workpiece_iso_group: "P",
      stock_to_remove_mm: 0.5, surface_finish_ra_um: 0.4,
    }));
    expect(p.rough_pass_count).toBe(8); // capped at 8
  });

  it("rough_pass_count ≥ 1 even for tiny stock", () => {
    const p = MastercamGrindingBridge.plan(feature({
      kind: "surface_horizontal", workpiece_iso_group: "P",
      stock_to_remove_mm: 0.01, surface_finish_ra_um: 0.4,
    }));
    expect(p.rough_pass_count).toBeGreaterThanOrEqual(1);
  });
});

describe("MastercamGrindingBridge — cycle codes", () => {
  it("cycleCodes returns one entry per grinding kind", () => {
    const codes = MastercamGrindingBridge.cycleCodes();
    expect(Object.keys(codes).length).toBe(8);
    expect(codes.surface_horizontal).toBe("GRIND:Surface:H");
    expect(codes.cylindrical_id).toBe("GRIND:Cyl:ID");
    expect(codes.creep_feed).toBe("GRIND:CreepFeed");
    expect(codes.jig_grinding).toBe("GRIND:Jig");
  });
});

describe("MastercamGrindingBridge — schema validation", () => {
  it("GrindingKindSchema rejects unknown kind", () => {
    const bad: unknown = "thread_grinding";
    expect(() => GrindingKindSchema.parse(bad)).toThrow();
  });

  it("WheelGritSchema rejects unknown grit", () => {
    const bad: unknown = "ultra_fine_800";
    expect(() => WheelGritSchema.parse(bad)).toThrow();
  });

  it("GrindingFeatureSchema rejects negative stock_to_remove_mm", () => {
    expect(() => GrindingFeatureSchema.parse({
      kind: "surface_horizontal", name: "x", workpiece_iso_group: "P",
      stock_to_remove_mm: -1, surface_finish_ra_um: 0.4, wheel_dia_mm: 200, wheel_width_mm: 20,
    })).toThrow();
  });

  it("GrindingFeatureSchema rejects zero surface_finish_ra_um", () => {
    expect(() => GrindingFeatureSchema.parse({
      kind: "surface_horizontal", name: "x", workpiece_iso_group: "P",
      stock_to_remove_mm: 0.1, surface_finish_ra_um: 0, wheel_dia_mm: 200, wheel_width_mm: 20,
    })).toThrow();
  });
});

describe("MastercamGrindingBridge — audit", () => {
  it("auditEngine passes (every kind has cycle code, surface speed table complete)", () => {
    const a = MastercamGrindingBridge.auditEngine();
    expect(a.ok).toBe(true);
    expect(a.errors).toEqual([]);
  });
});

describe("MastercamGrindingBridge — dispatcher round-trip", () => {
  it("ACTIONS array exposes the grinding bridge actions", async () => {
    const mod = await import("../tools/dispatchers/camDispatcher.js");
    expect(mod.ACTIONS).toContain("cam_mastercam_grinding_plan");
    expect(mod.ACTIONS).toContain("cam_mastercam_grinding_wheel_rpm");
    expect(mod.ACTIONS).toContain("cam_mastercam_grinding_cycle_codes");
    expect(mod.ACTIONS).toContain("cam_mastercam_grinding_audit");
  });

  it("engine reachable via dynamic-import path", async () => {
    const mod = await import("../engines/MastercamGrindingBridge.js");
    const p = mod.MastercamGrindingBridge.plan(feature({}));
    expect(p.cycle_code.length).toBeGreaterThan(0);
  });
});
