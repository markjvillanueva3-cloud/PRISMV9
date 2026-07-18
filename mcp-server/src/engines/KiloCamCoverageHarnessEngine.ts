/**
 * KiloCamCoverageHarnessEngine — KILO-CAM-MASTERY-MS0 campaign iter 4
 *
 * Phase-5 every-toolpath coverage planner. Given a CAD-AI part with
 * recognized features AND a per-system toolpath catalog, returns the
 * "use every toolpath" plan — one operation per toolpath, with the
 * planner picking a target feature whose `geometry_hint` matches the
 * toolpath's geometry_hint (so the toolpath is at least geometrically
 * valid on the part).
 *
 * Toolpaths with NO matching feature on the part are surfaced as
 * `unsatisfiable_toolpaths[]` — kilo refuse-list: never silently skip,
 * always tell the operator what's missing.
 *
 * The planner is INTENTIONALLY breadth-first (one op per toolpath, not
 * the most efficient roughing chain) — Phase 5 only proves "PRISM can
 * use every toolpath," not "PRISM picks the best one." Phase 6 is the
 * optimization pass that picks the best subset.
 *
 * Per kilo refuse-list:
 *   - no-silent-fallback-on-ambiguous: missing feature targets are
 *     surfaced in unsatisfiable_toolpaths (NOT silently skipped)
 *   - dropping-tolerance-stack-on-translate: tolerance flows from
 *     feature to plan_step verbatim
 *   - emitting-program-without-pmi-validation: planner refuses to
 *     return a plan if ANY feature in the part is missing tolerance
 *     (uses HyperCadFeatureTagSet's features_missing_tolerance[] from
 *     iter4 of the prior loop — pmiSurfacePass option opts out)
 *
 * @milestone KILO-CAM-MASTERY-MS0
 * @version 1.0.0
 */

import { z } from "zod";

// ============================================================================
// INPUT SHAPES
// ============================================================================

export const PartFeatureSchema = z.object({
  id: z.string(),
  type: z.string(),
  /** Same geometry_hint vocab the toolpath catalog uses (planar_face,
   *  3d_roughing_volume, ruled_swarf_surface, etc.). The matcher joins
   *  here. */
  geometry_hint: z.string(),
  tolerance_total_mm: z.number().min(0).optional(),
});
export type PartFeature = z.infer<typeof PartFeatureSchema>;

export const PartGeometrySchema = z.object({
  part_id: z.string(),
  features: z.array(PartFeatureSchema).min(1),
  material_iso_group: z.enum(["P", "M", "K", "N", "S", "H"]),
});
export type PartGeometry = z.infer<typeof PartGeometrySchema>;

export const ToolpathRefSchema = z.object({
  id: z.string(),
  category: z.string(),
  geometry_hint: z.string(),
});
export type ToolpathRef = z.infer<typeof ToolpathRefSchema>;

// ============================================================================
// OUTPUT SHAPES
// ============================================================================

export const PlanStepSchema = z.object({
  op_index: z.number().int().min(0),
  toolpath_id: z.string(),
  target_feature_id: z.string(),
  /** Whether the geometry_hint matched perfectly or via the fallback
   *  category-only match (lower-confidence — operator should review). */
  match_kind: z.enum(["geometry_exact", "category_fallback"]),
  tolerance_total_mm: z.number().min(0).optional(),
});
export type PlanStep = z.infer<typeof PlanStepSchema>;

export const CoveragePlanSchema = z.object({
  schemaVersion: z.literal("1.0.0"),
  source: z.literal("kilo_cam_coverage_harness"),
  system: z.string(),
  part_id: z.string(),
  material_iso_group: z.enum(["P", "M", "K", "N", "S", "H"]),
  plan_steps: z.array(PlanStepSchema),
  covered_toolpath_ids: z.array(z.string()),
  unsatisfiable_toolpaths: z.array(z.object({
    toolpath_id: z.string(),
    reason: z.string(),
  })),
  coverage_pct: z.number().min(0).max(100),
  pmi_gate: z.object({
    passed: z.boolean(),
    features_missing_tolerance: z.array(z.string()),
  }),
});
export type CoveragePlan = z.infer<typeof CoveragePlanSchema>;

// ============================================================================
// PLANNING
// ============================================================================

export interface PlanOpts {
  /** When true (default), planner refuses to emit a plan if PMI gate
   *  fails (any feature missing tolerance). Set false ONLY for Phase-5
   *  fixture testing with synthetic features. */
  pmiSurfacePass?: boolean;
  /** When set, only consider toolpaths in this list. Defaults to all. */
  toolpath_allowlist?: string[];
}

/** Map of toolpath.category → feature.types that satisfy it as a
 *  category-fallback match. Mirrors the hyperMILL PFC mapping in
 *  KiloHyperCadFeatureTaggerEngine. */
const CATEGORY_FALLBACK: Record<string, string[]> = {
  face: ["face", "facing", "planar_face"],
  pocket: ["pocket", "cavity", "3d_roughing_volume", "3d_pocket"],
  profile: ["contour", "profile"],
  hole: ["hole", "drill", "drill_hole", "bore", "counterbore"],
  thread: ["thread", "tapped_hole"],
  finish_surface: ["surface", "shallow_surface", "complex_curved_surface"],
  fillet: ["fillet", "round"],
  slot: ["slot", "groove"],
  // 5axis fallback intentionally narrow — wide-net would silently match
  // surface-type features to specialty paths (blade/impeller/port). Specialty
  // toolpaths must match exact geometry_hint or surface as unsatisfiable.
  "5axis": ["swarf"],
  turn: ["turn", "groove", "thread"],
  probe: ["any"],
  engraving: ["text", "engrave"],
  indexed: ["any"],
  deburr: ["edge"],
  feature: ["any"],
};

function planCoverage(
  part: PartGeometry,
  system: string,
  toolpaths: ToolpathRef[],
  opts?: PlanOpts,
): CoveragePlan {
  PartGeometrySchema.parse(part);

  // PMI gate
  const missingTolerance = part.features
    .filter((f) => f.tolerance_total_mm === undefined)
    .map((f) => f.id);
  const pmiPassed = missingTolerance.length === 0;
  const pmiSurfacePass = opts?.pmiSurfacePass ?? true;
  if (pmiSurfacePass && !pmiPassed) {
    // R12 fail-loud: refuse-list says never silently emit a program
    // without PMI validation. We still RETURN the plan shape (so the
    // caller can read the failure detail) — with an empty plan_steps
    // array — but we surface the gate failure clearly.
    return {
      schemaVersion: "1.0.0",
      source: "kilo_cam_coverage_harness",
      system,
      part_id: part.part_id,
      material_iso_group: part.material_iso_group,
      plan_steps: [],
      covered_toolpath_ids: [],
      unsatisfiable_toolpaths: [],
      coverage_pct: 0,
      pmi_gate: { passed: false, features_missing_tolerance: missingTolerance },
    };
  }

  const allowed = opts?.toolpath_allowlist
    ? new Set(opts.toolpath_allowlist)
    : null;
  const planSteps: PlanStep[] = [];
  const covered: string[] = [];
  const unsatisfiable: Array<{ toolpath_id: string; reason: string }> = [];
  let opIndex = 0;

  for (const tp of toolpaths) {
    if (allowed && !allowed.has(tp.id)) continue;

    // 1. Try exact geometry_hint match
    const exact = part.features.find((f) => f.geometry_hint === tp.geometry_hint);
    if (exact) {
      planSteps.push({
        op_index: opIndex++,
        toolpath_id: tp.id,
        target_feature_id: exact.id,
        match_kind: "geometry_exact",
        tolerance_total_mm: exact.tolerance_total_mm,
      });
      covered.push(tp.id);
      continue;
    }

    // 2. Category-fallback (lower confidence)
    const fallbackTypes = CATEGORY_FALLBACK[tp.category] ?? [];
    if (fallbackTypes.includes("any")) {
      // Probe / indexed / feature — any feature works
      const first = part.features[0];
      planSteps.push({
        op_index: opIndex++,
        toolpath_id: tp.id,
        target_feature_id: first.id,
        match_kind: "category_fallback",
        tolerance_total_mm: first.tolerance_total_mm,
      });
      covered.push(tp.id);
      continue;
    }
    const fallback = part.features.find((f) =>
      fallbackTypes.some((needle) => f.type.toLowerCase().includes(needle))
    );
    if (fallback) {
      planSteps.push({
        op_index: opIndex++,
        toolpath_id: tp.id,
        target_feature_id: fallback.id,
        match_kind: "category_fallback",
        tolerance_total_mm: fallback.tolerance_total_mm,
      });
      covered.push(tp.id);
      continue;
    }

    // 3. Unsatisfiable — surface, do not silently skip
    unsatisfiable.push({
      toolpath_id: tp.id,
      reason: `no feature with geometry_hint='${tp.geometry_hint}' OR category-fallback match for category='${tp.category}'`,
    });
  }

  const considered = allowed
    ? toolpaths.filter((tp) => allowed.has(tp.id)).length
    : toolpaths.length;
  const coveragePct = considered === 0
    ? 0
    : Math.round((covered.length / considered) * 10000) / 100;

  return {
    schemaVersion: "1.0.0",
    source: "kilo_cam_coverage_harness",
    system,
    part_id: part.part_id,
    material_iso_group: part.material_iso_group,
    plan_steps: planSteps,
    covered_toolpath_ids: covered,
    unsatisfiable_toolpaths: unsatisfiable,
    coverage_pct: coveragePct,
    pmi_gate: { passed: pmiPassed, features_missing_tolerance: missingTolerance },
  };
}

// ============================================================================
// CLASS WRAPPER
// ============================================================================

class KiloCamCoverageHarnessEngine {
  static planCoverage = planCoverage;
}

export const kiloCamCoverageHarnessEngine = KiloCamCoverageHarnessEngine;
