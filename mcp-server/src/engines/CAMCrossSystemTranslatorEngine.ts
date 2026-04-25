/**
 * CAMCrossSystemTranslatorEngine — production cross-CAM parameter translator
 * =============================================================================
 *
 * Translates a parameterized CAM operation from a source CAM to a target CAM.
 * Each CAM exposes the same physical knobs (rpm, feed, ap, ae, ...) under
 * different parameter names — this engine canonicalizes the source params and
 * re-projects them onto the target CAM's vocabulary.
 *
 * Mapping strategy (CAM-EXHAUST-MS0 U-CAM75):
 *   1. Canonical-name resolution — every source parameter is matched against
 *      the PARAMETER_EQUIVALENTS table by case-insensitive substring. Match
 *      gives a canonical key (e.g. "spindle_rpm" → "rpm").
 *   2. Operation-name mapping — common operation aliases (pocket_2d → pocket,
 *      adaptive_3d → adaptive, etc.) collapse to a canonical operation,
 *      then re-project to the target CAM's preferred name when known.
 *   3. Loss accounting — any source param that didn't match any canonical
 *      bucket is returned in `unmapped_parameters` with a one-line reason.
 *
 * Engine never throws on unknown slug — returns stub:false with rationale and
 * empty target_parameters when target_cam isn't in CAMSystemRegistry.
 *
 * Authored 2026-04-25 — CAM-EXHAUST-MS0 U-CAM75 (production translator).
 */

import {
  camCatalogLoaderEngine,
  type CAMCatalogLoaderEngine,
} from "./CAMCatalogLoaderEngine.js";
import { isCAMSlug } from "../registries/CAMSystemRegistry.js";

export interface TranslateRequest {
  source_cam: string;
  target_cam: string;
  source_operation: string;
  source_parameters: Record<string, unknown>;
}

export interface TranslateResult {
  source_cam: string;
  target_cam: string;
  source_operation: string;
  target_operation: string | null;
  /** Translated parameters keyed by target-CAM canonical name. */
  target_parameters: Record<string, unknown>;
  /** Source param names that had no canonical mapping. */
  unmapped_parameters: string[];
  /** Source param → canonical → target name trace, for explainability. */
  mappings: Array<{ source: string; canonical: string; target: string }>;
  /** Free-form rationale + loss summary. */
  loss_summary: string;
  catalog_coverage_pct: number;
  catalog_param_count: number;
  stub: false;
  mode: "production";
}

/**
 * Canonical parameter buckets — case-insensitive substring match against
 * source param names. First match wins. Per-CAM target name gives the
 * preferred output key for that CAM. Falls back to canonical key if absent.
 */
const PARAMETER_EQUIVALENTS: ReadonlyArray<{
  canonical: string;
  match: ReadonlyArray<string>;
  per_cam: Record<string, string>;
}> = [
  {
    canonical: "rpm",
    match: ["rpm", "spindle_speed", "spindle_rpm", "spindlerpm", "n_spindle"],
    per_cam: {
      mastercam: "spindle_speed",
      hypermill: "spindle_rpm",
      fusion360: "spindleSpeed",
      "inventor-hsm": "spindle_speed",
      solidcam: "spindle_speed",
      "nx-cam": "spindle_speed",
      powermill: "spindle_speed",
      "catia-machining": "spindle_speed",
    },
  },
  {
    canonical: "feed_rate",
    match: ["feedrate", "feedpermin", "vf", "cuttingfeedrate", "cutfeed", "machiningfeedrate"],
    per_cam: {
      mastercam: "feedrate",
      hypermill: "feed_rate",
      fusion360: "cuttingFeedrate",
      "inventor-hsm": "cutting_feedrate",
      solidcam: "feed_rate",
      "nx-cam": "cut_feed",
      powermill: "cutting_feedrate",
      "catia-machining": "machining_feedrate",
    },
  },
  {
    canonical: "fz",
    match: ["fz", "feed_per_tooth", "chip_load", "chip_thickness", "feedpertooth"],
    per_cam: {
      mastercam: "fz",
      hypermill: "feed_per_tooth",
      fusion360: "feedPerTooth",
      "inventor-hsm": "feed_per_tooth",
      solidcam: "fz",
      "nx-cam": "fz",
      powermill: "feed_per_tooth",
      "catia-machining": "feed_per_tooth",
    },
  },
  {
    canonical: "ap",
    match: ["ap", "depthofcut", "axialdepth", "axialdepthofcut", "doc", "stepdown", "depthpercut", "maxstepdown"],
    per_cam: {
      mastercam: "max_stepdown",
      hypermill: "axial_depth",
      fusion360: "axialDepthOfCut",
      "inventor-hsm": "axial_depth_of_cut",
      solidcam: "step_down",
      "nx-cam": "depth_per_cut",
      powermill: "stepdown",
      "catia-machining": "axial_depth",
    },
  },
  {
    canonical: "ae",
    match: ["ae", "radial_depth", "stepover", "step_over", "width_of_cut", "woc"],
    per_cam: {
      mastercam: "stepover",
      hypermill: "radial_depth",
      fusion360: "stepover",
      "inventor-hsm": "stepover",
      solidcam: "step_over",
      "nx-cam": "stepover",
      powermill: "stepover",
      "catia-machining": "radial_depth",
    },
  },
  {
    canonical: "tool_diameter",
    match: ["tool_diameter", "diameter", "d_tool", "tooldia"],
    per_cam: {
      mastercam: "tool_diameter",
      hypermill: "tool_diameter",
      fusion360: "diameter",
      "inventor-hsm": "tool_diameter",
      solidcam: "diameter",
      "nx-cam": "tool_diameter",
      powermill: "tool_diameter",
      "catia-machining": "tool_diameter",
    },
  },
  {
    canonical: "coolant_pressure",
    match: ["coolant_pressure", "tsc_pressure", "thru_spindle_pressure"],
    per_cam: {
      mastercam: "coolant_pressure",
      hypermill: "tsc_pressure",
      fusion360: "coolantPressure",
      "inventor-hsm": "coolant_pressure",
      solidcam: "coolant_pressure",
      "nx-cam": "coolant_pressure",
      powermill: "coolant_pressure",
      "catia-machining": "coolant_pressure",
    },
  },
];

/**
 * Operation alias collapse — source op_name → canonical op family.
 * Independent of CAM, so we can reverse-lookup the target preferred name.
 */
const OPERATION_ALIASES: ReadonlyArray<{
  canonical: string;
  match: ReadonlyArray<string>;
  per_cam: Record<string, string>;
}> = [
  {
    canonical: "adaptive",
    match: ["adaptive", "imachining", "dynamic", "vortex", "trochoidal_rough"],
    per_cam: {
      mastercam: "dynamic_mill",
      hypermill: "maxx_machining",
      fusion360: "adaptive_3d",
      "inventor-hsm": "adaptive_clearing",
      solidcam: "imachining",
      "nx-cam": "adaptive_milling",
      powermill: "vortex",
      "catia-machining": "high_speed_roughing",
    },
  },
  {
    canonical: "pocket",
    match: ["pocket", "pocket_2d", "2d_pocket", "area"],
    per_cam: {
      mastercam: "pocket_2d",
      hypermill: "pocket_2d",
      fusion360: "pocket_2d",
      "inventor-hsm": "pocket_2d",
      solidcam: "pocket",
      "nx-cam": "pocket_milling",
      powermill: "area_clearance",
      "catia-machining": "pocketing",
    },
  },
  {
    canonical: "contour",
    match: ["contour", "profile", "profile_2d", "contour_2d"],
    per_cam: {
      mastercam: "contour_2d",
      hypermill: "contour_2d",
      fusion360: "2d_contour",
      "inventor-hsm": "contour_2d",
      solidcam: "profile",
      "nx-cam": "planar_milling",
      powermill: "profile_finishing",
      "catia-machining": "contouring",
    },
  },
  {
    canonical: "drill",
    match: ["drill", "drilling", "peck", "deep_hole"],
    per_cam: {
      mastercam: "drill",
      hypermill: "drilling",
      fusion360: "drill",
      "inventor-hsm": "drill",
      solidcam: "drilling",
      "nx-cam": "spot_drilling",
      powermill: "drilling",
      "catia-machining": "drilling",
    },
  },
  {
    canonical: "thread",
    match: ["thread", "thread_mill", "threading", "tap"],
    per_cam: {
      mastercam: "thread_mill",
      hypermill: "thread_milling",
      fusion360: "thread_mill",
      "inventor-hsm": "thread_milling",
      solidcam: "thread_milling",
      "nx-cam": "threading",
      powermill: "thread_milling",
      "catia-machining": "thread_milling",
    },
  },
];

const lc = (s: string): string => s.toLowerCase();
/** Normalize a parameter or operation name: lowercase + strip non-alphanumerics.
 *  Lets us match "spindleSpeed" / "spindle_speed" / "spindle-speed" with one
 *  alias entry. */
const norm = (s: string): string => lc(s).replace(/[^a-z0-9]/g, "");

/** Match a normalized name against an alias list. Short aliases (≤3 chars)
 *  require exact equality so 2-letter codes like "ap"/"fz"/"vf"/"doc" don't
 *  collide with unrelated words ("strap", "size", etc.). Longer aliases use
 *  substring containment so "feedrate" matches "cuttingfeedrate" etc. */
const matchesAny = (name: string, needles: ReadonlyArray<string>): boolean => {
  const n = norm(name);
  return needles.some((needle) => {
    const k = norm(needle);
    return k.length <= 3 ? n === k : n.includes(k);
  });
};

export class CAMCrossSystemTranslatorEngine {
  constructor(private loader: CAMCatalogLoaderEngine = camCatalogLoaderEngine) {}

  translate(req: TranslateRequest): TranslateResult {
    const { source_cam, target_cam, source_operation, source_parameters } = req;

    const targetValid = isCAMSlug(target_cam);
    const sys = targetValid ? this.loader.loadOne(target_cam) : null;
    const drift = targetValid
      ? this.loader.loadAll().drift_report.find((d) => d.slug === target_cam)
      : null;
    const coverage = drift?.coverage_pct ?? 0;
    const paramCount = sys?.total_param_count ?? 0;

    if (!targetValid) {
      return {
        source_cam,
        target_cam,
        source_operation,
        target_operation: null,
        target_parameters: {},
        unmapped_parameters: Object.keys(source_parameters),
        mappings: [],
        loss_summary: `unknown target_cam slug "${target_cam}" — full source preserved as unmapped`,
        catalog_coverage_pct: coverage,
        catalog_param_count: paramCount,
        stub: false,
        mode: "production",
      };
    }

    // Operation translation
    const opAlias = OPERATION_ALIASES.find((a) => matchesAny(source_operation, a.match));
    const target_operation = opAlias
      ? (opAlias.per_cam[target_cam] ?? opAlias.canonical)
      : null;

    // Parameter translation
    const target_parameters: Record<string, unknown> = {};
    const unmapped: string[] = [];
    const mappings: Array<{ source: string; canonical: string; target: string }> = [];

    for (const [srcKey, srcVal] of Object.entries(source_parameters)) {
      const eq = PARAMETER_EQUIVALENTS.find((e) => matchesAny(srcKey, e.match));
      if (!eq) {
        unmapped.push(srcKey);
        continue;
      }
      const targetKey = eq.per_cam[target_cam] ?? eq.canonical;
      target_parameters[targetKey] = srcVal;
      mappings.push({ source: srcKey, canonical: eq.canonical, target: targetKey });
    }

    const lossPct = Object.keys(source_parameters).length === 0
      ? 0
      : (unmapped.length / Object.keys(source_parameters).length) * 100;

    const opNote = opAlias
      ? `op '${source_operation}' → '${target_operation}' (canonical=${opAlias.canonical})`
      : `op '${source_operation}' had no canonical match; target_operation=null`;

    const loss_summary = `${opNote}; ${mappings.length}/${Object.keys(source_parameters).length} params mapped (${lossPct.toFixed(1)}% loss)`;

    return {
      source_cam,
      target_cam,
      source_operation,
      target_operation,
      target_parameters,
      unmapped_parameters: unmapped,
      mappings,
      loss_summary,
      catalog_coverage_pct: coverage,
      catalog_param_count: paramCount,
      stub: false,
      mode: "production",
    };
  }
}

export const camCrossSystemTranslatorEngine = new CAMCrossSystemTranslatorEngine();
