/**
 * MastercamMoldCycleEngine.test.ts
 */

import { describe, it, expect } from "vitest";
import {
  MastercamMoldCycleEngine,
  MoldFeatureKindSchema,
  MoldStageKindSchema,
  MoldFeatureSchema,
  MoldPlanSchema,
  type MoldFeature,
  type MoldStage,
  type MoldStageKind,
} from "../engines/MastercamMoldCycleEngine.js";

const HRC_HARDENED_THRESHOLD = 50;
const HRC_OUT_OF_RANGE = 75;
const REST_ROUGH_RADIUS_LIMIT_MM = 4;
const PENCIL_RADIUS_LIMIT_MM = 2;
const FINISH_TOOL_DIA_CAP_MM = 16;

function feature(over: Partial<MoldFeature>): MoldFeature {
  return {
    kind: over.kind ?? "cavity",
    name: over.name ?? "test_feature",
    workpiece_iso_group: over.workpiece_iso_group ?? "P",
    hardness_hrc: over.hardness_hrc,
    envelope_mm: over.envelope_mm ?? { length_mm: 100, width_mm: 80, depth_mm: 30 },
    min_internal_radius_mm: over.min_internal_radius_mm ?? 5,
    target_ra_um: over.target_ra_um ?? 0.8,
    needs_5axis_clean: over.needs_5axis_clean ?? false,
    has_undercut: over.has_undercut ?? false,
  };
}

function hasStage(stages: MoldStage[], kind: MoldStageKind): boolean {
  return stages.some(s => s.stage === kind);
}

function stageOf(stages: MoldStage[], kind: MoldStageKind): MoldStage | undefined {
  return stages.find(s => s.stage === kind);
}

describe("MastercamMoldCycleEngine — plan() base sequence", () => {
  it("simple cavity (radius 5, annealed, no undercut) → exactly 3 stages: rough/semi/finish_3axis", () => {
    const p = MastercamMoldCycleEngine.plan(feature({
      kind: "cavity", min_internal_radius_mm: 5,
    }));
    expect(p.total_stage_count).toBe(3);
    const stageKinds = p.stages.map(s => s.stage);
    expect(stageKinds).toEqual(["rough_adaptive", "semi_finish", "finish_3axis"]);
  });

  it("plan output round-trips through MoldPlanSchema (zod parse succeeds)", () => {
    const p = MastercamMoldCycleEngine.plan(feature({}));
    const reparsed = MoldPlanSchema.parse(p);
    expect(reparsed.feature_name).toBe("test_feature");
    expect(reparsed.stages.length).toBe(p.stages.length);
  });

  it("worst-case cavity (small radius + hardened + undercut) → exactly 6 stages", () => {
    const p = MastercamMoldCycleEngine.plan(feature({
      kind: "core", min_internal_radius_mm: 1, has_undercut: true, hardness_hrc: 55,
    }));
    expect(p.total_stage_count).toBe(p.stages.length);
    expect(p.total_stage_count).toBe(6);
  });

  it("first stage is always rough_adaptive (mandatory entry stage)", () => {
    const p = MastercamMoldCycleEngine.plan(feature({}));
    expect(p.stages[0]?.stage).toBe("rough_adaptive");
  });

  it("rough_adaptive stepover = 8 mm with roughing_endmill tool class", () => {
    const p = MastercamMoldCycleEngine.plan(feature({}));
    const rough = stageOf(p.stages, "rough_adaptive");
    expect(rough?.stepover_mm).toBe(8);
    expect(rough?.tool_class).toBe("roughing_endmill");
  });

  it("semi_finish stage uses MILL3D:Surface:Constant cycle code with 1 mm stepover", () => {
    const p = MastercamMoldCycleEngine.plan(feature({}));
    const semi = stageOf(p.stages, "semi_finish");
    expect(semi?.cycle_code).toBe("MILL3D:Surface:Constant");
    expect(semi?.stepover_mm).toBe(1);
  });
});

describe("MastercamMoldCycleEngine — stage gating logic", () => {
  it("min_internal_radius_mm = 2 (< 4) → adds rough_rest with stepover 2 mm + RestRough cycle", () => {
    const p = MastercamMoldCycleEngine.plan(feature({ min_internal_radius_mm: 2 }));
    const rest = stageOf(p.stages, "rough_rest");
    expect(rest?.cycle_code).toBe("MILL3D:RestRough:Stock");
    expect(rest?.stepover_mm).toBe(2);
  });

  it("min_internal_radius_mm = 4 (boundary, not <) → no rough_rest stage", () => {
    const p = MastercamMoldCycleEngine.plan(feature({ min_internal_radius_mm: REST_ROUGH_RADIUS_LIMIT_MM }));
    expect(hasStage(p.stages, "rough_rest")).toBe(false);
  });

  it("min_internal_radius_mm = 1 (< 2) → adds pencil_corner_clean with stepover 0.2 mm", () => {
    const p = MastercamMoldCycleEngine.plan(feature({ min_internal_radius_mm: 1 }));
    const pencil = stageOf(p.stages, "pencil_corner_clean");
    expect(pencil?.cycle_code).toBe("MILL3D:Pencil");
    expect(pencil?.stepover_mm).toBe(0.2);
  });

  it("min_internal_radius_mm = 2 (boundary, not <) → no pencil_corner_clean stage", () => {
    const p = MastercamMoldCycleEngine.plan(feature({ min_internal_radius_mm: PENCIL_RADIUS_LIMIT_MM }));
    expect(hasStage(p.stages, "pencil_corner_clean")).toBe(false);
  });

  it("hardened workpiece (HRC 55) → spark_erode_prep with HRC-stamped note + flags hardened tooling", () => {
    const p = MastercamMoldCycleEngine.plan(feature({ hardness_hrc: 55 }));
    const edm = stageOf(p.stages, "spark_erode_prep");
    expect(edm?.cycle_code).toBe("MILL3D:EDMPrep");
    expect(edm?.notes).toContain("Hardened workpiece (HRC 55)");
    expect(p.needs_hardened_tooling).toBe(true);
    expect(p.notes).toContain("REQUIRES coated/CBN tooling");
  });

  it("has_undercut=true (annealed) → spark_erode_prep with undercut-specific note", () => {
    const p = MastercamMoldCycleEngine.plan(feature({ has_undercut: true }));
    const edm = stageOf(p.stages, "spark_erode_prep");
    expect(edm?.notes).toBe("Undercut features — pocket-and-EDM strategy");
  });

  it("HRC 49 (just below threshold) + no undercut → no spark_erode_prep", () => {
    const p = MastercamMoldCycleEngine.plan(feature({ hardness_hrc: HRC_HARDENED_THRESHOLD - 1 }));
    expect(hasStage(p.stages, "spark_erode_prep")).toBe(false);
  });

  it("needs_5axis_clean=true → finish_5axis with AX5:Adaptive:Finish, no finish_3axis present", () => {
    const p = MastercamMoldCycleEngine.plan(feature({ needs_5axis_clean: true }));
    const fin = stageOf(p.stages, "finish_5axis");
    expect(fin?.cycle_code).toBe("AX5:Adaptive:Finish");
    expect(hasStage(p.stages, "finish_3axis")).toBe(false);
  });

  it("needs_5axis_clean=false → finish_3axis with MILL3D:Surface:HSF, no finish_5axis present", () => {
    const p = MastercamMoldCycleEngine.plan(feature({ needs_5axis_clean: false }));
    const fin = stageOf(p.stages, "finish_3axis");
    expect(fin?.cycle_code).toBe("MILL3D:Surface:HSF");
    expect(hasStage(p.stages, "finish_5axis")).toBe(false);
  });
});

describe("MastercamMoldCycleEngine — cycle code routing by feature kind", () => {
  it("cavity → rough cycle MILL3D:OptiRough:Cavity", () => {
    const p = MastercamMoldCycleEngine.plan(feature({ kind: "cavity" }));
    expect(stageOf(p.stages, "rough_adaptive")?.cycle_code).toBe("MILL3D:OptiRough:Cavity");
  });

  it("core → rough cycle MILL3D:OptiRough:Core", () => {
    const p = MastercamMoldCycleEngine.plan(feature({ kind: "core" }));
    expect(stageOf(p.stages, "rough_adaptive")?.cycle_code).toBe("MILL3D:OptiRough:Core");
  });

  it("ejector_pin_pocket (concave) → uses cavity rough cycle (shared concave logic)", () => {
    const p = MastercamMoldCycleEngine.plan(feature({ kind: "ejector_pin_pocket" }));
    expect(stageOf(p.stages, "rough_adaptive")?.cycle_code).toBe("MILL3D:OptiRough:Cavity");
  });

  it("slide kind → falls through to MILL3D:Adaptive (generic)", () => {
    const p = MastercamMoldCycleEngine.plan(feature({ kind: "slide" }));
    expect(stageOf(p.stages, "rough_adaptive")?.cycle_code).toBe("MILL3D:Adaptive");
  });

  it("lifter kind → falls through to MILL3D:Adaptive", () => {
    const p = MastercamMoldCycleEngine.plan(feature({ kind: "lifter" }));
    expect(stageOf(p.stages, "rough_adaptive")?.cycle_code).toBe("MILL3D:Adaptive");
  });

  it("rib kind → falls through to MILL3D:Adaptive", () => {
    const p = MastercamMoldCycleEngine.plan(feature({ kind: "rib" }));
    expect(stageOf(p.stages, "rough_adaptive")?.cycle_code).toBe("MILL3D:Adaptive");
  });

  it("boss kind → falls through to MILL3D:Adaptive", () => {
    const p = MastercamMoldCycleEngine.plan(feature({ kind: "boss" }));
    expect(stageOf(p.stages, "rough_adaptive")?.cycle_code).toBe("MILL3D:Adaptive");
  });
});

describe("MastercamMoldCycleEngine — finishing tool diameter + stepover math", () => {
  it("min_internal_radius_mm = 50 → finish tool dia capped at 16 mm", () => {
    const p = MastercamMoldCycleEngine.plan(feature({ min_internal_radius_mm: 50 }));
    expect(stageOf(p.stages, "finish_3axis")?.tool_diameter_mm).toBe(FINISH_TOOL_DIA_CAP_MM);
  });

  it("min_internal_radius_mm = 3 → finish tool dia = 6 mm (2 × radius corner-fit)", () => {
    const p = MastercamMoldCycleEngine.plan(feature({ min_internal_radius_mm: 3 }));
    expect(stageOf(p.stages, "finish_3axis")?.tool_diameter_mm).toBeCloseTo(6, 6);
  });

  it("Ra 0.4 µm tier → stepover = 2.5% of tool dia (0.25 mm on 10 mm tool)", () => {
    const p = MastercamMoldCycleEngine.plan(feature({ target_ra_um: 0.4, min_internal_radius_mm: 5 }));
    expect(stageOf(p.stages, "finish_3axis")?.stepover_mm).toBeCloseTo(0.25, 3);
  });

  it("Ra 0.8 µm tier → stepover = 5% of tool dia (0.5 mm on 10 mm tool)", () => {
    const p = MastercamMoldCycleEngine.plan(feature({ target_ra_um: 0.8, min_internal_radius_mm: 5 }));
    expect(stageOf(p.stages, "finish_3axis")?.stepover_mm).toBeCloseTo(0.5, 3);
  });

  it("Ra 3.2 µm tier → stepover = 10% of tool dia (1.0 mm on 10 mm tool)", () => {
    const p = MastercamMoldCycleEngine.plan(feature({ target_ra_um: 3.2, min_internal_radius_mm: 5 }));
    expect(stageOf(p.stages, "finish_3axis")?.stepover_mm).toBeCloseTo(1.0, 3);
  });

  it("tighter Ra (0.4 µm) yields strictly smaller stepover than rough Ra (3.2 µm)", () => {
    const fineStep = stageOf(MastercamMoldCycleEngine.plan(feature({ target_ra_um: 0.4 })).stages, "finish_3axis")?.stepover_mm ?? 999;
    const roughStep = stageOf(MastercamMoldCycleEngine.plan(feature({ target_ra_um: 3.2 })).stages, "finish_3axis")?.stepover_mm ?? 0;
    expect(fineStep).toBeLessThan(roughStep);
  });
});

describe("MastercamMoldCycleEngine — needs_hardened_tooling flag", () => {
  it("ISO group H (hardened steel) → needs_hardened_tooling=true even without HRC", () => {
    const p = MastercamMoldCycleEngine.plan(feature({ workpiece_iso_group: "H" }));
    expect(p.needs_hardened_tooling).toBe(true);
  });

  it("ISO group S (superalloy) → needs_hardened_tooling=true", () => {
    const p = MastercamMoldCycleEngine.plan(feature({ workpiece_iso_group: "S" }));
    expect(p.needs_hardened_tooling).toBe(true);
  });

  it("ISO group P annealed → needs_hardened_tooling=false (carbide OK note in plan notes)", () => {
    const p = MastercamMoldCycleEngine.plan(feature({ workpiece_iso_group: "P" }));
    expect(p.needs_hardened_tooling).toBe(false);
    expect(p.notes).toContain("carbide tooling OK");
  });

  it("ISO group K (cast iron) annealed → needs_hardened_tooling=false", () => {
    const p = MastercamMoldCycleEngine.plan(feature({ workpiece_iso_group: "K" }));
    expect(p.needs_hardened_tooling).toBe(false);
  });
});

describe("MastercamMoldCycleEngine — needsEdmFinishing()", () => {
  it("hardened (HRC 55) → true", () => {
    expect(MastercamMoldCycleEngine.needsEdmFinishing(feature({ hardness_hrc: 55 }))).toBe(true);
  });

  it("hardened at threshold (HRC 50) → true", () => {
    expect(MastercamMoldCycleEngine.needsEdmFinishing(feature({ hardness_hrc: HRC_HARDENED_THRESHOLD }))).toBe(true);
  });

  it("just below threshold (HRC 49) without undercut → false", () => {
    expect(MastercamMoldCycleEngine.needsEdmFinishing(feature({ hardness_hrc: HRC_HARDENED_THRESHOLD - 1 }))).toBe(false);
  });

  it("has undercut (annealed) → true", () => {
    expect(MastercamMoldCycleEngine.needsEdmFinishing(feature({ has_undercut: true }))).toBe(true);
  });

  it("annealed + no undercut → false", () => {
    expect(MastercamMoldCycleEngine.needsEdmFinishing(feature({ hardness_hrc: 30 }))).toBe(false);
  });

  it("HRC undefined + no undercut → false", () => {
    expect(MastercamMoldCycleEngine.needsEdmFinishing(feature({}))).toBe(false);
  });
});

describe("MastercamMoldCycleEngine — schema validation", () => {
  it("MoldFeatureKindSchema rejects unknown kind 'gate'", () => {
    expect(() => MoldFeatureKindSchema.parse("gate")).toThrow();
  });

  it("MoldStageKindSchema rejects unknown stage 'polish'", () => {
    expect(() => MoldStageKindSchema.parse("polish")).toThrow();
  });

  it("MoldFeatureSchema rejects negative envelope length", () => {
    expect(() => MoldFeatureSchema.parse({
      kind: "cavity", name: "x", workpiece_iso_group: "P",
      envelope_mm: { length_mm: -1, width_mm: 80, depth_mm: 30 },
      min_internal_radius_mm: 1, target_ra_um: 0.4,
      needs_5axis_clean: false, has_undercut: false,
    })).toThrow();
  });

  it("MoldFeatureSchema rejects HRC out of physical range (75)", () => {
    expect(() => MoldFeatureSchema.parse({
      kind: "cavity", name: "x", workpiece_iso_group: "P", hardness_hrc: HRC_OUT_OF_RANGE,
      envelope_mm: { length_mm: 100, width_mm: 80, depth_mm: 30 },
      min_internal_radius_mm: 1, target_ra_um: 0.4,
      needs_5axis_clean: false, has_undercut: false,
    })).toThrow();
  });

  it("MoldFeatureSchema rejects zero target_ra_um (must be positive)", () => {
    expect(() => MoldFeatureSchema.parse({
      kind: "cavity", name: "x", workpiece_iso_group: "P",
      envelope_mm: { length_mm: 100, width_mm: 80, depth_mm: 30 },
      min_internal_radius_mm: 1, target_ra_um: 0,
      needs_5axis_clean: false, has_undercut: false,
    })).toThrow();
  });

  it("MoldFeatureSchema rejects empty name (min(1) constraint)", () => {
    expect(() => MoldFeatureSchema.parse({
      kind: "cavity", name: "", workpiece_iso_group: "P",
      envelope_mm: { length_mm: 100, width_mm: 80, depth_mm: 30 },
      min_internal_radius_mm: 1, target_ra_um: 0.4,
      needs_5axis_clean: false, has_undercut: false,
    })).toThrow();
  });

  it("MoldFeatureSchema rejects unknown ISO group 'X'", () => {
    expect(() => MoldFeatureSchema.parse({
      kind: "cavity", name: "x", workpiece_iso_group: "X",
      envelope_mm: { length_mm: 100, width_mm: 80, depth_mm: 30 },
      min_internal_radius_mm: 1, target_ra_um: 0.4,
      needs_5axis_clean: false, has_undercut: false,
    })).toThrow();
  });
});

describe("MastercamMoldCycleEngine — audit", () => {
  it("auditEngine returns ok=true with empty errors array", () => {
    const a = MastercamMoldCycleEngine.auditEngine();
    expect(a.ok).toBe(true);
    expect(a.errors).toEqual([]);
  });
});

describe("MastercamMoldCycleEngine — dispatcher round-trip", () => {
  it("ACTIONS array exposes the 3 mold-cycle actions", async () => {
    const mod = await import("../tools/dispatchers/camDispatcher.js");
    expect(mod.ACTIONS).toContain("cam_mastercam_mold_plan");
    expect(mod.ACTIONS).toContain("cam_mastercam_mold_needs_edm");
    expect(mod.ACTIONS).toContain("cam_mastercam_mold_audit");
  });

  it("engine reachable via dynamic-import path returns plan with feature_name set", async () => {
    const mod = await import("../engines/MastercamMoldCycleEngine.js");
    const p = mod.MastercamMoldCycleEngine.plan(feature({ name: "dispatch_test" }));
    expect(p.feature_name).toBe("dispatch_test");
    expect(p.stages.length).toBeGreaterThanOrEqual(3);
  });
});
