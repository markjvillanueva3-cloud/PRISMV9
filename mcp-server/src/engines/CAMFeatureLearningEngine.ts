/**
 * CAMFeatureLearningEngine — production CAM feature recognition + op suggest
 * =============================================================================
 *
 * Given a target CAM and a free-form geometry hint ("3D mold cavity with deep
 * pockets and 2 thru-holes"), the engine:
 *
 *   1. Tokenizes the geometry hint and runs feature extractors over the tokens.
 *      Each extractor recognizes a feature family (pocket, hole, slot, boss,
 *      thread, fillet, chamfer, contour, surface, web, undercut, thin-wall).
 *   2. For each recognized feature, looks up the per-CAM preferred operation
 *      from FEATURE_TO_OPS_MAP (drawn from CAM-EXHAUST-MS0 catalogs).
 *   3. Returns recognized features + recommended operations + reasoning trace.
 *
 * The engine is rule-based today and serves as the surface that the future
 * Phase-8 LoRA feature classifier will plug into. No throwing on unknown CAM
 * slug — returns empty result with rationale.
 *
 * Authored 2026-04-25 — CAM-EXHAUST-MS0 U-CAM78 (production feature learning).
 */

import {
  camCatalogLoaderEngine,
  type CAMCatalogLoaderEngine,
} from "./CAMCatalogLoaderEngine.js";
import { isCAMSlug } from "../registries/CAMSystemRegistry.js";

export interface FeatureLearnRequest {
  target_cam: string;
  /** Free-form description of the part. Examples:
   *    "rectangular pocket with 4 corner fillets and 2 thru-holes"
   *    "5-axis impeller blade with thin-wall trailing edge"
   *    "drilled boss with M8 tapped hole"
   */
  part_geometry_hint?: string;
}

export interface RecognizedFeature {
  feature: string;
  confidence: number;
  evidence_tokens: ReadonlyArray<string>;
}

export interface RecommendedOperation {
  feature: string;
  operation: string;
  source: "catalog" | "fallback";
}

export interface FeatureLearnResult {
  target_cam: string;
  part_geometry_hint: string;
  recognized_features: RecognizedFeature[];
  recommended_operations: RecommendedOperation[];
  reasoning_chain: string[];
  catalog_coverage_pct: number;
  catalog_param_count: number;
  stub: false;
  mode: "production";
}

/**
 * Each extractor is keyword-driven. Confidence is the proportion of unique
 * keyword classes that hit (e.g. seeing both "pocket" AND "rectangular"
 * counts as one class — "pocket" — but adds a bonus via the second class).
 */
const FEATURE_EXTRACTORS: ReadonlyArray<{
  feature: string;
  /** Primary keywords — any one is enough to recognize the feature. */
  primary: ReadonlyArray<string>;
  /** Bonus keywords — increase confidence when present. */
  bonus: ReadonlyArray<string>;
}> = [
  { feature: "pocket",     primary: ["pocket", "cavity"],                     bonus: ["rectangular", "round", "irregular", "deep", "shallow"] },
  { feature: "hole",       primary: ["hole", "drilled", "drill", "thru"],     bonus: ["counterbore", "countersink", "thru-hole", "blind"] },
  { feature: "slot",       primary: ["slot", "slotted", "groove", "keyway"],  bonus: ["narrow", "deep", "open"] },
  { feature: "boss",       primary: ["boss", "stud", "post", "raised"],       bonus: ["cylindrical", "tall"] },
  { feature: "thread",     primary: ["thread", "tap", "tapped", "threaded"],  bonus: ["m6", "m8", "m10", "m12", "unc", "unf", "metric", "imperial"] },
  { feature: "fillet",     primary: ["fillet", "filleted", "round-edge"],     bonus: ["corner", "internal", "external", "blend"] },
  { feature: "chamfer",    primary: ["chamfer", "chamfered", "bevel"],        bonus: ["edge", "deburr", "break"] },
  { feature: "contour",    primary: ["contour", "profile", "perimeter"],      bonus: ["outline", "edge", "boundary"] },
  { feature: "surface",    primary: ["surface", "freeform", "swept", "lofted", "ruled"], bonus: ["complex", "curved", "blended"] },
  { feature: "web",        primary: ["web", "rib"],                           bonus: ["thin", "structural"] },
  { feature: "undercut",   primary: ["undercut"],                             bonus: ["t-slot", "dovetail", "blind"] },
  { feature: "thin-wall",  primary: ["thin-wall", "thinwall"],                bonus: ["deflection", "delicate", "fragile"] },
  { feature: "impeller",   primary: ["impeller", "blade", "vane", "turbine"], bonus: ["leading-edge", "trailing-edge", "trailing", "5-axis"] },
  { feature: "mold",       primary: ["mold", "die", "cavity-mold"],           bonus: ["hardened", "polished", "p20", "h13"] },
];

/**
 * Per-CAM preferred operation for each feature. Where a CAM has no clear
 * winner, we fall back to a generic operation name and tag source="fallback".
 */
const FEATURE_TO_OPS_MAP: Record<string, Record<string, string>> = {
  pocket: {
    mastercam:        "pocket_2d",
    hypermill:        "pocket_2d",
    fusion360:        "pocket_2d",
    "inventor-hsm":   "pocket_2d",
    solidcam:         "pocket",
    "nx-cam":         "pocket_milling",
    powermill:        "area_clearance",
    "catia-machining": "pocketing",
  },
  hole: {
    mastercam:        "drill",
    hypermill:        "drilling",
    fusion360:        "drill",
    "inventor-hsm":   "drill",
    solidcam:         "drilling",
    "nx-cam":         "spot_drilling",
    powermill:        "drilling",
    "catia-machining": "drilling",
  },
  slot: {
    mastercam:        "slot_milling",
    hypermill:        "slot_2d",
    fusion360:        "slot_2d",
    "inventor-hsm":   "slot_milling",
    solidcam:         "slot",
    "nx-cam":         "planar_milling",
    powermill:        "profile_finishing",
    "catia-machining": "contouring",
  },
  boss: {
    mastercam:        "contour_2d",
    hypermill:        "contour_2d",
    fusion360:        "2d_contour",
    "inventor-hsm":   "contour_2d",
    solidcam:         "profile",
    "nx-cam":         "planar_milling",
    powermill:        "profile_finishing",
    "catia-machining": "contouring",
  },
  thread: {
    mastercam:        "thread_mill",
    hypermill:        "thread_milling",
    fusion360:        "thread_mill",
    "inventor-hsm":   "thread_milling",
    solidcam:         "thread_milling",
    "nx-cam":         "threading",
    powermill:        "thread_milling",
    "catia-machining": "thread_milling",
  },
  fillet: {
    mastercam:        "scallop",
    hypermill:        "scallop_3d",
    fusion360:        "scallop",
    "inventor-hsm":   "scallop_3d",
    solidcam:         "scallop",
    "nx-cam":         "fixed_axis_finish",
    powermill:        "scallop",
    "catia-machining": "isoparametric",
  },
  chamfer: {
    mastercam:        "chamfer",
    hypermill:        "chamfer",
    fusion360:        "chamfer_2d",
    "inventor-hsm":   "chamfer",
    solidcam:         "chamfer",
    "nx-cam":         "chamfer_milling",
    powermill:        "edge_break",
    "catia-machining": "chamfering",
  },
  contour: {
    mastercam:        "contour_2d",
    hypermill:        "contour_2d",
    fusion360:        "2d_contour",
    "inventor-hsm":   "contour_2d",
    solidcam:         "profile",
    "nx-cam":         "planar_milling",
    powermill:        "profile_finishing",
    "catia-machining": "contouring",
  },
  surface: {
    mastercam:        "surface_finish",
    hypermill:        "scallop_3d",
    fusion360:        "parallel_3d",
    "inventor-hsm":   "parallel_3d",
    solidcam:         "hsr_parallel",
    "nx-cam":         "fixed_axis_finish",
    powermill:        "raster",
    "catia-machining": "isoparametric",
  },
  web: {
    mastercam:        "rest_machining",
    hypermill:        "thin_wall_milling",
    fusion360:        "rest_machining",
    "inventor-hsm":   "rest_machining",
    solidcam:         "rest_machining",
    "nx-cam":         "fixed_axis_finish",
    powermill:        "rest_finishing",
    "catia-machining": "rework",
  },
  undercut: {
    mastercam:        "lollipop_5axis",
    hypermill:        "undercut_5axis",
    fusion360:        "swarf_5axis",
    "inventor-hsm":   "undercut_5axis",
    solidcam:         "5x_swarf",
    "nx-cam":         "variable_axis_milling",
    powermill:        "swarf_machining",
    "catia-machining": "5_axis_swarf",
  },
  "thin-wall": {
    mastercam:        "dynamic_mill",
    hypermill:        "trochoidal",
    fusion360:        "adaptive_3d",
    "inventor-hsm":   "adaptive_clearing",
    solidcam:         "imachining",
    "nx-cam":         "adaptive_milling",
    powermill:        "vortex",
    "catia-machining": "high_speed_roughing",
  },
  impeller: {
    mastercam:        "5_axis_swarf",
    hypermill:        "maxx_machining",
    fusion360:        "swarf_5axis",
    "inventor-hsm":   "swarf_5axis",
    solidcam:         "5x_swarf",
    "nx-cam":         "variable_axis_milling",
    powermill:        "swarf_machining",
    "catia-machining": "5_axis_swarf",
  },
  mold: {
    mastercam:        "high_speed_3d",
    hypermill:        "maxx_machining",
    fusion360:        "adaptive_3d",
    "inventor-hsm":   "adaptive_3d",
    solidcam:         "hsr_roughing",
    "nx-cam":         "fixed_axis_finish",
    powermill:        "vortex",
    "catia-machining": "high_speed_roughing",
  },
};

const STOPS = new Set([
  "the", "a", "an", "of", "to", "for", "in", "on", "with", "and", "or", "is", "are", "be",
  "what", "which", "how", "should", "i", "we", "use", "best", "any",
]);

const tokenize = (s: string): string[] =>
  s.toLowerCase().split(/[^a-z0-9_-]+/).filter((t) => t.length > 0 && !STOPS.has(t));

export class CAMFeatureLearningEngine {
  constructor(private loader: CAMCatalogLoaderEngine = camCatalogLoaderEngine) {}

  recognize(req: FeatureLearnRequest): FeatureLearnResult {
    const target = req.target_cam;
    const hint = req.part_geometry_hint ?? "";

    const targetValid = isCAMSlug(target);
    const sys = targetValid ? this.loader.loadOne(target) : null;
    const drift = targetValid
      ? this.loader.loadAll().drift_report.find((d) => d.slug === target)
      : null;
    const coverage = drift?.coverage_pct ?? 0;
    const paramCount = sys?.total_param_count ?? 0;

    const chain: string[] = [];

    if (!targetValid) {
      return {
        target_cam: target,
        part_geometry_hint: hint,
        recognized_features: [],
        recommended_operations: [],
        reasoning_chain: [`unknown CAM slug "${target}" — recognition skipped`],
        catalog_coverage_pct: coverage,
        catalog_param_count: paramCount,
        stub: false,
        mode: "production",
      };
    }

    const tokens = tokenize(hint);
    chain.push(`step 1: tokenized geometry hint → [${tokens.join(", ")}]`);

    if (tokens.length === 0) {
      chain.push("step 2: no scoreable tokens — nothing to recognize");
      return {
        target_cam: target,
        part_geometry_hint: hint,
        recognized_features: [],
        recommended_operations: [],
        reasoning_chain: chain,
        catalog_coverage_pct: coverage,
        catalog_param_count: paramCount,
        stub: false,
        mode: "production",
      };
    }

    const tokenSet = new Set(tokens);
    const recognized: RecognizedFeature[] = [];

    for (const ext of FEATURE_EXTRACTORS) {
      const primaryHits = ext.primary.filter((p) => tokenSet.has(p) || tokens.some((t) => t.includes(p)));
      if (primaryHits.length === 0) continue;
      const bonusHits = ext.bonus.filter((b) => tokenSet.has(b) || tokens.some((t) => t.includes(b)));
      // Confidence: primary hit gives 0.6 baseline + up to 0.4 from bonus matches.
      const confidence = Math.min(
        1.0,
        0.6 + 0.4 * Math.min(1, bonusHits.length / 3),
      );
      recognized.push({
        feature: ext.feature,
        confidence,
        evidence_tokens: [...primaryHits, ...bonusHits],
      });
    }

    chain.push(`step 2: recognized ${recognized.length} feature(s): ${recognized.map((f) => f.feature).join(", ") || "none"}`);

    // Sort by descending confidence, stable alphabetical tie-break
    recognized.sort((a, b) => b.confidence - a.confidence || a.feature.localeCompare(b.feature));

    // Map each recognized feature to a per-CAM operation
    const recommended: RecommendedOperation[] = recognized.map((f) => {
      const opMap = FEATURE_TO_OPS_MAP[f.feature];
      const op = opMap?.[target];
      if (op) {
        return { feature: f.feature, operation: op, source: "catalog" };
      }
      return { feature: f.feature, operation: f.feature, source: "fallback" };
    });

    chain.push(
      recommended.length === 0
        ? "step 3: no operations to recommend"
        : `step 3: mapped ${recommended.length} feature(s) → ops via ${target} catalog`,
    );

    return {
      target_cam: target,
      part_geometry_hint: hint,
      recognized_features: recognized,
      recommended_operations: recommended,
      reasoning_chain: chain,
      catalog_coverage_pct: coverage,
      catalog_param_count: paramCount,
      stub: false,
      mode: "production",
    };
  }
}

export const camFeatureLearningEngine = new CAMFeatureLearningEngine();
