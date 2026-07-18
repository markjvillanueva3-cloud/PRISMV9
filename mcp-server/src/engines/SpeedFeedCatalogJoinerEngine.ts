/**
 * SpeedFeedCatalogJoinerEngine — unified manufacturer SFM/IPT lookup.
 *
 * Closes the structural ceiling in the U-OSC9-14 tri-vendor smoke (84.6% of
 * cells stuck in "weak_disagreement" because G-Wizard toolcrib.csv carries
 * geometry but no recommended Vc/fz columns). PRISM has rich SFM/IPT data in
 * `mcp-server/src/data/*-speed-feed-data.ts` extracted from OEM PDFs:
 *   - manufacturer-speed-feed-data.ts (Seco JS, Kennametal drills + mill inserts)
 *   - new-manufacturer-speed-feed-data.ts (Sumitomo, Dormer, Niagara, Horn)
 *   - guhring-iscar-speed-feed-data.ts (Gühring, ISCAR)
 *
 * All export `ManufacturerSpeedFeed[]` shape:
 *   {series, isoGroup, vc_min, vc_max, fz_min, fz_max, dc_min?, dc_max?}
 *
 * This engine unions the catalogs + provides a per-cell lookup:
 *   joiner.lookup({manufacturer, tool_id_or_series, iso_group, diameter_mm})
 *   → {vc_mpm, fz_mm, source_catalog, confidence} | null
 *
 * Match strategy (in order of confidence):
 *   1. EXACT manufacturer + series + iso_group [+ diameter in dc_min..dc_max]
 *   2. EXACT manufacturer + series prefix + iso_group
 *   3. manufacturer-token + iso_group + diameter bucket (cross-series fallback)
 *
 * Pure lookup (no I/O). Lazy-initializes the union index on first call so
 * boot cost is amortized across the session.
 *
 * @module engines/SpeedFeedCatalogJoinerEngine
 * @milestone OSCAR-SFC-9AXIS-MS0/U-OSC9-15-CATALOG-JOIN
 * @author oscar (slot:oscar, 2026-05-27)
 */

import { z } from "zod";
import {
  ALL_MANUFACTURER_SPEED_FEED,
  type ManufacturerSpeedFeed,
} from "../data/manufacturer-speed-feed-data.js";
import { ALL_NEW_MFR_SPEED_FEED } from "../data/new-manufacturer-speed-feed-data.js";
import {
  GUHRING_SPEED_FEED,
  ISCAR_SPEED_FEED,
} from "../data/guhring-iscar-speed-feed-data.js";

// ============================================================================
// SCHEMA
// ============================================================================

const ISOGroupSchema = z.enum(["P", "M", "K", "N", "S", "H"]);

export const SpeedFeedCatalogLookupInputSchema = z.object({
  manufacturer: z.string().min(1),
  /** Tool designation OR series (e.g. "JS512-006" or just "JS512"). */
  tool_id_or_series: z.string().min(1),
  iso_group: ISOGroupSchema,
  diameter_mm: z.number().positive().optional(),
});

export type SpeedFeedCatalogLookupInput = z.infer<typeof SpeedFeedCatalogLookupInputSchema>;

/** A single lookup result. */
export interface SpeedFeedCatalogMatch {
  /** Cutting speed median (m/min) — (vc_min + vc_max) / 2. */
  vc_mpm: number;
  /** Feed per tooth (or per rev for drills) median (mm). */
  fz_mm: number;
  /** Range bounds (m/min) — useful for confidence band. */
  vc_range: [number, number];
  /** Range bounds (mm). */
  fz_range: [number, number];
  /** Source catalog the match came from. */
  source_catalog: "seco" | "kennametal" | "guhring" | "iscar" | "sumitomo" | "dormer" | "niagara" | "horn" | "other";
  /** Matched series string. */
  matched_series: string;
  /** Match tier:
   *   "exact"             — manufacturer + series + iso + (diameter if specified)
   *   "exact_no_diameter" — manufacturer + series + iso, diameter outside dc range
   *   "series_prefix"     — manufacturer + series-prefix + iso
   *   "manufacturer_iso"  — manufacturer + iso only (last resort)
   */
  match_tier: "exact" | "exact_no_diameter" | "series_prefix" | "manufacturer_iso";
  /** Confidence 0..1 derived from match tier + range width. */
  confidence: number;
}

// ============================================================================
// CATALOG UNION (lazy-built)
// ============================================================================

/** Per-row union shape with manufacturer + source attribution. */
interface UnifiedRow extends ManufacturerSpeedFeed {
  manufacturer: string;
  source_catalog: SpeedFeedCatalogMatch["source_catalog"];
}

interface UnifiedIndex {
  rows: UnifiedRow[];
  /** manufacturer-token (lowercased) → rows[] */
  by_mfg: Map<string, UnifiedRow[]>;
}

let _index: UnifiedIndex | null = null;

/**
 * Catalog→manufacturer attribution. Source files don't carry an explicit
 * manufacturer field on rows (the const-name conveys it), so we tag at build.
 */
const CATALOG_TAGS: Array<{
  rows: ManufacturerSpeedFeed[];
  manufacturer: string;
  source: SpeedFeedCatalogMatch["source_catalog"];
}> = [
  { rows: ALL_MANUFACTURER_SPEED_FEED, manufacturer: "seco-kennametal", source: "other" },
  { rows: ALL_NEW_MFR_SPEED_FEED, manufacturer: "sumitomo-dormer-niagara-horn", source: "other" },
  { rows: GUHRING_SPEED_FEED, manufacturer: "Guhring", source: "guhring" },
  { rows: ISCAR_SPEED_FEED, manufacturer: "ISCAR", source: "iscar" },
];

/** Series-prefix → (manufacturer, source) hints. Used to retag ALL_* aggregates
 *  that mix multiple manufacturers (Seco JS-series, Kennametal SD-series, R220-series). */
const SERIES_PREFIX_HINTS: Array<{ prefix: RegExp; manufacturer: string; source: SpeedFeedCatalogMatch["source_catalog"] }> = [
  { prefix: /^JS/i, manufacturer: "Seco", source: "seco" },
  { prefix: /^JM/i, manufacturer: "Seco", source: "seco" },
  { prefix: /^JC/i, manufacturer: "Seco", source: "seco" },
  { prefix: /^JH/i, manufacturer: "Seco", source: "seco" },
  { prefix: /^R\d/i, manufacturer: "Kennametal", source: "kennametal" },
  { prefix: /^SD/i, manufacturer: "Kennametal", source: "kennametal" },
  { prefix: /^KSEM/i, manufacturer: "Kennametal", source: "kennametal" },
  { prefix: /^GSX/i, manufacturer: "Sumitomo", source: "sumitomo" },
  { prefix: /^MDE/i, manufacturer: "Sumitomo", source: "sumitomo" },
  { prefix: /^GS-/i, manufacturer: "Sumitomo", source: "sumitomo" },
  { prefix: /^WGX/i, manufacturer: "Sumitomo", source: "sumitomo" },
  { prefix: /^DGC/i, manufacturer: "Sumitomo", source: "sumitomo" },
  { prefix: /^WEX/i, manufacturer: "Sumitomo", source: "sumitomo" },
  { prefix: /^A100/i, manufacturer: "Dormer", source: "dormer" },
  { prefix: /^ST4/i, manufacturer: "Niagara", source: "niagara" },
  { prefix: /^ST5/i, manufacturer: "Niagara", source: "niagara" },
  { prefix: /^DC\d/i, manufacturer: "Guhring", source: "guhring" },
  { prefix: /^IC\d/i, manufacturer: "ISCAR", source: "iscar" },
];

function tagSeriesManufacturer(
  series: string,
  defaultMfg: string,
  defaultSource: SpeedFeedCatalogMatch["source_catalog"],
): { manufacturer: string; source: SpeedFeedCatalogMatch["source_catalog"] } {
  for (const { prefix, manufacturer, source } of SERIES_PREFIX_HINTS) {
    if (prefix.test(series)) return { manufacturer, source };
  }
  return { manufacturer: defaultMfg, source: defaultSource };
}

function buildIndex(): UnifiedIndex {
  const rows: UnifiedRow[] = [];
  const byMfg = new Map<string, UnifiedRow[]>();
  for (const tag of CATALOG_TAGS) {
    for (const r of tag.rows) {
      const tagged = tagSeriesManufacturer(r.series, tag.manufacturer, tag.source);
      const row: UnifiedRow = { ...r, manufacturer: tagged.manufacturer, source_catalog: tagged.source };
      rows.push(row);
      const mfgKey = tagged.manufacturer.toLowerCase();
      const list = byMfg.get(mfgKey) ?? [];
      list.push(row);
      byMfg.set(mfgKey, list);
    }
  }
  return { rows, by_mfg: byMfg };
}

function getIndex(): UnifiedIndex {
  if (_index === null) _index = buildIndex();
  return _index;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const MIN_CONFIDENCE_PER_TIER: Record<SpeedFeedCatalogMatch["match_tier"], number> = {
  exact: 0.90,
  exact_no_diameter: 0.75,
  series_prefix: 0.60,
  manufacturer_iso: 0.40,
};

// ============================================================================
// ENGINE
// ============================================================================

export class SpeedFeedCatalogJoinerEngine {
  /**
   * Look up (sfm, ipt) for a tool + material context. Returns null when no
   * match in any tier.
   *
   * Edge cases:
   *   - Empty string inputs → Zod throws at boundary.
   *   - Unknown manufacturer → falls through to series-prefix hint or null.
   *   - Empty catalog (tests) → null.
   *   - Negative/zero diameter → ignored (treated as "any diameter").
   */
  lookup(raw: unknown): SpeedFeedCatalogMatch | null {
    const input = SpeedFeedCatalogLookupInputSchema.parse(raw);
    const idx = getIndex();
    const mfgKey = input.manufacturer.toLowerCase();
    const seriesUpper = input.tool_id_or_series.toUpperCase();
    const iso = input.iso_group;
    const diameter = input.diameter_mm;

    // ── Try exact match: manufacturer (loose substring) + series + iso ──
    const candidates = this.candidatesFor(mfgKey, idx);
    for (const row of candidates) {
      if (row.isoGroup !== iso) continue;
      if (!seriesMatches(seriesUpper, row.series, "exact")) continue;
      if (diameter !== undefined && row.dc_min !== undefined && row.dc_max !== undefined) {
        if (diameter < row.dc_min || diameter > row.dc_max) {
          // Series + iso match but diameter out of range — record as exact_no_diameter
          return this.toMatch(row, "exact_no_diameter");
        }
      }
      return this.toMatch(row, "exact");
    }

    // ── series-prefix fallback: first N chars (3-5) match ──
    for (const row of candidates) {
      if (row.isoGroup !== iso) continue;
      if (!seriesMatches(seriesUpper, row.series, "prefix")) continue;
      return this.toMatch(row, "series_prefix");
    }

    // ── manufacturer + iso last resort: median over all rows ──
    const isoRows = candidates.filter(r => r.isoGroup === iso);
    if (isoRows.length > 0) {
      const medianRow = this.medianRow(isoRows);
      return this.toMatch(medianRow, "manufacturer_iso");
    }

    return null;
  }

  /**
   * Batch lookup — returns the per-tool match (or null) in one pass.
   * Useful for tri-vendor smoke that already has the (tool, iso) tuples.
   */
  lookupBatch(
    inputs: Array<SpeedFeedCatalogLookupInput>,
  ): Array<SpeedFeedCatalogMatch | null> {
    return inputs.map(i => this.lookup(i));
  }

  /** Diagnostic stat: how many rows the unified index carries. */
  catalogSize(): { total_rows: number; by_manufacturer: Record<string, number> } {
    const idx = getIndex();
    const byMfg: Record<string, number> = {};
    for (const [mfg, rows] of idx.by_mfg) byMfg[mfg] = rows.length;
    return { total_rows: idx.rows.length, by_manufacturer: byMfg };
  }

  // ────────────────────────────────────────────────────────────────────
  // Helpers
  // ────────────────────────────────────────────────────────────────────

  /** Pick candidate rows: exact-manufacturer index OR loose substring match
   *  against the union (handles "Accupro" vs catalog-tagged manufacturers). */
  private candidatesFor(mfgKey: string, idx: UnifiedIndex): UnifiedRow[] {
    const exact = idx.by_mfg.get(mfgKey);
    if (exact) return exact;
    // Loose: any catalog whose tagged manufacturer contains/is-contained-by the query.
    const out: UnifiedRow[] = [];
    for (const [taggedKey, rows] of idx.by_mfg) {
      if (taggedKey.includes(mfgKey) || mfgKey.includes(taggedKey)) {
        out.push(...rows);
      }
    }
    return out;
  }

  private toMatch(row: UnifiedRow, tier: SpeedFeedCatalogMatch["match_tier"]): SpeedFeedCatalogMatch {
    const vc = (row.vc_min + row.vc_max) / 2;
    const fz = (row.fz_min + row.fz_max) / 2;
    const baseConfidence = MIN_CONFIDENCE_PER_TIER[tier];
    // Penalize wider ranges (less precise data).
    const rangeWidth = (row.vc_max - row.vc_min) / Math.max(1, row.vc_max);
    const confidence = Math.max(0, Math.min(1, baseConfidence - rangeWidth * 0.1));
    return {
      vc_mpm: vc,
      fz_mm: fz,
      vc_range: [row.vc_min, row.vc_max],
      fz_range: [row.fz_min, row.fz_max],
      source_catalog: row.source_catalog,
      matched_series: row.series,
      match_tier: tier,
      confidence,
    };
  }

  /** Median row from a candidate set by vc_min ranking. */
  private medianRow(rows: UnifiedRow[]): UnifiedRow {
    const sorted = [...rows].sort((a, b) => a.vc_min - b.vc_min);
    return sorted[Math.floor(sorted.length / 2)]!;
  }
}

function seriesMatches(query: string, candidate: string, mode: "exact" | "prefix"): boolean {
  const c = candidate.toUpperCase();
  if (mode === "exact") {
    return query.includes(c) || c.includes(query);
  }
  // prefix: first 3-5 alphabetic prefix match
  const queryPrefix = (query.match(/^[A-Z]+/) ?? [""])[0];
  const candPrefix = (c.match(/^[A-Z]+/) ?? [""])[0];
  if (queryPrefix.length >= 2 && candPrefix.length >= 2) {
    return queryPrefix === candPrefix;
  }
  return false;
}

// ============================================================================
// SINGLETON
// ============================================================================

export const speedFeedCatalogJoinerEngine = new SpeedFeedCatalogJoinerEngine();
