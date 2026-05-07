/**
 * TurningChipbreakerCatalogEngine
 * ===============================
 *
 * Manufacturer chipbreaker-code catalog (U-LPC02, MS7). Given a candidate
 * feed + depth-of-cut + ISO material group, validates whether the chosen
 * parameters fall inside the effective chipbreaker operating window for a
 * named geometry (Sandvik -PM / -MF / -QM / -GR, Kennametal -MP / -FP,
 * ISCAR -N / -M / -NR, Tungaloy TKY, Mitsubishi Y series).
 *
 * When the chosen point is OUTSIDE the window, the engine recommends:
 *   1. The closest geometry whose window would accept the point, OR
 *   2. A parameter adjustment (higher feed or deeper cut) that moves
 *      the point into the current geometry's window.
 *
 * Operating windows are stored as rectangular boxes in (feed_mm_rev,
 * ap_mm) space — a simple, conservative model that matches the visual
 * "feed × DOC" charts published in manufacturer chip-breaker guides.
 * More sophisticated polygonal windows can be added without breaking
 * the API (polygon point-in-polygon would replace the box check).
 *
 * Sources:
 *   - Sandvik Coromant Turning Catalogue (chapter "Chip control")
 *   - Kennametal Turning Catalog §3.2 chip-breaker selector
 *   - ISCAR Turning Tools catalog appendix A
 *   - Tungaloy General Catalog turning insert geometries
 *
 * The catalog is intentionally small and declarative — add geometries
 * by appending entries to `CHIPBREAKER_CATALOG`; no logic change needed.
 *
 * @module engines/TurningChipbreakerCatalogEngine
 * @milestone LATHE-PRO-MS7 / U-LPC02
 */

export type IsoGroup = "P" | "M" | "K" | "N" | "S" | "H";
export type Manufacturer = "sandvik" | "kennametal" | "iscar" | "tungaloy" | "mitsubishi";

export interface ChipbreakerGeometry {
  manufacturer: Manufacturer;
  /** Short code as stamped on the insert (e.g. "PM", "MF", "QM", "GR"). */
  code: string;
  /** Human-readable purpose. */
  purpose: string;
  /** Applicable ISO groups. */
  iso_groups: IsoGroup[];
  /** Effective feed window (mm/rev). */
  feed_min: number;
  feed_max: number;
  /** Effective depth-of-cut window (mm). */
  ap_min: number;
  ap_max: number;
}

/**
 * Declarative catalog. 16 entries covering the five major vendors across
 * roughing / finishing / medium / grooving ranges for ISO P, M, K, N.
 */
export const CHIPBREAKER_CATALOG: ChipbreakerGeometry[] = [
  // Sandvik
  { manufacturer: "sandvik", code: "PR", purpose: "Rough steel",         iso_groups: ["P"],       feed_min: 0.30, feed_max: 0.80, ap_min: 2.0, ap_max: 12.0 },
  { manufacturer: "sandvik", code: "PM", purpose: "Medium steel",        iso_groups: ["P"],       feed_min: 0.15, feed_max: 0.50, ap_min: 0.5, ap_max: 6.0  },
  { manufacturer: "sandvik", code: "PF", purpose: "Finish steel",        iso_groups: ["P"],       feed_min: 0.05, feed_max: 0.25, ap_min: 0.15, ap_max: 2.0 },
  { manufacturer: "sandvik", code: "MF", purpose: "Finish stainless",    iso_groups: ["M"],       feed_min: 0.08, feed_max: 0.35, ap_min: 0.2, ap_max: 2.5  },
  { manufacturer: "sandvik", code: "MM", purpose: "Medium stainless",    iso_groups: ["M"],       feed_min: 0.15, feed_max: 0.45, ap_min: 0.5, ap_max: 4.0  },
  { manufacturer: "sandvik", code: "KF", purpose: "Finish cast iron",    iso_groups: ["K"],       feed_min: 0.08, feed_max: 0.30, ap_min: 0.2, ap_max: 3.0  },
  { manufacturer: "sandvik", code: "GR", purpose: "Grooving",            iso_groups: ["P", "M"],  feed_min: 0.05, feed_max: 0.20, ap_min: 0.1, ap_max: 6.0  },
  { manufacturer: "sandvik", code: "NF", purpose: "Finish non-ferrous",  iso_groups: ["N"],       feed_min: 0.05, feed_max: 0.30, ap_min: 0.1, ap_max: 3.0  },
  // Kennametal
  { manufacturer: "kennametal", code: "MP", purpose: "Medium purpose",   iso_groups: ["P"],       feed_min: 0.15, feed_max: 0.45, ap_min: 0.5, ap_max: 5.0  },
  { manufacturer: "kennametal", code: "FP", purpose: "Finishing",        iso_groups: ["P", "M"],  feed_min: 0.05, feed_max: 0.25, ap_min: 0.15, ap_max: 2.0 },
  { manufacturer: "kennametal", code: "RP", purpose: "Roughing",         iso_groups: ["P"],       feed_min: 0.30, feed_max: 0.75, ap_min: 2.0, ap_max: 10.0 },
  // ISCAR
  { manufacturer: "iscar", code: "NM", purpose: "Medium steel",          iso_groups: ["P"],       feed_min: 0.15, feed_max: 0.45, ap_min: 0.5, ap_max: 5.0  },
  { manufacturer: "iscar", code: "NR", purpose: "Rough steel",           iso_groups: ["P"],       feed_min: 0.30, feed_max: 0.80, ap_min: 2.0, ap_max: 12.0 },
  { manufacturer: "iscar", code: "NF", purpose: "Finish",                iso_groups: ["P", "M"],  feed_min: 0.05, feed_max: 0.25, ap_min: 0.15, ap_max: 2.0 },
  // Tungaloy / Mitsubishi
  { manufacturer: "tungaloy", code: "TKY-DM",  purpose: "Medium steel", iso_groups: ["P"],       feed_min: 0.15, feed_max: 0.50, ap_min: 0.5, ap_max: 5.5 },
  { manufacturer: "mitsubishi", code: "MY",    purpose: "Medium steel", iso_groups: ["P"],       feed_min: 0.15, feed_max: 0.45, ap_min: 0.5, ap_max: 5.0 },
];

export interface ChipbreakerValidateInput {
  manufacturer: Manufacturer;
  code: string;
  iso_group: IsoGroup;
  feed_mm_rev: number;
  ap_mm: number;
}

export interface ChipbreakerAlternative {
  manufacturer: Manufacturer;
  code: string;
  purpose: string;
  reason: string;
}

export interface ChipbreakerValidateResult {
  geometry_found: boolean;
  in_window: boolean;
  feed_in_window: boolean;
  ap_in_window: boolean;
  iso_group_supported: boolean;
  geometry?: ChipbreakerGeometry;
  /** Suggestions when in_window = false. */
  alternatives: ChipbreakerAlternative[];
  /** Direct parameter-adjustment suggestion (stays on chosen breaker if possible). */
  parameter_adjustment?: {
    suggested_feed_mm_rev?: number;
    suggested_ap_mm?: number;
    rationale: string;
  };
  warnings: string[];
}

function inRange(v: number, lo: number, hi: number): boolean {
  return v >= lo && v <= hi;
}

export class TurningChipbreakerCatalogEngine {
  /**
   * Look up a named chipbreaker geometry and validate feed/ap parameters
   * against its operating window. Recommends alternatives when out of range.
   */
  validate(input: ChipbreakerValidateInput): ChipbreakerValidateResult {
    const warnings: string[] = [];
    const geom = CHIPBREAKER_CATALOG.find(
      g => g.manufacturer === input.manufacturer && g.code === input.code,
    );
    if (!geom) {
      warnings.push(`No catalog entry for ${input.manufacturer} ${input.code}.`);
      return {
        geometry_found: false,
        in_window: false,
        feed_in_window: false,
        ap_in_window: false,
        iso_group_supported: false,
        alternatives: this.recommendForPoint(input.iso_group, input.feed_mm_rev, input.ap_mm),
        warnings,
      };
    }
    const isoOK = geom.iso_groups.includes(input.iso_group);
    const feedOK = inRange(input.feed_mm_rev, geom.feed_min, geom.feed_max);
    const apOK = inRange(input.ap_mm, geom.ap_min, geom.ap_max);
    const inWindow = isoOK && feedOK && apOK;

    if (!isoOK) {
      warnings.push(
        `Geometry ${geom.code} is not rated for ISO ${input.iso_group}; supported: ${geom.iso_groups.join(",")}.`,
      );
    }

    let adjustment: ChipbreakerValidateResult["parameter_adjustment"];
    if (!feedOK && isoOK && apOK) {
      const nudged = Math.min(Math.max(input.feed_mm_rev, geom.feed_min), geom.feed_max);
      adjustment = {
        suggested_feed_mm_rev: nudged,
        rationale:
          `Feed ${input.feed_mm_rev} mm/rev is outside ${geom.code} window [${geom.feed_min}, ${geom.feed_max}]. ` +
          `Adjust to ${nudged} mm/rev to stay on the chosen breaker.`,
      };
    } else if (!apOK && isoOK && feedOK) {
      const nudged = Math.min(Math.max(input.ap_mm, geom.ap_min), geom.ap_max);
      adjustment = {
        suggested_ap_mm: nudged,
        rationale:
          `Depth-of-cut ${input.ap_mm} mm is outside ${geom.code} window [${geom.ap_min}, ${geom.ap_max}]. ` +
          `Adjust to ${nudged} mm.`,
      };
    }

    const alternatives = inWindow
      ? []
      : this.recommendForPoint(input.iso_group, input.feed_mm_rev, input.ap_mm).filter(
          a => !(a.manufacturer === geom.manufacturer && a.code === geom.code),
        );

    return {
      geometry_found: true,
      in_window: inWindow,
      feed_in_window: feedOK,
      ap_in_window: apOK,
      iso_group_supported: isoOK,
      geometry: geom,
      alternatives,
      parameter_adjustment: adjustment,
      warnings,
    };
  }

  /**
   * Return every geometry whose window contains the given (iso, feed, ap)
   * point — a ranked "recommender" view over the catalog.
   */
  recommendForPoint(iso: IsoGroup, feed: number, ap: number): ChipbreakerAlternative[] {
    const hits = CHIPBREAKER_CATALOG.filter(
      g =>
        g.iso_groups.includes(iso) &&
        inRange(feed, g.feed_min, g.feed_max) &&
        inRange(ap, g.ap_min, g.ap_max),
    );
    return hits.map(g => ({
      manufacturer: g.manufacturer,
      code: g.code,
      purpose: g.purpose,
      reason: `Accepts feed=${feed}, ap=${ap} for ISO ${iso}.`,
    }));
  }

  /** Return the full catalog for diagnostic / UI rendering. */
  list(): ChipbreakerGeometry[] {
    return CHIPBREAKER_CATALOG;
  }
}

/** Singleton instance. */
export const turningChipbreakerCatalogEngine = new TurningChipbreakerCatalogEngine();
