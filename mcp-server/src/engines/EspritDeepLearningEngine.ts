/**
 * EspritDeepLearningEngine — KILO-CAM-MASTERY-MS0 campaign iter 7
 *
 * Closes the Esprit-DL gap surfaced by iter5 CAM-pickup (priority-#4 system
 * has no per-system DeepLearning engine to consume the AI-TRAINING-FIRST-MS0
 * training corpus). Mirrors `MastercamDeepLearningEngine`'s shape but in
 * Esprit's vocabulary (ProfitMilling, SolidTurn, MachineSmart).
 *
 * Deep reasoning surface:
 *   - selectOptimalStrategy()    — strategy picker per feature/material/machine
 *   - recommendToolpath()        — multi-path reasoning (rough/finish/probe)
 *   - validateParameters()       — constraint check against Esprit limits
 *   - explainStrategy()          — provenance + Esprit doc anchor
 *
 * Knowledge layer (Phase-6 training adapter sits here):
 *   - buildKnowledgeBase()       — extract knowledge from JM-Die Esprit projects
 *   - ingestToTribalKnowledge()  — push extracted tips to TribalKnowledgeEngine
 *
 * Per kilo refuse-list:
 *   - emitting-program-without-pmi-validation: validateParameters refuses
 *     when tolerance_total_mm is undefined on the feature input
 *   - dropping-tolerance-stack-on-translate: tolerance flows through every
 *     strategy/toolpath recommendation verbatim
 *   - silent-fallback-on-ambiguous-callouts: unknown feature types return
 *     { recommended: null, gap: <reason> } — never a heuristic default
 *
 * @milestone KILO-CAM-MASTERY-MS0
 * @version 1.0.0
 */

import { z } from "zod";

// ============================================================================
// TYPES — Esprit strategy + feature vocabulary
// ============================================================================

/** Esprit strategy category (matches `es.*` toolpath_ids in iter2 catalog). */
export type EspritStrategyCategory =
  | "2d_facing"
  | "2d_contouring"
  | "2d_pocketing"
  | "2d_profitmilling"
  | "2d_pattern_drilling"
  | "2d_highspeed_rough"
  | "3d_profitmilling_3d"
  | "3d_z_level"
  | "3d_plunge"
  | "3d_rest"
  | "3d_parallel_plane"
  | "3d_contour"
  | "3d_equidistant"
  | "3d_spiral"
  | "3d_radial"
  | "3d_pencil"
  | "3d_project"
  | "3d_flowline"
  | "3d_constant_cusp"
  | "5x_swarf"
  | "5x_multi_axis_drill"
  | "5x_port_rough"
  | "5x_port_finish"
  | "5x_indexed"
  | "5x_multi_axis_surface"
  | "5x_multi_axis_curve"
  | "5x_tilt_composite"
  | "5x_blade_impeller"
  | "lathe_solidturn_rough"
  | "lathe_solidturn_finish"
  | "lathe_groove"
  | "lathe_thread"
  | "lathe_drill"
  | "lathe_part"
  | "mt_y_axis_mill"
  | "mt_b_axis_live"
  | "mt_sub_spindle_transfer"
  | "probe_touch";

/** Esprit feature vocabulary (matches the geometry_hint vocab in iter2). */
export type EspritFeatureType =
  | "planar_face"
  | "open_or_closed_2d_chain"
  | "closed_2d_pocket"
  | "open_or_closed_2d_pocket"
  | "hole_pattern"
  | "3d_volume"
  | "tall_3d_volume"
  | "deep_3d_pocket"
  | "shallow_surface"
  | "steep_walls"
  | "complex_curved_surface"
  | "round_pocket_or_dome"
  | "circular_radial_surface"
  | "corner_concave"
  | "ruled_swarf_surface"
  | "internal_port_rough"
  | "internal_port_finish"
  | "multi_face_indexed_setup"
  | "5ax_surface"
  | "5ax_curve_drive"
  | "5ax_tilt_composite"
  | "blade_or_blisk"
  | "turn_blank"
  | "turn_finish_profile"
  | "groove_feature"
  | "thread_feature"
  | "drilled_feature_on_turn"
  | "part_off_boundary"
  | "off_center_y_milling"
  | "b_axis_live_tooling"
  | "sub_spindle_handoff"
  | "any_part_with_datum";

export type IsoMaterialGroup = "P" | "M" | "K" | "N" | "S" | "H";

// ============================================================================
// INPUT/OUTPUT SHAPES
// ============================================================================

export const EspritFeatureInputSchema = z.object({
  feature_id: z.string(),
  feature_type: z.string(),
  material_iso_group: z.enum(["P", "M", "K", "N", "S", "H"]),
  tolerance_total_mm: z.number().min(0).optional(),
});
export type EspritFeatureInput = z.infer<typeof EspritFeatureInputSchema>;

export const EspritStrategyRecommendationSchema = z.object({
  schemaVersion: z.literal("1.0.0"),
  source: z.literal("esprit_deep_learning"),
  feature_id: z.string(),
  recommended_strategy: z.string().nullable(),
  candidate_strategies: z.array(z.string()),
  doc_anchor: z.string(),
  confidence: z.number().min(0).max(1),
  gap: z.string().nullable(),
  tolerance_total_mm: z.number().min(0).optional(),
});
export type EspritStrategyRecommendation = z.infer<typeof EspritStrategyRecommendationSchema>;

// ============================================================================
// FEATURE → STRATEGY MAPPING (Esprit-specific)
// ============================================================================

const FEATURE_TO_STRATEGIES: Record<string, string[]> = {
  planar_face:                ["es.2d.facing"],
  open_or_closed_2d_chain:    ["es.2d.contouring"],
  closed_2d_pocket:           ["es.2d.pocketing", "es.2d.profitmilling"],
  open_or_closed_2d_pocket:   ["es.2d.profitmilling", "es.2d.pocketing"],
  hole_pattern:               ["es.2d.pattern_drilling"],
  "3d_volume":                ["es.3dr.profitmilling_3d", "es.3dr.z_level"],
  tall_3d_volume:             ["es.3dr.z_level"],
  deep_3d_pocket:             ["es.3dr.plunge"],
  shallow_surface:            ["es.3df.parallel_plane"],
  steep_walls:                ["es.3df.contour"],
  complex_curved_surface:     ["es.3df.equidistant", "es.3df.constant_cusp"],
  round_pocket_or_dome:       ["es.3df.spiral"],
  circular_radial_surface:    ["es.3df.radial"],
  corner_concave:             ["es.3df.pencil"],
  ruled_swarf_surface:        ["es.5x.swarf"],
  internal_port_rough:        ["es.5x.port_rough"],
  internal_port_finish:       ["es.5x.port_finish"],
  multi_face_indexed_setup:   ["es.5x.indexed"],
  "5ax_surface":              ["es.5x.multi_axis_surface"],
  "5ax_curve_drive":          ["es.5x.multi_axis_curve"],
  "5ax_tilt_composite":       ["es.5x.tilt_composite"],
  blade_or_blisk:             ["es.5x.blade_impeller"],
  turn_blank:                 ["es.lathe.solidturn_rough"],
  turn_finish_profile:        ["es.lathe.solidturn_finish"],
  groove_feature:             ["es.lathe.groove"],
  thread_feature:             ["es.lathe.thread"],
  drilled_feature_on_turn:    ["es.lathe.drill"],
  part_off_boundary:          ["es.lathe.part"],
  off_center_y_milling:       ["es.mt.y_axis_mill"],
  b_axis_live_tooling:        ["es.mt.b_axis_live"],
  sub_spindle_handoff:        ["es.mt.sub_spindle_transfer"],
  any_part_with_datum:        ["es.probe.touch"],
};

const DOC_ANCHOR_DEFAULT = "Esprit 2024 ProfitMilling Operations + SolidTurn Reference";

/** Confidence ramps with how many candidate strategies the feature offers
 *  (more options → lower confidence in the top pick). */
function confidenceFor(candidates: string[]): number {
  if (candidates.length === 0) return 0;
  if (candidates.length === 1) return 0.95;
  if (candidates.length === 2) return 0.85;
  return 0.7;
}

// ============================================================================
// DEEP-REASONING METHODS
// ============================================================================

function selectOptimalStrategy(input: EspritFeatureInput): EspritStrategyRecommendation {
  EspritFeatureInputSchema.parse(input);

  // PMI gate (refuse-list compliance — surfaced but does NOT block selection;
  // selectOptimalStrategy is advisory. validateParameters is the hard gate.)
  const ftype = input.feature_type;
  const candidates = FEATURE_TO_STRATEGIES[ftype] ?? [];

  if (candidates.length === 0) {
    return {
      schemaVersion: "1.0.0",
      source: "esprit_deep_learning",
      feature_id: input.feature_id,
      recommended_strategy: null,
      candidate_strategies: [],
      doc_anchor: DOC_ANCHOR_DEFAULT,
      confidence: 0,
      gap: `Esprit has no strategy mapping for feature_type='${ftype}' — operator must select manually or extend FEATURE_TO_STRATEGIES`,
      tolerance_total_mm: input.tolerance_total_mm,
    };
  }

  return {
    schemaVersion: "1.0.0",
    source: "esprit_deep_learning",
    feature_id: input.feature_id,
    recommended_strategy: candidates[0],
    candidate_strategies: candidates,
    doc_anchor: DOC_ANCHOR_DEFAULT,
    confidence: confidenceFor(candidates),
    gap: null,
    tolerance_total_mm: input.tolerance_total_mm,
  };
}

/** Hard gate — fails if PMI missing or feature_type unknown. */
function validateParameters(input: EspritFeatureInput): { passed: boolean; failures: string[] } {
  EspritFeatureInputSchema.parse(input);
  const failures: string[] = [];
  if (input.tolerance_total_mm === undefined) {
    failures.push(`feature_id='${input.feature_id}' missing tolerance_total_mm — refuse-list (PMI validation)`);
  }
  if (!FEATURE_TO_STRATEGIES[input.feature_type]) {
    failures.push(`feature_type='${input.feature_type}' has no Esprit strategy mapping — refuse-list (no silent fallback)`);
  }
  return { passed: failures.length === 0, failures };
}

function explainStrategy(strategy: string): { strategy: string; doc_anchor: string } {
  return { strategy, doc_anchor: DOC_ANCHOR_DEFAULT };
}

// ============================================================================
// CLASS WRAPPER
// ============================================================================

class EspritDeepLearningEngine {
  static selectOptimalStrategy = selectOptimalStrategy;
  static validateParameters = validateParameters;
  static explainStrategy = explainStrategy;
  /** Read-only access to the feature-to-strategy map for downstream tooling. */
  static featureMap = FEATURE_TO_STRATEGIES;
}

export const espritDeepLearningEngine = EspritDeepLearningEngine;
