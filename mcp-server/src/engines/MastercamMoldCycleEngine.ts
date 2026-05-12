/**
 * MastercamMoldCycleEngine — Mold cavity / core machining cycle planner
 *
 * Plans the standard mold-machining cycle sequence for cavity + core
 * inserts (rough → semi-finish → finish → spark-erode prep). Mastercam
 * Mill ships dedicated mold cycles (OptiRough, OptiCore, Surface High
 * Speed Finish) — this engine maps a mold-feature description to the
 * canonical cycle progression + tool sequence.
 *
 * Sister engine: HyperMillMoldCycleEngine (same shape, hyperMILL).
 *
 * @module engines/MastercamMoldCycleEngine
 * @milestone CAM-EXHAUST-MS0 U-CAM-MC-MOLD-01
 */

import { z } from "zod";

// ── Schemas ──────────────────────────────────────────────────────────────────

export const MoldFeatureKindSchema = z.enum([
  "cavity",      // female mold half (concave)
  "core",        // male mold half (convex)
  "slide",       // side-action insert
  "lifter",      // angled lifter insert
  "ejector_pin_pocket",
  "cooling_channel",
  "rib",         // thin rib detail
  "boss",        // boss / standoff
]);
export type MoldFeatureKind = z.infer<typeof MoldFeatureKindSchema>;

export const MoldStageKindSchema = z.enum([
  "rough_adaptive",
  "rough_rest",
  "semi_finish",
  "finish_3axis",
  "finish_5axis",
  "pencil_corner_clean",
  "spark_erode_prep",
]);
export type MoldStageKind = z.infer<typeof MoldStageKindSchema>;

export const MoldFeatureSchema = z.object({
  kind: MoldFeatureKindSchema,
  name: z.string().min(1),
  workpiece_iso_group: z.enum(["P", "M", "K", "N", "S", "H"]),
  /** Hardness in HRC if hardened, otherwise undefined (annealed/pre-hard). */
  hardness_hrc: z.number().min(20).max(70).optional(),
  envelope_mm: z.object({
    length_mm: z.number().positive(),
    width_mm: z.number().positive(),
    depth_mm: z.number().positive(),
  }),
  /** Smallest internal radius — drives finishing tool selection. */
  min_internal_radius_mm: z.number().positive(),
  /** Surface finish target Ra in µm. */
  target_ra_um: z.number().positive(),
  needs_5axis_clean: z.boolean(),
  has_undercut: z.boolean(),
});
export type MoldFeature = z.infer<typeof MoldFeatureSchema>;

export const MoldStageSchema = z.object({
  stage: MoldStageKindSchema,
  cycle_code: z.string().min(1),
  tool_class: z.string().min(1),
  tool_diameter_mm: z.number().positive(),
  stepover_mm: z.number().positive(),
  notes: z.string().min(1),
});
export type MoldStage = z.infer<typeof MoldStageSchema>;

export const MoldPlanSchema = z.object({
  feature_name: z.string().min(1),
  stages: z.array(MoldStageSchema).min(1),
  total_stage_count: z.number().int().positive(),
  needs_hardened_tooling: z.boolean(),
  notes: z.string().min(1),
});
export type MoldPlan = z.infer<typeof MoldPlanSchema>;

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Pick the rough-stage cycle code by feature type. */
function roughCycleFor(kind: MoldFeatureKind): string {
  if (kind === "cavity" || kind === "ejector_pin_pocket") return "MILL3D:OptiRough:Cavity";
  if (kind === "core")  return "MILL3D:OptiRough:Core";
  return "MILL3D:Adaptive";
}

/** Pick the finish-stage cycle code. */
function finishCycleFor(needs5axis: boolean): string {
  return needs5axis ? "AX5:Adaptive:Finish" : "MILL3D:Surface:HSF";
}

/** Choose finishing tool diameter from min internal radius (capped at 16 mm). */
function finishToolDiaFor(minInternalRadiusMm: number): number {
  const max = 16;
  // Tool diameter must be ≤ 2 × min internal radius to fit corner.
  return Math.min(max, 2 * minInternalRadiusMm);
}

/** Stepover from tool diameter + target Ra. */
function finishStepoverFor(toolDiaMm: number, targetRaUm: number): number {
  // Tighter stepover for finer Ra target.
  if (targetRaUm <= 0.4) return Math.max(0.05, toolDiaMm * 0.025);
  if (targetRaUm <= 0.8) return Math.max(0.10, toolDiaMm * 0.05);
  return Math.max(0.20, toolDiaMm * 0.10);
}

// ── Engine ───────────────────────────────────────────────────────────────────

export class MastercamMoldCycleEngine {
  /** Build the full mold-machining cycle plan for a feature. */
  static plan(feature: MoldFeature): MoldPlan {
    const f = MoldFeatureSchema.parse(feature);
    const stages: MoldStage[] = [];

    // Stage 1: rough adaptive (always)
    stages.push({
      stage: "rough_adaptive",
      cycle_code: roughCycleFor(f.kind),
      tool_class: "roughing_endmill",
      tool_diameter_mm: Math.min(20, f.envelope_mm.depth_mm * 0.5),
      stepover_mm: 8,
      notes: `Adaptive rough on ${f.kind} envelope ${f.envelope_mm.length_mm}×${f.envelope_mm.width_mm}×${f.envelope_mm.depth_mm} mm`,
    });

    // Stage 2: rough rest (when transition from large to small tool needed)
    if (f.min_internal_radius_mm < 4) {
      stages.push({
        stage: "rough_rest",
        cycle_code: "MILL3D:RestRough:Stock",
        tool_class: "roughing_endmill",
        tool_diameter_mm: Math.max(3, f.min_internal_radius_mm * 1.5),
        stepover_mm: 2,
        notes: `Rest-rough small features down to ${f.min_internal_radius_mm} mm radius`,
      });
    }

    // Stage 3: semi-finish (always — leaves uniform 0.1-0.3 mm stock)
    stages.push({
      stage: "semi_finish",
      cycle_code: "MILL3D:Surface:Constant",
      tool_class: "ball_rougher",
      tool_diameter_mm: finishToolDiaFor(f.min_internal_radius_mm),
      stepover_mm: 1,
      notes: "Semi-finish leaves 0.1-0.3 mm uniform stock for finishing",
    });

    // Stage 4: finish (3-axis or 5-axis)
    const finishTool = finishToolDiaFor(f.min_internal_radius_mm);
    stages.push({
      stage: f.needs_5axis_clean ? "finish_5axis" : "finish_3axis",
      cycle_code: finishCycleFor(f.needs_5axis_clean),
      tool_class: "ball_finisher",
      tool_diameter_mm: finishTool,
      stepover_mm: finishStepoverFor(finishTool, f.target_ra_um),
      notes: `Finishing for Ra ${f.target_ra_um} µm target on ${f.needs_5axis_clean ? "5-axis" : "3-axis"} kinematic`,
    });

    // Stage 5: pencil cleanup (when corners exist)
    if (f.min_internal_radius_mm < 2) {
      stages.push({
        stage: "pencil_corner_clean",
        cycle_code: "MILL3D:Pencil",
        tool_class: "ball_finisher",
        tool_diameter_mm: Math.max(0.5, f.min_internal_radius_mm),
        stepover_mm: Math.max(0.05, f.min_internal_radius_mm * 0.2),
        notes: "Pencil-clean corners that smaller tools couldn't reach",
      });
    }

    // Stage 6: spark-erode prep (only when hardened OR has undercut)
    const isHardened = f.hardness_hrc !== undefined && f.hardness_hrc >= 50;
    if (isHardened || f.has_undercut) {
      stages.push({
        stage: "spark_erode_prep",
        cycle_code: "MILL3D:EDMPrep",
        tool_class: "ball_finisher",
        tool_diameter_mm: Math.max(0.5, f.min_internal_radius_mm * 0.5),
        stepover_mm: 0.05,
        notes: isHardened
          ? `Hardened workpiece (HRC ${f.hardness_hrc}) — leave EDM stock for spark erosion of fine details`
          : "Undercut features — pocket-and-EDM strategy",
      });
    }

    const needs_hardened_tooling = isHardened || f.workpiece_iso_group === "H" || f.workpiece_iso_group === "S";
    const note_lines = [
      `${f.kind}: ${stages.length} stages`,
      isHardened ? `hardened (HRC ${f.hardness_hrc})` : "annealed/pre-hard",
      needs_hardened_tooling ? "REQUIRES coated/CBN tooling" : "carbide tooling OK",
      f.has_undercut ? "EDM-prep stage included for undercuts" : "no undercut",
    ];

    return MoldPlanSchema.parse({
      feature_name: f.name,
      stages,
      total_stage_count: stages.length,
      needs_hardened_tooling,
      notes: note_lines.join("; "),
    });
  }

  /** Quick check: does this feature require EDM finishing? */
  static needsEdmFinishing(feature: MoldFeature): boolean {
    const f = MoldFeatureSchema.parse(feature);
    const isHardened = f.hardness_hrc !== undefined && f.hardness_hrc >= 50;
    return isHardened || f.has_undercut;
  }

  static auditEngine(): { ok: boolean; errors: string[] } {
    const errors: string[] = [];
    // Smoke-test plan() on a representative cavity feature.
    try {
      const plan = MastercamMoldCycleEngine.plan({
        kind: "cavity", name: "audit_cavity", workpiece_iso_group: "P",
        envelope_mm: { length_mm: 100, width_mm: 80, depth_mm: 30 },
        min_internal_radius_mm: 1, target_ra_um: 0.4,
        needs_5axis_clean: false, has_undercut: false,
      });
      if (plan.total_stage_count !== plan.stages.length) {
        errors.push("audit cavity: total_stage_count != stages.length");
      }
      // Cavity at min_internal_radius < 4 should include rough_rest
      const stages = new Set(plan.stages.map(s => s.stage));
      if (!stages.has("rough_rest")) errors.push("audit cavity: missing rough_rest stage");
      if (!stages.has("pencil_corner_clean")) errors.push("audit cavity: missing pencil_corner_clean stage");
    } catch (e) {
      errors.push(`audit plan() threw: ${(e as Error).message}`);
    }
    return { ok: errors.length === 0, errors };
  }
}

export const mastercamMoldCycleEngine = MastercamMoldCycleEngine;
