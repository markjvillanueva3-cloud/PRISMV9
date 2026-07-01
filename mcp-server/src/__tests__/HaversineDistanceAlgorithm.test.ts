/**
 * HaversineDistanceAlgorithm.test.ts — hotel iter11 / U-HAVERSINE-DISTANCE.
 * Reference distances cross-checked against NOAA great-circle calculator
 * (https://www.nhc.noaa.gov/gccalc.shtml) and the canonical Sinnott 1984
 * worked examples. Distances within ±0.5% of authoritative sources.
 */

import { describe, it, expect } from "vitest";
import {
  haversineDistance,
  distanceKm,
  distanceMi,
  zipCentroid,
  SAMPLE_ZIP_CENTROIDS,
  EARTH_RADIUS_KM,
  KM_PER_MILE,
  type GeoPoint,
} from "../algorithms/HaversineDistanceAlgorithm.js";

// ── Reference coordinates (canonical city centers, decimal degrees) ────────
const CHICAGO: GeoPoint = { lat: 41.8781, lon: -87.6298 };
const NEW_YORK: GeoPoint = { lat: 40.7128, lon: -74.0060 };
const LOS_ANGELES: GeoPoint = { lat: 34.0522, lon: -118.2437 };
const LONDON: GeoPoint = { lat: 51.5074, lon: -0.1278 };

// ── Reference distances (km) — cross-checked against NOAA gccalc ──────────
const DIST_CHI_NYC_KM = 1145;       // ±0.5%
const DIST_CHI_LAX_KM = 2807;       // ±0.5%
const DIST_NYC_LON_KM = 5570;       // ±0.5%
const DIST_TOLERANCE_PCT = 0.005;

// ── Algebraic invariants ──────────────────────────────────────────────────
const EQUATOR_QUARTER_KM = (Math.PI / 2) * EARTH_RADIUS_KM;  // 90° on equator
const POLE_TO_POLE_KM = Math.PI * EARTH_RADIUS_KM;            // 180° on any meridian

describe("haversineDistance — canonical city pairs (NOAA-validated)", () => {
  it("Chicago → New York: ~1145 km (±0.5%)", () => {
    const r = haversineDistance(CHICAGO, NEW_YORK, "km");
    expect(r.unit).toBe("km");
    expect(Math.abs(r.distance - DIST_CHI_NYC_KM) / DIST_CHI_NYC_KM).toBeLessThan(DIST_TOLERANCE_PCT);
  });

  it("Chicago → Los Angeles: ~2807 km (±0.5%)", () => {
    const r = haversineDistance(CHICAGO, LOS_ANGELES, "km");
    expect(Math.abs(r.distance - DIST_CHI_LAX_KM) / DIST_CHI_LAX_KM).toBeLessThan(DIST_TOLERANCE_PCT);
  });

  it("New York → London: ~5570 km (transatlantic, ±0.5%)", () => {
    const r = haversineDistance(NEW_YORK, LONDON, "km");
    expect(Math.abs(r.distance - DIST_NYC_LON_KM) / DIST_NYC_LON_KM).toBeLessThan(DIST_TOLERANCE_PCT);
  });

  it("includes bearing in (0, 360]", () => {
    const r = haversineDistance(CHICAGO, NEW_YORK);
    expect(r.bearing_deg).toBeGreaterThanOrEqual(0);
    expect(r.bearing_deg).toBeLessThan(360);
    // Chicago → NYC is roughly E-NE; bearing should be ~70-100°
    expect(r.bearing_deg).toBeGreaterThan(50);
    expect(r.bearing_deg).toBeLessThan(120);
  });
});

describe("haversineDistance — algebraic invariants", () => {
  it("identical points → distance 0", () => {
    expect(distanceKm(CHICAGO, CHICAGO)).toBeCloseTo(0, 10);
  });

  it("antipodal points → ≈ π·R (half earth circumference)", () => {
    const antipode: GeoPoint = { lat: -CHICAGO.lat, lon: CHICAGO.lon + 180 };
    const d = distanceKm(CHICAGO, antipode);
    expect(Math.abs(d - POLE_TO_POLE_KM) / POLE_TO_POLE_KM).toBeLessThan(0.001);
  });

  it("quarter-equator: (0,0) → (0,90) ≈ π·R/2", () => {
    const d = distanceKm({ lat: 0, lon: 0 }, { lat: 0, lon: 90 });
    expect(Math.abs(d - EQUATOR_QUARTER_KM) / EQUATOR_QUARTER_KM).toBeLessThan(0.001);
  });

  it("pole-to-pole on meridian (-90,0)→(90,0) ≈ π·R", () => {
    const d = distanceKm({ lat: -90, lon: 0 }, { lat: 90, lon: 0 });
    expect(Math.abs(d - POLE_TO_POLE_KM) / POLE_TO_POLE_KM).toBeLessThan(0.001);
  });

  it("symmetry: d(a,b) = d(b,a)", () => {
    const ab = distanceKm(CHICAGO, NEW_YORK);
    const ba = distanceKm(NEW_YORK, CHICAGO);
    expect(Math.abs(ab - ba)).toBeLessThan(1e-9);
  });

  it("triangle inequality: d(a,c) ≤ d(a,b) + d(b,c)", () => {
    const ac = distanceKm(CHICAGO, LOS_ANGELES);
    const ab = distanceKm(CHICAGO, NEW_YORK);
    const bc = distanceKm(NEW_YORK, LOS_ANGELES);
    expect(ac).toBeLessThanOrEqual(ab + bc + 1e-6);
  });
});

describe("haversineDistance — unit conversion", () => {
  it("mi result equals km result divided by KM_PER_MILE", () => {
    const kmR = haversineDistance(CHICAGO, NEW_YORK, "km");
    const miR = haversineDistance(CHICAGO, NEW_YORK, "mi");
    expect(miR.unit).toBe("mi");
    expect(Math.abs(miR.distance - kmR.distance / KM_PER_MILE)).toBeLessThan(1e-6);
  });

  it("distanceMi convenience matches haversineDistance(..., 'mi')", () => {
    const a = distanceMi(CHICAGO, NEW_YORK);
    const b = haversineDistance(CHICAGO, NEW_YORK, "mi").distance;
    expect(a).toBe(b);
  });
});

describe("haversineDistance — R12 fail-loud on bad inputs", () => {
  it("rejects NaN lat", () => {
    expect(() => haversineDistance({ lat: NaN, lon: 0 }, CHICAGO)).toThrow(/must be finite/);
  });

  it("rejects Infinity lon", () => {
    expect(() => haversineDistance(CHICAGO, { lat: 0, lon: Infinity })).toThrow(/must be finite/);
  });

  it("rejects lat > 90 (out of range)", () => {
    expect(() => haversineDistance({ lat: 91, lon: 0 }, CHICAGO)).toThrow(/lat out of range/);
  });

  it("rejects lat < -90", () => {
    expect(() => haversineDistance({ lat: -90.1, lon: 0 }, CHICAGO)).toThrow(/lat out of range/);
  });

  it("rejects lon > 180", () => {
    expect(() => haversineDistance({ lat: 0, lon: 181 }, CHICAGO)).toThrow(/lon out of range/);
  });

  it("rejects lon < -180", () => {
    expect(() => haversineDistance({ lat: 0, lon: -180.5 }, CHICAGO)).toThrow(/lon out of range/);
  });
});

describe("zipCentroid — built-in sample table", () => {
  it("resolves a known JM Die area ZIP (60018 Des Plaines)", () => {
    const c = zipCentroid("60018");
    expect(c).not.toBe(null);
    expect(c?.lat).toBeCloseTo(41.9931, 3);
    expect(c?.lon).toBeCloseTo(-87.9006, 3);
  });

  it("returns null for unknown ZIP", () => {
    expect(zipCentroid("99999") === null).toBe(true);
  });

  it("returns null for non-string ZIP", () => {
    expect(zipCentroid(null as unknown as string) === null).toBe(true);
  });

  it("accepts ZIP+4 form by truncating to first 5 chars", () => {
    const c = zipCentroid("60018-1234");
    expect(c?.lat).toBeCloseTo(41.9931, 3);
  });

  it("accepts a custom table override", () => {
    const custom = { "00000": { lat: 1, lon: 2 } };
    const c = zipCentroid("00000", custom);
    expect(c?.lat).toBe(1);
  });

  it("sample table includes the 5 JM Die metro ZIPs (Chicago region)", () => {
    const jmDieRegion = ["60018", "60601", "60173", "60506", "60440"];
    for (const z of jmDieRegion) {
      expect(SAMPLE_ZIP_CENTROIDS[z]).not.toBe(undefined);
    }
  });
});
