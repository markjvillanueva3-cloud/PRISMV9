/**
 * HolderSelectionEngine -- pick a REAL tool holder from the branded catalogs by
 * taper + shank-bore fit + type, and organize the holder database by type -> brand.
 *
 * The verifiable CORE of "populate the tool-holder database" (operator directive
 * 2026-06-09). The three CAM tool exporters (Fusion/Mastercam/hyperMILL) currently
 * SYNTHESIZE holders by size-guess (`inferHolder`, `Math.max(shankD+8,26)`); this engine
 * replaces that guess with a lookup into the real manufacturer holder catalogs:
 *   - HAIMER_HOLDERS      (489: shrink_fit / weldon / hydraulic)
 *   - GUHRING_HOLDERS     (hydraulic, by series)
 *   - BIG_DAISHOWA_HOLDERS (shrink_fit / hydraulic / milling_chuck / collet_chuck / power_chuck / side_lock)
 *
 * Pure + deterministic (no I/O, no catalog network) -> unit-testable against real
 * reference holders. The standard bare-interface set (ToolHolderDatabaseEngine, 80+
 * v_flange/bt_taper/hsk) is NOT a selectable clamping holder (no collet bore) and is
 * organized separately by the library exporter; this engine owns the bore-bearing
 * branded holders that actually grip a tool shank.
 *
 * @module engines/HolderSelectionEngine
 * @milestone CATALOG-APP-WIRING-MS0 U-HOLDER-SELECT (slot:romeo)
 */

import { HAIMER_HOLDERS } from "../data/haimer-holder-catalog.js";
import { GUHRING_HOLDERS } from "../data/guhring-holder-catalog.js";
import { BIG_DAISHOWA_HOLDERS } from "../data/big-daishowa-holders.js";

/** Holder brand (manufacturer). */
export type HolderBrand = "HAIMER" | "GUHRING" | "BIG DAISHOWA";

/** Unified holder record across the branded catalogs. */
export interface HolderRecord {
  brand: HolderBrand;
  /** Holder clamping type: shrink_fit | hydraulic | weldon | milling_chuck | collet_chuck | power_chuck | side_lock. */
  type: string;
  /** Catalog designation / model number. */
  designation: string;
  /** Spindle taper interface (normalized, e.g. CAT40, BT40, HSK-A63). */
  taper: string;
  /** Smallest clamping bore (mm). For single-bore holders boreMinMm === boreMaxMm. */
  boreMinMm: number;
  /** Largest clamping bore (mm). */
  boreMaxMm: number;
  /** Holder body diameter (mm) if known. */
  bodyDiaMm: number | null;
  /** Gauge length (mm) if known. */
  gaugeMm: number | null;
  /** Overall length (mm) if known. */
  overallMm: number | null;
  /** Source data module. */
  source: string;
}

export interface HolderSelectionQuery {
  /** Spindle taper interface (CAT40, BT40, HSK-A63, ...). */
  taper: string;
  /** Tool shank diameter to clamp (mm). */
  shankDiameterMm: number;
  /** Preferred holder type (e.g. "shrink_fit"); a matching type wins ties. */
  typePreference?: string;
  /** Bore-fit tolerance for exact-bore (shrink_fit / weldon) holders, mm. Default 0.05. */
  exactBoreToleranceMm?: number;
}

/** Holder types that clamp on an EXACT bore (no range): bore must equal the shank. */
const EXACT_BORE_TYPES = new Set(["shrink_fit", "weldon", "side_lock"]);

/** Normalize a taper string for matching: upper-case, trim, collapse separators. */
export function normalizeTaper(t: string): string {
  return String(t ?? "")
    .toUpperCase()
    .trim()
    .replace(/\s+/g, "")
    .replace(/_/g, "-");
}

export class HolderSelectionEngine {
  private _records: HolderRecord[] | null = null;

  /** Normalize + cache every branded holder into a unified record list. */
  all(): HolderRecord[] {
    if (this._records) return this._records;
    const out: HolderRecord[] = [];

    for (const h of (HAIMER_HOLDERS as any[]) ?? []) {
      const bore = Number(h.bore_diameter_mm);
      if (!Number.isFinite(bore)) continue; // a holder with no clamping bore can't grip a shank
      out.push({
        brand: "HAIMER",
        type: String(h.holder_type ?? "unknown"),
        designation: String(h.designation ?? ""),
        taper: normalizeTaper(h.taper),
        boreMinMm: bore,
        boreMaxMm: bore,
        bodyDiaMm: Number.isFinite(h.body_diameter_mm) ? Number(h.body_diameter_mm) : null,
        gaugeMm: Number.isFinite(h.gauge_length_mm) ? Number(h.gauge_length_mm) : null,
        overallMm: Number.isFinite(h.overall_length_mm) ? Number(h.overall_length_mm) : null,
        source: "haimer-holder-catalog",
      });
    }

    for (const h of (GUHRING_HOLDERS as any[]) ?? []) {
      const bore = Number(h.bore_diameter_mm);
      if (!Number.isFinite(bore)) continue;
      out.push({
        brand: "GUHRING",
        type: String(h.holder_type ?? "unknown"),
        designation: String(h.designation ?? ""),
        taper: normalizeTaper(h.taper),
        boreMinMm: bore,
        boreMaxMm: bore,
        bodyDiaMm: Number.isFinite(h.body_diameter_mm) ? Number(h.body_diameter_mm) : null,
        gaugeMm: Number.isFinite(h.gauge_length_mm) ? Number(h.gauge_length_mm) : null,
        overallMm: Number.isFinite(h.overall_length_mm) ? Number(h.overall_length_mm) : null,
        source: "guhring-holder-catalog",
      });
    }

    for (const h of (BIG_DAISHOWA_HOLDERS as any[]) ?? []) {
      const range = Array.isArray(h.bore_range_mm) ? h.bore_range_mm : [];
      const lo = Number(range[0]);
      const hi = Number(range[1]);
      if (!Number.isFinite(lo) || !Number.isFinite(hi)) continue;
      out.push({
        brand: "BIG DAISHOWA",
        type: String(h.type ?? "unknown"),
        designation: String(h.model ?? ""),
        taper: normalizeTaper(h.taper),
        boreMinMm: Math.min(lo, hi),
        boreMaxMm: Math.max(lo, hi),
        bodyDiaMm: null,
        gaugeMm: Number.isFinite(h.gauge_length_mm) ? Number(h.gauge_length_mm) : null,
        overallMm: null,
        source: "big-daishowa-holders",
      });
    }

    this._records = out;
    return out;
  }

  /** Does a holder clamp the given shank diameter? */
  private _fits(rec: HolderRecord, shankMm: number, tol: number): boolean {
    if (EXACT_BORE_TYPES.has(rec.type)) {
      // exact-bore holders (shrink-fit / weldon / side-lock): bore must equal the shank
      return Math.abs(rec.boreMinMm - shankMm) <= tol;
    }
    // range holders (hydraulic / collet / milling / power chucks): shank within [min, max]
    return shankMm >= rec.boreMinMm - tol && shankMm <= rec.boreMaxMm + tol;
  }

  /**
   * Select the best real holder for a tool shank. Returns null when nothing in the
   * branded catalogs matches the taper + can clamp the shank (caller may then fall back).
   *
   * Ranking: (1) matching typePreference wins; (2) tightest grip (smallest boreMax - shank);
   * (3) shortest gauge length (more rigid). Deterministic tie-break by designation.
   */
  select(query: HolderSelectionQuery): HolderRecord | null {
    const taper = normalizeTaper(query.taper);
    const shank = Number(query.shankDiameterMm);
    if (!taper || !Number.isFinite(shank) || shank <= 0) return null;
    const tol = Number.isFinite(query.exactBoreToleranceMm as number)
      ? (query.exactBoreToleranceMm as number)
      : 0.05;
    const pref = query.typePreference ? String(query.typePreference) : null;

    const candidates = this.all().filter((r) => r.taper === taper && this._fits(r, shank, tol));
    if (candidates.length === 0) return null;

    candidates.sort((a, b) => {
      if (pref) {
        const ap = a.type === pref ? 0 : 1;
        const bp = b.type === pref ? 0 : 1;
        if (ap !== bp) return ap - bp;
      }
      const aGrip = a.boreMaxMm - shank;
      const bGrip = b.boreMaxMm - shank;
      if (aGrip !== bGrip) return aGrip - bGrip;
      const aG = a.gaugeMm ?? Number.POSITIVE_INFINITY;
      const bG = b.gaugeMm ?? Number.POSITIVE_INFINITY;
      if (aG !== bG) return aG - bG;
      return a.designation.localeCompare(b.designation);
    });
    return candidates[0];
  }

  /** Organize the holder database by type -> brand -> holders (the library view). */
  byTypeBrand(): Record<string, Record<string, HolderRecord[]>> {
    const out: Record<string, Record<string, HolderRecord[]>> = {};
    for (const r of this.all()) {
      (out[r.type] ??= {});
      (out[r.type][r.brand] ??= []);
      out[r.type][r.brand].push(r);
    }
    return out;
  }

  /** Counts by brand, type, and taper -- for validation + the library summary. */
  stats(): {
    total: number;
    byBrand: Record<string, number>;
    byType: Record<string, number>;
    byTaper: Record<string, number>;
  } {
    const byBrand: Record<string, number> = {};
    const byType: Record<string, number> = {};
    const byTaper: Record<string, number> = {};
    for (const r of this.all()) {
      byBrand[r.brand] = (byBrand[r.brand] ?? 0) + 1;
      byType[r.type] = (byType[r.type] ?? 0) + 1;
      byTaper[r.taper] = (byTaper[r.taper] ?? 0) + 1;
    }
    return { total: this.all().length, byBrand, byType, byTaper };
  }
}

export const holderSelectionEngine = new HolderSelectionEngine();
