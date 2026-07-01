/**
 * VendorRegionEngine — region-aware vendor selection + sort
 * (hotel iter11, 2026-05-24, U-VENDOR-REGION-SORT).
 *
 * Closes G9 from the ERP-comparison audit. Reads vendors from VendorEngine,
 * resolves each vendor's ZIP to a geo-centroid via HaversineDistanceAlgorithm,
 * computes haversine distance from a shop origin (default: JM Die at Des
 * Plaines IL 60018), and returns vendors sorted by proximity.
 *
 * Pure read engine — no state mutation. All inputs validated R12 fail-loud.
 * Defensive copy on every public return.
 *
 * Hotel-soul:
 *   - **no silent fallback** — vendors with unknown ZIP are returned in a
 *     `unknown_location` bucket, never silently sorted as "infinity distance"
 *     mixed with real distances (that would lie to the operator)
 *   - **caller picks distance metric** — km or mi explicit; no implicit default
 *   - **deterministic tie-break** — equidistant vendors sort by vendor_id asc
 */

import { distanceMi, distanceKm, zipCentroid, type GeoPoint, type DistanceUnit, SAMPLE_ZIP_CENTROIDS } from "../algorithms/HaversineDistanceAlgorithm.js";
import { vendorEngine } from "./VendorEngine.js";
import type { Vendor, VendorCategory } from "./VendorEngine.js";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface VendorWithDistance {
  vendor: Vendor;
  origin_zip: string;
  vendor_zip: string;
  distance: number | null;  // null if either ZIP can't be resolved
  unit: DistanceUnit;
  bearing_deg?: number;
}

export interface RegionSearchInput {
  origin_zip: string;          // ZIP-5 of the shop / job
  category?: VendorCategory;   // filter to one vendor category
  unit?: DistanceUnit;         // "km" (default) or "mi"
  max_distance?: number;       // hard cutoff (in unit) — exclude beyond
  limit?: number;              // top-N after sort
  zip_table?: Record<string, GeoPoint>;  // operator-supplied larger table
}

export interface RegionSearchResponse {
  origin_zip: string;
  origin_resolved: boolean;    // was origin_zip in the table?
  unit: DistanceUnit;
  ranked: VendorWithDistance[];          // sorted ASC by distance (closest first)
  unknown_location: VendorWithDistance[]; // vendors whose ZIP couldn't be resolved (distance=null)
  total_vendors_considered: number;
  fetched_at: string;
}

// ─── Constants (named, not magic) ───────────────────────────────────────────

const DEFAULT_DISTANCE_UNIT: DistanceUnit = "km";
const JM_DIE_ORIGIN_ZIP = "60018";  // Des Plaines, IL (canonical test-shop origin)
const MAX_ORIGIN_ZIP_LEN = 10;       // allow ZIP+4 format
const ORIGIN_ZIP_REGEX = /^\d{5}(-\d{4})?$/;

// ─── Helpers ────────────────────────────────────────────────────────────────

function assertValidOriginZip(zip: string): void {
  if (typeof zip !== "string") throw new Error("origin_zip: must be a string");
  const trimmed = zip.trim();
  if (trimmed.length === 0) throw new Error("origin_zip: empty");
  if (trimmed.length > MAX_ORIGIN_ZIP_LEN) throw new Error(`origin_zip: exceeds ${MAX_ORIGIN_ZIP_LEN} chars`);
  if (!ORIGIN_ZIP_REGEX.test(trimmed)) throw new Error(`origin_zip: must be ZIP-5 or ZIP+4 format (got '${trimmed}')`);
}

function vendorZipOrEmpty(v: Vendor): string {
  return v.address?.zip?.trim() ?? "";
}

// ─── Engine ─────────────────────────────────────────────────────────────────

export class VendorRegionEngine {
  /**
   * Default JM Die shop origin (Des Plaines, IL 60018). Used when no
   * origin_zip is supplied. Constant — operators override per-call.
   */
  readonly defaultOriginZip = JM_DIE_ORIGIN_ZIP;

  /**
   * Rank vendors by proximity to an origin ZIP. Unknown-location vendors
   * land in a separate bucket (never silently sorted last as "infinity").
   *
   * @throws on bad origin_zip (R12 fail-loud — see assertValidOriginZip)
   */
  rankByDistance(input: RegionSearchInput): RegionSearchResponse {
    assertValidOriginZip(input.origin_zip);
    const unit: DistanceUnit = input.unit ?? DEFAULT_DISTANCE_UNIT;
    const zipTable = input.zip_table ?? SAMPLE_ZIP_CENTROIDS;
    const originGeo = zipCentroid(input.origin_zip, zipTable);

    // Pull vendor universe (optionally category-filtered) from VendorEngine
    const allVendors: Vendor[] = vendorEngine.list("active");
    const filtered = input.category
      ? allVendors.filter(v => v.categories.includes(input.category as VendorCategory))
      : allVendors;

    const ranked: VendorWithDistance[] = [];
    const unknown: VendorWithDistance[] = [];

    for (const v of filtered) {
      const vzip = vendorZipOrEmpty(v);
      const vendorGeo = vzip ? zipCentroid(vzip, zipTable) : null;
      if (!originGeo || !vendorGeo) {
        unknown.push({
          vendor: { ...v },
          origin_zip: input.origin_zip,
          vendor_zip: vzip,
          distance: null,
          unit,
        });
        continue;
      }
      const d = unit === "mi" ? distanceMi(originGeo, vendorGeo) : distanceKm(originGeo, vendorGeo);
      ranked.push({
        vendor: { ...v },
        origin_zip: input.origin_zip,
        vendor_zip: vzip,
        distance: d,
        unit,
      });
    }

    // Sort ASC by distance; tie-break by vendor id (deterministic)
    ranked.sort((a, b) => {
      const da = a.distance ?? Number.POSITIVE_INFINITY;
      const db = b.distance ?? Number.POSITIVE_INFINITY;
      if (da !== db) return da - db;
      return a.vendor.id.localeCompare(b.vendor.id);
    });

    // Apply max_distance cutoff + limit
    let trimmed = ranked;
    if (input.max_distance !== undefined && Number.isFinite(input.max_distance)) {
      trimmed = trimmed.filter(r => r.distance !== null && r.distance <= (input.max_distance ?? Infinity));
    }
    if (input.limit !== undefined && Number.isInteger(input.limit) && input.limit > 0) {
      trimmed = trimmed.slice(0, input.limit);
    }

    return {
      origin_zip: input.origin_zip,
      origin_resolved: originGeo !== null,
      unit,
      ranked: trimmed,
      unknown_location: unknown,
      total_vendors_considered: filtered.length,
      fetched_at: new Date().toISOString(),
    };
  }

  /**
   * Closest single vendor in a category. Returns null if no vendor matches
   * or no vendor has a resolvable ZIP.
   */
  nearest(category: VendorCategory, origin_zip?: string, unit: DistanceUnit = DEFAULT_DISTANCE_UNIT): VendorWithDistance | null {
    const r = this.rankByDistance({
      origin_zip: origin_zip ?? this.defaultOriginZip,
      category,
      unit,
      limit: 1,
    });
    return r.ranked.length > 0 ? r.ranked[0] : null;
  }

  /**
   * Vendors within max_distance (in unit) of the origin. Convenience for
   * "show me everything inside a 50-mile radius".
   */
  withinRadius(origin_zip: string, max_distance: number, unit: DistanceUnit = DEFAULT_DISTANCE_UNIT, category?: VendorCategory): VendorWithDistance[] {
    return this.rankByDistance({ origin_zip, max_distance, unit, category }).ranked;
  }
}

export const vendorRegionEngine = new VendorRegionEngine();
