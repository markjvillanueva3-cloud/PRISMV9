/**
 * KiloHyperCadFeatureTaggerEngine — KILO-CAM-MASTERY-MS0 iter 4
 *
 * Closes the user-priority-#1 hyperCAD gap (camDispatcher had only 4
 * `hypercads_mock_*` actions). hyperCAD-S itself doesn't compute toolpaths
 * — it exports geometry with metadata that hyperMILL OptiRough consumes
 * via the ProcessFeatureCatalog (PFC) mechanism. This engine emits that
 * metadata blob from a CAD-AI feature list, letting hyperMILL skip its
 * own feature-recognition pass and start straight from kilo's tags.
 *
 * Bridge contract (pure function — no I/O, no MCP imports):
 *   tag_hypercad_features(cadGeometry) -> HyperCadFeatureTagSet
 *
 * The tag set is the hyperCAD-S → hyperMILL handoff format:
 *   - One `tag` per CAD feature (pocket/face/hole/slot/thread/chamfer/fillet)
 *   - Each tag carries dimensional hints (width/depth/heightOrDepth)
 *   - Optional tolerance_total_mm (preserved per kilo refuse-list)
 *   - Optional recommended_cycle (a hyperMILL strategy hint — never silently
 *     overridden, always operator-overridable per refuse-list)
 *
 * Per kilo's refuse-list (verified — see test file):
 *   - emitting-program-without-pmi-validation: tagger surfaces missing
 *     tolerance values rather than heuristic-filling
 *   - dropping-tolerance-stack-on-translate: tolerance_total_mm flows
 *     through verbatim if present on source feature
 *   - silent-fallback-on-ambiguous-callouts: unknown feature types are
 *     surfaced in `unhandled_feature_types[]` (NOT silently coerced)
 *
 * Source for the PFC category mapping:
 *   - hyperMILL 2024 ProcessFeatureCatalog manual §3.1 (feature types)
 *   - hyperCAD-S Geometry Export reference (PFC-XML emission format)
 *
 * @milestone KILO-CAM-MASTERY-MS0
 * @version 1.0.0
 */

import { z } from "zod";

// ============================================================================
// INPUT SHAPE — minimal CADGeometry slice (no import from echo's
// CamBridgeKitEngine; that file is uncommitted in shared tree as of 2026-05-24)
// ============================================================================

/**
 * Per-feature CAD-AI shape consumed by the tagger. Same minimal slice the
 * cad_cam_handoff bridge accepts (CamBridgeKitEngine.CADGeometry.features[]
 * — schema dedupe on echo's merge per U-KILO-CAM-SFC-SCHEMA-DEDUPE).
 */
export const CadFeatureInputSchema = z.object({
  id: z.string(),
  type: z.string(),
  cycle_hint: z.string().optional(),
  tolerance_total_mm: z.number().min(0).optional(),
  /** Optional bounding-box shape per feature — drives PFC dimension hints. */
  dimension_mm: z.object({
    width: z.number().min(0).optional(),
    depth: z.number().min(0).optional(),
    height_or_depth: z.number().min(0).optional(),
  }).optional(),
});
export type CadFeatureInput = z.infer<typeof CadFeatureInputSchema>;

export const CadGeometrySliceSchema = z.object({
  part_id: z.string(),
  features: z.array(CadFeatureInputSchema).min(1),
  material_iso_group: z.enum(["P", "M", "K", "N", "S", "H"]),
});
export type CadGeometrySlice = z.infer<typeof CadGeometrySliceSchema>;

// ============================================================================
// OUTPUT SHAPE — hyperMILL ProcessFeatureCatalog tag set
// ============================================================================

/**
 * hyperMILL PFC categories — the 7 recognized feature classes that
 * hyperMILL Feature Recognition handles natively. Sourced from hyperMILL
 * 2024 PFC manual §3.1.
 */
export const HyperMillPfcCategorySchema = z.enum([
  "pocket",
  "face",
  "hole",
  "slot",
  "thread",
  "chamfer",
  "fillet",
]);
export type HyperMillPfcCategory = z.infer<typeof HyperMillPfcCategorySchema>;

export const HyperCadFeatureTagSchema = z.object({
  feature_id: z.string(),
  pfc_category: HyperMillPfcCategorySchema,
  dimension_mm: z.object({
    width: z.number().min(0).optional(),
    depth: z.number().min(0).optional(),
    height_or_depth: z.number().min(0).optional(),
  }),
  tolerance_total_mm: z.number().min(0).optional(),
  recommended_cycle: z.string().optional(),
});
export type HyperCadFeatureTag = z.infer<typeof HyperCadFeatureTagSchema>;

export const HyperCadFeatureTagSetSchema = z.object({
  schemaVersion: z.literal("1.0.0"),
  source: z.literal("kilo_hypercad_feature_tagger"),
  part_id: z.string(),
  material_iso_group: z.enum(["P", "M", "K", "N", "S", "H"]),
  tags: z.array(HyperCadFeatureTagSchema).min(1),
  /** Features whose type didn't map to a known PFC category — kilo
   *  refuse-list: never silently coerce. */
  unhandled_feature_types: z.array(z.string()),
  /** Features missing tolerance_total_mm — surfaced for operator review
   *  rather than heuristic-filled (kilo refuse-list compliance). */
  features_missing_tolerance: z.array(z.string()),
});
export type HyperCadFeatureTagSet = z.infer<typeof HyperCadFeatureTagSetSchema>;

// ============================================================================
// TYPE -> PFC CATEGORY mapping
// hyperMILL recognizes these 7 categories. Anything else is surfaced as
// unhandled (per refuse-list).
// ============================================================================

const FEATURE_TYPE_TO_PFC: Record<string, HyperMillPfcCategory> = {
  pocket: "pocket",
  cavity: "pocket",
  face: "face",
  facing: "face",
  hole: "hole",
  drill: "hole",
  drill_hole: "hole",
  bore: "hole",
  counterbore: "hole",
  slot: "slot",
  groove: "slot",
  thread: "thread",
  tapped_hole: "thread",
  chamfer: "chamfer",
  fillet: "fillet",
  round: "fillet",
};

/**
 * hyperMILL strategy hints per PFC category. Conservative defaults —
 * hyperMILL operator can always override; this is a hint not a mandate.
 * Source: hyperMILL 2024 Strategy Picker default mappings.
 */
const PFC_CATEGORY_TO_CYCLE: Record<HyperMillPfcCategory, string> = {
  pocket: "OptiRough",
  face: "Face Milling",
  hole: "Drilling",
  slot: "Trochoidal Slot",
  thread: "Thread Milling",
  chamfer: "Chamfer Milling",
  fillet: "Fillet Finish",
};

function tagHyperCadFeatures(cad: CadGeometrySlice): HyperCadFeatureTagSet {
  CadGeometrySliceSchema.parse(cad);
  const tags: HyperCadFeatureTag[] = [];
  const unhandled: string[] = [];
  const missingTolerance: string[] = [];

  for (const f of cad.features) {
    const pfc = FEATURE_TYPE_TO_PFC[f.type.toLowerCase()];
    if (!pfc) {
      unhandled.push(f.type);
      continue; // do NOT emit a tag for unknown types — refuse-list compliance
    }
    if (f.tolerance_total_mm === undefined) {
      missingTolerance.push(f.id);
    }
    tags.push({
      feature_id: f.id,
      pfc_category: pfc,
      dimension_mm: f.dimension_mm ?? {},
      tolerance_total_mm: f.tolerance_total_mm,
      recommended_cycle: PFC_CATEGORY_TO_CYCLE[pfc],
    });
  }

  return {
    schemaVersion: "1.0.0",
    source: "kilo_hypercad_feature_tagger",
    part_id: cad.part_id,
    material_iso_group: cad.material_iso_group,
    tags,
    unhandled_feature_types: unhandled,
    features_missing_tolerance: missingTolerance,
  };
}

// ============================================================================
// CLASS WRAPPER (project rule: engines as classes with static methods)
// ============================================================================

class KiloHyperCadFeatureTaggerEngine {
  static tagHyperCadFeatures = tagHyperCadFeatures;
}

export const kiloHyperCadFeatureTaggerEngine = KiloHyperCadFeatureTaggerEngine;
