/**
 * CrossProcessFeatureBridge — per-feature routing across mill, lathe, and
 * wire-EDM processes, with CAD-side coverage lookup.
 *
 * Given a manufacturing feature (e.g. "pocket_2d", "thread_internal", "groove"),
 * the bridge tells the caller:
 *   1. Which processes (mill / lathe / wedm) can produce the feature, with
 *      a feasibility rank (primary / alternate / infeasible) and a per-process
 *      list of CAM strategies that naturally produce it.
 *   2. Which CAD systems' catalogs cover modeling the feature, via
 *      CADSystemRouterEngine.findOperationAcrossSystems on a caller-supplied
 *      operation id (e.g. "EXTRUDE_CUT", "POCKET").
 *   3. A single recommended primary process derived from the canonical ranking.
 *
 * Three pure static entry points:
 *   1. route(req) — full per-feature breakdown including CAD coverage
 *   2. listFeatureOptions(feature) — process options only (no CAD lookup)
 *   3. listKnownFeatures() — registry snapshot for AI consumers
 *
 * The bridge is a planner/normalizer — it never overrides the underlying
 * CAM engine's strategy choice or the CAD catalog's operation taxonomy.
 * The feasibility ranks are conservative and based on standard machining
 * constraints (rotating-part addressability, through-cut-only WEDM, etc.).
 *
 * @engine CrossProcessFeatureBridge
 * @milestone XPROC-FEAT-01
 * @see CADSystemRouterEngine.findOperationAcrossSystems — CAD catalog search
 * @see CrossProcessSpeedFeedBridge — sibling SF bridge (XPROC-SFC-01)
 * @see CrossProcessPostBridge — sibling post bridge (XPROC-POST-01)
 */

// ============================================================================
// CONSTANTS
// ============================================================================

export const FEATURE_PROCESSES = ["mill", "lathe", "wedm"] as const;
export type FeatureProcessId = (typeof FEATURE_PROCESSES)[number];

export const FEATURE_FEASIBILITY = ["primary", "alternate", "infeasible"] as const;
export type FeasibilityRank = (typeof FEATURE_FEASIBILITY)[number];

export const SUPPORTED_FEATURES = [
  "pocket_2d",
  "pocket_3d",
  "slot",
  "hole_drill",
  "hole_thread_internal",
  "hole_thread_external",
  "groove_external",
  "groove_internal",
  "profile_2d",
  "face_milling",
  "boring",
  "chamfer",
] as const;

export type FeatureId = (typeof SUPPORTED_FEATURES)[number];

// ============================================================================
// TYPES
// ============================================================================

export interface ProcessFeatureOption {
  process: FeatureProcessId;
  feasibility: FeasibilityRank;
  strategies: readonly string[];
  rationale: string;
}

export interface FeatureRegistryEntry {
  feature: FeatureId;
  description: string;
  process_options: readonly ProcessFeatureOption[];
  cad_operation_keywords: readonly string[];
  recommended_process: FeatureProcessId;
}

export interface FeatureRouteRequest {
  feature: string;
  processes?: ReadonlyArray<FeatureProcessId>;
  cad_operation_id?: string;
}

export interface CADCoverageMatch {
  system: string;
  module_id: string;
  operation_id: string;
  category: string;
  params_count: number;
}

export interface FeatureRouteResult {
  feature: FeatureId;
  description: string;
  process_options: ProcessFeatureOption[];
  recommended_process: FeatureProcessId | null;
  cad_coverage: CADCoverageMatch[];
  cad_operation_keywords: readonly string[];
  notes: string[];
  warnings: string[];
}

// ============================================================================
// REGISTRY — canonical feature taxonomy
// ============================================================================

/**
 * Canonical feature taxonomy. Each entry maps the feature to per-process
 * feasibility + CAM strategies + CAD catalog keywords.
 *
 * Feasibility ranks:
 *   - "primary"    — the natural process for this feature
 *   - "alternate"  — feasible but not the first choice (geometry / time / cost)
 *   - "infeasible" — fundamentally not addressable on this process
 *
 * Strategies are conservative — they intentionally use vendor-neutral CAM
 * operation names (matches the canonical CAM cycle catalog vocabulary in
 * `mcp-server/src/data/cam-cycles/*.json`).
 */
const FEATURE_REGISTRY: Readonly<Record<FeatureId, FeatureRegistryEntry>> = Object.freeze({
  pocket_2d: Object.freeze({
    feature: "pocket_2d",
    description: "2D pocket bounded by walls (closed bottom)",
    process_options: Object.freeze([
      Object.freeze({
        process: "mill",
        feasibility: "primary",
        strategies: Object.freeze(["adaptive_clear", "2d_pocket", "trochoidal", "rest_machining"]),
        rationale: "Mill is the canonical process for closed-bottom pockets — Z-axis controls floor depth, XY contours walls",
      }),
      Object.freeze({
        process: "wedm",
        feasibility: "alternate",
        strategies: Object.freeze(["2d_profile_cutout"]),
        rationale: "WEDM produces through-pockets only (no closed bottom) — alternate when stock can be machined as a slug + bonded floor",
      }),
      Object.freeze({
        process: "lathe",
        feasibility: "infeasible",
        strategies: Object.freeze([]),
        rationale: "Lathe operates on a rotating workpiece — closed pockets off the rotation axis are not addressable",
      }),
    ]),
    cad_operation_keywords: Object.freeze(["EXTRUDE_CUT", "POCKET", "CUT_EXTRUDE"]),
    recommended_process: "mill",
  }),

  pocket_3d: Object.freeze({
    feature: "pocket_3d",
    description: "3D contoured pocket (curved floor or walls)",
    process_options: Object.freeze([
      Object.freeze({
        process: "mill",
        feasibility: "primary",
        strategies: Object.freeze(["adaptive_clear", "3d_pocket", "scallop", "rest_machining", "ball_nose_finish"]),
        rationale: "Multi-axis mill with ball-nose finish is the canonical path for sculpted 3D pockets",
      }),
      Object.freeze({
        process: "lathe",
        feasibility: "infeasible",
        strategies: Object.freeze([]),
        rationale: "Lathe geometry constrains tool path to a 2D meridian plane — sculpted 3D walls not addressable",
      }),
      Object.freeze({
        process: "wedm",
        feasibility: "infeasible",
        strategies: Object.freeze([]),
        rationale: "WEDM wire is straight (or tapered linearly) — contoured 3D floors not addressable",
      }),
    ]),
    cad_operation_keywords: Object.freeze(["LOFT_CUT", "SWEEP_CUT", "SURFACE_CUT"]),
    recommended_process: "mill",
  }),

  slot: Object.freeze({
    feature: "slot",
    description: "Open-ended slot (rectangular through or blind)",
    process_options: Object.freeze([
      Object.freeze({
        process: "mill",
        feasibility: "primary",
        strategies: Object.freeze(["slot_mill", "plunge_mill", "trochoidal_slot"]),
        rationale: "Mill end mill produces slot walls + floor in one operation",
      }),
      Object.freeze({
        process: "wedm",
        feasibility: "alternate",
        strategies: Object.freeze(["2d_profile"]),
        rationale: "WEDM cuts through-slots cleanly; alternate when slot is through and tolerance is tight (±5 µm)",
      }),
      Object.freeze({
        process: "lathe",
        feasibility: "infeasible",
        strategies: Object.freeze([]),
        rationale: "Linear slots off the rotation axis are not addressable on a lathe",
      }),
    ]),
    cad_operation_keywords: Object.freeze(["SLOT", "EXTRUDE_CUT"]),
    recommended_process: "mill",
  }),

  hole_drill: Object.freeze({
    feature: "hole_drill",
    description: "Drilled hole (no thread, standard tolerance)",
    process_options: Object.freeze([
      Object.freeze({
        process: "mill",
        feasibility: "primary",
        strategies: Object.freeze(["drill_cycle", "peck_drill", "deep_hole_drill", "spot_drill_first"]),
        rationale: "Mill drills any-orientation holes; canonical for off-axis holes and patterns",
      }),
      Object.freeze({
        process: "lathe",
        feasibility: "alternate",
        strategies: Object.freeze(["axial_drill", "deep_hole_drill"]),
        rationale: "Lathe drills only on the rotation axis — primary for axial holes, infeasible for off-axis",
      }),
      Object.freeze({
        process: "wedm",
        feasibility: "alternate",
        strategies: Object.freeze(["start_hole_only"]),
        rationale: "WEDM uses drilled holes as wire start points but does not finish small-bore holes itself",
      }),
    ]),
    cad_operation_keywords: Object.freeze(["HOLE", "DRILL_HOLE", "EXTRUDE_CUT"]),
    recommended_process: "mill",
  }),

  hole_thread_internal: Object.freeze({
    feature: "hole_thread_internal",
    description: "Internal thread (tapped or thread-milled bore)",
    process_options: Object.freeze([
      Object.freeze({
        process: "mill",
        feasibility: "primary",
        strategies: Object.freeze(["rigid_tap", "thread_mill", "form_tap"]),
        rationale: "Mill produces internal threads on any-orientation holes via thread mill or rigid tap",
      }),
      Object.freeze({
        process: "lathe",
        feasibility: "primary",
        strategies: Object.freeze(["single_point_internal_thread", "thread_chasing"]),
        rationale: "Lathe single-point thread is the canonical path for axial internal threads",
      }),
      Object.freeze({
        process: "wedm",
        feasibility: "infeasible",
        strategies: Object.freeze([]),
        rationale: "WEDM cannot generate the helical motion needed for thread profiles",
      }),
    ]),
    cad_operation_keywords: Object.freeze(["THREAD", "HOLE_THREAD", "TAP"]),
    recommended_process: "mill",
  }),

  hole_thread_external: Object.freeze({
    feature: "hole_thread_external",
    description: "External thread (turned or thread-milled OD)",
    process_options: Object.freeze([
      Object.freeze({
        process: "lathe",
        feasibility: "primary",
        strategies: Object.freeze(["single_point_thread", "thread_chasing", "die_thread"]),
        rationale: "Lathe single-point thread on OD is the canonical external thread process",
      }),
      Object.freeze({
        process: "mill",
        feasibility: "alternate",
        strategies: Object.freeze(["thread_mill"]),
        rationale: "Thread-mill external threads on cylinder bosses — alternate when part already on mill setup",
      }),
      Object.freeze({
        process: "wedm",
        feasibility: "infeasible",
        strategies: Object.freeze([]),
        rationale: "WEDM cannot generate the helical motion needed for thread profiles",
      }),
    ]),
    cad_operation_keywords: Object.freeze(["THREAD", "EXTERNAL_THREAD", "REVOLVE"]),
    recommended_process: "lathe",
  }),

  groove_external: Object.freeze({
    feature: "groove_external",
    description: "External (OD) groove on rotated part",
    process_options: Object.freeze([
      Object.freeze({
        process: "lathe",
        feasibility: "primary",
        strategies: Object.freeze(["od_groove", "parting_groove", "form_groove"]),
        rationale: "Lathe groove tool is the canonical external groove process",
      }),
      Object.freeze({
        process: "mill",
        feasibility: "alternate",
        strategies: Object.freeze(["face_groove", "engraved_groove"]),
        rationale: "Mill produces grooves on flat faces only — not on cylindrical OD",
      }),
      Object.freeze({
        process: "wedm",
        feasibility: "infeasible",
        strategies: Object.freeze([]),
        rationale: "WEDM produces through-cuts — partial-depth grooves not addressable",
      }),
    ]),
    cad_operation_keywords: Object.freeze(["GROOVE", "REVOLVE_CUT"]),
    recommended_process: "lathe",
  }),

  groove_internal: Object.freeze({
    feature: "groove_internal",
    description: "Internal (ID) groove inside a bore",
    process_options: Object.freeze([
      Object.freeze({
        process: "lathe",
        feasibility: "primary",
        strategies: Object.freeze(["id_groove", "internal_groove_tool"]),
        rationale: "Lathe internal-groove tool inside a bore is the canonical process",
      }),
      Object.freeze({
        process: "mill",
        feasibility: "infeasible",
        strategies: Object.freeze([]),
        rationale: "Mill cannot reach internal grooves inside small bores with conventional tooling",
      }),
      Object.freeze({
        process: "wedm",
        feasibility: "infeasible",
        strategies: Object.freeze([]),
        rationale: "WEDM produces through-cuts — internal grooves not addressable",
      }),
    ]),
    cad_operation_keywords: Object.freeze(["GROOVE", "REVOLVE_CUT", "INTERNAL_GROOVE"]),
    recommended_process: "lathe",
  }),

  profile_2d: Object.freeze({
    feature: "profile_2d",
    description: "Through 2D profile cut (straight or tapered walls)",
    process_options: Object.freeze([
      Object.freeze({
        process: "wedm",
        feasibility: "primary",
        strategies: Object.freeze(["2d_profile", "4_axis_taper", "skim_passes"]),
        rationale: "WEDM is canonical for through-profiles — wire produces straight or tapered walls with µm tolerance",
      }),
      Object.freeze({
        process: "mill",
        feasibility: "alternate",
        strategies: Object.freeze(["contour_2d", "trochoidal_contour"]),
        rationale: "Mill contour produces straight walls only — alternate when tolerance band fits standard mill capability",
      }),
      Object.freeze({
        process: "lathe",
        feasibility: "infeasible",
        strategies: Object.freeze([]),
        rationale: "Lathe cuts only on the rotating axis — non-cylindrical 2D profiles not addressable",
      }),
    ]),
    cad_operation_keywords: Object.freeze(["EXTRUDE_CUT", "SKETCH_PROFILE"]),
    recommended_process: "wedm",
  }),

  face_milling: Object.freeze({
    feature: "face_milling",
    description: "Face surface (flat top or bottom)",
    process_options: Object.freeze([
      Object.freeze({
        process: "mill",
        feasibility: "primary",
        strategies: Object.freeze(["face_mill", "shell_mill_face"]),
        rationale: "Mill face mill is the canonical large-area facing operation",
      }),
      Object.freeze({
        process: "lathe",
        feasibility: "alternate",
        strategies: Object.freeze(["facing_op"]),
        rationale: "Lathe faces the end of a chuck-mounted part — limited to circular face on rotation axis",
      }),
      Object.freeze({
        process: "wedm",
        feasibility: "infeasible",
        strategies: Object.freeze([]),
        rationale: "WEDM does not generate area sweeps — face surfaces not addressable",
      }),
    ]),
    cad_operation_keywords: Object.freeze(["EXTRUDE_CUT", "OFFSET_PLANE", "FACE"]),
    recommended_process: "mill",
  }),

  boring: Object.freeze({
    feature: "boring",
    description: "Bored circular hole (precision diameter)",
    process_options: Object.freeze([
      Object.freeze({
        process: "lathe",
        feasibility: "primary",
        strategies: Object.freeze(["boring_bar", "fine_boring"]),
        rationale: "Lathe boring bar produces any precision bore on rotation axis — canonical for ID tolerances ≤ ±10 µm",
      }),
      Object.freeze({
        process: "mill",
        feasibility: "primary",
        strategies: Object.freeze(["bore_cycle", "helical_bore", "circle_interp"]),
        rationale: "Mill bore cycle / helical bore for off-axis precision bores — canonical for non-axial holes",
      }),
      Object.freeze({
        process: "wedm",
        feasibility: "alternate",
        strategies: Object.freeze(["start_hole_plus_circular_profile"]),
        rationale: "WEDM bored hole = start hole + circular through profile — slow but achieves ±2 µm with skim passes",
      }),
    ]),
    cad_operation_keywords: Object.freeze(["HOLE", "BORE", "REVOLVE_CUT"]),
    recommended_process: "lathe",
  }),

  chamfer: Object.freeze({
    feature: "chamfer",
    description: "Chamfered edge (linear bevel)",
    process_options: Object.freeze([
      Object.freeze({
        process: "mill",
        feasibility: "primary",
        strategies: Object.freeze(["chamfer_mill", "edge_break", "spot_chamfer"]),
        rationale: "Mill chamfer mill is the canonical edge-break process for any-orientation chamfers",
      }),
      Object.freeze({
        process: "lathe",
        feasibility: "primary",
        strategies: Object.freeze(["turning_chamfer", "facing_chamfer"]),
        rationale: "Lathe chamfers OD/ID/face edges during turning — canonical for rotational parts",
      }),
      Object.freeze({
        process: "wedm",
        feasibility: "alternate",
        strategies: Object.freeze(["taper_cut"]),
        rationale: "WEDM 4-axis taper produces approximate chamfers via wire angle — alternate when already on WEDM setup",
      }),
    ]),
    cad_operation_keywords: Object.freeze(["CHAMFER", "EDGE_BREAK"]),
    recommended_process: "mill",
  }),
});

// ============================================================================
// ENGINE
// ============================================================================

export class CrossProcessFeatureBridge {
  /**
   * Per-feature breakdown across mill / lathe / wedm with optional CAD coverage.
   *
   * Throws on:
   *   - missing or empty `feature`
   *   - feature outside SUPPORTED_FEATURES (after lowercase normalization)
   *   - `processes` filter contains an id outside FEATURE_PROCESSES
   *   - `cad_operation_id` is provided but not a non-empty string
   *
   * @param req — feature route request
   * @returns FeatureRouteResult — process options + CAD coverage + recommendation
   */
  static async route(req: FeatureRouteRequest): Promise<FeatureRouteResult> {
    if (!req || typeof req !== "object") {
      throw new Error("CrossProcessFeatureBridge.route: request object required");
    }
    const featureKey = normalizeFeatureKey(req.feature);
    const entry = FEATURE_REGISTRY[featureKey];

    if (req.processes !== undefined) {
      if (!Array.isArray(req.processes)) {
        throw new Error(
          "CrossProcessFeatureBridge.route: processes must be an array of process ids",
        );
      }
      for (const p of req.processes) {
        if (!(FEATURE_PROCESSES as readonly string[]).includes(p)) {
          throw new Error(
            `CrossProcessFeatureBridge.route: invalid process "${String(p)}" in processes filter (supported: ${FEATURE_PROCESSES.join(", ")})`,
          );
        }
      }
    }

    let cadOpId: string | undefined;
    if (req.cad_operation_id !== undefined) {
      if (typeof req.cad_operation_id !== "string" || req.cad_operation_id.trim().length === 0) {
        throw new Error(
          "CrossProcessFeatureBridge.route: cad_operation_id must be a non-empty string when provided",
        );
      }
      cadOpId = req.cad_operation_id.trim();
    }

    const filtered = req.processes
      ? entry.process_options.filter((opt) => req.processes!.includes(opt.process))
      : entry.process_options;

    let cadCoverage: CADCoverageMatch[] = [];
    const warnings: string[] = [];
    if (cadOpId) {
      const { CADSystemRouterEngine } = await import("./CADSystemRouterEngine.js");
      const matches = await CADSystemRouterEngine.findOperationAcrossSystems(cadOpId);
      cadCoverage = matches.map((m) => ({
        system: m.system,
        module_id: m.module_id,
        operation_id: m.operation_id,
        category: m.category,
        params_count: m.params_count,
      }));
      if (
        cadCoverage.length > 0 &&
        !entry.cad_operation_keywords.includes(cadOpId.toUpperCase())
      ) {
        warnings.push(
          `cad_operation_id "${cadOpId}" found in CAD catalogs but does not match feature "${featureKey}" canonical keywords (${entry.cad_operation_keywords.join(", ")}); verify the CAD operation actually models this feature`,
        );
      }
      if (cadCoverage.length === 0) {
        warnings.push(
          `cad_operation_id "${cadOpId}" not found in any of the 5 CAD catalogs — feature may need a different CAD operation id`,
        );
      }
    }

    // recommended_process honors the filter — null if filter excludes the canonical primary
    const filteredHasRecommended = filtered.some(
      (opt) => opt.process === entry.recommended_process,
    );
    const recommended = filteredHasRecommended ? entry.recommended_process : null;

    const notes: string[] = [
      `feature=${featureKey}`,
      `description=${entry.description}`,
      `cad_operation_keywords=[${entry.cad_operation_keywords.join(", ")}]`,
    ];
    if (req.processes) {
      notes.push(`processes_filter=[${req.processes.join(", ")}]`);
    }
    if (cadOpId) {
      notes.push(`cad_operation_id=${cadOpId} (matches=${cadCoverage.length})`);
    }

    return {
      feature: featureKey,
      description: entry.description,
      process_options: filtered.map((opt) => ({
        process: opt.process,
        feasibility: opt.feasibility,
        strategies: [...opt.strategies],
        rationale: opt.rationale,
      })),
      recommended_process: recommended,
      cad_coverage: cadCoverage,
      cad_operation_keywords: entry.cad_operation_keywords,
      notes,
      warnings,
    };
  }

  /**
   * Process options for a feature — no CAD lookup, no async I/O.
   *
   * Throws on missing/empty feature or unknown feature id.
   *
   * @param feature — case-insensitive feature id (e.g. "pocket_2d", "POCKET_2D")
   * @returns frozen array of ProcessFeatureOption (defensively copied)
   */
  static listFeatureOptions(feature: string): ProcessFeatureOption[] {
    const featureKey = normalizeFeatureKey(feature);
    const entry = FEATURE_REGISTRY[featureKey];
    return entry.process_options.map((opt) => ({
      process: opt.process,
      feasibility: opt.feasibility,
      strategies: [...opt.strategies],
      rationale: opt.rationale,
    }));
  }

  /**
   * Snapshot of every known feature in the registry.
   *
   * The returned entries are defensive copies — caller can iterate but
   * mutation is harmless to the underlying frozen registry.
   *
   * @returns array of FeatureRegistryEntry in SUPPORTED_FEATURES order
   */
  static listKnownFeatures(): FeatureRegistryEntry[] {
    return SUPPORTED_FEATURES.map((featureId) => {
      const entry = FEATURE_REGISTRY[featureId];
      return {
        feature: entry.feature,
        description: entry.description,
        process_options: entry.process_options.map((opt) => ({
          process: opt.process,
          feasibility: opt.feasibility,
          strategies: [...opt.strategies],
          rationale: opt.rationale,
        })),
        cad_operation_keywords: [...entry.cad_operation_keywords],
        recommended_process: entry.recommended_process,
      };
    });
  }
}

// ============================================================================
// HELPERS (module-private)
// ============================================================================

/**
 * Normalize a feature id and validate it. Lowercase, trim whitespace, then
 * confirm membership in SUPPORTED_FEATURES. Throws with the supported list
 * on any mismatch so AI consumers can self-correct.
 */
function normalizeFeatureKey(raw: unknown): FeatureId {
  if (typeof raw !== "string") {
    throw new Error(
      "CrossProcessFeatureBridge: feature must be a string (e.g. \"pocket_2d\")",
    );
  }
  const key = raw.toLowerCase().trim();
  if (key.length === 0) {
    throw new Error("CrossProcessFeatureBridge: feature must be a non-empty string");
  }
  if (!(SUPPORTED_FEATURES as readonly string[]).includes(key)) {
    throw new Error(
      `CrossProcessFeatureBridge: unknown feature "${raw}" (supported: ${SUPPORTED_FEATURES.join(", ")})`,
    );
  }
  return key as FeatureId;
}
