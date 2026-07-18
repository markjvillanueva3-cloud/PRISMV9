/**
 * ISO2768ApplicatorEngine — Apply General Tolerances to Un-toleranced Dimensions
 *
 * Applies ISO 2768-1:1989 (linear and angular) and ISO 2768-2:1989 (geometrical)
 * general tolerances to dimensions that do not have explicit tolerance callouts.
 *
 * Rules:
 *   - NEVER overrides explicitly toleranced dimensions
 *   - Applies based on tolerance class (f/m/c/v for Part 1, H/K/L for Part 2)
 *   - Annotates each dimension with source: "explicit" or "iso2768"
 *   - Handles linear, angular, broken edge (chamfer/radius), and geometrical tolerances
 *
 * ISO 2768-1 covers:
 *   - Linear dimensions (external, internal, step)
 *   - Angular dimensions
 *   - Broken edges (external radii and chamfer heights)
 *
 * ISO 2768-2 covers:
 *   - Straightness and flatness
 *   - Circularity (roundness)
 *   - Parallelism
 *   - Perpendicularity (squareness)
 *   - Symmetry
 *   - Circular runout
 *
 * References:
 *   - ISO 2768-1:1989 (General tolerances — Part 1: Tolerances for linear
 *     and angular dimensions without individual tolerance indications)
 *   - ISO 2768-2:1989 (General tolerances — Part 2: Geometrical tolerances
 *     for features without individual tolerance indications)
 *
 * @module engines/ISO2768ApplicatorEngine
 * @milestone LATHE-PRO-MS-1 U-LPI12
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

/** A dimension that may or may not have an explicit tolerance */
export interface Dimension {
  id: string;
  /** Nominal value */
  nominal_mm: number;
  /** Type of dimension */
  type: "linear" | "angular" | "broken_edge" | "diameter" | "depth" | "radius";
  /** Explicit tolerance (if present on drawing) */
  explicit_tolerance_plus_mm?: number;
  explicit_tolerance_minus_mm?: number;
  /** Feature ID this dimension belongs to */
  feature_id?: string;
  /** Description for traceability */
  description?: string;
}

/** A geometrical tolerance requirement */
export interface GeometricalTolerance {
  id: string;
  /** GD&T symbol type */
  type: "straightness" | "flatness" | "circularity" | "parallelism" | "perpendicularity" | "symmetry" | "runout";
  /** Nominal size range (mm) — used for lookup */
  nominal_range_mm: number;
  /** Explicit value (if on drawing) */
  explicit_value_mm?: number;
  /** Feature ID */
  feature_id?: string;
}

/** Result for a single dimension after tolerance application */
export interface TolerancedDimension {
  id: string;
  nominal_mm: number;
  type: string;
  tolerance_plus_mm: number;
  tolerance_minus_mm: number;
  /** Where the tolerance came from */
  source: "explicit" | "iso2768_linear" | "iso2768_angular" | "iso2768_broken_edge";
  /** ISO 2768 class used (if applied) */
  iso2768_class?: string;
  feature_id?: string;
  description?: string;
}

/** Result for a geometrical tolerance */
export interface TolerancedGeometrical {
  id: string;
  type: string;
  tolerance_mm: number;
  source: "explicit" | "iso2768_geometrical";
  iso2768_class?: string;
  feature_id?: string;
}

/** Input for the applicator */
export interface ISO2768Input {
  /** Dimensions to tolerance */
  dimensions: Dimension[];
  /** Geometrical tolerances to apply (optional) */
  geometrical?: GeometricalTolerance[];
  /** ISO 2768-1 class: f (fine), m (medium), c (coarse), v (very coarse) */
  linear_class: "f" | "m" | "c" | "v";
  /** ISO 2768-2 class: H (fine), K (medium), L (coarse) — optional */
  geometrical_class?: "H" | "K" | "L";
}

/** Full applicator result */
export interface ISO2768Result {
  /** All dimensions with tolerances applied */
  dimensions: TolerancedDimension[];
  /** All geometrical tolerances applied */
  geometrical: TolerancedGeometrical[];
  /** Statistics */
  stats: {
    total_dimensions: number;
    explicit_count: number;
    iso2768_applied_count: number;
    geometrical_count: number;
    geometrical_explicit: number;
    geometrical_applied: number;
  };
}

// ============================================================================
// ISO 2768-1 TABLES — Linear Tolerances (±mm)
// ============================================================================

interface LinearBand {
  min: number;   // Nominal dimension over (mm)
  max: number;   // Nominal dimension up to and including (mm)
  f: number;     // Fine class ±
  m: number;     // Medium class ±
  c: number;     // Coarse class ±
  v: number;     // Very coarse class ±
}

/**
 * ISO 2768-1:1989 Table 1 — Permissible deviations for linear dimensions
 * Values are ± tolerance in mm.
 */
const LINEAR_TABLE: LinearBand[] = [
  { min: 0.5,  max: 3,    f: 0.05, m: 0.1,  c: 0.2,  v: 0.5  },
  { min: 3,    max: 6,    f: 0.05, m: 0.1,  c: 0.3,  v: 1.0  },
  { min: 6,    max: 30,   f: 0.1,  m: 0.2,  c: 0.5,  v: 1.5  },
  { min: 30,   max: 120,  f: 0.15, m: 0.3,  c: 0.8,  v: 2.5  },
  { min: 120,  max: 400,  f: 0.2,  m: 0.5,  c: 1.2,  v: 4.0  },
  { min: 400,  max: 1000, f: 0.3,  m: 0.8,  c: 2.0,  v: 6.0  },
  { min: 1000, max: 2000, f: 0.5,  m: 1.2,  c: 3.0,  v: 8.0  },
  { min: 2000, max: 4000, f: 0.5,  m: 2.0,  c: 4.0,  v: 12.0 },
];

// ============================================================================
// ISO 2768-1 TABLES — Angular Tolerances
// ============================================================================

interface AngularBand {
  min: number;     // Length of shorter side over (mm)
  max: number;     // Length of shorter side up to and including (mm)
  f_deg: number;   // Fine class (degrees)
  f_min: number;   // Fine class (minutes of arc)
  m_deg: number;
  m_min: number;
  c_deg: number;
  c_min: number;
  v_deg: number;
  v_min: number;
}

/**
 * ISO 2768-1:1989 Table 2 — Permissible deviations for angular dimensions
 * Values are ± in degrees (deg) and minutes of arc (min).
 * Note: f and m classes have identical angular tolerances per ISO 2768-1.
 */
const ANGULAR_TABLE: AngularBand[] = [
  { min: 0,   max: 10,   f_deg: 1, f_min: 0,  m_deg: 1, m_min: 0,  c_deg: 1, c_min: 30, v_deg: 3, v_min: 0  },
  { min: 10,  max: 50,   f_deg: 0, f_min: 30, m_deg: 0, m_min: 30, c_deg: 1, c_min: 0,  v_deg: 2, v_min: 0  },
  { min: 50,  max: 120,  f_deg: 0, f_min: 20, m_deg: 0, m_min: 20, c_deg: 0, c_min: 30, v_deg: 1, v_min: 0  },
  { min: 120, max: 400,  f_deg: 0, f_min: 10, m_deg: 0, m_min: 10, c_deg: 0, c_min: 15, v_deg: 0, v_min: 30 },
  { min: 400, max: 10000, f_deg: 0, f_min: 5, m_deg: 0, m_min: 5,  c_deg: 0, c_min: 10, v_deg: 0, v_min: 20 },
];

// ============================================================================
// ISO 2768-1 TABLES — Broken Edges (external radii and chamfer heights)
// ============================================================================

interface BrokenEdgeBand {
  min: number;
  max: number;
  f: number;
  m: number;
  c: number;
  v: number;
}

/**
 * ISO 2768-1:1989 Table 3 — Permissible deviations for broken edges
 * Values are ± tolerance in mm.
 */
const BROKEN_EDGE_TABLE: BrokenEdgeBand[] = [
  { min: 0.2, max: 4,  f: 0.2, m: 0.4, c: 0.4, v: 0.4 },
  { min: 4,   max: 50, f: 0.5, m: 1.0, c: 2.0, v: 2.0 },
];

// ============================================================================
// ISO 2768-2 TABLES — Geometrical Tolerances (mm)
// ============================================================================

interface GeoToleranceBand {
  min: number;
  max: number;
  H: number;   // Fine
  K: number;   // Medium
  L: number;   // Coarse
}

/**
 * ISO 2768-2:1989 Table 1 — Straightness and flatness
 */
const STRAIGHTNESS_TABLE: GeoToleranceBand[] = [
  { min: 0,   max: 10,   H: 0.02, K: 0.05, L: 0.1  },
  { min: 10,  max: 30,   H: 0.05, K: 0.1,  L: 0.2  },
  { min: 30,  max: 100,  H: 0.1,  K: 0.2,  L: 0.4  },
  { min: 100, max: 300,  H: 0.2,  K: 0.4,  L: 0.8  },
  { min: 300, max: 1000, H: 0.3,  K: 0.6,  L: 1.2  },
  { min: 1000, max: 3000, H: 0.4, K: 0.8, L: 1.6 },
];

/**
 * ISO 2768-2:1989 Table 2 — Circularity (roundness)
 * Same as the IT grade tolerance for that diameter; use straightness as approximation.
 */
const CIRCULARITY_TABLE: GeoToleranceBand[] = [
  { min: 0,   max: 10,   H: 0.02, K: 0.04, L: 0.06 },
  { min: 10,  max: 30,   H: 0.03, K: 0.06, L: 0.1  },
  { min: 30,  max: 100,  H: 0.04, K: 0.08, L: 0.15 },
  { min: 100, max: 300,  H: 0.05, K: 0.1,  L: 0.2  },
  { min: 300, max: 1000, H: 0.06, K: 0.12, L: 0.25 },
];

/**
 * ISO 2768-2:1989 Table 3 — Parallelism and perpendicularity
 */
const PARALLELISM_TABLE: GeoToleranceBand[] = [
  { min: 0,   max: 100,  H: 0.2, K: 0.4, L: 0.6 },
  { min: 100, max: 300,  H: 0.3, K: 0.6, L: 1.0 },
  { min: 300, max: 1000, H: 0.4, K: 0.8, L: 1.5 },
  { min: 1000, max: 3000, H: 0.5, K: 1.0, L: 2.0 },
];

/**
 * ISO 2768-2:1989 Table 4 — Symmetry
 */
const SYMMETRY_TABLE: GeoToleranceBand[] = [
  { min: 0,   max: 100,  H: 0.5, K: 0.6, L: 0.6 },
  { min: 100, max: 300,  H: 0.5, K: 0.6, L: 1.0 },
  { min: 300, max: 1000, H: 0.5, K: 0.8, L: 1.5 },
  { min: 1000, max: 3000, H: 0.5, K: 1.0, L: 2.0 },
];

/**
 * ISO 2768-2:1989 Table 5 — Circular runout
 */
const RUNOUT_TABLE: GeoToleranceBand[] = [
  { min: 0,   max: 10000, H: 0.1, K: 0.2, L: 0.3 },
];

// ============================================================================
// LOOKUP HELPERS
// ============================================================================

function lookupLinear(nominal: number, cls: "f" | "m" | "c" | "v"): number {
  for (const band of LINEAR_TABLE) {
    if (nominal > band.min && nominal <= band.max) return band[cls];
  }
  if (nominal <= 0.5) return LINEAR_TABLE[0][cls];
  return LINEAR_TABLE[LINEAR_TABLE.length - 1][cls];
}

function lookupAngular(shorter_side_mm: number, cls: "f" | "m" | "c" | "v"): number {
  for (const band of ANGULAR_TABLE) {
    if (shorter_side_mm > band.min && shorter_side_mm <= band.max) {
      const key_deg = `${cls}_deg` as keyof AngularBand;
      const key_min = `${cls}_min` as keyof AngularBand;
      return (band[key_deg] as number) + (band[key_min] as number) / 60;
    }
  }
  const last = ANGULAR_TABLE[ANGULAR_TABLE.length - 1];
  const key_deg = `${cls}_deg` as keyof AngularBand;
  const key_min = `${cls}_min` as keyof AngularBand;
  return (last[key_deg] as number) + (last[key_min] as number) / 60;
}

function lookupBrokenEdge(nominal: number, cls: "f" | "m" | "c" | "v"): number {
  for (const band of BROKEN_EDGE_TABLE) {
    if (nominal > band.min && nominal <= band.max) return band[cls];
  }
  if (nominal <= 0.2) return BROKEN_EDGE_TABLE[0][cls];
  return BROKEN_EDGE_TABLE[BROKEN_EDGE_TABLE.length - 1][cls];
}

function lookupGeo(
  table: GeoToleranceBand[],
  nominal: number,
  cls: "H" | "K" | "L",
): number {
  for (const band of table) {
    if (nominal > band.min && nominal <= band.max) return band[cls];
  }
  if (nominal <= 0) return table[0][cls];
  return table[table.length - 1][cls];
}

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class ISO2768ApplicatorEngine {

  /**
   * Apply ISO 2768 general tolerances to un-toleranced dimensions.
   *
   * @param input - Dimensions, geometrical requirements, and tolerance classes
   * @returns Fully toleranced dimension set with source annotations
   */
  static apply(input: ISO2768Input): ISO2768Result {
    const t0 = Date.now();
    const cls = input.linear_class;
    const geoCls = input.geometrical_class || "K";

    const toleranced: TolerancedDimension[] = [];
    let explicitCount = 0;
    let appliedCount = 0;

    for (const dim of input.dimensions) {
      if (dim.explicit_tolerance_plus_mm !== undefined && dim.explicit_tolerance_minus_mm !== undefined) {
        // Explicit tolerance — preserve exactly
        toleranced.push({
          id: dim.id,
          nominal_mm: dim.nominal_mm,
          type: dim.type,
          tolerance_plus_mm: dim.explicit_tolerance_plus_mm,
          tolerance_minus_mm: dim.explicit_tolerance_minus_mm,
          source: "explicit",
          feature_id: dim.feature_id,
          description: dim.description,
        });
        explicitCount++;
      } else if (dim.type === "angular") {
        // Angular tolerance from ISO 2768-1 Table 2
        const tol = lookupAngular(dim.nominal_mm, cls);
        toleranced.push({
          id: dim.id,
          nominal_mm: dim.nominal_mm,
          type: dim.type,
          tolerance_plus_mm: tol,
          tolerance_minus_mm: -tol,
          source: "iso2768_angular",
          iso2768_class: cls,
          feature_id: dim.feature_id,
          description: dim.description,
        });
        appliedCount++;
      } else if (dim.type === "broken_edge") {
        // Broken edge tolerance from ISO 2768-1 Table 3
        const tol = lookupBrokenEdge(dim.nominal_mm, cls);
        toleranced.push({
          id: dim.id,
          nominal_mm: dim.nominal_mm,
          type: dim.type,
          tolerance_plus_mm: tol,
          tolerance_minus_mm: -tol,
          source: "iso2768_broken_edge",
          iso2768_class: cls,
          feature_id: dim.feature_id,
          description: dim.description,
        });
        appliedCount++;
      } else {
        // Linear tolerance from ISO 2768-1 Table 1
        const tol = lookupLinear(dim.nominal_mm, cls);
        toleranced.push({
          id: dim.id,
          nominal_mm: dim.nominal_mm,
          type: dim.type,
          tolerance_plus_mm: tol,
          tolerance_minus_mm: -tol,
          source: "iso2768_linear",
          iso2768_class: cls,
          feature_id: dim.feature_id,
          description: dim.description,
        });
        appliedCount++;
      }
    }

    // Geometrical tolerances
    const geoResult: TolerancedGeometrical[] = [];
    let geoExplicit = 0;
    let geoApplied = 0;

    if (input.geometrical) {
      for (const geo of input.geometrical) {
        if (geo.explicit_value_mm !== undefined) {
          geoResult.push({
            id: geo.id,
            type: geo.type,
            tolerance_mm: geo.explicit_value_mm,
            source: "explicit",
            feature_id: geo.feature_id,
          });
          geoExplicit++;
        } else {
          const table = ISO2768ApplicatorEngine.getGeoTable(geo.type);
          const tol = lookupGeo(table, geo.nominal_range_mm, geoCls);
          geoResult.push({
            id: geo.id,
            type: geo.type,
            tolerance_mm: tol,
            source: "iso2768_geometrical",
            iso2768_class: geoCls,
            feature_id: geo.feature_id,
          });
          geoApplied++;
        }
      }
    }

    const elapsed = Date.now() - t0;
    log.info(`[ISO2768] Applied ${appliedCount} linear + ${geoApplied} geometrical tolerances (class ${cls}/${geoCls}) in ${elapsed}ms`);

    return {
      dimensions: toleranced,
      geometrical: geoResult,
      stats: {
        total_dimensions: input.dimensions.length,
        explicit_count: explicitCount,
        iso2768_applied_count: appliedCount,
        geometrical_count: (input.geometrical || []).length,
        geometrical_explicit: geoExplicit,
        geometrical_applied: geoApplied,
      },
    };
  }

  /**
   * Quick lookup: get ISO 2768-1 linear tolerance for a nominal dimension.
   *
   * @param nominal_mm - Nominal dimension
   * @param cls - Tolerance class
   * @returns ± tolerance in mm
   */
  static getLinearTolerance(nominal_mm: number, cls: "f" | "m" | "c" | "v"): number {
    return lookupLinear(nominal_mm, cls);
  }

  /**
   * Quick lookup: get ISO 2768-1 angular tolerance.
   *
   * @param shorter_side_mm - Length of shorter side of angle
   * @param cls - Tolerance class
   * @returns ± tolerance in degrees
   */
  static getAngularTolerance(shorter_side_mm: number, cls: "f" | "m" | "c" | "v"): number {
    return lookupAngular(shorter_side_mm, cls);
  }

  /** Select the correct geometrical tolerance table for a given type */
  private static getGeoTable(type: string): GeoToleranceBand[] {
    switch (type) {
      case "straightness":
      case "flatness":
        return STRAIGHTNESS_TABLE;
      case "circularity":
        return CIRCULARITY_TABLE;
      case "parallelism":
      case "perpendicularity":
        return PARALLELISM_TABLE;
      case "symmetry":
        return SYMMETRY_TABLE;
      case "runout":
        return RUNOUT_TABLE;
      default:
        return STRAIGHTNESS_TABLE;
    }
  }
}

/** Singleton instance */
export const iso2768ApplicatorEngine = new ISO2768ApplicatorEngine();
