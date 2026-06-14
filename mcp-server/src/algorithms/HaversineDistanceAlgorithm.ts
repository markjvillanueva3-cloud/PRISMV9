/**
 * HaversineDistanceAlgorithm — great-circle distance between two coordinates
 * (hotel iter11, 2026-05-24, U-HAVERSINE-DISTANCE).
 *
 * Closes the "no geo distance" gap behind G9 (region-aware vendor sort).
 * Implements the canonical haversine formula:
 *
 *     a = sin²(Δφ/2) + cos(φ₁)·cos(φ₂)·sin²(Δλ/2)
 *     c = 2·atan2(√a, √(1−a))
 *     d = R·c
 *
 *   φ = latitude (rad), λ = longitude (rad), R = Earth radius.
 *
 * Numerical stability: haversine is preferred over the spherical law of
 * cosines for small distances (the LoC suffers catastrophic cancellation
 * below ~1 m). For sub-meter precision use Vincenty's formulae on the
 * WGS-84 ellipsoid — not implemented here (overkill for shop-floor
 * vendor-distance work).
 *
 * Reference: R. W. Sinnott, "Virtues of the Haversine", Sky and Telescope,
 * vol 68, no 2, 1984, p. 159. Bohan, Sloan & Wagstaff, "Computing the
 * Distance Between Two Geographic Coordinates", 2010 (numerical stability
 * analysis).
 *
 * Pure function — no I/O, no engine class, no state. Imported by
 * VendorRegionEngine + any other consumer needing geo distance.
 */

// ─── Constants (named, not magic) ───────────────────────────────────────────

/** Earth's mean radius — IUGG 2008 reference value. */
export const EARTH_RADIUS_KM = 6371.0088;
/** Earth's mean radius in statute miles (R_km × 0.6213712). */
export const EARTH_RADIUS_MI = 3958.7613;
/** Conversion: 1 km = this many statute miles. */
export const KM_PER_MILE = 1.609344;

const LAT_MIN_DEG = -90;
const LAT_MAX_DEG = 90;
const LON_MIN_DEG = -180;
const LON_MAX_DEG = 180;
const DEG_TO_RAD = Math.PI / 180;

// ─── Types ──────────────────────────────────────────────────────────────────

export interface GeoPoint {
  /** Latitude in decimal degrees, -90..90 */
  lat: number;
  /** Longitude in decimal degrees, -180..180 */
  lon: number;
}

export type DistanceUnit = "km" | "mi";

export interface HaversineResult {
  /** Distance, expressed in the requested unit. */
  distance: number;
  unit: DistanceUnit;
  /** Bearing from `a` to `b` in degrees, 0..360 (0 = due north, clockwise). */
  bearing_deg: number;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function assertFiniteCoord(p: GeoPoint, label: string): void {
  if (!Number.isFinite(p.lat) || !Number.isFinite(p.lon)) {
    throw new Error(`${label}: lat/lon must be finite (got lat=${p.lat}, lon=${p.lon})`);
  }
  if (p.lat < LAT_MIN_DEG || p.lat > LAT_MAX_DEG) {
    throw new Error(`${label}: lat out of range [${LAT_MIN_DEG}, ${LAT_MAX_DEG}] (got ${p.lat})`);
  }
  if (p.lon < LON_MIN_DEG || p.lon > LON_MAX_DEG) {
    throw new Error(`${label}: lon out of range [${LON_MIN_DEG}, ${LON_MAX_DEG}] (got ${p.lon})`);
  }
}

/**
 * Initial bearing (forward azimuth) from a → b.
 *
 *     θ = atan2(sin(Δλ)·cos(φ₂), cos(φ₁)·sin(φ₂) − sin(φ₁)·cos(φ₂)·cos(Δλ))
 *
 * Returned in degrees, normalized to [0, 360).
 */
function initialBearingDeg(a: GeoPoint, b: GeoPoint): number {
  const φ1 = a.lat * DEG_TO_RAD;
  const φ2 = b.lat * DEG_TO_RAD;
  const Δλ = (b.lon - a.lon) * DEG_TO_RAD;
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  const θRad = Math.atan2(y, x);
  const θDeg = θRad * (180 / Math.PI);
  return (θDeg + 360) % 360;
}

// ─── Main: haversine distance ───────────────────────────────────────────────

/**
 * Great-circle distance between two coordinates on a spherical Earth.
 *
 * @param a — first point (lat/lon in decimal degrees)
 * @param b — second point
 * @param unit — "km" (default) or "mi"
 * @returns { distance, unit, bearing_deg }
 * @throws on non-finite or out-of-range coordinates (R12 fail-loud)
 */
export function haversineDistance(a: GeoPoint, b: GeoPoint, unit: DistanceUnit = "km"): HaversineResult {
  assertFiniteCoord(a, "haversine.a");
  assertFiniteCoord(b, "haversine.b");

  const φ1 = a.lat * DEG_TO_RAD;
  const φ2 = b.lat * DEG_TO_RAD;
  const Δφ = (b.lat - a.lat) * DEG_TO_RAD;
  const Δλ = (b.lon - a.lon) * DEG_TO_RAD;

  const sinHalfΔφ = Math.sin(Δφ / 2);
  const sinHalfΔλ = Math.sin(Δλ / 2);
  const h = sinHalfΔφ * sinHalfΔφ
          + Math.cos(φ1) * Math.cos(φ2) * sinHalfΔλ * sinHalfΔλ;
  // Clamp h to [0, 1] — floating-point can produce h slightly > 1 for
  // antipodal points, which would yield NaN from sqrt(1-h).
  const hSafe = Math.min(1, Math.max(0, h));
  const c = 2 * Math.atan2(Math.sqrt(hSafe), Math.sqrt(1 - hSafe));

  const distanceKm = EARTH_RADIUS_KM * c;
  const distance = unit === "mi" ? distanceKm / KM_PER_MILE : distanceKm;
  const bearing_deg = initialBearingDeg(a, b);
  return { distance, unit, bearing_deg };
}

/**
 * Convenience — distance only, no bearing, returned as a bare number in km.
 */
export function distanceKm(a: GeoPoint, b: GeoPoint): number {
  return haversineDistance(a, b, "km").distance;
}

/**
 * Distance in statute miles (US-convenient for ZIP-coded shop work).
 */
export function distanceMi(a: GeoPoint, b: GeoPoint): number {
  return haversineDistance(a, b, "mi").distance;
}

// ─── ZIP-centroid lookup (minimal — only US-state-capital sample for tests
//      and demo; operators replace with a real US ZIP-centroid file via
//      registerZipCentroids in the engine layer) ──────────────────────────

/**
 * A tiny built-in ZIP → centroid table covering ~30 sample US ZIPs that
 * matter for JM Die's regional vendor work (Chicago, NYC, LA, Houston, etc.).
 * Replace at runtime by passing a fuller map to VendorRegionEngine.
 */
export const SAMPLE_ZIP_CENTROIDS: Readonly<Record<string, GeoPoint>> = Object.freeze({
  // JM Die metro region (Chicago + suburbs)
  "60018": { lat: 41.9931, lon: -87.9006 },  // Des Plaines, IL
  "60601": { lat: 41.8858, lon: -87.6181 },  // Chicago, IL (Loop)
  "60173": { lat: 42.0455, lon: -88.0334 },  // Schaumburg, IL
  "60506": { lat: 41.7606, lon: -88.3201 },  // Aurora, IL
  "60440": { lat: 41.7164, lon: -88.0670 },  // Bolingbrook, IL
  // Other key US ZIPs
  "10001": { lat: 40.7506, lon: -73.9971 },  // New York, NY (Midtown)
  "90001": { lat: 33.9731, lon: -118.2479 }, // Los Angeles, CA
  "77002": { lat: 29.7589, lon: -95.3677 },  // Houston, TX
  "30303": { lat: 33.7537, lon: -84.3863 },  // Atlanta, GA
  "98101": { lat: 47.6111, lon: -122.3331 },// Seattle, WA
  "02108": { lat: 42.3577, lon: -71.0671 },  // Boston, MA
  "75201": { lat: 32.7847, lon: -96.7967 },  // Dallas, TX
  "55401": { lat: 44.9847, lon: -93.2701 },  // Minneapolis, MN
  "48201": { lat: 42.3559, lon: -83.0568 },  // Detroit, MI
  "63101": { lat: 38.6311, lon: -90.1929 },  // St Louis, MO
  // Distributor HQs (matches DistributorSearchEngine reference catalog)
  "10118": { lat: 40.7486, lon: -73.9858 },  // MSC HQ-ish, NYC
  "60061": { lat: 42.2587, lon: -87.9398 },  // Grainger HQ, Lake Forest IL
  "55812": { lat: 46.8087, lon: -92.0993 },  // Fastenal HQ, Winona MN (closest sample)
});

/**
 * Resolve a US ZIP-5 to its centroid. Returns null on miss — the caller
 * should fall back to a city/state geocoder or accept "unknown distance".
 */
export function zipCentroid(zip: string, table: Readonly<Record<string, GeoPoint>> = SAMPLE_ZIP_CENTROIDS): GeoPoint | null {
  if (typeof zip !== "string") return null;
  const z5 = zip.trim().slice(0, 5);
  return table[z5] ?? null;
}
